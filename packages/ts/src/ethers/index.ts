/**
 * ethers.js v6 compat shim for `@monolythium/core-sdk`.
 *
 * Lets existing Solidity tooling — Hardhat, Foundry test scripts,
 * any ethers-based dApp — point at a Monolythium node by swapping
 * its `Provider` and `Signer` for `MonolythiumProvider` and
 * `MonolythiumSigner` respectively.
 *
 * **SDK-level compat only.** Per
 * `feedback_no_ethereum_wire_retrofit.md`, the chain's wire format
 * stays Monolythium-native; this shim translates between ethers'
 * expected shapes and the chain's `eth_*` JSON-RPC surface inside
 * the SDK boundary.
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
