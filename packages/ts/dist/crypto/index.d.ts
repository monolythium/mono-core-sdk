import { V as MlDsa65Backend } from '../submission-CEm3-EYM.js';
export { kc as ADDRESS_DERIVATION_DOMAIN, kd as CLUSTER_MLKEM_SHAMIR, ke as CLUSTER_MLKEM_SHAMIR_ALGO, kf as ClusterSealKeyEntryInput, X as ClusterSealKeys, Y as ClusterSealKeysSource, kg as DKG_AEAD_TAG_LEN, kh as DKG_NONCE_LEN, ki as DecryptHint, kj as ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE, kk as ENUM_VARIANT_INDEX_ML_DSA_65, kl as EncryptedEnvelope, km as EncryptedSubmission, I as EncryptionKey, kn as JsonRpcCallClient, ko as LythiumSealEnvelope, kp as ML_DSA_65_PUBLIC_KEY_LEN, kq as ML_DSA_65_SEED_LEN, kr as ML_DSA_65_SIGNATURE_LEN, ks as ML_DSA_65_SIGNING_KEY_LEN, kt as ML_KEM_768_CIPHERTEXT_LEN, ku as ML_KEM_768_ENCAPSULATION_KEY_LEN, kv as ML_KEM_768_SHARED_SECRET_LEN, J as MempoolClass, H as NativeEvmTxFields, kw as NativeTxExtension, kx as NativeTxExtensionDescriptor, ky as NativeTxExtensionLike, kz as NonceAad, kA as OperatorSealKeypair, kB as PlaintextSubmission, kC as SEAL_COMMIT_LEN, kD as SEAL_DK_LEN, kE as SEAL_EK_LEN, kF as SEAL_KEM_CT_LEN, kG as SEAL_KEM_SEED_LEN, kH as SEAL_KEY_LEN, kI as SEAL_NONCE_LEN, kJ as SEAL_SHARE_LEN, kK as SEAL_TAG_LEN, kL as STANDARD_ALGO_NUMBER_ML_DSA_65, kM as SealRandomSource, kN as SealRecipient, kO as SealedSubmission, kP as bincodeDecryptHint, kQ as bincodeEncryptedEnvelope, kR as bincodeNonceAad, kS as bincodeSignedTransaction, kT as buildEncryptedEnvelope, kU as buildEncryptedSubmission, kV as buildPlaintextSubmission, kW as cryptoRandomSource, kX as encodeMlDsa65Opaque, kY as encodeSealEnvelope, kZ as encodeTransactionForHash, k_ as encryptInnerTx, k$ as fetchEncryptionKey, l0 as generateOperatorSealKeypair, l1 as getClusterSealKeys, l2 as mlDsa65AddressBytes, l3 as mlDsa65AddressFromPublicKey, l4 as outerSigDigest, l5 as parseClusterSealKeys, l6 as sealRosterHash, l7 as sealToCluster, l8 as sealTransaction, l9 as submitEncryptedEnvelope, la as submitPlaintextTransaction, lb as submitSealedTransaction, lc as submitTransactionWithPrivacy } from '../submission-CEm3-EYM.js';

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
