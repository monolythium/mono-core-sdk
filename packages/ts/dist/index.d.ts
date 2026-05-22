import { O as OperatorCapabilitiesResponse, R as RuntimeBuildProvenance, a as RuntimeUpgradeStatus, S as SearchResponse, C as ChainStatsResponse, B as BlockSelector, T as TxFeedResponse, N as NativeReceiptResponse, A as AddressProfileResponse, b as AddressFlowResponse, c as ServiceProbeResponse, d as ClobMarketsResponse, e as ClobMarketResponse, f as ClobTradesResponse, g as ClobOhlcResponse, h as ClobOrderBookResponse, i as RpcClient, j as RpcClientOptions, k as TransactionReceipt, l as CallRequest } from './client-Cj2An_-N.js';
export { m as AccountPolicy, n as AccountProofResponse, o as Address, p as AddressActivityArchiveRedirect, q as AddressActivityEntry, r as AddressActivityKind, s as AddressActivityKindResponse, t as AddressActivityKindRetention, u as AddressLabelRecord, v as AssetPolicy, w as AttestationWindow, x as BlockHeader, y as BlockTag, z as BlsCertificateResponse, D as CHAIN_REGISTRY, E as CHAIN_REGISTRY_RAW_BASE, F as CapabilitiesResponse, G as CapabilityDescriptor, H as ChainInfo, I as ChainRegistry, J as CheckpointRecord, K as ClobMarketRecord, L as ClobMarketSummary, M as ClobTrade, P as ClusterDelegatorsResponse, Q as ClusterDirectoryEntryResponse, U as ClusterDirectoryPageResponse, V as ClusterEntityResponse, W as ClusterMemberResponse, X as ClusterResignationRow, Y as ClusterResignationsResponse, Z as ClusterStatusResponse, _ as DagParent, $ as DagParentsResponse, a0 as DagSyncStatus, a1 as DecodeTxLog, a2 as DecodeTxPqAttestation, a3 as DecodeTxResponse, a4 as DelegationCapResponse, a5 as DelegationHistoryRecord, a6 as DelegationRow, a7 as DelegationsResponse, a8 as DutyAbsence, a9 as EncryptionKeyResponse, aa as EntityRatchetResponse, ab as ExplorerEndpoint, ac as FeeHistoryResponse, ad as GapRange, ae as GapRecord, af as GapRecordsResponse, ag as Hash, ah as Hex, ai as IndexerStatus, aj as JailStatusWindow, ak as KeyRotationWindow, al as LythUpgradePlanStatus, am as LythUpgradeStatusResponse, an as MAX_NATIVE_RECEIPT_EVENTS, ao as MempoolSnapshot, ap as MeshDecodedTx, aq as MeshSignedTxResponse, ar as MeshTxIntent, as as MeshUnsignedTxResponse, at as MetricsRangeResponse, au as MetricsRangeSample, av as MetricsRangeSeries, aw as MetricsRangeStatus, ax as NativeReceiptCounters, ay as NativeReceiptEvent, az as NativeReceiptSource, aA as NetworkClientOptions, aB as NetworkSlug, aC as OperatorAuthorityResponse, aD as OperatorInfoResponse, aE as OperatorRiskResponse, aF as OperatorSigningActivityResponse, aG as OperatorSigningEntry, aH as OperatorSurfaceCapability, aI as OperatorSurfaceStatus, aJ as P2pSeed, aK as PeerSummary, aL as PeerSummaryAggregate, aM as PendingTxSummary, aN as PrecompileCatalogueResponse, aO as PrecompileDescriptor, aP as Quantity, aQ as RegistryRecord, aR as ReportServiceProbeRequest, aS as ReportServiceProbeResponse, aT as RichListHolder, aU as RichListResponse, aV as RoundInfo, aW as RpcEndpoint, aX as RuntimeProvenanceResponse, aY as SearchHit, aZ as ServiceProbeStatusLabel, a_ as SigningEntryStatus, a$ as StorageProofBatch, b0 as SyncStatus, b1 as TESTNET_69420, b2 as TokenBalanceRecord, b3 as TpmAttestationResponse, b4 as TransactionView, b5 as TxFeedReceipt, b6 as TxFeedTransaction, b7 as TxStatusFoundResponse, b8 as TxStatusNotFoundResponse, b9 as TxStatusResponse, ba as UpcomingDutiesResponse, bb as UpcomingDutyMap, bc as VertexAtRound, bd as VerticesAtRoundResponse, be as encodeBlockSelector, bf as fetchChainInfoLatest, bg as fetchChainRegistryLatest, bh as getChainInfo, bi as getP2pSeeds, bj as getRpcEndpoints, bk as parseChainRegistryToml, bl as parseQuantity, bm as parseQuantityBig } from './client-Cj2An_-N.js';
import { JsonRpcApiProvider, JsonRpcPayload, JsonRpcResult, JsonRpcError, AbstractSigner, Provider, TransactionRequest, TypedDataDomain, TypedDataField, BaseWallet, Signer } from 'ethers';

/**
 * Aggregate gossip-mesh health bands in `lyth_peerSummary`.
 */
type HealthSummary = {
    synced: bigint;
    lagging: bigint;
    stale: bigint;
};

/**
 * Ping-RTT histogram bands in `lyth_peerSummary`.
 */
type LatencyBands = {
    lt_50ms: bigint;
    lt_200ms: bigint;
    lt_1s: bigint;
    ge_1s: bigint;
};

/**
 * ABI value type.
 */
type MrvAbiType = {
    "kind": "unit";
} | {
    "kind": "bool";
} | {
    "kind": "u8";
} | {
    "kind": "u32";
} | {
    "kind": "u64";
} | {
    "kind": "u128";
} | {
    "kind": "bytes";
} | {
    "kind": "fixedBytes";
    /**
     * Fixed byte length.
     */
    len: number;
} | {
    "kind": "string";
} | {
    "kind": "address";
} | {
    "kind": "hash";
};

/**
 * ABI parameter.
 */
type MrvAbiParam = {
    /**
     * Stable parameter name.
     */
    name: string;
    /**
     * Parameter type.
     */
    ty: MrvAbiType;
};

/**
 * ABI symbol kind.
 */
type MrvAbiSymbolKind = "constructor" | "function" | "event";

/**
 * ABI symbol exposed by a contract.
 */
type MrvAbiSymbol = {
    /**
     * Stable symbol name.
     */
    name: string;
    /**
     * Symbol kind.
     */
    kind: MrvAbiSymbolKind;
    /**
     * Typed input parameters.
     */
    inputs: Array<MrvAbiParam>;
    /**
     * Typed output parameters.
     */
    outputs: Array<MrvAbiParam>;
};

/**
 * Contract ABI manifest.
 */
type MrvAbiManifest = {
    /**
     * ABI symbols exposed by this artifact.
     */
    symbols: Array<MrvAbiSymbol>;
};

/**
 * Typed address discriminator from ADR-0038.
 */
type MrvAddressKind = "user" | "smartAccount" | "contract" | "cluster" | "multisig" | "systemModule";

/**
 * Build metadata recorded in an MRV artifact.
 */
type MrvBuildMetadata = {
    /**
     * Toolchain identifier.
     */
    toolchain: string;
    /**
     * `0x`-prefixed source or build-input digest.
     */
    sourceDigest: string;
    /**
     * Reproducible build profile label.
     */
    profile: string;
};

