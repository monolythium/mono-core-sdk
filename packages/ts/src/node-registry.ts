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
  /**
   * `formCluster(bytes,bytes,bytes,bytes)` — V2 formation carrying the
   * 30-byte economics charter (Law §6.8); consents verify over the V2
   * digest, which commits to the charter bytes.
   */
  formClusterV2: "0x" + selectorHex("formCluster(bytes,bytes,bytes,bytes)"),
  /** `setOperatorDisplay(bytes32,string,string)` — owner-callable public display metadata. */
  setOperatorDisplay: "0x" + selectorHex("setOperatorDisplay(bytes32,string,string)"),
  /** `publishOperatorSealKey(bytes32,bytes)` — owner-callable LythiumSeal EK publication. */
  publishOperatorSealKey: "0x" + selectorHex("publishOperatorSealKey(bytes32,bytes)"),
  /** `getOperatorSealKey(bytes32)` view — returns the operator's published LythiumSeal EK. */
  getOperatorSealKey: "0x" + selectorHex("getOperatorSealKey(bytes32)"),
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
  answerArchiveChallenge:
    "0x" + selectorHex("answerArchiveChallenge(bytes32,uint16,uint64,bytes,bytes32[])"),
  /** `setProbeAuthority(address)` — Component C foundation-gated probe-authority rotation. */
  setProbeAuthority: "0x" + selectorHex("setProbeAuthority(address)"),
  /** `getProbeAuthority()` view — Component C configured probe-authority address. */
  getProbeAuthority: "0x" + selectorHex("getProbeAuthority()"),
  /** `attestServiceProbe(bytes32,uint32,uint8,uint64)` — Component C attested score-eligibility path. */
  attestServiceProbe: "0x" + selectorHex("attestServiceProbe(bytes32,uint32,uint8,uint64)"),
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
export const NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN_V2 =
  "PROTOCORE_NODE_REGISTRY_CLUSTER_FORM_V2\0" as const;
/**
 * Fixed byte width of the V2 charter argument: 10×u16 BE member shares
 * (member-declaration order: active 0..7, then standby 7..10) ‖ u16 BE
 * delegator share ‖ u64 BE consent expiry (ms).
 */
export const NODE_REGISTRY_CLUSTER_CHARTER_BYTES = 30;
/** Protocol floor for a charter's delegator share (Law §6.8). */
export const NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS = 2000;
/** Basis-point denominator a charter's member shares must sum to. */
export const NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS = 10000;
export const NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES = 128;
export const NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES = 64;

/**
 * Component H — consensus threshold for a live `updateCharter` amendment:
 * 7 of the 10 cluster members must consent (the same 7-of-10 quorum that
 * forms the cluster), and every signer must be CURRENTLY active. Bound
 * into the `updateCharterMessage` digest. Equal to
 * `NODE_REGISTRY_FORM_CLUSTER_THRESHOLD`.
 */
export const NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD = NODE_REGISTRY_FORM_CLUSTER_THRESHOLD;
/**
 * Domain separator for the `updateCharter` consent digest. Distinct from
 * the formCluster domains so a formation consent can never replay as an
 * amendment consent (or vice-versa). Note the trailing `\0` byte — it is
 * part of the hashed preimage. Mirrors mono-core
 * `cluster_form::UPDATE_CHARTER_DOMAIN`.
 */
export const NODE_REGISTRY_UPDATE_CHARTER_MESSAGE_DOMAIN =
  "PROTOCORE_NODE_REGISTRY_CLUSTER_UPDATE_CHARTER_V1\0" as const;
/**
 * Component H — delegator-protective cooldown for a live `updateCharter`
 * amendment, in epochs. A new charter does NOT apply immediately; it
 * becomes effective no earlier than `current_epoch + COOLDOWN`. The OLD
 * terms apply throughout so an ARK delegator can undelegate first. The
 * production value is 2 epochs (~24h notice); public-testnet builds
 * (`testnet-fast-epochs`) use 1. This SDK constant mirrors the production
 * value — read the on-chain `getPendingCharter` `effectiveEpoch` for the
 * exact landing epoch rather than computing it from this constant.
 */
export const NODE_REGISTRY_CHARTER_COOLDOWN_EPOCHS = 2;

/**
 * Component B — domain tag bound into the archive serve-challenge seed.
 * Mirrors mono-core `archive_challenge::ARCHIVE_CHALLENGE_DOMAIN`. No
 * trailing NUL (it is hashed verbatim).
 */
export const NODE_REGISTRY_ARCHIVE_CHALLENGE_DOMAIN = "monolythium.archive-challenge.v1" as const;
/**
 * Component B (BLOCKER-1) — domain tag bound into the protocol-issued
 * per-epoch challenge nonce so it can never collide with the challenge-seed
 * domain. Mirrors mono-core `archive_challenge::ARCHIVE_NONCE_DOMAIN`. No
 * trailing NUL (it is hashed verbatim).
 */
export const NODE_REGISTRY_ARCHIVE_NONCE_DOMAIN =
  "monolythium.archive-challenge.nonce.v1" as const;
/** Component B — domain byte prefixing a merkle leaf hash (`H(0x00 || leaf)`). */
export const NODE_REGISTRY_MERKLE_LEAF_DOMAIN = 0x00;
/** Component B — domain byte prefixing a merkle inner node (`H(0x01 || left || right)`). */
export const NODE_REGISTRY_MERKLE_INNER_DOMAIN = 0x01;
/** Component B — maximum merkle authentication-path length accepted on-chain. */
export const NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH = 40;
/**
 * Component B (BLOCKER-1) — minimum committed `leafCount` accepted by
 * `commitArchiveRoot`. A tree below this width is forgeable (a 1-leaf
 * self-commit has `root == leaf_hash` + an empty proof and passes every
 * challenge serving nothing), so the chain rejects it at commit time. This
 * SDK enforces it client-side before a nonce is burned. Mirrors mono-core
 * `archive_challenge::MIN_ARCHIVE_LEAF_COUNT`.
 */
