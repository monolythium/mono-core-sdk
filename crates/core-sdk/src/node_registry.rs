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
}
