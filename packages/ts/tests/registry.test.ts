import { describe, expect, it } from "vitest";
import {
  CHAIN_REGISTRY,
  CHAIN_REGISTRY_RAW_BASE,
  RpcClient,
  TESTNET_69420,
  fetchChainInfoLatest,
  getP2pSeeds,
  getNoEvmReceiptTrustPolicy,
  getRpcEndpoints,
  noEvmReceiptTrustPolicyFromChainInfo,
  parseChainRegistryToml,
} from "../src/index.js";

const ARCHIVE_PUBLIC_KEY = `0x${"11".repeat(1952)}`;
const TESTNET_TOML = `
chain_id     = 69420
network      = "testnet-69420"
display_name = "Monolythium Testnet"
genesis_hash = "0x325057e476b7be3730a22c92b9289f4a14a3414a2a081bd279b43eeba36b0075"
binary_sha   = "44a9ec4"

[[rpc]]
url      = "https://rpc.monolythium.com"
provider = "monolythium"
tier     = "official"

[[p2p]]
multiaddr = "/dns4/p2p.monolythium.com/tcp/29898/p2p/12D3KooWDKk9ALxqchazXGcRGbqyopWtAGRbf4WQFS2dABV7gQGb"
`;

describe("chain registry snapshot", () => {
  it("vendors the public testnet RPC endpoints", () => {
    expect(TESTNET_69420.chain_id).toBe(69420);
    expect(TESTNET_69420.genesis_hash).toBe(
      "0xbe1b3a3c25c0a40a9faa9ca1b434991406f71f0e93c76c083a0e7ba44a47d33a",
    );
    expect(TESTNET_69420.binary_sha).toBe("da04f8f5");
    expect(getRpcEndpoints("testnet-69420").map((r) => r.url)).toEqual([
      "http://5.78.236.250:8545",
      "http://5.78.233.163:8545",
      "http://5.78.226.88:8545",
      "http://5.78.195.220:8545",
      "http://5.78.233.251:8545",
      "http://5.78.235.111:8545",
      "http://5.78.236.36:8545",
      "http://5.78.229.250:8545",
      "http://178.105.12.9:8545",
      "http://5.223.85.76:8545",
      "http://116.202.8.181:8545",
      "http://46.225.26.24:8545",
      "http://168.119.181.105:8545",
      "http://65.108.94.1:8545",
      "http://5.78.231.123:8545",
      "http://178.105.15.216:8545",
      "http://142.132.180.99:8545",
      "http://178.104.98.80:8545",
      "http://178.105.218.151:8545",
      "http://95.216.154.155:8545",
      "http://46.62.214.97:8545",
      "http://5.78.239.10:8545",
      "http://178.104.233.182:8545",
      "http://87.99.145.48:8545",
      "http://162.55.54.198:8545",
      "http://49.12.14.148:8545",
      "http://49.12.40.11:8545",
      "http://95.217.156.190:8545",
    ]);
    expect(getP2pSeeds("testnet-69420")).toHaveLength(28);
    expect(getP2pSeeds("testnet-69420")[0]?.multiaddr).toBe(
      "/ip4/5.78.236.250/tcp/29898/p2p/12D3KooWQoTGcgyArEpPVBLWtF2F6oApy9t4fHHZtVTWfi2hTCmY",
    );
  });

  it("constructs a client from the first registry endpoint without probing", async () => {
    const client = await RpcClient.forNetwork("testnet-69420");
    expect(client.endpoint).toBe("http://5.78.236.250:8545");
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
      url: "https://rpc.monolythium.com",
      provider: "monolythium",
      tier: "official",
    });
    expect(parsed.p2p[0].multiaddr).toContain("/dns4/p2p.monolythium.com/");
  });

  it("parses optional native receipt trust policy metadata without trusting by default", () => {
    expect(getNoEvmReceiptTrustPolicy("testnet-69420")).toBeNull();

    const parsed = parseChainRegistryToml(`
${TESTNET_TOML}
[receipt_proof_trust.archive]
signature_threshold = 1
valid_from_height = 0

[[receipt_proof_trust.archive.signers]]
public_key = "${ARCHIVE_PUBLIC_KEY}"
signer_id = "0x${"33".repeat(20)}"
notes = "fixture signer"
`);

    expect(parsed.receipt_proof_trust?.archive?.signature_threshold).toBe(1);
    expect(parsed.receipt_proof_trust?.archive?.signers[0]?.public_key).toBe(ARCHIVE_PUBLIC_KEY);

    const policy = noEvmReceiptTrustPolicyFromChainInfo(parsed);
    expect(policy?.chainId).toBe(69420);
    expect(policy?.archive?.threshold).toBe(1);
    expect(policy?.archive?.trustedSigners[0]?.publicKey).toHaveLength(1952);
    expect(policy?.archive?.trustedSigners[0]?.signerId).toBe(`0x${"33".repeat(20)}`);
  });

  it("fetches latest registry files from the chain-registry master branch", () => {
    expect(CHAIN_REGISTRY_RAW_BASE).toBe(
      "https://raw.githubusercontent.com/monolythium/chain-registry/master/chains",
    );
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
