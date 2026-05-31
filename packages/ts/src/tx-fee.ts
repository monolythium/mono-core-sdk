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
 *  1. The registry `register_op` BLS proof-of-possession pairing verify
 *     burns ~151k execution units; a 100k limit reverts. Registry /
 *     register writes therefore default to a higher limit.
 *  2. `priority_tip_lythoshi` is a PER-UNIT price, not a total tip. The
 *     legacy registry default of `1e10` dwarfed the live per-unit cap
 *     (~2000-6000 lythoshi) and made the chain reject every registry
 *     write. The resolver below derives the cap from the live
 *     `lyth_executionUnitPrice` quote and clamps the tip to it.
 */

import type { RpcClient } from "./client.js";
import { SdkError } from "./error.js";

/**
 * Default execution-unit limit for registry / register writes.
 *
 * The `register_op` BLS-PoP pairing verify uses ~151k execution units,
 * so the prior 100k default reverted. Pinned above the observed cost
 * with headroom. Mirrors the corrected
 * `REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT` in the Rust CLI.
 */
export const REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT = 250_000n;

/**
 * Default execution-unit limit for a bare native transfer.
 *
 * The 21000 intrinsic floor plus calldata + signature-byte units; a
 * round 100k covers an ML-DSA-65-signed transfer with margin.
 */
export const TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT = 100_000n;

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
 * so the `register_op` BLS-PoP pairing verify does not revert.
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
