/**
 * Tests for the wallet/monoscan gap-fill surfaces added to the SDK:
 * oracle feed-id derivation + price formatting, name-registry reads,
 * cluster APR, circulating supply / burn, swap-intent status, tx
 * confirmations, single-entry spending-policy root builders, bridge
 * submit-side calldata encoders, and the CLOB/token helper functions.
 *
 * Hash + selector golden vectors are byte-identical to the chain
 * constructions (keccak256 over the same preimages).
 */
import { describe, expect, it } from "vitest";
import { keccak_256 } from "@noble/hashes/sha3.js";
import {
  EMPTY_ROOT,
  RpcClient,
  SpendingPolicyError,
  addressToTypedBech32,
  allowRootFor,
  categoryRoot,
  clusterApyPercent,
  computeQuoteLiquidity,
  denyRootFor,
  deriveFeedId,
  destinationRoot,
  NAME_REGISTRY_SELECTORS,
  NameRegistryError,
  encodeBridgeChallengeCalldata,
  encodeBridgeClaimCalldata,
  encodeNameAcceptTransferCall,
  encodeNameRegisterCall,
  encodeSubmitBridgeProofCalldata,
  formatOraclePrice,
  nameLengthModifierX10,
  nameRegistrationCost,
  parseNameCategory,
  oraclePriceToNumber,
  rankMarketsByVolume,
  setDestinationRoot,
} from "../src/index.js";
import type { ClobMarketSummary, ClobOrderBookResponse, OracleLatestPrice } from "../src/index.js";

interface CapturedCall {
  method: string;
  params: unknown;
}

function mockFetch(reply: unknown): { fetch: typeof fetch; calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = init?.body;
    if (typeof body !== "string") throw new Error("expected string body");
    const parsed = JSON.parse(body) as { method: string; params: unknown };
    calls.push({ method: parsed.method, params: parsed.params });
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: reply }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchImpl, calls };
}

function mockFetchSequence(replies: unknown[]): { fetch: typeof fetch; calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  let i = 0;
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = init?.body;
    if (typeof body !== "string") throw new Error("expected string body");
    const parsed = JSON.parse(body) as { method: string; params: unknown };
    calls.push({ method: parsed.method, params: parsed.params });
    const result = i < replies.length ? replies[i++] : replies.at(-1);
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchImpl, calls };
}

const hex = (u: Uint8Array): string =>
  `0x${[...u].map((b) => b.toString(16).padStart(2, "0")).join("")}`;

describe("oracle feed-id + price helpers", () => {
  it("derives a feed id byte-identical to the chain construction", () => {
    // keccak256("protocore-oracle/feed-id/v1" || "BTC/USD" || 0x08).
    expect(deriveFeedId("BTC/USD", 8)).toBe(
      "0x23060fa3cb437a52fecffbe245c33b1c3416d551098dcff67bd333fd7947d786",
    );
  });

  it("distinguishes decimals and names (matches chain determinism tests)", () => {
    expect(deriveFeedId("BTC/USD", 8)).toBe(deriveFeedId("BTC/USD", 8));
    expect(deriveFeedId("BTC/USD", 8)).not.toBe(deriveFeedId("BTC/USD", 6));
    expect(deriveFeedId("BTC/USD", 8)).not.toBe(deriveFeedId("ETH/USD", 8));
  });

  it("rejects out-of-range decimals", () => {
    expect(() => deriveFeedId("BTC/USD", 256)).toThrow();
    expect(() => deriveFeedId("BTC/USD", -1)).toThrow();
  });

  it("formats a finalized median against feed decimals", () => {
    const base = (median: string | null, decimals: number): OracleLatestPrice => ({
      schemaVersion: 1,
      source: "native_state_storage",
      precompile: "0x0000000000000000000000000000000000001009",
      feedId: `0x${"00".repeat(32)}`,
      decimals,
      round: 1,
      finalized: median !== null,
      median,
      finalizedAtBlock: median !== null ? 10 : null,
    });
    // 123456789 / 1e8 = 1.23456789
    expect(formatOraclePrice(base("0x75bcd15", 8))).toBe("1.23456789");
    // trailing fractional zeros trimmed: 150000000 / 1e8 = 1.5
    expect(formatOraclePrice(base("0x8f0d180", 8))).toBe("1.5");
    // decimals 0 → integer string
    expect(formatOraclePrice(base("0x10", 0))).toBe("16");
    // unfinalized → null
    expect(formatOraclePrice(base(null, 8))).toBeNull();
    expect(oraclePriceToNumber(base("0x75bcd15", 8))).toBeCloseTo(1.23456789, 8);
    expect(oraclePriceToNumber(base(null, 8))).toBeNull();
  });
});

