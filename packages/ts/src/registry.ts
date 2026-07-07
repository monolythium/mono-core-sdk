/**
 * Chain-registry snapshot and helpers.
 *
 * Source of truth:
 * https://github.com/monolythium/chain-registry
 *
 * The SDK vendors a release-time snapshot so callers can bootstrap without
 * network access to GitHub. Callers that want the newest registry state can
 * opt into `fetchChainRegistryLatest()`.
 */

import { ML_DSA_65_PUBLIC_KEY_LEN } from "./crypto/ml-dsa.js";
import { hexToBytes } from "./crypto/bytes.js";
import type { NoEvmReceiptTrustPolicy } from "./receipt-proof.js";

export type NetworkSlug = "testnet-69420";

export interface RpcEndpoint {
  url: string;
  provider: string;
  region?: string;
  tier: "official" | "community";
  archive?: boolean;
  ws_url?: string;
  notes?: string;
}

export interface P2pSeed {
  multiaddr: string;
  region?: string;
}

export interface ExplorerEndpoint {
  url: string;
  name: string;
  kind?: "monoscan" | "etherscan-fork" | "custom";
}

export interface ReceiptProofTrustArchiveSigner {
  public_key: string;
  signer_id?: string;
  valid_from_height?: number;
  valid_to_height?: number;
  notes?: string;
}

export interface ReceiptProofTrustArchivePolicy {
  signature_threshold: number;
  valid_from_height?: number;
  valid_to_height?: number;
  signers: ReceiptProofTrustArchiveSigner[];
}

export interface ReceiptProofTrustPolicy {
  archive?: ReceiptProofTrustArchivePolicy;
}

export interface ChainInfo {
  chain_id: number;
  network: NetworkSlug | string;
  display_name?: string;
  description?: string;
  genesis_hash: string;
  binary_sha: string;
  rpc: RpcEndpoint[];
  p2p: P2pSeed[];
  explorer?: ExplorerEndpoint[];
  receipt_proof_trust?: ReceiptProofTrustPolicy;
}

export type ChainRegistry = Record<NetworkSlug | string, ChainInfo>;

