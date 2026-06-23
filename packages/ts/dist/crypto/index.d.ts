import { a as MlDsa65Backend, N as NativeEvmTxFields } from '../ml-dsa-Drcmrw5h.js';
export { A as ADDRESS_DERIVATION_DOMAIN, E as ENUM_VARIANT_INDEX_ML_DSA_65, b as ML_DSA_65_PUBLIC_KEY_LEN, c as ML_DSA_65_SEED_LEN, d as ML_DSA_65_SIGNATURE_LEN, e as ML_DSA_65_SIGNING_KEY_LEN, M as MempoolClass, f as NativeTxExtension, g as NativeTxExtensionDescriptor, h as NativeTxExtensionLike, S as STANDARD_ALGO_NUMBER_ML_DSA_65, i as bincodeSignedTransaction, j as encodeMlDsa65Opaque, k as encodeTransactionForHash, m as mlDsa65AddressBytes, l as mlDsa65AddressFromPublicKey } from '../ml-dsa-Drcmrw5h.js';

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

interface JsonRpcCallClient {
    call<T>(method: string, params?: unknown): Promise<T>;
}
/**
 * A built plaintext submission — the bincode-encoded chain-side
 * `SignedTransaction` (`0x`-prefixed hex) ready to hand to
 * `mesh_submitTx`, plus the canonical hashes the wallet validates the
 * node echo against.
 *
 * Mirrors the chain-side artefacts produced by the Rust SDK's
 * `build_chain_signed_tx` (`mono-core/crates/core/sdk/src/tx.rs`): the
 * ML-DSA-65 signature is taken over the canonical chain-side `sighash`
 * (keccak-256 of the 0x01-tagged preimage) and the canonical native tx
 * hash is the keccak-256 of the 0x02-tagged preimage with the signature
 * and public key appended.
 */
interface PlaintextSubmission {
    /** Bincode `SignedTransaction` wire bytes, `0x`-prefixed. */
    signedTxWireHex: string;
    /** Canonical native tx hash the node echoes on admission. */
    innerTxHashHex: string;
    /** Canonical chain-side sighash that was signed. */
    innerSighashHex: string;
    /** Length in bytes of the bincode `SignedTransaction`. */
    innerWireBytes: number;
}
/**
 * Build a PLAINTEXT submission — the sole submit path since the v2
 * re-genesis dropped the encrypted (LythiumSeal) mempool.
 *
 * It re-shapes the native tx into the chain-side `SignedTransaction`,
 * signs over the canonical `sighash` with the ML-DSA-65 backend,
 * bincode-serializes the result, and `0x`-hex-encodes it. The bytes are
 * forwarded verbatim through `mesh_submitTx` (the node routes them to
 * `MempoolTx::plaintext` via `submit_raw`).
 *
 * Mirrors `TxClient::submit_plaintext` in the Rust SDK.
 */
declare function buildPlaintextSubmission(args: {
    backend: MlDsa65Backend;
    tx: NativeEvmTxFields;
}): PlaintextSubmission;
/**
 * Submit a bincode-encoded chain-side `SignedTransaction` (`0x`-hex)
 * through the plaintext `mesh_submitTx` path and validate the node's
 * echoed canonical tx hash against the locally computed one.
 *
 * Mirrors the validation in `TxClient::submit_plaintext`: the node
 * echoes the 32-byte canonical native tx hash on admission, and any
 * mismatch (or non-32-byte response) is rejected loud so a wallet never
 * trusts a hash it did not derive itself.
 *
 * @returns the validated canonical native tx hash (`0x`-prefixed).
 */
declare function submitPlaintextTransaction(client: JsonRpcCallClient, signedTxWireHex: string, expectedTxHashHex: string): Promise<string>;
/**
 * Build, sign, and submit a native transaction through the plaintext
 * `mesh_submitTx` path.
 *
 * Mirrors `TxClient::build_sign_submit` in the Rust SDK. The encrypted
 * (LythiumSeal) submit path was removed at the v2 re-genesis, so this is
 * the single build-sign-submit entry point.
 *
 * @returns the node-echoed-and-validated canonical native tx hash
 *   (`0x`-prefixed).
 */
declare function submitTransaction(args: {
    client: JsonRpcCallClient;
    backend: MlDsa65Backend;
    tx: NativeEvmTxFields;
}): Promise<string>;

export { BincodeWriter, type JsonRpcCallClient, MlDsa65Backend, NativeEvmTxFields, PQM1_ALGO_TAG_FALCON512_RESERVED, PQM1_ALGO_TAG_MLDSA65, PQM1_ALGO_TAG_MLDSA87_RESERVED, PQM1_ALGO_TAG_SLHDSA128S_RESERVED, PQM1_ENTROPY_LEN, PQM1_PAYLOAD_LEN, PQM1_V1_MLDSA65_DOMAIN_TAG, PQM1_V1_MNEMONIC_WORDS, PQM1_VERSION_V1, type PlaintextSubmission, Pqm1Error, type Pqm1ErrorKind, type Pqm1Payload, type Pqm1Rng, assemblePqm1Payload, buildPlaintextSubmission, bytesToHex, concatBytes, derivePqm1MlDsa65SeedFromPayload, expectBytes, generatePqm1Mnemonic, hexToBytes, parsePqm1Payload, pqm1MnemonicToAddress, pqm1MnemonicToMlDsa65Backend, pqm1MnemonicToMlDsa65Seed, pqm1MnemonicToPayload, pqm1PayloadToMnemonic, submitPlaintextTransaction, submitTransaction };