/**
 * Bounded memory declaration for an MRV artifact.
 */
type MrvMemoryLimits = {
    /**
     * Initial memory pages available at contract start.
     */
    initialPages: number;
    /**
     * Maximum memory pages the contract may grow to.
     */
    maxPages: number;
    /**
     * Stack reservation in bytes.
     */
    stackBytes: number;
};

/**
 * Approved MRV RISC-V profile.
 */
type MrvRiscvProfile = "mono_rv32im_v1";

/**
 * Stable storage namespace declaration.
 */
type MrvStorageNamespace = {
    /**
     * Lowercase namespace name.
     */
    name: string;
    /**
     * Namespace schema version.
     */
    version: number;
};

/**
 * Host syscall import declared by an artifact.
 */
type MrvSyscallImport = {
    /**
     * Host module name. Must be `mono`.
     */
    module: string;
    /**
     * Stable syscall import name.
     */
    name: string;
    /**
     * Stable numeric syscall identifier.
     */
    id: number;
};

/**
 * SDK JSON metadata for an MRV artifact.
 */
type MrvArtifactMetadata = {
    /**
     * MRV format version.
     */
    formatVersion: number;
    /**
     * Approved RISC-V profile.
     */
    profile: MrvRiscvProfile;
    /**
     * BLAKE3 hash of the code section.
     */
    codeHash: string;
    /**
     * Code byte count expected by this metadata.
     */
    codeBytes: bigint;
    /**
     * Optional debug byte count. Debug bytes are excluded from consensus hash.
     */
    debugBytes: bigint;
    /**
     * Contract ABI manifest.
     */
    abi: MrvAbiManifest;
    /**
     * Host syscall imports declared by the artifact.
     */
    imports: Array<MrvSyscallImport>;
    /**
     * Bounded memory declaration.
     */
    memory: MrvMemoryLimits;
    /**
     * Contract storage namespace.
     */
    storageNamespace: MrvStorageNamespace;
    /**
     * Build metadata.
     */
    build: MrvBuildMetadata;
};

/**
 * Native MRV contract call request model.
 */
type MrvCallRequest = {
    /**
     * Optional typed user address that signs the call.
     */
    from?: string;
    /**
     * Destination typed contract address (`monoc1...`).
     */
    contractAddress: string;
    /**
     * Call input bytes as `0x`-hex.
     */
    input: string;
    /**
     * Native value sent with the call, in lythoshi.
     */
    valueLythoshi: string;
    /**
     * Optional execution-unit ceiling for transaction admission.
     */
    executionUnitLimit?: bigint;
    /**
     * Optional max execution fee in lythoshi.
     */
    maxExecutionFeeLythoshi?: string;
    /**
     * Optional priority tip in lythoshi.
     */
    priorityTipLythoshi?: string;
    /**
     * Optional signer nonce.
     */
    nonce?: bigint;
};

/**
 * Native MRV call status.
 */
type MrvCallStatus = "success" | "reverted" | "halted";

/**
 * Typed event payload emitted by a contract or native module.
 */
type MrvEventRecord = {
    /**
     * Domain-separated event topic as `0x`-hex.
     */
    topic: string;
    /**
     * Event payload bytes as `0x`-hex.
     */
    data: string;
};

/**
 * Independent counters reported by MRV execution.
 */
type MrvMeterCounters = {
    /**
     * Deterministic instruction-cycle count.
     */
    cycles: bigint;
    /**
     * Units consumed by host syscalls.
     */
    syscallUnits: bigint;
    /**
     * Units consumed by authenticated state reads and writes.
     */
    stateIoUnits: bigint;
};

/**
 * Typed native-module state delta for receipts and indexers.
 */
type MrvNativeStateDelta = {
    /**
     * Native module namespace that changed.
     */
    namespace: MrvStorageNamespace;
    /**
     * State key inside the namespace as `0x`-hex.
     */
    key: string;
    /**
     * Hash of the new value, or absent when the key was deleted.
     */
    valueHash?: string;
};

/**
 * Typed revert payload.
 */
type MrvRevertPayload = {
    /**
     * Stable contract-defined revert code.
     */
    code: number;
    /**
     * Opaque revert data as `0x`-hex.
     */
    data: string;
};

/**
 * Typed RISC-V execution receipt.
 */
type MrvExecutionReceipt = {
    /**
     * Consensus hash of the validated MRV artifact as `0x`-hex.
     */
    artifactHash: string;
    /**
     * Execution counters.
     */
    counters: MrvMeterCounters;
    /**
     * Typed events emitted by the call.
     */
    events: Array<MrvEventRecord>;
    /**
     * Native module deltas produced by the call.
     */
    nativeDeltas: Array<MrvNativeStateDelta>;
    /**
     * Revert payload when execution failed through the typed revert path.
     */
    reverted?: MrvRevertPayload;
};

/**
 * Native MRV call response model.
 */
type MrvCallResponse = {
    /**
     * Transaction hash.
     */
    txHash: string;
    /**
     * Execution status.
     */
    status: MrvCallStatus;
    /**
     * Returned bytes as `0x`-hex when available.
     */
    returnData: string;
    /**
     * Typed RISC-V receipt when available.
     */
    receipt?: MrvExecutionReceipt;
};

/**
 * Native MRV deploy request model.
 */
type MrvDeployRequest = {
    /**
     * Optional typed user address that signs the deploy.
     */
    from?: string;
    /**
     * Raw bincode MRV artifact bytes as `0x`-hex.
     */
    artifactBytes: string;
    /**
     * Native value to endow the contract with, in lythoshi.
     */
    valueLythoshi: string;
    /**
     * Optional execution-unit ceiling for transaction admission.
     */
    executionUnitLimit?: bigint;
    /**
     * Optional max execution fee in lythoshi.
     */
    maxExecutionFeeLythoshi?: string;
    /**
     * Optional priority tip in lythoshi.
     */
    priorityTipLythoshi?: string;
    /**
     * Optional signer nonce.
     */
    nonce?: bigint;
};

/**
 * Native MRV deploy response model.
 */
type MrvDeployResponse = {
    /**
     * Transaction hash.
     */
    txHash: string;
    /**
     * Deployed typed contract address (`monoc1...`).
     */
    contractAddress: string;
    /**
     * Artifact hash when supplied by the node/indexer.
     */
    artifactHash?: string;
    /**
     * Receipt when the caller requested a confirmed response.
     */
    receipt?: MrvExecutionReceipt;
};

/**
 * Resolved syscall import.
 */
type MrvResolvedSyscall = {
    /**
     * Stable numeric syscall identifier.
     */
    id: number;
    /**
     * Stable syscall import name.
     */
    name: string;
};

/**
 * Typed MRV transaction extension descriptor.
 */
type MrvTransactionExtension = {
    /**
     * Extension kind byte.
     */
    kind: number;
    /**
     * Extension body bytes as `0x`-hex.
     */
    bodyHex: string;
};

/**
 * Decoded typed bech32m address.
 */
type MrvTypedAddress = {
    /**
     * ADR-0038 address kind.
     */
    kind: MrvAddressKind;
    /**
     * Typed bech32m address string.
     */
    address: string;
};

/**
 * Validated artifact metadata summary.
 */
