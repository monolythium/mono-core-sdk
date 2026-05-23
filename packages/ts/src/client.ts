/**
 * Typed JSON-RPC client for a `mono-core` node.
 *
 * Mirrors the Rust SDK's `RpcClient` — every public method maps 1:1 to
 * a method on the Rust client, returns the same wire-shape value, and
 * sends the same `lyth_*` / `eth_*` / `debug_*` JSON-RPC method strings
 * (Law §13.2).
 */

import { addressToBech32, parseAddress } from "./address.js";
import { SdkError } from "./error.js";
import type { BridgeRouteDisclosure, BridgeRoutesRequest, BridgeRoutesResponse } from "./bridge.js";
import {
  nativeEventsFromHistory,
  nativeEventsFromReceipt,
  nativeMarketEventsFromHistory,
  nativeMarketEventsFromReceipt,
} from "./native-events.js";
import {
  isConcreteServiceProbeStatus,
  isSinglePublicServiceProbeMask,
  isValidPublicServiceProbeMask,
} from "./node-registry.js";
import { getChainInfo, type ChainInfo, type ChainRegistry, type NetworkSlug } from "./registry.js";
import type {
  AccountPolicy,
  AccountProofResponse,
  AddressActivityEntry,
  AddressActivityKindResponse,
  AddressLabelRecord,
  AssetPolicy,
  BlsCertificateResponse,
  BlockHeader,
  CallRequest,
  CapabilitiesResponse,
  CheckpointRecord,
  ClobMarketResponse,
  ClusterDelegatorsResponse,
  ClusterEntityResponse,
  ClusterResignationsResponse,
  DagParentsResponse,
  DagSyncStatus,
  DecodeTxResponse,
  DelegationCapResponse,
  DelegationHistoryRecord,
  DelegationsResponse,
  EncryptionKeyResponse,
  EntityRatchetResponse,
  FeeHistoryResponse,
  GapRecordsResponse,
  IndexerStatus,
  MempoolSnapshot,
  MeshDecodedTx,
  MeshSignedTxResponse,
  MeshTxIntent,
  MeshUnsignedTxResponse,
  MrcMetadataResponse,
  PeerSummary,
  PendingRewardsResponse,
  PendingTxSummary,
  PrecompileDescriptor,
  RedemptionQueueResponse,
  RegistryRecord,
  RichListResponse,
  RoundInfo,
  StorageProofBatch,
  SyncStatus,
  TpmAttestationResponse,
  TransactionReceipt,
  TransactionView,
  TokenBalanceMrcIdentity,
  TokenBalanceRecord,
} from "./bindings/index.js";
import type { BlockSelector } from "./types.js";
import { encodeBlockSelector } from "./types.js";
import type {
  NativeDecodedEvent,
  NativeEventFilter,
  TypedNativeReceiptEvent,
} from "./native-events.js";

/** Optional per-client configuration. */
export interface RpcClientOptions {
  /** Override `fetch`. Useful for tests or non-Node environments. */
  fetch?: typeof fetch;
  /** Extra headers to attach to every request. */
  headers?: Record<string, string>;
}

export interface NetworkClientOptions extends RpcClientOptions {
  /** Registry snapshot to use instead of the SDK-bundled snapshot. */
  registry?: ChainRegistry;
  /** Probe all known endpoints and choose the first one that answers. */
  probe?: boolean;
}

/** User address accepted by helpers that canonicalize to `mono1...`. */
export type UserAddressInput = string | Uint8Array | readonly number[];

export interface TxFeedReceipt {
  status: number;
  executionUnitsUsed: number;
  logsCount: number;
}

export interface TxFeedTransaction {
  txHash: string;
  blockHash: string;
  blockNumber: number;
  blockTimestamp: number | null;
  txIndex: number;
  from: string;
  to: string | null;
  nonce: number;
  /** Native value in lythoshi. The tx-feed wire key is still `value`. */
  value: string;
  executionUnitLimit: number;
  maxExecutionFeeLythoshi: string;
  priorityTipLythoshi: string;
  fee: NativeReceiptFee;
  input: string;
  receipt: TxFeedReceipt | null;
}

export interface TxFeedResponse {
  schemaVersion: number;
  latestHeight: number;
  limit: number;
  nextCursor: string | null;
  transactions: TxFeedTransaction[];
}

export const MAX_NATIVE_RECEIPT_EVENTS = 1_000;

export interface NativeReceiptCounters {
  cycles: number;
  syscallUnits: number;
  stateIoUnits: number;
}

export interface NativeReceiptFee {
  total_lythoshi: string;
  total_lyth: string;
  cycles_used: number;
  base_price_per_cycle_lythoshi: string;
  state_io_units: number;
  state_io_price_per_unit_lythoshi: string;
  priority_tip_lythoshi: string;
}

export interface NativeReceiptEvent<TDecoded = unknown> {
  blockHeight: number;
  txIndex: number;
  logIndex: number;
  address: string;
  eventTopic: string;
  decoded: TDecoded;
  decodedJson: string;
}

export interface NativeReceiptSource {
  chainProvider: string;
  indexerProvider: string;
  metadataLogIndex: number;
}

export interface NativeReceiptResponse<TDecoded = unknown> {
  txHash: string;
  blockHash: string;
  blockHeight: number;
  txIndex: number;
  schema: string;
  artifactHash: string;
  receiptCommitment: string;
  /** Current nodes return `null`; older nodes may omit the field. */
  noEvmProof?: unknown | null;
  counters: NativeReceiptCounters;
  fee: NativeReceiptFee;
  reverted: boolean;
  nativeDeltaCount: number;
  eventCount: number;
  events: Array<NativeReceiptEvent<TDecoded>>;
  source: NativeReceiptSource;
}

/** Filter object passed to `lyth_nativeEvents` and `/api/v1/native-events`. */
export interface NativeEventsFilter {
  fromBlock: number | bigint | string;
  toBlock: number | bigint | string;
  limit?: number | bigint | string | null;
  txIndex?: number | bigint | string | null;
  logIndex?: number | bigint | string | null;
  address?: string | null;
  eventTopic?: string | null;
  family?: string | null;
  eventName?: string | null;
  primaryId?: string | null;
  relatedId?: string | null;
  tokenId?: string | null;
  account?: string | null;
  counterparty?: string | null;
}

export interface NativeEventsResponseFilters {
  txIndex?: number | null;
  logIndex?: number | null;
  address?: string | null;
  eventTopic?: string | null;
  family?: string | null;
  eventName?: string | null;
  primaryId?: string | null;
  relatedId?: string | null;
  tokenId?: string | null;
  account?: string | null;
  counterparty?: string | null;
}

export interface NativeEventsSource {
  indexerProvider: string;
}

export interface NativeEventsResponse<TDecoded = unknown> {
  schemaVersion: number;
  fromBlock: number;
  toBlock: number;
  limit: number;
  filters: NativeEventsResponseFilters;
  events: Array<NativeReceiptEvent<TDecoded>>;
  source: NativeEventsSource;
}

export type AgentReputationCategoryScope = "global" | "category";

export interface AgentReputationRecord {
  provider: string;
  categoryId: number;
  blockHeight: number;
  speedSumX10: number;
  qualitySumX10: number;
  communicationSumX10: number;
  accuracySumX10: number;
  sampleCount: number;
  avgSpeedX10: number;
  avgQualityX10: number;
  avgCommunicationX10: number;
  avgAccuracyX10: number;
}

export interface AgentReputationResponse {
  schemaVersion: 1;
  provider: string;
  categoryId: number;
  categoryScope: AgentReputationCategoryScope;
  record: AgentReputationRecord | null;
}

export interface AddressProfileResponse {
  schemaVersion: number;
  address: string;
  account: {
    nativeBalance: string;
    nonce: number;
    codeHash: string;
    isContract: boolean;
  };
  label: {
    category: string;
    displayName: string | null;
    updatedAtBlock: number;
  } | null;
  activity: {
    kind: string;
    retention: unknown | null;
    latest: unknown | null;
  };
  tokenBalances: Array<{
    tokenId: string;
    balance: string;
    updatedAtBlock: number;
    mrc?: TokenBalanceMrcIdentity | null;
  }>;
  bridgeRouteDisclosures?: BridgeRouteDisclosure[] | null;
}

export interface AddressFlowResponse {
  schemaVersion: number;
  address: string;
  sampleSize: number;
  limit: number;
  totals: {
    inbound: string;
    outbound: string;
    swapVolume: string;
    stake: string;
    unstake: string;
  };
  topCounterparties: Array<{
    address: string;
    eventCount: number;
    inbound: string;
    outbound: string;
  }>;
}

export interface SearchHit {
  type: string;
  id: string;
  route: string;
  label: string;
  score: number;
  meta?: unknown;
}

export interface SearchResponse {
  schemaVersion: number;
  query: string;
  hits: SearchHit[];
  nextCursor: string | null;
}

export interface ChainStatsResponse {
  schemaVersion: number;
  chainId: number;
  genesisHash: string | null;
  latestHeight: number;
  latestBlockHash: string | null;
  latestTimestamp: number | null;
  peerCount: number;
  mempool: {
    ready: number;
    pending: number;
    mailboxDepth: number;
  };
  indexer: unknown | null;
  clusters: {
    total: number;
    pageSize: number;
  };
}

