import { describe, expect, it } from "vitest";
import {
  NODE_REGISTRY_BLS_PUBKEY_BYTES,
  NODE_REGISTRY_CAPABILITIES,
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
  NODE_REGISTRY_FORM_CLUSTER_STANDBY_COUNT,
  NODE_REGISTRY_FORM_CLUSTER_THRESHOLD,
  NODE_REGISTRY_LEGACY_CLUSTER_MEMBER_PUBKEY_BYTES,
  NODE_REGISTRY_OPERATOR_ALIAS_MAX_BYTES,
  NODE_REGISTRY_OPERATOR_MONIKER_MAX_BYTES,
  NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID,
  NODE_REGISTRY_PUBLIC_SERVICE_MASK,
  NODE_REGISTRY_SELECTORS,
  PENDING_CHANGE_KIND_CODES,
  SERVICE_PROBE_STATUS,
  decodeClusterDiversity,
  decodeClusterFormedEvent,
  decodeClusterJoinRequest,
  decodeOperatorNetworkMetadata,
  deriveClusterAnchorAddress,
  encodeAttestDkgReshareCalldata,
  encodeCancelClusterJoinCalldata,
  encodeCancelPendingChangeCalldata,
  encodeExpireClusterJoinCalldata,
  encodeFormClusterCalldata,
  encodeGetClusterJoinRequestCalldata,
  encodeRecoverOperatorNodeCalldata,
  encodeReportServiceProbeCalldata,
  encodeRequestClusterJoinCalldata,
  encodeSetOperatorDisplayCalldata,
  encodeSubmitPendingChangeCalldata,
  encodeVoteClusterAdmitCalldata,
  formClusterMessageHex,
  isConcreteServiceProbeStatus,
  isSinglePublicServiceProbeMask,
  isValidPublicServiceProbeMask,
  normalizePendingChangeKind,
  nodeHostingClassFromByte,
  nodeRegistryAddressHex,
  parseDkgResharePublicKeys,
  serviceProbeStatusLabel,
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

function setWordU64(bytes: Uint8Array, wordIndex: number, value: bigint): void {
  let rest = value;
  const offset = wordIndex * 32;
  for (let i = 31; i >= 24; i--) {
    bytes[offset + i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
}
