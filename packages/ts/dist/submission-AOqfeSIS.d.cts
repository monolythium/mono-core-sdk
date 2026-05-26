import { D as RpcClient } from './native-events-CA0yrnj-.cjs';

declare const ML_KEM_768_CIPHERTEXT_LEN = 1088;
declare const ML_KEM_768_ENCAPSULATION_KEY_LEN = 1184;
declare const ML_KEM_768_SHARED_SECRET_LEN = 32;
declare const DKG_NONCE_LEN = 12;
declare const DKG_AEAD_TAG_LEN = 16;
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
interface NonceAad {
    sender: Uint8Array;
    nonce: bigint;
    chainId: bigint;
    class: MempoolClass;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    gasLimit: bigint;
}
interface DecryptHint {
    epoch: bigint;
    scheme: number;
}
interface EncryptedEnvelope {
    nonceAad: NonceAad;
    ciphertext: Uint8Array;
    decryptionHint: DecryptHint;
    senderPubkey: Uint8Array;
    outerSignature: Uint8Array;
    sender: Uint8Array;
}
declare function bincodeNonceAad(aad: NonceAad): Uint8Array;
declare function bincodeDecryptHint(hint: DecryptHint): Uint8Array;
declare function bincodeEncryptedEnvelope(env: EncryptedEnvelope): Uint8Array;
declare function encryptInnerTx(signedInnerTxBincode: Uint8Array, nonceAad: NonceAad, kemEncapsulationKey: Uint8Array): Uint8Array;
declare function outerSigDigest(nonceAad: NonceAad, ciphertext: Uint8Array, decryptionHint: DecryptHint, senderPubkey: Uint8Array): Uint8Array;
declare function buildEncryptedEnvelope(args: {
    signedInnerTxBincode: Uint8Array;
    nonceAad: NonceAad;
    decryptionHint: DecryptHint;
    kemEncapsulationKey: Uint8Array;
    senderAddress: Uint8Array;
    senderPubkey: Uint8Array;
    signOuterDigest: (digest: Uint8Array) => Promise<Uint8Array> | Uint8Array;
}): Promise<{
    envelope: EncryptedEnvelope;
    wireBytes: Uint8Array;
    wireHex: string;
}>;

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
declare const ENUM_VARIANT_INDEX_ML_DSA_65 = 5;
declare const ADDRESS_DERIVATION_DOMAIN = "MONO_ADDRESS_BLAKE3_20_V1";
declare class MlDsa65Backend {
    #private;
    private constructor();
    static fromSeed(seed: Uint8Array | readonly number[]): MlDsa65Backend;
    publicKey(): Uint8Array;
    addressBytes(): Uint8Array;
    getAddress(): string;
    sign(message: Uint8Array): Uint8Array;
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

interface EncryptionKey {
    algo: string;
    epoch: bigint;
    encapsulationKey: Uint8Array;
}
interface EncryptedSubmission {
    envelopeWireHex: string;
    innerSighashHex: string;
    innerTxHashHex: string;
    innerWireBytes: number;
}
declare function fetchEncryptionKey(client: RpcClient): Promise<EncryptionKey>;
declare function buildEncryptedSubmission(args: {
    backend: MlDsa65Backend;
    tx: NativeEvmTxFields;
    encryptionKey: EncryptionKey;
    class?: MempoolClass;
}): Promise<EncryptedSubmission>;
declare function submitEncryptedEnvelope(client: RpcClient, envelopeWireHex: string): Promise<string>;

export { ADDRESS_DERIVATION_DOMAIN as A, fetchEncryptionKey as B, mlDsa65AddressBytes as C, DKG_AEAD_TAG_LEN as D, type EncryptionKey as E, mlDsa65AddressFromPublicKey as F, outerSigDigest as G, submitEncryptedEnvelope as H, MempoolClass as M, type NativeEvmTxFields as N, STANDARD_ALGO_NUMBER_ML_DSA_65 as S, MlDsa65Backend as a, DKG_NONCE_LEN as b, type DecryptHint as c, ENUM_VARIANT_INDEX_ML_DSA_65 as d, type EncryptedEnvelope as e, type EncryptedSubmission as f, ML_DSA_65_PUBLIC_KEY_LEN as g, ML_DSA_65_SEED_LEN as h, ML_DSA_65_SIGNATURE_LEN as i, ML_DSA_65_SIGNING_KEY_LEN as j, ML_KEM_768_CIPHERTEXT_LEN as k, ML_KEM_768_ENCAPSULATION_KEY_LEN as l, ML_KEM_768_SHARED_SECRET_LEN as m, type NativeTxExtension as n, type NativeTxExtensionDescriptor as o, type NativeTxExtensionLike as p, type NonceAad as q, bincodeDecryptHint as r, bincodeEncryptedEnvelope as s, bincodeNonceAad as t, bincodeSignedTransaction as u, buildEncryptedEnvelope as v, buildEncryptedSubmission as w, encodeMlDsa65Opaque as x, encodeTransactionForHash as y, encryptInnerTx as z };