describe("spending-policy single-entry root builders", () => {
  const cdAddress = addressToTypedBech32("user", `0x${"cd".repeat(20)}`);

  it("builds a destination root = keccak256(20 raw address bytes)", () => {
    // Pinned against the chain gate vector keccak256([0xCD; 20]).
    expect(hex(destinationRoot(cdAddress))).toBe(
      "0xa3b3cf4a09ea5c2b28b4f432cb366313ce0eaf9ee4385850b289a213cae83508",
    );
    expect(hex(destinationRoot(cdAddress))).toBe(hex(keccak_256(new Uint8Array(20).fill(0xcd))));
  });

  it("aliases allow/deny to the same construction", () => {
    expect(hex(allowRootFor(cdAddress))).toBe(hex(destinationRoot(cdAddress)));
    expect(hex(denyRootFor(cdAddress))).toBe(hex(destinationRoot(cdAddress)));
  });

  it("builds a category root from a raw 4-byte selector = keccak256(selector)", () => {
    expect(hex(categoryRoot(new Uint8Array([0xde, 0xad, 0xbe, 0xef])))).toBe(
      "0xd4fd4e189132273036449fc9e11198c739161b4c0116a9a2dccdfa1c492006f1",
    );
  });

  it("derives the selector first for the function-signature form", () => {
    const sig = "transfer(address,uint256)";
    const selector = keccak_256(new TextEncoder().encode(sig)).slice(0, 4);
    expect(hex(categoryRoot(sig))).toBe(hex(categoryRoot(selector)));
  });

  it("rejects a non-4-byte category selector", () => {
    expect(() => categoryRoot(new Uint8Array([0x01, 0x02]))).toThrow(SpendingPolicyError);
  });

  it("setDestinationRoot returns EMPTY_ROOT for an empty set and throws on >1", () => {
    expect(hex(setDestinationRoot([]))).toBe(hex(EMPTY_ROOT));
    expect(hex(setDestinationRoot([cdAddress]))).toBe(hex(destinationRoot(cdAddress)));
    expect(() => setDestinationRoot([cdAddress, cdAddress])).toThrow(SpendingPolicyError);
  });
});

describe("bridge submit-side calldata encoders", () => {
  const bridgeId = `0x${"11".repeat(32)}`;
  const depositId = `0x${"22".repeat(32)}`;

  it("encodes claim(bytes32,bytes32,address) with the frozen selector", () => {
    const recipient = `0x${"33".repeat(20)}`;
    const data = encodeBridgeClaimCalldata(bridgeId, depositId, recipient);
    expect(data.slice(0, 10)).toBe("0xdeb52096");
    // selector(4) + 3 words(96) = 100 bytes = 200 hex + "0x"
    expect(data.length).toBe(2 + 200);
    // recipient left-padded into the low 20 bytes of the 3rd word
    expect(data.endsWith(`000000000000000000000000${"33".repeat(20)}`)).toBe(true);
  });

  it("encodes challenge(bytes32,bytes32,bytes) with offset+length-prefixed tail", () => {
    const data = encodeBridgeChallengeCalldata(bridgeId, depositId, "0xabcd");
    expect(data.slice(0, 10)).toBe("0x27222f82");
    const body = data.slice(10);
    // bridgeId, depositId, offset=0x60, len=2, padded body (32 bytes)
    expect(body.length).toBe((32 * 5) * 2);
    expect(body.slice(64 * 2, 64 * 2 + 64)).toBe(`${"00".repeat(31)}60`);
    expect(body.slice(64 * 3, 64 * 3 + 64)).toBe(`${"00".repeat(31)}02`);
    expect(body.slice(64 * 4, 64 * 4 + 64)).toBe(`abcd${"00".repeat(30)}`);
  });

  it("encodes submitProof(bytes32,bytes32,bytes,bytes,bytes) offsets", () => {
    const data = encodeSubmitBridgeProofCalldata(bridgeId, depositId, "0xaa", "0xbbbb", "0x");
    expect(data.slice(0, 10)).toBe("0x8279765a");
    const body = data.slice(10);
    // 5 head words; off0 = 0xA0 (160)
    expect(body.slice(64 * 2, 64 * 2 + 64)).toBe(`${"00".repeat(31)}a0`);
    // off1 = 0xA0 + 32(len) + 32(padded 1-byte body) = 0xE0 (224)
    expect(body.slice(64 * 3, 64 * 3 + 64)).toBe(`${"00".repeat(31)}e0`);
    // off2 = 0xE0 + 32 + 32 = 0x120 (288)
    expect(body.slice(64 * 4, 64 * 4 + 64)).toBe(`${"00".repeat(30)}0120`);
  });
});

