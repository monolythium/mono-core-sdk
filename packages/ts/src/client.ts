/**
 * Typed JSON-RPC client for a `mono-core` node.
 *
 * Mirrors the Rust SDK's `RpcClient` — every public method maps 1:1 to
 * a method on the Rust client, returns the same wire-shape value, and
 * sends the same `lyth_*` / `eth_*` / `debug_*` JSON-RPC method strings.
 */

import {
  requireTypedAddress,
  type AddressKind,
} from "./address.js";
import { SdkError } from "./error.js";
import type { CallRequest as RpcCallRequest } from "./bindings/CallRequest.js";
import type {
  BridgeDrainStatus,
  BridgeHealthResponse,
  BridgeRouteDisclosure,
  BridgeRoutesRequest,
  BridgeRoutesResponse,
} from "./bridge.js";
import type {
  ClusterDiversityView,
  OperatorNetworkMetadataView,
} from "./node-registry.js";
import type {
  OperatorFeeConfig,
  OperatorRouterConfig,
} from "./market-actions.js";
import type {
  OracleFeedConfig,
  OracleLatestPrice,
  OracleSignersResponse,
  OracleWriters,
} from "./oracle.js";
import type {
  ListProofRequestsResponse,
  ProofRequestView,
  ProverBidsResponse,
  ProverMarketStatusResponse,
} from "./prover-market.js";
import type { SpendingPolicyView } from "./spending-policy.js";
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
import { assertMrvStructuredFeeConformance } from "./mrv.js";
import { getChainInfo, type ChainInfo, type ChainRegistry, type NetworkSlug } from "./registry.js";
import type {
  AccountPolicy,
  AccountProofResponse,
  AddressActivityEntry,
  AddressActivityKindResponse,
  AddressLabelRecord,
  AssetPolicy,
  RoundCertificateResponse as RoundCertificateResponseBinding,
  BlockHeader,
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
  MrcAccountRequest,
  MrcAccountResponse,
  MrcHoldersRequest,
  MrcHoldersResponse,
  MrcMetadataRecord,
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
import type { NameRegistrationQuote } from "./name-registry.js";
import { NAME_FALLBACK_FEE_UNIT_LYTHOSHI, nameRegistrationCost, parseNameCategory } from "./name-registry.js";
import type { ApiStreamTopic } from "./streams.js";
import type {
  NativeDecodedEvent,
  NativeEventFilter,
  TypedNativeReceiptEvent,
} from "./native-events.js";

export type RoundCertificateResponse = RoundCertificateResponseBinding;

/** @deprecated Use {@link RoundCertificateResponse}. The JSON wire is identical. */
export type BlsCertificateResponse = RoundCertificateResponse;

export type EthCallRequest = RpcCallRequest & {
  /** Alias accepted by `eth_call` / `eth_estimateGas`; `data` is canonical. */
  input?: string;
  /** EIP-1559-style fee alias accepted by the compatibility parser. */
  maxFeePerGas?: string;
};

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

/** Typed user address (`mono1...`) accepted at public SDK boundaries. */
export type UserAddressInput = string;

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

export interface ExecutionUnitPriceResponse {
  executionUnitPriceLythoshi: string;
  basePricePerExecutionUnitLythoshi: string;
  priorityTipLythoshi: string;
  blockNumber: number | null;
  source: string;
}

export const MAX_NATIVE_RECEIPT_EVENTS = 1_000;

export interface NativeReceiptCounters {
  cycles: number;
  syscallUnits: number;
  stateIoUnits: number;
}

export interface NativeReceiptFee {
  total_lythoshi: string;
  total_lyth?: string;
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

export interface NoEvmCompactInclusionProof {
  schema: "mono.no_evm_receipt_compact_inclusion.v1";
  treeAlgorithm: "binary-keccak-receipt-tree";
  root: string;
  leafHash: string;
  siblingHashes: string[];
  pathSides: boolean[];
}

export interface NoEvmArchiveProof {
  schema: "mono.no_evm_receipt_archive_binding.v1";
  source: "indexerReceiptArchiveContentDigest" | string;
  manifestHash: string;
  contentHash: string;
  signatureDigest?: string | null;
  signatures: string[];
  coveringSnapshot?: NoEvmArchiveCoveringSnapshot | null;
}

export interface NoEvmArchiveCoveringSnapshot {
  snapshotHeight: number;
  manifestHash: string;
  signatureDigest: string;
  contentHash: string;
  checkpointContentHash: string;
  checkpointFrom: number;
  checkpointTo: number;
  signatures: string[];
}

export interface NoEvmFinalityCertificate {
  round: number;
  signature: string;
  signersBitmap: string;
  signerIndices: number[];
  signerCount: number;
}

export interface NoEvmFinalityBlockReference {
  round: number;
  authority: number;
  digest: string;
}

export interface NoEvmFinalityEvidence {
  schema: "mono.no_evm_receipt_finality.v1";
  source: "roundCertificate" | string;
  round: number;
  certificate: NoEvmFinalityCertificate;
  blockReference?: NoEvmFinalityBlockReference | null;
  leaderCertificate?: NoEvmFinalityCertificate | null;
  dacCertificate?: NoEvmFinalityCertificate | null;
}

interface NoEvmReceiptProofBase {
  schema: "mono.no_evm_receipt_proof.v1";
  rootAlgorithm: string;
  receiptCodec: "bincode(protocore_execution_types::Receipt)";
  blockHash: string;
  txHash: string;
  receiptsRoot: string;
  targetReceiptHash: string;
  blockHeight: number;
  txIndex: number;
  receiptCount: number;
  finalityEvidence?: NoEvmFinalityEvidence | null;
}

export interface NoEvmBoundedReceiptProof extends NoEvmReceiptProofBase {
  proofKind?: "boundedCacheTranscript";
  proofType: "canonicalReceiptsTranscript";
  historySource?: "legacyUnspecified" | "liveBlockCache";
  compactInclusionProof?: null;
  archiveProof?: null;
  missingProofMaterial?: string[];
  receiptTranscript: string[];
}

export interface NoEvmCompactReceiptProof extends NoEvmReceiptProofBase {
  proofKind: "compactInclusion";
  proofType: "canonicalReceiptInclusion";
  historySource: "liveBlockCache" | "indexerReceiptArchive";
  compactInclusionProof: NoEvmCompactInclusionProof;
  archiveProof?: NoEvmArchiveProof | null;
  missingProofMaterial?: string[];
  targetReceiptBytes: string;
  receiptTranscript?: string[];
}

export type NoEvmReceiptProof = NoEvmBoundedReceiptProof | NoEvmCompactReceiptProof;

export interface NativeReceiptResponse<TDecoded = unknown> {
  txHash: string;
  blockHash: string;
  blockHeight: number;
  txIndex: number;
  schema: string;
  artifactHash: string;
  receiptCommitment: string;
  /** Current nodes may return `null`; older nodes may omit the field. */
  noEvmProof?: NoEvmReceiptProof | null;
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

/** Filter object passed to `lyth_nativeAgentState` and `/api/v1/native-agent-state`. */
export interface NativeAgentStateFilter {
  policyId?: string | null;
  escrowId?: string | null;
  account?: string | null;
  includePolicySpends?: boolean | null;
  limit?: number | bigint | string | null;
}

export interface NativeAgentStateResponseFilters {
  policyId?: string | null;
  escrowId?: string | null;
  account?: string | null;
  includePolicySpends: boolean;
}

export interface NativeAgentStateSource {
  indexerProvider: string;
  projection: string;
}

export interface NativeAgentPolicyStateRecord {
  policyId: string;
  owner: string;
  controller: string;
  assetId: string;
  /** Owner/controller-local policy nonce; omitted by older nodes. */
  nonce?: number | null;
  enabled: boolean;
  perActionLimit: string;
  windowLimit: string;
  windowSecs: number;
  updatedAtBlock: number;
}

export interface NativeAgentPolicySpendStateRecord {
  policyId: string;
  controller: string;
  assetId: string;
  window: number;
  amount: string;
  spent: string;
  updatedAtBlock: number;
}

export interface NativeAgentEscrowStateRecord {
  escrowId: string;
  buyer: string;
  provider: string;
  arbiter: string;
  assetId: string;
  /** Buyer-local escrow nonce; omitted by older nodes. */
  nonce?: number | null;
  amount: string;
  termsHash: string;
  round: number;
  buyerAccepted: boolean;
  providerAccepted: boolean;
  submittedPayloadHash?: string | null;
  status: string;
  resolution?: string | null;
  lastActor?: string | null;
  createdAtBlock: number;
  updatedAtBlock: number;
}

export interface NativeAgentIssuerStateRecord {
  issuerId: string;
  issuer: string;
  /** Issuer-local nonce; omitted by older nodes. */
  nonce?: number | null;
  metadataHash?: string | null;
  updatedAtBlock: number;
}

export interface NativeAgentAttestationStateRecord {
  attestationId: string;
  /** Issuer-local attestation nonce; omitted by older nodes. */
  nonce?: number | null;
  issuerId?: string | null;
  issuer?: string | null;
  subject: string;
  schemaHash?: string | null;
  payloadHash?: string | null;
  active: boolean;
  updatedAtBlock: number;
}

export interface NativeAgentConsentStateRecord {
  consentId: string;
  subject: string;
  grantee: string;
  /** Subject-local consent nonce; omitted by older nodes. */
  nonce?: number | null;
  scopeHash?: string | null;
  expiresAt?: number | null;
  active: boolean;
  updatedAtBlock: number;
}

export interface NativeAgentServiceStateRecord {
  serviceId: string;
  provider: string;
  /** Provider-local service nonce; omitted by older nodes. */
  nonce?: number | null;
  categoryHash?: string | null;
  metadataHash?: string | null;
  active: boolean;
  updatedAtBlock: number;
}

export interface NativeAgentAvailabilityStateRecord {
  provider: string;
  maxConcurrent: number;
  openRequests: number;
  paused: boolean;
  updatedAtBlock: number;
}

export interface NativeAgentArbiterStateRecord {
  arbiterId: string;
  arbiter: string;
  /** Arbiter-local registration nonce; omitted by older nodes. */
  nonce?: number | null;
  tier?: number | null;
  metadataHash?: string | null;
  updatedAtBlock: number;
}

export interface NativeAgentReputationReviewStateRecord {
  reviewId: string;
  reviewer: string;
  subject: string;
  categoryId: number;
  speedScore: number;
  qualityScore: number;
  communicationScore: number;
  accuracyScore: number;
  payloadHash?: string | null;
  updatedAtBlock: number;
}

export interface NativeAgentStateResponse {
  schemaVersion: number;
  limit: number;
  filters: NativeAgentStateResponseFilters;
  issuers: NativeAgentIssuerStateRecord[];
  attestations: NativeAgentAttestationStateRecord[];
  consents: NativeAgentConsentStateRecord[];
  services: NativeAgentServiceStateRecord[];
  availability: NativeAgentAvailabilityStateRecord[];
  arbiters: NativeAgentArbiterStateRecord[];
  reputationReviews: NativeAgentReputationReviewStateRecord[];
  spendingPolicies: NativeAgentPolicyStateRecord[];
  policySpends: NativeAgentPolicySpendStateRecord[];
  escrows: NativeAgentEscrowStateRecord[];
  source: NativeAgentStateSource;
}

export type NativeAgentStateFilterParamValue = string | number | boolean;

/** Filter object passed to `lyth_nativeMarketState` and `/api/v1/native-market-state`. */
export interface NativeMarketStateFilter {
  marketId?: string | null;
  orderId?: string | null;
  listingId?: string | null;
  collectionId?: string | null;
  account?: string | null;
  includeSpotOrders?: boolean | null;
  limit?: number | bigint | string | null;
}

export interface NativeMarketStateResponseFilters {
  marketId?: string | null;
  orderId?: string | null;
  listingId?: string | null;
  collectionId?: string | null;
  account?: string | null;
  includeSpotOrders: boolean;
}

export interface NativeMarketStateSource {
  indexerProvider: string;
  projection: string;
}

export interface NativeSpotMarketStateRecord {
  marketId: string;
  owner: string;
  baseAssetId: string;
  quoteAssetId: string;
  tickSize: string;
  lotSize: string;
  minQuantity: string;
  minNotional: string;
  tradeCount: string;
  totalVolumeBase: string;
  lastPrice: string | null;
  lastBlockHeight: number | null;
  createdAtBlock: number;
  updatedAtBlock: number;
}

export interface NativeSpotOrderStateRecord {
  orderId: string;
  marketId: string;
  owner: string;
  /** Owner-local spot order nonce; omitted by older nodes. */
  nonce?: number | null;
  side: string;
  price: string;
  quantity: string;
  remaining: string;
  status: string;
  expiresAtBlock: number;
  updatedAtBlock: number;
}

export interface NativeNftListingStateRecord {
  listingId: string;
  seller: string;
  /** Seller-local NFT listing nonce; omitted by older nodes. */
  nonce?: number | null;
  standard: string;
  collectionId: string;
  tokenId: string;
  quantity: string;
  paymentAssetId: string;
  price: string;
  listingKind: unknown;
  status: string;
  expiresAtBlock: number;
  highestBidder: string | null;
  highestBid: string | null;
  updatedAtBlock: number;
}

export interface NativeCollectionRoyaltyStateRecord {
  collectionId: string;
  creator: string | null;
  recipient: string;
  bps: number;
  updatedAtBlock: number;
}

export interface NativeMarketStateResponse {
  schemaVersion: number;
  limit: number;
  filters: NativeMarketStateResponseFilters;
  spotMarkets: NativeSpotMarketStateRecord[];
  spotOrders: NativeSpotOrderStateRecord[];
  nftListings: NativeNftListingStateRecord[];
  collectionRoyalties: NativeCollectionRoyaltyStateRecord[];
  source: NativeMarketStateSource;
}

export type NativeMarketStateFilterParamValue = string | number | boolean;

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
  consensusKeyFingerprint: string | null;
  lifecycleState: string;
  capability: Record<string, unknown>;
}

export interface ClusterMemberResponse {
  operatorId: string;
  consensusPubkey: string;
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
  consensusPubkey: string;
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
  /**
   * Node head height at query time. Confirmation depth =
   * `latestHeight - blockNumber + 1`. Returned by the chain on the found
   * arm (`lyth_txStatus`); see {@link RpcClient.lythTxConfirmations}.
   */
  latestHeight: number;
  /** `true` when the serving node has the indexer enabled. */
  indexerEnabled?: boolean;
  /** Serving provider kind (e.g. `"indexer"` / `"node"`). */
  providerKind?: string;
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
  /** Authoring authority index (u16). */
  author: number;
  /** Parent vertex references (DAG edges). */
  parentRefs?: Array<{ blockHash: string; round: number }>;
  payloadHash?: string;
  transactionsRoot?: string;
  stateRootPrev?: string;
  /** Vertex author-stamped timestamp (ms). */
  timestampMs?: number;
  authorSignature?: string;
  /** Local ingest timestamp (ms). */
  ingestedAtMs?: number;
  /** Data-availability state of the vertex payload. */
  dacState?: "certified" | "missing" | "unavailable" | string;
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

/** `lyth_clusterApr` response — observed APR for a cluster over a rolling window. */
export interface ClusterAprResponse {
  clusterId: number;
  /** Window the APR was measured over (block heights). */
  blocks: { from: bigint; to: bigint; window: bigint };
  /** Cumulative reward index at `blocks.from` (`0x`-hex uint256). */
  rewardIndexFromHex: string;
  /** Cumulative reward index at `blocks.to` (`0x`-hex uint256). */
  rewardIndexToHex: string;
  /** `rewardIndexTo - rewardIndexFrom` (`0x`-hex uint256). */
  deltaIndexHex: string;
  /** Fixed-point scale for the reward index (decimal string, `1e18`). */
  rewardIndexScale: string;
  /** Delegator weight basis-points total for the cluster. */
  totalBps: number;
  /** Blocks per year used to annualize (ADR-0031 cadence). */
  blocksPerYear: bigint;
  /** Reference stake-per-bps ratio (lythoshi). */
  stakePerBpsLythoshi: bigint;
  /** Baseline annualized rate in basis points. `0` when no reward accrued in the window. */
  aprBps: bigint;
}

/** `lyth_resolveName` response — forward name → address resolution. */
export interface ResolveNameResponse {
  /** The (lower-cased) name that was resolved. */
  name: string;
  /** Owner address (`mono` bech32m), or `null` when the name is unregistered. */
  address: string | null;
  category: "human" | "agent" | "cluster" | "contract" | "system" | string;
  /** Block the name was registered at, or `null` when unregistered. */
  registeredAtBlock: number | null;
  /**
   * Block selector the read was answered at. A `string` for tags/hashes
   * (e.g. `"latest"`), a `number` when a numeric/hex height was requested
   * (`block_id_to_json` emits a number for `BlockId::Number`).
   */
  block: string | number;
}

/** `lyth_nameOf` response — reverse address → name resolution. */
export interface NameOfResponse {
  /** Queried address (`mono` bech32m). */
  address: string;
  /** The address's reverse name, or `null` when none is set. */
  name: string | null;
  /** Block selector the read was answered at (string for tags, number for heights). */
  block: string | number;
}

/** `lyth_getClusterName` response — reverse cluster id → canonical name. */
export interface ClusterNameResponse {
  clusterId: number;
  /** Canonical cluster name, or `null` when unnamed. */
  name: string | null;
  /** Block selector the read was answered at (string for tags, number for heights). */
  block: string | number;
}

/** `lyth_circulatingSupply` response. All amounts are decimal lythoshi strings (u128). */
export interface CirculatingSupplyResponse {
  circulatingSupplyLythoshi: string;
  initialSupplyLythoshi: string;
  /** H1/#60 — cumulative minted native LYTH (block rewards). */
  totalMintedLythoshi: string;
  totalBurnedLythoshi: string;
}

/** `lyth_totalBurned` response. Amount is a decimal lythoshi string (u128). */
export interface TotalBurnedResponse {
  totalBurnedLythoshi: string;
}

/** `lyth_totalMinted` response — cumulative minted native LYTH from block rewards (decimal lythoshi string, H1/#60). */
export interface TotalMintedResponse {
  totalMintedLythoshi: string;
}

/** `lyth_totalSupply` response — authoritative supply accounting (H1/#60). `current = initial + minted − burned`. */
export interface TotalSupplyResponse {
  initialSupplyLythoshi: string;
  totalMintedLythoshi: string;
  totalBurnedLythoshi: string;
  currentSupplyLythoshi: string;
}

/** `lyth_swapIntentStatus` response — bridge swap-intent / DKG-reshare lifecycle. */
export interface SwapIntentStatus {
  schemaVersion: number;
  /**
   * Intent id (u64, capped 2^56-1 by the chain). Emitted as a JSON number,
   * so ids beyond 2^53 (JS safe-int) lose precision in transit — realistic
   * ids are small monotonic counters. The request side accepts bigint/hex.
   */
  intentId: number;
  status: "not_found" | "pending" | "attested" | "ready" | "stalled" | string;
  found: boolean;
  operatorId?: string;
  sourcePubkey?: string;
  destinationPubkey?: string;
  sourceEpoch?: number;
  effectiveEpoch?: number;
  dkgAttested?: boolean;
  currentEpoch: number;
  latestHeight: number;
}

/** Derived per-tx confirmation depth (see {@link RpcClient.lythTxConfirmations}). */
export interface TxConfirmations {
  status: "found" | "not_found";
  /** `latestHeight - blockNumber + 1` when found, else `null`. */
  confirmations: number | null;
  blockNumber: number | null;
  latestHeight: number;
}

/** A token-balance row joined with its MRC metadata (or `null` when unknown). */
export type TokenBalanceWithMetadata = TokenBalanceRecord & {
  metadata: MrcMetadataRecord | null;
};

/** Base/quote asset metadata for a CLOB market (`null` when the indexer has no row). */
export interface ClobMarketAssets {
  base: MrcMetadataRecord | null;
  quote: MrcMetadataRecord | null;
}

/** Quote-notional liquidity aggregated from an order book (raw quote atomic units, decimal strings). */
export interface QuoteLiquidity {
  bidQuote: string;
  askQuote: string;
  totalQuote: string;
}

/** An {@link AddressActivityEntry} enriched with block time, tx hash, and resolved cluster name. */
export type AddressActivityEntryEnriched = AddressActivityEntry & {
  /** Block header timestamp (UNIX seconds), or `null` when the block read failed. */
  blockTimestampSeconds: bigint | null;
  /** Canonical tx hash resolved from `(blockHeight, txIndex)`, or `null`. */
  txHash: string | null;
  /** Resolved cluster name when the row carries a cluster id, else `null`. */
  clusterName: string | null;
};

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
const ETH_COMPAT_RPC_PREFIX = "eth_";
const ethCompatMethod = (name: string): string => `${ETH_COMPAT_RPC_PREFIX}${name}`;

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
   * `monolythium/chain-registry`. Set `probe: true` to walk the
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

  /** Compatibility block-height read. */
  async ethBlockNumber(): Promise<bigint> {
    return parseQuantityBig(await this.call<string>(ethCompatMethod("blockNumber"), []));
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

  /** `eth_call` — read-only execution against committed state. */
  async ethCall(
    request: EthCallRequest,
    block: BlockSelector = "latest",
  ): Promise<string> {
    return this.call("eth_call", [request, encodeBlockSelector(block)]);
  }

  /** `eth_estimateGas` — read-only execution-unit estimate for a call object. */
  async ethEstimateGas(
    request: EthCallRequest,
    block: BlockSelector = "latest",
  ): Promise<bigint> {
    return parseQuantityBig(
      await this.call<string>("eth_estimateGas", [request, encodeBlockSelector(block)]),
    );
  }

  /** Compatibility block-header read by height/tag. */
  async ethGetBlockByNumber(
    block: BlockSelector = "latest",
  ): Promise<BlockHeader | null> {
    return normalizeBlockHeader(await this.call(ethCompatMethod("getBlockByNumber"), [encodeBlockSelector(block)]));
  }

  /** Compatibility block-header read by hash. */
  async ethGetBlockByHash(hash: string): Promise<BlockHeader | null> {
    return normalizeBlockHeader(await this.call(ethCompatMethod("getBlockByHash"), [hash]));
  }

  /** `eth_getTransactionByHash` — fetch an included transaction by hash. */
  async ethGetTransactionByHash(txHash: string): Promise<TransactionView | null> {
    return this.call("eth_getTransactionByHash", [txHash]);
  }

  /** `eth_getTransactionReceipt` — receipt for a confirmed tx. */
  async ethGetTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    return normalizeTransactionReceipt(await this.call("eth_getTransactionReceipt", [txHash]));
  }

  /**
   * `eth_gasPrice` — passive compatibility fee quote for EVM-shaped read
   * tooling. Native callers should prefer `lythExecutionUnitPrice`.
   */
  async ethGasPrice(): Promise<bigint> {
    return parseQuantityBig(await this.call<string>("eth_gasPrice", []));
  }

  /**
   * `eth_feeHistory` — base-fee + gas-used history.
   *
   * The chain's eth-compat surface serializes the base-fee window under the
   * camelCase key `baseFeePerGas`. Internally the chain header field is
   * `base_fee_per_gas`; this method asserts the on-the-wire response actually
   * carries the expected `baseFeePerGas` array and fails LOUD if the field is
   * missing or has drifted to snake_case `base_fee_per_gas`. Without this
   * guard a future rename would silently collapse the base fee to an empty
   * array and over-/under-quote fees (e.g. name registration would fall back
   * to the placeholder fee unit and revert `IncorrectFee` on submit).
   */
  async ethFeeHistory(
    blockCount: number,
    newestBlock: BlockSelector = "latest",
    rewardPercentiles: number[] = [],
  ): Promise<FeeHistoryResponse> {
    const result = await this.call<Record<string, unknown>>("eth_feeHistory", [
      `0x${blockCount.toString(16)}`,
      encodeBlockSelector(newestBlock),
      rewardPercentiles,
    ]);
    if (result !== null && typeof result === "object" && !Array.isArray(result.baseFeePerGas)) {
      const drifted = "base_fee_per_gas" in result ? " (found snake_case 'base_fee_per_gas')" : "";
      throw SdkError.malformed(
        `eth_feeHistory response is missing the camelCase 'baseFeePerGas' array${drifted}; the base-fee field contract changed`,
      );
    }
    return result as unknown as FeeHistoryResponse;
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

  // ---- lyth_* native namespace --------------------------------------

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
    return this.call("lyth_getAccountPolicy", [sdkTypedAddress(address, "user", "address")]);
  }

  /** `lyth_getAssetPolicy` — privacy posture for an asset. */
  async lythGetAssetPolicy(tokenId: string): Promise<AssetPolicy> {
    return this.call("lyth_getAssetPolicy", [tokenId]);
  }

  /** `lyth_getTokenBalances` — indexed per-asset balances for one address. */
  async lythGetTokenBalances(address: string): Promise<TokenBalanceRecord[]> {
    return this.call("lyth_getTokenBalances", [sdkTypedAddress(address, "user", "address")]);
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

  /** `lyth_mrcAccount` — exact current-state native MRC account lookup. */
  async lythMrcAccount(
    account: string,
    spendLimit?: number | null,
  ): Promise<MrcAccountResponse> {
    const request: MrcAccountRequest = {
      account: sdkTypedAddress(account, "smartAccount", "account"),
    };
    if (spendLimit != null) request.spendLimit = spendLimit;
    const params =
      request.spendLimit == null
        ? [request.account]
        : [request.account, request.spendLimit];
    return this.call("lyth_mrcAccount", params);
  }

  /** `lyth_mrcHolders` — top holders for a native MRC asset/token key. */
  async lythMrcHolders(
    standard: string,
    assetId: string,
    tokenId: string,
    limit?: number | null,
  ): Promise<MrcHoldersResponse> {
    return this.lythMrcHoldersScoped(standard, assetId, tokenId, limit);
  }

  /**
   * `lyth_mrcHolders` — top holders for a native MRC asset/vault key.
   *
   * This is the asset-scoped form used by MRC-4626 vault share balances.
   */
  async lythMrcAssetHolders(
    standard: string,
    assetId: string,
    limit?: number | null,
  ): Promise<MrcHoldersResponse> {
    return this.lythMrcHoldersScoped(standard, assetId, null, limit);
  }

  /** `lyth_mrcHolders` — top holders for MRC-4626 vault shares. */
  async lythMrc4626Holders(
    vaultId: string,
    limit?: number | null,
  ): Promise<MrcHoldersResponse> {
    return this.lythMrcAssetHolders("mrc4626", vaultId, limit);
  }

  private async lythMrcHoldersScoped(
    standard: string,
    assetId: string,
    tokenId: string | null,
    limit?: number | null,
  ): Promise<MrcHoldersResponse> {
    const request: MrcHoldersRequest = {
      standard,
      assetId,
      tokenId,
    };
    if (limit != null) request.limit = limit;
    const params =
      request.limit == null
        ? [request.standard, request.assetId, request.tokenId]
        : [request.standard, request.assetId, request.tokenId, request.limit];
    return this.call("lyth_mrcHolders", params);
  }

  /** `lyth_getAddressLabel` — indexed display/category label for one address. */
  async lythGetAddressLabel(address: string): Promise<AddressLabelRecord | null> {
    const v = await this.call<unknown>("lyth_getAddressLabel", [
      sdkTypedAddress(address, "user", "address"),
    ]);
    if (v === null || v === undefined) return null;
    return v as AddressLabelRecord;
  }

  /** `lyth_getAddressActivity` — indexed per-address activity timeline. */
  async lythGetAddressActivity(
    address: string,
    limit = 50,
    cursor?: string | null,
  ): Promise<AddressActivityEntry[]> {
    const userAddress = sdkTypedAddress(address, "user", "address");
    const params = cursor === undefined ? [userAddress, limit] : [userAddress, limit, cursor];
    return this.call("lyth_getAddressActivity", params);
  }

  /** `lyth_addressActivityKind` — activity index coverage for one address. */
  async lythAddressActivityKind(address: string): Promise<AddressActivityKindResponse> {
    return this.call("lyth_addressActivityKind", [sdkTypedAddress(address, "user", "address")]);
  }

  /** `lyth_agentReputation` — reputation accumulators for an agent provider. */
  async lythAgentReputation(
    provider: UserAddressInput,
    categoryId = 0,
  ): Promise<AgentReputationResponse> {
    return this.call("lyth_agentReputation", [
      sdkTypedAddress(provider, "user", "provider address"),
      categoryId,
    ]);
  }

  /** `lyth_decodeTx` — explorer-grade decoded transaction envelope. */
  async lythDecodeTx(txHash: string): Promise<DecodeTxResponse> {
    return this.call("lyth_decodeTx", [txHash]);
  }

  /** `lyth_nativeReceipt` — native RISC-V receipt metadata and typed native event rows. */
  async lythNativeReceipt<TDecoded = unknown>(
    txHash: string,
  ): Promise<NativeReceiptResponse<TDecoded>> {
    return decodeNativeReceiptResponse<TDecoded>(
      await this.call<unknown>("lyth_nativeReceipt", [txHash]),
    );
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

  /** `lyth_nativeAgentState` — current-state native agent policy and escrow rows. */
  async lythNativeAgentState(
    filter: NativeAgentStateFilter = {},
  ): Promise<NativeAgentStateResponse> {
    const response = await this.call("lyth_nativeAgentState", [
      nativeAgentStateFilterParams(filter),
    ]);
    return decodeNativeAgentStateResponse(response);
  }

  /** `lyth_nativeMarketState` — current-state native spot and NFT market rows. */
  async lythNativeMarketState(
    filter: NativeMarketStateFilter = {},
  ): Promise<NativeMarketStateResponse> {
    return this.call("lyth_nativeMarketState", [nativeMarketStateFilterParams(filter)]);
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
    return decodeTxFeedResponse(await this.call<unknown>("lyth_txFeed", params));
  }

  /** `lyth_addressProfile` — live account + label + activity aggregate. */
  async lythAddressProfile(address: string): Promise<AddressProfileResponse> {
    return this.call("lyth_addressProfile", [sdkTypedAddress(address, "user", "address")]);
  }

  /** `lyth_addressFlow` — recent indexed address-flow aggregate. */
  async lythAddressFlow(address: string, limit = 250): Promise<AddressFlowResponse> {
    return this.call("lyth_addressFlow", [sdkTypedAddress(address, "user", "address"), limit]);
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
    return this.call("lyth_mempoolPending", [sdkTypedAddress(sender, "user", "sender")]);
  }

  /** `lyth_currentRound` — latest committed height. */
  async lythCurrentRound(): Promise<RoundInfo> {
    return normalizeRoundInfo(await this.call("lyth_currentRound", []));
  }

  /** `lyth_getTransactionCount` — native sender nonce. */
  async lythGetTransactionCount(address: string): Promise<bigint> {
    return parseRpcBigint(
      await this.call<unknown>("lyth_getTransactionCount", [
        sdkTypedAddress(address, "user", "address"),
      ]),
      "lyth_getTransactionCount",
    );
  }

  /** `lyth_executionUnitPrice` — native execution-unit price in lythoshi. */
  async lythExecutionUnitPrice(): Promise<ExecutionUnitPriceResponse> {
    return normalizeExecutionUnitPriceResponse(
      await this.call<unknown>("lyth_executionUnitPrice", []),
    );
  }

  /** `lyth_peerSummary` — public-safe aggregate peer-network diagnostics. */
  async lythPeerSummary(): Promise<PeerSummaryAggregate> {
    return this.call("lyth_peerSummary", []);
  }

  /** `lyth_listActivePrecompiles` — native precompile catalogue. */
  async lythListActivePrecompiles(
    block: BlockSelector = "latest",
  ): Promise<PrecompileCatalogueResponse> {
    return this.call("lyth_listActivePrecompiles", [encodeBlockSelector(block)]);
  }

  /** `lyth_capabilities` — address-keyed precompile capability map. */
  async lythCapabilities(block?: BlockSelector): Promise<CapabilitiesResponse> {
    const params = block === undefined ? [] : [encodeBlockSelector(block)];
    return normalizeCapabilitiesResponse(
      await this.call<CapabilitiesResponse>("lyth_capabilities", params),
    );
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
    const userWallet = sdkTypedAddress(wallet, "user", "wallet");
    const params =
      block === undefined ? [userWallet] : [userWallet, encodeBlockSelector(block)];
    return this.call("lyth_getDelegations", params);
  }

  /** `lyth_pendingRewards` — wallet pending rewards at a block. */
  async lythPendingRewards(
    wallet: string,
    block?: BlockSelector,
  ): Promise<PendingRewardsResponse> {
    const userWallet = sdkTypedAddress(wallet, "user", "wallet");
    const params =
      block === undefined ? [userWallet] : [userWallet, encodeBlockSelector(block)];
    return this.call("lyth_pendingRewards", params);
  }

  /** `lyth_redemptionQueue` — wallet redemption tickets at a block. */
  async lythRedemptionQueue(
    wallet: string,
    block?: BlockSelector,
  ): Promise<RedemptionQueueResponse> {
    const userWallet = sdkTypedAddress(wallet, "user", "wallet");
    const params =
      block === undefined ? [userWallet] : [userWallet, encodeBlockSelector(block)];
    return this.call("lyth_redemptionQueue", params);
  }

  /** `lyth_getDelegationHistory` — indexed per-wallet delegation event timeline. */
  async lythGetDelegationHistory(
    wallet: string,
    limit = 50,
    cursor?: string | null,
  ): Promise<DelegationHistoryRecord[]> {
    const userWallet = sdkTypedAddress(wallet, "user", "wallet");
    const params = cursor === undefined ? [userWallet, limit] : [userWallet, limit, cursor];
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

  // --- PF-4 / PF-6 / MB-6 / MB-4 / MB-2 + operator-router read wrappers ----
  //
  // Reconciled against the FINAL mono-core RPC surface (master 2eff9fed):
  // every method name + response shape below matches the chain's `lyth_*`
  // dispatch + impls exactly (camelCase keys, 0x-hex uint256 amounts,
  // bech32m addresses). The three indexer-backed methods —
  // `lyth_oracleSigners`, `lyth_listProofRequests`, `lyth_proverMarketStatus`
  // — return a graceful `{ status: "indexer_unavailable", … }` envelope
  // when the node runs without its indexer projection.

  /** PF-4 — `lyth_getSpendingPolicy`: the §18.8 spending-policy view for a sub-account. */
  async lythGetSpendingPolicy(subAccount: string): Promise<SpendingPolicyView> {
    return this.call("lyth_getSpendingPolicy", [sdkTypedAddress(subAccount, "user", "subAccount")]);
  }

  /** PF-6 — `lyth_getClusterDiversity`: diversity score + asn/geo/hosting breakdown. */
  async lythGetClusterDiversity(clusterId: number): Promise<ClusterDiversityView> {
    return this.call("lyth_getClusterDiversity", [clusterId]);
  }

  /**
   * PF-6 — `lyth_getOperatorNetworkMetadata`: ASN/geo/hosting-class/IP/PCR
   * for a peer. `operatorId` is the 32-byte operator/peer id as `0x…` hex
   * (the form `lyth_operatorInfo` returns).
   */
  async lythGetOperatorNetworkMetadata(operatorId: string): Promise<OperatorNetworkMetadataView> {
    return this.call("lyth_getOperatorNetworkMetadata", [operatorId]);
  }

  /**
   * MB-6 — `lyth_oracleSigners`: the global oracle writer roster (folded
   * from `OracleWriterAdded` / `OracleWriterRemoved`). Returns the
   * `{ status: "indexer_unavailable", writers: [] }` fallback when the
   * node runs without the oracle writer-roster indexer projection.
   */
  async lythOracleSigners(): Promise<OracleSignersResponse> {
    return this.call("lyth_oracleSigners", []);
  }

  /** MB-6 — `lyth_oracleWriters`: the allowed writer set for a feed. */
  async lythOracleWriters(feedId: string): Promise<OracleWriters> {
    return this.call("lyth_oracleWriters", [feedId]);
  }

  /** MB-6 — `lyth_oracleLatestPrice`: the latest finalized median for a feed. */
  async lythOracleLatestPrice(feedId: string): Promise<OracleLatestPrice> {
    return this.call("lyth_oracleLatestPrice", [feedId]);
  }

  /** MB-6 — `lyth_oracleFeedConfig`: a feed's decimals / min-signers / circuit-breaker config. */
  async lythOracleFeedConfig(feedId: string): Promise<OracleFeedConfig> {
    return this.call("lyth_oracleFeedConfig", [feedId]);
  }

  /** MB-4 — `lyth_getProofRequest`: a single GPU prover-market proof request. */
  async lythGetProofRequest(requestId: string): Promise<ProofRequestView> {
    return this.call("lyth_getProofRequest", [requestId]);
  }

  /**
   * MB-4 — `lyth_listProofRequests`: open/recent prover-market proof
   * requests. Params are `[stateFilter?, limit?]` (the chain's order),
   * where `stateFilter` is one of `open|assigned|settled|slashed|expired`.
   * Returns the `{ status: "indexer_unavailable", requests: [] }` fallback
   * when the node runs without the prover-market indexer projection.
   */
  async lythListProofRequests(
    stateFilter?: string | null,
    limit?: number,
  ): Promise<ListProofRequestsResponse> {
    const params: unknown[] = [];
    if (stateFilter != null || limit != null) params.push(stateFilter ?? null);
    if (limit != null) params.push(limit);
    return this.call("lyth_listProofRequests", params);
  }

  /** MB-4 — `lyth_getProverBids`: the fee bids placed on one proof request. */
  async lythGetProverBids(requestId: string): Promise<ProverBidsResponse> {
    return this.call("lyth_getProverBids", [requestId]);
  }

  /**
   * MB-4 — `lyth_proverMarketStatus`: prover-market summary. `feeFloor` is
   * always present (on-chain genesis singleton); the aggregate counts are
   * `null` on the `{ status: "indexer_unavailable" }` fallback path.
   */
  async lythProverMarketStatus(): Promise<ProverMarketStatusResponse> {
    return this.call("lyth_proverMarketStatus", []);
  }

  /**
   * Operator-router — `lyth_operatorRouterConfig`: the router's static
   * posture (`0x100B` address, the protocol fee ceiling, and whether the
   * gateable router precompile is currently milestone-activated).
   */
  async lythOperatorRouterConfig(): Promise<OperatorRouterConfig> {
    return this.call("lyth_operatorRouterConfig", []);
  }

  /**
   * Operator-router — `lyth_operatorFeeConfig`: one operator's fee
   * registration (recipient, fee bps, enabled flag, registered-at block).
   * `operator` is a `mono` bech32m user address.
   */
  async lythOperatorFeeConfig(operator: string): Promise<OperatorFeeConfig> {
    return this.call("lyth_operatorFeeConfig", [sdkTypedAddress(operator, "user", "operator")]);
  }

  /**
   * MB-2 — `lyth_bridgeHealth`: a paged set of bridge-record health
   * envelopes. Each record carries the circuit-breaker posture
   * (`defaultDrainCapPerWindow`, `defaultDrainWindowBlocks`, `paused`,
   * `pausedAtBlock`, `resumeCooldownBlocks`). Params are `[cursor?, limit?]`
   * (the chain pages the global bridge set; there is no single-bridge form).
   */
  async lythBridgeHealth(cursor?: string | null, limit?: number): Promise<BridgeHealthResponse> {
    const params: unknown[] = [];
    if (cursor != null || limit != null) params.push(cursor ?? null);
    if (limit != null) params.push(limit);
    return this.call("lyth_bridgeHealth", params);
  }

  /**
   * MB-2 — `lyth_bridgeDrainStatus`: the live per-route circuit-breaker
   * drain bucket for one `(bridgeId, wrappedAsset)` route. `bridgeId` is a
   * 32-byte `0x…` hex id; `wrappedAsset` is a `mono` bech32m user address.
   */
  async lythBridgeDrainStatus(bridgeId: string, wrappedAsset: string): Promise<BridgeDrainStatus> {
    return this.call("lyth_bridgeDrainStatus", [
      bridgeId,
      sdkTypedAddress(wrappedAsset, "user", "wrappedAsset"),
    ]);
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

  /** `lyth_getRoundCertificate` — round-advancement certificate. */
  async lythGetRoundCertificate(round: number | bigint | string): Promise<RoundCertificateResponse | null> {
    return this.call("lyth_getRoundCertificate", [encodeRpcInteger(round)]);
  }

  /** @deprecated Use lythGetRoundCertificate. */
  async lythGetBlsRoundCertificate(round: number | bigint | string): Promise<RoundCertificateResponse | null> {
    return this.lythGetRoundCertificate(round);
  }

  /** `lyth_getLeaderCertificate` — leader-vote certificate for a block ref. */
  async lythGetLeaderCertificate(
    round: number | bigint | string,
    authority: number,
    digest: string,
  ): Promise<RoundCertificateResponse | null> {
    return this.call("lyth_getLeaderCertificate", [encodeRpcInteger(round), authority, digest]);
  }

  /** `lyth_getDacCertificate` — data-availability certificate for a block ref. */
  async lythGetDacCertificate(
    round: number | bigint | string,
    authority: number,
    digest: string,
  ): Promise<RoundCertificateResponse | null> {
    return this.call("lyth_getDacCertificate", [encodeRpcInteger(round), authority, digest]);
  }

  /** `lyth_subscribe` — WebSocket-only; returns an RPC error over HTTP. */
  async lythSubscribe(channel: ApiStreamTopic | (string & {})): Promise<unknown> {
    return this.call("lyth_subscribe", [channel]);
  }

  /** `lyth_unsubscribe` — counterpart to `lythSubscribe`. */
  async lythUnsubscribe(subId: string): Promise<unknown> {
    return this.call("lyth_unsubscribe", [subId]);
  }

  // ---- debug_* ------------------------------------------------------
  // Server-side gated by `RpcConfig::debug_enabled`. When the namespace
  // is disabled, every call surfaces as `SdkError.rpc`.

  /** `debug_traceTransaction` — legacy compatibility trace for a confirmed tx. */
  async debugTraceTransaction(txHash: string): Promise<unknown> {
    return this.call("debug_traceTransaction", [txHash]);
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

  // ---- lyth_* additions (R15 / wallet + monoscan surfaces) -----------

  /**
   * `lyth_clusterApr` — observed APR for a cluster over a rolling window.
   * `windowBlocks` defaults to the chain's 1200-block (~1h) window and is
   * server-clamped to `[10, 86_400]`.
   */
  async lythClusterApr(clusterId: number, windowBlocks?: number): Promise<ClusterAprResponse> {
    const params = windowBlocks === undefined ? [clusterId] : [clusterId, windowBlocks];
    return normalizeClusterApr(await this.call("lyth_clusterApr", params));
  }

  /** `lyth_resolveName` — forward name → address resolution (0x110E). */
  async lythResolveName(name: string, block: BlockSelector = "latest"): Promise<ResolveNameResponse> {
    return this.call("lyth_resolveName", [name, encodeBlockSelector(block)]);
  }

  /** `lyth_nameOf` — reverse address → name resolution. */
  async lythNameOf(address: string, block: BlockSelector = "latest"): Promise<NameOfResponse> {
    return this.call("lyth_nameOf", [sdkTypedAddress(address, "user", "address"), encodeBlockSelector(block)]);
  }

  /** `lyth_getClusterName` — reverse cluster id → canonical name. */
  async lythGetClusterName(clusterId: number, block: BlockSelector = "latest"): Promise<ClusterNameResponse> {
    return this.call("lyth_getClusterName", [clusterId, encodeBlockSelector(block)]);
  }

  /**
   * Convenience over {@link lythResolveName}: `true` when a well-formed
   * name is unregistered. A malformed name throws `RpcError`
   * (`InvalidParams`) rather than returning `true`, so the UI should treat
   * a thrown validation error distinctly from "taken".
   */
  async lythIsNameAvailable(name: string, block: BlockSelector = "latest"): Promise<boolean> {
    const resolved = await this.lythResolveName(name, block);
    return resolved.address === null;
  }

  /**
   * Live name-registration quote: parses the name's category + primary
   * label length, reads the chain's base fee unit via `eth_feeHistory`
   * (the bare `baseFeePerGas` — NOT `eth_gasPrice`, which adds the tip and
   * would over-quote), and applies the U-curve. The resulting
   * `costLythoshi` is what the `register` tx `value` must equal exactly
   * (else the precompile reverts `IncorrectFee`).
   */
  async quoteNameRegistration(
    name: string,
    block: BlockSelector = "latest",
  ): Promise<NameRegistrationQuote> {
    const parsed = parseNameCategory(name);
    const history = await this.ethFeeHistory(1, block, []);
    const baseFees = history.baseFeePerGas ?? [];
    const lastHex = baseFees.length > 0 ? baseFees[baseFees.length - 1] : "0x0";
    const baseFee = parseQuantityBig(lastHex);
    const feeUnitLythoshi = baseFee > 0n ? baseFee : NAME_FALLBACK_FEE_UNIT_LYTHOSHI;
    return {
      name,
      category: parsed.category,
      primaryLabelLen: parsed.primaryLabelLen,
      feeUnitLythoshi,
      costLythoshi: nameRegistrationCost(parsed.category, parsed.primaryLabelLen, feeUnitLythoshi),
    };
  }

  /** `lyth_circulatingSupply` — native LYTH circulating / initial / burned (decimal lythoshi strings). */
  async lythCirculatingSupply(): Promise<CirculatingSupplyResponse> {
    return this.call("lyth_circulatingSupply", []);
  }

  /** `lyth_totalBurned` — cumulative burned native LYTH (decimal lythoshi string). */
  async lythTotalBurned(): Promise<TotalBurnedResponse> {
    return this.call("lyth_totalBurned", []);
  }

  /** `lyth_totalMinted` — cumulative minted native LYTH from block rewards (decimal lythoshi string, H1/#60). */
  async lythTotalMinted(): Promise<TotalMintedResponse> {
    return this.call("lyth_totalMinted", []);
  }

  /** `lyth_totalSupply` — authoritative supply accounting: `{ initial, minted, burned, current }` (H1/#60). */
  async lythTotalSupply(): Promise<TotalSupplyResponse> {
    return this.call("lyth_totalSupply", []);
  }

  /** `lyth_swapIntentStatus` — bridge swap-intent / DKG-reshare lifecycle for one intent id. */
  async lythSwapIntentStatus(intentId: number | bigint | string): Promise<SwapIntentStatus> {
    // The chain accepts a JSON number, a `0x`-hex string, OR a decimal
    // string (parse_u64_maybe_hex). Ids are capped at 2^56-1, beyond JS
    // safe-int, so a bigint (or decimal string) is normalized to `0x`-hex
    // to avoid precision loss in transit.
    let id: number | string;
    if (typeof intentId === "number") {
      id = intentId;
    } else if (typeof intentId === "bigint") {
      id = `0x${intentId.toString(16)}`;
    } else if (intentId.startsWith("0x") || intentId.startsWith("0X")) {
      id = intentId;
    } else {
      id = `0x${BigInt(intentId).toString(16)}`;
    }
    return this.call("lyth_swapIntentStatus", [id]);
  }

  /**
   * Per-tx confirmation depth, derived from `lyth_txStatus` (which returns
   * both the tx's `blockNumber` and the node `latestHeight`).
   */
  async lythTxConfirmations(txHash: string): Promise<TxConfirmations> {
    const status = await this.lythTxStatus(txHash);
    if (status.status === "found") {
      return {
        status: "found",
        confirmations: status.latestHeight - status.blockNumber + 1,
        blockNumber: status.blockNumber,
        latestHeight: status.latestHeight,
      };
    }
    return {
      status: "not_found",
      confirmations: null,
      blockNumber: null,
      latestHeight: status.latestHeight,
    };
  }

  /**
   * Resolve a user-pasted MRC token id to its metadata (name/symbol/
   * decimals), for an "add custom token" flow. Returns `null` for an
   * unknown/untracked id. Performs light client-side format validation
   * (32-byte hex) for fast UX feedback; the chain re-validates regardless.
   */
  async lythResolveTokenMetadata(rawTokenId: string): Promise<MrcMetadataRecord | null> {
    const body = rawTokenId.startsWith("0x") || rawTokenId.startsWith("0X")
      ? rawTokenId.slice(2)
      : rawTokenId;
    if (!/^[0-9a-fA-F]{64}$/.test(body)) {
      throw SdkError.malformed("token id must be 32 bytes (64 hex chars)");
    }
    return (await this.lythMrcMetadata(rawTokenId)).metadata;
  }

  /**
   * `lyth_getTokenBalances` joined with per-token MRC metadata. Balances
   * are PUBLIC-only by construction (private-denomination balances are
   * excluded by the chain). Raw `balance` strings are preserved (apply
   * `metadata.decimals` client-side for display).
   */
  async lythGetTokenBalancesWithMetadata(address: string): Promise<TokenBalanceWithMetadata[]> {
    const rows = await this.lythGetTokenBalances(address);
    const keyFor = (row: TokenBalanceRecord): { assetId: string; tokenId: string | null; key: string } => {
      const assetId = row.mrc?.assetId ?? row.tokenId;
      const tokenId = row.mrc?.tokenId ?? null;
      return { assetId, tokenId, key: `${assetId}:${tokenId ?? ""}` };
    };
    const distinct = new Map<string, { assetId: string; tokenId: string | null }>();
    for (const row of rows) {
      const k = keyFor(row);
      if (!distinct.has(k.key)) distinct.set(k.key, { assetId: k.assetId, tokenId: k.tokenId });
    }
    const metaByKey = new Map<string, MrcMetadataRecord | null>();
    await Promise.all(
      [...distinct.entries()].map(async ([key, { assetId, tokenId }]) => {
        const resp = await this.lythMrcMetadata(assetId, tokenId);
        metaByKey.set(key, resp.metadata);
      }),
    );
    return rows.map((row) => ({ ...row, metadata: metaByKey.get(keyFor(row).key) ?? null }));
  }

  /**
   * Resolve a CLOB market's base/quote asset metadata (symbol/name/
   * decimals) by joining `lyth_clobMarket` to `lyth_mrcMetadata`. Either
   * side may be `null` when the indexer has no MRC row (e.g. native LYTH).
   */
  async resolveClobMarketAssets(marketId: string): Promise<ClobMarketAssets> {
    const response = await this.lythClobMarket(marketId);
    const market = response.market;
    if (!market) return { base: null, quote: null };
    const [base, quote] = await Promise.all([
      this.lythMrcMetadata(market.baseToken).then((m) => m.metadata),
      this.lythMrcMetadata(market.quoteToken).then((m) => m.metadata),
    ]);
    return { base, quote };
  }

  /**
   * `lyth_getAddressActivity` enriched with each row's block timestamp,
   * canonical tx hash (resolved from `(blockHeight, txIndex)`), and
   * resolved cluster name. Issues one block read per distinct height and
   * one name read per distinct cluster.
   */
  async enrichAddressActivity(
    address: string,
    limit = 50,
    cursor?: string | null,
  ): Promise<AddressActivityEntryEnriched[]> {
    const entries = await this.lythGetAddressActivity(address, limit, cursor);
    // `blockHeight` is typed bigint but arrives as a JSON number (no bigint
    // reviver in call()); coerce so keying is consistent at runtime.
    const heights = [...new Set(entries.map((entry) => BigInt(entry.blockHeight)))];
    const blockByHeight = new Map<bigint, { timestampSeconds: bigint | null; txHashes: string[] }>();
    await Promise.all(
      heights.map(async (height) => {
        blockByHeight.set(height, await this.blockTimeAndTxHashes(height));
      }),
    );
    const clusters = [
      ...new Set(entries.map((entry) => entry.cluster).filter((c): c is number => c != null)),
    ];
    const nameByCluster = new Map<number, string | null>();
    await Promise.all(
      clusters.map(async (clusterId) => {
        nameByCluster.set(clusterId, (await this.lythGetClusterName(clusterId)).name);
      }),
    );
    return entries.map((entry) => {
      const block = blockByHeight.get(BigInt(entry.blockHeight));
      const txHash =
        block && entry.txIndex >= 0 && entry.txIndex < block.txHashes.length
          ? block.txHashes[entry.txIndex]
          : null;
      return {
        ...entry,
        blockTimestampSeconds: block?.timestampSeconds ?? null,
        txHash,
        clusterName: entry.cluster != null ? nameByCluster.get(entry.cluster) ?? null : null,
      };
    });
  }

  /**
   * Read a block's header timestamp (UNIX seconds) and ordered tx-hash
   * array via the raw `eth_getBlockByNumber` (hash-only mode). The typed
   * `ethGetBlockByNumber` wrapper drops the `transactions` array, so this
   * uses the raw call.
   */
  private async blockTimeAndTxHashes(
    height: bigint,
  ): Promise<{ timestampSeconds: bigint | null; txHashes: string[] }> {
    const hexHeight = `0x${height.toString(16)}`;
    const raw = await this.call<Record<string, unknown> | null>("eth_getBlockByNumber", [
      hexHeight,
      false,
    ]);
    if (!raw || typeof raw !== "object") return { timestampSeconds: null, txHashes: [] };
    const ts = raw["timestamp"];
    const timestampSeconds =
      ts === null || ts === undefined ? null : parseRpcBigint(ts, "block timestamp");
    const txs = raw["transactions"];
    const txHashes = Array.isArray(txs) ? txs.filter((t): t is string => typeof t === "string") : [];
    return { timestampSeconds, txHashes };
  }
}

/**
 * Annualized cluster yield as a percentage, from a {@link ClusterAprResponse}
 * (`aprBps / 100`; 10_000 bps = 100%). Safe for realistic basis-point
 * magnitudes.
 */
export function clusterApyPercent(apr: ClusterAprResponse): number {
  return Number(apr.aprBps) / 100;
}

/**
 * Quote-notional liquidity from a CLOB order book: `sum(price * size)`
 * over each side, in raw quote atomic units (decimal strings). Apply the
 * quote asset's decimals client-side for display.
 */
export function computeQuoteLiquidity(book: ClobOrderBookResponse): QuoteLiquidity {
  const sumQuote = (levels: ReadonlyArray<{ price: string; size: string }>): bigint =>
    levels.reduce((acc, level) => acc + BigInt(level.price) * BigInt(level.size), 0n);
  const bidQuote = sumQuote(book.bids);
  const askQuote = sumQuote(book.asks);
  return {
    bidQuote: bidQuote.toString(10),
    askQuote: askQuote.toString(10),
    totalQuote: (bidQuote + askQuote).toString(10),
  };
}

/**
 * Rank CLOB markets by total base volume (descending), assigning a 1-based
 * `volumeRank`. Ranks the supplied set only (e.g. the ≤100 markets
 * `lyth_clobMarkets` returns); volume is base atomic units, not
 * quote-normalized.
 */
export function rankMarketsByVolume(
  markets: ReadonlyArray<ClobMarketSummary>,
): Array<ClobMarketSummary & { volumeRank: number }> {
  return [...markets]
    .sort((a, b) => {
      const av = BigInt(a.totalVolumeBase);
      const bv = BigInt(b.totalVolumeBase);
      return av < bv ? 1 : av > bv ? -1 : 0;
    })
    .map((market, index) => ({ ...market, volumeRank: index + 1 }));
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

function parseStringField(value: unknown, label: string): string {
  if (value === null || value === undefined) {
    throw SdkError.malformed(`${label} is missing`);
  }
  return String(value);
}

function parseBooleanField(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw SdkError.malformed(`${label} must be a boolean`);
  }
  return value;
}

function parseRpcUint(value: unknown, label: string, max: number, typeName: string): number {
  const parsed = parseRpcNumber(value, label);
  if (parsed > max) {
    throw SdkError.malformed(`${label} must be a ${typeName}`);
  }
  return parsed;
}

function parseRpcUintNullable(
  value: unknown,
  label: string,
  max: number,
  typeName: string,
): number | null {
  return value === null || value === undefined ? null : parseRpcUint(value, label, max, typeName);
}

function decodeNativeAgentStateArray<T>(
  row: Record<string, unknown>,
  key: string,
  decode: (value: unknown, label: string) => T,
  defaultMissing: boolean,
): T[] {
  const value = row[key];
  if (value === undefined && defaultMissing) return [];
  if (!Array.isArray(value)) {
    throw SdkError.malformed(`native agent state ${key} must be an array`);
  }
  return value.map((item, index) => decode(item, `native agent state ${key}[${index}]`));
}

function decodeNativeAgentExistingStateRecord<T>(value: unknown, label: string): T {
  return expectObject(value, label) as unknown as T;
}

function decodeNativeAgentIssuerStateRecord(
  value: unknown,
  label: string,
): NativeAgentIssuerStateRecord {
  const row = expectObject(value, label);
  return {
    issuerId: parseStringField(row["issuerId"], `${label}.issuerId`),
    issuer: parseStringField(row["issuer"], `${label}.issuer`),
    nonce: parseRpcNumberNullable(row["nonce"], `${label}.nonce`),
    metadataHash: parseStringNullable(row["metadataHash"]),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`),
  };
}

function decodeNativeAgentAttestationStateRecord(
  value: unknown,
  label: string,
): NativeAgentAttestationStateRecord {
  const row = expectObject(value, label);
  return {
    attestationId: parseStringField(row["attestationId"], `${label}.attestationId`),
    nonce: parseRpcNumberNullable(row["nonce"], `${label}.nonce`),
    issuerId: parseStringNullable(row["issuerId"]),
    issuer: parseStringNullable(row["issuer"]),
    subject: parseStringField(row["subject"], `${label}.subject`),
    schemaHash: parseStringNullable(row["schemaHash"]),
    payloadHash: parseStringNullable(row["payloadHash"]),
    active: parseBooleanField(row["active"], `${label}.active`),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`),
  };
}

function decodeNativeAgentConsentStateRecord(
  value: unknown,
  label: string,
): NativeAgentConsentStateRecord {
  const row = expectObject(value, label);
  return {
    consentId: parseStringField(row["consentId"], `${label}.consentId`),
    subject: parseStringField(row["subject"], `${label}.subject`),
    grantee: parseStringField(row["grantee"], `${label}.grantee`),
    nonce: parseRpcNumberNullable(row["nonce"], `${label}.nonce`),
    scopeHash: parseStringNullable(row["scopeHash"]),
    expiresAt: parseRpcNumberNullable(row["expiresAt"], `${label}.expiresAt`),
    active: parseBooleanField(row["active"], `${label}.active`),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`),
  };
}

function decodeNativeAgentServiceStateRecord(
  value: unknown,
  label: string,
): NativeAgentServiceStateRecord {
  const row = expectObject(value, label);
  return {
    serviceId: parseStringField(row["serviceId"], `${label}.serviceId`),
    provider: parseStringField(row["provider"], `${label}.provider`),
    nonce: parseRpcNumberNullable(row["nonce"], `${label}.nonce`),
    categoryHash: parseStringNullable(row["categoryHash"]),
    metadataHash: parseStringNullable(row["metadataHash"]),
    active: parseBooleanField(row["active"], `${label}.active`),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`),
  };
}

function decodeNativeAgentAvailabilityStateRecord(
  value: unknown,
  label: string,
): NativeAgentAvailabilityStateRecord {
  const row = expectObject(value, label);
  return {
    provider: parseStringField(row["provider"], `${label}.provider`),
    maxConcurrent: parseRpcUint(row["maxConcurrent"], `${label}.maxConcurrent`, 0xffffffff, "uint32"),
    openRequests: parseRpcUint(row["openRequests"], `${label}.openRequests`, 0xffffffff, "uint32"),
    paused: parseBooleanField(row["paused"], `${label}.paused`),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`),
  };
}

function decodeNativeAgentArbiterStateRecord(
  value: unknown,
  label: string,
): NativeAgentArbiterStateRecord {
  const row = expectObject(value, label);
  return {
    arbiterId: parseStringField(row["arbiterId"], `${label}.arbiterId`),
    arbiter: parseStringField(row["arbiter"], `${label}.arbiter`),
    nonce: parseRpcNumberNullable(row["nonce"], `${label}.nonce`),
    tier: parseRpcUintNullable(row["tier"], `${label}.tier`, 0xffff, "uint16"),
    metadataHash: parseStringNullable(row["metadataHash"]),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`),
  };
}

function decodeNativeAgentReputationReviewStateRecord(
  value: unknown,
  label: string,
): NativeAgentReputationReviewStateRecord {
  const row = expectObject(value, label);
  return {
    reviewId: parseStringField(row["reviewId"], `${label}.reviewId`),
    reviewer: parseStringField(row["reviewer"], `${label}.reviewer`),
    subject: parseStringField(row["subject"], `${label}.subject`),
    categoryId: parseRpcUint(row["categoryId"], `${label}.categoryId`, 0xffffffff, "uint32"),
    speedScore: parseRpcUint(row["speedScore"], `${label}.speedScore`, 0xff, "uint8"),
    qualityScore: parseRpcUint(row["qualityScore"], `${label}.qualityScore`, 0xff, "uint8"),
    communicationScore: parseRpcUint(
      row["communicationScore"],
      `${label}.communicationScore`,
      0xff,
      "uint8",
    ),
    accuracyScore: parseRpcUint(row["accuracyScore"], `${label}.accuracyScore`, 0xff, "uint8"),
    payloadHash: parseStringNullable(row["payloadHash"]),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`),
  };
}

function expectObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw SdkError.malformed(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function decodeNativeReceiptResponse<TDecoded = unknown>(
  value: unknown,
): NativeReceiptResponse<TDecoded> {
  const row = expectObject(value, "native receipt response");
  assertNativeReceiptFee(row["fee"], "native receipt response.fee");
  return value as NativeReceiptResponse<TDecoded>;
}

export function decodeTxFeedResponse(value: unknown): TxFeedResponse {
  const row = expectObject(value, "tx feed response");
  const transactions = row["transactions"];
  if (!Array.isArray(transactions)) {
    throw SdkError.malformed("tx feed response.transactions must be an array");
  }
  transactions.forEach((transaction, index) => {
    const tx = expectObject(transaction, `tx feed response.transactions[${index}]`);
    assertNativeReceiptFee(tx["fee"], `tx feed response.transactions[${index}].fee`);
  });
  return value as TxFeedResponse;
}

function assertNativeReceiptFee(value: unknown, label: string): asserts value is NativeReceiptFee {
  try {
    assertMrvStructuredFeeConformance(value, { label });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw SdkError.malformed(`structured native fee violation: ${message}`);
  }
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
    consensusKeyFingerprint: parseStringNullable(
      row["consensusKeyFingerprint"] ?? row["blsKeyFingerprint"],
    ),
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
    consensusPubkey: String(row["consensusPubkey"] ?? row["blsPubkey"]),
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
    consensusPubkey: String(row["consensusPubkey"] ?? row["blsPubkey"]),
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

export function nativeAgentStateFilterParams(
  filter: NativeAgentStateFilter,
): Record<string, NativeAgentStateFilterParamValue> {
  const out: Record<string, NativeAgentStateFilterParamValue> = {};
  if (filter.policyId != null) out.policyId = filter.policyId;
  if (filter.escrowId != null) out.escrowId = filter.escrowId;
  if (filter.account != null) out.account = filter.account;
  if (filter.includePolicySpends != null) out.includePolicySpends = filter.includePolicySpends;
  if (filter.limit != null) out.limit = encodeRpcU64Number(filter.limit, "limit");
  return out;
}

export function decodeNativeAgentStateResponse(value: unknown): NativeAgentStateResponse {
  const row = expectObject(value, "native agent state response");
  return {
    schemaVersion: parseRpcNumber(row["schemaVersion"], "native agent state schemaVersion"),
    limit: parseRpcNumber(row["limit"], "native agent state limit"),
    filters: expectObject(
      row["filters"],
      "native agent state filters",
    ) as unknown as NativeAgentStateResponseFilters,
    issuers: decodeNativeAgentStateArray(
      row,
      "issuers",
      decodeNativeAgentIssuerStateRecord,
      true,
    ),
    attestations: decodeNativeAgentStateArray(
      row,
      "attestations",
      decodeNativeAgentAttestationStateRecord,
      true,
    ),
    consents: decodeNativeAgentStateArray(
      row,
      "consents",
      decodeNativeAgentConsentStateRecord,
      true,
    ),
    services: decodeNativeAgentStateArray(
      row,
      "services",
      decodeNativeAgentServiceStateRecord,
      true,
    ),
    availability: decodeNativeAgentStateArray(
      row,
      "availability",
      decodeNativeAgentAvailabilityStateRecord,
      true,
    ),
    arbiters: decodeNativeAgentStateArray(
      row,
      "arbiters",
      decodeNativeAgentArbiterStateRecord,
      true,
    ),
    reputationReviews: decodeNativeAgentStateArray(
      row,
      "reputationReviews",
      decodeNativeAgentReputationReviewStateRecord,
      true,
    ),
    spendingPolicies: decodeNativeAgentStateArray(
      row,
      "spendingPolicies",
      decodeNativeAgentExistingStateRecord<NativeAgentPolicyStateRecord>,
      false,
    ),
    policySpends: decodeNativeAgentStateArray(
      row,
      "policySpends",
      decodeNativeAgentExistingStateRecord<NativeAgentPolicySpendStateRecord>,
      false,
    ),
    escrows: decodeNativeAgentStateArray(
      row,
      "escrows",
      decodeNativeAgentExistingStateRecord<NativeAgentEscrowStateRecord>,
      false,
    ),
    source: expectObject(
      row["source"],
      "native agent state source",
    ) as unknown as NativeAgentStateSource,
  };
}

export function nativeMarketStateFilterParams(
  filter: NativeMarketStateFilter,
): Record<string, NativeMarketStateFilterParamValue> {
  const out: Record<string, NativeMarketStateFilterParamValue> = {};
  if (filter.marketId != null) out.marketId = filter.marketId;
  if (filter.orderId != null) out.orderId = filter.orderId;
  if (filter.listingId != null) out.listingId = filter.listingId;
  if (filter.collectionId != null) out.collectionId = filter.collectionId;
  if (filter.account != null) out.account = filter.account;
  if (filter.includeSpotOrders != null) out.includeSpotOrders = filter.includeSpotOrders;
  if (filter.limit != null) out.limit = encodeRpcU64Number(filter.limit, "limit");
  return out;
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

function sdkTypedAddress(address: string, kind: AddressKind, label: string): string {
  try {
    return requireTypedAddress(address, kind, label);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw SdkError.malformed(message);
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

function normalizeClusterApr(value: unknown): ClusterAprResponse {
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("cluster apr must be an object");
  }
  const row = value as Record<string, unknown>;
  const blocks = (row["blocks"] ?? {}) as Record<string, unknown>;
  return {
    clusterId: parseRpcNumber(row["clusterId"], "clusterId"),
    blocks: {
      from: parseRpcBigint(blocks["from"], "blocks.from"),
      to: parseRpcBigint(blocks["to"], "blocks.to"),
      window: parseRpcBigint(blocks["window"], "blocks.window"),
    },
    rewardIndexFromHex: parseStringField(row["rewardIndexFromHex"], "rewardIndexFromHex"),
    rewardIndexToHex: parseStringField(row["rewardIndexToHex"], "rewardIndexToHex"),
    deltaIndexHex: parseStringField(row["deltaIndexHex"], "deltaIndexHex"),
    rewardIndexScale: parseStringField(row["rewardIndexScale"], "rewardIndexScale"),
    totalBps: parseRpcNumber(row["totalBps"], "totalBps"),
    blocksPerYear: parseRpcBigint(row["blocksPerYear"], "blocksPerYear"),
    stakePerBpsLythoshi: parseRpcBigint(row["stakePerBpsLythoshi"], "stakePerBpsLythoshi"),
    aprBps: parseRpcBigint(row["aprBps"], "aprBps"),
  };
}

function normalizeExecutionUnitPriceResponse(value: unknown): ExecutionUnitPriceResponse {
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("execution unit price response must be an object");
  }
  const row = value as Record<string, unknown>;
  return {
    executionUnitPriceLythoshi: parseRpcBigint(
      fieldAlias(row, ["executionUnitPriceLythoshi", "execution_unit_price_lythoshi"]),
      "executionUnitPriceLythoshi",
    ).toString(),
    basePricePerExecutionUnitLythoshi: parseRpcBigint(
      fieldAlias(row, [
        "basePricePerExecutionUnitLythoshi",
        "base_price_per_execution_unit_lythoshi",
      ]),
      "basePricePerExecutionUnitLythoshi",
    ).toString(),
    priorityTipLythoshi: parseRpcBigint(
      fieldAlias(row, ["priorityTipLythoshi", "priority_tip_lythoshi"]),
      "priorityTipLythoshi",
    ).toString(),
    blockNumber: parseRpcNumberNullable(
      fieldAlias(row, ["blockNumber", "block_number"]),
      "blockNumber",
    ),
    source: readStringField(row, ["source"], "execution unit price source"),
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

function fieldAlias(record: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return undefined;
}

function readStringField(
  record: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): string {
  const value = fieldAlias(record, keys);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw SdkError.malformed(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeCapabilitiesResponse(value: CapabilitiesResponse): CapabilitiesResponse {
  return {
    ...value,
    nativeModuleForwarders: value.nativeModuleForwarders ?? {},
  };
}