export interface ClobMarketSummary {
  marketId: string;
  tradeCount: number;
  totalVolumeBase: string;
  lastPrice: string;
  lastBlockHeight: number;
}

export interface ClobMarketsResponse {
  schemaVersion: number;
  limit: number;
  markets: ClobMarketSummary[];
  source: string;
}

export interface ClobTrade {
  blockHeight: number;
  txIndex: number;
  logIndex: number;
  marketId: string;
  takerOrder: string;
  makerOrder: string;
  price: string;
  amount: string;
  taker: string;
  maker: string;
}

export interface ClobTradesResponse {
  schemaVersion: number;
  marketId: string;
  limit: number;
  nextCursor: string | null;
  trades: ClobTrade[];
}

export interface ClobOhlcResponse {
  schemaVersion: number;
  marketId: string;
  fromBlock: number;
  toBlock: number;
  bucketBlocks: number;
  candles: Array<{
    startBlock: number;
    endBlock: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volumeBase: string;
    tradeCount: number;
  }>;
}

export interface ClobOrderBookResponse {
  schemaVersion: number;
  marketId: string;
  levels?: number;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

/** Public-safe aggregate returned by `lyth_peerSummary`. */
export interface PeerSummaryAggregate {
  peerCount: number;
  inboundCount: number | null;
  outboundCount: number | null;
  latencyBands: {
    lt_50ms: number;
    lt_200ms: number;
    lt_1s: number;
    ge_1s: number;
  } | null;
  versionDistribution: Record<string, number>;
  healthSummary: {
    synced: number;
    lagging: number;
    stale: number;
  };
  asOfBlock: number;
}

/** Live `lyth_listActivePrecompiles` response envelope. */
export interface PrecompileCatalogueResponse {
  /** Block height sampled by the node. */
  blockNumber: bigint;
  /** Precompile descriptors active or known at the sampled block. */
  precompiles: PrecompileDescriptor[];
}

export interface OperatorInfoResponse {
  operatorId: string;
  moniker: string | null;
  alias: string | null;
  chainAddress: string;
  bonded: boolean;
  commissionBps: number | null;
  delegationCount: number | null;
  bondedAmount: string;
  activeClusterIds: number[];
  operatorKeyFingerprint: string | null;
  blsKeyFingerprint: string | null;
  lifecycleState: string;
  capability: Record<string, unknown>;
}

export interface ClusterMemberResponse {
  operatorId: string;
  blsPubkey: string;
  state: string;
}

export interface ClusterStatusResponse {
  clusterId: number;
  threshold: number;
  size: number;
  live: number;
  lagging: number;
  offline: number;
  maintenance: number;
  members: ClusterMemberResponse[];
  epoch: bigint | null;
  round: bigint | null;
  quorum: string;
  reputationScore: number | null;
  livenessScore: number | null;
  lastUpdateHeight: bigint;
}

export interface ClusterDirectoryEntryResponse {
  clusterId: number;
  size: number;
  threshold: number;
  aggregateHealth: string;
  regionDiversity: string[] | null;
  active: boolean;
}

export interface ClusterDirectoryPageResponse {
  page: number;
  limit: number;
  totalClusters: number;
  clusters: ClusterDirectoryEntryResponse[];
}

export type OperatorSurfaceStatus =
  | "available"
  | "disabled"
  | "not_implemented"
  | "not_retained"
  | "ws_only"
  | string;

export interface OperatorSurfaceCapability {
  status: OperatorSurfaceStatus;
  tracking?: string;
}

export interface OperatorCapabilitiesResponse {
  schemaVersion: number;
  surfaces: Record<string, OperatorSurfaceCapability>;
}

export interface OperatorAuthorityResponse {
  schemaVersion: number;
  operatorId: string;
  authorityIndex: number;
  blsPubkey: string;
  active: boolean;
}

export type SigningEntryStatus = "signed" | "missed" | "no_cert" | string;

export interface OperatorSigningEntry {
  round: bigint;
  status: SigningEntryStatus;
}

export interface OperatorSigningActivityResponse {
  schemaVersion: number;
  authorityIndex: number;
  currentRound: bigint;
  limit: number;
  entries: OperatorSigningEntry[];
}

export interface AttestationWindow {
  startRound: bigint;
  endRound: bigint;
  kind: string;
}

export interface DutyAbsence {
  reason: string;
}

export type KeyRotationWindow =
  | { nextRound: bigint; epochLengthRounds: bigint }
  | DutyAbsence;

export interface UpcomingDutyMap {
  attestation: AttestationWindow;
  blockProduction: DutyAbsence;
  sync: DutyAbsence;
  keyRotation: KeyRotationWindow;
}

export interface UpcomingDutiesResponse {
  schemaVersion: number;
  authorityIndex: number;
  currentRound: bigint;
  horizonRounds: number;
  duties: UpcomingDutyMap;
}

export type JailStatusWindow =
  | {
      jailed: boolean;
      tombstoned: boolean;
      jailedUntilHeight: bigint;
      unjailCount: bigint;
    }
  | DutyAbsence;

export interface OperatorRiskResponse {
  schemaVersion: number;
  authorityIndex: number;
  dataHeight: bigint;
  windowRounds: number;
  missedRounds: number;
  observedRounds: number;
  missRateBps: number;
  thresholdBps: number;
  remainingHeadroomBps: number;
  jailStatus: JailStatusWindow;
  reasons: string[];
}

export interface LythUpgradePlanStatus {
  upgradeId: string;
  activationHeight: number;
  activationRound: number | null;
  requiredBinaryVersion: string;
  expectedBinaryDigest: string;
  p2pProtocolVersion: number;
  requiredFeatures: string[];
  milestoneFileDigest: string | null;
  stateMigrationId: string | null;
  stateMigrationHash: string | null;
  expectedPreStateRoot: string | null;
  expectedPostStateRoot: string | null;
}

export interface LythUpgradeStatusResponse {
  chainId: number;
  blockNumber: number;
  configured: boolean;
  planCount: number;
  state: "active" | "none" | "pending" | string;
  active: LythUpgradePlanStatus | null;
  pendingCount: number;
  pending: LythUpgradePlanStatus[];
}

export interface RuntimeBuildProvenance {
  clientName: string;
  version: string;
  gitCommit: string;
  gitDirty: boolean;
  buildTimestampUtc: number;
  rustc: string;
  target: string;
  profile: string;
  features: string;
  p2pProtocolVersion: number;
  binarySha256: string | null;
  stateMigrations: string[];
}

export interface RuntimeUpgradeStatus {
  blockNumber: number;
  configured: boolean;
  planCount: number;
  state: "active" | "none" | "pending" | string;
  active: LythUpgradePlanStatus | null;
  pending: LythUpgradePlanStatus[];
}

export interface RuntimeProvenanceResponse {
  schemaVersion: number;
  chainId: number;
  genesisHash: string | null;
  latestHeight: number;
  runtime: RuntimeBuildProvenance;
  upgrade: RuntimeUpgradeStatus | null;
}

export type ServiceProbeStatusLabel =
  | "unknown"
  | "reachable"
  | "degraded"
  | "unreachable"
  | string;

export interface ServiceProbeResponse {
  serviceMask: number;
  status: ServiceProbeStatusLabel;
  statusCode: number;
  lastProbeBlock: number;
  latencyMs: number;
  probeDigest: string;
  reporter: string;
}

export interface ReportServiceProbeRequest {
  peerId: string;
  serviceMask: number;
  status: number;
  latencyMs: number;
  probeDigest: string;
  signedRawTx: string;
}

export interface ReportServiceProbeResponse {
  txHash: string;
  peerId: string;
  serviceMask: number;
  statusCode: number;
}

export type TxStatusResponse = TxStatusFoundResponse | TxStatusNotFoundResponse;

export interface TxStatusFoundResponse {
  status: "found";
  txHash: string;
  blockHash: string;
  blockNumber: number;
  txIndex: number;
}

export interface TxStatusNotFoundResponse {
  status: "not_found";
  txHash: string;
  latestHeight: number;
  indexerEnabled: boolean;
  providerKind: string;
}

export interface VertexAtRound {
  vertexHash: string;
  author: number;
}

export interface VerticesAtRoundResponse {
  schemaVersion: number;
  round: number;
  vertices: VertexAtRound[] | null;
}

export type MetricsRangeStatus = "available" | "not_retained" | "unknown" | string;

export interface MetricsRangeSample {
  blockNumber: number;
  value: number;
}

export interface MetricsRangeSeries {
  selector: string;
  status: MetricsRangeStatus;
  unit: string | null;
  samples: MetricsRangeSample[] | null;
}

export interface MetricsRangeResponse {
  schemaVersion: number;
  range: [number, number] | null;
  tracking: string;
  series: MetricsRangeSeries[];
}

export type AddressActivityKind =
  | "found"
  | "not_found"
  | "indexer_disabled"
  | "pruned"
  | "private"
  | string;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown;
}

