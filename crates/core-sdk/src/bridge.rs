//! Third-party bridge route disclosure helpers.
//!
//! These helpers do not call a node route or certify that a bridge is live.
//! They give wallets and policies a deterministic way to assess explicit
//! route disclosures against the v4.1 bridge safety floors.

use serde::{Deserialize, Serialize};

/// Mono-side administrative control over route configuration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    pub finality_blocks: u64,
    /// Route-specific cooldown before reductions or resumed flow are trusted.
    pub cooldown_seconds: u64,
    /// Mono-side administrative posture.
    pub admin_control: BridgeAdminControl,
    /// Circuit-breaker posture.
    pub circuit_breaker: BridgeCircuitBreakerState,
    /// Slashable/insured coverage ceiling as a decimal atomic-unit string.
    pub insurance_atomic: String,
    /// Optional last incident date in `YYYY-MM-DD` form.
    #[serde(default)]
    pub last_incident_date: Option<String>,
}

/// Risk tier assigned to an assessed route.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BridgeRiskTier {
    Low,
    Medium,
    High,
    Blocked,
}

/// Deterministic v4.1 bridge-floor assessment for one route.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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

fn decimal_string_is_positive(value: &str) -> bool {
    let trimmed = value.trim();
    !trimmed.is_empty()
        && trimmed.bytes().all(|b| b.is_ascii_digit())
        && trimmed.bytes().any(|b| b != b'0')
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
}
