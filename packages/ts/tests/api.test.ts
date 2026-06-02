import { describe, expect, it } from "vitest";
import {
  ApiClient,
  NO_EVM_RECEIPT_ROOT_ALGORITHM,
  SdkError,
  apiEndpointFromRpcEndpoint,
  addressToTypedBech32,
  assessBridgeRoute,
} from "../src/index.js";
import type {
  AddressProfileResponse,
  BridgeRouteDisclosure,
  NativeMarketOrderBookDelta,
  NativeMarketOrderBookDeltasResponse,
  NativeMarketOrderBookDeltasResponseFilters,
  NativeDecodedEvent,
  NativeEventProjection,
  NoEvmReceiptProof,
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
  market_surface: "nft";
  market_asset_id: string;
  market_related_asset_id: string;
  listing_id: string;
  price: string;
  quantity: string;
  remaining: string;
  status: "filled";
  nft_standard: "mrc1155";
  royalty_bps: number;
}

function nativeMarketOrderBookDelta(
  extra: Partial<NativeMarketOrderBookDelta> = {},
): NativeMarketOrderBookDelta {
  return {
    marketId: `0x${"aa".repeat(32)}`,
    orderId: `0x${"bb".repeat(32)}`,
    eventName: "market.spot.order_placed",
    action: "upsert",
    side: "bid",
    price: "100",
    quantity: "7",
    remaining: "7",
    status: "open",
    blockHeight: 101,
    txIndex: 0,
    logIndex: 1,
    ...extra,
  };
}

