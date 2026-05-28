import { describe, expect, it } from "vitest";
import {
  DELEGATION_REVERT_TAGS,
  DELEGATION_SELECTORS,
  DelegationPrecompileError,
  PRECOMPILE_ADDRESSES,
  delegationAddressHex,
  encodeClaimCalldata,
  encodeCompleteRedemptionCalldata,
  encodeDelegateCalldata,
  encodeRedelegateCalldata,
  encodeSetAutoCompoundCalldata,
  encodeUndelegateCalldata,
  isRedemptionPrincipalUnavailableRevert,
} from "../src/index.js";

describe("delegation precompile ABI helpers", () => {
  it("exports selectors pinned to mono-core", () => {
    expect(DELEGATION_SELECTORS).toEqual({
      delegate: "0x662337de",
      undelegate: "0x914f3ca8",
      redelegate: "0xa06ac18f",
      claim: "0x4e71d92d",
      setAutoCompound: "0x86593454",
      completeRedemption: "0x26169d0a",
    });
  });

  it("encodes delegate / undelegate / redelegate / claim calldata", () => {
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

  it("exports redemption revert tags pinned to mono-core", () => {
    expect(DELEGATION_REVERT_TAGS).toEqual({
      redemptionQueueFull: "0x020e",
      redemptionTicketNotFound: "0x020f",
      redemptionNotMature: "0x0210",
      redemptionPrincipalUnavailable: "0x0211",
    });
    expect(isRedemptionPrincipalUnavailableRevert("0x0211")).toBe(true);
    expect(isRedemptionPrincipalUnavailableRevert(new Uint8Array([0x02, 0x11]))).toBe(true);
    expect(isRedemptionPrincipalUnavailableRevert("0x0210")).toBe(false);
  });

  it("exports the delegation precompile address", () => {
    expect(PRECOMPILE_ADDRESSES.DELEGATION).toBe(
      "0x000000000000000000000000000000000000100A",
    );
    expect(delegationAddressHex()).toBe("0x000000000000000000000000000000000000100a");
  });

  it("encodes completeRedemption(uint64) calldata", () => {
    expect(encodeCompleteRedemptionCalldata(42)).toBe(
      "0x26169d0a000000000000000000000000000000000000000000000000000000000000002a",
    );
    expect(encodeCompleteRedemptionCalldata("0x2a")).toBe(
      encodeCompleteRedemptionCalldata(42n),
    );
  });

  it("rejects invalid redemption ticket indexes", () => {
    expect(() => encodeCompleteRedemptionCalldata(-1)).toThrow(DelegationPrecompileError);
    expect(() => encodeCompleteRedemptionCalldata(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      DelegationPrecompileError,
    );
    expect(() => encodeCompleteRedemptionCalldata("nope")).toThrow(DelegationPrecompileError);
    expect(() => encodeCompleteRedemptionCalldata(0x1_0000_0000_0000_0000n)).toThrow(
      DelegationPrecompileError,
    );
  });
});
