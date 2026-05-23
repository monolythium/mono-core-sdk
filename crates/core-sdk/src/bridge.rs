//! Third-party bridge route disclosure helpers.
//!
//! These helpers do not call a node route or certify that a bridge is live.
//! They give wallets and policies a deterministic way to assess explicit
//! route disclosures against the v4.1 bridge safety floors.

use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

/// Mono-side administrative control over route configuration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "BridgeAdminControl.ts")
)]
pub enum BridgeAdminControl {
    /// No Mono-side admin key can mutate route parameters.
    None,
    /// Route changes require the chain's consensus/milestone path.
    ConsensusOnly,
    /// A third-party operator key can mutate Mono-side route parameters.
    OperatorKey,
    /// The disclosure did not identify the admin posture.
    Unknown,
}

/// Route circuit-breaker state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "BridgeCircuitBreakerState.ts")
)]
pub enum BridgeCircuitBreakerState {
    /// Circuit breaker is armed and route is open.
    Armed,
    /// Route is intentionally paused.
    Paused,
    /// No circuit breaker is configured.
    Disabled,
    /// Disclosure did not identify the breaker state.
    Unknown,
}

/// Verifier-set disclosure for a third-party bridge route.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "BridgeVerifierDisclosure.ts")
)]
pub struct BridgeVerifierDisclosure {
    /// Human-readable verifier model, e.g. `CCIP DON`, `LayerZero DVN`.
    pub model: String,
    /// Number of independent verifier participants.
    pub participant_count: u16,
    /// Minimum approvals needed to release or verify a message.
    pub threshold: u16,
}

/// Caller-supplied third-party bridge route disclosure.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "BridgeRouteDisclosure.ts")
)]
pub struct BridgeRouteDisclosure {
    /// Stable caller-local route id.
    pub route_id: String,
    /// Third-party bridge or bridge family name.
    pub bridge: String,
    /// Asset symbol or canonical asset id shown to users.
    pub asset: String,
    /// Source chain/user-facing origin label.
    pub source_chain: String,
    /// Destination chain/user-facing destination label.
    pub destination_chain: String,
    /// Verifier-set disclosure.
    pub verifier: BridgeVerifierDisclosure,
    /// Per-window route drain cap as a decimal atomic-unit string.
    pub drain_cap_atomic: String,
    /// Finality delay before the route should be treated as settled.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub finality_blocks: u64,
    /// Route-specific cooldown before reductions or resumed flow are trusted.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub cooldown_seconds: u64,
    /// Mono-side administrative posture.
    pub admin_control: BridgeAdminControl,
    /// Circuit-breaker posture.
    pub circuit_breaker: BridgeCircuitBreakerState,
    /// Slashable/insured coverage ceiling as a decimal atomic-unit string.
    pub insurance_atomic: String,
    /// Optional last incident date in `YYYY-MM-DD` form.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(optional = nullable))]
    pub last_incident_date: Option<String>,
}

/// Wallet/policy transfer intent for selecting among disclosed bridge routes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "BridgeTransferIntent.ts")
)]
pub struct BridgeTransferIntent {
    /// Asset symbol or canonical asset id the route disclosure must match.
    pub asset: String,
    /// Transfer amount as a decimal atomic-unit string.
    pub amount_atomic: String,
    /// Source chain/user-facing origin label the route disclosure must match.
    pub source_chain: String,
    /// Destination chain/user-facing destination label the disclosure must match.
    pub destination_chain: String,
    /// Recipient address or account identifier understood by the selected route.
    pub recipient: String,
    /// Optional sender address/account identifier for wallet display or policy logs.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional = nullable))]
    pub sender: Option<String>,
    /// Optional allow-list of route ids a wallet/policy is willing to use.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional = nullable))]
    pub allowed_route_ids: Option<Vec<String>>,
    /// Optional minimum route score in `0..=100`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional = nullable))]
    pub minimum_score: Option<u16>,
    /// Optional maximum acceptable finality delay.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub max_finality_blocks: Option<u64>,
    /// Optional maximum acceptable cooldown.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub max_cooldown_seconds: Option<u64>,
}

