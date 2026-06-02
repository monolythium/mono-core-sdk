import { N as NativeReceiptFee, O as OperatorCapabilitiesResponse, R as RuntimeBuildProvenance, a as RuntimeUpgradeStatus, S as SearchResponse, C as ChainStatsResponse, B as BlockSelector, A as ApiStreamsIndexResponse, T as TxFeedResponse, b as NativeReceiptResponse, c as NativeDecodedEvent, d as NativeEventFilter, e as TypedNativeReceiptEvent, f as NativeEventsFilter, g as NativeEventsResponse, h as NativeAgentStateFilter, i as NativeAgentStateResponse, j as NativeMarketStateFilter, k as NativeMarketStateResponse, l as NativeMarketOrderBookDeltasRequest, m as NativeMarketOrderBookDeltasResponse, n as AddressProfileResponse, o as AddressFlowResponse, P as PendingRewardsResponse, p as RedemptionQueueResponse, M as MrcMetadataResponse, q as MrcAccountResponse, r as MrcHoldersResponse, s as BridgeRoutesRequest, t as BridgeRoutesResponse, u as ServiceProbeResponse, v as ClobMarketsResponse, w as ClobMarketResponse, x as ClobTradesResponse, y as ClobOhlcResponse, z as ClobOrderBookResponse, D as NativeEvmTxFields, E as EncryptionKey, F as MempoolClass, G as TypedAddress, H as RpcClient, I as MlDsa65Backend, J as AddressKind } from './submission-BeEYbbGi.js';
export { K as ADDRESS_HRP, L as ADDRESS_KIND_HRPS, Q as API_STREAM_TOPICS, U as AccountPolicy, V as AccountProofResponse, W as Address, X as AddressActivityArchiveRedirect, Y as AddressActivityEntry, Z as AddressActivityEntryEnriched, _ as AddressActivityKind, $ as AddressActivityKindResponse, a0 as AddressActivityKindRetention, a1 as AddressError, a2 as AddressLabelRecord, a3 as AddressValidation, a4 as AgentReputationCategoryScope, a5 as AgentReputationRecord, a6 as AgentReputationResponse, a7 as ApiStreamTopic, a8 as ApiStreamTopicMetadata, a9 as ApiStreamTopicRetention, aa as AssetPolicy, ab as AttestDkgReshareCalldataArgs, ac as AttestationWindow, ad as BRIDGE_QUOTE_API_BLOCKED_REASON, ae as BRIDGE_REVERT_TAGS, af as BRIDGE_SELECTORS, ag as BRIDGE_SUBMIT_API_BLOCKED_REASON, ah as BlockHeader, ai as BlockTag, aj as BlsCertificateResponse, ak as BridgeAdminControl, al as BridgeAnchorState, am as BridgeBreakerState, an as BridgeBytesInput, ao as BridgeCircuitBreakerFields, ap as BridgeCircuitBreakerState, aq as BridgeDrainCap, ar as BridgeDrainStatus, as as BridgeHealthRecord, at as BridgeHealthResponse, au as BridgePrecompileError, av as BridgeQuoteSubmitReadiness, aw as BridgeRiskTier, ax as BridgeRouteAssessment, ay as BridgeRouteCandidate, az as BridgeRouteCatalogue, aA as BridgeRouteCatalogueError, aB as BridgeRouteCatalogueJsonOptions, aC as BridgeRouteCataloguePayload, aD as BridgeRouteCatalogueRoute, aE as BridgeRouteCatalogueValidation, aF as BridgeRouteDisclosure, aG as BridgeRouteSelection, aH as BridgeRoutesSource, aI as BridgeTransferIntent, aJ as BridgeTransferRequest, aK as BridgeVerifierDisclosure, aL as CHAIN_REGISTRY, aM as CHAIN_REGISTRY_RAW_BASE, aN as CLOB_MARKET_ID_DOMAIN_TAG, aO as CLOB_SELECTORS, aP as CLUSTER_FORMED_EVENT_SIG, aQ as CancelPendingChangeCalldataArgs, aR as CancelSpotOrderArgs, aS as CapabilitiesResponse, aT as CapabilityDescriptor, aU as ChainInfo, aV as ChainRegistry, aW as CheckpointRecord, aX as CirculatingSupplyResponse, aY as ClobMarketAssets, aZ as ClobMarketRecord, a_ as ClobMarketSummary, a$ as ClobTrade, b0 as ClusterAprResponse, b1 as ClusterDelegatorsResponse, b2 as ClusterDirectoryEntryResponse, b3 as ClusterDirectoryPageResponse, b4 as ClusterDiversity, b5 as ClusterDiversityView, b6 as ClusterEntityResponse, b7 as ClusterFormedEvent, b8 as ClusterMemberResponse, b9 as ClusterNameResponse, ba as ClusterResignationRow, bb as ClusterResignationsResponse, bc as ClusterStatusResponse, bd as CreateRequestCanonicalArgs, be as DIVERSITY_SCORE_MAX, bf as DagParent, bg as DagParentsResponse, bh as DagSyncStatus, bi as DecodeTxExtension, bj as DecodeTxLog, bk as DecodeTxPqAttestation, bl as DecodeTxResponse, bm as DelegationCapResponse, bn as DelegationHistoryRecord, bo as DelegationRow, bp as DelegationsResponse, bq as DutyAbsence, br as EMPTY_ROOT, bs as EncodeNativeNftBuyListingArgs, bt as EncodeNativeNftCancelListingArgs, bu as EncodeNativeNftCreateListingArgs, bv as EncodeNativeNftPlaceAuctionBidArgs, bw as EncodeNativeNftSettleAuctionArgs, bx as EncodeNativeNftSweepExpiredListingsArgs, by as EncodeNativeSpotCancelOrderArgs, bz as EncodeNativeSpotCreateMarketArgs, bA as EncodeNativeSpotLimitOrderArgs, bB as EncodeNativeSpotSettleLimitOrderArgs, bC as EncodeNativeSpotSettleRoutedLimitOrderArgs, bD as EncryptionKeyResponse, bE as EntityRatchetResponse, bF as EthSendTransactionRequest, bG as ExecutionUnitPriceResponse, bH as ExplorerEndpoint, bI as FEED_ID_DOMAIN_TAG, bJ as FeeHistoryResponse, bK as GapRange, bL as GapRecord, bM as GapRecordsResponse, bN as Hash, bO as Hex, bP as IndexerStatus, bQ as JailStatusWindow, bR as KeyRotationWindow, bS as ListProofRequestsResponse, bT as LythUpgradePlanStatus, bU as LythUpgradeStatusResponse, bV as MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES, bW as MAX_NATIVE_RECEIPT_EVENTS, bX as ML_DSA_65_PUBLIC_KEY_LEN, bY as ML_DSA_65_SIGNATURE_LEN, bZ as MULTISIG_ADDRESS_DERIVATION_DOMAIN, b_ as MarketActionError, b$ as MarketTransactionPlan, c0 as MempoolSnapshot, c1 as MeshDecodedTx, c2 as MeshSignedTxResponse, c3 as MeshTxIntent, c4 as MeshUnsignedTxResponse, c5 as MetricsRangeResponse, c6 as MetricsRangeSample, c7 as MetricsRangeSeries, c8 as MetricsRangeStatus, c9 as MrcAccountRecord, ca as MrcMetadataRecord, cb as MrcPolicyRecord, cc as MrcPolicySpendRecord, cd as NAME_BASE_MULTIPLIER, ce as NAME_FALLBACK_FEE_UNIT_LYTHOSHI, cf as NAME_LABEL_MAX_LEN, cg as NAME_LABEL_MIN_LEN, ch as NAME_MAX_LEN, ci as NAME_REGISTRY_SELECTORS, cj as NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE, ck as NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY, cl as NATIVE_CALL_FORWARDER_RESPONSE_OFFSET, cm as NATIVE_MARKET_EVENT_FAMILY, cn as NATIVE_MARKET_MODULE_ADDRESS, co as NATIVE_MARKET_MODULE_ADDRESS_BYTES, cp as NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC, cq as NODE_REGISTRY_BLS_PUBKEY_BYTES, cr as NODE_REGISTRY_CAPABILITIES, cs as NODE_REGISTRY_CAPABILITY_MASK, ct as NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS, cu as NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS, cv as NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES, cw as NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID, cx as NODE_REGISTRY_PUBLIC_SERVICE_MASK, cy as NODE_REGISTRY_SELECTORS, cz as NO_EVM_ARCHIVE_PROOF_SCHEMA, cA as NO_EVM_ARCHIVE_SIGNATURE_SCHEME, cB as NO_EVM_FINALITY_EVIDENCE_SCHEMA, cC as NO_EVM_FINALITY_EVIDENCE_SOURCE, cD as NO_EVM_RECEIPTS_ROOT_DOMAIN, cE as NO_EVM_RECEIPT_CODEC, cF as NO_EVM_RECEIPT_PROOF_SCHEMA, cG as NO_EVM_RECEIPT_PROOF_TYPE, cH as NO_EVM_RECEIPT_ROOT_ALGORITHM, cI as NameCategory, cJ as NameOfResponse, cK as NameRegistrationQuote, cL as NameRegistryError, cM as NativeAgentArbiterStateRecord, cN as NativeAgentAttestationStateRecord, cO as NativeAgentAvailabilityStateRecord, cP as NativeAgentConsentStateRecord, cQ as NativeAgentEscrowStateRecord, cR as NativeAgentIssuerStateRecord, cS as NativeAgentPolicySpendStateRecord, cT as NativeAgentPolicyStateRecord, cU as NativeAgentReputationReviewStateRecord, cV as NativeAgentServiceStateRecord, cW as NativeAgentStateFilterParamValue, cX as NativeAgentStateResponseFilters, cY as NativeAgentStateSource, cZ as NativeCallForwarderArtifact, c_ as NativeCollectionRoyaltyStateRecord, c$ as NativeEventConsumer, d0 as NativeEventProjection, d1 as NativeEventsResponseFilters, d2 as NativeEventsSource, d3 as NativeMarketAddressInput, d4 as NativeMarketAddressKind, d5 as NativeMarketForwarderInput, d6 as NativeMarketModuleCallEnvelope, d7 as NativeMarketModuleContractCall, d8 as NativeMarketOrderBookDelta, d9 as NativeMarketOrderBookDeltasResponseFilters, da as NativeMarketOrderBookDeltasSource, db as NativeMarketOrderBookStreamAction, dc as NativeMarketOrderBookStreamPayload, dd as NativeMarketStateFilterParamValue, de as NativeMarketStateResponseFilters, df as NativeMarketStateSource, dg as NativeModuleForwarderDescriptor, dh as NativeMrcPolicyProjection, di as NativeNftAssetStandard, dj as NativeNftListingKind, dk as NativeNftListingStateRecord, dl as NativeReceiptCounters, dm as NativeReceiptEvent, dn as NativeReceiptSource, dp as NativeSpotMarketStateRecord, dq as NativeSpotOrderStateRecord, dr as NetworkClientOptions, ds as NetworkSlug, dt as NoEvmArchiveCoveringSnapshot, du as NoEvmArchiveProof, dv as NoEvmArchiveSignatureVerification, dw as NoEvmArchiveSignatureVerificationIssue, dx as NoEvmArchiveSignatureVerificationIssueCode, dy as NoEvmArchiveTrustedSigner, dz as NoEvmBlockBlsFinalityVerification, dA as NoEvmBlsFinalityVerification, dB as NoEvmFinalityBlockReference, dC as NoEvmFinalityCertificate, dD as NoEvmFinalityEvidence, dE as NoEvmReceiptFinalityTrustPolicy, dF as NoEvmReceiptProof, dG as NoEvmReceiptProofError, dH as NoEvmReceiptProofErrorCode, dI as NoEvmReceiptProofVerification, dJ as NoEvmReceiptTrustIssue, dK as NoEvmReceiptTrustIssueCode, dL as NoEvmReceiptTrustPolicy, dM as NoEvmReceiptTrustVerification, dN as NoEvmReceiptTrustedBlsSigner, dO as NodeHostingClass, dP as NodeRegistryError, dQ as OPERATOR_ROUTER_EVENT_SIGS, dR as OPERATOR_ROUTER_SELECTORS, dS as OPERATOR_ROUTER_SIGS, dT as ORACLE_EVENT_SIGS, dU as OperatorAuthorityResponse, dV as OperatorFeeChargedEvent, dW as OperatorFeeConfig, dX as OperatorFeeQuote, dY as OperatorInfoResponse, dZ as OperatorNetworkMetadata, d_ as OperatorNetworkMetadataView, d$ as OperatorRiskResponse, e0 as OperatorRouterConfig, e1 as OperatorSigningActivityResponse, e2 as OperatorSigningEntry, e3 as OperatorSurfaceCapability, e4 as OperatorSurfaceStatus, e5 as OracleEvent, e6 as OracleEventError, e7 as OracleFeedConfig, e8 as OracleLatestPrice, e9 as OracleSignerRow, ea as OracleSignersResponse, eb as OracleWriters, ec as P2pSeed, ed as PENDING_CHANGE_KIND_CODES, ee as PROVER_MARKET_ADDRESS, ef as PROVER_MARKET_BID_DOMAIN, eg as PROVER_MARKET_EVENT_SIGS, eh as PROVER_MARKET_REQUEST_DOMAIN, ei as PROVER_MARKET_SELECTORS, ej as PROVER_MARKET_SUBMIT_DOMAIN, ek as PROVER_SLASH_REASON_BAD_PROOF, el as PROVER_SLASH_REASON_NON_DELIVERY, em as ParsedName, en as PeerSummary, eo as PeerSummaryAggregate, ep as PendingChangeKind, eq as PendingRewardsRow, er as PendingTxSummary, es as PlaceLimitOrderViaArgs, et as PlaceLimitOrderViaPlan, eu as PlaceSpotLimitOrderArgs, ev as PlaceSpotMarketOrderArgs, ew as PlaceSpotMarketOrderExArgs, ex as PrecompileCatalogueResponse, ey as PrecompileDescriptor, ez as ProofRequestRow, eA as ProofRequestView, eB as ProverBidView, eC as ProverBidsResponse, eD as ProverMarketError, eE as ProverMarketState, eF as ProverMarketStatusResponse, eG as Quantity, eH as QuoteLiquidity, eI as RESERVED_ADDRESS_HRPS, eJ as RankedBridgeRoute, eK as ReceiptProofTrustArchivePolicy, eL as ReceiptProofTrustArchiveSigner, eM as ReceiptProofTrustFinalityPolicy, eN as ReceiptProofTrustFinalitySigner, eO as ReceiptProofTrustPolicy, eP as RedemptionQueueTicket, eQ as RegistryRecord, eR as ReportServiceProbeCalldataArgs, eS as ReportServiceProbeRequest, eT as ReportServiceProbeResponse, eU as ResolveNameResponse, eV as RichListHolder, eW as RichListResponse, eX as RoundInfo, eY as RpcClientOptions, eZ as RpcEndpoint, e_ as RuntimeProvenanceResponse, e$ as SERVES_GPU_PROVE, f0 as SERVICE_PROBE_STATUS, f1 as SET_POLICY_CLAIM_DOMAIN_TAG, f2 as SPENDING_POLICY_SELECTORS, f3 as SearchHit, f4 as ServiceProbeStatusLabel, f5 as SigningEntryStatus, f6 as SpendingPolicyArgs, f7 as SpendingPolicyError, f8 as SpendingPolicyTimeWindow, f9 as SpendingPolicyView, fa as SpotLimitOrderSide, fb as SpotMarketOrderMode, fc as StorageProofBatch, fd as SubmitPendingChangeCalldataArgs, fe as SwapIntentStatus, ff as SyncStatus, fg as TESTNET_69420, fh as TokenBalanceMrcIdentity, fi as TokenBalanceRecord, fj as TokenBalanceWithMetadata, fk as TotalBurnedResponse, fl as TpmAttestationResponse, fm as TransactionReceipt, fn as TransactionView, fo as TxConfirmations, fp as TxFeedReceipt, fq as TxFeedTransaction, fr as TxStatusFoundResponse, fs as TxStatusNotFoundResponse, ft as TxStatusResponse, fu as UpcomingDutiesResponse, fv as UpcomingDutyMap, fw as UserAddressInput, fx as V1_BRIDGE_ALLOWED_FEE_TOKEN, fy as V1_BRIDGE_ALLOWED_PROTOCOL, fz as VertexAtRound, fA as VerticesAtRoundResponse, fB as addressBytesToHex, fC as addressToBech32, fD as addressToTypedBech32, fE as allowRootFor, fF as assertNativeMarketOrderBookStreamPayload, fG as assessBridgeRoute, fH as bech32ToAddress, fI as bech32ToAddressBytes, fJ as bidSighash, fK as bridgeAddressHex, fL as bridgeDrainRemaining, fM as bridgeQuoteSubmitReadiness, fN as bridgeRoutesReadiness, fO as bridgeTransferCandidates, fP as buildBridgeRouteCatalogue, fQ as buildCancelSpotOrderPlan, fR as buildNativeCallForwarderArtifact, fS as buildNativeMarketModuleCallEnvelope, fT as buildNativeNftBuyListingForwarderInput, fU as buildNativeNftBuyListingModuleCall, fV as buildNativeNftCancelListingForwarderInput, fW as buildNativeNftCancelListingModuleCall, fX as buildNativeNftCreateListingForwarderInput, fY as buildNativeNftCreateListingModuleCall, fZ as buildNativeNftPlaceAuctionBidForwarderInput, f_ as buildNativeNftPlaceAuctionBidModuleCall, f$ as buildNativeNftSettleAuctionForwarderInput, g0 as buildNativeNftSettleAuctionModuleCall, g1 as buildNativeNftSweepExpiredListingsForwarderInput, g2 as buildNativeNftSweepExpiredListingsModuleCall, g3 as buildNativeSpotCancelOrderForwarderInput, g4 as buildNativeSpotCancelOrderModuleCall, g5 as buildNativeSpotCreateMarketForwarderInput, g6 as buildNativeSpotCreateMarketModuleCall, g7 as buildNativeSpotLimitOrderForwarderInput, g8 as buildNativeSpotLimitOrderModuleCall, g9 as buildNativeSpotSettleLimitOrderForwarderInput, ga as buildNativeSpotSettleLimitOrderModuleCall, gb as buildNativeSpotSettleRoutedLimitOrderForwarderInput, gc as buildNativeSpotSettleRoutedLimitOrderModuleCall, gd as buildPlaceLimitOrderViaPlan, ge as buildPlaceSpotLimitOrderPlan, gf as buildPlaceSpotMarketOrderExPlan, gg as buildPlaceSpotMarketOrderPlan, gh as categoryRoot, gi as clobAddressHex, gj as clusterApyPercent, gk as composeClaimBoundMessage, gl as computeNoEvmDacFinalityMessage, gm as computeNoEvmLeaderFinalityMessage, gn as computeNoEvmReceiptsRoot, go as computeNoEvmRoundFinalityMessage, gp as computeNoEvmTargetReceiptHash, gq as computeQuoteLiquidity, gr as consumeNativeEvents, gs as decodeClusterDiversity, gt as decodeClusterFormedEvent, gu as decodeNativeAgentStateResponse, gv as decodeNativeMarketOrderBookDeltasResponse, gw as decodeNativeReceiptResponse, gx as decodeNoEvmReceiptTranscript, gy as decodeOperatorFeeChargedEvent, gz as decodeOperatorNetworkMetadata, gA as decodeOracleEvent, gB as decodeTimeWindow, gC as decodeTxFeedResponse, gD as denyRootFor, gE as deriveClobMarketId, gF as deriveClusterAnchorAddress, gG as deriveFeedId, gH as deriveNativeSpotMarketId, gI as deriveNativeSpotOrderId, gJ as destinationRoot, gK as encodeAttestDkgReshareCalldata, gL as encodeBlockSelector, gM as encodeBridgeChallengeCalldata, gN as encodeBridgeClaimCalldata, gO as encodeCancelOrderCalldata, gP as encodeCancelPendingChangeCalldata, gQ as encodeClaimPolicyByAddressCalldata, gR as encodeCreateRequestCalldata, gS as encodeCreateRequestCanonical, gT as encodeDisableCalldata, gU as encodeEnableCalldata, gV as encodeLockBridgeConfigCalldata, gW as encodeNameAcceptTransferCall, gX as encodeNameProposeTransferCall, gY as encodeNameRegisterCall, gZ as encodeNativeMarketModuleForwarderInput, g_ as encodeNativeNftBuyListingCall, g$ as encodeNativeNftCancelListingCall, h0 as encodeNativeNftCreateListingCall, h1 as encodeNativeNftPlaceAuctionBidCall, h2 as encodeNativeNftSettleAuctionCall, h3 as encodeNativeNftSweepExpiredListingsCall, h4 as encodeNativeSpotCancelOrderCall, h5 as encodeNativeSpotCreateMarketCall, h6 as encodeNativeSpotLimitOrderCall, h7 as encodeNativeSpotSettleLimitOrderCall, h8 as encodeNativeSpotSettleRoutedLimitOrderCall, h9 as encodePlaceLimitOrderCalldata, ha as encodePlaceLimitOrderViaCalldata, hb as encodePlaceMarketOrderCalldata, hc as encodePlaceMarketOrderExCalldata, hd as encodeRecoverOperatorNodeCalldata, he as encodeReportServiceProbeCalldata, hf as encodeSetBridgeResumeCooldownCalldata, hg as encodeSetBridgeRouteFinalityCalldata, hh as encodeSetLotSizeCalldata, hi as encodeSetMinNotionalCalldata, hj as encodeSetPolicyCalldata, hk as encodeSetPolicyClaimCalldata, hl as encodeSetTickSizeCalldata, hm as encodeSubmitBridgeProofCalldata, hn as encodeSubmitPendingChangeCalldata, ho as exportBridgeRouteCatalogueJson, hp as fetchChainInfoLatest, hq as fetchChainRegistryLatest, hr as formatOraclePrice, hs as getChainInfo, ht as getNoEvmReceiptTrustPolicy, hu as getP2pSeeds, hv as getRpcEndpoints, hw as hexToAddressBytes, hx as isBridgeAdminLockedRevert, hy as isBridgeCooldownZeroRevert, hz as isBridgeFinalityZeroRevert, hA as isBridgeResumeCooldownActiveRevert, hB as isConcreteServiceProbeStatus, hC as isNativeDecodedEvent, hD as isNativeMarketOrderBookStreamPayload, hE as isSinglePublicServiceProbeMask, hF as isValidNodeRegistryCapabilities, hG as isValidPublicServiceProbeMask, hH as nameLengthModifierX10, hI as nameRegistrationCost, hJ as nameRegistryAddressHex, hK as nativeAgentStateFilterParams, hL as nativeEventMatches, hM as nativeEventsFilterParams, hN as nativeEventsFromHistory, hO as nativeEventsFromReceipt, hP as nativeMarketEventFilter, hQ as nativeMarketEventsFromHistory, hR as nativeMarketEventsFromReceipt, hS as nativeMarketStateFilterParams, hT as noEvmReceiptTrustPolicyFromChainInfo, hU as nodeHostingClassFromByte, hV as nodeHostingClassToByte, hW as nodeRegistryAddressHex, hX as normalizeAddressHex, hY as normalizeBridgeRouteCatalogue, hZ as normalizePendingChangeKind, h_ as oracleAddressHex, h$ as oraclePriceToNumber, i0 as packTimeWindow, i1 as parseAddress, i2 as parseBridgeRouteCatalogueJson, i3 as parseChainRegistryToml, i4 as parseDkgResharePublicKeys, i5 as parseNameCategory, i6 as parseNativeDecodedEvent, i7 as parseQuantity, i8 as parseQuantityBig, i9 as proverMarketStateFromByte, ia as quoteOperatorFee, ib as rankBridgeRoutes, ic as rankMarketsByVolume, id as requestSighash, ie as requireTypedAddress, ig as selectBridgeTransferRoute, ih as serviceProbeStatusLabel, ii as setDestinationRoot, ij as spendingPolicyAddressHex, ik as submitSighash, il as typedBech32ToAddress, im as validateAddress, io as validateBridgeRouteCatalogue, ip as verifyNoEvmArchiveProofSignatures, iq as verifyNoEvmBlockFinalityEvidenceMultisig, ir as verifyNoEvmBlockFinalityEvidenceThreshold, is as verifyNoEvmFinalityEvidenceMultisig, it as verifyNoEvmFinalityEvidenceThreshold, iu as verifyNoEvmReceiptProof, iv as verifyNoEvmReceiptProofTrust } from './submission-BeEYbbGi.js';

