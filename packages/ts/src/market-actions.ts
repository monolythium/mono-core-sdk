/**
 * Native market transaction-plan builders.
 *
 * These helpers only build signer-ready transaction requests or native module
 * call material. They do not predict fills, trades, or execution success.
 */

import { blake3 } from "@noble/hashes/blake3.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import {
  ADDRESS_KIND_HRPS,
  addressToTypedBech32,
  typedBech32ToAddress,
  type AddressKind,
} from "./address.js";
import {
  PRECOMPILE_ADDRESSES,
  PROTOCOL_MAX_OPERATOR_FEE_BPS,
} from "./consts.js";
import { BincodeWriter } from "./crypto/bincode.js";
import { bytesToHex, concatBytes, hexToBytes } from "./crypto/bytes.js";
import { MempoolClass } from "./crypto/envelope.js";

export const CLOB_MARKET_ID_DOMAIN_TAG = 0xc1 as const;
export const NATIVE_MARKET_MODULE_ADDRESS_BYTES = "0x4d41524b45545f4e41544956455f4d4f445f5631" as const;
export const NATIVE_MARKET_MODULE_ADDRESS = addressToTypedBech32(
  "systemModule",
  NATIVE_MARKET_MODULE_ADDRESS_BYTES,
);
export const NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE = "native-call-forwarder-v1" as const;
export const NATIVE_CALL_FORWARDER_RESPONSE_OFFSET = 768 as const;
export const NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY = 256 as const;
export const MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES = 2047 as const;

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
  /** `setMinNotional(bytes32,bytes32,uint256)` — foundation-authorized. */
  setMinNotional: "0x395dc48f",
  /** `setTickSize(bytes32,bytes32,uint256)` — foundation-authorized per-market grid tune. */
  setTickSize: "0x10666f0b",
  /** `setLotSize(bytes32,bytes32,uint256)` — foundation-authorized per-market grid tune. */
  setLotSize: "0x9909be80",
} as const;

/**
 * Canonical operator-fee router selector signatures (`0x100B`).
 *
 * Mirrors `mono-core/crates/precompiles/platform/operator-router/src/abi.rs`
 * (`sig::*`). Selectors are `keccak256(signature)[0..4]`.
 */
export const OPERATOR_ROUTER_SIGS = {
  /** `registerOperator(address recipient, uint16 feeBps)`. */
  registerOperator: "registerOperator(address,uint16)",
  /** `updateOperator(address recipient, uint16 feeBps)`. */
  updateOperator: "updateOperator(address,uint16)",
  /** `disableOperator(address operator)` — foundation-authorized. */
  disableOperator: "disableOperator(address)",
  /**
   * `placeLimitOrderVia(address operator, bytes32 base, bytes32 quote,
   *  uint8 side, uint256 price, uint256 amount, uint64 expiresAtBlock)`
   *  → `bytes32 orderId`.
   *
   * Skims the operator fee (quote token, `user -> recipient`) then
   * re-enters the CLOB `placeLimitOrder` op with `caller = user`, so the
   * resting order is owned + escrowed + cancellable by the user,
   * identical to a direct CLOB placement.
   */
  placeLimitOrderVia:
    "placeLimitOrderVia(address,bytes32,bytes32,uint8,uint256,uint256,uint64)",
} as const;

/** Operator-router selectors as `0x`-prefixed 4-byte hex. */
export const OPERATOR_ROUTER_SELECTORS = {
  registerOperator: operatorRouterSelectorHex(OPERATOR_ROUTER_SIGS.registerOperator),
  updateOperator: operatorRouterSelectorHex(OPERATOR_ROUTER_SIGS.updateOperator),
  disableOperator: operatorRouterSelectorHex(OPERATOR_ROUTER_SIGS.disableOperator),
  placeLimitOrderVia: operatorRouterSelectorHex(OPERATOR_ROUTER_SIGS.placeLimitOrderVia),
} as const;

/**
 * Canonical operator-router event declaration strings (`0x100B`).
 *
 * Mirrors `operator-router/src/events.rs::sig`. Indexed args are
 * `operator`, `user`, `marketId` (for `OperatorFeeCharged`).
 */
export const OPERATOR_ROUTER_EVENT_SIGS = {
  operatorFeeCharged:
    "OperatorFeeCharged(address,address,bytes32,address,bytes32,uint256,bytes32)",
  operatorRegistered: "OperatorRegistered(address,address,uint16)",
  operatorUpdated: "OperatorUpdated(address,address,uint16,bool)",
} as const;

