import { describe, expect, it } from "vitest";
import {
  BRIDGE_QUOTE_API_BLOCKED_REASON,
  BRIDGE_REVERT_TAGS,
  BRIDGE_SELECTORS,
  BRIDGE_SUBMIT_API_BLOCKED_REASON,
  BridgePrecompileError,
  BridgeRouteCatalogueError,
  PRECOMPILE_ADDRESSES,
  assessBridgeRoute,
  bridgeAddressHex,
  bridgeQuoteSubmitReadiness,
  bridgeRoutesReadiness,
  bridgeTransferCandidates,
  buildBridgeRouteCatalogue,
  encodeLockBridgeConfigCalldata,
  encodeSetBridgeRouteFinalityCalldata,
  encodeSetBridgeResumeCooldownCalldata,
  exportBridgeRouteCatalogueJson,
  isBridgeAdminLockedRevert,
  isBridgeCooldownZeroRevert,
  isBridgeFinalityZeroRevert,
  isBridgeResumeCooldownActiveRevert,
  parseBridgeRouteCatalogueJson,
  rankBridgeRoutes,
  selectBridgeTransferRoute,
  validateBridgeRouteCatalogue,
  type BridgeRouteCatalogueRoute,
  type BridgeRouteDisclosure,
  type BridgeRoutesRequest,
  type BridgeTransferIntent,
} from "../src/index.js";

