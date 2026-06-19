import { describe, expect, it } from "vitest";
import type { ChainInfo } from "../src/registry.js";
import { RpcClient } from "../src/client.js";
import {
  OperatorTrustError,
  selectTrustedOperator,
  verifyOperatorGenesis,
} from "../src/operator-trust.js";

const PIN =
  "0x6c76fe490fab7195fc5821b052ca7a90b8fe96e0b18204d28430e97f57751943";
const FORK =
  "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

type Outcome = { result: unknown } | { error: { code: number; message: string } };
type Handler = (method: string) => Outcome | "throw";

/** Per-URL JSON-RPC mock. A handler returning "throw" simulates an unreachable
 *  endpoint (fetch rejects). */
function mockFetch(byUrl: Record<string, Handler>): typeof fetch {
  return (async (url: string, init?: { body?: string }) => {
    const handler = byUrl[String(url)];
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      id: number;
      method: string;
    };
    if (!handler) throw new TypeError(`unreachable ${url}`);
    const out = handler(body.method);
    if (out === "throw") throw new TypeError(`unreachable ${url}`);
    return {
      ok: true,
      status: 200,
      json: async () => ({ jsonrpc: "2.0", id: body.id, ...out }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

const trusted: Handler = (m) =>
  m === "eth_chainId"
    ? { result: "0x10f2c" } // 69420
    : m === "lyth_chainStats"
      ? { result: { chainId: 69420, genesisHash: PIN, latestHeight: 1 } }
      : { result: null };

const forked: Handler = (m) =>
  m === "eth_chainId"
    ? { result: "0x10f2c" }
    : m === "lyth_chainStats"
      ? { result: { chainId: 69420, genesisHash: FORK, latestHeight: 1 } }
      : { result: null };

const noGenesis: Handler = (m) =>
  m === "eth_chainId"
    ? { result: "0x10f2c" }
    : m === "lyth_chainStats"
      ? { result: { chainId: 69420, genesisHash: null, latestHeight: 1 } }
      : { result: null };

const quarantined: Handler = () => ({
  error: { code: -32047, message: "chain quarantined: CheckpointStateRootMismatch" },
});

const wrongChain: Handler = (m) =>
  m === "eth_chainId" ? { result: "0x1" } : { result: null };

function chain(urls: string[]): ChainInfo {
  return {
    chain_id: 69420,
    network: "testnet-69420",
    genesis_hash: PIN,
    binary_sha: "test",
    rpc: urls.map((url) => ({ url, provider: "test", tier: "official" })),
    p2p: [],
  } as unknown as ChainInfo;
}

function client(url: string, fetchImpl: typeof globalThis.fetch): RpcClient {
  return new RpcClient(url, { fetch: fetchImpl });
}

describe("verifyOperatorGenesis", () => {
  it("ok when the operator's genesis matches the pin", async () => {
    const fetch = mockFetch({ "http://op": trusted });
    expect(await verifyOperatorGenesis(client("http://op", fetch), PIN)).toEqual({
      ok: true,
      observed: PIN,
      quarantined: false,
    });
  });

  it("fails (fail-closed) when the operator exposes no genesis", async () => {
    const fetch = mockFetch({ "http://op": noGenesis });
    const v = await verifyOperatorGenesis(client("http://op", fetch), PIN);
    expect(v.ok).toBe(false);
    expect(v.observed).toBeNull();
    expect(v.quarantined).toBe(false);
  });

  it("fails on a different genesis (re-genesis / fork)", async () => {
    const fetch = mockFetch({ "http://op": forked });
    const v = await verifyOperatorGenesis(client("http://op", fetch), PIN);
    expect(v.ok).toBe(false);
    expect(v.observed).toBe(FORK);
  });

  it("flags a quarantined operator", async () => {
    const fetch = mockFetch({ "http://op": quarantined });
    expect(await verifyOperatorGenesis(client("http://op", fetch), PIN)).toEqual({
      ok: false,
      observed: null,
      quarantined: true,
    });
  });
});

describe("selectTrustedOperator", () => {
  it("returns the first operator that proves the pinned genesis", async () => {
    const fetch = mockFetch({ "http://a": noGenesis, "http://b": trusted });
    const c = await selectTrustedOperator(chain(["http://a", "http://b"]), { fetch });
    expect(c.endpoint).toBe("http://b");
  });

  it("throws untrusted when every operator proves no genesis", async () => {
    const fetch = mockFetch({ "http://a": noGenesis, "http://b": noGenesis });
    await expect(
      selectTrustedOperator(chain(["http://a", "http://b"]), { fetch }),
    ).rejects.toMatchObject({ reason: "untrusted" });
  });

  it("throws regenesis when an operator reports a different genesis", async () => {
    const fetch = mockFetch({ "http://a": forked });
    await expect(
      selectTrustedOperator(chain(["http://a"]), { fetch }),
    ).rejects.toMatchObject({ reason: "regenesis" });
  });

  it("throws quarantined when every operator is quarantined", async () => {
    const fetch = mockFetch({ "http://a": quarantined, "http://b": quarantined });
    const err = await selectTrustedOperator(chain(["http://a", "http://b"]), {
      fetch,
    }).catch((e) => e);
    expect(err).toBeInstanceOf(OperatorTrustError);
    expect(err.reason).toBe("quarantined");
  });

  it("throws wrong-chain when the operator reports a different chain id", async () => {
    const fetch = mockFetch({ "http://a": wrongChain });
    await expect(
      selectTrustedOperator(chain(["http://a"]), { fetch }),
    ).rejects.toMatchObject({ reason: "wrong-chain" });
  });

  it("throws unreachable when no operator answers", async () => {
    const fetch = mockFetch({ "http://a": () => "throw" });
    await expect(
      selectTrustedOperator(chain(["http://a"]), { fetch }),
    ).rejects.toMatchObject({ reason: "unreachable" });
  });
});
