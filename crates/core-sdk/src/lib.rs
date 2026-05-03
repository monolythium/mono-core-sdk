//! Official Rust SDK for Monolythium v2 / LythiumDAG-BFT.
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
pub mod client;
pub mod consts;
pub mod error;
pub mod pubkey_registry;
pub mod spending_policy;
pub mod types;

pub use address::{
    address_to_bech32, address_to_hex, bech32_to_address, hex_to_address, parse_address,
    AddressError, ADDRESS_HRP,
};
pub use client::RpcClient;
pub use consts::{burn_addr_hex, BURN_ADDR};
pub use error::SdkError;

/// Crate version, sourced from `Cargo.toml`.
#[must_use]
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