function route(routeId: string): BridgeRouteDisclosure {
  return {
    routeId,
    bridge: "Chainlink CCIP",
    protocol: "chainlink-ccip",
    asset: "USDC",
    feeToken: "LINK",
    sourceChain: "Ethereum",
    destinationChain: "Mono",
    verifier: {
      model: "CCIP DON",
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

function catalogueRoute(routeId: string): BridgeRouteCatalogueRoute {
  return {
    tokenId: `0x${"10".repeat(32)}`,
    routeId,
    bridgeId: `0x${"b1".repeat(32)}`,
    wrappedAsset: `0x${"a5".repeat(20)}`,
    bridge: "Chainlink CCIP",
    protocol: "chainlink-ccip",
    asset: "USDC",
    feeToken: "LINK",
    sourceChain: "Ethereum",
    destinationChain: "Mono",
    verifier: {
      model: "CCIP DON",
      participantCount: 16,
      threshold: 11,
    },
    drainCapAtomic: "250000000000",
    finalityBlocks: 64,
    cooldownSeconds: 1_800,
    adminControl: "consensusOnly",
    circuitBreaker: "armed",
    insuranceAtomic: "1000000000000",
    updatedAtBlock: 7,
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
      setBridgeRouteFinality: "0x8a061e99",
    });
    expect(BRIDGE_REVERT_TAGS).toEqual({
      bridgeAdminLocked: "0xf807",
      bridgeResumeCooldownActive: "0xf808",
      bridgeCooldownZero: "0xfd08",
      bridgeFinalityZero: "0xfd09",
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
    expect(isBridgeFinalityZeroRevert("0xfd09")).toBe(true);
    expect(isBridgeFinalityZeroRevert(new Uint8Array([0xfd, 0x09]))).toBe(true);
    expect(isBridgeFinalityZeroRevert("0xfd08")).toBe(false);
  });

  it("exports the bridge precompile address", () => {
    expect(PRECOMPILE_ADDRESSES.BRIDGE).toBe(
      "0x0000000000000000000000000000000000001008",
    );
    expect(bridgeAddressHex()).toBe("0x0000000000000000000000000000000000001008");
  });

  it("builds and exports a mono-core CLI bridge route catalogue envelope", () => {
    const catalogue = buildBridgeRouteCatalogue([catalogueRoute("ccip-usdc-mainnet")]);

    expect(validateBridgeRouteCatalogue(catalogue)).toEqual({
      accepted: true,
      routeCount: 1,
      blockedReasons: [],
    });

    const exported = exportBridgeRouteCatalogueJson(catalogue);
    const decoded = JSON.parse(exported) as { routes: BridgeRouteCatalogueRoute[] };
    expect(decoded.routes[0]).toMatchObject({
      tokenId: `0x${"10".repeat(32)}`,
      routeId: "ccip-usdc-mainnet",
      protocol: "chainlink-ccip",
      feeToken: "LINK",
      updatedAtBlock: 7,
    });
    expect(decoded.routes[0].lastIncidentDate).toBeUndefined();
    expect(parseBridgeRouteCatalogueJson(exported)).toEqual(catalogue);

    const raw = exportBridgeRouteCatalogueJson(catalogue, { envelope: false });
    expect(Array.isArray(JSON.parse(raw))).toBe(true);
    expect(parseBridgeRouteCatalogueJson(raw)).toEqual(catalogue);
  });

  it("parses raw bridge route catalogues with CLI field aliases", () => {
    const raw = JSON.stringify([
      {
        token_id: `0x${"10".repeat(32)}`,
        route_id: "ccip-usdc-mainnet",
        bridge_id: `0x${"b1".repeat(32)}`,
        wrapped_asset: `0x${"a5".repeat(20)}`,
        bridge: "Chainlink CCIP",
        route_protocol: "chainlink-ccip",
        asset: "USDC",
        fee_token: "LINK",
        source_chain: "Ethereum",
        destination_chain: "Mono",
        verifier: {
          model: "CCIP DON",
          participant_count: 16,
          threshold: 11,
        },
        drain_cap_atomic: "250000000000",
        finality_blocks: 64,
        cooldown_seconds: 1_800,
        admin_control: "consensus_only",
        circuit_breaker: "armed",
        insurance_atomic: "1000000000000",
        updated_at_block: 7,
        last_incident_date: "2026-05-23",
      },
    ]);

    const parsed = parseBridgeRouteCatalogueJson(raw);
    expect(parsed.routes[0]).toMatchObject({
      routeId: "ccip-usdc-mainnet",
      adminControl: "consensusOnly",
      lastIncidentDate: "2026-05-23",
    });
    expect(parsed.routes[0].verifier.participantCount).toBe(16);
  });

  it("rejects invalid bridge route catalogue import payloads", () => {
    const first = {
      ...catalogueRoute("duplicate"),
      drainCapAtomic: "0",
      finalityBlocks: 0,
      feeToken: "ETH",
      protocol: "relay",
      lastIncidentDate: "20260523",
    };
    const second = {
      ...catalogueRoute("duplicate"),
      wrappedAsset: "0x1234",
    };
    const validation = validateBridgeRouteCatalogue([first, second]);

    expect(validation.accepted).toBe(false);
    expect(validation.blockedReasons.some((reason) => reason.includes("duplicate"))).toBe(true);
    expect(validation.blockedReasons.some((reason) => reason.includes("drainCapAtomic"))).toBe(
      true,
    );
    expect(validation.blockedReasons.some((reason) => reason.includes("finalityBlocks"))).toBe(
      true,
    );
    expect(validation.blockedReasons.some((reason) => reason.includes("feeToken"))).toBe(true);
    expect(validation.blockedReasons.some((reason) => reason.includes("protocol"))).toBe(true);
    expect(validation.blockedReasons.some((reason) => reason.includes("lastIncidentDate"))).toBe(
      true,
    );
    expect(validation.blockedReasons.some((reason) => reason.includes("wrappedAsset"))).toBe(
      true,
    );
    expect(() => exportBridgeRouteCatalogueJson([first, second])).toThrow(
      BridgeRouteCatalogueError,
    );
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

  it("encodes setBridgeRouteFinality(bytes32,uint64) calldata", () => {
    const bridgeId = `0x${"ab".repeat(32)}`;
    const calldata = encodeSetBridgeRouteFinalityCalldata(bridgeId, 42);

    expect(calldata).toBe(
      `0x8a061e99${"ab".repeat(32)}000000000000000000000000000000000000000000000000000000000000002a`,
    );
    expect(calldata.startsWith(BRIDGE_SELECTORS.setBridgeRouteFinality)).toBe(true);
    expect((calldata.length - 2) / 2).toBe(4 + 32 + 32);
    expect(encodeSetBridgeRouteFinalityCalldata(new Uint8Array(32).fill(0xab), "0x2a")).toBe(
      encodeSetBridgeRouteFinalityCalldata(bridgeId, 42n),
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

  it("rejects malformed setBridgeRouteFinality arguments", () => {
    expect(() => encodeSetBridgeRouteFinalityCalldata("0x123", 42)).toThrow(
      BridgePrecompileError,
    );
    expect(() => encodeSetBridgeRouteFinalityCalldata(`0x${"ab".repeat(31)}`, 42)).toThrow(
      BridgePrecompileError,
    );
    expect(() => encodeSetBridgeRouteFinalityCalldata(new Uint8Array(32), -1)).toThrow(
      BridgePrecompileError,
    );
    expect(() =>
      encodeSetBridgeRouteFinalityCalldata(new Uint8Array(32), Number.MAX_SAFE_INTEGER + 1),
    ).toThrow(BridgePrecompileError);
    expect(() => encodeSetBridgeRouteFinalityCalldata(new Uint8Array(32), "nope")).toThrow(
      BridgePrecompileError,
    );
    expect(() =>
      encodeSetBridgeRouteFinalityCalldata(new Uint8Array(32), 0x1_0000_0000_0000_0000n),
    ).toThrow(BridgePrecompileError);
  });

  it("accepts a floor-compliant disclosed route", () => {
    const assessment = assessBridgeRoute(route("ccip-usdc-eth"));
    expect(assessment.accepted).toBe(true);
    expect(assessment.score).toBe(100);
    expect(assessment.riskTier).toBe("low");
    expect(assessment.blockedReasons).toEqual([]);
  });

  it("blocks single-verifier routes without drain caps or breakers", () => {
    const disclosure = route("single-verifier");
    disclosure.verifier.participantCount = 1;
    disclosure.verifier.threshold = 1;
    disclosure.drainCapAtomic = "0";
    disclosure.feeToken = "ETH";
    disclosure.adminControl = "operatorKey";
    disclosure.circuitBreaker = "disabled";
    disclosure.insuranceAtomic = "0";

    const assessment = assessBridgeRoute(disclosure);
    expect(assessment.accepted).toBe(false);
    expect(assessment.riskTier).toBe("blocked");
    expect(assessment.blockedReasons.some((reason) => reason.includes("1-of-1"))).toBe(true);
    expect(assessment.blockedReasons.some((reason) => reason.includes("drain cap"))).toBe(true);
    expect(assessment.blockedReasons.some((reason) => reason.includes("fee token"))).toBe(true);
    expect(assessment.blockedReasons.some((reason) => reason.includes("circuit breaker"))).toBe(true);
  });

  it("blocks non-CCIP protocol even when the fee token is LINK", () => {
    const disclosure = route("relay-usdc");
    disclosure.bridge = "Generic Relay";
    disclosure.protocol = "relay";
    disclosure.verifier.model = "light-client";

    const assessment = assessBridgeRoute(disclosure);
    expect(assessment.accepted).toBe(false);
    expect(assessment.blockedReasons.some((reason) => reason.includes("Chainlink CCIP"))).toBe(
      true,
    );
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

  it("reports quote/submit as a live mono-core boundary after route selection", () => {
    const readiness = bridgeQuoteSubmitReadiness(transferIntent(), [route("healthy")]);

    expect(readiness.routeSelectionReady).toBe(true);
    expect(readiness.quoteReady).toBe(false);
    expect(readiness.submitReady).toBe(false);
    expect(readiness.selection.selected?.route.routeId).toBe("healthy");
    expect(readiness.blockedReasons).toEqual([
      BRIDGE_QUOTE_API_BLOCKED_REASON,
      BRIDGE_SUBMIT_API_BLOCKED_REASON,
    ]);
  });

  it("evaluates bridge route request readiness without enabling quote or submit", () => {
    const request: BridgeRoutesRequest = {
      intent: transferIntent(),
      routeDisclosures: [route("healthy")],
    };

    const response = bridgeRoutesReadiness(request);

    expect(response.routeSelectionReady).toBe(true);
    expect(response.quoteReady).toBe(false);
    expect(response.submitReady).toBe(false);
    expect(response.routes?.map((entry) => entry.routeId)).toEqual(["healthy"]);
    expect(response.bridgeRouteDisclosures?.map((entry) => entry.routeId)).toEqual(["healthy"]);
    expect(response.source).toMatchObject({
      routeCount: 1,
      globalRouteIndexAvailable: false,
      routeDisclosureSource: "request.routeDisclosures",
    });
    expect(response.selection.selected?.route.routeId).toBe("healthy");
    expect(response.blockedReasons).toEqual([
      BRIDGE_QUOTE_API_BLOCKED_REASON,
      BRIDGE_SUBMIT_API_BLOCKED_REASON,
    ]);
  });

  it("evaluates discovery-only bridge route requests without selecting routes", () => {
    const response = bridgeRoutesReadiness({
      routeDisclosures: [route("healthy")],
    });

    expect(response.routeSelectionReady).toBe(false);
    expect(response.quoteReady).toBe(false);
    expect(response.submitReady).toBe(false);
    expect(response.routes?.map((entry) => entry.routeId)).toEqual(["healthy"]);
    expect(response.bridgeRouteDisclosures?.map((entry) => entry.routeId)).toEqual(["healthy"]);
    expect(response.selection.candidates).toEqual([]);
    expect(response.blockedReasons).toEqual(["bridge route selection requires transfer intent"]);
  });

  it("preserves route-selection blockers before quote/submit readiness", () => {
    const readiness = bridgeQuoteSubmitReadiness(transferIntent(), []);

    expect(readiness.routeSelectionReady).toBe(false);
    expect(readiness.quoteReady).toBe(false);
    expect(readiness.submitReady).toBe(false);
    expect(readiness.blockedReasons.some((reason) => reason.includes("no route disclosures"))).toBe(
      true,
    );
    expect(readiness.blockedReasons).not.toContain(BRIDGE_QUOTE_API_BLOCKED_REASON);
  });
});
