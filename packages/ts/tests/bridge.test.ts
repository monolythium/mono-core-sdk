import { describe, expect, it } from "vitest";
import {
  assessBridgeRoute,
  bridgeTransferCandidates,
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
