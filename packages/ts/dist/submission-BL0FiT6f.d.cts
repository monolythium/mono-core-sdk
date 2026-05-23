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
 * EVM block tag. Use [`BlockSelector`] when sending to the wire — this
 * is the strongly-typed half of an `eth_*` block argument.
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
 * Argument shape for `eth_call` / `eth_estimateGas`.
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
     * Fee per execution unit on legacy / non-EIP-1559 paths.
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
     * Total fee formatted as LYTH numeric text without the unit suffix.
     */
    total_lyth: string;
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
 * `lyth_listActivePrecompiles` entry — OI-0170 / ADR-0015 §5.
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
     * MRC standard, currently `mrc20`, `mrc721`, or `mrc1155`.
     */
    standard: string;
    /**
     * MRC asset id, or collection id for token-specific standards.
     */
    assetId: string;
    /**
     * Token id inside the collection for MRC-721/MRC-1155 rows.
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

/**
 * Chain-registry snapshot and helpers.
 *
 * Source of truth:
 * https://github.com/monolythium-vision/chain-registry
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
}
type ChainRegistry = Record<NetworkSlug | string, ChainInfo>;
declare const TESTNET_69420: ChainInfo;
declare const CHAIN_REGISTRY: ChainRegistry;
declare const CHAIN_REGISTRY_RAW_BASE: "https://raw.githubusercontent.com/monolythium-vision/chain-registry/master/chains";
declare function getChainInfo(network: NetworkSlug | string): ChainInfo;
declare function getRpcEndpoints(network: NetworkSlug | string): readonly RpcEndpoint[];
declare function getP2pSeeds(network: NetworkSlug | string): readonly P2pSeed[];
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
 * sends the same `lyth_*` / `eth_*` / `debug_*` JSON-RPC method strings
 * (Law §13.2).
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
/** User address accepted by helpers that canonicalize to `mono1...`. */
type UserAddressInput = string | Uint8Array | readonly number[];
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
declare const MAX_NATIVE_RECEIPT_EVENTS = 1000;
interface NativeReceiptCounters {
    cycles: number;
    syscallUnits: number;
    stateIoUnits: number;
}
interface NativeReceiptFee {
    total_lythoshi: string;
    total_lyth: string;
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
interface NativeReceiptResponse<TDecoded = unknown> {
    txHash: string;
    blockHash: string;
    blockHeight: number;
    txIndex: number;
    schema: string;
    artifactHash: string;
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
     * `monolythium-vision/chain-registry`. Set `probe: true` to walk the
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
    /** `eth_blockNumber` — latest committed height. */
    ethBlockNumber(): Promise<bigint>;
    /** `eth_getBalance` — balance + Merkle proof envelope. */
    ethGetBalance(address: string, block?: BlockSelector): Promise<AccountProofResponse>;
    /** `eth_getStorageAt` — storage word + Merkle proof. */
    ethGetStorageAt(address: string, slot: string, block?: BlockSelector): Promise<AccountProofResponse>;
    /** `eth_getTransactionCount` — sender nonce. */
    ethGetTransactionCount(address: string, block?: BlockSelector): Promise<bigint>;
    /** `eth_getCode` — deployed bytecode (`0x` for an EOA, `0xfe` for a precompile). */
    ethGetCode(address: string, block?: BlockSelector): Promise<string>;
    /** `eth_getBlockByNumber` — fetch a block header by height/tag. */
    ethGetBlockByNumber(block?: BlockSelector): Promise<BlockHeader | null>;
    /** `eth_getBlockByHash` — fetch a block header by hash. */
    ethGetBlockByHash(hash: string): Promise<BlockHeader | null>;
    /** `eth_getTransactionByHash` — fetch an included transaction by hash. */
    ethGetTransactionByHash(txHash: string): Promise<TransactionView | null>;
    /** `eth_getTransactionReceipt` — receipt for a confirmed tx. */
    ethGetTransactionReceipt(txHash: string): Promise<TransactionReceipt | null>;
    /** `eth_sendRawTransaction` — submit a signed raw tx. */
    ethSendRawTransaction(rawTx: string): Promise<string>;
    /** `eth_call` — dry-run a transaction. */
    ethCall(request: CallRequest, block?: BlockSelector): Promise<string>;
    /** `eth_estimateGas` — gas estimate for a dry-run. */
    ethEstimateGas(request: CallRequest, block?: BlockSelector): Promise<bigint>;
    /** `eth_gasPrice` — minimum gas price the node will accept. */
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
    /** `lyth_mrcMetadata` — exact current-state native MRC metadata lookup. */
    lythMrcMetadata(assetId: string, tokenId?: string | null): Promise<MrcMetadataResponse>;
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
    /** `lyth_nativeEvents` — historical indexed native event rows. */
    lythNativeEvents<TDecoded = unknown>(filter: NativeEventsFilter): Promise<NativeEventsResponse<TDecoded>>;
    /** `lyth_nativeEvents` with decoded rows converted into a caller-selected type. */
    lythNativeEventsTyped<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(filter: NativeEventsFilter): Promise<NativeEventsResponse<TDecoded>>;
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
    /** `lyth_peerSummary` — public-safe aggregate peer-network diagnostics. */
    lythPeerSummary(): Promise<PeerSummaryAggregate>;
    /**
     * `lyth_listActivePrecompiles` — milestone-gated precompile catalogue
     * (OI-0170 / ADR-0015 §5).
     */
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
    lythSubscribe(channel: string): Promise<unknown>;
    /** `lyth_unsubscribe` — counterpart to `lythSubscribe`. */
    lythUnsubscribe(subId: string): Promise<unknown>;
    /** `debug_traceTransaction` — revm trace for a confirmed tx. */
    debugTraceTransaction(txHash: string): Promise<unknown>;
    /** `debug_traceCall` — revm trace for a dry-run. */
    debugTraceCall(request: CallRequest, block?: BlockSelector): Promise<unknown>;
    /** `debug_traceBlockByNumber` — revm traces for an entire block. */
    debugTraceBlockByNumber(block: BlockSelector): Promise<unknown>;
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

/** Common typed payload envelope emitted by the native event projector. */
interface NativeDecodedEvent {
    block_height: number;
    tx_index: number;
    sequence: number;
    family: string;
    event_name: string;
    payload_hash: string;
    [field: string]: unknown;
}
/** Optional filters applied to native receipt event rows. */
interface NativeEventFilter {
    address?: string;
    eventTopic?: string;
    family?: string;
    eventName?: string;
}
type TypedNativeReceiptEvent<TDecoded extends NativeDecodedEvent = NativeDecodedEvent> = NativeReceiptEvent<TDecoded>;
type NativeEventConsumer<TDecoded extends NativeDecodedEvent = NativeDecodedEvent> = (event: TypedNativeReceiptEvent<TDecoded>) => void | Promise<void>;
declare function isNativeDecodedEvent(value: unknown): value is NativeDecodedEvent;
declare function parseNativeDecodedEvent<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(event: Pick<NativeReceiptEvent<unknown>, "decoded" | "decodedJson" | "eventTopic" | "logIndex">): TDecoded;
declare function nativeEventMatches(event: NativeReceiptEvent<unknown>, filter?: NativeEventFilter): boolean;
declare function nativeEventsFromReceipt<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(receipt: NativeReceiptResponse<unknown>, filter?: NativeEventFilter): Array<TypedNativeReceiptEvent<TDecoded>>;
declare function nativeEventsFromHistory<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(response: NativeEventsResponse<unknown>): NativeEventsResponse<TDecoded>;
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

export { type ChainInfo as $, type AddressProfileResponse as A, type BlockSelector as B, type ChainStatsResponse as C, type AddressActivityKind as D, type EncryptionKey as E, type AddressActivityKindResponse as F, type AddressActivityKindRetention as G, type AddressLabelRecord as H, type AgentReputationCategoryScope as I, type AgentReputationRecord as J, type AgentReputationResponse as K, type AssetPolicy as L, type MrcMetadataResponse as M, type NativeReceiptFee as N, type OperatorCapabilitiesResponse as O, type PendingRewardsResponse as P, type AttestationWindow as Q, type RuntimeBuildProvenance as R, type SearchResponse as S, type TxFeedResponse as T, type BlockHeader as U, type BlockTag as V, type BlsCertificateResponse as W, CHAIN_REGISTRY as X, CHAIN_REGISTRY_RAW_BASE as Y, type CapabilitiesResponse as Z, type CapabilityDescriptor as _, type RuntimeUpgradeStatus as a, type OperatorSurfaceStatus as a$, type ChainRegistry as a0, type CheckpointRecord as a1, type ClobMarketRecord as a2, type ClobMarketSummary as a3, type ClobTrade as a4, type ClusterDelegatorsResponse as a5, type ClusterDirectoryEntryResponse as a6, type ClusterDirectoryPageResponse as a7, type ClusterEntityResponse as a8, type ClusterMemberResponse as a9, type LythUpgradePlanStatus as aA, type LythUpgradeStatusResponse as aB, MAX_NATIVE_RECEIPT_EVENTS as aC, type MempoolSnapshot as aD, type MeshDecodedTx as aE, type MeshSignedTxResponse as aF, type MeshTxIntent as aG, type MeshUnsignedTxResponse as aH, type MetricsRangeResponse as aI, type MetricsRangeSample as aJ, type MetricsRangeSeries as aK, type MetricsRangeStatus as aL, type MrcMetadataRecord as aM, type NativeEventConsumer as aN, type NativeEventsResponseFilters as aO, type NativeEventsSource as aP, type NativeReceiptCounters as aQ, type NativeReceiptEvent as aR, type NativeReceiptSource as aS, type NetworkClientOptions as aT, type NetworkSlug as aU, type OperatorAuthorityResponse as aV, type OperatorInfoResponse as aW, type OperatorRiskResponse as aX, type OperatorSigningActivityResponse as aY, type OperatorSigningEntry as aZ, type OperatorSurfaceCapability as a_, type ClusterResignationRow as aa, type ClusterResignationsResponse as ab, type ClusterStatusResponse as ac, type DagParent as ad, type DagParentsResponse as ae, type DagSyncStatus as af, type DecodeTxLog as ag, type DecodeTxPqAttestation as ah, type DecodeTxResponse as ai, type DelegationCapResponse as aj, type DelegationHistoryRecord as ak, type DelegationRow as al, type DelegationsResponse as am, type DutyAbsence as an, type EncryptionKeyResponse as ao, type EntityRatchetResponse as ap, type ExplorerEndpoint as aq, type FeeHistoryResponse as ar, type GapRange as as, type GapRecord as at, type GapRecordsResponse as au, type Hash as av, type Hex as aw, type IndexerStatus as ax, type JailStatusWindow as ay, type KeyRotationWindow as az, type NativeReceiptResponse as b, ML_KEM_768_ENCAPSULATION_KEY_LEN as b$, type P2pSeed as b0, type PeerSummary as b1, type PeerSummaryAggregate as b2, type PendingRewardsRow as b3, type PendingTxSummary as b4, type PrecompileCatalogueResponse as b5, type PrecompileDescriptor as b6, type Quantity as b7, type RegistryRecord as b8, type ReportServiceProbeRequest as b9, consumeNativeEvents as bA, encodeBlockSelector as bB, fetchChainInfoLatest as bC, fetchChainRegistryLatest as bD, getChainInfo as bE, getP2pSeeds as bF, getRpcEndpoints as bG, isNativeDecodedEvent as bH, nativeEventMatches as bI, nativeEventsFilterParams as bJ, nativeEventsFromHistory as bK, nativeEventsFromReceipt as bL, parseChainRegistryToml as bM, parseNativeDecodedEvent as bN, parseQuantity as bO, parseQuantityBig as bP, DKG_AEAD_TAG_LEN as bQ, DKG_NONCE_LEN as bR, type DecryptHint as bS, ENUM_VARIANT_INDEX_ML_DSA_65 as bT, type EncryptedEnvelope as bU, type EncryptedSubmission as bV, ML_DSA_65_PUBLIC_KEY_LEN as bW, ML_DSA_65_SEED_LEN as bX, ML_DSA_65_SIGNATURE_LEN as bY, ML_DSA_65_SIGNING_KEY_LEN as bZ, ML_KEM_768_CIPHERTEXT_LEN as b_, type ReportServiceProbeResponse as ba, type RichListHolder as bb, type RichListResponse as bc, type RoundInfo as bd, type RpcEndpoint as be, type RuntimeProvenanceResponse as bf, type SearchHit as bg, type ServiceProbeStatusLabel as bh, type SigningEntryStatus as bi, type StorageProofBatch as bj, type SyncStatus as bk, TESTNET_69420 as bl, type TokenBalanceMrcIdentity as bm, type TokenBalanceRecord as bn, type TpmAttestationResponse as bo, type TransactionView as bp, type TxFeedReceipt as bq, type TxFeedTransaction as br, type TxStatusFoundResponse as bs, type TxStatusNotFoundResponse as bt, type TxStatusResponse as bu, type UpcomingDutiesResponse as bv, type UpcomingDutyMap as bw, type UserAddressInput as bx, type VertexAtRound as by, type VerticesAtRoundResponse as bz, type NativeDecodedEvent as c, ML_KEM_768_SHARED_SECRET_LEN as c0, type NativeTxExtension as c1, type NativeTxExtensionDescriptor as c2, type NativeTxExtensionLike as c3, type NonceAad as c4, STANDARD_ALGO_NUMBER_ML_DSA_65 as c5, bincodeDecryptHint as c6, bincodeEncryptedEnvelope as c7, bincodeNonceAad as c8, bincodeSignedTransaction as c9, buildEncryptedEnvelope as ca, buildEncryptedSubmission as cb, encodeMlDsa65Opaque as cc, encodeTransactionForHash as cd, encryptInnerTx as ce, fetchEncryptionKey as cf, mlDsa65AddressFromPublicKey as cg, outerSigDigest as ch, submitEncryptedEnvelope as ci, type NativeEventFilter as d, type TypedNativeReceiptEvent as e, type NativeEventsFilter as f, type NativeEventsResponse as g, type AddressFlowResponse as h, type ServiceProbeResponse as i, type ClobMarketsResponse as j, type ClobMarketResponse as k, type ClobTradesResponse as l, type ClobOhlcResponse as m, type ClobOrderBookResponse as n, type NativeEvmTxFields as o, MempoolClass as p, RpcClient as q, MlDsa65Backend as r, type RpcClientOptions as s, type TransactionReceipt as t, type CallRequest as u, type AccountPolicy as v, type AccountProofResponse as w, type Address as x, type AddressActivityArchiveRedirect as y, type AddressActivityEntry as z };