interface JsonRpcResponse {
  jsonrpc?: "2.0";
  id?: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const SDK_VERSION = "0.1.0";

function resolveChainInfo(network: NetworkSlug | string, registry?: ChainRegistry): ChainInfo {
  if (registry) {
    const info = registry[network];
    if (!info) {
      throw SdkError.endpoint(`unknown Monolythium network: ${network}`);
    }
    return info;
  }
  try {
    return getChainInfo(network);
  } catch (err) {
    throw SdkError.endpoint((err as Error)?.message ?? String(err));
  }
}

export class RpcClient {
  readonly endpoint: string;
  readonly #fetch: typeof fetch;
  readonly #headers: Record<string, string>;
  #nextId: number;

  constructor(endpoint: string, options: RpcClientOptions = {}) {
    if (!endpoint || endpoint.length === 0) {
      throw SdkError.endpoint("endpoint cannot be empty");
    }
    this.endpoint = endpoint;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#headers = {
      "content-type": "application/json",
      "user-agent": `monolythium-core-sdk/${SDK_VERSION}`,
      ...(options.headers ?? {}),
    };
    this.#nextId = 1;
  }

  /**
   * Construct a client from the chain-registry network slug.
   *
   * Defaults to the SDK-bundled registry snapshot from
   * `monolythium-vision/chain-registry`. Set `probe: true` to walk the
   * registry endpoints in order and return the first endpoint whose
   * `eth_chainId` matches the registry chain id.
   */
  static async forNetwork(
    network: NetworkSlug | string = "testnet-69420",
    options: NetworkClientOptions = {},
  ): Promise<RpcClient> {
    const info = resolveChainInfo(network, options.registry);
    if (info.rpc.length === 0) {
      throw SdkError.endpoint(`network ${network} has no RPC endpoints`);
    }
    if (options.probe) {
      return this.fromFirstReachable(info, options);
    }
    return new RpcClient(info.rpc[0].url, options);
  }

  /**
   * Walk a chain-registry entry in order and return the first endpoint
   * whose `eth_chainId` matches the registry `chain_id`.
   */
  static async fromFirstReachable(
    chain: ChainInfo,
    options: RpcClientOptions = {},
  ): Promise<RpcClient> {
    const errors: string[] = [];
    for (const endpoint of chain.rpc) {
      const client = new RpcClient(endpoint.url, options);
      try {
        const chainId = await client.ethChainId();
        if (chainId === BigInt(chain.chain_id)) {
          return client;
        }
        errors.push(`${endpoint.url}: chain id ${chainId} != ${chain.chain_id}`);
      } catch (err) {
        errors.push(`${endpoint.url}: ${(err as Error)?.message ?? err}`);
      }
    }
    throw SdkError.endpoint(
      `no reachable RPC endpoint for ${chain.network}; tried ${errors.join("; ")}`,
    );
  }

