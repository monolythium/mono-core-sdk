import { shake256 } from "@noble/hashes/sha3.js";
import { entropyToMnemonic, mnemonicToEntropy } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { concatBytes, expectBytes } from "./bytes.js";
import { ML_DSA_65_SEED_LEN, MlDsa65Backend } from "./ml-dsa.js";

export const PQM1_ALGO_TAG_MLDSA65 = 0x01;
export const PQM1_ALGO_TAG_MLDSA87_RESERVED = 0x02;
export const PQM1_ALGO_TAG_SLHDSA128S_RESERVED = 0x03;
export const PQM1_ALGO_TAG_FALCON512_RESERVED = 0x04;
export const PQM1_VERSION_V1 = 0x01;
export const PQM1_PAYLOAD_LEN = 32;
export const PQM1_ENTROPY_LEN = 30;
export const PQM1_V1_MNEMONIC_WORDS = 24;
export const PQM1_V1_MLDSA65_DOMAIN_TAG = "monolythium.pqm1.v1.mldsa65";

export type Pqm1ErrorKind =
  | "badWordCount"
  | "bip39Decode"
  | "badPayloadLength"
  | "unsupportedAlgorithm"
  | "unsupportedVersion"
  | "missingRandom";

export class Pqm1Error extends Error {
  constructor(
    readonly kind: Pqm1ErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "Pqm1Error";
  }
}

export interface Pqm1Payload {
  algoTag: typeof PQM1_ALGO_TAG_MLDSA65;
  version: typeof PQM1_VERSION_V1;
  entropy: Uint8Array;
  bytes: Uint8Array;
}

export type Pqm1Rng = (bytes: Uint8Array) => void;

const DOMAIN_BYTES = new TextEncoder().encode(PQM1_V1_MLDSA65_DOMAIN_TAG);

function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
}

function ensureSupportedPayload(bytes: Uint8Array): void {
  if (bytes.length !== PQM1_PAYLOAD_LEN) {
    throw new Pqm1Error("badPayloadLength", `PQM-1 payload must be ${PQM1_PAYLOAD_LEN} bytes, got ${bytes.length}`);
  }
  if (bytes[0] !== PQM1_ALGO_TAG_MLDSA65) {
    throw new Pqm1Error("unsupportedAlgorithm", `unsupported PQM-1 algorithm tag 0x${bytes[0]!.toString(16).padStart(2, "0")}`);
  }
  if (bytes[1] !== PQM1_VERSION_V1) {
    throw new Pqm1Error("unsupportedVersion", `unsupported PQM-1 version 0x${bytes[1]!.toString(16).padStart(2, "0")}`);
  }
}

function defaultRandomFill(bytes: Uint8Array): void {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    throw new Pqm1Error("missingRandom", "globalThis.crypto.getRandomValues is unavailable");
  }
  cryptoObj.getRandomValues(bytes);
}

export function assemblePqm1Payload(entropy: Uint8Array | readonly number[]): Uint8Array {
  const ent = expectBytes(entropy, PQM1_ENTROPY_LEN, "PQM-1 entropy");
  const payload = new Uint8Array(PQM1_PAYLOAD_LEN);
  payload[0] = PQM1_ALGO_TAG_MLDSA65;
  payload[1] = PQM1_VERSION_V1;
  payload.set(ent, 2);
  return payload;
}

export function parsePqm1Payload(payload: Uint8Array | readonly number[]): Pqm1Payload {
  const bytes = expectBytes(payload, PQM1_PAYLOAD_LEN, "PQM-1 payload").slice();
  ensureSupportedPayload(bytes);
  return {
    algoTag: PQM1_ALGO_TAG_MLDSA65,
    version: PQM1_VERSION_V1,
    entropy: bytes.slice(2),
    bytes,
  };
}

export function pqm1PayloadToMnemonic(payload: Uint8Array | readonly number[]): string {
  const parsed = parsePqm1Payload(payload);
  return entropyToMnemonic(parsed.bytes, wordlist);
}

export function pqm1MnemonicToPayload(mnemonic: string): Pqm1Payload {
  const normalized = normalizeMnemonic(mnemonic);
  const words = normalized.length === 0 ? [] : normalized.split(" ");
  if (words.length !== PQM1_V1_MNEMONIC_WORDS) {
    throw new Pqm1Error("badWordCount", `PQM-1 mnemonic must be ${PQM1_V1_MNEMONIC_WORDS} words, got ${words.length}`);
  }
  let payload: Uint8Array;
  try {
    payload = mnemonicToEntropy(normalized, wordlist);
  } catch (e) {
    throw new Pqm1Error("bip39Decode", `invalid PQM-1 mnemonic: ${(e as Error).message}`);
  }
  return parsePqm1Payload(payload);
}

export function derivePqm1MlDsa65SeedFromPayload(payload: Uint8Array | readonly number[]): Uint8Array {
  const parsed = parsePqm1Payload(payload);
  return shake256(concatBytes(DOMAIN_BYTES, parsed.bytes), { dkLen: ML_DSA_65_SEED_LEN });
}

export function pqm1MnemonicToMlDsa65Seed(mnemonic: string): Uint8Array {
  return derivePqm1MlDsa65SeedFromPayload(pqm1MnemonicToPayload(mnemonic).bytes);
}

export function pqm1MnemonicToMlDsa65Backend(mnemonic: string): MlDsa65Backend {
  return MlDsa65Backend.fromSeed(pqm1MnemonicToMlDsa65Seed(mnemonic));
}

export function pqm1MnemonicToAddress(mnemonic: string): string {
  return pqm1MnemonicToMlDsa65Backend(mnemonic).getAddress();
}

export function generatePqm1Mnemonic(rng: Pqm1Rng = defaultRandomFill): string {
  const entropy = new Uint8Array(PQM1_ENTROPY_LEN);
  rng(entropy);
  return pqm1PayloadToMnemonic(assemblePqm1Payload(entropy));
}
