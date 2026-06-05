import { I as MlDsa65Backend } from '../submission-BEMGyVIX.js';
export { j6 as ADDRESS_DERIVATION_DOMAIN, j7 as CLUSTER_MLKEM_SHAMIR, j8 as CLUSTER_MLKEM_SHAMIR_ALGO, j9 as ClusterSealKeyEntryInput, K as ClusterSealKeys, L as ClusterSealKeysSource, ja as DKG_AEAD_TAG_LEN, jb as DKG_NONCE_LEN, jc as DecryptHint, jd as ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE, je as ENUM_VARIANT_INDEX_ML_DSA_65, jf as EncryptedEnvelope, jg as EncryptedSubmission, E as EncryptionKey, jh as JsonRpcCallClient, ji as LythiumSealEnvelope, jj as ML_DSA_65_PUBLIC_KEY_LEN, jk as ML_DSA_65_SEED_LEN, jl as ML_DSA_65_SIGNATURE_LEN, jm as ML_DSA_65_SIGNING_KEY_LEN, jn as ML_KEM_768_CIPHERTEXT_LEN, jo as ML_KEM_768_ENCAPSULATION_KEY_LEN, jp as ML_KEM_768_SHARED_SECRET_LEN, F as MempoolClass, D as NativeEvmTxFields, jq as NativeTxExtension, jr as NativeTxExtensionDescriptor, js as NativeTxExtensionLike, jt as NonceAad, ju as PlaintextSubmission, jv as SEAL_COMMIT_LEN, jw as SEAL_DK_LEN, jx as SEAL_EK_LEN, jy as SEAL_KEM_CT_LEN, jz as SEAL_KEM_SEED_LEN, jA as SEAL_KEY_LEN, jB as SEAL_NONCE_LEN, jC as SEAL_SHARE_LEN, jD as SEAL_TAG_LEN, jE as STANDARD_ALGO_NUMBER_ML_DSA_65, jF as SealRandomSource, jG as SealRecipient, jH as SealedSubmission, jI as bincodeDecryptHint, jJ as bincodeEncryptedEnvelope, jK as bincodeNonceAad, jL as bincodeSignedTransaction, jM as buildEncryptedEnvelope, jN as buildEncryptedSubmission, jO as buildPlaintextSubmission, jP as cryptoRandomSource, jQ as encodeMlDsa65Opaque, jR as encodeSealEnvelope, jS as encodeTransactionForHash, jT as encryptInnerTx, jU as fetchEncryptionKey, jV as getClusterSealKeys, jW as mlDsa65AddressBytes, jX as mlDsa65AddressFromPublicKey, jY as outerSigDigest, jZ as parseClusterSealKeys, j_ as sealRosterHash, j$ as sealToCluster, k0 as sealTransaction, k1 as submitEncryptedEnvelope, k2 as submitPlaintextTransaction, k3 as submitSealedTransaction, k4 as submitTransactionWithPrivacy } from '../submission-BEMGyVIX.js';

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
