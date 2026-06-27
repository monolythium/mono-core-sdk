/**
 * L6 open-seat marketplace transaction builders.
 *
 * The low-level ABI encoders live in `node-registry.ts`. This module
 * wraps them into wallet-facing `NativeEvmTxFields` builders, mirroring
 * the CJ-1 `cluster-join.ts` shape: a cluster advertises a vacancy
 * (`advertiseSeat`), operators submit escrowed applications
 * (`applyForSeat`, payable), active members vote (`voteSeatAdmit`), and
 * an applicant or advertiser can back out (`withdrawSeatApplication` /
 * `closeSeat`). Admission still terminates in the pre-existing 7-of-10
 * signed-consent path — these builders add discovery + intent, no new
 * consensus surface.
 *
 * The `applyForSeat` builder defaults the native value to the refundable
 * application escrow ({@link NODE_REGISTRY_SEAT_APPLICATION_ESCROW_LYTHOSHI},
 * 100 LYTH). The 5,000 LYTH self-bond is NOT posted here — it is bound
 * only when the seat is filled on admit.
 */

import type { ExecutionUnitPriceResponse } from "./client.js";
import { parseBigint } from "./crypto/bytes.js";
import type { NativeEvmTxFields } from "./crypto/tx.js";
import {
  NODE_REGISTRY_SEAT_APPLICATION_ESCROW_LYTHOSHI,
  type AdvertiseSeatCalldataArgs,
  type ApplyForSeatCalldataArgs,
  type CloseSeatCalldataArgs,
  type SeatKind,
  type VoteSeatAdmitCalldataArgs,
  type WithdrawSeatApplicationCalldataArgs,
  encodeAdvertiseSeatCalldata,
  encodeApplyForSeatCalldata,
  encodeCloseSeatCalldata,
  encodeVoteSeatAdmitCalldata,
  encodeWithdrawSeatApplicationCalldata,
  nodeRegistryAddressHex,
} from "./node-registry.js";
import {
  EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER,
  MIN_EXECUTION_UNIT_PRICE_LYTHOSHI,
  REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT,
  clampPriorityTip,
} from "./tx-fee.js";

/** Default execution-unit limit for an open-seat marketplace transaction. */
export const DEFAULT_SEAT_EXECUTION_UNIT_LIMIT = REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT;

export interface SeatTxFee {
  maxFeePerGas: bigint | number | string;
  maxPriorityFeePerGas: bigint | number | string;
  gasLimit?: bigint | number | string;
}

export interface SeatFeeOptions {
  executionUnitLimit?: bigint | number | string;
  priorityTipLythoshi?: bigint | number | string;
  minPriceLythoshi?: bigint | number | string;
  safetyMultiplier?: bigint | number | string;
}

export interface BuildAdvertiseSeatTxFieldsArgs extends AdvertiseSeatCalldataArgs {
  chainId: bigint | number | string;
  nonce: bigint | number | string;
  fee: SeatTxFee;
}

export interface BuildApplyForSeatTxFieldsArgs extends ApplyForSeatCalldataArgs {
  chainId: bigint | number | string;
  nonce: bigint | number | string;
  fee: SeatTxFee;
  /**
   * Native escrow to attach, in lythoshi. Defaults to
   * {@link NODE_REGISTRY_SEAT_APPLICATION_ESCROW_LYTHOSHI} (100 LYTH,
   * refundable). The 5,000 LYTH self-bond is bound at admit, not here.
   */
  escrowLythoshi?: bigint | number | string;
}

export interface BuildVoteSeatAdmitTxFieldsArgs extends VoteSeatAdmitCalldataArgs {
  chainId: bigint | number | string;
  nonce: bigint | number | string;
  fee: SeatTxFee;
}

export interface BuildWithdrawSeatApplicationTxFieldsArgs
  extends WithdrawSeatApplicationCalldataArgs {
  chainId: bigint | number | string;
  nonce: bigint | number | string;
  fee: SeatTxFee;
}

export interface BuildCloseSeatTxFieldsArgs extends CloseSeatCalldataArgs {
  chainId: bigint | number | string;
  nonce: bigint | number | string;
  fee: SeatTxFee;
}

/**
 * Resolve the execution-unit fee for an open-seat transaction from a live
 * `lyth_executionUnitPrice` quote. Mirrors
 * `resolveClusterJoinExecutionFee`: clamp the quote to the protocol
 * floor, apply the safety multiplier, and clamp the priority tip to the
 * resulting max fee.
 */
