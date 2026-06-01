import { describe, expect, it } from "vitest";
import {
  NODE_REGISTRY_BLS_PUBKEY_BYTES,
  NODE_REGISTRY_CAPABILITIES,
  NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS,
  NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS,
  NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES,
  NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID,
  NODE_REGISTRY_PUBLIC_SERVICE_MASK,
  NODE_REGISTRY_SELECTORS,
  PENDING_CHANGE_KIND_CODES,
  SERVICE_PROBE_STATUS,
  decodeClusterDiversity,
  decodeClusterFormedEvent,
  decodeOperatorNetworkMetadata,
  deriveClusterAnchorAddress,
  encodeAttestDkgReshareCalldata,
  encodeCancelPendingChangeCalldata,
  encodeRecoverOperatorNodeCalldata,
  encodeReportServiceProbeCalldata,
  encodeSubmitPendingChangeCalldata,
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
    expect(NODE_REGISTRY_BLS_PUBKEY_BYTES).toBe(48);
    expect(NODE_REGISTRY_DKG_THRESHOLD_SIG_BYTES).toBe(96);
    expect(NODE_REGISTRY_DKG_RESHARE_MIN_SIGNERS).toBe(5);
    expect(NODE_REGISTRY_DKG_RESHARE_MAX_SIGNERS).toBe(7);
    expect(NODE_REGISTRY_PENDING_CHANGE_MAX_INTENT_ID).toBe((1n << 56n) - 1n);
    expect(PENDING_CHANGE_KIND_CODES).toEqual({ add: 1, remove: 2, rotate: 3 });
  });

  it("pins node-registry lifecycle selectors", () => {
    expect(NODE_REGISTRY_SELECTORS.recoverOperatorNode).toBe("0xe58729e6");
    expect(NODE_REGISTRY_SELECTORS.submitPendingChange).toBe("0x7d09426c");
    expect(NODE_REGISTRY_SELECTORS.cancelPendingChange).toBe("0xdca5b10e");
    expect(NODE_REGISTRY_SELECTORS.attestDkgReshare).toBe("0x36e34030");
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
    const targetPubkey = `0x${"ab".repeat(48)}`;
    const calldata = encodeSubmitPendingChangeCalldata({
      kind: "rotate",
      targetPubkey,
      effectiveEpoch: 42n,
      intentId: 7n,
    });
    const bytes = hexBytes(calldata);
    expect(calldata.startsWith(NODE_REGISTRY_SELECTORS.submitPendingChange)).toBe(true);
    expect(bytes.length).toBe(4 + 7 * 32);
    expect(bytes[35]).toBe(3);
    expect(bytes[67]).toBe(0x80);
    expect(bytes[99]).toBe(42);
    expect(bytes[131]).toBe(7);
    expect(bytes[163]).toBe(48);
    expect(bytes.slice(164, 196)).toEqual(new Uint8Array(32).fill(0xab));
    expect(bytes.slice(196, 212)).toEqual(new Uint8Array(16).fill(0xab));
    expect(bytes.slice(212, 228)).toEqual(new Uint8Array(16));
    expect(normalizePendingChangeKind(1)).toEqual({ kind: "add", kindCode: 1 });
  });

  it("encodes cancelPendingChange calldata", () => {
    const targetPubkey = `0x${"bc".repeat(48)}`;
    const calldata = encodeCancelPendingChangeCalldata({
      epoch: "99",
      targetPubkey,
    });
    const bytes = hexBytes(calldata);
    expect(calldata.startsWith(NODE_REGISTRY_SELECTORS.cancelPendingChange)).toBe(true);
    expect(bytes.length).toBe(4 + 5 * 32);
    expect(bytes[35]).toBe(99);
    expect(bytes[67]).toBe(0x40);
    expect(bytes[99]).toBe(48);
    expect(bytes.slice(100, 132)).toEqual(new Uint8Array(32).fill(0xbc));
    expect(bytes.slice(132, 148)).toEqual(new Uint8Array(16).fill(0xbc));
    expect(bytes.slice(148, 164)).toEqual(new Uint8Array(16));
  });

  it("encodes attestDkgReshare calldata with bounded signers", () => {
    const keys = Array.from({ length: 5 }, (_, i) => new Uint8Array(48).fill(0x10 + i));
    const blsPublicKeys = concatTestBytes(...keys);
    const thresholdSig = new Uint8Array(96).fill(0xee);
    const calldata = encodeAttestDkgReshareCalldata({
      intentId: 7n,
      blsPublicKeys,
      thresholdSig,
    });
    const bytes = hexBytes(calldata);
    expect(calldata.startsWith(NODE_REGISTRY_SELECTORS.attestDkgReshare)).toBe(true);
    expect(bytes.length).toBe(4 + 3 * 32 + 32 + 256 + 32 + 96);
    expect(bytes[35]).toBe(7);
    expect(bytes[67]).toBe(0x60);
    expect(bytes[98]).toBe(0x01);
    expect(bytes[99]).toBe(0x80);
    expect(bytes[131]).toBe(240);
    expect(parseDkgResharePublicKeys(blsPublicKeys)).toHaveLength(5);
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
    const roster = new Uint8Array(96).fill(0xab); // two 48-byte pubkeys
    const data = new Uint8Array(96 + roster.length);
    data.fill(0x11, 12, 32); // anchorAddress (right-aligned 20 bytes)
    data[63] = 0x40; // offset
    data[95] = roster.length; // roster len (96 < 256)
    data.set(roster, 96);
    const ev = decodeClusterFormedEvent([topic0, clusterIdTopic, epochTopic], data);
    expect(ev.clusterId).toBe(7);
    expect(ev.effectiveEpoch).toBe(42n);
    expect(ev.anchorAddress).toBe(`0x${"11".repeat(20)}`);
    expect(ev.operatorRoster).toBe(`0x${"ab".repeat(96)}`);
  });

  it("derives MB-5 cluster-anchor addresses deterministically + order-insensitively", () => {
    const roster = Array.from({ length: 10 }, (_, i) => new Uint8Array(48).fill(0x10 + i));
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
    const targetPubkey = `0x${"ab".repeat(48)}`;
    const keys = concatTestBytes(...Array.from({ length: 5 }, (_, i) => new Uint8Array(48).fill(0x20 + i)));
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
        blsPublicKeys: keys,
        thresholdSig: sig,
      }),
    ).toThrow();
    expect(() =>
      encodeAttestDkgReshareCalldata({
        intentId: 1n,
        blsPublicKeys: concatTestBytes(new Uint8Array(48).fill(0x11), new Uint8Array(48).fill(0x12)),
        thresholdSig: sig,
      }),
    ).toThrow();
    expect(() =>
      encodeAttestDkgReshareCalldata({
        intentId: 1n,
        blsPublicKeys: concatTestBytes(...Array.from({ length: 5 }, () => new Uint8Array(48).fill(0x11))),
        thresholdSig: sig,
      }),
    ).toThrow();
    expect(() =>
      encodeAttestDkgReshareCalldata({
        intentId: 1n,
        blsPublicKeys: keys,
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
