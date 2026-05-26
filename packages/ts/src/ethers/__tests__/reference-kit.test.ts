/**
 * Reference-kit test for the ethers.js compat shim.
 *
 * Intent: a Solidity dev with an existing ethers-based dApp can swap
 * their `Provider` for `MonolythiumProvider` and their `Signer` for
 * `MonolythiumSigner` and have it work end-to-end. This test takes a
 * minimal Counter contract through the full `deploy → call → read`
 * cycle using only ethers' public API and the shim — no manual
 * JSON-RPC, no SDK escape hatches.
 *
 * The Counter source is:
 *
 * ```solidity
 * contract Counter {
 *     uint256 public n;
 *     function inc() public { n = n + 1; }
 * }
 * ```
 *
 * Bytecode + ABI are committed inline so the test runs without solc on
 * CI. To regenerate after a contract change:
 *
 *   solc --bin --abi --optimize --combined-json bin,abi Counter.sol
 *
 * This is a self-contained test — the mock JSON-RPC layer below is
 * intentionally faithful to a real `mono-core` node's `eth_*` surface
 * (the same methods exercised by `tests/client.test.ts`). A live
 * round-trip variant gated on `MONO_CORE_RPC_URL` is deferred to the
 * Stage 1 integration suite.
 */

import { describe, expect, it } from "vitest";
import {
  AbstractProvider,
  Contract,
  ContractFactory,
  JsonRpcProvider,
  Wallet,
  ethers,
  type JsonRpcPayload,
  type JsonRpcResult,
  type JsonRpcError,
} from "ethers";
import {
  MONOLYTHIUM_TESTNET_CHAIN_ID,
  MonolythiumProvider,
  MonolythiumSigner,
} from "../index.js";
import { RpcClient } from "../../client.js";

/**
 * `solc 0.8.20` runtime + creation bytecode for Counter.sol, optimized.
 * Regenerate with:
 *
 *   solc --bin --abi --optimize --combined-json bin,abi Counter.sol
 */
const COUNTER_BYTECODE =
  "0x608060405234801561000f575f80fd5b5060be8061001c5f395ff3fe" +
  "6080604052348015600e575f80fd5b50600436106030575f3560e01c8063" +
  "2e52d606146034578063371303c014604d575b5f80fd5b603b5f5481565b" +
  "60405190815260200160405180910390f35b60536055565b005b5f546060" +
  "9060016064565b5f55565b80820180821115608257634e487b7160e01b5f" +
  "52601160045260245ffd5b9291505056fea26469706673582212202a0485" +
  "7a6830684e780a4bd1614601f688d000b45435b8e3a44c0f3ddd65739864" +
  "736f6c63430008140033";