export const NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT = 65536n;
/**
 * Component B (BLOCKER-1) — how many epochs back from the current epoch an
 * `answerArchiveChallenge` may target on-chain. Informational mirror of
 * mono-core `archive_challenge::CHALLENGE_EPOCH_WINDOW`; a future epoch is
 * always rejected and an epoch older than `current_epoch - window` reverts
 * with `EffectiveEpochInvalid`.
 */
export const NODE_REGISTRY_CHALLENGE_EPOCH_WINDOW = 2n;
/**
 * Component B (BLOCKER-1) — storage sub-kind byte for the per-epoch
 * protocol-issued challenge seed slot (`keccak256(0x32 || epoch_be64 ||
 * 0x03)`). Mirrors mono-core `archive_challenge::KIND_EPOCH_SEED`.
 */
export const NODE_REGISTRY_ARCHIVE_KIND_EPOCH_SEED = 0x03;

/**
 * Storage-slot tag byte for the archive-challenge family (registry
 * namespace, under `0x1005`). Mirrors mono-core
 * `archive_challenge::TAG_ARCHIVE_CHALLENGE`.
 */
export const NODE_REGISTRY_TAG_ARCHIVE_CHALLENGE = 0x32;
/**
 * Storage-slot tag byte for the ServiceScore-engine family (under
 * `0x1005`, shared with the attested-probe writer). Mirrors
 * `protocore_service_score::slots::TAG_SERVICE_SCORE` and node-registry
 * `storage::TAG_SCORE_SERVICE_PROBE`.
 */
export const NODE_REGISTRY_TAG_SERVICE_SCORE = 0x24;
/**
 * Storage-slot tag byte for the node-registry treasury/keys family (under
 * `0x1005`), which the probe-authority key slot lives under. Mirrors
 * node-registry `storage::TAG_TREASURY`.
 */
export const NODE_REGISTRY_TAG_TREASURY = 0x1f;
/**
 * Storage-slot tag byte for the per-cluster ACTIVE economics charter family
 * (under `0x1005`). Mirrors mono-core
 * `protocore_node_registry::cluster_anchor::TAG_CLUSTER_CHARTER`. The active
 * charter is written by the V2 `formCluster(bytes,bytes,bytes,bytes)` path
 * (and amended via `updateCharter` once the cooldown lands) and read by the
 * reward engine each block. Two sub-kind slots per cluster — see
 * {@link slotClusterCharterDelegator} / {@link slotClusterCharterMembers}.
 */
export const NODE_REGISTRY_TAG_CLUSTER_CHARTER = 0x31;
/**
 * Charter sub-kind `0x00` — the presence + delegator-share slot. The stored
 * value is a right-aligned `u64` equal to `delegatorShareBps + 1`; a zero
 * word means NO active charter (genesis clusters / 3-arg formCluster, which
 * fall back to the legacy default split). Mirrors
 * `SUBKIND_CHARTER_DELEGATOR_BPS`.
 */
export const NODE_REGISTRY_SUBKIND_CHARTER_DELEGATOR_BPS = 0x00;
/**
 * Charter sub-kind `0x01` — the packed member-shares slot. The stored value
 * is a single 32-byte word holding the 10×u16 BE member shares in its low
 * 20 bytes (offset 12..32). Mirrors `SUBKIND_CHARTER_MEMBER_SHARES`.
 */
export const NODE_REGISTRY_SUBKIND_CHARTER_MEMBER_SHARES = 0x01;

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

/** Decoded form of the 30-byte V2 cluster charter (Law §6.8). */
export interface ClusterCharterArgs {
  /**
   * Per-member operator-pot shares in basis points, member-declaration
   * order (active 0..7, then standby 7..10). Must sum to exactly
   * `NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS`.
   */
  memberShareBps: readonly number[];
  /**
   * Delegator share of the cluster pot in basis points, within
   * `[NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS, 10000]`.
   */
  delegatorShareBps: number;
  /** Consent expiry as a Unix timestamp in milliseconds. */
  expiresMs: bigint | number;
}

