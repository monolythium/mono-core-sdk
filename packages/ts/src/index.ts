/**
 * Official TypeScript SDK for Monolythium v2 / LythiumDAG-BFT.
 *
 * The wire types in `./bindings/` are generated from Rust by
 * `cargo test --features ts-bindings`; never edit them by hand. The
 * `RpcClient` mirrors the Rust SDK 1:1 and sends `lyth_*` / `eth_*` /
 * `debug_*` JSON-RPC methods (Law §13.2).
 */

export const version = "0.1.0";

export { RpcClient, parseQuantity, parseQuantityBig } from "./client.js";
export type { RpcClientOptions } from "./client.js";
export { SdkError } from "./error.js";
export * from "./types.js";
