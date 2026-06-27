//! Node-registry read types, capability constants, cluster-formation
//! event decode, and the cluster-anchor derivation helper.
//!
//! These mirror `mono-core/crates/economics/node-registry`:
//! - PF-6 — operator network metadata (`getOperatorNetworkMetadata`)
//!   and cluster diversity scoring (`getClusterDiversity`).
//! - MB-5 — the `ClusterFormed` event + the runtime-formed anchor
//!   address derivation (`derive_cluster_anchor_address`, Law §7.13).
//!
//! The capability constants mirror `node-registry::capabilities`; the
//! `SERVES_GPU_PROVE` bit (MB-4) is included here so a single
//! capability surface covers the prover market.

use blake3::Hasher;
use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

/// JSON-RPC server (`eth_*` / `lyth_*`).
pub const SERVES_RPC: u32 = 0x0000_0001;
/// GraphQL + SQL read endpoints.
pub const SERVES_INDEXER: u32 = 0x0000_0002;
/// Transaction-submission relay.
pub const SERVES_BROADCASTER: u32 = 0x0000_0004;
/// Historical state proof — `eth_getProof` at full depth.
pub const SERVES_ARCHIVE: u32 = 0x0000_0008;
/// WebSocket subscription topics.
pub const SERVES_WEBSOCKET: u32 = 0x0000_0010;
/// Light-client header + proof sync.
pub const SERVES_LIGHT_CLIENT: u32 = 0x0000_0020;
/// Oracle-writer — may sign decentralized oracle observations.
pub const SERVES_ORACLE_WRITER: u32 = 0x0000_0040;
/// Bridge relayer — may submit foreign-chain proofs.
pub const SERVES_BRIDGE_RELAY: u32 = 0x0000_0080;
/// Public REST API surface.
pub const SERVES_PUBLIC_API: u32 = 0x0000_0100;
/// GPU prover — may bid on + serve the GPU prover market (MB-4).
///
/// Bit 9. Mirrors `node-registry::capabilities::SERVES_GPU_PROVE`. An
/// operator that advertises this bit may post bids on open proof
/// requests and submit proofs once assigned.
pub const SERVES_GPU_PROVE: u32 = 0x0000_0200;

/// Mask of valid capability bits (low 16). The high half must be zero.
pub const NODE_REGISTRY_CAPABILITY_MASK: u32 = 0x0000_FFFF;

/// Maximum basis-point value for any diversity term / the headline
/// score (`node-registry::diversity::DIVERSITY_SCORE_MAX`).
pub const DIVERSITY_SCORE_MAX: u16 = 10_000;

/// Active operators in a runtime-formed standard cluster.
pub const FORM_CLUSTER_ACTIVE_COUNT: usize = 7;
/// Standby operators in a runtime-formed standard cluster.
pub const FORM_CLUSTER_STANDBY_COUNT: usize = 3;
/// Total operators in a runtime-formed standard cluster.
pub const FORM_CLUSTER_MEMBER_COUNT: usize = FORM_CLUSTER_ACTIVE_COUNT + FORM_CLUSTER_STANDBY_COUNT;
/// Consensus threshold for the standard 7-of-10 topology.
pub const FORM_CLUSTER_THRESHOLD: u16 = 7;
/// Full ML-DSA-65 consensus public key width.
pub const NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES: usize = 1_952;
/// ML-DSA-65 signature width.
pub const NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES: usize = 3_309;
/// ML-KEM-768 encapsulation key width published for LythiumSeal operator rosters.
pub const NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES: usize = 1_184;

/// BLAKE3 multisig address-derivation domain
/// (`crypto::MULTISIG_ADDRESS_DERIVATION_DOMAIN`). Folded into the
/// cluster-anchor preimage.
pub const MULTISIG_ADDRESS_DERIVATION_DOMAIN: &[u8] = b"MONO_MULTISIG_BLAKE3_20_V1";

const FORM_CLUSTER_MESSAGE_DOMAIN: &[u8] = b"PROTOCORE_NODE_REGISTRY_CLUSTER_FORM_V1\x00";
const FORM_CLUSTER_MESSAGE_DOMAIN_V2: &[u8] = b"PROTOCORE_NODE_REGISTRY_CLUSTER_FORM_V2\x00";

