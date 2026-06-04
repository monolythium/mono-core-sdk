import { I as MlDsa65Backend, H as RpcClient, iL as NonceAad } from '../submission-BjJSJ3xO.js';
export { iM as ADDRESS_DERIVATION_DOMAIN, iN as DKG_AEAD_TAG_LEN, iO as DKG_NONCE_LEN, iP as DecryptHint, iQ as ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE, iR as ENUM_VARIANT_INDEX_ML_DSA_65, iS as EncryptedEnvelope, iT as EncryptedSubmission, E as EncryptionKey, iU as ML_DSA_65_PUBLIC_KEY_LEN, iV as ML_DSA_65_SEED_LEN, iW as ML_DSA_65_SIGNATURE_LEN, iX as ML_DSA_65_SIGNING_KEY_LEN, iY as ML_KEM_768_CIPHERTEXT_LEN, iZ as ML_KEM_768_ENCAPSULATION_KEY_LEN, i_ as ML_KEM_768_SHARED_SECRET_LEN, F as MempoolClass, D as NativeEvmTxFields, i$ as NativeTxExtension, j0 as NativeTxExtensionDescriptor, j1 as NativeTxExtensionLike, j2 as PlaintextSubmission, j3 as STANDARD_ALGO_NUMBER_ML_DSA_65, j4 as bincodeDecryptHint, j5 as bincodeEncryptedEnvelope, j6 as bincodeNonceAad, j7 as bincodeSignedTransaction, j8 as buildEncryptedEnvelope, j9 as buildEncryptedSubmission, ja as buildPlaintextSubmission, jb as encodeMlDsa65Opaque, jc as encodeTransactionForHash, jd as encryptInnerTx, je as fetchEncryptionKey, jf as mlDsa65AddressBytes, jg as mlDsa65AddressFromPublicKey, jh as outerSigDigest, ji as submitEncryptedEnvelope, jj as submitPlaintextTransaction, jk as submitTransactionWithPrivacy } from '../submission-BjJSJ3xO.js';

declare class BincodeWriter {
    #private;
    u8(value: number): void;
    u16(value: number): void;
    u32(value: number): void;
    u64(value: bigint | number): void;
    u128(value: bigint | number): void;
    enumVariant(value: number): void;
    rawBytes(bytes: Uint8Array): void;
    bytes(bytes: Uint8Array): void;
    optionBytes(bytes: Uint8Array | null): void;
    toBytes(): Uint8Array;
}

declare function concatBytes(...chunks: Uint8Array[]): Uint8Array;
declare function bytesToHex(bytes: Uint8Array): string;
declare function hexToBytes(hex: string, label?: string): Uint8Array;
declare function expectBytes(value: Uint8Array | readonly number[], len: number, label: string): Uint8Array;

