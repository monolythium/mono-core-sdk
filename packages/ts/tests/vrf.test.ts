import { describe, expect, it } from "vitest";
import {
  PRECOMPILE_ADDRESSES,
  VRF_DOMAIN_TAG_MAX_BYTES,
  VRF_HEIGHT_NOT_FINALIZED_REVERT,
  VRF_OUTPUT_BYTES,
  decodeVrfOutput,
  encodeVrfEvaluateCalldata,
  vrfAddressHex,
} from "../src/index.js";

describe("VRF precompile helpers", () => {
  it("exports the canonical address and revert text", () => {
    expect(PRECOMPILE_ADDRESSES.VRF).toBe("0x0000000000000000000000000000000000001101");
    expect(vrfAddressHex()).toBe("0x0000000000000000000000000000000000001101");
    expect(VRF_OUTPUT_BYTES).toBe(32);
    expect(VRF_DOMAIN_TAG_MAX_BYTES).toBe(256);
    expect(VRF_HEIGHT_NOT_FINALIZED_REVERT).toBe("vrf: height not finalized");
  });

  it("encodes selectorless finalized-height calldata", () => {
    expect(encodeVrfEvaluateCalldata(42, "dice")).toBe(
      "0x000000000000000000000000000000000000000000000000000000000000002a64696365",
    );
    expect(encodeVrfEvaluateCalldata("0x2a", "0x0102")).toBe(
      "0x000000000000000000000000000000000000000000000000000000000000002a0102",
    );
  });

  it("rejects non-finalizable calldata shapes before they hit RPC", () => {
    expect(() => encodeVrfEvaluateCalldata(-1)).toThrow(/uint64/);
    expect(() => encodeVrfEvaluateCalldata(1n << 64n)).toThrow(/uint64/);
    expect(() => encodeVrfEvaluateCalldata(1, new Uint8Array(257))).toThrow(/domainTag/);
  });

  it("decodes the 32-byte randomness output", () => {
    const out = decodeVrfOutput(`0x${"ab".repeat(32)}`);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out).toHaveLength(32);
    expect([...out]).toEqual(new Array(32).fill(0xab));
    expect(() => decodeVrfOutput("0x1234")).toThrow(/32 bytes/);
  });
});
