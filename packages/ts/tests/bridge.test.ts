import { describe, expect, it } from "vitest";
import {
  BRIDGE_REVERT_TAGS,
  BRIDGE_SELECTORS,
  BridgePrecompileError,
  PRECOMPILE_ADDRESSES,
  assessBridgeRoute,
  bridgeAddressHex,
  bridgeTransferCandidates,
  encodeLockBridgeConfigCalldata,
  encodeSetBridgeResumeCooldownCalldata,
  isBridgeAdminLockedRevert,
  isBridgeCooldownZeroRevert,
  isBridgeResumeCooldownActiveRevert,
  rankBridgeRoutes,
  selectBridgeTransferRoute,
  type BridgeRouteDisclosure,
  type BridgeTransferIntent,
} from "../src/index.js";

function route(routeId: string): BridgeRouteDisclosure {
  return {
    routeId,
    bridge: "CCIP",
    asset: "USDC",
    sourceChain: "Ethereum",
    destinationChain: "Mono",
    verifier: {
      model: "DON",
      participantCount: 7,
      threshold: 5,
    },
    drainCapAtomic: "100000000000",
    finalityBlocks: 64,
    cooldownSeconds: 86_400,
    adminControl: "consensusOnly",
    circuitBreaker: "armed",
    insuranceAtomic: "50000000000",
    lastIncidentDate: null,
  };
}

function transferIntent(): BridgeTransferIntent {
  return {
    asset: "USDC",
    amountAtomic: "1000000",
    sourceChain: "Ethereum",
    destinationChain: "Mono",
    recipient: "mono1recipient",
  };
}

