'use strict';

var blake3_js = require('@noble/hashes/blake3.js');
var mlKem_js = require('@noble/post-quantum/ml-kem.js');
var chacha_js = require('@noble/ciphers/chacha.js');
var sha3_js = require('@noble/hashes/sha3.js');
var utils_js = require('@noble/hashes/utils.js');
require('@noble/post-quantum/ml-dsa.js');
var ethers = require('ethers');

// src/error.ts
var SdkError = class _SdkError extends Error {
  kind;
  code;
  data;
  constructor(kind, message, opts) {
    super(message, opts?.cause ? { cause: opts.cause } : void 0);
    this.name = "SdkError";
    this.kind = kind;
    this.code = opts?.code;
    this.data = opts?.data;
  }
  static transport(message, cause) {
    return new _SdkError("transport", message, { cause });
  }
  static rpc(code, message, data) {
    return new _SdkError("rpc", `rpc error ${code}: ${message}`, { code, data });
  }
  static malformed(message) {
    return new _SdkError("malformed", message);
  }
  static endpoint(message) {
    return new _SdkError("endpoint", message);
  }
};

// src/native-events.ts
function isNativeDecodedEvent(value) {
  const row = asRecord(value);
  return row !== null && typeof row["block_height"] === "number" && typeof row["tx_index"] === "number" && typeof row["sequence"] === "number" && typeof row["family"] === "string" && typeof row["event_name"] === "string" && typeof row["payload_hash"] === "string";
}
function parseNativeDecodedEvent(event) {
  if (isNativeDecodedEvent(event.decoded)) {
    return event.decoded;
  }
  try {
    const parsed = JSON.parse(event.decodedJson);
    if (isNativeDecodedEvent(parsed)) {
      return parsed;
    }
  } catch {
  }
  throw SdkError.malformed(
    `native event ${event.eventTopic} at logIndex ${event.logIndex} is missing a typed decoded payload`
  );
}
function nativeEventMatches(event, filter = {}) {
  if (filter.address !== void 0 && event.address !== filter.address) return false;
  if (filter.eventTopic !== void 0 && event.eventTopic !== filter.eventTopic) return false;
  if (filter.family === void 0 && filter.eventName === void 0) return true;
  let decoded;
  try {
    decoded = parseNativeDecodedEvent(event);
  } catch {
    return false;
  }
  if (filter.family !== void 0 && decoded.family !== filter.family) return false;
  if (filter.eventName !== void 0 && decoded.event_name !== filter.eventName) return false;
  return true;
}
function nativeEventsFromReceipt(receipt, filter = {}) {
  return receipt.events.filter((event) => nativeEventMatches(event, filter)).map((event) => ({
    ...event,
    decoded: parseNativeDecodedEvent(event)
  }));
}
async function consumeNativeEvents(receipt, consumer, filter = {}) {
  const events = nativeEventsFromReceipt(receipt, filter);
  for (const event of events) {
    await consumer(event);
  }
  return events.length;
}
function asRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

// src/types.ts
function encodeBlockSelector(b) {
  if (typeof b === "number") return `0x${b.toString(16)}`;
  if (typeof b === "bigint") return `0x${b.toString(16)}`;
  return b;
}

// src/api.ts
var SDK_VERSION = "0.1.0";
function apiEndpointFromRpcEndpoint(endpoint) {
  const raw = endpoint.trim();
  if (raw.length === 0) {
    throw SdkError.endpoint("endpoint cannot be empty");
  }
  const noTrailing = raw.replace(/\/+$/, "");
  if (noTrailing.endsWith("/api/v1")) {
    return noTrailing;
  }
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(noTrailing)) {
    const url = new URL(noTrailing);
    const path = url.pathname.replace(/\/+$/, "");
    if (path === "" || path === "/" || path === "/rpc") {
      url.pathname = "/api/v1";
    } else if (path.endsWith("/rpc")) {
      url.pathname = `${path.slice(0, -"/rpc".length)}/api/v1`;
    } else {
      url.pathname = "/api/v1";
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  }
  return "/api/v1";
}
var ApiClient = class {
  baseUrl;
  #fetch;
  #headers;
  constructor(endpoint, options = {}) {
    this.baseUrl = (options.apiBaseUrl ?? apiEndpointFromRpcEndpoint(endpoint)).replace(/\/+$/, "");
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#headers = {
      accept: "application/json",
      "user-agent": `monolythium-core-sdk/${SDK_VERSION}`,
      ...options.headers ?? {}
    };
  }
  async get(path, query = {}) {
    return this.#get(path, query, false);
  }
  async health() {
    return this.#get("/health", {}, true);
  }
  async capabilities() {
    return this.get("/capabilities");
  }
  async provenance() {
    return this.get("/provenance");
  }
  async search(query, limit = 10) {
    return this.get("/search", { q: query, limit });
  }
  async stats() {
    return this.get("/stats");
  }
  async block(block = "latest") {
    return this.get(`/blocks/${encodePathBlock(block)}`);
  }
  async blockTransactions(block = "latest", page = 0, limit = 25) {
    return this.get(`/blocks/${encodePathBlock(block)}/transactions`, { page, limit });
  }
  async transactions(limit = 50, cursor) {
    return this.get("/transactions", { limit, cursor });
  }
  async transaction(hash) {
    return this.get(`/transactions/${encodePathSegment(hash)}`);
  }
  async transactionReceipt(hash) {
    return this.get(`/transactions/${encodePathSegment(hash)}/receipt`);
  }
  async transactionNativeReceipt(hash) {
    return this.get(`/transactions/${encodePathSegment(hash)}/native-receipt`);
  }
  /**
   * Typed native event rows from `/transactions/{hash}/native-receipt`.
   *
   * This helper consumes the existing native receipt API route and returns
   * its envelope metadata with `data` replaced by the filtered event rows.
   */
  async transactionNativeReceiptEvents(hash, filter = {}) {
    const receipt = await this.transactionNativeReceipt(hash);
    return {
      ...receipt,
      data: nativeEventsFromReceipt(receipt.data, filter)
    };
  }
  async addressProfile(address) {
    return this.get(`/addresses/${encodePathSegment(address)}/profile`);
  }
  async addressFlow(address, limit = 250) {
    return this.get(`/addresses/${encodePathSegment(address)}/flow`, { limit });
  }
  async addressActivity(address, limit = 50, cursor) {
    return this.get(`/addresses/${encodePathSegment(address)}/activity`, {
      limit,
      cursor
    });
  }
  async addressActivityKind(address) {
    return this.get(`/addresses/${encodePathSegment(address)}/activity-kind`);
  }
  async clusters(page = 0, limit = 25) {
    return this.get("/clusters", { page, limit });
  }
  async cluster(clusterId) {
    return this.get(`/clusters/${encodePathSegment(clusterId)}`);
  }
  async operator(operatorId) {
    return this.get(`/operators/${encodePathSegment(operatorId)}`);
  }
  async serviceProbe(peerId, serviceMask) {
    return this.get(
      `/service-probes/${encodePathSegment(peerId)}/${encodePathSegment(serviceMask)}`
    );
  }
  async markets(limit = 50) {
    return this.get("/markets", { limit });
  }
  async market(marketId) {
    return this.get(`/markets/${encodePathSegment(marketId)}`);
  }
  async marketTrades(marketId, limit = 50, cursor) {
    return this.get(`/markets/${encodePathSegment(marketId)}/trades`, { limit, cursor });
  }
  async marketOhlc(marketId, fromBlock, toBlock, bucketBlocks) {
    return this.get(`/markets/${encodePathSegment(marketId)}/ohlc`, {
      fromBlock,
      toBlock,
      bucketBlocks
    });
  }
  async marketOrderBook(marketId, levels = 20) {
    return this.get(`/markets/${encodePathSegment(marketId)}/orderbook`, { levels });
  }
  async upgradeStatus(height) {
    return this.get("/upgrades/status", {
      height: height == null ? void 0 : encodeBlockSelector(height)
    });
  }
  async #get(path, query, allowUnavailableBody) {
    const url = buildUrl(this.baseUrl, path, query);
    let resp;
    try {
      resp = await this.#fetch(url, {
        method: "GET",
        headers: this.#headers
      });
    } catch (cause) {
      throw SdkError.transport(
        `transport failure calling ${url}: ${cause?.message ?? cause}`,
        cause
      );
    }
    let parsed;
    try {
      parsed = await resp.json();
    } catch (cause) {
      throw SdkError.malformed(
        `non-JSON response (HTTP ${resp.status}): ${cause?.message ?? cause}`
      );
    }
    const error = parseApiError(parsed);
    if (error) {
      throw SdkError.rpc(error.code, error.message, error.data);
    }
    if (!resp.ok && !(allowUnavailableBody && resp.status === 503)) {
      throw SdkError.transport(`HTTP ${resp.status} calling ${url}`);
    }
    return parsed;
  }
};
function parseApiError(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const error = value["error"];
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const row = error;
  if (typeof row["code"] !== "number" || typeof row["message"] !== "string") {
    return null;
  }
  return {
    code: row["code"],
    message: row["message"],
    data: row["data"]
  };
}
function buildUrl(baseUrl, path, query) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === void 0 || value === null) continue;
    params.set(key, typeof value === "bigint" ? value.toString() : String(value));
  }
  const qs = params.toString();
  return qs.length === 0 ? `${cleanBase}${cleanPath}` : `${cleanBase}${cleanPath}?${qs}`;
}
function encodePathBlock(block) {
  return encodePathSegment(encodeBlockSelector(block));
}
function encodePathSegment(value) {
  return encodeURIComponent(typeof value === "bigint" ? value.toString() : String(value));
}