/**
 * Legacy compatibility call/estimate request shape.
 *
 * New v4.1 no-EVM app flows should prefer native MRV/RISC-V builders and
 * `lyth_*` previews. This type remains for raw compatibility RPC methods and
 * generated TypeScript bindings.
 *
 * Every field is optional — the chain rejects payloads that omit
 * required fields with an `InvalidParams` error.
 */
type CallRequest = {
    /**
     * Source address.
     */
    from?: string;
    /**
     * Destination address. `None` is interpreted as contract
     * creation by the chain.
     */
    to?: string;
    /**
     * Execution-unit limit.
     */
    gas?: string;
    /**
     * Fee per execution unit on legacy compatibility paths.
     */
    gasPrice?: string;
    /**
     * Native value to transfer, in lythoshi.
     */
    value?: string;
    /**
     * Calldata (`data` is canonical; chains accept `input` as alias).
     */
    data?: string;
};

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
    /**
     * Total fee charged, in lythoshi (`fee.total_lythoshi`). Computed
     * client-side from the `fee` block; see {@link transactionFeeExposure}.
     */
    feeLythoshi: string;
    /**
     * Effective per-execution-unit price paid, in lythoshi
     * (`base_price_per_cycle_lythoshi + priority_tip_lythoshi`). Computed
     * client-side from the `fee` block.
     */
    effectiveGasPricePerUnit: string;
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
    /**
     * Total fee charged for the transaction, in lythoshi. The live
     * `eth_getTransactionReceipt` does not carry fee fields, so the SDK
     * computes this client-side from the tx-query `fee` block — present when
     * the receipt is fetched alongside the transaction view (e.g. via
     * {@link ApiClient.transaction}); absent on the bare receipt route.
     */
    feeLythoshi?: string;
    /**
     * Effective per-execution-unit price paid, in lythoshi
     * (`base_price_per_cycle_lythoshi + priority_tip_lythoshi`). Computed
     * client-side; see {@link feeLythoshi} for availability.
     */
    effectiveGasPricePerUnit?: string;
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
declare const LYTH_DECIMALS: 18;
declare const NATIVE_LYTH_DECIMALS: 18;
declare const LYTHOSHI_PER_LYTH = 1000000000000000000n;
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
 * Transaction fee + execution-unit defaults and resolution helpers.
 *
 * These mirror the fee handling the Rust CLI / SDK uses for the
 * plaintext + registry write paths (`mono-core/crates/core/cli/src/commands/registry.rs`
 * and `crates/core/sdk/src/tx.rs`). The chain admits a transaction only
 * if
 *
 *   `max_execution_unit_price_lythoshi × execution_unit_limit <= free_balance`
 *
 * and the plaintext path additionally enforces `priority_tip <=
 * max_execution_unit_price` (a `FeeMismatch` revert otherwise). Two
 * footguns motivated these helpers:
 *
 *  1. The registry `register_op` BLS proof-of-possession pairing verify
 *     burns ~151k execution units; a 100k limit reverts. Registry /
 *     register writes therefore default to a higher limit.
 *  2. `priority_tip_lythoshi` is a PER-UNIT price, not a total tip. The
 *     legacy registry default of `1e10` dwarfed the live per-unit cap
 *     (~2000-6000 lythoshi) and made the chain reject every registry
 *     write. The resolver below derives the cap from the live
 *     `lyth_executionUnitPrice` quote and clamps the tip to it.
 */

