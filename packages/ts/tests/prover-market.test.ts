import { describe, expect, it } from "vitest";
import {
  PRECOMPILE_ADDRESSES,
  PROVER_MARKET_ADDRESS,
  PROVER_MARKET_SELECTORS,
  SERVES_GPU_PROVE,
  bidSighash,
  encodeCreateRequestCalldata,
  encodeCreateRequestCanonical,
  proverMarketStateFromByte,
  requestSighash,
  submitSighash,
} from "../src/index.js";

const hex32 = (byte: string) => `0x${byte.repeat(32)}`;

describe("prover-market helpers (MB-4)", () => {
  it("exposes the SERVES_GPU_PROVE bit (0x0200)", () => {
    expect(SERVES_GPU_PROVE).toBe(0x0000_0200);
    expect(SERVES_GPU_PROVE).toBe(1 << 9);
  });

  it("pins the final registered prover-market address (0x100C)", () => {
    // The earlier first-pass tentative 0x1110 guess is retired; the
    // prover market binds at the platform extension band's 0x100C slot.
    expect(PROVER_MARKET_ADDRESS).toBe(
      "0x000000000000000000000000000000000000100C",
    );
    expect(PROVER_MARKET_ADDRESS).toBe(PRECOMPILE_ADDRESSES.PROVER_MARKET);
  });

  it("derives distinct selectors for the six ops", () => {
    const all = Object.values(PROVER_MARKET_SELECTORS);
    expect(new Set(all).size).toBe(all.length);
    expect(PROVER_MARKET_SELECTORS.createRequest).toMatch(/^0x[0-9a-f]{8}$/);
  });

  it("decodes the state machine bytes", () => {
    expect(proverMarketStateFromByte(0)).toBe("open");
    expect(proverMarketStateFromByte(1)).toBe("assigned");
    expect(proverMarketStateFromByte(2)).toBe("settled");
    expect(proverMarketStateFromByte(3)).toBe("slashed");
    expect(proverMarketStateFromByte(4)).toBe("expired");
    expect(proverMarketStateFromByte(99)).toBeNull();
  });

  it("computes domain-separated sighashes", () => {
    const vk = hex32("44");
    const ih = hex32("45");
    const base = requestSighash(vk, ih, 1000n, 100n, 1n);
    expect(base).not.toBe(requestSighash(vk, ih, 2000n, 100n, 1n));
    const id = hex32("07");
    expect(bidSighash(id, 100n)).not.toBe(submitSighash(id, hex32("08")));
  });

  it("encodes the createRequest canonical payload + calldata at canonical lengths", () => {
    const args = {
      buyer: `0x${"11".repeat(20)}`,
      buyerPubkey: new Uint8Array(1952).fill(0x22),
      vkeyHash: hex32("44"),
      inputsHash: hex32("45"),
      maxFee: "1000000000000000000",
      deadline: 2_000_000_000n,
      nonce: 42n,
      sig: new Uint8Array(3309).fill(0x66),
    };
    const canonical = encodeCreateRequestCanonical(args);
    // 20 + 2 + 1952 + 32 + 32 + 16 + 8 + 8 + 2 + 3309 = 5381.
    expect((canonical.length - 2) / 2).toBe(5381);
    const calldata = encodeCreateRequestCalldata(args);
    expect(calldata.startsWith(PROVER_MARKET_SELECTORS.createRequest)).toBe(true);
    // 4 selector + 32 offset + 32 len + ceil(5381/32)*32 (=5408).
    expect((calldata.length - 2) / 2).toBe(4 + 32 + 32 + 5408);
  });

  it("rejects out-of-range pubkey / sig lengths", () => {
    const base = {
      buyer: `0x${"11".repeat(20)}`,
      vkeyHash: hex32("44"),
      inputsHash: hex32("45"),
      maxFee: 1n,
      deadline: 1n,
      nonce: 1n,
    };
    expect(() =>
      encodeCreateRequestCanonical({ ...base, buyerPubkey: new Uint8Array(0), sig: new Uint8Array(10) }),
    ).toThrow(/buyerPubkey/);
    expect(() =>
      encodeCreateRequestCanonical({ ...base, buyerPubkey: new Uint8Array(10), sig: new Uint8Array(0) }),
    ).toThrow(/sig/);
  });
});
