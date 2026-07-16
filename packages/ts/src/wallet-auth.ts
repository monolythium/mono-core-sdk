/**
 * Generic, domain-bound wallet authentication for Monolythium applications.
 *
 * This module deliberately contains no application policy. It defines the
 * byte-for-byte V1 challenge/proof contract shared by wallets and relying
 * parties. Wallets remain responsible for approval UX and origin/network
 * binding; relying parties remain responsible for nonce consumption and
 * session policy.
 */

import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { addressToBech32, bech32ToAddressBytes } from "./address.js";
import { bytesToHex, concatBytes, hexToBytes } from "./crypto/bytes.js";
import {
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  type MlDsa65Backend,
  mlDsa65AddressBytes,
} from "./crypto/ml-dsa.js";

export const WALLET_AUTH_CHALLENGE_VERSION = "1" as const;
export const WALLET_AUTH_ALGORITHM = "ml-dsa-65" as const;
export const WALLET_AUTH_SIGNING_PREFIX = "monolythium.wallet-auth.v1\0" as const;
export const WALLET_AUTH_NONCE_BYTES = 32 as const;
export const WALLET_AUTH_MAX_SCOPES = 16 as const;
export const WALLET_AUTH_MAX_SCOPE_BYTES = 128 as const;
export const WALLET_AUTH_MAX_TTL_SECONDS = 180 as const;
export const WALLET_AUTH_MAX_CLOCK_SKEW_SECONDS = 30 as const;
export const WALLET_AUTH_MAX_DOMAIN_BYTES = 512 as const;
export const WALLET_AUTH_MAX_ORIGIN_BYTES = 528 as const;
export const WALLET_AUTH_MAX_URI_BYTES = 529 as const;
export const WALLET_AUTH_MAX_ADDRESS_BYTES = 128 as const;
export const WALLET_AUTH_MAX_CHALLENGE_JSON_BYTES = 8_192 as const;
export const WALLET_AUTH_MAX_PROOF_JSON_BYTES = 24_576 as const;

const SIGNING_PREFIX_BYTES = new TextEncoder().encode(WALLET_AUTH_SIGNING_PREFIX);
const ASCII_RE = /^[\x00-\x7f]*$/;
const SCOPE_RE = /^[A-Za-z0-9._:/-]+$/;
const CHAIN_ID_RE = /^(0|[1-9][0-9]*)$/;
const GENESIS_HASH_RE = /^0x[0-9a-f]{64}$/;
const NONCE_RE = /^[A-Za-z0-9_-]{43}$/;
const CANONICAL_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LOWER_HEX_PUBLIC_KEY_RE = new RegExp(`^0x[0-9a-f]{${ML_DSA_65_PUBLIC_KEY_LEN * 2}}$`);
const LOWER_HEX_SIGNATURE_RE = new RegExp(`^0x[0-9a-f]{${ML_DSA_65_SIGNATURE_LEN * 2}}$`);
const MAX_CHAIN_ID_DECIMAL =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";
const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const CHALLENGE_KEYS = [
  "version",
  "domain",
  "origin",
  "uri",
  "address",
  "chainId",
  "genesisHash",
  "nonce",
  "issuedAt",
  "expirationTime",
  "scopes",
] as const;
const PROOF_KEYS = ["challenge", "algorithm", "publicKey", "signature"] as const;

export type WalletAuthErrorCode =
  | "invalid_object"
  | "invalid_field"
  | "non_canonical"
  | "not_yet_valid"
  | "expired"
  | "address_mismatch"
  | "invalid_public_key"
  | "signature_invalid";

export class WalletAuthError extends Error {
  constructor(
    readonly code: WalletAuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WalletAuthError";
  }
}

/** The exact signed V1 challenge. All fields are canonical ASCII strings. */
export interface WalletAuthChallengeV1 {
  version: typeof WALLET_AUTH_CHALLENGE_VERSION;
  domain: string;
  origin: string;
  uri: string;
  address: string;
  chainId: string;
  genesisHash: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  scopes: string[];
}

