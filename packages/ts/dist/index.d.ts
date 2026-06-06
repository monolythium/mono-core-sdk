import { N as NativeReceiptFee, O as OperatorCapabilitiesResponse, R as RuntimeBuildProvenance, a as RuntimeUpgradeStatus, S as SearchResponse, C as ChainStatsResponse, B as BlockSelector, A as ApiStreamsIndexResponse, T as TxFeedResponse, b as NativeReceiptResponse, c as NativeDecodedEvent, d as NativeEventFilter, e as TypedNativeReceiptEvent, f as NativeEventsFilter, g as NativeEventsResponse, h as NativeAgentStateFilter, i as NativeAgentStateResponse, j as NativeMarketStateFilter, k as NativeMarketStateResponse, l as NativeMarketOrderBookDeltasRequest, m as NativeMarketOrderBookDeltasResponse, n as AddressProfileResponse, o as AddressFlowResponse, P as PendingRewardsResponse, p as RedemptionQueueResponse, M as MrcMetadataResponse, q as MrcAccountResponse, r as MrcHoldersResponse, s as BridgeRoutesRequest, t as BridgeRoutesResponse, u as ServiceProbeResponse, v as ClobMarketsResponse, w as ClobMarketResponse, x as ClobTradesResponse, y as ClobOhlcResponse, z as ClobOrderBookResponse, D as NativeEvmTxFields, E as EncryptionKey, F as MempoolClass, G as TypedAddress, H as RpcClient, I as MlDsa65Backend, J as ExecutionUnitPriceResponse, K as ClusterSealKeys, L as ClusterSealKeysSource, Q as ClusterJoinRequestView, U as AddressKind } from './submission-BANtfhPp.js';
export { V as ADDRESS_HRP, W as ADDRESS_KIND_HRPS, X as API_STREAM_TOPICS, Y as AccountPolicy, Z as AccountProofResponse, _ as Address, $ as AddressActivityArchiveRedirect, a0 as AddressActivityEntry, a1 as AddressActivityEntryEnriched, a2 as AddressActivityKind, a3 as AddressActivityKindResponse, a4 as AddressActivityKindRetention, a5 as AddressError, a6 as AddressLabelRecord, a7 as AddressValidation, a8 as AgentReputationCategoryScope, a9 as AgentReputationRecord, aa as AgentReputationResponse, ab as ApiStreamTopic, ac as ApiStreamTopicMetadata, ad as ApiStreamTopicRetention, ae as AssetPolicy, af as AttestDkgReshareCalldataArgs, ag as AttestationWindow, ah as BRIDGE_QUOTE_API_BLOCKED_REASON, ai as BRIDGE_REVERT_TAGS, aj as BRIDGE_SELECTORS, ak as BRIDGE_SUBMIT_API_BLOCKED_REASON, al as BlockHeader, am as BlockTag, an as BlsCertificateResponse, ao as BridgeAdminControl, ap as BridgeAnchorState, aq as BridgeBreakerState, ar as BridgeBytesInput, as as BridgeCircuitBreakerFields, at as BridgeCircuitBreakerState, au as BridgeDrainCap, av as BridgeDrainStatus, aw as BridgeHealthRecord, ax as BridgeHealthResponse, ay as BridgePrecompileError, az as BridgeQuoteSubmitReadiness, aA as BridgeRiskTier, aB as BridgeRouteAssessment, aC as BridgeRouteCandidate, aD as BridgeRouteCatalogue, aE as BridgeRouteCatalogueError, aF as BridgeRouteCatalogueJsonOptions, aG as BridgeRouteCataloguePayload, aH as BridgeRouteCatalogueRoute, aI as BridgeRouteCatalogueValidation, aJ as BridgeRouteDisclosure, aK as BridgeRouteSelection, aL as BridgeRoutesSource, aM as BridgeTransferIntent, aN as BridgeTransferRequest, aO as BridgeVerifierDisclosure, aP as CHAIN_REGISTRY, aQ as CHAIN_REGISTRY_RAW_BASE, aR as CLOB_MARKET_ID_DOMAIN_TAG, aS as CLOB_SELECTORS, aT as CLUSTER_FORMED_EVENT_SIG, aU as CallRequest, aV as CancelClusterJoinCalldataArgs, aW as CancelPendingChangeCalldataArgs, aX as CancelSpotOrderArgs, aY as CapabilitiesResponse, aZ as CapabilityDescriptor, a_ as ChainInfo, a$ as ChainRegistry, b0 as CheckpointRecord, b1 as CirculatingSupplyResponse, b2 as ClobMarketAssets, b3 as ClobMarketRecord, b4 as ClobMarketSummary, b5 as ClobTrade, b6 as ClusterAprResponse, b7 as ClusterDelegatorsResponse, b8 as ClusterDirectoryEntryResponse, b9 as ClusterDirectoryPageResponse, ba as ClusterDiversity, bb as ClusterDiversityView, bc as ClusterEntityResponse, bd as ClusterFormedEvent, be as ClusterJoinRequestStatus, bf as ClusterMemberResponse, bg as ClusterNameResponse, bh as ClusterResignationRow, bi as ClusterResignationsResponse, bj as ClusterStatusResponse, bk as CreateRequestCanonicalArgs, bl as DIVERSITY_SCORE_MAX, bm as DagParent, bn as DagParentsResponse, bo as DagSyncStatus, bp as DecodeTxExtension, bq as DecodeTxLog, br as DecodeTxPqAttestation, bs as DecodeTxResponse, bt as DelegationCapResponse, bu as DelegationHistoryRecord, bv as DelegationRow, bw as DelegationsResponse, bx as DutyAbsence, by as EMPTY_ROOT, bz as EncodeNativeNftBuyListingArgs, bA as EncodeNativeNftCancelListingArgs, bB as EncodeNativeNftCreateListingArgs, bC as EncodeNativeNftPlaceAuctionBidArgs, bD as EncodeNativeNftSettleAuctionArgs, bE as EncodeNativeNftSweepExpiredListingsArgs, bF as EncodeNativeSpotCancelOrderArgs, bG as EncodeNativeSpotCreateMarketArgs, bH as EncodeNativeSpotLimitOrderArgs, bI as EncodeNativeSpotSettleLimitOrderArgs, bJ as EncodeNativeSpotSettleRoutedLimitOrderArgs, bK as EncryptionKeyResponse, bL as EntityRatchetResponse, bM as EthCallRequest, bN as EthSendTransactionRequest, bO as ExpireClusterJoinCalldataArgs, bP as ExplorerEndpoint, bQ as FEED_ID_DOMAIN_TAG, bR as FeeHistoryResponse, bS as FormClusterCalldataArgs, bT as GapRange, bU as GapRecord, bV as GapRecordsResponse, bW as GetClusterJoinRequestCalldataArgs, bX as GetOperatorSealKeyCalldataArgs, bY as Hash, bZ as Hex, b_ as IndexerStatus, b$ as JailStatusWindow, c0 as KeyRotationWindow, c1 as ListProofRequestsResponse, c2 as LythUpgradePlanStatus, c3 as LythUpgradeStatusResponse, c4 as MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES, c5 as MAX_NATIVE_RECEIPT_EVENTS, c6 as ML_DSA_65_PUBLIC_KEY_LEN, c7 as ML_DSA_65_SIGNATURE_LEN, c8 as MULTISIG_ADDRESS_DERIVATION_DOMAIN, c9 as MarketActionError, ca as MarketTransactionPlan, cb as MempoolSnapshot, cc as MeshDecodedTx, cd as MeshSignedTxResponse, ce as MeshTxIntent, cf as MeshUnsignedTxResponse, cg as MetricsRangeResponse, ch as MetricsRangeSample, ci as MetricsRangeSeries, cj as MetricsRangeStatus, ck as MrcAccountRecord, cl as MrcMetadataRecord, cm as MrcPolicyRecord, cn as MrcPolicySpendRecord, co as NAME_BASE_MULTIPLIER, cp as NAME_FALLBACK_FEE_UNIT_LYTHOSHI, cq as NAME_LABEL_MAX_LEN, cr as NAME_LABEL_MIN_LEN, cs as NAME_MAX_LEN, ct as NAME_REGISTRY_SELECTORS, cu as NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE, cv as NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY, cw as NATIVE_CALL_FORWARDER_RESPONSE_OFFSET, cx as NATIVE_MARKET_EVENT_FAMILY, cy as NATIVE_MARKET_MODULE_ADDRESS, cz as NATIVE_MARKET_MODULE_ADDRESS_BYTES, cA as NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC, cB as NODE_REGISTRY_BLS_PUBKEY_BYTES, cC as NODE_REGISTRY_CAPABILITIES, cD as NODE_REGISTRY_CAPABILITY_MASK, cE as NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES, cF as NODE_REGISTRY_CONSENSUS_POP_BYTES, cG as NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES, cH as NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES, cI as NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES, cJ as NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS, cK as NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS, cL as NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES, cM as NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT, cN as NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT, cO as NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN, cP as NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT, cQ as NODE_REGISTRY_FORM_CLUSTER_THRESHOLD, cR as NODE_REGISTRY_LEGACY_CLUSTER_MEMBER_PUBKEY_BYTES, cS as NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES, cT as NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES, cU as NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES, cV as NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID, cW as NODE_REGISTRY_PUBLIC_SERVICE_MASK, cX as NODE_REGISTRY_SELECTORS, cY as NO_EVM_ARCHIVE_PROOF_SCHEMA, cZ as NO_EVM_ARCHIVE_SIGNATURE_SCHEME, c_ as NO_EVM_FINALITY_EVIDENCE_SCHEMA, c$ as NO_EVM_FINALITY_EVIDENCE_SOURCE, d0 as NO_EVM_RECEIPTS_ROOT_DOMAIN, d1 as NO_EVM_RECEIPT_CODEC, d2 as NO_EVM_RECEIPT_PROOF_SCHEMA, d3 as NO_EVM_RECEIPT_PROOF_TYPE, d4 as NO_EVM_RECEIPT_ROOT_ALGORITHM, d5 as NameCategory, d6 as NameOfResponse, d7 as NameRegistrationQuote, d8 as NameRegistryError, d9 as NativeAgentArbiterStateRecord, da as NativeAgentAttestationStateRecord, db as NativeAgentAvailabilityStateRecord, dc as NativeAgentConsentStateRecord, dd as NativeAgentEscrowStateRecord, de as NativeAgentIssuerStateRecord, df as NativeAgentPolicySpendStateRecord, dg as NativeAgentPolicyStateRecord, dh as NativeAgentReputationReviewStateRecord, di as NativeAgentServiceStateRecord, dj as NativeAgentStateFilterParamValue, dk as NativeAgentStateResponseFilters, dl as NativeAgentStateSource, dm as NativeCallForwarderArtifact, dn as NativeCollectionRoyaltyStateRecord, dp as NativeEventConsumer, dq as NativeEventProjection, dr as NativeEventsResponseFilters, ds as NativeEventsSource, dt as NativeMarketAddressInput, du as NativeMarketAddressKind, dv as NativeMarketForwarderInput, dw as NativeMarketModuleCallEnvelope, dx as NativeMarketModuleContractCall, dy as NativeMarketOrderBookDelta, dz as NativeMarketOrderBookDeltasResponseFilters, dA as NativeMarketOrderBookDeltasSource, dB as NativeMarketOrderBookStreamAction, dC as NativeMarketOrderBookStreamPayload, dD as NativeMarketStateFilterParamValue, dE as NativeMarketStateResponseFilters, dF as NativeMarketStateSource, dG as NativeModuleForwarderDescriptor, dH as NativeMrcPolicyProjection, dI as NativeNftAssetStandard, dJ as NativeNftListingKind, dK as NativeNftListingStateRecord, dL as NativeReceiptCounters, dM as NativeReceiptEvent, dN as NativeReceiptSource, dO as NativeSpotMarketStateRecord, dP as NativeSpotOrderStateRecord, dQ as NetworkClientOptions, dR as NetworkSlug, dS as NoEvmArchiveCoveringSnapshot, dT as NoEvmArchiveProof, dU as NoEvmArchiveSignatureVerification, dV as NoEvmArchiveSignatureVerificationIssue, dW as NoEvmArchiveSignatureVerificationIssueCode, dX as NoEvmArchiveTrustedSigner, dY as NoEvmBlockBlsFinalityVerification, dZ as NoEvmBlockRoundFinalityVerification, d_ as NoEvmBlsFinalityVerification, d$ as NoEvmFinalityBlockReference, e0 as NoEvmFinalityCertificate, e1 as NoEvmFinalityEvidence, e2 as NoEvmReceiptFinalityTrustPolicy, e3 as NoEvmReceiptProof, e4 as NoEvmReceiptProofError, e5 as NoEvmReceiptProofErrorCode, e6 as NoEvmReceiptProofVerification, e7 as NoEvmReceiptTrustIssue, e8 as NoEvmReceiptTrustIssueCode, e9 as NoEvmReceiptTrustPolicy, ea as NoEvmReceiptTrustVerification, eb as NoEvmReceiptTrustedBlsSigner, ec as NoEvmReceiptTrustedSigner, ed as NoEvmRoundFinalityVerification, ee as NodeHostingClass, ef as NodeRegistryError, eg as OPERATOR_ROUTER_EVENT_SIGS, eh as OPERATOR_ROUTER_SELECTORS, ei as OPERATOR_ROUTER_SIGS, ej as ORACLE_EVENT_SIGS, ek as OperatorAuthorityResponse, el as OperatorFeeChargedEvent, em as OperatorFeeConfig, en as OperatorFeeQuote, eo as OperatorInfoResponse, ep as OperatorNetworkMetadata, eq as OperatorNetworkMetadataView, er as OperatorRiskResponse, es as OperatorRouterConfig, et as OperatorSigningActivityResponse, eu as OperatorSigningEntry, ev as OperatorSurfaceCapability, ew as OperatorSurfaceStatus, ex as OracleEvent, ey as OracleEventError, ez as OracleFeedConfig, eA as OracleLatestPrice, eB as OracleSignerRow, eC as OracleSignersResponse, eD as OracleWriters, eE as P2pSeed, eF as PENDING_CHANGE_KIND_CODES, eG as PROVER_MARKET_ADDRESS, eH as PROVER_MARKET_BID_DOMAIN, eI as PROVER_MARKET_EVENT_SIGS, eJ as PROVER_MARKET_REQUEST_DOMAIN, eK as PROVER_MARKET_SELECTORS, eL as PROVER_MARKET_SUBMIT_DOMAIN, eM as PROVER_SLASH_REASON_BAD_PROOF, eN as PROVER_SLASH_REASON_NON_DELIVERY, eO as ParsedName, eP as PeerSummary, eQ as PeerSummaryAggregate, eR as PendingChangeKind, eS as PendingRewardsRow, eT as PendingTxSummary, eU as PlaceLimitOrderViaArgs, eV as PlaceLimitOrderViaPlan, eW as PlaceSpotLimitOrderArgs, eX as PlaceSpotMarketOrderArgs, eY as PlaceSpotMarketOrderExArgs, eZ as PrecompileCatalogueResponse, e_ as PrecompileDescriptor, e$ as ProofRequestRow, f0 as ProofRequestView, f1 as ProverBidView, f2 as ProverBidsResponse, f3 as ProverMarketError, f4 as ProverMarketState, f5 as ProverMarketStatusResponse, f6 as PublishOperatorSealKeyCalldataArgs, f7 as Quantity, f8 as QuoteLiquidity, f9 as RESERVED_ADDRESS_HRPS, fa as RankedBridgeRoute, fb as ReceiptProofTrustArchivePolicy, fc as ReceiptProofTrustArchiveSigner, fd as ReceiptProofTrustFinalityPolicy, fe as ReceiptProofTrustFinalitySigner, ff as ReceiptProofTrustPolicy, fg as RedemptionQueueTicket, fh as RegistryRecord, fi as ReportServiceProbeCalldataArgs, fj as ReportServiceProbeRequest, fk as ReportServiceProbeResponse, fl as RequestClusterJoinCalldataArgs, fm as ResolveNameResponse, fn as RichListHolder, fo as RichListResponse, fp as RoundCertificateResponse, fq as RoundInfo, fr as RpcClientOptions, fs as RpcEndpoint, ft as RuntimeProvenanceResponse, fu as SERVES_GPU_PROVE, fv as SERVICE_PROBE_STATUS, fw as SET_POLICY_CLAIM_DOMAIN_TAG, fx as SPENDING_POLICY_SELECTORS, fy as SearchHit, fz as ServiceProbeStatusLabel, fA as SetOperatorDisplayCalldataArgs, fB as SigningEntryStatus, fC as SpendingPolicyArgs, fD as SpendingPolicyError, fE as SpendingPolicyTimeWindow, fF as SpendingPolicyView, fG as SpotLimitOrderSide, fH as SpotMarketOrderMode, fI as StorageProofBatch, fJ as SubmitPendingChangeCalldataArgs, fK as SwapIntentStatus, fL as SyncStatus, fM as TESTNET_69420, fN as TokenBalanceMrcIdentity, fO as TokenBalanceRecord, fP as TokenBalanceWithMetadata, fQ as TotalBurnedResponse, fR as TpmAttestationResponse, fS as TransactionReceipt, fT as TransactionView, fU as TxConfirmations, fV as TxFeedReceipt, fW as TxFeedTransaction, fX as TxStatusFoundResponse, fY as TxStatusNotFoundResponse, fZ as TxStatusResponse, f_ as UpcomingDutiesResponse, f$ as UpcomingDutyMap, g0 as UserAddressInput, g1 as V1_BRIDGE_ALLOWED_FEE_TOKEN, g2 as V1_BRIDGE_ALLOWED_PROTOCOL, g3 as VertexAtRound, g4 as VerticesAtRoundResponse, g5 as VoteClusterAdmitCalldataArgs, g6 as addressBytesToHex, g7 as addressToBech32, g8 as addressToTypedBech32, g9 as allowRootFor, ga as assertNativeMarketOrderBookStreamPayload, gb as assessBridgeRoute, gc as bech32ToAddress, gd as bech32ToAddressBytes, ge as bidSighash, gf as bridgeAddressHex, gg as bridgeDrainRemaining, gh as bridgeQuoteSubmitReadiness, gi as bridgeRoutesReadiness, gj as bridgeTransferCandidates, gk as buildBridgeRouteCatalogue, gl as buildCancelSpotOrderPlan, gm as buildNativeCallForwarderArtifact, gn as buildNativeMarketModuleCallEnvelope, go as buildNativeNftBuyListingForwarderInput, gp as buildNativeNftBuyListingModuleCall, gq as buildNativeNftCancelListingForwarderInput, gr as buildNativeNftCancelListingModuleCall, gs as buildNativeNftCreateListingForwarderInput, gt as buildNativeNftCreateListingModuleCall, gu as buildNativeNftPlaceAuctionBidForwarderInput, gv as buildNativeNftPlaceAuctionBidModuleCall, gw as buildNativeNftSettleAuctionForwarderInput, gx as buildNativeNftSettleAuctionModuleCall, gy as buildNativeNftSweepExpiredListingsForwarderInput, gz as buildNativeNftSweepExpiredListingsModuleCall, gA as buildNativeSpotCancelOrderForwarderInput, gB as buildNativeSpotCancelOrderModuleCall, gC as buildNativeSpotCreateMarketForwarderInput, gD as buildNativeSpotCreateMarketModuleCall, gE as buildNativeSpotLimitOrderForwarderInput, gF as buildNativeSpotLimitOrderModuleCall, gG as buildNativeSpotSettleLimitOrderForwarderInput, gH as buildNativeSpotSettleLimitOrderModuleCall, gI as buildNativeSpotSettleRoutedLimitOrderForwarderInput, gJ as buildNativeSpotSettleRoutedLimitOrderModuleCall, gK as buildPlaceLimitOrderViaPlan, gL as buildPlaceSpotLimitOrderPlan, gM as buildPlaceSpotMarketOrderExPlan, gN as buildPlaceSpotMarketOrderPlan, gO as categoryRoot, gP as clobAddressHex, gQ as clusterApyPercent, gR as composeClaimBoundMessage, gS as computeNoEvmDacFinalityMessage, gT as computeNoEvmLeaderFinalityMessage, gU as computeNoEvmReceiptsRoot, gV as computeNoEvmRoundFinalityMessage, gW as computeNoEvmTargetReceiptHash, gX as computeQuoteLiquidity, gY as consumeNativeEvents, gZ as decodeClusterDiversity, g_ as decodeClusterFormedEvent, g$ as decodeClusterJoinRequest, h0 as decodeNativeAgentStateResponse, h1 as decodeNativeMarketOrderBookDeltasResponse, h2 as decodeNativeReceiptResponse, h3 as decodeNoEvmReceiptTranscript, h4 as decodeOperatorFeeChargedEvent, h5 as decodeOperatorNetworkMetadata, h6 as decodeOperatorSealKey, h7 as decodeOracleEvent, h8 as decodeTimeWindow, h9 as decodeTxFeedResponse, ha as denyRootFor, hb as deriveClobMarketId, hc as deriveClusterAnchorAddress, hd as deriveFeedId, he as deriveNativeSpotMarketId, hf as deriveNativeSpotOrderId, hg as destinationRoot, hh as encodeAttestDkgReshareCalldata, hi as encodeBlockSelector, hj as encodeBridgeChallengeCalldata, hk as encodeBridgeClaimCalldata, hl as encodeCancelClusterJoinCalldata, hm as encodeCancelOrderCalldata, hn as encodeCancelPendingChangeCalldata, ho as encodeClaimPolicyByAddressCalldata, hp as encodeCreateRequestCalldata, hq as encodeCreateRequestCanonical, hr as encodeDisableCalldata, hs as encodeEnableCalldata, ht as encodeExpireClusterJoinCalldata, hu as encodeFormClusterCalldata, hv as encodeGetClusterJoinRequestCalldata, hw as encodeGetOperatorSealKeyCalldata, hx as encodeLockBridgeConfigCalldata, hy as encodeNameAcceptTransferCall, hz as encodeNameProposeTransferCall, hA as encodeNameRegisterCall, hB as encodeNativeMarketModuleForwarderInput, hC as encodeNativeNftBuyListingCall, hD as encodeNativeNftCancelListingCall, hE as encodeNativeNftCreateListingCall, hF as encodeNativeNftPlaceAuctionBidCall, hG as encodeNativeNftSettleAuctionCall, hH as encodeNativeNftSweepExpiredListingsCall, hI as encodeNativeSpotCancelOrderCall, hJ as encodeNativeSpotCreateMarketCall, hK as encodeNativeSpotLimitOrderCall, hL as encodeNativeSpotSettleLimitOrderCall, hM as encodeNativeSpotSettleRoutedLimitOrderCall, hN as encodePlaceLimitOrderCalldata, hO as encodePlaceLimitOrderViaCalldata, hP as encodePlaceMarketOrderCalldata, hQ as encodePlaceMarketOrderExCalldata, hR as encodePublishOperatorSealKeyCalldata, hS as encodeRecoverOperatorNodeCalldata, hT as encodeReportServiceProbeCalldata, hU as encodeRequestClusterJoinCalldata, hV as encodeSetBridgeResumeCooldownCalldata, hW as encodeSetBridgeRouteFinalityCalldata, hX as encodeSetLotSizeCalldata, hY as encodeSetMinNotionalCalldata, hZ as encodeSetOperatorDisplayCalldata, h_ as encodeSetPolicyCalldata, h$ as encodeSetPolicyClaimCalldata, i0 as encodeSetTickSizeCalldata, i1 as encodeSubmitBridgeProofCalldata, i2 as encodeSubmitPendingChangeCalldata, i3 as encodeVoteClusterAdmitCalldata, i4 as exportBridgeRouteCatalogueJson, i5 as fetchChainInfoLatest, i6 as fetchChainRegistryLatest, i7 as formClusterMessage, i8 as formClusterMessageHex, i9 as formatOraclePrice, ia as getChainInfo, ib as getNoEvmReceiptTrustPolicy, ic as getP2pSeeds, id as getRpcEndpoints, ie as hexToAddressBytes, ig as isBridgeAdminLockedRevert, ih as isBridgeCooldownZeroRevert, ii as isBridgeFinalityZeroRevert, ij as isBridgeResumeCooldownActiveRevert, ik as isConcreteServiceProbeStatus, il as isNativeDecodedEvent, im as isNativeMarketOrderBookStreamPayload, io as isSinglePublicServiceProbeMask, ip as isValidNodeRegistryCapabilities, iq as isValidPublicServiceProbeMask, ir as nameLengthModifierX10, is as nameRegistrationCost, it as nameRegistryAddressHex, iu as nativeAgentStateFilterParams, iv as nativeEventMatches, iw as nativeEventsFilterParams, ix as nativeEventsFromHistory, iy as nativeEventsFromReceipt, iz as nativeMarketEventFilter, iA as nativeMarketEventsFromHistory, iB as nativeMarketEventsFromReceipt, iC as nativeMarketStateFilterParams, iD as noEvmReceiptTrustPolicyFromChainInfo, iE as nodeHostingClassFromByte, iF as nodeHostingClassToByte, iG as nodeRegistryAddressHex, iH as normalizeAddressHex, iI as normalizeBridgeRouteCatalogue, iJ as normalizePendingChangeKind, iK as oracleAddressHex, iL as oraclePriceToNumber, iM as packTimeWindow, iN as parseAddress, iO as parseBridgeRouteCatalogueJson, iP as parseChainRegistryToml, iQ as parseDkgResharePublicKeys, iR as parseNameCategory, iS as parseNativeDecodedEvent, iT as parseQuantity, iU as parseQuantityBig, iV as proverMarketStateFromByte, iW as quoteOperatorFee, iX as rankBridgeRoutes, iY as rankMarketsByVolume, iZ as requestSighash, i_ as requireTypedAddress, i$ as selectBridgeTransferRoute, j0 as serviceProbeStatusLabel, j1 as setDestinationRoot, j2 as spendingPolicyAddressHex, j3 as submitSighash, j4 as typedBech32ToAddress, j5 as validateAddress, j6 as validateBridgeRouteCatalogue, j7 as verifyNoEvmArchiveProofSignatures, j8 as verifyNoEvmBlockFinalityEvidenceMultisig, j9 as verifyNoEvmBlockFinalityEvidenceThreshold, ja as verifyNoEvmFinalityEvidenceMultisig, jb as verifyNoEvmFinalityEvidenceThreshold, jc as verifyNoEvmReceiptProof, jd as verifyNoEvmReceiptProofTrust } from './submission-BANtfhPp.js';

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
    consensusPubkey: string;
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
    consensusKeyFingerprint: string | null;
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
 *  1. Registry writes and encrypted ML-DSA-65 submissions have higher
 *     intrinsic execution-unit floors than the legacy 100k default.
 *     Registry / register writes therefore default to a higher limit.
 *  2. `priority_tip_lythoshi` is a PER-UNIT price, not a total tip. The
 *     legacy registry default of `1e10` dwarfed the live per-unit cap
 *     (~2000-6000 lythoshi) and made the chain reject every registry
 *     write. The resolver below derives the cap from the live
 *     `lyth_executionUnitPrice` quote and clamps the tip to it.
 */

