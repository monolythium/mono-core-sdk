/**
 * Third-party bridge route disclosure helpers.
 *
 * These helpers assess caller-supplied route disclosures. They do not call a
 * node route and do not claim any bridge integration is live.
 */

import { PRECOMPILE_ADDRESSES } from "./consts.js";

export const BRIDGE_SELECTORS = {
  lockBridgeConfig: "0x8956feb3",
} as const;

export const BRIDGE_REVERT_TAGS = {
  bridgeAdminLocked: "0xf807",
} as const;

export type BridgeBytesInput = string | Uint8Array | readonly number[];

export type BridgeAdminControl = "none" | "consensusOnly" | "operatorKey" | "unknown";
export type BridgeCircuitBreakerState = "armed" | "paused" | "disabled" | "unknown";
export type BridgeRiskTier = "low" | "medium" | "high" | "blocked";

export class BridgePrecompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BridgePrecompileError";
  }
}

export function bridgeAddressHex(): string {
  return PRECOMPILE_ADDRESSES.BRIDGE.toLowerCase();
}

export function encodeLockBridgeConfigCalldata(bridgeId: BridgeBytesInput): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(BRIDGE_SELECTORS.lockBridgeConfig),
      expectLength(toBytes(bridgeId), 32, "bridgeId"),
    ),
  );
}

