import { blake3 } from '@noble/hashes/blake3.js';
import { keccak_256, shake256 } from '@noble/hashes/sha3.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { bls12_381 } from '@noble/curves/bls12-381.js';
import { mnemonicToEntropy } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

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
function requireTypedAddress(address, expectedKind, label = "address") {
  if (address.startsWith("0x") || address.startsWith("0X")) {
    throw new AddressError(
      `${label} raw 0x addresses are retired; use typed ${ADDRESS_KIND_HRPS[expectedKind]} bech32m addresses`
    );
  }
  try {
    return typedBech32ToAddress(address, expectedKind).address;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AddressError(
      `${label} must be typed ${ADDRESS_KIND_HRPS[expectedKind]} bech32m address: ${message}`
    );
  }
}
function parseAddress(address) {
  if (address.startsWith("0x") || address.startsWith("0X")) {
    return hexToAddressBytes(address);
  }
  return bech32ToAddressBytes(address);
}
function validateAddress(address) {
  if (typeof address !== "string" || address.length === 0) {
    return { valid: false, reason: "address cannot be empty" };
  }
  const trimmed = address.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: "address cannot be empty" };
  }
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    try {
      const bytes = hexToAddressBytes(trimmed);
      return {
        valid: true,
        normalized: addressToBech32(bytes),
        kind: null,
        format: "hex",
        bytes
      };
    } catch (err) {
      return { valid: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }
  try {
    const typed = typedBech32ToAddress(trimmed);
    return {
      valid: true,
      normalized: typed.address,
      kind: typed.kind,
      format: "bech32m",
      bytes: typed.bytes
    };
  } catch (err) {
    return { valid: false, reason: err instanceof Error ? err.message : String(err) };
  }
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
  /** Agent execution surface — gateable. */
  AGENT: "0x0000000000000000000000000000000000001003",
  /** Account privacy policy + stealth/confidential ops — gateable. */
  PRIVACY: "0x0000000000000000000000000000000000001004",
  /** Operator + RPC node registry — non-gateable consensus invariant. */
  NODE_REGISTRY: "0x0000000000000000000000000000000000001005",
  /** Native bridge route-control surface — gateable. */
  BRIDGE: "0x0000000000000000000000000000000000001008",
  /** Decentralized multi-signer oracle — non-gateable. */
  ORACLE: "0x0000000000000000000000000000000000001009",
  /** Distributed delegation primitive — gateable. */
  DELEGATION: "0x000000000000000000000000000000000000100A",
  /** Operator-fee router — skims an operator surcharge on routed CLOB ops; gateable. */
  OPERATOR_ROUTER: "0x000000000000000000000000000000000000100B",
  /** GPU prover market — gateable, genesis-disabled (foundation milestone flip). */
  PROVER_MARKET: "0x000000000000000000000000000000000000100C",
  /** One-time emergency-key registry — non-gateable. */
  EMERGENCY_KEY: "0x0000000000000000000000000000000000001100",
  /** VRF precompile. */
  VRF: "0x0000000000000000000000000000000000001101",
  /** Streaming-payments primitive — gateable. */
  STREAMING_PAYMENTS: "0x0000000000000000000000000000000000001102",
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
  /** Agent spending policy — gateable. */
  SPENDING_POLICY: "0x000000000000000000000000000000000000110C",
  /** Primary ML-DSA-65 pubkey registry — gateable. */
  PUBKEY_REGISTRY: "0x000000000000000000000000000000000000110D",
  /** Hierarchical name registry — gateable. */
  NAME_REGISTRY: "0x000000000000000000000000000000000000110E"
};
var OPERATOR_ROUTER_ADDRESS = PRECOMPILE_ADDRESSES.OPERATOR_ROUTER;
var PROTOCOL_MAX_OPERATOR_FEE_BPS = 100;

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
  SERVES_PUBLIC_API: 256,
  /** GPU prover — may bid on + serve the GPU prover market (MB-4, bit 9). */
  SERVES_GPU_PROVE: 512
};
var DIVERSITY_SCORE_MAX = 1e4;
var MULTISIG_ADDRESS_DERIVATION_DOMAIN = "MONO_MULTISIG_BLAKE3_20_V1";
var NODE_REGISTRY_CAPABILITY_MASK = 65535;
var NODE_REGISTRY_PUBLIC_SERVICE_MASK = NODE_REGISTRY_CAPABILITIES.SERVES_RPC | NODE_REGISTRY_CAPABILITIES.SERVES_INDEXER | NODE_REGISTRY_CAPABILITIES.SERVES_ARCHIVE | NODE_REGISTRY_CAPABILITIES.SERVES_WEBSOCKET | NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API;
var SERVICE_PROBE_STATUS = {
  UNKNOWN: 0,
  REACHABLE: 1,
  DEGRADED: 2,
  UNREACHABLE: 3
};
var NODE_REGISTRY_SELECTORS = {
  /** `recoverOperatorNode(bytes32)` — foundation-gated DR alias for `unjail`. */
  recoverOperatorNode: "0x" + selectorHex("recoverOperatorNode(bytes32)"),
  /** `submitPendingChange(uint8,bytes,uint64,uint64)` — foundation-gated roster lifecycle. */
  submitPendingChange: "0x" + selectorHex("submitPendingChange(uint8,bytes,uint64,uint64)"),
  /** `cancelPendingChange(uint64,bytes)` — foundation-gated pending-change cancellation. */
  cancelPendingChange: "0x" + selectorHex("cancelPendingChange(uint64,bytes)"),
  /** `attestDkgReshare(uint64,bytes,bytes)` — operator-signed DKG re-share attestation. */
  attestDkgReshare: "0x" + selectorHex("attestDkgReshare(uint64,bytes,bytes)"),
  reportServiceProbe: "0xeee31bba",
  getServiceProbe: "0x1fcbfbce",
  /** `setNetworkMetadata(bytes32,uint16,bytes3,bytes)` — owner-callable (PF-6). */
  setNetworkMetadata: "0x" + selectorHex("setNetworkMetadata(bytes32,uint16,bytes3,bytes)"),
  /** `getOperatorNetworkMetadata(bytes32)` view (PF-6). */
  getOperatorNetworkMetadata: "0x" + selectorHex("getOperatorNetworkMetadata(bytes32)"),
  /** `getClusterDiversity(uint32)` view (PF-6). */
  getClusterDiversity: "0x" + selectorHex("getClusterDiversity(uint32)"),
  /** `requestClusterJoin(uint32,bytes)` — CJ-1 joining operator posts an admit request. */
  requestClusterJoin: "0x" + selectorHex("requestClusterJoin(uint32,bytes)"),
  /** `voteClusterAdmit(uint32,bytes32,bytes)` — CJ-1 current member admit vote. */
  voteClusterAdmit: "0x" + selectorHex("voteClusterAdmit(uint32,bytes32,bytes)"),
  /** `cancelClusterJoin(uint32,bytes32)` — CJ-1 requester cancellation/refund. */
  cancelClusterJoin: "0x" + selectorHex("cancelClusterJoin(uint32,bytes32)"),
  /** `expireClusterJoin(uint32,bytes32)` — CJ-1 public reaper/refund. */
  expireClusterJoin: "0x" + selectorHex("expireClusterJoin(uint32,bytes32)"),
  /** `getClusterJoinRequest(uint32,bytes32)` — CJ-1 request status view. */
  getClusterJoinRequest: "0x" + selectorHex("getClusterJoinRequest(uint32,bytes32)"),
  /** `formCluster(bytes,bytes,bytes)` — no-foundation cluster formation by roster consent. */
  formCluster: "0x" + selectorHex("formCluster(bytes,bytes,bytes)"),
  /**
   * `formCluster(bytes,bytes,bytes,bytes)` — V2 formation carrying the
   * 30-byte economics charter (Law §6.8); consents verify over the V2
   * digest, which commits to the charter bytes.
   */
  formClusterV2: "0x" + selectorHex("formCluster(bytes,bytes,bytes,bytes)"),
  /** `setOperatorDisplay(bytes32,string,string)` — owner-callable public display metadata. */
  setOperatorDisplay: "0x" + selectorHex("setOperatorDisplay(bytes32,string,string)"),
  /**
   * `updateCharter(uint32,bytes,bytes,bytes)` — Component H live charter
   * amendment (Law §6.8); re-signs a new 30-byte charter for a LIVE cluster
   * with a delegator-protective cooldown. Consents verify over
   * `updateCharterMessage` (NOT the formCluster digests).
   */
  updateCharter: "0x" + selectorHex("updateCharter(uint32,bytes,bytes,bytes)"),
  /** `getPendingCharter(uint32)` view — Component H pending-amendment status. */
  getPendingCharter: "0x" + selectorHex("getPendingCharter(uint32)"),
  /** `commitArchiveRoot(bytes32,uint16,bytes32,uint64)` — Component B archive serve-challenge commit. */
  commitArchiveRoot: "0x" + selectorHex("commitArchiveRoot(bytes32,uint16,bytes32,uint64)"),
  /**
   * `answerArchiveChallenge(bytes32,uint16,uint64,bytes,bytes32[])` —
   * Component B answer. BLOCKER-1 (mono-core `service-rewards` d2ee4548):
   * the caller-supplied `roundCertDigest` + `nonce` were REMOVED — the
   * challenge seed is now the protocol-pinned per-epoch quorum-certificate
   * digest and the nonce is derived from it. 5 args: peerId, shardIndex,
   * epoch, leaf, proof.
   */
  answerArchiveChallenge: "0x" + selectorHex("answerArchiveChallenge(bytes32,uint16,uint64,bytes,bytes32[])"),
  /** `setProbeAuthority(address)` — Component C foundation-gated probe-authority rotation. */
  setProbeAuthority: "0x" + selectorHex("setProbeAuthority(address)"),
  /** `getProbeAuthority()` view — Component C configured probe-authority address. */
  getProbeAuthority: "0x" + selectorHex("getProbeAuthority()"),
  /** `attestServiceProbe(bytes32,uint32,uint8,uint64)` — Component C attested score-eligibility path. */
  attestServiceProbe: "0x" + selectorHex("attestServiceProbe(bytes32,uint32,uint8,uint64)")
};
var NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES = 48;
var NODE_REGISTRY_LEGACY_CLUSTER_MEMBER_PUBKEY_BYTES = NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES;
var NODE_REGISTRY_BLS_PUBKEY_BYTES = NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES;
var NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES = 1952;
var NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES = 3309;
var NODE_REGISTRY_CONSENSUS_POP_BYTES = 3309;
var NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES = 96;
var NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES = NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES;
var NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS = 5;
var NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS = 7;
var NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID = (1n << 56n) - 1n;
var NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT = 7;
var NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT = 3;
var NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT = NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT + NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT;
var NODE_REGISTRY_FORM_CLUSTER_THRESHOLD = 7;
var NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN = "PROTOCORE_NODE_REGISTRY_CLUSTER_FORM_V1\0";
var NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN_V2 = "PROTOCORE_NODE_REGISTRY_CLUSTER_FORM_V2\0";
var NODE_REGISTRY_CLUSTER_CHARTER_BYTES = 30;
var NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS = 2e3;
var NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS = 1e4;
var NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES = 128;
var NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES = 64;
var NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD = NODE_REGISTRY_FORM_CLUSTER_THRESHOLD;
var NODE_REGISTRY_UPDATE_CHARTER_MESSAGE_DOMAIN = "PROTOCORE_NODE_REGISTRY_CLUSTER_UPDATE_CHARTER_V1\0";
var NODE_REGISTRY_CHARTER_COOLDOWN_EPOCHS = 2;
var NODE_REGISTRY_ARCHIVE_CHALLENGE_DOMAIN = "monolythium.archive-challenge.v1";
var NODE_REGISTRY_ARCHIVE_NONCE_DOMAIN = "monolythium.archive-challenge.nonce.v1";
var NODE_REGISTRY_MERKLE_LEAF_DOMAIN = 0;
var NODE_REGISTRY_MERKLE_INNER_DOMAIN = 1;
var NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH = 40;
var NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT = 65536n;
var NODE_REGISTRY_CHALLENGE_EPOCH_WINDOW = 2n;
var NODE_REGISTRY_ARCHIVE_KIND_EPOCH_SEED = 3;
var NODE_REGISTRY_TAG_ARCHIVE_CHALLENGE = 50;
var NODE_REGISTRY_TAG_SERVICE_SCORE = 36;
var NODE_REGISTRY_TAG_TREASURY = 31;
var NODE_REGISTRY_TAG_CLUSTER_CHARTER = 49;
var NODE_REGISTRY_SUBKIND_CHARTER_DELEGATOR_BPS = 0;
var NODE_REGISTRY_SUBKIND_CHARTER_MEMBER_SHARES = 1;
var PENDING_CHANGE_KIND_CODES = {
  add: 1,
  remove: 2,
  rotate: 3
};
var PENDING_CHANGE_KIND_LABELS = {
  1: "add",
  2: "remove",
  3: "rotate"
};
var CLUSTER_FORMED_EVENT_SIG = "ClusterFormed(uint32,uint64,address,bytes)";
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
function normalizePendingChangeKind(kind) {
  if (typeof kind === "number") {
    const label = PENDING_CHANGE_KIND_LABELS[kind];
    if (!label) throw new NodeRegistryError(`unknown pending-change kind ${kind}`);
    return { kind: label, kindCode: kind };
  }
  const kindCode = PENDING_CHANGE_KIND_CODES[kind];
  if (!kindCode) throw new NodeRegistryError(`unknown pending-change kind ${kind}`);
  return { kind, kindCode };
}
function encodeRecoverOperatorNodeCalldata(peerId) {
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.recoverOperatorNode),
      expectLength2(toBytes(peerId), 32, "peerId")
    )
  );
}
function encodeSubmitPendingChangeCalldata(args) {
  const { kind, kindCode } = normalizePendingChangeKind(args.kind);
  const targetPubkey = expectLength2(
    toBytes(args.targetPubkey),
    NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "targetPubkey"
  );
  const effectiveEpoch = toUint64(args.effectiveEpoch, "effectiveEpoch");
  if (effectiveEpoch === 0n) {
    throw new NodeRegistryError("effectiveEpoch must be greater than zero");
  }
  const intentId = toUint64(args.intentId ?? 0n, "intentId");
  if (intentId > NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID) {
    throw new NodeRegistryError("intentId must be <= 2^56-1");
  }
  if (kind !== "rotate" && intentId !== 0n) {
    throw new NodeRegistryError("only rotate pending changes may carry a non-zero intentId");
  }
  const targetPubkeyPadded = padToWord(targetPubkey);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.submitPendingChange),
      uint8Word(kindCode),
      uint64Word(4n * 32n, "targetPubkeyOffset"),
      uint64Word(effectiveEpoch, "effectiveEpoch"),
      uint64Word(intentId, "intentId"),
      uint64Word(BigInt(targetPubkey.length), "targetPubkeyLength"),
      targetPubkeyPadded
    )
  );
}
function encodeCancelPendingChangeCalldata(args) {
  const targetPubkey = expectLength2(
    toBytes(args.targetPubkey),
    NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "targetPubkey"
  );
  const targetPubkeyPadded = padToWord(targetPubkey);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.cancelPendingChange),
      uint64Word(args.epoch, "epoch"),
      uint64Word(2n * 32n, "targetPubkeyOffset"),
      uint64Word(BigInt(targetPubkey.length), "targetPubkeyLength"),
      targetPubkeyPadded
    )
  );
}
function parseDkgResharePublicKeys(consensusPublicKeys) {
  const keys = toBytes(consensusPublicKeys);
  if (keys.length % NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES !== 0) {
    throw new NodeRegistryError(
      `consensusPublicKeys length must be a multiple of ${NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES} bytes`
    );
  }
  const signerCount = keys.length / NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES;
  if (signerCount < NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS || signerCount > NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS) {
    throw new NodeRegistryError(
      `consensusPublicKeys must contain ${NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS}..${NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS} signers`
    );
  }
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (let offset = 0; offset < keys.length; offset += NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES) {
    const key = keys.slice(offset, offset + NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES);
    const keyHex = bytesToHex(key);
    if (seen.has(keyHex)) {
      throw new NodeRegistryError("consensusPublicKeys contains a duplicate signer pubkey");
    }
    seen.add(keyHex);
    out.push(key);
  }
  return out;
}
function dkgReshareConsensusPublicKeys(args) {
  if (args.consensusPublicKeys !== void 0) return args.consensusPublicKeys;
  if (args.blsPublicKeys !== void 0) return args.blsPublicKeys;
  throw new NodeRegistryError("consensusPublicKeys is required");
}
function encodeAttestDkgReshareCalldata(args) {
  const intentId = toUint64(args.intentId, "intentId");
  if (intentId === 0n) {
    throw new NodeRegistryError("intentId must be greater than zero");
  }
  if (intentId > NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID) {
    throw new NodeRegistryError("intentId must be <= 2^56-1");
  }
  const publicKeys = concatBytes(...parseDkgResharePublicKeys(dkgReshareConsensusPublicKeys(args)));
  const thresholdSig = expectLength2(
    toBytes(args.thresholdSig),
    NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES,
    "thresholdSig"
  );
  const keysPadded = padToWord(publicKeys);
  const sigPadded = padToWord(thresholdSig);
  const offsetKeys = 3n * 32n;
  const offsetSig = offsetKeys + 32n + BigInt(keysPadded.length);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.attestDkgReshare),
      uint64Word(intentId, "intentId"),
      uint64Word(offsetKeys, "consensusPublicKeysOffset"),
      uint64Word(offsetSig, "thresholdSigOffset"),
      uint64Word(BigInt(publicKeys.length), "consensusPublicKeysLength"),
      keysPadded,
      uint64Word(BigInt(thresholdSig.length), "thresholdSigLength"),
      sigPadded
    )
  );
}
function encodeRequestClusterJoinCalldata(args) {
  const operatorPubkey = expectLength2(
    toBytes(args.operatorPubkey),
    NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "operatorPubkey"
  );
  const operatorPubkeyPadded = padToWord(operatorPubkey);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.requestClusterJoin),
      uint32Word(toUint32(args.clusterId, "clusterId")),
      uint64Word(2n * 32n, "operatorPubkeyOffset"),
      uint64Word(BigInt(operatorPubkey.length), "operatorPubkeyLength"),
      operatorPubkeyPadded
    )
  );
}
function encodeVoteClusterAdmitCalldata(args) {
  const operatorId = expectLength2(toBytes(args.operatorId), 32, "operatorId");
  const voterPubkey = expectLength2(
    toBytes(args.voterPubkey),
    NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "voterPubkey"
  );
  const voterPubkeyPadded = padToWord(voterPubkey);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.voteClusterAdmit),
      uint32Word(toUint32(args.clusterId, "clusterId")),
      operatorId,
      uint64Word(3n * 32n, "voterPubkeyOffset"),
      uint64Word(BigInt(voterPubkey.length), "voterPubkeyLength"),
      voterPubkeyPadded
    )
  );
}
function encodeSetOperatorDisplayCalldata(args) {
  const peerId = expectLength2(toBytes(args.peerId), 32, "peerId");
  const moniker = displayTextBytes(
    args.moniker,
    NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES,
    "moniker"
  );
  const alias = displayTextBytes(args.alias, NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES, "alias");
  const monikerPadded = padToWord(moniker);
  const aliasPadded = padToWord(alias);
  const monikerOffset = 3n * 32n;
  const aliasOffset = monikerOffset + 32n + BigInt(monikerPadded.length);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.setOperatorDisplay),
      peerId,
      uint64Word(monikerOffset, "monikerOffset"),
      uint64Word(aliasOffset, "aliasOffset"),
      uint64Word(BigInt(moniker.length), "monikerLength"),
      monikerPadded,
      uint64Word(BigInt(alias.length), "aliasLength"),
      aliasPadded
    )
  );
}
function encodeCancelClusterJoinCalldata(args) {
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.cancelClusterJoin),
      uint32Word(toUint32(args.clusterId, "clusterId")),
      expectLength2(toBytes(args.operatorId), 32, "operatorId")
    )
  );
}
function encodeExpireClusterJoinCalldata(args) {
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.expireClusterJoin),
      uint32Word(toUint32(args.clusterId, "clusterId")),
      expectLength2(toBytes(args.operatorId), 32, "operatorId")
    )
  );
}
function encodeGetClusterJoinRequestCalldata(args) {
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.getClusterJoinRequest),
      uint32Word(toUint32(args.clusterId, "clusterId")),
      expectLength2(toBytes(args.operatorId), 32, "operatorId")
    )
  );
}
function formClusterMessage(activePubkeys, standbyPubkeys) {
  const active = expectLength2(
    toBytes(activePubkeys),
    NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "activePubkeys"
  );
  const standby = expectLength2(
    toBytes(standbyPubkeys),
    NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "standbyPubkeys"
  );
  return blake3(
    concatBytes(
      new TextEncoder().encode(NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN),
      u16BeBytes(NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT),
      u16BeBytes(NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT),
      u16BeBytes(NODE_REGISTRY_FORM_CLUSTER_THRESHOLD),
      u32BeBytes(active.length),
      active,
      u32BeBytes(standby.length),
      standby
    )
  );
}
function formClusterMessageHex(activePubkeys, standbyPubkeys) {
  return bytesToHex(formClusterMessage(activePubkeys, standbyPubkeys));
}
function encodeFormClusterCalldata(args) {
  const activePubkeys = expectLength2(
    toBytes(args.activePubkeys),
    NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "activePubkeys"
  );
  const standbyPubkeys = expectLength2(
    toBytes(args.standbyPubkeys),
    NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "standbyPubkeys"
  );
  const signatures = expectLength2(
    toBytes(args.signatures),
    NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT * NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES,
    "signatures"
  );
  const activePadded = padToWord(activePubkeys);
  const standbyPadded = padToWord(standbyPubkeys);
  const signaturesPadded = padToWord(signatures);
  const activeOffset = 3n * 32n;
  const standbyOffset = activeOffset + 32n + BigInt(activePadded.length);
  const signaturesOffset = standbyOffset + 32n + BigInt(standbyPadded.length);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.formCluster),
      uint64Word(activeOffset, "activePubkeysOffset"),
      uint64Word(standbyOffset, "standbyPubkeysOffset"),
      uint64Word(signaturesOffset, "signaturesOffset"),
      uint64Word(BigInt(activePubkeys.length), "activePubkeysLength"),
      activePadded,
      uint64Word(BigInt(standbyPubkeys.length), "standbyPubkeysLength"),
      standbyPadded,
      uint64Word(BigInt(signatures.length), "signaturesLength"),
      signaturesPadded
    )
  );
}
function encodeClusterCharter(args) {
  if (args.memberShareBps.length !== NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT) {
    throw new NodeRegistryError(
      `memberShareBps needs exactly ${NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT} entries, got ${args.memberShareBps.length}`
    );
  }
  let sum = 0;
  for (const bps of args.memberShareBps) {
    if (!Number.isInteger(bps) || bps < 0 || bps > 65535) {
      throw new NodeRegistryError(`memberShareBps entries must be u16 integers, got ${bps}`);
    }
    sum += bps;
  }
  if (sum !== NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS) {
    throw new NodeRegistryError(
      `memberShareBps must sum to ${NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS}, got ${sum}`
    );
  }
  if (!Number.isInteger(args.delegatorShareBps) || args.delegatorShareBps < NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS || args.delegatorShareBps > NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS) {
    throw new NodeRegistryError(
      `delegatorShareBps must be within [${NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS}, ${NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS}], got ${args.delegatorShareBps}`
    );
  }
  const expiresMs = typeof args.expiresMs === "bigint" ? args.expiresMs : BigInt(args.expiresMs);
  if (expiresMs < 0n || expiresMs > 0xffffffffffffffffn) {
    throw new NodeRegistryError(`expiresMs must fit in u64, got ${expiresMs}`);
  }
  const out = new Uint8Array(NODE_REGISTRY_CLUSTER_CHARTER_BYTES);
  for (let i = 0; i < NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT; i += 1) {
    out.set(u16BeBytes(args.memberShareBps[i]), 2 * i);
  }
  out.set(u16BeBytes(args.delegatorShareBps), 20);
  out.set(u64BeBytes(expiresMs), 22);
  return out;
}
function formClusterMessageV2(activePubkeys, standbyPubkeys, charter) {
  const active = expectLength2(
    toBytes(activePubkeys),
    NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "activePubkeys"
  );
  const standby = expectLength2(
    toBytes(standbyPubkeys),
    NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "standbyPubkeys"
  );
  const charterBytes = expectLength2(
    toBytes(charter),
    NODE_REGISTRY_CLUSTER_CHARTER_BYTES,
    "charter"
  );
  return blake3(
    concatBytes(
      new TextEncoder().encode(NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN_V2),
      u16BeBytes(NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT),
      u16BeBytes(NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT),
      u16BeBytes(NODE_REGISTRY_FORM_CLUSTER_THRESHOLD),
      u32BeBytes(active.length),
      active,
      u32BeBytes(standby.length),
      standby,
      u32BeBytes(charterBytes.length),
      charterBytes
    )
  );
}
function formClusterMessageV2Hex(activePubkeys, standbyPubkeys, charter) {
  return bytesToHex(formClusterMessageV2(activePubkeys, standbyPubkeys, charter));
}
function encodeFormClusterV2Calldata(args) {
  const activePubkeys = expectLength2(
    toBytes(args.activePubkeys),
    NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "activePubkeys"
  );
  const standbyPubkeys = expectLength2(
    toBytes(args.standbyPubkeys),
    NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "standbyPubkeys"
  );
  const signatures = expectLength2(
    toBytes(args.signatures),
    NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT * NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES,
    "signatures"
  );
  const charter = expectLength2(
    toBytes(args.charter),
    NODE_REGISTRY_CLUSTER_CHARTER_BYTES,
    "charter"
  );
  const activePadded = padToWord(activePubkeys);
  const standbyPadded = padToWord(standbyPubkeys);
  const signaturesPadded = padToWord(signatures);
  const charterPadded = padToWord(charter);
  const activeOffset = 4n * 32n;
  const standbyOffset = activeOffset + 32n + BigInt(activePadded.length);
  const signaturesOffset = standbyOffset + 32n + BigInt(standbyPadded.length);
  const charterOffset = signaturesOffset + 32n + BigInt(signaturesPadded.length);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.formClusterV2),
      uint64Word(activeOffset, "activePubkeysOffset"),
      uint64Word(standbyOffset, "standbyPubkeysOffset"),
      uint64Word(signaturesOffset, "signaturesOffset"),
      uint64Word(charterOffset, "charterOffset"),
      uint64Word(BigInt(activePubkeys.length), "activePubkeysLength"),
      activePadded,
      uint64Word(BigInt(standbyPubkeys.length), "standbyPubkeysLength"),
      standbyPadded,
      uint64Word(BigInt(signatures.length), "signaturesLength"),
      signaturesPadded,
      uint64Word(BigInt(charter.length), "charterLength"),
      charterPadded
    )
  );
}
function decodeClusterCharter(charter) {
  const bytes = expectLength2(toBytes(charter), NODE_REGISTRY_CLUSTER_CHARTER_BYTES, "charter");
  const memberShareBps = [];
  let sum = 0;
  for (let i = 0; i < NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT; i += 1) {
    const bps = bytes[2 * i] << 8 | bytes[2 * i + 1];
    memberShareBps.push(bps);
    sum += bps;
  }
  if (sum !== NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS) {
    throw new NodeRegistryError(
      `memberShareBps must sum to ${NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS}, got ${sum}`
    );
  }
  const delegatorShareBps = bytes[20] << 8 | bytes[21];
  if (delegatorShareBps < NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS || delegatorShareBps > NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS) {
    throw new NodeRegistryError(
      `delegatorShareBps must be within [${NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS}, ${NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS}], got ${delegatorShareBps}`
    );
  }
  let expiresMs = 0n;
  for (let i = 22; i < 30; i += 1) {
    expiresMs = expiresMs << 8n | BigInt(bytes[i]);
  }
  return { memberShareBps, delegatorShareBps, expiresMs };
}
function updateCharterMessage(clusterId, charter) {
  const id = toUint32(clusterId, "clusterId");
  const charterBytes = expectLength2(toBytes(charter), NODE_REGISTRY_CLUSTER_CHARTER_BYTES, "charter");
  return blake3(
    concatBytes(
      new TextEncoder().encode(NODE_REGISTRY_UPDATE_CHARTER_MESSAGE_DOMAIN),
      u32BeBytes(id),
      u16BeBytes(NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD),
      u32BeBytes(charterBytes.length),
      charterBytes
    )
  );
}
function updateCharterMessageHex(clusterId, charter) {
  return bytesToHex(updateCharterMessage(clusterId, charter));
}
function encodeUpdateCharterCalldata(args) {
  const id = toUint32(args.clusterId, "clusterId");
  const charter = expectLength2(
    toBytes(args.charter),
    NODE_REGISTRY_CLUSTER_CHARTER_BYTES,
    "charter"
  );
  const signerPubkeys = flattenFixedWidth(
    args.signerPubkeys,
    NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "signerPubkeys"
  );
  const signatures = flattenFixedWidth(
    args.signatures,
    NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES,
    "signatures"
  );
  const nPubkeys = signerPubkeys.length / NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES;
  const nSigs = signatures.length / NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES;
  if (nPubkeys !== nSigs) {
    throw new NodeRegistryError(
      `signerPubkeys (${nPubkeys}) and signatures (${nSigs}) counts must match`
    );
  }
  if (nPubkeys < NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD || nPubkeys > NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT) {
    throw new NodeRegistryError(
      `signer count must be in [${NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD}, ${NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT}], got ${nPubkeys}`
    );
  }
  const charterPadded = padToWord(charter);
  const signerPadded = padToWord(signerPubkeys);
  const sigsPadded = padToWord(signatures);
  const charterOffset = 4n * 32n;
  const signerOffset = charterOffset + 32n + BigInt(charterPadded.length);
  const sigsOffset = signerOffset + 32n + BigInt(signerPadded.length);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.updateCharter),
      uint32Word(id),
      uint64Word(charterOffset, "charterOffset"),
      uint64Word(signerOffset, "signerPubkeysOffset"),
      uint64Word(sigsOffset, "signaturesOffset"),
      uint64Word(BigInt(charter.length), "charterLength"),
      charterPadded,
      uint64Word(BigInt(signerPubkeys.length), "signerPubkeysLength"),
      signerPadded,
      uint64Word(BigInt(signatures.length), "signaturesLength"),
      sigsPadded
    )
  );
}
function encodeGetPendingCharterCalldata(clusterId) {
  return bytesToHex(
    concatBytes(hexToBytes(NODE_REGISTRY_SELECTORS.getPendingCharter), uint32Word(toUint32(clusterId, "clusterId")))
  );
}
function decodePendingCharter(returnData) {
  const bytes = toBytes(returnData);
  if (bytes.length < 5 * 32) {
    throw new NodeRegistryError("getPendingCharter return shorter than the 5-word head");
  }
  const word = (i) => bytes.slice(i * 32, (i + 1) * 32);
  const present = numberFromWord(word(0), "present", 1) === 1;
  const delegatorShareBps = numberFromWord(word(1), "delegatorShareBps", 65535);
  const effectiveEpoch = u64FromWord(word(2));
  const signerCount = numberFromWord(word(3), "signerCount", 65535);
  if (!present) {
    return { present: false, delegatorShareBps: 0, effectiveEpoch, signerCount: 0, memberShareBps: [] };
  }
  const bytesOffset = Number(u64FromWord(word(4)));
  const lenAt = bytesOffset;
  if (bytes.length < lenAt + 32) {
    throw new NodeRegistryError("getPendingCharter bytes-length word out of range");
  }
  const sharesLen = Number(u64FromWord(bytes.slice(lenAt, lenAt + 32)));
  const sharesAt = lenAt + 32;
  if (sharesLen < 32 || bytes.length < sharesAt + 32) {
    throw new NodeRegistryError("getPendingCharter packed-shares word truncated");
  }
  const packed = bytes.slice(sharesAt, sharesAt + 32);
  const memberShareBps = [];
  for (let i = 0; i < NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT; i += 1) {
    const at = 12 + 2 * i;
    memberShareBps.push(packed[at] << 8 | packed[at + 1]);
  }
  return { present: true, delegatorShareBps, effectiveEpoch, signerCount, memberShareBps };
}
function encodeCommitArchiveRootCalldata(args) {
  const leafCount = toUint64(args.leafCount, "leafCount");
  if (leafCount < NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT) {
    throw new NodeRegistryError(
      `leafCount must be >= ${NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT} (MIN_ARCHIVE_LEAF_COUNT), got ${leafCount}`
    );
  }
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.commitArchiveRoot),
      expectLength2(toBytes(args.peerId), 32, "peerId"),
      uint16Word(args.shardIndex),
      expectLength2(toBytes(args.shardRoot), 32, "shardRoot"),
      uint64Word(leafCount, "leafCount")
    )
  );
}
function encodeAnswerArchiveChallengeCalldata(args) {
  const leaf = toBytes(args.leaf);
  const proof = args.proof.map((p, i) => expectLength2(toBytes(p), 32, `proof[${i}]`));
  if (proof.length > NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH) {
    throw new NodeRegistryError(
      `proof length must be <= ${NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH}, got ${proof.length}`
    );
  }
  const leafPadded = padToWord(leaf);
  const leafOffset = 5n * 32n;
  const proofOffset = leafOffset + 32n + BigInt(leafPadded.length);
  const proofTail = concatBytes(
    uint64Word(BigInt(proof.length), "proofLength"),
    ...proof
  );
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.answerArchiveChallenge),
      expectLength2(toBytes(args.peerId), 32, "peerId"),
      uint16Word(args.shardIndex),
      uint64Word(args.epoch, "epoch"),
      uint64Word(leafOffset, "leafOffset"),
      uint64Word(proofOffset, "proofOffset"),
      uint64Word(BigInt(leaf.length), "leafLength"),
      leafPadded,
      proofTail
    )
  );
}
function slotEpochChallengeSeed(epoch) {
  const buf = new Uint8Array(1 + 8 + 1);
  buf[0] = NODE_REGISTRY_TAG_ARCHIVE_CHALLENGE;
  buf.set(u64BeBytes(toUint64(epoch, "epoch")), 1);
  buf[9] = NODE_REGISTRY_ARCHIVE_KIND_EPOCH_SEED;
  return bytesToHex(keccak_256(buf));
}
function protocolNonceForEpoch(seed, epoch) {
  const s = expectLength2(toBytes(seed), 32, "seed");
  const e = toUint64(epoch, "epoch");
  const digest = blake3(
    concatBytes(new TextEncoder().encode(NODE_REGISTRY_ARCHIVE_NONCE_DOMAIN), u64BeBytes(e), s)
  );
  let n = 0n;
  for (let i = 0; i < 8; i += 1) {
    n = n << 8n | BigInt(digest[i]);
  }
  return n;
}
function deriveArchiveChallenge(seed, opHash, shardIndex, epoch, leafCount) {
  const pinnedSeed = expectLength2(toBytes(seed), 32, "seed");
  const op = expectLength2(toBytes(opHash), 32, "opHash");
  const shard = expectUint16(shardIndex, "shardIndex");
  const e = toUint64(epoch, "epoch");
  const count = toUint64(leafCount, "leafCount");
  if (count === 0n) {
    return null;
  }
  const nonce = protocolNonceForEpoch(pinnedSeed, e);
  const challengeSeed = blake3(
    concatBytes(
      new TextEncoder().encode(NODE_REGISTRY_ARCHIVE_CHALLENGE_DOMAIN),
      pinnedSeed,
      op,
      u16BeBytes(shard),
      u64BeBytes(e),
      u64BeBytes(nonce)
    )
  );
  let idx = 0n;
  for (let i = 0; i < 8; i += 1) {
    idx = idx << 8n | BigInt(challengeSeed[i]);
  }
  return {
    opHash: bytesToHex(op),
    shardIndex: shard,
    leafIndex: idx % count,
    seed: bytesToHex(challengeSeed)
  };
}
function archiveMerkleLeafHash(leaf) {
  return blake3(concatBytes(Uint8Array.from([NODE_REGISTRY_MERKLE_LEAF_DOMAIN]), toBytes(leaf)));
}
function archiveMerkleInnerHash(left, right) {
  return blake3(
    concatBytes(
      Uint8Array.from([NODE_REGISTRY_MERKLE_INNER_DOMAIN]),
      expectLength2(toBytes(left), 32, "left"),
      expectLength2(toBytes(right), 32, "right")
    )
  );
}
function encodeSetProbeAuthorityCalldata(probeAuthority) {
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.setProbeAuthority),
      addressWord(probeAuthority, "probeAuthority")
    )
  );
}
function encodeGetProbeAuthorityCalldata() {
  return NODE_REGISTRY_SELECTORS.getProbeAuthority;
}
function decodeProbeAuthority(returnData) {
  const bytes = expectLength2(toBytes(returnData), 32, "probeAuthority");
  return bytesToHex(bytes.slice(12, 32));
}
function encodeAttestServiceProbeCalldata(args) {
  if (!isValidPublicServiceProbeMask(args.serviceMask)) {
    throw new NodeRegistryError(
      `serviceMask 0x${args.serviceMask.toString(16).padStart(8, "0")} is not a valid public-service mask`
    );
  }
  if (!isConcreteServiceProbeStatus(args.status)) {
    throw new NodeRegistryError(`status ${args.status} is not a concrete service-probe outcome`);
  }
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.attestServiceProbe),
      expectLength2(toBytes(args.opHash), 32, "opHash"),
      uint32Word(args.serviceMask),
      uint8Word(args.status),
      uint64Word(args.epoch, "epoch")
    )
  );
}
function slotClusterServiceScore(clusterId) {
  return scoreSlotHex(0, u32BeBytes(toUint32(clusterId, "clusterId")));
}
function slotArchiveChallengePass(clusterId, epoch) {
  return scoreSlotHex(
    1,
    concatBytes(u32BeBytes(toUint32(clusterId, "clusterId")), u64BeBytes(toUint64(epoch, "epoch")))
  );
}
function slotScoreServiceProbe(opHash, serviceBit) {
  if (!Number.isInteger(serviceBit) || serviceBit < 0 || serviceBit > 255) {
    throw new NodeRegistryError("serviceBit must be a u8 bit index");
  }
  return scoreSlotHex(
    2,
    concatBytes(expectLength2(toBytes(opHash), 32, "opHash"), Uint8Array.from([serviceBit]))
  );
}
function serviceMaskToBitIndex(mask) {
  if (!Number.isInteger(mask) || mask <= 0 || (mask & mask - 1) !== 0) {
    return null;
  }
  let bit = 0;
  let m = mask >>> 0;
  while ((m & 1) === 0) {
    m >>>= 1;
    bit += 1;
  }
  return bit;
}
function decodeScoreServiceProbe(word) {
  const bytes = expectLength2(toBytes(word), 32, "scoreServiceProbeWord");
  const status = bytes[31];
  let packed = 0n;
  for (const b of bytes) {
    packed = packed << 8n | BigInt(b);
  }
  return { epoch: packed >> 8n, status };
}
function slotProbeAuthority() {
  const buf = new Uint8Array(1 + 32 + 1);
  buf[0] = NODE_REGISTRY_TAG_TREASURY;
  buf[33] = 10;
  return bytesToHex(keccak_256(buf));
}
function slotClusterCharter(clusterId, subkind) {
  if (!Number.isInteger(subkind) || subkind < 0 || subkind > 255) {
    throw new NodeRegistryError("charter subkind must be a u8");
  }
  const buf = new Uint8Array(1 + 4 + 1);
  buf[0] = NODE_REGISTRY_TAG_CLUSTER_CHARTER;
  buf.set(u32BeBytes(toUint32(clusterId, "clusterId")), 1);
  buf[5] = subkind;
  return bytesToHex(keccak_256(buf));
}
function slotClusterCharterDelegator(clusterId) {
  return slotClusterCharter(clusterId, NODE_REGISTRY_SUBKIND_CHARTER_DELEGATOR_BPS);
}
function slotClusterCharterMembers(clusterId) {
  return slotClusterCharter(clusterId, NODE_REGISTRY_SUBKIND_CHARTER_MEMBER_SHARES);
}
function decodeActiveCharter(delegatorWord, membersWord) {
  const presence = leftPadToWord(toBytes(delegatorWord), "charterDelegatorWord");
  let raw = 0n;
  for (const b of presence) {
    raw = raw << 8n | BigInt(b);
  }
  if (raw === 0n) {
    return { present: false, delegatorShareBps: 0, memberShareBps: [] };
  }
  const delegatorShareBps = Number(raw - 1n > 0xffffn ? 0xffffn : raw - 1n);
  const packed = leftPadToWord(toBytes(membersWord), "charterMembersWord");
  const memberShareBps = [];
  for (let i = 0; i < NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT; i += 1) {
    const at = 12 + 2 * i;
    memberShareBps.push(packed[at] << 8 | packed[at + 1]);
  }
  return { present: true, delegatorShareBps, memberShareBps };
}
function decodeClusterJoinRequest(returnData) {
  const bytes = expectLength2(toBytes(returnData), 8 * 32, "clusterJoinRequest");
  const word = (i) => bytes.slice(i * 32, (i + 1) * 32);
  const statusCode = numberFromWord(word(5), "status", 255);
  return {
    owner: bytesToHex(word(0).slice(12, 32)),
    requestEpoch: u64FromWord(word(1)),
    snapshotThreshold: numberFromWord(word(2), "snapshotThreshold", 65535),
    snapshotN: numberFromWord(word(3), "snapshotN", 65535),
    voteCount: numberFromWord(word(4), "voteCount", 65535),
    statusCode,
    status: clusterJoinRequestStatusLabel(statusCode),
    bondLythoshi: uintFromWord(word(6)),
    sealRosterPending: numberFromWord(word(7), "sealRosterPending", 1) === 1
  };
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
function nodeHostingClassFromByte(b) {
  if (b === 0) return "bareMetal";
  if (b === 1) return "coLocation";
  return "cloud";
}
function nodeHostingClassToByte(c) {
  switch (c) {
    case "bareMetal":
      return 0;
    case "coLocation":
      return 1;
    default:
      return 2;
  }
}
function decodeOperatorNetworkMetadata(returnData) {
  const bytes = expectLength2(toBytes(returnData), 5 * 32, "operatorNetworkMetadata");
  return {
    asn: bytes[30] << 8 | bytes[31],
    // bytes3 is left-aligned in the head word.
    geoRegion: bytesToHex(bytes.slice(64, 67)),
    hostingClass: nodeHostingClassFromByte(bytes[95]),
    ipAddressHash: bytesToHex(bytes.slice(96, 128)),
    pcrDigest: bytesToHex(bytes.slice(128, 160))
  };
}
function decodeClusterDiversity(returnData) {
  const bytes = expectLength2(toBytes(returnData), 4 * 32, "clusterDiversity");
  const word = (i) => bytes[i * 32 + 30] << 8 | bytes[i * 32 + 31];
  return {
    score: word(0),
    asnVariance: word(1),
    geoVariance: word(2),
    hostingSpread: word(3)
  };
}
function decodeClusterFormedEvent(topics, data) {
  if (topics.length !== 3) {
    throw new NodeRegistryError(`ClusterFormed expects 3 topics, got ${topics.length}`);
  }
  const body = toBytes(data);
  if (body.length < 96) {
    throw new NodeRegistryError("ClusterFormed data shorter than head + roster length");
  }
  const clusterIdTopic = expectLength2(toBytes(topics[1]), 32, "clusterId topic");
  const epochTopic = expectLength2(toBytes(topics[2]), 32, "effectiveEpoch topic");
  const clusterId = u32FromWord(clusterIdTopic);
  const effectiveEpoch = u64FromWord(epochTopic);
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
    operatorRoster: bytesToHex(body.slice(96, rosterEnd))
  };
}
function deriveClusterAnchorAddress(roster, threshold) {
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 65535) {
    throw new NodeRegistryError("threshold must be a uint16");
  }
  const members = roster.map(
    (m, i) => expectLength2(toBytes(m), NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES, `roster[${i}]`)
  );
  members.sort(compareBytes);
  const parts = [
    new TextEncoder().encode(MULTISIG_ADDRESS_DERIVATION_DOMAIN),
    Uint8Array.from([threshold >> 8 & 255, threshold & 255])
  ];
  for (const member of members) {
    parts.push(u64BeBytes(BigInt(member.length)));
    parts.push(member);
  }
  return bytesToHex(blake3(concatBytes(...parts)).slice(0, 20));
}
function selectorHex(sig) {
  return [...keccak_256(new TextEncoder().encode(sig)).slice(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function u32FromWord(word) {
  return (word[28] << 24 | word[29] << 16 | word[30] << 8 | word[31]) >>> 0;
}
function u64FromWord(word) {
  let v = 0n;
  for (let i = 24; i < 32; i++) {
    v = v << 8n | BigInt(word[i]);
  }
  return v;
}
function uintFromWord(word) {
  let v = 0n;
  for (const byte of word) {
    v = v << 8n | BigInt(byte);
  }
  return v;
}
function numberFromWord(word, name, max) {
  const value = uintFromWord(word);
  if (value > BigInt(max)) {
    throw new NodeRegistryError(`${name} must be <= ${max}`);
  }
  return Number(value);
}
function clusterJoinRequestStatusLabel(status) {
  switch (status) {
    case 0:
      return "none";
    case 1:
      return "open";
    case 2:
      return "admitted";
    case 3:
      return "cancelled";
    case 4:
      return "expired";
    default:
      return "unknown";
  }
}
function u64BeBytes(value) {
  const out = new Uint8Array(8);
  let n = value;
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}
function u32BeBytes(value) {
  const n = expectUint32(value, "uint32");
  return Uint8Array.from([n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255]);
}
function u16BeBytes(value) {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new NodeRegistryError("uint16 value out of range");
  }
  return Uint8Array.from([value >>> 8 & 255, value & 255]);
}
function expectUint16(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new NodeRegistryError(`${name} must be a uint16`);
  }
  return value;
}
function uint16Word(value) {
  const out = new Uint8Array(32);
  out.set(u16BeBytes(value), 30);
  return out;
}
function addressWord(value, name) {
  const addr = expectLength2(toBytes(value), 20, name);
  const out = new Uint8Array(32);
  out.set(addr, 12);
  return out;
}
function flattenFixedWidth(value, width, name) {
  let flat;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] !== "number") {
    const parts = value.map(
      (v, i) => expectLength2(toBytes(v), width, `${name}[${i}]`)
    );
    flat = concatBytes(...parts);
  } else {
    flat = toBytes(value);
  }
  if (flat.length === 0 || flat.length % width !== 0) {
    throw new NodeRegistryError(`${name} must be a non-empty multiple of ${width} bytes, got ${flat.length}`);
  }
  return flat;
}
function scoreSlotHex(kind, tail) {
  return bytesToHex(
    keccak_256(concatBytes(Uint8Array.from([NODE_REGISTRY_TAG_SERVICE_SCORE, kind]), tail))
  );
}
function compareBytes(a, b) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
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
function toUint32(value, name) {
  let parsed;
  if (typeof value === "bigint") {
    parsed = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new NodeRegistryError(`${name} must be a safe integer`);
    }
    parsed = BigInt(value);
  } else {
    const trimmed = value.trim();
    if (!/^\d+$/u.test(trimmed)) {
      throw new NodeRegistryError(`${name} must be a decimal uint32`);
    }
    parsed = BigInt(trimmed);
  }
  if (parsed < 0n || parsed > 0xffffffffn) {
    throw new NodeRegistryError(`${name} must fit uint32`);
  }
  return Number(parsed);
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
function uint64Word(value, name) {
  const n = toUint64(value, name);
  const out = new Uint8Array(32);
  let rest = n;
  for (let i = 31; i >= 24; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
function toUint64(value, name) {
  let parsed;
  if (typeof value === "bigint") {
    parsed = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new NodeRegistryError(`${name} must be a safe integer`);
    }
    parsed = BigInt(value);
  } else {
    const trimmed = value.trim();
    if (!/^\d+$/u.test(trimmed)) {
      throw new NodeRegistryError(`${name} must be a decimal uint64`);
    }
    parsed = BigInt(trimmed);
  }
  if (parsed < 0n || parsed > 0xffffffffffffffffn) {
    throw new NodeRegistryError(`${name} must fit uint64`);
  }
  return parsed;
}
function padToWord(bytes) {
  const paddedLength = Math.ceil(bytes.length / 32) * 32;
  if (paddedLength === bytes.length) return bytes;
  const out = new Uint8Array(paddedLength);
  out.set(bytes);
  return out;
}
function leftPadToWord(bytes, name) {
  if (bytes.length === 32) return bytes;
  if (bytes.length > 32) {
    throw new NodeRegistryError(`${name} must be <= 32 bytes, got ${bytes.length}`);
  }
  const out = new Uint8Array(32);
  out.set(bytes, 32 - bytes.length);
  return out;
}
function toBytes(value) {
  if (typeof value === "string") {
    return hexToBytes(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function displayTextBytes(value, maxBytes, name) {
  for (const ch of value) {
    const code = ch.codePointAt(0);
    if (code !== void 0 && (code >= 0 && code <= 31 || code >= 127 && code <= 159)) {
      throw new NodeRegistryError(`${name} must not contain control characters`);
    }
  }
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > maxBytes) {
    throw new NodeRegistryError(`${name} must be <= ${maxBytes} UTF-8 bytes`);
  }
  return bytes;
}
function hexToBytes(hex) {
  const raw = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]*$/.test(raw)) {
    throw new NodeRegistryError("invalid hex bytes");
  }
  const body = raw.length % 2 !== 0 ? `0${raw}` : raw;
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
function bigintToBeBytes(value, bytes, label) {
  if (value < 0n || value >= 1n << BigInt(bytes * 8)) {
    throw new Error(`${label} out of ${bytes * 8}-bit range`);
  }
  const out = new Uint8Array(bytes);
  let v = value;
  for (let i = bytes - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
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

// src/crypto/submission.ts
function buildPlaintextSubmission(args) {
  const signed = args.backend.signEvmTx(args.tx);
  return {
    signedTxWireHex: `0x${signed.wireHex}`,
    innerTxHashHex: bytesToHex2(signed.txHash),
    innerSighashHex: bytesToHex2(signed.sighash),
    innerWireBytes: signed.wireBytes.length
  };
}
async function submitPlaintextTransaction(client, signedTxWireHex, expectedTxHashHex) {
  const returned = await client.call("mesh_submitTx", [signedTxWireHex]);
  const returnedBytes = hexToBytes2(returned, "mesh_submitTx tx hash");
  if (returnedBytes.length !== 32) {
    throw new Error(
      `mesh_submitTx tx hash must be 32 bytes, got ${returnedBytes.length}`
    );
  }
  const expectedBytes = hexToBytes2(expectedTxHashHex, "expected tx hash");
  if (!bytesEqual(returnedBytes, expectedBytes)) {
    throw new Error(
      `mesh_submitTx returned tx hash ${bytesToHex2(returnedBytes)} but the locally computed canonical hash is ${bytesToHex2(expectedBytes)}`
    );
  }
  return bytesToHex2(returnedBytes);
}
function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
var LYTH_DECIMALS = 18;
var NATIVE_LYTH_DECIMALS = LYTH_DECIMALS;
var LYTHOSHI_PER_LYTH = 1000000000000000000n;
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
    throw new MrvValidationError(`lyth amount supports at most ${NATIVE_LYTH_DECIMALS} decimal places`);
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
      failures.push(`defaultFeeText fee must be a canonical ${NATIVE_LYTH_DECIMALS}-decimal LYTH amount`);
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
  return submitMrvPlaintextNativeTx(client, backend, plan);
}
async function submitMrvDeployPayloadNativeTx(client, backend, artifactBytes, options) {
  const plan = buildMrvDeployPayloadNativeTxPlan(artifactBytes, options);
  assertMrvDeployNativeSubmissionPlan(plan);
  return submitMrvPlaintextNativeTx(client, backend, plan);
}
async function submitMrvCallNativeTx(client, backend, contractAddress, input, options) {
  const plan = buildMrvCallNativeTxPlan(contractAddress, input, options);
  assertMrvCallNativeSubmissionPlan(plan);
  return submitMrvPlaintextNativeTx(client, backend, plan);
}
async function submitMrvPlaintextNativeTx(client, backend, plan) {
  const submission = buildPlaintextSubmission({ backend, tx: plan.tx });
  return {
    ...plan,
    ...submission,
    txHash: await submitPlaintextTransaction(
      client,
      submission.signedTxWireHex,
      submission.innerTxHashHex
    )
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
  const expectedFields = /* @__PURE__ */ new Set([...MRV_STRUCTURED_FEE_FIELDS, "total_lyth"]);
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
  const totalLyth = "total_lyth" in value ? lythDecimalField(value, "total_lyth", failures, label) : void 0;
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

// src/crypto/tx.ts
function encodeTransactionForHash(fields, tag) {
  const n = normalizeTxFields(fields);
  return concatBytes2(
    Uint8Array.of(tag),
    bigintToBeBytes(n.chainId, 8, "chainId"),
    bigintToBeBytes(n.nonce, 8, "nonce"),
    bigintToBeBytes(n.maxPriorityFeePerGas, 32, "maxPriorityFeePerGas"),
    bigintToBeBytes(n.maxFeePerGas, 32, "maxFeePerGas"),
    bigintToBeBytes(n.gasLimit, 8, "gasLimit"),
    n.to === null ? Uint8Array.of(0) : concatBytes2(Uint8Array.of(1), n.to),
    bigintToBeBytes(n.value, 32, "value"),
    bigintToBeBytes(BigInt(n.input.length), 4, "input.length"),
    n.input,
    new Uint8Array(4),
    // access_list length
    encodeExtensionsForHash(n.extensions)
  );
}
function bincodeSignedTransaction(fields, signature, publicKey) {
  const n = normalizeTxFields(fields);
  const sig = expectBytes(signature, ML_DSA_65_SIGNATURE_LEN, "ML-DSA-65 signature");
  const pk = expectBytes(publicKey, ML_DSA_65_PUBLIC_KEY_LEN, "ML-DSA-65 public key");
  const w = new BincodeWriter();
  w.u64(n.chainId);
  w.u64(n.nonce);
  w.bytes(uint256Be(n.maxPriorityFeePerGas, "maxPriorityFeePerGas"));
  w.bytes(uint256Be(n.maxFeePerGas, "maxFeePerGas"));
  w.u64(n.gasLimit);
  if (n.to === null) {
    w.u8(0);
  } else {
    w.u8(1);
    w.bytes(n.to);
  }
  w.bytes(uint256Be(n.value, "value"));
  w.bytes(n.input);
  w.u64(0n);
  w.u64(BigInt(n.extensions.length));
  for (const ext of n.extensions) bincodeTypedExtensionInto(w, ext);
  bincodeMlDsa65OpaqueInto(w, sig);
  bincodeMlDsa65OpaqueInto(w, pk);
  return w.toBytes();
}
function normalizeTxFields(fields) {
  return {
    chainId: parseBigint(fields.chainId, "chainId"),
    nonce: parseBigint(fields.nonce, "nonce"),
    maxPriorityFeePerGas: parseBigint(fields.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
    maxFeePerGas: parseBigint(fields.maxFeePerGas, "maxFeePerGas"),
    gasLimit: parseBigint(fields.gasLimit, "gasLimit"),
    to: normalizeTo(fields.to),
    value: parseBigint(fields.value, "value"),
    input: normalizeBytes(fields.input ?? new Uint8Array(0), "input"),
    extensions: normalizeExtensions(fields.extensions)
  };
}
function normalizeTo(value) {
  if (value === null) return null;
  const bytes = normalizeBytes(value, "to");
  return expectBytes(bytes, 20, "to");
}
function normalizeBytes(value, label) {
  if (typeof value === "string") return hexToBytes2(value, label);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function normalizeExtensions(value) {
  if (value === void 0) return [];
  return value.map((ext, index) => {
    if (!Number.isInteger(ext.kind) || ext.kind < 0 || ext.kind > 255) {
      throw new Error(`extensions[${index}].kind out of u8 range`);
    }
    const body = normalizeBytes("bodyHex" in ext ? ext.bodyHex : ext.body, `extensions[${index}].body`);
    if (body.length > 4294967295) {
      throw new Error(`extensions[${index}].body exceeds u32 length`);
    }
    return { kind: ext.kind, body };
  });
}
function encodeExtensionsForHash(extensions) {
  const chunks = [bigintToBeBytes(BigInt(extensions.length), 4, "extensions.length")];
  for (const ext of extensions) {
    chunks.push(
      Uint8Array.of(ext.kind),
      bigintToBeBytes(BigInt(ext.body.length), 4, "extension.body.length"),
      ext.body
    );
  }
  return concatBytes2(...chunks);
}
function uint256Be(value, label) {
  if (value < 0n || value >= 1n << 256n) throw new Error(`${label} out of u256 range`);
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}
function bincodeMlDsa65OpaqueInto(w, raw) {
  w.enumVariant(ENUM_VARIANT_INDEX_ML_DSA_65);
  w.u16(STANDARD_ALGO_NUMBER_ML_DSA_65);
  w.bytes(raw);
}
function bincodeTypedExtensionInto(w, ext) {
  w.u8(ext.kind);
  w.bytes(ext.body);
}

// src/crypto/ml-dsa.ts
var ML_DSA_65_SEED_LEN = 32;
var ML_DSA_65_SIGNING_KEY_LEN = 4032;
var ML_DSA_65_PUBLIC_KEY_LEN = 1952;
var ML_DSA_65_SIGNATURE_LEN = 3309;
var STANDARD_ALGO_NUMBER_ML_DSA_65 = 1001;
var ENUM_VARIANT_INDEX_ML_DSA_65 = 3;
var ADDRESS_DERIVATION_DOMAIN = "MONO_ADDRESS_BLAKE3_20_V1";
var ADDRESS_DERIVATION_DOMAIN_BYTES = new TextEncoder().encode(ADDRESS_DERIVATION_DOMAIN);
var MlDsa65Backend = class _MlDsa65Backend {
  #secretKey;
  #publicKey;
  #addressBytes;
  #disposed = false;
  constructor(secretKey, publicKey) {
    this.#secretKey = expectBytes(secretKey, ML_DSA_65_SIGNING_KEY_LEN, "ML-DSA-65 secret key").slice();
    this.#publicKey = expectBytes(publicKey, ML_DSA_65_PUBLIC_KEY_LEN, "ML-DSA-65 public key").slice();
    this.#addressBytes = mlDsa65AddressBytes(this.#publicKey);
  }
  static fromSeed(seed) {
    const kp = ml_dsa65.keygen(expectBytes(seed, ML_DSA_65_SEED_LEN, "ML-DSA-65 seed"));
    return new _MlDsa65Backend(kp.secretKey, kp.publicKey);
  }
  publicKey() {
    return this.#publicKey.slice();
  }
  addressBytes() {
    return this.#addressBytes.slice();
  }
  getAddress() {
    return bytesToHex2(this.#addressBytes);
  }
  sign(message) {
    if (this.#disposed) {
      throw new Error("MlDsa65Backend disposed");
    }
    return ml_dsa65.sign(message, this.#secretKey, { extraEntropy: false });
  }
  /**
   * Best-effort deterministic wipe of the in-memory secret key. Zeroes the
   * SDK-held `#secretKey` copy and makes any subsequent `sign()` /
   * `signPrehash()` / `signEvmTx()` throw `"MlDsa65Backend disposed"` rather
   * than signing with a zeroed key. Idempotent. Public material
   * (`publicKey()` / `getAddress()` / `verify()`) stays usable.
   *
   * Defense-in-depth (S1-01): narrows the post-lock residency window of the
   * ML-DSA-65 secret in the JS heap. `@noble/post-quantum`'s internal
   * transient keygen/sign buffers are out of scope; the SDK-held copy is the
   * meaningful residency win.
   */
  dispose() {
    this.#secretKey.fill(0);
    this.#disposed = true;
  }
  /** Alias for {@link dispose}. */
  zeroize() {
    this.dispose();
  }
  /** Whether {@link dispose} has been called (the secret key is wiped). */
  get disposed() {
    return this.#disposed;
  }
  signPrehash(digest) {
    return this.sign(expectBytes(digest, 32, "prehash"));
  }
  verify(message, signature) {
    return ml_dsa65.verify(
      expectBytes(signature, ML_DSA_65_SIGNATURE_LEN, "ML-DSA-65 signature"),
      message,
      this.#publicKey
    );
  }
  signEvmTx(fields) {
    const txHashPreimage = encodeTransactionForHash(fields, 1);
    const sighash = keccak_256(txHashPreimage);
    const signature = this.sign(sighash);
    const wireBytes = bincodeSignedTransaction(fields, signature, this.#publicKey);
    const txHash = keccak_256(
      concatBytes2(
        encodeTransactionForHash(fields, 2),
        signature,
        this.#publicKey
      )
    );
    return {
      wireHex: bytesToHex2(wireBytes).slice(2),
      wireBytes,
      sighash,
      txHash
    };
  }
};
function mlDsa65AddressFromPublicKey(publicKey) {
  return bytesToHex2(mlDsa65AddressBytes(publicKey));
}
function mlDsa65AddressBytes(publicKey) {
  const bytes = expectBytes(publicKey, ML_DSA_65_PUBLIC_KEY_LEN, "ML-DSA-65 public key");
  return blake3(concatBytes2(
    ADDRESS_DERIVATION_DOMAIN_BYTES,
    bigintToBeBytes(BigInt(STANDARD_ALGO_NUMBER_ML_DSA_65), 2, "ML-DSA-65 algo id"),
    bytes
  )).slice(0, 20);
}

// src/registry.ts
var BLS_PUBLIC_KEY_BYTE_LENGTH = 48;
var TESTNET_69420 = {
  chain_id: 69420,
  network: "testnet-69420",
  display_name: "Monolythium Testnet",
  description: "Public Monolythium testnet. Testnet state may reset without notice; do not store value on this network.",
  genesis_hash: "0xd56f9763ca849c5482cae27c7e2551f891684063b89afd53aadeb55868453959",
  binary_sha: "42cc2120",
  rpc: [
    {
      url: "http://178.105.12.9:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-1"
    },
    {
      url: "http://178.105.15.216:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-2; primary foundation seed"
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
    },
    {
      url: "http://142.132.180.99:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-8"
    },
    {
      url: "http://95.217.156.190:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "operator-10"
    },
    {
      url: "http://162.55.54.198:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "operator-9"
    },
    {
      url: "http://178.105.45.210:8545",
      provider: "monolythium-foundation",
      region: "fsn1",
      tier: "official",
      notes: "relay-1"
    },
    {
      url: "http://65.21.252.34:8545",
      provider: "monolythium-foundation",
      region: "hel1",
      tier: "official",
      notes: "relay-2"
    }
  ],
  p2p: [
    {
      multiaddr: "/ip4/178.105.12.9/tcp/29898/p2p/12D3KooWGgh9vYbNSqYbci8w7bg2AAaFWx7umN1ADjjcUoUTF2Za",
      region: "fsn1"
    },
    {
      multiaddr: "/ip4/178.105.15.216/tcp/29898/p2p/12D3KooWPUMj4vt1ee1Ug2QMJQwbDHSJ936JVaqw3iLXtAqPrq7R",
      region: "fsn1"
    },
    {
      multiaddr: "/ip4/178.104.233.182/tcp/29898/p2p/12D3KooWLPNJFUZhXyc1S7YvjMiKXyrNKCN3eFegDFF5UZAio7NJ",
      region: "nbg1"
    },
    {
      multiaddr: "/ip4/65.108.94.1/tcp/29898/p2p/12D3KooWRAuuQa5iEAzLUpLnyZ9VM53dvZMt3FPj7smDcwXn3oxz",
      region: "hel1"
    },
    {
      multiaddr: "/ip4/95.216.154.155/tcp/29898/p2p/12D3KooWFc9sVuCAuLxFTVy8KN5KXhyDvPjKkU98ySK81dFyStN8",
      region: "hel1"
    },
    {
      multiaddr: "/ip4/87.99.145.48/tcp/29898/p2p/12D3KooWL2KLRUHybGLd736nusDRTF2V1a9waeTsxKPwF78HDCmb",
      region: "ash"
    },
    {
      multiaddr: "/ip4/5.223.85.76/tcp/29898/p2p/12D3KooWHvobdzzEAiKcFkgdkRfr8vWGyWYfBoWS3jnPycvfwGrK",
      region: "sin"
    },
    {
      multiaddr: "/ip4/142.132.180.99/tcp/29898/p2p/12D3KooWBcAeWScYmDWPTjNM47CkKR4vEf44CNhDCcWuGpyY7Hko",
      region: "fsn1"
    },
    {
      multiaddr: "/ip4/162.55.54.198/tcp/29898/p2p/12D3KooWRBA5Wzs619GuMY2NrDD6fGoLYCK2tkXff2JAZyXn7RvR",
      region: "fsn1"
    },
    {
      multiaddr: "/ip4/95.217.156.190/tcp/29898/p2p/12D3KooWPBr8guuWoZT59AobZEBHDZqKgwHWAP3aKUzKWeGTa7Z6",
      region: "hel1"
    },
    {
      multiaddr: "/ip4/178.105.45.210/tcp/29898/p2p/12D3KooWQRpCMLezJmvqqpbpEu8ixGHgonqianG1aVZjw6GiStbd",
      region: "fsn1"
    },
    {
      multiaddr: "/ip4/65.21.252.34/tcp/29898/p2p/12D3KooWRGzTwPX21Nee2c39RWuT2ayNWb6NMX19jCx8recrNeXL",
      region: "hel1"
    }
  ]
};
var CHAIN_REGISTRY = {
  "testnet-69420": TESTNET_69420
};
var CHAIN_REGISTRY_RAW_BASE = "https://raw.githubusercontent.com/monolythium/chain-registry/master/chains";
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
function getNoEvmReceiptTrustPolicy(network, registry = CHAIN_REGISTRY) {
  const info = registry[network];
  if (!info) {
    throw new Error(`unknown Monolythium network: ${network}`);
  }
  return noEvmReceiptTrustPolicyFromChainInfo(info);
}
function noEvmReceiptTrustPolicyFromChainInfo(info) {
  const trust = info.receipt_proof_trust;
  if (trust == null || trust.archive == null && trust.finality == null) return null;
  const policy = { chainId: info.chain_id };
  if (trust.archive != null) {
    policy.archive = {
      threshold: assertSafeIntegerAtLeast(
        trust.archive.signature_threshold,
        1,
        "receipt_proof_trust.archive.signature_threshold"
      ),
      validFromHeight: trust.archive.valid_from_height,
      validToHeight: trust.archive.valid_to_height,
      trustedSigners: trust.archive.signers.map((signer, index) => ({
        publicKey: decodeFixedHex(
          signer.public_key,
          ML_DSA_65_PUBLIC_KEY_LEN,
          `receipt_proof_trust.archive.signers[${index}].public_key`
        ),
        signerId: signer.signer_id,
        validFromHeight: signer.valid_from_height,
        validToHeight: signer.valid_to_height
      }))
    };
  }
  if (trust.finality != null) {
    const threshold = assertSafeIntegerAtLeast(
      trust.finality.threshold,
      1,
      "receipt_proof_trust.finality.threshold"
    );
    const chainId = trust.finality.chain_id ?? info.chain_id;
    if (trust.finality.mode === "cluster") {
      if (trust.finality.cluster_public_key == null) {
        throw new Error(
          "receipt_proof_trust.finality.cluster_public_key is required for cluster mode"
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
          "receipt_proof_trust.finality.committee_size"
        ),
        clusterPublicKey: decodeFixedHex(
          trust.finality.cluster_public_key,
          BLS_PUBLIC_KEY_BYTE_LENGTH,
          "receipt_proof_trust.finality.cluster_public_key"
        )
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
            `receipt_proof_trust.finality.signers[${index}].authority_index`
          ),
          publicKey: decodeFixedHex(
            signer.public_key,
            BLS_PUBLIC_KEY_BYTE_LENGTH,
            `receipt_proof_trust.finality.signers[${index}].public_key`
          ),
          validFromRound: signer.valid_from_round,
          validToRound: signer.valid_to_round
        }))
      };
    } else {
      throw new Error(
        `unsupported receipt_proof_trust.finality.mode: ${String(trust.finality.mode)}`
      );
    }
  }
  return policy;
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
        threshold: 0
      };
      continue;
    }
    if (line === "[[receipt_proof_trust.finality.signers]]") {
      section = "receipt_proof_trust.finality.signers";
      const trust = ensureReceiptProofTrust(info);
      trust.finality ??= {
        mode: "multisig",
        threshold: 0,
        signers: []
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
      info[key] = value;
    } else if (section === "rpc" || section === "p2p" || section === "explorer") {
      const list = info[section];
      const target = list[list.length - 1];
      target[key] = value;
    } else if (section === "receipt_proof_trust.archive") {
      const trust = ensureReceiptProofTrust(info);
      trust.archive ??= { signature_threshold: 0, signers: [] };
      trust.archive[key] = value;
    } else if (section === "receipt_proof_trust.archive.signers") {
      const archive = ensureReceiptProofTrust(info).archive ??= {
        signature_threshold: 0,
        signers: []
      };
      const target = archive.signers[archive.signers.length - 1];
      target[key] = value;
    } else if (section === "receipt_proof_trust.finality") {
      const trust = ensureReceiptProofTrust(info);
      trust.finality ??= { mode: "cluster", threshold: 0 };
      trust.finality[key] = value;
    } else {
      const finality = ensureReceiptProofTrust(info).finality ??= {
        mode: "multisig",
        threshold: 0,
        signers: []
      };
      finality.signers ??= [];
      const target = finality.signers[finality.signers.length - 1];
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
  if (info.receipt_proof_trust) {
    out.receipt_proof_trust = normalizeReceiptProofTrust(info.receipt_proof_trust);
  }
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
function ensureReceiptProofTrust(info) {
  info.receipt_proof_trust ??= {};
  return info.receipt_proof_trust;
}
function normalizeReceiptProofTrust(trust) {
  const out = {};
  if (trust.archive == null || trust.finality == null) {
    throw new Error("receipt_proof_trust must include both archive and finality policies");
  }
  if (trust.archive != null) {
    const threshold = assertSafeIntegerAtLeast(
      trust.archive.signature_threshold,
      1,
      "receipt_proof_trust.archive.signature_threshold"
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
      "receipt_proof_trust.archive"
    );
    assertUniqueStrings(
      trust.archive.signers.map((signer) => signer.public_key),
      "receipt_proof_trust.archive.signers.public_key"
    );
    assertUniqueStrings(
      trust.archive.signers.flatMap((signer) => signer.signer_id ? [signer.signer_id] : []),
      "receipt_proof_trust.archive.signers.signer_id"
    );
    out.archive = {
      signature_threshold: threshold,
      valid_from_height: optionalSafeInteger(trust.archive.valid_from_height),
      valid_to_height: optionalSafeInteger(trust.archive.valid_to_height),
      signers: trust.archive.signers.map((signer) => {
        assertOptionalRange(
          signer.valid_from_height,
          signer.valid_to_height,
          "receipt_proof_trust.archive.signers"
        );
        return {
          public_key: assertString(
            signer.public_key,
            "receipt_proof_trust.archive.signers.public_key"
          ),
          signer_id: optionalString(signer.signer_id),
          valid_from_height: optionalSafeInteger(signer.valid_from_height),
          valid_to_height: optionalSafeInteger(signer.valid_to_height),
          notes: optionalString(signer.notes)
        };
      })
    };
  }
  if (trust.finality != null) {
    const mode = trust.finality.mode;
    if (mode !== "cluster" && mode !== "multisig") {
      throw new Error(`unsupported receipt_proof_trust.finality.mode: ${String(mode)}`);
    }
    const finality = {
      mode,
      chain_id: optionalSafeInteger(trust.finality.chain_id),
      threshold: assertSafeIntegerAtLeast(
        trust.finality.threshold,
        1,
        "receipt_proof_trust.finality.threshold"
      ),
      valid_from_round: optionalSafeInteger(trust.finality.valid_from_round),
      valid_to_round: optionalSafeInteger(trust.finality.valid_to_round)
    };
    assertOptionalRange(
      trust.finality.valid_from_round,
      trust.finality.valid_to_round,
      "receipt_proof_trust.finality"
    );
    if (mode === "cluster") {
      finality.committee_size = assertSafeIntegerAtLeast(
        trust.finality.committee_size,
        1,
        "receipt_proof_trust.finality.committee_size"
      );
      if (finality.threshold > finality.committee_size) {
        throw new Error("receipt_proof_trust.finality.threshold exceeds committee_size");
      }
      finality.cluster_public_key = assertString(
        trust.finality.cluster_public_key,
        "receipt_proof_trust.finality.cluster_public_key"
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
        "receipt_proof_trust.finality.signers.authority_index"
      );
      assertUniqueStrings(
        signers.map((signer) => signer.public_key),
        "receipt_proof_trust.finality.signers.public_key"
      );
      finality.signers = signers.map((signer) => {
        assertOptionalRange(
          signer.valid_from_round,
          signer.valid_to_round,
          "receipt_proof_trust.finality.signers"
        );
        return {
          authority_index: assertSafeIntegerAtLeast(
            signer.authority_index,
            0,
            "receipt_proof_trust.finality.signers.authority_index"
          ),
          public_key: assertString(
            signer.public_key,
            "receipt_proof_trust.finality.signers.public_key"
          ),
          valid_from_round: optionalSafeInteger(signer.valid_from_round),
          valid_to_round: optionalSafeInteger(signer.valid_to_round),
          notes: optionalString(signer.notes)
        };
      });
    }
    out.finality = finality;
  }
  return out;
}
function decodeFixedHex(value, expectedLength, field2) {
  const bytes = hexToBytes2(assertString(value, field2), field2);
  if (bytes.length !== expectedLength) {
    throw new Error(`${field2} must be ${expectedLength} bytes, got ${bytes.length}`);
  }
  return bytes;
}
function assertString(value, field2) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field2} must be a non-empty string`);
  }
  return value;
}
function optionalString(value) {
  return value === void 0 ? void 0 : assertString(value, "optional string field");
}
function optionalSafeInteger(value) {
  if (value === void 0) return void 0;
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error("optional integer field must be a non-negative safe integer");
  }
  return Number(value);
}
function assertSafeIntegerAtLeast(value, min, field2) {
  if (!Number.isSafeInteger(value) || Number(value) < min) {
    throw new Error(`${field2} must be a safe integer >= ${min}`);
  }
  return Number(value);
}
function assertOptionalRange(from, to, field2) {
  const start = optionalSafeInteger(from);
  const end = optionalSafeInteger(to);
  if (start != null && end != null && end < start) {
    throw new Error(`${field2} valid_to must be >= valid_from`);
  }
}
function assertUniqueStrings(values, field2) {
  const seen = /* @__PURE__ */ new Set();
  for (const value of values) {
    const normalized = assertString(value, field2).toLowerCase();
    if (seen.has(normalized)) {
      throw new Error(`${field2} values must be unique`);
    }
    seen.add(normalized);
  }
}
function assertUniqueNumbers(values, field2) {
  const seen = /* @__PURE__ */ new Set();
  for (const value of values) {
    const normalized = assertSafeIntegerAtLeast(value, 0, field2);
    if (seen.has(normalized)) {
      throw new Error(`${field2} values must be unique`);
    }
    seen.add(normalized);
  }
}

// src/types.ts
function encodeBlockSelector(b) {
  if (typeof b === "number") return `0x${b.toString(16)}`;
  if (typeof b === "bigint") return `0x${b.toString(16)}`;
  return b;
}
var NameRegistryError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "NameRegistryError";
  }
};
var NAME_REGISTRY_SELECTORS = {
  register: selectorHex2("register(string,address)"),
  proposeTransfer: selectorHex2("proposeTransfer(string,address)"),
  acceptTransfer: selectorHex2("acceptTransfer(string)")
};
var NAME_BASE_MULTIPLIER = {
  human: 5,
  agent: 2,
  cluster: 20,
  contract: 10
};
var NAME_FALLBACK_FEE_UNIT_LYTHOSHI = 1000000000000n;
var NAME_MAX_LEN = 80;
var NAME_LABEL_MIN_LEN = 1;
var NAME_LABEL_MAX_LEN = 63;
function nameRegistryAddressHex() {
  return PRECOMPILE_ADDRESSES.NAME_REGISTRY.toLowerCase();
}
function nameLengthModifierX10(labelLen) {
  if (labelLen === 1) return 1e3;
  if (labelLen === 2) return 500;
  if (labelLen === 3) return 100;
  if (labelLen === 4) return 50;
  if (labelLen === 5) return 30;
  if (labelLen >= 6 && labelLen <= 12) return 10;
  if (labelLen >= 13 && labelLen <= 20) return 15;
  if (labelLen >= 21 && labelLen <= 32) return 30;
  if (labelLen >= 33 && labelLen <= 50) return 100;
  if (labelLen >= 51 && labelLen <= 63) return 500;
  return null;
}
function parseNameCategory(name) {
  if (name.length === 0) throw new NameRegistryError("name is empty");
  if (name.length > NAME_MAX_LEN) throw new NameRegistryError(`name exceeds ${NAME_MAX_LEN} chars`);
  const parts = name.split(".");
  if (parts.some((p) => p.length === 0)) {
    throw new NameRegistryError("name has an empty label");
  }
  for (const label of parts) validateLabel(label);
  if (parts[parts.length - 1] !== "mono") {
    throw new NameRegistryError("name must end with .mono");
  }
  const primaryLabelLen = parts[0].length;
  switch (parts.length) {
    case 2:
      if (STRUCTURAL_RESERVES.has(parts[0])) {
        throw new NameRegistryError(`"${parts[0]}.mono" is a structural reserve`);
      }
      return { category: "human", primaryLabelLen };
    case 3: {
      const anchor = parts[1];
      if (anchor === "cluster") return { category: "cluster", primaryLabelLen };
      if (anchor === "contract") return { category: "contract", primaryLabelLen };
      if (anchor === "system") return { category: "system", primaryLabelLen };
      throw new NameRegistryError(`unknown name category anchor ".${anchor}.mono"`);
    }
    case 4:
      if (parts[1] !== "agent") {
        throw new NameRegistryError("unknown 4-label name form (expected <x>.agent.<human>.mono)");
      }
      return { category: "agent", primaryLabelLen };
    default:
      throw new NameRegistryError("unrecognised name structure");
  }
}
function nameRegistrationCost(category, primaryLabelLen, feeUnitLythoshi) {
  if (category === "system") {
    throw new NameRegistryError("system names are not registerable via this path");
  }
  const base = BigInt(NAME_BASE_MULTIPLIER[category]);
  const modX10 = nameLengthModifierX10(primaryLabelLen);
  if (modX10 === null) {
    throw new NameRegistryError("primary label length is outside the priceable 1..=63 range");
  }
  return base * BigInt(modX10) * feeUnitLythoshi / 10n;
}
function encodeNameRegisterCall(name, owner) {
  return encodeStringAddressCall(NAME_REGISTRY_SELECTORS.register, name, owner);
}
function encodeNameProposeTransferCall(name, recipient) {
  return encodeStringAddressCall(NAME_REGISTRY_SELECTORS.proposeTransfer, name, recipient);
}
function encodeNameAcceptTransferCall(name) {
  const nameBytes = new TextEncoder().encode(name);
  return bytesToHex4(
    concatBytes4(
      hexToBytes4(NAME_REGISTRY_SELECTORS.acceptTransfer),
      // Single head word → the string offset is 0x20 (one word precedes the tail).
      uint256Word(0x20n),
      uint256Word(BigInt(nameBytes.length)),
      padTo32(nameBytes)
    )
  );
}
var STRUCTURAL_RESERVES = /* @__PURE__ */ new Set(["agent", "cluster", "contract", "system"]);
function encodeStringAddressCall(selector, name, address) {
  const nameBytes = new TextEncoder().encode(name);
  return bytesToHex4(
    concatBytes4(
      hexToBytes4(selector),
      // Two head words (string offset, address) → string tail starts at 0x40.
      uint256Word(0x40n),
      addressWord2(address),
      uint256Word(BigInt(nameBytes.length)),
      padTo32(nameBytes)
    )
  );
}
function validateLabel(label) {
  if (label.length < NAME_LABEL_MIN_LEN || label.length > NAME_LABEL_MAX_LEN) {
    throw new NameRegistryError(`label "${label}" must be ${NAME_LABEL_MIN_LEN}..${NAME_LABEL_MAX_LEN} chars`);
  }
  if (label.startsWith("-") || label.endsWith("-")) {
    throw new NameRegistryError(`label "${label}" may not start or end with a hyphen`);
  }
  if (label.includes("--")) {
    throw new NameRegistryError(`label "${label}" may not contain a double hyphen`);
  }
  if (!/^[a-z0-9-]+$/.test(label)) {
    throw new NameRegistryError(`label "${label}" has an invalid char (allowed: a-z 0-9 -)`);
  }
}
function selectorHex2(signature) {
  const sel = keccak_256(new TextEncoder().encode(signature)).slice(0, 4);
  return `0x${[...sel].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function addressWord2(value) {
  const out = new Uint8Array(32);
  if (value == null) return out;
  const bytes = toBytes2(value);
  if (bytes.length !== 20) {
    throw new NameRegistryError(`address must be 20 bytes, got ${bytes.length}`);
  }
  out.set(bytes, 12);
  return out;
}
function uint256Word(value) {
  if (value < 0n || value > (1n << 256n) - 1n) {
    throw new NameRegistryError("uint256 word out of range");
  }
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 31; i >= 0 && rest > 0n; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
function padTo32(bytes) {
  const padded = Math.ceil(bytes.length / 32) * 32;
  if (padded === bytes.length) return bytes;
  const out = new Uint8Array(padded);
  out.set(bytes);
  return out;
}
function toBytes2(value) {
  if (typeof value === "string") return hexToBytes4(value);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes4(hex) {
  const body = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (body.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw new NameRegistryError("invalid hex bytes");
  }
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
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

// src/client.ts
var MAX_NATIVE_RECEIPT_EVENTS = 1e3;
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
  /**
   * `eth_getBalance` — balance + Merkle proof envelope.
   *
   * The node may answer with a bare `0x…` hex word or a proof-wrapped
   * object; both are normalized to a consistent {@link AccountProofResponse}
   * via {@link normalizeAccountProof} so `.value` is always the bare word.
   */
  async ethGetBalance(address, block = "latest") {
    return normalizeAccountProof(
      await this.call("eth_getBalance", [address, encodeBlockSelector(block)])
    );
  }
  /**
   * `eth_getStorageAt` — storage word + Merkle proof.
   *
   * The node returns a proof-wrapped object
   * `{ value, proof, stateRoot, blockNumber }` (some builds use a bare
   * `0x…` hex word). Both shapes are normalized to a consistent
   * {@link AccountProofResponse} via {@link normalizeAccountProof}; `.value`
   * is always the bare storage word (even-length hex, `0x0` when zero).
   */
  async ethGetStorageAt(address, slot, block = "latest") {
    return normalizeAccountProof(
      await this.call("eth_getStorageAt", [
        address,
        slot,
        encodeBlockSelector(block)
      ])
    );
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
  /** `eth_call` — read-only execution against committed state. */
  async ethCall(request, block = "latest") {
    return this.call("eth_call", [request, encodeBlockSelector(block)]);
  }
  /** `eth_estimateGas` — read-only execution-unit estimate for a call object. */
  async ethEstimateGas(request, block = "latest") {
    return parseQuantityBig(
      await this.call("eth_estimateGas", [request, encodeBlockSelector(block)])
    );
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
  /**
   * `eth_gasPrice` — passive compatibility fee quote for EVM-shaped read
   * tooling. Native callers should prefer `lythExecutionUnitPrice`.
   */
  async ethGasPrice() {
    return parseQuantityBig(await this.call("eth_gasPrice", []));
  }
  /**
   * `eth_feeHistory` — base-fee + gas-used history.
   *
   * The chain's eth-compat surface serializes the base-fee window under the
   * camelCase key `baseFeePerGas`. Internally the chain header field is
   * `base_fee_per_gas`; this method asserts the on-the-wire response actually
   * carries the expected `baseFeePerGas` array and fails LOUD if the field is
   * missing or has drifted to snake_case `base_fee_per_gas`. Without this
   * guard a future rename would silently collapse the base fee to an empty
   * array and over-/under-quote fees (e.g. name registration would fall back
   * to the placeholder fee unit and revert `IncorrectFee` on submit).
   */
  async ethFeeHistory(blockCount, newestBlock = "latest", rewardPercentiles = []) {
    const result = await this.call("eth_feeHistory", [
      `0x${blockCount.toString(16)}`,
      encodeBlockSelector(newestBlock),
      rewardPercentiles
    ]);
    if (result !== null && typeof result === "object" && !Array.isArray(result.baseFeePerGas)) {
      const drifted = "base_fee_per_gas" in result ? " (found snake_case 'base_fee_per_gas')" : "";
      throw SdkError.malformed(
        `eth_feeHistory response is missing the camelCase 'baseFeePerGas' array${drifted}; the base-fee field contract changed`
      );
    }
    return result;
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
  // ---- lyth_* native namespace --------------------------------------
  /** `lyth_listProviders` — paged registry enumeration. */
  async lythListProviders(capabilityMask, cursor = null, limit = 100) {
    return this.call("lyth_listProviders", [capabilityMask, cursor, limit]);
  }
  /** `lyth_getRegistration` — single registry lookup. */
  async lythGetRegistration(peerId) {
    return this.call("lyth_getRegistration", [peerId]);
  }
  /**
   * `lyth_registryStateProof` — Merkle proof for a registry entry.
   *
   * Normalized through {@link normalizeAccountProof} so a bare-hex or
   * proof-wrapped answer both yield a consistent {@link AccountProofResponse}.
   */
  async lythRegistryStateProof(peerId) {
    return normalizeAccountProof(await this.call("lyth_registryStateProof", [peerId]));
  }
  /** `lyth_getAccountPolicy` — privacy posture for an account. */
  async lythGetAccountPolicy(address) {
    return this.call("lyth_getAccountPolicy", [sdkTypedAddress(address, "user", "address")]);
  }
  /** `lyth_getAssetPolicy` — privacy posture for an asset. */
  async lythGetAssetPolicy(tokenId) {
    return this.call("lyth_getAssetPolicy", [tokenId]);
  }
  /** `lyth_getTokenBalances` — indexed per-asset balances for one address. */
  async lythGetTokenBalances(address) {
    return this.call("lyth_getTokenBalances", [sdkTypedAddress(address, "user", "address")]);
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
    const request = {
      account: sdkTypedAddress(account, "smartAccount", "account")
    };
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
    const v = await this.call("lyth_getAddressLabel", [
      sdkTypedAddress(address, "user", "address")
    ]);
    if (v === null || v === void 0) return null;
    return v;
  }
  /** `lyth_getAddressActivity` — indexed per-address activity timeline. */
  async lythGetAddressActivity(address, limit = 50, cursor) {
    const userAddress = sdkTypedAddress(address, "user", "address");
    const params = cursor === void 0 ? [userAddress, limit] : [userAddress, limit, cursor];
    return this.call("lyth_getAddressActivity", params);
  }
  /** `lyth_addressActivityKind` — activity index coverage for one address. */
  async lythAddressActivityKind(address) {
    return this.call("lyth_addressActivityKind", [sdkTypedAddress(address, "user", "address")]);
  }
  /** `lyth_agentReputation` — reputation accumulators for an agent provider. */
  async lythAgentReputation(provider, categoryId = 0) {
    return this.call("lyth_agentReputation", [
      sdkTypedAddress(provider, "user", "provider address"),
      categoryId
    ]);
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
    return this.call("lyth_addressProfile", [sdkTypedAddress(address, "user", "address")]);
  }
  /** `lyth_addressFlow` — recent indexed address-flow aggregate. */
  async lythAddressFlow(address, limit = 250) {
    return this.call("lyth_addressFlow", [sdkTypedAddress(address, "user", "address"), limit]);
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
    return this.call("lyth_mempoolPending", [sdkTypedAddress(sender, "user", "sender")]);
  }
  /** `lyth_currentRound` — latest committed height. */
  async lythCurrentRound() {
    return normalizeRoundInfo(await this.call("lyth_currentRound", []));
  }
  /** `lyth_getTransactionCount` — native sender nonce. */
  async lythGetTransactionCount(address) {
    return parseRpcBigint(
      await this.call("lyth_getTransactionCount", [
        sdkTypedAddress(address, "user", "address")
      ]),
      "lyth_getTransactionCount"
    );
  }
  /** `lyth_executionUnitPrice` — native execution-unit price in lythoshi. */
  async lythExecutionUnitPrice() {
    return normalizeExecutionUnitPriceResponse(
      await this.call("lyth_executionUnitPrice", [])
    );
  }
  /** `lyth_peerSummary` — public-safe aggregate peer-network diagnostics. */
  async lythPeerSummary() {
    return this.call("lyth_peerSummary", []);
  }
  /** `lyth_listActivePrecompiles` — native precompile catalogue. */
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
    const userWallet = sdkTypedAddress(wallet, "user", "wallet");
    const params = block === void 0 ? [userWallet] : [userWallet, encodeBlockSelector(block)];
    return this.call("lyth_getDelegations", params);
  }
  /** `lyth_pendingRewards` — wallet pending rewards at a block. */
  async lythPendingRewards(wallet, block) {
    const userWallet = sdkTypedAddress(wallet, "user", "wallet");
    const params = block === void 0 ? [userWallet] : [userWallet, encodeBlockSelector(block)];
    return this.call("lyth_pendingRewards", params);
  }
  /** `lyth_redemptionQueue` — wallet redemption tickets at a block. */
  async lythRedemptionQueue(wallet, block) {
    const userWallet = sdkTypedAddress(wallet, "user", "wallet");
    const params = block === void 0 ? [userWallet] : [userWallet, encodeBlockSelector(block)];
    return this.call("lyth_redemptionQueue", params);
  }
  /** `lyth_getDelegationHistory` — indexed per-wallet delegation event timeline. */
  async lythGetDelegationHistory(wallet, limit = 50, cursor) {
    const userWallet = sdkTypedAddress(wallet, "user", "wallet");
    const params = cursor === void 0 ? [userWallet, limit] : [userWallet, limit, cursor];
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
  // --- PF-4 / PF-6 / MB-6 / MB-4 / MB-2 + operator-router read wrappers ----
  //
  // Reconciled against the FINAL mono-core RPC surface (master 2eff9fed):
  // every method name + response shape below matches the chain's `lyth_*`
  // dispatch + impls exactly (camelCase keys, 0x-hex uint256 amounts,
  // bech32m addresses). The three indexer-backed methods —
  // `lyth_oracleSigners`, `lyth_listProofRequests`, `lyth_proverMarketStatus`
  // — return a graceful `{ status: "indexer_unavailable", … }` envelope
  // when the node runs without its indexer projection.
  /** PF-4 — `lyth_getSpendingPolicy`: the §18.8 spending-policy view for a sub-account. */
  async lythGetSpendingPolicy(subAccount) {
    return this.call("lyth_getSpendingPolicy", [sdkTypedAddress(subAccount, "user", "subAccount")]);
  }
  /** PF-6 — `lyth_getClusterDiversity`: diversity score + asn/geo/hosting breakdown. */
  async lythGetClusterDiversity(clusterId) {
    return this.call("lyth_getClusterDiversity", [clusterId]);
  }
  /**
   * Component H — read a cluster's ACTIVE economics charter (Law §6.8).
   *
   * There is no `lyth_*` / view-selector for the active charter, so this
   * SLOADs the two `TAG_CLUSTER_CHARTER` (`0x31`) storage words from the
   * node-registry account `0x1005` via `eth_getStorageAt` and decodes them
   * with {@link decodeActiveCharter}. Returns `{ present: false }` (zeroed
   * shares) for genesis / 3-arg-formCluster clusters that never adopted a
   * charter. The active record carries no `effectiveEpoch` — that lives on
   * the pending amendment ({@link lythGetPendingCharter}).
   */
  async lythGetClusterCharter(clusterId, block = "latest") {
    const registry = nodeRegistryAddressHex();
    const [delegator, members] = await Promise.all([
      this.ethGetStorageAt(registry, slotClusterCharterDelegator(clusterId), block),
      this.ethGetStorageAt(registry, slotClusterCharterMembers(clusterId), block)
    ]);
    return decodeActiveCharter(delegator.value, members.value);
  }
  /**
   * Component H — read a cluster's PENDING charter amendment (Law §6.8).
   *
   * Calls the `getPendingCharter(uint32)` view on the node-registry account
   * `0x1005` over `eth_call` and decodes the return with
   * {@link decodePendingCharter}. Returns `{ present: false }` when no
   * amendment is posted; otherwise carries the proposed shares plus the
   * `effectiveEpoch` at which the delegator-protective cooldown lands.
   */
  async lythGetPendingCharter(clusterId, block = "latest") {
    const data = await this.ethCall(
      { to: nodeRegistryAddressHex(), data: encodeGetPendingCharterCalldata(clusterId) },
      block
    );
    return decodePendingCharter(data);
  }
  /**
   * Component A — read a cluster's settled per-cluster ServiceScore (the
   * `u64` the reward path reads each block). SLOADs the `TAG_SERVICE_SCORE`
   * (`0x24`) score slot from `0x1005` via `eth_getStorageAt`; `0n` means the
   * cluster has never been scored.
   */
  async lythGetClusterServiceScore(clusterId, block = "latest") {
    const word = await this.ethGetStorageAt(
      nodeRegistryAddressHex(),
      slotClusterServiceScore(clusterId),
      block
    );
    return parseQuantityBig(word.value);
  }
  /**
   * PF-6 — `lyth_getOperatorNetworkMetadata`: ASN/geo/hosting-class/IP/PCR
   * for a peer. `operatorId` is the 32-byte operator/peer id as `0x…` hex
   * (the form `lyth_operatorInfo` returns).
   */
  async lythGetOperatorNetworkMetadata(operatorId) {
    return this.call("lyth_getOperatorNetworkMetadata", [operatorId]);
  }
  /**
   * MB-6 — `lyth_oracleSigners`: the global oracle writer roster (folded
   * from `OracleWriterAdded` / `OracleWriterRemoved`). Returns the
   * `{ status: "indexer_unavailable", writers: [] }` fallback when the
   * node runs without the oracle writer-roster indexer projection.
   */
  async lythOracleSigners() {
    return this.call("lyth_oracleSigners", []);
  }
  /** MB-6 — `lyth_oracleWriters`: the allowed writer set for a feed. */
  async lythOracleWriters(feedId) {
    return this.call("lyth_oracleWriters", [feedId]);
  }
  /** MB-6 — `lyth_oracleLatestPrice`: the latest finalized median for a feed. */
  async lythOracleLatestPrice(feedId) {
    return this.call("lyth_oracleLatestPrice", [feedId]);
  }
  /** MB-6 — `lyth_oracleFeedConfig`: a feed's decimals / min-signers / circuit-breaker config. */
  async lythOracleFeedConfig(feedId) {
    return this.call("lyth_oracleFeedConfig", [feedId]);
  }
  /** MB-4 — `lyth_getProofRequest`: a single GPU prover-market proof request. */
  async lythGetProofRequest(requestId) {
    return this.call("lyth_getProofRequest", [requestId]);
  }
  /**
   * MB-4 — `lyth_listProofRequests`: open/recent prover-market proof
   * requests. Params are `[stateFilter?, limit?]` (the chain's order),
   * where `stateFilter` is one of `open|assigned|settled|slashed|expired`.
   * Returns the `{ status: "indexer_unavailable", requests: [] }` fallback
   * when the node runs without the prover-market indexer projection.
   */
  async lythListProofRequests(stateFilter, limit) {
    const params = [];
    if (stateFilter != null || limit != null) params.push(stateFilter ?? null);
    if (limit != null) params.push(limit);
    return this.call("lyth_listProofRequests", params);
  }
  /** MB-4 — `lyth_getProverBids`: the fee bids placed on one proof request. */
  async lythGetProverBids(requestId) {
    return this.call("lyth_getProverBids", [requestId]);
  }
  /**
   * MB-4 — `lyth_proverMarketStatus`: prover-market summary. `feeFloor` is
   * always present (on-chain genesis singleton); the aggregate counts are
   * `null` on the `{ status: "indexer_unavailable" }` fallback path.
   */
  async lythProverMarketStatus() {
    return this.call("lyth_proverMarketStatus", []);
  }
  /**
   * Operator-router — `lyth_operatorRouterConfig`: the router's static
   * posture (`0x100B` address, the protocol fee ceiling, and whether the
   * gateable router precompile is currently milestone-activated).
   */
  async lythOperatorRouterConfig() {
    return this.call("lyth_operatorRouterConfig", []);
  }
  /**
   * Operator-router — `lyth_operatorFeeConfig`: one operator's fee
   * registration (recipient, fee bps, enabled flag, registered-at block).
   * `operator` is a `mono` bech32m user address.
   */
  async lythOperatorFeeConfig(operator) {
    return this.call("lyth_operatorFeeConfig", [sdkTypedAddress(operator, "user", "operator")]);
  }
  /**
   * MB-2 — `lyth_bridgeHealth`: a paged set of bridge-record health
   * envelopes. Each record carries the circuit-breaker posture
   * (`defaultDrainCapPerWindow`, `defaultDrainWindowBlocks`, `paused`,
   * `pausedAtBlock`, `resumeCooldownBlocks`). Params are `[cursor?, limit?]`
   * (the chain pages the global bridge set; there is no single-bridge form).
   */
  async lythBridgeHealth(cursor, limit) {
    const params = [];
    if (cursor != null || limit != null) params.push(cursor ?? null);
    if (limit != null) params.push(limit);
    return this.call("lyth_bridgeHealth", params);
  }
  /**
   * MB-2 — `lyth_bridgeDrainStatus`: the live per-route circuit-breaker
   * drain bucket for one `(bridgeId, wrappedAsset)` route. `bridgeId` is a
   * 32-byte `0x…` hex id; `wrappedAsset` is a `mono` bech32m user address.
   */
  async lythBridgeDrainStatus(bridgeId, wrappedAsset) {
    return this.call("lyth_bridgeDrainStatus", [
      bridgeId,
      sdkTypedAddress(wrappedAsset, "user", "wrappedAsset")
    ]);
  }
  /**
   * `lyth_submitPendingChange` — operator-onboarding transport for the
   * pending-change ledger. Server validates the envelope shape.
   */
  async lythSubmitPendingChange(envelope) {
    return this.call("lyth_submitPendingChange", [envelope]);
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
  /** `lyth_getRoundCertificate` — round-advancement certificate. */
  async lythGetRoundCertificate(round) {
    return this.call("lyth_getRoundCertificate", [encodeRpcInteger(round)]);
  }
  /** @deprecated Use lythGetRoundCertificate. */
  async lythGetBlsRoundCertificate(round) {
    return this.lythGetRoundCertificate(round);
  }
  /** `lyth_getLeaderCertificate` — leader-vote certificate for a block ref. */
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
  // ---- lyth_* additions (R15 / wallet + monoscan surfaces) -----------
  /**
   * `lyth_clusterApr` — observed APR for a cluster over a rolling window.
   * `windowBlocks` defaults to the chain's 1200-block (~1h) window and is
   * server-clamped to `[10, 86_400]`.
   */
  async lythClusterApr(clusterId, windowBlocks) {
    const params = windowBlocks === void 0 ? [clusterId] : [clusterId, windowBlocks];
    return normalizeClusterApr(await this.call("lyth_clusterApr", params));
  }
  /** `lyth_resolveName` — forward name → address resolution (0x110E). */
  async lythResolveName(name, block = "latest") {
    return this.call("lyth_resolveName", [name, encodeBlockSelector(block)]);
  }
  /** `lyth_nameOf` — reverse address → name resolution. */
  async lythNameOf(address, block = "latest") {
    return this.call("lyth_nameOf", [sdkTypedAddress(address, "user", "address"), encodeBlockSelector(block)]);
  }
  /** `lyth_getClusterName` — reverse cluster id → canonical name. */
  async lythGetClusterName(clusterId, block = "latest") {
    return this.call("lyth_getClusterName", [clusterId, encodeBlockSelector(block)]);
  }
  /**
   * Convenience over {@link lythResolveName}: `true` when a well-formed
   * name is unregistered. A malformed name throws `RpcError`
   * (`InvalidParams`) rather than returning `true`, so the UI should treat
   * a thrown validation error distinctly from "taken".
   */
  async lythIsNameAvailable(name, block = "latest") {
    const resolved = await this.lythResolveName(name, block);
    return resolved.address === null;
  }
  /**
   * Live name-registration quote: parses the name's category + primary
   * label length, reads the chain's base fee unit via `eth_feeHistory`
   * (the bare `baseFeePerGas` — NOT `eth_gasPrice`, which adds the tip and
   * would over-quote), and applies the U-curve. The resulting
   * `costLythoshi` is what the `register` tx `value` must equal exactly
   * (else the precompile reverts `IncorrectFee`).
   */
  async quoteNameRegistration(name, block = "latest") {
    const parsed = parseNameCategory(name);
    const history = await this.ethFeeHistory(1, block, []);
    const baseFees = history.baseFeePerGas ?? [];
    const lastHex = baseFees.length > 0 ? baseFees[baseFees.length - 1] : "0x0";
    const baseFee = parseQuantityBig(lastHex);
    const feeUnitLythoshi = baseFee > 0n ? baseFee : NAME_FALLBACK_FEE_UNIT_LYTHOSHI;
    return {
      name,
      category: parsed.category,
      primaryLabelLen: parsed.primaryLabelLen,
      feeUnitLythoshi,
      costLythoshi: nameRegistrationCost(parsed.category, parsed.primaryLabelLen, feeUnitLythoshi)
    };
  }
  /** `lyth_circulatingSupply` — native LYTH circulating / initial / burned (decimal lythoshi strings). */
  async lythCirculatingSupply() {
    return this.call("lyth_circulatingSupply", []);
  }
  /** `lyth_totalBurned` — cumulative burned native LYTH (decimal lythoshi string). */
  async lythTotalBurned() {
    return this.call("lyth_totalBurned", []);
  }
  /** `lyth_totalMinted` — cumulative minted native LYTH from block rewards (decimal lythoshi string, H1/#60). */
  async lythTotalMinted() {
    return this.call("lyth_totalMinted", []);
  }
  /** `lyth_totalSupply` — authoritative supply accounting: `{ initial, minted, burned, current }` (H1/#60). */
  async lythTotalSupply() {
    return this.call("lyth_totalSupply", []);
  }
  /** `lyth_swapIntentStatus` — bridge swap-intent / DKG-reshare lifecycle for one intent id. */
  async lythSwapIntentStatus(intentId) {
    let id;
    if (typeof intentId === "number") {
      id = intentId;
    } else if (typeof intentId === "bigint") {
      id = `0x${intentId.toString(16)}`;
    } else if (intentId.startsWith("0x") || intentId.startsWith("0X")) {
      id = intentId;
    } else {
      id = `0x${BigInt(intentId).toString(16)}`;
    }
    return this.call("lyth_swapIntentStatus", [id]);
  }
  /**
   * Per-tx confirmation depth, derived from `lyth_txStatus` (which returns
   * both the tx's `blockNumber` and the node `latestHeight`).
   */
  async lythTxConfirmations(txHash) {
    const status = await this.lythTxStatus(txHash);
    if (status.status === "found") {
      return {
        status: "found",
        confirmations: status.latestHeight - status.blockNumber + 1,
        blockNumber: status.blockNumber,
        latestHeight: status.latestHeight
      };
    }
    return {
      status: "not_found",
      confirmations: null,
      blockNumber: null,
      latestHeight: status.latestHeight
    };
  }
  /**
   * Resolve a user-pasted MRC token id to its metadata (name/symbol/
   * decimals), for an "add custom token" flow. Returns `null` for an
   * unknown/untracked id. Performs light client-side format validation
   * (32-byte hex) for fast UX feedback; the chain re-validates regardless.
   */
  async lythResolveTokenMetadata(rawTokenId) {
    const body = rawTokenId.startsWith("0x") || rawTokenId.startsWith("0X") ? rawTokenId.slice(2) : rawTokenId;
    if (!/^[0-9a-fA-F]{64}$/.test(body)) {
      throw SdkError.malformed("token id must be 32 bytes (64 hex chars)");
    }
    return (await this.lythMrcMetadata(rawTokenId)).metadata;
  }
  /**
   * `lyth_getTokenBalances` joined with per-token MRC metadata. Balances
   * are PUBLIC-only by construction (private-denomination balances are
   * excluded by the chain). Raw `balance` strings are preserved (apply
   * `metadata.decimals` client-side for display).
   */
  async lythGetTokenBalancesWithMetadata(address) {
    const rows = await this.lythGetTokenBalances(address);
    const keyFor = (row) => {
      const assetId = row.mrc?.assetId ?? row.tokenId;
      const tokenId = row.mrc?.tokenId ?? null;
      return { assetId, tokenId, key: `${assetId}:${tokenId ?? ""}` };
    };
    const distinct = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const k = keyFor(row);
      if (!distinct.has(k.key)) distinct.set(k.key, { assetId: k.assetId, tokenId: k.tokenId });
    }
    const metaByKey = /* @__PURE__ */ new Map();
    await Promise.all(
      [...distinct.entries()].map(async ([key, { assetId, tokenId }]) => {
        const resp = await this.lythMrcMetadata(assetId, tokenId);
        metaByKey.set(key, resp.metadata);
      })
    );
    return rows.map((row) => ({ ...row, metadata: metaByKey.get(keyFor(row).key) ?? null }));
  }
  /**
   * Resolve a CLOB market's base/quote asset metadata (symbol/name/
   * decimals) by joining `lyth_clobMarket` to `lyth_mrcMetadata`. Either
   * side may be `null` when the indexer has no MRC row (e.g. native LYTH).
   */
  async resolveClobMarketAssets(marketId) {
    const response = await this.lythClobMarket(marketId);
    const market = response.market;
    if (!market) return { base: null, quote: null };
    const [base, quote] = await Promise.all([
      this.lythMrcMetadata(market.baseToken).then((m) => m.metadata),
      this.lythMrcMetadata(market.quoteToken).then((m) => m.metadata)
    ]);
    return { base, quote };
  }
  /**
   * `lyth_getAddressActivity` enriched with each row's block timestamp,
   * canonical tx hash (resolved from `(blockHeight, txIndex)`), and
   * resolved cluster name. Issues one block read per distinct height and
   * one name read per distinct cluster.
   */
  async enrichAddressActivity(address, limit = 50, cursor) {
    const entries = await this.lythGetAddressActivity(address, limit, cursor);
    const heights = [...new Set(entries.map((entry) => BigInt(entry.blockHeight)))];
    const blockByHeight = /* @__PURE__ */ new Map();
    await Promise.all(
      heights.map(async (height) => {
        blockByHeight.set(height, await this.blockTimeAndTxHashes(height));
      })
    );
    const clusters = [
      ...new Set(entries.map((entry) => entry.cluster).filter((c) => c != null))
    ];
    const nameByCluster = /* @__PURE__ */ new Map();
    await Promise.all(
      clusters.map(async (clusterId) => {
        nameByCluster.set(clusterId, (await this.lythGetClusterName(clusterId)).name);
      })
    );
    return entries.map((entry) => {
      const block = blockByHeight.get(BigInt(entry.blockHeight));
      const txHash = block && entry.txIndex >= 0 && entry.txIndex < block.txHashes.length ? block.txHashes[entry.txIndex] : null;
      return {
        ...entry,
        blockTimestampSeconds: block?.timestampSeconds ?? null,
        txHash,
        clusterName: entry.cluster != null ? nameByCluster.get(entry.cluster) ?? null : null
      };
    });
  }
  /**
   * Read a block's header timestamp (UNIX seconds) and ordered tx-hash
   * array via the raw `eth_getBlockByNumber` (hash-only mode). The typed
   * `ethGetBlockByNumber` wrapper drops the `transactions` array, so this
   * uses the raw call.
   */
  async blockTimeAndTxHashes(height) {
    const hexHeight = `0x${height.toString(16)}`;
    const raw = await this.call("eth_getBlockByNumber", [
      hexHeight,
      false
    ]);
    if (!raw || typeof raw !== "object") return { timestampSeconds: null, txHashes: [] };
    const ts = raw["timestamp"];
    const timestampSeconds = ts === null || ts === void 0 ? null : parseRpcBigint(ts, "block timestamp");
    const txs = raw["transactions"];
    const txHashes = Array.isArray(txs) ? txs.filter((t) => typeof t === "string") : [];
    return { timestampSeconds, txHashes };
  }
};
function clusterApyPercent(apr) {
  return Number(apr.aprBps) / 100;
}
function computeQuoteLiquidity(book) {
  const sumQuote = (levels) => levels.reduce((acc, level) => acc + BigInt(level.price) * BigInt(level.size), 0n);
  const bidQuote = sumQuote(book.bids);
  const askQuote = sumQuote(book.asks);
  return {
    bidQuote: bidQuote.toString(10),
    askQuote: askQuote.toString(10),
    totalQuote: (bidQuote + askQuote).toString(10)
  };
}
function rankMarketsByVolume(markets) {
  return [...markets].sort((a, b) => {
    const av = BigInt(a.totalVolumeBase);
    const bv = BigInt(b.totalVolumeBase);
    return av < bv ? 1 : av > bv ? -1 : 0;
  }).map((market, index) => ({ ...market, volumeRank: index + 1 }));
}
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
function normalizeStorageWord(value) {
  if (value === null || value === void 0 || value === "") return "0x0";
  if (typeof value !== "string") {
    throw SdkError.malformed(`storage word is not a string: ${typeof value}`);
  }
  const body = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  if (body.length === 0) return "0x0";
  if (!/^[0-9a-fA-F]+$/.test(body)) {
    throw SdkError.malformed(`invalid hex storage word: ${value}`);
  }
  return body.length % 2 === 0 ? `0x${body}` : `0x0${body}`;
}
function normalizeAccountProof(result) {
  if (typeof result === "string" || result === null || result === void 0) {
    return { value: normalizeStorageWord(result), state_root: "0x", block_number: 0n };
  }
  const obj = result;
  const stateRoot = obj.state_root ?? obj.stateRoot ?? "0x";
  const rawBlock = obj.block_number ?? obj.blockNumber ?? 0;
  let blockNumber;
  try {
    blockNumber = typeof rawBlock === "bigint" ? rawBlock : BigInt(rawBlock);
  } catch {
    blockNumber = 0n;
  }
  return {
    value: normalizeStorageWord(obj.value),
    state_root: stateRoot,
    block_number: blockNumber,
    proof: obj.proof ?? null
  };
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
    ...optionalString2("address", filter.address),
    ...optionalString2("eventTopic", filter.eventTopic),
    ...optionalString2("family", filter.family),
    ...optionalString2("eventName", filter.eventName),
    ...optionalString2("primaryId", filter.primaryId),
    ...optionalString2("relatedId", filter.relatedId),
    ...optionalString2("tokenId", filter.tokenId),
    ...optionalString2("account", filter.account),
    ...optionalString2("counterparty", filter.counterparty)
  };
}
function optionalRpcNumber(key, value) {
  return value == null ? {} : { [key]: encodeRpcU64Number(value, key) };
}
function optionalString2(key, value) {
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
    consensusKeyFingerprint: parseStringNullable(
      row["consensusKeyFingerprint"] ?? row["blsKeyFingerprint"]
    ),
    lifecycleState: String(row["lifecycleState"]),
    capability: capability && typeof capability === "object" && !Array.isArray(capability) ? capability : {}
  };
}
function normalizeClusterMember(value, label) {
  const row = expectObject(value, label);
  return {
    operatorId: String(row["operatorId"]),
    consensusPubkey: String(row["consensusPubkey"] ?? row["blsPubkey"]),
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
    consensusPubkey: String(row["consensusPubkey"] ?? row["blsPubkey"]),
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
function sdkTypedAddress(address, kind, label) {
  try {
    return requireTypedAddress(address, kind, label);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw SdkError.malformed(message);
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
function normalizeClusterApr(value) {
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("cluster apr must be an object");
  }
  const row = value;
  const blocks = row["blocks"] ?? {};
  return {
    clusterId: parseRpcNumber(row["clusterId"], "clusterId"),
    blocks: {
      from: parseRpcBigint(blocks["from"], "blocks.from"),
      to: parseRpcBigint(blocks["to"], "blocks.to"),
      window: parseRpcBigint(blocks["window"], "blocks.window")
    },
    rewardIndexFromHex: parseStringField(row["rewardIndexFromHex"], "rewardIndexFromHex"),
    rewardIndexToHex: parseStringField(row["rewardIndexToHex"], "rewardIndexToHex"),
    deltaIndexHex: parseStringField(row["deltaIndexHex"], "deltaIndexHex"),
    rewardIndexScale: parseStringField(row["rewardIndexScale"], "rewardIndexScale"),
    totalBps: parseRpcNumber(row["totalBps"], "totalBps"),
    blocksPerYear: parseRpcBigint(row["blocksPerYear"], "blocksPerYear"),
    stakePerBpsLythoshi: parseRpcBigint(row["stakePerBpsLythoshi"], "stakePerBpsLythoshi"),
    aprBps: parseRpcBigint(row["aprBps"], "aprBps")
  };
}
function normalizeExecutionUnitPriceResponse(value) {
  if (!value || typeof value !== "object") {
    throw SdkError.malformed("execution unit price response must be an object");
  }
  const row = value;
  return {
    executionUnitPriceLythoshi: parseRpcBigint(
      fieldAlias(row, ["executionUnitPriceLythoshi", "execution_unit_price_lythoshi"]),
      "executionUnitPriceLythoshi"
    ).toString(),
    basePricePerExecutionUnitLythoshi: parseRpcBigint(
      fieldAlias(row, [
        "basePricePerExecutionUnitLythoshi",
        "base_price_per_execution_unit_lythoshi"
      ]),
      "basePricePerExecutionUnitLythoshi"
    ).toString(),
    priorityTipLythoshi: parseRpcBigint(
      fieldAlias(row, ["priorityTipLythoshi", "priority_tip_lythoshi"]),
      "priorityTipLythoshi"
    ).toString(),
    blockNumber: parseRpcNumberNullable(
      fieldAlias(row, ["blockNumber", "block_number"]),
      "blockNumber"
    ),
    source: readStringField(row, ["source"], "execution unit price source")
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
function fieldAlias(record, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return void 0;
}
function readStringField(record, keys, label) {
  const value = fieldAlias(record, keys);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw SdkError.malformed(`${label} must be a non-empty string`);
  }
  return value.trim();
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

// src/tx-fee.ts
var REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT = 1000000n;
var TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT = 500000n;
var MIN_EXECUTION_UNIT_PRICE_LYTHOSHI = 2000n;
var EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER = 3n;
function asBigint(value, label) {
  try {
    return typeof value === "bigint" ? value : BigInt(value);
  } catch {
    throw new Error(`${label} is not an integer: ${String(value)}`);
  }
}
function clampPriorityTip(priorityTipLythoshi, maxExecutionUnitPriceLythoshi) {
  const tip = asBigint(priorityTipLythoshi, "priorityTipLythoshi");
  const cap = asBigint(maxExecutionUnitPriceLythoshi, "maxExecutionUnitPriceLythoshi");
  if (tip < 0n) throw new Error("priorityTipLythoshi must be non-negative");
  return tip > cap ? cap : tip;
}
async function resolveMaxExecutionUnitPrice(client, options = {}) {
  const floor = options.minPriceLythoshi ?? MIN_EXECUTION_UNIT_PRICE_LYTHOSHI;
  const multiplier = options.safetyMultiplier ?? EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER;
  const quote = await client.lythExecutionUnitPrice();
  let unitPrice;
  try {
    unitPrice = BigInt(quote.executionUnitPriceLythoshi);
  } catch {
    throw SdkError.malformed(
      `lyth_executionUnitPrice returned a non-integer executionUnitPriceLythoshi: ${quote.executionUnitPriceLythoshi}`
    );
  }
  const base = unitPrice > floor ? unitPrice : floor;
  return base * multiplier;
}
async function resolveExecutionFee(client, options = {}) {
  const maxFeePerGas = await resolveMaxExecutionUnitPrice(client, {
    minPriceLythoshi: options.minPriceLythoshi,
    safetyMultiplier: options.safetyMultiplier
  });
  const tip = options.priorityTipLythoshi === void 0 ? maxFeePerGas : clampPriorityTip(options.priorityTipLythoshi, maxFeePerGas);
  return {
    maxFeePerGas,
    maxPriorityFeePerGas: tip,
    gasLimit: options.executionUnitLimit ?? TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT
  };
}
async function resolveRegistryExecutionFee(client, options = {}) {
  return resolveExecutionFee(client, {
    ...options,
    executionUnitLimit: options.executionUnitLimit ?? REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT
  });
}
function feeFieldToBigint(value, field2) {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    throw SdkError.malformed(`${field2} is not an integer: ${String(value)}`);
  }
  try {
    return BigInt(value.trim());
  } catch {
    throw SdkError.malformed(`${field2} is not an integer: ${String(value)}`);
  }
}
function transactionFeeExposure(fee) {
  const basePrice = feeFieldToBigint(
    fee.base_price_per_cycle_lythoshi,
    "fee.base_price_per_cycle_lythoshi"
  );
  const priorityTip = feeFieldToBigint(
    fee.priority_tip_lythoshi,
    "fee.priority_tip_lythoshi"
  );
  feeFieldToBigint(fee.total_lythoshi, "fee.total_lythoshi");
  return {
    feeLythoshi: fee.total_lythoshi,
    effectiveGasPricePerUnit: (basePrice + priorityTip).toString()
  };
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
    const response = await this.get(
      `/transactions/${encodePathSegment(hash)}`
    );
    return {
      ...response,
      data: enrichTransactionDataWithFee(response.data)
    };
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
    const userAddress = sdkTypedAddress2(address, "user", "address");
    return this.get(`/addresses/${encodePathSegment(userAddress)}/profile`);
  }
  async addressFlow(address, limit = 250) {
    const userAddress = sdkTypedAddress2(address, "user", "address");
    return this.get(`/addresses/${encodePathSegment(userAddress)}/flow`, { limit });
  }
  async addressActivity(address, limit = 50, cursor) {
    const userAddress = sdkTypedAddress2(address, "user", "address");
    return this.get(`/addresses/${encodePathSegment(userAddress)}/activity`, {
      limit,
      cursor
    });
  }
  async addressActivityKind(address) {
    const userAddress = sdkTypedAddress2(address, "user", "address");
    return this.get(`/addresses/${encodePathSegment(userAddress)}/activity-kind`);
  }
  async addressPendingRewards(address, block) {
    const userAddress = sdkTypedAddress2(address, "user", "address");
    return this.get(`/addresses/${encodePathSegment(userAddress)}/pending-rewards`, {
      block: block == null ? void 0 : encodeBlockSelector(block)
    });
  }
  async addressRedemptionQueue(address, block) {
    const userAddress = sdkTypedAddress2(address, "user", "address");
    return this.get(`/addresses/${encodePathSegment(userAddress)}/redemption-queue`, {
      block: block == null ? void 0 : encodeBlockSelector(block)
    });
  }
  async assetMrcMetadata(assetId, mrcTokenId) {
    return this.get(`/assets/${encodePathSegment(assetId)}/metadata`, {
      mrcTokenId: mrcTokenId ?? void 0
    });
  }
  async mrcAccount(account, limit) {
    const smartAccount = sdkTypedAddress2(account, "smartAccount", "account");
    return this.get(`/mrc/accounts/${encodePathSegment(smartAccount)}`, {
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
function enrichTransactionDataWithFee(data) {
  const exposure = transactionFeeExposure(data.transaction.fee);
  return {
    ...data,
    transaction: {
      ...data.transaction,
      feeLythoshi: exposure.feeLythoshi,
      effectiveGasPricePerUnit: exposure.effectiveGasPricePerUnit
    },
    receipt: data.receipt == null ? data.receipt : {
      ...data.receipt,
      feeLythoshi: exposure.feeLythoshi,
      effectiveGasPricePerUnit: exposure.effectiveGasPricePerUnit
    }
  };
}
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
function sdkTypedAddress2(address, kind, label) {
  try {
    return requireTypedAddress(address, kind, label);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw SdkError.malformed(message);
  }
}
function encodePathBlock(block) {
  return encodePathSegment(encodeBlockSelector(block));
}
function encodePathSegment(value) {
  return encodeURIComponent(typeof value === "bigint" ? value.toString() : String(value));
}
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
var V1_BRIDGE_ALLOWED_FEE_TOKEN = "LINK";
var V1_BRIDGE_ALLOWED_PROTOCOL = "chainlink-ccip";
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
  return bytesToHex5(
    concatBytes5(
      hexToBytes5(BRIDGE_SELECTORS.lockBridgeConfig),
      expectLength3(toBytes3(bridgeId), 32, "bridgeId")
    )
  );
}
function encodeSetBridgeResumeCooldownCalldata(bridgeId, cooldownBlocks) {
  return bytesToHex5(
    concatBytes5(
      hexToBytes5(BRIDGE_SELECTORS.setBridgeResumeCooldown),
      expectLength3(toBytes3(bridgeId), 32, "bridgeId"),
      uint64Word2(cooldownBlocks, "cooldownBlocks")
    )
  );
}
function encodeSetBridgeRouteFinalityCalldata(bridgeId, finalityBlocks) {
  return bytesToHex5(
    concatBytes5(
      hexToBytes5(BRIDGE_SELECTORS.setBridgeRouteFinality),
      expectLength3(toBytes3(bridgeId), 32, "bridgeId"),
      uint64Word2(finalityBlocks, "finalityBlocks")
    )
  );
}
function bridgeSelector(signature) {
  return keccak_256(new TextEncoder().encode(signature)).slice(0, 4);
}
function addressWord3(value, name) {
  const addr = expectLength3(toBytes3(value), 20, name);
  const out = new Uint8Array(32);
  out.set(addr, 12);
  return out;
}
function padTo322(bytes) {
  const padded = Math.ceil(bytes.length / 32) * 32;
  if (padded === bytes.length) return bytes;
  const out = new Uint8Array(padded);
  out.set(bytes);
  return out;
}
function encodeBridgeClaimCalldata(bridgeId, depositId, recipient) {
  return bytesToHex5(
    concatBytes5(
      bridgeSelector("claim(bytes32,bytes32,address)"),
      expectLength3(toBytes3(bridgeId), 32, "bridgeId"),
      expectLength3(toBytes3(depositId), 32, "depositId"),
      addressWord3(recipient, "recipient")
    )
  );
}
function encodeBridgeChallengeCalldata(bridgeId, depositId, fraudProof) {
  const proof = toBytes3(fraudProof);
  return bytesToHex5(
    concatBytes5(
      bridgeSelector("challenge(bytes32,bytes32,bytes)"),
      expectLength3(toBytes3(bridgeId), 32, "bridgeId"),
      expectLength3(toBytes3(depositId), 32, "depositId"),
      uint64Word2(3n * 32n, "fraudProofOffset"),
      uint64Word2(BigInt(proof.length), "fraudProofLength"),
      padTo322(proof)
    )
  );
}
function encodeSubmitBridgeProofCalldata(bridgeId, depositId, lockReceipt, zkProof, publicInputs) {
  const receipt = toBytes3(lockReceipt);
  const proof = toBytes3(zkProof);
  const inputs = toBytes3(publicInputs);
  const off0 = 5n * 32n;
  const off1 = off0 + 32n + BigInt(Math.ceil(receipt.length / 32) * 32);
  const off2 = off1 + 32n + BigInt(Math.ceil(proof.length / 32) * 32);
  return bytesToHex5(
    concatBytes5(
      bridgeSelector("submitProof(bytes32,bytes32,bytes,bytes,bytes)"),
      expectLength3(toBytes3(bridgeId), 32, "bridgeId"),
      expectLength3(toBytes3(depositId), 32, "depositId"),
      uint64Word2(off0, "lockReceiptOffset"),
      uint64Word2(off1, "zkProofOffset"),
      uint64Word2(off2, "publicInputsOffset"),
      uint64Word2(BigInt(receipt.length), "lockReceiptLength"),
      padTo322(receipt),
      uint64Word2(BigInt(proof.length), "zkProofLength"),
      padTo322(proof),
      uint64Word2(BigInt(inputs.length), "publicInputsLength"),
      padTo322(inputs)
    )
  );
}
function isBridgeAdminLockedRevert(data) {
  return bytesToHex5(toBytes3(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeAdminLocked;
}
function isBridgeResumeCooldownActiveRevert(data) {
  return bytesToHex5(toBytes3(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeResumeCooldownActive;
}
function isBridgeCooldownZeroRevert(data) {
  return bytesToHex5(toBytes3(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeCooldownZero;
}
function isBridgeFinalityZeroRevert(data) {
  return bytesToHex5(toBytes3(data)).toLowerCase() === BRIDGE_REVERT_TAGS.bridgeFinalityZero;
}
function bridgeDrainRemaining(capPerWindow, drained) {
  const cap = BigInt(capPerWindow);
  if (cap === 0n) return null;
  const used = BigInt(drained);
  const left = cap > used ? cap - used : 0n;
  return left.toString(10);
}
function assessBridgeRoute(route) {
  const blockedReasons = [];
  const warnings = [];
  const feeToken = String(route.feeToken ?? "").trim();
  if (route.routeId.trim() === "") blockedReasons.push("route id missing");
  if (route.bridge.trim() === "") blockedReasons.push("bridge name missing");
  if (!isChainlinkCcipRoute(route.protocol, route.bridge, route.verifier.model)) {
    blockedReasons.push("bridge protocol must be Chainlink CCIP");
  }
  if (route.asset.trim() === "") blockedReasons.push("asset disclosure missing");
  if (feeToken === "") {
    blockedReasons.push("route fee token missing");
  } else if (feeToken.toUpperCase() !== V1_BRIDGE_ALLOWED_FEE_TOKEN) {
    blockedReasons.push("CCIP route fee token must be LINK");
  }
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
    blockedReasons.push("no eligible bridge route satisfies the transfer intent and route floor");
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
  const bridge = validateTextField(`${prefix}.bridge`, value.bridge, 64, blockedReasons);
  const protocol = validateOptionalTextField(
    `${prefix}.protocol`,
    field(value, "protocol", "routeProtocol", "route_protocol"),
    64,
    blockedReasons
  );
  validateTextField(`${prefix}.asset`, value.asset, 64, blockedReasons);
  const feeToken = validateTextField(
    `${prefix}.feeToken`,
    field(value, "feeToken", "fee_token"),
    32,
    blockedReasons
  );
  if (feeToken != null && feeToken.toUpperCase() !== V1_BRIDGE_ALLOWED_FEE_TOKEN) {
    blockedReasons.push(`${prefix}.feeToken must be LINK for CCIP routes`);
  }
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
  let verifierModel = null;
  if (!isRecord2(verifier)) {
    blockedReasons.push(`${prefix}.verifier must be an object`);
  } else {
    verifierModel = validateTextField(`${prefix}.verifier.model`, verifier.model, 64, blockedReasons);
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
  if (!isChainlinkCcipRoute(protocol, bridge ?? "", verifierModel ?? "")) {
    blockedReasons.push(`${prefix}.protocol must be Chainlink CCIP`);
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
    protocol: optionalStringField(value, "protocol", "routeProtocol", "route_protocol"),
    asset: stringField2(value, "asset").trim(),
    feeToken: stringField2(value, "feeToken", "fee_token").trim(),
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
function isChainlinkCcipRoute(protocol, bridge, verifierModel) {
  const normalizedProtocol = normalizeBridgeProtocol(protocol ?? "");
  if (normalizedProtocol.length > 0) {
    return normalizedProtocol === "chainlinkccip" || normalizedProtocol === "ccip";
  }
  return bridgeLabelLooksCcip(bridge) || bridgeLabelLooksCcip(verifierModel);
}
function bridgeLabelLooksCcip(value) {
  return normalizeBridgeProtocol(value).includes("ccip");
}
function normalizeBridgeProtocol(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
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
function field(record, ...keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return void 0;
}
function stringField2(record, ...keys) {
  return field(record, ...keys);
}
function optionalStringField(record, ...keys) {
  let raw;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      raw = record[key];
      break;
    }
  }
  if (raw === void 0 || raw === null) return null;
  return typeof raw === "string" ? raw.trim() : "";
}
function numberField(record, ...keys) {
  return field(record, ...keys);
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
function validateOptionalTextField(name, value, maxLen, blockedReasons) {
  if (value === void 0 || value === null) return null;
  return validateTextField(name, value, maxLen, blockedReasons);
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
function uint64Word2(value, name) {
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
function toBytes3(value) {
  if (typeof value === "string") {
    return hexToBytes5(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes5(hex) {
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

// src/operator-trust.ts
var GENESIS_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
var QUARANTINED_RPC_CODE = -32047;
function normaliseHash(input) {
  return typeof input === "string" && GENESIS_HASH_RE.test(input) ? input.toLowerCase() : null;
}
function isQuarantineError(err) {
  if (err instanceof SdkError && err.code === QUARANTINED_RPC_CODE) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /quarantin/i.test(message);
}
async function verifyOperatorGenesis(client, expectedGenesisHash) {
  const pinned = normaliseHash(expectedGenesisHash);
  try {
    const stats = await client.lythChainStats();
    const observed = normaliseHash(stats.genesisHash);
    if (observed === null) {
      return { ok: false, observed: null, quarantined: false };
    }
    return { ok: pinned !== null && observed === pinned, observed, quarantined: false };
  } catch (err) {
    if (isQuarantineError(err)) {
      return { ok: false, observed: null, quarantined: true };
    }
    return { ok: false, observed: null, quarantined: false };
  }
}
var OperatorTrustError = class extends SdkError {
  reason;
  constructor(reason, message) {
    super("endpoint", message);
    this.name = "OperatorTrustError";
    this.reason = reason;
  }
};
async function selectTrustedOperator(chain, options = {}) {
  if (chain.rpc.length === 0) {
    throw new OperatorTrustError(
      "unreachable",
      `network ${chain.network} has no RPC endpoints`
    );
  }
  const expectedChainId = BigInt(chain.chain_id);
  let sawRegenesis = false;
  let sawWrongChain = false;
  let sawUntrusted = false;
  let sawQuarantined = false;
  const probes = chain.rpc.map(async (ep) => {
    const client = new RpcClient(ep.url, options);
    let chainId;
    try {
      chainId = await client.ethChainId();
    } catch (err) {
      if (isQuarantineError(err)) sawQuarantined = true;
      throw err;
    }
    if (chainId !== expectedChainId) {
      sawWrongChain = true;
      throw new SdkError("endpoint", `${ep.url}: chain id ${chainId} != ${chain.chain_id}`);
    }
    const verdict = await verifyOperatorGenesis(client, chain.genesis_hash);
    if (verdict.quarantined) {
      sawQuarantined = true;
      throw new SdkError("endpoint", `${ep.url}: quarantined`);
    }
    if (!verdict.ok) {
      if (verdict.observed !== null) sawRegenesis = true;
      else sawUntrusted = true;
      throw new SdkError("endpoint", `${ep.url}: genesis not trusted`);
    }
    return client;
  });
  try {
    return await Promise.any(probes);
  } catch {
    const reason = sawRegenesis ? "regenesis" : sawWrongChain ? "wrong-chain" : sawUntrusted ? "untrusted" : sawQuarantined ? "quarantined" : "unreachable";
    throw new OperatorTrustError(
      reason,
      `no trusted operator for ${chain.network} (${reason})`
    );
  }
}
async function selectTrustedOperatorForNetwork(network = "testnet-69420", options = {}) {
  return selectTrustedOperator(getChainInfo(network), options);
}
var NO_EVM_RECEIPT_PROOF_SCHEMA = "mono.no_evm_receipt_proof.v1";
var NO_EVM_RECEIPT_PROOF_TYPE = "canonicalReceiptsTranscript";
var NO_EVM_RECEIPT_INCLUSION_PROOF_TYPE = "canonicalReceiptInclusion";
var NO_EVM_RECEIPT_ROOT_ALGORITHM = "keccak256-binary-merkle(monolythium/v4.1/receipt_leaf/1, monolythium/v4.1/receipt_node/1, duplicate-last padding)";
var NO_EVM_LEGACY_BINARY_RECEIPT_ROOT_ALGORITHM = "keccak256(monolythium/v4.1/receipts_root_empty/1|receipt_leaf/1|receipt_node/1 binary Merkle)";
var NO_EVM_LEGACY_RECEIPT_ROOT_ALGORITHM = "keccak256(monolythium/v2/receipts_root/1 || len || indexed bincode receipts)";
var NO_EVM_RECEIPT_CODEC = "bincode(protocore_execution_types::Receipt)";
var NO_EVM_RECEIPTS_ROOT_DOMAIN = "monolythium/v4.1/receipts_root_empty/1";
var NO_EVM_RECEIPT_LEAF_DOMAIN = "monolythium/v4.1/receipt_leaf/1";
var NO_EVM_RECEIPT_NODE_DOMAIN = "monolythium/v4.1/receipt_node/1";
var NO_EVM_COMPACT_INCLUSION_PROOF_SCHEMA = "mono.no_evm_receipt_compact_inclusion.v1";
var NO_EVM_COMPACT_INCLUSION_TREE_ALGORITHM = "binary-keccak-receipt-tree";
var NO_EVM_ARCHIVE_PROOF_SCHEMA = "mono.no_evm_receipt_archive_binding.v1";
var NO_EVM_ARCHIVE_SIGNATURE_SCHEME = "mono.snapshot.sig.v1";
var NO_EVM_FINALITY_EVIDENCE_SCHEMA = "mono.no_evm_receipt_finality.v1";
var NO_EVM_FINALITY_EVIDENCE_SOURCE = "roundCertificate";
var EMPTY_ROOT_DOMAIN_BYTES = new TextEncoder().encode(NO_EVM_RECEIPTS_ROOT_DOMAIN);
var LEAF_DOMAIN_BYTES = new TextEncoder().encode(NO_EVM_RECEIPT_LEAF_DOMAIN);
var NODE_DOMAIN_BYTES = new TextEncoder().encode(NO_EVM_RECEIPT_NODE_DOMAIN);
var UINT32_MAX = 4294967295;
var HASH_BYTE_LENGTH = 32;
var ARCHIVE_SIGNATURE_SIGNER_ID_BYTE_LENGTH = 20;
var BLS_PUBLIC_KEY_BYTE_LENGTH2 = 48;
var BLS_SIGNATURE_BYTE_LENGTH = 96;
var BLS_DST = "BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";
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
  return bytesToHex6(computeNoEvmReceiptsRootBytes(receipts));
}
function computeNoEvmTargetReceiptHash(receiptBytes) {
  return bytesToHex6(keccak_256(receiptBytes));
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
function verifyNoEvmArchiveProofSignatures(archiveProof, trustedSigners, threshold) {
  if (!Number.isSafeInteger(threshold) || threshold < 1) {
    throw new NoEvmReceiptProofError("invalid_proof_shape", "threshold must be at least 1");
  }
  validateArchiveProofObject(archiveProof);
  const roster = /* @__PURE__ */ new Map();
  trustedSigners.forEach((signer, index) => {
    const publicKey = expectArchivePublicKey(signer.publicKey, `trustedSigners[${index}].publicKey`);
    const signerId = mlDsa65AddressFromPublicKey(publicKey);
    if (signer.signerId !== void 0 && normalizeSignerId(signer.signerId) !== signerId) {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        `trustedSigners[${index}].signerId does not match public key signer id ${signerId}`
      );
    }
    if (roster.has(signerId)) {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        `trustedSigners contains duplicate signer id ${signerId}`
      );
    }
    roster.set(signerId, publicKey);
  });
  const signatureMaterial = archiveProof.signatureDigest != null || archiveProof.signatures.length > 0 ? {
    digestValue: archiveProof.signatureDigest,
    digestField: "archiveProof.signatureDigest",
    signatures: archiveProof.signatures,
    signatureFieldPrefix: "archiveProof.signatures"
  } : archiveProof.coveringSnapshot != null ? {
    digestValue: archiveProof.coveringSnapshot.signatureDigest,
    digestField: "archiveProof.coveringSnapshot.signatureDigest",
    signatures: archiveProof.coveringSnapshot.signatures,
    signatureFieldPrefix: "archiveProof.coveringSnapshot.signatures"
  } : {
    digestValue: archiveProof.signatureDigest,
    digestField: "archiveProof.signatureDigest",
    signatures: archiveProof.signatures,
    signatureFieldPrefix: "archiveProof.signatures"
  };
  const issues = [];
  const digestValue = signatureMaterial.digestValue;
  if (digestValue == null) {
    issues.push({
      code: "missing_signature_digest",
      message: "archiveProof.signatureDigest is required for signature verification"
    });
    return {
      verified: false,
      threshold,
      validSigners: [],
      checkedSignatures: signatureMaterial.signatures.length,
      issues
    };
  }
  const signatureDigest = decodeHash(digestValue, signatureMaterial.digestField);
  const seen = /* @__PURE__ */ new Set();
  const validSigners = [];
  signatureMaterial.signatures.forEach((signature, signatureIndex) => {
    const parsed = parseArchiveProofSignature(
      signature,
      signatureIndex,
      signatureMaterial.signatureFieldPrefix
    );
    if (seen.has(parsed.signerId)) {
      issues.push({
        code: "duplicate_signer",
        message: `duplicate archive proof signer ${parsed.signerId}`,
        signatureIndex,
        signerId: parsed.signerId
      });
      return;
    }
    seen.add(parsed.signerId);
    const publicKey = roster.get(parsed.signerId);
    if (publicKey === void 0) {
      issues.push({
        code: "untrusted_signer",
        message: `archive proof signer ${parsed.signerId} is not trusted`,
        signatureIndex,
        signerId: parsed.signerId
      });
      return;
    }
    if (parsed.payload.length !== ML_DSA_65_SIGNATURE_LEN) {
      issues.push({
        code: "invalid_signature",
        message: `archive proof signature payload must be ${ML_DSA_65_SIGNATURE_LEN} bytes`,
        signatureIndex,
        signerId: parsed.signerId
      });
      return;
    }
    let ok = false;
    try {
      ok = ml_dsa65.verify(parsed.payload, signatureDigest, publicKey);
    } catch {
      issues.push({
        code: "invalid_trusted_public_key",
        message: `trusted public key for ${parsed.signerId} is malformed`,
        signatureIndex,
        signerId: parsed.signerId
      });
      return;
    }
    if (ok) {
      validSigners.push(parsed.signerId);
    } else {
      issues.push({
        code: "invalid_signature",
        message: `archive proof signature from ${parsed.signerId} is invalid`,
        signatureIndex,
        signerId: parsed.signerId
      });
    }
  });
  if (validSigners.length < threshold) {
    issues.push({
      code: "threshold_not_met",
      message: `archive proof has ${validSigners.length} valid trusted signatures, below threshold ${threshold}`
    });
  }
  return {
    verified: issues.length === 0,
    threshold,
    validSigners,
    checkedSignatures: signatureMaterial.signatures.length,
    issues
  };
}
function computeNoEvmRoundFinalityMessage(chainId, round) {
  const preimage = new Uint8Array(5 + 8 + 8);
  preimage.set(new TextEncoder().encode("round"), 0);
  writeU64Le(preimage, 5, chainId, "chainId");
  writeU64Le(preimage, 13, round, "round");
  return blake3(preimage);
}
function computeNoEvmLeaderFinalityMessage(chainId, blockReference) {
  return computeNoEvmBlockFinalityMessage("leader", chainId, blockReference);
}
function computeNoEvmDacFinalityMessage(chainId, blockReference) {
  return computeNoEvmBlockFinalityMessage("dac", chainId, blockReference);
}
function computeNoEvmBlockFinalityMessage(domain, chainId, blockReference) {
  const domainBytes = new TextEncoder().encode(domain);
  const digest = decodeHash(
    blockReference.digest,
    "finalityEvidence.blockReference.digest"
  );
  const preimage = new Uint8Array(domainBytes.length + 8 + 2 + 8 + HASH_BYTE_LENGTH);
  let offset = 0;
  preimage.set(domainBytes, offset);
  offset += domainBytes.length;
  writeU64Le(preimage, offset, chainId, "chainId");
  offset += 8;
  writeU16Le(preimage, offset, blockReference.authority, "finalityEvidence.blockReference.authority");
  offset += 2;
  writeU64Le(preimage, offset, blockReference.round, "finalityEvidence.blockReference.round");
  offset += 8;
  preimage.set(digest, offset);
  return blake3(preimage);
}
function verifyNoEvmFinalityEvidenceThreshold(finalityEvidence, options) {
  validateFinalityThreshold(options.threshold, options.committeeSize);
  const clusterPublicKey = expectBlsBytes(
    options.clusterPublicKey,
    BLS_PUBLIC_KEY_BYTE_LENGTH2,
    "clusterPublicKey"
  );
  validateFinalityEvidenceForVerification(finalityEvidence);
  const message = computeNoEvmRoundFinalityMessage(options.chainId, finalityEvidence.round);
  return verifyFinalityCertificateThreshold(
    finalityEvidence.certificate,
    "finalityEvidence.certificate",
    message,
    clusterPublicKey,
    options.committeeSize,
    options.threshold
  );
}
function verifyNoEvmFinalityEvidenceMultisig(finalityEvidence, options) {
  validateFinalityThreshold(options.threshold, options.trustedSigners.length);
  validateFinalityEvidenceForVerification(finalityEvidence);
  const message = computeNoEvmRoundFinalityMessage(options.chainId, finalityEvidence.round);
  return verifyFinalityCertificateMultisig(
    finalityEvidence.certificate,
    "finalityEvidence.certificate",
    message,
    options.trustedSigners,
    options.threshold
  );
}
function verifyNoEvmBlockFinalityEvidenceThreshold(finalityEvidence, options) {
  validateFinalityThreshold(options.threshold, options.committeeSize);
  validateFinalityEvidenceForVerification(finalityEvidence);
  const clusterPublicKey = expectBlsBytes(
    options.clusterPublicKey,
    BLS_PUBLIC_KEY_BYTE_LENGTH2,
    "clusterPublicKey"
  );
  const blockReference = requireBlockReference(finalityEvidence);
  const leaderCertificate = requireBlockFinalityCertificate(
    finalityEvidence.leaderCertificate,
    "finalityEvidence.leaderCertificate"
  );
  const dacCertificate = requireBlockFinalityCertificate(
    finalityEvidence.dacCertificate,
    "finalityEvidence.dacCertificate"
  );
  const leaderMessage = computeNoEvmLeaderFinalityMessage(options.chainId, blockReference);
  const dacMessage = computeNoEvmDacFinalityMessage(options.chainId, blockReference);
  const leaderVerification = verifyFinalityCertificateThreshold(
    leaderCertificate,
    "finalityEvidence.leaderCertificate",
    leaderMessage,
    clusterPublicKey,
    options.committeeSize,
    options.threshold
  );
  const dacVerification = verifyFinalityCertificateThreshold(
    dacCertificate,
    "finalityEvidence.dacCertificate",
    dacMessage,
    clusterPublicKey,
    options.committeeSize,
    options.threshold
  );
  return {
    blockReference,
    leaderCertificate: leaderVerification,
    dacCertificate: dacVerification,
    verified: leaderVerification.verified && dacVerification.verified
  };
}
function verifyNoEvmBlockFinalityEvidenceMultisig(finalityEvidence, options) {
  validateFinalityThreshold(options.threshold, options.trustedSigners.length);
  validateFinalityEvidenceForVerification(finalityEvidence);
  const blockReference = requireBlockReference(finalityEvidence);
  const leaderCertificate = requireBlockFinalityCertificate(
    finalityEvidence.leaderCertificate,
    "finalityEvidence.leaderCertificate"
  );
  const dacCertificate = requireBlockFinalityCertificate(
    finalityEvidence.dacCertificate,
    "finalityEvidence.dacCertificate"
  );
  const leaderMessage = computeNoEvmLeaderFinalityMessage(options.chainId, blockReference);
  const dacMessage = computeNoEvmDacFinalityMessage(options.chainId, blockReference);
  const leaderVerification = verifyFinalityCertificateMultisig(
    leaderCertificate,
    "finalityEvidence.leaderCertificate",
    leaderMessage,
    options.trustedSigners,
    options.threshold
  );
  const dacVerification = verifyFinalityCertificateMultisig(
    dacCertificate,
    "finalityEvidence.dacCertificate",
    dacMessage,
    options.trustedSigners,
    options.threshold
  );
  return {
    blockReference,
    leaderCertificate: leaderVerification,
    dacCertificate: dacVerification,
    verified: leaderVerification.verified && dacVerification.verified
  };
}
function verifyFinalityCertificateMultisig(certificate, field2, message, trustedSigners, threshold) {
  const signature = decodeFinalityCertificateSignature(certificate, field2);
  const signerIndices = signerIndicesFromBitmap(
    decodeHexBytes(certificate.signersBitmap, `${field2}.signersBitmap`)
  );
  const committeeSize = trustedSigners.reduce((max, signer) => Math.max(max, signer.authorityIndex), -1) + 1;
  const base = finalityCertificateVerificationBase(
    certificate,
    signerIndices,
    committeeSize,
    threshold
  );
  const roster = /* @__PURE__ */ new Map();
  trustedSigners.forEach((signer, index) => {
    assertUint32(signer.authorityIndex, `trustedSigners[${index}].authorityIndex`);
    if (signer.authorityIndex > 65535) {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        `trustedSigners[${index}].authorityIndex must fit u16`
      );
    }
    if (roster.has(signer.authorityIndex)) {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        `trustedSigners contains duplicate authority index ${signer.authorityIndex}`
      );
    }
    roster.set(
      signer.authorityIndex,
      expectBlsBytes(
        signer.publicKey,
        BLS_PUBLIC_KEY_BYTE_LENGTH2,
        `trustedSigners[${index}].publicKey`
      )
    );
  });
  const publicKeys = [];
  let allSignersTrusted = true;
  signerIndices.forEach((signerIndex) => {
    const publicKey = roster.get(signerIndex);
    if (publicKey === void 0) {
      allSignersTrusted = false;
    } else {
      publicKeys.push(publicKey);
    }
  });
  const signatureValid = allSignersTrusted && publicKeys.length > 0 && verifyBlsAggregateSignature(publicKeys, message, signature);
  return finalizeBlsFinalityVerification({
    ...base,
    allSignersTrusted,
    signatureValid
  });
}
function verifyFinalityCertificateThreshold(certificate, field2, message, clusterPublicKey, committeeSize, threshold) {
  const signature = decodeFinalityCertificateSignature(certificate, field2);
  const signerIndices = signerIndicesFromBitmap(
    decodeHexBytes(certificate.signersBitmap, `${field2}.signersBitmap`)
  );
  const base = finalityCertificateVerificationBase(
    certificate,
    signerIndices,
    committeeSize,
    threshold
  );
  const signatureValid = base.signerIndicesInRange && verifyBlsSignature(clusterPublicKey, message, signature);
  return finalizeBlsFinalityVerification({
    ...base,
    allSignersTrusted: base.signerIndicesInRange,
    signatureValid
  });
}
function verifyNoEvmReceiptProofTrust(proof, policy) {
  const receiptProof = verifyNoEvmReceiptProof(proof);
  const issues = [];
  let archiveSignatures = null;
  let finalityEvidence = null;
  if (receiptProof == null) {
    issues.push({
      code: "missing_receipt_proof",
      message: "native receipt proof is required for trust verification"
    });
  }
  if (policy.archive != null) {
    const archiveProof = proof == null ? null : proof.archiveProof;
    if (archiveProof == null) {
      issues.push({
        code: "missing_archive_proof",
        message: "native receipt proof does not carry archive signature material"
      });
    } else {
      const proofBlockHeight = proof.blockHeight;
      const blockHeight = BigInt(proofBlockHeight);
      const archivePolicyValid = isWithinOptionalBounds(
        blockHeight,
        policy.archive.validFromHeight,
        policy.archive.validToHeight
      );
      const activeTrustedSigners = policy.archive.trustedSigners.filter(
        (signer) => isWithinOptionalBounds(blockHeight, signer.validFromHeight, signer.validToHeight)
      );
      if (!archivePolicyValid) {
        issues.push({
          code: "archive_policy_not_valid_at_height",
          message: `archive trust policy is not valid at block height ${proofBlockHeight}`
        });
      }
      archiveSignatures = verifyNoEvmArchiveProofSignatures(
        archiveProof,
        activeTrustedSigners,
        policy.archive.threshold
      );
      if (!archiveSignatures.verified) {
        issues.push({
          code: "archive_verification_failed",
          message: "archive signature material did not satisfy the trusted policy"
        });
      }
    }
  }
  if (policy.finality != null) {
    const proofFinality = proof == null ? null : proof.finalityEvidence;
    if (proofFinality == null) {
      issues.push({
        code: "missing_finality_evidence",
        message: "native receipt proof does not carry BLS finality evidence"
      });
    } else {
      const chainId = policy.finality.chainId ?? policy.chainId;
      if (chainId == null) {
        issues.push({
          code: "missing_finality_chain_id",
          message: "finality trust policy requires a chain id"
        });
      } else if (policy.finality.mode === "cluster") {
        const round = BigInt(proofFinality.round);
        const finalityPolicyValid = isWithinOptionalBounds(
          round,
          policy.finality.validFromRound,
          policy.finality.validToRound
        );
        if (!finalityPolicyValid) {
          issues.push({
            code: "finality_policy_not_valid_at_round",
            message: `finality trust policy is not valid at round ${proofFinality.round}`
          });
        }
        finalityEvidence = verifyNoEvmFinalityEvidenceThreshold(proofFinality, {
          chainId,
          clusterPublicKey: policy.finality.clusterPublicKey,
          committeeSize: policy.finality.committeeSize,
          threshold: policy.finality.threshold
        });
      } else {
        const round = BigInt(proofFinality.round);
        const finalityPolicyValid = isWithinOptionalBounds(
          round,
          policy.finality.validFromRound,
          policy.finality.validToRound
        );
        const activeTrustedSigners = policy.finality.trustedSigners.filter(
          (signer) => isWithinOptionalBounds(round, signer.validFromRound, signer.validToRound)
        );
        if (!finalityPolicyValid) {
          issues.push({
            code: "finality_policy_not_valid_at_round",
            message: `finality trust policy is not valid at round ${proofFinality.round}`
          });
        }
        finalityEvidence = verifyNoEvmFinalityEvidenceMultisig(proofFinality, {
          chainId,
          trustedSigners: activeTrustedSigners,
          threshold: policy.finality.threshold
        });
      }
      if (finalityEvidence != null && !finalityEvidence.verified) {
        issues.push({
          code: "finality_verification_failed",
          message: "BLS finality evidence did not satisfy the trusted policy"
        });
      }
    }
  }
  return {
    verified: receiptProof != null && issues.length === 0,
    receiptProof,
    archiveSignatures,
    finalityEvidence,
    issues
  };
}
function isWithinOptionalBounds(value, validFrom, validTo) {
  if (validFrom != null && value < BigInt(validFrom)) return false;
  if (validTo != null && value > BigInt(validTo)) return false;
  return true;
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
  if (!bytesEqual2(expectedRoot, decodeHash(actualRoot, "computedReceiptsRoot"))) {
    throw new NoEvmReceiptProofError(
      "receipts_root_mismatch",
      `receiptsRoot mismatch: expected ${proof.receiptsRoot}, computed ${actualRoot}`
    );
  }
  const actualTargetHash = computeNoEvmTargetReceiptHash(targetReceipt);
  const expectedTargetHash = decodeHash(proof.targetReceiptHash, "targetReceiptHash");
  if (!bytesEqual2(expectedTargetHash, decodeHash(actualTargetHash, "computedTargetReceiptHash"))) {
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
  if (!bytesEqual2(expectedTargetHash, decodeHash(actualTargetHash, "computedTargetReceiptHash"))) {
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
  if (!bytesEqual2(expectedLeafHashBytes, actualLeafHashBytes)) {
    throw new NoEvmReceiptProofError(
      "compact_leaf_hash_mismatch",
      `compactInclusionProof.leafHash mismatch: expected ${compactProof.leafHash}, computed ${bytesToHex6(
        actualLeafHashBytes
      )}`
    );
  }
  const compactRootBytes = decodeHash(compactProof.root, "compactInclusionProof.root");
  const receiptsRootBytes = decodeHash(proof.receiptsRoot, "receiptsRoot");
  if (!bytesEqual2(receiptsRootBytes, compactRootBytes)) {
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
  if (!bytesEqual2(actualRootBytes, compactRootBytes)) {
    throw new NoEvmReceiptProofError(
      "compact_path_mismatch",
      `compact inclusion path mismatch: expected ${compactProof.root}, computed ${bytesToHex6(
        actualRootBytes
      )}`
    );
  }
  return {
    receipts: [],
    receiptsRoot: bytesToHex6(actualRootBytes),
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
  validateArchiveProofObject(archiveProof, proof.blockHeight);
}
function validateArchiveProofObject(archiveProof, proofBlockHeight) {
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
  const archiveContentHash = decodeHash(archiveProof.contentHash, "archiveProof.contentHash");
  if (archiveProof.signatureDigest != null) {
    decodeHash(archiveProof.signatureDigest, "archiveProof.signatureDigest");
  }
  if (!Array.isArray(archiveProof.signatures) || archiveProof.signatures.some((signature) => typeof signature !== "string")) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.signatures must be an array of strings"
    );
  }
  archiveProof.signatures.forEach(
    (signature, index) => validateArchiveProofSignature(signature, index, "archiveProof.signatures")
  );
  if (archiveProof.coveringSnapshot != null) {
    validateCoveringSnapshotObject(
      archiveProof.coveringSnapshot,
      archiveContentHash,
      proofBlockHeight
    );
  }
}
function validateCoveringSnapshotObject(snapshot, archiveContentHash, proofBlockHeight) {
  if (!isRecord3(snapshot)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.coveringSnapshot must be an object when present"
    );
  }
  assertSafeNonNegativeInteger(
    snapshot.snapshotHeight,
    "archiveProof.coveringSnapshot.snapshotHeight"
  );
  assertSafeNonNegativeInteger(
    snapshot.checkpointFrom,
    "archiveProof.coveringSnapshot.checkpointFrom"
  );
  assertSafeNonNegativeInteger(snapshot.checkpointTo, "archiveProof.coveringSnapshot.checkpointTo");
  decodeHash(snapshot.manifestHash, "archiveProof.coveringSnapshot.manifestHash");
  decodeHash(snapshot.signatureDigest, "archiveProof.coveringSnapshot.signatureDigest");
  decodeHash(snapshot.contentHash, "archiveProof.coveringSnapshot.contentHash");
  const checkpointContentHash = decodeHash(
    snapshot.checkpointContentHash,
    "archiveProof.coveringSnapshot.checkpointContentHash"
  );
  if (snapshot.checkpointFrom !== 0) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.coveringSnapshot.checkpointFrom must be 0"
    );
  }
  if (snapshot.checkpointTo > snapshot.snapshotHeight) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.coveringSnapshot.checkpointTo must be <= snapshotHeight"
    );
  }
  if (proofBlockHeight !== void 0 && snapshot.checkpointTo !== proofBlockHeight) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.coveringSnapshot.checkpointTo must match blockHeight"
    );
  }
  if (!bytesEqual2(checkpointContentHash, archiveContentHash)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.coveringSnapshot.checkpointContentHash must match archiveProof.contentHash"
    );
  }
  if (!Array.isArray(snapshot.signatures) || snapshot.signatures.some((signature) => typeof signature !== "string")) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.coveringSnapshot.signatures must be an array of strings"
    );
  }
  if (snapshot.signatures.length === 0) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.coveringSnapshot.signatures must be non-empty"
    );
  }
  snapshot.signatures.forEach(
    (signature, index) => validateArchiveProofSignature(
      signature,
      index,
      "archiveProof.coveringSnapshot.signatures"
    )
  );
}
function validateArchiveProofSignature(signature, index, fieldPrefix) {
  parseArchiveProofSignature(signature, index, fieldPrefix);
}
function parseArchiveProofSignature(signature, index, fieldPrefix = "archiveProof.signatures") {
  const field2 = `${fieldPrefix}[${index}]`;
  const parts = signature.split(":");
  if (parts.length !== 3 || parts[0] !== NO_EVM_ARCHIVE_SIGNATURE_SCHEME) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `${field2} must match ${NO_EVM_ARCHIVE_SIGNATURE_SCHEME}:0x<20-byte signer-id hex>:0x<non-empty payload hex>`
    );
  }
  const signerIdHex = parts[1];
  const payloadHex = parts[2];
  if (!signerIdHex.startsWith("0x")) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `${field2}.signerId must be 0x-prefixed`
    );
  }
  if (!payloadHex.startsWith("0x")) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `${field2}.payload must be 0x-prefixed`
    );
  }
  const signerId = decodeHexBytes(signerIdHex, `${field2}.signerId`);
  if (signerId.length !== ARCHIVE_SIGNATURE_SIGNER_ID_BYTE_LENGTH) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `${field2}.signerId must be ${ARCHIVE_SIGNATURE_SIGNER_ID_BYTE_LENGTH} bytes, got ${signerId.length}`
    );
  }
  const payload = decodeHexBytes(payloadHex, `${field2}.payload`);
  if (payload.length === 0) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `${field2}.payload must be non-empty`
    );
  }
  return { signerId: bytesToHex6(signerId), payload };
}
function normalizeSignerId(value) {
  const bytes = decodeHexBytes(value, "signerId");
  if (bytes.length !== ARCHIVE_SIGNATURE_SIGNER_ID_BYTE_LENGTH) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `signerId must be ${ARCHIVE_SIGNATURE_SIGNER_ID_BYTE_LENGTH} bytes, got ${bytes.length}`
    );
  }
  return bytesToHex6(bytes);
}
function expectArchivePublicKey(value, field2) {
  if (value.length !== ML_DSA_65_PUBLIC_KEY_LEN) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      `${field2} must be ${ML_DSA_65_PUBLIC_KEY_LEN} bytes, got ${value.length}`
    );
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
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
  const round = finalityEvidence["round"];
  validateFinalityCertificateObject(
    finalityEvidence["certificate"],
    round,
    "finalityEvidence.certificate"
  );
  validateOptionalBlockFinalityFields(finalityEvidence, round, proof.blockHash);
}
function validateFinalityEvidenceForVerification(finalityEvidence) {
  if (!isRecord3(finalityEvidence)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence must be an object"
    );
  }
  assertSupported(
    finalityEvidence.schema,
    NO_EVM_FINALITY_EVIDENCE_SCHEMA,
    "finalityEvidence.schema",
    "unsupported_schema"
  );
  assertSupported(
    finalityEvidence.source,
    NO_EVM_FINALITY_EVIDENCE_SOURCE,
    "finalityEvidence.source",
    "unsupported_schema"
  );
  assertUint32(finalityEvidence.round, "finalityEvidence.round");
  validateFinalityCertificateObject(
    finalityEvidence.certificate,
    finalityEvidence.round,
    "finalityEvidence.certificate"
  );
  validateOptionalBlockFinalityFields(
    finalityEvidence,
    finalityEvidence.round
  );
}
function validateOptionalBlockFinalityFields(finalityEvidence, round, proofBlockHash) {
  const blockReference = finalityEvidence["blockReference"];
  if (blockReference != null) {
    validateFinalityBlockReference(blockReference, round, proofBlockHash);
  } else if (finalityEvidence["leaderCertificate"] != null || finalityEvidence["dacCertificate"] != null) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.blockReference is required for block-bound certificates"
    );
  }
  if (finalityEvidence["leaderCertificate"] != null) {
    validateFinalityCertificateObject(
      finalityEvidence["leaderCertificate"],
      round,
      "finalityEvidence.leaderCertificate"
    );
  }
  if (finalityEvidence["dacCertificate"] != null) {
    validateFinalityCertificateObject(
      finalityEvidence["dacCertificate"],
      round,
      "finalityEvidence.dacCertificate"
    );
  }
}
function validateFinalityBlockReference(blockReference, round, proofBlockHash) {
  if (!isRecord3(blockReference)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.blockReference must be an object"
    );
  }
  assertUint32(blockReference["round"], "finalityEvidence.blockReference.round");
  if (blockReference["round"] !== round) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.blockReference.round must match finalityEvidence.round"
    );
  }
  assertUint32(blockReference["authority"], "finalityEvidence.blockReference.authority");
  if (blockReference["authority"] > 65535) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.blockReference.authority must fit u16"
    );
  }
  const digest = decodeHash(
    blockReference["digest"],
    "finalityEvidence.blockReference.digest"
  );
  if (proofBlockHash !== void 0) {
    const blockHash = decodeHash(proofBlockHash, "blockHash");
    if (!bytesEqual2(digest, blockHash)) {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        "finalityEvidence.blockReference.digest must match blockHash"
      );
    }
  }
}
function validateFinalityCertificateObject(certificate, round, field2) {
  if (!isRecord3(certificate)) {
    throw new NoEvmReceiptProofError("invalid_proof_shape", `${field2} must be an object`);
  }
  assertUint32(certificate["round"], `${field2}.round`);
  if (certificate["round"] !== round) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      `${field2}.round must match finalityEvidence.round`
    );
  }
  decodeHexBytes(certificate["signature"], `${field2}.signature`);
  decodeHexBytes(certificate["signersBitmap"], `${field2}.signersBitmap`);
  const signerIndices = certificate["signerIndices"];
  if (!Array.isArray(signerIndices)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      `${field2}.signerIndices must be an array`
    );
  }
  signerIndices.forEach((index, signerIndex) => {
    assertUint32(index, `${field2}.signerIndices[${signerIndex}]`);
    if (index > 65535) {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        `${field2}.signerIndices[${signerIndex}] must fit u16`
      );
    }
  });
  assertUint32(certificate["signerCount"], `${field2}.signerCount`);
  if (certificate["signerCount"] > 65535) {
    throw new NoEvmReceiptProofError("invalid_proof_shape", `${field2}.signerCount must fit u16`);
  }
  if (certificate["signerCount"] !== signerIndices.length) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      `${field2}.signerCount must match signerIndices length`
    );
  }
}
function validateFinalityThreshold(threshold, trustedCapacity) {
  if (!Number.isSafeInteger(threshold) || threshold < 1) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finality evidence threshold must be at least 1"
    );
  }
  if (!Number.isSafeInteger(trustedCapacity) || trustedCapacity < 0 || trustedCapacity > 65535) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finality evidence trusted signer capacity must fit u16"
    );
  }
  if (threshold > trustedCapacity) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      `finality evidence threshold ${threshold} exceeds trusted signer capacity ${trustedCapacity}`
    );
  }
}
function requireBlockReference(finalityEvidence) {
  const blockReference = finalityEvidence.blockReference;
  if (blockReference == null) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.blockReference is required for block-bound finality verification"
    );
  }
  validateFinalityBlockReference(blockReference, finalityEvidence.round);
  return blockReference;
}
function requireBlockFinalityCertificate(certificate, field2) {
  if (certificate == null) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      `${field2} is required for block-bound finality verification`
    );
  }
  return certificate;
}
function decodeFinalityCertificateSignature(certificate, field2) {
  const signature = decodeHexBytes(certificate.signature, `${field2}.signature`);
  if (signature.length !== BLS_SIGNATURE_BYTE_LENGTH) {
    throw new NoEvmReceiptProofError(
      "invalid_hash_length",
      `${field2}.signature must be ${BLS_SIGNATURE_BYTE_LENGTH} bytes, got ${signature.length}`
    );
  }
  return signature;
}
function signerIndicesFromBitmap(bitmap) {
  const out = [];
  bitmap.forEach((byte, byteIndex) => {
    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      if ((byte & 1 << bitIndex) === 0) continue;
      const signerIndex = byteIndex * 8 + bitIndex;
      if (signerIndex > 65535) {
        throw new NoEvmReceiptProofError(
          "invalid_proof_shape",
          "finalityEvidence signer bitmap index exceeds u16 authority range"
        );
      }
      out.push(signerIndex);
    }
  });
  return out;
}
function finalityCertificateVerificationBase(certificate, bitmapSignerIndices, committeeSize, threshold) {
  const signerCountMatches = certificate.signerCount === certificate.signerIndices.length && certificate.signerCount === bitmapSignerIndices.length;
  const signerBitmapMatchesIndices = arraysEqual(certificate.signerIndices, bitmapSignerIndices);
  const signerIndicesInRange = bitmapSignerIndices.every(
    (signerIndex) => signerIndex < committeeSize
  );
  const acceptedSignatureCount = bitmapSignerIndices.length;
  return {
    finalityEvidencePresent: true,
    signerCountMatches,
    signerBitmapMatchesIndices,
    signerIndicesInRange,
    allSignersTrusted: false,
    thresholdMet: acceptedSignatureCount >= threshold,
    signatureValid: false,
    acceptedSignatureCount,
    requiredSignatureCount: threshold
  };
}
function finalizeBlsFinalityVerification(verification) {
  return {
    ...verification,
    verified: verification.finalityEvidencePresent && verification.signerCountMatches && verification.signerBitmapMatchesIndices && verification.signerIndicesInRange && verification.allSignersTrusted && verification.thresholdMet && verification.signatureValid
  };
}
function verifyBlsSignature(publicKey, message, signature) {
  try {
    const hashedMessage = bls12_381.longSignatures.hash(message, BLS_DST);
    return bls12_381.longSignatures.verify(signature, hashedMessage, publicKey);
  } catch {
    return false;
  }
}
function verifyBlsAggregateSignature(publicKeys, message, signature) {
  try {
    const aggregatePublicKey = bls12_381.longSignatures.aggregatePublicKeys([...publicKeys]);
    return verifyBlsSignature(
      aggregatePublicKey.toBytes(),
      message,
      signature
    );
  } catch {
    return false;
  }
}
function expectBlsBytes(value, expectedLength, field2) {
  const bytes = value instanceof Uint8Array ? value : Uint8Array.from(value);
  if (bytes.length !== expectedLength) {
    throw new NoEvmReceiptProofError(
      "invalid_hash_length",
      `${field2} must be ${expectedLength} bytes, got ${bytes.length}`
    );
  }
  return bytes;
}
function writeU64Le(out, offset, value, field2) {
  if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0)) {
    throw new NoEvmReceiptProofError("invalid_uint32", `${field2} must fit u64`);
  }
  const big = typeof value === "bigint" ? value : BigInt(value);
  if (big < 0n || big > 0xffffffffffffffffn) {
    throw new NoEvmReceiptProofError("invalid_uint32", `${field2} must fit u64`);
  }
  for (let i = 0; i < 8; i += 1) {
    out[offset + i] = Number(big >> BigInt(i * 8) & 0xffn);
  }
}
function writeU16Le(out, offset, value, field2) {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new NoEvmReceiptProofError("invalid_uint32", `${field2} must fit u16`);
  }
  const int = value;
  out[offset] = int & 255;
  out[offset + 1] = int >> 8 & 255;
}
function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
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
  if (actual !== NO_EVM_RECEIPT_ROOT_ALGORITHM && actual !== NO_EVM_LEGACY_BINARY_RECEIPT_ROOT_ALGORITHM && actual !== NO_EVM_LEGACY_RECEIPT_ROOT_ALGORITHM && actual !== NO_EVM_COMPACT_INCLUSION_TREE_ALGORITHM) {
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
function assertSafeNonNegativeInteger(value, field2) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      `${field2} must be a non-negative safe integer`
    );
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
function bytesEqual2(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) {
    diff |= a[index] ^ b[index];
  }
  return diff === 0;
}
function bytesToHex6(bytes) {
  let out = "0x";
  for (let index = 0; index < bytes.length; index++) {
    out += bytes[index].toString(16).padStart(2, "0");
  }
  return out;
}
var TREE_TAG_LEAF = 0;
var TREE_TAG_INTERNAL = 1;
var TREE_TERMINATOR = new Uint8Array(32);
var HASH_BYTE_LENGTH2 = 32;
var PROOF_KIND_BINARY = "binary";
var ProofVerifyError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "ProofVerifyError";
  }
  code;
};
function hashValue(data) {
  return blake3(data);
}
function hashLeaf(path, valueHash) {
  const buf = new Uint8Array(1 + 32 + 32);
  buf[0] = TREE_TAG_LEAF;
  buf.set(path, 1);
  buf.set(valueHash, 33);
  return blake3(buf);
}
function compress(left, right) {
  if (isTerminator(left) && isTerminator(right)) {
    return TREE_TERMINATOR;
  }
  const buf = new Uint8Array(1 + 32 + 32);
  buf[0] = TREE_TAG_INTERNAL;
  buf.set(left, 1);
  buf.set(right, 33);
  return blake3(buf);
}
function isTerminator(hash) {
  for (let i = 0; i < hash.length; i++) {
    if (hash[i] !== 0) return false;
  }
  return true;
}
function pathBit(path, depth) {
  const byte = path[depth >>> 3];
  return byte >>> 7 - (depth & 7) & 1;
}
function foldToRoot(target, current, siblings) {
  const depth = siblings.length;
  let node = current;
  for (let i = 0; i < depth; i++) {
    const level = depth - 1 - i;
    const sibling = siblings[i];
    node = pathBit(target, level) === 0 ? compress(node, sibling) : compress(sibling, node);
  }
  return node;
}
function bytesEqual3(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
function decodeHash2(value, field2) {
  let bytes;
  try {
    bytes = hexToBytes2(value, field2);
  } catch (cause) {
    throw new ProofVerifyError("invalid_hex", `${field2} is not valid hex: ${String(cause)}`);
  }
  if (bytes.length !== HASH_BYTE_LENGTH2) {
    throw new ProofVerifyError(
      "invalid_hash_length",
      `${field2} must be ${HASH_BYTE_LENGTH2} bytes, got ${bytes.length}`
    );
  }
  return bytes;
}
function decodeSiblings(siblings) {
  return siblings.map((sib, index) => decodeHash2(sib, `siblings[${index}]`));
}
function assertBinaryKind(proofKind) {
  if (proofKind !== PROOF_KIND_BINARY) {
    throw new ProofVerifyError(
      "unsupported_proof_kind",
      `unsupported proofKind: ${proofKind} (expected ${PROOF_KIND_BINARY})`
    );
  }
}
var ProofVerifier = class {
  /**
   * Verify a {@link ProofEnvelope} inclusion proof against `stateRoot`.
   *
   * @returns `true` when the proof binds `(key, value)` to `stateRoot`.
   */
  verifyInclusion(stateRoot, proof) {
    assertBinaryKind(proof.proofKind);
    const root = toHashBytes(stateRoot, "stateRoot");
    const key = decodeHex(proof.key, "proof.key");
    const value = decodeHex(proof.value, "proof.value");
    const siblings = decodeSiblings(proof.siblings);
    const target = hashValue(key);
    const leaf = hashLeaf(target, hashValue(value));
    return bytesEqual3(foldToRoot(target, leaf, siblings), root);
  }
  /**
   * Verify a {@link ProofEnvelope} inclusion proof, throwing a
   * {@link ProofVerifyError} on failure (the loud variant for wallets).
   */
  assertInclusion(stateRoot, proof) {
    if (!this.verifyInclusion(stateRoot, proof)) {
      throw new ProofVerifyError(
        "proof_verify_failed",
        `inclusion proof for key ${proof.key} does not verify against the state root`
      );
    }
  }
  /**
   * Verify a {@link NonInclusionProofEnvelope} against `stateRoot`.
   *
   * Returns `false` for a `found` endpoint (that is an inclusion, not
   * absence) or an `otherLeaf` whose path equals the queried key. Mirrors
   * `protocore_state::verify_binary_non_inclusion`.
   */
  verifyNonInclusion(stateRoot, proof) {
    assertBinaryKind(proof.proofKind);
    const root = toHashBytes(stateRoot, "stateRoot");
    const key = decodeHex(proof.key, "proof.key");
    const siblings = decodeSiblings(proof.siblings);
    const target = hashValue(key);
    let endpointHash;
    switch (proof.endpoint.kind) {
      case "found":
        return false;
      case "terminator":
        endpointHash = TREE_TERMINATOR;
        break;
      case "otherLeaf": {
        const path = decodeHash2(proof.endpoint.path, "endpoint.path");
        if (bytesEqual3(path, target)) return false;
        endpointHash = hashLeaf(path, decodeHash2(proof.endpoint.valueHash, "endpoint.valueHash"));
        break;
      }
    }
    return bytesEqual3(foldToRoot(target, endpointHash, siblings), root);
  }
  /**
   * Verify a non-inclusion proof, throwing a {@link ProofVerifyError} on
   * failure.
   */
  assertNonInclusion(stateRoot, proof) {
    if (!this.verifyNonInclusion(stateRoot, proof)) {
      throw new ProofVerifyError(
        "non_inclusion_verify_failed",
        `non-inclusion proof for key ${proof.key} does not verify against the state root`
      );
    }
  }
};
var proofVerifier = new ProofVerifier();
function toHashBytes(value, field2) {
  if (typeof value === "string") return decodeHash2(value, field2);
  return expectBytes(value, HASH_BYTE_LENGTH2, field2);
}
function decodeHex(value, field2) {
  try {
    return hexToBytes2(value, field2);
  } catch (cause) {
    throw new ProofVerifyError("invalid_hex", `${field2} is not valid hex: ${String(cause)}`);
  }
}
function asBinaryProofEnvelope(proof) {
  if (proof == null || typeof proof !== "object") return null;
  const obj = proof;
  if (obj.proofKind !== PROOF_KIND_BINARY) return null;
  if (typeof obj.key !== "string" || typeof obj.value !== "string" || !Array.isArray(obj.siblings) || obj.siblings.some((s) => typeof s !== "string")) {
    return null;
  }
  return {
    proofKind: PROOF_KIND_BINARY,
    siblings: obj.siblings,
    key: obj.key,
    value: obj.value
  };
}
function hashToHex(hash) {
  return bytesToHex2(hash);
}

// src/native-dev.ts
var NATIVE_DEV_HOST_API_VERSION = "0.1.0";
var NATIVE_DEV_MANIFEST_SCHEMA_VERSION = 1;
var NATIVE_DEV_IPC_PROTOCOL_VERSION = "mono.native-dev.ipc.v1";
function compareNativeDevVersions(left, right) {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  for (let index = 0; index < 3; index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) return delta > 0 ? 1 : -1;
  }
  return 0;
}
function checkNativeDevkitCompatibility(manifest, hostApiVersion = NATIVE_DEV_HOST_API_VERSION) {
  if (manifest === void 0 || manifest.schemaVersion !== NATIVE_DEV_MANIFEST_SCHEMA_VERSION) {
    return "invalid_manifest";
  }
  if (manifest.sidecar.ipcProtocolVersion !== NATIVE_DEV_IPC_PROTOCOL_VERSION) {
    return "invalid_manifest";
  }
  if (compareNativeDevVersions(hostApiVersion, manifest.minimumWalletHostApi) < 0) {
    return "too_new_for_host";
  }
  if (compareNativeDevVersions(hostApiVersion, manifest.maximumWalletHostApi) > 0) {
    return "too_old_for_host";
  }
  return "compatible";
}
function resolveStudioHostStatus(args) {
  const hostApiVersion = args.hostApiVersion ?? NATIVE_DEV_HOST_API_VERSION;
  const compatibility = checkNativeDevkitCompatibility(args.manifest, hostApiVersion);
  const installedVersion = args.manifest?.devkitVersion;
  const devkit = {
    installedVersion,
    channel: args.channel,
    hostApiVersion,
    installPath: args.installPath,
    sidecarStatus: args.sidecarStatus ?? (args.installPath ? "stopped" : "missing"),
    manifest: args.manifest,
    compatibility,
    message: nativeDevkitStatusMessage(compatibility, args.installPath)
  };
  if (!args.developerModeEnabled) {
    return {
      state: "disabled",
      developerModeEnabled: false,
      hostApiVersion,
      devkit
    };
  }
  if (!args.installPath || !args.manifest) {
    return {
      state: "missing_devkit",
      developerModeEnabled: true,
      hostApiVersion,
      devkit
    };
  }
  if (compatibility !== "compatible") {
    return {
      state: "incompatible_devkit",
      developerModeEnabled: true,
      hostApiVersion,
      devkit
    };
  }
  return {
    state: "ready",
    developerModeEnabled: true,
    hostApiVersion,
    devkit
  };
}
function assertNativeDevWalletApprovalRequest(request) {
  typedBech32ToAddress(request.authorityAddress, "user");
  if (!request.id.trim()) throw new Error("approval request id is required");
  if (!request.networkId.trim()) throw new Error("approval request network id is required");
  if (!request.title.trim()) throw new Error("approval request title is required");
  if (!request.summary.trim()) throw new Error("approval request summary is required");
}
function assertNativeDevMrvDeployPlan(plan) {
  typedBech32ToAddress(plan.authorityAddress, "user");
  typedBech32ToAddress(plan.expectedContractAddress, "contract");
  assertHash("artifactHash", plan.artifactHash);
  assertHash("abiHash", plan.abiHash);
  assertWholeNumber("valueLythoshi", plan.valueLythoshi);
  assertWholeNumber("executionUnitLimit", plan.executionUnitLimit);
  assertWholeNumber("maxExecutionFeeLythoshi", plan.maxExecutionFeeLythoshi);
  assertNativeDevWalletApprovalRequest(plan.walletApprovalRequest);
}
function assertNativeDevMrcTokenPlan(plan) {
  typedBech32ToAddress(plan.issuerAddress, "user");
  if (!plan.name.trim()) throw new Error("token name is required");
  if (!/^[A-Z0-9]{2,12}$/.test(plan.symbol)) throw new Error("token symbol must be uppercase");
  if (!Number.isInteger(plan.decimals) || plan.decimals < 0 || plan.decimals > 18) {
    throw new Error("token decimals must be between 0 and 18");
  }
  for (const allocation of plan.initialAllocations) {
    typedBech32ToAddress(allocation.address, "user");
    assertWholeNumber("allocation.amount", allocation.amount);
  }
  assertNativeDevWalletApprovalRequest(plan.walletApprovalRequest);
}
function nativeDevUiStrings() {
  return [
    "Mono Studio Host",
    "Developer Mode",
    "DevKit missing",
    "DevKit incompatible",
    "DevKit ready",
    "Wallet approval required",
    "Execution units",
    "Maximum execution fee",
    "Lythoshi value",
    "Artifact hash",
    "ABI manifest",
    "Token passport",
    "Verification bundle"
  ];
}
function nativeDevSchemaFieldNames() {
  return [
    "schemaVersion",
    "devkitVersion",
    "channel",
    "minimumWalletHostApi",
    "maximumWalletHostApi",
    "monoCoreCommit",
    "monoCoreSdkCommit",
    "archive",
    "signatureScheme",
    "signingKeyId",
    "trustRoot",
    "signingPublicKey",
    "sidecar",
    "releaseNotesUrl",
    "installedVersion",
    "hostApiVersion",
    "installPath",
    "sidecarStatus",
    "compatibility",
    "developerModeEnabled",
    "selectedProjectRoot",
    "activeNetwork",
    "networkId",
    "readOnlyWalletAddress",
    "requestId",
    "approved",
    "command",
    "output",
    "preview",
    "authorityAddress",
    "expectedContractAddress",
    "artifactHash",
    "abiHash",
    "valueLythoshi",
    "executionUnitLimit",
    "maxExecutionFeeLythoshi",
    "constructorInput",
    "walletApprovalRequest",
    "issuerAddress",
    "initialAllocations",
    "bundleHash",
    "contractPassport",
    "sourceBundleHash",
    "compilerVersion",
    "sdkVersion",
    "verificationStatus"
  ];
}
function nativeDevkitStatusMessage(compatibility, installPath) {
  if (!installPath) return "DevKit is not installed.";
  if (compatibility === "compatible") return "DevKit is compatible with this wallet host.";
  if (compatibility === "too_old_for_host") return "DevKit is older than this wallet host API.";
  if (compatibility === "too_new_for_host") return "DevKit requires a newer wallet host API.";
  return "DevKit manifest is invalid.";
}
function parseVersionParts(version2) {
  const match = version2.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
function assertHash(field2, value) {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error(`${field2} must be a 32 byte lowercase hex hash`);
  }
}
function assertWholeNumber(field2, value) {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error(`${field2} must be a whole number`);
  }
}
var PQM1_ALGO_TAG_MLDSA65 = 1;
var PQM1_VERSION_V1 = 1;
var PQM1_PAYLOAD_LEN = 32;
var PQM1_V1_MNEMONIC_WORDS = 24;
var PQM1_V1_MLDSA65_DOMAIN_TAG = "monolythium.pqm1.v1.mldsa65";
var Pqm1Error = class extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
    this.name = "Pqm1Error";
  }
  kind;
};
var DOMAIN_BYTES = new TextEncoder().encode(PQM1_V1_MLDSA65_DOMAIN_TAG);
function normalizeMnemonic(mnemonic) {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
}
function ensureSupportedPayload(bytes) {
  if (bytes.length !== PQM1_PAYLOAD_LEN) {
    throw new Pqm1Error("badPayloadLength", `PQM-1 payload must be ${PQM1_PAYLOAD_LEN} bytes, got ${bytes.length}`);
  }
  if (bytes[0] !== PQM1_ALGO_TAG_MLDSA65) {
    throw new Pqm1Error("unsupportedAlgorithm", `unsupported PQM-1 algorithm tag 0x${bytes[0].toString(16).padStart(2, "0")}`);
  }
  if (bytes[1] !== PQM1_VERSION_V1) {
    throw new Pqm1Error("unsupportedVersion", `unsupported PQM-1 version 0x${bytes[1].toString(16).padStart(2, "0")}`);
  }
}
function parsePqm1Payload(payload) {
  const bytes = expectBytes(payload, PQM1_PAYLOAD_LEN, "PQM-1 payload").slice();
  ensureSupportedPayload(bytes);
  return {
    algoTag: PQM1_ALGO_TAG_MLDSA65,
    version: PQM1_VERSION_V1,
    entropy: bytes.slice(2),
    bytes
  };
}
function pqm1MnemonicToPayload(mnemonic) {
  const normalized = normalizeMnemonic(mnemonic);
  const words = normalized.length === 0 ? [] : normalized.split(" ");
  if (words.length !== PQM1_V1_MNEMONIC_WORDS) {
    throw new Pqm1Error("badWordCount", `PQM-1 mnemonic must be ${PQM1_V1_MNEMONIC_WORDS} words, got ${words.length}`);
  }
  let payload;
  try {
    payload = mnemonicToEntropy(normalized, wordlist);
  } catch (e) {
    throw new Pqm1Error("bip39Decode", `invalid PQM-1 mnemonic: ${e.message}`);
  }
  return parsePqm1Payload(payload);
}
function derivePqm1MlDsa65SeedFromPayload(payload) {
  const parsed = parsePqm1Payload(payload);
  return shake256(concatBytes2(DOMAIN_BYTES, parsed.bytes), { dkLen: ML_DSA_65_SEED_LEN });
}
function pqm1MnemonicToMlDsa65Seed(mnemonic) {
  return derivePqm1MlDsa65SeedFromPayload(pqm1MnemonicToPayload(mnemonic).bytes);
}
function pqm1MnemonicToMlDsa65Backend(mnemonic) {
  return MlDsa65Backend.fromSeed(pqm1MnemonicToMlDsa65Seed(mnemonic));
}

