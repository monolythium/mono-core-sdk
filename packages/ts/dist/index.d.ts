import { N as NativeReceiptFee, O as OperatorCapabilitiesResponse, R as RuntimeBuildProvenance, a as RuntimeUpgradeStatus, S as SearchResponse, C as ChainStatsResponse, B as BlockSelector, A as ApiStreamsIndexResponse, T as TxFeedResponse, b as NativeReceiptResponse, c as NativeDecodedEvent, d as NativeEventFilter, e as TypedNativeReceiptEvent, f as NativeEventsFilter, g as NativeEventsResponse, h as NativeAgentStateFilter, i as NativeAgentStateResponse, j as NativeMarketStateFilter, k as NativeMarketStateResponse, l as NativeMarketOrderBookDeltasRequest, m as NativeMarketOrderBookDeltasResponse, n as AddressProfileResponse, o as AddressFlowResponse, P as PendingRewardsResponse, p as RedemptionQueueResponse, M as MrcMetadataResponse, q as MrcAccountResponse, r as MrcHoldersResponse, s as BridgeRoutesRequest, t as BridgeRoutesResponse, u as ServiceProbeResponse, v as ClobMarketsResponse, w as ClobMarketResponse, x as ClobTradesResponse, y as ClobOhlcResponse, z as ClobOrderBookResponse, D as ChainInfo, E as RpcClientOptions, F as RpcClient, G as NetworkSlug, H as NativeEvmTxFields, I as EncryptionKey, J as MempoolClass, K as CapabilitiesResponse, L as CapabilityDescriptor, Q as RuntimeFeatureGate, U as TypedAddress, V as MlDsa65Backend, W as ExecutionUnitPriceResponse, X as ClusterSealKeys, Y as ClusterSealKeysSource, Z as ClusterJoinRequestView, _ as AddressKind } from './submission-CEm3-EYM.js';
export { $ as ADDRESS_HRP, a0 as ADDRESS_KIND_HRPS, a1 as API_STREAM_TOPICS, a2 as AccountPolicy, a3 as AccountProofResponse, a4 as ActiveCharterView, a5 as Address, a6 as AddressActivityArchiveRedirect, a7 as AddressActivityEntry, a8 as AddressActivityEntryEnriched, a9 as AddressActivityKind, aa as AddressActivityKindResponse, ab as AddressActivityKindRetention, ac as AddressError, ad as AddressLabelRecord, ae as AddressValidation, af as AgentReputationCategoryScope, ag as AgentReputationRecord, ah as AgentReputationResponse, ai as AnswerArchiveChallengeCalldataArgs, aj as ApiStreamTopic, ak as ApiStreamTopicMetadata, al as ApiStreamTopicRetention, am as ArchiveChallenge, an as AssetPolicy, ao as AttestDkgReshareCalldataArgs, ap as AttestServiceProbeCalldataArgs, aq as AttestationWindow, ar as BRIDGE_QUOTE_API_BLOCKED_REASON, as as BRIDGE_REVERT_TAGS, at as BRIDGE_SELECTORS, au as BRIDGE_SUBMIT_API_BLOCKED_REASON, av as BlockHeader, aw as BlockTag, ax as BlsCertificateResponse, ay as BridgeAdminControl, az as BridgeAnchorState, aA as BridgeBreakerState, aB as BridgeBytesInput, aC as BridgeCircuitBreakerFields, aD as BridgeCircuitBreakerState, aE as BridgeDrainCap, aF as BridgeDrainStatus, aG as BridgeHealthRecord, aH as BridgeHealthResponse, aI as BridgePrecompileError, aJ as BridgeQuoteSubmitReadiness, aK as BridgeRiskTier, aL as BridgeRouteAssessment, aM as BridgeRouteCandidate, aN as BridgeRouteCatalogue, aO as BridgeRouteCatalogueError, aP as BridgeRouteCatalogueJsonOptions, aQ as BridgeRouteCataloguePayload, aR as BridgeRouteCatalogueRoute, aS as BridgeRouteCatalogueValidation, aT as BridgeRouteDisclosure, aU as BridgeRouteSelection, aV as BridgeRoutesSource, aW as BridgeTransferIntent, aX as BridgeTransferRequest, aY as BridgeVerifierDisclosure, aZ as CHAIN_REGISTRY, a_ as CHAIN_REGISTRY_RAW_BASE, a$ as CLOB_MARKET_ID_DOMAIN_TAG, b0 as CLOB_SELECTORS, b1 as CLUSTER_FORMED_EVENT_SIG, b2 as CallRequest, b3 as CancelClusterJoinCalldataArgs, b4 as CancelPendingChangeCalldataArgs, b5 as CancelSpotOrderArgs, b6 as ChainRegistry, b7 as CheckpointRecord, b8 as CirculatingSupplyResponse, b9 as ClobMarketAssets, ba as ClobMarketRecord, bb as ClobMarketSummary, bc as ClobTrade, bd as ClusterAprResponse, be as ClusterCharterArgs, bf as ClusterDelegatorsResponse, bg as ClusterDirectoryEntryResponse, bh as ClusterDirectoryPageResponse, bi as ClusterDiversity, bj as ClusterDiversityView, bk as ClusterEntityResponse, bl as ClusterFormedEvent, bm as ClusterJoinRequestStatus, bn as ClusterMemberResponse, bo as ClusterNameResponse, bp as ClusterResignationRow, bq as ClusterResignationsResponse, br as ClusterStatusResponse, bs as CommitArchiveRootCalldataArgs, bt as CreateRequestCanonicalArgs, bu as DIVERSITY_SCORE_MAX, bv as DagParent, bw as DagParentsResponse, bx as DagSyncStatus, by as DecodeTxExtension, bz as DecodeTxLog, bA as DecodeTxPqAttestation, bB as DecodeTxResponse, bC as DelegationCapResponse, bD as DelegationHistoryRecord, bE as DelegationRow, bF as DelegationsResponse, bG as DutyAbsence, bH as EMPTY_ROOT, bI as EncodeNativeNftBuyListingArgs, bJ as EncodeNativeNftCancelListingArgs, bK as EncodeNativeNftCreateListingArgs, bL as EncodeNativeNftPlaceAuctionBidArgs, bM as EncodeNativeNftSettleAuctionArgs, bN as EncodeNativeNftSweepExpiredListingsArgs, bO as EncodeNativeSpotCancelOrderArgs, bP as EncodeNativeSpotCreateMarketArgs, bQ as EncodeNativeSpotLimitOrderArgs, bR as EncodeNativeSpotSettleLimitOrderArgs, bS as EncodeNativeSpotSettleRoutedLimitOrderArgs, bT as EncryptionKeyResponse, bU as EntityRatchetResponse, bV as EthCallRequest, bW as EthSendTransactionRequest, bX as ExpireClusterJoinCalldataArgs, bY as ExplorerEndpoint, bZ as FEED_ID_DOMAIN_TAG, b_ as FeeHistoryResponse, b$ as FormClusterCalldataArgs, c0 as FormClusterV2CalldataArgs, c1 as GapRange, c2 as GapRecord, c3 as GapRecordsResponse, c4 as GetClusterJoinRequestCalldataArgs, c5 as GetOperatorSealKeyCalldataArgs, c6 as Hash, c7 as Hex, c8 as IndexerStatus, c9 as JailStatusWindow, ca as KeyRotationWindow, cb as ListProofRequestsResponse, cc as LythUpgradePlanStatus, cd as LythUpgradeStatusResponse, ce as MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES, cf as MAX_NATIVE_RECEIPT_EVENTS, cg as ML_DSA_65_PUBLIC_KEY_LEN, ch as ML_DSA_65_SIGNATURE_LEN, ci as MULTISIG_ADDRESS_DERIVATION_DOMAIN, cj as MarketActionError, ck as MarketTransactionPlan, cl as MempoolSnapshot, cm as MeshDecodedTx, cn as MeshSignedTxResponse, co as MeshTxIntent, cp as MeshUnsignedTxResponse, cq as MetricsRangeResponse, cr as MetricsRangeSample, cs as MetricsRangeSeries, ct as MetricsRangeStatus, cu as MrcAccountRecord, cv as MrcMetadataRecord, cw as MrcPolicyRecord, cx as MrcPolicySpendRecord, cy as NAME_BASE_MULTIPLIER, cz as NAME_FALLBACK_FEE_UNIT_LYTHOSHI, cA as NAME_LABEL_MAX_LEN, cB as NAME_LABEL_MIN_LEN, cC as NAME_MAX_LEN, cD as NAME_REGISTRY_SELECTORS, cE as NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE, cF as NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY, cG as NATIVE_CALL_FORWARDER_RESPONSE_OFFSET, cH as NATIVE_MARKET_EVENT_FAMILY, cI as NATIVE_MARKET_MODULE_ADDRESS, cJ as NATIVE_MARKET_MODULE_ADDRESS_BYTES, cK as NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC, cL as NODE_REGISTRY_ARCHIVE_CHALLENGE_DOMAIN, cM as NODE_REGISTRY_ARCHIVE_KIND_EPOCH_SEED, cN as NODE_REGISTRY_ARCHIVE_NONCE_DOMAIN, cO as NODE_REGISTRY_BLS_PUBKEY_BYTES, cP as NODE_REGISTRY_CAPABILITIES, cQ as NODE_REGISTRY_CAPABILITY_MASK, cR as NODE_REGISTRY_CHALLENGE_EPOCH_WINDOW, cS as NODE_REGISTRY_CHARTER_COOLDOWN_EPOCHS, cT as NODE_REGISTRY_CLUSTER_CHARTER_BYTES, cU as NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS, cV as NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS, cW as NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES, cX as NODE_REGISTRY_CONSENSUS_POP_BYTES, cY as NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES, cZ as NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES, c_ as NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES, c$ as NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS, d0 as NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS, d1 as NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES, d2 as NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT, d3 as NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT, d4 as NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN, d5 as NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN_V2, d6 as NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT, d7 as NODE_REGISTRY_FORM_CLUSTER_THRESHOLD, d8 as NODE_REGISTRY_LEGACY_CLUSTER_MEMBER_PUBKEY_BYTES, d9 as NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH, da as NODE_REGISTRY_MERKLE_INNER_DOMAIN, db as NODE_REGISTRY_MERKLE_LEAF_DOMAIN, dc as NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT, dd as NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES, de as NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES, df as NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES, dg as NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID, dh as NODE_REGISTRY_PUBLIC_SERVICE_MASK, di as NODE_REGISTRY_SELECTORS, dj as NODE_REGISTRY_SUBKIND_CHARTER_DELEGATOR_BPS, dk as NODE_REGISTRY_SUBKIND_CHARTER_MEMBER_SHARES, dl as NODE_REGISTRY_TAG_ARCHIVE_CHALLENGE, dm as NODE_REGISTRY_TAG_CLUSTER_CHARTER, dn as NODE_REGISTRY_TAG_SERVICE_SCORE, dp as NODE_REGISTRY_TAG_TREASURY, dq as NODE_REGISTRY_UPDATE_CHARTER_MESSAGE_DOMAIN, dr as NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD, ds as NO_EVM_ARCHIVE_PROOF_SCHEMA, dt as NO_EVM_ARCHIVE_SIGNATURE_SCHEME, du as NO_EVM_FINALITY_EVIDENCE_SCHEMA, dv as NO_EVM_FINALITY_EVIDENCE_SOURCE, dw as NO_EVM_RECEIPTS_ROOT_DOMAIN, dx as NO_EVM_RECEIPT_CODEC, dy as NO_EVM_RECEIPT_PROOF_SCHEMA, dz as NO_EVM_RECEIPT_PROOF_TYPE, dA as NO_EVM_RECEIPT_ROOT_ALGORITHM, dB as NameCategory, dC as NameOfResponse, dD as NameRegistrationQuote, dE as NameRegistryError, dF as NativeAgentArbiterStateRecord, dG as NativeAgentAttestationStateRecord, dH as NativeAgentAvailabilityStateRecord, dI as NativeAgentConsentStateRecord, dJ as NativeAgentEscrowStateRecord, dK as NativeAgentIssuerStateRecord, dL as NativeAgentPolicySpendStateRecord, dM as NativeAgentPolicyStateRecord, dN as NativeAgentReputationReviewStateRecord, dO as NativeAgentServiceStateRecord, dP as NativeAgentStateFilterParamValue, dQ as NativeAgentStateResponseFilters, dR as NativeAgentStateSource, dS as NativeCallForwarderArtifact, dT as NativeCollectionRoyaltyStateRecord, dU as NativeEventConsumer, dV as NativeEventProjection, dW as NativeEventsResponseFilters, dX as NativeEventsSource, dY as NativeMarketAddressInput, dZ as NativeMarketAddressKind, d_ as NativeMarketForwarderInput, d$ as NativeMarketModuleCallEnvelope, e0 as NativeMarketModuleContractCall, e1 as NativeMarketOrderBookDelta, e2 as NativeMarketOrderBookDeltasResponseFilters, e3 as NativeMarketOrderBookDeltasSource, e4 as NativeMarketOrderBookStreamAction, e5 as NativeMarketOrderBookStreamPayload, e6 as NativeMarketStateFilterParamValue, e7 as NativeMarketStateResponseFilters, e8 as NativeMarketStateSource, e9 as NativeModuleForwarderDescriptor, ea as NativeMrcPolicyProjection, eb as NativeNftAssetStandard, ec as NativeNftListingKind, ed as NativeNftListingStateRecord, ee as NativeReceiptCounters, ef as NativeReceiptEvent, eg as NativeReceiptSource, eh as NativeSpotMarketStateRecord, ei as NativeSpotOrderStateRecord, ej as NetworkClientOptions, ek as NoEvmArchiveCoveringSnapshot, el as NoEvmArchiveProof, em as NoEvmArchiveSignatureVerification, en as NoEvmArchiveSignatureVerificationIssue, eo as NoEvmArchiveSignatureVerificationIssueCode, ep as NoEvmArchiveTrustedSigner, eq as NoEvmBlockBlsFinalityVerification, er as NoEvmBlockRoundFinalityVerification, es as NoEvmBlsFinalityVerification, et as NoEvmFinalityBlockReference, eu as NoEvmFinalityCertificate, ev as NoEvmFinalityEvidence, ew as NoEvmReceiptFinalityTrustPolicy, ex as NoEvmReceiptProof, ey as NoEvmReceiptProofError, ez as NoEvmReceiptProofErrorCode, eA as NoEvmReceiptProofVerification, eB as NoEvmReceiptTrustIssue, eC as NoEvmReceiptTrustIssueCode, eD as NoEvmReceiptTrustPolicy, eE as NoEvmReceiptTrustVerification, eF as NoEvmReceiptTrustedBlsSigner, eG as NoEvmReceiptTrustedSigner, eH as NoEvmRoundFinalityVerification, eI as NodeHostingClass, eJ as NodeRegistryError, eK as OPERATOR_ROUTER_EVENT_SIGS, eL as OPERATOR_ROUTER_SELECTORS, eM as OPERATOR_ROUTER_SIGS, eN as ORACLE_EVENT_SIGS, eO as OperatorAuthorityResponse, eP as OperatorFeeChargedEvent, eQ as OperatorFeeConfig, eR as OperatorFeeQuote, eS as OperatorInfoResponse, eT as OperatorNetworkMetadata, eU as OperatorNetworkMetadataView, eV as OperatorRiskResponse, eW as OperatorRouterConfig, eX as OperatorSigningActivityResponse, eY as OperatorSigningEntry, eZ as OperatorSurfaceCapability, e_ as OperatorSurfaceStatus, e$ as OracleEvent, f0 as OracleEventError, f1 as OracleFeedConfig, f2 as OracleLatestPrice, f3 as OracleSignerRow, f4 as OracleSignersResponse, f5 as OracleWriters, f6 as P2pSeed, f7 as PENDING_CHANGE_KIND_CODES, f8 as PROVER_MARKET_ADDRESS, f9 as PROVER_MARKET_BID_DOMAIN, fa as PROVER_MARKET_EVENT_SIGS, fb as PROVER_MARKET_REQUEST_DOMAIN, fc as PROVER_MARKET_SELECTORS, fd as PROVER_MARKET_SUBMIT_DOMAIN, fe as PROVER_SLASH_REASON_BAD_PROOF, ff as PROVER_SLASH_REASON_NON_DELIVERY, fg as ParsedName, fh as PeerSummary, fi as PeerSummaryAggregate, fj as PendingChangeKind, fk as PendingCharterView, fl as PendingRewardsRow, fm as PendingTxSummary, fn as PlaceLimitOrderViaArgs, fo as PlaceLimitOrderViaPlan, fp as PlaceSpotLimitOrderArgs, fq as PlaceSpotMarketOrderArgs, fr as PlaceSpotMarketOrderExArgs, fs as PrecompileCatalogueResponse, ft as PrecompileDescriptor, fu as ProofRequestRow, fv as ProofRequestView, fw as ProverBidView, fx as ProverBidsResponse, fy as ProverMarketError, fz as ProverMarketState, fA as ProverMarketStatusResponse, fB as PublishOperatorSealKeyCalldataArgs, fC as Quantity, fD as QuoteLiquidity, fE as RESERVED_ADDRESS_HRPS, fF as RankedBridgeRoute, fG as ReceiptProofTrustArchivePolicy, fH as ReceiptProofTrustArchiveSigner, fI as ReceiptProofTrustFinalityPolicy, fJ as ReceiptProofTrustFinalitySigner, fK as ReceiptProofTrustPolicy, fL as RedemptionQueueTicket, fM as RegistryRecord, fN as ReportServiceProbeCalldataArgs, fO as ReportServiceProbeRequest, fP as ReportServiceProbeResponse, fQ as RequestClusterJoinCalldataArgs, fR as ResolveNameResponse, fS as RichListHolder, fT as RichListResponse, fU as RoundCertificateResponse, fV as RoundInfo, fW as RpcEndpoint, fX as RuntimeProvenanceResponse, fY as SERVES_GPU_PROVE, fZ as SERVICE_PROBE_STATUS, f_ as SET_POLICY_CLAIM_DOMAIN_TAG, f$ as SPENDING_POLICY_SELECTORS, g0 as SearchHit, g1 as ServiceProbeStatusLabel, g2 as SetOperatorDisplayCalldataArgs, g3 as SigningEntryStatus, g4 as SpendingPolicyArgs, g5 as SpendingPolicyError, g6 as SpendingPolicyTimeWindow, g7 as SpendingPolicyView, g8 as SpotLimitOrderSide, g9 as SpotMarketOrderMode, ga as StorageProofBatch, gb as SubmitPendingChangeCalldataArgs, gc as SwapIntentStatus, gd as SyncStatus, ge as TESTNET_69420, gf as TokenBalanceMrcIdentity, gg as TokenBalanceRecord, gh as TokenBalanceWithMetadata, gi as TotalBurnedResponse, gj as TpmAttestationResponse, gk as TransactionReceipt, gl as TransactionView, gm as TxConfirmations, gn as TxFeedReceipt, go as TxFeedTransaction, gp as TxStatusFoundResponse, gq as TxStatusNotFoundResponse, gr as TxStatusResponse, gs as UpcomingDutiesResponse, gt as UpcomingDutyMap, gu as UpdateCharterCalldataArgs, gv as UserAddressInput, gw as V1_BRIDGE_ALLOWED_FEE_TOKEN, gx as V1_BRIDGE_ALLOWED_PROTOCOL, gy as VertexAtRound, gz as VerticesAtRoundResponse, gA as VoteClusterAdmitCalldataArgs, gB as addressBytesToHex, gC as addressToBech32, gD as addressToTypedBech32, gE as allowRootFor, gF as archiveMerkleInnerHash, gG as archiveMerkleLeafHash, gH as assertNativeMarketOrderBookStreamPayload, gI as assessBridgeRoute, gJ as bech32ToAddress, gK as bech32ToAddressBytes, gL as bidSighash, gM as bridgeAddressHex, gN as bridgeDrainRemaining, gO as bridgeQuoteSubmitReadiness, gP as bridgeRoutesReadiness, gQ as bridgeTransferCandidates, gR as buildBridgeRouteCatalogue, gS as buildCancelSpotOrderPlan, gT as buildNativeCallForwarderArtifact, gU as buildNativeMarketModuleCallEnvelope, gV as buildNativeNftBuyListingForwarderInput, gW as buildNativeNftBuyListingModuleCall, gX as buildNativeNftCancelListingForwarderInput, gY as buildNativeNftCancelListingModuleCall, gZ as buildNativeNftCreateListingForwarderInput, g_ as buildNativeNftCreateListingModuleCall, g$ as buildNativeNftPlaceAuctionBidForwarderInput, h0 as buildNativeNftPlaceAuctionBidModuleCall, h1 as buildNativeNftSettleAuctionForwarderInput, h2 as buildNativeNftSettleAuctionModuleCall, h3 as buildNativeNftSweepExpiredListingsForwarderInput, h4 as buildNativeNftSweepExpiredListingsModuleCall, h5 as buildNativeSpotCancelOrderForwarderInput, h6 as buildNativeSpotCancelOrderModuleCall, h7 as buildNativeSpotCreateMarketForwarderInput, h8 as buildNativeSpotCreateMarketModuleCall, h9 as buildNativeSpotLimitOrderForwarderInput, ha as buildNativeSpotLimitOrderModuleCall, hb as buildNativeSpotSettleLimitOrderForwarderInput, hc as buildNativeSpotSettleLimitOrderModuleCall, hd as buildNativeSpotSettleRoutedLimitOrderForwarderInput, he as buildNativeSpotSettleRoutedLimitOrderModuleCall, hf as buildPlaceLimitOrderViaPlan, hg as buildPlaceSpotLimitOrderPlan, hh as buildPlaceSpotMarketOrderExPlan, hi as buildPlaceSpotMarketOrderPlan, hj as categoryRoot, hk as clobAddressHex, hl as clusterApyPercent, hm as composeClaimBoundMessage, hn as computeNoEvmDacFinalityMessage, ho as computeNoEvmLeaderFinalityMessage, hp as computeNoEvmReceiptsRoot, hq as computeNoEvmRoundFinalityMessage, hr as computeNoEvmTargetReceiptHash, hs as computeQuoteLiquidity, ht as consumeNativeEvents, hu as decodeActiveCharter, hv as decodeClusterCharter, hw as decodeClusterDiversity, hx as decodeClusterFormedEvent, hy as decodeClusterJoinRequest, hz as decodeNativeAgentStateResponse, hA as decodeNativeMarketOrderBookDeltasResponse, hB as decodeNativeReceiptResponse, hC as decodeNoEvmReceiptTranscript, hD as decodeOperatorFeeChargedEvent, hE as decodeOperatorNetworkMetadata, hF as decodeOperatorSealKey, hG as decodeOracleEvent, hH as decodePendingCharter, hI as decodeProbeAuthority, hJ as decodeScoreServiceProbe, hK as decodeTimeWindow, hL as decodeTxFeedResponse, hM as denyRootFor, hN as deriveArchiveChallenge, hO as deriveClobMarketId, hP as deriveClusterAnchorAddress, hQ as deriveFeedId, hR as deriveNativeSpotMarketId, hS as deriveNativeSpotOrderId, hT as destinationRoot, hU as encodeAnswerArchiveChallengeCalldata, hV as encodeAttestDkgReshareCalldata, hW as encodeAttestServiceProbeCalldata, hX as encodeBlockSelector, hY as encodeBridgeChallengeCalldata, hZ as encodeBridgeClaimCalldata, h_ as encodeCancelClusterJoinCalldata, h$ as encodeCancelOrderCalldata, i0 as encodeCancelPendingChangeCalldata, i1 as encodeClaimPolicyByAddressCalldata, i2 as encodeClusterCharter, i3 as encodeCommitArchiveRootCalldata, i4 as encodeCreateRequestCalldata, i5 as encodeCreateRequestCanonical, i6 as encodeDisableCalldata, i7 as encodeEnableCalldata, i8 as encodeExpireClusterJoinCalldata, i9 as encodeFormClusterCalldata, ia as encodeFormClusterV2Calldata, ib as encodeGetClusterJoinRequestCalldata, ic as encodeGetOperatorSealKeyCalldata, id as encodeGetPendingCharterCalldata, ie as encodeGetProbeAuthorityCalldata, ig as encodeLockBridgeConfigCalldata, ih as encodeNameAcceptTransferCall, ii as encodeNameProposeTransferCall, ij as encodeNameRegisterCall, ik as encodeNativeMarketModuleForwarderInput, il as encodeNativeNftBuyListingCall, im as encodeNativeNftCancelListingCall, io as encodeNativeNftCreateListingCall, ip as encodeNativeNftPlaceAuctionBidCall, iq as encodeNativeNftSettleAuctionCall, ir as encodeNativeNftSweepExpiredListingsCall, is as encodeNativeSpotCancelOrderCall, it as encodeNativeSpotCreateMarketCall, iu as encodeNativeSpotLimitOrderCall, iv as encodeNativeSpotSettleLimitOrderCall, iw as encodeNativeSpotSettleRoutedLimitOrderCall, ix as encodePlaceLimitOrderCalldata, iy as encodePlaceLimitOrderViaCalldata, iz as encodePlaceMarketOrderCalldata, iA as encodePlaceMarketOrderExCalldata, iB as encodePublishOperatorSealKeyCalldata, iC as encodeRecoverOperatorNodeCalldata, iD as encodeReportServiceProbeCalldata, iE as encodeRequestClusterJoinCalldata, iF as encodeSetBridgeResumeCooldownCalldata, iG as encodeSetBridgeRouteFinalityCalldata, iH as encodeSetLotSizeCalldata, iI as encodeSetMinNotionalCalldata, iJ as encodeSetOperatorDisplayCalldata, iK as encodeSetPolicyCalldata, iL as encodeSetPolicyClaimCalldata, iM as encodeSetProbeAuthorityCalldata, iN as encodeSetTickSizeCalldata, iO as encodeSubmitBridgeProofCalldata, iP as encodeSubmitPendingChangeCalldata, iQ as encodeUpdateCharterCalldata, iR as encodeVoteClusterAdmitCalldata, iS as exportBridgeRouteCatalogueJson, iT as fetchChainInfoLatest, iU as fetchChainRegistryLatest, iV as formClusterMessage, iW as formClusterMessageHex, iX as formClusterMessageV2, iY as formClusterMessageV2Hex, iZ as formatOraclePrice, i_ as getChainInfo, i$ as getNoEvmReceiptTrustPolicy, j0 as getP2pSeeds, j1 as getRpcEndpoints, j2 as hexToAddressBytes, j3 as isBridgeAdminLockedRevert, j4 as isBridgeCooldownZeroRevert, j5 as isBridgeFinalityZeroRevert, j6 as isBridgeResumeCooldownActiveRevert, j7 as isConcreteServiceProbeStatus, j8 as isNativeDecodedEvent, j9 as isNativeMarketOrderBookStreamPayload, ja as isSinglePublicServiceProbeMask, jb as isValidNodeRegistryCapabilities, jc as isValidPublicServiceProbeMask, jd as nameLengthModifierX10, je as nameRegistrationCost, jf as nameRegistryAddressHex, jg as nativeAgentStateFilterParams, jh as nativeEventMatches, ji as nativeEventsFilterParams, jj as nativeEventsFromHistory, jk as nativeEventsFromReceipt, jl as nativeMarketEventFilter, jm as nativeMarketEventsFromHistory, jn as nativeMarketEventsFromReceipt, jo as nativeMarketStateFilterParams, jp as noEvmReceiptTrustPolicyFromChainInfo, jq as nodeHostingClassFromByte, jr as nodeHostingClassToByte, js as nodeRegistryAddressHex, jt as normalizeAddressHex, ju as normalizeBridgeRouteCatalogue, jv as normalizePendingChangeKind, jw as oracleAddressHex, jx as oraclePriceToNumber, jy as packTimeWindow, jz as parseAddress, jA as parseBridgeRouteCatalogueJson, jB as parseChainRegistryToml, jC as parseDkgResharePublicKeys, jD as parseNameCategory, jE as parseNativeDecodedEvent, jF as parseQuantity, jG as parseQuantityBig, jH as protocolNonceForEpoch, jI as proverMarketStateFromByte, jJ as quoteOperatorFee, jK as rankBridgeRoutes, jL as rankMarketsByVolume, jM as requestSighash, jN as requireTypedAddress, jO as selectBridgeTransferRoute, jP as serviceMaskToBitIndex, jQ as serviceProbeStatusLabel, jR as setDestinationRoot, jS as slotArchiveChallengePass, jT as slotClusterCharter, jU as slotClusterCharterDelegator, jV as slotClusterCharterMembers, jW as slotClusterServiceScore, jX as slotEpochChallengeSeed, jY as slotProbeAuthority, jZ as slotScoreServiceProbe, j_ as spendingPolicyAddressHex, j$ as submitSighash, k0 as typedBech32ToAddress, k1 as updateCharterMessage, k2 as updateCharterMessageHex, k3 as validateAddress, k4 as validateBridgeRouteCatalogue, k5 as verifyNoEvmArchiveProofSignatures, k6 as verifyNoEvmBlockFinalityEvidenceMultisig, k7 as verifyNoEvmBlockFinalityEvidenceThreshold, k8 as verifyNoEvmFinalityEvidenceMultisig, k9 as verifyNoEvmFinalityEvidenceThreshold, ka as verifyNoEvmReceiptProof, kb as verifyNoEvmReceiptProofTrust } from './submission-CEm3-EYM.js';

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