export function isBridgeAdminLockedRevert(data: BridgeBytesInput): boolean {
  return bytesToHex(toBytes(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeAdminLocked;
}

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

export interface BridgeTransferIntent {
  asset: string;
  amountAtomic: string;
  sourceChain: string;
  destinationChain: string;
  recipient: string;
  sender?: string | null;
  allowedRouteIds?: string[] | null;
  minimumScore?: number | null;
  maxFinalityBlocks?: number | null;
  maxCooldownSeconds?: number | null;
}

export interface BridgeRouteCandidate {
  route: BridgeRouteDisclosure;
  assessment: BridgeRouteAssessment;
  eligible: boolean;
  score: number;
  blockedReasons: string[];
  warnings: string[];
}

export interface BridgeTransferRequest {
  intent: BridgeTransferIntent;
  route: BridgeRouteDisclosure;
  assessment: BridgeRouteAssessment;
}

export interface BridgeRouteSelection {
  selected: BridgeTransferRequest | null;
  candidates: BridgeRouteCandidate[];
  blockedReasons: string[];
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

export function bridgeTransferCandidates(
  intent: BridgeTransferIntent,
  routes: readonly BridgeRouteDisclosure[],
): BridgeRouteCandidate[] {
  const intentReasons = validateBridgeTransferIntent(intent);
  return routes
    .map((route) => bridgeRouteCandidate(intent, intentReasons, route))
    .sort(compareBridgeCandidates);
}

export function selectBridgeTransferRoute(
  intent: BridgeTransferIntent,
  routes: readonly BridgeRouteDisclosure[],
): BridgeRouteSelection {
  const blockedReasons = validateBridgeTransferIntent(intent);
  const candidates = bridgeTransferCandidates(intent, routes);

  if (routes.length === 0) {
    blockedReasons.push("no route disclosures supplied");
  }

  const selectedCandidate =
    blockedReasons.length === 0 ? candidates.find((candidate) => candidate.eligible) : undefined;
  const selected =
    selectedCandidate == null
      ? null
      : {
          intent,
          route: selectedCandidate.route,
          assessment: selectedCandidate.assessment,
        };

  if (selected == null && blockedReasons.length === 0) {
    blockedReasons.push("no eligible bridge route satisfies the transfer intent and v4.1 floor");
  }

  return { selected, candidates, blockedReasons };
}

function bridgeRouteCandidate(
  intent: BridgeTransferIntent,
  intentReasons: readonly string[],
  route: BridgeRouteDisclosure,
): BridgeRouteCandidate {
  const assessment = assessBridgeRoute(route);
  const blockedReasons = [...intentReasons, ...assessment.blockedReasons];

  if (!trimmedEq(route.asset, intent.asset)) {
    blockedReasons.push("route asset does not match transfer intent");
  }
  if (!trimmedEq(route.sourceChain, intent.sourceChain)) {
    blockedReasons.push("route source chain does not match transfer intent");
  }
  if (!trimmedEq(route.destinationChain, intent.destinationChain)) {
    blockedReasons.push("route destination chain does not match transfer intent");
  }
  if (
    intent.allowedRouteIds != null &&
    !intent.allowedRouteIds.some((routeId) => trimmedEq(routeId, route.routeId))
  ) {
    blockedReasons.push("route id not allowed by transfer policy");
  }
  if (intent.minimumScore != null && assessment.score < intent.minimumScore) {
    blockedReasons.push("route score below transfer policy minimum");
  }
  if (intent.maxFinalityBlocks != null && route.finalityBlocks > intent.maxFinalityBlocks) {
    blockedReasons.push("route finality exceeds transfer policy maximum");
  }
  if (intent.maxCooldownSeconds != null && route.cooldownSeconds > intent.maxCooldownSeconds) {
    blockedReasons.push("route cooldown exceeds transfer policy maximum");
  }
  if (
    decimalStringIsPositive(intent.amountAtomic) &&
    decimalStringIsPositive(route.drainCapAtomic) &&
    decimalStringGt(intent.amountAtomic, route.drainCapAtomic)
  ) {
    blockedReasons.push("transfer amount exceeds route drain cap");
  }
  if (
    decimalStringIsPositive(intent.amountAtomic) &&
    decimalStringIsPositive(route.insuranceAtomic) &&
    decimalStringGt(intent.amountAtomic, route.insuranceAtomic)
  ) {
    blockedReasons.push("transfer amount exceeds disclosed insurance coverage");
  }

  return {
    route,
    assessment,
    eligible: blockedReasons.length === 0,
    score: assessment.score,
    blockedReasons,
    warnings: [...assessment.warnings],
  };
}

function validateBridgeTransferIntent(intent: BridgeTransferIntent): string[] {
  const blockedReasons: string[] = [];
  if (intent.asset.trim() === "") blockedReasons.push("transfer asset missing");
  if (!decimalStringIsPositive(intent.amountAtomic)) {
    blockedReasons.push("transfer amount missing or zero");
  }
  if (intent.sourceChain.trim() === "") blockedReasons.push("transfer source chain missing");
  if (intent.destinationChain.trim() === "") {
    blockedReasons.push("transfer destination chain missing");
  }
  if (intent.recipient.trim() === "") blockedReasons.push("transfer recipient missing");
  if (intent.minimumScore != null && intent.minimumScore > 100) {
    blockedReasons.push("minimum route score exceeds 100");
  }
  return blockedReasons;
}

function compareBridgeCandidates(left: BridgeRouteCandidate, right: BridgeRouteCandidate): number {
  if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
  if (left.score !== right.score) return right.score - left.score;
  if (left.route.cooldownSeconds !== right.route.cooldownSeconds) {
    return left.route.cooldownSeconds - right.route.cooldownSeconds;
  }
  if (left.route.finalityBlocks !== right.route.finalityBlocks) {
    return left.route.finalityBlocks - right.route.finalityBlocks;
  }
  return left.route.routeId.localeCompare(right.route.routeId);
}

function decimalStringIsPositive(value: string): boolean {
  const trimmed = value.trim();
  return /^[0-9]+$/.test(trimmed) && /[1-9]/.test(trimmed);
}

function decimalStringGt(left: string, right: string): boolean {
  return decimalStringCompare(left, right) === 1;
}

function decimalStringCompare(left: string, right: string): -1 | 0 | 1 | null {
  const normalizedLeft = normalizedDecimalDigits(left);
  const normalizedRight = normalizedDecimalDigits(right);
  if (normalizedLeft == null || normalizedRight == null) return null;
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length > normalizedRight.length ? 1 : -1;
  }
  if (normalizedLeft === normalizedRight) return 0;
  return normalizedLeft > normalizedRight ? 1 : -1;
}

function normalizedDecimalDigits(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) return null;
  const normalized = trimmed.replace(/^0+/, "");
  return normalized === "" ? "0" : normalized;
}

function trimmedEq(left: string, right: string): boolean {
  return left.trim() === right.trim();
}

function expectLength(value: Uint8Array, len: number, name: string): Uint8Array {
  if (value.length !== len) {
    throw new BridgePrecompileError(`${name} must be ${len} bytes, got ${value.length}`);
  }
  return value;
}

function toBytes(value: BridgeBytesInput): Uint8Array {
  if (typeof value === "string") {
    return hexToBytes(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function hexToBytes(hex: string): Uint8Array {
  const body = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (body.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw new BridgePrecompileError("invalid hex bytes");
  }
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
