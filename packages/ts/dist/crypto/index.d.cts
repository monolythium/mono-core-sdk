import { I as MlDsa65Backend } from '../submission-r49gicCD.cjs';
export { jZ as ADDRESS_DERIVATION_DOMAIN, j_ as CLUSTER_MLKEM_SHAMIR, j$ as CLUSTER_MLKEM_SHAMIR_ALGO, k0 as ClusterSealKeyEntryInput, K as ClusterSealKeys, L as ClusterSealKeysSource, k1 as DKG_AEAD_TAG_LEN, k2 as DKG_NONCE_LEN, k3 as DecryptHint, k4 as ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE, k5 as ENUM_VARIANT_INDEX_ML_DSA_65, k6 as EncryptedEnvelope, k7 as EncryptedSubmission, E as EncryptionKey, k8 as JsonRpcCallClient, k9 as LythiumSealEnvelope, ka as ML_DSA_65_PUBLIC_KEY_LEN, kb as ML_DSA_65_SEED_LEN, kc as ML_DSA_65_SIGNATURE_LEN, kd as ML_DSA_65_SIGNING_KEY_LEN, ke as ML_KEM_768_CIPHERTEXT_LEN, kf as ML_KEM_768_ENCAPSULATION_KEY_LEN, kg as ML_KEM_768_SHARED_SECRET_LEN, F as MempoolClass, D as NativeEvmTxFields, kh as NativeTxExtension, ki as NativeTxExtensionDescriptor, kj as NativeTxExtensionLike, kk as NonceAad, kl as OperatorSealKeypair, km as PlaintextSubmission, kn as SEAL_COMMIT_LEN, ko as SEAL_DK_LEN, kp as SEAL_EK_LEN, kq as SEAL_KEM_CT_LEN, kr as SEAL_KEM_SEED_LEN, ks as SEAL_KEY_LEN, kt as SEAL_NONCE_LEN, ku as SEAL_SHARE_LEN, kv as SEAL_TAG_LEN, kw as STANDARD_ALGO_NUMBER_ML_DSA_65, kx as SealRandomSource, ky as SealRecipient, kz as SealedSubmission, kA as bincodeDecryptHint, kB as bincodeEncryptedEnvelope, kC as bincodeNonceAad, kD as bincodeSignedTransaction, kE as buildEncryptedEnvelope, kF as buildEncryptedSubmission, kG as buildPlaintextSubmission, kH as cryptoRandomSource, kI as encodeMlDsa65Opaque, kJ as encodeSealEnvelope, kK as encodeTransactionForHash, kL as encryptInnerTx, kM as fetchEncryptionKey, kN as generateOperatorSealKeypair, kO as getClusterSealKeys, kP as mlDsa65AddressBytes, kQ as mlDsa65AddressFromPublicKey, kR as outerSigDigest, kS as parseClusterSealKeys, kT as sealRosterHash, kU as sealToCluster, kV as sealTransaction, kW as submitEncryptedEnvelope, kX as submitPlaintextTransaction, kY as submitSealedTransaction, kZ as submitTransactionWithPrivacy } from '../submission-r49gicCD.cjs';

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