export interface FormClusterV2CalldataArgs extends FormClusterCalldataArgs {
  /** The 30-byte charter wire payload (see `encodeClusterCharter`). */
  charter: string | Uint8Array | readonly number[];
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

/** Args for `updateCharter(uint32,bytes,bytes,bytes)` (Component H). */
export interface UpdateCharterCalldataArgs {
  clusterId: bigint | number | string;
  /** The 30-byte charter wire payload (see `encodeClusterCharter`). */
  charter: string | Uint8Array | readonly number[];
  /**
   * The consenting operators' 1952-byte ML-DSA-65 consensus pubkeys, in
   * the same order as `signatures`. `7..=10` keys. May be supplied as a
   * single concatenated buffer or an array of per-signer keys.
   */
  signerPubkeys:
    | string
    | Uint8Array
    | readonly number[]
    | readonly (string | Uint8Array | readonly number[])[];
  /**
   * The 3309-byte ML-DSA-65 signatures over `updateCharterMessage`, 1:1
   * with `signerPubkeys`. May be a concatenated buffer or an array.
   */
  signatures:
    | string
    | Uint8Array
    | readonly number[]
    | readonly (string | Uint8Array | readonly number[])[];
}

/**
 * Decoded `getPendingCharter(uint32)` return (Component H). Zeroed /
 * `present=false` when no amendment is pending.
 */
export interface PendingCharterView {
  /** `true` iff a pending amendment is posted for the cluster. */
  present: boolean;
  /** Proposed delegator share of the cluster pot in basis points. */
  delegatorShareBps: number;
  /** Epoch at/after which the pending charter takes effect (the cooldown landing). */
  effectiveEpoch: bigint;
  /** Count of recorded active signers that consented to the pending charter. */
  signerCount: number;
  /**
   * The proposed per-member operator-pot shares in basis points,
   * member-declaration order (active 0..7, then standby 7..10). Empty when
   * `present` is `false`.
   */
  memberShareBps: readonly number[];
}

/**
 * Decoded ACTIVE cluster charter (Law §6.8), reconstructed from the two
 * `TAG_CLUSTER_CHARTER` (`0x31`) storage words SLOADed against the
 * node-registry account `0x1005`. `present=false` (with zeroed shares) when
 * the cluster has no active charter — genesis clusters and clusters formed
 * through the 3-arg `formCluster` selector, which fall back to the legacy
 * default split. The active charter carries no on-chain effective epoch (it
 * is the currently-effective record); the cooldown / `effectiveEpoch` lives
 * only on the {@link PendingCharterView}.
 */
export interface ActiveCharterView {
  /** `true` iff the cluster has an active on-chain charter record. */
  present: boolean;
  /** The active delegator share of the cluster pot in basis points. */
  delegatorShareBps: number;
  /**
   * The active per-member operator-pot shares in basis points,
   * member-declaration order (active 0..7, then standby 7..10). Empty when
   * `present` is `false`.
   */
  memberShareBps: readonly number[];
}

/** Args for `commitArchiveRoot(bytes32,uint16,bytes32,uint64)` (Component B). */
export interface CommitArchiveRootCalldataArgs {
  peerId: string | Uint8Array | readonly number[];
  shardIndex: number;
  /** The per-shard merkle root over the archived shard data (32 bytes). */
  shardRoot: string | Uint8Array | readonly number[];
  /** The committed leaf count (tree width); must be non-zero. */
  leafCount: bigint | number | string;
}

/**
 * Args for `answerArchiveChallenge(bytes32,uint16,uint64,bytes,bytes32[])`
 * (Component B).
 *
 * BLOCKER-1 (mono-core `service-rewards` d2ee4548): the caller-supplied
 * `roundCertDigest` and `nonce` were REMOVED. The challenge seed is now the
 * protocol-pinned per-epoch quorum-certificate digest (sloaded from
 * {@link slotEpochChallengeSeed}) and the nonce is derived from it
 * ({@link protocolNonceForEpoch}) — the operator can no longer choose the
 * challenge coordinate. Off-chain tooling derives the challenged leaf via
 * {@link deriveArchiveChallenge}, then submits the revealed leaf + proof.
 */
export interface AnswerArchiveChallengeCalldataArgs {
  peerId: string | Uint8Array | readonly number[];
  shardIndex: number;
  epoch: bigint | number | string;
  /** The revealed challenged leaf bytes. */
  leaf: string | Uint8Array | readonly number[];
  /** The bottom-up merkle authentication path (each element 32 bytes). */
  proof: readonly (string | Uint8Array | readonly number[])[];
}

/** A fully-deterministic archive serve-challenge (mirror of mono-core `ArchiveChallenge`). */
export interface ArchiveChallenge {
  /** The 32-byte op-hash of the operator under challenge (`0x` hex). */
  opHash: string;
  /** The shard whose committed root the answer must verify against. */
  shardIndex: number;
  /** The leaf the operator must reveal + prove, reduced modulo the committed leaf count. */
  leafIndex: bigint;
  /** The full 32-byte challenge seed (`0x` hex). */
  seed: string;
}

/** Args for `attestServiceProbe(bytes32,uint32,uint8,uint64)` (Component C). */
export interface AttestServiceProbeCalldataArgs {
  /** The operator's canonical op-hash (`BLAKE3(consensusPubkey)[..32]`, 32 bytes). */
  opHash: string | Uint8Array | readonly number[];
  /** Bitmask of public services to attest (must be a valid public-service mask). */
  serviceMask: number;
  /** Concrete probe status (`REACHABLE` / `DEGRADED` / `UNREACHABLE`). */
  status: number;
  /** Attestation epoch stamped into the score-domain slot. */
  epoch: bigint | number | string;
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
 * Encode the 30-byte V2 charter wire payload: 10×u16 BE member shares
 * ‖ u16 BE delegator share ‖ u64 BE consent expiry (ms).
 *
 * Performs the same structural validation as the on-chain
 * `decode_cluster_charter` (length, share sum, delegator floor band) so
 * a malformed charter fails client-side before a nonce is burned.
 * Byte-identical to the Rust SDK `encode_cluster_charter`.
 */
export function encodeClusterCharter(args: ClusterCharterArgs): Uint8Array {
  if (args.memberShareBps.length !== NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT) {
    throw new NodeRegistryError(
      `memberShareBps needs exactly ${NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT} entries, got ${args.memberShareBps.length}`,
    );
  }
  let sum = 0;
  for (const bps of args.memberShareBps) {
    if (!Number.isInteger(bps) || bps < 0 || bps > 0xffff) {
      throw new NodeRegistryError(`memberShareBps entries must be u16 integers, got ${bps}`);
    }
    sum += bps;
  }
  if (sum !== NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS) {
    throw new NodeRegistryError(
      `memberShareBps must sum to ${NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS}, got ${sum}`,
    );
  }
  if (
    !Number.isInteger(args.delegatorShareBps) ||
    args.delegatorShareBps < NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS ||
    args.delegatorShareBps > NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS
  ) {
    throw new NodeRegistryError(
      `delegatorShareBps must be within [${NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS}, ${NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS}], got ${args.delegatorShareBps}`,
    );
  }
  const expiresMs = typeof args.expiresMs === "bigint" ? args.expiresMs : BigInt(args.expiresMs);
  if (expiresMs < 0n || expiresMs > 0xffff_ffff_ffff_ffffn) {
    throw new NodeRegistryError(`expiresMs must fit in u64, got ${expiresMs}`);
  }
  const out = new Uint8Array(NODE_REGISTRY_CLUSTER_CHARTER_BYTES);
  for (let i = 0; i < NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT; i += 1) {
    out.set(u16BeBytes(args.memberShareBps[i]!), 2 * i);
  }
  out.set(u16BeBytes(args.delegatorShareBps), 20);
  out.set(u64BeBytes(expiresMs), 22);
  return out;
}

/**
 * V2 roster-consent digest — the V1 commitment plus the length-prefixed
 * charter bytes under the `..._CLUSTER_FORM_V2\0` domain. Economics +
 * consent expiry are INSIDE the signed message: no member can be bound
 * to terms they did not sign, and no V2 consent replays under different
 * terms (or under the V1 digest — the domains differ). Byte-identical
 * to mono-core's `form_cluster_message_v2`.
 */
export function formClusterMessageV2(
  activePubkeys: string | Uint8Array | readonly number[],
  standbyPubkeys: string | Uint8Array | readonly number[],
  charter: string | Uint8Array | readonly number[],
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
  const charterBytes = expectLength(
    toBytes(charter),
    NODE_REGISTRY_CLUSTER_CHARTER_BYTES,
    "charter",
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
      charterBytes,
    ),
  );
}

export function formClusterMessageV2Hex(
  activePubkeys: string | Uint8Array | readonly number[],
  standbyPubkeys: string | Uint8Array | readonly number[],
  charter: string | Uint8Array | readonly number[],
): string {
  return bytesToHex(formClusterMessageV2(activePubkeys, standbyPubkeys, charter));
}

/**
 * Encode `formCluster(bytes,bytes,bytes,bytes)` calldata — the V2
 * (charter) selector. Same layout discipline as
 * `encodeFormClusterCalldata` with a fourth dynamic `bytes` tail.
 * Byte-identical to the Rust SDK `encode_form_cluster_v2_calldata`.
 *
 * The 10 consent signatures must verify over `formClusterMessageV2`
 * (NOT the V1 digest).
 */
export function encodeFormClusterV2Calldata(args: FormClusterV2CalldataArgs): string {
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
  const charter = expectLength(
    toBytes(args.charter),
    NODE_REGISTRY_CLUSTER_CHARTER_BYTES,
    "charter",
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
      charterPadded,
    ),
  );
}

