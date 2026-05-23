//! HTTP JSON-RPC client.
//!
//! [`RpcClient`] holds a [`reqwest::Client`] and an endpoint URL. Every
//! method serializes a JSON-RPC 2.0 request, posts it, and decodes the
//! result into a strongly-typed value.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_json::{json, Value};

use crate::address::{address_to_bech32, parse_address};
use crate::error::SdkError;
use crate::mrv::{
    build_mrv_call_native_encrypted_submission, build_mrv_deploy_native_encrypted_submission,
    MrvCallNativeEncryptedSubmission, MrvCallNativeTxPlan, MrvDeployNativeEncryptedSubmission,
    MrvDeployNativeTxPlan, MrvEncryptionKey, MrvMempoolClass, MrvNativeEncryptedSubmission,
    MrvValidationError,
};
use crate::types::{
    native_events_from_receipt, typed_native_events_from_response, AccountPolicy,
    AccountProofResponse, AddressActivityEntry, AddressActivityKindResponse, AddressFlowResponse,
    AddressLabelRecord, AddressProfileResponse, AgentReputationResponse, AssetPolicy, BlockHeader,
    BlockSelector, BlsCertificateResponse, CallRequest, CapabilitiesResponse, ChainStatsResponse,
    CheckpointRecord, ClobMarketResponse, ClobMarketsResponse, ClobOhlcResponse,
    ClobOrderBookResponse, ClobTradesResponse, ClusterDelegatorsResponse, ClusterEntityResponse,
    ClusterResignationsResponse, DagParentsResponse, DagSyncStatus, DecodeTxResponse,
    DelegationCapResponse, DelegationHistoryRecord, DelegationsResponse, EncryptionKeyResponse,
    EntityRatchetResponse, FeeHistoryResponse, GapRecordsResponse, IndexerStatus,
    LythUpgradeStatusResponse, MempoolSnapshot, MeshDecodedTx, MeshSignedTxResponse, MeshTxIntent,
    MeshUnsignedTxResponse, MetricsRangeResponse, NativeEventFilter, NativeEventsFilter,
    NativeEventsResponse, NativeReceiptResponse, OperatorCapabilitiesResponse, PeerSummary,
    PeerSummaryAggregate, PendingRewardsResponse, PendingTxSummary, PrecompileDescriptor,
    RegistryRecord, RichListResponse, RoundInfo, SearchResponse, StorageProofBatch, SyncStatus,
    TokenBalanceRecord, TpmAttestationResponse, TransactionReceipt, TransactionView,
    TxFeedResponse, TxStatusResponse, TypedNativeEventsResponse, TypedNativeReceiptEvent,
    VerticesAtRoundResponse,
};

/// Result from building and submitting an encrypted MRV deploy envelope.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MrvDeployNativeEncryptedSubmitResult {
    /// Transaction hash returned by `lyth_submitEncrypted`.
    #[serde(rename = "txHash")]
    pub tx_hash: String,
    /// Validated deploy plan plus encrypted envelope material.
    pub encrypted: MrvDeployNativeEncryptedSubmission,
}

/// Result from building and submitting an encrypted MRV call envelope.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MrvCallNativeEncryptedSubmitResult {
    /// Transaction hash returned by `lyth_submitEncrypted`.
    #[serde(rename = "txHash")]
    pub tx_hash: String,
    /// Validated call plan plus encrypted envelope material.
    pub encrypted: MrvCallNativeEncryptedSubmission,
}

/// Typed JSON-RPC client for a `mono-core` node.
///
/// Cheaply cloneable — the underlying [`reqwest::Client`] manages its
/// own connection pool and request-id counter.
#[derive(Debug, Clone)]
pub struct RpcClient {
    inner: Arc<Inner>,
}

#[derive(Debug)]
struct Inner {
    http: reqwest::Client,
    endpoint: String,
    next_id: AtomicU64,
}

impl RpcClient {
    /// Build a client pointed at `endpoint` (a JSON-RPC HTTP URL).
    ///
    /// # Errors
    ///
    /// Returns [`SdkError::InvalidEndpoint`] if `endpoint` is empty
    /// or [`SdkError::Transport`] if the underlying HTTP client cannot
    /// be constructed.
    pub fn new(endpoint: impl Into<String>) -> Result<Self, SdkError> {
        let endpoint: String = endpoint.into();
        if endpoint.is_empty() {
            return Err(SdkError::InvalidEndpoint("endpoint cannot be empty".into()));
        }
        let http = reqwest::Client::builder()
            .user_agent(concat!("monolythium-core-sdk/", env!("CARGO_PKG_VERSION")))
            .build()?;
        Ok(Self {
            inner: Arc::new(Inner {
                http,
                endpoint,
                next_id: AtomicU64::new(1),
            }),
        })
    }

    /// Build a client from a pre-configured [`reqwest::Client`].
    /// Useful for callers that need custom timeouts, proxies, or TLS
    /// settings.
    ///
    /// # Errors
    ///
    /// Returns [`SdkError::InvalidEndpoint`] if `endpoint` is empty.
    pub fn with_http(http: reqwest::Client, endpoint: impl Into<String>) -> Result<Self, SdkError> {
        let endpoint: String = endpoint.into();
        if endpoint.is_empty() {
            return Err(SdkError::InvalidEndpoint("endpoint cannot be empty".into()));
        }
        Ok(Self {
            inner: Arc::new(Inner {
                http,
                endpoint,
                next_id: AtomicU64::new(1),
            }),
        })
    }

    /// Endpoint URL the client posts to.
    #[must_use]
    pub fn endpoint(&self) -> &str {
        &self.inner.endpoint
    }

