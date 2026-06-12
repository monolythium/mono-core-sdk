import { I as MlDsa65Backend } from '../submission-DwcVARLM.cjs';
export { kb as ADDRESS_DERIVATION_DOMAIN, kc as CLUSTER_MLKEM_SHAMIR, kd as CLUSTER_MLKEM_SHAMIR_ALGO, ke as ClusterSealKeyEntryInput, K as ClusterSealKeys, L as ClusterSealKeysSource, kf as DKG_AEAD_TAG_LEN, kg as DKG_NONCE_LEN, kh as DecryptHint, ki as ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE, kj as ENUM_VARIANT_INDEX_ML_DSA_65, kk as EncryptedEnvelope, kl as EncryptedSubmission, E as EncryptionKey, km as JsonRpcCallClient, kn as LythiumSealEnvelope, ko as ML_DSA_65_PUBLIC_KEY_LEN, kp as ML_DSA_65_SEED_LEN, kq as ML_DSA_65_SIGNATURE_LEN, kr as ML_DSA_65_SIGNING_KEY_LEN, ks as ML_KEM_768_CIPHERTEXT_LEN, kt as ML_KEM_768_ENCAPSULATION_KEY_LEN, ku as ML_KEM_768_SHARED_SECRET_LEN, F as MempoolClass, D as NativeEvmTxFields, kv as NativeTxExtension, kw as NativeTxExtensionDescriptor, kx as NativeTxExtensionLike, ky as NonceAad, kz as OperatorSealKeypair, kA as PlaintextSubmission, kB as SEAL_COMMIT_LEN, kC as SEAL_DK_LEN, kD as SEAL_EK_LEN, kE as SEAL_KEM_CT_LEN, kF as SEAL_KEM_SEED_LEN, kG as SEAL_KEY_LEN, kH as SEAL_NONCE_LEN, kI as SEAL_SHARE_LEN, kJ as SEAL_TAG_LEN, kK as STANDARD_ALGO_NUMBER_ML_DSA_65, kL as SealRandomSource, kM as SealRecipient, kN as SealedSubmission, kO as bincodeDecryptHint, kP as bincodeEncryptedEnvelope, kQ as bincodeNonceAad, kR as bincodeSignedTransaction, kS as buildEncryptedEnvelope, kT as buildEncryptedSubmission, kU as buildPlaintextSubmission, kV as cryptoRandomSource, kW as encodeMlDsa65Opaque, kX as encodeSealEnvelope, kY as encodeTransactionForHash, kZ as encryptInnerTx, k_ as fetchEncryptionKey, k$ as generateOperatorSealKeypair, l0 as getClusterSealKeys, l1 as mlDsa65AddressBytes, l2 as mlDsa65AddressFromPublicKey, l3 as outerSigDigest, l4 as parseClusterSealKeys, l5 as sealRosterHash, l6 as sealToCluster, l7 as sealTransaction, l8 as submitEncryptedEnvelope, l9 as submitPlaintextTransaction, la as submitSealedTransaction, lb as submitTransactionWithPrivacy } from '../submission-DwcVARLM.cjs';

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
