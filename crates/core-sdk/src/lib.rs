//! Official Rust SDK for Monolythium v4.0 / LythiumDAG-BFT.
//!
//! This crate provides a typed [`RpcClient`] that wraps the JSON-RPC
//! surface served by a `mono-core` node — both the EVM-compatible
//! `eth_*` / `net_*` / `web3_*` methods and the chain-native
//! `lyth_*` / `debug_*` methods (per Law §13.2).
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
    assess_bridge_route, bridge_address_hex, bridge_transfer_candidates,
    encode_lock_bridge_config_calldata, encode_lock_bridge_config_calldata_hex,
    is_bridge_admin_locked_revert, rank_bridge_routes, select_bridge_transfer_route,
    selector_lock_bridge_config, BridgeAdminControl, BridgeCircuitBreakerState, BridgeRiskTier,
    BridgeRouteAssessment, BridgeRouteCandidate, BridgeRouteDisclosure, BridgeRouteSelection,
    BridgeTransferIntent, BridgeTransferRequest, BridgeVerifierDisclosure,
    BRIDGE_CONFIG_REVERT_NAMESPACE, REVERT_BRIDGE_ADMIN_LOCKED, SIGHASH_LOCK_BRIDGE_CONFIG,
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
    build_mrv_deploy_native_signed_submission, build_mrv_native_encrypted_submission,
    build_mrv_native_signed_submission, check_mrv_fee_display_conformance, format_lyth,
    format_lythoshi, format_native_receipt_fee_display, mrv_encrypted_outer_signature_digest,
    parse_lyth_to_lythoshi, LythFormatOptions, MrvCallNativeEncryptedSubmission,
    MrvCallNativeSignedSubmission, MrvDeployNativeEncryptedSubmission,
    MrvDeployNativeSignedSubmission, MrvEncryptedDecryptHint, MrvEncryptedNonceAad,
    MrvEncryptionKey, MrvFeeDisplayConformanceInput, MrvFeeDisplayConformanceReport,
    MrvMempoolClass, MrvNativeEncryptedSubmission, MrvNativeSignedSubmission,
    NativeReceiptFeeDisplay, DKG_AEAD_TAG_LEN, DKG_NONCE_LEN, LYTHOSHI_PER_LYTH, LYTH_DECIMALS,
    ML_KEM_768_CIPHERTEXT_LEN, ML_KEM_768_ENCAPSULATION_KEY_LEN, ML_KEM_768_SHARED_SECRET_LEN,
    MRV_ENCRYPTION_ALGO_ML_KEM_768, MRV_STRUCTURED_FEE_FIELDS, NATIVE_LYTH_DECIMALS,
};
pub use types::{
    native_market_events_filter, native_market_events_from_receipt,
    native_market_receipt_event_filter, NATIVE_MARKET_EVENT_FAMILY,
};

/// Crate version, sourced from `Cargo.toml`.
#[must_use]
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