function operatorRouterSelectorHex(sig: string): string {
  return (
    "0x" +
    [...keccak_256(new TextEncoder().encode(sig)).slice(0, 4)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export type SpotLimitOrderSide = "buy" | "sell";
export type SpotMarketOrderMode = "fill-or-refund" | "fill-or-rest-at-cap";
export type NativeMarketAddressKind = AddressKind;
export type NativeMarketAddressInput =
  | string
  | {
      kind?: NativeMarketAddressKind;
      address: string;
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

export interface PlaceLimitOrderViaArgs {
  /**
   * Operator the order routes through (`mono` bech32m user address). Its
   * fee registration (`lyth_operatorFeeConfig`) sets the surcharge skimmed
   * from the quote escrow.
   */
  operator: string;
  /** 32-byte base token id accepted by the CLOB precompile. */
  base: string;
  /** 32-byte quote token id accepted by the CLOB precompile. */
  quote: string;
  /** `buy` maps to side byte `0`; `sell` maps to side byte `1`. */
  side: SpotLimitOrderSide;
  /** Positive integer decimal string encoded as uint256 price. */
  price: string;
  /** Positive integer decimal string encoded as uint256 amount. */
  amount: string;
  /** Optional uint64 block height; omitted means `0` / no explicit expiry. */
  expiresAtBlock?: string | number | bigint;
}

/**
 * Wallet-display projection of the declared operator fee for a
 * {@link PlaceLimitOrderViaArgs} order, computed off-chain as
 * `quoteBasis * feeBps / 10_000` where `quoteBasis = price * amount`.
 *
 * Advisory only — the binding fee is skimmed on-chain at execution time
 * from the same `quoteBasis`. The fee is denominated in the quote token.
 */
export interface OperatorFeeQuote {
  /** Operator the order routes through (`mono` bech32m). */
  operator: string;
  /** Declared operator fee in basis points (from `lyth_operatorFeeConfig`). */
  feeBps: number;
  /** `price * amount` (the quote-token basis the fee is skimmed from), decimal string. */
  quoteBasis: string;
  /** `quoteBasis * feeBps / 10_000`, floored, decimal string of quote-token atoms. */
  feeAmount: string;
}

/** A {@link MarketTransactionPlan} that also carries the declared operator fee. */
export interface PlaceLimitOrderViaPlan extends MarketTransactionPlan {
  /** Off-chain operator-fee projection for wallet display. */
  operatorFee: OperatorFeeQuote;
}

/**
 * Decoded `OperatorFeeCharged` log (`0x100B`). Mirrors
 * `operator-router/src/events.rs::emit_operator_fee_charged_to_host`:
 * indexed `operator` / `user` / `marketId`; body `recipient`,
 * `quoteToken`, `feeAmount`, `clobOrderId`. `clobOrderId` joins the
 * router fee to the CLOB `OrderPlaced` / `OrderMatched` rows.
 */
export interface OperatorFeeChargedEvent {
  /** Operator that charged the fee (`0x` 20-byte hex, indexed). */
  operator: string;
  /** User that paid the fee (`0x` 20-byte hex, indexed). */
  user: string;
  /** CLOB market id the order targets (`0x` 32 bytes, indexed). */
  marketId: string;
  /** Fee recipient configured by the operator (`0x` 20-byte hex). */
  recipient: string;
  /** Quote token the fee was skimmed in (`0x` 32 bytes). */
  quoteToken: string;
  /** Fee amount skimmed (quote-token atoms, decimal string). */
  feeAmount: string;
  /** CLOB order id the routed placement produced (`0x` 32 bytes). */
  clobOrderId: string;
}

/**
 * `lyth_operatorRouterConfig` response — the router's static posture.
 *
 * Mirrors the chain JSON exactly (camelCase). `enabled` reflects whether
 * the gateable router precompile is currently milestone-activated; the
 * read surfaces work regardless.
 */
export interface OperatorRouterConfig {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** Data source — `"native_state_storage"`. */
  source: string;
  /** Router precompile address (`0x100B`). */
  routerAddress: string;
  /** On-chain protocol fee ceiling in bps (`100` = 1.00%). */
  protocolMaxOperatorFeeBps: number;
  /** `true` when the router precompile is milestone-activated. */
  enabled: boolean;
}

/**
 * `lyth_operatorFeeConfig` response — one operator's fee registration.
 *
 * Mirrors the chain JSON exactly (camelCase). A zero recipient is the
 * "operator not registered" sentinel on-chain, so the chain returns a
 * not-found error rather than this shape in that case.
 */
export interface OperatorFeeConfig {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** Data source — `"native_state_storage"`. */
  source: string;
  /** Router precompile address (`0x100B`). */
  precompile: string;
  /** Operator the registration belongs to (`mono` bech32m). */
  operator: string;
  /** Configured fee recipient (`mono` bech32m). */
  recipient: string;
  /** Operator surcharge in basis points. */
  feeBps: number;
  /** `true` when the operator's surcharge is active. */
  enabled: boolean;
  /** Block height the operator was first registered at. */
  registeredAtBlock: number;
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
  /** Owner typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
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

export interface EncodeNativeSpotCreateMarketArgs {
  /** Market owner typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
  owner: NativeMarketAddressInput;
  /** Owner-local market nonce encoded as uint64. */
  nonce: string | number | bigint;
  /** 32-byte base asset id. */
  baseAsset: string;
  /** 32-byte quote asset id. */
  quoteAsset: string;
  /** Positive integer decimal string encoded as native MrcAmount/u128. */
  tickSize: string;
  /** Positive integer decimal string encoded as native MrcAmount/u128. */
  lotSize: string;
  /** Positive integer decimal string encoded as native MrcAmount/u128. */
  minQuantity: string;
  /** Nonnegative integer decimal string encoded as native MrcAmount/u128; 0 disables the floor. */
  minNotional: string;
}

export interface EncodeNativeSpotCancelOrderArgs {
  /** 32-byte native order id. */
  orderId: string;
  /** Caller typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
  caller: NativeMarketAddressInput;
}

export interface EncodeNativeSpotSettleLimitOrderArgs {
  /** Resting maker order id to match. */
  makerOrderId: string;
  /** Taker limit order parameters. */
  takerOrder: EncodeNativeSpotLimitOrderArgs;
}

export interface EncodeNativeSpotSettleRoutedLimitOrderArgs {
  /** Resting maker order ids in deterministic settlement order; mono-core accepts 1..64 ids. */
  makerOrderIds: readonly string[];
  /** Taker limit order parameters. */
  takerOrder: EncodeNativeSpotLimitOrderArgs;
}

export type NativeNftAssetStandard = "mrc721" | "mrc1155";
export type NativeNftListingKind =
  | "fixed-price"
  | {
      english: {
        /** Minimum starting bid encoded as native MrcAmount/u128. */
        reserve: string;
        /** Auction end block encoded as uint64. */
        endBlock: string | number | bigint;
        /** Minimum bid bump in basis points; must be less than 10,000. */
        minBidIncrementBps: string | number | bigint;
      };
    };

export interface EncodeNativeNftCreateListingArgs {
  /** Seller typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
  seller: NativeMarketAddressInput;
  /** Seller-local listing nonce encoded as uint64. */
  nonce: string | number | bigint;
  /** Native NFT asset standard. */
  standard: NativeNftAssetStandard;
  /** 32-byte collection id. */
  collectionId: string;
  /** 32-byte token id. */
  tokenId: string;
  /** Positive integer decimal string encoded as native MrcAmount/u128. */
  quantity: string;
  /** 32-byte payment asset id. */
  paymentAsset: string;
  /** Positive integer decimal string encoded as native MrcAmount/u128. */
  price: string;
  /** Fixed-price or English-auction sale model. */
  kind: NativeNftListingKind;
  /** uint64 expiry block encoded as `expires_at_block`; 0 means never. */
  expiresAtBlock: string | number | bigint;
}

export interface EncodeNativeNftBuyListingArgs {
  /** 32-byte native NFT listing id. */
  listingId: string;
  /** Buyer typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
  buyer: NativeMarketAddressInput;
  /** Current block attached to the native buy call. */
  currentBlock: string | number | bigint;
}

export interface EncodeNativeNftCancelListingArgs {
  /** 32-byte native NFT listing id. */
  listingId: string;
  /** Caller typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
  caller: NativeMarketAddressInput;
}

export interface EncodeNativeNftPlaceAuctionBidArgs {
  /** 32-byte native NFT auction listing id. */
  listingId: string;
  /** Bidder typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
  bidder: NativeMarketAddressInput;
  /** Positive integer decimal string encoded as native MrcAmount/u128. */
  amount: string;
  /** Current block attached to the native auction bid call. */
  currentBlock: string | number | bigint;
}

export interface EncodeNativeNftSettleAuctionArgs {
  /** 32-byte native NFT auction listing id. */
  listingId: string;
  /** Current block attached to the native auction settlement call. */
  currentBlock: string | number | bigint;
}

export interface EncodeNativeNftSweepExpiredListingsArgs {
  /** Candidate 32-byte native NFT listing ids; mono-core accepts 1..64 ids. */
  listingIds: readonly string[];
  /** Current block attached to the native listing sweep call. */
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

export interface NativeCallForwarderArtifact {
  /** Raw bincode MRV artifact bytes for a fixed-size native-call forwarder. */
  artifactBytes: string;
  /** Byte length accepted by the generated forwarder. */
  requestBytes: number;
  /** Stable runtime profile string used for capability matching. */
  artifactProfile: typeof NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE;
  /** Forwarder code-section hash as `0x` hex. */
  codeHash: string;
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

export function deriveNativeSpotMarketId(args: Pick<EncodeNativeSpotCreateMarketArgs, "owner" | "baseAsset" | "quoteAsset" | "nonce">): string {
  const owner = normalizeNativeMarketAddress(args.owner, "owner");
  const nonce = uint64(args.nonce, "nonce");
  return bytesToHex(
    blake3(
      concatBytes(
        asciiBytes("MONO_MARKET_ID_V1"),
        asciiBytes(ADDRESS_KIND_HRPS[owner.kind]),
        owner.bytes,
        bytes32FromHex(args.baseAsset, "baseAsset"),
        bytes32FromHex(args.quoteAsset, "quoteAsset"),
        uint64BeBytes(nonce),
      ),
    ),
  );
}

export function deriveNativeSpotOrderId(args: Pick<EncodeNativeSpotLimitOrderArgs, "marketId" | "owner" | "side" | "nonce">): string {
  const owner = normalizeNativeMarketAddress(args.owner, "owner");
  const side = normalizeSide(args.side);
  const nonce = uint64(args.nonce, "nonce");
  return bytesToHex(
    blake3(
      concatBytes(
        asciiBytes("MONO_MARKET_ORDER_ID_V1"),
        bytes32FromHex(args.marketId, "marketId"),
        asciiBytes(ADDRESS_KIND_HRPS[owner.kind]),
        owner.bytes,
        new Uint8Array([nativeOrderSideDiscriminator(side)]),
        uint64BeBytes(nonce),
      ),
    ),
  );
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

/** Three foundation-authorized per-market grid tuners share the
 *  same `(bytes32,bytes32,uint256)` shape: minNotional, tickSize,
 *  lotSize. They auto-create the market record if absent. */
export interface MarketGridTuneArgs {
  baseTokenId: string;
  quoteTokenId: string;
  /** Decimal string of quote atoms (minNotional) or atoms-per-unit (tick/lot). */
  newValue: string;
}

function encodeMarketGridTuneCalldata(selector: string, label: string, args: MarketGridTuneArgs): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(selector, `${label} selector`),
      bytes32FromHex(args.baseTokenId, "baseTokenId"),
      bytes32FromHex(args.quoteTokenId, "quoteTokenId"),
      uint256Word(BigInt(args.newValue), "newValue"),
    ),
  );
}

export function encodeSetMinNotionalCalldata(args: MarketGridTuneArgs): string {
  return encodeMarketGridTuneCalldata(CLOB_SELECTORS.setMinNotional, "setMinNotional", args);
}

export function encodeSetTickSizeCalldata(args: MarketGridTuneArgs): string {
  return encodeMarketGridTuneCalldata(CLOB_SELECTORS.setTickSize, "setTickSize", args);
}

export function encodeSetLotSizeCalldata(args: MarketGridTuneArgs): string {
  return encodeMarketGridTuneCalldata(CLOB_SELECTORS.setLotSize, "setLotSize", args);
}

export function encodeNativeSpotLimitOrderCall(args: EncodeNativeSpotLimitOrderArgs): string {
  const w = new BincodeWriter();
  w.enumVariant(0); // NativeMarketCall::Spot
  w.enumVariant(1); // SpotMarketCall::PlaceLimitOrder
  spotLimitOrderInto(w, args, "");
  return bytesToHex(w.toBytes());
}

export function encodeNativeSpotCreateMarketCall(args: EncodeNativeSpotCreateMarketArgs): string {
  const w = new BincodeWriter();
  w.enumVariant(0); // NativeMarketCall::Spot
  w.enumVariant(0); // SpotMarketCall::CreateMarket
  monoAddressInto(w, args.owner, "owner");
  w.u64(uint64(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex(args.baseAsset, "baseAsset"));
  w.rawBytes(bytes32FromHex(args.quoteAsset, "quoteAsset"));
  w.u128(positiveU128Decimal(args.tickSize, "tickSize"));
  w.u128(positiveU128Decimal(args.lotSize, "lotSize"));
  w.u128(positiveU128Decimal(args.minQuantity, "minQuantity"));
  w.u128(u128Decimal(args.minNotional, "minNotional"));
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

export function encodeNativeSpotSettleLimitOrderCall(args: EncodeNativeSpotSettleLimitOrderArgs): string {
  const w = new BincodeWriter();
  w.enumVariant(0); // NativeMarketCall::Spot
  w.enumVariant(2); // SpotMarketCall::SettleLimitOrder
  w.rawBytes(bytes32FromHex(args.makerOrderId, "makerOrderId"));
  spotLimitOrderInto(w, args.takerOrder, "takerOrder.");
  return bytesToHex(w.toBytes());
}

export function encodeNativeSpotSettleRoutedLimitOrderCall(
  args: EncodeNativeSpotSettleRoutedLimitOrderArgs,
): string {
  const makerOrderIds = normalizeListingIds(args.makerOrderIds, "makerOrderIds");
  const w = new BincodeWriter();
  w.enumVariant(0); // NativeMarketCall::Spot
  w.enumVariant(3); // SpotMarketCall::SettleRoutedLimitOrder
  w.u64(BigInt(makerOrderIds.length));
  for (const makerOrderId of makerOrderIds) {
    w.rawBytes(makerOrderId);
  }
  spotLimitOrderInto(w, args.takerOrder, "takerOrder.");
  return bytesToHex(w.toBytes());
}

export function encodeNativeNftCreateListingCall(args: EncodeNativeNftCreateListingArgs): string {
  const w = new BincodeWriter();
  w.enumVariant(1); // NativeMarketCall::Nft
  w.enumVariant(0); // NftMarketCall::CreateListing
  monoAddressInto(w, args.seller, "seller");
  w.u64(uint64(args.nonce, "nonce"));
  w.enumVariant(normalizeNftAssetStandard(args.standard));
  w.rawBytes(bytes32FromHex(args.collectionId, "collectionId"));
  w.rawBytes(bytes32FromHex(args.tokenId, "tokenId"));
  w.u128(positiveU128Decimal(args.quantity, "quantity"));
  w.rawBytes(bytes32FromHex(args.paymentAsset, "paymentAsset"));
  w.u128(positiveU128Decimal(args.price, "price"));
  listingKindInto(w, args.kind);
  w.u64(uint64(args.expiresAtBlock, "expiresAtBlock"));
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

export function encodeNativeNftCancelListingCall(args: EncodeNativeNftCancelListingArgs): string {
  const w = new BincodeWriter();
  w.enumVariant(1); // NativeMarketCall::Nft
  w.enumVariant(2); // NftMarketCall::CancelListing
  w.rawBytes(bytes32FromHex(args.listingId, "listingId"));
  monoAddressInto(w, args.caller, "caller");
  return bytesToHex(w.toBytes());
}

export function encodeNativeNftPlaceAuctionBidCall(args: EncodeNativeNftPlaceAuctionBidArgs): string {
  const w = new BincodeWriter();
  w.enumVariant(1); // NativeMarketCall::Nft
  w.enumVariant(5); // NftMarketCall::PlaceAuctionBid
  w.rawBytes(bytes32FromHex(args.listingId, "listingId"));
  monoAddressInto(w, args.bidder, "bidder");
  w.u128(positiveU128Decimal(args.amount, "amount"));
  w.u64(uint64(args.currentBlock, "currentBlock"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeNftSettleAuctionCall(args: EncodeNativeNftSettleAuctionArgs): string {
  const w = new BincodeWriter();
  w.enumVariant(1); // NativeMarketCall::Nft
  w.enumVariant(6); // NftMarketCall::SettleAuction
  w.rawBytes(bytes32FromHex(args.listingId, "listingId"));
  w.u64(uint64(args.currentBlock, "currentBlock"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeNftSweepExpiredListingsCall(args: EncodeNativeNftSweepExpiredListingsArgs): string {
  const listingIds = normalizeListingIds(args.listingIds, "listingIds");
  const w = new BincodeWriter();
  w.enumVariant(1); // NativeMarketCall::Nft
  w.enumVariant(3); // NftMarketCall::SweepExpiredListings
  w.u64(BigInt(listingIds.length));
  for (const listingId of listingIds) {
    w.rawBytes(listingId);
  }
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

export function buildNativeSpotCreateMarketForwarderInput(
  args: EncodeNativeSpotCreateMarketArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotCreateMarketModuleCall(args, maxCycles));
}

export function buildNativeSpotCancelOrderForwarderInput(
  args: EncodeNativeSpotCancelOrderArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotCancelOrderModuleCall(args, maxCycles));
}

export function buildNativeSpotSettleLimitOrderForwarderInput(
  args: EncodeNativeSpotSettleLimitOrderArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotSettleLimitOrderModuleCall(args, maxCycles));
}

export function buildNativeSpotSettleRoutedLimitOrderForwarderInput(
  args: EncodeNativeSpotSettleRoutedLimitOrderArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotSettleRoutedLimitOrderModuleCall(args, maxCycles));
}

export function buildNativeNftCreateListingForwarderInput(
  args: EncodeNativeNftCreateListingArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftCreateListingModuleCall(args, maxCycles));
}

export function buildNativeNftBuyListingForwarderInput(
  args: EncodeNativeNftBuyListingArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftBuyListingModuleCall(args, maxCycles));
}

export function buildNativeNftCancelListingForwarderInput(
  args: EncodeNativeNftCancelListingArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftCancelListingModuleCall(args, maxCycles));
}

export function buildNativeNftPlaceAuctionBidForwarderInput(
  args: EncodeNativeNftPlaceAuctionBidArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftPlaceAuctionBidModuleCall(args, maxCycles));
}

export function buildNativeNftSettleAuctionForwarderInput(
  args: EncodeNativeNftSettleAuctionArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftSettleAuctionModuleCall(args, maxCycles));
}

export function buildNativeNftSweepExpiredListingsForwarderInput(
  args: EncodeNativeNftSweepExpiredListingsArgs,
  maxCycles: string | number | bigint,
): NativeMarketForwarderInput {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftSweepExpiredListingsModuleCall(args, maxCycles));
}

export function buildNativeSpotLimitOrderModuleCall(
  args: EncodeNativeSpotLimitOrderArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotLimitOrderCall(args), maxCycles);
}

export function buildNativeSpotCreateMarketModuleCall(
  args: EncodeNativeSpotCreateMarketArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotCreateMarketCall(args), maxCycles);
}

export function buildNativeSpotCancelOrderModuleCall(
  args: EncodeNativeSpotCancelOrderArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotCancelOrderCall(args), maxCycles);
}

export function buildNativeSpotSettleLimitOrderModuleCall(
  args: EncodeNativeSpotSettleLimitOrderArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotSettleLimitOrderCall(args), maxCycles);
}