/**
 * Default execution-unit limit for registry / register writes.
 *
 * Register and cluster-onboarding writes carry large PQ key/proof
 * payloads and pay the encrypted-submit intrinsic floor. Pinned above
 * observed public-preview costs with headroom.
 */
declare const REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT = 1000000n;
/**
 * Default execution-unit limit for a bare native transfer.
 *
 * Public-preview encrypted ML-DSA-65 transfers currently have an
 * intrinsic floor a little above 305k execution units. A 500k default
 * keeps ordinary sealed transfers comfortably above that floor.
 */
declare const TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT = 500000n;
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
 * CJ-1 cluster-admission submit helpers.
 *
 * The low-level ABI encoders live in `node-registry.ts`. This module adds
 * the wallet-facing guardrails around those calls: ask the node's native
 * operator-onboarding preview surface first, fail before signing if CJ-1 is
 * unavailable or the request state is not admissible, then submit a sealed
 * native transaction by default.
 */

declare const DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT = 1000000n;
declare const DEFAULT_OPERATOR_SEAL_KEY_EXECUTION_UNIT_LIMIT = 1000000n;
interface ClusterJoinReadClient {
    call<T>(method: string, params?: unknown): Promise<T>;
}
interface ClusterJoinSubmitClient extends ClusterJoinReadClient {
    ethChainId(): Promise<bigint>;
    lythGetTransactionCount(address: string): Promise<bigint>;
    lythExecutionUnitPrice(): Promise<ExecutionUnitPriceResponse>;
}
interface ClusterJoinTxFee {
    maxFeePerGas: bigint | number | string;
    maxPriorityFeePerGas: bigint | number | string;
    gasLimit?: bigint | number | string;
}
interface ClusterJoinFeeOptions {
    executionUnitLimit?: bigint | number | string;
    priorityTipLythoshi?: bigint | number | string;
    minPriceLythoshi?: bigint | number | string;
    safetyMultiplier?: bigint | number | string;
}
interface ClusterJoinPrivacyOptions {
    private?: boolean;
    clusterSealKeys?: ClusterSealKeys;
    clusterSealKeysSource?: ClusterSealKeysSource;
}
interface BuildRequestClusterJoinTxFieldsArgs {
    chainId: bigint | number | string;
    nonce: bigint | number | string;
    fee: ClusterJoinTxFee;
    clusterId: bigint | number | string;
    operatorPubkey: string | Uint8Array | readonly number[];
    bondLythoshi: bigint | number | string;
}
interface BuildVoteClusterAdmitTxFieldsArgs {
    chainId: bigint | number | string;
    nonce: bigint | number | string;
    fee: ClusterJoinTxFee;
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
    voterPubkey: string | Uint8Array | readonly number[];
}
interface BuildPublishOperatorSealKeyTxFieldsArgs {
    chainId: bigint | number | string;
    nonce: bigint | number | string;
    fee: ClusterJoinTxFee;
    peerId: string | Uint8Array | readonly number[];
    sealEk: string | Uint8Array | readonly number[];
}
interface SubmitRequestClusterJoinArgs extends ClusterJoinFeeOptions, ClusterJoinPrivacyOptions {
    client: ClusterJoinSubmitClient;
    mnemonic: string;
    clusterId: bigint | number | string;
    operatorPubkey: string | Uint8Array | readonly number[];
    bondLythoshi: bigint | number | string;
}
interface SubmitVoteClusterAdmitArgs extends ClusterJoinFeeOptions, ClusterJoinPrivacyOptions {
    client: ClusterJoinSubmitClient;
    mnemonic: string;
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
    voterPubkey: string | Uint8Array | readonly number[];
}
interface SubmitPublishOperatorSealKeyArgs extends ClusterJoinFeeOptions {
    client: ClusterJoinSubmitClient;
    mnemonic: string;
    peerId: string | Uint8Array | readonly number[];
    sealEk: string | Uint8Array | readonly number[];
}
interface ClusterJoinSubmitResult {
    txHash: string;
    clusterId: string;
    operatorIdHex: string;
    innerSighashHex: string;
    signedTxWireBytes: number;
    envelopeWireBytes?: number;
}
interface OperatorSealKeySubmitResult {
    txHash: string;
    operatorIdHex: string;
    innerSighashHex: string;
    signedTxWireBytes: number;
}
interface OperatorOnboardingPreview {
    schemaVersion: number;
    capability: string;
    method: string;
    ok: boolean;
    status: "ok" | "rejected" | string;
    reason?: string | null;
    message?: string | null;
    clusterId?: number;
    operatorId?: string;
    details?: Record<string, unknown>;
}
declare function deriveClusterJoinOperatorId(operatorPubkey: string | Uint8Array | readonly number[]): string;
declare function clusterJoinRequestExists(view: ClusterJoinRequestView): boolean;
declare function readClusterJoinRequest(client: ClusterJoinReadClient, args: {
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
}): Promise<ClusterJoinRequestView>;
declare function preflightClusterJoinRequest(client: ClusterJoinReadClient, args: {
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
}): Promise<ClusterJoinRequestView>;
declare function previewRequestClusterJoin(client: ClusterJoinReadClient, args: {
    from: string;
    clusterId: bigint | number | string;
    operatorPubkey: string | Uint8Array | readonly number[];
    bondLythoshi: bigint | number | string;
}): Promise<OperatorOnboardingPreview>;
declare function previewVoteClusterAdmit(client: ClusterJoinReadClient, args: {
    from: string;
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
    voterPubkey: string | Uint8Array | readonly number[];
}): Promise<OperatorOnboardingPreview>;
declare function resolveClusterJoinExecutionFee(quote: ExecutionUnitPriceResponse, options?: ClusterJoinFeeOptions): ClusterJoinTxFee;
declare function buildRequestClusterJoinTxFields(args: BuildRequestClusterJoinTxFieldsArgs): NativeEvmTxFields;
declare function buildVoteClusterAdmitTxFields(args: BuildVoteClusterAdmitTxFieldsArgs): NativeEvmTxFields;
declare function buildPublishOperatorSealKeyTxFields(args: BuildPublishOperatorSealKeyTxFieldsArgs): NativeEvmTxFields;
declare function submitRequestClusterJoin(args: SubmitRequestClusterJoinArgs): Promise<ClusterJoinSubmitResult>;
declare function submitVoteClusterAdmit(args: SubmitVoteClusterAdmitArgs): Promise<ClusterJoinSubmitResult>;
declare function submitPublishOperatorSealKey(args: SubmitPublishOperatorSealKeyArgs): Promise<OperatorSealKeySubmitResult>;