/** Chain JSON-RPC error code for a self-quarantined operator (it answered, but
 *  refuses to serve because its local state-root disagrees with the signed
 *  checkpoint quorum — a CheckpointStateRootMismatch). */
declare const QUARANTINED_RPC_CODE = -32047;
/** True when an error is a `-32047` "chain quarantined" rejection. Keys on the
 *  JSON-RPC code first (authoritative) and the message text as a fallback. */
declare function isQuarantineError(err: unknown): boolean;
interface GenesisVerdict {
    /** True iff the operator's chain genesis matches the expected pin. */
    ok: boolean;
    /** Observed genesis identity hash; `null` when the operator exposed no
     *  genesis (fail-closed → `ok` is false) or was quarantined/unreachable. */
    observed: string | null;
    /** True when the operator answered with a `-32047` "chain quarantined"
     *  error (same chain, self-quarantined). `observed` stays null. */
    quarantined: boolean;
}
/**
 * Verify ONE operator's chain genesis against the expected pin.
 *
 * Fail-CLOSED: an operator that does not expose `lyth_chainStats.genesisHash`
 * (the live fleet all do) proves nothing about its chain identity and returns
 * `ok: false` — so a fake / partial endpoint that merely answers `net_version`
 * can never be selected as trusted. A `-32047` quarantine is surfaced via
 * `quarantined` so callers can show "operators quarantined — wait for recovery"
 * rather than a misleading re-genesis or offline message.
 */
