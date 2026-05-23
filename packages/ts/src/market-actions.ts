/**
 * Native market transaction-plan builders.
 *
 * These helpers only build signer-ready transaction requests. They do
 * not predict order ids, fills, trades, or execution success.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { addressToTypedBech32, hexToAddressBytes, typedBech32ToAddress, type AddressKind } from "./address.js";
import { PRECOMPILE_ADDRESSES } from "./consts.js";
import { BincodeWriter } from "./crypto/bincode.js";
import { bytesToHex, concatBytes, hexToBytes } from "./crypto/bytes.js";
import { MempoolClass } from "./crypto/envelope.js";

export const CLOB_MARKET_ID_DOMAIN_TAG = 0xc1 as const;
export const NATIVE_MARKET_MODULE_ADDRESS_BYTES = "0x4d41524b45545f4e41544956455f4d4f445f5631" as const;
export const NATIVE_MARKET_MODULE_ADDRESS = addressToTypedBech32(
  "systemModule",
  NATIVE_MARKET_MODULE_ADDRESS_BYTES,
);

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
export type NativeMarketAddressKind = AddressKind;
export type NativeMarketAddressInput =
  | string
  | Uint8Array
  | readonly number[]
  | {
      kind?: NativeMarketAddressKind;
      address: string | Uint8Array | readonly number[];
    };

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

export interface EncodeNativeSpotLimitOrderArgs {
  /** 32-byte native spot market id. */
  marketId: string;
  /** Owner MonoAddress; 0x addresses and raw 20-byte inputs default to user kind. */
  owner: NativeMarketAddressInput;
  /** Per-owner order nonce encoded as uint64. */
  nonce: string | number | bigint;
  /** `buy` maps to native `OrderSide::Bid`; `sell` maps to native `OrderSide::Ask`. */
  side: SpotLimitOrderSide;
  /** Positive integer decimal string encoded as native MrcAmount/u128. */
  price: string;
  /** Positive integer decimal string encoded as native MrcAmount/u128. */
  quantity: string;
  /** uint64 expiry block encoded as `expires_at_block`. */
  expiresAtBlock: string | number | bigint;
}

export interface EncodeNativeSpotCancelOrderArgs {
  /** 32-byte native order id. */
  orderId: string;
  /** Caller MonoAddress; 0x addresses and raw 20-byte inputs default to user kind. */
  caller: NativeMarketAddressInput;
}

export interface EncodeNativeNftBuyListingArgs {
  /** 32-byte native NFT listing id. */
  listingId: string;
  /** Buyer MonoAddress; 0x addresses and raw 20-byte inputs default to user kind. */
  buyer: NativeMarketAddressInput;
  /** Current block attached to the native buy call. */
  currentBlock: string | number | bigint;
}

export interface NativeMarketModuleContractCall {
  /** Stable typed system-module address (`MARKET_NATIVE_MOD_V1`). */
  to: string;
  /** Native market router bincode payload. */
  input: string;
  /** Native market module calls must not carry native value. */
  valueLythoshi: "0";
  /** Maximum cycles delegated to the RISC-V host call. */
  maxCycles: string;
}

export interface NativeMarketModuleCallEnvelope {
  module: "market";
  call: NativeMarketModuleContractCall;
}

export interface NativeMarketForwarderInput {
  /** Canonical `SyscallRequest::CallContract` bytes for MRV call input. */
  input: string;
  /** Byte length of `input`, useful because the minimal forwarder artifact pins this as an immediate. */
  requestBytes: number;
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

export function encodeNativeSpotLimitOrderCall(args: EncodeNativeSpotLimitOrderArgs): string {
  const w = new BincodeWriter();
  w.enumVariant(0); // NativeMarketCall::Spot
  w.enumVariant(1); // SpotMarketCall::PlaceLimitOrder
  w.rawBytes(bytes32FromHex(args.marketId, "marketId"));
  monoAddressInto(w, args.owner, "owner");
  w.u64(uint64(args.nonce, "nonce"));
  w.enumVariant(normalizeSide(args.side));
  w.u128(positiveU128Decimal(args.price, "price"));
  w.u128(positiveU128Decimal(args.quantity, "quantity"));
  w.u64(uint64(args.expiresAtBlock, "expiresAtBlock"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeSpotCancelOrderCall(args: EncodeNativeSpotCancelOrderArgs): string {
  const w = new BincodeWriter();
  w.enumVariant(0); // NativeMarketCall::Spot
  w.enumVariant(4); // SpotMarketCall::CancelOrder
  w.rawBytes(bytes32FromHex(args.orderId, "orderId"));
  monoAddressInto(w, args.caller, "caller");
  return bytesToHex(w.toBytes());
}

export function encodeNativeNftBuyListingCall(args: EncodeNativeNftBuyListingArgs): string {
  const w = new BincodeWriter();
  w.enumVariant(1); // NativeMarketCall::Nft
  w.enumVariant(1); // NftMarketCall::BuyListing
  w.rawBytes(bytes32FromHex(args.listingId, "listingId"));
  monoAddressInto(w, args.buyer, "buyer");
  w.u64(uint64(args.currentBlock, "currentBlock"));
  return bytesToHex(w.toBytes());
}

export function buildNativeMarketModuleCallEnvelope(
  input: string,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return {
    module: "market",
    call: {
      to: NATIVE_MARKET_MODULE_ADDRESS,
      input: normalizeHexBytes(input, "input"),
      valueLythoshi: "0",
      maxCycles: uint64(maxCycles, "maxCycles").toString(10),
    },
  };
}

export function encodeNativeMarketModuleForwarderInput(
  envelope: NativeMarketModuleCallEnvelope,
): NativeMarketForwarderInput {
  if (envelope.module !== "market") {
    throw new MarketActionError("native market forwarder envelope module must be 'market'");
  }
  if (!isNativeMarketModuleAddress(envelope.call.to)) {
    throw new MarketActionError("native market forwarder call target must be the market system module");
  }
  if (envelope.call.valueLythoshi !== "0") {
    throw new MarketActionError("native market forwarder call valueLythoshi must be 0");
  }
  const payload = hexToBytes(normalizeHexBytes(envelope.call.input, "input"), "input");
  const maxCycles = uint64(envelope.call.maxCycles, "maxCycles");
  const w = new BincodeWriter();
  w.enumVariant(7); // SyscallRequest::CallContract
  w.enumVariant(NATIVE_MARKET_ADDRESS_KIND_VARIANTS.systemModule);
  w.rawBytes(hexToBytes(NATIVE_MARKET_MODULE_ADDRESS_BYTES, "native market module address"));
  w.bytes(payload);
  w.u128(0n);
  w.u64(maxCycles);
  const input = bytesToHex(w.toBytes());
  return { input, requestBytes: (input.length - 2) / 2 };
}

export function buildNativeSpotLimitOrderForwarderInput(
  args: EncodeNativeSpotLimitOrderArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotLimitOrderModuleCall(args, maxCycles));
}

export function buildNativeSpotCancelOrderForwarderInput(
  args: EncodeNativeSpotCancelOrderArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotCancelOrderModuleCall(args, maxCycles));
}

export function buildNativeNftBuyListingForwarderInput(
  args: EncodeNativeNftBuyListingArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftBuyListingModuleCall(args, maxCycles));
}

export function buildNativeSpotLimitOrderModuleCall(
  args: EncodeNativeSpotLimitOrderArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotLimitOrderCall(args), maxCycles);
}

