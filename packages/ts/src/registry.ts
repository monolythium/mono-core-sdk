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

const BLS_PUBLIC_KEY_BYTE_LENGTH = 48;

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

export interface ReceiptProofTrustFinalitySigner {
  authority_index: number;
  public_key: string;
  valid_from_round?: number;
  valid_to_round?: number;
  notes?: string;
}

export interface ReceiptProofTrustFinalityPolicy {
  mode: "cluster" | "multisig";
  chain_id?: number;
  threshold: number;
  committee_size?: number;
  cluster_public_key?: string;
  valid_from_round?: number;
  valid_to_round?: number;
  signers?: ReceiptProofTrustFinalitySigner[];
}

export interface ReceiptProofTrustPolicy {
  archive?: ReceiptProofTrustArchivePolicy;
  finality?: ReceiptProofTrustFinalityPolicy;
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
    "0x6c76fe490fab7195fc5821b052ca7a90b8fe96e0b18204d28430e97f57751943",
  binary_sha: "553953b7",
  rpc: [
    {
      url: "http://178.105.12.9:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-1",
    },
    {
      url: "http://178.105.15.216:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-2; primary foundation seed",
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
    {
      url: "http://142.132.180.99:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-8",
    },
    {
      url: "http://95.217.156.190:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-10",
    },
    {
      url: "http://162.55.54.198:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-9",
    },
    {
      url: "http://178.105.45.210:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "relay-1",
    },
    {
      url: "http://65.21.252.34:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "relay-2",
    },
  ],
  p2p: [
    {
      multiaddr:
        "/ip4/178.105.12.9/tcp/29898/p2p/12D3KooWGgh9vYbNSqYbci8w7bg2AAaFWx7umN1ADjjcUoUTF2Za",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/178.105.15.216/tcp/29898/p2p/12D3KooWPUMj4vt1ee1Ug2QMJQwbDHSJ936JVaqw3iLXtAqPrq7R",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/178.104.233.182/tcp/29898/p2p/12D3KooWLPNJFUZhXyc1S7YvjMiKXyrNKCN3eFegDFF5UZAio7NJ",
      region: "nbg1",
    },
    {
      multiaddr:
        "/ip4/65.108.94.1/tcp/29898/p2p/12D3KooWRAuuQa5iEAzLUpLnyZ9VM53dvZMt3FPj7smDcwXn3oxz",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/95.216.154.155/tcp/29898/p2p/12D3KooWFc9sVuCAuLxFTVy8KN5KXhyDvPjKkU98ySK81dFyStN8",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/87.99.145.48/tcp/29898/p2p/12D3KooWL2KLRUHybGLd736nusDRTF2V1a9waeTsxKPwF78HDCmb",
      region: "ash",
    },
    {
      multiaddr:
        "/ip4/5.223.85.76/tcp/29898/p2p/12D3KooWHvobdzzEAiKcFkgdkRfr8vWGyWYfBoWS3jnPycvfwGrK",
      region: "sin",
    },
    {
      multiaddr:
        "/ip4/142.132.180.99/tcp/29898/p2p/12D3KooWBcAeWScYmDWPTjNM47CkKR4vEf44CNhDCcWuGpyY7Hko",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/162.55.54.198/tcp/29898/p2p/12D3KooWRBA5Wzs619GuMY2NrDD6fGoLYCK2tkXff2JAZyXn7RvR",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/95.217.156.190/tcp/29898/p2p/12D3KooWPBr8guuWoZT59AobZEBHDZqKgwHWAP3aKUzKWeGTa7Z6",
      region: "hel1",
    },
    {
      multiaddr:
        "/ip4/178.105.45.210/tcp/29898/p2p/12D3KooWQRpCMLezJmvqqpbpEu8ixGHgonqianG1aVZjw6GiStbd",
      region: "fsn1",
    },
    {
      multiaddr:
        "/ip4/65.21.252.34/tcp/29898/p2p/12D3KooWRGzTwPX21Nee2c39RWuT2ayNWb6NMX19jCx8recrNeXL",
      region: "hel1",
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
  if (trust == null || (trust.archive == null && trust.finality == null)) return null;

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
  if (trust.finality != null) {
    const threshold = assertSafeIntegerAtLeast(
      trust.finality.threshold,
      1,
      "receipt_proof_trust.finality.threshold",
    );
    const chainId = trust.finality.chain_id ?? info.chain_id;
    if (trust.finality.mode === "cluster") {
      if (trust.finality.cluster_public_key == null) {
        throw new Error(
          "receipt_proof_trust.finality.cluster_public_key is required for cluster mode",
        );
      }
      policy.finality = {
        mode: "cluster",
        chainId,
        threshold,
        validFromRound: trust.finality.valid_from_round,
        validToRound: trust.finality.valid_to_round,
        committeeSize: assertSafeIntegerAtLeast(
          trust.finality.committee_size,
          1,
          "receipt_proof_trust.finality.committee_size",
        ),
        clusterPublicKey: decodeFixedHex(
          trust.finality.cluster_public_key,
          BLS_PUBLIC_KEY_BYTE_LENGTH,
          "receipt_proof_trust.finality.cluster_public_key",
        ),
      };
    } else if (trust.finality.mode === "multisig") {
      const signers = trust.finality.signers ?? [];
      policy.finality = {
        mode: "multisig",
        chainId,
        threshold,
        validFromRound: trust.finality.valid_from_round,
        validToRound: trust.finality.valid_to_round,
        trustedSigners: signers.map((signer, index) => ({
          authorityIndex: assertSafeIntegerAtLeast(
            signer.authority_index,
            0,
            `receipt_proof_trust.finality.signers[${index}].authority_index`,
          ),
          publicKey: decodeFixedHex(
            signer.public_key,
            BLS_PUBLIC_KEY_BYTE_LENGTH,
            `receipt_proof_trust.finality.signers[${index}].public_key`,
          ),
          validFromRound: signer.valid_from_round,
          validToRound: signer.valid_to_round,
        })),
      };
    } else {
      throw new Error(
        `unsupported receipt_proof_trust.finality.mode: ${String(trust.finality.mode)}`,
      );
    }
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
    | "receipt_proof_trust.archive.signers"
    | "receipt_proof_trust.finality"
    | "receipt_proof_trust.finality.signers" = "root";
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
    if (line === "[receipt_proof_trust.finality]") {
      section = "receipt_proof_trust.finality";
      ensureReceiptProofTrust(info).finality ??= {
        mode: "cluster",
        threshold: 0,
      };
      continue;
    }
    if (line === "[[receipt_proof_trust.finality.signers]]") {
      section = "receipt_proof_trust.finality.signers";
      const trust = ensureReceiptProofTrust(info);
      trust.finality ??= {
        mode: "multisig",
        threshold: 0,
        signers: [],
      };
      trust.finality.signers ??= [];
      trust.finality.signers.push({ authority_index: 0, public_key: "" });
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
    } else if (section === "receipt_proof_trust.finality") {
      const trust = ensureReceiptProofTrust(info);
      trust.finality ??= { mode: "cluster", threshold: 0 };
      (trust.finality as unknown as Record<string, unknown>)[key] = value;
    } else {
      const finality = ensureReceiptProofTrust(info).finality ??= {
        mode: "multisig",
        threshold: 0,
        signers: [],
      };
      finality.signers ??= [];
      const target = finality.signers[finality.signers.length - 1] as unknown as Record<
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
  if (trust.archive == null || trust.finality == null) {
    throw new Error("receipt_proof_trust must include both archive and finality policies");
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
  if (trust.finality != null) {
    const mode = trust.finality.mode;
    if (mode !== "cluster" && mode !== "multisig") {
      throw new Error(`unsupported receipt_proof_trust.finality.mode: ${String(mode)}`);
    }
    const finality: ReceiptProofTrustFinalityPolicy = {
      mode,
      chain_id: optionalSafeInteger(trust.finality.chain_id),
      threshold: assertSafeIntegerAtLeast(
        trust.finality.threshold,
        1,
        "receipt_proof_trust.finality.threshold",
      ),
      valid_from_round: optionalSafeInteger(trust.finality.valid_from_round),
      valid_to_round: optionalSafeInteger(trust.finality.valid_to_round),
    };
    assertOptionalRange(
      trust.finality.valid_from_round,
      trust.finality.valid_to_round,
      "receipt_proof_trust.finality",
    );
    if (mode === "cluster") {
      finality.committee_size = assertSafeIntegerAtLeast(
        trust.finality.committee_size,
        1,
        "receipt_proof_trust.finality.committee_size",
      );
      if (finality.threshold > finality.committee_size) {
        throw new Error("receipt_proof_trust.finality.threshold exceeds committee_size");
      }
      finality.cluster_public_key = assertString(
        trust.finality.cluster_public_key,
        "receipt_proof_trust.finality.cluster_public_key",
      );
      if ((trust.finality.signers ?? []).length > 0) {
        throw new Error("receipt_proof_trust.finality.signers are invalid in cluster mode");
      }
    } else {
      const signers = trust.finality.signers ?? [];
      if (signers.length === 0 || signers.some((s) => !s.public_key)) {
        throw new Error("receipt_proof_trust.finality.signers must contain complete signer rows");
      }
      if (finality.threshold > signers.length) {
        throw new Error("receipt_proof_trust.finality.threshold exceeds signer count");
      }
      if (trust.finality.committee_size != null || trust.finality.cluster_public_key != null) {
        throw new Error("receipt_proof_trust.finality cluster fields are invalid in multisig mode");
      }
      assertUniqueNumbers(
        signers.map((signer) => signer.authority_index),
        "receipt_proof_trust.finality.signers.authority_index",
      );
      assertUniqueStrings(
        signers.map((signer) => signer.public_key),
        "receipt_proof_trust.finality.signers.public_key",
      );
      finality.signers = signers.map((signer) => {
        assertOptionalRange(
          signer.valid_from_round,
          signer.valid_to_round,
          "receipt_proof_trust.finality.signers",
        );
        return {
          authority_index: assertSafeIntegerAtLeast(
            signer.authority_index,
            0,
            "receipt_proof_trust.finality.signers.authority_index",
          ),
          public_key: assertString(
            signer.public_key,
            "receipt_proof_trust.finality.signers.public_key",
          ),
          valid_from_round: optionalSafeInteger(signer.valid_from_round),
          valid_to_round: optionalSafeInteger(signer.valid_to_round),
          notes: optionalString(signer.notes),
        };
      });
    }
    out.finality = finality;
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

function assertUniqueNumbers(values: readonly number[], field: string): void {
  const seen = new Set<number>();
  for (const value of values) {
    const normalized = assertSafeIntegerAtLeast(value, 0, field);
    if (seen.has(normalized)) {
      throw new Error(`${field} values must be unique`);
    }
    seen.add(normalized);
  }
}