describe("cluster APR + APY helpers", () => {
  const aprReply = {
    clusterId: 7,
    blocks: { from: 8200, to: 9400, window: 1200 },
    rewardIndexFromHex: "0x0",
    rewardIndexToHex: "0x4f2",
    deltaIndexHex: "0x4f2",
    rewardIndexScale: "1000000000000000000",
    totalBps: 5000,
    blocksPerYear: 10519200,
    stakePerBpsLythoshi: 100000000,
    aprBps: 820,
  };

  it("wraps lyth_clusterApr and normalizes numeric fields", async () => {
    const { fetch, calls } = mockFetch(aprReply);
    const client = new RpcClient("http://x", { fetch });
    const apr = await client.lythClusterApr(7);
    expect(calls[0].method).toBe("lyth_clusterApr");
    expect(calls[0].params).toEqual([7]);
    expect(apr.clusterId).toBe(7);
    expect(apr.blocks.from).toBe(8200n);
    expect(apr.blocks.window).toBe(1200n);
    expect(apr.blocksPerYear).toBe(10519200n);
    expect(apr.aprBps).toBe(820n);
    expect(apr.rewardIndexScale).toBe("1000000000000000000");
    expect(clusterApyPercent(apr)).toBeCloseTo(8.2, 6);
  });

  it("passes an explicit window through", async () => {
    const { fetch, calls } = mockFetch(aprReply);
    const client = new RpcClient("http://x", { fetch });
    await client.lythClusterApr(7, 2400);
    expect(calls[0].params).toEqual([7, 2400]);
  });
});

describe("name-registry reads", () => {
  it("resolves a name forward and reports availability", async () => {
    const taken = mockFetch({
      name: "alice",
      address: "mono1qqqsyqcyq5rqwzqfpg9scrgwpugpzysnzs23v9ccrydpk8qarc0jq",
      category: "human",
      registeredAtBlock: 42,
      block: "latest",
    });
    const client = new RpcClient("http://x", { fetch: taken.fetch });
    const resolved = await client.lythResolveName("Alice");
    expect(taken.calls[0].method).toBe("lyth_resolveName");
    expect(taken.calls[0].params).toEqual(["Alice", "latest"]);
    expect(resolved.category).toBe("human");
    await expect(client.lythIsNameAvailable("Alice")).resolves.toBe(false);

    const free = mockFetch({
      name: "bob",
      address: null,
      category: "human",
      registeredAtBlock: null,
      block: "latest",
    });
    const freeClient = new RpcClient("http://x", { fetch: free.fetch });
    await expect(freeClient.lythIsNameAvailable("bob")).resolves.toBe(true);
  });

  it("wraps lyth_getClusterName", async () => {
    const { fetch, calls } = mockFetch({ clusterId: 7, name: "alpha", block: "latest" });
    const client = new RpcClient("http://x", { fetch });
    const result = await client.lythGetClusterName(7);
    expect(calls[0].method).toBe("lyth_getClusterName");
    expect(calls[0].params).toEqual([7, "latest"]);
    expect(result.name).toBe("alpha");
  });
});