/// Fixed byte width of the V2 charter argument: 10×u16 BE member shares
/// (member-declaration order: active `0..7`, then standby `7..10`) ‖
/// u16 BE delegator share ‖ u64 BE consent expiry (ms).
pub const NODE_REGISTRY_CLUSTER_CHARTER_BYTES: usize = 30;
/// Protocol floor for a charter's delegator share (Law §6.8).
pub const NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS: u16 = 2_000;
/// Basis-point denominator a charter's member shares must sum to.
pub const NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS: u16 = 10_000;

/// Hosting class an operator runs under (PF-6).
///
/// Mirrors `node-registry::registration::HostingClass`. Decoded from
/// the right-aligned `u8` enum byte; any value outside `0..=2` falls
/// back to `Cloud` (the least-diverse class) so an unparseable byte
/// never inflates a cluster's diversity score.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "NodeHostingClass.ts"))]
pub enum NodeHostingClass {
    /// Owned / dedicated bare-metal hardware (byte `0`).
    BareMetal,
    /// Co-location facility (byte `1`).
    CoLocation,
    /// Public-cloud instance (byte `2`).
    Cloud,
}

impl NodeHostingClass {
    /// Decode a hosting-class byte. Any value outside `0..=2` → `Cloud`.
    #[must_use]
    pub const fn from_byte(b: u8) -> Self {
        match b {
            0 => Self::BareMetal,
            1 => Self::CoLocation,
            _ => Self::Cloud,
        }
    }

    /// Encode as the right-aligned `u8` enum byte.
    #[must_use]
    pub const fn to_byte(self) -> u8 {
        match self {
            Self::BareMetal => 0,
            Self::CoLocation => 1,
            Self::Cloud => 2,
        }
    }
}

/// `getOperatorNetworkMetadata` view (PF-6).
///
/// Mirrors the `(uint16 asn, bytes3 geoRegion, uint8 hostingClass,
/// bytes32 ipAddressHash, bytes32 pcrDigest)` return tuple. The raw IP
/// never lives on-chain — `ip_address_hash` is `keccak256(ipHint)`.
/// All fields are zero/`Cloud`/`0x00..0` if the peer never declared
/// metadata.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "OperatorNetworkMetadata.ts")
)]
pub struct OperatorNetworkMetadata {
    /// Autonomous-system number; `0` = not declared.
    pub asn: u16,
    /// ISO-3166-1 alpha-3 region as `0x`-prefixed 3-byte hex; all-zero
    /// = not declared.
    pub geo_region: String,
    /// Declared hosting class.
    pub hosting_class: NodeHostingClass,
    /// `keccak256` of the operator's public IP; `0x00..0` = not declared.
    pub ip_address_hash: String,
    /// `keccak256` of the TPM PCR digest; `0x00..0` = no quote attached.
    pub pcr_digest: String,
}

/// `getClusterDiversity` view (PF-6).
///
/// Mirrors the `(uint16 score, uint16 asnVariance, uint16 geoVariance,
/// uint16 hostingSpread)` return tuple. `score` is the unweighted mean
/// of the three breakdown terms; every field is in `0..=10000` basis
/// points.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "ClusterDiversity.ts"))]
pub struct ClusterDiversity {
    /// Headline diversity score (`0..=10000`).
    pub score: u16,
    /// Normalised ASN-distribution entropy (`0..=10000`).
    pub asn_variance: u16,
    /// Normalised country-distribution entropy (`0..=10000`).
    pub geo_variance: u16,
    /// Normalised hosting-class-distribution entropy (`0..=10000`).
    pub hosting_spread: u16,
}

/// Decoded `ClusterFormed(uint32,uint64,address,bytes)` event (MB-5).
///
/// Mirrors `node-registry::events::CLUSTER_FORMED`. `operator_roster`
/// is the concatenation of 48-byte cluster-member references
/// (`0x`-prefixed hex). PQ rosters place the 32-byte operator id in
/// the first 32 bytes and zero-pad the remaining 16 bytes. The
/// `anchor_address` is the cluster's primary network anchor (Law
/// §7.13) as `0x`-prefixed 20-byte hex.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "ClusterFormedEvent.ts")
)]
pub struct ClusterFormedEvent {
    /// Cluster identifier (indexed topic 1).
    pub cluster_id: u32,
    /// Activation epoch (indexed topic 2).
    pub effective_epoch: u64,
    /// Primary anchor address (`0x` 20 bytes).
    pub anchor_address: String,
    /// Concatenated 48-byte cluster-member references (`0x` hex).
    pub operator_roster: String,
}

