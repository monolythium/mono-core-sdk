//! HTTP client for the explorer-facing `/api/v1` surface served by
//! `mono-core`.
//!
//! JSON-RPC methods live on [`crate::RpcClient`]. This client covers the
//! REST-shaped node API used by explorers, wallets, and status pages.

use std::sync::Arc;

use reqwest::Url;
use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::Value;

use crate::error::SdkError;
use crate::types::{
    AddressFlowResponse, AddressProfileResponse, BlockSelector, ChainStatsResponse,
    ClobMarketResponse, ClobMarketsResponse, ClobOhlcResponse, ClobOrderBookResponse,
    ClobTradesResponse, NativeReceiptResponse, SearchResponse, TxFeedResponse,
};

/// Typed HTTP API client for `/api/v1`.
#[derive(Debug, Clone)]
pub struct ApiClient {
    inner: Arc<Inner>,
}

#[derive(Debug)]
struct Inner {
    http: reqwest::Client,
    base_url: String,
}

impl ApiClient {
    /// Build an API client from a JSON-RPC endpoint or an explicit
    /// `/api/v1` endpoint.
    ///
    /// # Errors
    ///
    /// Returns [`SdkError::InvalidEndpoint`] if the endpoint is empty
    /// or cannot be parsed as an absolute URL.
    pub fn new(endpoint: impl Into<String>) -> Result<Self, SdkError> {
        let endpoint = endpoint.into();
        let base_url = api_endpoint_from_rpc_endpoint(&endpoint)?;
        let http = reqwest::Client::builder()
            .user_agent(concat!("monolythium-core-sdk/", env!("CARGO_PKG_VERSION")))
            .build()?;
        Ok(Self {
            inner: Arc::new(Inner { http, base_url }),
        })
    }

    /// Build a client from a pre-configured [`reqwest::Client`].
    ///
    /// # Errors
    ///
    /// Returns [`SdkError::InvalidEndpoint`] if the endpoint is empty
    /// or cannot be parsed as an absolute URL.
    pub fn with_http(http: reqwest::Client, endpoint: impl Into<String>) -> Result<Self, SdkError> {
        let endpoint = endpoint.into();
        let base_url = api_endpoint_from_rpc_endpoint(&endpoint)?;
        Ok(Self {
            inner: Arc::new(Inner { http, base_url }),
        })
    }

    /// Base `/api/v1` URL used by this client.
    #[must_use]
    pub fn base_url(&self) -> &str {
        &self.inner.base_url
    }

    /// Send an arbitrary `GET` request relative to `/api/v1`.
    ///
    /// # Errors
    ///
    /// Surfaces transport failures, API error envelopes, and malformed
    /// responses as [`SdkError`].
    pub async fn get<R>(&self, path: &str, query: &[(&str, String)]) -> Result<R, SdkError>
    where
        R: DeserializeOwned,
    {
        self.get_inner(path, query, false).await
    }

    /// `/api/v1/health`.
    pub async fn health(&self) -> Result<ApiHealthResponse, SdkError> {
        self.get_inner("health", &[], true).await
    }

    /// `/api/v1/capabilities`.
    pub async fn capabilities(&self) -> Result<ApiCapabilitiesResponse, SdkError> {
        self.get("capabilities", &[]).await
    }

    /// `/api/v1/search`.
    pub async fn search(
        &self,
        query: &str,
        limit: u32,
    ) -> Result<ApiEnvelope<SearchResponse>, SdkError> {
        self.get(
            "search",
            &[("q", query.to_owned()), ("limit", limit.to_string())],
        )
        .await
    }

    /// `/api/v1/stats`.
    pub async fn stats(&self) -> Result<ApiEnvelope<ChainStatsResponse>, SdkError> {
        self.get("stats", &[]).await
    }

    /// `/api/v1/blocks/{block}`.
    pub async fn block(&self, block: BlockSelector) -> Result<ApiEnvelope<ApiBlockData>, SdkError> {
        self.get(&format!("blocks/{}", block_path(block)), &[])
            .await
    }

    /// `/api/v1/blocks/{block}/transactions`.
    pub async fn block_transactions(
        &self,
        block: BlockSelector,
        page: u32,
        limit: u32,
    ) -> Result<ApiEnvelope<ApiBlockTransactionsData>, SdkError> {
        self.get(
            &format!("blocks/{}/transactions", block_path(block)),
            &[("page", page.to_string()), ("limit", limit.to_string())],
        )
        .await
    }

