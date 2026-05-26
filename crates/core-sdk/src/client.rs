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

use crate::address::{typed_bech32_to_address_kind, AddressKind};
use crate::bridge::{BridgeRoutesRequest, BridgeRoutesResponse};
use crate::error::SdkError;
use crate::mrv::{
    build_mrv_call_native_encrypted_submission, build_mrv_deploy_native_encrypted_submission,
    MrvCallNativeEncryptedSubmission, MrvCallNativeTxPlan, MrvDeployNativeEncryptedSubmission,
    MrvDeployNativeTxPlan, MrvEncryptionKey, MrvMempoolClass, MrvNativeEncryptedSubmission,
    MrvValidationError,
};
use crate::types::{
    native_events_from_receipt, native_market_events_filter, native_market_events_from_receipt,
    typed_native_events_from_response, AccountPolicy, AccountProofResponse, AddressActivityEntry,
    AddressActivityKindResponse, AddressFlowResponse, AddressLabelRecord, AddressProfileResponse,
    AgentReputationResponse, AssetPolicy, BlockHeader, BlockSelector, BlsCertificateResponse,
    CallRequest, CapabilitiesResponse, ChainStatsResponse, CheckpointRecord, ClobMarketResponse,
    ClobMarketsResponse, ClobOhlcResponse, ClobOrderBookResponse, ClobTradesResponse,
    ClusterDelegatorsResponse, ClusterEntityResponse, ClusterResignationsResponse,
    DagParentsResponse, DagSyncStatus, DecodeTxResponse, DelegationCapResponse,
    DelegationHistoryRecord, DelegationsResponse, EncryptionKeyResponse, EntityRatchetResponse,
    FeeHistoryResponse, GapRecordsResponse, IndexerStatus, LythUpgradeStatusResponse,
    MempoolSnapshot, MeshDecodedTx, MeshSignedTxResponse, MeshTxIntent, MeshUnsignedTxResponse,
    MetricsRangeResponse, MrcAccountRequest, MrcAccountResponse, MrcHoldersRequest,
    MrcHoldersResponse, MrcMetadataResponse, NativeAgentStateFilter, NativeAgentStateResponse,
    NativeEventFilter, NativeEventsFilter, NativeEventsResponse, NativeMarketStateFilter,
    NativeMarketStateResponse, NativeReceiptResponse, OperatorCapabilitiesResponse, PeerSummary,
    PeerSummaryAggregate, PendingRewardsResponse, PendingTxSummary, PrecompileDescriptor,
    RedemptionQueueResponse, RegistryRecord, RichListResponse, RoundInfo, SearchResponse,
    StorageProofBatch, SyncStatus, TokenBalanceRecord, TpmAttestationResponse, TransactionReceipt,
    TransactionView, TxFeedResponse, TxStatusResponse, TypedNativeEventsResponse,
    TypedNativeReceiptEvent, VerticesAtRoundResponse,
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

    /// `eth_call` — legacy compatibility dry-run. No-EVM v4.1 profiles may
    /// reject this method server-side; prefer native `lyth_*` previews or the
    /// local MRV harness for current app flows.
    pub async fn eth_call(
        &self,
        request: &CallRequest,
        block: BlockSelector,
    ) -> Result<String, SdkError> {
        self.call("eth_call", json!([request, block.to_param()]))
            .await
    }

    /// `eth_estimateGas` — legacy compatibility estimate. No-EVM v4.1 profiles
    /// may reject this method server-side; prefer native execution-unit
    /// estimates.
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

    /// `eth_gasPrice` — legacy compatibility fee quote. New v4.1 surfaces
    /// should use native execution-unit price terminology.
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
        self.call(
            "lyth_getAccountPolicy",
            json!([sdk_typed_address(address, AddressKind::User, "address")?]),
        )
        .await
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
        self.call(
            "lyth_getTokenBalances",
            json!([sdk_typed_address(address, AddressKind::User, "address")?]),
        )
        .await
    }

    /// `lyth_bridgeRoutes` — read-only bridge route-selection/readiness.
    pub async fn lyth_bridge_routes(
        &self,
        request: &BridgeRoutesRequest,
    ) -> Result<BridgeRoutesResponse, SdkError> {
        self.call("lyth_bridgeRoutes", json!([request])).await
    }

    /// `lyth_mrcMetadata` — exact current-state native MRC metadata lookup.
    pub async fn lyth_mrc_metadata(
        &self,
        asset_id: &str,
        token_id: Option<&str>,
    ) -> Result<MrcMetadataResponse, SdkError> {
        let params = match token_id {
            Some(token_id) => json!([asset_id, token_id]),
            None => json!([asset_id]),
        };
        self.call("lyth_mrcMetadata", params).await
    }

    /// `lyth_mrcAccount` — exact current-state native MRC account lookup.
    pub async fn lyth_mrc_account(
        &self,
        account: &str,
        spend_limit: Option<u32>,
    ) -> Result<MrcAccountResponse, SdkError> {
        let request = MrcAccountRequest {
            account: sdk_typed_address(account, AddressKind::SmartAccount, "account")?,
            spend_limit,
        };
        let params = match request.spend_limit {
            Some(spend_limit) => json!([request.account, spend_limit]),
            None => json!([request.account]),
        };
        self.call("lyth_mrcAccount", params).await
    }

    /// `lyth_mrcHolders` — top holders for a native MRC asset/token key.
    pub async fn lyth_mrc_holders(
        &self,
        standard: &str,
        asset_id: &str,
        token_id: &str,
        limit: Option<u32>,
    ) -> Result<MrcHoldersResponse, SdkError> {
        self.lyth_mrc_holders_scoped(standard, asset_id, Some(token_id), limit)
            .await
    }

    /// `lyth_mrcHolders` — top holders for a native MRC asset/vault key.
    ///
    /// This is the asset-scoped form used by MRC-4626 vault share balances.
    pub async fn lyth_mrc_asset_holders(
        &self,
        standard: &str,
        asset_id: &str,
        limit: Option<u32>,
    ) -> Result<MrcHoldersResponse, SdkError> {
        self.lyth_mrc_holders_scoped(standard, asset_id, None, limit)
            .await
    }

    /// `lyth_mrcHolders` — top holders for MRC-4626 vault shares.
    pub async fn lyth_mrc4626_holders(
        &self,
        vault_id: &str,
        limit: Option<u32>,
    ) -> Result<MrcHoldersResponse, SdkError> {
        self.lyth_mrc_asset_holders("mrc4626", vault_id, limit)
            .await
    }

    async fn lyth_mrc_holders_scoped(
        &self,
        standard: &str,
        asset_id: &str,
        token_id: Option<&str>,
        limit: Option<u32>,
    ) -> Result<MrcHoldersResponse, SdkError> {
        let request = MrcHoldersRequest {
            standard: standard.to_owned(),
            asset_id: asset_id.to_owned(),
            token_id: token_id.map(str::to_owned),
            limit,
        };
        let MrcHoldersRequest {
            standard,
            asset_id,
            token_id,
            limit,
        } = request;
        let params = match (token_id, limit) {
            (Some(token_id), Some(limit)) => json!([standard, asset_id, token_id, limit]),
            (Some(token_id), None) => json!([standard, asset_id, token_id]),
            (None, Some(limit)) => json!([standard, asset_id, Value::Null, limit]),
            (None, None) => json!([standard, asset_id, Value::Null]),
        };
        self.call("lyth_mrcHolders", params).await
    }

    /// `lyth_getAddressLabel` — indexed display/category label for one address.
    pub async fn lyth_get_address_label(
        &self,
        address: &str,
    ) -> Result<Option<AddressLabelRecord>, SdkError> {
        let v: Value = self
            .call(
                "lyth_getAddressLabel",
                json!([sdk_typed_address(address, AddressKind::User, "address")?]),
            )
            .await?;
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
        let address = sdk_typed_address(address, AddressKind::User, "address")?;
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
        self.call(
            "lyth_addressActivityKind",
            json!([sdk_typed_address(address, AddressKind::User, "address")?]),
        )
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

    /// Typed native market event rows from `lyth_nativeReceipt`.
    pub async fn lyth_native_receipt_market_events<TDecoded>(
        &self,
        tx_hash: &str,
        filter: NativeEventFilter<'_>,
    ) -> Result<Vec<TypedNativeReceiptEvent<TDecoded>>, SdkError>
    where
        TDecoded: DeserializeOwned,
    {
        let receipt = self.lyth_native_receipt(tx_hash).await?;
        Ok(native_market_events_from_receipt::<TDecoded>(
            &receipt, filter,
        )?)
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

    /// `lyth_nativeEvents` restricted to native marketplace event rows.
    pub async fn lyth_native_market_events(
        &self,
        filter: NativeEventsFilter<'_>,
    ) -> Result<NativeEventsResponse, SdkError> {
        self.lyth_native_events(native_market_events_filter(filter))
            .await
    }

    /// `lyth_nativeEvents` market rows with decoded rows converted into a caller-selected type.
    pub async fn lyth_native_market_events_typed<TDecoded>(
        &self,
        filter: NativeEventsFilter<'_>,
    ) -> Result<TypedNativeEventsResponse<TDecoded>, SdkError>
    where
        TDecoded: DeserializeOwned,
    {
        let response = self.lyth_native_market_events(filter).await?;
        Ok(typed_native_events_from_response::<TDecoded>(&response)?)
    }

    /// `lyth_nativeAgentState` — current-state native agent policy and escrow rows.
    pub async fn lyth_native_agent_state(
        &self,
        filter: NativeAgentStateFilter<'_>,
    ) -> Result<NativeAgentStateResponse, SdkError> {
        self.call("lyth_nativeAgentState", json!([filter])).await
    }

    /// `lyth_nativeMarketState` — current-state native spot and NFT market rows.
    pub async fn lyth_native_market_state(
        &self,
        filter: NativeMarketStateFilter<'_>,
    ) -> Result<NativeMarketStateResponse, SdkError> {
        self.call("lyth_nativeMarketState", json!([filter])).await
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
        self.call(
            "lyth_addressProfile",
            json!([sdk_typed_address(address, AddressKind::User, "address")?]),
        )
        .await
    }

    /// `lyth_addressFlow` — recent indexed address-flow aggregate.
    pub async fn lyth_address_flow(
        &self,
        address: &str,
        limit: Option<u32>,
    ) -> Result<AddressFlowResponse, SdkError> {
        let address = sdk_typed_address(address, AddressKind::User, "address")?;
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
        let wallet = sdk_typed_address(wallet, AddressKind::User, "wallet")?;
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
        let wallet = sdk_typed_address(wallet, AddressKind::User, "wallet")?;
        let params = match block {
            Some(block) => json!([wallet, block.to_param()]),
            None => json!([wallet]),
        };
        self.call("lyth_pendingRewards", params).await
    }

    /// `lyth_redemptionQueue` — wallet redemption tickets at `block`.
    pub async fn lyth_redemption_queue(
        &self,
        wallet: &str,
        block: Option<BlockSelector>,
    ) -> Result<RedemptionQueueResponse, SdkError> {
        let wallet = sdk_typed_address(wallet, AddressKind::User, "wallet")?;
        let params = match block {
            Some(block) => json!([wallet, block.to_param()]),
            None => json!([wallet]),
        };
        self.call("lyth_redemptionQueue", params).await
    }

    /// `lyth_getDelegationHistory` — indexed per-wallet delegation event timeline.
    pub async fn lyth_get_delegation_history(
        &self,
        wallet: &str,
        limit: Option<u32>,
        cursor: Option<&str>,
    ) -> Result<Vec<DelegationHistoryRecord>, SdkError> {
        let wallet = sdk_typed_address(wallet, AddressKind::User, "wallet")?;
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

    /// `debug_traceTransaction` — legacy compatibility trace for a confirmed
    /// tx (server-side gated; unavailable on no-EVM profiles).
    pub async fn debug_trace_transaction(&self, tx_hash: &str) -> Result<Value, SdkError> {
        self.call("debug_traceTransaction", json!([tx_hash])).await
    }

    /// `debug_traceCall` — legacy compatibility trace for a dry-run call
    /// (server-side gated; unavailable on no-EVM profiles).
    pub async fn debug_trace_call(
        &self,
        request: &CallRequest,
        block: BlockSelector,
    ) -> Result<Value, SdkError> {
        self.call("debug_traceCall", json!([request, block.to_param()]))
            .await
    }

    /// `debug_traceBlockByNumber` — legacy compatibility traces for an entire
    /// block (server-side gated; unavailable on no-EVM profiles).
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
    let provider = sdk_typed_address(provider, AddressKind::User, "provider address")?;
    Ok(json!([provider, category_id.unwrap_or(0)]))
}

fn sdk_typed_address(raw: &str, kind: AddressKind, label: &str) -> Result<String, SdkError> {
    if raw.starts_with("0x") || raw.starts_with("0X") {
        return Err(SdkError::Malformed(format!(
            "{label} raw 0x addresses are retired; use typed {} bech32m addresses",
            kind.hrp()
        )));
    }
    typed_bech32_to_address_kind(raw, kind).map_err(|err| {
        SdkError::Malformed(format!(
            "{label} must be typed {} bech32m address: {err}",
            kind.hrp()
        ))
    })?;
    Ok(raw.to_ascii_lowercase())
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

    fn typed_address(kind: AddressKind, byte: u8) -> String {
        crate::address::address_to_typed_bech32(kind, [byte; 20])
    }

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
    fn agent_reputation_params_forwards_typed_provider_and_default_category() {
        let params =
            agent_reputation_params("mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4", None).unwrap();
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
    fn agent_reputation_params_reject_raw_provider_address() {
        let err = agent_reputation_params("0x123456789abcdef0112233445566778899aabbcc", None)
            .unwrap_err();
        assert!(matches!(err, SdkError::Malformed(_)));
        assert!(err.to_string().contains("raw 0x addresses are retired"));
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
    fn sdk_typed_address_rejects_raw_hex_and_wrong_hrp() {
        let raw = "0x123456789abcdef0112233445566778899aabbcc";
        let err = sdk_typed_address(raw, AddressKind::User, "address").unwrap_err();
        assert!(err.to_string().contains("raw 0x addresses are retired"));

        let contract = typed_address(AddressKind::Contract, 0x12);
        let err = sdk_typed_address(&contract, AddressKind::User, "address").unwrap_err();
        assert!(err
            .to_string()
            .contains("must be typed mono bech32m address"));
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
        let address = typed_address(AddressKind::User, 0x11);
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
            },
            {
                "tokenId": format!("0x{}", "ff".repeat(32)),
                "balance": "700",
                "updatedAtBlock": 92,
                "mrc": {
                    "standard": "mrc4626",
                    "assetId": format!("0x{}", "ff".repeat(32)),
                    "tokenId": null
                }
            }
        ])]);

        let client = RpcClient::new(endpoint).unwrap();
        let balances = client.lyth_get_token_balances(&address).await.unwrap();

        assert_eq!(balances.len(), 4);
        let mrc = balances[0].mrc.as_ref().expect("mrc identity");
        assert_eq!(mrc.standard, "mrc1155");
        assert_eq!(mrc.asset_id, format!("0x{}", "bb".repeat(32)));
        assert_eq!(
            mrc.token_id.as_ref().unwrap(),
            &format!("0x{}", "cc".repeat(32))
        );
        assert_eq!(balances[1].mrc, None);
        assert_eq!(balances[2].mrc, None);
        let vault_mrc = balances[3].mrc.as_ref().expect("mrc4626 identity");
        assert_eq!(balances[3].token_id, format!("0x{}", "ff".repeat(32)));
        assert_eq!(vault_mrc.standard, "mrc4626");
        assert_eq!(vault_mrc.asset_id, format!("0x{}", "ff".repeat(32)));
        assert_eq!(vault_mrc.token_id, None);

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0]["method"], "lyth_getTokenBalances");
        assert_eq!(requests[0]["params"], json!([address]));
    }

    #[tokio::test]
    async fn lyth_bridge_routes_sends_typed_request_and_decodes_readiness() {
        let route = crate::bridge::BridgeRouteDisclosure {
            route_id: "healthy".to_owned(),
            bridge: "CCIP".to_owned(),
            asset: "USDC".to_owned(),
            fee_token: "LINK".to_owned(),
            source_chain: "Ethereum".to_owned(),
            destination_chain: "Mono".to_owned(),
            verifier: crate::bridge::BridgeVerifierDisclosure {
                model: "DON".to_owned(),
                participant_count: 7,
                threshold: 5,
            },
            drain_cap_atomic: "100000000000".to_owned(),
            finality_blocks: 64,
            cooldown_seconds: 86_400,
            admin_control: crate::bridge::BridgeAdminControl::ConsensusOnly,
            circuit_breaker: crate::bridge::BridgeCircuitBreakerState::Armed,
            insurance_atomic: "50000000000".to_owned(),
            last_incident_date: None,
        };
        let request = BridgeRoutesRequest {
            intent: Some(crate::bridge::BridgeTransferIntent {
                asset: "USDC".to_owned(),
                amount_atomic: "1000000".to_owned(),
                source_chain: "Ethereum".to_owned(),
                destination_chain: "Mono".to_owned(),
                recipient: "mono1recipient".to_owned(),
                sender: None,
                allowed_route_ids: None,
                minimum_score: None,
                max_finality_blocks: None,
                max_cooldown_seconds: None,
            }),
            route_disclosures: Some(vec![route]),
            ..BridgeRoutesRequest::default()
        };
        let reply = crate::bridge::bridge_routes_readiness(&request);
        let (endpoint, server) = spawn_rpc_server(vec![serde_json::to_value(&reply).unwrap()]);

        let client = RpcClient::new(endpoint).unwrap();
        let response = client.lyth_bridge_routes(&request).await.unwrap();

        assert!(response.route_selection_ready);
        assert!(!response.quote_ready);
        assert!(!response.submit_ready);

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0]["method"], "lyth_bridgeRoutes");
        assert_eq!(requests[0]["params"], json!([request]));
    }

    #[tokio::test]
    async fn lyth_bridge_routes_decodes_discovery_only_catalogue() {
        let route = crate::bridge::BridgeRouteDisclosure {
            route_id: "healthy".to_owned(),
            bridge: "CCIP".to_owned(),
            asset: "USDC".to_owned(),
            fee_token: "LINK".to_owned(),
            source_chain: "Ethereum".to_owned(),
            destination_chain: "Mono".to_owned(),
            verifier: crate::bridge::BridgeVerifierDisclosure {
                model: "DON".to_owned(),
                participant_count: 7,
                threshold: 5,
            },
            drain_cap_atomic: "100000000000".to_owned(),
            finality_blocks: 64,
            cooldown_seconds: 86_400,
            admin_control: crate::bridge::BridgeAdminControl::ConsensusOnly,
            circuit_breaker: crate::bridge::BridgeCircuitBreakerState::Armed,
            insurance_atomic: "50000000000".to_owned(),
            last_incident_date: None,
        };
        let request = BridgeRoutesRequest {
            route_disclosures: Some(vec![route]),
            ..BridgeRoutesRequest::default()
        };
        let reply = crate::bridge::bridge_routes_readiness(&request);
        let (endpoint, server) = spawn_rpc_server(vec![serde_json::to_value(&reply).unwrap()]);

        let client = RpcClient::new(endpoint).unwrap();
        let response = client.lyth_bridge_routes(&request).await.unwrap();

        assert!(!response.route_selection_ready);
        assert!(!response.quote_ready);
        assert!(!response.submit_ready);
        assert_eq!(
            response
                .routes
                .as_ref()
                .and_then(|routes| routes.first())
                .map(|route| route.route_id.as_str()),
            Some("healthy")
        );
        assert_eq!(
            response.source.as_ref().map(|source| source.route_count),
            Some(1)
        );

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0]["method"], "lyth_bridgeRoutes");
        assert!(requests[0]["params"][0].get("intent").is_none());
        assert_eq!(requests[0]["params"], json!([request]));
    }

    #[tokio::test]
    async fn lyth_mrc_metadata_decodes_present_and_missing_rows() {
        let asset_id = format!("0x{}", "bb".repeat(32));
        let token_id = format!("0x{}", "cc".repeat(32));
        let (endpoint, server) = spawn_rpc_server(vec![
            json!({
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
            }),
            json!({
                "schemaVersion": 1,
                "assetId": asset_id,
                "tokenId": null,
                "metadata": null
            }),
        ]);

        let client = RpcClient::new(endpoint).unwrap();
        let token_metadata = client
            .lyth_mrc_metadata(&asset_id, Some(&token_id))
            .await
            .unwrap();
        assert_eq!(
            token_metadata.metadata.unwrap().uri.unwrap(),
            "ipfs://metadata/1"
        );

        let asset_metadata = client.lyth_mrc_metadata(&asset_id, None).await.unwrap();
        assert_eq!(asset_metadata.token_id, None);
        assert_eq!(asset_metadata.metadata, None);

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 2);
        assert_eq!(requests[0]["method"], "lyth_mrcMetadata");
        assert_eq!(requests[0]["params"], json!([asset_id, token_id]));
        assert_eq!(requests[1]["method"], "lyth_mrcMetadata");
        assert_eq!(requests[1]["params"], json!([asset_id]));
    }

    #[tokio::test]
    async fn lyth_mrc_account_decodes_account_rows_and_params() {
        let account = typed_address(AddressKind::SmartAccount, 0x33);
        let controller = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let recovery = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let asset_id = format!("0x{}", "bb".repeat(32));
        let policy_hash = format!("0x{}", "44".repeat(32));
        let (endpoint, server) = spawn_rpc_server(vec![
            json!({
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
                "policyAccount": null,
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
            }),
            json!({
                "schemaVersion": 1,
                "account": account,
                "spendLimit": 50,
                "smartAccount": null,
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
                "policySpends": []
            }),
        ]);

        let client = RpcClient::new(endpoint).unwrap();
        let limited = client.lyth_mrc_account(&account, Some(2)).await.unwrap();
        assert_eq!(limited.account, account);
        assert_eq!(limited.spend_limit, 2);
        let smart = limited.smart_account.as_ref().expect("smart account");
        assert_eq!(smart.controller, controller);
        assert_eq!(smart.recovery.as_deref(), Some(recovery));
        assert_eq!(smart.policy_hash, None);
        assert_eq!(smart.nonce.as_deref(), Some("7"));
        assert_eq!(limited.policy_account, None);
        assert_eq!(limited.policy_spends[0].asset_id, asset_id);
        assert_eq!(limited.policy_spends[0].spent, "250");

        let defaulted = client.lyth_mrc_account(&account, None).await.unwrap();
        assert_eq!(defaulted.spend_limit, 50);
        let policy = defaulted.policy_account.as_ref().expect("policy account");
        assert_eq!(policy.policy_hash.as_deref(), Some(policy_hash.as_str()));
        let policy_body = policy.policy.as_ref().expect("policy body");
        assert!(policy_body.enabled);
        assert_eq!(policy_body.per_action_limit, "20");
        assert_eq!(policy_body.allowed_assets, vec![asset_id]);
        assert!(defaulted.policy_spends.is_empty());

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 2);
        assert_eq!(requests[0]["method"], "lyth_mrcAccount");
        assert_eq!(requests[0]["params"], json!([account, 2]));
        assert_eq!(requests[1]["method"], "lyth_mrcAccount");
        assert_eq!(requests[1]["params"], json!([account]));
    }

    #[tokio::test]
    async fn lyth_mrc_holders_decodes_holder_rows_and_params() {
        let asset_id = format!("0x{}", "bb".repeat(32));
        let token_id = format!("0x{}", "cc".repeat(32));
        let address = "0x1111111111111111111111111111111111111111";
        let (endpoint, server) = spawn_rpc_server(vec![
            json!({
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
            }),
            json!({
                "schemaVersion": 1,
                "standard": "mrc1155",
                "assetId": asset_id,
                "tokenId": token_id,
                "limit": 50,
                "holders": []
            }),
            json!({
                "schemaVersion": 1,
                "standard": "mrc4626",
                "assetId": asset_id,
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
            }),
        ]);

        let client = RpcClient::new(endpoint).unwrap();
        let limited = client
            .lyth_mrc_holders("mrc1155", &asset_id, &token_id, Some(5))
            .await
            .unwrap();
        assert_eq!(limited.standard, "mrc1155");
        assert_eq!(limited.asset_id, asset_id);
        assert_eq!(limited.token_id.as_deref(), Some(token_id.as_str()));
        assert_eq!(limited.holders[0].address, address);
        assert_eq!(limited.holders[0].updated_at_block, 91);

        let defaulted = client
            .lyth_mrc_holders("mrc1155", &asset_id, &token_id, None)
            .await
            .unwrap();
        assert_eq!(defaulted.limit, 50);
        assert!(defaulted.holders.is_empty());

        let vault_holders = client
            .lyth_mrc4626_holders(&asset_id, Some(10))
            .await
            .unwrap();
        assert_eq!(vault_holders.standard, "mrc4626");
        assert_eq!(vault_holders.asset_id, asset_id);
        assert_eq!(vault_holders.token_id, None);
        assert_eq!(vault_holders.holders[0].balance, "700");

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 3);
        assert_eq!(requests[0]["method"], "lyth_mrcHolders");
        assert_eq!(
            requests[0]["params"],
            json!(["mrc1155", asset_id, token_id, 5])
        );
        assert_eq!(requests[1]["method"], "lyth_mrcHolders");
        assert_eq!(
            requests[1]["params"],
            json!(["mrc1155", asset_id, token_id])
        );
        assert_eq!(requests[2]["method"], "lyth_mrcHolders");
        assert_eq!(
            requests[2]["params"],
            json!(["mrc4626", asset_id, null, 10])
        );
    }

    #[tokio::test]
    async fn lyth_address_profile_decodes_token_balance_mrc_identity() {
        let address = typed_address(AddressKind::User, 0x11);
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
        let profile = client.lyth_address_profile(&address).await.unwrap();

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
    async fn lyth_redemption_queue_serializes_block_and_decodes_tickets() {
        let wallet = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let (endpoint, server) = spawn_rpc_server(vec![json!({
            "wallet": wallet,
            "tickets": [{
                "index": 0,
                "cluster": 7,
                "weightBps": 2_500,
                "createdHeight": 20,
                "maturityHeight": 120,
                "mature": false
            }],
            "count": 1,
            "returned": 1,
            "block": 99
        })]);

        let client = RpcClient::new(endpoint).unwrap();
        let response = client
            .lyth_redemption_queue(wallet, Some(BlockSelector::Number(99)))
            .await
            .unwrap();

        assert_eq!(response.wallet, wallet);
        assert_eq!(response.count, 1);
        assert_eq!(response.returned, 1);
        assert_eq!(response.tickets.len(), 1);
        assert_eq!(response.tickets[0].index, 0);
        assert_eq!(response.tickets[0].cluster, 7);
        assert_eq!(response.tickets[0].weight_bps, 2_500);
        assert_eq!(response.tickets[0].created_height, 20);
        assert_eq!(response.tickets[0].maturity_height, 120);
        assert_eq!(response.tickets[0].mature, Some(false));
        assert_eq!(response.block, json!(99));

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0]["method"], "lyth_redemptionQueue");
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

    #[tokio::test]
    async fn lyth_native_agent_state_serializes_filter_and_decodes_rows() {
        let policy_id = format!("0x{}", "aa".repeat(32));
        let escrow_id = format!("0x{}", "bb".repeat(32));
        let asset_id = format!("0x{}", "cc".repeat(32));
        let terms_hash = format!("0x{}", "dd".repeat(32));
        let payload_hash = format!("0x{}", "ee".repeat(32));
        let issuer_id = format!("0x{}", "11".repeat(32));
        let attestation_id = format!("0x{}", "12".repeat(32));
        let consent_id = format!("0x{}", "13".repeat(32));
        let service_id = format!("0x{}", "14".repeat(32));
        let arbiter_id = format!("0x{}", "15".repeat(32));
        let review_id = format!("0x{}", "16".repeat(32));
        let metadata_hash = format!("0x{}", "1b".repeat(32));
        let owner = "mono1agentowner000000000000000000000000000000";
        let controller = "mono1agentcontroller000000000000000000000000";
        let provider = "mono1agentprovider0000000000000000000000000";
        let arbiter = "mono1agentarbiter00000000000000000000000000";
        let (endpoint, server) = spawn_rpc_server(vec![json!({
            "schemaVersion": 1,
            "limit": 5,
            "filters": {
                "policyId": null,
                "escrowId": null,
                "account": owner,
                "includePolicySpends": true
            },
            "issuers": [{
                "issuerId": issuer_id,
                "issuer": owner,
                "metadataHash": metadata_hash,
                "updatedAtBlock": 45
            }],
            "attestations": [{
                "attestationId": attestation_id,
                "issuerId": issuer_id,
                "issuer": owner,
                "subject": controller,
                "schemaHash": format!("0x{}", "17".repeat(32)),
                "payloadHash": payload_hash,
                "active": false,
                "updatedAtBlock": 46
            }],
            "consents": [{
                "consentId": consent_id,
                "subject": controller,
                "grantee": arbiter,
                "scopeHash": format!("0x{}", "19".repeat(32)),
                "expiresAt": 10_000,
                "active": true,
                "updatedAtBlock": 47
            }],
            "services": [{
                "serviceId": service_id,
                "provider": provider,
                "categoryHash": format!("0x{}", "1a".repeat(32)),
                "metadataHash": metadata_hash,
                "active": true,
                "updatedAtBlock": 48
            }],
            "availability": [{
                "provider": provider,
                "maxConcurrent": 8,
                "openRequests": 2,
                "paused": false,
                "updatedAtBlock": 49
            }],
            "arbiters": [{
                "arbiterId": arbiter_id,
                "arbiter": arbiter,
                "tier": 2,
                "metadataHash": metadata_hash,
                "updatedAtBlock": 50
            }],
            "reputationReviews": [{
                "reviewId": review_id,
                "reviewer": owner,
                "subject": provider,
                "categoryId": 7,
                "speedScore": 9,
                "qualityScore": 8,
                "communicationScore": 10,
                "accuracyScore": 9,
                "payloadHash": payload_hash,
                "updatedAtBlock": 51
            }],
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
                "submittedPayloadHash": payload_hash,
                "status": "submitted",
                "resolution": null,
                "lastActor": provider,
                "createdAtBlock": 40,
                "updatedAtBlock": 44
            }],
            "source": {
                "indexerProvider": "native_agent_state",
                "projection": "native_agent_state"
            }
        })]);

        let client = RpcClient::new(endpoint).unwrap();
        let response = client
            .lyth_native_agent_state(
                NativeAgentStateFilter::new()
                    .account(owner)
                    .include_policy_spends(true)
                    .limit(5),
            )
            .await
            .unwrap();

        assert_eq!(response.schema_version, 1);
        assert_eq!(response.issuers[0].issuer_id, issuer_id);
        assert_eq!(response.attestations[0].attestation_id, attestation_id);
        assert!(!response.attestations[0].active);
        assert_eq!(response.consents[0].expires_at, Some(10_000));
        assert_eq!(response.services[0].service_id, service_id);
        assert_eq!(response.availability[0].max_concurrent, 8);
        assert_eq!(response.arbiters[0].tier, Some(2));
        assert_eq!(response.reputation_reviews[0].quality_score, 8);
        assert_eq!(response.spending_policies[0].per_action_limit, "100");
        assert_eq!(response.policy_spends[0].window, 7);
        assert_eq!(response.policy_spends[0].spent, "125");
        assert_eq!(
            response.escrows[0].submitted_payload_hash.as_deref(),
            Some(payload_hash.as_str())
        );
        assert_eq!(response.escrows[0].last_actor.as_deref(), Some(provider));
        assert_eq!(response.filters.account.as_deref(), Some(owner));
        assert_eq!(response.source.indexer_provider, "native_agent_state");

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0]["method"], "lyth_nativeAgentState");
        assert_eq!(
            requests[0]["params"],
            json!([{
                "account": owner,
                "includePolicySpends": true,
                "limit": 5
            }])
        );
    }

    #[tokio::test]
    async fn lyth_native_market_state_serializes_filter_and_decodes_rows() {
        let market_id = format!("0x{}", "aa".repeat(32));
        let order_id = format!("0x{}", "bb".repeat(32));
        let listing_id = format!("0x{}", "cc".repeat(32));
        let legacy_listing_id = format!("0x{}", "cd".repeat(32));
        let collection_id = format!("0x{}", "dd".repeat(32));
        let owner = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
        let seller = "mono1seller0000000000000000000000000000000000";
        let bidder = "mono1bidder0000000000000000000000000000000000";
        let royalty_recipient = "mono1royalty00000000000000000000000000000000";
        let (endpoint, server) = spawn_rpc_server(vec![json!({
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
                "baseAssetId": format!("0x{}", "11".repeat(32)),
                "quoteAssetId": format!("0x{}", "22".repeat(32)),
                "tickSize": "10",
                "lotSize": "5",
                "minQuantity": "25",
                "minNotional": "1000",
                "tradeCount": "2",
                "totalVolumeBase": "40",
                "lastPrice": "7",
                "lastBlockHeight": 45,
                "createdAtBlock": 40,
                "updatedAtBlock": 45
            }],
            "spotOrders": [{
                "orderId": order_id,
                "marketId": market_id,
                "owner": owner,
                "nonce": 7,
                "side": "bid",
                "price": "7",
                "quantity": "30",
                "remaining": "20",
                "status": "open",
                "expiresAtBlock": 99,
                "updatedAtBlock": 45
            }],
            "nftListings": [
                {
                    "listingId": listing_id,
                    "seller": seller,
                    "nonce": 11,
                    "standard": "mrc721",
                    "collectionId": collection_id,
                    "tokenId": format!("0x{}", "33".repeat(32)),
                    "quantity": "1",
                    "paymentAssetId": format!("0x{}", "44".repeat(32)),
                    "price": "700",
                    "listingKind": { "fixedPrice": true },
                    "status": "open",
                    "expiresAtBlock": 120,
                    "highestBidder": bidder,
                    "highestBid": "650",
                    "updatedAtBlock": 46
                },
                {
                    "listingId": legacy_listing_id,
                    "seller": seller,
                    "standard": "mrc721",
                    "collectionId": collection_id,
                    "tokenId": format!("0x{}", "34".repeat(32)),
                    "quantity": "1",
                    "paymentAssetId": format!("0x{}", "44".repeat(32)),
                    "price": "701",
                    "listingKind": { "fixedPrice": true },
                    "status": "open",
                    "expiresAtBlock": 121,
                    "highestBidder": null,
                    "highestBid": null,
                    "updatedAtBlock": 47
                }
            ],
            "collectionRoyalties": [{
                "collectionId": collection_id,
                "creator": null,
                "recipient": royalty_recipient,
                "bps": 250,
                "updatedAtBlock": 47
            }],
            "source": {
                "indexerProvider": "native_market_state",
                "projection": "native_market_state"
            }
        })]);

        let client = RpcClient::new(endpoint).unwrap();
        let response = client
            .lyth_native_market_state(
                NativeMarketStateFilter::new()
                    .market_id(&market_id)
                    .account(owner)
                    .include_spot_orders(true)
                    .limit(5),
            )
            .await
            .unwrap();

        assert_eq!(response.schema_version, 1);
        assert_eq!(response.spot_markets[0].trade_count, "2");
        assert_eq!(response.spot_orders[0].nonce, Some(7));
        assert_eq!(response.spot_orders[0].remaining, "20");
        assert_eq!(response.nft_listings[0].nonce, Some(11));
        assert_eq!(response.nft_listings[1].nonce, None);
        assert_eq!(response.nft_listings[0].listing_kind["fixedPrice"], true);
        assert_eq!(
            response.nft_listings[0].highest_bidder.as_deref(),
            Some(bidder)
        );
        assert_eq!(response.collection_royalties[0].bps, 250);
        assert_eq!(response.filters.account.as_deref(), Some(owner));
        assert_eq!(response.source.indexer_provider, "native_market_state");

        let requests = server.join().unwrap();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0]["method"], "lyth_nativeMarketState");
        assert_eq!(
            requests[0]["params"],
            json!([{
                "marketId": market_id,
                "account": owner,
                "includeSpotOrders": true,
                "limit": 5
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
