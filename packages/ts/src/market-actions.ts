/**
 * Native market transaction-plan builders.
 *
 * These helpers only build signer-ready transaction requests. They do
 * not predict order ids, fills, trades, or execution success.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { PRECOMPILE_ADDRESSES } from "./consts.js";
import { bytesToHex, concatBytes, hexToBytes } from "./crypto/bytes.js";
import { MempoolClass } from "./crypto/envelope.js";

export const CLOB_MARKET_ID_DOMAIN_TAG = 0xc1 as const;

export const CLOB_SELECTORS = {
  /**
   * `placeLimitOrder(bytes32,bytes32,uint8,uint256,uint256,uint64)`
   *
   * Args: `baseTokenId, quoteTokenId, side, price, amount, expiresAtBlock`.
   */
  placeLimitOrder: "0x2468786f",
  /**
   * `placeMarketOrder(bytes32,bytes32,uint8,uint256,uint16)`
   *
   * Args: `baseTokenId, quoteTokenId, side, quantity, maxSlippageBps`.
   */
  placeMarketOrder: "0xb9b1fa86",
  /**
   * `placeMarketOrderEx(bytes32,bytes32,uint8,uint256,uint16,uint8)`
   *
   * Args: `baseTokenId, quoteTokenId, side, quantity, maxSlippageBps, mode`.
   */
  placeMarketOrderEx: "0xa6f092f0",
  /** `cancelOrder(bytes32)` */
  cancelOrder: "0x7489ec23",
} as const;

export type SpotLimitOrderSide = "buy" | "sell";
export type SpotMarketOrderMode = "fill-or-refund" | "fill-or-rest-at-cap";

export interface PlaceSpotLimitOrderArgs {
  /**
   * Canonical 32-byte CLOB market id, derived as
   * `keccak256(0xC1 || baseTokenId || quoteTokenId)`.
   */
  marketId: string;
  /** 32-byte base token id accepted by the CLOB precompile. */
  baseTokenId: string;
  /** 32-byte quote token id accepted by the CLOB precompile. */
  quoteTokenId: string;
  /** `buy` maps to side byte `0`; `sell` maps to side byte `1`. */
  side: SpotLimitOrderSide;
  /** Positive integer decimal string encoded as uint256. */
  price: string;
  /** Positive integer decimal string encoded as uint256 amount. */
  quantity: string;
  /** Optional uint64 block height; omitted means `0` / no explicit expiry. */
  expiryBlock?: string | number | bigint;
}

export interface PlaceSpotMarketOrderArgs {
  /**
   * Canonical 32-byte CLOB market id, derived as
   * `keccak256(0xC1 || baseTokenId || quoteTokenId)`.
   */
  marketId: string;
  /** 32-byte base token id accepted by the CLOB precompile. */
  baseTokenId: string;
  /** 32-byte quote token id accepted by the CLOB precompile. */
  quoteTokenId: string;
  /** `buy` maps to side byte `0`; `sell` maps to side byte `1`. */
  side: SpotLimitOrderSide;
  /** Positive integer decimal string encoded as uint256 amount. */
  quantity: string;
  /** Slippage bound in basis points; must be less than 10,000. */
  maxSlippageBps: string | number | bigint;
}

export interface PlaceSpotMarketOrderExArgs extends PlaceSpotMarketOrderArgs {
  /**
   * `fill-or-refund` keeps legacy market-order semantics; `fill-or-rest-at-cap`
   * rests the unfilled remainder at the slippage cap.
   */
  mode: SpotMarketOrderMode;
}

export interface CancelSpotOrderArgs {
  /** 32-byte order id returned by the CLOB precompile. */
  orderId: string;
}

export interface EthSendTransactionRequest {
  to: string;
  value: "0x0";
  data: string;
}

export interface MarketTransactionPlan {
  method: "eth_sendTransaction";
  params: [EthSendTransactionRequest];
  mempoolClass: MempoolClass;
}

export class MarketActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketActionError";
  }
}

export function clobAddressHex(): string {
  return PRECOMPILE_ADDRESSES.CLOB.toLowerCase();
}

export function deriveClobMarketId(baseTokenId: string, quoteTokenId: string): string {
  const base = bytes32FromHex(baseTokenId, "baseTokenId");
  const quote = bytes32FromHex(quoteTokenId, "quoteTokenId");
  return bytesToHex(keccak_256(concatBytes(new Uint8Array([CLOB_MARKET_ID_DOMAIN_TAG]), base, quote)));
}

