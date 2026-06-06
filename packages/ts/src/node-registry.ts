/**
 * Node-registry precompile ABI helpers and service capability constants.
 *
 * These constants mirror `protocore-node-registry::capabilities` and
 * `protocore-node-registry::abi`. They are exported for wallets,
 * service probers, faucets, and operator dashboards that need to build
 * canonical registry transactions without retyping low-level values.
 *
 * TODO(monolythium-vision): the operator-lifecycle BASE ops are not yet
 * encoded in either SDK — `register(bytes32,string,bytes32,uint32,uint32,
 * bytes,bytes,bytes)`, `unregister`, `withdrawBond`, `updateEndpoint`,
 * `updateCapabilities`, `heartbeat`, `unjail`, `setNetworkMetadata`,
 * `claimOperatorName`, `releaseOperatorName`. Today `register` is driven by
 * the `protocore registry register` CLI (operator-spine-register-reality);
 * SDK encoders are only needed once the Monarch operator-onboarding UX
 * (roadmap #54) drives registration from a UI. That call is unresolved, and
 * `register` carries three dynamic byte-array tails (1952-byte consensus
 * pubkey, 3309-byte PoP, 1184-byte seal EK) whose ABI layout must be pinned
 * against mono-core with golden vectors before it is hand-rolled here. Add
 * the encoders to TS first, then mirror in Rust (`node_registry.rs`).
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
  /** `setOperatorDisplay(bytes32,string,string)` — owner-callable public display metadata. */
  setOperatorDisplay: "0x" + selectorHex("setOperatorDisplay(bytes32,string,string)"),
  /** `publishOperatorSealKey(bytes32,bytes)` — owner-callable LythiumSeal EK publication. */
  publishOperatorSealKey: "0x" + selectorHex("publishOperatorSealKey(bytes32,bytes)"),
  /** `getOperatorSealKey(bytes32)` view — returns the operator's published LythiumSeal EK. */
  getOperatorSealKey: "0x" + selectorHex("getOperatorSealKey(bytes32)"),
} as const;

/** Cluster-member reference width used by genesis and formation rosters. */
export const NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES = 48;
/** @deprecated Use NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES. */
export const NODE_REGISTRY_LEGACY_CLUSTER_MEMBER_PUBKEY_BYTES = NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES;
/** @deprecated Use NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES. */
export const NODE_REGISTRY_BLS_PUBKEY_BYTES = NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES;
/** Full ML-DSA-65 consensus pubkey width used by register and pending-change calldata. */
export const NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES = 1952;
/** ML-DSA-65 consensus signature width. */
export const NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES = 3309;
/** ML-DSA-65 self-signature width used as register proof-of-possession. */
export const NODE_REGISTRY_CONSENSUS_POP_BYTES = 3309;
/** ML-KEM-768 encapsulation key width published for LythiumSeal operator rosters. */
export const NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES = 1184;
/** DKG-reshare attestation signature width. Removal is tracked outside W1. */
export const NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES = 96;
/** @deprecated Use NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES. */
export const NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES = NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES;
export const NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS = 5;
export const NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS = 7;
export const NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID = (1n << 56n) - 1n;
export const NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT = 7;
export const NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT = 3;
export const NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT =
  NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT + NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT;
export const NODE_REGISTRY_FORM_CLUSTER_THRESHOLD = 7;
export const NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN =
  "PROTOCORE_NODE_REGISTRY_CLUSTER_FORM_V1\0" as const;
export const NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES = 128;
export const NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES = 64;

export type PendingChangeKind = "add" | "remove" | "rotate";

export const PENDING_CHANGE_KIND_CODES: Record<PendingChangeKind, number> = {
  add: 1,
  remove: 2,
  rotate: 3,
} as const;

const PENDING_CHANGE_KIND_LABELS: Record<number, PendingChangeKind> = {
  1: "add",
  2: "remove",
  3: "rotate",
} as const;

/** Canonical `ClusterFormed(uint32,uint64,address,bytes)` event topic0 (MB-5). */
export const CLUSTER_FORMED_EVENT_SIG = "ClusterFormed(uint32,uint64,address,bytes)" as const;

export interface SubmitPendingChangeCalldataArgs {
  kind: PendingChangeKind | number;
  targetPubkey: string | Uint8Array | readonly number[];
  effectiveEpoch: bigint | number | string;
  intentId?: bigint | number | string;
}

export interface CancelPendingChangeCalldataArgs {
  epoch: bigint | number | string;
  targetPubkey: string | Uint8Array | readonly number[];
}

