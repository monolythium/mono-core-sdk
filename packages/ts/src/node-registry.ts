/**
 * Node-registry precompile ABI helpers and service capability constants.
 *
 * These constants mirror `protocore-node-registry::capabilities` and
 * `protocore-node-registry::abi`. They are exported for wallets,
 * service probers, faucets, and operator dashboards that need to build
 * canonical registry transactions without retyping low-level values.
 */

import { blake3 } from "@noble/hashes/blake3.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { PRECOMPILE_ADDRESSES } from "./consts.js";

export const NODE_REGISTRY_CAPABILITIES = {
  SERVES_RPC: 0x0000_0001,
  SERVES_INDEXER: 0x0000_0002,
  SERVES_BROADCASTER: 0x0000_0004,
  SERVES_ARCHIVE: 0x0000_0008,
  SERVES_WEBSOCKET: 0x0000_0010,
  SERVES_LIGHT_CLIENT: 0x0000_0020,
  SERVES_ORACLE_WRITER: 0x0000_0040,
  SERVES_BRIDGE_RELAY: 0x0000_0080,
  SERVES_PUBLIC_API: 0x0000_0100,
  /** GPU prover — may bid on + serve the GPU prover market (MB-4, bit 9). */
  SERVES_GPU_PROVE: 0x0000_0200,
} as const;

/** Maximum basis-point value for any PF-6 diversity term / the headline score. */
export const DIVERSITY_SCORE_MAX = 10_000;

/** BLAKE3 multisig address-derivation domain (cluster-anchor preimage, MB-5). */
export const MULTISIG_ADDRESS_DERIVATION_DOMAIN = "MONO_MULTISIG_BLAKE3_20_V1" as const;

export const NODE_REGISTRY_CAPABILITY_MASK = 0x0000_ffff;

export const NODE_REGISTRY_PUBLIC_SERVICE_MASK =
  NODE_REGISTRY_CAPABILITIES.SERVES_RPC |
  NODE_REGISTRY_CAPABILITIES.SERVES_INDEXER |
  NODE_REGISTRY_CAPABILITIES.SERVES_ARCHIVE |
  NODE_REGISTRY_CAPABILITIES.SERVES_WEBSOCKET |
  NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API;

export const SERVICE_PROBE_STATUS = {
  UNKNOWN: 0,
  REACHABLE: 1,
  DEGRADED: 2,
  UNREACHABLE: 3,
} as const;

export const NODE_REGISTRY_SELECTORS = {
  reportServiceProbe: "0xeee31bba",
  getServiceProbe: "0x1fcbfbce",
  /** `setNetworkMetadata(bytes32,uint16,bytes3,bytes)` — owner-callable (PF-6). */
  setNetworkMetadata: "0x" + selectorHex("setNetworkMetadata(bytes32,uint16,bytes3,bytes)"),
  /** `getOperatorNetworkMetadata(bytes32)` view (PF-6). */
  getOperatorNetworkMetadata: "0x" + selectorHex("getOperatorNetworkMetadata(bytes32)"),
  /** `getClusterDiversity(uint32)` view (PF-6). */
  getClusterDiversity: "0x" + selectorHex("getClusterDiversity(uint32)"),
} as const;

/** Canonical `ClusterFormed(uint32,uint64,address,bytes)` event topic0 (MB-5). */
export const CLUSTER_FORMED_EVENT_SIG = "ClusterFormed(uint32,uint64,address,bytes)" as const;

export interface ReportServiceProbeCalldataArgs {
  peerId: string | Uint8Array | readonly number[];
  serviceMask: number;
  status: number;
  latencyMs: number;
  probeDigest: string | Uint8Array | readonly number[];
}

export class NodeRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NodeRegistryError";
  }
}

export function nodeRegistryAddressHex(): string {
  return PRECOMPILE_ADDRESSES.NODE_REGISTRY.toLowerCase();
}