/// Derive a runtime-formed cluster's primary-anchor address from its
/// operator roster (MB-5 / Law §7.13).
///
/// Reuses the canonical order-insensitive multisig rule:
/// `address = BLAKE3(MONO_MULTISIG_BLAKE3_20_V1 || threshold_be16 ||
/// (member_len_be8 || member)*sorted)[..20]`. The result is a 20-byte
/// ADR-0038 payload; surfaces render the human-facing form under the
/// `monok` cluster HRP.
///
/// `roster` is the full set of 48-byte cluster-member references;
/// `threshold` is the cluster's `t` (e.g. 5-of-7). Member ordering does
/// not affect the result.
#[must_use]
pub fn derive_cluster_anchor_address(roster: &[[u8; 48]], threshold: u16) -> [u8; 20] {
    let mut sorted: Vec<&[u8; 48]> = roster.iter().collect();
    sorted.sort_unstable();

    let mut hasher = Hasher::new();
    hasher.update(MULTISIG_ADDRESS_DERIVATION_DOMAIN);
    hasher.update(&threshold.to_be_bytes());
    for member in sorted {
        let member_len = member.len() as u64;
        hasher.update(&member_len.to_be_bytes());
        hasher.update(member.as_slice());
    }
    let hash = hasher.finalize();
    let mut out = [0u8; 20];
    out.copy_from_slice(&hash.as_bytes()[..20]);
    out
}

/// Build the roster-consent digest all ten operators sign for
/// `formCluster(bytes,bytes,bytes)`.
///
/// `active_pubkeys` is the seven active ML-DSA-65 pubkeys concatenated
/// in roster order; `standby_pubkeys` is the three standby ML-DSA-65
/// pubkeys concatenated in roster order.
#[must_use]
pub fn form_cluster_message(active_pubkeys: &[u8], standby_pubkeys: &[u8]) -> [u8; 32] {
    let mut hasher = Hasher::new();
    hasher.update(FORM_CLUSTER_MESSAGE_DOMAIN);
    hasher.update(&(FORM_CLUSTER_ACTIVE_COUNT as u16).to_be_bytes());
    hasher.update(&(FORM_CLUSTER_STANDBY_COUNT as u16).to_be_bytes());
    hasher.update(&FORM_CLUSTER_THRESHOLD.to_be_bytes());
    hasher.update(&(active_pubkeys.len() as u32).to_be_bytes());
    hasher.update(active_pubkeys);
    hasher.update(&(standby_pubkeys.len() as u32).to_be_bytes());
    hasher.update(standby_pubkeys);
    hasher.finalize().into()
}

/// Build the V2 roster-consent digest for
/// `formCluster(bytes,bytes,bytes,bytes)` — the V1 commitment plus the
/// length-prefixed charter bytes under a fresh domain.
///
/// `charter` is the raw
/// [`NODE_REGISTRY_CLUSTER_CHARTER_BYTES`]-byte wire payload including
/// `expires_ms`, so the cluster's economics AND the consent expiry are
/// inside what every member signs. Byte-identical to mono-core's
/// `form_cluster_message_v2` and the TS `formClusterMessageV2`.
#[must_use]
pub fn form_cluster_message_v2(
    active_pubkeys: &[u8],
    standby_pubkeys: &[u8],
    charter: &[u8],
) -> [u8; 32] {
    let mut hasher = Hasher::new();
    hasher.update(FORM_CLUSTER_MESSAGE_DOMAIN_V2);
    hasher.update(&(FORM_CLUSTER_ACTIVE_COUNT as u16).to_be_bytes());
    hasher.update(&(FORM_CLUSTER_STANDBY_COUNT as u16).to_be_bytes());
    hasher.update(&FORM_CLUSTER_THRESHOLD.to_be_bytes());
    hasher.update(&(active_pubkeys.len() as u32).to_be_bytes());
    hasher.update(active_pubkeys);
    hasher.update(&(standby_pubkeys.len() as u32).to_be_bytes());
    hasher.update(standby_pubkeys);
    hasher.update(&(charter.len() as u32).to_be_bytes());
    hasher.update(charter);
    hasher.finalize().into()
}

/// `true` when all bits set in `flags` lie within
/// [`NODE_REGISTRY_CAPABILITY_MASK`].
#[must_use]
pub const fn is_valid_capabilities(flags: u32) -> bool {
    flags & !NODE_REGISTRY_CAPABILITY_MASK == 0
}

