/**
 * Network identity for the ethers.js compat shim.
 *
 * Monolythium testnet `chain_id` is **`69420`**.
 * Mainnet chain id is reserved for the genesis ceremony and not yet
 * exported.
 */

/** Monolythium v4.1 testnet chain id. */
export const MONOLYTHIUM_TESTNET_CHAIN_ID = 69420n;

/** Network name surfaced to ethers `Network` instances. */
export const MONOLYTHIUM_TESTNET_NETWORK_NAME = "monolythium-testnet";

/**
 * Built-in network presets for the ethers shim. Callers that point at a
 * different chain id (e.g. a local dev node) construct `MonolythiumProvider`
 * with an explicit `network` option instead.
 */
export const MONOLYTHIUM_NETWORKS = {
  testnet: {
    chainId: MONOLYTHIUM_TESTNET_CHAIN_ID,
    name: MONOLYTHIUM_TESTNET_NETWORK_NAME,
  },
} as const;

/** Configuration object accepted by the ethers shim factory functions. */
export interface MonolythiumNetworkConfig {
  /** Numeric chain id (e.g. `69420n`). */
  chainId: bigint;
  /** Human-readable network name. */
  name: string;
}
