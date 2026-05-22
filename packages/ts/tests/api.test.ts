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

  it("reads native receipt envelopes from /api/v1/transactions/{hash}/native-receipt", async () => {
    const txHash = `0x${"22".repeat(32)}`;
    const decoded = {
      block_height: 100,
      tx_index: 0,
      sequence: 0,
      family: "agent",
      event_name: "agent.escrow.created",
      payload_hash: `0x${"44".repeat(32)}`,
    };
    const { fetch, calls } = mockGet(
      apiEnvelope({
        txHash,
        blockHash: `0x${"33".repeat(32)}`,
        blockHeight: 100,
        txIndex: 0,
        schema: "riscv.receipt.v1",
        artifactHash: `0x${"aa".repeat(32)}`,
        counters: { cycles: 44, syscallUnits: 3, stateIoUnits: 2 },
        reverted: false,
        nativeDeltaCount: 0,
        eventCount: 1,
        events: [
          {
            blockHeight: 100,
            txIndex: 0,
            logIndex: 0,
            address: "monoc1nativeeventemitter",
            eventTopic: `0x${"11".repeat(32)}`,
            decoded,
            decodedJson: JSON.stringify(decoded),
          },
        ],
        source: {
          chainProvider: "mock_chain",
          indexerProvider: "native_events",
          metadataLogIndex: 0xffff_ffff,
        },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const receipt = await client.transactionNativeReceipt(txHash);

    expect(receipt.data.artifactHash).toBe(`0x${"aa".repeat(32)}`);
    expect(receipt.data.counters.stateIoUnits).toBe(2);
    expect(receipt.data.eventCount).toBe(1);
    expect(receipt.data.events[0].decoded).toEqual(decoded);
    expect(receipt.data.events[0].decodedJson).toBe(JSON.stringify(decoded));
    expect(calls[0]).toEqual({
      url: `https://rpc.example/api/v1/transactions/${txHash}/native-receipt`,
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
    await client.serviceProbe(`0x${"12".repeat(32)}`, "0x100");

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
      `https://rpc.example/api/v1/service-probes/0x${"12".repeat(32)}/0x100`,
    ]);
    expect(calls.every((c) => c.method === "GET")).toBe(true);
  });

  it("reads runtime provenance from /api/v1/provenance", async () => {
    const { fetch, calls } = mockGet(
      apiEnvelope({
        runtime: {
          clientName: "protocore",
          version: "0.99.0",
          gitCommit: "feedface",
          gitDirty: false,
          buildTimestampUtc: 1_747_300_000,
          rustc: "rustc 1.85.0",
          target: "x86_64-unknown-linux-gnu",
          profile: "release",
          features: "mdbx",
          p2pProtocolVersion: 5,
          binarySha256: "b".repeat(64),
          stateMigrations: [],
        },
        upgrade: null,
        source: { chainProvider: "LiveChainProvider" },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const provenance = await client.provenance();

    expect(provenance.data.runtime.clientName).toBe("protocore");
    expect(provenance.data.runtime.p2pProtocolVersion).toBe(5);
    expect(provenance.data.source.chainProvider).toBe("LiveChainProvider");
    expect(calls[0]).toEqual({
      url: "https://rpc.example/api/v1/provenance",
      method: "GET",
    });
  });

  it("types the expanded capabilities envelope", async () => {
    const { fetch } = mockGet({
      schemaVersion: 1,
      chainId: 69420,
      genesisHash: `0x${"00".repeat(32)}`,
      clientVersion: "0.1.0",
      latest: { available: true, height: 100 },
      api: { enabled: true, version: "v1", docs: "/api/v1/docs", openapi: "/api/v1/openapi.json" },
      jsonRpc: { endpoint: "/", webSocket: "/ws", protocolVersion: "2.0", debugEnabled: false },
      streams: {
        transport: "sse",
        index: "/api/v1/streams",
        topicEndpoint: "/api/v1/streams/{topic}",
        keepAliveSeconds: 15,
      },
      indexer: { enabled: true, currentHeight: 100 },
      rateLimit: {
        perIp: { ratePerSec: 20, burst: 40 },
        apiKeysConfigured: true,
        apiKeyOverrideCount: 2,
        budgetIdentity: "api_key_or_resolved_client_ip",
        defaultCostBudgetPerMin: 1000,
        retryAfterHeader: true,
        costWeights: {
          api: { capabilities: 5, streamConnect: 100 },
          jsonRpc: { default: 1, lyth_reportServiceProbe: 10 },
        },
      },
      operatorCapabilities: {
        jsonRpcMethod: "lyth_operatorCapabilities",
        schemaVersion: 2,
        surfaces: {
          public_service_probe_report: {
            status: "available",
            methods: ["lyth_reportServiceProbe", "lyth_getServiceProbe"],
          },
        },
      },
      accessPolicy: {
        trustedProxy: { configured: true, cidrCount: 1 },
        clientCidr: { unrestricted: false, allowCidrCount: 1, denyCidrCount: 2 },
        paidServiceEligibility: { source: "external_probe", selfDeclaration: false },
      },
    });
    const client = new ApiClient("https://rpc.example", { fetch });

    const caps = await client.capabilities();

    expect(caps.streams.topicEndpoint).toBe("/api/v1/streams/{topic}");
    expect(caps.rateLimit.costWeights.jsonRpc.lyth_reportServiceProbe).toBe(10);
    expect(caps.operatorCapabilities.surfaces.public_service_probe_report.status).toBe(
      "available",
    );
    expect(caps.accessPolicy.paidServiceEligibility.selfDeclaration).toBe(false);
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