function bridgeRoute(routeId: string): BridgeRouteDisclosure {
  return {
    routeId,
    bridge: "Chainlink CCIP",
    protocol: "chainlink-ccip",
    asset: "USDC",
    feeToken: "LINK",
    sourceChain: "Ethereum",
    destinationChain: "Mono",
    verifier: {
      model: "CCIP DON",
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

function nativeFee(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    total_lythoshi: "21000",
    cycles_used: 21_000,
    base_price_per_cycle_lythoshi: "1",
    state_io_units: 0,
    state_io_price_per_unit_lythoshi: "0",
    priority_tip_lythoshi: "0",
    ...extra,
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
    const address = addressToTypedBech32("user", "0x1111111111111111111111111111111111111111");
    const { fetch, calls } = mockGet(
      apiEnvelope({
        address,
        limit: 75,
        entries: [],
        indexer: { enabled: true, currentHeight: 100, latestHeight: 101, schemaVersion: 1 },
      }),
    );
    const client = new ApiClient("/rpc", { fetch });

    await client.addressActivity(address, 75, "0x1234");

    expect(calls[0]).toEqual({
      url: `/api/v1/addresses/${address}/activity?limit=75&cursor=0x1234`,
      method: "GET",
    });
  });

  it("rejects raw and wrong-HRP addresses before REST address fetches", async () => {
    const { fetch, calls } = mockGet(apiEnvelope({}));
    const client = new ApiClient("/rpc", { fetch });
    const contract = addressToTypedBech32("contract", "0x1111111111111111111111111111111111111111");
    const user = addressToTypedBech32("user", "0x2222222222222222222222222222222222222222");

    await expect(client.addressProfile("0x1111111111111111111111111111111111111111")).rejects.toMatchObject({
      kind: "malformed",
      message: expect.stringContaining("raw 0x addresses are retired"),
    });
    await expect(client.addressActivity(contract)).rejects.toMatchObject({
      kind: "malformed",
      message: expect.stringContaining("must be typed mono"),
    });
    await expect(client.mrcAccount(user)).rejects.toMatchObject({
      kind: "malformed",
      message: expect.stringContaining("must be typed monos"),
    });
    expect(calls).toHaveLength(0);
  });

  it("reads address profile token balances with optional MRC identity", async () => {
    const address = addressToTypedBech32("user", "0x1111111111111111111111111111111111111111");
    const assetId = `0x${"bb".repeat(32)}`;
    const mrcTokenId = `0x${"cc".repeat(32)}`;
    const vaultId = `0x${"ff".repeat(32)}`;
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
          tokenId: vaultId,
          balance: "700",
          updatedAtBlock: 92,
          mrc: {
            standard: "mrc4626",
            assetId: vaultId,
            tokenId: null,
          },
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
    expect(profile.data.tokenBalances[2].tokenId).toBe(vaultId);
    expect(profile.data.tokenBalances[2].mrc?.standard).toBe("mrc4626");
    expect(profile.data.tokenBalances[2].mrc?.assetId).toBe(vaultId);
    expect(profile.data.tokenBalances[2].mrc?.tokenId).toBeNull();
    expect(profile.data.tokenBalances[3].mrc).toBeUndefined();
    expect(profile.data.bridgeRouteDisclosures).toBeUndefined();
    expect(calls[0]).toEqual({
      url: `https://rpc.example/api/v1/addresses/${address}/profile`,
      method: "GET",
    });
  });

  it("reads address profile bridge route disclosures", async () => {
    const address = addressToTypedBech32("user", "0x1111111111111111111111111111111111111111");
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
        receiptCommitment: `0x${"bb".repeat(32)}`,
        noEvmProof: null,
        counters: { cycles: 44, syscallUnits: 3, stateIoUnits: 2 },
        fee: {
          total_lythoshi: "440000000000",
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
    expect(receipt.data.receiptCommitment).toBe(`0x${"bb".repeat(32)}`);
    expect(receipt.data.noEvmProof).toBeNull();
    expect(receipt.data.counters.stateIoUnits).toBe(2);
    expect(receipt.data.fee.total_lythoshi).toBe("440000000000");
    expect(receipt.data.fee.total_lyth).toBeUndefined();
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

  it("rejects legacy keys inside /api/v1 native receipt fee objects", async () => {
    const txHash = `0x${"22".repeat(32)}`;
    const { fetch } = mockGet(
      apiEnvelope({
        txHash,
        blockHash: `0x${"33".repeat(32)}`,
        blockHeight: 100,
        txIndex: 0,
        schema: "riscv.receipt.v1",
        artifactHash: `0x${"aa".repeat(32)}`,
        receiptCommitment: `0x${"bb".repeat(32)}`,
        noEvmProof: null,
        counters: { cycles: 44, syscallUnits: 3, stateIoUnits: 2 },
        fee: nativeFee({ gas: "21000" }),
        reverted: false,
        nativeDeltaCount: 0,
        eventCount: 0,
        events: [],
        source: {
          chainProvider: "mock_chain",
          indexerProvider: "native_events",
          metadataLogIndex: 0xffff_ffff,
        },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    await expect(client.transactionNativeReceipt(txHash)).rejects.toMatchObject({
      kind: "malformed",
      message: expect.stringContaining("gas"),
    });
  });

  it("preserves typed no-EVM compact proofs from /api/v1 native receipts", async () => {
    const txHash = `0x${"22".repeat(32)}`;
    const noEvmProof = {
      schema: "mono.no_evm_receipt_proof.v1",
      proofKind: "compactInclusion",
      proofType: "canonicalReceiptInclusion",
      historySource: "liveBlockCache",
      compactInclusionProof: {
        schema: "mono.no_evm_receipt_compact_inclusion.v1",
        treeAlgorithm: "binary-keccak-receipt-tree",
        root: `0x${"44".repeat(32)}`,
        leafHash: `0x${"66".repeat(32)}`,
        siblingHashes: [`0x${"77".repeat(32)}`],
        pathSides: [true],
      },
      archiveProof: null,
      rootAlgorithm: NO_EVM_RECEIPT_ROOT_ALGORITHM,
      receiptCodec: "bincode(protocore_execution_types::Receipt)",
      blockHash: `0x${"33".repeat(32)}`,
      txHash,
      receiptsRoot: `0x${"44".repeat(32)}`,
      targetReceiptHash: `0x${"55".repeat(32)}`,
      blockHeight: 100,
      txIndex: 0,
      receiptCount: 2,
      targetReceiptBytes: "0x010203",
    } satisfies NoEvmReceiptProof;
    const { fetch } = mockGet(
      apiEnvelope({
        txHash,
        blockHash: noEvmProof.blockHash,
        blockHeight: 100,
        txIndex: 0,
        schema: "riscv.receipt.v1",
        artifactHash: `0x${"aa".repeat(32)}`,
        receiptCommitment: `0x${"bb".repeat(32)}`,
        noEvmProof,
        counters: { cycles: 44, syscallUnits: 3, stateIoUnits: 2 },
        fee: {
          total_lythoshi: "440000000000",
          total_lyth: "0.00000044",
          cycles_used: 44,
          base_price_per_cycle_lythoshi: "10000000000",
          state_io_units: 2,
          state_io_price_per_unit_lythoshi: "0",
          priority_tip_lythoshi: "0",
        },
        reverted: false,
        nativeDeltaCount: 0,
        eventCount: 0,
        events: [],
        source: {
          chainProvider: "mock_chain",
          indexerProvider: "native_events",
          metadataLogIndex: 0xffff_ffff,
        },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const receipt = await client.transactionNativeReceipt(txHash);

    const proof = receipt.data.noEvmProof;
    expect(proof).toEqual(noEvmProof);
    expect(proof?.proofKind).toBe("compactInclusion");
    if (proof?.proofKind !== "compactInclusion") throw new Error("expected compact proof");
    expect(proof.targetReceiptBytes).toBe("0x010203");
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
        receiptCommitment: `0x${"bb".repeat(32)}`,
        counters: { cycles: 44, syscallUnits: 3, stateIoUnits: 2 },
        fee: {
          total_lythoshi: decoded.amount_lythoshi,
          total_lyth: "0.00000044",
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
    const marketAssetId = `0x${"41".repeat(32)}`;
    const marketRelatedAssetId = `0x${"42".repeat(32)}`;
    const decoded: NativeMarketSaleEvent = {
      block_height: 110,
      tx_index: 0,
      sequence: 0,
      family: "market",
      event_name: "market.nft.sale_settled",
      market_surface: "nft",
      market_asset_id: marketAssetId,
      market_related_asset_id: marketRelatedAssetId,
      payload_hash: `0x${"44".repeat(32)}`,
      listing_id: listingId,
      price: "900",
      quantity: "2",
      remaining: "0",
      status: "filled",
      nft_standard: "mrc1155",
      royalty_bps: 500,
      listing_kind: "fixed_price",
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
    const projection: NativeEventProjection = response.data.events[0].decoded;
    expect(projection.market_surface).toBe("nft");
    expect(projection.market_asset_id).toBe(marketAssetId);
    expect(projection.market_related_asset_id).toBe(marketRelatedAssetId);
    expect(projection.nft_standard).toBe("mrc1155");
    expect(projection.royalty_bps).toBe(500);
    expect(projection.quantity).toBe("2");
    expect(calls).toEqual([
      {
        url: "https://rpc.example/api/v1/native-events?fromBlock=110&toBlock=120&limit=5&family=market&eventName=market.nft.sale_settled",
        method: "GET",
      },
    ]);
  });

  it("replays native market orderbook deltas and parses stream-compatible payloads", async () => {
    const marketId = `0x${"aa".repeat(32)}`;
    const orderId = `0x${"bb".repeat(32)}`;
    const cursor = `0x${"00".repeat(8)}${"01".repeat(8)}`;
    const delta = nativeMarketOrderBookDelta({ marketId, orderId });
    const filters = {
      family: "market",
      marketId,
      eventName: "market.spot.order_placed",
    } satisfies NativeMarketOrderBookDeltasResponseFilters;
    const { fetch, calls } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        fromBlock: 100,
        toBlock: 103,
        limit: 10,
        cursor,
        nextCursor: null,
        filters,
        replay: true,
        streamTopic: "nativeMarketOrderBook",
        deltas: [delta],
        source: {
          indexerProvider: "native_events",
          projection: "native_market_orderbook_deltas",
          historyApi: "lyth_nativeMarketEvents",
        },
      } satisfies NativeMarketOrderBookDeltasResponse),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const response = await client.nativeMarketOrderBookDeltas({
      fromBlock: 100,
      toBlock: 103,
      marketId,
      eventName: "market.spot.order_placed",
      limit: 10,
      cursor,
    });

    expect(response.data.replay).toBe(true);
    expect(response.data.streamTopic).toBe("nativeMarketOrderBook");
    expect(response.data.deltas).toEqual([delta]);
    expect(response.data.filters.marketId).toBe(marketId);
    expect(response.data.source.projection).toBe("native_market_orderbook_deltas");
    expect(calls).toEqual([
      {
        url: `https://rpc.example/api/v1/native-market-orderbook-deltas?fromBlock=100&toBlock=103&limit=10&cursor=${cursor}&eventName=market.spot.order_placed&marketId=${marketId}`,
        method: "GET",
      },
    ]);
  });

  it("serializes native market orderbook delta replay cursor and filters", async () => {
    const marketId = `0x${"aa".repeat(32)}`;
    const listingId = `0x${"bb".repeat(32)}`;
    const primaryId = `0x${"cc".repeat(32)}`;
    const relatedId = `0x${"dd".repeat(32)}`;
    const tokenId = `0x${"ee".repeat(32)}`;
    const eventTopic = `0x${"11".repeat(32)}`;
    const account = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
    const counterparty = "mono1counterparty0000000000000000000000000";
    const cursor = `0x${"12".repeat(16)}`;
    const { fetch, calls } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        fromBlock: 100,
        toBlock: 120,
        limit: null,
        cursor,
        nextCursor: null,
        filters: { family: "market" },
        replay: true,
        streamTopic: "nativeMarketOrderBook",
        deltas: [],
        source: {
          indexerProvider: "native_events",
          projection: "native_market_orderbook_deltas",
          historyApi: "lyth_nativeMarketEvents",
        },
      } satisfies NativeMarketOrderBookDeltasResponse),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    await client.nativeMarketOrderBookDeltas({
      fromBlock: 100n,
      toBlock: 120,
      cursor,
      txIndex: 2,
      logIndex: 3,
      address: "monos1nativeeventemitter",
      eventTopic,
      eventName: "market.spot.order_settled",
      marketId,
      listingId,
      primaryId,
      relatedId,
      tokenId,
      account,
      counterparty,
    });

    expect(calls[0]).toEqual({
      url: `https://rpc.example/api/v1/native-market-orderbook-deltas?fromBlock=100&toBlock=120&cursor=${cursor}&txIndex=2&logIndex=3&address=monos1nativeeventemitter&eventTopic=${eventTopic}&eventName=market.spot.order_settled&marketId=${marketId}&listingId=${listingId}&primaryId=${primaryId}&relatedId=${relatedId}&tokenId=${tokenId}&account=${account}&counterparty=${counterparty}`,
      method: "GET",
    });
  });

  it("rejects malformed native market orderbook delta replay bodies", async () => {
    const malformed = apiEnvelope({
      schemaVersion: 1,
      fromBlock: 100,
      toBlock: 103,
      limit: 10,
      cursor: null,
      nextCursor: null,
      filters: { family: "market" },
      replay: true,
      streamTopic: "nativeMarketOrderBook",
      events: [nativeMarketOrderBookDelta()],
      deltas: [
        {
          ...nativeMarketOrderBookDelta(),
          market_id: `0x${"aa".repeat(32)}`,
          marketId: undefined,
        },
      ],
      source: {
        indexerProvider: "native_events",
        projection: "native_market_orderbook_deltas",
        historyApi: "lyth_nativeMarketEvents",
      },
    });
    const { fetch } = mockGet(malformed);
    const client = new ApiClient("https://rpc.example", { fetch });

    await expect(
      client.nativeMarketOrderBookDeltas({
        fromBlock: 100,
        toBlock: 103,
        limit: 10,
      }),
    ).rejects.toMatchObject({ kind: "malformed" });
  });

  it("nativeAgentState sends query params and decodes native agent state rows", async () => {
    const policyId = `0x${"aa".repeat(32)}`;
    const escrowId = `0x${"bb".repeat(32)}`;
    const assetId = `0x${"cc".repeat(32)}`;
    const termsHash = `0x${"dd".repeat(32)}`;
    const issuerId = `0x${"11".repeat(32)}`;
    const attestationId = `0x${"12".repeat(32)}`;
    const consentId = `0x${"13".repeat(32)}`;
    const serviceId = `0x${"14".repeat(32)}`;
    const arbiterId = `0x${"15".repeat(32)}`;
    const reviewId = `0x${"16".repeat(32)}`;
    const schemaHash = `0x${"17".repeat(32)}`;
    const payloadHash = `0x${"18".repeat(32)}`;
    const scopeHash = `0x${"19".repeat(32)}`;
    const categoryHash = `0x${"1a".repeat(32)}`;
    const metadataHash = `0x${"1b".repeat(32)}`;
    const owner = "mono1agentowner000000000000000000000000000000";
    const controller = "mono1agentcontroller000000000000000000000000";
    const provider = "mono1agentprovider0000000000000000000000000";
    const arbiter = "mono1agentarbiter00000000000000000000000000";
    const grantee = "mono1agentgrantee00000000000000000000000000";
    const reviewer = "mono1agentreviewer0000000000000000000000000";
    const { fetch, calls } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        limit: 5,
        filters: {
          policyId: null,
          escrowId: null,
          account: owner,
          includePolicySpends: true,
        },
        issuers: [
          {
            issuerId,
            issuer: provider,
            metadataHash,
            updatedAtBlock: 45,
          },
        ],
        attestations: [
          {
            attestationId,
            issuerId,
            issuer: provider,
            subject: owner,
            schemaHash,
            payloadHash,
            active: true,
            updatedAtBlock: 46,
          },
        ],
        consents: [
          {
            consentId,
            subject: owner,
            grantee,
            scopeHash,
            expiresAt: 10_000,
            active: true,
            updatedAtBlock: 47,
          },
        ],
        services: [
          {
            serviceId,
            provider,
            categoryHash,
            metadataHash,
            active: true,
            updatedAtBlock: 48,
          },
        ],
        availability: [
          {
            provider,
            maxConcurrent: 8,
            openRequests: 2,
            paused: false,
            updatedAtBlock: 49,
          },
        ],
        arbiters: [
          {
            arbiterId,
            arbiter,
            tier: 2,
            metadataHash,
            updatedAtBlock: 50,
          },
        ],
        reputationReviews: [
          {
            reviewId,
            reviewer,
            subject: provider,
            categoryId: 7,
            speedScore: 9,
            qualityScore: 8,
            communicationScore: 10,
            accuracyScore: 9,
            payloadHash,
            updatedAtBlock: 51,
          },
        ],
        spendingPolicies: [
          {
            policyId,
            owner,
            controller,
            assetId,
            enabled: true,
            perActionLimit: "100",
            windowLimit: "500",
            windowSecs: 60,
            updatedAtBlock: 42,
          },
        ],
        policySpends: [
          {
            policyId,
            controller,
            assetId,
            window: 7,
            amount: "25",
            spent: "125",
            updatedAtBlock: 43,
          },
        ],
        escrows: [
          {
            escrowId,
            buyer: owner,
            provider,
            arbiter,
            assetId,
            amount: "1000",
            termsHash,
            round: 2,
            buyerAccepted: true,
            providerAccepted: false,
            submittedPayloadHash: null,
            status: "accepted",
            resolution: null,
            lastActor: owner,
            createdAtBlock: 40,
            updatedAtBlock: 44,
          },
        ],
        source: {
          indexerProvider: "native_agent_state",
          projection: "native_agent_state",
        },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const response = await client.nativeAgentState({
      account: owner,
      includePolicySpends: true,
      limit: 5,
    });

    expect(response.data.spendingPolicies[0].controller).toBe(controller);
    expect(response.data.policySpends[0].amount).toBe("25");
    expect(response.data.escrows[0].status).toBe("accepted");
    expect(response.data.issuers[0]).toMatchObject({ issuerId, issuer: provider, metadataHash });
    expect(response.data.attestations[0]).toMatchObject({
      attestationId,
      issuerId,
      subject: owner,
      active: true,
    });
    expect(response.data.consents[0]).toMatchObject({ consentId, grantee, expiresAt: 10_000 });
    expect(response.data.services[0]).toMatchObject({ serviceId, categoryHash, active: true });
    expect(response.data.availability[0]).toMatchObject({
      provider,
      maxConcurrent: 8,
      openRequests: 2,
      paused: false,
    });
    expect(response.data.arbiters[0]).toMatchObject({ arbiterId, tier: 2 });
    expect(response.data.reputationReviews[0]).toMatchObject({
      reviewId,
      categoryId: 7,
      communicationScore: 10,
    });
    expect(response.data.filters.account).toBe(owner);
    expect(calls).toEqual([
      {
        url: `https://rpc.example/api/v1/native-agent-state?account=${owner}&includePolicySpends=true&limit=5`,
        method: "GET",
      },
    ]);
  });

  it("nativeAgentState defaults additive arrays for older responses", async () => {
    const { fetch } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        limit: 0,
        filters: {
          policyId: null,
          escrowId: null,
          account: null,
          includePolicySpends: false,
        },
        spendingPolicies: [],
        policySpends: [],
        escrows: [],
        source: {
          indexerProvider: "native_agent_state",
          projection: "native_agent_state",
        },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const response = await client.nativeAgentState();

    expect([
      response.data.issuers,
      response.data.attestations,
      response.data.consents,
      response.data.services,
      response.data.availability,
      response.data.arbiters,
      response.data.reputationReviews,
    ]).toEqual([[], [], [], [], [], [], []]);
  });

  it("nativeMarketState sends query params and decodes spot, listing, and royalty rows", async () => {
    const marketId = `0x${"aa".repeat(32)}`;
    const orderId = `0x${"bb".repeat(32)}`;
    const listingId = `0x${"cc".repeat(32)}`;
    const legacyListingId = `0x${"cd".repeat(32)}`;
    const collectionId = `0x${"dd".repeat(32)}`;
    const owner = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
    const { fetch, calls } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        limit: 5,
        filters: {
          marketId,
          orderId: null,
          listingId: null,
          collectionId: null,
          account: owner,
          includeSpotOrders: true,
        },
        spotMarkets: [
          {
            marketId,
            owner,
            baseAssetId: `0x${"11".repeat(32)}`,
            quoteAssetId: `0x${"22".repeat(32)}`,
            tickSize: "10",
            lotSize: "5",
            minQuantity: "25",
            minNotional: "1000",
            tradeCount: "2",
            totalVolumeBase: "40",
            lastPrice: null,
            lastBlockHeight: null,
            createdAtBlock: 40,
            updatedAtBlock: 45,
          },
        ],
        spotOrders: [
          {
            orderId,
            marketId,
            owner,
            nonce: 9,
            side: "ask",
            price: "8",
            quantity: "30",
            remaining: "10",
            status: "partially_filled",
            expiresAtBlock: 99,
            updatedAtBlock: 45,
          },
        ],
        nftListings: [
          {
            listingId,
            seller: "mono1seller0000000000000000000000000000000000",
            nonce: 12,
            standard: "mrc721",
            collectionId,
            tokenId: `0x${"33".repeat(32)}`,
            quantity: "1",
            paymentAssetId: `0x${"44".repeat(32)}`,
            price: "700",
            listingKind: { auction: { reserve: "650" } },
            status: "open",
            expiresAtBlock: 120,
            highestBidder: null,
            highestBid: null,
            updatedAtBlock: 46,
          },
          {
            listingId: legacyListingId,
            seller: "mono1seller0000000000000000000000000000000000",
            standard: "mrc721",
            collectionId,
            tokenId: `0x${"34".repeat(32)}`,
            quantity: "1",
            paymentAssetId: `0x${"44".repeat(32)}`,
            price: "701",
            listingKind: { auction: { reserve: "651" } },
            status: "open",
            expiresAtBlock: 121,
            highestBidder: null,
            highestBid: null,
            updatedAtBlock: 47,
          },
        ],
        collectionRoyalties: [
          {
            collectionId,
            creator: owner,
            recipient: "mono1royalty00000000000000000000000000000000",
            bps: 250,
            updatedAtBlock: 47,
          },
        ],
        source: {
          indexerProvider: "native_market_state",
          projection: "native_market_state",
        },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const response = await client.nativeMarketState({
      marketId,
      account: owner,
      includeSpotOrders: true,
      limit: 5,
    });

    expect(response.data.spotMarkets[0].tradeCount).toBe("2");
    expect(response.data.spotOrders[0].nonce).toBe(9);
    expect(response.data.spotOrders[0].remaining).toBe("10");
    expect(response.data.nftListings[0].nonce).toBe(12);
    expect(response.data.nftListings[1].nonce).toBeUndefined();
    expect(response.data.nftListings[0].listingKind).toEqual({
      auction: { reserve: "650" },
    });
    expect(response.data.collectionRoyalties[0].creator).toBe(owner);
    expect(response.data.filters.account).toBe(owner);
    expect(calls).toEqual([
      {
        url: `https://rpc.example/api/v1/native-market-state?marketId=${marketId}&account=${owner}&includeSpotOrders=true&limit=5`,
        method: "GET",
      },
    ]);
  });

  it("wraps search, transaction-feed, address aggregate, stats, and market routes", async () => {
    const { fetch, calls } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        latestHeight: 0,
        limit: 25,
        nextCursor: null,
        transactions: [],
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });
    const marketId = `0x${"55".repeat(32)}`;
    const assetId = `0x${"bb".repeat(32)}`;
    const mrcTokenId = `0x${"cc".repeat(32)}`;
    const account = addressToTypedBech32("user", "0x1111111111111111111111111111111111111111");
    const rewardsAccount = addressToTypedBech32("user", "0x2222222222222222222222222222222222222222");
    const mrcAccount = addressToTypedBech32("smartAccount", "0x3333333333333333333333333333333333333333");

    await client.search("0xabc", 5);
    await client.stats();
    await client.transactions(25, "0x1234");
    await client.addressProfile(account);
    await client.addressFlow(account, 75);
    await client.addressPendingRewards(rewardsAccount, 99);
    await client.assetMrcMetadata(assetId, mrcTokenId);
    await client.assetMrcMetadata(assetId);
    await client.mrcAccount(mrcAccount, 2);
    await client.mrcAssetHolders("mrc4626", assetId, 10);
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
      `https://rpc.example/api/v1/addresses/${account}/profile`,
      `https://rpc.example/api/v1/addresses/${account}/flow?limit=75`,
      `https://rpc.example/api/v1/addresses/${rewardsAccount}/pending-rewards?block=0x63`,
      `https://rpc.example/api/v1/assets/${assetId}/metadata?mrcTokenId=${mrcTokenId}`,
      `https://rpc.example/api/v1/assets/${assetId}/metadata`,
      `https://rpc.example/api/v1/mrc/accounts/${mrcAccount}?limit=2`,
      `https://rpc.example/api/v1/mrc/mrc4626/${assetId}/holders?limit=10`,
      "https://rpc.example/api/v1/markets?limit=10",
      `https://rpc.example/api/v1/markets/${marketId}`,
      `https://rpc.example/api/v1/markets/${marketId}/trades?limit=15&cursor=0xabcd`,
      `https://rpc.example/api/v1/markets/${marketId}/ohlc?fromBlock=90&toBlock=100&bucketBlocks=10`,
      `https://rpc.example/api/v1/markets/${marketId}/orderbook?levels=12`,
      `https://rpc.example/api/v1/service-probes/0x${"12".repeat(32)}/0x100`,
    ]);
    expect(calls.every((c) => c.method === "GET")).toBe(true);
  });

  it("exposes client-side feeLythoshi + effectiveGasPricePerUnit on transaction views and receipts", async () => {
    const txHash = `0x${"22".repeat(32)}`;
    const address = "0x1111111111111111111111111111111111111111";
    const { fetch, calls } = mockGet(
      apiEnvelope({
        transaction: {
          txHash,
          blockHash: `0x${"33".repeat(32)}`,
          blockHeight: 100,
          txIndex: 0,
          from: address,
          to: null,
          nonce: 1,
          valueLythoshi: "0",
          maxExecutionFeeLythoshi: "12500000000",
          priorityTipLythoshi: "2500000000",
          executionUnitLimit: 21000,
          fee: nativeFee({
            total_lythoshi: "262500000000",
            base_price_per_cycle_lythoshi: "10000000000",
            priority_tip_lythoshi: "2500000000",
          }),
          input: "0x",
          signedEnvelope: "0xabcd",
        },
        receipt: {
          txHash,
          blockHash: `0x${"33".repeat(32)}`,
          blockHeight: 100,
          txIndex: 0,
          status: 1,
          executionUnitsUsed: 21,
          logs: [],
        },
        source: { chainProvider: "LiveChainProvider" },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const tx = await client.transaction(txHash);

    expect(tx.data.transaction.feeLythoshi).toBe("262500000000");
    expect(tx.data.transaction.effectiveGasPricePerUnit).toBe("12500000000");
    expect(tx.data.receipt?.feeLythoshi).toBe("262500000000");
    expect(tx.data.receipt?.effectiveGasPricePerUnit).toBe("12500000000");
    expect(calls[0]).toEqual({
      url: `https://rpc.example/api/v1/transactions/${txHash}`,
      method: "GET",
    });
  });

  it("computes transaction fee exposure even when the receipt is absent", async () => {
    const txHash = `0x${"22".repeat(32)}`;
    const { fetch } = mockGet(
      apiEnvelope({
        transaction: {
          txHash,
          blockHash: `0x${"33".repeat(32)}`,
          blockHeight: 100,
          txIndex: 0,
          from: "0x1111111111111111111111111111111111111111",
          to: null,
          nonce: 1,
          valueLythoshi: "0",
          maxExecutionFeeLythoshi: "10000000000",
          priorityTipLythoshi: "0",
          executionUnitLimit: 21000,
          fee: nativeFee({
            total_lythoshi: "210000000000",
            base_price_per_cycle_lythoshi: "10000000000",
            priority_tip_lythoshi: "0",
          }),
          input: "0x",
          signedEnvelope: "0xabcd",
        },
        receipt: null,
        source: { chainProvider: "LiveChainProvider" },
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const tx = await client.transaction(txHash);

    expect(tx.data.receipt).toBeNull();
    expect(tx.data.transaction.feeLythoshi).toBe("210000000000");
    expect(tx.data.transaction.effectiveGasPricePerUnit).toBe("10000000000");
  });

  it("rejects legacy keys inside /api/v1 transaction-feed fee objects", async () => {
    const txHash = `0x${"22".repeat(32)}`;
    const address = "0x1111111111111111111111111111111111111111";
    const { fetch } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        latestHeight: 12,
        limit: 5,
        nextCursor: null,
        transactions: [
          {
            txHash,
            blockHash: `0x${"33".repeat(32)}`,
            blockNumber: 12,
            blockTimestamp: 1700000000,
            txIndex: 0,
            from: address,
            to: null,
            nonce: 1,
            value: "0",
            executionUnitLimit: 21000,
            maxExecutionFeeLythoshi: "1",
            priorityTipLythoshi: "1",
            fee: nativeFee({ wei: "21000" }),
            input: "0x",
            receipt: null,
          },
        ],
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    await expect(client.transactions(5)).rejects.toMatchObject({
      kind: "malformed",
      message: expect.stringContaining("wei"),
    });
  });

  it("wraps REST MRC account route and decodes policy spend rows", async () => {
    const account = addressToTypedBech32("smartAccount", "0x3333333333333333333333333333333333333333");
    const controller = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
    const recovery = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
    const assetId = `0x${"bb".repeat(32)}`;
    const policyHash = `0x${"44".repeat(32)}`;
    const { fetch, calls } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        account,
        spendLimit: 2,
        smartAccount: {
          kind: "smart_account",
          account,
          controller,
          recovery,
          policyHash: null,
          policy: null,
          nonce: "7",
          updatedAtBlock: 91,
        },
        policyAccount: {
          kind: "policy_account",
          account,
          controller,
          recovery: null,
          policyHash,
          policy: {
            enabled: true,
            perActionLimit: "20",
            windowLimit: "100",
            allowedAssets: [assetId],
          },
          nonce: null,
          updatedAtBlock: 90,
        },
        policySpends: [
          {
            account,
            assetId,
            window: "3600",
            amount: "1000",
            spent: "250",
            updatedAtBlock: 92,
          },
        ],
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const response = await client.mrcAccount(account, 2);

    expect(response.data.smartAccount?.controller).toBe(controller);
    expect(response.data.smartAccount?.recovery).toBe(recovery);
    expect(response.data.smartAccount?.policyHash).toBeNull();
    expect(response.data.smartAccount?.policy).toBeNull();
    expect(response.data.smartAccount?.nonce).toBe("7");
    expect(response.data.policyAccount?.policyHash).toBe(policyHash);
    expect(response.data.policyAccount?.policy).toMatchObject({
      enabled: true,
      perActionLimit: "20",
      windowLimit: "100",
      allowedAssets: [assetId],
    });
    expect(response.data.policySpends[0]).toMatchObject({ assetId, spent: "250" });
    expect(calls).toEqual([
      {
        url: `https://rpc.example/api/v1/mrc/accounts/${account}?limit=2`,
        method: "GET",
      },
    ]);
  });

  it("wraps REST MRC holder route and decodes rich-list holder rows", async () => {
    const assetId = `0x${"bb".repeat(32)}`;
    const tokenId = `0x${"cc".repeat(32)}`;
    const address = "0x1111111111111111111111111111111111111111";
    const { fetch, calls } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        standard: "mrc1155",
        assetId,
        tokenId,
        limit: 5,
        holders: [{ rank: 1, address, balance: "42", updatedAtBlock: 91 }],
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const response = await client.mrcHolders("mrc1155", assetId, tokenId, 5);

    expect(response.data.standard).toBe("mrc1155");
    expect(response.data.holders[0]).toMatchObject({ rank: 1, address, balance: "42" });
    expect(calls).toEqual([
      {
        url: `https://rpc.example/api/v1/mrc/mrc1155/${assetId}/${tokenId}/holders?limit=5`,
        method: "GET",
      },
    ]);
  });

  it("wraps asset-scoped REST MRC-4626 holder route", async () => {
    const vaultId = `0x${"bb".repeat(32)}`;
    const address = "0x1111111111111111111111111111111111111111";
    const { fetch, calls } = mockGet(
      apiEnvelope({
        schemaVersion: 1,
        standard: "mrc4626",
        assetId: vaultId,
        tokenId: null,
        limit: 10,
        holders: [{ rank: 1, address, balance: "700", updatedAtBlock: 92 }],
      }),
    );
    const client = new ApiClient("https://rpc.example", { fetch });

    const response = await client.mrc4626Holders(vaultId, 10);

    expect(response.data.standard).toBe("mrc4626");
    expect(response.data.tokenId).toBeNull();
    expect(response.data.holders[0]).toMatchObject({ rank: 1, address, balance: "700" });
    expect(calls).toEqual([
      {
        url: `https://rpc.example/api/v1/mrc/mrc4626/${vaultId}/holders?limit=10`,
        method: "GET",
      },
    ]);
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

  it("reads the stream catalogue including nativeMarketOrderBook", async () => {
    const { fetch, calls } = mockGet({
      schemaVersion: 1,
      chainId: 69420,
      transport: "sse",
      keepAliveSeconds: 15,
      perConnectionMailbox: 1024,
      topics: [
        {
          topic: "nativeMarketOrderBook",
          endpoint: "/api/v1/streams/nativeMarketOrderBook",
          description: "Native spot-market orderbook deltas from typed native market events.",
          shape:
            "object{marketId,orderId,relatedOrderId?,eventName,action,side?,price?,quantity?,remaining?,status?,blockHeight,txIndex,logIndex}",
          source: "canonical_riscv_receipts",
          queryFilters: [],
          retention: {
            kind: "live_broadcast",
            replay: false,
            historyApis: ["lyth_clobOrderBook", "lyth_nativeMarketState"],
          },
        },
      ],
    });
    const client = new ApiClient("https://rpc.example", { fetch });

    const streams = await client.streams();

    expect(streams.transport).toBe("sse");
    expect(streams.topics[0].topic).toBe("nativeMarketOrderBook");
    expect(streams.topics[0].endpoint).toBe("/api/v1/streams/nativeMarketOrderBook");
    expect(streams.topics[0].retention?.historyApis).toContain("lyth_clobOrderBook");
    expect(calls[0]).toEqual({
      url: "https://rpc.example/api/v1/streams",
      method: "GET",
    });
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