// ---------------------------------------------------------------------
// L6 — open-seat marketplace primitive (node-registry, tag 0x32).
//
// Read views + ABI selector/topic helpers for the advertise → apply →
// vote → fill loop layered over the existing CJ-1 signed-consent
// admission. Mirrors mono-core `node-registry/src/{cluster_seat,abi,
// events}.rs`. The low-level calldata encoders are TypeScript-side (as
// with CJ-1); the Rust surface carries the constants, ABI identifiers,
// and the projected read/event shapes.
// ---------------------------------------------------------------------

/// One LYTH in lythoshi (`1e18`). Mirrors `consts::LYTHOSHI_PER_LYTH`.
const SEAT_LYTHOSHI_PER_LYTH: u128 = 1_000_000_000_000_000_000;

/// Storage-slot tag byte for the open-seat family (under `0x1005`).
/// Mirrors `cluster_seat::TAG_CLUSTER_SEAT` — the next tag after
/// `TAG_CLUSTER_CHARTER` (`0x31`).
pub const TAG_CLUSTER_SEAT: u8 = 0x32;

/// Refundable application escrow charged by `applyForSeat`, in lythoshi
/// (`100 LYTH`). Mirrors `cluster_seat::APPLICATION_ESCROW_LYTHOSHI`.
/// Anti-spam only; refunded on withdraw/reject and DISTINCT from the
/// self-bond, which is bound at seat-fill (admit), not at apply.
pub const SEAT_APPLICATION_ESCROW_LYTHOSHI: u128 = 100 * SEAT_LYTHOSHI_PER_LYTH;

/// Operator self-bond floor in lythoshi (`5,000 LYTH`). Mirrors
/// `bond::MIN_SELF_BOND_LYTHOSHI` — the constitutional floor (raise-only;
/// lowering it is a hard fork). NOT the legacy 50,000 design fiction.
pub const MIN_SELF_BOND_LYTHOSHI: u128 = 5_000 * SEAT_LYTHOSHI_PER_LYTH;

/// Active-vacancy seat kind (`kind=0`). Mirrors `cluster_seat::SEAT_KIND_ACTIVE`.
pub const SEAT_KIND_ACTIVE: u8 = 0;
/// Standby-vacancy seat kind (`kind=1`). Mirrors `cluster_seat::SEAT_KIND_STANDBY`.
pub const SEAT_KIND_STANDBY: u8 = 1;

/// Canonical `advertiseSeat` signature (mono-core `abi::sig::ADVERTISE_SEAT`).
pub const SIGHASH_ADVERTISE_SEAT: &str =
    "advertiseSeat(uint32,uint8,uint32,uint128,uint32,bytes32)";
/// Canonical `applyForSeat` signature (mono-core `abi::sig::APPLY_FOR_SEAT`).
pub const SIGHASH_APPLY_FOR_SEAT: &str = "applyForSeat(uint32,uint32,bytes)";
/// Canonical `voteSeatAdmit` signature (mono-core `abi::sig::VOTE_SEAT_ADMIT`).
pub const SIGHASH_VOTE_SEAT_ADMIT: &str = "voteSeatAdmit(uint32,bytes32,bytes)";
/// Canonical `withdrawSeatApplication` signature (mono-core `abi::sig::WITHDRAW_SEAT_APPLICATION`).
pub const SIGHASH_WITHDRAW_SEAT_APPLICATION: &str = "withdrawSeatApplication(uint32,bytes32)";
/// Canonical `closeSeat` signature (mono-core `abi::sig::CLOSE_SEAT`).
pub const SIGHASH_CLOSE_SEAT: &str = "closeSeat(uint32,uint32)";

/// Canonical `SeatAdvertised` event signature (mono-core `events::sig::SEAT_ADVERTISED`).
pub const SEAT_ADVERTISED_EVENT_SIG: &str =
    "SeatAdvertised(uint32,uint32,bytes32,uint8,uint32,uint128,uint32,bytes32)";
/// Canonical `SeatApplied` event signature (mono-core `events::sig::SEAT_APPLIED`).
pub const SEAT_APPLIED_EVENT_SIG: &str = "SeatApplied(uint32,uint32,bytes32,address,uint128)";
/// Canonical `SeatFilled` event signature (mono-core `events::sig::SEAT_FILLED`).
pub const SEAT_FILLED_EVENT_SIG: &str = "SeatFilled(uint32,uint32,bytes32,uint16,uint16)";
/// Canonical `SeatClosed` event signature (mono-core `events::sig::SEAT_CLOSED`).
pub const SEAT_CLOSED_EVENT_SIG: &str = "SeatClosed(uint32,uint32,uint8)";