    /// Send an arbitrary JSON-RPC method. Most callers should prefer
    /// the typed wrappers below; this is the escape hatch for methods
    /// the SDK does not yet wrap.
    ///
    /// # Errors
    ///
    /// Surfaces transport failures, JSON-RPC `error` payloads, and
    /// shape mismatches as [`SdkError`].
    pub async fn call<P, R>(&self, method: &str, params: P) -> Result<R, SdkError>
    where
        P: Serialize,
        R: DeserializeOwned,
    {
        let id = self.inner.next_id.fetch_add(1, Ordering::Relaxed);
        let body = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
        });
        let resp = self
            .inner
            .http
            .post(&self.inner.endpoint)
            .json(&body)
            .send()
            .await?;
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
        let Some(result) = value.get("result").cloned() else {
            if !status.is_success() {
                return Err(SdkError::Malformed(format!(
                    "HTTP {status} with no JSON-RPC result"
                )));
            }
            return Err(SdkError::Malformed(
                "response is missing both `result` and `error`".into(),
            ));
        };
        Ok(serde_json::from_value(result)?)
    }

    // ---- eth_* / net_* / web3_* ---------------------------------------

    /// `eth_chainId` — returns the configured chain id.
    pub async fn eth_chain_id(&self) -> Result<u64, SdkError> {
        let hex: String = self.call("eth_chainId", json!([])).await?;
        parse_quantity_u64(&hex)
    }

    /// `eth_blockNumber` — returns the latest committed height.
    pub async fn eth_block_number(&self) -> Result<u64, SdkError> {
        let hex: String = self.call("eth_blockNumber", json!([])).await?;
        parse_quantity_u64(&hex)
    }

    /// `eth_getBalance` — returns balance + Merkle proof envelope.
    pub async fn eth_get_balance(
        &self,
        address: &str,
        block: BlockSelector,
    ) -> Result<AccountProofResponse, SdkError> {
        self.call("eth_getBalance", json!([address, block.to_param()]))
            .await
    }

    /// `eth_getStorageAt` — returns the storage word + Merkle proof.
    pub async fn eth_get_storage_at(
        &self,
        address: &str,
        slot: &str,
        block: BlockSelector,
    ) -> Result<AccountProofResponse, SdkError> {
        self.call("eth_getStorageAt", json!([address, slot, block.to_param()]))
            .await
    }

    /// `eth_getTransactionCount` — returns the sender's nonce.
    pub async fn eth_get_transaction_count(
        &self,
        address: &str,
        block: BlockSelector,
    ) -> Result<u64, SdkError> {
        let hex: String = self
            .call(
                "eth_getTransactionCount",
                json!([address, block.to_param()]),
            )
            .await?;
        parse_quantity_u64(&hex)
    }

    /// `eth_getCode` — returns deployed bytecode (`0x` for an EOA,
    /// `0xfe` for a precompile).
    pub async fn eth_get_code(
        &self,
        address: &str,
        block: BlockSelector,
    ) -> Result<String, SdkError> {
        self.call("eth_getCode", json!([address, block.to_param()]))
            .await
    }

    /// `eth_getBlockByNumber` — fetches a block header by height/tag.
    /// Returns `None` if the block is unknown.
    pub async fn eth_get_block_by_number(
        &self,
        block: BlockSelector,
    ) -> Result<Option<BlockHeader>, SdkError> {
        self.call("eth_getBlockByNumber", json!([block.to_param()]))
            .await
    }

    /// `eth_getBlockByHash` — fetches a block header by hash. Returns
    /// `None` if unknown.
    pub async fn eth_get_block_by_hash(&self, hash: &str) -> Result<Option<BlockHeader>, SdkError> {
        self.call("eth_getBlockByHash", json!([hash])).await
    }

    /// `eth_getTransactionByHash` — fetches an included transaction by
    /// hash. Returns `None` if pending / unknown.
    pub async fn eth_get_transaction_by_hash(
        &self,
        tx_hash: &str,
    ) -> Result<Option<TransactionView>, SdkError> {
        self.call("eth_getTransactionByHash", json!([tx_hash]))
            .await
    }

    /// `eth_getTransactionReceipt` — returns the receipt for a
    /// confirmed tx, or `None` while pending / unknown.
    pub async fn eth_get_transaction_receipt(
        &self,
        tx_hash: &str,
    ) -> Result<Option<TransactionReceipt>, SdkError> {
        self.call("eth_getTransactionReceipt", json!([tx_hash]))
            .await
    }

    /// `eth_sendRawTransaction` — submits a signed raw tx (RLP /
    /// envelope hex). Returns the tx hash on admission.
    pub async fn eth_send_raw_transaction(&self, raw_tx: &str) -> Result<String, SdkError> {
        self.call("eth_sendRawTransaction", json!([raw_tx])).await
    }

    /// `eth_call` — dry-run a transaction, returning the EVM RETURN
    /// data as `0x`-hex. Reverts surface as
    /// [`SdkError::Rpc`].
    pub async fn eth_call(
        &self,
        request: &CallRequest,
        block: BlockSelector,
    ) -> Result<String, SdkError> {
        self.call("eth_call", json!([request, block.to_param()]))
            .await
    }

    /// `eth_estimateGas` — gas estimate for a dry-run.
    pub async fn eth_estimate_gas(
        &self,
        request: &CallRequest,
        block: BlockSelector,
    ) -> Result<u64, SdkError> {
        let hex: String = self
            .call("eth_estimateGas", json!([request, block.to_param()]))
            .await?;
        parse_quantity_u64(&hex)
    }

    /// `eth_gasPrice` — minimum gas price the node will accept.
    pub async fn eth_gas_price(&self) -> Result<u64, SdkError> {
        let hex: String = self.call("eth_gasPrice", json!([])).await?;
        parse_quantity_u64(&hex)
    }

    /// `eth_feeHistory` — base fee + gas-used ratio history over the
    /// last `block_count` blocks ending at `newest_block`.
    pub async fn eth_fee_history(
        &self,
        block_count: u64,
        newest_block: BlockSelector,
        reward_percentiles: &[f64],
    ) -> Result<FeeHistoryResponse, SdkError> {
        self.call(
            "eth_feeHistory",
            json!([
                format!("0x{block_count:x}"),
                newest_block.to_param(),
                reward_percentiles
            ]),
        )
        .await
    }

    /// `eth_syncing` — returns `Some(status)` while syncing, `None` if
    /// caught up.
    pub async fn eth_syncing(&self) -> Result<Option<SyncStatus>, SdkError> {
        let v: Value = self.call("eth_syncing", json!([])).await?;
        if v.is_boolean() && !v.as_bool().unwrap_or(false) {
            return Ok(None);
        }
        Ok(Some(serde_json::from_value(v)?))
    }

    /// `net_version` — chain id as a decimal string (per spec).
    pub async fn net_version(&self) -> Result<String, SdkError> {
        self.call("net_version", json!([])).await
    }

    /// `net_peerCount` — number of currently connected peers.
    pub async fn net_peer_count(&self) -> Result<u64, SdkError> {
        let hex: String = self.call("net_peerCount", json!([])).await?;
        parse_quantity_u64(&hex)
    }

    /// `net_listening` — whether the node accepts inbound peers.
    pub async fn net_listening(&self) -> Result<bool, SdkError> {
        self.call("net_listening", json!([])).await
    }

    /// `web3_clientVersion` — server's client-version string.
    pub async fn web3_client_version(&self) -> Result<String, SdkError> {
        self.call("web3_clientVersion", json!([])).await
    }

    /// `web3_sha3` — Keccak-256 of `data`.
    pub async fn web3_sha3(&self, data: &str) -> Result<String, SdkError> {
        self.call("web3_sha3", json!([data])).await
    }

    // ---- lyth_* (Law §13.2 native namespace) --------------------------

    /// `lyth_listProviders` — paged registry enumeration.
    /// `cursor` is opaque; pass the previous page's last cursor
    /// (or `None` for the first page).
    pub async fn lyth_list_providers(
        &self,
        capability_mask: u32,
        cursor: Option<&str>,
        limit: u32,
    ) -> Result<Vec<RegistryRecord>, SdkError> {
        self.call(
            "lyth_listProviders",
            json!([capability_mask, cursor, limit]),
        )
        .await
    }

    /// `lyth_getRegistration` — single registry lookup.
    pub async fn lyth_get_registration(
        &self,
        peer_id: &str,
    ) -> Result<Option<RegistryRecord>, SdkError> {
        self.call("lyth_getRegistration", json!([peer_id])).await
    }

    /// `lyth_registryStateProof` — Merkle proof for a registry entry.
    pub async fn lyth_registry_state_proof(
        &self,
        peer_id: &str,
    ) -> Result<AccountProofResponse, SdkError> {
        self.call("lyth_registryStateProof", json!([peer_id])).await
    }

    /// `lyth_getAccountPolicy` — privacy posture for an account.
    pub async fn lyth_get_account_policy(&self, address: &str) -> Result<AccountPolicy, SdkError> {
        self.call("lyth_getAccountPolicy", json!([address])).await
    }

    /// `lyth_getAssetPolicy` — privacy posture for an asset
    /// (32-byte token id).
    pub async fn lyth_get_asset_policy(&self, token_id: &str) -> Result<AssetPolicy, SdkError> {
        self.call("lyth_getAssetPolicy", json!([token_id])).await
    }

    /// `lyth_mempoolStatus` — aggregate mempool snapshot.
    pub async fn lyth_mempool_status(&self) -> Result<MempoolSnapshot, SdkError> {
        self.call("lyth_mempoolStatus", json!([])).await
    }

    /// `lyth_mempoolPending` — pending txs for a sender.
    pub async fn lyth_mempool_pending(
        &self,
        sender: &str,
    ) -> Result<Vec<PendingTxSummary>, SdkError> {
        self.call("lyth_mempoolPending", json!([sender])).await
    }

    /// `lyth_currentRound` — latest committed height.
    pub async fn lyth_current_round(&self) -> Result<RoundInfo, SdkError> {
        self.call("lyth_currentRound", json!([])).await
    }

    /// `lyth_peerSummary` — public-safe aggregate peer-network diagnostics.
    pub async fn lyth_peer_summary(&self) -> Result<PeerSummaryAggregate, SdkError> {
        self.call("lyth_peerSummary", json!([])).await
    }

    /// `lyth_listActivePrecompiles` — milestone-gated precompile catalogue
    /// (OI-0170 / ADR-0015 §5). `block` selects the height the gate snapshot
    /// is read from; pass [`BlockSelector::LATEST`] for the live view.
    pub async fn lyth_list_active_precompiles(
        &self,
        block: BlockSelector,
    ) -> Result<Vec<PrecompileDescriptor>, SdkError> {
        self.call("lyth_listActivePrecompiles", json!([block.to_param()]))
            .await
    }

    /// `lyth_capabilities` — address-keyed precompile capability map.
    pub async fn lyth_capabilities(
        &self,
        block: Option<BlockSelector>,
    ) -> Result<CapabilitiesResponse, SdkError> {
        let params = match block {
            Some(block) => json!([block.to_param()]),
            None => json!([]),
        };
        self.call("lyth_capabilities", params).await
    }

    /// `lyth_operatorCapabilities` — node-level availability for
    /// operator UI and explorer surfaces.
    pub async fn lyth_operator_capabilities(
        &self,
    ) -> Result<OperatorCapabilitiesResponse, SdkError> {
        self.call("lyth_operatorCapabilities", json!([])).await
    }

    /// `lyth_indexerStatus` — indexer status, `None` if disabled.
    pub async fn lyth_indexer_status(&self) -> Result<Option<IndexerStatus>, SdkError> {
        let v: Value = self.call("lyth_indexerStatus", json!([])).await?;
        if v.is_null() {
            return Ok(None);
        }
        Ok(Some(serde_json::from_value(v)?))
    }

    /// `lyth_getTokenBalances` — indexed per-asset balances for one address.
    pub async fn lyth_get_token_balances(
        &self,
        address: &str,
    ) -> Result<Vec<TokenBalanceRecord>, SdkError> {
        self.call("lyth_getTokenBalances", json!([address])).await
    }

    /// `lyth_getAddressLabel` — indexed display/category label for one address.
    pub async fn lyth_get_address_label(
        &self,
        address: &str,
    ) -> Result<Option<AddressLabelRecord>, SdkError> {
        let v: Value = self.call("lyth_getAddressLabel", json!([address])).await?;
        if v.is_null() {
            return Ok(None);
        }
        Ok(Some(serde_json::from_value(v)?))
    }

    /// `lyth_getAddressActivity` — indexed per-address activity timeline.
    pub async fn lyth_get_address_activity(
        &self,
        address: &str,
        limit: Option<u32>,
        cursor: Option<&str>,
    ) -> Result<Vec<AddressActivityEntry>, SdkError> {
        let params = match (limit, cursor) {
            (None, None) => json!([address]),
            (Some(limit), None) => json!([address, limit]),
            (None, Some(cursor)) => json!([address, 50, cursor]),
            (Some(limit), Some(cursor)) => json!([address, limit, cursor]),
        };
        self.call("lyth_getAddressActivity", params).await
    }

    /// `lyth_addressActivityKind` — activity index coverage for one address.
    pub async fn lyth_address_activity_kind(
        &self,
        address: &str,
    ) -> Result<AddressActivityKindResponse, SdkError> {
        self.call("lyth_addressActivityKind", json!([address]))
            .await
    }

    /// `lyth_agentReputation` — reputation accumulators for an agent provider.
    ///
    /// `provider` may be a `0x`-hex address or a user `mono1...` bech32m
    /// address; the wire request always sends the canonical user bech32m form.
    /// `category_id` defaults to `0`.
    pub async fn lyth_agent_reputation(
        &self,
        provider: &str,
        category_id: Option<u32>,
    ) -> Result<AgentReputationResponse, SdkError> {
        self.call(
            "lyth_agentReputation",
            agent_reputation_params(provider, category_id)?,
        )
        .await
    }

    /// `lyth_decodeTx` — explorer-grade decoded transaction envelope.
    pub async fn lyth_decode_tx(&self, tx_hash: &str) -> Result<DecodeTxResponse, SdkError> {
        self.call("lyth_decodeTx", json!([tx_hash])).await
    }

    /// `lyth_nativeReceipt` — native RISC-V receipt metadata and typed
    /// native event rows for a confirmed transaction.
    pub async fn lyth_native_receipt(
        &self,
        tx_hash: &str,
    ) -> Result<NativeReceiptResponse, SdkError> {
        self.call("lyth_nativeReceipt", json!([tx_hash])).await
    }

    /// Typed native event rows from `lyth_nativeReceipt`.
    ///
    /// This helper consumes the existing receipt RPC surface; it does not
    /// require a separate `lyth_nativeEvents` node method.
    pub async fn lyth_native_receipt_events<TDecoded>(
        &self,
        tx_hash: &str,
        filter: NativeEventFilter<'_>,
    ) -> Result<Vec<TypedNativeReceiptEvent<TDecoded>>, SdkError>
    where
        TDecoded: DeserializeOwned,
    {
        let receipt = self.lyth_native_receipt(tx_hash).await?;
        Ok(native_events_from_receipt::<TDecoded>(&receipt, filter)?)
    }

    /// `lyth_nativeEvents` — historical indexed native event rows.
    pub async fn lyth_native_events(
        &self,
        filter: NativeEventsFilter<'_>,
    ) -> Result<NativeEventsResponse, SdkError> {
        self.call("lyth_nativeEvents", json!([filter])).await
    }

    /// `lyth_nativeEvents` with decoded rows converted into a caller-selected type.
    pub async fn lyth_native_events_typed<TDecoded>(
        &self,
        filter: NativeEventsFilter<'_>,
    ) -> Result<TypedNativeEventsResponse<TDecoded>, SdkError>
    where
        TDecoded: DeserializeOwned,
    {
        let response = self.lyth_native_events(filter).await?;
        Ok(typed_native_events_from_response::<TDecoded>(&response)?)
    }

    /// `lyth_gapRecords` — retained ingestion/indexing gaps for a block range.
    pub async fn lyth_gap_records(
        &self,
        from_block: u64,
        to_block: u64,
    ) -> Result<GapRecordsResponse, SdkError> {
        self.call("lyth_gapRecords", json!([from_block, to_block]))
            .await
    }

    /// `lyth_dagParents` — parent vertices for a DAG round.
    pub async fn lyth_dag_parents(&self, round: u64) -> Result<DagParentsResponse, SdkError> {
        self.call("lyth_dagParents", json!([round])).await
    }

    /// `lyth_richList` — top holders for a token id.
    pub async fn lyth_rich_list(
        &self,
        token_id: &str,
        limit: Option<u32>,
    ) -> Result<RichListResponse, SdkError> {
        let params = match limit {
            Some(limit) => json!([token_id, limit]),
            None => json!([token_id]),
        };
        self.call("lyth_richList", params).await
    }

    /// `lyth_clobMarket` — live CLOB market metadata for a market id.
    pub async fn lyth_clob_market(&self, market_id: &str) -> Result<ClobMarketResponse, SdkError> {
        self.call("lyth_clobMarket", json!([market_id])).await
    }

    /// `lyth_clobMarkets` — CLOB markets observed through indexed trades.
    pub async fn lyth_clob_markets(
        &self,
        limit: Option<u32>,
    ) -> Result<ClobMarketsResponse, SdkError> {
        let params = match limit {
            Some(limit) => json!([limit]),
            None => json!([]),
        };
        self.call("lyth_clobMarkets", params).await
    }

    /// `lyth_clobTrades` — CLOB fills for one market.
    pub async fn lyth_clob_trades(
        &self,
        market_id: &str,
        limit: Option<u32>,
        cursor: Option<&str>,
    ) -> Result<ClobTradesResponse, SdkError> {
        let params = match (limit, cursor) {
            (None, None) => json!([market_id]),
            (Some(limit), None) => json!([market_id, limit]),
            (None, Some(cursor)) => json!([market_id, 50, cursor]),
            (Some(limit), Some(cursor)) => json!([market_id, limit, cursor]),
        };
        self.call("lyth_clobTrades", params).await
    }

    /// `lyth_clobOhlc` — CLOB OHLC candles for a market over a block range.
    pub async fn lyth_clob_ohlc(
        &self,
        market_id: &str,
        from_block: Option<u64>,
        to_block: Option<u64>,
        bucket_blocks: Option<u64>,
    ) -> Result<ClobOhlcResponse, SdkError> {
        let params = match (from_block, to_block, bucket_blocks) {
            (None, None, None) => json!([market_id]),
            _ => json!([market_id, from_block, to_block, bucket_blocks]),
        };
        self.call("lyth_clobOhlc", params).await
    }

    /// `lyth_clobOrderBook` — live CLOB depth from canonical state.
    pub async fn lyth_clob_order_book(
        &self,
        market_id: &str,
        levels: Option<u32>,
    ) -> Result<ClobOrderBookResponse, SdkError> {
        let params = match levels {
            Some(levels) => json!([market_id, levels]),
            None => json!([market_id]),
        };
        self.call("lyth_clobOrderBook", params).await
    }

    /// `lyth_txFeed` — paged global transaction feed.
    pub async fn lyth_tx_feed(
        &self,
        limit: Option<u32>,
        cursor: Option<&str>,
    ) -> Result<TxFeedResponse, SdkError> {
        let params = match (limit, cursor) {
            (None, None) => json!([]),
            (Some(limit), None) => json!([limit]),
            (None, Some(cursor)) => json!([50, cursor]),
            (Some(limit), Some(cursor)) => json!([limit, cursor]),
        };
        self.call("lyth_txFeed", params).await
    }

    /// `lyth_addressProfile` — live account + label + activity aggregate.
    pub async fn lyth_address_profile(
        &self,
        address: &str,
    ) -> Result<AddressProfileResponse, SdkError> {
        self.call("lyth_addressProfile", json!([address])).await
    }

    /// `lyth_addressFlow` — recent indexed address-flow aggregate.
    pub async fn lyth_address_flow(
        &self,
        address: &str,
        limit: Option<u32>,
    ) -> Result<AddressFlowResponse, SdkError> {
        let params = match limit {
            Some(limit) => json!([address, limit]),
            None => json!([address]),
        };
        self.call("lyth_addressFlow", params).await
    }

    /// `lyth_search` — exact live resolver for hashes, addresses, blocks, and clusters.
    pub async fn lyth_search(
        &self,
        query: &str,
        limit: Option<u32>,
    ) -> Result<SearchResponse, SdkError> {
        let params = match limit {
            Some(limit) => json!([query, limit]),
            None => json!([query]),
        };
        self.call("lyth_search", params).await
    }

    /// `lyth_chainStats` — compact live chain/indexer/mempool summary.
    pub async fn lyth_chain_stats(&self) -> Result<ChainStatsResponse, SdkError> {
        self.call("lyth_chainStats", json!([])).await
    }

    /// `lyth_getStorageProof` — batched Merkle proofs for one
    /// account across many slots.
    pub async fn lyth_get_storage_proof(
        &self,
        address: &str,
        slots: &[String],
    ) -> Result<StorageProofBatch, SdkError> {
        self.call("lyth_getStorageProof", json!([address, slots]))
            .await
    }

    /// `lyth_getDelegations` — wallet delegation rows at `block`.
    pub async fn lyth_get_delegations(
        &self,
        wallet: &str,
        block: Option<BlockSelector>,
    ) -> Result<DelegationsResponse, SdkError> {
        let params = match block {
            Some(block) => json!([wallet, block.to_param()]),
            None => json!([wallet]),
        };
        self.call("lyth_getDelegations", params).await
    }

    /// `lyth_pendingRewards` — wallet pending rewards at `block`.
    pub async fn lyth_pending_rewards(
        &self,
        wallet: &str,
        block: Option<BlockSelector>,
    ) -> Result<PendingRewardsResponse, SdkError> {
        let params = match block {
            Some(block) => json!([wallet, block.to_param()]),
            None => json!([wallet]),
        };
        self.call("lyth_pendingRewards", params).await
    }

    /// `lyth_getDelegationHistory` — indexed per-wallet delegation event timeline.
    pub async fn lyth_get_delegation_history(
        &self,
        wallet: &str,
        limit: Option<u32>,
        cursor: Option<&str>,
    ) -> Result<Vec<DelegationHistoryRecord>, SdkError> {
        let params = match (limit, cursor) {
            (None, None) => json!([wallet]),
            (Some(limit), None) => json!([wallet, limit]),
            (None, Some(cursor)) => json!([wallet, 50, cursor]),
            (Some(limit), Some(cursor)) => json!([wallet, limit, cursor]),
        };
        self.call("lyth_getDelegationHistory", params).await
    }

    /// `lyth_getClusterDelegators` — delegator addresses for a cluster.
    pub async fn lyth_get_cluster_delegators(
        &self,
        cluster: u32,
        block: Option<BlockSelector>,
    ) -> Result<ClusterDelegatorsResponse, SdkError> {
        let params = match block {
            Some(block) => json!([cluster, block.to_param()]),
            None => json!([cluster]),
        };
        self.call("lyth_getClusterDelegators", params).await
    }

    /// `lyth_getDelegationCap` — active per-cluster cap at `block`.
    pub async fn lyth_get_delegation_cap(
        &self,
        block: Option<BlockSelector>,
    ) -> Result<DelegationCapResponse, SdkError> {
        let params = match block {
            Some(block) => json!([block.to_param()]),
            None => json!([]),
        };
        self.call("lyth_getDelegationCap", params).await
    }

    /// `lyth_getTpmAttestation` — TPM quote digest + EK id for a peer.
    pub async fn lyth_get_tpm_attestation(
        &self,
        peer_id: &str,
        block: Option<BlockSelector>,
    ) -> Result<TpmAttestationResponse, SdkError> {
        let params = match block {
            Some(block) => json!([peer_id, block.to_param()]),
            None => json!([peer_id]),
        };
        self.call("lyth_getTpmAttestation", params).await
    }

    /// `lyth_getClusterEntity` — entity flag for a cluster.
    pub async fn lyth_get_cluster_entity(
        &self,
        cluster: u32,
        block: Option<BlockSelector>,
    ) -> Result<ClusterEntityResponse, SdkError> {
        let params = match block {
            Some(block) => json!([cluster, block.to_param()]),
            None => json!([cluster]),
        };
        self.call("lyth_getClusterEntity", params).await
    }

    /// `lyth_getEntityRatchet` — entity-ratchet snapshot at `block`.
    pub async fn lyth_get_entity_ratchet(
        &self,
        block: Option<BlockSelector>,
    ) -> Result<EntityRatchetResponse, SdkError> {
        let params = match block {
            Some(block) => json!([block.to_param()]),
            None => json!([]),
        };
        self.call("lyth_getEntityRatchet", params).await
    }

    /// `lyth_submitPendingChange` — operator-onboarding transport for the
    /// pending-change ledger. The opaque envelope is forwarded to the node;
    /// payload validation happens server-side.
    pub async fn lyth_submit_pending_change(&self, envelope: Value) -> Result<Value, SdkError> {
        self.call("lyth_submitPendingChange", json!([envelope]))
            .await
    }

    /// `lyth_submitEncrypted` — submit a bincode-encoded encrypted
    /// envelope as `0x` hex. Returns the tx hash on admission.
    pub async fn lyth_submit_encrypted(&self, envelope_hex: &str) -> Result<String, SdkError> {
        self.call("lyth_submitEncrypted", json!([envelope_hex]))
            .await
    }

    /// `lyth_getEncryptionKey` — cluster ML-KEM encapsulation key.
    pub async fn lyth_get_encryption_key(&self) -> Result<EncryptionKeyResponse, SdkError> {
        self.call("lyth_getEncryptionKey", json!([])).await
    }

    /// Fetch the cluster encryption key in the MRV helper shape.
    pub async fn lyth_get_mrv_encryption_key(&self) -> Result<MrvEncryptionKey, SdkError> {
        Ok(self.lyth_get_encryption_key().await?.into())
    }

    /// Submit already-built encrypted MRV envelope material.
    ///
    /// This is the Rust SDK counterpart to the TypeScript
    /// `submitEncryptedEnvelope` helper. It only proves client submission to
    /// the node RPC surface; admission, threshold decrypt, reveal, and
    /// execution are still node/runtime responsibilities.
    pub async fn lyth_submit_mrv_native_encrypted_submission(
        &self,
        submission: &MrvNativeEncryptedSubmission,
    ) -> Result<String, SdkError> {
        self.lyth_submit_encrypted(&submission.envelope_wire_hex)
            .await
    }

    /// Build and submit an encrypted MRV deploy transaction.
    ///
    /// If `encryption_key` is `None`, the client first calls
    /// `lyth_getEncryptionKey`. The caller still owns ML-DSA-65 key material:
    /// `inner_signature` must be the signature over the plan's native
    /// transaction sighash, and `sign_outer_digest` must sign the encrypted
    /// envelope digest supplied by the helper.
    pub async fn submit_mrv_deploy_native_encrypted<F>(
        &self,
        plan: &MrvDeployNativeTxPlan,
        inner_signature: &[u8],
        public_key: &[u8],
        encryption_key: Option<MrvEncryptionKey>,
        mempool_class: Option<MrvMempoolClass>,
        sign_outer_digest: F,
    ) -> Result<MrvDeployNativeEncryptedSubmitResult, SdkError>
    where
        F: FnOnce(&[u8; 32]) -> Result<Vec<u8>, MrvValidationError>,
    {
        let encryption_key = match encryption_key {
            Some(encryption_key) => encryption_key,
            None => self.lyth_get_mrv_encryption_key().await?,
        };
        let encrypted = build_mrv_deploy_native_encrypted_submission(
            plan,
            inner_signature,
            public_key,
            &encryption_key,
            mempool_class,
            sign_outer_digest,
        )
        .map_err(mrv_validation_to_sdk_error)?;
        let tx_hash = self
            .lyth_submit_mrv_native_encrypted_submission(&encrypted.submission)
            .await?;
        Ok(MrvDeployNativeEncryptedSubmitResult { tx_hash, encrypted })
    }

    /// Build and submit an encrypted MRV call transaction.
    ///
    /// This mirrors [`Self::submit_mrv_deploy_native_encrypted`] for call
    /// plans and does not hide wallet signing behind the SDK.
    pub async fn submit_mrv_call_native_encrypted<F>(
        &self,
        plan: &MrvCallNativeTxPlan,
        inner_signature: &[u8],
        public_key: &[u8],
        encryption_key: Option<MrvEncryptionKey>,
        mempool_class: Option<MrvMempoolClass>,
        sign_outer_digest: F,
    ) -> Result<MrvCallNativeEncryptedSubmitResult, SdkError>
    where
        F: FnOnce(&[u8; 32]) -> Result<Vec<u8>, MrvValidationError>,
    {
        let encryption_key = match encryption_key {
            Some(encryption_key) => encryption_key,
            None => self.lyth_get_mrv_encryption_key().await?,
        };
        let encrypted = build_mrv_call_native_encrypted_submission(
            plan,
            inner_signature,
            public_key,
            &encryption_key,
            mempool_class,
            sign_outer_digest,
        )
        .map_err(mrv_validation_to_sdk_error)?;
        let tx_hash = self
            .lyth_submit_mrv_native_encrypted_submission(&encrypted.submission)
            .await?;
        Ok(MrvCallNativeEncryptedSubmitResult { tx_hash, encrypted })
    }

    /// `lyth_syncStatus` — DAG-sync driver snapshot, or `None` when the
    /// running node has no driver wired.
    pub async fn lyth_sync_status(&self) -> Result<Option<DagSyncStatus>, SdkError> {
        let v: Value = self.call("lyth_syncStatus", json!([])).await?;
        if v.is_null() {
            return Ok(None);
        }
        Ok(Some(serde_json::from_value(v)?))
    }

    /// `lyth_upgradeStatus` — signed network-upgrade readiness at a height.
    pub async fn lyth_upgrade_status(
        &self,
        block: Option<BlockSelector>,
    ) -> Result<LythUpgradeStatusResponse, SdkError> {
        let params = match block {
            Some(block) => json!([block.to_param()]),
            None => json!([]),
        };
        self.call("lyth_upgradeStatus", params).await
    }

    /// `lyth_txStatus` — discriminated transaction lookup outcome.
    pub async fn lyth_tx_status(&self, tx_hash: &str) -> Result<TxStatusResponse, SdkError> {
        self.call("lyth_txStatus", json!([tx_hash])).await
    }

    /// `lyth_verticesAtRound` — per-vertex authorship observed at a DAG round.
    pub async fn lyth_vertices_at_round(
        &self,
        round: u64,
    ) -> Result<VerticesAtRoundResponse, SdkError> {
        self.call("lyth_verticesAtRound", json!([round])).await
    }

    /// `lyth_metricsRange` — retained telemetry series when the node has them.
    pub async fn lyth_metrics_range(
        &self,
        selectors: &[String],
        range: Option<(u64, u64)>,
    ) -> Result<MetricsRangeResponse, SdkError> {
        let params = match range {
            Some((from_block, to_block)) => json!([selectors, [from_block, to_block]]),
            None => json!([selectors]),
        };
        self.call("lyth_metricsRange", params).await
    }

    /// `lyth_getLatestCheckpoint` — latest PQ-finality checkpoint rows.
    pub async fn lyth_get_latest_checkpoint(
        &self,
        below_height: Option<u64>,
    ) -> Result<Vec<CheckpointRecord>, SdkError> {
        let params = match below_height {
            Some(height) => json!([height]),
            None => json!([]),
        };
        self.call("lyth_getLatestCheckpoint", params).await
    }

    /// `lyth_getClusterResignations` — in-flight + applied operator resignations.
    pub async fn lyth_get_cluster_resignations(
        &self,
        operator: Option<&str>,
        status: Option<&str>,
    ) -> Result<ClusterResignationsResponse, SdkError> {
        let params = match (operator, status) {
            (None, None) => json!([]),
            (Some(operator), None) => json!([operator]),
            (None, Some(status)) => json!([null, status]),
            (Some(operator), Some(status)) => json!([operator, status]),
        };
        self.call("lyth_getClusterResignations", params).await
    }

    /// `lyth_getBlsRoundCertificate` — round-advancement BLS aggregate.
    pub async fn lyth_get_bls_round_certificate(
        &self,
        round: u64,
    ) -> Result<Option<BlsCertificateResponse>, SdkError> {
        self.call("lyth_getBlsRoundCertificate", json!([round]))
            .await
    }

    /// `lyth_getLeaderCertificate` — leader-vote BLS aggregate for a block ref.
    pub async fn lyth_get_leader_certificate(
        &self,
        round: u64,
        authority: u16,
        digest: &str,
    ) -> Result<Option<BlsCertificateResponse>, SdkError> {
        self.call(
            "lyth_getLeaderCertificate",
            json!([round, authority, digest]),
        )
        .await
    }

    /// `lyth_getDacCertificate` — data-availability certificate for a block ref.
    pub async fn lyth_get_dac_certificate(
        &self,
        round: u64,
        authority: u16,
        digest: &str,
    ) -> Result<Option<BlsCertificateResponse>, SdkError> {
        self.call("lyth_getDacCertificate", json!([round, authority, digest]))
            .await
    }

    /// `lyth_subscribe` — note: this is a WebSocket-only method.
    /// HTTP callers receive [`SdkError::Rpc`] with a "not implemented"
    /// message. Wired here for completeness; full WS support is on
    /// the OI-0069 work track.
    pub async fn lyth_subscribe(&self, channel: &str) -> Result<Value, SdkError> {
        self.call("lyth_subscribe", json!([channel])).await
    }

    /// `lyth_unsubscribe` — counterpart to `lyth_subscribe`.
    /// HTTP callers receive [`SdkError::Rpc`] until WS lands.
    pub async fn lyth_unsubscribe(&self, sub_id: &str) -> Result<Value, SdkError> {
        self.call("lyth_unsubscribe", json!([sub_id])).await
    }

    // ---- debug_* ------------------------------------------------------
    //
    // The debug namespace is gated server-side by `RpcConfig::debug_enabled`.
    // When the namespace is disabled, every call surfaces as
    // [`SdkError::Rpc`] with the server's `MethodDisabled` code.

    /// `debug_traceTransaction` — revm trace for a confirmed tx
    /// (server-side gated; not yet wired in v0.0.x).
    pub async fn debug_trace_transaction(&self, tx_hash: &str) -> Result<Value, SdkError> {
        self.call("debug_traceTransaction", json!([tx_hash])).await
    }

    /// `debug_traceCall` — revm trace for a dry-run call (server-side
    /// gated; not yet wired in v0.0.x).
    pub async fn debug_trace_call(
        &self,
        request: &CallRequest,
        block: BlockSelector,
    ) -> Result<Value, SdkError> {
        self.call("debug_traceCall", json!([request, block.to_param()]))
            .await
    }

    /// `debug_traceBlockByNumber` — revm traces for an entire block
    /// (server-side gated; not yet wired in v0.0.x).
    pub async fn debug_trace_block_by_number(
        &self,
        block: BlockSelector,
    ) -> Result<Value, SdkError> {
        self.call("debug_traceBlockByNumber", json!([block.to_param()]))
            .await
    }

    /// `debug_mempoolDump` — full mempool snapshot (server-side
    /// gated). Returns the same shape as `lyth_mempoolStatus` in
    /// v0.0.x; the deep-dump lands later.
    pub async fn debug_mempool_dump(&self) -> Result<MempoolSnapshot, SdkError> {
        self.call("debug_mempoolDump", json!([])).await
    }

    /// `debug_p2pPeers` — connected libp2p peer list.
    pub async fn debug_p2p_peers(&self) -> Result<Vec<PeerSummary>, SdkError> {
        self.call("debug_p2pPeers", json!([])).await
    }

    /// `debug_stateDiff` — state-diff for a block range (server-side
    /// gated; not yet wired in v0.0.x).
    pub async fn debug_state_diff(&self, params: Value) -> Result<Value, SdkError> {
        self.call("debug_stateDiff", params).await
    }

    /// `debug_chainReorg` — testnet-only reorg trigger (server-side
    /// gated; not yet wired in v0.0.x).
    pub async fn debug_chain_reorg(&self, params: Value) -> Result<Value, SdkError> {
        self.call("debug_chainReorg", params).await
    }

    // ---- mesh_* -------------------------------------------------------

    /// `mesh_buildUnsignedTx` — build an unsigned transaction envelope.
    pub async fn mesh_build_unsigned_tx(
        &self,
        intent: &MeshTxIntent,
    ) -> Result<MeshUnsignedTxResponse, SdkError> {
        self.call("mesh_buildUnsignedTx", json!([intent])).await
    }

    /// `mesh_combineTx` — combine an unsigned envelope with a wallet signature.
    pub async fn mesh_combine_tx(
        &self,
        unsigned_tx: &str,
        signature_hex: &str,
        algo: Option<&str>,
        pubkey_hex: Option<&str>,
    ) -> Result<MeshSignedTxResponse, SdkError> {
        let params = match (algo, pubkey_hex) {
            (None, None) => json!([unsigned_tx, signature_hex]),
            (Some(algo), None) => json!([unsigned_tx, signature_hex, algo]),
            (None, Some(pubkey_hex)) => {
                json!([unsigned_tx, signature_hex, "ml_dsa_65", pubkey_hex])
            }
            (Some(algo), Some(pubkey_hex)) => {
                json!([unsigned_tx, signature_hex, algo, pubkey_hex])
            }
        };
        self.call("mesh_combineTx", params).await
    }

    /// `mesh_decodeTx` — decode a signed or unsigned mesh envelope.
    pub async fn mesh_decode_tx(
        &self,
        envelope_hex: &str,
        signed: bool,
    ) -> Result<MeshDecodedTx, SdkError> {
        self.call("mesh_decodeTx", json!([envelope_hex, signed]))
            .await
    }

    /// `mesh_submitTx` — submit a signed mesh envelope.
    pub async fn mesh_submit_tx(&self, signed_tx: &str) -> Result<String, SdkError> {
        self.call("mesh_submitTx", json!([signed_tx])).await
    }
}

