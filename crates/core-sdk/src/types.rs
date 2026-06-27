//! Wire-shape types returned by [`crate::RpcClient`].
//!
//! These mirror the JSON the node serializes — quantities are
//! `0x`-prefixed hex strings, hashes / bytes are `0x`-prefixed
//! lower-case hex, address fields use either legacy `0x` hex or typed
//! bech32m as documented on the field, and structured types use camelCase
//! field names. The SDK does not yet depend on any internal
//! mono-core crates; when those land the wrapper types here forward
//! to them transparently.

use std::collections::{BTreeMap, HashMap, HashSet};
use std::fmt::Write as _;

use crate::bridge::BridgeRouteDisclosure;
use blst::min_pk::{
    AggregatePublicKey, PublicKey as BlsPublicKeyPoint, Signature as BlsSignaturePoint,
};
use blst::BLST_ERROR;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

/// `0x`-prefixed hex byte vector. Stored as `String` to match the wire
/// envelope verbatim — callers can `crate::types::hex_decode` on demand.
pub type Hex = String;

/// Address string. Legacy RPC compatibility surfaces use `0x`-prefixed
/// 20-byte hex; v4.1 user-facing surfaces may use typed bech32m such as
/// `mono1...`.
pub type Address = String;

/// `0x`-prefixed hex 32-byte hash.
pub type Hash = String;

/// `0x`-prefixed hex unsigned quantity, big-endian, no leading zeros
/// per the JSON-RPC spec (`"0x0"` instead of `"0x00"`).
pub type Quantity = String;

/// JSON-RPC block tag. Use [`BlockSelector`] when sending to the wire; passive
/// compatibility reads still use the `eth_*` block-argument shape.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "BlockTag.ts"))]
#[serde(rename_all = "lowercase")]
pub enum BlockTag {
    /// Most recently committed block.
    Latest,
    /// Genesis (height 0).
    Earliest,
    /// Highest finalized block — under deterministic Starfish finality
    /// this collapses to `latest` on the testnet.
    Finalized,
    /// Highest "safe" block — collapses to `latest` until reorg windows
    /// land.
    Safe,
    /// Pending block (alias of `latest` on the v0.0.x server).
    Pending,
}

/// Block selector for block-scoped JSON-RPC reads.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BlockSelector {
    /// Resolve via tag.
    Tag(BlockTag),
    /// Resolve to a concrete height.
    Number(u64),
    /// Resolve to a concrete hash (only valid where the spec allows).
    Hash(Hash),
}

impl BlockSelector {
    /// Convenience for "latest committed".
    pub const LATEST: Self = Self::Tag(BlockTag::Latest);

    /// Encode for the JSON-RPC params array.
    #[must_use]
    pub fn to_param(&self) -> serde_json::Value {
        match self {
            Self::Tag(t) => serde_json::to_value(t).unwrap_or(serde_json::Value::Null),
            Self::Number(n) => serde_json::Value::String(format!("0x{n:x}")),
            Self::Hash(h) => serde_json::Value::String(h.clone()),
        }
    }
}

impl Default for BlockSelector {
    fn default() -> Self {
        Self::LATEST
    }
}

/// Account proof envelope returned by `eth_getBalance` /
/// `eth_getStorageAt` / `lyth_registryStateProof`.
///
/// `value` is the raw quantity (or 32-byte word for storage) as returned
/// by the chain. `state_root` is the trie root the proof is verified
/// against. `proof` is `null` when the chain provider could not produce
/// an inclusion proof for this slot at the requested block.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "AccountProofResponse.ts")
)]
pub struct AccountProofResponse {
    /// `0x`-hex value (balance, storage word, or peer id depending on
    /// the calling method).
    pub value: Quantity,
    /// State-root hex the proof verifies against.
    #[serde(rename = "state_root", alias = "stateRoot")]
    pub state_root: Hash,
    /// Block height the proof was generated against.
    #[serde(rename = "block_number", alias = "blockNumber")]
    pub block_number: u64,
    /// Inclusion proof envelope, omitted when the chain didn't produce
    /// one. The shape is intentionally opaque at this layer — callers
    /// that need to verify the proof bring an internal state crate in
    /// directly.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown | null", optional))]
    pub proof: Option<serde_json::Value>,
}

/// Block header surfaced via `eth_getBlockByNumber` / `eth_getBlockByHash`.
///
/// The v4.1 SDK shape exposes execution-unit terminology. Legacy node
/// payloads that still return `gas_used` / `gas_limit` decode through
/// serde aliases so callers can upgrade the SDK before every node RPC
/// response has been regenerated.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "BlockHeader.ts"))]
pub struct BlockHeader {
    /// Block number (height).
    pub number: u64,
    /// Block hash (32 bytes hex).
    pub hash: Hash,
    /// Parent block hash.
    #[serde(rename = "parent_hash", alias = "parentHash")]
    pub parent_hash: Hash,
    /// State-root commitment.
    #[serde(rename = "state_root", alias = "stateRoot")]
    pub state_root: Hash,
    /// UNIX seconds.
    pub timestamp: u64,
    /// Total execution units consumed.
    #[serde(
        rename = "executionUnitsUsed",
        alias = "execution_units_used",
        alias = "gas_used",
        alias = "gasUsed"
    )]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "executionUnitsUsed"))]
    pub execution_units_used: u64,
    /// Block execution-unit limit.
    #[serde(
        rename = "executionUnitLimit",
        alias = "execution_unit_limit",
        alias = "gas_limit",
        alias = "gasLimit"
    )]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "executionUnitLimit"))]
    pub execution_unit_limit: u64,
}

/// Receipt for a confirmed transaction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "TransactionReceipt.ts")
)]
pub struct TransactionReceipt {
    /// Transaction hash.
    #[serde(rename = "tx_hash", alias = "txHash")]
    pub tx_hash: Hash,
    /// Block hash that contains the transaction.
    #[serde(rename = "block_hash", alias = "blockHash")]
    pub block_hash: Hash,
    /// Block height that contains the transaction.
    #[serde(rename = "block_number", alias = "blockNumber")]
    pub block_number: u64,
    /// Transaction index within the block.
    #[serde(rename = "tx_index", alias = "txIndex")]
    pub tx_index: u32,
    /// `1` on success, `0` on revert.
    pub status: u8,
    /// Execution units consumed by this transaction.
    #[serde(
        rename = "executionUnitsUsed",
        alias = "execution_units_used",
        alias = "gas_used",
        alias = "gasUsed"
    )]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "executionUnitsUsed"))]
    pub execution_units_used: u64,
    /// Human-readable failure reason when `status == 0` (OBS-1). `None` on
    /// success; carries a short machine-stable label (e.g. `"OutOfGas"`) or
    /// the decoded revert message otherwise. Absent from JSON on success.
    #[serde(default, rename = "revertReason", alias = "revert_reason")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "revertReason", optional))]
    pub revert_reason: Option<String>,
}

/// Maximum native receipt event rows returned by the node's v4.1 API surface.
pub const MAX_NATIVE_RECEIPT_EVENTS: usize = 1_000;

/// Execution counters reported by a native RISC-V receipt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeReceiptCounters {
    /// Deterministic instruction-cycle count.
    pub cycles: u64,
    /// Units consumed by host syscalls.
    pub syscall_units: u64,
    /// Units consumed by authenticated state reads and writes.
    pub state_io_units: u64,
}

/// Structured native fee object attached to a RISC-V/native receipt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "NativeReceiptFee.ts"))]
pub struct NativeReceiptFee {
    /// Total fee in lythoshi.
    pub total_lythoshi: String,
    /// Optional total fee formatted as LYTH numeric text without the unit suffix.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub total_lyth: Option<String>,
    /// Execution cycles charged by the receipt.
    pub cycles_used: u64,
    /// Base price per execution cycle in lythoshi.
    pub base_price_per_cycle_lythoshi: String,
    /// Authenticated state I/O units charged by the receipt.
    pub state_io_units: u64,
    /// State I/O unit price in lythoshi.
    pub state_io_price_per_unit_lythoshi: String,
    /// Priority tip in lythoshi.
    pub priority_tip_lythoshi: String,
}

/// Client-side fee exposure for a settled transaction, derived from the
/// structured [`NativeReceiptFee`] block the node already returns on the
/// tx-query and tx-feed surfaces.
///
/// The live `eth_getTransactionReceipt` carries only `gas_used` / `status`
/// / `logs` — no fee fields — so wallets and integrators previously had to
/// reconstruct the charge themselves. These fields surface that charge
/// without any chain / RPC change: on-chain the fee is
/// `(base_price + priority_tip) × execution_units`, split 50% burn /
/// 30% operator / 20% treasury.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionFeeExposure {
    /// Total fee charged for the transaction, in lythoshi
    /// ([`NativeReceiptFee::total_lythoshi`], surfaced verbatim).
    pub fee_lythoshi: String,
    /// Effective per-execution-unit price paid, in lythoshi
    /// (`base_price_per_cycle_lythoshi + priority_tip_lythoshi`). The
    /// Monolythium analogue of an EVM receipt's `effectiveGasPrice`.
    pub effective_gas_price_per_unit: String,
}

impl NativeReceiptFee {
    /// Compute the client-side [`TransactionFeeExposure`] from this fee
    /// block — purely arithmetic, no network access.
    ///
    /// `effective_gas_price_per_unit` sums the base price per execution
    /// unit and the priority tip per execution unit, matching the chain's
    /// `(base_price + priority_tip) × execution_units` fee formula.
    ///
    /// # Errors
    ///
    /// Returns [`SdkError::Malformed`] when any of `total_lythoshi`,
    /// `base_price_per_cycle_lythoshi`, or `priority_tip_lythoshi` is not a
    /// non-negative integer.
    pub fn transaction_fee_exposure(&self) -> Result<TransactionFeeExposure, crate::SdkError> {
        let base_price = parse_fee_lythoshi(
            &self.base_price_per_cycle_lythoshi,
            "fee.base_price_per_cycle_lythoshi",
        )?;
        let priority_tip =
            parse_fee_lythoshi(&self.priority_tip_lythoshi, "fee.priority_tip_lythoshi")?;
        // Validate `total_lythoshi` but surface it verbatim so the exposed
        // total exactly matches the node's charged value.
        parse_fee_lythoshi(&self.total_lythoshi, "fee.total_lythoshi")?;
        let effective = base_price.checked_add(priority_tip).ok_or_else(|| {
            crate::SdkError::Malformed("fee base price + priority tip overflows u128".to_owned())
        })?;
        Ok(TransactionFeeExposure {
            fee_lythoshi: self.total_lythoshi.clone(),
            effective_gas_price_per_unit: effective.to_string(),
        })
    }
}

fn parse_fee_lythoshi(value: &str, field: &str) -> Result<u128, crate::SdkError> {
    value
        .parse::<u128>()
        .map_err(|_| crate::SdkError::Malformed(format!("{field} is not an integer: {value}")))
}

/// One decoded native event row inside a native receipt response.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeReceiptEvent {
    /// Block height containing the receipt.
    pub block_height: u64,
    /// Transaction index within the block.
    pub tx_index: u32,
    /// Per-receipt native event row index.
    pub log_index: u32,
    /// Typed native event emitter address as returned by the node API.
    pub address: String,
    /// Durable event topic hash.
    pub event_topic: Hash,
    /// Structured typed event payload decoded by the node.
    pub decoded: serde_json::Value,
    /// Raw JSON payload emitted by the native event projector.
    pub decoded_json: String,
}

/// Provider/source metadata attached to a native receipt response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeReceiptSource {
    /// Chain provider that supplied the canonical transaction receipt.
    pub chain_provider: String,
    /// Indexer provider used for native event rows.
    pub indexer_provider: String,
    /// Reserved log index that carries the receipt metadata row.
    pub metadata_log_index: u32,
}

/// BLS aggregate round-certificate material attached to a no-EVM receipt proof.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoEvmReceiptFinalityCertificate {
    /// Round at which the certificate sealed.
    pub round: u64,
    /// `0x`-prefixed aggregate BLS signature.
    pub signature: Hex,
    /// Signer-set bitmap as `0x`-hex bytes.
    pub signers_bitmap: Hex,
    /// Operator indices decoded from the signer bitmap.
    pub signer_indices: Vec<u16>,
    /// Number of signing operators.
    pub signer_count: u16,
}

/// Consensus block reference carried inside no-EVM receipt finality evidence.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoEvmReceiptFinalityBlockReference {
    /// Consensus round at which the certified block was authored.
    pub round: u64,
    /// Operator authority index that authored the certified block.
    pub authority: u16,
    /// Content-derived block digest.
    pub digest: Hash,
}

/// Optional finality evidence for the block containing a no-EVM receipt proof.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoEvmReceiptFinalityEvidence {
    /// Finality proof schema identifier.
    pub schema: String,
    /// Evidence source, currently `blsRoundCertificate`.
    pub source: String,
    /// Consensus round that finalized the block.
    pub round: u64,
    /// BLS aggregate round certificate retained by the serving node.
    pub certificate: NoEvmReceiptFinalityCertificate,
    /// Exact consensus block reference used for block-bound leader/DAC
    /// certificate lookup, when retained by the serving node.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub block_reference: Option<NoEvmReceiptFinalityBlockReference>,
    /// BLS leader-vote certificate bound to [`Self::block_reference`], when
    /// retained by the serving node.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub leader_certificate: Option<NoEvmReceiptFinalityCertificate>,
    /// BLS data-availability certificate bound to [`Self::block_reference`],
    /// when retained by the serving node.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dac_certificate: Option<NoEvmReceiptFinalityCertificate>,
}

/// Covering snapshot material for an archived no-EVM receipt proof.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoEvmArchiveCoveringSnapshot {
    /// Snapshot height covered by the signed archive manifest.
    pub snapshot_height: u64,
    /// Signed snapshot manifest hash.
    pub manifest_hash: Hash,
    /// Digest that covering snapshot signatures cover.
    pub signature_digest: Hash,
    /// Snapshot content hash.
    pub content_hash: Hash,
    /// Checkpoint content hash covered by this snapshot.
    pub checkpoint_content_hash: Hash,
    /// Inclusive checkpoint start height. Native archive coverage starts at genesis.
    pub checkpoint_from: u64,
    /// Inclusive checkpoint end height covered by the snapshot.
    pub checkpoint_to: u64,
    /// Covering snapshot signature strings.
    pub signatures: Vec<String>,
}

/// Optional archive binding material attached to a no-EVM receipt proof.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoEvmArchiveProof {
    /// Archive binding schema identifier.
    pub schema: String,
    /// Archive content-digest source label.
    pub source: String,
    /// Snapshot/archive manifest hash.
    pub manifest_hash: Hash,
    /// Snapshot/archive content hash.
    pub content_hash: Hash,
    /// Optional digest that signed snapshot-manifest signatures cover.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub signature_digest: Option<Hash>,
    /// Core-emitted snapshot signature strings.
    pub signatures: Vec<String>,
    /// Optional signed covering snapshot checkpoint proof.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub covering_snapshot: Option<NoEvmArchiveCoveringSnapshot>,
}

/// Bounded no-EVM receipt transcript attached to a native receipt.
///
/// This is a local transcript of full receipt bytes, not a compact finality
/// proof. Clients can use it to recompute the canonical receipts root.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoEvmReceiptProof {
    /// Proof schema, currently `mono.no_evm_receipt_proof.v1`.
    pub schema: String,
    /// Proof type, currently `canonicalReceiptsTranscript`.
    pub proof_type: String,
    /// Receipts-root algorithm label used by the node.
    pub root_algorithm: String,
    /// Receipt byte codec label used in `receiptTranscript`.
    pub receipt_codec: String,
    /// Inclusion block hash.
    pub block_hash: Hash,
    /// Target transaction hash.
    pub tx_hash: Hash,
    /// Canonical receipts root recomputed from the transcript.
    pub receipts_root: Hash,
    /// Hash of the target receipt bytes.
    pub target_receipt_hash: Hash,
    /// Inclusion block height.
    pub block_height: u64,
    /// Target transaction index within the block.
    pub tx_index: u32,
    /// Number of receipts carried by the transcript.
    pub receipt_count: u32,
    /// Optional archive binding material.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub archive_proof: Option<NoEvmArchiveProof>,
    /// Optional BLS finality evidence for the block round.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finality_evidence: Option<NoEvmReceiptFinalityEvidence>,
    /// Bounded full receipt bytes in transaction order.
    pub receipt_transcript: Vec<Hex>,
}

/// Current no-EVM receipt proof schema.
pub const NO_EVM_RECEIPT_PROOF_SCHEMA: &str = "mono.no_evm_receipt_proof.v1";

/// Current no-EVM receipt proof type.
pub const NO_EVM_RECEIPT_PROOF_TYPE: &str = "canonicalReceiptsTranscript";

/// Current no-EVM receipt transcript root algorithm label.
pub const NO_EVM_RECEIPT_ROOT_ALGORITHM: &str =
    "keccak256-binary-merkle(monolythium/v4.1/receipt_leaf/1, monolythium/v4.1/receipt_node/1, duplicate-last padding)";

/// Legacy bounded transcript root algorithm accepted for historical proofs.
pub const NO_EVM_LEGACY_RECEIPT_ROOT_ALGORITHM: &str =
    "keccak256(monolythium/v2/receipts_root/1 || len || indexed bincode receipts)";

/// Earlier v4.1 SDK label accepted for binary-Merkle proofs.
pub const NO_EVM_LEGACY_BINARY_RECEIPT_ROOT_ALGORITHM: &str =
    "keccak256(monolythium/v4.1/receipts_root_empty/1|receipt_leaf/1|receipt_node/1 binary Merkle)";

/// Current receipt byte codec label used inside no-EVM receipt transcripts.
pub const NO_EVM_RECEIPT_CODEC: &str = "bincode(protocore_execution_types::Receipt)";

/// Current no-EVM archive binding proof schema.
pub const NO_EVM_ARCHIVE_PROOF_SCHEMA: &str = "mono.no_evm_receipt_archive_binding.v1";

/// Current core-emitted snapshot archive signature scheme.
pub const NO_EVM_ARCHIVE_SIGNATURE_SCHEME: &str = "mono.snapshot.sig.v1";

/// Current no-EVM receipt finality evidence schema.
pub const NO_EVM_RECEIPT_FINALITY_EVIDENCE_SCHEMA: &str = "mono.no_evm_receipt_finality.v1";

/// Current no-EVM receipt finality evidence source.
pub const NO_EVM_RECEIPT_FINALITY_EVIDENCE_SOURCE: &str = "blsRoundCertificate";

const NO_EVM_LEGACY_RECEIPTS_ROOT_DOMAIN: &[u8] = b"monolythium/v2/receipts_root/1";
const NO_EVM_RECEIPTS_ROOT_EMPTY_DOMAIN: &[u8] = b"monolythium/v4.1/receipts_root_empty/1";
const NO_EVM_RECEIPT_LEAF_DOMAIN: &[u8] = b"monolythium/v4.1/receipt_leaf/1";
const NO_EVM_RECEIPT_NODE_DOMAIN: &[u8] = b"monolythium/v4.1/receipt_node/1";
const ML_DSA_65_ADDRESS_DERIVATION_DOMAIN: &[u8] = b"MONO_ADDRESS_BLAKE3_20_V1";
const STANDARD_ALGO_NUMBER_ML_DSA_65: u16 = 1_001;

/// Verified no-EVM receipt transcript with decoded receipt bytes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoEvmReceiptProofVerification {
    /// Decoded receipt bytes in transaction order.
    pub receipts: Vec<Vec<u8>>,
    /// Recomputed canonical receipts root as lower-case `0x` hex.
    pub receipts_root: Hash,
    /// Recomputed target receipt hash as lower-case `0x` hex.
    pub target_receipt_hash: Hash,
    /// Number of decoded receipts.
    pub receipt_count: u32,
    /// Target transaction index checked against `targetReceiptHash`.
    pub tx_index: u32,
    /// Decoded target receipt bytes.
    pub target_receipt: Vec<u8>,
}

/// Trusted ML-DSA-65 signer accepted for archive proof signature checks.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoEvmArchiveTrustedSigner {
    /// Raw ML-DSA-65 public key bytes.
    pub public_key: Vec<u8>,
    /// Optional expected canonical signer id as lower-case `0x` address/fingerprint.
    pub signer_id: Option<Hash>,
}

/// Per-signature archive proof signature verification issue.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoEvmArchiveSignatureVerificationIssue {
    /// Machine-readable issue code.
    pub code: &'static str,
    /// Human-readable issue detail.
    pub message: String,
    /// Signature index when the issue came from an archive proof signature entry.
    pub signature_index: Option<usize>,
    /// Canonical signer id associated with the issue, when known.
    pub signer_id: Option<Hash>,
}

/// Local trusted-signer check for snapshot archive proof signatures.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoEvmArchiveSignatureVerification {
    /// True only when every supplied signature entry is acceptable and threshold is met.
    pub verified: bool,
    /// Required trusted-signature threshold.
    pub threshold: usize,
    /// Valid trusted signer ids that signed `signatureDigest`.
    pub valid_signers: Vec<Hash>,
    /// Number of archive proof signature entries checked.
    pub checked_signatures: usize,
    /// Rejection reasons; non-empty means `verified == false`.
    pub issues: Vec<NoEvmArchiveSignatureVerificationIssue>,
}

/// Trusted BLS public key for a committee authority in a round-certificate
/// verification call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NoEvmReceiptTrustedBlsSigner {
    /// Operator authority index in the canonical committee for the round.
    pub authority_index: u16,
    /// 48-byte compressed BLS12-381 min-pk public key.
    pub public_key: [u8; 48],
}

/// Result of BLS round-certificate finality evidence verification.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NoEvmReceiptBlsFinalityVerification {
    /// Non-null `finalityEvidence` was supplied to the helper.
    pub finality_evidence_present: bool,
    /// `certificate.signerCount` matches both bitmap popcount and `signerIndices.len()`.
    pub signer_count_matches: bool,
    /// `certificate.signerIndices` exactly match the decoded little-endian bitmap.
    pub signer_bitmap_matches_indices: bool,
    /// Every signer index is within the caller-supplied committee bound.
    pub signer_indices_in_range: bool,
    /// Every signer index had caller-supplied trusted BLS material.
    pub all_signers_trusted: bool,
    /// Signer count meets the caller-supplied finality threshold.
    pub threshold_met: bool,
    /// Aggregate signature verifies over the Starfish round message.
    pub signature_valid: bool,
    /// Counted signers from the decoded bitmap.
    pub accepted_signature_count: usize,
    /// Required signer threshold supplied by the caller.
    pub required_signature_count: usize,
}

impl NoEvmReceiptBlsFinalityVerification {
    /// True only when the finality evidence meets the caller's trusted BLS
    /// material and threshold policy.
    #[must_use]
    pub const fn verified(self) -> bool {
        self.finality_evidence_present
            && self.signer_count_matches
            && self.signer_bitmap_matches_indices
            && self.signer_indices_in_range
            && self.all_signers_trusted
            && self.threshold_met
            && self.signature_valid
    }
}

/// Result of verifying the block-bound leader and DAC certificates carried by
/// no-EVM receipt finality evidence.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoEvmReceiptBlockBlsFinalityVerification {
    /// Consensus block reference that both certificates are expected to bind.
    pub block_reference: NoEvmReceiptFinalityBlockReference,
    /// Verification result for `finalityEvidence.leaderCertificate`.
    pub leader_certificate: NoEvmReceiptBlsFinalityVerification,
    /// Verification result for `finalityEvidence.dacCertificate`.
    pub dac_certificate: NoEvmReceiptBlsFinalityVerification,
}

impl NoEvmReceiptBlockBlsFinalityVerification {
    /// True only when both block-bound BLS certificates meet the caller's
    /// trusted material and threshold policy.
    #[must_use]
    pub const fn verified(&self) -> bool {
        self.leader_certificate.verified() && self.dac_certificate.verified()
    }
}

/// Trusted archive signer plus an optional block-height validity window.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoEvmArchiveTrustPolicySigner {
    /// Raw ML-DSA-65 public key bytes.
    pub public_key: Vec<u8>,
    /// Optional expected canonical signer id as lower-case `0x` address/fingerprint.
    pub signer_id: Option<Hash>,
    /// First block height where this signer is trusted.
    pub valid_from_height: Option<u64>,
    /// Last block height where this signer is trusted.
    pub valid_to_height: Option<u64>,
}

impl NoEvmArchiveTrustPolicySigner {
    fn as_trusted_signer(&self) -> NoEvmArchiveTrustedSigner {
        NoEvmArchiveTrustedSigner {
            public_key: self.public_key.clone(),
            signer_id: self.signer_id.clone(),
        }
    }
}

/// Trust policy for archive proof signatures attached to a no-EVM receipt proof.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoEvmArchiveTrustPolicy {
    /// Trusted archive signer roster.
    pub trusted_signers: Vec<NoEvmArchiveTrustPolicySigner>,
    /// Required trusted archive-signature threshold.
    pub threshold: usize,
    /// First block height where this policy is valid.
    pub valid_from_height: Option<u64>,
    /// Last block height where this policy is valid.
    pub valid_to_height: Option<u64>,
}

/// Trusted BLS signer plus an optional finality-round validity window.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NoEvmReceiptBlsTrustPolicySigner {
    /// Operator authority index in the canonical committee for the round.
    pub authority_index: u16,
    /// 48-byte compressed BLS12-381 min-pk public key.
    pub public_key: [u8; 48],
    /// First finality round where this signer is trusted.
    pub valid_from_round: Option<u64>,
    /// Last finality round where this signer is trusted.
    pub valid_to_round: Option<u64>,
}

impl NoEvmReceiptBlsTrustPolicySigner {
    const fn as_trusted_signer(self) -> NoEvmReceiptTrustedBlsSigner {
        NoEvmReceiptTrustedBlsSigner {
            authority_index: self.authority_index,
            public_key: self.public_key,
        }
    }
}

/// Trust policy for threshold-cluster BLS finality evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NoEvmReceiptFinalityClusterTrustPolicy {
    /// Optional chain id override. Falls back to [`NoEvmReceiptTrustPolicy::chain_id`].
    pub chain_id: Option<u64>,
    /// Trusted 48-byte threshold-cluster aggregate public key.
    pub cluster_public_key: [u8; 48],
    /// Committee size bound for signer bitmap indices.
    pub committee_size: u16,
    /// Required finality signature threshold.
    pub threshold: usize,
    /// First finality round where this policy is valid.
    pub valid_from_round: Option<u64>,
    /// Last finality round where this policy is valid.
    pub valid_to_round: Option<u64>,
}

/// Trust policy for multisig BLS finality evidence.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoEvmReceiptFinalityMultisigTrustPolicy {
    /// Optional chain id override. Falls back to [`NoEvmReceiptTrustPolicy::chain_id`].
    pub chain_id: Option<u64>,
    /// Trusted BLS signer roster.
    pub trusted_signers: Vec<NoEvmReceiptBlsTrustPolicySigner>,
    /// Required finality signature threshold.
    pub threshold: usize,
    /// First finality round where this policy is valid.
    pub valid_from_round: Option<u64>,
    /// Last finality round where this policy is valid.
    pub valid_to_round: Option<u64>,
}

/// Trust policy mode for BLS finality evidence attached to a no-EVM receipt proof.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NoEvmReceiptFinalityTrustPolicy {
    /// Verify against one trusted threshold-cluster aggregate public key.
    Cluster(NoEvmReceiptFinalityClusterTrustPolicy),
    /// Verify against individual trusted BLS authority keys.
    Multisig(NoEvmReceiptFinalityMultisigTrustPolicy),
}

impl NoEvmReceiptFinalityTrustPolicy {
    const fn chain_id(&self) -> Option<u64> {
        match self {
            Self::Cluster(policy) => policy.chain_id,
            Self::Multisig(policy) => policy.chain_id,
        }
    }

    const fn round_bounds(&self) -> (Option<u64>, Option<u64>) {
        match self {
            Self::Cluster(policy) => (policy.valid_from_round, policy.valid_to_round),
            Self::Multisig(policy) => (policy.valid_from_round, policy.valid_to_round),
        }
    }
}

/// Trust policy for no-EVM receipt proofs.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoEvmReceiptTrustPolicy {
    /// Optional default chain id used by finality policies.
    pub chain_id: Option<u64>,
    /// Optional archive signature trust policy.
    pub archive: Option<NoEvmArchiveTrustPolicy>,
    /// Optional BLS finality trust policy.
    pub finality: Option<NoEvmReceiptFinalityTrustPolicy>,
}

/// Machine-readable issue code from no-EVM receipt trust verification.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NoEvmReceiptTrustIssueCode {
    /// No receipt proof was supplied.
    MissingReceiptProof,
    /// The policy requires archive material but the proof does not carry it.
    MissingArchiveProof,
    /// The archive policy was not valid at the proof block height.
    ArchivePolicyNotValidAtHeight,
    /// Archive signatures did not satisfy the policy.
    ArchiveVerificationFailed,
    /// The policy requires finality material but the proof does not carry it.
    MissingFinalityEvidence,
    /// Finality verification requires an explicit chain id.
    MissingFinalityChainId,
    /// The finality policy was not valid at the proof finality round.
    FinalityPolicyNotValidAtRound,
    /// BLS finality evidence did not satisfy the policy.
    FinalityVerificationFailed,
}

impl NoEvmReceiptTrustIssueCode {
    /// Stable snake-case issue code.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::MissingReceiptProof => "missing_receipt_proof",
            Self::MissingArchiveProof => "missing_archive_proof",
            Self::ArchivePolicyNotValidAtHeight => "archive_policy_not_valid_at_height",
            Self::ArchiveVerificationFailed => "archive_verification_failed",
            Self::MissingFinalityEvidence => "missing_finality_evidence",
            Self::MissingFinalityChainId => "missing_finality_chain_id",
            Self::FinalityPolicyNotValidAtRound => "finality_policy_not_valid_at_round",
            Self::FinalityVerificationFailed => "finality_verification_failed",
        }
    }
}

impl std::fmt::Display for NoEvmReceiptTrustIssueCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// Trust-policy verification issue for a no-EVM receipt proof.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoEvmReceiptTrustIssue {
    /// Machine-readable issue code.
    pub code: NoEvmReceiptTrustIssueCode,
    /// Human-readable issue detail.
    pub message: String,
}

/// Combined no-EVM receipt proof trust verification result.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoEvmReceiptTrustVerification {
    /// True only when the receipt proof exists and all requested trust policies pass.
    pub verified: bool,
    /// Transcript verification result, when a proof was supplied.
    pub receipt_proof: Option<NoEvmReceiptProofVerification>,
    /// Archive signature verification result, when archive material was checked.
    pub archive_signatures: Option<NoEvmArchiveSignatureVerification>,
    /// Finality evidence verification result, when finality material was checked.
    pub finality_evidence: Option<NoEvmReceiptBlsFinalityVerification>,
    /// Trust-policy issues. Non-empty means `verified == false`.
    pub issues: Vec<NoEvmReceiptTrustIssue>,
}

/// Local no-EVM receipt proof transcript verification failure.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum NoEvmReceiptProofError {
    /// Proof schema is not supported by these helpers.
    #[error("unsupported no-EVM receipt proof schema `{actual}`")]
    UnsupportedSchema { actual: String },
    /// Finality evidence schema is not supported by these helpers.
    #[error("unsupported no-EVM receipt finality evidence schema `{actual}`")]
    UnsupportedFinalityEvidenceSchema { actual: String },
    /// Finality evidence source is not supported by these helpers.
    #[error("unsupported no-EVM receipt finality evidence source `{actual}`")]
    UnsupportedFinalityEvidenceSource { actual: String },
    /// Proof type is not supported by these helpers.
    #[error("unsupported no-EVM receipt proof type `{actual}`")]
    UnsupportedProofType { actual: String },
    /// Root algorithm is not supported by these helpers.
    #[error("unsupported no-EVM receipt root algorithm `{actual}`")]
    UnsupportedRootAlgorithm { actual: String },
    /// Receipt codec is not supported by these helpers.
    #[error("unsupported no-EVM receipt codec `{actual}`")]
    UnsupportedReceiptCodec { actual: String },
    /// Archive binding schema is not supported by these helpers.
    #[error("unsupported no-EVM receipt archive proof schema `{actual}`")]
    UnsupportedArchiveProofSchema { actual: String },
    /// A `0x` byte field is malformed.
    #[error("{field} must be 0x-prefixed even-length hex")]
    InvalidHex { field: String },
    /// A `0x` hash field has the wrong byte length.
    #[error("{field} must be {expected} bytes, got {actual}")]
    InvalidHexLength {
        field: String,
        expected: usize,
        actual: usize,
    },
    /// An archive proof signature string does not match the supported envelope.
    #[error("{field} must match mono.snapshot.sig.v1:0x<20-byte signer-id hex>:0x<non-empty payload hex>")]
    InvalidArchiveSignatureFormat { field: String },
    /// An archive proof signature payload is empty.
    #[error("{field} must be non-empty")]
    EmptyArchiveSignaturePayload { field: String },
    /// Archive proof material is internally inconsistent.
    #[error("{field}: {reason}")]
    InvalidArchiveProofShape { field: String, reason: String },
    /// Archive proof trusted-signer verification was configured incorrectly.
    #[error("{field}: {reason}")]
    ArchiveSignatureVerificationConfig { field: String, reason: String },
    /// The transcript length cannot be encoded by the runtime root algorithm.
    #[error("receiptTranscript has {actual} receipts, exceeding u32::MAX")]
    TooManyReceipts { actual: usize },
    /// A receipt byte length cannot be encoded by the runtime root algorithm.
    #[error("receiptTranscript[{index}] has {actual} bytes, exceeding u32::MAX")]
    ReceiptTooLarge { index: usize, actual: usize },
    /// `receiptCount` does not match the decoded transcript length.
    #[error("receiptCount declares {expected} receipts but receiptTranscript has {actual}")]
    ReceiptCountMismatch { expected: u32, actual: usize },
    /// `txIndex` does not point at a decoded receipt.
    #[error("txIndex {tx_index} is out of bounds for {receipt_count} decoded receipts")]
    TxIndexOutOfBounds { tx_index: u32, receipt_count: usize },
    /// The recomputed receipts root differs from `receiptsRoot`.
    #[error("receiptsRoot mismatch: expected {expected}, computed {actual}")]
    ReceiptsRootMismatch { expected: Hash, actual: Hash },
    /// The recomputed target receipt hash differs from `targetReceiptHash`.
    #[error("targetReceiptHash mismatch: expected {expected}, computed {actual}")]
    TargetReceiptHashMismatch { expected: Hash, actual: Hash },
    /// Finality evidence and certificate rounds disagree.
    #[error("finalityEvidence.certificate.round {certificate_round} does not match finalityEvidence.round {evidence_round}")]
    FinalityCertificateRoundMismatch {
        evidence_round: u64,
        certificate_round: u64,
    },
    /// Finality evidence signer count does not match the signer-index list.
    #[error("finalityEvidence.certificate.signerCount {signer_count} does not match signerIndices length {signer_indices}")]
    FinalitySignerCountMismatch {
        signer_count: u16,
        signer_indices: usize,
    },
    /// Finality evidence material is internally inconsistent.
    #[error("{field}: {reason}")]
    InvalidFinalityEvidenceShape { field: String, reason: String },
    /// Finality verification was configured incorrectly.
    #[error("{field}: {reason}")]
    FinalityVerificationConfig { field: String, reason: String },
}

impl NoEvmReceiptProof {
    /// Decode `receiptTranscript` entries into raw receipt bytes.
    pub fn decode_receipt_transcript(&self) -> Result<Vec<Vec<u8>>, NoEvmReceiptProofError> {
        decode_no_evm_receipt_transcript(self)
    }

    /// Verify this transcript's local self-consistency.
    ///
    /// This recomputes the runtime receipts root and target receipt hash. It
    /// does not prove multi-validator finality.
    pub fn verify_transcript(
        &self,
    ) -> Result<NoEvmReceiptProofVerification, NoEvmReceiptProofError> {
        let Some(verified) = verify_no_evm_receipt_proof(Some(self))? else {
            unreachable!("Some proof always yields Some verification");
        };
        Ok(verified)
    }
}