/// First four bytes of `keccak256(sighash)` — the 4-byte selector the
/// node-registry precompile dispatches on.
#[must_use]
pub fn seat_selector(sighash: &str) -> [u8; 4] {
    let digest = Keccak256::digest(sighash.as_bytes());
    [digest[0], digest[1], digest[2], digest[3]]
}

/// Full `keccak256(signature)` — the indexed `topic0` of a seat event log.
#[must_use]
pub fn seat_event_topic0(sig: &str) -> [u8; 32] {
    Keccak256::digest(sig.as_bytes()).into()
}

/// Open-seat kind. Mirrors `cluster_seat::SeatKind`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "SeatKind.ts"))]
pub enum SeatKind {
    /// Active vacancy (byte `0`) — produces blocks + earns the consensus pool once seated.
    Active,
    /// Standby vacancy (byte `1`) — provisioned but earns no consensus pool.
    Standby,
}

impl SeatKind {
    /// Decode a seat-kind byte. `1` → `Standby`, anything else → `Active`.
    #[must_use]
    pub const fn from_byte(b: u8) -> Self {
        if b == SEAT_KIND_STANDBY {
            Self::Standby
        } else {
            Self::Active
        }
    }

    /// Encode as the raw `u8` kind byte.
    #[must_use]
    pub const fn to_byte(self) -> u8 {
        match self {
            Self::Active => SEAT_KIND_ACTIVE,
            Self::Standby => SEAT_KIND_STANDBY,
        }
    }
}

/// Open-seat lifecycle status. Mirrors `cluster_seat::SeatStatus`
/// (`None=0`, `Open=1`, `Filled=2`, `Closed=3`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "SeatStatus.ts"))]
pub enum SeatStatus {
    /// No record (byte `0`).
    None,
    /// Open listing accepting applications (byte `1`).
    Open,
    /// Capacity reached (byte `2`).
    Filled,
    /// Rescinded by the advertiser (byte `3`).
    Closed,
}

impl SeatStatus {
    /// Decode a status byte. Any value outside `1..=3` → `None`.
    #[must_use]
    pub const fn from_byte(b: u8) -> Self {
        match b {
            1 => Self::Open,
            2 => Self::Filled,
            3 => Self::Closed,
            _ => Self::None,
        }
    }

    /// Encode as the right-aligned `u8` status byte.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        match self {
            Self::None => 0,
            Self::Open => 1,
            Self::Filled => 2,
            Self::Closed => 3,
        }
    }
}

/// De-fictionalized open-seat listing row — the indexer projection of the
/// on-chain `OpenSeat` record (`cluster_seat`) plus its `SeatAdvertised`/
/// `SeatFilled`/`SeatClosed` event history. Economic amounts are decimal
/// lythoshi strings (`1e18`), matching the SDK JSON convention.
///
/// This revision of the primitive ships no on-chain `getOpenSeat` view
/// selector — open-seat discovery is event/indexer backed.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "OpenSeat.ts"))]
pub struct OpenSeat {
    /// Cluster the seat belongs to.
    pub cluster_id: u32,
    /// Per-cluster monotonic seat id.
    pub seat_id: u32,
    /// Advertiser op-hash (`0x` 32 bytes).
    pub advertiser: String,
    /// Active or standby vacancy.
    pub kind: SeatKind,
    /// Identical seats this listing offers.
    pub seat_count: u16,
    /// Seats already filled.
    pub filled_count: u16,
    /// Minimum bond in lythoshi (`>= 5,000 LYTH` for active seats).
    pub min_bond_lythoshi: String,
    /// Service-tier capability bitmask the cluster needs.
    pub capability_mask: u32,
    /// Terms digest (`0x` 32 bytes).
    pub terms_hash: String,
    /// Listing lifecycle status.
    pub status: SeatStatus,
}

/// A pending seat application, projected from `SeatApplied` + the reused
/// CJ-1 vote tally. The application reuses the CJ-1 `(cluster, operatorId)`
/// keying; `status` is the CJ-1 request lifecycle label.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "SeatApplication.ts"))]
pub struct SeatApplication {
    /// Cluster the application targets.
    pub cluster_id: u32,
    /// Targeted seat id.
    pub seat_id: u32,
    /// Application key = operator op-hash (`0x` 32 bytes).
    pub app_key: String,
    /// Application owner address (`0x` 20 bytes).
    pub owner: String,
    /// Escrow currently held in lythoshi.
    pub bond_escrowed_lythoshi: String,
    /// Admit votes recorded so far.
    pub vote_count: u16,
    /// Frozen admission threshold (7 for a 10-member cluster).
    pub threshold: u16,
    /// CJ-1 request lifecycle status label.
    pub status: String,
}

