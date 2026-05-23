//! HTTP client for the explorer-facing `/api/v1` surface served by
//! `mono-core`.
//!
//! JSON-RPC methods live on [`crate::RpcClient`]. This client covers the
//! REST-shaped node API used by explorers, wallets, and status pages.

use std::sync::Arc;

use reqwest::Url;
use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::to_string;
use serde_json::Value;

use crate::bridge::{BridgeRoutesRequest, BridgeRoutesResponse};
use crate::error::SdkError;
use crate::types::{
    native_events_from_receipt, native_market_events_filter, native_market_events_from_receipt,
    typed_native_events_from_response, AddressFlowResponse, AddressProfileResponse, BlockSelector,
    ChainStatsResponse, ClobMarketResponse, ClobMarketsResponse, ClobOhlcResponse,
    ClobOrderBookResponse, ClobTradesResponse, MrcAccountResponse, MrcHoldersResponse,
    MrcMetadataResponse, NativeAgentStateFilter, NativeAgentStateResponse, NativeEventFilter,
    NativeEventsFilter, NativeEventsResponse, NativeMarketStateFilter, NativeMarketStateResponse,
    NativeReceiptFee, NativeReceiptResponse, PendingRewardsResponse, RedemptionQueueResponse,
    SearchResponse, TxFeedResponse, TypedNativeEventsResponse, TypedNativeReceiptEvent,
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

    /// Typed native event rows from `/transactions/{hash}/native-receipt`.
    ///
    /// This helper consumes the existing native receipt API route and
    /// returns its envelope metadata with `data` replaced by the filtered
    /// event rows.
    pub async fn transaction_native_receipt_events<TDecoded>(
        &self,
        hash: &str,
        filter: NativeEventFilter<'_>,
    ) -> Result<ApiEnvelope<Vec<TypedNativeReceiptEvent<TDecoded>>>, SdkError>
    where
        TDecoded: DeserializeOwned,
    {
        let receipt = self.transaction_native_receipt(hash).await?;
        Ok(ApiEnvelope {
            schema_version: receipt.schema_version,
            chain_id: receipt.chain_id,
            genesis_hash: receipt.genesis_hash,
            latest: receipt.latest,
            data: native_events_from_receipt::<TDecoded>(&receipt.data, filter)?,
        })
    }

    /// Typed native market event rows from `/transactions/{hash}/native-receipt`.
    pub async fn transaction_native_receipt_market_events<TDecoded>(
        &self,
        hash: &str,
        filter: NativeEventFilter<'_>,
    ) -> Result<ApiEnvelope<Vec<TypedNativeReceiptEvent<TDecoded>>>, SdkError>
    where
        TDecoded: DeserializeOwned,
    {
        let receipt = self.transaction_native_receipt(hash).await?;
        Ok(ApiEnvelope {
            schema_version: receipt.schema_version,
            chain_id: receipt.chain_id,
            genesis_hash: receipt.genesis_hash,
            latest: receipt.latest,
            data: native_market_events_from_receipt::<TDecoded>(&receipt.data, filter)?,
        })
    }

    /// `/api/v1/native-events`.
    pub async fn native_events(
        &self,
        filter: NativeEventsFilter<'_>,
    ) -> Result<ApiEnvelope<NativeEventsResponse>, SdkError> {
        self.get("native-events", &filter.to_query_pairs()).await
    }

    /// `/api/v1/native-events` with decoded rows converted into a caller-selected type.
    pub async fn native_events_typed<TDecoded>(
        &self,
        filter: NativeEventsFilter<'_>,
    ) -> Result<ApiEnvelope<TypedNativeEventsResponse<TDecoded>>, SdkError>
    where
        TDecoded: DeserializeOwned,
    {
        let response = self.native_events(filter).await?;
        Ok(ApiEnvelope {
            schema_version: response.schema_version,
            chain_id: response.chain_id,
            genesis_hash: response.genesis_hash,
            latest: response.latest,
            data: typed_native_events_from_response::<TDecoded>(&response.data)?,
        })
    }

    /// `/api/v1/native-events` restricted to native marketplace event rows.
    pub async fn native_market_events(
        &self,
        filter: NativeEventsFilter<'_>,
    ) -> Result<ApiEnvelope<NativeEventsResponse>, SdkError> {
        self.native_events(native_market_events_filter(filter))
            .await
    }

    /// `/api/v1/native-events` market rows converted into a caller-selected type.
    pub async fn native_market_events_typed<TDecoded>(
        &self,
        filter: NativeEventsFilter<'_>,
    ) -> Result<ApiEnvelope<TypedNativeEventsResponse<TDecoded>>, SdkError>
    where
        TDecoded: DeserializeOwned,
    {
        let response = self.native_market_events(filter).await?;
        Ok(ApiEnvelope {
            schema_version: response.schema_version,
            chain_id: response.chain_id,
            genesis_hash: response.genesis_hash,
            latest: response.latest,
            data: typed_native_events_from_response::<TDecoded>(&response.data)?,
        })
    }

    /// `/api/v1/native-agent-state`.
    pub async fn native_agent_state(
        &self,
        filter: NativeAgentStateFilter<'_>,
    ) -> Result<ApiEnvelope<NativeAgentStateResponse>, SdkError> {
        self.get("native-agent-state", &filter.to_query_pairs())
            .await
    }

    /// `/api/v1/native-market-state`.
    pub async fn native_market_state(
        &self,
        filter: NativeMarketStateFilter<'_>,
    ) -> Result<ApiEnvelope<NativeMarketStateResponse>, SdkError> {
        self.get("native-market-state", &filter.to_query_pairs())
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

    /// `/api/v1/addresses/{address}/pending-rewards`.
    pub async fn address_pending_rewards(
        &self,
        address: &str,
        block: Option<BlockSelector>,
    ) -> Result<ApiEnvelope<PendingRewardsResponse>, SdkError> {
        let query = block.map_or_else(Vec::new, |block| vec![("block", block_path(block))]);
        self.get(&format!("addresses/{address}/pending-rewards"), &query)
            .await
    }

    /// `/api/v1/addresses/{address}/redemption-queue`.
    pub async fn address_redemption_queue(
        &self,
        address: &str,
        block: Option<BlockSelector>,
    ) -> Result<ApiEnvelope<RedemptionQueueResponse>, SdkError> {
        let query = block.map_or_else(Vec::new, |block| vec![("block", block_path(block))]);
        self.get(&format!("addresses/{address}/redemption-queue"), &query)
            .await
    }

    /// `/api/v1/assets/{token_id}/metadata`.
    pub async fn asset_mrc_metadata(
        &self,
        asset_id: &str,
        mrc_token_id: Option<&str>,
    ) -> Result<ApiEnvelope<MrcMetadataResponse>, SdkError> {
        let query = mrc_token_id.map_or_else(Vec::new, |token_id| {
            vec![("mrcTokenId", token_id.to_owned())]
        });
        self.get(&format!("assets/{asset_id}/metadata"), &query)
            .await
    }

    /// `/api/v1/mrc/accounts/{account}`.
    pub async fn mrc_account(
        &self,
        account: &str,
        limit: Option<u32>,
    ) -> Result<ApiEnvelope<MrcAccountResponse>, SdkError> {
        let query = limit.map_or_else(Vec::new, |limit| vec![("limit", limit.to_string())]);
        self.get(&format!("mrc/accounts/{account}"), &query).await
    }

    /// `/api/v1/mrc/{standard}/{asset_id}/{token_id}/holders`.
    pub async fn mrc_holders(
        &self,
        standard: &str,
        asset_id: &str,
        token_id: &str,
        limit: Option<u32>,
    ) -> Result<ApiEnvelope<MrcHoldersResponse>, SdkError> {
        let query = limit.map_or_else(Vec::new, |limit| vec![("limit", limit.to_string())]);
        self.get(
            &format!("mrc/{standard}/{asset_id}/{token_id}/holders"),
            &query,
        )
        .await
    }

    /// `/api/v1/mrc/{standard}/{asset_id}/holders`.
    ///
    /// This is the asset-scoped form used by MRC-4626 vault share balances.
    pub async fn mrc_asset_holders(
        &self,
        standard: &str,
        asset_id: &str,
        limit: Option<u32>,
    ) -> Result<ApiEnvelope<MrcHoldersResponse>, SdkError> {
        let query = limit.map_or_else(Vec::new, |limit| vec![("limit", limit.to_string())]);
        self.get(&format!("mrc/{standard}/{asset_id}/holders"), &query)
            .await
    }

    /// `/api/v1/mrc/mrc4626/{vault_id}/holders`.
    pub async fn mrc4626_holders(
        &self,
        vault_id: &str,
        limit: Option<u32>,
    ) -> Result<ApiEnvelope<MrcHoldersResponse>, SdkError> {
        self.mrc_asset_holders("mrc4626", vault_id, limit).await
    }

    /// `/api/v1/bridge/routes`.
    ///
    /// The route is read-only `GET`, so the typed request is encoded as a
    /// single JSON query value named `request`.
    pub async fn bridge_routes(
        &self,
        request: &BridgeRoutesRequest,
    ) -> Result<ApiEnvelope<BridgeRoutesResponse>, SdkError> {
        self.get(
            "bridge/routes",
            &[("request", to_string(request).map_err(SdkError::Serde)?)],
        )
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
    pub execution_units_used: u64,
    pub execution_unit_limit: u64,
    pub base_price_per_cycle_lythoshi: String,
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
    pub value_lythoshi: String,
    pub max_execution_fee_lythoshi: String,
    pub priority_tip_lythoshi: String,
    pub execution_unit_limit: u64,
    pub fee: NativeReceiptFee,
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
    pub execution_units_used: u64,
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
    use super::{api_endpoint_from_rpc_endpoint, build_url, ApiClient};
    use crate::types::{NativeAgentStateFilter, NativeEventsFilter, NativeMarketStateFilter};
    use serde_json::{json, Value};
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::thread::{self, JoinHandle};

    fn spawn_api_server(body: Value) -> (String, JoinHandle<String>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let endpoint = format!("http://{}/api/v1", listener.local_addr().unwrap());
        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut buf = [0_u8; 8192];
            let n = stream.read(&mut buf).unwrap();
            let request = String::from_utf8_lossy(&buf[..n]).into_owned();
            let body = body.to_string();
            let response = format!(
                "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\n\r\n{}",
                body.len(),
                body
            );
            stream.write_all(response.as_bytes()).unwrap();
            request.lines().next().unwrap_or_default().to_owned()
        });
        (endpoint, handle)
    }

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

    #[test]
    fn build_url_encodes_pending_rewards_block_query() {
        let url = build_url(
            "https://rpc.example/api/v1",
            "addresses/mono1wallet/pending-rewards",
            &[("block", "0x63".to_owned())],
        )
        .unwrap();
        assert_eq!(
            url.as_str(),
            "https://rpc.example/api/v1/addresses/mono1wallet/pending-rewards?block=0x63"
        );
    }

    #[test]
    fn build_url_encodes_redemption_queue_block_query() {
        let url = build_url(
            "https://rpc.example/api/v1",
            "addresses/mono1wallet/redemption-queue",
            &[("block", "0x63".to_owned())],
        )
        .unwrap();
        assert_eq!(
            url.as_str(),
            "https://rpc.example/api/v1/addresses/mono1wallet/redemption-queue?block=0x63"
        );
    }

    #[test]
    fn build_url_encodes_mrc_metadata_token_query() {
        let asset_id = format!("0x{}", "bb".repeat(32));
        let token_id = format!("0x{}", "cc".repeat(32));
        let url = build_url(
            "https://rpc.example/api/v1",
            &format!("assets/{asset_id}/metadata"),
            &[("mrcTokenId", token_id.clone())],
        )
        .unwrap();
        assert_eq!(
            url.as_str(),
            format!("https://rpc.example/api/v1/assets/{asset_id}/metadata?mrcTokenId={token_id}")
        );
    }

    #[test]
    fn build_url_encodes_mrc_holders_limit_query() {
        let asset_id = format!("0x{}", "bb".repeat(32));
        let token_id = format!("0x{}", "cc".repeat(32));
        let url = build_url(
            "https://rpc.example/api/v1",
            &format!("mrc/mrc1155/{asset_id}/{token_id}/holders"),
            &[("limit", "5".to_owned())],
        )
        .unwrap();
        assert_eq!(
            url.as_str(),
            format!("https://rpc.example/api/v1/mrc/mrc1155/{asset_id}/{token_id}/holders?limit=5")
        );

        let vault_url = build_url(
            "https://rpc.example/api/v1",
            &format!("mrc/mrc4626/{asset_id}/holders"),
            &[("limit", "10".to_owned())],
        )
        .unwrap();
        assert_eq!(
            vault_url.as_str(),
            format!("https://rpc.example/api/v1/mrc/mrc4626/{asset_id}/holders?limit=10")
        );
    }

    #[test]
    fn build_url_encodes_mrc_account_limit_query() {
        let account = "monos1effvdw0d05a35j69wwxplhmctpcclx382n60yf";
        let url = build_url(
            "https://rpc.example/api/v1",
            &format!("mrc/accounts/{account}"),
            &[("limit", "2".to_owned())],
        )
        .unwrap();
        assert_eq!(
            url.as_str(),
            format!("https://rpc.example/api/v1/mrc/accounts/{account}?limit=2")
        );
    }

    #[tokio::test]
    async fn mrc_account_gets_rest_route_and_decodes_response() {
        let account = "monos1effvdw0d05a35j69wwxplhmctpcclx382n60yf";
        let controller = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let recovery = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let asset_id = format!("0x{}", "bb".repeat(32));
        let policy_hash = format!("0x{}", "44".repeat(32));
        let (endpoint, server) = spawn_api_server(json!({
            "schemaVersion": 1,
            "chainId": 69420,
            "genesisHash": format!("0x{}", "00".repeat(32)),
            "latest": {
                "available": true,
                "height": 100,
                "blockHash": format!("0x{}", "11".repeat(32)),
                "stateRoot": format!("0x{}", "22".repeat(32)),
                "timestamp": 123
            },
            "data": {
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
            }
        }));
        let client = ApiClient::new(endpoint).unwrap();

        let response = client.mrc_account(account, Some(2)).await.unwrap();

        assert_eq!(response.data.account, account);
        assert_eq!(response.data.spend_limit, 2);
        let smart = response.data.smart_account.as_ref().expect("smart account");
        assert_eq!(smart.controller, controller);
        assert_eq!(smart.recovery.as_deref(), Some(recovery));
        assert_eq!(smart.policy_hash, None);
        let policy = response
            .data
            .policy_account
            .as_ref()
            .expect("policy account");
        assert_eq!(policy.policy_hash.as_deref(), Some(policy_hash.as_str()));
        let policy_body = policy.policy.as_ref().expect("policy body");
        assert_eq!(policy_body.per_action_limit, "20");
        assert_eq!(policy_body.window_limit, "100");
        assert_eq!(policy_body.allowed_assets, vec![asset_id.clone()]);
        assert_eq!(response.data.policy_spends[0].spent, "250");
        let request_line = server.join().unwrap();
        assert_eq!(
            request_line,
            format!("GET /api/v1/mrc/accounts/{account}?limit=2 HTTP/1.1")
        );
    }

    #[tokio::test]
    async fn mrc_holders_gets_rest_route_and_decodes_response() {
        let asset_id = format!("0x{}", "bb".repeat(32));
        let token_id = format!("0x{}", "cc".repeat(32));
        let address = "0x1111111111111111111111111111111111111111";
        let (endpoint, server) = spawn_api_server(json!({
            "schemaVersion": 1,
            "chainId": 69420,
            "genesisHash": format!("0x{}", "00".repeat(32)),
            "latest": {
                "available": true,
                "height": 100,
                "blockHash": format!("0x{}", "11".repeat(32)),
                "stateRoot": format!("0x{}", "22".repeat(32)),
                "timestamp": 123
            },
            "data": {
                "schemaVersion": 1,
                "standard": "mrc1155",
                "assetId": asset_id,
                "tokenId": token_id,
                "limit": 5,
                "holders": [
                    {
                        "rank": 1,
                        "address": address,
                        "balance": "42",
                        "updatedAtBlock": 91
                    }
                ]
            }
        }));
        let client = ApiClient::new(endpoint).unwrap();

        let response = client
            .mrc_holders("mrc1155", &asset_id, &token_id, Some(5))
            .await
            .unwrap();

        assert_eq!(response.data.standard, "mrc1155");
        assert_eq!(response.data.holders[0].balance, "42");
        let request_line = server.join().unwrap();
        assert_eq!(
            request_line,
            format!("GET /api/v1/mrc/mrc1155/{asset_id}/{token_id}/holders?limit=5 HTTP/1.1")
        );
    }

    #[tokio::test]
    async fn mrc4626_holders_gets_asset_scoped_rest_route() {
        let vault_id = format!("0x{}", "bb".repeat(32));
        let address = "0x1111111111111111111111111111111111111111";
        let (endpoint, server) = spawn_api_server(json!({
            "schemaVersion": 1,
            "chainId": 69420,
            "genesisHash": format!("0x{}", "00".repeat(32)),
            "latest": {
                "available": true,
                "height": 100,
                "blockHash": format!("0x{}", "11".repeat(32)),
                "stateRoot": format!("0x{}", "22".repeat(32)),
                "timestamp": 123
            },
            "data": {
                "schemaVersion": 1,
                "standard": "mrc4626",
                "assetId": vault_id,
                "tokenId": null,
                "limit": 10,
                "holders": [
                    {
                        "rank": 1,
                        "address": address,
                        "balance": "700",
                        "updatedAtBlock": 92
                    }
                ]
            }
        }));
        let client = ApiClient::new(endpoint).unwrap();

        let response = client.mrc4626_holders(&vault_id, Some(10)).await.unwrap();

        assert_eq!(response.data.standard, "mrc4626");
        assert_eq!(response.data.token_id, None);
        assert_eq!(response.data.holders[0].balance, "700");
        let request_line = server.join().unwrap();
        assert_eq!(
            request_line,
            format!("GET /api/v1/mrc/mrc4626/{vault_id}/holders?limit=10 HTTP/1.1")
        );
    }

    #[test]
    fn build_url_encodes_bridge_routes_request_query() {
        let request = serde_json::json!({
            "intent": {
                "asset": "USDC",
                "amountAtomic": "1000000",
                "sourceChain": "Ethereum",
                "destinationChain": "Mono",
                "recipient": "mono1recipient"
            },
            "routeDisclosures": []
        })
        .to_string();
        let url = build_url(
            "https://rpc.example/api/v1",
            "bridge/routes",
            &[("request", request)],
        )
        .unwrap();

        assert!(url
            .as_str()
            .starts_with("https://rpc.example/api/v1/bridge/routes?request="));
        assert!(url.as_str().contains("%22routeDisclosures%22%3A%5B%5D"));
    }

    #[test]
    fn build_url_encodes_native_events_query_filters() {
        let event_topic = format!("0x{}", "11".repeat(32));
        let primary_id = format!("0x{}", "77".repeat(32));
        let url = build_url(
            "https://rpc.example/api/v1",
            "native-events",
            &NativeEventsFilter::new(100, 105)
                .limit(10)
                .tx_index(0)
                .log_index(1)
                .address("monos1nativeeventemitter")
                .event_topic(&event_topic)
                .family("agent")
                .event_name("agent.escrow.created")
                .primary_id(&primary_id)
                .account("mono1agentconsumer")
                .counterparty("mono1agentcounterparty")
                .to_query_pairs(),
        )
        .unwrap();

        assert_eq!(
            url.as_str(),
            format!(
                "https://rpc.example/api/v1/native-events?fromBlock=100&toBlock=105&limit=10&txIndex=0&logIndex=1&address=monos1nativeeventemitter&eventTopic={event_topic}&family=agent&eventName=agent.escrow.created&primaryId={primary_id}&account=mono1agentconsumer&counterparty=mono1agentcounterparty"
            )
        );
    }

    #[test]
    fn build_url_encodes_native_agent_state_query() {
        let url = build_url(
            "https://rpc.example/api/v1",
            "native-agent-state",
            &NativeAgentStateFilter::new()
                .account("mono1agentconsumer")
                .include_policy_spends(true)
                .limit(5)
                .to_query_pairs(),
        )
        .unwrap();

        assert_eq!(
            url.as_str(),
            format!(
                "https://rpc.example/api/v1/native-agent-state?account=mono1agentconsumer&includePolicySpends=true&limit=5"
            )
        );
    }

    #[test]
    fn build_url_encodes_native_market_state_query() {
        let market_id = format!("0x{}", "aa".repeat(32));
        let url = build_url(
            "https://rpc.example/api/v1",
            "native-market-state",
            &NativeMarketStateFilter::new()
                .market_id(&market_id)
                .account("mono1agentconsumer")
                .include_spot_orders(true)
                .limit(5)
                .to_query_pairs(),
        )
        .unwrap();

        assert_eq!(
            url.as_str(),
            format!(
                "https://rpc.example/api/v1/native-market-state?marketId={market_id}&account=mono1agentconsumer&includeSpotOrders=true&limit=5"
            )
        );
    }

    #[tokio::test]
    async fn native_agent_state_gets_rest_route_and_decodes_rows() {
        let policy_id = format!("0x{}", "aa".repeat(32));
        let escrow_id = format!("0x{}", "bb".repeat(32));
        let asset_id = format!("0x{}", "cc".repeat(32));
        let terms_hash = format!("0x{}", "dd".repeat(32));
        let owner = "mono1agentowner000000000000000000000000000000";
        let controller = "mono1agentcontroller000000000000000000000000";
        let provider = "mono1agentprovider0000000000000000000000000";
        let arbiter = "mono1agentarbiter00000000000000000000000000";
        let (endpoint, server) = spawn_api_server(json!({
            "schemaVersion": 1,
            "chainId": 69420,
            "genesisHash": format!("0x{}", "00".repeat(32)),
            "latest": {
                "available": true,
                "height": 100,
                "blockHash": format!("0x{}", "11".repeat(32)),
                "stateRoot": format!("0x{}", "22".repeat(32)),
                "timestamp": 123
            },
            "data": {
                "schemaVersion": 1,
                "limit": 5,
                "filters": {
                    "policyId": null,
                    "escrowId": null,
                    "account": owner,
                    "includePolicySpends": true
                },
                "spendingPolicies": [{
                    "policyId": policy_id,
                    "owner": owner,
                    "controller": controller,
                    "assetId": asset_id,
                    "enabled": true,
                    "perActionLimit": "100",
                    "windowLimit": "500",
                    "windowSecs": 60,
                    "updatedAtBlock": 42
                }],
                "policySpends": [{
                    "policyId": policy_id,
                    "controller": controller,
                    "assetId": asset_id,
                    "window": 7,
                    "amount": "25",
                    "spent": "125",
                    "updatedAtBlock": 43
                }],
                "escrows": [{
                    "escrowId": escrow_id,
                    "buyer": owner,
                    "provider": provider,
                    "arbiter": arbiter,
                    "assetId": asset_id,
                    "amount": "1000",
                    "termsHash": terms_hash,
                    "round": 2,
                    "buyerAccepted": true,
                    "providerAccepted": false,
                    "submittedPayloadHash": null,
                    "status": "accepted",
                    "resolution": null,
                    "lastActor": owner,
                    "createdAtBlock": 40,
                    "updatedAtBlock": 44
                }],
                "source": {
                    "indexerProvider": "native_agent_state",
                    "projection": "native_agent_state"
                }
            }
        }));
        let client = ApiClient::new(endpoint).unwrap();

        let response = client
            .native_agent_state(
                NativeAgentStateFilter::new()
                    .account(owner)
                    .include_policy_spends(true)
                    .limit(5),
            )
            .await
            .unwrap();

        assert_eq!(response.data.spending_policies[0].controller, controller);
        assert_eq!(response.data.policy_spends[0].amount, "25");
        assert_eq!(response.data.escrows[0].status, "accepted");
        assert_eq!(response.data.filters.account.as_deref(), Some(owner));
        let request_line = server.join().unwrap();
        assert_eq!(
            request_line,
            format!(
                "GET /api/v1/native-agent-state?account={owner}&includePolicySpends=true&limit=5 HTTP/1.1"
            )
        );
    }

    #[tokio::test]
    async fn native_market_state_gets_rest_route_and_decodes_rows() {
        let market_id = format!("0x{}", "aa".repeat(32));
        let order_id = format!("0x{}", "bb".repeat(32));
        let listing_id = format!("0x{}", "cc".repeat(32));
        let legacy_listing_id = format!("0x{}", "cd".repeat(32));
        let collection_id = format!("0x{}", "dd".repeat(32));
        let owner = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let seller = "mono1seller0000000000000000000000000000000000";
        let royalty_recipient = "mono1royalty00000000000000000000000000000000";
        let (endpoint, server) = spawn_api_server(json!({
            "schemaVersion": 1,
            "chainId": 69420,
            "genesisHash": format!("0x{}", "00".repeat(32)),
            "latest": {
                "available": true,
                "height": 100,
                "blockHash": format!("0x{}", "11".repeat(32)),
                "stateRoot": format!("0x{}", "22".repeat(32)),
                "timestamp": 123
            },
            "data": {
                "schemaVersion": 1,
                "limit": 5,
                "filters": {
                    "marketId": market_id,
                    "orderId": null,
                    "listingId": null,
                    "collectionId": null,
                    "account": owner,
                    "includeSpotOrders": true
                },
                "spotMarkets": [{
                    "marketId": market_id,
                    "owner": owner,
                    "baseAssetId": format!("0x{}", "33".repeat(32)),
                    "quoteAssetId": format!("0x{}", "44".repeat(32)),
                    "tickSize": "10",
                    "lotSize": "5",
                    "minQuantity": "25",
                    "minNotional": "1000",
                    "tradeCount": "2",
                    "totalVolumeBase": "40",
                    "lastPrice": null,
                    "lastBlockHeight": null,
                    "createdAtBlock": 40,
                    "updatedAtBlock": 45
                }],
                "spotOrders": [{
                    "orderId": order_id,
                    "marketId": market_id,
                    "owner": owner,
                    "nonce": 9,
                    "side": "ask",
                    "price": "8",
                    "quantity": "30",
                    "remaining": "10",
                    "status": "partially_filled",
                    "expiresAtBlock": 99,
                    "updatedAtBlock": 45
                }],
                "nftListings": [
                    {
                        "listingId": listing_id,
                        "seller": seller,
                        "nonce": 12,
                        "standard": "mrc721",
                        "collectionId": collection_id,
                        "tokenId": format!("0x{}", "55".repeat(32)),
                        "quantity": "1",
                        "paymentAssetId": format!("0x{}", "66".repeat(32)),
                        "price": "700",
                        "listingKind": { "auction": { "reserve": "650" } },
                        "status": "open",
                        "expiresAtBlock": 120,
                        "highestBidder": null,
                        "highestBid": null,
                        "updatedAtBlock": 46
                    },
                    {
                        "listingId": legacy_listing_id,
                        "seller": seller,
                        "standard": "mrc721",
                        "collectionId": collection_id,
                        "tokenId": format!("0x{}", "56".repeat(32)),
                        "quantity": "1",
                        "paymentAssetId": format!("0x{}", "66".repeat(32)),
                        "price": "701",
                        "listingKind": { "auction": { "reserve": "651" } },
                        "status": "open",
                        "expiresAtBlock": 121,
                        "highestBidder": null,
                        "highestBid": null,
                        "updatedAtBlock": 47
                    }
                ],
                "collectionRoyalties": [{
                    "collectionId": collection_id,
                    "creator": owner,
                    "recipient": royalty_recipient,
                    "bps": 250,
                    "updatedAtBlock": 47
                }],
                "source": {
                    "indexerProvider": "native_market_state",
                    "projection": "native_market_state"
                }
            }
        }));
        let client = ApiClient::new(endpoint).unwrap();

        let response = client
            .native_market_state(
                NativeMarketStateFilter::new()
                    .market_id(&market_id)
                    .account(owner)
                    .include_spot_orders(true)
                    .limit(5),
            )
            .await
            .unwrap();

        assert_eq!(response.data.spot_markets[0].owner, owner);
        assert_eq!(response.data.spot_orders[0].nonce, Some(9));
        assert_eq!(response.data.spot_orders[0].side, "ask");
        assert_eq!(response.data.nft_listings[0].nonce, Some(12));
        assert_eq!(response.data.nft_listings[1].nonce, None);
        assert_eq!(
            response.data.nft_listings[0].listing_kind["auction"]["reserve"],
            "650"
        );
        assert_eq!(
            response.data.collection_royalties[0].recipient,
            royalty_recipient
        );
        assert_eq!(response.data.filters.account.as_deref(), Some(owner));
        let request_line = server.join().unwrap();
        assert_eq!(
            request_line,
            format!(
                "GET /api/v1/native-market-state?marketId={market_id}&account={owner}&includeSpotOrders=true&limit=5 HTTP/1.1"
            )
        );
    }
}
