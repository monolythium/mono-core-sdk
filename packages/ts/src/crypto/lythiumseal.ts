/**
 * LythiumSeal scheme-3 client-side seal primitive.
 *
 * Post-quantum cluster-threshold encrypted-mempool sealing:
 * cluster-ML-KEM-768 (FIPS-203) + information-theoretic GF(256) Shamir
 * `t`-of-`n` + committing ChaCha20-Poly1305 (with an explicit SHAKE256
 * key-commitment). A signed transaction body is sealed to a committee of
 * `n` operators such that any `t` of them, each holding only its own
 * ML-KEM decapsulation key, must cooperate to recover the plaintext. No
 * single operator (and no minority of `< t`) can read the body.
 *
 * This is a byte-exact port of the standalone `lythiumseal` Rust crate
 * (github.com/monolythium/lythiumseal) plus the chain-side
 * `LythiumSealEnvelope` wire shape from `mono-core`'s mempool
 * (`seal_to_cluster`). Byte-compatibility is proven by a cross-language
 * KAT (`tests/lythiumseal-kat.test.ts`) against vectors generated from the
 * Rust reference: the same fixed roster + deterministic draw order
 * reproduces the exact envelope bincode bytes the chain accepts, and a
 * Rust-sealed envelope round-trips through the TS decoder.
 *
 * The cryptography is standardized: ML-KEM-768 from `@noble/post-quantum`,
 * ChaCha20-Poly1305 from `@noble/ciphers`, and SHAKE256 from
 * `@noble/hashes`. The GF(256) Shamir layer is the AES field (reduction
 * polynomial 0x11b) implemented in-module to match the crate exactly.
 */

import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { shake256 } from "@noble/hashes/sha3.js";
import { concatBytes, expectBytes } from "./bytes.js";

// ---------------------------------------------------------------------------
// Sizes (FIPS-203 ML-KEM-768 + AEAD + Shamir).

/** ML-KEM-768 encapsulation-key byte length. */
export const SEAL_EK_LEN = 1184;
/** ML-KEM-768 decapsulation-key byte length. */
export const SEAL_DK_LEN = 2400;
/** ML-KEM-768 ciphertext byte length. */
export const SEAL_KEM_CT_LEN = 1088;
/** ML-KEM-768 keygen seed length (`d || z`, FIPS-203). */
export const SEAL_KEM_SEED_LEN = 64;
/** AEAD key length (ChaCha20-Poly1305 / body key). */
export const SEAL_KEY_LEN = 32;
/** AEAD nonce length (96-bit). */
export const SEAL_NONCE_LEN = 12;
/** Poly1305 tag length. */
export const SEAL_TAG_LEN = 16;
/** Explicit SHAKE256 key-commitment length. */
export const SEAL_COMMIT_LEN = 32;
/** Shamir secret length (the body key). */
export const SEAL_SECRET_LEN = 32;
/** Shamir share wire length (`index || value`). */
export const SEAL_SHARE_LEN = 1 + SEAL_SECRET_LEN;

/** Scheme selector for the cluster-ML-KEM + Shamir threshold body. */
export const CLUSTER_MLKEM_SHAMIR = 3;

// Domain separators (byte-identical to the Rust crate).
const COMMIT_DOMAIN = new TextEncoder().encode("lythiumseal/commit/v1");
const KEK_DOMAIN = new TextEncoder().encode("lythiumseal/kek/v1");
const NONCE_DOMAIN = new TextEncoder().encode("lythiumseal/nonce/v1");
const BODY_AAD_DOMAIN = new TextEncoder().encode("lythiumseal/body/v1");
const SHARE_AAD_DOMAIN = new TextEncoder().encode("lythiumseal/share/v1");
const ROSTER_DOMAIN = new TextEncoder().encode("lythiumseal/roster/v1");

// ---------------------------------------------------------------------------
// Deterministic randomness source for the seal.

/**
 * Random source for a seal: fills `dest` with random bytes. Production
 * callers pass a CSPRNG-backed source ({@link cryptoRandomSource}); the
 * KAT passes a deterministic source so the seal bytes are reproducible.
 *
 * Each call must consume the source the same way the Rust reference does:
 * the deterministic source models `rand_core`'s `fill_bytes`, which fills
 * in 8-byte chunks (one `u64` per chunk) and discards the unused tail of
 * the final chunk of each call.
 */
export interface SealRandomSource {
  fillBytes(dest: Uint8Array): void;
}