/// Decode a no-EVM proof's `receiptTranscript` `0x` byte blobs.
pub fn decode_no_evm_receipt_transcript(
    proof: &NoEvmReceiptProof,
) -> Result<Vec<Vec<u8>>, NoEvmReceiptProofError> {
    proof
        .receipt_transcript
        .iter()
        .enumerate()
        .map(|(index, hex)| decode_no_evm_hex(format!("receiptTranscript[{index}]"), hex))
        .collect()
}

/// Compute the runtime no-EVM receipts root from decoded receipt bytes.
///
/// The root is the v4.1 binary Merkle root over indexed receipt leaves,
/// returned as lower-case `0x` hex.
pub fn compute_no_evm_receipts_root<T>(receipts: &[T]) -> Result<Hash, NoEvmReceiptProofError>
where
    T: AsRef<[u8]>,
{
    compute_no_evm_receipts_root_bytes(receipts).map(|root| hex_encode_0x(&root))
}

/// Compute `keccak256(target receipt bytes)` as lower-case `0x` hex.
#[must_use]
pub fn compute_no_evm_target_receipt_hash(receipt_bytes: &[u8]) -> Hash {
    let digest = Keccak256::digest(receipt_bytes);
    hex_encode_0x(digest.as_ref())
}

/// Verify a nullable no-EVM proof transcript.
///
/// Returns `Ok(None)` when `proof` is absent. A successful `Some`
/// verification only checks transcript self-consistency, not
/// multi-validator finality.
pub fn verify_no_evm_receipt_proof(
    proof: Option<&NoEvmReceiptProof>,
) -> Result<Option<NoEvmReceiptProofVerification>, NoEvmReceiptProofError> {
    let Some(proof) = proof else {
        return Ok(None);
    };

    validate_no_evm_receipt_proof_metadata(proof)?;

    let receipts = decode_no_evm_receipt_transcript(proof)?;
    let receipt_count =
        u32::try_from(receipts.len()).map_err(|_| NoEvmReceiptProofError::TooManyReceipts {
            actual: receipts.len(),
        })?;
    if proof.receipt_count != receipt_count {
        return Err(NoEvmReceiptProofError::ReceiptCountMismatch {
            expected: proof.receipt_count,
            actual: receipts.len(),
        });
    }

    let tx_index = usize::try_from(proof.tx_index).map_err(|_| {
        NoEvmReceiptProofError::TxIndexOutOfBounds {
            tx_index: proof.tx_index,
            receipt_count: receipts.len(),
        }
    })?;
    let target_receipt =
        receipts
            .get(tx_index)
            .cloned()
            .ok_or(NoEvmReceiptProofError::TxIndexOutOfBounds {
                tx_index: proof.tx_index,
                receipt_count: receipts.len(),
            })?;

    let actual_root_bytes =
        compute_no_evm_receipts_root_bytes_for_algorithm(&proof.root_algorithm, &receipts)?;
    let actual_root = hex_encode_0x(&actual_root_bytes);
    let expected_root_bytes = decode_no_evm_hash("receiptsRoot", &proof.receipts_root)?;
    if expected_root_bytes != actual_root_bytes {
        return Err(NoEvmReceiptProofError::ReceiptsRootMismatch {
            expected: proof.receipts_root.clone(),
            actual: actual_root,
        });
    }

    let actual_target_hash = compute_no_evm_target_receipt_hash(&target_receipt);
    let actual_target_hash_bytes =
        decode_no_evm_hash("computedTargetReceiptHash", &actual_target_hash)
            .expect("computed target receipt hash is always a 32-byte hash");
    let expected_target_hash_bytes =
        decode_no_evm_hash("targetReceiptHash", &proof.target_receipt_hash)?;
    if expected_target_hash_bytes != actual_target_hash_bytes {
        return Err(NoEvmReceiptProofError::TargetReceiptHashMismatch {
            expected: proof.target_receipt_hash.clone(),
            actual: actual_target_hash,
        });
    }

    Ok(Some(NoEvmReceiptProofVerification {
        receipts,
        receipts_root: actual_root,
        target_receipt_hash: actual_target_hash,
        receipt_count,
        tx_index: proof.tx_index,
        target_receipt,
    }))
}

/// Verify a no-EVM receipt proof transcript plus any archive/finality material
/// required by a caller-supplied trust policy.
///
/// This is intentionally fail-closed: missing proof material is reported as a
/// trust issue, and configured height/round validity windows are enforced before
/// signer rosters are applied. It does not prove archive availability or live
/// finality beyond the supplied proof and trusted policy.
pub fn verify_no_evm_receipt_proof_trust(
    proof: Option<&NoEvmReceiptProof>,
    policy: &NoEvmReceiptTrustPolicy,
) -> Result<NoEvmReceiptTrustVerification, NoEvmReceiptProofError> {
    let receipt_proof = verify_no_evm_receipt_proof(proof)?;
    let mut archive_signatures = None;
    let mut finality_evidence = None;
    let mut issues = Vec::new();

    if receipt_proof.is_none() {
        issues.push(NoEvmReceiptTrustIssue {
            code: NoEvmReceiptTrustIssueCode::MissingReceiptProof,
            message: "native receipt proof is required for trust verification".to_owned(),
        });
    }

    if let Some(archive_policy) = policy.archive.as_ref() {
        match proof.and_then(|proof| {
            proof
                .archive_proof
                .as_ref()
                .map(|archive_proof| (proof, archive_proof))
        }) {
            None => {
                issues.push(NoEvmReceiptTrustIssue {
                    code: NoEvmReceiptTrustIssueCode::MissingArchiveProof,
                    message: "native receipt proof does not carry archive signature material"
                        .to_owned(),
                });
            }
            Some((proof, archive_proof)) => {
                if !is_u64_within_optional_bounds(
                    proof.block_height,
                    archive_policy.valid_from_height,
                    archive_policy.valid_to_height,
                ) {
                    issues.push(NoEvmReceiptTrustIssue {
                        code: NoEvmReceiptTrustIssueCode::ArchivePolicyNotValidAtHeight,
                        message: format!(
                            "archive trust policy is not valid at block height {}",
                            proof.block_height
                        ),
                    });
                }

                let active_signers: Vec<_> = archive_policy
                    .trusted_signers
                    .iter()
                    .filter(|signer| {
                        is_u64_within_optional_bounds(
                            proof.block_height,
                            signer.valid_from_height,
                            signer.valid_to_height,
                        )
                    })
                    .map(NoEvmArchiveTrustPolicySigner::as_trusted_signer)
                    .collect();
                let verification = verify_no_evm_archive_proof_signatures(
                    archive_proof,
                    &active_signers,
                    archive_policy.threshold,
                )?;
                if !verification.verified {
                    issues.push(NoEvmReceiptTrustIssue {
                        code: NoEvmReceiptTrustIssueCode::ArchiveVerificationFailed,
                        message: "archive signature material did not satisfy the trusted policy"
                            .to_owned(),
                    });
                }
                archive_signatures = Some(verification);
            }
        }
    }

    if let Some(finality_policy) = policy.finality.as_ref() {
        let Some(finality) = proof.and_then(|proof| proof.finality_evidence.as_ref()) else {
            issues.push(NoEvmReceiptTrustIssue {
                code: NoEvmReceiptTrustIssueCode::MissingFinalityEvidence,
                message: "native receipt proof does not carry BLS finality evidence".to_owned(),
            });
            return Ok(NoEvmReceiptTrustVerification {
                verified: false,
                receipt_proof,
                archive_signatures,
                finality_evidence,
                issues,
            });
        };
        let Some(chain_id) = finality_policy.chain_id().or(policy.chain_id) else {
            issues.push(NoEvmReceiptTrustIssue {
                code: NoEvmReceiptTrustIssueCode::MissingFinalityChainId,
                message: "finality trust policy requires a chain id".to_owned(),
            });
            return Ok(NoEvmReceiptTrustVerification {
                verified: false,
                receipt_proof,
                archive_signatures,
                finality_evidence,
                issues,
            });
        };

        let (valid_from_round, valid_to_round) = finality_policy.round_bounds();
        if !is_u64_within_optional_bounds(finality.round, valid_from_round, valid_to_round) {
            issues.push(NoEvmReceiptTrustIssue {
                code: NoEvmReceiptTrustIssueCode::FinalityPolicyNotValidAtRound,
                message: format!(
                    "finality trust policy is not valid at round {}",
                    finality.round
                ),
            });
        }

        let verification = match finality_policy {
            NoEvmReceiptFinalityTrustPolicy::Cluster(cluster) => {
                verify_no_evm_finality_evidence_threshold(
                    finality,
                    chain_id,
                    &cluster.cluster_public_key,
                    cluster.committee_size,
                    cluster.threshold,
                )?
            }
            NoEvmReceiptFinalityTrustPolicy::Multisig(multisig) => {
                let active_signers: Vec<_> = multisig
                    .trusted_signers
                    .iter()
                    .copied()
                    .filter(|signer| {
                        is_u64_within_optional_bounds(
                            finality.round,
                            signer.valid_from_round,
                            signer.valid_to_round,
                        )
                    })
                    .map(NoEvmReceiptBlsTrustPolicySigner::as_trusted_signer)
                    .collect();
                verify_no_evm_finality_evidence_multisig(
                    finality,
                    chain_id,
                    &active_signers,
                    multisig.threshold,
                )?
            }
        };
        if !verification.verified() {
            issues.push(NoEvmReceiptTrustIssue {
                code: NoEvmReceiptTrustIssueCode::FinalityVerificationFailed,
                message: "BLS finality evidence did not satisfy the trusted policy".to_owned(),
            });
        }
        finality_evidence = Some(verification);
    }

    Ok(NoEvmReceiptTrustVerification {
        verified: receipt_proof.is_some() && issues.is_empty(),
        receipt_proof,
        archive_signatures,
        finality_evidence,
        issues,
    })
}

const fn is_u64_within_optional_bounds(
    value: u64,
    valid_from: Option<u64>,
    valid_to: Option<u64>,
) -> bool {
    if let Some(start) = valid_from {
        if value < start {
            return false;
        }
    }
    if let Some(end) = valid_to {
        if value > end {
            return false;
        }
    }
    true
}

/// Compute the Starfish round-certificate BLS message:
/// `blake3("round" || chain_id_le || round_le)`.
#[must_use]
pub fn compute_no_evm_round_finality_message(chain_id: u64, round: u64) -> [u8; 32] {
    let mut hasher = blake3::Hasher::new();
    hasher.update(b"round");
    hasher.update(&chain_id.to_le_bytes());
    hasher.update(&round.to_le_bytes());
    *hasher.finalize().as_bytes()
}

/// Compute the Starfish leader-certificate BLS message for a certified block.
///
/// The message is `blake3("leader" || chain_id_le || authority_le ||
/// round_le || digest)`.
pub fn compute_no_evm_leader_finality_message(
    chain_id: u64,
    block_reference: &NoEvmReceiptFinalityBlockReference,
) -> Result<[u8; 32], NoEvmReceiptProofError> {
    compute_no_evm_block_finality_message(b"leader", chain_id, block_reference)
}

/// Compute the Starfish data-availability-certificate BLS message for a
/// certified block.
///
/// The message is `blake3("dac" || chain_id_le || authority_le || round_le ||
/// digest)`.
pub fn compute_no_evm_dac_finality_message(
    chain_id: u64,
    block_reference: &NoEvmReceiptFinalityBlockReference,
) -> Result<[u8; 32], NoEvmReceiptProofError> {
    compute_no_evm_block_finality_message(b"dac", chain_id, block_reference)
}

fn compute_no_evm_block_finality_message(
    domain: &[u8],
    chain_id: u64,
    block_reference: &NoEvmReceiptFinalityBlockReference,
) -> Result<[u8; 32], NoEvmReceiptProofError> {
    let digest = decode_no_evm_hash(
        "finalityEvidence.blockReference.digest",
        &block_reference.digest,
    )?;
    let mut hasher = blake3::Hasher::new();
    hasher.update(domain);
    hasher.update(&chain_id.to_le_bytes());
    hasher.update(&block_reference.authority.to_le_bytes());
    hasher.update(&block_reference.round.to_le_bytes());
    hasher.update(&digest);
    Ok(*hasher.finalize().as_bytes())
}

/// Verify BLS round-certificate finality evidence against a trusted
/// threshold-cluster aggregate public key.
///
/// This validates only the supplied proof material for the supplied trusted
/// key and committee policy. It does not imply archive availability or live
/// finality beyond that material.
pub fn verify_no_evm_finality_evidence_threshold(
    finality: &NoEvmReceiptFinalityEvidence,
    chain_id: u64,
    cluster_public_key: &[u8; 48],
    committee_size: u16,
    required_signature_count: usize,
) -> Result<NoEvmReceiptBlsFinalityVerification, NoEvmReceiptProofError> {
    validate_no_evm_finality_threshold(required_signature_count, usize::from(committee_size))?;
    validate_no_evm_receipt_finality_evidence(finality, None)?;
    let message = compute_no_evm_round_finality_message(chain_id, finality.round);
    verify_no_evm_finality_certificate_threshold(
        "finalityEvidence.certificate",
        &finality.certificate,
        finality.round,
        &message,
        cluster_public_key,
        committee_size,
        required_signature_count,
    )
}

/// Verify BLS round-certificate finality evidence in multisig mode against a
/// trusted authority roster.
pub fn verify_no_evm_finality_evidence_multisig(
    finality: &NoEvmReceiptFinalityEvidence,
    chain_id: u64,
    trusted_signers: &[NoEvmReceiptTrustedBlsSigner],
    required_signature_count: usize,
) -> Result<NoEvmReceiptBlsFinalityVerification, NoEvmReceiptProofError> {
    validate_no_evm_finality_threshold(required_signature_count, trusted_signers.len())?;
    validate_no_evm_receipt_finality_evidence(finality, None)?;
    let message = compute_no_evm_round_finality_message(chain_id, finality.round);
    verify_no_evm_finality_certificate_multisig(
        "finalityEvidence.certificate",
        &finality.certificate,
        finality.round,
        &message,
        trusted_signers,
        required_signature_count,
    )
}

/// Verify block-bound leader and DAC BLS certificates in multisig mode against
/// a trusted authority roster.
pub fn verify_no_evm_block_finality_evidence_multisig(
    finality: &NoEvmReceiptFinalityEvidence,
    chain_id: u64,
    trusted_signers: &[NoEvmReceiptTrustedBlsSigner],
    required_signature_count: usize,
) -> Result<NoEvmReceiptBlockBlsFinalityVerification, NoEvmReceiptProofError> {
    validate_no_evm_finality_threshold(required_signature_count, trusted_signers.len())?;
    validate_no_evm_receipt_finality_evidence(finality, None)?;
    let block_reference = finality.block_reference.clone().ok_or_else(|| {
        NoEvmReceiptProofError::FinalityVerificationConfig {
            field: "finalityEvidence.blockReference".to_owned(),
            reason: "required for block-bound finality verification".to_owned(),
        }
    })?;
    let leader_certificate = finality.leader_certificate.as_ref().ok_or_else(|| {
        NoEvmReceiptProofError::FinalityVerificationConfig {
            field: "finalityEvidence.leaderCertificate".to_owned(),
            reason: "required for block-bound finality verification".to_owned(),
        }
    })?;
    let dac_certificate = finality.dac_certificate.as_ref().ok_or_else(|| {
        NoEvmReceiptProofError::FinalityVerificationConfig {
            field: "finalityEvidence.dacCertificate".to_owned(),
            reason: "required for block-bound finality verification".to_owned(),
        }
    })?;
    let leader_message = compute_no_evm_leader_finality_message(chain_id, &block_reference)?;
    let dac_message = compute_no_evm_dac_finality_message(chain_id, &block_reference)?;

    Ok(NoEvmReceiptBlockBlsFinalityVerification {
        block_reference,
        leader_certificate: verify_no_evm_finality_certificate_multisig(
            "finalityEvidence.leaderCertificate",
            leader_certificate,
            finality.round,
            &leader_message,
            trusted_signers,
            required_signature_count,
        )?,
        dac_certificate: verify_no_evm_finality_certificate_multisig(
            "finalityEvidence.dacCertificate",
            dac_certificate,
            finality.round,
            &dac_message,
            trusted_signers,
            required_signature_count,
        )?,
    })
}

/// Verify block-bound leader and DAC BLS certificates against a trusted
/// threshold-cluster aggregate public key.
pub fn verify_no_evm_block_finality_evidence_threshold(
    finality: &NoEvmReceiptFinalityEvidence,
    chain_id: u64,
    cluster_public_key: &[u8; 48],
    committee_size: u16,
    required_signature_count: usize,
) -> Result<NoEvmReceiptBlockBlsFinalityVerification, NoEvmReceiptProofError> {
    validate_no_evm_finality_threshold(required_signature_count, usize::from(committee_size))?;
    validate_no_evm_receipt_finality_evidence(finality, None)?;
    let block_reference = finality.block_reference.clone().ok_or_else(|| {
        NoEvmReceiptProofError::FinalityVerificationConfig {
            field: "finalityEvidence.blockReference".to_owned(),
            reason: "required for block-bound finality verification".to_owned(),
        }
    })?;
    let leader_certificate = finality.leader_certificate.as_ref().ok_or_else(|| {
        NoEvmReceiptProofError::FinalityVerificationConfig {
            field: "finalityEvidence.leaderCertificate".to_owned(),
            reason: "required for block-bound finality verification".to_owned(),
        }
    })?;
    let dac_certificate = finality.dac_certificate.as_ref().ok_or_else(|| {
        NoEvmReceiptProofError::FinalityVerificationConfig {
            field: "finalityEvidence.dacCertificate".to_owned(),
            reason: "required for block-bound finality verification".to_owned(),
        }
    })?;
    let leader_message = compute_no_evm_leader_finality_message(chain_id, &block_reference)?;
    let dac_message = compute_no_evm_dac_finality_message(chain_id, &block_reference)?;

    Ok(NoEvmReceiptBlockBlsFinalityVerification {
        block_reference,
        leader_certificate: verify_no_evm_finality_certificate_threshold(
            "finalityEvidence.leaderCertificate",
            leader_certificate,
            finality.round,
            &leader_message,
            cluster_public_key,
            committee_size,
            required_signature_count,
        )?,
        dac_certificate: verify_no_evm_finality_certificate_threshold(
            "finalityEvidence.dacCertificate",
            dac_certificate,
            finality.round,
            &dac_message,
            cluster_public_key,
            committee_size,
            required_signature_count,
        )?,
    })
}

fn verify_no_evm_finality_certificate_multisig(
    field: &str,
    cert: &NoEvmReceiptFinalityCertificate,
    finality_round: u64,
    message: &[u8; 32],
    trusted_signers: &[NoEvmReceiptTrustedBlsSigner],
    required_signature_count: usize,
) -> Result<NoEvmReceiptBlsFinalityVerification, NoEvmReceiptProofError> {
    let signature = decode_no_evm_finality_certificate_signature(field, &cert.signature)?;
    let signer_indices = no_evm_finality_certificate_signer_indices(field, cert)?;
    let committee_size = trusted_signers
        .iter()
        .map(|signer| signer.authority_index)
        .max()
        .map_or(0_u16, |idx| idx.saturating_add(1));
    let base = no_evm_finality_certificate_verification_base(
        field,
        cert,
        finality_round,
        &signer_indices,
        committee_size,
        required_signature_count,
    )?;

    let mut trusted_indices = HashSet::new();
    for signer in trusted_signers {
        if !trusted_indices.insert(signer.authority_index) {
            return Err(NoEvmReceiptProofError::FinalityVerificationConfig {
                field: "trustedSigners".to_owned(),
                reason: format!("duplicate authority index {}", signer.authority_index),
            });
        }
    }

    let mut public_keys = Vec::with_capacity(signer_indices.len());
    let mut all_signers_trusted = true;
    for signer_index in &signer_indices {
        let Some(signer) = trusted_signers
            .iter()
            .find(|trusted| trusted.authority_index == *signer_index)
        else {
            all_signers_trusted = false;
            continue;
        };
        public_keys.push(signer.public_key);
    }

    let signature_valid = all_signers_trusted
        && !public_keys.is_empty()
        && verify_no_evm_bls_fast_aggregate(&public_keys, message, &signature);

    Ok(NoEvmReceiptBlsFinalityVerification {
        all_signers_trusted,
        signature_valid,
        ..base
    })
}

fn verify_no_evm_finality_certificate_threshold(
    field: &str,
    cert: &NoEvmReceiptFinalityCertificate,
    finality_round: u64,
    message: &[u8; 32],
    cluster_public_key: &[u8; 48],
    committee_size: u16,
    required_signature_count: usize,
) -> Result<NoEvmReceiptBlsFinalityVerification, NoEvmReceiptProofError> {
    let signature = decode_no_evm_finality_certificate_signature(field, &cert.signature)?;
    let signer_indices = no_evm_finality_certificate_signer_indices(field, cert)?;
    let base = no_evm_finality_certificate_verification_base(
        field,
        cert,
        finality_round,
        &signer_indices,
        committee_size,
        required_signature_count,
    )?;
    let signature_valid = base.signer_indices_in_range
        && verify_no_evm_bls_single(cluster_public_key, message, &signature);

    Ok(NoEvmReceiptBlsFinalityVerification {
        all_signers_trusted: base.signer_indices_in_range,
        signature_valid,
        ..base
    })
}

/// Verify snapshot archive proof signatures against a trusted ML-DSA-65 roster.
///
/// This helper checks only that trusted signer public keys produced valid
/// signatures over `archive_proof.signatureDigest` and that `threshold` is met.
/// It does not claim validator finality or archive availability.
///
/// # Errors
/// Returns [`NoEvmReceiptProofError`] when the archive proof shape or trusted
/// signer roster is malformed.
pub fn verify_no_evm_archive_proof_signatures(
    archive_proof: &NoEvmArchiveProof,
    trusted_signers: &[NoEvmArchiveTrustedSigner],
    threshold: usize,
) -> Result<NoEvmArchiveSignatureVerification, NoEvmReceiptProofError> {
    use fips204::ml_dsa_65;
    use fips204::traits::{SerDes, Verifier};

    if threshold == 0 {
        return Err(NoEvmReceiptProofError::ArchiveSignatureVerificationConfig {
            field: "threshold".to_owned(),
            reason: "must be at least 1".to_owned(),
        });
    }

    validate_no_evm_archive_proof(archive_proof)?;

    let mut roster = HashMap::<String, [u8; ml_dsa_65::PK_LEN]>::new();
    for (index, signer) in trusted_signers.iter().enumerate() {
        let field = format!("trustedSigners[{index}].publicKey");
        let public_key: [u8; ml_dsa_65::PK_LEN] =
            signer
                .public_key
                .clone()
                .try_into()
                .map_err(|bytes: Vec<u8>| NoEvmReceiptProofError::InvalidHexLength {
                    field: field.clone(),
                    expected: ml_dsa_65::PK_LEN,
                    actual: bytes.len(),
                })?;
        let signer_id = no_evm_ml_dsa65_signer_id_hex(&public_key);
        if let Some(expected) = &signer.signer_id {
            let expected_bytes =
                decode_no_evm_hex(format!("trustedSigners[{index}].signerId"), expected)?;
            if expected_bytes.len() != 20 || expected.to_lowercase() != signer_id {
                return Err(NoEvmReceiptProofError::ArchiveSignatureVerificationConfig {
                    field: format!("trustedSigners[{index}].signerId"),
                    reason: format!("does not match public key signer id {signer_id}"),
                });
            }
        }
        if roster.insert(signer_id.clone(), public_key).is_some() {
            return Err(NoEvmReceiptProofError::ArchiveSignatureVerificationConfig {
                field: "trustedSigners".to_owned(),
                reason: format!("duplicate signer id {signer_id}"),
            });
        }
    }

    let (signature_digest_hex, signatures, signature_field) =
        if archive_proof.signature_digest.is_some() || !archive_proof.signatures.is_empty() {
            (
                archive_proof.signature_digest.as_ref(),
                archive_proof.signatures.as_slice(),
                "archiveProof.signatures",
            )
        } else if let Some(snapshot) = archive_proof.covering_snapshot.as_ref() {
            (
                Some(&snapshot.signature_digest),
                snapshot.signatures.as_slice(),
                "archiveProof.coveringSnapshot.signatures",
            )
        } else {
            (
                None,
                archive_proof.signatures.as_slice(),
                "archiveProof.signatures",
            )
        };

    let mut issues = Vec::new();
    let Some(signature_digest_hex) = signature_digest_hex else {
        issues.push(NoEvmArchiveSignatureVerificationIssue {
            code: "missing_signature_digest",
            message: "archiveProof.signatureDigest is required for signature verification"
                .to_owned(),
            signature_index: None,
            signer_id: None,
        });
        return Ok(NoEvmArchiveSignatureVerification {
            verified: false,
            threshold,
            valid_signers: Vec::new(),
            checked_signatures: signatures.len(),
            issues,
        });
    };
    let signature_digest = decode_no_evm_hash(
        if signature_field == "archiveProof.signatures" {
            "archiveProof.signatureDigest"
        } else {
            "archiveProof.coveringSnapshot.signatureDigest"
        },
        signature_digest_hex,
    )?;
    let mut seen = HashSet::<String>::new();
    let mut valid_signers = Vec::new();

    for (index, signature) in signatures.iter().enumerate() {
        let parsed =
            parse_no_evm_archive_signature(format!("{signature_field}[{index}]"), signature)?;
        if !seen.insert(parsed.signer_id_hex.clone()) {
            issues.push(NoEvmArchiveSignatureVerificationIssue {
                code: "duplicate_signer",
                message: format!("duplicate archive proof signer {}", parsed.signer_id_hex),
                signature_index: Some(index),
                signer_id: Some(parsed.signer_id_hex),
            });
            continue;
        }
        let Some(public_key_bytes) = roster.get(&parsed.signer_id_hex) else {
            issues.push(NoEvmArchiveSignatureVerificationIssue {
                code: "untrusted_signer",
                message: format!(
                    "archive proof signer {} is not trusted",
                    parsed.signer_id_hex
                ),
                signature_index: Some(index),
                signer_id: Some(parsed.signer_id_hex),
            });
            continue;
        };
        let Ok(signature_bytes) = <[u8; ml_dsa_65::SIG_LEN]>::try_from(parsed.payload) else {
            issues.push(NoEvmArchiveSignatureVerificationIssue {
                code: "invalid_signature",
                message: format!(
                    "archive proof signature payload must be {} bytes",
                    ml_dsa_65::SIG_LEN
                ),
                signature_index: Some(index),
                signer_id: Some(parsed.signer_id_hex),
            });
            continue;
        };
        let Ok(public_key) = ml_dsa_65::PublicKey::try_from_bytes(*public_key_bytes) else {
            issues.push(NoEvmArchiveSignatureVerificationIssue {
                code: "invalid_trusted_public_key",
                message: format!(
                    "trusted public key for {} is malformed",
                    parsed.signer_id_hex
                ),
                signature_index: Some(index),
                signer_id: Some(parsed.signer_id_hex),
            });
            continue;
        };
        if public_key.verify(&signature_digest, &signature_bytes, &[]) {
            valid_signers.push(parsed.signer_id_hex);
        } else {
            issues.push(NoEvmArchiveSignatureVerificationIssue {
                code: "invalid_signature",
                message: format!(
                    "archive proof signature from {} is invalid",
                    parsed.signer_id_hex
                ),
                signature_index: Some(index),
                signer_id: Some(parsed.signer_id_hex),
            });
        }
    }

    if valid_signers.len() < threshold {
        issues.push(NoEvmArchiveSignatureVerificationIssue {
            code: "threshold_not_met",
            message: format!(
                "archive proof has {} valid trusted signatures, below threshold {threshold}",
                valid_signers.len()
            ),
            signature_index: None,
            signer_id: None,
        });
    }

    Ok(NoEvmArchiveSignatureVerification {
        verified: issues.is_empty(),
        threshold,
        valid_signers,
        checked_signatures: signatures.len(),
        issues,
    })
}

fn validate_no_evm_receipt_proof_metadata(
    proof: &NoEvmReceiptProof,
) -> Result<(), NoEvmReceiptProofError> {
    if proof.schema != NO_EVM_RECEIPT_PROOF_SCHEMA {
        return Err(NoEvmReceiptProofError::UnsupportedSchema {
            actual: proof.schema.clone(),
        });
    }
    if proof.proof_type != NO_EVM_RECEIPT_PROOF_TYPE {
        return Err(NoEvmReceiptProofError::UnsupportedProofType {
            actual: proof.proof_type.clone(),
        });
    }
    if !is_supported_no_evm_receipt_root_algorithm(&proof.root_algorithm) {
        return Err(NoEvmReceiptProofError::UnsupportedRootAlgorithm {
            actual: proof.root_algorithm.clone(),
        });
    }
    if proof.receipt_codec != NO_EVM_RECEIPT_CODEC {
        return Err(NoEvmReceiptProofError::UnsupportedReceiptCodec {
            actual: proof.receipt_codec.clone(),
        });
    }
    if let Some(archive_proof) = &proof.archive_proof {
        validate_no_evm_archive_proof(archive_proof)?;
        if let Some(snapshot) = &archive_proof.covering_snapshot {
            if snapshot.checkpoint_to != proof.block_height {
                return Err(NoEvmReceiptProofError::InvalidArchiveProofShape {
                    field: "archiveProof.coveringSnapshot.checkpointTo".to_owned(),
                    reason: "must match blockHeight".to_owned(),
                });
            }
            let checkpoint_content_hash = decode_no_evm_hash(
                "archiveProof.coveringSnapshot.checkpointContentHash",
                &snapshot.checkpoint_content_hash,
            )?;
            let archive_content_hash =
                decode_no_evm_hash("archiveProof.contentHash", &archive_proof.content_hash)?;
            if checkpoint_content_hash != archive_content_hash {
                return Err(NoEvmReceiptProofError::InvalidArchiveProofShape {
                    field: "archiveProof.coveringSnapshot.checkpointContentHash".to_owned(),
                    reason: "must match archiveProof.contentHash".to_owned(),
                });
            }
        }
    }
    if let Some(finality) = &proof.finality_evidence {
        validate_no_evm_receipt_finality_evidence(finality, Some(&proof.block_hash))?;
    }
    Ok(())
}

fn validate_no_evm_archive_proof(
    archive_proof: &NoEvmArchiveProof,
) -> Result<(), NoEvmReceiptProofError> {
    if archive_proof.schema != NO_EVM_ARCHIVE_PROOF_SCHEMA {
        return Err(NoEvmReceiptProofError::UnsupportedArchiveProofSchema {
            actual: archive_proof.schema.clone(),
        });
    }
    decode_no_evm_hash("archiveProof.manifestHash", &archive_proof.manifest_hash)?;
    decode_no_evm_hash("archiveProof.contentHash", &archive_proof.content_hash)?;
    if let Some(signature_digest) = &archive_proof.signature_digest {
        decode_no_evm_hash("archiveProof.signatureDigest", signature_digest)?;
    }
    for (index, signature) in archive_proof.signatures.iter().enumerate() {
        validate_no_evm_archive_signature(format!("archiveProof.signatures[{index}]"), signature)?;
    }
    if let Some(snapshot) = &archive_proof.covering_snapshot {
        validate_no_evm_archive_covering_snapshot(snapshot)?;
    }
    Ok(())
}

fn validate_no_evm_archive_covering_snapshot(
    snapshot: &NoEvmArchiveCoveringSnapshot,
) -> Result<(), NoEvmReceiptProofError> {
    decode_no_evm_hash(
        "archiveProof.coveringSnapshot.manifestHash",
        &snapshot.manifest_hash,
    )?;
    decode_no_evm_hash(
        "archiveProof.coveringSnapshot.signatureDigest",
        &snapshot.signature_digest,
    )?;
    decode_no_evm_hash(
        "archiveProof.coveringSnapshot.contentHash",
        &snapshot.content_hash,
    )?;
    decode_no_evm_hash(
        "archiveProof.coveringSnapshot.checkpointContentHash",
        &snapshot.checkpoint_content_hash,
    )?;
    if snapshot.checkpoint_from != 0 {
        return Err(NoEvmReceiptProofError::InvalidArchiveProofShape {
            field: "archiveProof.coveringSnapshot.checkpointFrom".to_owned(),
            reason: "must be 0".to_owned(),
        });
    }
    if snapshot.checkpoint_to > snapshot.snapshot_height {
        return Err(NoEvmReceiptProofError::InvalidArchiveProofShape {
            field: "archiveProof.coveringSnapshot.checkpointTo".to_owned(),
            reason: "must be <= snapshotHeight".to_owned(),
        });
    }
    if snapshot.signatures.is_empty() {
        return Err(NoEvmReceiptProofError::InvalidArchiveProofShape {
            field: "archiveProof.coveringSnapshot.signatures".to_owned(),
            reason: "must be non-empty".to_owned(),
        });
    }
    for (index, signature) in snapshot.signatures.iter().enumerate() {
        validate_no_evm_archive_signature(
            format!("archiveProof.coveringSnapshot.signatures[{index}]"),
            signature,
        )?;
    }
    Ok(())
}

struct ParsedNoEvmArchiveSignature {
    signer_id_hex: Hash,
    payload: Vec<u8>,
}

fn validate_no_evm_archive_signature(
    field: String,
    signature: &str,
) -> Result<(), NoEvmReceiptProofError> {
    parse_no_evm_archive_signature(field, signature).map(|_| ())
}

fn parse_no_evm_archive_signature(
    field: String,
    signature: &str,
) -> Result<ParsedNoEvmArchiveSignature, NoEvmReceiptProofError> {
    const SIGNER_ID_BYTE_LENGTH: usize = 20;

    let parts: Vec<&str> = signature.split(':').collect();
    if parts.len() != 3 || parts[0] != NO_EVM_ARCHIVE_SIGNATURE_SCHEME {
        return Err(NoEvmReceiptProofError::InvalidArchiveSignatureFormat { field });
    }

    let signer_id_field = format!("{field}.signerId");
    if !parts[1].starts_with("0x") {
        return Err(NoEvmReceiptProofError::InvalidArchiveSignatureFormat {
            field: signer_id_field,
        });
    }
    let signer_id = decode_no_evm_hex(signer_id_field.clone(), parts[1])?;
    if signer_id.len() != SIGNER_ID_BYTE_LENGTH {
        return Err(NoEvmReceiptProofError::InvalidHexLength {
            field: signer_id_field,
            expected: SIGNER_ID_BYTE_LENGTH,
            actual: signer_id.len(),
        });
    }

    let payload_field = format!("{field}.payload");
    if !parts[2].starts_with("0x") {
        return Err(NoEvmReceiptProofError::InvalidArchiveSignatureFormat {
            field: payload_field,
        });
    }
    let payload = decode_no_evm_hex(payload_field.clone(), parts[2])?;
    if payload.is_empty() {
        return Err(NoEvmReceiptProofError::EmptyArchiveSignaturePayload {
            field: payload_field,
        });
    }

    Ok(ParsedNoEvmArchiveSignature {
        signer_id_hex: hex_encode_0x(&signer_id),
        payload,
    })
}

fn no_evm_ml_dsa65_signer_id_hex(public_key: &[u8]) -> Hash {
    let mut hasher = blake3::Hasher::new();
    hasher.update(ML_DSA_65_ADDRESS_DERIVATION_DOMAIN);
    hasher.update(&STANDARD_ALGO_NUMBER_ML_DSA_65.to_be_bytes());
    hasher.update(public_key);
    let digest = hasher.finalize();
    hex_encode_0x(&digest.as_bytes()[..20])
}

