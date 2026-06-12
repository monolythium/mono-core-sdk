import { N as NativeReceiptFee, O as OperatorCapabilitiesResponse, R as RuntimeBuildProvenance, a as RuntimeUpgradeStatus, S as SearchResponse, C as ChainStatsResponse, B as BlockSelector, A as ApiStreamsIndexResponse, T as TxFeedResponse, b as NativeReceiptResponse, c as NativeDecodedEvent, d as NativeEventFilter, e as TypedNativeReceiptEvent, f as NativeEventsFilter, g as NativeEventsResponse, h as NativeAgentStateFilter, i as NativeAgentStateResponse, j as NativeMarketStateFilter, k as NativeMarketStateResponse, l as NativeMarketOrderBookDeltasRequest, m as NativeMarketOrderBookDeltasResponse, n as AddressProfileResponse, o as AddressFlowResponse, P as PendingRewardsResponse, p as RedemptionQueueResponse, M as MrcMetadataResponse, q as MrcAccountResponse, r as MrcHoldersResponse, s as BridgeRoutesRequest, t as BridgeRoutesResponse, u as ServiceProbeResponse, v as ClobMarketsResponse, w as ClobMarketResponse, x as ClobTradesResponse, y as ClobOhlcResponse, z as ClobOrderBookResponse, D as NativeEvmTxFields, E as EncryptionKey, F as MempoolClass, G as TypedAddress, H as RpcClient, I as MlDsa65Backend, J as ExecutionUnitPriceResponse, K as ClusterSealKeys, L as ClusterSealKeysSource, Q as ClusterJoinRequestView, U as AddressKind } from './submission-Cr6u_2he.cjs';
export { V as ADDRESS_HRP, W as ADDRESS_KIND_HRPS, X as API_STREAM_TOPICS, Y as AccountPolicy, Z as AccountProofResponse, _ as ActiveCharterView, $ as Address, a0 as AddressActivityArchiveRedirect, a1 as AddressActivityEntry, a2 as AddressActivityEntryEnriched, a3 as AddressActivityKind, a4 as AddressActivityKindResponse, a5 as AddressActivityKindRetention, a6 as AddressError, a7 as AddressLabelRecord, a8 as AddressValidation, a9 as AgentReputationCategoryScope, aa as AgentReputationRecord, ab as AgentReputationResponse, ac as AnswerArchiveChallengeCalldataArgs, ad as ApiStreamTopic, ae as ApiStreamTopicMetadata, af as ApiStreamTopicRetention, ag as ArchiveChallenge, ah as AssetPolicy, ai as AttestDkgReshareCalldataArgs, aj as AttestServiceProbeCalldataArgs, ak as AttestationWindow, al as BRIDGE_QUOTE_API_BLOCKED_REASON, am as BRIDGE_REVERT_TAGS, an as BRIDGE_SELECTORS, ao as BRIDGE_SUBMIT_API_BLOCKED_REASON, ap as BlockHeader, aq as BlockTag, ar as BlsCertificateResponse, as as BridgeAdminControl, at as BridgeAnchorState, au as BridgeBreakerState, av as BridgeBytesInput, aw as BridgeCircuitBreakerFields, ax as BridgeCircuitBreakerState, ay as BridgeDrainCap, az as BridgeDrainStatus, aA as BridgeHealthRecord, aB as BridgeHealthResponse, aC as BridgePrecompileError, aD as BridgeQuoteSubmitReadiness, aE as BridgeRiskTier, aF as BridgeRouteAssessment, aG as BridgeRouteCandidate, aH as BridgeRouteCatalogue, aI as BridgeRouteCatalogueError, aJ as BridgeRouteCatalogueJsonOptions, aK as BridgeRouteCataloguePayload, aL as BridgeRouteCatalogueRoute, aM as BridgeRouteCatalogueValidation, aN as BridgeRouteDisclosure, aO as BridgeRouteSelection, aP as BridgeRoutesSource, aQ as BridgeTransferIntent, aR as BridgeTransferRequest, aS as BridgeVerifierDisclosure, aT as CHAIN_REGISTRY, aU as CHAIN_REGISTRY_RAW_BASE, aV as CLOB_MARKET_ID_DOMAIN_TAG, aW as CLOB_SELECTORS, aX as CLUSTER_FORMED_EVENT_SIG, aY as CallRequest, aZ as CancelClusterJoinCalldataArgs, a_ as CancelPendingChangeCalldataArgs, a$ as CancelSpotOrderArgs, b0 as CapabilitiesResponse, b1 as CapabilityDescriptor, b2 as ChainInfo, b3 as ChainRegistry, b4 as CheckpointRecord, b5 as CirculatingSupplyResponse, b6 as ClobMarketAssets, b7 as ClobMarketRecord, b8 as ClobMarketSummary, b9 as ClobTrade, ba as ClusterAprResponse, bb as ClusterCharterArgs, bc as ClusterDelegatorsResponse, bd as ClusterDirectoryEntryResponse, be as ClusterDirectoryPageResponse, bf as ClusterDiversity, bg as ClusterDiversityView, bh as ClusterEntityResponse, bi as ClusterFormedEvent, bj as ClusterJoinRequestStatus, bk as ClusterMemberResponse, bl as ClusterNameResponse, bm as ClusterResignationRow, bn as ClusterResignationsResponse, bo as ClusterStatusResponse, bp as CommitArchiveRootCalldataArgs, bq as CreateRequestCanonicalArgs, br as DIVERSITY_SCORE_MAX, bs as DagParent, bt as DagParentsResponse, bu as DagSyncStatus, bv as DecodeTxExtension, bw as DecodeTxLog, bx as DecodeTxPqAttestation, by as DecodeTxResponse, bz as DelegationCapResponse, bA as DelegationHistoryRecord, bB as DelegationRow, bC as DelegationsResponse, bD as DutyAbsence, bE as EMPTY_ROOT, bF as EncodeNativeNftBuyListingArgs, bG as EncodeNativeNftCancelListingArgs, bH as EncodeNativeNftCreateListingArgs, bI as EncodeNativeNftPlaceAuctionBidArgs, bJ as EncodeNativeNftSettleAuctionArgs, bK as EncodeNativeNftSweepExpiredListingsArgs, bL as EncodeNativeSpotCancelOrderArgs, bM as EncodeNativeSpotCreateMarketArgs, bN as EncodeNativeSpotLimitOrderArgs, bO as EncodeNativeSpotSettleLimitOrderArgs, bP as EncodeNativeSpotSettleRoutedLimitOrderArgs, bQ as EncryptionKeyResponse, bR as EntityRatchetResponse, bS as EthCallRequest, bT as EthSendTransactionRequest, bU as ExpireClusterJoinCalldataArgs, bV as ExplorerEndpoint, bW as FEED_ID_DOMAIN_TAG, bX as FeeHistoryResponse, bY as FormClusterCalldataArgs, bZ as FormClusterV2CalldataArgs, b_ as GapRange, b$ as GapRecord, c0 as GapRecordsResponse, c1 as GetClusterJoinRequestCalldataArgs, c2 as GetOperatorSealKeyCalldataArgs, c3 as Hash, c4 as Hex, c5 as IndexerStatus, c6 as JailStatusWindow, c7 as KeyRotationWindow, c8 as ListProofRequestsResponse, c9 as LythUpgradePlanStatus, ca as LythUpgradeStatusResponse, cb as MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES, cc as MAX_NATIVE_RECEIPT_EVENTS, cd as ML_DSA_65_PUBLIC_KEY_LEN, ce as ML_DSA_65_SIGNATURE_LEN, cf as MULTISIG_ADDRESS_DERIVATION_DOMAIN, cg as MarketActionError, ch as MarketTransactionPlan, ci as MempoolSnapshot, cj as MeshDecodedTx, ck as MeshSignedTxResponse, cl as MeshTxIntent, cm as MeshUnsignedTxResponse, cn as MetricsRangeResponse, co as MetricsRangeSample, cp as MetricsRangeSeries, cq as MetricsRangeStatus, cr as MrcAccountRecord, cs as MrcMetadataRecord, ct as MrcPolicyRecord, cu as MrcPolicySpendRecord, cv as NAME_BASE_MULTIPLIER, cw as NAME_FALLBACK_FEE_UNIT_LYTHOSHI, cx as NAME_LABEL_MAX_LEN, cy as NAME_LABEL_MIN_LEN, cz as NAME_MAX_LEN, cA as NAME_REGISTRY_SELECTORS, cB as NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE, cC as NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY, cD as NATIVE_CALL_FORWARDER_RESPONSE_OFFSET, cE as NATIVE_MARKET_EVENT_FAMILY, cF as NATIVE_MARKET_MODULE_ADDRESS, cG as NATIVE_MARKET_MODULE_ADDRESS_BYTES, cH as NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC, cI as NODE_REGISTRY_ARCHIVE_CHALLENGE_DOMAIN, cJ as NODE_REGISTRY_ARCHIVE_KIND_EPOCH_SEED, cK as NODE_REGISTRY_ARCHIVE_NONCE_DOMAIN, cL as NODE_REGISTRY_BLS_PUBKEY_BYTES, cM as NODE_REGISTRY_CAPABILITIES, cN as NODE_REGISTRY_CAPABILITY_MASK, cO as NODE_REGISTRY_CHALLENGE_EPOCH_WINDOW, cP as NODE_REGISTRY_CHARTER_COOLDOWN_EPOCHS, cQ as NODE_REGISTRY_CLUSTER_CHARTER_BYTES, cR as NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS, cS as NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS, cT as NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES, cU as NODE_REGISTRY_CONSENSUS_POP_BYTES, cV as NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES, cW as NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES, cX as NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES, cY as NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS, cZ as NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS, c_ as NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES, c$ as NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT, d0 as NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT, d1 as NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN, d2 as NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN_V2, d3 as NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT, d4 as NODE_REGISTRY_FORM_CLUSTER_THRESHOLD, d5 as NODE_REGISTRY_LEGACY_CLUSTER_MEMBER_PUBKEY_BYTES, d6 as NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH, d7 as NODE_REGISTRY_MERKLE_INNER_DOMAIN, d8 as NODE_REGISTRY_MERKLE_LEAF_DOMAIN, d9 as NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT, da as NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES, db as NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES, dc as NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES, dd as NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID, de as NODE_REGISTRY_PUBLIC_SERVICE_MASK, df as NODE_REGISTRY_SELECTORS, dg as NODE_REGISTRY_SUBKIND_CHARTER_DELEGATOR_BPS, dh as NODE_REGISTRY_SUBKIND_CHARTER_MEMBER_SHARES, di as NODE_REGISTRY_TAG_ARCHIVE_CHALLENGE, dj as NODE_REGISTRY_TAG_CLUSTER_CHARTER, dk as NODE_REGISTRY_TAG_SERVICE_SCORE, dl as NODE_REGISTRY_TAG_TREASURY, dm as NODE_REGISTRY_UPDATE_CHARTER_MESSAGE_DOMAIN, dn as NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD, dp as NO_EVM_ARCHIVE_PROOF_SCHEMA, dq as NO_EVM_ARCHIVE_SIGNATURE_SCHEME, dr as NO_EVM_FINALITY_EVIDENCE_SCHEMA, ds as NO_EVM_FINALITY_EVIDENCE_SOURCE, dt as NO_EVM_RECEIPTS_ROOT_DOMAIN, du as NO_EVM_RECEIPT_CODEC, dv as NO_EVM_RECEIPT_PROOF_SCHEMA, dw as NO_EVM_RECEIPT_PROOF_TYPE, dx as NO_EVM_RECEIPT_ROOT_ALGORITHM, dy as NameCategory, dz as NameOfResponse, dA as NameRegistrationQuote, dB as NameRegistryError, dC as NativeAgentArbiterStateRecord, dD as NativeAgentAttestationStateRecord, dE as NativeAgentAvailabilityStateRecord, dF as NativeAgentConsentStateRecord, dG as NativeAgentEscrowStateRecord, dH as NativeAgentIssuerStateRecord, dI as NativeAgentPolicySpendStateRecord, dJ as NativeAgentPolicyStateRecord, dK as NativeAgentReputationReviewStateRecord, dL as NativeAgentServiceStateRecord, dM as NativeAgentStateFilterParamValue, dN as NativeAgentStateResponseFilters, dO as NativeAgentStateSource, dP as NativeCallForwarderArtifact, dQ as NativeCollectionRoyaltyStateRecord, dR as NativeEventConsumer, dS as NativeEventProjection, dT as NativeEventsResponseFilters, dU as NativeEventsSource, dV as NativeMarketAddressInput, dW as NativeMarketAddressKind, dX as NativeMarketForwarderInput, dY as NativeMarketModuleCallEnvelope, dZ as NativeMarketModuleContractCall, d_ as NativeMarketOrderBookDelta, d$ as NativeMarketOrderBookDeltasResponseFilters, e0 as NativeMarketOrderBookDeltasSource, e1 as NativeMarketOrderBookStreamAction, e2 as NativeMarketOrderBookStreamPayload, e3 as NativeMarketStateFilterParamValue, e4 as NativeMarketStateResponseFilters, e5 as NativeMarketStateSource, e6 as NativeModuleForwarderDescriptor, e7 as NativeMrcPolicyProjection, e8 as NativeNftAssetStandard, e9 as NativeNftListingKind, ea as NativeNftListingStateRecord, eb as NativeReceiptCounters, ec as NativeReceiptEvent, ed as NativeReceiptSource, ee as NativeSpotMarketStateRecord, ef as NativeSpotOrderStateRecord, eg as NetworkClientOptions, eh as NetworkSlug, ei as NoEvmArchiveCoveringSnapshot, ej as NoEvmArchiveProof, ek as NoEvmArchiveSignatureVerification, el as NoEvmArchiveSignatureVerificationIssue, em as NoEvmArchiveSignatureVerificationIssueCode, en as NoEvmArchiveTrustedSigner, eo as NoEvmBlockBlsFinalityVerification, ep as NoEvmBlockRoundFinalityVerification, eq as NoEvmBlsFinalityVerification, er as NoEvmFinalityBlockReference, es as NoEvmFinalityCertificate, et as NoEvmFinalityEvidence, eu as NoEvmReceiptFinalityTrustPolicy, ev as NoEvmReceiptProof, ew as NoEvmReceiptProofError, ex as NoEvmReceiptProofErrorCode, ey as NoEvmReceiptProofVerification, ez as NoEvmReceiptTrustIssue, eA as NoEvmReceiptTrustIssueCode, eB as NoEvmReceiptTrustPolicy, eC as NoEvmReceiptTrustVerification, eD as NoEvmReceiptTrustedBlsSigner, eE as NoEvmReceiptTrustedSigner, eF as NoEvmRoundFinalityVerification, eG as NodeHostingClass, eH as NodeRegistryError, eI as OPERATOR_ROUTER_EVENT_SIGS, eJ as OPERATOR_ROUTER_SELECTORS, eK as OPERATOR_ROUTER_SIGS, eL as ORACLE_EVENT_SIGS, eM as OperatorAuthorityResponse, eN as OperatorFeeChargedEvent, eO as OperatorFeeConfig, eP as OperatorFeeQuote, eQ as OperatorInfoResponse, eR as OperatorNetworkMetadata, eS as OperatorNetworkMetadataView, eT as OperatorRiskResponse, eU as OperatorRouterConfig, eV as OperatorSigningActivityResponse, eW as OperatorSigningEntry, eX as OperatorSurfaceCapability, eY as OperatorSurfaceStatus, eZ as OracleEvent, e_ as OracleEventError, e$ as OracleFeedConfig, f0 as OracleLatestPrice, f1 as OracleSignerRow, f2 as OracleSignersResponse, f3 as OracleWriters, f4 as P2pSeed, f5 as PENDING_CHANGE_KIND_CODES, f6 as PROVER_MARKET_ADDRESS, f7 as PROVER_MARKET_BID_DOMAIN, f8 as PROVER_MARKET_EVENT_SIGS, f9 as PROVER_MARKET_REQUEST_DOMAIN, fa as PROVER_MARKET_SELECTORS, fb as PROVER_MARKET_SUBMIT_DOMAIN, fc as PROVER_SLASH_REASON_BAD_PROOF, fd as PROVER_SLASH_REASON_NON_DELIVERY, fe as ParsedName, ff as PeerSummary, fg as PeerSummaryAggregate, fh as PendingChangeKind, fi as PendingCharterView, fj as PendingRewardsRow, fk as PendingTxSummary, fl as PlaceLimitOrderViaArgs, fm as PlaceLimitOrderViaPlan, fn as PlaceSpotLimitOrderArgs, fo as PlaceSpotMarketOrderArgs, fp as PlaceSpotMarketOrderExArgs, fq as PrecompileCatalogueResponse, fr as PrecompileDescriptor, fs as ProofRequestRow, ft as ProofRequestView, fu as ProverBidView, fv as ProverBidsResponse, fw as ProverMarketError, fx as ProverMarketState, fy as ProverMarketStatusResponse, fz as PublishOperatorSealKeyCalldataArgs, fA as Quantity, fB as QuoteLiquidity, fC as RESERVED_ADDRESS_HRPS, fD as RankedBridgeRoute, fE as ReceiptProofTrustArchivePolicy, fF as ReceiptProofTrustArchiveSigner, fG as ReceiptProofTrustFinalityPolicy, fH as ReceiptProofTrustFinalitySigner, fI as ReceiptProofTrustPolicy, fJ as RedemptionQueueTicket, fK as RegistryRecord, fL as ReportServiceProbeCalldataArgs, fM as ReportServiceProbeRequest, fN as ReportServiceProbeResponse, fO as RequestClusterJoinCalldataArgs, fP as ResolveNameResponse, fQ as RichListHolder, fR as RichListResponse, fS as RoundCertificateResponse, fT as RoundInfo, fU as RpcClientOptions, fV as RpcEndpoint, fW as RuntimeProvenanceResponse, fX as SERVES_GPU_PROVE, fY as SERVICE_PROBE_STATUS, fZ as SET_POLICY_CLAIM_DOMAIN_TAG, f_ as SPENDING_POLICY_SELECTORS, f$ as SearchHit, g0 as ServiceProbeStatusLabel, g1 as SetOperatorDisplayCalldataArgs, g2 as SigningEntryStatus, g3 as SpendingPolicyArgs, g4 as SpendingPolicyError, g5 as SpendingPolicyTimeWindow, g6 as SpendingPolicyView, g7 as SpotLimitOrderSide, g8 as SpotMarketOrderMode, g9 as StorageProofBatch, ga as SubmitPendingChangeCalldataArgs, gb as SwapIntentStatus, gc as SyncStatus, gd as TESTNET_69420, ge as TokenBalanceMrcIdentity, gf as TokenBalanceRecord, gg as TokenBalanceWithMetadata, gh as TotalBurnedResponse, gi as TpmAttestationResponse, gj as TransactionReceipt, gk as TransactionView, gl as TxConfirmations, gm as TxFeedReceipt, gn as TxFeedTransaction, go as TxStatusFoundResponse, gp as TxStatusNotFoundResponse, gq as TxStatusResponse, gr as UpcomingDutiesResponse, gs as UpcomingDutyMap, gt as UpdateCharterCalldataArgs, gu as UserAddressInput, gv as V1_BRIDGE_ALLOWED_FEE_TOKEN, gw as V1_BRIDGE_ALLOWED_PROTOCOL, gx as VertexAtRound, gy as VerticesAtRoundResponse, gz as VoteClusterAdmitCalldataArgs, gA as addressBytesToHex, gB as addressToBech32, gC as addressToTypedBech32, gD as allowRootFor, gE as archiveMerkleInnerHash, gF as archiveMerkleLeafHash, gG as assertNativeMarketOrderBookStreamPayload, gH as assessBridgeRoute, gI as bech32ToAddress, gJ as bech32ToAddressBytes, gK as bidSighash, gL as bridgeAddressHex, gM as bridgeDrainRemaining, gN as bridgeQuoteSubmitReadiness, gO as bridgeRoutesReadiness, gP as bridgeTransferCandidates, gQ as buildBridgeRouteCatalogue, gR as buildCancelSpotOrderPlan, gS as buildNativeCallForwarderArtifact, gT as buildNativeMarketModuleCallEnvelope, gU as buildNativeNftBuyListingForwarderInput, gV as buildNativeNftBuyListingModuleCall, gW as buildNativeNftCancelListingForwarderInput, gX as buildNativeNftCancelListingModuleCall, gY as buildNativeNftCreateListingForwarderInput, gZ as buildNativeNftCreateListingModuleCall, g_ as buildNativeNftPlaceAuctionBidForwarderInput, g$ as buildNativeNftPlaceAuctionBidModuleCall, h0 as buildNativeNftSettleAuctionForwarderInput, h1 as buildNativeNftSettleAuctionModuleCall, h2 as buildNativeNftSweepExpiredListingsForwarderInput, h3 as buildNativeNftSweepExpiredListingsModuleCall, h4 as buildNativeSpotCancelOrderForwarderInput, h5 as buildNativeSpotCancelOrderModuleCall, h6 as buildNativeSpotCreateMarketForwarderInput, h7 as buildNativeSpotCreateMarketModuleCall, h8 as buildNativeSpotLimitOrderForwarderInput, h9 as buildNativeSpotLimitOrderModuleCall, ha as buildNativeSpotSettleLimitOrderForwarderInput, hb as buildNativeSpotSettleLimitOrderModuleCall, hc as buildNativeSpotSettleRoutedLimitOrderForwarderInput, hd as buildNativeSpotSettleRoutedLimitOrderModuleCall, he as buildPlaceLimitOrderViaPlan, hf as buildPlaceSpotLimitOrderPlan, hg as buildPlaceSpotMarketOrderExPlan, hh as buildPlaceSpotMarketOrderPlan, hi as categoryRoot, hj as clobAddressHex, hk as clusterApyPercent, hl as composeClaimBoundMessage, hm as computeNoEvmDacFinalityMessage, hn as computeNoEvmLeaderFinalityMessage, ho as computeNoEvmReceiptsRoot, hp as computeNoEvmRoundFinalityMessage, hq as computeNoEvmTargetReceiptHash, hr as computeQuoteLiquidity, hs as consumeNativeEvents, ht as decodeActiveCharter, hu as decodeClusterCharter, hv as decodeClusterDiversity, hw as decodeClusterFormedEvent, hx as decodeClusterJoinRequest, hy as decodeNativeAgentStateResponse, hz as decodeNativeMarketOrderBookDeltasResponse, hA as decodeNativeReceiptResponse, hB as decodeNoEvmReceiptTranscript, hC as decodeOperatorFeeChargedEvent, hD as decodeOperatorNetworkMetadata, hE as decodeOperatorSealKey, hF as decodeOracleEvent, hG as decodePendingCharter, hH as decodeProbeAuthority, hI as decodeScoreServiceProbe, hJ as decodeTimeWindow, hK as decodeTxFeedResponse, hL as denyRootFor, hM as deriveArchiveChallenge, hN as deriveClobMarketId, hO as deriveClusterAnchorAddress, hP as deriveFeedId, hQ as deriveNativeSpotMarketId, hR as deriveNativeSpotOrderId, hS as destinationRoot, hT as encodeAnswerArchiveChallengeCalldata, hU as encodeAttestDkgReshareCalldata, hV as encodeAttestServiceProbeCalldata, hW as encodeBlockSelector, hX as encodeBridgeChallengeCalldata, hY as encodeBridgeClaimCalldata, hZ as encodeCancelClusterJoinCalldata, h_ as encodeCancelOrderCalldata, h$ as encodeCancelPendingChangeCalldata, i0 as encodeClaimPolicyByAddressCalldata, i1 as encodeClusterCharter, i2 as encodeCommitArchiveRootCalldata, i3 as encodeCreateRequestCalldata, i4 as encodeCreateRequestCanonical, i5 as encodeDisableCalldata, i6 as encodeEnableCalldata, i7 as encodeExpireClusterJoinCalldata, i8 as encodeFormClusterCalldata, i9 as encodeFormClusterV2Calldata, ia as encodeGetClusterJoinRequestCalldata, ib as encodeGetOperatorSealKeyCalldata, ic as encodeGetPendingCharterCalldata, id as encodeGetProbeAuthorityCalldata, ie as encodeLockBridgeConfigCalldata, ig as encodeNameAcceptTransferCall, ih as encodeNameProposeTransferCall, ii as encodeNameRegisterCall, ij as encodeNativeMarketModuleForwarderInput, ik as encodeNativeNftBuyListingCall, il as encodeNativeNftCancelListingCall, im as encodeNativeNftCreateListingCall, io as encodeNativeNftPlaceAuctionBidCall, ip as encodeNativeNftSettleAuctionCall, iq as encodeNativeNftSweepExpiredListingsCall, ir as encodeNativeSpotCancelOrderCall, is as encodeNativeSpotCreateMarketCall, it as encodeNativeSpotLimitOrderCall, iu as encodeNativeSpotSettleLimitOrderCall, iv as encodeNativeSpotSettleRoutedLimitOrderCall, iw as encodePlaceLimitOrderCalldata, ix as encodePlaceLimitOrderViaCalldata, iy as encodePlaceMarketOrderCalldata, iz as encodePlaceMarketOrderExCalldata, iA as encodePublishOperatorSealKeyCalldata, iB as encodeRecoverOperatorNodeCalldata, iC as encodeReportServiceProbeCalldata, iD as encodeRequestClusterJoinCalldata, iE as encodeSetBridgeResumeCooldownCalldata, iF as encodeSetBridgeRouteFinalityCalldata, iG as encodeSetLotSizeCalldata, iH as encodeSetMinNotionalCalldata, iI as encodeSetOperatorDisplayCalldata, iJ as encodeSetPolicyCalldata, iK as encodeSetPolicyClaimCalldata, iL as encodeSetProbeAuthorityCalldata, iM as encodeSetTickSizeCalldata, iN as encodeSubmitBridgeProofCalldata, iO as encodeSubmitPendingChangeCalldata, iP as encodeUpdateCharterCalldata, iQ as encodeVoteClusterAdmitCalldata, iR as exportBridgeRouteCatalogueJson, iS as fetchChainInfoLatest, iT as fetchChainRegistryLatest, iU as formClusterMessage, iV as formClusterMessageHex, iW as formClusterMessageV2, iX as formClusterMessageV2Hex, iY as formatOraclePrice, iZ as getChainInfo, i_ as getNoEvmReceiptTrustPolicy, i$ as getP2pSeeds, j0 as getRpcEndpoints, j1 as hexToAddressBytes, j2 as isBridgeAdminLockedRevert, j3 as isBridgeCooldownZeroRevert, j4 as isBridgeFinalityZeroRevert, j5 as isBridgeResumeCooldownActiveRevert, j6 as isConcreteServiceProbeStatus, j7 as isNativeDecodedEvent, j8 as isNativeMarketOrderBookStreamPayload, j9 as isSinglePublicServiceProbeMask, ja as isValidNodeRegistryCapabilities, jb as isValidPublicServiceProbeMask, jc as nameLengthModifierX10, jd as nameRegistrationCost, je as nameRegistryAddressHex, jf as nativeAgentStateFilterParams, jg as nativeEventMatches, jh as nativeEventsFilterParams, ji as nativeEventsFromHistory, jj as nativeEventsFromReceipt, jk as nativeMarketEventFilter, jl as nativeMarketEventsFromHistory, jm as nativeMarketEventsFromReceipt, jn as nativeMarketStateFilterParams, jo as noEvmReceiptTrustPolicyFromChainInfo, jp as nodeHostingClassFromByte, jq as nodeHostingClassToByte, jr as nodeRegistryAddressHex, js as normalizeAddressHex, jt as normalizeBridgeRouteCatalogue, ju as normalizePendingChangeKind, jv as oracleAddressHex, jw as oraclePriceToNumber, jx as packTimeWindow, jy as parseAddress, jz as parseBridgeRouteCatalogueJson, jA as parseChainRegistryToml, jB as parseDkgResharePublicKeys, jC as parseNameCategory, jD as parseNativeDecodedEvent, jE as parseQuantity, jF as parseQuantityBig, jG as protocolNonceForEpoch, jH as proverMarketStateFromByte, jI as quoteOperatorFee, jJ as rankBridgeRoutes, jK as rankMarketsByVolume, jL as requestSighash, jM as requireTypedAddress, jN as selectBridgeTransferRoute, jO as serviceMaskToBitIndex, jP as serviceProbeStatusLabel, jQ as setDestinationRoot, jR as slotArchiveChallengePass, jS as slotClusterCharter, jT as slotClusterCharterDelegator, jU as slotClusterCharterMembers, jV as slotClusterServiceScore, jW as slotEpochChallengeSeed, jX as slotProbeAuthority, jY as slotScoreServiceProbe, jZ as spendingPolicyAddressHex, j_ as submitSighash, j$ as typedBech32ToAddress, k0 as updateCharterMessage, k1 as updateCharterMessageHex, k2 as validateAddress, k3 as validateBridgeRouteCatalogue, k4 as verifyNoEvmArchiveProofSignatures, k5 as verifyNoEvmBlockFinalityEvidenceMultisig, k6 as verifyNoEvmBlockFinalityEvidenceThreshold, k7 as verifyNoEvmFinalityEvidenceMultisig, k8 as verifyNoEvmFinalityEvidenceThreshold, k9 as verifyNoEvmReceiptProof, ka as verifyNoEvmReceiptProofTrust } from './submission-Cr6u_2he.cjs';

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

