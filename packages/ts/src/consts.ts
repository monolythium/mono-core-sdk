/**
 * Canonical chain constants exported from `@monolythium/core-sdk`.
 *
 * These values are sourced from the mono-core runtime — never hand-pick
 * a different address or pretend the burn destination lives elsewhere.
 * Cross-references below cite the runtime files that own each value.
 */

/**
 * EIP-1559 base-fee burn destination (Law §5.2).
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
 * SDK-exposed precompile address map (Law §5.4).
 *
 * Sourced from `mono-core` runtime/precompile constants and pinned here
 * so surfaces can render precompile traffic by name without
 * re-defining low-band address literals.
 *
 * The governance slot is intentionally absent:
 *
 * - `0x1006` — governance / deliberation slot reserved by Law §5.4
 *   but wired to a rejecting runtime binding after the OI-0140
 *   memo-signalling pivot. The SDK exposes no governance client
 *   surface.
 */
export const PRECOMPILE_ADDRESSES = {
  /** Native fungible-token factory — non-gateable (Law §5.4, foundational). */
  TOKEN_FACTORY: "0x0000000000000000000000000000000000001000",
  /** Native central-limit order book — gateable. */
  CLOB: "0x0000000000000000000000000000000000001001",
  /** Cross-margin perp engine — gateable. */
  MARGIN: "0x0000000000000000000000000000000000001002",
  /** Agent execution surface (zkML-gated, ADR-0011/ADR-0020) — gateable. */
  AGENT: "0x0000000000000000000000000000000000001003",
  /** Account privacy policy + stealth/confidential ops — gateable. */
  PRIVACY: "0x0000000000000000000000000000000000001004",
  /** Validator + RPC node registry — non-gateable (consensus invariant). */
  NODE_REGISTRY: "0x0000000000000000000000000000000000001005",
  /** IBC light-client + packet routing — gateable. */
  IBC: "0x0000000000000000000000000000000000001007",
  /** Native zk-light-client bridge — gateable. */
  BRIDGE: "0x0000000000000000000000000000000000001008",
  /** Decentralized multi-signer oracle (OI-0036) — non-gateable. */
  ORACLE: "0x0000000000000000000000000000000000001009",
  /** Distributed delegation primitive (Stage E.5a, Law §7.6) — gateable. */
  DELEGATION: "0x000000000000000000000000000000000000100A",
  /** One-time emergency-key registry (Law §5.4 / §2.9) — non-gateable. */
  EMERGENCY_KEY: "0x0000000000000000000000000000000000001100",
  /** VRF precompile (Law §5.4 / §5.6). */
  VRF: "0x0000000000000000000000000000000000001101",
  /** Streaming-payments primitive (Law §5.4 / §5.7) — gateable. */
  STREAMING_PAYMENTS: "0x0000000000000000000000000000000000001102",
  /** Human-readable name registry (Law §5.4 / §5.8) — gateable. */
  NAME_REGISTRY: "0x0000000000000000000000000000000000001103",
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
  /** Agent spending policy — gateable, activated by Stage 7 milestones. */
  SPENDING_POLICY: "0x000000000000000000000000000000000000110C",
  /** Primary ML-DSA-65 pubkey registry — gateable, ADR-0034. */
  PUBKEY_REGISTRY: "0x000000000000000000000000000000000000110D",
} as const;

/** Precompile address-key type — useful for typed maps over the surface. */
export type PrecompileName = keyof typeof PRECOMPILE_ADDRESSES;

/** Precompile address value type. */
export type PrecompileAddress = (typeof PRECOMPILE_ADDRESSES)[PrecompileName];