/// Risk tier assigned to an assessed route.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "BridgeRiskTier.ts"))]
pub enum BridgeRiskTier {
    Low,
    Medium,
    High,
    Blocked,
}

/// Deterministic v4.1 bridge-floor assessment for one route.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "BridgeRouteAssessment.ts")
)]
pub struct BridgeRouteAssessment {
    /// Route id copied from the disclosure.
    pub route_id: String,
    /// Whether the route satisfies the required floors.
    pub accepted: bool,
    /// Deterministic score in the range `0..=100`; blocked routes score `0`.
    pub score: u16,
    /// Coarse risk tier for wallet display and policy routing.
    pub risk_tier: BridgeRiskTier,
    /// Hard floor failures.
    pub blocked_reasons: Vec<String>,
    /// Non-blocking disclosures that should still be shown to users.
    pub warnings: Vec<String>,
}

/// One disclosed route assessed against a concrete bridge transfer intent.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "BridgeRouteCandidate.ts")
)]
pub struct BridgeRouteCandidate {
    /// Disclosure supplied by RPC/API or the caller.
    pub route: BridgeRouteDisclosure,
    /// v4.1 route-floor assessment independent of this transfer.
    pub assessment: BridgeRouteAssessment,
    /// Whether this route can be selected for the transfer intent.
    pub eligible: bool,
    /// Candidate score copied from the route assessment.
    pub score: u16,
    /// Hard failures for this candidate, including intent mismatches.
    pub blocked_reasons: Vec<String>,
    /// Non-blocking route warnings to surface to users.
    pub warnings: Vec<String>,
}

/// Concrete bridge request after a route has been selected.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "BridgeTransferRequest.ts")
)]
pub struct BridgeTransferRequest {
    /// Original transfer intent.
    pub intent: BridgeTransferIntent,
    /// Selected route disclosure.
    pub route: BridgeRouteDisclosure,
    /// Assessment that justified selecting the route.
    pub assessment: BridgeRouteAssessment,
}

/// Closed bridge-route selection result for a transfer intent.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "BridgeRouteSelection.ts")
)]
pub struct BridgeRouteSelection {
    /// Concrete request when one route satisfied the intent and floors.
    pub selected: Option<BridgeTransferRequest>,
    /// All supplied route disclosures assessed for this intent.
    pub candidates: Vec<BridgeRouteCandidate>,
    /// Selection-level failures. Empty when `selected` is present.
    pub blocked_reasons: Vec<String>,
}

/// Assess one third-party bridge route disclosure.
#[must_use]
pub fn assess_bridge_route(route: &BridgeRouteDisclosure) -> BridgeRouteAssessment {
    let mut blocked_reasons = Vec::new();
    let mut warnings = Vec::new();

    if route.route_id.trim().is_empty() {
        blocked_reasons.push("route id missing".to_owned());
    }
    if route.bridge.trim().is_empty() {
        blocked_reasons.push("bridge name missing".to_owned());
    }
    if route.asset.trim().is_empty() {
        blocked_reasons.push("asset disclosure missing".to_owned());
    }
    if route.verifier.model.trim().is_empty() {
        blocked_reasons.push("verifier model missing".to_owned());
    }
    if route.verifier.threshold < 2 || route.verifier.participant_count < 2 {
        blocked_reasons.push("verifier set must not be 1-of-1".to_owned());
    }
    if route.verifier.threshold > route.verifier.participant_count {
        blocked_reasons.push("verifier threshold exceeds participant count".to_owned());
    }
    if !decimal_string_is_positive(&route.drain_cap_atomic) {
        blocked_reasons.push("per-asset drain cap missing or zero".to_owned());
    }
    if route.finality_blocks == 0 {
        blocked_reasons.push("route finality delay missing".to_owned());
    }
    if route.cooldown_seconds == 0 {
        blocked_reasons.push("route cooldown missing".to_owned());
    }
    if !matches!(
        route.admin_control,
        BridgeAdminControl::None | BridgeAdminControl::ConsensusOnly
    ) {
        blocked_reasons.push("Mono-side admin control is not consensus-only".to_owned());
    }
    match route.circuit_breaker {
        BridgeCircuitBreakerState::Armed => {}
        BridgeCircuitBreakerState::Paused => {
            blocked_reasons.push("route circuit breaker is paused".to_owned());
        }
        BridgeCircuitBreakerState::Disabled | BridgeCircuitBreakerState::Unknown => {
            blocked_reasons.push("route circuit breaker missing".to_owned());
        }
    }
    if !decimal_string_is_positive(&route.insurance_atomic) {
        blocked_reasons.push("slashable insurance pool missing or zero".to_owned());
    }
    if route.last_incident_date.is_some() {
        warnings.push("route reports a prior bridge incident".to_owned());
    }

    if !blocked_reasons.is_empty() {
        return BridgeRouteAssessment {
            route_id: route.route_id.clone(),
            accepted: false,
            score: 0,
            risk_tier: BridgeRiskTier::Blocked,
            blocked_reasons,
            warnings,
        };
    }

    let mut score = 100u16;
    if route.verifier.threshold.saturating_mul(3) <= route.verifier.participant_count {
        score = score.saturating_sub(10);
        warnings.push("verifier threshold is below one-third-plus quorum".to_owned());
    }
    if route.cooldown_seconds < 3_600 {
        score = score.saturating_sub(10);
        warnings.push("cooldown is under one hour".to_owned());
    }
    if route.finality_blocks < 2 {
        score = score.saturating_sub(5);
        warnings.push("finality delay is under two blocks".to_owned());
    }

    let risk_tier = if score >= 90 {
        BridgeRiskTier::Low
    } else if score >= 75 {
        BridgeRiskTier::Medium
    } else {
        BridgeRiskTier::High
    };

    BridgeRouteAssessment {
        route_id: route.route_id.clone(),
        accepted: true,
        score,
        risk_tier,
        blocked_reasons,
        warnings,
    }
}