export function encodePlaceLimitOrderCalldata(args: PlaceSpotLimitOrderArgs): string {
  const normalized = normalizePlaceSpotLimitOrderArgs(args);
  return bytesToHex(
    concatBytes(
      hexToBytes(CLOB_SELECTORS.placeLimitOrder, "placeLimitOrder selector"),
      normalized.baseTokenId,
      normalized.quoteTokenId,
      uint8Word(normalized.side),
      uint256Word(normalized.price, "price"),
      uint256Word(normalized.quantity, "quantity"),
      uint64Word(normalized.expiryBlock, "expiryBlock"),
    ),
  );
}

export function encodePlaceMarketOrderCalldata(args: PlaceSpotMarketOrderArgs): string {
  const normalized = normalizePlaceSpotMarketOrderArgs(args);
  return bytesToHex(
    concatBytes(
      hexToBytes(CLOB_SELECTORS.placeMarketOrder, "placeMarketOrder selector"),
      normalized.baseTokenId,
      normalized.quoteTokenId,
      uint8Word(normalized.side),
      uint256Word(normalized.quantity, "quantity"),
      uint16Word(normalized.maxSlippageBps, "maxSlippageBps"),
    ),
  );
}

export function encodePlaceMarketOrderExCalldata(args: PlaceSpotMarketOrderExArgs): string {
  const normalized = normalizePlaceSpotMarketOrderExArgs(args);
  return bytesToHex(
    concatBytes(
      hexToBytes(CLOB_SELECTORS.placeMarketOrderEx, "placeMarketOrderEx selector"),
      normalized.baseTokenId,
      normalized.quoteTokenId,
      uint8Word(normalized.side),
      uint256Word(normalized.quantity, "quantity"),
      uint16Word(normalized.maxSlippageBps, "maxSlippageBps"),
      uint8Word(normalized.mode),
    ),
  );
}

export function encodeCancelOrderCalldata(args: CancelSpotOrderArgs): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(CLOB_SELECTORS.cancelOrder, "cancelOrder selector"),
      bytes32FromHex(args.orderId, "orderId"),
    ),
  );
}

export function buildPlaceSpotLimitOrderPlan(args: PlaceSpotLimitOrderArgs): MarketTransactionPlan {
  return {
    method: "eth_sendTransaction",
    params: [
      {
        to: PRECOMPILE_ADDRESSES.CLOB,
        value: "0x0",
        data: encodePlaceLimitOrderCalldata(args),
      },
    ],
    mempoolClass: MempoolClass.CLOBOp,
  };
}

export function buildPlaceSpotMarketOrderPlan(args: PlaceSpotMarketOrderArgs): MarketTransactionPlan {
  return {
    method: "eth_sendTransaction",
    params: [
      {
        to: PRECOMPILE_ADDRESSES.CLOB,
        value: "0x0",
        data: encodePlaceMarketOrderCalldata(args),
      },
    ],
    mempoolClass: MempoolClass.CLOBOp,
  };
}

export function buildPlaceSpotMarketOrderExPlan(args: PlaceSpotMarketOrderExArgs): MarketTransactionPlan {
  return {
    method: "eth_sendTransaction",
    params: [
      {
        to: PRECOMPILE_ADDRESSES.CLOB,
        value: "0x0",
        data: encodePlaceMarketOrderExCalldata(args),
      },
    ],
    mempoolClass: MempoolClass.CLOBOp,
  };
}

export function buildCancelSpotOrderPlan(args: CancelSpotOrderArgs): MarketTransactionPlan {
  return {
    method: "eth_sendTransaction",
    params: [
      {
        to: PRECOMPILE_ADDRESSES.CLOB,
        value: "0x0",
        data: encodeCancelOrderCalldata(args),
      },
    ],
    mempoolClass: MempoolClass.CLOBOp,
  };
}

interface NormalizedPlaceSpotLimitOrderArgs {
  marketId: string;
  baseTokenId: Uint8Array;
  quoteTokenId: Uint8Array;
  side: 0 | 1;
  price: bigint;
  quantity: bigint;
  expiryBlock: bigint;
}

interface NormalizedPlaceSpotMarketOrderArgs {
  marketId: string;
  baseTokenId: Uint8Array;
  quoteTokenId: Uint8Array;
  side: 0 | 1;
  quantity: bigint;
  maxSlippageBps: bigint;
}

interface NormalizedPlaceSpotMarketOrderExArgs extends NormalizedPlaceSpotMarketOrderArgs {
  mode: 0 | 1;
}

function normalizePlaceSpotLimitOrderArgs(args: PlaceSpotLimitOrderArgs): NormalizedPlaceSpotLimitOrderArgs {
  const normalized = normalizeSpotMarketArgs(args);
  return {
    ...normalized,
    price: positiveDecimal(args.price, "price"),
    expiryBlock: uint64(args.expiryBlock ?? 0n, "expiryBlock"),
  };
}

