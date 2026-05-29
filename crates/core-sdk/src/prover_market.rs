//! GPU prover-market precompile ABI helpers + read types (MB-4).
//!
//! Mirrors `mono-core/crates/precompiles/platform/prover-market`. The
//! six ops (`createRequest` / `submitBid` / `closeRequest` /
//! `submitProof` / `settle` / `slash`) all take a single `bytes`
//! canonical payload; their selectors are `keccak256(sig)[..4]`.
//!
//! Only the `createRequest` canonical payload is finalized on the chain
//! side today (`ProofRequest::encode_canonical`); the other five payload
//! bodies land at the deferred runtime-wiring wave, so their calldata
//! encoders carry a `TODO(monolythium-vision)`.
//!
//! NOTE: the prover-market precompile address is NOT yet wired
//! (registration deferred). The tentative slot is `0x1110`; surfaces
//! MUST confirm it at chain wiring before building a live plan.

use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

/// `SERVES_GPU_PROVE` capability bit (MB-4) — bit 9 of the node-registry
/// capability field. Re-exported here so a prover-market consumer can
/// gate on it without importing the node-registry module.
pub const SERVES_GPU_PROVE_BIT: u32 = 0x0000_0200;

/// Canonical selector signatures for every prover-market op.
pub const PROVER_MARKET_SIGS: &[&str] = &[
    "createRequest(bytes)",
    "submitBid(bytes)",
    "closeRequest(bytes)",
    "submitProof(bytes)",
    "settle(bytes)",
    "slash(bytes)",
];

/// Domain tag for the buyer's request signature.
pub const REQUEST_DOMAIN: &[u8] = b"prover_market.request.v1";
/// Domain tag for a prover's bid signature.
pub const BID_DOMAIN: &[u8] = b"prover_market.bid.v1";
/// Domain tag for the assigned prover's proof-submission signature.
pub const SUBMIT_DOMAIN: &[u8] = b"prover_market.submit.v1";

/// Reason code emitted by `ProverSlashed` for non-delivery.
pub const PROVER_SLASH_REASON_NON_DELIVERY: u16 = 0x0400;
/// Reason code emitted by `ProverSlashed` for a bad proof.
pub const PROVER_SLASH_REASON_BAD_PROOF: u16 = 0x0401;

/// 4-byte selector (`keccak256(sig)[..4]`) for a signature.
#[must_use]
pub fn selector_for(sig: &str) -> [u8; 4] {
    let digest = Keccak256::digest(sig.as_bytes());
    [digest[0], digest[1], digest[2], digest[3]]
}

/// Selectors for the six prover-market ops, as `0x`-prefixed hex.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ProverMarketSelectors;

impl ProverMarketSelectors {
    /// `createRequest(bytes)`.
    #[must_use]
    pub fn create_request() -> [u8; 4] {
        selector_for("createRequest(bytes)")
    }
    /// `submitBid(bytes)`.
    #[must_use]
    pub fn submit_bid() -> [u8; 4] {
        selector_for("submitBid(bytes)")
    }
    /// `closeRequest(bytes)`.
    #[must_use]
    pub fn close_request() -> [u8; 4] {
        selector_for("closeRequest(bytes)")
    }
    /// `submitProof(bytes)`.
    #[must_use]
    pub fn submit_proof() -> [u8; 4] {
        selector_for("submitProof(bytes)")
    }
    /// `settle(bytes)`.
    #[must_use]
    pub fn settle() -> [u8; 4] {
        selector_for("settle(bytes)")
    }
    /// `slash(bytes)`.
    #[must_use]
    pub fn slash() -> [u8; 4] {
        selector_for("slash(bytes)")
    }
}

/// Re-exported selector helper handle (parity with the TS surface's
/// `PROVER_MARKET_SELECTORS` map).
pub const PROVER_MARKET_SELECTORS: ProverMarketSelectors = ProverMarketSelectors;

/// Canonical prover-market event signatures (MB-4).
#[must_use]
pub fn prover_market_event_sigs() -> &'static [&'static str] {
    &[
        "ProofRequested(bytes32,address,bytes32,uint128,uint64)",
        "BidSubmitted(bytes32,address,uint128)",
        "RequestAssigned(bytes32,address,uint128)",
        "ProofSettled(bytes32,address,uint128,uint128)",
        "ProverSlashed(bytes32,address,uint16,bytes32)",
        "RequestExpired(bytes32,address,uint128)",
    ]
}

/// State machine for a proof request (mirrors
/// `prover-market::core::ProverMarketState`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "ProverMarketState.ts")
)]
pub enum ProverMarketState {
    /// Fresh request, accepting bids until `close` (byte `0`).
    Open,
    /// Closed + assigned to the lowest-fee prover (byte `1`).
    Assigned,
    /// Verified proof submitted; fee paid + remainder refunded (byte `2`).
    Settled,
    /// Non-delivery / bad proof; full escrow refunded + bond slashed (byte `3`).
    Slashed,
    /// Deadline passed with no assignment; escrow refunded (byte `4`).
    Expired,
}

