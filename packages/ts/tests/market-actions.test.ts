import { describe, expect, it } from "vitest";
import {
  CLOB_MARKET_ID_DOMAIN_TAG,
  CLOB_SELECTORS,
  MarketActionError,
  NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE,
  NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY,
  NATIVE_CALL_FORWARDER_RESPONSE_OFFSET,
  NATIVE_MARKET_MODULE_ADDRESS,
  NATIVE_MARKET_MODULE_ADDRESS_BYTES,
  PRECOMPILE_ADDRESSES,
  addressToTypedBech32,
  buildCancelSpotOrderPlan,
  buildNativeCallForwarderArtifact,
  buildNativeNftBuyListingForwarderInput,
  buildNativeMarketModuleCallEnvelope,
  buildNativeNftBuyListingModuleCall,
  buildNativeNftCancelListingForwarderInput,
  buildNativeNftCancelListingModuleCall,
  buildNativeNftCreateListingForwarderInput,
  buildNativeNftCreateListingModuleCall,
  buildNativeNftPlaceAuctionBidForwarderInput,
  buildNativeNftPlaceAuctionBidModuleCall,
  buildNativeNftSettleAuctionForwarderInput,
  buildNativeNftSettleAuctionModuleCall,
  buildNativeNftSweepExpiredListingsForwarderInput,
  buildNativeNftSweepExpiredListingsModuleCall,
  buildNativeSpotCancelOrderForwarderInput,
  buildNativeSpotCancelOrderModuleCall,
  buildNativeSpotCreateMarketForwarderInput,
  buildNativeSpotCreateMarketModuleCall,
  buildNativeSpotLimitOrderForwarderInput,
  buildNativeSpotLimitOrderModuleCall,
  buildNativeSpotSettleLimitOrderForwarderInput,
  buildNativeSpotSettleLimitOrderModuleCall,
  buildNativeSpotSettleRoutedLimitOrderForwarderInput,
  buildNativeSpotSettleRoutedLimitOrderModuleCall,
  buildPlaceSpotLimitOrderPlan,
  buildPlaceSpotMarketOrderExPlan,
  buildPlaceSpotMarketOrderPlan,
  clobAddressHex,
  deriveClobMarketId,
  deriveNativeSpotMarketId,
  deriveNativeSpotOrderId,
  encodeCancelOrderCalldata,
  encodeNativeMarketModuleForwarderInput,
  encodeNativeNftBuyListingCall,
  encodeNativeNftCancelListingCall,
  encodeNativeNftCreateListingCall,
  encodeNativeNftPlaceAuctionBidCall,
  encodeNativeNftSettleAuctionCall,
  encodeNativeNftSweepExpiredListingsCall,
  encodeNativeSpotCancelOrderCall,
  encodeNativeSpotCreateMarketCall,
  encodeNativeSpotLimitOrderCall,
  encodeNativeSpotSettleLimitOrderCall,
  encodeNativeSpotSettleRoutedLimitOrderCall,
  encodePlaceLimitOrderCalldata,
  encodePlaceMarketOrderCalldata,
  encodePlaceMarketOrderExCalldata,
  type PlaceSpotLimitOrderArgs,
} from "../src/index.js";
import { MempoolClass } from "../src/crypto/index.js";

const baseTokenId = `0x${"a1".repeat(32)}`;
const quoteTokenId = `0x${"a2".repeat(32)}`;
const marketId = deriveClobMarketId(baseTokenId, quoteTokenId);
const nativeMarketId = `0x${"21".repeat(32)}`;
const rustNativeLimitOrderGolden =
  `0x0000000001000000${"11".repeat(32)}` +
  `00000000${"22".repeat(20)}` +
  "0700000000000000" +
  "00000000" +
  "7d000000000000000000000000000000" +
  "32000000000000000000000000000000" +
  "e703000000000000";
const rustNativeCreateSpotMarketGolden =
  `0x000000000000000000000000${"10".repeat(20)}` +
  "0400000000000000" +
  `${"11".repeat(32)}` +
  `${"12".repeat(32)}` +
  "01000000000000000000000000000000" +
  "0a000000000000000000000000000000" +
  "0a000000000000000000000000000000" +
  "64000000000000000000000000000000";
const rustNativeCancelOrderGolden = `0x0000000004000000${"33".repeat(32)}00000000${"44".repeat(20)}`;
const rustNativeSettleLimitOrderGolden =
  `0x0000000002000000${"31".repeat(32)}` +
  `${"21".repeat(32)}` +
  `00000000${"30".repeat(20)}` +
  "0600000000000000" +
  "01000000" +
  "78000000000000000000000000000000" +
  "19000000000000000000000000000000" +
  "6400000000000000";
