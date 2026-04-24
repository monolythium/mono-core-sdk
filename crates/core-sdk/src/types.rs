//! Wire-shape types returned by [`crate::RpcClient`].
//!
//! These mirror the JSON the node serializes — quantities are
//! `0x`-prefixed hex strings, hashes / addresses / bytes are
//! `0x`-prefixed lower-case hex, structured types use camelCase
//! field names. The SDK does not yet depend on `protocore-types`;
//! when that dependency lands the wrapper types here forward to it
//! transparently.

use serde::{Deserialize, Serialize};

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
    /// Pending block (alias of `latest` in Protocore v1).
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
/// `eth_getStorageAt` / `protocore_registryStateProof`.
///
/// `value` is the raw quantity (or 32-byte word for storage) as returned
/// by the chain. `state_root` is the trie root the proof is verified
/// against. `proof` is `null` when the chain provider could not produce
/// an inclusion proof for this slot at the requested block.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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
    /// that need to verify the proof bring `protocore-state` in
    /// directly.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub proof: Option<serde_json::Value>,
}

/// Block header surfaced via `eth_getBlockByNumber` / `eth_getBlockByHash`.
///
/// Field naming mirrors the on-wire shape — fields use snake_case in
/// the v0.0.1 server. A future server version may upgrade to camelCase;
/// when that happens we add a serde alias.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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

/// `eth_syncing` response when the node is mid-sync. Returns `false`
/// when the node is caught up — the SDK surfaces that as
/// `Option::None`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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
pub struct CallRequest {
    /// Source address.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<Address>,
    /// Destination address. `None` is interpreted as contract
    /// creation by the chain.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<Address>,
    /// Gas limit.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gas: Option<Quantity>,
    /// Gas price (legacy / non-EIP-1559).
    #[serde(rename = "gasPrice", skip_serializing_if = "Option::is_none")]
    pub gas_price: Option<Quantity>,
    /// Wei to transfer.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<Quantity>,
    /// Calldata (`data` is canonical; chains accept `input` as alias).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Hex>,
}

/// `eth_feeHistory` response.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
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

/// `protocore_mempoolStatus` aggregate.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
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

/// `protocore_mempoolPending` per-tx entry.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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

/// `protocore_currentRound` round shape.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct RoundInfo {
    /// Latest committed height.
    pub height: u64,
}

/// `protocore_validatorSet` entry.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidatorDescriptor {
    /// Stable slot id.
    pub id: u16,
    /// 48-byte BLS public key, `0x` hex.
    pub pubkey: Hex,
    /// Stake as a decimal string.
    pub stake: String,
    /// Whether the validator can currently propose / vote.
    pub active: bool,
}

/// `protocore_indexerStatus` envelope. `null` on the wire surfaces as
/// `Option::None` here.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct IndexerStatus {
    /// Highest block fully ingested.
    #[serde(rename = "currentHeight")]
    pub current_height: u64,
    /// Highest block observed.
    #[serde(rename = "latestHeight")]
    pub latest_height: Option<u64>,
    /// Active schema version.
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
}

/// `protocore_listProviders` / `protocore_getRegistration` record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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

/// `protocore_getAccountPolicy` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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

/// `protocore_getAssetPolicy` response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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

/// `protocore_getStorageProof` batch response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StorageProofBatch {
    /// State-root the proofs verify against.
    #[serde(rename = "stateRoot")]
    pub state_root: Hash,
    /// Block height the proofs were generated against.
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    /// One opaque proof envelope per requested slot.
    pub proofs: Vec<serde_json::Value>,
}

/// `debug_p2pPeers` entry.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
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
