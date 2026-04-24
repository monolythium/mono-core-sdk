//! Official Rust SDK for Monolythium v2 / LythiumDAG-BFT.
//!
//! This crate provides a typed [`RpcClient`] that wraps the JSON-RPC
//! surface served by a `mono-core` node — both the EVM-compatible
//! `eth_*` / `net_*` / `web3_*` methods and the chain-native
//! `protocore_*` / `debug_*` methods.
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

pub mod client;
pub mod error;
pub mod types;

pub use client::RpcClient;
pub use error::SdkError;

/// Crate version, sourced from `Cargo.toml`.
#[must_use]
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