export const TESTNET_69420: ChainInfo = {
  chain_id: 69420,
  network: "testnet-69420",
  display_name: "Monolythium Testnet",
  description:
    "Public Monolythium testnet. Testnet state may reset without notice; do not store value on this network.",
  genesis_hash:
    "0xe22733f4d7e013b93f0f825667fcf852cbf7ad1ca31a42a1bfcf1ab6d79c89a3",
  binary_sha: "da04f8f5",
  rpc: [
    // 4 DVT clusters x 10 operators (40 nodes), 7-of-10 threshold, from the
    // 2026-07-07 v0.4.0 4x10 re-genesis. Mirrors chain-registry
    // chains/testnet-69420.toml.
    {
      url: "http://5.78.236.250:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-1",
    },
    {
      url: "http://5.78.233.163:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-2",
    },
    {
      url: "http://5.78.226.88:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-3",
    },
    {
      url: "http://5.78.195.220:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-4",
    },
    {
      url: "http://5.78.233.251:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-5",
    },
    {
      url: "http://5.78.235.111:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-6",
    },
    {
      url: "http://5.78.236.36:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-7",
    },
    {
      url: "http://5.78.229.250:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-8",
    },
    {
      url: "http://5.78.231.123:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-9",
    },
    {
      url: "http://5.78.239.10:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-10",
    },
    {
      url: "http://178.105.12.9:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-11",
    },
    {
      url: "http://65.108.94.1:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-12",
    },
    {
      url: "http://5.223.85.76:8545",
      provider: "monolythium-foundation",
      tier: "official",
      notes: "operator-13",
    },
    {
      url: "http://95.217.156.190:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-14",
    },
    {
      url: "http://178.104.98.80:8545",
      provider: "monolythium-foundation",
      region: "nbg1",
      tier: "official",
      notes: "operator-15",
    },
    {
      url: "http://178.105.218.151:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-16",
    },
    {
      url: "http://46.62.214.97:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-17",
    },
    {
      url: "http://157.180.92.16:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-18",
    },
    {
      url: "http://77.42.67.172:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-19",
    },
    {
      url: "http://46.62.156.131:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-20",
    },
    {
      url: "http://178.105.15.216:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-21",
    },
    {
      url: "http://95.216.154.155:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-22",
    },
    {
      url: "http://142.132.180.99:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-23",
    },
    {
      url: "http://116.202.8.181:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-24",
    },
    {
      url: "http://46.225.26.24:8545",
      provider: "monolythium-foundation",
      region: "nbg1",
      tier: "official",
      notes: "operator-25",
    },
    {
      url: "http://168.119.181.105:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-26",
    },
    {
      url: "http://167.233.235.205:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-27",
    },
    {
      url: "http://167.233.225.50:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-28",
    },
    {
      url: "http://138.199.144.111:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-29",
    },
    {
      url: "http://167.233.224.96:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-30",
    },
    {
      url: "http://178.104.233.182:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-31",
    },
    {
      url: "http://87.99.145.48:8545",
      provider: "monolythium-foundation",
      tier: "official",
      notes: "operator-32",
    },
    {
      url: "http://162.55.54.198:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-33",
    },
    {
      url: "http://49.12.14.148:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-34",
    },
    {
      url: "http://49.12.40.11:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-35",
    },
    {
      url: "http://157.180.72.92:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-36",
    },
    {
      url: "http://77.42.35.183:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-37",
    },
    {
      url: "http://46.62.132.92:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-38",
    },
    {
      url: "http://37.27.35.64:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-39",
    },
    {
      url: "http://5.223.65.201:8545",
      provider: "monolythium-foundation",
      tier: "official",
      notes: "operator-40",
    },
  ],
  p2p: [
    // Operator peer IDs from the 2026-07-07 v0.4.0 4x10 re-genesis
    // (fresh libp2p identities per wipe+redeploy). Mirrors chain-registry
    // chains/testnet-69420.toml.
    {
      multiaddr:
        "/ip4/5.78.236.250/tcp/29898/p2p/12D3KooWKhqR2c9ip7bDXN3SHPfMaHDYMooGBUCVEBpKiVfsXzy6",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/5.78.233.163/tcp/29898/p2p/12D3KooWDghqff7Bu3xQPAuqVCsmWgSoG8jpYbbawDNavoiPB8yD",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/5.78.226.88/tcp/29898/p2p/12D3KooWQsjKqGadAEmVKoUCP347A3xc84JbN1En6GwcsESEMWyP",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/5.78.195.220/tcp/29898/p2p/12D3KooWPtJZD2ePxNyDWrJ1attjZiA2FiM4kPZiowemYyMM6PX5",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/5.78.233.251/tcp/29898/p2p/12D3KooWN6uJqUtb8AEDJNGWeaymp1HrwkJKZawF94o7Xe6C1zBM",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/5.78.235.111/tcp/29898/p2p/12D3KooWFgRDLKrDtJ5oGYDB1vfKxmL5yDJe4jqhrLobr1Th7Tmg",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/5.78.236.36/tcp/29898/p2p/12D3KooWAvY4UHyoMd1GCUtB9121CvTvVqJTohL3o6MTvJSCbYPM",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/5.78.229.250/tcp/29898/p2p/12D3KooWECSLL2shfVVqAsfr7tSnYmRe1UeuCCxHPzRr3QKHevsS",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/5.78.231.123/tcp/29898/p2p/12D3KooWJqGhiJPaB4bTqQ1n197va5EfE2NKeTnHyVZtPzMQ5VNv",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/5.78.239.10/tcp/29898/p2p/12D3KooWQL2hqkZF4N3yDyb2wPhLFbQihxEcqZJDoo711rEFGyDp",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/178.105.12.9/tcp/29898/p2p/12D3KooWKQtYyLQXDBXapjt2UwmMPV8s9TjDyzgXzmQgvvSKLpLJ",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/65.108.94.1/tcp/29898/p2p/12D3KooWQfhPxFknDzw3fn54aqrDMd4TmQLjHRUVPvj8Q1k4ps26",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/5.223.85.76/tcp/29898/p2p/12D3KooWN5eQsz4KW659fXgzzWNqJx5EM3WmQaBHb8qKvVAFyg5z",
    },
    {
      multiaddr:
        "/ip4/95.217.156.190/tcp/29898/p2p/12D3KooW9rMkr7zGdxkHJPu67YUYuo2ZpFhaCeMhVvMPf6AcJMe7",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/178.104.98.80/tcp/29898/p2p/12D3KooWCcDGLBvxr2DzjTpoJUfXr3W9xiXCJUaNAfzZtwSoxQjp",
      region: "nbg1",
    },
    {
      multiaddr:
        "/ip4/178.105.218.151/tcp/29898/p2p/12D3KooWNxNRwPip2e8QeAdFp3CKvay2ceq6LXKU7FU1xHEWxPTP",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/46.62.214.97/tcp/29898/p2p/12D3KooWQ8BwX9AenXzRQEgAJkTG4aCkerQTNa8tKXnro8c5UHGL",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/157.180.92.16/tcp/29898/p2p/12D3KooWMv9gvPNEduebqsU1XqE7nHLexdnMm9JgPxGfsZVm368x",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/77.42.67.172/tcp/29898/p2p/12D3KooWJttyrhP2tQeJYSaMHYWkhv97U7Sk1Ztf9xMuRRXzfbcK",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/46.62.156.131/tcp/29898/p2p/12D3KooWCmNszhmMHqcQ4AjChcvRUkYBcCauHSrZ572ih4pCZW5c",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/178.105.15.216/tcp/29898/p2p/12D3KooWEvJ7TXk71x6Qdb2tXLpZwn1jMAybS8jg3BHtsTcv5rRY",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/95.216.154.155/tcp/29898/p2p/12D3KooWEbqK9AxDS8an6Hr6Botgeapd8tKJ1QKitsiT5XRGrr8N",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/142.132.180.99/tcp/29898/p2p/12D3KooWQqrU7woVz5aV6CmC9Tr9aE1hJZz5fVZe5ftm9tgMaDc9",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/116.202.8.181/tcp/29898/p2p/12D3KooWSCMHjawVh1NL5EFPGm2bpVoSFgR6SecQfB2i6XiTD33F",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/46.225.26.24/tcp/29898/p2p/12D3KooWNHfJsCVHtt1XvsSwfPjiHTiUAhvkwdm89FAo39MkmPrx",
      region: "nbg1",
    },
    {
      multiaddr:
        "/ip4/168.119.181.105/tcp/29898/p2p/12D3KooWPeuMdrpsinV2dcEJF9ihC6VSZVpyM8UX5nfNHq23NAui",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/167.233.235.205/tcp/29898/p2p/12D3KooWFzGV4cPqJtmpaZPezk8KWMmjtBaexZSvKfQ7yXmcZDTd",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/167.233.225.50/tcp/29898/p2p/12D3KooWDAP7fjW46z7HjQQSuphfpcSEWPgXrfyg63fN91KE95V9",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/138.199.144.111/tcp/29898/p2p/12D3KooWEtzQjzFGtAnHEuMMEonmUDKmZxH3BbZFFU46r2M7Nrzd",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/167.233.224.96/tcp/29898/p2p/12D3KooWAhyepSDFVMb3TNMJLywK63RNm1vuzq7Hu91xghP9bpQF",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/178.104.233.182/tcp/29898/p2p/12D3KooWNLuxyXpzfeR2t3ck3Fn5c34QKpVnRrYTQHgHcf8MhXqE",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/87.99.145.48/tcp/29898/p2p/12D3KooWJuFXaVo6ooedLLgCqP6Aiv5fZBWns38pPgVdv6Z8YFfE",
    },
    {
      multiaddr:
        "/ip4/162.55.54.198/tcp/29898/p2p/12D3KooWMHB1Jnioyn8iqVdcR4e9ShS9itn7vPc8mBMVEspR4Hov",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/49.12.14.148/tcp/29898/p2p/12D3KooWMFeuJudHw1akygZBYZ9o93j2TtgPJ6qG8s5MuejKS7Ze",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/49.12.40.11/tcp/29898/p2p/12D3KooWChARBFkhte2A4wbhRikuBNJmVzZ4rK3gyutPq1oynmxf",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/157.180.72.92/tcp/29898/p2p/12D3KooWC8wgFpgdkoyA6VKTnVb9YkJRsCRhxn93QcqPANEeezBm",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/77.42.35.183/tcp/29898/p2p/12D3KooWA44YB3auTGhPAoMpymzhovnugX22DAMMiVhAWoEALB5A",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/46.62.132.92/tcp/29898/p2p/12D3KooWBuJNuPxXFAE5aAwvi8hd1GorHT8CXcF6mDsk2fBeTAB2",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/37.27.35.64/tcp/29898/p2p/12D3KooWC4HaGjR4N4C1H77dvQ8We18u5s37q6bAbcWkrnGTPQNt",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/5.223.65.201/tcp/29898/p2p/12D3KooWFDJTuUoJzqojgdkZ8JXTyn1oibxoAJF9JfqiiKZAWsfB",
    },
  ],
};