export function isValidNodeRegistryCapabilities(flags: number): boolean {
  return Number.isInteger(flags) && flags >= 0 && (flags & ~NODE_REGISTRY_CAPABILITY_MASK) === 0;
}

export function isValidPublicServiceProbeMask(mask: number): boolean {
  return (
    Number.isInteger(mask) &&
    mask > 0 &&
    (mask & ~NODE_REGISTRY_PUBLIC_SERVICE_MASK) === 0
  );
}

export function isSinglePublicServiceProbeMask(mask: number): boolean {
  return isValidPublicServiceProbeMask(mask) && bitCount(mask) === 1;
}

export function isConcreteServiceProbeStatus(status: number): boolean {
  return (
    status === SERVICE_PROBE_STATUS.REACHABLE ||
    status === SERVICE_PROBE_STATUS.DEGRADED ||
    status === SERVICE_PROBE_STATUS.UNREACHABLE
  );
}

export function serviceProbeStatusLabel(status: number): string {
  switch (status) {
    case SERVICE_PROBE_STATUS.REACHABLE:
      return "reachable";
    case SERVICE_PROBE_STATUS.DEGRADED:
      return "degraded";
    case SERVICE_PROBE_STATUS.UNREACHABLE:
      return "unreachable";
    default:
      return "unknown";
  }
}

export function encodeReportServiceProbeCalldata(args: ReportServiceProbeCalldataArgs): string {
  if (!isValidPublicServiceProbeMask(args.serviceMask)) {
    throw new NodeRegistryError(
      `serviceMask 0x${args.serviceMask.toString(16).padStart(8, "0")} is not a valid public-service mask`,
    );
  }
  if (!isConcreteServiceProbeStatus(args.status)) {
    throw new NodeRegistryError(`status ${args.status} is not a concrete service-probe outcome`);
  }
  const latencyMs = expectUint32(args.latencyMs, "latencyMs");
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.reportServiceProbe),
      expectLength(toBytes(args.peerId), 32, "peerId"),
      uint32Word(args.serviceMask),
      uint8Word(args.status),
      uint32Word(latencyMs),
      expectLength(toBytes(args.probeDigest), 32, "probeDigest"),
    ),
  );
}

/**
 * Hosting class an operator runs under (PF-6). Mirrors
 * `node-registry::registration::HostingClass`. Any byte outside `0..=2`
 * decodes to `cloud` (the least-diverse class).
 */
export type NodeHostingClass = "bareMetal" | "coLocation" | "cloud";

/** Decode a hosting-class byte. Values outside `0..=2` → `cloud`. */
export function nodeHostingClassFromByte(b: number): NodeHostingClass {
  if (b === 0) return "bareMetal";
  if (b === 1) return "coLocation";
  return "cloud";
}

/** Encode a hosting class to its right-aligned `u8` enum byte. */
export function nodeHostingClassToByte(c: NodeHostingClass): number {
  switch (c) {
    case "bareMetal":
      return 0;
    case "coLocation":
      return 1;
    default:
      return 2;
  }
}

/**
 * `lyth_getOperatorNetworkMetadata` view (PF-6). Mirrors the
 * `(uint16 asn, bytes3 geoRegion, uint8 hostingClass, bytes32
 * ipAddressHash, bytes32 pcrDigest)` return tuple. The raw IP never
 * lives on-chain — `ipAddressHash` is `keccak256(ipHint)`.
 */
export interface OperatorNetworkMetadata {
  /** Autonomous-system number; `0` = not declared. */
  asn: number;
  /** ISO-3166-1 alpha-3 region as `0x` 3-byte hex; all-zero = not declared. */
  geoRegion: string;
  /** Declared hosting class. */
  hostingClass: NodeHostingClass;
  /** `keccak256` of the operator's public IP (`0x` 32 bytes). */
  ipAddressHash: string;
  /** `keccak256` of the TPM PCR digest (`0x` 32 bytes). */
  pcrDigest: string;
}

