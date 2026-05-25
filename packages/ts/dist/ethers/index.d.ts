import { JsonRpcApiProvider, JsonRpcPayload, JsonRpcResult, JsonRpcError, AbstractSigner, Provider, TransactionRequest, TypedDataDomain, TypedDataField, BaseWallet, Signer } from 'ethers';
import { D as RpcClient, cT as RpcClientOptions, d3 as TransactionReceipt, au as CallRequest } from '../native-events-CMCJsrHx.js';
import { b as MonolythiumNetworkConfig } from '../network-BK2u9br2.js';
export { c as MONOLYTHIUM_NETWORKS, M as MONOLYTHIUM_TESTNET_CHAIN_ID, a as MONOLYTHIUM_TESTNET_NETWORK_NAME } from '../network-BK2u9br2.js';

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

/** Optional configuration for `MonolythiumProvider`. */
interface MonolythiumProviderOptions extends RpcClientOptions {
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
declare class MonolythiumProvider extends JsonRpcApiProvider {
    #private;
    /** Underlying SDK client. Exposed for callers that want native types. */
    readonly rpcClient: RpcClient;
    constructor(endpointOrClient: string | RpcClient, options?: MonolythiumProviderOptions);
    /**
     * Forward a single JSON-RPC method through the SDK transport. Ethers'
     * `_perform` calls this and ethers callers can also call `provider.send`
     * directly to access methods the rich provider interface does not wrap
     * (e.g. `lyth_*`).
     */
    _send(payload: JsonRpcPayload | Array<JsonRpcPayload>): Promise<Array<JsonRpcResult | JsonRpcError>>;
}

/**
 * `MonolythiumSigner` — ethers v6 `AbstractSigner` adapter.
 *
 * Two backend strategies are supported, both via the same external
 * surface — `getAddress`, `signTransaction`, `signMessage`,
 * `signTypedData`:
 *
 * 1. **`fromEthersWallet`** — wraps a normal `ethers.Wallet`
 *    (secp256k1). Useful for tests, scripts, and any path where the
 *    user already has an Ethereum-style key. The SDK does not store
 *    the key — the wallet does.
 *
 * 2. **`MonolythiumSignerBackend`** — generic interface a non-ethers
 *    backend (keychain, hardware wallet, future ML-DSA-65 signer)
 *    implements to plug into ethers without forcing the SDK to take
 *    a hard ethers dependency on either the chain side or the
 *    consumer side.
 *
 * Native Mono address derivation is ADR-0038:
 * `BLAKE3("MONO_ADDRESS_BLAKE3_20_V1" || algo_id_be_u16 ||
 * canonical_pubkey_bytes)[0..20]`. `fromEthersWallet` preserves the
 * wrapped ethers address only for the compatibility signer path; native
 * ML-DSA-65 callers should use the crypto helpers directly.
 *
 * **What the shim is not.** This is SDK-level compat (per
 * `feedback_no_ethereum_wire_retrofit.md`). The chain's protocol-native
 * signing path is ML-DSA-65 (Law §2.1); ethers cannot produce ML-DSA
 * signatures, and the chain accepts secp256k1 only via the
 * crypto-agile `SignedTransaction` envelope. Use
 * `MonolythiumSignerBackend` to plug a native ML-DSA path in.
 */

/**
 * Backend the `MonolythiumSigner` delegates signing to.
 *
 * The intent is to let consumers wire up any signing source — local
 * keystore, OS keychain, hardware wallet, or a future ML-DSA-65
 * adapter — without the shim forcing a particular implementation.
 *
 * Every method's return shape mirrors what ethers'
 * `AbstractSigner` callers expect, so the backend can compose with
 * any tooling built on ethers.
 */
interface MonolythiumSignerBackend {
    /** Resolves to the 20-byte 0x-hex address (Law §2.6 derivation). */
    getAddress(): Promise<string>;
    /**
     * Resolves to a fully-encoded raw signed transaction (a 0x-hex
     * string). For secp256k1 this is the canonical EIP-1559 RLP that
     * `eth_sendRawTransaction` expects.
     */
    signTransaction(tx: TransactionRequest): Promise<string>;
    /**
     * Resolves to an EIP-191 personal-sign signature (`0x` + 65 bytes
     * for secp256k1 / variable for non-recoverable algorithms).
     */
    signMessage(message: string | Uint8Array): Promise<string>;
    /** Resolves to an EIP-712 typed-data signature. */
    signTypedData(domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, unknown>): Promise<string>;
}
/**
 * `MonolythiumSigner` — ethers v6 `Signer` for the Monolythium chain.
 *
 * Construct one of three ways:
 *
 * 1. `MonolythiumSigner.fromEthersWallet(wallet, provider)` — the
 *    fastest path; wraps a normal `ethers.Wallet`.
 * 2. `new MonolythiumSigner(backend, provider)` — supply any object
 *    implementing `MonolythiumSignerBackend`.
 *
 * The signer is compatible with ethers v6 migration flows: it can be passed
 * anywhere a `Signer` is accepted and supports legacy contract deploy/call
 * helpers plus `provider.broadcastTransaction(signed)`. New v4.1 app paths
 * should use native MRV/RISC-V builders instead.
 */
declare class MonolythiumSigner extends AbstractSigner<Provider | null> {
    #private;
    constructor(backend: MonolythiumSignerBackend, provider?: Provider | null);
    /**
     * Wrap any ethers v6 `BaseWallet` (the parent class of `Wallet`,
     * `HDNodeWallet`, and friends) so callers don't have to write a
     * `MonolythiumSignerBackend` for the common test / dev path.
     *
     * Both `new Wallet(privateKey)` and `Wallet.createRandom()` /
     * `HDNodeWallet.fromMnemonic(...)` are accepted.
     */
    static fromEthersWallet(wallet: BaseWallet, provider?: Provider | null): MonolythiumSigner;
    getAddress(): Promise<string>;
    connect(provider: Provider | null): Signer;
    signTransaction(tx: TransactionRequest): Promise<string>;
    signMessage(message: string | Uint8Array): Promise<string>;
    signTypedData(domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, unknown>): Promise<string>;
}

/**
 * Tx wire translation between ethers.js and `mono-core`.
 *
 * The chain natively accepts EIP-1559-shape EVM transactions on the
 * `Tx::Evm` (kind tag `0x01`) wire path — a `SignedTransaction` payload
 * carries the legacy EIP-1559 envelope plus the secp256k1 signature.
 * That makes the round-trip simple: ethers produces the canonical
 * EIP-1559 RLP, the client posts it via `eth_sendRawTransaction`, the
 * chain decodes it, and the receipt comes back through the same
 * `eth_getTransactionReceipt` shape ethers expects.
 *
 * Two notes for any future maintainer:
 *
 * 1. **No chain-level Ethereum retrofit.** This shim is SDK-only — see
 *    `feedback_no_ethereum_wire_retrofit.md`. The chain keeps its
 *    custom envelope and native tx hash for the protocol-native path
 *    (ML-DSA-65 signing, native tx kinds beyond EVM). The shim only
 *    spans the **EIP-1559 EVM subset** of the chain's tx surface.
 * 2. **Fields ethers does not see.** Monolythium-specific extension
 *    fields (privacy flags, native tx kinds, ML-DSA-65 signatures) are
 *    intentionally dropped by these helpers. Callers that need those
 *    surfaces use the native SDK signer trait, not the ethers shim.
 */

/**
 * The EIP-1559 subset of fields ethers' `TransactionRequest` carries
 * across the shim. We don't import ethers' type here so the shim can be
 * compiled (and its types re-exported) even when ethers isn't installed
 * — ethers is a peerDependency, not a hard dependency.
 */
interface EthersTxRequestSubset {
    to?: string | null;
    from?: string | null;
    nonce?: number | bigint | null;
    gasLimit?: bigint | string | null;
    gasPrice?: bigint | string | null;
    maxFeePerGas?: bigint | string | null;
    maxPriorityFeePerGas?: bigint | string | null;
    value?: bigint | string | null;
    data?: string | null;
    chainId?: bigint | number | null;
    type?: number | null;
}
/**
 * Translate ethers' `TransactionRequest` into the wire shape the
 * `mono-core` JSON-RPC accepts for `eth_call` / `eth_estimateGas`.
 *
 * Returns the SDK's `CallRequest` shape (which mirrors the chain's
 * accepted `eth_call` argument). Round-trips losslessly for the
 * EIP-1559 EVM subset; Monolythium-specific extension fields are
 * intentionally not surfaced here.
 */
declare function translateTxIn(req: EthersTxRequestSubset): CallRequest;
/**
 * The ethers v6 wire shape for `eth_getTransactionReceipt`. We hand-roll
 * this rather than importing ethers' internal types because the shim
 * has to compile without ethers installed (peerDependency).
 *
 * Field naming and casing match what `JsonRpcApiProvider._perform` expects
 * back — the provider then normalises into ethers' rich
 * `TransactionReceipt` for callers.
 */
interface EthersReceiptShape {
    transactionHash: string;
    blockHash: string;
    blockNumber: string;
    transactionIndex: string;
    status: string;
    gasUsed: string;
    cumulativeGasUsed: string;
    effectiveGasPrice: string;
    contractAddress: string | null;
    from: string;
    to: string | null;
    type: string;
    logsBloom: string;
    logs: unknown[];
}
/**
 * Translate `mono-core`'s native `TransactionReceipt` into the wire
 * shape ethers expects. Required for `eth_getTransactionReceipt` to
 * surface a usable `TransactionResponse` to ethers callers.
 *
 * The chain's receipt today is intentionally narrow — log emission,
 * cumulative execution-unit aggregation, and effective-fee disclosure are
 * tracked OI items. This translator fills in zero-equivalent values for
 * those gaps; callers that need the full native surface consume the SDK
 * receipt shape directly.
 */
declare function translateReceiptOut(monoReceipt: TransactionReceipt, fromAddress: string | null, toAddress: string | null): EthersReceiptShape;
/**
 * Translate `mono-core`'s `BlockHeader` into the ethers v6 wire shape
 * for `eth_getBlockByNumber` / `eth_getBlockByHash`.
 *
 * The chain's block header is intentionally narrower than Ethereum's
 * — it omits fields that don't exist in Monolythium (uncles, mix hash,
 * difficulty, nonce, sha3Uncles). This translator emits zero-valued
 * stand-ins so ethers' normaliser does not throw. Callers needing the
 * authoritative shape import the native `BlockHeader` from the SDK.
 */
interface EthersBlockShape {
    number: string;
    hash: string;
    parentHash: string;
    timestamp: string;
    gasUsed: string;
    gasLimit: string;
    stateRoot: string;
    miner: string;
    difficulty: string;
    nonce: string;
    baseFeePerGas: string | null;
    extraData: string;
    mixHash: string;
    transactions: string[];
    transactionsRoot: string;
    receiptsRoot: string;
    logsBloom: string;
    sha3Uncles: string;
    uncles: string[];
    size: string;
}
/**
 * Translate `mono-core`'s `BlockHeader` to the ethers wire shape.
 * `transactions` defaults to an empty list — the SDK's
 * `eth_getBlockByNumber` does not yet return tx hashes; once Stage 1+
 * surfaces them, callers update this translator.
 */
declare function translateBlockOut(header: {
    number: bigint;
    hash: string;
    parent_hash: string;
    state_root: string;
    timestamp: bigint;
    executionUnitsUsed: bigint;
    executionUnitLimit: bigint;
}): EthersBlockShape;

export { type EthersBlockShape, type EthersReceiptShape, type EthersTxRequestSubset, MonolythiumNetworkConfig, MonolythiumProvider, type MonolythiumProviderOptions, MonolythiumSigner, type MonolythiumSignerBackend, translateBlockOut, translateReceiptOut, translateTxIn };