export const CHAIN_REGISTRY: ChainRegistry = {
  "testnet-69420": TESTNET_69420,
};

export const CHAIN_REGISTRY_RAW_BASE =
  "https://raw.githubusercontent.com/monolythium/chain-registry/master/chains" as const;

export function getChainInfo(network: NetworkSlug | string): ChainInfo {
  const info = CHAIN_REGISTRY[network];
  if (!info) {
    throw new Error(`unknown Monolythium network: ${network}`);
  }
  return info;
}

export function getRpcEndpoints(network: NetworkSlug | string): readonly RpcEndpoint[] {
  return getChainInfo(network).rpc;
}

export function getP2pSeeds(network: NetworkSlug | string): readonly P2pSeed[] {
  return getChainInfo(network).p2p;
}

export function getNoEvmReceiptTrustPolicy(
  network: NetworkSlug | string,
  registry: ChainRegistry = CHAIN_REGISTRY,
): NoEvmReceiptTrustPolicy | null {
  const info = registry[network];
  if (!info) {
    throw new Error(`unknown Monolythium network: ${network}`);
  }
  return noEvmReceiptTrustPolicyFromChainInfo(info);
}

export function noEvmReceiptTrustPolicyFromChainInfo(
  info: ChainInfo,
): NoEvmReceiptTrustPolicy | null {
  const trust = info.receipt_proof_trust;
  if (trust == null || trust.archive == null) return null;

  const policy: NoEvmReceiptTrustPolicy = { chainId: info.chain_id };
  if (trust.archive != null) {
    policy.archive = {
      threshold: assertSafeIntegerAtLeast(
        trust.archive.signature_threshold,
        1,
        "receipt_proof_trust.archive.signature_threshold",
      ),
      validFromHeight: trust.archive.valid_from_height,
      validToHeight: trust.archive.valid_to_height,
      trustedSigners: trust.archive.signers.map((signer, index) => ({
        publicKey: decodeFixedHex(
          signer.public_key,
          ML_DSA_65_PUBLIC_KEY_LEN,
          `receipt_proof_trust.archive.signers[${index}].public_key`,
        ),
        signerId: signer.signer_id,
        validFromHeight: signer.valid_from_height,
        validToHeight: signer.valid_to_height,
      })),
    };
  }

  return policy;
}

