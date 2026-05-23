import { describe, expect, it } from "vitest";
import {
  ApiClient,
  SdkError,
  apiEndpointFromRpcEndpoint,
  assessBridgeRoute,
} from "../src/index.js";
import type {
  AddressProfileResponse,
  BridgeRouteDisclosure,
  NativeDecodedEvent,
} from "../src/index.js";

interface AgentEscrowCreatedEvent extends NativeDecodedEvent {
  family: "agent";
  event_name: "agent.escrow.created";
  amount_lythoshi: string;
  agent_address: string;
  contract_address: string;
}

interface NativeMarketSaleEvent extends NativeDecodedEvent {
  family: "market";
  event_name: "market.nft.sale_settled";
  listing_id: string;
  price: string;
}

function bridgeRoute(routeId: string): BridgeRouteDisclosure {
  return {
    routeId,
    bridge: "CCIP",
    asset: "USDC",
    sourceChain: "Ethereum",
    destinationChain: "Mono",
    verifier: {
      model: "DON",
      participantCount: 7,
      threshold: 5,
    },
    drainCapAtomic: "100000000",
    finalityBlocks: 12,
    cooldownSeconds: 3_600,
    adminControl: "consensusOnly",
    circuitBreaker: "armed",
    insuranceAtomic: "500000000",
  };
}

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
        executionUnitsUsed: 42,
        executionUnitLimit: 30_000_000,
        basePricePerCycleLythoshi: "1000000000",
      },
      transactionCount: 1,
      transactionHashes: [`0x${"dd".repeat(32)}`],
      source: { chainProvider: "LiveChainProvider" },
    });
    const { fetch, calls } = mockGet(reply);
    const client = new ApiClient("https://rpc.example", { fetch });

    const block = await client.block("latest");

    expect(block.data.block.blockHash).toBe(blockHash);
    expect(block.data.block.executionUnitsUsed).toBe(42);
    expect(block.data.block.basePricePerCycleLythoshi).toBe("1000000000");
    expect("gasUsed" in block.data.block).toBe(false);
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

  it("reads address profile token balances with optional MRC identity", async () => {
    const address = "0x1111111111111111111111111111111111111111";
    const assetId = `0x${"bb".repeat(32)}`;
    const mrcTokenId = `0x${"cc".repeat(32)}`;
    const profileData: AddressProfileResponse = {
      schemaVersion: 1,
      address,
      account: {
        nativeBalance: "100000000",
        nonce: 1,
        codeHash: `0x${"00".repeat(32)}`,
        isContract: false,
      },
      label: null,
      activity: { kind: "found", retention: null, latest: null },
      tokenBalances: [
        {
          tokenId: `0x${"aa".repeat(32)}`,
          balance: "1000",
          updatedAtBlock: 88,
          mrc: {
            standard: "mrc721",
            assetId,
            tokenId: mrcTokenId,
          },
        },
        {
          tokenId: `0x${"dd".repeat(32)}`,
          balance: "25",
          updatedAtBlock: 89,
          mrc: null,
        },
        {
          tokenId: `0x${"ee".repeat(32)}`,
          balance: "0",
          updatedAtBlock: 90,
        },
      ],
    };
    const { fetch, calls } = mockGet(apiEnvelope(profileData));
    const client = new ApiClient("https://rpc.example", { fetch });

    const profile = await client.addressProfile(address);

    expect(profile.data.tokenBalances[0].mrc?.standard).toBe("mrc721");
    expect(profile.data.tokenBalances[0].mrc?.assetId).toBe(assetId);
    expect(profile.data.tokenBalances[0].mrc?.tokenId).toBe(mrcTokenId);
    expect(profile.data.tokenBalances[1].mrc).toBeNull();
    expect(profile.data.tokenBalances[2].mrc).toBeUndefined();
    expect(profile.data.bridgeRouteDisclosures).toBeUndefined();
    expect(calls[0]).toEqual({
      url: `https://rpc.example/api/v1/addresses/${address}/profile`,
      method: "GET",
    });
  });

  it("reads address profile bridge route disclosures", async () => {
    const address = "0x1111111111111111111111111111111111111111";
    const profileData: AddressProfileResponse = {
      schemaVersion: 1,
      address,
      account: {
        nativeBalance: "100000000",
        nonce: 1,
        codeHash: `0x${"00".repeat(32)}`,
        isContract: false,
      },
      label: null,
      activity: { kind: "found", retention: null, latest: null },
      tokenBalances: [],
      bridgeRouteDisclosures: [bridgeRoute("ccip-usdc-eth")],
    };
    const { fetch } = mockGet(apiEnvelope(profileData));
    const client = new ApiClient("https://rpc.example", { fetch });

    const profile = await client.addressProfile(address);

    expect(profile.data.bridgeRouteDisclosures).toHaveLength(1);
    expect(assessBridgeRoute(profile.data.bridgeRouteDisclosures![0]).accepted).toBe(true);
  });

  it("calls bridge routes readiness with an encoded request query", async () => {
    const request = {
      intent: {
        asset: "USDC",
        amountAtomic: "1000000",
        sourceChain: "Ethereum",
        destinationChain: "Mono",
        recipient: "mono1recipient",
      },
      routeDisclosures: [bridgeRoute("healthy")],
    };
    const { fetch, calls } = mockGet(
      apiEnvelope({
        selection: {
          selected: null,
          candidates: [],
          blockedReasons: [],
        },
        routeSelectionReady: false,
        quoteReady: false,
        submitReady: false,
        blockedReasons: [],
        warnings: [],
        routes: request.routeDisclosures,
        bridgeRouteDisclosures: request.routeDisclosures,
        source: {
          address: null,
          routeCount: 1,
          globalRouteIndexAvailable: false,
          routeDisclosureSource: "request.routeDisclosures_or_indexer.tokenBalances",
        },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const response = await client.bridgeRoutes(request);

    expect(response.data.quoteReady).toBe(false);
    expect(response.data.submitReady).toBe(false);
    expect(response.data.routes?.[0]?.routeId).toBe("healthy");
    expect(response.data.bridgeRouteDisclosures?.[0]?.routeId).toBe("healthy");
    expect(response.data.source?.routeCount).toBe(1);
    expect(calls[0].method).toBe("GET");
    expect(calls[0].url).toContain("https://rpc.example/api/v1/bridge/routes?request=");
    expect(calls[0].url).toContain("%22routeDisclosures%22%3A%5B");
  });

  it("decodes discovery-only bridge route catalogues from the API", async () => {
    const request = {
      routeDisclosures: [bridgeRoute("healthy")],
    };
    const { fetch, calls } = mockGet(
      apiEnvelope({
        selection: {
          selected: null,
          candidates: [],
          blockedReasons: ["bridge route selection requires transfer intent"],
        },
        routeSelectionReady: false,
        quoteReady: false,
        submitReady: false,
        blockedReasons: ["bridge route selection requires transfer intent"],
        warnings: [],
        routes: request.routeDisclosures,
        bridgeRouteDisclosures: request.routeDisclosures,
        source: {
          address: null,
          routeCount: 1,
          globalRouteIndexAvailable: false,
          routeDisclosureSource: "request.routeDisclosures_or_indexer.tokenBalances",
        },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const response = await client.bridgeRoutes(request);

    expect(response.data.routeSelectionReady).toBe(false);
    expect(response.data.quoteReady).toBe(false);
    expect(response.data.submitReady).toBe(false);
    expect(response.data.routes?.[0]?.routeId).toBe("healthy");
    expect(response.data.bridgeRouteDisclosures?.[0]?.routeId).toBe("healthy");
    expect(response.data.source?.routeCount).toBe(1);
    expect(calls[0].url).toContain("https://rpc.example/api/v1/bridge/routes?request=");
    expect(calls[0].url).toContain("%22routeDisclosures%22%3A%5B");
    expect(calls[0].url).not.toContain("%22intent%22");
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
        noEvmProof: null,
        counters: { cycles: 44, syscallUnits: 3, stateIoUnits: 2 },
        fee: {
          total_lythoshi: "440000000000",
          total_lyth: "4,400",
          cycles_used: 44,
          base_price_per_cycle_lythoshi: "10000000000",
          state_io_units: 2,
          state_io_price_per_unit_lythoshi: "0",
          priority_tip_lythoshi: "0",
        },
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
    expect(receipt.data.noEvmProof).toBeNull();
    expect(receipt.data.counters.stateIoUnits).toBe(2);
    expect(receipt.data.fee.total_lythoshi).toBe("440000000000");
    expect(receipt.data.fee.total_lyth).toBe("4,400");
    expect(receipt.data.fee.cycles_used).toBe(44);
    expect(receipt.data.fee.state_io_units).toBe(2);
    expect(receipt.data.eventCount).toBe(1);
    expect(receipt.data.events[0].decoded).toEqual(decoded);
    expect(receipt.data.events[0].decodedJson).toBe(JSON.stringify(decoded));
    expect(calls[0]).toEqual({
      url: `https://rpc.example/api/v1/transactions/${txHash}/native-receipt`,
      method: "GET",
    });
  });

  it("consumes typed native events from /api/v1 native receipt envelopes", async () => {
    const txHash = `0x${"22".repeat(32)}`;
    const eventTopic = `0x${"11".repeat(32)}`;
    const decoded: AgentEscrowCreatedEvent = {
      block_height: 100,
      tx_index: 0,
      sequence: 0,
      family: "agent",
      event_name: "agent.escrow.created",
      payload_hash: `0x${"44".repeat(32)}`,
      amount_lythoshi: "440000000000",
      agent_address: "mono1agentconsumer",
      contract_address: "monoc1escrowcontract",
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
        fee: {
          total_lythoshi: decoded.amount_lythoshi,
          total_lyth: "4,400",
          cycles_used: 44,
          base_price_per_cycle_lythoshi: "10000000000",
          state_io_units: 2,
          state_io_price_per_unit_lythoshi: "0",
          priority_tip_lythoshi: "0",
        },
        reverted: false,
        nativeDeltaCount: 0,
        eventCount: 1,
        events: [
          {
            blockHeight: 100,
            txIndex: 0,
            logIndex: 0,
            address: decoded.contract_address,
            eventTopic,
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

    const events = await client.transactionNativeReceiptEvents<AgentEscrowCreatedEvent>(txHash, {
      family: "agent",
      eventName: "agent.escrow.created",
    });

    expect(events.data).toHaveLength(1);
    expect(events.data[0].address).toBe("monoc1escrowcontract");
    expect(events.data[0].decoded.amount_lythoshi).toBe("440000000000");
    expect(events.data[0].decoded.agent_address.startsWith("mono1")).toBe(true);
    expect(events.data[0].decoded.contract_address.startsWith("monoc1")).toBe(true);
    expect(calls).toEqual([
      {
        url: `https://rpc.example/api/v1/transactions/${txHash}/native-receipt`,
        method: "GET",
      },
    ]);
  });

  it("queries /api/v1/native-events with filters and decodes typed rows", async () => {
    const eventTopic = `0x${"11".repeat(32)}`;
    const primaryId = `0x${"77".repeat(32)}`;
    const account = "mono1agentconsumer";
    const counterparty = "mono1agentcounterparty";
    const decoded: AgentEscrowCreatedEvent = {
      block_height: 100,
      tx_index: 0,
      sequence: 0,
      family: "agent",
      event_name: "agent.escrow.created",
      payload_hash: `0x${"44".repeat(32)}`,
      amount_lythoshi: "440000000000",
      agent_address: account,
      contract_address: "monos1nativeeventemitter",
    };
    const { fetch, calls } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        fromBlock: 100,
        toBlock: 105,
        limit: 10,
        filters: {
          txIndex: 0,
          address: decoded.contract_address,
          eventTopic,
          family: "agent",
          eventName: "agent.escrow.created",
          primaryId,
          account,
          counterparty,
        },
        events: [
          {
            blockHeight: 100,
            txIndex: 0,
            logIndex: 0,
            address: decoded.contract_address,
            eventTopic,
            decoded: null,
            decodedJson: JSON.stringify(decoded),
          },
        ],
        source: {
          indexerProvider: "native_events",
        },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const response = await client.nativeEventsTyped<AgentEscrowCreatedEvent>({
      fromBlock: 100,
      toBlock: 105,
      limit: 10,
      txIndex: 0,
      logIndex: 0,
      address: decoded.contract_address,
      eventTopic,
      family: "agent",
      eventName: "agent.escrow.created",
      primaryId,
      account,
      counterparty,
    });

    expect(response.data.source.indexerProvider).toBe("native_events");
    expect(response.data.events[0].decoded.amount_lythoshi).toBe("440000000000");
    expect(response.data.events[0].decoded.agent_address).toBe(account);
    expect(calls).toEqual([
      {
        url: `https://rpc.example/api/v1/native-events?fromBlock=100&toBlock=105&limit=10&txIndex=0&logIndex=0&address=monos1nativeeventemitter&eventTopic=${eventTopic}&family=agent&eventName=agent.escrow.created&primaryId=${primaryId}&account=${account}&counterparty=${counterparty}`,
        method: "GET",
      },
    ]);
  });

  it("wraps native market event API query params", async () => {
    const eventTopic = `0x${"11".repeat(32)}`;
    const listingId = `0x${"bb".repeat(32)}`;
    const decoded: NativeMarketSaleEvent = {
      block_height: 110,
      tx_index: 0,
      sequence: 0,
      family: "market",
      event_name: "market.nft.sale_settled",
      payload_hash: `0x${"44".repeat(32)}`,
      listing_id: listingId,
      price: "900",
    };
    const { fetch, calls } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        fromBlock: 110,
        toBlock: 120,
        limit: 5,
        filters: {
          family: "market",
          eventName: "market.nft.sale_settled",
        },
        events: [
          {
            blockHeight: 110,
            txIndex: 0,
            logIndex: 0,
            address: "monox1market",
            eventTopic,
            decoded: null,
            decodedJson: JSON.stringify(decoded),
          },
        ],
        source: {
          indexerProvider: "native_events",
        },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const response = await client.nativeMarketEventsTyped<NativeMarketSaleEvent>({
      fromBlock: 110,
      toBlock: 120,
      limit: 5,
      family: "agent",
      eventName: "market.nft.sale_settled",
    });

    expect(response.data.filters.family).toBe("market");
    expect(response.data.events[0].decoded.family).toBe("market");
    expect(response.data.events[0].decoded.listing_id).toBe(listingId);
    expect(calls).toEqual([
      {
        url: "https://rpc.example/api/v1/native-events?fromBlock=110&toBlock=120&limit=5&family=market&eventName=market.nft.sale_settled",
        method: "GET",
      },
    ]);
  });

  it("wraps search, transaction-feed, address aggregate, stats, and market routes", async () => {
    const { fetch, calls } = mockGet(apiEnvelope({ schemaVersion: 1 }));
    const client = new ApiClient("https://rpc.example", { fetch });
    const marketId = `0x${"55".repeat(32)}`;
    const assetId = `0x${"bb".repeat(32)}`;
    const mrcTokenId = `0x${"cc".repeat(32)}`;

    await client.search("0xabc", 5);
    await client.stats();
    await client.transactions(25, "0x1234");
    await client.addressProfile("0x1111111111111111111111111111111111111111");
    await client.addressFlow("0x1111111111111111111111111111111111111111", 75);
    await client.addressPendingRewards("mono1wallet", 99);
    await client.assetMrcMetadata(assetId, mrcTokenId);
    await client.assetMrcMetadata(assetId);
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
      "https://rpc.example/api/v1/addresses/mono1wallet/pending-rewards?block=0x63",
      `https://rpc.example/api/v1/assets/${assetId}/metadata?mrcTokenId=${mrcTokenId}`,
      `https://rpc.example/api/v1/assets/${assetId}/metadata`,
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

  it("wraps address redemption queue API query params", async () => {
    const wallet = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
    const { fetch, calls } = mockGet(
      apiEnvelope({
        wallet,
        tickets: [
          {
            index: 0,
            cluster: 7,
            weightBps: 2500,
            createdHeight: 20,
            maturityHeight: 120,
            mature: false,
          },
        ],
        count: 1,
        returned: 1,
        block: 99,
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const queue = await client.addressRedemptionQueue(wallet, 99);

    expect(queue.data.tickets[0].maturityHeight).toBe(120);
    expect(calls[0]).toEqual({
      url: `https://rpc.example/api/v1/addresses/${wallet}/redemption-queue?block=0x63`,
      method: "GET",
    });
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