export function buildNativeSpotSettleRoutedLimitOrderModuleCall(
  args: EncodeNativeSpotSettleRoutedLimitOrderArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotSettleRoutedLimitOrderCall(args), maxCycles);
}

export function buildNativeNftCreateListingModuleCall(
  args: EncodeNativeNftCreateListingArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftCreateListingCall(args), maxCycles);
}

export function buildNativeNftBuyListingModuleCall(
  args: EncodeNativeNftBuyListingArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftBuyListingCall(args), maxCycles);
}

export function buildNativeNftCancelListingModuleCall(
  args: EncodeNativeNftCancelListingArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftCancelListingCall(args), maxCycles);
}

export function buildNativeNftPlaceAuctionBidModuleCall(
  args: EncodeNativeNftPlaceAuctionBidArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftPlaceAuctionBidCall(args), maxCycles);
}

export function buildNativeNftSettleAuctionModuleCall(
  args: EncodeNativeNftSettleAuctionArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftSettleAuctionCall(args), maxCycles);
}

export function buildNativeNftSweepExpiredListingsModuleCall(
  args: EncodeNativeNftSweepExpiredListingsArgs,
  maxCycles: string | number | bigint,
): NativeMarketModuleCallEnvelope {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftSweepExpiredListingsCall(args), maxCycles);
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

