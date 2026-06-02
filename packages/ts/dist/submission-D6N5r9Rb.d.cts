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
/**
 * Encode `claim(bytes32,bytes32,address)` calldata for the bridge
 * precompile (0x1008) — claim a wrapped asset after a deposit proof
 * lands.
 *
 * @param bridgeId 32-byte bridge id.
 * @param depositId 32-byte deposit id.
 * @param recipient 20-byte recipient address (raw bytes or `0x`-hex).
 */
declare function encodeBridgeClaimCalldata(bridgeId: BridgeBytesInput, depositId: BridgeBytesInput, recipient: BridgeBytesInput): string;
/**
 * Encode `challenge(bytes32,bytes32,bytes)` calldata for the bridge
 * precompile (0x1008) — submit fraud-proof bytes against a pending claim.
 */
declare function encodeBridgeChallengeCalldata(bridgeId: BridgeBytesInput, depositId: BridgeBytesInput, fraudProof: BridgeBytesInput): string;
/**
 * Encode `submitProof(bytes32,bytes32,bytes,bytes,bytes)` calldata for
 * the bridge precompile (0x1008) — submit the deposit lock-receipt, the
 * zk proof, and its public inputs.
 */
declare function encodeSubmitBridgeProofCalldata(bridgeId: BridgeBytesInput, depositId: BridgeBytesInput, lockReceipt: BridgeBytesInput, zkProof: BridgeBytesInput, publicInputs: BridgeBytesInput): string;
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
 * Latest light-client anchor metadata on a {@link BridgeHealthRecord}.
 */
interface BridgeAnchorState {
    /** Latest verified foreign-chain header root (`0x` 32 bytes). */
    headerRoot: string;
    /** Latest verified foreign-chain block number. */
    headerBlock: number;
    /** Protocore block at which the latest anchor was recorded. */
    updatedAtProtocoreBlock: number;
}
/**
 * MB-2 — bridge-level circuit-breaker + pause posture on a
 * {@link BridgeHealthRecord}. Amounts are `0x`-hex `uint256` strings;
 * block counts are numbers.
 */
interface BridgeCircuitBreakerFields {
    /** Bridge-default drain cap per rolling window (`0x`-hex `uint256`); `0x0` disables it. */
    defaultDrainCapPerWindow: string;
    /** Bridge-default drain-window length in Protocore blocks. */
    defaultDrainWindowBlocks: number;
    /** `true` when the route is currently in a recorded pause window. */
    paused: boolean;
    /** Protocore block the current pause was committed at; `null` when not paused. */
    pausedAtBlock: number | null;
    /** Cooldown (blocks) that must elapse after a pause before resume. */
    resumeCooldownBlocks: number;
}
/** One bridge-health row in a {@link BridgeHealthResponse}. */
interface BridgeHealthRecord {
    /** 32-byte bridge id (`0x` hex). */
    bridgeId: string;
    /** Stable bridge lifecycle status label. */
    status: string;
    /** Raw bridge lifecycle status byte. */
    statusCode: number;
    /** Latest light-client anchor metadata. */
    latestAnchor: BridgeAnchorState;
    /** MB-2 bridge-level circuit-breaker / pause posture. */
    circuitBreaker: BridgeCircuitBreakerFields;
}
/**
 * `lyth_bridgeHealth` response — a page of bridge-record health envelopes
 * (MB-2). The chain pages the **global** bridge set keyed by `cursor` +
 * `limit`; there is no single-bridge form. Each record's `circuitBreaker`
 * answers "is this route paused / rate-limited" in one round-trip; the
 * per-route live drain bucket is `lyth_bridgeDrainStatus`.
 */
interface BridgeHealthResponse {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** Data source — `"native_state_storage"`. */
    source: string;
    /** Bridge precompile address (`0x1008`). */
    precompile: string;
    /** Bridge-health rows in this page. */
    records: BridgeHealthRecord[];
    /** Opaque cursor for the next page (`0x` hex), or `null` at the end. */
    nextCursor: string | null;
}
/**
 * `lyth_bridgeDrainStatus` response — the live per-route circuit-breaker
 * drain bucket for one `(bridgeId, wrappedAsset)` route (MB-2).
 *
 * `remaining` is `capPerWindow - drainedThisBucket` (clamped at `0x0`)
 * when a per-asset cap is set; `0x0` when no per-asset cap exists (no
 * per-asset rate limit — the `bridgeDefault` applies). Amounts are
 * `0x`-hex `uint256` strings; block counts are numbers.
 */
interface BridgeDrainStatus {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** Data source — `"native_state_storage"`. */
    source: string;
    /** Bridge precompile address (`0x1008`). */
    precompile: string;
    /** Bridge id the bucket belongs to (`0x` 32 bytes). */
    bridgeId: string;
    /** Wrapped (Protocore-side) asset (`mono` bech32m). */
    wrappedAsset: string;
    /** Per-asset drain cap per window (`0x`-hex `uint256`); `0x0` = no per-asset cap. */
    capPerWindow: string;
    /** Per-asset window length in Protocore blocks. */
    windowBlocks: number;
    /** `block_number / window_blocks` at the last drain. */
    currentBucket: number;
    /** Running drained total for the active window (`0x`-hex `uint256`). */
    drainedThisBucket: string;
    /** `capPerWindow - drainedThisBucket` clamped at `0x0` (`0x0` when no per-asset cap). */
    remaining: string;
    /** Bridge-default fallback fields, surfaced when no per-asset cap is configured. */
    bridgeDefault: {
        /** Bridge-default drain cap per window (`0x`-hex `uint256`). */
        drainCapPerWindow: string;
        /** Bridge-default drain-window length in Protocore blocks. */
        drainWindowBlocks: number;
    };
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
     * Recovery address registered for this account, when smart-account state
     * carries one. ADVISORY / DISPLAY-ONLY: this is an inert stored field —
     * the chain has no on-chain account `Recover` / `RotateController` path
     * yet, so a registered recovery address cannot currently be exercised.
     * Surfaces MUST NOT present this as a working "recover account" action.
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
    /**
     * Block height the operator first registered at (operator "active
     * since"). Always present on the live `lyth_getRegistration` /
     * `lyth_listProviders` JSON.
     */
    registeredAtBlock: bigint;
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
    /**
     * Human-readable failure reason when `status == 0` (OBS-1). `None` on
     * success; carries a short machine-stable label (e.g. `"OutOfGas"`) or
     * the decoded revert message otherwise. Absent from JSON on success.
     */
    revertReason?: string;
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
    /** `recoverOperatorNode(bytes32)` — foundation-gated DR alias for `unjail`. */
    readonly recoverOperatorNode: string;
    /** `submitPendingChange(uint8,bytes,uint64,uint64)` — foundation-gated roster lifecycle. */
    readonly submitPendingChange: string;
    /** `cancelPendingChange(uint64,bytes)` — foundation-gated pending-change cancellation. */
    readonly cancelPendingChange: string;
    /** `attestDkgReshare(uint64,bytes,bytes)` — operator-signed DKG re-share attestation. */
    readonly attestDkgReshare: string;
    readonly reportServiceProbe: "0xeee31bba";
    readonly getServiceProbe: "0x1fcbfbce";
    /** `setNetworkMetadata(bytes32,uint16,bytes3,bytes)` — owner-callable (PF-6). */
    readonly setNetworkMetadata: string;
    /** `getOperatorNetworkMetadata(bytes32)` view (PF-6). */
    readonly getOperatorNetworkMetadata: string;
    /** `getClusterDiversity(uint32)` view (PF-6). */
    readonly getClusterDiversity: string;
};
declare const NODE_REGISTRY_BLS_PUBKEY_BYTES = 48;
declare const NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES = 96;
declare const NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS = 5;
declare const NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS = 7;
declare const NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID: bigint;
type PendingChangeKind = "add" | "remove" | "rotate";
declare const PENDING_CHANGE_KIND_CODES: Record<PendingChangeKind, number>;
/** Canonical `ClusterFormed(uint32,uint64,address,bytes)` event topic0 (MB-5). */
declare const CLUSTER_FORMED_EVENT_SIG: "ClusterFormed(uint32,uint64,address,bytes)";
interface SubmitPendingChangeCalldataArgs {
    kind: PendingChangeKind | number;
    targetPubkey: string | Uint8Array | readonly number[];
    effectiveEpoch: bigint | number | string;
    intentId?: bigint | number | string;
}
interface CancelPendingChangeCalldataArgs {
    epoch: bigint | number | string;
    targetPubkey: string | Uint8Array | readonly number[];
}
interface AttestDkgReshareCalldataArgs {
    intentId: bigint | number | string;
    blsPublicKeys: string | Uint8Array | readonly number[];
    thresholdSig: string | Uint8Array | readonly number[];
}
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
declare function normalizePendingChangeKind(kind: PendingChangeKind | number): {
    kind: PendingChangeKind;
    kindCode: number;
};
declare function encodeRecoverOperatorNodeCalldata(peerId: string | Uint8Array | readonly number[]): string;
declare function encodeSubmitPendingChangeCalldata(args: SubmitPendingChangeCalldataArgs): string;
declare function encodeCancelPendingChangeCalldata(args: CancelPendingChangeCalldataArgs): string;
declare function parseDkgResharePublicKeys(blsPublicKeys: string | Uint8Array | readonly number[]): Uint8Array[];
declare function encodeAttestDkgReshareCalldata(args: AttestDkgReshareCalldataArgs): string;
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
 * `lyth_getClusterDiversity` RPC response (PF-6).
 *
 * Distinct from {@link ClusterDiversity} (which decodes the
 * `getClusterDiversity(uint32)` ABI return tuple from an `eth_call`):
 * this is the JSON the `lyth_getClusterDiversity` method returns,
 * serialized from the chain's `ClusterDiversity` struct with camelCase
 * keys. It carries the `clusterId` echo that the ABI tuple omits. Every
 * value is in `0..=10000` basis points.
 */
