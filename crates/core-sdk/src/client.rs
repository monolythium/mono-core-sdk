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

use crate::error::SdkError;
use crate::types::{
    AccountPolicy, AccountProofResponse, AddressActivityEntry, AddressActivityKindResponse,
    AddressLabelRecord, AssetPolicy, BlockHeader, BlockSelector, BlsCertificateResponse,
    CallRequest, CapabilitiesResponse, CheckpointRecord, ClobMarketResponse,
    ClusterDelegatorsResponse, ClusterEntityResponse, ClusterResignationsResponse,
    DagParentsResponse, DagSyncStatus, DecodeTxResponse, DelegationCapResponse,
    DelegationHistoryRecord, DelegationsResponse, EncryptionKeyResponse, EntityRatchetResponse,
    FeeHistoryResponse, GapRecordsResponse, IndexerStatus, MempoolSnapshot, MeshDecodedTx,
    MeshSignedTxResponse, MeshTxIntent, MeshUnsignedTxResponse, PeerSummary, PendingTxSummary,
    PrecompileDescriptor, RegistryRecord, RichListResponse, RoundInfo, StorageProofBatch,
    SyncStatus, TokenBalanceRecord, TpmAttestationResponse, TransactionReceipt, TransactionView,
};

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

    /// `lyth_decodeTx` — explorer-grade decoded transaction envelope.
    pub async fn lyth_decode_tx(&self, tx_hash: &str) -> Result<DecodeTxResponse, SdkError> {
        self.call("lyth_decodeTx", json!([tx_hash])).await
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

    /// `lyth_syncStatus` — DAG-sync driver snapshot, or `None` when the
    /// running node has no driver wired.
    pub async fn lyth_sync_status(&self) -> Result<Option<DagSyncStatus>, SdkError> {
        let v: Value = self.call("lyth_syncStatus", json!([])).await?;
        if v.is_null() {
            return Ok(None);
        }
        Ok(Some(serde_json::from_value(v)?))
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

#[cfg(test)]
mod tests {
    use super::*;

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
}