/**
 * Token factory precompile (`0x1000`) calldata helpers.
 *
 * The factory uses Solidity-style 4-byte selectors with ABI v2 word
 * encoding. These helpers cover the complete current MRC20-like factory
 * surface so apps do not have to maintain their own selector table.
 */
declare class TokenFactoryError extends Error {
    constructor(message: string);
}
declare const TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI: 3000000000000000n;
declare const TOKEN_FACTORY_NAME_MAX_BYTES: 256;
declare const TOKEN_FACTORY_SYMBOL_MAX_BYTES: 256;
declare const TOKEN_FACTORY_MAX_DECIMALS: 30;
declare const TOKEN_FACTORY_MAX_CREATOR_FEE_BPS: 10000;
declare const TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG: 250;
declare const TOKEN_FACTORY_FLAGS: {
    readonly MINTABLE: number;
    readonly BURNABLE: number;
    readonly PAUSABLE: number;
    readonly FIXED_SUPPLY: number;
    readonly CREATOR_FEE_OPT_IN: number;
    readonly DESTRUCTIBLE: number;
};
declare const TOKEN_FACTORY_KNOWN_FLAG_MASK: number;
declare const TOKEN_FACTORY_SIGS: {
    readonly createToken: "createToken(string,string,uint8,uint256,uint256,uint32,uint16)";
    readonly transfer: "transfer(bytes32,address,uint256)";
    readonly transferFrom: "transferFrom(bytes32,address,address,uint256)";
    readonly approve: "approve(bytes32,address,uint256)";
    readonly increaseAllowance: "increaseAllowance(bytes32,address,uint256)";
    readonly decreaseAllowance: "decreaseAllowance(bytes32,address,uint256)";
    readonly balanceOf: "balanceOf(bytes32,address)";
    readonly allowance: "allowance(bytes32,address,address)";
    readonly totalSupply: "totalSupply(bytes32)";
    readonly metadata: "metadata(bytes32)";
    readonly mint: "mint(bytes32,address,uint256)";
    readonly burn: "burn(bytes32,uint256)";
    readonly setPaused: "setPaused(bytes32,bool)";
    readonly transferOwnership: "transferOwnership(bytes32,address)";
    readonly destroyToken: "destroyToken(bytes32)";
};
declare const TOKEN_FACTORY_SELECTORS: {
    readonly createToken: string;
    readonly transfer: string;
    readonly transferFrom: string;
    readonly approve: string;
    readonly increaseAllowance: string;
    readonly decreaseAllowance: string;
    readonly balanceOf: string;
    readonly allowance: string;
    readonly totalSupply: string;
    readonly metadata: string;
    readonly mint: string;
    readonly burn: string;
    readonly setPaused: string;
    readonly transferOwnership: string;
    readonly destroyToken: string;
};
type TokenFactoryAddressInput = string | Uint8Array | readonly number[];
type TokenFactoryBytes32Input = string | Uint8Array | readonly number[];
type TokenFactoryUintInput = bigint | number | string;
interface CreateTokenCalldataArgs {
    name: string;
    symbol: string;
    decimals: number;
    initialSupply: TokenFactoryUintInput;
    /**
     * Zero means uncapped when `FIXED_SUPPLY` is not set. For fixed-supply
     * tokens, this must equal `initialSupply`.
     */
    maxSupply: TokenFactoryUintInput;
    flags?: number;
    creatorFeeBps?: number;
}
interface CreateFixedSupplyMrc20CalldataArgs {
    name: string;
    symbol: string;
    decimals: number;
    supply: TokenFactoryUintInput;
    burnable?: boolean;
    pausable?: boolean;
    destructible?: boolean;
}
/** Return the token-factory precompile address (`0x1000`) as lower-case hex. */
declare function tokenFactoryAddressHex(): string;
/** Derive `tokenId = keccak256(0xFA || creator[20] || nonce_be[8])`. */
declare function deriveTokenFactoryTokenId(creator: TokenFactoryAddressInput, creatorTokenNonce: TokenFactoryUintInput): string;
/** Encode `createToken(...)` calldata. Submit with value `0.003 LYTH`. */
declare function encodeCreateTokenCalldata(args: CreateTokenCalldataArgs): string;
/** Convenience builder for a standard fixed-supply MRC20-style token. */
declare function encodeCreateFixedSupplyMrc20Calldata(args: CreateFixedSupplyMrc20CalldataArgs): string;
declare function encodeTokenFactoryTransferCalldata(tokenId: TokenFactoryBytes32Input, to: TokenFactoryAddressInput, amount: TokenFactoryUintInput): string;
declare function encodeTokenFactoryTransferFromCalldata(tokenId: TokenFactoryBytes32Input, from: TokenFactoryAddressInput, to: TokenFactoryAddressInput, amount: TokenFactoryUintInput): string;
declare function encodeTokenFactoryApproveCalldata(tokenId: TokenFactoryBytes32Input, spender: TokenFactoryAddressInput, amount: TokenFactoryUintInput): string;
declare function encodeTokenFactoryIncreaseAllowanceCalldata(tokenId: TokenFactoryBytes32Input, spender: TokenFactoryAddressInput, delta: TokenFactoryUintInput): string;
declare function encodeTokenFactoryDecreaseAllowanceCalldata(tokenId: TokenFactoryBytes32Input, spender: TokenFactoryAddressInput, delta: TokenFactoryUintInput): string;
declare function encodeTokenFactoryBalanceOfCalldata(tokenId: TokenFactoryBytes32Input, holder: TokenFactoryAddressInput): string;
declare function encodeTokenFactoryAllowanceCalldata(tokenId: TokenFactoryBytes32Input, owner: TokenFactoryAddressInput, spender: TokenFactoryAddressInput): string;
declare function encodeTokenFactoryTotalSupplyCalldata(tokenId: TokenFactoryBytes32Input): string;
declare function encodeTokenFactoryMetadataCalldata(tokenId: TokenFactoryBytes32Input): string;
declare function encodeTokenFactoryMintCalldata(tokenId: TokenFactoryBytes32Input, to: TokenFactoryAddressInput, amount: TokenFactoryUintInput): string;
declare function encodeTokenFactoryBurnCalldata(tokenId: TokenFactoryBytes32Input, amount: TokenFactoryUintInput): string;
declare function encodeTokenFactorySetPausedCalldata(tokenId: TokenFactoryBytes32Input, paused: boolean): string;
declare function encodeTokenFactoryTransferOwnershipCalldata(tokenId: TokenFactoryBytes32Input, newOwner: TokenFactoryAddressInput): string;
declare function encodeTokenFactoryDestroyCalldata(tokenId: TokenFactoryBytes32Input): string;
/** Decode a `bytes32 tokenId` return value. */
declare function decodeTokenFactoryTokenId(output: string | Uint8Array | readonly number[]): string;
declare function validateTokenFactoryFlags(flags: number, creatorFeeBps?: number): void;