declare const PQM1_ALGO_TAG_MLDSA65 = 1;
declare const PQM1_ALGO_TAG_MLDSA87_RESERVED = 2;
declare const PQM1_ALGO_TAG_SLHDSA128S_RESERVED = 3;
declare const PQM1_ALGO_TAG_FALCON512_RESERVED = 4;
declare const PQM1_VERSION_V1 = 1;
declare const PQM1_PAYLOAD_LEN = 32;
declare const PQM1_ENTROPY_LEN = 30;
declare const PQM1_V1_MNEMONIC_WORDS = 24;
declare const PQM1_V1_MLDSA65_DOMAIN_TAG = "monolythium.pqm1.v1.mldsa65";
type Pqm1ErrorKind = "badWordCount" | "bip39Decode" | "badPayloadLength" | "unsupportedAlgorithm" | "unsupportedVersion" | "missingRandom";
declare class Pqm1Error extends Error {
    readonly kind: Pqm1ErrorKind;
    constructor(kind: Pqm1ErrorKind, message: string);
}
interface Pqm1Payload {
    algoTag: typeof PQM1_ALGO_TAG_MLDSA65;
    version: typeof PQM1_VERSION_V1;
    entropy: Uint8Array;
    bytes: Uint8Array;
}
type Pqm1Rng = (bytes: Uint8Array) => void;
declare function assemblePqm1Payload(entropy: Uint8Array | readonly number[]): Uint8Array;
declare function parsePqm1Payload(payload: Uint8Array | readonly number[]): Pqm1Payload;
declare function pqm1PayloadToMnemonic(payload: Uint8Array | readonly number[]): string;
declare function pqm1MnemonicToPayload(mnemonic: string): Pqm1Payload;
declare function derivePqm1MlDsa65SeedFromPayload(payload: Uint8Array | readonly number[]): Uint8Array;
declare function pqm1MnemonicToMlDsa65Seed(mnemonic: string): Uint8Array;
declare function pqm1MnemonicToMlDsa65Backend(mnemonic: string): MlDsa65Backend;
declare function pqm1MnemonicToAddress(mnemonic: string): string;
declare function generatePqm1Mnemonic(rng?: Pqm1Rng): string;

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
/** ML-KEM-768 encapsulation-key byte length. */
declare const SEAL_EK_LEN = 1184;
/** ML-KEM-768 decapsulation-key byte length. */
declare const SEAL_DK_LEN = 2400;
/** ML-KEM-768 ciphertext byte length. */
declare const SEAL_KEM_CT_LEN = 1088;
/** ML-KEM-768 keygen seed length (`d || z`, FIPS-203). */
declare const SEAL_KEM_SEED_LEN = 64;
/** AEAD key length (ChaCha20-Poly1305 / body key). */
declare const SEAL_KEY_LEN = 32;
/** AEAD nonce length (96-bit). */
declare const SEAL_NONCE_LEN = 12;
/** Poly1305 tag length. */
declare const SEAL_TAG_LEN = 16;
/** Explicit SHAKE256 key-commitment length. */
declare const SEAL_COMMIT_LEN = 32;
/** Shamir share wire length (`index || value`). */
declare const SEAL_SHARE_LEN: number;
/** Scheme selector for the cluster-ML-KEM + Shamir threshold body. */
declare const CLUSTER_MLKEM_SHAMIR = 3;
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
interface SealRandomSource {
    fillBytes(dest: Uint8Array): void;
}
/** CSPRNG-backed source (WebCrypto). The default for production seals. */
declare function cryptoRandomSource(): SealRandomSource;
interface CommittingBody {
    nonce: Uint8Array;
    ct: Uint8Array;
    commitment: Uint8Array;
}
/**
 * `keccak256(domain || cluster_id_le || t || n || concat(idx || ek)...)`.
 * Commits to the exact recipient ek set + order. Operators and wallets
 * MUST compute it identically; this is the single canonical site.
 *
 * keccak256 is taken from the ml-dsa module's hash import to avoid a second
 * keccak dependency; passed in by the caller to keep this module
 * cipher-only.
 */
declare function sealRosterHash(keccak256: (input: Uint8Array) => Uint8Array, clusterId: number, t: number, n: number, roster: ReadonlyArray<{
    operatorIndex: number;
    ek: Uint8Array;
}>): Uint8Array;
/** One recipient slot in the scheme-3 envelope. */
interface SealRecipient {
    operatorIndex: number;
    kemCt: Uint8Array;
    wrapped: CommittingBody;
}
/**
 * Scheme-3 LythiumSeal envelope - the encrypted-tx body for the
 * cluster-ML-KEM + Shamir threshold path. Bincode-encodes into the bytes
 * that ride inside `EncryptedEnvelope.ciphertext`.
 */
