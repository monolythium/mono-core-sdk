/**
 * Third-party bridge route disclosure helpers.
 *
 * These helpers assess caller-supplied route disclosures. They do not call a
 * node route and do not claim any bridge integration is live.
 */

import { PRECOMPILE_ADDRESSES } from "./consts.js";

export const BRIDGE_SELECTORS = {
  lockBridgeConfig: "0x8956feb3",
  setBridgeResumeCooldown: "0x1a3a0672",
  setBridgeRouteFinality: "0x8a061e99",
} as const;

export const BRIDGE_REVERT_TAGS = {
  bridgeAdminLocked: "0xf807",
  bridgeResumeCooldownActive: "0xf808",
  bridgeCooldownZero: "0xfd08",
  bridgeFinalityZero: "0xfd09",
} as const;

export const BRIDGE_QUOTE_API_BLOCKED_REASON =
  "bridge quote requires a mono-core live quote API/runtime primitive";

export const BRIDGE_SUBMIT_API_BLOCKED_REASON =
  "bridge submit requires a mono-core live submit API/runtime primitive";

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

export class BridgeRouteCatalogueError extends Error {
  readonly blockedReasons: string[];

  constructor(blockedReasons: readonly string[]) {
    super(`invalid bridge route catalogue: ${blockedReasons.join("; ")}`);
    this.name = "BridgeRouteCatalogueError";
    this.blockedReasons = [...blockedReasons];
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

export function encodeSetBridgeResumeCooldownCalldata(
  bridgeId: BridgeBytesInput,
  cooldownBlocks: bigint | number | string,
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(BRIDGE_SELECTORS.setBridgeResumeCooldown),
      expectLength(toBytes(bridgeId), 32, "bridgeId"),
      uint64Word(cooldownBlocks, "cooldownBlocks"),
    ),
  );
}

export function encodeSetBridgeRouteFinalityCalldata(
  bridgeId: BridgeBytesInput,
  finalityBlocks: bigint | number | string,
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(BRIDGE_SELECTORS.setBridgeRouteFinality),
      expectLength(toBytes(bridgeId), 32, "bridgeId"),
      uint64Word(finalityBlocks, "finalityBlocks"),
    ),
  );
}