/// Rank routes for wallet/policy selection.
///
/// Accepted routes sort first by score descending, then cooldown ascending,
/// finality ascending, and route id. Blocked routes sort after accepted routes.
#[must_use]
pub fn rank_bridge_routes(
    routes: &[BridgeRouteDisclosure],
) -> Vec<(BridgeRouteDisclosure, BridgeRouteAssessment)> {
    let mut assessed: Vec<_> = routes
        .iter()
        .cloned()
        .map(|route| {
            let assessment = assess_bridge_route(&route);
            (route, assessment)
        })
        .collect();
    assessed.sort_by(|(left_route, left), (right_route, right)| {
        right
            .accepted
            .cmp(&left.accepted)
            .then_with(|| right.score.cmp(&left.score))
            .then_with(|| {
                left_route
                    .cooldown_seconds
                    .cmp(&right_route.cooldown_seconds)
            })
            .then_with(|| left_route.finality_blocks.cmp(&right_route.finality_blocks))
            .then_with(|| left.route_id.cmp(&right.route_id))
    });
    assessed
}

/// Score route disclosures against a bridge transfer intent.
///
/// The SDK only consumes disclosure data supplied by a node/API/caller. It does
/// not discover live third-party routes or synthesize bridge metadata.
#[must_use]
pub fn bridge_transfer_candidates(
    intent: &BridgeTransferIntent,
    routes: &[BridgeRouteDisclosure],
) -> Vec<BridgeRouteCandidate> {
    let intent_reasons = validate_bridge_transfer_intent(intent);
    let mut candidates: Vec<_> = routes
        .iter()
        .cloned()
        .map(|route| bridge_route_candidate(intent, &intent_reasons, route))
        .collect();
    candidates.sort_by(compare_bridge_candidates);
    candidates
}

/// Select the best disclosed route for a bridge transfer intent.
///
/// Selection fails closed: a missing or invalid intent, absent disclosure list,
/// missing floor disclosure, policy mismatch, paused/unsafe route, or transfer
/// amount beyond disclosed caps returns no selected request.
#[must_use]
pub fn select_bridge_transfer_route(
    intent: &BridgeTransferIntent,
    routes: &[BridgeRouteDisclosure],
) -> BridgeRouteSelection {
    let mut blocked_reasons = validate_bridge_transfer_intent(intent);
    let candidates = bridge_transfer_candidates(intent, routes);

    if routes.is_empty() {
        blocked_reasons.push("no route disclosures supplied".to_owned());
    }

    let selected = if blocked_reasons.is_empty() {
        candidates
            .iter()
            .find(|candidate| candidate.eligible)
            .map(|candidate| BridgeTransferRequest {
                intent: intent.clone(),
                route: candidate.route.clone(),
                assessment: candidate.assessment.clone(),
            })
    } else {
        None
    };

    if selected.is_none() && blocked_reasons.is_empty() {
        blocked_reasons.push(
            "no eligible bridge route satisfies the transfer intent and v4.1 floor".to_owned(),
        );
    }

    BridgeRouteSelection {
        selected,
        candidates,
        blocked_reasons,
    }
}

