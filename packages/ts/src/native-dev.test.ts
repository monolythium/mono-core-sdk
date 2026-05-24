import { describe, expect, it } from "vitest";
import * as nativeDev from "./native-dev.js";
import {
  NATIVE_DEV_HOST_API_VERSION,
  NATIVE_DEV_IPC_PROTOCOL_VERSION,
  NATIVE_DEV_MANIFEST_SCHEMA_VERSION,
  checkNativeDevkitCompatibility,
  nativeDevSchemaFieldNames,
  nativeDevUiStrings,
  resolveStudioHostStatus,
} from "./native-dev.js";

const manifest = {
  schemaVersion: NATIVE_DEV_MANIFEST_SCHEMA_VERSION,
  devkitVersion: "0.1.0",
  channel: "testnet",
  minimumWalletHostApi: "0.1.0",
  maximumWalletHostApi: "0.1.9",
  monoCoreCommit: "1111111111111111111111111111111111111111",
  monoCoreSdkCommit: "2222222222222222222222222222222222222222",
  archive: {
    url: "file:///tmp/mono-devkit.tar.zst",
    sha256: "a".repeat(64),
    signature: "test-signature",
  },
  sidecar: {
    binaryName: "mono-dev",
    ipcProtocolVersion: NATIVE_DEV_IPC_PROTOCOL_VERSION,
  },
} as const;

const blockedTerms = [
  "Sol" + "idity",
  "Found" + "ry",
  "Hard" + "hat",
  "for" + "ge",
  "ca" + "st",
  "ER" + "C",
  "EV" + "M",
  `${String.fromCharCode(48)}${String.fromCharCode(120)}`,
  "ga" + "s",
  "gw" + "ei",
  "w" + "ei",
  "eth" + "_",
] as const;

const blockedSchemaFields = ["from", "chainId"] as const;

describe("native-dev schemas", () => {
  it("resolves host states from manifest compatibility", () => {
    expect(checkNativeDevkitCompatibility(manifest)).toBe("compatible");
    expect(resolveStudioHostStatus({ developerModeEnabled: false, channel: "stable" }).state).toBe("disabled");
    expect(resolveStudioHostStatus({ developerModeEnabled: true, channel: "stable" }).state).toBe("missing_devkit");
    expect(
      resolveStudioHostStatus({
        developerModeEnabled: true,
        channel: "testnet",
        hostApiVersion: NATIVE_DEV_HOST_API_VERSION,
        installPath: "/tmp/devkit",
        manifest,
      }).state,
    ).toBe("ready");
    expect(
      resolveStudioHostStatus({
        developerModeEnabled: true,
        channel: "testnet",
        hostApiVersion: "0.2.0",
        installPath: "/tmp/devkit",
        manifest,
      }).state,
    ).toBe("incompatible_devkit");
  });

  it("keeps exported native-dev names and UI strings native", () => {
    const exportedNames = Object.keys(nativeDev).join("\n");
    const uiText = nativeDevUiStrings().join("\n");
    const schemaFields = nativeDevSchemaFieldNames();
    for (const term of blockedTerms) {
      expect(exportedNames, `exported native-dev name contains ${term}`).not.toContain(term);
      expect(uiText, `native-dev UI string contains ${term}`).not.toContain(term);
      expect(schemaFields.join("\n"), `native-dev schema field contains ${term}`).not.toContain(term);
    }
    for (const field of blockedSchemaFields) {
      expect(schemaFields, `native-dev schema exposes ${field}`).not.toContain(field);
    }
  });
});
