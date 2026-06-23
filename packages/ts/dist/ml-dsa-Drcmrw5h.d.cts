/**
 * Mempool transaction-class tags.
 *
 * The encrypted-mempool (LythiumSeal) envelope was removed at the v2
 * re-genesis; plaintext submission is the sole submit path. This module now
 * carries only the {@link MempoolClass} tag the node uses to classify a
 * transaction for ordering/admission.
 */
declare const MempoolClass: {
    readonly Transfer: 0;
    readonly ContractCall: 1;
    readonly PrivacyOp: 2;
    readonly CLOBOp: 3;
    readonly AgentOp: 4;
    readonly FoundationOp: 5;
    /** @deprecated Use FoundationOp. */
    readonly GovernanceOp: 5;
    readonly RWAOp: 6;
};
type MempoolClass = (typeof MempoolClass)[keyof typeof MempoolClass];

interface NativeEvmTxFields {
    chainId: bigint | number | string;
    nonce: bigint | number | string;
    maxPriorityFeePerGas: bigint | number | string;
    maxFeePerGas: bigint | number | string;
    gasLimit: bigint | number | string;
    to: Uint8Array | readonly number[] | string | null;
    value: bigint | number | string;
    input?: Uint8Array | readonly number[] | string;
    extensions?: readonly NativeTxExtensionLike[];
}
interface NativeTxExtension {
    kind: number;
    body: Uint8Array | readonly number[] | string;
}
interface NativeTxExtensionDescriptor {
    kind: number;
    bodyHex: string;
}
type NativeTxExtensionLike = NativeTxExtension | NativeTxExtensionDescriptor;
declare function encodeTransactionForHash(fields: NativeEvmTxFields, tag: 0x01 | 0x02): Uint8Array;
declare function bincodeSignedTransaction(fields: NativeEvmTxFields, signature: Uint8Array | readonly number[], publicKey: Uint8Array | readonly number[]): Uint8Array;

declare const ML_DSA_65_SEED_LEN = 32;
declare const ML_DSA_65_SIGNING_KEY_LEN = 4032;
declare const ML_DSA_65_PUBLIC_KEY_LEN = 1952;
declare const ML_DSA_65_SIGNATURE_LEN = 3309;
declare const STANDARD_ALGO_NUMBER_ML_DSA_65 = 1001;
declare const ENUM_VARIANT_INDEX_ML_DSA_65 = 3;
declare const ADDRESS_DERIVATION_DOMAIN = "MONO_ADDRESS_BLAKE3_20_V1";
declare class MlDsa65Backend {
    #private;
    private constructor();
    static fromSeed(seed: Uint8Array | readonly number[]): MlDsa65Backend;
    publicKey(): Uint8Array;
    addressBytes(): Uint8Array;
    getAddress(): string;
    sign(message: Uint8Array): Uint8Array;
    /**
     * Best-effort deterministic wipe of the in-memory secret key. Zeroes the
     * SDK-held `#secretKey` copy and makes any subsequent `sign()` /
     * `signPrehash()` / `signEvmTx()` throw `"MlDsa65Backend disposed"` rather
     * than signing with a zeroed key. Idempotent. Public material
     * (`publicKey()` / `getAddress()` / `verify()`) stays usable.
     *
     * Defense-in-depth (S1-01): narrows the post-lock residency window of the
     * ML-DSA-65 secret in the JS heap. `@noble/post-quantum`'s internal
     * transient keygen/sign buffers are out of scope; the SDK-held copy is the
     * meaningful residency win.
     */
    dispose(): void;
    /** Alias for {@link dispose}. */
    zeroize(): void;
    /** Whether {@link dispose} has been called (the secret key is wiped). */
    get disposed(): boolean;
    signPrehash(digest: Uint8Array): Uint8Array;
    verify(message: Uint8Array, signature: Uint8Array): boolean;
    signEvmTx(fields: NativeEvmTxFields): {
        wireHex: string;
        wireBytes: Uint8Array;
        sighash: Uint8Array;
        txHash: Uint8Array;
    };
}
declare function mlDsa65AddressFromPublicKey(publicKey: Uint8Array | readonly number[]): string;
declare function mlDsa65AddressBytes(publicKey: Uint8Array | readonly number[]): Uint8Array;
declare function encodeMlDsa65Opaque(raw: Uint8Array | readonly number[]): Uint8Array;

export { ADDRESS_DERIVATION_DOMAIN as A, ENUM_VARIANT_INDEX_ML_DSA_65 as E, MempoolClass as M, type NativeEvmTxFields as N, STANDARD_ALGO_NUMBER_ML_DSA_65 as S, MlDsa65Backend as a, ML_DSA_65_PUBLIC_KEY_LEN as b, ML_DSA_65_SEED_LEN as c, ML_DSA_65_SIGNATURE_LEN as d, ML_DSA_65_SIGNING_KEY_LEN as e, type NativeTxExtension as f, type NativeTxExtensionDescriptor as g, type NativeTxExtensionLike as h, bincodeSignedTransaction as i, encodeMlDsa65Opaque as j, encodeTransactionForHash as k, mlDsa65AddressFromPublicKey as l, mlDsa65AddressBytes as m };