/// Decode a `0x`-prefixed hex quantity into `u64`.
fn parse_quantity_u64(s: &str) -> Result<u64, SdkError> {
    let rest = s.strip_prefix("0x").unwrap_or(s);
    if rest.is_empty() {
        return Ok(0);
    }
    u64::from_str_radix(rest, 16)
        .map_err(|e| SdkError::Malformed(format!("invalid quantity {s:?}: {e}")))
}

fn agent_reputation_params(provider: &str, category_id: Option<u32>) -> Result<Value, SdkError> {
    let provider = address_to_bech32(
        parse_address(provider)
            .map_err(|err| SdkError::Malformed(format!("invalid provider address: {err}")))?,
    );
    Ok(json!([provider, category_id.unwrap_or(0)]))
}

fn mrv_validation_to_sdk_error(err: MrvValidationError) -> SdkError {
    SdkError::Malformed(format!("invalid MRV encrypted submission: {err}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::thread::{self, JoinHandle};
    use std::time::Duration;

    use crate::mrv::{
        build_mrv_deploy_native_tx_plan, MrvNativeTxBuildOptions, ML_DSA_65_PUBLIC_KEY_LEN,
        ML_DSA_65_SIGNATURE_LEN,
    };

    #[test]
    fn parses_hex_quantities() {
        assert_eq!(parse_quantity_u64("0x0").unwrap(), 0);
        assert_eq!(parse_quantity_u64("0x").unwrap(), 0);
        assert_eq!(parse_quantity_u64("0x1b1c").unwrap(), 6_940);
        assert_eq!(parse_quantity_u64("0xff").unwrap(), 255);
    }

    #[test]
    fn rejects_malformed_hex_quantity() {
        let err = parse_quantity_u64("0xZZ").unwrap_err();
        assert!(matches!(err, SdkError::Malformed(_)));
    }

    #[test]
    fn block_selector_serializes_each_variant() {
        assert_eq!(
            BlockSelector::LATEST.to_param(),
            serde_json::json!("latest")
        );
        assert_eq!(
            BlockSelector::Tag(crate::types::BlockTag::Earliest).to_param(),
            serde_json::json!("earliest")
        );
        assert_eq!(
            BlockSelector::Number(0x100).to_param(),
            serde_json::json!("0x100")
        );
        assert_eq!(
            BlockSelector::Hash("0xabcd".into()).to_param(),
            serde_json::json!("0xabcd")
        );
    }

    #[test]
    fn agent_reputation_params_normalize_provider_and_default_category() {
        let params =
            agent_reputation_params("0x123456789abcdef0112233445566778899aabbcc", None).unwrap();
        assert_eq!(
            params,
            serde_json::json!(["mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4", 0])
        );

        let params =
            agent_reputation_params("mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4", Some(7))
                .unwrap();
        assert_eq!(
            params,
            serde_json::json!(["mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4", 7])
        );
    }

    #[test]
    fn agent_reputation_params_reject_non_user_provider_hrp() {
        let provider = crate::address::address_to_typed_bech32(
            crate::address::AddressKind::Contract,
            [0x12; 20],
        );
        let err = agent_reputation_params(&provider, None).unwrap_err();
        assert!(matches!(err, SdkError::Malformed(_)));
    }

    #[test]
    fn rejects_empty_endpoint() {
        let err = RpcClient::new("").unwrap_err();
        assert!(matches!(err, SdkError::InvalidEndpoint(_)));
    }

    #[test]
    fn accepts_valid_endpoint() {
        let c = RpcClient::new("http://localhost:8545").unwrap();
        assert_eq!(c.endpoint(), "http://localhost:8545");
    }

    #[test]
    fn client_is_clonable_for_concurrent_use() {
        let c = RpcClient::new("http://localhost:8545").unwrap();
        let c2 = c.clone();
        assert_eq!(c.endpoint(), c2.endpoint());
    }

    #[tokio::test]
    async fn lyth_get_token_balances_decodes_optional_mrc_identity() {
        let address = "0x1111111111111111111111111111111111111111";
        let (endpoint, server) = spawn_rpc_server(vec![json!([
            {
                "tokenId": format!("0x{}", "aa".repeat(32)),
                "balance": "1000",
                "updatedAtBlock": 88,
                "mrc": {
                    "standard": "mrc1155",
                    "assetId": format!("0x{}", "bb".repeat(32)),
                    "tokenId": format!("0x{}", "cc".repeat(32))
                }
            },
            {
                "tokenId": format!("0x{}", "dd".repeat(32)),
                "balance": "0",
                "updatedAtBlock": 89
            },
            {
                "tokenId": format!("0x{}", "ee".repeat(32)),
                "balance": "25",
                "updatedAtBlock": 90,
                "mrc": null
            }
        ])]);

        let client = RpcClient::new(endpoint).unwrap();
        let balances = client.lyth_get_token_balances(address).await.unwrap();

        assert_eq!(balances.len(), 3);
        let mrc = balances[0].mrc.as_ref().expect("mrc identity");
        assert_eq!(mrc.standard, "mrc1155");
        assert_eq!(mrc.asset_id, format!("0x{}", "bb".repeat(32)));
        assert_eq!(
            mrc.token_id.as_ref().unwrap(),
            &format!("0x{}", "cc".repeat(32))
        );
        assert_eq!(balances[1].mrc, None);
        assert_eq!(balances[2].mrc, None);

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0]["method"], "lyth_getTokenBalances");
        assert_eq!(requests[0]["params"], json!([address]));
    }

    #[tokio::test]
    async fn lyth_address_profile_decodes_token_balance_mrc_identity() {
        let address = "0x1111111111111111111111111111111111111111";
        let (endpoint, server) = spawn_rpc_server(vec![json!({
            "schemaVersion": 1,
            "address": address,
            "account": {
                "nativeBalance": "100000000",
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
                    "updatedAtBlock": 89
                }
            ]
        })]);

        let client = RpcClient::new(endpoint).unwrap();
        let profile = client.lyth_address_profile(address).await.unwrap();

        let mrc = profile.token_balances[0]
            .mrc
            .as_ref()
            .expect("profile mrc identity");
        assert_eq!(mrc.standard, "mrc721");
        assert_eq!(mrc.asset_id, format!("0x{}", "bb".repeat(32)));
        assert_eq!(profile.token_balances[1].mrc, None);

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0]["method"], "lyth_addressProfile");
        assert_eq!(requests[0]["params"], json!([address]));
    }

    #[tokio::test]
    async fn mrv_encrypted_submit_fetches_key_and_submits_envelope() {
        use ml_kem::{kem::KeyExport, DecapsulationKey, MlKem768};

        let seed: ml_kem::Seed = [0x45; 64].into();
        let dk = DecapsulationKey::<MlKem768>::from_seed(seed);
        let encapsulation_key = dk.encapsulation_key().to_bytes();
        let (endpoint, server) = spawn_rpc_server(vec![
            json!({
                "algo": "ml-kem-768",
                "epoch": 12,
                "encapsulationKey": test_hex(encapsulation_key.as_ref()),
            }),
            json!("0xfeedface"),
        ]);

        let client = RpcClient::new(endpoint).unwrap();
        let plan = build_mrv_deploy_native_tx_plan(
            &[0x13, 0x00, 0x00, 0x00],
            None,
            MrvNativeTxBuildOptions::new(69_420, 7, 100_000, 25).priority_tip_lythoshi(1),
        )
        .unwrap();
        let inner_signature = vec![0x55; ML_DSA_65_SIGNATURE_LEN];
        let public_key = vec![0x66; ML_DSA_65_PUBLIC_KEY_LEN];
        let result = client
            .submit_mrv_deploy_native_encrypted(
                &plan,
                &inner_signature,
                &public_key,
                None,
                Some(MrvMempoolClass::ContractCall),
                |_| Ok(vec![0x77; ML_DSA_65_SIGNATURE_LEN]),
            )
            .await
            .unwrap();

        assert_eq!(result.tx_hash, "0xfeedface");
        assert_eq!(result.encrypted.request.artifact_bytes, "0x13000000");
        assert!(result
            .encrypted
            .submission
            .envelope_wire_hex
            .starts_with("0x"));

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 2);
        assert_eq!(requests[0]["method"], "lyth_getEncryptionKey");
        assert_eq!(requests[0]["params"], json!([]));
        assert_eq!(requests[1]["method"], "lyth_submitEncrypted");
        assert_eq!(
            requests[1]["params"],
            json!([result.encrypted.submission.envelope_wire_hex])
        );
    }

    #[tokio::test]
    async fn lyth_pending_rewards_serializes_block_and_decodes_quantities() {
        let wallet = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let (endpoint, server) = spawn_rpc_server(vec![json!({
            "wallet": wallet,
            "totalAmountLythoshi": "0x271f",
            "settledPendingLythoshi": "0xf",
            "unsettledAmountLythoshi": "0x2710",
            "autoCompound": true,
            "rows": [{
                "cluster": 7,
                "weightBps": 2_500,
                "unsettledAmountLythoshi": "0x2710"
            }],
            "block": 99
        })]);

        let client = RpcClient::new(endpoint).unwrap();
        let response = client
            .lyth_pending_rewards(wallet, Some(BlockSelector::Number(99)))
            .await
            .unwrap();

        assert_eq!(response.wallet, wallet);
        assert_eq!(response.total_amount_lythoshi, "0x271f");
        assert_eq!(response.settled_pending_lythoshi, "0xf");
        assert_eq!(response.unsettled_amount_lythoshi, "0x2710");
        assert!(response.auto_compound);
        assert_eq!(response.rows.len(), 1);
        assert_eq!(response.rows[0].cluster, 7);
        assert_eq!(response.rows[0].weight_bps, 2_500);
        assert_eq!(response.rows[0].unsettled_amount_lythoshi, "0x2710");
        assert_eq!(response.block, json!(99));

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0]["method"], "lyth_pendingRewards");
        assert_eq!(requests[0]["params"], json!([wallet, "0x63"]));
    }

    #[tokio::test]
    async fn lyth_native_events_serializes_filter_and_decodes_typed_rows() {
        #[derive(Debug, serde::Deserialize)]
        struct AgentEscrowCreatedEvent {
            family: String,
            event_name: String,
            amount_lythoshi: String,
            agent_address: String,
        }

        let event_topic = format!("0x{}", "11".repeat(32));
        let primary_id = format!("0x{}", "77".repeat(32));
        let decoded = json!({
            "block_height": 100,
            "tx_index": 0,
            "sequence": 0,
            "family": "agent",
            "event_name": "agent.escrow.created",
            "payload_hash": format!("0x{}", "44".repeat(32)),
            "amount_lythoshi": "440000000000",
            "agent_address": "mono1agentconsumer"
        });
        let (endpoint, server) = spawn_rpc_server(vec![json!({
            "schemaVersion": 1,
            "fromBlock": 100,
            "toBlock": 105,
            "limit": 25,
            "filters": {
                "txIndex": 0,
                "address": "monos1nativeeventemitter",
                "eventTopic": event_topic.clone(),
                "family": "agent",
                "eventName": "agent.escrow.created",
                "primaryId": primary_id.clone(),
                "account": "mono1agentconsumer"
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
        })]);

        let client = RpcClient::new(endpoint).unwrap();
        let response = client
            .lyth_native_events_typed::<AgentEscrowCreatedEvent>(
                NativeEventsFilter::new(100, 105)
                    .limit(25)
                    .tx_index(0)
                    .address("monos1nativeeventemitter")
                    .event_topic(&event_topic)
                    .family("agent")
                    .event_name("agent.escrow.created")
                    .primary_id(&primary_id)
                    .account("mono1agentconsumer"),
            )
            .await
            .unwrap();

        assert_eq!(response.schema_version, 1);
        assert_eq!(response.events[0].decoded.family, "agent");
        assert_eq!(
            response.events[0].decoded.event_name,
            "agent.escrow.created"
        );
        assert_eq!(response.events[0].decoded.amount_lythoshi, "440000000000");
        assert!(response.events[0]
            .decoded
            .agent_address
            .starts_with("mono1"));

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0]["method"], "lyth_nativeEvents");
        assert_eq!(
            requests[0]["params"],
            json!([{
                "fromBlock": 100,
                "toBlock": 105,
                "limit": 25,
                "txIndex": 0,
                "address": "monos1nativeeventemitter",
                "eventTopic": event_topic,
                "family": "agent",
                "eventName": "agent.escrow.created",
                "primaryId": primary_id,
                "account": "mono1agentconsumer"
            }])
        );
    }

    fn spawn_rpc_server(results: Vec<Value>) -> (String, JoinHandle<Vec<Value>>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let endpoint = format!("http://{}", listener.local_addr().unwrap());
        let handle = thread::spawn(move || {
            let mut requests = Vec::new();
            for result in results {
                let (mut stream, _) = listener.accept().unwrap();
                stream
                    .set_read_timeout(Some(Duration::from_secs(5)))
                    .unwrap();
                let request = read_http_json_request(&mut stream);
                let id = request.get("id").cloned().unwrap_or(Value::Null);
                let body = json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": result,
                })
                .to_string();
                write!(
                    stream,
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    body.len(),
                    body
                )
                .unwrap();
                requests.push(request);
            }
            requests
        });
        (endpoint, handle)
    }

    fn read_http_json_request(stream: &mut std::net::TcpStream) -> Value {
        let mut buf = Vec::new();
        let mut tmp = [0u8; 1024];
        loop {
            let read = stream.read(&mut tmp).unwrap();
            assert_ne!(read, 0, "client closed before sending JSON-RPC body");
            buf.extend_from_slice(&tmp[..read]);
            if let Some((body_start, content_len)) = http_body_start_and_len(&buf) {
                if buf.len() >= body_start + content_len {
                    return serde_json::from_slice(&buf[body_start..body_start + content_len])
                        .unwrap();
                }
            }
        }
    }

    fn http_body_start_and_len(buf: &[u8]) -> Option<(usize, usize)> {
        let header_end = buf.windows(4).position(|window| window == b"\r\n\r\n")?;
        let headers = std::str::from_utf8(&buf[..header_end]).unwrap();
        let content_len = headers
            .lines()
            .find_map(|line| {
                line.strip_prefix("content-length:")
                    .or_else(|| line.strip_prefix("Content-Length:"))
            })?
            .trim()
            .parse::<usize>()
            .unwrap();
        Some((header_end + 4, content_len))
    }

    fn test_hex(bytes: &[u8]) -> String {
        let mut out = String::from("0x");
        for byte in bytes {
            use std::fmt::Write as _;
            write!(&mut out, "{byte:02x}").unwrap();
        }
        out
    }
}