/** A self-contained ML-DSA-65 proof over a canonical V1 challenge. */
export interface WalletAuthProofV1 {
  challenge: WalletAuthChallengeV1;
  algorithm: typeof WALLET_AUTH_ALGORITHM;
  publicKey: string;
  signature: string;
}

export interface WalletAuthVerificationOptions {
  /** Verification instant. Defaults to the current wall clock. */
  now?: Date | number | string;
  /** Clock tolerance applied at both validity boundaries. Defaults to zero. */
  clockSkewSeconds?: number;
}

function fail(code: WalletAuthErrorCode, message: string): never {
  throw new WalletAuthError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, i) => key !== wanted[i])) {
    fail("invalid_object", `${label} must contain exactly: ${expected.join(", ")}`);
  }
}

function expectString(value: unknown, field: string, maxBytes: number): string {
  if (typeof value !== "string") fail("invalid_field", `${field} must be a string`);
  // All accepted values are ASCII, so UTF-16 code-unit length is also the
  // encoded byte length. Check it before a regex or URL parser scans input.
  if (value.length > maxBytes) fail("invalid_field", `${field} is too long`);
  if (!ASCII_RE.test(value)) fail("invalid_field", `${field} must contain ASCII only`);
  return value;
}

function parseCanonicalTime(value: unknown, field: string): { value: string; millis: number } {
  const text = expectString(value, field, 24);
  if (!CANONICAL_TIME_RE.test(text) || Number(text.slice(0, 4)) < 1970) {
    fail("non_canonical", `${field} must be UTC ISO 8601 with exactly millisecond precision`);
  }
  const millis = Date.parse(text);
  if (!Number.isFinite(millis) || new Date(millis).toISOString() !== text) {
    fail("non_canonical", `${field} is not a canonical UTC timestamp`);
  }
  return { value: text, millis };
}

function parseNow(value: Date | number | string | undefined): number {
  if (value === undefined) return Date.now();
  const millis = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(millis)) fail("invalid_field", "verification time is invalid");
  return millis;
}

function validateOriginFields(domain: string, origin: string, uri: string): void {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    fail("invalid_field", "origin must be an absolute HTTP(S) URL origin");
  }
  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    parsed.username !== "" ||
    parsed.password !== ""
  ) {
    fail("invalid_field", "origin must be an HTTP(S) origin without credentials");
  }
  if (origin !== parsed.origin || domain !== parsed.host || uri !== `${parsed.origin}/`) {
    fail("non_canonical", "domain, origin, and uri must be the canonical URL host, origin, and origin root");
  }
}

function validateScopes(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > WALLET_AUTH_MAX_SCOPES) {
    fail("invalid_field", `scopes must contain 1..${WALLET_AUTH_MAX_SCOPES} entries`);
  }
  const scopes = value.map((scope, index) => {
    const text = expectString(scope, `scopes[${index}]`, WALLET_AUTH_MAX_SCOPE_BYTES);
    if (text.length > WALLET_AUTH_MAX_SCOPE_BYTES || !SCOPE_RE.test(text)) {
      fail(
        "invalid_field",
        `scopes[${index}] must be a 1..${WALLET_AUTH_MAX_SCOPE_BYTES} byte ASCII scope token`,
      );
    }
    return text;
  });
  for (let i = 1; i < scopes.length; i++) {
    if (scopes[i - 1]! >= scopes[i]!) {
      fail("non_canonical", "scopes must be sorted by ASCII byte order and contain no duplicates");
    }
  }
  return scopes;
}

/**
 * Strictly validate and clone a challenge-shaped object.
 *
 * This does not silently sort, lowercase, normalize URLs, or rewrite time:
 * signatures must never change authority through implicit normalization.
 */