export function buildNativeSpotCancelOrderModuleCall(
  args: EncodeNativeSpotCancelOrderArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotCancelOrderCall(args), maxCycles);
}

export function buildNativeNftBuyListingModuleCall(
  args: EncodeNativeNftBuyListingArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftBuyListingCall(args), maxCycles);
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

const NATIVE_MARKET_ADDRESS_KIND_VARIANTS: Record<NativeMarketAddressKind, number> = {
  user: 0,
  smartAccount: 1,
  contract: 2,
  cluster: 3,
  multisig: 4,
  systemModule: 5,
};

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

function positiveU128Decimal(value: string, name: string): bigint {
  const n = positiveDecimal(value, name);
  if (n >= (1n << 128n)) {
    throw new MarketActionError(`${name} must fit uint128`);
  }
  return n;
}

function normalizeHexBytes(value: string, name: string): string {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new MarketActionError(`${name} must be 0x-prefixed hex bytes`);
  }
  try {
    hexToBytes(value, name);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new MarketActionError(`${name} must be 0x-prefixed hex bytes${detail}`);
  }
  return value.toLowerCase();
}

function isNativeMarketModuleAddress(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized === NATIVE_MARKET_MODULE_ADDRESS || normalized === NATIVE_MARKET_MODULE_ADDRESS_BYTES;
}

function monoAddressInto(w: BincodeWriter, input: NativeMarketAddressInput, name: string): void {
  const { kind, bytes } = normalizeNativeMarketAddress(input, name);
  w.enumVariant(NATIVE_MARKET_ADDRESS_KIND_VARIANTS[kind]);
  w.rawBytes(bytes);
}

function normalizeNativeMarketAddress(
  input: NativeMarketAddressInput,
  name: string,
): { kind: NativeMarketAddressKind; bytes: Uint8Array } {
  if (typeof input === "string") {
    return normalizeNativeMarketAddressString(input, undefined, name);
  }
  if (isAddressByteInput(input)) {
    return { kind: "user", bytes: expectAddressBytes(input, name) };
  }
  if (typeof input === "object" && input !== null) {
    const kind = input.kind ?? "user";
    if (!(kind in NATIVE_MARKET_ADDRESS_KIND_VARIANTS)) {
      throw new MarketActionError(`${name}.kind is not a supported native address kind`);
    }
    const address = input.address;
    if (typeof address === "string") {
      return normalizeNativeMarketAddressString(address, kind, name);
    }
    return { kind, bytes: expectAddressBytes(address, name) };
  }
  throw new MarketActionError(`${name} must be a 20-byte address`);
}

function isAddressByteInput(input: NativeMarketAddressInput): input is Uint8Array | readonly number[] {
  return input instanceof Uint8Array || Array.isArray(input);
}

function normalizeNativeMarketAddressString(
  address: string,
  expectedKind: NativeMarketAddressKind | undefined,
  name: string,
): { kind: NativeMarketAddressKind; bytes: Uint8Array } {
  try {
    if (address.startsWith("0x") || address.startsWith("0X")) {
      return { kind: expectedKind ?? "user", bytes: hexToAddressBytes(address) };
    }
    const parsed = typedBech32ToAddress(address, expectedKind);
    return { kind: parsed.kind, bytes: parsed.bytes };
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new MarketActionError(`${name} must be a 20-byte hex or typed bech32m address${detail}`);
  }
}

function expectAddressBytes(value: Uint8Array | readonly number[], name: string): Uint8Array {
  if (value.length !== 20) {
    throw new MarketActionError(`${name} must be a 20-byte address`);
  }
  for (const byte of value) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new MarketActionError(`${name} must contain bytes`);
    }
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
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
