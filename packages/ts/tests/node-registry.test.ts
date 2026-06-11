import { blake3 } from "@noble/hashes/blake3.js";
import { describe, expect, it } from "vitest";
import {
  NODE_REGISTRY_BLS_PUBKEY_BYTES,
  NODE_REGISTRY_CAPABILITIES,
  NODE_REGISTRY_CLUSTER_CHARTER_BYTES,
  NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS,
  NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS,
  NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES,
  NODE_REGISTRY_CONSENSUS_POP_BYTES,
  NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
  NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES,
  NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES,
  NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS,
  NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS,
  NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES,
  NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT,
  NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT,
  NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN_V2,
  NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT,
  NODE_REGISTRY_FORM_CLUSTER_THRESHOLD,
  NODE_REGISTRY_LEGACY_CLUSTER_MEMBER_PUBKEY_BYTES,
  NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES,
  NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES,
  NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES,
  NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID,
  NODE_REGISTRY_PUBLIC_SERVICE_MASK,
  NODE_REGISTRY_SELECTORS,
  NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD,
  NODE_REGISTRY_UPDATE_CHARTER_MESSAGE_DOMAIN,
  NODE_REGISTRY_CHARTER_COOLDOWN_EPOCHS,
  NODE_REGISTRY_ARCHIVE_CHALLENGE_DOMAIN,
  NODE_REGISTRY_ARCHIVE_NONCE_DOMAIN,
  NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH,
  NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT,
  NODE_REGISTRY_CHALLENGE_EPOCH_WINDOW,
  NODE_REGISTRY_ARCHIVE_KIND_EPOCH_SEED,
  NODE_REGISTRY_TAG_ARCHIVE_CHALLENGE,
  NODE_REGISTRY_TAG_SERVICE_SCORE,
  NODE_REGISTRY_TAG_TREASURY,
  PENDING_CHANGE_KIND_CODES,
  SERVICE_PROBE_STATUS,
  archiveMerkleLeafHash,
  decodeClusterCharter,
  decodeClusterDiversity,
  decodeClusterFormedEvent,
  decodeClusterJoinRequest,
  decodeOperatorNetworkMetadata,
  decodeOperatorSealKey,
  decodePendingCharter,
  decodeProbeAuthority,
  decodeScoreServiceProbe,
  deriveArchiveChallenge,
  deriveClusterAnchorAddress,
  encodeAnswerArchiveChallengeCalldata,
  encodeAttestDkgReshareCalldata,
  encodeAttestServiceProbeCalldata,
  encodeCancelClusterJoinCalldata,
  encodeCancelPendingChangeCalldata,
  encodeClusterCharter,
  encodeCommitArchiveRootCalldata,
  encodeExpireClusterJoinCalldata,
  encodeFormClusterCalldata,
  encodeFormClusterV2Calldata,
  encodeGetClusterJoinRequestCalldata,
  encodeGetOperatorSealKeyCalldata,
  encodeGetPendingCharterCalldata,
  encodeGetProbeAuthorityCalldata,
  encodePublishOperatorSealKeyCalldata,
  encodeRecoverOperatorNodeCalldata,
  encodeReportServiceProbeCalldata,
  encodeRequestClusterJoinCalldata,
  encodeSetOperatorDisplayCalldata,
  encodeSetProbeAuthorityCalldata,
  encodeSubmitPendingChangeCalldata,
  encodeUpdateCharterCalldata,
  encodeVoteClusterAdmitCalldata,
  formClusterMessageHex,
  formClusterMessageV2Hex,
  isConcreteServiceProbeStatus,
  isSinglePublicServiceProbeMask,
  isValidPublicServiceProbeMask,
  normalizePendingChangeKind,
  nodeHostingClassFromByte,
  nodeRegistryAddressHex,
  parseDkgResharePublicKeys,
  protocolNonceForEpoch,
  serviceMaskToBitIndex,
  serviceProbeStatusLabel,
  slotArchiveChallengePass,
  slotClusterServiceScore,
  slotEpochChallengeSeed,
  slotProbeAuthority,
  slotScoreServiceProbe,
  updateCharterMessageHex,
} from "../src/index.js";