export interface AttestDkgReshareCalldataArgs {
  intentId: bigint | number | string;
  consensusPublicKeys?: string | Uint8Array | readonly number[];
  /** @deprecated Use consensusPublicKeys. */
  blsPublicKeys?: string | Uint8Array | readonly number[];
  thresholdSig: string | Uint8Array | readonly number[];
}

export interface RequestClusterJoinCalldataArgs {
  clusterId: bigint | number | string;
  operatorPubkey: string | Uint8Array | readonly number[];
}

export interface VoteClusterAdmitCalldataArgs {
  clusterId: bigint | number | string;
  operatorId: string | Uint8Array | readonly number[];
  voterPubkey: string | Uint8Array | readonly number[];
}

export interface CancelClusterJoinCalldataArgs {
  clusterId: bigint | number | string;
  operatorId: string | Uint8Array | readonly number[];
}

export interface ExpireClusterJoinCalldataArgs {
  clusterId: bigint | number | string;
  operatorId: string | Uint8Array | readonly number[];
}

export interface GetClusterJoinRequestCalldataArgs {
  clusterId: bigint | number | string;
  operatorId: string | Uint8Array | readonly number[];
}

export interface SetOperatorDisplayCalldataArgs {
  peerId: string | Uint8Array | readonly number[];
  moniker: string;
  alias: string;
}

export interface PublishOperatorSealKeyCalldataArgs {
  peerId: string | Uint8Array | readonly number[];
  sealEk: string | Uint8Array | readonly number[];
}

export interface GetOperatorSealKeyCalldataArgs {
  operatorId: string | Uint8Array | readonly number[];
}

export interface FormClusterCalldataArgs {
  activePubkeys: string | Uint8Array | readonly number[];
  standbyPubkeys: string | Uint8Array | readonly number[];
  signatures: string | Uint8Array | readonly number[];
}

export type ClusterJoinRequestStatus = "none" | "open" | "admitted" | "cancelled" | "expired" | "unknown";

export interface ClusterJoinRequestView {
  owner: string;
  requestEpoch: bigint;
  requestNonce?: bigint;
  snapshotThreshold: number;
  snapshotN: number;
  voteCount: number;
  statusCode: number;
  status: ClusterJoinRequestStatus;
  bondLythoshi: bigint;
  sealRosterPending: boolean;
}

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

export function normalizePendingChangeKind(
  kind: PendingChangeKind | number,
): { kind: PendingChangeKind; kindCode: number } {
  if (typeof kind === "number") {
    const label = PENDING_CHANGE_KIND_LABELS[kind];
    if (!label) throw new NodeRegistryError(`unknown pending-change kind ${kind}`);
    return { kind: label, kindCode: kind };
  }
  const kindCode = PENDING_CHANGE_KIND_CODES[kind];
  if (!kindCode) throw new NodeRegistryError(`unknown pending-change kind ${kind}`);
  return { kind, kindCode };
}

export function encodeRecoverOperatorNodeCalldata(
  peerId: string | Uint8Array | readonly number[],
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.recoverOperatorNode),
      expectLength(toBytes(peerId), 32, "peerId"),
    ),
  );
}

export function encodeSubmitPendingChangeCalldata(
  args: SubmitPendingChangeCalldataArgs,
): string {
  const { kind, kindCode } = normalizePendingChangeKind(args.kind);
  const targetPubkey = expectLength(
    toBytes(args.targetPubkey),
    NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "targetPubkey",
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
      targetPubkeyPadded,
    ),
  );
}

export function encodeCancelPendingChangeCalldata(
  args: CancelPendingChangeCalldataArgs,
): string {
  const targetPubkey = expectLength(
    toBytes(args.targetPubkey),
    NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "targetPubkey",
  );
  const targetPubkeyPadded = padToWord(targetPubkey);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.cancelPendingChange),
      uint64Word(args.epoch, "epoch"),
      uint64Word(2n * 32n, "targetPubkeyOffset"),
      uint64Word(BigInt(targetPubkey.length), "targetPubkeyLength"),
      targetPubkeyPadded,
    ),
  );
}