/**
 * Decode the 30-byte V2 charter wire payload into its terms.
 *
 * Inverse of {@link encodeClusterCharter}; applies the same structural
 * validation as the on-chain `decode_cluster_charter` (length, share sum,
 * delegator floor band). Used by {@link decodePendingCharter} and any UI
 * that renders an active charter read from chain.
 */
export function decodeClusterCharter(
  charter: string | Uint8Array | readonly number[],
): ClusterCharterArgs {
  const bytes = expectLength(toBytes(charter), NODE_REGISTRY_CLUSTER_CHARTER_BYTES, "charter");
  const memberShareBps: number[] = [];
  let sum = 0;
  for (let i = 0; i < NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT; i += 1) {
    const bps = (bytes[2 * i] << 8) | bytes[2 * i + 1];
    memberShareBps.push(bps);
    sum += bps;
  }
  if (sum !== NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS) {
    throw new NodeRegistryError(
      `memberShareBps must sum to ${NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS}, got ${sum}`,
    );
  }
  const delegatorShareBps = (bytes[20] << 8) | bytes[21];
  if (
    delegatorShareBps < NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS ||
    delegatorShareBps > NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS
  ) {
    throw new NodeRegistryError(
      `delegatorShareBps must be within [${NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS}, ${NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS}], got ${delegatorShareBps}`,
    );
  }
  let expiresMs = 0n;
  for (let i = 22; i < 30; i += 1) {
    expiresMs = (expiresMs << 8n) | BigInt(bytes[i]);
  }
  return { memberShareBps, delegatorShareBps, expiresMs };
}

/**
 * Build the `updateCharter` consent digest every signer must sign
 * (Component H). Binds the amendment to the exact `clusterId` and the
 * full 30-byte charter wire payload under the
 * `..._CLUSTER_UPDATE_CHARTER_V1\0` domain:
 *
 * `BLAKE3(DOMAIN ‖ clusterId_be32 ‖ UPDATE_CHARTER_THRESHOLD_be16 ‖
 *  charter.len_be32 ‖ charter)`.
 *
 * Byte-identical to mono-core's `cluster_form::update_charter_message` —
 * this is the value Monarch's signing flow hashes. There is no
 * blind-signing surface: the Rust derivation is the SSOT.
 */
export function updateCharterMessage(
  clusterId: bigint | number | string,
  charter: string | Uint8Array | readonly number[],
): Uint8Array {
  const id = toUint32(clusterId, "clusterId");
  const charterBytes = expectLength(toBytes(charter), NODE_REGISTRY_CLUSTER_CHARTER_BYTES, "charter");
  return blake3(
    concatBytes(
      new TextEncoder().encode(NODE_REGISTRY_UPDATE_CHARTER_MESSAGE_DOMAIN),
      u32BeBytes(id),
      u16BeBytes(NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD),
      u32BeBytes(charterBytes.length),
      charterBytes,
    ),
  );
}

export function updateCharterMessageHex(
  clusterId: bigint | number | string,
  charter: string | Uint8Array | readonly number[],
): string {
  return bytesToHex(updateCharterMessage(clusterId, charter));
}

/**
 * Encode `updateCharter(uint32,bytes,bytes,bytes)` calldata (Component H).
 *
 * Head: `clusterId` word + three dynamic-`bytes` offset words. Tails (in
 * order): the 30-byte charter, the concatenated 1952-byte signer pubkeys,
 * and the concatenated 3309-byte signatures. The signatures must verify
 * over {@link updateCharterMessage}. `signerPubkeys`/`signatures` accept
 * either a single concatenated buffer or an array of per-signer values
 * (`7..=10` entries, equal counts).
 */