export interface FetchChainRegistryOptions {
  fetch?: typeof fetch;
  rawBaseUrl?: string;
}

export async function fetchChainInfoLatest(
  network: NetworkSlug | string,
  options: FetchChainRegistryOptions = {},
): Promise<ChainInfo> {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const rawBaseUrl = options.rawBaseUrl ?? CHAIN_REGISTRY_RAW_BASE;
  const resp = await fetchImpl(`${rawBaseUrl}/${network}.toml`);
  if (!resp.ok) {
    throw new Error(`failed to fetch chain registry ${network}: HTTP ${resp.status}`);
  }
  return parseChainRegistryToml(await resp.text());
}

export async function fetchChainRegistryLatest(
  networks: readonly (NetworkSlug | string)[] = ["testnet-69420"],
  options: FetchChainRegistryOptions = {},
): Promise<ChainRegistry> {
  const entries = await Promise.all(
    networks.map(async (network) => [network, await fetchChainInfoLatest(network, options)] as const),
  );
  return Object.fromEntries(entries);
}

export function parseChainRegistryToml(input: string): ChainInfo {
  const info: Partial<ChainInfo> & {
    rpc: RpcEndpoint[];
    p2p: P2pSeed[];
    explorer: ExplorerEndpoint[];
    receipt_proof_trust?: ReceiptProofTrustPolicy;
  } = {
    rpc: [],
    p2p: [],
    explorer: [],
  };
  let section:
    | "root"
    | "rpc"
    | "p2p"
    | "explorer"
    | "receipt_proof_trust.archive"
    | "receipt_proof_trust.archive.signers" = "root";
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    if (line === "[[rpc]]") {
      section = "rpc";
      info.rpc.push({ url: "", provider: "", tier: "community" });
      continue;
    }
    if (line === "[[p2p]]") {
      section = "p2p";
      info.p2p.push({ multiaddr: "" });
      continue;
    }
    if (line === "[[explorer]]") {
      section = "explorer";
      info.explorer.push({ url: "", name: "" });
      continue;
    }
    if (line === "[receipt_proof_trust.archive]") {
      section = "receipt_proof_trust.archive";
      ensureReceiptProofTrust(info).archive ??= { signature_threshold: 0, signers: [] };
      continue;
    }
    if (line === "[[receipt_proof_trust.archive.signers]]") {
      section = "receipt_proof_trust.archive.signers";
      const trust = ensureReceiptProofTrust(info);
      trust.archive ??= { signature_threshold: 0, signers: [] };
      trust.archive.signers.push({ public_key: "" });
      continue;
    }
    const match = /^([A-Za-z0-9_]+)\s*=\s*(.+)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = parseTomlScalar(rawValue);
    if (section === "root") {
      (info as Record<string, unknown>)[key] = value;
    } else if (section === "rpc" || section === "p2p" || section === "explorer") {
      const list = info[section];
      const target = list[list.length - 1] as unknown as Record<string, unknown>;
      target[key] = value;
    } else if (section === "receipt_proof_trust.archive") {
      const trust = ensureReceiptProofTrust(info);
      trust.archive ??= { signature_threshold: 0, signers: [] };
      (trust.archive as unknown as Record<string, unknown>)[key] = value;
    } else if (section === "receipt_proof_trust.archive.signers") {
      const archive = ensureReceiptProofTrust(info).archive ??= {
        signature_threshold: 0,
        signers: [],
      };
      const target = archive.signers[archive.signers.length - 1] as unknown as Record<
        string,
        unknown
      >;
      target[key] = value;
    }
  }
  if (!info.network || !info.chain_id || !info.genesis_hash || !info.binary_sha) {
    throw new Error("chain registry TOML is missing required top-level fields");
  }
  if (info.rpc.length === 0 || info.rpc.some((r) => !r.url || !r.provider || !r.tier)) {
    throw new Error("chain registry TOML must include at least one complete rpc endpoint");
  }
  if (info.p2p.length === 0 || info.p2p.some((p) => !p.multiaddr)) {
    throw new Error("chain registry TOML must include at least one p2p seed");
  }
  const out: ChainInfo = {
    chain_id: Number(info.chain_id),
    network: String(info.network),
    display_name: info.display_name ? String(info.display_name) : undefined,
    description: info.description ? String(info.description) : undefined,
    genesis_hash: String(info.genesis_hash),
    binary_sha: String(info.binary_sha),
    rpc: info.rpc,
    p2p: info.p2p,
  };
  if (info.explorer.length > 0) out.explorer = info.explorer;
  if (info.receipt_proof_trust) {
    out.receipt_proof_trust = normalizeReceiptProofTrust(info.receipt_proof_trust);
  }
  return out;
}