export function parseDkgResharePublicKeys(
  consensusPublicKeys: string | Uint8Array | readonly number[],
): Uint8Array[] {
  const keys = toBytes(consensusPublicKeys);
  if (keys.length % NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES !== 0) {
    throw new NodeRegistryError(
      `consensusPublicKeys length must be a multiple of ${NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES} bytes`,
    );
  }
  const signerCount = keys.length / NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES;
  if (
    signerCount < NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS ||
    signerCount > NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS
  ) {
    throw new NodeRegistryError(
      `consensusPublicKeys must contain ${NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS}..${NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS} signers`,
    );
  }
  const out: Uint8Array[] = [];
  const seen = new Set<string>();
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

function dkgReshareConsensusPublicKeys(
  args: AttestDkgReshareCalldataArgs,
): string | Uint8Array | readonly number[] {
  if (args.consensusPublicKeys !== undefined) return args.consensusPublicKeys;
  if (args.blsPublicKeys !== undefined) return args.blsPublicKeys;
  throw new NodeRegistryError("consensusPublicKeys is required");
}

export function encodeAttestDkgReshareCalldata(
  args: AttestDkgReshareCalldataArgs,
): string {
  const intentId = toUint64(args.intentId, "intentId");
  if (intentId === 0n) {
    throw new NodeRegistryError("intentId must be greater than zero");
  }
  if (intentId > NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID) {
    throw new NodeRegistryError("intentId must be <= 2^56-1");
  }
  const publicKeys = concatBytes(...parseDkgResharePublicKeys(dkgReshareConsensusPublicKeys(args)));
  const thresholdSig = expectLength(
    toBytes(args.thresholdSig),
    NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES,
    "thresholdSig",
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
      sigPadded,
    ),
  );
}

export function encodeRequestClusterJoinCalldata(args: RequestClusterJoinCalldataArgs): string {
  const operatorPubkey = expectLength(
    toBytes(args.operatorPubkey),
    NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "operatorPubkey",
  );
  const operatorPubkeyPadded = padToWord(operatorPubkey);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.requestClusterJoin),
      uint32Word(toUint32(args.clusterId, "clusterId")),
      uint64Word(2n * 32n, "operatorPubkeyOffset"),
      uint64Word(BigInt(operatorPubkey.length), "operatorPubkeyLength"),
      operatorPubkeyPadded,
    ),
  );
}

export function encodeVoteClusterAdmitCalldata(args: VoteClusterAdmitCalldataArgs): string {
  const operatorId = expectLength(toBytes(args.operatorId), 32, "operatorId");
  const voterPubkey = expectLength(
    toBytes(args.voterPubkey),
    NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "voterPubkey",
  );
  const voterPubkeyPadded = padToWord(voterPubkey);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.voteClusterAdmit),
      uint32Word(toUint32(args.clusterId, "clusterId")),
      operatorId,
      uint64Word(3n * 32n, "voterPubkeyOffset"),
      uint64Word(BigInt(voterPubkey.length), "voterPubkeyLength"),
      voterPubkeyPadded,
    ),
  );
}

export function encodeSetOperatorDisplayCalldata(args: SetOperatorDisplayCalldataArgs): string {
  const peerId = expectLength(toBytes(args.peerId), 32, "peerId");
  const moniker = displayTextBytes(
    args.moniker,
    NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES,
    "moniker",
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
      aliasPadded,
    ),
  );
}

export function encodePublishOperatorSealKeyCalldata(
  args: PublishOperatorSealKeyCalldataArgs,
): string {
  const peerId = expectLength(toBytes(args.peerId), 32, "peerId");
  const sealEk = expectNonZeroBytes(
    expectLength(toBytes(args.sealEk), NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES, "sealEk"),
    "sealEk",
  );
  const sealEkPadded = padToWord(sealEk);
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.publishOperatorSealKey),
      peerId,
      uint64Word(2n * 32n, "sealEkOffset"),
      uint64Word(BigInt(sealEk.length), "sealEkLength"),
      sealEkPadded,
    ),
  );
}

export function encodeGetOperatorSealKeyCalldata(args: GetOperatorSealKeyCalldataArgs): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.getOperatorSealKey),
      expectLength(toBytes(args.operatorId), 32, "operatorId"),
    ),
  );
}

export function decodeOperatorSealKey(
  returnData: string | Uint8Array | readonly number[],
): string {
  const bytes = toBytes(returnData);
  if (bytes.length === NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES) {
    return bytesToHex(expectNonZeroBytes(bytes, "operatorSealKey"));
  }
  const sealEk = decodeDynamicBytesResult(
    bytes,
    NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES,
    "operatorSealKey",
  );
  return bytesToHex(expectNonZeroBytes(sealEk, "operatorSealKey"));
}

export function encodeCancelClusterJoinCalldata(args: CancelClusterJoinCalldataArgs): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.cancelClusterJoin),
      uint32Word(toUint32(args.clusterId, "clusterId")),
      expectLength(toBytes(args.operatorId), 32, "operatorId"),
    ),
  );
}

