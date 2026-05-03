import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { randomBytes } from "@noble/hashes/utils.js";
import { BincodeWriter } from "./bincode.js";
import { bytesToHex, concatBytes, expectBytes } from "./bytes.js";
import {
  ENUM_VARIANT_INDEX_ML_DSA_65,
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  STANDARD_ALGO_NUMBER_ML_DSA_65,
} from "./ml-dsa.js";

const DKG_AEAD_DOMAIN_TAG = new TextEncoder().encode("protocore/v2/mempool/dkg-mlkem768/1");

export const ML_KEM_768_CIPHERTEXT_LEN = 1088;
export const ML_KEM_768_ENCAPSULATION_KEY_LEN = 1184;
export const ML_KEM_768_SHARED_SECRET_LEN = 32;
export const DKG_NONCE_LEN = 12;
export const DKG_AEAD_TAG_LEN = 16;

export const MempoolClass = {
  Transfer: 0,
  ContractCall: 1,
  PrivacyOp: 2,
  CLOBOp: 3,
  AgentOp: 4,
  GovernanceOp: 5,
  RWAOp: 6,
} as const;
export type MempoolClass = (typeof MempoolClass)[keyof typeof MempoolClass];

export interface NonceAad {
  sender: Uint8Array;
  nonce: bigint;
  chainId: bigint;
  class: MempoolClass;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  gasLimit: bigint;
}

export interface DecryptHint {
  epoch: bigint;
  scheme: number;
}

export interface EncryptedEnvelope {
  nonceAad: NonceAad;
  ciphertext: Uint8Array;
  decryptionHint: DecryptHint;
  senderPubkey: Uint8Array;
  outerSignature: Uint8Array;
  sender: Uint8Array;
}

export function bincodeNonceAad(aad: NonceAad): Uint8Array {
  const w = new BincodeWriter();
  w.bytes(expectBytes(aad.sender, 20, "NonceAad.sender"));
  w.u64(aad.nonce);
  w.u64(aad.chainId);
  w.enumVariant(aad.class);
  w.u128(aad.maxFeePerGas);
  w.u128(aad.maxPriorityFeePerGas);
  w.u64(aad.gasLimit);
  return w.toBytes();
}

export function bincodeDecryptHint(hint: DecryptHint): Uint8Array {
  const w = new BincodeWriter();
  w.u64(hint.epoch);
  w.u16(hint.scheme);
  return w.toBytes();
}

export function bincodeEncryptedEnvelope(env: EncryptedEnvelope): Uint8Array {
  const w = new BincodeWriter();
  w.rawBytes(bincodeNonceAad(env.nonceAad));
  w.bytes(env.ciphertext);
  w.rawBytes(bincodeDecryptHint(env.decryptionHint));
  bincodeMlDsa65OpaqueInto(w, expectBytes(env.senderPubkey, ML_DSA_65_PUBLIC_KEY_LEN, "senderPubkey"));
  bincodeMlDsa65OpaqueInto(w, expectBytes(env.outerSignature, ML_DSA_65_SIGNATURE_LEN, "outerSignature"));
  w.bytes(expectBytes(env.sender, 20, "sender"));
  return w.toBytes();
}

export function encryptInnerTx(
  signedInnerTxBincode: Uint8Array,
  nonceAad: NonceAad,
  kemEncapsulationKey: Uint8Array,
): Uint8Array {
  expectBytes(kemEncapsulationKey, ML_KEM_768_ENCAPSULATION_KEY_LEN, "kemEncapsulationKey");
  const { cipherText: kemCt, sharedSecret } = ml_kem768.encapsulate(kemEncapsulationKey);
  const nonce = randomBytes(DKG_NONCE_LEN);
  const cipher = chacha20poly1305(sharedSecret, nonce, aadFor(nonceAad));
  const aeadCt = cipher.encrypt(signedInnerTxBincode);
  sharedSecret.fill(0);
  return concatBytes(kemCt, nonce, aeadCt);
}

export function outerSigDigest(
  nonceAad: NonceAad,
  ciphertext: Uint8Array,
  decryptionHint: DecryptHint,
  senderPubkey: Uint8Array,
): Uint8Array {
  const aad = bincodeNonceAad(nonceAad);
  const hint = bincodeDecryptHint(decryptionHint);
  return keccak_256(concatBytes(aad, ciphertext, hint, expectBytes(senderPubkey, ML_DSA_65_PUBLIC_KEY_LEN, "senderPubkey")));
}

export async function buildEncryptedEnvelope(args: {
  signedInnerTxBincode: Uint8Array;
  nonceAad: NonceAad;
  decryptionHint: DecryptHint;
  kemEncapsulationKey: Uint8Array;
  senderAddress: Uint8Array;
  senderPubkey: Uint8Array;
  signOuterDigest: (digest: Uint8Array) => Promise<Uint8Array> | Uint8Array;
}): Promise<{ envelope: EncryptedEnvelope; wireBytes: Uint8Array; wireHex: string }> {
  const ciphertext = encryptInnerTx(args.signedInnerTxBincode, args.nonceAad, args.kemEncapsulationKey);
  const digest = outerSigDigest(args.nonceAad, ciphertext, args.decryptionHint, args.senderPubkey);
  const outerSignature = await args.signOuterDigest(digest);
  const envelope: EncryptedEnvelope = {
    nonceAad: args.nonceAad,
    ciphertext,
    decryptionHint: args.decryptionHint,
    senderPubkey: expectBytes(args.senderPubkey, ML_DSA_65_PUBLIC_KEY_LEN, "senderPubkey"),
    outerSignature: expectBytes(outerSignature, ML_DSA_65_SIGNATURE_LEN, "outerSignature"),
    sender: expectBytes(args.senderAddress, 20, "senderAddress"),
  };
  const wireBytes = bincodeEncryptedEnvelope(envelope);
  return { envelope, wireBytes, wireHex: bytesToHex(wireBytes) };
}

function aadFor(aad: NonceAad): Uint8Array {
  return concatBytes(DKG_AEAD_DOMAIN_TAG, bincodeNonceAad(aad));
}

function bincodeMlDsa65OpaqueInto(w: BincodeWriter, raw: Uint8Array): void {
  w.enumVariant(ENUM_VARIANT_INDEX_ML_DSA_65);
  w.u16(STANDARD_ALGO_NUMBER_ML_DSA_65);
  w.bytes(raw);
}