interface ClusterDiversityView {
    /** Cluster id whose roster was scored. */
    clusterId: number;
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
 * `lyth_getOperatorNetworkMetadata` RPC response (PF-6).
 *
 * Distinct from {@link OperatorNetworkMetadata} (the ABI-decode tuple):
 * this is the JSON the `lyth_getOperatorNetworkMetadata` method returns,
 * read from the node-registry registration record (`0x1005`). `geoRegion`
 * here is the decoded ISO-3166-1 alpha-3 region **string** (or `null`);
 * `hostingClass` is the snake_case wire string (`bare_metal` /
 * `co_location` / `cloud`); `asn` is `null` when not declared.
 */
interface OperatorNetworkMetadataView {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** Data source — `"native_state_storage"`. */
    source: string;
    /** Node-registry precompile address (`0x1005`). */
    precompile: string;
    /** Operator/peer id (`0x` 32-byte hex). */
    operatorId: string;
    /** Autonomous-system number; `null` when not declared. */
    asn: number | null;
    /** Decoded ISO-3166-1 alpha-3 region string; `null` when not declared. */
    geoRegion: string | null;
    /** Declared hosting class as the wire string. */
    hostingClass: "bare_metal" | "co_location" | "cloud";
    /** `keccak256` of the operator's public IP (`0x` 32 bytes). */
    ipAddressHash: string;
    /** `keccak256` of the TPM PCR digest (`0x` 32 bytes). */
    pcrDigest: string;
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
declare function requireTypedAddress(address: string, expectedKind: AddressKind, label?: string): string;
declare function parseAddress(address: string): Uint8Array;
/** Address-validation result for non-throwing callers (UI forms, search). */
type AddressValidation = {
    valid: true;
    /** Lower-case bech32m representation; matches what the wire format expects. */
    normalized: string;
    /** Bech32m kind when the input is a typed bech32m address, otherwise null. */
    kind: AddressKind | null;
    /** Which surface the input came from. */
    format: "hex" | "bech32m";
    /** Raw 20-byte payload, useful for client-side bytes-derived lookups. */
    bytes: Uint8Array;
} | {
    valid: false;
    reason: string;
};
/**
 * Validate an address string without throwing. Accepts both raw hex and
 * typed bech32m. On success returns the canonical bech32m form along with
 * the kind/format/bytes; on failure returns a short reason string.
 */
declare function validateAddress(address: string): AddressValidation;
declare function normalizeAddressHex(address: string): string;

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
    /** `setMinNotional(bytes32,bytes32,uint256)` — foundation-authorized. */
    readonly setMinNotional: "0x395dc48f";
    /** `setTickSize(bytes32,bytes32,uint256)` — foundation-authorized per-market grid tune. */
    readonly setTickSize: "0x10666f0b";
    /** `setLotSize(bytes32,bytes32,uint256)` — foundation-authorized per-market grid tune. */
    readonly setLotSize: "0x9909be80";
};
/**
 * Canonical operator-fee router selector signatures (`0x100B`).
 *
 * Mirrors `mono-core/crates/precompiles/platform/operator-router/src/abi.rs`
 * (`sig::*`). Selectors are `keccak256(signature)[0..4]`.
 */
declare const OPERATOR_ROUTER_SIGS: {
    /** `registerOperator(address recipient, uint16 feeBps)`. */
    readonly registerOperator: "registerOperator(address,uint16)";
    /** `updateOperator(address recipient, uint16 feeBps)`. */
    readonly updateOperator: "updateOperator(address,uint16)";
    /** `disableOperator(address operator)` — foundation-authorized. */
    readonly disableOperator: "disableOperator(address)";
    /**
     * `placeLimitOrderVia(address operator, bytes32 base, bytes32 quote,
     *  uint8 side, uint256 price, uint256 amount, uint64 expiresAtBlock)`
     *  → `bytes32 orderId`.
     *
     * Skims the operator fee (quote token, `user -> recipient`) then
     * re-enters the CLOB `placeLimitOrder` op with `caller = user`, so the
     * resting order is owned + escrowed + cancellable by the user,
     * identical to a direct CLOB placement.
     */
    readonly placeLimitOrderVia: "placeLimitOrderVia(address,bytes32,bytes32,uint8,uint256,uint256,uint64)";
};
/** Operator-router selectors as `0x`-prefixed 4-byte hex. */
declare const OPERATOR_ROUTER_SELECTORS: {
    readonly registerOperator: string;
    readonly updateOperator: string;
    readonly disableOperator: string;
    readonly placeLimitOrderVia: string;
};
/**
 * Canonical operator-router event declaration strings (`0x100B`).
 *
 * Mirrors `operator-router/src/events.rs::sig`. Indexed args are
 * `operator`, `user`, `marketId` (for `OperatorFeeCharged`).
 */
declare const OPERATOR_ROUTER_EVENT_SIGS: {
    readonly operatorFeeCharged: "OperatorFeeCharged(address,address,bytes32,address,bytes32,uint256,bytes32)";
    readonly operatorRegistered: "OperatorRegistered(address,address,uint16)";
    readonly operatorUpdated: "OperatorUpdated(address,address,uint16,bool)";
};
type SpotLimitOrderSide = "buy" | "sell";
type SpotMarketOrderMode = "fill-or-refund" | "fill-or-rest-at-cap";
type NativeMarketAddressKind = AddressKind;
type NativeMarketAddressInput = string | {
    kind?: NativeMarketAddressKind;
    address: string;
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
interface PlaceLimitOrderViaArgs {
    /**
     * Operator the order routes through (`mono` bech32m user address). Its
     * fee registration (`lyth_operatorFeeConfig`) sets the surcharge skimmed
     * from the quote escrow.
     */
    operator: string;
    /** 32-byte base token id accepted by the CLOB precompile. */
    base: string;
    /** 32-byte quote token id accepted by the CLOB precompile. */
    quote: string;
    /** `buy` maps to side byte `0`; `sell` maps to side byte `1`. */
    side: SpotLimitOrderSide;
    /** Positive integer decimal string encoded as uint256 price. */
    price: string;
    /** Positive integer decimal string encoded as uint256 amount. */
    amount: string;
    /** Optional uint64 block height; omitted means `0` / no explicit expiry. */
    expiresAtBlock?: string | number | bigint;
}
/**
 * Wallet-display projection of the declared operator fee for a
 * {@link PlaceLimitOrderViaArgs} order, computed off-chain as
 * `quoteBasis * feeBps / 10_000` where `quoteBasis = price * amount`.
 *
 * Advisory only — the binding fee is skimmed on-chain at execution time
 * from the same `quoteBasis`. The fee is denominated in the quote token.
 */
interface OperatorFeeQuote {
    /** Operator the order routes through (`mono` bech32m). */
    operator: string;
    /** Declared operator fee in basis points (from `lyth_operatorFeeConfig`). */
    feeBps: number;
    /** `price * amount` (the quote-token basis the fee is skimmed from), decimal string. */
    quoteBasis: string;
    /** `quoteBasis * feeBps / 10_000`, floored, decimal string of quote-token atoms. */
    feeAmount: string;
}
/** A {@link MarketTransactionPlan} that also carries the declared operator fee. */
interface PlaceLimitOrderViaPlan extends MarketTransactionPlan {
    /** Off-chain operator-fee projection for wallet display. */
    operatorFee: OperatorFeeQuote;
}
/**
 * Decoded `OperatorFeeCharged` log (`0x100B`). Mirrors
 * `operator-router/src/events.rs::emit_operator_fee_charged_to_host`:
 * indexed `operator` / `user` / `marketId`; body `recipient`,
 * `quoteToken`, `feeAmount`, `clobOrderId`. `clobOrderId` joins the
 * router fee to the CLOB `OrderPlaced` / `OrderMatched` rows.
 */
interface OperatorFeeChargedEvent {
    /** Operator that charged the fee (`0x` 20-byte hex, indexed). */
    operator: string;
    /** User that paid the fee (`0x` 20-byte hex, indexed). */
    user: string;
    /** CLOB market id the order targets (`0x` 32 bytes, indexed). */
    marketId: string;
    /** Fee recipient configured by the operator (`0x` 20-byte hex). */
    recipient: string;
    /** Quote token the fee was skimmed in (`0x` 32 bytes). */
    quoteToken: string;
    /** Fee amount skimmed (quote-token atoms, decimal string). */
    feeAmount: string;
    /** CLOB order id the routed placement produced (`0x` 32 bytes). */
    clobOrderId: string;
}
/**
 * `lyth_operatorRouterConfig` response — the router's static posture.
 *
 * Mirrors the chain JSON exactly (camelCase). `enabled` reflects whether
 * the gateable router precompile is currently milestone-activated; the
 * read surfaces work regardless.
 */
interface OperatorRouterConfig {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** Data source — `"native_state_storage"`. */
    source: string;
    /** Router precompile address (`0x100B`). */
    routerAddress: string;
    /** On-chain protocol fee ceiling in bps (`100` = 1.00%). */
    protocolMaxOperatorFeeBps: number;
    /** `true` when the router precompile is milestone-activated. */
    enabled: boolean;
}
/**
 * `lyth_operatorFeeConfig` response — one operator's fee registration.
 *
 * Mirrors the chain JSON exactly (camelCase). A zero recipient is the
 * "operator not registered" sentinel on-chain, so the chain returns a
 * not-found error rather than this shape in that case.
 */
interface OperatorFeeConfig {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** Data source — `"native_state_storage"`. */
    source: string;
    /** Router precompile address (`0x100B`). */
    precompile: string;
    /** Operator the registration belongs to (`mono` bech32m). */
    operator: string;
    /** Configured fee recipient (`mono` bech32m). */
    recipient: string;
    /** Operator surcharge in basis points. */
    feeBps: number;
    /** `true` when the operator's surcharge is active. */
    enabled: boolean;
    /** Block height the operator was first registered at. */
    registeredAtBlock: number;
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
    /** Owner typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
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
    /** Market owner typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
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
    /** Caller typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
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
    /** Seller typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
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
    /** Buyer typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
    buyer: NativeMarketAddressInput;
    /** Current block attached to the native buy call. */
    currentBlock: string | number | bigint;
}
interface EncodeNativeNftCancelListingArgs {
    /** 32-byte native NFT listing id. */
    listingId: string;
    /** Caller typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
    caller: NativeMarketAddressInput;
}
interface EncodeNativeNftPlaceAuctionBidArgs {
    /** 32-byte native NFT auction listing id. */
    listingId: string;
    /** Bidder typed bech32m MonoAddress; optional object `kind` asserts the expected HRP. */
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
/** Three foundation-authorized per-market grid tuners share the
 *  same `(bytes32,bytes32,uint256)` shape: minNotional, tickSize,
 *  lotSize. They auto-create the market record if absent. */
interface MarketGridTuneArgs {
    baseTokenId: string;
    quoteTokenId: string;
    /** Decimal string of quote atoms (minNotional) or atoms-per-unit (tick/lot). */
    newValue: string;
}
declare function encodeSetMinNotionalCalldata(args: MarketGridTuneArgs): string;
declare function encodeSetTickSizeCalldata(args: MarketGridTuneArgs): string;
declare function encodeSetLotSizeCalldata(args: MarketGridTuneArgs): string;
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
/**
 * Encode `placeLimitOrderVia(address,bytes32,bytes32,uint8,uint256,
 * uint256,uint64)` calldata for the operator-fee router (`0x100B`).
 *
 * The argument layout mirrors the direct CLOB `placeLimitOrder` encoder
 * exactly, prefixed with the left-padded `operator` address word. The
 * router strips that leading word and forwards the remaining six fields
 * to the CLOB unchanged.
 */
declare function encodePlaceLimitOrderViaCalldata(args: PlaceLimitOrderViaArgs): string;
/**
 * Compute the off-chain declared operator fee for wallet display:
 * `quoteBasis * feeBps / 10_000` (floored) where `quoteBasis =
 * price * amount`. `feeBps` is the operator's registered fee
 * (`lyth_operatorFeeConfig`). Rejects a `feeBps` above the protocol
 * ceiling so a stale / hostile registration can't be displayed as valid.
 */
declare function quoteOperatorFee(args: Pick<PlaceLimitOrderViaArgs, "operator" | "price" | "amount">, feeBps: number): OperatorFeeQuote;
/**
 * Build a routed limit-order plan (`placeLimitOrderVia` against the
 * operator router at `0x100B`) plus the declared operator-fee projection
 * for wallet display.
 *
 * Two-spender approval model: the user must approve **two** spenders for
 * this order to succeed — the CLOB (`0x1001`) for the order's quote/base
 * escrow, AND the operator router (`0x100B`) for the fee skim. A wallet
 * surfacing this plan should prompt both approvals (or one combined
 * approval covering `quoteBasis + feeAmount`).
 */
declare function buildPlaceLimitOrderViaPlan(args: PlaceLimitOrderViaArgs, feeBps: number): PlaceLimitOrderViaPlan;
/**
 * Decode an `OperatorFeeCharged` log (`0x100B`) into a typed
 * {@link OperatorFeeChargedEvent}. `topics` is the log topic vector
 * (`topic0`, indexed `operator`, indexed `user`, indexed `marketId`);
 * `data` is the non-indexed ABI body
 * `(address recipient, bytes32 quoteToken, uint256 feeAmount, bytes32 clobOrderId)`.
 */
declare function decodeOperatorFeeChargedEvent(topics: readonly (string | Uint8Array | readonly number[])[], data: string | Uint8Array | readonly number[]): OperatorFeeChargedEvent;
declare function buildNativeCallForwarderArtifact(requestBytes: string | number | bigint): NativeCallForwarderArtifact;

/**
 * Oracle-precompile (`0x1009`) event decode types + read-method
 * signatures (MB-6).
 *
 * Mirrors `mono-core/crates/precompiles/platform/oracle/src/events.rs`:
 * the canonical event signatures and a pure decoder that turns one EVM
 * log (topics + data) into a typed {@link OracleEvent}. The decoder is
 * the exact inverse of the chain-side `emit_*` helpers.
 */
declare const ORACLE_EVENT_SIGS: {
    readonly oracleRoundFinalized: "OracleRoundFinalized(bytes32,uint64,uint256,uint64,uint32)";
    readonly observationSubmitted: "ObservationSubmitted(bytes32,uint64,address,uint256,uint64)";
    readonly feedAdded: "FeedAdded(bytes32,uint8,uint16,uint32,uint32)";
    readonly feedUpdated: "FeedUpdated(bytes32,uint8,uint16,uint32,uint32)";
    readonly oracleFraudSlashed: "OracleFraudSlashed(bytes32,uint64,address,bytes32)";
    readonly oracleAdminUpdated: "OracleAdminUpdated(address)";
    readonly oracleWriterAdded: "OracleWriterAdded(address,address)";
    readonly oracleWriterRemoved: "OracleWriterRemoved(address,address)";
};
declare class OracleEventError extends Error {
    constructor(message: string);
}
/** One active oracle writer in a {@link OracleSignersResponse}. */
interface OracleSignerRow {
    /** Writer address in the active global oracle signer roster (`mono` bech32m). */
    writer: string;
    /** Admin that last authorized this writer's membership (`mono` bech32m). */
    admin: string;
    /** Block height of the latest membership fold. */
    updatedAtBlock: number;
}
/**
 * `lyth_oracleSigners` response — the global oracle writer roster, folded
 * from `OracleWriterAdded` / `OracleWriterRemoved` by the oracle indexer
 * projection (MB-6).
 *
 * When the node runs without that projection it returns the graceful
 * fallback `{ status: "indexer_unavailable", writers: [] }` — `writers`
 * is always present so callers can iterate unconditionally; use
 * `lyth_oracleWriters(feedId)` for the per-feed writer set in that case.
 */
interface OracleSignersResponse {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** `"indexer_unavailable"` on the graceful-fallback path; absent when served. */
    status?: "indexer_unavailable";
    /** Data source — `"oracle_indexer_projection"`. */
    source: string;
    /** Oracle precompile address (`0x1009`). */
    precompile: string;
    /** Active writers; empty on the fallback path. */
    writers: OracleSignerRow[];
    /** Human-readable reason on the fallback path. */
    reason?: string;
}
/**
 * `lyth_oracleWriters` response — the allowed-writer roster for one feed
 * (MB-6), read from the feed-config writer list (`0x1009`).
 */
interface OracleWriters {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** Data source — `"native_state_storage"`. */
    source: string;
    /** Oracle precompile address (`0x1009`). */
    precompile: string;
    /** Feed the writers are scoped to (`0x` 32 bytes). */
    feedId: string;
    /** Allowed writer addresses (`mono` bech32m). */
    writers: string[];
}
/**
 * `lyth_oracleLatestPrice` response — the latest finalized round's median
 * for one feed (MB-6). A registered feed with no closed round yet returns
 * `round: 0`, `median: null`, `finalized: false`.
 */
interface OracleLatestPrice {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** Data source — `"native_state_storage"`. */
    source: string;
    /** Oracle precompile address (`0x1009`). */
    precompile: string;
    /** Feed id (`0x` 32 bytes). */
    feedId: string;
    /** Feed decimals. */
    decimals: number;
    /** Latest round id; `0` before the first round closes. */
    round: number;
    /** `true` once the latest round is finalized. */
    finalized: boolean;
    /** Finalized median (`0x`-hex `uint256`); `null` while unfinalized. */
    median: string | null;
    /** Block the latest round finalized at; `null` while unfinalized. */
    finalizedAtBlock: number | null;
}
/**
 * `lyth_oracleFeedConfig` response — one feed's decimals / heartbeat /
 * deviation-bps (circuit breaker) / min-signers config (MB-6).
 */
interface OracleFeedConfig {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** Data source — `"native_state_storage"`. */
    source: string;
    /** Oracle precompile address (`0x1009`). */
    precompile: string;
    /** Feed id (`0x` 32 bytes). */
    feedId: string;
    /** Feed decimals. */
    decimals: number;
    /** Minimum signers required to finalize a round. */
    minSigners: number;
    /** Max observation age (heartbeat) in seconds. */
    heartbeatSeconds: number;
    /** Circuit-breaker deviation bound in basis points. */
    deviationBps: number;
    /** Number of allowed writers configured for the feed. */
    allowedWritersLen: number;
}
/** Return the oracle precompile address (`0x1009`) as lower-case hex. */
declare function oracleAddressHex(): string;
/**
 * Domain tag mixed into {@link deriveFeedId}. Mirrors the chain constant
 * `FEED_ID_DOMAIN_TAG` (`mono-core/crates/precompiles/platform/oracle/src/lib.rs`).
 */
declare const FEED_ID_DOMAIN_TAG: "protocore-oracle/feed-id/v1";
/**
 * Derive the 32-byte oracle feed id (`0x`-hex) from a human pair name
 * (e.g. `"LYTH/USD"`) and the feed's display decimals.
 *
 * Byte-identical to the chain's `FeedId::derive(name, decimals)`:
 * `keccak256(FEED_ID_DOMAIN_TAG || name || [decimals])`, where `decimals`
 * is appended as a single raw byte (NOT a 32-byte word). Every oracle
 * read (`lyth_oracleLatestPrice`, `lyth_oracleFeedConfig`,
 * `lyth_oracleWriters`) takes this feed id, so this is the bridge from a
 * human pair name to the opaque id.
 *
 * @param name canonical pair name, e.g. `"LYTH/USD"` (UTF-8 bytes are hashed).
 * @param decimals feed decimals (`0..=255`).
 */
declare function deriveFeedId(name: string, decimals: number): string;
/**
 * Scale a finalized oracle median into a decimal price string, applying
 * the feed's `decimals`. Returns `null` when the latest round has not
 * finalized yet (`median === null`). The result is an exact base-10
 * string (no float rounding); trailing fractional zeros are trimmed.
 */
declare function formatOraclePrice(price: OracleLatestPrice): string | null;
/**
 * Convenience wrapper over {@link formatOraclePrice} returning a JS
 * `number`. Lossy for high-precision values — prefer
 * {@link formatOraclePrice} for display of large or high-decimal feeds.
 */
declare function oraclePriceToNumber(price: OracleLatestPrice): number | null;
/**
 * Typed view of one oracle-precompile log (MB-6). One variant per
 * chain-side emit helper. `feedId` / `evidenceHash` / address fields are
 * `0x`-prefixed hex; `computedMedian` / `value` are decimal strings of
 * their on-chain `uint256` value.
 */
type OracleEvent = {
    kind: "roundFinalized";
    feedId: string;
    roundId: bigint;
    computedMedian: string;
    finalizedAtBlock: bigint;
    observationsLen: number;
} | {
    kind: "observationSubmitted";
    feedId: string;
    roundId: bigint;
    writer: string;
    value: string;
    observedAt: bigint;
} | {
    kind: "fraudSlashed";
    feedId: string;
    roundId: bigint;
    writer: string;
    evidenceHash: string;
} | {
    kind: "feedAdded";
    feedId: string;
    decimals: number;
    minSigners: number;
    circuitBreakerBps: number;
    allowedWritersLen: number;
} | {
    kind: "feedUpdated";
    feedId: string;
    decimals: number;
    minSigners: number;
    circuitBreakerBps: number;
    allowedWritersLen: number;
} | {
    kind: "adminUpdated";
    admin: string;
} | {
    kind: "writerAdded";
    admin: string;
    writer: string;
} | {
    kind: "writerRemoved";
    admin: string;
    writer: string;
};
/**
 * Decode one EVM log emitted by the oracle precompile into a typed
 * {@link OracleEvent}. Pure + deterministic; dispatches on `topic0`,
 * then reads fixed-width 32-byte words.
 *
 * @throws {OracleEventError} on a foreign `topic0`, a topic-arity
 *   mismatch, or a data-length mismatch.
 */
declare function decodeOracleEvent(topics: readonly (string | Uint8Array | readonly number[])[], data: string | Uint8Array | readonly number[]): OracleEvent;

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
/**
 * GPU prover-market precompile address (`0x100C`).
 *
 * Final, registered slot. (The earlier first-pass guess of `0x1110`
 * assumed MB-5 took `0x1110` for a new precompile; MB-5 instead shipped
 * `attestDkgReshare` as a selector inside node-registry `0x1005`, so the
 * platform extension band's lowest free slot — `0x100C`, after the
 * operator router at `0x100B` — is where the prover market binds.) The
 * precompile is gateable + genesis-disabled per ADR-0015 §3; activation
 * is a foundation milestone flip, but the `lyth_*` read surfaces work
 * regardless.
 */
declare const PROVER_MARKET_ADDRESS: "0x000000000000000000000000000000000000100C";
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
/**
 * `lyth_getProofRequest` response — one proof-request record read
 * directly from the prover-market state tree (`0x100C`).
 *
 * Mirrors the chain JSON exactly (camelCase keys). Fee amounts are
 * `0x`-hex `uint256` strings; addresses are `mono` bech32m (null while
 * unset); hashes are `0x`-hex words. This is the exact-lookup shape; the
 * indexer-backed list rows ({@link ProofRequestRow}) carry a different
 * field set.
 */
interface ProofRequestView {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** Data source — `"native_state_storage"`. */
    source: string;
    /** Prover-market precompile address (`0x100C`). */
    precompile: string;
    /** Canonical request id (`0x` 32 bytes). */
    requestId: string;
    /** Lifecycle state name. */
    state: ProverMarketState | string;
    /** Lifecycle state wire byte (`0`..=`4`). */
    stateCode: number;
    /** Buyer (`mono` bech32m); `null` when unset. */
    buyer: string | null;
    /** Verification-key hash the proof must satisfy (`0x` 32 bytes). */
    vkeyHash: string;
    /** Public-inputs commitment (`0x` 32 bytes). */
    inputsHash: string;
    /** Maximum fee escrowed (`0x`-hex `uint256`). */
    maxFee: string;
    /** Deterministic Unix-seconds deadline. */
    deadlineUnixSeconds: number;
    /** Assigned prover (`mono` bech32m); `null` while Open/Expired. */
    assignedProver: string | null;
    /** Winning fee bid (`0x`-hex `uint256`); `0x0` while Open. */
    winningFee: string;
    /** Unix seconds of the last state transition. */
    stateAtUnixSeconds: number;
    /** Delivered proof hash (`0x` 32 bytes); zero until `submitProof`. */
    proofHash: string;
    /** Number of bids recorded against the request. */
    bidCount: number;
}
/**
 * `lyth_listProofRequests` row — one indexer-projection proof-request
 * record. Distinct from {@link ProofRequestView}: fee amounts here are
 * decimal atomic-unit strings (the indexer projection's wire form), and
 * the row carries `feePaid` + `createdAtBlock` instead of the
 * state-tree-only `inputsHash` / `stateCode` / `proofHash` fields.
 */
interface ProofRequestRow {
    /** Content-addressed request id (`0x` 32 bytes). */
    requestId: string;
    /** Requesting buyer (`mono` bech32m). */
    buyer: string;
    /** Verification-key hash bound to the request (`0x` 32 bytes). */
    vkeyHash: string;
    /** Maximum fee escrowed (decimal atomic-unit string). */
    maxFee: string;
    /** Deadline (unix seconds). */
    deadlineUnixSeconds: number;
    /** Lifecycle state name. */
    state: ProverMarketState | string;
    /** Assigned prover (`mono` bech32m); `null` until a winner is selected. */
    assignedProver: string | null;
    /** Winning fee (decimal atomic-unit string); `null` until assigned. */
    winningFee: string | null;
    /** Number of bids recorded against the request. */
    bidCount: number;
    /** Fee paid out on settlement (decimal atomic-unit string); `null` otherwise. */
    feePaid: string | null;
    /** Block height the request was first observed at. */
    createdAtBlock: number;
}
/**
 * `lyth_listProofRequests` response envelope.
 *
 * When the node runs without the prover-market indexer projection it
 * returns the graceful fallback `{ status: "indexer_unavailable", … }`
 * with an empty `requests` array — `requests` is always present so
 * callers can iterate unconditionally.
 */
interface ListProofRequestsResponse {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** `"indexer_unavailable"` on the graceful-fallback path; absent when served. */
    status?: "indexer_unavailable";
    /** Data source — `"prover_market_indexer_projection"`. */
    source: string;
    /** Prover-market precompile address (`0x100C`). */
    precompile: string;
    /** Echo of the lifecycle-state filter, when one was supplied. */
    stateFilter?: ProverMarketState | string | null;
    /** Echo of the page cap, when served. */
    limit?: number;
    /** Matching rows, newest-first. Empty on the fallback path. */
    requests: ProofRequestRow[];
    /** Human-readable reason on the fallback path. */
    reason?: string;
}
/**
 * `lyth_getProverBids` response — every recorded bid against one request,
 * read from the prover-market bid slots (`0x100C`).
 */
interface ProverBidsResponse {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** Data source — `"native_state_storage"`. */
    source: string;
    /** Prover-market precompile address (`0x100C`). */
    precompile: string;
    /** Request the bids target (`0x` 32 bytes). */
    requestId: string;
    /** Number of bids recorded. */
    bidCount: number;
    /** Recorded fee bids. */
    bids: ProverBidView[];
}
/** One prover fee bid in a {@link ProverBidsResponse}. */
interface ProverBidView {
    /** Slot index of this bid within the request's bid list. */
    index: number;
    /** Bidding prover (`mono` bech32m); must hold `SERVES_GPU_PROVE`. */
    prover: string;
    /** Fee bid (`0x`-hex `uint256`); must be `<= maxFee`. */
    fee: string;
}
/**
 * `lyth_proverMarketStatus` response — market-wide prover-market stats.
 *
 * `feeFloor` is the on-chain genesis singleton (always present, read
 * directly from `0x100C`). The aggregate counts come from the indexer
 * projection; when the node runs without it the response carries
 * `status: "indexer_unavailable"` and the count fields are `null`.
 */
interface ProverMarketStatusResponse {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** `"indexer_unavailable"` on the graceful-fallback path; absent when served. */
    status?: "indexer_unavailable";
    /** Data source — `"prover_market_indexer_projection"`. */
    source: string;
    /** Prover-market precompile address (`0x100C`). */
    precompile: string;
    /** Genesis-configured minimum prover fee (`0x`-hex `uint256`). */
    feeFloor: string;
    /** Requests in the `open` state; `null` on the fallback path. */
    openRequests: number | null;
    /** Requests in the `assigned` state; `null` on the fallback path. */
    assignedRequests: number | null;
    /** Requests in the `settled` state; `null` on the fallback path. */
    settledRequests: number | null;
    /** Requests in the `slashed` state; absent on the fallback path. */
    slashedRequests?: number | null;
    /** Requests in the `expired` state; absent on the fallback path. */
    expiredRequests?: number | null;
    /** Total requests observed; absent on the fallback path. */
    totalRequests?: number | null;
    /** Human-readable reason on the fallback path. */
    reason?: string;
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
 * Decoded `lyth_getSpendingPolicy` time-of-day window. `enabled` is
 * always `true` when present (the chain omits the object as `null` when
 * no window is configured). `[startHour, endHour]` are `0..=23`,
 * inclusive, and may wrap past midnight.
 */
interface SpendingPolicyTimeWindow {
    /** Always `true` when the window object is present. */
    enabled: boolean;
    /** Window start hour (`0..=23`). */
    startHour: number;
    /** Window end hour (`0..=23`). */
    endHour: number;
}
/**
 * `lyth_getSpendingPolicy` response — the §18.8 spending-policy view for
 * a sub-account, read directly from the spending-policy precompile slots
 * (`0x110C`).
 *
 * Mirrors the chain JSON exactly (camelCase keys). Caps are `0x`-hex
 * `uint256` strings; roots are `0x`-hex 32-byte words. `timeOfDayWindow`
 * is `null` when no window is configured; `expiryUnixSeconds` is `null`
 * when the policy never auto-expires. Note: the chain surfaces the policy
 * keyed by the controlled sub-account (`address`); the managing principal
 * is NOT part of this read shape.
 */
interface SpendingPolicyView {
    /** Response schema version (`1`). */
    schemaVersion: number;
    /** Data source — `"native_state_storage"`. */
    source: string;
    /** Spending-policy precompile address (`0x110C`). */
    precompile: string;
    /** Sub-account the policy controls (`mono` bech32m). */
    address: string;
    /** `true` when a policy is written for this sub-account. */
    exists: boolean;
    /** `true` when the policy exists and is not disabled. */
    enabled: boolean;
    /** Monotonic policy version; `0` means no policy is written. */
    version: number;
    /** Per-transaction cap (`0x`-hex `uint256`); `0x0` = no cap. */
    perTxCap: string;
    /** Daily spend cap (`0x`-hex `uint256`); `0x0` = no cap. */
    dailyCap: string;
    /** §18.8 per-week cap (`0x`-hex `uint256`); `0x0` = no weekly cap. */
    weeklyCap: string;
    /** §18.8 per-month cap (`0x`-hex `uint256`); `0x0` = no monthly cap. */
    monthlyCap: string;
    /** §18.8 category allow-list root (`0x` 32 bytes). */
    categoryAllowRoot: string;
    /** Destination allow-list Merkle root (`0x` 32 bytes). */
    destinationAllowRoot: string;
    /** Destination deny-list Merkle root (`0x` 32 bytes). */
    destinationDenyRoot: string;
    /** §18.8 decoded time-of-day window, or `null` if unset. */
    timeOfDayWindow: SpendingPolicyTimeWindow | null;
    /** §18.8 policy-expiry unix seconds; `null` = never expires. */
    expiryUnixSeconds: number | null;
}
declare class SpendingPolicyError extends Error {
    constructor(message: string);
}
declare function spendingPolicyAddressHex(): string;
/**
 * The "no constraint configured" sentinel root (`Hash::ZERO`, 32 zero
 * bytes). Feed this as `allowRoot` / `denyRoot` / `categoryAllowRoot` to
 * mean "allow any" for that dimension.
 */
declare const EMPTY_ROOT: Uint8Array;
/**
 * Build the destination allow/deny Merkle root for a SINGLE permitted (or
 * banned) counterparty.
 *
 * The chain's v1 spending-policy verifier
 * (`spending-policy/src/storage.rs` `destination_matches_root`) does a
 * flat equality check — `keccak256(dest_addr_20_bytes) == root` — so a
 * "root" is simply the keccak256 of the 20 raw address bytes, with NO
 * domain prefix and NO length prefix. There is currently NO multi-entry
 * Merkle path on-chain (see {@link setDestinationRoot}); a multi-leaf
 * root would be rejected for every member.
 *
 * @param address typed `mono` bech32m user address.
 * @returns the 32-byte root, ready for `SpendingPolicyArgs.allowRoot` / `.denyRoot`.
 */
declare function destinationRoot(address: string): Uint8Array;
/** Alias of {@link destinationRoot} — the byte construction is identical for allow and deny. */
declare const allowRootFor: typeof destinationRoot;
/** Alias of {@link destinationRoot} — the byte construction is identical for allow and deny. */
declare const denyRootFor: typeof destinationRoot;
/**
 * Build the category allow root for a SINGLE permitted transaction
 * category.
 *
 * The chain's v1 verifier
 * (`spending-policy/src/storage.rs` `category_matches_root`) checks
 * `keccak256(category_id) == root`, where `category_id` is the 4-byte
 * ABI selector the runtime extracts from the tx (`input[0..4]`).
 *
 * Accepts either the raw 4-byte selector (`Uint8Array` / number[] of
 * length 4) or a canonical function signature string (e.g.
 * `"transfer(address,uint256)"`), in which case the selector is derived
 * as `keccak256(utf8(sig))[0..4]` first. The returned root is
 * `keccak256(selector)` either way.
 */
declare function categoryRoot(selectorOrSig: Uint8Array | readonly number[] | string): Uint8Array;
/**
 * Build a destination allow/deny root from a list of counterparties.
 *
 * The chain's v1 verifier supports exactly ONE entry per root (a flat
 * `keccak256(member) == root` check). Multi-entry sets require the chain
 * v1.5 inline-list / Merkle-membership work that is NOT yet shipped, so
 * this helper throws on more than one entry rather than emit a root the
 * chain would silently reject for every member.
 *
 * @returns {@link EMPTY_ROOT} for an empty list, else
 *   {@link destinationRoot} of the single entry.
 */
declare function setDestinationRoot(entries: readonly string[]): Uint8Array;
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
 * Hierarchical name-registry precompile (`0x110E`) helpers — pricing +
 * calldata encoders.
 *
 * Mirrors `mono-core/crates/precompiles/platform/name-registry-hierarchical`:
 * the U-curve registration cost (`ops.rs` / `validate.rs`) and the frozen
 * `register` / `proposeTransfer` / `acceptTransfer` ABI signatures
 * (`abi.rs`). Reads (forward `lyth_resolveName`, reverse `lyth_nameOf`,
 * availability) live on `RpcClient`; this module is the write/pricing side.
 *
 * The chain re-validates every name on submit, so the client-side
 * structural parse here is for accurate pricing + fast UX feedback, not a
 * security boundary.
 */
declare class NameRegistryError extends Error {
    constructor(message: string);
}
type NameCategory = "human" | "agent" | "cluster" | "contract" | "system";
/** Frozen 4-byte selectors, `keccak256(signature)[0..4]`. */
declare const NAME_REGISTRY_SELECTORS: {
    readonly register: string;
    readonly proposeTransfer: string;
    readonly acceptTransfer: string;
};
/** Per-category base multiplier (`validate.rs` `base_multiplier`). `system` is not user-registerable. */
declare const NAME_BASE_MULTIPLIER: Record<Exclude<NameCategory, "system">, number>;
/** Fallback fee unit when the block base fee reads zero (`ops.rs` `FALLBACK_FEE_UNIT_LYTHOSHI`); 18-decimal value per ADR-0037. */
declare const NAME_FALLBACK_FEE_UNIT_LYTHOSHI = 1000000000000n;
declare const NAME_MAX_LEN = 80;
declare const NAME_LABEL_MIN_LEN = 1;
declare const NAME_LABEL_MAX_LEN = 63;
/** Structural parse result used for pricing. */
interface ParsedName {
    category: NameCategory;
    /** Length of the left-most (primary) label — the U-curve length input. */
    primaryLabelLen: number;
}
/** A live registration quote (see {@link RpcClient.quoteNameRegistration}). */
interface NameRegistrationQuote {
    name: string;
    category: NameCategory;
    primaryLabelLen: number;
    /** Live fee unit (block base fee in lythoshi, or the fallback). */
    feeUnitLythoshi: bigint;
    /** Total registration cost in lythoshi; tx value must equal this exactly. */
    costLythoshi: bigint;
}
/** Return the name-registry precompile address (`0x110E`) as lower-case hex. */
declare function nameRegistryAddressHex(): string;
/**
 * U-curve length multiplier ×10 (`validate.rs` `length_modifier_x10`).
 * `null` for a label length outside `1..=63`.
 */
declare function nameLengthModifierX10(labelLen: number): number | null;
/**
 * Structural parse of a `*.mono` name into `{ category, primaryLabelLen }`
 * (the U-curve pricing inputs). Mirrors the structural arm of the chain's
 * `parse_and_validate`: label charset `[a-z0-9-]`, no leading/trailing/
 * double hyphen, label length `1..=63`, whole name `<=80`, must end in
 * `mono`. Category is decided by structure:
 * `<x>.mono`=human, `<x>.cluster.mono`/`.contract.mono`/`.system.mono`,
 * `<x>.agent.<human>.mono`=agent. Does NOT enforce the forbidden-prefix
 * list (a submit-time visual-impersonation guard) — the chain does.
 *
 * @throws {NameRegistryError} on a structurally invalid name.
 */
declare function parseNameCategory(name: string): ParsedName;
/**
 * U-curve registration cost in lythoshi (`ops.rs`
 * `registration_cost_lythoshi_with_unit`): `base × (modX10) × feeUnit / 10`
 * (integer arithmetic, multiply-before-divide to match the chain).
 *
 * @throws {NameRegistryError} for a `system` name (not user-registerable)
 *   or a primary label length outside `1..=63`.
 */
declare function nameRegistrationCost(category: NameCategory, primaryLabelLen: number, feeUnitLythoshi: bigint): bigint;
/**
 * Encode `register(string,address)` calldata for `0x110E`.
 *
 * For human/agent/contract names the precompile uses the CALLER as owner,
 * so `owner` defaults to the zero address. Submit as tx data to
 * `0x110E` with `value` exactly equal to the {@link nameRegistrationCost}
 * (else the precompile reverts `IncorrectFee`).
 *
 * @param owner 20-byte owner address (raw bytes / `0x`-hex); default zero.
 */
declare function encodeNameRegisterCall(name: string, owner?: string | Uint8Array | readonly number[]): string;
/** Encode `proposeTransfer(string,address)` calldata for `0x110E`. */
declare function encodeNameProposeTransferCall(name: string, recipient: string | Uint8Array | readonly number[]): string;
/** Encode `acceptTransfer(string)` calldata for `0x110E`. */
declare function encodeNameAcceptTransferCall(name: string): string;

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
    /**
     * Node head height at query time. Confirmation depth =
     * `latestHeight - blockNumber + 1`. Returned by the chain on the found
     * arm (`lyth_txStatus`); see {@link RpcClient.lythTxConfirmations}.
     */
    latestHeight: number;
    /** `true` when the serving node has the indexer enabled. */
    indexerEnabled?: boolean;
    /** Serving provider kind (e.g. `"indexer"` / `"node"`). */
    providerKind?: string;
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
    /** Authoring authority index (u16). */
    author: number;
    /** Parent vertex references (DAG edges). */
    parentRefs?: Array<{
        blockHash: string;
        round: number;
    }>;
    payloadHash?: string;
    transactionsRoot?: string;
    stateRootPrev?: string;
    /** Vertex author-stamped timestamp (ms). */
    timestampMs?: number;
    authorSignature?: string;
    /** Local ingest timestamp (ms). */
    ingestedAtMs?: number;
    /** Data-availability state of the vertex payload. */
    dacState?: "certified" | "missing" | "unavailable" | string;
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
/** `lyth_clusterApr` response — observed APR for a cluster over a rolling window. */
interface ClusterAprResponse {
    clusterId: number;
    /** Window the APR was measured over (block heights). */
    blocks: {
        from: bigint;
        to: bigint;
        window: bigint;
    };
    /** Cumulative reward index at `blocks.from` (`0x`-hex uint256). */
    rewardIndexFromHex: string;
    /** Cumulative reward index at `blocks.to` (`0x`-hex uint256). */
    rewardIndexToHex: string;
    /** `rewardIndexTo - rewardIndexFrom` (`0x`-hex uint256). */
    deltaIndexHex: string;
    /** Fixed-point scale for the reward index (decimal string, `1e18`). */
    rewardIndexScale: string;
    /** Delegator weight basis-points total for the cluster. */
    totalBps: number;
    /** Blocks per year used to annualize (ADR-0031 cadence). */
    blocksPerYear: bigint;
    /** Reference stake-per-bps ratio (lythoshi). */
    stakePerBpsLythoshi: bigint;
    /** Baseline annualized rate in basis points. `0` when no reward accrued in the window. */
    aprBps: bigint;
}
/** `lyth_resolveName` response — forward name → address resolution. */
interface ResolveNameResponse {
    /** The (lower-cased) name that was resolved. */
    name: string;
    /** Owner address (`mono` bech32m), or `null` when the name is unregistered. */
    address: string | null;
    category: "human" | "agent" | "cluster" | "contract" | "system" | string;
    /** Block the name was registered at, or `null` when unregistered. */
    registeredAtBlock: number | null;
    /**
     * Block selector the read was answered at. A `string` for tags/hashes
     * (e.g. `"latest"`), a `number` when a numeric/hex height was requested
     * (`block_id_to_json` emits a number for `BlockId::Number`).
     */
    block: string | number;
}
/** `lyth_nameOf` response — reverse address → name resolution. */
interface NameOfResponse {
    /** Queried address (`mono` bech32m). */
    address: string;
    /** The address's reverse name, or `null` when none is set. */
    name: string | null;
    /** Block selector the read was answered at (string for tags, number for heights). */
    block: string | number;
}
/** `lyth_getClusterName` response — reverse cluster id → canonical name. */
interface ClusterNameResponse {
    clusterId: number;
    /** Canonical cluster name, or `null` when unnamed. */
    name: string | null;
    /** Block selector the read was answered at (string for tags, number for heights). */
    block: string | number;
}
/** `lyth_circulatingSupply` response. All amounts are decimal lythoshi strings (u128). */
interface CirculatingSupplyResponse {
    circulatingSupplyLythoshi: string;
    initialSupplyLythoshi: string;
    /** H1/#60 — cumulative minted native LYTH (block rewards). */
    totalMintedLythoshi: string;
    totalBurnedLythoshi: string;
}
/** `lyth_totalBurned` response. Amount is a decimal lythoshi string (u128). */
interface TotalBurnedResponse {
    totalBurnedLythoshi: string;
}
/** `lyth_totalMinted` response — cumulative minted native LYTH from block rewards (decimal lythoshi string, H1/#60). */
interface TotalMintedResponse {
    totalMintedLythoshi: string;
}
/** `lyth_totalSupply` response — authoritative supply accounting (H1/#60). `current = initial + minted − burned`. */
interface TotalSupplyResponse {
    initialSupplyLythoshi: string;
    totalMintedLythoshi: string;
    totalBurnedLythoshi: string;
    currentSupplyLythoshi: string;
}
/** `lyth_swapIntentStatus` response — bridge swap-intent / DKG-reshare lifecycle. */
interface SwapIntentStatus {
    schemaVersion: number;
    /**
     * Intent id (u64, capped 2^56-1 by the chain). Emitted as a JSON number,
     * so ids beyond 2^53 (JS safe-int) lose precision in transit — realistic
     * ids are small monotonic counters. The request side accepts bigint/hex.
     */
    intentId: number;
    status: "not_found" | "pending" | "attested" | "ready" | "stalled" | string;
    found: boolean;
    operatorId?: string;
    sourcePubkey?: string;
    destinationPubkey?: string;
    sourceEpoch?: number;
    effectiveEpoch?: number;
    dkgAttested?: boolean;
    currentEpoch: number;
    latestHeight: number;
}
/** Derived per-tx confirmation depth (see {@link RpcClient.lythTxConfirmations}). */
interface TxConfirmations {
    status: "found" | "not_found";
    /** `latestHeight - blockNumber + 1` when found, else `null`. */
    confirmations: number | null;
    blockNumber: number | null;
    latestHeight: number;
}
/** A token-balance row joined with its MRC metadata (or `null` when unknown). */
type TokenBalanceWithMetadata = TokenBalanceRecord & {
    metadata: MrcMetadataRecord | null;
};
/** Base/quote asset metadata for a CLOB market (`null` when the indexer has no row). */
interface ClobMarketAssets {
    base: MrcMetadataRecord | null;
    quote: MrcMetadataRecord | null;
}
/** Quote-notional liquidity aggregated from an order book (raw quote atomic units, decimal strings). */
interface QuoteLiquidity {
    bidQuote: string;
    askQuote: string;
    totalQuote: string;
}
/** An {@link AddressActivityEntry} enriched with block time, tx hash, and resolved cluster name. */
type AddressActivityEntryEnriched = AddressActivityEntry & {
    /** Block header timestamp (UNIX seconds), or `null` when the block read failed. */
    blockTimestampSeconds: bigint | null;
    /** Canonical tx hash resolved from `(blockHeight, txIndex)`, or `null`. */
    txHash: string | null;
    /** Resolved cluster name when the row carries a cluster id, else `null`. */
    clusterName: string | null;
};
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
    /**
     * `eth_feeHistory` — base-fee + gas-used history.
     *
     * The chain's eth-compat surface serializes the base-fee window under the
     * camelCase key `baseFeePerGas`. Internally the chain header field is
     * `base_fee_per_gas`; this method asserts the on-the-wire response actually
     * carries the expected `baseFeePerGas` array and fails LOUD if the field is
     * missing or has drifted to snake_case `base_fee_per_gas`. Without this
     * guard a future rename would silently collapse the base fee to an empty
     * array and over-/under-quote fees (e.g. name registration would fall back
     * to the placeholder fee unit and revert `IncorrectFee` on submit).
     */
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
    lythGetClusterDiversity(clusterId: number): Promise<ClusterDiversityView>;
    /**
     * PF-6 — `lyth_getOperatorNetworkMetadata`: ASN/geo/hosting-class/IP/PCR
     * for a peer. `operatorId` is the 32-byte operator/peer id as `0x…` hex
     * (the form `lyth_operatorInfo` returns).
     */
    lythGetOperatorNetworkMetadata(operatorId: string): Promise<OperatorNetworkMetadataView>;
    /**
     * MB-6 — `lyth_oracleSigners`: the global oracle writer roster (folded
     * from `OracleWriterAdded` / `OracleWriterRemoved`). Returns the
     * `{ status: "indexer_unavailable", writers: [] }` fallback when the
     * node runs without the oracle writer-roster indexer projection.
     */
    lythOracleSigners(): Promise<OracleSignersResponse>;
    /** MB-6 — `lyth_oracleWriters`: the allowed writer set for a feed. */
    lythOracleWriters(feedId: string): Promise<OracleWriters>;
    /** MB-6 — `lyth_oracleLatestPrice`: the latest finalized median for a feed. */
    lythOracleLatestPrice(feedId: string): Promise<OracleLatestPrice>;
    /** MB-6 — `lyth_oracleFeedConfig`: a feed's decimals / min-signers / circuit-breaker config. */
    lythOracleFeedConfig(feedId: string): Promise<OracleFeedConfig>;
    /** MB-4 — `lyth_getProofRequest`: a single GPU prover-market proof request. */
    lythGetProofRequest(requestId: string): Promise<ProofRequestView>;
    /**
     * MB-4 — `lyth_listProofRequests`: open/recent prover-market proof
     * requests. Params are `[stateFilter?, limit?]` (the chain's order),
     * where `stateFilter` is one of `open|assigned|settled|slashed|expired`.
     * Returns the `{ status: "indexer_unavailable", requests: [] }` fallback
     * when the node runs without the prover-market indexer projection.
     */
    lythListProofRequests(stateFilter?: string | null, limit?: number): Promise<ListProofRequestsResponse>;
    /** MB-4 — `lyth_getProverBids`: the fee bids placed on one proof request. */
    lythGetProverBids(requestId: string): Promise<ProverBidsResponse>;
    /**
     * MB-4 — `lyth_proverMarketStatus`: prover-market summary. `feeFloor` is
     * always present (on-chain genesis singleton); the aggregate counts are
     * `null` on the `{ status: "indexer_unavailable" }` fallback path.
     */
    lythProverMarketStatus(): Promise<ProverMarketStatusResponse>;
    /**
     * Operator-router — `lyth_operatorRouterConfig`: the router's static
     * posture (`0x100B` address, the protocol fee ceiling, and whether the
     * gateable router precompile is currently milestone-activated).
     */
    lythOperatorRouterConfig(): Promise<OperatorRouterConfig>;
    /**
     * Operator-router — `lyth_operatorFeeConfig`: one operator's fee
     * registration (recipient, fee bps, enabled flag, registered-at block).
     * `operator` is a `mono` bech32m user address.
     */
    lythOperatorFeeConfig(operator: string): Promise<OperatorFeeConfig>;
    /**
     * MB-2 — `lyth_bridgeHealth`: a paged set of bridge-record health
     * envelopes. Each record carries the circuit-breaker posture
     * (`defaultDrainCapPerWindow`, `defaultDrainWindowBlocks`, `paused`,
     * `pausedAtBlock`, `resumeCooldownBlocks`). Params are `[cursor?, limit?]`
     * (the chain pages the global bridge set; there is no single-bridge form).
     */
    lythBridgeHealth(cursor?: string | null, limit?: number): Promise<BridgeHealthResponse>;
    /**
     * MB-2 — `lyth_bridgeDrainStatus`: the live per-route circuit-breaker
     * drain bucket for one `(bridgeId, wrappedAsset)` route. `bridgeId` is a
     * 32-byte `0x…` hex id; `wrappedAsset` is a `mono` bech32m user address.
     */
    lythBridgeDrainStatus(bridgeId: string, wrappedAsset: string): Promise<BridgeDrainStatus>;
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
    /**
     * `lyth_clusterApr` — observed APR for a cluster over a rolling window.
     * `windowBlocks` defaults to the chain's 1200-block (~1h) window and is
     * server-clamped to `[10, 86_400]`.
     */
    lythClusterApr(clusterId: number, windowBlocks?: number): Promise<ClusterAprResponse>;
    /** `lyth_resolveName` — forward name → address resolution (0x110E). */
    lythResolveName(name: string, block?: BlockSelector): Promise<ResolveNameResponse>;
    /** `lyth_nameOf` — reverse address → name resolution. */
    lythNameOf(address: string, block?: BlockSelector): Promise<NameOfResponse>;
    /** `lyth_getClusterName` — reverse cluster id → canonical name. */
    lythGetClusterName(clusterId: number, block?: BlockSelector): Promise<ClusterNameResponse>;
    /**
     * Convenience over {@link lythResolveName}: `true` when a well-formed
     * name is unregistered. A malformed name throws `RpcError`
     * (`InvalidParams`) rather than returning `true`, so the UI should treat
     * a thrown validation error distinctly from "taken".
     */
    lythIsNameAvailable(name: string, block?: BlockSelector): Promise<boolean>;
    /**
     * Live name-registration quote: parses the name's category + primary
     * label length, reads the chain's base fee unit via `eth_feeHistory`
     * (the bare `baseFeePerGas` — NOT `eth_gasPrice`, which adds the tip and
     * would over-quote), and applies the U-curve. The resulting
     * `costLythoshi` is what the `register` tx `value` must equal exactly
     * (else the precompile reverts `IncorrectFee`).
     */
    quoteNameRegistration(name: string, block?: BlockSelector): Promise<NameRegistrationQuote>;
    /** `lyth_circulatingSupply` — native LYTH circulating / initial / burned (decimal lythoshi strings). */
    lythCirculatingSupply(): Promise<CirculatingSupplyResponse>;
    /** `lyth_totalBurned` — cumulative burned native LYTH (decimal lythoshi string). */
    lythTotalBurned(): Promise<TotalBurnedResponse>;
    /** `lyth_totalMinted` — cumulative minted native LYTH from block rewards (decimal lythoshi string, H1/#60). */
    lythTotalMinted(): Promise<TotalMintedResponse>;
    /** `lyth_totalSupply` — authoritative supply accounting: `{ initial, minted, burned, current }` (H1/#60). */
    lythTotalSupply(): Promise<TotalSupplyResponse>;
    /** `lyth_swapIntentStatus` — bridge swap-intent / DKG-reshare lifecycle for one intent id. */
    lythSwapIntentStatus(intentId: number | bigint | string): Promise<SwapIntentStatus>;
    /**
     * Per-tx confirmation depth, derived from `lyth_txStatus` (which returns
     * both the tx's `blockNumber` and the node `latestHeight`).
     */
    lythTxConfirmations(txHash: string): Promise<TxConfirmations>;
    /**
     * Resolve a user-pasted MRC token id to its metadata (name/symbol/
     * decimals), for an "add custom token" flow. Returns `null` for an
     * unknown/untracked id. Performs light client-side format validation
     * (32-byte hex) for fast UX feedback; the chain re-validates regardless.
     */
    lythResolveTokenMetadata(rawTokenId: string): Promise<MrcMetadataRecord | null>;
    /**
     * `lyth_getTokenBalances` joined with per-token MRC metadata. Balances
     * are PUBLIC-only by construction (private-denomination balances are
     * excluded by the chain). Raw `balance` strings are preserved (apply
     * `metadata.decimals` client-side for display).
     */
    lythGetTokenBalancesWithMetadata(address: string): Promise<TokenBalanceWithMetadata[]>;
    /**
     * Resolve a CLOB market's base/quote asset metadata (symbol/name/
     * decimals) by joining `lyth_clobMarket` to `lyth_mrcMetadata`. Either
     * side may be `null` when the indexer has no MRC row (e.g. native LYTH).
     */
    resolveClobMarketAssets(marketId: string): Promise<ClobMarketAssets>;
    /**
     * `lyth_getAddressActivity` enriched with each row's block timestamp,
     * canonical tx hash (resolved from `(blockHeight, txIndex)`), and
     * resolved cluster name. Issues one block read per distinct height and
     * one name read per distinct cluster.
     */
    enrichAddressActivity(address: string, limit?: number, cursor?: string | null): Promise<AddressActivityEntryEnriched[]>;
    /**
     * Read a block's header timestamp (UNIX seconds) and ordered tx-hash
     * array via the raw `eth_getBlockByNumber` (hash-only mode). The typed
     * `ethGetBlockByNumber` wrapper drops the `transactions` array, so this
     * uses the raw call.
     */
    private blockTimeAndTxHashes;
}
/**
 * Annualized cluster yield as a percentage, from a {@link ClusterAprResponse}
 * (`aprBps / 100`; 10_000 bps = 100%). Safe for realistic basis-point
 * magnitudes.
 */
declare function clusterApyPercent(apr: ClusterAprResponse): number;
/**
 * Quote-notional liquidity from a CLOB order book: `sum(price * size)`
 * over each side, in raw quote atomic units (decimal strings). Apply the
 * quote asset's decimals client-side for display.
 */
declare function computeQuoteLiquidity(book: ClobOrderBookResponse): QuoteLiquidity;
/**
 * Rank CLOB markets by total base volume (descending), assigning a 1-based
 * `volumeRank`. Ranks the supplied set only (e.g. the ≤100 markets
 * `lyth_clobMarkets` returns); volume is base atomic units, not
 * quote-normalized.
 */
declare function rankMarketsByVolume(markets: ReadonlyArray<ClobMarketSummary>): Array<ClobMarketSummary & {
    volumeRank: number;
}>;
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
/**
 * A built plaintext submission — the bincode-encoded chain-side
 * `SignedTransaction` (`0x`-prefixed hex) ready to hand to
 * `mesh_submitTx`, plus the canonical hashes the wallet validates the
 * node echo against.
 *
 * Mirrors the chain-side artefacts produced by the Rust SDK's
 * `build_chain_signed_tx` (`mono-core/crates/core/sdk/src/tx.rs`): the
 * ML-DSA-65 signature is taken over the canonical chain-side `sighash`
 * (keccak-256 of the 0x01-tagged preimage) and the canonical native tx
 * hash is the keccak-256 of the 0x02-tagged preimage with the signature
 * and public key appended.
 */
interface PlaintextSubmission {
    /** Bincode `SignedTransaction` wire bytes, `0x`-prefixed. */
    signedTxWireHex: string;
    /** Canonical native tx hash the node echoes on admission. */
    innerTxHashHex: string;
    /** Canonical chain-side sighash that was signed. */
    innerSighashHex: string;
    /** Length in bytes of the bincode `SignedTransaction`. */
    innerWireBytes: number;
}
declare function fetchEncryptionKey(client: RpcClient): Promise<EncryptionKey>;
/**
 * Error message returned when an encrypted-mempool submission is attempted.
 *
 * The encrypted-submit path is gated OFF until the chain's MB-3 Ferveo
 * threshold decryption is live (see {@link buildEncryptedSubmission}).
 */
declare const ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE = "encrypted mempool submission unavailable until MB-3 threshold decryption is active";
/**
 * Encrypted-mempool submission is GATED OFF.
 *
 * The single-key ML-KEM-768 `scheme: 0` envelope this used to build is the
 * RETIRED scheme: a single operator holding the cluster decryption key could
 * decrypt the inner transaction, violating the threshold-privacy guarantee
 * the encrypted mempool promises. The live chain runs with plaintext
 * submission as the default and does NOT run threshold decryption yet, so
 * there is no safe encrypted path to emit.
 *
 * This helper therefore refuses to build any envelope and throws. It never
 * produces a `scheme: 0` (or any) envelope, so a wallet can never be tricked
 * into believing its transaction is privately decryptable by a threshold of
 * operators when it is in fact decryptable by one.
 *
 * Use {@link buildPlaintextSubmission} / {@link submitPlaintextTransaction}
 * (the unaffected default path) for transaction submission.
 *
 * TODO(MB-3): when the chain activates MB-3 threshold decryption, port the
 * chain's Ferveo `scheme = 2` path here — the `ThresholdPubkey` is a 96-byte
 * BLS12-381 G1 element fetched from `lyth_getEncryptionKey`, and the inner tx
 * is encrypted to that threshold public key (not a single ML-KEM-768
 * encapsulation key). Only then may an envelope be emitted again.
 *
 * @throws always — the encrypted path is unavailable.
 */
declare function buildEncryptedSubmission(_args: {
    backend: MlDsa65Backend;
    tx: NativeEvmTxFields;
    encryptionKey: EncryptionKey;
    class?: MempoolClass;
}): Promise<EncryptedSubmission>;
declare function submitEncryptedEnvelope(client: RpcClient, envelopeWireHex: string): Promise<string>;
/**
 * Build a PLAINTEXT submission — the opt-OUT-of-privacy counterpart to
 * {@link buildEncryptedSubmission}.
 *
 * Unlike the encrypted path, this never engages the Ferveo
 * threshold-decrypt pipeline. It re-shapes the native tx into the
 * chain-side `SignedTransaction`, signs over the canonical `sighash`
 * with the ML-DSA-65 backend, bincode-serializes the result, and
 * `0x`-hex-encodes it. The bytes are forwarded verbatim through
 * `mesh_submitTx` (the node routes them to `MempoolTx::plaintext` via
 * `submit_raw`) — the functional inclusion path on a chain running with
 * `encrypted_mempool_required = false`.
 *
 * Mirrors `TxClient::submit_plaintext` in the Rust SDK.
 */
declare function buildPlaintextSubmission(args: {
    backend: MlDsa65Backend;
    tx: NativeEvmTxFields;
}): PlaintextSubmission;
/**
 * Submit a bincode-encoded chain-side `SignedTransaction` (`0x`-hex)
 * through the plaintext `mesh_submitTx` path and validate the node's
 * echoed canonical tx hash against the locally computed one.
 *
 * Mirrors the validation in `TxClient::submit_plaintext`: the node
 * echoes the 32-byte canonical native tx hash on admission, and any
 * mismatch (or non-32-byte response) is rejected loud so a wallet never
 * trusts a hash it did not derive itself.
 *
 * @returns the validated canonical native tx hash (`0x`-prefixed).
 */
declare function submitPlaintextTransaction(client: RpcClient, signedTxWireHex: string, expectedTxHashHex: string): Promise<string>;
/**
 * Build, sign, and submit a native transaction with an explicit
 * encryption toggle. `private == false` (the default for the RC testnet
 * / operator posture) routes through the plaintext `mesh_submitTx`
 * path; `private == true` routes through the encrypted pipeline.
 * Wallets wire a UI privacy toggle straight onto `private`.
 *
 * Mirrors `TxClient::build_sign_submit_with_privacy` in the Rust SDK.
 * The default is PLAINTEXT and is fully supported.
 *
 * MB-3 gate: `private === true` is currently UNAVAILABLE — the encrypted
 * path throws {@link ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE} via
 * {@link buildEncryptedSubmission} because the chain does not yet run
 * Ferveo threshold decryption and the retired single-key scheme is unsafe.
 * Keep wallet privacy toggles disabled until MB-3 activates.
 *
 * @returns for the plaintext path, the node-echoed-and-validated canonical
 *   native tx hash (`0x`-prefixed).
 * @throws when `private === true` (encrypted submission unavailable).
 */
declare function submitTransactionWithPrivacy(args: {
    client: RpcClient;
    backend: MlDsa65Backend;
    tx: NativeEvmTxFields;
    private: boolean;
    encryptionKey?: EncryptionKey;
    class?: MempoolClass;
}): Promise<string>;

export { type AddressActivityKindResponse as $, type ApiStreamsIndexResponse as A, type BlockSelector as B, type ChainStatsResponse as C, type NativeEvmTxFields as D, type EncryptionKey as E, MempoolClass as F, type TypedAddress as G, RpcClient as H, MlDsa65Backend as I, type AddressKind as J, ADDRESS_HRP as K, ADDRESS_KIND_HRPS as L, type MrcMetadataResponse as M, type NativeReceiptFee as N, type OperatorCapabilitiesResponse as O, type PendingRewardsResponse as P, API_STREAM_TOPICS as Q, type RuntimeBuildProvenance as R, type SearchResponse as S, type TxFeedResponse as T, type AccountPolicy as U, type AccountProofResponse as V, type Address as W, type AddressActivityArchiveRedirect as X, type AddressActivityEntry as Y, type AddressActivityEntryEnriched as Z, type AddressActivityKind as _, type RuntimeUpgradeStatus as a, type ClobTrade as a$, type AddressActivityKindRetention as a0, AddressError as a1, type AddressLabelRecord as a2, type AddressValidation as a3, type AgentReputationCategoryScope as a4, type AgentReputationRecord as a5, type AgentReputationResponse as a6, type ApiStreamTopic as a7, type ApiStreamTopicMetadata as a8, type ApiStreamTopicRetention as a9, BridgeRouteCatalogueError as aA, type BridgeRouteCatalogueJsonOptions as aB, type BridgeRouteCataloguePayload as aC, type BridgeRouteCatalogueRoute as aD, type BridgeRouteCatalogueValidation as aE, type BridgeRouteDisclosure as aF, type BridgeRouteSelection as aG, type BridgeRoutesSource as aH, type BridgeTransferIntent as aI, type BridgeTransferRequest as aJ, type BridgeVerifierDisclosure as aK, CHAIN_REGISTRY as aL, CHAIN_REGISTRY_RAW_BASE as aM, CLOB_MARKET_ID_DOMAIN_TAG as aN, CLOB_SELECTORS as aO, CLUSTER_FORMED_EVENT_SIG as aP, type CancelPendingChangeCalldataArgs as aQ, type CancelSpotOrderArgs as aR, type CapabilitiesResponse as aS, type CapabilityDescriptor as aT, type ChainInfo as aU, type ChainRegistry as aV, type CheckpointRecord as aW, type CirculatingSupplyResponse as aX, type ClobMarketAssets as aY, type ClobMarketRecord as aZ, type ClobMarketSummary as a_, type AssetPolicy as aa, type AttestDkgReshareCalldataArgs as ab, type AttestationWindow as ac, BRIDGE_QUOTE_API_BLOCKED_REASON as ad, BRIDGE_REVERT_TAGS as ae, BRIDGE_SELECTORS as af, BRIDGE_SUBMIT_API_BLOCKED_REASON as ag, type BlockHeader as ah, type BlockTag as ai, type BlsCertificateResponse as aj, type BridgeAdminControl as ak, type BridgeAnchorState as al, type BridgeBreakerState as am, type BridgeBytesInput as an, type BridgeCircuitBreakerFields as ao, type BridgeCircuitBreakerState as ap, type BridgeDrainCap as aq, type BridgeDrainStatus as ar, type BridgeHealthRecord as as, type BridgeHealthResponse as at, BridgePrecompileError as au, type BridgeQuoteSubmitReadiness as av, type BridgeRiskTier as aw, type BridgeRouteAssessment as ax, type BridgeRouteCandidate as ay, type BridgeRouteCatalogue as az, type NativeReceiptResponse as b, type MarketTransactionPlan as b$, type ClusterAprResponse as b0, type ClusterDelegatorsResponse as b1, type ClusterDirectoryEntryResponse as b2, type ClusterDirectoryPageResponse as b3, type ClusterDiversity as b4, type ClusterDiversityView as b5, type ClusterEntityResponse as b6, type ClusterFormedEvent as b7, type ClusterMemberResponse as b8, type ClusterNameResponse as b9, type EncodeNativeSpotLimitOrderArgs as bA, type EncodeNativeSpotSettleLimitOrderArgs as bB, type EncodeNativeSpotSettleRoutedLimitOrderArgs as bC, type EncryptionKeyResponse as bD, type EntityRatchetResponse as bE, type EthSendTransactionRequest as bF, type ExecutionUnitPriceResponse as bG, type ExplorerEndpoint as bH, FEED_ID_DOMAIN_TAG as bI, type FeeHistoryResponse as bJ, type GapRange as bK, type GapRecord as bL, type GapRecordsResponse as bM, type Hash as bN, type Hex as bO, type IndexerStatus as bP, type JailStatusWindow as bQ, type KeyRotationWindow as bR, type ListProofRequestsResponse as bS, type LythUpgradePlanStatus as bT, type LythUpgradeStatusResponse as bU, MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES as bV, MAX_NATIVE_RECEIPT_EVENTS as bW, ML_DSA_65_PUBLIC_KEY_LEN$1 as bX, ML_DSA_65_SIGNATURE_LEN$1 as bY, MULTISIG_ADDRESS_DERIVATION_DOMAIN as bZ, MarketActionError as b_, type ClusterResignationRow as ba, type ClusterResignationsResponse as bb, type ClusterStatusResponse as bc, type CreateRequestCanonicalArgs as bd, DIVERSITY_SCORE_MAX as be, type DagParent as bf, type DagParentsResponse as bg, type DagSyncStatus as bh, type DecodeTxExtension as bi, type DecodeTxLog as bj, type DecodeTxPqAttestation as bk, type DecodeTxResponse as bl, type DelegationCapResponse as bm, type DelegationHistoryRecord as bn, type DelegationRow as bo, type DelegationsResponse as bp, type DutyAbsence as bq, EMPTY_ROOT as br, type EncodeNativeNftBuyListingArgs as bs, type EncodeNativeNftCancelListingArgs as bt, type EncodeNativeNftCreateListingArgs as bu, type EncodeNativeNftPlaceAuctionBidArgs as bv, type EncodeNativeNftSettleAuctionArgs as bw, type EncodeNativeNftSweepExpiredListingsArgs as bx, type EncodeNativeSpotCancelOrderArgs as by, type EncodeNativeSpotCreateMarketArgs as bz, type NativeDecodedEvent as c, type NativeEventConsumer as c$, type MempoolSnapshot as c0, type MeshDecodedTx as c1, type MeshSignedTxResponse as c2, type MeshTxIntent as c3, type MeshUnsignedTxResponse as c4, type MetricsRangeResponse as c5, type MetricsRangeSample as c6, type MetricsRangeSeries as c7, type MetricsRangeStatus as c8, type MrcAccountRecord as c9, NO_EVM_ARCHIVE_SIGNATURE_SCHEME as cA, NO_EVM_FINALITY_EVIDENCE_SCHEMA as cB, NO_EVM_FINALITY_EVIDENCE_SOURCE as cC, NO_EVM_RECEIPTS_ROOT_DOMAIN as cD, NO_EVM_RECEIPT_CODEC as cE, NO_EVM_RECEIPT_PROOF_SCHEMA as cF, NO_EVM_RECEIPT_PROOF_TYPE as cG, NO_EVM_RECEIPT_ROOT_ALGORITHM as cH, type NameCategory as cI, type NameOfResponse as cJ, type NameRegistrationQuote as cK, NameRegistryError as cL, type NativeAgentArbiterStateRecord as cM, type NativeAgentAttestationStateRecord as cN, type NativeAgentAvailabilityStateRecord as cO, type NativeAgentConsentStateRecord as cP, type NativeAgentEscrowStateRecord as cQ, type NativeAgentIssuerStateRecord as cR, type NativeAgentPolicySpendStateRecord as cS, type NativeAgentPolicyStateRecord as cT, type NativeAgentReputationReviewStateRecord as cU, type NativeAgentServiceStateRecord as cV, type NativeAgentStateFilterParamValue as cW, type NativeAgentStateResponseFilters as cX, type NativeAgentStateSource as cY, type NativeCallForwarderArtifact as cZ, type NativeCollectionRoyaltyStateRecord as c_, type MrcMetadataRecord as ca, type MrcPolicyRecord as cb, type MrcPolicySpendRecord as cc, NAME_BASE_MULTIPLIER as cd, NAME_FALLBACK_FEE_UNIT_LYTHOSHI as ce, NAME_LABEL_MAX_LEN as cf, NAME_LABEL_MIN_LEN as cg, NAME_MAX_LEN as ch, NAME_REGISTRY_SELECTORS as ci, NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE as cj, NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY as ck, NATIVE_CALL_FORWARDER_RESPONSE_OFFSET as cl, NATIVE_MARKET_EVENT_FAMILY as cm, NATIVE_MARKET_MODULE_ADDRESS as cn, NATIVE_MARKET_MODULE_ADDRESS_BYTES as co, NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC as cp, NODE_REGISTRY_BLS_PUBKEY_BYTES as cq, NODE_REGISTRY_CAPABILITIES as cr, NODE_REGISTRY_CAPABILITY_MASK as cs, NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS as ct, NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS as cu, NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES as cv, NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID as cw, NODE_REGISTRY_PUBLIC_SERVICE_MASK as cx, NODE_REGISTRY_SELECTORS as cy, NO_EVM_ARCHIVE_PROOF_SCHEMA as cz, type NativeEventFilter as d, type OperatorRiskResponse as d$, type NativeEventProjection as d0, type NativeEventsResponseFilters as d1, type NativeEventsSource as d2, type NativeMarketAddressInput as d3, type NativeMarketAddressKind as d4, type NativeMarketForwarderInput as d5, type NativeMarketModuleCallEnvelope as d6, type NativeMarketModuleContractCall as d7, type NativeMarketOrderBookDelta as d8, type NativeMarketOrderBookDeltasResponseFilters as d9, type NoEvmBlsFinalityVerification as dA, type NoEvmFinalityBlockReference as dB, type NoEvmFinalityCertificate as dC, type NoEvmFinalityEvidence as dD, type NoEvmReceiptFinalityTrustPolicy as dE, type NoEvmReceiptProof as dF, NoEvmReceiptProofError as dG, type NoEvmReceiptProofErrorCode as dH, type NoEvmReceiptProofVerification as dI, type NoEvmReceiptTrustIssue as dJ, type NoEvmReceiptTrustIssueCode as dK, type NoEvmReceiptTrustPolicy as dL, type NoEvmReceiptTrustVerification as dM, type NoEvmReceiptTrustedBlsSigner as dN, type NodeHostingClass as dO, NodeRegistryError as dP, OPERATOR_ROUTER_EVENT_SIGS as dQ, OPERATOR_ROUTER_SELECTORS as dR, OPERATOR_ROUTER_SIGS as dS, ORACLE_EVENT_SIGS as dT, type OperatorAuthorityResponse as dU, type OperatorFeeChargedEvent as dV, type OperatorFeeConfig as dW, type OperatorFeeQuote as dX, type OperatorInfoResponse as dY, type OperatorNetworkMetadata as dZ, type OperatorNetworkMetadataView as d_, type NativeMarketOrderBookDeltasSource as da, type NativeMarketOrderBookStreamAction as db, type NativeMarketOrderBookStreamPayload as dc, type NativeMarketStateFilterParamValue as dd, type NativeMarketStateResponseFilters as de, type NativeMarketStateSource as df, type NativeModuleForwarderDescriptor as dg, type NativeMrcPolicyProjection as dh, type NativeNftAssetStandard as di, type NativeNftListingKind as dj, type NativeNftListingStateRecord as dk, type NativeReceiptCounters as dl, type NativeReceiptEvent as dm, type NativeReceiptSource as dn, type NativeSpotMarketStateRecord as dp, type NativeSpotOrderStateRecord as dq, type NetworkClientOptions as dr, type NetworkSlug as ds, type NoEvmArchiveCoveringSnapshot as dt, type NoEvmArchiveProof as du, type NoEvmArchiveSignatureVerification as dv, type NoEvmArchiveSignatureVerificationIssue as dw, type NoEvmArchiveSignatureVerificationIssueCode as dx, type NoEvmArchiveTrustedSigner as dy, type NoEvmBlockBlsFinalityVerification as dz, type TypedNativeReceiptEvent as e, SERVES_GPU_PROVE as e$, type OperatorRouterConfig as e0, type OperatorSigningActivityResponse as e1, type OperatorSigningEntry as e2, type OperatorSurfaceCapability as e3, type OperatorSurfaceStatus as e4, type OracleEvent as e5, OracleEventError as e6, type OracleFeedConfig as e7, type OracleLatestPrice as e8, type OracleSignerRow as e9, type ProofRequestView as eA, type ProverBidView as eB, type ProverBidsResponse as eC, ProverMarketError as eD, type ProverMarketState as eE, type ProverMarketStatusResponse as eF, type Quantity as eG, type QuoteLiquidity as eH, RESERVED_ADDRESS_HRPS as eI, type RankedBridgeRoute as eJ, type ReceiptProofTrustArchivePolicy as eK, type ReceiptProofTrustArchiveSigner as eL, type ReceiptProofTrustFinalityPolicy as eM, type ReceiptProofTrustFinalitySigner as eN, type ReceiptProofTrustPolicy as eO, type RedemptionQueueTicket as eP, type RegistryRecord as eQ, type ReportServiceProbeCalldataArgs as eR, type ReportServiceProbeRequest as eS, type ReportServiceProbeResponse as eT, type ResolveNameResponse as eU, type RichListHolder as eV, type RichListResponse as eW, type RoundInfo as eX, type RpcClientOptions as eY, type RpcEndpoint as eZ, type RuntimeProvenanceResponse as e_, type OracleSignersResponse as ea, type OracleWriters as eb, type P2pSeed as ec, PENDING_CHANGE_KIND_CODES as ed, PROVER_MARKET_ADDRESS as ee, PROVER_MARKET_BID_DOMAIN as ef, PROVER_MARKET_EVENT_SIGS as eg, PROVER_MARKET_REQUEST_DOMAIN as eh, PROVER_MARKET_SELECTORS as ei, PROVER_MARKET_SUBMIT_DOMAIN as ej, PROVER_SLASH_REASON_BAD_PROOF as ek, PROVER_SLASH_REASON_NON_DELIVERY as el, type ParsedName as em, type PeerSummary as en, type PeerSummaryAggregate as eo, type PendingChangeKind as ep, type PendingRewardsRow as eq, type PendingTxSummary as er, type PlaceLimitOrderViaArgs as es, type PlaceLimitOrderViaPlan as et, type PlaceSpotLimitOrderArgs as eu, type PlaceSpotMarketOrderArgs as ev, type PlaceSpotMarketOrderExArgs as ew, type PrecompileCatalogueResponse as ex, type PrecompileDescriptor as ey, type ProofRequestRow as ez, type NativeEventsFilter as f, buildNativeNftSettleAuctionForwarderInput as f$, SERVICE_PROBE_STATUS as f0, SET_POLICY_CLAIM_DOMAIN_TAG as f1, SPENDING_POLICY_SELECTORS as f2, type SearchHit as f3, type ServiceProbeStatusLabel as f4, type SigningEntryStatus as f5, type SpendingPolicyArgs as f6, SpendingPolicyError as f7, type SpendingPolicyTimeWindow as f8, type SpendingPolicyView as f9, type VerticesAtRoundResponse as fA, addressBytesToHex as fB, addressToBech32 as fC, addressToTypedBech32 as fD, allowRootFor as fE, assertNativeMarketOrderBookStreamPayload as fF, assessBridgeRoute as fG, bech32ToAddress as fH, bech32ToAddressBytes as fI, bidSighash as fJ, bridgeAddressHex as fK, bridgeDrainRemaining as fL, bridgeQuoteSubmitReadiness as fM, bridgeRoutesReadiness as fN, bridgeTransferCandidates as fO, buildBridgeRouteCatalogue as fP, buildCancelSpotOrderPlan as fQ, buildNativeCallForwarderArtifact as fR, buildNativeMarketModuleCallEnvelope as fS, buildNativeNftBuyListingForwarderInput as fT, buildNativeNftBuyListingModuleCall as fU, buildNativeNftCancelListingForwarderInput as fV, buildNativeNftCancelListingModuleCall as fW, buildNativeNftCreateListingForwarderInput as fX, buildNativeNftCreateListingModuleCall as fY, buildNativeNftPlaceAuctionBidForwarderInput as fZ, buildNativeNftPlaceAuctionBidModuleCall as f_, type SpotLimitOrderSide as fa, type SpotMarketOrderMode as fb, type StorageProofBatch as fc, type SubmitPendingChangeCalldataArgs as fd, type SwapIntentStatus as fe, type SyncStatus as ff, TESTNET_69420 as fg, type TokenBalanceMrcIdentity as fh, type TokenBalanceRecord as fi, type TokenBalanceWithMetadata as fj, type TotalBurnedResponse as fk, type TpmAttestationResponse as fl, type TransactionReceipt as fm, type TransactionView as fn, type TxConfirmations as fo, type TxFeedReceipt as fp, type TxFeedTransaction as fq, type TxStatusFoundResponse as fr, type TxStatusNotFoundResponse as fs, type TxStatusResponse as ft, type UpcomingDutiesResponse as fu, type UpcomingDutyMap as fv, type UserAddressInput as fw, V1_BRIDGE_ALLOWED_FEE_TOKEN as fx, V1_BRIDGE_ALLOWED_PROTOCOL as fy, type VertexAtRound as fz, type NativeEventsResponse as g, encodeNativeNftCancelListingCall as g$, buildNativeNftSettleAuctionModuleCall as g0, buildNativeNftSweepExpiredListingsForwarderInput as g1, buildNativeNftSweepExpiredListingsModuleCall as g2, buildNativeSpotCancelOrderForwarderInput as g3, buildNativeSpotCancelOrderModuleCall as g4, buildNativeSpotCreateMarketForwarderInput as g5, buildNativeSpotCreateMarketModuleCall as g6, buildNativeSpotLimitOrderForwarderInput as g7, buildNativeSpotLimitOrderModuleCall as g8, buildNativeSpotSettleLimitOrderForwarderInput as g9, decodeOracleEvent as gA, decodeTimeWindow as gB, decodeTxFeedResponse as gC, denyRootFor as gD, deriveClobMarketId as gE, deriveClusterAnchorAddress as gF, deriveFeedId as gG, deriveNativeSpotMarketId as gH, deriveNativeSpotOrderId as gI, destinationRoot as gJ, encodeAttestDkgReshareCalldata as gK, encodeBlockSelector as gL, encodeBridgeChallengeCalldata as gM, encodeBridgeClaimCalldata as gN, encodeCancelOrderCalldata as gO, encodeCancelPendingChangeCalldata as gP, encodeClaimPolicyByAddressCalldata as gQ, encodeCreateRequestCalldata as gR, encodeCreateRequestCanonical as gS, encodeDisableCalldata as gT, encodeEnableCalldata as gU, encodeLockBridgeConfigCalldata as gV, encodeNameAcceptTransferCall as gW, encodeNameProposeTransferCall as gX, encodeNameRegisterCall as gY, encodeNativeMarketModuleForwarderInput as gZ, encodeNativeNftBuyListingCall as g_, buildNativeSpotSettleLimitOrderModuleCall as ga, buildNativeSpotSettleRoutedLimitOrderForwarderInput as gb, buildNativeSpotSettleRoutedLimitOrderModuleCall as gc, buildPlaceLimitOrderViaPlan as gd, buildPlaceSpotLimitOrderPlan as ge, buildPlaceSpotMarketOrderExPlan as gf, buildPlaceSpotMarketOrderPlan as gg, categoryRoot as gh, clobAddressHex as gi, clusterApyPercent as gj, composeClaimBoundMessage as gk, computeNoEvmDacFinalityMessage as gl, computeNoEvmLeaderFinalityMessage as gm, computeNoEvmReceiptsRoot as gn, computeNoEvmRoundFinalityMessage as go, computeNoEvmTargetReceiptHash as gp, computeQuoteLiquidity as gq, consumeNativeEvents as gr, decodeClusterDiversity as gs, decodeClusterFormedEvent as gt, decodeNativeAgentStateResponse as gu, decodeNativeMarketOrderBookDeltasResponse as gv, decodeNativeReceiptResponse as gw, decodeNoEvmReceiptTranscript as gx, decodeOperatorFeeChargedEvent as gy, decodeOperatorNetworkMetadata as gz, type NativeAgentStateFilter as h, oraclePriceToNumber as h$, encodeNativeNftCreateListingCall as h0, encodeNativeNftPlaceAuctionBidCall as h1, encodeNativeNftSettleAuctionCall as h2, encodeNativeNftSweepExpiredListingsCall as h3, encodeNativeSpotCancelOrderCall as h4, encodeNativeSpotCreateMarketCall as h5, encodeNativeSpotLimitOrderCall as h6, encodeNativeSpotSettleLimitOrderCall as h7, encodeNativeSpotSettleRoutedLimitOrderCall as h8, encodePlaceLimitOrderCalldata as h9, isBridgeResumeCooldownActiveRevert as hA, isConcreteServiceProbeStatus as hB, isNativeDecodedEvent as hC, isNativeMarketOrderBookStreamPayload as hD, isSinglePublicServiceProbeMask as hE, isValidNodeRegistryCapabilities as hF, isValidPublicServiceProbeMask as hG, nameLengthModifierX10 as hH, nameRegistrationCost as hI, nameRegistryAddressHex as hJ, nativeAgentStateFilterParams as hK, nativeEventMatches as hL, nativeEventsFilterParams as hM, nativeEventsFromHistory as hN, nativeEventsFromReceipt as hO, nativeMarketEventFilter as hP, nativeMarketEventsFromHistory as hQ, nativeMarketEventsFromReceipt as hR, nativeMarketStateFilterParams as hS, noEvmReceiptTrustPolicyFromChainInfo as hT, nodeHostingClassFromByte as hU, nodeHostingClassToByte as hV, nodeRegistryAddressHex as hW, normalizeAddressHex as hX, normalizeBridgeRouteCatalogue as hY, normalizePendingChangeKind as hZ, oracleAddressHex as h_, encodePlaceLimitOrderViaCalldata as ha, encodePlaceMarketOrderCalldata as hb, encodePlaceMarketOrderExCalldata as hc, encodeRecoverOperatorNodeCalldata as hd, encodeReportServiceProbeCalldata as he, encodeSetBridgeResumeCooldownCalldata as hf, encodeSetBridgeRouteFinalityCalldata as hg, encodeSetLotSizeCalldata as hh, encodeSetMinNotionalCalldata as hi, encodeSetPolicyCalldata as hj, encodeSetPolicyClaimCalldata as hk, encodeSetTickSizeCalldata as hl, encodeSubmitBridgeProofCalldata as hm, encodeSubmitPendingChangeCalldata as hn, exportBridgeRouteCatalogueJson as ho, fetchChainInfoLatest as hp, fetchChainRegistryLatest as hq, formatOraclePrice as hr, getChainInfo as hs, getNoEvmReceiptTrustPolicy as ht, getP2pSeeds as hu, getRpcEndpoints as hv, hexToAddressBytes as hw, isBridgeAdminLockedRevert as hx, isBridgeCooldownZeroRevert as hy, isBridgeFinalityZeroRevert as hz, type NativeAgentStateResponse as i, fetchEncryptionKey as i$, packTimeWindow as i0, parseAddress as i1, parseBridgeRouteCatalogueJson as i2, parseChainRegistryToml as i3, parseDkgResharePublicKeys as i4, parseNameCategory as i5, parseNativeDecodedEvent as i6, parseQuantity as i7, parseQuantityBig as i8, proverMarketStateFromByte as i9, ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE as iA, ENUM_VARIANT_INDEX_ML_DSA_65 as iB, type EncryptedEnvelope as iC, type EncryptedSubmission as iD, ML_DSA_65_PUBLIC_KEY_LEN as iE, ML_DSA_65_SEED_LEN as iF, ML_DSA_65_SIGNATURE_LEN as iG, ML_DSA_65_SIGNING_KEY_LEN as iH, ML_KEM_768_CIPHERTEXT_LEN as iI, ML_KEM_768_ENCAPSULATION_KEY_LEN as iJ, ML_KEM_768_SHARED_SECRET_LEN as iK, type NativeTxExtension as iL, type NativeTxExtensionDescriptor as iM, type NativeTxExtensionLike as iN, type NonceAad as iO, type PlaintextSubmission as iP, STANDARD_ALGO_NUMBER_ML_DSA_65 as iQ, bincodeDecryptHint as iR, bincodeEncryptedEnvelope as iS, bincodeNonceAad as iT, bincodeSignedTransaction as iU, buildEncryptedEnvelope as iV, buildEncryptedSubmission as iW, buildPlaintextSubmission as iX, encodeMlDsa65Opaque as iY, encodeTransactionForHash as iZ, encryptInnerTx as i_, quoteOperatorFee as ia, rankBridgeRoutes as ib, rankMarketsByVolume as ic, requestSighash as id, requireTypedAddress as ie, selectBridgeTransferRoute as ig, serviceProbeStatusLabel as ih, setDestinationRoot as ii, spendingPolicyAddressHex as ij, submitSighash as ik, typedBech32ToAddress as il, validateAddress as im, validateBridgeRouteCatalogue as io, verifyNoEvmArchiveProofSignatures as ip, verifyNoEvmBlockFinalityEvidenceMultisig as iq, verifyNoEvmBlockFinalityEvidenceThreshold as ir, verifyNoEvmFinalityEvidenceMultisig as is, verifyNoEvmFinalityEvidenceThreshold as it, verifyNoEvmReceiptProof as iu, verifyNoEvmReceiptProofTrust as iv, ADDRESS_DERIVATION_DOMAIN as iw, DKG_AEAD_TAG_LEN as ix, DKG_NONCE_LEN as iy, type DecryptHint as iz, type NativeMarketStateFilter as j, mlDsa65AddressBytes as j0, mlDsa65AddressFromPublicKey as j1, outerSigDigest as j2, submitEncryptedEnvelope as j3, submitPlaintextTransaction as j4, submitTransactionWithPrivacy as j5, type NativeMarketStateResponse as k, type NativeMarketOrderBookDeltasRequest as l, type NativeMarketOrderBookDeltasResponse as m, type AddressProfileResponse as n, type AddressFlowResponse as o, type RedemptionQueueResponse as p, type MrcAccountResponse as q, type MrcHoldersResponse as r, type BridgeRoutesRequest as s, type BridgeRoutesResponse as t, type ServiceProbeResponse as u, type ClobMarketsResponse as v, type ClobMarketResponse as w, type ClobTradesResponse as x, type ClobOhlcResponse as y, type ClobOrderBookResponse as z };
