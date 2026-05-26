/**
 * Canonical chain constants exported from `@monolythium/core-sdk`.
 *
 * These values are sourced from the mono-core runtime — never hand-pick
 * a different address or pretend the burn destination lives elsewhere.
 * Cross-references below cite the runtime files that own each value.
 */

/**
 * Base-fee burn destination.
 *
 * Every base-fee unit consumed by a transaction is sent to this address
 * and removed from circulating supply. The address is the canonical
 * zero address — there is no private key for it on any chain, so funds
 * routed here are unrecoverable by construction.
 *
 * Surfaces (wallets, explorers, dashboards) display burn balances by
 * reading the balance of `BURN_ADDR` directly; do not roll a separate
 * "treasury" representation for burnt fees.
 */
export const BURN_ADDR = "0x0000000000000000000000000000000000000000" as const;

/**
 * SDK-exposed native/precompile address map for the current v4.1 surface.
 *
 * Sourced from `mono-core` runtime/precompile constants and pinned here
 * so surfaces can render precompile traffic by name without
 * re-defining low-band address literals.
 *
 * `0x1002`, `0x1006`, `0x1007`, and `0x1103` are intentionally absent.
 * They are not part of the current SDK surface.
 */
export const PRECOMPILE_ADDRESSES = {
  /** Native fungible-token factory — non-gateable, foundational. */
  TOKEN_FACTORY: "0x0000000000000000000000000000000000001000",
  /** Native central-limit order book — gateable. */
  CLOB: "0x0000000000000000000000000000000000001001",
  /** Agent execution surface — gateable. */
  AGENT: "0x0000000000000000000000000000000000001003",
  /** Account privacy policy + stealth/confidential ops — gateable. */
  PRIVACY: "0x0000000000000000000000000000000000001004",
  /** Operator + RPC node registry — non-gateable consensus invariant. */
  NODE_REGISTRY: "0x0000000000000000000000000000000000001005",
  /** Native bridge route-control surface — gateable. */
  BRIDGE: "0x0000000000000000000000000000000000001008",
  /** Decentralized multi-signer oracle — non-gateable. */
  ORACLE: "0x0000000000000000000000000000000000001009",
  /** Distributed delegation primitive — gateable. */
  DELEGATION: "0x000000000000000000000000000000000000100A",
  /** One-time emergency-key registry — non-gateable. */
  EMERGENCY_KEY: "0x0000000000000000000000000000000000001100",
  /** VRF precompile. */
  VRF: "0x0000000000000000000000000000000000001101",
  /** Streaming-payments primitive — gateable. */
  STREAMING_PAYMENTS: "0x0000000000000000000000000000000000001102",
  /** Cluster-name registry. */
  CLUSTER_NAME_REGISTRY: "0x0000000000000000000000000000000000001104",
  /** Agent-commerce attestation precompile. */
  ATTESTATION: "0x0000000000000000000000000000000000001105",
  /** Agent-commerce consent precompile. */
  CONSENT: "0x0000000000000000000000000000000000001106",
  /** Agent-commerce issuer registry. */
  ISSUER_REGISTRY: "0x0000000000000000000000000000000000001107",
  /** Agent-commerce discovery precompile. */
  DISCOVERY: "0x0000000000000000000000000000000000001108",
  /** Agent-commerce availability precompile. */
  AVAILABILITY: "0x0000000000000000000000000000000000001109",
  /** Agent-commerce escrow precompile. */
  ESCROW: "0x000000000000000000000000000000000000110A",
  /** Agent-commerce arbiter registry. */
  ARBITER_REGISTRY: "0x000000000000000000000000000000000000110B",
  /** Agent spending policy — gateable. */
  SPENDING_POLICY: "0x000000000000000000000000000000000000110C",
  /** Primary ML-DSA-65 pubkey registry — gateable. */
  PUBKEY_REGISTRY: "0x000000000000000000000000000000000000110D",
  /** Hierarchical name registry — gateable. */
  NAME_REGISTRY: "0x000000000000000000000000000000000000110E",
} as const;

/** Precompile address-key type — useful for typed maps over the surface. */
export type PrecompileName = keyof typeof PRECOMPILE_ADDRESSES;

/** Precompile address value type. */
export type PrecompileAddress = (typeof PRECOMPILE_ADDRESSES)[PrecompileName];