/**
 * VRF precompile (`0x1101`) helpers.
 *
 * This precompile is selectorless: calldata is a 32-byte big-endian block
 * height followed by a caller-chosen domain tag. Successful return data is
 * exactly 32 bytes.
 */
declare class VrfCallError extends Error {
    constructor(message: string);
}
declare const VRF_OUTPUT_BYTES: 32;
declare const VRF_DOMAIN_TAG_MAX_BYTES: 256;
declare const VRF_HEIGHT_NOT_FINALIZED_REVERT: "vrf: height not finalized";
type VrfDomainTagInput = string | Uint8Array | readonly number[];
/** Return the VRF precompile address (`0x1101`) as lower-case hex. */
declare function vrfAddressHex(): string;
/**
 * Encode selectorless VRF calldata: `uint256 blockHeight || domainTag`.
 *
 * @param blockHeight finalized block height to read randomness from.
 * @param domainTag independent namespace for the consumer, up to 256 bytes.
 */
declare function encodeVrfEvaluateCalldata(blockHeight: bigint | number | string, domainTag?: VrfDomainTagInput): string;
/** Decode a successful VRF return payload into 32 bytes. */
declare function decodeVrfOutput(output: string | Uint8Array | readonly number[]): Uint8Array;

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
declare const version = "0.4.8";