export function isBridgeAdminLockedRevert(data: BridgeBytesInput): boolean {
  return bytesToHex(toBytes(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeAdminLocked;
}

export function isBridgeResumeCooldownActiveRevert(data: BridgeBytesInput): boolean {
  return bytesToHex(toBytes(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeResumeCooldownActive;
}

export function isBridgeCooldownZeroRevert(data: BridgeBytesInput): boolean {
  return bytesToHex(toBytes(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeCooldownZero;
}

export function isBridgeFinalityZeroRevert(data: BridgeBytesInput): boolean {
  return bytesToHex(toBytes(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeFinalityZero;
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

export interface BridgeRouteCatalogueRoute {
  tokenId: string;
  routeId: string;
  bridgeId: string;
  wrappedAsset: string;
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
  updatedAtBlock: number;
  lastIncidentDate?: string | null;
}

export interface BridgeRouteCatalogue {
  routes: BridgeRouteCatalogueRoute[];
}

export type BridgeRouteCataloguePayload =
  | BridgeRouteCatalogue
  | readonly BridgeRouteCatalogueRoute[];

export interface BridgeRouteCatalogueValidation {
  accepted: boolean;
  routeCount: number;
  blockedReasons: string[];
}

export interface BridgeRouteCatalogueJsonOptions {
  /**
   * Export as `{ routes: [...] }` by default. Set false for mono-core's raw-array import form.
   */
  envelope?: boolean;
  /**
   * JSON.stringify spacing. Defaults to two spaces to match CLI fixture style.
   */
  space?: number | string;
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

/**
 * SDK-only readiness report for the quote/submit boundary.
 *
 * The SDK can verify route-selection readiness from supplied disclosures, but
 * live quote and submit remain blocked until mono-core exposes those
 * API/runtime primitives.
 */
export interface BridgeQuoteSubmitReadiness {
  selection: BridgeRouteSelection;
  routeSelectionReady: boolean;
  quoteReady: boolean;
  submitReady: boolean;
  blockedReasons: string[];
  warnings: string[];
}

export interface BridgeRoutesRequest {
  address?: string | null;
  intent?: BridgeTransferIntent | null;
  routeDisclosures?: BridgeRouteDisclosure[] | null;
  limit?: number | null;
}

export interface BridgeRoutesSource {
  address?: string | null;
  routeCount: number;
  globalRouteIndexAvailable: boolean;
  routeDisclosureSource: string;
}

export interface BridgeRoutesResponse {
  selection: BridgeRouteSelection;
  routeSelectionReady: boolean;
  quoteReady: boolean;
  submitReady: boolean;
  blockedReasons: string[];
  warnings: string[];
  routes?: BridgeRouteDisclosure[] | null;
  bridgeRouteDisclosures?: BridgeRouteDisclosure[] | null;
  source?: BridgeRoutesSource | null;
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
    blockedReasons.push("no eligible bridge route satisfies the transfer intent and route floor");
  }

  return { selected, candidates, blockedReasons };
}

export function bridgeQuoteSubmitReadiness(
  intent: BridgeTransferIntent,
  routes: readonly BridgeRouteDisclosure[],
): BridgeQuoteSubmitReadiness {
  const selection = selectBridgeTransferRoute(intent, routes);
  const routeSelectionReady = selection.selected != null;
  const blockedReasons = [...selection.blockedReasons];

  if (routeSelectionReady) {
    blockedReasons.push(BRIDGE_QUOTE_API_BLOCKED_REASON, BRIDGE_SUBMIT_API_BLOCKED_REASON);
  }

  return {
    selection,
    routeSelectionReady,
    quoteReady: false,
    submitReady: false,
    blockedReasons,
    warnings: selection.selected == null ? [] : [...selection.selected.assessment.warnings],
  };
}

export function bridgeRoutesReadiness(request: BridgeRoutesRequest): BridgeRoutesResponse {
  const routeDisclosures = request.routeDisclosures ?? [];
  const source: BridgeRoutesSource = {
    address: request.address,
    routeCount: routeDisclosures.length,
    globalRouteIndexAvailable: false,
    routeDisclosureSource: "request.routeDisclosures",
  };

  if (request.intent == null) {
    const blockedReasons = ["bridge route selection requires transfer intent"];
    if (routeDisclosures.length === 0) {
      blockedReasons.push("no route disclosures supplied");
    }
    return {
      selection: {
        selected: null,
        candidates: [],
        blockedReasons: [...blockedReasons],
      },
      routeSelectionReady: false,
      quoteReady: false,
      submitReady: false,
      blockedReasons,
      warnings: [],
      routes: [...routeDisclosures],
      bridgeRouteDisclosures: [...routeDisclosures],
      source,
    };
  }

  const readiness = bridgeQuoteSubmitReadiness(request.intent, routeDisclosures);
  return {
    ...readiness,
    quoteReady: false,
    submitReady: false,
    routes: [...routeDisclosures],
    bridgeRouteDisclosures: [...routeDisclosures],
    source,
  };
}

export function buildBridgeRouteCatalogue(
  routes: readonly BridgeRouteCatalogueRoute[],
): BridgeRouteCatalogue {
  return { routes: routes.map(cloneBridgeRouteCatalogueRoute) };
}

export function parseBridgeRouteCatalogueJson(json: string): BridgeRouteCatalogue {
  const decoded = JSON.parse(json) as unknown;
  return normalizeBridgeRouteCatalogue(decoded);
}

export function normalizeBridgeRouteCatalogue(payload: unknown): BridgeRouteCatalogue {
  const validation = validateBridgeRouteCatalogue(payload);
  if (!validation.accepted) {
    throw new BridgeRouteCatalogueError(validation.blockedReasons);
  }
  const routes = routeArrayFromCataloguePayload(payload);
  if (routes == null) {
    throw new BridgeRouteCatalogueError(["route catalogue must be an array or { routes: [...] }"]);
  }
  return { routes: routes.map((route) => coerceBridgeRouteCatalogueRoute(route)) };
}

export function validateBridgeRouteCatalogue(payload: unknown): BridgeRouteCatalogueValidation {
  const routes = routeArrayFromCataloguePayload(payload);
  const blockedReasons: string[] = [];

  if (routes == null) {
    return {
      accepted: false,
      routeCount: 0,
      blockedReasons: ["route catalogue must be an array or { routes: [...] }"],
    };
  }
  if (routes.length === 0) {
    blockedReasons.push("bridge route import must contain at least one route");
  }

  const seen = new Set<string>();
  routes.forEach((route, idx) =>
    validateBridgeRouteCatalogueRoute(idx, route, seen, blockedReasons),
  );

  return {
    accepted: blockedReasons.length === 0,
    routeCount: routes.length,
    blockedReasons,
  };
}

export function exportBridgeRouteCatalogueJson(
  payload: BridgeRouteCataloguePayload,
  options: BridgeRouteCatalogueJsonOptions = {},
): string {
  const catalogue = normalizeBridgeRouteCatalogue(payload);
  const value = options.envelope === false ? catalogue.routes : catalogue;
  return JSON.stringify(value, null, options.space ?? 2);
}

type JsonRecord = Record<string, unknown>;

const MAX_U256 = (1n << 256n) - 1n;

function routeArrayFromCataloguePayload(payload: unknown): readonly unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload) && Array.isArray(payload.routes)) return payload.routes;
  return null;
}

function validateBridgeRouteCatalogueRoute(
  idx: number,
  value: unknown,
  seen: Set<string>,
  blockedReasons: string[],
): void {
  const prefix = `routes[${idx}]`;
  if (!isRecord(value)) {
    blockedReasons.push(`${prefix} must be an object`);
    return;
  }

  const tokenId = validateHexBytes(
    `${prefix}.tokenId`,
    field(value, "tokenId", "token_id"),
    32,
    blockedReasons,
  );
  const routeId = validateTextField(
    `${prefix}.routeId`,
    field(value, "routeId", "route_id"),
    96,
    blockedReasons,
  );
  if (tokenId != null && routeId != null) {
    const key = `${tokenId}:${routeId}`;
    if (seen.has(key)) {
      blockedReasons.push(`${prefix}.routeId duplicate (tokenId, routeId) in bridge route import`);
    } else {
      seen.add(key);
    }
  }

  validateHexBytes(
    `${prefix}.bridgeId`,
    field(value, "bridgeId", "bridge_id"),
    32,
    blockedReasons,
  );
  validateHexBytes(
    `${prefix}.wrappedAsset`,
    field(value, "wrappedAsset", "wrapped_asset"),
    20,
    blockedReasons,
  );
  validateTextField(`${prefix}.bridge`, value.bridge, 64, blockedReasons);
  validateTextField(`${prefix}.asset`, value.asset, 64, blockedReasons);
  validateTextField(
    `${prefix}.sourceChain`,
    field(value, "sourceChain", "source_chain"),
    64,
    blockedReasons,
  );
  validateTextField(
    `${prefix}.destinationChain`,
    field(value, "destinationChain", "destination_chain"),
    64,
    blockedReasons,
  );

  const verifier = value.verifier;
  if (!isRecord(verifier)) {
    blockedReasons.push(`${prefix}.verifier must be an object`);
  } else {
    validateTextField(`${prefix}.verifier.model`, verifier.model, 64, blockedReasons);
    const participantCount = field(verifier, "participantCount", "participant_count");
    if (!isU16(participantCount) || participantCount === 0) {
      blockedReasons.push(`${prefix}.verifier.participantCount must be non-zero`);
    }
    if (!isU16(verifier.threshold) || verifier.threshold === 0) {
      blockedReasons.push(`${prefix}.verifier.threshold must be in 1..=participantCount`);
    } else if (isU16(participantCount) && verifier.threshold > participantCount) {
      blockedReasons.push(`${prefix}.verifier.threshold must be in 1..=participantCount`);
    }
  }

  if (!decimalStringIsPositiveU256(field(value, "drainCapAtomic", "drain_cap_atomic"))) {
    blockedReasons.push(`${prefix}.drainCapAtomic must be a non-zero decimal u256`);
  }
  if (!isSafeIntegerAtLeast(field(value, "finalityBlocks", "finality_blocks"), 1)) {
    blockedReasons.push(`${prefix}.finalityBlocks must be non-zero`);
  }
  if (!isSafeIntegerAtLeast(field(value, "cooldownSeconds", "cooldown_seconds"), 1)) {
    blockedReasons.push(`${prefix}.cooldownSeconds must be non-zero`);
  }
  if (parseBridgeAdminControl(field(value, "adminControl", "admin_control")) == null) {
    blockedReasons.push(
      `${prefix}.adminControl expected none, consensusOnly, operatorKey, or unknown`,
    );
  }
  if (parseBridgeCircuitBreaker(field(value, "circuitBreaker", "circuit_breaker")) == null) {
    blockedReasons.push(`${prefix}.circuitBreaker expected armed, paused, disabled, or unknown`);
  }
  if (!decimalStringIsPositiveU256(field(value, "insuranceAtomic", "insurance_atomic"))) {
    blockedReasons.push(`${prefix}.insuranceAtomic must be a non-zero decimal u256`);
  }
  if (!isSafeIntegerAtLeast(field(value, "updatedAtBlock", "updated_at_block"), 0)) {
    blockedReasons.push(`${prefix}.updatedAtBlock must be a non-negative safe integer`);
  }

  const incident = field(value, "lastIncidentDate", "last_incident_date");
  if (incident !== undefined && incident !== null) {
    if (typeof incident !== "string" || !incidentDateIsValid(incident)) {
      blockedReasons.push(`${prefix}.lastIncidentDate must be YYYY-MM-DD`);
    }
  }
}

function coerceBridgeRouteCatalogueRoute(value: unknown): BridgeRouteCatalogueRoute {
  if (!isRecord(value) || !isRecord(value.verifier)) {
    throw new BridgeRouteCatalogueError(["route catalogue validation did not normalize an object"]);
  }
  const lastIncidentDate = field(value, "lastIncidentDate", "last_incident_date");
  const route: BridgeRouteCatalogueRoute = {
    tokenId: stringField(value, "tokenId", "token_id"),
    routeId: stringField(value, "routeId", "route_id").trim(),
    bridgeId: stringField(value, "bridgeId", "bridge_id"),
    wrappedAsset: stringField(value, "wrappedAsset", "wrapped_asset"),
    bridge: stringField(value, "bridge").trim(),
    asset: stringField(value, "asset").trim(),
    sourceChain: stringField(value, "sourceChain", "source_chain").trim(),
    destinationChain: stringField(value, "destinationChain", "destination_chain").trim(),
    verifier: {
      model: stringField(value.verifier, "model").trim(),
      participantCount: numberField(value.verifier, "participantCount", "participant_count"),
      threshold: numberField(value.verifier, "threshold"),
    },
    drainCapAtomic: stringField(value, "drainCapAtomic", "drain_cap_atomic").trim(),
    finalityBlocks: numberField(value, "finalityBlocks", "finality_blocks"),
    cooldownSeconds: numberField(value, "cooldownSeconds", "cooldown_seconds"),
    adminControl: parseBridgeAdminControl(field(value, "adminControl", "admin_control"))!,
    circuitBreaker: parseBridgeCircuitBreaker(field(value, "circuitBreaker", "circuit_breaker"))!,
    insuranceAtomic: stringField(value, "insuranceAtomic", "insurance_atomic").trim(),
    updatedAtBlock: numberField(value, "updatedAtBlock", "updated_at_block"),
  };
  if (typeof lastIncidentDate === "string") {
    route.lastIncidentDate = lastIncidentDate.trim();
  } else if (lastIncidentDate === null) {
    route.lastIncidentDate = null;
  }
  return route;
}

function cloneBridgeRouteCatalogueRoute(route: BridgeRouteCatalogueRoute): BridgeRouteCatalogueRoute {
  return {
    ...route,
    verifier: { ...route.verifier },
  };
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function field(record: JsonRecord, camel: string, snake?: string): unknown {
  if (Object.prototype.hasOwnProperty.call(record, camel)) return record[camel];
  if (snake != null && Object.prototype.hasOwnProperty.call(record, snake)) return record[snake];
  return undefined;
}

function stringField(record: JsonRecord, camel: string, snake?: string): string {
  return field(record, camel, snake) as string;
}

function numberField(record: JsonRecord, camel: string, snake?: string): number {
  return field(record, camel, snake) as number;
}

function validateTextField(
  name: string,
  value: unknown,
  maxLen: number,
  blockedReasons: string[],
): string | null {
  if (typeof value !== "string") {
    blockedReasons.push(`${name} must be 1..=${maxLen} bytes`);
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || utf8ByteLength(trimmed) > maxLen) {
    blockedReasons.push(`${name} must be 1..=${maxLen} bytes`);
    return null;
  }
  return trimmed;
}

function validateHexBytes(
  name: string,
  value: unknown,
  expectedBytes: number,
  blockedReasons: string[],
): string | null {
  if (typeof value !== "string") {
    blockedReasons.push(`${name} must be ${expectedBytes} bytes of hex`);
    return null;
  }
  const trimmed = value.trim();
  const body = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (body.length !== expectedBytes * 2 || !/^[0-9a-fA-F]+$/.test(body)) {
    blockedReasons.push(`${name} must be ${expectedBytes} bytes of hex`);
    return null;
  }
  return body.toLowerCase();
}

function isU16(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffff;
}

function isSafeIntegerAtLeast(value: unknown, minimum: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}

function decimalStringIsPositiveU256(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) return false;
  const parsed = BigInt(trimmed);
  return parsed > 0n && parsed <= MAX_U256;
}

function parseBridgeAdminControl(value: unknown): BridgeAdminControl | null {
  if (typeof value !== "string") return null;
  switch (enumKey(value)) {
    case "none":
      return "none";
    case "consensusonly":
      return "consensusOnly";
    case "operatorkey":
      return "operatorKey";
    case "unknown":
      return "unknown";
    default:
      return null;
  }
}

function parseBridgeCircuitBreaker(value: unknown): BridgeCircuitBreakerState | null {
  if (typeof value !== "string") return null;
  switch (enumKey(value)) {
    case "armed":
      return "armed";
    case "paused":
      return "paused";
    case "disabled":
      return "disabled";
    case "unknown":
      return "unknown";
    default:
      return null;
  }
}

function enumKey(value: string): string {
  return [...value]
    .filter((c) => c !== "_" && c !== "-")
    .join("")
    .toLowerCase();
}

function incidentDateIsValid(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function expectLength(value: Uint8Array, len: number, name: string): Uint8Array {
  if (value.length !== len) {
    throw new BridgePrecompileError(`${name} must be ${len} bytes, got ${value.length}`);
  }
  return value;
}

function uint64Word(value: bigint | number | string, name: string): Uint8Array {
  const n = toBigint(value, name);
  if (n < 0n || n > 0xffff_ffff_ffff_ffffn) {
    throw new BridgePrecompileError(`${name} must fit uint64`);
  }
  const out = new Uint8Array(32);
  let rest = n;
  for (let i = 31; i >= 24; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function toBigint(value: bigint | number | string, name: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
      throw new BridgePrecompileError(`${name} must be a safe integer`);
    }
    return BigInt(value);
  }
  if (!/^(0x[0-9a-fA-F]+|[0-9]+)$/.test(value)) {
    throw new BridgePrecompileError(`${name} must be an integer string`);
  }
  return BigInt(value);
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
