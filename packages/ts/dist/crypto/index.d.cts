import { I as MlDsa65Backend } from '../submission-BnCjjGo0.cjs';
export { jo as ADDRESS_DERIVATION_DOMAIN, jp as CLUSTER_MLKEM_SHAMIR, jq as CLUSTER_MLKEM_SHAMIR_ALGO, jr as ClusterSealKeyEntryInput, K as ClusterSealKeys, L as ClusterSealKeysSource, js as DKG_AEAD_TAG_LEN, jt as DKG_NONCE_LEN, ju as DecryptHint, jv as ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE, jw as ENUM_VARIANT_INDEX_ML_DSA_65, jx as EncryptedEnvelope, jy as EncryptedSubmission, E as EncryptionKey, jz as JsonRpcCallClient, jA as LythiumSealEnvelope, jB as ML_DSA_65_PUBLIC_KEY_LEN, jC as ML_DSA_65_SEED_LEN, jD as ML_DSA_65_SIGNATURE_LEN, jE as ML_DSA_65_SIGNING_KEY_LEN, jF as ML_KEM_768_CIPHERTEXT_LEN, jG as ML_KEM_768_ENCAPSULATION_KEY_LEN, jH as ML_KEM_768_SHARED_SECRET_LEN, F as MempoolClass, D as NativeEvmTxFields, jI as NativeTxExtension, jJ as NativeTxExtensionDescriptor, jK as NativeTxExtensionLike, jL as NonceAad, jM as OperatorSealKeypair, jN as PlaintextSubmission, jO as SEAL_COMMIT_LEN, jP as SEAL_DK_LEN, jQ as SEAL_EK_LEN, jR as SEAL_KEM_CT_LEN, jS as SEAL_KEM_SEED_LEN, jT as SEAL_KEY_LEN, jU as SEAL_NONCE_LEN, jV as SEAL_SHARE_LEN, jW as SEAL_TAG_LEN, jX as STANDARD_ALGO_NUMBER_ML_DSA_65, jY as SealRandomSource, jZ as SealRecipient, j_ as SealedSubmission, j$ as bincodeDecryptHint, k0 as bincodeEncryptedEnvelope, k1 as bincodeNonceAad, k2 as bincodeSignedTransaction, k3 as buildEncryptedEnvelope, k4 as buildEncryptedSubmission, k5 as buildPlaintextSubmission, k6 as cryptoRandomSource, k7 as encodeMlDsa65Opaque, k8 as encodeSealEnvelope, k9 as encodeTransactionForHash, ka as encryptInnerTx, kb as fetchEncryptionKey, kc as generateOperatorSealKeypair, kd as getClusterSealKeys, ke as mlDsa65AddressBytes, kf as mlDsa65AddressFromPublicKey, kg as outerSigDigest, kh as parseClusterSealKeys, ki as sealRosterHash, kj as sealToCluster, kk as sealTransaction, kl as submitEncryptedEnvelope, km as submitPlaintextTransaction, kn as submitSealedTransaction, ko as submitTransactionWithPrivacy } from '../submission-BnCjjGo0.cjs';

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
