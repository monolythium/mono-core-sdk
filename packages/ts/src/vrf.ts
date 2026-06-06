/**
 * VRF precompile (`0x1101`) helpers.
 *
 * This precompile is selectorless: calldata is a 32-byte big-endian block
 * height followed by a caller-chosen domain tag. Successful return data is
 * exactly 32 bytes.
 */

import { PRECOMPILE_ADDRESSES } from "./consts.js";
import { bytesToHex, concatBytes, hexToBytes } from "./crypto/bytes.js";

export class VrfCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VrfCallError";
  }
}

export const VRF_OUTPUT_BYTES = 32 as const;
export const VRF_DOMAIN_TAG_MAX_BYTES = 256 as const;
export const VRF_HEIGHT_NOT_FINALIZED_REVERT = "vrf: height not finalized" as const;

export type VrfDomainTagInput = string | Uint8Array | readonly number[];

/** Return the VRF precompile address (`0x1101`) as lower-case hex. */
export function vrfAddressHex(): string {
  return PRECOMPILE_ADDRESSES.VRF.toLowerCase();
}

/**
 * Encode selectorless VRF calldata: `uint256 blockHeight || domainTag`.
 *
 * @param blockHeight finalized block height to read randomness from.
 * @param domainTag independent namespace for the consumer, up to 256 bytes.
 */
export function encodeVrfEvaluateCalldata(
  blockHeight: bigint | number | string,
  domainTag: VrfDomainTagInput = new Uint8Array(),
): string {
  const height = parseUint64(blockHeight, "blockHeight");
  const tag = normalizeDomainTag(domainTag);
  if (tag.length > VRF_DOMAIN_TAG_MAX_BYTES) {
    throw new VrfCallError(`domainTag exceeds ${VRF_DOMAIN_TAG_MAX_BYTES} bytes`);
  }
  return bytesToHex(concatBytes(uint256Word(height), tag));
}

/** Decode a successful VRF return payload into 32 bytes. */
export function decodeVrfOutput(output: string | Uint8Array | readonly number[]): Uint8Array {
  const bytes = toBytes(output, "output");
  if (bytes.length !== VRF_OUTPUT_BYTES) {
    throw new VrfCallError(`VRF output must be ${VRF_OUTPUT_BYTES} bytes, got ${bytes.length}`);
  }
  return bytes;
}

function normalizeDomainTag(value: VrfDomainTagInput): Uint8Array {
  if (typeof value === "string") {
    if (value.startsWith("0x") || value.startsWith("0X")) return hexToBytes(value, "domainTag");
    return new TextEncoder().encode(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function parseUint64(value: bigint | number | string, label: string): bigint {
  let parsed: bigint;
  if (typeof value === "bigint") {
    parsed = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new VrfCallError(`${label} must be a safe integer`);
    parsed = BigInt(value);
  } else if (value.startsWith("0x") || value.startsWith("0X")) {
    parsed = BigInt(value);
  } else {
    if (!/^[0-9]+$/.test(value)) throw new VrfCallError(`${label} must be a non-negative integer`);
    parsed = BigInt(value);
  }
  if (parsed < 0n || parsed > (1n << 64n) - 1n) {
    throw new VrfCallError(`${label} out of uint64 range`);
  }
  return parsed;
}

function uint256Word(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 31; i >= 0 && rest > 0n; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function toBytes(value: string | Uint8Array | readonly number[], label: string): Uint8Array {
  if (typeof value === "string") return hexToBytes(value, label);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