fn bridge_route_candidate(
    intent: &BridgeTransferIntent,
    intent_reasons: &[String],
    route: BridgeRouteDisclosure,
) -> BridgeRouteCandidate {
    let assessment = assess_bridge_route(&route);
    let mut blocked_reasons = intent_reasons.to_vec();
    blocked_reasons.extend(assessment.blocked_reasons.iter().cloned());

    if !trimmed_eq(&route.asset, &intent.asset) {
        blocked_reasons.push("route asset does not match transfer intent".to_owned());
    }
    if !trimmed_eq(&route.source_chain, &intent.source_chain) {
        blocked_reasons.push("route source chain does not match transfer intent".to_owned());
    }
    if !trimmed_eq(&route.destination_chain, &intent.destination_chain) {
        blocked_reasons.push("route destination chain does not match transfer intent".to_owned());
    }
    if intent.allowed_route_ids.as_ref().is_some_and(|allowed| {
        !allowed
            .iter()
            .any(|route_id| trimmed_eq(route_id, &route.route_id))
    }) {
        blocked_reasons.push("route id not allowed by transfer policy".to_owned());
    }
    if intent
        .minimum_score
        .is_some_and(|minimum| assessment.score < minimum)
    {
        blocked_reasons.push("route score below transfer policy minimum".to_owned());
    }
    if intent
        .max_finality_blocks
        .is_some_and(|max| route.finality_blocks > max)
    {
        blocked_reasons.push("route finality exceeds transfer policy maximum".to_owned());
    }
    if intent
        .max_cooldown_seconds
        .is_some_and(|max| route.cooldown_seconds > max)
    {
        blocked_reasons.push("route cooldown exceeds transfer policy maximum".to_owned());
    }
    if decimal_string_is_positive(&intent.amount_atomic)
        && decimal_string_is_positive(&route.drain_cap_atomic)
        && decimal_string_gt(&intent.amount_atomic, &route.drain_cap_atomic)
    {
        blocked_reasons.push("transfer amount exceeds route drain cap".to_owned());
    }
    if decimal_string_is_positive(&intent.amount_atomic)
        && decimal_string_is_positive(&route.insurance_atomic)
        && decimal_string_gt(&intent.amount_atomic, &route.insurance_atomic)
    {
        blocked_reasons.push("transfer amount exceeds disclosed insurance coverage".to_owned());
    }

    BridgeRouteCandidate {
        route,
        score: assessment.score,
        eligible: blocked_reasons.is_empty(),
        warnings: assessment.warnings.clone(),
        assessment,
        blocked_reasons,
    }
}

fn validate_bridge_transfer_intent(intent: &BridgeTransferIntent) -> Vec<String> {
    let mut blocked_reasons = Vec::new();
    if intent.asset.trim().is_empty() {
        blocked_reasons.push("transfer asset missing".to_owned());
    }
    if !decimal_string_is_positive(&intent.amount_atomic) {
        blocked_reasons.push("transfer amount missing or zero".to_owned());
    }
    if intent.source_chain.trim().is_empty() {
        blocked_reasons.push("transfer source chain missing".to_owned());
    }
    if intent.destination_chain.trim().is_empty() {
        blocked_reasons.push("transfer destination chain missing".to_owned());
    }
    if intent.recipient.trim().is_empty() {
        blocked_reasons.push("transfer recipient missing".to_owned());
    }
    if intent.minimum_score.is_some_and(|score| score > 100) {
        blocked_reasons.push("minimum route score exceeds 100".to_owned());
    }
    blocked_reasons
}

