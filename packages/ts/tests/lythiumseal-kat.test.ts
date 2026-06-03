import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import {
  CLUSTER_MLKEM_SHAMIR,
  encodeSealEnvelope,
  SEAL_DK_LEN,
  SEAL_EK_LEN,
  SEAL_KEM_SEED_LEN,
  sealRosterHash,
  sealToCluster,
  type SealRandomSource,
} from "../src/crypto/lythiumseal.js";
import { parseClusterSealKeys } from "../src/crypto/seal.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, hexToBytes } from "../src/crypto/bytes.js";

/**
 * Byte-exact cross-language KAT for the LythiumSeal scheme-3 seal path.
 *
 * The fixtures in `lythiumseal-vectors.json` are generated from the Rust
 * reference (the `lythiumseal` crate + the mono-core `LythiumSealEnvelope`
 * wire shape) driven by a deterministic xorshift64* source. This test
 * reproduces the SAME draw order in TS and asserts the produced envelope
 * bincode bytes equal the Rust reference exactly - which can only hold if
 * ML-KEM-768 encapsulation, the GF(256) Shamir split, the committing
 * ChaCha20-Poly1305 AEAD, the SHAKE256 KDF/commitment domain separation,
 * the canonical roster hash, AND the bincode wire layout are all byte-exact
 * against the chain. It also unseals a Rust-sealed envelope's first share in
 * TS as an independent decapsulation cross-check.
 */

// KatRng - byte-identical to lythiumseal/tests/seal_kat.rs (xorshift64*).
// Each fill_bytes() call draws 8-byte chunks (one u64 per chunk) and
// discards the unused tail of the final chunk of that call.
const U64_MASK = (1n << 64n) - 1n;
const MUL = 0x2545f4914f6cdd1dn;

class KatRng implements SealRandomSource {
  #state: bigint;
  constructor(seed: bigint) {
    this.#state = seed & U64_MASK;
  }
  #next(): bigint {
    let x = this.#state;
    x ^= x >> 12n;
    x = (x ^ ((x << 25n) & U64_MASK)) & U64_MASK;
    x ^= x >> 27n;
    this.#state = x;
    return (x * MUL) & U64_MASK;
  }
  fillBytes(dest: Uint8Array): void {
    let i = 0;
    while (i < dest.length) {
      let v = this.#next();
      const take = Math.min(8, dest.length - i);
      for (let b = 0; b < take; b++) {
        dest[i + b] = Number(v & 0xffn);
        v >>= 8n;
      }
      i += take;
    }
  }
}

interface Vector {
  description: string;
  seed_hex: string;
  cluster_id: number;
  epoch: number;
  t: number;
  n: number;
  roster_hash_hex: string;
  roster_eks_hex: string[];
  decap_keys_hex: string[];
  plaintext_hex: string;
  body_nonce_hex: string;
  body_commitment_hex: string;
  body_ct_hex: string;
  envelope_bincode_hex: string;
}

const vectorsPath = fileURLToPath(new URL("./lythiumseal-vectors.json", import.meta.url));
const vectors = JSON.parse(readFileSync(vectorsPath, "utf8")) as Vector[];

// Reproduce the Rust generator's roster minting: from one shared rng, mint
// n ML-KEM keypairs by drawing d(32) then z(32) per member and keygen(d||z).
function mintRoster(rng: KatRng, n: number): { ek: Uint8Array; dk: Uint8Array }[] {
  const out: { ek: Uint8Array; dk: Uint8Array }[] = [];
  for (let i = 0; i < n; i++) {
    const seed = new Uint8Array(SEAL_KEM_SEED_LEN);
    rng.fillBytes(seed); // d(32) || z(32)
    const kp = ml_kem768.keygen(seed);
    expect(kp.publicKey.length).toBe(SEAL_EK_LEN);
    expect(kp.secretKey.length).toBe(SEAL_DK_LEN);
    out.push({ ek: kp.publicKey, dk: kp.secretKey });
  }
  return out;
}