// src/address.ts
var ADDRESS_HRP = "mono";
var ADDRESS_KIND_HRPS = {
  user: "mono",
  smartAccount: "monos",
  contract: "monoc",
  cluster: "monok",
  multisig: "monom",
  systemModule: "monox"
};
var RESERVED_ADDRESS_HRPS = ["monor", "monop", "monoi", "monoa"];
var CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
var CHARSET_MAP = new Map([...CHARSET].map((c, i) => [c, i]));
var BECH32M_CONST = 734539939;
var HEX_20_BYTE_RE = /^0x[0-9a-fA-F]{40}$/;
var AddressError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "AddressError";
  }
};
function hexToAddressBytes(address) {
  if (!HEX_20_BYTE_RE.test(address)) {
    throw new AddressError("expected 0x-prefixed 20-byte hex address");
  }
  const out = new Uint8Array(20);
  const body = address.slice(2);
  for (let i = 0; i < 20; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
function addressBytesToHex(address) {
  const bytes = expectLength(address, 20, "address");
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function addressToBech32(address) {
  return addressToTypedBech32("user", address);
}
function addressToTypedBech32(kind, address) {
  const bytes = typeof address === "string" ? hexToAddressBytes(address) : expectLength(address, 20, "address");
  return encodeBech32m(ADDRESS_KIND_HRPS[kind], bytes);
}
function encodeBech32m(hrp, bytes) {
  const words = convertBits([...bytes], 8, 5, true);
  const checksum = createChecksum(hrp, words);
  return `${hrp}1${[...words, ...checksum].map((v) => CHARSET[v]).join("")}`;
}
function bech32ToAddressBytes(address) {
  return typedBech32ToAddress(address, "user").bytes;
}
function bech32ToAddress(address) {
  return addressBytesToHex(bech32ToAddressBytes(address));
}
function typedBech32ToAddress(address, expectedKind) {
  const parsed = decodeBech32m(address);
  if (RESERVED_ADDRESS_HRPS.includes(parsed.hrp)) {
    throw new AddressError(`reserved address hrp '${parsed.hrp}'`);
  }
  const kind = addressKindFromHrp(parsed.hrp);
  if (kind === void 0) {
    throw new AddressError(`unknown address hrp '${parsed.hrp}'`);
  }
  if (expectedKind !== void 0 && kind !== expectedKind) {
    throw new AddressError(`unexpected hrp '${parsed.hrp}', expected '${ADDRESS_KIND_HRPS[expectedKind]}'`);
  }
  const bytes = convertBits(parsed.data, 5, 8, false);
  if (bytes.length !== 20) {
    throw new AddressError(`expected 20-byte payload, got ${bytes.length} bytes`);
  }
  const out = Uint8Array.from(bytes);
  return { kind, address: address.toLowerCase(), bytes: out, hex: addressBytesToHex(out) };
}
function parseAddress(address) {
  if (address.startsWith("0x") || address.startsWith("0X")) {
    return hexToAddressBytes(address);
  }
  return bech32ToAddressBytes(address);
}
function normalizeAddressHex(address) {
  return addressBytesToHex(parseAddress(address));
}
function decodeBech32m(input) {
  if (input.length < 8) {
    throw new AddressError("bech32m address is too short");
  }
  const hasLower = input !== input.toUpperCase();
  const hasUpper = input !== input.toLowerCase();
  if (hasLower && hasUpper) {
    throw new AddressError("bech32m address cannot mix upper and lower case");
  }
  const s = input.toLowerCase();
  const sep = s.lastIndexOf("1");
  if (sep <= 0 || sep + 7 > s.length) {
    throw new AddressError("bech32m separator/checksum shape is invalid");
  }
  const hrp = s.slice(0, sep);
  const values = [];
  for (const c of s.slice(sep + 1)) {
    const v = CHARSET_MAP.get(c);
    if (v === void 0) {
      throw new AddressError(`invalid bech32m character '${c}'`);
    }
    values.push(v);
  }
  if (!verifyChecksum(hrp, values)) {
    throw new AddressError("bech32m checksum mismatch");
  }
  return { hrp, data: values.slice(0, -6) };
}
function addressKindFromHrp(hrp) {
  for (const [kind, kindHrp] of Object.entries(ADDRESS_KIND_HRPS)) {
    if (kindHrp === hrp) return kind;
  }
  return void 0;
}
function hrpExpand(hrp) {
  const high = [...hrp].map((c) => c.charCodeAt(0) >> 5);
  const low = [...hrp].map((c) => c.charCodeAt(0) & 31);
  return [...high, 0, ...low];
}
function polymod(values) {
  const generators = [996825010, 642813549, 513874426, 1027748829, 705979059];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = (chk & 33554431) << 5 ^ value;
    for (let i = 0; i < 5; i++) {
      if ((top >> i & 1) === 1) {
        chk ^= generators[i];
      }
    }
  }
  return chk >>> 0;
}
function createChecksum(hrp, data) {
  const values = [...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const mod = polymod(values) ^ BECH32M_CONST;
  const out = [];
  for (let p = 0; p < 6; p++) {
    out.push(mod >> 5 * (5 - p) & 31);
  }
  return out;
}
function verifyChecksum(hrp, values) {
  return polymod([...hrpExpand(hrp), ...values]) === BECH32M_CONST;
}
function convertBits(data, fromBits, toBits, pad) {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << toBits) - 1;
  const maxAcc = (1 << fromBits + toBits - 1) - 1;
  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) {
      throw new AddressError("invalid address payload value");
    }
    acc = (acc << fromBits | value) & maxAcc;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push(acc >> bits & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push(acc << toBits - bits & maxv);
    }
  } else if (bits >= fromBits || (acc << toBits - bits & maxv) !== 0) {
    throw new AddressError("invalid bech32m padding");
  }
  return ret;
}
function expectLength(value, len, name) {
  if (value.length !== len) {
    throw new AddressError(`${name} must be ${len} bytes`);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

// src/consts.ts
var BURN_ADDR = "0x0000000000000000000000000000000000000000";
var PRECOMPILE_ADDRESSES = {
  /** Native fungible-token factory — non-gateable, foundational. */
  TOKEN_FACTORY: "0x0000000000000000000000000000000000001000",
  /** Native central-limit order book — gateable. */
  CLOB: "0x0000000000000000000000000000000000001001",
  /** Agent execution surface (zkML-gated, ADR-0011/ADR-0020) — gateable. */
  AGENT: "0x0000000000000000000000000000000000001003",
  /** Account privacy policy + stealth/confidential ops — gateable. */
  PRIVACY: "0x0000000000000000000000000000000000001004",
  /** Operator + RPC node registry — non-gateable consensus invariant. */
  NODE_REGISTRY: "0x0000000000000000000000000000000000001005",
  /** IBC light-client + packet routing — gateable. */
  IBC: "0x0000000000000000000000000000000000001007",
  /** Native zk-light-client bridge — gateable. */
  BRIDGE: "0x0000000000000000000000000000000000001008",
  /** Decentralized multi-signer oracle (OI-0036) — non-gateable. */
  ORACLE: "0x0000000000000000000000000000000000001009",
  /** Distributed delegation primitive (Stage E.5a, Law §7.6) — gateable. */
  DELEGATION: "0x000000000000000000000000000000000000100A",
  /** One-time emergency-key registry (Law §5.4 / §2.9) — non-gateable. */
  EMERGENCY_KEY: "0x0000000000000000000000000000000000001100",
  /** VRF precompile (Law §5.4 / §5.6). */
  VRF: "0x0000000000000000000000000000000000001101",
  /** Streaming-payments primitive (Law §5.4 / §5.7) — gateable. */
  STREAMING_PAYMENTS: "0x0000000000000000000000000000000000001102",
  /** Human-readable name registry (Law §5.4 / §5.8) — gateable. */
  NAME_REGISTRY: "0x0000000000000000000000000000000000001103",
  /** Cluster-name registry. */
  CLUSTER_NAME_REGISTRY: "0x0000000000000000000000000000000000001104",
  /** Agent-commerce attestation precompile. */
  ATTESTATION: "0x0000000000000000000000000000000000001105",
  /** Agent-commerce consent precompile. */
  CONSENT: "0x0000000000000000000000000000000000001106",
  /** Agent-commerce issuer registry. */
  ISSUER_REGISTRY: "0x0000000000000000000000000000000000001107",
  /** Agent-commerce discovery precompile. */
  DISCOVERY: "0x0000000000000000000000000000000000001108",
  /** Agent-commerce availability precompile. */
  AVAILABILITY: "0x0000000000000000000000000000000000001109",
  /** Agent-commerce escrow precompile. */
  ESCROW: "0x000000000000000000000000000000000000110A",
  /** Agent-commerce arbiter registry. */
  ARBITER_REGISTRY: "0x000000000000000000000000000000000000110B",
  /** Agent spending policy — gateable, activated by Stage 7 milestones. */
  SPENDING_POLICY: "0x000000000000000000000000000000000000110C",
  /** Primary ML-DSA-65 pubkey registry — gateable, ADR-0034. */
  PUBKEY_REGISTRY: "0x000000000000000000000000000000000000110D"
};

// src/node-registry.ts
var NODE_REGISTRY_CAPABILITIES = {
  SERVES_RPC: 1,
  SERVES_INDEXER: 2,
  SERVES_BROADCASTER: 4,
  SERVES_ARCHIVE: 8,
  SERVES_WEBSOCKET: 16,
  SERVES_LIGHT_CLIENT: 32,
  SERVES_ORACLE_WRITER: 64,
  SERVES_BRIDGE_RELAY: 128,
  SERVES_PUBLIC_API: 256
};
var NODE_REGISTRY_CAPABILITY_MASK = 65535;
var NODE_REGISTRY_PUBLIC_SERVICE_MASK = NODE_REGISTRY_CAPABILITIES.SERVES_RPC | NODE_REGISTRY_CAPABILITIES.SERVES_INDEXER | NODE_REGISTRY_CAPABILITIES.SERVES_ARCHIVE | NODE_REGISTRY_CAPABILITIES.SERVES_WEBSOCKET | NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API;
var SERVICE_PROBE_STATUS = {
  UNKNOWN: 0,
  REACHABLE: 1,
  DEGRADED: 2,
  UNREACHABLE: 3
};
var NODE_REGISTRY_SELECTORS = {
  reportServiceProbe: "0xeee31bba",
  getServiceProbe: "0x1fcbfbce"
};
var NodeRegistryError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "NodeRegistryError";
  }
};
function nodeRegistryAddressHex() {
  return PRECOMPILE_ADDRESSES.NODE_REGISTRY.toLowerCase();
}
function isValidNodeRegistryCapabilities(flags) {
  return Number.isInteger(flags) && flags >= 0 && (flags & ~NODE_REGISTRY_CAPABILITY_MASK) === 0;
}
function isValidPublicServiceProbeMask(mask) {
  return Number.isInteger(mask) && mask > 0 && (mask & ~NODE_REGISTRY_PUBLIC_SERVICE_MASK) === 0;
}
function isSinglePublicServiceProbeMask(mask) {
  return isValidPublicServiceProbeMask(mask) && bitCount(mask) === 1;
}
function isConcreteServiceProbeStatus(status) {
  return status === SERVICE_PROBE_STATUS.REACHABLE || status === SERVICE_PROBE_STATUS.DEGRADED || status === SERVICE_PROBE_STATUS.UNREACHABLE;
}
function serviceProbeStatusLabel(status) {
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
function encodeReportServiceProbeCalldata(args) {
  if (!isValidPublicServiceProbeMask(args.serviceMask)) {
    throw new NodeRegistryError(
      `serviceMask 0x${args.serviceMask.toString(16).padStart(8, "0")} is not a valid public-service mask`
    );
  }
  if (!isConcreteServiceProbeStatus(args.status)) {
    throw new NodeRegistryError(`status ${args.status} is not a concrete service-probe outcome`);
  }
  const latencyMs = expectUint32(args.latencyMs, "latencyMs");
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.reportServiceProbe),
      expectLength2(toBytes(args.peerId), 32, "peerId"),
      uint32Word(args.serviceMask),
      uint8Word(args.status),
      uint32Word(latencyMs),
      expectLength2(toBytes(args.probeDigest), 32, "probeDigest")
    )
  );
}
function bitCount(value) {
  let n = value >>> 0;
  let count = 0;
  while (n !== 0) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
}
function expectUint32(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 4294967295) {
    throw new NodeRegistryError(`${name} must be a uint32`);
  }
  return value;
}
function uint32Word(value) {
  const out = new Uint8Array(32);
  const n = expectUint32(value, "uint32");
  out[28] = n >>> 24 & 255;
  out[29] = n >>> 16 & 255;
  out[30] = n >>> 8 & 255;
  out[31] = n & 255;
  return out;
}
function uint8Word(value) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new NodeRegistryError("uint8 value out of range");
  }
  const out = new Uint8Array(32);
  out[31] = value;
  return out;
}
function toBytes(value) {
  if (typeof value === "string") {
    return hexToBytes(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes(hex) {
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
function bytesToHex(bytes) {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function concatBytes(...parts) {
  const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function expectLength2(value, len, name) {
  if (value.length !== len) {
    throw new NodeRegistryError(`${name} must be ${len} bytes, got ${value.length}`);
  }
  return value;
}

// src/registry.ts
var TESTNET_69420 = {
  chain_id: 69420,
  network: "testnet-69420",
  display_name: "Monolythium Testnet",
  description: "Live development testnet for Monolythium v4.0 / LythiumDAG-BFT. Foundation-operated. Wipe + regenesis is allowed without notice \u2014 do NOT store value on this network.",
  genesis_hash: "0x325057e476b7be3730a22c92b9289f4a14a3414a2a081bd279b43eeba36b0075",
  binary_sha: "44a9ec4",
  rpc: [
    {
      url: "http://178.105.15.216:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-2; primary foundation seed (operator-1 offline pending BLS key reissue)"
    },
    {
      url: "http://178.104.233.182:8545",
      provider: "monolythium-foundation",
      region: "nbg1",
      tier: "official",
      notes: "operator-3"
    },
    {
      url: "http://65.108.94.1:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-4"
    },
    {
      url: "http://95.216.154.155:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-5"
    },
    {
      url: "http://87.99.145.48:8545",
      provider: "monolythium-foundation",
      region: "ash",
      tier: "official",
      notes: "operator-6; US east"
    },
    {
      url: "http://5.223.85.76:8545",
      provider: "monolythium-foundation",
      region: "sin",
      tier: "official",
      notes: "operator-7; APAC"
    }
  ],
  p2p: [
    {
      multiaddr: "/ip4/178.105.15.216/tcp/29898/p2p/12D3KooWDKk9ALxqchazXGcRGbqyopWtAGRbf4WQFS2dABV7gQGb",
      region: "fsn1"
    },
    {
      multiaddr: "/ip4/178.104.233.182/tcp/29898/p2p/12D3KooW9uVG8csFCtSxoFaYBsGzXBgVwQhAw84TGj4dfRi9LH1c",
      region: "nbg1"
    },
    {
      multiaddr: "/ip4/65.108.94.1/tcp/29898/p2p/12D3KooWKvkjEVkA64TdbSoVjDW2sWUzgkAMbPZsZvfxZw2W6zVy",
      region: "hel1"
    },
    {
      multiaddr: "/ip4/95.216.154.155/tcp/29898/p2p/12D3KooWCcVjSuERAGzG6Xb3wjUj22fGrgP2QXDJfquxQ72TBMd8",
      region: "hel1"
    },
    {
      multiaddr: "/ip4/87.99.145.48/tcp/29898/p2p/12D3KooWMKw9Qxx7RE3PjQGMZq94C23UDjnTbZCNWFy6Dc4YcCdL",
      region: "ash"
    },
    {
      multiaddr: "/ip4/5.223.85.76/tcp/29898/p2p/12D3KooWSTeApBSKR4DpKvJAuqKfHxNhdbNg9mi9u8f4UNfzN5Cu",
      region: "sin"
    }
  ]
};
var CHAIN_REGISTRY = {
  "testnet-69420": TESTNET_69420
};
var CHAIN_REGISTRY_RAW_BASE = "https://raw.githubusercontent.com/monolythium-vision/chain-registry/master/chains";
function getChainInfo(network) {
  const info = CHAIN_REGISTRY[network];
  if (!info) {
    throw new Error(`unknown Monolythium network: ${network}`);
  }
  return info;
}
function getRpcEndpoints(network) {
  return getChainInfo(network).rpc;
}
function getP2pSeeds(network) {
  return getChainInfo(network).p2p;
}
async function fetchChainInfoLatest(network, options = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const rawBaseUrl = options.rawBaseUrl ?? CHAIN_REGISTRY_RAW_BASE;
  const resp = await fetchImpl(`${rawBaseUrl}/${network}.toml`);
  if (!resp.ok) {
    throw new Error(`failed to fetch chain registry ${network}: HTTP ${resp.status}`);
  }
  return parseChainRegistryToml(await resp.text());
}
async function fetchChainRegistryLatest(networks = ["testnet-69420"], options = {}) {
  const entries = await Promise.all(
    networks.map(async (network) => [network, await fetchChainInfoLatest(network, options)])
  );
  return Object.fromEntries(entries);
}
function parseChainRegistryToml(input) {
  const info = {
    rpc: [],
    p2p: [],
    explorer: []
  };
  let section = "root";
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
      info[key] = value;
    } else {
      const list = info[section];
      const target = list[list.length - 1];
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
  const out = {
    chain_id: Number(info.chain_id),
    network: String(info.network),
    display_name: info.display_name ? String(info.display_name) : void 0,
    description: info.description ? String(info.description) : void 0,
    genesis_hash: String(info.genesis_hash),
    binary_sha: String(info.binary_sha),
    rpc: info.rpc,
    p2p: info.p2p
  };
  if (info.explorer.length > 0) out.explorer = info.explorer;
  return out;
}
function parseTomlScalar(raw) {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

// src/client.ts
var MAX_NATIVE_RECEIPT_EVENTS = 1e3;
var SDK_VERSION2 = "0.1.0";
function resolveChainInfo(network, registry) {
  if (registry) {
    const info = registry[network];
    if (!info) {
      throw SdkError.endpoint(`unknown Monolythium network: ${network}`);
    }
    return info;
  }
  try {
    return getChainInfo(network);
  } catch (err) {
    throw SdkError.endpoint(err?.message ?? String(err));
  }
}
var RpcClient = class _RpcClient {
  endpoint;
  #fetch;
  #headers;
  #nextId;
  constructor(endpoint, options = {}) {
    if (!endpoint || endpoint.length === 0) {
      throw SdkError.endpoint("endpoint cannot be empty");
    }
    this.endpoint = endpoint;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#headers = {
      "content-type": "application/json",
      "user-agent": `monolythium-core-sdk/${SDK_VERSION2}`,
      ...options.headers ?? {}
    };
    this.#nextId = 1;
  }
  /**
   * Construct a client from the chain-registry network slug.
   *
   * Defaults to the SDK-bundled registry snapshot from
   * `monolythium-vision/chain-registry`. Set `probe: true` to walk the
   * registry endpoints in order and return the first endpoint whose
   * `eth_chainId` matches the registry chain id.
   */
  static async forNetwork(network = "testnet-69420", options = {}) {
    const info = resolveChainInfo(network, options.registry);
    if (info.rpc.length === 0) {
      throw SdkError.endpoint(`network ${network} has no RPC endpoints`);
    }
    if (options.probe) {
      return this.fromFirstReachable(info, options);
    }
    return new _RpcClient(info.rpc[0].url, options);
  }
  /**
   * Walk a chain-registry entry in order and return the first endpoint
   * whose `eth_chainId` matches the registry `chain_id`.
   */
  static async fromFirstReachable(chain, options = {}) {
    const errors = [];
    for (const endpoint of chain.rpc) {
      const client = new _RpcClient(endpoint.url, options);
      try {
        const chainId = await client.ethChainId();
        if (chainId === BigInt(chain.chain_id)) {
          return client;
        }
        errors.push(`${endpoint.url}: chain id ${chainId} != ${chain.chain_id}`);
      } catch (err) {
        errors.push(`${endpoint.url}: ${err?.message ?? err}`);
      }
    }
    throw SdkError.endpoint(
      `no reachable RPC endpoint for ${chain.network}; tried ${errors.join("; ")}`
    );
  }
  /**
   * Send an arbitrary JSON-RPC method. Most callers should prefer the
   * typed wrappers below; this is the escape hatch for methods the
   * SDK does not yet wrap.
   */
  async call(method, params = []) {
    const id = this.#nextId++;
    const body = { jsonrpc: "2.0", id, method, params };
    let resp;
    try {
      resp = await this.#fetch(this.endpoint, {
        method: "POST",
        headers: this.#headers,
        body: JSON.stringify(body)
      });
    } catch (cause) {
      throw SdkError.transport(
        `transport failure calling ${method}: ${cause?.message ?? cause}`,
        cause
      );
    }
    let parsed;
    try {
      parsed = await resp.json();
    } catch (cause) {
      throw SdkError.malformed(
        `non-JSON response (HTTP ${resp.status}): ${cause?.message ?? cause}`
      );
    }
    if (parsed.error) {
      throw SdkError.rpc(parsed.error.code, parsed.error.message, parsed.error.data);
    }
    if (!("result" in parsed) || parsed.result === void 0) {
      if (!resp.ok) {
        throw SdkError.malformed(`HTTP ${resp.status} with no JSON-RPC result`);
      }
      throw SdkError.malformed("response is missing both `result` and `error`");
    }
    return parsed.result;
  }
  // ---- eth_* / net_* / web3_* ---------------------------------------
  /** `eth_chainId` — configured chain id. */
  async ethChainId() {
    return parseQuantityBig(await this.call("eth_chainId", []));
  }
  /** `eth_blockNumber` — latest committed height. */
  async ethBlockNumber() {
    return parseQuantityBig(await this.call("eth_blockNumber", []));
  }
  /** `eth_getBalance` — balance + Merkle proof envelope. */
  async ethGetBalance(address, block = "latest") {
    return this.call("eth_getBalance", [address, encodeBlockSelector(block)]);
  }
  /** `eth_getStorageAt` — storage word + Merkle proof. */
  async ethGetStorageAt(address, slot, block = "latest") {
    return this.call("eth_getStorageAt", [
      address,
      slot,
      encodeBlockSelector(block)
    ]);
  }
  /** `eth_getTransactionCount` — sender nonce. */
  async ethGetTransactionCount(address, block = "latest") {
    return parseQuantityBig(
      await this.call("eth_getTransactionCount", [
        address,
        encodeBlockSelector(block)
      ])
    );
  }
  /** `eth_getCode` — deployed bytecode (`0x` for an EOA, `0xfe` for a precompile). */
  async ethGetCode(address, block = "latest") {
    return this.call("eth_getCode", [address, encodeBlockSelector(block)]);
  }
  /** `eth_getBlockByNumber` — fetch a block header by height/tag. */
  async ethGetBlockByNumber(block = "latest") {
    return normalizeBlockHeader(await this.call("eth_getBlockByNumber", [encodeBlockSelector(block)]));
  }
  /** `eth_getBlockByHash` — fetch a block header by hash. */
  async ethGetBlockByHash(hash) {
    return normalizeBlockHeader(await this.call("eth_getBlockByHash", [hash]));
  }
  /** `eth_getTransactionByHash` — fetch an included transaction by hash. */
  async ethGetTransactionByHash(txHash) {
    return this.call("eth_getTransactionByHash", [txHash]);
  }
  /** `eth_getTransactionReceipt` — receipt for a confirmed tx. */
  async ethGetTransactionReceipt(txHash) {
    return normalizeTransactionReceipt(await this.call("eth_getTransactionReceipt", [txHash]));
  }
  /** `eth_sendRawTransaction` — submit a signed raw tx. */
  async ethSendRawTransaction(rawTx) {
    return this.call("eth_sendRawTransaction", [rawTx]);
  }
  /** `eth_call` — dry-run a transaction. */
  async ethCall(request, block = "latest") {
    return this.call("eth_call", [request, encodeBlockSelector(block)]);
  }
  /** `eth_estimateGas` — gas estimate for a dry-run. */
  async ethEstimateGas(request, block = "latest") {
    return parseQuantityBig(
      await this.call("eth_estimateGas", [request, encodeBlockSelector(block)])
    );
  }
  /** `eth_gasPrice` — minimum gas price the node will accept. */
  async ethGasPrice() {
    return parseQuantityBig(await this.call("eth_gasPrice", []));
  }
  /** `eth_feeHistory` — base-fee + gas-used history. */
  async ethFeeHistory(blockCount, newestBlock = "latest", rewardPercentiles = []) {
    return this.call("eth_feeHistory", [
      `0x${blockCount.toString(16)}`,
      encodeBlockSelector(newestBlock),
      rewardPercentiles
    ]);
  }
  /** `eth_syncing` — `null` when caught up. */
  async ethSyncing() {
    const v = await this.call("eth_syncing", []);
    if (v === false || v === null || v === void 0) return null;
    return v;
  }
  /** `net_version` — chain id as a decimal string. */
  async netVersion() {
    return this.call("net_version", []);
  }
  /** `net_peerCount` — number of connected peers. */
  async netPeerCount() {
    return parseQuantityBig(await this.call("net_peerCount", []));
  }
  /** `net_listening` — whether the node accepts inbound peers. */
  async netListening() {
    return this.call("net_listening", []);
  }
  /** `web3_clientVersion` — server's client-version string. */
  async web3ClientVersion() {
    return this.call("web3_clientVersion", []);
  }
  /** `web3_sha3` — Keccak-256 of `data`. */
  async web3Sha3(data) {
    return this.call("web3_sha3", [data]);
  }
  // ---- lyth_* (Law §13.2 native namespace) --------------------------
  /** `lyth_listProviders` — paged registry enumeration. */
  async lythListProviders(capabilityMask, cursor = null, limit = 100) {
    return this.call("lyth_listProviders", [capabilityMask, cursor, limit]);
  }
  /** `lyth_getRegistration` — single registry lookup. */
  async lythGetRegistration(peerId) {
    return this.call("lyth_getRegistration", [peerId]);
  }
  /** `lyth_registryStateProof` — Merkle proof for a registry entry. */
  async lythRegistryStateProof(peerId) {
    return this.call("lyth_registryStateProof", [peerId]);
  }
  /** `lyth_getAccountPolicy` — privacy posture for an account. */
  async lythGetAccountPolicy(address) {
    return this.call("lyth_getAccountPolicy", [address]);
  }
  /** `lyth_getAssetPolicy` — privacy posture for an asset. */
  async lythGetAssetPolicy(tokenId) {
    return this.call("lyth_getAssetPolicy", [tokenId]);
  }
  /** `lyth_getTokenBalances` — indexed per-asset balances for one address. */
  async lythGetTokenBalances(address) {
    return this.call("lyth_getTokenBalances", [address]);
  }
  /** `lyth_getAddressLabel` — indexed display/category label for one address. */
  async lythGetAddressLabel(address) {
    const v = await this.call("lyth_getAddressLabel", [address]);
    if (v === null || v === void 0) return null;
    return v;
  }
  /** `lyth_getAddressActivity` — indexed per-address activity timeline. */
  async lythGetAddressActivity(address, limit = 50, cursor) {
    const params = cursor === void 0 ? [address, limit] : [address, limit, cursor];
    return this.call("lyth_getAddressActivity", params);
  }
  /** `lyth_addressActivityKind` — activity index coverage for one address. */
  async lythAddressActivityKind(address) {
    return this.call("lyth_addressActivityKind", [address]);
  }
  /** `lyth_agentReputation` — reputation accumulators for an agent provider. */
  async lythAgentReputation(provider, categoryId = 0) {
    return this.call("lyth_agentReputation", [normalizeUserBech32Address(provider), categoryId]);
  }
  /** `lyth_decodeTx` — explorer-grade decoded transaction envelope. */
  async lythDecodeTx(txHash) {
    return this.call("lyth_decodeTx", [txHash]);
  }
  /** `lyth_nativeReceipt` — native RISC-V receipt metadata and typed native event rows. */
  async lythNativeReceipt(txHash) {
    return this.call("lyth_nativeReceipt", [txHash]);
  }
  /**
   * Typed native event rows from `lyth_nativeReceipt`.
   *
   * This helper intentionally consumes the existing receipt RPC surface;
   * it does not require a separate `lyth_nativeEvents` node method.
   */
  async lythNativeReceiptEvents(txHash, filter = {}) {
    const receipt = await this.lythNativeReceipt(txHash);
    return nativeEventsFromReceipt(receipt, filter);
  }
  /** `lyth_gapRecords` — retained ingestion/indexing gaps for a block range. */
  async lythGapRecords(fromBlock, toBlock) {
    return this.call("lyth_gapRecords", [
      encodeRpcU64Number(fromBlock, "fromBlock"),
      encodeRpcU64Number(toBlock, "toBlock")
    ]);
  }
  /** `lyth_dagParents` — parent vertices for a DAG round. */
  async lythDagParents(round) {
    return this.call("lyth_dagParents", [encodeRpcU64Number(round, "round")]);
  }
  /** `lyth_richList` — top holders for a token id. */
  async lythRichList(tokenId, limit) {
    const params = limit == null ? [tokenId] : [tokenId, limit];
    return this.call("lyth_richList", params);
  }
  /** `lyth_clobMarket` — live CLOB market metadata for a market id. */
  async lythClobMarket(marketId) {
    return this.call("lyth_clobMarket", [marketId]);
  }
  /** `lyth_clobMarkets` — CLOB markets observed through indexed trades. */
  async lythClobMarkets(limit) {
    const params = limit == null ? [] : [limit];
    return this.call("lyth_clobMarkets", params);
  }
  /** `lyth_clobTrades` — CLOB fills for one market. */
  async lythClobTrades(marketId, limit = 50, cursor) {
    const params = cursor === void 0 ? [marketId, limit] : [marketId, limit, cursor];
    return this.call("lyth_clobTrades", params);
  }
  /** `lyth_clobOhlc` — CLOB OHLC candles for a market over a block range. */
  async lythClobOhlc(marketId, fromBlock, toBlock, bucketBlocks) {
    const params = fromBlock == null && toBlock == null && bucketBlocks == null ? [marketId] : [
      marketId,
      fromBlock == null ? null : encodeRpcU64Number(fromBlock, "fromBlock"),
      toBlock == null ? null : encodeRpcU64Number(toBlock, "toBlock"),
      bucketBlocks == null ? null : encodeRpcU64Number(bucketBlocks, "bucketBlocks")
    ];
    return this.call("lyth_clobOhlc", params);
  }
  /** `lyth_clobOrderBook` — live CLOB depth from canonical state. */
  async lythClobOrderBook(marketId, levels) {
    const params = levels == null ? [marketId] : [marketId, levels];
    return this.call("lyth_clobOrderBook", params);
  }
  /** `lyth_txFeed` — paged global transaction feed. */
  async lythTxFeed(limit = 50, cursor) {
    const params = cursor === void 0 ? [limit] : [limit, cursor];
    return this.call("lyth_txFeed", params);
  }
  /** `lyth_addressProfile` — live account + label + activity aggregate. */
  async lythAddressProfile(address) {
    return this.call("lyth_addressProfile", [address]);
  }
  /** `lyth_addressFlow` — recent indexed address-flow aggregate. */
  async lythAddressFlow(address, limit = 250) {
    return this.call("lyth_addressFlow", [address, limit]);
  }
  /** `lyth_search` — exact live resolver for hashes, addresses, blocks, and clusters. */
  async lythSearch(query, limit = 10) {
    return this.call("lyth_search", [query, limit]);
  }
  /** `lyth_chainStats` — compact live chain/indexer/mempool summary. */
  async lythChainStats() {
    return this.call("lyth_chainStats", []);
  }
  /** `lyth_mempoolStatus` — aggregate mempool snapshot. */
  async lythMempoolStatus() {
    return normalizeMempoolSnapshot(await this.call("lyth_mempoolStatus", []));
  }
  /** `lyth_mempoolPending` — pending txs for a sender. */
  async lythMempoolPending(sender) {
    return this.call("lyth_mempoolPending", [sender]);
  }
  /** `lyth_currentRound` — latest committed height. */
  async lythCurrentRound() {
    return normalizeRoundInfo(await this.call("lyth_currentRound", []));
  }
  /** `lyth_peerSummary` — public-safe aggregate peer-network diagnostics. */
  async lythPeerSummary() {
    return this.call("lyth_peerSummary", []);
  }
  /**
   * `lyth_listActivePrecompiles` — milestone-gated precompile catalogue
   * (OI-0170 / ADR-0015 §5).
   */
  async lythListActivePrecompiles(block = "latest") {
    return this.call("lyth_listActivePrecompiles", [encodeBlockSelector(block)]);
  }
  /** `lyth_capabilities` — address-keyed precompile capability map. */
  async lythCapabilities(block) {
    const params = block === void 0 ? [] : [encodeBlockSelector(block)];
    return this.call("lyth_capabilities", params);
  }
  /**
   * `lyth_operatorCapabilities` — node-level availability for operator UI
   * and explorer surfaces.
   */
  async lythOperatorCapabilities() {
    return this.call("lyth_operatorCapabilities", []);
  }
  /** `lyth_indexerStatus` — indexer status; `null` when disabled. */
  async lythIndexerStatus() {
    const v = await this.call("lyth_indexerStatus", []);
    if (v === null || v === void 0) return null;
    return v;
  }
  /** `lyth_getStorageProof` — batched Merkle proofs. */
  async lythGetStorageProof(address, slots) {
    return this.call("lyth_getStorageProof", [address, slots]);
  }
  /** `lyth_getDelegations` — wallet delegation rows at a block. */
  async lythGetDelegations(wallet, block) {
    const params = block === void 0 ? [wallet] : [wallet, encodeBlockSelector(block)];
    return this.call("lyth_getDelegations", params);
  }
  /** `lyth_getDelegationHistory` — indexed per-wallet delegation event timeline. */
  async lythGetDelegationHistory(wallet, limit = 50, cursor) {
    const params = cursor === void 0 ? [wallet, limit] : [wallet, limit, cursor];
    return this.call("lyth_getDelegationHistory", params);
  }
  /** `lyth_getClusterDelegators` — delegator addresses for a cluster. */
  async lythGetClusterDelegators(cluster, block) {
    const params = block === void 0 ? [cluster] : [cluster, encodeBlockSelector(block)];
    return this.call("lyth_getClusterDelegators", params);
  }
  /** `lyth_getDelegationCap` — active per-cluster cap at a block. */
  async lythGetDelegationCap(block) {
    const params = block === void 0 ? [] : [encodeBlockSelector(block)];
    return this.call("lyth_getDelegationCap", params);
  }
  /** `lyth_getTpmAttestation` — TPM quote digest + EK id for a peer. */
  async lythGetTpmAttestation(peerId, block) {
    const params = block === void 0 ? [peerId] : [peerId, encodeBlockSelector(block)];
    return this.call("lyth_getTpmAttestation", params);
  }
  /** `lyth_getClusterEntity` — entity flag for a cluster. */
  async lythGetClusterEntity(cluster, block) {
    const params = block === void 0 ? [cluster] : [cluster, encodeBlockSelector(block)];
    return this.call("lyth_getClusterEntity", params);
  }
  /** `lyth_getEntityRatchet` — entity-ratchet snapshot at a block. */
  async lythGetEntityRatchet(block) {
    const params = block === void 0 ? [] : [encodeBlockSelector(block)];
    return this.call("lyth_getEntityRatchet", params);
  }
  /** `lyth_operatorInfo` — canonical operator identity envelope. */
  async lythOperatorInfo(operatorId) {
    return normalizeOperatorInfo(await this.call("lyth_operatorInfo", [operatorId]));
  }
  /** `lyth_getServiceProbe` — latest external reachability report for one public service. */
  async lythGetServiceProbe(peerId, serviceMask) {
    assertHexBytes(peerId, 32, "peerId");
    if (!isSinglePublicServiceProbeMask(serviceMask)) {
      throw SdkError.malformed("serviceMask must contain exactly one public-service bit");
    }
    const value = await this.call("lyth_getServiceProbe", [peerId, serviceMask]);
    if (value === null || value === void 0) return null;
    return normalizeServiceProbe(value);
  }
  /** `lyth_reportServiceProbe` — submit a pre-signed public-service probe report. */
  async lythReportServiceProbe(req) {
    assertHexBytes(req.peerId, 32, "peerId");
    if (!isValidPublicServiceProbeMask(req.serviceMask)) {
      throw SdkError.malformed("serviceMask must name one or more public-service bits");
    }
    if (!isConcreteServiceProbeStatus(req.status)) {
      throw SdkError.malformed("status must be reachable, degraded, or unreachable");
    }
    assertSafeUint32(req.latencyMs, "latencyMs");
    assertHexBytes(req.probeDigest, 32, "probeDigest");
    assertNonEmptyHex(req.signedRawTx, "signedRawTx");
    return this.call("lyth_reportServiceProbe", [req]);
  }
  /** `lyth_clusterStatus` — canonical cluster status envelope. */
  async lythClusterStatus(clusterId) {
    return normalizeClusterStatus(await this.call("lyth_clusterStatus", [clusterId]));
  }
  /** `lyth_clusterDirectory` — paged public cluster directory. */
  async lythClusterDirectory(page = 0, limit = 25) {
    return normalizeClusterDirectoryPage(
      await this.call("lyth_clusterDirectory", [page, limit])
    );
  }
  /** `lyth_clusters` — alias for `lyth_clusterDirectory`. */
  async lythClusters(page = 0, limit = 25) {
    return normalizeClusterDirectoryPage(await this.call("lyth_clusters", [page, limit]));
  }
  /**
   * `lyth_submitPendingChange` — operator-onboarding transport for the
   * pending-change ledger. Server validates the envelope shape.
   */
  async lythSubmitPendingChange(envelope) {
    return this.call("lyth_submitPendingChange", [envelope]);
  }
  /** `lyth_submitEncrypted` — submit a bincode-encoded encrypted envelope hex. */
  async lythSubmitEncrypted(envelopeHex) {
    return this.call("lyth_submitEncrypted", [envelopeHex]);
  }
  /** `lyth_getEncryptionKey` — cluster ML-KEM encapsulation key. */
  async lythGetEncryptionKey() {
    return this.call("lyth_getEncryptionKey", []);
  }
  /** `lyth_syncStatus` — DAG-sync driver snapshot. */
  async lythSyncStatus() {
    const v = await this.call("lyth_syncStatus", []);
    if (v === null || v === void 0) return null;
    return v;
  }
  /** `lyth_resolveOperatorAuthority` — operator id to authority index. */
  async lythResolveOperatorAuthority(operatorId) {
    return normalizeOperatorAuthority(
      await this.call("lyth_resolveOperatorAuthority", [operatorId])
    );
  }
  /** `lyth_signingActivity` — recent per-round signing participation. */
  async lythSigningActivity(authorityIndex, limit) {
    const params = limit == null ? [authorityIndex] : [authorityIndex, limit];
    return normalizeSigningActivity(await this.call("lyth_signingActivity", params));
  }
  /** `lyth_upcomingDuties` — deterministic upcoming duty windows. */
  async lythUpcomingDuties(authorityIndex, horizonRounds) {
    const params = horizonRounds == null ? [authorityIndex] : [authorityIndex, horizonRounds];
    return normalizeUpcomingDuties(await this.call("lyth_upcomingDuties", params));
  }
  /** `lyth_operatorRisk` — miss-rate and jail-status window. */
  async lythOperatorRisk(authorityIndex, windowRounds) {
    const params = windowRounds == null ? [authorityIndex] : [authorityIndex, windowRounds];
    return normalizeOperatorRisk(await this.call("lyth_operatorRisk", params));
  }
  /** `lyth_upgradeStatus` — signed network-upgrade readiness at a height. */
  async lythUpgradeStatus(block) {
    const params = block === void 0 ? [] : [encodeBlockSelector(block)];
    return this.call("lyth_upgradeStatus", params);
  }
  /** `lyth_runtimeProvenance` — public-safe build/runtime provenance. */
  async lythRuntimeProvenance() {
    return this.call("lyth_runtimeProvenance", []);
  }
  /** `lyth_txStatus` — discriminated transaction lookup outcome. */
  async lythTxStatus(txHash) {
    return this.call("lyth_txStatus", [txHash]);
  }
  /** `lyth_verticesAtRound` — per-vertex authorship observed at a DAG round. */
  async lythVerticesAtRound(round) {
    return this.call("lyth_verticesAtRound", [
      encodeRpcU64Number(round, "round")
    ]);
  }
  /** `lyth_metricsRange` — retained telemetry series when the node has them. */
  async lythMetricsRange(selectors, range) {
    const params = range === void 0 ? [selectors] : [
      selectors,
      range === null ? null : [
        encodeRpcU64Number(range[0], "fromBlock"),
        encodeRpcU64Number(range[1], "toBlock")
      ]
    ];
    return this.call("lyth_metricsRange", params);
  }
  /** `lyth_getLatestCheckpoint` — latest PQ-finality checkpoint rows. */
  async lythGetLatestCheckpoint(belowHeight) {
    const params = belowHeight === void 0 ? [] : [encodeOptionalHeight(belowHeight)];
    return this.call("lyth_getLatestCheckpoint", params);
  }
  /** `lyth_getClusterResignations` — in-flight + applied operator resignations. */
  async lythGetClusterResignations(operator, status) {
    const params = status === void 0 ? operator == null ? [] : [operator] : [operator ?? null, status];
    return this.call("lyth_getClusterResignations", params);
  }
  /** `lyth_getBlsRoundCertificate` — round-advancement BLS aggregate. */
  async lythGetBlsRoundCertificate(round) {
    return this.call("lyth_getBlsRoundCertificate", [encodeRpcInteger(round)]);
  }
  /** `lyth_getLeaderCertificate` — leader-vote BLS aggregate for a block ref. */
  async lythGetLeaderCertificate(round, authority, digest) {
    return this.call("lyth_getLeaderCertificate", [encodeRpcInteger(round), authority, digest]);
  }
  /** `lyth_getDacCertificate` — data-availability certificate for a block ref. */
  async lythGetDacCertificate(round, authority, digest) {
    return this.call("lyth_getDacCertificate", [encodeRpcInteger(round), authority, digest]);
  }
  /** `lyth_subscribe` — WebSocket-only; returns an RPC error over HTTP. */
  async lythSubscribe(channel) {
    return this.call("lyth_subscribe", [channel]);
  }
  /** `lyth_unsubscribe` — counterpart to `lythSubscribe`. */
  async lythUnsubscribe(subId) {
    return this.call("lyth_unsubscribe", [subId]);
  }
  // ---- debug_* ------------------------------------------------------
  // Server-side gated by `RpcConfig::debug_enabled`. When the namespace
  // is disabled, every call surfaces as `SdkError.rpc`.
  /** `debug_traceTransaction` — revm trace for a confirmed tx. */
  async debugTraceTransaction(txHash) {
    return this.call("debug_traceTransaction", [txHash]);
  }
  /** `debug_traceCall` — revm trace for a dry-run. */
  async debugTraceCall(request, block = "latest") {
    return this.call("debug_traceCall", [request, encodeBlockSelector(block)]);
  }
  /** `debug_traceBlockByNumber` — revm traces for an entire block. */
  async debugTraceBlockByNumber(block) {
    return this.call("debug_traceBlockByNumber", [encodeBlockSelector(block)]);
  }
  /** `debug_mempoolDump` — full mempool snapshot. */
  async debugMempoolDump() {
    return normalizeMempoolSnapshot(await this.call("debug_mempoolDump", []));
  }
  /** `debug_p2pPeers` — connected libp2p peer list. */
  async debugP2pPeers() {
    return this.call("debug_p2pPeers", []);
  }
  /** `debug_stateDiff` — state-diff for a block range. */
  async debugStateDiff(params) {
    return this.call("debug_stateDiff", params);
  }
  /** `debug_chainReorg` — testnet-only reorg trigger. */
  async debugChainReorg(params) {
    return this.call("debug_chainReorg", params);
  }
  // ---- mesh_* -------------------------------------------------------
  /** `mesh_buildUnsignedTx` — build an unsigned transaction envelope. */
  async meshBuildUnsignedTx(intent) {
    return this.call("mesh_buildUnsignedTx", [intent]);
  }
  /** `mesh_combineTx` — combine an unsigned envelope with a wallet signature. */
  async meshCombineTx(unsignedTx, signatureHex, algo, pubkeyHex) {
    const params = algo === void 0 ? [unsignedTx, signatureHex] : pubkeyHex === void 0 ? [unsignedTx, signatureHex, algo] : [unsignedTx, signatureHex, algo, pubkeyHex];
    return this.call("mesh_combineTx", params);
  }
  /** `mesh_decodeTx` — decode a signed or unsigned mesh envelope. */
  async meshDecodeTx(envelopeHex, signed = false) {
    return this.call("mesh_decodeTx", [envelopeHex, signed]);
  }
  /** `mesh_submitTx` — submit a signed mesh envelope. */
  async meshSubmitTx(signedTx) {
    return this.call("mesh_submitTx", [signedTx]);
  }
};
function parseQuantityBig(hex) {
  if (!hex) return 0n;
  const rest = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (rest.length === 0) return 0n;
  if (!/^[0-9a-fA-F]+$/.test(rest)) {
    throw SdkError.malformed(`invalid hex quantity: ${hex}`);
  }
  return BigInt(`0x${rest}`);
}
function parseQuantity(hex) {
  const big = parseQuantityBig(hex);
  if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw SdkError.malformed(`hex quantity exceeds safe integer: ${hex}`);
  }
  return Number(big);
}
function encodeRpcInteger(v) {
  if (typeof v === "bigint") return `0x${v.toString(16)}`;
  return v;
}
function encodeOptionalHeight(v) {
  if (v === null) return null;
  return encodeRpcInteger(v);
}
function encodeRpcU64Number(v, label) {
  return parseRpcNumber(v, label);
}
function parseRpcBigint(value, label) {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw SdkError.malformed(`${label} must be a non-negative quantity`);
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw SdkError.malformed(`${label} must be a non-negative safe integer`);
    }
    return BigInt(value);
  }
  if (typeof value === "string") {
    if (value.startsWith("0x") || value.startsWith("0X")) return parseQuantityBig(value);
    if (/^\d+$/.test(value)) return BigInt(value);
  }
  throw SdkError.malformed(`${label} must be a bigint-compatible quantity`);
}
function parseRpcNumber(value, label) {
  const big = parseRpcBigint(value, label);
  if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw SdkError.malformed(`${label} exceeds safe integer range`);
  }
  return Number(big);
}
function parseRpcNumberNullable(value, label) {
  return value === null || value === void 0 ? null : parseRpcNumber(value, label);
}
function parseRpcBigintNullable(value, label) {
  return value === null || value === void 0 ? null : parseRpcBigint(value, label);
}
function parseStringNullable(value) {
  return value === null || value === void 0 ? null : String(value);
}
function expectObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw SdkError.malformed(`${label} must be an object`);
  }
  return value;
}
function firstField(row, keys, label) {
  for (const key of keys) {
    if (row[key] !== void 0) return row[key];
  }
  throw SdkError.malformed(`${label} is missing (${keys.join(" | ")})`);
}
function normalizeServiceProbe(value) {
  const row = expectObject(value, "service probe response");
  return {
    serviceMask: parseRpcNumber(row["serviceMask"], "service probe serviceMask"),
    status: String(row["status"]),
    statusCode: parseRpcNumber(row["statusCode"], "service probe statusCode"),
    lastProbeBlock: parseRpcNumber(row["lastProbeBlock"], "service probe lastProbeBlock"),
    latencyMs: parseRpcNumber(row["latencyMs"], "service probe latencyMs"),
    probeDigest: String(row["probeDigest"]),
    reporter: String(row["reporter"])
  };
}
function assertSafeUint32(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 4294967295) {
    throw SdkError.malformed(`${label} must be a uint32`);
  }
}
function assertHexBytes(value, expectedLen, label) {
  const body = hexBody(value, label);
  if (body.length !== expectedLen * 2) {
    throw SdkError.malformed(`${label} must be ${expectedLen} bytes`);
  }
}
function assertNonEmptyHex(value, label) {
  const body = hexBody(value, label);
  if (body.length === 0) {
    throw SdkError.malformed(`${label} must be non-empty`);
  }
}
function hexBody(value, label) {
  const body = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  if (body.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw SdkError.malformed(`${label} must be hex bytes`);
  }
  return body;
}
function normalizeOperatorInfo(value) {
  const row = expectObject(value, "operator info response");
  const activeClusterIds = row["activeClusterIds"];
  if (!Array.isArray(activeClusterIds)) {
    throw SdkError.malformed("operator info activeClusterIds must be an array");
  }
  const capability = row["capability"];
  return {
    operatorId: String(row["operatorId"]),
    moniker: parseStringNullable(row["moniker"]),
    alias: parseStringNullable(row["alias"]),
    chainAddress: String(row["chainAddress"]),
    bonded: Boolean(row["bonded"]),
    commissionBps: parseRpcNumberNullable(row["commissionBps"], "operator info commissionBps"),
    delegationCount: parseRpcNumberNullable(
      row["delegationCount"],
      "operator info delegationCount"
    ),
    bondedAmount: String(row["bondedAmount"]),
    activeClusterIds: activeClusterIds.map(
      (v, i) => parseRpcNumber(v, `operator info activeClusterIds[${i}]`)
    ),
    operatorKeyFingerprint: parseStringNullable(row["operatorKeyFingerprint"]),
    blsKeyFingerprint: parseStringNullable(row["blsKeyFingerprint"]),
    lifecycleState: String(row["lifecycleState"]),
    capability: capability && typeof capability === "object" && !Array.isArray(capability) ? capability : {}
  };
}
function normalizeClusterMember(value, label) {
  const row = expectObject(value, label);
  return {
    operatorId: String(row["operatorId"]),
    blsPubkey: String(row["blsPubkey"]),
    state: String(row["state"])
  };
}
function normalizeClusterStatus(value) {
  const row = expectObject(value, "cluster status response");
  const members = row["members"];
  if (!Array.isArray(members)) {
    throw SdkError.malformed("cluster status members must be an array");
  }
  return {
    clusterId: parseRpcNumber(row["clusterId"], "cluster status clusterId"),
    threshold: parseRpcNumber(row["threshold"], "cluster status threshold"),
    size: parseRpcNumber(row["size"], "cluster status size"),
    live: parseRpcNumber(row["live"], "cluster status live"),
    lagging: parseRpcNumber(row["lagging"], "cluster status lagging"),
    offline: parseRpcNumber(row["offline"], "cluster status offline"),
    maintenance: parseRpcNumber(row["maintenance"], "cluster status maintenance"),
    members: members.map((member, i) => normalizeClusterMember(member, `cluster status members[${i}]`)),
    epoch: parseRpcBigintNullable(row["epoch"], "cluster status epoch"),
    round: parseRpcBigintNullable(row["round"], "cluster status round"),
    quorum: String(row["quorum"]),
    reputationScore: parseRpcNumberNullable(
      row["reputationScore"],
      "cluster status reputationScore"
    ),
    livenessScore: parseRpcNumberNullable(row["livenessScore"], "cluster status livenessScore"),
    lastUpdateHeight: parseRpcBigint(row["lastUpdateHeight"], "cluster status lastUpdateHeight")
  };
}
function normalizeClusterDirectoryEntry(value, label) {
  const row = expectObject(value, label);
  const regionDiversity = row["regionDiversity"];
  if (regionDiversity !== null && regionDiversity !== void 0 && !Array.isArray(regionDiversity)) {
    throw SdkError.malformed(`${label}.regionDiversity must be an array or null`);
  }
  return {
    clusterId: parseRpcNumber(row["clusterId"], `${label}.clusterId`),
    size: parseRpcNumber(row["size"], `${label}.size`),
    threshold: parseRpcNumber(row["threshold"], `${label}.threshold`),
    aggregateHealth: String(row["aggregateHealth"]),
    regionDiversity: Array.isArray(regionDiversity) ? regionDiversity.map(String) : null,
    active: Boolean(row["active"])
  };
}
function normalizeClusterDirectoryPage(value) {
  const row = expectObject(value, "cluster directory response");
  const clusters = row["clusters"];
  if (!Array.isArray(clusters)) {
    throw SdkError.malformed("cluster directory clusters must be an array");
  }
  return {
    page: parseRpcNumber(row["page"], "cluster directory page"),
    limit: parseRpcNumber(row["limit"], "cluster directory limit"),
    totalClusters: parseRpcNumber(row["totalClusters"], "cluster directory totalClusters"),
    clusters: clusters.map(
      (cluster, i) => normalizeClusterDirectoryEntry(cluster, `cluster directory clusters[${i}]`)
    )
  };
}
function normalizeOperatorAuthority(value) {
  const row = expectObject(value, "operator authority response");
  return {
    schemaVersion: parseRpcNumber(row["schemaVersion"], "operator authority schemaVersion"),
    operatorId: String(row["operatorId"]),
    authorityIndex: parseRpcNumber(row["authorityIndex"], "operator authority authorityIndex"),
    blsPubkey: String(row["blsPubkey"]),
    active: Boolean(row["active"])
  };
}
function normalizeSigningActivity(value) {
  const row = expectObject(value, "signing activity response");
  const entries = row["entries"];
  if (!Array.isArray(entries)) {
    throw SdkError.malformed("signing activity entries must be an array");
  }
  return {
    schemaVersion: parseRpcNumber(row["schemaVersion"], "signing activity schemaVersion"),
    authorityIndex: parseRpcNumber(row["authorityIndex"], "signing activity authorityIndex"),
    currentRound: parseRpcBigint(row["currentRound"], "signing activity currentRound"),
    limit: parseRpcNumber(row["limit"], "signing activity limit"),
    entries: entries.map((entry, i) => {
      const e = expectObject(entry, `signing activity entries[${i}]`);
      return {
        round: parseRpcBigint(e["round"], `signing activity entries[${i}].round`),
        status: String(e["status"])
      };
    })
  };
}
function normalizeDutyAbsence(value, label) {
  const row = expectObject(value, label);
  return { reason: String(row["reason"]) };
}
function normalizeKeyRotationWindow(value) {
  const row = expectObject(value, "upcoming duties keyRotation");
  if ("nextRound" in row) {
    return {
      nextRound: parseRpcBigint(row["nextRound"], "upcoming duties keyRotation.nextRound"),
      epochLengthRounds: parseRpcBigint(
        row["epochLengthRounds"],
        "upcoming duties keyRotation.epochLengthRounds"
      )
    };
  }
  return { reason: String(row["reason"]) };
}
function normalizeUpcomingDuties(value) {
  const row = expectObject(value, "upcoming duties response");
  const duties = expectObject(row["duties"], "upcoming duties duties");
  const attestation = expectObject(duties["attestation"], "upcoming duties attestation");
  return {
    schemaVersion: parseRpcNumber(row["schemaVersion"], "upcoming duties schemaVersion"),
    authorityIndex: parseRpcNumber(row["authorityIndex"], "upcoming duties authorityIndex"),
    currentRound: parseRpcBigint(row["currentRound"], "upcoming duties currentRound"),
    horizonRounds: parseRpcNumber(row["horizonRounds"], "upcoming duties horizonRounds"),
    duties: {
      attestation: {
        startRound: parseRpcBigint(attestation["startRound"], "upcoming duties attestation.startRound"),
        endRound: parseRpcBigint(attestation["endRound"], "upcoming duties attestation.endRound"),
        kind: String(attestation["kind"])
      },
      blockProduction: normalizeDutyAbsence(
        duties["blockProduction"],
        "upcoming duties blockProduction"
      ),
      sync: normalizeDutyAbsence(duties["sync"], "upcoming duties sync"),
      keyRotation: normalizeKeyRotationWindow(duties["keyRotation"])
    }
  };
}
function normalizeJailStatus(value) {
  const row = expectObject(value, "operator risk jailStatus");
  if ("jailed" in row || "tombstoned" in row) {
    return {
      jailed: Boolean(row["jailed"]),
      tombstoned: Boolean(row["tombstoned"]),
      jailedUntilHeight: parseRpcBigint(
        row["jailedUntilHeight"],
        "operator risk jailStatus.jailedUntilHeight"
      ),
      unjailCount: parseRpcBigint(row["unjailCount"], "operator risk jailStatus.unjailCount")
    };
  }
  return { reason: String(row["reason"]) };
}
function normalizeOperatorRisk(value) {
  const row = expectObject(value, "operator risk response");
  const reasons = row["reasons"];
  if (!Array.isArray(reasons)) {
    throw SdkError.malformed("operator risk reasons must be an array");
  }
  return {
    schemaVersion: parseRpcNumber(row["schemaVersion"], "operator risk schemaVersion"),
    authorityIndex: parseRpcNumber(row["authorityIndex"], "operator risk authorityIndex"),
    dataHeight: parseRpcBigint(row["dataHeight"], "operator risk dataHeight"),
    windowRounds: parseRpcNumber(row["windowRounds"], "operator risk windowRounds"),
    missedRounds: parseRpcNumber(row["missedRounds"], "operator risk missedRounds"),
    observedRounds: parseRpcNumber(row["observedRounds"], "operator risk observedRounds"),
    missRateBps: parseRpcNumber(row["missRateBps"], "operator risk missRateBps"),
    thresholdBps: parseRpcNumber(row["thresholdBps"], "operator risk thresholdBps"),
    remainingHeadroomBps: parseRpcNumber(
      row["remainingHeadroomBps"],
      "operator risk remainingHeadroomBps"
    ),
    jailStatus: normalizeJailStatus(row["jailStatus"]),
    reasons: reasons.map(String)
  };
}
function normalizeBlockHeader(value) {
  if (value === null || value === void 0) return null;
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("block header must be an object or null");
  }
  const h = value;
  return {
    number: parseRpcBigint(h["number"], "block header number"),
    hash: String(h["hash"]),
    parent_hash: String(firstField(h, ["parent_hash", "parentHash"], "block header parent hash")),
    state_root: String(firstField(h, ["state_root", "stateRoot"], "block header state root")),
    timestamp: parseRpcBigint(h["timestamp"], "block header timestamp"),
    executionUnitsUsed: parseRpcBigint(
      firstField(
        h,
        ["executionUnitsUsed", "execution_units_used", "gas_used", "gasUsed"],
        "block header execution units used"
      ),
      "block header execution units used"
    ),
    executionUnitLimit: parseRpcBigint(
      firstField(
        h,
        ["executionUnitLimit", "execution_unit_limit", "gas_limit", "gasLimit"],
        "block header execution unit limit"
      ),
      "block header execution unit limit"
    )
  };
}
function normalizeTransactionReceipt(value) {
  if (value === null || value === void 0) return null;
  const r = expectObject(value, "transaction receipt");
  return {
    tx_hash: String(
      firstField(r, ["tx_hash", "txHash", "transactionHash"], "transaction receipt tx hash")
    ),
    block_hash: String(
      firstField(r, ["block_hash", "blockHash"], "transaction receipt block hash")
    ),
    block_number: parseRpcBigint(
      firstField(r, ["block_number", "blockNumber"], "transaction receipt block number"),
      "transaction receipt block number"
    ),
    tx_index: parseRpcNumber(
      firstField(r, ["tx_index", "txIndex", "transactionIndex"], "transaction receipt tx index"),
      "transaction receipt tx index"
    ),
    status: parseRpcNumber(firstField(r, ["status"], "transaction receipt status"), "transaction receipt status"),
    executionUnitsUsed: parseRpcBigint(
      firstField(
        r,
        ["executionUnitsUsed", "execution_units_used", "gas_used", "gasUsed"],
        "transaction receipt execution units used"
      ),
      "transaction receipt execution units used"
    )
  };
}
function normalizeUserBech32Address(address) {
  try {
    return addressToBech32(typeof address === "string" ? parseAddress(address) : address);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw SdkError.malformed(`invalid provider address: ${message}`);
  }
}
function normalizeRoundInfo(value) {
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("round info must be an object");
  }
  const row = value;
  return {
    height: parseRpcBigint(row["height"], "round height")
  };
}
function normalizeMempoolSnapshot(value) {
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("mempool snapshot must be an object");
  }
  const row = value;
  const bytesByClass = row["bytes_by_class"];
  if (!Array.isArray(bytesByClass) || bytesByClass.length !== 7) {
    throw SdkError.malformed("mempool bytes_by_class must contain 7 entries");
  }
  return {
    count_ready: parseRpcBigint(row["count_ready"], "mempool count_ready"),
    count_pending: parseRpcBigint(row["count_pending"], "mempool count_pending"),
    mailbox_depth: parseRpcBigint(row["mailbox_depth"], "mempool mailbox_depth"),
    bytes_by_class: bytesByClass.map((v, i) => parseRpcBigint(v, `mempool bytes_by_class[${i}]`))
  };
}

