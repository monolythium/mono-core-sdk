/**
 * Spending-policy precompile ABI helpers.
 *
 * These helpers build calldata and claim messages for the live
 * `mono-core` spending-policy precompile. Fresh sub-account claims
 * must use `setPolicyClaim` or `claimPolicyByAddress`; legacy
 * `setPolicy` is only for re-claims where the principal is already
 * recorded on-chain.
 */

import { addressBytesToHex, hexToAddressBytes, typedBech32ToAddress } from "./address.js";
import { PRECOMPILE_ADDRESSES } from "./consts.js";

export const SET_POLICY_CLAIM_DOMAIN_TAG = "lyth.spending-policy.claim.v1" as const;
export const ML_DSA_65_PUBLIC_KEY_LEN = 1952;
export const ML_DSA_65_SIGNATURE_LEN = 3309;

export const SPENDING_POLICY_SELECTORS = {
  setPolicy: "0xd6a518b2",
  setPolicyClaim: "0x08d78f9c",
  claimPolicyByAddress: "0xc2397fe9",
  enable: "0x5bfa1b68",
  disable: "0xe6c09edf",
  recordSpend: "0xdca04292",
} as const;

export interface SpendingPolicyArgs {
  /** Typed `mono` bech32m sub-account address. */
  subAccount: string;
  /** Typed `mono` bech32m principal address. */
  principal: string;
  dailyCapLythoshi: bigint | number | string;
  perTxCapLythoshi: bigint | number | string;
  allowRoot: string | Uint8Array | readonly number[];
  denyRoot: string | Uint8Array | readonly number[];
}

export class SpendingPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpendingPolicyError";
  }
}

export function spendingPolicyAddressHex(): string {
  return PRECOMPILE_ADDRESSES.SPENDING_POLICY.toLowerCase();
}

export function composeClaimBoundMessage(
  chainId: bigint | number | string,
  args: SpendingPolicyArgs,
  opts?: { precompileAddress?: string | Uint8Array | readonly number[]; expectedPolicyVersion?: bigint | number | string },
): Uint8Array {
  const precompileAddress = toRawAddressBytes(opts?.precompileAddress ?? PRECOMPILE_ADDRESSES.SPENDING_POLICY);
  const normalized = normalizeArgs(args);
  return concatBytes(
    new TextEncoder().encode(SET_POLICY_CLAIM_DOMAIN_TAG),
    uint64Bytes(chainId, "chainId"),
    precompileAddress,
    normalized.subAccount,
    normalized.principal,
    uint128Bytes(normalized.dailyCapLythoshi, "dailyCapLythoshi"),
    uint128Bytes(normalized.perTxCapLythoshi, "perTxCapLythoshi"),
    normalized.allowRoot,
    normalized.denyRoot,
    uint64Bytes(opts?.expectedPolicyVersion ?? 0n, "expectedPolicyVersion"),
  );
}

export function encodeSetPolicyCalldata(args: SpendingPolicyArgs): string {
  const normalized = normalizeArgs(args);
  return bytesToHex(
    concatBytes(
      hexToBytes(SPENDING_POLICY_SELECTORS.setPolicy),
      encodePolicyWords(normalized),
    ),
  );
}

export function encodeSetPolicyClaimCalldata(
  args: SpendingPolicyArgs,
  subAccountPubkey: Uint8Array | readonly number[] | string,
  subAccountSig: Uint8Array | readonly number[] | string,
): string {
  const normalized = normalizeArgs(args);
  const pubkey = toBytes(subAccountPubkey);
  const sig = toBytes(subAccountSig);
  if (pubkey.length !== ML_DSA_65_PUBLIC_KEY_LEN) {
    throw new SpendingPolicyError(
      `subAccountPubkey must be ${ML_DSA_65_PUBLIC_KEY_LEN} bytes, got ${pubkey.length}`,
    );
  }
  if (sig.length !== ML_DSA_65_SIGNATURE_LEN) {
    throw new SpendingPolicyError(
      `subAccountSig must be ${ML_DSA_65_SIGNATURE_LEN} bytes, got ${sig.length}`,
    );
  }
  return bytesToHex(
    concatBytes(
      hexToBytes(SPENDING_POLICY_SELECTORS.setPolicyClaim),
      encodePolicyWords(normalized),
      pubkey,
      sig,
    ),
  );
}