    /// `/api/v1/transactions`.
    pub async fn transactions(
        &self,
        limit: u32,
        cursor: Option<&str>,
    ) -> Result<ApiEnvelope<TxFeedResponse>, SdkError> {
        let mut query = vec![("limit", limit.to_string())];
        if let Some(cursor) = cursor {
            query.push(("cursor", cursor.to_owned()));
        }
        self.get("transactions", &query).await
    }

    /// `/api/v1/transactions/{hash}`.
    pub async fn transaction(
        &self,
        hash: &str,
    ) -> Result<ApiEnvelope<ApiTransactionData>, SdkError> {
        self.get(&format!("transactions/{hash}"), &[]).await
    }

    /// `/api/v1/transactions/{hash}/receipt`.
    pub async fn transaction_receipt(
        &self,
        hash: &str,
    ) -> Result<ApiEnvelope<ApiTransactionReceiptData>, SdkError> {
        self.get(&format!("transactions/{hash}/receipt"), &[]).await
    }

    /// `/api/v1/transactions/{hash}/native-receipt`.
    pub async fn transaction_native_receipt(
        &self,
        hash: &str,
    ) -> Result<ApiEnvelope<NativeReceiptResponse>, SdkError> {
        self.get(&format!("transactions/{hash}/native-receipt"), &[])
            .await
    }

    /// `/api/v1/addresses/{address}/profile`.
    pub async fn address_profile(
        &self,
        address: &str,
    ) -> Result<ApiEnvelope<AddressProfileResponse>, SdkError> {
        self.get(&format!("addresses/{address}/profile"), &[]).await
    }

    /// `/api/v1/addresses/{address}/flow`.
    pub async fn address_flow(
        &self,
        address: &str,
        limit: u32,
    ) -> Result<ApiEnvelope<AddressFlowResponse>, SdkError> {
        self.get(
            &format!("addresses/{address}/flow"),
            &[("limit", limit.to_string())],
        )
        .await
    }

    /// `/api/v1/addresses/{address}/activity`.
    pub async fn address_activity(
        &self,
        address: &str,
        limit: u32,
        cursor: Option<&str>,
    ) -> Result<ApiEnvelope<ApiAddressActivityData>, SdkError> {
        let mut query = vec![("limit", limit.to_string())];
        if let Some(cursor) = cursor {
            query.push(("cursor", cursor.to_owned()));
        }
        self.get(&format!("addresses/{address}/activity"), &query)
            .await
    }

    /// `/api/v1/addresses/{address}/activity-kind`.
    pub async fn address_activity_kind(
        &self,
        address: &str,
    ) -> Result<ApiEnvelope<ApiAddressActivityKindData>, SdkError> {
        self.get(&format!("addresses/{address}/activity-kind"), &[])
            .await
    }

    /// `/api/v1/clusters`.
    pub async fn clusters(
        &self,
        page: u32,
        limit: u32,
    ) -> Result<ApiEnvelope<ApiClustersData>, SdkError> {
        self.get(
            "clusters",
            &[("page", page.to_string()), ("limit", limit.to_string())],
        )
        .await
    }

    /// `/api/v1/clusters/{cluster_id}`.
    pub async fn cluster(&self, cluster_id: u32) -> Result<ApiEnvelope<ApiClusterData>, SdkError> {
        self.get(&format!("clusters/{cluster_id}"), &[]).await
    }

    /// `/api/v1/operators/{operator_id}`.
    pub async fn operator(
        &self,
        operator_id: &str,
    ) -> Result<ApiEnvelope<ApiOperatorData>, SdkError> {
        self.get(&format!("operators/{operator_id}"), &[]).await
    }

    /// `/api/v1/markets`.
    pub async fn markets(&self, limit: u32) -> Result<ApiEnvelope<ClobMarketsResponse>, SdkError> {
        self.get("markets", &[("limit", limit.to_string())]).await
    }

    /// `/api/v1/markets/{market_id}`.
    pub async fn market(
        &self,
        market_id: &str,
    ) -> Result<ApiEnvelope<ClobMarketResponse>, SdkError> {
        self.get(&format!("markets/{market_id}"), &[]).await
    }

