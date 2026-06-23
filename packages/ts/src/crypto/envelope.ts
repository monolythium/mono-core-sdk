/**
 * Mempool transaction-class tags.
 *
 * The encrypted-mempool (LythiumSeal) envelope was removed at the v2
 * re-genesis; plaintext submission is the sole submit path. This module now
 * carries only the {@link MempoolClass} tag the node uses to classify a
 * transaction for ordering/admission.
 */

export const MempoolClass = {
  Transfer: 0,
  ContractCall: 1,
  PrivacyOp: 2,
  CLOBOp: 3,
  AgentOp: 4,
  FoundationOp: 5,
  /** @deprecated Use FoundationOp. */
  GovernanceOp: 5,
  RWAOp: 6,
} as const;
export type MempoolClass = (typeof MempoolClass)[keyof typeof MempoolClass];
