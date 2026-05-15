import { describe, expect, it } from "vitest";
import {
  NODE_REGISTRY_CAPABILITIES,
  NODE_REGISTRY_PUBLIC_SERVICE_MASK,
  NODE_REGISTRY_SELECTORS,
  SERVICE_PROBE_STATUS,
  encodeReportServiceProbeCalldata,
  isConcreteServiceProbeStatus,
  isSinglePublicServiceProbeMask,
  isValidPublicServiceProbeMask,
  nodeRegistryAddressHex,
  serviceProbeStatusLabel,
} from "../src/index.js";

describe("node-registry helpers", () => {
  it("exports public-service masks pinned to mono-core", () => {
    expect(NODE_REGISTRY_CAPABILITIES.SERVES_RPC).toBe(0x0000_0001);
    expect(NODE_REGISTRY_CAPABILITIES.SERVES_PUBLIC_API).toBe(0x0000_0100);
    expect(NODE_REGISTRY_PUBLIC_SERVICE_MASK).toBe(0x0000_011b);
    expect(nodeRegistryAddressHex()).toBe("0x0000000000000000000000000000000000001005");
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
});