fn validate_no_evm_receipt_finality_evidence(
    finality: &NoEvmReceiptFinalityEvidence,
    proof_block_hash: Option<&Hash>,
) -> Result<(), NoEvmReceiptProofError> {
    if finality.schema != NO_EVM_RECEIPT_FINALITY_EVIDENCE_SCHEMA {
        return Err(NoEvmReceiptProofError::UnsupportedFinalityEvidenceSchema {
            actual: finality.schema.clone(),
        });
    }
    if finality.source != NO_EVM_RECEIPT_FINALITY_EVIDENCE_SOURCE {
        return Err(NoEvmReceiptProofError::UnsupportedFinalityEvidenceSource {
            actual: finality.source.clone(),
        });
    }
    validate_no_evm_finality_certificate_shape(
        "finalityEvidence.certificate",
        finality.round,
        &finality.certificate,
    )?;
    if let Some(block_reference) = finality.block_reference.as_ref() {
        if block_reference.round != finality.round {
            return Err(NoEvmReceiptProofError::InvalidFinalityEvidenceShape {
                field: "finalityEvidence.blockReference.round".to_owned(),
                reason: "must match finalityEvidence.round".to_owned(),
            });
        }
        let block_reference_digest = decode_no_evm_hash(
            "finalityEvidence.blockReference.digest",
            &block_reference.digest,
        )?;
        if let Some(proof_block_hash) = proof_block_hash {
            let proof_block_hash = decode_no_evm_hash("blockHash", proof_block_hash)?;
            if block_reference_digest != proof_block_hash {
                return Err(NoEvmReceiptProofError::InvalidFinalityEvidenceShape {
                    field: "finalityEvidence.blockReference.digest".to_owned(),
                    reason: "must match blockHash".to_owned(),
                });
            }
        }
    } else if finality.leader_certificate.is_some() || finality.dac_certificate.is_some() {
        return Err(NoEvmReceiptProofError::InvalidFinalityEvidenceShape {
            field: "finalityEvidence.blockReference".to_owned(),
            reason: "required for block-bound certificates".to_owned(),
        });
    }
    if let Some(cert) = finality.leader_certificate.as_ref() {
        validate_no_evm_finality_certificate_shape(
            "finalityEvidence.leaderCertificate",
            finality.round,
            cert,
        )?;
    }
    if let Some(cert) = finality.dac_certificate.as_ref() {
        validate_no_evm_finality_certificate_shape(
            "finalityEvidence.dacCertificate",
            finality.round,
            cert,
        )?;
    }
    Ok(())
}

fn validate_no_evm_finality_certificate_shape(
    field: &str,
    finality_round: u64,
    certificate: &NoEvmReceiptFinalityCertificate,
) -> Result<(), NoEvmReceiptProofError> {
    if certificate.round != finality_round {
        if field == "finalityEvidence.certificate" {
            return Err(NoEvmReceiptProofError::FinalityCertificateRoundMismatch {
                evidence_round: finality_round,
                certificate_round: certificate.round,
            });
        }
        return Err(NoEvmReceiptProofError::InvalidFinalityEvidenceShape {
            field: format!("{field}.round"),
            reason: "must match finalityEvidence.round".to_owned(),
        });
    }
    if usize::from(certificate.signer_count) != certificate.signer_indices.len() {
        if field == "finalityEvidence.certificate" {
            return Err(NoEvmReceiptProofError::FinalitySignerCountMismatch {
                signer_count: certificate.signer_count,
                signer_indices: certificate.signer_indices.len(),
            });
        }
        return Err(NoEvmReceiptProofError::InvalidFinalityEvidenceShape {
            field: format!("{field}.signerCount"),
            reason: "must match signerIndices length".to_owned(),
        });
    }
    decode_no_evm_hex(format!("{field}.signature"), &certificate.signature)?;
    decode_no_evm_hex(
        format!("{field}.signersBitmap"),
        &certificate.signers_bitmap,
    )?;
    Ok(())
}

fn validate_no_evm_finality_threshold(
    required_signature_count: usize,
    trusted_capacity: usize,
) -> Result<(), NoEvmReceiptProofError> {
    if required_signature_count == 0 {
        return Err(NoEvmReceiptProofError::FinalityVerificationConfig {
            field: "requiredSignatureCount".to_owned(),
            reason: "finality evidence threshold must be at least 1".to_owned(),
        });
    }
    if required_signature_count > trusted_capacity {
        return Err(NoEvmReceiptProofError::FinalityVerificationConfig {
            field: "requiredSignatureCount".to_owned(),
            reason: format!(
                "finality evidence threshold {required_signature_count} exceeds trusted signer capacity {trusted_capacity}",
            ),
        });
    }
    Ok(())
}

fn no_evm_finality_certificate_verification_base(
    field: &str,
    certificate: &NoEvmReceiptFinalityCertificate,
    finality_round: u64,
    signer_indices: &[u16],
    committee_size: u16,
    required_signature_count: usize,
) -> Result<NoEvmReceiptBlsFinalityVerification, NoEvmReceiptProofError> {
    validate_no_evm_finality_certificate_shape(field, finality_round, certificate)?;
    let signer_count_matches = usize::from(certificate.signer_count)
        == certificate.signer_indices.len()
        && usize::from(certificate.signer_count) == signer_indices.len();
    let signer_bitmap_matches_indices = certificate.signer_indices == signer_indices;
    let signer_indices_in_range = signer_indices
        .iter()
        .all(|signer_index| *signer_index < committee_size);
    let accepted_signature_count = signer_indices.len();
    let threshold_met = accepted_signature_count >= required_signature_count;

    Ok(NoEvmReceiptBlsFinalityVerification {
        finality_evidence_present: true,
        signer_count_matches,
        signer_bitmap_matches_indices,
        signer_indices_in_range,
        all_signers_trusted: false,
        threshold_met,
        signature_valid: false,
        accepted_signature_count,
        required_signature_count,
    })
}

fn decode_no_evm_finality_certificate_signature(
    field: &str,
    raw: &str,
) -> Result<[u8; 96], NoEvmReceiptProofError> {
    let field = format!("{field}.signature");
    let bytes = decode_no_evm_hex(field.clone(), raw)?;
    let actual = bytes.len();
    bytes
        .try_into()
        .map_err(|_| NoEvmReceiptProofError::InvalidHexLength {
            field,
            expected: 96,
            actual,
        })
}

fn no_evm_finality_certificate_signer_indices(
    field: &str,
    certificate: &NoEvmReceiptFinalityCertificate,
) -> Result<Vec<u16>, NoEvmReceiptProofError> {
    let bitmap = decode_no_evm_hex(
        format!("{field}.signersBitmap"),
        &certificate.signers_bitmap,
    )?;
    no_evm_signer_indices_from_bitmap(field, &bitmap)
}

fn no_evm_signer_indices_from_bitmap(
    field: &str,
    bitmap: &[u8],
) -> Result<Vec<u16>, NoEvmReceiptProofError> {
    let mut out = Vec::new();
    for (byte_index, byte) in bitmap.iter().enumerate() {
        for bit_index in 0..8_usize {
            if byte & (1_u8 << bit_index) == 0 {
                continue;
            }
            let signer_index = byte_index
                .checked_mul(8)
                .and_then(|base| base.checked_add(bit_index))
                .ok_or_else(|| NoEvmReceiptProofError::FinalityVerificationConfig {
                    field: format!("{field}.signersBitmap"),
                    reason: "signer bitmap index overflow".to_owned(),
                })?;
            let signer_index = u16::try_from(signer_index).map_err(|_| {
                NoEvmReceiptProofError::FinalityVerificationConfig {
                    field: format!("{field}.signersBitmap"),
                    reason: "signer bitmap index exceeds u16 authority range".to_owned(),
                }
            })?;
            out.push(signer_index);
        }
    }
    Ok(out)
}

const NO_EVM_BLS_DST: &[u8] = b"BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";

fn verify_no_evm_bls_single(pk: &[u8; 48], msg: &[u8], sig: &[u8; 96]) -> bool {
    let Ok(pk) = BlsPublicKeyPoint::from_bytes(pk) else {
        return false;
    };
    let Ok(sig) = BlsSignaturePoint::from_bytes(sig) else {
        return false;
    };
    matches!(
        sig.verify(true, msg, NO_EVM_BLS_DST, &[], &pk, true),
        BLST_ERROR::BLST_SUCCESS
    )
}

fn verify_no_evm_bls_fast_aggregate(public_keys: &[[u8; 48]], msg: &[u8], sig: &[u8; 96]) -> bool {
    let parsed = public_keys
        .iter()
        .map(|pk| BlsPublicKeyPoint::from_bytes(pk))
        .collect::<Result<Vec<_>, _>>();
    let Ok(parsed) = parsed else {
        return false;
    };
    let refs = parsed.iter().collect::<Vec<_>>();
    let Ok(agg_pk) = AggregatePublicKey::aggregate(&refs, true) else {
        return false;
    };
    let Ok(sig) = BlsSignaturePoint::from_bytes(sig) else {
        return false;
    };
    matches!(
        sig.verify(
            true,
            msg,
            NO_EVM_BLS_DST,
            &[],
            &agg_pk.to_public_key(),
            true
        ),
        BLST_ERROR::BLST_SUCCESS
    )
}

fn compute_no_evm_receipts_root_bytes_for_algorithm<T>(
    algorithm: &str,
    receipts: &[T],
) -> Result<[u8; 32], NoEvmReceiptProofError>
where
    T: AsRef<[u8]>,
{
    match algorithm {
        NO_EVM_RECEIPT_ROOT_ALGORITHM | NO_EVM_LEGACY_BINARY_RECEIPT_ROOT_ALGORITHM => {
            compute_no_evm_receipts_root_bytes(receipts)
        }
        NO_EVM_LEGACY_RECEIPT_ROOT_ALGORITHM => compute_no_evm_legacy_receipts_root_bytes(receipts),
        _ => Err(NoEvmReceiptProofError::UnsupportedRootAlgorithm {
            actual: algorithm.to_owned(),
        }),
    }
}

fn compute_no_evm_receipts_root_bytes<T>(receipts: &[T]) -> Result<[u8; 32], NoEvmReceiptProofError>
where
    T: AsRef<[u8]>,
{
    let receipt_count =
        u32::try_from(receipts.len()).map_err(|_| NoEvmReceiptProofError::TooManyReceipts {
            actual: receipts.len(),
        })?;
    if receipt_count == 0 {
        let mut hasher = Keccak256::new();
        hasher.update(NO_EVM_RECEIPTS_ROOT_EMPTY_DOMAIN);
        hasher.update(0_u32.to_le_bytes());
        let digest = hasher.finalize();
        let mut out = [0_u8; 32];
        out.copy_from_slice(digest.as_ref());
        return Ok(out);
    }

    let mut level = receipts
        .iter()
        .enumerate()
        .map(|(index, receipt)| compute_no_evm_receipt_leaf_hash(index, receipt.as_ref()))
        .collect::<Result<Vec<_>, _>>()?;
    while level.len() > 1 {
        let mut next_level = Vec::with_capacity(level.len().div_ceil(2));
        for pair in level.chunks(2) {
            let left = pair[0];
            let right = *pair.get(1).unwrap_or(&left);
            next_level.push(compute_no_evm_receipt_node_hash(&left, &right));
        }
        level = next_level;
    }

    Ok(level[0])
}

fn compute_no_evm_receipt_leaf_hash(
    index: usize,
    receipt: &[u8],
) -> Result<[u8; 32], NoEvmReceiptProofError> {
    let index_u32 =
        u32::try_from(index).expect("receipt index fits into u32 after receipt count conversion");
    let len_u32 =
        u32::try_from(receipt.len()).map_err(|_| NoEvmReceiptProofError::ReceiptTooLarge {
            index,
            actual: receipt.len(),
        })?;

    let mut hasher = Keccak256::new();
    hasher.update(NO_EVM_RECEIPT_LEAF_DOMAIN);
    hasher.update(index_u32.to_le_bytes());
    hasher.update(len_u32.to_le_bytes());
    hasher.update(receipt);
    let digest = hasher.finalize();
    let mut out = [0_u8; 32];
    out.copy_from_slice(digest.as_ref());
    Ok(out)
}

fn compute_no_evm_receipt_node_hash(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
    let mut hasher = Keccak256::new();
    hasher.update(NO_EVM_RECEIPT_NODE_DOMAIN);
    hasher.update(left);
    hasher.update(right);
    let digest = hasher.finalize();
    let mut out = [0_u8; 32];
    out.copy_from_slice(digest.as_ref());
    out
}

fn compute_no_evm_legacy_receipts_root_bytes<T>(
    receipts: &[T],
) -> Result<[u8; 32], NoEvmReceiptProofError>
where
    T: AsRef<[u8]>,
{
    let receipt_count =
        u32::try_from(receipts.len()).map_err(|_| NoEvmReceiptProofError::TooManyReceipts {
            actual: receipts.len(),
        })?;
    let mut hasher = Keccak256::new();
    hasher.update(NO_EVM_LEGACY_RECEIPTS_ROOT_DOMAIN);
    hasher.update(receipt_count.to_le_bytes());

    for (index, receipt) in receipts.iter().enumerate() {
        let index_u32 = u32::try_from(index)
            .expect("receipt index fits into u32 after receipt count conversion");
        let bytes = receipt.as_ref();
        let len_u32 =
            u32::try_from(bytes.len()).map_err(|_| NoEvmReceiptProofError::ReceiptTooLarge {
                index,
                actual: bytes.len(),
            })?;
        hasher.update(index_u32.to_le_bytes());
        hasher.update(len_u32.to_le_bytes());
        hasher.update(bytes);
    }

    let digest = hasher.finalize();
    let mut out = [0_u8; 32];
    out.copy_from_slice(digest.as_ref());
    Ok(out)
}

fn is_supported_no_evm_receipt_root_algorithm(actual: &str) -> bool {
    actual == NO_EVM_RECEIPT_ROOT_ALGORITHM
        || actual == NO_EVM_LEGACY_BINARY_RECEIPT_ROOT_ALGORITHM
        || actual == NO_EVM_LEGACY_RECEIPT_ROOT_ALGORITHM
}

fn decode_no_evm_hash(field: &str, value: &str) -> Result<[u8; 32], NoEvmReceiptProofError> {
    let bytes = decode_no_evm_hex(field.to_owned(), value)?;
    if bytes.len() != 32 {
        return Err(NoEvmReceiptProofError::InvalidHexLength {
            field: field.to_owned(),
            expected: 32,
            actual: bytes.len(),
        });
    }
    let mut out = [0_u8; 32];
    out.copy_from_slice(&bytes);
    Ok(out)
}

fn decode_no_evm_hex(field: String, value: &str) -> Result<Vec<u8>, NoEvmReceiptProofError> {
    let Some(body) = value
        .strip_prefix("0x")
        .or_else(|| value.strip_prefix("0X"))
    else {
        return Err(NoEvmReceiptProofError::InvalidHex { field });
    };
    if body.len() % 2 != 0 {
        return Err(NoEvmReceiptProofError::InvalidHex { field });
    }

    let mut out = Vec::with_capacity(body.len() / 2);
    for index in 0..body.len() / 2 {
        let hi = decode_no_evm_hex_nibble(body.as_bytes()[index * 2]).ok_or_else(|| {
            NoEvmReceiptProofError::InvalidHex {
                field: field.clone(),
            }
        })?;
        let lo = decode_no_evm_hex_nibble(body.as_bytes()[index * 2 + 1]).ok_or_else(|| {
            NoEvmReceiptProofError::InvalidHex {
                field: field.clone(),
            }
        })?;
        out.push((hi << 4) | lo);
    }
    Ok(out)
}

fn decode_no_evm_hex_nibble(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

fn hex_encode_0x(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(2 + bytes.len() * 2);
    out.push_str("0x");
    for byte in bytes {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }
    out
}

/// Typed response returned by `lyth_nativeReceipt` and
/// `/api/v1/transactions/{hash}/native-receipt`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeReceiptResponse {
    /// Transaction hash.
    pub tx_hash: Hash,
    /// Inclusion block hash.
    pub block_hash: Hash,
    /// Inclusion block height.
    pub block_height: u64,
    /// Transaction index within the block.
    pub tx_index: u32,
    /// Native receipt schema version.
    pub schema: String,
    /// Consensus artifact hash from the RISC-V receipt.
    pub artifact_hash: Hash,
    /// Deterministic commitment to the native receipt payload.
    pub receipt_commitment: String,
    /// Bounded local no-EVM receipt proof transcript. Current nodes may
    /// return `null` while proof sourcing is pending; older nodes may omit
    /// this field.
    #[serde(default)]
    pub no_evm_proof: Option<NoEvmReceiptProof>,
    /// Execution counters reported by the RISC-V runner.
    pub counters: NativeReceiptCounters,
    /// Structured native fee object derived from receipt counters.
    pub fee: NativeReceiptFee,
    /// True when execution failed through the typed revert path.
    pub reverted: bool,
    /// Count of native state deltas carried by the receipt.
    pub native_delta_count: u32,
    /// Count of typed native events carried by the receipt.
    pub event_count: u32,
    /// Typed native events in receipt order. Nodes cap this at
    /// [`MAX_NATIVE_RECEIPT_EVENTS`].
    pub events: Vec<NativeReceiptEvent>,
    /// Provider/source metadata for the response.
    pub source: NativeReceiptSource,
}

/// Common typed payload envelope emitted by the native event projector.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NativeDecodedEvent {
    pub block_height: u64,
    pub tx_index: u32,
    pub sequence: u32,
    pub family: String,
    pub event_name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nonce: Option<u64>,
    #[serde(
        default,
        alias = "marketSurface",
        skip_serializing_if = "Option::is_none"
    )]
    pub market_surface: Option<String>,
    #[serde(
        default,
        alias = "marketAssetId",
        skip_serializing_if = "Option::is_none"
    )]
    pub market_asset_id: Option<Hash>,
    #[serde(
        default,
        alias = "marketRelatedAssetId",
        skip_serializing_if = "Option::is_none"
    )]
    pub market_related_asset_id: Option<Hash>,
    #[serde(
        default,
        alias = "marketOrderId",
        skip_serializing_if = "Option::is_none"
    )]
    pub market_order_id: Option<Hash>,
    #[serde(
        default,
        alias = "marketRelatedOrderId",
        skip_serializing_if = "Option::is_none"
    )]
    pub market_related_order_id: Option<Hash>,
    #[serde(
        default,
        deserialize_with = "deserialize_optional_lossless_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub price: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_optional_lossless_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub quantity: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_optional_lossless_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub remaining: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub side: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(
        default,
        alias = "nftStandard",
        skip_serializing_if = "Option::is_none"
    )]
    pub nft_standard: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy: Option<NativeMrcPolicyProjection>,
    #[serde(default, alias = "royaltyBps", skip_serializing_if = "Option::is_none")]
    pub royalty_bps: Option<u16>,
    #[serde(
        default,
        alias = "listingKind",
        skip_serializing_if = "Option::is_none"
    )]
    pub listing_kind: Option<serde_json::Value>,
    #[serde(
        default,
        alias = "expiresAtBlock",
        skip_serializing_if = "Option::is_none"
    )]
    pub expires_at_block: Option<u64>,
    #[serde(
        default,
        alias = "tickSize",
        deserialize_with = "deserialize_optional_lossless_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub tick_size: Option<String>,
    #[serde(
        default,
        alias = "lotSize",
        deserialize_with = "deserialize_optional_lossless_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub lot_size: Option<String>,
    #[serde(
        default,
        alias = "minQuantity",
        deserialize_with = "deserialize_optional_lossless_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub min_quantity: Option<String>,
    #[serde(
        default,
        alias = "minNotional",
        deserialize_with = "deserialize_optional_lossless_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub min_notional: Option<String>,
    pub payload_hash: Hash,
    #[serde(flatten)]
    pub extra: BTreeMap<String, serde_json::Value>,
}

/// Alias matching mono-core's native event projection naming.
pub type NativeEventProjection = NativeDecodedEvent;

/// Canonical policy body projected from native MRC policy-account events.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NativeMrcPolicyProjection {
    /// Whether the policy currently allows spending.
    pub enabled: bool,
    /// Maximum spend per action, retained as a lossless decimal string.
    #[serde(deserialize_with = "deserialize_lossless_string")]
    pub per_action_limit: String,
    /// Maximum spend inside one window, retained as a lossless decimal string.
    #[serde(deserialize_with = "deserialize_lossless_string")]
    pub window_limit: String,
    /// Allowed MRC asset ids.
    #[serde(deserialize_with = "deserialize_hash_vec_from_array_or_hexes")]
    pub allowed_assets: Vec<Hash>,
}

fn deserialize_lossless_string<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let value = serde_json::Value::deserialize(deserializer)?;
    match value {
        serde_json::Value::String(s) => Ok(s),
        serde_json::Value::Number(n) => Ok(n.to_string()),
        serde_json::Value::Bool(b) => Ok(b.to_string()),
        serde_json::Value::Null | serde_json::Value::Array(_) | serde_json::Value::Object(_) => {
            Err(serde::de::Error::custom(
                "expected string, number, or bool for lossless scalar",
            ))
        }
    }
}

fn deserialize_optional_lossless_string<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let value = Option::<serde_json::Value>::deserialize(deserializer)?;
    value
        .map(|v| match v {
            serde_json::Value::String(s) => Ok(s),
            serde_json::Value::Number(n) => Ok(n.to_string()),
            serde_json::Value::Bool(b) => Ok(b.to_string()),
            serde_json::Value::Null
            | serde_json::Value::Array(_)
            | serde_json::Value::Object(_) => Err(serde::de::Error::custom(
                "expected string, number, bool, or null for optional lossless scalar",
            )),
        })
        .transpose()
}

fn deserialize_hash_vec_from_array_or_hexes<'de, D>(deserializer: D) -> Result<Vec<Hash>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let values = Vec::<serde_json::Value>::deserialize(deserializer)?;
    values
        .into_iter()
        .map(hash_from_array_or_hex)
        .collect::<Result<Vec<_>, _>>()
        .map_err(serde::de::Error::custom)
}

fn hash_from_array_or_hex(value: serde_json::Value) -> Result<Hash, String> {
    match value {
        serde_json::Value::String(raw) => Ok(raw),
        serde_json::Value::Array(values) => {
            if values.len() != 32 {
                return Err(format!("expected 32 byte array, got {}", values.len()));
            }
            let mut out = String::with_capacity(66);
            out.push_str("0x");
            for (idx, value) in values.into_iter().enumerate() {
                let n = value
                    .as_u64()
                    .ok_or_else(|| format!("byte {idx} is not an unsigned integer"))?;
                let byte =
                    u8::try_from(n).map_err(|_| format!("byte {idx} is outside the u8 range"))?;
                write!(&mut out, "{byte:02x}").map_err(|err| err.to_string())?;
            }
            Ok(out)
        }
        other => Err(format!("expected hex string or 32 byte array, got {other}")),
    }
}

/// Native event family emitted by the RISC-V market module.
pub const NATIVE_MARKET_EVENT_FAMILY: &str = "market";

/// Optional filters applied to native receipt event rows.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct NativeEventFilter<'a> {
    pub address: Option<&'a str>,
    pub event_topic: Option<&'a str>,
    pub family: Option<&'a str>,
    pub event_name: Option<&'a str>,
}

impl<'a> NativeEventFilter<'a> {
    #[must_use]
    pub const fn new() -> Self {
        Self {
            address: None,
            event_topic: None,
            family: None,
            event_name: None,
        }
    }

    #[must_use]
    pub const fn address(mut self, address: &'a str) -> Self {
        self.address = Some(address);
        self
    }

    #[must_use]
    pub const fn event_topic(mut self, event_topic: &'a str) -> Self {
        self.event_topic = Some(event_topic);
        self
    }

    #[must_use]
    pub const fn family(mut self, family: &'a str) -> Self {
        self.family = Some(family);
        self
    }

    #[must_use]
    pub const fn event_name(mut self, event_name: &'a str) -> Self {
        self.event_name = Some(event_name);
        self
    }
}

/// Filter object passed to `lyth_nativeEvents` and `/api/v1/native-events`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeEventsFilter<'a> {
    /// Inclusive lower block bound.
    pub from_block: u64,
    /// Inclusive upper block bound.
    pub to_block: u64,
    /// Optional row cap. Nodes reject values above their configured maximum.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    /// Optional transaction index within each matched block.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tx_index: Option<u32>,
    /// Optional native event row index.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_index: Option<u32>,
    /// Optional typed native event-emitter address.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<&'a str>,
    /// Optional durable event topic hash.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_topic: Option<&'a str>,
    /// Optional native module family filter, for example `mrc`, `market`, or `agent`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub family: Option<&'a str>,
    /// Optional typed event name filter.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_name: Option<&'a str>,
    /// Optional primary event id.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary_id: Option<&'a str>,
    /// Optional related event id.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub related_id: Option<&'a str>,
    /// Optional token id.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_id: Option<&'a str>,
    /// Optional primary native account.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account: Option<&'a str>,
    /// Optional native counterparty account.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub counterparty: Option<&'a str>,
}

impl<'a> NativeEventsFilter<'a> {
    /// Build a block-range filter with no optional predicates.
    #[must_use]
    pub const fn new(from_block: u64, to_block: u64) -> Self {
        Self {
            from_block,
            to_block,
            limit: None,
            tx_index: None,
            log_index: None,
            address: None,
            event_topic: None,
            family: None,
            event_name: None,
            primary_id: None,
            related_id: None,
            token_id: None,
            account: None,
            counterparty: None,
        }
    }

    #[must_use]
    pub const fn limit(mut self, limit: u32) -> Self {
        self.limit = Some(limit);
        self
    }

    #[must_use]
    pub const fn tx_index(mut self, tx_index: u32) -> Self {
        self.tx_index = Some(tx_index);
        self
    }

    #[must_use]
    pub const fn log_index(mut self, log_index: u32) -> Self {
        self.log_index = Some(log_index);
        self
    }

    #[must_use]
    pub const fn address(mut self, address: &'a str) -> Self {
        self.address = Some(address);
        self
    }

    #[must_use]
    pub const fn event_topic(mut self, event_topic: &'a str) -> Self {
        self.event_topic = Some(event_topic);
        self
    }

    #[must_use]
    pub const fn family(mut self, family: &'a str) -> Self {
        self.family = Some(family);
        self
    }

    #[must_use]
    pub const fn event_name(mut self, event_name: &'a str) -> Self {
        self.event_name = Some(event_name);
        self
    }

    #[must_use]
    pub const fn primary_id(mut self, primary_id: &'a str) -> Self {
        self.primary_id = Some(primary_id);
        self
    }

    #[must_use]
    pub const fn related_id(mut self, related_id: &'a str) -> Self {
        self.related_id = Some(related_id);
        self
    }

    #[must_use]
    pub const fn token_id(mut self, token_id: &'a str) -> Self {
        self.token_id = Some(token_id);
        self
    }

    #[must_use]
    pub const fn account(mut self, account: &'a str) -> Self {
        self.account = Some(account);
        self
    }

    #[must_use]
    pub const fn counterparty(mut self, counterparty: &'a str) -> Self {
        self.counterparty = Some(counterparty);
        self
    }

    /// Encode this filter as API query pairs for `/api/v1/native-events`.
    #[must_use]
    pub fn to_query_pairs(&self) -> Vec<(&'static str, String)> {
        let mut query = vec![
            ("fromBlock", self.from_block.to_string()),
            ("toBlock", self.to_block.to_string()),
        ];
        if let Some(limit) = self.limit {
            query.push(("limit", limit.to_string()));
        }
        if let Some(tx_index) = self.tx_index {
            query.push(("txIndex", tx_index.to_string()));
        }
        if let Some(log_index) = self.log_index {
            query.push(("logIndex", log_index.to_string()));
        }
        if let Some(address) = self.address {
            query.push(("address", address.to_owned()));
        }
        if let Some(event_topic) = self.event_topic {
            query.push(("eventTopic", event_topic.to_owned()));
        }
        if let Some(family) = self.family {
            query.push(("family", family.to_owned()));
        }
        if let Some(event_name) = self.event_name {
            query.push(("eventName", event_name.to_owned()));
        }
        if let Some(primary_id) = self.primary_id {
            query.push(("primaryId", primary_id.to_owned()));
        }
        if let Some(related_id) = self.related_id {
            query.push(("relatedId", related_id.to_owned()));
        }
        if let Some(token_id) = self.token_id {
            query.push(("tokenId", token_id.to_owned()));
        }
        if let Some(account) = self.account {
            query.push(("account", account.to_owned()));
        }
        if let Some(counterparty) = self.counterparty {
            query.push(("counterparty", counterparty.to_owned()));
        }
        query
    }
}

/// Echoed optional predicates for a `lyth_nativeEvents` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeEventsResponseFilters {
    #[serde(default)]
    pub tx_index: Option<u32>,
    #[serde(default)]
    pub log_index: Option<u32>,
    #[serde(default)]
    pub address: Option<String>,
    #[serde(default)]
    pub event_topic: Option<Hash>,
    #[serde(default)]
    pub family: Option<String>,
    #[serde(default)]
    pub event_name: Option<String>,
    #[serde(default)]
    pub primary_id: Option<Hash>,
    #[serde(default)]
    pub related_id: Option<Hash>,
    #[serde(default)]
    pub token_id: Option<Hash>,
    #[serde(default)]
    pub account: Option<String>,
    #[serde(default)]
    pub counterparty: Option<String>,
}

/// Source metadata attached to a native event history response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeEventsSource {
    /// Indexer provider used for native event rows.
    pub indexer_provider: String,
}

/// Typed response returned by `lyth_nativeEvents` and `/api/v1/native-events`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeEventsResponse {
    /// Schema version pinned by the node.
    pub schema_version: u32,
    /// Inclusive lower block bound.
    pub from_block: u64,
    /// Inclusive upper block bound.
    pub to_block: u64,
    /// Effective row cap used by the node.
    pub limit: u32,
    /// Echoed optional predicates.
    pub filters: NativeEventsResponseFilters,
    /// Typed native events in canonical indexer order.
    pub events: Vec<NativeReceiptEvent>,
    /// Provider/source metadata for the response.
    pub source: NativeEventsSource,
}

/// Filter object passed to `lyth_nativeAgentState` and
/// `/api/v1/native-agent-state`.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentStateFilter.ts")
)]
pub struct NativeAgentStateFilter<'a> {
    /// Optional exact spending-policy lookup.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub policy_id: Option<&'a str>,
    /// Optional exact escrow lookup.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub escrow_id: Option<&'a str>,
    /// Optional account scope for owner/controller/buyer/provider/arbiter rows.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account: Option<&'a str>,
    /// Include bounded policy spend rows for policy/account lookups.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include_policy_spends: Option<bool>,
    /// Maximum rows per list.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
}

impl<'a> NativeAgentStateFilter<'a> {
    #[must_use]
    pub const fn new() -> Self {
        Self {
            policy_id: None,
            escrow_id: None,
            account: None,
            include_policy_spends: None,
            limit: None,
        }
    }

    #[must_use]
    pub const fn policy_id(mut self, policy_id: &'a str) -> Self {
        self.policy_id = Some(policy_id);
        self
    }

    #[must_use]
    pub const fn escrow_id(mut self, escrow_id: &'a str) -> Self {
        self.escrow_id = Some(escrow_id);
        self
    }

    #[must_use]
    pub const fn account(mut self, account: &'a str) -> Self {
        self.account = Some(account);
        self
    }

    #[must_use]
    pub const fn include_policy_spends(mut self, include_policy_spends: bool) -> Self {
        self.include_policy_spends = Some(include_policy_spends);
        self
    }

    #[must_use]
    pub const fn limit(mut self, limit: u32) -> Self {
        self.limit = Some(limit);
        self
    }

    /// Encode this filter as API query pairs for `/api/v1/native-agent-state`.
    #[must_use]
    pub fn to_query_pairs(&self) -> Vec<(&'static str, String)> {
        let mut query = Vec::new();
        if let Some(policy_id) = self.policy_id {
            query.push(("policyId", policy_id.to_owned()));
        }
        if let Some(escrow_id) = self.escrow_id {
            query.push(("escrowId", escrow_id.to_owned()));
        }
        if let Some(account) = self.account {
            query.push(("account", account.to_owned()));
        }
        if let Some(include_policy_spends) = self.include_policy_spends {
            query.push(("includePolicySpends", include_policy_spends.to_string()));
        }
        if let Some(limit) = self.limit {
            query.push(("limit", limit.to_string()));
        }
        query
    }
}

/// Echoed optional predicates for a native agent state response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentStateResponseFilters.ts")
)]
pub struct NativeAgentStateResponseFilters {
    #[serde(default)]
    pub policy_id: Option<Hash>,
    #[serde(default)]
    pub escrow_id: Option<Hash>,
    #[serde(default)]
    pub account: Option<Address>,
    pub include_policy_spends: bool,
}

/// Source metadata attached to a native agent current-state response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentStateSource.ts")
)]
pub struct NativeAgentStateSource {
    pub indexer_provider: String,
    pub projection: String,
}

/// Current-state native agent issuer registry row.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentIssuerStateRecord.ts")
)]
pub struct NativeAgentIssuerStateRecord {
    pub issuer_id: Hash,
    pub issuer: Address,
    /// Issuer-local nonce captured by the native agent module.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub nonce: Option<u64>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub metadata_hash: Option<Hash>,
    pub updated_at_block: u64,
}

/// Current-state native agent attestation row.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentAttestationStateRecord.ts")
)]
pub struct NativeAgentAttestationStateRecord {
    pub attestation_id: Hash,
    /// Issuer-local nonce captured when the attestation was issued.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub nonce: Option<u64>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub issuer_id: Option<Hash>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub issuer: Option<Address>,
    pub subject: Address,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub schema_hash: Option<Hash>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub payload_hash: Option<Hash>,
    pub active: bool,
    pub updated_at_block: u64,
}

/// Current-state native agent consent row.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentConsentStateRecord.ts")
)]
pub struct NativeAgentConsentStateRecord {
    pub consent_id: Hash,
    pub subject: Address,
    pub grantee: Address,
    /// Subject-local consent nonce captured by the native agent module.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub nonce: Option<u64>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub scope_hash: Option<Hash>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub expires_at: Option<u64>,
    pub active: bool,
    pub updated_at_block: u64,
}

/// Current-state native agent service-discovery row.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentServiceStateRecord.ts")
)]
pub struct NativeAgentServiceStateRecord {
    pub service_id: Hash,
    pub provider: Address,
    /// Provider-local service nonce captured by the native agent module.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub nonce: Option<u64>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub category_hash: Option<Hash>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub metadata_hash: Option<Hash>,
    pub active: bool,
    pub updated_at_block: u64,
}

/// Current-state native agent provider availability row.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentAvailabilityStateRecord.ts")
)]
pub struct NativeAgentAvailabilityStateRecord {
    pub provider: Address,
    pub max_concurrent: u32,
    pub open_requests: u32,
    pub paused: bool,
    pub updated_at_block: u64,
}

/// Current-state native agent arbiter registry row.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentArbiterStateRecord.ts")
)]
pub struct NativeAgentArbiterStateRecord {
    pub arbiter_id: Hash,
    pub arbiter: Address,
    /// Arbiter-local registration nonce captured by the native agent module.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub nonce: Option<u64>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub tier: Option<u16>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub metadata_hash: Option<Hash>,
    pub updated_at_block: u64,
}

/// Current-state native agent spending-policy aggregate.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentPolicyStateRecord.ts")
)]
pub struct NativeAgentPolicyStateRecord {
    pub policy_id: Hash,
    pub owner: Address,
    pub controller: Address,
    pub asset_id: Hash,
    /// Owner/controller-local policy nonce captured by the native agent module.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub nonce: Option<u64>,
    pub enabled: bool,
    pub per_action_limit: String,
    pub window_limit: String,
    pub window_secs: u64,
    pub updated_at_block: u64,
}

/// Current-state native agent policy spend usage row.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentPolicySpendStateRecord.ts")
)]
pub struct NativeAgentPolicySpendStateRecord {
    pub policy_id: Hash,
    pub controller: Address,
    pub asset_id: Hash,
    pub window: u64,
    pub amount: String,
    pub spent: String,
    pub updated_at_block: u64,
}

/// Current-state native agent escrow aggregate.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentEscrowStateRecord.ts")
)]
pub struct NativeAgentEscrowStateRecord {
    pub escrow_id: Hash,
    pub buyer: Address,
    pub provider: Address,
    pub arbiter: Address,
    pub asset_id: Hash,
    /// Buyer-local escrow nonce captured by the native agent module.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub nonce: Option<u64>,
    pub amount: String,
    pub terms_hash: Hash,
    pub round: u8,
    pub buyer_accepted: bool,
    pub provider_accepted: bool,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub submitted_payload_hash: Option<Hash>,
    pub status: String,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub resolution: Option<String>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub last_actor: Option<Address>,
    pub created_at_block: u64,
    pub updated_at_block: u64,
}

