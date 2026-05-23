//! `ts-rs` bindings export.
//!
//! When the `ts-bindings` feature is enabled, every `#[derive(TS)]` type
//! exports a `.ts` file under `bindings/` via `T::export_all()`. Running
//! this from a test means a bare `cargo test --features ts-bindings`
//! produces the canonical bindings the TypeScript workspace consumes.
//!
//! This file is a no-op when the feature is off — the SDK builds clean
//! without ts-rs in production.

#![cfg(feature = "ts-bindings")]

use monolythium_core_sdk::bridge::{
    BridgeAdminControl, BridgeCircuitBreakerState, BridgeQuoteSubmitReadiness, BridgeRiskTier,
    BridgeRouteAssessment, BridgeRouteCandidate, BridgeRouteCatalogue, BridgeRouteCatalogueRoute,
    BridgeRouteCatalogueValidation, BridgeRouteDisclosure, BridgeRouteSelection,
    BridgeRoutesRequest, BridgeRoutesResponse, BridgeRoutesSource, BridgeTransferIntent,
    BridgeTransferRequest, BridgeVerifierDisclosure,
};
use monolythium_core_sdk::mrv::{
    MrvAbiManifest, MrvAbiParam, MrvAbiSymbol, MrvAbiSymbolKind, MrvAbiType, MrvAddressKind,
    MrvArtifactMetadata, MrvBuildMetadata, MrvCallRequest, MrvCallResponse, MrvCallStatus,
    MrvDeployPayload, MrvDeployRequest, MrvDeployResponse, MrvEventRecord, MrvExecutionReceipt,
    MrvMemoryLimits, MrvMeterCounters, MrvNativeStateDelta, MrvResolvedSyscall, MrvRevertPayload,
    MrvRiscvProfile, MrvStorageNamespace, MrvSyscallImport, MrvTransactionExtension,
    MrvTypedAddress, MrvValidatedArtifactMetadata,
};
use monolythium_core_sdk::types::{
    AccountPolicy, AccountProofResponse, AddressActivityArchiveRedirect, AddressActivityEntry,
    AddressActivityKindResponse, AddressActivityKindRetention, AddressLabelRecord,
    AgentReputationCategoryScope, AgentReputationRecord, AgentReputationResponse, AssetPolicy,
    BlockHeader, BlockTag, BlsCertificateResponse, CallRequest, CapabilitiesResponse,
    CapabilityDescriptor, CheckpointRecord, ClobMarketRecord, ClobMarketResponse,
    ClusterDelegatorsResponse, ClusterEntityResponse, ClusterResignationRow,
    ClusterResignationsResponse, DagParent, DagParentsResponse, DagSyncStatus, DecodeTxExtension,
    DecodeTxLog, DecodeTxPqAttestation, DecodeTxResponse, DelegationCapResponse,
    DelegationHistoryRecord, DelegationRow, DelegationsResponse, EncryptionKeyResponse,
    EntityRatchetResponse, FeeHistoryResponse, GapRange, GapRecord, GapRecordsResponse,
    IndexerStatus, MempoolSnapshot, MeshDecodedTx, MeshSignedTxResponse, MeshTxIntent,
    MeshUnsignedTxResponse, MrcAccountRecord, MrcAccountRequest, MrcAccountResponse,
    MrcHoldersRequest, MrcHoldersResponse, MrcMetadataRecord, MrcMetadataResponse,
    MrcPolicySpendRecord, NativeReceiptFee, PeerSummary, PendingRewardsResponse, PendingRewardsRow,
    PendingTxSummary, PrecompileDescriptor, RedemptionQueueResponse, RedemptionQueueTicket,
    RegistryRecord, RichListHolder, RichListResponse, RoundInfo, StorageProofBatch, SyncStatus,
    TokenBalanceMrcIdentity, TokenBalanceRecord, TpmAttestationResponse, TransactionReceipt,
    TransactionView,
};
use ts_rs::TS;

