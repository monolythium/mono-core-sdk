import { describe, expect, it } from "vitest";
import {
  OPERATOR_ROUTER_ADDRESS,
  OPERATOR_ROUTER_EVENT_SIGS,
  OPERATOR_ROUTER_SELECTORS,
  OPERATOR_ROUTER_SIGS,
  PRECOMPILE_ADDRESSES,
  PROTOCOL_MAX_OPERATOR_FEE_BPS,
  addressToTypedBech32,
  buildPlaceLimitOrderViaPlan,
  decodeOperatorFeeChargedEvent,
  encodePlaceLimitOrderViaCalldata,
  quoteOperatorFee,
  type PlaceLimitOrderViaArgs,
} from "../src/index.js";

const hex32 = (byte: string) => `0x${byte.repeat(32)}`;
const userAddr = (byte: string) =>
  addressToTypedBech32("user", `0x${byte.repeat(20)}`);

const baseArgs = (): PlaceLimitOrderViaArgs => ({
  operator: userAddr("ab"),
  base: hex32("11"),
  quote: hex32("22"),
  side: "sell",
  price: "5",
  amount: "100",
  expiresAtBlock: 7,
});

describe("operator-router surface", () => {
  it("pins the router address + protocol fee ceiling", () => {
    expect(OPERATOR_ROUTER_ADDRESS).toBe(
      "0x000000000000000000000000000000000000100B",
    );
    expect(OPERATOR_ROUTER_ADDRESS).toBe(PRECOMPILE_ADDRESSES.OPERATOR_ROUTER);
    expect(PROTOCOL_MAX_OPERATOR_FEE_BPS).toBe(100);
  });

  it("derives distinct router selectors", () => {
    const all = Object.values(OPERATOR_ROUTER_SELECTORS);
    expect(new Set(all).size).toBe(all.length);
    for (const sel of all) expect(sel).toMatch(/^0x[0-9a-f]{8}$/);
    // placeLimitOrderVia signature is the one wallets care about.
    expect(OPERATOR_ROUTER_SIGS.placeLimitOrderVia).toBe(
      "placeLimitOrderVia(address,bytes32,bytes32,uint8,uint256,uint256,uint64)",
    );
  });

  it("encodes placeLimitOrderVia calldata with the operator word prefix", () => {
    const data = encodePlaceLimitOrderViaCalldata(baseArgs());
    const bytes = Uint8Array.from(
      data
        .slice(2)
        .match(/.{2}/g)!
        .map((b) => Number.parseInt(b, 16)),
    );
    // selector + 7 ABI words.
    expect(bytes.length).toBe(4 + 7 * 32);
    expect(data.slice(0, 10)).toBe(OPERATOR_ROUTER_SELECTORS.placeLimitOrderVia);
    // operator word (word 0): 12 zero bytes then the 20-byte address.
    expect([...bytes.slice(4, 16)]).toEqual(new Array(12).fill(0));
    expect([...bytes.slice(16, 36)]).toEqual(new Array(20).fill(0xab));
    // word layout after selector: operator|base|quote|side|price|amount|expiresAtBlock.
    // side byte (sell = 1) right-aligned in word 3.
    expect(bytes[4 + 3 * 32 + 31]).toBe(1);
    // price low byte (word 4).
    expect(bytes[4 + 4 * 32 + 31]).toBe(5);
    // amount low byte (word 5).
    expect(bytes[4 + 5 * 32 + 31]).toBe(100);
    // expiresAtBlock low byte (word 6).
    expect(bytes[4 + 6 * 32 + 31]).toBe(7);
  });

  it("mirrors the CLOB placeLimitOrder arg block after the operator word", () => {
    // The router strips the operator word and forwards the remaining 6
    // words unchanged to the CLOB, so the tail must equal a direct
    // placeLimitOrder calldata's arg block (everything after its selector).
    const via = encodePlaceLimitOrderViaCalldata(baseArgs());
    const viaBytes = Uint8Array.from(
      via
        .slice(2)
        .match(/.{2}/g)!
        .map((b) => Number.parseInt(b, 16)),
    );
    // tail = base|quote|side|price|amount|expiresAtBlock (6 words).
    const tail = viaBytes.slice(4 + 32);
    expect(tail.length).toBe(6 * 32);
    expect([...tail.slice(0, 32)]).toEqual(new Array(32).fill(0x11));
    expect([...tail.slice(32, 64)]).toEqual(new Array(32).fill(0x22));
  });

  it("computes the declared operator fee (quoteBasis * feeBps / 10000)", () => {
    const fee = quoteOperatorFee(
      { operator: userAddr("ab"), price: "1000", amount: "1000" },
      100,
    );
    expect(fee.quoteBasis).toBe("1000000");
    expect(fee.feeAmount).toBe("10000"); // 1.00% of 1_000_000.
    expect(fee.feeBps).toBe(100);
    // 0 bps → no fee.
    expect(
      quoteOperatorFee({ operator: userAddr("ab"), price: "1000", amount: "1000" }, 0)
        .feeAmount,
    ).toBe("0");
  });

  it("rejects a fee above the protocol ceiling", () => {
    expect(() =>
      quoteOperatorFee({ operator: userAddr("ab"), price: "1", amount: "1" }, 101),
    ).toThrow();
  });

  it("attaches the declared operator fee + targets 0x100B in the plan", () => {
    const plan = buildPlaceLimitOrderViaPlan(baseArgs(), 50);
    expect(plan.method).toBe("eth_sendTransaction");
    expect(plan.params[0].to).toBe(OPERATOR_ROUTER_ADDRESS);
    expect(plan.params[0].value).toBe("0x0");
    // quoteBasis = 5 * 100 = 500; 0.50% of 500 = 2.5 → floors to 2.
    expect(plan.operatorFee.quoteBasis).toBe("500");
    expect(plan.operatorFee.feeAmount).toBe("2");
    expect(plan.operatorFee.feeBps).toBe(50);
  });

  it("decodes an OperatorFeeCharged log round-trip", () => {
    const operator = "ab";
    const user = "bb";
    const recipient = "dd";
    const topic0 = topicHash(OPERATOR_ROUTER_EVENT_SIGS.operatorFeeCharged);
    const topics = [
      topic0,
      addrTopic(operator),
      addrTopic(user),
      hex32("c1"), // marketId
    ];
    const data =
      "0x" +
      // recipient (left-padded), quoteToken, feeAmount=12345, clobOrderId.
      "00".repeat(12) +
      recipient.repeat(20) +
      "ee".repeat(32) +
      u256Hex(12345n) +
      "ff".repeat(32);
    const ev = decodeOperatorFeeChargedEvent(topics, data);
    expect(ev.operator).toBe(`0x${operator.repeat(20)}`);
    expect(ev.user).toBe(`0x${user.repeat(20)}`);
    expect(ev.marketId).toBe(hex32("c1"));
    expect(ev.recipient).toBe(`0x${recipient.repeat(20)}`);
    expect(ev.feeAmount).toBe("12345");
    expect(ev.clobOrderId).toBe(hex32("ff"));
  });

  it("rejects a foreign topic0 on the fee-charged decoder", () => {
    expect(() =>
      decodeOperatorFeeChargedEvent([hex32("00"), hex32("00"), hex32("00"), hex32("00")], "0x" + "00".repeat(128)),
    ).toThrow();
  });
});

// ---- helpers ----

import { keccak_256 } from "@noble/hashes/sha3.js";

function topicHash(sig: string): string {
  return (
    "0x" +
    [...keccak_256(new TextEncoder().encode(sig))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function addrTopic(byte: string): string {
  return `0x${"00".repeat(12)}${byte.repeat(20)}`;
}

function u256Hex(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}
