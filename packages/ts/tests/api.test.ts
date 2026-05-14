import { describe, expect, it } from "vitest";
import { ApiClient, SdkError, apiEndpointFromRpcEndpoint } from "../src/index.js";

interface CapturedGet {
  url: string;
  method: string | undefined;
}

function mockGet(reply: unknown, status = 200): {
  fetch: typeof fetch;
  calls: CapturedGet[];
} {
  const calls: CapturedGet[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({
      url: typeof input === "string" ? input : input.toString(),
      method: init?.method,
    });
    return new Response(JSON.stringify(reply), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchImpl, calls };
}

function apiEnvelope<T>(data: T) {
  return {
    schemaVersion: 1,
    chainId: 69420,
    genesisHash: `0x${"00".repeat(32)}`,
    latest: {
      available: true,
      height: 100,
      blockHash: `0x${"11".repeat(32)}`,
      stateRoot: `0x${"22".repeat(32)}`,
      timestamp: 1_700_000_000,
    },
    data,
  };
}

describe("ApiClient endpoint derivation", () => {
  it("derives /api/v1 from root and /rpc JSON-RPC endpoints", () => {
    expect(apiEndpointFromRpcEndpoint("https://rpc.testnet.monolythium.com")).toBe(
      "https://rpc.testnet.monolythium.com/api/v1",
    );
    expect(apiEndpointFromRpcEndpoint("https://rpc.testnet.monolythium.com/rpc")).toBe(
      "https://rpc.testnet.monolythium.com/api/v1",
    );
    expect(apiEndpointFromRpcEndpoint("/rpc")).toBe("/api/v1");
  });

  it("preserves explicit api bases", () => {
    expect(apiEndpointFromRpcEndpoint("https://x.example/api/v1/")).toBe(
      "https://x.example/api/v1",
    );
  });
});

describe("ApiClient", () => {
  it("reads block envelopes from /api/v1/blocks/{block}", async () => {
    const blockHash = `0x${"aa".repeat(32)}`;
    const reply = apiEnvelope({
      block: {
        height: 100,
        blockHash,
        parentHash: `0x${"bb".repeat(32)}`,
        stateRoot: `0x${"cc".repeat(32)}`,
        timestamp: 1_700_000_000,
        gasUsed: 42,
        gasLimit: 30_000_000,
        baseFeePerGas: "1000000000",
      },
      transactionCount: 1,
      transactionHashes: [`0x${"dd".repeat(32)}`],
      source: { chainProvider: "LiveChainProvider" },
    });
    const { fetch, calls } = mockGet(reply);
    const client = new ApiClient("https://rpc.example", { fetch });

    const block = await client.block("latest");

    expect(block.data.block.blockHash).toBe(blockHash);
    expect(block.data.transactionCount).toBe(1);
    expect(calls).toEqual([
      {
        url: "https://rpc.example/api/v1/blocks/latest",
        method: "GET",
      },
    ]);
  });

  it("forwards paging and cursor query parameters", async () => {
    const { fetch, calls } = mockGet(
      apiEnvelope({
        address: "0x1111111111111111111111111111111111111111",
        limit: 75,
        entries: [],
        indexer: { enabled: true, currentHeight: 100, latestHeight: 101, schemaVersion: 1 },
      }),
    );
    const client = new ApiClient("/rpc", { fetch });

    await client.addressActivity("0x1111111111111111111111111111111111111111", 75, "0x1234");

    expect(calls[0]).toEqual({
      url: "/api/v1/addresses/0x1111111111111111111111111111111111111111/activity?limit=75&cursor=0x1234",
      method: "GET",
    });
  });

  it("wraps search, transaction-feed, address aggregate, stats, and market routes", async () => {
    const { fetch, calls } = mockGet(apiEnvelope({ schemaVersion: 1 }));
    const client = new ApiClient("https://rpc.example", { fetch });
    const marketId = `0x${"55".repeat(32)}`;

    await client.search("0xabc", 5);
    await client.stats();
    await client.transactions(25, "0x1234");
    await client.addressProfile("0x1111111111111111111111111111111111111111");
    await client.addressFlow("0x1111111111111111111111111111111111111111", 75);
    await client.markets(10);
    await client.market(marketId);
    await client.marketTrades(marketId, 15, "0xabcd");
    await client.marketOhlc(marketId, 90n, 100n, 10n);
    await client.marketOrderBook(marketId, 12);

    expect(calls.map((c) => c.url)).toEqual([
      "https://rpc.example/api/v1/search?q=0xabc&limit=5",
      "https://rpc.example/api/v1/stats",
      "https://rpc.example/api/v1/transactions?limit=25&cursor=0x1234",
      "https://rpc.example/api/v1/addresses/0x1111111111111111111111111111111111111111/profile",
      "https://rpc.example/api/v1/addresses/0x1111111111111111111111111111111111111111/flow?limit=75",
      "https://rpc.example/api/v1/markets?limit=10",
      `https://rpc.example/api/v1/markets/${marketId}`,
      `https://rpc.example/api/v1/markets/${marketId}/trades?limit=15&cursor=0xabcd`,
      `https://rpc.example/api/v1/markets/${marketId}/ohlc?fromBlock=90&toBlock=100&bucketBlocks=10`,
      `https://rpc.example/api/v1/markets/${marketId}/orderbook?levels=12`,
    ]);
    expect(calls.every((c) => c.method === "GET")).toBe(true);
  });

  it("maps API error envelopes to SdkError.rpc", async () => {
    const { fetch } = mockGet(
      {
        schemaVersion: 1,
        error: { code: -32_004, message: "block latest" },
      },
      404,
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    await expect(client.block("latest")).rejects.toMatchObject({
      name: "SdkError",
      kind: "rpc",
      code: -32_004,
    } satisfies Partial<SdkError>);
  });

  it("returns health bodies while the node reports syncing with HTTP 503", async () => {
    const { fetch } = mockGet(
      {
        schemaVersion: 1,
        status: "syncing",
        chainId: 69420,
        latest: { available: false, height: 0, blockHash: null },
        api: { enabled: true, version: "v1" },
      },
      503,
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    await expect(client.health()).resolves.toMatchObject({ status: "syncing" });
  });
});