/**
 * `lyth_getClusterDiversity` view (PF-6). Mirrors the
 * `(uint16 score, uint16 asnVariance, uint16 geoVariance, uint16
 * hostingSpread)` return tuple. Every field is in `0..=10000` bps.
 */
export interface ClusterDiversity {
  /** Headline diversity score (`0..=10000`). */
  score: number;
  /** Normalised ASN-distribution entropy (`0..=10000`). */
  asnVariance: number;
  /** Normalised country-distribution entropy (`0..=10000`). */
  geoVariance: number;
  /** Normalised hosting-class-distribution entropy (`0..=10000`). */
  hostingSpread: number;
}

/**
 * Decoded `ClusterFormed(uint32,uint64,address,bytes)` event (MB-5).
 * Mirrors `node-registry::events::CLUSTER_FORMED`.
 */
export interface ClusterFormedEvent {
  /** Cluster identifier (indexed topic 1). */
  clusterId: number;
  /** Activation epoch (indexed topic 2). */
  effectiveEpoch: bigint;
  /** Primary anchor address (`0x` 20 bytes). */
  anchorAddress: string;
  /** Concatenated 48-byte compressed BLS pubkeys (`0x` hex). */
  operatorRoster: string;
}

/**
 * Decode a `getOperatorNetworkMetadata` return tuple — a flat 5-word
 * head: `(uint16 asn, bytes3 geoRegion, uint8 hostingClass, bytes32
 * ipAddressHash, bytes32 pcrDigest)`.
 */
export function decodeOperatorNetworkMetadata(
  returnData: string | Uint8Array | readonly number[],
): OperatorNetworkMetadata {
  const bytes = expectLength(toBytes(returnData), 5 * 32, "operatorNetworkMetadata");
  return {
    asn: (bytes[30] << 8) | bytes[31],
    // bytes3 is left-aligned in the head word.
    geoRegion: bytesToHex(bytes.slice(64, 67)),
    hostingClass: nodeHostingClassFromByte(bytes[95]),
    ipAddressHash: bytesToHex(bytes.slice(96, 128)),
    pcrDigest: bytesToHex(bytes.slice(128, 160)),
  };
}

/**
 * Decode a `getClusterDiversity` return tuple — a flat 4-word head:
 * `(uint16 score, uint16 asnVariance, uint16 geoVariance, uint16
 * hostingSpread)`.
 */
export function decodeClusterDiversity(
  returnData: string | Uint8Array | readonly number[],
): ClusterDiversity {
  const bytes = expectLength(toBytes(returnData), 4 * 32, "clusterDiversity");
  const word = (i: number) => (bytes[i * 32 + 30] << 8) | bytes[i * 32 + 31];
  return {
    score: word(0),
    asnVariance: word(1),
    geoVariance: word(2),
    hostingSpread: word(3),
  };
}

/**
 * Decode a `ClusterFormed` log (MB-5) into a typed {@link ClusterFormedEvent}.
 *
 * `topics` is the log topic vector (`topic0`, indexed `clusterId`,
 * indexed `effectiveEpoch`); `data` is the non-indexed ABI payload
 * `(address anchorAddress, bytes operatorRoster)`.
 */