export function resolveSeatExecutionFee(
  quote: ExecutionUnitPriceResponse,
  options: SeatFeeOptions = {},
): SeatTxFee {
  const quoted = parseBigint(quote.executionUnitPriceLythoshi, "executionUnitPriceLythoshi");
  const floor = options.minPriceLythoshi === undefined
    ? MIN_EXECUTION_UNIT_PRICE_LYTHOSHI
    : parseBigint(options.minPriceLythoshi, "minPriceLythoshi");
  const multiplier = options.safetyMultiplier === undefined
    ? EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER
    : parseBigint(options.safetyMultiplier, "safetyMultiplier");
  if (multiplier <= 0n) throw new Error("safetyMultiplier must be greater than zero");
  const base = quoted > floor ? quoted : floor;
  const maxFeePerGas = base * multiplier;
  const tip = options.priorityTipLythoshi === undefined
    ? maxFeePerGas
    : clampPriorityTip(options.priorityTipLythoshi, maxFeePerGas);
  return {
    maxFeePerGas,
    maxPriorityFeePerGas: tip,
    gasLimit: options.executionUnitLimit ?? DEFAULT_SEAT_EXECUTION_UNIT_LIMIT,
  };
}

/** Build `advertiseSeat` transaction fields (active member; non-payable). */
export function buildAdvertiseSeatTxFields(
  args: BuildAdvertiseSeatTxFieldsArgs,
): NativeEvmTxFields {
  return {
    ...seatTxEnvelope(args.chainId, args.nonce, args.fee),
    value: 0n,
    input: encodeAdvertiseSeatCalldata(args),
  };
}

/**
 * Build `applyForSeat` transaction fields (operator; payable). The native
 * `value` carries the refundable application escrow — defaulting to
 * {@link NODE_REGISTRY_SEAT_APPLICATION_ESCROW_LYTHOSHI} unless an
 * explicit `escrowLythoshi` is supplied.
 */
export function buildApplyForSeatTxFields(
  args: BuildApplyForSeatTxFieldsArgs,
): NativeEvmTxFields {
  const escrow = args.escrowLythoshi === undefined
    ? NODE_REGISTRY_SEAT_APPLICATION_ESCROW_LYTHOSHI
    : parseU256(args.escrowLythoshi, "escrowLythoshi");
  return {
    ...seatTxEnvelope(args.chainId, args.nonce, args.fee),
    value: escrow,
    input: encodeApplyForSeatCalldata(args),
  };
}

/** Build `voteSeatAdmit` transaction fields (active member; non-payable). */
export function buildVoteSeatAdmitTxFields(
  args: BuildVoteSeatAdmitTxFieldsArgs,
): NativeEvmTxFields {
  return {
    ...seatTxEnvelope(args.chainId, args.nonce, args.fee),
    value: 0n,
    input: encodeVoteSeatAdmitCalldata(args),
  };
}

/** Build `withdrawSeatApplication` transaction fields (applicant; non-payable). */
export function buildWithdrawSeatApplicationTxFields(
  args: BuildWithdrawSeatApplicationTxFieldsArgs,
): NativeEvmTxFields {
  return {
    ...seatTxEnvelope(args.chainId, args.nonce, args.fee),
    value: 0n,
    input: encodeWithdrawSeatApplicationCalldata(args),
  };
}

/** Build `closeSeat` transaction fields (advertiser; non-payable). */
export function buildCloseSeatTxFields(args: BuildCloseSeatTxFieldsArgs): NativeEvmTxFields {
  return {
    ...seatTxEnvelope(args.chainId, args.nonce, args.fee),
    value: 0n,
    input: encodeCloseSeatCalldata(args),
  };
}

/** Seat kinds the marketplace currently advertises (active is admittable; standby is advertise-only). */
export const SEAT_KINDS: readonly SeatKind[] = ["active", "standby"];

function seatTxEnvelope(
  chainId: bigint | number | string,
  nonce: bigint | number | string,
  fee: SeatTxFee,
): Omit<NativeEvmTxFields, "value" | "input"> {
  return {
    chainId,
    nonce,
    maxFeePerGas: parseBigint(fee.maxFeePerGas, "maxFeePerGas"),
    maxPriorityFeePerGas: parseBigint(fee.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
    gasLimit: parseBigint(fee.gasLimit ?? DEFAULT_SEAT_EXECUTION_UNIT_LIMIT, "gasLimit"),
    to: nodeRegistryAddressHex(),
  };
}

function parseU256(value: bigint | number | string, label: string): bigint {
  const parsed = parseBigint(value, label);
  if (parsed < 0n || parsed >= 1n << 256n) {
    throw new Error(`${label} out of 256-bit range`);
  }
  return parsed;
}