export function parseWalletAuthChallengeV1(value: unknown): WalletAuthChallengeV1 {
  if (!isRecord(value)) fail("invalid_object", "challenge must be an object");
  assertExactKeys(value, CHALLENGE_KEYS, "challenge");

  const version = expectString(value.version, "version", WALLET_AUTH_CHALLENGE_VERSION.length);
  if (version !== WALLET_AUTH_CHALLENGE_VERSION) fail("invalid_field", "version must be '1'");
  const domain = expectString(value.domain, "domain", WALLET_AUTH_MAX_DOMAIN_BYTES);
  const origin = expectString(value.origin, "origin", WALLET_AUTH_MAX_ORIGIN_BYTES);
  const uri = expectString(value.uri, "uri", WALLET_AUTH_MAX_URI_BYTES);
  validateOriginFields(domain, origin, uri);

  const address = expectString(value.address, "address", WALLET_AUTH_MAX_ADDRESS_BYTES);
  let canonicalAddress: string;
  try {
    // Parsing through the display helper also rejects non-user typed HRPs.
    canonicalAddress = addressToBech32(bech32ToAddressBytes(address));
  } catch {
    fail("invalid_field", "address must be a canonical typed mono1 bech32m address");
  }
  if (canonicalAddress !== address) fail("non_canonical", "address must be canonical lower-case bech32m");

  const chainId = expectString(value.chainId, "chainId", MAX_CHAIN_ID_DECIMAL.length);
  if (
    chainId.length > MAX_CHAIN_ID_DECIMAL.length ||
    !CHAIN_ID_RE.test(chainId) ||
    (chainId.length === MAX_CHAIN_ID_DECIMAL.length && chainId > MAX_CHAIN_ID_DECIMAL)
  ) {
    fail("non_canonical", "chainId must be an unsigned canonical uint256 decimal string");
  }
  const genesisHash = expectString(value.genesisHash, "genesisHash", 66);
  if (!GENESIS_HASH_RE.test(genesisHash)) {
    fail("non_canonical", "genesisHash must be 0x-prefixed lowercase 32-byte hex");
  }
  const nonce = expectString(value.nonce, "nonce", 43);
  if (!NONCE_RE.test(nonce) || BASE64URL_ALPHABET.indexOf(nonce.at(-1)!) % 4 !== 0) {
    fail("non_canonical", "nonce must be unpadded base64url encoding of exactly 32 bytes");
  }

  const issued = parseCanonicalTime(value.issuedAt, "issuedAt");
  const expiration = parseCanonicalTime(value.expirationTime, "expirationTime");
  if (expiration.millis <= issued.millis) {
    fail("invalid_field", "expirationTime must be later than issuedAt");
  }
  if (expiration.millis - issued.millis > WALLET_AUTH_MAX_TTL_SECONDS * 1_000) {
    fail("invalid_field", `challenge lifetime must not exceed ${WALLET_AUTH_MAX_TTL_SECONDS} seconds`);
  }

  return {
    version: WALLET_AUTH_CHALLENGE_VERSION,
    domain,
    origin,
    uri,
    address,
    chainId,
    genesisHash,
    nonce,
    issuedAt: issued.value,
    expirationTime: expiration.value,
    scopes: validateScopes(value.scopes),
  };
}

/**
 * Strict canonicalization boundary. V1 intentionally rejects instead of
 * rewriting non-canonical authority-bearing fields.
 */
export function canonicalizeWalletAuthChallengeV1(value: unknown): WalletAuthChallengeV1 {
  return parseWalletAuthChallengeV1(value);
}

/** Canonical no-whitespace JSON, encoded in the audit-locked field order. */
export function canonicalWalletAuthChallengeJsonV1(value: unknown): string {
  const challenge = parseWalletAuthChallengeV1(value);
  return JSON.stringify({
    version: challenge.version,
    domain: challenge.domain,
    origin: challenge.origin,
    uri: challenge.uri,
    address: challenge.address,
    chainId: challenge.chainId,
    genesisHash: challenge.genesisHash,
    nonce: challenge.nonce,
    issuedAt: challenge.issuedAt,
    expirationTime: challenge.expirationTime,
    scopes: challenge.scopes,
  });
}

/** Canonical JSON bytes (without the signing prefix). */
export function encodeWalletAuthChallengeV1(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalWalletAuthChallengeJsonV1(value));
}