export function decodeClusterFormedEvent(
  topics: readonly (string | Uint8Array | readonly number[])[],
  data: string | Uint8Array | readonly number[],
): ClusterFormedEvent {
  if (topics.length !== 3) {
    throw new NodeRegistryError(`ClusterFormed expects 3 topics, got ${topics.length}`);
  }
  const body = toBytes(data);
  if (body.length < 96) {
    throw new NodeRegistryError("ClusterFormed data shorter than head + roster length");
  }
  const clusterIdTopic = expectLength(toBytes(topics[1]), 32, "clusterId topic");
  const epochTopic = expectLength(toBytes(topics[2]), 32, "effectiveEpoch topic");
  const clusterId = u32FromWord(clusterIdTopic);
  const effectiveEpoch = u64FromWord(epochTopic);
  // data: [0..32) anchorAddress word, [32..64) offset (0x40), [64..96) roster len.
  const anchorAddress = bytesToHex(body.slice(12, 32));
  const rosterLen = Number(u64FromWord(body.slice(64, 96)));
  const rosterEnd = 96 + rosterLen;
  if (body.length < rosterEnd) {
    throw new NodeRegistryError("ClusterFormed roster payload truncated");
  }
  return {
    clusterId,
    effectiveEpoch,
    anchorAddress,
    operatorRoster: bytesToHex(body.slice(96, rosterEnd)),
  };
}

/**
 * Derive a runtime-formed cluster's primary-anchor address from its
 * operator roster (MB-5 / Law §7.13).
 *
 * Mirrors `node-registry::cluster_anchor::derive_cluster_anchor_address`:
 * the order-insensitive multisig rule `address = BLAKE3(
 * MONO_MULTISIG_BLAKE3_20_V1 || threshold_be16 ||
 * (member_len_be8 || member)*sorted)[..20]`. Returns the `0x`-prefixed
 * 20-byte address payload.
 */
export function deriveClusterAnchorAddress(
  roster: readonly (string | Uint8Array | readonly number[])[],
  threshold: number,
): string {
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 0xffff) {
    throw new NodeRegistryError("threshold must be a uint16");
  }
  const members = roster.map((m, i) => expectLength(toBytes(m), 48, `roster[${i}]`));
  members.sort(compareBytes);
  const parts: Uint8Array[] = [
    new TextEncoder().encode(MULTISIG_ADDRESS_DERIVATION_DOMAIN),
    Uint8Array.from([(threshold >> 8) & 0xff, threshold & 0xff]),
  ];
  for (const member of members) {
    parts.push(u64BeBytes(BigInt(member.length)));
    parts.push(member);
  }
  return bytesToHex(blake3(concatBytes(...parts)).slice(0, 20));
}

/** Stable selector hex (without `0x`) for a canonical signature. */
function selectorHex(sig: string): string {
  return [...keccak_256(new TextEncoder().encode(sig)).slice(0, 4)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function u32FromWord(word: Uint8Array): number {
  return ((word[28] << 24) | (word[29] << 16) | (word[30] << 8) | word[31]) >>> 0;
}

function u64FromWord(word: Uint8Array): bigint {
  let v = 0n;
  for (let i = 24; i < 32; i++) {
    v = (v << 8n) | BigInt(word[i]);
  }
  return v;
}

function u64BeBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let n = value;
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

function bitCount(value: number): number {
  let n = value >>> 0;
  let count = 0;
  while (n !== 0) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
}

function expectUint32(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new NodeRegistryError(`${name} must be a uint32`);
  }
  return value;
}

function uint32Word(value: number): Uint8Array {
  const out = new Uint8Array(32);
  const n = expectUint32(value, "uint32");
  out[28] = (n >>> 24) & 0xff;
  out[29] = (n >>> 16) & 0xff;
  out[30] = (n >>> 8) & 0xff;
  out[31] = n & 0xff;
  return out;
}

function uint8Word(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new NodeRegistryError("uint8 value out of range");
  }
  const out = new Uint8Array(32);
  out[31] = value;
  return out;
}

function toBytes(value: string | Uint8Array | readonly number[]): Uint8Array {
  if (typeof value === "string") {
    return hexToBytes(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function hexToBytes(hex: string): Uint8Array {
  const body = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (body.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw new NodeRegistryError("invalid hex bytes");
  }
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function expectLength(value: Uint8Array, len: number, name: string): Uint8Array {
  if (value.length !== len) {
    throw new NodeRegistryError(`${name} must be ${len} bytes, got ${value.length}`);
  }
  return value;
}
