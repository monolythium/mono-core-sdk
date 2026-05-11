/**
 * Typed JSON-RPC client for a `mono-core` node.
 *
 * Mirrors the Rust SDK's `RpcClient` — every public method maps 1:1 to
 * a method on the Rust client, returns the same wire-shape value, and
 * sends the same `lyth_*` / `eth_*` / `debug_*` JSON-RPC method strings
 * (Law §13.2).
 */

import { SdkError } from "./error.js";
import { getChainInfo, type ChainInfo, type ChainRegistry, type NetworkSlug } from "./registry.js";
import type {
  AccountPolicy,
  AccountProofResponse,
  AddressActivityEntry,
  AddressLabelRecord,
  AssetPolicy,
  BlsCertificateResponse,
  BlockHeader,
  CallRequest,
  CapabilitiesResponse,
  CheckpointRecord,
  ClusterDelegatorsResponse,
  ClusterEntityResponse,
  ClusterResignationsResponse,
  DagSyncStatus,
  DelegationCapResponse,
  DelegationHistoryRecord,
  DelegationsResponse,
  EncryptionKeyResponse,
  EntityRatchetResponse,
  FeeHistoryResponse,
  IndexerStatus,
  MempoolSnapshot,
  MeshDecodedTx,
  MeshSignedTxResponse,
  MeshTxIntent,
  MeshUnsignedTxResponse,
  PeerSummary,
  PendingTxSummary,
  PrecompileDescriptor,
  RegistryRecord,
  RoundInfo,
  StorageProofBatch,
  SyncStatus,
  TpmAttestationResponse,
  TransactionReceipt,
  TransactionView,
  TokenBalanceRecord,
  ValidatorDescriptor,
} from "./bindings/index.js";
import type { BlockSelector } from "./types.js";
import { encodeBlockSelector } from "./types.js";

/** Optional per-client configuration. */
export interface RpcClientOptions {
  /** Override `fetch`. Useful for tests or non-Node environments. */
  fetch?: typeof fetch;
  /** Extra headers to attach to every request. */
  headers?: Record<string, string>;
}

export interface NetworkClientOptions extends RpcClientOptions {
  /** Registry snapshot to use instead of the SDK-bundled snapshot. */
  registry?: ChainRegistry;
  /** Probe all known endpoints and choose the first one that answers. */
  probe?: boolean;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown;
}

interface JsonRpcResponse {
  jsonrpc?: "2.0";
  id?: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const SDK_VERSION = "0.1.0";

function resolveChainInfo(network: NetworkSlug | string, registry?: ChainRegistry): ChainInfo {
  if (registry) {
    const info = registry[network];
    if (!info) {
      throw SdkError.endpoint(`unknown Monolythium network: ${network}`);
    }
    return info;
  }
  try {
    return getChainInfo(network);
  } catch (err) {
    throw SdkError.endpoint((err as Error)?.message ?? String(err));
  }
}

export class RpcClient {
  readonly endpoint: string;
  readonly #fetch: typeof fetch;
  readonly #headers: Record<string, string>;
  #nextId: number;

  constructor(endpoint: string, options: RpcClientOptions = {}) {
    if (!endpoint || endpoint.length === 0) {
      throw SdkError.endpoint("endpoint cannot be empty");
    }
    this.endpoint = endpoint;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#headers = {
      "content-type": "application/json",
      "user-agent": `monolythium-core-sdk/${SDK_VERSION}`,
      ...(options.headers ?? {}),
    };
    this.#nextId = 1;
  }

  /**
   * Construct a client from the chain-registry network slug.
   *
   * Defaults to the SDK-bundled registry snapshot from
   * `monolythium-vision/chain-registry`. Set `probe: true` to walk the
   * registry endpoints in order and return the first endpoint whose
   * `eth_chainId` matches the registry chain id.
   */
  static async forNetwork(
    network: NetworkSlug | string = "testnet-69420",
    options: NetworkClientOptions = {},
  ): Promise<RpcClient> {
    const info = resolveChainInfo(network, options.registry);
    if (info.rpc.length === 0) {
      throw SdkError.endpoint(`network ${network} has no RPC endpoints`);
    }
    if (options.probe) {
      return this.fromFirstReachable(info, options);
    }
    return new RpcClient(info.rpc[0].url, options);
  }

