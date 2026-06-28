/**
 * Transaction fee + execution-unit defaults and resolution helpers.
 *
 * These mirror the fee handling the Rust CLI / SDK uses for the
 * plaintext + registry write paths (`mono-core/crates/core/cli/src/commands/registry.rs`
 * and `crates/core/sdk/src/tx.rs`). The chain admits a transaction only
 * if
 *
 *   `max_execution_unit_price_lythoshi × execution_unit_limit <= free_balance`
 *
 * and the plaintext path additionally enforces `priority_tip <=
 * max_execution_unit_price` (a `FeeMismatch` revert otherwise). Two
 * footguns motivated these helpers:
 *
 *  1. Registry writes and encrypted ML-DSA-65 submissions have higher
 *     intrinsic execution-unit floors than the legacy 100k default.
 *     Registry / register writes therefore default to a higher limit.
 *  2. `priority_tip_lythoshi` is a PER-UNIT price, not a total tip. The
 *     legacy registry default of `1e10` dwarfed the live per-unit cap
 *     (~2000-6000 lythoshi) and made the chain reject every registry
 *     write. The resolver below derives the cap from the live
 *     `lyth_executionUnitPrice` quote and clamps the tip to it.
 */

import type { NativeReceiptFee, RpcClient } from "./client.js";
import { SdkError } from "./error.js";

/**
 * Default execution-unit limit for registry / register writes.
 *
 * Register and cluster-onboarding writes carry large PQ key/proof
 * payloads and pay the encrypted-submit intrinsic floor. Pinned above
 * observed public-preview costs with headroom.
 */
export const REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT = 1_000_000n;

/**
 * Default execution-unit limit for a bare native transfer.
 *
 * Public-preview encrypted ML-DSA-65 transfers currently have an
 * intrinsic floor a little above 305k execution units. A 500k default
 * keeps ordinary sealed transfers comfortably above that floor.
 */
export const TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT = 500_000n;

/**
 * Per-unit price floor used when the node quote is unexpectedly low or
 * zero (e.g. a fresh chain), so the declared cap never collapses to 0.
 * Mirrors `REGISTRY_MIN_EXECUTION_UNIT_PRICE_LYTHOSHI` in the Rust CLI.
 */
export const MIN_EXECUTION_UNIT_PRICE_LYTHOSHI = 2_000n;

/**
 * Safety multiplier applied to the live per-unit execution price when
 * declaring a write's `maxExecutionUnitPrice`. A small headroom over the
 * latest-block quote tolerates a fee bump between the quote and
 * inclusion without over-reserving the sender's balance. Mirrors
 * `REGISTRY_EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER` in the Rust CLI.
 */
export const EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER = 3n;

/**
 * Resolved per-unit fee parameters for a transaction, in the
 * `NativeEvmTxFields` shape (`maxFeePerGas` is the per-unit max price,
 * `maxPriorityFeePerGas` is the per-unit priority tip).
 *
 * Both values are PER-UNIT prices in lythoshi; the on-chain mempool
 * reserves `maxFeePerGas × gasLimit` against the sender's balance, and
 * the plaintext path requires `maxPriorityFeePerGas <= maxFeePerGas`.
 */
export interface ResolvedExecutionFee {
  /** Per-unit max execution price in lythoshi. */
  maxFeePerGas: bigint;
  /** Per-unit priority tip in lythoshi (always `<= maxFeePerGas`). */
  maxPriorityFeePerGas: bigint;
  /** Execution-unit limit. */
  gasLimit: bigint;
}

function asBigint(value: bigint | number | string, label: string): bigint {
  try {
    return typeof value === "bigint" ? value : BigInt(value);
  } catch {
    throw new Error(`${label} is not an integer: ${String(value)}`);
  }
}

/**
 * Clamp a priority tip so it never exceeds the per-unit max price.
 *
 * The plaintext submit path enforces `priority_tip <=
 * max_execution_unit_price` (a `FeeMismatch` revert otherwise), so any
 * caller-supplied tip is capped here rather than reverting on-chain.
 */
export function clampPriorityTip(
  priorityTipLythoshi: bigint | number | string,
  maxExecutionUnitPriceLythoshi: bigint | number | string,
): bigint {
  const tip = asBigint(priorityTipLythoshi, "priorityTipLythoshi");
  const cap = asBigint(maxExecutionUnitPriceLythoshi, "maxExecutionUnitPriceLythoshi");
  if (tip < 0n) throw new Error("priorityTipLythoshi must be non-negative");
  return tip > cap ? cap : tip;
}

/**
 * Resolve the per-unit `maxFeePerGas` cap from the live
 * `lyth_executionUnitPrice` quote: take the latest quote, apply the
 * safety multiplier as headroom, and clamp up to the price floor so the
 * declared cap never collapses to 0. Mirrors
 * `registry_max_execution_unit_price_lythoshi` in the Rust CLI.
 */