type MrvValidatedArtifactMetadata = {
    /**
     * Verified code hash.
     */
    codeHash: string;
    /**
     * Approved profile.
     */
    profile: MrvRiscvProfile;
    /**
     * Bounded memory declaration.
     */
    memory: MrvMemoryLimits;
    /**
     * Contract storage namespace.
     */
    storageNamespace: MrvStorageNamespace;
    /**
     * Resolved syscall imports in declared order.
     */
    syscalls: Array<MrvResolvedSyscall>;
    /**
     * Number of ABI symbols.
     */
    abiSymbolCount: bigint;
    /**
     * Verified code byte count.
     */
    codeBytes: bigint;
};

/**
 * Typed HTTP client for the explorer-facing `/api/v1` surface served by
 * `mono-core`.
 *
 * JSON-RPC stays on `RpcClient`; this class is for REST-shaped node API
 * routes used by explorers, wallets, and status pages.
 */

interface ApiClientOptions {
    /** Override `fetch`. Useful for tests or non-browser runtimes. */
    fetch?: typeof fetch;
    /** Extra headers to attach to every request. */
    headers?: Record<string, string>;
    /** Explicit `/api/v1` base URL. Defaults to deriving it from the RPC URL. */
    apiBaseUrl?: string;
}
interface ApiErrorEnvelope {
    schemaVersion?: number;
    error: {
        code: number;
        message: string;
        data?: unknown;
    };
}
interface ApiLatestAnchor {
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
interface ApiEnvelope<T> {
    schemaVersion: number;
    chainId: number;
    genesisHash: string | null;
    latest: ApiLatestAnchor;
    data: T;
}
interface ApiHealthResponse {
    schemaVersion: number;
    status: "ok" | "syncing" | string;
    chainId: number;
    latest: ApiLatestAnchor;
    api: {
        enabled: boolean;
        version: string;
    };
}
interface ApiIndexerStatus {
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
interface ApiCapabilitiesResponse {
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
interface ApiBlockHeader {
    height: number;
    blockHash: string;
    parentHash: string;
    stateRoot: string;
    timestamp: number;
    gasUsed: number;
    gasLimit: number;
    baseFeePerGas: string;
}
interface ApiLogEntry {
    address: string;
    topics: string[];
    data: string;
}
interface ApiTransactionView {
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
interface ApiTransactionReceipt {
    txHash: string;
    blockHash: string;
    blockHeight: number;
    txIndex: number;
    status: number;
    gasUsed: number;
    logs: ApiLogEntry[];
}
interface ApiAddressActivityEntry {
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
interface ApiBlockData {
    block: ApiBlockHeader;
    transactionCount: number;
    transactionHashes: string[];
    source: {
        chainProvider: string;
    };
}
interface ApiBlockTransactionsData {
    block: ApiBlockHeader;
    page: number;
    limit: number;
    totalTransactions: number;
    transactions: ApiTransactionView[];
    source: {
        chainProvider: string;
    };
}
interface ApiTransactionData {
    transaction: ApiTransactionView;
    receipt: ApiTransactionReceipt | null;
    source: {
        chainProvider: string;
    };
}
interface ApiTransactionReceiptData {
    receipt: ApiTransactionReceipt;
    source: {
        chainProvider: string;
    };
}
type ApiTransactionNativeReceiptData = NativeReceiptResponse;
interface ApiAddressActivityData {
    address: string;
    limit: number;
    entries: ApiAddressActivityEntry[];
    indexer: ApiIndexerStatus;
}
type ApiAddressActivityKind = "found" | "not_found" | "indexer_disabled" | "pruned" | "private" | string;
interface ApiAddressActivityKindSummary {
    kind: ApiAddressActivityKind;
    retention?: unknown;
}
interface ApiAddressActivityKindData {
    address: string;
    activity: ApiAddressActivityKindSummary;
    indexer: ApiIndexerStatus;
}
interface ApiClusterDirectoryEntry {
    clusterId: number;
    size: number;
    threshold: number;
    aggregateHealth: string;
    regionDiversity: string[] | null;
    active: boolean;
}
interface ApiClusterDirectoryPage {
    page: number;
    limit: number;
    totalClusters: number;
    clusters: ApiClusterDirectoryEntry[];
}
interface ApiClusterMember {
    operatorId: string;
    blsPubkey: string;
    state: string;
}
interface ApiClusterStatus {
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
interface ApiClustersData {
    clusters: ApiClusterDirectoryPage;
    source: {
        registryProvider: string;
    };
}
interface ApiClusterData {
    cluster: ApiClusterStatus;
    source: {
        registryProvider: string;
    };
}
interface ApiOperatorInfo {
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
interface ApiOperatorData {
    operator: ApiOperatorInfo;
    source: {
        registryProvider: string;
    };
}
interface ApiServiceProbeData {
    peerId: string;
    serviceMask: number;
    probe: ServiceProbeResponse | null;
    source: {
        registryProvider: string;
    };
}
interface ApiUpgradePlanStatus {
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
interface ApiUpgradeStatus {
    blockHeight: number;
    configured: boolean;
    planCount: number;
    active: ApiUpgradePlanStatus | null;
    pending: ApiUpgradePlanStatus[];
}
interface ApiUpgradeStatusData {
    upgrade: ApiUpgradeStatus;
    source: {
        chainProvider: string;
    };
}
interface ApiRuntimeProvenanceData {
    runtime: RuntimeBuildProvenance;
    upgrade: RuntimeUpgradeStatus | null;
    source: {
        chainProvider: string;
    };
}
type ApiQueryValue = string | number | bigint | boolean | null | undefined;
declare function apiEndpointFromRpcEndpoint(endpoint: string): string;
declare class ApiClient {
    #private;
    readonly baseUrl: string;
    constructor(endpoint: string, options?: ApiClientOptions);
    get<T>(path: string, query?: Record<string, ApiQueryValue>): Promise<T>;
    health(): Promise<ApiHealthResponse>;
    capabilities(): Promise<ApiCapabilitiesResponse>;
    provenance(): Promise<ApiEnvelope<ApiRuntimeProvenanceData>>;
    search(query: string, limit?: number): Promise<ApiEnvelope<SearchResponse>>;
    stats(): Promise<ApiEnvelope<ChainStatsResponse>>;
    block(block?: BlockSelector): Promise<ApiEnvelope<ApiBlockData>>;
    blockTransactions(block?: BlockSelector, page?: number, limit?: number): Promise<ApiEnvelope<ApiBlockTransactionsData>>;
    transactions(limit?: number, cursor?: string | null): Promise<ApiEnvelope<TxFeedResponse>>;
    transaction(hash: string): Promise<ApiEnvelope<ApiTransactionData>>;
    transactionReceipt(hash: string): Promise<ApiEnvelope<ApiTransactionReceiptData>>;
    transactionNativeReceipt(hash: string): Promise<ApiEnvelope<ApiTransactionNativeReceiptData>>;
    addressProfile(address: string): Promise<ApiEnvelope<AddressProfileResponse>>;
    addressFlow(address: string, limit?: number): Promise<ApiEnvelope<AddressFlowResponse>>;
    addressActivity(address: string, limit?: number, cursor?: string | null): Promise<ApiEnvelope<ApiAddressActivityData>>;
    addressActivityKind(address: string): Promise<ApiEnvelope<ApiAddressActivityKindData>>;
    clusters(page?: number, limit?: number): Promise<ApiEnvelope<ApiClustersData>>;
    cluster(clusterId: number): Promise<ApiEnvelope<ApiClusterData>>;
    operator(operatorId: string): Promise<ApiEnvelope<ApiOperatorData>>;
    serviceProbe(peerId: string, serviceMask: number | string): Promise<ApiEnvelope<ApiServiceProbeData>>;
    markets(limit?: number): Promise<ApiEnvelope<ClobMarketsResponse>>;
    market(marketId: string): Promise<ApiEnvelope<ClobMarketResponse>>;
    marketTrades(marketId: string, limit?: number, cursor?: string | null): Promise<ApiEnvelope<ClobTradesResponse>>;
    marketOhlc(marketId: string, fromBlock?: number | bigint | null, toBlock?: number | bigint | null, bucketBlocks?: number | bigint | null): Promise<ApiEnvelope<ClobOhlcResponse>>;
    marketOrderBook(marketId: string, levels?: number): Promise<ApiEnvelope<ClobOrderBookResponse>>;
    upgradeStatus(height?: BlockSelector | null): Promise<ApiEnvelope<ApiUpgradeStatusData>>;
}

/**
 * Address display helpers.
 *
 * Monolythium keeps 20-byte EVM-compatible addresses on the wire, but
 * user-facing surfaces display them as `mono1...` bech32m strings.
 */
declare const ADDRESS_HRP: "mono";
declare const ADDRESS_KIND_HRPS: {
    readonly user: "mono";
    readonly smartAccount: "monos";
    readonly contract: "monoc";
    readonly cluster: "monok";
    readonly multisig: "monom";
    readonly systemModule: "monox";
};
declare const RESERVED_ADDRESS_HRPS: readonly ["monor", "monop", "monoi", "monoa"];
type AddressKind = keyof typeof ADDRESS_KIND_HRPS;
interface TypedAddress {
    kind: AddressKind;
    address: string;
    bytes: Uint8Array;
    hex: string;
}
declare class AddressError extends Error {
    constructor(message: string);
}
declare function hexToAddressBytes(address: string): Uint8Array;
declare function addressBytesToHex(address: Uint8Array | readonly number[]): string;
declare function addressToBech32(address: string | Uint8Array | readonly number[]): string;
declare function addressToTypedBech32(kind: AddressKind, address: string | Uint8Array | readonly number[]): string;
declare function bech32ToAddressBytes(address: string): Uint8Array;
declare function bech32ToAddress(address: string): string;
declare function typedBech32ToAddress(address: string, expectedKind?: AddressKind): TypedAddress;
declare function parseAddress(address: string): Uint8Array;
declare function normalizeAddressHex(address: string): string;

type MrvBytesLike = string | Uint8Array | readonly number[];
type MrvDecimalLike = string | number | bigint;
interface MrvRequestBuildOptions {
    from?: string;
    valueLythoshi?: MrvDecimalLike;
    executionUnitLimit?: number | bigint;
    maxExecutionFeeLythoshi?: MrvDecimalLike;
    priorityTipLythoshi?: MrvDecimalLike;
    nonce?: number | bigint;
}
interface MrvDeployPlanOptions extends MrvRequestBuildOptions {
    artifactHash?: string;
}
interface MrvDeployPlan {
    request: MrvDeployRequest;
    extension: MrvTransactionExtension;
    expectedContractAddress?: string;
}
interface MrvCallPlan {
    request: MrvCallRequest;
    extension: MrvTransactionExtension;
}
declare const MRV_FORMAT_VERSION: 1;
declare const MRV_PROFILE_MONO_RV32IM_V1: "mono_rv32im_v1";
declare const MRV_MEMORY_PAGE_BYTES: 65536;
declare const MRV_MAX_CODE_BYTES: number;
declare const MRV_MAX_DEBUG_BYTES: number;
declare const MRV_MAX_MEMORY_PAGES: 1024;
declare const MRV_MAX_ABI_SYMBOLS: 1024;
declare const MRV_MAX_STORAGE_NAMESPACE_BYTES: 64;
declare const LYTH_DECIMALS: 8;
declare const LYTHOSHI_PER_LYTH = 100000000n;
declare const MRV_TX_EXTENSION_KIND: 48;
declare const MRV_TX_EXTENSION_V1: 1;
declare class MrvValidationError extends Error {
    constructor(message: string);
}
declare function mrvCodeHashHex(code: MrvBytesLike): string;
declare function mrvV1TransactionExtension(): MrvTransactionExtension;
declare function mrvAddressToBech32(kind: MrvAddressKind, bytes: MrvBytesLike): string;
declare function mrvBech32ToAddress(address: string, expectedKind?: MrvAddressKind): TypedAddress;
declare function deriveMrvContractAddress(deployerAddress: string, deployerNonce: number | bigint, artifactHashHex: string): string;
declare function validateMrvArtifactMetadata(metadata: MrvArtifactMetadata, code: MrvBytesLike): MrvValidatedArtifactMetadata;
declare function validateMrvDeployRequest(request: MrvDeployRequest): void;
declare function validateMrvCallRequest(request: MrvCallRequest): void;
declare function buildMrvDeployRequest(artifactBytes: MrvBytesLike, options?: MrvRequestBuildOptions): MrvDeployRequest;
declare function buildMrvCallRequest(contractAddress: string, input?: MrvBytesLike, options?: MrvRequestBuildOptions): MrvCallRequest;
declare function buildMrvDeployPlan(artifactBytes: MrvBytesLike, options?: MrvDeployPlanOptions): MrvDeployPlan;
declare function buildMrvCallPlan(contractAddress: string, input?: MrvBytesLike, options?: MrvRequestBuildOptions): MrvCallPlan;

/**
 * Error surfaced by `RpcClient`. Distinguishes transport failures
 * (HTTP errors, network), protocol errors (JSON-RPC `error` envelopes),
 * and shape mismatches.
 */
declare class SdkError extends Error {
    readonly kind: "transport" | "rpc" | "malformed" | "endpoint";
    readonly code?: number;
    readonly data?: unknown;
    constructor(kind: "transport" | "rpc" | "malformed" | "endpoint", message: string, opts?: {
        code?: number;
        data?: unknown;
        cause?: unknown;
    });
    static transport(message: string, cause?: unknown): SdkError;
    static rpc(code: number, message: string, data?: unknown): SdkError;
    static malformed(message: string): SdkError;
    static endpoint(message: string): SdkError;
}

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
declare const BURN_ADDR: "0x0000000000000000000000000000000000000000";
/**
 * SDK-exposed precompile address map (whitepaper v4.0).
 *
 * Sourced from `mono-core` runtime/precompile constants and pinned here
 * so surfaces can render precompile traffic by name without
 * re-defining low-band address literals.
 *
 * `0x1002` and `0x1006` are intentionally absent from the SDK surface
 * because whitepaper v4.0 does not define those application surfaces.
 */
declare const PRECOMPILE_ADDRESSES: {
    /** Native fungible-token factory — non-gateable, foundational. */
    readonly TOKEN_FACTORY: "0x0000000000000000000000000000000000001000";
    /** Native central-limit order book — gateable. */
    readonly CLOB: "0x0000000000000000000000000000000000001001";
    /** Agent execution surface (zkML-gated, ADR-0011/ADR-0020) — gateable. */
    readonly AGENT: "0x0000000000000000000000000000000000001003";
    /** Account privacy policy + stealth/confidential ops — gateable. */
    readonly PRIVACY: "0x0000000000000000000000000000000000001004";
    /** Operator + RPC node registry — non-gateable consensus invariant. */
    readonly NODE_REGISTRY: "0x0000000000000000000000000000000000001005";
    /** IBC light-client + packet routing — gateable. */
    readonly IBC: "0x0000000000000000000000000000000000001007";
    /** Native zk-light-client bridge — gateable. */
    readonly BRIDGE: "0x0000000000000000000000000000000000001008";
    /** Decentralized multi-signer oracle (OI-0036) — non-gateable. */
    readonly ORACLE: "0x0000000000000000000000000000000000001009";
    /** Distributed delegation primitive (Stage E.5a, Law §7.6) — gateable. */
    readonly DELEGATION: "0x000000000000000000000000000000000000100A";
    /** One-time emergency-key registry (Law §5.4 / §2.9) — non-gateable. */
    readonly EMERGENCY_KEY: "0x0000000000000000000000000000000000001100";
    /** VRF precompile (Law §5.4 / §5.6). */
    readonly VRF: "0x0000000000000000000000000000000000001101";
    /** Streaming-payments primitive (Law §5.4 / §5.7) — gateable. */
    readonly STREAMING_PAYMENTS: "0x0000000000000000000000000000000000001102";
    /** Human-readable name registry (Law §5.4 / §5.8) — gateable. */
    readonly NAME_REGISTRY: "0x0000000000000000000000000000000000001103";
    /** Cluster-name registry. */
    readonly CLUSTER_NAME_REGISTRY: "0x0000000000000000000000000000000000001104";
    /** Agent-commerce attestation precompile. */
    readonly ATTESTATION: "0x0000000000000000000000000000000000001105";
    /** Agent-commerce consent precompile. */
    readonly CONSENT: "0x0000000000000000000000000000000000001106";
    /** Agent-commerce issuer registry. */
    readonly ISSUER_REGISTRY: "0x0000000000000000000000000000000000001107";
    /** Agent-commerce discovery precompile. */
    readonly DISCOVERY: "0x0000000000000000000000000000000000001108";
    /** Agent-commerce availability precompile. */
    readonly AVAILABILITY: "0x0000000000000000000000000000000000001109";
    /** Agent-commerce escrow precompile. */
    readonly ESCROW: "0x000000000000000000000000000000000000110A";
    /** Agent-commerce arbiter registry. */
    readonly ARBITER_REGISTRY: "0x000000000000000000000000000000000000110B";
    /** Agent spending policy — gateable, activated by Stage 7 milestones. */
    readonly SPENDING_POLICY: "0x000000000000000000000000000000000000110C";
    /** Primary ML-DSA-65 pubkey registry — gateable, ADR-0034. */
    readonly PUBKEY_REGISTRY: "0x000000000000000000000000000000000000110D";
};
/** Precompile address-key type — useful for typed maps over the surface. */
type PrecompileName = keyof typeof PRECOMPILE_ADDRESSES;
/** Precompile address value type. */
type PrecompileAddress = (typeof PRECOMPILE_ADDRESSES)[PrecompileName];

/**
 * Node-registry precompile ABI helpers and service capability constants.
 *
 * These constants mirror `protocore-node-registry::capabilities` and
 * `protocore-node-registry::abi`. They are exported for wallets,
 * service probers, faucets, and operator dashboards that need to build
 * canonical registry transactions without retyping low-level values.
 */
declare const NODE_REGISTRY_CAPABILITIES: {
    readonly SERVES_RPC: 1;
    readonly SERVES_INDEXER: 2;
    readonly SERVES_BROADCASTER: 4;
    readonly SERVES_ARCHIVE: 8;
    readonly SERVES_WEBSOCKET: 16;
    readonly SERVES_LIGHT_CLIENT: 32;
    readonly SERVES_ORACLE_WRITER: 64;
    readonly SERVES_BRIDGE_RELAY: 128;
    readonly SERVES_PUBLIC_API: 256;
};
declare const NODE_REGISTRY_CAPABILITY_MASK = 65535;
declare const NODE_REGISTRY_PUBLIC_SERVICE_MASK: number;
declare const SERVICE_PROBE_STATUS: {
    readonly UNKNOWN: 0;
    readonly REACHABLE: 1;
    readonly DEGRADED: 2;
    readonly UNREACHABLE: 3;
};
declare const NODE_REGISTRY_SELECTORS: {
    readonly reportServiceProbe: "0xeee31bba";
    readonly getServiceProbe: "0x1fcbfbce";
};
interface ReportServiceProbeCalldataArgs {
    peerId: string | Uint8Array | readonly number[];
    serviceMask: number;
    status: number;
    latencyMs: number;
    probeDigest: string | Uint8Array | readonly number[];
}
declare class NodeRegistryError extends Error {
    constructor(message: string);
}
declare function nodeRegistryAddressHex(): string;
declare function isValidNodeRegistryCapabilities(flags: number): boolean;
declare function isValidPublicServiceProbeMask(mask: number): boolean;
declare function isSinglePublicServiceProbeMask(mask: number): boolean;
declare function isConcreteServiceProbeStatus(status: number): boolean;
declare function serviceProbeStatusLabel(status: number): string;
declare function encodeReportServiceProbeCalldata(args: ReportServiceProbeCalldataArgs): string;

/**
 * Spending-policy precompile ABI helpers.
 *
 * These helpers build calldata and claim messages for the live
 * `mono-core` spending-policy precompile. Fresh sub-account claims
 * must use `setPolicyClaim` or `claimPolicyByAddress`; legacy
 * `setPolicy` is only for re-claims where the principal is already
 * recorded on-chain.
 */

declare const SET_POLICY_CLAIM_DOMAIN_TAG: "lyth.spending-policy.claim.v1";
declare const ML_DSA_65_PUBLIC_KEY_LEN = 1952;
declare const ML_DSA_65_SIGNATURE_LEN = 3309;
declare const SPENDING_POLICY_SELECTORS: {
    readonly setPolicy: "0xd6a518b2";
    readonly setPolicyClaim: "0x08d78f9c";
    readonly claimPolicyByAddress: "0xc2397fe9";
    readonly enable: "0x5bfa1b68";
    readonly disable: "0xe6c09edf";
    readonly recordSpend: "0xdca04292";
};
interface SpendingPolicyArgs {
    subAccount: string | Uint8Array | readonly number[];
    principal: string | Uint8Array | readonly number[];
    dailyCapWei: bigint | number | string;
    perTxCapWei: bigint | number | string;
    allowRoot: string | Uint8Array | readonly number[];
    denyRoot: string | Uint8Array | readonly number[];
}
declare class SpendingPolicyError extends Error {
    constructor(message: string);
}
declare function spendingPolicyAddressHex(): string;
declare function composeClaimBoundMessage(chainId: bigint | number | string, args: SpendingPolicyArgs, opts?: {
    precompileAddress?: string | Uint8Array | readonly number[];
    expectedPolicyVersion?: bigint | number | string;
}): Uint8Array;
declare function encodeSetPolicyCalldata(args: SpendingPolicyArgs): string;
declare function encodeSetPolicyClaimCalldata(args: SpendingPolicyArgs, subAccountPubkey: Uint8Array | readonly number[] | string, subAccountSig: Uint8Array | readonly number[] | string): string;
declare function encodeClaimPolicyByAddressCalldata(args: SpendingPolicyArgs, subAccountSig: Uint8Array | readonly number[] | string): string;
declare function encodeEnableCalldata(subAccount: string | Uint8Array | readonly number[]): string;
declare function encodeDisableCalldata(subAccount: string | Uint8Array | readonly number[]): string;

/**
 * Pubkey-registry precompile ABI helpers.
 *
 * The pubkey-registry at `0x110D` lets an account publish its primary
 * ML-DSA-65 public key once, so later contract-context verification can
 * look the key up by address.
 */
declare const PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN = 1952;
declare const PUBKEY_REGISTRY_SELECTORS: {
    readonly registerPubkey: "0x5fe984e7";
    readonly lookupPubkey: "0x87c42001";
    readonly hasPubkey: "0x01c0d167";
};
interface PubkeyLookup {
    pubkey: Uint8Array;
    setBlock: bigint;
}
declare class PubkeyRegistryError extends Error {
    constructor(message: string);
}
declare function pubkeyRegistryAddressHex(): string;
declare function encodeRegisterPubkeyCalldata(pubkey: Uint8Array | readonly number[] | string): string;
declare function encodeLookupPubkeyCalldata(address: string | Uint8Array | readonly number[]): string;
declare function encodeHasPubkeyCalldata(address: string | Uint8Array | readonly number[]): string;
declare function decodeLookupPubkeyReturn(data: Uint8Array | readonly number[] | string): PubkeyLookup;
declare function decodeHasPubkeyReturn(data: Uint8Array | readonly number[] | string): boolean;

/**
 * Network identity for the ethers.js compat shim.
 *
 * Per whitepaper v4.0, Monolythium testnet `chain_id` is **`69420`**.
 * Mainnet chain id is reserved for the genesis ceremony and not yet
 * exported.
 */
/** Monolythium v4.0 testnet chain id. */
declare const MONOLYTHIUM_TESTNET_CHAIN_ID = 69420n;
/** Network name surfaced to ethers `Network` instances. */
declare const MONOLYTHIUM_TESTNET_NETWORK_NAME = "monolythium-testnet";
/**
 * Built-in network presets for the ethers shim. Callers that point at a
 * different chain id (e.g. a local dev node) construct `MonolythiumProvider`
 * with an explicit `network` option instead.
 */
declare const MONOLYTHIUM_NETWORKS: {
    readonly testnet: {
        readonly chainId: 69420n;
        readonly name: "monolythium-testnet";
    };
};
/** Configuration object accepted by the ethers shim factory functions. */
interface MonolythiumNetworkConfig {
    /** Numeric chain id (e.g. `69420n`). */
    chainId: bigint;
    /** Human-readable network name. */
    name: string;
}

/**
 * `MonolythiumProvider` — ethers v6 `JsonRpcApiProvider` that routes
 * every call through the native `RpcClient`.
 *
 * `JsonRpcApiProvider` already knows how to translate the rich
 * `_perform(req)` surface into the standard `eth_*` JSON-RPC calls,
 * so we only need to override `_send`: instead of opening its own
 * fetch transport, we reuse the SDK's transport and `lyth_*`-aware
 * error handling.
 *
 * That keeps a single transport in the process — no double-counted
 * connection pools, no duplicated retry/backoff logic, and any
 * future SDK-side feature (auth headers, ws upgrade, registry-based
 * routing) lights up for ethers callers automatically.
 *
 * **SDK-only compat.** Per `feedback_no_ethereum_wire_retrofit.md`,
 * this shim never alters the chain's wire — it only wraps the chain's
 * existing `eth_*` namespace in ethers' interface so existing
 * Solidity tooling (Hardhat, Foundry, ethers-based dApps) can target
 * Monolythium without code rewrites.
 */

/** Optional configuration for `MonolythiumProvider`. */
interface MonolythiumProviderOptions extends RpcClientOptions {
    /**
     * Override the chain id / network name surfaced to ethers. Defaults
     * to the Monolythium v4.0 testnet preset (`chain_id` `69420`, name
     * `monolythium-testnet`).
     */
    network?: MonolythiumNetworkConfig;
}
/**
 * `MonolythiumProvider` adapts `mono-core`'s JSON-RPC surface to
 * ethers v6.
 *
 * Use it the same way you'd use any ethers provider:
 *
 * ```ts
 * import { MonolythiumProvider } from "@monolythium/core-sdk";
 *
 * const provider = new MonolythiumProvider("https://rpc.testnet.monolythium.com");
 * const block = await provider.getBlockNumber();
 * ```
 *
 * Anything ethers normally does — `getBlockNumber`, `getBalance`,
 * `getTransactionReceipt`, `call`, `estimateGas`, `broadcastTransaction`
 * — flows through `RpcClient.call` (which already handles JSON-RPC
 * error envelopes via `SdkError`).
 */
declare class MonolythiumProvider extends JsonRpcApiProvider {
    #private;
    /** Underlying SDK client. Exposed for callers that want native types. */
    readonly rpcClient: RpcClient;
    constructor(endpointOrClient: string | RpcClient, options?: MonolythiumProviderOptions);
    /**
     * Forward a single JSON-RPC method through the SDK transport. Ethers'
     * `_perform` calls this and ethers callers can also call `provider.send`
     * directly to access methods the rich provider interface does not wrap
     * (e.g. `lyth_*`).
     */
    _send(payload: JsonRpcPayload | Array<JsonRpcPayload>): Promise<Array<JsonRpcResult | JsonRpcError>>;
}

/**
 * `MonolythiumSigner` — ethers v6 `AbstractSigner` adapter.
 *
 * Two backend strategies are supported, both via the same external
 * surface — `getAddress`, `signTransaction`, `signMessage`,
 * `signTypedData`:
 *
 * 1. **`fromEthersWallet`** — wraps a normal `ethers.Wallet`
 *    (secp256k1). Useful for tests, scripts, and any path where the
 *    user already has an Ethereum-style key. The SDK does not store
 *    the key — the wallet does.
 *
 * 2. **`MonolythiumSignerBackend`** — generic interface a non-ethers
 *    backend (keychain, hardware wallet, future ML-DSA-65 signer)
 *    implements to plug into ethers without forcing the SDK to take
 *    a hard ethers dependency on either the chain side or the
 *    consumer side.
 *
 * The address derivation rule for any backend is **Law §2.6**:
 * `keccak256(canonical_pubkey_bytes)[12..32]`, with algo-tagged domain
 * separation. For secp256k1 (the ethers Wallet path) this collapses
 * to the standard Ethereum derivation that `ethers.computeAddress`
 * already implements — so wallets the user already has work as-is.
 *
 * **What the shim is not.** This is SDK-level compat (per
 * `feedback_no_ethereum_wire_retrofit.md`). The chain's protocol-native
 * signing path is ML-DSA-65 (Law §2.1); ethers cannot produce ML-DSA
 * signatures, and the chain accepts secp256k1 only via the
 * crypto-agile `SignedTransaction` envelope. Use
 * `MonolythiumSignerBackend` to plug a native ML-DSA path in.
 */

/**
 * Backend the `MonolythiumSigner` delegates signing to.
 *
 * The intent is to let consumers wire up any signing source — local
 * keystore, OS keychain, hardware wallet, or a future ML-DSA-65
 * adapter — without the shim forcing a particular implementation.
 *
 * Every method's return shape mirrors what ethers'
 * `AbstractSigner` callers expect, so the backend can compose with
 * any tooling built on ethers.
 */
interface MonolythiumSignerBackend {
    /** Resolves to the 20-byte 0x-hex address (Law §2.6 derivation). */
    getAddress(): Promise<string>;
    /**
     * Resolves to a fully-encoded raw signed transaction (a 0x-hex
     * string). For secp256k1 this is the canonical EIP-1559 RLP that
     * `eth_sendRawTransaction` expects.
     */
    signTransaction(tx: TransactionRequest): Promise<string>;
    /**
     * Resolves to an EIP-191 personal-sign signature (`0x` + 65 bytes
     * for secp256k1 / variable for non-recoverable algorithms).
     */
    signMessage(message: string | Uint8Array): Promise<string>;
    /** Resolves to an EIP-712 typed-data signature. */
    signTypedData(domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, unknown>): Promise<string>;
}
/**
 * `MonolythiumSigner` — ethers v6 `Signer` for the Monolythium chain.
 *
 * Construct one of three ways:
 *
 * 1. `MonolythiumSigner.fromEthersWallet(wallet, provider)` — the
 *    fastest path; wraps a normal `ethers.Wallet`.
 * 2. `new MonolythiumSigner(backend, provider)` — supply any object
 *    implementing `MonolythiumSignerBackend`.
 *
 * The signer is fully spec-compatible with ethers v6 — it can be
 * passed anywhere a `Signer` is accepted (e.g.
 * `new ethers.Contract(address, abi, signer)`), and works with
 * `Contract.deploy`, `Contract.call`, all ContractFactory paths,
 * and `provider.broadcastTransaction(signed)`.
 */
declare class MonolythiumSigner extends AbstractSigner<Provider | null> {
    #private;
    constructor(backend: MonolythiumSignerBackend, provider?: Provider | null);
    /**
     * Wrap any ethers v6 `BaseWallet` (the parent class of `Wallet`,
     * `HDNodeWallet`, and friends) so callers don't have to write a
     * `MonolythiumSignerBackend` for the common test / dev path.
     *
     * Both `new Wallet(privateKey)` and `Wallet.createRandom()` /
     * `HDNodeWallet.fromMnemonic(...)` are accepted.
     */
    static fromEthersWallet(wallet: BaseWallet, provider?: Provider | null): MonolythiumSigner;
    getAddress(): Promise<string>;
    connect(provider: Provider | null): Signer;
    signTransaction(tx: TransactionRequest): Promise<string>;
    signMessage(message: string | Uint8Array): Promise<string>;
    signTypedData(domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, unknown>): Promise<string>;
}

/**
 * Tx wire translation between ethers.js and `mono-core`.
 *
 * The chain natively accepts EIP-1559-shape EVM transactions on the
 * `Tx::Evm` (kind tag `0x01`) wire path — a `SignedTransaction` payload
 * carries the legacy EIP-1559 envelope plus the secp256k1 signature.
 * That makes the round-trip simple: ethers produces the canonical
 * EIP-1559 RLP, the client posts it via `eth_sendRawTransaction`, the
 * chain decodes it, and the receipt comes back through the same
 * `eth_getTransactionReceipt` shape ethers expects.
 *
 * Two notes for any future maintainer:
 *
 * 1. **No chain-level Ethereum retrofit.** This shim is SDK-only — see
 *    `feedback_no_ethereum_wire_retrofit.md`. The chain keeps its
 *    custom envelope and native tx hash for the protocol-native path
 *    (ML-DSA-65 signing, native tx kinds beyond EVM). The shim only
 *    spans the **EIP-1559 EVM subset** of the chain's tx surface.
 * 2. **Fields ethers does not see.** Monolythium-specific extension
 *    fields (privacy flags, native tx kinds, ML-DSA-65 signatures) are
 *    intentionally dropped by these helpers. Callers that need those
 *    surfaces use the native SDK signer trait, not the ethers shim.
 */

/**
 * The EIP-1559 subset of fields ethers' `TransactionRequest` carries
 * across the shim. We don't import ethers' type here so the shim can be
 * compiled (and its types re-exported) even when ethers isn't installed
 * — ethers is a peerDependency, not a hard dependency.
 */
interface EthersTxRequestSubset {
    to?: string | null;
    from?: string | null;
    nonce?: number | bigint | null;
    gasLimit?: bigint | string | null;
    gasPrice?: bigint | string | null;
    maxFeePerGas?: bigint | string | null;
    maxPriorityFeePerGas?: bigint | string | null;
    value?: bigint | string | null;
    data?: string | null;
    chainId?: bigint | number | null;
    type?: number | null;
}
/**
 * Translate ethers' `TransactionRequest` into the wire shape the
 * `mono-core` JSON-RPC accepts for `eth_call` / `eth_estimateGas`.
 *
 * Returns the SDK's `CallRequest` shape (which mirrors the chain's
 * accepted `eth_call` argument). Round-trips losslessly for the
 * EIP-1559 EVM subset; Monolythium-specific extension fields are
 * intentionally not surfaced here.
 */
declare function translateTxIn(req: EthersTxRequestSubset): CallRequest;
/**
 * The ethers v6 wire shape for `eth_getTransactionReceipt`. We hand-roll
 * this rather than importing ethers' internal types because the shim
 * has to compile without ethers installed (peerDependency).
 *
 * Field naming and casing match what `JsonRpcApiProvider._perform` expects
 * back — the provider then normalises into ethers' rich
 * `TransactionReceipt` for callers.
 */
interface EthersReceiptShape {
    transactionHash: string;
    blockHash: string;
    blockNumber: string;
    transactionIndex: string;
    status: string;
    gasUsed: string;
    cumulativeGasUsed: string;
    effectiveGasPrice: string;
    contractAddress: string | null;
    from: string;
    to: string | null;
    type: string;
    logsBloom: string;
    logs: unknown[];
}
/**
 * Translate `mono-core`'s native `TransactionReceipt` into the wire
 * shape ethers expects. Required for `eth_getTransactionReceipt` to
 * surface a usable `TransactionResponse` to ethers callers.
 *
 * The chain's receipt today is intentionally narrow — log emission,
 * cumulative-gas aggregation, and effective-gas-price disclosure are
 * tracked OI items. This translator fills in zero-equivalent values for
 * those gaps; callers that need the full surface (logs, effective gas
 * price) consume the native SDK shape directly.
 */
declare function translateReceiptOut(monoReceipt: TransactionReceipt, fromAddress: string | null, toAddress: string | null): EthersReceiptShape;
/**
 * Translate `mono-core`'s `BlockHeader` into the ethers v6 wire shape
 * for `eth_getBlockByNumber` / `eth_getBlockByHash`.
 *
 * The chain's block header is intentionally narrower than Ethereum's
 * — it omits fields that don't exist in Monolythium (uncles, mix hash,
 * difficulty, nonce, sha3Uncles). This translator emits zero-valued
 * stand-ins so ethers' normaliser does not throw. Callers needing the
 * authoritative shape import the native `BlockHeader` from the SDK.
 */
interface EthersBlockShape {
    number: string;
    hash: string;
    parentHash: string;
    timestamp: string;
    gasUsed: string;
    gasLimit: string;
    stateRoot: string;
    miner: string;
    difficulty: string;
    nonce: string;
    baseFeePerGas: string | null;
    extraData: string;
    mixHash: string;
    transactions: string[];
    transactionsRoot: string;
    receiptsRoot: string;
    logsBloom: string;
    sha3Uncles: string;
    uncles: string[];
    size: string;
}
/**
 * Translate `mono-core`'s `BlockHeader` to the ethers wire shape.
 * `transactions` defaults to an empty list — the SDK's
 * `eth_getBlockByNumber` does not yet return tx hashes; once Stage 1+
 * surfaces them, callers update this translator.
 */
declare function translateBlockOut(header: {
    number: bigint;
    hash: string;
    parent_hash: string;
    state_root: string;
    timestamp: bigint;
    gas_used: bigint;
    gas_limit: bigint;
}): EthersBlockShape;

/**
 * Official TypeScript SDK for Monolythium v4.0 / LythiumDAG-BFT.
 *
 * The wire types in `./bindings/` are generated from Rust by
 * `cargo test --features ts-bindings`; never edit them by hand. The
 * `RpcClient` mirrors the Rust SDK 1:1 and sends `lyth_*` / `eth_*` /
 * `debug_*` JSON-RPC methods (Law §13.2).
 *
 * The optional `ethers.js` v6 compat shim lives under `./ethers/`
 * and is re-exported below. `ethers` is a peerDependency — install
 * it alongside this SDK when you use the shim.
 */
declare const version = "0.1.0";

export { ADDRESS_HRP, ADDRESS_KIND_HRPS, AddressError, AddressFlowResponse, type AddressKind, AddressProfileResponse, type ApiAddressActivityData, type ApiAddressActivityEntry, type ApiAddressActivityKind, type ApiAddressActivityKindData, type ApiAddressActivityKindSummary, type ApiBlockData, type ApiBlockHeader, type ApiBlockTransactionsData, type ApiCapabilitiesResponse, ApiClient, type ApiClientOptions, type ApiClusterData, type ApiClusterDirectoryEntry, type ApiClusterDirectoryPage, type ApiClusterMember, type ApiClusterStatus, type ApiClustersData, type ApiEnvelope, type ApiErrorEnvelope, type ApiHealthResponse, type ApiIndexerStatus, type ApiLatestAnchor, type ApiLogEntry, type ApiOperatorData, type ApiOperatorInfo, type ApiQueryValue, type ApiRuntimeProvenanceData, type ApiServiceProbeData, type ApiTransactionData, type ApiTransactionNativeReceiptData, type ApiTransactionReceipt, type ApiTransactionReceiptData, type ApiTransactionView, type ApiUpgradePlanStatus, type ApiUpgradeStatus, type ApiUpgradeStatusData, BURN_ADDR, BlockSelector, CallRequest, ChainStatsResponse, ClobMarketResponse, ClobMarketsResponse, ClobOhlcResponse, ClobOrderBookResponse, ClobTradesResponse, type EthersBlockShape, type EthersReceiptShape, type EthersTxRequestSubset, type HealthSummary, LYTHOSHI_PER_LYTH, LYTH_DECIMALS, type LatencyBands, ML_DSA_65_PUBLIC_KEY_LEN, ML_DSA_65_SIGNATURE_LEN, MONOLYTHIUM_NETWORKS, MONOLYTHIUM_TESTNET_CHAIN_ID, MONOLYTHIUM_TESTNET_NETWORK_NAME, MRV_FORMAT_VERSION, MRV_MAX_ABI_SYMBOLS, MRV_MAX_CODE_BYTES, MRV_MAX_DEBUG_BYTES, MRV_MAX_MEMORY_PAGES, MRV_MAX_STORAGE_NAMESPACE_BYTES, MRV_MEMORY_PAGE_BYTES, MRV_PROFILE_MONO_RV32IM_V1, MRV_TX_EXTENSION_KIND, MRV_TX_EXTENSION_V1, type MonolythiumNetworkConfig, MonolythiumProvider, type MonolythiumProviderOptions, MonolythiumSigner, type MonolythiumSignerBackend, type MrvAbiManifest, type MrvAbiParam, type MrvAbiSymbol, type MrvAbiSymbolKind, type MrvAbiType, type MrvAddressKind, type MrvArtifactMetadata, type MrvBuildMetadata, type MrvBytesLike, type MrvCallPlan, type MrvCallRequest, type MrvCallResponse, type MrvCallStatus, type MrvDecimalLike, type MrvDeployPlan, type MrvDeployPlanOptions, type MrvDeployRequest, type MrvDeployResponse, type MrvEventRecord, type MrvExecutionReceipt, type MrvMemoryLimits, type MrvMeterCounters, type MrvNativeStateDelta, type MrvRequestBuildOptions, type MrvResolvedSyscall, type MrvRevertPayload, type MrvRiscvProfile, type MrvStorageNamespace, type MrvSyscallImport, type MrvTransactionExtension, type MrvTypedAddress, type MrvValidatedArtifactMetadata, MrvValidationError, NODE_REGISTRY_CAPABILITIES, NODE_REGISTRY_CAPABILITY_MASK, NODE_REGISTRY_PUBLIC_SERVICE_MASK, NODE_REGISTRY_SELECTORS, NativeReceiptResponse, NodeRegistryError, OperatorCapabilitiesResponse, PRECOMPILE_ADDRESSES, PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN, PUBKEY_REGISTRY_SELECTORS, type PrecompileAddress, type PrecompileName, type PubkeyLookup, PubkeyRegistryError, RESERVED_ADDRESS_HRPS, type ReportServiceProbeCalldataArgs, RpcClient, RpcClientOptions, RuntimeBuildProvenance, RuntimeUpgradeStatus, SERVICE_PROBE_STATUS, SET_POLICY_CLAIM_DOMAIN_TAG, SPENDING_POLICY_SELECTORS, SdkError, SearchResponse, ServiceProbeResponse, type SpendingPolicyArgs, SpendingPolicyError, TransactionReceipt, TxFeedResponse, type TypedAddress, addressBytesToHex, addressToBech32, addressToTypedBech32, apiEndpointFromRpcEndpoint, bech32ToAddress, bech32ToAddressBytes, buildMrvCallPlan, buildMrvCallRequest, buildMrvDeployPlan, buildMrvDeployRequest, composeClaimBoundMessage, decodeHasPubkeyReturn, decodeLookupPubkeyReturn, deriveMrvContractAddress, encodeClaimPolicyByAddressCalldata, encodeDisableCalldata, encodeEnableCalldata, encodeHasPubkeyCalldata, encodeLookupPubkeyCalldata, encodeRegisterPubkeyCalldata, encodeReportServiceProbeCalldata, encodeSetPolicyCalldata, encodeSetPolicyClaimCalldata, hexToAddressBytes, isConcreteServiceProbeStatus, isSinglePublicServiceProbeMask, isValidNodeRegistryCapabilities, isValidPublicServiceProbeMask, mrvAddressToBech32, mrvBech32ToAddress, mrvCodeHashHex, mrvV1TransactionExtension, nodeRegistryAddressHex, normalizeAddressHex, parseAddress, pubkeyRegistryAddressHex, serviceProbeStatusLabel, spendingPolicyAddressHex, translateBlockOut, translateReceiptOut, translateTxIn, typedBech32ToAddress, validateMrvArtifactMetadata, validateMrvCallRequest, validateMrvDeployRequest, version };
