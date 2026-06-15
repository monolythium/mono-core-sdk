// Genesis-verified, quarantine-aware operator selection.
//
// The plain `RpcClient.fromFirstReachable` picks the first endpoint whose
// `eth_chainId` matches the registry chain id. That is NOT enough on a chain
// that can re-genesis or whose operators self-quarantine: a fake / partial /
// forked endpoint can answer `net_version` with the right chain id while
// serving a DIFFERENT (or unverifiable) chain. This module adds the
// orphan-fork defense the wallets need, as a reusable SDK primitive:
//
//   - verifyOperatorGenesis: fail-CLOSED genesis check against the registry pin
//     (an operator that proves no genesis is UNTRUSTED, not trusted-by-default).
//   - selectTrustedOperator: pick the first operator that is reachable, on the
//     right chain id, AND proves the pinned genesis; quarantine-aware; throws a
//     classified error when none qualifies.
//
// Per-call only: this performs no caching. Long-lived consumers (wallets) wrap
// it in their own poll/cache layer; the SDK stays stateless.

import type { ChainInfo } from "./registry.js";
import { getChainInfo, type NetworkSlug } from "./registry.js";
import { RpcClient, type RpcClientOptions } from "./client.js";
import { SdkError } from "./error.js";

const GENESIS_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

/** Chain JSON-RPC error code for a self-quarantined operator (it answered, but
 *  refuses to serve because its local state-root disagrees with the signed
 *  checkpoint quorum — a CheckpointStateRootMismatch). */
export const QUARANTINED_RPC_CODE = -32047;

function normaliseHash(input: unknown): string | null {
  return typeof input === "string" && GENESIS_HASH_RE.test(input)
    ? input.toLowerCase()
    : null;
}

/** True when an error is a `-32047` "chain quarantined" rejection. Keys on the
 *  JSON-RPC code first (authoritative) and the message text as a fallback. */
export function isQuarantineError(err: unknown): boolean {
  if (err instanceof SdkError && err.code === QUARANTINED_RPC_CODE) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /quarantin/i.test(message);
}

export interface GenesisVerdict {
  /** True iff the operator's chain genesis matches the expected pin. */
  ok: boolean;
  /** Observed genesis identity hash; `null` when the operator exposed no
   *  genesis (fail-closed → `ok` is false) or was quarantined/unreachable. */
  observed: string | null;
  /** True when the operator answered with a `-32047` "chain quarantined"
   *  error (same chain, self-quarantined). `observed` stays null. */
  quarantined: boolean;
}

/**
 * Verify ONE operator's chain genesis against the expected pin.
 *
 * Fail-CLOSED: an operator that does not expose `lyth_chainStats.genesisHash`
 * (the live fleet all do) proves nothing about its chain identity and returns
 * `ok: false` — so a fake / partial endpoint that merely answers `net_version`
 * can never be selected as trusted. A `-32047` quarantine is surfaced via
 * `quarantined` so callers can show "operators quarantined — wait for recovery"
 * rather than a misleading re-genesis or offline message.
 */
export async function verifyOperatorGenesis(
  client: RpcClient,
  expectedGenesisHash: string,
): Promise<GenesisVerdict> {
  const pinned = normaliseHash(expectedGenesisHash);
  try {
    const stats = await client.lythChainStats();
    const observed = normaliseHash(stats.genesisHash);
    if (observed === null) {
      // Reachable, answered chainStats, but exposed no genesis hash → cannot be
      // proven → UNTRUSTED (fail-closed).
      return { ok: false, observed: null, quarantined: false };
    }
    return { ok: pinned !== null && observed === pinned, observed, quarantined: false };
  } catch (err) {
    if (isQuarantineError(err)) {
      return { ok: false, observed: null, quarantined: true };
    }
    // Transport failure / unreachable / any other error → unverifiable →
    // UNTRUSTED (fail-closed). Non-definitive (observed null) so a transient
    // blip self-heals on the caller's next probe.
    return { ok: false, observed: null, quarantined: false };
  }
}