const rustNativeSettleRoutedLimitOrderGolden =
  `0x00000000030000000200000000000000${"31".repeat(32)}${"32".repeat(32)}` +
  `${"21".repeat(32)}` +
  `00000000${"30".repeat(20)}` +
  "0700000000000000" +
  "01000000" +
  "78000000000000000000000000000000" +
  "4b000000000000000000000000000000" +
  "6500000000000000";
const rustNativeCreateListingGolden =
  `0x010000000000000000000000${"11".repeat(20)}` +
  "0700000000000000" +
  "00000000" +
  `${"22".repeat(32)}` +
  `${"33".repeat(32)}` +
  "01000000000000000000000000000000" +
  `${"44".repeat(32)}` +
  "7b000000000000000000000000000000" +
  "00000000" +
  "e703000000000000";
const rustNativeBuyListingGolden =
  `0x0100000001000000${"55".repeat(32)}00000000${"66".repeat(20)}0903000000000000`;
const rustNativeCancelListingGolden = `0x0100000002000000${"55".repeat(32)}00000000${"66".repeat(20)}`;
const rustNativePlaceAuctionBidGolden =
  `0x0100000005000000${"77".repeat(32)}00000000${"88".repeat(20)}` +
  "41010000000000000000000000000000" +
  "7803000000000000";
const rustNativeSettleAuctionGolden = `0x0100000006000000${"77".repeat(32)}e703000000000000`;
const rustNativeSweepExpiredListingsGolden =
  `0x01000000030000000200000000000000${"aa".repeat(32)}${"bb".repeat(32)}0903000000000000`;

const args: PlaceSpotLimitOrderArgs = {
  marketId,
  baseTokenId,
  quoteTokenId,
  side: "buy",
  price: "123456789",
  quantity: "42",
  expiryBlock: 500n,
};

