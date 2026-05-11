import { describe, expect, it } from "vitest";
import {
  CHAIN_REGISTRY,
  RpcClient,
  TESTNET_69420,
  fetchChainInfoLatest,
  getP2pSeeds,
  getRpcEndpoints,
  parseChainRegistryToml,
} from "../src/index.js";

const TESTNET_TOML = `
chain_id     = 69420
network      = "testnet-69420"
display_name = "Monolythium Testnet"
genesis_hash = "0x9e5c92dc48207755617a8067e57537717bed7d43a387a539b993505cb13626c2"
binary_sha   = "b652fd7"

[[rpc]]
url      = "http://178.105.12.9:8545"
provider = "monolythium-foundation"
region   = "fsn1"
tier     = "official"
notes    = "primary"

[[p2p]]
multiaddr = "/ip4/178.105.12.9/tcp/29898/p2p/12D3KooWL5wVP4WaZ4DFqsW5x5bpEvvuba85wnixHjVvAauzM1tA"
region    = "fsn1"
`;

describe("chain registry snapshot", () => {
  it("vendors the live testnet RPC IP list", () => {
    expect(TESTNET_69420.chain_id).toBe(69420);
    expect(TESTNET_69420.genesis_hash).toBe(
      "0x9e5c92dc48207755617a8067e57537717bed7d43a387a539b993505cb13626c2",
    );
    expect(TESTNET_69420.binary_sha).toBe("b652fd7");
    expect(getRpcEndpoints("testnet-69420").map((r) => r.url)).toEqual([
      "http://178.105.12.9:8545",
      "http://178.105.15.216:8545",
      "http://178.104.233.182:8545",
      "http://65.108.94.1:8545",
      "http://95.216.154.155:8545",
      "http://87.99.145.48:8545",
      "http://5.223.85.76:8545",
    ]);
    expect(getP2pSeeds("testnet-69420")).toHaveLength(7);
  });

  it("constructs a client from the first registry endpoint without probing", async () => {
    const client = await RpcClient.forNetwork("testnet-69420");
    expect(client.endpoint).toBe("http://178.105.12.9:8545");
  });

  it("probes endpoints until one answers with the expected chain id", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      calls.push(url);
      if (url.includes("down")) {
        throw new Error("offline");
      }
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x10f2c" }));
    };
    const client = await RpcClient.forNetwork("testnet-69420", {
      probe: true,
      fetch: fetchImpl,
      registry: {
        "testnet-69420": {
          ...CHAIN_REGISTRY["testnet-69420"],
          rpc: [
            { url: "http://down:8545", provider: "x", tier: "official" },
            { url: "http://up:8545", provider: "x", tier: "official" },
          ],
        },
      },
    });
    expect(client.endpoint).toBe("http://up:8545");
    expect(calls).toEqual(["http://down:8545", "http://up:8545"]);
  });

  it("parses the chain-registry TOML shape", () => {
    const parsed = parseChainRegistryToml(TESTNET_TOML);
    expect(parsed.network).toBe("testnet-69420");
    expect(parsed.rpc[0]).toMatchObject({
      url: "http://178.105.12.9:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
    });
    expect(parsed.p2p[0].multiaddr).toContain("/ip4/178.105.12.9/");
  });

  it("can fetch the latest raw registry TOML when explicitly requested", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      expect(String(input)).toBe("https://example.test/testnet-69420.toml");
      return new Response(TESTNET_TOML, { status: 200 });
    };
    const latest = await fetchChainInfoLatest("testnet-69420", {
      fetch: fetchImpl,
      rawBaseUrl: "https://example.test",
    });
    expect(latest.chain_id).toBe(69420);
    expect(latest.rpc).toHaveLength(1);
  });
});