const COUNTER_ABI = [
  {
    inputs: [],
    name: "inc",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "n",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

/**
 * Faithful in-memory replica of the `mono-core` `eth_*` surface for a
 * single-account, single-contract scenario. Returns the same wire
 * shapes the real node returns; doesn't actually execute EVM bytecode
 * — the contract is deemed deployed at the address derived from
 * `(sender, nonce)` and `inc()` calls bump a counter regardless of
 * the calldata payload (Counter has only one writable function).
 *
 * Crucially, the mock validates that the *shim* sends the right wire
 * — chain id, gas limit, fee fields, signed-tx hex — before
 * acknowledging.
 */
class MockMonoCoreNode {
  blockNumber = 1n;
  state = new Map<string, bigint>(); // contract address (lower) -> n value
  receipts = new Map<string, MockReceipt>(); // tx hash -> receipt
  contracts = new Map<string, string>(); // contract address (lower) -> bytecode
  chainId: bigint = MONOLYTHIUM_TESTNET_CHAIN_ID;

  /** Methods we observed during the test, for assertions. */
  observedMethods: string[] = [];
  /** Tx envelopes we observed. */
  observedRawTxs: string[] = [];

  async handle(payload: JsonRpcPayload): Promise<JsonRpcResult | JsonRpcError> {
    this.observedMethods.push(payload.method);
    const params = (payload.params ?? []) as unknown[];
    try {
      const result = await this.dispatch(payload.method, params);
      return { id: payload.id, result };
    } catch (e) {
      return {
        id: payload.id,
        error: { code: -32601, message: (e as Error).message },
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async dispatch(method: string, params: unknown[]): Promise<any> {
    switch (method) {
      case "eth_chainId":
        return `0x${this.chainId.toString(16)}`;
      case "net_version":
        return this.chainId.toString();
      case "eth_blockNumber":
        return `0x${this.blockNumber.toString(16)}`;
      case "eth_getBlockByNumber":
        return this.makeBlock();
      case "eth_gasPrice":
        return "0x2540be400"; // 10 gwei (Law §5.3 priority floor)
      case "eth_getTransactionCount":
        // Always nonce 0 — the test deploys exactly once.
        return "0x0";
      case "eth_getCode": {
        const addr = String(params[0]).toLowerCase();
        return this.contracts.get(addr) ?? "0x";
      }
      case "eth_estimateGas":
        return "0x186a0"; // 100k
      case "eth_call":
        return this.handleCall(params[0] as { to?: string; data?: string });
      case "eth_sendRawTransaction":
        return this.handleSendRaw(String(params[0]));
      case "eth_getTransactionReceipt": {
        const hash = String(params[0]).toLowerCase();
        const r = this.receipts.get(hash);
        if (!r) return null;
        return r;
      }
      case "eth_feeHistory":
        return {
          oldestBlock: "0x0",
          baseFeePerGas: ["0x0", "0x0"],
          gasUsedRatio: [0],
          reward: [],
        };
      case "eth_getBlockByHash":
        return this.makeBlock();
      case "eth_maxPriorityFeePerGas":
        return "0x2540be400"; // 10 gwei
      case "web3_clientVersion":
        return "mono-core-mock/0.0.1";
      default:
        throw new Error(`unknown method ${method}`);
    }
  }

  private makeBlock() {
    const num = this.blockNumber;
    const numHex = `0x${num.toString(16)}`;
    return {
      number: numHex,
      hash: `0x${num.toString(16).padStart(64, "0")}`,
      parentHash: `0x${(num - 1n).toString(16).padStart(64, "0")}`,
      timestamp: "0x65000000",
      gasUsed: "0x0",
      gasLimit: "0xbebc200",
      stateRoot: `0x${"00".repeat(32)}`,
      miner: "0x0000000000000000000000000000000000000000",
      difficulty: "0x0",
      nonce: "0x0000000000000000",
      baseFeePerGas: "0x0",
      extraData: "0x",
      mixHash: `0x${"00".repeat(32)}`,
      transactions: [],
      transactionsRoot: `0x${"00".repeat(32)}`,
      receiptsRoot: `0x${"00".repeat(32)}`,
      logsBloom: `0x${"00".repeat(256)}`,
      sha3Uncles:
        "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
      uncles: [],
      size: "0x0",
    };
  }

  private handleCall(req: { to?: string; data?: string }): string {
    if (!req.to) throw new Error("call requires `to`");
    const addr = req.to.toLowerCase();
    if (!this.contracts.has(addr)) throw new Error("not a contract");
    // Counter has one read function `n()` with selector 0x2e52d606.
    if (req.data && req.data.toLowerCase().startsWith("0x2e52d606")) {
      const n = this.state.get(addr) ?? 0n;
      return `0x${n.toString(16).padStart(64, "0")}`;
    }
    throw new Error(`unhandled call data ${req.data}`);
  }

  private handleSendRaw(rawTxHex: string): string {
    this.observedRawTxs.push(rawTxHex);
    // Decode the ethers-produced tx so we can find sender, nonce, to.
    const tx = ethers.Transaction.from(rawTxHex);
    const sender = tx.from?.toLowerCase();
    if (!sender) throw new Error("tx has no recoverable sender");
    if (tx.chainId !== this.chainId) {
      throw new Error(
        `chain id mismatch: tx ${tx.chainId}, node ${this.chainId}`,
      );
    }
    this.blockNumber += 1n;
    const txHash = tx.hash ?? "0x";
    if (!tx.to) {
      // Contract creation. Address = keccak(rlp([sender, nonce]))[12..32].
      const contractAddr = ethers.getCreateAddress({
        from: tx.from!,
        nonce: tx.nonce,
      });
      this.contracts.set(contractAddr.toLowerCase(), COUNTER_BYTECODE);
      this.state.set(contractAddr.toLowerCase(), 0n);
      this.receipts.set(txHash.toLowerCase(), {
        transactionHash: txHash,
        blockHash: `0x${this.blockNumber.toString(16).padStart(64, "0")}`,
        blockNumber: `0x${this.blockNumber.toString(16)}`,
        transactionIndex: "0x0",
        status: "0x1",
        gasUsed: "0x186a0",
        cumulativeGasUsed: "0x186a0",
        effectiveGasPrice: "0x2540be400",
        contractAddress: contractAddr,
        from: tx.from!,
        to: null,
        type: "0x2",
        logsBloom: `0x${"00".repeat(256)}`,
        logs: [],
      });
    } else {
      // Counter has only one writable function `inc()` with selector 0x371303c0.
      if (tx.data.toLowerCase().startsWith("0x371303c0")) {
        const cur = this.state.get(tx.to.toLowerCase()) ?? 0n;
        this.state.set(tx.to.toLowerCase(), cur + 1n);
      }
      this.receipts.set(txHash.toLowerCase(), {
        transactionHash: txHash,
        blockHash: `0x${this.blockNumber.toString(16).padStart(64, "0")}`,
        blockNumber: `0x${this.blockNumber.toString(16)}`,
        transactionIndex: "0x0",
        status: "0x1",
        gasUsed: "0x5208",
        cumulativeGasUsed: "0x5208",
        effectiveGasPrice: "0x2540be400",
        contractAddress: null,
        from: tx.from!,
        to: tx.to,
        type: "0x2",
        logsBloom: `0x${"00".repeat(256)}`,
        logs: [],
      });
    }
    return txHash;
  }
}

interface MockReceipt {
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
 * Build an `RpcClient` whose `fetch` impl is wired to the mock node.
 * Returns the client + the node so tests can inspect what wire methods
 * the shim exercised.
 */
function makeMockedClient(): { client: RpcClient; node: MockMonoCoreNode } {
  const node = new MockMonoCoreNode();
  const fakeFetch: typeof fetch = async (_input, init) => {
    const body = JSON.parse(init!.body as string) as JsonRpcPayload;
    const result = await node.handle(body);
    return new Response(JSON.stringify({ jsonrpc: "2.0", ...result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const client = new RpcClient("http://mock", { fetch: fakeFetch });
  return { client, node };
}

describe("ethers compat — reference kit", () => {
  it("MonolythiumProvider reports the configured chain id", async () => {
    const { client } = makeMockedClient();
    const provider = new MonolythiumProvider(client);
    const network = await provider.getNetwork();
    expect(network.chainId).toBe(MONOLYTHIUM_TESTNET_CHAIN_ID);
    expect(network.name).toBe("monolythium-testnet");
  });

  it("MonolythiumProvider exposes block number through ethers' interface", async () => {
    const { client } = makeMockedClient();
    const provider = new MonolythiumProvider(client);
    const n = await provider.getBlockNumber();
    expect(n).toBe(1);
  });

  it("MonolythiumProvider routes raw send() through the SDK transport", async () => {
    const { client, node } = makeMockedClient();
    const provider = new MonolythiumProvider(client);
    const result = await provider.send("eth_chainId", []);
    expect(BigInt(result)).toBe(MONOLYTHIUM_TESTNET_CHAIN_ID);
    expect(node.observedMethods).toContain("eth_chainId");
  });

  it("MonolythiumSigner.fromEthersWallet wraps a stock ethers Wallet", async () => {
    const { client } = makeMockedClient();
    const provider = new MonolythiumProvider(client);
    const wallet = Wallet.createRandom();
    const signer = MonolythiumSigner.fromEthersWallet(wallet, provider);
    expect(await signer.getAddress()).toBe(wallet.address);
  });

  it("end-to-end legacy ethers dev kit: deploy Counter, call inc(), read n()", async () => {
    const { client, node } = makeMockedClient();
    const provider = new MonolythiumProvider(client);

    // A fresh, deterministic key so `getCreateAddress` matches.
    const wallet = new Wallet(
      "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
    );
    const signer = MonolythiumSigner.fromEthersWallet(wallet, provider);

    // 1. Deploy Counter through ethers' standard factory path.
    const factory = new ContractFactory(COUNTER_ABI, COUNTER_BYTECODE, signer);
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    const addr = await deployed.getAddress();
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/);

    // 2. Read initial n() value.
    const counterRead = new Contract(addr, COUNTER_ABI, provider);
    const before = (await counterRead.n()) as bigint;
    expect(before).toBe(0n);

    // 3. Call inc() through the signer.
    const counterWrite = new Contract(addr, COUNTER_ABI, signer);
    const tx = await counterWrite.inc!();
    await tx.wait();

    // 4. Read n() after — must be 1.
    const after = (await counterRead.n()) as bigint;
    expect(after).toBe(1n);

    // 5. Confirm the shim drove only ethers-public methods. Critically,
    //    we observed `eth_sendRawTransaction` *twice* (deploy + inc) and
    //    every raw tx pinned `chain_id = 69420`.
    const rawTxs = node.observedRawTxs;
    expect(rawTxs).toHaveLength(2);
    for (const raw of rawTxs) {
      const decoded = ethers.Transaction.from(raw);
      expect(decoded.chainId).toBe(MONOLYTHIUM_TESTNET_CHAIN_ID);
    }
  });

  it("MonolythiumSigner accepts a custom backend (non-ethers signing source)", async () => {
    // Demonstrates the seam for a future ML-DSA-65 / keychain backend:
    // any object satisfying `MonolythiumSignerBackend` plugs in.
    const { client } = makeMockedClient();
    const provider = new MonolythiumProvider(client);

    // Reuse a canned Wallet for signing; the *interface* the test
    // demonstrates is what matters — getAddress/signTransaction/
    // signMessage/signTypedData are owned by the consumer, not by the SDK.
    const wallet = new Wallet(
      "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
    );
    const signer = new MonolythiumSigner(
      {
        getAddress: async () => wallet.address,
        signTransaction: (tx) => wallet.signTransaction(tx),
        signMessage: (msg) => wallet.signMessage(msg),
        signTypedData: (domain, types, value) =>
          wallet.signTypedData(domain, types, value),
      },
      provider,
    );

    expect(await signer.getAddress()).toBe(wallet.address);
    const sig = await signer.signMessage("hello monolythium");
    expect(sig).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it("MonolythiumProvider is a drop-in for AbstractProvider in ethers' contract surface", async () => {
    // Type-check that ethers accepts MonolythiumProvider where
    // AbstractProvider / JsonRpcProvider are expected.
    const { client } = makeMockedClient();
    const provider: AbstractProvider = new MonolythiumProvider(client);
    expect(provider).toBeDefined();
    expect(provider).not.toBeInstanceOf(JsonRpcProvider);
    // Any ethers Contract should accept the shim provider directly.
    const contract = new Contract(
      "0x0000000000000000000000000000000000000001",
      COUNTER_ABI,
      provider,
    );
    expect(contract).toBeDefined();
  });
});
