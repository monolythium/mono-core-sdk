'use strict';

var ethers = require('ethers');
require('@noble/hashes/blake3.js');
require('@noble/post-quantum/ml-kem.js');
require('@noble/ciphers/chacha.js');
require('@noble/hashes/sha3.js');
require('@noble/hashes/utils.js');
require('@noble/post-quantum/ml-dsa.js');

// src/ethers/provider.ts

// src/address.ts
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
function typedBech32ToAddress(address, expectedKind) {
  const parsed = decodeBech32m(address);
  if (RESERVED_ADDRESS_HRPS.includes(parsed.hrp)) {
    throw new AddressError(`reserved address hrp '${parsed.hrp}'`);
  }
  const kind = addressKindFromHrp(parsed.hrp);
  if (kind === void 0) {
    throw new AddressError(`unknown address hrp '${parsed.hrp}'`);
  }
  if (kind !== expectedKind) {
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
var NATIVE_MARKET_EVENT_FAMILY = "market";
function nativeMarketEventFilter(filter = {}) {
  return { ...filter, family: NATIVE_MARKET_EVENT_FAMILY };
}
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
function nativeMarketEventsFromReceipt(receipt, filter = {}) {
  return nativeEventsFromReceipt(receipt, nativeMarketEventFilter(filter));
}
function nativeEventsFromHistory(response) {
  return {
    ...response,
    events: response.events.map((event) => ({
      ...event,
      decoded: parseNativeDecodedEvent(event)
    }))
  };
}
function nativeMarketEventsFromHistory(response) {
  return {
    ...response,
    filters: { ...response.filters, family: NATIVE_MARKET_EVENT_FAMILY },
    events: response.events.filter((event) => nativeEventMatches(event, { family: NATIVE_MARKET_EVENT_FAMILY })).map((event) => ({
      ...event,
      decoded: parseNativeDecodedEvent(event)
    }))
  };
}
function asRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}
var SERVICE_PROBE_STATUS = {
  REACHABLE: 1,
  DEGRADED: 2,
  UNREACHABLE: 3
};
function isValidPublicServiceProbeMask(mask) {
  return Number.isInteger(mask) && mask > 0 && (mask & -284) === 0;
}
function isSinglePublicServiceProbeMask(mask) {
  return isValidPublicServiceProbeMask(mask) && bitCount(mask) === 1;
}
function isConcreteServiceProbeStatus(status) {
  return status === SERVICE_PROBE_STATUS.REACHABLE || status === SERVICE_PROBE_STATUS.DEGRADED || status === SERVICE_PROBE_STATUS.UNREACHABLE;
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

// src/crypto/envelope.ts
new TextEncoder().encode("protocore/v2/mempool/dkg-mlkem768/1");
var LYTH_DECIMALS = 8;
var NATIVE_LYTH_DECIMALS = LYTH_DECIMALS;
var LYTHOSHI_PER_LYTH = 100000000n;
new TextEncoder().encode("MONO_MRV_CODE_V1");
new TextEncoder().encode("mono:riscv:contract-address:v1");
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
new Map(SYSCALLS);
new Map(SYSCALLS.map(([id, name]) => [name, id]));
var MrvValidationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MrvValidationError";
  }
};
var MRV_STRUCTURED_FEE_FIELDS = [
  "total_lythoshi",
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
function checkMrvStructuredFeeConformance(value, options = {}) {
  const failures = [];
  const expectedTotalLythoshi = options.expectedTotalLythoshi === void 0 ? void 0 : normalizeDecimalLike("expectedTotalLythoshi", options.expectedTotalLythoshi);
  checkStructuredFeeObject(
    value,
    expectedTotalLythoshi,
    failures,
    options.label ?? "structuredFee"
  );
  return {
    passed: failures.length === 0,
    failures
  };
}
function assertMrvStructuredFeeConformance(value, options = {}) {
  const report = checkMrvStructuredFeeConformance(value, options);
  if (!report.passed) {
    throw new MrvValidationError(`structured fee conformance failed: ${report.failures.join("; ")}`);
  }
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
function checkStructuredFeeObject(value, expectedTotalLythoshi, failures, label = "structuredFee") {
  if (!isRecord(value)) {
    failures.push(`${label} must be an object`);
    return;
  }
  const expectedFields = /* @__PURE__ */ new Set([...MRV_STRUCTURED_FEE_FIELDS, "total_lyth"]);
  const actualFields = Object.keys(value);
  for (const field of MRV_STRUCTURED_FEE_FIELDS) {
    if (!(field in value)) failures.push(`${label} is missing '${field}'`);
  }
  for (const field of actualFields) {
    if (!expectedFields.has(field)) failures.push(`${label} has unexpected field '${field}'`);
  }
  const totalLythoshi = stringField(value, "total_lythoshi", failures, label);
  const expectedTotal = expectedTotalLythoshi ?? totalLythoshi;
  if (totalLythoshi !== void 0 && expectedTotalLythoshi !== void 0 && totalLythoshi !== expectedTotalLythoshi) {
    failures.push(`${label}.total_lythoshi must be ${expectedTotalLythoshi}`);
  }
  const totalLyth = "total_lyth" in value ? lythDecimalField(value, "total_lyth", failures, label) : void 0;
  if (totalLyth !== void 0 && expectedTotal !== void 0) {
    const expectedTotalLyth = formatLyth(expectedTotal, { includeUnit: false });
    if (totalLyth !== expectedTotalLyth) {
      failures.push(`${label}.total_lyth must be ${expectedTotalLyth}`);
    }
  }
  for (const field of [
    "base_price_per_cycle_lythoshi",
    "state_io_price_per_unit_lythoshi",
    "priority_tip_lythoshi"
  ]) {
    stringField(value, field, failures, label);
  }
  for (const field of ["cycles_used", "state_io_units"]) {
    integerField(value, field, failures, label);
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringField(value, field, failures, label) {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string" || !isCanonicalUnsignedDecimalString(fieldValue)) {
    failures.push(`${label}.${field} must be a canonical unsigned decimal string`);
    return void 0;
  }
  return fieldValue;
}
function lythDecimalField(value, field, failures, label) {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string") {
    failures.push(`${label}.${field} must be a canonical LYTH decimal string`);
    return void 0;
  }
  try {
    parseLythToLythoshi(`${fieldValue} LYTH`);
  } catch {
    failures.push(`${label}.${field} must be a canonical LYTH decimal string`);
    return void 0;
  }
  return fieldValue;
}
function integerField(value, field, failures, label) {
  const fieldValue = value[field];
  if (typeof fieldValue !== "number" || !Number.isSafeInteger(fieldValue) || fieldValue < 0) {
    failures.push(`${label}.${field} must be a non-negative safe integer`);
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
    throw new MrvValidationError(`${field} is required`);
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

// src/registry.ts
var TESTNET_69420 = {
  chain_id: 69420,
  network: "testnet-69420",
  display_name: "Monolythium Testnet",
  description: "Public Monolythium testnet. Testnet state may reset without notice; do not store value on this network.",
  genesis_hash: "0x325057e476b7be3730a22c92b9289f4a14a3414a2a081bd279b43eeba36b0075",
  binary_sha: "44a9ec4",
  rpc: [
    {
      url: "https://rpc.monolythium.com",
      provider: "monolythium",
      tier: "official"
    }
  ],
  p2p: []
};
var CHAIN_REGISTRY = {
  "testnet-69420": TESTNET_69420
};
function getChainInfo(network) {
  const info = CHAIN_REGISTRY[network];
  if (!info) {
    throw new Error(`unknown Monolythium network: ${network}`);
  }
  return info;
}

// src/types.ts
function encodeBlockSelector(b) {
  if (typeof b === "number") return `0x${b.toString(16)}`;
  if (typeof b === "bigint") return `0x${b.toString(16)}`;
  return b;
}

// src/client.ts
var SDK_VERSION = "0.1.0";
var ETH_COMPAT_RPC_PREFIX = "eth_";
var ethCompatMethod = (name) => `${ETH_COMPAT_RPC_PREFIX}${name}`;
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
      "user-agent": `monolythium-core-sdk/${SDK_VERSION}`,
      ...options.headers ?? {}
    };
    this.#nextId = 1;
  }
  /**
   * Construct a client from the chain-registry network slug.
   *
   * Defaults to the SDK-bundled registry snapshot from
   * `monolythium/chain-registry`. Set `probe: true` to walk the
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
  /** Compatibility block-height read. */
  async ethBlockNumber() {
    return parseQuantityBig(await this.call(ethCompatMethod("blockNumber"), []));
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
  /** Compatibility block-header read by height/tag. */
  async ethGetBlockByNumber(block = "latest") {
    return normalizeBlockHeader(await this.call(ethCompatMethod("getBlockByNumber"), [encodeBlockSelector(block)]));
  }
  /** Compatibility block-header read by hash. */
  async ethGetBlockByHash(hash) {
    return normalizeBlockHeader(await this.call(ethCompatMethod("getBlockByHash"), [hash]));
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
  /** `lyth_bridgeRoutes` — read-only bridge route-selection/readiness. */
  async lythBridgeRoutes(request) {
    return this.call("lyth_bridgeRoutes", [request]);
  }
  /** `lyth_mrcMetadata` — exact current-state native MRC metadata lookup. */
  async lythMrcMetadata(assetId, tokenId) {
    const params = tokenId == null ? [assetId] : [assetId, tokenId];
    return this.call("lyth_mrcMetadata", params);
  }
  /** `lyth_mrcAccount` — exact current-state native MRC account lookup. */
  async lythMrcAccount(account, spendLimit) {
    const request = { account };
    if (spendLimit != null) request.spendLimit = spendLimit;
    const params = request.spendLimit == null ? [request.account] : [request.account, request.spendLimit];
    return this.call("lyth_mrcAccount", params);
  }
  /** `lyth_mrcHolders` — top holders for a native MRC asset/token key. */
  async lythMrcHolders(standard, assetId, tokenId, limit) {
    return this.lythMrcHoldersScoped(standard, assetId, tokenId, limit);
  }
  /**
   * `lyth_mrcHolders` — top holders for a native MRC asset/vault key.
   *
   * This is the asset-scoped form used by MRC-4626 vault share balances.
   */
  async lythMrcAssetHolders(standard, assetId, limit) {
    return this.lythMrcHoldersScoped(standard, assetId, null, limit);
  }
  /** `lyth_mrcHolders` — top holders for MRC-4626 vault shares. */
  async lythMrc4626Holders(vaultId, limit) {
    return this.lythMrcAssetHolders("mrc4626", vaultId, limit);
  }
  async lythMrcHoldersScoped(standard, assetId, tokenId, limit) {
    const request = {
      standard,
      assetId,
      tokenId
    };
    if (limit != null) request.limit = limit;
    const params = request.limit == null ? [request.standard, request.assetId, request.tokenId] : [request.standard, request.assetId, request.tokenId, request.limit];
    return this.call("lyth_mrcHolders", params);
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
    return decodeNativeReceiptResponse(
      await this.call("lyth_nativeReceipt", [txHash])
    );
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
  /** Typed native market event rows from `lyth_nativeReceipt`. */
  async lythNativeReceiptMarketEvents(txHash, filter = {}) {
    const receipt = await this.lythNativeReceipt(txHash);
    return nativeMarketEventsFromReceipt(receipt, filter);
  }
  /** `lyth_nativeEvents` — historical indexed native event rows. */
  async lythNativeEvents(filter) {
    return this.call("lyth_nativeEvents", [nativeEventsFilterParams(filter)]);
  }
  /** `lyth_nativeEvents` with decoded rows converted into a caller-selected type. */
  async lythNativeEventsTyped(filter) {
    const response = await this.lythNativeEvents(filter);
    return nativeEventsFromHistory(response);
  }
  /** `lyth_nativeEvents` restricted to native marketplace event rows. */
  async lythNativeMarketEvents(filter) {
    return this.lythNativeEvents({
      ...filter,
      family: "market"
    });
  }
  /** `lyth_nativeEvents` market rows with decoded rows converted into a caller-selected type. */
  async lythNativeMarketEventsTyped(filter) {
    const response = await this.lythNativeEvents({
      ...filter,
      family: "market"
    });
    return nativeMarketEventsFromHistory(response);
  }
  /** `lyth_nativeAgentState` — current-state native agent policy and escrow rows. */
  async lythNativeAgentState(filter = {}) {
    const response = await this.call("lyth_nativeAgentState", [
      nativeAgentStateFilterParams(filter)
    ]);
    return decodeNativeAgentStateResponse(response);
  }
  /** `lyth_nativeMarketState` — current-state native spot and NFT market rows. */
  async lythNativeMarketState(filter = {}) {
    return this.call("lyth_nativeMarketState", [nativeMarketStateFilterParams(filter)]);
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
    return decodeTxFeedResponse(await this.call("lyth_txFeed", params));
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
    return normalizeCapabilitiesResponse(
      await this.call("lyth_capabilities", params)
    );
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
  /** `lyth_pendingRewards` — wallet pending rewards at a block. */
  async lythPendingRewards(wallet, block) {
    const params = block === void 0 ? [wallet] : [wallet, encodeBlockSelector(block)];
    return this.call("lyth_pendingRewards", params);
  }
  /** `lyth_redemptionQueue` — wallet redemption tickets at a block. */
  async lythRedemptionQueue(wallet, block) {
    const params = block === void 0 ? [wallet] : [wallet, encodeBlockSelector(block)];
    return this.call("lyth_redemptionQueue", params);
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
  /** `debug_traceTransaction` — legacy compatibility trace for a confirmed tx. */
  async debugTraceTransaction(txHash) {
    return this.call("debug_traceTransaction", [txHash]);
  }
  /** `debug_traceCall` — legacy compatibility trace for a dry-run. */
  async debugTraceCall(request, block = "latest") {
    return this.call("debug_traceCall", [request, encodeBlockSelector(block)]);
  }
  /** `debug_traceBlockByNumber` — legacy compatibility traces for an entire block. */
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
function nativeEventsFilterParams(filter) {
  return {
    fromBlock: encodeRpcU64Number(filter.fromBlock, "fromBlock"),
    toBlock: encodeRpcU64Number(filter.toBlock, "toBlock"),
    ...optionalRpcNumber("limit", filter.limit),
    ...optionalRpcNumber("txIndex", filter.txIndex),
    ...optionalRpcNumber("logIndex", filter.logIndex),
    ...optionalString("address", filter.address),
    ...optionalString("eventTopic", filter.eventTopic),
    ...optionalString("family", filter.family),
    ...optionalString("eventName", filter.eventName),
    ...optionalString("primaryId", filter.primaryId),
    ...optionalString("relatedId", filter.relatedId),
    ...optionalString("tokenId", filter.tokenId),
    ...optionalString("account", filter.account),
    ...optionalString("counterparty", filter.counterparty)
  };
}
function optionalRpcNumber(key, value) {
  return value == null ? {} : { [key]: encodeRpcU64Number(value, key) };
}
function optionalString(key, value) {
  return value == null ? {} : { [key]: value };
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
function parseStringField(value, label) {
  if (value === null || value === void 0) {
    throw SdkError.malformed(`${label} is missing`);
  }
  return String(value);
}
function parseBooleanField(value, label) {
  if (typeof value !== "boolean") {
    throw SdkError.malformed(`${label} must be a boolean`);
  }
  return value;
}
function parseRpcUint(value, label, max, typeName) {
  const parsed = parseRpcNumber(value, label);
  if (parsed > max) {
    throw SdkError.malformed(`${label} must be a ${typeName}`);
  }
  return parsed;
}
function parseRpcUintNullable(value, label, max, typeName) {
  return value === null || value === void 0 ? null : parseRpcUint(value, label, max, typeName);
}
function decodeNativeAgentStateArray(row, key, decode, defaultMissing) {
  const value = row[key];
  if (value === void 0 && defaultMissing) return [];
  if (!Array.isArray(value)) {
    throw SdkError.malformed(`native agent state ${key} must be an array`);
  }
  return value.map((item, index) => decode(item, `native agent state ${key}[${index}]`));
}
function decodeNativeAgentExistingStateRecord(value, label) {
  return expectObject(value, label);
}
function decodeNativeAgentIssuerStateRecord(value, label) {
  const row = expectObject(value, label);
  return {
    issuerId: parseStringField(row["issuerId"], `${label}.issuerId`),
    issuer: parseStringField(row["issuer"], `${label}.issuer`),
    nonce: parseRpcNumberNullable(row["nonce"], `${label}.nonce`),
    metadataHash: parseStringNullable(row["metadataHash"]),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`)
  };
}
function decodeNativeAgentAttestationStateRecord(value, label) {
  const row = expectObject(value, label);
  return {
    attestationId: parseStringField(row["attestationId"], `${label}.attestationId`),
    nonce: parseRpcNumberNullable(row["nonce"], `${label}.nonce`),
    issuerId: parseStringNullable(row["issuerId"]),
    issuer: parseStringNullable(row["issuer"]),
    subject: parseStringField(row["subject"], `${label}.subject`),
    schemaHash: parseStringNullable(row["schemaHash"]),
    payloadHash: parseStringNullable(row["payloadHash"]),
    active: parseBooleanField(row["active"], `${label}.active`),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`)
  };
}
function decodeNativeAgentConsentStateRecord(value, label) {
  const row = expectObject(value, label);
  return {
    consentId: parseStringField(row["consentId"], `${label}.consentId`),
    subject: parseStringField(row["subject"], `${label}.subject`),
    grantee: parseStringField(row["grantee"], `${label}.grantee`),
    nonce: parseRpcNumberNullable(row["nonce"], `${label}.nonce`),
    scopeHash: parseStringNullable(row["scopeHash"]),
    expiresAt: parseRpcNumberNullable(row["expiresAt"], `${label}.expiresAt`),
    active: parseBooleanField(row["active"], `${label}.active`),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`)
  };
}
function decodeNativeAgentServiceStateRecord(value, label) {
  const row = expectObject(value, label);
  return {
    serviceId: parseStringField(row["serviceId"], `${label}.serviceId`),
    provider: parseStringField(row["provider"], `${label}.provider`),
    nonce: parseRpcNumberNullable(row["nonce"], `${label}.nonce`),
    categoryHash: parseStringNullable(row["categoryHash"]),
    metadataHash: parseStringNullable(row["metadataHash"]),
    active: parseBooleanField(row["active"], `${label}.active`),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`)
  };
}
function decodeNativeAgentAvailabilityStateRecord(value, label) {
  const row = expectObject(value, label);
  return {
    provider: parseStringField(row["provider"], `${label}.provider`),
    maxConcurrent: parseRpcUint(row["maxConcurrent"], `${label}.maxConcurrent`, 4294967295, "uint32"),
    openRequests: parseRpcUint(row["openRequests"], `${label}.openRequests`, 4294967295, "uint32"),
    paused: parseBooleanField(row["paused"], `${label}.paused`),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`)
  };
}
function decodeNativeAgentArbiterStateRecord(value, label) {
  const row = expectObject(value, label);
  return {
    arbiterId: parseStringField(row["arbiterId"], `${label}.arbiterId`),
    arbiter: parseStringField(row["arbiter"], `${label}.arbiter`),
    nonce: parseRpcNumberNullable(row["nonce"], `${label}.nonce`),
    tier: parseRpcUintNullable(row["tier"], `${label}.tier`, 65535, "uint16"),
    metadataHash: parseStringNullable(row["metadataHash"]),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`)
  };
}
function decodeNativeAgentReputationReviewStateRecord(value, label) {
  const row = expectObject(value, label);
  return {
    reviewId: parseStringField(row["reviewId"], `${label}.reviewId`),
    reviewer: parseStringField(row["reviewer"], `${label}.reviewer`),
    subject: parseStringField(row["subject"], `${label}.subject`),
    categoryId: parseRpcUint(row["categoryId"], `${label}.categoryId`, 4294967295, "uint32"),
    speedScore: parseRpcUint(row["speedScore"], `${label}.speedScore`, 255, "uint8"),
    qualityScore: parseRpcUint(row["qualityScore"], `${label}.qualityScore`, 255, "uint8"),
    communicationScore: parseRpcUint(
      row["communicationScore"],
      `${label}.communicationScore`,
      255,
      "uint8"
    ),
    accuracyScore: parseRpcUint(row["accuracyScore"], `${label}.accuracyScore`, 255, "uint8"),
    payloadHash: parseStringNullable(row["payloadHash"]),
    updatedAtBlock: parseRpcNumber(row["updatedAtBlock"], `${label}.updatedAtBlock`)
  };
}
function expectObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw SdkError.malformed(`${label} must be an object`);
  }
  return value;
}
function decodeNativeReceiptResponse(value) {
  const row = expectObject(value, "native receipt response");
  assertNativeReceiptFee(row["fee"], "native receipt response.fee");
  return value;
}
function decodeTxFeedResponse(value) {
  const row = expectObject(value, "tx feed response");
  const transactions = row["transactions"];
  if (!Array.isArray(transactions)) {
    throw SdkError.malformed("tx feed response.transactions must be an array");
  }
  transactions.forEach((transaction, index) => {
    const tx = expectObject(transaction, `tx feed response.transactions[${index}]`);
    assertNativeReceiptFee(tx["fee"], `tx feed response.transactions[${index}].fee`);
  });
  return value;
}
function assertNativeReceiptFee(value, label) {
  try {
    assertMrvStructuredFeeConformance(value, { label });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw SdkError.malformed(`structured native fee violation: ${message}`);
  }
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
function nativeAgentStateFilterParams(filter) {
  const out = {};
  if (filter.policyId != null) out.policyId = filter.policyId;
  if (filter.escrowId != null) out.escrowId = filter.escrowId;
  if (filter.account != null) out.account = filter.account;
  if (filter.includePolicySpends != null) out.includePolicySpends = filter.includePolicySpends;
  if (filter.limit != null) out.limit = encodeRpcU64Number(filter.limit, "limit");
  return out;
}
function decodeNativeAgentStateResponse(value) {
  const row = expectObject(value, "native agent state response");
  return {
    schemaVersion: parseRpcNumber(row["schemaVersion"], "native agent state schemaVersion"),
    limit: parseRpcNumber(row["limit"], "native agent state limit"),
    filters: expectObject(
      row["filters"],
      "native agent state filters"
    ),
    issuers: decodeNativeAgentStateArray(
      row,
      "issuers",
      decodeNativeAgentIssuerStateRecord,
      true
    ),
    attestations: decodeNativeAgentStateArray(
      row,
      "attestations",
      decodeNativeAgentAttestationStateRecord,
      true
    ),
    consents: decodeNativeAgentStateArray(
      row,
      "consents",
      decodeNativeAgentConsentStateRecord,
      true
    ),
    services: decodeNativeAgentStateArray(
      row,
      "services",
      decodeNativeAgentServiceStateRecord,
      true
    ),
    availability: decodeNativeAgentStateArray(
      row,
      "availability",
      decodeNativeAgentAvailabilityStateRecord,
      true
    ),
    arbiters: decodeNativeAgentStateArray(
      row,
      "arbiters",
      decodeNativeAgentArbiterStateRecord,
      true
    ),
    reputationReviews: decodeNativeAgentStateArray(
      row,
      "reputationReviews",
      decodeNativeAgentReputationReviewStateRecord,
      true
    ),
    spendingPolicies: decodeNativeAgentStateArray(
      row,
      "spendingPolicies",
      decodeNativeAgentExistingStateRecord,
      false
    ),
    policySpends: decodeNativeAgentStateArray(
      row,
      "policySpends",
      decodeNativeAgentExistingStateRecord,
      false
    ),
    escrows: decodeNativeAgentStateArray(
      row,
      "escrows",
      decodeNativeAgentExistingStateRecord,
      false
    ),
    source: expectObject(
      row["source"],
      "native agent state source"
    )
  };
}
function nativeMarketStateFilterParams(filter) {
  const out = {};
  if (filter.marketId != null) out.marketId = filter.marketId;
  if (filter.orderId != null) out.orderId = filter.orderId;
  if (filter.listingId != null) out.listingId = filter.listingId;
  if (filter.collectionId != null) out.collectionId = filter.collectionId;
  if (filter.account != null) out.account = filter.account;
  if (filter.includeSpotOrders != null) out.includeSpotOrders = filter.includeSpotOrders;
  if (filter.limit != null) out.limit = encodeRpcU64Number(filter.limit, "limit");
  return out;
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
function normalizeCapabilitiesResponse(value) {
  return {
    ...value,
    nativeModuleForwarders: value.nativeModuleForwarders ?? {}
  };
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

exports.MONOLYTHIUM_NETWORKS = MONOLYTHIUM_NETWORKS;
exports.MONOLYTHIUM_TESTNET_CHAIN_ID = MONOLYTHIUM_TESTNET_CHAIN_ID;
exports.MONOLYTHIUM_TESTNET_NETWORK_NAME = MONOLYTHIUM_TESTNET_NETWORK_NAME;
exports.MonolythiumProvider = MonolythiumProvider;
exports.MonolythiumSigner = MonolythiumSigner;
exports.translateBlockOut = translateBlockOut;
exports.translateReceiptOut = translateReceiptOut;
exports.translateTxIn = translateTxIn;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map