/**
 * Spending-policy precompile ABI helpers.
 *
 * These helpers build calldata and claim messages for the live
 * `mono-core` spending-policy precompile. Fresh sub-account claims
 * must use `setPolicyClaim` or `claimPolicyByAddress`; legacy
 * `setPolicy` is only for re-claims where the principal is already
 * recorded on-chain.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { addressBytesToHex, hexToAddressBytes, typedBech32ToAddress } from "./address.js";
import { PRECOMPILE_ADDRESSES } from "./consts.js";

export const SET_POLICY_CLAIM_DOMAIN_TAG = "lyth.spending-policy.claim.v1" as const;
export const ML_DSA_65_PUBLIC_KEY_LEN = 1952;
export const ML_DSA_65_SIGNATURE_LEN = 3309;

export const SPENDING_POLICY_SELECTORS = {
  // WP §18.8 widened the setPolicy* sighash strings to 11 words, so their
  // selectors changed; enable/disable/recordSpend are unchanged.
  setPolicy: "0x8da1a765",
  setPolicyClaim: "0x35531f6c",
  claimPolicyByAddress: "0x0c21376c",
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
  /**
   * WP §18.8 per-week rolling cap in lythoshi (wire code `0x07`).
   * Omit or `0` for "no weekly cap".
   */
  weeklyCapLythoshi?: bigint | number | string;
  /**
   * WP §18.8 per-month rolling cap in lythoshi (wire code `0x08`).
   * Omit or `0` for "no monthly cap".
   */
  monthlyCapLythoshi?: bigint | number | string;
  /**
   * WP §18.8 per-category allow-list Merkle root (wire code `0x09`).
   * Omit or the zero hash for "no category constraint".
   */
  categoryAllowRoot?: string | Uint8Array | readonly number[];
  /**
   * WP §18.8 packed time-of-day window (wire code `0x0A`), a 32-byte
   * `uint256` word. Build it with {@link packTimeWindow}; omit or the
   * zero word for "no time-of-day window".
   */
  timeWindow?: string | Uint8Array | readonly number[];
  /**
   * WP §18.8 explicit policy-expiry timestamp in unix seconds (wire
   * code `0x0B`), encoded as a `uint256`. Omit or `0` for "never
   * auto-expires".
   */
  policyExpiry?: bigint | number | string;
}

/**
 * Decoded `lyth_getSpendingPolicy` time-of-day window. `enabled` is
 * always `true` when present (the chain omits the object as `null` when
 * no window is configured). `[startHour, endHour]` are `0..=23`,
 * inclusive, and may wrap past midnight.
 */
export interface SpendingPolicyTimeWindow {
  /** Always `true` when the window object is present. */
  enabled: boolean;
  /** Window start hour (`0..=23`). */
  startHour: number;
  /** Window end hour (`0..=23`). */
  endHour: number;
}

/**
 * `lyth_getSpendingPolicy` response — the §18.8 spending-policy view for
 * a sub-account, read directly from the spending-policy precompile slots
 * (`0x110C`).
 *
 * Mirrors the chain JSON exactly (camelCase keys). Caps are `0x`-hex
 * `uint256` strings; roots are `0x`-hex 32-byte words. `timeOfDayWindow`
 * is `null` when no window is configured; `expiryUnixSeconds` is `null`
 * when the policy never auto-expires. Note: the chain surfaces the policy
 * keyed by the controlled sub-account (`address`); the managing principal
 * is NOT part of this read shape.
 */