    /// `/api/v1/markets/{market_id}/trades`.
    pub async fn market_trades(
        &self,
        market_id: &str,
        limit: u32,
        cursor: Option<&str>,
    ) -> Result<ApiEnvelope<ClobTradesResponse>, SdkError> {
        let mut query = vec![("limit", limit.to_string())];
        if let Some(cursor) = cursor {
            query.push(("cursor", cursor.to_owned()));
        }
        self.get(&format!("markets/{market_id}/trades"), &query)
            .await
    }

    /// `/api/v1/markets/{market_id}/ohlc`.
    pub async fn market_ohlc(
        &self,
        market_id: &str,
        from_block: Option<u64>,
        to_block: Option<u64>,
        bucket_blocks: Option<u64>,
    ) -> Result<ApiEnvelope<ClobOhlcResponse>, SdkError> {
        let mut query = Vec::new();
        if let Some(from_block) = from_block {
            query.push(("fromBlock", from_block.to_string()));
        }
        if let Some(to_block) = to_block {
            query.push(("toBlock", to_block.to_string()));
        }
        if let Some(bucket_blocks) = bucket_blocks {
            query.push(("bucketBlocks", bucket_blocks.to_string()));
        }
        self.get(&format!("markets/{market_id}/ohlc"), &query).await
    }

    /// `/api/v1/markets/{market_id}/orderbook`.
    pub async fn market_order_book(
        &self,
        market_id: &str,
        levels: u32,
    ) -> Result<ApiEnvelope<ClobOrderBookResponse>, SdkError> {
        self.get(
            &format!("markets/{market_id}/orderbook"),
            &[("levels", levels.to_string())],
        )
        .await
    }

    /// `/api/v1/upgrades/status`.
    pub async fn upgrade_status(
        &self,
        height: Option<BlockSelector>,
    ) -> Result<ApiEnvelope<ApiUpgradeStatusData>, SdkError> {
        let query = height
            .map(|height| vec![("height", block_path(height))])
            .unwrap_or_default();
        self.get("upgrades/status", &query).await
    }

    async fn get_inner<R>(
        &self,
        path: &str,
        query: &[(&str, String)],
        allow_unavailable_body: bool,
    ) -> Result<R, SdkError>
    where
        R: DeserializeOwned,
    {
        let url = build_url(&self.inner.base_url, path, query)?;
        let resp = self.inner.http.get(url).send().await?;
        let status = resp.status();
        let value: Value = resp.json().await?;
        if let Some(err) = value.get("error") {
            let code = err.get("code").and_then(Value::as_i64).unwrap_or(0);
            let message = err
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or("(no message)")
                .to_owned();
            let data = err.get("data").cloned();
            return Err(SdkError::Rpc {
                code,
                message,
                data,
            });
        }
        if !(status.is_success() || allow_unavailable_body && status.as_u16() == 503) {
            return Err(SdkError::Malformed(format!(
                "HTTP {status} with no API error envelope"
            )));
        }
        Ok(serde_json::from_value(value)?)
    }
}

/// Derive the `/api/v1` endpoint from a node JSON-RPC URL.
///
/// # Errors
///
/// Returns [`SdkError::InvalidEndpoint`] when `endpoint` is empty or not
/// an absolute URL.
pub fn api_endpoint_from_rpc_endpoint(endpoint: &str) -> Result<String, SdkError> {
    let trimmed = endpoint.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err(SdkError::InvalidEndpoint("endpoint cannot be empty".into()));
    }
    if trimmed.ends_with("/api/v1") {
        return Ok(trimmed.to_owned());
    }

    let mut url = Url::parse(trimmed).map_err(|e| SdkError::InvalidEndpoint(e.to_string()))?;
    let path = url.path().trim_end_matches('/');
    if path.is_empty() || path == "/" || path == "/rpc" {
        url.set_path("/api/v1");
    } else if let Some(prefix) = path.strip_suffix("/rpc") {
        url.set_path(&format!("{prefix}/api/v1"));
    } else {
        url.set_path("/api/v1");
    }
    url.set_query(None);
    url.set_fragment(None);
    Ok(url.to_string().trim_end_matches('/').to_owned())
}

fn build_url(base_url: &str, path: &str, query: &[(&str, String)]) -> Result<Url, SdkError> {
    let mut url = Url::parse(base_url).map_err(|e| SdkError::InvalidEndpoint(e.to_string()))?;
    let base_path = url.path().trim_end_matches('/');
    let path = path.trim_start_matches('/');
    url.set_path(&format!("{base_path}/{path}"));
    if !query.is_empty() {
        let mut pairs = url.query_pairs_mut();
        for (k, v) in query {
            pairs.append_pair(k, v);
        }
    }
    Ok(url)
}

