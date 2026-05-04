/**
 * One row in `lyth_getAddressActivity`.
 *
 * The row is a unified newest-first indexer projection across transfers,
 * swaps, staking events, and delegation events.
 */
export interface AddressActivityEntry {
  /** Block height the event landed in. */
  blockHeight: bigint;
  /** Tx index within the block. */
  txIndex: number;
  /** Log index within the tx. */
  logIndex: number;
  /** Source kind: transfer, swap, staking, or delegation. */
  kind: "transfer" | "swap" | "staking" | "delegation" | string;
  /** Direction relative to the queried address, when directional. */
  direction: "in" | "out" | null;
  /** Counterparty address for directional value movement. */
  counterparty: string | null;
  /** 32-byte token id when the event involves a token. */
  tokenId: string | null;
  /** Decimal-string amount when the event has an amount. */
  amount: string | null;
  /** Cluster id when the event involves a cluster. */
  cluster: number | null;
  /** Delegation weight in basis points. */
  weightBps: number | null;
  /** Kind-specific sub-label such as delegated, unstake, or stake. */
  subKind: string | null;
}