/**
 * Default execution-unit limit for registry / register writes.
 *
 * The `register_op` BLS-PoP pairing verify uses ~151k execution units,
 * so the prior 100k default reverted. Pinned above the observed cost
 * with headroom. Mirrors the corrected
 * `REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT` in the Rust CLI.
 */
declare const REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT = 250000n;
/**
 * Default execution-unit limit for a bare native transfer.
 *
 * The 21000 intrinsic floor plus calldata + signature-byte units; a
 * round 100k covers an ML-DSA-65-signed transfer with margin.
 */
declare const TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT = 100000n;
/**
 * Per-unit price floor used when the node quote is unexpectedly low or
 * zero (e.g. a fresh chain), so the declared cap never collapses to 0.
 * Mirrors `REGISTRY_MIN_EXECUTION_UNIT_PRICE_LYTHOSHI` in the Rust CLI.
 */
declare const MIN_EXECUTION_UNIT_PRICE_LYTHOSHI = 2000n;
/**
 * Safety multiplier applied to the live per-unit execution price when
 * declaring a write's `maxExecutionUnitPrice`. A small headroom over the
 * latest-block quote tolerates a fee bump between the quote and
 * inclusion without over-reserving the sender's balance. Mirrors
 * `REGISTRY_EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER` in the Rust CLI.
 */
