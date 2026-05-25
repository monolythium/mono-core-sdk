import { N as NativeReceiptFee, O as OperatorCapabilitiesResponse, R as RuntimeBuildProvenance, a as RuntimeUpgradeStatus, S as SearchResponse, C as ChainStatsResponse, B as BlockSelector, A as ApiStreamsIndexResponse, T as TxFeedResponse, b as NativeReceiptResponse, c as NativeDecodedEvent, d as NativeEventFilter, e as TypedNativeReceiptEvent, f as NativeEventsFilter, g as NativeEventsResponse, h as NativeAgentStateFilter, i as NativeAgentStateResponse, j as NativeMarketStateFilter, k as NativeMarketStateResponse, l as NativeMarketOrderBookDeltasRequest, m as NativeMarketOrderBookDeltasResponse, n as AddressProfileResponse, o as AddressFlowResponse, P as PendingRewardsResponse, p as RedemptionQueueResponse, M as MrcMetadataResponse, q as MrcAccountResponse, r as MrcHoldersResponse, s as BridgeRoutesRequest, t as BridgeRoutesResponse, u as ServiceProbeResponse, v as ClobMarketsResponse, w as ClobMarketResponse, x as ClobTradesResponse, y as ClobOhlcResponse, z as ClobOrderBookResponse, D as RpcClient } from './native-events-OYgkLZOg.cjs';
export { E as API_STREAM_TOPICS, F as AccountPolicy, G as AccountProofResponse, H as Address, I as AddressActivityArchiveRedirect, J as AddressActivityEntry, K as AddressActivityKind, L as AddressActivityKindResponse, Q as AddressActivityKindRetention, U as AddressLabelRecord, V as AgentReputationCategoryScope, W as AgentReputationRecord, X as AgentReputationResponse, Y as ApiStreamTopic, Z as ApiStreamTopicMetadata, _ as ApiStreamTopicRetention, $ as AssetPolicy, a0 as AttestationWindow, a1 as BRIDGE_QUOTE_API_BLOCKED_REASON, a2 as BRIDGE_REVERT_TAGS, a3 as BRIDGE_SELECTORS, a4 as BRIDGE_SUBMIT_API_BLOCKED_REASON, a5 as BlockHeader, a6 as BlockTag, a7 as BlsCertificateResponse, a8 as BridgeAdminControl, a9 as BridgeBytesInput, aa as BridgeCircuitBreakerState, ab as BridgePrecompileError, ac as BridgeQuoteSubmitReadiness, ad as BridgeRiskTier, ae as BridgeRouteAssessment, af as BridgeRouteCandidate, ag as BridgeRouteCatalogue, ah as BridgeRouteCatalogueError, ai as BridgeRouteCatalogueJsonOptions, aj as BridgeRouteCataloguePayload, ak as BridgeRouteCatalogueRoute, al as BridgeRouteCatalogueValidation, am as BridgeRouteDisclosure, an as BridgeRouteSelection, ao as BridgeRoutesSource, ap as BridgeTransferIntent, aq as BridgeTransferRequest, ar as BridgeVerifierDisclosure, as as CHAIN_REGISTRY, at as CHAIN_REGISTRY_RAW_BASE, au as CallRequest, av as CapabilitiesResponse, aw as CapabilityDescriptor, ax as ChainInfo, ay as ChainRegistry, az as CheckpointRecord, aA as ClobMarketRecord, aB as ClobMarketSummary, aC as ClobTrade, aD as ClusterDelegatorsResponse, aE as ClusterDirectoryEntryResponse, aF as ClusterDirectoryPageResponse, aG as ClusterEntityResponse, aH as ClusterMemberResponse, aI as ClusterResignationRow, aJ as ClusterResignationsResponse, aK as ClusterStatusResponse, aL as DagParent, aM as DagParentsResponse, aN as DagSyncStatus, aO as DecodeTxExtension, aP as DecodeTxLog, aQ as DecodeTxPqAttestation, aR as DecodeTxResponse, aS as DelegationCapResponse, aT as DelegationHistoryRecord, aU as DelegationRow, aV as DelegationsResponse, aW as DutyAbsence, aX as EncryptionKeyResponse, aY as EntityRatchetResponse, aZ as ExplorerEndpoint, a_ as FeeHistoryResponse, a$ as GapRange, b0 as GapRecord, b1 as GapRecordsResponse, b2 as Hash, b3 as Hex, b4 as IndexerStatus, b5 as JailStatusWindow, b6 as KeyRotationWindow, b7 as LythUpgradePlanStatus, b8 as LythUpgradeStatusResponse, b9 as MAX_NATIVE_RECEIPT_EVENTS, ba as MempoolSnapshot, bb as MeshDecodedTx, bc as MeshSignedTxResponse, bd as MeshTxIntent, be as MeshUnsignedTxResponse, bf as MetricsRangeResponse, bg as MetricsRangeSample, bh as MetricsRangeSeries, bi as MetricsRangeStatus, bj as MrcAccountRecord, bk as MrcMetadataRecord, bl as MrcPolicyRecord, bm as MrcPolicySpendRecord, bn as NATIVE_MARKET_EVENT_FAMILY, bo as NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC, bp as NO_EVM_ARCHIVE_PROOF_SCHEMA, bq as NO_EVM_ARCHIVE_SIGNATURE_SCHEME, br as NO_EVM_FINALITY_EVIDENCE_SCHEMA, bs as NO_EVM_FINALITY_EVIDENCE_SOURCE, bt as NO_EVM_RECEIPTS_ROOT_DOMAIN, bu as NO_EVM_RECEIPT_CODEC, bv as NO_EVM_RECEIPT_PROOF_SCHEMA, bw as NO_EVM_RECEIPT_PROOF_TYPE, bx as NO_EVM_RECEIPT_ROOT_ALGORITHM, by as NativeAgentArbiterStateRecord, bz as NativeAgentAttestationStateRecord, bA as NativeAgentAvailabilityStateRecord, bB as NativeAgentConsentStateRecord, bC as NativeAgentEscrowStateRecord, bD as NativeAgentIssuerStateRecord, bE as NativeAgentPolicySpendStateRecord, bF as NativeAgentPolicyStateRecord, bG as NativeAgentReputationReviewStateRecord, bH as NativeAgentServiceStateRecord, bI as NativeAgentStateFilterParamValue, bJ as NativeAgentStateResponseFilters, bK as NativeAgentStateSource, bL as NativeCollectionRoyaltyStateRecord, bM as NativeEventConsumer, bN as NativeEventProjection, bO as NativeEventsResponseFilters, bP as NativeEventsSource, bQ as NativeMarketOrderBookDelta, bR as NativeMarketOrderBookDeltasResponseFilters, bS as NativeMarketOrderBookDeltasSource, bT as NativeMarketOrderBookStreamAction, bU as NativeMarketOrderBookStreamPayload, bV as NativeMarketStateFilterParamValue, bW as NativeMarketStateResponseFilters, bX as NativeMarketStateSource, bY as NativeModuleForwarderDescriptor, bZ as NativeMrcPolicyProjection, b_ as NativeNftListingStateRecord, b$ as NativeReceiptCounters, c0 as NativeReceiptEvent, c1 as NativeReceiptSource, c2 as NativeSpotMarketStateRecord, c3 as NativeSpotOrderStateRecord, c4 as NetworkClientOptions, c5 as NetworkSlug, c6 as NoEvmArchiveCoveringSnapshot, c7 as NoEvmArchiveProof, c8 as NoEvmArchiveSignatureVerification, c9 as NoEvmArchiveSignatureVerificationIssue, ca as NoEvmArchiveSignatureVerificationIssueCode, cb as NoEvmArchiveTrustedSigner, cc as NoEvmBlockBlsFinalityVerification, cd as NoEvmBlsFinalityVerification, ce as NoEvmFinalityBlockReference, cf as NoEvmFinalityCertificate, cg as NoEvmFinalityEvidence, ch as NoEvmReceiptFinalityTrustPolicy, ci as NoEvmReceiptProof, cj as NoEvmReceiptProofError, ck as NoEvmReceiptProofErrorCode, cl as NoEvmReceiptProofVerification, cm as NoEvmReceiptTrustIssue, cn as NoEvmReceiptTrustIssueCode, co as NoEvmReceiptTrustPolicy, cp as NoEvmReceiptTrustVerification, cq as NoEvmReceiptTrustedBlsSigner, cr as OperatorAuthorityResponse, cs as OperatorInfoResponse, ct as OperatorRiskResponse, cu as OperatorSigningActivityResponse, cv as OperatorSigningEntry, cw as OperatorSurfaceCapability, cx as OperatorSurfaceStatus, cy as P2pSeed, cz as PeerSummary, cA as PeerSummaryAggregate, cB as PendingRewardsRow, cC as PendingTxSummary, cD as PrecompileCatalogueResponse, cE as PrecompileDescriptor, cF as Quantity, cG as RankedBridgeRoute, cH as ReceiptProofTrustArchivePolicy, cI as ReceiptProofTrustArchiveSigner, cJ as ReceiptProofTrustFinalityPolicy, cK as ReceiptProofTrustFinalitySigner, cL as ReceiptProofTrustPolicy, cM as RedemptionQueueTicket, cN as RegistryRecord, cO as ReportServiceProbeRequest, cP as ReportServiceProbeResponse, cQ as RichListHolder, cR as RichListResponse, cS as RoundInfo, cT as RpcClientOptions, cU as RpcEndpoint, cV as RuntimeProvenanceResponse, cW as SearchHit, cX as ServiceProbeStatusLabel, cY as SigningEntryStatus, cZ as StorageProofBatch, c_ as SyncStatus, c$ as TESTNET_69420, d0 as TokenBalanceMrcIdentity, d1 as TokenBalanceRecord, d2 as TpmAttestationResponse, d3 as TransactionReceipt, d4 as TransactionView, d5 as TxFeedReceipt, d6 as TxFeedTransaction, d7 as TxStatusFoundResponse, d8 as TxStatusNotFoundResponse, d9 as TxStatusResponse, da as UpcomingDutiesResponse, db as UpcomingDutyMap, dc as UserAddressInput, dd as VertexAtRound, de as VerticesAtRoundResponse, df as assertNativeMarketOrderBookStreamPayload, dg as assessBridgeRoute, dh as bridgeAddressHex, di as bridgeQuoteSubmitReadiness, dj as bridgeRoutesReadiness, dk as bridgeTransferCandidates, dl as buildBridgeRouteCatalogue, dm as computeNoEvmDacFinalityMessage, dn as computeNoEvmLeaderFinalityMessage, dp as computeNoEvmReceiptsRoot, dq as computeNoEvmRoundFinalityMessage, dr as computeNoEvmTargetReceiptHash, ds as consumeNativeEvents, dt as decodeNativeAgentStateResponse, du as decodeNativeMarketOrderBookDeltasResponse, dv as decodeNativeReceiptResponse, dw as decodeNoEvmReceiptTranscript, dx as decodeTxFeedResponse, dy as encodeBlockSelector, dz as encodeLockBridgeConfigCalldata, dA as encodeSetBridgeResumeCooldownCalldata, dB as encodeSetBridgeRouteFinalityCalldata, dC as exportBridgeRouteCatalogueJson, dD as fetchChainInfoLatest, dE as fetchChainRegistryLatest, dF as getChainInfo, dG as getNoEvmReceiptTrustPolicy, dH as getP2pSeeds, dI as getRpcEndpoints, dJ as isBridgeAdminLockedRevert, dK as isBridgeCooldownZeroRevert, dL as isBridgeFinalityZeroRevert, dM as isBridgeResumeCooldownActiveRevert, dN as isNativeDecodedEvent, dO as isNativeMarketOrderBookStreamPayload, dP as nativeAgentStateFilterParams, dQ as nativeEventMatches, dR as nativeEventsFilterParams, dS as nativeEventsFromHistory, dT as nativeEventsFromReceipt, dU as nativeMarketEventFilter, dV as nativeMarketEventsFromHistory, dW as nativeMarketEventsFromReceipt, dX as nativeMarketStateFilterParams, dY as noEvmReceiptTrustPolicyFromChainInfo, dZ as normalizeBridgeRouteCatalogue, d_ as parseBridgeRouteCatalogueJson, d$ as parseChainRegistryToml, e0 as parseNativeDecodedEvent, e1 as parseQuantity, e2 as parseQuantityBig, e3 as rankBridgeRoutes, e4 as selectBridgeTransferRoute, e5 as validateBridgeRouteCatalogue, e6 as verifyNoEvmArchiveProofSignatures, e7 as verifyNoEvmBlockFinalityEvidenceMultisig, e8 as verifyNoEvmBlockFinalityEvidenceThreshold, e9 as verifyNoEvmFinalityEvidenceMultisig, ea as verifyNoEvmFinalityEvidenceThreshold, eb as verifyNoEvmReceiptProof, ec as verifyNoEvmReceiptProofTrust } from './native-events-OYgkLZOg.cjs';
import { N as NativeEvmTxFields, E as EncryptionKey, M as MempoolClass, a as MlDsa65Backend } from './submission-CQwob_nn.cjs';
export { M as MONOLYTHIUM_TESTNET_CHAIN_ID, a as MONOLYTHIUM_TESTNET_NETWORK_NAME, b as MonolythiumNetworkConfig } from './network-BK2u9br2.cjs';

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
 * Request parameters for `lyth_mrcAccount` and `/api/v1/mrc/accounts/{account}`.
 */
