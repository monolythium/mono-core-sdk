/**
 * Third-party bridge route disclosure helpers.
 *
 * These helpers assess caller-supplied route disclosures. They do not call a
 * node route and do not claim any bridge integration is live.
 */
declare const BRIDGE_SELECTORS: {
    readonly lockBridgeConfig: "0x8956feb3";
    readonly setBridgeResumeCooldown: "0x1a3a0672";
    readonly setBridgeRouteFinality: "0x8a061e99";
};
declare const BRIDGE_REVERT_TAGS: {
    readonly bridgeAdminLocked: "0xf807";
    readonly bridgeResumeCooldownActive: "0xf808";
    readonly bridgeCooldownZero: "0xfd08";
    readonly bridgeFinalityZero: "0xfd09";
};
declare const BRIDGE_QUOTE_API_BLOCKED_REASON = "bridge quote requires a mono-core live quote API/runtime primitive";
declare const BRIDGE_SUBMIT_API_BLOCKED_REASON = "bridge submit requires a mono-core live submit API/runtime primitive";
declare const V1_BRIDGE_ALLOWED_FEE_TOKEN = "LINK";
declare const V1_BRIDGE_ALLOWED_PROTOCOL = "chainlink-ccip";
type BridgeBytesInput = string | Uint8Array | readonly number[];
type BridgeAdminControl = "none" | "consensusOnly" | "operatorKey" | "unknown";
type BridgeCircuitBreakerState = "armed" | "paused" | "disabled" | "unknown";
type BridgeRiskTier = "low" | "medium" | "high" | "blocked";
declare class BridgePrecompileError extends Error {
    constructor(message: string);
}
declare class BridgeRouteCatalogueError extends Error {
    readonly blockedReasons: string[];
    constructor(blockedReasons: readonly string[]);
}
declare function bridgeAddressHex(): string;
declare function encodeLockBridgeConfigCalldata(bridgeId: BridgeBytesInput): string;
declare function encodeSetBridgeResumeCooldownCalldata(bridgeId: BridgeBytesInput, cooldownBlocks: bigint | number | string): string;
declare function encodeSetBridgeRouteFinalityCalldata(bridgeId: BridgeBytesInput, finalityBlocks: bigint | number | string): string;
declare function isBridgeAdminLockedRevert(data: BridgeBytesInput): boolean;
declare function isBridgeResumeCooldownActiveRevert(data: BridgeBytesInput): boolean;
declare function isBridgeCooldownZeroRevert(data: BridgeBytesInput): boolean;
declare function isBridgeFinalityZeroRevert(data: BridgeBytesInput): boolean;
interface BridgeVerifierDisclosure {
    model: string;
    participantCount: number;
    threshold: number;
}
interface BridgeRouteDisclosure {
    routeId: string;
    bridge: string;
    protocol?: string | null;
    asset: string;
    feeToken: string;
    sourceChain: string;
    destinationChain: string;
    verifier: BridgeVerifierDisclosure;
    drainCapAtomic: string;
    finalityBlocks: number;
    cooldownSeconds: number;
    adminControl: BridgeAdminControl;
    circuitBreaker: BridgeCircuitBreakerState;
    insuranceAtomic: string;
    lastIncidentDate?: string | null;
}
interface BridgeRouteCatalogueRoute {
    tokenId: string;
    routeId: string;
    bridgeId: string;
    wrappedAsset: string;
    bridge: string;
    protocol?: string | null;
    asset: string;
    feeToken: string;
    sourceChain: string;
    destinationChain: string;
    verifier: BridgeVerifierDisclosure;
    drainCapAtomic: string;
    finalityBlocks: number;
    cooldownSeconds: number;
    adminControl: BridgeAdminControl;
    circuitBreaker: BridgeCircuitBreakerState;
    insuranceAtomic: string;
    updatedAtBlock: number;
    lastIncidentDate?: string | null;
}
interface BridgeRouteCatalogue {
    routes: BridgeRouteCatalogueRoute[];
}
type BridgeRouteCataloguePayload = BridgeRouteCatalogue | readonly BridgeRouteCatalogueRoute[];
interface BridgeRouteCatalogueValidation {
    accepted: boolean;
    routeCount: number;
    blockedReasons: string[];
}
interface BridgeRouteCatalogueJsonOptions {
    /**
     * Export as `{ routes: [...] }` by default. Set false for mono-core's raw-array import form.
     */
    envelope?: boolean;
    /**
     * JSON.stringify spacing. Defaults to two spaces to match CLI fixture style.
     */
    space?: number | string;
}
interface BridgeRouteAssessment {
    routeId: string;
    accepted: boolean;
    score: number;
    riskTier: BridgeRiskTier;
    blockedReasons: string[];
    warnings: string[];
}
interface RankedBridgeRoute {
    route: BridgeRouteDisclosure;
    assessment: BridgeRouteAssessment;
}
interface BridgeTransferIntent {
    asset: string;
    amountAtomic: string;
    sourceChain: string;
    destinationChain: string;
    recipient: string;
    sender?: string | null;
    allowedRouteIds?: string[] | null;
    minimumScore?: number | null;
    maxFinalityBlocks?: number | null;
    maxCooldownSeconds?: number | null;
}
interface BridgeRouteCandidate {
    route: BridgeRouteDisclosure;
    assessment: BridgeRouteAssessment;
    eligible: boolean;
    score: number;
    blockedReasons: string[];
    warnings: string[];
}
interface BridgeTransferRequest {
    intent: BridgeTransferIntent;
    route: BridgeRouteDisclosure;
    assessment: BridgeRouteAssessment;
}
interface BridgeRouteSelection {
    selected: BridgeTransferRequest | null;
    candidates: BridgeRouteCandidate[];
    blockedReasons: string[];
}
/**
 * SDK-only readiness report for the quote/submit boundary.
 *
 * The SDK can verify route-selection readiness from supplied disclosures, but
 * live quote and submit remain blocked until mono-core exposes those
 * API/runtime primitives.
 */
interface BridgeQuoteSubmitReadiness {
    selection: BridgeRouteSelection;
    routeSelectionReady: boolean;
    quoteReady: boolean;
    submitReady: boolean;
    blockedReasons: string[];
    warnings: string[];
}
interface BridgeRoutesRequest {
    address?: string | null;
    intent?: BridgeTransferIntent | null;
    routeDisclosures?: BridgeRouteDisclosure[] | null;
    limit?: number | null;
}
interface BridgeRoutesSource {
    address?: string | null;
    routeCount: number;
    globalRouteIndexAvailable: boolean;
    routeDisclosureSource: string;
}
interface BridgeRoutesResponse {
    selection: BridgeRouteSelection;
    routeSelectionReady: boolean;
    quoteReady: boolean;
    submitReady: boolean;
    blockedReasons: string[];
    warnings: string[];
    routes?: BridgeRouteDisclosure[] | null;
    bridgeRouteDisclosures?: BridgeRouteDisclosure[] | null;
    source?: BridgeRoutesSource | null;
}
/**
 * Per-asset drain rate-limit + circuit-breaker state (MB-2).
 *
 * Mirrors the `TAG_DRAIN_CAP` (`0x26`) family in the chain bridge
 * storage. `capPerWindow === "0"` disables the breaker for the
 * `(bridge, asset)` pair. `drained` is the running total for the active
 * window; `remaining` is the SDK-computed `cap - drained` floored at
 * zero (decimal string), or `null` when the cap is disabled.
 */
interface BridgeDrainCap {
    /** Maximum aggregate drain per rolling window (`uint256` decimal). */
    capPerWindow: string;
    /** Window length in Protocore blocks. */
    windowBlocks: string;
    /** `block_number / window_blocks` at the last drain. */
    currentBucket: string;
    /** Running drained total for the active window (`uint256` decimal). */
    drained: string;
    /** SDK-computed `capPerWindow - drained` floored at `0`; `null` if disabled. */
    remaining?: string | null;
}
/**
 * Bridge route circuit-breaker + resume-cooldown health (MB-2).
 *
 * Mirrors the bridge-record fields `PAUSED_AT_BLOCK` (`0x13`),
 * `RESUME_COOLDOWN_BLOCKS` (`0x12`), `ROUTE_FINALITY_BLOCKS` (`0x14`),
 * and `ADMIN_LOCKED_AT_BLOCK` (`0x11`) plus the per-asset drain cap.
 * `paused` is derived from `pausedAt !== "0"`.
 */
interface BridgeBreakerState {
    /** Bridge id the breaker state belongs to (`0x` 32 bytes). */
    bridgeId: string;
    /** `true` when the route is in a recorded pause window. */
    paused: boolean;
    /** Block at which the current pause was committed; `"0"` when not paused. */
    pausedAt: string;
    /** Cooldown blocks that must elapse after a pause before resume. */
    resumeCooldownBlocks: string;
    /** Route-specific foreign-chain finality depth. */
    routeFinalityBlocks: string;
    /** Block at which mutable route config was frozen; `"0"` = unlocked. */
    adminLockedAtBlock: string;
    /** Per-asset drain rate-limit + breaker counters, when a cap is set. */
    drainCap?: BridgeDrainCap | null;
}
/**
 * Compute the `remaining` field for a {@link BridgeDrainCap} from its
 * `capPerWindow` and `drained` decimal strings, floored at `0`. Returns
 * `null` when the cap is disabled (`capPerWindow === "0"`).
 */
declare function bridgeDrainRemaining(capPerWindow: string, drained: string): string | null;
declare function assessBridgeRoute(route: BridgeRouteDisclosure): BridgeRouteAssessment;
declare function rankBridgeRoutes(routes: readonly BridgeRouteDisclosure[]): RankedBridgeRoute[];
declare function bridgeTransferCandidates(intent: BridgeTransferIntent, routes: readonly BridgeRouteDisclosure[]): BridgeRouteCandidate[];
declare function selectBridgeTransferRoute(intent: BridgeTransferIntent, routes: readonly BridgeRouteDisclosure[]): BridgeRouteSelection;
declare function bridgeQuoteSubmitReadiness(intent: BridgeTransferIntent, routes: readonly BridgeRouteDisclosure[]): BridgeQuoteSubmitReadiness;
declare function bridgeRoutesReadiness(request: BridgeRoutesRequest): BridgeRoutesResponse;
declare function buildBridgeRouteCatalogue(routes: readonly BridgeRouteCatalogueRoute[]): BridgeRouteCatalogue;
declare function parseBridgeRouteCatalogueJson(json: string): BridgeRouteCatalogue;
declare function normalizeBridgeRouteCatalogue(payload: unknown): BridgeRouteCatalogue;
declare function validateBridgeRouteCatalogue(payload: unknown): BridgeRouteCatalogueValidation;
declare function exportBridgeRouteCatalogueJson(payload: BridgeRouteCataloguePayload, options?: BridgeRouteCatalogueJsonOptions): string;

/**
 * Market metadata returned inside `lyth_clobMarket`.
 */
type ClobMarketRecord = {
    /**
     * Base token id.
     */
    baseToken: string;
    /**
     * Quote token id.
     */
    quoteToken: string;
    /**
     * Best bid price as a decimal string.
     */
    bestBidPrice: string;
    /**
     * Best ask price as a decimal string.
     */
    bestAskPrice: string;
    /**
     * Last trade price as a decimal string.
     */
    lastTradePrice: string;
    /**
     * Total traded base volume as a decimal string.
     */
    totalVolumeBase: string;
    /**
     * Taker fee in basis points.
     */
    takerFeeBps: number;
    /**
     * Tick size as a decimal string.
     */
    tickSize: string;
    /**
     * Lot size as a decimal string.
     */
    lotSize: string;
    /**
     * Minimum notional as a decimal string.
     */
    minNotional: string;
    /**
     * Whether the market is registered on-chain.
     */
    isRegistered: boolean;
    /**
     * Registration block.
     */
    registeredAtBlock: bigint;
};

/**
 * `lyth_clobMarket` response.
 */
type ClobMarketResponse = {
    /**
     * Response schema version.
     */
    schemaVersion: number;
    /**
     * Queried market id.
     */
    marketId: string;
    /**
     * Market metadata, or `null` when the market is not found.
     */
    market: ClobMarketRecord | null;
};

/**
 * Canonical MRC policy-account spending policy body.
 */
type MrcPolicyRecord = {
    /**
     * Whether the policy currently allows spending.
     */
    enabled: boolean;
    /**
     * Maximum amount per action as decimal text.
     */
    perActionLimit: string;
    /**
     * Maximum amount inside one window as decimal text.
     */
    windowLimit: string;
    /**
     * Assets allowed by this policy.
     */
    allowedAssets: Array<string>;
};

/**
 * Current-state smart/policy account row folded from native MRC account events.
 */
type MrcAccountRecord = {
    /**
     * Account row kind: `smart_account` or `policy_account`.
     */
    kind: string;
    /**
     * Account address this row describes.
     */
    account: string;
    /**
     * Controller address authorized for this account.
     */
    controller: string;
    /**
     * Recovery address registered for this account, when smart-account state carries one.
     */
    recovery: string | null;
    /**
     * Active policy hash, when this row is a policy account.
     */
    policyHash: string | null;
    /**
     * Active policy body, when this row is a policy account and the node has indexed it.
     */
    policy: MrcPolicyRecord | null;
    /**
     * Account nonce as decimal text, or `null` when the row has no nonce.
     */
    nonce: string | null;
    /**
     * Block height of the latest fold into this row.
     */
    updatedAtBlock: number;
};

/**
 * Current-state policy spend row included in `lyth_mrcAccount`.
 */
type MrcPolicySpendRecord = {
    /**
     * Policy account address.
     */
    account: string;
    /**
     * Asset id governed by this spend window.
     */
    assetId: string;
    /**
     * Spend window identifier as decimal text.
     */
    window: string;
    /**
     * Window allowance amount as decimal text.
     */
    amount: string;
    /**
     * Amount already spent in this window as decimal text.
     */
    spent: string;
    /**
     * Block height of the latest fold into this row.
     */
    updatedAtBlock: number;
};

/**
 * `lyth_mrcAccount` exact current-state smart/policy account lookup response.
 */
type MrcAccountResponse = {
    /**
     * Response schema version.
     */
    schemaVersion: number;
    /**
     * Queried account address.
     */
    account: string;
    /**
     * Policy spend row limit applied by the node.
     */
    spendLimit: number;
    /**
     * Smart-account row, or `null` when none exists.
     */
    smartAccount: MrcAccountRecord | null;
    /**
     * Policy-account row, or `null` when none exists.
     */
    policyAccount: MrcAccountRecord | null;
    /**
     * Policy spend rows for this account.
     */
    policySpends: Array<MrcPolicySpendRecord>;
};

/**
 * One holder row in `lyth_richList`.
 */
type RichListHolder = {
    /**
     * One-based holder rank.
     */
    rank: number;
    /**
     * Holder address.
     */
    address: string;
    /**
     * Balance as a decimal string.
     */
    balance: string;
    /**
     * Block height the balance was last observed at.
     */
    updatedAtBlock: bigint;
};

/**
 * `lyth_mrcHolders` response.
 */
type MrcHoldersResponse = {
    /**
     * Response schema version.
     */
    schemaVersion: number;
    /**
     * Queried MRC standard.
     */
    standard: string;
    /**
     * Queried MRC asset or collection id.
     */
    assetId: string;
    /**
     * Queried token id, or `null` for MRC-4626 vault scope.
     */
    tokenId: string | null;
    /**
     * Result limit applied by the node.
     */
    limit: number;
    /**
     * Holder rows. The row shape is shared with `lyth_richList`.
     */
    holders: Array<RichListHolder>;
};

/**
 * Current-state metadata folded from native MRC creation/metadata events.
 */
type MrcMetadataRecord = {
    /**
     * MRC standard: `mrc20`, `mrc721`, `mrc1155`, or `mrc4626`.
     */
    standard: string;
    /**
     * Asset, collection, or vault id.
     */
    assetId: string;
    /**
     * Token id for token-specific metadata rows.
     */
    tokenId: string | null;
    /**
     * Human-readable name, when carried by the source event.
     */
    name: string | null;
    /**
     * Short symbol, when carried by the source event.
     */
    symbol: string | null;
    /**
     * Display decimals, when carried by the source event.
     */
    decimals: number | null;
    /**
     * Metadata URI, when carried by the source event.
     */
    uri: string | null;
    /**
     * Block height of the latest fold into this row.
     */
    updatedAtBlock: number;
};

/**
 * `lyth_mrcMetadata` exact current-state metadata lookup response.
 */
type MrcMetadataResponse = {
    /**
     * Response schema version.
     */
    schemaVersion: number;
    /**
     * Queried asset, collection, or vault id.
     */
    assetId: string;
    /**
     * Queried token id, or `null` for asset/collection scope.
     */
    tokenId: string | null;
    /**
     * Metadata row, or `null` when no aggregate exists for the key.
     */
    metadata: MrcMetadataRecord | null;
};

/**
 * One row in `lyth_pendingRewards`.
 */
type PendingRewardsRow = {
    /**
     * Cluster id receiving the delegated weight.
     */
    cluster: number;
    /**
     * Delegated weight in basis points.
     */
    weightBps: number;
    /**
     * Unsettled reward-index delta for this cluster, as a hex quantity.
     */
    unsettledAmountLythoshi: string;
};

/**
 * `lyth_pendingRewards` response.
 */
type PendingRewardsResponse = {
    /**
     * Queried wallet address.
     */
    wallet: string;
    /**
     * Settled plus unsettled claimable rewards, as a hex quantity.
     */
    totalAmountLythoshi: string;
    /**
     * Wallet-level pending reward already settled in storage.
     */
    settledPendingLythoshi: string;
    /**
     * Sum of per-cluster unsettled reward-index deltas.
     */
    unsettledAmountLythoshi: string;
    /**
     * Whether this wallet has auto-compounding enabled.
     */
    autoCompound: boolean;
    /**
     * Per-cluster unsettled rows.
     */
    rows: Array<PendingRewardsRow>;
    /**
     * Block selector echoed by the node.
     */
    block: unknown;
};

/**
 * One ticket in `lyth_redemptionQueue`.
 */
type RedemptionQueueTicket = {
    /**
     * Stable queue index for this wallet.
     */
    index: bigint;
    /**
     * Cluster id whose delegation weight is redeeming.
     */
    cluster: number;
    /**
     * Redeeming delegation weight in basis points.
     */
    weightBps: number;
    /**
     * Block height where the ticket was queued.
     */
    createdHeight: bigint;
    /**
     * Block height where the cooldown matures.
     */
    maturityHeight: bigint;
    /**
     * Whether the ticket is mature at the queried block, or `null`
     * when the selector does not resolve to a height.
     */
    mature: boolean | null;
};