/// Decoded `SeatAdvertised` event. Mirrors `events::SEAT_ADVERTISED`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "SeatAdvertisedEvent.ts")
)]
pub struct SeatAdvertisedEvent {
    /// Cluster identifier (indexed topic 1).
    pub cluster_id: u32,
    /// Seat identifier (indexed topic 2).
    pub seat_id: u32,
    /// Advertiser op-hash (`0x` 32 bytes).
    pub advertiser: String,
    /// Raw seat-kind byte (`0` active, `1` standby).
    pub kind: u8,
    /// Identical seats offered (event encodes this as `uint32`).
    pub seat_count: u32,
    /// Minimum bond in lythoshi.
    pub min_bond_lythoshi: String,
    /// Service-tier capability bitmask.
    pub capability_mask: u32,
    /// Terms digest (`0x` 32 bytes).
    pub terms_hash: String,
}

/// Decoded `SeatApplied` event. Mirrors `events::SEAT_APPLIED`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "SeatAppliedEvent.ts"))]
pub struct SeatAppliedEvent {
    /// Cluster identifier (indexed topic 1).
    pub cluster_id: u32,
    /// Seat identifier (indexed topic 2).
    pub seat_id: u32,
    /// Application key = operator op-hash (indexed topic 3, `0x` 32 bytes).
    pub operator_id: String,
    /// Application owner address (`0x` 20 bytes).
    pub owner: String,
    /// Escrow held in lythoshi.
    pub escrow_lythoshi: String,
}

/// Decoded `SeatFilled` event. Mirrors `events::SEAT_FILLED`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "SeatFilledEvent.ts"))]
pub struct SeatFilledEvent {
    /// Cluster identifier (indexed topic 1).
    pub cluster_id: u32,
    /// Seat identifier (indexed topic 2).
    pub seat_id: u32,
    /// Admitted operator op-hash (indexed topic 3, `0x` 32 bytes).
    pub operator_id: String,
    /// Seats filled after this admission.
    pub filled_count: u16,
    /// Total seats in the listing.
    pub seat_count: u16,
}

/// Decoded `SeatClosed` event. Mirrors `events::SEAT_CLOSED`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "SeatClosedEvent.ts"))]
pub struct SeatClosedEvent {
    /// Cluster identifier (indexed topic 1).
    pub cluster_id: u32,
    /// Seat identifier (indexed topic 2).
    pub seat_id: u32,
    /// Raw seat-status byte after close (`3` = closed).
    pub status: u8,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn capability_bits_match_mono_core() {
        assert_eq!(SERVES_RPC, 1u32 << 0);
        assert_eq!(SERVES_PUBLIC_API, 1u32 << 8);
        assert_eq!(SERVES_GPU_PROVE, 1u32 << 9);
        assert_eq!(SERVES_GPU_PROVE, 0x0000_0200);
        assert_eq!(NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES, 1_184);
        assert!(is_valid_capabilities(SERVES_GPU_PROVE));
        assert!(!is_valid_capabilities(0x0001_0000));
    }

    #[test]
    fn hosting_class_round_trips_and_clamps() {
        for hc in [
            NodeHostingClass::BareMetal,
            NodeHostingClass::CoLocation,
            NodeHostingClass::Cloud,
        ] {
            assert_eq!(NodeHostingClass::from_byte(hc.to_byte()), hc);
        }
        // Any byte outside 0..=2 falls back to Cloud.
        assert_eq!(NodeHostingClass::from_byte(3), NodeHostingClass::Cloud);
        assert_eq!(NodeHostingClass::from_byte(255), NodeHostingClass::Cloud);
    }

    #[test]
    fn cluster_anchor_is_deterministic_and_order_insensitive() {
        let roster: Vec<[u8; 48]> = (0u8..10).map(|i| [0x10u8.wrapping_add(i); 48]).collect();
        let a = derive_cluster_anchor_address(&roster, 7);
        let b = derive_cluster_anchor_address(&roster, 7);
        assert_eq!(a, b);

        let mut reversed = roster.clone();
        reversed.reverse();
        assert_eq!(derive_cluster_anchor_address(&reversed, 7), a);

        // Threshold is in the preimage.
        assert_ne!(derive_cluster_anchor_address(&roster, 5), a);
    }