/**
 * Encode `placeLimitOrderVia(address,bytes32,bytes32,uint8,uint256,
 * uint256,uint64)` calldata for the operator-fee router (`0x100B`).
 *
 * The argument layout mirrors the direct CLOB `placeLimitOrder` encoder
 * exactly, prefixed with the left-padded `operator` address word. The
 * router strips that leading word and forwards the remaining six fields
 * to the CLOB unchanged.
 */
export function encodePlaceLimitOrderViaCalldata(args: PlaceLimitOrderViaArgs): string {
  const operator = normalizeNativeMarketAddress(args.operator, "operator");
  if (operator.kind !== "user") {
    throw new MarketActionError("operator must be a 'mono' user address");
  }
  const side = normalizeSide(args.side);
  const price = positiveDecimal(args.price, "price");
  const amount = positiveDecimal(args.amount, "amount");
  const expiresAtBlock = uint64(args.expiresAtBlock ?? 0n, "expiresAtBlock");
  return bytesToHex(
    concatBytes(
      hexToBytes(OPERATOR_ROUTER_SELECTORS.placeLimitOrderVia, "placeLimitOrderVia selector"),
      addressWord(operator.bytes),
      bytes32FromHex(args.base, "base"),
      bytes32FromHex(args.quote, "quote"),
      uint8Word(side),
      uint256Word(price, "price"),
      uint256Word(amount, "amount"),
      uint64Word(expiresAtBlock, "expiresAtBlock"),
    ),
  );
}