export function encodeUpdateCharterCalldata(args: UpdateCharterCalldataArgs): string {
  const id = toUint32(args.clusterId, "clusterId");
  const charter = expectLength(
    toBytes(args.charter),
    NODE_REGISTRY_CLUSTER_CHARTER_BYTES,
    "charter",
  );
  const signerPubkeys = flattenFixedWidth(
    args.signerPubkeys,
    NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
    "signerPubkeys",
  );
  const signatures = flattenFixedWidth(
    args.signatures,
    NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES,
    "signatures",
  );
  const nPubkeys = signerPubkeys.length / NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES;
  const nSigs = signatures.length / NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES;
  if (nPubkeys !== nSigs) {
    throw new NodeRegistryError(
      `signerPubkeys (${nPubkeys}) and signatures (${nSigs}) counts must match`,
    );
  }
  if (nPubkeys < NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD || nPubkeys > NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT) {
    throw new NodeRegistryError(
      `signer count must be in [${NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD}, ${NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT}], got ${nPubkeys}`,
    );
  }
  const charterPadded = padToWord(charter);
  const signerPadded = padToWord(signerPubkeys);
  const sigsPadded = padToWord(signatures);
  // Head: clusterId word + 3 offset words = 4 words.
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
      sigsPadded,
    ),
  );
}

/** Encode `getPendingCharter(uint32)` view calldata (Component H). */
export function encodeGetPendingCharterCalldata(clusterId: bigint | number | string): string {
  return bytesToHex(
    concatBytes(hexToBytes(NODE_REGISTRY_SELECTORS.getPendingCharter), uint32Word(toUint32(clusterId, "clusterId"))),
  );
}

/**
 * Decode a `getPendingCharter(uint32)` return tuple (Component H).
 *
 * Wire return: head of 5 words `(bool present, uint16 delegatorShareBps,
 * uint64 effectiveEpoch, uint16 signerCount, uint64 bytesOffset)`, then a
 * `bytes` tail `(length word + one 32-byte packed-shares word)`. The
 * packed-shares word holds the 10×u16 BE member shares in its low 20
 * bytes (offset 12..32) — the same layout the on-chain encoder writes.
 */
export function decodePendingCharter(
  returnData: string | Uint8Array | readonly number[],
): PendingCharterView {
  const bytes = toBytes(returnData);
  if (bytes.length < 5 * 32) {
    throw new NodeRegistryError("getPendingCharter return shorter than the 5-word head");
  }
  const word = (i: number) => bytes.slice(i * 32, (i + 1) * 32);
  const present = numberFromWord(word(0), "present", 1) === 1;
  const delegatorShareBps = numberFromWord(word(1), "delegatorShareBps", 0xffff);
  const effectiveEpoch = u64FromWord(word(2));
  const signerCount = numberFromWord(word(3), "signerCount", 0xffff);
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
  const memberShareBps: number[] = [];
  for (let i = 0; i < NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT; i += 1) {
    const at = 12 + 2 * i;
    memberShareBps.push((packed[at] << 8) | packed[at + 1]);
  }
  return { present: true, delegatorShareBps, effectiveEpoch, signerCount, memberShareBps };
}

// --------------------------------------------------------------------
// Component B — archive serve-challenge.
// --------------------------------------------------------------------

/**
 * Encode `commitArchiveRoot(bytes32,uint16,bytes32,uint64)` calldata
 * (Component B). All four args are fixed-size — a flat 4-word head.
 *
 * BLOCKER-1: enforces the on-chain `MIN_ARCHIVE_LEAF_COUNT` floor
 * client-side — a `leafCount` below
 * {@link NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT} is rejected here so a
 * doomed commit never burns a nonce (the chain rejects it with
 * `ArchiveCommitmentTooFewLeaves`).
 */
export function encodeCommitArchiveRootCalldata(args: CommitArchiveRootCalldataArgs): string {
  const leafCount = toUint64(args.leafCount, "leafCount");
  if (leafCount < NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT) {
    throw new NodeRegistryError(
      `leafCount must be >= ${NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT} (MIN_ARCHIVE_LEAF_COUNT), got ${leafCount}`,
    );
  }
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.commitArchiveRoot),
      expectLength(toBytes(args.peerId), 32, "peerId"),
      uint16Word(args.shardIndex),
      expectLength(toBytes(args.shardRoot), 32, "shardRoot"),
      uint64Word(leafCount, "leafCount"),
    ),
  );
}

/**
 * Encode `answerArchiveChallenge(bytes32,uint16,uint64,bytes,bytes32[])`
 * calldata (Component B).
 *
 * BLOCKER-1 (mono-core `service-rewards` d2ee4548): the caller-supplied
 * `roundCertDigest` + `nonce` were removed. The challenge seed is the
 * protocol-pinned per-epoch quorum-certificate digest and the nonce is
 * derived from it on-chain, so the caller submits only `(peerId,
 * shardIndex, epoch, leaf, proof)`.
 *
 * Head: 5 words — three fixed args then the `bytes leaf` offset and the
 * `bytes32[] proof` offset. Tails: the leaf bytes, then the proof array
 * (length word + N × 32-byte sibling words).
 */
export function encodeAnswerArchiveChallengeCalldata(
  args: AnswerArchiveChallengeCalldataArgs,
): string {
  const leaf = toBytes(args.leaf);
  const proof = args.proof.map((p, i) => expectLength(toBytes(p), 32, `proof[${i}]`));
  if (proof.length > NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH) {
    throw new NodeRegistryError(
      `proof length must be <= ${NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH}, got ${proof.length}`,
    );
  }
  const leafPadded = padToWord(leaf);
  // Head: 5 words (3 fixed + leafOffset + proofOffset).
  const leafOffset = 5n * 32n;
  const proofOffset = leafOffset + 32n + BigInt(leafPadded.length);
  const proofTail = concatBytes(
    uint64Word(BigInt(proof.length), "proofLength"),
    ...proof,
  );
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.answerArchiveChallenge),
      expectLength(toBytes(args.peerId), 32, "peerId"),
      uint16Word(args.shardIndex),
      uint64Word(args.epoch, "epoch"),
      uint64Word(leafOffset, "leafOffset"),
      uint64Word(proofOffset, "proofOffset"),
      uint64Word(BigInt(leaf.length), "leafLength"),
      leafPadded,
      proofTail,
    ),
  );
}

