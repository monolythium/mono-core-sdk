//! Official Rust SDK for Monolythium v4.1 / LythiumDAG-BFT.
//!
//! This crate provides a typed [`RpcClient`] that wraps the JSON-RPC
//! surface served by a `mono-core` node: current chain-native `lyth_*`
//! methods, passive compatibility `eth_*` / `net_*` / `web3_*` reads, and
//! server-gated legacy/debug methods. New v4.1 app paths should prefer the
//! native MRV/RISC-V helpers and `lyth_*` surfaces over compatibility
//! simulation or deployment methods.
//!
//! # Example
//!
//! ```no_run
//! use monolythium_core_sdk::RpcClient;
//!
//! # async fn run() -> Result<(), monolythium_core_sdk::SdkError> {
//! let client = RpcClient::new("https://rpc.testnet.monolythium.com")?;
//! let chain_id = client.eth_chain_id().await?;
//! let head = client.eth_block_number().await?;
//! println!("chain {chain_id} at height {head}");
//! # Ok(())
//! # }
//! ```

pub mod address;
pub mod api;
pub mod bridge;
pub mod client;
pub mod consts;
pub mod delegation;
pub mod error;
pub mod mrv;
pub mod native_dev;
pub mod pubkey_registry;
pub mod spending_policy;
pub mod types;