describe("node-registry helpers", () => {
  it("exports public-service masks pinned to mono-core", () => {
    expect(NODE_REGISTRY_CAPABILITIES.SERVES_RPC).toBe(0x0000_0001);
    expect(NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API).toBe(0x0000_0100);
    expect(NODE_REGISTRY_PUBLIC_SERVICE_MASK).toBe(0x0000_011b);
    expect(nodeRegistryAddressHex()).toBe("0x0000000000000000000000000000000000001005");
    expect(NODE_REGISTRY_CLUSTER_MEMBER_REF_BYTES).toBe(48);
    expect(NODE_REGISTRY_BLS_PUBKEY_BYTES).toBe(48);
    expect(NODE_REGISTRY_LEGACY_CLUSTER_MEMBER_PUBKEY_BYTES).toBe(48);
    expect(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).toBe(1952);
    expect(NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES).toBe(3309);
    expect(NODE_REGISTRY_CONSENSUS_POP_BYTES).toBe(3309);
    expect(NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES).toBe(1184);
    expect(NODE_REGISTRY_DKG_ATTESTATION_SIG_BYTES).toBe(96);
    expect(NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES).toBe(96);
    expect(NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS).toBe(5);
    expect(NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS).toBe(7);
    expect(NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID).toBe((1n << 56n) - 1n);
    expect(NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES).toBe(128);
    expect(NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES).toBe(64);
    expect(NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT).toBe(7);
    expect(NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT).toBe(3);
    expect(NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT).toBe(10);
    expect(NODE_REGISTRY_FORM_CLUSTER_THRESHOLD).toBe(7);
    expect(PENDING_CHANGE_KIND_CODES).toEqual({ add: 1, remove: 2, rotate: 3 });
  });

  it("pins node-registry lifecycle selectors", () => {
    expect(NODE_REGISTRY_SELECTORS.recoverOperatorNode).toBe("0xe58729e6");
    expect(NODE_REGISTRY_SELECTORS.submitPendingChange).toBe("0x7d09426c");
    expect(NODE_REGISTRY_SELECTORS.cancelPendingChange).toBe("0xdca5b10e");
    expect(NODE_REGISTRY_SELECTORS.attestDkgReshare).toBe("0x36e34030");
    expect(NODE_REGISTRY_SELECTORS.requestClusterJoin).toBe("0xe1dd13bd");
    expect(NODE_REGISTRY_SELECTORS.voteClusterAdmit).toBe("0x20519d4f");
    expect(NODE_REGISTRY_SELECTORS.cancelClusterJoin).toBe("0x3e2d51c3");
    expect(NODE_REGISTRY_SELECTORS.expireClusterJoin).toBe("0xeeb96895");
    expect(NODE_REGISTRY_SELECTORS.getClusterJoinRequest).toBe("0x224de9bf");
    expect(NODE_REGISTRY_SELECTORS.formCluster).toBe("0x961a4ced");
    expect(NODE_REGISTRY_SELECTORS.setOperatorDisplay).toBe("0x7a2ac986");
    expect(NODE_REGISTRY_SELECTORS.publishOperatorSealKey).toBe("0x0490b9a8");
    expect(NODE_REGISTRY_SELECTORS.getOperatorSealKey).toBe("0xfcbb69a6");
  });

  it("validates public-service probe masks and concrete statuses", () => {
    expect(isSinglePublicServiceProbeMask(NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API)).toBe(true);
    expect(
      isSinglePublicServiceProbeMask(
        NODE_REGISTRY_CAPABILITIES.SERVES_RPC | NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API,
      ),
    ).toBe(false);
    expect(
      isValidPublicServiceProbeMask(
        NODE_REGISTRY_CAPABILITIES.SERVES_RPC | NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API,
      ),
    ).toBe(true);
    expect(isValidPublicServiceProbeMask(NODE_REGISTRY_CAPABILITIES.SERVES_BROADCASTER)).toBe(false);
    expect(isConcreteServiceProbeStatus(SERVICE_PROBE_STATUS.REACHABLE)).toBe(true);
    expect(isConcreteServiceProbeStatus(SERVICE_PROBE_STATUS.UNKNOWN)).toBe(false);
    expect(serviceProbeStatusLabel(SERVICE_PROBE_STATUS.DEGRADED)).toBe("degraded");
  });

  it("encodes reportServiceProbe calldata using mono-core selector and ABI layout", () => {
    const peerId = `0x${"12".repeat(32)}`;
    const digest = `0x${"34".repeat(32)}`;
    const calldata = encodeReportServiceProbeCalldata({
      peerId,
      serviceMask: NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API,
      status: SERVICE_PROBE_STATUS.REACHABLE,
      latencyMs: 42,
      probeDigest: digest,
    });

    expect(calldata.startsWith(NODE_REGISTRY_SELECTORS.reportServiceProbe)).toBe(true);
    expect((calldata.length - 2) / 2).toBe(4 + 5 * 32);
    expect(calldata.slice(10, 74)).toBe("12".repeat(32));
    expect(calldata.slice(74, 138)).toBe("0".repeat(60) + "0100");
    expect(calldata.slice(138, 202)).toBe("0".repeat(63) + "1");
    expect(calldata.slice(202, 266)).toBe("0".repeat(60) + "002a");
    expect(calldata.slice(266)).toBe("34".repeat(32));
  });

  it("encodes recoverOperatorNode calldata", () => {
    const peerId = `0x${"a5".repeat(32)}`;
    const calldata = encodeRecoverOperatorNodeCalldata(peerId);
    expect(calldata).toBe(`${NODE_REGISTRY_SELECTORS.recoverOperatorNode}${"a5".repeat(32)}`);
    expect((calldata.length - 2) / 2).toBe(4 + 32);
  });

  it("encodes and decodes operator LythiumSeal EK calldata", () => {
    const peerId = `0x${"a5".repeat(32)}`;
    const sealEk = new Uint8Array(NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES).fill(0x42);
    const publish = hexBytes(encodePublishOperatorSealKeyCalldata({ peerId, sealEk }));

    expect(publish.slice(0, 4)).toEqual(hexBytes(NODE_REGISTRY_SELECTORS.publishOperatorSealKey));
    expect(publish.length).toBe(4 + 2 * 32 + 32 + NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES);
    expect(publish.slice(4, 36)).toEqual(new Uint8Array(32).fill(0xa5));
    expect(publish[67]).toBe(0x40);
    expect(wordBigint(publish.slice(68, 100))).toBe(
      BigInt(NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES),
    );
    expect(publish.slice(100)).toEqual(sealEk);

    const get = hexBytes(encodeGetOperatorSealKeyCalldata({ operatorId: `0x${"11".repeat(32)}` }));
    expect(get.slice(0, 4)).toEqual(hexBytes(NODE_REGISTRY_SELECTORS.getOperatorSealKey));
    expect(get.length).toBe(4 + 32);
    expect(get.slice(4)).toEqual(new Uint8Array(32).fill(0x11));

    const sealEkResult = concatTestBytes(
      u256Word(32n),
      u256Word(BigInt(NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES)),
      sealEk,
    );
    expect(decodeOperatorSealKey(sealEkResult)).toBe(
      `0x${"42".repeat(NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES)}`,
    );
    expect(decodeOperatorSealKey(sealEk)).toBe(
      `0x${"42".repeat(NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES)}`,
    );
    expect(() =>
      encodePublishOperatorSealKeyCalldata({
        peerId,
        sealEk: new Uint8Array(NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES),
      }),
    ).toThrow(/all-zero/u);
    expect(() => decodeOperatorSealKey(new Uint8Array(NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES))).toThrow(
      /all-zero/u,
    );
  });

  it("encodes submitPendingChange calldata for rotate intents", () => {
    const targetPubkey = `0x${"ab".repeat(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES)}`;
    const calldata = encodeSubmitPendingChangeCalldata({
      kind: "rotate",
      targetPubkey,
      effectiveEpoch: 42n,
      intentId: 7n,
    });
    const bytes = hexBytes(calldata);
    expect(calldata.startsWith(NODE_REGISTRY_SELECTORS.submitPendingChange)).toBe(true);
    expect(bytes.length).toBe(4 + 4 * 32 + 32 + NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES);
    expect(bytes[35]).toBe(3);
    expect(bytes[67]).toBe(0x80);
    expect(bytes[99]).toBe(42);
    expect(bytes[131]).toBe(7);
    expect(wordBigint(bytes.slice(132, 164))).toBe(BigInt(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES));
    expect(bytes.slice(164, 164 + NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES)).toEqual(
      new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0xab),
    );
    expect(normalizePendingChangeKind(1)).toEqual({ kind: "add", kindCode: 1 });
  });

  it("encodes cancelPendingChange calldata", () => {
    const targetPubkey = `0x${"bc".repeat(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES)}`;
    const calldata = encodeCancelPendingChangeCalldata({
      epoch: "99",
      targetPubkey,
    });
    const bytes = hexBytes(calldata);
    expect(calldata.startsWith(NODE_REGISTRY_SELECTORS.cancelPendingChange)).toBe(true);
    expect(bytes.length).toBe(4 + 2 * 32 + 32 + NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES);
    expect(bytes[35]).toBe(99);
    expect(bytes[67]).toBe(0x40);
    expect(wordBigint(bytes.slice(68, 100))).toBe(BigInt(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES));
    expect(bytes.slice(100, 100 + NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES)).toEqual(
      new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0xbc),
    );
  });

  it("encodes attestDkgReshare calldata with bounded signers", () => {
    const keys = Array.from({ length: 5 }, (_, i) =>
      new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x10 + i),
    );
    const consensusPublicKeys = concatTestBytes(...keys);
    const thresholdSig = new Uint8Array(96).fill(0xee);
    const calldata = encodeAttestDkgReshareCalldata({
      intentId: 7n,
      consensusPublicKeys,
      thresholdSig,
    });
    const bytes = hexBytes(calldata);
    const keysLen = 5 * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES;
    expect(calldata.startsWith(NODE_REGISTRY_SELECTORS.attestDkgReshare)).toBe(true);
    expect(bytes.length).toBe(4 + 3 * 32 + 32 + keysLen + 32 + 96);
    expect(bytes[35]).toBe(7);
    expect(bytes[67]).toBe(0x60);
    expect(wordBigint(bytes.slice(68, 100))).toBe(3n * 32n + 32n + BigInt(keysLen));
    expect(wordBigint(bytes.slice(100, 132))).toBe(BigInt(keysLen));
    expect(parseDkgResharePublicKeys(consensusPublicKeys)).toHaveLength(5);
    expect(
      encodeAttestDkgReshareCalldata({
        intentId: 7n,
        blsPublicKeys: consensusPublicKeys,
        thresholdSig,
      }),
    ).toBe(calldata);
  });

  it("encodes CJ-1 cluster-join calldata and decodes request status", () => {
    const operatorPubkey = new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x44);
    const voterPubkey = new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x55);
    const operatorId = `0x${"11".repeat(32)}`;

    const request = hexBytes(
      encodeRequestClusterJoinCalldata({ clusterId: 7, operatorPubkey }),
    );
    expect(request.slice(0, 4)).toEqual(hexBytes(NODE_REGISTRY_SELECTORS.requestClusterJoin));
    expect(request.length).toBe(4 + 2 * 32 + 32 + NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES);
    expect(request[35]).toBe(7);
    expect(request[67]).toBe(0x40);
    expect(wordBigint(request.slice(68, 100))).toBe(
      BigInt(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES),
    );

    const vote = hexBytes(
      encodeVoteClusterAdmitCalldata({ clusterId: 7, operatorId, voterPubkey }),
    );
    expect(vote.slice(0, 4)).toEqual(hexBytes(NODE_REGISTRY_SELECTORS.voteClusterAdmit));
    expect(vote.length).toBe(4 + 3 * 32 + 32 + NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES);
    expect(vote.slice(36, 68)).toEqual(new Uint8Array(32).fill(0x11));
    expect(vote[99]).toBe(0x60);

    expect(hexBytes(encodeCancelClusterJoinCalldata({ clusterId: 7, operatorId })).length).toBe(
      4 + 2 * 32,
    );
    expect(hexBytes(encodeExpireClusterJoinCalldata({ clusterId: 7, operatorId })).length).toBe(
      4 + 2 * 32,
    );
    expect(
      hexBytes(encodeGetClusterJoinRequestCalldata({ clusterId: 7, operatorId })).length,
    ).toBe(4 + 2 * 32);

    const view = new Uint8Array(8 * 32);
    view.set(new Uint8Array(20).fill(0xaa), 12);
    setWordU64(view, 1, 123n);
    setWordU64(view, 2, 7n);
    setWordU64(view, 3, 10n);
    setWordU64(view, 4, 6n);
    setWordU64(view, 5, 1n);
    setWordU64(view, 6, 5_000_000_000_000n);
    setWordU64(view, 7, 1n);
    expect(decodeClusterJoinRequest(view)).toEqual({
      owner: `0x${"aa".repeat(20)}`,
      requestEpoch: 123n,
      snapshotThreshold: 7,
      snapshotN: 10,
      voteCount: 6,
      statusCode: 1,
      status: "open",
      bondLythoshi: 5_000_000_000_000n,
      sealRosterPending: true,
    });
  });

  it("encodes setOperatorDisplay calldata with bounded UTF-8 strings", () => {
    const peerId = `0x${"66".repeat(32)}`;
    const calldata = encodeSetOperatorDisplayCalldata({
      peerId,
      moniker: "Monolythium Foundation",
      alias: "foundation-01",
    });
    const bytes = hexBytes(calldata);
    const moniker = new TextEncoder().encode("Monolythium Foundation");
    const alias = new TextEncoder().encode("foundation-01");

    expect(calldata.startsWith(NODE_REGISTRY_SELECTORS.setOperatorDisplay)).toBe(true);
    expect(bytes.slice(4, 36)).toEqual(new Uint8Array(32).fill(0x66));
    expect(wordBigint(bytes.slice(36, 68))).toBe(96n);
    expect(wordBigint(bytes.slice(68, 100))).toBe(160n);
    expect(wordBigint(bytes.slice(100, 132))).toBe(BigInt(moniker.length));
    expect(bytes.slice(132, 132 + moniker.length)).toEqual(moniker);
    expect(wordBigint(bytes.slice(164, 196))).toBe(BigInt(alias.length));
    expect(bytes.slice(196, 196 + alias.length)).toEqual(alias);

    expect(() =>
      encodeSetOperatorDisplayCalldata({
        peerId,
        moniker: "line\nbreak",
        alias: "foundation-01",
      }),
    ).toThrow(/control characters/);
    expect(() =>
      encodeSetOperatorDisplayCalldata({
        peerId,
        moniker: "ok",
        alias: "a".repeat(NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES + 1),
      }),
    ).toThrow(/alias must be <= 64 UTF-8 bytes/);
  });

  it("encodes formCluster calldata and derives the roster consent message", () => {
    const activePubkeys = concatTestBytes(
      ...Array.from({ length: NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT }, (_, i) =>
        new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x20 + i),
      ),
    );
    const standbyPubkeys = concatTestBytes(
      ...Array.from({ length: NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT }, (_, i) =>
        new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x40 + i),
      ),
    );
    const signatures = concatTestBytes(
      ...Array.from({ length: NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT }, (_, i) =>
        new Uint8Array(NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES).fill(0x80 + i),
      ),
    );

    const calldata = encodeFormClusterCalldata({
      activePubkeys,
      standbyPubkeys,
      signatures,
    });
    const bytes = hexBytes(calldata);
    const activeLen = NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES;
    const standbyLen =
      NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES;
    const signatureLen =
      NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT * NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES;
    const signaturePaddedLen = Math.ceil(signatureLen / 32) * 32;
    const activeOffset = 3n * 32n;
    const standbyOffset = activeOffset + 32n + BigInt(activeLen);
    const signaturesOffset = standbyOffset + 32n + BigInt(standbyLen);

    expect(bytes.slice(0, 4)).toEqual(hexBytes(NODE_REGISTRY_SELECTORS.formCluster));
    expect(bytes.length).toBe(
      4 + 3 * 32 + 32 + activeLen + 32 + standbyLen + 32 + signaturePaddedLen,
    );
    expect(wordBigint(bytes.slice(4, 36))).toBe(activeOffset);
    expect(wordBigint(bytes.slice(36, 68))).toBe(standbyOffset);
    expect(wordBigint(bytes.slice(68, 100))).toBe(signaturesOffset);
    expect(wordBigint(bytes.slice(100, 132))).toBe(BigInt(activeLen));
    expect(bytes.slice(132, 132 + activeLen)).toEqual(activePubkeys);

    const standbyLengthWordOffset = 132 + activeLen;
    expect(wordBigint(bytes.slice(standbyLengthWordOffset, standbyLengthWordOffset + 32))).toBe(
      BigInt(standbyLen),
    );
    const signaturesLengthWordOffset = standbyLengthWordOffset + 32 + standbyLen;
    expect(
      wordBigint(bytes.slice(signaturesLengthWordOffset, signaturesLengthWordOffset + 32)),
    ).toBe(BigInt(signatureLen));

    const message = formClusterMessageHex(activePubkeys, standbyPubkeys);
    expect(message).toMatch(/^0x[0-9a-f]{64}$/u);
    const changed = new Uint8Array(activePubkeys);
    changed[0] ^= 0x01;
    expect(formClusterMessageHex(changed, standbyPubkeys)).not.toBe(message);
    expect(() =>
      encodeFormClusterCalldata({
        activePubkeys: activePubkeys.slice(1),
        standbyPubkeys,
        signatures,
      }),
    ).toThrow(/activePubkeys/);
  });

  it("encodes the V2 cluster charter and validates its terms", () => {
    expect(NODE_REGISTRY_CLUSTER_CHARTER_BYTES).toBe(30);
    expect(NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS).toBe(2000);
    expect(NODE_REGISTRY_CLUSTER_CHARTER_SHARE_DENOM_BPS).toBe(10000);
    expect(NODE_REGISTRY_FORM_CLUSTER_MESSAGE_DOMAIN_V2).toBe(
      "PROTOCORE_NODE_REGISTRY_CLUSTER_FORM_V2\0",
    );

    const memberShareBps = [1500, 1500, 1000, 1000, 1000, 1000, 1000, 800, 700, 500];
    const charter = encodeClusterCharter({
      memberShareBps,
      delegatorShareBps: 3000,
      expiresMs: 1_999_999_999_000n,
    });
    // Byte-parity vector pinned from the Rust SDK `encode_cluster_charter`
    // (protocore-sdk, 2026-06-11).
    expect(Array.from(charter)).toEqual(
      Array.from(hexBytes("0x05dc05dc03e803e803e803e803e8032002bc01f40bb8000001d1a94a1c18")),
    );

    // Validation mirrors the on-chain decode.
    expect(() =>
      encodeClusterCharter({
        memberShareBps: [...memberShareBps.slice(0, 9), 501],
        delegatorShareBps: 3000,
        expiresMs: 0,
      }),
    ).toThrow(/sum/u);
    expect(() =>
      encodeClusterCharter({
        memberShareBps,
        delegatorShareBps: NODE_REGISTRY_CLUSTER_CHARTER_DELEGATOR_FLOOR_BPS - 1,
        expiresMs: 0,
      }),
    ).toThrow(/delegatorShareBps/u);
    expect(() =>
      encodeClusterCharter({
        memberShareBps: memberShareBps.slice(1),
        delegatorShareBps: 3000,
        expiresMs: 0,
      }),
    ).toThrow(/entries/u);
  });

  it("encodes formCluster V2 calldata byte-identical to the Rust SDK", () => {
    // Same deterministic fixture as the Rust-side vector test: active
    // key i filled with 0x20+i, standby key j filled with 0x40+j,
    // signature k filled with 0x80+k.
    const activePubkeys = concatTestBytes(
      ...Array.from({ length: NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT }, (_, i) =>
        new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x20 + i),
      ),
    );
    const standbyPubkeys = concatTestBytes(
      ...Array.from({ length: NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT }, (_, i) =>
        new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x40 + i),
      ),
    );
    const signatures = concatTestBytes(
      ...Array.from({ length: NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT }, (_, i) =>
        new Uint8Array(NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES).fill(0x80 + i),
      ),
    );
    const charter = encodeClusterCharter({
      memberShareBps: [1500, 1500, 1000, 1000, 1000, 1000, 1000, 800, 700, 500],
      delegatorShareBps: 3000,
      expiresMs: 1_999_999_999_000n,
    });

    // Selector pinned from mono-core's `abi::selectors().form_cluster_v2`.
    expect(NODE_REGISTRY_SELECTORS.formClusterV2).toBe("0xdc4cc1cc");

    const calldata = encodeFormClusterV2Calldata({
      activePubkeys,
      standbyPubkeys,
      signatures,
      charter,
    });
    const bytes = hexBytes(calldata);

    // Full byte-parity with the Rust SDK encoder, pinned via BLAKE3 of
    // the entire calldata (protocore-sdk `encode_form_cluster_v2_calldata`,
    // 2026-06-11).
    expect(bytes.length).toBe(52932);
    expect(bytesHex(blake3(bytes))).toBe(
      "0x1a752e3995adf1cdd86b4e6daefe4660d58cecd63170b2a4763d7837bb181edc",
    );

    // Structure: 4 head offsets, then the four (length ‖ body) tails.
    const activeLen = NODE_REGISTRY_FORM_CLUSTER_ACTIVE_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES;
    const standbyLen =
      NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES;
    const signatureLen =
      NODE_REGISTRY_FORM_CLUSTER_MEMBER_COUNT * NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES;
    const signaturePaddedLen = Math.ceil(signatureLen / 32) * 32;
    const activeOffset = 4n * 32n;
    const standbyOffset = activeOffset + 32n + BigInt(activeLen);
    const signaturesOffset = standbyOffset + 32n + BigInt(standbyLen);
    const charterOffset = signaturesOffset + 32n + BigInt(signaturePaddedLen);
    expect(bytes.slice(0, 4)).toEqual(hexBytes(NODE_REGISTRY_SELECTORS.formClusterV2));
    expect(wordBigint(bytes.slice(4, 36))).toBe(activeOffset);
    expect(wordBigint(bytes.slice(36, 68))).toBe(standbyOffset);
    expect(wordBigint(bytes.slice(68, 100))).toBe(signaturesOffset);
    expect(wordBigint(bytes.slice(100, 132))).toBe(charterOffset);
    const charterLenWordAt = 4 + Number(charterOffset);
    expect(wordBigint(bytes.slice(charterLenWordAt, charterLenWordAt + 32))).toBe(
      BigInt(NODE_REGISTRY_CLUSTER_CHARTER_BYTES),
    );
    expect(bytes.slice(charterLenWordAt + 32, charterLenWordAt + 32 + 30)).toEqual(charter);

    // The V2 digest is pinned to mono-core's `form_cluster_message_v2`
    // for the same fixture, commits to the charter, and differs from V1.
    const v2 = formClusterMessageV2Hex(activePubkeys, standbyPubkeys, charter);
    expect(v2).toBe("0x118e8dbfc057ffd2fcab85d6a1942c674cdb3f516f4cae86377e1b275bdcd106");
    expect(formClusterMessageHex(activePubkeys, standbyPubkeys)).toBe(
      "0xa49cb5314c8f1b2feb508d2512b59e599a05f27d78e8cc6426cac67b55504015",
    );
    const tweaked = new Uint8Array(charter);
    tweaked[21] ^= 0x01;
    expect(formClusterMessageV2Hex(activePubkeys, standbyPubkeys, tweaked)).not.toBe(v2);

    expect(() =>
      encodeFormClusterV2Calldata({
        activePubkeys,
        standbyPubkeys,
        signatures,
        charter: charter.slice(0, 22),
      }),
    ).toThrow(/charter/u);
  });

  it("exposes the SERVES_GPU_PROVE bit (MB-4) without changing the public-service mask", () => {
    expect(NODE_REGISTRY_CAPABILITIES.SERVES_GPU_PROVE).toBe(0x0000_0200);
    // GPU-prove is not a probeable public service.
    expect(NODE_REGISTRY_PUBLIC_SERVICE_MASK & NODE_REGISTRY_CAPABILITIES.SERVES_GPU_PROVE).toBe(0);
  });

  it("decodes PF-6 operator network metadata (5-word tuple)", () => {
    const tuple = new Uint8Array(5 * 32);
    tuple[30] = 0xab; // asn high (word 0)
    tuple[31] = 0xcd; // asn low
    tuple.set([0x55, 0x4b, 0x52], 64); // geoRegion "UKR" left-aligned in word 1
    tuple[95] = 1; // hostingClass = coLocation (word 2, right-aligned u8)
    tuple.fill(0xee, 96, 128); // ipAddressHash (word 3)
    tuple.fill(0xdd, 128, 160); // pcrDigest (word 4)
    const md = decodeOperatorNetworkMetadata(tuple);
    expect(md.asn).toBe(0xabcd);
    expect(md.geoRegion).toBe("0x554b52");
    expect(md.hostingClass).toBe("coLocation");
    expect(md.ipAddressHash).toBe(`0x${"ee".repeat(32)}`);
    expect(md.pcrDigest).toBe(`0x${"dd".repeat(32)}`);
    expect(nodeHostingClassFromByte(2)).toBe("cloud");
    expect(nodeHostingClassFromByte(99)).toBe("cloud");
  });

  it("decodes PF-6 cluster diversity (4-word tuple)", () => {
    const tuple = new Uint8Array(4 * 32);
    const setWord = (i: number, v: number) => {
      tuple[i * 32 + 30] = (v >> 8) & 0xff;
      tuple[i * 32 + 31] = v & 0xff;
    };
    setWord(0, 8123);
    setWord(1, 9000);
    setWord(2, 7500);
    setWord(3, 7869);
    expect(decodeClusterDiversity(tuple)).toEqual({
      score: 8123,
      asnVariance: 9000,
      geoVariance: 7500,
      hostingSpread: 7869,
    });
  });

  it("decodes MB-5 ClusterFormed events", () => {
    const topic0 = `0x${"00".repeat(32)}`;
    const clusterIdTopic = new Uint8Array(32);
    clusterIdTopic[28] = 0x00;
    clusterIdTopic[31] = 0x07; // clusterId = 7
    const epochTopic = new Uint8Array(32);
    epochTopic[31] = 0x2a; // epoch = 42
    // data: anchorAddress word, offset word (0x40), roster len word, roster.
    const roster = new Uint8Array(96);
    roster.fill(0xab, 0, 32);
    roster.fill(0xcd, 48, 80);
    const data = new Uint8Array(96 + roster.length);
    data.fill(0x11, 12, 32); // anchorAddress (right-aligned 20 bytes)
    data[63] = 0x40; // offset
    data[95] = roster.length; // roster len (96 < 256)
    data.set(roster, 96);
    const ev = decodeClusterFormedEvent([topic0, clusterIdTopic, epochTopic], data);
    expect(ev.clusterId).toBe(7);
    expect(ev.effectiveEpoch).toBe(42n);
    expect(ev.anchorAddress).toBe(`0x${"11".repeat(20)}`);
    const expectedRoster = `0x${"ab".repeat(32)}${"00".repeat(16)}${"cd".repeat(32)}${"00".repeat(16)}`;
    expect(ev.operatorRoster).toBe(expectedRoster);
  });

  it("derives MB-5 cluster-anchor addresses deterministically + order-insensitively", () => {
    const roster = Array.from({ length: 10 }, (_, i) => {
      const memberRef = new Uint8Array(48);
      memberRef.fill(0x10 + i, 0, 32);
      return memberRef;
    });
    const a = deriveClusterAnchorAddress(roster, 7);
    expect(a).toMatch(/^0x[0-9a-f]{40}$/);
    expect(deriveClusterAnchorAddress(roster, 7)).toBe(a);
    expect(deriveClusterAnchorAddress([...roster].reverse(), 7)).toBe(a);
    // Threshold is folded into the preimage.
    expect(deriveClusterAnchorAddress(roster, 5)).not.toBe(a);
  });

  it("rejects malformed reportServiceProbe calldata inputs", () => {
    const peerId = `0x${"12".repeat(32)}`;
    const probeDigest = `0x${"34".repeat(32)}`;
    expect(() =>
      encodeReportServiceProbeCalldata({
        peerId,
        serviceMask: NODE_REGISTRY_CAPABILITIES.SERVES_BROADCASTER,
        status: SERVICE_PROBE_STATUS.REACHABLE,
        latencyMs: 42,
        probeDigest,
      }),
    ).toThrow();
    expect(() =>
      encodeReportServiceProbeCalldata({
        peerId,
        serviceMask: NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API,
        status: SERVICE_PROBE_STATUS.UNKNOWN,
        latencyMs: 42,
        probeDigest,
      }),
    ).toThrow();
  });

  it("rejects malformed lifecycle calldata inputs", () => {
    const targetPubkey = `0x${"ab".repeat(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES)}`;
    const keys = concatTestBytes(
      ...Array.from({ length: 5 }, (_, i) =>
        new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x20 + i),
      ),
    );
    const sig = new Uint8Array(96).fill(0xee);

    expect(() => encodeRecoverOperatorNodeCalldata("0x1234")).toThrow();
    expect(() =>
      encodeSubmitPendingChangeCalldata({
        kind: "remove",
        targetPubkey,
        effectiveEpoch: 10n,
        intentId: 1n,
      }),
    ).toThrow();
    expect(() =>
      encodeSubmitPendingChangeCalldata({
        kind: "rotate",
        targetPubkey,
        effectiveEpoch: 10n,
        intentId: NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID + 1n,
      }),
    ).toThrow();
    expect(() =>
      encodeAttestDkgReshareCalldata({
        intentId: 0n,
        consensusPublicKeys: keys,
        thresholdSig: sig,
      }),
    ).toThrow();
    expect(() =>
      encodeAttestDkgReshareCalldata({
        intentId: 1n,
        consensusPublicKeys: concatTestBytes(
          new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x11),
          new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x12),
        ),
        thresholdSig: sig,
      }),
    ).toThrow();
    expect(() =>
      encodeAttestDkgReshareCalldata({
        intentId: 1n,
        consensusPublicKeys: concatTestBytes(
          ...Array.from({ length: 5 }, () =>
            new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x11),
          ),
        ),
        thresholdSig: sig,
      }),
    ).toThrow();
    expect(() =>
      encodeAttestDkgReshareCalldata({
        intentId: 1n,
        consensusPublicKeys: keys,
        thresholdSig: new Uint8Array(95),
      }),
    ).toThrow();
  });
});

