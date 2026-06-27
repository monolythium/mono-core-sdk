import { shake256 } from "@noble/hashes/sha3.js";
import {
  entropyToMnemonic,
  mnemonicToSeedSync,
  validateMnemonic as bip39ValidateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { concatBytes } from "./bytes.js";
import { ML_DSA_65_SEED_LEN, MlDsa65Backend } from "./ml-dsa.js";

/**
 * Standard BIP-39 -> ML-DSA-65 wallet key derivation.
 *
 * A wallet mnemonic is a plain 24-word English BIP-39 phrase (256-bit /
 * 32-byte entropy) with NO custom header bytes. The signing seed is derived
 * from the standard BIP-39 PBKDF2 seed via a domain-separated SHAKE256:
 *
 *   seed64      = BIP-39 PBKDF2 seed = mnemonicToSeedSync(mnemonic, "")
 *                 (HMAC-SHA512, 2048 rounds, 64 bytes)
 *   mldsa65Seed = shake256( utf8("monolythium.mldsa65.v1") || seed64,
 *                           { dkLen: 32 } )
 *
 * `MlDsa65Backend.fromSeed(mldsa65Seed)` then yields the deterministic
 * ML-DSA-65 keypair / address. This is the SDK foundation imported by every
 * wallet + monarch-desktop through `@monolythium/core-sdk/crypto`.
 */

/** Number of words in a Monolythium wallet mnemonic (256-bit BIP-39). */
export const MLDSA65_MNEMONIC_WORDS = 24;
/** Domain-separation tag mixed into the ML-DSA-65 seed derivation. */
export const MLDSA65_SEED_DOMAIN = "monolythium.mldsa65.v1";

/** BIP-39 entropy length backing a 24-word mnemonic (32 bytes => 256 bits). */
const MLDSA65_ENTROPY_LEN = 32;

const DOMAIN_BYTES = new TextEncoder().encode(MLDSA65_SEED_DOMAIN);

export type MnemonicErrorKind = "badWordCount" | "bip39Decode" | "missingRandom";

export class MnemonicError extends Error {
  constructor(
    readonly kind: MnemonicErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "MnemonicError";
  }
}

export type MnemonicRng = (bytes: Uint8Array) => void;

/**
 * Normalize a mnemonic for validation/derivation: trim, lowercase, and
 * collapse any internal whitespace run to a single ASCII space.
 */
function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
}

function wordCount(normalized: string): number {
  return normalized.length === 0 ? 0 : normalized.split(" ").length;
}

function defaultRandomFill(bytes: Uint8Array): void {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    throw new MnemonicError("missingRandom", "globalThis.crypto.getRandomValues is unavailable");
  }
  cryptoObj.getRandomValues(bytes);
}

/** Generate a fresh 24-word BIP-39 mnemonic from 32 bytes of entropy. */
export function generateMnemonic(rng: MnemonicRng = defaultRandomFill): string {
  const entropy = new Uint8Array(MLDSA65_ENTROPY_LEN);
  rng(entropy);
  return entropyToMnemonic(entropy, wordlist);
}

/**
 * Returns `true` only when `mnemonic` is exactly 24 words AND passes the
 * BIP-39 wordlist + checksum validation.
 */
export function validateMnemonic(mnemonic: string): boolean {
  const normalized = normalizeMnemonic(mnemonic);
  if (wordCount(normalized) !== MLDSA65_MNEMONIC_WORDS) {
    return false;
  }
  return bip39ValidateMnemonic(normalized, wordlist);
}

/**
 * Derive the 32-byte ML-DSA-65 seed from a 24-word BIP-39 mnemonic.
 * Throws a typed {@link MnemonicError} when the input is not a valid 24-word
 * mnemonic.
 */
export function mnemonicToMlDsa65Seed(mnemonic: string): Uint8Array {
  const normalized = normalizeMnemonic(mnemonic);
  const words = wordCount(normalized);
  if (words !== MLDSA65_MNEMONIC_WORDS) {
    throw new MnemonicError(
      "badWordCount",
      `mnemonic must be ${MLDSA65_MNEMONIC_WORDS} words, got ${words}`,
    );
  }
  if (!bip39ValidateMnemonic(normalized, wordlist)) {
    throw new MnemonicError(
      "bip39Decode",
      "invalid BIP-39 mnemonic (unknown word or bad checksum)",
    );
  }
  const seed64 = mnemonicToSeedSync(normalized, "");
  return shake256(concatBytes(DOMAIN_BYTES, seed64), { dkLen: ML_DSA_65_SEED_LEN });
}

/** Derive the ML-DSA-65 signing backend from a 24-word BIP-39 mnemonic. */
export function mnemonicToMlDsa65Backend(mnemonic: string): MlDsa65Backend {
  return MlDsa65Backend.fromSeed(mnemonicToMlDsa65Seed(mnemonic));
}

/** Derive the wallet address (0x-hex) from a 24-word BIP-39 mnemonic. */
export function mnemonicToAddress(mnemonic: string): string {
  return mnemonicToMlDsa65Backend(mnemonic).getAddress();
}