declare const EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER = 3n;
/**
 * Resolved per-unit fee parameters for a transaction, in the
 * `NativeEvmTxFields` shape (`maxFeePerGas` is the per-unit max price,
 * `maxPriorityFeePerGas` is the per-unit priority tip).
 *
 * Both values are PER-UNIT prices in lythoshi; the on-chain mempool
 * reserves `maxFeePerGas × gasLimit` against the sender's balance, and
 * the plaintext path requires `maxPriorityFeePerGas <= maxFeePerGas`.
 */
interface ResolvedExecutionFee {
    /** Per-unit max execution price in lythoshi. */
    maxFeePerGas: bigint;
    /** Per-unit priority tip in lythoshi (always `<= maxFeePerGas`). */
    maxPriorityFeePerGas: bigint;
    /** Execution-unit limit. */
    gasLimit: bigint;
}
/**
 * Clamp a priority tip so it never exceeds the per-unit max price.
 *
 * The plaintext submit path enforces `priority_tip <=
 * max_execution_unit_price` (a `FeeMismatch` revert otherwise), so any
 * caller-supplied tip is capped here rather than reverting on-chain.
 */
declare function clampPriorityTip(priorityTipLythoshi: bigint | number | string, maxExecutionUnitPriceLythoshi: bigint | number | string): bigint;
/**
 * Resolve the per-unit `maxFeePerGas` cap from the live
 * `lyth_executionUnitPrice` quote: take the latest quote, apply the
 * safety multiplier as headroom, and clamp up to the price floor so the
 * declared cap never collapses to 0. Mirrors
 * `registry_max_execution_unit_price_lythoshi` in the Rust CLI.
 */