export function encodeExpireClusterJoinCalldata(args: ExpireClusterJoinCalldataArgs): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.expireClusterJoin),
      uint32Word(toUint32(args.clusterId, "clusterId")),
      expectLength(toBytes(args.operatorId), 32, "operatorId"),
    ),
  );
}

export function encodeGetClusterJoinRequestCalldata(
  args: GetClusterJoinRequestCalldataArgs,
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.getClusterJoinRequest),
      uint32Word(toUint32(args.clusterId, "clusterId")),
      expectLength(toBytes(args.operatorId), 32, "operatorId"),
    ),
  );
}

export function formClusterMessage(
  activePubkeys: string | Uint8Array | readonly number[],
  standbyPubkeys: string | Uint8Array | readonly number[],
): Uint8Array {
  const active = expectLength(
    toBytes(activePubkeys),
    NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "activePubkeys",
  );
  const standby = expectLength(
    toBytes(standbyPubkeys),
    NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "standbyPubkeys",
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
      standby,
    ),
  );
}

export function formClusterMessageHex(
  activePubkeys: string | Uint8Array | readonly number[],
  standbyPubkeys: string | Uint8Array | readonly number[],
): string {
  return bytesToHex(formClusterMessage(activePubkeys, standbyPubkeys));
}

export function encodeFormClusterCalldata(args: FormClusterCalldataArgs): string {
  const activePubkeys = expectLength(
    toBytes(args.activePubkeys),
    NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "activePubkeys",
  );
  const standbyPubkeys = expectLength(
    toBytes(args.standbyPubkeys),
    NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "standbyPubkeys",
  );
  const signatures = expectLength(
    toBytes(args.signatures),
    NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT * NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES,
    "signatures",
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
      signaturesPadded,
    ),
  );
}

/**
 * Decode CJ-1 `getClusterJoinRequest(uint32,bytes32)` return data.
 *
 * Planned flat tuple:
 * `(address owner,uint64 requestEpoch,uint16 snapshotThreshold,uint16 snapshotN,
 *   uint16 voteCount,uint8 status,uint128 bondLythoshi,bool sealRosterPending)`.
 */