/**
 * Compute the off-chain declared operator fee for wallet display:
 * `quoteBasis * feeBps / 10_000` (floored) where `quoteBasis =
 * price * amount`. `feeBps` is the operator's registered fee
 * (`lyth_operatorFeeConfig`). Rejects a `feeBps` above the protocol
 * ceiling so a stale / hostile registration can't be displayed as valid.
 */
export function quoteOperatorFee(
  args: Pick<PlaceLimitOrderViaArgs, "operator" | "price" | "amount">,
  feeBps: number,
): OperatorFeeQuote {
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > PROTOCOL_MAX_OPERATOR_FEE_BPS) {
    throw new MarketActionError(
      `feeBps must be an integer in 0..=${PROTOCOL_MAX_OPERATOR_FEE_BPS}`,
    );
  }
  const operator = normalizeNativeMarketAddress(args.operator, "operator");
  if (operator.kind !== "user") {
    throw new MarketActionError("operator must be a 'mono' user address");
  }
  const price = positiveDecimal(args.price, "price");
  const amount = positiveDecimal(args.amount, "amount");
  const quoteBasis = price * amount;
  const feeAmount = (quoteBasis * BigInt(feeBps)) / 10_000n;
  return {
    operator: args.operator,
    feeBps,
    quoteBasis: quoteBasis.toString(10),
    feeAmount: feeAmount.toString(10),
  };
}