/**
 * Slot holding the protocol-issued archive challenge seed pinned for
 * `epoch` (Component B, BLOCKER-1). `keccak256(0x32 || epoch_be64 ||
 * 0x03)`. The stored 32-byte value is the quorum-certificate digest the
 * protocol pins at the epoch boundary; a zero word means no seed pinned
 * (the epoch is un-answerable / fail-closed). Mirrors mono-core
 * `archive_challenge::slot_epoch_challenge_seed`.
 *
 * No RPC method exists for this read yet — derive the slot key and SLOAD
 * it via `eth_getStorageAt` / `lyth_getStorageAt` against the node-registry
 * account `0x1005`, then feed the returned word into
 * {@link deriveArchiveChallenge}.
 */
export function slotEpochChallengeSeed(epoch: bigint | number | string): string {
  const buf = new Uint8Array(1 + 8 + 1);
  buf[0] = NODE_REGISTRY_TAG_ARCHIVE_CHALLENGE;
  buf.set(u64BeBytes(toUint64(epoch, "epoch")), 1);
  buf[9] = NODE_REGISTRY_ARCHIVE_KIND_EPOCH_SEED;
  return bytesToHex(keccak_256(buf));
}

/**
 * Derive the protocol-issued challenge nonce for `epoch` from the pinned
 * challenge `seed` (Component B, BLOCKER-1). Mirrors mono-core
 * `archive_challenge::protocol_nonce_for_epoch`:
 *
 * `nonce = u64_be(BLAKE3(ARCHIVE_NONCE_DOMAIN ‖ epoch_be64 ‖ seed)[..8])`.
 *
 * The nonce is a pure function of the pinned (ungrindable) seed and the
 * epoch — there is exactly one valid `(epoch, nonce)` coordinate per epoch,
 * fixed by consensus state the operator does not control.
 */
export function protocolNonceForEpoch(
  seed: string | Uint8Array | readonly number[],
  epoch: bigint | number | string,
): bigint {
  const s = expectLength(toBytes(seed), 32, "seed");
  const e = toUint64(epoch, "epoch");
  const digest = blake3(
    concatBytes(new TextEncoder().encode(NODE_REGISTRY_ARCHIVE_NONCE_DOMAIN), u64BeBytes(e), s),
  );
  let n = 0n;
  for (let i = 0; i < 8; i += 1) {
    n = (n << 8n) | BigInt(digest[i]);
  }
  return n;
}

/**
 * Derive the deterministic archive serve-challenge for `(opHash,
 * shardIndex, epoch)` against a committed `leafCount`, using the
 * ON-CHAIN protocol-pinned `seed` (Component B, BLOCKER-1). Mirrors
 * mono-core `archive_challenge::derive_challenge` with the protocol nonce
 * derived internally via {@link protocolNonceForEpoch}:
 *
 * `nonce = protocolNonceForEpoch(seed, epoch)`;
 * `challengeSeed = BLAKE3(ARCHIVE_CHALLENGE_DOMAIN ‖ seed ‖ opHash ‖
 *  shardIndex_be16 ‖ epoch_be64 ‖ nonce_be64)`; the leaf index is the
 * challenge seed's first 8 bytes (BE u64) modulo `leafCount`.
 *
 * `seed` is NOT caller-chosen — it is the quorum-certificate digest the
 * protocol pins for `epoch`, read from {@link slotEpochChallengeSeed} via
 * `eth_getStorageAt`. Returns `null` when `leafCount === 0` (nothing
 * committed → nothing to challenge). Useful for off-chain tooling that
 * mirrors what an operator is about to be asked.
 */
export function deriveArchiveChallenge(
  seed: string | Uint8Array | readonly number[],
  opHash: string | Uint8Array | readonly number[],
  shardIndex: number,
  epoch: bigint | number | string,
  leafCount: bigint | number | string,
): ArchiveChallenge | null {
  const pinnedSeed = expectLength(toBytes(seed), 32, "seed");
  const op = expectLength(toBytes(opHash), 32, "opHash");
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
      u64BeBytes(nonce),
    ),
  );
  let idx = 0n;
  for (let i = 0; i < 8; i += 1) {
    idx = (idx << 8n) | BigInt(challengeSeed[i]);
  }
  return {
    opHash: bytesToHex(op),
    shardIndex: shard,
    leafIndex: idx % count,
    seed: bytesToHex(challengeSeed),
  };
}

/**
 * Hash one merkle leaf with Component B's domain separation:
 * `BLAKE3(0x00 || leaf)`. Mirrors mono-core `merkle_leaf_hash`.
 */
export function archiveMerkleLeafHash(leaf: string | Uint8Array | readonly number[]): Uint8Array {
  return blake3(concatBytes(Uint8Array.from([NODE_REGISTRY_MERKLE_LEAF_DOMAIN]), toBytes(leaf)));
}

/**
 * Hash an inner merkle node with Component B's domain separation:
 * `BLAKE3(0x01 || left || right)`. Mirrors mono-core `merkle_inner_hash`.
 */
export function archiveMerkleInnerHash(
  left: string | Uint8Array | readonly number[],
  right: string | Uint8Array | readonly number[],
): Uint8Array {
  return blake3(
    concatBytes(
      Uint8Array.from([NODE_REGISTRY_MERKLE_INNER_DOMAIN]),
      expectLength(toBytes(left), 32, "left"),
      expectLength(toBytes(right), 32, "right"),
    ),
  );
}