/** CSPRNG-backed source (WebCrypto). The default for production seals. */
export function cryptoRandomSource(): SealRandomSource {
  return {
    fillBytes(dest: Uint8Array): void {
      crypto.getRandomValues(dest);
    },
  };
}

export interface OperatorSealKeypair {
  /** ML-KEM-768 encapsulation key, published to node-registry. */
  encapsulationKey: Uint8Array;
  /** ML-KEM-768 decapsulation key, retained by the operator node only. */
  decapsulationKey: Uint8Array;
}

/** Generate one independent ML-KEM-768 keypair for LythiumSeal operator use. */
export function generateOperatorSealKeypair(): OperatorSealKeypair {
  const { publicKey, secretKey } = ml_kem768.keygen();
  return {
    encapsulationKey: expectBytes(publicKey, SEAL_EK_LEN, "encapsulationKey").slice(),
    decapsulationKey: expectBytes(secretKey, SEAL_DK_LEN, "decapsulationKey").slice(),
  };
}

// ---------------------------------------------------------------------------
// SHAKE-based derivations (byte-identical to lythiumseal/src/aead.rs).

function u32le(n: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = n & 0xff;
  out[1] = (n >>> 8) & 0xff;
  out[2] = (n >>> 16) & 0xff;
  out[3] = (n >>> 24) & 0xff;
  return out;
}

function u64le(n: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let v = n;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** Length-prefix (`u32_le` length) framing, matching `absorb_framed`. */
function framed(field: Uint8Array): Uint8Array {
  return concatBytes(u32le(field.length), field);
}

/** `SHAKE256(framed(COMMIT_DOMAIN) || key)[..32]`. */
function keyCommitment(key: Uint8Array): Uint8Array {
  return shake256(concatBytes(framed(COMMIT_DOMAIN), key), { dkLen: SEAL_COMMIT_LEN });
}

/**
 * `SHAKE256(framed(KEK_DOMAIN) || framed(shared_secret) || framed(domain)
 * || cluster_id_le || epoch_le || op_index)[..32]`.
 */
function deriveKek(
  sharedSecret: Uint8Array,
  domain: Uint8Array,
  clusterId: number,
  epoch: bigint,
  opIndex: number,
): Uint8Array {
  const input = concatBytes(
    framed(KEK_DOMAIN),
    framed(sharedSecret),
    framed(domain),
    u32le(clusterId),
    u64le(epoch),
    Uint8Array.of(opIndex),
  );
  return shake256(input, { dkLen: SEAL_KEY_LEN });
}

/** `SHAKE256(framed(NONCE_DOMAIN) || framed(domain) || framed(context))[..12]`. */
function deriveNonce(domain: Uint8Array, context: Uint8Array): Uint8Array {
  const input = concatBytes(framed(NONCE_DOMAIN), framed(domain), framed(context));
  return shake256(input, { dkLen: SEAL_NONCE_LEN });
}

// ---------------------------------------------------------------------------
// Binding context AAD (byte-identical to lythiumseal/src/seal.rs).

interface BindingContext {
  clusterId: number;
  epoch: bigint;
  rosterHash: Uint8Array;
}

function bodyAad(ctx: BindingContext, k: number, n: number): Uint8Array {
  return concatBytes(
    BODY_AAD_DOMAIN,
    u32le(ctx.clusterId),
    u64le(ctx.epoch),
    Uint8Array.of(k),
    Uint8Array.of(n),
    ctx.rosterHash,
  );
}

function shareAad(ctx: BindingContext, opIndex: number): Uint8Array {
  return concatBytes(
    SHARE_AAD_DOMAIN,
    u32le(ctx.clusterId),
    u64le(ctx.epoch),
    Uint8Array.of(opIndex),
    ctx.rosterHash,
  );
}

// ---------------------------------------------------------------------------
// Committing AEAD body.

interface CommittingBody {
  nonce: Uint8Array;
  ct: Uint8Array;
  commitment: Uint8Array;
}

function aeadSeal(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array,
): CommittingBody {
  const cipher = chacha20poly1305(key, nonce, aad);
  const ct = cipher.encrypt(plaintext);
  return { nonce, ct, commitment: keyCommitment(key) };
}

// ---------------------------------------------------------------------------
// GF(256) Shamir (AES field, reduction polynomial 0x11b).

function gfMul(a: number, b: number): number {
  let product = 0;
  let x = a & 0xff;
  let y = b & 0xff;
  for (let i = 0; i < 8; i++) {
    const mask = -(y & 1) & 0xff;
    product ^= x & mask;
    const high = -((x >> 7) & 1) & 0xff;
    x = (x << 1) & 0xff;
    x ^= 0x1b & high;
    y >>= 1;
  }
  return product & 0xff;
}

function polyEval(coeffs: Uint8Array, x: number): number {
  let acc = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    acc = gfMul(acc, x) ^ coeffs[i]!;
  }
  return acc & 0xff;
}

