/**
 * Typed JSON-RPC client for a `mono-core` node.
 *
 * Mirrors the Rust SDK's `RpcClient` — every public method maps 1:1 to
 * a method on the Rust client and returns the same wire-shape value.
 */

import { SdkError } from "./error.js";
import {
  AccountPolicy,
  AccountProofResponse,
  AssetPolicy,
  BlockHeader,
  BlockSelector,
  CallRequest,
  FeeHistoryResponse,
  IndexerStatus,
  MempoolSnapshot,
  PeerSummary,
  PendingTxSummary,
  RegistryRecord,
  RoundInfo,
  StorageProofBatch,
  SyncStatus,
  TransactionReceipt,
  ValidatorDescriptor,
  encodeBlockSelector,
} from "./types.js";

/** Optional per-client configuration. */
export interface RpcClientOptions {
  /** Override `fetch`. Useful for tests or non-Node environments. */
  fetch?: typeof fetch;
  /** Extra headers to attach to every request. */
  headers?: Record<string, string>;
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

const SDK_VERSION = "0.0.1";

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
  async ethChainId(): Promise<number> {
    return parseQuantity(await this.call<string>("eth_chainId", []));
  }

  /** `eth_blockNumber` — latest committed height. */
  async ethBlockNumber(): Promise<number> {
    return parseQuantity(await this.call<string>("eth_blockNumber", []));
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
  ): Promise<number> {
    return parseQuantity(
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
    return this.call("eth_getBlockByNumber", [encodeBlockSelector(block)]);
  }

  /** `eth_getBlockByHash` — fetch a block header by hash. */
  async ethGetBlockByHash(hash: string): Promise<BlockHeader | null> {
    return this.call("eth_getBlockByHash", [hash]);
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
  ): Promise<number> {
    return parseQuantity(
      await this.call<string>("eth_estimateGas", [request, encodeBlockSelector(block)]),
    );
  }

  /** `eth_gasPrice` — minimum gas price the node will accept. */
  async ethGasPrice(): Promise<number> {
    return parseQuantity(await this.call<string>("eth_gasPrice", []));
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
  async netPeerCount(): Promise<number> {
    return parseQuantity(await this.call<string>("net_peerCount", []));
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

  // ---- protocore_* --------------------------------------------------

  /** `protocore_listProviders` — paged registry enumeration. */
  async protocoreListProviders(
    capabilityMask: number,
    cursor: string | null = null,
    limit = 100,
  ): Promise<RegistryRecord[]> {
    return this.call("protocore_listProviders", [capabilityMask, cursor, limit]);
  }

  /** `protocore_getRegistration` — single registry lookup. */
  async protocoreGetRegistration(peerId: string): Promise<RegistryRecord | null> {
    return this.call("protocore_getRegistration", [peerId]);
  }

  /** `protocore_registryStateProof` — Merkle proof for a registry entry. */
  async protocoreRegistryStateProof(peerId: string): Promise<AccountProofResponse> {
    return this.call("protocore_registryStateProof", [peerId]);
  }

  /** `protocore_getAccountPolicy` — privacy posture for an account. */
  async protocoreGetAccountPolicy(address: string): Promise<AccountPolicy> {
    return this.call("protocore_getAccountPolicy", [address]);
  }

  /** `protocore_getAssetPolicy` — privacy posture for an asset. */
  async protocoreGetAssetPolicy(tokenId: string): Promise<AssetPolicy> {
    return this.call("protocore_getAssetPolicy", [tokenId]);
  }

  /** `protocore_mempoolStatus` — aggregate mempool snapshot. */
  async protocoreMempoolStatus(): Promise<MempoolSnapshot> {
    return this.call("protocore_mempoolStatus", []);
  }

  /** `protocore_mempoolPending` — pending txs for a sender. */
  async protocoreMempoolPending(sender: string): Promise<PendingTxSummary[]> {
    return this.call("protocore_mempoolPending", [sender]);
  }

  /** `protocore_currentRound` — latest committed height. */
  async protocoreCurrentRound(): Promise<RoundInfo> {
    return this.call("protocore_currentRound", []);
  }

  /** `protocore_validatorSet` — configured validator set. */
  async protocoreValidatorSet(): Promise<ValidatorDescriptor[]> {
    return this.call("protocore_validatorSet", []);
  }

  /** `protocore_indexerStatus` — indexer status; `null` when disabled. */
  async protocoreIndexerStatus(): Promise<IndexerStatus | null> {
    const v = await this.call<unknown>("protocore_indexerStatus", []);
    if (v === null || v === undefined) return null;
    return v as IndexerStatus;
  }

  /** `protocore_getStorageProof` — batched Merkle proofs. */
  async protocoreGetStorageProof(
    address: string,
    slots: string[],
  ): Promise<StorageProofBatch> {
    return this.call("protocore_getStorageProof", [address, slots]);
  }

  /** `protocore_subscribe` — WebSocket-only; returns an RPC error over HTTP. */
  async protocoreSubscribe(channel: string): Promise<unknown> {
    return this.call("protocore_subscribe", [channel]);
  }

  /** `protocore_unsubscribe` — counterpart to `protocoreSubscribe`. */
  async protocoreUnsubscribe(subId: string): Promise<unknown> {
    return this.call("protocore_unsubscribe", [subId]);
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
    return this.call("debug_mempoolDump", []);
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
}

/** Decode a `0x`-prefixed hex quantity to a JS number. */
export function parseQuantity(hex: string): number {
  if (!hex) return 0;
  const rest = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (rest.length === 0) return 0;
  const n = Number.parseInt(rest, 16);
  if (Number.isNaN(n)) {
    throw SdkError.malformed(`invalid hex quantity: ${hex}`);
  }
  return n;
}
