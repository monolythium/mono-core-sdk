/**
 * Delegation precompile ABI helpers (non-custodial ARK staking).
 *
 * Delegation is **balance-weighted** and **non-custodial**: a wallet never
 * escrows tokens. A delegation row records a `weightBps` fraction of the
 * caller's *live* balance; the wallet's contribution to a cluster is the
 * effective weight `floor(balance × weightBps / 10000)`, re-evaluated at each
 * settlement. Tokens stay fully liquid and spendable in the wallet.
 *
 * Because nothing is escrowed there is no redemption queue: `undelegate` is
 * instant. The legacy `completeRedemption` selector was removed from the chain
 * (calling it now reverts).
 */

import { PRECOMPILE_ADDRESSES } from "./consts.js";

export const DELEGATION_SELECTORS = {
  delegate: "0x662337de",
  undelegate: "0x914f3ca8",
  redelegate: "0xa06ac18f",
  claim: "0x4e71d92d",
  setAutoCompound: "0x86593454",
} as const;

export const DELEGATION_REVERT_TAGS = {
  /** `delegate(...)` carried native value — delegation is non-custodial and
   *  must be sent with `value = 0`. */
  unexpectedValue: "0x020e",
} as const;

/** Solidity-style signature of the `Claimed` event emitted by the delegation
 *  precompile when a wallet settles + withdraws its pending rewards. */
export const CLAIMED_EVENT_SIG = "Claimed(address,uint256,bool)" as const;

/** `topic0` for the {@link CLAIMED_EVENT_SIG} event — `keccak256` of the
 *  signature. Mirrors the chain emit site (delegation precompile events). */
export const CLAIMED_EVENT_TOPIC0 =
  "0xfa8256f7c08bb01a03ea96f8b3a904a4450311c9725d1c52cdbe21ed3dc42dcc" as const;

/** Decoded `Claimed(address indexed wallet, uint256 amount, bool autoCompound)`
 *  log. `delegator` is the wallet that claimed (the indexed topic). */
export interface ClaimedEvent {
  /** `0x`-prefixed 20-byte address of the wallet that claimed. */
  delegator: string;
  /** Amount of rewards settled + withdrawn, in base units. */
  amount: bigint;
  /** Whether the claim re-delegated (auto-compounded) the rewards. */
  autoCompound: boolean;
}

export class DelegationPrecompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DelegationPrecompileError";
  }
}

export function delegationAddressHex(): string {
  return PRECOMPILE_ADDRESSES.DELEGATION.toLowerCase();
}

/** `delegate(uint32 cluster, uint16 weightBps)` — records a balance-weighted,
 *  **non-custodial** delegation to `cluster`. `weightBps` is the fraction of
 *  the caller's *live* balance to contribute (max 10_000 = 100%); the
 *  effective weight is `floor(balance × weightBps / 10000)` and tracks the
 *  balance over time. No principal is escrowed — tokens stay liquid.
 *
 *  IMPORTANT: the delegate tx MUST be sent with `value = 0`. Any native value
 *  makes the chain revert with the `unexpectedValue` tag (`0x020e`). `value`
 *  is a transaction field, not calldata, so this encoder is unchanged. */
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

/** `undelegate(uint32 cluster)` — instantly removes the caller's delegation
 *  row for `cluster`. There is no redemption queue or cooldown; nothing was
 *  escrowed, so there is nothing to redeem. */
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

/** `true` when revert `data` is the `unexpectedValue` tag — i.e. a
 *  `delegate(...)` tx was (incorrectly) sent with native value. */
export function isUnexpectedValueRevert(data: string | Uint8Array | readonly number[]): boolean {
  return bytesToHex(toBytes(data)).toLowerCase() === DELEGATION_REVERT_TAGS.unexpectedValue;
}

/**
 * Decode a `Claimed` log into a typed {@link ClaimedEvent}.
 *
 * The log has **2 topics** (`topic0`, indexed `wallet`) and a 64-byte data
 * payload `(uint256 amount, bool autoCompound)`. Mirrors the
 * `decode*Event` pattern in the other precompile modules so wallets reading
 * the raw log (e.g. an optimistic pre-confirm claim row) do not hand-roll the
 * topic/data slicing.
 */
export function decodeClaimedEvent(
  topics: readonly (string | Uint8Array | readonly number[])[],
  data: string | Uint8Array | readonly number[],
): ClaimedEvent {
  if (topics.length !== 2) {
    throw new DelegationPrecompileError(`Claimed expects 2 topics, got ${topics.length}`);
  }
  const topic0 = toBytes(topics[0]);
  if (topic0.length !== 32) {
    throw new DelegationPrecompileError("Claimed topic0 must be 32 bytes");
  }
  if (bytesToHex(topic0).toLowerCase() !== CLAIMED_EVENT_TOPIC0) {
    throw new DelegationPrecompileError("unexpected topic0 for Claimed");
  }
  const walletWord = toBytes(topics[1]);
  if (walletWord.length !== 32) {
    throw new DelegationPrecompileError("Claimed wallet topic must be 32 bytes");
  }
  const body = toBytes(data);
  if (body.length < 64) {
    throw new DelegationPrecompileError("Claimed data shorter than amount + autoCompound words");
  }
  // Indexed address words are left-padded; the address is the trailing 20 bytes.
  const delegator = bytesToHex(walletWord.slice(12, 32));
  const amount = u256FromWord(body.slice(0, 32));
  const autoCompound = body.slice(32, 64).some((b) => b !== 0);
  return { delegator, amount, autoCompound };
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

function u256FromWord(word: Uint8Array): bigint {
  let out = 0n;
  for (const b of word) {
    out = (out << 8n) | BigInt(b);
  }
  return out;
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