  /**
   * Send an arbitrary JSON-RPC method. Most callers should prefer the
   * typed wrappers below; this is the escape hatch for methods the
   * SDK does not yet wrap.
   */
  async call<T>(method: string, params: unknown = []): Promise<T> {
    const id = this.#nextId++;
    const body: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    let resp: Response;
    try {
      resp = await this.#fetch(this.endpoint, {
        method: "POST",
        headers: this.#headers,
        body: JSON.stringify(body),
      });
    } catch (cause) {
      throw SdkError.transport(
        `transport failure calling ${method}: ${(cause as Error)?.message ?? cause}`,
        cause,
      );
    }
    let parsed: JsonRpcResponse;
    try {
      parsed = (await resp.json()) as JsonRpcResponse;
    } catch (cause) {
      throw SdkError.malformed(
        `non-JSON response (HTTP ${resp.status}): ${(cause as Error)?.message ?? cause}`,
      );
    }
    if (parsed.error) {
      throw SdkError.rpc(parsed.error.code, parsed.error.message, parsed.error.data);
    }
    if (!("result" in parsed) || parsed.result === undefined) {
      if (!resp.ok) {
        throw SdkError.malformed(`HTTP ${resp.status} with no JSON-RPC result`);
      }
      throw SdkError.malformed("response is missing both `result` and `error`");
    }
    return parsed.result as T;
  }

  // ---- eth_* / net_* / web3_* ---------------------------------------

  /** `eth_chainId` — configured chain id. */
  async ethChainId(): Promise<bigint> {
    return parseQuantityBig(await this.call<string>("eth_chainId", []));
  }

  /** `eth_blockNumber` — latest committed height. */
  async ethBlockNumber(): Promise<bigint> {
    return parseQuantityBig(await this.call<string>("eth_blockNumber", []));
  }

  /** `eth_getBalance` — balance + Merkle proof envelope. */
  async ethGetBalance(
    address: string,
    block: BlockSelector = "latest",
  ): Promise<AccountProofResponse> {
    return this.call("eth_getBalance", [address, encodeBlockSelector(block)]);
  }

  /** `eth_getStorageAt` — storage word + Merkle proof. */
  async ethGetStorageAt(
    address: string,
    slot: string,
    block: BlockSelector = "latest",
  ): Promise<AccountProofResponse> {
    return this.call("eth_getStorageAt", [
      address,
      slot,
      encodeBlockSelector(block),
    ]);
  }

  /** `eth_getTransactionCount` — sender nonce. */
  async ethGetTransactionCount(
    address: string,
    block: BlockSelector = "latest",
  ): Promise<bigint> {
    return parseQuantityBig(
      await this.call<string>("eth_getTransactionCount", [
        address,
        encodeBlockSelector(block),
      ]),
    );
  }

  /** `eth_getCode` — deployed bytecode (`0x` for an EOA, `0xfe` for a precompile). */
  async ethGetCode(address: string, block: BlockSelector = "latest"): Promise<string> {
    return this.call("eth_getCode", [address, encodeBlockSelector(block)]);
  }

  /** `eth_getBlockByNumber` — fetch a block header by height/tag. */
  async ethGetBlockByNumber(
    block: BlockSelector = "latest",
  ): Promise<BlockHeader | null> {
    return normalizeBlockHeader(await this.call("eth_getBlockByNumber", [encodeBlockSelector(block)]));
  }

  /** `eth_getBlockByHash` — fetch a block header by hash. */
  async ethGetBlockByHash(hash: string): Promise<BlockHeader | null> {
    return normalizeBlockHeader(await this.call("eth_getBlockByHash", [hash]));
  }

  /** `eth_getTransactionByHash` — fetch an included transaction by hash. */
  async ethGetTransactionByHash(txHash: string): Promise<TransactionView | null> {
    return this.call("eth_getTransactionByHash", [txHash]);
  }

  /** `eth_getTransactionReceipt` — receipt for a confirmed tx. */
  async ethGetTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    return normalizeTransactionReceipt(await this.call("eth_getTransactionReceipt", [txHash]));
  }

  /** `eth_sendRawTransaction` — submit a signed raw tx. */
  async ethSendRawTransaction(rawTx: string): Promise<string> {
    return this.call("eth_sendRawTransaction", [rawTx]);
  }

  /** `eth_call` — dry-run a transaction. */
  async ethCall(request: CallRequest, block: BlockSelector = "latest"): Promise<string> {
    return this.call("eth_call", [request, encodeBlockSelector(block)]);
  }

  /** `eth_estimateGas` — gas estimate for a dry-run. */
  async ethEstimateGas(
    request: CallRequest,
    block: BlockSelector = "latest",
  ): Promise<bigint> {
    return parseQuantityBig(
      await this.call<string>("eth_estimateGas", [request, encodeBlockSelector(block)]),
    );
  }

  /** `eth_gasPrice` — minimum gas price the node will accept. */
  async ethGasPrice(): Promise<bigint> {
    return parseQuantityBig(await this.call<string>("eth_gasPrice", []));
  }

  /** `eth_feeHistory` — base-fee + gas-used history. */
  async ethFeeHistory(
    blockCount: number,
    newestBlock: BlockSelector = "latest",
    rewardPercentiles: number[] = [],
  ): Promise<FeeHistoryResponse> {
    return this.call("eth_feeHistory", [
      `0x${blockCount.toString(16)}`,
      encodeBlockSelector(newestBlock),
      rewardPercentiles,
    ]);
  }

  /** `eth_syncing` — `null` when caught up. */
  async ethSyncing(): Promise<SyncStatus | null> {
    const v = await this.call<unknown>("eth_syncing", []);
    if (v === false || v === null || v === undefined) return null;
    return v as SyncStatus;
  }

  /** `net_version` — chain id as a decimal string. */
  async netVersion(): Promise<string> {
    return this.call("net_version", []);
  }

  /** `net_peerCount` — number of connected peers. */
  async netPeerCount(): Promise<bigint> {
    return parseQuantityBig(await this.call<string>("net_peerCount", []));
  }

  /** `net_listening` — whether the node accepts inbound peers. */
  async netListening(): Promise<boolean> {
    return this.call("net_listening", []);
  }

  /** `web3_clientVersion` — server's client-version string. */
  async web3ClientVersion(): Promise<string> {
    return this.call("web3_clientVersion", []);
  }

  /** `web3_sha3` — Keccak-256 of `data`. */
  async web3Sha3(data: string): Promise<string> {
    return this.call("web3_sha3", [data]);
  }

  // ---- lyth_* (Law §13.2 native namespace) --------------------------

  /** `lyth_listProviders` — paged registry enumeration. */
  async lythListProviders(
    capabilityMask: number,
    cursor: string | null = null,
    limit = 100,
  ): Promise<RegistryRecord[]> {
    return this.call("lyth_listProviders", [capabilityMask, cursor, limit]);
  }

  /** `lyth_getRegistration` — single registry lookup. */
  async lythGetRegistration(peerId: string): Promise<RegistryRecord | null> {
    return this.call("lyth_getRegistration", [peerId]);
  }

  /** `lyth_registryStateProof` — Merkle proof for a registry entry. */
  async lythRegistryStateProof(peerId: string): Promise<AccountProofResponse> {
    return this.call("lyth_registryStateProof", [peerId]);
  }

  /** `lyth_getAccountPolicy` — privacy posture for an account. */
  async lythGetAccountPolicy(address: string): Promise<AccountPolicy> {
    return this.call("lyth_getAccountPolicy", [address]);
  }

  /** `lyth_getAssetPolicy` — privacy posture for an asset. */
  async lythGetAssetPolicy(tokenId: string): Promise<AssetPolicy> {
    return this.call("lyth_getAssetPolicy", [tokenId]);
  }

  /** `lyth_getTokenBalances` — indexed per-asset balances for one address. */
  async lythGetTokenBalances(address: string): Promise<TokenBalanceRecord[]> {
    return this.call("lyth_getTokenBalances", [address]);
  }

  /** `lyth_bridgeRoutes` — read-only bridge route-selection/readiness. */
  async lythBridgeRoutes(request: BridgeRoutesRequest): Promise<BridgeRoutesResponse> {
    return this.call("lyth_bridgeRoutes", [request]);
  }

  /** `lyth_mrcMetadata` — exact current-state native MRC metadata lookup. */
  async lythMrcMetadata(
    assetId: string,
    tokenId?: string | null,
  ): Promise<MrcMetadataResponse> {
    const params = tokenId == null ? [assetId] : [assetId, tokenId];
    return this.call("lyth_mrcMetadata", params);
  }

  /** `lyth_getAddressLabel` — indexed display/category label for one address. */
  async lythGetAddressLabel(address: string): Promise<AddressLabelRecord | null> {
    const v = await this.call<unknown>("lyth_getAddressLabel", [address]);
    if (v === null || v === undefined) return null;
    return v as AddressLabelRecord;
  }

  /** `lyth_getAddressActivity` — indexed per-address activity timeline. */
  async lythGetAddressActivity(
    address: string,
    limit = 50,
    cursor?: string | null,
  ): Promise<AddressActivityEntry[]> {
    const params = cursor === undefined ? [address, limit] : [address, limit, cursor];
    return this.call("lyth_getAddressActivity", params);
  }

  /** `lyth_addressActivityKind` — activity index coverage for one address. */
  async lythAddressActivityKind(address: string): Promise<AddressActivityKindResponse> {
    return this.call("lyth_addressActivityKind", [address]);
  }

  /** `lyth_agentReputation` — reputation accumulators for an agent provider. */
  async lythAgentReputation(
    provider: UserAddressInput,
    categoryId = 0,
  ): Promise<AgentReputationResponse> {
    return this.call("lyth_agentReputation", [normalizeUserBech32Address(provider), categoryId]);
  }

  /** `lyth_decodeTx` — explorer-grade decoded transaction envelope. */
  async lythDecodeTx(txHash: string): Promise<DecodeTxResponse> {
    return this.call("lyth_decodeTx", [txHash]);
  }

  /** `lyth_nativeReceipt` — native RISC-V receipt metadata and typed native event rows. */
  async lythNativeReceipt<TDecoded = unknown>(
    txHash: string,
  ): Promise<NativeReceiptResponse<TDecoded>> {
    return this.call("lyth_nativeReceipt", [txHash]);
  }

  /**
   * Typed native event rows from `lyth_nativeReceipt`.
   *
   * This helper intentionally consumes the existing receipt RPC surface;
   * it does not require a separate `lyth_nativeEvents` node method.
   */
  async lythNativeReceiptEvents<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(
    txHash: string,
    filter: NativeEventFilter = {},
  ): Promise<Array<TypedNativeReceiptEvent<TDecoded>>> {
    const receipt = await this.lythNativeReceipt(txHash);
    return nativeEventsFromReceipt<TDecoded>(receipt, filter);
  }

  /** Typed native market event rows from `lyth_nativeReceipt`. */
  async lythNativeReceiptMarketEvents<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(
    txHash: string,
    filter: NativeEventFilter = {},
  ): Promise<Array<TypedNativeReceiptEvent<TDecoded>>> {
    const receipt = await this.lythNativeReceipt(txHash);
    return nativeMarketEventsFromReceipt<TDecoded>(receipt, filter);
  }

  /** `lyth_nativeEvents` — historical indexed native event rows. */
  async lythNativeEvents<TDecoded = unknown>(
    filter: NativeEventsFilter,
  ): Promise<NativeEventsResponse<TDecoded>> {
    return this.call("lyth_nativeEvents", [nativeEventsFilterParams(filter)]);
  }

  /** `lyth_nativeEvents` with decoded rows converted into a caller-selected type. */
  async lythNativeEventsTyped<
    TDecoded extends NativeDecodedEvent = NativeDecodedEvent,
  >(filter: NativeEventsFilter): Promise<NativeEventsResponse<TDecoded>> {
    const response = await this.lythNativeEvents(filter);
    return nativeEventsFromHistory<TDecoded>(response);
  }

  /** `lyth_nativeEvents` restricted to native marketplace event rows. */
  async lythNativeMarketEvents<TDecoded = unknown>(
    filter: NativeEventsFilter,
  ): Promise<NativeEventsResponse<TDecoded>> {
    return this.lythNativeEvents<TDecoded>({
      ...filter,
      family: "market",
    });
  }

  /** `lyth_nativeEvents` market rows with decoded rows converted into a caller-selected type. */
  async lythNativeMarketEventsTyped<
    TDecoded extends NativeDecodedEvent = NativeDecodedEvent,
  >(filter: NativeEventsFilter): Promise<NativeEventsResponse<TDecoded>> {
    const response = await this.lythNativeEvents({
      ...filter,
      family: "market",
    });
    return nativeMarketEventsFromHistory<TDecoded>(response);
  }

  /** `lyth_gapRecords` — retained ingestion/indexing gaps for a block range. */
  async lythGapRecords(
    fromBlock: number | bigint | string,
    toBlock: number | bigint | string,
  ): Promise<GapRecordsResponse> {
    return this.call("lyth_gapRecords", [
      encodeRpcU64Number(fromBlock, "fromBlock"),
      encodeRpcU64Number(toBlock, "toBlock"),
    ]);
  }

  /** `lyth_dagParents` — parent vertices for a DAG round. */
  async lythDagParents(round: number | bigint | string): Promise<DagParentsResponse> {
    return this.call("lyth_dagParents", [encodeRpcU64Number(round, "round")]);
  }

  /** `lyth_richList` — top holders for a token id. */
  async lythRichList(tokenId: string, limit?: number | null): Promise<RichListResponse> {
    const params = limit == null ? [tokenId] : [tokenId, limit];
    return this.call("lyth_richList", params);
  }

  /** `lyth_clobMarket` — live CLOB market metadata for a market id. */
  async lythClobMarket(marketId: string): Promise<ClobMarketResponse> {
    return this.call("lyth_clobMarket", [marketId]);
  }

  /** `lyth_clobMarkets` — CLOB markets observed through indexed trades. */
  async lythClobMarkets(limit?: number | null): Promise<ClobMarketsResponse> {
    const params = limit == null ? [] : [limit];
    return this.call("lyth_clobMarkets", params);
  }

  /** `lyth_clobTrades` — CLOB fills for one market. */
  async lythClobTrades(
    marketId: string,
    limit = 50,
    cursor?: string | null,
  ): Promise<ClobTradesResponse> {
    const params = cursor === undefined ? [marketId, limit] : [marketId, limit, cursor];
    return this.call("lyth_clobTrades", params);
  }

  /** `lyth_clobOhlc` — CLOB OHLC candles for a market over a block range. */
  async lythClobOhlc(
    marketId: string,
    fromBlock?: number | bigint | string | null,
    toBlock?: number | bigint | string | null,
    bucketBlocks?: number | bigint | string | null,
  ): Promise<ClobOhlcResponse> {
    const params =
      fromBlock == null && toBlock == null && bucketBlocks == null
        ? [marketId]
        : [
            marketId,
            fromBlock == null ? null : encodeRpcU64Number(fromBlock, "fromBlock"),
            toBlock == null ? null : encodeRpcU64Number(toBlock, "toBlock"),
            bucketBlocks == null ? null : encodeRpcU64Number(bucketBlocks, "bucketBlocks"),
          ];
    return this.call("lyth_clobOhlc", params);
  }

  /** `lyth_clobOrderBook` — live CLOB depth from canonical state. */
  async lythClobOrderBook(
    marketId: string,
    levels?: number | null,
  ): Promise<ClobOrderBookResponse> {
    const params = levels == null ? [marketId] : [marketId, levels];
    return this.call("lyth_clobOrderBook", params);
  }

  /** `lyth_txFeed` — paged global transaction feed. */
  async lythTxFeed(limit = 50, cursor?: string | null): Promise<TxFeedResponse> {
    const params = cursor === undefined ? [limit] : [limit, cursor];
    return this.call("lyth_txFeed", params);
  }

  /** `lyth_addressProfile` — live account + label + activity aggregate. */
  async lythAddressProfile(address: string): Promise<AddressProfileResponse> {
    return this.call("lyth_addressProfile", [address]);
  }

  /** `lyth_addressFlow` — recent indexed address-flow aggregate. */
  async lythAddressFlow(address: string, limit = 250): Promise<AddressFlowResponse> {
    return this.call("lyth_addressFlow", [address, limit]);
  }

  /** `lyth_search` — exact live resolver for hashes, addresses, blocks, and clusters. */
  async lythSearch(query: string, limit = 10): Promise<SearchResponse> {
    return this.call("lyth_search", [query, limit]);
  }

  /** `lyth_chainStats` — compact live chain/indexer/mempool summary. */
  async lythChainStats(): Promise<ChainStatsResponse> {
    return this.call("lyth_chainStats", []);
  }

  /** `lyth_mempoolStatus` — aggregate mempool snapshot. */
  async lythMempoolStatus(): Promise<MempoolSnapshot> {
    return normalizeMempoolSnapshot(await this.call("lyth_mempoolStatus", []));
  }

  /** `lyth_mempoolPending` — pending txs for a sender. */
  async lythMempoolPending(sender: string): Promise<PendingTxSummary[]> {
    return this.call("lyth_mempoolPending", [sender]);
  }

  /** `lyth_currentRound` — latest committed height. */
  async lythCurrentRound(): Promise<RoundInfo> {
    return normalizeRoundInfo(await this.call("lyth_currentRound", []));
  }

  /** `lyth_peerSummary` — public-safe aggregate peer-network diagnostics. */
  async lythPeerSummary(): Promise<PeerSummaryAggregate> {
    return this.call("lyth_peerSummary", []);
  }

  /**
   * `lyth_listActivePrecompiles` — milestone-gated precompile catalogue
   * (OI-0170 / ADR-0015 §5).
   */
  async lythListActivePrecompiles(
    block: BlockSelector = "latest",
  ): Promise<PrecompileCatalogueResponse> {
    return this.call("lyth_listActivePrecompiles", [encodeBlockSelector(block)]);
  }

  /** `lyth_capabilities` — address-keyed precompile capability map. */
  async lythCapabilities(block?: BlockSelector): Promise<CapabilitiesResponse> {
    const params = block === undefined ? [] : [encodeBlockSelector(block)];
    return this.call("lyth_capabilities", params);
  }

  /**
   * `lyth_operatorCapabilities` — node-level availability for operator UI
   * and explorer surfaces.
   */
  async lythOperatorCapabilities(): Promise<OperatorCapabilitiesResponse> {
    return this.call("lyth_operatorCapabilities", []);
  }

  /** `lyth_indexerStatus` — indexer status; `null` when disabled. */
  async lythIndexerStatus(): Promise<IndexerStatus | null> {
    const v = await this.call<unknown>("lyth_indexerStatus", []);
    if (v === null || v === undefined) return null;
    return v as IndexerStatus;
  }

  /** `lyth_getStorageProof` — batched Merkle proofs. */
  async lythGetStorageProof(
    address: string,
    slots: string[],
  ): Promise<StorageProofBatch> {
    return this.call("lyth_getStorageProof", [address, slots]);
  }

  /** `lyth_getDelegations` — wallet delegation rows at a block. */
  async lythGetDelegations(
    wallet: string,
    block?: BlockSelector,
  ): Promise<DelegationsResponse> {
    const params =
      block === undefined ? [wallet] : [wallet, encodeBlockSelector(block)];
    return this.call("lyth_getDelegations", params);
  }

  /** `lyth_pendingRewards` — wallet pending rewards at a block. */
  async lythPendingRewards(
    wallet: string,
    block?: BlockSelector,
  ): Promise<PendingRewardsResponse> {
    const params =
      block === undefined ? [wallet] : [wallet, encodeBlockSelector(block)];
    return this.call("lyth_pendingRewards", params);
  }

  /** `lyth_redemptionQueue` — wallet redemption tickets at a block. */
  async lythRedemptionQueue(
    wallet: string,
    block?: BlockSelector,
  ): Promise<RedemptionQueueResponse> {
    const params =
      block === undefined ? [wallet] : [wallet, encodeBlockSelector(block)];
    return this.call("lyth_redemptionQueue", params);
  }

  /** `lyth_getDelegationHistory` — indexed per-wallet delegation event timeline. */
  async lythGetDelegationHistory(
    wallet: string,
    limit = 50,
    cursor?: string | null,
  ): Promise<DelegationHistoryRecord[]> {
    const params = cursor === undefined ? [wallet, limit] : [wallet, limit, cursor];
    return this.call("lyth_getDelegationHistory", params);
  }

  /** `lyth_getClusterDelegators` — delegator addresses for a cluster. */
  async lythGetClusterDelegators(
    cluster: number,
    block?: BlockSelector,
  ): Promise<ClusterDelegatorsResponse> {
    const params =
      block === undefined ? [cluster] : [cluster, encodeBlockSelector(block)];
    return this.call("lyth_getClusterDelegators", params);
  }

  /** `lyth_getDelegationCap` — active per-cluster cap at a block. */
  async lythGetDelegationCap(
    block?: BlockSelector,
  ): Promise<DelegationCapResponse> {
    const params = block === undefined ? [] : [encodeBlockSelector(block)];
    return this.call("lyth_getDelegationCap", params);
  }

  /** `lyth_getTpmAttestation` — TPM quote digest + EK id for a peer. */
  async lythGetTpmAttestation(
    peerId: string,
    block?: BlockSelector,
  ): Promise<TpmAttestationResponse> {
    const params =
      block === undefined ? [peerId] : [peerId, encodeBlockSelector(block)];
    return this.call("lyth_getTpmAttestation", params);
  }

  /** `lyth_getClusterEntity` — entity flag for a cluster. */
  async lythGetClusterEntity(
    cluster: number,
    block?: BlockSelector,
  ): Promise<ClusterEntityResponse> {
    const params =
      block === undefined ? [cluster] : [cluster, encodeBlockSelector(block)];
    return this.call("lyth_getClusterEntity", params);
  }

  /** `lyth_getEntityRatchet` — entity-ratchet snapshot at a block. */
  async lythGetEntityRatchet(
    block?: BlockSelector,
  ): Promise<EntityRatchetResponse> {
    const params = block === undefined ? [] : [encodeBlockSelector(block)];
    return this.call("lyth_getEntityRatchet", params);
  }

  /** `lyth_operatorInfo` — canonical operator identity envelope. */
  async lythOperatorInfo(operatorId: string): Promise<OperatorInfoResponse> {
    return normalizeOperatorInfo(await this.call("lyth_operatorInfo", [operatorId]));
  }

  /** `lyth_getServiceProbe` — latest external reachability report for one public service. */
  async lythGetServiceProbe(
    peerId: string,
    serviceMask: number,
  ): Promise<ServiceProbeResponse | null> {
    assertHexBytes(peerId, 32, "peerId");
    if (!isSinglePublicServiceProbeMask(serviceMask)) {
      throw SdkError.malformed("serviceMask must contain exactly one public-service bit");
    }
    const value = await this.call<unknown>("lyth_getServiceProbe", [peerId, serviceMask]);
    if (value === null || value === undefined) return null;
    return normalizeServiceProbe(value);
  }

  /** `lyth_reportServiceProbe` — submit a pre-signed public-service probe report. */
  async lythReportServiceProbe(
    req: ReportServiceProbeRequest,
  ): Promise<ReportServiceProbeResponse> {
    assertHexBytes(req.peerId, 32, "peerId");
    if (!isValidPublicServiceProbeMask(req.serviceMask)) {
      throw SdkError.malformed("serviceMask must name one or more public-service bits");
    }
    if (!isConcreteServiceProbeStatus(req.status)) {
      throw SdkError.malformed("status must be reachable, degraded, or unreachable");
    }
    assertSafeUint32(req.latencyMs, "latencyMs");
    assertHexBytes(req.probeDigest, 32, "probeDigest");
    assertNonEmptyHex(req.signedRawTx, "signedRawTx");
    return this.call("lyth_reportServiceProbe", [req]);
  }

  /** `lyth_clusterStatus` — canonical cluster status envelope. */
  async lythClusterStatus(clusterId: number): Promise<ClusterStatusResponse> {
    return normalizeClusterStatus(await this.call("lyth_clusterStatus", [clusterId]));
  }

  /** `lyth_clusterDirectory` — paged public cluster directory. */
  async lythClusterDirectory(page = 0, limit = 25): Promise<ClusterDirectoryPageResponse> {
    return normalizeClusterDirectoryPage(
      await this.call("lyth_clusterDirectory", [page, limit]),
    );
  }

  /** `lyth_clusters` — alias for `lyth_clusterDirectory`. */
  async lythClusters(page = 0, limit = 25): Promise<ClusterDirectoryPageResponse> {
    return normalizeClusterDirectoryPage(await this.call("lyth_clusters", [page, limit]));
  }

  /**
   * `lyth_submitPendingChange` — operator-onboarding transport for the
   * pending-change ledger. Server validates the envelope shape.
   */
  async lythSubmitPendingChange(envelope: unknown): Promise<unknown> {
    return this.call("lyth_submitPendingChange", [envelope]);
  }

  /** `lyth_submitEncrypted` — submit a bincode-encoded encrypted envelope hex. */
  async lythSubmitEncrypted(envelopeHex: string): Promise<string> {
    return this.call("lyth_submitEncrypted", [envelopeHex]);
  }

  /** `lyth_getEncryptionKey` — cluster ML-KEM encapsulation key. */
  async lythGetEncryptionKey(): Promise<EncryptionKeyResponse> {
    return this.call("lyth_getEncryptionKey", []);
  }

  /** `lyth_syncStatus` — DAG-sync driver snapshot. */
  async lythSyncStatus(): Promise<DagSyncStatus | null> {
    const v = await this.call<unknown>("lyth_syncStatus", []);
    if (v === null || v === undefined) return null;
    return v as DagSyncStatus;
  }

  /** `lyth_resolveOperatorAuthority` — operator id to authority index. */
  async lythResolveOperatorAuthority(operatorId: string): Promise<OperatorAuthorityResponse> {
    return normalizeOperatorAuthority(
      await this.call("lyth_resolveOperatorAuthority", [operatorId]),
    );
  }

  /** `lyth_signingActivity` — recent per-round signing participation. */
  async lythSigningActivity(
    authorityIndex: number,
    limit?: number | null,
  ): Promise<OperatorSigningActivityResponse> {
    const params = limit == null ? [authorityIndex] : [authorityIndex, limit];
    return normalizeSigningActivity(await this.call("lyth_signingActivity", params));
  }

  /** `lyth_upcomingDuties` — deterministic upcoming duty windows. */
  async lythUpcomingDuties(
    authorityIndex: number,
    horizonRounds?: number | null,
  ): Promise<UpcomingDutiesResponse> {
    const params =
      horizonRounds == null ? [authorityIndex] : [authorityIndex, horizonRounds];
    return normalizeUpcomingDuties(await this.call("lyth_upcomingDuties", params));
  }

  /** `lyth_operatorRisk` — miss-rate and jail-status window. */
  async lythOperatorRisk(
    authorityIndex: number,
    windowRounds?: number | null,
  ): Promise<OperatorRiskResponse> {
    const params =
      windowRounds == null ? [authorityIndex] : [authorityIndex, windowRounds];
    return normalizeOperatorRisk(await this.call("lyth_operatorRisk", params));
  }

  /** `lyth_upgradeStatus` — signed network-upgrade readiness at a height. */
  async lythUpgradeStatus(block?: BlockSelector): Promise<LythUpgradeStatusResponse> {
    const params = block === undefined ? [] : [encodeBlockSelector(block)];
    return this.call("lyth_upgradeStatus", params);
  }

  /** `lyth_runtimeProvenance` — public-safe build/runtime provenance. */
  async lythRuntimeProvenance(): Promise<RuntimeProvenanceResponse> {
    return this.call("lyth_runtimeProvenance", []);
  }

  /** `lyth_txStatus` — discriminated transaction lookup outcome. */
  async lythTxStatus(txHash: string): Promise<TxStatusResponse> {
    return this.call("lyth_txStatus", [txHash]);
  }

  /** `lyth_verticesAtRound` — per-vertex authorship observed at a DAG round. */
  async lythVerticesAtRound(
    round: number | bigint | string,
  ): Promise<VerticesAtRoundResponse> {
    return this.call("lyth_verticesAtRound", [
      encodeRpcU64Number(round, "round"),
    ]);
  }

  /** `lyth_metricsRange` — retained telemetry series when the node has them. */
  async lythMetricsRange(
    selectors: string[],
    range?: readonly [number | bigint | string, number | bigint | string] | null,
  ): Promise<MetricsRangeResponse> {
    const params =
      range === undefined
        ? [selectors]
        : [
            selectors,
            range === null
              ? null
              : [
                  encodeRpcU64Number(range[0], "fromBlock"),
                  encodeRpcU64Number(range[1], "toBlock"),
                ],
          ];
    return this.call("lyth_metricsRange", params);
  }

  /** `lyth_getLatestCheckpoint` — latest PQ-finality checkpoint rows. */
  async lythGetLatestCheckpoint(belowHeight?: number | bigint | string | null): Promise<CheckpointRecord[]> {
    const params = belowHeight === undefined ? [] : [encodeOptionalHeight(belowHeight)];
    return this.call("lyth_getLatestCheckpoint", params);
  }

  /** `lyth_getClusterResignations` — in-flight + applied operator resignations. */
  async lythGetClusterResignations(
    operator?: string | null,
    status?: "pending" | "applied" | "all" | string | null,
  ): Promise<ClusterResignationsResponse> {
    const params =
      status === undefined
        ? operator == null
          ? []
          : [operator]
        : [operator ?? null, status];
    return this.call("lyth_getClusterResignations", params);
  }

  /** `lyth_getBlsRoundCertificate` — round-advancement BLS aggregate. */
  async lythGetBlsRoundCertificate(round: number | bigint | string): Promise<BlsCertificateResponse | null> {
    return this.call("lyth_getBlsRoundCertificate", [encodeRpcInteger(round)]);
  }

  /** `lyth_getLeaderCertificate` — leader-vote BLS aggregate for a block ref. */
  async lythGetLeaderCertificate(
    round: number | bigint | string,
    authority: number,
    digest: string,
  ): Promise<BlsCertificateResponse | null> {
    return this.call("lyth_getLeaderCertificate", [encodeRpcInteger(round), authority, digest]);
  }

  /** `lyth_getDacCertificate` — data-availability certificate for a block ref. */
  async lythGetDacCertificate(
    round: number | bigint | string,
    authority: number,
    digest: string,
  ): Promise<BlsCertificateResponse | null> {
    return this.call("lyth_getDacCertificate", [encodeRpcInteger(round), authority, digest]);
  }

  /** `lyth_subscribe` — WebSocket-only; returns an RPC error over HTTP. */
  async lythSubscribe(channel: string): Promise<unknown> {
    return this.call("lyth_subscribe", [channel]);
  }

  /** `lyth_unsubscribe` — counterpart to `lythSubscribe`. */
  async lythUnsubscribe(subId: string): Promise<unknown> {
    return this.call("lyth_unsubscribe", [subId]);
  }

  // ---- debug_* ------------------------------------------------------
  // Server-side gated by `RpcConfig::debug_enabled`. When the namespace
  // is disabled, every call surfaces as `SdkError.rpc`.

  /** `debug_traceTransaction` — revm trace for a confirmed tx. */
  async debugTraceTransaction(txHash: string): Promise<unknown> {
    return this.call("debug_traceTransaction", [txHash]);
  }

  /** `debug_traceCall` — revm trace for a dry-run. */
  async debugTraceCall(
    request: CallRequest,
    block: BlockSelector = "latest",
  ): Promise<unknown> {
    return this.call("debug_traceCall", [request, encodeBlockSelector(block)]);
  }

  /** `debug_traceBlockByNumber` — revm traces for an entire block. */
  async debugTraceBlockByNumber(block: BlockSelector): Promise<unknown> {
    return this.call("debug_traceBlockByNumber", [encodeBlockSelector(block)]);
  }

  /** `debug_mempoolDump` — full mempool snapshot. */
  async debugMempoolDump(): Promise<MempoolSnapshot> {
    return normalizeMempoolSnapshot(await this.call("debug_mempoolDump", []));
  }

  /** `debug_p2pPeers` — connected libp2p peer list. */
  async debugP2pPeers(): Promise<PeerSummary[]> {
    return this.call("debug_p2pPeers", []);
  }

  /** `debug_stateDiff` — state-diff for a block range. */
  async debugStateDiff(params: unknown): Promise<unknown> {
    return this.call("debug_stateDiff", params);
  }

  /** `debug_chainReorg` — testnet-only reorg trigger. */
  async debugChainReorg(params: unknown): Promise<unknown> {
    return this.call("debug_chainReorg", params);
  }

  // ---- mesh_* -------------------------------------------------------

  /** `mesh_buildUnsignedTx` — build an unsigned transaction envelope. */
  async meshBuildUnsignedTx(intent: MeshTxIntent): Promise<MeshUnsignedTxResponse> {
    return this.call("mesh_buildUnsignedTx", [intent]);
  }

  /** `mesh_combineTx` — combine an unsigned envelope with a wallet signature. */
  async meshCombineTx(
    unsignedTx: string,
    signatureHex: string,
    algo?: "secp256k1" | "ml_dsa_65" | string,
    pubkeyHex?: string,
  ): Promise<MeshSignedTxResponse> {
    const params =
      algo === undefined
        ? [unsignedTx, signatureHex]
        : pubkeyHex === undefined
          ? [unsignedTx, signatureHex, algo]
          : [unsignedTx, signatureHex, algo, pubkeyHex];
    return this.call("mesh_combineTx", params);
  }

  /** `mesh_decodeTx` — decode a signed or unsigned mesh envelope. */
  async meshDecodeTx(envelopeHex: string, signed = false): Promise<MeshDecodedTx> {
    return this.call("mesh_decodeTx", [envelopeHex, signed]);
  }

  /** `mesh_submitTx` — submit a signed mesh envelope. */
  async meshSubmitTx(signedTx: string): Promise<string> {
    return this.call("mesh_submitTx", [signedTx]);
  }
}

