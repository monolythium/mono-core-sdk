/**
 * Typed HTTP client for the explorer-facing `/api/v1` surface served by
 * `mono-core`.
 *
 * JSON-RPC stays on `RpcClient`; this class is for REST-shaped node API
 * routes used by explorers, wallets, and status pages.
 */

import { SdkError } from "./error.js";
import type { ClobMarketResponse } from "./bindings/ClobMarketResponse.js";
import type { BlockSelector } from "./types.js";
import { encodeBlockSelector } from "./types.js";
import type {
  AddressFlowResponse,
  AddressProfileResponse,
  ChainStatsResponse,
  ClobMarketsResponse,
  ClobOhlcResponse,
  ClobOrderBookResponse,
  ClobTradesResponse,
  OperatorCapabilitiesResponse,
  RuntimeBuildProvenance,
  RuntimeUpgradeStatus,
  SearchResponse,
  ServiceProbeResponse,
  TxFeedResponse,
} from "./client.js";

const SDK_VERSION = "0.1.0";

export interface ApiClientOptions {
  /** Override `fetch`. Useful for tests or non-browser runtimes. */
  fetch?: typeof fetch;
  /** Extra headers to attach to every request. */
  headers?: Record<string, string>;
  /** Explicit `/api/v1` base URL. Defaults to deriving it from the RPC URL. */
  apiBaseUrl?: string;
}

