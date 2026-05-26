import { describe, expect, it } from "vitest";
import {
  DELEGATION_REVERT_TAGS,
  DELEGATION_SELECTORS,
  DelegationPrecompileError,
  PRECOMPILE_ADDRESSES,
  delegationAddressHex,
  encodeCompleteRedemptionCalldata,
  isRedemptionPrincipalUnavailableRevert,
} from "../src/index.js";

describe("delegation precompile ABI helpers", () => {
  it("exports selectors pinned to mono-core", () => {
    expect(DELEGATION_SELECTORS).toEqual({
      completeRedemption: "0x26169d0a",
    });
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
