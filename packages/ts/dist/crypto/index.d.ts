import { I as MlDsa65Backend } from '../submission-BdBhOdg7.js';
export { k3 as ADDRESS_DERIVATION_DOMAIN, k4 as CLUSTER_MLKEM_SHAMIR, k5 as CLUSTER_MLKEM_SHAMIR_ALGO, k6 as ClusterSealKeyEntryInput, K as ClusterSealKeys, L as ClusterSealKeysSource, k7 as DKG_AEAD_TAG_LEN, k8 as DKG_NONCE_LEN, k9 as DecryptHint, ka as ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE, kb as ENUM_VARIANT_INDEX_ML_DSA_65, kc as EncryptedEnvelope, kd as EncryptedSubmission, E as EncryptionKey, ke as JsonRpcCallClient, kf as LythiumSealEnvelope, kg as ML_DSA_65_PUBLIC_KEY_LEN, kh as ML_DSA_65_SEED_LEN, ki as ML_DSA_65_SIGNATURE_LEN, kj as ML_DSA_65_SIGNING_KEY_LEN, kk as ML_KEM_768_CIPHERTEXT_LEN, kl as ML_KEM_768_ENCAPSULATION_KEY_LEN, km as ML_KEM_768_SHARED_SECRET_LEN, F as MempoolClass, D as NativeEvmTxFields, kn as NativeTxExtension, ko as NativeTxExtensionDescriptor, kp as NativeTxExtensionLike, kq as NonceAad, kr as OperatorSealKeypair, ks as PlaintextSubmission, kt as SEAL_COMMIT_LEN, ku as SEAL_DK_LEN, kv as SEAL_EK_LEN, kw as SEAL_KEM_CT_LEN, kx as SEAL_KEM_SEED_LEN, ky as SEAL_KEY_LEN, kz as SEAL_NONCE_LEN, kA as SEAL_SHARE_LEN, kB as SEAL_TAG_LEN, kC as STANDARD_ALGO_NUMBER_ML_DSA_65, kD as SealRandomSource, kE as SealRecipient, kF as SealedSubmission, kG as bincodeDecryptHint, kH as bincodeEncryptedEnvelope, kI as bincodeNonceAad, kJ as bincodeSignedTransaction, kK as buildEncryptedEnvelope, kL as buildEncryptedSubmission, kM as buildPlaintextSubmission, kN as cryptoRandomSource, kO as encodeMlDsa65Opaque, kP as encodeSealEnvelope, kQ as encodeTransactionForHash, kR as encryptInnerTx, kS as fetchEncryptionKey, kT as generateOperatorSealKeypair, kU as getClusterSealKeys, kV as mlDsa65AddressBytes, kW as mlDsa65AddressFromPublicKey, kX as outerSigDigest, kY as parseClusterSealKeys, kZ as sealRosterHash, k_ as sealToCluster, k$ as sealTransaction, l0 as submitEncryptedEnvelope, l1 as submitPlaintextTransaction, l2 as submitSealedTransaction, l3 as submitTransactionWithPrivacy } from '../submission-BdBhOdg7.js';

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
