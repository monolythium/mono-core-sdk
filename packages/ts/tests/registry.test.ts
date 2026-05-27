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
const BLS_PUBLIC_KEY = `0x${"22".repeat(48)}`;
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
  it("vendors the public testnet RPC endpoint", () => {
    expect(TESTNET_69420.chain_id).toBe(69420);
    expect(TESTNET_69420.genesis_hash).toBe(
      "0xad64b785debc17aef3fb4a8d944c2c7c9156394bb08d5ab576ec85782732f897",
    );
    expect(TESTNET_69420.binary_sha).toBe("058c883");
    expect(getRpcEndpoints("testnet-69420").map((r) => r.url)).toEqual([
      "https://rpc.monolythium.com",
    ]);
    expect(getP2pSeeds("testnet-69420")).toHaveLength(0);
  });

  it("constructs a client from the first registry endpoint without probing", async () => {
    const client = await RpcClient.forNetwork("testnet-69420");
    expect(client.endpoint).toBe("https://rpc.monolythium.com");
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

[receipt_proof_trust.finality]
mode = "cluster"
threshold = 5
committee_size = 7
cluster_public_key = "${BLS_PUBLIC_KEY}"
valid_from_round = 0
`);

    expect(parsed.receipt_proof_trust?.archive?.signature_threshold).toBe(1);
    expect(parsed.receipt_proof_trust?.archive?.signers[0]?.public_key).toBe(ARCHIVE_PUBLIC_KEY);
    expect(parsed.receipt_proof_trust?.finality?.mode).toBe("cluster");

    const policy = noEvmReceiptTrustPolicyFromChainInfo(parsed);
    expect(policy?.chainId).toBe(69420);
    expect(policy?.archive?.threshold).toBe(1);
    expect(policy?.archive?.trustedSigners[0]?.publicKey).toHaveLength(1952);
    expect(policy?.archive?.trustedSigners[0]?.signerId).toBe(`0x${"33".repeat(20)}`);
    expect(policy?.finality?.mode).toBe("cluster");
    if (policy?.finality?.mode === "cluster") {
      expect(policy.finality.clusterPublicKey).toHaveLength(48);
      expect(policy.finality.committeeSize).toBe(7);
      expect(policy.finality.chainId).toBe(69420);
    }
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