declare function verifyOperatorGenesis(client: RpcClient, expectedGenesisHash: string): Promise<GenesisVerdict>;
/** Why no trusted operator could be selected. Mirrors the wallet banner states
 *  so a consumer can render an actionable cause:
 *  - `regenesis`   — reachable, right chain id, but a DIFFERENT genesis hash
 *                    (the network re-genesised; the pin/SDK must be bumped).
 *  - `wrong-chain` — reachable, but reports a different chain id.
 *  - `untrusted`   — reachable, right chain id, but proves no genesis.
 *  - `quarantined` — every operator self-quarantined (checkpoint mismatch);
 *                    same chain, refusing RPC; recovers on its own.
 *  - `unreachable` — no operator answered at all. */
type OperatorTrustReason = "regenesis" | "wrong-chain" | "untrusted" | "quarantined" | "unreachable";
/** Thrown by `selectTrustedOperator` when no operator qualifies. Carries a
 *  classified `reason` so consumers can branch on the cause (extends `SdkError`
 *  so existing `instanceof SdkError` handling still catches it). */
declare class OperatorTrustError extends SdkError {
    readonly reason: OperatorTrustReason;
    constructor(reason: OperatorTrustReason, message: string);
}
/**
 * Select the first operator that is reachable, on the right chain id, AND
 * proves the pinned genesis (fail-closed, quarantine-aware). Probes every
 * registry endpoint in PARALLEL and returns the first that fully qualifies, so
 * a dead or slow operator never adds head-of-line latency. Throws an
 * `OperatorTrustError` (with a classified `reason`) when none qualifies.
 */