describe("supply, burn, swap-intent, confirmations", () => {
  it("wraps lyth_circulatingSupply + lyth_totalBurned as lossless strings", async () => {
    const supply = mockFetch({
      circulatingSupplyLythoshi: "9999999999999995",
      initialSupplyLythoshi: "10000000000000000",
      totalBurnedLythoshi: "5",
    });
    const client = new RpcClient("http://x", { fetch: supply.fetch });
    const s = await client.lythCirculatingSupply();
    expect(supply.calls[0].method).toBe("lyth_circulatingSupply");
    expect(s.circulatingSupplyLythoshi).toBe("9999999999999995");

    const burned = mockFetch({ totalBurnedLythoshi: "5" });
    const burnedClient = new RpcClient("http://x", { fetch: burned.fetch });
    await expect(burnedClient.lythTotalBurned()).resolves.toEqual({ totalBurnedLythoshi: "5" });
  });

  it("wraps lyth_swapIntentStatus", async () => {
    const { fetch, calls } = mockFetch({
      schemaVersion: 1,
      intentId: 9,
      status: "pending",
      found: true,
      currentEpoch: 3,
      latestHeight: 100,
    });
    const client = new RpcClient("http://x", { fetch });
    const status = await client.lythSwapIntentStatus(9);
    expect(calls[0].method).toBe("lyth_swapIntentStatus");
    expect(calls[0].params).toEqual([9]);
    expect(status.status).toBe("pending");
    // bigint/decimal ids are normalized to 0x-hex to avoid JS precision loss
    // (the chain itself accepts number, 0x-hex, OR decimal string)
    await client.lythSwapIntentStatus(9n);
    expect(calls[1].params).toEqual(["0x9"]);
    await client.lythSwapIntentStatus("42");
    expect(calls[2].params).toEqual(["0x2a"]);
  });

  it("derives confirmation depth from lyth_txStatus", async () => {
    const found = mockFetch({
      status: "found",
      txHash: `0x${"ab".repeat(32)}`,
      blockHash: `0x${"cd".repeat(32)}`,
      blockNumber: 90,
      txIndex: 0,
      latestHeight: 100,
    });
    const client = new RpcClient("http://x", { fetch: found.fetch });
    await expect(client.lythTxConfirmations(`0x${"ab".repeat(32)}`)).resolves.toEqual({
      status: "found",
      confirmations: 11,
      blockNumber: 90,
      latestHeight: 100,
    });

    const missing = mockFetch({
      status: "not_found",
      txHash: `0x${"ab".repeat(32)}`,
      latestHeight: 100,
      indexerEnabled: true,
      providerKind: "indexer",
    });
    const missingClient = new RpcClient("http://x", { fetch: missing.fetch });
    await expect(missingClient.lythTxConfirmations(`0x${"ab".repeat(32)}`)).resolves.toMatchObject({
      status: "not_found",
      confirmations: null,
    });
  });
});

describe("CLOB pure helpers", () => {
  it("computes quote-notional liquidity from an order book", () => {
    const book: ClobOrderBookResponse = {
      schemaVersion: 1,
      marketId: `0x${"00".repeat(32)}`,
      bids: [
        { price: "10", size: "2" },
        { price: "9", size: "1" },
      ],
      asks: [{ price: "11", size: "3" }],
    };
    // bids: 10*2 + 9*1 = 29 ; asks: 11*3 = 33
    expect(computeQuoteLiquidity(book)).toEqual({
      bidQuote: "29",
      askQuote: "33",
      totalQuote: "62",
    });
  });

  it("ranks markets by total base volume descending", () => {
    const market = (id: string, vol: string): ClobMarketSummary => ({
      marketId: id,
      tradeCount: 1,
      totalVolumeBase: vol,
      lastPrice: "1",
      lastBlockHeight: 1,
    });
    const ranked = rankMarketsByVolume([
      market("a", "100"),
      market("b", "300"),
      market("c", "200"),
    ]);
    expect(ranked.map((m) => [m.marketId, m.volumeRank])).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 3],
    ]);
  });
});