export function encodeClaimPolicyByAddressCalldata(
  args: SpendingPolicyArgs,
  subAccountSig: Uint8Array | readonly number[] | string,
): string {
  const normalized = normalizeArgs(args);
  const sig = toBytes(subAccountSig);
  if (sig.length !== ML_DSA_65_SIGNATURE_LEN) {
    throw new SpendingPolicyError(
      `subAccountSig must be ${ML_DSA_65_SIGNATURE_LEN} bytes, got ${sig.length}`,
    );
  }
  return bytesToHex(
    concatBytes(
      hexToBytes(SPENDING_POLICY_SELECTORS.claimPolicyByAddress),
      encodePolicyWords(normalized),
      sig,
    ),
  );
}

export function encodeEnableCalldata(subAccount: string): string {
  return encodeSingleAddressCall(SPENDING_POLICY_SELECTORS.enable, subAccount, "subAccount");
}

export function encodeDisableCalldata(subAccount: string): string {
  return encodeSingleAddressCall(SPENDING_POLICY_SELECTORS.disable, subAccount, "subAccount");
}

interface NormalizedSpendingPolicyArgs {
  subAccount: Uint8Array;
  principal: Uint8Array;
  dailyCapLythoshi: bigint;
  perTxCapLythoshi: bigint;
  allowRoot: Uint8Array;
  denyRoot: Uint8Array;
}

function normalizeArgs(args: SpendingPolicyArgs): NormalizedSpendingPolicyArgs {
  return {
    subAccount: toUserAddressBytes(args.subAccount, "subAccount"),
    principal: toUserAddressBytes(args.principal, "principal"),
    dailyCapLythoshi: toBigint(args.dailyCapLythoshi, "dailyCapLythoshi"),
    perTxCapLythoshi: toBigint(args.perTxCapLythoshi, "perTxCapLythoshi"),
    allowRoot: expectLength(toBytes(args.allowRoot), 32, "allowRoot"),
    denyRoot: expectLength(toBytes(args.denyRoot), 32, "denyRoot"),
  };
}

function encodePolicyWords(args: NormalizedSpendingPolicyArgs): Uint8Array {
  return concatBytes(
    encodeAddressWord(args.subAccount),
    encodeAddressWord(args.principal),
    encodeUint128Word(args.dailyCapLythoshi),
    encodeUint128Word(args.perTxCapLythoshi),
    args.allowRoot,
    args.denyRoot,
  );
}

function encodeSingleAddressCall(selector: string, address: string, name: string): string {
  return bytesToHex(concatBytes(hexToBytes(selector), encodeAddressWord(toUserAddressBytes(address, name))));
}

function encodeAddressWord(address: Uint8Array): Uint8Array {
  return concatBytes(new Uint8Array(12), address);
}

function encodeUint128Word(value: bigint): Uint8Array {
  return concatBytes(new Uint8Array(16), uint128Bytes(value, "uint128"));
}

function toUserAddressBytes(value: string, name: string): Uint8Array {
  if (typeof value !== "string") {
    throw new SpendingPolicyError(`${name} must be a typed mono bech32m address`);
  }
  if (value.startsWith("0x") || value.startsWith("0X")) {
    throw new SpendingPolicyError(`${name} raw 0x addresses are retired; use typed mono bech32m addresses`);
  }
  try {
    return typedBech32ToAddress(value, "user").bytes;
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new SpendingPolicyError(`${name} must be a typed mono bech32m address${detail}`);
  }
}

function toRawAddressBytes(value: string | Uint8Array | readonly number[]): Uint8Array {
  if (typeof value === "string") {
    return hexToAddressBytes(value);
  }
  return expectLength(value instanceof Uint8Array ? value : Uint8Array.from(value), 20, "address");
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
    throw new SpendingPolicyError("invalid hex bytes");
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

function expectLength(value: Uint8Array, len: number, name: string): Uint8Array {
  if (value.length !== len) {
    throw new SpendingPolicyError(`${name} must be ${len} bytes`);
  }
  return value;
}

function toBigint(value: bigint | number | string, name: string): bigint {
  const n = typeof value === "bigint" ? value : BigInt(value);
  if (n < 0n) {
    throw new SpendingPolicyError(`${name} must be non-negative`);
  }
  return n;
}

function uint64Bytes(value: bigint | number | string, name: string): Uint8Array {
  const n = toBigint(value, name);
  if (n > 0xffff_ffff_ffff_ffffn) {
    throw new SpendingPolicyError(`${name} exceeds uint64`);
  }
  return bigintBytes(n, 8);
}

function uint128Bytes(value: bigint, name: string): Uint8Array {
  if (value > 0xffff_ffff_ffff_ffff_ffff_ffff_ffff_ffffn) {
    throw new SpendingPolicyError(`${name} exceeds uint128`);
  }
  return bigintBytes(value, 16);
}

function bigintBytes(value: bigint, len: number): Uint8Array {
  const out = new Uint8Array(len);
  let n = value;
  for (let i = len - 1; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

export { addressBytesToHex };