impl ProverMarketState {
    /// Decode from the on-chain wire byte.
    #[must_use]
    pub const fn from_byte(b: u8) -> Option<Self> {
        match b {
            0 => Some(Self::Open),
            1 => Some(Self::Assigned),
            2 => Some(Self::Settled),
            3 => Some(Self::Slashed),
            4 => Some(Self::Expired),
            _ => None,
        }
    }

    /// Stable wire byte.
    #[must_use]
    pub const fn as_byte(self) -> u8 {
        match self {
            Self::Open => 0,
            Self::Assigned => 1,
            Self::Settled => 2,
            Self::Slashed => 3,
            Self::Expired => 4,
        }
    }
}

/// `lyth_getProofRequest` view of one [`ProofRequest`] record.
///
/// `max_fee` / `winning_fee` are decimal strings; hashes + addresses
/// are `0x`-prefixed hex.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "ProofRequestView.ts"))]
pub struct ProofRequestView {
    /// Canonical request id (`0x` 32 bytes).
    pub id: String,
    /// Buyer address (`0x` 20 bytes).
    pub buyer: String,
    /// Verification-key hash the proof must satisfy (`0x` 32 bytes).
    pub vkey_hash: String,
    /// Public-inputs commitment (`0x` 32 bytes).
    pub inputs_hash: String,
    /// Maximum fee escrowed (lythoshi decimal string).
    pub max_fee: String,
    /// Deterministic Unix-seconds deadline.
    #[cfg_attr(feature = "ts-bindings", ts(type = "string"))]
    pub deadline: u64,
    /// Buyer-supplied uniqueness nonce.
    #[cfg_attr(feature = "ts-bindings", ts(type = "string"))]
    pub nonce: u64,
    /// Current state-machine state.
    pub state: ProverMarketState,
    /// Assigned prover (`0x` 20 bytes); zero-address while Open/Expired.
    pub assigned_prover: String,
    /// Winning fee bid (lythoshi decimal string); `"0"` while Open.
    pub winning_fee: String,
    /// Delivered proof hash (`0x` 32 bytes); zero until `submitProof`.
    pub proof_hash: String,
}

/// `lyth_getProverBids` view of one prover fee bid.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "ProverBidView.ts"))]
pub struct ProverBidView {
    /// Request this bid targets (`0x` 32 bytes).
    pub request_id: String,
    /// Bidding prover (`0x` 20 bytes); must hold `SERVES_GPU_PROVE`.
    pub prover: String,
    /// Fee bid (lythoshi decimal string); must be `<= max_fee`.
    pub fee: String,
}

/// Compute the buyer's binding `request` sighash
/// (`prover_market.request.v1`).
#[must_use]
pub fn request_sighash(
    vkey_hash: [u8; 32],
    inputs_hash: [u8; 32],
    max_fee: u128,
    deadline: u64,
    nonce: u64,
) -> [u8; 32] {
    let mut buf = Vec::with_capacity(REQUEST_DOMAIN.len() + 32 + 32 + 16 + 8 + 8);
    buf.extend_from_slice(REQUEST_DOMAIN);
    buf.extend_from_slice(&vkey_hash);
    buf.extend_from_slice(&inputs_hash);
    buf.extend_from_slice(&max_fee.to_be_bytes());
    buf.extend_from_slice(&deadline.to_be_bytes());
    buf.extend_from_slice(&nonce.to_be_bytes());
    Keccak256::digest(&buf).into()
}

/// Compute the prover's `bid` sighash (`prover_market.bid.v1`).
#[must_use]
pub fn bid_sighash(request_id: [u8; 32], fee: u128) -> [u8; 32] {
    let mut buf = Vec::with_capacity(BID_DOMAIN.len() + 32 + 16);
    buf.extend_from_slice(BID_DOMAIN);
    buf.extend_from_slice(&request_id);
    buf.extend_from_slice(&fee.to_be_bytes());
    Keccak256::digest(&buf).into()
}

/// Compute the assigned prover's `submit` sighash
/// (`prover_market.submit.v1`).
#[must_use]
pub fn submit_sighash(request_id: [u8; 32], proof_hash: [u8; 32]) -> [u8; 32] {
    let mut buf = Vec::with_capacity(SUBMIT_DOMAIN.len() + 32 + 32);
    buf.extend_from_slice(SUBMIT_DOMAIN);
    buf.extend_from_slice(&request_id);
    buf.extend_from_slice(&proof_hash);
    Keccak256::digest(&buf).into()
}

