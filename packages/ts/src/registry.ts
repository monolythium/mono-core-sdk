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
    "Live development testnet for Monolythium / LythiumDAG-BFT. Foundation-operated. Wipe + regenesis is allowed without notice — do NOT store value on this network.",
  genesis_hash:
    "0xbf09dc062e1a3ce71e4fbe5833d1ebe546cce5c9dcbd4de3ee0c693690661666",
  binary_sha: "6d3ab40b8c3d0680242526bc0cb9d221e1055694",
  rpc: [
    {
      url: "http://178.105.45.210:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "relay-0; complete fast-sync closure",
    },
    {
      url: "http://65.21.252.34:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "relay-1; complete fast-sync closure",
    },
    {
      url: "https://rpc.monolythium.com",
      provider: "monolythium-foundation",
      tier: "official",
      notes: "canonical public RPC gateway",
    },
  ],
  p2p: [
    {
      multiaddr: "/ip4/178.105.45.210/tcp/29898/p2p/12D3KooWBwRRSV5SqbFfNfio4hE7tofNkYXwihAwedKo9gV1kT7e",
    },
    {
      multiaddr: "/ip4/65.21.252.34/tcp/29898/p2p/12D3KooWGFQs3NNG8b4x8Sr5yEEFAEjtW3bo3y812f23jPduTp8e",
    },
    {
      multiaddr: "/ip4/5.78.236.250/tcp/29898/p2p/12D3KooWCwpUuYz9Z2S4Tx1Tv9c1TDBahqf1FYThAxTvo4FcyC6K",
    },
    {
      multiaddr: "/ip4/5.78.233.163/tcp/29898/p2p/12D3KooWQdcysuXpAobtXKN8gk8REy4Z2q6nCU9PBXxVhsjFDJ3n",
    },
    {
      multiaddr: "/ip4/5.78.226.88/tcp/29898/p2p/12D3KooWRdoJqb3J9vQeFQmVXC2M7b6gpS5S9CviRhDjuYUYhJUX",
    },
    {
      multiaddr: "/ip4/5.78.195.220/tcp/29898/p2p/12D3KooWD29CQjt2J3rnStfCLUQQuQoffXyLamxyBxez6h33aoGb",
    },
    {
      multiaddr: "/ip4/5.78.233.251/tcp/29898/p2p/12D3KooWHyjKFM7iG28jb6Wdv84uXCYcNFBwFzXcdBAj7jXzwWkS",
    },
    {
      multiaddr: "/ip4/5.78.235.111/tcp/29898/p2p/12D3KooWMFmfcWDvk42tbEQ1Egi8qk5qxADeoMZQZxqSMDSW3Ac5",
    },
    {
      multiaddr: "/ip4/5.78.236.36/tcp/29898/p2p/12D3KooWBT5ZpTrAfhYrQMpYAamSfZY5joovjfYUh1rxJtFkZd4Q",
    },
    {
      multiaddr: "/ip4/5.78.229.250/tcp/29898/p2p/12D3KooWAwUZ7r5nmGcN44Pkgt8Bh9RzcuMTQpnGs45c2WU1SKHZ",
    },
    {
      multiaddr: "/ip4/5.78.231.123/tcp/29898/p2p/12D3KooWEPANYaMGkPnixUd5ok8AWrstp2Vmh6TymS46yoRRnfvz",
    },
    {
      multiaddr: "/ip4/5.78.239.10/tcp/29898/p2p/12D3KooWShsBiPn7a3xEbLrM8m57PdxnJaxuS3gkqjT5yEGNfMCi",
    },
    {
      multiaddr: "/ip4/178.105.12.9/tcp/29898/p2p/12D3KooWCekTa5HRSGq73umoGP3MQawWni9L8MkYF5esamZvERwf",
    },
    {
      multiaddr: "/ip4/65.108.94.1/tcp/29898/p2p/12D3KooWDoMub1v3sUr6N9gQmukajvd4dY1MtTx7QibSWyqd1t4b",
    },
    {
      multiaddr: "/ip4/5.223.85.76/tcp/29898/p2p/12D3KooWAnxVTJnUyM4F2ArXvcg1jpiZwdYWDdwuppxtgv6x3MQn",
    },
    {
      multiaddr: "/ip4/95.217.156.190/tcp/29898/p2p/12D3KooWKd9ZzZGir8PDhGePtbDr3M8HCP3fbYFRY6pctKxMnUav",
    },
    {
      multiaddr: "/ip4/178.104.98.80/tcp/29898/p2p/12D3KooWEJNeGFzHiVjhx4xdw3hUrZ6CLQiZ8p8zzsE4stgSnJnT",
    },
    {
      multiaddr: "/ip4/178.105.218.151/tcp/29898/p2p/12D3KooWKfXaAgUdUjwmdfMimtjRqEfjUNr3jKQf15owVHLkrDtw",
    },
    {
      multiaddr: "/ip4/46.62.214.97/tcp/29898/p2p/12D3KooWFjD8rNM24nYzRFzwjTFrgtkmoDucgQZNuw8muG9h7rWg",
    },
    {
      multiaddr: "/ip4/157.180.92.16/tcp/29898/p2p/12D3KooWABbTVRPiFRu7tWrET9acMcAj69rL8GnsDEPSbNfjnoaH",
    },
    {
      multiaddr: "/ip4/77.42.67.172/tcp/29898/p2p/12D3KooWGNPF7Nc9wr747sdwsL7r3z4pB6uDSJQMdMKrSyj5Jckr",
    },
    {
      multiaddr: "/ip4/46.62.156.131/tcp/29898/p2p/12D3KooWJVTNEj1v4VPRGsougoMrC7DeSD5EN87AvdQpC1Nv1UTp",
    },
    {
      multiaddr: "/ip4/178.105.15.216/tcp/29898/p2p/12D3KooWD9J49QcseGUNHD5c2Ltkt6NAo2CjhoPNqS97MwqLBkbB",
    },
    {
      multiaddr: "/ip4/95.216.154.155/tcp/29898/p2p/12D3KooWDX5efNHV92xNYKLW5mLQ3byzBpib7nQ4EM9pcZmscX38",
    },
    {
      multiaddr: "/ip4/142.132.180.99/tcp/29898/p2p/12D3KooWSefMfBj4sjGS1qAkSt58gKH7LmSYAAoYC97vTFqanxko",
    },
    {
      multiaddr: "/ip4/5.223.65.201/tcp/29898/p2p/12D3KooWJgK9GavECkabaLQAbcyBagkdkSZRwzYqzmyBKtmSQTfb",
    },
    {
      multiaddr: "/ip4/49.12.14.148/tcp/29898/p2p/12D3KooWJVBwBUfBme7TrWYz7RPoQpSat3snnVBvp7QBbPp3jS3G",
    },
    {
      multiaddr: "/ip4/49.12.40.11/tcp/29898/p2p/12D3KooWHWVMH1r6dkvWm5YcnZ8o1PVz5cD5n7EeQhhW8iEGjhzj",
    },
    {
      multiaddr: "/ip4/167.233.235.205/tcp/29898/p2p/12D3KooWCZALvUZ7FfFVtX4X2vTMKSun9goi31YKibExhgfNvwq2",
    },
    {
      multiaddr: "/ip4/167.233.225.50/tcp/29898/p2p/12D3KooWCcn68AyuE8dHGLTiC4q54yF7kH1xcM4takhrhfTyH98P",
    },
    {
      multiaddr: "/ip4/138.199.144.111/tcp/29898/p2p/12D3KooWErQf3YWEamGYUkikrRGqzJbdegefVbgK3vcxmtWFFCGW",
    },
    {
      multiaddr: "/ip4/167.233.224.96/tcp/29898/p2p/12D3KooWANUA7a5UH3GzBQGoqdPPjP12xtxDssDwm63T2wF4fc5d",
    },
    {
      multiaddr: "/ip4/178.104.233.182/tcp/29898/p2p/12D3KooWLf2xe5ErMEhvWWcTFi97Acvx7yCGrFBXX8eBd4uQcDRA",
    },
    {
      multiaddr: "/ip4/87.99.145.48/tcp/29898/p2p/12D3KooWBYx2wyVSc1yvt3KgzZof3vbLCGMUDpTXMWHUF1YdrG4i",
    },
    {
      multiaddr: "/ip4/162.55.54.198/tcp/29898/p2p/12D3KooWGNqdGnWtRaGYLHPwLSMJbKgumufUa8jd2NkBWkawtcie",
    },
    {
      multiaddr: "/ip4/116.202.8.181/tcp/29898/p2p/12D3KooWEURPAegjmZsjdUcqpsQBbHfQcpczLQyEPX6Muj9GfX4c",
    },
    {
      multiaddr: "/ip4/46.225.26.24/tcp/29898/p2p/12D3KooWQjxaGp4YmQeyUwKfpCj9JWuEcLR3rdgqUXU4fakx5eSL",
    },
    {
      multiaddr: "/ip4/168.119.181.105/tcp/29898/p2p/12D3KooWBZtMSTtHDSoFwiP7um7VKkFZAbiGKM3hXZ3pwaNYWmks",
    },
    {
      multiaddr: "/ip4/157.180.72.92/tcp/29898/p2p/12D3KooWHiJunSEWiN19NL1EaCFpR2JnpZhoim1EbW73iLkWC6yZ",
    },
    {
      multiaddr: "/ip4/77.42.35.183/tcp/29898/p2p/12D3KooWRharW9PLLWaxoTB2rzfqkd2WaBLYwwuCKqzwXx4etvwv",
    },
    {
      multiaddr: "/ip4/46.62.132.92/tcp/29898/p2p/12D3KooWDFMgr6Vs9yVvFcEiNnYb5D13gEnMTVGnEGS9jisaAnXi",
    },
    {
      multiaddr: "/ip4/37.27.35.64/tcp/29898/p2p/12D3KooWN8ffm46rovQMitGaTyjFu9RxokaJGLTMu4dsJ4DETzsp",
    },
  ],
  explorer: [
    {
      url: "https://monoscan.xyz",
      name: "Monoscan (testnet)",
      kind: "monoscan",
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