declare function resolveMaxExecutionUnitPrice(client: RpcClient, options?: {
    minPriceLythoshi?: bigint;
    safetyMultiplier?: bigint;
}): Promise<bigint>;
/**
 * Resolve sane per-unit fee parameters for a write from the live node
 * quote, with the priority tip clamped to the resolved cap.
 *
 * `priorityTipLythoshi` defaults to the resolved cap (the highest tip
 * the plaintext path accepts) when omitted, so registry / register
 * writes meet the public-testnet tip floor without a caller-supplied
 * flag. Pass an explicit value to bid lower.
 */
declare function resolveExecutionFee(client: RpcClient, options?: {
    executionUnitLimit?: bigint;
    priorityTipLythoshi?: bigint | number | string;
    minPriceLythoshi?: bigint;
    safetyMultiplier?: bigint;
}): Promise<ResolvedExecutionFee>;
/**
 * Convenience wrapper for registry / register writes: the same fee
 * resolution as {@link resolveExecutionFee} but defaulting the
 * execution-unit limit to {@link REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT}
 * so the `register_op` BLS-PoP pairing verify does not revert.
 */
declare function resolveRegistryExecutionFee(client: RpcClient, options?: {
    executionUnitLimit?: bigint;
    priorityTipLythoshi?: bigint | number | string;
    minPriceLythoshi?: bigint;
    safetyMultiplier?: bigint;
}): Promise<ResolvedExecutionFee>;
/**
 * Client-side fee exposure for a settled transaction, derived from the
 * structured `fee` block the node already returns on the tx-query
 * (`/api/v1/transactions/{hash}`) and tx-feed surfaces.
 *
 * The live `eth_getTransactionReceipt` carries only
 * `{gas_used, status, logs, ...}` — no fee fields — so wallets and
 * integrators historically had to reconstruct the charge themselves.
 * These fields surface that charge without any chain / RPC change:
 *
 *  - `feeLythoshi` is the total fee actually charged (`fee.total_lythoshi`).
 *    On-chain the fee is `(base_price + priority_tip) × execution_units`,
 *    split 50% burn / 30% operator / 20% treasury; this is the sender's
 *    full debit.
 *  - `effectiveGasPricePerUnit` is the per-execution-unit price actually
 *    paid, `base_price_per_cycle_lythoshi + priority_tip_lythoshi`. It is
 *    the Monolythium analogue of an EVM receipt's `effectiveGasPrice`.
 */