/// Native agent reputation review row.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentReputationReviewStateRecord.ts")
)]
pub struct NativeAgentReputationReviewStateRecord {
    pub review_id: Hash,
    pub reviewer: Address,
    pub subject: Address,
    pub category_id: u32,
    pub speed_score: u8,
    pub quality_score: u8,
    pub communication_score: u8,
    pub accuracy_score: u8,
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "string | null", optional))]
    pub payload_hash: Option<Hash>,
    pub updated_at_block: u64,
}

/// Typed response returned by `lyth_nativeAgentState` and
/// `/api/v1/native-agent-state`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeAgentStateResponse.ts")
)]
pub struct NativeAgentStateResponse {
    pub schema_version: u32,
    pub limit: u32,
    pub filters: NativeAgentStateResponseFilters,
    #[serde(default)]
    pub issuers: Vec<NativeAgentIssuerStateRecord>,
    #[serde(default)]
    pub attestations: Vec<NativeAgentAttestationStateRecord>,
    #[serde(default)]
    pub consents: Vec<NativeAgentConsentStateRecord>,
    #[serde(default)]
    pub services: Vec<NativeAgentServiceStateRecord>,
    #[serde(default)]
    pub availability: Vec<NativeAgentAvailabilityStateRecord>,
    #[serde(default)]
    pub arbiters: Vec<NativeAgentArbiterStateRecord>,
    #[serde(default)]
    pub reputation_reviews: Vec<NativeAgentReputationReviewStateRecord>,
    pub spending_policies: Vec<NativeAgentPolicyStateRecord>,
    pub policy_spends: Vec<NativeAgentPolicySpendStateRecord>,
    pub escrows: Vec<NativeAgentEscrowStateRecord>,
    pub source: NativeAgentStateSource,
}

/// Filter object passed to `lyth_nativeMarketState` and
/// `/api/v1/native-market-state`.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeMarketStateFilter.ts")
)]
pub struct NativeMarketStateFilter<'a> {
    /// Optional exact spot market lookup.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub market_id: Option<&'a str>,
    /// Optional exact spot order lookup.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub order_id: Option<&'a str>,
    /// Optional exact NFT listing lookup.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub listing_id: Option<&'a str>,
    /// Optional exact collection royalty lookup.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection_id: Option<&'a str>,
    /// Optional user account filter. Scopes spot orders by owner and NFT listings by seller.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account: Option<&'a str>,
    /// Include bounded spot orders for a requested market/order.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include_spot_orders: Option<bool>,
    /// Maximum rows per list.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
}

impl<'a> NativeMarketStateFilter<'a> {
    #[must_use]
    pub const fn new() -> Self {
        Self {
            market_id: None,
            order_id: None,
            listing_id: None,
            collection_id: None,
            account: None,
            include_spot_orders: None,
            limit: None,
        }
    }

    #[must_use]
    pub const fn market_id(mut self, market_id: &'a str) -> Self {
        self.market_id = Some(market_id);
        self
    }

    #[must_use]
    pub const fn order_id(mut self, order_id: &'a str) -> Self {
        self.order_id = Some(order_id);
        self
    }

    #[must_use]
    pub const fn listing_id(mut self, listing_id: &'a str) -> Self {
        self.listing_id = Some(listing_id);
        self
    }

    #[must_use]
    pub const fn collection_id(mut self, collection_id: &'a str) -> Self {
        self.collection_id = Some(collection_id);
        self
    }

    #[must_use]
    pub const fn account(mut self, account: &'a str) -> Self {
        self.account = Some(account);
        self
    }

    #[must_use]
    pub const fn include_spot_orders(mut self, include_spot_orders: bool) -> Self {
        self.include_spot_orders = Some(include_spot_orders);
        self
    }

    #[must_use]
    pub const fn limit(mut self, limit: u32) -> Self {
        self.limit = Some(limit);
        self
    }

    /// Encode this filter as API query pairs for `/api/v1/native-market-state`.
    #[must_use]
    pub fn to_query_pairs(&self) -> Vec<(&'static str, String)> {
        let mut query = Vec::new();
        if let Some(market_id) = self.market_id {
            query.push(("marketId", market_id.to_owned()));
        }
        if let Some(order_id) = self.order_id {
            query.push(("orderId", order_id.to_owned()));
        }
        if let Some(listing_id) = self.listing_id {
            query.push(("listingId", listing_id.to_owned()));
        }
        if let Some(collection_id) = self.collection_id {
            query.push(("collectionId", collection_id.to_owned()));
        }
        if let Some(account) = self.account {
            query.push(("account", account.to_owned()));
        }
        if let Some(include_spot_orders) = self.include_spot_orders {
            query.push(("includeSpotOrders", include_spot_orders.to_string()));
        }
        if let Some(limit) = self.limit {
            query.push(("limit", limit.to_string()));
        }
        query
    }
}

/// Echoed optional predicates for a native market state response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeMarketStateResponseFilters.ts")
)]
pub struct NativeMarketStateResponseFilters {
    #[serde(default)]
    pub market_id: Option<Hash>,
    #[serde(default)]
    pub order_id: Option<Hash>,
    #[serde(default)]
    pub listing_id: Option<Hash>,
    #[serde(default)]
    pub collection_id: Option<Hash>,
    #[serde(default)]
    pub account: Option<Address>,
    pub include_spot_orders: bool,
}

/// Source metadata attached to a native market current-state response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeMarketStateSource.ts")
)]
pub struct NativeMarketStateSource {
    pub indexer_provider: String,
    pub projection: String,
}

/// Current-state native spot market aggregate.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeSpotMarketStateRecord.ts")
)]
pub struct NativeSpotMarketStateRecord {
    pub market_id: Hash,
    pub owner: Address,
    pub base_asset_id: Hash,
    pub quote_asset_id: Hash,
    pub tick_size: String,
    pub lot_size: String,
    pub min_quantity: String,
    pub min_notional: String,
    pub trade_count: String,
    pub total_volume_base: String,
    #[serde(default)]
    pub last_price: Option<String>,
    #[serde(default)]
    pub last_block_height: Option<u64>,
    pub created_at_block: u64,
    pub updated_at_block: u64,
}

/// Current-state native spot order aggregate.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeSpotOrderStateRecord.ts")
)]
pub struct NativeSpotOrderStateRecord {
    pub order_id: Hash,
    pub market_id: Hash,
    pub owner: Address,
    /// Owner-local spot order nonce captured from `LimitOrderPlaced`.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub nonce: Option<u64>,
    pub side: String,
    pub price: String,
    pub quantity: String,
    pub remaining: String,
    pub status: String,
    pub expires_at_block: u64,
    pub updated_at_block: u64,
}

/// Current-state native NFT listing aggregate.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeNftListingStateRecord.ts")
)]
pub struct NativeNftListingStateRecord {
    pub listing_id: Hash,
    pub seller: Address,
    /// Seller-local NFT listing nonce captured from listing creation.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null", optional))]
    pub nonce: Option<u64>,
    pub standard: String,
    pub collection_id: Hash,
    pub token_id: Hash,
    pub quantity: String,
    pub payment_asset_id: Hash,
    pub price: String,
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown"))]
    pub listing_kind: serde_json::Value,
    pub status: String,
    pub expires_at_block: u64,
    #[serde(default)]
    pub highest_bidder: Option<Address>,
    #[serde(default)]
    pub highest_bid: Option<String>,
    pub updated_at_block: u64,
}

/// Current-state collection royalty aggregate.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeCollectionRoyaltyStateRecord.ts")
)]
pub struct NativeCollectionRoyaltyStateRecord {
    pub collection_id: Hash,
    #[serde(default)]
    pub creator: Option<Address>,
    pub recipient: Address,
    pub bps: u16,
    pub updated_at_block: u64,
}

/// Typed response returned by `lyth_nativeMarketState` and
/// `/api/v1/native-market-state`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeMarketStateResponse.ts")
)]
pub struct NativeMarketStateResponse {
    pub schema_version: u32,
    pub limit: u32,
    pub filters: NativeMarketStateResponseFilters,
    pub spot_markets: Vec<NativeSpotMarketStateRecord>,
    pub spot_orders: Vec<NativeSpotOrderStateRecord>,
    pub nft_listings: Vec<NativeNftListingStateRecord>,
    pub collection_royalties: Vec<NativeCollectionRoyaltyStateRecord>,
    pub source: NativeMarketStateSource,
}

/// Historical native event response with caller-selected decoded payload type.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypedNativeEventsResponse<TDecoded> {
    pub schema_version: u32,
    pub from_block: u64,
    pub to_block: u64,
    pub limit: u32,
    pub filters: NativeEventsResponseFilters,
    pub events: Vec<TypedNativeReceiptEvent<TDecoded>>,
    pub source: NativeEventsSource,
}

/// Native receipt event row with a caller-selected typed decoded payload.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypedNativeReceiptEvent<TDecoded> {
    pub block_height: u64,
    pub tx_index: u32,
    pub log_index: u32,
    pub address: String,
    pub event_topic: Hash,
    pub decoded: TDecoded,
    pub decoded_json: String,
}

impl<TDecoded> TypedNativeReceiptEvent<TDecoded>
where
    TDecoded: DeserializeOwned,
{
    /// Build a typed native event row from a native receipt event.
    ///
    /// The node normally provides `decoded` as a structured JSON value;
    /// `decodedJson` is accepted as a fallback for consumers that persist
    /// only the raw projector payload.
    pub fn from_receipt_event(event: &NativeReceiptEvent) -> serde_json::Result<Self> {
        Ok(Self {
            block_height: event.block_height,
            tx_index: event.tx_index,
            log_index: event.log_index,
            address: event.address.clone(),
            event_topic: event.event_topic.clone(),
            decoded: decode_native_event_payload(event)?,
            decoded_json: event.decoded_json.clone(),
        })
    }
}

/// Decode a native receipt event payload into a caller-selected type.
pub fn decode_native_event_payload<TDecoded>(
    event: &NativeReceiptEvent,
) -> serde_json::Result<TDecoded>
where
    TDecoded: DeserializeOwned,
{
    serde_json::from_value(event.decoded.clone())
        .or_else(|_| serde_json::from_str(&event.decoded_json))
}

/// Return whether a native receipt event matches the supplied filter.
#[must_use]
pub fn native_event_matches(event: &NativeReceiptEvent, filter: NativeEventFilter<'_>) -> bool {
    if let Some(address) = filter.address {
        if event.address != address {
            return false;
        }
    }
    if let Some(event_topic) = filter.event_topic {
        if event.event_topic != event_topic {
            return false;
        }
    }
    if filter.family.is_none() && filter.event_name.is_none() {
        return true;
    }

    let Ok(decoded) = decode_native_event_payload::<NativeDecodedEvent>(event) else {
        return false;
    };
    if let Some(family) = filter.family {
        if decoded.family != family {
            return false;
        }
    }
    if let Some(event_name) = filter.event_name {
        if decoded.event_name != event_name {
            return false;
        }
    }
    true
}

/// Force a receipt-event filter to the native market family.
#[must_use]
pub const fn native_market_receipt_event_filter<'a>(
    mut filter: NativeEventFilter<'a>,
) -> NativeEventFilter<'a> {
    filter.family = Some(NATIVE_MARKET_EVENT_FAMILY);
    filter
}

/// Force a historical native-events filter to the native market family.
#[must_use]
pub const fn native_market_events_filter<'a>(
    mut filter: NativeEventsFilter<'a>,
) -> NativeEventsFilter<'a> {
    filter.family = Some(NATIVE_MARKET_EVENT_FAMILY);
    filter
}

/// Decode and filter typed native event rows from a native receipt.
pub fn native_events_from_receipt<TDecoded>(
    receipt: &NativeReceiptResponse,
    filter: NativeEventFilter<'_>,
) -> serde_json::Result<Vec<TypedNativeReceiptEvent<TDecoded>>>
where
    TDecoded: DeserializeOwned,
{
    receipt
        .events
        .iter()
        .filter(|event| native_event_matches(event, filter))
        .map(TypedNativeReceiptEvent::from_receipt_event)
        .collect()
}

/// Decode historical native event rows into a caller-selected payload type.
pub fn typed_native_events_from_response<TDecoded>(
    response: &NativeEventsResponse,
) -> serde_json::Result<TypedNativeEventsResponse<TDecoded>>
where
    TDecoded: DeserializeOwned,
{
    Ok(TypedNativeEventsResponse {
        schema_version: response.schema_version,
        from_block: response.from_block,
        to_block: response.to_block,
        limit: response.limit,
        filters: response.filters.clone(),
        events: response
            .events
            .iter()
            .map(TypedNativeReceiptEvent::from_receipt_event)
            .collect::<serde_json::Result<_>>()?,
        source: response.source.clone(),
    })
}

/// Decode typed native market event rows from a native receipt.
pub fn native_market_events_from_receipt<TDecoded>(
    receipt: &NativeReceiptResponse,
    filter: NativeEventFilter<'_>,
) -> serde_json::Result<Vec<TypedNativeReceiptEvent<TDecoded>>>
where
    TDecoded: DeserializeOwned,
{
    native_events_from_receipt(receipt, native_market_receipt_event_filter(filter))
}

/// Ethereum-shaped transaction view returned by `eth_getTransactionByHash`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "TransactionView.ts"))]
pub struct TransactionView {
    /// Transaction hash.
    pub hash: Hash,
    /// Block hash that contains the transaction.
    #[serde(rename = "blockHash")]
    pub block_hash: Hash,
    /// Block height as a hex quantity.
    #[serde(rename = "blockNumber")]
    pub block_number: Quantity,
    /// Transaction index as a hex quantity.
    #[serde(rename = "transactionIndex")]
    pub transaction_index: Quantity,
    /// Sender address.
    pub from: Address,
    /// Recipient address, or `null` for contract creation.
    pub to: Option<Address>,
    /// Sender nonce as a hex quantity.
    pub nonce: Quantity,
    /// Transferred value as a hex quantity.
    pub value: Quantity,
    /// Gas limit as a hex quantity.
    pub gas: Quantity,
    /// EIP-1559 max fee per gas as a hex quantity.
    #[serde(rename = "maxFeePerGas")]
    pub max_fee_per_gas: Quantity,
    /// EIP-1559 max priority fee per gas as a hex quantity.
    #[serde(rename = "maxPriorityFeePerGas")]
    pub max_priority_fee_per_gas: Quantity,
    /// Calldata or deployment bytecode.
    pub input: Hex,
    /// EIP-2718 transaction type. `mono-core` currently renders `"0x2"`.
    #[serde(rename = "type")]
    pub tx_type: Quantity,
    /// Chain id as a hex quantity.
    #[serde(rename = "chainId")]
    pub chain_id: Quantity,
}

/// `eth_syncing` response when the node is mid-sync. Returns `false`
/// when the node is caught up — the SDK surfaces that as
/// `Option::None`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "SyncStatus.ts"))]
pub struct SyncStatus {
    /// First block of the current sync batch.
    #[serde(rename = "startingBlock")]
    pub starting_block: Quantity,
    /// Last block applied locally.
    #[serde(rename = "currentBlock")]
    pub current_block: Quantity,
    /// Highest block advertised by peers.
    #[serde(rename = "highestBlock")]
    pub highest_block: Quantity,
}

/// Legacy compatibility call/estimate request shape.
///
/// New v4.1 no-EVM app flows should prefer native MRV/RISC-V builders and
/// `lyth_*` previews. This type remains for raw compatibility RPC methods and
/// generated TypeScript bindings.
///
/// Every field is optional — the chain rejects payloads that omit
/// required fields with an `InvalidParams` error.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "CallRequest.ts"))]
pub struct CallRequest {
    /// Source address.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub from: Option<Address>,
    /// Destination address. `None` is interpreted as contract
    /// creation by the chain.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub to: Option<Address>,
    /// Execution-unit limit.
    #[serde(
        rename = "gas",
        alias = "executionUnitLimit",
        skip_serializing_if = "Option::is_none"
    )]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "gas", optional))]
    pub execution_unit_limit: Option<Quantity>,
    /// Fee per execution unit on legacy compatibility paths.
    #[serde(
        rename = "gasPrice",
        alias = "feePerExecutionUnit",
        skip_serializing_if = "Option::is_none"
    )]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "gasPrice", optional))]
    pub fee_per_execution_unit: Option<Quantity>,
    /// Native value to transfer, in lythoshi.
    #[serde(
        rename = "value",
        alias = "valueLythoshi",
        skip_serializing_if = "Option::is_none"
    )]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "value", optional))]
    pub value_lythoshi: Option<Quantity>,
    /// Calldata (`data` is canonical; chains accept `input` as alias).
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub data: Option<Hex>,
}

/// `eth_feeHistory` response.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "FeeHistoryResponse.ts")
)]
pub struct FeeHistoryResponse {
    /// Hex height of the first block in the window.
    #[serde(rename = "oldestBlock")]
    pub oldest_block: Quantity,
    /// `N+1` base-fee values (one per block, plus the next-block prediction).
    #[serde(rename = "baseFeePerGas")]
    pub base_fee_per_gas: Vec<Quantity>,
    /// `N` `gas_used / gas_limit` ratios.
    #[serde(rename = "gasUsedRatio")]
    pub gas_used_ratio: Vec<f64>,
    /// `N × len(percentiles)` 2D priority-fee approximations. Empty when
    /// caller did not request percentiles.
    #[serde(default)]
    pub reward: Vec<Vec<Quantity>>,
}

/// `lyth_mempoolStatus` aggregate.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MempoolSnapshot.ts"))]
pub struct MempoolSnapshot {
    /// Tx count in the Ready bucket.
    pub count_ready: u64,
    /// Tx count in the Pending bucket.
    pub count_pending: u64,
    /// Mailbox depth gauge.
    pub mailbox_depth: u64,
    /// Bytes held per tx class.
    pub bytes_by_class: [u64; 7],
}

/// `lyth_mempoolPending` per-tx entry.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "PendingTxSummary.ts"))]
pub struct PendingTxSummary {
    /// Tx hash.
    #[serde(rename = "txHash")]
    pub tx_hash: Hash,
    /// Sender nonce of this transaction.
    pub nonce: u64,
    /// Class index (0..=6).
    pub class: u8,
    /// Wire size in bytes.
    #[serde(rename = "wireBytesLen")]
    pub wire_bytes_len: u32,
    /// `true` if parked in the ready bucket.
    pub ready: bool,
}

/// `lyth_currentRound` round shape.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "RoundInfo.ts"))]
pub struct RoundInfo {
    /// Latest committed height.
    pub height: u64,
}

/// `lyth_executionUnitPrice` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "ExecutionUnitPriceResponse.ts")
)]
pub struct ExecutionUnitPriceResponse {
    /// Total execution-unit price in lythoshi.
    pub execution_unit_price_lythoshi: String,
    /// Base price component in lythoshi.
    pub base_price_per_execution_unit_lythoshi: String,
    /// Priority tip component in lythoshi.
    pub priority_tip_lythoshi: String,
    /// Block height that produced the quote, or `null` for mempool-floor quotes.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(type = "number | null"))]
    pub block_number: Option<u64>,
    /// Quote source label returned by the node.
    pub source: String,
}

/// Native MRC identity attached to a token-balance row.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "TokenBalanceMrcIdentity.ts")
)]
pub struct TokenBalanceMrcIdentity {
    /// MRC standard, currently `mrc20`, `mrc721`, `mrc1155`, or `mrc4626`.
    pub standard: String,
    /// MRC asset id, collection id, or MRC-4626 vault id.
    pub asset_id: Hash,
    /// Token id inside the collection for MRC-721/MRC-1155 rows; `null` for MRC-20/MRC-4626.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(optional = nullable))]
    pub token_id: Option<Hash>,
}

/// Per-asset balance row surfaced by `lyth_getTokenBalances`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "TokenBalanceRecord.ts")
)]
pub struct TokenBalanceRecord {
    /// 32-byte token id, `0x`-hex.
    #[serde(rename = "tokenId")]
    pub token_id: Hash,
    /// Balance as a decimal string.
    pub balance: String,
    /// Block height the balance was last observed at.
    #[serde(rename = "updatedAtBlock")]
    pub updated_at_block: u64,
    /// Native MRC identity, when the balance came from a native MRC row.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional = nullable))]
    pub mrc: Option<TokenBalanceMrcIdentity>,
    /// Optional single bridge route disclosure associated with this asset row.
    #[serde(
        rename = "bridgeRouteDisclosure",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    #[cfg_attr(
        feature = "ts-bindings",
        ts(
            rename = "bridgeRouteDisclosure",
            type = "import(\"../bridge.js\").BridgeRouteDisclosure | null",
            optional
        )
    )]
    pub bridge_route_disclosure: Option<BridgeRouteDisclosure>,
    /// Optional bridge route disclosures associated with this asset row.
    #[serde(
        rename = "bridgeRouteDisclosures",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    #[cfg_attr(
        feature = "ts-bindings",
        ts(
            rename = "bridgeRouteDisclosures",
            type = "import(\"../bridge.js\").BridgeRouteDisclosure[] | null",
            optional
        )
    )]
    pub bridge_route_disclosures: Option<Vec<BridgeRouteDisclosure>>,
}

/// Current-state metadata folded from native MRC creation/metadata events.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrcMetadataRecord.ts")
)]
pub struct MrcMetadataRecord {
    /// MRC standard: `mrc20`, `mrc721`, `mrc1155`, or `mrc4626`.
    pub standard: String,
    /// Asset, collection, or vault id.
    pub asset_id: Hash,
    /// Token id for token-specific metadata rows.
    pub token_id: Option<Hash>,
    /// Human-readable name, when carried by the source event.
    pub name: Option<String>,
    /// Short symbol, when carried by the source event.
    pub symbol: Option<String>,
    /// Display decimals, when carried by the source event.
    pub decimals: Option<u8>,
    /// Metadata URI, when carried by the source event.
    pub uri: Option<String>,
    /// Block height of the latest fold into this row.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub updated_at_block: u64,
}

/// `lyth_mrcMetadata` exact current-state metadata lookup response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrcMetadataResponse.ts")
)]
pub struct MrcMetadataResponse {
    /// Response schema version.
    pub schema_version: u32,
    /// Queried asset, collection, or vault id.
    pub asset_id: Hash,
    /// Queried token id, or `null` for asset/collection scope.
    pub token_id: Option<Hash>,
    /// Metadata row, or `null` when no aggregate exists for the key.
    pub metadata: Option<MrcMetadataRecord>,
}

/// Canonical MRC policy-account spending policy body.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrcPolicyRecord.ts"))]
pub struct MrcPolicyRecord {
    /// Whether the policy currently allows spending.
    pub enabled: bool,
    /// Maximum amount per action as decimal text.
    pub per_action_limit: String,
    /// Maximum amount inside one window as decimal text.
    pub window_limit: String,
    /// Assets allowed by this policy.
    pub allowed_assets: Vec<Hash>,
}

/// Current-state smart/policy account row folded from native MRC account events.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrcAccountRecord.ts"))]
pub struct MrcAccountRecord {
    /// Account row kind: `smart_account` or `policy_account`.
    pub kind: String,
    /// Account address this row describes.
    pub account: Address,
    /// Controller address authorized for this account.
    pub controller: Address,
    /// Recovery address registered for this account, when smart-account state
    /// carries one. ADVISORY / DISPLAY-ONLY: this is an inert stored field —
    /// the chain has no on-chain account `Recover` / `RotateController` path
    /// yet, so a registered recovery address cannot currently be exercised.
    /// Surfaces MUST NOT present this as a working "recover account" action.
    #[serde(default)]
    pub recovery: Option<Address>,
    /// Active policy hash, when this row is a policy account.
    #[serde(default)]
    pub policy_hash: Option<Hash>,
    /// Active policy body, when this row is a policy account and the node has indexed it.
    #[serde(default)]
    pub policy: Option<MrcPolicyRecord>,
    /// Account nonce as decimal text, or `null` when the row has no nonce.
    #[serde(default)]
    pub nonce: Option<String>,
    /// Block height of the latest fold into this row.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub updated_at_block: u64,
}

/// Current-state policy spend row included in `lyth_mrcAccount`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrcPolicySpendRecord.ts")
)]
pub struct MrcPolicySpendRecord {
    /// Policy account address.
    pub account: Address,
    /// Asset id governed by this spend window.
    pub asset_id: Hash,
    /// Spend window identifier as decimal text.
    pub window: String,
    /// Window allowance amount as decimal text.
    pub amount: String,
    /// Amount already spent in this window as decimal text.
    pub spent: String,
    /// Block height of the latest fold into this row.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub updated_at_block: u64,
}

/// Request parameters for `lyth_mrcAccount` and `/api/v1/mrc/accounts/{account}`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrcAccountRequest.ts")
)]
pub struct MrcAccountRequest {
    /// Account address to inspect.
    pub account: Address,
    /// Optional spend-row limit.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub spend_limit: Option<u32>,
}

/// `lyth_mrcAccount` exact current-state smart/policy account lookup response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrcAccountResponse.ts")
)]
pub struct MrcAccountResponse {
    /// Response schema version.
    pub schema_version: u32,
    /// Queried account address.
    pub account: Address,
    /// Policy spend row limit applied by the node.
    pub spend_limit: u32,
    /// Smart-account row, or `null` when none exists.
    pub smart_account: Option<MrcAccountRecord>,
    /// Policy-account row, or `null` when none exists.
    pub policy_account: Option<MrcAccountRecord>,
    /// Policy spend rows for this account.
    pub policy_spends: Vec<MrcPolicySpendRecord>,
}

/// Address-label row surfaced by `lyth_getAddressLabel`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "AddressLabelRecord.ts")
)]
pub struct AddressLabelRecord {
    /// Labeled address.
    pub address: Address,
    /// Lowercase category name, e.g. `foundation`, `exchange`,
    /// `bridge`, `treasury`, `contract`, or `operator`.
    pub category: String,
    /// Optional human-readable display name.
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    /// Block height the label was last asserted at.
    #[serde(rename = "updatedAtBlock")]
    pub updated_at_block: u64,
}

/// Per-wallet delegation event row surfaced by `lyth_getDelegationHistory`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "DelegationHistoryRecord.ts")
)]
pub struct DelegationHistoryRecord {
    /// Block height the event landed in.
    #[serde(rename = "blockHeight")]
    pub block_height: u64,
    /// Tx index within the block.
    #[serde(rename = "txIndex")]
    pub tx_index: u32,
    /// Log index within the tx.
    #[serde(rename = "logIndex")]
    pub log_index: u32,
    /// Wallet that performed the delegation move.
    pub wallet: Address,
    /// Source or only cluster id.
    pub cluster: u32,
    /// Destination cluster id for redelegations.
    #[serde(rename = "toCluster")]
    pub to_cluster: Option<u32>,
    /// Event kind: `delegated`, `undelegated`, or `redelegated`.
    pub kind: String,
    /// Weight moved in basis points.
    #[serde(rename = "weightBps")]
    pub weight_bps: u16,
    /// Wallet total committed weight after the event when known.
    #[serde(rename = "walletTotalBps")]
    pub wallet_total_bps: Option<u16>,
}

/// One row in `lyth_getAddressActivity`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "AddressActivityEntry.ts")
)]
pub struct AddressActivityEntry {
    /// Block height the event landed in.
    #[serde(rename = "blockHeight")]
    pub block_height: u64,
    /// Tx index within the block.
    #[serde(rename = "txIndex")]
    pub tx_index: u32,
    /// Log index within the tx.
    #[serde(rename = "logIndex")]
    pub log_index: u32,
    /// Source kind: transfer, swap, staking, or delegation.
    pub kind: String,
    /// Direction relative to the queried address, when directional.
    pub direction: Option<String>,
    /// Counterparty address for directional value movement.
    pub counterparty: Option<Address>,
    /// 32-byte token id when the event involves a token.
    #[serde(rename = "tokenId")]
    pub token_id: Option<Hash>,
    /// Decimal-string amount when the event has an amount.
    pub amount: Option<String>,
    /// Cluster id when the event involves a cluster.
    pub cluster: Option<u32>,
    /// Delegation weight in basis points.
    #[serde(rename = "weightBps")]
    pub weight_bps: Option<u16>,
    /// Kind-specific sub-label such as delegated, unstake, or stake.
    #[serde(rename = "subKind")]
    pub sub_kind: Option<String>,
}

/// Retention metadata returned by `lyth_addressActivityKind` for
/// pruned address activity windows.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "AddressActivityArchiveRedirect.ts")
)]
pub struct AddressActivityArchiveRedirect {
    /// Human-readable archival hint supplied by the node.
    pub hint: String,
}

/// Retention bounds returned by `lyth_addressActivityKind`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "AddressActivityKindRetention.ts")
)]
pub struct AddressActivityKindRetention {
    /// Earliest retained block for indexed activity.
    #[serde(rename = "earliestRetained")]
    pub earliest_retained: u64,
    /// Optional archive redirect hint.
    #[serde(rename = "archiveRedirect", default)]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub archive_redirect: Option<AddressActivityArchiveRedirect>,
}

/// `lyth_addressActivityKind` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "AddressActivityKindResponse.ts")
)]
pub struct AddressActivityKindResponse {
    /// Response schema version.
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    /// Queried address.
    pub address: Address,
    /// `found`, `not_found`, `indexer_disabled`, `pruned`, `private`,
    /// or a forward-compatible node-supplied string.
    pub kind: String,
    /// Retention metadata when the activity window was pruned.
    #[serde(default)]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub retention: Option<AddressActivityKindRetention>,
}

/// Reputation category scope returned by `lyth_agentReputation`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "AgentReputationCategoryScope.ts")
)]
#[serde(rename_all = "lowercase")]
pub enum AgentReputationCategoryScope {
    Global,
    Category,
}

/// One reputation accumulator row returned by `lyth_agentReputation`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "AgentReputationRecord.ts")
)]
#[serde(rename_all = "camelCase")]
pub struct AgentReputationRecord {
    /// Provider user address (`mono1...` bech32m).
    pub provider: Address,
    /// Reputation category id.
    pub category_id: u32,
    /// Block height that last updated this record.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub block_height: u64,
    /// Sum of speed scores multiplied by 10.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub speed_sum_x10: u64,
    /// Sum of quality scores multiplied by 10.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub quality_sum_x10: u64,
    /// Sum of communication scores multiplied by 10.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub communication_sum_x10: u64,
    /// Sum of accuracy scores multiplied by 10.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub accuracy_sum_x10: u64,
    /// Number of samples included in the accumulators.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub sample_count: u64,
    /// Average speed score multiplied by 10.
    pub avg_speed_x10: u32,
    /// Average quality score multiplied by 10.
    pub avg_quality_x10: u32,
    /// Average communication score multiplied by 10.
    pub avg_communication_x10: u32,
    /// Average accuracy score multiplied by 10.
    pub avg_accuracy_x10: u32,
}

/// `lyth_agentReputation` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "AgentReputationResponse.ts")
)]
#[serde(rename_all = "camelCase")]
pub struct AgentReputationResponse {
    /// Response schema version.
    pub schema_version: u32,
    /// Queried provider user address (`mono1...` bech32m).
    pub provider: Address,
    /// Queried category id.
    pub category_id: u32,
    /// Whether the node resolved the global or category-specific scope.
    pub category_scope: AgentReputationCategoryScope,
    /// Reputation row, or `null` when no row exists for the provider/category.
    pub record: Option<AgentReputationRecord>,
}

/// `lyth_indexerStatus` envelope. `null` on the wire surfaces as
/// `Option::None` here.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "IndexerStatus.ts"))]
pub struct IndexerStatus {
    /// Highest block fully ingested.
    #[serde(rename = "currentHeight")]
    pub current_height: u64,
    /// Highest block observed.
    #[serde(rename = "latestHeight")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub latest_height: Option<u64>,
    /// Active schema version.
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
}

/// `lyth_listProviders` / `lyth_getRegistration` record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "RegistryRecord.ts"))]
pub struct RegistryRecord {
    /// libp2p peer id, `0x`-hex 32-byte.
    #[serde(rename = "peerId")]
    pub peer_id: Hex,
    /// Capability bitmask.
    pub capabilities: u32,
    /// Primary external endpoint URL.
    pub endpoint: String,
    /// Current bond, hex quantity.
    pub bond: Quantity,
    /// Uptime in basis points (0..=10_000).
    #[serde(rename = "uptimeBps")]
    pub uptime_bps: u32,
    /// Block height the operator first registered at (operator "active
    /// since"). Always present on the live `lyth_getRegistration` /
    /// `lyth_listProviders` JSON.
    #[serde(rename = "registeredAtBlock")]
    pub registered_at_block: u64,
}

/// `lyth_getAccountPolicy` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "AccountPolicy.ts"))]
pub struct AccountPolicy {
    /// Policy mode label — `"public"`, `"stealth"`, `"confidential"`,
    /// `"shielded"`.
    pub mode: String,
    /// Whether the account accepts shielded transfers.
    #[serde(rename = "allowShielded")]
    pub allow_shielded: bool,
    /// Whether the account accepts confidential transfers.
    #[serde(rename = "allowConfidential")]
    pub allow_confidential: bool,
    /// Whether the account accepts stealth payments.
    #[serde(rename = "acceptStealth")]
    pub accept_stealth: bool,
    /// Whether the account requires originator proof.
    #[serde(rename = "requireOriginatorProof")]
    pub require_originator_proof: bool,
    /// Whether the account requires allowlist proof.
    #[serde(rename = "requireAllowlistProof")]
    pub require_allowlist_proof: bool,
    /// Raw flag word, `0x`-hex two-digit byte.
    pub flags: Hex,
    /// `true` when the account has explicitly set policy bits.
    pub explicit: bool,
}

/// `lyth_getAssetPolicy` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "AssetPolicy.ts"))]
pub struct AssetPolicy {
    /// Policy mode label.
    pub mode: String,
    /// Whether the asset allows shielded transfers.
    #[serde(rename = "allowShielded")]
    pub allow_shielded: bool,
    /// Whether the asset allows confidential transfers.
    #[serde(rename = "allowConfidential")]
    pub allow_confidential: bool,
    /// Whether the asset allows stealth transfers.
    #[serde(rename = "allowStealth")]
    pub allow_stealth: bool,
    /// Whether the asset allows transparent transfers.
    #[serde(rename = "allowTransparent")]
    pub allow_transparent: bool,
    /// KYC requirement bit.
    #[serde(rename = "requireKyc")]
    pub require_kyc: bool,
    /// Raw levels byte, `0x`-hex two-digit.
    pub levels: Hex,
    /// `true` when the asset has explicitly set policy.
    pub explicit: bool,
}

/// `lyth_getStorageProof` batch response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "StorageProofBatch.ts")
)]
pub struct StorageProofBatch {
    /// State-root the proofs verify against.
    #[serde(rename = "stateRoot")]
    pub state_root: Hash,
    /// Block height the proofs were generated against.
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    /// One opaque proof envelope per requested slot.
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown[]"))]
    pub proofs: Vec<serde_json::Value>,
}

/// One delegation row in `lyth_getDelegations`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "DelegationRow.ts"))]
pub struct DelegationRow {
    /// Cluster id receiving the delegated weight.
    pub cluster: u32,
    /// Delegated weight in basis points.
    #[serde(rename = "weightBps")]
    pub weight_bps: u16,
}

/// `lyth_getDelegations` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "DelegationsResponse.ts")
)]
pub struct DelegationsResponse {
    /// Queried wallet address.
    pub wallet: Address,
    /// Per-cluster delegation rows.
    pub rows: Vec<DelegationRow>,
    /// Sum of row weights.
    #[serde(rename = "totalBps")]
    pub total_bps: u32,
    /// Block selector echoed by the node.
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown"))]
    pub block: serde_json::Value,
}

/// One row in `lyth_pendingRewards`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "PendingRewardsRow.ts")
)]
pub struct PendingRewardsRow {
    /// Cluster id receiving the delegated weight.
    pub cluster: u32,
    /// Delegated weight in basis points.
    #[serde(rename = "weightBps")]
    pub weight_bps: u16,
    /// Unsettled reward-index delta for this cluster, as a hex quantity.
    #[serde(rename = "unsettledAmountLythoshi")]
    pub unsettled_amount_lythoshi: Quantity,
}