describe("name registration (pricing + encoders)", () => {
  it("pins the frozen selectors", () => {
    expect(NAME_REGISTRY_SELECTORS.register).toBe("0x1e59c529");
    expect(NAME_REGISTRY_SELECTORS.proposeTransfer).toBe("0x3aa6c68b");
    expect(NAME_REGISTRY_SELECTORS.acceptTransfer).toBe("0x6d136f62");
  });

  it("parses category + primary-label length structurally", () => {
    expect(parseNameCategory("alice.mono")).toEqual({ category: "human", primaryLabelLen: 5 });
    expect(parseNameCategory("x.cluster.mono")).toEqual({ category: "cluster", primaryLabelLen: 1 });
    expect(parseNameCategory("y.contract.mono")).toEqual({ category: "contract", primaryLabelLen: 1 });
    expect(parseNameCategory("z.system.mono")).toEqual({ category: "system", primaryLabelLen: 1 });
    expect(parseNameCategory("bot.agent.alice.mono")).toEqual({ category: "agent", primaryLabelLen: 3 });
  });

  it("rejects malformed / reserved names", () => {
    expect(() => parseNameCategory("agent.mono")).toThrow(NameRegistryError); // structural reserve
    expect(() => parseNameCategory("Alice.mono")).toThrow(NameRegistryError); // uppercase
    expect(() => parseNameCategory("a..b.mono")).toThrow(NameRegistryError); // empty label
    expect(() => parseNameCategory("foo.bar")).toThrow(NameRegistryError); // not .mono
    expect(() => parseNameCategory("ab.foo.mono")).toThrow(NameRegistryError); // unknown anchor
    expect(() => parseNameCategory("-bad.mono")).toThrow(NameRegistryError); // leading hyphen
  });

  it("computes the U-curve cost (base × modX10 × feeUnit / 10)", () => {
    // human(5) × len5(modX10=30) × 100 / 10 = 1500
    expect(nameRegistrationCost("human", 5, 100n)).toBe(1500n);
    // cluster(20) × len1(modX10=1000) × 100 / 10 = 200000
    expect(nameRegistrationCost("cluster", 1, 100n)).toBe(200000n);
    expect(nameLengthModifierX10(1)).toBe(1000);
    expect(nameLengthModifierX10(6)).toBe(10);
    expect(nameLengthModifierX10(63)).toBe(500);
    expect(nameLengthModifierX10(64)).toBeNull();
    expect(() => nameRegistrationCost("system", 1, 100n)).toThrow(NameRegistryError);
  });

  it("encodes register(string,address) calldata", () => {
    const data = encodeNameRegisterCall("alice.mono"); // owner defaults to zero
    expect(data.slice(0, 10)).toBe("0x1e59c529");
    const body = data.slice(10);
    // word0 = string offset 0x40
    expect(body.slice(0, 64)).toBe(`${"00".repeat(31)}40`);
    // word1 = owner address word (zero)
    expect(body.slice(64, 128)).toBe("00".repeat(32));
    // word2 = length 10 (0x0a)
    expect(body.slice(128, 192)).toBe(`${"00".repeat(31)}0a`);
    // tail = "alice.mono" right-padded to 32 bytes
    expect(body.slice(192, 256)).toBe(`616c6963652e6d6f6e6f${"00".repeat(22)}`);
  });

  it("encodes acceptTransfer(string) with a 0x20 single-head offset", () => {
    const data = encodeNameAcceptTransferCall("alice.mono");
    expect(data.slice(0, 10)).toBe("0x6d136f62");
    const body = data.slice(10);
    expect(body.slice(0, 64)).toBe(`${"00".repeat(31)}20`);
    expect(body.slice(64, 128)).toBe(`${"00".repeat(31)}0a`);
    expect(body.slice(128, 192)).toBe(`616c6963652e6d6f6e6f${"00".repeat(22)}`);
  });

  it("quotes a live registration via eth_feeHistory base fee", async () => {
    const { fetch, calls } = mockFetch({ baseFeePerGas: ["0x64"], oldestBlock: "0x1", gasUsedRatio: [0] });
    const client = new RpcClient("http://x", { fetch });
    const quote = await client.quoteNameRegistration("alice.mono");
    expect(calls[0].method).toBe("eth_feeHistory");
    expect(quote.category).toBe("human");
    expect(quote.feeUnitLythoshi).toBe(100n); // 0x64
    expect(quote.costLythoshi).toBe(1500n);
  });
});

describe("token-balance + metadata join", () => {
  it("joins balances to per-token MRC metadata", async () => {
    const tokenId = `0x${"ab".repeat(32)}`;
    const { fetch, calls } = mockFetchSequence([
      [
        {
          tokenId,
          balance: "100",
          updatedAtBlock: 5,
          mrc: { standard: "mrc20", assetId: tokenId, tokenId: null },
        },
      ],
      {
        schemaVersion: 1,
        assetId: tokenId,
        tokenId: null,
        metadata: {
          standard: "mrc20",
          assetId: tokenId,
          tokenId: null,
          name: "Token",
          symbol: "TOK",
          decimals: 8,
          uri: null,
          updatedAtBlock: 5,
        },
      },
    ]);
    const client = new RpcClient("http://x", { fetch });
    const address = addressToTypedBech32("user", "0x1111111111111111111111111111111111111111");
    const rows = await client.lythGetTokenBalancesWithMetadata(address);
    expect(calls[0].method).toBe("lyth_getTokenBalances");
    expect(calls[1].method).toBe("lyth_mrcMetadata");
    expect(rows).toHaveLength(1);
    expect(rows[0].balance).toBe("100");
    expect(rows[0].metadata?.symbol).toBe("TOK");
    expect(rows[0].metadata?.decimals).toBe(8);
  });
});
