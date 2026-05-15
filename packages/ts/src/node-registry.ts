/**
 * Node-registry precompile ABI helpers and service capability constants.
 *
 * These constants mirror `protocore-node-registry::capabilities` and
 * `protocore-node-registry::abi`. They are exported for wallets,
 * service probers, faucets, and operator dashboards that need to build
 * canonical registry transactions without retyping low-level values.
 */

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
} as const;

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
} as const;

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