#[test]
fn export_bindings() {
    // `ts-rs` writes to `<crate-dir>/bindings/<TypeName>.ts` by default.
    // We call `export_all_to` explicitly so the path is stable across
    // workspace layouts.
    let out = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("bindings");
    std::fs::create_dir_all(&out).expect("bindings dir");

    AccountPolicy::export_all_to(&out).expect("AccountPolicy");
    AccountProofResponse::export_all_to(&out).expect("AccountProofResponse");
    AddressActivityArchiveRedirect::export_all_to(&out).expect("AddressActivityArchiveRedirect");
    AddressActivityEntry::export_all_to(&out).expect("AddressActivityEntry");
    AddressActivityKindResponse::export_all_to(&out).expect("AddressActivityKindResponse");
    AddressActivityKindRetention::export_all_to(&out).expect("AddressActivityKindRetention");
    AddressLabelRecord::export_all_to(&out).expect("AddressLabelRecord");
    AgentReputationCategoryScope::export_all_to(&out).expect("AgentReputationCategoryScope");
    AgentReputationRecord::export_all_to(&out).expect("AgentReputationRecord");
    AgentReputationResponse::export_all_to(&out).expect("AgentReputationResponse");
    AssetPolicy::export_all_to(&out).expect("AssetPolicy");
    BridgeAdminControl::export_all_to(&out).expect("BridgeAdminControl");
    BridgeCircuitBreakerState::export_all_to(&out).expect("BridgeCircuitBreakerState");
    BridgeQuoteSubmitReadiness::export_all_to(&out).expect("BridgeQuoteSubmitReadiness");
    BridgeRiskTier::export_all_to(&out).expect("BridgeRiskTier");
    BridgeRouteAssessment::export_all_to(&out).expect("BridgeRouteAssessment");
    BridgeRouteCandidate::export_all_to(&out).expect("BridgeRouteCandidate");
    BridgeRouteCatalogue::export_all_to(&out).expect("BridgeRouteCatalogue");
    BridgeRouteCatalogueRoute::export_all_to(&out).expect("BridgeRouteCatalogueRoute");
    BridgeRouteCatalogueValidation::export_all_to(&out).expect("BridgeRouteCatalogueValidation");
    BridgeRouteDisclosure::export_all_to(&out).expect("BridgeRouteDisclosure");
    BridgeRouteSelection::export_all_to(&out).expect("BridgeRouteSelection");
    BridgeRoutesRequest::export_all_to(&out).expect("BridgeRoutesRequest");
    BridgeRoutesResponse::export_all_to(&out).expect("BridgeRoutesResponse");
    BridgeRoutesSource::export_all_to(&out).expect("BridgeRoutesSource");
    BridgeTransferIntent::export_all_to(&out).expect("BridgeTransferIntent");
    BridgeTransferRequest::export_all_to(&out).expect("BridgeTransferRequest");
    BridgeVerifierDisclosure::export_all_to(&out).expect("BridgeVerifierDisclosure");
    BlsCertificateResponse::export_all_to(&out).expect("BlsCertificateResponse");
    BlockHeader::export_all_to(&out).expect("BlockHeader");
    BlockTag::export_all_to(&out).expect("BlockTag");
    CallRequest::export_all_to(&out).expect("CallRequest");
    CapabilitiesResponse::export_all_to(&out).expect("CapabilitiesResponse");
    CapabilityDescriptor::export_all_to(&out).expect("CapabilityDescriptor");
    CheckpointRecord::export_all_to(&out).expect("CheckpointRecord");
    ClobMarketRecord::export_all_to(&out).expect("ClobMarketRecord");
    ClobMarketResponse::export_all_to(&out).expect("ClobMarketResponse");
    ClusterDelegatorsResponse::export_all_to(&out).expect("ClusterDelegatorsResponse");
    ClusterEntityResponse::export_all_to(&out).expect("ClusterEntityResponse");
    ClusterResignationRow::export_all_to(&out).expect("ClusterResignationRow");
    ClusterResignationsResponse::export_all_to(&out).expect("ClusterResignationsResponse");
    DagParent::export_all_to(&out).expect("DagParent");
    DagParentsResponse::export_all_to(&out).expect("DagParentsResponse");
    DagSyncStatus::export_all_to(&out).expect("DagSyncStatus");
    DecodeTxExtension::export_all_to(&out).expect("DecodeTxExtension");
    DecodeTxLog::export_all_to(&out).expect("DecodeTxLog");
    DecodeTxPqAttestation::export_all_to(&out).expect("DecodeTxPqAttestation");
    DecodeTxResponse::export_all_to(&out).expect("DecodeTxResponse");
    DelegationCapResponse::export_all_to(&out).expect("DelegationCapResponse");
    DelegationHistoryRecord::export_all_to(&out).expect("DelegationHistoryRecord");
    DelegationRow::export_all_to(&out).expect("DelegationRow");
    DelegationsResponse::export_all_to(&out).expect("DelegationsResponse");
    EncryptionKeyResponse::export_all_to(&out).expect("EncryptionKeyResponse");
    EntityRatchetResponse::export_all_to(&out).expect("EntityRatchetResponse");
    FeeHistoryResponse::export_all_to(&out).expect("FeeHistoryResponse");
    GapRange::export_all_to(&out).expect("GapRange");
    GapRecord::export_all_to(&out).expect("GapRecord");
    GapRecordsResponse::export_all_to(&out).expect("GapRecordsResponse");
    IndexerStatus::export_all_to(&out).expect("IndexerStatus");
    MempoolSnapshot::export_all_to(&out).expect("MempoolSnapshot");
    MeshDecodedTx::export_all_to(&out).expect("MeshDecodedTx");
    MeshSignedTxResponse::export_all_to(&out).expect("MeshSignedTxResponse");
    MeshTxIntent::export_all_to(&out).expect("MeshTxIntent");
    MeshUnsignedTxResponse::export_all_to(&out).expect("MeshUnsignedTxResponse");
    MrcAccountRecord::export_all_to(&out).expect("MrcAccountRecord");
    MrcAccountRequest::export_all_to(&out).expect("MrcAccountRequest");
    MrcAccountResponse::export_all_to(&out).expect("MrcAccountResponse");
    MrcHoldersRequest::export_all_to(&out).expect("MrcHoldersRequest");
    MrcHoldersResponse::export_all_to(&out).expect("MrcHoldersResponse");
    MrcMetadataRecord::export_all_to(&out).expect("MrcMetadataRecord");
    MrcMetadataResponse::export_all_to(&out).expect("MrcMetadataResponse");
    MrcPolicySpendRecord::export_all_to(&out).expect("MrcPolicySpendRecord");
    NativeReceiptFee::export_all_to(&out).expect("NativeReceiptFee");
    PeerSummary::export_all_to(&out).expect("PeerSummary");
    PendingRewardsResponse::export_all_to(&out).expect("PendingRewardsResponse");
    PendingRewardsRow::export_all_to(&out).expect("PendingRewardsRow");
    PendingTxSummary::export_all_to(&out).expect("PendingTxSummary");
    PrecompileDescriptor::export_all_to(&out).expect("PrecompileDescriptor");
    RedemptionQueueResponse::export_all_to(&out).expect("RedemptionQueueResponse");
    RedemptionQueueTicket::export_all_to(&out).expect("RedemptionQueueTicket");
    RegistryRecord::export_all_to(&out).expect("RegistryRecord");
    RichListHolder::export_all_to(&out).expect("RichListHolder");
    RichListResponse::export_all_to(&out).expect("RichListResponse");
    RoundInfo::export_all_to(&out).expect("RoundInfo");
    StorageProofBatch::export_all_to(&out).expect("StorageProofBatch");
    SyncStatus::export_all_to(&out).expect("SyncStatus");
    TokenBalanceMrcIdentity::export_all_to(&out).expect("TokenBalanceMrcIdentity");
    TokenBalanceRecord::export_all_to(&out).expect("TokenBalanceRecord");
    TpmAttestationResponse::export_all_to(&out).expect("TpmAttestationResponse");
    TransactionReceipt::export_all_to(&out).expect("TransactionReceipt");
    TransactionView::export_all_to(&out).expect("TransactionView");

    MrvAbiManifest::export_all_to(&out).expect("MrvAbiManifest");
    MrvAbiParam::export_all_to(&out).expect("MrvAbiParam");
    MrvAbiSymbol::export_all_to(&out).expect("MrvAbiSymbol");
    MrvAbiSymbolKind::export_all_to(&out).expect("MrvAbiSymbolKind");
    MrvAbiType::export_all_to(&out).expect("MrvAbiType");
    MrvAddressKind::export_all_to(&out).expect("MrvAddressKind");
    MrvArtifactMetadata::export_all_to(&out).expect("MrvArtifactMetadata");
    MrvBuildMetadata::export_all_to(&out).expect("MrvBuildMetadata");
    MrvCallRequest::export_all_to(&out).expect("MrvCallRequest");
    MrvCallResponse::export_all_to(&out).expect("MrvCallResponse");
    MrvCallStatus::export_all_to(&out).expect("MrvCallStatus");
    MrvDeployPayload::export_all_to(&out).expect("MrvDeployPayload");
    MrvDeployRequest::export_all_to(&out).expect("MrvDeployRequest");
    MrvDeployResponse::export_all_to(&out).expect("MrvDeployResponse");
    MrvEventRecord::export_all_to(&out).expect("MrvEventRecord");
    MrvExecutionReceipt::export_all_to(&out).expect("MrvExecutionReceipt");
    MrvMemoryLimits::export_all_to(&out).expect("MrvMemoryLimits");
    MrvMeterCounters::export_all_to(&out).expect("MrvMeterCounters");
    MrvNativeStateDelta::export_all_to(&out).expect("MrvNativeStateDelta");
    MrvResolvedSyscall::export_all_to(&out).expect("MrvResolvedSyscall");
    MrvRevertPayload::export_all_to(&out).expect("MrvRevertPayload");
    MrvRiscvProfile::export_all_to(&out).expect("MrvRiscvProfile");
    MrvStorageNamespace::export_all_to(&out).expect("MrvStorageNamespace");
    MrvSyscallImport::export_all_to(&out).expect("MrvSyscallImport");
    MrvTransactionExtension::export_all_to(&out).expect("MrvTransactionExtension");
    MrvTypedAddress::export_all_to(&out).expect("MrvTypedAddress");
    MrvValidatedArtifactMetadata::export_all_to(&out).expect("MrvValidatedArtifactMetadata");

    // Sanity check — at least one file should exist.
    let count = std::fs::read_dir(&out)
        .expect("read bindings")
        .filter_map(Result::ok)
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "ts"))
        .count();
    assert!(count >= 40, "expected 40+ bindings files, got {count}");
}
