import { a as MlDsa65Backend, N as NativeEvmTxFields } from '../ml-dsa-Drcmrw5h.cjs';
export { A as ADDRESS_DERIVATION_DOMAIN, E as ENUM_VARIANT_INDEX_ML_DSA_65, b as ML_DSA_65_PUBLIC_KEY_LEN, c as ML_DSA_65_SEED_LEN, d as ML_DSA_65_SIGNATURE_LEN, e as ML_DSA_65_SIGNING_KEY_LEN, M as MempoolClass, f as NativeTxExtension, g as NativeTxExtensionDescriptor, h as NativeTxExtensionLike, S as STANDARD_ALGO_NUMBER_ML_DSA_65, i as bincodeSignedTransaction, j as encodeMlDsa65Opaque, k as encodeTransactionForHash, m as mlDsa65AddressBytes, l as mlDsa65AddressFromPublicKey } from '../ml-dsa-Drcmrw5h.cjs';

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

/**
 * Standard BIP-39 -> ML-DSA-65 wallet key derivation.
 *
 * A wallet mnemonic is a plain 24-word English BIP-39 phrase (256-bit /
 * 32-byte entropy) with NO custom header bytes. The signing seed is derived
 * from the standard BIP-39 PBKDF2 seed via a domain-separated SHAKE256:
 *
 *   seed64      = BIP-39 PBKDF2 seed = mnemonicToSeedSync(mnemonic, "")
 *                 (HMAC-SHA512, 2048 rounds, 64 bytes)
 *   mldsa65Seed = shake256( utf8("monolythium.mldsa65.v1") || seed64,
 *                           { dkLen: 32 } )
 *
 * `MlDsa65Backend.fromSeed(mldsa65Seed)` then yields the deterministic
 * ML-DSA-65 keypair / address. This is the SDK foundation imported by every
 * wallet + monarch-desktop through `@monolythium/core-sdk/crypto`.
 */
/** Number of words in a Monolythium wallet mnemonic (256-bit BIP-39). */
declare const MLDSA65_MNEMONIC_WORDS = 24;
/** Domain-separation tag mixed into the ML-DSA-65 seed derivation. */
declare const MLDSA65_SEED_DOMAIN = "monolythium.mldsa65.v1";
type MnemonicErrorKind = "badWordCount" | "bip39Decode" | "missingRandom";
declare class MnemonicError extends Error {
    readonly kind: MnemonicErrorKind;
    constructor(kind: MnemonicErrorKind, message: string);
}
type MnemonicRng = (bytes: Uint8Array) => void;
/** Generate a fresh 24-word BIP-39 mnemonic from 32 bytes of entropy. */
declare function generateMnemonic(rng?: MnemonicRng): string;
/**
 * Returns `true` only when `mnemonic` is exactly 24 words AND passes the
 * BIP-39 wordlist + checksum validation.
 */
declare function validateMnemonic(mnemonic: string): boolean;
/**
 * Derive the 32-byte ML-DSA-65 seed from a 24-word BIP-39 mnemonic.
 * Throws a typed {@link MnemonicError} when the input is not a valid 24-word
 * mnemonic.
 */
declare function mnemonicToMlDsa65Seed(mnemonic: string): Uint8Array;
/** Derive the ML-DSA-65 signing backend from a 24-word BIP-39 mnemonic. */
declare function mnemonicToMlDsa65Backend(mnemonic: string): MlDsa65Backend;
/** Derive the wallet address (0x-hex) from a 24-word BIP-39 mnemonic. */
declare function mnemonicToAddress(mnemonic: string): string;

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

export { BincodeWriter, type JsonRpcCallClient, MLDSA65_MNEMONIC_WORDS, MLDSA65_SEED_DOMAIN, MlDsa65Backend, MnemonicError, type MnemonicErrorKind, type MnemonicRng, NativeEvmTxFields, type PlaintextSubmission, buildPlaintextSubmission, bytesToHex, concatBytes, expectBytes, generateMnemonic, hexToBytes, mnemonicToAddress, mnemonicToMlDsa65Backend, mnemonicToMlDsa65Seed, submitPlaintextTransaction, submitTransaction, validateMnemonic };
