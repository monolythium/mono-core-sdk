import { describe, expect, it } from "vitest";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { ORACLE_EVENT_SIGS, decodeOracleEvent, oracleAddressHex } from "../src/index.js";

const topic0 = (sig: string) =>
  `0x${[...keccak_256(new TextEncoder().encode(sig))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
const topicU64 = (v: number) => {
  const out = new Uint8Array(32);
  let n = BigInt(v);
  for (let i = 31; i >= 24; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
};
const word = (v: number) => topicU64(v);
const topicAddr = (byte: number) => {
  const out = new Uint8Array(32);
  out.fill(byte, 12, 32);
  return out;
};

describe("oracle event decode (MB-6)", () => {
  it("exposes the oracle precompile address (0x1009)", () => {
    expect(oracleAddressHex()).toBe("0x0000000000000000000000000000000000001009");
  });

  it("decodes OracleRoundFinalized round-trip", () => {
    const feed = `0x${"11".repeat(32)}`;
    const topics = [topic0(ORACLE_EVENT_SIGS.oracleRoundFinalized), feed, topicU64(42)];
    const data = new Uint8Array(96);
    data.set(word(60000), 0);
    data.set(word(99), 32);
    data.set(word(3), 64);
    const ev = decodeOracleEvent(topics, data);
    expect(ev).toEqual({
      kind: "roundFinalized",
      feedId: feed,
      roundId: 42n,
      computedMedian: "60000",
      finalizedAtBlock: 99n,
      observationsLen: 3,
    });
  });

  it("decodes ObservationSubmitted round-trip", () => {
    const feed = `0x${"22".repeat(32)}`;
    const topics = [
      topic0(ORACLE_EVENT_SIGS.observationSubmitted),
      feed,
      topicU64(7),
      topicAddr(0x33),
    ];
    const data = new Uint8Array(64);
    data.set(word(123), 0);
    data.set(word(1700), 32);
    const ev = decodeOracleEvent(topics, data);
    expect(ev).toEqual({
      kind: "observationSubmitted",
      feedId: feed,
      roundId: 7n,
      writer: `0x${"33".repeat(20)}`,
      value: "123",
      observedAt: 1700n,
    });
  });

  it("decodes FeedAdded / writer events", () => {
    const feed = `0x${"44".repeat(32)}`;
    const data = new Uint8Array(128);
    data.set(word(8), 0); // decimals
    data.set(word(4), 32); // minSigners
    data.set(word(500), 64); // circuitBreakerBps
    data.set(word(7), 96); // allowedWritersLen
    const added = decodeOracleEvent([topic0(ORACLE_EVENT_SIGS.feedAdded), feed], data);
    expect(added).toEqual({
      kind: "feedAdded",
      feedId: feed,
      decimals: 8,
      minSigners: 4,
      circuitBreakerBps: 500,
      allowedWritersLen: 7,
    });
    const writer = decodeOracleEvent(
      [topic0(ORACLE_EVENT_SIGS.oracleWriterAdded), topicAddr(0xa1), topicAddr(0xb2)],
      new Uint8Array(0),
    );
    expect(writer).toEqual({
      kind: "writerAdded",
      admin: `0x${"a1".repeat(20)}`,
      writer: `0x${"b2".repeat(20)}`,
    });
  });

  it("rejects foreign topic0, missing topics, and wrong arity", () => {
    expect(() => decodeOracleEvent([], new Uint8Array(0))).toThrow();
    expect(() => decodeOracleEvent([topic0("SomethingElse(uint256)")], new Uint8Array(0))).toThrow();
    expect(() =>
      decodeOracleEvent(
        [topic0(ORACLE_EVENT_SIGS.oracleRoundFinalized), `0x${"11".repeat(32)}`],
        new Uint8Array(96),
      ),
    ).toThrow(/expected 3 topics/);
  });
});