    #[test]
    fn cluster_anchor_matches_manual_blake3() {
        let roster = [[0x01u8; 48], [0x02u8; 48]];
        let mut hasher = Hasher::new();
        hasher.update(MULTISIG_ADDRESS_DERIVATION_DOMAIN);
        hasher.update(&7u16.to_be_bytes());
        // members already sorted (0x01 < 0x02).
        for m in &roster {
            hasher.update(&48u64.to_be_bytes());
            hasher.update(m);
        }
        let mut expected = [0u8; 20];
        expected.copy_from_slice(&hasher.finalize().as_bytes()[..20]);
        assert_eq!(derive_cluster_anchor_address(&roster, 7), expected);
    }

    #[test]
    fn form_cluster_message_commits_to_roster() {
        let active = vec![0x11; FORM_CLUSTER_ACTIVE_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES];
        let standby = vec![0x22; FORM_CLUSTER_STANDBY_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES];
        let message = form_cluster_message(&active, &standby);
        assert_eq!(message, form_cluster_message(&active, &standby));

        let mut changed = active.clone();
        changed[0] ^= 0x01;
        assert_ne!(message, form_cluster_message(&changed, &standby));
    }

    /// Deterministic roster fixture shared with the mono-core SDK and
    /// the TS parity tests: active key `i` filled with `0x20 + i`,
    /// standby key `j` filled with `0x40 + j`.
    fn v2_fixture() -> (Vec<u8>, Vec<u8>, Vec<u8>) {
        let mut active = Vec::new();
        for i in 0..FORM_CLUSTER_ACTIVE_COUNT {
            active.extend_from_slice(&vec![0x20 + i as u8; NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES]);
        }
        let mut standby = Vec::new();
        for i in 0..FORM_CLUSTER_STANDBY_COUNT {
            standby.extend_from_slice(&vec![0x40 + i as u8; NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES]);
        }
        // member shares [1500,1500,1000,1000,1000,1000,1000,800,700,500]
        // ‖ delegator 3000 bps ‖ expires 1_999_999_999_000 ms.
        let charter = hex_to_bytes("05dc05dc03e803e803e803e803e8032002bc01f40bb8000001d1a94a1c18");
        assert_eq!(charter.len(), NODE_REGISTRY_CLUSTER_CHARTER_BYTES);
        (active, standby, charter)
    }

