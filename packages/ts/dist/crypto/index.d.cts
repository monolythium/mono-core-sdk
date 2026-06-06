import { I as MlDsa65Backend } from '../submission-CqNdqzu2.cjs';
export { jc as ADDRESS_DERIVATION_DOMAIN, jd as CLUSTER_MLKEM_SHAMIR, je as CLUSTER_MLKEM_SHAMIR_ALGO, jf as ClusterSealKeyEntryInput, K as ClusterSealKeys, L as ClusterSealKeysSource, jg as DKG_AEAD_TAG_LEN, jh as DKG_NONCE_LEN, ji as DecryptHint, jj as ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE, jk as ENUM_VARIANT_INDEX_ML_DSA_65, jl as EncryptedEnvelope, jm as EncryptedSubmission, E as EncryptionKey, jn as JsonRpcCallClient, jo as LythiumSealEnvelope, jp as ML_DSA_65_PUBLIC_KEY_LEN, jq as ML_DSA_65_SEED_LEN, jr as ML_DSA_65_SIGNATURE_LEN, js as ML_DSA_65_SIGNING_KEY_LEN, jt as ML_KEM_768_CIPHERTEXT_LEN, ju as ML_KEM_768_ENCAPSULATION_KEY_LEN, jv as ML_KEM_768_SHARED_SECRET_LEN, F as MempoolClass, D as NativeEvmTxFields, jw as NativeTxExtension, jx as NativeTxExtensionDescriptor, jy as NativeTxExtensionLike, jz as NonceAad, jA as OperatorSealKeypair, jB as PlaintextSubmission, jC as SEAL_COMMIT_LEN, jD as SEAL_DK_LEN, jE as SEAL_EK_LEN, jF as SEAL_KEM_CT_LEN, jG as SEAL_KEM_SEED_LEN, jH as SEAL_KEY_LEN, jI as SEAL_NONCE_LEN, jJ as SEAL_SHARE_LEN, jK as SEAL_TAG_LEN, jL as STANDARD_ALGO_NUMBER_ML_DSA_65, jM as SealRandomSource, jN as SealRecipient, jO as SealedSubmission, jP as bincodeDecryptHint, jQ as bincodeEncryptedEnvelope, jR as bincodeNonceAad, jS as bincodeSignedTransaction, jT as buildEncryptedEnvelope, jU as buildEncryptedSubmission, jV as buildPlaintextSubmission, jW as cryptoRandomSource, jX as encodeMlDsa65Opaque, jY as encodeSealEnvelope, jZ as encodeTransactionForHash, j_ as encryptInnerTx, j$ as fetchEncryptionKey, k0 as generateOperatorSealKeypair, k1 as getClusterSealKeys, k2 as mlDsa65AddressBytes, k3 as mlDsa65AddressFromPublicKey, k4 as outerSigDigest, k5 as parseClusterSealKeys, k6 as sealRosterHash, k7 as sealToCluster, k8 as sealTransaction, k9 as submitEncryptedEnvelope, ka as submitPlaintextTransaction, kb as submitSealedTransaction, kc as submitTransactionWithPrivacy } from '../submission-CqNdqzu2.cjs';

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