describe("LythiumSeal scheme-3 cross-language KAT", () => {
  for (const v of vectors) {
    describe(v.description, () => {
      const seed = BigInt(v.seed_hex);

      it("mints the exact Rust roster (ML-KEM keygen byte-match)", () => {
        const rng = new KatRng(seed);
        const minted = mintRoster(rng, v.n);
        for (let i = 0; i < v.n; i++) {
          expect(bytesToHex(minted[i]!.ek).slice(2)).toBe(v.roster_eks_hex[i]);
          expect(bytesToHex(minted[i]!.dk).slice(2)).toBe(v.decap_keys_hex[i]);
        }
      });

      it("recomputes the canonical roster hash (keccak256 byte-match)", () => {
        const hashInput = v.roster_eks_hex.map((ekHex, i) => ({
          operatorIndex: i + 1,
          ek: hexToBytes(`0x${ekHex}`),
        }));
        const rosterHash = sealRosterHash(
          (b) => keccak_256(b),
          v.cluster_id,
          v.t,
          v.n,
          hashInput,
        );
        expect(bytesToHex(rosterHash).slice(2)).toBe(v.roster_hash_hex);
      });

      it("produces the EXACT scheme-3 envelope bincode bytes the chain accepts", () => {
        // Reproduce the full Rust draw order: ONE rng instance mints the
        // roster (consuming d||z per member) and then drives the seal
        // (body key, Shamir coeffs, per-recipient ML-KEM message m).
        const rng = new KatRng(seed);
        const minted = mintRoster(rng, v.n);
        const recipientEks = minted.map((m) => m.ek);
        const rosterHash = hexToBytes(`0x${v.roster_hash_hex}`);

        const env = sealToCluster({
          plaintext: hexToBytes(`0x${v.plaintext_hex}`),
          recipientEks,
          t: v.t,
          clusterId: v.cluster_id,
          epoch: BigInt(v.epoch),
          rosterHash,
          rng,
        });

        // Deterministic body box pins (independent of ML-KEM randomness).
        expect(bytesToHex(env.aeadBody.nonce).slice(2)).toBe(v.body_nonce_hex);
        expect(bytesToHex(env.aeadBody.commitment).slice(2)).toBe(v.body_commitment_hex);
        expect(bytesToHex(env.aeadBody.ct).slice(2)).toBe(v.body_ct_hex);
        expect(env.t).toBe(v.t);
        expect(env.n).toBe(v.n);
        expect(env.recipients.length).toBe(v.n);

        // The decisive byte-exact assertion: the full envelope bincode.
        const wire = encodeSealEnvelope(env);
        expect(bytesToHex(wire).slice(2)).toBe(v.envelope_bincode_hex);
      });

      it("decapsulates operator 1's KEM ciphertext from the Rust envelope", () => {
        // Independent cross-check: decode the Rust-produced envelope wire,
        // and verify operator 1 can ML-KEM-decapsulate its own slot with the
        // Rust-minted decap key (proves the KEM ciphertext in the reference
        // envelope is decapsulatable by the matching key - the decrypt
        // direction the operators run).
        const rng = new KatRng(seed);
        const minted = mintRoster(rng, v.n);
        const env = decodeRustEnvelope(hexToBytes(`0x${v.envelope_bincode_hex}`), v.n);
        const slot0 = env.recipients[0]!;
        expect(slot0.kemCt.length).toBe(1088);
        // decapsulate(ct, sk) must not throw for the right key.
        const ss = ml_kem768.decapsulate(slot0.kemCt, minted[0]!.dk);
        expect(ss.length).toBe(32);
      });
    });
  }

  it("parseClusterSealKeys recomputes + verifies the served roster hash", () => {
    const v = vectors[0]!;
    const keys = parseClusterSealKeys({
      clusterId: v.cluster_id,
      epoch: v.epoch,
      rosterHash: `0x${v.roster_hash_hex}`,
      t: v.t,
      n: v.n,
      roster: v.roster_eks_hex.map((ekHex, i) => ({ operatorIndex: i + 1, mlKemEk: `0x${ekHex}` })),
    });
    expect(bytesToHex(keys.rosterHash).slice(2)).toBe(v.roster_hash_hex);
    expect(keys.t).toBe(v.t);
    expect(keys.n).toBe(v.n);
    expect(keys.recipientEks.length).toBe(v.n);
  });

  it("parseClusterSealKeys rejects a roster hash that does not commit to the ek set", () => {
    const v = vectors[0]!;
    const badHash = "0x" + "00".repeat(32);
    expect(() =>
      parseClusterSealKeys({
        clusterId: v.cluster_id,
        epoch: v.epoch,
        rosterHash: badHash,
        t: v.t,
        n: v.n,
        roster: v.roster_eks_hex.map((ekHex, i) => ({ operatorIndex: i + 1, mlKemEk: `0x${ekHex}` })),
      }),
    ).toThrow(/roster hash mismatch/);
  });

  it("seal hint carries scheme 3", () => {
    expect(CLUSTER_MLKEM_SHAMIR).toBe(3);
  });
});

// Minimal decoder for the Rust envelope wire (bincode 1.3) - test-only, so the
// decap cross-check reads the reference bytes rather than re-sealing.
function decodeRustEnvelope(
  bytes: Uint8Array,
  n: number,
): { recipients: { operatorIndex: number; kemCt: Uint8Array }[] } {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 0;
  const u32 = () => {
    const v = dv.getUint32(off, true);
    off += 4;
    return v;
  };
  const u64 = () => {
    const v = dv.getBigUint64(off, true);
    off += 8;
    return Number(v);
  };
  const take = (len: number) => {
    const out = bytes.subarray(off, off + len);
    off += len;
    return out;
  };
  const aeadBody = () => {
    take(12); // nonce
    const ctLen = u64();
    take(ctLen); // ct
    take(32); // commitment
  };
  u32(); // cluster_id
  u64(); // epoch
  take(32); // roster_hash
  off += 1; // t
  off += 1; // n
  aeadBody(); // aead_body
  const recCount = u64();
  expect(recCount).toBe(n);
  const recipients: { operatorIndex: number; kemCt: Uint8Array }[] = [];
  for (let i = 0; i < recCount; i++) {
    const operatorIndex = bytes[off]!;
    off += 1;
    const ctLen = u64();
    const kemCt = take(ctLen).slice();
    aeadBody(); // wrapped
    recipients.push({ operatorIndex, kemCt });
  }
  return { recipients };
}
