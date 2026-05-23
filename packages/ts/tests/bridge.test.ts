import { describe, expect, it } from "vitest";
import {
  assessBridgeRoute,
  rankBridgeRoutes,
  type BridgeRouteDisclosure,
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
});
