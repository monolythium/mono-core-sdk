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

use monolythium_core_sdk::types::{
    AccountPolicy, AccountProofResponse, AssetPolicy, BlockHeader, BlockTag, CallRequest,
    ClusterDelegatorsResponse, ClusterEntityResponse, DagSyncStatus, DelegationCapResponse,
    DelegationRow, DelegationsResponse, EncryptionKeyResponse, EntityRatchetResponse,
    FeeHistoryResponse, IndexerStatus, MempoolSnapshot, PeerSummary, PendingTxSummary,
    PrecompileDescriptor, RegistryRecord, RoundInfo, StorageProofBatch, SyncStatus,
    TpmAttestationResponse, TransactionReceipt, TransactionView, ValidatorDescriptor,
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
    AssetPolicy::export_all_to(&out).expect("AssetPolicy");
    BlockHeader::export_all_to(&out).expect("BlockHeader");
    BlockTag::export_all_to(&out).expect("BlockTag");
    CallRequest::export_all_to(&out).expect("CallRequest");
    ClusterDelegatorsResponse::export_all_to(&out).expect("ClusterDelegatorsResponse");
    ClusterEntityResponse::export_all_to(&out).expect("ClusterEntityResponse");
    DagSyncStatus::export_all_to(&out).expect("DagSyncStatus");
    DelegationCapResponse::export_all_to(&out).expect("DelegationCapResponse");
    DelegationRow::export_all_to(&out).expect("DelegationRow");
    DelegationsResponse::export_all_to(&out).expect("DelegationsResponse");
    EncryptionKeyResponse::export_all_to(&out).expect("EncryptionKeyResponse");
    EntityRatchetResponse::export_all_to(&out).expect("EntityRatchetResponse");
    FeeHistoryResponse::export_all_to(&out).expect("FeeHistoryResponse");
    IndexerStatus::export_all_to(&out).expect("IndexerStatus");
    MempoolSnapshot::export_all_to(&out).expect("MempoolSnapshot");
    PeerSummary::export_all_to(&out).expect("PeerSummary");
    PendingTxSummary::export_all_to(&out).expect("PendingTxSummary");
    PrecompileDescriptor::export_all_to(&out).expect("PrecompileDescriptor");
    RegistryRecord::export_all_to(&out).expect("RegistryRecord");
    RoundInfo::export_all_to(&out).expect("RoundInfo");
    StorageProofBatch::export_all_to(&out).expect("StorageProofBatch");
    SyncStatus::export_all_to(&out).expect("SyncStatus");
    TpmAttestationResponse::export_all_to(&out).expect("TpmAttestationResponse");
    TransactionReceipt::export_all_to(&out).expect("TransactionReceipt");
    TransactionView::export_all_to(&out).expect("TransactionView");
    ValidatorDescriptor::export_all_to(&out).expect("ValidatorDescriptor");

    // Sanity check — at least one file should exist.
    let count = std::fs::read_dir(&out)
        .expect("read bindings")
        .filter_map(Result::ok)
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "ts"))
        .count();
    assert!(count >= 28, "expected 28+ bindings files, got {count}");
}