type MrcAccountRequest = {
    /**
     * Account address to inspect.
     */
    account: string;
    /**
     * Optional spend-row limit.
     */
    spendLimit?: number;
};

/**
 * Request parameters for `lyth_mrcHolders` and `/api/v1/mrc/.../holders`.
 */
type MrcHoldersRequest = {
    /**
     * MRC standard, for example `mrc20`, `mrc721`, `mrc1155`, or `mrc4626`.
     */
    standard: string;
    /**
     * MRC asset id, collection id, or MRC-4626 vault id.
     */
    assetId: string;
    /**
     * Token id inside the MRC holder namespace; `null`/omitted for MRC-4626 vault scope.
     */
    tokenId?: string | null;
    /**
     * Optional result limit.
     */
    limit?: number;
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
 * Versioned MRV deploy payload envelope.
 *
 * Raw artifact deploys remain valid. This envelope is only needed when a
 * deploy carries optional constructor input alongside the canonical artifact.
 */
type MrvDeployPayload = {
    /**
     * Payload schema version.
     */
    version: number;
    /**
     * Canonical MRV artifact bytes.
     */
    artifact: Array<number>;
    /**
     * Optional constructor input already encoded with the artifact ABI.
     */
    constructor: Array<number> | null;
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
     * Deploy input bytes as `0x`-hex.
     *
     * Raw bincode MRV artifact bytes remain accepted. Constructor-bearing
     * deploys use [`encode_mrv_deploy_payload`] to place a versioned payload
     * envelope in this field.
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
    executionUnitsUsed: number;
    executionUnitLimit: number;
    basePricePerCycleLythoshi: string;
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
    valueLythoshi: string;
    maxExecutionFeeLythoshi: string;
    priorityTipLythoshi: string;
    executionUnitLimit: number;
    fee: NativeReceiptFee;
    input: string;
    signedEnvelope: string;
}
interface ApiTransactionReceipt {
    txHash: string;
    blockHash: string;
    blockHeight: number;
    txIndex: number;
    status: number;
    executionUnitsUsed: number;
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
type ApiTransactionNativeReceiptData<TDecoded = unknown> = NativeReceiptResponse<TDecoded>;
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
    streams(): Promise<ApiStreamsIndexResponse>;
    transactions(limit?: number, cursor?: string | null): Promise<ApiEnvelope<TxFeedResponse>>;
    transaction(hash: string): Promise<ApiEnvelope<ApiTransactionData>>;
    transactionReceipt(hash: string): Promise<ApiEnvelope<ApiTransactionReceiptData>>;
    transactionNativeReceipt<TDecoded = unknown>(hash: string): Promise<ApiEnvelope<ApiTransactionNativeReceiptData<TDecoded>>>;
    /**
     * Typed native event rows from `/transactions/{hash}/native-receipt`.
     *
     * This helper consumes the existing native receipt API route and returns
     * its envelope metadata with `data` replaced by the filtered event rows.
     */
    transactionNativeReceiptEvents<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(hash: string, filter?: NativeEventFilter): Promise<ApiEnvelope<Array<TypedNativeReceiptEvent<TDecoded>>>>;
    transactionNativeReceiptMarketEvents<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(hash: string, filter?: NativeEventFilter): Promise<ApiEnvelope<Array<TypedNativeReceiptEvent<TDecoded>>>>;
    nativeEvents<TDecoded = unknown>(filter: NativeEventsFilter): Promise<ApiEnvelope<NativeEventsResponse<TDecoded>>>;
    nativeEventsTyped<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(filter: NativeEventsFilter): Promise<ApiEnvelope<NativeEventsResponse<TDecoded>>>;
    nativeMarketEvents<TDecoded = unknown>(filter: NativeEventsFilter): Promise<ApiEnvelope<NativeEventsResponse<TDecoded>>>;
    nativeMarketEventsTyped<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(filter: NativeEventsFilter): Promise<ApiEnvelope<NativeEventsResponse<TDecoded>>>;
    nativeAgentState(filter?: NativeAgentStateFilter): Promise<ApiEnvelope<NativeAgentStateResponse>>;
    nativeMarketState(filter?: NativeMarketStateFilter): Promise<ApiEnvelope<NativeMarketStateResponse>>;
    nativeMarketOrderBookDeltas(filter: NativeMarketOrderBookDeltasRequest): Promise<ApiEnvelope<NativeMarketOrderBookDeltasResponse>>;
    addressProfile(address: string): Promise<ApiEnvelope<AddressProfileResponse>>;
    addressFlow(address: string, limit?: number): Promise<ApiEnvelope<AddressFlowResponse>>;
    addressActivity(address: string, limit?: number, cursor?: string | null): Promise<ApiEnvelope<ApiAddressActivityData>>;
    addressActivityKind(address: string): Promise<ApiEnvelope<ApiAddressActivityKindData>>;
    addressPendingRewards(address: string, block?: BlockSelector | null): Promise<ApiEnvelope<PendingRewardsResponse>>;
    addressRedemptionQueue(address: string, block?: BlockSelector | null): Promise<ApiEnvelope<RedemptionQueueResponse>>;
    assetMrcMetadata(assetId: string, mrcTokenId?: string | null): Promise<ApiEnvelope<MrcMetadataResponse>>;
    mrcAccount(account: string, limit?: number | null): Promise<ApiEnvelope<MrcAccountResponse>>;
    mrcHolders(standard: string, assetId: string, tokenId: string, limit?: number | null): Promise<ApiEnvelope<MrcHoldersResponse>>;
    /**
     * Asset-scoped `/api/v1/mrc/{standard}/{assetId}/holders`.
     *
     * This is the REST form used by MRC-4626 vault share balances.
     */
    mrcAssetHolders(standard: string, assetId: string, limit?: number | null): Promise<ApiEnvelope<MrcHoldersResponse>>;
    /** `/api/v1/mrc/mrc4626/{vaultId}/holders`. */
    mrc4626Holders(vaultId: string, limit?: number | null): Promise<ApiEnvelope<MrcHoldersResponse>>;
    /**
     * `/api/v1/bridge/routes`.
     *
     * The forthcoming route is read-only `GET`, so the typed request is encoded
     * as a single JSON query value named `request`.
     */
    bridgeRoutes(request: BridgeRoutesRequest): Promise<ApiEnvelope<BridgeRoutesResponse>>;
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

declare const NATIVE_DEV_HOST_API_VERSION: "0.1.0";
declare const NATIVE_DEV_MANIFEST_SCHEMA_VERSION: 1;
declare const NATIVE_DEV_IPC_PROTOCOL_VERSION: "mono.native-dev.ipc.v1";
type NativeDevkitChannel = "stable" | "testnet" | "local";
type NativeDevkitSidecarStatus = "missing" | "stopped" | "starting" | "running" | "unhealthy";
type NativeDevkitCompatibility = "compatible" | "too_old_for_host" | "too_new_for_host" | "invalid_manifest";
type StudioHostState = "disabled" | "missing_devkit" | "incompatible_devkit" | "ready";
type NativeDevRiskSeverity = "info" | "warning" | "critical";
interface NativeDevRiskLabel {
    id: string;
    title: string;
    severity: NativeDevRiskSeverity;
    detail: string;
}
interface NativeDevkitArchive {
    url: string;
    sha256: string;
    signature: string;
    signatureScheme?: "ed25519";
    signingKeyId?: string;
    trustRoot?: string;
    signingPublicKey?: string;
    sizeBytes?: number;
}
interface NativeDevkitSidecarManifest {
    binaryName: string;
    ipcProtocolVersion: string;
}
interface NativeDevkitManifest {
    schemaVersion: typeof NATIVE_DEV_MANIFEST_SCHEMA_VERSION;
    devkitVersion: string;
    channel: NativeDevkitChannel;
    minimumWalletHostApi: string;
    maximumWalletHostApi: string;
    monoCoreCommit: string;
    monoCoreSdkCommit: string;
    archive: NativeDevkitArchive;
    sidecar: NativeDevkitSidecarManifest;
    releaseNotesUrl?: string;
}
interface NativeDevkitStatus {
    installedVersion?: string;
    channel: NativeDevkitChannel;
    hostApiVersion: string;
    installPath?: string;
    sidecarStatus: NativeDevkitSidecarStatus;
    manifest?: NativeDevkitManifest;
    compatibility: NativeDevkitCompatibility;
    message: string;
}
interface StudioHostStatus {
    state: StudioHostState;
    developerModeEnabled: boolean;
    hostApiVersion: string;
    devkit: NativeDevkitStatus;
}
interface NativeDevSidecarReadyMessage {
    direction: "sidecar_to_host";
    kind: "ready";
    protocolVersion: string;
    devkitVersion: string;
    workspaceRoot?: string;
}
interface NativeDevSidecarProjectEventMessage {
    direction: "sidecar_to_host";
    kind: "project_event";
    protocolVersion?: string;
    projectId: string;
    event: "created" | "opened" | "build_started" | "build_finished" | "test_finished" | "simulation_finished";
    summary: string;
}
interface NativeDevSidecarApprovalRequestMessage {
    direction: "sidecar_to_host";
    kind: "approval_request";
    protocolVersion?: string;
    request: NativeDevWalletApprovalRequest;
}
type NativeDevCommandName = "readiness" | "build" | "validate" | "test" | "simulate" | "trace" | "deploy_plan";
interface NativeDevSidecarCommandResultMessage {
    direction: "sidecar_to_host";
    kind: "command_result";
    protocolVersion?: string;
    command: NativeDevCommandName;
    requestId: string;
    ok: boolean;
    preview: boolean;
    output?: unknown;
    error?: string;
}
interface NativeDevHostContextMessage {
    direction: "host_to_sidecar";
    kind: "host_context";
    selectedProjectRoot?: string;
    activeNetwork: {
        networkId: string;
        name: string;
    };
    readOnlyWalletAddress?: string;
}
interface NativeDevHostApprovalResultMessage {
    direction: "host_to_sidecar";
    kind: "approval_result";
    protocolVersion?: string;
    requestId: string;
    approved: boolean;
    reason?: string;
}
interface NativeDevHostCommandMessage {
    direction: "host_to_sidecar";
    kind: "devkit_command";
    protocolVersion?: string;
    requestId: string;
    command: NativeDevCommandName;
    selectedProjectRoot?: string;
    authorityAddress?: string;
    networkId?: string;
}
type NativeDevIpcMessage = NativeDevSidecarReadyMessage | NativeDevSidecarProjectEventMessage | NativeDevSidecarApprovalRequestMessage | NativeDevSidecarCommandResultMessage | NativeDevHostContextMessage | NativeDevHostApprovalResultMessage | NativeDevHostCommandMessage;
type NativeDevApprovalKind = "mrv_deploy" | "mrv_call" | "mrc_token_create" | "verification_publish";
interface NativeDevWalletApprovalRequest {
    id: string;
    kind: NativeDevApprovalKind;
    createdAt: string;
    origin: "mono_studio_host" | "mono_devkit" | "lyth_dev_mcp";
    networkId: string;
    authorityAddress: string;
    title: string;
    summary: string;
    riskLabels: NativeDevRiskLabel[];
    payload: Record<string, unknown>;
}
interface NativeDevMrvDeployPlan {
    networkId: string;
    authorityAddress: string;
    expectedContractAddress: string;
    artifactHash: string;
    abiHash: string;
    valueLythoshi: string;
    executionUnitLimit: string;
    maxExecutionFeeLythoshi: string;
    constructorInput: string;
    riskLabels: NativeDevRiskLabel[];
    abiManifest?: MrvAbiManifest;
    walletApprovalRequest: NativeDevWalletApprovalRequest;
}
type NativeDevMrcAssetKind = "mrc20_fixed_supply" | "mrc20_capped_mint" | "mrc721_collection" | "mrc1155_collection" | "mrc4626_vault";
interface NativeDevMrcAllocation {
    address: string;
    amount: string;
}
interface NativeDevMrcTokenPlan {
    assetKind: NativeDevMrcAssetKind;
    name: string;
    symbol: string;
    decimals: number;
    supplyPolicy: "fixed" | "capped" | "collection" | "vault";
    mintPolicy: "none" | "issuer" | "role";
    transferPolicy: "open" | "restricted";
    metadataPolicy: "immutable" | "mutable";
    adminRoles: string[];
    issuerAddress: string;
    initialAllocations: NativeDevMrcAllocation[];
    riskLabels: NativeDevRiskLabel[];
    walletApprovalRequest: NativeDevWalletApprovalRequest;
}
interface NativeDevVerificationBundle {
    bundleHash: string;
    contractPassport: NativeDevContractPassport;
    artifact: {
        artifactHash: string;
        sourceBundleHash: string;
        abiHash: string;
    };
    files: Array<{
        path: string;
        hash: string;
    }>;
    walletApprovalRequest?: NativeDevWalletApprovalRequest;
}
interface NativeDevContractPassport {
    address: string;
    artifactHash: string;
    sourceBundleHash: string;
    abiHash: string;
    compilerVersion: string;
    sdkVersion: string;
    templateId?: string;
    verificationStatus: "draft" | "submitted" | "verified" | "rejected";
    riskLabels: NativeDevRiskLabel[];
    deployTx?: string;
    issuer: string;
}
declare function compareNativeDevVersions(left: string, right: string): number;
declare function checkNativeDevkitCompatibility(manifest: NativeDevkitManifest | undefined, hostApiVersion?: string): NativeDevkitCompatibility;
declare function resolveStudioHostStatus(args: {
    developerModeEnabled: boolean;
    channel: NativeDevkitChannel;
    hostApiVersion?: string;
    installPath?: string;
    manifest?: NativeDevkitManifest;
    sidecarStatus?: NativeDevkitSidecarStatus;
}): StudioHostStatus;
declare function assertNativeDevWalletApprovalRequest(request: NativeDevWalletApprovalRequest): void;
declare function assertNativeDevMrvDeployPlan(plan: NativeDevMrvDeployPlan): void;
declare function assertNativeDevMrcTokenPlan(plan: NativeDevMrcTokenPlan): void;
declare function nativeDevUiStrings(): readonly string[];
declare function nativeDevSchemaFieldNames(): readonly string[];

/**
 * Address display helpers.
 *
 * Monolythium keeps 20-byte account identifiers on the wire, but
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
interface MrvDeployPayloadRequestOptions extends MrvRequestBuildOptions {
    constructorInput?: MrvBytesLike | null;
}
interface MrvDeployPayloadPlanOptions extends MrvDeployPayloadRequestOptions {
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
type MrvDeployNativeTxOptions = Omit<MrvDeployPlanOptions, "executionUnitLimit" | "maxExecutionFeeLythoshi" | "nonce"> & {
    chainId: number | bigint;
    nonce: number | bigint;
    executionUnitLimit: number | bigint;
    maxExecutionFeeLythoshi: MrvDecimalLike;
};
type MrvDeployPayloadNativeTxOptions = Omit<MrvDeployPayloadPlanOptions, "executionUnitLimit" | "maxExecutionFeeLythoshi" | "nonce"> & {
    chainId: number | bigint;
    nonce: number | bigint;
    executionUnitLimit: number | bigint;
    maxExecutionFeeLythoshi: MrvDecimalLike;
};
type MrvCallNativeTxOptions = Omit<MrvRequestBuildOptions, "executionUnitLimit" | "maxExecutionFeeLythoshi" | "nonce"> & {
    chainId: number | bigint;
    nonce: number | bigint;
    executionUnitLimit: number | bigint;
    maxExecutionFeeLythoshi: MrvDecimalLike;
};
interface MrvNativeTxFacade {
    chainId: bigint;
    nonce: bigint;
    valueLythoshi: string;
    executionUnitLimit: bigint;
    maxExecutionFeeLythoshi: string;
    priorityTipLythoshi: string;
}
interface MrvNativeFeePreview {
    totalLythoshi: string;
    totalLyth: string;
    cyclesUsed: bigint;
    executionUnitLimit: bigint;
    maxExecutionFeeLythoshi: string;
    priorityTipLythoshi: string;
}
interface MrvDeployNativeTxPlan extends MrvDeployPlan {
    nativeTx: MrvNativeTxFacade;
    feePreview: MrvNativeFeePreview;
    tx: NativeEvmTxFields;
}
interface MrvCallNativeTxPlan extends MrvCallPlan {
    nativeTx: MrvNativeTxFacade;
    feePreview: MrvNativeFeePreview;
    tx: NativeEvmTxFields;
}
interface MrvEncryptedSubmissionResult {
    envelopeWireHex: string;
    innerSighashHex: string;
    innerTxHashHex: string;
    innerWireBytes: number;
    txHash: string;
}
type MrvDeploySubmitOptions = MrvDeployNativeTxOptions & {
    encryptionKey?: EncryptionKey;
    class?: MempoolClass;
};
type MrvDeployPayloadSubmitOptions = MrvDeployPayloadNativeTxOptions & {
    encryptionKey?: EncryptionKey;
    class?: MempoolClass;
};
type MrvCallSubmitOptions = MrvCallNativeTxOptions & {
    encryptionKey?: EncryptionKey;
    class?: MempoolClass;
};
type MrvDeploySubmission = MrvDeployNativeTxPlan & MrvEncryptedSubmissionResult;
type MrvDeployPayloadSubmission = MrvDeployNativeTxPlan & MrvEncryptedSubmissionResult;
type MrvCallSubmission = MrvCallNativeTxPlan & MrvEncryptedSubmissionResult;
declare const MRV_FORMAT_VERSION: 1;
declare const MRV_DEPLOY_PAYLOAD_VERSION: 1;
declare const MRV_PROFILE_MONO_RV32IM_V1: "mono_rv32im_v1";
declare const MRV_MEMORY_PAGE_BYTES: 65536;
declare const MRV_MAX_CODE_BYTES: number;
declare const MRV_MAX_DEBUG_BYTES: number;
declare const MRV_MAX_MEMORY_PAGES: 1024;
declare const MRV_MAX_ABI_SYMBOLS: 1024;
declare const MRV_MAX_STORAGE_NAMESPACE_BYTES: 64;
declare const LYTH_DECIMALS: 8;
declare const NATIVE_LYTH_DECIMALS: 8;
declare const LYTHOSHI_PER_LYTH = 100000000n;
declare const MRV_TX_EXTENSION_KIND: 48;
declare const MRV_TX_EXTENSION_V1: 1;
declare class MrvValidationError extends Error {
    constructor(message: string);
}
interface LythFormatOptions {
    includeUnit?: boolean;
}
declare const MRV_STRUCTURED_FEE_FIELDS: readonly ["total_lythoshi", "cycles_used", "base_price_per_cycle_lythoshi", "state_io_units", "state_io_price_per_unit_lythoshi", "priority_tip_lythoshi"];
interface MrvFeeDisplayConformanceInput {
    expectedTotalLythoshi: MrvDecimalLike;
    defaultFeeText: string;
    detailTexts?: readonly string[];
    structuredFee?: unknown;
    customFeeInputVisible?: boolean;
    speedUpCancelVisible?: boolean;
}
interface MrvFeeDisplayConformanceReport {
    passed: boolean;
    failures: string[];
    expectedDefaultFeeText: string;
}
interface MrvStructuredFeeConformanceOptions {
    expectedTotalLythoshi?: MrvDecimalLike;
    label?: string;
}
interface MrvStructuredFeeConformanceReport {
    passed: boolean;
    failures: string[];
}
interface NativeReceiptFeeDisplay {
    defaultFeeText: string;
    detailTexts: string[];
    totalLythoshi: string;
    totalLyth: string;
}
declare function formatLyth(lythoshi: MrvDecimalLike, options?: LythFormatOptions): string;
declare function formatLythoshi(lythoshi: MrvDecimalLike, options?: LythFormatOptions): string;
declare function parseLythToLythoshi(input: string): bigint;
declare function checkMrvFeeDisplayConformance(input: MrvFeeDisplayConformanceInput): MrvFeeDisplayConformanceReport;
declare function checkMrvStructuredFeeConformance(value: unknown, options?: MrvStructuredFeeConformanceOptions): MrvStructuredFeeConformanceReport;
declare function assertMrvStructuredFeeConformance(value: unknown, options?: MrvStructuredFeeConformanceOptions): asserts value is NativeReceiptFee;
declare function assertMrvFeeDisplayConformance(input: MrvFeeDisplayConformanceInput): void;
declare function formatNativeReceiptFeeDisplay(fee: Pick<NativeReceiptFee, "total_lythoshi" | "cycles_used" | "state_io_units" | "base_price_per_cycle_lythoshi" | "state_io_price_per_unit_lythoshi" | "priority_tip_lythoshi">): NativeReceiptFeeDisplay;
declare function mrvCodeHashHex(code: MrvBytesLike): string;
declare function mrvV1TransactionExtension(): MrvTransactionExtension;
declare function encodeMrvDeployPayload(artifactBytes: MrvBytesLike, constructorInput?: MrvBytesLike | null): string;
declare function mrvAddressToBech32(kind: MrvAddressKind, bytes: MrvBytesLike): string;
declare function mrvBech32ToAddress(address: string, expectedKind?: MrvAddressKind): TypedAddress;
declare function deriveMrvContractAddress(deployerAddress: string, deployerNonce: number | bigint, artifactHashHex: string): string;
declare function validateMrvArtifactMetadata(metadata: MrvArtifactMetadata, code: MrvBytesLike): MrvValidatedArtifactMetadata;
declare function validateMrvDeployRequest(request: MrvDeployRequest): void;
declare function validateMrvCallRequest(request: MrvCallRequest): void;
declare function buildMrvDeployRequest(artifactBytes: MrvBytesLike, options?: MrvRequestBuildOptions): MrvDeployRequest;
declare function buildMrvDeployPayloadRequest(artifactBytes: MrvBytesLike, options?: MrvDeployPayloadRequestOptions): MrvDeployRequest;
declare function buildMrvCallRequest(contractAddress: string, input?: MrvBytesLike, options?: MrvRequestBuildOptions): MrvCallRequest;
declare function buildMrvDeployPlan(artifactBytes: MrvBytesLike, options?: MrvDeployPlanOptions): MrvDeployPlan;
declare function buildMrvDeployPayloadPlan(artifactBytes: MrvBytesLike, options?: MrvDeployPayloadPlanOptions): MrvDeployPlan;
declare function buildMrvCallPlan(contractAddress: string, input?: MrvBytesLike, options?: MrvRequestBuildOptions): MrvCallPlan;
declare function buildMrvDeployNativeTxPlan(artifactBytes: MrvBytesLike, options: MrvDeployNativeTxOptions): MrvDeployNativeTxPlan;
declare function buildMrvDeployPayloadNativeTxPlan(artifactBytes: MrvBytesLike, options: MrvDeployPayloadNativeTxOptions): MrvDeployNativeTxPlan;
declare function buildMrvCallNativeTxPlan(contractAddress: string, input: MrvBytesLike, options: MrvCallNativeTxOptions): MrvCallNativeTxPlan;
declare function assertMrvDeployNativeSubmissionPlan(plan: MrvDeployNativeTxPlan): void;
declare function assertMrvCallNativeSubmissionPlan(plan: MrvCallNativeTxPlan): void;
declare function submitMrvDeployNativeTx(client: RpcClient, backend: MlDsa65Backend, artifactBytes: MrvBytesLike, options: MrvDeploySubmitOptions): Promise<MrvDeploySubmission>;
declare function submitMrvDeployPayloadNativeTx(client: RpcClient, backend: MlDsa65Backend, artifactBytes: MrvBytesLike, options: MrvDeployPayloadSubmitOptions): Promise<MrvDeployPayloadSubmission>;
declare function submitMrvCallNativeTx(client: RpcClient, backend: MlDsa65Backend, contractAddress: string, input: MrvBytesLike, options: MrvCallSubmitOptions): Promise<MrvCallSubmission>;

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
 * SDK-exposed native/precompile address map for the current v4.1 surface.
 *
 * Sourced from `mono-core` runtime/precompile constants and pinned here
 * so surfaces can render precompile traffic by name without
 * re-defining low-band address literals.
 *
 * `0x1002` and `0x1006` are intentionally absent from the SDK surface
 * because the current v4.1 launch surface does not define those application
 * modules.
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
 * Delegation precompile ABI helpers.
 *
 * The V4.1 redemption completion call prunes a matured redemption
 * queue ticket. It does not imply principal payout until mono-core adds
 * stake-vault/redemption-escrow accounting.
 */
declare const DELEGATION_SELECTORS: {
    readonly completeRedemption: "0x26169d0a";
};
declare const DELEGATION_REVERT_TAGS: {
    readonly redemptionQueueFull: "0x020e";
    readonly redemptionTicketNotFound: "0x020f";
    readonly redemptionNotMature: "0x0210";
    readonly redemptionPrincipalUnavailable: "0x0211";
};
declare class DelegationPrecompileError extends Error {
    constructor(message: string);
}
declare function delegationAddressHex(): string;
declare function encodeCompleteRedemptionCalldata(index: bigint | number | string): string;
declare function isRedemptionPrincipalUnavailableRevert(data: string | Uint8Array | readonly number[]): boolean;

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
    dailyCapLythoshi: bigint | number | string;
    perTxCapLythoshi: bigint | number | string;
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
 * Native market transaction-plan builders.
 *
 * These helpers only build signer-ready transaction requests or native module
 * call material. They do not predict fills, trades, or execution success.
 */

declare const CLOB_MARKET_ID_DOMAIN_TAG: 193;
declare const NATIVE_MARKET_MODULE_ADDRESS_BYTES: "0x4d41524b45545f4e41544956455f4d4f445f5631";
declare const NATIVE_MARKET_MODULE_ADDRESS: string;
declare const NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE: "native-call-forwarder-v1";
declare const NATIVE_CALL_FORWARDER_RESPONSE_OFFSET: 768;
declare const NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY: 256;
declare const MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES: 2047;
declare const CLOB_SELECTORS: {
    /**
     * `placeLimitOrder(bytes32,bytes32,uint8,uint256,uint256,uint64)`
     *
     * Args: `baseTokenId, quoteTokenId, side, price, amount, expiresAtBlock`.
     */
    readonly placeLimitOrder: "0x2468786f";
    /**
     * `placeMarketOrder(bytes32,bytes32,uint8,uint256,uint16)`
     *
     * Args: `baseTokenId, quoteTokenId, side, quantity, maxSlippageBps`.
     */
    readonly placeMarketOrder: "0xb9b1fa86";
    /**
     * `placeMarketOrderEx(bytes32,bytes32,uint8,uint256,uint16,uint8)`
     *
     * Args: `baseTokenId, quoteTokenId, side, quantity, maxSlippageBps, mode`.
     */
    readonly placeMarketOrderEx: "0xa6f092f0";
    /** `cancelOrder(bytes32)` */
    readonly cancelOrder: "0x7489ec23";
};
type SpotLimitOrderSide = "buy" | "sell";
type SpotMarketOrderMode = "fill-or-refund" | "fill-or-rest-at-cap";
type NativeMarketAddressKind = AddressKind;
type NativeMarketAddressInput = string | Uint8Array | readonly number[] | {
    kind?: NativeMarketAddressKind;
    address: string | Uint8Array | readonly number[];
};
interface PlaceSpotLimitOrderArgs {
    /**
     * Canonical 32-byte CLOB market id, derived as
     * `keccak256(0xC1 || baseTokenId || quoteTokenId)`.
     */
    marketId: string;
    /** 32-byte base token id accepted by the CLOB precompile. */
    baseTokenId: string;
    /** 32-byte quote token id accepted by the CLOB precompile. */
    quoteTokenId: string;
    /** `buy` maps to side byte `0`; `sell` maps to side byte `1`. */
    side: SpotLimitOrderSide;
    /** Positive integer decimal string encoded as uint256. */
    price: string;
    /** Positive integer decimal string encoded as uint256 amount. */
    quantity: string;
    /** Optional uint64 block height; omitted means `0` / no explicit expiry. */
    expiryBlock?: string | number | bigint;
}
interface PlaceSpotMarketOrderArgs {
    /**
     * Canonical 32-byte CLOB market id, derived as
     * `keccak256(0xC1 || baseTokenId || quoteTokenId)`.
     */
    marketId: string;
    /** 32-byte base token id accepted by the CLOB precompile. */
    baseTokenId: string;
    /** 32-byte quote token id accepted by the CLOB precompile. */
    quoteTokenId: string;
    /** `buy` maps to side byte `0`; `sell` maps to side byte `1`. */
    side: SpotLimitOrderSide;
    /** Positive integer decimal string encoded as uint256 amount. */
    quantity: string;
    /** Slippage bound in basis points; must be less than 10,000. */
    maxSlippageBps: string | number | bigint;
}
interface PlaceSpotMarketOrderExArgs extends PlaceSpotMarketOrderArgs {
    /**
     * `fill-or-refund` keeps legacy market-order semantics; `fill-or-rest-at-cap`
     * rests the unfilled remainder at the slippage cap.
     */
    mode: SpotMarketOrderMode;
}
interface CancelSpotOrderArgs {
    /** 32-byte order id returned by the CLOB precompile. */
    orderId: string;
}
interface EncodeNativeSpotLimitOrderArgs {
    /** 32-byte native spot market id. */
    marketId: string;
    /** Owner MonoAddress; 0x addresses and raw 20-byte inputs default to user kind. */
    owner: NativeMarketAddressInput;
    /** Per-owner order nonce encoded as uint64. */
    nonce: string | number | bigint;
    /** `buy` maps to native `OrderSide::Bid`; `sell` maps to native `OrderSide::Ask`. */
    side: SpotLimitOrderSide;
    /** Positive integer decimal string encoded as native MrcAmount/u128. */
    price: string;
    /** Positive integer decimal string encoded as native MrcAmount/u128. */
    quantity: string;
    /** uint64 expiry block encoded as `expires_at_block`. */
    expiresAtBlock: string | number | bigint;
}
interface EncodeNativeSpotCreateMarketArgs {
    /** Market owner MonoAddress; 0x addresses and raw 20-byte inputs default to user kind. */
    owner: NativeMarketAddressInput;
    /** Owner-local market nonce encoded as uint64. */
    nonce: string | number | bigint;
    /** 32-byte base asset id. */
    baseAsset: string;
    /** 32-byte quote asset id. */
    quoteAsset: string;
    /** Positive integer decimal string encoded as native MrcAmount/u128. */
    tickSize: string;
    /** Positive integer decimal string encoded as native MrcAmount/u128. */
    lotSize: string;
    /** Positive integer decimal string encoded as native MrcAmount/u128. */
    minQuantity: string;
    /** Nonnegative integer decimal string encoded as native MrcAmount/u128; 0 disables the floor. */
    minNotional: string;
}
interface EncodeNativeSpotCancelOrderArgs {
    /** 32-byte native order id. */
    orderId: string;
    /** Caller MonoAddress; 0x addresses and raw 20-byte inputs default to user kind. */
    caller: NativeMarketAddressInput;
}
interface EncodeNativeSpotSettleLimitOrderArgs {
    /** Resting maker order id to match. */
    makerOrderId: string;
    /** Taker limit order parameters. */
    takerOrder: EncodeNativeSpotLimitOrderArgs;
}
interface EncodeNativeSpotSettleRoutedLimitOrderArgs {
    /** Resting maker order ids in deterministic settlement order; mono-core accepts 1..64 ids. */
    makerOrderIds: readonly string[];
    /** Taker limit order parameters. */
    takerOrder: EncodeNativeSpotLimitOrderArgs;
}
type NativeNftAssetStandard = "mrc721" | "mrc1155";
type NativeNftListingKind = "fixed-price" | {
    english: {
        /** Minimum starting bid encoded as native MrcAmount/u128. */
        reserve: string;
        /** Auction end block encoded as uint64. */
        endBlock: string | number | bigint;
        /** Minimum bid bump in basis points; must be less than 10,000. */
        minBidIncrementBps: string | number | bigint;
    };
};
interface EncodeNativeNftCreateListingArgs {
    /** Seller MonoAddress; 0x addresses and raw 20-byte inputs default to user kind. */
    seller: NativeMarketAddressInput;
    /** Seller-local listing nonce encoded as uint64. */
    nonce: string | number | bigint;
    /** Native NFT asset standard. */
    standard: NativeNftAssetStandard;
    /** 32-byte collection id. */
    collectionId: string;
    /** 32-byte token id. */
    tokenId: string;
    /** Positive integer decimal string encoded as native MrcAmount/u128. */
    quantity: string;
    /** 32-byte payment asset id. */
    paymentAsset: string;
    /** Positive integer decimal string encoded as native MrcAmount/u128. */
    price: string;
    /** Fixed-price or English-auction sale model. */
    kind: NativeNftListingKind;
    /** uint64 expiry block encoded as `expires_at_block`; 0 means never. */
    expiresAtBlock: string | number | bigint;
}
interface EncodeNativeNftBuyListingArgs {
    /** 32-byte native NFT listing id. */
    listingId: string;
    /** Buyer MonoAddress; 0x addresses and raw 20-byte inputs default to user kind. */
    buyer: NativeMarketAddressInput;
    /** Current block attached to the native buy call. */
    currentBlock: string | number | bigint;
}
interface EncodeNativeNftCancelListingArgs {
    /** 32-byte native NFT listing id. */
    listingId: string;
    /** Caller MonoAddress; 0x addresses and raw 20-byte inputs default to user kind. */
    caller: NativeMarketAddressInput;
}
interface EncodeNativeNftPlaceAuctionBidArgs {
    /** 32-byte native NFT auction listing id. */
    listingId: string;
    /** Bidder MonoAddress; 0x addresses and raw 20-byte inputs default to user kind. */
    bidder: NativeMarketAddressInput;
    /** Positive integer decimal string encoded as native MrcAmount/u128. */
    amount: string;
    /** Current block attached to the native auction bid call. */
    currentBlock: string | number | bigint;
}
interface EncodeNativeNftSettleAuctionArgs {
    /** 32-byte native NFT auction listing id. */
    listingId: string;
    /** Current block attached to the native auction settlement call. */
    currentBlock: string | number | bigint;
}
interface EncodeNativeNftSweepExpiredListingsArgs {
    /** Candidate 32-byte native NFT listing ids; mono-core accepts 1..64 ids. */
    listingIds: readonly string[];
    /** Current block attached to the native listing sweep call. */
    currentBlock: string | number | bigint;
}
interface NativeMarketModuleContractCall {
    /** Stable typed system-module address (`MARKET_NATIVE_MOD_V1`). */
    to: string;
    /** Native market router bincode payload. */
    input: string;
    /** Native market module calls must not carry native value. */
    valueLythoshi: "0";
    /** Maximum cycles delegated to the RISC-V host call. */
    maxCycles: string;
}
interface NativeMarketModuleCallEnvelope {
    module: "market";
    call: NativeMarketModuleContractCall;
}
interface NativeMarketForwarderInput {
    /** Canonical `SyscallRequest::CallContract` bytes for MRV call input. */
    input: string;
    /** Byte length of `input`, useful because the minimal forwarder artifact pins this as an immediate. */
    requestBytes: number;
}
interface NativeCallForwarderArtifact {
    /** Raw bincode MRV artifact bytes for a fixed-size native-call forwarder. */
    artifactBytes: string;
    /** Byte length accepted by the generated forwarder. */
    requestBytes: number;
    /** Stable runtime profile string used for capability matching. */
    artifactProfile: typeof NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE;
    /** Forwarder code-section hash as `0x` hex. */
    codeHash: string;
}
interface EthSendTransactionRequest {
    to: string;
    value: "0x0";
    data: string;
}
interface MarketTransactionPlan {
    method: "eth_sendTransaction";
    params: [EthSendTransactionRequest];
    mempoolClass: MempoolClass;
}
declare class MarketActionError extends Error {
    constructor(message: string);
}
declare function clobAddressHex(): string;
declare function deriveClobMarketId(baseTokenId: string, quoteTokenId: string): string;
declare function deriveNativeSpotMarketId(args: Pick<EncodeNativeSpotCreateMarketArgs, "owner" | "baseAsset" | "quoteAsset" | "nonce">): string;
declare function deriveNativeSpotOrderId(args: Pick<EncodeNativeSpotLimitOrderArgs, "marketId" | "owner" | "side" | "nonce">): string;
declare function encodePlaceLimitOrderCalldata(args: PlaceSpotLimitOrderArgs): string;
declare function encodePlaceMarketOrderCalldata(args: PlaceSpotMarketOrderArgs): string;
declare function encodePlaceMarketOrderExCalldata(args: PlaceSpotMarketOrderExArgs): string;
declare function encodeCancelOrderCalldata(args: CancelSpotOrderArgs): string;
declare function encodeNativeSpotLimitOrderCall(args: EncodeNativeSpotLimitOrderArgs): string;
declare function encodeNativeSpotCreateMarketCall(args: EncodeNativeSpotCreateMarketArgs): string;
declare function encodeNativeSpotCancelOrderCall(args: EncodeNativeSpotCancelOrderArgs): string;
declare function encodeNativeSpotSettleLimitOrderCall(args: EncodeNativeSpotSettleLimitOrderArgs): string;
declare function encodeNativeSpotSettleRoutedLimitOrderCall(args: EncodeNativeSpotSettleRoutedLimitOrderArgs): string;
declare function encodeNativeNftCreateListingCall(args: EncodeNativeNftCreateListingArgs): string;
declare function encodeNativeNftBuyListingCall(args: EncodeNativeNftBuyListingArgs): string;
declare function encodeNativeNftCancelListingCall(args: EncodeNativeNftCancelListingArgs): string;
declare function encodeNativeNftPlaceAuctionBidCall(args: EncodeNativeNftPlaceAuctionBidArgs): string;
declare function encodeNativeNftSettleAuctionCall(args: EncodeNativeNftSettleAuctionArgs): string;
declare function encodeNativeNftSweepExpiredListingsCall(args: EncodeNativeNftSweepExpiredListingsArgs): string;
declare function buildNativeMarketModuleCallEnvelope(input: string, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function encodeNativeMarketModuleForwarderInput(envelope: NativeMarketModuleCallEnvelope): NativeMarketForwarderInput;
declare function buildNativeSpotLimitOrderForwarderInput(args: EncodeNativeSpotLimitOrderArgs, maxCycles: string | number | bigint): NativeMarketForwarderInput;
declare function buildNativeSpotCreateMarketForwarderInput(args: EncodeNativeSpotCreateMarketArgs, maxCycles: string | number | bigint): NativeMarketForwarderInput;
declare function buildNativeSpotCancelOrderForwarderInput(args: EncodeNativeSpotCancelOrderArgs, maxCycles: string | number | bigint): NativeMarketForwarderInput;
declare function buildNativeSpotSettleLimitOrderForwarderInput(args: EncodeNativeSpotSettleLimitOrderArgs, maxCycles: string | number | bigint): NativeMarketForwarderInput;
declare function buildNativeSpotSettleRoutedLimitOrderForwarderInput(args: EncodeNativeSpotSettleRoutedLimitOrderArgs, maxCycles: string | number | bigint): NativeMarketForwarderInput;
declare function buildNativeNftCreateListingForwarderInput(args: EncodeNativeNftCreateListingArgs, maxCycles: string | number | bigint): NativeMarketForwarderInput;
declare function buildNativeNftBuyListingForwarderInput(args: EncodeNativeNftBuyListingArgs, maxCycles: string | number | bigint): NativeMarketForwarderInput;
declare function buildNativeNftCancelListingForwarderInput(args: EncodeNativeNftCancelListingArgs, maxCycles: string | number | bigint): NativeMarketForwarderInput;
declare function buildNativeNftPlaceAuctionBidForwarderInput(args: EncodeNativeNftPlaceAuctionBidArgs, maxCycles: string | number | bigint): NativeMarketForwarderInput;
declare function buildNativeNftSettleAuctionForwarderInput(args: EncodeNativeNftSettleAuctionArgs, maxCycles: string | number | bigint): NativeMarketForwarderInput;
declare function buildNativeNftSweepExpiredListingsForwarderInput(args: EncodeNativeNftSweepExpiredListingsArgs, maxCycles: string | number | bigint): NativeMarketForwarderInput;
declare function buildNativeSpotLimitOrderModuleCall(args: EncodeNativeSpotLimitOrderArgs, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function buildNativeSpotCreateMarketModuleCall(args: EncodeNativeSpotCreateMarketArgs, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function buildNativeSpotCancelOrderModuleCall(args: EncodeNativeSpotCancelOrderArgs, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function buildNativeSpotSettleLimitOrderModuleCall(args: EncodeNativeSpotSettleLimitOrderArgs, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function buildNativeSpotSettleRoutedLimitOrderModuleCall(args: EncodeNativeSpotSettleRoutedLimitOrderArgs, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function buildNativeNftCreateListingModuleCall(args: EncodeNativeNftCreateListingArgs, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function buildNativeNftBuyListingModuleCall(args: EncodeNativeNftBuyListingArgs, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function buildNativeNftCancelListingModuleCall(args: EncodeNativeNftCancelListingArgs, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function buildNativeNftPlaceAuctionBidModuleCall(args: EncodeNativeNftPlaceAuctionBidArgs, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function buildNativeNftSettleAuctionModuleCall(args: EncodeNativeNftSettleAuctionArgs, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function buildNativeNftSweepExpiredListingsModuleCall(args: EncodeNativeNftSweepExpiredListingsArgs, maxCycles: string | number | bigint): NativeMarketModuleCallEnvelope;
declare function buildPlaceSpotLimitOrderPlan(args: PlaceSpotLimitOrderArgs): MarketTransactionPlan;
declare function buildPlaceSpotMarketOrderPlan(args: PlaceSpotMarketOrderArgs): MarketTransactionPlan;
declare function buildPlaceSpotMarketOrderExPlan(args: PlaceSpotMarketOrderExArgs): MarketTransactionPlan;
declare function buildCancelSpotOrderPlan(args: CancelSpotOrderArgs): MarketTransactionPlan;
declare function buildNativeCallForwarderArtifact(requestBytes: string | number | bigint): NativeCallForwarderArtifact;

/**
 * Native agent-commerce transaction-plan builders.
 *
 * These helpers encode the native Rust router bincode payloads consumed by
 * `AGENT_NATIVE_MOD_V01`. They do not predict record ids, escrow settlement,
 * reputation effects, or execution success.
 */

declare const NATIVE_AGENT_MODULE_ADDRESS_BYTES: "0x4147454e545f4e41544956455f4d4f445f563031";
declare const NATIVE_AGENT_MODULE_ADDRESS: string;
type NativeAgentAddressKind = AddressKind;
type NativeAgentAddressInput = string | Uint8Array | readonly number[] | {
    kind?: NativeAgentAddressKind;
    address: string | Uint8Array | readonly number[];
};
interface NativeAgentModuleContractCall {
    /** Stable typed system-module address (`AGENT_NATIVE_MOD_V01`). */
    to: string;
    /** Native agent router bincode payload. */
    input: string;
    /** Native agent module calls must not carry native value. */
    valueLythoshi: "0";
    /** Maximum cycles delegated to the RISC-V host call. */
    maxCycles: string;
}
interface NativeAgentModuleCallEnvelope {
    module: "agent";
    call: NativeAgentModuleContractCall;
}
interface NativeAgentForwarderInput {
    /** Canonical `SyscallRequest::CallContract` bytes for MRV call input. */
    input: string;
    /** Byte length of `input`, useful because the minimal forwarder artifact pins this as an immediate. */
    requestBytes: number;
}
interface EncodeNativeAgentRegisterIssuerArgs {
    issuer: NativeAgentAddressInput;
    nonce: string | number | bigint;
    metadataHash: string;
}
interface EncodeNativeAgentIssueAttestationArgs {
    issuerId: string;
    issuer: NativeAgentAddressInput;
    subject: NativeAgentAddressInput;
    nonce: string | number | bigint;
    schemaHash: string;
    payloadHash: string;
}
interface EncodeNativeAgentRevokeAttestationArgs {
    attestationId: string;
    issuer: NativeAgentAddressInput;
}
interface EncodeNativeAgentGrantConsentArgs {
    subject: NativeAgentAddressInput;
    grantee: NativeAgentAddressInput;
    nonce: string | number | bigint;
    scopeHash: string;
    expiresAt: string | number | bigint;
}
interface EncodeNativeAgentRevokeConsentArgs {
    consentId: string;
    subject: NativeAgentAddressInput;
}
interface EncodeNativeAgentListServiceArgs {
    provider: NativeAgentAddressInput;
    nonce: string | number | bigint;
    categoryHash: string;
    metadataHash: string;
}
interface EncodeNativeAgentDeactivateServiceArgs {
    serviceId: string;
    provider: NativeAgentAddressInput;
}
interface EncodeNativeAgentSetAvailabilityArgs {
    provider: NativeAgentAddressInput;
    maxConcurrent: string | number | bigint;
    paused: boolean;
}
interface EncodeNativeAgentAvailabilitySlotArgs {
    provider: NativeAgentAddressInput;
    consumer: NativeAgentAddressInput;
}
interface EncodeNativeAgentRegisterArbiterArgs {
    arbiter: NativeAgentAddressInput;
    nonce: string | number | bigint;
    tier: string | number | bigint;
    metadataHash: string;
}
interface EncodeNativeAgentSetSpendingPolicyArgs {
    owner: NativeAgentAddressInput;
    controller: NativeAgentAddressInput;
    nonce: string | number | bigint;
    assetId: string;
    perActionLimit: string;
    windowLimit: string;
    windowSecs: string | number | bigint;
}
interface EncodeNativeAgentRecordPolicySpendArgs {
    policyId: string;
    controller: NativeAgentAddressInput;
    window: string | number | bigint;
    amount: string;
}
interface EncodeNativeAgentCreateEscrowArgs {
    buyer: NativeAgentAddressInput;
    provider: NativeAgentAddressInput;
    arbiter: NativeAgentAddressInput;
    nonce: string | number | bigint;
    assetId: string;
    amount: string;
    termsHash: string;
}
interface EncodeNativeAgentCounterEscrowArgs {
    escrowId: string;
    actor: NativeAgentAddressInput;
    termsHash: string;
}
interface EncodeNativeAgentEscrowActorArgs {
    escrowId: string;
    actor: NativeAgentAddressInput;
}
interface EncodeNativeAgentStartEscrowArgs {
    escrowId: string;
    provider: NativeAgentAddressInput;
}
interface EncodeNativeAgentSubmitEscrowArgs {
    escrowId: string;
    provider: NativeAgentAddressInput;
    payloadHash: string;
}
type NativeAgentEscrowResolution = "release-provider" | "refund-buyer";
interface EncodeNativeAgentResolveEscrowArgs {
    escrowId: string;
    actor: NativeAgentAddressInput;
    resolution: NativeAgentEscrowResolution;
}
interface NativeAgentReputationScores {
    speed: string | number | bigint;
    quality: string | number | bigint;
    communication: string | number | bigint;
    accuracy: string | number | bigint;
}
interface EncodeNativeAgentRecordReputationArgs {
    reviewer: NativeAgentAddressInput;
    subject: NativeAgentAddressInput;
    categoryId: string | number | bigint;
    scores: NativeAgentReputationScores;
    payloadHash: string;
}
declare class AgentActionError extends Error {
    constructor(message: string);
}
declare function encodeNativeAgentRegisterIssuerCall(args: EncodeNativeAgentRegisterIssuerArgs): string;
declare function encodeNativeAgentIssuerGetCall(issuerId: string): string;
declare function encodeNativeAgentIssueAttestationCall(args: EncodeNativeAgentIssueAttestationArgs): string;
declare function encodeNativeAgentRevokeAttestationCall(args: EncodeNativeAgentRevokeAttestationArgs): string;
declare function encodeNativeAgentAttestationGetCall(attestationId: string): string;
declare function encodeNativeAgentGrantConsentCall(args: EncodeNativeAgentGrantConsentArgs): string;
declare function encodeNativeAgentRevokeConsentCall(args: EncodeNativeAgentRevokeConsentArgs): string;
declare function encodeNativeAgentConsentGetCall(consentId: string): string;
declare function encodeNativeAgentListServiceCall(args: EncodeNativeAgentListServiceArgs): string;
declare function encodeNativeAgentDeactivateServiceCall(args: EncodeNativeAgentDeactivateServiceArgs): string;
declare function encodeNativeAgentServiceGetCall(serviceId: string): string;
declare function encodeNativeAgentSetAvailabilityCall(args: EncodeNativeAgentSetAvailabilityArgs): string;
declare function encodeNativeAgentOpenAvailabilityCall(args: EncodeNativeAgentAvailabilitySlotArgs): string;
declare function encodeNativeAgentCloseAvailabilityCall(args: EncodeNativeAgentAvailabilitySlotArgs): string;
declare function encodeNativeAgentAvailabilityGetCall(provider: NativeAgentAddressInput): string;
declare function encodeNativeAgentRegisterArbiterCall(args: EncodeNativeAgentRegisterArbiterArgs): string;
declare function encodeNativeAgentArbiterGetCall(arbiterId: string): string;
declare function encodeNativeAgentSetSpendingPolicyCall(args: EncodeNativeAgentSetSpendingPolicyArgs): string;
declare function encodeNativeAgentRecordPolicySpendCall(args: EncodeNativeAgentRecordPolicySpendArgs): string;
declare function encodeNativeAgentSpendingPolicyGetCall(policyId: string): string;
declare function encodeNativeAgentCreateEscrowCall(args: EncodeNativeAgentCreateEscrowArgs): string;
declare function encodeNativeAgentCounterEscrowCall(args: EncodeNativeAgentCounterEscrowArgs): string;
declare function encodeNativeAgentAcceptEscrowCall(args: EncodeNativeAgentEscrowActorArgs): string;
declare function encodeNativeAgentStartEscrowCall(args: EncodeNativeAgentStartEscrowArgs): string;
declare function encodeNativeAgentSubmitEscrowCall(args: EncodeNativeAgentSubmitEscrowArgs): string;
declare function encodeNativeAgentApproveEscrowCall(args: EncodeNativeAgentEscrowActorArgs): string;
declare function encodeNativeAgentDisputeEscrowCall(args: EncodeNativeAgentEscrowActorArgs): string;
declare function encodeNativeAgentCancelEscrowCall(args: EncodeNativeAgentEscrowActorArgs): string;
declare function encodeNativeAgentResolveEscrowCall(args: EncodeNativeAgentResolveEscrowArgs): string;
declare function encodeNativeAgentEscrowGetCall(escrowId: string): string;
declare function encodeNativeAgentRecordReputationCall(args: EncodeNativeAgentRecordReputationArgs): string;
declare function encodeNativeAgentReputationGetCall(subject: NativeAgentAddressInput, categoryId: string | number | bigint): string;
declare function buildNativeAgentModuleCallEnvelope(input: string, maxCycles: string | number | bigint): NativeAgentModuleCallEnvelope;
declare function encodeNativeAgentModuleForwarderInput(envelope: NativeAgentModuleCallEnvelope): NativeAgentForwarderInput;
declare function buildNativeAgentSetSpendingPolicyModuleCall(args: EncodeNativeAgentSetSpendingPolicyArgs, maxCycles: string | number | bigint): NativeAgentModuleCallEnvelope;
declare function buildNativeAgentSetSpendingPolicyForwarderInput(args: EncodeNativeAgentSetSpendingPolicyArgs, maxCycles: string | number | bigint): NativeAgentForwarderInput;
declare function buildNativeAgentCreateEscrowModuleCall(args: EncodeNativeAgentCreateEscrowArgs, maxCycles: string | number | bigint): NativeAgentModuleCallEnvelope;
declare function buildNativeAgentCreateEscrowForwarderInput(args: EncodeNativeAgentCreateEscrowArgs, maxCycles: string | number | bigint): NativeAgentForwarderInput;
declare function buildNativeAgentRecordReputationModuleCall(args: EncodeNativeAgentRecordReputationArgs, maxCycles: string | number | bigint): NativeAgentModuleCallEnvelope;
declare function buildNativeAgentRecordReputationForwarderInput(args: EncodeNativeAgentRecordReputationArgs, maxCycles: string | number | bigint): NativeAgentForwarderInput;

/**
 * Official TypeScript SDK for Monolythium v4.1 / LythiumDAG-BFT.
 *
 * The wire types in `./bindings/` are generated from Rust by
 * `cargo test --features ts-bindings`; never edit them by hand. The
 * `RpcClient` mirrors the Rust SDK 1:1 across current `lyth_*` native methods,
 * passive compatibility reads, and server-gated legacy/debug methods.
 *
 * Optional compatibility adapters live under the explicit `./ethers`
 * subpath so native SDK consumers do not import that peer dependency.
 */
declare const version = "0.1.0";

export { ADDRESS_HRP, ADDRESS_KIND_HRPS, AddressError, AddressFlowResponse, type AddressKind, AddressProfileResponse, AgentActionError, type ApiAddressActivityData, type ApiAddressActivityEntry, type ApiAddressActivityKind, type ApiAddressActivityKindData, type ApiAddressActivityKindSummary, type ApiBlockData, type ApiBlockHeader, type ApiBlockTransactionsData, type ApiCapabilitiesResponse, ApiClient, type ApiClientOptions, type ApiClusterData, type ApiClusterDirectoryEntry, type ApiClusterDirectoryPage, type ApiClusterMember, type ApiClusterStatus, type ApiClustersData, type ApiEnvelope, type ApiErrorEnvelope, type ApiHealthResponse, type ApiIndexerStatus, type ApiLatestAnchor, type ApiLogEntry, type ApiOperatorData, type ApiOperatorInfo, type ApiQueryValue, type ApiRuntimeProvenanceData, type ApiServiceProbeData, ApiStreamsIndexResponse, type ApiTransactionData, type ApiTransactionNativeReceiptData, type ApiTransactionReceipt, type ApiTransactionReceiptData, type ApiTransactionView, type ApiUpgradePlanStatus, type ApiUpgradeStatus, type ApiUpgradeStatusData, BURN_ADDR, BlockSelector, BridgeRoutesRequest, BridgeRoutesResponse, CLOB_MARKET_ID_DOMAIN_TAG, CLOB_SELECTORS, type CancelSpotOrderArgs, ChainStatsResponse, ClobMarketResponse, ClobMarketsResponse, ClobOhlcResponse, ClobOrderBookResponse, ClobTradesResponse, DELEGATION_REVERT_TAGS, DELEGATION_SELECTORS, DelegationPrecompileError, type EncodeNativeAgentAvailabilitySlotArgs, type EncodeNativeAgentCounterEscrowArgs, type EncodeNativeAgentCreateEscrowArgs, type EncodeNativeAgentDeactivateServiceArgs, type EncodeNativeAgentEscrowActorArgs, type EncodeNativeAgentGrantConsentArgs, type EncodeNativeAgentIssueAttestationArgs, type EncodeNativeAgentListServiceArgs, type EncodeNativeAgentRecordPolicySpendArgs, type EncodeNativeAgentRecordReputationArgs, type EncodeNativeAgentRegisterArbiterArgs, type EncodeNativeAgentRegisterIssuerArgs, type EncodeNativeAgentResolveEscrowArgs, type EncodeNativeAgentRevokeAttestationArgs, type EncodeNativeAgentRevokeConsentArgs, type EncodeNativeAgentSetAvailabilityArgs, type EncodeNativeAgentSetSpendingPolicyArgs, type EncodeNativeAgentStartEscrowArgs, type EncodeNativeAgentSubmitEscrowArgs, type EncodeNativeNftBuyListingArgs, type EncodeNativeNftCancelListingArgs, type EncodeNativeNftCreateListingArgs, type EncodeNativeNftPlaceAuctionBidArgs, type EncodeNativeNftSettleAuctionArgs, type EncodeNativeNftSweepExpiredListingsArgs, type EncodeNativeSpotCancelOrderArgs, type EncodeNativeSpotCreateMarketArgs, type EncodeNativeSpotLimitOrderArgs, type EncodeNativeSpotSettleLimitOrderArgs, type EncodeNativeSpotSettleRoutedLimitOrderArgs, type EthSendTransactionRequest, type HealthSummary, LYTHOSHI_PER_LYTH, LYTH_DECIMALS, type LatencyBands, type LythFormatOptions, MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES, ML_DSA_65_PUBLIC_KEY_LEN, ML_DSA_65_SIGNATURE_LEN, MRV_DEPLOY_PAYLOAD_VERSION, MRV_FORMAT_VERSION, MRV_MAX_ABI_SYMBOLS, MRV_MAX_CODE_BYTES, MRV_MAX_DEBUG_BYTES, MRV_MAX_MEMORY_PAGES, MRV_MAX_STORAGE_NAMESPACE_BYTES, MRV_MEMORY_PAGE_BYTES, MRV_PROFILE_MONO_RV32IM_V1, MRV_STRUCTURED_FEE_FIELDS, MRV_TX_EXTENSION_KIND, MRV_TX_EXTENSION_V1, MarketActionError, type MarketTransactionPlan, type MrcAccountRequest, MrcAccountResponse, type MrcHoldersRequest, MrcHoldersResponse, MrcMetadataResponse, type MrvAbiManifest, type MrvAbiParam, type MrvAbiSymbol, type MrvAbiSymbolKind, type MrvAbiType, type MrvAddressKind, type MrvArtifactMetadata, type MrvBuildMetadata, type MrvBytesLike, type MrvCallNativeTxOptions, type MrvCallNativeTxPlan, type MrvCallPlan, type MrvCallRequest, type MrvCallResponse, type MrvCallStatus, type MrvCallSubmission, type MrvCallSubmitOptions, type MrvDecimalLike, type MrvDeployNativeTxOptions, type MrvDeployNativeTxPlan, type MrvDeployPayload, type MrvDeployPayloadNativeTxOptions, type MrvDeployPayloadPlanOptions, type MrvDeployPayloadRequestOptions, type MrvDeployPayloadSubmission, type MrvDeployPayloadSubmitOptions, type MrvDeployPlan, type MrvDeployPlanOptions, type MrvDeployRequest, type MrvDeployResponse, type MrvDeploySubmission, type MrvDeploySubmitOptions, type MrvEncryptedSubmissionResult, type MrvEventRecord, type MrvExecutionReceipt, type MrvFeeDisplayConformanceInput, type MrvFeeDisplayConformanceReport, type MrvMemoryLimits, type MrvMeterCounters, type MrvNativeFeePreview, type MrvNativeStateDelta, type MrvNativeTxFacade, type MrvRequestBuildOptions, type MrvResolvedSyscall, type MrvRevertPayload, type MrvRiscvProfile, type MrvStorageNamespace, type MrvStructuredFeeConformanceOptions, type MrvStructuredFeeConformanceReport, type MrvSyscallImport, type MrvTransactionExtension, type MrvTypedAddress, type MrvValidatedArtifactMetadata, MrvValidationError, NATIVE_AGENT_MODULE_ADDRESS, NATIVE_AGENT_MODULE_ADDRESS_BYTES, NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE, NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY, NATIVE_CALL_FORWARDER_RESPONSE_OFFSET, NATIVE_DEV_HOST_API_VERSION, NATIVE_DEV_IPC_PROTOCOL_VERSION, NATIVE_DEV_MANIFEST_SCHEMA_VERSION, NATIVE_LYTH_DECIMALS, NATIVE_MARKET_MODULE_ADDRESS, NATIVE_MARKET_MODULE_ADDRESS_BYTES, NODE_REGISTRY_CAPABILITIES, NODE_REGISTRY_CAPABILITY_MASK, NODE_REGISTRY_PUBLIC_SERVICE_MASK, NODE_REGISTRY_SELECTORS, type NativeAgentAddressInput, type NativeAgentAddressKind, type NativeAgentEscrowResolution, type NativeAgentForwarderInput, type NativeAgentModuleCallEnvelope, type NativeAgentModuleContractCall, type NativeAgentReputationScores, NativeAgentStateFilter, NativeAgentStateResponse, type NativeCallForwarderArtifact, NativeDecodedEvent, type NativeDevApprovalKind, type NativeDevCommandName, type NativeDevContractPassport, type NativeDevHostApprovalResultMessage, type NativeDevHostCommandMessage, type NativeDevHostContextMessage, type NativeDevIpcMessage, type NativeDevMrcAllocation, type NativeDevMrcAssetKind, type NativeDevMrcTokenPlan, type NativeDevMrvDeployPlan, type NativeDevRiskLabel, type NativeDevRiskSeverity, type NativeDevSidecarApprovalRequestMessage, type NativeDevSidecarCommandResultMessage, type NativeDevSidecarProjectEventMessage, type NativeDevSidecarReadyMessage, type NativeDevVerificationBundle, type NativeDevWalletApprovalRequest, type NativeDevkitArchive, type NativeDevkitChannel, type NativeDevkitCompatibility, type NativeDevkitManifest, type NativeDevkitSidecarManifest, type NativeDevkitSidecarStatus, type NativeDevkitStatus, NativeEventFilter, NativeEventsFilter, NativeEventsResponse, type NativeMarketAddressInput, type NativeMarketAddressKind, type NativeMarketForwarderInput, type NativeMarketModuleCallEnvelope, type NativeMarketModuleContractCall, NativeMarketOrderBookDeltasRequest, NativeMarketOrderBookDeltasResponse, NativeMarketStateFilter, NativeMarketStateResponse, type NativeNftAssetStandard, type NativeNftListingKind, NativeReceiptFee, type NativeReceiptFeeDisplay, NativeReceiptResponse, NodeRegistryError, OperatorCapabilitiesResponse, PRECOMPILE_ADDRESSES, PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN, PUBKEY_REGISTRY_SELECTORS, PendingRewardsResponse, type PlaceSpotLimitOrderArgs, type PlaceSpotMarketOrderArgs, type PlaceSpotMarketOrderExArgs, type PrecompileAddress, type PrecompileName, type PubkeyLookup, PubkeyRegistryError, RESERVED_ADDRESS_HRPS, RedemptionQueueResponse, type ReportServiceProbeCalldataArgs, RpcClient, RuntimeBuildProvenance, RuntimeUpgradeStatus, SERVICE_PROBE_STATUS, SET_POLICY_CLAIM_DOMAIN_TAG, SPENDING_POLICY_SELECTORS, SdkError, SearchResponse, ServiceProbeResponse, type SpendingPolicyArgs, SpendingPolicyError, type SpotLimitOrderSide, type SpotMarketOrderMode, type StudioHostState, type StudioHostStatus, TxFeedResponse, type TypedAddress, TypedNativeReceiptEvent, addressBytesToHex, addressToBech32, addressToTypedBech32, apiEndpointFromRpcEndpoint, assertMrvCallNativeSubmissionPlan, assertMrvDeployNativeSubmissionPlan, assertMrvFeeDisplayConformance, assertMrvStructuredFeeConformance, assertNativeDevMrcTokenPlan, assertNativeDevMrvDeployPlan, assertNativeDevWalletApprovalRequest, bech32ToAddress, bech32ToAddressBytes, buildCancelSpotOrderPlan, buildMrvCallNativeTxPlan, buildMrvCallPlan, buildMrvCallRequest, buildMrvDeployNativeTxPlan, buildMrvDeployPayloadNativeTxPlan, buildMrvDeployPayloadPlan, buildMrvDeployPayloadRequest, buildMrvDeployPlan, buildMrvDeployRequest, buildNativeAgentCreateEscrowForwarderInput, buildNativeAgentCreateEscrowModuleCall, buildNativeAgentModuleCallEnvelope, buildNativeAgentRecordReputationForwarderInput, buildNativeAgentRecordReputationModuleCall, buildNativeAgentSetSpendingPolicyForwarderInput, buildNativeAgentSetSpendingPolicyModuleCall, buildNativeCallForwarderArtifact, buildNativeMarketModuleCallEnvelope, buildNativeNftBuyListingForwarderInput, buildNativeNftBuyListingModuleCall, buildNativeNftCancelListingForwarderInput, buildNativeNftCancelListingModuleCall, buildNativeNftCreateListingForwarderInput, buildNativeNftCreateListingModuleCall, buildNativeNftPlaceAuctionBidForwarderInput, buildNativeNftPlaceAuctionBidModuleCall, buildNativeNftSettleAuctionForwarderInput, buildNativeNftSettleAuctionModuleCall, buildNativeNftSweepExpiredListingsForwarderInput, buildNativeNftSweepExpiredListingsModuleCall, buildNativeSpotCancelOrderForwarderInput, buildNativeSpotCancelOrderModuleCall, buildNativeSpotCreateMarketForwarderInput, buildNativeSpotCreateMarketModuleCall, buildNativeSpotLimitOrderForwarderInput, buildNativeSpotLimitOrderModuleCall, buildNativeSpotSettleLimitOrderForwarderInput, buildNativeSpotSettleLimitOrderModuleCall, buildNativeSpotSettleRoutedLimitOrderForwarderInput, buildNativeSpotSettleRoutedLimitOrderModuleCall, buildPlaceSpotLimitOrderPlan, buildPlaceSpotMarketOrderExPlan, buildPlaceSpotMarketOrderPlan, checkMrvFeeDisplayConformance, checkMrvStructuredFeeConformance, checkNativeDevkitCompatibility, clobAddressHex, compareNativeDevVersions, composeClaimBoundMessage, decodeHasPubkeyReturn, decodeLookupPubkeyReturn, delegationAddressHex, deriveClobMarketId, deriveMrvContractAddress, deriveNativeSpotMarketId, deriveNativeSpotOrderId, encodeCancelOrderCalldata, encodeClaimPolicyByAddressCalldata, encodeCompleteRedemptionCalldata, encodeDisableCalldata, encodeEnableCalldata, encodeHasPubkeyCalldata, encodeLookupPubkeyCalldata, encodeMrvDeployPayload, encodeNativeAgentAcceptEscrowCall, encodeNativeAgentApproveEscrowCall, encodeNativeAgentArbiterGetCall, encodeNativeAgentAttestationGetCall, encodeNativeAgentAvailabilityGetCall, encodeNativeAgentCancelEscrowCall, encodeNativeAgentCloseAvailabilityCall, encodeNativeAgentConsentGetCall, encodeNativeAgentCounterEscrowCall, encodeNativeAgentCreateEscrowCall, encodeNativeAgentDeactivateServiceCall, encodeNativeAgentDisputeEscrowCall, encodeNativeAgentEscrowGetCall, encodeNativeAgentGrantConsentCall, encodeNativeAgentIssueAttestationCall, encodeNativeAgentIssuerGetCall, encodeNativeAgentListServiceCall, encodeNativeAgentModuleForwarderInput, encodeNativeAgentOpenAvailabilityCall, encodeNativeAgentRecordPolicySpendCall, encodeNativeAgentRecordReputationCall, encodeNativeAgentRegisterArbiterCall, encodeNativeAgentRegisterIssuerCall, encodeNativeAgentReputationGetCall, encodeNativeAgentResolveEscrowCall, encodeNativeAgentRevokeAttestationCall, encodeNativeAgentRevokeConsentCall, encodeNativeAgentServiceGetCall, encodeNativeAgentSetAvailabilityCall, encodeNativeAgentSetSpendingPolicyCall, encodeNativeAgentSpendingPolicyGetCall, encodeNativeAgentStartEscrowCall, encodeNativeAgentSubmitEscrowCall, encodeNativeMarketModuleForwarderInput, encodeNativeNftBuyListingCall, encodeNativeNftCancelListingCall, encodeNativeNftCreateListingCall, encodeNativeNftPlaceAuctionBidCall, encodeNativeNftSettleAuctionCall, encodeNativeNftSweepExpiredListingsCall, encodeNativeSpotCancelOrderCall, encodeNativeSpotCreateMarketCall, encodeNativeSpotLimitOrderCall, encodeNativeSpotSettleLimitOrderCall, encodeNativeSpotSettleRoutedLimitOrderCall, encodePlaceLimitOrderCalldata, encodePlaceMarketOrderCalldata, encodePlaceMarketOrderExCalldata, encodeRegisterPubkeyCalldata, encodeReportServiceProbeCalldata, encodeSetPolicyCalldata, encodeSetPolicyClaimCalldata, formatLyth, formatLythoshi, formatNativeReceiptFeeDisplay, hexToAddressBytes, isConcreteServiceProbeStatus, isRedemptionPrincipalUnavailableRevert, isSinglePublicServiceProbeMask, isValidNodeRegistryCapabilities, isValidPublicServiceProbeMask, mrvAddressToBech32, mrvBech32ToAddress, mrvCodeHashHex, mrvV1TransactionExtension, nativeDevSchemaFieldNames, nativeDevUiStrings, nodeRegistryAddressHex, normalizeAddressHex, parseAddress, parseLythToLythoshi, pubkeyRegistryAddressHex, resolveStudioHostStatus, serviceProbeStatusLabel, spendingPolicyAddressHex, submitMrvCallNativeTx, submitMrvDeployNativeTx, submitMrvDeployPayloadNativeTx, typedBech32ToAddress, validateMrvArtifactMetadata, validateMrvCallRequest, validateMrvDeployRequest, version };