    fn hex_to_bytes(s: &str) -> Vec<u8> {
        (0..s.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&s[i..i + 2], 16).unwrap())
            .collect()
    }

    #[test]
    fn form_cluster_message_v2_matches_mono_core_vector() {
        let (active, standby, charter) = v2_fixture();
        // Pinned from mono-core's `form_cluster_message_v2` /
        // `form_cluster_message` (protocore-sdk, 2026-06-11). Drift here
        // means the digest mirrors have diverged from the chain.
        assert_eq!(
            form_cluster_message_v2(&active, &standby, &charter).as_slice(),
            hex_to_bytes("118e8dbfc057ffd2fcab85d6a1942c674cdb3f516f4cae86377e1b275bdcd106")
                .as_slice()
        );
        assert_eq!(
            form_cluster_message(&active, &standby).as_slice(),
            hex_to_bytes("a49cb5314c8f1b2feb508d2512b59e599a05f27d78e8cc6426cac67b55504015")
                .as_slice()
        );

        // The V2 digest commits to the charter and differs from V1.
        let mut other = charter.clone();
        other[21] ^= 0x01;
        let v2 = form_cluster_message_v2(&active, &standby, &charter);
        assert_ne!(v2, form_cluster_message_v2(&active, &standby, &other));
        assert_ne!(v2, form_cluster_message(&active, &standby));
    }

    fn bytes_to_hex(bytes: &[u8]) -> String {
        bytes.iter().map(|b| format!("{b:02x}")).collect()
    }

    #[test]
    fn seat_selectors_match_on_chain_abi() {
        // Pinned `keccak256(signature)[..4]` values for the exact canonical
        // signatures in mono-core `node-registry/src/abi.rs`. Drift here
        // means the SDK selectors no longer dispatch to the on-chain ops.
        assert_eq!(
            seat_selector(SIGHASH_ADVERTISE_SEAT),
            [0x5c, 0xc1, 0x81, 0x58]
        );
        assert_eq!(
            seat_selector(SIGHASH_APPLY_FOR_SEAT),
            [0x04, 0xca, 0x87, 0xfe]
        );
        assert_eq!(
            seat_selector(SIGHASH_VOTE_SEAT_ADMIT),
            [0x4c, 0xa3, 0x34, 0x28]
        );
        assert_eq!(
            seat_selector(SIGHASH_WITHDRAW_SEAT_APPLICATION),
            [0x2f, 0x22, 0x64, 0x96]
        );
        assert_eq!(seat_selector(SIGHASH_CLOSE_SEAT), [0x52, 0xaa, 0x9b, 0x9a]);
    }

    #[test]
    fn seat_event_topics_match_on_chain_abi() {
        // Pinned `keccak256(signature)` topic0 values for mono-core
        // `events.rs` seat events.
        assert_eq!(
            bytes_to_hex(&seat_event_topic0(SEAT_ADVERTISED_EVENT_SIG)),
            "84318757131a1c07dd36c47510e5a2c5956e37726e956079f0753a71b75c3faa"
        );
        assert_eq!(
            bytes_to_hex(&seat_event_topic0(SEAT_APPLIED_EVENT_SIG)),
            "74a8b247dda68ace7f46340b8061e3494a7055740c2fc1fd057f2b288670d4bc"
        );
        assert_eq!(
            bytes_to_hex(&seat_event_topic0(SEAT_FILLED_EVENT_SIG)),
            "6440c790006f5ba4b62fe3a752cfcb3680c8c2588e170ddf9000800f3d27720f"
        );
        assert_eq!(
            bytes_to_hex(&seat_event_topic0(SEAT_CLOSED_EVENT_SIG)),
            "4ef92a1e15b65f60ce6a55aed42a9dc5c636219fdb284f06f3c028c2a90bc306"
        );
    }

    #[test]
    fn seat_constants_mirror_mono_core() {
        assert_eq!(TAG_CLUSTER_SEAT, 0x32);
        assert_eq!(SEAT_APPLICATION_ESCROW_LYTHOSHI, 100 * 10u128.pow(18));
        assert_eq!(MIN_SELF_BOND_LYTHOSHI, 5_000 * 10u128.pow(18));
        // 5,000 — NOT the legacy 50,000 design fiction.
        assert_ne!(MIN_SELF_BOND_LYTHOSHI, 50_000 * 10u128.pow(18));
        // The anti-spam escrow is well below the self-bond floor.
        assert_eq!(SEAT_APPLICATION_ESCROW_LYTHOSHI, 100 * 10u128.pow(18));
        assert_eq!(SEAT_KIND_ACTIVE, 0);
        assert_eq!(SEAT_KIND_STANDBY, 1);
    }

    #[test]
    fn seat_kind_and_status_round_trip() {
        for kind in [SeatKind::Active, SeatKind::Standby] {
            assert_eq!(SeatKind::from_byte(kind.to_byte()), kind);
        }
        assert_eq!(SeatKind::from_byte(9), SeatKind::Active);

        for status in [
            SeatStatus::None,
            SeatStatus::Open,
            SeatStatus::Filled,
            SeatStatus::Closed,
        ] {
            assert_eq!(SeatStatus::from_byte(status.as_u8()), status);
        }
        assert_eq!(SeatStatus::from_byte(42), SeatStatus::None);
        assert_eq!(SeatStatus::Open.as_u8(), 1);
        assert_eq!(SeatStatus::Closed.as_u8(), 3);
    }

    #[test]
    fn open_seat_view_serializes_camel_case() {
        let seat = OpenSeat {
            cluster_id: 7,
            seat_id: 2,
            advertiser: format!("0x{}", "3a".repeat(32)),
            kind: SeatKind::Standby,
            seat_count: 4,
            filled_count: 1,
            min_bond_lythoshi: MIN_SELF_BOND_LYTHOSHI.to_string(),
            capability_mask: 0x9,
            terms_hash: format!("0x{}", "7b".repeat(32)),
            status: SeatStatus::Open,
        };
        let json = serde_json::to_value(&seat).expect("serialize");
        assert_eq!(json["clusterId"], 7);
        assert_eq!(json["seatId"], 2);
        assert_eq!(json["kind"], "standby");
        assert_eq!(json["status"], "open");
        assert_eq!(json["minBondLythoshi"], MIN_SELF_BOND_LYTHOSHI.to_string());
        let round: OpenSeat = serde_json::from_value(json).expect("round-trip");
        assert_eq!(round, seat);
    }
}
