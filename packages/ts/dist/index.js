import { blake3 } from '@noble/hashes/blake3.js';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { randomBytes } from '@noble/hashes/utils.js';
import '@noble/post-quantum/ml-dsa.js';
import { JsonRpcApiProvider, Network, AbstractSigner } from 'ethers';

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
  ContractCall: 1,
  CLOBOp: 3};
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
  const { cipherText: kemCt, sharedSecret } = ml_kem768.encapsulate(kemEncapsulationKey);
  const nonce = randomBytes(DKG_NONCE_LEN);
  const cipher = chacha20poly1305(sharedSecret, nonce, aadFor(nonceAad));
  const aeadCt = cipher.encrypt(signedInnerTxBincode);
  sharedSecret.fill(0);
  return concatBytes2(kemCt, nonce, aeadCt);
}
function outerSigDigest(nonceAad, ciphertext, decryptionHint, senderPubkey) {
  const aad = bincodeNonceAad(nonceAad);
  const hint = bincodeDecryptHint(decryptionHint);
  return keccak_256(concatBytes2(aad, ciphertext, hint, expectBytes(senderPubkey, ML_DSA_65_PUBLIC_KEY_LEN, "senderPubkey")));
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
function u128Checked(value, field2) {
  const cap = (1n << 128n) - 1n;
  if (value < 0n || value > cap) {
    throw new Error(`${field2} must fit in u128 for encrypted nonce AAD`);
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
var MRV_DEPLOY_PAYLOAD_VERSION = 1;
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
  return bytesToHex3(blake3(concatBytes3(MRV_CODE_HASH_DOMAIN, len, codeBytes)));
}
function mrvV1TransactionExtension() {
  return { kind: MRV_TX_EXTENSION_KIND, bodyHex: "0x01" };
}
function encodeMrvDeployPayload(artifactBytes, constructorInput) {
  const artifact = bytesFrom(artifactBytes, "artifactBytes");
  const w = new BincodeWriter();
  w.u16(MRV_DEPLOY_PAYLOAD_VERSION);
  w.bytes(artifact);
  if (constructorInput === void 0 || constructorInput === null) {
    w.u8(0);
  } else {
    const constructor = bytesFrom(constructorInput, "constructorInput");
    w.u8(1);
    w.bytes(constructor);
  }
  return bytesToHex3(w.toBytes());
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
  const digest = blake3(
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
function buildMrvDeployPayloadRequest(artifactBytes, options = {}) {
  const request = buildMrvDeployRequest(
    encodeMrvDeployPayload(artifactBytes, options.constructorInput),
    options
  );
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
function buildMrvDeployPayloadPlan(artifactBytes, options = {}) {
  const request = buildMrvDeployPayloadRequest(artifactBytes, options);
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
function buildMrvDeployPayloadNativeTxPlan(artifactBytes, options) {
  const chainId = normalizeU64(options.chainId, "chainId");
  const nonce = normalizeU64(options.nonce, "nonce");
  const executionUnitLimit = normalizeU64(options.executionUnitLimit, "executionUnitLimit");
  const maxExecutionFee = normalizeDecimalLike("maxExecutionFeeLythoshi", options.maxExecutionFeeLythoshi);
  const priorityTip = options.priorityTipLythoshi === void 0 ? void 0 : normalizeDecimalLike("priorityTipLythoshi", options.priorityTipLythoshi);
  const plan = buildMrvDeployPayloadPlan(artifactBytes, {
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
async function submitMrvDeployPayloadNativeTx(client, backend, artifactBytes, options) {
  const plan = buildMrvDeployPayloadNativeTxPlan(artifactBytes, options);
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
function assertMrvV1Extension(extension, field2) {
  if (extension.kind !== MRV_TX_EXTENSION_KIND) {
    throw new MrvValidationError(`${field2}.kind must be MRV v1 extension kind`);
  }
  const bodyHex = normalizeBytesHex("bodyHex" in extension ? extension.bodyHex : extension.body, `${field2}.body`);
  if (bodyHex !== "0x01") {
    throw new MrvValidationError(`${field2}.body must be MRV v1 extension body`);
  }
}
function assertSameBigint(field2, actual, expected) {
  if (normalizeU64Like(actual, field2) !== expected) {
    throw new MrvValidationError(`${field2} must match nativeTx`);
  }
}
function assertSameDecimal(field2, actual, expected) {
  if (normalizeDecimalLike(field2, actual) !== expected) {
    throw new MrvValidationError(`${field2} must match nativeTx`);
  }
}
function assertU128Lythoshi(field2, value) {
  const normalized = BigInt(normalizeDecimalLike(field2, value));
  if (normalized > (1n << 128n) - 1n) {
    throw new MrvValidationError(`${field2} must fit in u128 for encrypted submission`);
  }
}
function normalizeNativeTxToHex(value, field2) {
  if (value === null) return null;
  const bytes = bytesFrom(value, field2);
  if (bytes.length !== 20) {
    throw new MrvValidationError(`${field2} must be a 20-byte address`);
  }
  return bytesToHex3(bytes).toLowerCase();
}
function normalizeU64Like(value, field2) {
  if (typeof value === "string") {
    return normalizeU64(BigInt(normalizeDecimalLike(field2, value)), field2);
  }
  return normalizeU64(value, field2);
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
function validateOptionalDecimal(field2, value) {
  if (value !== void 0) validateDecimal(field2, value);
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
function normalizeBytesHex(value, field2) {
  return bytesToHex3(bytesFrom(value, field2));
}
function normalizeOptionalDecimalLike(field2, value) {
  return value === void 0 ? void 0 : normalizeDecimalLike(field2, value);
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
function checkStructuredFeeObject(value, expectedTotalLythoshi, failures, label = "structuredFee") {
  if (!isRecord(value)) {
    failures.push(`${label} must be an object`);
    return;
  }
  const expectedFields = new Set(MRV_STRUCTURED_FEE_FIELDS);
  const actualFields = Object.keys(value);
  for (const field2 of MRV_STRUCTURED_FEE_FIELDS) {
    if (!(field2 in value)) failures.push(`${label} is missing '${field2}'`);
  }
  for (const field2 of actualFields) {
    if (!expectedFields.has(field2)) failures.push(`${label} has unexpected field '${field2}'`);
  }
  const totalLythoshi = stringField(value, "total_lythoshi", failures, label);
  const expectedTotal = expectedTotalLythoshi ?? totalLythoshi;
  if (totalLythoshi !== void 0 && expectedTotalLythoshi !== void 0 && totalLythoshi !== expectedTotalLythoshi) {
    failures.push(`${label}.total_lythoshi must be ${expectedTotalLythoshi}`);
  }
  const totalLyth = lythDecimalField(value, "total_lyth", failures, label);
  if (totalLyth !== void 0 && expectedTotal !== void 0) {
    const expectedTotalLyth = formatLyth(expectedTotal, { includeUnit: false });
    if (totalLyth !== expectedTotalLyth) {
      failures.push(`${label}.total_lyth must be ${expectedTotalLyth}`);
    }
  }
  for (const field2 of [
    "base_price_per_cycle_lythoshi",
    "state_io_price_per_unit_lythoshi",
    "priority_tip_lythoshi"
  ]) {
    stringField(value, field2, failures, label);
  }
  for (const field2 of ["cycles_used", "state_io_units"]) {
    integerField(value, field2, failures, label);
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringField(value, field2, failures, label) {
  const fieldValue = value[field2];
  if (typeof fieldValue !== "string" || !isCanonicalUnsignedDecimalString(fieldValue)) {
    failures.push(`${label}.${field2} must be a canonical unsigned decimal string`);
    return void 0;
  }
  return fieldValue;
}
function lythDecimalField(value, field2, failures, label) {
  const fieldValue = value[field2];
  if (typeof fieldValue !== "string") {
    failures.push(`${label}.${field2} must be a canonical LYTH decimal string`);
    return void 0;
  }
  try {
    parseLythToLythoshi(`${fieldValue} LYTH`);
  } catch {
    failures.push(`${label}.${field2} must be a canonical LYTH decimal string`);
    return void 0;
  }
  return fieldValue;
}
function integerField(value, field2, failures, label) {
  const fieldValue = value[field2];
  if (typeof fieldValue !== "number" || !Number.isSafeInteger(fieldValue) || fieldValue < 0) {
    failures.push(`${label}.${field2} must be a non-negative safe integer`);
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
function normalizeDecimalLike(field2, value, defaultValue) {
  if (value === void 0) {
    if (defaultValue === void 0) throw new MrvValidationError(`${field2} is required`);
    return defaultValue;
  }
  if (typeof value === "string") {
    validateDecimal(field2, value);
    return value;
  }
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new MrvValidationError(`${field2} must be a safe unsigned integer`);
  }
  const out = BigInt(value);
  if (out < 0n) throw new MrvValidationError(`${field2} must be a canonical unsigned decimal string`);
  return out.toString();
}
function normalizeOptionalU64(field2, value) {
  return value === void 0 ? void 0 : normalizeU64(value, field2);
}
function validateDecimal(field2, value) {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new MrvValidationError(`${field2} must be a canonical unsigned decimal string`);
  }
  try {
    BigInt(value);
  } catch {
    throw new MrvValidationError(`${field2} must be a canonical unsigned decimal string`);
  }
}
function validateExecutionUnitLimit(field2, value) {
  if (value !== void 0 && BigInt(value) === 0n) {
    throw new MrvValidationError(`${field2} must be greater than zero`);
  }
}
function normalizeU64(value, field2) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new MrvValidationError(`${field2} must be a safe unsigned integer`);
  }
  const out = BigInt(value);
  if (out < 0n || out > 0xffffffffffffffffn) {
    throw new MrvValidationError(`${field2} must fit in u64`);
  }
  return out;
}
function validateHexLength(field2, value, expected) {
  const bytes = hexToBytes3(value, field2);
  if (bytes.length !== expected) throw new MrvValidationError(`${field2} must be ${expected} bytes`);
}
function bytesFrom(value, field2) {
  if (typeof value === "string") return hexToBytes3(value, field2);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes3(value, field2) {
  if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) {
    throw new MrvValidationError(`${field2} must be 0x-prefixed even-length hex`);
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

// src/types.ts
function encodeBlockSelector(b) {
  if (typeof b === "number") return `0x${b.toString(16)}`;
  if (typeof b === "bigint") return `0x${b.toString(16)}`;
  return b;
}

// src/client.ts
var MAX_NATIVE_RECEIPT_EVENTS = 1e3;
var SDK_VERSION = "0.1.0";
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
    throw SdkError.malformed(`ADR-0039 structured fee violation: ${message}`);
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

// src/streams.ts
var NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC = "nativeMarketOrderBook";
var API_STREAM_TOPICS = [
  "newHeads",
  "newPendingTx",
  "logs",
  "newCommit",
  "dagVertices",
  "registry",
  "marketTrades",
  NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC,
  "gapRecords",
  "nativeEvents"
];
function isNativeMarketOrderBookStreamPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value;
  return isString(row["marketId"]) && isString(row["orderId"]) && isOptionalString(row["relatedOrderId"]) && isString(row["eventName"]) && isNativeMarketOrderBookStreamAction(row["action"]) && isOptionalString(row["side"]) && isOptionalString(row["price"]) && isOptionalString(row["quantity"]) && isOptionalString(row["remaining"]) && isOptionalString(row["status"]) && isNonNegativeSafeInteger(row["blockHeight"]) && isNonNegativeSafeInteger(row["txIndex"]) && isNonNegativeSafeInteger(row["logIndex"]);
}
function assertNativeMarketOrderBookStreamPayload(value) {
  if (!isNativeMarketOrderBookStreamPayload(value)) {
    throw SdkError.malformed("nativeMarketOrderBook stream payload is malformed");
  }
}
function decodeNativeMarketOrderBookDeltasResponse(value) {
  const row = expectObject2(value, "nativeMarketOrderBook delta replay response");
  const replay = row["replay"];
  const streamTopic = row["streamTopic"];
  if (replay !== true || streamTopic !== NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC) {
    throw SdkError.malformed(
      "nativeMarketOrderBook delta replay response has invalid replay metadata"
    );
  }
  const rawDeltas = row["deltas"];
  if (!Array.isArray(rawDeltas)) {
    throw SdkError.malformed("nativeMarketOrderBook delta replay response deltas must be an array");
  }
  const deltas = rawDeltas.map((delta, index) => {
    if (!isNativeMarketOrderBookStreamPayload(delta)) {
      throw SdkError.malformed(
        `nativeMarketOrderBook delta replay response deltas[${index}] is malformed`
      );
    }
    return delta;
  });
  return {
    schemaVersion: parseSafeInteger(row["schemaVersion"], "schemaVersion"),
    fromBlock: parseSafeInteger(row["fromBlock"], "fromBlock"),
    toBlock: parseSafeInteger(row["toBlock"], "toBlock"),
    limit: parseNullableSafeInteger(row["limit"], "limit"),
    cursor: parseNullableString(row["cursor"], "cursor"),
    nextCursor: parseNullableString(row["nextCursor"], "nextCursor"),
    filters: expectObject2(
      row["filters"],
      "nativeMarketOrderBook delta replay response filters"
    ),
    replay,
    streamTopic,
    deltas,
    source: expectObject2(
      row["source"],
      "nativeMarketOrderBook delta replay response source"
    )
  };
}
function isNativeMarketOrderBookStreamAction(value) {
  return value === "upsert" || value === "remove";
}
function isString(value) {
  return typeof value === "string";
}
function isOptionalString(value) {
  return value === void 0 || typeof value === "string";
}
function isNonNegativeSafeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function expectObject2(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw SdkError.malformed(`${label} must be an object`);
  }
  return value;
}
function parseSafeInteger(value, label) {
  if (!isNonNegativeSafeInteger(value)) {
    throw SdkError.malformed(`nativeMarketOrderBook delta replay response ${label} is malformed`);
  }
  return value;
}
function parseNullableSafeInteger(value, label) {
  if (value === null || value === void 0) return null;
  return parseSafeInteger(value, label);
}
function parseNullableString(value, label) {
  if (value === null || value === void 0) return null;
  if (typeof value !== "string") {
    throw SdkError.malformed(`nativeMarketOrderBook delta replay response ${label} is malformed`);
  }
  return value;
}

// src/api.ts
var SDK_VERSION2 = "0.1.0";
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
      "user-agent": `monolythium-core-sdk/${SDK_VERSION2}`,
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
  async streams() {
    return this.get("/streams");
  }
  async transactions(limit = 50, cursor) {
    const response = await this.get("/transactions", { limit, cursor });
    return {
      ...response,
      data: decodeTxFeedResponse(response.data)
    };
  }
  async transaction(hash) {
    return this.get(`/transactions/${encodePathSegment(hash)}`);
  }
  async transactionReceipt(hash) {
    return this.get(`/transactions/${encodePathSegment(hash)}/receipt`);
  }
  async transactionNativeReceipt(hash) {
    const response = await this.get(
      `/transactions/${encodePathSegment(hash)}/native-receipt`
    );
    return {
      ...response,
      data: decodeNativeReceiptResponse(response.data)
    };
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
  async transactionNativeReceiptMarketEvents(hash, filter = {}) {
    const receipt = await this.transactionNativeReceipt(hash);
    return {
      ...receipt,
      data: nativeMarketEventsFromReceipt(receipt.data, filter)
    };
  }
  async nativeEvents(filter) {
    return this.get("/native-events", nativeEventsFilterQuery(filter));
  }
  async nativeEventsTyped(filter) {
    const response = await this.nativeEvents(filter);
    return {
      ...response,
      data: nativeEventsFromHistory(response.data)
    };
  }
  async nativeMarketEvents(filter) {
    return this.nativeEvents({
      ...filter,
      family: "market"
    });
  }
  async nativeMarketEventsTyped(filter) {
    const response = await this.nativeEvents({
      ...filter,
      family: "market"
    });
    return {
      ...response,
      data: nativeMarketEventsFromHistory(response.data)
    };
  }
  async nativeAgentState(filter = {}) {
    const response = await this.get(
      "/native-agent-state",
      nativeAgentStateFilterParams(filter)
    );
    return {
      ...response,
      data: decodeNativeAgentStateResponse(response.data)
    };
  }
  async nativeMarketState(filter = {}) {
    return this.get("/native-market-state", nativeMarketStateFilterParams(filter));
  }
  async nativeMarketOrderBookDeltas(filter) {
    const response = await this.get(
      "/native-market-orderbook-deltas",
      nativeMarketOrderBookDeltasQuery(filter)
    );
    return {
      ...response,
      data: decodeNativeMarketOrderBookDeltasResponse(response.data)
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
  async addressPendingRewards(address, block) {
    return this.get(`/addresses/${encodePathSegment(address)}/pending-rewards`, {
      block: block == null ? void 0 : encodeBlockSelector(block)
    });
  }
  async addressRedemptionQueue(address, block) {
    return this.get(`/addresses/${encodePathSegment(address)}/redemption-queue`, {
      block: block == null ? void 0 : encodeBlockSelector(block)
    });
  }
  async assetMrcMetadata(assetId, mrcTokenId) {
    return this.get(`/assets/${encodePathSegment(assetId)}/metadata`, {
      mrcTokenId: mrcTokenId ?? void 0
    });
  }
  async mrcAccount(account, limit) {
    return this.get(`/mrc/accounts/${encodePathSegment(account)}`, {
      limit: limit ?? void 0
    });
  }
  async mrcHolders(standard, assetId, tokenId, limit) {
    return this.get(
      `/mrc/${encodePathSegment(standard)}/${encodePathSegment(assetId)}/${encodePathSegment(
        tokenId
      )}/holders`,
      { limit: limit ?? void 0 }
    );
  }
  /**
   * Asset-scoped `/api/v1/mrc/{standard}/{assetId}/holders`.
   *
   * This is the REST form used by MRC-4626 vault share balances.
   */
  async mrcAssetHolders(standard, assetId, limit) {
    return this.get(
      `/mrc/${encodePathSegment(standard)}/${encodePathSegment(assetId)}/holders`,
      { limit: limit ?? void 0 }
    );
  }
  /** `/api/v1/mrc/mrc4626/{vaultId}/holders`. */
  async mrc4626Holders(vaultId, limit) {
    return this.mrcAssetHolders("mrc4626", vaultId, limit);
  }
  /**
   * `/api/v1/bridge/routes`.
   *
   * The forthcoming route is read-only `GET`, so the typed request is encoded
   * as a single JSON query value named `request`.
   */
  async bridgeRoutes(request) {
    return this.get("/bridge/routes", {
      request: JSON.stringify(request)
    });
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
function nativeEventsFilterQuery(filter) {
  return {
    fromBlock: filter.fromBlock,
    toBlock: filter.toBlock,
    limit: filter.limit,
    txIndex: filter.txIndex,
    logIndex: filter.logIndex,
    address: filter.address,
    eventTopic: filter.eventTopic,
    family: filter.family,
    eventName: filter.eventName,
    primaryId: filter.primaryId,
    relatedId: filter.relatedId,
    tokenId: filter.tokenId,
    account: filter.account,
    counterparty: filter.counterparty
  };
}
function nativeMarketOrderBookDeltasQuery(filter) {
  return {
    fromBlock: filter.fromBlock,
    toBlock: filter.toBlock,
    limit: filter.limit,
    cursor: filter.cursor,
    txIndex: filter.txIndex,
    logIndex: filter.logIndex,
    address: filter.address,
    eventTopic: filter.eventTopic,
    eventName: filter.eventName,
    marketId: filter.marketId,
    listingId: filter.listingId,
    primaryId: filter.primaryId,
    relatedId: filter.relatedId,
    tokenId: filter.tokenId,
    account: filter.account,
    counterparty: filter.counterparty
  };
}
function encodePathBlock(block) {
  return encodePathSegment(encodeBlockSelector(block));
}
function encodePathSegment(value) {
  return encodeURIComponent(typeof value === "bigint" ? value.toString() : String(value));
}

// src/bridge.ts
var BRIDGE_SELECTORS = {
  lockBridgeConfig: "0x8956feb3",
  setBridgeResumeCooldown: "0x1a3a0672",
  setBridgeRouteFinality: "0x8a061e99"
};
var BRIDGE_REVERT_TAGS = {
  bridgeAdminLocked: "0xf807",
  bridgeResumeCooldownActive: "0xf808",
  bridgeCooldownZero: "0xfd08",
  bridgeFinalityZero: "0xfd09"
};
var BRIDGE_QUOTE_API_BLOCKED_REASON = "bridge quote requires a mono-core live quote API/runtime primitive";
var BRIDGE_SUBMIT_API_BLOCKED_REASON = "bridge submit requires a mono-core live submit API/runtime primitive";
var BridgePrecompileError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "BridgePrecompileError";
  }
};
var BridgeRouteCatalogueError = class extends Error {
  blockedReasons;
  constructor(blockedReasons) {
    super(`invalid bridge route catalogue: ${blockedReasons.join("; ")}`);
    this.name = "BridgeRouteCatalogueError";
    this.blockedReasons = [...blockedReasons];
  }
};
function bridgeAddressHex() {
  return PRECOMPILE_ADDRESSES.BRIDGE.toLowerCase();
}
function encodeLockBridgeConfigCalldata(bridgeId) {
  return bytesToHex4(
    concatBytes4(
      hexToBytes4(BRIDGE_SELECTORS.lockBridgeConfig),
      expectLength3(toBytes2(bridgeId), 32, "bridgeId")
    )
  );
}
function encodeSetBridgeResumeCooldownCalldata(bridgeId, cooldownBlocks) {
  return bytesToHex4(
    concatBytes4(
      hexToBytes4(BRIDGE_SELECTORS.setBridgeResumeCooldown),
      expectLength3(toBytes2(bridgeId), 32, "bridgeId"),
      uint64Word(cooldownBlocks, "cooldownBlocks")
    )
  );
}
function encodeSetBridgeRouteFinalityCalldata(bridgeId, finalityBlocks) {
  return bytesToHex4(
    concatBytes4(
      hexToBytes4(BRIDGE_SELECTORS.setBridgeRouteFinality),
      expectLength3(toBytes2(bridgeId), 32, "bridgeId"),
      uint64Word(finalityBlocks, "finalityBlocks")
    )
  );
}
function isBridgeAdminLockedRevert(data) {
  return bytesToHex4(toBytes2(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeAdminLocked;
}
function isBridgeResumeCooldownActiveRevert(data) {
  return bytesToHex4(toBytes2(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeResumeCooldownActive;
}
function isBridgeCooldownZeroRevert(data) {
  return bytesToHex4(toBytes2(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeCooldownZero;
}
function isBridgeFinalityZeroRevert(data) {
  return bytesToHex4(toBytes2(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeFinalityZero;
}
function assessBridgeRoute(route) {
  const blockedReasons = [];
  const warnings = [];
  if (route.routeId.trim() === "") blockedReasons.push("route id missing");
  if (route.bridge.trim() === "") blockedReasons.push("bridge name missing");
  if (route.asset.trim() === "") blockedReasons.push("asset disclosure missing");
  if (route.verifier.model.trim() === "") blockedReasons.push("verifier model missing");
  if (route.verifier.threshold < 2 || route.verifier.participantCount < 2) {
    blockedReasons.push("verifier set must not be 1-of-1");
  }
  if (route.verifier.threshold > route.verifier.participantCount) {
    blockedReasons.push("verifier threshold exceeds participant count");
  }
  if (!decimalStringIsPositive(route.drainCapAtomic)) {
    blockedReasons.push("per-asset drain cap missing or zero");
  }
  if (route.finalityBlocks === 0) blockedReasons.push("route finality delay missing");
  if (route.cooldownSeconds === 0) blockedReasons.push("route cooldown missing");
  if (route.adminControl !== "none" && route.adminControl !== "consensusOnly") {
    blockedReasons.push("Mono-side admin control is not consensus-only");
  }
  if (route.circuitBreaker === "paused") {
    blockedReasons.push("route circuit breaker is paused");
  } else if (route.circuitBreaker === "disabled" || route.circuitBreaker === "unknown") {
    blockedReasons.push("route circuit breaker missing");
  }
  if (!decimalStringIsPositive(route.insuranceAtomic)) {
    blockedReasons.push("slashable insurance pool missing or zero");
  }
  if (route.lastIncidentDate != null) {
    warnings.push("route reports a prior bridge incident");
  }
  if (blockedReasons.length > 0) {
    return {
      routeId: route.routeId,
      accepted: false,
      score: 0,
      riskTier: "blocked",
      blockedReasons,
      warnings
    };
  }
  let score2 = 100;
  if (route.verifier.threshold * 3 <= route.verifier.participantCount) {
    score2 -= 10;
    warnings.push("verifier threshold is below one-third-plus quorum");
  }
  if (route.cooldownSeconds < 3600) {
    score2 -= 10;
    warnings.push("cooldown is under one hour");
  }
  if (route.finalityBlocks < 2) {
    score2 -= 5;
    warnings.push("finality delay is under two blocks");
  }
  return {
    routeId: route.routeId,
    accepted: true,
    score: score2,
    riskTier: score2 >= 90 ? "low" : score2 >= 75 ? "medium" : "high",
    blockedReasons,
    warnings
  };
}
function rankBridgeRoutes(routes) {
  return routes.map((route) => ({ route, assessment: assessBridgeRoute(route) })).sort((left, right) => {
    if (left.assessment.accepted !== right.assessment.accepted) {
      return left.assessment.accepted ? -1 : 1;
    }
    if (left.assessment.score !== right.assessment.score) {
      return right.assessment.score - left.assessment.score;
    }
    if (left.route.cooldownSeconds !== right.route.cooldownSeconds) {
      return left.route.cooldownSeconds - right.route.cooldownSeconds;
    }
    if (left.route.finalityBlocks !== right.route.finalityBlocks) {
      return left.route.finalityBlocks - right.route.finalityBlocks;
    }
    return left.assessment.routeId.localeCompare(right.assessment.routeId);
  });
}
function bridgeTransferCandidates(intent, routes) {
  const intentReasons = validateBridgeTransferIntent(intent);
  return routes.map((route) => bridgeRouteCandidate(intent, intentReasons, route)).sort(compareBridgeCandidates);
}
function selectBridgeTransferRoute(intent, routes) {
  const blockedReasons = validateBridgeTransferIntent(intent);
  const candidates = bridgeTransferCandidates(intent, routes);
  if (routes.length === 0) {
    blockedReasons.push("no route disclosures supplied");
  }
  const selectedCandidate = blockedReasons.length === 0 ? candidates.find((candidate) => candidate.eligible) : void 0;
  const selected = selectedCandidate == null ? null : {
    intent,
    route: selectedCandidate.route,
    assessment: selectedCandidate.assessment
  };
  if (selected == null && blockedReasons.length === 0) {
    blockedReasons.push("no eligible bridge route satisfies the transfer intent and v4.1 floor");
  }
  return { selected, candidates, blockedReasons };
}
function bridgeQuoteSubmitReadiness(intent, routes) {
  const selection = selectBridgeTransferRoute(intent, routes);
  const routeSelectionReady = selection.selected != null;
  const blockedReasons = [...selection.blockedReasons];
  if (routeSelectionReady) {
    blockedReasons.push(BRIDGE_QUOTE_API_BLOCKED_REASON, BRIDGE_SUBMIT_API_BLOCKED_REASON);
  }
  return {
    selection,
    routeSelectionReady,
    quoteReady: false,
    submitReady: false,
    blockedReasons,
    warnings: selection.selected == null ? [] : [...selection.selected.assessment.warnings]
  };
}
function bridgeRoutesReadiness(request) {
  const routeDisclosures = request.routeDisclosures ?? [];
  const source = {
    address: request.address,
    routeCount: routeDisclosures.length,
    globalRouteIndexAvailable: false,
    routeDisclosureSource: "request.routeDisclosures"
  };
  if (request.intent == null) {
    const blockedReasons = ["bridge route selection requires transfer intent"];
    if (routeDisclosures.length === 0) {
      blockedReasons.push("no route disclosures supplied");
    }
    return {
      selection: {
        selected: null,
        candidates: [],
        blockedReasons: [...blockedReasons]
      },
      routeSelectionReady: false,
      quoteReady: false,
      submitReady: false,
      blockedReasons,
      warnings: [],
      routes: [...routeDisclosures],
      bridgeRouteDisclosures: [...routeDisclosures],
      source
    };
  }
  const readiness = bridgeQuoteSubmitReadiness(request.intent, routeDisclosures);
  return {
    ...readiness,
    quoteReady: false,
    submitReady: false,
    routes: [...routeDisclosures],
    bridgeRouteDisclosures: [...routeDisclosures],
    source
  };
}
function buildBridgeRouteCatalogue(routes) {
  return { routes: routes.map(cloneBridgeRouteCatalogueRoute) };
}
function parseBridgeRouteCatalogueJson(json) {
  const decoded = JSON.parse(json);
  return normalizeBridgeRouteCatalogue(decoded);
}
function normalizeBridgeRouteCatalogue(payload) {
  const validation = validateBridgeRouteCatalogue(payload);
  if (!validation.accepted) {
    throw new BridgeRouteCatalogueError(validation.blockedReasons);
  }
  const routes = routeArrayFromCataloguePayload(payload);
  if (routes == null) {
    throw new BridgeRouteCatalogueError(["route catalogue must be an array or { routes: [...] }"]);
  }
  return { routes: routes.map((route) => coerceBridgeRouteCatalogueRoute(route)) };
}
function validateBridgeRouteCatalogue(payload) {
  const routes = routeArrayFromCataloguePayload(payload);
  const blockedReasons = [];
  if (routes == null) {
    return {
      accepted: false,
      routeCount: 0,
      blockedReasons: ["route catalogue must be an array or { routes: [...] }"]
    };
  }
  if (routes.length === 0) {
    blockedReasons.push("bridge route import must contain at least one route");
  }
  const seen = /* @__PURE__ */ new Set();
  routes.forEach(
    (route, idx) => validateBridgeRouteCatalogueRoute(idx, route, seen, blockedReasons)
  );
  return {
    accepted: blockedReasons.length === 0,
    routeCount: routes.length,
    blockedReasons
  };
}
function exportBridgeRouteCatalogueJson(payload, options = {}) {
  const catalogue = normalizeBridgeRouteCatalogue(payload);
  const value = options.envelope === false ? catalogue.routes : catalogue;
  return JSON.stringify(value, null, options.space ?? 2);
}
var MAX_U256 = (1n << 256n) - 1n;
function routeArrayFromCataloguePayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (isRecord2(payload) && Array.isArray(payload.routes)) return payload.routes;
  return null;
}
function validateBridgeRouteCatalogueRoute(idx, value, seen, blockedReasons) {
  const prefix = `routes[${idx}]`;
  if (!isRecord2(value)) {
    blockedReasons.push(`${prefix} must be an object`);
    return;
  }
  const tokenId = validateHexBytes(
    `${prefix}.tokenId`,
    field(value, "tokenId", "token_id"),
    32,
    blockedReasons
  );
  const routeId = validateTextField(
    `${prefix}.routeId`,
    field(value, "routeId", "route_id"),
    96,
    blockedReasons
  );
  if (tokenId != null && routeId != null) {
    const key = `${tokenId}:${routeId}`;
    if (seen.has(key)) {
      blockedReasons.push(`${prefix}.routeId duplicate (tokenId, routeId) in bridge route import`);
    } else {
      seen.add(key);
    }
  }
  validateHexBytes(
    `${prefix}.bridgeId`,
    field(value, "bridgeId", "bridge_id"),
    32,
    blockedReasons
  );
  validateHexBytes(
    `${prefix}.wrappedAsset`,
    field(value, "wrappedAsset", "wrapped_asset"),
    20,
    blockedReasons
  );
  validateTextField(`${prefix}.bridge`, value.bridge, 64, blockedReasons);
  validateTextField(`${prefix}.asset`, value.asset, 64, blockedReasons);
  validateTextField(
    `${prefix}.sourceChain`,
    field(value, "sourceChain", "source_chain"),
    64,
    blockedReasons
  );
  validateTextField(
    `${prefix}.destinationChain`,
    field(value, "destinationChain", "destination_chain"),
    64,
    blockedReasons
  );
  const verifier = value.verifier;
  if (!isRecord2(verifier)) {
    blockedReasons.push(`${prefix}.verifier must be an object`);
  } else {
    validateTextField(`${prefix}.verifier.model`, verifier.model, 64, blockedReasons);
    const participantCount = field(verifier, "participantCount", "participant_count");
    if (!isU16(participantCount) || participantCount === 0) {
      blockedReasons.push(`${prefix}.verifier.participantCount must be non-zero`);
    }
    if (!isU16(verifier.threshold) || verifier.threshold === 0) {
      blockedReasons.push(`${prefix}.verifier.threshold must be in 1..=participantCount`);
    } else if (isU16(participantCount) && verifier.threshold > participantCount) {
      blockedReasons.push(`${prefix}.verifier.threshold must be in 1..=participantCount`);
    }
  }
  if (!decimalStringIsPositiveU256(field(value, "drainCapAtomic", "drain_cap_atomic"))) {
    blockedReasons.push(`${prefix}.drainCapAtomic must be a non-zero decimal u256`);
  }
  if (!isSafeIntegerAtLeast(field(value, "finalityBlocks", "finality_blocks"), 1)) {
    blockedReasons.push(`${prefix}.finalityBlocks must be non-zero`);
  }
  if (!isSafeIntegerAtLeast(field(value, "cooldownSeconds", "cooldown_seconds"), 1)) {
    blockedReasons.push(`${prefix}.cooldownSeconds must be non-zero`);
  }
  if (parseBridgeAdminControl(field(value, "adminControl", "admin_control")) == null) {
    blockedReasons.push(
      `${prefix}.adminControl expected none, consensusOnly, operatorKey, or unknown`
    );
  }
  if (parseBridgeCircuitBreaker(field(value, "circuitBreaker", "circuit_breaker")) == null) {
    blockedReasons.push(`${prefix}.circuitBreaker expected armed, paused, disabled, or unknown`);
  }
  if (!decimalStringIsPositiveU256(field(value, "insuranceAtomic", "insurance_atomic"))) {
    blockedReasons.push(`${prefix}.insuranceAtomic must be a non-zero decimal u256`);
  }
  if (!isSafeIntegerAtLeast(field(value, "updatedAtBlock", "updated_at_block"), 0)) {
    blockedReasons.push(`${prefix}.updatedAtBlock must be a non-negative safe integer`);
  }
  const incident = field(value, "lastIncidentDate", "last_incident_date");
  if (incident !== void 0 && incident !== null) {
    if (typeof incident !== "string" || !incidentDateIsValid(incident)) {
      blockedReasons.push(`${prefix}.lastIncidentDate must be YYYY-MM-DD`);
    }
  }
}
function coerceBridgeRouteCatalogueRoute(value) {
  if (!isRecord2(value) || !isRecord2(value.verifier)) {
    throw new BridgeRouteCatalogueError(["route catalogue validation did not normalize an object"]);
  }
  const lastIncidentDate = field(value, "lastIncidentDate", "last_incident_date");
  const route = {
    tokenId: stringField2(value, "tokenId", "token_id"),
    routeId: stringField2(value, "routeId", "route_id").trim(),
    bridgeId: stringField2(value, "bridgeId", "bridge_id"),
    wrappedAsset: stringField2(value, "wrappedAsset", "wrapped_asset"),
    bridge: stringField2(value, "bridge").trim(),
    asset: stringField2(value, "asset").trim(),
    sourceChain: stringField2(value, "sourceChain", "source_chain").trim(),
    destinationChain: stringField2(value, "destinationChain", "destination_chain").trim(),
    verifier: {
      model: stringField2(value.verifier, "model").trim(),
      participantCount: numberField(value.verifier, "participantCount", "participant_count"),
      threshold: numberField(value.verifier, "threshold")
    },
    drainCapAtomic: stringField2(value, "drainCapAtomic", "drain_cap_atomic").trim(),
    finalityBlocks: numberField(value, "finalityBlocks", "finality_blocks"),
    cooldownSeconds: numberField(value, "cooldownSeconds", "cooldown_seconds"),
    adminControl: parseBridgeAdminControl(field(value, "adminControl", "admin_control")),
    circuitBreaker: parseBridgeCircuitBreaker(field(value, "circuitBreaker", "circuit_breaker")),
    insuranceAtomic: stringField2(value, "insuranceAtomic", "insurance_atomic").trim(),
    updatedAtBlock: numberField(value, "updatedAtBlock", "updated_at_block")
  };
  if (typeof lastIncidentDate === "string") {
    route.lastIncidentDate = lastIncidentDate.trim();
  } else if (lastIncidentDate === null) {
    route.lastIncidentDate = null;
  }
  return route;
}
function cloneBridgeRouteCatalogueRoute(route) {
  return {
    ...route,
    verifier: { ...route.verifier }
  };
}
function bridgeRouteCandidate(intent, intentReasons, route) {
  const assessment = assessBridgeRoute(route);
  const blockedReasons = [...intentReasons, ...assessment.blockedReasons];
  if (!trimmedEq(route.asset, intent.asset)) {
    blockedReasons.push("route asset does not match transfer intent");
  }
  if (!trimmedEq(route.sourceChain, intent.sourceChain)) {
    blockedReasons.push("route source chain does not match transfer intent");
  }
  if (!trimmedEq(route.destinationChain, intent.destinationChain)) {
    blockedReasons.push("route destination chain does not match transfer intent");
  }
  if (intent.allowedRouteIds != null && !intent.allowedRouteIds.some((routeId) => trimmedEq(routeId, route.routeId))) {
    blockedReasons.push("route id not allowed by transfer policy");
  }
  if (intent.minimumScore != null && assessment.score < intent.minimumScore) {
    blockedReasons.push("route score below transfer policy minimum");
  }
  if (intent.maxFinalityBlocks != null && route.finalityBlocks > intent.maxFinalityBlocks) {
    blockedReasons.push("route finality exceeds transfer policy maximum");
  }
  if (intent.maxCooldownSeconds != null && route.cooldownSeconds > intent.maxCooldownSeconds) {
    blockedReasons.push("route cooldown exceeds transfer policy maximum");
  }
  if (decimalStringIsPositive(intent.amountAtomic) && decimalStringIsPositive(route.drainCapAtomic) && decimalStringGt(intent.amountAtomic, route.drainCapAtomic)) {
    blockedReasons.push("transfer amount exceeds route drain cap");
  }
  if (decimalStringIsPositive(intent.amountAtomic) && decimalStringIsPositive(route.insuranceAtomic) && decimalStringGt(intent.amountAtomic, route.insuranceAtomic)) {
    blockedReasons.push("transfer amount exceeds disclosed insurance coverage");
  }
  return {
    route,
    assessment,
    eligible: blockedReasons.length === 0,
    score: assessment.score,
    blockedReasons,
    warnings: [...assessment.warnings]
  };
}
function validateBridgeTransferIntent(intent) {
  const blockedReasons = [];
  if (intent.asset.trim() === "") blockedReasons.push("transfer asset missing");
  if (!decimalStringIsPositive(intent.amountAtomic)) {
    blockedReasons.push("transfer amount missing or zero");
  }
  if (intent.sourceChain.trim() === "") blockedReasons.push("transfer source chain missing");
  if (intent.destinationChain.trim() === "") {
    blockedReasons.push("transfer destination chain missing");
  }
  if (intent.recipient.trim() === "") blockedReasons.push("transfer recipient missing");
  if (intent.minimumScore != null && intent.minimumScore > 100) {
    blockedReasons.push("minimum route score exceeds 100");
  }
  return blockedReasons;
}
function compareBridgeCandidates(left, right) {
  if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
  if (left.score !== right.score) return right.score - left.score;
  if (left.route.cooldownSeconds !== right.route.cooldownSeconds) {
    return left.route.cooldownSeconds - right.route.cooldownSeconds;
  }
  if (left.route.finalityBlocks !== right.route.finalityBlocks) {
    return left.route.finalityBlocks - right.route.finalityBlocks;
  }
  return left.route.routeId.localeCompare(right.route.routeId);
}
function decimalStringIsPositive(value) {
  const trimmed = value.trim();
  return /^[0-9]+$/.test(trimmed) && /[1-9]/.test(trimmed);
}
function decimalStringGt(left, right) {
  return decimalStringCompare(left, right) === 1;
}
function decimalStringCompare(left, right) {
  const normalizedLeft = normalizedDecimalDigits(left);
  const normalizedRight = normalizedDecimalDigits(right);
  if (normalizedLeft == null || normalizedRight == null) return null;
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length > normalizedRight.length ? 1 : -1;
  }
  if (normalizedLeft === normalizedRight) return 0;
  return normalizedLeft > normalizedRight ? 1 : -1;
}
function normalizedDecimalDigits(value) {
  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) return null;
  const normalized = trimmed.replace(/^0+/, "");
  return normalized === "" ? "0" : normalized;
}
function trimmedEq(left, right) {
  return left.trim() === right.trim();
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function field(record, camel, snake) {
  if (Object.prototype.hasOwnProperty.call(record, camel)) return record[camel];
  if (snake != null && Object.prototype.hasOwnProperty.call(record, snake)) return record[snake];
  return void 0;
}
function stringField2(record, camel, snake) {
  return field(record, camel, snake);
}
function numberField(record, camel, snake) {
  return field(record, camel, snake);
}
function validateTextField(name, value, maxLen, blockedReasons) {
  if (typeof value !== "string") {
    blockedReasons.push(`${name} must be 1..=${maxLen} bytes`);
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || utf8ByteLength(trimmed) > maxLen) {
    blockedReasons.push(`${name} must be 1..=${maxLen} bytes`);
    return null;
  }
  return trimmed;
}
function validateHexBytes(name, value, expectedBytes, blockedReasons) {
  if (typeof value !== "string") {
    blockedReasons.push(`${name} must be ${expectedBytes} bytes of hex`);
    return null;
  }
  const trimmed = value.trim();
  const body = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (body.length !== expectedBytes * 2 || !/^[0-9a-fA-F]+$/.test(body)) {
    blockedReasons.push(`${name} must be ${expectedBytes} bytes of hex`);
    return null;
  }
  return body.toLowerCase();
}
function isU16(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 65535;
}
function isSafeIntegerAtLeast(value, minimum) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}
function decimalStringIsPositiveU256(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) return false;
  const parsed = BigInt(trimmed);
  return parsed > 0n && parsed <= MAX_U256;
}
function parseBridgeAdminControl(value) {
  if (typeof value !== "string") return null;
  switch (enumKey(value)) {
    case "none":
      return "none";
    case "consensusonly":
      return "consensusOnly";
    case "operatorkey":
      return "operatorKey";
    case "unknown":
      return "unknown";
    default:
      return null;
  }
}
function parseBridgeCircuitBreaker(value) {
  if (typeof value !== "string") return null;
  switch (enumKey(value)) {
    case "armed":
      return "armed";
    case "paused":
      return "paused";
    case "disabled":
      return "disabled";
    case "unknown":
      return "unknown";
    default:
      return null;
  }
}
function enumKey(value) {
  return [...value].filter((c) => c !== "_" && c !== "-").join("").toLowerCase();
}
function incidentDateIsValid(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}
function utf8ByteLength(value) {
  return new TextEncoder().encode(value).length;
}
function expectLength3(value, len, name) {
  if (value.length !== len) {
    throw new BridgePrecompileError(`${name} must be ${len} bytes, got ${value.length}`);
  }
  return value;
}
function uint64Word(value, name) {
  const n = toBigint(value, name);
  if (n < 0n || n > 0xffffffffffffffffn) {
    throw new BridgePrecompileError(`${name} must fit uint64`);
  }
  const out = new Uint8Array(32);
  let rest = n;
  for (let i = 31; i >= 24; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
function toBigint(value, name) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
      throw new BridgePrecompileError(`${name} must be a safe integer`);
    }
    return BigInt(value);
  }
  if (!/^(0x[0-9a-fA-F]+|[0-9]+)$/.test(value)) {
    throw new BridgePrecompileError(`${name} must be an integer string`);
  }
  return BigInt(value);
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
    throw new BridgePrecompileError("invalid hex bytes");
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
var NO_EVM_RECEIPT_PROOF_SCHEMA = "mono.no_evm_receipt_proof.v1";
var NO_EVM_RECEIPT_PROOF_TYPE = "canonicalReceiptsTranscript";
var NO_EVM_RECEIPT_INCLUSION_PROOF_TYPE = "canonicalReceiptInclusion";
var NO_EVM_RECEIPT_ROOT_ALGORITHM = "keccak256(monolythium/v4.1/receipts_root_empty/1|receipt_leaf/1|receipt_node/1 binary Merkle)";
var NO_EVM_LEGACY_RECEIPT_ROOT_ALGORITHM = "keccak256(monolythium/v2/receipts_root/1 || len || indexed bincode receipts)";
var NO_EVM_RECEIPT_CODEC = "bincode(protocore_evm::Receipt)";
var NO_EVM_RECEIPTS_ROOT_DOMAIN = "monolythium/v4.1/receipts_root_empty/1";
var NO_EVM_RECEIPT_LEAF_DOMAIN = "monolythium/v4.1/receipt_leaf/1";
var NO_EVM_RECEIPT_NODE_DOMAIN = "monolythium/v4.1/receipt_node/1";
var NO_EVM_COMPACT_INCLUSION_PROOF_SCHEMA = "mono.no_evm_receipt_compact_inclusion.v1";
var NO_EVM_COMPACT_INCLUSION_TREE_ALGORITHM = "binary-keccak-receipt-tree";
var NO_EVM_ARCHIVE_PROOF_SCHEMA = "mono.no_evm_receipt_archive_binding.v1";
var NO_EVM_FINALITY_EVIDENCE_SCHEMA = "mono.no_evm_receipt_finality.v1";
var NO_EVM_FINALITY_EVIDENCE_SOURCE = "blsRoundCertificate";
var EMPTY_ROOT_DOMAIN_BYTES = new TextEncoder().encode(NO_EVM_RECEIPTS_ROOT_DOMAIN);
var LEAF_DOMAIN_BYTES = new TextEncoder().encode(NO_EVM_RECEIPT_LEAF_DOMAIN);
var NODE_DOMAIN_BYTES = new TextEncoder().encode(NO_EVM_RECEIPT_NODE_DOMAIN);
var UINT32_MAX = 4294967295;
var HASH_BYTE_LENGTH = 32;
var HEX_RE = /^[0-9a-fA-F]*$/u;
var NoEvmReceiptProofError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "NoEvmReceiptProofError";
  }
  code;
};
function decodeNoEvmReceiptTranscript(proof) {
  if (!Array.isArray(proof.receiptTranscript)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "boundedCacheTranscript proof requires receiptTranscript"
    );
  }
  return proof.receiptTranscript.map(
    (hex, index) => decodeHexBytes(hex, `receiptTranscript[${index}]`)
  );
}
function computeNoEvmReceiptsRoot(receipts) {
  return bytesToHex5(computeNoEvmReceiptsRootBytes(receipts));
}
function computeNoEvmTargetReceiptHash(receiptBytes) {
  return bytesToHex5(keccak_256(receiptBytes));
}
function verifyNoEvmReceiptProof(proof) {
  if (proof == null) return null;
  const proofKind = getProofKind(proof);
  switch (proofKind) {
    case "boundedCacheTranscript":
      return verifyBoundedReceiptProof(proof);
    case "compactInclusion":
      return verifyCompactReceiptProof(proof);
    default:
      throw new NoEvmReceiptProofError(
        "unsupported_proof_kind",
        `unsupported no-EVM receipt proofKind: ${proofKind}`
      );
  }
}
function verifyBoundedReceiptProof(proof) {
  validateCommonProofMetadata(proof);
  assertSupported(
    proof.proofType,
    NO_EVM_RECEIPT_PROOF_TYPE,
    "proofType",
    "unsupported_proof_type"
  );
  validateBoundedHistorySource(proof);
  validateNoCompactOrArchiveMaterial(proof);
  assertUint32(proof.receiptCount, "receiptCount");
  assertUint32(proof.txIndex, "txIndex");
  const receipts = decodeNoEvmReceiptTranscript(proof);
  if (proof.receiptCount !== receipts.length) {
    throw new NoEvmReceiptProofError(
      "receipt_count_mismatch",
      `receiptCount declares ${proof.receiptCount} receipts but receiptTranscript has ${receipts.length}`
    );
  }
  const targetReceipt = receipts[proof.txIndex];
  if (targetReceipt === void 0) {
    throw new NoEvmReceiptProofError(
      "tx_index_out_of_bounds",
      `txIndex ${proof.txIndex} is out of bounds for ${receipts.length} decoded receipts`
    );
  }
  const actualRoot = computeNoEvmReceiptsRoot(receipts);
  const expectedRoot = decodeHash(proof.receiptsRoot, "receiptsRoot");
  if (!bytesEqual(expectedRoot, decodeHash(actualRoot, "computedReceiptsRoot"))) {
    throw new NoEvmReceiptProofError(
      "receipts_root_mismatch",
      `receiptsRoot mismatch: expected ${proof.receiptsRoot}, computed ${actualRoot}`
    );
  }
  const actualTargetHash = computeNoEvmTargetReceiptHash(targetReceipt);
  const expectedTargetHash = decodeHash(proof.targetReceiptHash, "targetReceiptHash");
  if (!bytesEqual(expectedTargetHash, decodeHash(actualTargetHash, "computedTargetReceiptHash"))) {
    throw new NoEvmReceiptProofError(
      "target_receipt_hash_mismatch",
      `targetReceiptHash mismatch: expected ${proof.targetReceiptHash}, computed ${actualTargetHash}`
    );
  }
  return {
    receipts,
    receiptsRoot: actualRoot,
    targetReceiptHash: actualTargetHash,
    receiptCount: receipts.length,
    txIndex: proof.txIndex,
    targetReceipt,
    proofKind: "boundedCacheTranscript"
  };
}
function verifyCompactReceiptProof(proof) {
  validateCommonProofMetadata(proof);
  assertSupported(
    proof.proofType,
    NO_EVM_RECEIPT_INCLUSION_PROOF_TYPE,
    "proofType",
    "unsupported_proof_type"
  );
  validateCompactHistorySource(proof);
  validateOptionalArchiveProof(proof);
  assertUint32(proof.receiptCount, "receiptCount");
  assertUint32(proof.txIndex, "txIndex");
  const compactProof = getCompactInclusionProof(proof);
  assertSupported(
    compactProof.schema,
    NO_EVM_COMPACT_INCLUSION_PROOF_SCHEMA,
    "compactInclusionProof.schema",
    "unsupported_compact_schema"
  );
  assertSupported(
    compactProof.treeAlgorithm,
    NO_EVM_COMPACT_INCLUSION_TREE_ALGORITHM,
    "compactInclusionProof.treeAlgorithm",
    "unsupported_tree_algorithm"
  );
  if (!Array.isArray(compactProof.siblingHashes) || !Array.isArray(compactProof.pathSides)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "compactInclusionProof siblingHashes and pathSides must be arrays"
    );
  }
  if (compactProof.siblingHashes.length !== compactProof.pathSides.length) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "compactInclusionProof siblingHashes/pathSides length mismatch"
    );
  }
  const targetReceiptBytes = getTargetReceiptBytes(proof);
  const targetReceipt = decodeHexBytes(targetReceiptBytes, "targetReceiptBytes");
  const actualTargetHash = computeNoEvmTargetReceiptHash(targetReceipt);
  const expectedTargetHash = decodeHash(proof.targetReceiptHash, "targetReceiptHash");
  if (!bytesEqual(expectedTargetHash, decodeHash(actualTargetHash, "computedTargetReceiptHash"))) {
    throw new NoEvmReceiptProofError(
      "target_receipt_hash_mismatch",
      `targetReceiptHash mismatch: expected ${proof.targetReceiptHash}, computed ${actualTargetHash}`
    );
  }
  const actualLeafHashBytes = computeNoEvmReceiptLeafHashBytes(targetReceipt, proof.txIndex);
  const expectedLeafHashBytes = decodeHash(
    compactProof.leafHash,
    "compactInclusionProof.leafHash"
  );
  if (!bytesEqual(expectedLeafHashBytes, actualLeafHashBytes)) {
    throw new NoEvmReceiptProofError(
      "compact_leaf_hash_mismatch",
      `compactInclusionProof.leafHash mismatch: expected ${compactProof.leafHash}, computed ${bytesToHex5(
        actualLeafHashBytes
      )}`
    );
  }
  const compactRootBytes = decodeHash(compactProof.root, "compactInclusionProof.root");
  const receiptsRootBytes = decodeHash(proof.receiptsRoot, "receiptsRoot");
  if (!bytesEqual(receiptsRootBytes, compactRootBytes)) {
    throw new NoEvmReceiptProofError(
      "compact_root_mismatch",
      `receiptsRoot must equal compactInclusionProof.root: receiptsRoot ${proof.receiptsRoot}, compact root ${compactProof.root}`
    );
  }
  const siblingHashes = compactProof.siblingHashes.map(
    (hash, index) => decodeHash(hash, `compactInclusionProof.siblingHashes[${index}]`)
  );
  const pathSides = compactProof.pathSides.map((side, index) => {
    if (typeof side !== "boolean") {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        `compactInclusionProof.pathSides[${index}] must be a boolean`
      );
    }
    return side;
  });
  const actualRootBytes = computeCompactRootFromPath(
    actualLeafHashBytes,
    siblingHashes,
    pathSides
  );
  if (!bytesEqual(actualRootBytes, compactRootBytes)) {
    throw new NoEvmReceiptProofError(
      "compact_path_mismatch",
      `compact inclusion path mismatch: expected ${compactProof.root}, computed ${bytesToHex5(
        actualRootBytes
      )}`
    );
  }
  return {
    receipts: [],
    receiptsRoot: bytesToHex5(actualRootBytes),
    targetReceiptHash: actualTargetHash,
    receiptCount: proof.receiptCount,
    txIndex: proof.txIndex,
    targetReceipt,
    proofKind: "compactInclusion"
  };
}
function validateCommonProofMetadata(proof) {
  assertSupported(
    proof.schema,
    NO_EVM_RECEIPT_PROOF_SCHEMA,
    "schema",
    "unsupported_schema"
  );
  assertSupportedRootAlgorithm(proof.rootAlgorithm);
  assertSupported(
    proof.receiptCodec,
    NO_EVM_RECEIPT_CODEC,
    "receiptCodec",
    "unsupported_receipt_codec"
  );
  validateOptionalFinalityEvidence(proof);
}
function validateBoundedHistorySource(proof) {
  const historySource = getOptionalHistorySource(proof);
  if (historySource !== void 0 && historySource !== "legacyUnspecified" && historySource !== "liveBlockCache") {
    throw new NoEvmReceiptProofError(
      "unsupported_history_source",
      `unsupported no-EVM receipt proof historySource: ${historySource}`
    );
  }
}
function validateCompactHistorySource(proof) {
  const historySource = getHistorySource(proof);
  if (historySource !== "liveBlockCache" && historySource !== "indexerReceiptArchive") {
    throw new NoEvmReceiptProofError(
      "unsupported_history_source",
      `unsupported no-EVM receipt proof historySource: ${historySource}`
    );
  }
}
function validateNoCompactOrArchiveMaterial(proof) {
  const maybeBounded = proof;
  if (maybeBounded.compactInclusionProof != null) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "boundedCacheTranscript proof cannot carry compactInclusionProof"
    );
  }
  if (maybeBounded.archiveProof != null) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "boundedCacheTranscript proof cannot carry archiveProof"
    );
  }
}
function validateOptionalArchiveProof(proof) {
  const archiveProof = proof.archiveProof;
  if (archiveProof == null) return;
  if (!isRecord3(archiveProof)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof must be an object when present"
    );
  }
  assertSupported(
    archiveProof.schema,
    NO_EVM_ARCHIVE_PROOF_SCHEMA,
    "archiveProof.schema",
    "unsupported_schema"
  );
  if (typeof archiveProof.source !== "string" || archiveProof.source.length === 0) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.source must be a non-empty string"
    );
  }
  decodeHash(archiveProof.manifestHash, "archiveProof.manifestHash");
  decodeHash(archiveProof.contentHash, "archiveProof.contentHash");
  if (!Array.isArray(archiveProof.signatures) || archiveProof.signatures.some((signature) => typeof signature !== "string")) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.signatures must be an array of strings"
    );
  }
}
function validateOptionalFinalityEvidence(proof) {
  const finalityEvidence = proof.finalityEvidence;
  if (finalityEvidence == null) return;
  if (!isRecord3(finalityEvidence)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence must be an object when present"
    );
  }
  assertSupported(
    finalityEvidence["schema"],
    NO_EVM_FINALITY_EVIDENCE_SCHEMA,
    "finalityEvidence.schema",
    "unsupported_schema"
  );
  assertSupported(
    finalityEvidence["source"],
    NO_EVM_FINALITY_EVIDENCE_SOURCE,
    "finalityEvidence.source",
    "unsupported_schema"
  );
  assertUint32(finalityEvidence["round"], "finalityEvidence.round");
  const certificate = finalityEvidence["certificate"];
  if (!isRecord3(certificate)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.certificate must be an object"
    );
  }
  assertUint32(certificate["round"], "finalityEvidence.certificate.round");
  if (certificate["round"] !== finalityEvidence["round"]) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.certificate.round must match finalityEvidence.round"
    );
  }
  decodeHexBytes(certificate["signature"], "finalityEvidence.certificate.signature");
  decodeHexBytes(certificate["signersBitmap"], "finalityEvidence.certificate.signersBitmap");
  const signerIndices = certificate["signerIndices"];
  if (!Array.isArray(signerIndices)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.certificate.signerIndices must be an array"
    );
  }
  signerIndices.forEach((index, signerIndex) => {
    assertUint32(index, `finalityEvidence.certificate.signerIndices[${signerIndex}]`);
    if (index > 65535) {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        `finalityEvidence.certificate.signerIndices[${signerIndex}] must fit u16`
      );
    }
  });
  assertUint32(certificate["signerCount"], "finalityEvidence.certificate.signerCount");
  if (certificate["signerCount"] > 65535) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.certificate.signerCount must fit u16"
    );
  }
  if (certificate["signerCount"] !== signerIndices.length) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.certificate.signerCount must match signerIndices length"
    );
  }
}
function getCompactInclusionProof(proof) {
  const compactProof = proof.compactInclusionProof;
  if (!isRecord3(compactProof)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "compactInclusion proof requires compactInclusionProof"
    );
  }
  return compactProof;
}
function getTargetReceiptBytes(proof) {
  const value = proof.targetReceiptBytes;
  if (typeof value !== "string") {
    throw new NoEvmReceiptProofError(
      "missing_target_receipt_bytes",
      "compactInclusion proof requires targetReceiptBytes"
    );
  }
  return value;
}
function getProofKind(proof) {
  return proof.proofKind === void 0 ? "boundedCacheTranscript" : String(proof.proofKind);
}
function getHistorySource(proof) {
  return getOptionalHistorySource(proof) ?? "legacyUnspecified";
}
function getOptionalHistorySource(proof) {
  const value = proof.historySource;
  return value === void 0 ? void 0 : String(value);
}
function assertSupportedRootAlgorithm(actual) {
  if (actual !== NO_EVM_RECEIPT_ROOT_ALGORITHM && actual !== NO_EVM_LEGACY_RECEIPT_ROOT_ALGORITHM && actual !== NO_EVM_COMPACT_INCLUSION_TREE_ALGORITHM) {
    throw new NoEvmReceiptProofError(
      "unsupported_root_algorithm",
      `unsupported no-EVM receipt proof rootAlgorithm: ${actual}`
    );
  }
}
function assertSupported(actual, expected, field2, code) {
  if (actual !== expected) {
    throw new NoEvmReceiptProofError(code, `unsupported no-EVM receipt proof ${field2}: ${actual}`);
  }
}
function assertUint32(value, field2) {
  if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
    throw new NoEvmReceiptProofError("invalid_uint32", `${field2} must be a uint32`);
  }
}
function computeNoEvmReceiptsRootBytes(receipts) {
  if (receipts.length > UINT32_MAX) {
    throw new NoEvmReceiptProofError(
      "too_many_receipts",
      `receiptTranscript has ${receipts.length} receipts, exceeding u32::MAX`
    );
  }
  if (receipts.length === 0) {
    const preimage = new Uint8Array(EMPTY_ROOT_DOMAIN_BYTES.length + 4);
    const view = new DataView(preimage.buffer);
    preimage.set(EMPTY_ROOT_DOMAIN_BYTES, 0);
    view.setUint32(EMPTY_ROOT_DOMAIN_BYTES.length, 0, true);
    return keccak_256(preimage);
  }
  let level = receipts.map((receipt, index) => computeNoEvmReceiptLeafHashBytes(receipt, index));
  while (level.length > 1) {
    const nextLevel = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] ?? left;
      nextLevel.push(computeNoEvmReceiptNodeHashBytes(left, right));
    }
    level = nextLevel;
  }
  return level[0];
}
function computeNoEvmReceiptLeafHashBytes(receiptBytes, txIndex) {
  assertUint32(txIndex, "txIndex");
  if (receiptBytes.length > UINT32_MAX) {
    throw new NoEvmReceiptProofError(
      "receipt_too_large",
      `receiptTranscript[${txIndex}] has ${receiptBytes.length} bytes, exceeding u32::MAX`
    );
  }
  const preimage = new Uint8Array(LEAF_DOMAIN_BYTES.length + 8 + receiptBytes.length);
  const view = new DataView(preimage.buffer);
  let offset = 0;
  preimage.set(LEAF_DOMAIN_BYTES, offset);
  offset += LEAF_DOMAIN_BYTES.length;
  view.setUint32(offset, txIndex, true);
  offset += 4;
  view.setUint32(offset, receiptBytes.length, true);
  offset += 4;
  preimage.set(receiptBytes, offset);
  return keccak_256(preimage);
}
function computeNoEvmReceiptNodeHashBytes(left, right) {
  assertHashBytes(left, "left receipt node hash");
  assertHashBytes(right, "right receipt node hash");
  const preimage = new Uint8Array(NODE_DOMAIN_BYTES.length + HASH_BYTE_LENGTH * 2);
  let offset = 0;
  preimage.set(NODE_DOMAIN_BYTES, offset);
  offset += NODE_DOMAIN_BYTES.length;
  preimage.set(left, offset);
  offset += HASH_BYTE_LENGTH;
  preimage.set(right, offset);
  return keccak_256(preimage);
}
function computeCompactRootFromPath(leafHash, siblingHashes, pathSides) {
  let current = leafHash;
  for (let index = 0; index < siblingHashes.length; index++) {
    const sibling = siblingHashes[index];
    current = pathSides[index] ? computeNoEvmReceiptNodeHashBytes(sibling, current) : computeNoEvmReceiptNodeHashBytes(current, sibling);
  }
  return current;
}
function decodeHash(value, field2) {
  const bytes = decodeHexBytes(value, field2);
  if (bytes.length !== HASH_BYTE_LENGTH) {
    throw new NoEvmReceiptProofError(
      "invalid_hash_length",
      `${field2} must be 32 bytes, got ${bytes.length}`
    );
  }
  return bytes;
}
function decodeHexBytes(value, field2) {
  if (typeof value !== "string" || !(value.startsWith("0x") || value.startsWith("0X"))) {
    throw new NoEvmReceiptProofError("invalid_hex", `${field2} must be 0x-prefixed even-length hex`);
  }
  const body = value.slice(2);
  if (body.length % 2 !== 0 || !HEX_RE.test(body)) {
    throw new NoEvmReceiptProofError("invalid_hex", `${field2} must be 0x-prefixed even-length hex`);
  }
  const out = new Uint8Array(body.length / 2);
  for (let index = 0; index < out.length; index++) {
    out[index] = Number.parseInt(body.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}
function assertHashBytes(value, field2) {
  if (value.length !== HASH_BYTE_LENGTH) {
    throw new NoEvmReceiptProofError(
      "invalid_hash_length",
      `${field2} must be 32 bytes, got ${value.length}`
    );
  }
}
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) {
    diff |= a[index] ^ b[index];
  }
  return diff === 0;
}
function bytesToHex5(bytes) {
  let out = "0x";
  for (let index = 0; index < bytes.length; index++) {
    out += bytes[index].toString(16).padStart(2, "0");
  }
  return out;
}