/**
 * `lyth_redemptionQueue` response.
 */
type RedemptionQueueResponse = {
    /**
     * Queried wallet address.
     */
    wallet: string;
    /**
     * Bounded wallet redemption tickets returned by the node.
     */
    tickets: Array<RedemptionQueueTicket>;
    /**
     * Total ticket count stored for the wallet.
     */
    count: bigint;
    /**
     * Number of decoded tickets returned.
     */
    returned: number;
    /**
     * Block selector echoed by the node.
     */
    block: unknown;
};

/**
 * `lyth_getAccountPolicy` response.
 */
type AccountPolicy = {
    /**
     * Policy mode label — `"public"`, `"stealth"`, `"confidential"`,
     * `"shielded"`.
     */
    mode: string;
    /**
     * Whether the account accepts shielded transfers.
     */
    allowShielded: boolean;
    /**
     * Whether the account accepts confidential transfers.
     */
    allowConfidential: boolean;
    /**
     * Whether the account accepts stealth payments.
     */
    acceptStealth: boolean;
    /**
     * Whether the account requires originator proof.
     */
    requireOriginatorProof: boolean;
    /**
     * Whether the account requires allowlist proof.
     */
    requireAllowlistProof: boolean;
    /**
     * Raw flag word, `0x`-hex two-digit byte.
     */
    flags: string;
    /**
     * `true` when the account has explicitly set policy bits.
     */
    explicit: boolean;
};

/**
 * Account proof envelope returned by `eth_getBalance` /
 * `eth_getStorageAt` / `lyth_registryStateProof`.
 *
 * `value` is the raw quantity (or 32-byte word for storage) as returned
 * by the chain. `state_root` is the trie root the proof is verified
 * against. `proof` is `null` when the chain provider could not produce
 * an inclusion proof for this slot at the requested block.
 */
type AccountProofResponse = {
    /**
     * `0x`-hex value (balance, storage word, or peer id depending on
     * the calling method).
     */
    value: string;
    /**
     * State-root hex the proof verifies against.
     */
    state_root: string;
    /**
     * Block height the proof was generated against.
     */
    block_number: bigint;
    /**
     * Inclusion proof envelope, omitted when the chain didn't produce
     * one. The shape is intentionally opaque at this layer — callers
     * that need to verify the proof bring an internal state crate in
     * directly.
     */
    proof?: unknown | null;
};

/**
 * Retention metadata returned by `lyth_addressActivityKind` for
 * pruned address activity windows.
 */
type AddressActivityArchiveRedirect = {
    /**
     * Human-readable archival hint supplied by the node.
     */
    hint: string;
};

/**
 * One row in `lyth_getAddressActivity`.
 */
type AddressActivityEntry = {
    /**
     * Block height the event landed in.
     */
    blockHeight: bigint;
    /**
     * Tx index within the block.
     */
    txIndex: number;
    /**
     * Log index within the tx.
     */
    logIndex: number;
    /**
     * Source kind: transfer, swap, staking, or delegation.
     */
    kind: string;
    /**
     * Direction relative to the queried address, when directional.
     */
    direction: string | null;
    /**
     * Counterparty address for directional value movement.
     */
    counterparty: string | null;
    /**
     * 32-byte token id when the event involves a token.
     */
    tokenId: string | null;
    /**
     * Decimal-string amount when the event has an amount.
     */
    amount: string | null;
    /**
     * Cluster id when the event involves a cluster.
     */
    cluster: number | null;
    /**
     * Delegation weight in basis points.
     */
    weightBps: number | null;
    /**
     * Kind-specific sub-label such as delegated, unstake, or stake.
     */
    subKind: string | null;
};

/**
 * Retention bounds returned by `lyth_addressActivityKind`.
 */
type AddressActivityKindRetention = {
    /**
     * Earliest retained block for indexed activity.
     */
    earliestRetained: bigint;
    /**
     * Optional archive redirect hint.
     */
    archiveRedirect?: AddressActivityArchiveRedirect;
};

/**
 * `lyth_addressActivityKind` response.
 */
type AddressActivityKindResponse = {
    /**
     * Response schema version.
     */
    schemaVersion: number;
    /**
     * Queried address.
     */
    address: string;
    /**
     * `found`, `not_found`, `indexer_disabled`, `pruned`, `private`,
     * or a forward-compatible node-supplied string.
     */
    kind: string;
    /**
     * Retention metadata when the activity window was pruned.
     */
    retention?: AddressActivityKindRetention;
};

/**
 * Address-label row surfaced by `lyth_getAddressLabel`.
 */
type AddressLabelRecord = {
    /**
     * Labeled address.
     */
    address: string;
    /**
     * Lowercase category name, e.g. `foundation`, `exchange`,
     * `bridge`, `treasury`, `contract`, or `operator`.
     */
    category: string;
    /**
     * Optional human-readable display name.
     */
    displayName: string | null;
    /**
     * Block height the label was last asserted at.
     */
    updatedAtBlock: bigint;
};

/**
 * `lyth_getAssetPolicy` response.
 */
type AssetPolicy = {
    /**
     * Policy mode label.
     */
    mode: string;
    /**
     * Whether the asset allows shielded transfers.
     */
    allowShielded: boolean;
    /**
     * Whether the asset allows confidential transfers.
     */
    allowConfidential: boolean;
    /**
     * Whether the asset allows stealth transfers.
     */
    allowStealth: boolean;
    /**
     * Whether the asset allows transparent transfers.
     */
    allowTransparent: boolean;
    /**
     * KYC requirement bit.
     */
    requireKyc: boolean;
    /**
     * Raw levels byte, `0x`-hex two-digit.
     */
    levels: string;
    /**
     * `true` when the asset has explicitly set policy.
     */
    explicit: boolean;
};

/**
 * Block header surfaced via `eth_getBlockByNumber` / `eth_getBlockByHash`.
 *
 * The v4.1 SDK shape exposes execution-unit terminology. Legacy node
 * payloads that still return `gas_used` / `gas_limit` decode through
 * serde aliases so callers can upgrade the SDK before every node RPC
 * response has been regenerated.
 */
type BlockHeader = {
    /**
     * Block number (height).
     */
    number: bigint;
    /**
     * Block hash (32 bytes hex).
     */
    hash: string;
    /**
     * Parent block hash.
     */
    parent_hash: string;
    /**
     * State-root commitment.
     */
    state_root: string;
    /**
     * UNIX seconds.
     */
    timestamp: bigint;
    /**
     * Total execution units consumed.
     */
    executionUnitsUsed: bigint;
    /**
     * Block execution-unit limit.
     */
    executionUnitLimit: bigint;
};

/**
 * JSON-RPC block tag. Use [`BlockSelector`] when sending to the wire; passive
 * compatibility reads still use the `eth_*` block-argument shape.
 */
type BlockTag = "latest" | "earliest" | "finalized" | "safe" | "pending";

/**
 * BLS aggregate certificate response used by the AUD-0074 certificate RPCs.
 */
type BlsCertificateResponse = {
    /**
     * Round at which the certificate sealed.
     */
    round: bigint;
    /**
     * `0x`-prefixed aggregate BLS signature.
     */
    signature: string;
    /**
     * Signer-set bitmap as `0x`-hex bytes.
     */
    signers_bitmap: string;
    /**
     * Operator indices decoded from the signer bitmap.
     */
    signer_indices: Array<number>;
    /**
     * Number of signing operators.
     */
    signer_count: number;
};

/**
 * One entry in the `lyth_capabilities` keyed capability map.
 */
type CapabilityDescriptor = {
    /**
     * 20-byte precompile address, `0x`-hex.
     */
    address: string;
    /**
     * Stable capability id from the milestone registry.
     */
    capabilityId: string;
    /**
     * Human-readable capability/precompile name.
     */
    capabilityName: string;
    /**
     * Gate class: `gateable`, `non-gateable`, or `retired-rejecting`.
     */
    kind: string;
    /**
     * Whether the capability is currently dispatchable.
     */
    active: boolean;
    /**
     * Height of the milestone that activated this capability, when any.
     */
    activationHeight: bigint | null;
};

/**
 * MRV forwarder deployment row for a native module surfaced by `lyth_capabilities`.
 */
type NativeModuleForwarderDescriptor = {
    /**
     * Native module namespace this forwarder calls, for example `"market"`.
     */
    module: string;
    /**
     * Byte length of the encoded forwarder request.
     */
    requestBytes: number;
    /**
     * Typed MRV contract address hosting the forwarder.
     */
    contractAddress: string;
    /**
     * MRV artifact profile used by the deployed forwarder.
     */
    artifactProfile: string;
    /**
     * Deployment/readiness status reported by the node.
     */
    status: string;
    /**
     * Whether the deployment has been verified against the expected artifact.
     */
    deploymentVerified: boolean;
};

/**
 * `lyth_capabilities` response.
 */
type CapabilitiesResponse = {
    /**
     * Block height sampled by the node.
     */
    blockNumber: bigint;
    /**
     * Address-keyed capability map.
     */
    capabilities: {
        [key in string]?: CapabilityDescriptor;
    };
    /**
     * Native module forwarder deployments keyed by native module name.
     */
    nativeModuleForwarders: {
        [key in string]?: Array<NativeModuleForwarderDescriptor>;
    };
};

/**
 * One signature row in `lyth_getLatestCheckpoint`.
 */
type CheckpointRecord = {
    /**
     * Block height the checkpoint commits to.
     */
    blockHeight: bigint;
    /**
     * State-root commitment at the checkpointed block.
     */
    stateRoot: string;
    /**
     * Hex-encoded ML-DSA-65 signer public key.
     */
    signerPubkeyHex: string;
    /**
     * Hex-encoded ML-DSA-65 signature.
     */
    signatureHex: string;
};

/**
 * `lyth_getClusterDelegators` response.
 */
type ClusterDelegatorsResponse = {
    /**
     * Queried cluster id.
     */
    cluster: number;
    /**
     * Delegator wallet addresses.
     */
    delegators: Array<string>;
    /**
     * Number of delegator slots scanned by the node.
     */
    count: number;
    /**
     * Block selector echoed by the node.
     */
    block: unknown;
};

/**
 * `lyth_getClusterEntity` response.
 */
type ClusterEntityResponse = {
    /**
     * Queried cluster id.
     */
    cluster: number;
    /**
     * Entity label, e.g. `"independent"` or `"mono-labs"`.
     */
    entity: string;
    /**
     * Raw entity enum discriminant.
     */
    entityCode: number;
    /**
     * Block selector echoed by the node.
     */
    block: unknown;
};

/**
 * One row from `lyth_getClusterResignations`.
 */
type ClusterResignationRow = {
    /**
     * `0x`-prefixed 48-byte BLS-G1 operator public key.
     */
    operator: string;
    /**
     * `wire_pending`, `pending`, or `applied`.
     */
    status: string;
    /**
     * Submitted-at block height, absent for wire-pending rows.
     */
    submitted_at_height?: bigint;
    /**
     * Effective-at block height, absent for wire-pending rows.
     */
    effective_at_height?: bigint;
    /**
     * Operator-set resignation nonce.
     */
    nonce: bigint;
    /**
     * Whether the expedited path was honored.
     */
    expedited: boolean;
};

/**
 * `lyth_getClusterResignations` response.
 */
type ClusterResignationsResponse = {
    /**
     * Rows matching the requested filter.
     */
    rows: Array<ClusterResignationRow>;
};

/**
 * Parent vertex row returned by `lyth_dagParents`.
 */
type DagParent = {
    /**
     * Parent vertex hash.
     */
    vertexHash: string;
    /**
     * Parent round.
     */
    round: bigint;
};

/**
 * `lyth_dagParents` response.
 */
type DagParentsResponse = {
    /**
     * Response schema version.
     */
    schemaVersion: number;
    /**
     * Queried round.
     */
    round: bigint;
    /**
     * Parent rows, or `null` when the round has no retained DAG data.
     */
    parents: Array<DagParent> | null;
};

/**
 * `lyth_syncStatus` DAG-sync driver snapshot.
 */
type DagSyncStatus = {
    /**
     * Driver state: `idle`, `probing`, `catching`, or `synced`.
     */
    state: string;
    /**
     * Local anchor frontier round.
     */
    localRound: bigint;
    /**
     * Highest peer committed round observed.
     */
    peerMaxRound: bigint;
    /**
     * `peerMaxRound - localRound`, saturating at zero.
     */
    lag: bigint;
};

/**
 * Transaction extension descriptor included in `lyth_decodeTx`.
 */
type DecodeTxExtension = {
    /**
     * Extension kind byte as a number.
     */
    kind: number;
    /**
     * Extension kind byte as `0x`-hex.
     */
    kindHex: string;
    /**
     * Extension body bytes as `0x`-hex.
     */
    bodyHex: string;
    /**
     * Alias of `bodyHex` emitted by `mono-core` for explorer consumers.
     */
    body: string;
};

/**
 * Log row included in `lyth_decodeTx`.
 */
type DecodeTxLog = {
    /**
     * Contract address that emitted the log.
     */
    address: string;
    /**
     * Indexed topics.
     */
    topics: Array<string>;
    /**
     * ABI-encoded log data.
     */
    data: string;
};

/**
 * PQ-finality attestation included in `lyth_decodeTx` when available.
 */
type DecodeTxPqAttestation = {
    /**
     * Checkpoint height that attests the transaction.
     */
    checkpointHeight: bigint;
    /**
     * Checkpointed state root.
     */
    stateRoot: string;
    /**
     * Signer id that produced the attestation.
     */
    signerId: string;
    /**
     * Scheme-prefixed signer signature.
     */
    signature: string;
};

/**
 * Structured native fee object attached to a RISC-V/native receipt.
 */
type NativeReceiptFee$1 = {
    /**
     * Total fee in lythoshi.
     */
    total_lythoshi: string;
    /**
     * Optional total fee formatted as LYTH numeric text without the unit suffix.
     */
    total_lyth?: string;
    /**
     * Execution cycles charged by the receipt.
     */
    cycles_used: bigint;
    /**
     * Base price per execution cycle in lythoshi.
     */
    base_price_per_cycle_lythoshi: string;
    /**
     * Authenticated state I/O units charged by the receipt.
     */
    state_io_units: bigint;
    /**
     * State I/O unit price in lythoshi.
     */
    state_io_price_per_unit_lythoshi: string;
    /**
     * Priority tip in lythoshi.
     */
    priority_tip_lythoshi: string;
};

/**
 * `lyth_decodeTx` response.
 */
type DecodeTxResponse = {
    /**
     * Transaction hash.
     */
    txHash: string;
    /**
     * Containing block hash.
     */
    blockHash: string;
    /**
     * Containing block number.
     */
    blockNumber: bigint;
    /**
     * Transaction index within the block.
     */
    txIndex: number;
    /**
     * Sender address.
     */
    from: string;
    /**
     * Recipient address, or `null` for contract creation.
     */
    to: string | null;
    /**
     * Transferred native value as a hex lythoshi quantity.
     */
    value: string;
    /**
     * Sender nonce.
     */
    nonce: bigint;
    /**
     * Execution-unit limit.
     */
    executionUnitLimit: bigint;
    /**
     * Max execution fee in lythoshi.
     */
    maxExecutionFeeLythoshi: string;
    /**
     * Priority tip in lythoshi.
     */
    priorityTipLythoshi: string;
    /**
     * Execution units used when the transaction is confirmed.
     */
    executionUnitsUsed: bigint | null;
    /**
     * Structured native fee summary.
     */
    fee: NativeReceiptFee$1;
    /**
     * Opaque decoded calldata descriptor.
     */
    decodedCalldata: unknown | null;
    /**
     * Optional memo extracted from the transaction.
     */
    memo: string | null;
    /**
     * Signed transaction extensions carried by the decoded transaction.
     */
    extensions: Array<DecodeTxExtension>;
    /**
     * DAG round associated with finality, when available.
     */
    round: bigint | null;
    /**
     * Cluster id associated with finality, when available.
     */
    clusterId: number | null;
    /**
     * Opaque BLS attestation payload.
     */
    blsAttestation: unknown | null;
    /**
     * PQ-finality attestation payload.
     */
    pqAttestation: DecodeTxPqAttestation | null;
    /**
     * Opaque finality proof payload.
     */
    finalityProof: unknown | null;
    /**
     * Logs emitted by the transaction.
     */
    logs: Array<DecodeTxLog>;
    /**
     * `success`, `reverted`, `unknown`, or a forward-compatible string.
     */
    status: string;
    /**
     * Node-supplied execution error code when available.
     */
    errorCode: string | null;
};

/**
 * `lyth_getDelegationCap` response.
 */
type DelegationCapResponse = {
    /**
     * Per-cluster cap in basis points. `u32::MAX` means disabled.
     */
    capBps: number;
    /**
     * Height of the most recent milestone that changed the cap.
     */
    lastChangedAtHeight: bigint;
    /**
     * Block height sampled by the node.
     */
    blockNumber: bigint;
};

/**
 * Per-wallet delegation event row surfaced by `lyth_getDelegationHistory`.
 */
type DelegationHistoryRecord = {
    /**
     * Block height the event landed in.
     */
    blockHeight: bigint;
    /**
     * Tx index within the block.
     */
    txIndex: number;
    /**
     * Log index within the tx.
     */
    logIndex: number;
    /**
     * Wallet that performed the delegation move.
     */
    wallet: string;
    /**
     * Source or only cluster id.
     */
    cluster: number;
    /**
     * Destination cluster id for redelegations.
     */
    toCluster: number | null;
    /**
     * Event kind: `delegated`, `undelegated`, or `redelegated`.
     */
    kind: string;
    /**
     * Weight moved in basis points.
     */
    weightBps: number;
    /**
     * Wallet total committed weight after the event when known.
     */
    walletTotalBps: number | null;
};

/**
 * One delegation row in `lyth_getDelegations`.
 */
type DelegationRow = {
    /**
     * Cluster id receiving the delegated weight.
     */
    cluster: number;
    /**
     * Delegated weight in basis points.
     */
    weightBps: number;
};

/**
 * `lyth_getDelegations` response.
 */
type DelegationsResponse = {
    /**
     * Queried wallet address.
     */
    wallet: string;
    /**
     * Per-cluster delegation rows.
     */
    rows: Array<DelegationRow>;
    /**
     * Sum of row weights.
     */
    totalBps: number;
    /**
     * Block selector echoed by the node.
     */
    block: unknown;
};

/**
 * `lyth_getEncryptionKey` response.
 */
type EncryptionKeyResponse = {
    /**
     * KEM algorithm tag.
     */
    algo: string;
    /**
     * Cluster encryption epoch.
     */
    epoch: bigint;
    /**
     * ML-KEM-768 encapsulation key.
     */
    encapsulationKey: string;
};