declare function selectTrustedOperator(chain: ChainInfo, options?: RpcClientOptions): Promise<RpcClient>;
/** Convenience wrapper: resolve a registry network slug then select a trusted
 *  operator for it. Defaults to the bundled registry. */
declare function selectTrustedOperatorForNetwork(network?: NetworkSlug | string, options?: RpcClientOptions): Promise<RpcClient>;

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
/**
 * Stable capability id for the MRV EVM-parity feature set (the
 * `block_timestamp`/`chain_id`/`call_value` host syscalls, the synthesized
 * bare-deploy receipt sidecar, and hardened metering). Surfaced through
 * `lyth_capabilities` and gated at a foundation-signed milestone height.
 *
 * The deploy/call/constructor lane is always live and is **not** gated on this
 * capability — only the parity additions activate at the milestone.
 */
declare const MRV_APP_CONTRACT_PARITY_CAPABILITY_ID = "mrv_app_contract_parity";
/**
 * Looks up a capability descriptor by its stable `capabilityId`, scanning the
 * address-keyed `capabilities` map of a {@link CapabilitiesResponse}. Returns
 * `undefined` when the node does not report the capability (older nodes).
 */
declare function findCapabilityById(capabilities: CapabilitiesResponse, capabilityId: string): CapabilityDescriptor | undefined;
/**
 * Returns the MRV EVM-parity runtime-feature gate, or `undefined` when the
 * node does not report it.
 *
 * Reads the `runtimeFeatures` map — where the node publishes runtime gates
 * that are not bound to a precompile address — **not** the address-keyed
 * `capabilities` map.
 */