describe("service-reward + charter-governance encoders", () => {
  // Charter fixture pinned byte-identical to the existing
  // encodeClusterCharter parity vector (member shares 1500..500,
  // delegator 3000, expires 1_999_999_999_000ms).
  const charter = encodeClusterCharter({
    memberShareBps: [1500, 1500, 1000, 1000, 1000, 1000, 1000, 800, 700, 500],
    delegatorShareBps: 3000,
    expiresMs: 1_999_999_999_000n,
  });

  it("pins the new service-reward + charter selectors to mono-core", () => {
    // Pinned from the node-registry `abi::selector(sig::*)` SSOT
    // (service-rewards branch 0c414208, 2026-06-11).
    expect(NODE_REGISTRY_SELECTORS.updateCharter).toBe("0x9f1b8bbf");
    expect(NODE_REGISTRY_SELECTORS.getPendingCharter).toBe("0xb968c95e");
    expect(NODE_REGISTRY_SELECTORS.commitArchiveRoot).toBe("0xa769f5fe");
    // BLOCKER-1: new 5-arg signature
    // answerArchiveChallenge(bytes32,uint16,uint64,bytes,bytes32[]).
    expect(NODE_REGISTRY_SELECTORS.answerArchiveChallenge).toBe("0xe4cedf12");
    expect(NODE_REGISTRY_SELECTORS.setProbeAuthority).toBe("0xec63306c");
    expect(NODE_REGISTRY_SELECTORS.getProbeAuthority).toBe("0x83b9eee8");
    expect(NODE_REGISTRY_SELECTORS.attestServiceProbe).toBe("0x45631aab");
  });

  it("pins the new charter-governance constants", () => {
    expect(NODE_REGISTRY_UPDATE_CHARTER_THRESHOLD).toBe(7);
    expect(NODE_REGISTRY_UPDATE_CHARTER_MESSAGE_DOMAIN).toBe(
      "PROTOCORE_NODE_REGISTRY_CLUSTER_UPDATE_CHARTER_V1\0",
    );
    expect(NODE_REGISTRY_CHARTER_COOLDOWN_EPOCHS).toBe(2);
    expect(NODE_REGISTRY_ARCHIVE_CHALLENGE_DOMAIN).toBe("monolythium.archive-challenge.v1");
    expect(NODE_REGISTRY_ARCHIVE_NONCE_DOMAIN).toBe("monolythium.archive-challenge.nonce.v1");
    expect(NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH).toBe(40);
    expect(NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT).toBe(256n);
    expect(NODE_REGISTRY_CHALLENGE_EPOCH_WINDOW).toBe(2n);
    expect(NODE_REGISTRY_ARCHIVE_KIND_EPOCH_SEED).toBe(0x03);
    expect(NODE_REGISTRY_TAG_ARCHIVE_CHALLENGE).toBe(0x32);
    expect(NODE_REGISTRY_TAG_SERVICE_SCORE).toBe(0x24);
    expect(NODE_REGISTRY_TAG_TREASURY).toBe(0x1f);
  });

  it("derives the updateCharter consent digest byte-identical to mono-core", () => {
    // PARITY VECTOR: derived in BOTH the Rust SSOT
    // (cluster_form::update_charter_message, clusterId=7, the same charter
    // bytes) and TS; asserted byte-equal. A mismatch = Monarch signs the
    // wrong thing.
    expect(bytesHex(charter)).toBe(
      "0x05dc05dc03e803e803e803e803e8032002bc01f40bb8000001d1a94a1c18",
    );
    expect(updateCharterMessageHex(7, charter)).toBe(
      "0x1742796403f9b420fbc5bfd39233a3dc47dd7f861b9fe802670c6a32e6774078",
    );
    // The digest binds the cluster id: a different cluster ⇒ a different
    // digest (replay-resistance).
    expect(updateCharterMessageHex(8, charter)).not.toBe(updateCharterMessageHex(7, charter));
    // …and binds the charter bytes.
    const tweaked = new Uint8Array(charter);
    tweaked[21] ^= 0x01;
    expect(updateCharterMessageHex(7, tweaked)).not.toBe(updateCharterMessageHex(7, charter));
  });

  it("round-trips the cluster charter decoder", () => {
    const decoded = decodeClusterCharter(charter);
    expect(decoded.memberShareBps).toEqual([1500, 1500, 1000, 1000, 1000, 1000, 1000, 800, 700, 500]);
    expect(decoded.delegatorShareBps).toBe(3000);
    expect(decoded.expiresMs).toBe(1_999_999_999_000n);
    expect(Array.from(encodeClusterCharter(decoded))).toEqual(Array.from(charter));
  });

  it("encodes updateCharter calldata with the right ABI layout", () => {
    const signerPubkeys = Array.from({ length: 7 }, (_, i) =>
      new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x20 + i),
    );
    const signatures = Array.from({ length: 7 }, (_, i) =>
      new Uint8Array(NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES).fill(0x80 + i),
    );
    const calldata = encodeUpdateCharterCalldata({
      clusterId: 7,
      charter,
      signerPubkeys,
      signatures,
    });
    const bytes = hexBytes(calldata);
    // Head: selector + clusterId word + 3 offset words.
    expect(bytes.slice(0, 4)).toEqual(hexBytes(NODE_REGISTRY_SELECTORS.updateCharter));
    expect(wordBigint(bytes.slice(4, 36))).toBe(7n);
    const charterOffset = 4n * 32n;
    const charterPaddedLen = BigInt(Math.ceil(charter.length / 32) * 32);
    const signerLen = 7 * NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES;
    const signerPaddedLen = BigInt(Math.ceil(signerLen / 32) * 32);
    const signerOffset = charterOffset + 32n + charterPaddedLen;
    const sigsOffset = signerOffset + 32n + signerPaddedLen;
    expect(wordBigint(bytes.slice(36, 68))).toBe(charterOffset);
    expect(wordBigint(bytes.slice(68, 100))).toBe(signerOffset);
    expect(wordBigint(bytes.slice(100, 132))).toBe(sigsOffset);
    // charter length + body
    const charterLenAt = 4 + Number(charterOffset);
    expect(wordBigint(bytes.slice(charterLenAt, charterLenAt + 32))).toBe(
      BigInt(charter.length),
    );
    expect(bytes.slice(charterLenAt + 32, charterLenAt + 32 + 30)).toEqual(charter);
    // Concatenated buffer form must produce identical calldata.
    const flatPubkeys = concatTestBytes(...signerPubkeys);
    const flatSigs = concatTestBytes(...signatures);
    expect(
      encodeUpdateCharterCalldata({ clusterId: 7, charter, signerPubkeys: flatPubkeys, signatures: flatSigs }),
    ).toBe(calldata);
  });

  it("rejects malformed updateCharter inputs", () => {
    const pk = new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES);
    const sig = new Uint8Array(NODE_REGISTRY_CONSENSUS_SIGNATURE_BYTES);
    // sub-threshold (6 signers)
    expect(() =>
      encodeUpdateCharterCalldata({
        clusterId: 1,
        charter,
        signerPubkeys: Array.from({ length: 6 }, () => pk),
        signatures: Array.from({ length: 6 }, () => sig),
      }),
    ).toThrow(/signer count/u);
    // mismatched counts
    expect(() =>
      encodeUpdateCharterCalldata({
        clusterId: 1,
        charter,
        signerPubkeys: Array.from({ length: 7 }, () => pk),
        signatures: Array.from({ length: 8 }, () => sig),
      }),
    ).toThrow(/counts must match/u);
    // bad charter length
    expect(() =>
      encodeUpdateCharterCalldata({
        clusterId: 1,
        charter: new Uint8Array(29),
        signerPubkeys: Array.from({ length: 7 }, () => pk),
        signatures: Array.from({ length: 7 }, () => sig),
      }),
    ).toThrow(/charter/u);
  });

  it("decodes getPendingCharter view return data", () => {
    expect(encodeGetPendingCharterCalldata(7)).toBe(
      bytesHex(concatTestBytes(hexBytes(NODE_REGISTRY_SELECTORS.getPendingCharter), wordU32(7))),
    );
    // Build the exact wire return the on-chain encoder emits for a present
    // pending charter: head = present, delegatorBps, effectiveEpoch,
    // signerCount, bytesOffset(=160); tail = len(32) + packed shares word.
    const memberShareBps = [1500, 1500, 1000, 1000, 1000, 1000, 1000, 800, 700, 500];
    const packed = new Uint8Array(32);
    for (let i = 0; i < 10; i += 1) {
      packed[12 + 2 * i] = (memberShareBps[i] >> 8) & 0xff;
      packed[12 + 2 * i + 1] = memberShareBps[i] & 0xff;
    }
    const present = encodeWordU16(1);
    const delegator = encodeWordU16(3000);
    const effective = encodeWordU64(123n);
    const signerCount = encodeWordU16(7);
    const bytesOffset = encodeWordU64(160n);
    const lenWord = encodeWordU64(32n);
    const ret = concatTestBytes(present, delegator, effective, signerCount, bytesOffset, lenWord, packed);
    const view = decodePendingCharter(ret);
    expect(view.present).toBe(true);
    expect(view.delegatorShareBps).toBe(3000);
    expect(view.effectiveEpoch).toBe(123n);
    expect(view.signerCount).toBe(7);
    expect(view.memberShareBps).toEqual(memberShareBps);

    // Absent pending: a zeroed 5-word head + empty bytes length.
    const absent = concatTestBytes(
      new Uint8Array(4 * 32),
      encodeWordU64(160n),
      encodeWordU64(0n),
    );
    const none = decodePendingCharter(absent);
    expect(none.present).toBe(false);
    expect(none.memberShareBps).toEqual([]);
  });

  it("encodes commitArchiveRoot calldata (flat 4-word head)", () => {
    const peerId = new Uint8Array(32).fill(0x11);
    const shardRoot = new Uint8Array(32).fill(0x22);
    const calldata = encodeCommitArchiveRootCalldata({
      peerId,
      shardIndex: 3,
      shardRoot,
      leafCount: 1000n,
    });
    const bytes = hexBytes(calldata);
    expect(bytes.slice(0, 4)).toEqual(hexBytes(NODE_REGISTRY_SELECTORS.commitArchiveRoot));
    expect(bytes.slice(4, 36)).toEqual(peerId);
    expect(wordBigint(bytes.slice(36, 68))).toBe(3n);
    expect(bytes.slice(68, 100)).toEqual(shardRoot);
    expect(wordBigint(bytes.slice(100, 132))).toBe(1000n);
    expect(bytes.length).toBe(4 + 4 * 32);
  });

  it("rejects a commitArchiveRoot below MIN_ARCHIVE_LEAF_COUNT (BLOCKER-1)", () => {
    const base = {
      peerId: new Uint8Array(32).fill(0x11),
      shardIndex: 3,
      shardRoot: new Uint8Array(32).fill(0x22),
    };
    // Exactly at the floor is fine; one below reverts client-side.
    expect(() =>
      encodeCommitArchiveRootCalldata({ ...base, leafCount: NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT }),
    ).not.toThrow();
    expect(() => encodeCommitArchiveRootCalldata({ ...base, leafCount: 255n })).toThrow(
      /MIN_ARCHIVE_LEAF_COUNT/u,
    );
    expect(() => encodeCommitArchiveRootCalldata({ ...base, leafCount: 1n })).toThrow(
      /MIN_ARCHIVE_LEAF_COUNT/u,
    );
  });

  it("encodes answerArchiveChallenge (BLOCKER-1 5-arg form) with leaf + proof tails", () => {
    const peerId = new Uint8Array(32).fill(0x11);
    const leaf = new Uint8Array([1, 2, 3, 4, 5]);
    const proof = [new Uint8Array(32).fill(0xa1), new Uint8Array(32).fill(0xa2)];
    // BLOCKER-1: no roundCertDigest / nonce — protocol pins the seed.
    const calldata = encodeAnswerArchiveChallengeCalldata({
      peerId,
      shardIndex: 3,
      epoch: 7,
      leaf,
      proof,
    });
    const bytes = hexBytes(calldata);
    expect(bytes.slice(0, 4)).toEqual(hexBytes(NODE_REGISTRY_SELECTORS.answerArchiveChallenge));
    // 5 head words: peerId, shard, epoch, leafOffset, proofOffset.
    expect(bytes.slice(4, 36)).toEqual(peerId);
    expect(wordBigint(bytes.slice(36, 68))).toBe(3n);
    expect(wordBigint(bytes.slice(68, 100))).toBe(7n);
    const leafOffset = 5n * 32n;
    const proofOffset = leafOffset + 32n + 32n; // leaf padded to one word
    expect(wordBigint(bytes.slice(100, 132))).toBe(leafOffset);
    expect(wordBigint(bytes.slice(132, 164))).toBe(proofOffset);
    // leaf tail
    const leafLenAt = 4 + Number(leafOffset);
    expect(wordBigint(bytes.slice(leafLenAt, leafLenAt + 32))).toBe(5n);
    expect(bytes.slice(leafLenAt + 32, leafLenAt + 32 + 5)).toEqual(leaf);
    // proof tail
    const proofLenAt = 4 + Number(proofOffset);
    expect(wordBigint(bytes.slice(proofLenAt, proofLenAt + 32))).toBe(2n);
    expect(bytes.slice(proofLenAt + 32, proofLenAt + 64)).toEqual(proof[0]);
    expect(bytes.slice(proofLenAt + 64, proofLenAt + 96)).toEqual(proof[1]);
  });

  it("rejects an over-long archive proof", () => {
    expect(() =>
      encodeAnswerArchiveChallengeCalldata({
        peerId: new Uint8Array(32),
        shardIndex: 0,
        epoch: 0,
        leaf: new Uint8Array(1),
        proof: Array.from({ length: NODE_REGISTRY_MAX_MERKLE_PROOF_DEPTH + 1 }, () => new Uint8Array(32)),
      }),
    ).toThrow(/proof length/u);
  });

  it("derives slotEpochChallengeSeed + protocolNonceForEpoch byte-identical to mono-core", () => {
    // PARITY VECTORS: derived in the Rust SSOT
    // (archive_challenge::slot_epoch_challenge_seed /
    // protocol_nonce_for_epoch) on `service-rewards` d2ee4548 and asserted
    // byte-equal here. seed = 0xcd…cd (32 bytes), epoch = 7.
    expect(slotEpochChallengeSeed(7)).toBe(
      "0xe2d0f0d42134849f8d23fcecec9dc6ea74e767df023fb9b664d80bc4ae89441a",
    );
    // …and differs per epoch (the slot binds the epoch).
    expect(slotEpochChallengeSeed(8)).toBe(
      "0xb210b1025a5cd7c00fcc36a7c0ca725c1ef6e11b3c7b6ffa746e38a95f9bddf6",
    );
    expect(slotEpochChallengeSeed(7)).not.toBe(slotEpochChallengeSeed(8));
    // protocol nonce is a pure function of the pinned seed + epoch.
    const seed = new Uint8Array(32).fill(0xcd);
    expect(protocolNonceForEpoch(seed, 7)).toBe(8766292481912385616n);
    // a different epoch or seed changes it.
    expect(protocolNonceForEpoch(seed, 8)).not.toBe(protocolNonceForEpoch(seed, 7));
    expect(protocolNonceForEpoch(new Uint8Array(32).fill(0xce), 7)).not.toBe(
      protocolNonceForEpoch(seed, 7),
    );
  });

  it("derives the archive challenge from the ON-CHAIN seed byte-identical to mono-core", () => {
    // PARITY VECTOR (BLOCKER-1): same fixture as the Rust
    // archive_challenge::derive_challenge with the PROTOCOL-PINNED seed
    // (0xcd…cd) + the seed-derived nonce, over a 256-leaf tree.
    const seed = new Uint8Array(32).fill(0xcd);
    const opHash = new Uint8Array(32).fill(0x11);
    const c = deriveArchiveChallenge(seed, opHash, 3, 7, NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT);
    expect(c).not.toBeNull();
    expect(c!.seed).toBe("0xffa5a9214d02a6a05dac914d4faafa6a93fa24ff4231a42662024c9cf4131e6c");
    expect(c!.leafIndex).toBe(160n);
    expect(c!.shardIndex).toBe(3);
    // The derived nonce feeding the challenge is the protocol nonce.
    expect(protocolNonceForEpoch(seed, 7)).toBe(8766292481912385616n);
    // leafCount == 0 ⇒ null (nothing to challenge).
    expect(deriveArchiveChallenge(seed, opHash, 3, 7, 0n)).toBeNull();
  });

  it("encodes the full BLOCKER-1 answerArchiveChallenge calldata byte-identical to mono-core", () => {
    // PARITY VECTOR: the complete answerArchiveChallenge calldata for the
    // 256-leaf fixture above, with the leaf the protocol pseudo-randomly
    // selected (index 160 = "archive-leaf-0160") + its 8-element merkle
    // proof. Hex pinned from the Rust SSOT (built byte-for-byte as the TS
    // encoder does); a mismatch = Monarch submits the wrong calldata.
    const seed = new Uint8Array(32).fill(0xcd);
    const opHash = new Uint8Array(32).fill(0x11);
    const c = deriveArchiveChallenge(seed, opHash, 3, 7, NODE_REGISTRY_MIN_ARCHIVE_LEAF_COUNT);
    expect(c!.leafIndex).toBe(160n);
    const leaf = new TextEncoder().encode("archive-leaf-0160");
    const proof = [
      "0x7519b8349f27bc234f5e44654e1831327609600c1348af7eccff2868f119589a",
      "0xd482cf2cf5436cb2704c1c69818ce1f4cb687ee8edde7f934433a524cddf5d5f",
      "0x5ec61ddcf1e8525be1b27fa79ef1b88336e7540a5cdcec106c6212858d060e87",
      "0x4530b693ece56d721cd530cc88d5fc2004e08cb252702f3c5d2c7941cae988be",
      "0xc00a911d29da312ddec02c86cd8651ae54d1c79f2d1cacad9b2df87424a93ed1",
      "0xa2296073e820bb55e0f308cd82eb1d897aed5077161f54d969e37ba5835e22e5",
      "0x8ea2493591bb0122907e8e793149c1d607f8612eafb3ba49bff24b3739fc9267",
      "0xe9c31490fd8adeccc1646a63cf3ca901075b71ab44a369232fa95f8e3e6e4555",
    ];
    const calldata = encodeAnswerArchiveChallengeCalldata({
      peerId: opHash,
      shardIndex: 3,
      epoch: 7,
      leaf,
      proof,
    });
    expect(calldata).toBe(
      "0xe4cedf12" +
        // peerId
        "1111111111111111111111111111111111111111111111111111111111111111" +
        // shardIndex = 3
        "0000000000000000000000000000000000000000000000000000000000000003" +
        // epoch = 7
        "0000000000000000000000000000000000000000000000000000000000000007" +
        // leafOffset = 0xa0 (5 words)
        "00000000000000000000000000000000000000000000000000000000000000a0" +
        // proofOffset = 0xe0
        "00000000000000000000000000000000000000000000000000000000000000e0" +
        // leaf length = 17 (0x11)
        "0000000000000000000000000000000000000000000000000000000000000011" +
        // leaf bytes "archive-leaf-0160" right-padded to one word
        "617263686976652d6c6561662d30313630000000000000000000000000000000" +
        // proof length = 8
        "0000000000000000000000000000000000000000000000000000000000000008" +
        "7519b8349f27bc234f5e44654e1831327609600c1348af7eccff2868f119589a" +
        "d482cf2cf5436cb2704c1c69818ce1f4cb687ee8edde7f934433a524cddf5d5f" +
        "5ec61ddcf1e8525be1b27fa79ef1b88336e7540a5cdcec106c6212858d060e87" +
        "4530b693ece56d721cd530cc88d5fc2004e08cb252702f3c5d2c7941cae988be" +
        "c00a911d29da312ddec02c86cd8651ae54d1c79f2d1cacad9b2df87424a93ed1" +
        "a2296073e820bb55e0f308cd82eb1d897aed5077161f54d969e37ba5835e22e5" +
        "8ea2493591bb0122907e8e793149c1d607f8612eafb3ba49bff24b3739fc9267" +
        "e9c31490fd8adeccc1646a63cf3ca901075b71ab44a369232fa95f8e3e6e4555",
    );
  });

  it("hashes an archive merkle leaf byte-identical to mono-core", () => {
    // PARITY VECTOR: merkle_leaf_hash(b"hello-archive-leaf").
    expect(bytesHex(archiveMerkleLeafHash(new TextEncoder().encode("hello-archive-leaf")))).toBe(
      "0x525493fea4d3b41f40b30edebd95bf4b3e0d74a9421c7b749e54a262de4b4d5e",
    );
  });

  it("encodes setProbeAuthority / getProbeAuthority calldata", () => {
    const addr = new Uint8Array(20).fill(0x33);
    const calldata = encodeSetProbeAuthorityCalldata(addr);
    const bytes = hexBytes(calldata);
    expect(bytes.slice(0, 4)).toEqual(hexBytes(NODE_REGISTRY_SELECTORS.setProbeAuthority));
    // left-padded address word
    expect(bytes.slice(4, 16)).toEqual(new Uint8Array(12));
    expect(bytes.slice(16, 36)).toEqual(addr);
    expect(bytes.length).toBe(4 + 32);
    expect(encodeGetProbeAuthorityCalldata()).toBe(NODE_REGISTRY_SELECTORS.getProbeAuthority);
    // decode a return word
    const ret = concatTestBytes(new Uint8Array(12), addr);
    expect(decodeProbeAuthority(ret)).toBe(bytesHex(addr));
  });

  it("encodes attestServiceProbe calldata (flat 4-word head)", () => {
    const opHash = new Uint8Array(32).fill(0x11);
    const calldata = encodeAttestServiceProbeCalldata({
      opHash,
      serviceMask: NODE_REGISTRY_CAPABILITIES.SERVES_RPC | NODE_REGISTRY_CAPABILITIES.SERVES_INDEXER,
      status: SERVICE_PROBE_STATUS.REACHABLE,
      epoch: 9,
    });
    const bytes = hexBytes(calldata);
    expect(bytes.slice(0, 4)).toEqual(hexBytes(NODE_REGISTRY_SELECTORS.attestServiceProbe));
    expect(bytes.slice(4, 36)).toEqual(opHash);
    expect(wordBigint(bytes.slice(36, 68))).toBe(
      BigInt(NODE_REGISTRY_CAPABILITIES.SERVES_RPC | NODE_REGISTRY_CAPABILITIES.SERVES_INDEXER),
    );
    expect(wordBigint(bytes.slice(68, 100))).toBe(BigInt(SERVICE_PROBE_STATUS.REACHABLE));
    expect(wordBigint(bytes.slice(100, 132))).toBe(9n);
    expect(bytes.length).toBe(4 + 4 * 32);
    // invalid mask / status rejected
    expect(() =>
      encodeAttestServiceProbeCalldata({ opHash, serviceMask: NODE_REGISTRY_CAPABILITIES.SERVES_BROADCASTER, status: 1, epoch: 1 }),
    ).toThrow(/mask/u);
    expect(() =>
      encodeAttestServiceProbeCalldata({ opHash, serviceMask: NODE_REGISTRY_CAPABILITIES.SERVES_RPC, status: 0, epoch: 1 }),
    ).toThrow(/status/u);
  });

  it("derives service-score storage-slot keys byte-identical to mono-core", () => {
    // PARITY VECTORS: derived in the Rust SSOT
    // (service-score slots + node-registry slot_score_service_probe /
    // slot_probe_authority) for the same fixtures.
    const opHash = new Uint8Array(32).fill(0x11);
    expect(slotClusterServiceScore(7)).toBe(
      "0x0b6128637738a1e9aaf30fbaf95de751d6cdf1a8f35e89a276d358a1dbb684ef",
    );
    // SERVES_RPC ⇒ bit index 0; SERVES_ARCHIVE ⇒ bit index 3.
    expect(serviceMaskToBitIndex(NODE_REGISTRY_CAPABILITIES.SERVES_RPC)).toBe(0);
    expect(serviceMaskToBitIndex(NODE_REGISTRY_CAPABILITIES.SERVES_ARCHIVE)).toBe(3);
    expect(serviceMaskToBitIndex(NODE_REGISTRY_CAPABILITIES.SERVES_RPC | NODE_REGISTRY_CAPABILITIES.SERVES_INDEXER)).toBeNull();
    expect(slotScoreServiceProbe(opHash, 0)).toBe(
      "0xd494abdafe3ad736722f3cff564a0df11bb512a812d76fa7294c5bd08c811133",
    );
    expect(slotScoreServiceProbe(opHash, 3)).toBe(
      "0x5eab6148dc72387a6e3cacba434201e0260858dcade68777eee37b6c53c049a3",
    );
    expect(slotProbeAuthority()).toBe(
      "0x1d21c9a7dbbe25d4aa94cbc9882f68457a9d1cdf7c713d602dcde82d817e9a5f",
    );
    // archive-challenge pass slot derives deterministically + differs per epoch.
    expect(slotArchiveChallengePass(7, 5)).toBe(slotArchiveChallengePass(7, 5));
    expect(slotArchiveChallengePass(7, 5)).not.toBe(slotArchiveChallengePass(7, 6));
  });

  it("decodes a packed score-service-probe word", () => {
    // (epoch << 8) | status, with epoch=9 status=REACHABLE(1).
    const word = new Uint8Array(32);
    word[31] = SERVICE_PROBE_STATUS.REACHABLE;
    word[30] = 9; // (9 << 8) places 9 in the second-lowest byte.
    const decoded = decodeScoreServiceProbe(word);
    expect(decoded.epoch).toBe(9n);
    expect(decoded.status).toBe(SERVICE_PROBE_STATUS.REACHABLE);
  });
});

function wordU32(value: number): Uint8Array {
  const out = new Uint8Array(32);
  out[28] = (value >>> 24) & 0xff;
  out[29] = (value >>> 16) & 0xff;
  out[30] = (value >>> 8) & 0xff;
  out[31] = value & 0xff;
  return out;
}

function encodeWordU16(value: number): Uint8Array {
  const out = new Uint8Array(32);
  out[30] = (value >>> 8) & 0xff;
  out[31] = value & 0xff;
  return out;
}

function encodeWordU64(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let n = value;
  for (let i = 31; i >= 24; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

function hexBytes(hex: string): Uint8Array {
  const body = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function concatTestBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function wordBigint(word: Uint8Array): bigint {
  let value = 0n;
  for (const byte of word) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

function bytesHex(bytes: Uint8Array): string {
  let out = "0x";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

function u256Word(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function setWordU64(bytes: Uint8Array, wordIndex: number, value: bigint): void {
  let rest = value;
  const offset = wordIndex * 32;
  for (let i = 31; i >= 24; i--) {
    bytes[offset + i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
}