describe("native market action builders", () => {
  it("exports CLOB constants pinned to mono-core", () => {
    expect(CLOB_MARKET_ID_DOMAIN_TAG).toBe(0xc1);
    expect(CLOB_SELECTORS).toEqual({
      placeLimitOrder: "0x2468786f",
      placeMarketOrder: "0xb9b1fa86",
      placeMarketOrderEx: "0xa6f092f0",
      cancelOrder: "0x7489ec23",
    });
    expect(PRECOMPILE_ADDRESSES.CLOB).toBe("0x0000000000000000000000000000000000001001");
    expect(clobAddressHex()).toBe("0x0000000000000000000000000000000000001001");
  });

  it("derives the canonical market id from base and quote token ids", () => {
    expect(marketId).toBe("0xc707fbb655b8ef26fadeff8808adc1206317f5b392ee7ab76a5e6b2f8f8b32b9");
    expect(deriveClobMarketId(quoteTokenId, baseTokenId)).not.toBe(marketId);
  });

  it("derives native spot market and order ids for later RPC queries", () => {
    expect(
      deriveNativeSpotMarketId({
        owner: `0x${"10".repeat(20)}`,
        nonce: 4,
        baseAsset: `0x${"11".repeat(32)}`,
        quoteAsset: `0x${"12".repeat(32)}`,
      }),
    ).toBe("0x0ceb1adb23efe563e105eafb4b5fafddd19d52716eee7bf48a5bdcfcd7429492");
    expect(
      deriveNativeSpotOrderId({
        marketId: nativeMarketId,
        owner: `0x${"20".repeat(20)}`,
        side: "buy",
        nonce: 5,
      }),
    ).toBe("0xa2e19901809becbcc7f9b79a6c05c446a7813814dfac7bf070a60a8a8769ff80");
    expect(
      deriveNativeSpotOrderId({
        marketId: nativeMarketId,
        owner: `0x${"30".repeat(20)}`,
        side: "sell",
        nonce: 6,
      }),
    ).toBe("0x08cba2307ab25dd91ecc8c0768e821cacc23b56dffb7cb13a474c4734dce4841");
  });

  it("encodes placeLimitOrder calldata with the mono-core ABI layout", () => {
    const calldata = encodePlaceLimitOrderCalldata(args);
    expect(calldata.startsWith(CLOB_SELECTORS.placeLimitOrder)).toBe(true);
    expect((calldata.length - 2) / 2).toBe(4 + 6 * 32);
    expect(calldata.slice(10, 74)).toBe("a1".repeat(32));
    expect(calldata.slice(74, 138)).toBe("a2".repeat(32));
    expect(calldata.slice(138, 202)).toBe("0".repeat(64));
    expect(calldata.slice(202, 266)).toBe("0".repeat(56) + "075bcd15");
    expect(calldata.slice(266, 330)).toBe("0".repeat(62) + "2a");
    expect(calldata.slice(330)).toBe("0".repeat(61) + "1f4");
  });

  it("encodes sell side and default expiry", () => {
    const calldata = encodePlaceLimitOrderCalldata({
      ...args,
      side: "sell",
      expiryBlock: undefined,
    });
    expect(calldata.slice(138, 202)).toBe("0".repeat(63) + "1");
    expect(calldata.slice(330)).toBe("0".repeat(64));
  });

  it("builds an eth_sendTransaction-shaped CLOB transaction plan", () => {
    const plan = buildPlaceSpotLimitOrderPlan(args);
    expect(plan).toEqual({
      method: "eth_sendTransaction",
      params: [
        {
          to: PRECOMPILE_ADDRESSES.CLOB,
          value: "0x0",
          data: encodePlaceLimitOrderCalldata(args),
        },
      ],
      mempoolClass: MempoolClass.CLOBOp,
    });
  });

  it("encodes market orders, explicit market order mode, and cancellation", () => {
    const marketOrder = encodePlaceMarketOrderCalldata({
      marketId,
      baseTokenId,
      quoteTokenId,
      side: "sell",
      quantity: "42",
      maxSlippageBps: 250,
    });
    expect(marketOrder.startsWith(CLOB_SELECTORS.placeMarketOrder)).toBe(true);
    expect((marketOrder.length - 2) / 2).toBe(4 + 5 * 32);
    expect(marketOrder.slice(10, 74)).toBe("a1".repeat(32));
    expect(marketOrder.slice(74, 138)).toBe("a2".repeat(32));
    expect(marketOrder.slice(138, 202)).toBe("0".repeat(63) + "1");
    expect(marketOrder.slice(202, 266)).toBe("0".repeat(62) + "2a");
    expect(marketOrder.slice(266)).toBe("0".repeat(62) + "fa");

    const marketOrderEx = encodePlaceMarketOrderExCalldata({
      marketId,
      baseTokenId,
      quoteTokenId,
      side: "buy",
      quantity: "42",
      maxSlippageBps: "250",
      mode: "fill-or-rest-at-cap",
    });
    expect(marketOrderEx.startsWith(CLOB_SELECTORS.placeMarketOrderEx)).toBe(true);
    expect((marketOrderEx.length - 2) / 2).toBe(4 + 6 * 32);
    expect(marketOrderEx.slice(330)).toBe("0".repeat(63) + "1");

    const orderId = `0x${"b3".repeat(32)}`;
    expect(encodeCancelOrderCalldata({ orderId })).toBe(`${CLOB_SELECTORS.cancelOrder}${"b3".repeat(32)}`);
  });

  it("builds CLOB market-order and cancel transaction plans", () => {
    const marketPlan = buildPlaceSpotMarketOrderPlan({
      marketId,
      baseTokenId,
      quoteTokenId,
      side: "buy",
      quantity: "42",
      maxSlippageBps: 250,
    });
    expect(marketPlan).toMatchObject({
      method: "eth_sendTransaction",
      params: [{ to: PRECOMPILE_ADDRESSES.CLOB, value: "0x0" }],
      mempoolClass: MempoolClass.CLOBOp,
    });
    expect(marketPlan.params[0].data.startsWith(CLOB_SELECTORS.placeMarketOrder)).toBe(true);

    const marketExPlan = buildPlaceSpotMarketOrderExPlan({
      marketId,
      baseTokenId,
      quoteTokenId,
      side: "buy",
      quantity: "42",
      maxSlippageBps: 250,
      mode: "fill-or-refund",
    });
    expect(marketExPlan.params[0].data.startsWith(CLOB_SELECTORS.placeMarketOrderEx)).toBe(true);

    const cancelPlan = buildCancelSpotOrderPlan({ orderId: `0x${"b3".repeat(32)}` });
    expect(cancelPlan).toMatchObject({
      method: "eth_sendTransaction",
      params: [{ to: PRECOMPILE_ADDRESSES.CLOB, value: "0x0" }],
      mempoolClass: MempoolClass.CLOBOp,
    });
    expect(cancelPlan.params[0].data.startsWith(CLOB_SELECTORS.cancelOrder)).toBe(true);
  });

  it("encodes native market router calls with the mono-core bincode layout", () => {
    expect(
      encodeNativeSpotCreateMarketCall({
        owner: `0x${"10".repeat(20)}`,
        nonce: 4,
        baseAsset: `0x${"11".repeat(32)}`,
        quoteAsset: `0x${"12".repeat(32)}`,
        tickSize: "1",
        lotSize: "10",
        minQuantity: "10",
        minNotional: "100",
      }),
    ).toBe(rustNativeCreateSpotMarketGolden);

    expect(
      encodeNativeSpotLimitOrderCall({
        marketId: `0x${"11".repeat(32)}`,
        owner: addressToTypedBech32("user", `0x${"22".repeat(20)}`),
        nonce: 7,
        side: "buy",
        price: "125",
        quantity: "50",
        expiresAtBlock: 999,
      }),
    ).toBe(rustNativeLimitOrderGolden);

    expect(
      encodeNativeSpotCancelOrderCall({
        orderId: `0x${"33".repeat(32)}`,
        caller: `0x${"44".repeat(20)}`,
      }),
    ).toBe(rustNativeCancelOrderGolden);

    expect(
      encodeNativeSpotSettleLimitOrderCall({
        makerOrderId: `0x${"31".repeat(32)}`,
        takerOrder: {
          marketId: nativeMarketId,
          owner: `0x${"30".repeat(20)}`,
          nonce: 6,
          side: "sell",
          price: "120",
          quantity: "25",
          expiresAtBlock: 100,
        },
      }),
    ).toBe(rustNativeSettleLimitOrderGolden);

    expect(
      encodeNativeSpotSettleRoutedLimitOrderCall({
        makerOrderIds: [`0x${"31".repeat(32)}`, `0x${"32".repeat(32)}`],
        takerOrder: {
          marketId: nativeMarketId,
          owner: `0x${"30".repeat(20)}`,
          nonce: 7,
          side: "sell",
          price: "120",
          quantity: "75",
          expiresAtBlock: 101,
        },
      }),
    ).toBe(rustNativeSettleRoutedLimitOrderGolden);

    expect(
      encodeNativeNftCreateListingCall({
        seller: `0x${"11".repeat(20)}`,
        nonce: 7,
        standard: "mrc721",
        collectionId: `0x${"22".repeat(32)}`,
        tokenId: `0x${"33".repeat(32)}`,
        quantity: "1",
        paymentAsset: `0x${"44".repeat(32)}`,
        price: "123",
        kind: "fixed-price",
        expiresAtBlock: 999,
      }),
    ).toBe(rustNativeCreateListingGolden);

    expect(
      encodeNativeNftBuyListingCall({
        listingId: `0x${"55".repeat(32)}`,
        buyer: { kind: "user", address: new Uint8Array(20).fill(0x66) },
        currentBlock: 777,
      }),
    ).toBe(rustNativeBuyListingGolden);

    expect(
      encodeNativeNftCancelListingCall({
        listingId: `0x${"55".repeat(32)}`,
        caller: `0x${"66".repeat(20)}`,
      }),
    ).toBe(rustNativeCancelListingGolden);

    expect(
      encodeNativeNftPlaceAuctionBidCall({
        listingId: `0x${"77".repeat(32)}`,
        bidder: `0x${"88".repeat(20)}`,
        amount: "321",
        currentBlock: 888,
      }),
    ).toBe(rustNativePlaceAuctionBidGolden);

    expect(
      encodeNativeNftSettleAuctionCall({
        listingId: `0x${"77".repeat(32)}`,
        currentBlock: 999,
      }),
    ).toBe(rustNativeSettleAuctionGolden);

    expect(
      encodeNativeNftSweepExpiredListingsCall({
        listingIds: [`0x${"aa".repeat(32)}`, `0x${"bb".repeat(32)}`],
        currentBlock: 777,
      }),
    ).toBe(rustNativeSweepExpiredListingsGolden);

    expect(
      encodeNativeNftCreateListingCall({
        seller: `0x${"11".repeat(20)}`,
        nonce: 7,
        standard: "mrc1155",
        collectionId: `0x${"22".repeat(32)}`,
        tokenId: `0x${"33".repeat(32)}`,
        quantity: "25",
        paymentAsset: `0x${"44".repeat(32)}`,
        price: "123",
        kind: { english: { reserve: "100", endBlock: 555, minBidIncrementBps: 250 } },
        expiresAtBlock: 999,
      }).slice(0, 34),
    ).toBe("0x01000000000000000000000011111111");
  });

  it("builds native market module call envelopes for RISC-V call_contract", () => {
    expect(NATIVE_MARKET_MODULE_ADDRESS_BYTES).toBe("0x4d41524b45545f4e41544956455f4d4f445f5631");
    expect(NATIVE_MARKET_MODULE_ADDRESS).toBe(
      addressToTypedBech32("systemModule", NATIVE_MARKET_MODULE_ADDRESS_BYTES),
    );

    expect(buildNativeMarketModuleCallEnvelope(rustNativeBuyListingGolden, 44_000)).toEqual({
      module: "market",
      call: {
        to: NATIVE_MARKET_MODULE_ADDRESS,
        input: rustNativeBuyListingGolden,
        valueLythoshi: "0",
        maxCycles: "44000",
      },
    });

    expect(
      buildNativeSpotLimitOrderModuleCall(
        {
          marketId: `0x${"11".repeat(32)}`,
          owner: `0x${"22".repeat(20)}`,
          nonce: 7,
          side: "buy",
          price: "125",
          quantity: "50",
          expiresAtBlock: 999,
        },
        "22000",
      ).call,
    ).toMatchObject({
      to: NATIVE_MARKET_MODULE_ADDRESS,
      input: rustNativeLimitOrderGolden,
      valueLythoshi: "0",
      maxCycles: "22000",
    });
    expect(
      buildNativeSpotCreateMarketModuleCall(
        {
          owner: `0x${"10".repeat(20)}`,
          nonce: 4,
          baseAsset: `0x${"11".repeat(32)}`,
          quoteAsset: `0x${"12".repeat(32)}`,
          tickSize: "1",
          lotSize: "10",
          minQuantity: "10",
          minNotional: "100",
        },
        22_000,
      ).call.input,
    ).toBe(rustNativeCreateSpotMarketGolden);
    expect(
      buildNativeSpotCancelOrderModuleCall(
        {
          orderId: `0x${"33".repeat(32)}`,
          caller: `0x${"44".repeat(20)}`,
        },
        22_000n,
      ).call.input,
    ).toBe(rustNativeCancelOrderGolden);
    expect(
      buildNativeSpotSettleLimitOrderModuleCall(
        {
          makerOrderId: `0x${"31".repeat(32)}`,
          takerOrder: {
            marketId: nativeMarketId,
            owner: `0x${"30".repeat(20)}`,
            nonce: 6,
            side: "sell",
            price: "120",
            quantity: "25",
            expiresAtBlock: 100,
          },
        },
        22_000,
      ).call.input,
    ).toBe(rustNativeSettleLimitOrderGolden);
    expect(
      buildNativeSpotSettleRoutedLimitOrderModuleCall(
        {
          makerOrderIds: [`0x${"31".repeat(32)}`, `0x${"32".repeat(32)}`],
          takerOrder: {
            marketId: nativeMarketId,
            owner: `0x${"30".repeat(20)}`,
            nonce: 7,
            side: "sell",
            price: "120",
            quantity: "75",
            expiresAtBlock: 101,
          },
        },
        22_000,
      ).call.input,
    ).toBe(rustNativeSettleRoutedLimitOrderGolden);
    expect(
      buildNativeNftCreateListingModuleCall(
        {
          seller: `0x${"11".repeat(20)}`,
          nonce: 7,
          standard: "mrc721",
          collectionId: `0x${"22".repeat(32)}`,
          tokenId: `0x${"33".repeat(32)}`,
          quantity: "1",
          paymentAsset: `0x${"44".repeat(32)}`,
          price: "123",
          kind: "fixed-price",
          expiresAtBlock: 999,
        },
        22_000,
      ).call.input,
    ).toBe(rustNativeCreateListingGolden);
    expect(
      buildNativeNftBuyListingModuleCall(
        {
          listingId: `0x${"55".repeat(32)}`,
          buyer: `0x${"66".repeat(20)}`,
          currentBlock: 777,
        },
        22_000,
      ).call.input,
    ).toBe(rustNativeBuyListingGolden);
    expect(
      buildNativeNftCancelListingModuleCall(
        {
          listingId: `0x${"55".repeat(32)}`,
          caller: `0x${"66".repeat(20)}`,
        },
        22_000,
      ).call.input,
    ).toBe(rustNativeCancelListingGolden);
    expect(
      buildNativeNftPlaceAuctionBidModuleCall(
        {
          listingId: `0x${"77".repeat(32)}`,
          bidder: `0x${"88".repeat(20)}`,
          amount: "321",
          currentBlock: 888,
        },
        22_000,
      ).call.input,
    ).toBe(rustNativePlaceAuctionBidGolden);
    expect(
      buildNativeNftSettleAuctionModuleCall(
        {
          listingId: `0x${"77".repeat(32)}`,
          currentBlock: 999,
        },
        22_000,
      ).call.input,
    ).toBe(rustNativeSettleAuctionGolden);
    expect(
      buildNativeNftSweepExpiredListingsModuleCall(
        {
          listingIds: [`0x${"aa".repeat(32)}`, `0x${"bb".repeat(32)}`],
          currentBlock: 777,
        },
        22_000,
      ).call.input,
    ).toBe(rustNativeSweepExpiredListingsGolden);
  });

  it("encodes native market module calls as MRV forwarder input", () => {
    const envelope = buildNativeNftBuyListingModuleCall(
      {
        listingId: `0x${"55".repeat(32)}`,
        buyer: `0x${"66".repeat(20)}`,
        currentBlock: 777,
      },
      22_000,
    );
    const forwarded = encodeNativeMarketModuleForwarderInput(envelope);
    expect(forwarded).toEqual({
      requestBytes: 132,
      input:
        "0x" +
        "07000000" +
        "05000000" +
        "4d41524b45545f4e41544956455f4d4f445f5631" +
        "4800000000000000" +
        rustNativeBuyListingGolden.slice(2) +
        "00".repeat(16) +
        "f055000000000000",
    });

    expect(
      buildNativeSpotLimitOrderForwarderInput(
        {
          marketId: `0x${"11".repeat(32)}`,
          owner: `0x${"22".repeat(20)}`,
          nonce: 7,
          side: "buy",
          price: "125",
          quantity: "50",
          expiresAtBlock: 999,
        },
        22_000,
      ).requestBytes,
    ).toBe(176);
    expect(
      buildNativeSpotCreateMarketForwarderInput(
        {
          owner: `0x${"10".repeat(20)}`,
          nonce: 4,
          baseAsset: `0x${"11".repeat(32)}`,
          quoteAsset: `0x${"12".repeat(32)}`,
          tickSize: "1",
          lotSize: "10",
          minQuantity: "10",
          minNotional: "100",
        },
        22_000,
      ).requestBytes,
    ).toBe(228);
    expect(
      buildNativeSpotCancelOrderForwarderInput(
        {
          orderId: `0x${"33".repeat(32)}`,
          caller: `0x${"44".repeat(20)}`,
        },
        22_000,
      ).requestBytes,
    ).toBe(124);
    expect(
      buildNativeSpotSettleLimitOrderForwarderInput(
        {
          makerOrderId: `0x${"31".repeat(32)}`,
          takerOrder: {
            marketId: nativeMarketId,
            owner: `0x${"30".repeat(20)}`,
            nonce: 6,
            side: "sell",
            price: "120",
            quantity: "25",
            expiresAtBlock: 100,
          },
        },
        22_000,
      ).requestBytes,
    ).toBe(208);
    expect(
      buildNativeSpotSettleRoutedLimitOrderForwarderInput(
        {
          makerOrderIds: [`0x${"31".repeat(32)}`, `0x${"32".repeat(32)}`],
          takerOrder: {
            marketId: nativeMarketId,
            owner: `0x${"30".repeat(20)}`,
            nonce: 7,
            side: "sell",
            price: "120",
            quantity: "75",
            expiresAtBlock: 101,
          },
        },
        22_000,
      ).requestBytes,
    ).toBe(248);
    expect(
      buildNativeNftCreateListingForwarderInput(
        {
          seller: `0x${"11".repeat(20)}`,
          nonce: 7,
          standard: "mrc721",
          collectionId: `0x${"22".repeat(32)}`,
          tokenId: `0x${"33".repeat(32)}`,
          quantity: "1",
          paymentAsset: `0x${"44".repeat(32)}`,
          price: "123",
          kind: "fixed-price",
          expiresAtBlock: 999,
        },
        22_000,
      ).requestBytes,
    ).toBe(244);
    expect(
      buildNativeNftBuyListingForwarderInput(
        {
          listingId: `0x${"55".repeat(32)}`,
          buyer: `0x${"66".repeat(20)}`,
          currentBlock: 777,
        },
        22_000,
      ).input,
    ).toBe(forwarded.input);
    expect(
      buildNativeNftCancelListingForwarderInput(
        {
          listingId: `0x${"55".repeat(32)}`,
          caller: `0x${"66".repeat(20)}`,
        },
        22_000,
      ).requestBytes,
    ).toBe(124);
    expect(
      buildNativeNftPlaceAuctionBidForwarderInput(
        {
          listingId: `0x${"77".repeat(32)}`,
          bidder: `0x${"88".repeat(20)}`,
          amount: "321",
          currentBlock: 888,
        },
        22_000,
      ).requestBytes,
    ).toBe(148);
    expect(
      buildNativeNftSettleAuctionForwarderInput(
        {
          listingId: `0x${"77".repeat(32)}`,
          currentBlock: 999,
        },
        22_000,
      ).requestBytes,
    ).toBe(108);
    expect(
      buildNativeNftSweepExpiredListingsForwarderInput(
        {
          listingIds: [`0x${"aa".repeat(32)}`, `0x${"bb".repeat(32)}`],
          currentBlock: 777,
        },
        22_000,
      ).requestBytes,
    ).toBe(148);
  });

  it("builds fixed native-call forwarder artifact material", () => {
    const artifact = buildNativeCallForwarderArtifact(132);
    expect(artifact).toMatchObject({
      requestBytes: 132,
      artifactProfile: NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE,
      codeHash: "0x39eea2271b55df93a89e73ce5bacd383f5e6606600e9c09ea7e9da83f9114d5b",
    });
    expect(artifact.artifactBytes.startsWith("0x0100000000001800000000000000")).toBe(true);
    expect(artifact.artifactBytes).toContain("666f72776172645f63616c6c5f636f6e7472616374");
    expect(artifact.artifactBytes).toContain("6e61746976655f63616c6c5f666f72776172646572");
    expect(artifact.artifactBytes).toContain(Buffer.from(NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE).toString("hex"));
    expect(NATIVE_CALL_FORWARDER_RESPONSE_OFFSET + NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY).toBeLessThanOrEqual(
      65_536,
    );
    expect(() => buildNativeCallForwarderArtifact(0)).toThrow(/requestBytes/);
    expect(() => buildNativeCallForwarderArtifact(2048)).toThrow(/requestBytes/);
  });

  it("rejects malformed market action inputs", () => {
    expect(() => encodePlaceLimitOrderCalldata({ ...args, marketId: "0x1234" })).toThrow(MarketActionError);
    expect(() =>
      encodePlaceLimitOrderCalldata({ ...args, marketId: `0x${"00".repeat(32)}` }),
    ).toThrow(/marketId/);
    expect(() => encodePlaceLimitOrderCalldata({ ...args, side: "ask" as "buy" })).toThrow(/side/);
    expect(() => encodePlaceLimitOrderCalldata({ ...args, price: "0" })).toThrow(/price/);
    expect(() => encodePlaceLimitOrderCalldata({ ...args, price: "1.25" })).toThrow(/price/);
    expect(() => encodePlaceLimitOrderCalldata({ ...args, quantity: "-1" })).toThrow(/quantity/);
    expect(() => encodePlaceLimitOrderCalldata({ ...args, expiryBlock: -1 })).toThrow(/expiryBlock/);
    expect(() => encodePlaceLimitOrderCalldata({ ...args, expiryBlock: 0x1_0000_0000_0000_0000n })).toThrow(
      /expiryBlock/,
    );
    expect(() => encodePlaceMarketOrderCalldata({ ...args, maxSlippageBps: 10_000 })).toThrow(/maxSlippageBps/);
    expect(() =>
      encodePlaceMarketOrderExCalldata({ ...args, maxSlippageBps: 250, mode: "rest" as "fill-or-refund" }),
    ).toThrow(/mode/);
    expect(() => encodeCancelOrderCalldata({ orderId: "0x1234" })).toThrow(/orderId/);

    expect(() =>
      encodeNativeSpotLimitOrderCall({
        marketId: "0x1234",
        owner: `0x${"22".repeat(20)}`,
        nonce: 7,
        side: "buy",
        price: "125",
        quantity: "50",
        expiresAtBlock: 999,
      }),
    ).toThrow(MarketActionError);
    expect(() =>
      encodeNativeSpotLimitOrderCall({
        marketId: `0x${"11".repeat(32)}`,
        owner: new Uint8Array(19),
        nonce: 7,
        side: "buy",
        price: "125",
        quantity: "50",
        expiresAtBlock: 999,
      }),
    ).toThrow(/owner/);
    expect(() =>
      encodeNativeSpotLimitOrderCall({
        marketId: `0x${"11".repeat(32)}`,
        owner: `0x${"22".repeat(20)}`,
        nonce: 7,
        side: "buy",
        price: (1n << 128n).toString(),
        quantity: "50",
        expiresAtBlock: 999,
      }),
    ).toThrow(/price/);
    expect(() =>
      encodeNativeSpotCreateMarketCall({
        owner: `0x${"10".repeat(20)}`,
        nonce: 4,
        baseAsset: `0x${"11".repeat(32)}`,
        quoteAsset: `0x${"12".repeat(32)}`,
        tickSize: "0",
        lotSize: "10",
        minQuantity: "10",
        minNotional: "100",
      }),
    ).toThrow(/tickSize/);
    expect(() =>
      encodeNativeSpotSettleRoutedLimitOrderCall({
        makerOrderIds: [],
        takerOrder: {
          marketId: nativeMarketId,
          owner: `0x${"30".repeat(20)}`,
          nonce: 7,
          side: "sell",
          price: "120",
          quantity: "75",
          expiresAtBlock: 101,
        },
      }),
    ).toThrow(/makerOrderIds/);
    expect(() =>
      encodeNativeSpotCancelOrderCall({
        orderId: `0x${"33".repeat(32)}`,
        caller: { kind: "user", address: addressToTypedBech32("contract", `0x${"44".repeat(20)}`) },
      }),
    ).toThrow(/caller/);
    expect(() =>
      encodeNativeNftCreateListingCall({
        seller: `0x${"11".repeat(20)}`,
        nonce: 7,
        standard: "erc721" as "mrc721",
        collectionId: `0x${"22".repeat(32)}`,
        tokenId: `0x${"33".repeat(32)}`,
        quantity: "1",
        paymentAsset: `0x${"44".repeat(32)}`,
        price: "123",
        kind: "fixed-price",
        expiresAtBlock: 999,
      }),
    ).toThrow(/standard/);
    expect(() =>
      encodeNativeNftCreateListingCall({
        seller: `0x${"11".repeat(20)}`,
        nonce: 7,
        standard: "mrc721",
        collectionId: `0x${"22".repeat(32)}`,
        tokenId: `0x${"33".repeat(32)}`,
        quantity: "0",
        paymentAsset: `0x${"44".repeat(32)}`,
        price: "123",
        kind: "fixed-price",
        expiresAtBlock: 999,
      }),
    ).toThrow(/quantity/);
    expect(() =>
      encodeNativeNftCreateListingCall({
        seller: `0x${"11".repeat(20)}`,
        nonce: 7,
        standard: "mrc721",
        collectionId: `0x${"22".repeat(32)}`,
        tokenId: `0x${"33".repeat(32)}`,
        quantity: "1",
        paymentAsset: `0x${"44".repeat(32)}`,
        price: "123",
        kind: { english: { reserve: "100", endBlock: 555, minBidIncrementBps: 10_000 } },
        expiresAtBlock: 999,
      }),
    ).toThrow(/minBidIncrementBps/);
    expect(() =>
      encodeNativeNftBuyListingCall({
        listingId: `0x${"55".repeat(32)}`,
        buyer: `0x${"66".repeat(20)}`,
        currentBlock: -1,
      }),
    ).toThrow(/currentBlock/);
    expect(() =>
      encodeNativeNftCancelListingCall({
        listingId: "0x1234",
        caller: `0x${"66".repeat(20)}`,
      }),
    ).toThrow(/listingId/);
    expect(() =>
      encodeNativeNftPlaceAuctionBidCall({
        listingId: `0x${"77".repeat(32)}`,
        bidder: `0x${"88".repeat(20)}`,
        amount: "0",
        currentBlock: 888,
      }),
    ).toThrow(/amount/);
    expect(() =>
      encodeNativeNftSettleAuctionCall({
        listingId: `0x${"77".repeat(32)}`,
        currentBlock: -1,
      }),
    ).toThrow(/currentBlock/);
    expect(() =>
      encodeNativeNftSweepExpiredListingsCall({
        listingIds: [],
        currentBlock: 777,
      }),
    ).toThrow(/listingIds/);
    expect(() =>
      encodeNativeNftSweepExpiredListingsCall({
        listingIds: [`0x${"aa".repeat(31)}`],
        currentBlock: 777,
      }),
    ).toThrow(/listingIds\[0\]/);
    expect(() => buildNativeMarketModuleCallEnvelope("0xabc", 1)).toThrow(/input/);
    expect(() => buildNativeMarketModuleCallEnvelope("0x", -1)).toThrow(/maxCycles/);
    expect(() =>
      encodeNativeMarketModuleForwarderInput({
        module: "market",
        call: {
          to: PRECOMPILE_ADDRESSES.CLOB,
          input: rustNativeBuyListingGolden,
          valueLythoshi: "0",
          maxCycles: "22000",
        },
      }),
    ).toThrow(/market system module/);
    expect(() =>
      encodeNativeMarketModuleForwarderInput({
        module: "market",
        call: {
          to: NATIVE_MARKET_MODULE_ADDRESS,
          input: rustNativeBuyListingGolden,
          valueLythoshi: "1" as "0",
          maxCycles: "22000",
        },
      }),
    ).toThrow(/valueLythoshi/);
  });
});