declare function mrvAppContractParityCapability(capabilities: CapabilitiesResponse): RuntimeFeatureGate | undefined;
/**
 * Feature-detects whether the MRV EVM-parity additions are active at
 * `currentHeight`, per the capability contract:
 * `active && currentHeight >= activationHeight`.
 *
 * Pre-milestone nodes, or older nodes that do not report the feature at
 * all, yield `false` (forward-compatible default). This never gates the
 * always-live deploy/call/constructor lane.
 */
declare function isMrvParityActive(capabilities: CapabilitiesResponse, currentHeight: bigint | number): boolean;
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
 * Native `monom` M-of-N multisig witness assembly.
 *
 * Monolythium v2 has a **native** (precompile-free, protocol-level) multisig
 * spend path: a `monom…` address is `BLAKE3("MONO_MULTISIG_BLAKE3_20_V1" ||
 * threshold_be16 || (member_len_be8 || member)*sorted)[..20]`, and value is
 * moved *from* it by attaching a self-describing M-of-N witness as a typed
 * transaction extension (kind `0x40`). No on-chain registry is consulted —
 * the verifier reconstructs the address from the witness alone.
 *
 * This module is wire-critical: every byte here mirrors the Rust source of
 * truth exactly (`mono-core/crates/execution/tx/src/multisig.rs` for the
 * witness body + framing, `crates/crypto/crypto/src/address.rs` for the
 * address rule, and `crates/core/sdk/src/tx.rs` for
 * `multisig_base_sighash` / `assemble_multisig_signed`). Parity is pinned in
 * `tests/multisig.test.ts` against ground-truth bytes emitted by the Rust
 * crate.
 *
 * Design notes mirrored from Rust:
 * - Members are stored **sorted ascending by raw pubkey bytes**; the same
 *   canonicalisation the address derivation applies. `member_index` in a
 *   signature is an index into the sorted roster.
 * - Members sign the **base sighash**: the envelope's keccak-256 sighash with
 *   the multisig witness extension removed. Because every extension is part
 *   of the sighash preimage, members cannot sign over a preimage that already
 *   contains their own signatures — the witness is appended afterward.
 * - The witness body is `0x01 || "MONO_MULTISIG_WITNESS_V1" || bincode(witness)`.
 *   `bincode` here is bincode 1.x defaults: little-endian fixints, `u64`
 *   length prefixes on every `Vec`. The struct serialises in field order:
 *   `threshold: u16`, `members: Vec<MultisigMember>`,
 *   `signatures: Vec<MultisigMemberSignature>`, where `MultisigMember` is
 *   `{ algo_id: u16, pubkey: Vec<u8> }` and `MultisigMemberSignature` is
 *   `{ member_index: u16, signature: Vec<u8> }`.
 */

/** Typed-extension kind byte for a native multisig spend witness (Rust `TX_EXTENSION_KIND_MULTISIG`). */
declare const TX_EXTENSION_KIND_MULTISIG: 64;
/** Witness body version byte — first byte of the extension body (Rust `TX_EXTENSION_MULTISIG_V1`). */
declare const TX_EXTENSION_MULTISIG_V1: 1;
/** Domain tag mixed into the witness body version line (Rust `MULTISIG_WITNESS_DOMAIN`). */
declare const MULTISIG_WITNESS_DOMAIN: "MONO_MULTISIG_WITNESS_V1";
/** BLAKE3 multisig address-derivation domain (Rust `MULTISIG_ADDRESS_DERIVATION_DOMAIN`). */
declare const MULTISIG_ADDRESS_DERIVATION_DOMAIN: "MONO_MULTISIG_BLAKE3_20_V1";
/** Lower bound on roster size (Rust `MIN_MEMBERS`). */
declare const MIN_MULTISIG_MEMBERS: 1;
/** Upper bound on roster size (Rust `MAX_MULTISIG_MEMBERS`). */
declare const MAX_MULTISIG_MEMBERS: 64;
declare class MultisigError extends Error {
    constructor(message: string);
}
/** A single roster member: an ML-DSA-65 public key. */
interface MultisigMember {
    /** Signature algorithm id. Must be ML-DSA-65 (`1001`). */
    algoId: number;
    /** Canonical ML-DSA-65 public-key bytes (1952 B). */
    pubkey: Uint8Array;
}
/** A member signature tagged with its index in the sorted roster. */
interface MultisigMemberSignature {
    /** Index into the **sorted** member roster. */
    memberIndex: number;
    /** Canonical ML-DSA-65 signature bytes over the base sighash (3309 B). */
    signature: Uint8Array;
}
/** A self-describing multisig spend witness with a canonically-sorted roster. */
interface MultisigWitness {
    /** Quorum threshold: `1 <= threshold <= members.length`. */
    threshold: number;
    /** Full roster, sorted ascending by raw `pubkey` bytes. */
    members: MultisigMember[];
    /** Collected member signatures over the base sighash. */
    signatures: MultisigMemberSignature[];
}
/** Accepts a member pubkey as raw bytes / number[] / hex (delegated to {@link expectBytes}). */
type MemberPubkeyInput = Uint8Array | readonly number[];
/**
 * Sort + dedupe-check a roster of ML-DSA-65 public keys into canonical
 * (ascending raw-byte) order, mirroring `address_from_multisig_members` and
 * `MultisigWitness::new`'s `members.sort_by(pubkey.cmp)`.
 *
 * Returns a fresh array sorted ascending; the input is not mutated.
 */
