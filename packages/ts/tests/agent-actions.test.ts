import { describe, expect, it } from "vitest";
import {
  AgentActionError,
  NATIVE_AGENT_MODULE_ADDRESS,
  NATIVE_AGENT_MODULE_ADDRESS_BYTES,
  NATIVE_MARKET_MODULE_ADDRESS,
  addressToTypedBech32,
  buildNativeAgentCreateEscrowForwarderInput,
  buildNativeAgentCreateEscrowModuleCall,
  buildNativeAgentModuleCallEnvelope,
  buildNativeAgentRecordReputationForwarderInput,
  buildNativeAgentRecordReputationModuleCall,
  buildNativeAgentSetSpendingPolicyForwarderInput,
  buildNativeAgentSetSpendingPolicyModuleCall,
  encodeNativeAgentCreateEscrowCall,
  encodeNativeAgentModuleForwarderInput,
  encodeNativeAgentRecordReputationCall,
  encodeNativeAgentSetSpendingPolicyCall,
} from "../src/index.js";

const rustNativeSetPolicyGolden =
  `0x060000000000000000000000${"11".repeat(20)}` +
  `00000000${"22".repeat(20)}` +
  "0700000000000000" +
  `${"33".repeat(32)}` +
  "7d000000000000000000000000000000" +
  "f4010000000000000000000000000000" +
  "100e000000000000";

const rustNativeCreateEscrowGolden =
  `0x070000000000000000000000${"11".repeat(20)}` +
  `00000000${"22".repeat(20)}` +
  `00000000${"33".repeat(20)}` +
  "0900000000000000" +
  `${"44".repeat(32)}` +
  "7b000000000000000000000000000000" +
  `${"55".repeat(32)}`;

const rustNativeRecordReputationGolden =
  `0x080000000000000000000000${"66".repeat(20)}` +
  `00000000${"77".repeat(20)}` +
  "2a000000" +
  "05040302" +
  `${"88".repeat(32)}`;