/// Encode the canonical `createRequest` payload (the `bytes` body the
/// precompile accepts). Mirrors `ProofRequest::encode_canonical`:
///
/// ```text
/// buyer (20) || buyerPubkeyLen (be16) || buyerPubkey
///   || vkeyHash (32) || inputsHash (32) || maxFee (be16)
///   || deadline (be8) || nonce (be8) || sigLen (be16) || sig
/// ```
///
/// # Panics
/// Panics if `buyer_pubkey` / `sig` exceed `u16::MAX` bytes (the
/// canonical length prefixes are `u16`).
#[must_use]
#[allow(clippy::too_many_arguments)] // mirrors ProofRequest::encode_canonical's flat field list
pub fn encode_create_request_canonical(
    buyer: [u8; 20],
    buyer_pubkey: &[u8],
    vkey_hash: [u8; 32],
    inputs_hash: [u8; 32],
    max_fee: u128,
    deadline: u64,
    nonce: u64,
    sig: &[u8],
) -> Vec<u8> {
    let pk_len = u16::try_from(buyer_pubkey.len()).expect("buyer_pubkey exceeds u16");
    let sig_len = u16::try_from(sig.len()).expect("sig exceeds u16");
    let mut buf =
        Vec::with_capacity(20 + 2 + buyer_pubkey.len() + 32 + 32 + 16 + 8 + 8 + 2 + sig.len());
    buf.extend_from_slice(&buyer);
    buf.extend_from_slice(&pk_len.to_be_bytes());
    buf.extend_from_slice(buyer_pubkey);
    buf.extend_from_slice(&vkey_hash);
    buf.extend_from_slice(&inputs_hash);
    buf.extend_from_slice(&max_fee.to_be_bytes());
    buf.extend_from_slice(&deadline.to_be_bytes());
    buf.extend_from_slice(&nonce.to_be_bytes());
    buf.extend_from_slice(&sig_len.to_be_bytes());
    buf.extend_from_slice(sig);
    buf
}

/// Encode full `createRequest(bytes)` calldata: the 4-byte selector
/// followed by the ABI-`bytes`-wrapped canonical payload from
/// [`encode_create_request_canonical`].
#[must_use]
pub fn encode_create_request_calldata(canonical: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 64 + canonical.len().div_ceil(32) * 32);
    out.extend_from_slice(&ProverMarketSelectors::create_request());
    // ABI `bytes`: offset word (0x20) then length word then padded body.
    let mut offset = [0u8; 32];
    offset[31] = 0x20;
    out.extend_from_slice(&offset);
    let mut len_word = [0u8; 32];
    len_word[16..32].copy_from_slice(&(canonical.len() as u128).to_be_bytes());
    out.extend_from_slice(&len_word);
    out.extend_from_slice(canonical);
    let pad = (32 - (canonical.len() % 32)) % 32;
    out.extend(std::iter::repeat_n(0u8, pad));
    out
}

// TODO(monolythium-vision): mono-core-sdk missing submitBid / closeRequest /
// submitProof / settle / slash canonical-payload encoders — the chain side
// (`prover-market::precompile`) defers those op bodies to the runtime-wiring
// wave, so their canonical `bytes` layouts are not yet final. Add the
// encoders once they land. The selectors + sighash helpers above are final.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gpu_prove_bit_matches_node_registry() {
        assert_eq!(SERVES_GPU_PROVE_BIT, crate::node_registry::SERVES_GPU_PROVE);
        assert_eq!(SERVES_GPU_PROVE_BIT, 0x0000_0200);
    }

    #[test]
    fn selectors_are_distinct() {
        let all = [
            ProverMarketSelectors::create_request(),
            ProverMarketSelectors::submit_bid(),
            ProverMarketSelectors::close_request(),
            ProverMarketSelectors::submit_proof(),
            ProverMarketSelectors::settle(),
            ProverMarketSelectors::slash(),
        ];
        let mut seen = std::collections::BTreeSet::new();
        for s in all {
            assert!(seen.insert(s), "duplicate selector {s:?}");
        }
    }

    #[test]
    fn state_byte_round_trips() {
        for s in [
            ProverMarketState::Open,
            ProverMarketState::Assigned,
            ProverMarketState::Settled,
            ProverMarketState::Slashed,
            ProverMarketState::Expired,
        ] {
            assert_eq!(ProverMarketState::from_byte(s.as_byte()), Some(s));
        }
        assert_eq!(ProverMarketState::from_byte(99), None);
    }

    #[test]
    fn sighashes_change_with_fields_and_domains() {
        let vk = [1u8; 32];
        let ih = [2u8; 32];
        let base = request_sighash(vk, ih, 1_000, 100, 1);
        assert_ne!(base, request_sighash(vk, ih, 2_000, 100, 1));
        let id = [7u8; 32];
        assert_ne!(bid_sighash(id, 100), submit_sighash(id, [8u8; 32]));
    }

    #[test]
    fn create_request_canonical_round_trips_lengths() {
        let canonical = encode_create_request_canonical(
            [0x11; 20],
            &[0x22u8; 1952],
            [0x44; 32],
            [0x45; 32],
            1_000_000_000_000_000_000,
            2_000_000_000,
            42,
            &[0x66u8; 3309],
        );
        // 20 + 2 + 1952 + 32 + 32 + 16 + 8 + 8 + 2 + 3309 = 5381.
        assert_eq!(canonical.len(), 5381);
        let calldata = encode_create_request_calldata(&canonical);
        assert_eq!(&calldata[..4], &ProverMarketSelectors::create_request());
        // 4 + 32 (offset) + 32 (len) + ceil(5381/32)*32 = 4 + 64 + 5408.
        assert_eq!(calldata.len(), 4 + 64 + 5408);
    }
}