fn compare_bridge_candidates(
    left: &BridgeRouteCandidate,
    right: &BridgeRouteCandidate,
) -> Ordering {
    right
        .eligible
        .cmp(&left.eligible)
        .then_with(|| right.score.cmp(&left.score))
        .then_with(|| {
            left.route
                .cooldown_seconds
                .cmp(&right.route.cooldown_seconds)
        })
        .then_with(|| left.route.finality_blocks.cmp(&right.route.finality_blocks))
        .then_with(|| left.route.route_id.cmp(&right.route.route_id))
}

fn decimal_string_is_positive(value: &str) -> bool {
    let trimmed = value.trim();
    !trimmed.is_empty()
        && trimmed.bytes().all(|b| b.is_ascii_digit())
        && trimmed.bytes().any(|b| b != b'0')
}

fn decimal_string_gt(left: &str, right: &str) -> bool {
    decimal_string_cmp(left, right).is_some_and(|ordering| ordering == Ordering::Greater)
}

fn decimal_string_cmp(left: &str, right: &str) -> Option<Ordering> {
    let left = normalized_decimal_digits(left)?;
    let right = normalized_decimal_digits(right)?;
    Some(
        left.len()
            .cmp(&right.len())
            .then_with(|| left.as_str().cmp(right.as_str())),
    )
}

fn normalized_decimal_digits(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || !trimmed.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let normalized = trimmed.trim_start_matches('0');
    if normalized.is_empty() {
        Some("0".to_owned())
    } else {
        Some(normalized.to_owned())
    }
}

