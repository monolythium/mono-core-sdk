/**
 * Pubkey-registry precompile ABI helpers.
 *
 * The pubkey-registry at `0x110D` lets an account publish its primary
 * ML-DSA-65 public key once, so later contract-context verification can
 * look the key up by address.
 */

import { typedBech32ToAddress } from "./address.js";
import { PRECOMPILE_ADDRESSES } from "./consts.js";

export const PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN = 1952;

export const PUBKEY_REGISTRY_SELECTORS = {
  registerPubkey: "0x5fe984e7",
  lookupPubkey: "0x87c42001",
  hasPubkey: "0x01c0d167",
} as const;

export interface PubkeyLookup {
  pubkey: Uint8Array;
  setBlock: bigint;
}

export class PubkeyRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PubkeyRegistryError";
  }
}

export function pubkeyRegistryAddressHex(): string {
  return PRECOMPILE_ADDRESSES.PUBKEY_REGISTRY.toLowerCase();
}

export function encodeRegisterPubkeyCalldata(pubkey: Uint8Array | readonly number[] | string): string {
  const bytes = toBytes(pubkey);
  if (bytes.length !== PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN) {
    throw new PubkeyRegistryError(
      `pubkey must be ${PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN} bytes, got ${bytes.length}`,
    );
  }
  return bytesToHex(
    concatBytes(
      hexToBytes(PUBKEY_REGISTRY_SELECTORS.registerPubkey),
      uint256Word(32n),
      uint256Word(BigInt(bytes.length)),
      bytes,
    ),
  );
}

export function encodeLookupPubkeyCalldata(address: string): string {
  return encodeSingleAddressCall(PUBKEY_REGISTRY_SELECTORS.lookupPubkey, address);
}

export function encodeHasPubkeyCalldata(address: string): string {
  return encodeSingleAddressCall(PUBKEY_REGISTRY_SELECTORS.hasPubkey, address);
}

export function decodeLookupPubkeyReturn(data: Uint8Array | readonly number[] | string): PubkeyLookup {
  const bytes = toBytes(data);
  if (bytes.length < 96) {
    throw new PubkeyRegistryError("lookup return must be at least 96 bytes");
  }
  const offset = wordToBigint(bytes.slice(0, 32));
  if (offset !== 64n) {
    throw new PubkeyRegistryError("lookup pubkey offset must be 0x40");
  }
  const setBlock = wordToBigint(bytes.slice(32, 64));
  const len = wordToBigint(bytes.slice(Number(offset), Number(offset) + 32));
  if (len > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new PubkeyRegistryError("pubkey length exceeds safe integer range");
  }
  const bodyLen = Number(len);
  const bodyStart = Number(offset) + 32;
  const padded = Math.ceil(bodyLen / 32) * 32;
  if (bytes.length < bodyStart + padded) {
    throw new PubkeyRegistryError("lookup return bytes body is truncated");
  }
  return {
    pubkey: bytes.slice(bodyStart, bodyStart + bodyLen),
    setBlock,
  };
}

export function decodeHasPubkeyReturn(data: Uint8Array | readonly number[] | string): boolean {
  const bytes = toBytes(data);
  if (bytes.length !== 32) {
    throw new PubkeyRegistryError("hasPubkey return must be 32 bytes");
  }
  for (let i = 0; i < 31; i++) {
    if (bytes[i] !== 0) {
      throw new PubkeyRegistryError("hasPubkey bool high bytes must be zero");
    }
  }
  if (bytes[31] === 0) return false;
  if (bytes[31] === 1) return true;
  throw new PubkeyRegistryError("hasPubkey bool must be 0 or 1");
}

function encodeSingleAddressCall(selector: string, address: string): string {
  return bytesToHex(concatBytes(hexToBytes(selector), addressWord(toAddressBytes(address))));
}

function addressWord(address: Uint8Array): Uint8Array {
  return concatBytes(new Uint8Array(12), address);
}

function toAddressBytes(value: string): Uint8Array {
  if (typeof value !== "string") {
    throw new PubkeyRegistryError("address must be a typed mono bech32m address");
  }
  if (value.startsWith("0x") || value.startsWith("0X")) {
    throw new PubkeyRegistryError("raw 0x addresses are retired; use typed mono bech32m addresses");
  }
  try {
    return typedBech32ToAddress(value, "user").bytes;
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new PubkeyRegistryError(`address must be a typed mono bech32m address${detail}`);
  }
}

function toBytes(value: string | Uint8Array | readonly number[]): Uint8Array {
  if (typeof value === "string") {
    return hexToBytes(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function hexToBytes(hex: string): Uint8Array {
  const body = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (body.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw new PubkeyRegistryError("invalid hex bytes");
  }
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function uint256Word(value: bigint): Uint8Array {
  if (value < 0n || value > (1n << 256n) - 1n) {
    throw new PubkeyRegistryError("uint256 value out of range");
  }
  const out = new Uint8Array(32);
  let n = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

function wordToBigint(word: Uint8Array): bigint {
  if (word.length !== 32) {
    throw new PubkeyRegistryError("ABI word must be 32 bytes");
  }
  let out = 0n;
  for (const b of word) {
    out = (out << 8n) | BigInt(b);
  }
  return out;
}