/** Why no trusted operator could be selected. Mirrors the wallet banner states
 *  so a consumer can render an actionable cause:
 *  - `regenesis`   — reachable, right chain id, but a DIFFERENT genesis hash
 *                    (the network re-genesised; the pin/SDK must be bumped).
 *  - `wrong-chain` — reachable, but reports a different chain id.
 *  - `untrusted`   — reachable, right chain id, but proves no genesis.
 *  - `quarantined` — every operator self-quarantined (checkpoint mismatch);
 *                    same chain, refusing RPC; recovers on its own.
 *  - `unreachable` — no operator answered at all. */
export type OperatorTrustReason =
  | "regenesis"
  | "wrong-chain"
  | "untrusted"
  | "quarantined"
  | "unreachable";

/** Thrown by `selectTrustedOperator` when no operator qualifies. Carries a
 *  classified `reason` so consumers can branch on the cause (extends `SdkError`
 *  so existing `instanceof SdkError` handling still catches it). */
export class OperatorTrustError extends SdkError {
  readonly reason: OperatorTrustReason;
  constructor(reason: OperatorTrustReason, message: string) {
    super("endpoint", message);
    this.name = "OperatorTrustError";
    this.reason = reason;
  }
}

/**
 * Select the first operator that is reachable, on the right chain id, AND
 * proves the pinned genesis (fail-closed, quarantine-aware). Probes every
 * registry endpoint in PARALLEL and returns the first that fully qualifies, so
 * a dead or slow operator never adds head-of-line latency. Throws an
 * `OperatorTrustError` (with a classified `reason`) when none qualifies.
 */
export async function selectTrustedOperator(
  chain: ChainInfo,
  options: RpcClientOptions = {},
): Promise<RpcClient> {
  if (chain.rpc.length === 0) {
    throw new OperatorTrustError(
      "unreachable",
      `network ${chain.network} has no RPC endpoints`,
    );
  }
  const expectedChainId = BigInt(chain.chain_id);

  // Cross-probe flags drive the classified reason when every probe rejects.
  // Promise.any only rejects after ALL probes settle, so all flags are final
  // by the time we classify.
  let sawRegenesis = false;
  let sawWrongChain = false;
  let sawUntrusted = false;
  let sawQuarantined = false;

  const probes = chain.rpc.map(async (ep) => {
    const client = new RpcClient(ep.url, options);
    let chainId: bigint;
    try {
      chainId = await client.ethChainId();
    } catch (err) {
      if (isQuarantineError(err)) sawQuarantined = true;
      throw err;
    }
    if (chainId !== expectedChainId) {
      sawWrongChain = true;
      throw new SdkError("endpoint", `${ep.url}: chain id ${chainId} != ${chain.chain_id}`);
    }
    const verdict = await verifyOperatorGenesis(client, chain.genesis_hash);
    if (verdict.quarantined) {
      sawQuarantined = true;
      throw new SdkError("endpoint", `${ep.url}: quarantined`);
    }
    if (!verdict.ok) {
      if (verdict.observed !== null) sawRegenesis = true;
      else sawUntrusted = true;
      throw new SdkError("endpoint", `${ep.url}: genesis not trusted`);
    }
    return client;
  });

  try {
    return await Promise.any(probes);
  } catch {
    const reason: OperatorTrustReason = sawRegenesis
      ? "regenesis"
      : sawWrongChain
        ? "wrong-chain"
        : sawUntrusted
          ? "untrusted"
          : sawQuarantined
            ? "quarantined"
            : "unreachable";
    throw new OperatorTrustError(
      reason,
      `no trusted operator for ${chain.network} (${reason})`,
    );
  }
}

/** Convenience wrapper: resolve a registry network slug then select a trusted
 *  operator for it. Defaults to the bundled registry. */
export async function selectTrustedOperatorForNetwork(
  network: NetworkSlug | string = "testnet-69420",
  options: RpcClientOptions = {},
): Promise<RpcClient> {
  return selectTrustedOperator(getChainInfo(network), options);
}
