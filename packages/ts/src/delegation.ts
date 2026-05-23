/**
 * Delegation precompile ABI helpers.
 *
 * The V4.1 redemption completion call prunes a matured redemption
 * queue ticket. It does not imply principal payout until mono-core adds
 * stake-vault/redemption-escrow accounting.
 */

import { PRECOMPILE_ADDRESSES } from "./consts.js";

export const DELEGATION_SELECTORS = {
  completeRedemption: "0x26169d0a",
} as const;

export const DELEGATION_REVERT_TAGS = {
  redemptionQueueFull: "0x020e",
  redemptionTicketNotFound: "0x020f",
  redemptionNotMature: "0x0210",
  redemptionPrincipalUnavailable: "0x0211",
} as const;

export class DelegationPrecompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DelegationPrecompileError";
  }
}

export function delegationAddressHex(): string {
  return PRECOMPILE_ADDRESSES.DELEGATION.toLowerCase();
}

export function encodeCompleteRedemptionCalldata(index: bigint | number | string): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(DELEGATION_SELECTORS.completeRedemption),
      uint64Word(index, "index"),
    ),
  );
}

export function isRedemptionPrincipalUnavailableRevert(data: string | Uint8Array | readonly number[]): boolean {
  return bytesToHex(toBytes(data)).toLowerCase() === DELEGATION_REVERT_TAGS.redemptionPrincipalUnavailable;
}

function uint64Word(value: bigint | number | string, name: string): Uint8Array {
  const n = toBigint(value, name);
  if (n < 0n || n > 0xffff_ffff_ffff_ffffn) {
    throw new DelegationPrecompileError(`${name} must fit uint64`);
  }
  const out = new Uint8Array(32);
  let rest = n;
  for (let i = 31; i >= 24; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function toBigint(value: bigint | number | string, name: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
      throw new DelegationPrecompileError(`${name} must be a safe integer`);
    }
    return BigInt(value);
  }
  if (!/^(0x[0-9a-fA-F]+|[0-9]+)$/.test(value)) {
    throw new DelegationPrecompileError(`${name} must be an integer string`);
  }
  return BigInt(value);
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
    throw new DelegationPrecompileError("invalid hex bytes");
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