declare function sortMultisigMembers(members: readonly MemberPubkeyInput[]): Uint8Array[];
/**
 * Derive the `monom…` bech32m multisig address for a roster + threshold.
 *
 * Mirrors `protocore_crypto::address_from_multisig_members`:
 * `BLAKE3("MONO_MULTISIG_BLAKE3_20_V1" || threshold_be16 ||
 * (member_len_be8 || member)*sorted)[..20]`, rendered with the `monom` HRP.
 *
 * The address rule itself is order-insensitive and imposes no roster-size
 * policy (matching Rust); use {@link assembleMultisigWitness} when you need
 * the roster-shape validation enforced.
 */
declare function deriveMultisigAddressBytes(threshold: number, members: readonly MemberPubkeyInput[]): Uint8Array;
/** {@link deriveMultisigAddressBytes} rendered as a `monom…` bech32m string. */
declare function deriveMultisigAddress(threshold: number, members: readonly MemberPubkeyInput[]): string;
/**
 * Validate the static roster shape, mirroring Rust `validate_roster`.
 *
 * Enforces: 1..=64 members; `1 <= threshold <= members.length`;
 * `signatures.length <= members.length`; every member ML-DSA-65 with a
 * 1952-byte pubkey; the roster sorted ascending and duplicate-free.
 */
declare function validateMultisigRoster(witness: MultisigWitness): void;
/**
 * Build a {@link MultisigWitness} from a roster + threshold + collected
 * member signatures, sorting the roster into canonical order and validating
 * the roster shape — mirrors `MultisigWitness::new`.
 *
 * Callers supply `signatures` already keyed to the **sorted** roster
 * (`memberIndex` is the index into the sorted member list). Use
 * {@link multisigMemberIndex} to find a member's sorted index.
 */
declare function assembleMultisigWitness(threshold: number, members: readonly MemberPubkeyInput[], signatures?: readonly MultisigMemberSignature[]): MultisigWitness;
/**
 * Find the index of `pubkey` in the canonically-sorted roster, or `-1` if it
 * is not a member. Use this to key a {@link MultisigMemberSignature}'s
 * `memberIndex` when collecting signatures.
 */
declare function multisigMemberIndex(members: readonly MemberPubkeyInput[], pubkey: MemberPubkeyInput): number;
/**
 * Canonical witness extension body bytes — mirrors `MultisigWitness::encode_body`.
 *
 * Layout: `0x01 || "MONO_MULTISIG_WITNESS_V1" || bincode(witness)`.
 */
declare function encodeMultisigWitnessBody(witness: MultisigWitness): Uint8Array;
/**
 * Compute the **base sighash** each multisig member signs for this tx —
 * mirrors `multisig_base_sighash` / `Transaction::base_sighash`.
 *
 * This is keccak-256 over the envelope's `TAG_SIGHASH` encoding with any
 * multisig witness extension removed. When no multisig extension is present
 * (the normal case — you pass the plain transfer envelope) it equals the
 * ordinary sighash. Every member signs these same 32 bytes.
 */
declare function multisigBaseSighash(fields: NativeEvmTxFields): Uint8Array;
/**
 * Attach a multisig witness to a transfer envelope, returning the envelope
 * fields with the `0x40` witness extension appended — mirrors the extension
 * step of `assemble_multisig_signed`.
 *
 * The returned fields carry the witness as the last extension. The witness's
 * member signatures must each be over `multisigBaseSighash(fields)` of the
 * **input** (witness-free) envelope; appending the witness does not change
 * the base sighash (`base_sighash` strips it).
 *
 * The caller still signs the outer envelope over the base sighash with one
 * of the roster members' keys (the chain verifies the outer signer is a
 * member). Pass the resulting `wireBytes` from a single-signer wire encode of
 * these fields, or use the lower-level `bincodeSignedTransaction` from
 * `@monolythium/core-sdk/crypto` with the outer member signature + pubkey.
 */
declare function assembleMultisigSigned(fields: NativeEvmTxFields, witness: MultisigWitness): NativeEvmTxFields;

/**
 * Delegation precompile ABI helpers (non-custodial ARK staking).
 *
 * Delegation is **balance-weighted** and **non-custodial**: a wallet never
 * escrows tokens. A delegation row records a `weightBps` fraction of the
 * caller's *live* balance; the wallet's contribution to a cluster is the
 * effective weight `floor(balance × weightBps / 10000)`, re-evaluated at each
 * settlement. Tokens stay fully liquid and spendable in the wallet.
 *
 * Because nothing is escrowed there is no redemption queue: `undelegate` is
 * instant. The legacy `completeRedemption` selector was removed from the chain
 * (calling it now reverts).
 */
declare const DELEGATION_SELECTORS: {
    readonly delegate: "0x662337de";
    readonly undelegate: "0x914f3ca8";
    readonly redelegate: "0xa06ac18f";
    readonly claim: "0x4e71d92d";
    readonly setAutoCompound: "0x86593454";
};
declare const DELEGATION_REVERT_TAGS: {
    /** `delegate(...)` carried native value — delegation is non-custodial and
     *  must be sent with `value = 0`. */
    readonly unexpectedValue: "0x020e";
};
declare class DelegationPrecompileError extends Error {
    constructor(message: string);
}
declare function delegationAddressHex(): string;
/** `delegate(uint32 cluster, uint16 weightBps)` — records a balance-weighted,
 *  **non-custodial** delegation to `cluster`. `weightBps` is the fraction of
 *  the caller's *live* balance to contribute (max 10_000 = 100%); the
 *  effective weight is `floor(balance × weightBps / 10000)` and tracks the
 *  balance over time. No principal is escrowed — tokens stay liquid.
 *
 *  IMPORTANT: the delegate tx MUST be sent with `value = 0`. Any native value
 *  makes the chain revert with the `unexpectedValue` tag (`0x020e`). `value`
 *  is a transaction field, not calldata, so this encoder is unchanged. */
declare function encodeDelegateCalldata(cluster: bigint | number | string, weightBps: bigint | number | string): string;
/** `undelegate(uint32 cluster)` — instantly removes the caller's delegation
 *  row for `cluster`. There is no redemption queue or cooldown; nothing was
 *  escrowed, so there is nothing to redeem. */
declare function encodeUndelegateCalldata(cluster: bigint | number | string): string;
/** `redelegate(uint32 fromCluster, uint32 toCluster, uint16 weightBps)`. */
declare function encodeRedelegateCalldata(fromCluster: bigint | number | string, toCluster: bigint | number | string, weightBps: bigint | number | string): string;
/** `claim()` — settle + withdraw the caller's pending delegation rewards. */
declare function encodeClaimCalldata(): string;
/** `setAutoCompound(bool enabled)` — persists the caller's auto-compound
 *  preference. */
declare function encodeSetAutoCompoundCalldata(enabled: boolean): string;
/** `true` when revert `data` is the `unexpectedValue` tag — i.e. a
 *  `delegate(...)` tx was (incorrectly) sent with native value. */
declare function isUnexpectedValueRevert(data: string | Uint8Array | readonly number[]): boolean;

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
declare const version = "0.4.18";

