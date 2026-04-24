//! Official Rust SDK for Monolythium v2 / LythiumDAG-BFT.
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
