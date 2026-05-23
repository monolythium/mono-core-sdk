/**
 * Unit tests for `RpcClient`. These all use a stub `fetch` that asserts
 * the wire shape the client emits — no network is touched. The live
 * round-trip suite is under `tests/integration.test.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  NODE_REGISTRY_CAPABILITIES,
  SERVICE_PROBE_STATUS,
  RpcClient,
  SdkError,
  addressToTypedBech32,
  assessBridgeRoute,
  parseQuantity,
  parseQuantityBig,
} from "../src/index.js";
import type {
  BridgeRouteDisclosure,
  NativeDecodedEvent,
  TokenBalanceRecord,
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

interface CapturedCall {
  method: string;
  params: unknown;
  url: string;
}

function mockFetch(reply: unknown): {
  fetch: typeof fetch;
  calls: CapturedCall[];
} {
  const calls: CapturedCall[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const body = init?.body;
    if (typeof body !== "string") {
      throw new Error("expected string body");
    }
    const parsed = JSON.parse(body) as { method: string; params: unknown };
    calls.push({ method: parsed.method, params: parsed.params, url });
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: reply }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchImpl, calls };
}

function mockFetchSequence(replies: unknown[]): {
  fetch: typeof fetch;
  calls: CapturedCall[];
} {
  const calls: CapturedCall[] = [];
  let i = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const body = init?.body;
    if (typeof body !== "string") {
      throw new Error("expected string body");
    }
    const parsed = JSON.parse(body) as { method: string; params: unknown };
    calls.push({ method: parsed.method, params: parsed.params, url });
    const result = i < replies.length ? replies[i++] : replies.at(-1);
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchImpl, calls };
}

describe("RpcClient construction", () => {
  it("rejects an empty endpoint", () => {
    expect(() => new RpcClient("")).toThrow(SdkError);
  });

  it("accepts a valid endpoint", () => {
    const c = new RpcClient("http://localhost:8545");
    expect(c.endpoint).toBe("http://localhost:8545");
  });
});

describe("eth_* methods", () => {
  it("eth_chainId encodes and decodes a hex quantity", async () => {
    const { fetch, calls } = mockFetch("0x10f2c");
    const client = new RpcClient("http://x", { fetch });
    const id = await client.ethChainId();
    expect(id).toBe(69420n);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("eth_chainId");
    expect(calls[0].params).toEqual([]);
  });

  it("eth_blockNumber returns a bigint", async () => {
    const { fetch, calls } = mockFetch("0x100");
    const client = new RpcClient("http://x", { fetch });
    const n = await client.ethBlockNumber();
    expect(n).toBe(256n);
    expect(calls[0].method).toBe("eth_blockNumber");
  });

  it("eth_getBlockByNumber sends the encoded selector", async () => {
    const reply = {
      number: 256,
      hash: "0xabc",
      parent_hash: "0xdef",
      state_root: "0x000",
      timestamp: 1700000000,
      executionUnitsUsed: 0,
      executionUnitLimit: 30000000,
    };
    const { fetch, calls } = mockFetch(reply);
    const client = new RpcClient("http://x", { fetch });
    const header = await client.ethGetBlockByNumber(256);
    expect(header?.executionUnitsUsed).toBe(0n);
    expect(header?.executionUnitLimit).toBe(30000000n);
    expect(calls[0].method).toBe("eth_getBlockByNumber");
    expect(calls[0].params).toEqual(["0x100"]);
  });

  it("eth_getBlockByNumber accepts legacy gas field aliases", async () => {
    const reply = {
      number: 256,
      hash: "0xabc",
      parent_hash: "0xdef",
      state_root: "0x000",
      timestamp: 1700000000,
      gas_used: 7,
      gas_limit: 30000000,
    };
    const { fetch } = mockFetch(reply);
    const client = new RpcClient("http://x", { fetch });
    const header = await client.ethGetBlockByNumber(256);
    expect(header?.executionUnitsUsed).toBe(7n);
    expect(header?.executionUnitLimit).toBe(30000000n);
    expect("gas_used" in header!).toBe(false);
    expect("gas_limit" in header!).toBe(false);
  });

  it("eth_getTransactionReceipt returns execution-unit receipt fields", async () => {
    const txHash = `0x${"11".repeat(32)}`;
    const reply = {
      txHash,
      blockHash: `0x${"22".repeat(32)}`,
      blockNumber: 12,
      txIndex: 1,
      status: 1,
      executionUnitsUsed: 21_000,
    };
    const { fetch, calls } = mockFetch(reply);
    const client = new RpcClient("http://x", { fetch });
    const receipt = await client.ethGetTransactionReceipt(txHash);
    expect(receipt?.tx_hash).toBe(txHash);
    expect(receipt?.block_number).toBe(12n);
    expect(receipt?.tx_index).toBe(1);
    expect(receipt?.executionUnitsUsed).toBe(21_000n);
    expect("gas_used" in receipt!).toBe(false);
    expect(calls[0].method).toBe("eth_getTransactionReceipt");
    expect(calls[0].params).toEqual([txHash]);
  });

  it("eth_getTransactionReceipt accepts legacy gas field aliases", async () => {
    const txHash = `0x${"11".repeat(32)}`;
    const reply = {
      tx_hash: txHash,
      block_hash: `0x${"22".repeat(32)}`,
      block_number: 12,
      tx_index: 1,
      status: 1,
      gas_used: 21_000,
    };
    const { fetch } = mockFetch(reply);
    const client = new RpcClient("http://x", { fetch });
    const receipt = await client.ethGetTransactionReceipt(txHash);
    expect(receipt?.executionUnitsUsed).toBe(21_000n);
    expect("gas_used" in receipt!).toBe(false);
  });
});

describe("lyth_* methods (Law §13.2 native namespace)", () => {
  it("lyth_clusterDirectory sends the canonical method string", async () => {
    const { fetch, calls } = mockFetch({
      page: 0,
      limit: 25,
      totalClusters: 0,
      clusters: [],
    });
    const client = new RpcClient("http://x", { fetch });
    const set = await client.lythClusterDirectory();
    expect(set.clusters).toEqual([]);
    expect(calls[0].method).toBe("lyth_clusterDirectory");
    expect(calls[0].method.startsWith("lyth_")).toBe(true);
    expect(calls[0].method).not.toMatch(/^protocore_/);
  });

  it("lyth_currentRound, lyth_mempoolStatus, lyth_indexerStatus all use lyth_ prefix", async () => {
    const { fetch, calls } = mockFetchSequence([
      { height: 1 },
      { count_ready: 0, count_pending: 0, mailbox_depth: 0, bytes_by_class: [0, 0, 0, 0, 0, 0, 0] },
      {},
    ]);
    const client = new RpcClient("http://x", { fetch });
    await client.lythCurrentRound();
    await client.lythMempoolStatus();
    await client.lythIndexerStatus();
    expect(calls.map((c) => c.method)).toEqual([
      "lyth_currentRound",
      "lyth_mempoolStatus",
      "lyth_indexerStatus",
    ]);
    for (const c of calls) {
      expect(c.method).not.toMatch(/^protocore_/);
    }
  });

  it("lyth_listProviders forwards capability mask + cursor + limit", async () => {
    const { fetch, calls } = mockFetch([]);
    const client = new RpcClient("http://x", { fetch });
    await client.lythListProviders(0xff, "cursor-1", 25);
    expect(calls[0].method).toBe("lyth_listProviders");
    expect(calls[0].params).toEqual([255, "cursor-1", 25]);
  });

  it("lyth_listActivePrecompiles defaults to latest", async () => {
    const reply = {
      blockNumber: 256,
      precompiles: [
        {
          activationHeight: null,
          address: "0x0000000000000000000000000000000000001000",
          capabilityId: "factory",
          enabled: true,
          gateable: false,
          name: "factory",
        },
      ],
    };
    const { fetch, calls } = mockFetch(reply);
    const client = new RpcClient("http://x", { fetch });
    const catalogue = await client.lythListActivePrecompiles();
    expect(calls[0].method).toBe("lyth_listActivePrecompiles");
    expect(calls[0].params).toEqual(["latest"]);
    expect(catalogue.precompiles).toHaveLength(1);
    expect(catalogue.blockNumber).toBe(256);
  });

  it("lyth_getTokenBalances reads indexed asset rows with optional MRC identity", async () => {
    const tokenId = `0x${"aa".repeat(32)}`;
    const assetId = `0x${"bb".repeat(32)}`;
    const childTokenId = `0x${"cc".repeat(32)}`;
    const directRoute = bridgeRoute("ccip-usdc-eth");
    const listedRoute = bridgeRoute("layerzero-usdc-eth");
    const legacyBalance: TokenBalanceRecord = {
      tokenId: `0x${"dd".repeat(32)}`,
      balance: "0",
      updatedAtBlock: 89n,
    };
    expect(legacyBalance.mrc).toBeUndefined();
    expect(legacyBalance.bridgeRouteDisclosure).toBeUndefined();
    expect(legacyBalance.bridgeRouteDisclosures).toBeUndefined();
    const { fetch, calls } = mockFetch([
      {
        tokenId,
        balance: "1000",
        updatedAtBlock: 88,
        mrc: {
          standard: "mrc1155",
          assetId,
          tokenId: childTokenId,
        },
        bridgeRouteDisclosure: directRoute,
      },
      {
        tokenId: `0x${"ee".repeat(32)}`,
        balance: "25",
        updatedAtBlock: 90,
        mrc: null,
        bridgeRouteDisclosures: [listedRoute],
      },
      {
        tokenId: legacyBalance.tokenId,
        balance: legacyBalance.balance,
        updatedAtBlock: 89,
      },
    ]);
    const client = new RpcClient("http://x", { fetch });
    const balances = await client.lythGetTokenBalances("0x1111111111111111111111111111111111111111");
    expect(calls[0].method).toBe("lyth_getTokenBalances");
    expect(calls[0].params).toEqual(["0x1111111111111111111111111111111111111111"]);
    expect(balances[0].mrc?.standard).toBe("mrc1155");
    expect(balances[0].mrc?.assetId).toBe(assetId);
    expect(balances[0].mrc?.tokenId).toBe(childTokenId);
    expect(assessBridgeRoute(balances[0].bridgeRouteDisclosure!).accepted).toBe(true);
    expect(balances[1].mrc).toBeNull();
    expect(assessBridgeRoute(balances[1].bridgeRouteDisclosures![0]).accepted).toBe(true);
    expect(balances[2].mrc).toBeUndefined();
    expect(balances[2].bridgeRouteDisclosure).toBeUndefined();
    expect(balances[2].bridgeRouteDisclosures).toBeUndefined();
  });

  it("lyth_mrcMetadata reads asset and token metadata rows", async () => {
    const assetId = `0x${"bb".repeat(32)}`;
    const tokenId = `0x${"cc".repeat(32)}`;
    const { fetch, calls } = mockFetchSequence([
      {
        schemaVersion: 1,
        assetId,
        tokenId,
        metadata: {
          standard: "mrc1155",
          assetId,
          tokenId,
          name: null,
          symbol: null,
          decimals: null,
          uri: "ipfs://metadata/1",
          updatedAtBlock: 91,
        },
      },
      {
        schemaVersion: 1,
        assetId,
        tokenId: null,
        metadata: null,
      },
    ]);
    const client = new RpcClient("http://x", { fetch });

    const tokenMetadata = await client.lythMrcMetadata(assetId, tokenId);
    const assetMetadata = await client.lythMrcMetadata(assetId);

    expect(tokenMetadata.metadata?.uri).toBe("ipfs://metadata/1");
    expect(tokenMetadata.metadata?.updatedAtBlock).toBe(91);
    expect(assetMetadata.tokenId).toBeNull();
    expect(assetMetadata.metadata).toBeNull();
    expect(calls[0].method).toBe("lyth_mrcMetadata");
    expect(calls[0].params).toEqual([assetId, tokenId]);
    expect(calls[1].method).toBe("lyth_mrcMetadata");
    expect(calls[1].params).toEqual([assetId]);
  });

  it("lyth_getAddressLabel returns null for unlabeled addresses", async () => {
    const { fetch } = mockFetch(null);
    const client = new RpcClient("http://x", { fetch });
    await expect(client.lythGetAddressLabel("0x1111111111111111111111111111111111111111")).resolves.toBeNull();
  });

  it("lyth_getDelegationHistory forwards limit and cursor", async () => {
    const { fetch, calls } = mockFetch([]);
    const client = new RpcClient("http://x", { fetch });
    await client.lythGetDelegationHistory("0x1111111111111111111111111111111111111111", 25, "0x00");
    expect(calls[0].method).toBe("lyth_getDelegationHistory");
    expect(calls[0].params).toEqual(["0x1111111111111111111111111111111111111111", 25, "0x00"]);
  });

  it("lyth_pendingRewards reads settled and unsettled reward quantities", async () => {
    const wallet = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
    const { fetch, calls } = mockFetch({
      wallet,
      totalAmountLythoshi: "0x271f",
      settledPendingLythoshi: "0xf",
      unsettledAmountLythoshi: "0x2710",
      autoCompound: true,
      rows: [{ cluster: 7, weightBps: 2500, unsettledAmountLythoshi: "0x2710" }],
      block: 99,
    });
    const client = new RpcClient("http://x", { fetch });

    const rewards = await client.lythPendingRewards(wallet, 99);

    expect(rewards.totalAmountLythoshi).toBe("0x271f");
    expect(rewards.settledPendingLythoshi).toBe("0xf");
    expect(rewards.unsettledAmountLythoshi).toBe("0x2710");
    expect(rewards.autoCompound).toBe(true);
    expect(rewards.rows).toEqual([
      { cluster: 7, weightBps: 2500, unsettledAmountLythoshi: "0x2710" },
    ]);
    expect(rewards.block).toBe(99);
    expect(calls[0].method).toBe("lyth_pendingRewards");
    expect(calls[0].params).toEqual([wallet, "0x63"]);
  });

  it("lyth_redemptionQueue reads wallet redemption queue tickets", async () => {
    const wallet = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
    const { fetch, calls } = mockFetch({
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
    });
    const client = new RpcClient("http://x", { fetch });

    const queue = await client.lythRedemptionQueue(wallet, 99);

    expect(queue.wallet).toBe(wallet);
    expect(queue.tickets).toEqual([
      {
        index: 0,
        cluster: 7,
        weightBps: 2500,
        createdHeight: 20,
        maturityHeight: 120,
        mature: false,
      },
    ]);
    expect(queue.count).toBe(1);
    expect(queue.returned).toBe(1);
    expect(queue.block).toBe(99);
    expect(calls[0].method).toBe("lyth_redemptionQueue");
    expect(calls[0].params).toEqual([wallet, "0x63"]);
  });

  it("lyth_getAddressActivity forwards limit and cursor", async () => {
    const { fetch, calls } = mockFetch([]);
    const client = new RpcClient("http://x", { fetch });
    await client.lythGetAddressActivity("0x1111111111111111111111111111111111111111", 75, "0x01");
    expect(calls[0].method).toBe("lyth_getAddressActivity");
    expect(calls[0].params).toEqual(["0x1111111111111111111111111111111111111111", 75, "0x01"]);
  });

  it("lyth_agentReputation sends user bech32 provider and defaults category", async () => {
    const providerHex = "0x123456789abcdef0112233445566778899aabbcc";
    const provider = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
    const { fetch, calls } = mockFetch({
      schemaVersion: 1,
      provider,
      categoryId: 0,
      categoryScope: "global",
      record: {
        provider,
        categoryId: 0,
        blockHeight: 123,
        speedSumX10: 460,
        qualitySumX10: 450,
        communicationSumX10: 440,
        accuracySumX10: 430,
        sampleCount: 5,
        avgSpeedX10: 92,
        avgQualityX10: 90,
        avgCommunicationX10: 88,
        avgAccuracyX10: 86,
      },
    });
    const client = new RpcClient("http://x", { fetch });

    const reputation = await client.lythAgentReputation(providerHex);

    expect(reputation.categoryScope).toBe("global");
    expect(reputation.record?.avgSpeedX10).toBe(92);
    expect(calls[0].method).toBe("lyth_agentReputation");
    expect(calls[0].params).toEqual([provider, 0]);
  });

  it("lyth_agentReputation forwards explicit category for mono provider", async () => {
    const provider = "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4";
    const { fetch, calls } = mockFetch({
      schemaVersion: 1,
      provider,
      categoryId: 7,
      categoryScope: "category",
      record: null,
    });
    const client = new RpcClient("http://x", { fetch });

    await expect(client.lythAgentReputation(provider, 7)).resolves.toMatchObject({
      categoryId: 7,
      record: null,
    });
    expect(calls[0].method).toBe("lyth_agentReputation");
    expect(calls[0].params).toEqual([provider, 7]);
  });

  it("lyth_agentReputation rejects non-user provider addresses before fetch", async () => {
    const { fetch, calls } = mockFetch(null);
    const client = new RpcClient("http://x", { fetch });
    const contract = addressToTypedBech32(
      "contract",
      "0x123456789abcdef0112233445566778899aabbcc",
    );

    await expect(client.lythAgentReputation(contract)).rejects.toMatchObject({
      kind: "malformed",
    });
    expect(calls).toHaveLength(0);
  });

  it("lyth_nativeReceipt reads typed RISC-V receipt metadata and event rows", async () => {
    const txHash = `0x${"22".repeat(32)}`;
    const decoded = {
      block_height: 100,
      tx_index: 0,
      sequence: 0,
      family: "agent",
      event_name: "agent.escrow.created",
      payload_hash: `0x${"44".repeat(32)}`,
    };
    const { fetch, calls } = mockFetch({
      txHash,
      blockHash: `0x${"33".repeat(32)}`,
      blockHeight: 100,
      txIndex: 0,
      schema: "riscv.receipt.v1",
      artifactHash: `0x${"aa".repeat(32)}`,
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
    });
    const client = new RpcClient("http://x", { fetch });

    const receipt = await client.lythNativeReceipt(txHash);

    expect(receipt.artifactHash).toBe(`0x${"aa".repeat(32)}`);
    expect(receipt.counters).toEqual({ cycles: 44, syscallUnits: 3, stateIoUnits: 2 });
    expect(receipt.fee.total_lythoshi).toBe("440000000000");
    expect(receipt.fee.total_lyth).toBe("4,400");
    expect(receipt.fee.cycles_used).toBe(44);
    expect(receipt.fee.state_io_units).toBe(2);
    expect(receipt.nativeDeltaCount).toBe(0);
    expect(receipt.eventCount).toBe(1);
    expect(receipt.events[0].address).toBe("monoc1nativeeventemitter");
    expect(receipt.events[0].eventTopic).toBe(`0x${"11".repeat(32)}`);
    expect(receipt.events[0].decoded).toEqual(decoded);
    expect(receipt.events[0].decodedJson).toBe(JSON.stringify(decoded));
    expect(calls[0].method).toBe("lyth_nativeReceipt");
    expect(calls[0].params).toEqual([txHash]);
  });

  it("lythNativeReceiptEvents consumes typed native events from lyth_nativeReceipt", async () => {
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
    const { fetch, calls } = mockFetch({
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
          decoded: null,
          decodedJson: JSON.stringify(decoded),
        },
      ],
      source: {
        chainProvider: "mock_chain",
        indexerProvider: "native_events",
        metadataLogIndex: 0xffff_ffff,
      },
    });
    const client = new RpcClient("http://x", { fetch });

    const events = await client.lythNativeReceiptEvents<AgentEscrowCreatedEvent>(txHash, {
      family: "agent",
      eventName: "agent.escrow.created",
      address: decoded.contract_address,
      eventTopic,
    });

    expect(events).toHaveLength(1);
    expect(events[0].address).toBe("monoc1escrowcontract");
    expect(events[0].decoded.amount_lythoshi).toBe("440000000000");
    expect(events[0].decoded.agent_address.startsWith("mono1")).toBe(true);
    expect(events[0].decoded.contract_address.startsWith("monoc1")).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("lyth_nativeReceipt");
    expect(calls[0].method).not.toBe("lyth_nativeEvents");
    expect(calls[0].params).toEqual([txHash]);
  });

  it("lythNativeEvents sends historical filters and decodes typed rows", async () => {
    const eventTopic = `0x${"11".repeat(32)}`;
    const primaryId = `0x${"77".repeat(32)}`;
    const decoded: AgentEscrowCreatedEvent = {
      block_height: 100,
      tx_index: 0,
      sequence: 0,
      family: "agent",
      event_name: "agent.escrow.created",
      payload_hash: `0x${"44".repeat(32)}`,
      amount_lythoshi: "440000000000",
      agent_address: "mono1agentconsumer",
      contract_address: "monos1nativeeventemitter",
    };
    const { fetch, calls } = mockFetch({
      schemaVersion: 1,
      fromBlock: 100,
      toBlock: 105,
      limit: 25,
      filters: {
        txIndex: 0,
        address: decoded.contract_address,
        eventTopic,
        family: "agent",
        eventName: "agent.escrow.created",
        primaryId,
        account: decoded.agent_address,
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
    });
    const client = new RpcClient("http://x", { fetch });

    const response = await client.lythNativeEventsTyped<AgentEscrowCreatedEvent>({
      fromBlock: "100",
      toBlock: 105n,
      limit: 25,
      txIndex: 0,
      address: decoded.contract_address,
      eventTopic,
      family: "agent",
      eventName: "agent.escrow.created",
      primaryId,
      account: decoded.agent_address,
    });

    expect(response.schemaVersion).toBe(1);
    expect(response.events[0].decoded.amount_lythoshi).toBe("440000000000");
    expect(response.events[0].decoded.agent_address).toBe("mono1agentconsumer");
    expect(calls[0].method).toBe("lyth_nativeEvents");
    expect(calls[0].params).toEqual([
      {
        fromBlock: 100,
        toBlock: 105,
        limit: 25,
        txIndex: 0,
        address: decoded.contract_address,
        eventTopic,
        family: "agent",
        eventName: "agent.escrow.created",
        primaryId,
        account: decoded.agent_address,
      },
    ]);
  });

  it("lythNativeMarketEventsTyped forces market family and filters decoded rows", async () => {
    const eventTopic = `0x${"aa".repeat(32)}`;
    const listingId = `0x${"bb".repeat(32)}`;
    const marketDecoded: NativeMarketSaleEvent = {
      block_height: 110,
      tx_index: 0,
      sequence: 0,
      family: "market",
      event_name: "market.nft.sale_settled",
      payload_hash: `0x${"cc".repeat(32)}`,
      listing_id: listingId,
      price: "900",
    };
    const agentDecoded: AgentEscrowCreatedEvent = {
      block_height: 110,
      tx_index: 0,
      sequence: 1,
      family: "agent",
      event_name: "agent.escrow.created",
      payload_hash: `0x${"dd".repeat(32)}`,
      amount_lythoshi: "1",
      agent_address: "mono1agentconsumer",
      contract_address: "monos1nativeeventemitter",
    };
    const { fetch, calls } = mockFetch({
      schemaVersion: 1,
      fromBlock: 110,
      toBlock: 120,
      limit: 2,
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
          decodedJson: JSON.stringify(marketDecoded),
        },
        {
          blockHeight: 110,
          txIndex: 0,
          logIndex: 1,
          address: "monox1agent",
          eventTopic: `0x${"ee".repeat(32)}`,
          decoded: null,
          decodedJson: JSON.stringify(agentDecoded),
        },
      ],
      source: {
        indexerProvider: "native_events",
      },
    });
    const client = new RpcClient("http://x", { fetch });

    const response = await client.lythNativeMarketEventsTyped<NativeMarketSaleEvent>({
      fromBlock: 110,
      toBlock: 120,
      limit: 2,
      family: "agent",
      eventName: "market.nft.sale_settled",
    });

    expect(response.filters.family).toBe("market");
    expect(response.events).toHaveLength(1);
    expect(response.events[0].decoded.family).toBe("market");
    expect(response.events[0].decoded.listing_id).toBe(listingId);
    expect(calls[0].method).toBe("lyth_nativeEvents");
    expect(calls[0].params).toEqual([
      {
        fromBlock: 110,
        toBlock: 120,
        limit: 2,
        family: "market",
        eventName: "market.nft.sale_settled",
      },
    ]);
  });

  it("live explorer helpers call the new chain RPC surfaces", async () => {
    const address = "0x1111111111111111111111111111111111111111";
    const txHash = `0x${"22".repeat(32)}`;
    const tokenId = `0x${"33".repeat(32)}`;
    const marketId = `0x${"44".repeat(32)}`;
    const { fetch, calls } = mockFetchSequence([
      {
        schemaVersion: 1,
        address,
        kind: "found",
      },
      {
        txHash,
        blockHash: `0x${"55".repeat(32)}`,
        blockNumber: 12,
        txIndex: 0,
        from: address,
        to: null,
        value: "0",
        nonce: 1,
        executionUnitLimit: 21000,
        maxExecutionFeeLythoshi: "1",
        priorityTipLythoshi: "1",
        executionUnitsUsed: 21000,
        fee: {
          total_lythoshi: "21000",
          total_lyth: "0.00021",
          cycles_used: 21000,
          base_price_per_cycle_lythoshi: "1",
          state_io_units: 0,
          state_io_price_per_unit_lythoshi: "0",
          priority_tip_lythoshi: "0",
        },
        decodedCalldata: null,
        memo: null,
        extensions: [{ kind: 0x30, kindHex: "0x30", bodyHex: "0x01", body: "0x01" }],
        round: 12,
        clusterId: null,
        blsAttestation: null,
        pqAttestation: null,
        finalityProof: null,
        logs: [],
        status: "success",
        errorCode: null,
      },
      {
        schemaVersion: 1,
        range: { fromBlock: 10, toBlock: 12 },
        gapRecords: [],
      },
      {
        schemaVersion: 1,
        round: 7,
        parents: [{ vertexHash: `0x${"66".repeat(32)}`, round: 6 }],
      },
      {
        schemaVersion: 1,
        tokenId,
        limit: 5,
        holders: [{ rank: 1, address, balance: "1000", updatedAtBlock: 12 }],
      },
      {
        schemaVersion: 1,
        marketId,
        market: {
          baseToken: tokenId,
          quoteToken: `0x${"77".repeat(32)}`,
          bestBidPrice: "10",
          bestAskPrice: "11",
          lastTradePrice: "0",
          totalVolumeBase: "100",
          takerFeeBps: 15,
          tickSize: "1",
          lotSize: "1",
          minNotional: "10",
          isRegistered: true,
          registeredAtBlock: 9,
        },
      },
    ]);
    const client = new RpcClient("http://x", { fetch });

    await expect(client.lythAddressActivityKind(address)).resolves.toMatchObject({ kind: "found" });
    const decodedTx = await client.lythDecodeTx(txHash);
    expect(decodedTx.status).toBe("success");
    expect(decodedTx.extensions).toEqual([
      { kind: 0x30, kindHex: "0x30", bodyHex: "0x01", body: "0x01" },
    ]);
    await expect(client.lythGapRecords(10n, "12")).resolves.toMatchObject({
      range: { fromBlock: 10, toBlock: 12 },
    });
    await expect(client.lythDagParents("0x7")).resolves.toMatchObject({ round: 7 });
    await expect(client.lythRichList(tokenId, 5)).resolves.toMatchObject({ limit: 5 });
    await expect(client.lythClobMarket(marketId)).resolves.toMatchObject({
      market: { isRegistered: true },
    });

    expect(calls.map((c) => c.method)).toEqual([
      "lyth_addressActivityKind",
      "lyth_decodeTx",
      "lyth_gapRecords",
      "lyth_dagParents",
      "lyth_richList",
      "lyth_clobMarket",
    ]);
    expect(calls.map((c) => c.params)).toEqual([
      [address],
      [txHash],
      [10, 12],
      [7],
      [tokenId, 5],
      [marketId],
    ]);
  });

  it("wraps live explorer aggregate, search, tx feed, and CLOB surfaces", async () => {
    const address = "0x1111111111111111111111111111111111111111";
    const txHash = `0x${"22".repeat(32)}`;
    const marketId = `0x${"44".repeat(32)}`;
    const cursor = `0x${"00".repeat(16)}`;
    const feedCursor = `0x${"11".repeat(12)}`;
    const balanceTokenId = `0x${"aa".repeat(32)}`;
    const balanceAssetId = `0x${"bb".repeat(32)}`;
    const balanceMrcTokenId = `0x${"cc".repeat(32)}`;
    const { fetch, calls } = mockFetchSequence([
      {
        schemaVersion: 1,
        limit: 2,
        markets: [
          {
            marketId,
            tradeCount: 3,
            totalVolumeBase: "900",
            lastPrice: "101",
            lastBlockHeight: 12,
          },
        ],
        source: "indexed_trades",
      },
      {
        schemaVersion: 1,
        marketId,
        limit: 2,
        nextCursor: cursor,
        trades: [
          {
            blockHeight: 12,
            txIndex: 0,
            logIndex: 1,
            marketId,
            takerOrder: `0x${"55".repeat(32)}`,
            makerOrder: `0x${"66".repeat(32)}`,
            price: "101",
            amount: "300",
            taker: address,
            maker: "0x2222222222222222222222222222222222222222",
          },
        ],
      },
      {
        schemaVersion: 1,
        marketId,
        fromBlock: 10,
        toBlock: 20,
        bucketBlocks: 5,
        candles: [
          {
            startBlock: 10,
            endBlock: 14,
            open: "100",
            high: "102",
            low: "99",
            close: "101",
            volumeBase: "900",
            tradeCount: 3,
          },
        ],
      },
      {
        schemaVersion: 1,
        marketId,
        levels: 3,
        bids: [{ price: "100", size: "50" }],
        asks: [{ price: "101", size: "60" }],
      },
      {
        schemaVersion: 1,
        latestHeight: 12,
        limit: 5,
        nextCursor: feedCursor,
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
            fee: {
              total_lythoshi: "21000",
              total_lyth: "0.00021",
              cycles_used: 21000,
              base_price_per_cycle_lythoshi: "1",
              state_io_units: 0,
              state_io_price_per_unit_lythoshi: "0",
              priority_tip_lythoshi: "0",
            },
            input: "0x",
            receipt: { status: 1, executionUnitsUsed: 21000, logsCount: 0 },
          },
        ],
      },
      {
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
            tokenId: balanceTokenId,
            balance: "1000",
            updatedAtBlock: 88,
            mrc: {
              standard: "mrc721",
              assetId: balanceAssetId,
              tokenId: balanceMrcTokenId,
            },
          },
          {
            tokenId: `0x${"dd".repeat(32)}`,
            balance: "0",
            updatedAtBlock: 88,
          },
        ],
      },
      {
        schemaVersion: 1,
        address,
        sampleSize: 1,
        limit: 25,
        totals: {
          inbound: "10",
          outbound: "0",
          swapVolume: "0",
          stake: "0",
          unstake: "0",
        },
        topCounterparties: [],
      },
      {
        schemaVersion: 1,
        query: address,
        hits: [{ type: "address", id: address, route: `/wallet/${address}`, label: "address", score: 100 }],
        nextCursor: null,
      },
      {
        schemaVersion: 1,
        chainId: 69420,
        genesisHash: `0x${"77".repeat(32)}`,
        latestHeight: 12,
        latestBlockHash: `0x${"88".repeat(32)}`,
        latestTimestamp: 1700000000,
        peerCount: 7,
        mempool: { ready: 0, pending: 0, mailboxDepth: 0 },
        indexer: null,
        clusters: { total: 100, pageSize: 100 },
      },
    ]);
    const client = new RpcClient("http://x", { fetch });

    await expect(client.lythClobMarkets(2)).resolves.toMatchObject({ source: "indexed_trades" });
    await expect(client.lythClobTrades(marketId, 2, cursor)).resolves.toMatchObject({
      trades: [{ price: "101" }],
    });
    await expect(client.lythClobOhlc(marketId, 10n, "20", 5)).resolves.toMatchObject({
      candles: [{ close: "101" }],
    });
    await expect(client.lythClobOrderBook(marketId, 3)).resolves.toMatchObject({
      bids: [{ price: "100" }],
    });
    await expect(client.lythTxFeed(5, feedCursor)).resolves.toMatchObject({
      transactions: [{ txHash }],
    });
    const profile = await client.lythAddressProfile(address);
    expect(profile.account.nativeBalance).toBe("100000000");
    expect(profile.tokenBalances[0].mrc?.standard).toBe("mrc721");
    expect(profile.tokenBalances[0].mrc?.assetId).toBe(balanceAssetId);
    expect(profile.tokenBalances[0].mrc?.tokenId).toBe(balanceMrcTokenId);
    expect(profile.tokenBalances[1].mrc).toBeUndefined();
    await expect(client.lythAddressFlow(address, 25)).resolves.toMatchObject({
      totals: { inbound: "10" },
    });
    await expect(client.lythSearch(address, 5)).resolves.toMatchObject({
      hits: [{ type: "address" }],
    });
    await expect(client.lythChainStats()).resolves.toMatchObject({ chainId: 69420 });

    expect(calls.map((c) => c.method)).toEqual([
      "lyth_clobMarkets",
      "lyth_clobTrades",
      "lyth_clobOhlc",
      "lyth_clobOrderBook",
      "lyth_txFeed",
      "lyth_addressProfile",
      "lyth_addressFlow",
      "lyth_search",
      "lyth_chainStats",
    ]);
    expect(calls.map((c) => c.params)).toEqual([
      [2],
      [marketId, 2, cursor],
      [marketId, 10, 20, 5],
      [marketId, 3],
      [5, feedCursor],
      [address],
      [address, 25],
      [address, 5],
      [],
    ]);
  });

  it("wraps node capability, status, vertex, and metrics RPC surfaces", async () => {
    const txHash = `0x${"22".repeat(32)}`;
    const blockHash = `0x${"33".repeat(32)}`;
    const vertexHash = `0x${"44".repeat(32)}`;
    const { fetch, calls } = mockFetchSequence([
      {
        peerCount: 3,
        inboundCount: null,
        outboundCount: null,
        latencyBands: null,
        versionDistribution: { "mono-core/0.1.0": 3 },
        healthSummary: { synced: 2, lagging: 1, stale: 0 },
        asOfBlock: 120,
      },
      {
        schemaVersion: 1,
        surfaces: {
          operator_info: { status: "available" },
          metrics_range: { status: "not_retained", tracking: "MD-CORE-0007" },
        },
      },
      {
        chainId: 69420,
        blockNumber: 256,
        configured: true,
        planCount: 1,
        state: "pending",
        active: null,
        pendingCount: 1,
        pending: [
          {
            upgradeId: "monolythium.v2.0.2",
            activationHeight: 300,
            activationRound: null,
            requiredBinaryVersion: "2.0.2",
            expectedBinaryDigest: "sha256:abc",
            p2pProtocolVersion: 2,
            requiredFeatures: ["foo"],
            milestoneFileDigest: null,
            stateMigrationId: null,
            stateMigrationHash: null,
            expectedPreStateRoot: null,
            expectedPostStateRoot: null,
          },
        ],
      },
      {
        schemaVersion: 1,
        chainId: 69420,
        genesisHash: `0x${"77".repeat(32)}`,
        latestHeight: 256,
        runtime: {
          clientName: "protocore",
          version: "0.2.0",
          gitCommit: "abcdef",
          gitDirty: false,
          buildTimestampUtc: 1700000000,
          rustc: "rustc 1.85.0",
          target: "x86_64-unknown-linux-gnu",
          profile: "release",
          features: "mdbx",
          p2pProtocolVersion: 2,
          binarySha256: "aa".repeat(32),
          stateMigrations: [],
        },
        upgrade: {
          blockNumber: 256,
          configured: true,
          planCount: 1,
          state: "pending",
          active: null,
          pending: [
            {
              upgradeId: "monolythium.v2.0.2",
              activationHeight: 300,
              activationRound: null,
              requiredBinaryVersion: "2.0.2",
              expectedBinaryDigest: "sha256:abc",
              p2pProtocolVersion: 2,
              requiredFeatures: ["foo"],
              milestoneFileDigest: null,
              stateMigrationId: null,
              stateMigrationHash: null,
              expectedPreStateRoot: null,
              expectedPostStateRoot: null,
            },
          ],
        },
      },
      {
        status: "found",
        txHash,
        blockHash,
        blockNumber: 120,
        txIndex: 1,
      },
      {
        schemaVersion: 1,
        round: 7,
        vertices: [{ vertexHash, author: 3 }],
      },
      {
        schemaVersion: 1,
        range: [10, 12],
        tracking: "MD-CORE-0007",
        series: [
          {
            selector: "committed_round",
            status: "available",
            unit: "round",
            samples: [{ blockNumber: 12, value: 7 }],
          },
        ],
      },
    ]);
    const client = new RpcClient("http://x", { fetch });

    await expect(client.lythPeerSummary()).resolves.toMatchObject({ peerCount: 3 });
    await expect(client.lythOperatorCapabilities()).resolves.toMatchObject({
      surfaces: { operator_info: { status: "available" } },
    });
    await expect(client.lythUpgradeStatus(256)).resolves.toMatchObject({
      state: "pending",
      pendingCount: 1,
    });
    await expect(client.lythRuntimeProvenance()).resolves.toMatchObject({
      runtime: { clientName: "protocore", p2pProtocolVersion: 2 },
      upgrade: { state: "pending" },
    });
    await expect(client.lythTxStatus(txHash)).resolves.toMatchObject({
      status: "found",
      blockNumber: 120,
    });
    await expect(client.lythVerticesAtRound("0x7")).resolves.toMatchObject({
      vertices: [{ author: 3 }],
    });
    await expect(
      client.lythMetricsRange(["committed_round", "mempool_depth"], [10n, "12"]),
    ).resolves.toMatchObject({
      range: [10, 12],
      series: [{ selector: "committed_round" }],
    });

    expect(calls.map((c) => c.method)).toEqual([
      "lyth_peerSummary",
      "lyth_operatorCapabilities",
      "lyth_upgradeStatus",
      "lyth_runtimeProvenance",
      "lyth_txStatus",
      "lyth_verticesAtRound",
      "lyth_metricsRange",
    ]);
    expect(calls.map((c) => c.params)).toEqual([
      [],
      [],
      ["0x100"],
      [],
      [txHash],
      [7],
      [["committed_round", "mempool_depth"], [10, 12]],
    ]);
  });

  it("lyth_indexerStatus returns null when the wire returns null", async () => {
    const { fetch } = mockFetch(null);
    const client = new RpcClient("http://x", { fetch });
    const v = await client.lythIndexerStatus();
    expect(v).toBeNull();
  });

  it("lyth_capabilities forwards an optional block selector", async () => {
    const { fetch, calls } = mockFetch({ blockNumber: 256, capabilities: {} });
    const client = new RpcClient("http://x", { fetch });
    await client.lythCapabilities(256);
    expect(calls[0].method).toBe("lyth_capabilities");
    expect(calls[0].params).toEqual(["0x100"]);
  });

  it("lyth_getLatestCheckpoint accepts bigint heights", async () => {
    const { fetch, calls } = mockFetch([]);
    const client = new RpcClient("http://x", { fetch });
    await client.lythGetLatestCheckpoint(150n);
    expect(calls[0].method).toBe("lyth_getLatestCheckpoint");
    expect(calls[0].params).toEqual(["0x96"]);
  });

  it("lyth_getClusterResignations preserves status-only filters", async () => {
    const { fetch, calls } = mockFetch({ rows: [] });
    const client = new RpcClient("http://x", { fetch });
    await client.lythGetClusterResignations(null, "pending");
    expect(calls[0].method).toBe("lyth_getClusterResignations");
    expect(calls[0].params).toEqual([null, "pending"]);
  });

  it("certificate helpers encode rounds and block refs", async () => {
    const digest = `0x${"11".repeat(32)}`;
    const { fetch, calls } = mockFetchSequence([null, null, null]);
    const client = new RpcClient("http://x", { fetch });
    await client.lythGetBlsRoundCertificate(42n);
    await client.lythGetLeaderCertificate(43n, 2, digest);
    await client.lythGetDacCertificate(44n, 3, digest);
    expect(calls.map((c) => c.method)).toEqual([
      "lyth_getBlsRoundCertificate",
      "lyth_getLeaderCertificate",
      "lyth_getDacCertificate",
    ]);
    expect(calls.map((c) => c.params)).toEqual([
      ["0x2a"],
      ["0x2b", 2, digest],
      ["0x2c", 3, digest],
    ]);
  });

  it("operator monitoring helpers normalize typed live windows", async () => {
    const operatorId = `0x${"aa".repeat(32)}`;
    const blsPubkey = `0x${"bb".repeat(48)}`;
    const { fetch, calls } = mockFetchSequence([
      {
        schemaVersion: 1,
        operatorId,
        authorityIndex: 2,
        blsPubkey,
        active: true,
      },
      {
        schemaVersion: 1,
        authorityIndex: 2,
        currentRound: "1042",
        limit: 3,
        entries: [
          { round: 1042, status: "signed" },
          { round: "1041", status: "missed" },
          { round: "0x410", status: "delayed" },
        ],
      },
      {
        schemaVersion: 1,
        authorityIndex: 2,
        currentRound: 100,
        horizonRounds: 10,
        duties: {
          attestation: {
            startRound: 101,
            endRound: "110",
            kind: "attestation_every_round",
          },
          blockProduction: { reason: "not_predictable_in_advance" },
          sync: { reason: "not_implemented" },
          keyRotation: {
            nextRound: "0x80",
            epochLengthRounds: 64,
          },
        },
      },
      {
        schemaVersion: 1,
        authorityIndex: 2,
        dataHeight: "120",
        windowRounds: 100,
        missedRounds: 4,
        observedRounds: 80,
        missRateBps: 500,
        thresholdBps: 5000,
        remainingHeadroomBps: 4500,
        jailStatus: {
          jailed: false,
          tombstoned: false,
          jailedUntilHeight: "0",
          unjailCount: "1",
        },
        reasons: ["near_threshold"],
      },
    ]);
    const client = new RpcClient("http://x", { fetch });

    const authority = await client.lythResolveOperatorAuthority(operatorId);
    const activity = await client.lythSigningActivity(2, 3);
    const duties = await client.lythUpcomingDuties(2, 10);
    const risk = await client.lythOperatorRisk(2, 100);

    expect(authority).toEqual({
      schemaVersion: 1,
      operatorId,
      authorityIndex: 2,
      blsPubkey,
      active: true,
    });
    expect(activity.currentRound).toBe(1042n);
    expect(activity.entries.map((row) => [row.round, row.status])).toEqual([
      [1042n, "signed"],
      [1041n, "missed"],
      [1040n, "delayed"],
    ]);
    expect(duties.duties.attestation.startRound).toBe(101n);
    expect(duties.duties.attestation.endRound).toBe(110n);
    expect(duties.duties.keyRotation).toEqual({
      nextRound: 128n,
      epochLengthRounds: 64n,
    });
    expect(risk.dataHeight).toBe(120n);
    expect(risk.jailStatus).toEqual({
      jailed: false,
      tombstoned: false,
      jailedUntilHeight: 0n,
      unjailCount: 1n,
    });

    expect(calls.map((c) => c.method)).toEqual([
      "lyth_resolveOperatorAuthority",
      "lyth_signingActivity",
      "lyth_upcomingDuties",
      "lyth_operatorRisk",
    ]);
    expect(calls.map((c) => c.params)).toEqual([
      [operatorId],
      [2, 3],
      [2, 10],
      [2, 100],
    ]);
  });

  it("operator and cluster directory helpers use forward RPC surfaces", async () => {
    const operatorId = `0x${"12".repeat(32)}`;
    const blsPubkey = `0x${"34".repeat(48)}`;
    const { fetch, calls } = mockFetchSequence([
      {
        operatorId,
        moniker: null,
        alias: "volans",
        chainAddress: "0x1111111111111111111111111111111111111111",
        bonded: true,
        commissionBps: null,
        delegationCount: 7,
        bondedAmount: "50000000000000000000",
        activeClusterIds: [0, "0x2"],
        operatorKeyFingerprint: null,
        blsKeyFingerprint: `bls12-381:${blsPubkey}`,
        lifecycleState: "active",
        capability: { bondedAmount: "stable", moniker: "planned" },
      },
      {
        clusterId: 0,
        threshold: 5,
        size: 7,
        live: 7,
        lagging: 0,
        offline: 0,
        maintenance: 0,
        members: [{ operatorId, blsPubkey, state: "active" }],
        epoch: "0x10",
        round: "42",
        quorum: "ok",
        reputationScore: null,
        livenessScore: 99,
        lastUpdateHeight: "0x100",
      },
      {
        page: 0,
        limit: 25,
        totalClusters: 100,
        clusters: [
          {
            clusterId: 0,
            size: 7,
            threshold: 5,
            aggregateHealth: "ok",
            regionDiversity: null,
            active: true,
          },
        ],
      },
    ]);
    const client = new RpcClient("http://x", { fetch });

    const operator = await client.lythOperatorInfo(operatorId);
    const cluster = await client.lythClusterStatus(0);
    const directory = await client.lythClusterDirectory(0, 25);

    expect(operator.activeClusterIds).toEqual([0, 2]);
    expect(operator.alias).toBe("volans");
    expect(cluster.epoch).toBe(16n);
    expect(cluster.round).toBe(42n);
    expect(cluster.lastUpdateHeight).toBe(256n);
    expect(cluster.members[0]).toEqual({ operatorId, blsPubkey, state: "active" });
    expect(directory.totalClusters).toBe(100);
    expect(directory.clusters[0].aggregateHealth).toBe("ok");

    expect(calls.map((c) => c.method)).toEqual([
      "lyth_operatorInfo",
      "lyth_clusterStatus",
      "lyth_clusterDirectory",
    ]);
    expect(calls.map((c) => c.params)).toEqual([[operatorId], [0], [0, 25]]);
  });

  it("wraps public-service probe read and signed report transport", async () => {
    const peerId = `0x${"12".repeat(32)}`;
    const digest = `0x${"34".repeat(32)}`;
    const reporter = `0x${"56".repeat(20)}`;
    const { fetch, calls } = mockFetchSequence([
      {
        serviceMask: NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API,
        status: "reachable",
        statusCode: SERVICE_PROBE_STATUS.REACHABLE,
        lastProbeBlock: 123,
        latencyMs: 42,
        probeDigest: digest,
        reporter,
      },
      null,
      {
        txHash: `0x${"78".repeat(32)}`,
        peerId,
        serviceMask: NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API,
        statusCode: SERVICE_PROBE_STATUS.REACHABLE,
      },
    ]);
    const client = new RpcClient("http://x", { fetch });

    await expect(
      client.lythGetServiceProbe(peerId, NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API),
    ).resolves.toMatchObject({
      status: "reachable",
      lastProbeBlock: 123,
      latencyMs: 42,
    });
    await expect(
      client.lythGetServiceProbe(peerId, NODE_REGISTRY_CAPABILITIES.SERVES_RPC),
    ).resolves.toBeNull();
    await expect(
      client.lythReportServiceProbe({
        peerId,
        serviceMask: NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API,
        status: SERVICE_PROBE_STATUS.REACHABLE,
        latencyMs: 42,
        probeDigest: digest,
        signedRawTx: "0x0102",
      }),
    ).resolves.toMatchObject({
      peerId,
      serviceMask: NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API,
      statusCode: SERVICE_PROBE_STATUS.REACHABLE,
    });

    expect(calls.map((c) => c.method)).toEqual([
      "lyth_getServiceProbe",
      "lyth_getServiceProbe",
      "lyth_reportServiceProbe",
    ]);
    expect(calls.map((c) => c.params)).toEqual([
      [peerId, NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API],
      [peerId, NODE_REGISTRY_CAPABILITIES.SERVES_RPC],
      [
        {
          peerId,
          serviceMask: NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API,
          status: SERVICE_PROBE_STATUS.REACHABLE,
          latencyMs: 42,
          probeDigest: digest,
          signedRawTx: "0x0102",
        },
      ],
    ]);
  });
});

describe("mesh_* methods", () => {
  it("mesh_buildUnsignedTx wraps the intent object", async () => {
    const { fetch, calls } = mockFetch({
      unsigned_tx: "0x01",
      sighash: `0x${"00".repeat(32)}`,
    });
    const client = new RpcClient("http://x", { fetch });
    await client.meshBuildUnsignedTx({
      nonce: "0x0",
      max_fee_per_gas: "0x2540be400",
      max_priority_fee_per_gas: "0x2540be400",
      gas_limit: "0x5208",
      to: "0x1111111111111111111111111111111111111111",
      value: "0x0",
    });
    expect(calls[0].method).toBe("mesh_buildUnsignedTx");
    expect(calls[0].params).toEqual([
      expect.objectContaining({
        nonce: "0x0",
        max_fee_per_gas: "0x2540be400",
        max_priority_fee_per_gas: "0x2540be400",
      }),
    ]);
  });

  it("mesh_combineTx, mesh_decodeTx, and mesh_submitTx call canonical methods", async () => {
    const { fetch, calls } = mockFetchSequence([
      { signed_tx: "0x02" },
      { chain_id: "0x10f2c", nonce: "0x0", max_priority_fee_per_gas: "1", max_fee_per_gas: "1", gas_limit: 21000, to: null, value: "0", input: "0x" },
      `0x${"22".repeat(32)}`,
    ]);
    const client = new RpcClient("http://x", { fetch });
    await client.meshCombineTx("0x01", "0x02", "ml_dsa_65", "0x03");
    await client.meshDecodeTx("0x02", true);
    await client.meshSubmitTx("0x02");
    expect(calls.map((c) => c.method)).toEqual([
      "mesh_combineTx",
      "mesh_decodeTx",
      "mesh_submitTx",
    ]);
    expect(calls.map((c) => c.params)).toEqual([
      ["0x01", "0x02", "ml_dsa_65", "0x03"],
      ["0x02", true],
      ["0x02"],
    ]);
  });
});

describe("error handling", () => {
  it("converts a JSON-RPC error envelope into SdkError.rpc", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          error: { code: -32601, message: "method not found" },
        }),
        { status: 200 },
      );
    const client = new RpcClient("http://x", { fetch: fetchImpl });
    await expect(client.ethChainId()).rejects.toMatchObject({
      kind: "rpc",
      code: -32601,
    });
  });

  it("treats a missing result-and-error as malformed", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1 }), { status: 200 });
    const client = new RpcClient("http://x", { fetch: fetchImpl });
    await expect(client.ethChainId()).rejects.toMatchObject({
      kind: "malformed",
    });
  });

  it("transport failures surface as SdkError.transport", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    const client = new RpcClient("http://x", { fetch: fetchImpl });
    await expect(client.ethChainId()).rejects.toMatchObject({
      kind: "transport",
    });
  });
});

describe("parseQuantity", () => {
  it("handles common shapes", () => {
    expect(parseQuantity("0x0")).toBe(0);
    expect(parseQuantity("0x")).toBe(0);
    expect(parseQuantity("0xff")).toBe(255);
    expect(parseQuantityBig("0x10f2c")).toBe(69420n);
  });

  it("rejects malformed hex", () => {
    expect(() => parseQuantity("0xZZ")).toThrow(SdkError);
  });

  it("rejects values that overflow safe-integer range", () => {
    expect(() => parseQuantity("0xffffffffffffffff")).toThrow(SdkError);
  });
});