/**
 * Build a routed limit-order plan (`placeLimitOrderVia` against the
 * operator router at `0x100B`) plus the declared operator-fee projection
 * for wallet display.
 *
 * Two-spender approval model: the user must approve **two** spenders for
 * this order to succeed — the CLOB (`0x1001`) for the order's quote/base
 * escrow, AND the operator router (`0x100B`) for the fee skim. A wallet
 * surfacing this plan should prompt both approvals (or one combined
 * approval covering `quoteBasis + feeAmount`).
 */
export function buildPlaceLimitOrderViaPlan(
  args: PlaceLimitOrderViaArgs,
  feeBps: number,
): PlaceLimitOrderViaPlan {
  return {
    method: "eth_sendTransaction",
    params: [
      {
        to: PRECOMPILE_ADDRESSES.OPERATOR_ROUTER,
        value: "0x0",
        data: encodePlaceLimitOrderViaCalldata(args),
      },
    ],
    mempoolClass: MempoolClass.CLOBOp,
    operatorFee: quoteOperatorFee(args, feeBps),
  };
}

/**
 * Decode an `OperatorFeeCharged` log (`0x100B`) into a typed
 * {@link OperatorFeeChargedEvent}. `topics` is the log topic vector
 * (`topic0`, indexed `operator`, indexed `user`, indexed `marketId`);
 * `data` is the non-indexed ABI body
 * `(address recipient, bytes32 quoteToken, uint256 feeAmount, bytes32 clobOrderId)`.
 */