/** Decode a `0x`-prefixed hex quantity to a `bigint`. */
export function parseQuantityBig(hex: string): bigint {
  if (!hex) return 0n;
  const rest = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (rest.length === 0) return 0n;
  if (!/^[0-9a-fA-F]+$/.test(rest)) {
    throw SdkError.malformed(`invalid hex quantity: ${hex}`);
  }
  return BigInt(`0x${rest}`);
}

/**
 * Decode a `0x`-prefixed hex quantity to a JS `number`. Convenience for
 * small quantities (chain id, block height, gas estimate). Throws if the
 * value exceeds `Number.MAX_SAFE_INTEGER`.
 */
export function parseQuantity(hex: string): number {
  const big = parseQuantityBig(hex);
  if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw SdkError.malformed(`hex quantity exceeds safe integer: ${hex}`);
  }
  return Number(big);
}

function encodeRpcInteger(v: number | bigint | string): number | string {
  if (typeof v === "bigint") return `0x${v.toString(16)}`;
  return v;
}

function encodeOptionalHeight(v: number | bigint | string | null): number | string | null {
  if (v === null) return null;
  return encodeRpcInteger(v);
}

function encodeRpcU64Number(v: number | bigint | string, label: string): number {
  return parseRpcNumber(v, label);
}

export function nativeEventsFilterParams(filter: NativeEventsFilter): Record<string, unknown> {
  return {
    fromBlock: encodeRpcU64Number(filter.fromBlock, "fromBlock"),
    toBlock: encodeRpcU64Number(filter.toBlock, "toBlock"),
    ...optionalRpcNumber("limit", filter.limit),
    ...optionalRpcNumber("txIndex", filter.txIndex),
    ...optionalRpcNumber("logIndex", filter.logIndex),
    ...optionalString("address", filter.address),
    ...optionalString("eventTopic", filter.eventTopic),
    ...optionalString("family", filter.family),
    ...optionalString("eventName", filter.eventName),
    ...optionalString("primaryId", filter.primaryId),
    ...optionalString("relatedId", filter.relatedId),
    ...optionalString("tokenId", filter.tokenId),
    ...optionalString("account", filter.account),
    ...optionalString("counterparty", filter.counterparty),
  };
}

