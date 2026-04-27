/**
 * Official TypeScript SDK for Monolythium v2 / LythiumDAG-BFT.
 *
 * The wire types in `./bindings/` are generated from Rust by
 * `cargo test --features ts-bindings`; never edit them by hand. The
 * `RpcClient` mirrors the Rust SDK 1:1 and sends `lyth_*` / `eth_*` /
 * `debug_*` JSON-RPC methods (Law §13.2).
 *
 * The optional `ethers.js` v6 compat shim lives under `./ethers/`
 * and is re-exported below. `ethers` is a peerDependency — install
 * it alongside this SDK when you use the shim.
 */

export const version = "0.1.0";

export { RpcClient, parseQuantity, parseQuantityBig } from "./client.js";
export type { RpcClientOptions } from "./client.js";
export { SdkError } from "./error.js";
export * from "./types.js";
export { BURN_ADDR, PRECOMPILE_ADDRESSES } from "./consts.js";
export type { PrecompileName, PrecompileAddress } from "./consts.js";

// ethers.js compat shim — ethers is a peerDependency. Importers that
// don't use the shim never pay for the ethers types.
export {
  MonolythiumProvider,
  MonolythiumSigner,
  MONOLYTHIUM_NETWORKS,
  MONOLYTHIUM_TESTNET_CHAIN_ID,
  MONOLYTHIUM_TESTNET_NETWORK_NAME,
  translateBlockOut,
  translateReceiptOut,
  translateTxIn,
} from "./ethers/index.js";
export type {
  EthersBlockShape,
  EthersReceiptShape,
  EthersTxRequestSubset,
  MonolythiumNetworkConfig,
  MonolythiumProviderOptions,
  MonolythiumSignerBackend,
} from "./ethers/index.js";