  /**
   * Walk a chain-registry entry in order and return the first endpoint
   * whose `eth_chainId` matches the registry `chain_id`.
   */
  static async fromFirstReachable(
    chain: ChainInfo,
    options: RpcClientOptions = {},
  ): Promise<RpcClient> {
    const errors: string[] = [];
    for (const endpoint of chain.rpc) {
      const client = new RpcClient(endpoint.url, options);
      try {
        const chainId = await client.ethChainId();
        if (chainId === BigInt(chain.chain_id)) {
          return client;
        }
        errors.push(`${endpoint.url}: chain id ${chainId} != ${chain.chain_id}`);
      } catch (err) {
        errors.push(`${endpoint.url}: ${(err as Error)?.message ?? err}`);
      }
    }
    throw SdkError.endpoint(
      `no reachable RPC endpoint for ${chain.network}; tried ${errors.join("; ")}`,
    );
  }

  /**
   * Send an arbitrary JSON-RPC method. Most callers should prefer the
   * typed wrappers below; this is the escape hatch for methods the
   * SDK does not yet wrap.
   */
  async call<T>(method: string, params: unknown = []): Promise<T> {
    const id = this.#nextId++;
    const body: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    let resp: Response;
    try {
      resp = await this.#fetch(this.endpoint, {
        method: "POST",
        headers: this.#headers,
        body: JSON.stringify(body),
      });
    } catch (cause) {
      throw SdkError.transport(
        `transport failure calling ${method}: ${(cause as Error)?.message ?? cause}`,
        cause,
      );
    }
    let parsed: JsonRpcResponse;
    try {
      parsed = (await resp.json()) as JsonRpcResponse;
    } catch (cause) {
      throw SdkError.malformed(
        `non-JSON response (HTTP ${resp.status}): ${(cause as Error)?.message ?? cause}`,
      );
    }
    if (parsed.error) {
      throw SdkError.rpc(parsed.error.code, parsed.error.message, parsed.error.data);
    }
    if (!("result" in parsed) || parsed.result === undefined) {
      if (!resp.ok) {
        throw SdkError.malformed(`HTTP ${resp.status} with no JSON-RPC result`);
      }
      throw SdkError.malformed("response is missing both `result` and `error`");
    }
    return parsed.result as T;
  }

  // ---- eth_* / net_* / web3_* ---------------------------------------

  /** `eth_chainId` — configured chain id. */
  async ethChainId(): Promise<bigint> {
    return parseQuantityBig(await this.call<string>("eth_chainId", []));
  }

  /** `eth_blockNumber` — latest committed height. */
  async ethBlockNumber(): Promise<bigint> {
    return parseQuantityBig(await this.call<string>("eth_blockNumber", []));
  }

  /** `eth_getBalance` — balance + Merkle proof envelope. */
  async ethGetBalance(
    address: string,
    block: BlockSelector = "latest",
  ): Promise<AccountProofResponse> {
    return this.call("eth_getBalance", [address, encodeBlockSelector(block)]);
  }

  /** `eth_getStorageAt` — storage word + Merkle proof. */
  async ethGetStorageAt(
    address: string,
    slot: string,
    block: BlockSelector = "latest",
  ): Promise<AccountProofResponse> {
    return this.call("eth_getStorageAt", [
      address,
      slot,
      encodeBlockSelector(block),
    ]);
  }

  /** `eth_getTransactionCount` — sender nonce. */
  async ethGetTransactionCount(
    address: string,
    block: BlockSelector = "latest",
  ): Promise<bigint> {
    return parseQuantityBig(
      await this.call<string>("eth_getTransactionCount", [
        address,
        encodeBlockSelector(block),
      ]),
    );
  }

  /** `eth_getCode` — deployed bytecode (`0x` for an EOA, `0xfe` for a precompile). */
  async ethGetCode(address: string, block: BlockSelector = "latest"): Promise<string> {
    return this.call("eth_getCode", [address, encodeBlockSelector(block)]);
  }

  /** `eth_getBlockByNumber` — fetch a block header by height/tag. */
  async ethGetBlockByNumber(
    block: BlockSelector = "latest",
  ): Promise<BlockHeader | null> {
    return normalizeBlockHeader(await this.call("eth_getBlockByNumber", [encodeBlockSelector(block)]));
  }

  /** `eth_getBlockByHash` — fetch a block header by hash. */
  async ethGetBlockByHash(hash: string): Promise<BlockHeader | null> {
    return normalizeBlockHeader(await this.call("eth_getBlockByHash", [hash]));
  }

  /** `eth_getTransactionByHash` — fetch an included transaction by hash. */
  async ethGetTransactionByHash(txHash: string): Promise<TransactionView | null> {
    return this.call("eth_getTransactionByHash", [txHash]);
  }

  /** `eth_getTransactionReceipt` — receipt for a confirmed tx. */
  async ethGetTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    return this.call("eth_getTransactionReceipt", [txHash]);
  }

  /** `eth_sendRawTransaction` — submit a signed raw tx. */
  async ethSendRawTransaction(rawTx: string): Promise<string> {
    return this.call("eth_sendRawTransaction", [rawTx]);
  }

  /** `eth_call` — dry-run a transaction. */
  async ethCall(request: CallRequest, block: BlockSelector = "latest"): Promise<string> {
    return this.call("eth_call", [request, encodeBlockSelector(block)]);
  }

  /** `eth_estimateGas` — gas estimate for a dry-run. */
  async ethEstimateGas(
    request: CallRequest,
    block: BlockSelector = "latest",
  ): Promise<bigint> {
    return parseQuantityBig(
      await this.call<string>("eth_estimateGas", [request, encodeBlockSelector(block)]),
    );
  }

  /** `eth_gasPrice` — minimum gas price the node will accept. */
  async ethGasPrice(): Promise<bigint> {
    return parseQuantityBig(await this.call<string>("eth_gasPrice", []));
  }

  /** `eth_feeHistory` — base-fee + gas-used history. */
  async ethFeeHistory(
    blockCount: number,
    newestBlock: BlockSelector = "latest",
    rewardPercentiles: number[] = [],
  ): Promise<FeeHistoryResponse> {
    return this.call("eth_feeHistory", [
      `0x${blockCount.toString(16)}`,
      encodeBlockSelector(newestBlock),
      rewardPercentiles,
    ]);
  }

  /** `eth_syncing` — `null` when caught up. */
  async ethSyncing(): Promise<SyncStatus | null> {
    const v = await this.call<unknown>("eth_syncing", []);
    if (v === false || v === null || v === undefined) return null;
    return v as SyncStatus;
  }

  /** `net_version` — chain id as a decimal string. */
  async netVersion(): Promise<string> {
    return this.call("net_version", []);
  }

  /** `net_peerCount` — number of connected peers. */
  async netPeerCount(): Promise<bigint> {
    return parseQuantityBig(await this.call<string>("net_peerCount", []));
  }

  /** `net_listening` — whether the node accepts inbound peers. */
  async netListening(): Promise<boolean> {
    return this.call("net_listening", []);
  }

  /** `web3_clientVersion` — server's client-version string. */
  async web3ClientVersion(): Promise<string> {
    return this.call("web3_clientVersion", []);
  }

  /** `web3_sha3` — Keccak-256 of `data`. */
  async web3Sha3(data: string): Promise<string> {
    return this.call("web3_sha3", [data]);
  }

  // ---- lyth_* (Law §13.2 native namespace) --------------------------

  /** `lyth_listProviders` — paged registry enumeration. */
  async lythListProviders(
    capabilityMask: number,
    cursor: string | null = null,
    limit = 100,
  ): Promise<RegistryRecord[]> {
    return this.call("lyth_listProviders", [capabilityMask, cursor, limit]);
  }

  /** `lyth_getRegistration` — single registry lookup. */
  async lythGetRegistration(peerId: string): Promise<RegistryRecord | null> {
    return this.call("lyth_getRegistration", [peerId]);
  }

  /** `lyth_registryStateProof` — Merkle proof for a registry entry. */
  async lythRegistryStateProof(peerId: string): Promise<AccountProofResponse> {
    return this.call("lyth_registryStateProof", [peerId]);
  }

  /** `lyth_getAccountPolicy` — privacy posture for an account. */
  async lythGetAccountPolicy(address: string): Promise<AccountPolicy> {
    return this.call("lyth_getAccountPolicy", [address]);
  }

  /** `lyth_getAssetPolicy` — privacy posture for an asset. */
  async lythGetAssetPolicy(tokenId: string): Promise<AssetPolicy> {
    return this.call("lyth_getAssetPolicy", [tokenId]);
  }

  /** `lyth_getTokenBalances` — indexed per-asset balances for one address. */
  async lythGetTokenBalances(address: string): Promise<TokenBalanceRecord[]> {
    return this.call("lyth_getTokenBalances", [address]);
  }

  /** `lyth_getAddressLabel` — indexed display/category label for one address. */
  async lythGetAddressLabel(address: string): Promise<AddressLabelRecord | null> {
    const v = await this.call<unknown>("lyth_getAddressLabel", [address]);
    if (v === null || v === undefined) return null;
    return v as AddressLabelRecord;
  }

  /** `lyth_getAddressActivity` — indexed per-address activity timeline. */
  async lythGetAddressActivity(
    address: string,
    limit = 50,
    cursor?: string | null,
  ): Promise<AddressActivityEntry[]> {
    const params = cursor === undefined ? [address, limit] : [address, limit, cursor];
    return this.call("lyth_getAddressActivity", params);
  }

  /** `lyth_mempoolStatus` — aggregate mempool snapshot. */
  async lythMempoolStatus(): Promise<MempoolSnapshot> {
    return normalizeMempoolSnapshot(await this.call("lyth_mempoolStatus", []));
  }

  /** `lyth_mempoolPending` — pending txs for a sender. */
  async lythMempoolPending(sender: string): Promise<PendingTxSummary[]> {
    return this.call("lyth_mempoolPending", [sender]);
  }

  /** `lyth_currentRound` — latest committed height. */
  async lythCurrentRound(): Promise<RoundInfo> {
    return normalizeRoundInfo(await this.call("lyth_currentRound", []));
  }

  /** `lyth_validatorSet` — configured validator set. */
  async lythValidatorSet(): Promise<ValidatorDescriptor[]> {
    return this.call("lyth_validatorSet", []);
  }

  /** `lyth_listActiveValidators` — validators currently eligible to propose / vote. */
  async lythListActiveValidators(): Promise<ValidatorDescriptor[]> {
    return this.call("lyth_listActiveValidators", []);
  }

  /** `lyth_listHealthyValidators` — healthy validator subset. */
  async lythListHealthyValidators(): Promise<ValidatorDescriptor[]> {
    return this.call("lyth_listHealthyValidators", []);
  }

  /**
   * `lyth_listActivePrecompiles` — milestone-gated precompile catalogue
   * (OI-0170 / ADR-0015 §5).
   */
  async lythListActivePrecompiles(
    block: BlockSelector = "latest",
  ): Promise<PrecompileDescriptor[]> {
    return this.call("lyth_listActivePrecompiles", [encodeBlockSelector(block)]);
  }

  /** `lyth_capabilities` — address-keyed precompile capability map. */
  async lythCapabilities(block?: BlockSelector): Promise<CapabilitiesResponse> {
    const params = block === undefined ? [] : [encodeBlockSelector(block)];
    return this.call("lyth_capabilities", params);
  }

  /** `lyth_indexerStatus` — indexer status; `null` when disabled. */
  async lythIndexerStatus(): Promise<IndexerStatus | null> {
    const v = await this.call<unknown>("lyth_indexerStatus", []);
    if (v === null || v === undefined) return null;
    return v as IndexerStatus;
  }

  /** `lyth_getStorageProof` — batched Merkle proofs. */
  async lythGetStorageProof(
    address: string,
    slots: string[],
  ): Promise<StorageProofBatch> {
    return this.call("lyth_getStorageProof", [address, slots]);
  }

  /** `lyth_getDelegations` — wallet delegation rows at a block. */
  async lythGetDelegations(
    wallet: string,
    block?: BlockSelector,
  ): Promise<DelegationsResponse> {
    const params =
      block === undefined ? [wallet] : [wallet, encodeBlockSelector(block)];
    return this.call("lyth_getDelegations", params);
  }

  /** `lyth_getDelegationHistory` — indexed per-wallet delegation event timeline. */
  async lythGetDelegationHistory(
    wallet: string,
    limit = 50,
    cursor?: string | null,
  ): Promise<DelegationHistoryRecord[]> {
    const params = cursor === undefined ? [wallet, limit] : [wallet, limit, cursor];
    return this.call("lyth_getDelegationHistory", params);
  }

  /** `lyth_getClusterDelegators` — delegator addresses for a cluster. */
  async lythGetClusterDelegators(
    cluster: number,
    block?: BlockSelector,
  ): Promise<ClusterDelegatorsResponse> {
    const params =
      block === undefined ? [cluster] : [cluster, encodeBlockSelector(block)];
    return this.call("lyth_getClusterDelegators", params);
  }

  /** `lyth_getDelegationCap` — active per-cluster cap at a block. */
  async lythGetDelegationCap(
    block?: BlockSelector,
  ): Promise<DelegationCapResponse> {
    const params = block === undefined ? [] : [encodeBlockSelector(block)];
    return this.call("lyth_getDelegationCap", params);
  }

  /** `lyth_getTpmAttestation` — TPM quote digest + EK id for a peer. */
  async lythGetTpmAttestation(
    peerId: string,
    block?: BlockSelector,
  ): Promise<TpmAttestationResponse> {
    const params =
      block === undefined ? [peerId] : [peerId, encodeBlockSelector(block)];
    return this.call("lyth_getTpmAttestation", params);
  }

  /** `lyth_getClusterEntity` — entity flag for a cluster. */
  async lythGetClusterEntity(
    cluster: number,
    block?: BlockSelector,
  ): Promise<ClusterEntityResponse> {
    const params =
      block === undefined ? [cluster] : [cluster, encodeBlockSelector(block)];
    return this.call("lyth_getClusterEntity", params);
  }

  /** `lyth_getEntityRatchet` — entity-ratchet snapshot at a block. */
  async lythGetEntityRatchet(
    block?: BlockSelector,
  ): Promise<EntityRatchetResponse> {
    const params = block === undefined ? [] : [encodeBlockSelector(block)];
    return this.call("lyth_getEntityRatchet", params);
  }

  /**
   * `lyth_submitPendingChange` — operator-onboarding transport for the
   * pending-change ledger. Server validates the envelope shape.
   */
  async lythSubmitPendingChange(envelope: unknown): Promise<unknown> {
    return this.call("lyth_submitPendingChange", [envelope]);
  }

  /** `lyth_submitEncrypted` — submit a bincode-encoded encrypted envelope hex. */
  async lythSubmitEncrypted(envelopeHex: string): Promise<string> {
    return this.call("lyth_submitEncrypted", [envelopeHex]);
  }

  /** `lyth_getEncryptionKey` — cluster ML-KEM encapsulation key. */
  async lythGetEncryptionKey(): Promise<EncryptionKeyResponse> {
    return this.call("lyth_getEncryptionKey", []);
  }

  /** `lyth_syncStatus` — DAG-sync driver snapshot. */
  async lythSyncStatus(): Promise<DagSyncStatus | null> {
    const v = await this.call<unknown>("lyth_syncStatus", []);
    if (v === null || v === undefined) return null;
    return v as DagSyncStatus;
  }

  /** `lyth_getLatestCheckpoint` — latest PQ-finality checkpoint rows. */
  async lythGetLatestCheckpoint(belowHeight?: number | bigint | string | null): Promise<CheckpointRecord[]> {
    const params = belowHeight === undefined ? [] : [encodeOptionalHeight(belowHeight)];
    return this.call("lyth_getLatestCheckpoint", params);
  }

  /** `lyth_getClusterResignations` — in-flight + applied operator resignations. */
  async lythGetClusterResignations(
    operator?: string | null,
    status?: "pending" | "applied" | "all" | string | null,
  ): Promise<ClusterResignationsResponse> {
    const params =
      status === undefined
        ? operator == null
          ? []
          : [operator]
        : [operator ?? null, status];
    return this.call("lyth_getClusterResignations", params);
  }

  /** `lyth_getBlsRoundCertificate` — round-advancement BLS aggregate. */
  async lythGetBlsRoundCertificate(round: number | bigint | string): Promise<BlsCertificateResponse | null> {
    return this.call("lyth_getBlsRoundCertificate", [encodeRpcInteger(round)]);
  }

  /** `lyth_getLeaderCertificate` — leader-vote BLS aggregate for a block ref. */
  async lythGetLeaderCertificate(
    round: number | bigint | string,
    authority: number,
    digest: string,
  ): Promise<BlsCertificateResponse | null> {
    return this.call("lyth_getLeaderCertificate", [encodeRpcInteger(round), authority, digest]);
  }

  /** `lyth_getDacCertificate` — data-availability certificate for a block ref. */
  async lythGetDacCertificate(
    round: number | bigint | string,
    authority: number,
    digest: string,
  ): Promise<BlsCertificateResponse | null> {
    return this.call("lyth_getDacCertificate", [encodeRpcInteger(round), authority, digest]);
  }

  /** `lyth_subscribe` — WebSocket-only; returns an RPC error over HTTP. */
  async lythSubscribe(channel: string): Promise<unknown> {
    return this.call("lyth_subscribe", [channel]);
  }

  /** `lyth_unsubscribe` — counterpart to `lythSubscribe`. */
  async lythUnsubscribe(subId: string): Promise<unknown> {
    return this.call("lyth_unsubscribe", [subId]);
  }

  // ---- debug_* ------------------------------------------------------
  // Server-side gated by `RpcConfig::debug_enabled`. When the namespace
  // is disabled, every call surfaces as `SdkError.rpc`.

  /** `debug_traceTransaction` — revm trace for a confirmed tx. */
  async debugTraceTransaction(txHash: string): Promise<unknown> {
    return this.call("debug_traceTransaction", [txHash]);
  }

  /** `debug_traceCall` — revm trace for a dry-run. */
  async debugTraceCall(
    request: CallRequest,
    block: BlockSelector = "latest",
  ): Promise<unknown> {
    return this.call("debug_traceCall", [request, encodeBlockSelector(block)]);
  }

  /** `debug_traceBlockByNumber` — revm traces for an entire block. */
  async debugTraceBlockByNumber(block: BlockSelector): Promise<unknown> {
    return this.call("debug_traceBlockByNumber", [encodeBlockSelector(block)]);
  }

  /** `debug_mempoolDump` — full mempool snapshot. */
  async debugMempoolDump(): Promise<MempoolSnapshot> {
    return normalizeMempoolSnapshot(await this.call("debug_mempoolDump", []));
  }

  /** `debug_p2pPeers` — connected libp2p peer list. */
  async debugP2pPeers(): Promise<PeerSummary[]> {
    return this.call("debug_p2pPeers", []);
  }

  /** `debug_stateDiff` — state-diff for a block range. */
  async debugStateDiff(params: unknown): Promise<unknown> {
    return this.call("debug_stateDiff", params);
  }

  /** `debug_chainReorg` — testnet-only reorg trigger. */
  async debugChainReorg(params: unknown): Promise<unknown> {
    return this.call("debug_chainReorg", params);
  }

  // ---- mesh_* -------------------------------------------------------

  /** `mesh_buildUnsignedTx` — build an unsigned transaction envelope. */
  async meshBuildUnsignedTx(intent: MeshTxIntent): Promise<MeshUnsignedTxResponse> {
    return this.call("mesh_buildUnsignedTx", [intent]);
  }

  /** `mesh_combineTx` — combine an unsigned envelope with a wallet signature. */
  async meshCombineTx(
    unsignedTx: string,
    signatureHex: string,
    algo?: "secp256k1" | "ml_dsa_65" | string,
    pubkeyHex?: string,
  ): Promise<MeshSignedTxResponse> {
    const params =
      algo === undefined
        ? [unsignedTx, signatureHex]
        : pubkeyHex === undefined
          ? [unsignedTx, signatureHex, algo]
          : [unsignedTx, signatureHex, algo, pubkeyHex];
    return this.call("mesh_combineTx", params);
  }

  /** `mesh_decodeTx` — decode a signed or unsigned mesh envelope. */
  async meshDecodeTx(envelopeHex: string, signed = false): Promise<MeshDecodedTx> {
    return this.call("mesh_decodeTx", [envelopeHex, signed]);
  }

  /** `mesh_submitTx` — submit a signed mesh envelope. */
  async meshSubmitTx(signedTx: string): Promise<string> {
    return this.call("mesh_submitTx", [signedTx]);
  }
}

