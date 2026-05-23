import { describe, expect, it } from "vitest";
import {
  CLOB_MARKET_ID_DOMAIN_TAG,
  CLOB_SELECTORS,
  MarketActionError,
  PRECOMPILE_ADDRESSES,
  buildCancelSpotOrderPlan,
  buildPlaceSpotLimitOrderPlan,
  buildPlaceSpotMarketOrderExPlan,
  buildPlaceSpotMarketOrderPlan,
  clobAddressHex,
  deriveClobMarketId,
  encodeCancelOrderCalldata,
  encodePlaceLimitOrderCalldata,
  encodePlaceMarketOrderCalldata,
  encodePlaceMarketOrderExCalldata,
  type PlaceSpotLimitOrderArgs,
} from "../src/index.js";
import { MempoolClass } from "../src/crypto/index.js";

const baseTokenId = `0x${"a1".repeat(32)}`;
const quoteTokenId = `0x${"a2".repeat(32)}`;
const marketId = deriveClobMarketId(baseTokenId, quoteTokenId);

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
  });
});
