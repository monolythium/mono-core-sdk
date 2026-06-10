import { describe, expect, it } from "vitest";
import {
  DELEGATION_REVERT_TAGS,
  DELEGATION_SELECTORS,
  DelegationPrecompileError,
  PRECOMPILE_ADDRESSES,
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