export interface ApiErrorEnvelope {
  schemaVersion?: number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface ApiLatestAnchor {
  available: boolean;
  height?: number;
  blockHash?: string | null;
  stateRoot?: string;
  timestamp?: number;
  error?: {
    code: number;
    message: string;
  };
}

export interface ApiEnvelope<T> {
  schemaVersion: number;
  chainId: number;
  genesisHash: string | null;
  latest: ApiLatestAnchor;
  data: T;
}

export interface ApiHealthResponse {
  schemaVersion: number;
  status: "ok" | "syncing" | string;
  chainId: number;
  latest: ApiLatestAnchor;
  api: {
    enabled: boolean;
    version: string;
  };
}

export interface ApiIndexerStatus {
  enabled: boolean;
  currentHeight?: number;
  latestHeight?: number | null;
  schemaVersion?: number;
  retention?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export interface ApiCapabilitiesResponse {
  schemaVersion: number;
  chainId: number;
  genesisHash: string | null;
  clientVersion: string;
  latest: ApiLatestAnchor;
  api: {
    enabled: boolean;
    version: string;
    docs: string;
    openapi: string;
  };
  jsonRpc: {
    endpoint: string;
    webSocket: string;
    protocolVersion: string;
    debugEnabled: boolean;
  };
  streams: {
    transport: "sse" | string;
    index: string;
    topicEndpoint: string;
    keepAliveSeconds: number;
  };
  indexer: ApiIndexerStatus;
  rateLimit: {
    perIp: {
      ratePerSec: number;
      burst: number;
    };
    apiKeysConfigured: boolean;
    apiKeyOverrideCount: number;
    budgetIdentity: "api_key_or_resolved_client_ip" | string;
    defaultCostBudgetPerMin: number;
    retryAfterHeader: boolean;
    costWeights: {
      api: Record<string, number>;
      jsonRpc: Record<string, number>;
    };
  };
  operatorCapabilities: {
    jsonRpcMethod: "lyth_operatorCapabilities" | string;
    schemaVersion: number | null;
    surfaces: OperatorCapabilitiesResponse["surfaces"];
  };
  accessPolicy: {
    trustedProxy: {
      configured: boolean;
      cidrCount: number;
    };
    clientCidr: {
      unrestricted: boolean;
      allowCidrCount: number;
      denyCidrCount: number;
    };
    paidServiceEligibility: {
      source: "external_probe" | string;
      selfDeclaration: boolean;
    };
  };
}

export interface ApiBlockHeader {
  height: number;
  blockHash: string;
  parentHash: string;
  stateRoot: string;
  timestamp: number;
  gasUsed: number;
  gasLimit: number;
  baseFeePerGas: string;
}

export interface ApiLogEntry {
  address: string;
  topics: string[];
  data: string;
}

export interface ApiTransactionView {
  txHash: string;
  blockHash: string;
  blockHeight: number;
  txIndex: number;
  from: string;
  to: string | null;
  nonce: number;
  value: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  gasLimit: number;
  input: string;
  signedEnvelope: string;
}

export interface ApiTransactionReceipt {
  txHash: string;
  blockHash: string;
  blockHeight: number;
  txIndex: number;
  status: number;
  gasUsed: number;
  logs: ApiLogEntry[];
}

export interface ApiAddressActivityEntry {
  blockHeight: number;
  txIndex: number;
  logIndex: number;
  kind: "transfer" | "swap" | "staking" | "delegation" | string;
  direction: "in" | "out" | string | null;
  counterparty: string | null;
  tokenId: string | null;
  amount: string | null;
  cluster: number | null;
  weightBps: number | null;
  subKind: string | null;
}

export interface ApiBlockData {
  block: ApiBlockHeader;
  transactionCount: number;
  transactionHashes: string[];
  source: { chainProvider: string };
}

export interface ApiBlockTransactionsData {
  block: ApiBlockHeader;
  page: number;
  limit: number;
  totalTransactions: number;
  transactions: ApiTransactionView[];
  source: { chainProvider: string };
}

export interface ApiTransactionData {
  transaction: ApiTransactionView;
  receipt: ApiTransactionReceipt | null;
  source: { chainProvider: string };
}

export interface ApiTransactionReceiptData {
  receipt: ApiTransactionReceipt;
  source: { chainProvider: string };
}

export interface ApiAddressActivityData {
  address: string;
  limit: number;
  entries: ApiAddressActivityEntry[];
  indexer: ApiIndexerStatus;
}

export type ApiAddressActivityKind =
  | "found"
  | "not_found"
  | "indexer_disabled"
  | "pruned"
  | "private"
  | string;

export interface ApiAddressActivityKindSummary {
  kind: ApiAddressActivityKind;
  retention?: unknown;
}

export interface ApiAddressActivityKindData {
  address: string;
  activity: ApiAddressActivityKindSummary;
  indexer: ApiIndexerStatus;
}

export interface ApiClusterDirectoryEntry {
  clusterId: number;
  size: number;
  threshold: number;
  aggregateHealth: string;
  regionDiversity: string[] | null;
  active: boolean;
}

export interface ApiClusterDirectoryPage {
  page: number;
  limit: number;
  totalClusters: number;
  clusters: ApiClusterDirectoryEntry[];
}

export interface ApiClusterMember {
  operatorId: string;
  blsPubkey: string;
  state: string;
}

export interface ApiClusterStatus {
  clusterId: number;
  threshold: number;
  size: number;
  live: number;
  lagging: number;
  offline: number;
  maintenance: number;
  members: ApiClusterMember[];
  epoch: number | null;
  round: number | null;
  quorum: string;
  reputationScore: number | null;
  livenessScore: number | null;
  lastUpdateHeight: number;
}

export interface ApiClustersData {
  clusters: ApiClusterDirectoryPage;
  source: { registryProvider: string };
}

export interface ApiClusterData {
  cluster: ApiClusterStatus;
  source: { registryProvider: string };
}

export interface ApiOperatorInfo {
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

export interface ApiOperatorData {
  operator: ApiOperatorInfo;
  source: { registryProvider: string };
}

export interface ApiServiceProbeData {
  peerId: string;
  serviceMask: number;
  probe: ServiceProbeResponse | null;
  source: { registryProvider: string };
}

export interface ApiUpgradePlanStatus {
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
}

export interface ApiUpgradeStatus {
  blockHeight: number;
  configured: boolean;
  planCount: number;
  active: ApiUpgradePlanStatus | null;
  pending: ApiUpgradePlanStatus[];
}

export interface ApiUpgradeStatusData {
  upgrade: ApiUpgradeStatus;
  source: { chainProvider: string };
}

export interface ApiRuntimeProvenanceData {
  runtime: RuntimeBuildProvenance;
  upgrade: RuntimeUpgradeStatus | null;
  source: { chainProvider: string };
}

export type ApiQueryValue = string | number | bigint | boolean | null | undefined;

export function apiEndpointFromRpcEndpoint(endpoint: string): string {
  const raw = endpoint.trim();
  if (raw.length === 0) {
    throw SdkError.endpoint("endpoint cannot be empty");
  }
  const noTrailing = raw.replace(/\/+$/, "");
  if (noTrailing.endsWith("/api/v1")) {
    return noTrailing;
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(noTrailing)) {
    const url = new URL(noTrailing);
    const path = url.pathname.replace(/\/+$/, "");
    if (path === "" || path === "/" || path === "/rpc") {
      url.pathname = "/api/v1";
    } else if (path.endsWith("/rpc")) {
      url.pathname = `${path.slice(0, -"/rpc".length)}/api/v1`;
    } else {
      url.pathname = "/api/v1";
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  }

  return "/api/v1";
}

export class ApiClient {
  readonly baseUrl: string;
  readonly #fetch: typeof fetch;
  readonly #headers: Record<string, string>;

  constructor(endpoint: string, options: ApiClientOptions = {}) {
    this.baseUrl = (options.apiBaseUrl ?? apiEndpointFromRpcEndpoint(endpoint)).replace(/\/+$/, "");
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#headers = {
      accept: "application/json",
      "user-agent": `monolythium-core-sdk/${SDK_VERSION}`,
      ...(options.headers ?? {}),
    };
  }

  async get<T>(path: string, query: Record<string, ApiQueryValue> = {}): Promise<T> {
    return this.#get<T>(path, query, false);
  }

  async health(): Promise<ApiHealthResponse> {
    return this.#get("/health", {}, true);
  }

  async capabilities(): Promise<ApiCapabilitiesResponse> {
    return this.get("/capabilities");
  }

  async provenance(): Promise<ApiEnvelope<ApiRuntimeProvenanceData>> {
    return this.get("/provenance");
  }

  async search(query: string, limit = 10): Promise<ApiEnvelope<SearchResponse>> {
    return this.get("/search", { q: query, limit });
  }

  async stats(): Promise<ApiEnvelope<ChainStatsResponse>> {
    return this.get("/stats");
  }

  async block(block: BlockSelector = "latest"): Promise<ApiEnvelope<ApiBlockData>> {
    return this.get(`/blocks/${encodePathBlock(block)}`);
  }

  async blockTransactions(
    block: BlockSelector = "latest",
    page = 0,
    limit = 25,
  ): Promise<ApiEnvelope<ApiBlockTransactionsData>> {
    return this.get(`/blocks/${encodePathBlock(block)}/transactions`, { page, limit });
  }

  async transactions(limit = 50, cursor?: string | null): Promise<ApiEnvelope<TxFeedResponse>> {
    return this.get("/transactions", { limit, cursor });
  }

  async transaction(hash: string): Promise<ApiEnvelope<ApiTransactionData>> {
    return this.get(`/transactions/${encodePathSegment(hash)}`);
  }

  async transactionReceipt(hash: string): Promise<ApiEnvelope<ApiTransactionReceiptData>> {
    return this.get(`/transactions/${encodePathSegment(hash)}/receipt`);
  }

  async addressProfile(address: string): Promise<ApiEnvelope<AddressProfileResponse>> {
    return this.get(`/addresses/${encodePathSegment(address)}/profile`);
  }

  async addressFlow(address: string, limit = 250): Promise<ApiEnvelope<AddressFlowResponse>> {
    return this.get(`/addresses/${encodePathSegment(address)}/flow`, { limit });
  }

  async addressActivity(
    address: string,
    limit = 50,
    cursor?: string | null,
  ): Promise<ApiEnvelope<ApiAddressActivityData>> {
    return this.get(`/addresses/${encodePathSegment(address)}/activity`, {
      limit,
      cursor,
    });
  }

  async addressActivityKind(address: string): Promise<ApiEnvelope<ApiAddressActivityKindData>> {
    return this.get(`/addresses/${encodePathSegment(address)}/activity-kind`);
  }

  async clusters(page = 0, limit = 25): Promise<ApiEnvelope<ApiClustersData>> {
    return this.get("/clusters", { page, limit });
  }

  async cluster(clusterId: number): Promise<ApiEnvelope<ApiClusterData>> {
    return this.get(`/clusters/${encodePathSegment(clusterId)}`);
  }

  async operator(operatorId: string): Promise<ApiEnvelope<ApiOperatorData>> {
    return this.get(`/operators/${encodePathSegment(operatorId)}`);
  }

  async serviceProbe(
    peerId: string,
    serviceMask: number | string,
  ): Promise<ApiEnvelope<ApiServiceProbeData>> {
    return this.get(
      `/service-probes/${encodePathSegment(peerId)}/${encodePathSegment(serviceMask)}`,
    );
  }

  async markets(limit = 50): Promise<ApiEnvelope<ClobMarketsResponse>> {
    return this.get("/markets", { limit });
  }

  async market(marketId: string): Promise<ApiEnvelope<ClobMarketResponse>> {
    return this.get(`/markets/${encodePathSegment(marketId)}`);
  }

  async marketTrades(
    marketId: string,
    limit = 50,
    cursor?: string | null,
  ): Promise<ApiEnvelope<ClobTradesResponse>> {
    return this.get(`/markets/${encodePathSegment(marketId)}/trades`, { limit, cursor });
  }

  async marketOhlc(
    marketId: string,
    fromBlock?: number | bigint | null,
    toBlock?: number | bigint | null,
    bucketBlocks?: number | bigint | null,
  ): Promise<ApiEnvelope<ClobOhlcResponse>> {
    return this.get(`/markets/${encodePathSegment(marketId)}/ohlc`, {
      fromBlock,
      toBlock,
      bucketBlocks,
    });
  }

  async marketOrderBook(
    marketId: string,
    levels = 20,
  ): Promise<ApiEnvelope<ClobOrderBookResponse>> {
    return this.get(`/markets/${encodePathSegment(marketId)}/orderbook`, { levels });
  }

  async upgradeStatus(height?: BlockSelector | null): Promise<ApiEnvelope<ApiUpgradeStatusData>> {
    return this.get("/upgrades/status", {
      height: height == null ? undefined : encodeBlockSelector(height),
    });
  }

  async #get<T>(
    path: string,
    query: Record<string, ApiQueryValue>,
    allowUnavailableBody: boolean,
  ): Promise<T> {
    const url = buildUrl(this.baseUrl, path, query);
    let resp: Response;
    try {
      resp = await this.#fetch(url, {
        method: "GET",
        headers: this.#headers,
      });
    } catch (cause) {
      throw SdkError.transport(
        `transport failure calling ${url}: ${(cause as Error)?.message ?? cause}`,
        cause,
      );
    }

