import { I as MlDsa65Backend } from '../submission-D9k_xppI.js';
export { j2 as ADDRESS_DERIVATION_DOMAIN, j3 as CLUSTER_MLKEM_SHAMIR, j4 as CLUSTER_MLKEM_SHAMIR_ALGO, j5 as ClusterSealKeyEntryInput, K as ClusterSealKeys, L as ClusterSealKeysSource, j6 as DKG_AEAD_TAG_LEN, j7 as DKG_NONCE_LEN, j8 as DecryptHint, j9 as ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE, ja as ENUM_VARIANT_INDEX_ML_DSA_65, jb as EncryptedEnvelope, jc as EncryptedSubmission, E as EncryptionKey, jd as JsonRpcCallClient, je as LythiumSealEnvelope, jf as ML_DSA_65_PUBLIC_KEY_LEN, jg as ML_DSA_65_SEED_LEN, jh as ML_DSA_65_SIGNATURE_LEN, ji as ML_DSA_65_SIGNING_KEY_LEN, jj as ML_KEM_768_CIPHERTEXT_LEN, jk as ML_KEM_768_ENCAPSULATION_KEY_LEN, jl as ML_KEM_768_SHARED_SECRET_LEN, F as MempoolClass, D as NativeEvmTxFields, jm as NativeTxExtension, jn as NativeTxExtensionDescriptor, jo as NativeTxExtensionLike, jp as NonceAad, jq as PlaintextSubmission, jr as SEAL_COMMIT_LEN, js as SEAL_DK_LEN, jt as SEAL_EK_LEN, ju as SEAL_KEM_CT_LEN, jv as SEAL_KEM_SEED_LEN, jw as SEAL_KEY_LEN, jx as SEAL_NONCE_LEN, jy as SEAL_SHARE_LEN, jz as SEAL_TAG_LEN, jA as STANDARD_ALGO_NUMBER_ML_DSA_65, jB as SealRandomSource, jC as SealRecipient, jD as SealedSubmission, jE as bincodeDecryptHint, jF as bincodeEncryptedEnvelope, jG as bincodeNonceAad, jH as bincodeSignedTransaction, jI as buildEncryptedEnvelope, jJ as buildEncryptedSubmission, jK as buildPlaintextSubmission, jL as cryptoRandomSource, jM as encodeMlDsa65Opaque, jN as encodeSealEnvelope, jO as encodeTransactionForHash, jP as encryptInnerTx, jQ as fetchEncryptionKey, jR as getClusterSealKeys, jS as mlDsa65AddressBytes, jT as mlDsa65AddressFromPublicKey, jU as outerSigDigest, jV as parseClusterSealKeys, jW as sealRosterHash, jX as sealToCluster, jY as sealTransaction, jZ as submitEncryptedEnvelope, j_ as submitPlaintextTransaction, j$ as submitSealedTransaction, k0 as submitTransactionWithPrivacy } from '../submission-D9k_xppI.js';

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