export { AddressFlowResponse, AddressKind, AddressProfileResponse, AgentActionError, type ApiAddressActivityData, type ApiAddressActivityEntry, type ApiAddressActivityKind, type ApiAddressActivityKindData, type ApiAddressActivityKindSummary, type ApiBlockData, type ApiBlockHeader, type ApiBlockTransactionsData, type ApiCapabilitiesResponse, ApiClient, type ApiClientOptions, type ApiClusterData, type ApiClusterDirectoryEntry, type ApiClusterDirectoryPage, type ApiClusterMember, type ApiClusterStatus, type ApiClustersData, type ApiEnvelope, type ApiErrorEnvelope, type ApiHealthResponse, type ApiIndexerStatus, type ApiLatestAnchor, type ApiLogEntry, type ApiOperatorData, type ApiOperatorInfo, type ApiQueryValue, type ApiRuntimeProvenanceData, type ApiServiceProbeData, ApiStreamsIndexResponse, type ApiTransactionData, type ApiTransactionNativeReceiptData, type ApiTransactionReceipt, type ApiTransactionReceiptData, type ApiTransactionView, type ApiUpgradePlanStatus, type ApiUpgradeStatus, type ApiUpgradeStatusData, BURN_ADDR, BlockSelector, BridgeRoutesRequest, BridgeRoutesResponse, type BuildPublishOperatorSealKeyTxFieldsArgs, type BuildRequestClusterJoinTxFieldsArgs, type BuildVoteClusterAdmitTxFieldsArgs, ChainStatsResponse, ClobMarketResponse, ClobMarketsResponse, ClobOhlcResponse, ClobOrderBookResponse, ClobTradesResponse, type ClusterJoinFeeOptions, type ClusterJoinReadClient, ClusterJoinRequestView, type ClusterJoinSubmitClient, type ClusterJoinSubmitResult, type ClusterJoinTxFee, type CreateFixedSupplyMrc20CalldataArgs, type CreateTokenCalldataArgs, DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT, DEFAULT_OPERATOR_SEAL_KEY_EXECUTION_UNIT_LIMIT, DELEGATION_REVERT_TAGS, DELEGATION_SELECTORS, DelegationPrecompileError, EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER, type EncodeNativeAgentAvailabilitySlotArgs, type EncodeNativeAgentCounterEscrowArgs, type EncodeNativeAgentCreateEscrowArgs, type EncodeNativeAgentDeactivateServiceArgs, type EncodeNativeAgentEscrowActorArgs, type EncodeNativeAgentGrantConsentArgs, type EncodeNativeAgentIssueAttestationArgs, type EncodeNativeAgentListServiceArgs, type EncodeNativeAgentRecordPolicySpendArgs, type EncodeNativeAgentRecordReputationArgs, type EncodeNativeAgentRegisterArbiterArgs, type EncodeNativeAgentRegisterIssuerArgs, type EncodeNativeAgentResolveEscrowArgs, type EncodeNativeAgentRevokeAttestationArgs, type EncodeNativeAgentRevokeConsentArgs, type EncodeNativeAgentSetAvailabilityArgs, type EncodeNativeAgentSetSpendingPolicyArgs, type EncodeNativeAgentStartEscrowArgs, type EncodeNativeAgentSubmitEscrowArgs, ExecutionUnitPriceResponse, type HealthSummary, LYTHOSHI_PER_LYTH, LYTH_DECIMALS, type LatencyBands, type LythFormatOptions, MAX_MULTISIG_MEMBERS, MIN_EXECUTION_UNIT_PRICE_LYTHOSHI, MIN_MULTISIG_MEMBERS, MONOLYTHIUM_NETWORKS, MONOLYTHIUM_TESTNET_CHAIN_ID, MONOLYTHIUM_TESTNET_NETWORK_NAME, MRV_DEPLOY_PAYLOAD_VERSION, MRV_FORMAT_VERSION, MRV_MAX_ABI_SYMBOLS, MRV_MAX_CODE_BYTES, MRV_MAX_DEBUG_BYTES, MRV_MAX_MEMORY_PAGES, MRV_MAX_STORAGE_NAMESPACE_BYTES, MRV_MEMORY_PAGE_BYTES, MRV_PROFILE_MONO_RV32IM_V1, MRV_STRUCTURED_FEE_FIELDS, MRV_TX_EXTENSION_KIND, MRV_TX_EXTENSION_V1, MULTISIG_ADDRESS_DERIVATION_DOMAIN as MULTISIG_WITNESS_ADDRESS_DERIVATION_DOMAIN, MULTISIG_WITNESS_DOMAIN, type MemberPubkeyInput, type MonolythiumNetworkConfig, type MrcAccountRequest, MrcAccountResponse, type MrcHoldersRequest, MrcHoldersResponse, MrcMetadataResponse, type MrvAbiManifest, type MrvAbiParam, type MrvAbiSymbol, type MrvAbiSymbolKind, type MrvAbiType, type MrvAddressKind, type MrvArtifactMetadata, type MrvBuildMetadata, type MrvBytesLike, type MrvCallNativeTxOptions, type MrvCallNativeTxPlan, type MrvCallPlan, type MrvCallRequest, type MrvCallResponse, type MrvCallStatus, type MrvCallSubmission, type MrvCallSubmitOptions, type MrvDecimalLike, type MrvDeployNativeTxOptions, type MrvDeployNativeTxPlan, type MrvDeployPayload, type MrvDeployPayloadNativeTxOptions, type MrvDeployPayloadPlanOptions, type MrvDeployPayloadRequestOptions, type MrvDeployPayloadSubmission, type MrvDeployPayloadSubmitOptions, type MrvDeployPlan, type MrvDeployPlanOptions, type MrvDeployRequest, type MrvDeployResponse, type MrvDeploySubmission, type MrvDeploySubmitOptions, type MrvEncryptedSubmissionResult, type MrvEventRecord, type MrvExecutionReceipt, type MrvFeeDisplayConformanceInput, type MrvFeeDisplayConformanceReport, type MrvMemoryLimits, type MrvMeterCounters, type MrvNativeFeePreview, type MrvNativeStateDelta, type MrvNativeTxFacade, type MrvRequestBuildOptions, type MrvResolvedSyscall, type MrvRevertPayload, type MrvRiscvProfile, type MrvStorageNamespace, type MrvStructuredFeeConformanceOptions, type MrvStructuredFeeConformanceReport, type MrvSyscallImport, type MrvTransactionExtension, type MrvTypedAddress, type MrvValidatedArtifactMetadata, MrvValidationError, MultisigError, type MultisigMember, type MultisigMemberSignature, type MultisigWitness, NATIVE_AGENT_MODULE_ADDRESS, NATIVE_AGENT_MODULE_ADDRESS_BYTES, NATIVE_DEV_HOST_API_VERSION, NATIVE_DEV_IPC_PROTOCOL_VERSION, NATIVE_DEV_MANIFEST_SCHEMA_VERSION, NATIVE_LYTH_DECIMALS, type NativeAgentAddressInput, type NativeAgentAddressKind, type NativeAgentEscrowResolution, type NativeAgentForwarderInput, type NativeAgentModuleCallEnvelope, type NativeAgentModuleContractCall, type NativeAgentReputationScores, NativeAgentStateFilter, NativeAgentStateResponse, NativeDecodedEvent, type NativeDevApprovalKind, type NativeDevCommandName, type NativeDevContractPassport, type NativeDevHostApprovalResultMessage, type NativeDevHostCommandMessage, type NativeDevHostContextMessage, type NativeDevIpcMessage, type NativeDevMrcAllocation, type NativeDevMrcAssetKind, type NativeDevMrcTokenPlan, type NativeDevMrvDeployPlan, type NativeDevRiskLabel, type NativeDevRiskSeverity, type NativeDevSidecarApprovalRequestMessage, type NativeDevSidecarCommandResultMessage, type NativeDevSidecarProjectEventMessage, type NativeDevSidecarReadyMessage, type NativeDevVerificationBundle, type NativeDevWalletApprovalRequest, type NativeDevkitArchive, type NativeDevkitChannel, type NativeDevkitCompatibility, type NativeDevkitManifest, type NativeDevkitSidecarManifest, type NativeDevkitSidecarStatus, type NativeDevkitStatus, NativeEventFilter, NativeEventsFilter, NativeEventsResponse, NativeMarketOrderBookDeltasRequest, NativeMarketOrderBookDeltasResponse, NativeMarketStateFilter, NativeMarketStateResponse, NativeReceiptFee, type NativeReceiptFeeDisplay, NativeReceiptResponse, OPERATOR_ROUTER_ADDRESS, OperatorCapabilitiesResponse, type OperatorOnboardingPreview, type OperatorSealKeySubmitResult, PRECOMPILE_ADDRESSES, PROTOCOL_MAX_OPERATOR_FEE_BPS, PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN, PUBKEY_REGISTRY_SELECTORS, PendingRewardsResponse, type PrecompileAddress, type PrecompileName, type PubkeyLookup, PubkeyRegistryError, REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT, RedemptionQueueResponse, type ResolvedExecutionFee, RpcClient, RuntimeBuildProvenance, RuntimeUpgradeStatus, SdkError, SearchResponse, ServiceProbeResponse, type StudioHostState, type StudioHostStatus, type SubmitPublishOperatorSealKeyArgs, type SubmitRequestClusterJoinArgs, type SubmitVoteClusterAdmitArgs, TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI, TOKEN_FACTORY_FLAGS, TOKEN_FACTORY_KNOWN_FLAG_MASK, TOKEN_FACTORY_MAX_CREATOR_FEE_BPS, TOKEN_FACTORY_MAX_DECIMALS, TOKEN_FACTORY_NAME_MAX_BYTES, TOKEN_FACTORY_SELECTORS, TOKEN_FACTORY_SIGS, TOKEN_FACTORY_SYMBOL_MAX_BYTES, TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG, TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT, TX_EXTENSION_KIND_MULTISIG, TX_EXTENSION_MULTISIG_V1, type TokenFactoryAddressInput, type TokenFactoryBytes32Input, TokenFactoryError, type TokenFactoryUintInput, type TransactionFeeExposure, TxFeedResponse, TypedAddress, TypedNativeReceiptEvent, VRF_DOMAIN_TAG_MAX_BYTES, VRF_HEIGHT_NOT_FINALIZED_REVERT, VRF_OUTPUT_BYTES, VrfCallError, type VrfDomainTagInput, apiEndpointFromRpcEndpoint, assembleMultisigSigned, assembleMultisigWitness, assertMrvCallNativeSubmissionPlan, assertMrvDeployNativeSubmissionPlan, assertMrvFeeDisplayConformance, assertMrvStructuredFeeConformance, assertNativeDevMrcTokenPlan, assertNativeDevMrvDeployPlan, assertNativeDevWalletApprovalRequest, buildMrvCallNativeTxPlan, buildMrvCallPlan, buildMrvCallRequest, buildMrvDeployNativeTxPlan, buildMrvDeployPayloadNativeTxPlan, buildMrvDeployPayloadPlan, buildMrvDeployPayloadRequest, buildMrvDeployPlan, buildMrvDeployRequest, buildNativeAgentCreateEscrowForwarderInput, buildNativeAgentCreateEscrowModuleCall, buildNativeAgentModuleCallEnvelope, buildNativeAgentRecordReputationForwarderInput, buildNativeAgentRecordReputationModuleCall, buildNativeAgentSetSpendingPolicyForwarderInput, buildNativeAgentSetSpendingPolicyModuleCall, buildPublishOperatorSealKeyTxFields, buildRequestClusterJoinTxFields, buildVoteClusterAdmitTxFields, checkMrvFeeDisplayConformance, checkMrvStructuredFeeConformance, checkNativeDevkitCompatibility, clampPriorityTip, clusterJoinRequestExists, compareNativeDevVersions, decodeHasPubkeyReturn, decodeLookupPubkeyReturn, decodeTokenFactoryTokenId, decodeVrfOutput, delegationAddressHex, deriveClusterJoinOperatorId, deriveMrvContractAddress, deriveMultisigAddress, deriveMultisigAddressBytes, deriveTokenFactoryTokenId, encodeClaimCalldata, encodeCreateFixedSupplyMrc20Calldata, encodeCreateTokenCalldata, encodeDelegateCalldata, encodeHasPubkeyCalldata, encodeLookupPubkeyCalldata, encodeMrvDeployPayload, encodeMultisigWitnessBody, encodeNativeAgentAcceptEscrowCall, encodeNativeAgentApproveEscrowCall, encodeNativeAgentArbiterGetCall, encodeNativeAgentAttestationGetCall, encodeNativeAgentAvailabilityGetCall, encodeNativeAgentCancelEscrowCall, encodeNativeAgentCloseAvailabilityCall, encodeNativeAgentConsentGetCall, encodeNativeAgentCounterEscrowCall, encodeNativeAgentCreateEscrowCall, encodeNativeAgentDeactivateServiceCall, encodeNativeAgentDisputeEscrowCall, encodeNativeAgentEscrowGetCall, encodeNativeAgentGrantConsentCall, encodeNativeAgentIssueAttestationCall, encodeNativeAgentIssuerGetCall, encodeNativeAgentListServiceCall, encodeNativeAgentModuleForwarderInput, encodeNativeAgentOpenAvailabilityCall, encodeNativeAgentRecordPolicySpendCall, encodeNativeAgentRecordReputationCall, encodeNativeAgentRegisterArbiterCall, encodeNativeAgentRegisterIssuerCall, encodeNativeAgentReputationGetCall, encodeNativeAgentResolveEscrowCall, encodeNativeAgentRevokeAttestationCall, encodeNativeAgentRevokeConsentCall, encodeNativeAgentServiceGetCall, encodeNativeAgentSetAvailabilityCall, encodeNativeAgentSetSpendingPolicyCall, encodeNativeAgentSpendingPolicyGetCall, encodeNativeAgentStartEscrowCall, encodeNativeAgentSubmitEscrowCall, encodeRedelegateCalldata, encodeRegisterPubkeyCalldata, encodeSetAutoCompoundCalldata, encodeTokenFactoryAllowanceCalldata, encodeTokenFactoryApproveCalldata, encodeTokenFactoryBalanceOfCalldata, encodeTokenFactoryBurnCalldata, encodeTokenFactoryDecreaseAllowanceCalldata, encodeTokenFactoryDestroyCalldata, encodeTokenFactoryIncreaseAllowanceCalldata, encodeTokenFactoryMetadataCalldata, encodeTokenFactoryMintCalldata, encodeTokenFactorySetPausedCalldata, encodeTokenFactoryTotalSupplyCalldata, encodeTokenFactoryTransferCalldata, encodeTokenFactoryTransferFromCalldata, encodeTokenFactoryTransferOwnershipCalldata, encodeUndelegateCalldata, encodeVrfEvaluateCalldata, formatLyth, formatLythoshi, formatNativeReceiptFeeDisplay, isUnexpectedValueRevert, mrvAddressToBech32, mrvBech32ToAddress, mrvCodeHashHex, mrvV1TransactionExtension, multisigBaseSighash, multisigMemberIndex, nativeDevSchemaFieldNames, nativeDevUiStrings, parseLythToLythoshi, preflightClusterJoinRequest, previewRequestClusterJoin, previewVoteClusterAdmit, pubkeyRegistryAddressHex, readClusterJoinRequest, resolveClusterJoinExecutionFee, resolveExecutionFee, resolveMaxExecutionUnitPrice, resolveRegistryExecutionFee, resolveStudioHostStatus, sortMultisigMembers, submitMrvCallNativeTx, submitMrvDeployNativeTx, submitMrvDeployPayloadNativeTx, submitPublishOperatorSealKey, submitRequestClusterJoin, submitVoteClusterAdmit, tokenFactoryAddressHex, transactionFeeExposure, validateMrvArtifactMetadata, validateMrvCallRequest, validateMrvDeployRequest, validateMultisigRoster, validateTokenFactoryFlags, version, vrfAddressHex };