/** Reject JSON that is valid structurally but not already byte-canonical. */
export function decodeWalletAuthChallengeV1(encoded: Uint8Array | string): WalletAuthChallengeV1 {
  if (
    (typeof encoded === "string" && encoded.length > WALLET_AUTH_MAX_CHALLENGE_JSON_BYTES) ||
    (encoded instanceof Uint8Array && encoded.length > WALLET_AUTH_MAX_CHALLENGE_JSON_BYTES)
  ) {
    fail("invalid_object", "challenge JSON is too large");
  }
  let text: string;
  try {
    text = typeof encoded === "string" ? encoded : new TextDecoder("utf-8", { fatal: true }).decode(encoded);
  } catch {
    fail("invalid_object", "challenge is not valid UTF-8 JSON");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail("invalid_object", "challenge is not valid UTF-8 JSON");
  }
  const challenge = parseWalletAuthChallengeV1(parsed);
  if (canonicalWalletAuthChallengeJsonV1(challenge) !== text) {
    fail("non_canonical", "challenge JSON is not in canonical field order/encoding");
  }
  return challenge;
}

/** Prefix + canonical JSON: the exact application-level signing preimage. */
export function walletAuthChallengeSigningPreimageV1(value: unknown): Uint8Array {
  return concatBytes(SIGNING_PREFIX_BYTES, encodeWalletAuthChallengeV1(value));
}

/** Keccak-256 digest signed as the ML-DSA-65 prehash message. */
export function walletAuthChallengeDigestV1(value: unknown): Uint8Array {
  return keccak_256(walletAuthChallengeSigningPreimageV1(value));
}

/** Encode 32 random bytes as the challenge's canonical base64url nonce. */
export function encodeWalletAuthNonceV1(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array) || bytes.length !== WALLET_AUTH_NONCE_BYTES) {
    fail("invalid_field", `nonce source must be exactly ${WALLET_AUTH_NONCE_BYTES} bytes`);
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += BASE64URL_ALPHABET[a >> 2];
    out += BASE64URL_ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) out += BASE64URL_ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) out += BASE64URL_ALPHABET[c & 63];
  }
  return out;
}

/** Build and sign a proof with an existing wallet ML-DSA-65 backend. */
export function createWalletAuthProofV1(
  challengeValue: unknown,
  backend: Pick<MlDsa65Backend, "publicKey" | "signPrehash">,
): WalletAuthProofV1 {
  const challenge = parseWalletAuthChallengeV1(challengeValue);
  const publicKey = backend.publicKey();
  const derivedAddress = addressToBech32(mlDsa65AddressBytes(publicKey));
  if (derivedAddress !== challenge.address) {
    fail("address_mismatch", "challenge address does not match the signing public key");
  }
  return parseWalletAuthProofV1({
    challenge,
    algorithm: WALLET_AUTH_ALGORITHM,
    publicKey: bytesToHex(publicKey),
    signature: bytesToHex(backend.signPrehash(walletAuthChallengeDigestV1(challenge))),
  });
}

/** Strictly validate and clone a proof-shaped object without verifying it. */
export function parseWalletAuthProofV1(value: unknown): WalletAuthProofV1 {
  if (!isRecord(value)) fail("invalid_object", "proof must be an object");
  assertExactKeys(value, PROOF_KEYS, "proof");
  const algorithm = expectString(value.algorithm, "algorithm", WALLET_AUTH_ALGORITHM.length);
  if (algorithm !== WALLET_AUTH_ALGORITHM) fail("invalid_field", "algorithm must be 'ml-dsa-65'");
  const publicKey = expectString(value.publicKey, "publicKey", 2 + ML_DSA_65_PUBLIC_KEY_LEN * 2);
  if (!LOWER_HEX_PUBLIC_KEY_RE.test(publicKey)) {
    fail("non_canonical", `publicKey must be lowercase 0x hex for exactly ${ML_DSA_65_PUBLIC_KEY_LEN} bytes`);
  }
  const signature = expectString(value.signature, "signature", 2 + ML_DSA_65_SIGNATURE_LEN * 2);
  if (!LOWER_HEX_SIGNATURE_RE.test(signature)) {
    fail("non_canonical", `signature must be lowercase 0x hex for exactly ${ML_DSA_65_SIGNATURE_LEN} bytes`);
  }
  return {
    challenge: parseWalletAuthChallengeV1(value.challenge),
    algorithm: WALLET_AUTH_ALGORITHM,
    publicKey,
    signature,
  };
}