interface TransactionFeeExposure {
    /** Total fee charged for the transaction, in lythoshi. */
    feeLythoshi: string;
    /**
     * Effective per-execution-unit price paid, in lythoshi
     * (`base_price_per_cycle_lythoshi + priority_tip_lythoshi`).
     */
    effectiveGasPricePerUnit: string;
}
/**
 * Compute the client-side {@link TransactionFeeExposure} from a node
 * `NativeReceiptFee` block — purely arithmetic, no network access.
 *
 * `effectiveGasPricePerUnit` sums the base price per execution unit and
 * the priority tip per execution unit, matching the chain's
 * `(base_price + priority_tip) × execution_units` fee formula.
 */
declare function transactionFeeExposure(fee: NativeReceiptFee): TransactionFeeExposure;

/**
 * Canonical chain constants exported from `@monolythium/core-sdk`.
 *
 * These values are sourced from the mono-core runtime — never hand-pick
 * a different address or pretend the burn destination lives elsewhere.
 * Cross-references below cite the runtime files that own each value.
 */
/**
 * Base-fee burn destination.
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
 * `0x1002`, `0x1006`, `0x1007`, and `0x1103` are intentionally absent.
 * They are not part of the current SDK surface.
 */
declare const PRECOMPILE_ADDRESSES: {
    /** Native fungible-token factory — non-gateable, foundational. */
    readonly TOKEN_FACTORY: "0x0000000000000000000000000000000000001000";
    /** Native central-limit order book — gateable. */
    readonly CLOB: "0x0000000000000000000000000000000000001001";
    /** Agent execution surface — gateable. */
    readonly AGENT: "0x0000000000000000000000000000000000001003";
    /** Account privacy policy + stealth/confidential ops — gateable. */
    readonly PRIVACY: "0x0000000000000000000000000000000000001004";
    /** Operator + RPC node registry — non-gateable consensus invariant. */
    readonly NODE_REGISTRY: "0x0000000000000000000000000000000000001005";
    /** Native bridge route-control surface — gateable. */
    readonly BRIDGE: "0x0000000000000000000000000000000000001008";
    /** Decentralized multi-signer oracle — non-gateable. */
    readonly ORACLE: "0x0000000000000000000000000000000000001009";
    /** Distributed delegation primitive — gateable. */
    readonly DELEGATION: "0x000000000000000000000000000000000000100A";
    /** Operator-fee router — skims an operator surcharge on routed CLOB ops; gateable. */
    readonly OPERATOR_ROUTER: "0x000000000000000000000000000000000000100B";
    /** GPU prover market — gateable, genesis-disabled (foundation milestone flip). */
    readonly PROVER_MARKET: "0x000000000000000000000000000000000000100C";
    /** One-time emergency-key registry — non-gateable. */
    readonly EMERGENCY_KEY: "0x0000000000000000000000000000000000001100";
    /** VRF precompile. */
    readonly VRF: "0x0000000000000000000000000000000000001101";
    /** Streaming-payments primitive — gateable. */
    readonly STREAMING_PAYMENTS: "0x0000000000000000000000000000000000001102";
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
    /** Agent spending policy — gateable. */
    readonly SPENDING_POLICY: "0x000000000000000000000000000000000000110C";
    /** Primary ML-DSA-65 pubkey registry — gateable. */
    readonly PUBKEY_REGISTRY: "0x000000000000000000000000000000000000110D";
    /** Hierarchical name registry — gateable. */
    readonly NAME_REGISTRY: "0x000000000000000000000000000000000000110E";
};
/** Precompile address-key type — useful for typed maps over the surface. */
type PrecompileName = keyof typeof PRECOMPILE_ADDRESSES;
/** Precompile address value type. */
type PrecompileAddress = (typeof PRECOMPILE_ADDRESSES)[PrecompileName];
/**
 * Operator-router precompile address (`0x100B`).
 *
 * Convenience alias for {@link PRECOMPILE_ADDRESSES}`.OPERATOR_ROUTER`.
 * Sourced from `mono-core` `operator-router::storage::OPERATOR_ROUTER_ADDRESS`.
 */
declare const OPERATOR_ROUTER_ADDRESS: "0x000000000000000000000000000000000000100B";
/**
 * Protocol ceiling on the operator surcharge, in basis points
 * (`100 = 1.00%`).
 *
 * Enforced on-chain at both write time (operator registration / update)
 * and read time (the `placeLimitOrderVia` op); this constant is the
 * advisory UX mirror so wallets can validate / display a fee before
 * submitting. Sourced from `mono-core`
 * `operator-router::storage::PROTOCOL_MAX_OPERATOR_FEE_BPS`.
 */
declare const PROTOCOL_MAX_OPERATOR_FEE_BPS: 100;

/**
 * Delegation precompile ABI helpers.
 *
 * The V4.1 redemption completion call prunes a matured redemption
 * queue ticket. It does not imply principal payout until mono-core adds
 * stake-vault/redemption-escrow accounting.
 */
