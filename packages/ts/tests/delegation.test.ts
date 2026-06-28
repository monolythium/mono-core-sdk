import { keccak_256 } from "@noble/hashes/sha3.js";
import { describe, expect, it } from "vitest";
import {
  CLAIMED_EVENT_SIG,
  CLAIMED_EVENT_TOPIC0,
  DELEGATION_REVERT_TAGS,
  DELEGATION_SELECTORS,
  DelegationPrecompileError,
  PRECOMPILE_ADDRESSES,
  decodeClaimedEvent,
  delegationAddressHex,
  encodeClaimCalldata,
  encodeDelegateCalldata,
  encodeRedelegateCalldata,
  encodeSetAutoCompoundCalldata,
  encodeUndelegateCalldata,
  isUnexpectedValueRevert,
} from "../src/index.js";

describe("delegation precompile ABI helpers (non-custodial)", () => {
  it("exports selectors pinned to mono-core", () => {
    expect(DELEGATION_SELECTORS).toEqual({
      delegate: "0x662337de",
      undelegate: "0x914f3ca8",
      redelegate: "0xa06ac18f",
      claim: "0x4e71d92d",
      setAutoCompound: "0x86593454",
    });
  });

  it("encodes delegate / undelegate / redelegate / claim calldata", () => {
    // delegate carries no native value — `weightBps` is a fraction of the
    // caller's live balance (max 10_000 = 100%); the tx is sent with value = 0.
    expect(encodeDelegateCalldata(0, 10_000)).toBe(
      "0x662337de" +
        "0000000000000000000000000000000000000000000000000000000000000000" +
        "0000000000000000000000000000000000000000000000000000000000002710",
    );
    expect(encodeUndelegateCalldata(1)).toBe(
      "0x914f3ca8" +
        "0000000000000000000000000000000000000000000000000000000000000001",
    );
    expect(encodeRedelegateCalldata(0, 1, 5_000)).toBe(
      "0xa06ac18f" +
        "0000000000000000000000000000000000000000000000000000000000000000" +
        "0000000000000000000000000000000000000000000000000000000000000001" +
        "0000000000000000000000000000000000000000000000000000000000001388",
    );
    expect(encodeClaimCalldata()).toBe("0x4e71d92d");
    expect(encodeSetAutoCompoundCalldata(true)).toBe(
      "0x86593454" +
        "0000000000000000000000000000000000000000000000000000000000000001",
    );
    expect(encodeSetAutoCompoundCalldata(false)).toBe(
      "0x86593454" +
        "0000000000000000000000000000000000000000000000000000000000000000",
    );
  });

  it("rejects out-of-range cluster + weight inputs", () => {
    expect(() => encodeDelegateCalldata(-1, 100)).toThrow(DelegationPrecompileError);
    expect(() => encodeDelegateCalldata(0, 10_001)).not.toThrow();
    expect(() => encodeDelegateCalldata(0xffff_ffff_ffffn, 100)).toThrow(DelegationPrecompileError);
  });

  it("exports the unexpected-value revert tag pinned to mono-core", () => {
    expect(DELEGATION_REVERT_TAGS).toEqual({
      unexpectedValue: "0x020e",
    });
    expect(isUnexpectedValueRevert("0x020e")).toBe(true);
    expect(isUnexpectedValueRevert(new Uint8Array([0x02, 0x0e]))).toBe(true);
    expect(isUnexpectedValueRevert("0x0210")).toBe(false);
  });

  it("exports the delegation precompile address", () => {
    expect(PRECOMPILE_ADDRESSES.DELEGATION).toBe(
      "0x000000000000000000000000000000000000100A",
    );
    expect(delegationAddressHex()).toBe("0x000000000000000000000000000000000000100a");
  });
});

describe("Claimed event decoder", () => {
  const word = (hex: string): Uint8Array => {
    const body = hex.replace(/^0x/, "").padStart(64, "0");
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  };
  const concat = (...parts: Uint8Array[]): Uint8Array => {
    const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
    let offset = 0;
    for (const p of parts) {
      out.set(p, offset);
      offset += p.length;
    }
    return out;
  };
  const wallet = "0x4242424242424242424242424242424242424242";
  const walletTopic = `0x${"0".repeat(24)}${wallet.slice(2)}`;

  it("pins CLAIMED_EVENT_TOPIC0 to keccak256 of the signature", () => {
    const want = `0x${[...keccak_256(new TextEncoder().encode(CLAIMED_EVENT_SIG))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
    expect(CLAIMED_EVENT_TOPIC0).toBe(want);
  });

  it("round-trips a hand-built Claimed log", () => {
    const data = concat(word("0x3b9aca00"), word("0x1")); // amount = 1_000_000_000, autoCompound = true
    const decoded = decodeClaimedEvent([CLAIMED_EVENT_TOPIC0, walletTopic], data);
    expect(decoded.delegator).toBe(wallet);
    expect(decoded.amount).toBe(1_000_000_000n);
    expect(decoded.autoCompound).toBe(true);
  });

  it("decodes autoCompound = false", () => {
    const data = concat(word("0x0"), word("0x0"));
    const decoded = decodeClaimedEvent([CLAIMED_EVENT_TOPIC0, walletTopic], data);
    expect(decoded.amount).toBe(0n);
    expect(decoded.autoCompound).toBe(false);
  });

  it("throws on wrong topic count", () => {
    const data = concat(word("0x1"), word("0x1"));
    expect(() => decodeClaimedEvent([CLAIMED_EVENT_TOPIC0], data)).toThrow(DelegationPrecompileError);
  });

  it("throws on an unexpected topic0", () => {
    const data = concat(word("0x1"), word("0x1"));
    const badTopic0 = `0x${"00".repeat(32)}`;
    expect(() => decodeClaimedEvent([badTopic0, walletTopic], data)).toThrow(/topic0/);
  });

  it("throws on short data", () => {
    expect(() => decodeClaimedEvent([CLAIMED_EVENT_TOPIC0, walletTopic], word("0x1"))).toThrow(
      DelegationPrecompileError,
    );
  });
});
