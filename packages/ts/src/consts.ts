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
 * Canonical precompile address map (Law §5.4).
 *
 * Sourced 1:1 from `mono-core/crates/runtime/src/precompiles.rs` and
 * pinned by `mono-core/crates/runtime/tests/precompile_wiring.rs`.
 * Every native precompile here is registered through
 * `build_native_precompile_registry` at the address listed below;
 * eight gateable surfaces (CLOB, MARGIN, AGENT, PRIVACY, IBC, BRIDGE,
 * STREAMING_PAYMENTS, NAME_REGISTRY) ship genesis-disabled per
 * ADR-0015 and reach the inner impl only after a milestone activates
 * the gate.
 *
 * Two slots in the Law §5.4 layout are intentionally absent:
 *
 * - `0x1006` — governance / deliberation slot reserved by Law §5.4
 *   but explicitly unwired after the OI-0140 memo-signalling pivot
 *   (no on-chain governance crate exists; signalling rides the tx
 *   memo field, see `memory/protocore-v2-governance-signal-only.md`).
 * - `0x1101` — VRF slot mandated by Law §5.4 §5.6 but research-gated
 *   on threshold-BLS; the crate has not landed and the address falls
 *   through as a plain EOA today.
 *
 * Both omissions are pinned by the runtime test
 * `registry_wiring_with_empty_milestones`. Adding either slot here
 * without a parallel runtime registration would silently drift the
 * SDK away from chain truth.
 *
 * The map ranges over the entire wired set so surface workers (wallets,
 * monoscan, the website) can render precompile traffic by name without
 * each surface re-defining the table.
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
  /** Streaming-payments primitive (Law §5.4 / §5.7) — gateable. */
  STREAMING_PAYMENTS: "0x0000000000000000000000000000000000001102",
  /** Human-readable name registry (Law §5.4 / §5.8) — gateable. */
  NAME_REGISTRY: "0x0000000000000000000000000000000000001103",
  /** Agent spending policy — gateable, activated by Stage 7 milestones. */
  SPENDING_POLICY: "0x000000000000000000000000000000000000110C",
} as const;

/** Precompile address-key type — useful for typed maps over the surface. */
export type PrecompileName = keyof typeof PRECOMPILE_ADDRESSES;

/** Precompile address value type. */
export type PrecompileAddress = (typeof PRECOMPILE_ADDRESSES)[PrecompileName];
