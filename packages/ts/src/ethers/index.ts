/**
 * Legacy ethers.js v6 compat shim for `@monolythium/core-sdk`.
 *
 * Lets existing ethers-based migration scripts point at a Monolythium node by
 * swapping `Provider` and `Signer` instances for `MonolythiumProvider` and
 * `MonolythiumSigner` respectively.
 *
 * **SDK-level compat only.** The current v4.1 app path is native MRV/RISC-V
 * plus `lyth_*` read surfaces; this shim only translates between ethers'
 * expected shapes and compatibility JSON-RPC methods inside the SDK boundary.
 *
 * **ethers is a peerDependency.** Install it alongside this SDK if
 * you use the shim:
 *
 * ```
 * pnpm add ethers
 * ```
 *
 * The shim source is structured so the rest of the SDK builds even
 * when ethers is not installed — the ethers types only appear in
 * this submodule.
 */

export { MonolythiumProvider } from "./provider.js";
export type { MonolythiumProviderOptions } from "./provider.js";
export { MonolythiumSigner } from "./signer.js";
export type { MonolythiumSignerBackend } from "./signer.js";
export {
  MONOLYTHIUM_NETWORKS,
  MONOLYTHIUM_TESTNET_CHAIN_ID,
  MONOLYTHIUM_TESTNET_NETWORK_NAME,
} from "./network.js";
export type { MonolythiumNetworkConfig } from "./network.js";
export {
  translateBlockOut,
  translateReceiptOut,
  translateTxIn,
} from "./tx-translate.js";
export type {
  EthersBlockShape,
  EthersReceiptShape,
  EthersTxRequestSubset,
} from "./tx-translate.js";