declare const DELEGATION_SELECTORS: {
    readonly delegate: "0x662337de";
    readonly undelegate: "0x914f3ca8";
    readonly redelegate: "0xa06ac18f";
    readonly claim: "0x4e71d92d";
    readonly setAutoCompound: "0x86593454";
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
/** `delegate(uint32 cluster, uint16 weightBps)` — caller sends LYTH as msg.value
 *  to set their principal stake for `cluster`; `weightBps` is the fraction
 *  of voting power (max 10_000 = 100%). */
declare function encodeDelegateCalldata(cluster: bigint | number | string, weightBps: bigint | number | string): string;
/** `undelegate(uint32 cluster)` — removes the caller's row + appends a
 *  redemption ticket. Principal becomes claimable through
 *  `completeRedemption(uint64 index)` once the ticket matures. */
declare function encodeUndelegateCalldata(cluster: bigint | number | string): string;
/** `redelegate(uint32 fromCluster, uint32 toCluster, uint16 weightBps)`. */
declare function encodeRedelegateCalldata(fromCluster: bigint | number | string, toCluster: bigint | number | string, weightBps: bigint | number | string): string;
/** `claim()` — settle + withdraw the caller's pending delegation rewards. */
declare function encodeClaimCalldata(): string;
/** `setAutoCompound(bool enabled)` — persists the caller's auto-compound
 *  preference. */
declare function encodeSetAutoCompoundCalldata(enabled: boolean): string;
declare function isRedemptionPrincipalUnavailableRevert(data: string | Uint8Array | readonly number[]): boolean;

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
declare function encodeLookupPubkeyCalldata(address: string): string;
declare function encodeHasPubkeyCalldata(address: string): string;
declare function decodeLookupPubkeyReturn(data: Uint8Array | readonly number[] | string): PubkeyLookup;
declare function decodeHasPubkeyReturn(data: Uint8Array | readonly number[] | string): boolean;

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
type NativeAgentAddressInput = string | {
    kind?: NativeAgentAddressKind;
    address: string;
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
 * Network identity constants.
 *
 * Monolythium testnet `chain_id` is **`69420`**. Mainnet chain id is
 * reserved for the genesis ceremony and not yet exported.
 */
/** Monolythium testnet chain id. */
declare const MONOLYTHIUM_TESTNET_CHAIN_ID = 69420n;
/** Network name surfaced alongside chain identity. */
declare const MONOLYTHIUM_TESTNET_NETWORK_NAME = "monolythium-testnet";
/**
 * Built-in network presets. Callers that point at a different chain id
 * (e.g. a local dev node) construct identity records explicitly.
 */
declare const MONOLYTHIUM_NETWORKS: {
    readonly testnet: {
        readonly chainId: 69420n;
        readonly name: "monolythium-testnet";
    };
};
/** Network identity record. */
interface MonolythiumNetworkConfig {
    /** Numeric chain id (e.g. `69420n`). */
    chainId: bigint;
    /** Human-readable network name. */
    name: string;
}

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
declare const version = "0.3.15";

export { AddressFlowResponse, AddressKind, AddressProfileResponse, AgentActionError, type ApiAddressActivityData, type ApiAddressActivityEntry, type ApiAddressActivityKind, type ApiAddressActivityKindData, type ApiAddressActivityKindSummary, type ApiBlockData, type ApiBlockHeader, type ApiBlockTransactionsData, type ApiCapabilitiesResponse, ApiClient, type ApiClientOptions, type ApiClusterData, type ApiClusterDirectoryEntry, type ApiClusterDirectoryPage, type ApiClusterMember, type ApiClusterStatus, type ApiClustersData, type ApiEnvelope, type ApiErrorEnvelope, type ApiHealthResponse, type ApiIndexerStatus, type ApiLatestAnchor, type ApiLogEntry, type ApiOperatorData, type ApiOperatorInfo, type ApiQueryValue, type ApiRuntimeProvenanceData, type ApiServiceProbeData, ApiStreamsIndexResponse, type ApiTransactionData, type ApiTransactionNativeReceiptData, type ApiTransactionReceipt, type ApiTransactionReceiptData, type ApiTransactionView, type ApiUpgradePlanStatus, type ApiUpgradeStatus, type ApiUpgradeStatusData, BURN_ADDR, BlockSelector, BridgeRoutesRequest, BridgeRoutesResponse, type CallRequest, ChainStatsResponse, ClobMarketResponse, ClobMarketsResponse, ClobOhlcResponse, ClobOrderBookResponse, ClobTradesResponse, DELEGATION_REVERT_TAGS, DELEGATION_SELECTORS, DelegationPrecompileError, EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER, type EncodeNativeAgentAvailabilitySlotArgs, type EncodeNativeAgentCounterEscrowArgs, type EncodeNativeAgentCreateEscrowArgs, type EncodeNativeAgentDeactivateServiceArgs, type EncodeNativeAgentEscrowActorArgs, type EncodeNativeAgentGrantConsentArgs, type EncodeNativeAgentIssueAttestationArgs, type EncodeNativeAgentListServiceArgs, type EncodeNativeAgentRecordPolicySpendArgs, type EncodeNativeAgentRecordReputationArgs, type EncodeNativeAgentRegisterArbiterArgs, type EncodeNativeAgentRegisterIssuerArgs, type EncodeNativeAgentResolveEscrowArgs, type EncodeNativeAgentRevokeAttestationArgs, type EncodeNativeAgentRevokeConsentArgs, type EncodeNativeAgentSetAvailabilityArgs, type EncodeNativeAgentSetSpendingPolicyArgs, type EncodeNativeAgentStartEscrowArgs, type EncodeNativeAgentSubmitEscrowArgs, type HealthSummary, LYTHOSHI_PER_LYTH, LYTH_DECIMALS, type LatencyBands, type LythFormatOptions, MIN_EXECUTION_UNIT_PRICE_LYTHOSHI, MONOLYTHIUM_NETWORKS, MONOLYTHIUM_TESTNET_CHAIN_ID, MONOLYTHIUM_TESTNET_NETWORK_NAME, MRV_DEPLOY_PAYLOAD_VERSION, MRV_FORMAT_VERSION, MRV_MAX_ABI_SYMBOLS, MRV_MAX_CODE_BYTES, MRV_MAX_DEBUG_BYTES, MRV_MAX_MEMORY_PAGES, MRV_MAX_STORAGE_NAMESPACE_BYTES, MRV_MEMORY_PAGE_BYTES, MRV_PROFILE_MONO_RV32IM_V1, MRV_STRUCTURED_FEE_FIELDS, MRV_TX_EXTENSION_KIND, MRV_TX_EXTENSION_V1, type MonolythiumNetworkConfig, type MrcAccountRequest, MrcAccountResponse, type MrcHoldersRequest, MrcHoldersResponse, MrcMetadataResponse, type MrvAbiManifest, type MrvAbiParam, type MrvAbiSymbol, type MrvAbiSymbolKind, type MrvAbiType, type MrvAddressKind, type MrvArtifactMetadata, type MrvBuildMetadata, type MrvBytesLike, type MrvCallNativeTxOptions, type MrvCallNativeTxPlan, type MrvCallPlan, type MrvCallRequest, type MrvCallResponse, type MrvCallStatus, type MrvCallSubmission, type MrvCallSubmitOptions, type MrvDecimalLike, type MrvDeployNativeTxOptions, type MrvDeployNativeTxPlan, type MrvDeployPayload, type MrvDeployPayloadNativeTxOptions, type MrvDeployPayloadPlanOptions, type MrvDeployPayloadRequestOptions, type MrvDeployPayloadSubmission, type MrvDeployPayloadSubmitOptions, type MrvDeployPlan, type MrvDeployPlanOptions, type MrvDeployRequest, type MrvDeployResponse, type MrvDeploySubmission, type MrvDeploySubmitOptions, type MrvEncryptedSubmissionResult, type MrvEventRecord, type MrvExecutionReceipt, type MrvFeeDisplayConformanceInput, type MrvFeeDisplayConformanceReport, type MrvMemoryLimits, type MrvMeterCounters, type MrvNativeFeePreview, type MrvNativeStateDelta, type MrvNativeTxFacade, type MrvRequestBuildOptions, type MrvResolvedSyscall, type MrvRevertPayload, type MrvRiscvProfile, type MrvStorageNamespace, type MrvStructuredFeeConformanceOptions, type MrvStructuredFeeConformanceReport, type MrvSyscallImport, type MrvTransactionExtension, type MrvTypedAddress, type MrvValidatedArtifactMetadata, MrvValidationError, NATIVE_AGENT_MODULE_ADDRESS, NATIVE_AGENT_MODULE_ADDRESS_BYTES, NATIVE_DEV_HOST_API_VERSION, NATIVE_DEV_IPC_PROTOCOL_VERSION, NATIVE_DEV_MANIFEST_SCHEMA_VERSION, NATIVE_LYTH_DECIMALS, type NativeAgentAddressInput, type NativeAgentAddressKind, type NativeAgentEscrowResolution, type NativeAgentForwarderInput, type NativeAgentModuleCallEnvelope, type NativeAgentModuleContractCall, type NativeAgentReputationScores, NativeAgentStateFilter, NativeAgentStateResponse, NativeDecodedEvent, type NativeDevApprovalKind, type NativeDevCommandName, type NativeDevContractPassport, type NativeDevHostApprovalResultMessage, type NativeDevHostCommandMessage, type NativeDevHostContextMessage, type NativeDevIpcMessage, type NativeDevMrcAllocation, type NativeDevMrcAssetKind, type NativeDevMrcTokenPlan, type NativeDevMrvDeployPlan, type NativeDevRiskLabel, type NativeDevRiskSeverity, type NativeDevSidecarApprovalRequestMessage, type NativeDevSidecarCommandResultMessage, type NativeDevSidecarProjectEventMessage, type NativeDevSidecarReadyMessage, type NativeDevVerificationBundle, type NativeDevWalletApprovalRequest, type NativeDevkitArchive, type NativeDevkitChannel, type NativeDevkitCompatibility, type NativeDevkitManifest, type NativeDevkitSidecarManifest, type NativeDevkitSidecarStatus, type NativeDevkitStatus, NativeEventFilter, NativeEventsFilter, NativeEventsResponse, NativeMarketOrderBookDeltasRequest, NativeMarketOrderBookDeltasResponse, NativeMarketStateFilter, NativeMarketStateResponse, NativeReceiptFee, type NativeReceiptFeeDisplay, NativeReceiptResponse, OPERATOR_ROUTER_ADDRESS, OperatorCapabilitiesResponse, PRECOMPILE_ADDRESSES, PROTOCOL_MAX_OPERATOR_FEE_BPS, PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN, PUBKEY_REGISTRY_SELECTORS, PendingRewardsResponse, type PrecompileAddress, type PrecompileName, type PubkeyLookup, PubkeyRegistryError, REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT, RedemptionQueueResponse, type ResolvedExecutionFee, RpcClient, RuntimeBuildProvenance, RuntimeUpgradeStatus, SdkError, SearchResponse, ServiceProbeResponse, type StudioHostState, type StudioHostStatus, TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT, type TransactionFeeExposure, TxFeedResponse, TypedAddress, TypedNativeReceiptEvent, apiEndpointFromRpcEndpoint, assertMrvCallNativeSubmissionPlan, assertMrvDeployNativeSubmissionPlan, assertMrvFeeDisplayConformance, assertMrvStructuredFeeConformance, assertNativeDevMrcTokenPlan, assertNativeDevMrvDeployPlan, assertNativeDevWalletApprovalRequest, buildMrvCallNativeTxPlan, buildMrvCallPlan, buildMrvCallRequest, buildMrvDeployNativeTxPlan, buildMrvDeployPayloadNativeTxPlan, buildMrvDeployPayloadPlan, buildMrvDeployPayloadRequest, buildMrvDeployPlan, buildMrvDeployRequest, buildNativeAgentCreateEscrowForwarderInput, buildNativeAgentCreateEscrowModuleCall, buildNativeAgentModuleCallEnvelope, buildNativeAgentRecordReputationForwarderInput, buildNativeAgentRecordReputationModuleCall, buildNativeAgentSetSpendingPolicyForwarderInput, buildNativeAgentSetSpendingPolicyModuleCall, checkMrvFeeDisplayConformance, checkMrvStructuredFeeConformance, checkNativeDevkitCompatibility, clampPriorityTip, compareNativeDevVersions, decodeHasPubkeyReturn, decodeLookupPubkeyReturn, delegationAddressHex, deriveMrvContractAddress, encodeClaimCalldata, encodeCompleteRedemptionCalldata, encodeDelegateCalldata, encodeHasPubkeyCalldata, encodeLookupPubkeyCalldata, encodeMrvDeployPayload, encodeNativeAgentAcceptEscrowCall, encodeNativeAgentApproveEscrowCall, encodeNativeAgentArbiterGetCall, encodeNativeAgentAttestationGetCall, encodeNativeAgentAvailabilityGetCall, encodeNativeAgentCancelEscrowCall, encodeNativeAgentCloseAvailabilityCall, encodeNativeAgentConsentGetCall, encodeNativeAgentCounterEscrowCall, encodeNativeAgentCreateEscrowCall, encodeNativeAgentDeactivateServiceCall, encodeNativeAgentDisputeEscrowCall, encodeNativeAgentEscrowGetCall, encodeNativeAgentGrantConsentCall, encodeNativeAgentIssueAttestationCall, encodeNativeAgentIssuerGetCall, encodeNativeAgentListServiceCall, encodeNativeAgentModuleForwarderInput, encodeNativeAgentOpenAvailabilityCall, encodeNativeAgentRecordPolicySpendCall, encodeNativeAgentRecordReputationCall, encodeNativeAgentRegisterArbiterCall, encodeNativeAgentRegisterIssuerCall, encodeNativeAgentReputationGetCall, encodeNativeAgentResolveEscrowCall, encodeNativeAgentRevokeAttestationCall, encodeNativeAgentRevokeConsentCall, encodeNativeAgentServiceGetCall, encodeNativeAgentSetAvailabilityCall, encodeNativeAgentSetSpendingPolicyCall, encodeNativeAgentSpendingPolicyGetCall, encodeNativeAgentStartEscrowCall, encodeNativeAgentSubmitEscrowCall, encodeRedelegateCalldata, encodeRegisterPubkeyCalldata, encodeSetAutoCompoundCalldata, encodeUndelegateCalldata, formatLyth, formatLythoshi, formatNativeReceiptFeeDisplay, isRedemptionPrincipalUnavailableRevert, mrvAddressToBech32, mrvBech32ToAddress, mrvCodeHashHex, mrvV1TransactionExtension, nativeDevSchemaFieldNames, nativeDevUiStrings, parseLythToLythoshi, pubkeyRegistryAddressHex, resolveExecutionFee, resolveMaxExecutionUnitPrice, resolveRegistryExecutionFee, resolveStudioHostStatus, submitMrvCallNativeTx, submitMrvDeployNativeTx, submitMrvDeployPayloadNativeTx, transactionFeeExposure, validateMrvArtifactMetadata, validateMrvCallRequest, validateMrvDeployRequest, version };