export { AddressFlowResponse, AddressKind, AddressProfileResponse, AgentActionError, type ApiAddressActivityData, type ApiAddressActivityEntry, type ApiAddressActivityKind, type ApiAddressActivityKindData, type ApiAddressActivityKindSummary, type ApiBlockData, type ApiBlockHeader, type ApiBlockTransactionsData, type ApiCapabilitiesResponse, ApiClient, type ApiClientOptions, type ApiClusterData, type ApiClusterDirectoryEntry, type ApiClusterDirectoryPage, type ApiClusterMember, type ApiClusterStatus, type ApiClustersData, type ApiEnvelope, type ApiErrorEnvelope, type ApiHealthResponse, type ApiIndexerStatus, type ApiLatestAnchor, type ApiLogEntry, type ApiOperatorData, type ApiOperatorInfo, type ApiQueryValue, type ApiRuntimeProvenanceData, type ApiServiceProbeData, ApiStreamsIndexResponse, type ApiTransactionData, type ApiTransactionNativeReceiptData, type ApiTransactionReceipt, type ApiTransactionReceiptData, type ApiTransactionView, type ApiUpgradePlanStatus, type ApiUpgradeStatus, type ApiUpgradeStatusData, BURN_ADDR, BlockSelector, BridgeRoutesRequest, BridgeRoutesResponse, type BuildPublishOperatorSealKeyTxFieldsArgs, type BuildRequestClusterJoinTxFieldsArgs, type BuildVoteClusterAdmitTxFieldsArgs, ChainStatsResponse, ClobMarketResponse, ClobMarketsResponse, ClobOhlcResponse, ClobOrderBookResponse, ClobTradesResponse, type ClusterJoinFeeOptions, type ClusterJoinReadClient, ClusterJoinRequestView, type ClusterJoinSubmitClient, type ClusterJoinSubmitResult, type ClusterJoinTxFee, type CreateFixedSupplyMrc20CalldataArgs, type CreateTokenCalldataArgs, DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT, DEFAULT_OPERATOR_SEAL_KEY_EXECUTION_UNIT_LIMIT, DELEGATION_REVERT_TAGS, DELEGATION_SELECTORS, DelegationPrecompileError, EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER, type EncodeNativeAgentAvailabilitySlotArgs, type EncodeNativeAgentCounterEscrowArgs, type EncodeNativeAgentCreateEscrowArgs, type EncodeNativeAgentDeactivateServiceArgs, type EncodeNativeAgentEscrowActorArgs, type EncodeNativeAgentGrantConsentArgs, type EncodeNativeAgentIssueAttestationArgs, type EncodeNativeAgentListServiceArgs, type EncodeNativeAgentRecordPolicySpendArgs, type EncodeNativeAgentRecordReputationArgs, type EncodeNativeAgentRegisterArbiterArgs, type EncodeNativeAgentRegisterIssuerArgs, type EncodeNativeAgentResolveEscrowArgs, type EncodeNativeAgentRevokeAttestationArgs, type EncodeNativeAgentRevokeConsentArgs, type EncodeNativeAgentSetAvailabilityArgs, type EncodeNativeAgentSetSpendingPolicyArgs, type EncodeNativeAgentStartEscrowArgs, type EncodeNativeAgentSubmitEscrowArgs, ExecutionUnitPriceResponse, type HealthSummary, LYTHOSHI_PER_LYTH, LYTH_DECIMALS, type LatencyBands, type LythFormatOptions, MIN_EXECUTION_UNIT_PRICE_LYTHOSHI, MONOLYTHIUM_NETWORKS, MONOLYTHIUM_TESTNET_CHAIN_ID, MONOLYTHIUM_TESTNET_NETWORK_NAME, MRV_DEPLOY_PAYLOAD_VERSION, MRV_FORMAT_VERSION, MRV_MAX_ABI_SYMBOLS, MRV_MAX_CODE_BYTES, MRV_MAX_DEBUG_BYTES, MRV_MAX_MEMORY_PAGES, MRV_MAX_STORAGE_NAMESPACE_BYTES, MRV_MEMORY_PAGE_BYTES, MRV_PROFILE_MONO_RV32IM_V1, MRV_STRUCTURED_FEE_FIELDS, MRV_TX_EXTENSION_KIND, MRV_TX_EXTENSION_V1, type MonolythiumNetworkConfig, type MrcAccountRequest, MrcAccountResponse, type MrcHoldersRequest, MrcHoldersResponse, MrcMetadataResponse, type MrvAbiManifest, type MrvAbiParam, type MrvAbiSymbol, type MrvAbiSymbolKind, type MrvAbiType, type MrvAddressKind, type MrvArtifactMetadata, type MrvBuildMetadata, type MrvBytesLike, type MrvCallNativeTxOptions, type MrvCallNativeTxPlan, type MrvCallPlan, type MrvCallRequest, type MrvCallResponse, type MrvCallStatus, type MrvCallSubmission, type MrvCallSubmitOptions, type MrvDecimalLike, type MrvDeployNativeTxOptions, type MrvDeployNativeTxPlan, type MrvDeployPayload, type MrvDeployPayloadNativeTxOptions, type MrvDeployPayloadPlanOptions, type MrvDeployPayloadRequestOptions, type MrvDeployPayloadSubmission, type MrvDeployPayloadSubmitOptions, type MrvDeployPlan, type MrvDeployPlanOptions, type MrvDeployRequest, type MrvDeployResponse, type MrvDeploySubmission, type MrvDeploySubmitOptions, type MrvEncryptedSubmissionResult, type MrvEventRecord, type MrvExecutionReceipt, type MrvFeeDisplayConformanceInput, type MrvFeeDisplayConformanceReport, type MrvMemoryLimits, type MrvMeterCounters, type MrvNativeFeePreview, type MrvNativeStateDelta, type MrvNativeTxFacade, type MrvRequestBuildOptions, type MrvResolvedSyscall, type MrvRevertPayload, type MrvRiscvProfile, type MrvStorageNamespace, type MrvStructuredFeeConformanceOptions, type MrvStructuredFeeConformanceReport, type MrvSyscallImport, type MrvTransactionExtension, type MrvTypedAddress, type MrvValidatedArtifactMetadata, MrvValidationError, NATIVE_AGENT_MODULE_ADDRESS, NATIVE_AGENT_MODULE_ADDRESS_BYTES, NATIVE_DEV_HOST_API_VERSION, NATIVE_DEV_IPC_PROTOCOL_VERSION, NATIVE_DEV_MANIFEST_SCHEMA_VERSION, NATIVE_LYTH_DECIMALS, type NativeAgentAddressInput, type NativeAgentAddressKind, type NativeAgentEscrowResolution, type NativeAgentForwarderInput, type NativeAgentModuleCallEnvelope, type NativeAgentModuleContractCall, type NativeAgentReputationScores, NativeAgentStateFilter, NativeAgentStateResponse, NativeDecodedEvent, type NativeDevApprovalKind, type NativeDevCommandName, type NativeDevContractPassport, type NativeDevHostApprovalResultMessage, type NativeDevHostCommandMessage, type NativeDevHostContextMessage, type NativeDevIpcMessage, type NativeDevMrcAllocation, type NativeDevMrcAssetKind, type NativeDevMrcTokenPlan, type NativeDevMrvDeployPlan, type NativeDevRiskLabel, type NativeDevRiskSeverity, type NativeDevSidecarApprovalRequestMessage, type NativeDevSidecarCommandResultMessage, type NativeDevSidecarProjectEventMessage, type NativeDevSidecarReadyMessage, type NativeDevVerificationBundle, type NativeDevWalletApprovalRequest, type NativeDevkitArchive, type NativeDevkitChannel, type NativeDevkitCompatibility, type NativeDevkitManifest, type NativeDevkitSidecarManifest, type NativeDevkitSidecarStatus, type NativeDevkitStatus, NativeEventFilter, NativeEventsFilter, NativeEventsResponse, NativeMarketOrderBookDeltasRequest, NativeMarketOrderBookDeltasResponse, NativeMarketStateFilter, NativeMarketStateResponse, NativeReceiptFee, type NativeReceiptFeeDisplay, NativeReceiptResponse, OPERATOR_ROUTER_ADDRESS, OperatorCapabilitiesResponse, type OperatorOnboardingPreview, type OperatorSealKeySubmitResult, PRECOMPILE_ADDRESSES, PROTOCOL_MAX_OPERATOR_FEE_BPS, PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN, PUBKEY_REGISTRY_SELECTORS, PendingRewardsResponse, type PrecompileAddress, type PrecompileName, type PubkeyLookup, PubkeyRegistryError, REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT, RedemptionQueueResponse, type ResolvedExecutionFee, RpcClient, RuntimeBuildProvenance, RuntimeUpgradeStatus, SdkError, SearchResponse, ServiceProbeResponse, type StudioHostState, type StudioHostStatus, type SubmitPublishOperatorSealKeyArgs, type SubmitRequestClusterJoinArgs, type SubmitVoteClusterAdmitArgs, TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI, TOKEN_FACTORY_FLAGS, TOKEN_FACTORY_KNOWN_FLAG_MASK, TOKEN_FACTORY_MAX_CREATOR_FEE_BPS, TOKEN_FACTORY_MAX_DECIMALS, TOKEN_FACTORY_NAME_MAX_BYTES, TOKEN_FACTORY_SELECTORS, TOKEN_FACTORY_SIGS, TOKEN_FACTORY_SYMBOL_MAX_BYTES, TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG, TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT, type TokenFactoryAddressInput, type TokenFactoryBytes32Input, TokenFactoryError, type TokenFactoryUintInput, type TransactionFeeExposure, TxFeedResponse, TypedAddress, TypedNativeReceiptEvent, VRF_DOMAIN_TAG_MAX_BYTES, VRF_HEIGHT_NOT_FINALIZED_REVERT, VRF_OUTPUT_BYTES, VrfCallError, type VrfDomainTagInput, apiEndpointFromRpcEndpoint, assertMrvCallNativeSubmissionPlan, assertMrvDeployNativeSubmissionPlan, assertMrvFeeDisplayConformance, assertMrvStructuredFeeConformance, assertNativeDevMrcTokenPlan, assertNativeDevMrvDeployPlan, assertNativeDevWalletApprovalRequest, buildMrvCallNativeTxPlan, buildMrvCallPlan, buildMrvCallRequest, buildMrvDeployNativeTxPlan, buildMrvDeployPayloadNativeTxPlan, buildMrvDeployPayloadPlan, buildMrvDeployPayloadRequest, buildMrvDeployPlan, buildMrvDeployRequest, buildNativeAgentCreateEscrowForwarderInput, buildNativeAgentCreateEscrowModuleCall, buildNativeAgentModuleCallEnvelope, buildNativeAgentRecordReputationForwarderInput, buildNativeAgentRecordReputationModuleCall, buildNativeAgentSetSpendingPolicyForwarderInput, buildNativeAgentSetSpendingPolicyModuleCall, buildPublishOperatorSealKeyTxFields, buildRequestClusterJoinTxFields, buildVoteClusterAdmitTxFields, checkMrvFeeDisplayConformance, checkMrvStructuredFeeConformance, checkNativeDevkitCompatibility, clampPriorityTip, clusterJoinRequestExists, compareNativeDevVersions, decodeHasPubkeyReturn, decodeLookupPubkeyReturn, decodeTokenFactoryTokenId, decodeVrfOutput, delegationAddressHex, deriveClusterJoinOperatorId, deriveMrvContractAddress, deriveTokenFactoryTokenId, encodeClaimCalldata, encodeCompleteRedemptionCalldata, encodeCreateFixedSupplyMrc20Calldata, encodeCreateTokenCalldata, encodeDelegateCalldata, encodeHasPubkeyCalldata, encodeLookupPubkeyCalldata, encodeMrvDeployPayload, encodeNativeAgentAcceptEscrowCall, encodeNativeAgentApproveEscrowCall, encodeNativeAgentArbiterGetCall, encodeNativeAgentAttestationGetCall, encodeNativeAgentAvailabilityGetCall, encodeNativeAgentCancelEscrowCall, encodeNativeAgentCloseAvailabilityCall, encodeNativeAgentConsentGetCall, encodeNativeAgentCounterEscrowCall, encodeNativeAgentCreateEscrowCall, encodeNativeAgentDeactivateServiceCall, encodeNativeAgentDisputeEscrowCall, encodeNativeAgentEscrowGetCall, encodeNativeAgentGrantConsentCall, encodeNativeAgentIssueAttestationCall, encodeNativeAgentIssuerGetCall, encodeNativeAgentListServiceCall, encodeNativeAgentModuleForwarderInput, encodeNativeAgentOpenAvailabilityCall, encodeNativeAgentRecordPolicySpendCall, encodeNativeAgentRecordReputationCall, encodeNativeAgentRegisterArbiterCall, encodeNativeAgentRegisterIssuerCall, encodeNativeAgentReputationGetCall, encodeNativeAgentResolveEscrowCall, encodeNativeAgentRevokeAttestationCall, encodeNativeAgentRevokeConsentCall, encodeNativeAgentServiceGetCall, encodeNativeAgentSetAvailabilityCall, encodeNativeAgentSetSpendingPolicyCall, encodeNativeAgentSpendingPolicyGetCall, encodeNativeAgentStartEscrowCall, encodeNativeAgentSubmitEscrowCall, encodeRedelegateCalldata, encodeRegisterPubkeyCalldata, encodeSetAutoCompoundCalldata, encodeTokenFactoryAllowanceCalldata, encodeTokenFactoryApproveCalldata, encodeTokenFactoryBalanceOfCalldata, encodeTokenFactoryBurnCalldata, encodeTokenFactoryDecreaseAllowanceCalldata, encodeTokenFactoryDestroyCalldata, encodeTokenFactoryIncreaseAllowanceCalldata, encodeTokenFactoryMetadataCalldata, encodeTokenFactoryMintCalldata, encodeTokenFactorySetPausedCalldata, encodeTokenFactoryTotalSupplyCalldata, encodeTokenFactoryTransferCalldata, encodeTokenFactoryTransferFromCalldata, encodeTokenFactoryTransferOwnershipCalldata, encodeUndelegateCalldata, encodeVrfEvaluateCalldata, formatLyth, formatLythoshi, formatNativeReceiptFeeDisplay, isRedemptionPrincipalUnavailableRevert, mrvAddressToBech32, mrvBech32ToAddress, mrvCodeHashHex, mrvV1TransactionExtension, nativeDevSchemaFieldNames, nativeDevUiStrings, parseLythToLythoshi, preflightClusterJoinRequest, previewRequestClusterJoin, previewVoteClusterAdmit, pubkeyRegistryAddressHex, readClusterJoinRequest, resolveClusterJoinExecutionFee, resolveExecutionFee, resolveMaxExecutionUnitPrice, resolveRegistryExecutionFee, resolveStudioHostStatus, submitMrvCallNativeTx, submitMrvDeployNativeTx, submitMrvDeployPayloadNativeTx, submitPublishOperatorSealKey, submitRequestClusterJoin, submitVoteClusterAdmit, tokenFactoryAddressHex, transactionFeeExposure, validateMrvArtifactMetadata, validateMrvCallRequest, validateMrvDeployRequest, validateTokenFactoryFlags, version, vrfAddressHex };