interface Share {
  index: number;
  value: Uint8Array;
}

/**
 * GF(256) Shamir `t`-of-`n` split of a 32-byte secret. One independent
 * degree `t-1` polynomial per secret byte; the `t-1` higher coefficients
 * per byte come from `rng` (drawn one `fill` call per secret byte, exactly
 * as the Rust crate does, so the deterministic-source draw order matches).
 */
function shamirSplit(secret: Uint8Array, t: number, n: number, rng: SealRandomSource): Share[] {
  const byteCoeffs: Uint8Array[] = [];
  for (let j = 0; j < SEAL_SECRET_LEN; j++) {
    const c = new Uint8Array(t);
    c[0] = secret[j]!;
    if (t > 1) {
      const tail = new Uint8Array(t - 1);
      rng.fillBytes(tail);
      c.set(tail, 1);
    }
    byteCoeffs.push(c);
  }
  const shares: Share[] = [];
  for (let k = 0; k < n; k++) {
    const x = (k + 1) & 0xff;
    const value = new Uint8Array(SEAL_SECRET_LEN);
    for (let j = 0; j < SEAL_SECRET_LEN; j++) {
      value[j] = polyEval(byteCoeffs[j]!, x);
    }
    shares.push({ index: x, value });
  }
  return shares;
}

function shareToBytes(s: Share): Uint8Array {
  const out = new Uint8Array(SEAL_SHARE_LEN);
  out[0] = s.index;
  out.set(s.value, 1);
  return out;
}

// ---------------------------------------------------------------------------
// Canonical roster hash (== runtime::providers::seal_roster_hash).

/**
 * `keccak256(domain || cluster_id_le || t || n || concat(idx || ek)...)`.
 * Commits to the exact recipient ek set + order. Operators and wallets
 * MUST compute it identically; this is the single canonical site.
 *
 * keccak256 is taken from the ml-dsa module's hash import to avoid a second
 * keccak dependency; passed in by the caller to keep this module
 * cipher-only.
 */
export function sealRosterHash(
  keccak256: (input: Uint8Array) => Uint8Array,
  clusterId: number,
  t: number,
  n: number,
  roster: ReadonlyArray<{ operatorIndex: number; ek: Uint8Array }>,
): Uint8Array {
  const chunks: Uint8Array[] = [ROSTER_DOMAIN, u32le(clusterId), Uint8Array.of(t), Uint8Array.of(n)];
  for (const { operatorIndex, ek } of roster) {
    chunks.push(Uint8Array.of(operatorIndex), ek);
  }
  return keccak256(concatBytes(...chunks));
}

// ---------------------------------------------------------------------------
// Scheme-3 LythiumSeal envelope (the inner ciphertext body).

/** One recipient slot in the scheme-3 envelope. */
export interface SealRecipient {
  operatorIndex: number;
  kemCt: Uint8Array;
  wrapped: CommittingBody;
}

/**
 * Scheme-3 LythiumSeal envelope - the encrypted-tx body for the
 * cluster-ML-KEM + Shamir threshold path. Bincode-encodes into the bytes
 * that ride inside `EncryptedEnvelope.ciphertext`.
 */
export interface LythiumSealEnvelope {
  clusterId: number;
  epoch: bigint;
  rosterHash: Uint8Array;
  t: number;
  n: number;
  aeadBody: CommittingBody;
  recipients: SealRecipient[];
}

/**
 * Bincode-encode (bincode 1.3 defaults: LE fixint, `u64` length prefixes,
 * raw fixed-size arrays) the envelope into the `EncryptedEnvelope.ciphertext`
 * body bytes. Byte-identical to `LythiumSealEnvelope::encode` in mono-core.
 */
export function encodeSealEnvelope(env: LythiumSealEnvelope): Uint8Array {
  const chunks: Uint8Array[] = [];
  chunks.push(u32le(env.clusterId));
  chunks.push(u64le(env.epoch));
  chunks.push(expectBytes(env.rosterHash, 32, "rosterHash")); // [u8; 32] raw
  chunks.push(Uint8Array.of(env.t));
  chunks.push(Uint8Array.of(env.n));
  pushAeadBody(chunks, env.aeadBody);
  chunks.push(u64le(BigInt(env.recipients.length))); // Vec length
  for (const r of env.recipients) {
    chunks.push(Uint8Array.of(r.operatorIndex));
    chunks.push(u64le(BigInt(r.kemCt.length)));
    chunks.push(r.kemCt);
    pushAeadBody(chunks, r.wrapped);
  }
  return concatBytes(...chunks);
}

