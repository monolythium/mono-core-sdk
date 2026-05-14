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

export const version = "0.1.0";

export { ApiClient, apiEndpointFromRpcEndpoint } from "./api.js";
export type {
  ApiAddressActivityData,
  ApiAddressActivityEntry,
  ApiAddressActivityKind,
  ApiAddressActivityKindData,
  ApiAddressActivityKindSummary,
  ApiBlockData,
  ApiBlockHeader,
  ApiBlockTransactionsData,
  ApiCapabilitiesResponse,
  ApiClientOptions,
  ApiClusterData,
  ApiClusterDirectoryEntry,
  ApiClusterDirectoryPage,
  ApiClusterMember,
  ApiClustersData,
  ApiClusterStatus,
  ApiEnvelope,
  ApiErrorEnvelope,
  ApiHealthResponse,
  ApiIndexerStatus,
  ApiLatestAnchor,
  ApiLogEntry,
  ApiOperatorData,
  ApiOperatorInfo,
  ApiQueryValue,
  ApiTransactionData,
  ApiTransactionReceipt,
  ApiTransactionReceiptData,
  ApiTransactionView,
  ApiUpgradePlanStatus,
  ApiUpgradeStatus,
  ApiUpgradeStatusData,
} from "./api.js";
export { RpcClient, parseQuantity, parseQuantityBig } from "./client.js";
export type {
  AddressActivityKind,
  AddressFlowResponse,
  AddressProfileResponse,
  AttestationWindow,
  ChainStatsResponse,
  ClobMarketsResponse,
  ClobMarketSummary,
  ClobOhlcResponse,
  ClobOrderBookResponse,
  ClobTrade,
  ClobTradesResponse,
  ClusterDirectoryEntryResponse,
  ClusterDirectoryPageResponse,
  ClusterMemberResponse,
  ClusterStatusResponse,
  DutyAbsence,
  JailStatusWindow,
  KeyRotationWindow,
  LythUpgradePlanStatus,
  LythUpgradeStatusResponse,
  MetricsRangeResponse,
  MetricsRangeSample,
  MetricsRangeSeries,
  MetricsRangeStatus,
  NetworkClientOptions,
  OperatorAuthorityResponse,
  OperatorCapabilitiesResponse,
  OperatorInfoResponse,
  OperatorRiskResponse,
  OperatorSigningActivityResponse,
  OperatorSigningEntry,
  OperatorSurfaceCapability,
  OperatorSurfaceStatus,
  PeerSummaryAggregate,
  PrecompileCatalogueResponse,
  RpcClientOptions,
  SigningEntryStatus,
  SearchHit,
  SearchResponse,
  TxFeedReceipt,
  TxFeedResponse,
  TxFeedTransaction,
  TxStatusFoundResponse,
  TxStatusNotFoundResponse,
  TxStatusResponse,
  UpcomingDutiesResponse,
  UpcomingDutyMap,
  VertexAtRound,
  VerticesAtRoundResponse,
} from "./client.js";
export {
  CHAIN_REGISTRY,
  CHAIN_REGISTRY_RAW_BASE,
  TESTNET_69420,
  fetchChainInfoLatest,
  fetchChainRegistryLatest,
  getChainInfo,
  getP2pSeeds,
  getRpcEndpoints,
  parseChainRegistryToml,
} from "./registry.js";
export type {
  ChainInfo,
  ChainRegistry,
  ExplorerEndpoint,
  NetworkSlug,
  P2pSeed,
  RpcEndpoint,
} from "./registry.js";
export { SdkError } from "./error.js";
export * from "./types.js";
export { BURN_ADDR, PRECOMPILE_ADDRESSES } from "./consts.js";
export type { PrecompileName, PrecompileAddress } from "./consts.js";
export {
  ADDRESS_HRP,
  AddressError,
  addressBytesToHex,
  addressToBech32,
  bech32ToAddress,
  bech32ToAddressBytes,
  hexToAddressBytes,
  normalizeAddressHex,
  parseAddress,
} from "./address.js";
export {
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  SET_POLICY_CLAIM_DOMAIN_TAG,
  SPENDING_POLICY_SELECTORS,
  SpendingPolicyError,
  composeClaimBoundMessage,
  encodeClaimPolicyByAddressCalldata,
  encodeDisableCalldata,
  encodeEnableCalldata,
  encodeSetPolicyCalldata,
  encodeSetPolicyClaimCalldata,
  spendingPolicyAddressHex,
} from "./spending-policy.js";
export type { SpendingPolicyArgs } from "./spending-policy.js";
export {
  PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN,
  PUBKEY_REGISTRY_SELECTORS,
  PubkeyRegistryError,
  decodeHasPubkeyReturn,
  decodeLookupPubkeyReturn,
  encodeHasPubkeyCalldata,
  encodeLookupPubkeyCalldata,
  encodeRegisterPubkeyCalldata,
  pubkeyRegistryAddressHex,
} from "./pubkey-registry.js";
export type { PubkeyLookup } from "./pubkey-registry.js";

// ethers.js compat shim — ethers is a peerDependency. Importers that
// don't use the shim never pay for the ethers types.
export {
  MonolythiumProvider,
  MonolythiumSigner,
  MONOLYTHIUM_NETWORKS,
  MONOLYTHIUM_TESTNET_CHAIN_ID,
  MONOLYTHIUM_TESTNET_NETWORK_NAME,
  translateBlockOut,
  translateReceiptOut,
  translateTxIn,
} from "./ethers/index.js";
export type {
  EthersBlockShape,
  EthersReceiptShape,
  EthersTxRequestSubset,
  MonolythiumNetworkConfig,
  MonolythiumProviderOptions,
  MonolythiumSignerBackend,
} from "./ethers/index.js";
