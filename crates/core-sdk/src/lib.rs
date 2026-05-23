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
pub mod client;
pub mod consts;
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
pub use client::RpcClient;
pub use consts::{burn_addr_hex, BURN_ADDR};
pub use error::SdkError;
pub use mrv::{
    assert_mrv_call_native_submission_plan, assert_mrv_deploy_native_submission_plan,
    assert_mrv_fee_display_conformance, build_mrv_call_native_signed_submission,
    build_mrv_deploy_native_signed_submission, build_mrv_native_signed_submission,
    check_mrv_fee_display_conformance, format_lyth, format_lythoshi, parse_lyth_to_lythoshi,
    LythFormatOptions, MrvCallNativeSignedSubmission, MrvDeployNativeSignedSubmission,
    MrvFeeDisplayConformanceInput, MrvFeeDisplayConformanceReport, MrvNativeSignedSubmission,
    LYTHOSHI_PER_LYTH, LYTH_DECIMALS, MRV_STRUCTURED_FEE_FIELDS, NATIVE_LYTH_DECIMALS,
};

/// Crate version, sourced from `Cargo.toml`.
#[must_use]
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