export function decodeClusterJoinRequest(
  returnData: string | Uint8Array | readonly number[],
): ClusterJoinRequestView {
  const bytes = expectLength(toBytes(returnData), 8 * 32, "clusterJoinRequest");
  const word = (i: number) => bytes.slice(i * 32, (i + 1) * 32);
  const statusCode = numberFromWord(word(5), "status", 0xff);
  return {
    owner: bytesToHex(word(0).slice(12, 32)),
    requestEpoch: u64FromWord(word(1)),
    snapshotThreshold: numberFromWord(word(2), "snapshotThreshold", 0xffff),
    snapshotN: numberFromWord(word(3), "snapshotN", 0xffff),
    voteCount: numberFromWord(word(4), "voteCount", 0xffff),
    statusCode,
    status: clusterJoinRequestStatusLabel(statusCode),
    bondLythoshi: uintFromWord(word(6)),
    sealRosterPending: numberFromWord(word(7), "sealRosterPending", 1) === 1,
  };
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
 * `lyth_getClusterDiversity` RPC response (PF-6).
 *
 * Distinct from {@link ClusterDiversity} (which decodes the
 * `getClusterDiversity(uint32)` ABI return tuple from an `eth_call`):
 * this is the JSON the `lyth_getClusterDiversity` method returns,
 * serialized from the chain's `ClusterDiversity` struct with camelCase
 * keys. It carries the `clusterId` echo that the ABI tuple omits. Every
 * value is in `0..=10000` basis points.
 */
export interface ClusterDiversityView {
  /** Cluster id whose roster was scored. */
  clusterId: number;
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
 * `lyth_getOperatorNetworkMetadata` RPC response (PF-6).
 *
 * Distinct from {@link OperatorNetworkMetadata} (the ABI-decode tuple):
 * this is the JSON the `lyth_getOperatorNetworkMetadata` method returns,
 * read from the node-registry registration record (`0x1005`). `geoRegion`
 * here is the decoded ISO-3166-1 alpha-3 region **string** (or `null`);
 * `hostingClass` is the snake_case wire string (`bare_metal` /
 * `co_location` / `cloud`); `asn` is `null` when not declared.
 */
export interface OperatorNetworkMetadataView {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** Data source — `"native_state_storage"`. */
  source: string;
  /** Node-registry precompile address (`0x1005`). */
  precompile: string;
  /** Operator/peer id (`0x` 32-byte hex). */
  operatorId: string;
  /** Autonomous-system number; `null` when not declared. */
  asn: number | null;
  /** Decoded ISO-3166-1 alpha-3 region string; `null` when not declared. */
  geoRegion: string | null;
  /** Declared hosting class as the wire string. */
  hostingClass: "bare_metal" | "co_location" | "cloud";
  /** `keccak256` of the operator's public IP (`0x` 32 bytes). */
  ipAddressHash: string;
  /** `keccak256` of the TPM PCR digest (`0x` 32 bytes). */
  pcrDigest: string;
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
  /**
   * Concatenated 48-byte cluster-member references (`0x` hex). PQ
   * rosters place the 32-byte operator id in the first 32 bytes and
   * zero-pad the remaining 16 bytes.
   */
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
  const members = roster.map((m, i) =>
    expectLength(toBytes(m), NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES, `roster[${i}]`),
  );
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

function uintFromWord(word: Uint8Array): bigint {
  let v = 0n;
  for (const byte of word) {
    v = (v << 8n) | BigInt(byte);
  }
  return v;
}

function numberFromWord(word: Uint8Array, name: string, max: number): number {
  const value = uintFromWord(word);
  if (value > BigInt(max)) {
    throw new NodeRegistryError(`${name} must be <= ${max}`);
  }
  return Number(value);
}

function clusterJoinRequestStatusLabel(status: number): ClusterJoinRequestStatus {
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

function u64BeBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let n = value;
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

function u32BeBytes(value: number): Uint8Array {
  const n = expectUint32(value, "uint32");
  return Uint8Array.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function u16BeBytes(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new NodeRegistryError("uint16 value out of range");
  }
  return Uint8Array.from([(value >>> 8) & 0xff, value & 0xff]);
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

function toUint32(value: bigint | number | string, name: string): number {
  let parsed: bigint;
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
  if (parsed < 0n || parsed > 0xffff_ffffn) {
    throw new NodeRegistryError(`${name} must fit uint32`);
  }
  return Number(parsed);
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

function uint64Word(value: bigint | number | string, name: string): Uint8Array {
  const n = toUint64(value, name);
  const out = new Uint8Array(32);
  let rest = n;
  for (let i = 31; i >= 24; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function toUint64(value: bigint | number | string, name: string): bigint {
  let parsed: bigint;
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
  if (parsed < 0n || parsed > 0xffff_ffff_ffff_ffffn) {
    throw new NodeRegistryError(`${name} must fit uint64`);
  }
  return parsed;
}

function padToWord(bytes: Uint8Array): Uint8Array {
  const paddedLength = Math.ceil(bytes.length / 32) * 32;
  if (paddedLength === bytes.length) return bytes;
  const out = new Uint8Array(paddedLength);
  out.set(bytes);
  return out;
}

function toBytes(value: string | Uint8Array | readonly number[]): Uint8Array {
  if (typeof value === "string") {
    return hexToBytes(value);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function displayTextBytes(value: string, maxBytes: number, name: string): Uint8Array {
  for (const ch of value) {
    const code = ch.codePointAt(0);
    if (code !== undefined && ((code >= 0 && code <= 0x1f) || (code >= 0x7f && code <= 0x9f))) {
      throw new NodeRegistryError(`${name} must not contain control characters`);
    }
  }
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > maxBytes) {
    throw new NodeRegistryError(`${name} must be <= ${maxBytes} UTF-8 bytes`);
  }
  return bytes;
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

function expectNonZeroBytes(value: Uint8Array, name: string): Uint8Array {
  if (value.every((byte) => byte === 0)) {
    throw new NodeRegistryError(`${name} must not be all-zero`);
  }
  return value;
}

function decodeDynamicBytesResult(
  bytes: Uint8Array,
  expectedLength: number,
  label: string,
): Uint8Array {
  if (bytes.length < 64) {
    throw new NodeRegistryError(`${label} return must be ABI-encoded dynamic bytes`);
  }
  const offset = uintFromWord(bytes.slice(0, 32));
  if (offset !== 32n) {
    throw new NodeRegistryError(`${label} return offset must be 0x20`);
  }
  const len = uintFromWord(bytes.slice(32, 64));
  if (len !== BigInt(expectedLength)) {
    throw new NodeRegistryError(`${label} must be ${expectedLength} bytes, got ${len}`);
  }
  const paddedLen = Math.ceil(expectedLength / 32) * 32;
  if (bytes.length < 64 + paddedLen) {
    throw new NodeRegistryError(`${label} body is truncated`);
  }
  return bytes.slice(64, 64 + expectedLength);
}