/// `lyth_pendingRewards` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "PendingRewardsResponse.ts")
)]
pub struct PendingRewardsResponse {
    /// Queried wallet address.
    pub wallet: Address,
    /// Settled plus unsettled claimable rewards, as a hex quantity.
    #[serde(rename = "totalAmountLythoshi")]
    pub total_amount_lythoshi: Quantity,
    /// Wallet-level pending reward already settled in storage.
    #[serde(rename = "settledPendingLythoshi")]
    pub settled_pending_lythoshi: Quantity,
    /// Sum of per-cluster unsettled reward-index deltas.
    #[serde(rename = "unsettledAmountLythoshi")]
    pub unsettled_amount_lythoshi: Quantity,
    /// Whether this wallet has auto-compounding enabled.
    #[serde(rename = "autoCompound")]
    pub auto_compound: bool,
    /// Per-cluster unsettled rows.
    pub rows: Vec<PendingRewardsRow>,
    /// Block selector echoed by the node.
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown"))]
    pub block: serde_json::Value,
}

/// One ticket in `lyth_redemptionQueue`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "RedemptionQueueTicket.ts")
)]
pub struct RedemptionQueueTicket {
    /// Stable queue index for this wallet.
    pub index: u64,
    /// Cluster id whose delegation weight is redeeming.
    pub cluster: u32,
    /// Redeeming delegation weight in basis points.
    #[serde(rename = "weightBps")]
    pub weight_bps: u16,
    /// Block height where the ticket was queued.
    #[serde(rename = "createdHeight")]
    pub created_height: u64,
    /// Block height where the cooldown matures.
    #[serde(rename = "maturityHeight")]
    pub maturity_height: u64,
    /// Whether the ticket is mature at the queried block, or `null`
    /// when the selector does not resolve to a height.
    pub mature: Option<bool>,
}

/// `lyth_redemptionQueue` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "RedemptionQueueResponse.ts")
)]
pub struct RedemptionQueueResponse {
    /// Queried wallet address.
    pub wallet: Address,
    /// Bounded wallet redemption tickets returned by the node.
    pub tickets: Vec<RedemptionQueueTicket>,
    /// Total ticket count stored for the wallet.
    pub count: u64,
    /// Number of decoded tickets returned.
    pub returned: usize,
    /// Block selector echoed by the node.
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown"))]
    pub block: serde_json::Value,
}

/// `lyth_getClusterDelegators` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "ClusterDelegatorsResponse.ts")
)]
pub struct ClusterDelegatorsResponse {
    /// Queried cluster id.
    pub cluster: u32,
    /// Delegator wallet addresses.
    pub delegators: Vec<Address>,
    /// Number of delegator slots scanned by the node.
    pub count: u32,
    /// Block selector echoed by the node.
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown"))]
    pub block: serde_json::Value,
}

/// `lyth_getDelegationCap` response.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "DelegationCapResponse.ts")
)]
pub struct DelegationCapResponse {
    /// Per-cluster cap in basis points. `u32::MAX` means disabled.
    #[serde(rename = "capBps")]
    pub cap_bps: u32,
    /// Height of the most recent milestone that changed the cap.
    #[serde(rename = "lastChangedAtHeight")]
    pub last_changed_at_height: u64,
    /// Block height sampled by the node.
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
}

/// `lyth_getTpmAttestation` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "TpmAttestationResponse.ts")
)]
pub struct TpmAttestationResponse {
    /// 32-byte peer id.
    #[serde(rename = "peerId")]
    pub peer_id: Hex,
    /// 32-byte digest over the canonical TPM quote bytes.
    #[serde(rename = "quoteDigest")]
    pub quote_digest: Hash,
    /// 32-byte EK identifier.
    #[serde(rename = "ekId")]
    pub ek_id: Hash,
    /// Block selector echoed by the node.
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown"))]
    pub block: serde_json::Value,
}

/// `lyth_getClusterEntity` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "ClusterEntityResponse.ts")
)]
pub struct ClusterEntityResponse {
    /// Queried cluster id.
    pub cluster: u32,
    /// Entity label, e.g. `"independent"` or `"mono-labs"`.
    pub entity: String,
    /// Raw entity enum discriminant.
    #[serde(rename = "entityCode")]
    pub entity_code: u8,
    /// Block selector echoed by the node.
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown"))]
    pub block: serde_json::Value,
}

/// `lyth_getEntityRatchet` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "EntityRatchetResponse.ts")
)]
pub struct EntityRatchetResponse {
    /// Active foundation-entity cluster count.
    pub active: u32,
    /// Published ratchet threshold. `u32::MAX` means unset.
    pub threshold: u32,
    /// Block selector echoed by the node.
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown"))]
    pub block: serde_json::Value,
}

/// `lyth_getEncryptionKey` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "EncryptionKeyResponse.ts")
)]
pub struct EncryptionKeyResponse {
    /// KEM algorithm tag.
    pub algo: String,
    /// Cluster encryption epoch.
    pub epoch: u64,
    /// ML-KEM-768 encapsulation key.
    #[serde(rename = "encapsulationKey")]
    pub encapsulation_key: Hex,
}

/// `lyth_syncStatus` DAG-sync driver snapshot.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "DagSyncStatus.ts"))]
pub struct DagSyncStatus {
    /// Driver state: `idle`, `probing`, `catching`, or `synced`.
    pub state: String,
    /// Local anchor frontier round.
    #[serde(rename = "localRound")]
    pub local_round: u64,
    /// Highest peer committed round observed.
    #[serde(rename = "peerMaxRound")]
    pub peer_max_round: u64,
    /// `peerMaxRound - localRound`, saturating at zero.
    pub lag: u64,
}

/// `lyth_listActivePrecompiles` entry.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "PrecompileDescriptor.ts")
)]
pub struct PrecompileDescriptor {
    /// 20-byte precompile address, `0x`-hex.
    pub address: Address,
    /// Stable identifier (e.g. `"agent"`, `"oracle"`, `"delegation"`).
    pub name: String,
    /// Whether milestone gates can toggle this precompile.
    pub gateable: bool,
    /// Whether the precompile is currently dispatchable.
    pub enabled: bool,
    /// Stable capability id from the milestone registry.
    #[serde(rename = "capabilityId")]
    pub capability_id: String,
    /// Height of the milestone that activated this capability, when any.
    #[serde(rename = "activationHeight")]
    pub activation_height: Option<u64>,
}

/// One entry in the `lyth_capabilities` keyed capability map.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "CapabilityDescriptor.ts")
)]
pub struct CapabilityDescriptor {
    /// 20-byte precompile address, `0x`-hex.
    pub address: Address,
    /// Stable capability id from the milestone registry.
    #[serde(rename = "capabilityId")]
    pub capability_id: String,
    /// Human-readable capability/precompile name.
    #[serde(rename = "capabilityName")]
    pub capability_name: String,
    /// Gate class: `gateable`, `non-gateable`, or `retired-rejecting`.
    pub kind: String,
    /// Whether the capability is currently dispatchable.
    pub active: bool,
    /// Height of the milestone that activated this capability, when any.
    #[serde(rename = "activationHeight")]
    pub activation_height: Option<u64>,
}

/// MRV forwarder deployment row for a native module surfaced by `lyth_capabilities`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "NativeModuleForwarderDescriptor.ts")
)]
pub struct NativeModuleForwarderDescriptor {
    /// Native module namespace this forwarder calls, for example `"market"`.
    pub module: String,
    /// Byte length of the encoded forwarder request.
    #[serde(rename = "requestBytes")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "requestBytes"))]
    pub request_bytes: u32,
    /// Typed MRV contract address hosting the forwarder.
    #[serde(rename = "contractAddress")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "contractAddress"))]
    pub contract_address: Address,
    /// MRV artifact profile used by the deployed forwarder.
    #[serde(rename = "artifactProfile")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "artifactProfile"))]
    pub artifact_profile: String,
    /// Deployment/readiness status reported by the node.
    pub status: String,
    /// Whether the deployment has been verified against the expected artifact.
    #[serde(rename = "deploymentVerified")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "deploymentVerified"))]
    pub deployment_verified: bool,
}

/// `lyth_capabilities` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "CapabilitiesResponse.ts")
)]
pub struct CapabilitiesResponse {
    /// Block height sampled by the node.
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    /// Address-keyed capability map.
    pub capabilities: BTreeMap<Address, CapabilityDescriptor>,
    /// Native module forwarder deployments keyed by native module name.
    #[serde(rename = "nativeModuleForwarders", default)]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "nativeModuleForwarders"))]
    pub native_module_forwarders: BTreeMap<String, Vec<NativeModuleForwarderDescriptor>>,
}

/// One signature row in `lyth_getLatestCheckpoint`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "CheckpointRecord.ts"))]
pub struct CheckpointRecord {
    /// Block height the checkpoint commits to.
    #[serde(rename = "blockHeight")]
    pub block_height: u64,
    /// State-root commitment at the checkpointed block.
    #[serde(rename = "stateRoot")]
    pub state_root: Hash,
    /// Hex-encoded ML-DSA-65 signer public key.
    #[serde(rename = "signerPubkeyHex")]
    pub signer_pubkey_hex: Hex,
    /// Hex-encoded ML-DSA-65 signature.
    #[serde(rename = "signatureHex")]
    pub signature_hex: Hex,
}

/// One row from `lyth_getClusterResignations`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "ClusterResignationRow.ts")
)]
pub struct ClusterResignationRow {
    /// `0x`-prefixed legacy 48-byte cluster-member reference. On a PQ
    /// roster the leading 32 bytes hold the BLAKE3 operator id and the
    /// remaining 16 bytes are zero pad; the width is the genesis/roster
    /// member-ref ABI, not a real public key.
    pub operator: Hex,
    /// `wire_pending`, `pending`, or `applied`.
    pub status: String,
    /// Submitted-at block height, absent for wire-pending rows.
    #[serde(rename = "submitted_at_height", alias = "submittedAtHeight", default)]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub submitted_at_height: Option<u64>,
    /// Effective-at block height, absent for wire-pending rows.
    #[serde(rename = "effective_at_height", alias = "effectiveAtHeight", default)]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub effective_at_height: Option<u64>,
    /// Operator-set resignation nonce.
    pub nonce: u64,
    /// Whether the expedited path was honored.
    pub expedited: bool,
}

/// `lyth_getClusterResignations` response.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "ClusterResignationsResponse.ts")
)]
pub struct ClusterResignationsResponse {
    /// Rows matching the requested filter.
    pub rows: Vec<ClusterResignationRow>,
}

/// Round-advancement certificate response used by the AUD-0074
/// certificate RPCs (`lyth_getRoundCertificate` /
/// `lyth_getLeaderCertificate` / `lyth_getDacCertificate`).
///
/// On the post-quantum chain the `signature` field is the ML-DSA-65
/// leader-seed digest — the BLAKE3 hash over the ML-DSA quorum
/// certificate that seeds the historical leader beacon. It is also the
/// value the VRF precompile (`0x1101`) reads as the historical
/// randomness for a finalized round.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "RoundCertificateResponse.ts")
)]
pub struct RoundCertificateResponse {
    /// Round at which the certificate sealed.
    pub round: u64,
    /// `0x`-prefixed leader-seed digest (ML-DSA-65 quorum-cert hash).
    /// The JSON wire field stays `signature` for compatibility.
    pub signature: Hex,
    /// Signer-set bitmap as `0x`-hex bytes.
    #[serde(rename = "signers_bitmap", alias = "signersBitmap")]
    pub signers_bitmap: Hex,
    /// Operator indices decoded from the signer bitmap.
    #[serde(rename = "signer_indices", alias = "signerIndices")]
    pub signer_indices: Vec<u16>,
    /// Number of signing operators.
    #[serde(rename = "signer_count", alias = "signerCount")]
    pub signer_count: u16,
}

/// Deprecated alias for [`RoundCertificateResponse`]; retained so existing
/// callers keep compiling. The JSON wire is identical.
#[deprecated(note = "use RoundCertificateResponse")]
pub type BlsCertificateResponse = RoundCertificateResponse;

/// Log row included in `lyth_decodeTx`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "DecodeTxLog.ts"))]
pub struct DecodeTxLog {
    /// Contract address that emitted the log.
    pub address: Address,
    /// Indexed topics.
    pub topics: Vec<Hash>,
    /// ABI-encoded log data.
    pub data: Hex,
}

/// PQ-finality attestation included in `lyth_decodeTx` when available.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "DecodeTxPqAttestation.ts")
)]
pub struct DecodeTxPqAttestation {
    /// Checkpoint height that attests the transaction.
    #[serde(rename = "checkpointHeight")]
    pub checkpoint_height: u64,
    /// Checkpointed state root.
    #[serde(rename = "stateRoot")]
    pub state_root: Hash,
    /// Signer id that produced the attestation.
    #[serde(rename = "signerId")]
    pub signer_id: String,
    /// Scheme-prefixed signer signature.
    pub signature: String,
}

/// Transaction extension descriptor included in `lyth_decodeTx`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "DecodeTxExtension.ts")
)]
pub struct DecodeTxExtension {
    /// Extension kind byte as a number.
    pub kind: u8,
    /// Extension kind byte as `0x`-hex.
    #[serde(rename = "kindHex")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "kindHex"))]
    pub kind_hex: Hex,
    /// Extension body bytes as `0x`-hex.
    #[serde(rename = "bodyHex")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "bodyHex"))]
    pub body_hex: Hex,
    /// Alias of `bodyHex` emitted by `mono-core` for explorer consumers.
    pub body: Hex,
}

#[derive(Debug, Deserialize)]
struct DecodeTxResponseWire {
    #[serde(rename = "txHash")]
    tx_hash: Hash,
    #[serde(rename = "blockHash")]
    block_hash: Hash,
    #[serde(rename = "blockNumber")]
    block_number: u64,
    #[serde(rename = "txIndex")]
    tx_index: u32,
    from: Address,
    to: Option<Address>,
    value: Quantity,
    nonce: u64,
    #[serde(rename = "executionUnitLimit")]
    execution_unit_limit: u64,
    #[serde(rename = "maxExecutionFeeLythoshi")]
    max_execution_fee_lythoshi: String,
    #[serde(rename = "priorityTipLythoshi")]
    priority_tip_lythoshi: String,
    #[serde(rename = "executionUnitsUsed")]
    execution_units_used: Option<u64>,
    fee: NativeReceiptFee,
    #[serde(rename = "decodedCalldata")]
    decoded_calldata: Option<serde_json::Value>,
    memo: Option<String>,
    #[serde(default)]
    extensions: Option<Vec<DecodeTxExtension>>,
    #[serde(rename = "txExtensions", default)]
    tx_extensions: Option<Vec<DecodeTxExtension>>,
    round: Option<u64>,
    #[serde(rename = "clusterId")]
    cluster_id: Option<u32>,
    #[serde(rename = "roundAttestation")]
    round_attestation: Option<serde_json::Value>,
    #[serde(rename = "pqAttestation")]
    pq_attestation: Option<DecodeTxPqAttestation>,
    #[serde(rename = "finalityProof")]
    finality_proof: Option<serde_json::Value>,
    logs: Vec<DecodeTxLog>,
    status: String,
    #[serde(rename = "errorCode")]
    error_code: Option<String>,
}

impl From<DecodeTxResponseWire> for DecodeTxResponse {
    fn from(wire: DecodeTxResponseWire) -> Self {
        Self {
            tx_hash: wire.tx_hash,
            block_hash: wire.block_hash,
            block_number: wire.block_number,
            tx_index: wire.tx_index,
            from: wire.from,
            to: wire.to,
            value: wire.value,
            nonce: wire.nonce,
            execution_unit_limit: wire.execution_unit_limit,
            max_execution_fee_lythoshi: wire.max_execution_fee_lythoshi,
            priority_tip_lythoshi: wire.priority_tip_lythoshi,
            execution_units_used: wire.execution_units_used,
            fee: wire.fee,
            decoded_calldata: wire.decoded_calldata,
            memo: wire.memo,
            extensions: wire.extensions.or(wire.tx_extensions).unwrap_or_default(),
            round: wire.round,
            cluster_id: wire.cluster_id,
            round_attestation: wire.round_attestation,
            pq_attestation: wire.pq_attestation,
            finality_proof: wire.finality_proof,
            logs: wire.logs,
            status: wire.status,
            error_code: wire.error_code,
        }
    }
}

/// `lyth_decodeTx` response.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "DecodeTxResponse.ts"))]
pub struct DecodeTxResponse {
    /// Transaction hash.
    #[serde(rename = "txHash")]
    pub tx_hash: Hash,
    /// Containing block hash.
    #[serde(rename = "blockHash")]
    pub block_hash: Hash,
    /// Containing block number.
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    /// Transaction index within the block.
    #[serde(rename = "txIndex")]
    pub tx_index: u32,
    /// Sender address.
    pub from: Address,
    /// Recipient address, or `null` for contract creation.
    pub to: Option<Address>,
    /// Transferred native value as a hex lythoshi quantity.
    pub value: Quantity,
    /// Sender nonce.
    pub nonce: u64,
    /// Execution-unit limit.
    #[serde(rename = "executionUnitLimit")]
    pub execution_unit_limit: u64,
    /// Max execution fee in lythoshi.
    #[serde(rename = "maxExecutionFeeLythoshi")]
    pub max_execution_fee_lythoshi: String,
    /// Priority tip in lythoshi.
    #[serde(rename = "priorityTipLythoshi")]
    pub priority_tip_lythoshi: String,
    /// Execution units used when the transaction is confirmed.
    #[serde(rename = "executionUnitsUsed")]
    pub execution_units_used: Option<u64>,
    /// Structured native fee summary.
    pub fee: NativeReceiptFee,
    /// Opaque decoded calldata descriptor.
    #[serde(rename = "decodedCalldata")]
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown | null"))]
    pub decoded_calldata: Option<serde_json::Value>,
    /// Optional memo extracted from the transaction.
    pub memo: Option<String>,
    /// Signed transaction extensions carried by the decoded transaction.
    pub extensions: Vec<DecodeTxExtension>,
    /// DAG round associated with finality, when available.
    pub round: Option<u64>,
    /// Cluster id associated with finality, when available.
    #[serde(rename = "clusterId")]
    pub cluster_id: Option<u32>,
    /// Opaque round attestation payload (the consensus round certificate;
    /// renamed from the legacy `blsAttestation` to match the node, which emits
    /// `roundAttestation` after the BLS -> RoundCert consensus rename).
    #[serde(rename = "roundAttestation")]
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown | null"))]
    pub round_attestation: Option<serde_json::Value>,
    /// PQ-finality attestation payload.
    #[serde(rename = "pqAttestation")]
    pub pq_attestation: Option<DecodeTxPqAttestation>,
    /// Opaque finality proof payload.
    #[serde(rename = "finalityProof")]
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown | null"))]
    pub finality_proof: Option<serde_json::Value>,
    /// Logs emitted by the transaction.
    pub logs: Vec<DecodeTxLog>,
    /// `success`, `reverted`, `unknown`, or a forward-compatible string.
    pub status: String,
    /// Node-supplied execution error code when available.
    #[serde(rename = "errorCode")]
    pub error_code: Option<String>,
}

impl<'de> Deserialize<'de> for DecodeTxResponse {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        DecodeTxResponseWire::deserialize(deserializer).map(Into::into)
    }
}

/// Requested block range in `lyth_gapRecords`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "GapRange.ts"))]
pub struct GapRange {
    /// First block in the requested range.
    #[serde(rename = "fromBlock")]
    pub from_block: u64,
    /// Last block in the requested range.
    #[serde(rename = "toBlock")]
    pub to_block: u64,
}

/// One retained ingestion/indexing gap.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "GapRecord.ts"))]
pub struct GapRecord {
    /// First block in the gap.
    #[serde(rename = "startBlock")]
    pub start_block: u64,
    /// Last block in the gap.
    #[serde(rename = "endBlock")]
    pub end_block: u64,
    /// Number of blocks in the gap.
    #[serde(rename = "blockCount")]
    pub block_count: u64,
    /// Start timestamp in UNIX seconds.
    #[serde(rename = "startTimestamp")]
    pub start_timestamp: u64,
    /// End timestamp in UNIX seconds.
    #[serde(rename = "endTimestamp")]
    pub end_timestamp: u64,
    /// Duration in seconds.
    #[serde(rename = "durationSeconds")]
    pub duration_seconds: u64,
    /// Node-supplied reason label.
    pub reason: String,
}

/// `lyth_gapRecords` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "GapRecordsResponse.ts")
)]
pub struct GapRecordsResponse {
    /// Response schema version.
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    /// Requested range.
    pub range: GapRange,
    /// Gap rows in the requested range.
    #[serde(rename = "gapRecords")]
    pub gap_records: Vec<GapRecord>,
}

/// Parent vertex row returned by `lyth_dagParents`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "DagParent.ts"))]
pub struct DagParent {
    /// Parent vertex hash.
    #[serde(rename = "vertexHash")]
    pub vertex_hash: Hash,
    /// Parent round.
    pub round: u64,
}

/// `lyth_dagParents` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "DagParentsResponse.ts")
)]
pub struct DagParentsResponse {
    /// Response schema version.
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    /// Queried round.
    pub round: u64,
    /// Parent rows, or `null` when the round has no retained DAG data.
    pub parents: Option<Vec<DagParent>>,
}

/// Public-safe aggregate returned by `lyth_peerSummary`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "PeerSummaryAggregate.ts")
)]
pub struct PeerSummaryAggregate {
    #[serde(rename = "peerCount")]
    pub peer_count: u64,
    #[serde(rename = "inboundCount")]
    pub inbound_count: Option<u64>,
    #[serde(rename = "outboundCount")]
    pub outbound_count: Option<u64>,
    #[serde(rename = "latencyBands")]
    pub latency_bands: Option<LatencyBands>,
    #[serde(rename = "versionDistribution")]
    pub version_distribution: std::collections::BTreeMap<String, u64>,
    #[serde(rename = "healthSummary")]
    pub health_summary: HealthSummary,
    #[serde(rename = "asOfBlock")]
    pub as_of_block: u64,
}

/// Ping-RTT histogram bands in `lyth_peerSummary`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "LatencyBands.ts"))]
pub struct LatencyBands {
    #[serde(rename = "lt_50ms")]
    pub lt_50ms: u64,
    #[serde(rename = "lt_200ms")]
    pub lt_200ms: u64,
    #[serde(rename = "lt_1s")]
    pub lt_1s: u64,
    #[serde(rename = "ge_1s")]
    pub ge_1s: u64,
}

/// Aggregate gossip-mesh health bands in `lyth_peerSummary`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "HealthSummary.ts"))]
pub struct HealthSummary {
    pub synced: u64,
    pub lagging: u64,
    pub stale: u64,
}

/// One vertex authorship row in `lyth_verticesAtRound`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "VertexAtRound.ts"))]
pub struct VertexAtRound {
    #[serde(rename = "vertexHash")]
    pub vertex_hash: Hash,
    pub author: u64,
}

/// `lyth_verticesAtRound` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "VerticesAtRoundResponse.ts")
)]
pub struct VerticesAtRoundResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub round: u64,
    pub vertices: Option<Vec<VertexAtRound>>,
}

/// Per-surface status row in `lyth_operatorCapabilities`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "OperatorSurfaceCapability.ts")
)]
pub struct OperatorSurfaceCapability {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub tracking: Option<String>,
}

/// `lyth_operatorCapabilities` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "OperatorCapabilitiesResponse.ts")
)]
pub struct OperatorCapabilitiesResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub surfaces: std::collections::BTreeMap<String, OperatorSurfaceCapability>,
}

/// One signed upgrade plan in `lyth_upgradeStatus`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "LythUpgradePlanStatus.ts")
)]
pub struct LythUpgradePlanStatus {
    #[serde(rename = "upgradeId")]
    pub upgrade_id: String,
    #[serde(rename = "activationHeight")]
    pub activation_height: u64,
    #[serde(rename = "activationRound")]
    pub activation_round: Option<u64>,
    #[serde(rename = "requiredBinaryVersion")]
    pub required_binary_version: String,
    #[serde(rename = "expectedBinaryDigest")]
    pub expected_binary_digest: String,
    #[serde(rename = "p2pProtocolVersion")]
    pub p2p_protocol_version: u32,
    #[serde(rename = "requiredFeatures")]
    pub required_features: Vec<String>,
    #[serde(rename = "milestoneFileDigest")]
    pub milestone_file_digest: Option<String>,
    #[serde(rename = "stateMigrationId")]
    pub state_migration_id: Option<String>,
    #[serde(rename = "stateMigrationHash")]
    pub state_migration_hash: Option<String>,
    #[serde(rename = "expectedPreStateRoot")]
    pub expected_pre_state_root: Option<Hash>,
    #[serde(rename = "expectedPostStateRoot")]
    pub expected_post_state_root: Option<Hash>,
}

/// `lyth_upgradeStatus` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "LythUpgradeStatusResponse.ts")
)]
pub struct LythUpgradeStatusResponse {
    #[serde(rename = "chainId")]
    pub chain_id: u64,
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    pub configured: bool,
    #[serde(rename = "planCount")]
    pub plan_count: usize,
    pub state: String,
    pub active: Option<LythUpgradePlanStatus>,
    #[serde(rename = "pendingCount")]
    pub pending_count: usize,
    pub pending: Vec<LythUpgradePlanStatus>,
}

/// Discriminated `lyth_txStatus` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "TxStatusResponse.ts"))]
pub enum TxStatusResponse {
    Found {
        #[serde(rename = "txHash")]
        tx_hash: Hash,
        #[serde(rename = "blockHash")]
        block_hash: Hash,
        #[serde(rename = "blockNumber")]
        block_number: u64,
        #[serde(rename = "txIndex")]
        tx_index: u32,
    },
    NotFound {
        #[serde(rename = "txHash")]
        tx_hash: Hash,
        #[serde(rename = "latestHeight")]
        latest_height: u64,
        #[serde(rename = "indexerEnabled")]
        indexer_enabled: bool,
        #[serde(rename = "providerKind")]
        provider_kind: String,
    },
}

/// One retained metrics sample.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MetricsRangeSample.ts")
)]
pub struct MetricsRangeSample {
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    pub value: u64,
}

/// One selector row in `lyth_metricsRange`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MetricsRangeSeries.ts")
)]
pub struct MetricsRangeSeries {
    pub selector: String,
    pub status: String,
    pub unit: Option<String>,
    pub samples: Option<Vec<MetricsRangeSample>>,
}

/// `lyth_metricsRange` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MetricsRangeResponse.ts")
)]
pub struct MetricsRangeResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub range: Option<[u64; 2]>,
    pub tracking: String,
    pub series: Vec<MetricsRangeSeries>,
}

/// One holder row in `lyth_richList`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "RichListHolder.ts"))]
pub struct RichListHolder {
    /// One-based holder rank.
    pub rank: u32,
    /// Holder address.
    pub address: Address,
    /// Balance as a decimal string.
    pub balance: String,
    /// Block height the balance was last observed at.
    #[serde(rename = "updatedAtBlock")]
    pub updated_at_block: u64,
}

/// `lyth_richList` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "RichListResponse.ts"))]
pub struct RichListResponse {
    /// Response schema version.
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    /// Queried token id.
    #[serde(rename = "tokenId")]
    pub token_id: Hash,
    /// Result limit applied by the node.
    pub limit: u32,
    /// Holder rows.
    pub holders: Vec<RichListHolder>,
}

/// Request parameters for `lyth_mrcHolders` and `/api/v1/mrc/.../holders`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrcHoldersRequest.ts")
)]
#[serde(rename_all = "camelCase")]
pub struct MrcHoldersRequest {
    /// MRC standard, for example `mrc20`, `mrc721`, `mrc1155`, or `mrc4626`.
    pub standard: String,
    /// MRC asset id, collection id, or MRC-4626 vault id.
    pub asset_id: Hash,
    /// Token id inside the MRC holder namespace; `null`/omitted for MRC-4626 vault scope.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional = nullable))]
    pub token_id: Option<Hash>,
    /// Optional result limit.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub limit: Option<u32>,
}

/// `lyth_mrcHolders` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrcHoldersResponse.ts")
)]
pub struct MrcHoldersResponse {
    /// Response schema version.
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    /// Queried MRC standard.
    pub standard: String,
    /// Queried MRC asset or collection id.
    #[serde(rename = "assetId")]
    pub asset_id: Hash,
    /// Queried token id, or `null` for MRC-4626 vault scope.
    #[serde(rename = "tokenId")]
    pub token_id: Option<Hash>,
    /// Result limit applied by the node.
    pub limit: u32,
    /// Holder rows. The row shape is shared with `lyth_richList`.
    pub holders: Vec<RichListHolder>,
}

/// Market metadata returned inside `lyth_clobMarket`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "ClobMarketRecord.ts"))]
pub struct ClobMarketRecord {
    /// Base token id.
    #[serde(rename = "baseToken")]
    pub base_token: Hash,
    /// Quote token id.
    #[serde(rename = "quoteToken")]
    pub quote_token: Hash,
    /// Best bid price as a decimal string.
    #[serde(rename = "bestBidPrice")]
    pub best_bid_price: String,
    /// Best ask price as a decimal string.
    #[serde(rename = "bestAskPrice")]
    pub best_ask_price: String,
    /// Last trade price as a decimal string.
    #[serde(rename = "lastTradePrice")]
    pub last_trade_price: String,
    /// Total traded base volume as a decimal string.
    #[serde(rename = "totalVolumeBase")]
    pub total_volume_base: String,
    /// Taker fee in basis points.
    #[serde(rename = "takerFeeBps")]
    pub taker_fee_bps: u32,
    /// Tick size as a decimal string.
    #[serde(rename = "tickSize")]
    pub tick_size: String,
    /// Lot size as a decimal string.
    #[serde(rename = "lotSize")]
    pub lot_size: String,
    /// Minimum notional as a decimal string.
    #[serde(rename = "minNotional")]
    pub min_notional: String,
    /// Whether the market is registered on-chain.
    #[serde(rename = "isRegistered")]
    pub is_registered: bool,
    /// Registration block.
    #[serde(rename = "registeredAtBlock")]
    pub registered_at_block: u64,
}

