/**
 * Network identity constants.
 *
 * Monolythium testnet `chain_id` is **`69420`**. Mainnet chain id is
 * reserved for the genesis ceremony and not yet exported.
 */

/** Monolythium testnet chain id. */
export const MONOLYTHIUM_TESTNET_CHAIN_ID = 69420n;

/** Network name surfaced alongside chain identity. */
export const MONOLYTHIUM_TESTNET_NETWORK_NAME = "monolythium-testnet";

/**
 * Built-in network presets. Callers that point at a different chain id
 * (e.g. a local dev node) construct identity records explicitly.
 */
export const MONOLYTHIUM_NETWORKS = {
  testnet: {
    chainId: MONOLYTHIUM_TESTNET_CHAIN_ID,
    name: MONOLYTHIUM_TESTNET_NETWORK_NAME,
  },
} as const;

/** Network identity record. */
export interface MonolythiumNetworkConfig {
  /** Numeric chain id (e.g. `69420n`). */
  chainId: bigint;
  /** Human-readable network name. */
  name: string;
}
