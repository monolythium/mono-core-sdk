/**
 * Unit tests for `RpcClient`. These all use a stub `fetch` that asserts
 * the wire shape the client emits — no network is touched. The live
 * round-trip suite is under `tests/integration.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { RpcClient, SdkError, parseQuantity, parseQuantityBig } from "../src/index.js";

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
    const result = replies[i++] ?? replies.at(-1);
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
      gas_used: 0,
      gas_limit: 30000000,
    };
    const { fetch, calls } = mockFetch(reply);
    const client = new RpcClient("http://x", { fetch });
    await client.ethGetBlockByNumber(256);
    expect(calls[0].method).toBe("eth_getBlockByNumber");
    expect(calls[0].params).toEqual(["0x100"]);
  });
});

describe("lyth_* methods (Law §13.2 native namespace)", () => {
  it("lyth_validatorSet sends the canonical method string", async () => {
    const { fetch, calls } = mockFetch([]);
    const client = new RpcClient("http://x", { fetch });
    const set = await client.lythValidatorSet();
    expect(set).toEqual([]);
    expect(calls[0].method).toBe("lyth_validatorSet");
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

  it("lyth_getTokenBalances reads indexed asset rows", async () => {
    const { fetch, calls } = mockFetch([]);
    const client = new RpcClient("http://x", { fetch });
    await client.lythGetTokenBalances("0x1111111111111111111111111111111111111111");
    expect(calls[0].method).toBe("lyth_getTokenBalances");
    expect(calls[0].params).toEqual(["0x1111111111111111111111111111111111111111"]);
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

  it("lyth_getAddressActivity forwards limit and cursor", async () => {
    const { fetch, calls } = mockFetch([]);
    const client = new RpcClient("http://x", { fetch });
    await client.lythGetAddressActivity("0x1111111111111111111111111111111111111111", 75, "0x01");
    expect(calls[0].method).toBe("lyth_getAddressActivity");
    expect(calls[0].params).toEqual(["0x1111111111111111111111111111111111111111", 75, "0x01"]);
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