function normalizePlaceSpotMarketOrderArgs(args: PlaceSpotMarketOrderArgs): NormalizedPlaceSpotMarketOrderArgs {
  const normalized = normalizeSpotMarketArgs(args);
  return {
    ...normalized,
    maxSlippageBps: uint16Bps(args.maxSlippageBps, "maxSlippageBps"),
  };
}

function normalizePlaceSpotMarketOrderExArgs(args: PlaceSpotMarketOrderExArgs): NormalizedPlaceSpotMarketOrderExArgs {
  return {
    ...normalizePlaceSpotMarketOrderArgs(args),
    mode: normalizeMarketOrderMode(args.mode),
  };
}

function normalizeSpotMarketArgs(args: {
  marketId: string;
  baseTokenId: string;
  quoteTokenId: string;
  side: SpotLimitOrderSide;
  quantity: string;
}): Omit<NormalizedPlaceSpotMarketOrderArgs, "maxSlippageBps"> {
  const marketId = normalizeBytes32Hex(args.marketId, "marketId");
  const expectedMarketId = deriveClobMarketId(args.baseTokenId, args.quoteTokenId);
  if (marketId !== expectedMarketId) {
    throw new MarketActionError("marketId must match baseTokenId and quoteTokenId");
  }
  return {
    marketId,
    baseTokenId: bytes32FromHex(args.baseTokenId, "baseTokenId"),
    quoteTokenId: bytes32FromHex(args.quoteTokenId, "quoteTokenId"),
    side: normalizeSide(args.side),
    quantity: positiveDecimal(args.quantity, "quantity"),
  };
}

function normalizeBytes32Hex(value: string, name: string): string {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new MarketActionError(`${name} must be a 32-byte 0x-prefixed hex string`);
  }
  return value.toLowerCase();
}

function bytes32FromHex(value: string, name: string): Uint8Array {
  normalizeBytes32Hex(value, name);
  return hexToBytes(value, name);
}

function normalizeSide(side: SpotLimitOrderSide): 0 | 1 {
  if (side === "buy") return 0;
  if (side === "sell") return 1;
  throw new MarketActionError("side must be 'buy' or 'sell'");
}

function normalizeMarketOrderMode(mode: SpotMarketOrderMode): 0 | 1 {
  if (mode === "fill-or-refund") return 0;
  if (mode === "fill-or-rest-at-cap") return 1;
  throw new MarketActionError("mode must be 'fill-or-refund' or 'fill-or-rest-at-cap'");
}

function positiveDecimal(value: string, name: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new MarketActionError(`${name} must be an integer decimal string`);
  }
  const n = BigInt(value);
  if (n <= 0n) {
    throw new MarketActionError(`${name} must be positive`);
  }
  return n;
}

function uint16Bps(value: string | number | bigint, name: string): bigint {
  const n = uint64(value, name);
  if (n >= 10_000n) {
    throw new MarketActionError(`${name} must be less than 10000`);
  }
  return n;
}

function uint64(value: string | number | bigint, name: string): bigint {
  let n: bigint;
  if (typeof value === "bigint") {
    n = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new MarketActionError(`${name} must be a safe integer`);
    }
    n = BigInt(value);
  } else if (/^(0|[1-9][0-9]*|0x[0-9a-fA-F]+)$/.test(value)) {
    n = BigInt(value);
  } else {
    throw new MarketActionError(`${name} must be a nonnegative integer`);
  }
  if (n < 0n || n > 0xffff_ffff_ffff_ffffn) {
    throw new MarketActionError(`${name} must fit uint64`);
  }
  return n;
}

function uint8Word(value: 0 | 1): Uint8Array {
  const out = new Uint8Array(32);
  out[31] = value;
  return out;
}

function uint64Word(value: bigint, name: string): Uint8Array {
  if (value < 0n || value > 0xffff_ffff_ffff_ffffn) {
    throw new MarketActionError(`${name} must fit uint64`);
  }
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 31; i >= 24; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function uint16Word(value: bigint, name: string): Uint8Array {
  if (value < 0n || value > 0xffffn) {
    throw new MarketActionError(`${name} must fit uint16`);
  }
  const out = new Uint8Array(32);
  out[30] = Number((value >> 8n) & 0xffn);
  out[31] = Number(value & 0xffn);
  return out;
}

function uint256Word(value: bigint, name: string): Uint8Array {
  if (value < 0n || value >= (1n << 256n)) {
    throw new MarketActionError(`${name} must fit uint256`);
  }
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