export interface SpendingPolicyView {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** Data source — `"native_state_storage"`. */
  source: string;
  /** Spending-policy precompile address (`0x110C`). */
  precompile: string;
  /** Sub-account the policy controls (`mono` bech32m). */
  address: string;
  /** `true` when a policy is written for this sub-account. */
  exists: boolean;
  /** `true` when the policy exists and is not disabled. */
  enabled: boolean;
  /** Monotonic policy version; `0` means no policy is written. */
  version: number;
  /** Per-transaction cap (`0x`-hex `uint256`); `0x0` = no cap. */
  perTxCap: string;
  /** Daily spend cap (`0x`-hex `uint256`); `0x0` = no cap. */
  dailyCap: string;
  /** §18.8 per-week cap (`0x`-hex `uint256`); `0x0` = no weekly cap. */
  weeklyCap: string;
  /** §18.8 per-month cap (`0x`-hex `uint256`); `0x0` = no monthly cap. */
  monthlyCap: string;
  /** §18.8 category allow-list root (`0x` 32 bytes). */
  categoryAllowRoot: string;
  /** Destination allow-list Merkle root (`0x` 32 bytes). */
  destinationAllowRoot: string;
  /** Destination deny-list Merkle root (`0x` 32 bytes). */
  destinationDenyRoot: string;
  /** §18.8 decoded time-of-day window, or `null` if unset. */
  timeOfDayWindow: SpendingPolicyTimeWindow | null;
  /** §18.8 policy-expiry unix seconds; `null` = never expires. */
  expiryUnixSeconds: number | null;
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

/**
 * The "no constraint configured" sentinel root (`Hash::ZERO`, 32 zero
 * bytes). Feed this as `allowRoot` / `denyRoot` / `categoryAllowRoot` to
 * mean "allow any" for that dimension.
 */
export const EMPTY_ROOT: Uint8Array = new Uint8Array(32);

/**
 * Build the destination allow/deny Merkle root for a SINGLE permitted (or
 * banned) counterparty.
 *
 * The chain's v1 spending-policy verifier
 * (`spending-policy/src/storage.rs` `destination_matches_root`) does a
 * flat equality check — `keccak256(dest_addr_20_bytes) == root` — so a
 * "root" is simply the keccak256 of the 20 raw address bytes, with NO
 * domain prefix and NO length prefix. There is currently NO multi-entry
 * Merkle path on-chain (see {@link setDestinationRoot}); a multi-leaf
 * root would be rejected for every member.
 *
 * @param address typed `mono` bech32m user address.
 * @returns the 32-byte root, ready for `SpendingPolicyArgs.allowRoot` / `.denyRoot`.
 */
export function destinationRoot(address: string): Uint8Array {
  const bytes = toUserAddressBytes(address, "address");
  return keccak_256(bytes);
}

/** Alias of {@link destinationRoot} — the byte construction is identical for allow and deny. */
export const allowRootFor = destinationRoot;
/** Alias of {@link destinationRoot} — the byte construction is identical for allow and deny. */
export const denyRootFor = destinationRoot;

/**
 * Build the category allow root for a SINGLE permitted transaction
 * category.
 *
 * The chain's v1 verifier
 * (`spending-policy/src/storage.rs` `category_matches_root`) checks
 * `keccak256(category_id) == root`, where `category_id` is the 4-byte
 * ABI selector the runtime extracts from the tx (`input[0..4]`).
 *
 * Accepts either the raw 4-byte selector (`Uint8Array` / number[] of
 * length 4) or a canonical function signature string (e.g.
 * `"transfer(address,uint256)"`), in which case the selector is derived
 * as `keccak256(utf8(sig))[0..4]` first. The returned root is
 * `keccak256(selector)` either way.
 */
export function categoryRoot(selectorOrSig: Uint8Array | readonly number[] | string): Uint8Array {
  let selector: Uint8Array;
  if (typeof selectorOrSig === "string") {
    selector = keccak_256(new TextEncoder().encode(selectorOrSig)).slice(0, 4);
  } else {
    selector = selectorOrSig instanceof Uint8Array ? selectorOrSig : Uint8Array.from(selectorOrSig);
    if (selector.length !== 4) {
      throw new SpendingPolicyError("category selector must be exactly 4 bytes");
    }
  }
  return keccak_256(selector);
}

/**
 * Build a destination allow/deny root from a list of counterparties.
 *
 * The chain's v1 verifier supports exactly ONE entry per root (a flat
 * `keccak256(member) == root` check). Multi-entry sets require the chain
 * v1.5 inline-list / Merkle-membership work that is NOT yet shipped, so
 * this helper throws on more than one entry rather than emit a root the
 * chain would silently reject for every member.
 *
 * @returns {@link EMPTY_ROOT} for an empty list, else
 *   {@link destinationRoot} of the single entry.
 */
export function setDestinationRoot(entries: readonly string[]): Uint8Array {
  if (entries.length === 0) return EMPTY_ROOT;
  if (entries.length > 1) {
    throw new SpendingPolicyError(
      "multi-entry destination sets are not supported by the chain yet (v1 allows a single counterparty per root); pass exactly one address",
    );
  }
  return destinationRoot(entries[0]);
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
    // WP §18.8 dimensions, in wire order: weekly cap (be16), monthly cap
    // (be16), category allow-root (32), packed time window (32),
    // policy expiry (be8). These slot in before the expected-version word.
    uint128Bytes(normalized.weeklyCapLythoshi, "weeklyCapLythoshi"),
    uint128Bytes(normalized.monthlyCapLythoshi, "monthlyCapLythoshi"),
    normalized.categoryAllowRoot,
    normalized.timeWindow,
    uint64Bytes(normalized.policyExpiry, "policyExpiry"),
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
  weeklyCapLythoshi: bigint;
  monthlyCapLythoshi: bigint;
  categoryAllowRoot: Uint8Array;
  timeWindow: Uint8Array;
  policyExpiry: bigint;
}

const ZERO_WORD = new Uint8Array(32);

function normalizeArgs(args: SpendingPolicyArgs): NormalizedSpendingPolicyArgs {
  return {
    subAccount: toUserAddressBytes(args.subAccount, "subAccount"),
    principal: toUserAddressBytes(args.principal, "principal"),
    dailyCapLythoshi: toBigint(args.dailyCapLythoshi, "dailyCapLythoshi"),
    perTxCapLythoshi: toBigint(args.perTxCapLythoshi, "perTxCapLythoshi"),
    allowRoot: expectLength(toBytes(args.allowRoot), 32, "allowRoot"),
    denyRoot: expectLength(toBytes(args.denyRoot), 32, "denyRoot"),
    weeklyCapLythoshi: toBigint(args.weeklyCapLythoshi ?? 0n, "weeklyCapLythoshi"),
    monthlyCapLythoshi: toBigint(args.monthlyCapLythoshi ?? 0n, "monthlyCapLythoshi"),
    categoryAllowRoot:
      args.categoryAllowRoot == null
        ? ZERO_WORD
        : expectLength(toBytes(args.categoryAllowRoot), 32, "categoryAllowRoot"),
    timeWindow:
      args.timeWindow == null
        ? ZERO_WORD
        : expectLength(toBytes(args.timeWindow), 32, "timeWindow"),
    policyExpiry: toBigint(args.policyExpiry ?? 0n, "policyExpiry"),
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
    // WP §18.8 trailing 5 words: weekly cap, monthly cap, category
    // allow-root, packed time window, policy expiry.
    encodeUint128Word(args.weeklyCapLythoshi),
    encodeUint128Word(args.monthlyCapLythoshi),
    args.categoryAllowRoot,
    args.timeWindow,
    encodeUint64Word(args.policyExpiry),
  );
}

/**
 * Pack a time-of-day window into the 32-byte `timeWindow` word used by
 * the WP §18.8 spending-policy dimensions.
 *
 * Mirrors `spending-policy::storage::pack_time_window`: hours clamp to
 * `0..=23`; when `enabled` is `false` the word is all-zero (the "no
 * window configured" sentinel). Layout (low 3 bytes of the big-endian
 * word): byte 29 = enabled sentinel (`0x01`), byte 30 = `startHour`,
 * byte 31 = `endHour`.
 */
export function packTimeWindow(enabled: boolean, startHour: number, endHour: number): Uint8Array {
  const out = new Uint8Array(32);
  if (!enabled) return out;
  out[29] = 0x01;
  out[30] = clampHour(startHour);
  out[31] = clampHour(endHour);
  return out;
}

/**
 * Decode a packed `timeWindow` word into `[startHour, endHour]`, or
 * `null` when no window is configured. Inverse of {@link packTimeWindow}.
 */
export function decodeTimeWindow(word: string | Uint8Array | readonly number[]): [number, number] | null {
  const bytes = expectLength(toBytes(word), 32, "timeWindow");
  if (bytes.every((b) => b === 0)) return null;
  if (bytes[29] === 0) return null;
  return [Math.min(bytes[30], 23), Math.min(bytes[31], 23)];
}

function clampHour(hour: number): number {
  if (!Number.isInteger(hour) || hour < 0) {
    throw new SpendingPolicyError("time-window hour must be a non-negative integer");
  }
  return Math.min(hour, 23);
}

function encodeUint64Word(value: bigint): Uint8Array {
  return concatBytes(new Uint8Array(24), uint64Bytes(value, "policyExpiry"));
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
