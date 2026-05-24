/**
 * `MonolythiumProvider` — ethers v6 `JsonRpcApiProvider` that routes
 * every call through the native `RpcClient`.
 *
 * `JsonRpcApiProvider` already knows how to translate the rich
 * `_perform(req)` surface into the standard `eth_*` JSON-RPC calls,
 * so we only need to override `_send`: instead of opening its own
 * fetch transport, we reuse the SDK's transport and `lyth_*`-aware
 * error handling.
 *
 * That keeps a single transport in the process — no double-counted
 * connection pools, no duplicated retry/backoff logic, and any
 * future SDK-side feature (auth headers, ws upgrade, registry-based
 * routing) lights up for ethers callers automatically.
 *
 * **SDK-only compat.** This shim never alters the chain's wire. It wraps
 * compatibility JSON-RPC methods in ethers' interface for migration scripts;
 * current v4.1 app paths should use native MRV/RISC-V builders and `lyth_*`
 * read surfaces.
 */

import {
  type JsonRpcPayload,
  type JsonRpcResult,
  type JsonRpcError,
  JsonRpcApiProvider,
  Network,
} from "ethers";
import { RpcClient, type RpcClientOptions } from "../client.js";
import { SdkError } from "../error.js";
import {
  MONOLYTHIUM_TESTNET_CHAIN_ID,
  MONOLYTHIUM_TESTNET_NETWORK_NAME,
  type MonolythiumNetworkConfig,
} from "./network.js";

/** Optional configuration for `MonolythiumProvider`. */
export interface MonolythiumProviderOptions extends RpcClientOptions {
  /**
   * Override the chain id / network name surfaced to ethers. Defaults
   * to the Monolythium v4.1 testnet preset (`chain_id` `69420`, name
   * `monolythium-testnet`).
   */
  network?: MonolythiumNetworkConfig;
}

/**
 * `MonolythiumProvider` adapts `mono-core`'s JSON-RPC surface to
 * ethers v6.
 *
 * Use it the same way you'd use any ethers provider:
 *
 * ```ts
 * import { MonolythiumProvider } from "@monolythium/core-sdk";
 *
 * const provider = new MonolythiumProvider("https://rpc.testnet.monolythium.com");
 * const block = await provider.getBlockNumber();
 * ```
 *
   * Legacy ethers actions such as `getBlockNumber`, `getBalance`,
   * `getTransactionReceipt`, `call`, `estimateGas`, and
   * `broadcastTransaction` flow through `RpcClient.call`, so no-EVM profiles
   * may reject unsupported compatibility methods server-side.
 */
export class MonolythiumProvider extends JsonRpcApiProvider {
  /** Underlying SDK client. Exposed for callers that want native types. */
  readonly rpcClient: RpcClient;

  constructor(
    endpointOrClient: string | RpcClient,
    options: MonolythiumProviderOptions = {},
  ) {
    const network = options.network ?? {
      chainId: MONOLYTHIUM_TESTNET_CHAIN_ID,
      name: MONOLYTHIUM_TESTNET_NETWORK_NAME,
    };
    // `Network`'s constructor takes `BigNumberish` for `chainId`, which
    // accepts a `bigint` directly — `Networkish` (the literal-shape
    // alternative) restricts to `number`, which would clip our `69420n`
    // testnet id when callers point at a chain id past `Number.MAX_SAFE_INTEGER`.
    //
    // We register the name with ethers' global registry on first
    // construction so any later `Network.from(name)` resolves cleanly,
    // but swallow the error when the same name is registered twice
    // (re-instantiation in tests, multiple shim consumers in one
    // process — both legitimate).
    try {
      Network.register(
        network.name,
        () => new Network(network.name, network.chainId),
      );
    } catch (_e) {
      // already registered — fine, fall through.
    }
    super(new Network(network.name, network.chainId));

    this.rpcClient =
      typeof endpointOrClient === "string"
        ? new RpcClient(endpointOrClient, {
            fetch: options.fetch,
            headers: options.headers,
          })
        : endpointOrClient;
  }

  /**
   * Forward a single JSON-RPC method through the SDK transport. Ethers'
   * `_perform` calls this and ethers callers can also call `provider.send`
   * directly to access methods the rich provider interface does not wrap
   * (e.g. `lyth_*`).
   */
  override async _send(
    payload: JsonRpcPayload | Array<JsonRpcPayload>,
  ): Promise<Array<JsonRpcResult | JsonRpcError>> {
    const calls = Array.isArray(payload) ? payload : [payload];
    return Promise.all(calls.map((p) => this.#sendOne(p)));
  }

  async #sendOne(p: JsonRpcPayload): Promise<JsonRpcResult | JsonRpcError> {
    try {
      const params = Array.isArray(p.params)
        ? p.params
        : p.params === undefined
          ? []
          : (p.params as unknown[]);
      const result = await this.rpcClient.call<unknown>(p.method, params);
      return { id: p.id, result };
    } catch (e) {
      if (e instanceof SdkError && e.kind === "rpc") {
        return {
          id: p.id,
          error: {
            code: e.code ?? -32603,
            message: e.message,
            data: e.data,
          },
        };
      }
      // Transport / malformed / endpoint errors don't have a JSON-RPC
      // shape — surface them as a generic internal error so ethers'
      // own error wrapper can pick them up cleanly.
      const msg = (e as Error)?.message ?? String(e);
      return {
        id: p.id,
        error: { code: -32603, message: `${msg}` },
      };
    }
  }
}