// --------------------------------------------------------------------
// Component C — attested service probe / probe authority.
// --------------------------------------------------------------------

/**
 * Encode `setProbeAuthority(address)` calldata (Component C,
 * foundation-multisig-gated). `address(0)` clears the dedicated authority
 * (attestation then authorises against the foundation multisig alone).
 */
export function encodeSetProbeAuthorityCalldata(
  probeAuthority: string | Uint8Array | readonly number[],
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.setProbeAuthority),
      addressWord(probeAuthority, "probeAuthority"),
    ),
  );
}

/** Encode `getProbeAuthority()` view calldata (Component C). */
export function encodeGetProbeAuthorityCalldata(): string {
  return NODE_REGISTRY_SELECTORS.getProbeAuthority;
}

/**
 * Decode a `getProbeAuthority()` return word into a `0x`-prefixed 20-byte
 * address (Component C). The zero address means no dedicated authority is
 * configured (the foundation multisig is the sole attestor).
 */
export function decodeProbeAuthority(
  returnData: string | Uint8Array | readonly number[],
): string {
  const bytes = expectLength(toBytes(returnData), 32, "probeAuthority");
  return bytesToHex(bytes.slice(12, 32));
}

/**
 * Encode `attestServiceProbe(bytes32,uint32,uint8,uint64)` calldata
 * (Component C, probe-authority/foundation-gated). Writes the
 * score-domain attested status for every service bit in `serviceMask`,
 * keyed by `opHash` and stamped with `epoch`. A flat 4-word head.
 */
export function encodeAttestServiceProbeCalldata(args: AttestServiceProbeCalldataArgs): string {
  if (!isValidPublicServiceProbeMask(args.serviceMask)) {
    throw new NodeRegistryError(
      `serviceMask 0x${args.serviceMask.toString(16).padStart(8, "0")} is not a valid public-service mask`,
    );
  }
  if (!isConcreteServiceProbeStatus(args.status)) {
    throw new NodeRegistryError(`status ${args.status} is not a concrete service-probe outcome`);
  }
  return bytesToHex(
    concatBytes(
      hexToBytes(NODE_REGISTRY_SELECTORS.attestServiceProbe),
      expectLength(toBytes(args.opHash), 32, "opHash"),
      uint32Word(args.serviceMask),
      uint8Word(args.status),
      uint64Word(args.epoch, "epoch"),
    ),
  );
}

// --------------------------------------------------------------------
// Storage-slot key derivation (no RPC method exists for service-score
// reads yet — derive the slot key and SLOAD via eth_getStorageAt /
// lyth_getStorageAt against the node-registry account 0x1005).
// --------------------------------------------------------------------

/**
 * Slot holding the settled per-cluster ServiceScore (Component A), read
 * each block by the reward path. `keccak256(0x24 || 0x00 ||
 * clusterId_be32)`. The value is a right-aligned `u64`; `0` ⇒ never
 * scored. Mirrors `protocore_service_score::slot_cluster_service_score`.
 */
export function slotClusterServiceScore(clusterId: bigint | number | string): string {
  return scoreSlotHex(0x00, u32BeBytes(toUint32(clusterId, "clusterId")));
}

/**
 * Slot holding the `(cluster, epoch)` archive-challenge pass flag
 * (Component B writes; Component A reads). `keccak256(0x24 || 0x01 ||
 * clusterId_be32 || epoch_be64)`. Mirrors
 * `protocore_service_score::slot_archive_challenge_pass` /
 * node-registry `slot_cluster_pass`.
 */
export function slotArchiveChallengePass(
  clusterId: bigint | number | string,
  epoch: bigint | number | string,
): string {
  return scoreSlotHex(
    0x01,
    concatBytes(u32BeBytes(toUint32(clusterId, "clusterId")), u64BeBytes(toUint64(epoch, "epoch"))),
  );
}

/**
 * Slot holding the attested probe status for `(opHash, serviceBit)`
 * (Component C writes; Component A reads). `keccak256(0x24 || 0x02 ||
 * opHash || serviceBit)`. `serviceBit` is the BIT INDEX (`SERVES_RPC`=0,
 * `SERVES_INDEXER`=1, `SERVES_ARCHIVE`=3, …) — NOT the capability mask
 * value. The stored word packs `(epoch << 8) | status` (see
 * {@link decodeScoreServiceProbe}). Mirrors
 * `protocore_service_score::slot_service_probe_status` /
 * node-registry `slot_score_service_probe`.
 */
export function slotScoreServiceProbe(
  opHash: string | Uint8Array | readonly number[],
  serviceBit: number,
): string {
  if (!Number.isInteger(serviceBit) || serviceBit < 0 || serviceBit > 0xff) {
    throw new NodeRegistryError("serviceBit must be a u8 bit index");
  }
  return scoreSlotHex(
    0x02,
    concatBytes(expectLength(toBytes(opHash), 32, "opHash"), Uint8Array.from([serviceBit])),
  );
}