/// `lyth_clobMarket` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "ClobMarketResponse.ts")
)]
pub struct ClobMarketResponse {
    /// Response schema version.
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    /// Queried market id.
    #[serde(rename = "marketId")]
    pub market_id: Hash,
    /// Market metadata, or `null` when the market is not found.
    pub market: Option<ClobMarketRecord>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TxFeedReceipt {
    pub status: u8,
    #[serde(rename = "executionUnitsUsed")]
    pub execution_units_used: u64,
    #[serde(rename = "logsCount")]
    pub logs_count: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TxFeedTransaction {
    #[serde(rename = "txHash")]
    pub tx_hash: Hash,
    #[serde(rename = "blockHash")]
    pub block_hash: Hash,
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    #[serde(rename = "blockTimestamp")]
    pub block_timestamp: Option<u64>,
    #[serde(rename = "txIndex")]
    pub tx_index: u32,
    pub from: Address,
    pub to: Option<Address>,
    pub nonce: u64,
    /// Native value in lythoshi. The tx-feed wire key is still `value`.
    pub value: String,
    #[serde(rename = "executionUnitLimit")]
    pub execution_unit_limit: u64,
    #[serde(rename = "maxExecutionFeeLythoshi")]
    pub max_execution_fee_lythoshi: String,
    #[serde(rename = "priorityTipLythoshi")]
    pub priority_tip_lythoshi: String,
    pub fee: NativeReceiptFee,
    pub input: Hex,
    pub receipt: Option<TxFeedReceipt>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TxFeedResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    #[serde(rename = "latestHeight")]
    pub latest_height: u64,
    pub limit: u32,
    #[serde(rename = "nextCursor")]
    pub next_cursor: Option<String>,
    pub transactions: Vec<TxFeedTransaction>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddressProfileAccount {
    #[serde(rename = "nativeBalance")]
    pub native_balance: String,
    pub nonce: u64,
    #[serde(rename = "codeHash")]
    pub code_hash: Hash,
    #[serde(rename = "isContract")]
    pub is_contract: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddressProfileLabel {
    pub category: String,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    #[serde(rename = "updatedAtBlock")]
    pub updated_at_block: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddressProfileActivity {
    pub kind: String,
    pub retention: Option<serde_json::Value>,
    pub latest: Option<serde_json::Value>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddressProfileTokenBalance {
    #[serde(rename = "tokenId")]
    pub token_id: Hash,
    pub balance: String,
    #[serde(rename = "updatedAtBlock")]
    pub updated_at_block: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mrc: Option<TokenBalanceMrcIdentity>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddressProfileResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub address: Address,
    pub account: AddressProfileAccount,
    pub label: Option<AddressProfileLabel>,
    pub activity: AddressProfileActivity,
    #[serde(rename = "tokenBalances")]
    pub token_balances: Vec<AddressProfileTokenBalance>,
    #[serde(
        rename = "bridgeRouteDisclosures",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub bridge_route_disclosures: Option<Vec<BridgeRouteDisclosure>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddressFlowTotals {
    pub inbound: String,
    pub outbound: String,
    #[serde(rename = "swapVolume")]
    pub swap_volume: String,
    pub stake: String,
    pub unstake: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddressFlowCounterparty {
    pub address: Address,
    #[serde(rename = "eventCount")]
    pub event_count: u64,
    pub inbound: String,
    pub outbound: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddressFlowResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub address: Address,
    #[serde(rename = "sampleSize")]
    pub sample_size: usize,
    pub limit: u32,
    pub totals: AddressFlowTotals,
    #[serde(rename = "topCounterparties")]
    pub top_counterparties: Vec<AddressFlowCounterparty>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SearchHit {
    #[serde(rename = "type")]
    pub kind: String,
    pub id: String,
    pub route: String,
    pub label: String,
    pub score: u32,
    pub meta: Option<serde_json::Value>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SearchResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub query: String,
    pub hits: Vec<SearchHit>,
    #[serde(rename = "nextCursor")]
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChainStatsResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    #[serde(rename = "chainId")]
    pub chain_id: u64,
    #[serde(rename = "genesisHash")]
    pub genesis_hash: Option<Hash>,
    #[serde(rename = "latestHeight")]
    pub latest_height: u64,
    #[serde(rename = "latestBlockHash")]
    pub latest_block_hash: Option<Hash>,
    #[serde(rename = "latestTimestamp")]
    pub latest_timestamp: Option<u64>,
    #[serde(rename = "peerCount")]
    pub peer_count: u64,
    pub mempool: serde_json::Value,
    pub indexer: Option<serde_json::Value>,
    pub clusters: serde_json::Value,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClobMarketSummary {
    #[serde(rename = "marketId")]
    pub market_id: Hash,
    #[serde(rename = "tradeCount")]
    pub trade_count: u64,
    #[serde(rename = "totalVolumeBase")]
    pub total_volume_base: String,
    #[serde(rename = "lastPrice")]
    pub last_price: String,
    #[serde(rename = "lastBlockHeight")]
    pub last_block_height: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClobMarketsResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub limit: u32,
    pub markets: Vec<ClobMarketSummary>,
    pub source: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClobTrade {
    #[serde(rename = "blockHeight")]
    pub block_height: u64,
    #[serde(rename = "txIndex")]
    pub tx_index: u32,
    #[serde(rename = "logIndex")]
    pub log_index: u32,
    #[serde(rename = "marketId")]
    pub market_id: Hash,
    #[serde(rename = "takerOrder")]
    pub taker_order: Hash,
    #[serde(rename = "makerOrder")]
    pub maker_order: Hash,
    pub price: String,
    pub amount: String,
    pub taker: Address,
    pub maker: Address,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClobTradesResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    #[serde(rename = "marketId")]
    pub market_id: Hash,
    pub limit: u32,
    #[serde(rename = "nextCursor")]
    pub next_cursor: Option<String>,
    pub trades: Vec<ClobTrade>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClobOhlcCandle {
    #[serde(rename = "startBlock")]
    pub start_block: u64,
    #[serde(rename = "endBlock")]
    pub end_block: u64,
    pub open: String,
    pub high: String,
    pub low: String,
    pub close: String,
    #[serde(rename = "volumeBase")]
    pub volume_base: String,
    #[serde(rename = "tradeCount")]
    pub trade_count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClobOhlcResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    #[serde(rename = "marketId")]
    pub market_id: Hash,
    #[serde(rename = "fromBlock")]
    pub from_block: u64,
    #[serde(rename = "toBlock")]
    pub to_block: u64,
    #[serde(rename = "bucketBlocks")]
    pub bucket_blocks: u64,
    pub candles: Vec<ClobOhlcCandle>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClobOrderBookLevel {
    pub price: String,
    pub size: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClobOrderBookResponse {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    #[serde(rename = "marketId")]
    pub market_id: Hash,
    pub levels: Option<u32>,
    pub bids: Vec<ClobOrderBookLevel>,
    pub asks: Vec<ClobOrderBookLevel>,
}

/// Intent accepted by `mesh_buildUnsignedTx`.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MeshTxIntent.ts"))]
pub struct MeshTxIntent {
    /// Sender nonce, hex or decimal string.
    pub nonce: Quantity,
    /// EIP-1559 max fee per gas, hex or decimal string.
    pub max_fee_per_gas: Quantity,
    /// EIP-1559 max priority fee per gas, hex or decimal string.
    pub max_priority_fee_per_gas: Quantity,
    /// Gas limit, hex or decimal string.
    pub gas_limit: Quantity,
    /// Recipient address. `None` means contract creation.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub to: Option<Address>,
    /// Value, hex or decimal string.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub value: Option<Quantity>,
    /// Input/calldata hex.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub input: Option<Hex>,
    /// Optional chain id override, hex or decimal string.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub chain_id: Option<Quantity>,
}

/// `mesh_buildUnsignedTx` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MeshUnsignedTxResponse.ts")
)]
pub struct MeshUnsignedTxResponse {
    /// `0x`-hex bincode unsigned transaction envelope.
    pub unsigned_tx: Hex,
    /// `0x`-hex signing hash for the wallet.
    pub sighash: Hash,
}

/// `mesh_combineTx` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MeshSignedTxResponse.ts")
)]
pub struct MeshSignedTxResponse {
    /// `0x`-hex bincode signed transaction envelope.
    pub signed_tx: Hex,
}

/// `mesh_decodeTx` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MeshDecodedTx.ts"))]
pub struct MeshDecodedTx {
    /// Chain id as a hex quantity.
    pub chain_id: Quantity,
    /// Nonce as a hex quantity.
    pub nonce: Quantity,
    /// Max priority fee per gas as a decimal string.
    pub max_priority_fee_per_gas: String,
    /// Max fee per gas as a decimal string.
    pub max_fee_per_gas: String,
    /// Gas limit as a JSON number.
    pub gas_limit: u64,
    /// Recipient address, or null for contract creation.
    pub to: Option<Address>,
    /// Value as a decimal string.
    pub value: String,
    /// Input/calldata hex.
    pub input: Hex,
    /// Present when decoding an unsigned transaction.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub sighash: Option<Hash>,
    /// Present when decoding a signed transaction.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub from: Option<Address>,
    /// Present when decoding a signed transaction.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub tx_hash: Option<Hash>,
}

/// `debug_p2pPeers` entry.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "PeerSummary.ts"))]
pub struct PeerSummary {
    /// libp2p peer id (base58).
    #[serde(rename = "peerId")]
    pub peer_id: String,
    /// Declared role.
    pub role: String,
    /// Listen addresses.
    #[serde(rename = "listenAddrs")]
    pub listen_addrs: Vec<String>,
    /// `agent_version` from libp2p identify.
    #[serde(rename = "agentVersion")]
    pub agent_version: String,
    /// Reputation score.
    pub score: f64,
    /// Whether the peer is in any gossip mesh.
    #[serde(rename = "inMesh")]
    pub in_mesh: bool,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bridge::{
        assess_bridge_route, BridgeAdminControl, BridgeCircuitBreakerState,
        BridgeVerifierDisclosure,
    };
    use blst::min_pk::SecretKey as BlsSecretKey;
    use fips204::ml_dsa_65;
    use fips204::traits::{KeyGen, SerDes, Signer};

    const VALID_ARCHIVE_SIGNATURE: &str =
        "mono.snapshot.sig.v1:0x1212121212121212121212121212121212121212:0xabab";

    fn test_bls_key(seed_byte: u8) -> BlsSecretKey {
        BlsSecretKey::key_gen(&[seed_byte; 32], &[]).unwrap()
    }

    fn test_finality_bitmap_hex(indices: &[u16], committee_size: u16) -> String {
        let max_index = indices.iter().copied().max().unwrap_or(0);
        let bit_capacity = committee_size.max(max_index.saturating_add(1));
        let mut bitmap = vec![0_u8; usize::from(bit_capacity).div_ceil(8)];
        for index in indices {
            let index = usize::from(*index);
            bitmap[index / 8] |= 1_u8 << (index % 8);
        }
        hex_encode_0x(&bitmap)
    }

    fn test_finality_evidence(
        round: u64,
        signature: [u8; 96],
        bitmap_indices: &[u16],
        signer_indices: Vec<u16>,
        signer_count: u16,
        committee_size: u16,
    ) -> NoEvmReceiptFinalityEvidence {
        let certificate = test_finality_certificate(
            round,
            signature,
            bitmap_indices,
            signer_indices,
            signer_count,
            committee_size,
        );
        NoEvmReceiptFinalityEvidence {
            schema: NO_EVM_RECEIPT_FINALITY_EVIDENCE_SCHEMA.to_owned(),
            source: NO_EVM_RECEIPT_FINALITY_EVIDENCE_SOURCE.to_owned(),
            round,
            certificate,
            block_reference: None,
            leader_certificate: None,
            dac_certificate: None,
        }
    }

    fn test_finality_certificate(
        round: u64,
        signature: [u8; 96],
        bitmap_indices: &[u16],
        signer_indices: Vec<u16>,
        signer_count: u16,
        committee_size: u16,
    ) -> NoEvmReceiptFinalityCertificate {
        NoEvmReceiptFinalityCertificate {
            round,
            signature: hex_encode_0x(&signature),
            signers_bitmap: test_finality_bitmap_hex(bitmap_indices, committee_size),
            signer_indices,
            signer_count,
        }
    }

    fn bridge_route(route_id: &str) -> BridgeRouteDisclosure {
        BridgeRouteDisclosure {
            route_id: route_id.to_owned(),
            bridge: "Chainlink CCIP".to_owned(),
            protocol: Some(crate::bridge::V1_BRIDGE_ALLOWED_PROTOCOL.to_owned()),
            asset: "USDC".to_owned(),
            fee_token: "LINK".to_owned(),
            source_chain: "Ethereum".to_owned(),
            destination_chain: "Mono".to_owned(),
            verifier: BridgeVerifierDisclosure {
                model: "CCIP DON".to_owned(),
                participant_count: 7,
                threshold: 5,
            },
            drain_cap_atomic: "100000000".to_owned(),
            finality_blocks: 12,
            cooldown_seconds: 3_600,
            admin_control: BridgeAdminControl::ConsensusOnly,
            circuit_breaker: BridgeCircuitBreakerState::Armed,
            insurance_atomic: "500000000".to_owned(),
            last_incident_date: None,
        }
    }

    #[test]
    fn call_request_uses_v41_rust_fields_with_legacy_wire_keys() {
        let request = CallRequest {
            from: Some("0x1111111111111111111111111111111111111111".to_owned()),
            to: Some("0x2222222222222222222222222222222222222222".to_owned()),
            execution_unit_limit: Some("0x5208".to_owned()),
            fee_per_execution_unit: Some("0x3b9aca00".to_owned()),
            value_lythoshi: Some("0xa".to_owned()),
            data: Some("0x".to_owned()),
        };

        let wire = serde_json::to_value(&request).unwrap();
        assert_eq!(wire["gas"], "0x5208");
        assert_eq!(wire["gasPrice"], "0x3b9aca00");
        assert_eq!(wire["value"], "0xa");
        assert!(wire.get("executionUnitLimit").is_none());
        assert!(wire.get("feePerExecutionUnit").is_none());
        assert!(wire.get("valueLythoshi").is_none());

        let native_names: CallRequest = serde_json::from_value(serde_json::json!({
            "executionUnitLimit": "0x2a",
            "feePerExecutionUnit": "0x7",
            "valueLythoshi": "0x9"
        }))
        .unwrap();
        assert_eq!(native_names.execution_unit_limit.as_deref(), Some("0x2a"));
        assert_eq!(native_names.fee_per_execution_unit.as_deref(), Some("0x7"));
        assert_eq!(native_names.value_lythoshi.as_deref(), Some("0x9"));

        let legacy_wire: CallRequest = serde_json::from_value(serde_json::json!({
            "gas": "0x5208",
            "gasPrice": "0x3b9aca00",
            "value": "0xa"
        }))
        .unwrap();
        assert_eq!(legacy_wire.execution_unit_limit.as_deref(), Some("0x5208"));
        assert_eq!(
            legacy_wire.fee_per_execution_unit.as_deref(),
            Some("0x3b9aca00")
        );
        assert_eq!(legacy_wire.value_lythoshi.as_deref(), Some("0xa"));
    }

    #[test]
    fn capabilities_response_decodes_native_module_forwarders_and_defaults_missing() {
        let response: CapabilitiesResponse = serde_json::from_value(serde_json::json!({
            "blockNumber": 256,
            "capabilities": {},
            "nativeModuleForwarders": {
                "market": [
                    {
                        "module": "market",
                        "requestBytes": 132,
                        "contractAddress": "monoc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqxk4v02",
                        "artifactProfile": "mono-rv32im-v1",
                        "status": "available",
                        "deploymentVerified": true
                    }
                ]
            }
        }))
        .unwrap();

        let market = response
            .native_module_forwarders
            .get("market")
            .expect("market forwarders");
        assert_eq!(market.len(), 1);
        assert_eq!(market[0].module, "market");
        assert_eq!(market[0].request_bytes, 132);
        assert_eq!(
            market[0].contract_address,
            "monoc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqxk4v02"
        );
        assert_eq!(market[0].artifact_profile, "mono-rv32im-v1");
        assert_eq!(market[0].status, "available");
        assert!(market[0].deployment_verified);

        let legacy: CapabilitiesResponse = serde_json::from_value(serde_json::json!({
            "blockNumber": 257,
            "capabilities": {}
        }))
        .unwrap();
        assert!(legacy.native_module_forwarders.is_empty());
    }

    #[test]
    fn token_balance_record_decodes_optional_mrc_identity() {
        let token_id = format!("0x{}", "aa".repeat(32));
        let asset_id = format!("0x{}", "bb".repeat(32));
        let nft_token_id = format!("0x{}", "cc".repeat(32));

        let with_mrc: TokenBalanceRecord = serde_json::from_value(serde_json::json!({
            "tokenId": token_id,
            "balance": "1000",
            "updatedAtBlock": 88,
            "mrc": {
                "standard": "mrc1155",
                "assetId": asset_id,
                "tokenId": nft_token_id
            }
        }))
        .unwrap();

        let mrc = with_mrc.mrc.as_ref().expect("mrc identity");
        assert_eq!(mrc.standard, "mrc1155");
        assert_eq!(mrc.asset_id, format!("0x{}", "bb".repeat(32)));
        assert_eq!(
            mrc.token_id.as_ref().unwrap(),
            &format!("0x{}", "cc".repeat(32))
        );

        let mrc20: TokenBalanceRecord = serde_json::from_value(serde_json::json!({
            "tokenId": format!("0x{}", "dd".repeat(32)),
            "balance": "55",
            "updatedAtBlock": 89,
            "mrc": {
                "standard": "mrc20",
                "assetId": format!("0x{}", "ee".repeat(32)),
                "tokenId": null
            }
        }))
        .unwrap();
        assert_eq!(mrc20.mrc.unwrap().token_id, None);

        let vault_id = format!("0x{}", "ff".repeat(32));
        let mrc4626: TokenBalanceRecord = serde_json::from_value(serde_json::json!({
            "tokenId": vault_id,
            "balance": "700",
            "updatedAtBlock": 92,
            "mrc": {
                "standard": "mrc4626",
                "assetId": vault_id,
                "tokenId": null
            }
        }))
        .unwrap();
        let mrc = mrc4626.mrc.as_ref().expect("mrc4626 identity");
        assert_eq!(mrc4626.token_id, vault_id);
        assert_eq!(mrc.standard, "mrc4626");
        assert_eq!(mrc.asset_id, vault_id);
        assert_eq!(mrc.token_id, None);
        let mrc4626_wire = serde_json::to_value(&mrc4626).unwrap();
        assert_eq!(mrc4626_wire["mrc"]["tokenId"], serde_json::Value::Null);

        let absent_mrc: TokenBalanceRecord = serde_json::from_value(serde_json::json!({
            "tokenId": format!("0x{}", "11".repeat(32)),
            "balance": "0",
            "updatedAtBlock": 90
        }))
        .unwrap();
        assert_eq!(absent_mrc.mrc, None);

        let null_mrc: TokenBalanceRecord = serde_json::from_value(serde_json::json!({
            "tokenId": format!("0x{}", "22".repeat(32)),
            "balance": "0",
            "updatedAtBlock": 91,
            "mrc": null
        }))
        .unwrap();
        assert_eq!(null_mrc.mrc, None);
    }

    #[test]
    fn token_balance_record_decodes_optional_bridge_route_disclosures() {
        let legacy: TokenBalanceRecord = serde_json::from_value(serde_json::json!({
            "tokenId": format!("0x{}", "11".repeat(32)),
            "balance": "0",
            "updatedAtBlock": 90
        }))
        .unwrap();
        assert_eq!(legacy.bridge_route_disclosure, None);
        assert_eq!(legacy.bridge_route_disclosures, None);
        let legacy_wire = serde_json::to_value(&legacy).unwrap();
        assert!(legacy_wire.get("bridgeRouteDisclosure").is_none());
        assert!(legacy_wire.get("bridgeRouteDisclosures").is_none());

        let direct_route = bridge_route("ccip-usdc-eth");
        let listed_route = bridge_route("layerzero-usdc-eth");
        let with_disclosures: TokenBalanceRecord = serde_json::from_value(serde_json::json!({
            "tokenId": format!("0x{}", "22".repeat(32)),
            "balance": "1000",
            "updatedAtBlock": 91,
            "bridgeRouteDisclosure": direct_route,
            "bridgeRouteDisclosures": [listed_route]
        }))
        .unwrap();

        let direct = with_disclosures
            .bridge_route_disclosure
            .as_ref()
            .expect("direct bridge disclosure");
        assert_eq!(direct.route_id, "ccip-usdc-eth");
        assert!(assess_bridge_route(direct).accepted);

        let listed = with_disclosures
            .bridge_route_disclosures
            .as_ref()
            .expect("listed bridge disclosures");
        assert_eq!(listed[0].route_id, "layerzero-usdc-eth");
        assert!(assess_bridge_route(&listed[0]).accepted);
    }

    #[test]
    fn mrc_metadata_response_decodes_nullable_metadata_scopes() {
        let asset_id = format!("0x{}", "bb".repeat(32));
        let token_id = format!("0x{}", "cc".repeat(32));
        let with_metadata: MrcMetadataResponse = serde_json::from_value(serde_json::json!({
            "schemaVersion": 1,
            "assetId": asset_id,
            "tokenId": token_id,
            "metadata": {
                "standard": "mrc1155",
                "assetId": asset_id,
                "tokenId": token_id,
                "name": null,
                "symbol": null,
                "decimals": null,
                "uri": "ipfs://metadata/1",
                "updatedAtBlock": 91
            }
        }))
        .unwrap();
        assert_eq!(with_metadata.schema_version, 1);
        assert_eq!(with_metadata.token_id.as_ref().unwrap(), &token_id);
        let metadata = with_metadata.metadata.as_ref().expect("metadata row");
        assert_eq!(metadata.standard, "mrc1155");
        assert_eq!(metadata.uri.as_deref(), Some("ipfs://metadata/1"));
        assert_eq!(metadata.updated_at_block, 91);

        let missing_metadata: MrcMetadataResponse = serde_json::from_value(serde_json::json!({
            "schemaVersion": 1,
            "assetId": asset_id,
            "tokenId": null,
            "metadata": null
        }))
        .unwrap();
        assert_eq!(missing_metadata.token_id, None);
        assert_eq!(missing_metadata.metadata, None);
    }

    #[test]
    fn mrc_account_response_decodes_account_and_policy_spend_rows() {
        let account = "monos1effvdw0d05a35j69wwxplhmctpcclx382n60yf";
        let controller = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let recovery = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let asset_id = format!("0x{}", "bb".repeat(32));
        let policy_hash = format!("0x{}", "44".repeat(32));

        let request = MrcAccountRequest {
            account: account.to_owned(),
            spend_limit: Some(2),
        };
        let wire = serde_json::to_value(&request).unwrap();
        assert_eq!(wire["account"], account);
        assert_eq!(wire["spendLimit"], 2);

        let without_limit = serde_json::to_value(MrcAccountRequest {
            account: account.to_owned(),
            spend_limit: None,
        })
        .unwrap();
        assert!(without_limit.get("spendLimit").is_none());

        let response: MrcAccountResponse = serde_json::from_value(serde_json::json!({
            "schemaVersion": 1,
            "account": account,
            "spendLimit": 2,
            "smartAccount": {
                "kind": "smart_account",
                "account": account,
                "controller": controller,
                "recovery": recovery,
                "policyHash": null,
                "nonce": "7",
                "updatedAtBlock": 91
            },
            "policyAccount": {
                "kind": "policy_account",
                "account": account,
                "controller": controller,
                "recovery": null,
                "policyHash": policy_hash,
                "policy": {
                    "enabled": true,
                    "perActionLimit": "20",
                    "windowLimit": "100",
                    "allowedAssets": [asset_id]
                },
                "nonce": null,
                "updatedAtBlock": 90
            },
            "policySpends": [
                {
                    "account": account,
                    "assetId": asset_id,
                    "window": "3600",
                    "amount": "1000",
                    "spent": "250",
                    "updatedAtBlock": 92
                }
            ]
        }))
        .unwrap();

        assert_eq!(response.schema_version, 1);
        assert_eq!(response.account, account);
        assert_eq!(response.spend_limit, 2);
        let smart = response.smart_account.as_ref().expect("smart account row");
        assert_eq!(smart.kind, "smart_account");
        assert_eq!(smart.recovery.as_deref(), Some(recovery));
        assert_eq!(smart.policy_hash, None);
        assert_eq!(smart.policy, None);
        assert_eq!(smart.nonce.as_deref(), Some("7"));
        assert_eq!(smart.updated_at_block, 91);
        let policy = response
            .policy_account
            .as_ref()
            .expect("policy account row");
        assert_eq!(policy.kind, "policy_account");
        assert_eq!(policy.recovery, None);
        assert_eq!(policy.policy_hash.as_deref(), Some(policy_hash.as_str()));
        let policy_body = policy.policy.as_ref().expect("policy body");
        assert!(policy_body.enabled);
        assert_eq!(policy_body.per_action_limit, "20");
        assert_eq!(policy_body.window_limit, "100");
        assert_eq!(policy_body.allowed_assets, vec![asset_id.clone()]);
        assert_eq!(response.policy_spends[0].asset_id, asset_id);
        assert_eq!(response.policy_spends[0].window, "3600");
        assert_eq!(response.policy_spends[0].spent, "250");
        assert_eq!(response.policy_spends[0].updated_at_block, 92);
    }

    #[test]
    fn mrc_holders_models_share_rich_list_holder_shape() {
        let asset_id = format!("0x{}", "bb".repeat(32));
        let token_id = format!("0x{}", "cc".repeat(32));
        let request = MrcHoldersRequest {
            standard: "mrc1155".to_owned(),
            asset_id: asset_id.clone(),
            token_id: Some(token_id.clone()),
            limit: Some(5),
        };
        let wire = serde_json::to_value(&request).unwrap();
        assert_eq!(wire["assetId"], asset_id);
        assert_eq!(wire["tokenId"], token_id);
        assert_eq!(wire["limit"], 5);
        let without_limit = serde_json::to_value(MrcHoldersRequest {
            limit: None,
            ..request
        })
        .unwrap();
        assert!(without_limit.get("limit").is_none());

        let asset_scoped = serde_json::to_value(MrcHoldersRequest {
            standard: "mrc4626".to_owned(),
            asset_id: asset_id.clone(),
            token_id: None,
            limit: None,
        })
        .unwrap();
        assert!(asset_scoped.get("tokenId").is_none());

        let response: MrcHoldersResponse = serde_json::from_value(serde_json::json!({
            "schemaVersion": 1,
            "standard": "mrc1155",
            "assetId": asset_id,
            "tokenId": token_id,
            "limit": 5,
            "holders": [
                {
                    "rank": 1,
                    "address": "0x1111111111111111111111111111111111111111",
                    "balance": "42",
                    "updatedAtBlock": 91
                }
            ]
        }))
        .unwrap();
        assert_eq!(response.standard, "mrc1155");
        assert_eq!(response.holders[0].rank, 1);
        assert_eq!(response.holders[0].balance, "42");
        assert_eq!(response.holders[0].updated_at_block, 91);

        let vault_response: MrcHoldersResponse = serde_json::from_value(serde_json::json!({
            "schemaVersion": 1,
            "standard": "mrc4626",
            "assetId": asset_id,
            "tokenId": null,
            "limit": 50,
            "holders": []
        }))
        .unwrap();
        assert_eq!(vault_response.standard, "mrc4626");
        assert_eq!(vault_response.token_id, None);
    }

    #[test]
    fn address_profile_token_balances_decode_optional_mrc_identity() {
        let response: AddressProfileResponse = serde_json::from_value(serde_json::json!({
            "schemaVersion": 1,
            "address": "0x1111111111111111111111111111111111111111",
            "account": {
                "nativeBalance": "10",
                "nonce": 1,
                "codeHash": format!("0x{}", "00".repeat(32)),
                "isContract": false
            },
            "label": null,
            "activity": {
                "kind": "found",
                "retention": null,
                "latest": null
            },
            "tokenBalances": [
                {
                    "tokenId": format!("0x{}", "aa".repeat(32)),
                    "balance": "1000",
                    "updatedAtBlock": 88,
                    "mrc": {
                        "standard": "mrc721",
                        "assetId": format!("0x{}", "bb".repeat(32)),
                        "tokenId": format!("0x{}", "cc".repeat(32))
                    }
                },
                {
                    "tokenId": format!("0x{}", "dd".repeat(32)),
                    "balance": "0",
                    "updatedAtBlock": 88
                }
            ]
        }))
        .unwrap();

        let mrc = response.token_balances[0]
            .mrc
            .as_ref()
            .expect("profile mrc identity");
        assert_eq!(mrc.standard, "mrc721");
        assert_eq!(mrc.asset_id, format!("0x{}", "bb".repeat(32)));
        assert_eq!(response.token_balances[1].mrc, None);
        assert_eq!(response.bridge_route_disclosures, None);
    }

    #[test]
    fn address_profile_response_decodes_bridge_route_disclosures() {
        let response: AddressProfileResponse = serde_json::from_value(serde_json::json!({
            "schemaVersion": 1,
            "address": "0x1111111111111111111111111111111111111111",
            "account": {
                "nativeBalance": "10",
                "nonce": 1,
                "codeHash": format!("0x{}", "00".repeat(32)),
                "isContract": false
            },
            "label": null,
            "activity": {
                "kind": "found",
                "retention": null,
                "latest": null
            },
            "tokenBalances": [],
            "bridgeRouteDisclosures": [bridge_route("ccip-usdc-eth")]
        }))
        .unwrap();

        let disclosures = response
            .bridge_route_disclosures
            .as_ref()
            .expect("profile bridge disclosures");
        assert_eq!(disclosures[0].route_id, "ccip-usdc-eth");
        assert!(assess_bridge_route(&disclosures[0]).accepted);
    }

    #[test]
    fn native_agent_state_response_decodes_optional_nonces() {
        let issuer_id = format!("0x{}", "11".repeat(32));
        let legacy_issuer_id = format!("0x{}", "10".repeat(32));
        let attestation_id = format!("0x{}", "12".repeat(32));
        let consent_id = format!("0x{}", "13".repeat(32));
        let service_id = format!("0x{}", "14".repeat(32));
        let arbiter_id = format!("0x{}", "15".repeat(32));
        let policy_id = format!("0x{}", "aa".repeat(32));
        let escrow_id = format!("0x{}", "bb".repeat(32));
        let asset_id = format!("0x{}", "cc".repeat(32));
        let terms_hash = format!("0x{}", "dd".repeat(32));
        let owner = "mono1agentowner000000000000000000000000000000";
        let controller = "mono1agentcontroller000000000000000000000000";
        let provider = "mono1agentprovider0000000000000000000000000";
        let arbiter = "mono1agentarbiter00000000000000000000000000";

        let response: NativeAgentStateResponse = serde_json::from_value(serde_json::json!({
            "schemaVersion": 1,
            "limit": 5,
            "filters": {
                "policyId": null,
                "escrowId": null,
                "account": owner,
                "includePolicySpends": false
            },
            "issuers": [
                {
                    "issuerId": issuer_id,
                    "issuer": owner,
                    "nonce": 1,
                    "metadataHash": null,
                    "updatedAtBlock": 45
                },
                {
                    "issuerId": legacy_issuer_id,
                    "issuer": provider,
                    "metadataHash": null,
                    "updatedAtBlock": 46
                }
            ],
            "attestations": [{
                "attestationId": attestation_id,
                "nonce": 2,
                "issuerId": issuer_id,
                "issuer": owner,
                "subject": controller,
                "schemaHash": null,
                "payloadHash": null,
                "active": true,
                "updatedAtBlock": 47
            }],
            "consents": [{
                "consentId": consent_id,
                "subject": controller,
                "grantee": arbiter,
                "nonce": 3,
                "scopeHash": null,
                "expiresAt": null,
                "active": true,
                "updatedAtBlock": 48
            }],
            "services": [{
                "serviceId": service_id,
                "provider": provider,
                "nonce": 4,
                "categoryHash": null,
                "metadataHash": null,
                "active": true,
                "updatedAtBlock": 49
            }],
            "availability": [],
            "arbiters": [{
                "arbiterId": arbiter_id,
                "arbiter": arbiter,
                "nonce": 5,
                "tier": null,
                "metadataHash": null,
                "updatedAtBlock": 50
            }],
            "reputationReviews": [],
            "spendingPolicies": [{
                "policyId": policy_id,
                "owner": owner,
                "controller": controller,
                "assetId": asset_id,
                "nonce": 6,
                "enabled": true,
                "perActionLimit": "100",
                "windowLimit": "500",
                "windowSecs": 60,
                "updatedAtBlock": 51
            }],
            "policySpends": [],
            "escrows": [{
                "escrowId": escrow_id,
                "buyer": owner,
                "provider": provider,
                "arbiter": arbiter,
                "assetId": asset_id,
                "nonce": 7,
                "amount": "1000",
                "termsHash": terms_hash,
                "round": 2,
                "buyerAccepted": true,
                "providerAccepted": false,
                "submittedPayloadHash": null,
                "status": "created",
                "resolution": null,
                "lastActor": null,
                "createdAtBlock": 40,
                "updatedAtBlock": 52
            }],
            "source": {
                "indexerProvider": "native_agent_state",
                "projection": "native_agent_state"
            }
        }))
        .unwrap();

        assert_eq!(response.issuers[0].nonce, Some(1));
        assert_eq!(response.issuers[1].nonce, None);
        assert_eq!(response.attestations[0].nonce, Some(2));
        assert_eq!(response.consents[0].nonce, Some(3));
        assert_eq!(response.services[0].nonce, Some(4));
        assert_eq!(response.arbiters[0].nonce, Some(5));
        assert_eq!(response.spending_policies[0].nonce, Some(6));
        assert_eq!(response.escrows[0].nonce, Some(7));

        let wire = serde_json::to_value(response).unwrap();
        assert_eq!(wire["issuers"][0]["nonce"], serde_json::json!(1));
        assert_eq!(wire["issuers"][1]["nonce"], serde_json::Value::Null);
        assert_eq!(wire["escrows"][0]["nonce"], serde_json::json!(7));
    }

    #[test]
    fn block_header_decodes_execution_unit_fields_with_legacy_aliases() {
        let canonical: BlockHeader = serde_json::from_value(serde_json::json!({
            "number": 12,
            "hash": format!("0x{}", "11".repeat(32)),
            "parentHash": format!("0x{}", "22".repeat(32)),
            "stateRoot": format!("0x{}", "33".repeat(32)),
            "timestamp": 1_700_000_000u64,
            "executionUnitsUsed": 42,
            "executionUnitLimit": 200_000_000
        }))
        .unwrap();

        assert_eq!(canonical.execution_units_used, 42);
        assert_eq!(canonical.execution_unit_limit, 200_000_000);

        let legacy: BlockHeader = serde_json::from_value(serde_json::json!({
            "number": 12,
            "hash": format!("0x{}", "11".repeat(32)),
            "parent_hash": format!("0x{}", "22".repeat(32)),
            "state_root": format!("0x{}", "33".repeat(32)),
            "timestamp": 1_700_000_000u64,
            "gas_used": 42,
            "gas_limit": 200_000_000
        }))
        .unwrap();

        assert_eq!(legacy.execution_units_used, 42);
        assert_eq!(legacy.execution_unit_limit, 200_000_000);

        let wire = serde_json::to_value(canonical).unwrap();
        assert_eq!(wire["executionUnitsUsed"], 42);
        assert_eq!(wire["executionUnitLimit"], 200_000_000);
        assert!(wire.get("gas_used").is_none());
        assert!(wire.get("gas_limit").is_none());
    }

    #[test]
    fn transaction_receipt_decodes_execution_units_with_legacy_alias() {
        let canonical: TransactionReceipt = serde_json::from_value(serde_json::json!({
            "txHash": format!("0x{}", "11".repeat(32)),
            "blockHash": format!("0x{}", "22".repeat(32)),
            "blockNumber": 12,
            "txIndex": 1,
            "status": 1,
            "executionUnitsUsed": 21_000
        }))
        .unwrap();

        assert_eq!(canonical.execution_units_used, 21_000);

        let legacy: TransactionReceipt = serde_json::from_value(serde_json::json!({
            "tx_hash": format!("0x{}", "11".repeat(32)),
            "block_hash": format!("0x{}", "22".repeat(32)),
            "block_number": 12,
            "tx_index": 1,
            "status": 1,
            "gas_used": 21_000
        }))
        .unwrap();

        assert_eq!(legacy.execution_units_used, 21_000);

        let wire = serde_json::to_value(canonical).unwrap();
        assert_eq!(wire["executionUnitsUsed"], 21_000);
        assert!(wire.get("gas_used").is_none());
    }

    #[test]
    fn native_receipt_response_decodes_camel_case_wire_shape() {
        let tx_hash = format!("0x{}", "11".repeat(32));
        let block_hash = format!("0x{}", "22".repeat(32));
        let artifact_hash = format!("0x{}", "aa".repeat(32));
        let event_topic = format!("0x{}", "33".repeat(32));
        let decoded = serde_json::json!({
            "block_height": 100,
            "tx_index": 0,
            "sequence": 0,
            "family": "agent",
            "event_name": "agent.escrow.created",
            "payload_hash": format!("0x{}", "44".repeat(32))
        });
        let wire = serde_json::json!({
            "txHash": tx_hash,
            "blockHash": block_hash,
            "blockHeight": 100,
            "txIndex": 0,
            "schema": "riscv.receipt.v1",
            "artifactHash": artifact_hash,
            "receiptCommitment": format!("0x{}", "bb".repeat(32)),
            "noEvmProof": null,
            "counters": {
                "cycles": 44,
                "syscallUnits": 3,
                "stateIoUnits": 2
            },
            "fee": {
                "total_lythoshi": "440000000000",
                "cycles_used": 44,
                "base_price_per_cycle_lythoshi": "10000000000",
                "state_io_units": 2,
                "state_io_price_per_unit_lythoshi": "0",
                "priority_tip_lythoshi": "0"
            },
            "reverted": false,
            "nativeDeltaCount": 0,
            "eventCount": 1,
            "events": [{
                "blockHeight": 100,
                "txIndex": 0,
                "logIndex": 0,
                "address": "monoc1nativeeventemitter",
                "eventTopic": event_topic,
                "decoded": decoded,
                "decodedJson": decoded.to_string()
            }],
            "source": {
                "chainProvider": "mock_chain",
                "indexerProvider": "native_events",
                "metadataLogIndex": u32::MAX
            }
        });

        let receipt: NativeReceiptResponse = serde_json::from_value(wire).unwrap();

        assert_eq!(receipt.schema, "riscv.receipt.v1");
        assert_eq!(receipt.artifact_hash, format!("0x{}", "aa".repeat(32)));
        assert_eq!(receipt.receipt_commitment, format!("0x{}", "bb".repeat(32)));
        assert_eq!(receipt.no_evm_proof, None);
        assert_eq!(receipt.counters.cycles, 44);
        assert_eq!(receipt.counters.syscall_units, 3);
        assert_eq!(receipt.counters.state_io_units, 2);
        assert_eq!(receipt.fee.total_lythoshi, "440000000000");
        assert_eq!(receipt.fee.total_lyth, None);
        assert_eq!(receipt.fee.cycles_used, 44);
        assert_eq!(receipt.fee.base_price_per_cycle_lythoshi, "10000000000");
        assert_eq!(receipt.fee.state_io_units, 2);
        assert_eq!(receipt.fee.state_io_price_per_unit_lythoshi, "0");
        assert_eq!(receipt.fee.priority_tip_lythoshi, "0");
        assert!(!receipt.reverted);
        assert_eq!(receipt.native_delta_count, 0);
        assert_eq!(receipt.event_count, 1);
        assert_eq!(receipt.source.metadata_log_index, u32::MAX);
        assert_eq!(
            receipt.events[0].event_topic,
            format!("0x{}", "33".repeat(32))
        );
        assert_eq!(
            receipt.events[0].decoded["event_name"],
            serde_json::json!("agent.escrow.created")
        );
        assert_eq!(receipt.events[0].decoded_json, decoded.to_string());
    }

    #[test]
    fn native_receipt_fee_rejects_legacy_fee_fields() {
        let wire = serde_json::json!({
            "total_lythoshi": "21000",
            "total_lyth": "0.000000000000021",
            "cycles_used": 21_000,
            "base_price_per_cycle_lythoshi": "1",
            "state_io_units": 0,
            "state_io_price_per_unit_lythoshi": "0",
            "priority_tip_lythoshi": "0",
            "maxFeePerGas": "1"
        });

        assert!(serde_json::from_value::<NativeReceiptFee>(wire).is_err());
    }

    fn fee_fixture(total: &str, base_price: &str, priority_tip: &str) -> NativeReceiptFee {
        NativeReceiptFee {
            total_lythoshi: total.to_owned(),
            total_lyth: None,
            cycles_used: 44,
            base_price_per_cycle_lythoshi: base_price.to_owned(),
            state_io_units: 2,
            state_io_price_per_unit_lythoshi: "0".to_owned(),
            priority_tip_lythoshi: priority_tip.to_owned(),
        }
    }

    #[test]
    fn fee_history_reads_camel_case_base_fee_per_gas() {
        let value = serde_json::json!({
            "oldestBlock": "0x1",
            "baseFeePerGas": ["0x1", "0x2"],
            "gasUsedRatio": [0.5],
        });
        let parsed: FeeHistoryResponse =
            serde_json::from_value(value).expect("camelCase baseFeePerGas must deserialize");
        assert_eq!(
            parsed.base_fee_per_gas,
            vec!["0x1".to_owned(), "0x2".to_owned()]
        );
    }

    #[test]
    fn fee_history_fails_loud_if_base_fee_drifts_to_snake_case() {
        // Guard: the chain serializes the eth-compat fee window as camelCase
        // `baseFeePerGas`. A drift to snake_case `base_fee_per_gas` must fail
        // deserialization (missing required field) rather than silently
        // yielding an empty window that would mis-quote fees.
        let value = serde_json::json!({
            "oldestBlock": "0x1",
            "base_fee_per_gas": ["0x64"],
            "gasUsedRatio": [0.0],
        });
        let parsed = serde_json::from_value::<FeeHistoryResponse>(value);
        assert!(
            parsed.is_err(),
            "snake_case base_fee_per_gas must not deserialize into FeeHistoryResponse"
        );
    }

    #[test]
    fn transaction_fee_exposure_sums_base_price_and_priority_tip() {
        let exposure = fee_fixture("262500000000", "10000000000", "2500000000")
            .transaction_fee_exposure()
            .expect("well-formed fee");
        assert_eq!(exposure.fee_lythoshi, "262500000000");
        assert_eq!(exposure.effective_gas_price_per_unit, "12500000000");
    }

    #[test]
    fn transaction_fee_exposure_handles_large_values_without_loss() {
        let exposure = fee_fixture(
            "123456789012345678901234567890",
            "99999999999999999999",
            "1",
        )
        .transaction_fee_exposure()
        .expect("well-formed fee");
        assert_eq!(exposure.fee_lythoshi, "123456789012345678901234567890");
        assert_eq!(
            exposure.effective_gas_price_per_unit,
            "100000000000000000000"
        );
    }

    #[test]
    fn transaction_fee_exposure_rejects_non_integer_fields() {
        let err = fee_fixture("210000000000", "not-a-number", "0")
            .transaction_fee_exposure()
            .expect_err("non-integer base price");
        assert!(matches!(err, crate::SdkError::Malformed(msg)
            if msg.contains("base_price_per_cycle_lythoshi")));

        let err = fee_fixture("210000000000", "10000000000", "1.5")
            .transaction_fee_exposure()
            .expect_err("non-integer priority tip");
        assert!(matches!(err, crate::SdkError::Malformed(msg)
            if msg.contains("priority_tip_lythoshi")));

        let err = fee_fixture("", "10000000000", "0")
            .transaction_fee_exposure()
            .expect_err("empty total");
        assert!(matches!(err, crate::SdkError::Malformed(msg)
            if msg.contains("total_lythoshi")));
    }

    #[test]
    fn native_receipt_response_accepts_missing_null_and_typed_no_evm_proof() {
        let mut wire = serde_json::json!({
            "txHash": format!("0x{}", "11".repeat(32)),
            "blockHash": format!("0x{}", "22".repeat(32)),
            "blockHeight": 100,
            "txIndex": 0,
            "schema": "riscv.receipt.v1",
            "artifactHash": format!("0x{}", "aa".repeat(32)),
            "receiptCommitment": format!("0x{}", "bb".repeat(32)),
            "counters": {
                "cycles": 44,
                "syscallUnits": 3,
                "stateIoUnits": 2
            },
            "fee": {
                "total_lythoshi": "440000000000",
                "cycles_used": 44,
                "base_price_per_cycle_lythoshi": "10000000000",
                "state_io_units": 2,
                "state_io_price_per_unit_lythoshi": "0",
                "priority_tip_lythoshi": "0"
            },
            "reverted": false,
            "nativeDeltaCount": 0,
            "eventCount": 0,
            "events": [],
            "source": {
                "chainProvider": "mock_chain",
                "indexerProvider": "native_events",
                "metadataLogIndex": u32::MAX
            }
        });

        let legacy: NativeReceiptResponse = serde_json::from_value(wire.clone()).unwrap();
        assert_eq!(legacy.receipt_commitment, format!("0x{}", "bb".repeat(32)));
        assert_eq!(legacy.no_evm_proof, None);

        let proof_wire = serde_json::json!({
            "schema": "mono.no_evm_receipt_proof.v1",
            "proofType": "canonicalReceiptsTranscript",
            "rootAlgorithm": "keccak256-binary-merkle(monolythium/v4.1/receipt_leaf/1, monolythium/v4.1/receipt_node/1, duplicate-last padding)",
            "receiptCodec": "bincode(protocore_execution_types::Receipt)",
            "blockHash": format!("0x{}", "22".repeat(32)),
            "txHash": format!("0x{}", "11".repeat(32)),
            "receiptsRoot": format!("0x{}", "33".repeat(32)),
            "targetReceiptHash": format!("0x{}", "44".repeat(32)),
            "blockHeight": 100,
            "txIndex": 0,
            "receiptCount": 2,
            "receiptTranscript": [
                "0x010203",
                "0x040506"
            ]
        });
        wire.as_object_mut()
            .unwrap()
            .insert("noEvmProof".to_owned(), proof_wire.clone());
        let with_proof: NativeReceiptResponse = serde_json::from_value(wire.clone()).unwrap();
        let parsed_proof = with_proof
            .no_evm_proof
            .as_ref()
            .expect("typed no-EVM proof");
        assert_eq!(parsed_proof.schema, "mono.no_evm_receipt_proof.v1");
        assert_eq!(parsed_proof.proof_type, "canonicalReceiptsTranscript");
        assert_eq!(
            parsed_proof.root_algorithm,
            "keccak256-binary-merkle(monolythium/v4.1/receipt_leaf/1, monolythium/v4.1/receipt_node/1, duplicate-last padding)"
        );
        assert_eq!(
            parsed_proof.receipt_codec,
            "bincode(protocore_execution_types::Receipt)"
        );
        assert_eq!(parsed_proof.block_hash, format!("0x{}", "22".repeat(32)));
        assert_eq!(parsed_proof.tx_hash, format!("0x{}", "11".repeat(32)));
        assert_eq!(parsed_proof.receipts_root, format!("0x{}", "33".repeat(32)));
        assert_eq!(
            parsed_proof.target_receipt_hash,
            format!("0x{}", "44".repeat(32))
        );
        assert_eq!(parsed_proof.block_height, 100);
        assert_eq!(parsed_proof.tx_index, 0);
        assert_eq!(parsed_proof.receipt_count, 2);
        assert_eq!(
            parsed_proof.receipt_transcript.as_slice(),
            ["0x010203", "0x040506"]
        );
        let typed_wire = serde_json::to_value(&with_proof).unwrap();
        assert_eq!(typed_wire["noEvmProof"], proof_wire);

        let mut finality_proof_wire = proof_wire.clone();
        finality_proof_wire.as_object_mut().unwrap().insert(
            "finalityEvidence".to_owned(),
            serde_json::json!({
                "schema": NO_EVM_RECEIPT_FINALITY_EVIDENCE_SCHEMA,
                "source": NO_EVM_RECEIPT_FINALITY_EVIDENCE_SOURCE,
                "round": 57,
                "certificate": {
                    "round": 57,
                    "signature": "0x1234",
                    "signersBitmap": "0xabcd",
                    "signerIndices": [1, 3],
                    "signerCount": 2
                }
            }),
        );
        wire.as_object_mut()
            .unwrap()
            .insert("noEvmProof".to_owned(), finality_proof_wire);
        let with_finality: NativeReceiptResponse = serde_json::from_value(wire.clone()).unwrap();
        let finality = with_finality
            .no_evm_proof
            .as_ref()
            .and_then(|proof| proof.finality_evidence.as_ref())
            .expect("finality evidence");
        assert_eq!(finality.source, NO_EVM_RECEIPT_FINALITY_EVIDENCE_SOURCE);
        assert_eq!(finality.certificate.signer_indices, [1, 3]);

        wire.as_object_mut()
            .unwrap()
            .insert("noEvmProof".to_owned(), serde_json::Value::Null);
        let null_proof: NativeReceiptResponse = serde_json::from_value(wire).unwrap();
        assert_eq!(null_proof.no_evm_proof, None);
        let null_wire = serde_json::to_value(null_proof).unwrap();
        assert_eq!(
            null_wire["receiptCommitment"],
            serde_json::json!(format!("0x{}", "bb".repeat(32)))
        );
        assert_eq!(null_wire["noEvmProof"], serde_json::Value::Null);
    }

    fn test_no_evm_proof() -> NoEvmReceiptProof {
        let receipt_bytes = vec![vec![0x01, 0x02, 0x03], vec![0x04, 0x05, 0x06, 0x07], vec![]];
        NoEvmReceiptProof {
            schema: NO_EVM_RECEIPT_PROOF_SCHEMA.to_owned(),
            proof_type: NO_EVM_RECEIPT_PROOF_TYPE.to_owned(),
            root_algorithm: NO_EVM_RECEIPT_ROOT_ALGORITHM.to_owned(),
            receipt_codec: NO_EVM_RECEIPT_CODEC.to_owned(),
            block_hash: format!("0x{}", "22".repeat(32)),
            tx_hash: format!("0x{}", "11".repeat(32)),
            receipts_root: compute_no_evm_receipts_root(&receipt_bytes).unwrap(),
            target_receipt_hash: compute_no_evm_target_receipt_hash(&receipt_bytes[1]),
            block_height: 100,
            tx_index: 1,
            receipt_count: u32::try_from(receipt_bytes.len()).unwrap(),
            archive_proof: None,
            finality_evidence: None,
            receipt_transcript: receipt_bytes
                .iter()
                .map(|receipt| hex_encode_0x(receipt))
                .collect(),
        }
    }

    fn test_no_evm_archive_proof(signatures: Vec<String>) -> NoEvmArchiveProof {
        NoEvmArchiveProof {
            schema: NO_EVM_ARCHIVE_PROOF_SCHEMA.to_owned(),
            source: "indexerReceiptArchiveContentDigest".to_owned(),
            manifest_hash: format!("0x{}", "53".repeat(32)),
            content_hash: format!("0x{}", "54".repeat(32)),
            signature_digest: Some(format!("0x{}", "66".repeat(32))),
            signatures,
            covering_snapshot: None,
        }
    }

    fn test_no_evm_covering_snapshot(signatures: Vec<String>) -> NoEvmArchiveCoveringSnapshot {
        NoEvmArchiveCoveringSnapshot {
            snapshot_height: 100,
            manifest_hash: format!("0x{}", "61".repeat(32)),
            signature_digest: format!("0x{}", "62".repeat(32)),
            content_hash: format!("0x{}", "63".repeat(32)),
            checkpoint_content_hash: format!("0x{}", "54".repeat(32)),
            checkpoint_from: 0,
            checkpoint_to: 100,
            signatures,
        }
    }

    #[test]
    fn no_evm_receipt_proof_verifies_valid_transcript_and_null() {
        let proof = test_no_evm_proof();

        assert_eq!(
            proof.receipts_root,
            "0xe5b378f1eed08e15cf92dcd785c8af9db25c0668fe51086ce00687eba2c1984a"
        );
        assert_eq!(
            proof.target_receipt_hash,
            "0xf53a5554601329f91c1b8baec5d7270102bd621873e3b119aff9c83c1d73d86c"
        );
        assert_eq!(
            decode_no_evm_receipt_transcript(&proof).unwrap(),
            vec![vec![0x01, 0x02, 0x03], vec![0x04, 0x05, 0x06, 0x07], vec![]]
        );

        let verified = verify_no_evm_receipt_proof(Some(&proof))
            .unwrap()
            .expect("verified proof");
        assert_eq!(verified.receipt_count, 3);
        assert_eq!(verified.tx_index, 1);
        assert_eq!(verified.target_receipt, vec![0x04, 0x05, 0x06, 0x07]);
        assert_eq!(verified.receipts_root, proof.receipts_root);
        assert_eq!(verified.target_receipt_hash, proof.target_receipt_hash);
        assert_eq!(proof.verify_transcript().unwrap(), verified);
        assert_eq!(verify_no_evm_receipt_proof(None).unwrap(), None);
    }

    #[test]
    fn no_evm_receipt_proof_accepts_legacy_root_algorithm() {
        let receipt_bytes = vec![vec![0x01, 0x02, 0x03], vec![0x04, 0x05, 0x06, 0x07], vec![]];
        let mut proof = test_no_evm_proof();
        proof.root_algorithm = NO_EVM_LEGACY_RECEIPT_ROOT_ALGORITHM.to_owned();
        proof.receipts_root =
            hex_encode_0x(&compute_no_evm_legacy_receipts_root_bytes(&receipt_bytes).unwrap());

        let verified = verify_no_evm_receipt_proof(Some(&proof))
            .unwrap()
            .expect("verified legacy proof");

        assert_eq!(verified.receipt_count, 3);
        assert_eq!(verified.receipts_root, proof.receipts_root);
    }

    #[test]
    fn no_evm_receipt_proof_validates_archive_proof_signatures() {
        let mut empty_signatures = test_no_evm_proof();
        empty_signatures.archive_proof = Some(test_no_evm_archive_proof(Vec::new()));
        let verified = verify_no_evm_receipt_proof(Some(&empty_signatures))
            .unwrap()
            .expect("verified proof");
        assert_eq!(verified.tx_index, 1);
        let wire = serde_json::to_value(&empty_signatures).unwrap();
        assert_eq!(wire["archiveProof"]["signatures"], serde_json::json!([]));

        let mut signed = test_no_evm_proof();
        signed.archive_proof = Some(test_no_evm_archive_proof(vec![
            VALID_ARCHIVE_SIGNATURE.to_owned()
        ]));
        let verified = verify_no_evm_receipt_proof(Some(&signed))
            .unwrap()
            .expect("verified proof");
        assert_eq!(verified.tx_index, 1);
        let wire = serde_json::to_value(&signed).unwrap();
        assert_eq!(
            wire["archiveProof"]["signatures"],
            serde_json::json!([VALID_ARCHIVE_SIGNATURE])
        );
    }

    #[test]
    fn no_evm_receipt_proof_rejects_malformed_archive_proof_signatures() {
        let malformed_signatures = vec![
            "0x1234".to_owned(),
            format!("mono.snapshot.sig.v2:0x{}:0xab", "12".repeat(20)),
            format!(
                "{}:0x{}:0xab",
                NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
                "12".repeat(19)
            ),
            format!(
                "{}:0x{}:0xab",
                NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
                "12".repeat(21)
            ),
            format!(
                "{}:0X{}:0xab",
                NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
                "12".repeat(20)
            ),
            format!(
                "{}:0x{}:0Xab",
                NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
                "12".repeat(20)
            ),
            format!(
                "{}:0x{}:0x",
                NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
                "12".repeat(20)
            ),
            format!(
                "{}:0x{}:0xabc",
                NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
                "12".repeat(20)
            ),
            format!(
                "{}:0x{}:0xab:extra",
                NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
                "12".repeat(20)
            ),
        ];

        for signature in malformed_signatures {
            let mut proof = test_no_evm_proof();
            proof.archive_proof = Some(test_no_evm_archive_proof(vec![signature]));
            let err = verify_no_evm_receipt_proof(Some(&proof))
                .expect_err("malformed archive signature must be rejected");
            assert!(
                err.to_string().contains("archiveProof.signatures[0]"),
                "{err}"
            );
        }
    }

    #[test]
    fn no_evm_receipt_proof_validates_archive_covering_snapshot() {
        let mut proof = test_no_evm_proof();
        let mut archive = test_no_evm_archive_proof(Vec::new());
        archive.signature_digest = None;
        archive.covering_snapshot = Some(test_no_evm_covering_snapshot(vec![
            VALID_ARCHIVE_SIGNATURE.to_owned(),
        ]));
        proof.archive_proof = Some(archive);

        let verified = verify_no_evm_receipt_proof(Some(&proof))
            .unwrap()
            .expect("verified proof");
        assert_eq!(verified.tx_index, 1);
        let wire = serde_json::to_value(&proof).unwrap();
        assert_eq!(
            wire["archiveProof"]["coveringSnapshot"]["checkpointContentHash"],
            serde_json::json!(format!("0x{}", "54".repeat(32)))
        );
        assert_eq!(
            wire["archiveProof"]["coveringSnapshot"]["signatures"],
            serde_json::json!([VALID_ARCHIVE_SIGNATURE])
        );
    }

    #[test]
    fn no_evm_receipt_proof_rejects_invalid_archive_covering_snapshot() {
        type SnapshotMutator = fn(&mut NoEvmArchiveCoveringSnapshot);
        let cases: [(&str, SnapshotMutator); 6] = [
            (
                "archiveProof.coveringSnapshot.checkpointFrom",
                |snapshot: &mut NoEvmArchiveCoveringSnapshot| snapshot.checkpoint_from = 1,
            ),
            (
                "archiveProof.coveringSnapshot.checkpointTo",
                |snapshot: &mut NoEvmArchiveCoveringSnapshot| snapshot.checkpoint_to = 101,
            ),
            (
                "archiveProof.coveringSnapshot.checkpointTo",
                |snapshot: &mut NoEvmArchiveCoveringSnapshot| snapshot.checkpoint_to = 99,
            ),
            (
                "archiveProof.coveringSnapshot.checkpointContentHash",
                |snapshot: &mut NoEvmArchiveCoveringSnapshot| {
                    snapshot.checkpoint_content_hash = format!("0x{}", "55".repeat(32));
                },
            ),
            (
                "archiveProof.coveringSnapshot.signatures",
                |snapshot: &mut NoEvmArchiveCoveringSnapshot| snapshot.signatures.clear(),
            ),
            (
                "archiveProof.coveringSnapshot.signatures[0]",
                |snapshot: &mut NoEvmArchiveCoveringSnapshot| {
                    snapshot.signatures = vec![format!(
                        "{}:0x{}:0xab",
                        NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
                        "12".repeat(19)
                    )];
                },
            ),
        ];

        for (expected, mutate) in cases {
            let mut proof = test_no_evm_proof();
            let mut archive = test_no_evm_archive_proof(Vec::new());
            archive.signature_digest = None;
            let mut snapshot =
                test_no_evm_covering_snapshot(vec![VALID_ARCHIVE_SIGNATURE.to_owned()]);
            mutate(&mut snapshot);
            archive.covering_snapshot = Some(snapshot);
            proof.archive_proof = Some(archive);

            let err = verify_no_evm_receipt_proof(Some(&proof))
                .expect_err("invalid covering snapshot must be rejected");
            assert!(err.to_string().contains(expected), "{err}");
        }
    }

    #[test]
    fn no_evm_receipt_proof_rejects_archive_covering_snapshot_without_signature_digest() {
        let mut wire = serde_json::to_value(test_no_evm_proof()).unwrap();
        wire["archiveProof"] = serde_json::json!({
            "schema": NO_EVM_ARCHIVE_PROOF_SCHEMA,
            "source": "indexerReceiptArchiveContentDigest",
            "manifestHash": format!("0x{}", "53".repeat(32)),
            "contentHash": format!("0x{}", "54".repeat(32)),
            "signatures": [],
            "coveringSnapshot": {
                "snapshotHeight": 100,
                "manifestHash": format!("0x{}", "61".repeat(32)),
                "contentHash": format!("0x{}", "63".repeat(32)),
                "checkpointContentHash": format!("0x{}", "54".repeat(32)),
                "checkpointFrom": 0,
                "checkpointTo": 100,
                "signatures": [VALID_ARCHIVE_SIGNATURE]
            }
        });

        let err = serde_json::from_value::<NoEvmReceiptProof>(wire)
            .expect_err("missing covering signatureDigest must fail decoding");
        assert!(err.to_string().contains("signatureDigest"), "{err}");
    }

    #[test]
    fn no_evm_ml_dsa65_signer_id_uses_domain_separated_blake3() {
        let public_key = vec![0x42u8; 1_952];
        let signer_id = no_evm_ml_dsa65_signer_id_hex(&public_key);

        assert_eq!(signer_id, "0x2144e4d0785772c668132fea761382b727bd23e2");

        let legacy_digest = Keccak256::digest(&public_key);
        assert_ne!(signer_id, hex_encode_0x(&legacy_digest[12..]));
    }

    #[test]
    fn no_evm_archive_proof_verifies_trusted_ml_dsa_signatures() {
        let (public_key, private_key) = ml_dsa_65::KG::keygen_from_seed(&[7u8; 32]);
        let public_key_bytes = public_key.into_bytes().to_vec();
        let signer_id = no_evm_ml_dsa65_signer_id_hex(&public_key_bytes);
        let signature_digest = vec![0x66; 32];
        let signature = private_key
            .try_sign_with_seed(&[8u8; 32], &signature_digest, &[])
            .unwrap();
        let archive_proof = test_no_evm_archive_proof(vec![format!(
            "{}:{}:{}",
            NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
            signer_id,
            hex_encode_0x(&signature)
        )]);

        let result = verify_no_evm_archive_proof_signatures(
            &archive_proof,
            &[NoEvmArchiveTrustedSigner {
                public_key: public_key_bytes,
                signer_id: Some(signer_id.clone()),
            }],
            1,
        )
        .unwrap();

        assert!(result.verified);
        assert_eq!(result.valid_signers, vec![signer_id]);
        assert!(result.issues.is_empty());
    }

    #[test]
    fn no_evm_archive_proof_signature_verification_rejects_failures() {
        let (public_key, private_key) = ml_dsa_65::KG::keygen_from_seed(&[9u8; 32]);
        let public_key_bytes = public_key.into_bytes().to_vec();
        let signer_id = no_evm_ml_dsa65_signer_id_hex(&public_key_bytes);
        let signature_digest = vec![0x66; 32];
        let signature = private_key
            .try_sign_with_seed(&[10u8; 32], &signature_digest, &[])
            .unwrap();
        let signature_entry = format!(
            "{}:{}:{}",
            NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
            signer_id,
            hex_encode_0x(&signature)
        );

        let mut missing_digest = test_no_evm_archive_proof(vec![signature_entry.clone()]);
        missing_digest.signature_digest = None;
        let result = verify_no_evm_archive_proof_signatures(
            &missing_digest,
            &[NoEvmArchiveTrustedSigner {
                public_key: public_key_bytes.clone(),
                signer_id: None,
            }],
            1,
        )
        .unwrap();
        assert!(!result.verified);
        assert_eq!(result.issues[0].code, "missing_signature_digest");

        let (untrusted_public_key, _) = ml_dsa_65::KG::keygen_from_seed(&[11u8; 32]);
        let result = verify_no_evm_archive_proof_signatures(
            &test_no_evm_archive_proof(vec![signature_entry.clone()]),
            &[NoEvmArchiveTrustedSigner {
                public_key: untrusted_public_key.into_bytes().to_vec(),
                signer_id: None,
            }],
            1,
        )
        .unwrap();
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "untrusted_signer"));

        let mut wrong_digest = test_no_evm_archive_proof(vec![signature_entry.clone()]);
        wrong_digest.signature_digest = Some(format!("0x{}", "67".repeat(32)));
        let result = verify_no_evm_archive_proof_signatures(
            &wrong_digest,
            &[NoEvmArchiveTrustedSigner {
                public_key: public_key_bytes.clone(),
                signer_id: None,
            }],
            1,
        )
        .unwrap();
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "invalid_signature"));

        let result = verify_no_evm_archive_proof_signatures(
            &test_no_evm_archive_proof(vec![signature_entry.clone(), signature_entry]),
            &[NoEvmArchiveTrustedSigner {
                public_key: public_key_bytes,
                signer_id: None,
            }],
            1,
        )
        .unwrap();
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "duplicate_signer"));
    }

    #[test]
    fn no_evm_archive_proof_verifies_covering_snapshot_signatures() {
        let (public_key, private_key) = ml_dsa_65::KG::keygen_from_seed(&[12u8; 32]);
        let public_key_bytes = public_key.into_bytes().to_vec();
        let signer_id = no_evm_ml_dsa65_signer_id_hex(&public_key_bytes);
        let signature_digest = vec![0x62; 32];
        let signature = private_key
            .try_sign_with_seed(&[13u8; 32], &signature_digest, &[])
            .unwrap();
        let mut archive_proof = test_no_evm_archive_proof(Vec::new());
        archive_proof.signature_digest = None;
        archive_proof.covering_snapshot = Some(test_no_evm_covering_snapshot(vec![format!(
            "{}:{}:{}",
            NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
            signer_id,
            hex_encode_0x(&signature)
        )]));

        let result = verify_no_evm_archive_proof_signatures(
            &archive_proof,
            &[NoEvmArchiveTrustedSigner {
                public_key: public_key_bytes,
                signer_id: Some(signer_id.clone()),
            }],
            1,
        )
        .unwrap();

        assert!(result.verified);
        assert_eq!(result.valid_signers, vec![signer_id]);
        assert_eq!(result.checked_signatures, 1);
        assert!(result.issues.is_empty());
    }

    #[test]
    fn no_evm_finality_verifies_threshold_bls_with_cluster_key() {
        let chain_id = 69_420_u64;
        let round = 58_u64;
        let signer = test_bls_key(0x44);
        let message = compute_no_evm_round_finality_message(chain_id, round);
        let signature = signer.sign(&message, NO_EVM_BLS_DST, &[]).to_bytes();
        let public_key = signer.sk_to_pk().to_bytes();
        let finality = test_finality_evidence(round, signature, &[3], vec![3], 1, 7);

        let verification =
            verify_no_evm_finality_evidence_threshold(&finality, chain_id, &public_key, 7, 1)
                .unwrap();

        assert!(verification.verified());
        assert!(verification.signer_count_matches);
        assert!(verification.signer_bitmap_matches_indices);
        assert!(verification.signature_valid);
    }

    #[test]
    fn no_evm_finality_rejects_wrong_chain_id() {
        let chain_id = 69_420_u64;
        let round = 59_u64;
        let signer = test_bls_key(0x45);
        let message = compute_no_evm_round_finality_message(chain_id, round);
        let signature = signer.sign(&message, NO_EVM_BLS_DST, &[]).to_bytes();
        let public_key = signer.sk_to_pk().to_bytes();
        let finality = test_finality_evidence(round, signature, &[1], vec![1], 1, 7);

        let verification =
            verify_no_evm_finality_evidence_threshold(&finality, chain_id + 1, &public_key, 7, 1)
                .unwrap();

        assert!(!verification.verified());
        assert!(!verification.signature_valid);
    }

    #[test]
    fn no_evm_finality_detects_bitmap_index_mismatch() {
        let chain_id = 69_420_u64;
        let round = 60_u64;
        let signer = test_bls_key(0x46);
        let message = compute_no_evm_round_finality_message(chain_id, round);
        let signature = signer.sign(&message, NO_EVM_BLS_DST, &[]).to_bytes();
        let public_key = signer.sk_to_pk().to_bytes();
        let finality = test_finality_evidence(round, signature, &[1], vec![1, 1], 2, 7);

        let verification =
            verify_no_evm_finality_evidence_threshold(&finality, chain_id, &public_key, 7, 1)
                .unwrap();

        assert!(!verification.verified());
        assert!(!verification.signer_count_matches);
        assert!(!verification.signer_bitmap_matches_indices);
    }

    #[test]
    fn no_evm_finality_rejects_threshold_shortfall() {
        let chain_id = 69_420_u64;
        let round = 61_u64;
        let signer = test_bls_key(0x47);
        let message = compute_no_evm_round_finality_message(chain_id, round);
        let signature = signer.sign(&message, NO_EVM_BLS_DST, &[]).to_bytes();
        let public_key = signer.sk_to_pk().to_bytes();
        let finality = test_finality_evidence(round, signature, &[2], vec![2], 1, 7);

        let verification =
            verify_no_evm_finality_evidence_threshold(&finality, chain_id, &public_key, 7, 2)
                .unwrap();

        assert!(!verification.verified());
        assert!(!verification.threshold_met);
        assert!(verification.signature_valid);
    }

    #[test]
    fn no_evm_block_bound_finality_verifies_multisig() {
        let chain_id = 69_420_u64;
        let round = 62_u64;
        let authority = 4_u16;
        let block_reference = NoEvmReceiptFinalityBlockReference {
            round,
            authority,
            digest: format!("0x{}", "42".repeat(32)),
        };
        let signer = test_bls_key(0x50);
        let public_key = signer.sk_to_pk().to_bytes();
        let round_message = compute_no_evm_round_finality_message(chain_id, round);
        let leader_message =
            compute_no_evm_leader_finality_message(chain_id, &block_reference).unwrap();
        let dac_message = compute_no_evm_dac_finality_message(chain_id, &block_reference).unwrap();
        let mut finality = test_finality_evidence(
            round,
            signer.sign(&round_message, NO_EVM_BLS_DST, &[]).to_bytes(),
            &[2],
            vec![2],
            1,
            7,
        );
        finality.block_reference = Some(block_reference.clone());
        finality.leader_certificate = Some(test_finality_certificate(
            round,
            signer.sign(&leader_message, NO_EVM_BLS_DST, &[]).to_bytes(),
            &[2],
            vec![2],
            1,
            7,
        ));
        finality.dac_certificate = Some(test_finality_certificate(
            round,
            signer.sign(&dac_message, NO_EVM_BLS_DST, &[]).to_bytes(),
            &[2],
            vec![2],
            1,
            7,
        ));

        let verification = verify_no_evm_block_finality_evidence_multisig(
            &finality,
            chain_id,
            &[NoEvmReceiptTrustedBlsSigner {
                authority_index: 2,
                public_key,
            }],
            1,
        )
        .unwrap();

        assert!(verification.verified());
        assert_eq!(verification.block_reference, block_reference);
        assert!(verification.leader_certificate.signature_valid);
        assert!(verification.dac_certificate.signature_valid);
    }

    #[test]
    fn no_evm_block_bound_finality_rejects_wrong_chain_id() {
        let chain_id = 69_420_u64;
        let round = 63_u64;
        let authority = 5_u16;
        let block_reference = NoEvmReceiptFinalityBlockReference {
            round,
            authority,
            digest: format!("0x{}", "43".repeat(32)),
        };
        let signer = test_bls_key(0x51);
        let public_key = signer.sk_to_pk().to_bytes();
        let round_message = compute_no_evm_round_finality_message(chain_id, round);
        let leader_message =
            compute_no_evm_leader_finality_message(chain_id, &block_reference).unwrap();
        let dac_message = compute_no_evm_dac_finality_message(chain_id, &block_reference).unwrap();
        let mut finality = test_finality_evidence(
            round,
            signer.sign(&round_message, NO_EVM_BLS_DST, &[]).to_bytes(),
            &[3],
            vec![3],
            1,
            7,
        );
        finality.block_reference = Some(block_reference);
        finality.leader_certificate = Some(test_finality_certificate(
            round,
            signer.sign(&leader_message, NO_EVM_BLS_DST, &[]).to_bytes(),
            &[3],
            vec![3],
            1,
            7,
        ));
        finality.dac_certificate = Some(test_finality_certificate(
            round,
            signer.sign(&dac_message, NO_EVM_BLS_DST, &[]).to_bytes(),
            &[3],
            vec![3],
            1,
            7,
        ));

        let verification = verify_no_evm_block_finality_evidence_threshold(
            &finality,
            chain_id + 1,
            &public_key,
            7,
            1,
        )
        .unwrap();

        assert!(!verification.verified());
        assert!(!verification.leader_certificate.signature_valid);
        assert!(!verification.dac_certificate.signature_valid);
    }

    #[test]
    fn no_evm_finality_rejects_malformed_signature_length() {
        let mut finality = test_finality_evidence(62, [0x11; 96], &[0], vec![0], 1, 1);
        finality.certificate.signature = hex_encode_0x(&[0x11; 95]);

        let err = verify_no_evm_finality_evidence_threshold(&finality, 69_420, &[0x22; 48], 1, 1)
            .expect_err("malformed signature length must fail");

        assert!(matches!(
            err,
            NoEvmReceiptProofError::InvalidHexLength {
                expected: 96,
                actual: 95,
                ..
            }
        ));
    }

    #[test]
    fn no_evm_receipt_trust_policy_verifies_archive_and_finality_material() {
        let (archive_public_key, archive_private_key) =
            ml_dsa_65::KG::keygen_from_seed(&[13u8; 32]);
        let archive_public_key_bytes = archive_public_key.into_bytes().to_vec();
        let archive_signer_id = no_evm_ml_dsa65_signer_id_hex(&archive_public_key_bytes);
        let archive_signature = archive_private_key
            .try_sign_with_seed(&[14u8; 32], &[0x66; 32], &[])
            .unwrap();
        let archive_signature_entry = format!(
            "{}:{}:{}",
            NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
            archive_signer_id,
            hex_encode_0x(&archive_signature)
        );

        let chain_id = 69_420_u64;
        let round = 63_u64;
        let finality_signer = test_bls_key(0x49);
        let finality_message = compute_no_evm_round_finality_message(chain_id, round);
        let finality_signature = finality_signer
            .sign(&finality_message, NO_EVM_BLS_DST, &[])
            .to_bytes();
        let finality_public_key = finality_signer.sk_to_pk().to_bytes();

        let mut proof = test_no_evm_proof();
        proof.archive_proof = Some(test_no_evm_archive_proof(vec![archive_signature_entry]));
        proof.finality_evidence = Some(test_finality_evidence(
            round,
            finality_signature,
            &[2],
            vec![2],
            1,
            7,
        ));
        let policy = NoEvmReceiptTrustPolicy {
            chain_id: Some(chain_id),
            archive: Some(NoEvmArchiveTrustPolicy {
                trusted_signers: vec![NoEvmArchiveTrustPolicySigner {
                    public_key: archive_public_key_bytes,
                    signer_id: Some(archive_signer_id),
                    valid_from_height: Some(0),
                    valid_to_height: Some(100),
                }],
                threshold: 1,
                valid_from_height: Some(0),
                valid_to_height: Some(100),
            }),
            finality: Some(NoEvmReceiptFinalityTrustPolicy::Cluster(
                NoEvmReceiptFinalityClusterTrustPolicy {
                    chain_id: None,
                    cluster_public_key: finality_public_key,
                    committee_size: 7,
                    threshold: 1,
                    valid_from_round: Some(round),
                    valid_to_round: Some(round),
                },
            )),
        };

        let verification = verify_no_evm_receipt_proof_trust(Some(&proof), &policy).unwrap();

        assert!(verification.verified);
        assert!(verification.archive_signatures.unwrap().verified);
        assert!(verification.finality_evidence.unwrap().verified());
        assert!(verification.issues.is_empty());

        let mut expired_policy = policy.clone();
        expired_policy
            .archive
            .as_mut()
            .expect("archive policy")
            .valid_to_height = Some(99);
        if let Some(NoEvmReceiptFinalityTrustPolicy::Cluster(finality)) =
            expired_policy.finality.as_mut()
        {
            finality.valid_to_round = Some(round - 1);
        }
        let expired = verify_no_evm_receipt_proof_trust(Some(&proof), &expired_policy).unwrap();
        let expired_codes: Vec<_> = expired.issues.iter().map(|issue| issue.code).collect();
        assert!(!expired.verified);
        assert!(expired_codes.contains(&NoEvmReceiptTrustIssueCode::ArchivePolicyNotValidAtHeight));
        assert!(expired_codes.contains(&NoEvmReceiptTrustIssueCode::FinalityPolicyNotValidAtRound));
    }

    #[test]
    fn no_evm_receipt_trust_policy_fails_closed_for_missing_material() {
        let proof = test_no_evm_proof();
        let policy = NoEvmReceiptTrustPolicy {
            chain_id: Some(69_420),
            archive: Some(NoEvmArchiveTrustPolicy {
                trusted_signers: vec![NoEvmArchiveTrustPolicySigner {
                    public_key: vec![0; ml_dsa_65::PK_LEN],
                    signer_id: None,
                    valid_from_height: None,
                    valid_to_height: None,
                }],
                threshold: 1,
                valid_from_height: None,
                valid_to_height: None,
            }),
            finality: Some(NoEvmReceiptFinalityTrustPolicy::Cluster(
                NoEvmReceiptFinalityClusterTrustPolicy {
                    chain_id: None,
                    cluster_public_key: [0; 48],
                    committee_size: 7,
                    threshold: 1,
                    valid_from_round: None,
                    valid_to_round: None,
                },
            )),
        };

        let missing = verify_no_evm_receipt_proof_trust(Some(&proof), &policy).unwrap();
        let missing_codes: Vec<_> = missing.issues.iter().map(|issue| issue.code).collect();
        assert!(!missing.verified);
        assert!(missing_codes.contains(&NoEvmReceiptTrustIssueCode::MissingArchiveProof));
        assert!(missing_codes.contains(&NoEvmReceiptTrustIssueCode::MissingFinalityEvidence));

        let absent = verify_no_evm_receipt_proof_trust(None, &policy).unwrap();
        let absent_codes: Vec<_> = absent.issues.iter().map(|issue| issue.code).collect();
        assert!(absent_codes.contains(&NoEvmReceiptTrustIssueCode::MissingReceiptProof));
        assert!(absent_codes.contains(&NoEvmReceiptTrustIssueCode::MissingArchiveProof));
        assert!(absent_codes.contains(&NoEvmReceiptTrustIssueCode::MissingFinalityEvidence));
    }

    #[test]
    fn no_evm_receipt_proof_validates_finality_evidence() {
        let mut proof = test_no_evm_proof();
        proof.finality_evidence = Some(NoEvmReceiptFinalityEvidence {
            schema: NO_EVM_RECEIPT_FINALITY_EVIDENCE_SCHEMA.to_owned(),
            source: NO_EVM_RECEIPT_FINALITY_EVIDENCE_SOURCE.to_owned(),
            round: 57,
            certificate: NoEvmReceiptFinalityCertificate {
                round: 57,
                signature: "0x1234".to_owned(),
                signers_bitmap: "0xabcd".to_owned(),
                signer_indices: vec![1, 3],
                signer_count: 2,
            },
            block_reference: None,
            leader_certificate: None,
            dac_certificate: None,
        });

        let verified = verify_no_evm_receipt_proof(Some(&proof))
            .unwrap()
            .expect("verified proof");
        assert_eq!(verified.tx_index, 1);
        let wire = serde_json::to_value(&proof).unwrap();
        assert_eq!(
            wire["finalityEvidence"]["schema"],
            serde_json::json!(NO_EVM_RECEIPT_FINALITY_EVIDENCE_SCHEMA)
        );
        assert_eq!(
            wire["finalityEvidence"]["certificate"]["signersBitmap"],
            serde_json::json!("0xabcd")
        );
        assert_eq!(
            wire["finalityEvidence"]["certificate"]["signerIndices"],
            serde_json::json!([1, 3])
        );

        let mut bad_round = proof.clone();
        bad_round
            .finality_evidence
            .as_mut()
            .expect("finality")
            .certificate
            .round = 58;
        assert!(matches!(
            verify_no_evm_receipt_proof(Some(&bad_round)),
            Err(NoEvmReceiptProofError::FinalityCertificateRoundMismatch {
                evidence_round: 57,
                certificate_round: 58
            })
        ));

        let mut bad_count = proof;
        bad_count
            .finality_evidence
            .as_mut()
            .expect("finality")
            .certificate
            .signer_count = 1;
        assert!(matches!(
            verify_no_evm_receipt_proof(Some(&bad_count)),
            Err(NoEvmReceiptProofError::FinalitySignerCountMismatch {
                signer_count: 1,
                signer_indices: 2
            })
        ));
    }

    #[test]
    fn no_evm_receipt_proof_rejects_mismatches() {
        let mut proof = test_no_evm_proof();
        proof.receipt_count = 2;
        assert!(matches!(
            verify_no_evm_receipt_proof(Some(&proof)),
            Err(NoEvmReceiptProofError::ReceiptCountMismatch {
                expected: 2,
                actual: 3
            })
        ));

        let mut proof = test_no_evm_proof();
        proof.receipts_root = format!("0x{}", "00".repeat(32));
        assert!(matches!(
            verify_no_evm_receipt_proof(Some(&proof)),
            Err(NoEvmReceiptProofError::ReceiptsRootMismatch { .. })
        ));

        let mut proof = test_no_evm_proof();
        proof.tx_index = 0;
        assert!(matches!(
            verify_no_evm_receipt_proof(Some(&proof)),
            Err(NoEvmReceiptProofError::TargetReceiptHashMismatch { .. })
        ));

        let mut proof = test_no_evm_proof();
        proof.tx_index = 3;
        assert!(matches!(
            verify_no_evm_receipt_proof(Some(&proof)),
            Err(NoEvmReceiptProofError::TxIndexOutOfBounds {
                tx_index: 3,
                receipt_count: 3
            })
        ));
    }

    #[test]
    fn no_evm_receipt_proof_rejects_malformed_bytes() {
        let mut proof = test_no_evm_proof();
        proof.receipt_transcript[1] = "0xabc".to_owned();
        assert!(matches!(
            decode_no_evm_receipt_transcript(&proof),
            Err(NoEvmReceiptProofError::InvalidHex { field }) if field == "receiptTranscript[1]"
        ));

        let mut proof = test_no_evm_proof();
        proof.receipt_transcript[0] = "010203".to_owned();
        assert!(matches!(
            verify_no_evm_receipt_proof(Some(&proof)),
            Err(NoEvmReceiptProofError::InvalidHex { field }) if field == "receiptTranscript[0]"
        ));

        let mut proof = test_no_evm_proof();
        proof.target_receipt_hash = "0x12".to_owned();
        assert!(matches!(
            verify_no_evm_receipt_proof(Some(&proof)),
            Err(NoEvmReceiptProofError::InvalidHexLength {
                field,
                expected: 32,
                actual: 1
            }) if field == "targetReceiptHash"
        ));
    }

    #[test]
    fn native_receipt_response_requires_receipt_commitment() {
        let wire = serde_json::json!({
            "txHash": format!("0x{}", "11".repeat(32)),
            "blockHash": format!("0x{}", "22".repeat(32)),
            "blockHeight": 100,
            "txIndex": 0,
            "schema": "riscv.receipt.v1",
            "artifactHash": format!("0x{}", "aa".repeat(32)),
            "counters": {
                "cycles": 44,
                "syscallUnits": 3,
                "stateIoUnits": 2
            },
            "fee": {
                "total_lythoshi": "440000000000",
                "total_lyth": "0.00000044",
                "cycles_used": 44,
                "base_price_per_cycle_lythoshi": "10000000000",
                "state_io_units": 2,
                "state_io_price_per_unit_lythoshi": "0",
                "priority_tip_lythoshi": "0"
            },
            "reverted": false,
            "nativeDeltaCount": 0,
            "eventCount": 0,
            "events": [],
            "source": {
                "chainProvider": "mock_chain",
                "indexerProvider": "native_events",
                "metadataLogIndex": u32::MAX
            }
        });

        assert!(serde_json::from_value::<NativeReceiptResponse>(wire).is_err());
    }

    #[test]
    fn tx_feed_response_decodes_execution_unit_fee_shape() {
        let wire = serde_json::json!({
            "schemaVersion": 1,
            "latestHeight": 12,
            "limit": 5,
            "nextCursor": null,
            "transactions": [{
                "txHash": format!("0x{}", "11".repeat(32)),
                "blockHash": format!("0x{}", "22".repeat(32)),
                "blockNumber": 12,
                "blockTimestamp": 1_700_000_000u64,
                "txIndex": 0,
                "from": "mono1sender",
                "to": null,
                "nonce": 1,
                "value": "100000000",
                "executionUnitLimit": 21_000,
                "maxExecutionFeeLythoshi": "10000000000",
                "priorityTipLythoshi": "1",
                "fee": {
                    "total_lythoshi": "21000",
                    "cycles_used": 21_000,
                    "base_price_per_cycle_lythoshi": "1",
                    "state_io_units": 0,
                    "state_io_price_per_unit_lythoshi": "0",
                    "priority_tip_lythoshi": "0"
                },
                "input": "0x",
                "receipt": {
                    "status": 1,
                    "executionUnitsUsed": 21_000,
                    "logsCount": 0
                }
            }]
        });

        let feed: TxFeedResponse = serde_json::from_value(wire).unwrap();

        let tx = &feed.transactions[0];
        assert_eq!(tx.value, "100000000");
        assert_eq!(tx.execution_unit_limit, 21_000);
        assert_eq!(tx.max_execution_fee_lythoshi, "10000000000");
        assert_eq!(tx.priority_tip_lythoshi, "1");
        assert_eq!(tx.fee.total_lythoshi, "21000");
        assert_eq!(tx.fee.base_price_per_cycle_lythoshi, "1");
        assert_eq!(tx.receipt.as_ref().unwrap().execution_units_used, 21_000);

        let stale = serde_json::json!({
            "schemaVersion": 1,
            "latestHeight": 12,
            "limit": 5,
            "nextCursor": null,
            "transactions": [{
                "txHash": format!("0x{}", "11".repeat(32)),
                "blockHash": format!("0x{}", "22".repeat(32)),
                "blockNumber": 12,
                "blockTimestamp": 1_700_000_000u64,
                "txIndex": 0,
                "from": "mono1sender",
                "to": null,
                "nonce": 1,
                "value": "100000000",
                "gasLimit": 21_000,
                "maxFeePerGas": "10000000000",
                "maxPriorityFeePerGas": "1",
                "input": "0x",
                "receipt": {
                    "status": 1,
                    "gasUsed": 21_000,
                    "logsCount": 0
                }
            }]
        });
        assert!(serde_json::from_value::<TxFeedResponse>(stale).is_err());
    }

    #[test]
    fn tx_feed_response_rejects_legacy_keys_inside_structured_fee() {
        let wire = serde_json::json!({
            "schemaVersion": 1,
            "latestHeight": 12,
            "limit": 5,
            "nextCursor": null,
            "transactions": [{
                "txHash": format!("0x{}", "11".repeat(32)),
                "blockHash": format!("0x{}", "22".repeat(32)),
                "blockNumber": 12,
                "blockTimestamp": 1_700_000_000u64,
                "txIndex": 0,
                "from": "mono1sender",
                "to": null,
                "nonce": 1,
                "value": "100000000",
                "executionUnitLimit": 21_000,
                "maxExecutionFeeLythoshi": "10000000000",
                "priorityTipLythoshi": "1",
                "fee": {
                    "total_lythoshi": "21000",
                    "total_lyth": "0.000000000000021",
                    "cycles_used": 21_000,
                    "base_price_per_cycle_lythoshi": "1",
                    "state_io_units": 0,
                    "state_io_price_per_unit_lythoshi": "0",
                    "priority_tip_lythoshi": "0",
                    "gasPrice": "1"
                },
                "input": "0x",
                "receipt": null
            }]
        });

        assert!(serde_json::from_value::<TxFeedResponse>(wire).is_err());
    }

    #[test]
    fn decode_tx_response_decodes_execution_unit_fee_shape() {
        let wire = serde_json::json!({
            "txHash": format!("0x{}", "11".repeat(32)),
            "blockHash": format!("0x{}", "22".repeat(32)),
            "blockNumber": 12,
            "txIndex": 0,
            "from": "mono1sender",
            "to": null,
            "value": "0x5f5e100",
            "nonce": 1,
            "executionUnitLimit": 21_000,
            "maxExecutionFeeLythoshi": "10000000000",
            "priorityTipLythoshi": "1",
            "executionUnitsUsed": 20_500,
            "fee": {
                "total_lythoshi": "20500",
                "total_lyth": "0.0000000000000205",
                "cycles_used": 20_500,
                "base_price_per_cycle_lythoshi": "1",
                "state_io_units": 0,
                "state_io_price_per_unit_lythoshi": "0",
                "priority_tip_lythoshi": "0"
            },
            "decodedCalldata": null,
            "memo": null,
            "extensions": [{
                "kind": 48,
                "kindHex": "0x30",
                "bodyHex": "0x01",
                "body": "0x01"
            }],
            "round": 7,
            "clusterId": null,
            "roundAttestation": null,
            "pqAttestation": null,
            "finalityProof": null,
            "logs": [],
            "status": "success",
            "errorCode": null
        });

        let decoded: DecodeTxResponse = serde_json::from_value(wire.clone()).unwrap();

        assert_eq!(decoded.value, "0x5f5e100");
        assert_eq!(decoded.execution_unit_limit, 21_000);
        assert_eq!(decoded.max_execution_fee_lythoshi, "10000000000");
        assert_eq!(decoded.priority_tip_lythoshi, "1");
        assert_eq!(decoded.execution_units_used, Some(20_500));
        assert_eq!(decoded.fee.total_lythoshi, "20500");
        assert_eq!(decoded.extensions.len(), 1);
        assert_eq!(decoded.extensions[0].kind, 48);
        assert_eq!(decoded.extensions[0].kind_hex, "0x30");
        assert_eq!(decoded.extensions[0].body_hex, "0x01");
        assert_eq!(decoded.extensions[0].body, "0x01");

        let mut alias_wire = wire;
        let alias_fields = alias_wire.as_object_mut().unwrap();
        let extensions = alias_fields.remove("extensions").unwrap();
        alias_fields.insert("txExtensions".to_owned(), extensions);
        let alias_decoded: DecodeTxResponse = serde_json::from_value(alias_wire).unwrap();
        assert_eq!(alias_decoded.extensions, decoded.extensions);

        let stale = serde_json::json!({
            "txHash": format!("0x{}", "11".repeat(32)),
            "blockHash": format!("0x{}", "22".repeat(32)),
            "blockNumber": 12,
            "txIndex": 0,
            "from": "mono1sender",
            "to": null,
            "value": "0x5f5e100",
            "nonce": 1,
            "gasLimit": 21_000,
            "maxFeePerGas": "10000000000",
            "maxPriorityFeePerGas": "1",
            "gasUsed": 20_500,
            "decodedCalldata": null,
            "memo": null,
            "round": 7,
            "clusterId": null,
            "roundAttestation": null,
            "pqAttestation": null,
            "finalityProof": null,
            "logs": [],
            "status": "success",
            "errorCode": null
        });
        assert!(serde_json::from_value::<DecodeTxResponse>(stale).is_err());
    }

    #[test]
    fn decode_tx_round_attestation_populates_from_node_key() {
        // Regression for the blsAttestation -> roundAttestation drift: the node
        // emits `roundAttestation`, so a populated value must decode to `Some`.
        // Under the old `#[serde(rename = "blsAttestation")]` it silently read
        // `None`. A response using the LEGACY `blsAttestation` key must NOT
        // populate the field (no silent acceptance of the stale name).
        let base = serde_json::json!({
            "txHash": format!("0x{}", "11".repeat(32)),
            "blockHash": format!("0x{}", "22".repeat(32)),
            "blockNumber": 12,
            "txIndex": 0,
            "from": "mono1sender",
            "to": null,
            "value": "0x5f5e100",
            "nonce": 1,
            "executionUnitLimit": 21_000,
            "maxExecutionFeeLythoshi": "10000000000",
            "priorityTipLythoshi": "1",
            "executionUnitsUsed": 20_500,
            "fee": {
                "total_lythoshi": "20500",
                "total_lyth": "0.0000000000000205",
                "cycles_used": 20_500,
                "base_price_per_cycle_lythoshi": "1",
                "state_io_units": 0,
                "state_io_price_per_unit_lythoshi": "0",
                "priority_tip_lythoshi": "0"
            },
            "decodedCalldata": null,
            "memo": null,
            "round": 7,
            "clusterId": null,
            "pqAttestation": null,
            "finalityProof": null,
            "logs": [],
            "status": "success",
            "errorCode": null
        });
        let attestation = serde_json::json!({
            "round": 77,
            "signer_count": 2,
            "signer_indices": [0, 1]
        });

        let mut current = base.clone();
        current
            .as_object_mut()
            .unwrap()
            .insert("roundAttestation".to_owned(), attestation.clone());
        let decoded: DecodeTxResponse = serde_json::from_value(current).unwrap();
        assert_eq!(
            decoded.round_attestation.as_ref(),
            Some(&attestation),
            "the node's roundAttestation key must populate round_attestation"
        );

        // The retired key is ignored (no silent fallback to the old name).
        let mut legacy = base;
        legacy
            .as_object_mut()
            .unwrap()
            .insert("blsAttestation".to_owned(), attestation);
        let legacy_decoded: DecodeTxResponse = serde_json::from_value(legacy).unwrap();
        assert!(legacy_decoded.round_attestation.is_none());
    }

    #[test]
    fn native_receipt_events_decode_typed_payloads_for_consumers() {
        #[derive(Debug, Deserialize)]
        struct AgentEscrowCreatedEvent {
            block_height: u64,
            tx_index: u32,
            sequence: u32,
            family: String,
            event_name: String,
            payload_hash: String,
            amount_lythoshi: String,
            agent_address: String,
            contract_address: String,
        }

        let decoded = serde_json::json!({
            "block_height": 100,
            "tx_index": 0,
            "sequence": 0,
            "family": "agent",
            "event_name": "agent.escrow.created",
            "payload_hash": format!("0x{}", "44".repeat(32)),
            "amount_lythoshi": "440000000000",
            "agent_address": "mono1agentconsumer",
            "contract_address": "monoc1escrowcontract"
        });
        let receipt = NativeReceiptResponse {
            tx_hash: format!("0x{}", "11".repeat(32)),
            block_hash: format!("0x{}", "22".repeat(32)),
            block_height: 100,
            tx_index: 0,
            schema: "riscv.receipt.v1".to_owned(),
            artifact_hash: format!("0x{}", "aa".repeat(32)),
            receipt_commitment: format!("0x{}", "bb".repeat(32)),
            no_evm_proof: None,
            counters: NativeReceiptCounters {
                cycles: 44,
                syscall_units: 3,
                state_io_units: 2,
            },
            fee: NativeReceiptFee {
                total_lythoshi: "440000000000".to_owned(),
                total_lyth: Some("0.00000044".to_owned()),
                cycles_used: 44,
                base_price_per_cycle_lythoshi: "10000000000".to_owned(),
                state_io_units: 2,
                state_io_price_per_unit_lythoshi: "0".to_owned(),
                priority_tip_lythoshi: "0".to_owned(),
            },
            reverted: false,
            native_delta_count: 0,
            event_count: 1,
            events: vec![NativeReceiptEvent {
                block_height: 100,
                tx_index: 0,
                log_index: 0,
                address: "monoc1escrowcontract".to_owned(),
                event_topic: format!("0x{}", "33".repeat(32)),
                decoded: serde_json::Value::Null,
                decoded_json: decoded.to_string(),
            }],
            source: NativeReceiptSource {
                chain_provider: "mock_chain".to_owned(),
                indexer_provider: "native_events".to_owned(),
                metadata_log_index: u32::MAX,
            },
        };

        let events: Vec<TypedNativeReceiptEvent<AgentEscrowCreatedEvent>> =
            native_events_from_receipt(
                &receipt,
                NativeEventFilter::new()
                    .family("agent")
                    .event_name("agent.escrow.created"),
            )
            .unwrap();

        assert_eq!(events.len(), 1);
        assert_eq!(events[0].address, "monoc1escrowcontract");
        assert_eq!(events[0].decoded.block_height, 100);
        assert_eq!(events[0].decoded.tx_index, 0);
        assert_eq!(events[0].decoded.sequence, 0);
        assert_eq!(events[0].decoded.family, "agent");
        assert_eq!(events[0].decoded.event_name, "agent.escrow.created");
        assert_eq!(
            events[0].decoded.payload_hash,
            format!("0x{}", "44".repeat(32))
        );
        assert_eq!(events[0].decoded.amount_lythoshi, "440000000000");
        assert!(events[0].decoded.agent_address.starts_with("mono1"));
        assert!(events[0].decoded.contract_address.starts_with("monoc1"));
    }

    #[test]
    fn native_events_preserve_mrc4626_share_amount_projection() {
        #[derive(Debug, Deserialize)]
        struct Mrc4626DepositEvent {
            family: String,
            event_name: String,
            amount: String,
            share_amount: String,
            primary_id: String,
            account: String,
            counterparty: String,
        }

        let vault_id = format!("0x{}", "55".repeat(32));
        let decoded = serde_json::json!({
            "block_height": 100,
            "tx_index": 0,
            "sequence": 0,
            "family": "mrc",
            "event_name": "mrc4626.deposit",
            "payload_hash": format!("0x{}", "44".repeat(32)),
            "amount": "1000",
            "share_amount": "700",
            "primary_id": vault_id,
            "account": "mono1vaultdepositor",
            "counterparty": "mono1vaultreceiver"
        });
        let event = NativeReceiptEvent {
            block_height: 100,
            tx_index: 0,
            log_index: 0,
            address: "monos1nativeeventemitter".to_owned(),
            event_topic: format!("0x{}", "33".repeat(32)),
            decoded: serde_json::Value::Null,
            decoded_json: decoded.to_string(),
        };

        let typed = TypedNativeReceiptEvent::<Mrc4626DepositEvent>::from_receipt_event(&event)
            .expect("mrc4626 deposit decoded");

        assert_eq!(typed.decoded.family, "mrc");
        assert_eq!(typed.decoded.event_name, "mrc4626.deposit");
        assert_eq!(typed.decoded.amount, "1000");
        assert_eq!(typed.decoded.share_amount, "700");
        assert_eq!(typed.decoded.primary_id, vault_id);
        assert!(typed.decoded.account.starts_with("mono1"));
        assert!(typed.decoded.counterparty.starts_with("mono1"));
    }

    #[test]
    fn native_event_projection_decodes_optional_mrc_policy_body() {
        let asset_id = format!("0x{}", "44".repeat(32));
        let array_asset_id = vec![0x66_u8; 32];
        let decoded: NativeEventProjection = serde_json::from_value(serde_json::json!({
            "block_height": 101,
            "tx_index": 0,
            "sequence": 2,
            "family": "mrc",
            "event_name": "mrc.policy_account.updated",
            "policy": {
                "enabled": true,
                "per_action_limit": 20,
                "window_limit": "100",
                "allowed_assets": [asset_id.clone(), array_asset_id]
            },
            "payload_hash": format!("0x{}", "44".repeat(32))
        }))
        .unwrap();

        let policy = decoded.policy.as_ref().expect("policy body");
        assert!(policy.enabled);
        assert_eq!(policy.per_action_limit, "20");
        assert_eq!(policy.window_limit, "100");
        assert_eq!(
            policy.allowed_assets,
            vec![asset_id, format!("0x{}", "66".repeat(32))]
        );

        let legacy: NativeEventProjection = serde_json::from_value(serde_json::json!({
            "block_height": 101,
            "tx_index": 0,
            "sequence": 3,
            "family": "mrc",
            "event_name": "mrc.policy_account.created",
            "policy": null,
            "payload_hash": format!("0x{}", "55".repeat(32))
        }))
        .unwrap();
        assert_eq!(legacy.policy, None);
    }

    #[test]
    fn native_event_projection_decodes_optional_nonce() {
        let decoded: NativeEventProjection = serde_json::from_value(serde_json::json!({
            "block_height": 100,
            "tx_index": 0,
            "sequence": 0,
            "family": "agent",
            "event_name": "agent.service.listed",
            "nonce": 9,
            "payload_hash": format!("0x{}", "44".repeat(32))
        }))
        .unwrap();

        assert_eq!(decoded.nonce, Some(9));
        assert!(!decoded.extra.contains_key("nonce"));
        let wire = serde_json::to_value(&decoded).unwrap();
        assert_eq!(wire["nonce"], serde_json::json!(9));

        let legacy: NativeEventProjection = serde_json::from_value(serde_json::json!({
            "block_height": 100,
            "tx_index": 0,
            "sequence": 1,
            "family": "agent",
            "event_name": "agent.service.listed",
            "payload_hash": format!("0x{}", "45".repeat(32))
        }))
        .unwrap();
        assert_eq!(legacy.nonce, None);
        let legacy_wire = serde_json::to_value(&legacy).unwrap();
        assert!(legacy_wire.get("nonce").is_none());
    }

    #[test]
    fn native_event_projection_decodes_optional_market_fields() {
        let market_asset_id = format!("0x{}", "21".repeat(32));
        let market_related_asset_id = format!("0x{}", "22".repeat(32));
        let market_order_id = format!("0x{}", "23".repeat(32));
        let market_related_order_id = format!("0x{}", "24".repeat(32));
        let listing_kind = serde_json::json!({ "english": "fixed_price" });
        let decoded: NativeEventProjection = serde_json::from_value(serde_json::json!({
            "block_height": 102,
            "tx_index": 0,
            "sequence": 3,
            "family": "market",
            "event_name": "market.spot.order_filled",
            "marketSurface": "spot",
            "marketAssetId": market_asset_id.clone(),
            "marketRelatedAssetId": market_related_asset_id.clone(),
            "marketOrderId": market_order_id.clone(),
            "marketRelatedOrderId": market_related_order_id.clone(),
            "price": 50,
            "quantity": "10",
            "remaining": 0,
            "side": "bid",
            "status": "filled",
            "nftStandard": "mrc1155",
            "royaltyBps": 250,
            "listingKind": listing_kind.clone(),
            "expiresAtBlock": 77,
            "tickSize": 1,
            "lotSize": "2",
            "minQuantity": 3,
            "minNotional": "150",
            "payload_hash": format!("0x{}", "44".repeat(32))
        }))
        .unwrap();

        assert_eq!(decoded.family, "market");
        assert_eq!(decoded.market_surface.as_deref(), Some("spot"));
        assert_eq!(
            decoded.market_asset_id.as_deref(),
            Some(market_asset_id.as_str())
        );
        assert_eq!(
            decoded.market_related_asset_id.as_deref(),
            Some(market_related_asset_id.as_str())
        );
        assert_eq!(
            decoded.market_order_id.as_deref(),
            Some(market_order_id.as_str())
        );
        assert_eq!(
            decoded.market_related_order_id.as_deref(),
            Some(market_related_order_id.as_str())
        );
        assert_eq!(decoded.price.as_deref(), Some("50"));
        assert_eq!(decoded.quantity.as_deref(), Some("10"));
        assert_eq!(decoded.remaining.as_deref(), Some("0"));
        assert_eq!(decoded.side.as_deref(), Some("bid"));
        assert_eq!(decoded.status.as_deref(), Some("filled"));
        assert_eq!(decoded.nft_standard.as_deref(), Some("mrc1155"));
        assert_eq!(decoded.royalty_bps, Some(250));
        assert_eq!(decoded.listing_kind.as_ref(), Some(&listing_kind));
        assert_eq!(decoded.expires_at_block, Some(77));
        assert_eq!(decoded.tick_size.as_deref(), Some("1"));
        assert_eq!(decoded.lot_size.as_deref(), Some("2"));
        assert_eq!(decoded.min_quantity.as_deref(), Some("3"));
        assert_eq!(decoded.min_notional.as_deref(), Some("150"));
        assert_eq!(decoded.payload_hash, format!("0x{}", "44".repeat(32)));
    }

    #[test]
    fn native_events_filter_serializes_historical_query_params() {
        let event_topic = format!("0x{}", "11".repeat(32));
        let primary_id = format!("0x{}", "77".repeat(32));
        let related_id = format!("0x{}", "88".repeat(32));
        let token_id = format!("0x{}", "99".repeat(32));
        let filter = NativeEventsFilter::new(100, 105)
            .limit(25)
            .tx_index(0)
            .log_index(1)
            .address("monos1nativeeventemitter")
            .event_topic(&event_topic)
            .family("agent")
            .event_name("agent.escrow.created")
            .primary_id(&primary_id)
            .related_id(&related_id)
            .token_id(&token_id)
            .account("mono1agentconsumer")
            .counterparty("mono1agentcounterparty");

        assert_eq!(
            serde_json::to_value(filter).unwrap(),
            serde_json::json!({
                "fromBlock": 100,
                "toBlock": 105,
                "limit": 25,
                "txIndex": 0,
                "logIndex": 1,
                "address": "monos1nativeeventemitter",
                "eventTopic": event_topic.clone(),
                "family": "agent",
                "eventName": "agent.escrow.created",
                "primaryId": primary_id.clone(),
                "relatedId": related_id.clone(),
                "tokenId": token_id.clone(),
                "account": "mono1agentconsumer",
                "counterparty": "mono1agentcounterparty"
            })
        );
        assert_eq!(
            filter.to_query_pairs(),
            vec![
                ("fromBlock", "100".to_owned()),
                ("toBlock", "105".to_owned()),
                ("limit", "25".to_owned()),
                ("txIndex", "0".to_owned()),
                ("logIndex", "1".to_owned()),
                ("address", "monos1nativeeventemitter".to_owned()),
                ("eventTopic", event_topic),
                ("family", "agent".to_owned()),
                ("eventName", "agent.escrow.created".to_owned()),
                ("primaryId", primary_id),
                ("relatedId", related_id),
                ("tokenId", token_id),
                ("account", "mono1agentconsumer".to_owned()),
                ("counterparty", "mono1agentcounterparty".to_owned()),
            ]
        );
    }

    #[test]
    fn native_events_response_decodes_typed_historical_rows() {
        #[derive(Debug, Deserialize)]
        struct AgentEscrowCreatedEvent {
            family: String,
            event_name: String,
            amount_lythoshi: String,
            agent_address: String,
        }

        let event_topic = format!("0x{}", "11".repeat(32));
        let primary_id = format!("0x{}", "77".repeat(32));
        let decoded = serde_json::json!({
            "block_height": 100,
            "tx_index": 0,
            "sequence": 0,
            "family": "agent",
            "event_name": "agent.escrow.created",
            "payload_hash": format!("0x{}", "44".repeat(32)),
            "amount_lythoshi": "440000000000",
            "agent_address": "mono1agentconsumer"
        });
        let response: NativeEventsResponse = serde_json::from_value(serde_json::json!({
            "schemaVersion": 1,
            "fromBlock": 100,
            "toBlock": 105,
            "limit": 25,
            "filters": {
                "txIndex": 0,
                "eventTopic": event_topic.clone(),
                "family": "agent",
                "eventName": "agent.escrow.created",
                "primaryId": primary_id.clone()
            },
            "events": [{
                "blockHeight": 100,
                "txIndex": 0,
                "logIndex": 0,
                "address": "monos1nativeeventemitter",
                "eventTopic": event_topic.clone(),
                "decoded": null,
                "decodedJson": decoded.to_string()
            }],
            "source": {
                "indexerProvider": "native_events"
            }
        }))
        .unwrap();

        let typed: TypedNativeEventsResponse<AgentEscrowCreatedEvent> =
            typed_native_events_from_response(&response).unwrap();

        assert_eq!(typed.schema_version, 1);
        assert_eq!(typed.from_block, 100);
        assert_eq!(
            typed.filters.primary_id.as_deref(),
            Some(primary_id.as_str())
        );
        assert_eq!(typed.source.indexer_provider, "native_events");
        assert_eq!(typed.events[0].address, "monos1nativeeventemitter");
        assert_eq!(typed.events[0].decoded.family, "agent");
        assert_eq!(typed.events[0].decoded.event_name, "agent.escrow.created");
        assert_eq!(typed.events[0].decoded.amount_lythoshi, "440000000000");
        assert!(typed.events[0].decoded.agent_address.starts_with("mono1"));
    }

    #[test]
    fn native_market_helpers_force_market_family() {
        let receipt_filter = native_market_receipt_event_filter(
            NativeEventFilter::new()
                .family("agent")
                .event_name("market.nft.sale_settled"),
        );
        assert_eq!(receipt_filter.family, Some(NATIVE_MARKET_EVENT_FAMILY));
        assert_eq!(receipt_filter.event_name, Some("market.nft.sale_settled"));

        let historical_filter = native_market_events_filter(
            NativeEventsFilter::new(100, 120)
                .family("mrc")
                .limit(10)
                .event_name("market.nft.sale_settled"),
        );
        assert_eq!(historical_filter.family, Some(NATIVE_MARKET_EVENT_FAMILY));
        assert_eq!(historical_filter.limit, Some(10));
        assert_eq!(
            historical_filter.to_query_pairs(),
            vec![
                ("fromBlock", "100".to_owned()),
                ("toBlock", "120".to_owned()),
                ("limit", "10".to_owned()),
                ("family", "market".to_owned()),
                ("eventName", "market.nft.sale_settled".to_owned()),
            ]
        );
    }

    #[test]
    fn native_market_events_from_receipt_filters_non_market_rows() {
        #[derive(Debug, Deserialize)]
        struct MarketEvent {
            family: String,
            event_name: String,
            amount: u64,
        }

        let market_decoded = serde_json::json!({
            "block_height": 100,
            "tx_index": 0,
            "sequence": 0,
            "family": "market",
            "event_name": "market.nft.sale_settled",
            "payload_hash": format!("0x{}", "44".repeat(32)),
            "amount": 900
        });
        let agent_decoded = serde_json::json!({
            "block_height": 100,
            "tx_index": 0,
            "sequence": 1,
            "family": "agent",
            "event_name": "agent.escrow.created",
            "payload_hash": format!("0x{}", "55".repeat(32)),
            "amount": 1
        });
        let receipt: NativeReceiptResponse = serde_json::from_value(serde_json::json!({
            "txHash": format!("0x{}", "11".repeat(32)),
            "blockHash": format!("0x{}", "22".repeat(32)),
            "blockHeight": 100,
            "txIndex": 0,
            "schema": "riscv.receipt.v1",
            "artifactHash": format!("0x{}", "33".repeat(32)),
            "receiptCommitment": format!("0x{}", "88".repeat(32)),
            "counters": { "cycles": 1, "syscallUnits": 0, "stateIoUnits": 0 },
            "fee": {
                "total_lythoshi": "0",
                "cycles_used": 1,
                "base_price_per_cycle_lythoshi": "0",
                "state_io_units": 0,
                "state_io_price_per_unit_lythoshi": "0",
                "priority_tip_lythoshi": "0"
            },
            "reverted": false,
            "nativeDeltaCount": 0,
            "eventCount": 2,
            "events": [
                {
                    "blockHeight": 100,
                    "txIndex": 0,
                    "logIndex": 0,
                    "address": "monox1market",
                    "eventTopic": format!("0x{}", "66".repeat(32)),
                    "decoded": market_decoded,
                    "decodedJson": market_decoded.to_string()
                },
                {
                    "blockHeight": 100,
                    "txIndex": 0,
                    "logIndex": 1,
                    "address": "monox1agent",
                    "eventTopic": format!("0x{}", "77".repeat(32)),
                    "decoded": agent_decoded,
                    "decodedJson": agent_decoded.to_string()
                }
            ],
            "source": {
                "chainProvider": "mock_chain",
                "indexerProvider": "native_events",
                "metadataLogIndex": 4294967295u64
            }
        }))
        .unwrap();

        let rows: Vec<TypedNativeReceiptEvent<MarketEvent>> =
            native_market_events_from_receipt(&receipt, NativeEventFilter::new()).unwrap();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].decoded.family, "market");
        assert_eq!(rows[0].decoded.event_name, "market.nft.sale_settled");
        assert_eq!(rows[0].decoded.amount, 900);
    }

    #[test]
    fn agent_reputation_response_decodes_camel_case_wire_shape() {
        let provider = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let wire = serde_json::json!({
            "schemaVersion": 1,
            "provider": provider,
            "categoryId": 7,
            "categoryScope": "category",
            "record": {
                "provider": provider,
                "categoryId": 7,
                "blockHeight": 123,
                "speedSumX10": 460,
                "qualitySumX10": 450,
                "communicationSumX10": 440,
                "accuracySumX10": 430,
                "sampleCount": 5,
                "avgSpeedX10": 92,
                "avgQualityX10": 90,
                "avgCommunicationX10": 88,
                "avgAccuracyX10": 86
            }
        });

        let reputation: AgentReputationResponse = serde_json::from_value(wire).unwrap();

        assert_eq!(reputation.schema_version, 1);
        assert_eq!(reputation.provider, provider);
        assert_eq!(reputation.category_id, 7);
        assert_eq!(
            reputation.category_scope,
            AgentReputationCategoryScope::Category
        );
        let record = reputation.record.unwrap();
        assert_eq!(record.provider, provider);
        assert_eq!(record.block_height, 123);
        assert_eq!(record.sample_count, 5);
        assert_eq!(record.avg_speed_x10, 92);
        assert_eq!(record.avg_accuracy_x10, 86);
    }

    #[test]
    fn redemption_queue_response_decodes_node_wire_shape() {
        let wallet = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let response: RedemptionQueueResponse = serde_json::from_value(serde_json::json!({
            "wallet": wallet,
            "tickets": [
                {
                    "index": 0,
                    "cluster": 7,
                    "weightBps": 2500,
                    "createdHeight": 20,
                    "maturityHeight": 120,
                    "mature": false
                },
                {
                    "index": 1,
                    "cluster": 8,
                    "weightBps": 500,
                    "createdHeight": 21,
                    "maturityHeight": 121,
                    "mature": null
                }
            ],
            "count": 2,
            "returned": 2,
            "block": "latest"
        }))
        .unwrap();

        assert_eq!(response.wallet, wallet);
        assert_eq!(response.count, 2);
        assert_eq!(response.returned, 2);
        assert_eq!(response.tickets[0].index, 0);
        assert_eq!(response.tickets[0].cluster, 7);
        assert_eq!(response.tickets[0].weight_bps, 2_500);
        assert_eq!(response.tickets[0].created_height, 20);
        assert_eq!(response.tickets[0].maturity_height, 120);
        assert_eq!(response.tickets[0].mature, Some(false));
        assert_eq!(response.tickets[1].mature, None);
        assert_eq!(response.block, serde_json::json!("latest"));
    }
}