function optionalRpcNumber(
  key: string,
  value: number | bigint | string | null | undefined,
): Record<string, number> {
  return value == null ? {} : { [key]: encodeRpcU64Number(value, key) };
}

function optionalString(key: string, value: string | null | undefined): Record<string, string> {
  return value == null ? {} : { [key]: value };
}

function parseRpcBigint(value: unknown, label: string): bigint {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw SdkError.malformed(`${label} must be a non-negative quantity`);
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw SdkError.malformed(`${label} must be a non-negative safe integer`);
    }
    return BigInt(value);
  }
  if (typeof value === "string") {
    if (value.startsWith("0x") || value.startsWith("0X")) return parseQuantityBig(value);
    if (/^\d+$/.test(value)) return BigInt(value);
  }
  throw SdkError.malformed(`${label} must be a bigint-compatible quantity`);
}

function parseRpcNumber(value: unknown, label: string): number {
  const big = parseRpcBigint(value, label);
  if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw SdkError.malformed(`${label} exceeds safe integer range`);
  }
  return Number(big);
}

function parseRpcNumberNullable(value: unknown, label: string): number | null {
  return value === null || value === undefined ? null : parseRpcNumber(value, label);
}

function parseRpcBigintNullable(value: unknown, label: string): bigint | null {
  return value === null || value === undefined ? null : parseRpcBigint(value, label);
}