fn block_path(block: BlockSelector) -> String {
    match block.to_param() {
        Value::String(s) => s,
        other => other.to_string(),
    }
}

/// Shared success envelope for most `/api/v1` endpoints.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiEnvelope<T> {
    pub schema_version: u32,
    pub chain_id: u64,
    pub genesis_hash: Option<String>,
    pub latest: ApiLatestAnchor,
    pub data: T,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiLatestAnchor {
    pub available: bool,
    pub height: Option<u64>,
    pub block_hash: Option<String>,
    pub state_root: Option<String>,
    pub timestamp: Option<u64>,
    pub error: Option<ApiInlineError>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiInlineError {
    pub code: i64,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiHealthResponse {
    pub schema_version: u32,
    pub status: String,
    pub chain_id: u64,
    pub latest: ApiLatestAnchor,
    pub api: ApiStatusBlock,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiStatusBlock {
    pub enabled: bool,
    pub version: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiCapabilitiesResponse {
    pub schema_version: u32,
    pub chain_id: u64,
    pub genesis_hash: Option<String>,
    pub client_version: String,
    pub latest: ApiLatestAnchor,
    pub api: ApiLinks,
    pub json_rpc: ApiJsonRpcInfo,
    pub indexer: ApiIndexerStatus,
    pub rate_limit: ApiRateLimit,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiLinks {
    pub enabled: bool,
    pub version: String,
    pub docs: String,
    pub openapi: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiJsonRpcInfo {
    pub endpoint: String,
    pub web_socket: String,
    pub protocol_version: String,
    pub debug_enabled: bool,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiIndexerStatus {
    pub enabled: bool,
    #[serde(default)]
    pub current_height: Option<u64>,
    #[serde(default)]
    pub latest_height: Option<u64>,
    #[serde(default)]
    pub schema_version: Option<u32>,
    #[serde(default)]
    pub retention: Option<Value>,
    #[serde(default)]
    pub error: Option<ApiInlineError>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiRateLimit {
    pub per_ip: ApiRateLimitBucket,
    pub api_keys_configured: bool,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiRateLimitBucket {
    pub rate_per_sec: u64,
    pub burst: u64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiBlockHeader {
    pub height: u64,
    pub block_hash: String,
    pub parent_hash: String,
    pub state_root: String,
    pub timestamp: u64,
    pub gas_used: u64,
    pub gas_limit: u64,
    pub base_fee_per_gas: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiLogEntry {
    pub address: String,
    pub topics: Vec<String>,
    pub data: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiTransactionView {
    pub tx_hash: String,
    pub block_hash: String,
    pub block_height: u64,
    pub tx_index: u32,
    pub from: String,
    pub to: Option<String>,
    pub nonce: u64,
    pub value: String,
    pub max_fee_per_gas: String,
    pub max_priority_fee_per_gas: String,
    pub gas_limit: u64,
    pub input: String,
    pub signed_envelope: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiTransactionReceipt {
    pub tx_hash: String,
    pub block_hash: String,
    pub block_height: u64,
    pub tx_index: u32,
    pub status: u8,
    pub gas_used: u64,
    pub logs: Vec<ApiLogEntry>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiAddressActivityEntry {
    pub block_height: u64,
    pub tx_index: u32,
    pub log_index: u32,
    pub kind: String,
    pub direction: Option<String>,
    pub counterparty: Option<String>,
    pub token_id: Option<String>,
    pub amount: Option<String>,
    pub cluster: Option<u32>,
    pub weight_bps: Option<u16>,
    pub sub_kind: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiBlockData {
    pub block: ApiBlockHeader,
    pub transaction_count: usize,
    pub transaction_hashes: Vec<String>,
    pub source: Value,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiBlockTransactionsData {
    pub block: ApiBlockHeader,
    pub page: u32,
    pub limit: u32,
    pub total_transactions: usize,
    pub transactions: Vec<ApiTransactionView>,
    pub source: Value,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiTransactionData {
    pub transaction: ApiTransactionView,
    pub receipt: Option<ApiTransactionReceipt>,
    pub source: Value,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiTransactionReceiptData {
    pub receipt: ApiTransactionReceipt,
    pub source: Value,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiAddressActivityData {
    pub address: String,
    pub limit: u32,
    pub entries: Vec<ApiAddressActivityEntry>,
    pub indexer: ApiIndexerStatus,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiAddressActivityKindSummary {
    pub kind: String,
    #[serde(default)]
    pub retention: Option<Value>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiAddressActivityKindData {
    pub address: String,
    pub activity: ApiAddressActivityKindSummary,
    pub indexer: ApiIndexerStatus,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiClusterDirectoryEntry {
    pub cluster_id: u32,
    pub size: u32,
    pub threshold: u32,
    pub aggregate_health: String,
    pub region_diversity: Option<Vec<String>>,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiClusterDirectoryPage {
    pub page: u32,
    pub limit: u32,
    pub total_clusters: u32,
    pub clusters: Vec<ApiClusterDirectoryEntry>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiClustersData {
    pub clusters: ApiClusterDirectoryPage,
    pub source: Value,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiClusterMember {
    pub operator_id: String,
    pub bls_pubkey: String,
    pub state: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiClusterStatus {
    pub cluster_id: u32,
    pub threshold: u32,
    pub size: u32,
    pub live: u32,
    pub lagging: u32,
    pub offline: u32,
    pub maintenance: u32,
    pub members: Vec<ApiClusterMember>,
    pub epoch: Option<u64>,
    pub round: Option<u64>,
    pub quorum: String,
    pub reputation_score: Option<u32>,
    pub liveness_score: Option<u32>,
    pub last_update_height: u64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiClusterData {
    pub cluster: ApiClusterStatus,
    pub source: Value,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiOperatorInfo {
    pub operator_id: String,
    pub moniker: Option<String>,
    pub alias: Option<String>,
    pub chain_address: String,
    pub bonded: bool,
    pub commission_bps: Option<u32>,
    pub delegation_count: Option<u32>,
    pub bonded_amount: String,
    pub active_cluster_ids: Vec<u32>,
    pub operator_key_fingerprint: Option<String>,
    pub bls_key_fingerprint: Option<String>,
    pub lifecycle_state: String,
    pub capability: serde_json::Map<String, Value>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiOperatorData {
    pub operator: ApiOperatorInfo,
    pub source: Value,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiUpgradePlanStatus {
    pub upgrade_id: String,
    pub activation_height: u64,
    pub activation_round: Option<u64>,
    pub required_binary_version: String,
    pub expected_binary_digest: String,
    pub p2p_protocol_version: u32,
    pub required_features: Vec<String>,
    pub milestone_file_digest: Option<String>,
    pub state_migration_id: Option<String>,
    pub state_migration_hash: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiUpgradeStatus {
    pub block_height: u64,
    pub configured: bool,
    pub plan_count: usize,
    pub active: Option<ApiUpgradePlanStatus>,
    pub pending: Vec<ApiUpgradePlanStatus>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiUpgradeStatusData {
    pub upgrade: ApiUpgradeStatus,
    pub source: Value,
}

#[cfg(test)]
mod tests {
    use super::{api_endpoint_from_rpc_endpoint, build_url};

    #[test]
    fn derives_api_endpoint_from_rpc_endpoint() {
        assert_eq!(
            api_endpoint_from_rpc_endpoint("https://rpc.testnet.monolythium.com").unwrap(),
            "https://rpc.testnet.monolythium.com/api/v1"
        );
        assert_eq!(
            api_endpoint_from_rpc_endpoint("https://rpc.testnet.monolythium.com/rpc").unwrap(),
            "https://rpc.testnet.monolythium.com/api/v1"
        );
        assert_eq!(
            api_endpoint_from_rpc_endpoint("https://x.example/api/v1/").unwrap(),
            "https://x.example/api/v1"
        );
    }

    #[test]
    fn build_url_preserves_new_resource_queries() {
        let url = build_url(
            "https://rpc.example/api/v1",
            "markets/0xabc/ohlc",
            &[
                ("fromBlock", "90".to_owned()),
                ("toBlock", "100".to_owned()),
                ("bucketBlocks", "10".to_owned()),
            ],
        )
        .unwrap();
        assert_eq!(
            url.as_str(),
            "https://rpc.example/api/v1/markets/0xabc/ohlc?fromBlock=90&toBlock=100&bucketBlocks=10"
        );
    }
}