/** Decode a `0x`-prefixed hex quantity to a `bigint`. */
export function parseQuantityBig(hex: string): bigint {
  if (!hex) return 0n;
  const rest = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (rest.length === 0) return 0n;
  if (!/^[0-9a-fA-F]+$/.test(rest)) {
    throw SdkError.malformed(`invalid hex quantity: ${hex}`);
  }
  return BigInt(`0x${rest}`);
}

/**
 * Decode a `0x`-prefixed hex quantity to a JS `number`. Convenience for
 * small quantities (chain id, block height, gas estimate). Throws if the
 * value exceeds `Number.MAX_SAFE_INTEGER`.
 */
export function parseQuantity(hex: string): number {
  const big = parseQuantityBig(hex);
  if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw SdkError.malformed(`hex quantity exceeds safe integer: ${hex}`);
  }
  return Number(big);
}

function encodeRpcInteger(v: number | bigint | string): number | string {
  if (typeof v === "bigint") return `0x${v.toString(16)}`;
  return v;
}

function encodeOptionalHeight(v: number | bigint | string | null): number | string | null {
  if (v === null) return null;
  return encodeRpcInteger(v);
}

function parseRpcBigint(value: unknown, label: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw SdkError.malformed(`${label} must be a non-negative safe integer`);
    }
    return BigInt(value);
  }
  if (typeof value === "string") {
    if (value.startsWith("0x") || value.startsWith("0X")) return parseQuantityBig(value);
    if (/^\d+$/.test(value)) return BigInt(value);
  }
  throw SdkError.malformed(`${label} must be a bigint-compatible quantity`);
}