export async function resolveMaxExecutionUnitPrice(
  client: RpcClient,
  options: {
    minPriceLythoshi?: bigint;
    safetyMultiplier?: bigint;
  } = {},
): Promise<bigint> {
  const floor = options.minPriceLythoshi ?? MIN_EXECUTION_UNIT_PRICE_LYTHOSHI;
  const multiplier = options.safetyMultiplier ?? EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER;
  const quote = await client.lythExecutionUnitPrice();
  let unitPrice: bigint;
  try {
    unitPrice = BigInt(quote.executionUnitPriceLythoshi);
  } catch {
    throw SdkError.malformed(
      `lyth_executionUnitPrice returned a non-integer executionUnitPriceLythoshi: ${quote.executionUnitPriceLythoshi}`,
    );
  }
  const base = unitPrice > floor ? unitPrice : floor;
  return base * multiplier;
}

/**
 * Resolve sane per-unit fee parameters for a write from the live node
 * quote, with the priority tip clamped to the resolved cap.
 *
 * `priorityTipLythoshi` defaults to the resolved cap (the highest tip
 * the plaintext path accepts) when omitted, so registry / register
 * writes meet the public-testnet tip floor without a caller-supplied
 * flag. Pass an explicit value to bid lower.
 */
export async function resolveExecutionFee(
  client: RpcClient,
  options: {
    executionUnitLimit?: bigint;
    priorityTipLythoshi?: bigint | number | string;
    minPriceLythoshi?: bigint;
    safetyMultiplier?: bigint;
  } = {},
): Promise<ResolvedExecutionFee> {
  const maxFeePerGas = await resolveMaxExecutionUnitPrice(client, {
    minPriceLythoshi: options.minPriceLythoshi,
    safetyMultiplier: options.safetyMultiplier,
  });
  const tip =
    options.priorityTipLythoshi === undefined
      ? maxFeePerGas
      : clampPriorityTip(options.priorityTipLythoshi, maxFeePerGas);
  return {
    maxFeePerGas,
    maxPriorityFeePerGas: tip,
    gasLimit: options.executionUnitLimit ?? TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT,
  };
}

/**
 * Convenience wrapper for registry / register writes: the same fee
 * resolution as {@link resolveExecutionFee} but defaulting the
 * execution-unit limit to {@link REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT}
 * so the `register_op` ML-DSA-65 proof-of-possession verify does not revert.
 */
export async function resolveRegistryExecutionFee(
  client: RpcClient,
  options: {
    executionUnitLimit?: bigint;
    priorityTipLythoshi?: bigint | number | string;
    minPriceLythoshi?: bigint;
    safetyMultiplier?: bigint;
  } = {},
): Promise<ResolvedExecutionFee> {
  return resolveExecutionFee(client, {
    ...options,
    executionUnitLimit: options.executionUnitLimit ?? REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT,
  });
}

/**
 * Client-side fee exposure for a settled transaction, derived from the
 * structured `fee` block the node already returns on the tx-query
 * (`/api/v1/transactions/{hash}`) and tx-feed surfaces.
 *
 * The live `eth_getTransactionReceipt` carries only
 * `{gas_used, status, logs, ...}` — no fee fields — so wallets and
 * integrators historically had to reconstruct the charge themselves.
 * These fields surface that charge without any chain / RPC change:
 *
 *  - `feeLythoshi` is the total fee actually charged (`fee.total_lythoshi`).
 *    On-chain the fee is `(base_price + priority_tip) × execution_units`,
 *    split 50% burn / 30% operator / 20% treasury; this is the sender's
 *    full debit.
 *  - `effectiveGasPricePerUnit` is the per-execution-unit price actually
 *    paid, `base_price_per_cycle_lythoshi + priority_tip_lythoshi`. It is
 *    the Monolythium analogue of an EVM receipt's `effectiveGasPrice`.
 */
export interface TransactionFeeExposure {
  /** Total fee charged for the transaction, in lythoshi. */
  feeLythoshi: string;
  /**
   * Effective per-execution-unit price paid, in lythoshi
   * (`base_price_per_cycle_lythoshi + priority_tip_lythoshi`).
   */
  effectiveGasPricePerUnit: string;
}

function feeFieldToBigint(value: string, field: string): bigint {
  // `BigInt("")` and `BigInt("  ")` coerce to 0n rather than throwing, so
  // reject non-digit strings up front to surface a malformed node fee.
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    throw SdkError.malformed(`${field} is not an integer: ${String(value)}`);
  }
  try {
    return BigInt(value.trim());
  } catch {
    throw SdkError.malformed(`${field} is not an integer: ${String(value)}`);
  }
}

/**
 * Compute the client-side {@link TransactionFeeExposure} from a node
 * `NativeReceiptFee` block — purely arithmetic, no network access.
 *
 * `effectiveGasPricePerUnit` sums the base price per execution unit and
 * the priority tip per execution unit, matching the chain's
 * `(base_price + priority_tip) × execution_units` fee formula.
 */
export function transactionFeeExposure(fee: NativeReceiptFee): TransactionFeeExposure {
  const basePrice = feeFieldToBigint(
    fee.base_price_per_cycle_lythoshi,
    "fee.base_price_per_cycle_lythoshi",
  );
  const priorityTip = feeFieldToBigint(
    fee.priority_tip_lythoshi,
    "fee.priority_tip_lythoshi",
  );
  // Validate `total_lythoshi` is well-formed but surface it verbatim so the
  // exposed total exactly matches the node's charged value.
  feeFieldToBigint(fee.total_lythoshi, "fee.total_lythoshi");
  return {
    feeLythoshi: fee.total_lythoshi,
    effectiveGasPricePerUnit: (basePrice + priorityTip).toString(),
  };
}
