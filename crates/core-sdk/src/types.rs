//! Wire-shape types returned by [`crate::RpcClient`].
//!
//! These mirror the JSON the node serializes — quantities are
//! `0x`-prefixed hex strings, hashes / addresses / bytes are
//! `0x`-prefixed lower-case hex, structured types use camelCase
//! field names. The SDK does not yet depend on any internal
//! mono-core crates; when those land the wrapper types here forward
//! to them transparently.

use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

/// `0x`-prefixed hex byte vector. Stored as `String` to match the wire
/// envelope verbatim — callers can `crate::types::hex_decode` on demand.
pub type Hex = String;

/// `0x`-prefixed hex 20-byte address.
pub type Address = String;

/// `0x`-prefixed hex 32-byte hash.
pub type Hash = String;

/// `0x`-prefixed hex unsigned quantity, big-endian, no leading zeros
/// per the JSON-RPC spec (`"0x0"` instead of `"0x00"`).
pub type Quantity = String;

/// EVM block tag. Use [`BlockSelector`] when sending to the wire — this
/// is the strongly-typed half of an `eth_*` block argument.
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

/// Block selector for `eth_getBlock*`, `eth_call`, etc.
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
/// Field naming mirrors the on-wire shape — fields use snake_case in
/// the v0.0.1 server. A future server version may upgrade to camelCase;
/// when that happens we add a serde alias.
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
    /// Total gas consumed.
    #[serde(rename = "gas_used", alias = "gasUsed")]
    pub gas_used: u64,
    /// Block gas limit.
    #[serde(rename = "gas_limit", alias = "gasLimit")]
    pub gas_limit: u64,
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
    /// Gas consumed by this transaction.
    #[serde(rename = "gas_used", alias = "gasUsed")]
    pub gas_used: u64,
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

/// Argument shape for `eth_call` / `eth_estimateGas`.
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
    /// Gas limit.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub gas: Option<Quantity>,
    /// Gas price (legacy / non-EIP-1559).
    #[serde(rename = "gasPrice", skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "gasPrice", optional))]
    pub gas_price: Option<Quantity>,
    /// Wei to transfer.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub value: Option<Quantity>,
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

/// `lyth_validatorSet` entry.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "ValidatorDescriptor.ts")
)]
pub struct ValidatorDescriptor {
    /// Stable slot id.
    pub id: u16,
    /// Quantum-safe ML-DSA-65 public key, `0x` hex.
    pub pubkey: Hex,
    /// Stake as a decimal string.
    pub stake: String,
    /// Whether the validator can currently propose / vote.
    pub active: bool,
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

/// `lyth_listActivePrecompiles` entry — OI-0170 / ADR-0015 §5.
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
    /// Whether the precompile is currently dispatchable.
    pub active: bool,
    /// Human-readable status string from the milestone gate registry.
    pub status: String,
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