// src/delegation.ts
var DELEGATION_SELECTORS = {
  completeRedemption: "0x26169d0a"
};
var DELEGATION_REVERT_TAGS = {
  redemptionQueueFull: "0x020e",
  redemptionTicketNotFound: "0x020f",
  redemptionNotMature: "0x0210",
  redemptionPrincipalUnavailable: "0x0211"
};
var DelegationPrecompileError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "DelegationPrecompileError";
  }
};
function delegationAddressHex() {
  return PRECOMPILE_ADDRESSES.DELEGATION.toLowerCase();
}
function encodeCompleteRedemptionCalldata(index) {
  return bytesToHex6(
    concatBytes5(
      hexToBytes5(DELEGATION_SELECTORS.completeRedemption),
      uint64Word2(index, "index")
    )
  );
}
function isRedemptionPrincipalUnavailableRevert(data) {
  return bytesToHex6(toBytes3(data)).toLowerCase() === DELEGATION_REVERT_TAGS.redemptionPrincipalUnavailable;
}
function uint64Word2(value, name) {
  const n = toBigint2(value, name);
  if (n < 0n || n > 0xffffffffffffffffn) {
    throw new DelegationPrecompileError(`${name} must fit uint64`);
  }
  const out = new Uint8Array(32);
  let rest = n;
  for (let i = 31; i >= 24; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
function toBigint2(value, name) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
      throw new DelegationPrecompileError(`${name} must be a safe integer`);
    }
    return BigInt(value);
  }
  if (!/^(0x[0-9a-fA-F]+|[0-9]+)$/.test(value)) {
    throw new DelegationPrecompileError(`${name} must be an integer string`);
  }
  return BigInt(value);
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
    throw new DelegationPrecompileError("invalid hex bytes");
  }
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
function bytesToHex6(bytes) {
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
  return concatBytes6(
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
  return bytesToHex7(
    concatBytes6(
      hexToBytes6(SPENDING_POLICY_SELECTORS.setPolicy),
      encodePolicyWords(normalized)
    )
  );
}
function encodeSetPolicyClaimCalldata(args, subAccountPubkey, subAccountSig) {
  const normalized = normalizeArgs(args);
  const pubkey = toBytes4(subAccountPubkey);
  const sig = toBytes4(subAccountSig);
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
  return bytesToHex7(
    concatBytes6(
      hexToBytes6(SPENDING_POLICY_SELECTORS.setPolicyClaim),
      encodePolicyWords(normalized),
      pubkey,
      sig
    )
  );
}
function encodeClaimPolicyByAddressCalldata(args, subAccountSig) {
  const normalized = normalizeArgs(args);
  const sig = toBytes4(subAccountSig);
  if (sig.length !== ML_DSA_65_SIGNATURE_LEN2) {
    throw new SpendingPolicyError(
      `subAccountSig must be ${ML_DSA_65_SIGNATURE_LEN2} bytes, got ${sig.length}`
    );
  }
  return bytesToHex7(
    concatBytes6(
      hexToBytes6(SPENDING_POLICY_SELECTORS.claimPolicyByAddress),
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
    dailyCapLythoshi: toBigint3(args.dailyCapLythoshi, "dailyCapLythoshi"),
    perTxCapLythoshi: toBigint3(args.perTxCapLythoshi, "perTxCapLythoshi"),
    allowRoot: expectLength4(toBytes4(args.allowRoot), 32, "allowRoot"),
    denyRoot: expectLength4(toBytes4(args.denyRoot), 32, "denyRoot")
  };
}
function encodePolicyWords(args) {
  return concatBytes6(
    encodeAddressWord(args.subAccount),
    encodeAddressWord(args.principal),
    encodeUint128Word(args.dailyCapLythoshi),
    encodeUint128Word(args.perTxCapLythoshi),
    args.allowRoot,
    args.denyRoot
  );
}
function encodeSingleAddressCall(selector, address) {
  return bytesToHex7(concatBytes6(hexToBytes6(selector), encodeAddressWord(toAddressBytes(address))));
}
function encodeAddressWord(address) {
  return concatBytes6(new Uint8Array(12), address);
}
function encodeUint128Word(value) {
  return concatBytes6(new Uint8Array(16), uint128Bytes(value, "uint128"));
}
function toAddressBytes(value) {
  if (typeof value === "string") {
    return hexToAddressBytes(value);
  }
  return expectLength4(value instanceof Uint8Array ? value : Uint8Array.from(value), 20, "address");
}
function toBytes4(value) {
  if (typeof value === "string") {
    return hexToBytes6(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes6(hex) {
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
function bytesToHex7(bytes) {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function concatBytes6(...parts) {
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
    throw new SpendingPolicyError(`${name} must be ${len} bytes`);
  }
  return value;
}
function toBigint3(value, name) {
  const n = typeof value === "bigint" ? value : BigInt(value);
  if (n < 0n) {
    throw new SpendingPolicyError(`${name} must be non-negative`);
  }
  return n;
}
function uint64Bytes(value, name) {
  const n = toBigint3(value, name);
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
  const bytes = toBytes5(pubkey);
  if (bytes.length !== PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN) {
    throw new PubkeyRegistryError(
      `pubkey must be ${PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN} bytes, got ${bytes.length}`
    );
  }
  return bytesToHex8(
    concatBytes7(
      hexToBytes7(PUBKEY_REGISTRY_SELECTORS.registerPubkey),
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
  const bytes = toBytes5(data);
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
  const bytes = toBytes5(data);
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
  return bytesToHex8(concatBytes7(hexToBytes7(selector), addressWord(toAddressBytes2(address))));
}
function addressWord(address) {
  return concatBytes7(new Uint8Array(12), address);
}
function toAddressBytes2(value) {
  if (typeof value === "string") {
    return hexToAddressBytes(value);
  }
  return expectLength5(value instanceof Uint8Array ? value : Uint8Array.from(value), 20, "address");
}
function toBytes5(value) {
  if (typeof value === "string") {
    return hexToBytes7(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes7(hex) {
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
function bytesToHex8(bytes) {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function concatBytes7(...parts) {
  const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function expectLength5(value, len, name) {
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
var CLOB_MARKET_ID_DOMAIN_TAG = 193;
var NATIVE_MARKET_MODULE_ADDRESS_BYTES = "0x4d41524b45545f4e41544956455f4d4f445f5631";
var NATIVE_MARKET_MODULE_ADDRESS = addressToTypedBech32(
  "systemModule",
  NATIVE_MARKET_MODULE_ADDRESS_BYTES
);
var CLOB_SELECTORS = {
  /**
   * `placeLimitOrder(bytes32,bytes32,uint8,uint256,uint256,uint64)`
   *
   * Args: `baseTokenId, quoteTokenId, side, price, amount, expiresAtBlock`.
   */
  placeLimitOrder: "0x2468786f",
  /**
   * `placeMarketOrder(bytes32,bytes32,uint8,uint256,uint16)`
   *
   * Args: `baseTokenId, quoteTokenId, side, quantity, maxSlippageBps`.
   */
  placeMarketOrder: "0xb9b1fa86",
  /**
   * `placeMarketOrderEx(bytes32,bytes32,uint8,uint256,uint16,uint8)`
   *
   * Args: `baseTokenId, quoteTokenId, side, quantity, maxSlippageBps, mode`.
   */
  placeMarketOrderEx: "0xa6f092f0",
  /** `cancelOrder(bytes32)` */
  cancelOrder: "0x7489ec23"
};
var MarketActionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MarketActionError";
  }
};
function clobAddressHex() {
  return PRECOMPILE_ADDRESSES.CLOB.toLowerCase();
}
function deriveClobMarketId(baseTokenId, quoteTokenId) {
  const base = bytes32FromHex(baseTokenId, "baseTokenId");
  const quote = bytes32FromHex(quoteTokenId, "quoteTokenId");
  return bytesToHex2(keccak_256(concatBytes2(new Uint8Array([CLOB_MARKET_ID_DOMAIN_TAG]), base, quote)));
}
function encodePlaceLimitOrderCalldata(args) {
  const normalized = normalizePlaceSpotLimitOrderArgs(args);
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(CLOB_SELECTORS.placeLimitOrder, "placeLimitOrder selector"),
      normalized.baseTokenId,
      normalized.quoteTokenId,
      uint8Word2(normalized.side),
      uint256Word2(normalized.price, "price"),
      uint256Word2(normalized.quantity, "quantity"),
      uint64Word3(normalized.expiryBlock, "expiryBlock")
    )
  );
}
function encodePlaceMarketOrderCalldata(args) {
  const normalized = normalizePlaceSpotMarketOrderArgs(args);
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(CLOB_SELECTORS.placeMarketOrder, "placeMarketOrder selector"),
      normalized.baseTokenId,
      normalized.quoteTokenId,
      uint8Word2(normalized.side),
      uint256Word2(normalized.quantity, "quantity"),
      uint16Word(normalized.maxSlippageBps, "maxSlippageBps")
    )
  );
}
function encodePlaceMarketOrderExCalldata(args) {
  const normalized = normalizePlaceSpotMarketOrderExArgs(args);
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(CLOB_SELECTORS.placeMarketOrderEx, "placeMarketOrderEx selector"),
      normalized.baseTokenId,
      normalized.quoteTokenId,
      uint8Word2(normalized.side),
      uint256Word2(normalized.quantity, "quantity"),
      uint16Word(normalized.maxSlippageBps, "maxSlippageBps"),
      uint8Word2(normalized.mode)
    )
  );
}
function encodeCancelOrderCalldata(args) {
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(CLOB_SELECTORS.cancelOrder, "cancelOrder selector"),
      bytes32FromHex(args.orderId, "orderId")
    )
  );
}
function encodeNativeSpotLimitOrderCall(args) {
  const w = new BincodeWriter();
  w.enumVariant(0);
  w.enumVariant(1);
  w.rawBytes(bytes32FromHex(args.marketId, "marketId"));
  monoAddressInto(w, args.owner, "owner");
  w.u64(uint64(args.nonce, "nonce"));
  w.enumVariant(normalizeSide(args.side));
  w.u128(positiveU128Decimal(args.price, "price"));
  w.u128(positiveU128Decimal(args.quantity, "quantity"));
  w.u64(uint64(args.expiresAtBlock, "expiresAtBlock"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeSpotCancelOrderCall(args) {
  const w = new BincodeWriter();
  w.enumVariant(0);
  w.enumVariant(4);
  w.rawBytes(bytes32FromHex(args.orderId, "orderId"));
  monoAddressInto(w, args.caller, "caller");
  return bytesToHex2(w.toBytes());
}
function encodeNativeNftCreateListingCall(args) {
  const w = new BincodeWriter();
  w.enumVariant(1);
  w.enumVariant(0);
  monoAddressInto(w, args.seller, "seller");
  w.u64(uint64(args.nonce, "nonce"));
  w.enumVariant(normalizeNftAssetStandard(args.standard));
  w.rawBytes(bytes32FromHex(args.collectionId, "collectionId"));
  w.rawBytes(bytes32FromHex(args.tokenId, "tokenId"));
  w.u128(positiveU128Decimal(args.quantity, "quantity"));
  w.rawBytes(bytes32FromHex(args.paymentAsset, "paymentAsset"));
  w.u128(positiveU128Decimal(args.price, "price"));
  listingKindInto(w, args.kind);
  w.u64(uint64(args.expiresAtBlock, "expiresAtBlock"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeNftBuyListingCall(args) {
  const w = new BincodeWriter();
  w.enumVariant(1);
  w.enumVariant(1);
  w.rawBytes(bytes32FromHex(args.listingId, "listingId"));
  monoAddressInto(w, args.buyer, "buyer");
  w.u64(uint64(args.currentBlock, "currentBlock"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeNftCancelListingCall(args) {
  const w = new BincodeWriter();
  w.enumVariant(1);
  w.enumVariant(2);
  w.rawBytes(bytes32FromHex(args.listingId, "listingId"));
  monoAddressInto(w, args.caller, "caller");
  return bytesToHex2(w.toBytes());
}
function encodeNativeNftPlaceAuctionBidCall(args) {
  const w = new BincodeWriter();
  w.enumVariant(1);
  w.enumVariant(5);
  w.rawBytes(bytes32FromHex(args.listingId, "listingId"));
  monoAddressInto(w, args.bidder, "bidder");
  w.u128(positiveU128Decimal(args.amount, "amount"));
  w.u64(uint64(args.currentBlock, "currentBlock"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeNftSettleAuctionCall(args) {
  const w = new BincodeWriter();
  w.enumVariant(1);
  w.enumVariant(6);
  w.rawBytes(bytes32FromHex(args.listingId, "listingId"));
  w.u64(uint64(args.currentBlock, "currentBlock"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeNftSweepExpiredListingsCall(args) {
  const listingIds = normalizeListingIds(args.listingIds, "listingIds");
  const w = new BincodeWriter();
  w.enumVariant(1);
  w.enumVariant(3);
  w.u64(BigInt(listingIds.length));
  for (const listingId of listingIds) {
    w.rawBytes(listingId);
  }
  w.u64(uint64(args.currentBlock, "currentBlock"));
  return bytesToHex2(w.toBytes());
}
function buildNativeMarketModuleCallEnvelope(input, maxCycles) {
  return {
    module: "market",
    call: {
      to: NATIVE_MARKET_MODULE_ADDRESS,
      input: normalizeHexBytes(input, "input"),
      valueLythoshi: "0",
      maxCycles: uint64(maxCycles, "maxCycles").toString(10)
    }
  };
}
function encodeNativeMarketModuleForwarderInput(envelope) {
  if (envelope.module !== "market") {
    throw new MarketActionError("native market forwarder envelope module must be 'market'");
  }
  if (!isNativeMarketModuleAddress(envelope.call.to)) {
    throw new MarketActionError("native market forwarder call target must be the market system module");
  }
  if (envelope.call.valueLythoshi !== "0") {
    throw new MarketActionError("native market forwarder call valueLythoshi must be 0");
  }
  const payload = hexToBytes2(normalizeHexBytes(envelope.call.input, "input"), "input");
  const maxCycles = uint64(envelope.call.maxCycles, "maxCycles");
  const w = new BincodeWriter();
  w.enumVariant(7);
  w.enumVariant(NATIVE_MARKET_ADDRESS_KIND_VARIANTS.systemModule);
  w.rawBytes(hexToBytes2(NATIVE_MARKET_MODULE_ADDRESS_BYTES, "native market module address"));
  w.bytes(payload);
  w.u128(0n);
  w.u64(maxCycles);
  const input = bytesToHex2(w.toBytes());
  return { input, requestBytes: (input.length - 2) / 2 };
}
function buildNativeSpotLimitOrderForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotLimitOrderModuleCall(args, maxCycles));
}
function buildNativeSpotCancelOrderForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotCancelOrderModuleCall(args, maxCycles));
}
function buildNativeNftCreateListingForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftCreateListingModuleCall(args, maxCycles));
}
function buildNativeNftBuyListingForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftBuyListingModuleCall(args, maxCycles));
}
function buildNativeNftCancelListingForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftCancelListingModuleCall(args, maxCycles));
}
function buildNativeNftPlaceAuctionBidForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftPlaceAuctionBidModuleCall(args, maxCycles));
}
function buildNativeNftSettleAuctionForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftSettleAuctionModuleCall(args, maxCycles));
}
function buildNativeNftSweepExpiredListingsForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeNftSweepExpiredListingsModuleCall(args, maxCycles));
}
function buildNativeSpotLimitOrderModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotLimitOrderCall(args), maxCycles);
}
function buildNativeSpotCancelOrderModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotCancelOrderCall(args), maxCycles);
}
function buildNativeNftCreateListingModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftCreateListingCall(args), maxCycles);
}
function buildNativeNftBuyListingModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftBuyListingCall(args), maxCycles);
}
function buildNativeNftCancelListingModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftCancelListingCall(args), maxCycles);
}
function buildNativeNftPlaceAuctionBidModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftPlaceAuctionBidCall(args), maxCycles);
}
function buildNativeNftSettleAuctionModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftSettleAuctionCall(args), maxCycles);
}
function buildNativeNftSweepExpiredListingsModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeNftSweepExpiredListingsCall(args), maxCycles);
}
function buildPlaceSpotLimitOrderPlan(args) {
  return {
    method: "eth_sendTransaction",
    params: [
      {
        to: PRECOMPILE_ADDRESSES.CLOB,
        value: "0x0",
        data: encodePlaceLimitOrderCalldata(args)
      }
    ],
    mempoolClass: MempoolClass.CLOBOp
  };
}
function buildPlaceSpotMarketOrderPlan(args) {
  return {
    method: "eth_sendTransaction",
    params: [
      {
        to: PRECOMPILE_ADDRESSES.CLOB,
        value: "0x0",
        data: encodePlaceMarketOrderCalldata(args)
      }
    ],
    mempoolClass: MempoolClass.CLOBOp
  };
}
function buildPlaceSpotMarketOrderExPlan(args) {
  return {
    method: "eth_sendTransaction",
    params: [
      {
        to: PRECOMPILE_ADDRESSES.CLOB,
        value: "0x0",
        data: encodePlaceMarketOrderExCalldata(args)
      }
    ],
    mempoolClass: MempoolClass.CLOBOp
  };
}
function buildCancelSpotOrderPlan(args) {
  return {
    method: "eth_sendTransaction",
    params: [
      {
        to: PRECOMPILE_ADDRESSES.CLOB,
        value: "0x0",
        data: encodeCancelOrderCalldata(args)
      }
    ],
    mempoolClass: MempoolClass.CLOBOp
  };
}
var NATIVE_MARKET_ADDRESS_KIND_VARIANTS = {
  user: 0,
  smartAccount: 1,
  contract: 2,
  cluster: 3,
  multisig: 4,
  systemModule: 5
};
function normalizePlaceSpotLimitOrderArgs(args) {
  const normalized = normalizeSpotMarketArgs(args);
  return {
    ...normalized,
    price: positiveDecimal(args.price, "price"),
    expiryBlock: uint64(args.expiryBlock ?? 0n, "expiryBlock")
  };
}
function normalizePlaceSpotMarketOrderArgs(args) {
  const normalized = normalizeSpotMarketArgs(args);
  return {
    ...normalized,
    maxSlippageBps: uint16Bps(args.maxSlippageBps, "maxSlippageBps")
  };
}
function normalizePlaceSpotMarketOrderExArgs(args) {
  return {
    ...normalizePlaceSpotMarketOrderArgs(args),
    mode: normalizeMarketOrderMode(args.mode)
  };
}
function normalizeSpotMarketArgs(args) {
  const marketId = normalizeBytes32Hex(args.marketId, "marketId");
  const expectedMarketId = deriveClobMarketId(args.baseTokenId, args.quoteTokenId);
  if (marketId !== expectedMarketId) {
    throw new MarketActionError("marketId must match baseTokenId and quoteTokenId");
  }
  return {
    marketId,
    baseTokenId: bytes32FromHex(args.baseTokenId, "baseTokenId"),
    quoteTokenId: bytes32FromHex(args.quoteTokenId, "quoteTokenId"),
    side: normalizeSide(args.side),
    quantity: positiveDecimal(args.quantity, "quantity")
  };
}
function normalizeBytes32Hex(value, name) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new MarketActionError(`${name} must be a 32-byte 0x-prefixed hex string`);
  }
  return value.toLowerCase();
}
function bytes32FromHex(value, name) {
  normalizeBytes32Hex(value, name);
  return hexToBytes2(value, name);
}
function normalizeSide(side) {
  if (side === "buy") return 0;
  if (side === "sell") return 1;
  throw new MarketActionError("side must be 'buy' or 'sell'");
}
function normalizeMarketOrderMode(mode) {
  if (mode === "fill-or-refund") return 0;
  if (mode === "fill-or-rest-at-cap") return 1;
  throw new MarketActionError("mode must be 'fill-or-refund' or 'fill-or-rest-at-cap'");
}
function normalizeNftAssetStandard(standard) {
  if (standard === "mrc721") return 0;
  if (standard === "mrc1155") return 1;
  throw new MarketActionError("standard must be 'mrc721' or 'mrc1155'");
}
function listingKindInto(w, kind) {
  if (kind === "fixed-price") {
    w.enumVariant(0);
    return;
  }
  if (typeof kind === "object" && kind !== null && "english" in kind) {
    const english = kind.english;
    if (typeof english !== "object" || english === null) {
      throw new MarketActionError("kind.english must be an object");
    }
    w.enumVariant(1);
    w.u128(positiveU128Decimal(english.reserve, "kind.english.reserve"));
    w.u64(uint64(english.endBlock, "kind.english.endBlock"));
    w.u16(Number(uint16Bps(english.minBidIncrementBps, "kind.english.minBidIncrementBps")));
    return;
  }
  throw new MarketActionError("kind must be 'fixed-price' or an english auction");
}
function normalizeListingIds(listingIds, name) {
  if (!Array.isArray(listingIds)) {
    throw new MarketActionError(`${name} must be an array`);
  }
  if (listingIds.length === 0 || listingIds.length > 64) {
    throw new MarketActionError(`${name} must contain 1 to 64 listing ids`);
  }
  return listingIds.map((listingId, i) => bytes32FromHex(listingId, `${name}[${i}]`));
}
function positiveDecimal(value, name) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new MarketActionError(`${name} must be an integer decimal string`);
  }
  const n = BigInt(value);
  if (n <= 0n) {
    throw new MarketActionError(`${name} must be positive`);
  }
  return n;
}
function uint16Bps(value, name) {
  const n = uint64(value, name);
  if (n >= 10000n) {
    throw new MarketActionError(`${name} must be less than 10000`);
  }
  return n;
}
function uint64(value, name) {
  let n;
  if (typeof value === "bigint") {
    n = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new MarketActionError(`${name} must be a safe integer`);
    }
    n = BigInt(value);
  } else if (/^(0|[1-9][0-9]*|0x[0-9a-fA-F]+)$/.test(value)) {
    n = BigInt(value);
  } else {
    throw new MarketActionError(`${name} must be a nonnegative integer`);
  }
  if (n < 0n || n > 0xffffffffffffffffn) {
    throw new MarketActionError(`${name} must fit uint64`);
  }
  return n;
}
function positiveU128Decimal(value, name) {
  const n = positiveDecimal(value, name);
  if (n >= 1n << 128n) {
    throw new MarketActionError(`${name} must fit uint128`);
  }
  return n;
}
function normalizeHexBytes(value, name) {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new MarketActionError(`${name} must be 0x-prefixed hex bytes`);
  }
  try {
    hexToBytes2(value, name);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new MarketActionError(`${name} must be 0x-prefixed hex bytes${detail}`);
  }
  return value.toLowerCase();
}
function isNativeMarketModuleAddress(value) {
  const normalized = value.toLowerCase();
  return normalized === NATIVE_MARKET_MODULE_ADDRESS || normalized === NATIVE_MARKET_MODULE_ADDRESS_BYTES;
}
function monoAddressInto(w, input, name) {
  const { kind, bytes } = normalizeNativeMarketAddress(input, name);
  w.enumVariant(NATIVE_MARKET_ADDRESS_KIND_VARIANTS[kind]);
  w.rawBytes(bytes);
}
function normalizeNativeMarketAddress(input, name) {
  if (typeof input === "string") {
    return normalizeNativeMarketAddressString(input, void 0, name);
  }
  if (isAddressByteInput(input)) {
    return { kind: "user", bytes: expectAddressBytes(input, name) };
  }
  if (typeof input === "object" && input !== null) {
    const kind = input.kind ?? "user";
    if (!(kind in NATIVE_MARKET_ADDRESS_KIND_VARIANTS)) {
      throw new MarketActionError(`${name}.kind is not a supported native address kind`);
    }
    const address = input.address;
    if (typeof address === "string") {
      return normalizeNativeMarketAddressString(address, kind, name);
    }
    return { kind, bytes: expectAddressBytes(address, name) };
  }
  throw new MarketActionError(`${name} must be a 20-byte address`);
}
function isAddressByteInput(input) {
  return input instanceof Uint8Array || Array.isArray(input);
}
function normalizeNativeMarketAddressString(address, expectedKind, name) {
  try {
    if (address.startsWith("0x") || address.startsWith("0X")) {
      return { kind: expectedKind ?? "user", bytes: hexToAddressBytes(address) };
    }
    const parsed = typedBech32ToAddress(address, expectedKind);
    return { kind: parsed.kind, bytes: parsed.bytes };
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new MarketActionError(`${name} must be a 20-byte hex or typed bech32m address${detail}`);
  }
}
function expectAddressBytes(value, name) {
  if (value.length !== 20) {
    throw new MarketActionError(`${name} must be a 20-byte address`);
  }
  for (const byte of value) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new MarketActionError(`${name} must contain bytes`);
    }
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function uint8Word2(value) {
  const out = new Uint8Array(32);
  out[31] = value;
  return out;
}
function uint64Word3(value, name) {
  if (value < 0n || value > 0xffffffffffffffffn) {
    throw new MarketActionError(`${name} must fit uint64`);
  }
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 31; i >= 24; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
function uint16Word(value, name) {
  if (value < 0n || value > 0xffffn) {
    throw new MarketActionError(`${name} must fit uint16`);
  }
  const out = new Uint8Array(32);
  out[30] = Number(value >> 8n & 0xffn);
  out[31] = Number(value & 0xffn);
  return out;
}
function uint256Word2(value, name) {
  if (value < 0n || value >= 1n << 256n) {
    throw new MarketActionError(`${name} must fit uint256`);
  }
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

// src/agent-actions.ts
var NATIVE_AGENT_MODULE_ADDRESS_BYTES = "0x4147454e545f4e41544956455f4d4f445f563031";
var NATIVE_AGENT_MODULE_ADDRESS = addressToTypedBech32(
  "systemModule",
  NATIVE_AGENT_MODULE_ADDRESS_BYTES
);
var AgentActionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "AgentActionError";
  }
};
function encodeNativeAgentRegisterIssuerCall(args) {
  const w = agentCallWriter(0, 0);
  monoAddressInto2(w, args.issuer, "issuer");
  w.u64(uint642(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex2(args.metadataHash, "metadataHash"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentIssuerGetCall(issuerId) {
  const w = agentCallWriter(0, 1);
  w.rawBytes(bytes32FromHex2(issuerId, "issuerId"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentIssueAttestationCall(args) {
  const w = agentCallWriter(1, 0);
  w.rawBytes(bytes32FromHex2(args.issuerId, "issuerId"));
  monoAddressInto2(w, args.issuer, "issuer");
  monoAddressInto2(w, args.subject, "subject");
  w.u64(uint642(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex2(args.schemaHash, "schemaHash"));
  w.rawBytes(bytes32FromHex2(args.payloadHash, "payloadHash"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentRevokeAttestationCall(args) {
  const w = agentCallWriter(1, 1);
  w.rawBytes(bytes32FromHex2(args.attestationId, "attestationId"));
  monoAddressInto2(w, args.issuer, "issuer");
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentAttestationGetCall(attestationId) {
  const w = agentCallWriter(1, 2);
  w.rawBytes(bytes32FromHex2(attestationId, "attestationId"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentGrantConsentCall(args) {
  const w = agentCallWriter(2, 0);
  monoAddressInto2(w, args.subject, "subject");
  monoAddressInto2(w, args.grantee, "grantee");
  w.u64(uint642(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex2(args.scopeHash, "scopeHash"));
  w.u64(uint642(args.expiresAt, "expiresAt"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentRevokeConsentCall(args) {
  const w = agentCallWriter(2, 1);
  w.rawBytes(bytes32FromHex2(args.consentId, "consentId"));
  monoAddressInto2(w, args.subject, "subject");
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentConsentGetCall(consentId) {
  const w = agentCallWriter(2, 2);
  w.rawBytes(bytes32FromHex2(consentId, "consentId"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentListServiceCall(args) {
  const w = agentCallWriter(3, 0);
  monoAddressInto2(w, args.provider, "provider");
  w.u64(uint642(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex2(args.categoryHash, "categoryHash"));
  w.rawBytes(bytes32FromHex2(args.metadataHash, "metadataHash"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentDeactivateServiceCall(args) {
  const w = agentCallWriter(3, 1);
  w.rawBytes(bytes32FromHex2(args.serviceId, "serviceId"));
  monoAddressInto2(w, args.provider, "provider");
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentServiceGetCall(serviceId) {
  const w = agentCallWriter(3, 2);
  w.rawBytes(bytes32FromHex2(serviceId, "serviceId"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentSetAvailabilityCall(args) {
  const w = agentCallWriter(4, 0);
  monoAddressInto2(w, args.provider, "provider");
  w.u32(uint32(args.maxConcurrent, "maxConcurrent"));
  w.u8(boolByte(args.paused, "paused"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentOpenAvailabilityCall(args) {
  const w = agentCallWriter(4, 1);
  monoAddressInto2(w, args.provider, "provider");
  monoAddressInto2(w, args.consumer, "consumer");
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentCloseAvailabilityCall(args) {
  const w = agentCallWriter(4, 2);
  monoAddressInto2(w, args.provider, "provider");
  monoAddressInto2(w, args.consumer, "consumer");
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentAvailabilityGetCall(provider) {
  const w = agentCallWriter(4, 3);
  monoAddressInto2(w, provider, "provider");
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentRegisterArbiterCall(args) {
  const w = agentCallWriter(5, 0);
  monoAddressInto2(w, args.arbiter, "arbiter");
  w.u64(uint642(args.nonce, "nonce"));
  w.u16(uint16(args.tier, "tier"));
  w.rawBytes(bytes32FromHex2(args.metadataHash, "metadataHash"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentArbiterGetCall(arbiterId) {
  const w = agentCallWriter(5, 1);
  w.rawBytes(bytes32FromHex2(arbiterId, "arbiterId"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentSetSpendingPolicyCall(args) {
  const w = agentCallWriter(6, 0);
  monoAddressInto2(w, args.owner, "owner");
  monoAddressInto2(w, args.controller, "controller");
  w.u64(uint642(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex2(args.assetId, "assetId"));
  w.u128(positiveU128Decimal2(args.perActionLimit, "perActionLimit"));
  w.u128(positiveU128Decimal2(args.windowLimit, "windowLimit"));
  w.u64(uint642(args.windowSecs, "windowSecs"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentRecordPolicySpendCall(args) {
  const w = agentCallWriter(6, 1);
  w.rawBytes(bytes32FromHex2(args.policyId, "policyId"));
  monoAddressInto2(w, args.controller, "controller");
  w.u64(uint642(args.window, "window"));
  w.u128(positiveU128Decimal2(args.amount, "amount"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentSpendingPolicyGetCall(policyId) {
  const w = agentCallWriter(6, 2);
  w.rawBytes(bytes32FromHex2(policyId, "policyId"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentCreateEscrowCall(args) {
  const w = agentCallWriter(7, 0);
  monoAddressInto2(w, args.buyer, "buyer");
  monoAddressInto2(w, args.provider, "provider");
  monoAddressInto2(w, args.arbiter, "arbiter");
  w.u64(uint642(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex2(args.assetId, "assetId"));
  w.u128(positiveU128Decimal2(args.amount, "amount"));
  w.rawBytes(bytes32FromHex2(args.termsHash, "termsHash"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentCounterEscrowCall(args) {
  const w = agentCallWriter(7, 1);
  w.rawBytes(bytes32FromHex2(args.escrowId, "escrowId"));
  monoAddressInto2(w, args.actor, "actor");
  w.rawBytes(bytes32FromHex2(args.termsHash, "termsHash"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentAcceptEscrowCall(args) {
  const w = agentCallWriter(7, 2);
  escrowActorInto(w, args);
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentStartEscrowCall(args) {
  const w = agentCallWriter(7, 3);
  w.rawBytes(bytes32FromHex2(args.escrowId, "escrowId"));
  monoAddressInto2(w, args.provider, "provider");
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentSubmitEscrowCall(args) {
  const w = agentCallWriter(7, 4);
  w.rawBytes(bytes32FromHex2(args.escrowId, "escrowId"));
  monoAddressInto2(w, args.provider, "provider");
  w.rawBytes(bytes32FromHex2(args.payloadHash, "payloadHash"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentApproveEscrowCall(args) {
  const w = agentCallWriter(7, 5);
  escrowActorInto(w, args);
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentDisputeEscrowCall(args) {
  const w = agentCallWriter(7, 6);
  escrowActorInto(w, args);
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentCancelEscrowCall(args) {
  const w = agentCallWriter(7, 7);
  escrowActorInto(w, args);
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentResolveEscrowCall(args) {
  const w = agentCallWriter(7, 8);
  w.rawBytes(bytes32FromHex2(args.escrowId, "escrowId"));
  monoAddressInto2(w, args.actor, "actor");
  w.enumVariant(normalizeEscrowResolution(args.resolution));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentEscrowGetCall(escrowId) {
  const w = agentCallWriter(7, 9);
  w.rawBytes(bytes32FromHex2(escrowId, "escrowId"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentRecordReputationCall(args) {
  const w = agentCallWriter(8, 0);
  monoAddressInto2(w, args.reviewer, "reviewer");
  monoAddressInto2(w, args.subject, "subject");
  w.u32(uint32(args.categoryId, "categoryId"));
  reputationScoresInto(w, args.scores);
  w.rawBytes(bytes32FromHex2(args.payloadHash, "payloadHash"));
  return bytesToHex2(w.toBytes());
}
function encodeNativeAgentReputationGetCall(subject, categoryId) {
  const w = agentCallWriter(8, 1);
  monoAddressInto2(w, subject, "subject");
  w.u32(uint32(categoryId, "categoryId"));
  return bytesToHex2(w.toBytes());
}
function buildNativeAgentModuleCallEnvelope(input, maxCycles) {
  return {
    module: "agent",
    call: {
      to: NATIVE_AGENT_MODULE_ADDRESS,
      input: normalizeHexBytes2(input, "input"),
      valueLythoshi: "0",
      maxCycles: uint642(maxCycles, "maxCycles").toString(10)
    }
  };
}
function encodeNativeAgentModuleForwarderInput(envelope) {
  if (envelope.module !== "agent") {
    throw new AgentActionError("native agent forwarder envelope module must be 'agent'");
  }
  if (!isNativeAgentModuleAddress(envelope.call.to)) {
    throw new AgentActionError("native agent forwarder call target must be the agent system module");
  }
  if (envelope.call.valueLythoshi !== "0") {
    throw new AgentActionError("native agent forwarder call valueLythoshi must be 0");
  }
  const payload = hexToBytes2(normalizeHexBytes2(envelope.call.input, "input"), "input");
  const maxCycles = uint642(envelope.call.maxCycles, "maxCycles");
  const w = new BincodeWriter();
  w.enumVariant(7);
  w.enumVariant(NATIVE_AGENT_ADDRESS_KIND_VARIANTS.systemModule);
  w.rawBytes(hexToBytes2(NATIVE_AGENT_MODULE_ADDRESS_BYTES, "native agent module address"));
  w.bytes(payload);
  w.u128(0n);
  w.u64(maxCycles);
  const input = bytesToHex2(w.toBytes());
  return { input, requestBytes: (input.length - 2) / 2 };
}
function buildNativeAgentSetSpendingPolicyModuleCall(args, maxCycles) {
  return buildNativeAgentModuleCallEnvelope(encodeNativeAgentSetSpendingPolicyCall(args), maxCycles);
}
function buildNativeAgentSetSpendingPolicyForwarderInput(args, maxCycles) {
  return encodeNativeAgentModuleForwarderInput(buildNativeAgentSetSpendingPolicyModuleCall(args, maxCycles));
}
function buildNativeAgentCreateEscrowModuleCall(args, maxCycles) {
  return buildNativeAgentModuleCallEnvelope(encodeNativeAgentCreateEscrowCall(args), maxCycles);
}
function buildNativeAgentCreateEscrowForwarderInput(args, maxCycles) {
  return encodeNativeAgentModuleForwarderInput(buildNativeAgentCreateEscrowModuleCall(args, maxCycles));
}
function buildNativeAgentRecordReputationModuleCall(args, maxCycles) {
  return buildNativeAgentModuleCallEnvelope(encodeNativeAgentRecordReputationCall(args), maxCycles);
}
function buildNativeAgentRecordReputationForwarderInput(args, maxCycles) {
  return encodeNativeAgentModuleForwarderInput(buildNativeAgentRecordReputationModuleCall(args, maxCycles));
}
var NATIVE_AGENT_ADDRESS_KIND_VARIANTS = {
  user: 0,
  smartAccount: 1,
  contract: 2,
  cluster: 3,
  multisig: 4,
  systemModule: 5
};
function agentCallWriter(surfaceVariant, callVariant) {
  const w = new BincodeWriter();
  w.enumVariant(surfaceVariant);
  w.enumVariant(callVariant);
  return w;
}
function escrowActorInto(w, args) {
  w.rawBytes(bytes32FromHex2(args.escrowId, "escrowId"));
  monoAddressInto2(w, args.actor, "actor");
}
function reputationScoresInto(w, scores) {
  w.u8(score(scores.speed, "scores.speed"));
  w.u8(score(scores.quality, "scores.quality"));
  w.u8(score(scores.communication, "scores.communication"));
  w.u8(score(scores.accuracy, "scores.accuracy"));
}
function normalizeEscrowResolution(resolution) {
  if (resolution === "release-provider") return 0;
  if (resolution === "refund-buyer") return 1;
  throw new AgentActionError("resolution must be 'release-provider' or 'refund-buyer'");
}
function normalizeBytes32Hex2(value, name) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new AgentActionError(`${name} must be a 32-byte 0x-prefixed hex string`);
  }
  return value.toLowerCase();
}
function bytes32FromHex2(value, name) {
  normalizeBytes32Hex2(value, name);
  return hexToBytes2(value, name);
}
function positiveDecimal2(value, name) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new AgentActionError(`${name} must be an integer decimal string`);
  }
  const n = BigInt(value);
  if (n <= 0n) {
    throw new AgentActionError(`${name} must be positive`);
  }
  return n;
}
function uint642(value, name) {
  let n;
  if (typeof value === "bigint") {
    n = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new AgentActionError(`${name} must be a safe integer`);
    }
    n = BigInt(value);
  } else if (/^(0|[1-9][0-9]*|0x[0-9a-fA-F]+)$/.test(value)) {
    n = BigInt(value);
  } else {
    throw new AgentActionError(`${name} must be a nonnegative integer`);
  }
  if (n < 0n || n > 0xffffffffffffffffn) {
    throw new AgentActionError(`${name} must fit uint64`);
  }
  return n;
}
function uint32(value, name) {
  const n = uint642(value, name);
  if (n > 0xffffffffn) {
    throw new AgentActionError(`${name} must fit uint32`);
  }
  return Number(n);
}
function uint16(value, name) {
  const n = uint642(value, name);
  if (n > 0xffffn) {
    throw new AgentActionError(`${name} must fit uint16`);
  }
  return Number(n);
}
function score(value, name) {
  const n = uint642(value, name);
  if (n < 1n || n > 5n) {
    throw new AgentActionError(`${name} must be between 1 and 5`);
  }
  return Number(n);
}
function boolByte(value, name) {
  if (value === true) return 1;
  if (value === false) return 0;
  throw new AgentActionError(`${name} must be boolean`);
}
function positiveU128Decimal2(value, name) {
  const n = positiveDecimal2(value, name);
  if (n >= 1n << 128n) {
    throw new AgentActionError(`${name} must fit uint128`);
  }
  return n;
}
function normalizeHexBytes2(value, name) {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new AgentActionError(`${name} must be 0x-prefixed hex bytes`);
  }
  try {
    hexToBytes2(value, name);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new AgentActionError(`${name} must be 0x-prefixed hex bytes${detail}`);
  }
  return value.toLowerCase();
}
function isNativeAgentModuleAddress(value) {
  const normalized = value.toLowerCase();
  return normalized === NATIVE_AGENT_MODULE_ADDRESS || normalized === NATIVE_AGENT_MODULE_ADDRESS_BYTES;
}
function monoAddressInto2(w, input, name) {
  const { kind, bytes } = normalizeNativeAgentAddress(input, name);
  w.enumVariant(NATIVE_AGENT_ADDRESS_KIND_VARIANTS[kind]);
  w.rawBytes(bytes);
}
function normalizeNativeAgentAddress(input, name) {
  if (typeof input === "string") {
    return normalizeNativeAgentAddressString(input, void 0, name);
  }
  if (isAddressByteInput2(input)) {
    return { kind: "user", bytes: expectAddressBytes2(input, name) };
  }
  if (typeof input === "object" && input !== null) {
    const kind = input.kind ?? "user";
    if (!(kind in NATIVE_AGENT_ADDRESS_KIND_VARIANTS)) {
      throw new AgentActionError(`${name}.kind is not a supported native address kind`);
    }
    const address = input.address;
    if (typeof address === "string") {
      return normalizeNativeAgentAddressString(address, kind, name);
    }
    return { kind, bytes: expectAddressBytes2(address, name) };
  }
  throw new AgentActionError(`${name} must be a 20-byte address`);
}
function isAddressByteInput2(input) {
  return input instanceof Uint8Array || Array.isArray(input);
}
function normalizeNativeAgentAddressString(address, expectedKind, name) {
  try {
    if (address.startsWith("0x") || address.startsWith("0X")) {
      return { kind: expectedKind ?? "user", bytes: hexToAddressBytes(address) };
    }
    const parsed = typedBech32ToAddress(address, expectedKind);
    return { kind: parsed.kind, bytes: parsed.bytes };
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new AgentActionError(`${name} must be a 20-byte hex or typed bech32m address${detail}`);
  }
}
function expectAddressBytes2(value, name) {
  if (value.length !== 20) {
    throw new AgentActionError(`${name} must be a 20-byte address`);
  }
  for (const byte of value) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new AgentActionError(`${name} must contain bytes`);
    }
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
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
var MonolythiumProvider = class extends JsonRpcApiProvider {
  /** Underlying SDK client. Exposed for callers that want native types. */
  rpcClient;
  constructor(endpointOrClient, options = {}) {
    const network = options.network ?? {
      chainId: MONOLYTHIUM_TESTNET_CHAIN_ID,
      name: MONOLYTHIUM_TESTNET_NETWORK_NAME
    };
    try {
      Network.register(
        network.name,
        () => new Network(network.name, network.chainId)
      );
    } catch (_e) {
    }
    super(new Network(network.name, network.chainId));
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
var MonolythiumSigner = class _MonolythiumSigner extends AbstractSigner {
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

export { ADDRESS_HRP, ADDRESS_KIND_HRPS, API_STREAM_TOPICS, AddressError, AgentActionError, ApiClient, BRIDGE_QUOTE_API_BLOCKED_REASON, BRIDGE_REVERT_TAGS, BRIDGE_SELECTORS, BRIDGE_SUBMIT_API_BLOCKED_REASON, BURN_ADDR, BridgePrecompileError, BridgeRouteCatalogueError, CHAIN_REGISTRY, CHAIN_REGISTRY_RAW_BASE, CLOB_MARKET_ID_DOMAIN_TAG, CLOB_SELECTORS, DELEGATION_REVERT_TAGS, DELEGATION_SELECTORS, DelegationPrecompileError, LYTHOSHI_PER_LYTH, LYTH_DECIMALS, MAX_NATIVE_RECEIPT_EVENTS, ML_DSA_65_PUBLIC_KEY_LEN2 as ML_DSA_65_PUBLIC_KEY_LEN, ML_DSA_65_SIGNATURE_LEN2 as ML_DSA_65_SIGNATURE_LEN, MONOLYTHIUM_NETWORKS, MONOLYTHIUM_TESTNET_CHAIN_ID, MONOLYTHIUM_TESTNET_NETWORK_NAME, MRV_DEPLOY_PAYLOAD_VERSION, MRV_FORMAT_VERSION, MRV_MAX_ABI_SYMBOLS, MRV_MAX_CODE_BYTES, MRV_MAX_DEBUG_BYTES, MRV_MAX_MEMORY_PAGES, MRV_MAX_STORAGE_NAMESPACE_BYTES, MRV_MEMORY_PAGE_BYTES, MRV_PROFILE_MONO_RV32IM_V1, MRV_STRUCTURED_FEE_FIELDS, MRV_TX_EXTENSION_KIND, MRV_TX_EXTENSION_V1, MarketActionError, MonolythiumProvider, MonolythiumSigner, MrvValidationError, NATIVE_AGENT_MODULE_ADDRESS, NATIVE_AGENT_MODULE_ADDRESS_BYTES, NATIVE_LYTH_DECIMALS, NATIVE_MARKET_EVENT_FAMILY, NATIVE_MARKET_MODULE_ADDRESS, NATIVE_MARKET_MODULE_ADDRESS_BYTES, NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC, NODE_REGISTRY_CAPABILITIES, NODE_REGISTRY_CAPABILITY_MASK, NODE_REGISTRY_PUBLIC_SERVICE_MASK, NODE_REGISTRY_SELECTORS, NO_EVM_ARCHIVE_PROOF_SCHEMA, NO_EVM_FINALITY_EVIDENCE_SCHEMA, NO_EVM_FINALITY_EVIDENCE_SOURCE, NO_EVM_RECEIPTS_ROOT_DOMAIN, NO_EVM_RECEIPT_CODEC, NO_EVM_RECEIPT_PROOF_SCHEMA, NO_EVM_RECEIPT_PROOF_TYPE, NO_EVM_RECEIPT_ROOT_ALGORITHM, NoEvmReceiptProofError, NodeRegistryError, PRECOMPILE_ADDRESSES, PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN, PUBKEY_REGISTRY_SELECTORS, PubkeyRegistryError, RESERVED_ADDRESS_HRPS, RpcClient, SERVICE_PROBE_STATUS, SET_POLICY_CLAIM_DOMAIN_TAG, SPENDING_POLICY_SELECTORS, SdkError, SpendingPolicyError, TESTNET_69420, addressBytesToHex, addressToBech32, addressToTypedBech32, apiEndpointFromRpcEndpoint, assertMrvCallNativeSubmissionPlan, assertMrvDeployNativeSubmissionPlan, assertMrvFeeDisplayConformance, assertMrvStructuredFeeConformance, assertNativeMarketOrderBookStreamPayload, assessBridgeRoute, bech32ToAddress, bech32ToAddressBytes, bridgeAddressHex, bridgeQuoteSubmitReadiness, bridgeRoutesReadiness, bridgeTransferCandidates, buildBridgeRouteCatalogue, buildCancelSpotOrderPlan, buildMrvCallNativeTxPlan, buildMrvCallPlan, buildMrvCallRequest, buildMrvDeployNativeTxPlan, buildMrvDeployPayloadNativeTxPlan, buildMrvDeployPayloadPlan, buildMrvDeployPayloadRequest, buildMrvDeployPlan, buildMrvDeployRequest, buildNativeAgentCreateEscrowForwarderInput, buildNativeAgentCreateEscrowModuleCall, buildNativeAgentModuleCallEnvelope, buildNativeAgentRecordReputationForwarderInput, buildNativeAgentRecordReputationModuleCall, buildNativeAgentSetSpendingPolicyForwarderInput, buildNativeAgentSetSpendingPolicyModuleCall, buildNativeMarketModuleCallEnvelope, buildNativeNftBuyListingForwarderInput, buildNativeNftBuyListingModuleCall, buildNativeNftCancelListingForwarderInput, buildNativeNftCancelListingModuleCall, buildNativeNftCreateListingForwarderInput, buildNativeNftCreateListingModuleCall, buildNativeNftPlaceAuctionBidForwarderInput, buildNativeNftPlaceAuctionBidModuleCall, buildNativeNftSettleAuctionForwarderInput, buildNativeNftSettleAuctionModuleCall, buildNativeNftSweepExpiredListingsForwarderInput, buildNativeNftSweepExpiredListingsModuleCall, buildNativeSpotCancelOrderForwarderInput, buildNativeSpotCancelOrderModuleCall, buildNativeSpotLimitOrderForwarderInput, buildNativeSpotLimitOrderModuleCall, buildPlaceSpotLimitOrderPlan, buildPlaceSpotMarketOrderExPlan, buildPlaceSpotMarketOrderPlan, checkMrvFeeDisplayConformance, checkMrvStructuredFeeConformance, clobAddressHex, composeClaimBoundMessage, computeNoEvmReceiptsRoot, computeNoEvmTargetReceiptHash, consumeNativeEvents, decodeHasPubkeyReturn, decodeLookupPubkeyReturn, decodeNativeAgentStateResponse, decodeNativeMarketOrderBookDeltasResponse, decodeNativeReceiptResponse, decodeNoEvmReceiptTranscript, decodeTxFeedResponse, delegationAddressHex, deriveClobMarketId, deriveMrvContractAddress, encodeBlockSelector, encodeCancelOrderCalldata, encodeClaimPolicyByAddressCalldata, encodeCompleteRedemptionCalldata, encodeDisableCalldata, encodeEnableCalldata, encodeHasPubkeyCalldata, encodeLockBridgeConfigCalldata, encodeLookupPubkeyCalldata, encodeMrvDeployPayload, encodeNativeAgentAcceptEscrowCall, encodeNativeAgentApproveEscrowCall, encodeNativeAgentArbiterGetCall, encodeNativeAgentAttestationGetCall, encodeNativeAgentAvailabilityGetCall, encodeNativeAgentCancelEscrowCall, encodeNativeAgentCloseAvailabilityCall, encodeNativeAgentConsentGetCall, encodeNativeAgentCounterEscrowCall, encodeNativeAgentCreateEscrowCall, encodeNativeAgentDeactivateServiceCall, encodeNativeAgentDisputeEscrowCall, encodeNativeAgentEscrowGetCall, encodeNativeAgentGrantConsentCall, encodeNativeAgentIssueAttestationCall, encodeNativeAgentIssuerGetCall, encodeNativeAgentListServiceCall, encodeNativeAgentModuleForwarderInput, encodeNativeAgentOpenAvailabilityCall, encodeNativeAgentRecordPolicySpendCall, encodeNativeAgentRecordReputationCall, encodeNativeAgentRegisterArbiterCall, encodeNativeAgentRegisterIssuerCall, encodeNativeAgentReputationGetCall, encodeNativeAgentResolveEscrowCall, encodeNativeAgentRevokeAttestationCall, encodeNativeAgentRevokeConsentCall, encodeNativeAgentServiceGetCall, encodeNativeAgentSetAvailabilityCall, encodeNativeAgentSetSpendingPolicyCall, encodeNativeAgentSpendingPolicyGetCall, encodeNativeAgentStartEscrowCall, encodeNativeAgentSubmitEscrowCall, encodeNativeMarketModuleForwarderInput, encodeNativeNftBuyListingCall, encodeNativeNftCancelListingCall, encodeNativeNftCreateListingCall, encodeNativeNftPlaceAuctionBidCall, encodeNativeNftSettleAuctionCall, encodeNativeNftSweepExpiredListingsCall, encodeNativeSpotCancelOrderCall, encodeNativeSpotLimitOrderCall, encodePlaceLimitOrderCalldata, encodePlaceMarketOrderCalldata, encodePlaceMarketOrderExCalldata, encodeRegisterPubkeyCalldata, encodeReportServiceProbeCalldata, encodeSetBridgeResumeCooldownCalldata, encodeSetBridgeRouteFinalityCalldata, encodeSetPolicyCalldata, encodeSetPolicyClaimCalldata, exportBridgeRouteCatalogueJson, fetchChainInfoLatest, fetchChainRegistryLatest, formatLyth, formatLythoshi, formatNativeReceiptFeeDisplay, getChainInfo, getP2pSeeds, getRpcEndpoints, hexToAddressBytes, isBridgeAdminLockedRevert, isBridgeCooldownZeroRevert, isBridgeFinalityZeroRevert, isBridgeResumeCooldownActiveRevert, isConcreteServiceProbeStatus, isNativeDecodedEvent, isNativeMarketOrderBookStreamPayload, isRedemptionPrincipalUnavailableRevert, isSinglePublicServiceProbeMask, isValidNodeRegistryCapabilities, isValidPublicServiceProbeMask, mrvAddressToBech32, mrvBech32ToAddress, mrvCodeHashHex, mrvV1TransactionExtension, nativeAgentStateFilterParams, nativeEventMatches, nativeEventsFilterParams, nativeEventsFromHistory, nativeEventsFromReceipt, nativeMarketEventFilter, nativeMarketEventsFromHistory, nativeMarketEventsFromReceipt, nativeMarketStateFilterParams, nodeRegistryAddressHex, normalizeAddressHex, normalizeBridgeRouteCatalogue, parseAddress, parseBridgeRouteCatalogueJson, parseChainRegistryToml, parseLythToLythoshi, parseNativeDecodedEvent, parseQuantity, parseQuantityBig, pubkeyRegistryAddressHex, rankBridgeRoutes, selectBridgeTransferRoute, serviceProbeStatusLabel, spendingPolicyAddressHex, submitMrvCallNativeTx, submitMrvDeployNativeTx, submitMrvDeployPayloadNativeTx, translateBlockOut, translateReceiptOut, translateTxIn, typedBech32ToAddress, validateBridgeRouteCatalogue, validateMrvArtifactMetadata, validateMrvCallRequest, validateMrvDeployRequest, verifyNoEvmReceiptProof, version };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map