function parseStringNullable(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function expectObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw SdkError.malformed(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function firstField(row: Record<string, unknown>, keys: readonly string[], label: string): unknown {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  throw SdkError.malformed(`${label} is missing (${keys.join(" | ")})`);
}

function normalizeServiceProbe(value: unknown): ServiceProbeResponse {
  const row = expectObject(value, "service probe response");
  return {
    serviceMask: parseRpcNumber(row["serviceMask"], "service probe serviceMask"),
    status: String(row["status"]),
    statusCode: parseRpcNumber(row["statusCode"], "service probe statusCode"),
    lastProbeBlock: parseRpcNumber(row["lastProbeBlock"], "service probe lastProbeBlock"),
    latencyMs: parseRpcNumber(row["latencyMs"], "service probe latencyMs"),
    probeDigest: String(row["probeDigest"]),
    reporter: String(row["reporter"]),
  };
}

function assertSafeUint32(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw SdkError.malformed(`${label} must be a uint32`);
  }
}

function assertHexBytes(value: string, expectedLen: number, label: string): void {
  const body = hexBody(value, label);
  if (body.length !== expectedLen * 2) {
    throw SdkError.malformed(`${label} must be ${expectedLen} bytes`);
  }
}

function assertNonEmptyHex(value: string, label: string): void {
  const body = hexBody(value, label);
  if (body.length === 0) {
    throw SdkError.malformed(`${label} must be non-empty`);
  }
}

function hexBody(value: string, label: string): string {
  const body = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  if (body.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw SdkError.malformed(`${label} must be hex bytes`);
  }
  return body;
}

function normalizeOperatorInfo(value: unknown): OperatorInfoResponse {
  const row = expectObject(value, "operator info response");
  const activeClusterIds = row["activeClusterIds"];
  if (!Array.isArray(activeClusterIds)) {
    throw SdkError.malformed("operator info activeClusterIds must be an array");
  }
  const capability = row["capability"];
  return {
    operatorId: String(row["operatorId"]),
    moniker: parseStringNullable(row["moniker"]),
    alias: parseStringNullable(row["alias"]),
    chainAddress: String(row["chainAddress"]),
    bonded: Boolean(row["bonded"]),
    commissionBps: parseRpcNumberNullable(row["commissionBps"], "operator info commissionBps"),
    delegationCount: parseRpcNumberNullable(
      row["delegationCount"],
      "operator info delegationCount",
    ),
    bondedAmount: String(row["bondedAmount"]),
    activeClusterIds: activeClusterIds.map((v, i) =>
      parseRpcNumber(v, `operator info activeClusterIds[${i}]`),
    ),
    operatorKeyFingerprint: parseStringNullable(row["operatorKeyFingerprint"]),
    blsKeyFingerprint: parseStringNullable(row["blsKeyFingerprint"]),
    lifecycleState: String(row["lifecycleState"]),
    capability:
      capability && typeof capability === "object" && !Array.isArray(capability)
        ? (capability as Record<string, unknown>)
        : {},
  };
}

function normalizeClusterMember(value: unknown, label: string): ClusterMemberResponse {
  const row = expectObject(value, label);
  return {
    operatorId: String(row["operatorId"]),
    blsPubkey: String(row["blsPubkey"]),
    state: String(row["state"]),
  };
}

function normalizeClusterStatus(value: unknown): ClusterStatusResponse {
  const row = expectObject(value, "cluster status response");
  const members = row["members"];
  if (!Array.isArray(members)) {
    throw SdkError.malformed("cluster status members must be an array");
  }
  return {
    clusterId: parseRpcNumber(row["clusterId"], "cluster status clusterId"),
    threshold: parseRpcNumber(row["threshold"], "cluster status threshold"),
    size: parseRpcNumber(row["size"], "cluster status size"),
    live: parseRpcNumber(row["live"], "cluster status live"),
    lagging: parseRpcNumber(row["lagging"], "cluster status lagging"),
    offline: parseRpcNumber(row["offline"], "cluster status offline"),
    maintenance: parseRpcNumber(row["maintenance"], "cluster status maintenance"),
    members: members.map((member, i) => normalizeClusterMember(member, `cluster status members[${i}]`)),
    epoch: parseRpcBigintNullable(row["epoch"], "cluster status epoch"),
    round: parseRpcBigintNullable(row["round"], "cluster status round"),
    quorum: String(row["quorum"]),
    reputationScore: parseRpcNumberNullable(
      row["reputationScore"],
      "cluster status reputationScore",
    ),
    livenessScore: parseRpcNumberNullable(row["livenessScore"], "cluster status livenessScore"),
    lastUpdateHeight: parseRpcBigint(row["lastUpdateHeight"], "cluster status lastUpdateHeight"),
  };
}

function normalizeClusterDirectoryEntry(value: unknown, label: string): ClusterDirectoryEntryResponse {
  const row = expectObject(value, label);
  const regionDiversity = row["regionDiversity"];
  if (regionDiversity !== null && regionDiversity !== undefined && !Array.isArray(regionDiversity)) {
    throw SdkError.malformed(`${label}.regionDiversity must be an array or null`);
  }
  return {
    clusterId: parseRpcNumber(row["clusterId"], `${label}.clusterId`),
    size: parseRpcNumber(row["size"], `${label}.size`),
    threshold: parseRpcNumber(row["threshold"], `${label}.threshold`),
    aggregateHealth: String(row["aggregateHealth"]),
    regionDiversity: Array.isArray(regionDiversity) ? regionDiversity.map(String) : null,
    active: Boolean(row["active"]),
  };
}

function normalizeClusterDirectoryPage(value: unknown): ClusterDirectoryPageResponse {
  const row = expectObject(value, "cluster directory response");
  const clusters = row["clusters"];
  if (!Array.isArray(clusters)) {
    throw SdkError.malformed("cluster directory clusters must be an array");
  }
  return {
    page: parseRpcNumber(row["page"], "cluster directory page"),
    limit: parseRpcNumber(row["limit"], "cluster directory limit"),
    totalClusters: parseRpcNumber(row["totalClusters"], "cluster directory totalClusters"),
    clusters: clusters.map((cluster, i) =>
      normalizeClusterDirectoryEntry(cluster, `cluster directory clusters[${i}]`),
    ),
  };
}

function normalizeOperatorAuthority(value: unknown): OperatorAuthorityResponse {
  const row = expectObject(value, "operator authority response");
  return {
    schemaVersion: parseRpcNumber(row["schemaVersion"], "operator authority schemaVersion"),
    operatorId: String(row["operatorId"]),
    authorityIndex: parseRpcNumber(row["authorityIndex"], "operator authority authorityIndex"),
    blsPubkey: String(row["blsPubkey"]),
    active: Boolean(row["active"]),
  };
}

function normalizeSigningActivity(value: unknown): OperatorSigningActivityResponse {
  const row = expectObject(value, "signing activity response");
  const entries = row["entries"];
  if (!Array.isArray(entries)) {
    throw SdkError.malformed("signing activity entries must be an array");
  }
  return {
    schemaVersion: parseRpcNumber(row["schemaVersion"], "signing activity schemaVersion"),
    authorityIndex: parseRpcNumber(row["authorityIndex"], "signing activity authorityIndex"),
    currentRound: parseRpcBigint(row["currentRound"], "signing activity currentRound"),
    limit: parseRpcNumber(row["limit"], "signing activity limit"),
    entries: entries.map((entry, i) => {
      const e = expectObject(entry, `signing activity entries[${i}]`);
      return {
        round: parseRpcBigint(e["round"], `signing activity entries[${i}].round`),
        status: String(e["status"]),
      };
    }),
  };
}

function normalizeDutyAbsence(value: unknown, label: string): DutyAbsence {
  const row = expectObject(value, label);
  return { reason: String(row["reason"]) };
}

function normalizeKeyRotationWindow(value: unknown): KeyRotationWindow {
  const row = expectObject(value, "upcoming duties keyRotation");
  if ("nextRound" in row) {
    return {
      nextRound: parseRpcBigint(row["nextRound"], "upcoming duties keyRotation.nextRound"),
      epochLengthRounds: parseRpcBigint(
        row["epochLengthRounds"],
        "upcoming duties keyRotation.epochLengthRounds",
      ),
    };
  }
  return { reason: String(row["reason"]) };
}

function normalizeUpcomingDuties(value: unknown): UpcomingDutiesResponse {
  const row = expectObject(value, "upcoming duties response");
  const duties = expectObject(row["duties"], "upcoming duties duties");
  const attestation = expectObject(duties["attestation"], "upcoming duties attestation");
  return {
    schemaVersion: parseRpcNumber(row["schemaVersion"], "upcoming duties schemaVersion"),
    authorityIndex: parseRpcNumber(row["authorityIndex"], "upcoming duties authorityIndex"),
    currentRound: parseRpcBigint(row["currentRound"], "upcoming duties currentRound"),
    horizonRounds: parseRpcNumber(row["horizonRounds"], "upcoming duties horizonRounds"),
    duties: {
      attestation: {
        startRound: parseRpcBigint(attestation["startRound"], "upcoming duties attestation.startRound"),
        endRound: parseRpcBigint(attestation["endRound"], "upcoming duties attestation.endRound"),
        kind: String(attestation["kind"]),
      },
      blockProduction: normalizeDutyAbsence(
        duties["blockProduction"],
        "upcoming duties blockProduction",
      ),
      sync: normalizeDutyAbsence(duties["sync"], "upcoming duties sync"),
      keyRotation: normalizeKeyRotationWindow(duties["keyRotation"]),
    },
  };
}

function normalizeJailStatus(value: unknown): JailStatusWindow {
  const row = expectObject(value, "operator risk jailStatus");
  if ("jailed" in row || "tombstoned" in row) {
    return {
      jailed: Boolean(row["jailed"]),
      tombstoned: Boolean(row["tombstoned"]),
      jailedUntilHeight: parseRpcBigint(
        row["jailedUntilHeight"],
        "operator risk jailStatus.jailedUntilHeight",
      ),
      unjailCount: parseRpcBigint(row["unjailCount"], "operator risk jailStatus.unjailCount"),
    };
  }
  return { reason: String(row["reason"]) };
}

function normalizeOperatorRisk(value: unknown): OperatorRiskResponse {
  const row = expectObject(value, "operator risk response");
  const reasons = row["reasons"];
  if (!Array.isArray(reasons)) {
    throw SdkError.malformed("operator risk reasons must be an array");
  }
  return {
    schemaVersion: parseRpcNumber(row["schemaVersion"], "operator risk schemaVersion"),
    authorityIndex: parseRpcNumber(row["authorityIndex"], "operator risk authorityIndex"),
    dataHeight: parseRpcBigint(row["dataHeight"], "operator risk dataHeight"),
    windowRounds: parseRpcNumber(row["windowRounds"], "operator risk windowRounds"),
    missedRounds: parseRpcNumber(row["missedRounds"], "operator risk missedRounds"),
    observedRounds: parseRpcNumber(row["observedRounds"], "operator risk observedRounds"),
    missRateBps: parseRpcNumber(row["missRateBps"], "operator risk missRateBps"),
    thresholdBps: parseRpcNumber(row["thresholdBps"], "operator risk thresholdBps"),
    remainingHeadroomBps: parseRpcNumber(
      row["remainingHeadroomBps"],
      "operator risk remainingHeadroomBps",
    ),
    jailStatus: normalizeJailStatus(row["jailStatus"]),
    reasons: reasons.map(String),
  };
}

function normalizeBlockHeader(value: unknown): BlockHeader | null {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("block header must be an object or null");
  }
  const h = value as Record<string, unknown>;
  return {
    number: parseRpcBigint(h["number"], "block header number"),
    hash: String(h["hash"]),
    parent_hash: String(firstField(h, ["parent_hash", "parentHash"], "block header parent hash")),
    state_root: String(firstField(h, ["state_root", "stateRoot"], "block header state root")),
    timestamp: parseRpcBigint(h["timestamp"], "block header timestamp"),
    executionUnitsUsed: parseRpcBigint(
      firstField(
        h,
        ["executionUnitsUsed", "execution_units_used", "gas_used", "gasUsed"],
        "block header execution units used",
      ),
      "block header execution units used",
    ),
    executionUnitLimit: parseRpcBigint(
      firstField(
        h,
        ["executionUnitLimit", "execution_unit_limit", "gas_limit", "gasLimit"],
        "block header execution unit limit",
      ),
      "block header execution unit limit",
    ),
  };
}

