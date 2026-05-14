/**
 * Chain-registry snapshot and helpers.
 *
 * Source of truth:
 * https://github.com/monolythium-vision/chain-registry
 *
 * The SDK vendors a release-time snapshot so callers can bootstrap without
 * network access to GitHub. Callers that want the newest registry state can
 * opt into `fetchChainRegistryLatest()`.
 */

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
}

export type ChainRegistry = Record<NetworkSlug | string, ChainInfo>;

export const TESTNET_69420: ChainInfo = {
  chain_id: 69420,
  network: "testnet-69420",
  display_name: "Monolythium Testnet",
  description:
    "Live development testnet for Monolythium v4.0 / LythiumDAG-BFT. Foundation-operated. Wipe + regenesis is allowed without notice — do NOT store value on this network.",
  genesis_hash:
    "0x325057e476b7be3730a22c92b9289f4a14a3414a2a081bd279b43eeba36b0075",
  binary_sha: "44a9ec4",
  rpc: [
    {
      url: "http://178.105.15.216:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-2; primary foundation seed (operator-1 offline pending BLS key reissue)",
    },
    {
      url: "http://178.104.233.182:8545",
      provider: "monolythium-foundation",
      region: "nbg1",
      tier: "official",
      notes: "operator-3",
    },
    {
      url: "http://65.108.94.1:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-4",
    },
    {
      url: "http://95.216.154.155:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-5",
    },
    {
      url: "http://87.99.145.48:8545",
      provider: "monolythium-foundation",
      region: "ash",
      tier: "official",
      notes: "operator-6; US east",
    },
    {
      url: "http://5.223.85.76:8545",
      provider: "monolythium-foundation",
      region: "sin",
      tier: "official",
      notes: "operator-7; APAC",
    },
  ],
  p2p: [
    {
      multiaddr:
        "/ip4/178.105.15.216/tcp/29898/p2p/12D3KooWDKk9ALxqchazXGcRGbqyopWtAGRbf4WQFS2dABV7gQGb",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/178.104.233.182/tcp/29898/p2p/12D3KooW9uVG8csFCtSxoFaYBsGzXBgVwQhAw84TGj4dfRi9LH1c",
      region: "nbg1",
    },
    {
      multiaddr:
        "/ip4/65.108.94.1/tcp/29898/p2p/12D3KooWKvkjEVkA64TdbSoVjDW2sWUzgkAMbPZsZvfxZw2W6zVy",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/95.216.154.155/tcp/29898/p2p/12D3KooWCcVjSuERAGzG6Xb3wjUj22fGrgP2QXDJfquxQ72TBMd8",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/87.99.145.48/tcp/29898/p2p/12D3KooWMKw9Qxx7RE3PjQGMZq94C23UDjnTbZCNWFy6Dc4YcCdL",
      region: "ash",
    },
    {
      multiaddr:
        "/ip4/5.223.85.76/tcp/29898/p2p/12D3KooWSTeApBSKR4DpKvJAuqKfHxNhdbNg9mi9u8f4UNfzN5Cu",
      region: "sin",
    },
  ],
};

export const CHAIN_REGISTRY: ChainRegistry = {
  "testnet-69420": TESTNET_69420,
};

export const CHAIN_REGISTRY_RAW_BASE =
  "https://raw.githubusercontent.com/monolythium-vision/chain-registry/master/chains" as const;

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
  const info: Partial<ChainInfo> & { rpc: RpcEndpoint[]; p2p: P2pSeed[]; explorer: ExplorerEndpoint[] } = {
    rpc: [],
    p2p: [],
    explorer: [],
  };
  let section: "root" | "rpc" | "p2p" | "explorer" = "root";
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
    const match = /^([A-Za-z0-9_]+)\s*=\s*(.+)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = parseTomlScalar(rawValue);
    if (section === "root") {
      (info as Record<string, unknown>)[key] = value;
    } else {
      const list = info[section];
      const target = list[list.length - 1] as unknown as Record<string, unknown>;
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