/**
 * `lyth_getEntityRatchet` response.
 */
type EntityRatchetResponse = {
    /**
     * Active foundation-entity cluster count.
     */
    active: number;
    /**
     * Published ratchet threshold. `u32::MAX` means unset.
     */
    threshold: number;
    /**
     * Block selector echoed by the node.
     */
    block: unknown;
};

/**
 * `eth_feeHistory` response.
 */
type FeeHistoryResponse = {
    /**
     * Hex height of the first block in the window.
     */
    oldestBlock: string;
    /**
     * `N+1` base-fee values (one per block, plus the next-block prediction).
     */
    baseFeePerGas: Array<string>;
    /**
     * `N` `gas_used / gas_limit` ratios.
     */
    gasUsedRatio: Array<number>;
    /**
     * `N × len(percentiles)` 2D priority-fee approximations. Empty when
     * caller did not request percentiles.
     */
    reward: Array<Array<string>>;
};

/**
 * Requested block range in `lyth_gapRecords`.
 */
type GapRange = {
    /**
     * First block in the requested range.
     */
    fromBlock: bigint;
    /**
     * Last block in the requested range.
     */
    toBlock: bigint;
};

/**
 * One retained ingestion/indexing gap.
 */
type GapRecord = {
    /**
     * First block in the gap.
     */
    startBlock: bigint;
    /**
     * Last block in the gap.
     */
    endBlock: bigint;
    /**
     * Number of blocks in the gap.
     */
    blockCount: bigint;
    /**
     * Start timestamp in UNIX seconds.
     */
    startTimestamp: bigint;
    /**
     * End timestamp in UNIX seconds.
     */
    endTimestamp: bigint;
    /**
     * Duration in seconds.
     */
    durationSeconds: bigint;
    /**
     * Node-supplied reason label.
     */
    reason: string;
};

/**
 * `lyth_gapRecords` response.
 */
type GapRecordsResponse = {
    /**
     * Response schema version.
     */
    schemaVersion: number;
    /**
     * Requested range.
     */
    range: GapRange;
    /**
     * Gap rows in the requested range.
     */
    gapRecords: Array<GapRecord>;
};

/**
 * `lyth_indexerStatus` envelope. `null` on the wire surfaces as
 * `Option::None` here.
 */
type IndexerStatus = {
    /**
     * Highest block fully ingested.
     */
    currentHeight: bigint;
    /**
     * Highest block observed.
     */
    latestHeight?: bigint;
    /**
     * Active schema version.
     */
    schemaVersion: number;
};

/**
 * `lyth_mempoolStatus` aggregate.
 */
type MempoolSnapshot = {
    /**
     * Tx count in the Ready bucket.
     */
    count_ready: bigint;
    /**
     * Tx count in the Pending bucket.
     */
    count_pending: bigint;
    /**
     * Mailbox depth gauge.
     */
    mailbox_depth: bigint;
    /**
     * Bytes held per tx class.
     */
    bytes_by_class: [bigint, bigint, bigint, bigint, bigint, bigint, bigint];
};

/**
 * `mesh_decodeTx` response.
 */
type MeshDecodedTx = {
    /**
     * Chain id as a hex quantity.
     */
    chain_id: string;
    /**
     * Nonce as a hex quantity.
     */
    nonce: string;
    /**
     * Max priority fee per gas as a decimal string.
     */
    max_priority_fee_per_gas: string;
    /**
     * Max fee per gas as a decimal string.
     */
    max_fee_per_gas: string;
    /**
     * Gas limit as a JSON number.
     */
    gas_limit: bigint;
    /**
     * Recipient address, or null for contract creation.
     */
    to: string | null;
    /**
     * Value as a decimal string.
     */
    value: string;
    /**
     * Input/calldata hex.
     */
    input: string;
    /**
     * Present when decoding an unsigned transaction.
     */
    sighash?: string;
    /**
     * Present when decoding a signed transaction.
     */
    from?: string;
    /**
     * Present when decoding a signed transaction.
     */
    tx_hash?: string;
};

/**
 * `mesh_combineTx` response.
 */
type MeshSignedTxResponse = {
    /**
     * `0x`-hex bincode signed transaction envelope.
     */
    signed_tx: string;
};

/**
 * Intent accepted by `mesh_buildUnsignedTx`.
 */
type MeshTxIntent = {
    /**
     * Sender nonce, hex or decimal string.
     */
    nonce: string;
    /**
     * EIP-1559 max fee per gas, hex or decimal string.
     */
    max_fee_per_gas: string;
    /**
     * EIP-1559 max priority fee per gas, hex or decimal string.
     */
    max_priority_fee_per_gas: string;
    /**
     * Gas limit, hex or decimal string.
     */
    gas_limit: string;
    /**
     * Recipient address. `None` means contract creation.
     */
    to?: string;
    /**
     * Value, hex or decimal string.
     */
    value?: string;
    /**
     * Input/calldata hex.
     */
    input?: string;
    /**
     * Optional chain id override, hex or decimal string.
     */
    chain_id?: string;
};

/**
 * `mesh_buildUnsignedTx` response.
 */
type MeshUnsignedTxResponse = {
    /**
     * `0x`-hex bincode unsigned transaction envelope.
     */
    unsigned_tx: string;
    /**
     * `0x`-hex signing hash for the wallet.
     */
    sighash: string;
};

/**
 * `debug_p2pPeers` entry.
 */
type PeerSummary = {
    /**
     * libp2p peer id (base58).
     */
    peerId: string;
    /**
     * Declared role.
     */
    role: string;
    /**
     * Listen addresses.
     */
    listenAddrs: Array<string>;
    /**
     * `agent_version` from libp2p identify.
     */
    agentVersion: string;
    /**
     * Reputation score.
     */
    score: number;
    /**
     * Whether the peer is in any gossip mesh.
     */
    inMesh: boolean;
};

/**
 * `lyth_mempoolPending` per-tx entry.
 */
type PendingTxSummary = {
    /**
     * Tx hash.
     */
    txHash: string;
    /**
     * Sender nonce of this transaction.
     */
    nonce: bigint;
    /**
     * Class index (0..=6).
     */
    class: number;
    /**
     * Wire size in bytes.
     */
    wireBytesLen: number;
    /**
     * `true` if parked in the ready bucket.
     */
    ready: boolean;
};

/**
 * `lyth_listActivePrecompiles` entry.
 */
type PrecompileDescriptor = {
    /**
     * 20-byte precompile address, `0x`-hex.
     */
    address: string;
    /**
     * Stable identifier (e.g. `"agent"`, `"oracle"`, `"delegation"`).
     */
    name: string;
    /**
     * Whether milestone gates can toggle this precompile.
     */
    gateable: boolean;
    /**
     * Whether the precompile is currently dispatchable.
     */
    enabled: boolean;
    /**
     * Stable capability id from the milestone registry.
     */
    capabilityId: string;
    /**
     * Height of the milestone that activated this capability, when any.
     */
    activationHeight: bigint | null;
};

/**
 * `lyth_listProviders` / `lyth_getRegistration` record.
 */
type RegistryRecord = {
    /**
     * libp2p peer id, `0x`-hex 32-byte.
     */
    peerId: string;
    /**
     * Capability bitmask.
     */
    capabilities: number;
    /**
     * Primary external endpoint URL.
     */
    endpoint: string;
    /**
     * Current bond, hex quantity.
     */
    bond: string;
    /**
     * Uptime in basis points (0..=10_000).
     */
    uptimeBps: number;
};

/**
 * `lyth_richList` response.
 */
type RichListResponse = {
    /**
     * Response schema version.
     */
    schemaVersion: number;
    /**
     * Queried token id.
     */
    tokenId: string;
    /**
     * Result limit applied by the node.
     */
    limit: number;
    /**
     * Holder rows.
     */
    holders: Array<RichListHolder>;
};

/**
 * `lyth_currentRound` round shape.
 */
type RoundInfo = {
    /**
     * Latest committed height.
     */
    height: bigint;
};

/**
 * `lyth_getStorageProof` batch response.
 */
type StorageProofBatch = {
    /**
     * State-root the proofs verify against.
     */
    stateRoot: string;
    /**
     * Block height the proofs were generated against.
     */
    blockNumber: bigint;
    /**
     * One opaque proof envelope per requested slot.
     */
    proofs: unknown[];
};

/**
 * `eth_syncing` response when the node is mid-sync. Returns `false`
 * when the node is caught up — the SDK surfaces that as
 * `Option::None`.
 */
type SyncStatus = {
    /**
     * First block of the current sync batch.
     */
    startingBlock: string;
    /**
     * Last block applied locally.
     */
    currentBlock: string;
    /**
     * Highest block advertised by peers.
     */
    highestBlock: string;
};

/**
 * Native MRC identity attached to a token-balance row.
 */
type TokenBalanceMrcIdentity = {
    /**
     * MRC standard, currently `mrc20`, `mrc721`, `mrc1155`, or `mrc4626`.
     */
    standard: string;
    /**
     * MRC asset id, collection id, or MRC-4626 vault id.
     */
    assetId: string;
    /**
     * Token id inside the collection for MRC-721/MRC-1155 rows; `null` for MRC-20/MRC-4626.
     */
    tokenId?: string | null;
};

/**
 * Per-asset balance row surfaced by `lyth_getTokenBalances`.
 */
type TokenBalanceRecord = {
    /**
     * 32-byte token id, `0x`-hex.
     */
    tokenId: string;
    /**
     * Balance as a decimal string.
     */
    balance: string;
    /**
     * Block height the balance was last observed at.
     */
    updatedAtBlock: bigint;
    /**
     * Native MRC identity, when the balance came from a native MRC row.
     */
    mrc?: TokenBalanceMrcIdentity | null;
    /**
     * Optional single bridge route disclosure associated with this asset row.
     */
    bridgeRouteDisclosure?: BridgeRouteDisclosure | null;
    /**
     * Optional bridge route disclosures associated with this asset row.
     */
    bridgeRouteDisclosures?: BridgeRouteDisclosure[] | null;
};

/**
 * `lyth_getTpmAttestation` response.
 */
type TpmAttestationResponse = {
    /**
     * 32-byte peer id.
     */
    peerId: string;
    /**
     * 32-byte digest over the canonical TPM quote bytes.
     */
    quoteDigest: string;
    /**
     * 32-byte EK identifier.
     */
    ekId: string;
    /**
     * Block selector echoed by the node.
     */
    block: unknown;
};

/**
 * Receipt for a confirmed transaction.
 */
type TransactionReceipt = {
    /**
     * Transaction hash.
     */
    tx_hash: string;
    /**
     * Block hash that contains the transaction.
     */
    block_hash: string;
    /**
     * Block height that contains the transaction.
     */
    block_number: bigint;
    /**
     * Transaction index within the block.
     */
    tx_index: number;
    /**
     * `1` on success, `0` on revert.
     */
    status: number;
    /**
     * Execution units consumed by this transaction.
     */
    executionUnitsUsed: bigint;
};

/**
 * Ethereum-shaped transaction view returned by `eth_getTransactionByHash`.
 */
type TransactionView = {
    /**
     * Transaction hash.
     */
    hash: string;
    /**
     * Block hash that contains the transaction.
     */
    blockHash: string;
    /**
     * Block height as a hex quantity.
     */
    blockNumber: string;
    /**
     * Transaction index as a hex quantity.
     */
    transactionIndex: string;
    /**
     * Sender address.
     */
    from: string;
    /**
     * Recipient address, or `null` for contract creation.
     */
    to: string | null;
    /**
     * Sender nonce as a hex quantity.
     */
    nonce: string;
    /**
     * Transferred value as a hex quantity.
     */
    value: string;
    /**
     * Gas limit as a hex quantity.
     */
    gas: string;
    /**
     * EIP-1559 max fee per gas as a hex quantity.
     */
    maxFeePerGas: string;
    /**
     * EIP-1559 max priority fee per gas as a hex quantity.
     */
    maxPriorityFeePerGas: string;
    /**
     * Calldata or deployment bytecode.
     */
    input: string;
    /**
     * EIP-2718 transaction type. `mono-core` currently renders `"0x2"`.
     */
    type: string;
    /**
     * Chain id as a hex quantity.
     */
    chainId: string;
};

/**
 * Wire-shape types served by a `mono-core` node.
 *
 * Re-exports the `ts-rs`-generated definitions in `./bindings/`. Those
 * files are the authoritative source — they are written from Rust by
 * `cargo test --features ts-bindings` and copied into this package via
 * `pnpm run build:bindings` / `bash scripts/sync-bindings.sh`.
 *
 * Quantities (`u64` etc.) surface as `bigint` to preserve full
 * precision against the chain's 256-bit world. Hashes / addresses /
 * `0x`-hex byte vectors surface as `string`.
 */

/** `0x`-prefixed hex byte vector. */
type Hex = string;
/** `0x`-prefixed hex 20-byte address. */
type Address = string;
/** `0x`-prefixed hex 32-byte hash. */
type Hash = string;
/** `0x`-prefixed hex unsigned quantity. */
type Quantity = string;

/**
 * Block selector for `eth_getBlock*`, `eth_call`, etc. — accepts a tag,
 * a numeric height (encoded by the client as `0x`-hex), a `bigint`, or
 * a 32-byte hash where the spec allows it.
 */
type BlockSelector = BlockTag | number | bigint | Hash;
/** Encode a `BlockSelector` for a JSON-RPC params array. */
declare function encodeBlockSelector(b: BlockSelector): string;

declare const NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC: "nativeMarketOrderBook";
declare const API_STREAM_TOPICS: readonly ["newHeads", "newPendingTx", "logs", "newCommit", "dagVertices", "registry", "marketTrades", "nativeMarketOrderBook", "gapRecords", "nativeEvents"];
type ApiStreamTopic = (typeof API_STREAM_TOPICS)[number];
type NativeMarketOrderBookStreamAction = "upsert" | "remove";
type NativeMarketOrderBookDelta = NativeMarketOrderBookStreamPayload;
interface NativeMarketOrderBookStreamPayload {
    marketId: string;
    orderId: string;
    relatedOrderId?: string;
    eventName: string;
    action: NativeMarketOrderBookStreamAction;
    side?: string;
    price?: string;
    quantity?: string;
    remaining?: string;
    status?: string;
    blockHeight: number;
    txIndex: number;
    logIndex: number;
}
interface NativeMarketOrderBookDeltasRequest {
    fromBlock: number | bigint | string;
    toBlock: number | bigint | string;
    limit?: number | bigint | string | null;
    cursor?: string | null;
    txIndex?: number | bigint | string | null;
    logIndex?: number | bigint | string | null;
    address?: string | null;
    eventTopic?: string | null;
    eventName?: string | null;
    marketId?: string | null;
    listingId?: string | null;
    primaryId?: string | null;
    relatedId?: string | null;
    tokenId?: string | null;
    account?: string | null;
    counterparty?: string | null;
}
interface NativeMarketOrderBookDeltasResponseFilters {
    family?: "market" | string | null;
    txIndex?: number | null;
    logIndex?: number | null;
    address?: string | null;
    eventTopic?: string | null;
    eventName?: string | null;
    marketId?: string | null;
    listingId?: string | null;
    primaryId?: string | null;
    relatedId?: string | null;
    tokenId?: string | null;
    account?: string | null;
    counterparty?: string | null;
}
interface NativeMarketOrderBookDeltasSource {
    indexerProvider: string;
    projection: "native_market_orderbook_deltas" | string;
    historyApi: "lyth_nativeMarketEvents" | string;
    [key: string]: unknown;
}
interface NativeMarketOrderBookDeltasResponse {
    schemaVersion: number;
    fromBlock: number;
    toBlock: number;
    limit: number | null;
    cursor: string | null;
    nextCursor: string | null;
    filters: NativeMarketOrderBookDeltasResponseFilters;
    replay: true;
    streamTopic: typeof NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC;
    deltas: NativeMarketOrderBookDelta[];
    source: NativeMarketOrderBookDeltasSource;
}
interface ApiStreamTopicRetention {
    kind: "live_broadcast" | string;
    replay?: boolean;
    historyApis?: string[];
    [key: string]: unknown;
}
interface ApiStreamTopicMetadata<TTopic extends string = ApiStreamTopic | string> {
    topic: TTopic;
    endpoint: string;
    description?: string;
    shape?: string;
    source?: string;
    queryFilters?: string[];
    retention?: ApiStreamTopicRetention;
}
interface ApiStreamsIndexResponse {
    schemaVersion: number;
    chainId: number;
    transport: "sse" | string;
    keepAliveSeconds: number;
    perConnectionMailbox?: number;
    topics: ApiStreamTopicMetadata[];
}
declare function isNativeMarketOrderBookStreamPayload(value: unknown): value is NativeMarketOrderBookStreamPayload;
declare function assertNativeMarketOrderBookStreamPayload(value: unknown): asserts value is NativeMarketOrderBookStreamPayload;
declare function decodeNativeMarketOrderBookDeltasResponse(value: unknown): NativeMarketOrderBookDeltasResponse;

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
    /** GPU prover — may bid on + serve the GPU prover market (MB-4, bit 9). */
    readonly SERVES_GPU_PROVE: 512;
};
/** Maximum basis-point value for any PF-6 diversity term / the headline score. */
declare const DIVERSITY_SCORE_MAX = 10000;
/** BLAKE3 multisig address-derivation domain (cluster-anchor preimage, MB-5). */
declare const MULTISIG_ADDRESS_DERIVATION_DOMAIN: "MONO_MULTISIG_BLAKE3_20_V1";
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
    /** `setNetworkMetadata(bytes32,uint16,bytes3,bytes)` — owner-callable (PF-6). */
    readonly setNetworkMetadata: string;
    /** `getOperatorNetworkMetadata(bytes32)` view (PF-6). */
    readonly getOperatorNetworkMetadata: string;
    /** `getClusterDiversity(uint32)` view (PF-6). */
    readonly getClusterDiversity: string;
};
/** Canonical `ClusterFormed(uint32,uint64,address,bytes)` event topic0 (MB-5). */
declare const CLUSTER_FORMED_EVENT_SIG: "ClusterFormed(uint32,uint64,address,bytes)";
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
 * Hosting class an operator runs under (PF-6). Mirrors
 * `node-registry::registration::HostingClass`. Any byte outside `0..=2`
 * decodes to `cloud` (the least-diverse class).
 */