// src/cluster-join.ts
var DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT = REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT;
var ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
var MAX_UINT32 = (1n << 32n) - 1n;
function deriveClusterJoinOperatorId(operatorPubkey) {
  return bytesToHex2(blake3(normalizeConsensusPubkey(operatorPubkey, "operatorPubkey")));
}
function clusterJoinRequestExists(view) {
  return view.status !== "none" || view.owner.toLowerCase() !== ZERO_ADDRESS || view.bondLythoshi !== 0n;
}
async function readClusterJoinRequest(client, args) {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  const operatorId = normalizeOperatorId(args.operatorId);
  const envelope = await client.call("lyth_getClusterJoinRequest", [
    Number(clusterId),
    operatorId
  ]);
  return adaptNativeClusterJoinRequest(envelope.request);
}
async function preflightClusterJoinRequest(client, args) {
  try {
    return await readClusterJoinRequest(client, args);
  } catch (cause) {
    throw new Error(
      `CJ-1 lyth_getClusterJoinRequest is not exposed or failed on the connected chain: ${errorMessage(cause)}`
    );
  }
}
async function previewRequestClusterJoin(client, args) {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  try {
    return await client.call("lyth_previewRequestClusterJoin", [{
      from: args.from,
      clusterId: Number(clusterId),
      operatorPubkey: bytesToHex2(normalizeConsensusPubkey(args.operatorPubkey, "operatorPubkey")),
      bondLythoshi: parseU256(args.bondLythoshi, "bondLythoshi").toString(10)
    }]);
  } catch (cause) {
    throw new Error(
      `CJ-1 request preview is not exposed or failed on the connected chain: ${errorMessage(cause)}`
    );
  }
}
async function previewVoteClusterAdmit(client, args) {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  try {
    return await client.call("lyth_previewVoteClusterAdmit", [{
      from: args.from,
      clusterId: Number(clusterId),
      operatorId: normalizeOperatorId(args.operatorId),
      voterPubkey: bytesToHex2(normalizeConsensusPubkey(args.voterPubkey, "voterPubkey"))
    }]);
  } catch (cause) {
    throw new Error(
      `CJ-1 admit-vote preview is not exposed or failed on the connected chain: ${errorMessage(cause)}`
    );
  }
}
function resolveClusterJoinExecutionFee(quote, options = {}) {
  const quoted = parseBigint(quote.executionUnitPriceLythoshi, "executionUnitPriceLythoshi");
  const floor = options.minPriceLythoshi === void 0 ? MIN_EXECUTION_UNIT_PRICE_LYTHOSHI : parseBigint(options.minPriceLythoshi, "minPriceLythoshi");
  const multiplier = options.safetyMultiplier === void 0 ? EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER : parseBigint(options.safetyMultiplier, "safetyMultiplier");
  if (multiplier <= 0n) throw new Error("safetyMultiplier must be greater than zero");
  const base = quoted > floor ? quoted : floor;
  const maxFeePerGas = base * multiplier;
  const tip = options.priorityTipLythoshi === void 0 ? maxFeePerGas : clampPriorityTip(options.priorityTipLythoshi, maxFeePerGas);
  return {
    maxFeePerGas,
    maxPriorityFeePerGas: tip,
    gasLimit: options.executionUnitLimit ?? DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT
  };
}
function buildRequestClusterJoinTxFields(args) {
  return {
    chainId: args.chainId,
    nonce: args.nonce,
    maxFeePerGas: parseBigint(args.fee.maxFeePerGas, "maxFeePerGas"),
    maxPriorityFeePerGas: parseBigint(args.fee.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
    gasLimit: parseBigint(
      args.fee.gasLimit ?? DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT,
      "gasLimit"
    ),
    to: nodeRegistryAddressHex(),
    value: parseU256(args.bondLythoshi, "bondLythoshi"),
    input: encodeRequestClusterJoinCalldata({
      clusterId: args.clusterId,
      operatorPubkey: normalizeConsensusPubkey(args.operatorPubkey, "operatorPubkey")
    })
  };
}
function buildVoteClusterAdmitTxFields(args) {
  return {
    chainId: args.chainId,
    nonce: args.nonce,
    maxFeePerGas: parseBigint(args.fee.maxFeePerGas, "maxFeePerGas"),
    maxPriorityFeePerGas: parseBigint(args.fee.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
    gasLimit: parseBigint(
      args.fee.gasLimit ?? DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT,
      "gasLimit"
    ),
    to: nodeRegistryAddressHex(),
    value: 0n,
    input: encodeVoteClusterAdmitCalldata({
      clusterId: args.clusterId,
      operatorId: normalizeOperatorId(args.operatorId),
      voterPubkey: normalizeConsensusPubkey(args.voterPubkey, "voterPubkey")
    })
  };
}
async function submitRequestClusterJoin(args) {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  const operatorPubkey = normalizeConsensusPubkey(args.operatorPubkey, "operatorPubkey");
  const operatorIdHex = deriveClusterJoinOperatorId(operatorPubkey);
  const backend = pqm1MnemonicToMlDsa65Backend(args.mnemonic);
  const senderAddress = addressToTypedBech32("user", backend.addressBytes());
  const preview = await previewRequestClusterJoin(args.client, {
    from: senderAddress,
    clusterId,
    operatorPubkey,
    bondLythoshi: args.bondLythoshi
  });
  assertPreviewOk("requestClusterJoin", preview);
  const [chainId, nonce, quote] = await Promise.all([
    args.client.ethChainId(),
    args.client.lythGetTransactionCount(senderAddress),
    args.client.lythExecutionUnitPrice()
  ]);
  const tx = buildRequestClusterJoinTxFields({
    chainId,
    nonce,
    fee: resolveClusterJoinExecutionFee(quote, args),
    clusterId,
    operatorPubkey,
    bondLythoshi: args.bondLythoshi
  });
  return submitClusterJoinTx(args.client, backend, tx, clusterId, operatorIdHex);
}
async function submitVoteClusterAdmit(args) {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  const operatorIdHex = normalizeOperatorId(args.operatorId);
  const backend = pqm1MnemonicToMlDsa65Backend(args.mnemonic);
  const senderAddress = addressToTypedBech32("user", backend.addressBytes());
  const preview = await previewVoteClusterAdmit(args.client, {
    from: senderAddress,
    clusterId,
    operatorId: operatorIdHex,
    voterPubkey: args.voterPubkey
  });
  assertPreviewOk("voteClusterAdmit", preview);
  const [chainId, nonce, quote] = await Promise.all([
    args.client.ethChainId(),
    args.client.lythGetTransactionCount(senderAddress),
    args.client.lythExecutionUnitPrice()
  ]);
  const tx = buildVoteClusterAdmitTxFields({
    chainId,
    nonce,
    fee: resolveClusterJoinExecutionFee(quote, args),
    clusterId,
    operatorId: operatorIdHex,
    voterPubkey: args.voterPubkey
  });
  return submitClusterJoinTx(args.client, backend, tx, clusterId, operatorIdHex);
}
async function submitClusterJoinTx(client, backend, tx, clusterId, operatorIdHex) {
  const plaintext = buildPlaintextSubmission({ backend, tx });
  const txHash = await submitPlaintextTransaction(
    client,
    plaintext.signedTxWireHex,
    plaintext.innerTxHashHex
  );
  return {
    txHash,
    clusterId: clusterId.toString(10),
    operatorIdHex,
    innerSighashHex: plaintext.innerSighashHex,
    signedTxWireBytes: plaintext.innerWireBytes
  };
}
function adaptNativeClusterJoinRequest(request) {
  return {
    owner: request.owner ?? ZERO_ADDRESS,
    requestEpoch: parseBigint(request.requestEpoch, "requestEpoch"),
    requestNonce: request.requestNonce === void 0 ? void 0 : parseBigint(request.requestNonce, "requestNonce"),
    snapshotThreshold: request.snapshotThreshold,
    snapshotN: request.snapshotN,
    voteCount: request.voteCount,
    statusCode: request.statusCode,
    status: clusterJoinStatus(request.status),
    bondLythoshi: parseBigint(request.bondLythoshi, "bondLythoshi"),
    sealRosterPending: request.sealRosterPending
  };
}
function clusterJoinStatus(status) {
  switch (status) {
    case "none":
    case "open":
    case "admitted":
    case "cancelled":
    case "expired":
      return status;
    default:
      return "unknown";
  }
}
function previewError(action, preview) {
  const reason = preview.reason ? `: ${preview.reason}` : "";
  const message = preview.message ? ` (${preview.message})` : "";
  return new Error(`${action} preview rejected${reason}${message}`);
}
function assertPreviewOk(action, preview) {
  if (!preview.ok) throw previewError(action, preview);
}
function normalizeConsensusPubkey(value, label) {
  const bytes = typeof value === "string" ? hexToBytes2(value, label) : value;
  return expectBytes(bytes, NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES, label).slice();
}
function normalizeOperatorId(value) {
  const bytes = typeof value === "string" ? hexToBytes2(value, "operatorId") : value;
  return bytesToHex2(expectBytes(bytes, 32, "operatorId"));
}
function parseUint32(value, label) {
  const parsed = parseBigint(value, label);
  if (parsed < 0n || parsed > MAX_UINT32) {
    throw new Error(`${label} out of 32-bit range`);
  }
  return parsed;
}
function parseU256(value, label) {
  const parsed = parseBigint(value, label);
  if (parsed < 0n || parsed >= 1n << 256n) {
    throw new Error(`${label} out of 256-bit range`);
  }
  return parsed;
}
function errorMessage(cause) {
  return cause instanceof Error ? cause.message : String(cause);
}
var ORACLE_EVENT_SIGS = {
  oracleRoundFinalized: "OracleRoundFinalized(bytes32,uint64,uint256,uint64,uint32)",
  observationSubmitted: "ObservationSubmitted(bytes32,uint64,address,uint256,uint64)",
  feedAdded: "FeedAdded(bytes32,uint8,uint16,uint32,uint32)",
  feedUpdated: "FeedUpdated(bytes32,uint8,uint16,uint32,uint32)",
  oracleFraudSlashed: "OracleFraudSlashed(bytes32,uint64,address,bytes32)",
  oracleAdminUpdated: "OracleAdminUpdated(address)",
  oracleWriterAdded: "OracleWriterAdded(address,address)",
  oracleWriterRemoved: "OracleWriterRemoved(address,address)"
};
var OracleEventError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "OracleEventError";
  }
};
function oracleAddressHex() {
  return PRECOMPILE_ADDRESSES.ORACLE.toLowerCase();
}
var FEED_ID_DOMAIN_TAG = "protocore-oracle/feed-id/v1";
function deriveFeedId(name, decimals) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new OracleEventError("feed decimals must be an integer in 0..=255");
  }
  const nameBytes = new TextEncoder().encode(name);
  const buf = concatBytes6(
    new TextEncoder().encode(FEED_ID_DOMAIN_TAG),
    nameBytes,
    Uint8Array.of(decimals & 255)
  );
  return bytesToHex7(keccak_256(buf));
}
function formatOraclePrice(price) {
  if (price.median === null) return null;
  const value = BigInt(price.median);
  const decimals = price.decimals;
  if (decimals <= 0) return value.toString(10);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = (value % base).toString(10).padStart(decimals, "0").replace(/0+$/, "");
  return frac.length > 0 ? `${whole.toString(10)}.${frac}` : whole.toString(10);
}
function oraclePriceToNumber(price) {
  const formatted = formatOraclePrice(price);
  return formatted === null ? null : Number(formatted);
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
function decodeOracleEvent(topics, data) {
  if (topics.length === 0) {
    throw new OracleEventError("event record has no topics");
  }
  const topic0 = bytesToHex7(expectLength4(toBytes4(topics[0]), 32, "topic0"));
  const body = toBytes4(data);
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.oracleRoundFinalized)) {
    checkArity("OracleRoundFinalized", 3, topics.length);
    checkData("OracleRoundFinalized", 3 * 32, body.length);
    return {
      kind: "roundFinalized",
      feedId: hex32(topics[1]),
      roundId: u64FromTopic(topics[2]),
      computedMedian: u256Decimal(body.subarray(0, 32)),
      finalizedAtBlock: u64FromWord2(body.subarray(32, 64)),
      observationsLen: u32FromWord2(body.subarray(64, 96))
    };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.observationSubmitted)) {
    checkArity("ObservationSubmitted", 4, topics.length);
    checkData("ObservationSubmitted", 2 * 32, body.length);
    return {
      kind: "observationSubmitted",
      feedId: hex32(topics[1]),
      roundId: u64FromTopic(topics[2]),
      writer: addressFromTopic(topics[3]),
      value: u256Decimal(body.subarray(0, 32)),
      observedAt: u64FromWord2(body.subarray(32, 64))
    };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.oracleFraudSlashed)) {
    checkArity("OracleFraudSlashed", 4, topics.length);
    checkData("OracleFraudSlashed", 32, body.length);
    return {
      kind: "fraudSlashed",
      feedId: hex32(topics[1]),
      roundId: u64FromTopic(topics[2]),
      writer: addressFromTopic(topics[3]),
      evidenceHash: bytesToHex7(body.subarray(0, 32))
    };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.feedAdded)) {
    checkArity("FeedAdded", 2, topics.length);
    checkData("FeedAdded", 4 * 32, body.length);
    return { kind: "feedAdded", ...decodeFeedFields(topics[1], body) };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.feedUpdated)) {
    checkArity("FeedUpdated", 2, topics.length);
    checkData("FeedUpdated", 4 * 32, body.length);
    return { kind: "feedUpdated", ...decodeFeedFields(topics[1], body) };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.oracleAdminUpdated)) {
    checkArity("OracleAdminUpdated", 2, topics.length);
    checkData("OracleAdminUpdated", 0, body.length);
    return { kind: "adminUpdated", admin: addressFromTopic(topics[1]) };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.oracleWriterAdded)) {
    checkArity("OracleWriterAdded", 3, topics.length);
    checkData("OracleWriterAdded", 0, body.length);
    return {
      kind: "writerAdded",
      admin: addressFromTopic(topics[1]),
      writer: addressFromTopic(topics[2])
    };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.oracleWriterRemoved)) {
    checkArity("OracleWriterRemoved", 3, topics.length);
    checkData("OracleWriterRemoved", 0, body.length);
    return {
      kind: "writerRemoved",
      admin: addressFromTopic(topics[1]),
      writer: addressFromTopic(topics[2])
    };
  }
  throw new OracleEventError("unknown oracle event topic0");
}
function decodeFeedFields(feedTopic, body) {
  return {
    feedId: hex32(feedTopic),
    decimals: body[31],
    minSigners: body[62] << 8 | body[63],
    circuitBreakerBps: u32FromWord2(body.subarray(64, 96)),
    allowedWritersLen: u32FromWord2(body.subarray(96, 128))
  };
}
function topicHex(sig) {
  return bytesToHex7(keccak_256(new TextEncoder().encode(sig)));
}
function checkArity(event, expected, found) {
  if (found !== expected) {
    throw new OracleEventError(`${event} expected ${expected} topics, found ${found}`);
  }
}
function checkData(event, expected, found) {
  if (found !== expected) {
    throw new OracleEventError(`${event} expected ${expected} data bytes, found ${found}`);
  }
}
function hex32(topic) {
  return bytesToHex7(expectLength4(toBytes4(topic), 32, "feedId topic"));
}
function addressFromTopic(topic) {
  return bytesToHex7(expectLength4(toBytes4(topic), 32, "address topic").subarray(12, 32));
}
function u64FromTopic(topic) {
  return u64FromWord2(expectLength4(toBytes4(topic), 32, "u64 topic"));
}
function u64FromWord2(word) {
  let v = 0n;
  for (let i = 24; i < 32; i++) v = v << 8n | BigInt(word[i]);
  return v;
}
function u32FromWord2(word) {
  return (word[28] << 24 | word[29] << 16 | word[30] << 8 | word[31]) >>> 0;
}
function u256Decimal(word) {
  let v = 0n;
  for (const b of word) v = v << 8n | BigInt(b);
  return v.toString(10);
}
function toBytes4(value) {
  if (typeof value === "string") return hexToBytes6(value);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes6(hex) {
  const b = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (b.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(b)) {
    throw new OracleEventError("invalid hex bytes");
  }
  const out = new Uint8Array(b.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(b.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function bytesToHex7(bytes) {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function expectLength4(value, len, name) {
  if (value.length !== len) {
    throw new OracleEventError(`${name} must be ${len} bytes, got ${value.length}`);
  }
  return value;
}
var TokenFactoryError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "TokenFactoryError";
  }
};
var TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI = 3000000000000000n;
var TOKEN_FACTORY_NAME_MAX_BYTES = 256;
var TOKEN_FACTORY_SYMBOL_MAX_BYTES = 256;
var TOKEN_FACTORY_MAX_DECIMALS = 30;
var TOKEN_FACTORY_MAX_CREATOR_FEE_BPS = 1e4;
var TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG = 250;
var TOKEN_FACTORY_FLAGS = {
  MINTABLE: 1 << 0,
  BURNABLE: 1 << 1,
  PAUSABLE: 1 << 2,
  FIXED_SUPPLY: 1 << 3,
  CREATOR_FEE_OPT_IN: 1 << 4,
  DESTRUCTIBLE: 1 << 5
};
var TOKEN_FACTORY_KNOWN_FLAG_MASK = TOKEN_FACTORY_FLAGS.MINTABLE | TOKEN_FACTORY_FLAGS.BURNABLE | TOKEN_FACTORY_FLAGS.PAUSABLE | TOKEN_FACTORY_FLAGS.FIXED_SUPPLY | TOKEN_FACTORY_FLAGS.CREATOR_FEE_OPT_IN | TOKEN_FACTORY_FLAGS.DESTRUCTIBLE;
var TOKEN_FACTORY_SIGS = {
  createToken: "createToken(string,string,uint8,uint256,uint256,uint32,uint16)",
  transfer: "transfer(bytes32,address,uint256)",
  transferFrom: "transferFrom(bytes32,address,address,uint256)",
  approve: "approve(bytes32,address,uint256)",
  increaseAllowance: "increaseAllowance(bytes32,address,uint256)",
  decreaseAllowance: "decreaseAllowance(bytes32,address,uint256)",
  balanceOf: "balanceOf(bytes32,address)",
  allowance: "allowance(bytes32,address,address)",
  totalSupply: "totalSupply(bytes32)",
  metadata: "metadata(bytes32)",
  mint: "mint(bytes32,address,uint256)",
  burn: "burn(bytes32,uint256)",
  setPaused: "setPaused(bytes32,bool)",
  transferOwnership: "transferOwnership(bytes32,address)",
  destroyToken: "destroyToken(bytes32)"
};
var TOKEN_FACTORY_SELECTORS = {
  createToken: selectorHex3(TOKEN_FACTORY_SIGS.createToken),
  transfer: selectorHex3(TOKEN_FACTORY_SIGS.transfer),
  transferFrom: selectorHex3(TOKEN_FACTORY_SIGS.transferFrom),
  approve: selectorHex3(TOKEN_FACTORY_SIGS.approve),
  increaseAllowance: selectorHex3(TOKEN_FACTORY_SIGS.increaseAllowance),
  decreaseAllowance: selectorHex3(TOKEN_FACTORY_SIGS.decreaseAllowance),
  balanceOf: selectorHex3(TOKEN_FACTORY_SIGS.balanceOf),
  allowance: selectorHex3(TOKEN_FACTORY_SIGS.allowance),
  totalSupply: selectorHex3(TOKEN_FACTORY_SIGS.totalSupply),
  metadata: selectorHex3(TOKEN_FACTORY_SIGS.metadata),
  mint: selectorHex3(TOKEN_FACTORY_SIGS.mint),
  burn: selectorHex3(TOKEN_FACTORY_SIGS.burn),
  setPaused: selectorHex3(TOKEN_FACTORY_SIGS.setPaused),
  transferOwnership: selectorHex3(TOKEN_FACTORY_SIGS.transferOwnership),
  destroyToken: selectorHex3(TOKEN_FACTORY_SIGS.destroyToken)
};
function tokenFactoryAddressHex() {
  return PRECOMPILE_ADDRESSES.TOKEN_FACTORY.toLowerCase();
}
function deriveTokenFactoryTokenId(creator, creatorTokenNonce) {
  const nonce = parseUint(creatorTokenNonce, "creatorTokenNonce", 64);
  return bytesToHex2(
    keccak_256(
      concatBytes2(
        new Uint8Array([TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG]),
        addressBytes(creator, "creator"),
        uint64Be(nonce)
      )
    )
  );
}
function encodeCreateTokenCalldata(args) {
  const name = textBytes(args.name, "name", TOKEN_FACTORY_NAME_MAX_BYTES);
  const symbol = textBytes(args.symbol, "symbol", TOKEN_FACTORY_SYMBOL_MAX_BYTES);
  const decimals = parseSmallUint(args.decimals, "decimals", TOKEN_FACTORY_MAX_DECIMALS);
  const initialSupply = parseUint(args.initialSupply, "initialSupply");
  const maxSupply = parseUint(args.maxSupply, "maxSupply");
  const flags = args.flags ?? 0;
  validateTokenFactoryFlags(flags, args.creatorFeeBps ?? 0);
  const creatorFeeBps = parseSmallUint(
    args.creatorFeeBps ?? 0,
    "creatorFeeBps",
    TOKEN_FACTORY_MAX_CREATOR_FEE_BPS
  );
  const headLen = 7 * 32;
  const nameTail = dynamicBytesTail(name);
  const symbolOffset = BigInt(headLen + nameTail.length);
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(TOKEN_FACTORY_SELECTORS.createToken, "createToken selector"),
      uint256Word2(BigInt(headLen), "nameOffset"),
      uint256Word2(symbolOffset, "symbolOffset"),
      uint256Word2(BigInt(decimals), "decimals"),
      uint256Word2(initialSupply, "initialSupply"),
      uint256Word2(maxSupply, "maxSupply"),
      uint256Word2(BigInt(flags), "flags"),
      uint256Word2(BigInt(creatorFeeBps), "creatorFeeBps"),
      nameTail,
      dynamicBytesTail(symbol)
    )
  );
}
function encodeCreateFixedSupplyMrc20Calldata(args) {
  let flags = TOKEN_FACTORY_FLAGS.FIXED_SUPPLY;
  if (args.burnable) flags |= TOKEN_FACTORY_FLAGS.BURNABLE;
  if (args.pausable) flags |= TOKEN_FACTORY_FLAGS.PAUSABLE;
  if (args.destructible) flags |= TOKEN_FACTORY_FLAGS.DESTRUCTIBLE;
  return encodeCreateTokenCalldata({
    name: args.name,
    symbol: args.symbol,
    decimals: args.decimals,
    initialSupply: args.supply,
    maxSupply: args.supply,
    flags,
    creatorFeeBps: 0
  });
}
function encodeTokenFactoryTransferCalldata(tokenId, to, amount) {
  return encodeBytes32AddressUint(TOKEN_FACTORY_SELECTORS.transfer, tokenId, to, amount);
}
function encodeTokenFactoryTransferFromCalldata(tokenId, from, to, amount) {
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(TOKEN_FACTORY_SELECTORS.transferFrom, "transferFrom selector"),
      bytes32(tokenId, "tokenId"),
      addressWord4(from, "from"),
      addressWord4(to, "to"),
      uint256Word2(parseUint(amount, "amount"), "amount")
    )
  );
}
function encodeTokenFactoryApproveCalldata(tokenId, spender, amount) {
  return encodeBytes32AddressUint(TOKEN_FACTORY_SELECTORS.approve, tokenId, spender, amount);
}
function encodeTokenFactoryIncreaseAllowanceCalldata(tokenId, spender, delta) {
  return encodeBytes32AddressUint(TOKEN_FACTORY_SELECTORS.increaseAllowance, tokenId, spender, delta);
}
function encodeTokenFactoryDecreaseAllowanceCalldata(tokenId, spender, delta) {
  return encodeBytes32AddressUint(TOKEN_FACTORY_SELECTORS.decreaseAllowance, tokenId, spender, delta);
}
function encodeTokenFactoryBalanceOfCalldata(tokenId, holder) {
  return encodeBytes32Address(TOKEN_FACTORY_SELECTORS.balanceOf, tokenId, holder);
}
function encodeTokenFactoryAllowanceCalldata(tokenId, owner, spender) {
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(TOKEN_FACTORY_SELECTORS.allowance, "allowance selector"),
      bytes32(tokenId, "tokenId"),
      addressWord4(owner, "owner"),
      addressWord4(spender, "spender")
    )
  );
}
function encodeTokenFactoryTotalSupplyCalldata(tokenId) {
  return encodeBytes32(TOKEN_FACTORY_SELECTORS.totalSupply, tokenId);
}
function encodeTokenFactoryMetadataCalldata(tokenId) {
  return encodeBytes32(TOKEN_FACTORY_SELECTORS.metadata, tokenId);
}
function encodeTokenFactoryMintCalldata(tokenId, to, amount) {
  return encodeBytes32AddressUint(TOKEN_FACTORY_SELECTORS.mint, tokenId, to, amount);
}
function encodeTokenFactoryBurnCalldata(tokenId, amount) {
  return encodeBytes32Uint(TOKEN_FACTORY_SELECTORS.burn, tokenId, amount);
}
function encodeTokenFactorySetPausedCalldata(tokenId, paused) {
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(TOKEN_FACTORY_SELECTORS.setPaused, "setPaused selector"),
      bytes32(tokenId, "tokenId"),
      boolWord(paused)
    )
  );
}
function encodeTokenFactoryTransferOwnershipCalldata(tokenId, newOwner) {
  return encodeBytes32Address(TOKEN_FACTORY_SELECTORS.transferOwnership, tokenId, newOwner);
}
function encodeTokenFactoryDestroyCalldata(tokenId) {
  return encodeBytes32(TOKEN_FACTORY_SELECTORS.destroyToken, tokenId);
}
function decodeTokenFactoryTokenId(output) {
  return bytesToHex2(bytes32(output, "output"));
}
function validateTokenFactoryFlags(flags, creatorFeeBps = 0) {
  if (!Number.isInteger(flags) || flags < 0 || flags > 4294967295) {
    throw new TokenFactoryError("flags must be a uint32");
  }
  if ((flags & ~TOKEN_FACTORY_KNOWN_FLAG_MASK) !== 0) {
    throw new TokenFactoryError("flags contain an unknown bit");
  }
  if ((flags & TOKEN_FACTORY_FLAGS.MINTABLE) !== 0 && (flags & TOKEN_FACTORY_FLAGS.FIXED_SUPPLY) !== 0) {
    throw new TokenFactoryError("MINTABLE and FIXED_SUPPLY are mutually exclusive");
  }
  if ((flags & TOKEN_FACTORY_FLAGS.CREATOR_FEE_OPT_IN) !== 0) {
    if (creatorFeeBps <= 0) throw new TokenFactoryError("CREATOR_FEE_OPT_IN requires non-zero creatorFeeBps");
  } else if (creatorFeeBps !== 0) {
    throw new TokenFactoryError("creatorFeeBps must be 0 when CREATOR_FEE_OPT_IN is unset");
  }
}
function encodeBytes32(selector, value) {
  return bytesToHex2(concatBytes2(hexToBytes2(selector, "selector"), bytes32(value, "tokenId")));
}
function encodeBytes32Uint(selector, tokenId, amount) {
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(selector, "selector"),
      bytes32(tokenId, "tokenId"),
      uint256Word2(parseUint(amount, "amount"), "amount")
    )
  );
}
function encodeBytes32Address(selector, tokenId, address) {
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(selector, "selector"),
      bytes32(tokenId, "tokenId"),
      addressWord4(address, "address")
    )
  );
}
function encodeBytes32AddressUint(selector, tokenId, address, amount) {
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(selector, "selector"),
      bytes32(tokenId, "tokenId"),
      addressWord4(address, "address"),
      uint256Word2(parseUint(amount, "amount"), "amount")
    )
  );
}
function selectorHex3(signature) {
  const sel = keccak_256(new TextEncoder().encode(signature)).slice(0, 4);
  return bytesToHex2(sel);
}
function textBytes(value, label, maxBytes) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length === 0 || bytes.length > maxBytes) {
    throw new TokenFactoryError(`${label} must be 1..=${maxBytes} UTF-8 bytes`);
  }
  return bytes;
}
function dynamicBytesTail(bytes) {
  return concatBytes2(uint256Word2(BigInt(bytes.length), "length"), padTo323(bytes));
}
function padTo323(bytes) {
  const padded = Math.ceil(bytes.length / 32) * 32;
  if (padded === bytes.length) return bytes;
  const out = new Uint8Array(padded);
  out.set(bytes);
  return out;
}
function addressWord4(value, label) {
  const out = new Uint8Array(32);
  out.set(addressBytes(value, label), 12);
  return out;
}
function addressBytes(value, label) {
  const bytes = toBytes5(value, label);
  if (bytes.length !== 20) {
    throw new TokenFactoryError(`${label} must be 20 bytes, got ${bytes.length}`);
  }
  return bytes;
}
function bytes32(value, label) {
  const bytes = toBytes5(value, label);
  if (bytes.length !== 32) {
    throw new TokenFactoryError(`${label} must be 32 bytes, got ${bytes.length}`);
  }
  return bytes;
}
function boolWord(value) {
  const out = new Uint8Array(32);
  out[31] = value ? 1 : 0;
  return out;
}
function uint256Word2(value, label) {
  if (value < 0n || value > (1n << 256n) - 1n) {
    throw new TokenFactoryError(`${label} out of uint256 range`);
  }
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 31; i >= 0 && rest > 0n; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
function uint64Be(value) {
  const out = new Uint8Array(8);
  let rest = value;
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
function parseSmallUint(value, label, max) {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new TokenFactoryError(`${label} must be an integer in 0..=${max}`);
  }
  return value;
}
function parseUint(value, label, bits = 256) {
  let parsed;
  if (typeof value === "bigint") {
    parsed = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new TokenFactoryError(`${label} must be a safe integer`);
    parsed = BigInt(value);
  } else if (value.startsWith("0x") || value.startsWith("0X")) {
    parsed = BigInt(value);
  } else {
    if (!/^[0-9]+$/.test(value)) throw new TokenFactoryError(`${label} must be a non-negative integer`);
    parsed = BigInt(value);
  }
  if (parsed < 0n || parsed > (1n << BigInt(bits)) - 1n) {
    throw new TokenFactoryError(`${label} out of uint${bits} range`);
  }
  return parsed;
}
function toBytes5(value, label) {
  if (typeof value === "string") return hexToBytes2(value, label);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

// src/vrf.ts
var VrfCallError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "VrfCallError";
  }
};
var VRF_OUTPUT_BYTES = 32;
var VRF_DOMAIN_TAG_MAX_BYTES = 256;
var VRF_HEIGHT_NOT_FINALIZED_REVERT = "vrf: height not finalized";
function vrfAddressHex() {
  return PRECOMPILE_ADDRESSES.VRF.toLowerCase();
}
function encodeVrfEvaluateCalldata(blockHeight, domainTag = new Uint8Array()) {
  const height = parseUint64(blockHeight, "blockHeight");
  const tag = normalizeDomainTag(domainTag);
  if (tag.length > VRF_DOMAIN_TAG_MAX_BYTES) {
    throw new VrfCallError(`domainTag exceeds ${VRF_DOMAIN_TAG_MAX_BYTES} bytes`);
  }
  return bytesToHex2(concatBytes2(uint256Word3(height), tag));
}
function decodeVrfOutput(output) {
  const bytes = toBytes6(output, "output");
  if (bytes.length !== VRF_OUTPUT_BYTES) {
    throw new VrfCallError(`VRF output must be ${VRF_OUTPUT_BYTES} bytes, got ${bytes.length}`);
  }
  return bytes;
}
function normalizeDomainTag(value) {
  if (typeof value === "string") {
    if (value.startsWith("0x") || value.startsWith("0X")) return hexToBytes2(value, "domainTag");
    return new TextEncoder().encode(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function parseUint64(value, label) {
  let parsed;
  if (typeof value === "bigint") {
    parsed = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new VrfCallError(`${label} must be a safe integer`);
    parsed = BigInt(value);
  } else if (value.startsWith("0x") || value.startsWith("0X")) {
    parsed = BigInt(value);
  } else {
    if (!/^[0-9]+$/.test(value)) throw new VrfCallError(`${label} must be a non-negative integer`);
    parsed = BigInt(value);
  }
  if (parsed < 0n || parsed > (1n << 64n) - 1n) {
    throw new VrfCallError(`${label} out of uint64 range`);
  }
  return parsed;
}
function uint256Word3(value) {
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 31; i >= 0 && rest > 0n; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
function toBytes6(value, label) {
  if (typeof value === "string") return hexToBytes2(value, label);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
var PROVER_MARKET_ADDRESS = PRECOMPILE_ADDRESSES.PROVER_MARKET;
var SERVES_GPU_PROVE = 512;
var PROVER_MARKET_SELECTORS = {
  createRequest: "0x" + selectorHex4("createRequest(bytes)"),
  submitBid: "0x" + selectorHex4("submitBid(bytes)"),
  closeRequest: "0x" + selectorHex4("closeRequest(bytes)"),
  submitProof: "0x" + selectorHex4("submitProof(bytes)"),
  settle: "0x" + selectorHex4("settle(bytes)"),
  slash: "0x" + selectorHex4("slash(bytes)")
};
var PROVER_MARKET_EVENT_SIGS = {
  proofRequested: "ProofRequested(bytes32,address,bytes32,uint128,uint64)",
  bidSubmitted: "BidSubmitted(bytes32,address,uint128)",
  requestAssigned: "RequestAssigned(bytes32,address,uint128)",
  proofSettled: "ProofSettled(bytes32,address,uint128,uint128)",
  proverSlashed: "ProverSlashed(bytes32,address,uint16,bytes32)",
  requestExpired: "RequestExpired(bytes32,address,uint128)"
};
var PROVER_SLASH_REASON_NON_DELIVERY = 1024;
var PROVER_SLASH_REASON_BAD_PROOF = 1025;
var PROVER_MARKET_REQUEST_DOMAIN = "prover_market.request.v1";
var PROVER_MARKET_BID_DOMAIN = "prover_market.bid.v1";
var PROVER_MARKET_SUBMIT_DOMAIN = "prover_market.submit.v1";
function proverMarketStateFromByte(b) {
  switch (b) {
    case 0:
      return "open";
    case 1:
      return "assigned";
    case 2:
      return "settled";
    case 3:
      return "slashed";
    case 4:
      return "expired";
    default:
      return null;
  }
}
var ProverMarketError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ProverMarketError";
  }
};
function requestSighash(vkeyHash, inputsHash, maxFee, deadline, nonce) {
  return bytesToHex8(
    keccak_256(
      concatBytes7(
        new TextEncoder().encode(PROVER_MARKET_REQUEST_DOMAIN),
        expectLength5(toBytes7(vkeyHash), 32, "vkeyHash"),
        expectLength5(toBytes7(inputsHash), 32, "inputsHash"),
        u128Bytes(maxFee, "maxFee"),
        u64Bytes(deadline, "deadline"),
        u64Bytes(nonce, "nonce")
      )
    )
  );
}
function bidSighash(requestId, fee) {
  return bytesToHex8(
    keccak_256(
      concatBytes7(
        new TextEncoder().encode(PROVER_MARKET_BID_DOMAIN),
        expectLength5(toBytes7(requestId), 32, "requestId"),
        u128Bytes(fee, "fee")
      )
    )
  );
}
function submitSighash(requestId, proofHash) {
  return bytesToHex8(
    keccak_256(
      concatBytes7(
        new TextEncoder().encode(PROVER_MARKET_SUBMIT_DOMAIN),
        expectLength5(toBytes7(requestId), 32, "requestId"),
        expectLength5(toBytes7(proofHash), 32, "proofHash")
      )
    )
  );
}
function encodeCreateRequestCanonical(args) {
  const buyer = expectLength5(toBytes7(args.buyer), 20, "buyer");
  const buyerPubkey = toBytes7(args.buyerPubkey);
  const sig = toBytes7(args.sig);
  if (buyerPubkey.length === 0 || buyerPubkey.length > 65535) {
    throw new ProverMarketError("buyerPubkey length out of range (1..=65535)");
  }
  if (sig.length === 0 || sig.length > 65535) {
    throw new ProverMarketError("sig length out of range (1..=65535)");
  }
  return bytesToHex8(
    concatBytes7(
      buyer,
      u16Bytes(buyerPubkey.length),
      buyerPubkey,
      expectLength5(toBytes7(args.vkeyHash), 32, "vkeyHash"),
      expectLength5(toBytes7(args.inputsHash), 32, "inputsHash"),
      u128Bytes(args.maxFee, "maxFee"),
      u64Bytes(args.deadline, "deadline"),
      u64Bytes(args.nonce, "nonce"),
      u16Bytes(sig.length),
      sig
    )
  );
}
function encodeCreateRequestCalldata(args) {
  const canonical = toBytes7(encodeCreateRequestCanonical(args));
  const offset = new Uint8Array(32);
  offset[31] = 32;
  const lenWord = new Uint8Array(32);
  const len = canonical.length;
  lenWord[28] = len >>> 24 & 255;
  lenWord[29] = len >>> 16 & 255;
  lenWord[30] = len >>> 8 & 255;
  lenWord[31] = len & 255;
  const pad = (32 - len % 32) % 32;
  return bytesToHex8(
    concatBytes7(hexToBytes7(PROVER_MARKET_SELECTORS.createRequest), offset, lenWord, canonical, new Uint8Array(pad))
  );
}
function selectorHex4(sig) {
  return [...keccak_256(new TextEncoder().encode(sig)).slice(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function toBytes7(value) {
  if (typeof value === "string") return hexToBytes7(value);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes7(hex) {
  const b = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (b.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(b)) {
    throw new ProverMarketError("invalid hex bytes");
  }
  const out = new Uint8Array(b.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(b.slice(i * 2, i * 2 + 2), 16);
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
    throw new ProverMarketError(`${name} must be ${len} bytes, got ${value.length}`);
  }
  return value;
}
function toBigint2(value, name) {
  let n;
  if (typeof value === "bigint") n = value;
  else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new ProverMarketError(`${name} must be a safe integer`);
    n = BigInt(value);
  } else if (/^(0|[1-9][0-9]*|0x[0-9a-fA-F]+)$/.test(value)) n = BigInt(value);
  else throw new ProverMarketError(`${name} must be a non-negative integer`);
  if (n < 0n) throw new ProverMarketError(`${name} must be non-negative`);
  return n;
}
function u16Bytes(value) {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new ProverMarketError("u16 value out of range");
  }
  return Uint8Array.from([value >> 8 & 255, value & 255]);
}
function u64Bytes(value, name) {
  const n = toBigint2(value, name);
  if (n > 0xffffffffffffffffn) throw new ProverMarketError(`${name} exceeds uint64`);
  return bigintBytes(n, 8);
}
function u128Bytes(value, name) {
  const n = toBigint2(value, name);
  if (n > (1n << 128n) - 1n) throw new ProverMarketError(`${name} exceeds uint128`);
  return bigintBytes(n, 16);
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
var TX_EXTENSION_KIND_MULTISIG = 64;
var TX_EXTENSION_MULTISIG_V1 = 1;
var MULTISIG_WITNESS_DOMAIN = "MONO_MULTISIG_WITNESS_V1";
var MULTISIG_ADDRESS_DERIVATION_DOMAIN2 = "MONO_MULTISIG_BLAKE3_20_V1";
var MIN_MULTISIG_MEMBERS = 1;
var MAX_MULTISIG_MEMBERS = 64;
var WITNESS_DOMAIN_BYTES = new TextEncoder().encode(MULTISIG_WITNESS_DOMAIN);
var ADDRESS_DOMAIN_BYTES = new TextEncoder().encode(MULTISIG_ADDRESS_DERIVATION_DOMAIN2);
var MultisigError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MultisigError";
  }
};
function toPubkeyBytes(value, label) {
  return expectBytes(value, ML_DSA_65_PUBLIC_KEY_LEN, label);
}
function compareBytes2(a, b) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}
function u64BeBytes2(value) {
  const out = new Uint8Array(8);
  let n = value;
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}
function expectThreshold(threshold) {
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 65535) {
    throw new MultisigError("threshold must be a uint16");
  }
  return threshold;
}
function sortMultisigMembers(members) {
  return members.map((m, i) => toPubkeyBytes(m, `members[${i}]`)).sort(compareBytes2);
}
function deriveMultisigAddressBytes(threshold, members) {
  expectThreshold(threshold);
  const sorted = sortMultisigMembers(members);
  const parts = [
    ADDRESS_DOMAIN_BYTES,
    Uint8Array.from([threshold >> 8 & 255, threshold & 255])
  ];
  for (const member of sorted) {
    parts.push(u64BeBytes2(BigInt(member.length)));
    parts.push(member);
  }
  return blake3(concatBytes2(...parts)).slice(0, 20);
}
function deriveMultisigAddress(threshold, members) {
  return addressToTypedBech32("multisig", deriveMultisigAddressBytes(threshold, members));
}
function validateMultisigRoster(witness) {
  const n = witness.members.length;
  if (n < MIN_MULTISIG_MEMBERS || n > MAX_MULTISIG_MEMBERS) {
    throw new MultisigError("roster size out of range");
  }
  if (witness.threshold === 0 || witness.threshold > n) {
    throw new MultisigError("threshold out of range");
  }
  if (witness.signatures.length > n) {
    throw new MultisigError("more signatures than members");
  }
  let prev;
  for (const member of witness.members) {
    if (member.algoId !== STANDARD_ALGO_NUMBER_ML_DSA_65) {
      throw new MultisigError("non-ml-dsa-65 member");
    }
    if (member.pubkey.length !== ML_DSA_65_PUBLIC_KEY_LEN) {
      throw new MultisigError("member pubkey length");
    }
    if (prev !== void 0 && compareBytes2(member.pubkey, prev) <= 0) {
      throw new MultisigError("roster not sorted / duplicate");
    }
    prev = member.pubkey;
  }
}
function assembleMultisigWitness(threshold, members, signatures = []) {
  expectThreshold(threshold);
  const sortedPubkeys = sortMultisigMembers(members);
  const witness = {
    threshold,
    members: sortedPubkeys.map((pubkey) => ({
      algoId: STANDARD_ALGO_NUMBER_ML_DSA_65,
      pubkey
    })),
    signatures: signatures.map((s, i) => ({
      memberIndex: expectMemberIndex(s.memberIndex, `signatures[${i}].memberIndex`),
      signature: expectBytes(s.signature, ML_DSA_65_SIGNATURE_LEN, `signatures[${i}].signature`)
    }))
  };
  validateMultisigRoster(witness);
  return witness;
}
function expectMemberIndex(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new MultisigError(`${label} must be a uint16`);
  }
  return value;
}
function multisigMemberIndex(members, pubkey) {
  const target = toPubkeyBytes(pubkey, "pubkey");
  const sorted = sortMultisigMembers(members);
  return sorted.findIndex((m) => compareBytes2(m, target) === 0);
}
function encodeMultisigWitnessBody(witness) {
  validateMultisigRoster(witness);
  const w = new BincodeWriter();
  w.u16(witness.threshold);
  w.u64(BigInt(witness.members.length));
  for (const member of witness.members) {
    w.u16(member.algoId);
    w.bytes(member.pubkey);
  }
  w.u64(BigInt(witness.signatures.length));
  for (const sig of witness.signatures) {
    w.u16(sig.memberIndex);
    w.bytes(sig.signature);
  }
  return concatBytes2(
    Uint8Array.of(TX_EXTENSION_MULTISIG_V1),
    WITNESS_DOMAIN_BYTES,
    w.toBytes()
  );
}
function hasMultisigExtension(fields) {
  return (fields.extensions ?? []).some((ext) => ext.kind === TX_EXTENSION_KIND_MULTISIG);
}
function stripMultisigExtensions(fields) {
  if (!hasMultisigExtension(fields)) return fields;
  return {
    ...fields,
    extensions: (fields.extensions ?? []).filter((ext) => ext.kind !== TX_EXTENSION_KIND_MULTISIG)
  };
}
function multisigBaseSighash(fields) {
  const base = stripMultisigExtensions(fields);
  return keccak_256(encodeTransactionForHash(base, 1));
}
function assembleMultisigSigned(fields, witness) {
  if (hasMultisigExtension(fields)) {
    throw new MultisigError("transaction already carries a multisig witness extension");
  }
  const body = encodeMultisigWitnessBody(witness);
  const extensions = [
    ...fields.extensions ?? [],
    { kind: TX_EXTENSION_KIND_MULTISIG, body }
  ];
  return { ...fields, extensions };
}

// src/delegation.ts
var DELEGATION_SELECTORS = {
  delegate: "0x662337de",
  undelegate: "0x914f3ca8",
  redelegate: "0xa06ac18f",
  claim: "0x4e71d92d",
  setAutoCompound: "0x86593454"
};
var DELEGATION_REVERT_TAGS = {
  /** `delegate(...)` carried native value — delegation is non-custodial and
   *  must be sent with `value = 0`. */
  unexpectedValue: "0x020e"
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
function encodeDelegateCalldata(cluster, weightBps) {
  return bytesToHex9(
    concatBytes8(
      hexToBytes8(DELEGATION_SELECTORS.delegate),
      uint32Word2(cluster, "cluster"),
      uint16Word2(weightBps, "weightBps")
    )
  );
}
function encodeUndelegateCalldata(cluster) {
  return bytesToHex9(
    concatBytes8(
      hexToBytes8(DELEGATION_SELECTORS.undelegate),
      uint32Word2(cluster, "cluster")
    )
  );
}
function encodeRedelegateCalldata(fromCluster, toCluster, weightBps) {
  return bytesToHex9(
    concatBytes8(
      hexToBytes8(DELEGATION_SELECTORS.redelegate),
      uint32Word2(fromCluster, "fromCluster"),
      uint32Word2(toCluster, "toCluster"),
      uint16Word2(weightBps, "weightBps")
    )
  );
}
function encodeClaimCalldata() {
  return DELEGATION_SELECTORS.claim;
}
function encodeSetAutoCompoundCalldata(enabled) {
  const flag = new Uint8Array(32);
  flag[31] = enabled ? 1 : 0;
  return bytesToHex9(
    concatBytes8(hexToBytes8(DELEGATION_SELECTORS.setAutoCompound), flag)
  );
}
function isUnexpectedValueRevert(data) {
  return bytesToHex9(toBytes8(data)).toLowerCase() === DELEGATION_REVERT_TAGS.unexpectedValue;
}
function uint32Word2(value, name) {
  const n = toBigint3(value, name);
  if (n < 0n || n > 0xffffffffn) {
    throw new DelegationPrecompileError(`${name} must fit uint32`);
  }
  const out = new Uint8Array(32);
  let rest = n;
  for (let i = 31; i >= 28; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
function uint16Word2(value, name) {
  const n = toBigint3(value, name);
  if (n < 0n || n > 0xffffn) {
    throw new DelegationPrecompileError(`${name} must fit uint16`);
  }
  const out = new Uint8Array(32);
  let rest = n;
  for (let i = 31; i >= 30; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
function toBigint3(value, name) {
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
function toBytes8(value) {
  if (typeof value === "string") {
    return hexToBytes8(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes8(hex) {
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
function bytesToHex9(bytes) {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function concatBytes8(...parts) {
  const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
var SET_POLICY_CLAIM_DOMAIN_TAG = "lyth.spending-policy.claim.v1";
var ML_DSA_65_PUBLIC_KEY_LEN2 = 1952;
var ML_DSA_65_SIGNATURE_LEN2 = 3309;
var SPENDING_POLICY_SELECTORS = {
  // WP §18.8 widened the setPolicy* sighash strings to 11 words, so their
  // selectors changed; enable/disable/recordSpend are unchanged.
  setPolicy: "0x8da1a765",
  setPolicyClaim: "0x35531f6c",
  claimPolicyByAddress: "0x0c21376c",
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
var EMPTY_ROOT = new Uint8Array(32);
function destinationRoot(address) {
  const bytes = toUserAddressBytes(address, "address");
  return keccak_256(bytes);
}
var allowRootFor = destinationRoot;
var denyRootFor = destinationRoot;
function categoryRoot(selectorOrSig) {
  let selector;
  if (typeof selectorOrSig === "string") {
    selector = keccak_256(new TextEncoder().encode(selectorOrSig)).slice(0, 4);
  } else {
    selector = selectorOrSig instanceof Uint8Array ? selectorOrSig : Uint8Array.from(selectorOrSig);
    if (selector.length !== 4) {
      throw new SpendingPolicyError("category selector must be exactly 4 bytes");
    }
  }
  return keccak_256(selector);
}
function setDestinationRoot(entries) {
  if (entries.length === 0) return EMPTY_ROOT;
  if (entries.length > 1) {
    throw new SpendingPolicyError(
      "multi-entry destination sets are not supported by the chain yet (v1 allows a single counterparty per root); pass exactly one address"
    );
  }
  return destinationRoot(entries[0]);
}
function composeClaimBoundMessage(chainId, args, opts) {
  const precompileAddress = toRawAddressBytes(opts?.precompileAddress ?? PRECOMPILE_ADDRESSES.SPENDING_POLICY);
  const normalized = normalizeArgs(args);
  return concatBytes9(
    new TextEncoder().encode(SET_POLICY_CLAIM_DOMAIN_TAG),
    uint64Bytes(chainId, "chainId"),
    precompileAddress,
    normalized.subAccount,
    normalized.principal,
    uint128Bytes(normalized.dailyCapLythoshi, "dailyCapLythoshi"),
    uint128Bytes(normalized.perTxCapLythoshi, "perTxCapLythoshi"),
    normalized.allowRoot,
    normalized.denyRoot,
    // WP §18.8 dimensions, in wire order: weekly cap (be16), monthly cap
    // (be16), category allow-root (32), packed time window (32),
    // policy expiry (be8). These slot in before the expected-version word.
    uint128Bytes(normalized.weeklyCapLythoshi, "weeklyCapLythoshi"),
    uint128Bytes(normalized.monthlyCapLythoshi, "monthlyCapLythoshi"),
    normalized.categoryAllowRoot,
    normalized.timeWindow,
    uint64Bytes(normalized.policyExpiry, "policyExpiry"),
    uint64Bytes(opts?.expectedPolicyVersion ?? 0n, "expectedPolicyVersion")
  );
}
function encodeSetPolicyCalldata(args) {
  const normalized = normalizeArgs(args);
  return bytesToHex10(
    concatBytes9(
      hexToBytes9(SPENDING_POLICY_SELECTORS.setPolicy),
      encodePolicyWords(normalized)
    )
  );
}
function encodeSetPolicyClaimCalldata(args, subAccountPubkey, subAccountSig) {
  const normalized = normalizeArgs(args);
  const pubkey = toBytes9(subAccountPubkey);
  const sig = toBytes9(subAccountSig);
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
  return bytesToHex10(
    concatBytes9(
      hexToBytes9(SPENDING_POLICY_SELECTORS.setPolicyClaim),
      encodePolicyWords(normalized),
      pubkey,
      sig
    )
  );
}
function encodeClaimPolicyByAddressCalldata(args, subAccountSig) {
  const normalized = normalizeArgs(args);
  const sig = toBytes9(subAccountSig);
  if (sig.length !== ML_DSA_65_SIGNATURE_LEN2) {
    throw new SpendingPolicyError(
      `subAccountSig must be ${ML_DSA_65_SIGNATURE_LEN2} bytes, got ${sig.length}`
    );
  }
  return bytesToHex10(
    concatBytes9(
      hexToBytes9(SPENDING_POLICY_SELECTORS.claimPolicyByAddress),
      encodePolicyWords(normalized),
      sig
    )
  );
}
function encodeEnableCalldata(subAccount) {
  return encodeSingleAddressCall(SPENDING_POLICY_SELECTORS.enable, subAccount, "subAccount");
}
function encodeDisableCalldata(subAccount) {
  return encodeSingleAddressCall(SPENDING_POLICY_SELECTORS.disable, subAccount, "subAccount");
}
var ZERO_WORD = new Uint8Array(32);
function normalizeArgs(args) {
  return {
    subAccount: toUserAddressBytes(args.subAccount, "subAccount"),
    principal: toUserAddressBytes(args.principal, "principal"),
    dailyCapLythoshi: toBigint4(args.dailyCapLythoshi, "dailyCapLythoshi"),
    perTxCapLythoshi: toBigint4(args.perTxCapLythoshi, "perTxCapLythoshi"),
    allowRoot: expectLength6(toBytes9(args.allowRoot), 32, "allowRoot"),
    denyRoot: expectLength6(toBytes9(args.denyRoot), 32, "denyRoot"),
    weeklyCapLythoshi: toBigint4(args.weeklyCapLythoshi ?? 0n, "weeklyCapLythoshi"),
    monthlyCapLythoshi: toBigint4(args.monthlyCapLythoshi ?? 0n, "monthlyCapLythoshi"),
    categoryAllowRoot: args.categoryAllowRoot == null ? ZERO_WORD : expectLength6(toBytes9(args.categoryAllowRoot), 32, "categoryAllowRoot"),
    timeWindow: args.timeWindow == null ? ZERO_WORD : expectLength6(toBytes9(args.timeWindow), 32, "timeWindow"),
    policyExpiry: toBigint4(args.policyExpiry ?? 0n, "policyExpiry")
  };
}
function encodePolicyWords(args) {
  return concatBytes9(
    encodeAddressWord(args.subAccount),
    encodeAddressWord(args.principal),
    encodeUint128Word(args.dailyCapLythoshi),
    encodeUint128Word(args.perTxCapLythoshi),
    args.allowRoot,
    args.denyRoot,
    // WP §18.8 trailing 5 words: weekly cap, monthly cap, category
    // allow-root, packed time window, policy expiry.
    encodeUint128Word(args.weeklyCapLythoshi),
    encodeUint128Word(args.monthlyCapLythoshi),
    args.categoryAllowRoot,
    args.timeWindow,
    encodeUint64Word(args.policyExpiry)
  );
}
function packTimeWindow(enabled, startHour, endHour) {
  const out = new Uint8Array(32);
  if (!enabled) return out;
  out[29] = 1;
  out[30] = clampHour(startHour);
  out[31] = clampHour(endHour);
  return out;
}
function decodeTimeWindow(word) {
  const bytes = expectLength6(toBytes9(word), 32, "timeWindow");
  if (bytes.every((b) => b === 0)) return null;
  if (bytes[29] === 0) return null;
  return [Math.min(bytes[30], 23), Math.min(bytes[31], 23)];
}
function clampHour(hour) {
  if (!Number.isInteger(hour) || hour < 0) {
    throw new SpendingPolicyError("time-window hour must be a non-negative integer");
  }
  return Math.min(hour, 23);
}
function encodeUint64Word(value) {
  return concatBytes9(new Uint8Array(24), uint64Bytes(value, "policyExpiry"));
}
function encodeSingleAddressCall(selector, address, name) {
  return bytesToHex10(concatBytes9(hexToBytes9(selector), encodeAddressWord(toUserAddressBytes(address, name))));
}
function encodeAddressWord(address) {
  return concatBytes9(new Uint8Array(12), address);
}
function encodeUint128Word(value) {
  return concatBytes9(new Uint8Array(16), uint128Bytes(value, "uint128"));
}
function toUserAddressBytes(value, name) {
  if (typeof value !== "string") {
    throw new SpendingPolicyError(`${name} must be a typed mono bech32m address`);
  }
  if (value.startsWith("0x") || value.startsWith("0X")) {
    throw new SpendingPolicyError(`${name} raw 0x addresses are retired; use typed mono bech32m addresses`);
  }
  try {
    return typedBech32ToAddress(value, "user").bytes;
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new SpendingPolicyError(`${name} must be a typed mono bech32m address${detail}`);
  }
}
function toRawAddressBytes(value) {
  if (typeof value === "string") {
    return hexToAddressBytes(value);
  }
  return expectLength6(value instanceof Uint8Array ? value : Uint8Array.from(value), 20, "address");
}
function toBytes9(value) {
  if (typeof value === "string") {
    return hexToBytes9(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes9(hex) {
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
function bytesToHex10(bytes) {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function concatBytes9(...parts) {
  const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function expectLength6(value, len, name) {
  if (value.length !== len) {
    throw new SpendingPolicyError(`${name} must be ${len} bytes`);
  }
  return value;
}
function toBigint4(value, name) {
  const n = typeof value === "bigint" ? value : BigInt(value);
  if (n < 0n) {
    throw new SpendingPolicyError(`${name} must be non-negative`);
  }
  return n;
}
function uint64Bytes(value, name) {
  const n = toBigint4(value, name);
  if (n > 0xffffffffffffffffn) {
    throw new SpendingPolicyError(`${name} exceeds uint64`);
  }
  return bigintBytes2(n, 8);
}
function uint128Bytes(value, name) {
  if (value > 0xffffffffffffffffffffffffffffffffn) {
    throw new SpendingPolicyError(`${name} exceeds uint128`);
  }
  return bigintBytes2(value, 16);
}
function bigintBytes2(value, len) {
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
  const bytes = toBytes10(pubkey);
  if (bytes.length !== PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN) {
    throw new PubkeyRegistryError(
      `pubkey must be ${PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN} bytes, got ${bytes.length}`
    );
  }
  return bytesToHex11(
    concatBytes10(
      hexToBytes10(PUBKEY_REGISTRY_SELECTORS.registerPubkey),
      uint256Word4(32n),
      uint256Word4(BigInt(bytes.length)),
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
  const bytes = toBytes10(data);
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
  const bytes = toBytes10(data);
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
  return bytesToHex11(concatBytes10(hexToBytes10(selector), addressWord5(toAddressBytes(address))));
}
function addressWord5(address) {
  return concatBytes10(new Uint8Array(12), address);
}
function toAddressBytes(value) {
  if (typeof value !== "string") {
    throw new PubkeyRegistryError("address must be a typed mono bech32m address");
  }
  if (value.startsWith("0x") || value.startsWith("0X")) {
    throw new PubkeyRegistryError("raw 0x addresses are retired; use typed mono bech32m addresses");
  }
  try {
    return typedBech32ToAddress(value, "user").bytes;
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new PubkeyRegistryError(`address must be a typed mono bech32m address${detail}`);
  }
}
function toBytes10(value) {
  if (typeof value === "string") {
    return hexToBytes10(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function hexToBytes10(hex) {
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
function bytesToHex11(bytes) {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function concatBytes10(...parts) {
  const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function uint256Word4(value) {
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

// src/crypto/envelope.ts
var MempoolClass = {
  CLOBOp: 3};

// src/market-actions.ts
var CLOB_MARKET_ID_DOMAIN_TAG = 193;
var NATIVE_MARKET_MODULE_ADDRESS_BYTES = "0x4d41524b45545f4e41544956455f4d4f445f5631";
var NATIVE_MARKET_MODULE_ADDRESS = addressToTypedBech32(
  "systemModule",
  NATIVE_MARKET_MODULE_ADDRESS_BYTES
);
var NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE = "native-call-forwarder-v1";
var NATIVE_CALL_FORWARDER_RESPONSE_OFFSET = 768;
var NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY = 256;
var MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES = 2047;
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
  cancelOrder: "0x7489ec23",
  /** `setMinNotional(bytes32,bytes32,uint256)` — foundation-authorized. */
  setMinNotional: "0x395dc48f",
  /** `setTickSize(bytes32,bytes32,uint256)` — foundation-authorized per-market grid tune. */
  setTickSize: "0x10666f0b",
  /** `setLotSize(bytes32,bytes32,uint256)` — foundation-authorized per-market grid tune. */
  setLotSize: "0x9909be80"
};
var OPERATOR_ROUTER_SIGS = {
  /** `registerOperator(address recipient, uint16 feeBps)`. */
  registerOperator: "registerOperator(address,uint16)",
  /** `updateOperator(address recipient, uint16 feeBps)`. */
  updateOperator: "updateOperator(address,uint16)",
  /** `disableOperator(address operator)` — foundation-authorized. */
  disableOperator: "disableOperator(address)",
  /**
   * `placeLimitOrderVia(address operator, bytes32 base, bytes32 quote,
   *  uint8 side, uint256 price, uint256 amount, uint64 expiresAtBlock)`
   *  → `bytes32 orderId`.
   *
   * Skims the operator fee (quote token, `user -> recipient`) then
   * re-enters the CLOB `placeLimitOrder` op with `caller = user`, so the
   * resting order is owned + escrowed + cancellable by the user,
   * identical to a direct CLOB placement.
   */
  placeLimitOrderVia: "placeLimitOrderVia(address,bytes32,bytes32,uint8,uint256,uint256,uint64)"
};
var OPERATOR_ROUTER_SELECTORS = {
  registerOperator: operatorRouterSelectorHex(OPERATOR_ROUTER_SIGS.registerOperator),
  updateOperator: operatorRouterSelectorHex(OPERATOR_ROUTER_SIGS.updateOperator),
  disableOperator: operatorRouterSelectorHex(OPERATOR_ROUTER_SIGS.disableOperator),
  placeLimitOrderVia: operatorRouterSelectorHex(OPERATOR_ROUTER_SIGS.placeLimitOrderVia)
};
var OPERATOR_ROUTER_EVENT_SIGS = {
  operatorFeeCharged: "OperatorFeeCharged(address,address,bytes32,address,bytes32,uint256,bytes32)",
  operatorRegistered: "OperatorRegistered(address,address,uint16)",
  operatorUpdated: "OperatorUpdated(address,address,uint16,bool)"
};
function operatorRouterSelectorHex(sig) {
  return "0x" + [...keccak_256(new TextEncoder().encode(sig)).slice(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
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
function deriveNativeSpotMarketId(args) {
  const owner = normalizeNativeMarketAddress(args.owner, "owner");
  const nonce = uint64(args.nonce, "nonce");
  return bytesToHex2(
    blake3(
      concatBytes2(
        asciiBytes("MONO_MARKET_ID_V1"),
        asciiBytes(ADDRESS_KIND_HRPS[owner.kind]),
        owner.bytes,
        bytes32FromHex(args.baseAsset, "baseAsset"),
        bytes32FromHex(args.quoteAsset, "quoteAsset"),
        uint64BeBytes(nonce)
      )
    )
  );
}
function deriveNativeSpotOrderId(args) {
  const owner = normalizeNativeMarketAddress(args.owner, "owner");
  const side = normalizeSide(args.side);
  const nonce = uint64(args.nonce, "nonce");
  return bytesToHex2(
    blake3(
      concatBytes2(
        asciiBytes("MONO_MARKET_ORDER_ID_V1"),
        bytes32FromHex(args.marketId, "marketId"),
        asciiBytes(ADDRESS_KIND_HRPS[owner.kind]),
        owner.bytes,
        new Uint8Array([nativeOrderSideDiscriminator(side)]),
        uint64BeBytes(nonce)
      )
    )
  );
}
function encodePlaceLimitOrderCalldata(args) {
  const normalized = normalizePlaceSpotLimitOrderArgs(args);
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(CLOB_SELECTORS.placeLimitOrder, "placeLimitOrder selector"),
      normalized.baseTokenId,
      normalized.quoteTokenId,
      uint8Word2(normalized.side),
      uint256Word5(normalized.price, "price"),
      uint256Word5(normalized.quantity, "quantity"),
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
      uint256Word5(normalized.quantity, "quantity"),
      uint16Word3(normalized.maxSlippageBps, "maxSlippageBps")
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
      uint256Word5(normalized.quantity, "quantity"),
      uint16Word3(normalized.maxSlippageBps, "maxSlippageBps"),
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
function encodeMarketGridTuneCalldata(selector, label, args) {
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(selector, `${label} selector`),
      bytes32FromHex(args.baseTokenId, "baseTokenId"),
      bytes32FromHex(args.quoteTokenId, "quoteTokenId"),
      uint256Word5(BigInt(args.newValue), "newValue")
    )
  );
}
function encodeSetMinNotionalCalldata(args) {
  return encodeMarketGridTuneCalldata(CLOB_SELECTORS.setMinNotional, "setMinNotional", args);
}
function encodeSetTickSizeCalldata(args) {
  return encodeMarketGridTuneCalldata(CLOB_SELECTORS.setTickSize, "setTickSize", args);
}
function encodeSetLotSizeCalldata(args) {
  return encodeMarketGridTuneCalldata(CLOB_SELECTORS.setLotSize, "setLotSize", args);
}
function encodeNativeSpotLimitOrderCall(args) {
  const w = new BincodeWriter();
  w.enumVariant(0);
  w.enumVariant(1);
  spotLimitOrderInto(w, args, "");
  return bytesToHex2(w.toBytes());
}
function encodeNativeSpotCreateMarketCall(args) {
  const w = new BincodeWriter();
  w.enumVariant(0);
  w.enumVariant(0);
  monoAddressInto(w, args.owner, "owner");
  w.u64(uint64(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex(args.baseAsset, "baseAsset"));
  w.rawBytes(bytes32FromHex(args.quoteAsset, "quoteAsset"));
  w.u128(positiveU128Decimal(args.tickSize, "tickSize"));
  w.u128(positiveU128Decimal(args.lotSize, "lotSize"));
  w.u128(positiveU128Decimal(args.minQuantity, "minQuantity"));
  w.u128(u128Decimal(args.minNotional, "minNotional"));
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
function encodeNativeSpotSettleLimitOrderCall(args) {
  const w = new BincodeWriter();
  w.enumVariant(0);
  w.enumVariant(2);
  w.rawBytes(bytes32FromHex(args.makerOrderId, "makerOrderId"));
  spotLimitOrderInto(w, args.takerOrder, "takerOrder.");
  return bytesToHex2(w.toBytes());
}
function encodeNativeSpotSettleRoutedLimitOrderCall(args) {
  const makerOrderIds = normalizeListingIds(args.makerOrderIds, "makerOrderIds");
  const w = new BincodeWriter();
  w.enumVariant(0);
  w.enumVariant(3);
  w.u64(BigInt(makerOrderIds.length));
  for (const makerOrderId of makerOrderIds) {
    w.rawBytes(makerOrderId);
  }
  spotLimitOrderInto(w, args.takerOrder, "takerOrder.");
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
function buildNativeSpotCreateMarketForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotCreateMarketModuleCall(args, maxCycles));
}
function buildNativeSpotCancelOrderForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotCancelOrderModuleCall(args, maxCycles));
}
function buildNativeSpotSettleLimitOrderForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotSettleLimitOrderModuleCall(args, maxCycles));
}
function buildNativeSpotSettleRoutedLimitOrderForwarderInput(args, maxCycles) {
  return encodeNativeMarketModuleForwarderInput(buildNativeSpotSettleRoutedLimitOrderModuleCall(args, maxCycles));
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
function buildNativeSpotCreateMarketModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotCreateMarketCall(args), maxCycles);
}
function buildNativeSpotCancelOrderModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotCancelOrderCall(args), maxCycles);
}
function buildNativeSpotSettleLimitOrderModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotSettleLimitOrderCall(args), maxCycles);
}
function buildNativeSpotSettleRoutedLimitOrderModuleCall(args, maxCycles) {
  return buildNativeMarketModuleCallEnvelope(encodeNativeSpotSettleRoutedLimitOrderCall(args), maxCycles);
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
function encodePlaceLimitOrderViaCalldata(args) {
  const operator = normalizeNativeMarketAddress(args.operator, "operator");
  if (operator.kind !== "user") {
    throw new MarketActionError("operator must be a 'mono' user address");
  }
  const side = normalizeSide(args.side);
  const price = positiveDecimal(args.price, "price");
  const amount = positiveDecimal(args.amount, "amount");
  const expiresAtBlock = uint64(args.expiresAtBlock ?? 0n, "expiresAtBlock");
  return bytesToHex2(
    concatBytes2(
      hexToBytes2(OPERATOR_ROUTER_SELECTORS.placeLimitOrderVia, "placeLimitOrderVia selector"),
      addressWord6(operator.bytes),
      bytes32FromHex(args.base, "base"),
      bytes32FromHex(args.quote, "quote"),
      uint8Word2(side),
      uint256Word5(price, "price"),
      uint256Word5(amount, "amount"),
      uint64Word3(expiresAtBlock, "expiresAtBlock")
    )
  );
}
function quoteOperatorFee(args, feeBps) {
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > PROTOCOL_MAX_OPERATOR_FEE_BPS) {
    throw new MarketActionError(
      `feeBps must be an integer in 0..=${PROTOCOL_MAX_OPERATOR_FEE_BPS}`
    );
  }
  const operator = normalizeNativeMarketAddress(args.operator, "operator");
  if (operator.kind !== "user") {
    throw new MarketActionError("operator must be a 'mono' user address");
  }
  const price = positiveDecimal(args.price, "price");
  const amount = positiveDecimal(args.amount, "amount");
  const quoteBasis = price * amount;
  const feeAmount = quoteBasis * BigInt(feeBps) / 10000n;
  return {
    operator: args.operator,
    feeBps,
    quoteBasis: quoteBasis.toString(10),
    feeAmount: feeAmount.toString(10)
  };
}
function buildPlaceLimitOrderViaPlan(args, feeBps) {
  return {
    method: "eth_sendTransaction",
    params: [
      {
        to: PRECOMPILE_ADDRESSES.OPERATOR_ROUTER,
        value: "0x0",
        data: encodePlaceLimitOrderViaCalldata(args)
      }
    ],
    mempoolClass: MempoolClass.CLOBOp,
    operatorFee: quoteOperatorFee(args, feeBps)
  };
}
function decodeOperatorFeeChargedEvent(topics, data) {
  if (topics.length !== 4) {
    throw new MarketActionError(
      `OperatorFeeCharged expects 4 topics, got ${topics.length}`
    );
  }
  const topic0 = bytesToHex2(expectWordLen(toEventBytes(topics[0]), "topic0"));
  const expected = bytesToHex2(
    keccak_256(new TextEncoder().encode(OPERATOR_ROUTER_EVENT_SIGS.operatorFeeCharged))
  );
  if (topic0 !== expected) {
    throw new MarketActionError("topic0 is not OperatorFeeCharged");
  }
  const body = toEventBytes(data);
  if (body.length !== 4 * 32) {
    throw new MarketActionError(
      `OperatorFeeCharged expects 128 data bytes, got ${body.length}`
    );
  }
  return {
    operator: addressFromEventTopic(topics[1]),
    user: addressFromEventTopic(topics[2]),
    marketId: bytesToHex2(expectWordLen(toEventBytes(topics[3]), "marketId")),
    recipient: bytesToHex2(body.subarray(12, 32)),
    quoteToken: bytesToHex2(body.subarray(32, 64)),
    feeAmount: u256DecimalWord(body.subarray(64, 96)),
    clobOrderId: bytesToHex2(body.subarray(96, 128))
  };
}
function buildNativeCallForwarderArtifact(requestBytes) {
  const size = uint64(requestBytes, "requestBytes");
  if (size === 0n) {
    throw new MarketActionError("requestBytes must be non-zero");
  }
  if (size > BigInt(MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES)) {
    throw new MarketActionError(`requestBytes must be <= ${MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES}`);
  }
  const requestBytesNumber = Number(size);
  const code = nativeCallForwarderCode(requestBytesNumber);
  const codeHash = mrvCodeHashHex2(code);
  return {
    artifactBytes: encodeNativeCallForwarderArtifact(code, codeHash),
    requestBytes: requestBytesNumber,
    artifactProfile: NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE,
    codeHash
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
function nativeOrderSideDiscriminator(side) {
  return side === 0 ? 1 : 2;
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
  return u128(n, name);
}
function u128Decimal(value, name) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new MarketActionError(`${name} must be an integer decimal string`);
  }
  return u128(BigInt(value), name);
}
function u128(n, name) {
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
  if (typeof input === "object" && input !== null && "address" in input) {
    const kind = input.kind;
    if (kind !== void 0 && !(kind in NATIVE_MARKET_ADDRESS_KIND_VARIANTS)) {
      throw new MarketActionError(`${name}.kind is not a supported native address kind`);
    }
    if (typeof input.address !== "string") {
      throw new MarketActionError(`${name}.address must be a typed bech32m address`);
    }
    return normalizeNativeMarketAddressString(input.address, kind, name);
  }
  throw new MarketActionError(`${name} must be a typed bech32m address`);
}
function normalizeNativeMarketAddressString(address, expectedKind, name) {
  if (address.startsWith("0x") || address.startsWith("0X")) {
    throw new MarketActionError(`${name} raw 0x addresses are retired; use typed bech32m addresses`);
  }
  try {
    const parsed = typedBech32ToAddress(address, expectedKind);
    return { kind: parsed.kind, bytes: parsed.bytes };
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new MarketActionError(`${name} must be a typed bech32m address${detail}`);
  }
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
function uint16Word3(value, name) {
  if (value < 0n || value > 0xffffn) {
    throw new MarketActionError(`${name} must fit uint16`);
  }
  const out = new Uint8Array(32);
  out[30] = Number(value >> 8n & 0xffn);
  out[31] = Number(value & 0xffn);
  return out;
}
function uint256Word5(value, name) {
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
function addressWord6(addr) {
  if (addr.length !== 20) {
    throw new MarketActionError("address must be 20 bytes");
  }
  const out = new Uint8Array(32);
  out.set(addr, 12);
  return out;
}
function toEventBytes(value) {
  if (typeof value === "string") return hexToBytes2(value, "event word");
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function expectWordLen(value, name) {
  if (value.length !== 32) {
    throw new MarketActionError(`${name} must be 32 bytes, got ${value.length}`);
  }
  return value;
}
function addressFromEventTopic(topic) {
  return bytesToHex2(expectWordLen(toEventBytes(topic), "address topic").subarray(12, 32));
}
function u256DecimalWord(word) {
  let v = 0n;
  for (const b of word) v = v << 8n | BigInt(b);
  return v.toString(10);
}
function spotLimitOrderInto(w, args, prefix) {
  w.rawBytes(bytes32FromHex(args.marketId, `${prefix}marketId`));
  monoAddressInto(w, args.owner, `${prefix}owner`);
  w.u64(uint64(args.nonce, `${prefix}nonce`));
  w.enumVariant(normalizeSide(args.side));
  w.u128(positiveU128Decimal(args.price, `${prefix}price`));
  w.u128(positiveU128Decimal(args.quantity, `${prefix}quantity`));
  w.u64(uint64(args.expiresAtBlock, `${prefix}expiresAtBlock`));
}
function uint64BeBytes(value) {
  const out = new Uint8Array(8);
  let rest = value;
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}
function asciiBytes(value) {
  return new TextEncoder().encode(value);
}
function mrvCodeHashHex2(code) {
  const len = uint64BeBytes(BigInt(code.length));
  return bytesToHex2(blake3(concatBytes2(asciiBytes("MONO_MRV_CODE_V1"), len, code)));
}
function nativeCallForwarderCode(requestBytes) {
  return rvCode([
    rvAddi(17, 0, 769),
    rvAddi(10, 0, 0),
    rvAddi(11, 0, requestBytes),
    rvAddi(12, 0, NATIVE_CALL_FORWARDER_RESPONSE_OFFSET),
    rvAddi(13, 0, NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY),
    115
  ]);
}
function rvCode(words) {
  const out = new Uint8Array(words.length * 4);
  const view = new DataView(out.buffer);
  words.forEach((word, i) => view.setUint32(i * 4, word >>> 0, true));
  return out;
}
function rvAddi(rd, rs1, imm) {
  return (imm & 4095) << 20 | rs1 << 15 | rd << 7 | 19;
}
function encodeNativeCallForwarderArtifact(code, codeHash) {
  const w = new BincodeWriter();
  w.u16(1);
  w.enumVariant(0);
  w.bytes(code);
  w.u64(1n);
  writeString(w, "forward_call_contract");
  w.enumVariant(1);
  w.u64(1n);
  writeString(w, "request");
  w.enumVariant(6);
  w.u64(1n);
  writeString(w, "response");
  w.enumVariant(6);
  w.u64(1n);
  writeString(w, "mono");
  writeString(w, "call_contract");
  w.u16(769);
  w.u32(1);
  w.u32(1);
  w.u32(16 * 1024);
  writeString(w, "native_call_forwarder");
  w.u16(1);
  w.rawBytes(hexToBytes2(codeHash, "codeHash"));
  writeString(w, "mono-sdk-rv32im-forwarder");
  w.rawBytes(hexToBytes2(mrvCodeHashHex2(asciiBytes("mono-sdk-native-call-forwarder-v1")), "sourceDigest"));
  writeString(w, NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE);
  w.bytes(new Uint8Array());
  return bytesToHex2(w.toBytes());
}
function writeString(w, value) {
  w.bytes(asciiBytes(value));
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
  if (typeof input === "object" && input !== null && "address" in input) {
    const kind = input.kind;
    if (kind !== void 0 && !(kind in NATIVE_AGENT_ADDRESS_KIND_VARIANTS)) {
      throw new AgentActionError(`${name}.kind is not a supported native address kind`);
    }
    if (typeof input.address !== "string") {
      throw new AgentActionError(`${name}.address must be a typed bech32m address`);
    }
    return normalizeNativeAgentAddressString(input.address, kind, name);
  }
  throw new AgentActionError(`${name} must be a typed bech32m address`);
}
function normalizeNativeAgentAddressString(address, expectedKind, name) {
  if (address.startsWith("0x") || address.startsWith("0X")) {
    throw new AgentActionError(`${name} raw 0x addresses are retired; use typed bech32m addresses`);
  }
  try {
    const parsed = typedBech32ToAddress(address, expectedKind);
    return { kind: parsed.kind, bytes: parsed.bytes };
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new AgentActionError(`${name} must be a typed bech32m address${detail}`);
  }
}

// src/network.ts
var MONOLYTHIUM_TESTNET_CHAIN_ID = 69420n;
var MONOLYTHIUM_TESTNET_NETWORK_NAME = "monolythium-testnet";
var MONOLYTHIUM_NETWORKS = {
  testnet: {
    chainId: MONOLYTHIUM_TESTNET_CHAIN_ID,
    name: MONOLYTHIUM_TESTNET_NETWORK_NAME
  }
};

// src/index.ts
var version = "0.4.18";

export { ADDRESS_HRP, ADDRESS_KIND_HRPS, API_STREAM_TOPICS, AddressError, AgentActionError, ApiClient, BRIDGE_QUOTE_API_BLOCKED_REASON, BRIDGE_REVERT_TAGS, BRIDGE_SELECTORS, BRIDGE_SUBMIT_API_BLOCKED_REASON, BURN_ADDR, BridgePrecompileError, BridgeRouteCatalogueError, CHAIN_REGISTRY, CHAIN_REGISTRY_RAW_BASE, CLOB_MARKET_ID_DOMAIN_TAG, CLOB_SELECTORS, CLUSTER_FORMED_EVENT_SIG, DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT, DELEGATION_REVERT_TAGS, DELEGATION_SELECTORS, DIVERSITY_SCORE_MAX, DelegationPrecompileError, EMPTY_ROOT, EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER, FEED_ID_DOMAIN_TAG, LYTHOSHI_PER_LYTH, LYTH_DECIMALS, MAX_MULTISIG_MEMBERS, MAX_NATIVE_CALL_FORWARDER_REQUEST_BYTES, MAX_NATIVE_RECEIPT_EVENTS, MIN_EXECUTION_UNIT_PRICE_LYTHOSHI, MIN_MULTISIG_MEMBERS, ML_DSA_65_PUBLIC_KEY_LEN2 as ML_DSA_65_PUBLIC_KEY_LEN, ML_DSA_65_SIGNATURE_LEN2 as ML_DSA_65_SIGNATURE_LEN, MONOLYTHIUM_NETWORKS, MONOLYTHIUM_TESTNET_CHAIN_ID, MONOLYTHIUM_TESTNET_NETWORK_NAME, MRV_DEPLOY_PAYLOAD_VERSION, MRV_FORMAT_VERSION, MRV_MAX_ABI_SYMBOLS, MRV_MAX_CODE_BYTES, MRV_MAX_DEBUG_BYTES, MRV_MAX_MEMORY_PAGES, MRV_MAX_STORAGE_NAMESPACE_BYTES, MRV_MEMORY_PAGE_BYTES, MRV_PROFILE_MONO_RV32IM_V1, MRV_STRUCTURED_FEE_FIELDS, MRV_TX_EXTENSION_KIND, MRV_TX_EXTENSION_V1, MULTISIG_ADDRESS_DERIVATION_DOMAIN, MULTISIG_ADDRESS_DERIVATION_DOMAIN2 as MULTISIG_WITNESS_ADDRESS_DERIVATION_DOMAIN, MULTISIG_WITNESS_DOMAIN, MarketActionError, MrvValidationError, MultisigError, NAME_BASE_MULTIPLIER, NAME_FALLBACK_FEE_UNIT_LYTHOSHI, NAME_LABEL_MAX_LEN, NAME_LABEL_MIN_LEN, NAME_MAX_LEN, NAME_REGISTRY_SELECTORS, NATIVE_AGENT_MODULE_ADDRESS, NATIVE_AGENT_MODULE_ADDRESS_BYTES, NATIVE_CALL_FORWARDER_ARTIFACT_PROFILE, NATIVE_CALL_FORWARDER_RESPONSE_CAPACITY, NATIVE_CALL_FORWARDER_RESPONSE_OFFSET, NATIVE_DEV_HOST_API_VERSION, NATIVE_DEV_IPC_PROTOCOL_VERSION, NATIVE_DEV_MANIFEST_SCHEMA_VERSION, NATIVE_LYTH_DECIMALS, NATIVE_MARKET_EVENT_FAMILY, NATIVE_MARKET_MODULE_ADDRESS, NATIVE_MARKET_MODULE_ADDRESS_BYTES, NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC, NODE_REGISTRY_ARCHIVE_CHALLENGE_DOMAIN, NODE_REGISTRY_ARCHIVE_KIND_EPOCH_SEED, NODE_REGISTRY_ARCHIVE_NONCE_DOMAIN, NODE_REGISTRY_BLS_PUBKEY_BYTES, NODE_REGISTRY_CAPABILITIES, NODE_REGISTRY_CAPABILITY_MASK, NODE_REGISTRY_CHALLENGE_EPOCH_WINDOW, NODE_REGISTRY_CHARTER_COOLDOWN_EPOCHS, NODE_REGISTRY_CLUSTER_CHARTER_BYTES, NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS, NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS, NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES, NODE_REGISTRY_CONSENSUS_POP_BYTES, NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES, NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES, NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES, NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS, NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS, NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES, NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT, NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT, NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN, NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN_V2, NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT, NODE_REGISTRY_FORM_CLUSTER_THRESHOLD, NODE_REGISTRY_LEGACY_CLUSTER_MEMBER_PUBKEY_BYTES, NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH, NODE_REGISTRY_MERKLE_INNER_DOMAIN, NODE_REGISTRY_MERKLE_LEAF_DOMAIN, NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT, NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES, NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES, NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID, NODE_REGISTRY_PUBLIC_SERVICE_MASK, NODE_REGISTRY_SELECTORS, NODE_REGISTRY_SUBKIND_CHARTER_DELEGATOR_BPS, NODE_REGISTRY_SUBKIND_CHARTER_MEMBER_SHARES, NODE_REGISTRY_TAG_ARCHIVE_CHALLENGE, NODE_REGISTRY_TAG_CLUSTER_CHARTER, NODE_REGISTRY_TAG_SERVICE_SCORE, NODE_REGISTRY_TAG_TREASURY, NODE_REGISTRY_UPDATE_CHARTER_MESSAGE_DOMAIN, NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD, NO_EVM_ARCHIVE_PROOF_SCHEMA, NO_EVM_ARCHIVE_SIGNATURE_SCHEME, NO_EVM_FINALITY_EVIDENCE_SCHEMA, NO_EVM_FINALITY_EVIDENCE_SOURCE, NO_EVM_RECEIPTS_ROOT_DOMAIN, NO_EVM_RECEIPT_CODEC, NO_EVM_RECEIPT_PROOF_SCHEMA, NO_EVM_RECEIPT_PROOF_TYPE, NO_EVM_RECEIPT_ROOT_ALGORITHM, NameRegistryError, NoEvmReceiptProofError, NodeRegistryError, OPERATOR_ROUTER_ADDRESS, OPERATOR_ROUTER_EVENT_SIGS, OPERATOR_ROUTER_SELECTORS, OPERATOR_ROUTER_SIGS, ORACLE_EVENT_SIGS, OperatorTrustError, OracleEventError, PENDING_CHANGE_KIND_CODES, PRECOMPILE_ADDRESSES, PROOF_KIND_BINARY, PROTOCOL_MAX_OPERATOR_FEE_BPS, PROVER_MARKET_ADDRESS, PROVER_MARKET_BID_DOMAIN, PROVER_MARKET_EVENT_SIGS, PROVER_MARKET_REQUEST_DOMAIN, PROVER_MARKET_SELECTORS, PROVER_MARKET_SUBMIT_DOMAIN, PROVER_SLASH_REASON_BAD_PROOF, PROVER_SLASH_REASON_NON_DELIVERY, PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN, PUBKEY_REGISTRY_SELECTORS, ProofVerifier, ProofVerifyError, ProverMarketError, PubkeyRegistryError, QUARANTINED_RPC_CODE, REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT, RESERVED_ADDRESS_HRPS, RpcClient, SERVES_GPU_PROVE, SERVICE_PROBE_STATUS, SET_POLICY_CLAIM_DOMAIN_TAG, SPENDING_POLICY_SELECTORS, SdkError, SpendingPolicyError, TESTNET_69420, TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI, TOKEN_FACTORY_FLAGS, TOKEN_FACTORY_KNOWN_FLAG_MASK, TOKEN_FACTORY_MAX_CREATOR_FEE_BPS, TOKEN_FACTORY_MAX_DECIMALS, TOKEN_FACTORY_NAME_MAX_BYTES, TOKEN_FACTORY_SELECTORS, TOKEN_FACTORY_SIGS, TOKEN_FACTORY_SYMBOL_MAX_BYTES, TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG, TRANSFER_DEFAULT_EXECUTION_UNIT_LIMIT, TX_EXTENSION_KIND_MULTISIG, TX_EXTENSION_MULTISIG_V1, TokenFactoryError, V1_BRIDGE_ALLOWED_FEE_TOKEN, V1_BRIDGE_ALLOWED_PROTOCOL, VRF_DOMAIN_TAG_MAX_BYTES, VRF_HEIGHT_NOT_FINALIZED_REVERT, VRF_OUTPUT_BYTES, VrfCallError, addressBytesToHex, addressToBech32, addressToTypedBech32, allowRootFor, apiEndpointFromRpcEndpoint, archiveMerkleInnerHash, archiveMerkleLeafHash, asBinaryProofEnvelope, assembleMultisigSigned, assembleMultisigWitness, assertMrvCallNativeSubmissionPlan, assertMrvDeployNativeSubmissionPlan, assertMrvFeeDisplayConformance, assertMrvStructuredFeeConformance, assertNativeDevMrcTokenPlan, assertNativeDevMrvDeployPlan, assertNativeDevWalletApprovalRequest, assertNativeMarketOrderBookStreamPayload, assessBridgeRoute, bech32ToAddress, bech32ToAddressBytes, bidSighash, bridgeAddressHex, bridgeDrainRemaining, bridgeQuoteSubmitReadiness, bridgeRoutesReadiness, bridgeTransferCandidates, buildBridgeRouteCatalogue, buildCancelSpotOrderPlan, buildMrvCallNativeTxPlan, buildMrvCallPlan, buildMrvCallRequest, buildMrvDeployNativeTxPlan, buildMrvDeployPayloadNativeTxPlan, buildMrvDeployPayloadPlan, buildMrvDeployPayloadRequest, buildMrvDeployPlan, buildMrvDeployRequest, buildNativeAgentCreateEscrowForwarderInput, buildNativeAgentCreateEscrowModuleCall, buildNativeAgentModuleCallEnvelope, buildNativeAgentRecordReputationForwarderInput, buildNativeAgentRecordReputationModuleCall, buildNativeAgentSetSpendingPolicyForwarderInput, buildNativeAgentSetSpendingPolicyModuleCall, buildNativeCallForwarderArtifact, buildNativeMarketModuleCallEnvelope, buildNativeNftBuyListingForwarderInput, buildNativeNftBuyListingModuleCall, buildNativeNftCancelListingForwarderInput, buildNativeNftCancelListingModuleCall, buildNativeNftCreateListingForwarderInput, buildNativeNftCreateListingModuleCall, buildNativeNftPlaceAuctionBidForwarderInput, buildNativeNftPlaceAuctionBidModuleCall, buildNativeNftSettleAuctionForwarderInput, buildNativeNftSettleAuctionModuleCall, buildNativeNftSweepExpiredListingsForwarderInput, buildNativeNftSweepExpiredListingsModuleCall, buildNativeSpotCancelOrderForwarderInput, buildNativeSpotCancelOrderModuleCall, buildNativeSpotCreateMarketForwarderInput, buildNativeSpotCreateMarketModuleCall, buildNativeSpotLimitOrderForwarderInput, buildNativeSpotLimitOrderModuleCall, buildNativeSpotSettleLimitOrderForwarderInput, buildNativeSpotSettleLimitOrderModuleCall, buildNativeSpotSettleRoutedLimitOrderForwarderInput, buildNativeSpotSettleRoutedLimitOrderModuleCall, buildPlaceLimitOrderViaPlan, buildPlaceSpotLimitOrderPlan, buildPlaceSpotMarketOrderExPlan, buildPlaceSpotMarketOrderPlan, buildRequestClusterJoinTxFields, buildVoteClusterAdmitTxFields, categoryRoot, checkMrvFeeDisplayConformance, checkMrvStructuredFeeConformance, checkNativeDevkitCompatibility, clampPriorityTip, clobAddressHex, clusterApyPercent, clusterJoinRequestExists, compareNativeDevVersions, composeClaimBoundMessage, computeNoEvmDacFinalityMessage, computeNoEvmLeaderFinalityMessage, computeNoEvmReceiptsRoot, computeNoEvmRoundFinalityMessage, computeNoEvmTargetReceiptHash, computeQuoteLiquidity, consumeNativeEvents, decodeActiveCharter, decodeClusterCharter, decodeClusterDiversity, decodeClusterFormedEvent, decodeClusterJoinRequest, decodeHasPubkeyReturn, decodeLookupPubkeyReturn, decodeNativeAgentStateResponse, decodeNativeMarketOrderBookDeltasResponse, decodeNativeReceiptResponse, decodeNoEvmReceiptTranscript, decodeOperatorFeeChargedEvent, decodeOperatorNetworkMetadata, decodeOracleEvent, decodePendingCharter, decodeProbeAuthority, decodeScoreServiceProbe, decodeTimeWindow, decodeTokenFactoryTokenId, decodeTxFeedResponse, decodeVrfOutput, delegationAddressHex, denyRootFor, deriveArchiveChallenge, deriveClobMarketId, deriveClusterAnchorAddress, deriveClusterJoinOperatorId, deriveFeedId, deriveMrvContractAddress, deriveMultisigAddress, deriveMultisigAddressBytes, deriveNativeSpotMarketId, deriveNativeSpotOrderId, deriveTokenFactoryTokenId, destinationRoot, encodeAnswerArchiveChallengeCalldata, encodeAttestDkgReshareCalldata, encodeAttestServiceProbeCalldata, encodeBlockSelector, encodeBridgeChallengeCalldata, encodeBridgeClaimCalldata, encodeCancelClusterJoinCalldata, encodeCancelOrderCalldata, encodeCancelPendingChangeCalldata, encodeClaimCalldata, encodeClaimPolicyByAddressCalldata, encodeClusterCharter, encodeCommitArchiveRootCalldata, encodeCreateFixedSupplyMrc20Calldata, encodeCreateRequestCalldata, encodeCreateRequestCanonical, encodeCreateTokenCalldata, encodeDelegateCalldata, encodeDisableCalldata, encodeEnableCalldata, encodeExpireClusterJoinCalldata, encodeFormClusterCalldata, encodeFormClusterV2Calldata, encodeGetClusterJoinRequestCalldata, encodeGetPendingCharterCalldata, encodeGetProbeAuthorityCalldata, encodeHasPubkeyCalldata, encodeLockBridgeConfigCalldata, encodeLookupPubkeyCalldata, encodeMrvDeployPayload, encodeMultisigWitnessBody, encodeNameAcceptTransferCall, encodeNameProposeTransferCall, encodeNameRegisterCall, encodeNativeAgentAcceptEscrowCall, encodeNativeAgentApproveEscrowCall, encodeNativeAgentArbiterGetCall, encodeNativeAgentAttestationGetCall, encodeNativeAgentAvailabilityGetCall, encodeNativeAgentCancelEscrowCall, encodeNativeAgentCloseAvailabilityCall, encodeNativeAgentConsentGetCall, encodeNativeAgentCounterEscrowCall, encodeNativeAgentCreateEscrowCall, encodeNativeAgentDeactivateServiceCall, encodeNativeAgentDisputeEscrowCall, encodeNativeAgentEscrowGetCall, encodeNativeAgentGrantConsentCall, encodeNativeAgentIssueAttestationCall, encodeNativeAgentIssuerGetCall, encodeNativeAgentListServiceCall, encodeNativeAgentModuleForwarderInput, encodeNativeAgentOpenAvailabilityCall, encodeNativeAgentRecordPolicySpendCall, encodeNativeAgentRecordReputationCall, encodeNativeAgentRegisterArbiterCall, encodeNativeAgentRegisterIssuerCall, encodeNativeAgentReputationGetCall, encodeNativeAgentResolveEscrowCall, encodeNativeAgentRevokeAttestationCall, encodeNativeAgentRevokeConsentCall, encodeNativeAgentServiceGetCall, encodeNativeAgentSetAvailabilityCall, encodeNativeAgentSetSpendingPolicyCall, encodeNativeAgentSpendingPolicyGetCall, encodeNativeAgentStartEscrowCall, encodeNativeAgentSubmitEscrowCall, encodeNativeMarketModuleForwarderInput, encodeNativeNftBuyListingCall, encodeNativeNftCancelListingCall, encodeNativeNftCreateListingCall, encodeNativeNftPlaceAuctionBidCall, encodeNativeNftSettleAuctionCall, encodeNativeNftSweepExpiredListingsCall, encodeNativeSpotCancelOrderCall, encodeNativeSpotCreateMarketCall, encodeNativeSpotLimitOrderCall, encodeNativeSpotSettleLimitOrderCall, encodeNativeSpotSettleRoutedLimitOrderCall, encodePlaceLimitOrderCalldata, encodePlaceLimitOrderViaCalldata, encodePlaceMarketOrderCalldata, encodePlaceMarketOrderExCalldata, encodeRecoverOperatorNodeCalldata, encodeRedelegateCalldata, encodeRegisterPubkeyCalldata, encodeReportServiceProbeCalldata, encodeRequestClusterJoinCalldata, encodeSetAutoCompoundCalldata, encodeSetBridgeResumeCooldownCalldata, encodeSetBridgeRouteFinalityCalldata, encodeSetLotSizeCalldata, encodeSetMinNotionalCalldata, encodeSetOperatorDisplayCalldata, encodeSetPolicyCalldata, encodeSetPolicyClaimCalldata, encodeSetProbeAuthorityCalldata, encodeSetTickSizeCalldata, encodeSubmitBridgeProofCalldata, encodeSubmitPendingChangeCalldata, encodeTokenFactoryAllowanceCalldata, encodeTokenFactoryApproveCalldata, encodeTokenFactoryBalanceOfCalldata, encodeTokenFactoryBurnCalldata, encodeTokenFactoryDecreaseAllowanceCalldata, encodeTokenFactoryDestroyCalldata, encodeTokenFactoryIncreaseAllowanceCalldata, encodeTokenFactoryMetadataCalldata, encodeTokenFactoryMintCalldata, encodeTokenFactorySetPausedCalldata, encodeTokenFactoryTotalSupplyCalldata, encodeTokenFactoryTransferCalldata, encodeTokenFactoryTransferFromCalldata, encodeTokenFactoryTransferOwnershipCalldata, encodeUndelegateCalldata, encodeUpdateCharterCalldata, encodeVoteClusterAdmitCalldata, encodeVrfEvaluateCalldata, exportBridgeRouteCatalogueJson, fetchChainInfoLatest, fetchChainRegistryLatest, formClusterMessage, formClusterMessageHex, formClusterMessageV2, formClusterMessageV2Hex, formatLyth, formatLythoshi, formatNativeReceiptFeeDisplay, formatOraclePrice, getChainInfo, getNoEvmReceiptTrustPolicy, getP2pSeeds, getRpcEndpoints, hashToHex, hexToAddressBytes, isBridgeAdminLockedRevert, isBridgeCooldownZeroRevert, isBridgeFinalityZeroRevert, isBridgeResumeCooldownActiveRevert, isConcreteServiceProbeStatus, isNativeDecodedEvent, isNativeMarketOrderBookStreamPayload, isQuarantineError, isSinglePublicServiceProbeMask, isUnexpectedValueRevert, isValidNodeRegistryCapabilities, isValidPublicServiceProbeMask, mrvAddressToBech32, mrvBech32ToAddress, mrvCodeHashHex, mrvV1TransactionExtension, multisigBaseSighash, multisigMemberIndex, nameLengthModifierX10, nameRegistrationCost, nameRegistryAddressHex, nativeAgentStateFilterParams, nativeDevSchemaFieldNames, nativeDevUiStrings, nativeEventMatches, nativeEventsFilterParams, nativeEventsFromHistory, nativeEventsFromReceipt, nativeMarketEventFilter, nativeMarketEventsFromHistory, nativeMarketEventsFromReceipt, nativeMarketStateFilterParams, noEvmReceiptTrustPolicyFromChainInfo, nodeHostingClassFromByte, nodeHostingClassToByte, nodeRegistryAddressHex, normalizeAddressHex, normalizeBridgeRouteCatalogue, normalizePendingChangeKind, oracleAddressHex, oraclePriceToNumber, packTimeWindow, parseAddress, parseBridgeRouteCatalogueJson, parseChainRegistryToml, parseDkgResharePublicKeys, parseLythToLythoshi, parseNameCategory, parseNativeDecodedEvent, parseQuantity, parseQuantityBig, preflightClusterJoinRequest, previewRequestClusterJoin, previewVoteClusterAdmit, proofVerifier, protocolNonceForEpoch, proverMarketStateFromByte, pubkeyRegistryAddressHex, quoteOperatorFee, rankBridgeRoutes, rankMarketsByVolume, readClusterJoinRequest, requestSighash, requireTypedAddress, resolveClusterJoinExecutionFee, resolveExecutionFee, resolveMaxExecutionUnitPrice, resolveRegistryExecutionFee, resolveStudioHostStatus, selectBridgeTransferRoute, selectTrustedOperator, selectTrustedOperatorForNetwork, serviceMaskToBitIndex, serviceProbeStatusLabel, setDestinationRoot, slotArchiveChallengePass, slotClusterCharter, slotClusterCharterDelegator, slotClusterCharterMembers, slotClusterServiceScore, slotEpochChallengeSeed, slotProbeAuthority, slotScoreServiceProbe, sortMultisigMembers, spendingPolicyAddressHex, submitMrvCallNativeTx, submitMrvDeployNativeTx, submitMrvDeployPayloadNativeTx, submitRequestClusterJoin, submitSighash, submitVoteClusterAdmit, tokenFactoryAddressHex, transactionFeeExposure, typedBech32ToAddress, updateCharterMessage, updateCharterMessageHex, validateAddress, validateBridgeRouteCatalogue, validateMrvArtifactMetadata, validateMrvCallRequest, validateMrvDeployRequest, validateMultisigRoster, validateTokenFactoryFlags, verifyNoEvmArchiveProofSignatures, verifyNoEvmBlockFinalityEvidenceMultisig, verifyNoEvmBlockFinalityEvidenceThreshold, verifyNoEvmFinalityEvidenceMultisig, verifyNoEvmFinalityEvidenceThreshold, verifyNoEvmReceiptProof, verifyNoEvmReceiptProofTrust, verifyOperatorGenesis, version, vrfAddressHex };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map