function pushAeadBody(chunks: Uint8Array[], body: CommittingBody): void {
  chunks.push(expectBytes(body.nonce, SEAL_NONCE_LEN, "aead nonce")); // [u8; 12] raw
  chunks.push(u64le(BigInt(body.ct.length))); // Vec<u8> length
  chunks.push(body.ct);
  chunks.push(expectBytes(body.commitment, SEAL_COMMIT_LEN, "aead commitment")); // [u8; 32] raw
}

// ---------------------------------------------------------------------------
// The seal.

/**
 * Seal `plaintext` to the cluster's ordered `recipientEks` (`n` operators)
 * at reconstruction threshold `t`, bound to `(clusterId, epoch,
 * rosterHash)`. Draws a fresh body key for every call (nonce safety rests
 * on body-key freshness, not nonce uniqueness - see the crate invariants),
 * GF(256) Shamir `t`-of-`n` splits it, and ML-KEM-encapsulates one share
 * to each operator's encapsulation key under a KDF-bound member KEK.
 *
 * The result is the `LythiumSealEnvelope` (scheme 3) that nests inside the
 * outer `EncryptedEnvelope.ciphertext`. Recovering the plaintext requires
 * `t` operators to each decapsulate their own slot; no single operator can.
 *
 * @param rng deterministic source for the KAT; defaults to a CSPRNG.
 */
export function sealToCluster(args: {
  plaintext: Uint8Array;
  recipientEks: ReadonlyArray<Uint8Array>;
  t: number;
  clusterId: number;
  epoch: bigint;
  rosterHash: Uint8Array;
  rng?: SealRandomSource;
}): LythiumSealEnvelope {
  const { plaintext, recipientEks, t, clusterId } = args;
  const epoch = args.epoch;
  const rosterHash = expectBytes(args.rosterHash, 32, "rosterHash");
  const rng = args.rng ?? cryptoRandomSource();
  const n = recipientEks.length;
  if (!Number.isInteger(t) || t < 1 || t > n || n < 1 || n > 0xff) {
    throw new Error(`invalid threshold/recipient count: t=${t} n=${n}`);
  }
  for (let i = 0; i < n; i++) {
    expectBytes(recipientEks[i]!, SEAL_EK_LEN, `recipientEks[${i}]`);
  }
  const ctx: BindingContext = { clusterId, epoch, rosterHash };

  // 1) Fresh random body key K.
  const bodyKey = new Uint8Array(SEAL_KEY_LEN);
  rng.fillBytes(bodyKey);

  // 2) Committing-AEAD seal the plaintext under K.
  const aad = bodyAad(ctx, t, n);
  const bodyNonce = deriveNonce(new TextEncoder().encode("body"), aad);
  const aeadBody = aeadSeal(bodyKey, bodyNonce, plaintext, aad);

  // 3) Shamir t-of-n split K.
  const shares = shamirSplit(bodyKey, t, n, rng);

  // 4) Per operator: ML-KEM encapsulate -> derive KEK -> wrap its share.
  const recipients: SealRecipient[] = [];
  for (let i = 0; i < n; i++) {
    const opIndex = (i + 1) & 0xff;
    // ML-KEM-768 encapsulation. The Rust reference draws a fresh 32-byte
    // message `m` from the RNG and computes `encaps_internal(ek, m)`;
    // noble's deterministic `encapsulate(ek, m)` is byte-identical for the
    // same `m`. Drawing `m` here keeps the deterministic draw order aligned.
    const m = new Uint8Array(32);
    rng.fillBytes(m);
    const { cipherText: kemCt, sharedSecret } = ml_kem768.encapsulate(recipientEks[i]!, m);

    const kek = deriveKek(sharedSecret, rosterHash, clusterId, epoch, opIndex);
    const sAad = shareAad(ctx, opIndex);
    const wrapNonce = deriveNonce(new TextEncoder().encode("share"), sAad);
    const wrapped = aeadSeal(kek, wrapNonce, shareToBytes(shares[i]!), sAad);

    recipients.push({ operatorIndex: opIndex, kemCt, wrapped });
    sharedSecret.fill(0);
    kek.fill(0);
  }
  bodyKey.fill(0);

  return {
    clusterId,
    epoch,
    rosterHash,
    t,
    n,
    aeadBody,
    recipients,
  };
}