type NodeHostingClass = "bareMetal" | "coLocation" | "cloud";
/** Decode a hosting-class byte. Values outside `0..=2` → `cloud`. */
declare function nodeHostingClassFromByte(b: number): NodeHostingClass;
/** Encode a hosting class to its right-aligned `u8` enum byte. */
declare function nodeHostingClassToByte(c: NodeHostingClass): number;
/**
 * `lyth_getOperatorNetworkMetadata` view (PF-6). Mirrors the
 * `(uint16 asn, bytes3 geoRegion, uint8 hostingClass, bytes32
 * ipAddressHash, bytes32 pcrDigest)` return tuple. The raw IP never
 * lives on-chain — `ipAddressHash` is `keccak256(ipHint)`.
 */
interface OperatorNetworkMetadata {
    /** Autonomous-system number; `0` = not declared. */
    asn: number;
    /** ISO-3166-1 alpha-3 region as `0x` 3-byte hex; all-zero = not declared. */
    geoRegion: string;
    /** Declared hosting class. */
    hostingClass: NodeHostingClass;
    /** `keccak256` of the operator's public IP (`0x` 32 bytes). */
    ipAddressHash: string;
    /** `keccak256` of the TPM PCR digest (`0x` 32 bytes). */
    pcrDigest: string;
}
/**
 * `lyth_getClusterDiversity` view (PF-6). Mirrors the
 * `(uint16 score, uint16 asnVariance, uint16 geoVariance, uint16
 * hostingSpread)` return tuple. Every field is in `0..=10000` bps.
 */
interface ClusterDiversity {
    /** Headline diversity score (`0..=10000`). */
    score: number;
    /** Normalised ASN-distribution entropy (`0..=10000`). */
    asnVariance: number;
    /** Normalised country-distribution entropy (`0..=10000`). */
    geoVariance: number;
    /** Normalised hosting-class-distribution entropy (`0..=10000`). */
    hostingSpread: number;
}
/**
 * Decoded `ClusterFormed(uint32,uint64,address,bytes)` event (MB-5).
 * Mirrors `node-registry::events::CLUSTER_FORMED`.
 */
interface ClusterFormedEvent {
    /** Cluster identifier (indexed topic 1). */
    clusterId: number;
    /** Activation epoch (indexed topic 2). */
    effectiveEpoch: bigint;
    /** Primary anchor address (`0x` 20 bytes). */
    anchorAddress: string;
    /** Concatenated 48-byte compressed BLS pubkeys (`0x` hex). */
    operatorRoster: string;
}
/**
 * Decode a `getOperatorNetworkMetadata` return tuple — a flat 5-word
 * head: `(uint16 asn, bytes3 geoRegion, uint8 hostingClass, bytes32
 * ipAddressHash, bytes32 pcrDigest)`.
 */
declare function decodeOperatorNetworkMetadata(returnData: string | Uint8Array | readonly number[]): OperatorNetworkMetadata;
/**
 * Decode a `getClusterDiversity` return tuple — a flat 4-word head:
 * `(uint16 score, uint16 asnVariance, uint16 geoVariance, uint16
 * hostingSpread)`.
 */
declare function decodeClusterDiversity(returnData: string | Uint8Array | readonly number[]): ClusterDiversity;
/**
 * Decode a `ClusterFormed` log (MB-5) into a typed {@link ClusterFormedEvent}.
 *
 * `topics` is the log topic vector (`topic0`, indexed `clusterId`,
 * indexed `effectiveEpoch`); `data` is the non-indexed ABI payload
 * `(address anchorAddress, bytes operatorRoster)`.
 */
declare function decodeClusterFormedEvent(topics: readonly (string | Uint8Array | readonly number[])[], data: string | Uint8Array | readonly number[]): ClusterFormedEvent;
/**
 * Derive a runtime-formed cluster's primary-anchor address from its
 * operator roster (MB-5 / Law §7.13).
 *
 * Mirrors `node-registry::cluster_anchor::derive_cluster_anchor_address`:
 * the order-insensitive multisig rule `address = BLAKE3(
 * MONO_MULTISIG_BLAKE3_20_V1 || threshold_be16 ||
 * (member_len_be8 || member)*sorted)[..20]`. Returns the `0x`-prefixed
 * 20-byte address payload.
 */
declare function deriveClusterAnchorAddress(roster: readonly (string | Uint8Array | readonly number[])[], threshold: number): string;

/**
 * GPU prover-market precompile ABI helpers + read types (MB-4).
 *
 * Mirrors `mono-core/crates/precompiles/platform/prover-market`. The six
 * ops (`createRequest` / `submitBid` / `closeRequest` / `submitProof` /
 * `settle` / `slash`) all take a single `bytes` canonical payload; their
 * selectors are `keccak256(sig)[..4]`.
 *
 * Only the `createRequest` canonical payload is finalized on the chain
 * side today (`ProofRequest::encode_canonical`). The other five op
 * bodies land at the deferred runtime-wiring wave, so their canonical
 * payload encoders carry a `TODO(monolythium-vision)` below.
 */
declare const PROVER_MARKET_TENTATIVE_ADDRESS: "0x0000000000000000000000000000000000001110";
/** `SERVES_GPU_PROVE` capability bit (MB-4) — bit 9 of the node-registry field. */
declare const SERVES_GPU_PROVE: 512;
declare const PROVER_MARKET_SELECTORS: {
    readonly createRequest: string;
    readonly submitBid: string;
    readonly closeRequest: string;
    readonly submitProof: string;
    readonly settle: string;
    readonly slash: string;
};
declare const PROVER_MARKET_EVENT_SIGS: {
    readonly proofRequested: "ProofRequested(bytes32,address,bytes32,uint128,uint64)";
    readonly bidSubmitted: "BidSubmitted(bytes32,address,uint128)";
    readonly requestAssigned: "RequestAssigned(bytes32,address,uint128)";
    readonly proofSettled: "ProofSettled(bytes32,address,uint128,uint128)";
    readonly proverSlashed: "ProverSlashed(bytes32,address,uint16,bytes32)";
    readonly requestExpired: "RequestExpired(bytes32,address,uint128)";
};
/** `ProverSlashed` reason code: non-delivery past deadline. */
declare const PROVER_SLASH_REASON_NON_DELIVERY: 1024;
/** `ProverSlashed` reason code: bad proof. */
declare const PROVER_SLASH_REASON_BAD_PROOF: 1025;
declare const PROVER_MARKET_REQUEST_DOMAIN: "prover_market.request.v1";
declare const PROVER_MARKET_BID_DOMAIN: "prover_market.bid.v1";
declare const PROVER_MARKET_SUBMIT_DOMAIN: "prover_market.submit.v1";
/** State machine for a proof request (mirrors `ProverMarketState`). */
type ProverMarketState = "open" | "assigned" | "settled" | "slashed" | "expired";
/** Decode a `ProverMarketState` from its on-chain wire byte, or `null`. */
declare function proverMarketStateFromByte(b: number): ProverMarketState | null;
/** `lyth_getProofRequest` view of one proof-request record. */
interface ProofRequestView {
    /** Canonical request id (`0x` 32 bytes). */
    id: string;
    /** Buyer address (`0x` 20 bytes). */
    buyer: string;
    /** Verification-key hash the proof must satisfy (`0x` 32 bytes). */
    vkeyHash: string;
    /** Public-inputs commitment (`0x` 32 bytes). */
    inputsHash: string;
    /** Maximum fee escrowed (lythoshi decimal string). */
    maxFee: string;
    /** Deterministic Unix-seconds deadline. */
    deadline: bigint;
    /** Buyer-supplied uniqueness nonce. */
    nonce: bigint;
    /** Current state-machine state. */
    state: ProverMarketState;
    /** Assigned prover (`0x` 20 bytes); zero-address while Open/Expired. */
    assignedProver: string;
    /** Winning fee bid (lythoshi decimal string); `"0"` while Open. */
    winningFee: string;
    /** Delivered proof hash (`0x` 32 bytes); zero until `submitProof`. */
    proofHash: string;
}
/** `lyth_getProverBids` view of one prover fee bid. */
interface ProverBidView {
    /** Request this bid targets (`0x` 32 bytes). */
    requestId: string;
    /** Bidding prover (`0x` 20 bytes); must hold `SERVES_GPU_PROVE`. */
    prover: string;
    /** Fee bid (lythoshi decimal string); must be `<= maxFee`. */
    fee: string;
}
declare class ProverMarketError extends Error {
    constructor(message: string);
}
/** Compute the buyer's `request` sighash (`prover_market.request.v1`). */
declare function requestSighash(vkeyHash: string | Uint8Array | readonly number[], inputsHash: string | Uint8Array | readonly number[], maxFee: bigint | number | string, deadline: bigint | number | string, nonce: bigint | number | string): string;
/** Compute the prover's `bid` sighash (`prover_market.bid.v1`). */
declare function bidSighash(requestId: string | Uint8Array | readonly number[], fee: bigint | number | string): string;
/** Compute the assigned prover's `submit` sighash (`prover_market.submit.v1`). */
declare function submitSighash(requestId: string | Uint8Array | readonly number[], proofHash: string | Uint8Array | readonly number[]): string;
interface CreateRequestCanonicalArgs {
    /** Buyer address (`0x` 20 bytes). */
    buyer: string | Uint8Array | readonly number[];
    /** Buyer's ML-DSA-65 pubkey bytes. */
    buyerPubkey: string | Uint8Array | readonly number[];
    /** Verification-key hash (`0x` 32 bytes). */
    vkeyHash: string | Uint8Array | readonly number[];
    /** Public-inputs commitment (`0x` 32 bytes). */
    inputsHash: string | Uint8Array | readonly number[];
    /** Maximum fee escrowed (lythoshi). */
    maxFee: bigint | number | string;
    /** Deterministic Unix-seconds deadline. */
    deadline: bigint | number | string;
    /** Buyer-supplied uniqueness nonce. */
    nonce: bigint | number | string;
    /** Buyer's ML-DSA-65 signature over {@link requestSighash}. */
    sig: string | Uint8Array | readonly number[];
}
/**
 * Encode the canonical `createRequest` payload (the `bytes` body the
 * precompile accepts). Mirrors `ProofRequest::encode_canonical`:
 *
 * ```text
 * buyer (20) || buyerPubkeyLen (be16) || buyerPubkey
 *   || vkeyHash (32) || inputsHash (32) || maxFee (be16)
 *   || deadline (be8) || nonce (be8) || sigLen (be16) || sig
 * ```
 */
declare function encodeCreateRequestCanonical(args: CreateRequestCanonicalArgs): string;
/**
 * Encode full `createRequest(bytes)` calldata: the 4-byte selector
 * followed by the ABI-`bytes`-wrapped canonical payload.
 */
declare function encodeCreateRequestCalldata(args: CreateRequestCanonicalArgs): string;

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
declare const ML_DSA_65_PUBLIC_KEY_LEN$1 = 1952;
declare const ML_DSA_65_SIGNATURE_LEN$1 = 3309;
declare const SPENDING_POLICY_SELECTORS: {
    readonly setPolicy: "0x8da1a765";
    readonly setPolicyClaim: "0x35531f6c";
    readonly claimPolicyByAddress: "0x0c21376c";
    readonly enable: "0x5bfa1b68";
    readonly disable: "0xe6c09edf";
    readonly recordSpend: "0xdca04292";
};
interface SpendingPolicyArgs {
    /** Typed `mono` bech32m sub-account address. */
    subAccount: string;
    /** Typed `mono` bech32m principal address. */
    principal: string;
    dailyCapLythoshi: bigint | number | string;
    perTxCapLythoshi: bigint | number | string;
    allowRoot: string | Uint8Array | readonly number[];
    denyRoot: string | Uint8Array | readonly number[];
    /**
     * WP §18.8 per-week rolling cap in lythoshi (wire code `0x07`).
     * Omit or `0` for "no weekly cap".
     */
    weeklyCapLythoshi?: bigint | number | string;
    /**
     * WP §18.8 per-month rolling cap in lythoshi (wire code `0x08`).
     * Omit or `0` for "no monthly cap".
     */
    monthlyCapLythoshi?: bigint | number | string;
    /**
     * WP §18.8 per-category allow-list Merkle root (wire code `0x09`).
     * Omit or the zero hash for "no category constraint".
     */
    categoryAllowRoot?: string | Uint8Array | readonly number[];
    /**
     * WP §18.8 packed time-of-day window (wire code `0x0A`), a 32-byte
     * `uint256` word. Build it with {@link packTimeWindow}; omit or the
     * zero word for "no time-of-day window".
     */
    timeWindow?: string | Uint8Array | readonly number[];
    /**
     * WP §18.8 explicit policy-expiry timestamp in unix seconds (wire
     * code `0x0B`), encoded as a `uint256`. Omit or `0` for "never
     * auto-expires".
     */
    policyExpiry?: bigint | number | string;
}
/**
 * Decoded `lyth_getSpendingPolicy` view (the `setPolicy*` storage
 * surface, including the WP §18.8 dimensions).
 *
 * Caps and the expiry are decimal strings of their on-chain integer
 * value; roots / the time window are `0x`-prefixed 32-byte words. A
 * `null` time window means no window is configured; otherwise
 * `[startHour, endHour]` (0..=23, inclusive, may wrap past midnight).
 */