/** The single bit index (`0..=15`) of a single-flag capability mask, or `null`. */
export function serviceMaskToBitIndex(mask: number): number | null {
  if (!Number.isInteger(mask) || mask <= 0 || (mask & (mask - 1)) !== 0) {
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

/**
 * Decode a `slotScoreServiceProbe` storage word — the packed
 * `(epoch << 8) | status` value. Returns the attestation epoch and the
 * status byte. A zero word means no attestation on file.
 */
export function decodeScoreServiceProbe(
  word: string | Uint8Array | readonly number[],
): { epoch: bigint; status: number } {
  const bytes = expectLength(toBytes(word), 32, "scoreServiceProbeWord");
  const status = bytes[31];
  let packed = 0n;
  for (const b of bytes) {
    packed = (packed << 8n) | BigInt(b);
  }
  return { epoch: packed >> 8n, status };
}

/**
 * Slot holding the rotatable probe-authority address (Component C).
 * `keccak256(TAG_TREASURY=0x1F || 32 zero bytes || 0x0A)`. Mirrors
 * node-registry `storage::slot_probe_authority`.
 */
export function slotProbeAuthority(): string {
  const buf = new Uint8Array(1 + 32 + 1);
  buf[0] = NODE_REGISTRY_TAG_TREASURY;
  buf[33] = 0x0a;
  return bytesToHex(keccak_256(buf));
}

/**
 * Slot for one sub-kind of a cluster's ACTIVE charter record (Law §6.8).
 * `keccak256(0x31 || clusterId_be32 || subkind)`. Mirrors mono-core
 * `cluster_anchor::slot_cluster_charter`.
 *
 * No RPC method exists for the active charter — derive the slot key and
 * SLOAD it via `eth_getStorageAt` / `lyth_getStorageAt` against the
 * node-registry account `0x1005`, then feed both words into
 * {@link decodeActiveCharter}. See {@link slotClusterCharterDelegator} and
 * {@link slotClusterCharterMembers} for the two concrete sub-kinds.
 */
export function slotClusterCharter(
  clusterId: bigint | number | string,
  subkind: number,
): string {
  if (!Number.isInteger(subkind) || subkind < 0 || subkind > 0xff) {
    throw new NodeRegistryError("charter subkind must be a u8");
  }
  const buf = new Uint8Array(1 + 4 + 1);
  buf[0] = NODE_REGISTRY_TAG_CLUSTER_CHARTER;
  buf.set(u32BeBytes(toUint32(clusterId, "clusterId")), 1);
  buf[5] = subkind;
  return bytesToHex(keccak_256(buf));
}

/**
 * Slot holding the active charter's presence + delegator share
 * (sub-kind `0x00`). The stored word is a right-aligned `u64` equal to
 * `delegatorShareBps + 1`; a zero word means NO active charter.
 */
export function slotClusterCharterDelegator(clusterId: bigint | number | string): string {
  return slotClusterCharter(clusterId, NODE_REGISTRY_SUBKIND_CHARTER_DELEGATOR_BPS);
}

/**
 * Slot holding the active charter's packed member shares (sub-kind `0x01`).
 * The stored word holds the 10×u16 BE member shares in its low 20 bytes
 * (offset 12..32).
 */
export function slotClusterCharterMembers(clusterId: bigint | number | string): string {
  return slotClusterCharter(clusterId, NODE_REGISTRY_SUBKIND_CHARTER_MEMBER_SHARES);
}

/**
 * Decode the two ACTIVE-charter storage words into an {@link ActiveCharterView}.
 *
 * `delegatorWord` is the sub-kind `0x00` presence word
 * ({@link slotClusterCharterDelegator}); `membersWord` is the sub-kind
 * `0x01` packed-shares word ({@link slotClusterCharterMembers}). When the
 * presence word is zero the cluster has no active charter and `present` is
 * `false` (zeroed shares). Mirrors mono-core
 * `cluster_anchor::load_cluster_charter_*`: the presence word decodes as
 * `delegatorShareBps = word - 1` (saturating), and the members word packs
 * the 10×u16 BE shares at byte offset 12.
 */
export function decodeActiveCharter(
  delegatorWord: string | Uint8Array | readonly number[],
  membersWord: string | Uint8Array | readonly number[],
): ActiveCharterView {
  const presence = expectLength(toBytes(delegatorWord), 32, "charterDelegatorWord");
  let raw = 0n;
  for (const b of presence) {
    raw = (raw << 8n) | BigInt(b);
  }
  if (raw === 0n) {
    return { present: false, delegatorShareBps: 0, memberShareBps: [] };
  }
  const delegatorShareBps = Number(raw - 1n > 0xffffn ? 0xffffn : raw - 1n);
  const packed = expectLength(toBytes(membersWord), 32, "charterMembersWord");
  const memberShareBps: number[] = [];
  for (let i = 0; i < NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT; i += 1) {
    const at = 12 + 2 * i;
    memberShareBps.push((packed[at] << 8) | packed[at + 1]);
  }
  return { present: true, delegatorShareBps, memberShareBps };
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

function expectUint16(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new NodeRegistryError(`${name} must be a uint16`);
  }
  return value;
}

function uint16Word(value: number): Uint8Array {
  const out = new Uint8Array(32);
  out.set(u16BeBytes(value), 30);
  return out;
}

function addressWord(value: string | Uint8Array | readonly number[], name: string): Uint8Array {
  const addr = expectLength(toBytes(value), 20, name);
  const out = new Uint8Array(32);
  out.set(addr, 12);
  return out;
}

/**
 * Flatten a fixed-width-element argument that may be supplied either as a
 * single concatenated buffer or an array of per-element values. Validates
 * that the total length is a non-zero multiple of `width`.
 */
function flattenFixedWidth(
  value:
    | string
    | Uint8Array
    | readonly number[]
    | readonly (string | Uint8Array | readonly number[])[],
  width: number,
  name: string,
): Uint8Array {
  let flat: Uint8Array;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] !== "number") {
    const parts = (value as readonly (string | Uint8Array | readonly number[])[]).map((v, i) =>
      expectLength(toBytes(v), width, `${name}[${i}]`),
    );
    flat = concatBytes(...parts);
  } else {
    flat = toBytes(value as string | Uint8Array | readonly number[]);
  }
  if (flat.length === 0 || flat.length % width !== 0) {
    throw new NodeRegistryError(`${name} must be a non-empty multiple of ${width} bytes, got ${flat.length}`);
  }
  return flat;
}

/** Build a ServiceScore-family slot key: `keccak256(0x24 || kind || tail)`. */
function scoreSlotHex(kind: number, tail: Uint8Array): string {
  return bytesToHex(
    keccak_256(concatBytes(Uint8Array.from([NODE_REGISTRY_TAG_SERVICE_SCORE, kind]), tail)),
  );
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