function normalizeBlockHeader(value: unknown): BlockHeader | null {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("block header must be an object or null");
  }
  const h = value as Record<string, unknown>;
  return {
    number: parseRpcBigint(h["number"], "block header number"),
    hash: String(h["hash"]),
    parent_hash: String(h["parent_hash"]),
    state_root: String(h["state_root"]),
    timestamp: parseRpcBigint(h["timestamp"], "block header timestamp"),
    gas_used: parseRpcBigint(h["gas_used"], "block header gas_used"),
    gas_limit: parseRpcBigint(h["gas_limit"], "block header gas_limit"),
  };
}

function normalizeRoundInfo(value: unknown): RoundInfo {
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("round info must be an object");
  }
  const row = value as Record<string, unknown>;
  return {
    height: parseRpcBigint(row["height"], "round height"),
  };
}

function normalizeMempoolSnapshot(value: unknown): MempoolSnapshot {
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("mempool snapshot must be an object");
  }
  const row = value as Record<string, unknown>;
  const bytesByClass = row["bytes_by_class"];
  if (!Array.isArray(bytesByClass) || bytesByClass.length !== 7) {
    throw SdkError.malformed("mempool bytes_by_class must contain 7 entries");
  }
  return {
    count_ready: parseRpcBigint(row["count_ready"], "mempool count_ready"),
    count_pending: parseRpcBigint(row["count_pending"], "mempool count_pending"),
    mailbox_depth: parseRpcBigint(row["mailbox_depth"], "mempool mailbox_depth"),
    bytes_by_class: bytesByClass.map((v, i) => parseRpcBigint(v, `mempool bytes_by_class[${i}]`)) as MempoolSnapshot["bytes_by_class"],
  };
}
