/**
 * Delegation precompile ABI helpers.
 *
 * The V4.1 redemption completion call prunes a matured redemption
 * queue ticket. It does not imply principal payout until mono-core adds
 * stake-vault/redemption-escrow accounting.
 */

import { PRECOMPILE_ADDRESSES } from "./consts.js";

export const DELEGATION_SELECTORS = {
  delegate: "0x662337de",
  undelegate: "0x914f3ca8",
  redelegate: "0xa06ac18f",
  claim: "0x4e71d92d",
  setAutoCompound: "0x86593454",
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

/** `delegate(uint32 cluster, uint16 weightBps)` — caller sends LYTH as msg.value
 *  to set their principal stake for `cluster`; `weightBps` is the fraction
 *  of voting power (max 10_000 = 100%). */
export function encodeDelegateCalldata(
  cluster: bigint | number | string,
  weightBps: bigint | number | string,
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(DELEGATION_SELECTORS.delegate),
      uint32Word(cluster, "cluster"),
      uint16Word(weightBps, "weightBps"),
    ),
  );
}

/** `undelegate(uint32 cluster)` — removes the caller's row + appends a
 *  redemption ticket. Principal becomes claimable through
 *  `completeRedemption(uint64 index)` once the ticket matures. */
export function encodeUndelegateCalldata(cluster: bigint | number | string): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(DELEGATION_SELECTORS.undelegate),
      uint32Word(cluster, "cluster"),
    ),
  );
}

/** `redelegate(uint32 fromCluster, uint32 toCluster, uint16 weightBps)`. */
export function encodeRedelegateCalldata(
  fromCluster: bigint | number | string,
  toCluster: bigint | number | string,
  weightBps: bigint | number | string,
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(DELEGATION_SELECTORS.redelegate),
      uint32Word(fromCluster, "fromCluster"),
      uint32Word(toCluster, "toCluster"),
      uint16Word(weightBps, "weightBps"),
    ),
  );
}

/** `claim()` — settle + withdraw the caller's pending delegation rewards. */
export function encodeClaimCalldata(): string {
  return DELEGATION_SELECTORS.claim;
}

/** `setAutoCompound(bool enabled)` — persists the caller's auto-compound
 *  preference. */
export function encodeSetAutoCompoundCalldata(enabled: boolean): string {
  const flag = new Uint8Array(32);
  flag[31] = enabled ? 1 : 0;
  return bytesToHex(
    concatBytes(hexToBytes(DELEGATION_SELECTORS.setAutoCompound), flag),
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

function uint32Word(value: bigint | number | string, name: string): Uint8Array {
  const n = toBigint(value, name);
  if (n < 0n || n > 0xffff_ffffn) {
    throw new DelegationPrecompileError(`${name} must fit uint32`);
  }
  const out = new Uint8Array(32);
  let rest = n;
  for (let i = 31; i >= 28; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function uint16Word(value: bigint | number | string, name: string): Uint8Array {
  const n = toBigint(value, name);
  if (n < 0n || n > 0xffffn) {
    throw new DelegationPrecompileError(`${name} must fit uint16`);
  }
  const out = new Uint8Array(32);
  let rest = n;
  for (let i = 31; i >= 30; i--) {
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