// src/crypto/bytes.ts
function concatBytes2(...chunks) {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const chunk of chunks) {
    out.set(chunk, off);
    off += chunk.length;
  }
  return out;
}
function bytesToHex2(bytes) {
  let out = "0x";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}
function hexToBytes2(hex, label = "hex") {
  const stripped = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (stripped.length % 2 !== 0) {
    throw new Error(`${label} must have even length`);
  }
  const out = new Uint8Array(stripped.length / 2);
  for (let i = 0; i < out.length; i++) {
    const b = Number.parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(b)) {
      throw new Error(`${label} contains invalid hex`);
    }
    out[i] = b;
  }
  return out;
}
function expectBytes(value, len, label) {
  if (value.length !== len) {
    throw new Error(`${label} must be ${len} bytes, got ${value.length}`);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function parseBigint(value, label) {
  if (value === void 0) throw new Error(`${label} missing`);
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative safe integer`);
    return BigInt(value);
  }
  if (value.startsWith("0x") || value.startsWith("0X")) return BigInt(value);
  return BigInt(value);
}

// src/crypto/bincode.ts
var BincodeWriter = class {
  #chunks = [];
  u8(value) {
    this.#int(value, 1);
  }
  u16(value) {
    this.#int(value, 2);
  }
  u32(value) {
    this.#int(value, 4);
  }
  u64(value) {
    this.#big(value, 8);
  }
  u128(value) {
    this.#big(value, 16);
  }
  enumVariant(value) {
    this.u32(value);
  }
  rawBytes(bytes) {
    for (const b of bytes) this.#chunks.push(b);
  }
  bytes(bytes) {
    this.u64(BigInt(bytes.length));
    this.rawBytes(bytes);
  }
  optionBytes(bytes) {
    if (bytes === null) {
      this.u8(0);
      return;
    }
    this.u8(1);
    this.rawBytes(bytes);
  }
  toBytes() {
    return Uint8Array.from(this.#chunks);
  }
  #int(value, bytes) {
    if (!Number.isSafeInteger(value) || value < 0 || value >= 2 ** (bytes * 8)) {
      throw new Error(`integer out of u${bytes * 8} range`);
    }
    for (let i = 0; i < bytes; i++) {
      this.#chunks.push(value >> 8 * i & 255);
    }
  }
  #big(value, bytes) {
    let v = typeof value === "bigint" ? value : BigInt(value);
    if (v < 0n || v >= 1n << BigInt(bytes * 8)) {
      throw new Error(`integer out of u${bytes * 8} range`);
    }
    for (let i = 0; i < bytes; i++) {
      this.#chunks.push(Number(v & 0xffn));
      v >>= 8n;
    }
  }
};
var ML_DSA_65_PUBLIC_KEY_LEN = 1952;
var ML_DSA_65_SIGNATURE_LEN = 3309;
var STANDARD_ALGO_NUMBER_ML_DSA_65 = 1001;
var ENUM_VARIANT_INDEX_ML_DSA_65 = 5;

// src/crypto/envelope.ts
var DKG_AEAD_DOMAIN_TAG = new TextEncoder().encode("protocore/v2/mempool/dkg-mlkem768/1");
var ML_KEM_768_ENCAPSULATION_KEY_LEN = 1184;
var DKG_NONCE_LEN = 12;
var MempoolClass = {
  Transfer: 0,
  ContractCall: 1};
function bincodeNonceAad(aad) {
  const w = new BincodeWriter();
  w.bytes(expectBytes(aad.sender, 20, "NonceAad.sender"));
  w.u64(aad.nonce);
  w.u64(aad.chainId);
  w.enumVariant(aad.class);
  w.u128(aad.maxFeePerGas);
  w.u128(aad.maxPriorityFeePerGas);
  w.u64(aad.gasLimit);
  return w.toBytes();
}
function bincodeDecryptHint(hint) {
  const w = new BincodeWriter();
  w.u64(hint.epoch);
  w.u16(hint.scheme);
  return w.toBytes();
}
function bincodeEncryptedEnvelope(env) {
  const w = new BincodeWriter();
  w.rawBytes(bincodeNonceAad(env.nonceAad));
  w.bytes(env.ciphertext);
  w.rawBytes(bincodeDecryptHint(env.decryptionHint));
  bincodeMlDsa65OpaqueInto(w, expectBytes(env.senderPubkey, ML_DSA_65_PUBLIC_KEY_LEN, "senderPubkey"));
  bincodeMlDsa65OpaqueInto(w, expectBytes(env.outerSignature, ML_DSA_65_SIGNATURE_LEN, "outerSignature"));
  w.bytes(expectBytes(env.sender, 20, "sender"));
  return w.toBytes();
}
function encryptInnerTx(signedInnerTxBincode, nonceAad, kemEncapsulationKey) {
  expectBytes(kemEncapsulationKey, ML_KEM_768_ENCAPSULATION_KEY_LEN, "kemEncapsulationKey");
  const { cipherText: kemCt, sharedSecret } = mlKem_js.ml_kem768.encapsulate(kemEncapsulationKey);
  const nonce = utils_js.randomBytes(DKG_NONCE_LEN);
  const cipher = chacha_js.chacha20poly1305(sharedSecret, nonce, aadFor(nonceAad));
  const aeadCt = cipher.encrypt(signedInnerTxBincode);
  sharedSecret.fill(0);
  return concatBytes2(kemCt, nonce, aeadCt);
}
function outerSigDigest(nonceAad, ciphertext, decryptionHint, senderPubkey) {
  const aad = bincodeNonceAad(nonceAad);
  const hint = bincodeDecryptHint(decryptionHint);
  return sha3_js.keccak_256(concatBytes2(aad, ciphertext, hint, expectBytes(senderPubkey, ML_DSA_65_PUBLIC_KEY_LEN, "senderPubkey")));
}
async function buildEncryptedEnvelope(args) {
  const ciphertext = encryptInnerTx(args.signedInnerTxBincode, args.nonceAad, args.kemEncapsulationKey);
  const digest = outerSigDigest(args.nonceAad, ciphertext, args.decryptionHint, args.senderPubkey);
  const outerSignature = await args.signOuterDigest(digest);
  const envelope = {
    nonceAad: args.nonceAad,
    ciphertext,
    decryptionHint: args.decryptionHint,
    senderPubkey: expectBytes(args.senderPubkey, ML_DSA_65_PUBLIC_KEY_LEN, "senderPubkey"),
    outerSignature: expectBytes(outerSignature, ML_DSA_65_SIGNATURE_LEN, "outerSignature"),
    sender: expectBytes(args.senderAddress, 20, "senderAddress")
  };
  const wireBytes = bincodeEncryptedEnvelope(envelope);
  return { envelope, wireBytes, wireHex: bytesToHex2(wireBytes) };
}
function aadFor(aad) {
  return concatBytes2(DKG_AEAD_DOMAIN_TAG, bincodeNonceAad(aad));
}
function bincodeMlDsa65OpaqueInto(w, raw) {
  w.enumVariant(ENUM_VARIANT_INDEX_ML_DSA_65);
  w.u16(STANDARD_ALGO_NUMBER_ML_DSA_65);
  w.bytes(raw);
}

// src/crypto/submission.ts
async function fetchEncryptionKey(client) {
  const result = await client.call(
    "lyth_getEncryptionKey",
    []
  );
  return {
    algo: result.algo ?? "ml-kem-768",
    epoch: typeof result.epoch === "string" ? BigInt(result.epoch) : BigInt(result.epoch),
    encapsulationKey: hexToBytes2(result.encapsulationKey, "encapsulationKey")
  };
}
async function buildEncryptedSubmission(args) {
  const input = normalizeInput(args.tx.input);
  const to = normalizeTo(args.tx.to);
  const nonceAad = {
    sender: args.backend.addressBytes(),
    nonce: parseBigint(args.tx.nonce, "nonce"),
    chainId: parseBigint(args.tx.chainId, "chainId"),
    class: args.class ?? (to !== null && input.length === 0 ? MempoolClass.Transfer : MempoolClass.ContractCall),
    maxFeePerGas: u128Checked(parseBigint(args.tx.maxFeePerGas, "maxFeePerGas"), "maxFeePerGas"),
    maxPriorityFeePerGas: u128Checked(
      parseBigint(args.tx.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
      "maxPriorityFeePerGas"
    ),
    gasLimit: parseBigint(args.tx.gasLimit, "gasLimit")
  };
  const signed = args.backend.signEvmTx(args.tx);
  const decryptionHint = { epoch: args.encryptionKey.epoch, scheme: 0 };
  const built = await buildEncryptedEnvelope({
    signedInnerTxBincode: signed.wireBytes,
    nonceAad,
    decryptionHint,
    kemEncapsulationKey: args.encryptionKey.encapsulationKey,
    senderAddress: args.backend.addressBytes(),
    senderPubkey: args.backend.publicKey(),
    signOuterDigest: (digest) => args.backend.signPrehash(digest)
  });
  return {
    envelopeWireHex: built.wireHex,
    innerSighashHex: `0x${[...signed.sighash].map((b) => b.toString(16).padStart(2, "0")).join("")}`,
    innerTxHashHex: bytesToHex2(signed.txHash),
    innerWireBytes: signed.wireBytes.length
  };
}
async function submitEncryptedEnvelope(client, envelopeWireHex) {
  return client.call("lyth_submitEncrypted", [envelopeWireHex]);
}
function u128Checked(value, field) {
  const cap = (1n << 128n) - 1n;
  if (value < 0n || value > cap) {
    throw new Error(`${field} must fit in u128 for encrypted nonce AAD`);
  }
  return value;
}
function normalizeTo(value) {
  if (value === null) return null;
  if (typeof value === "string") return hexToAddressBytes(value);
  const bytes = value instanceof Uint8Array ? value : Uint8Array.from(value);
  if (bytes.length !== 20) throw new Error("to must be 20 bytes");
  return bytes;
}
function normalizeInput(value) {
  if (value === void 0) return new Uint8Array(0);
  if (typeof value === "string") return hexToBytes2(value, "input");
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

// src/mrv.ts
var MRV_FORMAT_VERSION = 1;
var MRV_PROFILE_MONO_RV32IM_V1 = "mono_rv32im_v1";
var MRV_MEMORY_PAGE_BYTES = 65536;
var MRV_MAX_CODE_BYTES = 16 * 1024 * 1024;
var MRV_MAX_DEBUG_BYTES = 16 * 1024 * 1024;
var MRV_MAX_MEMORY_PAGES = 1024;
var MRV_MAX_ABI_SYMBOLS = 1024;
var MRV_MAX_STORAGE_NAMESPACE_BYTES = 64;
var LYTH_DECIMALS = 8;
var NATIVE_LYTH_DECIMALS = LYTH_DECIMALS;
var LYTHOSHI_PER_LYTH = 100000000n;
var MRV_TX_EXTENSION_KIND = 48;
var MRV_TX_EXTENSION_V1 = 1;
var MRV_CODE_HASH_DOMAIN = new TextEncoder().encode("MONO_MRV_CODE_V1");
var MRV_CONTRACT_ADDRESS_DOMAIN = new TextEncoder().encode("mono:riscv:contract-address:v1");
var MONO_SYSCALL_MODULE = "mono";
var SYSCALLS = [
  [257, "storage_read"],
  [258, "storage_write"],
  [259, "storage_delete"],
  [513, "caller"],
  [514, "contract_address"],
  [515, "block_height"],
  [516, "block_hash"],
  [769, "call_contract"],
  [770, "emit_event"],
  [771, "transfer_native"],
  [1025, "verify_signature"],
  [1026, "hash"],
  [1281, "revert"]
];
var SYSCALL_NAME_BY_ID = new Map(SYSCALLS);
var SYSCALL_ID_BY_NAME = new Map(SYSCALLS.map(([id, name]) => [name, id]));
var MrvValidationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MrvValidationError";
  }
};
var MRV_STRUCTURED_FEE_FIELDS = [
  "total_lythoshi",
  "total_lyth",
  "cycles_used",
  "base_price_per_cycle_lythoshi",
  "state_io_units",
  "state_io_price_per_unit_lythoshi",
  "priority_tip_lythoshi"
];
function formatLyth(lythoshi, options = {}) {
  const amount = BigInt(normalizeDecimalLike("lythoshi", lythoshi));
  const whole = amount / LYTHOSHI_PER_LYTH;
  const fraction = amount % LYTHOSHI_PER_LYTH;
  let formatted = formatWholeWithCommas(whole);
  if (fraction !== 0n) {
    formatted += `.${fraction.toString().padStart(NATIVE_LYTH_DECIMALS, "0").replace(/0+$/, "")}`;
  }
  if (options.includeUnit !== false) {
    formatted += " LYTH";
  }
  return formatted;
}
function formatLythoshi(lythoshi, options = {}) {
  return formatLyth(lythoshi, options);
}
function parseLythToLythoshi(input) {
  const numeric = stripLythUnit(input);
  const parts = numeric.split(".");
  if (parts.length > 2) {
    throw new MrvValidationError("lyth amount must be a canonical LYTH decimal");
  }
  const [wholeRaw, fractionRaw = ""] = parts;
  if (!isCanonicalWholeLyth(wholeRaw)) {
    throw new MrvValidationError("lyth amount must be a canonical LYTH decimal");
  }
  if (numeric.includes(".") && fractionRaw.length === 0) {
    throw new MrvValidationError("lyth amount must be a canonical LYTH decimal");
  }
  if (fractionRaw.length > NATIVE_LYTH_DECIMALS || !/^[0-9]*$/.test(fractionRaw)) {
    throw new MrvValidationError("lyth amount supports at most 8 decimal places");
  }
  const whole = BigInt(wholeRaw.replaceAll(",", ""));
  const fraction = fractionRaw === "" ? 0n : BigInt(fractionRaw.padEnd(NATIVE_LYTH_DECIMALS, "0"));
  return whole * LYTHOSHI_PER_LYTH + fraction;
}
function checkMrvFeeDisplayConformance(input) {
  const expectedTotalLythoshi = normalizeDecimalLike("expectedTotalLythoshi", input.expectedTotalLythoshi);
  const expectedDefaultFeeText = formatLyth(expectedTotalLythoshi);
  const failures = [];
  const amountCandidates = extractLythAmountCandidates(input.defaultFeeText);
  if (amountCandidates.length !== 1) {
    failures.push("defaultFeeText must contain exactly one LYTH-denominated fee amount");
  } else {
    const renderedCandidate = `${amountCandidates[0]} LYTH`;
    if (renderedCandidate !== expectedDefaultFeeText) {
      failures.push(`defaultFeeText fee must be ${expectedDefaultFeeText}`);
    }
    try {
      const parsed = parseLythToLythoshi(renderedCandidate);
      if (parsed.toString() !== expectedTotalLythoshi) {
        failures.push(`defaultFeeText fee must total ${expectedTotalLythoshi} lythoshi`);
      }
    } catch {
      failures.push("defaultFeeText fee must be a canonical 8-decimal LYTH amount");
    }
  }
  const defaultForbidden = firstForbiddenDefaultFeeTerm(input.defaultFeeText);
  if (defaultForbidden !== void 0) {
    failures.push(`defaultFeeText exposes detail-only fee term '${defaultForbidden}'`);
  }
  for (const [index, detailText] of (input.detailTexts ?? []).entries()) {
    const detailForbidden = firstForbiddenDetailFeeTerm(detailText);
    if (detailForbidden !== void 0) {
      failures.push(`detailTexts[${index}] exposes inherited fee term '${detailForbidden}'`);
    }
  }
  if (input.structuredFee !== void 0) {
    checkStructuredFeeObject(input.structuredFee, expectedTotalLythoshi, failures);
  }
  if (input.customFeeInputVisible === true) {
    failures.push("default surface must not expose custom fee inputs");
  }
  if (input.speedUpCancelVisible === true) {
    failures.push("default surface must not expose speed-up or cancel controls");
  }
  return {
    passed: failures.length === 0,
    failures,
    expectedDefaultFeeText
  };
}
function assertMrvFeeDisplayConformance(input) {
  const report = checkMrvFeeDisplayConformance(input);
  if (!report.passed) {
    throw new MrvValidationError(`fee display conformance failed: ${report.failures.join("; ")}`);
  }
}
function formatNativeReceiptFeeDisplay(fee) {
  const totalLythoshi = normalizeDecimalLike("fee.total_lythoshi", fee.total_lythoshi);
  const totalLyth = formatLyth(totalLythoshi, { includeUnit: false });
  return {
    defaultFeeText: `Network fee: ${totalLyth} LYTH`,
    detailTexts: [
      `cycles ${fee.cycles_used}, state I/O ${fee.state_io_units}, total ${totalLythoshi} lythoshi`,
      `cycle price ${fee.base_price_per_cycle_lythoshi} lythoshi, state I/O price ${fee.state_io_price_per_unit_lythoshi} lythoshi, priority tip ${fee.priority_tip_lythoshi} lythoshi`
    ],
    totalLythoshi,
    totalLyth
  };
}
function mrvCodeHashHex(code) {
  const codeBytes = bytesFrom(code, "code");
  const len = new Uint8Array(8);
  new DataView(len.buffer).setBigUint64(0, BigInt(codeBytes.length), false);
  return bytesToHex3(blake3_js.blake3(concatBytes3(MRV_CODE_HASH_DOMAIN, len, codeBytes)));
}
function mrvV1TransactionExtension() {
  return { kind: MRV_TX_EXTENSION_KIND, bodyHex: "0x01" };
}
function mrvAddressToBech32(kind, bytes) {
  return addressToTypedBech32(kind, bytesFrom(bytes, "address"));
}
function mrvBech32ToAddress(address, expectedKind) {
  return typedBech32ToAddress(address, expectedKind);
}
function deriveMrvContractAddress(deployerAddress, deployerNonce, artifactHashHex) {
  const deployer = typedBech32ToAddress(deployerAddress);
  const artifactHash = hexToBytes3(artifactHashHex, "artifactHash");
  if (artifactHash.length !== 32) throw new MrvValidationError("artifactHash must be 32 bytes");
  const nonceValue = normalizeU64(deployerNonce, "deployerNonce");
  const nonce = new Uint8Array(8);
  new DataView(nonce.buffer).setBigUint64(0, nonceValue, false);
  const digest = blake3_js.blake3(
    concatBytes3(
      MRV_CONTRACT_ADDRESS_DOMAIN,
      new TextEncoder().encode(ADDRESS_KIND_HRPS[deployer.kind]),
      Uint8Array.of(0),
      hexToBytes3(deployer.hex, "deployerAddress"),
      nonce,
      artifactHash
    )
  );
  return addressToTypedBech32("contract", digest.slice(0, 20));
}
function validateMrvArtifactMetadata(metadata, code) {
  const codeBytes = bytesFrom(code, "code");
  if (metadata.formatVersion !== MRV_FORMAT_VERSION) {
    throw new MrvValidationError(
      `unsupported MRV format version ${metadata.formatVersion}, expected ${MRV_FORMAT_VERSION}`
    );
  }
  if (metadata.profile !== MRV_PROFILE_MONO_RV32IM_V1) {
    throw new MrvValidationError(`unsupported MRV profile ${metadata.profile}`);
  }
  if (codeBytes.length === 0) {
    throw new MrvValidationError("MRV code is empty");
  }
  if (codeBytes.length > MRV_MAX_CODE_BYTES) {
    throw new MrvValidationError(`MRV code has ${codeBytes.length} bytes, max ${MRV_MAX_CODE_BYTES}`);
  }
  if (metadata.codeBytes !== BigInt(codeBytes.length)) {
    throw new MrvValidationError(
      `metadata codeBytes ${metadata.codeBytes.toString()} does not match supplied code length ${codeBytes.length}`
    );
  }
  if (metadata.debugBytes > BigInt(MRV_MAX_DEBUG_BYTES)) {
    throw new MrvValidationError(`MRV debug section has ${metadata.debugBytes.toString()} bytes`);
  }
  validateHexLength("codeHash", metadata.codeHash, 32);
  validateHexLength("sourceDigest", metadata.build.sourceDigest, 32);
  validateMemory(metadata.memory.initialPages, metadata.memory.maxPages, metadata.memory.stackBytes);
  validateStorageNamespace(metadata.storageNamespace.name, metadata.storageNamespace.version);
  validateAbi(metadata.abi);
  const syscalls = validateImports(metadata.imports);
  const computed = mrvCodeHashHex(codeBytes);
  if (metadata.codeHash.toLowerCase() !== computed) {
    throw new MrvValidationError(`MRV code hash mismatch: declared ${metadata.codeHash}, computed ${computed}`);
  }
  return {
    codeHash: computed,
    profile: metadata.profile,
    memory: metadata.memory,
    storageNamespace: metadata.storageNamespace,
    syscalls,
    abiSymbolCount: BigInt(metadata.abi.symbols.length),
    codeBytes: BigInt(codeBytes.length)
  };
}
function validateMrvDeployRequest(request) {
  if (request.from !== void 0) typedBech32ToAddress(request.from, "user");
  hexToBytes3(request.artifactBytes, "artifactBytes");
  validateDecimal("valueLythoshi", request.valueLythoshi);
  validateOptionalDecimal("maxExecutionFeeLythoshi", request.maxExecutionFeeLythoshi);
  validateOptionalDecimal("priorityTipLythoshi", request.priorityTipLythoshi);
  validateExecutionUnitLimit("executionUnitLimit", request.executionUnitLimit);
}
function validateMrvCallRequest(request) {
  if (request.from !== void 0) typedBech32ToAddress(request.from, "user");
  typedBech32ToAddress(request.contractAddress, "contract");
  hexToBytes3(request.input, "input");
  validateDecimal("valueLythoshi", request.valueLythoshi);
  validateOptionalDecimal("maxExecutionFeeLythoshi", request.maxExecutionFeeLythoshi);
  validateOptionalDecimal("priorityTipLythoshi", request.priorityTipLythoshi);
  validateExecutionUnitLimit("executionUnitLimit", request.executionUnitLimit);
}
function buildMrvDeployRequest(artifactBytes, options = {}) {
  const request = {
    artifactBytes: normalizeBytesHex(artifactBytes, "artifactBytes"),
    valueLythoshi: normalizeDecimalLike("valueLythoshi", options.valueLythoshi, "0")
  };
  applyRequestOptions(request, options);
  validateMrvDeployRequest(request);
  return request;
}
function buildMrvCallRequest(contractAddress, input = "0x", options = {}) {
  const request = {
    contractAddress,
    input: normalizeBytesHex(input, "input"),
    valueLythoshi: normalizeDecimalLike("valueLythoshi", options.valueLythoshi, "0")
  };
  applyRequestOptions(request, options);
  validateMrvCallRequest(request);
  return request;
}
function buildMrvDeployPlan(artifactBytes, options = {}) {
  const request = buildMrvDeployRequest(artifactBytes, options);
  const plan = {
    request,
    extension: mrvV1TransactionExtension()
  };
  if (options.artifactHash !== void 0 && request.from !== void 0 && request.nonce !== void 0) {
    plan.expectedContractAddress = deriveMrvContractAddress(request.from, request.nonce, options.artifactHash);
  } else if (options.artifactHash !== void 0) {
    validateHexLength("artifactHash", options.artifactHash, 32);
  }
  return plan;
}
function buildMrvCallPlan(contractAddress, input = "0x", options = {}) {
  return {
    request: buildMrvCallRequest(contractAddress, input, options),
    extension: mrvV1TransactionExtension()
  };
}
function buildMrvDeployNativeTxPlan(artifactBytes, options) {
  const chainId = normalizeU64(options.chainId, "chainId");
  const nonce = normalizeU64(options.nonce, "nonce");
  const executionUnitLimit = normalizeU64(options.executionUnitLimit, "executionUnitLimit");
  const maxExecutionFee = normalizeDecimalLike("maxExecutionFeeLythoshi", options.maxExecutionFeeLythoshi);
  const priorityTip = options.priorityTipLythoshi === void 0 ? void 0 : normalizeDecimalLike("priorityTipLythoshi", options.priorityTipLythoshi);
  const plan = buildMrvDeployPlan(artifactBytes, {
    ...options,
    nonce,
    executionUnitLimit,
    maxExecutionFeeLythoshi: maxExecutionFee,
    priorityTipLythoshi: priorityTip
  });
  return {
    ...plan,
    nativeTx: {
      chainId,
      nonce,
      valueLythoshi: plan.request.valueLythoshi,
      executionUnitLimit,
      maxExecutionFeeLythoshi: maxExecutionFee,
      priorityTipLythoshi: priorityTip ?? "0"
    },
    feePreview: buildMrvNativeFeePreview(executionUnitLimit, maxExecutionFee, priorityTip ?? "0"),
    tx: {
      chainId,
      nonce,
      maxPriorityFeePerGas: priorityTip ?? "0",
      maxFeePerGas: maxExecutionFee,
      gasLimit: executionUnitLimit,
      to: null,
      value: plan.request.valueLythoshi,
      input: plan.request.artifactBytes,
      extensions: [plan.extension]
    }
  };
}
function buildMrvCallNativeTxPlan(contractAddress, input, options) {
  const chainId = normalizeU64(options.chainId, "chainId");
  const nonce = normalizeU64(options.nonce, "nonce");
  const executionUnitLimit = normalizeU64(options.executionUnitLimit, "executionUnitLimit");
  const maxExecutionFee = normalizeDecimalLike("maxExecutionFeeLythoshi", options.maxExecutionFeeLythoshi);
  const priorityTip = options.priorityTipLythoshi === void 0 ? void 0 : normalizeDecimalLike("priorityTipLythoshi", options.priorityTipLythoshi);
  const plan = buildMrvCallPlan(contractAddress, input, {
    ...options,
    nonce,
    executionUnitLimit,
    maxExecutionFeeLythoshi: maxExecutionFee,
    priorityTipLythoshi: priorityTip
  });
  return {
    ...plan,
    nativeTx: {
      chainId,
      nonce,
      valueLythoshi: plan.request.valueLythoshi,
      executionUnitLimit,
      maxExecutionFeeLythoshi: maxExecutionFee,
      priorityTipLythoshi: priorityTip ?? "0"
    },
    feePreview: buildMrvNativeFeePreview(executionUnitLimit, maxExecutionFee, priorityTip ?? "0"),
    tx: {
      chainId,
      nonce,
      maxPriorityFeePerGas: priorityTip ?? "0",
      maxFeePerGas: maxExecutionFee,
      gasLimit: executionUnitLimit,
      to: typedBech32ToAddress(plan.request.contractAddress, "contract").hex,
      value: plan.request.valueLythoshi,
      input: plan.request.input,
      extensions: [plan.extension]
    }
  };
}
function assertMrvDeployNativeSubmissionPlan(plan) {
  assertMrvNativeSubmissionEnvelope(plan);
  if (plan.tx.to !== null) {
    throw new MrvValidationError("MRV deploy submission tx.to must be null");
  }
  const txInput = normalizeBytesHex(plan.tx.input ?? "0x", "tx.input");
  if (txInput !== plan.request.artifactBytes) {
    throw new MrvValidationError("MRV deploy submission tx.input must match artifactBytes");
  }
}
function assertMrvCallNativeSubmissionPlan(plan) {
  assertMrvNativeSubmissionEnvelope(plan);
  const actualTo = normalizeNativeTxToHex(plan.tx.to, "tx.to");
  if (actualTo === null) {
    throw new MrvValidationError("MRV call submission tx.to must be a 20-byte contract address");
  }
  const expectedTo = typedBech32ToAddress(plan.request.contractAddress, "contract").hex.toLowerCase();
  if (actualTo !== expectedTo) {
    throw new MrvValidationError("MRV call submission tx.to must match contractAddress");
  }
  const txInput = normalizeBytesHex(plan.tx.input ?? "0x", "tx.input");
  if (txInput !== plan.request.input) {
    throw new MrvValidationError("MRV call submission tx.input must match request input");
  }
}
function buildMrvNativeFeePreview(executionUnitLimit, maxExecutionFeeLythoshi, priorityTipLythoshi) {
  const totalLythoshi = normalizeDecimalLike("maxExecutionFeeLythoshi", maxExecutionFeeLythoshi);
  return {
    totalLythoshi,
    totalLyth: formatLyth(totalLythoshi, { includeUnit: false }),
    cyclesUsed: executionUnitLimit,
    executionUnitLimit,
    maxExecutionFeeLythoshi: totalLythoshi,
    priorityTipLythoshi: normalizeDecimalLike("priorityTipLythoshi", priorityTipLythoshi)
  };
}
async function submitMrvDeployNativeTx(client, backend, artifactBytes, options) {
  const plan = buildMrvDeployNativeTxPlan(artifactBytes, options);
  assertMrvDeployNativeSubmissionPlan(plan);
  const submission = await buildEncryptedSubmission({
    backend,
    tx: plan.tx,
    encryptionKey: options.encryptionKey ?? await fetchEncryptionKey(client),
    class: options.class
  });
  return {
    ...plan,
    ...submission,
    txHash: await submitEncryptedEnvelope(client, submission.envelopeWireHex)
  };
}
async function submitMrvCallNativeTx(client, backend, contractAddress, input, options) {
  const plan = buildMrvCallNativeTxPlan(contractAddress, input, options);
  assertMrvCallNativeSubmissionPlan(plan);
  const submission = await buildEncryptedSubmission({
    backend,
    tx: plan.tx,
    encryptionKey: options.encryptionKey ?? await fetchEncryptionKey(client),
    class: options.class
  });
  return {
    ...plan,
    ...submission,
    txHash: await submitEncryptedEnvelope(client, submission.envelopeWireHex)
  };
}
function assertMrvNativeSubmissionEnvelope(plan) {
  const extensions = plan.tx.extensions ?? [];
  if (extensions.length !== 1) {
    throw new MrvValidationError("MRV native submission must carry exactly one transaction extension");
  }
  assertMrvV1Extension(plan.extension, "extension");
  assertMrvV1Extension(extensions[0], "tx.extensions[0]");
  assertSameBigint("tx.chainId", plan.tx.chainId, plan.nativeTx.chainId);
  assertSameBigint("tx.nonce", plan.tx.nonce, plan.nativeTx.nonce);
  assertSameBigint("tx.gasLimit", plan.tx.gasLimit, plan.nativeTx.executionUnitLimit);
  assertSameDecimal("tx.value", plan.tx.value, plan.nativeTx.valueLythoshi);
  assertSameDecimal("tx.maxFeePerGas", plan.tx.maxFeePerGas, plan.nativeTx.maxExecutionFeeLythoshi);
  assertSameDecimal("tx.maxPriorityFeePerGas", plan.tx.maxPriorityFeePerGas, plan.nativeTx.priorityTipLythoshi);
  assertU128Lythoshi("maxExecutionFeeLythoshi", plan.nativeTx.maxExecutionFeeLythoshi);
  assertU128Lythoshi("priorityTipLythoshi", plan.nativeTx.priorityTipLythoshi);
}
function assertMrvV1Extension(extension, field) {
  if (extension.kind !== MRV_TX_EXTENSION_KIND) {
    throw new MrvValidationError(`${field}.kind must be MRV v1 extension kind`);
  }
  const bodyHex = normalizeBytesHex("bodyHex" in extension ? extension.bodyHex : extension.body, `${field}.body`);
  if (bodyHex !== "0x01") {
    throw new MrvValidationError(`${field}.body must be MRV v1 extension body`);
  }
}
function assertSameBigint(field, actual, expected) {
  if (normalizeU64Like(actual, field) !== expected) {
    throw new MrvValidationError(`${field} must match nativeTx`);
  }
}
function assertSameDecimal(field, actual, expected) {
  if (normalizeDecimalLike(field, actual) !== expected) {
    throw new MrvValidationError(`${field} must match nativeTx`);
  }
}
function assertU128Lythoshi(field, value) {
  const normalized = BigInt(normalizeDecimalLike(field, value));
  if (normalized > (1n << 128n) - 1n) {
    throw new MrvValidationError(`${field} must fit in u128 for encrypted submission`);
  }
}
function normalizeNativeTxToHex(value, field) {
  if (value === null) return null;
  const bytes = bytesFrom(value, field);
  if (bytes.length !== 20) {
    throw new MrvValidationError(`${field} must be a 20-byte address`);
  }
  return bytesToHex3(bytes).toLowerCase();
}
function normalizeU64Like(value, field) {
  if (typeof value === "string") {
    return normalizeU64(BigInt(normalizeDecimalLike(field, value)), field);
  }
  return normalizeU64(value, field);
}
function validateMemory(initialPages, maxPages, stackBytes) {
  if (initialPages === 0) throw new MrvValidationError("initialPages is zero");
  if (maxPages === 0) throw new MrvValidationError("maxPages is zero");
  if (initialPages > maxPages) throw new MrvValidationError("initialPages exceeds maxPages");
  if (maxPages > MRV_MAX_MEMORY_PAGES) throw new MrvValidationError("maxPages exceeds bound");
  if (stackBytes === 0) throw new MrvValidationError("stackBytes is zero");
  const maxBytes = maxPages * MRV_MEMORY_PAGE_BYTES;
  if (stackBytes > maxBytes) throw new MrvValidationError("stackBytes exceeds max memory");
  if (stackBytes % 16 !== 0) throw new MrvValidationError("stackBytes must be 16-byte aligned");
}
function validateStorageNamespace(name, version2) {
  if (version2 === 0) throw new MrvValidationError("storage namespace version must be non-zero");
  if (name.length > MRV_MAX_STORAGE_NAMESPACE_BYTES) throw new MrvValidationError("storage namespace is too long");
  if (!isIdentifier(name)) throw new MrvValidationError("storage namespace is not canonical");
}
function validateAbi(abi) {
  if (abi.symbols.length === 0) throw new MrvValidationError("MRV ABI must declare at least one symbol");
  if (abi.symbols.length > MRV_MAX_ABI_SYMBOLS) {
    throw new MrvValidationError(`MRV ABI has ${abi.symbols.length} symbols, max ${MRV_MAX_ABI_SYMBOLS}`);
  }
  const seen = /* @__PURE__ */ new Set();
  for (const symbol of abi.symbols) {
    if (!isIdentifier(symbol.name)) throw new MrvValidationError(`invalid MRV ABI symbol '${symbol.name}'`);
    if (seen.has(symbol.name)) throw new MrvValidationError(`duplicate MRV ABI symbol '${symbol.name}'`);
    seen.add(symbol.name);
    for (const param of [...symbol.inputs, ...symbol.outputs]) {
      if (!isIdentifier(param.name)) throw new MrvValidationError(`invalid MRV ABI parameter '${param.name}'`);
      validateAbiType(param.ty);
    }
  }
}
function validateAbiType(ty) {
  if (ty.kind === "fixedBytes" && ty.len === 0) {
    throw new MrvValidationError("fixed bytes length is zero");
  }
}
function validateImports(imports) {
  const seen = /* @__PURE__ */ new Set();
  const resolved = [];
  for (const imp of imports) {
    if (imp.module !== MONO_SYSCALL_MODULE) {
      throw new MrvValidationError(`forbidden host import ${imp.module}.${imp.name}`);
    }
    const expectedName = SYSCALL_NAME_BY_ID.get(imp.id);
    if (expectedName === void 0) throw new MrvValidationError(`unknown MRV syscall id ${imp.id}`);
    const expectedId = SYSCALL_ID_BY_NAME.get(imp.name);
    if (expectedId === void 0) throw new MrvValidationError(`unknown MRV syscall name '${imp.name}'`);
    if (expectedId !== imp.id) {
      throw new MrvValidationError(`MRV syscall name/id mismatch for ${imp.name}: declared ${imp.id}`);
    }
    if (seen.has(imp.id)) throw new MrvValidationError(`duplicate MRV syscall '${expectedName}'`);
    seen.add(imp.id);
    resolved.push({ id: imp.id, name: expectedName });
  }
  return resolved;
}
function validateOptionalDecimal(field, value) {
  if (value !== void 0) validateDecimal(field, value);
}
function applyRequestOptions(request, options) {
  if (options.from !== void 0) request.from = options.from;
  const executionUnitLimit = normalizeOptionalU64("executionUnitLimit", options.executionUnitLimit);
  if (executionUnitLimit !== void 0) request.executionUnitLimit = executionUnitLimit;
  const maxExecutionFee = normalizeOptionalDecimalLike(
    "maxExecutionFeeLythoshi",
    options.maxExecutionFeeLythoshi
  );
  if (maxExecutionFee !== void 0) request.maxExecutionFeeLythoshi = maxExecutionFee;
  const priorityTip = normalizeOptionalDecimalLike("priorityTipLythoshi", options.priorityTipLythoshi);
  if (priorityTip !== void 0) request.priorityTipLythoshi = priorityTip;
  const nonce = normalizeOptionalU64("nonce", options.nonce);
  if (nonce !== void 0) request.nonce = nonce;
}
function normalizeBytesHex(value, field) {
  return bytesToHex3(bytesFrom(value, field));
}
function normalizeOptionalDecimalLike(field, value) {
  return value === void 0 ? void 0 : normalizeDecimalLike(field, value);
}
function formatWholeWithCommas(value) {
  const digits = value.toString();
  const firstGroupLen = digits.length % 3;
  const groups = [];
  let index = 0;
  if (firstGroupLen !== 0) {
    groups.push(digits.slice(0, firstGroupLen));
    index = firstGroupLen;
  }
  while (index < digits.length) {
    groups.push(digits.slice(index, index + 3));
    index += 3;
  }
  return groups.join(",");
}
function stripLythUnit(input) {
  const trimmed = input.trim();
  const withoutUnit = trimmed.replace(/\s+LYTH$/i, "").trim();
  if (withoutUnit.length === 0) {
    throw new MrvValidationError("lyth amount must be a canonical LYTH decimal");
  }
  return withoutUnit;
}
function isCanonicalWholeLyth(value) {
  if (/^(0|[1-9][0-9]*)$/.test(value)) {
    return true;
  }
  return /^[1-9][0-9]{0,2}(,[0-9]{3})+$/.test(value);
}
function extractLythAmountCandidates(text) {
  return [...text.matchAll(/(?:^|[^A-Za-z0-9_])([0-9][0-9,]*(?:\.[0-9]+)?)\s+LYTH\b/g)].map(
    (match) => match[1]
  );
}
function firstForbiddenDefaultFeeTerm(text) {
  const tokens = feeTermTokens(text);
  for (const forbidden of ["gas", "gwei", "wei", "cycle", "cycles", "lythoshi"]) {
    if (tokens.includes(forbidden)) return forbidden;
  }
  if (hasAdjacentTerms(tokens, "state", "io") || hasStateIOTerms(tokens)) return "state I/O";
  return void 0;
}
function firstForbiddenDetailFeeTerm(text) {
  const tokens = feeTermTokens(text);
  for (const forbidden of ["gas", "gwei", "wei"]) {
    if (tokens.includes(forbidden)) return forbidden;
  }
  return void 0;
}
function feeTermTokens(text) {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}
function hasAdjacentTerms(tokens, first, second) {
  return tokens.some((token, index) => token === first && tokens[index + 1] === second);
}
function hasStateIOTerms(tokens) {
  return tokens.some((token, index) => token === "state" && tokens[index + 1] === "i" && tokens[index + 2] === "o");
}
function checkStructuredFeeObject(value, expectedTotalLythoshi, failures) {
  if (!isRecord(value)) {
    failures.push("structuredFee must be an object");
    return;
  }
  const expectedFields = new Set(MRV_STRUCTURED_FEE_FIELDS);
  const actualFields = Object.keys(value);
  for (const field of MRV_STRUCTURED_FEE_FIELDS) {
    if (!(field in value)) failures.push(`structuredFee is missing '${field}'`);
  }
  for (const field of actualFields) {
    if (!expectedFields.has(field)) failures.push(`structuredFee has unexpected field '${field}'`);
  }
  const totalLythoshi = stringField(value, "total_lythoshi", failures);
  if (totalLythoshi !== void 0 && totalLythoshi !== expectedTotalLythoshi) {
    failures.push(`structuredFee.total_lythoshi must be ${expectedTotalLythoshi}`);
  }
  const totalLyth = lythDecimalField(value, "total_lyth", failures);
  const expectedTotalLyth = formatLyth(expectedTotalLythoshi, { includeUnit: false });
  if (totalLyth !== void 0 && totalLyth !== expectedTotalLyth) {
    failures.push(`structuredFee.total_lyth must be ${expectedTotalLyth}`);
  }
  for (const field of [
    "base_price_per_cycle_lythoshi",
    "state_io_price_per_unit_lythoshi",
    "priority_tip_lythoshi"
  ]) {
    stringField(value, field, failures);
  }
  for (const field of ["cycles_used", "state_io_units"]) {
    integerField(value, field, failures);
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringField(value, field, failures) {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string" || !isCanonicalUnsignedDecimalString(fieldValue)) {
    failures.push(`structuredFee.${field} must be a canonical unsigned decimal string`);
    return void 0;
  }
  return fieldValue;
}
function lythDecimalField(value, field, failures) {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string") {
    failures.push(`structuredFee.${field} must be a canonical LYTH decimal string`);
    return void 0;
  }
  try {
    parseLythToLythoshi(`${fieldValue} LYTH`);
  } catch {
    failures.push(`structuredFee.${field} must be a canonical LYTH decimal string`);
    return void 0;
  }
  return fieldValue;
}
function integerField(value, field, failures) {
  const fieldValue = value[field];
  if (typeof fieldValue !== "number" || !Number.isSafeInteger(fieldValue) || fieldValue < 0) {
    failures.push(`structuredFee.${field} must be a non-negative safe integer`);
  }
}
function isCanonicalUnsignedDecimalString(value) {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) return false;
  try {
    BigInt(value);
    return true;
  } catch {
    return false;
  }
}
function normalizeDecimalLike(field, value, defaultValue) {
  if (value === void 0) {
    if (defaultValue === void 0) throw new MrvValidationError(`${field} is required`);
    return defaultValue;
  }
  if (typeof value === "string") {
    validateDecimal(field, value);
    return value;
  }
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new MrvValidationError(`${field} must be a safe unsigned integer`);
  }
  const out = BigInt(value);
  if (out < 0n) throw new MrvValidationError(`${field} must be a canonical unsigned decimal string`);
  return out.toString();
}
function normalizeOptionalU64(field, value) {
  return value === void 0 ? void 0 : normalizeU64(value, field);
}
function validateDecimal(field, value) {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new MrvValidationError(`${field} must be a canonical unsigned decimal string`);
  }
  try {
    BigInt(value);
  } catch {
    throw new MrvValidationError(`${field} must be a canonical unsigned decimal string`);
  }
}
function validateExecutionUnitLimit(field, value) {
  if (value !== void 0 && BigInt(value) === 0n) {
    throw new MrvValidationError(`${field} must be greater than zero`);
  }
}
function normalizeU64(value, field) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new MrvValidationError(`${field} must be a safe unsigned integer`);
  }
  const out = BigInt(value);
  if (out < 0n || out > 0xffffffffffffffffn) {
    throw new MrvValidationError(`${field} must fit in u64`);
  }
  return out;
}
function validateHexLength(field, value, expected) {
  const bytes = hexToBytes3(value, field);
  if (bytes.length !== expected) throw new MrvValidationError(`${field} must be ${expected} bytes`);
}
function bytesFrom(value, field) {
  if (typeof value === "string") return hexToBytes3(value, field);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes3(value, field) {
  if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) {
    throw new MrvValidationError(`${field} must be 0x-prefixed even-length hex`);
  }
  const out = new Uint8Array((value.length - 2) / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(value.slice(2 + i * 2, 4 + i * 2), 16);
  }
  return out;
}
function bytesToHex3(bytes) {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function concatBytes3(...parts) {
  const len = parts.reduce((sum, item) => sum + item.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function isIdentifier(value) {
  return /^[a-z][a-z0-9_]*$/.test(value);
}

// src/spending-policy.ts
var SET_POLICY_CLAIM_DOMAIN_TAG = "lyth.spending-policy.claim.v1";
var ML_DSA_65_PUBLIC_KEY_LEN2 = 1952;
var ML_DSA_65_SIGNATURE_LEN2 = 3309;
var SPENDING_POLICY_SELECTORS = {
  setPolicy: "0xd6a518b2",
  setPolicyClaim: "0x08d78f9c",
  claimPolicyByAddress: "0xc2397fe9",
  enable: "0x5bfa1b68",
  disable: "0xe6c09edf",
  recordSpend: "0xdca04292"
};
var SpendingPolicyError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SpendingPolicyError";
  }
};
function spendingPolicyAddressHex() {
  return PRECOMPILE_ADDRESSES.SPENDING_POLICY.toLowerCase();
}
function composeClaimBoundMessage(chainId, args, opts) {
  const precompileAddress = toAddressBytes(opts?.precompileAddress ?? PRECOMPILE_ADDRESSES.SPENDING_POLICY);
  const normalized = normalizeArgs(args);
  return concatBytes4(
    new TextEncoder().encode(SET_POLICY_CLAIM_DOMAIN_TAG),
    uint64Bytes(chainId, "chainId"),
    precompileAddress,
    normalized.subAccount,
    normalized.principal,
    uint128Bytes(normalized.dailyCapLythoshi, "dailyCapLythoshi"),
    uint128Bytes(normalized.perTxCapLythoshi, "perTxCapLythoshi"),
    normalized.allowRoot,
    normalized.denyRoot,
    uint64Bytes(opts?.expectedPolicyVersion ?? 0n, "expectedPolicyVersion")
  );
}
function encodeSetPolicyCalldata(args) {
  const normalized = normalizeArgs(args);
  return bytesToHex4(
    concatBytes4(
      hexToBytes4(SPENDING_POLICY_SELECTORS.setPolicy),
      encodePolicyWords(normalized)
    )
  );
}
function encodeSetPolicyClaimCalldata(args, subAccountPubkey, subAccountSig) {
  const normalized = normalizeArgs(args);
  const pubkey = toBytes2(subAccountPubkey);
  const sig = toBytes2(subAccountSig);
  if (pubkey.length !== ML_DSA_65_PUBLIC_KEY_LEN2) {
    throw new SpendingPolicyError(
      `subAccountPubkey must be ${ML_DSA_65_PUBLIC_KEY_LEN2} bytes, got ${pubkey.length}`
    );
  }
  if (sig.length !== ML_DSA_65_SIGNATURE_LEN2) {
    throw new SpendingPolicyError(
      `subAccountSig must be ${ML_DSA_65_SIGNATURE_LEN2} bytes, got ${sig.length}`
    );
  }
  return bytesToHex4(
    concatBytes4(
      hexToBytes4(SPENDING_POLICY_SELECTORS.setPolicyClaim),
      encodePolicyWords(normalized),
      pubkey,
      sig
    )
  );
}
function encodeClaimPolicyByAddressCalldata(args, subAccountSig) {
  const normalized = normalizeArgs(args);
  const sig = toBytes2(subAccountSig);
  if (sig.length !== ML_DSA_65_SIGNATURE_LEN2) {
    throw new SpendingPolicyError(
      `subAccountSig must be ${ML_DSA_65_SIGNATURE_LEN2} bytes, got ${sig.length}`
    );
  }
  return bytesToHex4(
    concatBytes4(
      hexToBytes4(SPENDING_POLICY_SELECTORS.claimPolicyByAddress),
      encodePolicyWords(normalized),
      sig
    )
  );
}
function encodeEnableCalldata(subAccount) {
  return encodeSingleAddressCall(SPENDING_POLICY_SELECTORS.enable, subAccount);
}
function encodeDisableCalldata(subAccount) {
  return encodeSingleAddressCall(SPENDING_POLICY_SELECTORS.disable, subAccount);
}
function normalizeArgs(args) {
  return {
    subAccount: toAddressBytes(args.subAccount),
    principal: toAddressBytes(args.principal),
    dailyCapLythoshi: toBigint(args.dailyCapLythoshi, "dailyCapLythoshi"),
    perTxCapLythoshi: toBigint(args.perTxCapLythoshi, "perTxCapLythoshi"),
    allowRoot: expectLength3(toBytes2(args.allowRoot), 32, "allowRoot"),
    denyRoot: expectLength3(toBytes2(args.denyRoot), 32, "denyRoot")
  };
}
function encodePolicyWords(args) {
  return concatBytes4(
    encodeAddressWord(args.subAccount),
    encodeAddressWord(args.principal),
    encodeUint128Word(args.dailyCapLythoshi),
    encodeUint128Word(args.perTxCapLythoshi),
    args.allowRoot,
    args.denyRoot
  );
}
function encodeSingleAddressCall(selector, address) {
  return bytesToHex4(concatBytes4(hexToBytes4(selector), encodeAddressWord(toAddressBytes(address))));
}
function encodeAddressWord(address) {
  return concatBytes4(new Uint8Array(12), address);
}
function encodeUint128Word(value) {
  return concatBytes4(new Uint8Array(16), uint128Bytes(value, "uint128"));
}
function toAddressBytes(value) {
  if (typeof value === "string") {
    return hexToAddressBytes(value);
  }
  return expectLength3(value instanceof Uint8Array ? value : Uint8Array.from(value), 20, "address");
}
function toBytes2(value) {
  if (typeof value === "string") {
    return hexToBytes4(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes4(hex) {
  const body = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (body.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw new SpendingPolicyError("invalid hex bytes");
  }
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
function bytesToHex4(bytes) {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function concatBytes4(...parts) {
  const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function expectLength3(value, len, name) {
  if (value.length !== len) {
    throw new SpendingPolicyError(`${name} must be ${len} bytes`);
  }
  return value;
}
function toBigint(value, name) {
  const n = typeof value === "bigint" ? value : BigInt(value);
  if (n < 0n) {
    throw new SpendingPolicyError(`${name} must be non-negative`);
  }
  return n;
}
function uint64Bytes(value, name) {
  const n = toBigint(value, name);
  if (n > 0xffffffffffffffffn) {
    throw new SpendingPolicyError(`${name} exceeds uint64`);
  }
  return bigintBytes(n, 8);
}
function uint128Bytes(value, name) {
  if (value > 0xffffffffffffffffffffffffffffffffn) {
    throw new SpendingPolicyError(`${name} exceeds uint128`);
  }
  return bigintBytes(value, 16);
}
function bigintBytes(value, len) {
  const out = new Uint8Array(len);
  let n = value;
  for (let i = len - 1; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

// src/pubkey-registry.ts
var PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN = 1952;
var PUBKEY_REGISTRY_SELECTORS = {
  registerPubkey: "0x5fe984e7",
  lookupPubkey: "0x87c42001",
  hasPubkey: "0x01c0d167"
};
var PubkeyRegistryError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "PubkeyRegistryError";
  }
};
function pubkeyRegistryAddressHex() {
  return PRECOMPILE_ADDRESSES.PUBKEY_REGISTRY.toLowerCase();
}
function encodeRegisterPubkeyCalldata(pubkey) {
  const bytes = toBytes3(pubkey);
  if (bytes.length !== PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN) {
    throw new PubkeyRegistryError(
      `pubkey must be ${PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN} bytes, got ${bytes.length}`
    );
  }
  return bytesToHex5(
    concatBytes5(
      hexToBytes5(PUBKEY_REGISTRY_SELECTORS.registerPubkey),
      uint256Word(32n),
      uint256Word(BigInt(bytes.length)),
      bytes
    )
  );
}
function encodeLookupPubkeyCalldata(address) {
  return encodeSingleAddressCall2(PUBKEY_REGISTRY_SELECTORS.lookupPubkey, address);
}
function encodeHasPubkeyCalldata(address) {
  return encodeSingleAddressCall2(PUBKEY_REGISTRY_SELECTORS.hasPubkey, address);
}
function decodeLookupPubkeyReturn(data) {
  const bytes = toBytes3(data);
  if (bytes.length < 96) {
    throw new PubkeyRegistryError("lookup return must be at least 96 bytes");
  }
  const offset = wordToBigint(bytes.slice(0, 32));
  if (offset !== 64n) {
    throw new PubkeyRegistryError("lookup pubkey offset must be 0x40");
  }
  const setBlock = wordToBigint(bytes.slice(32, 64));
  const len = wordToBigint(bytes.slice(Number(offset), Number(offset) + 32));
  if (len > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new PubkeyRegistryError("pubkey length exceeds safe integer range");
  }
  const bodyLen = Number(len);
  const bodyStart = Number(offset) + 32;
  const padded = Math.ceil(bodyLen / 32) * 32;
  if (bytes.length < bodyStart + padded) {
    throw new PubkeyRegistryError("lookup return bytes body is truncated");
  }
  return {
    pubkey: bytes.slice(bodyStart, bodyStart + bodyLen),
    setBlock
  };
}
function decodeHasPubkeyReturn(data) {
  const bytes = toBytes3(data);
  if (bytes.length !== 32) {
    throw new PubkeyRegistryError("hasPubkey return must be 32 bytes");
  }
  for (let i = 0; i < 31; i++) {
    if (bytes[i] !== 0) {
      throw new PubkeyRegistryError("hasPubkey bool high bytes must be zero");
    }
  }
  if (bytes[31] === 0) return false;
  if (bytes[31] === 1) return true;
  throw new PubkeyRegistryError("hasPubkey bool must be 0 or 1");
}
function encodeSingleAddressCall2(selector, address) {
  return bytesToHex5(concatBytes5(hexToBytes5(selector), addressWord(toAddressBytes2(address))));
}
function addressWord(address) {
  return concatBytes5(new Uint8Array(12), address);
}
function toAddressBytes2(value) {
  if (typeof value === "string") {
    return hexToAddressBytes(value);
  }
  return expectLength4(value instanceof Uint8Array ? value : Uint8Array.from(value), 20, "address");
}
function toBytes3(value) {
  if (typeof value === "string") {
    return hexToBytes5(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes5(hex) {
  const body = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (body.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw new PubkeyRegistryError("invalid hex bytes");
  }
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
function bytesToHex5(bytes) {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function concatBytes5(...parts) {
  const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function expectLength4(value, len, name) {
  if (value.length !== len) {
    throw new PubkeyRegistryError(`${name} must be ${len} bytes`);
  }
  return value;
}
function uint256Word(value) {
  if (value < 0n || value > (1n << 256n) - 1n) {
    throw new PubkeyRegistryError("uint256 value out of range");
  }
  const out = new Uint8Array(32);
  let n = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}
function wordToBigint(word) {
  if (word.length !== 32) {
    throw new PubkeyRegistryError("ABI word must be 32 bytes");
  }
  let out = 0n;
  for (const b of word) {
    out = out << 8n | BigInt(b);
  }
  return out;
}

// src/ethers/network.ts
var MONOLYTHIUM_TESTNET_CHAIN_ID = 69420n;
var MONOLYTHIUM_TESTNET_NETWORK_NAME = "monolythium-testnet";
var MONOLYTHIUM_NETWORKS = {
  testnet: {
    chainId: MONOLYTHIUM_TESTNET_CHAIN_ID,
    name: MONOLYTHIUM_TESTNET_NETWORK_NAME
  }
};

// src/ethers/provider.ts
var MonolythiumProvider = class extends ethers.JsonRpcApiProvider {
  /** Underlying SDK client. Exposed for callers that want native types. */
  rpcClient;
  constructor(endpointOrClient, options = {}) {
    const network = options.network ?? {
      chainId: MONOLYTHIUM_TESTNET_CHAIN_ID,
      name: MONOLYTHIUM_TESTNET_NETWORK_NAME
    };
    try {
      ethers.Network.register(
        network.name,
        () => new ethers.Network(network.name, network.chainId)
      );
    } catch (_e) {
    }
    super(new ethers.Network(network.name, network.chainId));
    this.rpcClient = typeof endpointOrClient === "string" ? new RpcClient(endpointOrClient, {
      fetch: options.fetch,
      headers: options.headers
    }) : endpointOrClient;
  }
  /**
   * Forward a single JSON-RPC method through the SDK transport. Ethers'
   * `_perform` calls this and ethers callers can also call `provider.send`
   * directly to access methods the rich provider interface does not wrap
   * (e.g. `lyth_*`).
   */
  async _send(payload) {
    const calls = Array.isArray(payload) ? payload : [payload];
    return Promise.all(calls.map((p) => this.#sendOne(p)));
  }
  async #sendOne(p) {
    try {
      const params = Array.isArray(p.params) ? p.params : p.params === void 0 ? [] : p.params;
      const result = await this.rpcClient.call(p.method, params);
      return { id: p.id, result };
    } catch (e) {
      if (e instanceof SdkError && e.kind === "rpc") {
        return {
          id: p.id,
          error: {
            code: e.code ?? -32603,
            message: e.message,
            data: e.data
          }
        };
      }
      const msg = e?.message ?? String(e);
      return {
        id: p.id,
        error: { code: -32603, message: `${msg}` }
      };
    }
  }
};
var MonolythiumSigner = class _MonolythiumSigner extends ethers.AbstractSigner {
  #backend;
  constructor(backend, provider) {
    super(provider ?? null);
    this.#backend = backend;
  }
  /**
   * Wrap any ethers v6 `BaseWallet` (the parent class of `Wallet`,
   * `HDNodeWallet`, and friends) so callers don't have to write a
   * `MonolythiumSignerBackend` for the common test / dev path.
   *
   * Both `new Wallet(privateKey)` and `Wallet.createRandom()` /
   * `HDNodeWallet.fromMnemonic(...)` are accepted.
   */
  static fromEthersWallet(wallet, provider) {
    const backend = {
      getAddress: async () => wallet.address,
      signTransaction: (tx) => wallet.signTransaction(tx),
      signMessage: (message) => wallet.signMessage(message),
      signTypedData: (domain, types, value) => wallet.signTypedData(domain, types, value)
    };
    return new _MonolythiumSigner(backend, provider);
  }
  async getAddress() {
    return this.#backend.getAddress();
  }
  connect(provider) {
    return new _MonolythiumSigner(this.#backend, provider);
  }
  async signTransaction(tx) {
    return this.#backend.signTransaction(tx);
  }
  async signMessage(message) {
    return this.#backend.signMessage(message);
  }
  async signTypedData(domain, types, value) {
    return this.#backend.signTypedData(domain, types, value);
  }
};

// src/ethers/tx-translate.ts
function toHexQuantity(v) {
  if (v === null || v === void 0) return void 0;
  if (typeof v === "string") {
    if (v.startsWith("0x") || v.startsWith("0X")) return v;
    return `0x${BigInt(v).toString(16)}`;
  }
  if (typeof v === "number") return `0x${v.toString(16)}`;
  return `0x${v.toString(16)}`;
}
function translateTxIn(req) {
  const out = {};
  if (req.from !== void 0 && req.from !== null) out.from = req.from;
  if (req.to !== void 0 && req.to !== null) out.to = req.to;
  const gas = toHexQuantity(req.gasLimit);
  if (gas !== void 0) out.gas = gas;
  const gasPrice = toHexQuantity(req.gasPrice);
  if (gasPrice !== void 0) out.gasPrice = gasPrice;
  const value = toHexQuantity(req.value);
  if (value !== void 0) out.value = value;
  if (req.data !== void 0 && req.data !== null) out.data = req.data;
  return out;
}
function translateReceiptOut(monoReceipt, fromAddress, toAddress) {
  return {
    transactionHash: monoReceipt.tx_hash,
    blockHash: monoReceipt.block_hash,
    blockNumber: `0x${BigInt(monoReceipt.block_number).toString(16)}`,
    transactionIndex: `0x${monoReceipt.tx_index.toString(16)}`,
    status: monoReceipt.status === 1 ? "0x1" : "0x0",
    gasUsed: `0x${BigInt(monoReceipt.executionUnitsUsed).toString(16)}`,
    cumulativeGasUsed: `0x${BigInt(monoReceipt.executionUnitsUsed).toString(16)}`,
    effectiveGasPrice: "0x0",
    contractAddress: null,
    from: fromAddress ?? "0x0000000000000000000000000000000000000000",
    to: toAddress,
    type: "0x2",
    logsBloom: `0x${"0".repeat(512)}`,
    logs: []
  };
}
function translateBlockOut(header) {
  return {
    number: `0x${header.number.toString(16)}`,
    hash: header.hash,
    parentHash: header.parent_hash,
    timestamp: `0x${header.timestamp.toString(16)}`,
    gasUsed: `0x${header.executionUnitsUsed.toString(16)}`,
    gasLimit: `0x${header.executionUnitLimit.toString(16)}`,
    stateRoot: header.state_root,
    miner: "0x0000000000000000000000000000000000000000",
    difficulty: "0x0",
    nonce: "0x0000000000000000",
    baseFeePerGas: null,
    extraData: "0x",
    mixHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    transactions: [],
    transactionsRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
    receiptsRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
    logsBloom: `0x${"0".repeat(512)}`,
    sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
    uncles: [],
    size: "0x0"
  };
}

// src/index.ts
var version = "0.1.0";

exports.ADDRESS_HRP = ADDRESS_HRP;
exports.ADDRESS_KIND_HRPS = ADDRESS_KIND_HRPS;
exports.AddressError = AddressError;
exports.ApiClient = ApiClient;
exports.BURN_ADDR = BURN_ADDR;
exports.CHAIN_REGISTRY = CHAIN_REGISTRY;
exports.CHAIN_REGISTRY_RAW_BASE = CHAIN_REGISTRY_RAW_BASE;
exports.LYTHOSHI_PER_LYTH = LYTHOSHI_PER_LYTH;
exports.LYTH_DECIMALS = LYTH_DECIMALS;
exports.MAX_NATIVE_RECEIPT_EVENTS = MAX_NATIVE_RECEIPT_EVENTS;
exports.ML_DSA_65_PUBLIC_KEY_LEN = ML_DSA_65_PUBLIC_KEY_LEN2;
exports.ML_DSA_65_SIGNATURE_LEN = ML_DSA_65_SIGNATURE_LEN2;
exports.MONOLYTHIUM_NETWORKS = MONOLYTHIUM_NETWORKS;
exports.MONOLYTHIUM_TESTNET_CHAIN_ID = MONOLYTHIUM_TESTNET_CHAIN_ID;
exports.MONOLYTHIUM_TESTNET_NETWORK_NAME = MONOLYTHIUM_TESTNET_NETWORK_NAME;
exports.MRV_FORMAT_VERSION = MRV_FORMAT_VERSION;
exports.MRV_MAX_ABI_SYMBOLS = MRV_MAX_ABI_SYMBOLS;
exports.MRV_MAX_CODE_BYTES = MRV_MAX_CODE_BYTES;
exports.MRV_MAX_DEBUG_BYTES = MRV_MAX_DEBUG_BYTES;
exports.MRV_MAX_MEMORY_PAGES = MRV_MAX_MEMORY_PAGES;
exports.MRV_MAX_STORAGE_NAMESPACE_BYTES = MRV_MAX_STORAGE_NAMESPACE_BYTES;
exports.MRV_MEMORY_PAGE_BYTES = MRV_MEMORY_PAGE_BYTES;
exports.MRV_PROFILE_MONO_RV32IM_V1 = MRV_PROFILE_MONO_RV32IM_V1;
exports.MRV_STRUCTURED_FEE_FIELDS = MRV_STRUCTURED_FEE_FIELDS;
exports.MRV_TX_EXTENSION_KIND = MRV_TX_EXTENSION_KIND;
exports.MRV_TX_EXTENSION_V1 = MRV_TX_EXTENSION_V1;
exports.MonolythiumProvider = MonolythiumProvider;
exports.MonolythiumSigner = MonolythiumSigner;
exports.MrvValidationError = MrvValidationError;
exports.NATIVE_LYTH_DECIMALS = NATIVE_LYTH_DECIMALS;
exports.NODE_REGISTRY_CAPABILITIES = NODE_REGISTRY_CAPABILITIES;
exports.NODE_REGISTRY_CAPABILITY_MASK = NODE_REGISTRY_CAPABILITY_MASK;
exports.NODE_REGISTRY_PUBLIC_SERVICE_MASK = NODE_REGISTRY_PUBLIC_SERVICE_MASK;
exports.NODE_REGISTRY_SELECTORS = NODE_REGISTRY_SELECTORS;
exports.NodeRegistryError = NodeRegistryError;
exports.PRECOMPILE_ADDRESSES = PRECOMPILE_ADDRESSES;
exports.PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN = PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN;
exports.PUBKEY_REGISTRY_SELECTORS = PUBKEY_REGISTRY_SELECTORS;
exports.PubkeyRegistryError = PubkeyRegistryError;
exports.RESERVED_ADDRESS_HRPS = RESERVED_ADDRESS_HRPS;
exports.RpcClient = RpcClient;
exports.SERVICE_PROBE_STATUS = SERVICE_PROBE_STATUS;
exports.SET_POLICY_CLAIM_DOMAIN_TAG = SET_POLICY_CLAIM_DOMAIN_TAG;
exports.SPENDING_POLICY_SELECTORS = SPENDING_POLICY_SELECTORS;
exports.SdkError = SdkError;
exports.SpendingPolicyError = SpendingPolicyError;
exports.TESTNET_69420 = TESTNET_69420;
exports.addressBytesToHex = addressBytesToHex;
exports.addressToBech32 = addressToBech32;
exports.addressToTypedBech32 = addressToTypedBech32;
exports.apiEndpointFromRpcEndpoint = apiEndpointFromRpcEndpoint;
exports.assertMrvCallNativeSubmissionPlan = assertMrvCallNativeSubmissionPlan;
exports.assertMrvDeployNativeSubmissionPlan = assertMrvDeployNativeSubmissionPlan;
exports.assertMrvFeeDisplayConformance = assertMrvFeeDisplayConformance;
exports.bech32ToAddress = bech32ToAddress;
exports.bech32ToAddressBytes = bech32ToAddressBytes;
exports.buildMrvCallNativeTxPlan = buildMrvCallNativeTxPlan;
exports.buildMrvCallPlan = buildMrvCallPlan;
exports.buildMrvCallRequest = buildMrvCallRequest;
exports.buildMrvDeployNativeTxPlan = buildMrvDeployNativeTxPlan;
exports.buildMrvDeployPlan = buildMrvDeployPlan;
exports.buildMrvDeployRequest = buildMrvDeployRequest;
exports.checkMrvFeeDisplayConformance = checkMrvFeeDisplayConformance;
exports.composeClaimBoundMessage = composeClaimBoundMessage;
exports.consumeNativeEvents = consumeNativeEvents;
exports.decodeHasPubkeyReturn = decodeHasPubkeyReturn;
exports.decodeLookupPubkeyReturn = decodeLookupPubkeyReturn;
exports.deriveMrvContractAddress = deriveMrvContractAddress;
exports.encodeBlockSelector = encodeBlockSelector;
exports.encodeClaimPolicyByAddressCalldata = encodeClaimPolicyByAddressCalldata;
exports.encodeDisableCalldata = encodeDisableCalldata;
exports.encodeEnableCalldata = encodeEnableCalldata;
exports.encodeHasPubkeyCalldata = encodeHasPubkeyCalldata;
exports.encodeLookupPubkeyCalldata = encodeLookupPubkeyCalldata;
exports.encodeRegisterPubkeyCalldata = encodeRegisterPubkeyCalldata;
exports.encodeReportServiceProbeCalldata = encodeReportServiceProbeCalldata;
exports.encodeSetPolicyCalldata = encodeSetPolicyCalldata;
exports.encodeSetPolicyClaimCalldata = encodeSetPolicyClaimCalldata;
exports.fetchChainInfoLatest = fetchChainInfoLatest;
exports.fetchChainRegistryLatest = fetchChainRegistryLatest;
exports.formatLyth = formatLyth;
exports.formatLythoshi = formatLythoshi;
exports.formatNativeReceiptFeeDisplay = formatNativeReceiptFeeDisplay;
exports.getChainInfo = getChainInfo;
exports.getP2pSeeds = getP2pSeeds;
exports.getRpcEndpoints = getRpcEndpoints;
exports.hexToAddressBytes = hexToAddressBytes;
exports.isConcreteServiceProbeStatus = isConcreteServiceProbeStatus;
exports.isNativeDecodedEvent = isNativeDecodedEvent;
exports.isSinglePublicServiceProbeMask = isSinglePublicServiceProbeMask;
exports.isValidNodeRegistryCapabilities = isValidNodeRegistryCapabilities;
exports.isValidPublicServiceProbeMask = isValidPublicServiceProbeMask;
exports.mrvAddressToBech32 = mrvAddressToBech32;
exports.mrvBech32ToAddress = mrvBech32ToAddress;
exports.mrvCodeHashHex = mrvCodeHashHex;
exports.mrvV1TransactionExtension = mrvV1TransactionExtension;
exports.nativeEventMatches = nativeEventMatches;
exports.nativeEventsFromReceipt = nativeEventsFromReceipt;
exports.nodeRegistryAddressHex = nodeRegistryAddressHex;
exports.normalizeAddressHex = normalizeAddressHex;
exports.parseAddress = parseAddress;
exports.parseChainRegistryToml = parseChainRegistryToml;
exports.parseLythToLythoshi = parseLythToLythoshi;
exports.parseNativeDecodedEvent = parseNativeDecodedEvent;
exports.parseQuantity = parseQuantity;
exports.parseQuantityBig = parseQuantityBig;
exports.pubkeyRegistryAddressHex = pubkeyRegistryAddressHex;
exports.serviceProbeStatusLabel = serviceProbeStatusLabel;
exports.spendingPolicyAddressHex = spendingPolicyAddressHex;
exports.submitMrvCallNativeTx = submitMrvCallNativeTx;
exports.submitMrvDeployNativeTx = submitMrvDeployNativeTx;
exports.translateBlockOut = translateBlockOut;
exports.translateReceiptOut = translateReceiptOut;
exports.translateTxIn = translateTxIn;
exports.typedBech32ToAddress = typedBech32ToAddress;
exports.validateMrvArtifactMetadata = validateMrvArtifactMetadata;
exports.validateMrvCallRequest = validateMrvCallRequest;
exports.validateMrvDeployRequest = validateMrvDeployRequest;
exports.version = version;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map