interface LythiumSealEnvelope {
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
declare function encodeSealEnvelope(env: LythiumSealEnvelope): Uint8Array;
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
declare function sealToCluster(args: {
    plaintext: Uint8Array;
    recipientEks: ReadonlyArray<Uint8Array>;
    t: number;
    clusterId: number;
    epoch: bigint;
    rosterHash: Uint8Array;
    rng?: SealRandomSource;
}): LythiumSealEnvelope;

/**
 * Client-side scheme-3 LythiumSeal seal path for the wallet/SDK.
 *
 * `getClusterSealKeys` reads the cluster seal roster (per-operator ML-KEM-768
 * encapsulation keys + `(t, n)` + roster hash + epoch). `sealTransaction`
 * turns a signed inner transaction into the scheme-3 `LythiumSealEnvelope`,
 * wraps it in an `EncryptedEnvelope` with the outer ML-DSA-65 signature, and
 * yields the wire bytes mono-core's `lyth_submitEncrypted` accepts.
 *
 * Byte-compatibility with the chain is proven by the cross-language KAT in
 * `tests/lythiumseal-kat.test.ts`.
 */

/** Algorithm tag the node serves for the scheme-3 seal path. */
declare const CLUSTER_MLKEM_SHAMIR_ALGO = "cluster-mlkem768-shamir";
/**
 * The cluster seal roster the SDK seals a transaction body to.
 *
 * Built from the `lyth_getClusterSealKeys(clusterId)` RPC response (or read
 * from genesis when that RPC is disabled on the public profile): the ordered
 * per-operator ML-KEM-768 encapsulation keys + the `(t, n)` threshold + the
 * roster hash + the epoch.
 */
interface ClusterSealKeys {
    algo: string;
    clusterId: number;
    epoch: bigint;
    /** 32-byte roster hash the seal context binds. */
    rosterHash: Uint8Array;
    /** Reconstruction threshold `t`. */
    t: number;
    /** Total operators `n`. */
    n: number;
    /** Per-operator 1184-byte ML-KEM-768 encapsulation keys, ordered `1..=n`. */
    recipientEks: Uint8Array[];
}
/** One operator's entry in a roster source (RPC JSON or genesis). */
interface ClusterSealKeyEntryInput {
    operatorIndex: number;
    /** `0x`-hex of the operator's 1184-byte ML-KEM-768 encapsulation key. */
    mlKemEk: string;
}
/** A cluster seal roster as served by the RPC or read from genesis. */
interface ClusterSealKeysSource {
    algo?: string;
    clusterId: number;
    epoch: number | string | bigint;
    /** `0x`-hex of the 32-byte roster hash (optional; recomputed + verified). */
    rosterHash?: string;
    t: number;
    n: number;
    roster: ClusterSealKeyEntryInput[];
}
/**
 * Normalize a roster source into the typed {@link ClusterSealKeys} the SDK
 * seals against. The roster hash is RECOMPUTED from the ordered ek set via
 * the canonical `seal_roster_hash` and, when the source carries one, the
 * recomputed value must match - so a wallet can never seal under a roster
 * hash that does not commit to the exact recipient set it is sealing to.
 *
 * @throws if the roster is empty, an ek has the wrong length, the operator
 *   indices are not the contiguous `1..=n` order, the threshold is out of
 *   `2 <= t <= n`, or a supplied roster hash does not match the recomputed one.
 */
declare function parseClusterSealKeys(source: ClusterSealKeysSource): ClusterSealKeys;
/**
 * Fetch the cluster seal roster from a running node via
 * `lyth_getClusterSealKeys(clusterId)`.
 *
 * NOTE: this RPC is DISABLED on the public node profile. When it returns
 * "method not found" / "unavailable", read the roster from genesis instead
 * and pass it through {@link parseClusterSealKeys} - the roster lives in the
 * genesis `[[clusters.members]]` `seal_ek` fields, which is exactly what the
 * RPC would otherwise serve.
 *
 * @throws if the RPC is unavailable (carry the roster as input instead) or
 *   the served roster does not validate.
 */
declare function getClusterSealKeys(client: RpcClient, clusterId?: number): Promise<ClusterSealKeys>;
/** A built scheme-3 encrypted submission, ready for `lyth_submitEncrypted`. */
interface SealedSubmission {
    /** Bincode `EncryptedEnvelope` wire bytes, `0x`-prefixed hex. */
    envelopeWireHex: string;
    /** Bincode `EncryptedEnvelope` wire bytes. */
    envelopeWireBytes: Uint8Array;
    /** Length of the inner scheme-3 ciphertext body in bytes. */
    ciphertextBytes: number;
}
/**
 * Seal a signed inner transaction to the cluster and wrap it in an
 * `EncryptedEnvelope` with the outer ML-DSA-65 signature.
 *
 * `signedTxBincode` is the bincode `SignedTransaction` wire bytes (the body
 * `mesh_submitTx` would otherwise carry in the clear). `aad` is the
 * authenticated envelope header; per Law §3.6 / R3-H08 its fee fields MUST
 * mirror the inner tx's fee fields exactly, so the chain's `verify_inner_match`
 * passes on reveal - the caller is responsible for building it from the same
 * fields it signed.
 *
 * The outer signature is taken over the canonical preimage
 * `keccak256(bincode(aad) || ciphertext || bincode(hint) || sender_pubkey)`,
 * identical to mono-core's `EncryptedEnvelope::signed_digest`.
 *
 * @param rng deterministic source for the KAT; defaults to a CSPRNG.
 */
declare function sealTransaction(args: {
    signedTxBincode: Uint8Array;
    clusterSealKeys: ClusterSealKeys;
    aad: NonceAad;
    senderAddress: Uint8Array;
    senderPubkey: Uint8Array;
    signOuterDigest: (digest: Uint8Array) => Promise<Uint8Array> | Uint8Array;
    rng?: SealRandomSource;
}): Promise<SealedSubmission>;
/**
 * Submit a built scheme-3 encrypted envelope through `lyth_submitEncrypted`.
 *
 * @returns the mempool tx hash the node assigns on admission.
 */
declare function submitSealedTransaction(client: RpcClient, submission: SealedSubmission): Promise<string>;

export { BincodeWriter, CLUSTER_MLKEM_SHAMIR, CLUSTER_MLKEM_SHAMIR_ALGO, type ClusterSealKeyEntryInput, type ClusterSealKeys, type ClusterSealKeysSource, type LythiumSealEnvelope, MlDsa65Backend, NonceAad, PQM1_ALGO_TAG_FALCON512_RESERVED, PQM1_ALGO_TAG_MLDSA65, PQM1_ALGO_TAG_MLDSA87_RESERVED, PQM1_ALGO_TAG_SLHDSA128S_RESERVED, PQM1_ENTROPY_LEN, PQM1_PAYLOAD_LEN, PQM1_V1_MLDSA65_DOMAIN_TAG, PQM1_V1_MNEMONIC_WORDS, PQM1_VERSION_V1, Pqm1Error, type Pqm1ErrorKind, type Pqm1Payload, type Pqm1Rng, SEAL_COMMIT_LEN, SEAL_DK_LEN, SEAL_EK_LEN, SEAL_KEM_CT_LEN, SEAL_KEM_SEED_LEN, SEAL_KEY_LEN, SEAL_NONCE_LEN, SEAL_SHARE_LEN, SEAL_TAG_LEN, type SealRandomSource, type SealRecipient, type SealedSubmission, assemblePqm1Payload, bytesToHex, concatBytes, cryptoRandomSource, derivePqm1MlDsa65SeedFromPayload, encodeSealEnvelope, expectBytes, generatePqm1Mnemonic, getClusterSealKeys, hexToBytes, parseClusterSealKeys, parsePqm1Payload, pqm1MnemonicToAddress, pqm1MnemonicToMlDsa65Backend, pqm1MnemonicToMlDsa65Seed, pqm1MnemonicToPayload, pqm1PayloadToMnemonic, sealRosterHash, sealToCluster, sealTransaction, submitSealedTransaction };