interface SpendingPolicyView {
    /** Typed `mono` bech32m sub-account the policy controls. */
    subAccount: string;
    /** Typed `mono` bech32m principal allowed to manage the policy. */
    principal: string;
    /** Monotonic policy version; `0` means no policy is written. */
    policyVersion: string;
    /** `true` when the principal disabled the sub-account. */
    disabled: boolean;
    /** Daily spend cap (lythoshi); `"0"` = no cap. */
    dailyCapLythoshi: string;
    /** Per-transaction cap (lythoshi); `"0"` = no cap. */
    perTxCapLythoshi: string;
    /** Allow-list Merkle root (`0x` 32 bytes). */
    allowRoot: string;
    /** Deny-list Merkle root (`0x` 32 bytes). */
    denyRoot: string;
    /** WP §18.8 per-week cap (lythoshi); `"0"` = no weekly cap. */
    weeklyCapLythoshi: string;
    /** WP §18.8 per-month cap (lythoshi); `"0"` = no monthly cap. */
    monthlyCapLythoshi: string;
    /** WP §18.8 category allow-list root (`0x` 32 bytes). */
    categoryAllowRoot: string;
    /** WP §18.8 decoded `[startHour, endHour]`, or `null` if unset. */
    timeWindow: [number, number] | null;
    /** WP §18.8 policy-expiry unix seconds; `"0"` = never expires. */
    policyExpiry: string;
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
declare function encodeEnableCalldata(subAccount: string): string;
declare function encodeDisableCalldata(subAccount: string): string;
/**
 * Pack a time-of-day window into the 32-byte `timeWindow` word used by
 * the WP §18.8 spending-policy dimensions.
 *
 * Mirrors `spending-policy::storage::pack_time_window`: hours clamp to
 * `0..=23`; when `enabled` is `false` the word is all-zero (the "no
 * window configured" sentinel). Layout (low 3 bytes of the big-endian
 * word): byte 29 = enabled sentinel (`0x01`), byte 30 = `startHour`,
 * byte 31 = `endHour`.
 */
declare function packTimeWindow(enabled: boolean, startHour: number, endHour: number): Uint8Array;
/**
 * Decode a packed `timeWindow` word into `[startHour, endHour]`, or
 * `null` when no window is configured. Inverse of {@link packTimeWindow}.
 */
declare function decodeTimeWindow(word: string | Uint8Array | readonly number[]): [number, number] | null;

declare const NO_EVM_RECEIPT_PROOF_SCHEMA = "mono.no_evm_receipt_proof.v1";
declare const NO_EVM_RECEIPT_PROOF_TYPE = "canonicalReceiptsTranscript";
declare const NO_EVM_RECEIPT_ROOT_ALGORITHM = "keccak256-binary-merkle(monolythium/v4.1/receipt_leaf/1, monolythium/v4.1/receipt_node/1, duplicate-last padding)";
declare const NO_EVM_RECEIPT_CODEC = "bincode(protocore_execution_types::Receipt)";
declare const NO_EVM_RECEIPTS_ROOT_DOMAIN = "monolythium/v4.1/receipts_root_empty/1";
declare const NO_EVM_ARCHIVE_PROOF_SCHEMA = "mono.no_evm_receipt_archive_binding.v1";
declare const NO_EVM_ARCHIVE_SIGNATURE_SCHEME = "mono.snapshot.sig.v1";
declare const NO_EVM_FINALITY_EVIDENCE_SCHEMA = "mono.no_evm_receipt_finality.v1";
declare const NO_EVM_FINALITY_EVIDENCE_SOURCE = "blsRoundCertificate";
type NoEvmReceiptProofErrorCode = "unsupported_schema" | "unsupported_proof_kind" | "unsupported_proof_type" | "unsupported_history_source" | "unsupported_root_algorithm" | "unsupported_receipt_codec" | "unsupported_compact_schema" | "unsupported_tree_algorithm" | "invalid_uint32" | "invalid_hex" | "invalid_hash_length" | "invalid_archive_signature" | "invalid_proof_shape" | "missing_target_receipt_bytes" | "too_many_receipts" | "receipt_too_large" | "receipt_count_mismatch" | "tx_index_out_of_bounds" | "receipts_root_mismatch" | "target_receipt_hash_mismatch" | "compact_root_mismatch" | "compact_leaf_hash_mismatch" | "compact_path_mismatch";
declare class NoEvmReceiptProofError extends Error {
    readonly code: NoEvmReceiptProofErrorCode;
    constructor(code: NoEvmReceiptProofErrorCode, message: string);
}
interface NoEvmReceiptProofVerification {
    /** Full decoded transcript for bounded proofs; compact proofs carry only the target. */
    receipts: Uint8Array[];
    receiptsRoot: string;
    targetReceiptHash: string;
    receiptCount: number;
    txIndex: number;
    targetReceipt: Uint8Array;
    proofKind: "boundedCacheTranscript" | "compactInclusion";
}
interface NoEvmArchiveTrustedSigner {
    publicKey: Uint8Array | readonly number[];
    signerId?: string;
    validFromHeight?: number | bigint;
    validToHeight?: number | bigint;
}
type NoEvmArchiveSignatureVerificationIssueCode = "missing_signature_digest" | "threshold_not_met" | "duplicate_signer" | "untrusted_signer" | "invalid_signature" | "invalid_trusted_public_key";
interface NoEvmArchiveSignatureVerificationIssue {
    code: NoEvmArchiveSignatureVerificationIssueCode;
    message: string;
    signatureIndex?: number;
    signerId?: string;
}
interface NoEvmArchiveSignatureVerification {
    verified: boolean;
    threshold: number;
    validSigners: string[];
    checkedSignatures: number;
    issues: NoEvmArchiveSignatureVerificationIssue[];
}
interface NoEvmReceiptTrustedBlsSigner {
    authorityIndex: number;
    publicKey: Uint8Array | readonly number[];
    validFromRound?: number | bigint;
    validToRound?: number | bigint;
}
interface NoEvmBlsFinalityVerification {
    finalityEvidencePresent: boolean;
    signerCountMatches: boolean;
    signerBitmapMatchesIndices: boolean;
    signerIndicesInRange: boolean;
    allSignersTrusted: boolean;
    thresholdMet: boolean;
    signatureValid: boolean;
    acceptedSignatureCount: number;
    requiredSignatureCount: number;
    verified: boolean;
}
interface NoEvmBlockBlsFinalityVerification {
    blockReference: NoEvmFinalityBlockReference;
    leaderCertificate: NoEvmBlsFinalityVerification;
    dacCertificate: NoEvmBlsFinalityVerification;
    verified: boolean;
}
type NoEvmReceiptFinalityTrustPolicy = {
    mode: "cluster";
    chainId?: number | bigint;
    clusterPublicKey: Uint8Array | readonly number[];
    committeeSize: number;
    threshold: number;
    validFromRound?: number | bigint;
    validToRound?: number | bigint;
} | {
    mode: "multisig";
    chainId?: number | bigint;
    trustedSigners: readonly NoEvmReceiptTrustedBlsSigner[];
    threshold: number;
    validFromRound?: number | bigint;
    validToRound?: number | bigint;
};
interface NoEvmReceiptTrustPolicy {
    chainId?: number | bigint;
    archive?: {
        trustedSigners: readonly NoEvmArchiveTrustedSigner[];
        threshold: number;
        validFromHeight?: number | bigint;
        validToHeight?: number | bigint;
    };
    finality?: NoEvmReceiptFinalityTrustPolicy;
}
type NoEvmReceiptTrustIssueCode = "missing_receipt_proof" | "missing_archive_proof" | "archive_policy_not_valid_at_height" | "archive_verification_failed" | "missing_finality_evidence" | "missing_finality_chain_id" | "finality_policy_not_valid_at_round" | "finality_verification_failed";
interface NoEvmReceiptTrustIssue {
    code: NoEvmReceiptTrustIssueCode;
    message: string;
}
interface NoEvmReceiptTrustVerification {
    verified: boolean;
    receiptProof: NoEvmReceiptProofVerification | null;
    archiveSignatures: NoEvmArchiveSignatureVerification | null;
    finalityEvidence: NoEvmBlsFinalityVerification | null;
    issues: NoEvmReceiptTrustIssue[];
}
declare function decodeNoEvmReceiptTranscript(proof: NoEvmReceiptProof): Uint8Array[];
declare function computeNoEvmReceiptsRoot(receipts: readonly Uint8Array[]): string;
declare function computeNoEvmTargetReceiptHash(receiptBytes: Uint8Array): string;
declare function verifyNoEvmReceiptProof(proof: NoEvmReceiptProof | null | undefined): NoEvmReceiptProofVerification | null;
declare function verifyNoEvmArchiveProofSignatures(archiveProof: NoEvmArchiveProof, trustedSigners: readonly NoEvmArchiveTrustedSigner[], threshold: number): NoEvmArchiveSignatureVerification;
declare function computeNoEvmRoundFinalityMessage(chainId: number | bigint, round: number | bigint): Uint8Array;
declare function computeNoEvmLeaderFinalityMessage(chainId: number | bigint, blockReference: NoEvmFinalityBlockReference): Uint8Array;
declare function computeNoEvmDacFinalityMessage(chainId: number | bigint, blockReference: NoEvmFinalityBlockReference): Uint8Array;
declare function verifyNoEvmFinalityEvidenceThreshold(finalityEvidence: NoEvmFinalityEvidence, options: {
    chainId: number | bigint;
    clusterPublicKey: Uint8Array | readonly number[];
    committeeSize: number;
    threshold: number;
}): NoEvmBlsFinalityVerification;
declare function verifyNoEvmFinalityEvidenceMultisig(finalityEvidence: NoEvmFinalityEvidence, options: {
    chainId: number | bigint;
    trustedSigners: readonly NoEvmReceiptTrustedBlsSigner[];
    threshold: number;
}): NoEvmBlsFinalityVerification;
declare function verifyNoEvmBlockFinalityEvidenceThreshold(finalityEvidence: NoEvmFinalityEvidence, options: {
    chainId: number | bigint;
    clusterPublicKey: Uint8Array | readonly number[];
    committeeSize: number;
    threshold: number;
}): NoEvmBlockBlsFinalityVerification;
declare function verifyNoEvmBlockFinalityEvidenceMultisig(finalityEvidence: NoEvmFinalityEvidence, options: {
    chainId: number | bigint;
    trustedSigners: readonly NoEvmReceiptTrustedBlsSigner[];
    threshold: number;
}): NoEvmBlockBlsFinalityVerification;
declare function verifyNoEvmReceiptProofTrust(proof: NoEvmReceiptProof | null | undefined, policy: NoEvmReceiptTrustPolicy): NoEvmReceiptTrustVerification;

/**
 * Chain-registry snapshot and helpers.
 *
 * Source of truth:
 * https://github.com/monolythium/chain-registry
 *
 * The SDK vendors a release-time snapshot so callers can bootstrap without
 * network access to GitHub. Callers that want the newest registry state can
 * opt into `fetchChainRegistryLatest()`.
 */

type NetworkSlug = "testnet-69420";
interface RpcEndpoint {
    url: string;
    provider: string;
    region?: string;
    tier: "official" | "community";
    archive?: boolean;
    ws_url?: string;
    notes?: string;
}
interface P2pSeed {
    multiaddr: string;
    region?: string;
}
interface ExplorerEndpoint {
    url: string;
    name: string;
    kind?: "monoscan" | "etherscan-fork" | "custom";
}
interface ReceiptProofTrustArchiveSigner {
    public_key: string;
    signer_id?: string;
    valid_from_height?: number;
    valid_to_height?: number;
    notes?: string;
}
interface ReceiptProofTrustArchivePolicy {
    signature_threshold: number;
    valid_from_height?: number;
    valid_to_height?: number;
    signers: ReceiptProofTrustArchiveSigner[];
}
interface ReceiptProofTrustFinalitySigner {
    authority_index: number;
    public_key: string;
    valid_from_round?: number;
    valid_to_round?: number;
    notes?: string;
}
interface ReceiptProofTrustFinalityPolicy {
    mode: "cluster" | "multisig";
    chain_id?: number;
    threshold: number;
    committee_size?: number;
    cluster_public_key?: string;
    valid_from_round?: number;
    valid_to_round?: number;
    signers?: ReceiptProofTrustFinalitySigner[];
}
interface ReceiptProofTrustPolicy {
    archive?: ReceiptProofTrustArchivePolicy;
    finality?: ReceiptProofTrustFinalityPolicy;
}
interface ChainInfo {
    chain_id: number;
    network: NetworkSlug | string;
    display_name?: string;
    description?: string;
    genesis_hash: string;
    binary_sha: string;
    rpc: RpcEndpoint[];
    p2p: P2pSeed[];
    explorer?: ExplorerEndpoint[];
    receipt_proof_trust?: ReceiptProofTrustPolicy;
}
type ChainRegistry = Record<NetworkSlug | string, ChainInfo>;
declare const TESTNET_69420: ChainInfo;
declare const CHAIN_REGISTRY: ChainRegistry;
declare const CHAIN_REGISTRY_RAW_BASE: "https://raw.githubusercontent.com/monolythium/chain-registry/master/chains";
declare function getChainInfo(network: NetworkSlug | string): ChainInfo;
declare function getRpcEndpoints(network: NetworkSlug | string): readonly RpcEndpoint[];
declare function getP2pSeeds(network: NetworkSlug | string): readonly P2pSeed[];
declare function getNoEvmReceiptTrustPolicy(network: NetworkSlug | string, registry?: ChainRegistry): NoEvmReceiptTrustPolicy | null;
declare function noEvmReceiptTrustPolicyFromChainInfo(info: ChainInfo): NoEvmReceiptTrustPolicy | null;
interface FetchChainRegistryOptions {
    fetch?: typeof fetch;
    rawBaseUrl?: string;
}
declare function fetchChainInfoLatest(network: NetworkSlug | string, options?: FetchChainRegistryOptions): Promise<ChainInfo>;
declare function fetchChainRegistryLatest(networks?: readonly (NetworkSlug | string)[], options?: FetchChainRegistryOptions): Promise<ChainRegistry>;
declare function parseChainRegistryToml(input: string): ChainInfo;

/**
 * Typed JSON-RPC client for a `mono-core` node.
 *
 * Mirrors the Rust SDK's `RpcClient` — every public method maps 1:1 to
 * a method on the Rust client, returns the same wire-shape value, and
 * sends the same `lyth_*` / `eth_*` / `debug_*` JSON-RPC method strings.
 */

/** Optional per-client configuration. */
interface RpcClientOptions {
    /** Override `fetch`. Useful for tests or non-Node environments. */
    fetch?: typeof fetch;
    /** Extra headers to attach to every request. */
    headers?: Record<string, string>;
}
interface NetworkClientOptions extends RpcClientOptions {
    /** Registry snapshot to use instead of the SDK-bundled snapshot. */
    registry?: ChainRegistry;
    /** Probe all known endpoints and choose the first one that answers. */
    probe?: boolean;
}
/** Typed user address (`mono1...`) accepted at public SDK boundaries. */
type UserAddressInput = string;
interface TxFeedReceipt {
    status: number;
    executionUnitsUsed: number;
    logsCount: number;
}
interface TxFeedTransaction {
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
interface TxFeedResponse {
    schemaVersion: number;
    latestHeight: number;
    limit: number;
    nextCursor: string | null;
    transactions: TxFeedTransaction[];
}
interface ExecutionUnitPriceResponse {
    executionUnitPriceLythoshi: string;
    basePricePerExecutionUnitLythoshi: string;
    priorityTipLythoshi: string;
    blockNumber: number | null;
    source: string;
}
declare const MAX_NATIVE_RECEIPT_EVENTS = 1000;
interface NativeReceiptCounters {
    cycles: number;
    syscallUnits: number;
    stateIoUnits: number;
}
interface NativeReceiptFee {
    total_lythoshi: string;
    total_lyth?: string;
    cycles_used: number;
    base_price_per_cycle_lythoshi: string;
    state_io_units: number;
    state_io_price_per_unit_lythoshi: string;
    priority_tip_lythoshi: string;
}
interface NativeReceiptEvent<TDecoded = unknown> {
    blockHeight: number;
    txIndex: number;
    logIndex: number;
    address: string;
    eventTopic: string;
    decoded: TDecoded;
    decodedJson: string;
}
interface NativeReceiptSource {
    chainProvider: string;
    indexerProvider: string;
    metadataLogIndex: number;
}
interface NoEvmCompactInclusionProof {
    schema: "mono.no_evm_receipt_compact_inclusion.v1";
    treeAlgorithm: "binary-keccak-receipt-tree";
    root: string;
    leafHash: string;
    siblingHashes: string[];
    pathSides: boolean[];
}
interface NoEvmArchiveProof {
    schema: "mono.no_evm_receipt_archive_binding.v1";
    source: "indexerReceiptArchiveContentDigest" | string;
    manifestHash: string;
    contentHash: string;
    signatureDigest?: string | null;
    signatures: string[];
    coveringSnapshot?: NoEvmArchiveCoveringSnapshot | null;
}
interface NoEvmArchiveCoveringSnapshot {
    snapshotHeight: number;
    manifestHash: string;
    signatureDigest: string;
    contentHash: string;
    checkpointContentHash: string;
    checkpointFrom: number;
    checkpointTo: number;
    signatures: string[];
}
interface NoEvmFinalityCertificate {
    round: number;
    signature: string;
    signersBitmap: string;
    signerIndices: number[];
    signerCount: number;
}
interface NoEvmFinalityBlockReference {
    round: number;
    authority: number;
    digest: string;
}
interface NoEvmFinalityEvidence {
    schema: "mono.no_evm_receipt_finality.v1";
    source: "blsRoundCertificate" | string;
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
interface NoEvmBoundedReceiptProof extends NoEvmReceiptProofBase {
    proofKind?: "boundedCacheTranscript";
    proofType: "canonicalReceiptsTranscript";
    historySource?: "legacyUnspecified" | "liveBlockCache";
    compactInclusionProof?: null;
    archiveProof?: null;
    missingProofMaterial?: string[];
    receiptTranscript: string[];
}
interface NoEvmCompactReceiptProof extends NoEvmReceiptProofBase {
    proofKind: "compactInclusion";
    proofType: "canonicalReceiptInclusion";
    historySource: "liveBlockCache" | "indexerReceiptArchive";
    compactInclusionProof: NoEvmCompactInclusionProof;
    archiveProof?: NoEvmArchiveProof | null;
    missingProofMaterial?: string[];
    targetReceiptBytes: string;
    receiptTranscript?: string[];
}
type NoEvmReceiptProof = NoEvmBoundedReceiptProof | NoEvmCompactReceiptProof;
interface NativeReceiptResponse<TDecoded = unknown> {
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
interface NativeEventsFilter {
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
interface NativeEventsResponseFilters {
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
interface NativeEventsSource {
    indexerProvider: string;
}
interface NativeEventsResponse<TDecoded = unknown> {
    schemaVersion: number;
    fromBlock: number;
    toBlock: number;
    limit: number;
    filters: NativeEventsResponseFilters;
    events: Array<NativeReceiptEvent<TDecoded>>;
    source: NativeEventsSource;
}
/** Filter object passed to `lyth_nativeAgentState` and `/api/v1/native-agent-state`. */
interface NativeAgentStateFilter {
    policyId?: string | null;
    escrowId?: string | null;
    account?: string | null;
    includePolicySpends?: boolean | null;
    limit?: number | bigint | string | null;
}
interface NativeAgentStateResponseFilters {
    policyId?: string | null;
    escrowId?: string | null;
    account?: string | null;
    includePolicySpends: boolean;
}
interface NativeAgentStateSource {
    indexerProvider: string;
    projection: string;
}
interface NativeAgentPolicyStateRecord {
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
interface NativeAgentPolicySpendStateRecord {
    policyId: string;
    controller: string;
    assetId: string;
    window: number;
    amount: string;
    spent: string;
    updatedAtBlock: number;
}
interface NativeAgentEscrowStateRecord {
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
interface NativeAgentIssuerStateRecord {
    issuerId: string;
    issuer: string;
    /** Issuer-local nonce; omitted by older nodes. */
    nonce?: number | null;
    metadataHash?: string | null;
    updatedAtBlock: number;
}
interface NativeAgentAttestationStateRecord {
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
interface NativeAgentConsentStateRecord {
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
interface NativeAgentServiceStateRecord {
    serviceId: string;
    provider: string;
    /** Provider-local service nonce; omitted by older nodes. */
    nonce?: number | null;
    categoryHash?: string | null;
    metadataHash?: string | null;
    active: boolean;
    updatedAtBlock: number;
}
interface NativeAgentAvailabilityStateRecord {
    provider: string;
    maxConcurrent: number;
    openRequests: number;
    paused: boolean;
    updatedAtBlock: number;
}
interface NativeAgentArbiterStateRecord {
    arbiterId: string;
    arbiter: string;
    /** Arbiter-local registration nonce; omitted by older nodes. */
    nonce?: number | null;
    tier?: number | null;
    metadataHash?: string | null;
    updatedAtBlock: number;
}
interface NativeAgentReputationReviewStateRecord {
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
interface NativeAgentStateResponse {
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
type NativeAgentStateFilterParamValue = string | number | boolean;
/** Filter object passed to `lyth_nativeMarketState` and `/api/v1/native-market-state`. */
interface NativeMarketStateFilter {
    marketId?: string | null;
    orderId?: string | null;
    listingId?: string | null;
    collectionId?: string | null;
    account?: string | null;
    includeSpotOrders?: boolean | null;
    limit?: number | bigint | string | null;
}
interface NativeMarketStateResponseFilters {
    marketId?: string | null;
    orderId?: string | null;
    listingId?: string | null;
    collectionId?: string | null;
    account?: string | null;
    includeSpotOrders: boolean;
}
interface NativeMarketStateSource {
    indexerProvider: string;
    projection: string;
}
interface NativeSpotMarketStateRecord {
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
interface NativeSpotOrderStateRecord {
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
interface NativeNftListingStateRecord {
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
interface NativeCollectionRoyaltyStateRecord {
    collectionId: string;
    creator: string | null;
    recipient: string;
    bps: number;
    updatedAtBlock: number;
}
interface NativeMarketStateResponse {
    schemaVersion: number;
    limit: number;
    filters: NativeMarketStateResponseFilters;
    spotMarkets: NativeSpotMarketStateRecord[];
    spotOrders: NativeSpotOrderStateRecord[];
    nftListings: NativeNftListingStateRecord[];
    collectionRoyalties: NativeCollectionRoyaltyStateRecord[];
    source: NativeMarketStateSource;
}
type NativeMarketStateFilterParamValue = string | number | boolean;
type AgentReputationCategoryScope = "global" | "category";
interface AgentReputationRecord {
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
interface AgentReputationResponse {
    schemaVersion: 1;
    provider: string;
    categoryId: number;
    categoryScope: AgentReputationCategoryScope;
    record: AgentReputationRecord | null;
}
interface AddressProfileResponse {
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
interface AddressFlowResponse {
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
interface SearchHit {
    type: string;
    id: string;
    route: string;
    label: string;
    score: number;
    meta?: unknown;
}
interface SearchResponse {
    schemaVersion: number;
    query: string;
    hits: SearchHit[];
    nextCursor: string | null;
}
interface ChainStatsResponse {
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
interface ClobMarketSummary {
    marketId: string;
    tradeCount: number;
    totalVolumeBase: string;
    lastPrice: string;
    lastBlockHeight: number;
}
interface ClobMarketsResponse {
    schemaVersion: number;
    limit: number;
    markets: ClobMarketSummary[];
    source: string;
}
interface ClobTrade {
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
interface ClobTradesResponse {
    schemaVersion: number;
    marketId: string;
    limit: number;
    nextCursor: string | null;
    trades: ClobTrade[];
}
interface ClobOhlcResponse {
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
interface ClobOrderBookResponse {
    schemaVersion: number;
    marketId: string;
    levels?: number;
    bids: Array<{
        price: string;
        size: string;
    }>;
    asks: Array<{
        price: string;
        size: string;
    }>;
}
/** Public-safe aggregate returned by `lyth_peerSummary`. */
interface PeerSummaryAggregate {
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
interface PrecompileCatalogueResponse {
    /** Block height sampled by the node. */
    blockNumber: bigint;
    /** Precompile descriptors active or known at the sampled block. */
    precompiles: PrecompileDescriptor[];
}
interface OperatorInfoResponse {
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
interface ClusterMemberResponse {
    operatorId: string;
    blsPubkey: string;
    state: string;
}
interface ClusterStatusResponse {
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
interface ClusterDirectoryEntryResponse {
    clusterId: number;
    size: number;
    threshold: number;
    aggregateHealth: string;
    regionDiversity: string[] | null;
    active: boolean;
}
interface ClusterDirectoryPageResponse {
    page: number;
    limit: number;
    totalClusters: number;
    clusters: ClusterDirectoryEntryResponse[];
}
type OperatorSurfaceStatus = "available" | "disabled" | "not_implemented" | "not_retained" | "ws_only" | string;
interface OperatorSurfaceCapability {
    status: OperatorSurfaceStatus;
    tracking?: string;
}
interface OperatorCapabilitiesResponse {
    schemaVersion: number;
    surfaces: Record<string, OperatorSurfaceCapability>;
}
interface OperatorAuthorityResponse {
    schemaVersion: number;
    operatorId: string;
    authorityIndex: number;
    blsPubkey: string;
    active: boolean;
}
type SigningEntryStatus = "signed" | "missed" | "no_cert" | string;
interface OperatorSigningEntry {
    round: bigint;
    status: SigningEntryStatus;
}
interface OperatorSigningActivityResponse {
    schemaVersion: number;
    authorityIndex: number;
    currentRound: bigint;
    limit: number;
    entries: OperatorSigningEntry[];
}
interface AttestationWindow {
    startRound: bigint;
    endRound: bigint;
    kind: string;
}
interface DutyAbsence {
    reason: string;
}
type KeyRotationWindow = {
    nextRound: bigint;
    epochLengthRounds: bigint;
} | DutyAbsence;
interface UpcomingDutyMap {
    attestation: AttestationWindow;
    blockProduction: DutyAbsence;
    sync: DutyAbsence;
    keyRotation: KeyRotationWindow;
}
interface UpcomingDutiesResponse {
    schemaVersion: number;
    authorityIndex: number;
    currentRound: bigint;
    horizonRounds: number;
    duties: UpcomingDutyMap;
}
type JailStatusWindow = {
    jailed: boolean;
    tombstoned: boolean;
    jailedUntilHeight: bigint;
    unjailCount: bigint;
} | DutyAbsence;
interface OperatorRiskResponse {
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
interface LythUpgradePlanStatus {
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
interface LythUpgradeStatusResponse {
    chainId: number;
    blockNumber: number;
    configured: boolean;
    planCount: number;
    state: "active" | "none" | "pending" | string;
    active: LythUpgradePlanStatus | null;
    pendingCount: number;
    pending: LythUpgradePlanStatus[];
}
interface RuntimeBuildProvenance {
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
interface RuntimeUpgradeStatus {
    blockNumber: number;
    configured: boolean;
    planCount: number;
    state: "active" | "none" | "pending" | string;
    active: LythUpgradePlanStatus | null;
    pending: LythUpgradePlanStatus[];
}
interface RuntimeProvenanceResponse {
    schemaVersion: number;
    chainId: number;
    genesisHash: string | null;
    latestHeight: number;
    runtime: RuntimeBuildProvenance;
    upgrade: RuntimeUpgradeStatus | null;
}
type ServiceProbeStatusLabel = "unknown" | "reachable" | "degraded" | "unreachable" | string;
interface ServiceProbeResponse {
    serviceMask: number;
    status: ServiceProbeStatusLabel;
    statusCode: number;
    lastProbeBlock: number;
    latencyMs: number;
    probeDigest: string;
    reporter: string;
}
interface ReportServiceProbeRequest {
    peerId: string;
    serviceMask: number;
    status: number;
    latencyMs: number;
    probeDigest: string;
    signedRawTx: string;
}
interface ReportServiceProbeResponse {
    txHash: string;
    peerId: string;
    serviceMask: number;
    statusCode: number;
}
type TxStatusResponse = TxStatusFoundResponse | TxStatusNotFoundResponse;
interface TxStatusFoundResponse {
    status: "found";
    txHash: string;
    blockHash: string;
    blockNumber: number;
    txIndex: number;
}
interface TxStatusNotFoundResponse {
    status: "not_found";
    txHash: string;
    latestHeight: number;
    indexerEnabled: boolean;
    providerKind: string;
}
interface VertexAtRound {
    vertexHash: string;
    author: number;
}
interface VerticesAtRoundResponse {
    schemaVersion: number;
    round: number;
    vertices: VertexAtRound[] | null;
}
type MetricsRangeStatus = "available" | "not_retained" | "unknown" | string;
interface MetricsRangeSample {
    blockNumber: number;
    value: number;
}
interface MetricsRangeSeries {
    selector: string;
    status: MetricsRangeStatus;
    unit: string | null;
    samples: MetricsRangeSample[] | null;
}
interface MetricsRangeResponse {
    schemaVersion: number;
    range: [number, number] | null;
    tracking: string;
    series: MetricsRangeSeries[];
}
type AddressActivityKind = "found" | "not_found" | "indexer_disabled" | "pruned" | "private" | string;
declare class RpcClient {
    #private;
    readonly endpoint: string;
    constructor(endpoint: string, options?: RpcClientOptions);
    /**
     * Construct a client from the chain-registry network slug.
     *
     * Defaults to the SDK-bundled registry snapshot from
     * `monolythium/chain-registry`. Set `probe: true` to walk the
     * registry endpoints in order and return the first endpoint whose
     * `eth_chainId` matches the registry chain id.
     */
    static forNetwork(network?: NetworkSlug | string, options?: NetworkClientOptions): Promise<RpcClient>;
    /**
     * Walk a chain-registry entry in order and return the first endpoint
     * whose `eth_chainId` matches the registry `chain_id`.
     */
    static fromFirstReachable(chain: ChainInfo, options?: RpcClientOptions): Promise<RpcClient>;
    /**
     * Send an arbitrary JSON-RPC method. Most callers should prefer the
     * typed wrappers below; this is the escape hatch for methods the
     * SDK does not yet wrap.
     */
    call<T>(method: string, params?: unknown): Promise<T>;
    /** `eth_chainId` — configured chain id. */
    ethChainId(): Promise<bigint>;
    /** Compatibility block-height read. */
    ethBlockNumber(): Promise<bigint>;
    /** `eth_getBalance` — balance + Merkle proof envelope. */
    ethGetBalance(address: string, block?: BlockSelector): Promise<AccountProofResponse>;
    /** `eth_getStorageAt` — storage word + Merkle proof. */
    ethGetStorageAt(address: string, slot: string, block?: BlockSelector): Promise<AccountProofResponse>;
    /** `eth_getTransactionCount` — sender nonce. */
    ethGetTransactionCount(address: string, block?: BlockSelector): Promise<bigint>;
    /** `eth_getCode` — deployed bytecode (`0x` for an EOA, `0xfe` for a precompile). */
    ethGetCode(address: string, block?: BlockSelector): Promise<string>;
    /** Compatibility block-header read by height/tag. */
    ethGetBlockByNumber(block?: BlockSelector): Promise<BlockHeader | null>;
    /** Compatibility block-header read by hash. */
    ethGetBlockByHash(hash: string): Promise<BlockHeader | null>;
    /** `eth_getTransactionByHash` — fetch an included transaction by hash. */
    ethGetTransactionByHash(txHash: string): Promise<TransactionView | null>;
    /** `eth_getTransactionReceipt` — receipt for a confirmed tx. */
    ethGetTransactionReceipt(txHash: string): Promise<TransactionReceipt | null>;
    /**
     * `eth_gasPrice` — passive compatibility fee quote for EVM-shaped read
     * tooling. Native callers should prefer `lythExecutionUnitPrice`.
     */
    ethGasPrice(): Promise<bigint>;
    /** `eth_feeHistory` — base-fee + gas-used history. */
    ethFeeHistory(blockCount: number, newestBlock?: BlockSelector, rewardPercentiles?: number[]): Promise<FeeHistoryResponse>;
    /** `eth_syncing` — `null` when caught up. */
    ethSyncing(): Promise<SyncStatus | null>;
    /** `net_version` — chain id as a decimal string. */
    netVersion(): Promise<string>;
    /** `net_peerCount` — number of connected peers. */
    netPeerCount(): Promise<bigint>;
    /** `net_listening` — whether the node accepts inbound peers. */
    netListening(): Promise<boolean>;
    /** `web3_clientVersion` — server's client-version string. */
    web3ClientVersion(): Promise<string>;
    /** `web3_sha3` — Keccak-256 of `data`. */
    web3Sha3(data: string): Promise<string>;
    /** `lyth_listProviders` — paged registry enumeration. */
    lythListProviders(capabilityMask: number, cursor?: string | null, limit?: number): Promise<RegistryRecord[]>;
    /** `lyth_getRegistration` — single registry lookup. */
    lythGetRegistration(peerId: string): Promise<RegistryRecord | null>;
    /** `lyth_registryStateProof` — Merkle proof for a registry entry. */
    lythRegistryStateProof(peerId: string): Promise<AccountProofResponse>;
    /** `lyth_getAccountPolicy` — privacy posture for an account. */
    lythGetAccountPolicy(address: string): Promise<AccountPolicy>;
    /** `lyth_getAssetPolicy` — privacy posture for an asset. */
    lythGetAssetPolicy(tokenId: string): Promise<AssetPolicy>;
    /** `lyth_getTokenBalances` — indexed per-asset balances for one address. */
    lythGetTokenBalances(address: string): Promise<TokenBalanceRecord[]>;
    /** `lyth_bridgeRoutes` — read-only bridge route-selection/readiness. */
    lythBridgeRoutes(request: BridgeRoutesRequest): Promise<BridgeRoutesResponse>;
    /** `lyth_mrcMetadata` — exact current-state native MRC metadata lookup. */
    lythMrcMetadata(assetId: string, tokenId?: string | null): Promise<MrcMetadataResponse>;
    /** `lyth_mrcAccount` — exact current-state native MRC account lookup. */
    lythMrcAccount(account: string, spendLimit?: number | null): Promise<MrcAccountResponse>;
    /** `lyth_mrcHolders` — top holders for a native MRC asset/token key. */
    lythMrcHolders(standard: string, assetId: string, tokenId: string, limit?: number | null): Promise<MrcHoldersResponse>;
    /**
     * `lyth_mrcHolders` — top holders for a native MRC asset/vault key.
     *
     * This is the asset-scoped form used by MRC-4626 vault share balances.
     */
    lythMrcAssetHolders(standard: string, assetId: string, limit?: number | null): Promise<MrcHoldersResponse>;
    /** `lyth_mrcHolders` — top holders for MRC-4626 vault shares. */
    lythMrc4626Holders(vaultId: string, limit?: number | null): Promise<MrcHoldersResponse>;
    private lythMrcHoldersScoped;
    /** `lyth_getAddressLabel` — indexed display/category label for one address. */
    lythGetAddressLabel(address: string): Promise<AddressLabelRecord | null>;
    /** `lyth_getAddressActivity` — indexed per-address activity timeline. */
    lythGetAddressActivity(address: string, limit?: number, cursor?: string | null): Promise<AddressActivityEntry[]>;
    /** `lyth_addressActivityKind` — activity index coverage for one address. */
    lythAddressActivityKind(address: string): Promise<AddressActivityKindResponse>;
    /** `lyth_agentReputation` — reputation accumulators for an agent provider. */
    lythAgentReputation(provider: UserAddressInput, categoryId?: number): Promise<AgentReputationResponse>;
    /** `lyth_decodeTx` — explorer-grade decoded transaction envelope. */
    lythDecodeTx(txHash: string): Promise<DecodeTxResponse>;
    /** `lyth_nativeReceipt` — native RISC-V receipt metadata and typed native event rows. */
    lythNativeReceipt<TDecoded = unknown>(txHash: string): Promise<NativeReceiptResponse<TDecoded>>;
    /**
     * Typed native event rows from `lyth_nativeReceipt`.
     *
     * This helper intentionally consumes the existing receipt RPC surface;
     * it does not require a separate `lyth_nativeEvents` node method.
     */
    lythNativeReceiptEvents<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(txHash: string, filter?: NativeEventFilter): Promise<Array<TypedNativeReceiptEvent<TDecoded>>>;
    /** Typed native market event rows from `lyth_nativeReceipt`. */
    lythNativeReceiptMarketEvents<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(txHash: string, filter?: NativeEventFilter): Promise<Array<TypedNativeReceiptEvent<TDecoded>>>;
    /** `lyth_nativeEvents` — historical indexed native event rows. */
    lythNativeEvents<TDecoded = unknown>(filter: NativeEventsFilter): Promise<NativeEventsResponse<TDecoded>>;
    /** `lyth_nativeEvents` with decoded rows converted into a caller-selected type. */
    lythNativeEventsTyped<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(filter: NativeEventsFilter): Promise<NativeEventsResponse<TDecoded>>;
    /** `lyth_nativeEvents` restricted to native marketplace event rows. */
    lythNativeMarketEvents<TDecoded = unknown>(filter: NativeEventsFilter): Promise<NativeEventsResponse<TDecoded>>;
    /** `lyth_nativeEvents` market rows with decoded rows converted into a caller-selected type. */
    lythNativeMarketEventsTyped<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(filter: NativeEventsFilter): Promise<NativeEventsResponse<TDecoded>>;
    /** `lyth_nativeAgentState` — current-state native agent policy and escrow rows. */
    lythNativeAgentState(filter?: NativeAgentStateFilter): Promise<NativeAgentStateResponse>;
    /** `lyth_nativeMarketState` — current-state native spot and NFT market rows. */
    lythNativeMarketState(filter?: NativeMarketStateFilter): Promise<NativeMarketStateResponse>;
    /** `lyth_gapRecords` — retained ingestion/indexing gaps for a block range. */
    lythGapRecords(fromBlock: number | bigint | string, toBlock: number | bigint | string): Promise<GapRecordsResponse>;
    /** `lyth_dagParents` — parent vertices for a DAG round. */
    lythDagParents(round: number | bigint | string): Promise<DagParentsResponse>;
    /** `lyth_richList` — top holders for a token id. */
    lythRichList(tokenId: string, limit?: number | null): Promise<RichListResponse>;
    /** `lyth_clobMarket` — live CLOB market metadata for a market id. */
    lythClobMarket(marketId: string): Promise<ClobMarketResponse>;
    /** `lyth_clobMarkets` — CLOB markets observed through indexed trades. */
    lythClobMarkets(limit?: number | null): Promise<ClobMarketsResponse>;
    /** `lyth_clobTrades` — CLOB fills for one market. */
    lythClobTrades(marketId: string, limit?: number, cursor?: string | null): Promise<ClobTradesResponse>;
    /** `lyth_clobOhlc` — CLOB OHLC candles for a market over a block range. */
    lythClobOhlc(marketId: string, fromBlock?: number | bigint | string | null, toBlock?: number | bigint | string | null, bucketBlocks?: number | bigint | string | null): Promise<ClobOhlcResponse>;
    /** `lyth_clobOrderBook` — live CLOB depth from canonical state. */
    lythClobOrderBook(marketId: string, levels?: number | null): Promise<ClobOrderBookResponse>;
    /** `lyth_txFeed` — paged global transaction feed. */
    lythTxFeed(limit?: number, cursor?: string | null): Promise<TxFeedResponse>;
    /** `lyth_addressProfile` — live account + label + activity aggregate. */
    lythAddressProfile(address: string): Promise<AddressProfileResponse>;
    /** `lyth_addressFlow` — recent indexed address-flow aggregate. */
    lythAddressFlow(address: string, limit?: number): Promise<AddressFlowResponse>;
    /** `lyth_search` — exact live resolver for hashes, addresses, blocks, and clusters. */
    lythSearch(query: string, limit?: number): Promise<SearchResponse>;
    /** `lyth_chainStats` — compact live chain/indexer/mempool summary. */
    lythChainStats(): Promise<ChainStatsResponse>;
    /** `lyth_mempoolStatus` — aggregate mempool snapshot. */
    lythMempoolStatus(): Promise<MempoolSnapshot>;
    /** `lyth_mempoolPending` — pending txs for a sender. */
    lythMempoolPending(sender: string): Promise<PendingTxSummary[]>;
    /** `lyth_currentRound` — latest committed height. */
    lythCurrentRound(): Promise<RoundInfo>;
    /** `lyth_getTransactionCount` — native sender nonce. */
    lythGetTransactionCount(address: string): Promise<bigint>;
    /** `lyth_executionUnitPrice` — native execution-unit price in lythoshi. */
    lythExecutionUnitPrice(): Promise<ExecutionUnitPriceResponse>;
    /** `lyth_peerSummary` — public-safe aggregate peer-network diagnostics. */
    lythPeerSummary(): Promise<PeerSummaryAggregate>;
    /** `lyth_listActivePrecompiles` — native precompile catalogue. */
    lythListActivePrecompiles(block?: BlockSelector): Promise<PrecompileCatalogueResponse>;
    /** `lyth_capabilities` — address-keyed precompile capability map. */
    lythCapabilities(block?: BlockSelector): Promise<CapabilitiesResponse>;
    /**
     * `lyth_operatorCapabilities` — node-level availability for operator UI
     * and explorer surfaces.
     */
    lythOperatorCapabilities(): Promise<OperatorCapabilitiesResponse>;
    /** `lyth_indexerStatus` — indexer status; `null` when disabled. */
    lythIndexerStatus(): Promise<IndexerStatus | null>;
    /** `lyth_getStorageProof` — batched Merkle proofs. */
    lythGetStorageProof(address: string, slots: string[]): Promise<StorageProofBatch>;
    /** `lyth_getDelegations` — wallet delegation rows at a block. */
    lythGetDelegations(wallet: string, block?: BlockSelector): Promise<DelegationsResponse>;
    /** `lyth_pendingRewards` — wallet pending rewards at a block. */
    lythPendingRewards(wallet: string, block?: BlockSelector): Promise<PendingRewardsResponse>;
    /** `lyth_redemptionQueue` — wallet redemption tickets at a block. */
    lythRedemptionQueue(wallet: string, block?: BlockSelector): Promise<RedemptionQueueResponse>;
    /** `lyth_getDelegationHistory` — indexed per-wallet delegation event timeline. */
    lythGetDelegationHistory(wallet: string, limit?: number, cursor?: string | null): Promise<DelegationHistoryRecord[]>;
    /** `lyth_getClusterDelegators` — delegator addresses for a cluster. */
    lythGetClusterDelegators(cluster: number, block?: BlockSelector): Promise<ClusterDelegatorsResponse>;
    /** `lyth_getDelegationCap` — active per-cluster cap at a block. */
    lythGetDelegationCap(block?: BlockSelector): Promise<DelegationCapResponse>;
    /** `lyth_getTpmAttestation` — TPM quote digest + EK id for a peer. */
    lythGetTpmAttestation(peerId: string, block?: BlockSelector): Promise<TpmAttestationResponse>;
    /** `lyth_getClusterEntity` — entity flag for a cluster. */
    lythGetClusterEntity(cluster: number, block?: BlockSelector): Promise<ClusterEntityResponse>;
    /** `lyth_getEntityRatchet` — entity-ratchet snapshot at a block. */
    lythGetEntityRatchet(block?: BlockSelector): Promise<EntityRatchetResponse>;
    /** `lyth_operatorInfo` — canonical operator identity envelope. */
    lythOperatorInfo(operatorId: string): Promise<OperatorInfoResponse>;
    /** `lyth_getServiceProbe` — latest external reachability report for one public service. */
    lythGetServiceProbe(peerId: string, serviceMask: number): Promise<ServiceProbeResponse | null>;
    /** `lyth_reportServiceProbe` — submit a pre-signed public-service probe report. */
    lythReportServiceProbe(req: ReportServiceProbeRequest): Promise<ReportServiceProbeResponse>;
    /** `lyth_clusterStatus` — canonical cluster status envelope. */
    lythClusterStatus(clusterId: number): Promise<ClusterStatusResponse>;
    /** `lyth_clusterDirectory` — paged public cluster directory. */
    lythClusterDirectory(page?: number, limit?: number): Promise<ClusterDirectoryPageResponse>;
    /** `lyth_clusters` — alias for `lyth_clusterDirectory`. */
    lythClusters(page?: number, limit?: number): Promise<ClusterDirectoryPageResponse>;
    /** PF-4 — `lyth_getSpendingPolicy`: the §18.8 spending-policy view for a sub-account. */
    lythGetSpendingPolicy(subAccount: string): Promise<SpendingPolicyView>;
    /** PF-6 — `lyth_getClusterDiversity`: diversity score + asn/geo/hosting breakdown. */
    lythGetClusterDiversity(clusterId: number): Promise<ClusterDiversity>;
    /** PF-6 — `lyth_getOperatorNetworkMetadata`: ASN/geo/hosting-class/IP/PCR for a peer. */
    lythGetOperatorNetworkMetadata(peerId: string): Promise<OperatorNetworkMetadata>;
    /** MB-6 — `lyth_oracleSigners`: the on-chain oracle writer/admin roster. */
    lythOracleSigners(): Promise<unknown>;
    /** MB-6 — `lyth_oracleWriters`: the allowed writer set for a feed. */
    lythOracleWriters(feedId: string): Promise<unknown>;
    /** MB-6 — `lyth_oracleLatestPrice`: the latest finalized median for a feed. */
    lythOracleLatestPrice(feedId: string): Promise<unknown>;
    /** MB-6 — `lyth_oracleFeedConfig`: a feed's decimals / min-signers / circuit-breaker config. */
    lythOracleFeedConfig(feedId: string): Promise<unknown>;
    /** MB-4 — `lyth_getProofRequest`: a single GPU prover-market proof request. */
    lythGetProofRequest(requestId: string): Promise<ProofRequestView>;
    /** MB-4 — `lyth_listProofRequests`: open/recent prover-market proof requests. */
    lythListProofRequests(limit?: number, cursor?: string | null): Promise<ProofRequestView[]>;
    /** MB-4 — `lyth_getProverBids`: the fee bids placed on one proof request. */
    lythGetProverBids(requestId: string): Promise<ProverBidView[]>;
    /** MB-4 — `lyth_proverMarketStatus`: prover-market summary / health. */
    lythProverMarketStatus(): Promise<unknown>;
    /** MB-2 — `lyth_bridgeHealth`: bridge route breaker state (drain cap, pause, cooldown). */
    lythBridgeHealth(bridgeId: string): Promise<BridgeBreakerState>;
    /**
     * `lyth_submitPendingChange` — operator-onboarding transport for the
     * pending-change ledger. Server validates the envelope shape.
     */
    lythSubmitPendingChange(envelope: unknown): Promise<unknown>;
    /** `lyth_submitEncrypted` — submit a bincode-encoded encrypted envelope hex. */
    lythSubmitEncrypted(envelopeHex: string): Promise<string>;
    /** `lyth_getEncryptionKey` — cluster ML-KEM encapsulation key. */
    lythGetEncryptionKey(): Promise<EncryptionKeyResponse>;
    /** `lyth_syncStatus` — DAG-sync driver snapshot. */
    lythSyncStatus(): Promise<DagSyncStatus | null>;
    /** `lyth_resolveOperatorAuthority` — operator id to authority index. */
    lythResolveOperatorAuthority(operatorId: string): Promise<OperatorAuthorityResponse>;
    /** `lyth_signingActivity` — recent per-round signing participation. */
    lythSigningActivity(authorityIndex: number, limit?: number | null): Promise<OperatorSigningActivityResponse>;
    /** `lyth_upcomingDuties` — deterministic upcoming duty windows. */
    lythUpcomingDuties(authorityIndex: number, horizonRounds?: number | null): Promise<UpcomingDutiesResponse>;
    /** `lyth_operatorRisk` — miss-rate and jail-status window. */
    lythOperatorRisk(authorityIndex: number, windowRounds?: number | null): Promise<OperatorRiskResponse>;
    /** `lyth_upgradeStatus` — signed network-upgrade readiness at a height. */
    lythUpgradeStatus(block?: BlockSelector): Promise<LythUpgradeStatusResponse>;
    /** `lyth_runtimeProvenance` — public-safe build/runtime provenance. */
    lythRuntimeProvenance(): Promise<RuntimeProvenanceResponse>;
    /** `lyth_txStatus` — discriminated transaction lookup outcome. */
    lythTxStatus(txHash: string): Promise<TxStatusResponse>;
    /** `lyth_verticesAtRound` — per-vertex authorship observed at a DAG round. */
    lythVerticesAtRound(round: number | bigint | string): Promise<VerticesAtRoundResponse>;
    /** `lyth_metricsRange` — retained telemetry series when the node has them. */
    lythMetricsRange(selectors: string[], range?: readonly [number | bigint | string, number | bigint | string] | null): Promise<MetricsRangeResponse>;
    /** `lyth_getLatestCheckpoint` — latest PQ-finality checkpoint rows. */
    lythGetLatestCheckpoint(belowHeight?: number | bigint | string | null): Promise<CheckpointRecord[]>;
    /** `lyth_getClusterResignations` — in-flight + applied operator resignations. */
    lythGetClusterResignations(operator?: string | null, status?: "pending" | "applied" | "all" | string | null): Promise<ClusterResignationsResponse>;
    /** `lyth_getBlsRoundCertificate` — round-advancement BLS aggregate. */
    lythGetBlsRoundCertificate(round: number | bigint | string): Promise<BlsCertificateResponse | null>;
    /** `lyth_getLeaderCertificate` — leader-vote BLS aggregate for a block ref. */
    lythGetLeaderCertificate(round: number | bigint | string, authority: number, digest: string): Promise<BlsCertificateResponse | null>;
    /** `lyth_getDacCertificate` — data-availability certificate for a block ref. */
    lythGetDacCertificate(round: number | bigint | string, authority: number, digest: string): Promise<BlsCertificateResponse | null>;
    /** `lyth_subscribe` — WebSocket-only; returns an RPC error over HTTP. */
    lythSubscribe(channel: ApiStreamTopic | (string & {})): Promise<unknown>;
    /** `lyth_unsubscribe` — counterpart to `lythSubscribe`. */
    lythUnsubscribe(subId: string): Promise<unknown>;
    /** `debug_traceTransaction` — legacy compatibility trace for a confirmed tx. */
    debugTraceTransaction(txHash: string): Promise<unknown>;
    /** `debug_mempoolDump` — full mempool snapshot. */
    debugMempoolDump(): Promise<MempoolSnapshot>;
    /** `debug_p2pPeers` — connected libp2p peer list. */
    debugP2pPeers(): Promise<PeerSummary[]>;
    /** `debug_stateDiff` — state-diff for a block range. */
    debugStateDiff(params: unknown): Promise<unknown>;
    /** `debug_chainReorg` — testnet-only reorg trigger. */
    debugChainReorg(params: unknown): Promise<unknown>;
    /** `mesh_buildUnsignedTx` — build an unsigned transaction envelope. */
    meshBuildUnsignedTx(intent: MeshTxIntent): Promise<MeshUnsignedTxResponse>;
    /** `mesh_combineTx` — combine an unsigned envelope with a wallet signature. */
    meshCombineTx(unsignedTx: string, signatureHex: string, algo?: "secp256k1" | "ml_dsa_65" | string, pubkeyHex?: string): Promise<MeshSignedTxResponse>;
    /** `mesh_decodeTx` — decode a signed or unsigned mesh envelope. */
    meshDecodeTx(envelopeHex: string, signed?: boolean): Promise<MeshDecodedTx>;
    /** `mesh_submitTx` — submit a signed mesh envelope. */
    meshSubmitTx(signedTx: string): Promise<string>;
}
/** Decode a `0x`-prefixed hex quantity to a `bigint`. */
declare function parseQuantityBig(hex: string): bigint;
/**
 * Decode a `0x`-prefixed hex quantity to a JS `number`. Convenience for
 * small quantities (chain id, block height, gas estimate). Throws if the
 * value exceeds `Number.MAX_SAFE_INTEGER`.
 */
declare function parseQuantity(hex: string): number;
declare function nativeEventsFilterParams(filter: NativeEventsFilter): Record<string, unknown>;
declare function decodeNativeReceiptResponse<TDecoded = unknown>(value: unknown): NativeReceiptResponse<TDecoded>;
declare function decodeTxFeedResponse(value: unknown): TxFeedResponse;
declare function nativeAgentStateFilterParams(filter: NativeAgentStateFilter): Record<string, NativeAgentStateFilterParamValue>;
declare function decodeNativeAgentStateResponse(value: unknown): NativeAgentStateResponse;
declare function nativeMarketStateFilterParams(filter: NativeMarketStateFilter): Record<string, NativeMarketStateFilterParamValue>;

/** Common typed payload envelope emitted by the native event projector. */
interface NativeDecodedEvent {
    block_height: number;
    tx_index: number;
    sequence: number;
    family: string;
    event_name: string;
    nonce?: number | null;
    market_surface?: string | null;
    marketSurface?: string | null;
    market_asset_id?: string | null;
    marketAssetId?: string | null;
    market_related_asset_id?: string | null;
    marketRelatedAssetId?: string | null;
    market_order_id?: string | null;
    marketOrderId?: string | null;
    market_related_order_id?: string | null;
    marketRelatedOrderId?: string | null;
    price?: string | null;
    quantity?: string | null;
    remaining?: string | null;
    side?: string | null;
    status?: string | null;
    nft_standard?: string | null;
    nftStandard?: string | null;
    policy?: NativeMrcPolicyProjection | null;
    royalty_bps?: number | null;
    royaltyBps?: number | null;
    listing_kind?: unknown;
    listingKind?: unknown;
    expires_at_block?: number | null;
    expiresAtBlock?: number | null;
    tick_size?: string | null;
    tickSize?: string | null;
    lot_size?: string | null;
    lotSize?: string | null;
    min_quantity?: string | null;
    minQuantity?: string | null;
    min_notional?: string | null;
    minNotional?: string | null;
    payload_hash: string;
    [field: string]: unknown;
}
/** Canonical policy body projected from native MRC policy-account events. */
interface NativeMrcPolicyProjection {
    enabled: boolean;
    per_action_limit: string | number;
    window_limit: string | number;
    allowed_assets: Array<string | Array<number>>;
}
type NativeEventProjection = NativeDecodedEvent;
declare const NATIVE_MARKET_EVENT_FAMILY: "market";
/** Optional filters applied to native receipt event rows. */
interface NativeEventFilter {
    address?: string;
    eventTopic?: string;
    family?: string;
    eventName?: string;
}
declare function nativeMarketEventFilter(filter?: NativeEventFilter): NativeEventFilter;
type TypedNativeReceiptEvent<TDecoded extends NativeDecodedEvent = NativeDecodedEvent> = NativeReceiptEvent<TDecoded>;
type NativeEventConsumer<TDecoded extends NativeDecodedEvent = NativeDecodedEvent> = (event: TypedNativeReceiptEvent<TDecoded>) => void | Promise<void>;
declare function isNativeDecodedEvent(value: unknown): value is NativeDecodedEvent;
declare function parseNativeDecodedEvent<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(event: Pick<NativeReceiptEvent<unknown>, "decoded" | "decodedJson" | "eventTopic" | "logIndex">): TDecoded;
declare function nativeEventMatches(event: NativeReceiptEvent<unknown>, filter?: NativeEventFilter): boolean;
declare function nativeEventsFromReceipt<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(receipt: NativeReceiptResponse<unknown>, filter?: NativeEventFilter): Array<TypedNativeReceiptEvent<TDecoded>>;
declare function nativeMarketEventsFromReceipt<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(receipt: NativeReceiptResponse<unknown>, filter?: NativeEventFilter): Array<TypedNativeReceiptEvent<TDecoded>>;
declare function nativeEventsFromHistory<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(response: NativeEventsResponse<unknown>): NativeEventsResponse<TDecoded>;
declare function nativeMarketEventsFromHistory<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(response: NativeEventsResponse<unknown>): NativeEventsResponse<TDecoded>;
declare function consumeNativeEvents<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(receipt: NativeReceiptResponse<unknown>, consumer: NativeEventConsumer<TDecoded>, filter?: NativeEventFilter): Promise<number>;

declare const ML_KEM_768_CIPHERTEXT_LEN = 1088;
declare const ML_KEM_768_ENCAPSULATION_KEY_LEN = 1184;
declare const ML_KEM_768_SHARED_SECRET_LEN = 32;
declare const DKG_NONCE_LEN = 12;
declare const DKG_AEAD_TAG_LEN = 16;
declare const MempoolClass: {
    readonly Transfer: 0;
    readonly ContractCall: 1;
    readonly PrivacyOp: 2;
    readonly CLOBOp: 3;
    readonly AgentOp: 4;
    readonly FoundationOp: 5;
    /** @deprecated Use FoundationOp. */
    readonly GovernanceOp: 5;
    readonly RWAOp: 6;
};
type MempoolClass = (typeof MempoolClass)[keyof typeof MempoolClass];
interface NonceAad {
    sender: Uint8Array;
    nonce: bigint;
    chainId: bigint;
    class: MempoolClass;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    gasLimit: bigint;
}
interface DecryptHint {
    epoch: bigint;
    scheme: number;
}
interface EncryptedEnvelope {
    nonceAad: NonceAad;
    ciphertext: Uint8Array;
    decryptionHint: DecryptHint;
    senderPubkey: Uint8Array;
    outerSignature: Uint8Array;
    sender: Uint8Array;
}
declare function bincodeNonceAad(aad: NonceAad): Uint8Array;
declare function bincodeDecryptHint(hint: DecryptHint): Uint8Array;
declare function bincodeEncryptedEnvelope(env: EncryptedEnvelope): Uint8Array;
declare function encryptInnerTx(signedInnerTxBincode: Uint8Array, nonceAad: NonceAad, kemEncapsulationKey: Uint8Array): Uint8Array;
declare function outerSigDigest(nonceAad: NonceAad, ciphertext: Uint8Array, decryptionHint: DecryptHint, senderPubkey: Uint8Array): Uint8Array;
declare function buildEncryptedEnvelope(args: {
    signedInnerTxBincode: Uint8Array;
    nonceAad: NonceAad;
    decryptionHint: DecryptHint;
    kemEncapsulationKey: Uint8Array;
    senderAddress: Uint8Array;
    senderPubkey: Uint8Array;
    signOuterDigest: (digest: Uint8Array) => Promise<Uint8Array> | Uint8Array;
}): Promise<{
    envelope: EncryptedEnvelope;
    wireBytes: Uint8Array;
    wireHex: string;
}>;

interface NativeEvmTxFields {
    chainId: bigint | number | string;
    nonce: bigint | number | string;
    maxPriorityFeePerGas: bigint | number | string;
    maxFeePerGas: bigint | number | string;
    gasLimit: bigint | number | string;
    to: Uint8Array | readonly number[] | string | null;
    value: bigint | number | string;
    input?: Uint8Array | readonly number[] | string;
    extensions?: readonly NativeTxExtensionLike[];
}
interface NativeTxExtension {
    kind: number;
    body: Uint8Array | readonly number[] | string;
}
interface NativeTxExtensionDescriptor {
    kind: number;
    bodyHex: string;
}
type NativeTxExtensionLike = NativeTxExtension | NativeTxExtensionDescriptor;
declare function encodeTransactionForHash(fields: NativeEvmTxFields, tag: 0x01 | 0x02): Uint8Array;
declare function bincodeSignedTransaction(fields: NativeEvmTxFields, signature: Uint8Array | readonly number[], publicKey: Uint8Array | readonly number[]): Uint8Array;

declare const ML_DSA_65_SEED_LEN = 32;
declare const ML_DSA_65_SIGNING_KEY_LEN = 4032;
declare const ML_DSA_65_PUBLIC_KEY_LEN = 1952;
declare const ML_DSA_65_SIGNATURE_LEN = 3309;
declare const STANDARD_ALGO_NUMBER_ML_DSA_65 = 1001;
declare const ENUM_VARIANT_INDEX_ML_DSA_65 = 5;
declare const ADDRESS_DERIVATION_DOMAIN = "MONO_ADDRESS_BLAKE3_20_V1";
declare class MlDsa65Backend {
    #private;
    private constructor();
    static fromSeed(seed: Uint8Array | readonly number[]): MlDsa65Backend;
    publicKey(): Uint8Array;
    addressBytes(): Uint8Array;
    getAddress(): string;
    sign(message: Uint8Array): Uint8Array;
    signPrehash(digest: Uint8Array): Uint8Array;
    verify(message: Uint8Array, signature: Uint8Array): boolean;
    signEvmTx(fields: NativeEvmTxFields): {
        wireHex: string;
        wireBytes: Uint8Array;
        sighash: Uint8Array;
        txHash: Uint8Array;
    };
}
declare function mlDsa65AddressFromPublicKey(publicKey: Uint8Array | readonly number[]): string;
declare function mlDsa65AddressBytes(publicKey: Uint8Array | readonly number[]): Uint8Array;
declare function encodeMlDsa65Opaque(raw: Uint8Array | readonly number[]): Uint8Array;

interface EncryptionKey {
    algo: string;
    epoch: bigint;
    encapsulationKey: Uint8Array;
}
interface EncryptedSubmission {
    envelopeWireHex: string;
    innerSighashHex: string;
    innerTxHashHex: string;
    innerWireBytes: number;
}
declare function fetchEncryptionKey(client: RpcClient): Promise<EncryptionKey>;
declare function buildEncryptedSubmission(args: {
    backend: MlDsa65Backend;
    tx: NativeEvmTxFields;
    encryptionKey: EncryptionKey;
    class?: MempoolClass;
}): Promise<EncryptedSubmission>;
declare function submitEncryptedEnvelope(client: RpcClient, envelopeWireHex: string): Promise<string>;

export { type AgentReputationResponse as $, type ApiStreamsIndexResponse as A, type BlockSelector as B, type ChainStatsResponse as C, type NativeEvmTxFields as D, type EncryptionKey as E, MempoolClass as F, RpcClient as G, MlDsa65Backend as H, API_STREAM_TOPICS as I, type AccountPolicy as J, type AccountProofResponse as K, type Address as L, type MrcMetadataResponse as M, type NativeReceiptFee as N, type OperatorCapabilitiesResponse as O, type PendingRewardsResponse as P, type AddressActivityArchiveRedirect as Q, type RuntimeBuildProvenance as R, type SearchResponse as S, type TxFeedResponse as T, type AddressActivityEntry as U, type AddressActivityKind as V, type AddressActivityKindResponse as W, type AddressActivityKindRetention as X, type AddressLabelRecord as Y, type AgentReputationCategoryScope as Z, type AgentReputationRecord as _, type RuntimeUpgradeStatus as a, type DecodeTxResponse as a$, type ApiStreamTopic as a0, type ApiStreamTopicMetadata as a1, type ApiStreamTopicRetention as a2, type AssetPolicy as a3, type AttestationWindow as a4, BRIDGE_QUOTE_API_BLOCKED_REASON as a5, BRIDGE_REVERT_TAGS as a6, BRIDGE_SELECTORS as a7, BRIDGE_SUBMIT_API_BLOCKED_REASON as a8, type BlockHeader as a9, CLUSTER_FORMED_EVENT_SIG as aA, type CapabilitiesResponse as aB, type CapabilityDescriptor as aC, type ChainInfo as aD, type ChainRegistry as aE, type CheckpointRecord as aF, type ClobMarketRecord as aG, type ClobMarketSummary as aH, type ClobTrade as aI, type ClusterDelegatorsResponse as aJ, type ClusterDirectoryEntryResponse as aK, type ClusterDirectoryPageResponse as aL, type ClusterDiversity as aM, type ClusterEntityResponse as aN, type ClusterFormedEvent as aO, type ClusterMemberResponse as aP, type ClusterResignationRow as aQ, type ClusterResignationsResponse as aR, type ClusterStatusResponse as aS, type CreateRequestCanonicalArgs as aT, DIVERSITY_SCORE_MAX as aU, type DagParent as aV, type DagParentsResponse as aW, type DagSyncStatus as aX, type DecodeTxExtension as aY, type DecodeTxLog as aZ, type DecodeTxPqAttestation as a_, type BlockTag as aa, type BlsCertificateResponse as ab, type BridgeAdminControl as ac, type BridgeBreakerState as ad, type BridgeBytesInput as ae, type BridgeCircuitBreakerState as af, type BridgeDrainCap as ag, BridgePrecompileError as ah, type BridgeQuoteSubmitReadiness as ai, type BridgeRiskTier as aj, type BridgeRouteAssessment as ak, type BridgeRouteCandidate as al, type BridgeRouteCatalogue as am, BridgeRouteCatalogueError as an, type BridgeRouteCatalogueJsonOptions as ao, type BridgeRouteCataloguePayload as ap, type BridgeRouteCatalogueRoute as aq, type BridgeRouteCatalogueValidation as ar, type BridgeRouteDisclosure as as, type BridgeRouteSelection as at, type BridgeRoutesSource as au, type BridgeTransferIntent as av, type BridgeTransferRequest as aw, type BridgeVerifierDisclosure as ax, CHAIN_REGISTRY as ay, CHAIN_REGISTRY_RAW_BASE as az, type NativeReceiptResponse as b, type NativeAgentStateResponseFilters as b$, type DelegationCapResponse as b0, type DelegationHistoryRecord as b1, type DelegationRow as b2, type DelegationsResponse as b3, type DutyAbsence as b4, type EncryptionKeyResponse as b5, type EntityRatchetResponse as b6, type ExecutionUnitPriceResponse as b7, type ExplorerEndpoint as b8, type FeeHistoryResponse as b9, type MrcPolicySpendRecord as bA, NATIVE_MARKET_EVENT_FAMILY as bB, NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC as bC, NODE_REGISTRY_CAPABILITIES as bD, NODE_REGISTRY_CAPABILITY_MASK as bE, NODE_REGISTRY_PUBLIC_SERVICE_MASK as bF, NODE_REGISTRY_SELECTORS as bG, NO_EVM_ARCHIVE_PROOF_SCHEMA as bH, NO_EVM_ARCHIVE_SIGNATURE_SCHEME as bI, NO_EVM_FINALITY_EVIDENCE_SCHEMA as bJ, NO_EVM_FINALITY_EVIDENCE_SOURCE as bK, NO_EVM_RECEIPTS_ROOT_DOMAIN as bL, NO_EVM_RECEIPT_CODEC as bM, NO_EVM_RECEIPT_PROOF_SCHEMA as bN, NO_EVM_RECEIPT_PROOF_TYPE as bO, NO_EVM_RECEIPT_ROOT_ALGORITHM as bP, type NativeAgentArbiterStateRecord as bQ, type NativeAgentAttestationStateRecord as bR, type NativeAgentAvailabilityStateRecord as bS, type NativeAgentConsentStateRecord as bT, type NativeAgentEscrowStateRecord as bU, type NativeAgentIssuerStateRecord as bV, type NativeAgentPolicySpendStateRecord as bW, type NativeAgentPolicyStateRecord as bX, type NativeAgentReputationReviewStateRecord as bY, type NativeAgentServiceStateRecord as bZ, type NativeAgentStateFilterParamValue as b_, type GapRange as ba, type GapRecord as bb, type GapRecordsResponse as bc, type Hash as bd, type Hex as be, type IndexerStatus as bf, type JailStatusWindow as bg, type KeyRotationWindow as bh, type LythUpgradePlanStatus as bi, type LythUpgradeStatusResponse as bj, MAX_NATIVE_RECEIPT_EVENTS as bk, ML_DSA_65_PUBLIC_KEY_LEN$1 as bl, ML_DSA_65_SIGNATURE_LEN$1 as bm, MULTISIG_ADDRESS_DERIVATION_DOMAIN as bn, type MempoolSnapshot as bo, type MeshDecodedTx as bp, type MeshSignedTxResponse as bq, type MeshTxIntent as br, type MeshUnsignedTxResponse as bs, type MetricsRangeResponse as bt, type MetricsRangeSample as bu, type MetricsRangeSeries as bv, type MetricsRangeStatus as bw, type MrcAccountRecord as bx, type MrcMetadataRecord as by, type MrcPolicyRecord as bz, type NativeDecodedEvent as c, PROVER_SLASH_REASON_NON_DELIVERY as c$, type NativeAgentStateSource as c0, type NativeCollectionRoyaltyStateRecord as c1, type NativeEventConsumer as c2, type NativeEventProjection as c3, type NativeEventsResponseFilters as c4, type NativeEventsSource as c5, type NativeMarketOrderBookDelta as c6, type NativeMarketOrderBookDeltasResponseFilters as c7, type NativeMarketOrderBookDeltasSource as c8, type NativeMarketOrderBookStreamAction as c9, type NoEvmReceiptProof as cA, NoEvmReceiptProofError as cB, type NoEvmReceiptProofErrorCode as cC, type NoEvmReceiptProofVerification as cD, type NoEvmReceiptTrustIssue as cE, type NoEvmReceiptTrustIssueCode as cF, type NoEvmReceiptTrustPolicy as cG, type NoEvmReceiptTrustVerification as cH, type NoEvmReceiptTrustedBlsSigner as cI, type NodeHostingClass as cJ, NodeRegistryError as cK, type OperatorAuthorityResponse as cL, type OperatorInfoResponse as cM, type OperatorNetworkMetadata as cN, type OperatorRiskResponse as cO, type OperatorSigningActivityResponse as cP, type OperatorSigningEntry as cQ, type OperatorSurfaceCapability as cR, type OperatorSurfaceStatus as cS, type P2pSeed as cT, PROVER_MARKET_BID_DOMAIN as cU, PROVER_MARKET_EVENT_SIGS as cV, PROVER_MARKET_REQUEST_DOMAIN as cW, PROVER_MARKET_SELECTORS as cX, PROVER_MARKET_SUBMIT_DOMAIN as cY, PROVER_MARKET_TENTATIVE_ADDRESS as cZ, PROVER_SLASH_REASON_BAD_PROOF as c_, type NativeMarketOrderBookStreamPayload as ca, type NativeMarketStateFilterParamValue as cb, type NativeMarketStateResponseFilters as cc, type NativeMarketStateSource as cd, type NativeModuleForwarderDescriptor as ce, type NativeMrcPolicyProjection as cf, type NativeNftListingStateRecord as cg, type NativeReceiptCounters as ch, type NativeReceiptEvent as ci, type NativeReceiptSource as cj, type NativeSpotMarketStateRecord as ck, type NativeSpotOrderStateRecord as cl, type NetworkClientOptions as cm, type NetworkSlug as cn, type NoEvmArchiveCoveringSnapshot as co, type NoEvmArchiveProof as cp, type NoEvmArchiveSignatureVerification as cq, type NoEvmArchiveSignatureVerificationIssue as cr, type NoEvmArchiveSignatureVerificationIssueCode as cs, type NoEvmArchiveTrustedSigner as ct, type NoEvmBlockBlsFinalityVerification as cu, type NoEvmBlsFinalityVerification as cv, type NoEvmFinalityBlockReference as cw, type NoEvmFinalityCertificate as cx, type NoEvmFinalityEvidence as cy, type NoEvmReceiptFinalityTrustPolicy as cz, type NativeEventFilter as d, bridgeDrainRemaining as d$, type PeerSummary as d0, type PeerSummaryAggregate as d1, type PendingRewardsRow as d2, type PendingTxSummary as d3, type PrecompileCatalogueResponse as d4, type PrecompileDescriptor as d5, type ProofRequestView as d6, type ProverBidView as d7, ProverMarketError as d8, type ProverMarketState as d9, type SpendingPolicyArgs as dA, SpendingPolicyError as dB, type SpendingPolicyView as dC, type StorageProofBatch as dD, type SyncStatus as dE, TESTNET_69420 as dF, type TokenBalanceMrcIdentity as dG, type TokenBalanceRecord as dH, type TpmAttestationResponse as dI, type TransactionReceipt as dJ, type TransactionView as dK, type TxFeedReceipt as dL, type TxFeedTransaction as dM, type TxStatusFoundResponse as dN, type TxStatusNotFoundResponse as dO, type TxStatusResponse as dP, type UpcomingDutiesResponse as dQ, type UpcomingDutyMap as dR, type UserAddressInput as dS, V1_BRIDGE_ALLOWED_FEE_TOKEN as dT, V1_BRIDGE_ALLOWED_PROTOCOL as dU, type VertexAtRound as dV, type VerticesAtRoundResponse as dW, assertNativeMarketOrderBookStreamPayload as dX, assessBridgeRoute as dY, bidSighash as dZ, bridgeAddressHex as d_, type Quantity as da, type RankedBridgeRoute as db, type ReceiptProofTrustArchivePolicy as dc, type ReceiptProofTrustArchiveSigner as dd, type ReceiptProofTrustFinalityPolicy as de, type ReceiptProofTrustFinalitySigner as df, type ReceiptProofTrustPolicy as dg, type RedemptionQueueTicket as dh, type RegistryRecord as di, type ReportServiceProbeCalldataArgs as dj, type ReportServiceProbeRequest as dk, type ReportServiceProbeResponse as dl, type RichListHolder as dm, type RichListResponse as dn, type RoundInfo as dp, type RpcClientOptions as dq, type RpcEndpoint as dr, type RuntimeProvenanceResponse as ds, SERVES_GPU_PROVE as dt, SERVICE_PROBE_STATUS as du, SET_POLICY_CLAIM_DOMAIN_TAG as dv, SPENDING_POLICY_SELECTORS as dw, type SearchHit as dx, type ServiceProbeStatusLabel as dy, type SigningEntryStatus as dz, type TypedNativeReceiptEvent as e, normalizeBridgeRouteCatalogue as e$, bridgeQuoteSubmitReadiness as e0, bridgeRoutesReadiness as e1, bridgeTransferCandidates as e2, buildBridgeRouteCatalogue as e3, composeClaimBoundMessage as e4, computeNoEvmDacFinalityMessage as e5, computeNoEvmLeaderFinalityMessage as e6, computeNoEvmReceiptsRoot as e7, computeNoEvmRoundFinalityMessage as e8, computeNoEvmTargetReceiptHash as e9, getChainInfo as eA, getNoEvmReceiptTrustPolicy as eB, getP2pSeeds as eC, getRpcEndpoints as eD, isBridgeAdminLockedRevert as eE, isBridgeCooldownZeroRevert as eF, isBridgeFinalityZeroRevert as eG, isBridgeResumeCooldownActiveRevert as eH, isConcreteServiceProbeStatus as eI, isNativeDecodedEvent as eJ, isNativeMarketOrderBookStreamPayload as eK, isSinglePublicServiceProbeMask as eL, isValidNodeRegistryCapabilities as eM, isValidPublicServiceProbeMask as eN, nativeAgentStateFilterParams as eO, nativeEventMatches as eP, nativeEventsFilterParams as eQ, nativeEventsFromHistory as eR, nativeEventsFromReceipt as eS, nativeMarketEventFilter as eT, nativeMarketEventsFromHistory as eU, nativeMarketEventsFromReceipt as eV, nativeMarketStateFilterParams as eW, noEvmReceiptTrustPolicyFromChainInfo as eX, nodeHostingClassFromByte as eY, nodeHostingClassToByte as eZ, nodeRegistryAddressHex as e_, consumeNativeEvents as ea, decodeClusterDiversity as eb, decodeClusterFormedEvent as ec, decodeNativeAgentStateResponse as ed, decodeNativeMarketOrderBookDeltasResponse as ee, decodeNativeReceiptResponse as ef, decodeNoEvmReceiptTranscript as eg, decodeOperatorNetworkMetadata as eh, decodeTimeWindow as ei, decodeTxFeedResponse as ej, deriveClusterAnchorAddress as ek, encodeBlockSelector as el, encodeClaimPolicyByAddressCalldata as em, encodeCreateRequestCalldata as en, encodeCreateRequestCanonical as eo, encodeDisableCalldata as ep, encodeEnableCalldata as eq, encodeLockBridgeConfigCalldata as er, encodeReportServiceProbeCalldata as es, encodeSetBridgeResumeCooldownCalldata as et, encodeSetBridgeRouteFinalityCalldata as eu, encodeSetPolicyCalldata as ev, encodeSetPolicyClaimCalldata as ew, exportBridgeRouteCatalogueJson as ex, fetchChainInfoLatest as ey, fetchChainRegistryLatest as ez, type NativeEventsFilter as f, packTimeWindow as f0, parseBridgeRouteCatalogueJson as f1, parseChainRegistryToml as f2, parseNativeDecodedEvent as f3, parseQuantity as f4, parseQuantityBig as f5, proverMarketStateFromByte as f6, rankBridgeRoutes as f7, requestSighash as f8, selectBridgeTransferRoute as f9, type NativeTxExtensionDescriptor as fA, type NativeTxExtensionLike as fB, type NonceAad as fC, STANDARD_ALGO_NUMBER_ML_DSA_65 as fD, bincodeDecryptHint as fE, bincodeEncryptedEnvelope as fF, bincodeNonceAad as fG, bincodeSignedTransaction as fH, buildEncryptedEnvelope as fI, buildEncryptedSubmission as fJ, encodeMlDsa65Opaque as fK, encodeTransactionForHash as fL, encryptInnerTx as fM, fetchEncryptionKey as fN, mlDsa65AddressBytes as fO, mlDsa65AddressFromPublicKey as fP, outerSigDigest as fQ, submitEncryptedEnvelope as fR, serviceProbeStatusLabel as fa, spendingPolicyAddressHex as fb, submitSighash as fc, validateBridgeRouteCatalogue as fd, verifyNoEvmArchiveProofSignatures as fe, verifyNoEvmBlockFinalityEvidenceMultisig as ff, verifyNoEvmBlockFinalityEvidenceThreshold as fg, verifyNoEvmFinalityEvidenceMultisig as fh, verifyNoEvmFinalityEvidenceThreshold as fi, verifyNoEvmReceiptProof as fj, verifyNoEvmReceiptProofTrust as fk, ADDRESS_DERIVATION_DOMAIN as fl, DKG_AEAD_TAG_LEN as fm, DKG_NONCE_LEN as fn, type DecryptHint as fo, ENUM_VARIANT_INDEX_ML_DSA_65 as fp, type EncryptedEnvelope as fq, type EncryptedSubmission as fr, ML_DSA_65_PUBLIC_KEY_LEN as fs, ML_DSA_65_SEED_LEN as ft, ML_DSA_65_SIGNATURE_LEN as fu, ML_DSA_65_SIGNING_KEY_LEN as fv, ML_KEM_768_CIPHERTEXT_LEN as fw, ML_KEM_768_ENCAPSULATION_KEY_LEN as fx, ML_KEM_768_SHARED_SECRET_LEN as fy, type NativeTxExtension as fz, type NativeEventsResponse as g, type NativeAgentStateFilter as h, type NativeAgentStateResponse as i, type NativeMarketStateFilter as j, type NativeMarketStateResponse as k, type NativeMarketOrderBookDeltasRequest as l, type NativeMarketOrderBookDeltasResponse as m, type AddressProfileResponse as n, type AddressFlowResponse as o, type RedemptionQueueResponse as p, type MrcAccountResponse as q, type MrcHoldersResponse as r, type BridgeRoutesRequest as s, type BridgeRoutesResponse as t, type ServiceProbeResponse as u, type ClobMarketsResponse as v, type ClobMarketResponse as w, type ClobTradesResponse as x, type ClobOhlcResponse as y, type ClobOrderBookResponse as z };