/** Canonical no-whitespace proof JSON, including the nested canonical challenge. */
export function canonicalWalletAuthProofJsonV1(value: unknown): string {
  const proof = parseWalletAuthProofV1(value);
  return `{"challenge":${canonicalWalletAuthChallengeJsonV1(proof.challenge)},"algorithm":"${WALLET_AUTH_ALGORITHM}","publicKey":"${proof.publicKey}","signature":"${proof.signature}"}`;
}

export function encodeWalletAuthProofV1(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalWalletAuthProofJsonV1(value));
}

export function decodeWalletAuthProofV1(encoded: Uint8Array | string): WalletAuthProofV1 {
  if (
    (typeof encoded === "string" && encoded.length > WALLET_AUTH_MAX_PROOF_JSON_BYTES) ||
    (encoded instanceof Uint8Array && encoded.length > WALLET_AUTH_MAX_PROOF_JSON_BYTES)
  ) {
    fail("invalid_object", "proof JSON is too large");
  }
  let text: string;
  try {
    text = typeof encoded === "string" ? encoded : new TextDecoder("utf-8", { fatal: true }).decode(encoded);
  } catch {
    fail("invalid_object", "proof is not valid UTF-8 JSON");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail("invalid_object", "proof is not valid UTF-8 JSON");
  }
  const proof = parseWalletAuthProofV1(parsed);
  if (canonicalWalletAuthProofJsonV1(proof) !== text) {
    fail("non_canonical", "proof JSON is not in canonical field order/encoding");
  }
  return proof;
}

/**
 * Verify structure, key-derived address, ML-DSA-65 signature, and freshness.
 * Address binding is checked before signature verification as a cheap,
 * explicit confused-deputy guard.
 */
export function verifyWalletAuthProofV1(
  value: unknown,
  options: WalletAuthVerificationOptions = {},
): WalletAuthProofV1 {
  const proof = parseWalletAuthProofV1(value);
  const skew = options.clockSkewSeconds ?? 0;
  if (
    !Number.isFinite(skew) ||
    skew < 0 ||
    skew > WALLET_AUTH_MAX_CLOCK_SKEW_SECONDS ||
    !Number.isInteger(skew)
  ) {
    fail(
      "invalid_field",
      `clockSkewSeconds must be an integer from 0 to ${WALLET_AUTH_MAX_CLOCK_SKEW_SECONDS}`,
    );
  }
  const now = parseNow(options.now);
  const issued = Date.parse(proof.challenge.issuedAt);
  const expiration = Date.parse(proof.challenge.expirationTime);
  if (now + skew * 1_000 < issued) fail("not_yet_valid", "wallet authentication challenge is not yet valid");
  if (now - skew * 1_000 > expiration) fail("expired", "wallet authentication challenge has expired");

  const publicKey = hexToBytes(proof.publicKey, "publicKey");
  const derivedAddress = addressToBech32(mlDsa65AddressBytes(publicKey));
  if (derivedAddress !== proof.challenge.address) {
    fail("address_mismatch", "challenge address does not match proof publicKey");
  }
  const signature = hexToBytes(proof.signature, "signature");
  let signatureValid: boolean;
  try {
    signatureValid = ml_dsa65.verify(signature, walletAuthChallengeDigestV1(proof.challenge), publicKey);
  } catch {
    fail("invalid_public_key", "proof publicKey is not a valid ML-DSA-65 key");
  }
  if (!signatureValid) {
    fail("signature_invalid", "wallet authentication signature is invalid");
  }
  return proof;
}

/** Non-throwing convenience for trust boundaries that only need a verdict. */
export function isValidWalletAuthProofV1(
  value: unknown,
  options: WalletAuthVerificationOptions = {},
): boolean {
  try {
    verifyWalletAuthProofV1(value, options);
    return true;
  } catch {
    return false;
  }
}
