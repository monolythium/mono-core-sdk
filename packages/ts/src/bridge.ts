/**
 * Third-party bridge route disclosure helpers.
 *
 * These helpers assess caller-supplied route disclosures. They do not call a
 * node route and do not claim any bridge integration is live.
 */

export type BridgeAdminControl = "none" | "consensusOnly" | "operatorKey" | "unknown";
export type BridgeCircuitBreakerState = "armed" | "paused" | "disabled" | "unknown";
export type BridgeRiskTier = "low" | "medium" | "high" | "blocked";

export interface BridgeVerifierDisclosure {
  model: string;
  participantCount: number;
  threshold: number;
}

export interface BridgeRouteDisclosure {
  routeId: string;
  bridge: string;
  asset: string;
  sourceChain: string;
  destinationChain: string;
  verifier: BridgeVerifierDisclosure;
  drainCapAtomic: string;
  finalityBlocks: number;
  cooldownSeconds: number;
  adminControl: BridgeAdminControl;
  circuitBreaker: BridgeCircuitBreakerState;
  insuranceAtomic: string;
  lastIncidentDate?: string | null;
}

export interface BridgeRouteAssessment {
  routeId: string;
  accepted: boolean;
  score: number;
  riskTier: BridgeRiskTier;
  blockedReasons: string[];
  warnings: string[];
}

export interface RankedBridgeRoute {
  route: BridgeRouteDisclosure;
  assessment: BridgeRouteAssessment;
}

export function assessBridgeRoute(route: BridgeRouteDisclosure): BridgeRouteAssessment {
  const blockedReasons: string[] = [];
  const warnings: string[] = [];

  if (route.routeId.trim() === "") blockedReasons.push("route id missing");
  if (route.bridge.trim() === "") blockedReasons.push("bridge name missing");
  if (route.asset.trim() === "") blockedReasons.push("asset disclosure missing");
  if (route.verifier.model.trim() === "") blockedReasons.push("verifier model missing");
  if (route.verifier.threshold < 2 || route.verifier.participantCount < 2) {
    blockedReasons.push("verifier set must not be 1-of-1");
  }
  if (route.verifier.threshold > route.verifier.participantCount) {
    blockedReasons.push("verifier threshold exceeds participant count");
  }
  if (!decimalStringIsPositive(route.drainCapAtomic)) {
    blockedReasons.push("per-asset drain cap missing or zero");
  }
  if (route.finalityBlocks === 0) blockedReasons.push("route finality delay missing");
  if (route.cooldownSeconds === 0) blockedReasons.push("route cooldown missing");
  if (route.adminControl !== "none" && route.adminControl !== "consensusOnly") {
    blockedReasons.push("Mono-side admin control is not consensus-only");
  }
  if (route.circuitBreaker === "paused") {
    blockedReasons.push("route circuit breaker is paused");
  } else if (route.circuitBreaker === "disabled" || route.circuitBreaker === "unknown") {
    blockedReasons.push("route circuit breaker missing");
  }
  if (!decimalStringIsPositive(route.insuranceAtomic)) {
    blockedReasons.push("slashable insurance pool missing or zero");
  }
  if (route.lastIncidentDate != null) {
    warnings.push("route reports a prior bridge incident");
  }

  if (blockedReasons.length > 0) {
    return {
      routeId: route.routeId,
      accepted: false,
      score: 0,
      riskTier: "blocked",
      blockedReasons,
      warnings,
    };
  }

  let score = 100;
  if (route.verifier.threshold * 3 <= route.verifier.participantCount) {
    score -= 10;
    warnings.push("verifier threshold is below one-third-plus quorum");
  }
  if (route.cooldownSeconds < 3_600) {
    score -= 10;
    warnings.push("cooldown is under one hour");
  }
  if (route.finalityBlocks < 2) {
    score -= 5;
    warnings.push("finality delay is under two blocks");
  }

  return {
    routeId: route.routeId,
    accepted: true,
    score,
    riskTier: score >= 90 ? "low" : score >= 75 ? "medium" : "high",
    blockedReasons,
    warnings,
  };
}

export function rankBridgeRoutes(routes: readonly BridgeRouteDisclosure[]): RankedBridgeRoute[] {
  return routes
    .map((route) => ({ route, assessment: assessBridgeRoute(route) }))
    .sort((left, right) => {
      if (left.assessment.accepted !== right.assessment.accepted) {
        return left.assessment.accepted ? -1 : 1;
      }
      if (left.assessment.score !== right.assessment.score) {
        return right.assessment.score - left.assessment.score;
      }
      if (left.route.cooldownSeconds !== right.route.cooldownSeconds) {
        return left.route.cooldownSeconds - right.route.cooldownSeconds;
      }
      if (left.route.finalityBlocks !== right.route.finalityBlocks) {
        return left.route.finalityBlocks - right.route.finalityBlocks;
      }
      return left.assessment.routeId.localeCompare(right.assessment.routeId);
    });
}

function decimalStringIsPositive(value: string): boolean {
  const trimmed = value.trim();
  return /^[0-9]+$/.test(trimmed) && /[1-9]/.test(trimmed);
}
