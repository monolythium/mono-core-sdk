import { describe, expect, it } from "vitest";
import {
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  PRECOMPILE_ADDRESSES,
  SET_POLICY_CLAIM_DOMAIN_TAG,
  SPENDING_POLICY_SELECTORS,
  addressToTypedBech32,
  composeClaimBoundMessage,
  decodeTimeWindow,
  encodeClaimPolicyByAddressCalldata,
  encodeDisableCalldata,
  encodeEnableCalldata,
  encodeSetPolicyCalldata,
  encodeSetPolicyClaimCalldata,
  packTimeWindow,
  spendingPolicyAddressHex,
  type SpendingPolicyArgs,
} from "../src/index.js";

const userAddress = (byte: string) => addressToTypedBech32("user", `0x${byte.repeat(20)}`);
const contractAddress = (byte: string) => addressToTypedBech32("contract", `0x${byte.repeat(20)}`);

const args: SpendingPolicyArgs = {
  subAccount: userAddress("11"),
  principal: userAddress("22"),
  dailyCapLythoshi: 100n,
  perTxCapLythoshi: 7n,
  allowRoot: `0x${"aa".repeat(32)}`,
  denyRoot: `0x${"bb".repeat(32)}`,
  weeklyCapLythoshi: 500n,
  monthlyCapLythoshi: 2_000n,
  categoryAllowRoot: `0x${"cc".repeat(32)}`,
  timeWindow: packTimeWindow(true, 9, 17),
  policyExpiry: 1_900_000_000n,
};

describe("spending policy ABI helpers", () => {
  it("exports selectors pinned to mono-core", () => {
    expect(SPENDING_POLICY_SELECTORS).toEqual({
      setPolicy: "0x8da1a765",
      setPolicyClaim: "0x35531f6c",
      claimPolicyByAddress: "0x0c21376c",
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

  it("composes the canonical 305-byte fresh-claim message (WP §18.8)", () => {
    // 201 base + weekly(16) + monthly(16) + categoryAllowRoot(32)
    // + timeWindow(32) + policyExpiry(8) = 305.
    const message = composeClaimBoundMessage(69420n, args);
    expect(message).toHaveLength(305);
    const domain = new TextDecoder().decode(message.slice(0, SET_POLICY_CLAIM_DOMAIN_TAG.length));
    expect(domain).toBe(SET_POLICY_CLAIM_DOMAIN_TAG);
    expect([...message.slice(SET_POLICY_CLAIM_DOMAIN_TAG.length, SET_POLICY_CLAIM_DOMAIN_TAG.length + 8)]).toEqual([
      0, 0, 0, 0, 0, 1, 15, 44,
    ]);
    // Trailing two be8 words: policy_expiry (1_900_000_000 = 0x713FB300)
    // then expected_version (0).
    expect([...message.slice(289, 297)]).toEqual([0, 0, 0, 0, 0x71, 0x3f, 0xb3, 0x00]);
    expect([...message.slice(297, 305)]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("encodes setPolicy calldata for the re-claim path (11-word block)", () => {
    const calldata = encodeSetPolicyCalldata(args);
    expect(calldata.startsWith(SPENDING_POLICY_SELECTORS.setPolicy)).toBe(true);
    expect((calldata.length - 2) / 2).toBe(4 + 11 * 32);
  });

  it("encodes setPolicyClaim calldata for the fresh-claim path", () => {
    const pk = new Uint8Array(ML_DSA_65_PUBLIC_KEY_LEN).fill(0x33);
    const sig = new Uint8Array(ML_DSA_65_SIGNATURE_LEN).fill(0x44);
    const calldata = encodeSetPolicyClaimCalldata(args, pk, sig);
    expect(calldata.startsWith(SPENDING_POLICY_SELECTORS.setPolicyClaim)).toBe(true);
    // 4 + 11*32 + 1952 + 3309 = 5617.
    expect((calldata.length - 2) / 2).toBe(5617);
  });

  it("encodes claimPolicyByAddress calldata for the pubkey-registry fresh-claim path", () => {
    const sig = new Uint8Array(ML_DSA_65_SIGNATURE_LEN).fill(0x44);
    const calldata = encodeClaimPolicyByAddressCalldata(args, sig);
    expect(calldata.startsWith(SPENDING_POLICY_SELECTORS.claimPolicyByAddress)).toBe(true);
    // 4 + 11*32 + 3309 = 3665.
    expect((calldata.length - 2) / 2).toBe(3665);
  });

  it("encodes enable and disable one-address calls", () => {
    expect(encodeEnableCalldata(args.subAccount).startsWith(SPENDING_POLICY_SELECTORS.enable)).toBe(true);
    expect(encodeDisableCalldata(args.subAccount).startsWith(SPENDING_POLICY_SELECTORS.disable)).toBe(true);
    expect((encodeEnableCalldata(args.subAccount).length - 2) / 2).toBe(36);
  });

  it("packs and decodes WP §18.8 time-of-day windows", () => {
    const window = packTimeWindow(true, 9, 17);
    expect(window).toHaveLength(32);
    expect(window[29]).toBe(0x01);
    expect(window[30]).toBe(9);
    expect(window[31]).toBe(17);
    expect(decodeTimeWindow(window)).toEqual([9, 17]);
    // Disabled → all-zero sentinel → null.
    expect([...packTimeWindow(false, 9, 17)]).toEqual([...new Uint8Array(32)]);
    expect(decodeTimeWindow(new Uint8Array(32))).toBeNull();
    // Wrapping window round-trips.
    expect(decodeTimeWindow(packTimeWindow(true, 22, 6))).toEqual([22, 6]);
    // Hours clamp to 0..=23.
    expect(decodeTimeWindow(packTimeWindow(true, 99, 200))).toEqual([23, 23]);
  });

  it("defaults the WP §18.8 dimensions to zero when omitted", () => {
    const bare: SpendingPolicyArgs = {
      subAccount: userAddress("11"),
      principal: userAddress("22"),
      dailyCapLythoshi: 100n,
      perTxCapLythoshi: 7n,
      allowRoot: `0x${"aa".repeat(32)}`,
      denyRoot: `0x${"bb".repeat(32)}`,
    };
    // The widened 11-word block still encodes; the trailing 5 words are zero.
    const calldata = encodeSetPolicyCalldata(bare);
    expect((calldata.length - 2) / 2).toBe(4 + 11 * 32);
    const message = composeClaimBoundMessage(69420n, bare);
    expect(message).toHaveLength(305);
  });

  it("rejects wrong ML-DSA-65 material lengths", () => {
    expect(() => encodeSetPolicyClaimCalldata(args, new Uint8Array(1), new Uint8Array(ML_DSA_65_SIGNATURE_LEN))).toThrow();
    expect(() => encodeSetPolicyClaimCalldata(args, new Uint8Array(ML_DSA_65_PUBLIC_KEY_LEN), new Uint8Array(1))).toThrow();
    expect(() => encodeClaimPolicyByAddressCalldata(args, new Uint8Array(1))).toThrow();
  });

  it("rejects raw and wrong-HRP account addresses", () => {
    expect(() =>
      encodeSetPolicyCalldata({
        ...args,
        subAccount: "0x1111111111111111111111111111111111111111",
      }),
    ).toThrow(/raw 0x addresses are retired/);
    expect(() =>
      encodeSetPolicyCalldata({
        ...args,
        principal: contractAddress("22"),
      }),
    ).toThrow(/principal/);
    expect(() => encodeEnableCalldata(new Uint8Array(20) as unknown as string)).toThrow(/subAccount/);
  });
});
