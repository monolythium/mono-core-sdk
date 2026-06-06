import { I as MlDsa65Backend } from '../submission-Bd8ajSxX.js';
export { je as ADDRESS_DERIVATION_DOMAIN, jf as CLUSTER_MLKEM_SHAMIR, jg as CLUSTER_MLKEM_SHAMIR_ALGO, jh as ClusterSealKeyEntryInput, K as ClusterSealKeys, L as ClusterSealKeysSource, ji as DKG_AEAD_TAG_LEN, jj as DKG_NONCE_LEN, jk as DecryptHint, jl as ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE, jm as ENUM_VARIANT_INDEX_ML_DSA_65, jn as EncryptedEnvelope, jo as EncryptedSubmission, E as EncryptionKey, jp as JsonRpcCallClient, jq as LythiumSealEnvelope, jr as ML_DSA_65_PUBLIC_KEY_LEN, js as ML_DSA_65_SEED_LEN, jt as ML_DSA_65_SIGNATURE_LEN, ju as ML_DSA_65_SIGNING_KEY_LEN, jv as ML_KEM_768_CIPHERTEXT_LEN, jw as ML_KEM_768_ENCAPSULATION_KEY_LEN, jx as ML_KEM_768_SHARED_SECRET_LEN, F as MempoolClass, D as NativeEvmTxFields, jy as NativeTxExtension, jz as NativeTxExtensionDescriptor, jA as NativeTxExtensionLike, jB as NonceAad, jC as OperatorSealKeypair, jD as PlaintextSubmission, jE as SEAL_COMMIT_LEN, jF as SEAL_DK_LEN, jG as SEAL_EK_LEN, jH as SEAL_KEM_CT_LEN, jI as SEAL_KEM_SEED_LEN, jJ as SEAL_KEY_LEN, jK as SEAL_NONCE_LEN, jL as SEAL_SHARE_LEN, jM as SEAL_TAG_LEN, jN as STANDARD_ALGO_NUMBER_ML_DSA_65, jO as SealRandomSource, jP as SealRecipient, jQ as SealedSubmission, jR as bincodeDecryptHint, jS as bincodeEncryptedEnvelope, jT as bincodeNonceAad, jU as bincodeSignedTransaction, jV as buildEncryptedEnvelope, jW as buildEncryptedSubmission, jX as buildPlaintextSubmission, jY as cryptoRandomSource, jZ as encodeMlDsa65Opaque, j_ as encodeSealEnvelope, j$ as encodeTransactionForHash, k0 as encryptInnerTx, k1 as fetchEncryptionKey, k2 as generateOperatorSealKeypair, k3 as getClusterSealKeys, k4 as mlDsa65AddressBytes, k5 as mlDsa65AddressFromPublicKey, k6 as outerSigDigest, k7 as parseClusterSealKeys, k8 as sealRosterHash, k9 as sealToCluster, ka as sealTransaction, kb as submitEncryptedEnvelope, kc as submitPlaintextTransaction, kd as submitSealedTransaction, ke as submitTransactionWithPrivacy } from '../submission-Bd8ajSxX.js';

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

export { BincodeWriter, MlDsa65Backend, PQM1_ALGO_TAG_FALCON512_RESERVED, PQM1_ALGO_TAG_MLDSA65, PQM1_ALGO_TAG_MLDSA87_RESERVED, PQM1_ALGO_TAG_SLHDSA128S_RESERVED, PQM1_ENTROPY_LEN, PQM1_PAYLOAD_LEN, PQM1_V1_MLDSA65_DOMAIN_TAG, PQM1_V1_MNEMONIC_WORDS, PQM1_VERSION_V1, Pqm1Error, type Pqm1ErrorKind, type Pqm1Payload, type Pqm1Rng, assemblePqm1Payload, bytesToHex, concatBytes, derivePqm1MlDsa65SeedFromPayload, expectBytes, generatePqm1Mnemonic, hexToBytes, parsePqm1Payload, pqm1MnemonicToAddress, pqm1MnemonicToMlDsa65Backend, pqm1MnemonicToMlDsa65Seed, pqm1MnemonicToPayload, pqm1PayloadToMnemonic };