export { AddressFlowResponse, AddressKind, AddressProfileResponse, AgentActionError, type ApiAddressActivityData, type ApiAddressActivityEntry, type ApiAddressActivityKind, type ApiAddressActivityKindData, type ApiAddressActivityKindSummary, type ApiBlockData, type ApiBlockHeader, type ApiBlockTransactionsData, type ApiCapabilitiesResponse, ApiClient, type ApiClientOptions, type ApiClusterData, type ApiClusterDirectoryEntry, type ApiClusterDirectoryPage, type ApiClusterMember, type ApiClusterStatus, type ApiClustersData, type ApiEnvelope, type ApiErrorEnvelope, type ApiHealthResponse, type ApiIndexerStatus, type ApiLatestAnchor, type ApiLogEntry, type ApiOperatorData, type ApiOperatorInfo, type ApiQueryValue, type ApiRuntimeProvenanceData, type ApiServiceProbeData, ApiStreamsIndexResponse, type ApiTransactionData, type ApiTransactionNativeReceiptData, type ApiTransactionReceipt, type ApiTransactionReceiptData, type ApiTransactionView, type ApiUpgradePlanStatus, type ApiUpgradeStatus, type ApiUpgradeStatusData, BURN_ADDR, BlockSelector, BridgeRoutesRequest, BridgeRoutesResponse, type BuildPublishOperatorSealKeyTxFieldsArgs, type BuildRequestClusterJoinTxFieldsArgs, type BuildVoteClusterAdmitTxFieldsArgs, CapabilitiesResponse, CapabilityDescriptor, ChainInfo, ChainStatsResponse, ClobMarketResponse, ClobMarketsResponse, ClobOhlcResponse, ClobOrderBookResponse, ClobTradesResponse, type ClusterJoinFeeOptions, type ClusterJoinReadClient, ClusterJoinRequestView, type ClusterJoinSubmitClient, type ClusterJoinSubmitResult, type ClusterJoinTxFee, type CreateFixedSupplyMrc20CalldataArgs, type CreateTokenCalldataArgs, DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT, DEFAULT_OPERATOR_SEAL_KEY_EXECUTION_UNIT_LIMIT, DELEGATION_REVERT_TAGS, DELEGATION_SELECTORS, DelegationPrecompileError, EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER, type EncodeNativeAgentAvailabilitySlotArgs, type EncodeNativeAgentCounterEscrowArgs, type EncodeNativeAgentCreateEscrowArgs, type EncodeNativeAgentDeactivateServiceArgs, type EncodeNativeAgentEscrowActorArgs, type EncodeNativeAgentGrantConsentArgs, type EncodeNativeAgentIssueAttestationArgs, type EncodeNativeAgentListServiceArgs, type EncodeNativeAgentRecordPolicySpendArgs, type EncodeNativeAgentRecordReputationArgs, type EncodeNativeAgentRegisterArbiterArgs, type EncodeNativeAgentRegisterIssuerArgs, type EncodeNativeAgentResolveEscrowArgs, type EncodeNativeAgentRevokeAttestationArgs, type EncodeNativeAgentRevokeConsentArgs, type EncodeNativeAgentSetAvailabilityArgs, type EncodeNativeAgentSetSpendingPolicyArgs, type EncodeNativeAgentStartEscrowArgs, type EncodeNativeAgentSubmitEscrowArgs, ExecutionUnitPriceResponse, type GenesisVerdict, type HealthSummary, LYTHOSHI_PER_LYTH, LYTH_DECIMALS, type LatencyBands, type LythFormatOptions, MAX_MULTISIG_MEMBERS, MIN_EXECUTION_UNIT_PRICE_LYTHOSHI, MIN_MULTISIG_MEMBERS, MONOLYTHIUM_NETWORKS, MONOLYTHIUM_TESTNET_CHAIN_ID, MONOLYTHIUM_TESTNET_NETWORK_NAME, MRV_APP_CONTRACT_PARITY_CAPABILITY_ID, MRV_DEPLOY_PAYLOAD_VERSION, MRV_FORMAT_VERSION, MRV_MAX_ABI_SYMBOLS, MRV_MAX_CODE_BYTES, MRV_MAX_DEBUG_BYTES, MRV_MAX_MEMORY_PAGES, MRV_MAX_STORAGE_NAMESPACE_BYTES, MRV_MEMORY_PAGE_BYTES, MRV_PROFILE_MONO_RV32IM_V1, MRV_STRUCTURED_FEE_FIELDS, MRV_TX_EXTENSION_KIND, MRV_TX_EXTENSION_V1, MULTISIG_ADDRESS_DERIVATION_DOMAIN as MULTISIG_WITNESS_ADDRESS_DERIVATION_DOMAIN, MULTISIG_WITNESS_DOMAIN, type MemberPubkeyInput, type MonolythiumNetworkConfig, type MrcAccountRequest, MrcAccountResponse, type MrcHoldersRequest, MrcHoldersResponse, MrcMetadataResponse, type MrvAbiManifest, type MrvAbiParam, type MrvAbiSymbol, type MrvAbiSymbolKind, type MrvAbiType, type MrvAddressKind, type MrvArtifactMetadata, type MrvBuildMetadata, type MrvBytesLike, type MrvCallNativeTxOptions, type MrvCallNativeTxPlan, type MrvCallPlan, type MrvCallRequest, type MrvCallResponse, type MrvCallStatus, type MrvCallSubmission, type MrvCallSubmitOptions, type MrvDecimalLike, type MrvDeployNativeTxOptions, type MrvDeployNativeTxPlan, type MrvDeployPayload, type MrvDeployPayloadNativeTxOptions, type MrvDeployPayloadPlanOptions, type MrvDeployPayloadRequestOptions, type MrvDeployPayloadSubmission, type MrvDeployPayloadSubmitOptions, type MrvDeployPlan, type MrvDeployPlanOptions, type MrvDeployRequest, type MrvDeployResponse, type MrvDeploySubmission, type MrvDeploySubmitOptions, type MrvEncryptedSubmissionResult, type MrvEventRecord, type MrvExecutionReceipt, type MrvFeeDisplayConformanceInput, type MrvFeeDisplayConformanceReport, type MrvMemoryLimits, type MrvMeterCounters, type MrvNativeFeePreview, type MrvNativeStateDelta, type MrvNativeTxFacade, type MrvRequestBuildOptions, type MrvResolvedSyscall, type MrvRevertPayload, type MrvRiscvProfile, type MrvStorageNamespace, type MrvStructuredFeeConformanceOptions, type MrvStructuredFeeConformanceReport, type MrvSyscallImport, type MrvTransactionExtension, type MrvTypedAddress, type MrvValidatedArtifactMetadata, MrvValidationError, MultisigError, type MultisigMember, type MultisigMemberSignature, type MultisigWitness, NATIVE_AGENT_MODULE_ADDRESS, NATIVE_AGENT_MODULE_ADDRESS_BYTES, NATIVE_DEV_HOST_API_VERSION, NATIVE_DEV_IPC_PROTOCOL_VERSION, NATIVE_DEV_MANIFEST_SCHEMA_VERSION, NATIVE_LYTH_DECIMALS, type NativeAgentAddressInput, type NativeAgentAddressKind, type NativeAgentEscrowResolution, type NativeAgentForwarderInput, type NativeAgentModuleCallEnvelope, type NativeAgentModuleContractCall, type NativeAgentReputationScores, NativeAgentStateFilter, NativeAgentStateResponse, NativeDecodedEvent, type NativeDevApprovalKind, type NativeDevCommandName, type NativeDevContractPassport, type NativeDevHostApprovalResultMessage, type NativeDevHostCommandMessage, type NativeDevHostContextMessage, type NativeDevIpcMessage, type NativeDevMrcAllocation, type NativeDevMrcAssetKind, type NativeDevMrcTokenPlan, type NativeDevMrvDeployPlan, type NativeDevRiskLabel, type NativeDevRiskSeverity, type NativeDevSidecarApprovalRequestMessage, type NativeDevSidecarCommandResultMessage, type NativeDevSidecarProjectEventMessage, type NativeDevSidecarReadyMessage, type NativeDevVerificationBundle, type NativeDevWalletApprovalRequest, type NativeDevkitArchive, type NativeDevkitChannel, type NativeDevkitCompatibility, type NativeDevkitManifest, type NativeDevkitSidecarManifest, type NativeDevkitSidecarStatus, type NativeDevkitStatus, NativeEventFilter, NativeEventsFilter, NativeEventsResponse, NativeMarketOrderBookDeltasRequest, NativeMarketOrderBookDeltasResponse, NativeMarketStateFilter, NativeMarketStateResponse, NativeReceiptFee, type NativeReceiptFeeDisplay, NativeReceiptResponse, NetworkSlug, OPERATOR_ROUTER_ADDRESS, OperatorCapabilitiesResponse, type OperatorOnboardingPreview, type OperatorSealKeySubmitResult, OperatorTrustError, type OperatorTrustReason, PRECOMPILE_ADDRESSES, PROTOCOL_MAX_OPERATOR_FEE_BPS, PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN, PUBKEY_REGISTRY_SELECTORS, PendingRewardsResponse, type PrecompileAddress, type PrecompileName, type PubkeyLookup, PubkeyRegistryError, QUARANTINED_RPC_CODE, REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT, RedemptionQueueResponse, type ResolvedExecutionFee, RpcClient, RpcClientOptions, RuntimeBuildProvenance, RuntimeFeatureGate, RuntimeUpgradeStatus, SdkError, SearchResponse, ServiceProbeResponse, type StudioHostState, type StudioHostStatus, type SubmitPublishOperatorSealKeyArgs, type SubmitRequestClusterJoinArgs, type SubmitVoteClusterAdmitArgs, TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI, TOKEN_FACTORY_FLAGS, TOKEN_FACTORY_KNOWN_FLAG_MASK, TOKEN_FACTORY_MAX_CREATOR_FEE_BPS, TOKEN_FACTORY_MAX_DECIMALS, TOKEN_FACTORY_NAME_MAX_BYTES, TOKEN_FACTORY_SELECTORS, TOKEN_FACTORY_SIGS, TOKEN_FACTORY_SYMBOL_MAX_BYTES, TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG, TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT, TX_EXTENSION_KIND_MULTISIG, TX_EXTENSION_MULTISIG_V1, type TokenFactoryAddressInput, type TokenFactoryBytes32Input, TokenFactoryError, type TokenFactoryUintInput, type TransactionFeeExposure, TxFeedResponse, TypedAddress, TypedNativeReceiptEvent, VRF_DOMAIN_TAG_MAX_BYTES, VRF_HEIGHT_NOT_FINALIZED_REVERT, VRF_OUTPUT_BYTES, VrfCallError, type VrfDomainTagInput, apiEndpointFromRpcEndpoint, assembleMultisigSigned, assembleMultisigWitness, assertMrvCallNativeSubmissionPlan, assertMrvDeployNativeSubmissionPlan, assertMrvFeeDisplayConformance, assertMrvStructuredFeeConformance, assertNativeDevMrcTokenPlan, assertNativeDevMrvDeployPlan, assertNativeDevWalletApprovalRequest, buildMrvCallNativeTxPlan, buildMrvCallPlan, buildMrvCallRequest, buildMrvDeployNativeTxPlan, buildMrvDeployPayloadNativeTxPlan, buildMrvDeployPayloadPlan, buildMrvDeployPayloadRequest, buildMrvDeployPlan, buildMrvDeployRequest, buildNativeAgentCreateEscrowForwarderInput, buildNativeAgentCreateEscrowModuleCall, buildNativeAgentModuleCallEnvelope, buildNativeAgentRecordReputationForwarderInput, buildNativeAgentRecordReputationModuleCall, buildNativeAgentSetSpendingPolicyForwarderInput, buildNativeAgentSetSpendingPolicyModuleCall, buildPublishOperatorSealKeyTxFields, buildRequestClusterJoinTxFields, buildVoteClusterAdmitTxFields, checkMrvFeeDisplayConformance, checkMrvStructuredFeeConformance, checkNativeDevkitCompatibility, clampPriorityTip, clusterJoinRequestExists, compareNativeDevVersions, decodeHasPubkeyReturn, decodeLookupPubkeyReturn, decodeTokenFactoryTokenId, decodeVrfOutput, delegationAddressHex, deriveClusterJoinOperatorId, deriveMrvContractAddress, deriveMultisigAddress, deriveMultisigAddressBytes, deriveTokenFactoryTokenId, encodeClaimCalldata, encodeCreateFixedSupplyMrc20Calldata, encodeCreateTokenCalldata, encodeDelegateCalldata, encodeHasPubkeyCalldata, encodeLookupPubkeyCalldata, encodeMrvDeployPayload, encodeMultisigWitnessBody, encodeNativeAgentAcceptEscrowCall, encodeNativeAgentApproveEscrowCall, encodeNativeAgentArbiterGetCall, encodeNativeAgentAttestationGetCall, encodeNativeAgentAvailabilityGetCall, encodeNativeAgentCancelEscrowCall, encodeNativeAgentCloseAvailabilityCall, encodeNativeAgentConsentGetCall, encodeNativeAgentCounterEscrowCall, encodeNativeAgentCreateEscrowCall, encodeNativeAgentDeactivateServiceCall, encodeNativeAgentDisputeEscrowCall, encodeNativeAgentEscrowGetCall, encodeNativeAgentGrantConsentCall, encodeNativeAgentIssueAttestationCall, encodeNativeAgentIssuerGetCall, encodeNativeAgentListServiceCall, encodeNativeAgentModuleForwarderInput, encodeNativeAgentOpenAvailabilityCall, encodeNativeAgentRecordPolicySpendCall, encodeNativeAgentRecordReputationCall, encodeNativeAgentRegisterArbiterCall, encodeNativeAgentRegisterIssuerCall, encodeNativeAgentReputationGetCall, encodeNativeAgentResolveEscrowCall, encodeNativeAgentRevokeAttestationCall, encodeNativeAgentRevokeConsentCall, encodeNativeAgentServiceGetCall, encodeNativeAgentSetAvailabilityCall, encodeNativeAgentSetSpendingPolicyCall, encodeNativeAgentSpendingPolicyGetCall, encodeNativeAgentStartEscrowCall, encodeNativeAgentSubmitEscrowCall, encodeRedelegateCalldata, encodeRegisterPubkeyCalldata, encodeSetAutoCompoundCalldata, encodeTokenFactoryAllowanceCalldata, encodeTokenFactoryApproveCalldata, encodeTokenFactoryBalanceOfCalldata, encodeTokenFactoryBurnCalldata, encodeTokenFactoryDecreaseAllowanceCalldata, encodeTokenFactoryDestroyCalldata, encodeTokenFactoryIncreaseAllowanceCalldata, encodeTokenFactoryMetadataCalldata, encodeTokenFactoryMintCalldata, encodeTokenFactorySetPausedCalldata, encodeTokenFactoryTotalSupplyCalldata, encodeTokenFactoryTransferCalldata, encodeTokenFactoryTransferFromCalldata, encodeTokenFactoryTransferOwnershipCalldata, encodeUndelegateCalldata, encodeVrfEvaluateCalldata, findCapabilityById, formatLyth, formatLythoshi, formatNativeReceiptFeeDisplay, isMrvParityActive, isQuarantineError, isUnexpectedValueRevert, mrvAddressToBech32, mrvAppContractParityCapability, mrvBech32ToAddress, mrvCodeHashHex, mrvV1TransactionExtension, multisigBaseSighash, multisigMemberIndex, nativeDevSchemaFieldNames, nativeDevUiStrings, parseLythToLythoshi, preflightClusterJoinRequest, previewRequestClusterJoin, previewVoteClusterAdmit, pubkeyRegistryAddressHex, readClusterJoinRequest, resolveClusterJoinExecutionFee, resolveExecutionFee, resolveMaxExecutionUnitPrice, resolveRegistryExecutionFee, resolveStudioHostStatus, selectTrustedOperator, selectTrustedOperatorForNetwork, sortMultisigMembers, submitMrvCallNativeTx, submitMrvDeployNativeTx, submitMrvDeployPayloadNativeTx, submitPublishOperatorSealKey, submitRequestClusterJoin, submitVoteClusterAdmit, tokenFactoryAddressHex, transactionFeeExposure, validateMrvArtifactMetadata, validateMrvCallRequest, validateMrvDeployRequest, validateMultisigRoster, validateTokenFactoryFlags, verifyOperatorGenesis, version, vrfAddressHex };
