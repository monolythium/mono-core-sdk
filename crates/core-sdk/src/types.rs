//! Wire-shape types returned by [`crate::RpcClient`].
//!
//! These mirror the JSON the node serializes — quantities are
//! `0x`-prefixed hex strings, hashes / bytes are `0x`-prefixed
//! lower-case hex, address fields use either legacy `0x` hex or typed
//! bech32m as documented on the field, and structured types use camelCase
//! field names. The SDK does not yet depend on any internal
//! mono-core crates; when those land the wrapper types here forward
//! to them transparently.

use std::collections::BTreeMap;

use crate::bridge::BridgeRouteDisclosure;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

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
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "NativeReceiptFee.ts"))]
pub struct NativeReceiptFee {
    /// Total fee in lythoshi.
    pub total_lythoshi: String,
    /// Total fee formatted as LYTH numeric text without the unit suffix.
    pub total_lyth: String,
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
    pub payload_hash: Hash,
    #[serde(flatten)]
    pub extra: BTreeMap<String, serde_json::Value>,
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
    /// Execution-unit limit.
    #[serde(
        rename = "gas",
        alias = "executionUnitLimit",
        skip_serializing_if = "Option::is_none"
    )]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "gas", optional))]
    pub execution_unit_limit: Option<Quantity>,
    /// Fee per execution unit on legacy / non-EIP-1559 paths.
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

/// Native MRC identity attached to a token-balance row.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "TokenBalanceMrcIdentity.ts")
)]
pub struct TokenBalanceMrcIdentity {
    /// MRC standard, currently `mrc20`, `mrc721`, or `mrc1155`.
    pub standard: String,
    /// MRC asset id, or collection id for token-specific standards.
    pub asset_id: Hash,
    /// Token id inside the collection for MRC-721/MRC-1155 rows.
    #[serde(default, skip_serializing_if = "Option::is_none")]
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
    /// `0x`-prefixed 48-byte BLS-G1 operator public key.
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

/// BLS aggregate certificate response used by the AUD-0074 certificate RPCs.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "BlsCertificateResponse.ts")
)]
pub struct BlsCertificateResponse {
    /// Round at which the certificate sealed.
    pub round: u64,
    /// `0x`-prefixed aggregate BLS signature.
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
    #[serde(rename = "blsAttestation")]
    bls_attestation: Option<serde_json::Value>,
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
            bls_attestation: wire.bls_attestation,
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
    /// Opaque BLS attestation payload.
    #[serde(rename = "blsAttestation")]
    #[cfg_attr(feature = "ts-bindings", ts(type = "unknown | null"))]
    pub bls_attestation: Option<serde_json::Value>,
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

    fn bridge_route(route_id: &str) -> BridgeRouteDisclosure {
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
                "assetId": format!("0x{}", "ee".repeat(32))
            }
        }))
        .unwrap();
        assert_eq!(mrc20.mrc.unwrap().token_id, None);

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
            "counters": {
                "cycles": 44,
                "syscallUnits": 3,
                "stateIoUnits": 2
            },
            "fee": {
                "total_lythoshi": "440000000000",
                "total_lyth": "4,400",
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
        assert_eq!(receipt.counters.cycles, 44);
        assert_eq!(receipt.counters.syscall_units, 3);
        assert_eq!(receipt.counters.state_io_units, 2);
        assert_eq!(receipt.fee.total_lythoshi, "440000000000");
        assert_eq!(receipt.fee.total_lyth, "4,400");
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
                    "total_lyth": "0.00021",
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
                "total_lyth": "0.000205",
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
            "blsAttestation": null,
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
            "blsAttestation": null,
            "pqAttestation": null,
            "finalityProof": null,
            "logs": [],
            "status": "success",
            "errorCode": null
        });
        assert!(serde_json::from_value::<DecodeTxResponse>(stale).is_err());
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
            counters: NativeReceiptCounters {
                cycles: 44,
                syscall_units: 3,
                state_io_units: 2,
            },
            fee: NativeReceiptFee {
                total_lythoshi: "440000000000".to_owned(),
                total_lyth: "4,400".to_owned(),
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
            "counters": { "cycles": 1, "syscallUnits": 0, "stateIoUnits": 0 },
            "fee": {
                "total_lythoshi": "0",
                "total_lyth": "0",
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