function normalizeTransactionReceipt(value: unknown): TransactionReceipt | null {
  if (value === null || value === undefined) return null;
  const r = expectObject(value, "transaction receipt");
  return {
    tx_hash: String(
      firstField(r, ["tx_hash", "txHash", "transactionHash"], "transaction receipt tx hash"),
    ),
    block_hash: String(
      firstField(r, ["block_hash", "blockHash"], "transaction receipt block hash"),
    ),
    block_number: parseRpcBigint(
      firstField(r, ["block_number", "blockNumber"], "transaction receipt block number"),
      "transaction receipt block number",
    ),
    tx_index: parseRpcNumber(
      firstField(r, ["tx_index", "txIndex", "transactionIndex"], "transaction receipt tx index"),
      "transaction receipt tx index",
    ),
    status: parseRpcNumber(firstField(r, ["status"], "transaction receipt status"), "transaction receipt status"),
    executionUnitsUsed: parseRpcBigint(
      firstField(
        r,
        ["executionUnitsUsed", "execution_units_used", "gas_used", "gasUsed"],
        "transaction receipt execution units used",
      ),
      "transaction receipt execution units used",
    ),
  };
}

function normalizeUserBech32Address(address: UserAddressInput): string {
  try {
    return addressToBech32(typeof address === "string" ? parseAddress(address) : address);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw SdkError.malformed(`invalid provider address: ${message}`);
  }
}

function normalizeRoundInfo(value: unknown): RoundInfo {
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("round info must be an object");
  }
  const row = value as Record<string, unknown>;
  return {
    height: parseRpcBigint(row["height"], "round height"),
  };
}

function normalizeMempoolSnapshot(value: unknown): MempoolSnapshot {
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("mempool snapshot must be an object");
  }
  const row = value as Record<string, unknown>;
  const bytesByClass = row["bytes_by_class"];
  if (!Array.isArray(bytesByClass) || bytesByClass.length !== 7) {
    throw SdkError.malformed("mempool bytes_by_class must contain 7 entries");
  }
  return {
    count_ready: parseRpcBigint(row["count_ready"], "mempool count_ready"),
    count_pending: parseRpcBigint(row["count_pending"], "mempool count_pending"),
    mailbox_depth: parseRpcBigint(row["mailbox_depth"], "mempool mailbox_depth"),
    bytes_by_class: bytesByClass.map((v, i) => parseRpcBigint(v, `mempool bytes_by_class[${i}]`)) as MempoolSnapshot["bytes_by_class"],
  };
}
