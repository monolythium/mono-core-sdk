import { describe, expect, it } from "vitest";
import {
  API_STREAM_TOPICS,
  NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC,
  assertNativeMarketOrderBookStreamPayload,
  isNativeMarketOrderBookStreamPayload,
} from "../src/index.js";
import type { NativeMarketOrderBookStreamPayload } from "../src/index.js";

describe("stream topic models", () => {
  it("includes nativeMarketOrderBook in the API stream topic catalogue", () => {
    expect(NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC).toBe("nativeMarketOrderBook");
    expect(API_STREAM_TOPICS).toContain("nativeMarketOrderBook");
  });

  it("validates nativeMarketOrderBook payload shape", () => {
    const payload = {
      marketId: `0x${"11".repeat(32)}`,
      orderId: `0x${"22".repeat(32)}`,
      relatedOrderId: `0x${"33".repeat(32)}`,
      eventName: "market.spot.order_settled",
      action: "remove",
      side: "bid",
      price: "100",
      quantity: "5",
      remaining: "0",
      status: "filled",
      blockHeight: 12,
      txIndex: 0,
      logIndex: 2,
    } satisfies NativeMarketOrderBookStreamPayload;

    expect(isNativeMarketOrderBookStreamPayload(payload)).toBe(true);
    expect(() => assertNativeMarketOrderBookStreamPayload(payload)).not.toThrow();
    expect(
      isNativeMarketOrderBookStreamPayload({
        ...payload,
        action: "update",
      }),
    ).toBe(false);
    expect(
      isNativeMarketOrderBookStreamPayload({
        ...payload,
        market_id: payload.marketId,
        marketId: undefined,
      }),
    ).toBe(false);
  });
});