describe("bridge route disclosure helpers", () => {
  it("exports bridge admin selectors and revert tags pinned to mono-core", () => {
    expect(BRIDGE_SELECTORS).toEqual({
      lockBridgeConfig: "0x8956feb3",
      setBridgeResumeCooldown: "0x1a3a0672",
    });
    expect(BRIDGE_REVERT_TAGS).toEqual({
      bridgeAdminLocked: "0xf807",
      bridgeResumeCooldownActive: "0xf808",
      bridgeCooldownZero: "0xfd08",
    });
    expect(isBridgeAdminLockedRevert("0xf807")).toBe(true);
    expect(isBridgeAdminLockedRevert(new Uint8Array([0xf8, 0x07]))).toBe(true);
    expect(isBridgeAdminLockedRevert("0xf806")).toBe(false);
    expect(isBridgeResumeCooldownActiveRevert("0xf808")).toBe(true);
    expect(isBridgeResumeCooldownActiveRevert(new Uint8Array([0xf8, 0x08]))).toBe(true);
    expect(isBridgeResumeCooldownActiveRevert("0xf807")).toBe(false);
    expect(isBridgeCooldownZeroRevert("0xfd08")).toBe(true);
    expect(isBridgeCooldownZeroRevert(new Uint8Array([0xfd, 0x08]))).toBe(true);
    expect(isBridgeCooldownZeroRevert("0xf808")).toBe(false);
  });

  it("exports the bridge precompile address", () => {
    expect(PRECOMPILE_ADDRESSES.BRIDGE).toBe(
      "0x0000000000000000000000000000000000001008",
    );
    expect(bridgeAddressHex()).toBe("0x0000000000000000000000000000000000001008");
  });

  it("encodes lockBridgeConfig(bytes32) calldata", () => {
    const bridgeId = `0x${"ab".repeat(32)}`;
    const calldata = encodeLockBridgeConfigCalldata(bridgeId);

    expect(calldata).toBe(`0x8956feb3${"ab".repeat(32)}`);
    expect(calldata.startsWith(BRIDGE_SELECTORS.lockBridgeConfig)).toBe(true);
    expect((calldata.length - 2) / 2).toBe(4 + 32);
    expect(encodeLockBridgeConfigCalldata(new Uint8Array(32).fill(0xab))).toBe(calldata);
  });

  it("encodes setBridgeResumeCooldown(bytes32,uint64) calldata", () => {
    const bridgeId = `0x${"ab".repeat(32)}`;
    const calldata = encodeSetBridgeResumeCooldownCalldata(bridgeId, 42);

    expect(calldata).toBe(
      `0x1a3a0672${"ab".repeat(32)}000000000000000000000000000000000000000000000000000000000000002a`,
    );
    expect(calldata.startsWith(BRIDGE_SELECTORS.setBridgeResumeCooldown)).toBe(true);
    expect((calldata.length - 2) / 2).toBe(4 + 32 + 32);
    expect(encodeSetBridgeResumeCooldownCalldata(new Uint8Array(32).fill(0xab), "0x2a")).toBe(
      encodeSetBridgeResumeCooldownCalldata(bridgeId, 42n),
    );
  });

  it("rejects malformed lockBridgeConfig bridge ids", () => {
    expect(() => encodeLockBridgeConfigCalldata("0x123")).toThrow(BridgePrecompileError);
    expect(() => encodeLockBridgeConfigCalldata(`0x${"ab".repeat(31)}`)).toThrow(
      BridgePrecompileError,
    );
  });

  it("rejects malformed setBridgeResumeCooldown arguments", () => {
    expect(() => encodeSetBridgeResumeCooldownCalldata("0x123", 42)).toThrow(
      BridgePrecompileError,
    );
    expect(() => encodeSetBridgeResumeCooldownCalldata(`0x${"ab".repeat(31)}`, 42)).toThrow(
      BridgePrecompileError,
    );
    expect(() => encodeSetBridgeResumeCooldownCalldata(new Uint8Array(32), -1)).toThrow(
      BridgePrecompileError,
    );
    expect(() =>
      encodeSetBridgeResumeCooldownCalldata(new Uint8Array(32), Number.MAX_SAFE_INTEGER + 1),
    ).toThrow(BridgePrecompileError);
    expect(() => encodeSetBridgeResumeCooldownCalldata(new Uint8Array(32), "nope")).toThrow(
      BridgePrecompileError,
    );
    expect(() =>
      encodeSetBridgeResumeCooldownCalldata(new Uint8Array(32), 0x1_0000_0000_0000_0000n),
    ).toThrow(BridgePrecompileError);
  });

  it("accepts a floor-compliant disclosed route", () => {
    const assessment = assessBridgeRoute(route("ccip-usdc-eth"));
    expect(assessment.accepted).toBe(true);
    expect(assessment.score).toBe(100);
    expect(assessment.riskTier).toBe("low");
    expect(assessment.blockedReasons).toEqual([]);
  });

  it("blocks Kelp-class 1-of-1 routes without drain caps or breakers", () => {
    const disclosure = route("kelp-class");
    disclosure.verifier.participantCount = 1;
    disclosure.verifier.threshold = 1;
    disclosure.drainCapAtomic = "0";
    disclosure.adminControl = "operatorKey";
    disclosure.circuitBreaker = "disabled";
    disclosure.insuranceAtomic = "0";

    const assessment = assessBridgeRoute(disclosure);
    expect(assessment.accepted).toBe(false);
    expect(assessment.riskTier).toBe("blocked");
    expect(assessment.blockedReasons.some((reason) => reason.includes("1-of-1"))).toBe(true);
    expect(assessment.blockedReasons.some((reason) => reason.includes("drain cap"))).toBe(true);
    expect(assessment.blockedReasons.some((reason) => reason.includes("circuit breaker"))).toBe(true);
  });

  it("ranks accepted high-score routes ahead of warnings and blocked routes", () => {
    const shortCooldown = route("short-cooldown");
    shortCooldown.cooldownSeconds = 60;
    const paused = route("paused");
    paused.circuitBreaker = "paused";

    const ranked = rankBridgeRoutes([paused, shortCooldown, route("healthy")]);
    expect(ranked.map((row) => row.route.routeId)).toEqual([
      "healthy",
      "short-cooldown",
      "paused",
    ]);
    expect(ranked[2].assessment.accepted).toBe(false);
  });

  it("selects the best matching route for a transfer intent", () => {
    const shortCooldown = route("short-cooldown");
    shortCooldown.cooldownSeconds = 60;
    const wrongAsset = route("wrong-asset");
    wrongAsset.asset = "ETH";

    const selection = selectBridgeTransferRoute(transferIntent(), [
      wrongAsset,
      shortCooldown,
      route("healthy"),
    ]);

    expect(selection.blockedReasons).toEqual([]);
    expect(selection.selected?.route.routeId).toBe("healthy");
    expect(selection.candidates[0].route.routeId).toBe("healthy");
    const blocked = selection.candidates.find((candidate) => candidate.route.routeId === "wrong-asset");
    expect(blocked?.eligible).toBe(false);
    expect(blocked?.blockedReasons.some((reason) => reason.includes("asset"))).toBe(true);
  });

  it("fails closed when required floor disclosure is absent", () => {
    const underDisclosed = route("under-disclosed");
    underDisclosed.insuranceAtomic = "0";

    const selection = selectBridgeTransferRoute(transferIntent(), [underDisclosed]);

    expect(selection.selected).toBeNull();
    expect(selection.blockedReasons.some((reason) => reason.includes("no eligible bridge route"))).toBe(true);
    expect(selection.candidates[0].blockedReasons.some((reason) => reason.includes("insurance"))).toBe(true);
  });

  it("blocks transfer amounts over disclosed caps", () => {
    const capped = route("capped");
    capped.drainCapAtomic = "1000";
    capped.insuranceAtomic = "999";
    const intent = transferIntent();
    intent.amountAtomic = "1001";

    const selection = selectBridgeTransferRoute(intent, [capped]);

    expect(selection.selected).toBeNull();
    expect(selection.candidates[0].blockedReasons.some((reason) => reason.includes("drain cap"))).toBe(true);
    expect(selection.candidates[0].blockedReasons.some((reason) => reason.includes("insurance coverage"))).toBe(
      true,
    );
  });

  it("applies route allow-list and minimum-score policy", () => {
    const lowScore = route("healthy");
    lowScore.cooldownSeconds = 60;
    const intent = transferIntent();
    intent.allowedRouteIds = ["healthy"];
    intent.minimumScore = 95;

    const candidates = bridgeTransferCandidates(intent, [lowScore]);
    const selection = selectBridgeTransferRoute(intent, [lowScore]);

    expect(candidates[0].eligible).toBe(false);
    expect(selection.selected).toBeNull();
    expect(candidates[0].blockedReasons.some((reason) => reason.includes("minimum"))).toBe(true);
  });

  it("reports missing route disclosures", () => {
    const selection = selectBridgeTransferRoute(transferIntent(), []);

    expect(selection.selected).toBeNull();
    expect(selection.candidates).toEqual([]);
    expect(selection.blockedReasons.some((reason) => reason.includes("no route disclosures"))).toBe(true);
  });
});