pub use address::{
    address_to_bech32, address_to_hex, address_to_typed_bech32, bech32_to_address, hex_to_address,
    parse_address, typed_bech32_to_address, typed_bech32_to_address_kind, AddressError,
    AddressKind, ADDRESS_HRP, ADDRESS_HRPS, RESERVED_ADDRESS_HRPS,
};
pub use api::ApiClient;
pub use bridge::{
    assess_bridge_route, bridge_address_hex, bridge_quote_submit_readiness,
    bridge_routes_readiness, bridge_transfer_candidates, build_bridge_route_catalogue,
    encode_lock_bridge_config_calldata, encode_lock_bridge_config_calldata_hex,
    encode_set_bridge_resume_cooldown_calldata, encode_set_bridge_resume_cooldown_calldata_hex,
    encode_set_bridge_route_finality_calldata, encode_set_bridge_route_finality_calldata_hex,
    export_bridge_route_catalogue_json, export_bridge_route_catalogue_routes_json,
    is_bridge_admin_locked_revert, is_bridge_cooldown_zero_revert, is_bridge_finality_zero_revert,
    is_bridge_resume_cooldown_active_revert, parse_bridge_route_catalogue_json, rank_bridge_routes,
    select_bridge_transfer_route, selector_lock_bridge_config, selector_set_bridge_resume_cooldown,
    selector_set_bridge_route_finality, validate_bridge_route_catalogue, BridgeAdminControl,
    BridgeCircuitBreakerState, BridgeQuoteSubmitReadiness, BridgeRiskTier, BridgeRouteAssessment,
    BridgeRouteCandidate, BridgeRouteCatalogue, BridgeRouteCatalogueJsonError,
    BridgeRouteCatalogueRoute, BridgeRouteCatalogueValidation, BridgeRouteDisclosure,
    BridgeRouteSelection, BridgeRoutesRequest, BridgeRoutesResponse, BridgeRoutesSource,
    BridgeTransferIntent, BridgeTransferRequest, BridgeVerifierDisclosure,
    BRIDGE_CALLDATA_REVERT_NAMESPACE, BRIDGE_CONFIG_REVERT_NAMESPACE,
    BRIDGE_QUOTE_API_BLOCKED_REASON, BRIDGE_SUBMIT_API_BLOCKED_REASON, REVERT_BRIDGE_ADMIN_LOCKED,
    REVERT_BRIDGE_COOLDOWN_ZERO, REVERT_BRIDGE_FINALITY_ZERO, REVERT_BRIDGE_RESUME_COOLDOWN_ACTIVE,
    SIGHASH_LOCK_BRIDGE_CONFIG, SIGHASH_SET_BRIDGE_RESUME_COOLDOWN,
    SIGHASH_SET_BRIDGE_ROUTE_FINALITY,
};
pub use client::{
    MrvCallNativeEncryptedSubmitResult, MrvDeployNativeEncryptedSubmitResult, RpcClient,
};
pub use consts::{burn_addr_hex, BURN_ADDR};
pub use delegation::{
    calldata_to_hex as delegation_calldata_to_hex, delegation_address_hex,
    encode_complete_redemption_calldata, encode_complete_redemption_calldata_hex,
    is_redemption_principal_unavailable_revert, selector_complete_redemption,
    DELEGATION_REVERT_NAMESPACE, REVERT_REDEMPTION_NOT_MATURE,
    REVERT_REDEMPTION_PRINCIPAL_UNAVAILABLE, REVERT_REDEMPTION_QUEUE_FULL,
    REVERT_REDEMPTION_TICKET_NOT_FOUND, SIGHASH_COMPLETE_REDEMPTION,
};
pub use error::SdkError;
pub use mrv::{
    assert_mrv_call_native_submission_plan, assert_mrv_deploy_native_submission_plan,
    assert_mrv_fee_display_conformance, bincode_mrv_encrypted_decrypt_hint,
    bincode_mrv_encrypted_nonce_aad, build_mrv_call_native_encrypted_submission,
    build_mrv_call_native_signed_submission, build_mrv_deploy_native_encrypted_submission,
    build_mrv_deploy_native_signed_submission, build_mrv_deploy_payload_native_tx_plan,
    build_mrv_deploy_payload_plan, build_mrv_deploy_payload_request,
    build_mrv_native_encrypted_submission, build_mrv_native_signed_submission,
    check_mrv_fee_display_conformance, decode_mrv_deploy_payload, encode_mrv_deploy_payload,
    format_lyth, format_lythoshi, format_native_receipt_fee_display,
    mrv_encrypted_outer_signature_digest, parse_lyth_to_lythoshi, LythFormatOptions,
    MrvCallNativeEncryptedSubmission, MrvCallNativeSignedSubmission,
    MrvDeployNativeEncryptedSubmission, MrvDeployNativeSignedSubmission, MrvDeployPayload,
    MrvEncryptedDecryptHint, MrvEncryptedNonceAad, MrvEncryptionKey, MrvFeeDisplayConformanceInput,
    MrvFeeDisplayConformanceReport, MrvMempoolClass, MrvNativeEncryptedSubmission,
    MrvNativeSignedSubmission, NativeReceiptFeeDisplay, DKG_AEAD_TAG_LEN, DKG_NONCE_LEN,
    LYTHOSHI_PER_LYTH, LYTH_DECIMALS, ML_KEM_768_CIPHERTEXT_LEN, ML_KEM_768_ENCAPSULATION_KEY_LEN,
    ML_KEM_768_SHARED_SECRET_LEN, MRV_DEPLOY_PAYLOAD_VERSION, MRV_ENCRYPTION_ALGO_ML_KEM_768,
    MRV_STRUCTURED_FEE_FIELDS, NATIVE_LYTH_DECIMALS,
};
pub use native_dev::{
    check_native_devkit_compatibility, native_dev_ui_strings, resolve_studio_host_status,
    NativeDevApprovalKind, NativeDevCommandName, NativeDevContractPassport, NativeDevMrcAllocation,
    NativeDevMrcAssetKind, NativeDevMrcTokenPlan, NativeDevMrvDeployPlan, NativeDevRiskLabel,
    NativeDevRiskSeverity, NativeDevSidecarCommandResult, NativeDevVerificationArtifact,
    NativeDevVerificationBundle, NativeDevVerificationFile, NativeDevWalletApprovalRequest,
    NativeDevkitArchive, NativeDevkitChannel, NativeDevkitCompatibility, NativeDevkitManifest,
    NativeDevkitSidecarManifest, NativeDevkitSidecarStatus, NativeDevkitStatus, StudioHostState,
    StudioHostStatus, NATIVE_DEV_HOST_API_VERSION, NATIVE_DEV_IPC_PROTOCOL_VERSION,
    NATIVE_DEV_MANIFEST_SCHEMA_VERSION,
};
pub use types::{
    compute_no_evm_dac_finality_message, compute_no_evm_leader_finality_message,
    compute_no_evm_receipts_root, compute_no_evm_target_receipt_hash,
    decode_no_evm_receipt_transcript, native_market_events_filter,
    native_market_events_from_receipt, native_market_receipt_event_filter,
    verify_no_evm_archive_proof_signatures, verify_no_evm_block_finality_evidence_multisig,
    verify_no_evm_block_finality_evidence_threshold, verify_no_evm_finality_evidence_multisig,
    verify_no_evm_finality_evidence_threshold, verify_no_evm_receipt_proof,
    verify_no_evm_receipt_proof_trust, NativeAgentArbiterStateRecord,
    NativeAgentAttestationStateRecord, NativeAgentAvailabilityStateRecord,
    NativeAgentConsentStateRecord, NativeAgentEscrowStateRecord, NativeAgentIssuerStateRecord,
    NativeAgentPolicySpendStateRecord, NativeAgentPolicyStateRecord,
    NativeAgentReputationReviewStateRecord, NativeAgentServiceStateRecord, NativeAgentStateFilter,
    NativeAgentStateResponse, NativeAgentStateResponseFilters, NativeAgentStateSource,
    NativeCollectionRoyaltyStateRecord, NativeDecodedEvent, NativeEventProjection,
    NativeMarketStateFilter, NativeMarketStateResponse, NativeMarketStateResponseFilters,
    NativeMarketStateSource, NativeNftListingStateRecord, NativeSpotMarketStateRecord,
    NativeSpotOrderStateRecord, NoEvmArchiveCoveringSnapshot, NoEvmArchiveProof,
    NoEvmArchiveSignatureVerification, NoEvmArchiveSignatureVerificationIssue,
    NoEvmArchiveTrustPolicy, NoEvmArchiveTrustPolicySigner, NoEvmArchiveTrustedSigner,
    NoEvmReceiptBlockBlsFinalityVerification, NoEvmReceiptBlsFinalityVerification,
    NoEvmReceiptBlsTrustPolicySigner, NoEvmReceiptFinalityBlockReference,
    NoEvmReceiptFinalityCertificate, NoEvmReceiptFinalityClusterTrustPolicy,
    NoEvmReceiptFinalityEvidence, NoEvmReceiptFinalityMultisigTrustPolicy,
    NoEvmReceiptFinalityTrustPolicy, NoEvmReceiptProof, NoEvmReceiptProofError,
    NoEvmReceiptProofVerification, NoEvmReceiptTrustIssue, NoEvmReceiptTrustIssueCode,
    NoEvmReceiptTrustPolicy, NoEvmReceiptTrustVerification, NoEvmReceiptTrustedBlsSigner,
    NATIVE_MARKET_EVENT_FAMILY, NO_EVM_ARCHIVE_PROOF_SCHEMA, NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
    NO_EVM_RECEIPT_CODEC, NO_EVM_RECEIPT_FINALITY_EVIDENCE_SCHEMA,
    NO_EVM_RECEIPT_FINALITY_EVIDENCE_SOURCE, NO_EVM_RECEIPT_PROOF_SCHEMA,
    NO_EVM_RECEIPT_PROOF_TYPE, NO_EVM_RECEIPT_ROOT_ALGORITHM,
};

/// Crate version, sourced from `Cargo.toml`.
#[must_use]
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