describe("native agent action builders", () => {
  it("exports the native agent module address pinned to mono-core", () => {
    expect(NATIVE_AGENT_MODULE_ADDRESS_BYTES).toBe("0x4147454e545f4e41544956455f4d4f445f563031");
    expect(NATIVE_AGENT_MODULE_ADDRESS).toBe(addressToTypedBech32("systemModule", NATIVE_AGENT_MODULE_ADDRESS_BYTES));
  });

  it("encodes native agent router calls with the mono-core bincode layout", () => {
    expect(
      encodeNativeAgentSetSpendingPolicyCall({
        owner: addressToTypedBech32("user", `0x${"11".repeat(20)}`),
        controller: `0x${"22".repeat(20)}`,
        nonce: 7,
        assetId: `0x${"33".repeat(32)}`,
        perActionLimit: "125",
        windowLimit: "500",
        windowSecs: 3600,
      }),
    ).toBe(rustNativeSetPolicyGolden);

    expect(
      encodeNativeAgentCreateEscrowCall({
        buyer: `0x${"11".repeat(20)}`,
        provider: `0x${"22".repeat(20)}`,
        arbiter: `0x${"33".repeat(20)}`,
        nonce: 9,
        assetId: `0x${"44".repeat(32)}`,
        amount: "123",
        termsHash: `0x${"55".repeat(32)}`,
      }),
    ).toBe(rustNativeCreateEscrowGolden);

    expect(
      encodeNativeAgentRecordReputationCall({
        reviewer: { kind: "user", address: new Uint8Array(20).fill(0x66) },
        subject: `0x${"77".repeat(20)}`,
        categoryId: 42,
        scores: {
          speed: 5,
          quality: 4,
          communication: 3,
          accuracy: 2,
        },
        payloadHash: `0x${"88".repeat(32)}`,
      }),
    ).toBe(rustNativeRecordReputationGolden);
  });

  it("builds native agent module call envelopes for RISC-V call_contract", () => {
    expect(buildNativeAgentModuleCallEnvelope(rustNativeCreateEscrowGolden, 44_000)).toEqual({
      module: "agent",
      call: {
        to: NATIVE_AGENT_MODULE_ADDRESS,
        input: rustNativeCreateEscrowGolden,
        valueLythoshi: "0",
        maxCycles: "44000",
      },
    });

    expect(
      buildNativeAgentSetSpendingPolicyModuleCall(
        {
          owner: `0x${"11".repeat(20)}`,
          controller: `0x${"22".repeat(20)}`,
          nonce: 7,
          assetId: `0x${"33".repeat(32)}`,
          perActionLimit: "125",
          windowLimit: "500",
          windowSecs: 3600,
        },
        "22000",
      ).call.input,
    ).toBe(rustNativeSetPolicyGolden);

    expect(
      buildNativeAgentCreateEscrowModuleCall(
        {
          buyer: `0x${"11".repeat(20)}`,
          provider: `0x${"22".repeat(20)}`,
          arbiter: `0x${"33".repeat(20)}`,
          nonce: 9,
          assetId: `0x${"44".repeat(32)}`,
          amount: "123",
          termsHash: `0x${"55".repeat(32)}`,
        },
        22_000,
      ).call.input,
    ).toBe(rustNativeCreateEscrowGolden);

    expect(
      buildNativeAgentRecordReputationModuleCall(
        {
          reviewer: `0x${"66".repeat(20)}`,
          subject: `0x${"77".repeat(20)}`,
          categoryId: 42,
          scores: { speed: 5, quality: 4, communication: 3, accuracy: 2 },
          payloadHash: `0x${"88".repeat(32)}`,
        },
        22_000,
      ).call.input,
    ).toBe(rustNativeRecordReputationGolden);
  });

  it("encodes native agent module calls as MRV forwarder input", () => {
    const envelope = buildNativeAgentRecordReputationModuleCall(
      {
        reviewer: `0x${"66".repeat(20)}`,
        subject: `0x${"77".repeat(20)}`,
        categoryId: 42,
        scores: { speed: 5, quality: 4, communication: 3, accuracy: 2 },
        payloadHash: `0x${"88".repeat(32)}`,
      },
      44_000,
    );
    const forwarded = encodeNativeAgentModuleForwarderInput(envelope);
    expect(forwarded).toEqual({
      requestBytes: 156,
      input:
        "0x" +
        "07000000" +
        "05000000" +
        "4147454e545f4e41544956455f4d4f445f563031" +
        "6000000000000000" +
        rustNativeRecordReputationGolden.slice(2) +
        "00".repeat(16) +
        "e0ab000000000000",
    });

    expect(
      buildNativeAgentSetSpendingPolicyForwarderInput(
        {
          owner: `0x${"11".repeat(20)}`,
          controller: `0x${"22".repeat(20)}`,
          nonce: 7,
          assetId: `0x${"33".repeat(32)}`,
          perActionLimit: "125",
          windowLimit: "500",
          windowSecs: 3600,
        },
        22_000,
      ).requestBytes,
    ).toBe(196);
    expect(
      buildNativeAgentCreateEscrowForwarderInput(
        {
          buyer: `0x${"11".repeat(20)}`,
          provider: `0x${"22".repeat(20)}`,
          arbiter: `0x${"33".repeat(20)}`,
          nonce: 9,
          assetId: `0x${"44".repeat(32)}`,
          amount: "123",
          termsHash: `0x${"55".repeat(32)}`,
        },
        22_000,
      ).requestBytes,
    ).toBe(228);
    expect(
      buildNativeAgentRecordReputationForwarderInput(
        {
          reviewer: `0x${"66".repeat(20)}`,
          subject: `0x${"77".repeat(20)}`,
          categoryId: 42,
          scores: { speed: 5, quality: 4, communication: 3, accuracy: 2 },
          payloadHash: `0x${"88".repeat(32)}`,
        },
        22_000,
      ).requestBytes,
    ).toBe(156);
  });

  it("rejects malformed native agent action inputs", () => {
    expect(() =>
      encodeNativeAgentSetSpendingPolicyCall({
        owner: `0x${"11".repeat(20)}`,
        controller: `0x${"22".repeat(20)}`,
        nonce: -1,
        assetId: `0x${"33".repeat(32)}`,
        perActionLimit: "125",
        windowLimit: "500",
        windowSecs: 3600,
      }),
    ).toThrow(AgentActionError);
    expect(() =>
      encodeNativeAgentRecordReputationCall({
        reviewer: `0x${"66".repeat(20)}`,
        subject: `0x${"77".repeat(20)}`,
        categoryId: 42,
        scores: { speed: 6, quality: 4, communication: 3, accuracy: 2 },
        payloadHash: `0x${"88".repeat(32)}`,
      }),
    ).toThrow(/between 1 and 5/);
    expect(() => encodeNativeAgentCreateEscrowCall({
      buyer: `0x${"11".repeat(20)}`,
      provider: `0x${"22".repeat(20)}`,
      arbiter: `0x${"33".repeat(20)}`,
      nonce: 9,
      assetId: "0x1234",
      amount: "123",
      termsHash: `0x${"55".repeat(32)}`,
    })).toThrow(/assetId/);
    expect(() =>
      encodeNativeAgentModuleForwarderInput({
        module: "agent",
        call: {
          to: NATIVE_MARKET_MODULE_ADDRESS,
          input: rustNativeRecordReputationGolden,
          valueLythoshi: "0",
          maxCycles: "1",
        },
      }),
    ).toThrow(/agent system module/);
  });
});