function parseTomlScalar(raw: string): string | number | boolean {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

function ensureReceiptProofTrust(
  info: Partial<ChainInfo> & { receipt_proof_trust?: ReceiptProofTrustPolicy },
): ReceiptProofTrustPolicy {
  info.receipt_proof_trust ??= {};
  return info.receipt_proof_trust;
}

function normalizeReceiptProofTrust(trust: ReceiptProofTrustPolicy): ReceiptProofTrustPolicy {
  const out: ReceiptProofTrustPolicy = {};
  if (trust.archive == null) {
    throw new Error("receipt_proof_trust must include an archive policy");
  }
  if (trust.archive != null) {
    const threshold = assertSafeIntegerAtLeast(
      trust.archive.signature_threshold,
      1,
      "receipt_proof_trust.archive.signature_threshold",
    );
    if (trust.archive.signers.length === 0 || trust.archive.signers.some((s) => !s.public_key)) {
      throw new Error("receipt_proof_trust.archive.signers must contain complete signer rows");
    }
    if (threshold > trust.archive.signers.length) {
      throw new Error("receipt_proof_trust.archive.signature_threshold exceeds signer count");
    }
    assertOptionalRange(
      trust.archive.valid_from_height,
      trust.archive.valid_to_height,
      "receipt_proof_trust.archive",
    );
    assertUniqueStrings(
      trust.archive.signers.map((signer) => signer.public_key),
      "receipt_proof_trust.archive.signers.public_key",
    );
    assertUniqueStrings(
      trust.archive.signers.flatMap((signer) => (signer.signer_id ? [signer.signer_id] : [])),
      "receipt_proof_trust.archive.signers.signer_id",
    );
    out.archive = {
      signature_threshold: threshold,
      valid_from_height: optionalSafeInteger(trust.archive.valid_from_height),
      valid_to_height: optionalSafeInteger(trust.archive.valid_to_height),
      signers: trust.archive.signers.map((signer) => {
        assertOptionalRange(
          signer.valid_from_height,
          signer.valid_to_height,
          "receipt_proof_trust.archive.signers",
        );
        return {
          public_key: assertString(
            signer.public_key,
            "receipt_proof_trust.archive.signers.public_key",
          ),
          signer_id: optionalString(signer.signer_id),
          valid_from_height: optionalSafeInteger(signer.valid_from_height),
          valid_to_height: optionalSafeInteger(signer.valid_to_height),
          notes: optionalString(signer.notes),
        };
      }),
    };
  }
  return out;
}

function decodeFixedHex(value: string, expectedLength: number, field: string): Uint8Array {
  const bytes = hexToBytes(assertString(value, field), field);
  if (bytes.length !== expectedLength) {
    throw new Error(`${field} must be ${expectedLength} bytes, got ${bytes.length}`);
  }
  return bytes;
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return value === undefined ? undefined : assertString(value, "optional string field");
}

function optionalSafeInteger(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error("optional integer field must be a non-negative safe integer");
  }
  return Number(value);
}

function assertSafeIntegerAtLeast(value: unknown, min: number, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < min) {
    throw new Error(`${field} must be a safe integer >= ${min}`);
  }
  return Number(value);
}

function assertOptionalRange(from: unknown, to: unknown, field: string): void {
  const start = optionalSafeInteger(from);
  const end = optionalSafeInteger(to);
  if (start != null && end != null && end < start) {
    throw new Error(`${field} valid_to must be >= valid_from`);
  }
}

function assertUniqueStrings(values: readonly string[], field: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = assertString(value, field).toLowerCase();
    if (seen.has(normalized)) {
      throw new Error(`${field} values must be unique`);
    }
    seen.add(normalized);
  }
}

