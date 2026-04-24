/**
 * Wire-shape types returned by `RpcClient`.
 *
 * Mirrors the Rust SDK's `types.rs` — quantities are `0x`-hex strings,
 * structured types use the camelCase the node serves over the wire.
 */

/** `0x`-prefixed hex byte vector. */
export type Hex = string;

/** `0x`-prefixed hex 20-byte address. */
export type Address = string;

/** `0x`-prefixed hex 32-byte hash. */
export type Hash = string;

/** `0x`-prefixed hex unsigned quantity. */
export type Quantity = string;

/** EVM block tag. */
export type BlockTag = "latest" | "earliest" | "finalized" | "safe" | "pending";

/**
 * Block selector for `eth_getBlock*`, `eth_call`, etc. — accepts a tag,
 * a numeric height (encoded by the client as `0x`-hex), or a 32-byte
 * hash where the spec allows it.
 */
export type BlockSelector = BlockTag | number | bigint | Hash;

/** Encode a `BlockSelector` for a JSON-RPC params array. */
export function encodeBlockSelector(b: BlockSelector): string {
  if (typeof b === "number") return `0x${b.toString(16)}`;
  if (typeof b === "bigint") return `0x${b.toString(16)}`;
  return b;
}

/** Account proof envelope returned by `eth_getBalance` etc. */
export interface AccountProofResponse {
  value: Quantity;
  state_root?: Hash;
  stateRoot?: Hash;
  block_number?: number;
  blockNumber?: number;
  proof?: unknown;
}

/** Block header surfaced via `eth_getBlockByNumber` / `eth_getBlockByHash`. */
export interface BlockHeader {
  number: number;
  hash: Hash;
  parent_hash?: Hash;
  parentHash?: Hash;
  state_root?: Hash;
  stateRoot?: Hash;
  timestamp: number;
  gas_used?: number;
  gasUsed?: number;
  gas_limit?: number;
  gasLimit?: number;
}

/** Confirmed-tx receipt. */
export interface TransactionReceipt {
  tx_hash?: Hash;
  txHash?: Hash;
  block_hash?: Hash;
  blockHash?: Hash;
  block_number?: number;
  blockNumber?: number;
  tx_index?: number;
  txIndex?: number;
  status: number;
  gas_used?: number;
  gasUsed?: number;
}

/** `eth_syncing` response when mid-sync. `null` when caught up. */
export interface SyncStatus {
  startingBlock: Quantity;
  currentBlock: Quantity;
  highestBlock: Quantity;
}

/** Argument shape for `eth_call` / `eth_estimateGas`. */
export interface CallRequest {
  from?: Address;
  to?: Address;
  gas?: Quantity;
  gasPrice?: Quantity;
  value?: Quantity;
  data?: Hex;
}

/** `eth_feeHistory` response. */
export interface FeeHistoryResponse {
  oldestBlock: Quantity;
  baseFeePerGas: Quantity[];
  gasUsedRatio: number[];
  reward?: Quantity[][];
}

/** `protocore_mempoolStatus` aggregate. */
export interface MempoolSnapshot {
  count_ready: number;
  count_pending: number;
  mailbox_depth: number;
  bytes_by_class: number[];
}

/** `protocore_mempoolPending` per-tx entry. */
export interface PendingTxSummary {
  txHash: Hash;
  nonce: number;
  class: number;
  wireBytesLen: number;
  ready: boolean;
}

/** `protocore_currentRound` round shape. */
export interface RoundInfo {
  height: number;
}

/** `protocore_validatorSet` entry. */
export interface ValidatorDescriptor {
  id: number;
  pubkey: Hex;
  stake: string;
  active: boolean;
}

/** `protocore_indexerStatus` envelope. `null` when disabled. */
export interface IndexerStatus {
  currentHeight: number;
  latestHeight: number | null;
  schemaVersion: number;
}

/** `protocore_listProviders` / `protocore_getRegistration` record. */
export interface RegistryRecord {
  peerId: Hex;
  capabilities: number;
  endpoint: string;
  bond: Quantity;
  uptimeBps: number;
}

/** `protocore_getAccountPolicy` response. */
export interface AccountPolicy {
  mode: string;
  allowShielded: boolean;
  allowConfidential: boolean;
  acceptStealth: boolean;
  requireOriginatorProof: boolean;
  requireAllowlistProof: boolean;
  flags: Hex;
  explicit: boolean;
}

/** `protocore_getAssetPolicy` response. */
export interface AssetPolicy {
  mode: string;
  allowShielded: boolean;
  allowConfidential: boolean;
  allowStealth: boolean;
  allowTransparent: boolean;
  requireKyc: boolean;
  levels: Hex;
  explicit: boolean;
}

/** `protocore_getStorageProof` batch response. */
export interface StorageProofBatch {
  stateRoot: Hash;
  blockNumber: number;
  proofs: unknown[];
}

/** `debug_p2pPeers` entry. */
export interface PeerSummary {
  peerId: string;
  role: string;
  listenAddrs: string[];
  agentVersion: string;
  score: number;
  inMesh: boolean;
}