    let parsed: unknown;
    try {
      parsed = await resp.json();
    } catch (cause) {
      throw SdkError.malformed(
        `non-JSON response (HTTP ${resp.status}): ${(cause as Error)?.message ?? cause}`,
      );
    }

    const error = parseApiError(parsed);
    if (error) {
      throw SdkError.rpc(error.code, error.message, error.data);
    }
    if (!resp.ok && !(allowUnavailableBody && resp.status === 503)) {
      throw SdkError.transport(`HTTP ${resp.status} calling ${url}`);
    }
    return parsed as T;
  }
}

function parseApiError(value: unknown): ApiErrorEnvelope["error"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const error = (value as Record<string, unknown>)["error"];
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const row = error as Record<string, unknown>;
  if (typeof row["code"] !== "number" || typeof row["message"] !== "string") {
    return null;
  }
  return {
    code: row["code"],
    message: row["message"],
    data: row["data"],
  };
}

function buildUrl(baseUrl: string, path: string, query: Record<string, ApiQueryValue>): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, typeof value === "bigint" ? value.toString() : String(value));
  }
  const qs = params.toString();
  return qs.length === 0 ? `${cleanBase}${cleanPath}` : `${cleanBase}${cleanPath}?${qs}`;
}

function encodePathBlock(block: BlockSelector): string {
  return encodePathSegment(encodeBlockSelector(block));
}

function encodePathSegment(value: string | number | bigint): string {
  return encodeURIComponent(typeof value === "bigint" ? value.toString() : String(value));
}