export function decodeOperatorFeeChargedEvent(
  topics: readonly (string | Uint8Array | readonly number[])[],
  data: string | Uint8Array | readonly number[],
): OperatorFeeChargedEvent {
  if (topics.length !== 4) {
    throw new MarketActionError(
      `OperatorFeeCharged expects 4 topics, got ${topics.length}`,
    );
  }
  const topic0 = bytesToHex(expectWordLen(toEventBytes(topics[0]), "topic0"));
  const expected = bytesToHex(
    keccak_256(new TextEncoder().encode(OPERATOR_ROUTER_EVENT_SIGS.operatorFeeCharged)),
  );
  if (topic0 !== expected) {
    throw new MarketActionError("topic0 is not OperatorFeeCharged");
  }
  const body = toEventBytes(data);
  if (body.length !== 4 * 32) {
    throw new MarketActionError(
      `OperatorFeeCharged expects 128 data bytes, got ${body.length}`,
    );
  }
  return {
    operator: addressFromEventTopic(topics[1]),
    user: addressFromEventTopic(topics[2]),
    marketId: bytesToHex(expectWordLen(toEventBytes(topics[3]), "marketId")),
    recipient: bytesToHex(body.subarray(12, 32)),
    quoteToken: bytesToHex(body.subarray(32, 64)),
    feeAmount: u256DecimalWord(body.subarray(64, 96)),
    clobOrderId: bytesToHex(body.subarray(96, 128)),
  };
}

