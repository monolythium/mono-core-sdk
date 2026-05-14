/**
 * Typed JSON-RPC client for a `mono-core` node.
 *
 * Mirrors the Rust SDK's `RpcClient` — every public method maps 1:1 to
 * a method on the Rust client, returns the same wire-shape value, and
 * sends the same `lyth_*` / `eth_*` / `debug_*` JSON-RPC method strings
 * (Law §13.2).
 */

import { SdkError } from "./error.js";
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
  PeerSummary,
  PendingTxSummary,
  PrecompileDescriptor,
  RegistryRecord,
  RichListResponse,
  RoundInfo,
  StorageProofBatch,
  SyncStatus,
  TpmAttestationResponse,
  TransactionReceipt,
  TransactionView,
  TokenBalanceRecord,
} from "./bindings/index.js";
import type { BlockSelector } from "./types.js";
import { encodeBlockSelector } from "./types.js";

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
    return this.call("eth_getTransactionReceipt", [txHash]);
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

  /** `lyth_decodeTx` — explorer-grade decoded transaction envelope. */
  async lythDecodeTx(txHash: string): Promise<DecodeTxResponse> {
    return this.call("lyth_decodeTx", [txHash]);
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
    parent_hash: String(h["parent_hash"]),
    state_root: String(h["state_root"]),
    timestamp: parseRpcBigint(h["timestamp"], "block header timestamp"),
    gas_used: parseRpcBigint(h["gas_used"], "block header gas_used"),
    gas_limit: parseRpcBigint(h["gas_limit"], "block header gas_limit"),
  };
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
