import { M as MempoolClass, N as NativeEvmTxFields, a as MlDsa65Backend } from './ml-dsa-Drcmrw5h.cjs';

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
     * `0x`-prefixed legacy 48-byte cluster-member reference. On a PQ
     * roster the leading 32 bytes hold the BLAKE3 operator id and the
     * remaining 16 bytes are zero pad; the width is the genesis/roster
     * member-ref ABI, not a real public key.
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
     * Opaque round attestation payload (the consensus round certificate;
     * renamed from the legacy `blsAttestation` to match the node, which emits
     * `roundAttestation` after the BLS -> RoundCert consensus rename).
     */
    roundAttestation: unknown | null;
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
 * Aggregate gossip-mesh health bands in `lyth_peerSummary`.
 */
type HealthSummary = {
    synced: bigint;
    lagging: bigint;
    stale: bigint;
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
 * Ping-RTT histogram bands in `lyth_peerSummary`.
 */
type LatencyBands = {
    lt_50ms: bigint;
    lt_200ms: bigint;
    lt_1s: bigint;
    ge_1s: bigint;
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
 * Round-advancement certificate response used by the AUD-0074
 * certificate RPCs (`lyth_getRoundCertificate` /
 * `lyth_getLeaderCertificate` / `lyth_getDacCertificate`).
 *
 * On the post-quantum chain the `signature` field is the ML-DSA-65
 * leader-seed digest — the BLAKE3 hash over the ML-DSA quorum
 * certificate that seeds the historical leader beacon. It is also the
 * value the VRF precompile (`0x1101`) reads as the historical
 * randomness for a finalized round.
 */
type RoundCertificateResponse$1 = {
    /**
     * Round at which the certificate sealed.
     */
    round: bigint;
    /**
     * `0x`-prefixed leader-seed digest (ML-DSA-65 quorum-cert hash).
     * The JSON wire field stays `signature` for compatibility.
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
 *
 * TODO(monolythium-vision): the operator-lifecycle BASE ops are not yet
 * encoded in either SDK — `register(bytes32,string,bytes32,uint32,uint32,
 * bytes,bytes,bytes)`, `unregister`, `withdrawBond`, `updateEndpoint`,
 * `updateCapabilities`, `heartbeat`, `unjail`, `setNetworkMetadata`,
 * `claimOperatorName`, `releaseOperatorName`. Today `register` is driven by
 * the `protocore registry register` CLI (operator-spine-register-reality);
 * SDK encoders are only needed once the Monarch operator-onboarding UX
 * (roadmap #54) drives registration from a UI. That call is unresolved, and
 * `register` carries three dynamic byte-array tails (1952-byte consensus
 * pubkey, 3309-byte PoP, 1184-byte seal EK) whose ABI layout must be pinned
 * against mono-core with golden vectors before it is hand-rolled here. Add
 * the encoders to TS first, then mirror in Rust (`node_registry.rs`).
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
declare const MULTISIG_ADDRESS_DERIVATION_DOMAIN$1: "MONO_MULTISIG_BLAKE3_20_V1";
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
    /** `requestClusterJoin(uint32,bytes)` — CJ-1 joining operator posts an admit request. */
    readonly requestClusterJoin: string;
    /** `voteClusterAdmit(uint32,bytes32,bytes)` — CJ-1 current member admit vote. */
    readonly voteClusterAdmit: string;
    /** `cancelClusterJoin(uint32,bytes32)` — CJ-1 requester cancellation/refund. */
    readonly cancelClusterJoin: string;
    /** `expireClusterJoin(uint32,bytes32)` — CJ-1 public reaper/refund. */
    readonly expireClusterJoin: string;
    /** `getClusterJoinRequest(uint32,bytes32)` — CJ-1 request status view. */
    readonly getClusterJoinRequest: string;
    /** `formCluster(bytes,bytes,bytes)` — no-foundation cluster formation by roster consent. */
    readonly formCluster: string;
    /**
     * `formCluster(bytes,bytes,bytes,bytes)` — V2 formation carrying the
     * 30-byte economics charter (Law §6.8); consents verify over the V2
     * digest, which commits to the charter bytes.
     */
    readonly formClusterV2: string;
    /** `setOperatorDisplay(bytes32,string,string)` — owner-callable public display metadata. */
    readonly setOperatorDisplay: string;
    /**
     * `updateCharter(uint32,bytes,bytes,bytes)` — Component H live charter
     * amendment (Law §6.8); re-signs a new 30-byte charter for a LIVE cluster
     * with a delegator-protective cooldown. Consents verify over
     * `updateCharterMessage` (NOT the formCluster digests).
     */
    readonly updateCharter: string;
    /** `getPendingCharter(uint32)` view — Component H pending-amendment status. */
    readonly getPendingCharter: string;
    /** `commitArchiveRoot(bytes32,uint16,bytes32,uint64)` — Component B archive serve-challenge commit. */
    readonly commitArchiveRoot: string;
    /**
     * `answerArchiveChallenge(bytes32,uint16,uint64,bytes,bytes32[])` —
     * Component B answer. BLOCKER-1 (mono-core `service-rewards` d2ee4548):
     * the caller-supplied `roundCertDigest` + `nonce` were REMOVED — the
     * challenge seed is now the protocol-pinned per-epoch quorum-certificate
     * digest and the nonce is derived from it. 5 args: peerId, shardIndex,
     * epoch, leaf, proof.
     */
    readonly answerArchiveChallenge: string;
    /** `setProbeAuthority(address)` — Component C foundation-gated probe-authority rotation. */
    readonly setProbeAuthority: string;
    /** `getProbeAuthority()` view — Component C configured probe-authority address. */
    readonly getProbeAuthority: string;
    /** `attestServiceProbe(bytes32,uint32,uint8,uint64)` — Component C attested score-eligibility path. */
    readonly attestServiceProbe: string;
};
/** Cluster-member reference width used by genesis and formation rosters. */
declare const NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES = 48;
/** @deprecated Use NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES. */
declare const NODE_REGISTRY_LEGACY_CLUSTER_MEMBER_PUBKEY_BYTES = 48;
/** @deprecated Use NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES. */
declare const NODE_REGISTRY_BLS_PUBKEY_BYTES = 48;
/** Full ML-DSA-65 consensus pubkey width used by register and pending-change calldata. */
declare const NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES = 1952;
/** ML-DSA-65 consensus signature width. */
declare const NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES = 3309;
/** ML-DSA-65 self-signature width used as register proof-of-possession. */
declare const NODE_REGISTRY_CONSENSUS_POP_BYTES = 3309;
/** DKG-reshare attestation signature width. Removal is tracked outside W1. */
declare const NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES = 96;
/** @deprecated Use NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES. */
declare const NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES = 96;
declare const NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS = 5;
declare const NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS = 7;
declare const NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID: bigint;
declare const NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT = 7;
declare const NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT = 3;
declare const NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT: number;
declare const NODE_REGISTRY_FORM_CLUSTER_THRESHOLD = 7;
declare const NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN: "PROTOCORE_NODE_REGISTRY_CLUSTER_FORM_V1\0";
declare const NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN_V2: "PROTOCORE_NODE_REGISTRY_CLUSTER_FORM_V2\0";
/**
 * Fixed byte width of the V2 charter argument: 10×u16 BE member shares
 * (member-declaration order: active 0..7, then standby 7..10) ‖ u16 BE
 * delegator share ‖ u64 BE consent expiry (ms).
 */
declare const NODE_REGISTRY_CLUSTER_CHARTER_BYTES = 30;
/** Protocol floor for a charter's delegator share (Law §6.8). */
declare const NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS = 2000;
/** Basis-point denominator a charter's member shares must sum to. */
declare const NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS = 10000;
declare const NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES = 128;
declare const NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES = 64;
/**
 * Component H — consensus threshold for a live `updateCharter` amendment:
 * 7 of the 10 cluster members must consent (the same 7-of-10 quorum that
 * forms the cluster), and every signer must be CURRENTLY active. Bound
 * into the `updateCharterMessage` digest. Equal to
 * `NODE_REGISTRY_FORM_CLUSTER_THRESHOLD`.
 */
declare const NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD = 7;
/**
 * Domain separator for the `updateCharter` consent digest. Distinct from
 * the formCluster domains so a formation consent can never replay as an
 * amendment consent (or vice-versa). Note the trailing `\0` byte — it is
 * part of the hashed preimage. Mirrors mono-core
 * `cluster_form::UPDATE_CHARTER_DOMAIN`.
 */
declare const NODE_REGISTRY_UPDATE_CHARTER_MESSAGE_DOMAIN: "PROTOCORE_NODE_REGISTRY_CLUSTER_UPDATE_CHARTER_V1\0";
/**
 * Component H — delegator-protective cooldown for a live `updateCharter`
 * amendment, in epochs. A new charter does NOT apply immediately; it
 * becomes effective no earlier than `current_epoch + COOLDOWN`. The OLD
 * terms apply throughout so an ARK delegator can undelegate first. The
 * production value is 2 epochs (~24h notice); public-testnet builds
 * (`testnet-fast-epochs`) use 1. This SDK constant mirrors the production
 * value — read the on-chain `getPendingCharter` `effectiveEpoch` for the
 * exact landing epoch rather than computing it from this constant.
 */
declare const NODE_REGISTRY_CHARTER_COOLDOWN_EPOCHS = 2;
/**
 * Component B — domain tag bound into the archive serve-challenge seed.
 * Mirrors mono-core `archive_challenge::ARCHIVE_CHALLENGE_DOMAIN`. No
 * trailing NUL (it is hashed verbatim).
 */
declare const NODE_REGISTRY_ARCHIVE_CHALLENGE_DOMAIN: "monolythium.archive-challenge.v1";
/**
 * Component B (BLOCKER-1) — domain tag bound into the protocol-issued
 * per-epoch challenge nonce so it can never collide with the challenge-seed
 * domain. Mirrors mono-core `archive_challenge::ARCHIVE_NONCE_DOMAIN`. No
 * trailing NUL (it is hashed verbatim).
 */
declare const NODE_REGISTRY_ARCHIVE_NONCE_DOMAIN: "monolythium.archive-challenge.nonce.v1";
/** Component B — domain byte prefixing a merkle leaf hash (`H(0x00 || leaf)`). */
declare const NODE_REGISTRY_MERKLE_LEAF_DOMAIN = 0;
/** Component B — domain byte prefixing a merkle inner node (`H(0x01 || left || right)`). */
declare const NODE_REGISTRY_MERKLE_INNER_DOMAIN = 1;
/** Component B — maximum merkle authentication-path length accepted on-chain. */
declare const NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH = 40;
/**
 * Component B (BLOCKER-1) — minimum committed `leafCount` accepted by
 * `commitArchiveRoot`. A tree below this width is forgeable (a 1-leaf
 * self-commit has `root == leaf_hash` + an empty proof and passes every
 * challenge serving nothing), so the chain rejects it at commit time. This
 * SDK enforces it client-side before a nonce is burned. Mirrors mono-core
 * `archive_challenge::MIN_ARCHIVE_LEAF_COUNT`.
 */
declare const NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT = 65536n;
/**
 * Component B (BLOCKER-1) — how many epochs back from the current epoch an
 * `answerArchiveChallenge` may target on-chain. Informational mirror of
 * mono-core `archive_challenge::CHALLENGE_EPOCH_WINDOW`; a future epoch is
 * always rejected and an epoch older than `current_epoch - window` reverts
 * with `EffectiveEpochInvalid`.
 */
declare const NODE_REGISTRY_CHALLENGE_EPOCH_WINDOW = 2n;
/**
 * Component B (BLOCKER-1) — storage sub-kind byte for the per-epoch
 * protocol-issued challenge seed slot (`keccak256(0x32 || epoch_be64 ||
 * 0x03)`). Mirrors mono-core `archive_challenge::KIND_EPOCH_SEED`.
 */
declare const NODE_REGISTRY_ARCHIVE_KIND_EPOCH_SEED = 3;
/**
 * Storage-slot tag byte for the archive-challenge family (registry
 * namespace, under `0x1005`). Mirrors mono-core
 * `archive_challenge::TAG_ARCHIVE_CHALLENGE`.
 */
declare const NODE_REGISTRY_TAG_ARCHIVE_CHALLENGE = 50;
/**
 * Storage-slot tag byte for the ServiceScore-engine family (under
 * `0x1005`, shared with the attested-probe writer). Mirrors
 * `protocore_service_score::slots::TAG_SERVICE_SCORE` and node-registry
 * `storage::TAG_SCORE_SERVICE_PROBE`.
 */
declare const NODE_REGISTRY_TAG_SERVICE_SCORE = 36;
/**
 * Storage-slot tag byte for the node-registry treasury/keys family (under
 * `0x1005`), which the probe-authority key slot lives under. Mirrors
 * node-registry `storage::TAG_TREASURY`.
 */
declare const NODE_REGISTRY_TAG_TREASURY = 31;
/**
 * Storage-slot tag byte for the per-cluster ACTIVE economics charter family
 * (under `0x1005`). Mirrors mono-core
 * `protocore_node_registry::cluster_anchor::TAG_CLUSTER_CHARTER`. The active
 * charter is written by the V2 `formCluster(bytes,bytes,bytes,bytes)` path
 * (and amended via `updateCharter` once the cooldown lands) and read by the
 * reward engine each block. Two sub-kind slots per cluster — see
 * {@link slotClusterCharterDelegator} / {@link slotClusterCharterMembers}.
 */
declare const NODE_REGISTRY_TAG_CLUSTER_CHARTER = 49;
/**
 * Charter sub-kind `0x00` — the presence + delegator-share slot. The stored
 * value is a right-aligned `u64` equal to `delegatorShareBps + 1`; a zero
 * word means NO active charter (genesis clusters / 3-arg formCluster, which
 * fall back to the legacy default split). Mirrors
 * `SUBKIND_CHARTER_DELEGATOR_BPS`.
 */
declare const NODE_REGISTRY_SUBKIND_CHARTER_DELEGATOR_BPS = 0;
/**
 * Charter sub-kind `0x01` — the packed member-shares slot. The stored value
 * is a single 32-byte word holding the 10×u16 BE member shares in its low
 * 20 bytes (offset 12..32). Mirrors `SUBKIND_CHARTER_MEMBER_SHARES`.
 */
declare const NODE_REGISTRY_SUBKIND_CHARTER_MEMBER_SHARES = 1;
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
    consensusPublicKeys?: string | Uint8Array | readonly number[];
    /** @deprecated Use consensusPublicKeys. */
    blsPublicKeys?: string | Uint8Array | readonly number[];
    thresholdSig: string | Uint8Array | readonly number[];
}
interface RequestClusterJoinCalldataArgs {
    clusterId: bigint | number | string;
    operatorPubkey: string | Uint8Array | readonly number[];
}
interface VoteClusterAdmitCalldataArgs {
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
    voterPubkey: string | Uint8Array | readonly number[];
}
interface CancelClusterJoinCalldataArgs {
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
}
interface ExpireClusterJoinCalldataArgs {
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
}
interface GetClusterJoinRequestCalldataArgs {
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
}
interface SetOperatorDisplayCalldataArgs {
    peerId: string | Uint8Array | readonly number[];
    moniker: string;
    alias: string;
}
interface FormClusterCalldataArgs {
    activePubkeys: string | Uint8Array | readonly number[];
    standbyPubkeys: string | Uint8Array | readonly number[];
    signatures: string | Uint8Array | readonly number[];
}
/** Decoded form of the 30-byte V2 cluster charter (Law §6.8). */
interface ClusterCharterArgs {
    /**
     * Per-member operator-pot shares in basis points, member-declaration
     * order (active 0..7, then standby 7..10). Must sum to exactly
     * `NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS`.
     */
    memberShareBps: readonly number[];
    /**
     * Delegator share of the cluster pot in basis points, within
     * `[NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS, 10000]`.
     */
    delegatorShareBps: number;
    /** Consent expiry as a Unix timestamp in milliseconds. */
    expiresMs: bigint | number;
}
interface FormClusterV2CalldataArgs extends FormClusterCalldataArgs {
    /** The 30-byte charter wire payload (see `encodeClusterCharter`). */
    charter: string | Uint8Array | readonly number[];
}
type ClusterJoinRequestStatus = "none" | "open" | "admitted" | "cancelled" | "expired" | "unknown";
interface ClusterJoinRequestView {
    owner: string;
    requestEpoch: bigint;
    requestNonce?: bigint;
    snapshotThreshold: number;
    snapshotN: number;
    voteCount: number;
    statusCode: number;
    status: ClusterJoinRequestStatus;
    bondLythoshi: bigint;
    sealRosterPending: boolean;
}
interface ReportServiceProbeCalldataArgs {
    peerId: string | Uint8Array | readonly number[];
    serviceMask: number;
    status: number;
    latencyMs: number;
    probeDigest: string | Uint8Array | readonly number[];
}
/** Args for `updateCharter(uint32,bytes,bytes,bytes)` (Component H). */
interface UpdateCharterCalldataArgs {
    clusterId: bigint | number | string;
    /** The 30-byte charter wire payload (see `encodeClusterCharter`). */
    charter: string | Uint8Array | readonly number[];
    /**
     * The consenting operators' 1952-byte ML-DSA-65 consensus pubkeys, in
     * the same order as `signatures`. `7..=10` keys. May be supplied as a
     * single concatenated buffer or an array of per-signer keys.
     */
    signerPubkeys: string | Uint8Array | readonly number[] | readonly (string | Uint8Array | readonly number[])[];
    /**
     * The 3309-byte ML-DSA-65 signatures over `updateCharterMessage`, 1:1
     * with `signerPubkeys`. May be a concatenated buffer or an array.
     */
    signatures: string | Uint8Array | readonly number[] | readonly (string | Uint8Array | readonly number[])[];
}
/**
 * Decoded `getPendingCharter(uint32)` return (Component H). Zeroed /
 * `present=false` when no amendment is pending.
 */
interface PendingCharterView {
    /** `true` iff a pending amendment is posted for the cluster. */
    present: boolean;
    /** Proposed delegator share of the cluster pot in basis points. */
    delegatorShareBps: number;
    /** Epoch at/after which the pending charter takes effect (the cooldown landing). */
    effectiveEpoch: bigint;
    /** Count of recorded active signers that consented to the pending charter. */
    signerCount: number;
    /**
     * The proposed per-member operator-pot shares in basis points,
     * member-declaration order (active 0..7, then standby 7..10). Empty when
     * `present` is `false`.
     */
    memberShareBps: readonly number[];
}
/**
 * Decoded ACTIVE cluster charter (Law §6.8), reconstructed from the two
 * `TAG_CLUSTER_CHARTER` (`0x31`) storage words SLOADed against the
 * node-registry account `0x1005`. `present=false` (with zeroed shares) when
 * the cluster has no active charter — genesis clusters and clusters formed
 * through the 3-arg `formCluster` selector, which fall back to the legacy
 * default split. The active charter carries no on-chain effective epoch (it
 * is the currently-effective record); the cooldown / `effectiveEpoch` lives
 * only on the {@link PendingCharterView}.
 */
interface ActiveCharterView {
    /** `true` iff the cluster has an active on-chain charter record. */
    present: boolean;
    /** The active delegator share of the cluster pot in basis points. */
    delegatorShareBps: number;
    /**
     * The active per-member operator-pot shares in basis points,
     * member-declaration order (active 0..7, then standby 7..10). Empty when
     * `present` is `false`.
     */
    memberShareBps: readonly number[];
}
/** Args for `commitArchiveRoot(bytes32,uint16,bytes32,uint64)` (Component B). */
interface CommitArchiveRootCalldataArgs {
    peerId: string | Uint8Array | readonly number[];
    shardIndex: number;
    /** The per-shard merkle root over the archived shard data (32 bytes). */
    shardRoot: string | Uint8Array | readonly number[];
    /** The committed leaf count (tree width); must be non-zero. */
    leafCount: bigint | number | string;
}
/**
 * Args for `answerArchiveChallenge(bytes32,uint16,uint64,bytes,bytes32[])`
 * (Component B).
 *
 * BLOCKER-1 (mono-core `service-rewards` d2ee4548): the caller-supplied
 * `roundCertDigest` and `nonce` were REMOVED. The challenge seed is now the
 * protocol-pinned per-epoch quorum-certificate digest (sloaded from
 * {@link slotEpochChallengeSeed}) and the nonce is derived from it
 * ({@link protocolNonceForEpoch}) — the operator can no longer choose the
 * challenge coordinate. Off-chain tooling derives the challenged leaf via
 * {@link deriveArchiveChallenge}, then submits the revealed leaf + proof.
 */
interface AnswerArchiveChallengeCalldataArgs {
    peerId: string | Uint8Array | readonly number[];
    shardIndex: number;
    epoch: bigint | number | string;
    /** The revealed challenged leaf bytes. */
    leaf: string | Uint8Array | readonly number[];
    /** The bottom-up merkle authentication path (each element 32 bytes). */
    proof: readonly (string | Uint8Array | readonly number[])[];
}
/** A fully-deterministic archive serve-challenge (mirror of mono-core `ArchiveChallenge`). */
interface ArchiveChallenge {
    /** The 32-byte op-hash of the operator under challenge (`0x` hex). */
    opHash: string;
    /** The shard whose committed root the answer must verify against. */
    shardIndex: number;
    /** The leaf the operator must reveal + prove, reduced modulo the committed leaf count. */
    leafIndex: bigint;
    /** The full 32-byte challenge seed (`0x` hex). */
    seed: string;
}
/** Args for `attestServiceProbe(bytes32,uint32,uint8,uint64)` (Component C). */
interface AttestServiceProbeCalldataArgs {
    /** The operator's canonical op-hash (`BLAKE3(consensusPubkey)[..32]`, 32 bytes). */
    opHash: string | Uint8Array | readonly number[];
    /** Bitmask of public services to attest (must be a valid public-service mask). */
    serviceMask: number;
    /** Concrete probe status (`REACHABLE` / `DEGRADED` / `UNREACHABLE`). */
    status: number;
    /** Attestation epoch stamped into the score-domain slot. */
    epoch: bigint | number | string;
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
declare function parseDkgResharePublicKeys(consensusPublicKeys: string | Uint8Array | readonly number[]): Uint8Array[];
declare function encodeAttestDkgReshareCalldata(args: AttestDkgReshareCalldataArgs): string;
declare function encodeRequestClusterJoinCalldata(args: RequestClusterJoinCalldataArgs): string;
declare function encodeVoteClusterAdmitCalldata(args: VoteClusterAdmitCalldataArgs): string;
declare function encodeSetOperatorDisplayCalldata(args: SetOperatorDisplayCalldataArgs): string;
declare function encodeCancelClusterJoinCalldata(args: CancelClusterJoinCalldataArgs): string;
declare function encodeExpireClusterJoinCalldata(args: ExpireClusterJoinCalldataArgs): string;
declare function encodeGetClusterJoinRequestCalldata(args: GetClusterJoinRequestCalldataArgs): string;
declare function formClusterMessage(activePubkeys: string | Uint8Array | readonly number[], standbyPubkeys: string | Uint8Array | readonly number[]): Uint8Array;
declare function formClusterMessageHex(activePubkeys: string | Uint8Array | readonly number[], standbyPubkeys: string | Uint8Array | readonly number[]): string;
declare function encodeFormClusterCalldata(args: FormClusterCalldataArgs): string;
/**
 * Encode the 30-byte V2 charter wire payload: 10×u16 BE member shares
 * ‖ u16 BE delegator share ‖ u64 BE consent expiry (ms).
 *
 * Performs the same structural validation as the on-chain
 * `decode_cluster_charter` (length, share sum, delegator floor band) so
 * a malformed charter fails client-side before a nonce is burned.
 * Byte-identical to the Rust SDK `encode_cluster_charter`.
 */
declare function encodeClusterCharter(args: ClusterCharterArgs): Uint8Array;
/**
 * V2 roster-consent digest — the V1 commitment plus the length-prefixed
 * charter bytes under the `..._CLUSTER_FORM_V2\0` domain. Economics +
 * consent expiry are INSIDE the signed message: no member can be bound
 * to terms they did not sign, and no V2 consent replays under different
 * terms (or under the V1 digest — the domains differ). Byte-identical
 * to mono-core's `form_cluster_message_v2`.
 */
declare function formClusterMessageV2(activePubkeys: string | Uint8Array | readonly number[], standbyPubkeys: string | Uint8Array | readonly number[], charter: string | Uint8Array | readonly number[]): Uint8Array;
declare function formClusterMessageV2Hex(activePubkeys: string | Uint8Array | readonly number[], standbyPubkeys: string | Uint8Array | readonly number[], charter: string | Uint8Array | readonly number[]): string;
/**
 * Encode `formCluster(bytes,bytes,bytes,bytes)` calldata — the V2
 * (charter) selector. Same layout discipline as
 * `encodeFormClusterCalldata` with a fourth dynamic `bytes` tail.
 * Byte-identical to the Rust SDK `encode_form_cluster_v2_calldata`.
 *
 * The 10 consent signatures must verify over `formClusterMessageV2`
 * (NOT the V1 digest).
 */
declare function encodeFormClusterV2Calldata(args: FormClusterV2CalldataArgs): string;
/**
 * Decode the 30-byte V2 charter wire payload into its terms.
 *
 * Inverse of {@link encodeClusterCharter}; applies the same structural
 * validation as the on-chain `decode_cluster_charter` (length, share sum,
 * delegator floor band). Used by {@link decodePendingCharter} and any UI
 * that renders an active charter read from chain.
 */
declare function decodeClusterCharter(charter: string | Uint8Array | readonly number[]): ClusterCharterArgs;
/**
 * Build the `updateCharter` consent digest every signer must sign
 * (Component H). Binds the amendment to the exact `clusterId` and the
 * full 30-byte charter wire payload under the
 * `..._CLUSTER_UPDATE_CHARTER_V1\0` domain:
 *
 * `BLAKE3(DOMAIN ‖ clusterId_be32 ‖ UPDATE_CHARTER_THRESHOLD_be16 ‖
 *  charter.len_be32 ‖ charter)`.
 *
 * Byte-identical to mono-core's `cluster_form::update_charter_message` —
 * this is the value Monarch's signing flow hashes. There is no
 * blind-signing surface: the Rust derivation is the SSOT.
 */
declare function updateCharterMessage(clusterId: bigint | number | string, charter: string | Uint8Array | readonly number[]): Uint8Array;
declare function updateCharterMessageHex(clusterId: bigint | number | string, charter: string | Uint8Array | readonly number[]): string;
/**
 * Encode `updateCharter(uint32,bytes,bytes,bytes)` calldata (Component H).
 *
 * Head: `clusterId` word + three dynamic-`bytes` offset words. Tails (in
 * order): the 30-byte charter, the concatenated 1952-byte signer pubkeys,
 * and the concatenated 3309-byte signatures. The signatures must verify
 * over {@link updateCharterMessage}. `signerPubkeys`/`signatures` accept
 * either a single concatenated buffer or an array of per-signer values
 * (`7..=10` entries, equal counts).
 */
declare function encodeUpdateCharterCalldata(args: UpdateCharterCalldataArgs): string;
/** Encode `getPendingCharter(uint32)` view calldata (Component H). */
declare function encodeGetPendingCharterCalldata(clusterId: bigint | number | string): string;
/**
 * Decode a `getPendingCharter(uint32)` return tuple (Component H).
 *
 * Wire return: head of 5 words `(bool present, uint16 delegatorShareBps,
 * uint64 effectiveEpoch, uint16 signerCount, uint64 bytesOffset)`, then a
 * `bytes` tail `(length word + one 32-byte packed-shares word)`. The
 * packed-shares word holds the 10×u16 BE member shares in its low 20
 * bytes (offset 12..32) — the same layout the on-chain encoder writes.
 */
declare function decodePendingCharter(returnData: string | Uint8Array | readonly number[]): PendingCharterView;
/**
 * Encode `commitArchiveRoot(bytes32,uint16,bytes32,uint64)` calldata
 * (Component B). All four args are fixed-size — a flat 4-word head.
 *
 * BLOCKER-1: enforces the on-chain `MIN_ARCHIVE_LEAF_COUNT` floor
 * client-side — a `leafCount` below
 * {@link NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT} is rejected here so a
 * doomed commit never burns a nonce (the chain rejects it with
 * `ArchiveCommitmentTooFewLeaves`).
 */
declare function encodeCommitArchiveRootCalldata(args: CommitArchiveRootCalldataArgs): string;
/**
 * Encode `answerArchiveChallenge(bytes32,uint16,uint64,bytes,bytes32[])`
 * calldata (Component B).
 *
 * BLOCKER-1 (mono-core `service-rewards` d2ee4548): the caller-supplied
 * `roundCertDigest` + `nonce` were removed. The challenge seed is the
 * protocol-pinned per-epoch quorum-certificate digest and the nonce is
 * derived from it on-chain, so the caller submits only `(peerId,
 * shardIndex, epoch, leaf, proof)`.
 *
 * Head: 5 words — three fixed args then the `bytes leaf` offset and the
 * `bytes32[] proof` offset. Tails: the leaf bytes, then the proof array
 * (length word + N × 32-byte sibling words).
 */
declare function encodeAnswerArchiveChallengeCalldata(args: AnswerArchiveChallengeCalldataArgs): string;
/**
 * Slot holding the protocol-issued archive challenge seed pinned for
 * `epoch` (Component B, BLOCKER-1). `keccak256(0x32 || epoch_be64 ||
 * 0x03)`. The stored 32-byte value is the quorum-certificate digest the
 * protocol pins at the epoch boundary; a zero word means no seed pinned
 * (the epoch is un-answerable / fail-closed). Mirrors mono-core
 * `archive_challenge::slot_epoch_challenge_seed`.
 *
 * No RPC method exists for this read yet — derive the slot key and SLOAD
 * it via `eth_getStorageAt` / `lyth_getStorageAt` against the node-registry
 * account `0x1005`, then feed the returned word into
 * {@link deriveArchiveChallenge}.
 */
declare function slotEpochChallengeSeed(epoch: bigint | number | string): string;
/**
 * Derive the protocol-issued challenge nonce for `epoch` from the pinned
 * challenge `seed` (Component B, BLOCKER-1). Mirrors mono-core
 * `archive_challenge::protocol_nonce_for_epoch`:
 *
 * `nonce = u64_be(BLAKE3(ARCHIVE_NONCE_DOMAIN ‖ epoch_be64 ‖ seed)[..8])`.
 *
 * The nonce is a pure function of the pinned (ungrindable) seed and the
 * epoch — there is exactly one valid `(epoch, nonce)` coordinate per epoch,
 * fixed by consensus state the operator does not control.
 */
declare function protocolNonceForEpoch(seed: string | Uint8Array | readonly number[], epoch: bigint | number | string): bigint;
/**
 * Derive the deterministic archive serve-challenge for `(opHash,
 * shardIndex, epoch)` against a committed `leafCount`, using the
 * ON-CHAIN protocol-pinned `seed` (Component B, BLOCKER-1). Mirrors
 * mono-core `archive_challenge::derive_challenge` with the protocol nonce
 * derived internally via {@link protocolNonceForEpoch}:
 *
 * `nonce = protocolNonceForEpoch(seed, epoch)`;
 * `challengeSeed = BLAKE3(ARCHIVE_CHALLENGE_DOMAIN ‖ seed ‖ opHash ‖
 *  shardIndex_be16 ‖ epoch_be64 ‖ nonce_be64)`; the leaf index is the
 * challenge seed's first 8 bytes (BE u64) modulo `leafCount`.
 *
 * `seed` is NOT caller-chosen — it is the quorum-certificate digest the
 * protocol pins for `epoch`, read from {@link slotEpochChallengeSeed} via
 * `eth_getStorageAt`. Returns `null` when `leafCount === 0` (nothing
 * committed → nothing to challenge). Useful for off-chain tooling that
 * mirrors what an operator is about to be asked.
 */
declare function deriveArchiveChallenge(seed: string | Uint8Array | readonly number[], opHash: string | Uint8Array | readonly number[], shardIndex: number, epoch: bigint | number | string, leafCount: bigint | number | string): ArchiveChallenge | null;
/**
 * Hash one merkle leaf with Component B's domain separation:
 * `BLAKE3(0x00 || leaf)`. Mirrors mono-core `merkle_leaf_hash`.
 */
declare function archiveMerkleLeafHash(leaf: string | Uint8Array | readonly number[]): Uint8Array;
/**
 * Hash an inner merkle node with Component B's domain separation:
 * `BLAKE3(0x01 || left || right)`. Mirrors mono-core `merkle_inner_hash`.
 */
declare function archiveMerkleInnerHash(left: string | Uint8Array | readonly number[], right: string | Uint8Array | readonly number[]): Uint8Array;
/**
 * Encode `setProbeAuthority(address)` calldata (Component C,
 * foundation-multisig-gated). `address(0)` clears the dedicated authority
 * (attestation then authorises against the foundation multisig alone).
 */
declare function encodeSetProbeAuthorityCalldata(probeAuthority: string | Uint8Array | readonly number[]): string;
/** Encode `getProbeAuthority()` view calldata (Component C). */
declare function encodeGetProbeAuthorityCalldata(): string;
/**
 * Decode a `getProbeAuthority()` return word into a `0x`-prefixed 20-byte
 * address (Component C). The zero address means no dedicated authority is
 * configured (the foundation multisig is the sole attestor).
 */
declare function decodeProbeAuthority(returnData: string | Uint8Array | readonly number[]): string;
/**
 * Encode `attestServiceProbe(bytes32,uint32,uint8,uint64)` calldata
 * (Component C, probe-authority/foundation-gated). Writes the
 * score-domain attested status for every service bit in `serviceMask`,
 * keyed by `opHash` and stamped with `epoch`. A flat 4-word head.
 */
declare function encodeAttestServiceProbeCalldata(args: AttestServiceProbeCalldataArgs): string;
/**
 * Slot holding the settled per-cluster ServiceScore (Component A), read
 * each block by the reward path. `keccak256(0x24 || 0x00 ||
 * clusterId_be32)`. The value is a right-aligned `u64`; `0` ⇒ never
 * scored. Mirrors `protocore_service_score::slot_cluster_service_score`.
 */
declare function slotClusterServiceScore(clusterId: bigint | number | string): string;
/**
 * Slot holding the `(cluster, epoch)` archive-challenge pass flag
 * (Component B writes; Component A reads). `keccak256(0x24 || 0x01 ||
 * clusterId_be32 || epoch_be64)`. Mirrors
 * `protocore_service_score::slot_archive_challenge_pass` /
 * node-registry `slot_cluster_pass`.
 */
declare function slotArchiveChallengePass(clusterId: bigint | number | string, epoch: bigint | number | string): string;
/**
 * Slot holding the attested probe status for `(opHash, serviceBit)`
 * (Component C writes; Component A reads). `keccak256(0x24 || 0x02 ||
 * opHash || serviceBit)`. `serviceBit` is the BIT INDEX (`SERVES_RPC`=0,
 * `SERVES_INDEXER`=1, `SERVES_ARCHIVE`=3, …) — NOT the capability mask
 * value. The stored word packs `(epoch << 8) | status` (see
 * {@link decodeScoreServiceProbe}). Mirrors
 * `protocore_service_score::slot_service_probe_status` /
 * node-registry `slot_score_service_probe`.
 */
declare function slotScoreServiceProbe(opHash: string | Uint8Array | readonly number[], serviceBit: number): string;
/** The single bit index (`0..=15`) of a single-flag capability mask, or `null`. */
declare function serviceMaskToBitIndex(mask: number): number | null;
/**
 * Decode a `slotScoreServiceProbe` storage word — the packed
 * `(epoch << 8) | status` value. Returns the attestation epoch and the
 * status byte. A zero word means no attestation on file.
 */
declare function decodeScoreServiceProbe(word: string | Uint8Array | readonly number[]): {
    epoch: bigint;
    status: number;
};
/**
 * Slot holding the rotatable probe-authority address (Component C).
 * `keccak256(TAG_TREASURY=0x1F || 32 zero bytes || 0x0A)`. Mirrors
 * node-registry `storage::slot_probe_authority`.
 */
declare function slotProbeAuthority(): string;
/**
 * Slot for one sub-kind of a cluster's ACTIVE charter record (Law §6.8).
 * `keccak256(0x31 || clusterId_be32 || subkind)`. Mirrors mono-core
 * `cluster_anchor::slot_cluster_charter`.
 *
 * No RPC method exists for the active charter — derive the slot key and
 * SLOAD it via `eth_getStorageAt` / `lyth_getStorageAt` against the
 * node-registry account `0x1005`, then feed both words into
 * {@link decodeActiveCharter}. See {@link slotClusterCharterDelegator} and
 * {@link slotClusterCharterMembers} for the two concrete sub-kinds.
 */
declare function slotClusterCharter(clusterId: bigint | number | string, subkind: number): string;
/**
 * Slot holding the active charter's presence + delegator share
 * (sub-kind `0x00`). The stored word is a right-aligned `u64` equal to
 * `delegatorShareBps + 1`; a zero word means NO active charter.
 */
declare function slotClusterCharterDelegator(clusterId: bigint | number | string): string;
/**
 * Slot holding the active charter's packed member shares (sub-kind `0x01`).
 * The stored word holds the 10×u16 BE member shares in its low 20 bytes
 * (offset 12..32).
 */
declare function slotClusterCharterMembers(clusterId: bigint | number | string): string;
/**
 * Decode the two ACTIVE-charter storage words into an {@link ActiveCharterView}.
 *
 * `delegatorWord` is the sub-kind `0x00` presence word
 * ({@link slotClusterCharterDelegator}); `membersWord` is the sub-kind
 * `0x01` packed-shares word ({@link slotClusterCharterMembers}). When the
 * presence word is zero the cluster has no active charter and `present` is
 * `false` (zeroed shares). Mirrors mono-core
 * `cluster_anchor::load_cluster_charter_*`: the presence word decodes as
 * `delegatorShareBps = word - 1` (saturating), and the members word packs
 * the 10×u16 BE shares at byte offset 12.
 */
declare function decodeActiveCharter(delegatorWord: string | Uint8Array | readonly number[], membersWord: string | Uint8Array | readonly number[]): ActiveCharterView;
/**
 * Decode CJ-1 `getClusterJoinRequest(uint32,bytes32)` return data.
 *
 * Planned flat tuple:
 * `(address owner,uint64 requestEpoch,uint16 snapshotThreshold,uint16 snapshotN,
 *   uint16 voteCount,uint8 status,uint128 bondLythoshi,bool sealRosterPending)`.
 */
declare function decodeClusterJoinRequest(returnData: string | Uint8Array | readonly number[]): ClusterJoinRequestView;
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
    /**
     * Concatenated 48-byte cluster-member references (`0x` hex). PQ
     * rosters place the 32-byte operator id in the first 32 bytes and
     * zero-pad the remaining 16 bytes.
     */
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
declare const ML_DSA_65_PUBLIC_KEY_LEN = 1952;
declare const ML_DSA_65_SIGNATURE_LEN = 3309;
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
declare const NO_EVM_FINALITY_EVIDENCE_SOURCE = "roundCertificate";
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
type NoEvmRoundFinalityVerification = NoEvmBlsFinalityVerification;
type NoEvmBlockRoundFinalityVerification = NoEvmBlockBlsFinalityVerification;
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
type NoEvmReceiptTrustedSigner = NoEvmReceiptTrustedBlsSigner;
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

type RoundCertificateResponse = RoundCertificateResponse$1;
/** @deprecated Use {@link RoundCertificateResponse}. The JSON wire is identical. */
type BlsCertificateResponse = RoundCertificateResponse;
type EthCallRequest = CallRequest & {
    /** Alias accepted by `eth_call` / `eth_estimateGas`; `data` is canonical. */
    input?: string;
    /** EIP-1559-style fee alias accepted by the compatibility parser. */
    maxFeePerGas?: string;
};
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
    source: "roundCertificate" | string;
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
    consensusKeyFingerprint: string | null;
    lifecycleState: string;
    capability: Record<string, unknown>;
}
interface ClusterMemberResponse {
    operatorId: string;
    consensusPubkey: string;
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
    consensusPubkey: string;
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
    /**
     * `eth_getBalance` — balance + Merkle proof envelope.
     *
     * The node may answer with a bare `0x…` hex word or a proof-wrapped
     * object; both are normalized to a consistent {@link AccountProofResponse}
     * via {@link normalizeAccountProof} so `.value` is always the bare word.
     */
    ethGetBalance(address: string, block?: BlockSelector): Promise<AccountProofResponse>;
    /**
     * `eth_getStorageAt` — storage word + Merkle proof.
     *
     * The node returns a proof-wrapped object
     * `{ value, proof, stateRoot, blockNumber }` (some builds use a bare
     * `0x…` hex word). Both shapes are normalized to a consistent
     * {@link AccountProofResponse} via {@link normalizeAccountProof}; `.value`
     * is always the bare storage word (even-length hex, `0x0` when zero).
     */
    ethGetStorageAt(address: string, slot: string, block?: BlockSelector): Promise<AccountProofResponse>;
    /** `eth_getTransactionCount` — sender nonce. */
    ethGetTransactionCount(address: string, block?: BlockSelector): Promise<bigint>;
    /** `eth_getCode` — deployed bytecode (`0x` for an EOA, `0xfe` for a precompile). */
    ethGetCode(address: string, block?: BlockSelector): Promise<string>;
    /** `eth_call` — read-only execution against committed state. */
    ethCall(request: EthCallRequest, block?: BlockSelector): Promise<string>;
    /** `eth_estimateGas` — read-only execution-unit estimate for a call object. */
    ethEstimateGas(request: EthCallRequest, block?: BlockSelector): Promise<bigint>;
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
    /**
     * `lyth_registryStateProof` — Merkle proof for a registry entry.
     *
     * Normalized through {@link normalizeAccountProof} so a bare-hex or
     * proof-wrapped answer both yield a consistent {@link AccountProofResponse}.
     */
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
     * Component H — read a cluster's ACTIVE economics charter (Law §6.8).
     *
     * There is no `lyth_*` / view-selector for the active charter, so this
     * SLOADs the two `TAG_CLUSTER_CHARTER` (`0x31`) storage words from the
     * node-registry account `0x1005` via `eth_getStorageAt` and decodes them
     * with {@link decodeActiveCharter}. Returns `{ present: false }` (zeroed
     * shares) for genesis / 3-arg-formCluster clusters that never adopted a
     * charter. The active record carries no `effectiveEpoch` — that lives on
     * the pending amendment ({@link lythGetPendingCharter}).
     */
    lythGetClusterCharter(clusterId: number, block?: BlockSelector): Promise<ActiveCharterView>;
    /**
     * Component H — read a cluster's PENDING charter amendment (Law §6.8).
     *
     * Calls the `getPendingCharter(uint32)` view on the node-registry account
     * `0x1005` over `eth_call` and decodes the return with
     * {@link decodePendingCharter}. Returns `{ present: false }` when no
     * amendment is posted; otherwise carries the proposed shares plus the
     * `effectiveEpoch` at which the delegator-protective cooldown lands.
     */
    lythGetPendingCharter(clusterId: number, block?: BlockSelector): Promise<PendingCharterView>;
    /**
     * Component A — read a cluster's settled per-cluster ServiceScore (the
     * `u64` the reward path reads each block). SLOADs the `TAG_SERVICE_SCORE`
     * (`0x24`) score slot from `0x1005` via `eth_getStorageAt`; `0n` means the
     * cluster has never been scored.
     */
    lythGetClusterServiceScore(clusterId: number, block?: BlockSelector): Promise<bigint>;
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
    /** `lyth_getRoundCertificate` — round-advancement certificate. */
    lythGetRoundCertificate(round: number | bigint | string): Promise<RoundCertificateResponse | null>;
    /** @deprecated Use lythGetRoundCertificate. */
    lythGetBlsRoundCertificate(round: number | bigint | string): Promise<RoundCertificateResponse | null>;
    /** `lyth_getLeaderCertificate` — leader-vote certificate for a block ref. */
    lythGetLeaderCertificate(round: number | bigint | string, authority: number, digest: string): Promise<RoundCertificateResponse | null>;
    /** `lyth_getDacCertificate` — data-availability certificate for a block ref. */
    lythGetDacCertificate(round: number | bigint | string, authority: number, digest: string): Promise<RoundCertificateResponse | null>;
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

/**
 * Binary-tree state-proof verification (NOMT / EIP-7864 sparse Merkle).
 *
 * Since the W4-F cutover the node's value-path state commitment is a
 * binary sparse Merkle tree hashed with BLAKE3 (the consensus state hash —
 * NOT keccak, which stays on the EVM-compat receipt surfaces). `eth_getBalance`,
 * `eth_getStorageAt`, and `lyth_registryStateProof` ship the value alongside a
 * binary-native {@link ProofEnvelope} carrying a `proofKind` discriminant plus
 * the sibling path.
 *
 * This module mirrors the Rust verifier in `protocore-state`
 * (`verify_binary_inclusion` / `verify_binary_non_inclusion`) and the SDK's
 * `ProofVerifier` in `crates/sdk`, so a TypeScript caller can trust-minimise a
 * state read against a BLAKE3 `storage_root` / state root without a node.
 *
 * Node-hash discipline (must match `protocore_state::Blake3Hasher` exactly):
 * - value hash  = `BLAKE3(value)`
 * - leaf        = `BLAKE3(0x00 || path32 || valueHash32)`
 * - internal    = `BLAKE3(0x01 || left32 || right32)`, with the empty-subtree
 *   collapse: an internal node whose two children are both the terminator IS
 *   the terminator (`0x00..00`).
 * - terminator (empty subtree) = `[0x00; 32]`.
 * - the leaf key's tree path is `BLAKE3(key)`, walked MSB-first.
 */
/** The `proofKind` discriminant for the binary sparse-Merkle proof. */
declare const PROOF_KIND_BINARY = "binary";
/**
 * Wire shape of a binary-native Merkle inclusion proof attached to a response.
 *
 * Mirrors `protocore_rpc::proof::ProofEnvelope`. `proofKind` is `"binary"`
 * since the W4-F cutover; a future scheme (e.g. a STARK keystone) adds a new
 * value and callers branch on it.
 */
interface ProofEnvelope {
    /** Proof family discriminant. `"binary"` for the sparse-Merkle scheme. */
    proofKind: string;
    /** Hex sibling hashes from the leaf's depth up to the root, leaf-side first. */
    siblings: string[];
    /** Hex-encoded leaf key. */
    key: string;
    /** Hex-encoded leaf value. */
    value: string;
}
/** The node a target path reaches when walked from the root. */
type BinaryProofEndpoint = {
    kind: "found";
    valueHash: string;
} | {
    kind: "terminator";
} | {
    kind: "otherLeaf";
    path: string;
    valueHash: string;
};
/**
 * Wire shape of a binary-native non-inclusion proof.
 *
 * Mirrors `protocore_state::BinaryNonInclusionProof` as emitted by the node's
 * non-inclusion endpoint: the sibling path the target key walks plus the
 * endpoint it reaches (an empty subtree or a different leaf).
 */
interface NonInclusionProofEnvelope {
    /** Proof family discriminant. `"binary"`. */
    proofKind: string;
    /** The key proved absent (hex). */
    key: string;
    /** Hex sibling hashes from the endpoint's depth up to the root, endpoint-side first. */
    siblings: string[];
    /** The node the key's path reaches (never `found`). */
    endpoint: BinaryProofEndpoint;
}
type ProofVerifyErrorCode = "unsupported_proof_kind" | "invalid_hex" | "invalid_hash_length" | "proof_verify_failed" | "non_inclusion_verify_failed" | "state_root_mismatch";
declare class ProofVerifyError extends Error {
    readonly code: ProofVerifyErrorCode;
    constructor(code: ProofVerifyErrorCode, message: string);
}
/**
 * Verify a binary-tree inclusion or non-inclusion proof against a trusted
 * BLAKE3 state / storage root.
 *
 * Stateless — a single instance can be shared. It exists so a future proof
 * family (e.g. a STARK keystone) can slot in behind the same SDK surface.
 * Mirrors `protocore_sdk::proof::ProofVerifier`.
 */
declare class ProofVerifier {
    /**
     * Verify a {@link ProofEnvelope} inclusion proof against `stateRoot`.
     *
     * @returns `true` when the proof binds `(key, value)` to `stateRoot`.
     */
    verifyInclusion(stateRoot: string | Uint8Array, proof: ProofEnvelope): boolean;
    /**
     * Verify a {@link ProofEnvelope} inclusion proof, throwing a
     * {@link ProofVerifyError} on failure (the loud variant for wallets).
     */
    assertInclusion(stateRoot: string | Uint8Array, proof: ProofEnvelope): void;
    /**
     * Verify a {@link NonInclusionProofEnvelope} against `stateRoot`.
     *
     * Returns `false` for a `found` endpoint (that is an inclusion, not
     * absence) or an `otherLeaf` whose path equals the queried key. Mirrors
     * `protocore_state::verify_binary_non_inclusion`.
     */
    verifyNonInclusion(stateRoot: string | Uint8Array, proof: NonInclusionProofEnvelope): boolean;
    /**
     * Verify a non-inclusion proof, throwing a {@link ProofVerifyError} on
     * failure.
     */
    assertNonInclusion(stateRoot: string | Uint8Array, proof: NonInclusionProofEnvelope): void;
}
/** A reusable stateless verifier instance. */
declare const proofVerifier: ProofVerifier;
/**
 * Narrow an opaque `AccountProofResponse.proof` field into a typed binary
 * {@link ProofEnvelope}, returning `null` when absent or not the binary scheme.
 */
declare function asBinaryProofEnvelope(proof: unknown): ProofEnvelope | null;
/** Hex-encode a 32-byte hash with the `0x` prefix (test/helper convenience). */
declare function hashToHex(hash: Uint8Array): string;

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
interface MrvSubmissionResult {
    signedTxWireHex: string;
    innerSighashHex: string;
    innerTxHashHex: string;
    innerWireBytes: number;
    txHash: string;
}
type MrvDeploySubmitOptions = MrvDeployNativeTxOptions;
type MrvDeployPayloadSubmitOptions = MrvDeployPayloadNativeTxOptions;
type MrvCallSubmitOptions = MrvCallNativeTxOptions;
type MrvDeploySubmission = MrvDeployNativeTxPlan & MrvSubmissionResult;
type MrvDeployPayloadSubmission = MrvDeployNativeTxPlan & MrvSubmissionResult;
type MrvCallSubmission = MrvCallNativeTxPlan & MrvSubmissionResult;
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
 * unavailable or the request state is not admissible, then submit a
 * plaintext native transaction (the sole submit path since the v2
 * re-genesis dropped the encrypted mempool).
 */

declare const DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT = 1000000n;
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
interface SubmitRequestClusterJoinArgs extends ClusterJoinFeeOptions {
    client: ClusterJoinSubmitClient;
    mnemonic: string;
    clusterId: bigint | number | string;
    operatorPubkey: string | Uint8Array | readonly number[];
    bondLythoshi: bigint | number | string;
}
interface SubmitVoteClusterAdmitArgs extends ClusterJoinFeeOptions {
    client: ClusterJoinSubmitClient;
    mnemonic: string;
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
    voterPubkey: string | Uint8Array | readonly number[];
}
interface ClusterJoinSubmitResult {
    txHash: string;
    clusterId: string;
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
declare function submitRequestClusterJoin(args: SubmitRequestClusterJoinArgs): Promise<ClusterJoinSubmitResult>;
declare function submitVoteClusterAdmit(args: SubmitVoteClusterAdmitArgs): Promise<ClusterJoinSubmitResult>;

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

export { ADDRESS_HRP, ADDRESS_KIND_HRPS, API_STREAM_TOPICS, type AccountPolicy, type AccountProofResponse, type ActiveCharterView, type Address, type AddressActivityArchiveRedirect, type AddressActivityEntry, type AddressActivityEntryEnriched, type AddressActivityKind, type AddressActivityKindResponse, type AddressActivityKindRetention, AddressError, type AddressFlowResponse, type AddressKind, type AddressLabelRecord, type AddressProfileResponse, type AddressValidation, AgentActionError, type AgentReputationCategoryScope, type AgentReputationRecord, type AgentReputationResponse, type AnswerArchiveChallengeCalldataArgs, type ApiAddressActivityData, type ApiAddressActivityEntry, type ApiAddressActivityKind, type ApiAddressActivityKindData, type ApiAddressActivityKindSummary, type ApiBlockData, type ApiBlockHeader, type ApiBlockTransactionsData, type ApiCapabilitiesResponse, ApiClient, type ApiClientOptions, type ApiClusterData, type ApiClusterDirectoryEntry, type ApiClusterDirectoryPage, type ApiClusterMember, type ApiClusterStatus, type ApiClustersData, type ApiEnvelope, type ApiErrorEnvelope, type ApiHealthResponse, type ApiIndexerStatus, type ApiLatestAnchor, type ApiLogEntry, type ApiOperatorData, type ApiOperatorInfo, type ApiQueryValue, type ApiRuntimeProvenanceData, type ApiServiceProbeData, type ApiStreamTopic, type ApiStreamTopicMetadata, type ApiStreamTopicRetention, type ApiStreamsIndexResponse, type ApiTransactionData, type ApiTransactionNativeReceiptData, type ApiTransactionReceipt, type ApiTransactionReceiptData, type ApiTransactionView, type ApiUpgradePlanStatus, type ApiUpgradeStatus, type ApiUpgradeStatusData, type ArchiveChallenge, type AssetPolicy, type AttestDkgReshareCalldataArgs, type AttestServiceProbeCalldataArgs, type AttestationWindow, BRIDGE_QUOTE_API_BLOCKED_REASON, BRIDGE_REVERT_TAGS, BRIDGE_SELECTORS, BRIDGE_SUBMIT_API_BLOCKED_REASON, BURN_ADDR, type BinaryProofEndpoint, type BlockHeader, type BlockSelector, type BlockTag, type BlsCertificateResponse, type BridgeAdminControl, type BridgeAnchorState, type BridgeBreakerState, type BridgeBytesInput, type BridgeCircuitBreakerFields, type BridgeCircuitBreakerState, type BridgeDrainCap, type BridgeDrainStatus, type BridgeHealthRecord, type BridgeHealthResponse, BridgePrecompileError, type BridgeQuoteSubmitReadiness, type BridgeRiskTier, type BridgeRouteAssessment, type BridgeRouteCandidate, type BridgeRouteCatalogue, BridgeRouteCatalogueError, type BridgeRouteCatalogueJsonOptions, type BridgeRouteCataloguePayload, type BridgeRouteCatalogueRoute, type BridgeRouteCatalogueValidation, type BridgeRouteDisclosure, type BridgeRouteSelection, type BridgeRoutesRequest, type BridgeRoutesResponse, type BridgeRoutesSource, type BridgeTransferIntent, type BridgeTransferRequest, type BridgeVerifierDisclosure, type BuildRequestClusterJoinTxFieldsArgs, type BuildVoteClusterAdmitTxFieldsArgs, CHAIN_REGISTRY, CHAIN_REGISTRY_RAW_BASE, CLOB_MARKET_ID_DOMAIN_TAG, CLOB_SELECTORS, CLUSTER_FORMED_EVENT_SIG, type CallRequest, type CancelClusterJoinCalldataArgs, type CancelPendingChangeCalldataArgs, type CancelSpotOrderArgs, type CapabilitiesResponse, type CapabilityDescriptor, type ChainInfo, type ChainRegistry, type ChainStatsResponse, type CheckpointRecord, type CirculatingSupplyResponse, type ClobMarketAssets, type ClobMarketRecord, type ClobMarketResponse, type ClobMarketSummary, type ClobMarketsResponse, type ClobOhlcResponse, type ClobOrderBookResponse, type ClobTrade, type ClobTradesResponse, type ClusterAprResponse, type ClusterCharterArgs, type ClusterDelegatorsResponse, type ClusterDirectoryEntryResponse, type ClusterDirectoryPageResponse, type ClusterDiversity, type ClusterDiversityView, type ClusterEntityResponse, type ClusterFormedEvent, type ClusterJoinFeeOptions, type ClusterJoinReadClient, type ClusterJoinRequestStatus, type ClusterJoinRequestView, type ClusterJoinSubmitClient, type ClusterJoinSubmitResult, type ClusterJoinTxFee, type ClusterMemberResponse, type ClusterNameResponse, type ClusterResignationRow, type ClusterResignationsResponse, type ClusterStatusResponse, type CommitArchiveRootCalldataArgs, type CreateFixedSupplyMrc20CalldataArgs, type CreateRequestCanonicalArgs, type CreateTokenCalldataArgs, DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT, DELEGATION_REVERT_TAGS, DELEGATION_SELECTORS, DIVERSITY_SCORE_MAX, type DagParent, type DagParentsResponse, type DagSyncStatus, type DecodeTxExtension, type DecodeTxLog, type DecodeTxPqAttestation, type DecodeTxResponse, type DelegationCapResponse, type DelegationHistoryRecord, DelegationPrecompileError, type DelegationRow, type DelegationsResponse, type DutyAbsence, EMPTY_ROOT, EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER, type EncodeNativeAgentAvailabilitySlotArgs, type EncodeNativeAgentCounterEscrowArgs, type EncodeNativeAgentCreateEscrowArgs, type EncodeNativeAgentDeactivateServiceArgs, type EncodeNativeAgentEscrowActorArgs, type EncodeNativeAgentGrantConsentArgs, type EncodeNativeAgentIssueAttestationArgs, type EncodeNativeAgentListServiceArgs, type EncodeNativeAgentRecordPolicySpendArgs, type EncodeNativeAgentRecordReputationArgs, type EncodeNativeAgentRegisterArbiterArgs, type EncodeNativeAgentRegisterIssuerArgs, type EncodeNativeAgentResolveEscrowArgs, type EncodeNativeAgentRevokeAttestationArgs, type EncodeNativeAgentRevokeConsentArgs, type EncodeNativeAgentSetAvailabilityArgs, type EncodeNativeAgentSetSpendingPolicyArgs, type EncodeNativeAgentStartEscrowArgs, type EncodeNativeAgentSubmitEscrowArgs, type EncodeNativeNftBuyListingArgs, type EncodeNativeNftCancelListingArgs, type EncodeNativeNftCreateListingArgs, type EncodeNativeNftPlaceAuctionBidArgs, type EncodeNativeNftSettleAuctionArgs, type EncodeNativeNftSweepExpiredListingsArgs, type EncodeNativeSpotCancelOrderArgs, type EncodeNativeSpotCreateMarketArgs, type EncodeNativeSpotLimitOrderArgs, type EncodeNativeSpotSettleLimitOrderArgs, type EncodeNativeSpotSettleRoutedLimitOrderArgs, type EntityRatchetResponse, type EthCallRequest, type EthSendTransactionRequest, type ExecutionUnitPriceResponse, type ExpireClusterJoinCalldataArgs, type ExplorerEndpoint, FEED_ID_DOMAIN_TAG, type FeeHistoryResponse, type FormClusterCalldataArgs, type FormClusterV2CalldataArgs, type GapRange, type GapRecord, type GapRecordsResponse, type GenesisVerdict, type GetClusterJoinRequestCalldataArgs, type Hash, type HealthSummary, type Hex, type IndexerStatus, type JailStatusWindow, type KeyRotationWindow, LYTHOSHI_PER_LYTH, LYTH_DECIMALS, type LatencyBands, type ListProofRequestsResponse, type LythFormatOptions, type LythUpgradePlanStatus, type LythUpgradeStatusResponse, MAX_MULTISIG_MEMBERS, MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES, MAX_NATIVE_RECEIPT_EVENTS, MIN_EXECUTION_UNIT_PRICE_LYTHOSHI, MIN_MULTISIG_MEMBERS, ML_DSA_65_PUBLIC_KEY_LEN, ML_DSA_65_SIGNATURE_LEN, MONOLYTHIUM_NETWORKS, MONOLYTHIUM_TESTNET_CHAIN_ID, MONOLYTHIUM_TESTNET_NETWORK_NAME, MRV_DEPLOY_PAYLOAD_VERSION, MRV_FORMAT_VERSION, MRV_MAX_ABI_SYMBOLS, MRV_MAX_CODE_BYTES, MRV_MAX_DEBUG_BYTES, MRV_MAX_MEMORY_PAGES, MRV_MAX_STORAGE_NAMESPACE_BYTES, MRV_MEMORY_PAGE_BYTES, MRV_PROFILE_MONO_RV32IM_V1, MRV_STRUCTURED_FEE_FIELDS, MRV_TX_EXTENSION_KIND, MRV_TX_EXTENSION_V1, MULTISIG_ADDRESS_DERIVATION_DOMAIN$1 as MULTISIG_ADDRESS_DERIVATION_DOMAIN, MULTISIG_ADDRESS_DERIVATION_DOMAIN as MULTISIG_WITNESS_ADDRESS_DERIVATION_DOMAIN, MULTISIG_WITNESS_DOMAIN, MarketActionError, type MarketTransactionPlan, type MemberPubkeyInput, type MempoolSnapshot, type MeshDecodedTx, type MeshSignedTxResponse, type MeshTxIntent, type MeshUnsignedTxResponse, type MetricsRangeResponse, type MetricsRangeSample, type MetricsRangeSeries, type MetricsRangeStatus, type MonolythiumNetworkConfig, type MrcAccountRecord, type MrcAccountRequest, type MrcAccountResponse, type MrcHoldersRequest, type MrcHoldersResponse, type MrcMetadataRecord, type MrcMetadataResponse, type MrcPolicyRecord, type MrcPolicySpendRecord, type MrvAbiManifest, type MrvAbiParam, type MrvAbiSymbol, type MrvAbiSymbolKind, type MrvAbiType, type MrvAddressKind, type MrvArtifactMetadata, type MrvBuildMetadata, type MrvBytesLike, type MrvCallNativeTxOptions, type MrvCallNativeTxPlan, type MrvCallPlan, type MrvCallRequest, type MrvCallResponse, type MrvCallStatus, type MrvCallSubmission, type MrvCallSubmitOptions, type MrvDecimalLike, type MrvDeployNativeTxOptions, type MrvDeployNativeTxPlan, type MrvDeployPayload, type MrvDeployPayloadNativeTxOptions, type MrvDeployPayloadPlanOptions, type MrvDeployPayloadRequestOptions, type MrvDeployPayloadSubmission, type MrvDeployPayloadSubmitOptions, type MrvDeployPlan, type MrvDeployPlanOptions, type MrvDeployRequest, type MrvDeployResponse, type MrvDeploySubmission, type MrvDeploySubmitOptions, type MrvEventRecord, type MrvExecutionReceipt, type MrvFeeDisplayConformanceInput, type MrvFeeDisplayConformanceReport, type MrvMemoryLimits, type MrvMeterCounters, type MrvNativeFeePreview, type MrvNativeStateDelta, type MrvNativeTxFacade, type MrvRequestBuildOptions, type MrvResolvedSyscall, type MrvRevertPayload, type MrvRiscvProfile, type MrvStorageNamespace, type MrvStructuredFeeConformanceOptions, type MrvStructuredFeeConformanceReport, type MrvSubmissionResult, type MrvSyscallImport, type MrvTransactionExtension, type MrvTypedAddress, type MrvValidatedArtifactMetadata, MrvValidationError, MultisigError, type MultisigMember, type MultisigMemberSignature, type MultisigWitness, NAME_BASE_MULTIPLIER, NAME_FALLBACK_FEE_UNIT_LYTHOSHI, NAME_LABEL_MAX_LEN, NAME_LABEL_MIN_LEN, NAME_MAX_LEN, NAME_REGISTRY_SELECTORS, NATIVE_AGENT_MODULE_ADDRESS, NATIVE_AGENT_MODULE_ADDRESS_BYTES, NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE, NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY, NATIVE_CALL_FORWARDER_RESPONSE_OFFSET, NATIVE_DEV_HOST_API_VERSION, NATIVE_DEV_IPC_PROTOCOL_VERSION, NATIVE_DEV_MANIFEST_SCHEMA_VERSION, NATIVE_LYTH_DECIMALS, NATIVE_MARKET_EVENT_FAMILY, NATIVE_MARKET_MODULE_ADDRESS, NATIVE_MARKET_MODULE_ADDRESS_BYTES, NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC, NODE_REGISTRY_ARCHIVE_CHALLENGE_DOMAIN, NODE_REGISTRY_ARCHIVE_KIND_EPOCH_SEED, NODE_REGISTRY_ARCHIVE_NONCE_DOMAIN, NODE_REGISTRY_BLS_PUBKEY_BYTES, NODE_REGISTRY_CAPABILITIES, NODE_REGISTRY_CAPABILITY_MASK, NODE_REGISTRY_CHALLENGE_EPOCH_WINDOW, NODE_REGISTRY_CHARTER_COOLDOWN_EPOCHS, NODE_REGISTRY_CLUSTER_CHARTER_BYTES, NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS, NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS, NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES, NODE_REGISTRY_CONSENSUS_POP_BYTES, NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES, NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES, NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES, NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS, NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS, NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES, NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT, NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT, NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN, NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN_V2, NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT, NODE_REGISTRY_FORM_CLUSTER_THRESHOLD, NODE_REGISTRY_LEGACY_CLUSTER_MEMBER_PUBKEY_BYTES, NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH, NODE_REGISTRY_MERKLE_INNER_DOMAIN, NODE_REGISTRY_MERKLE_LEAF_DOMAIN, NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT, NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES, NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES, NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID, NODE_REGISTRY_PUBLIC_SERVICE_MASK, NODE_REGISTRY_SELECTORS, NODE_REGISTRY_SUBKIND_CHARTER_DELEGATOR_BPS, NODE_REGISTRY_SUBKIND_CHARTER_MEMBER_SHARES, NODE_REGISTRY_TAG_ARCHIVE_CHALLENGE, NODE_REGISTRY_TAG_CLUSTER_CHARTER, NODE_REGISTRY_TAG_SERVICE_SCORE, NODE_REGISTRY_TAG_TREASURY, NODE_REGISTRY_UPDATE_CHARTER_MESSAGE_DOMAIN, NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD, NO_EVM_ARCHIVE_PROOF_SCHEMA, NO_EVM_ARCHIVE_SIGNATURE_SCHEME, NO_EVM_FINALITY_EVIDENCE_SCHEMA, NO_EVM_FINALITY_EVIDENCE_SOURCE, NO_EVM_RECEIPTS_ROOT_DOMAIN, NO_EVM_RECEIPT_CODEC, NO_EVM_RECEIPT_PROOF_SCHEMA, NO_EVM_RECEIPT_PROOF_TYPE, NO_EVM_RECEIPT_ROOT_ALGORITHM, type NameCategory, type NameOfResponse, type NameRegistrationQuote, NameRegistryError, type NativeAgentAddressInput, type NativeAgentAddressKind, type NativeAgentArbiterStateRecord, type NativeAgentAttestationStateRecord, type NativeAgentAvailabilityStateRecord, type NativeAgentConsentStateRecord, type NativeAgentEscrowResolution, type NativeAgentEscrowStateRecord, type NativeAgentForwarderInput, type NativeAgentIssuerStateRecord, type NativeAgentModuleCallEnvelope, type NativeAgentModuleContractCall, type NativeAgentPolicySpendStateRecord, type NativeAgentPolicyStateRecord, type NativeAgentReputationReviewStateRecord, type NativeAgentReputationScores, type NativeAgentServiceStateRecord, type NativeAgentStateFilter, type NativeAgentStateFilterParamValue, type NativeAgentStateResponse, type NativeAgentStateResponseFilters, type NativeAgentStateSource, type NativeCallForwarderArtifact, type NativeCollectionRoyaltyStateRecord, type NativeDecodedEvent, type NativeDevApprovalKind, type NativeDevCommandName, type NativeDevContractPassport, type NativeDevHostApprovalResultMessage, type NativeDevHostCommandMessage, type NativeDevHostContextMessage, type NativeDevIpcMessage, type NativeDevMrcAllocation, type NativeDevMrcAssetKind, type NativeDevMrcTokenPlan, type NativeDevMrvDeployPlan, type NativeDevRiskLabel, type NativeDevRiskSeverity, type NativeDevSidecarApprovalRequestMessage, type NativeDevSidecarCommandResultMessage, type NativeDevSidecarProjectEventMessage, type NativeDevSidecarReadyMessage, type NativeDevVerificationBundle, type NativeDevWalletApprovalRequest, type NativeDevkitArchive, type NativeDevkitChannel, type NativeDevkitCompatibility, type NativeDevkitManifest, type NativeDevkitSidecarManifest, type NativeDevkitSidecarStatus, type NativeDevkitStatus, type NativeEventConsumer, type NativeEventFilter, type NativeEventProjection, type NativeEventsFilter, type NativeEventsResponse, type NativeEventsResponseFilters, type NativeEventsSource, type NativeMarketAddressInput, type NativeMarketAddressKind, type NativeMarketForwarderInput, type NativeMarketModuleCallEnvelope, type NativeMarketModuleContractCall, type NativeMarketOrderBookDelta, type NativeMarketOrderBookDeltasRequest, type NativeMarketOrderBookDeltasResponse, type NativeMarketOrderBookDeltasResponseFilters, type NativeMarketOrderBookDeltasSource, type NativeMarketOrderBookStreamAction, type NativeMarketOrderBookStreamPayload, type NativeMarketStateFilter, type NativeMarketStateFilterParamValue, type NativeMarketStateResponse, type NativeMarketStateResponseFilters, type NativeMarketStateSource, type NativeModuleForwarderDescriptor, type NativeMrcPolicyProjection, type NativeNftAssetStandard, type NativeNftListingKind, type NativeNftListingStateRecord, type NativeReceiptCounters, type NativeReceiptEvent, type NativeReceiptFee, type NativeReceiptFeeDisplay, type NativeReceiptResponse, type NativeReceiptSource, type NativeSpotMarketStateRecord, type NativeSpotOrderStateRecord, type NetworkClientOptions, type NetworkSlug, type NoEvmArchiveCoveringSnapshot, type NoEvmArchiveProof, type NoEvmArchiveSignatureVerification, type NoEvmArchiveSignatureVerificationIssue, type NoEvmArchiveSignatureVerificationIssueCode, type NoEvmArchiveTrustedSigner, type NoEvmBlockBlsFinalityVerification, type NoEvmBlockRoundFinalityVerification, type NoEvmBlsFinalityVerification, type NoEvmFinalityBlockReference, type NoEvmFinalityCertificate, type NoEvmFinalityEvidence, type NoEvmReceiptFinalityTrustPolicy, type NoEvmReceiptProof, NoEvmReceiptProofError, type NoEvmReceiptProofErrorCode, type NoEvmReceiptProofVerification, type NoEvmReceiptTrustIssue, type NoEvmReceiptTrustIssueCode, type NoEvmReceiptTrustPolicy, type NoEvmReceiptTrustVerification, type NoEvmReceiptTrustedBlsSigner, type NoEvmReceiptTrustedSigner, type NoEvmRoundFinalityVerification, type NodeHostingClass, NodeRegistryError, type NonInclusionProofEnvelope, OPERATOR_ROUTER_ADDRESS, OPERATOR_ROUTER_EVENT_SIGS, OPERATOR_ROUTER_SELECTORS, OPERATOR_ROUTER_SIGS, ORACLE_EVENT_SIGS, type OperatorAuthorityResponse, type OperatorCapabilitiesResponse, type OperatorFeeChargedEvent, type OperatorFeeConfig, type OperatorFeeQuote, type OperatorInfoResponse, type OperatorNetworkMetadata, type OperatorNetworkMetadataView, type OperatorOnboardingPreview, type OperatorRiskResponse, type OperatorRouterConfig, type OperatorSigningActivityResponse, type OperatorSigningEntry, type OperatorSurfaceCapability, type OperatorSurfaceStatus, OperatorTrustError, type OperatorTrustReason, type OracleEvent, OracleEventError, type OracleFeedConfig, type OracleLatestPrice, type OracleSignerRow, type OracleSignersResponse, type OracleWriters, type P2pSeed, PENDING_CHANGE_KIND_CODES, PRECOMPILE_ADDRESSES, PROOF_KIND_BINARY, PROTOCOL_MAX_OPERATOR_FEE_BPS, PROVER_MARKET_ADDRESS, PROVER_MARKET_BID_DOMAIN, PROVER_MARKET_EVENT_SIGS, PROVER_MARKET_REQUEST_DOMAIN, PROVER_MARKET_SELECTORS, PROVER_MARKET_SUBMIT_DOMAIN, PROVER_SLASH_REASON_BAD_PROOF, PROVER_SLASH_REASON_NON_DELIVERY, PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN, PUBKEY_REGISTRY_SELECTORS, type ParsedName, type PeerSummary, type PeerSummaryAggregate, type PendingChangeKind, type PendingCharterView, type PendingRewardsResponse, type PendingRewardsRow, type PendingTxSummary, type PlaceLimitOrderViaArgs, type PlaceLimitOrderViaPlan, type PlaceSpotLimitOrderArgs, type PlaceSpotMarketOrderArgs, type PlaceSpotMarketOrderExArgs, type PrecompileAddress, type PrecompileCatalogueResponse, type PrecompileDescriptor, type PrecompileName, type ProofEnvelope, type ProofRequestRow, type ProofRequestView, ProofVerifier, ProofVerifyError, type ProofVerifyErrorCode, type ProverBidView, type ProverBidsResponse, ProverMarketError, type ProverMarketState, type ProverMarketStatusResponse, type PubkeyLookup, PubkeyRegistryError, QUARANTINED_RPC_CODE, type Quantity, type QuoteLiquidity, REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT, RESERVED_ADDRESS_HRPS, type RankedBridgeRoute, type ReceiptProofTrustArchivePolicy, type ReceiptProofTrustArchiveSigner, type ReceiptProofTrustFinalityPolicy, type ReceiptProofTrustFinalitySigner, type ReceiptProofTrustPolicy, type RedemptionQueueResponse, type RedemptionQueueTicket, type RegistryRecord, type ReportServiceProbeCalldataArgs, type ReportServiceProbeRequest, type ReportServiceProbeResponse, type RequestClusterJoinCalldataArgs, type ResolveNameResponse, type ResolvedExecutionFee, type RichListHolder, type RichListResponse, type RoundCertificateResponse, type RoundInfo, RpcClient, type RpcClientOptions, type RpcEndpoint, type RuntimeBuildProvenance, type RuntimeProvenanceResponse, type RuntimeUpgradeStatus, SERVES_GPU_PROVE, SERVICE_PROBE_STATUS, SET_POLICY_CLAIM_DOMAIN_TAG, SPENDING_POLICY_SELECTORS, SdkError, type SearchHit, type SearchResponse, type ServiceProbeResponse, type ServiceProbeStatusLabel, type SetOperatorDisplayCalldataArgs, type SigningEntryStatus, type SpendingPolicyArgs, SpendingPolicyError, type SpendingPolicyTimeWindow, type SpendingPolicyView, type SpotLimitOrderSide, type SpotMarketOrderMode, type StorageProofBatch, type StudioHostState, type StudioHostStatus, type SubmitPendingChangeCalldataArgs, type SubmitRequestClusterJoinArgs, type SubmitVoteClusterAdmitArgs, type SwapIntentStatus, type SyncStatus, TESTNET_69420, TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI, TOKEN_FACTORY_FLAGS, TOKEN_FACTORY_KNOWN_FLAG_MASK, TOKEN_FACTORY_MAX_CREATOR_FEE_BPS, TOKEN_FACTORY_MAX_DECIMALS, TOKEN_FACTORY_NAME_MAX_BYTES, TOKEN_FACTORY_SELECTORS, TOKEN_FACTORY_SIGS, TOKEN_FACTORY_SYMBOL_MAX_BYTES, TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG, TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT, TX_EXTENSION_KIND_MULTISIG, TX_EXTENSION_MULTISIG_V1, type TokenBalanceMrcIdentity, type TokenBalanceRecord, type TokenBalanceWithMetadata, type TokenFactoryAddressInput, type TokenFactoryBytes32Input, TokenFactoryError, type TokenFactoryUintInput, type TotalBurnedResponse, type TpmAttestationResponse, type TransactionFeeExposure, type TransactionReceipt, type TransactionView, type TxConfirmations, type TxFeedReceipt, type TxFeedResponse, type TxFeedTransaction, type TxStatusFoundResponse, type TxStatusNotFoundResponse, type TxStatusResponse, type TypedAddress, type TypedNativeReceiptEvent, type UpcomingDutiesResponse, type UpcomingDutyMap, type UpdateCharterCalldataArgs, type UserAddressInput, V1_BRIDGE_ALLOWED_FEE_TOKEN, V1_BRIDGE_ALLOWED_PROTOCOL, VRF_DOMAIN_TAG_MAX_BYTES, VRF_HEIGHT_NOT_FINALIZED_REVERT, VRF_OUTPUT_BYTES, type VertexAtRound, type VerticesAtRoundResponse, type VoteClusterAdmitCalldataArgs, VrfCallError, type VrfDomainTagInput, addressBytesToHex, addressToBech32, addressToTypedBech32, allowRootFor, apiEndpointFromRpcEndpoint, archiveMerkleInnerHash, archiveMerkleLeafHash, asBinaryProofEnvelope, assembleMultisigSigned, assembleMultisigWitness, assertMrvCallNativeSubmissionPlan, assertMrvDeployNativeSubmissionPlan, assertMrvFeeDisplayConformance, assertMrvStructuredFeeConformance, assertNativeDevMrcTokenPlan, assertNativeDevMrvDeployPlan, assertNativeDevWalletApprovalRequest, assertNativeMarketOrderBookStreamPayload, assessBridgeRoute, bech32ToAddress, bech32ToAddressBytes, bidSighash, bridgeAddressHex, bridgeDrainRemaining, bridgeQuoteSubmitReadiness, bridgeRoutesReadiness, bridgeTransferCandidates, buildBridgeRouteCatalogue, buildCancelSpotOrderPlan, buildMrvCallNativeTxPlan, buildMrvCallPlan, buildMrvCallRequest, buildMrvDeployNativeTxPlan, buildMrvDeployPayloadNativeTxPlan, buildMrvDeployPayloadPlan, buildMrvDeployPayloadRequest, buildMrvDeployPlan, buildMrvDeployRequest, buildNativeAgentCreateEscrowForwarderInput, buildNativeAgentCreateEscrowModuleCall, buildNativeAgentModuleCallEnvelope, buildNativeAgentRecordReputationForwarderInput, buildNativeAgentRecordReputationModuleCall, buildNativeAgentSetSpendingPolicyForwarderInput, buildNativeAgentSetSpendingPolicyModuleCall, buildNativeCallForwarderArtifact, buildNativeMarketModuleCallEnvelope, buildNativeNftBuyListingForwarderInput, buildNativeNftBuyListingModuleCall, buildNativeNftCancelListingForwarderInput, buildNativeNftCancelListingModuleCall, buildNativeNftCreateListingForwarderInput, buildNativeNftCreateListingModuleCall, buildNativeNftPlaceAuctionBidForwarderInput, buildNativeNftPlaceAuctionBidModuleCall, buildNativeNftSettleAuctionForwarderInput, buildNativeNftSettleAuctionModuleCall, buildNativeNftSweepExpiredListingsForwarderInput, buildNativeNftSweepExpiredListingsModuleCall, buildNativeSpotCancelOrderForwarderInput, buildNativeSpotCancelOrderModuleCall, buildNativeSpotCreateMarketForwarderInput, buildNativeSpotCreateMarketModuleCall, buildNativeSpotLimitOrderForwarderInput, buildNativeSpotLimitOrderModuleCall, buildNativeSpotSettleLimitOrderForwarderInput, buildNativeSpotSettleLimitOrderModuleCall, buildNativeSpotSettleRoutedLimitOrderForwarderInput, buildNativeSpotSettleRoutedLimitOrderModuleCall, buildPlaceLimitOrderViaPlan, buildPlaceSpotLimitOrderPlan, buildPlaceSpotMarketOrderExPlan, buildPlaceSpotMarketOrderPlan, buildRequestClusterJoinTxFields, buildVoteClusterAdmitTxFields, categoryRoot, checkMrvFeeDisplayConformance, checkMrvStructuredFeeConformance, checkNativeDevkitCompatibility, clampPriorityTip, clobAddressHex, clusterApyPercent, clusterJoinRequestExists, compareNativeDevVersions, composeClaimBoundMessage, computeNoEvmDacFinalityMessage, computeNoEvmLeaderFinalityMessage, computeNoEvmReceiptsRoot, computeNoEvmRoundFinalityMessage, computeNoEvmTargetReceiptHash, computeQuoteLiquidity, consumeNativeEvents, decodeActiveCharter, decodeClusterCharter, decodeClusterDiversity, decodeClusterFormedEvent, decodeClusterJoinRequest, decodeHasPubkeyReturn, decodeLookupPubkeyReturn, decodeNativeAgentStateResponse, decodeNativeMarketOrderBookDeltasResponse, decodeNativeReceiptResponse, decodeNoEvmReceiptTranscript, decodeOperatorFeeChargedEvent, decodeOperatorNetworkMetadata, decodeOracleEvent, decodePendingCharter, decodeProbeAuthority, decodeScoreServiceProbe, decodeTimeWindow, decodeTokenFactoryTokenId, decodeTxFeedResponse, decodeVrfOutput, delegationAddressHex, denyRootFor, deriveArchiveChallenge, deriveClobMarketId, deriveClusterAnchorAddress, deriveClusterJoinOperatorId, deriveFeedId, deriveMrvContractAddress, deriveMultisigAddress, deriveMultisigAddressBytes, deriveNativeSpotMarketId, deriveNativeSpotOrderId, deriveTokenFactoryTokenId, destinationRoot, encodeAnswerArchiveChallengeCalldata, encodeAttestDkgReshareCalldata, encodeAttestServiceProbeCalldata, encodeBlockSelector, encodeBridgeChallengeCalldata, encodeBridgeClaimCalldata, encodeCancelClusterJoinCalldata, encodeCancelOrderCalldata, encodeCancelPendingChangeCalldata, encodeClaimCalldata, encodeClaimPolicyByAddressCalldata, encodeClusterCharter, encodeCommitArchiveRootCalldata, encodeCreateFixedSupplyMrc20Calldata, encodeCreateRequestCalldata, encodeCreateRequestCanonical, encodeCreateTokenCalldata, encodeDelegateCalldata, encodeDisableCalldata, encodeEnableCalldata, encodeExpireClusterJoinCalldata, encodeFormClusterCalldata, encodeFormClusterV2Calldata, encodeGetClusterJoinRequestCalldata, encodeGetPendingCharterCalldata, encodeGetProbeAuthorityCalldata, encodeHasPubkeyCalldata, encodeLockBridgeConfigCalldata, encodeLookupPubkeyCalldata, encodeMrvDeployPayload, encodeMultisigWitnessBody, encodeNameAcceptTransferCall, encodeNameProposeTransferCall, encodeNameRegisterCall, encodeNativeAgentAcceptEscrowCall, encodeNativeAgentApproveEscrowCall, encodeNativeAgentArbiterGetCall, encodeNativeAgentAttestationGetCall, encodeNativeAgentAvailabilityGetCall, encodeNativeAgentCancelEscrowCall, encodeNativeAgentCloseAvailabilityCall, encodeNativeAgentConsentGetCall, encodeNativeAgentCounterEscrowCall, encodeNativeAgentCreateEscrowCall, encodeNativeAgentDeactivateServiceCall, encodeNativeAgentDisputeEscrowCall, encodeNativeAgentEscrowGetCall, encodeNativeAgentGrantConsentCall, encodeNativeAgentIssueAttestationCall, encodeNativeAgentIssuerGetCall, encodeNativeAgentListServiceCall, encodeNativeAgentModuleForwarderInput, encodeNativeAgentOpenAvailabilityCall, encodeNativeAgentRecordPolicySpendCall, encodeNativeAgentRecordReputationCall, encodeNativeAgentRegisterArbiterCall, encodeNativeAgentRegisterIssuerCall, encodeNativeAgentReputationGetCall, encodeNativeAgentResolveEscrowCall, encodeNativeAgentRevokeAttestationCall, encodeNativeAgentRevokeConsentCall, encodeNativeAgentServiceGetCall, encodeNativeAgentSetAvailabilityCall, encodeNativeAgentSetSpendingPolicyCall, encodeNativeAgentSpendingPolicyGetCall, encodeNativeAgentStartEscrowCall, encodeNativeAgentSubmitEscrowCall, encodeNativeMarketModuleForwarderInput, encodeNativeNftBuyListingCall, encodeNativeNftCancelListingCall, encodeNativeNftCreateListingCall, encodeNativeNftPlaceAuctionBidCall, encodeNativeNftSettleAuctionCall, encodeNativeNftSweepExpiredListingsCall, encodeNativeSpotCancelOrderCall, encodeNativeSpotCreateMarketCall, encodeNativeSpotLimitOrderCall, encodeNativeSpotSettleLimitOrderCall, encodeNativeSpotSettleRoutedLimitOrderCall, encodePlaceLimitOrderCalldata, encodePlaceLimitOrderViaCalldata, encodePlaceMarketOrderCalldata, encodePlaceMarketOrderExCalldata, encodeRecoverOperatorNodeCalldata, encodeRedelegateCalldata, encodeRegisterPubkeyCalldata, encodeReportServiceProbeCalldata, encodeRequestClusterJoinCalldata, encodeSetAutoCompoundCalldata, encodeSetBridgeResumeCooldownCalldata, encodeSetBridgeRouteFinalityCalldata, encodeSetLotSizeCalldata, encodeSetMinNotionalCalldata, encodeSetOperatorDisplayCalldata, encodeSetPolicyCalldata, encodeSetPolicyClaimCalldata, encodeSetProbeAuthorityCalldata, encodeSetTickSizeCalldata, encodeSubmitBridgeProofCalldata, encodeSubmitPendingChangeCalldata, encodeTokenFactoryAllowanceCalldata, encodeTokenFactoryApproveCalldata, encodeTokenFactoryBalanceOfCalldata, encodeTokenFactoryBurnCalldata, encodeTokenFactoryDecreaseAllowanceCalldata, encodeTokenFactoryDestroyCalldata, encodeTokenFactoryIncreaseAllowanceCalldata, encodeTokenFactoryMetadataCalldata, encodeTokenFactoryMintCalldata, encodeTokenFactorySetPausedCalldata, encodeTokenFactoryTotalSupplyCalldata, encodeTokenFactoryTransferCalldata, encodeTokenFactoryTransferFromCalldata, encodeTokenFactoryTransferOwnershipCalldata, encodeUndelegateCalldata, encodeUpdateCharterCalldata, encodeVoteClusterAdmitCalldata, encodeVrfEvaluateCalldata, exportBridgeRouteCatalogueJson, fetchChainInfoLatest, fetchChainRegistryLatest, formClusterMessage, formClusterMessageHex, formClusterMessageV2, formClusterMessageV2Hex, formatLyth, formatLythoshi, formatNativeReceiptFeeDisplay, formatOraclePrice, getChainInfo, getNoEvmReceiptTrustPolicy, getP2pSeeds, getRpcEndpoints, hashToHex, hexToAddressBytes, isBridgeAdminLockedRevert, isBridgeCooldownZeroRevert, isBridgeFinalityZeroRevert, isBridgeResumeCooldownActiveRevert, isConcreteServiceProbeStatus, isNativeDecodedEvent, isNativeMarketOrderBookStreamPayload, isQuarantineError, isSinglePublicServiceProbeMask, isUnexpectedValueRevert, isValidNodeRegistryCapabilities, isValidPublicServiceProbeMask, mrvAddressToBech32, mrvBech32ToAddress, mrvCodeHashHex, mrvV1TransactionExtension, multisigBaseSighash, multisigMemberIndex, nameLengthModifierX10, nameRegistrationCost, nameRegistryAddressHex, nativeAgentStateFilterParams, nativeDevSchemaFieldNames, nativeDevUiStrings, nativeEventMatches, nativeEventsFilterParams, nativeEventsFromHistory, nativeEventsFromReceipt, nativeMarketEventFilter, nativeMarketEventsFromHistory, nativeMarketEventsFromReceipt, nativeMarketStateFilterParams, noEvmReceiptTrustPolicyFromChainInfo, nodeHostingClassFromByte, nodeHostingClassToByte, nodeRegistryAddressHex, normalizeAddressHex, normalizeBridgeRouteCatalogue, normalizePendingChangeKind, oracleAddressHex, oraclePriceToNumber, packTimeWindow, parseAddress, parseBridgeRouteCatalogueJson, parseChainRegistryToml, parseDkgResharePublicKeys, parseLythToLythoshi, parseNameCategory, parseNativeDecodedEvent, parseQuantity, parseQuantityBig, preflightClusterJoinRequest, previewRequestClusterJoin, previewVoteClusterAdmit, proofVerifier, protocolNonceForEpoch, proverMarketStateFromByte, pubkeyRegistryAddressHex, quoteOperatorFee, rankBridgeRoutes, rankMarketsByVolume, readClusterJoinRequest, requestSighash, requireTypedAddress, resolveClusterJoinExecutionFee, resolveExecutionFee, resolveMaxExecutionUnitPrice, resolveRegistryExecutionFee, resolveStudioHostStatus, selectBridgeTransferRoute, selectTrustedOperator, selectTrustedOperatorForNetwork, serviceMaskToBitIndex, serviceProbeStatusLabel, setDestinationRoot, slotArchiveChallengePass, slotClusterCharter, slotClusterCharterDelegator, slotClusterCharterMembers, slotClusterServiceScore, slotEpochChallengeSeed, slotProbeAuthority, slotScoreServiceProbe, sortMultisigMembers, spendingPolicyAddressHex, submitMrvCallNativeTx, submitMrvDeployNativeTx, submitMrvDeployPayloadNativeTx, submitRequestClusterJoin, submitSighash, submitVoteClusterAdmit, tokenFactoryAddressHex, transactionFeeExposure, typedBech32ToAddress, updateCharterMessage, updateCharterMessageHex, validateAddress, validateBridgeRouteCatalogue, validateMrvArtifactMetadata, validateMrvCallRequest, validateMrvDeployRequest, validateMultisigRoster, validateTokenFactoryFlags, verifyNoEvmArchiveProofSignatures, verifyNoEvmBlockFinalityEvidenceMultisig, verifyNoEvmBlockFinalityEvidenceThreshold, verifyNoEvmFinalityEvidenceMultisig, verifyNoEvmFinalityEvidenceThreshold, verifyNoEvmReceiptProof, verifyNoEvmReceiptProofTrust, verifyOperatorGenesis, version, vrfAddressHex };