export function buildNativeCallForwarderArtifact(requestBytes: string | number | bigint): NativeCallForwarderArtifact {
  const size = uint64(requestBytes, "requestBytes");
  if (size === 0n) {
    throw new MarketActionError("requestBytes must be non-zero");
  }
  if (size > BigInt(MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES)) {
    throw new MarketActionError(`requestBytes must be <= ${MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES}`);
  }
  const requestBytesNumber = Number(size);
  const code = nativeCallForwarderCode(requestBytesNumber);
  const codeHash = mrvCodeHashHex(code);
  return {
    artifactBytes: encodeNativeCallForwarderArtifact(code, codeHash),
    requestBytes: requestBytesNumber,
    artifactProfile: NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE,
    codeHash,
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

function nativeOrderSideDiscriminator(side: 0 | 1): 1 | 2 {
  return side === 0 ? 1 : 2;
}

function normalizeMarketOrderMode(mode: SpotMarketOrderMode): 0 | 1 {
  if (mode === "fill-or-refund") return 0;
  if (mode === "fill-or-rest-at-cap") return 1;
  throw new MarketActionError("mode must be 'fill-or-refund' or 'fill-or-rest-at-cap'");
}

function normalizeNftAssetStandard(standard: NativeNftAssetStandard): 0 | 1 {
  if (standard === "mrc721") return 0;
  if (standard === "mrc1155") return 1;
  throw new MarketActionError("standard must be 'mrc721' or 'mrc1155'");
}

function listingKindInto(w: BincodeWriter, kind: NativeNftListingKind): void {
  if (kind === "fixed-price") {
    w.enumVariant(0); // ListingKind::FixedPrice
    return;
  }
  if (typeof kind === "object" && kind !== null && "english" in kind) {
    const english = kind.english;
    if (typeof english !== "object" || english === null) {
      throw new MarketActionError("kind.english must be an object");
    }
    w.enumVariant(1); // ListingKind::English
    w.u128(positiveU128Decimal(english.reserve, "kind.english.reserve"));
    w.u64(uint64(english.endBlock, "kind.english.endBlock"));
    w.u16(Number(uint16Bps(english.minBidIncrementBps, "kind.english.minBidIncrementBps")));
    return;
  }
  throw new MarketActionError("kind must be 'fixed-price' or an english auction");
}

function normalizeListingIds(listingIds: readonly string[], name: string): Uint8Array[] {
  if (!Array.isArray(listingIds)) {
    throw new MarketActionError(`${name} must be an array`);
  }
  if (listingIds.length === 0 || listingIds.length > 64) {
    throw new MarketActionError(`${name} must contain 1 to 64 listing ids`);
  }
  return listingIds.map((listingId, i) => bytes32FromHex(listingId, `${name}[${i}]`));
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
  return u128(n, name);
}

function u128Decimal(value: string, name: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new MarketActionError(`${name} must be an integer decimal string`);
  }
  return u128(BigInt(value), name);
}

function u128(n: bigint, name: string): bigint {
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
  if (typeof input === "object" && input !== null && "address" in input) {
    const kind = input.kind;
    if (kind !== undefined && !(kind in NATIVE_MARKET_ADDRESS_KIND_VARIANTS)) {
      throw new MarketActionError(`${name}.kind is not a supported native address kind`);
    }
    if (typeof input.address !== "string") {
      throw new MarketActionError(`${name}.address must be a typed bech32m address`);
    }
    return normalizeNativeMarketAddressString(input.address, kind, name);
  }
  throw new MarketActionError(`${name} must be a typed bech32m address`);
}

function normalizeNativeMarketAddressString(
  address: string,
  expectedKind: NativeMarketAddressKind | undefined,
  name: string,
): { kind: NativeMarketAddressKind; bytes: Uint8Array } {
  if (address.startsWith("0x") || address.startsWith("0X")) {
    throw new MarketActionError(`${name} raw 0x addresses are retired; use typed bech32m addresses`);
  }
  try {
    const parsed = typedBech32ToAddress(address, expectedKind);
    return { kind: parsed.kind, bytes: parsed.bytes };
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new MarketActionError(`${name} must be a typed bech32m address${detail}`);
  }
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

/** Left-pad a 20-byte address into a 32-byte ABI head word. */
function addressWord(addr: Uint8Array): Uint8Array {
  if (addr.length !== 20) {
    throw new MarketActionError("address must be 20 bytes");
  }
  const out = new Uint8Array(32);
  out.set(addr, 12);
  return out;
}

/** Coerce a hex/byte input to bytes for event decoding. */
function toEventBytes(value: string | Uint8Array | readonly number[]): Uint8Array {
  if (typeof value === "string") return hexToBytes(value, "event word");
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function expectWordLen(value: Uint8Array, name: string): Uint8Array {
  if (value.length !== 32) {
    throw new MarketActionError(`${name} must be 32 bytes, got ${value.length}`);
  }
  return value;
}

/** Decode a left-padded address from a 32-byte indexed topic. */
function addressFromEventTopic(topic: string | Uint8Array | readonly number[]): string {
  return bytesToHex(expectWordLen(toEventBytes(topic), "address topic").subarray(12, 32));
}

/** Decode a `uint256` word to a decimal string. */
function u256DecimalWord(word: Uint8Array): string {
  let v = 0n;
  for (const b of word) v = (v << 8n) | BigInt(b);
  return v.toString(10);
}

function spotLimitOrderInto(w: BincodeWriter, args: EncodeNativeSpotLimitOrderArgs, prefix: string): void {
  w.rawBytes(bytes32FromHex(args.marketId, `${prefix}marketId`));
  monoAddressInto(w, args.owner, `${prefix}owner`);
  w.u64(uint64(args.nonce, `${prefix}nonce`));
  w.enumVariant(normalizeSide(args.side));
  w.u128(positiveU128Decimal(args.price, `${prefix}price`));
  w.u128(positiveU128Decimal(args.quantity, `${prefix}quantity`));
  w.u64(uint64(args.expiresAtBlock, `${prefix}expiresAtBlock`));
}

function uint64BeBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let rest = value;
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function asciiBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function mrvCodeHashHex(code: Uint8Array): string {
  const len = uint64BeBytes(BigInt(code.length));
  return bytesToHex(blake3(concatBytes(asciiBytes("MONO_MRV_CODE_V1"), len, code)));
}

function nativeCallForwarderCode(requestBytes: number): Uint8Array {
  return rvCode([
    rvAddi(17, 0, 0x0301),
    rvAddi(10, 0, 0),
    rvAddi(11, 0, requestBytes),
    rvAddi(12, 0, NATIVE_CALL_FORWARDER_RESPONSE_OFFSET),
    rvAddi(13, 0, NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY),
    0x0000_0073,
  ]);
}

function rvCode(words: readonly number[]): Uint8Array {
  const out = new Uint8Array(words.length * 4);
  const view = new DataView(out.buffer);
  words.forEach((word, i) => view.setUint32(i * 4, word >>> 0, true));
  return out;
}

function rvAddi(rd: number, rs1: number, imm: number): number {
  return ((imm & 0x0fff) << 20) | (rs1 << 15) | (rd << 7) | 0x13;
}

function encodeNativeCallForwarderArtifact(code: Uint8Array, codeHash: string): string {
  const w = new BincodeWriter();
  w.u16(1); // MRV format version.
  w.enumVariant(0); // RiscvProfile::MonoRv32ImV1
  w.bytes(code);
  w.u64(1n); // abi.symbols
  writeString(w, "forward_call_contract");
  w.enumVariant(1); // AbiSymbolKind::Function
  w.u64(1n); // inputs
  writeString(w, "request");
  w.enumVariant(6); // AbiType::Bytes
  w.u64(1n); // outputs
  writeString(w, "response");
  w.enumVariant(6); // AbiType::Bytes
  w.u64(1n); // imports
  writeString(w, "mono");
  writeString(w, "call_contract");
  w.u16(0x0301);
  w.u32(1);
  w.u32(1);
  w.u32(16 * 1024);
  writeString(w, "native_call_forwarder");
  w.u16(1);
  w.rawBytes(hexToBytes(codeHash, "codeHash"));
  writeString(w, "mono-sdk-rv32im-forwarder");
  w.rawBytes(hexToBytes(mrvCodeHashHex(asciiBytes("mono-sdk-native-call-forwarder-v1")), "sourceDigest"));
  writeString(w, NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE);
  w.bytes(new Uint8Array());
  return bytesToHex(w.toBytes());
}

function writeString(w: BincodeWriter, value: string): void {
  w.bytes(asciiBytes(value));
}
