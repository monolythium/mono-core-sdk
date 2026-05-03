import { describe, expect, it } from "vitest";
import {
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  PRECOMPILE_ADDRESSES,
  SET_POLICY_CLAIM_DOMAIN_TAG,
  SPENDING_POLICY_SELECTORS,
  composeClaimBoundMessage,
  encodeDisableCalldata,
  encodeEnableCalldata,
  encodeSetPolicyCalldata,
  encodeSetPolicyClaimCalldata,
  spendingPolicyAddressHex,
  type SpendingPolicyArgs,
} from "../src/index.js";

const args: SpendingPolicyArgs = {
  subAccount: "0x1111111111111111111111111111111111111111",
  principal: "0x2222222222222222222222222222222222222222",
  dailyCapWei: 100n,
  perTxCapWei: 7n,
  allowRoot: `0x${"aa".repeat(32)}`,
  denyRoot: `0x${"bb".repeat(32)}`,
};

describe("spending policy ABI helpers", () => {
  it("exports selectors pinned to mono-core", () => {
    expect(SPENDING_POLICY_SELECTORS).toEqual({
      setPolicy: "0xd6a518b2",
      setPolicyClaim: "0x08d78f9c",
      enable: "0x5bfa1b68",
      disable: "0xe6c09edf",
      recordSpend: "0xdca04292",
    });
  });

  it("exports the spending-policy precompile address", () => {
    expect(PRECOMPILE_ADDRESSES.SPENDING_POLICY).toBe(
      "0x000000000000000000000000000000000000110C",
    );
    expect(spendingPolicyAddressHex()).toBe("0x000000000000000000000000000000000000110c");
  });

  it("composes the canonical 201-byte fresh-claim message", () => {
    const message = composeClaimBoundMessage(69420n, args);
    expect(message).toHaveLength(201);
    const domain = new TextDecoder().decode(message.slice(0, SET_POLICY_CLAIM_DOMAIN_TAG.length));
    expect(domain).toBe(SET_POLICY_CLAIM_DOMAIN_TAG);
    expect([...message.slice(SET_POLICY_CLAIM_DOMAIN_TAG.length, SET_POLICY_CLAIM_DOMAIN_TAG.length + 8)]).toEqual([
      0, 0, 0, 0, 0, 1, 15, 44,
    ]);
  });

  it("encodes setPolicy calldata for the re-claim path", () => {
    const calldata = encodeSetPolicyCalldata(args);
    expect(calldata.startsWith(SPENDING_POLICY_SELECTORS.setPolicy)).toBe(true);
    expect((calldata.length - 2) / 2).toBe(4 + 6 * 32);
  });

  it("encodes setPolicyClaim calldata for the fresh-claim path", () => {
    const pk = new Uint8Array(ML_DSA_65_PUBLIC_KEY_LEN).fill(0x33);
    const sig = new Uint8Array(ML_DSA_65_SIGNATURE_LEN).fill(0x44);
    const calldata = encodeSetPolicyClaimCalldata(args, pk, sig);
    expect(calldata.startsWith(SPENDING_POLICY_SELECTORS.setPolicyClaim)).toBe(true);
    expect((calldata.length - 2) / 2).toBe(5457);
  });

  it("encodes enable and disable one-address calls", () => {
    expect(encodeEnableCalldata(args.subAccount).startsWith(SPENDING_POLICY_SELECTORS.enable)).toBe(true);
    expect(encodeDisableCalldata(args.subAccount).startsWith(SPENDING_POLICY_SELECTORS.disable)).toBe(true);
    expect((encodeEnableCalldata(args.subAccount).length - 2) / 2).toBe(36);
  });

  it("rejects wrong ML-DSA-65 material lengths", () => {
    expect(() => encodeSetPolicyClaimCalldata(args, new Uint8Array(1), new Uint8Array(ML_DSA_65_SIGNATURE_LEN))).toThrow();
    expect(() => encodeSetPolicyClaimCalldata(args, new Uint8Array(ML_DSA_65_PUBLIC_KEY_LEN), new Uint8Array(1))).toThrow();
  });
});