fn trimmed_eq(left: &str, right: &str) -> bool {
    left.trim() == right.trim()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn route(route_id: &str) -> BridgeRouteDisclosure {
        BridgeRouteDisclosure {
            route_id: route_id.to_owned(),
            bridge: "CCIP".to_owned(),
            asset: "USDC".to_owned(),
            source_chain: "Ethereum".to_owned(),
            destination_chain: "Mono".to_owned(),
            verifier: BridgeVerifierDisclosure {
                model: "DON".to_owned(),
                participant_count: 7,
                threshold: 5,
            },
            drain_cap_atomic: "100000000000".to_owned(),
            finality_blocks: 64,
            cooldown_seconds: 86_400,
            admin_control: BridgeAdminControl::ConsensusOnly,
            circuit_breaker: BridgeCircuitBreakerState::Armed,
            insurance_atomic: "50000000000".to_owned(),
            last_incident_date: None,
        }
    }

    fn transfer_intent() -> BridgeTransferIntent {
        BridgeTransferIntent {
            asset: "USDC".to_owned(),
            amount_atomic: "1000000".to_owned(),
            source_chain: "Ethereum".to_owned(),
            destination_chain: "Mono".to_owned(),
            recipient: "mono1recipient".to_owned(),
            sender: None,
            allowed_route_ids: None,
            minimum_score: None,
            max_finality_blocks: None,
            max_cooldown_seconds: None,
        }
    }

    #[test]
    fn bridge_route_assessment_accepts_disclosed_floor_compliant_route() {
        let assessment = assess_bridge_route(&route("ccip-usdc-eth"));
        assert!(assessment.accepted);
        assert_eq!(assessment.score, 100);
        assert_eq!(assessment.risk_tier, BridgeRiskTier::Low);
        assert!(assessment.blocked_reasons.is_empty());
    }

    #[test]
    fn bridge_route_assessment_blocks_kelp_class_route() {
        let mut r = route("kelp-class");
        r.verifier.participant_count = 1;
        r.verifier.threshold = 1;
        r.drain_cap_atomic = "0".to_owned();
        r.admin_control = BridgeAdminControl::OperatorKey;
        r.circuit_breaker = BridgeCircuitBreakerState::Disabled;
        r.insurance_atomic = "0".to_owned();

        let assessment = assess_bridge_route(&r);
        assert!(!assessment.accepted);
        assert_eq!(assessment.risk_tier, BridgeRiskTier::Blocked);
        assert!(assessment
            .blocked_reasons
            .iter()
            .any(|reason| reason.contains("1-of-1")));
        assert!(assessment
            .blocked_reasons
            .iter()
            .any(|reason| reason.contains("drain cap")));
        assert!(assessment
            .blocked_reasons
            .iter()
            .any(|reason| reason.contains("circuit breaker")));
    }

    #[test]
    fn bridge_route_ranking_prefers_accepted_higher_score_routes() {
        let mut low_score = route("short-cooldown");
        low_score.cooldown_seconds = 60;
        let mut blocked = route("paused");
        blocked.circuit_breaker = BridgeCircuitBreakerState::Paused;
        let routes = vec![blocked, low_score, route("healthy")];

        let ranked = rank_bridge_routes(&routes);
        assert_eq!(ranked[0].0.route_id, "healthy");
        assert_eq!(ranked[1].0.route_id, "short-cooldown");
        assert_eq!(ranked[2].0.route_id, "paused");
        assert!(!ranked[2].1.accepted);
    }

    #[test]
    fn bridge_transfer_selection_picks_best_matching_disclosure() {
        let mut short_cooldown = route("short-cooldown");
        short_cooldown.cooldown_seconds = 60;
        let mut wrong_asset = route("wrong-asset");
        wrong_asset.asset = "ETH".to_owned();

        let selection = select_bridge_transfer_route(
            &transfer_intent(),
            &[wrong_asset, short_cooldown, route("healthy")],
        );

        assert!(selection.blocked_reasons.is_empty());
        let selected = selection.selected.expect("selected route");
        assert_eq!(selected.route.route_id, "healthy");
        assert_eq!(selection.candidates[0].route.route_id, "healthy");
        let wrong_asset = selection
            .candidates
            .iter()
            .find(|candidate| candidate.route.route_id == "wrong-asset")
            .expect("wrong-asset candidate");
        assert!(!wrong_asset.eligible);
        assert!(wrong_asset
            .blocked_reasons
            .iter()
            .any(|reason| reason.contains("asset")));
    }

    #[test]
    fn bridge_transfer_selection_fails_closed_without_floor_data() {
        let mut under_disclosed = route("under-disclosed");
        under_disclosed.insurance_atomic = "0".to_owned();

        let selection = select_bridge_transfer_route(&transfer_intent(), &[under_disclosed]);

        assert!(selection.selected.is_none());
        assert!(selection
            .blocked_reasons
            .iter()
            .any(|reason| reason.contains("no eligible bridge route")));
        assert!(selection.candidates[0]
            .blocked_reasons
            .iter()
            .any(|reason| reason.contains("insurance")));
    }

    #[test]
    fn bridge_transfer_selection_blocks_amounts_over_disclosed_caps() {
        let mut capped = route("capped");
        capped.drain_cap_atomic = "1000".to_owned();
        capped.insurance_atomic = "999".to_owned();
        let mut intent = transfer_intent();
        intent.amount_atomic = "1001".to_owned();

        let selection = select_bridge_transfer_route(&intent, &[capped]);

        assert!(selection.selected.is_none());
        assert!(selection.candidates[0]
            .blocked_reasons
            .iter()
            .any(|reason| reason.contains("drain cap")));
        assert!(selection.candidates[0]
            .blocked_reasons
            .iter()
            .any(|reason| reason.contains("insurance coverage")));
    }

    #[test]
    fn bridge_transfer_selection_applies_policy_constraints() {
        let mut intent = transfer_intent();
        intent.allowed_route_ids = Some(vec!["healthy".to_owned()]);
        intent.minimum_score = Some(95);
        intent.max_finality_blocks = Some(128);
        intent.max_cooldown_seconds = Some(100_000);

        let mut low_score = route("healthy");
        low_score.cooldown_seconds = 60;
        let selection = select_bridge_transfer_route(&intent, &[low_score]);

        assert!(selection.selected.is_none());
        assert!(selection.candidates[0]
            .blocked_reasons
            .iter()
            .any(|reason| reason.contains("minimum")));
    }

    #[test]
    fn bridge_transfer_selection_reports_missing_disclosures() {
        let selection = select_bridge_transfer_route(&transfer_intent(), &[]);

        assert!(selection.selected.is_none());
        assert_eq!(selection.candidates, Vec::new());
        assert!(selection
            .blocked_reasons
            .iter()
            .any(|reason| reason.contains("no route disclosures")));
    }
}
