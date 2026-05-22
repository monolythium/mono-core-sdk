import { describe, expect, it } from "vitest";
import {
  MRV_FORMAT_VERSION,
  MRV_PROFILE_MONO_RV32IM_V1,
  MRV_TX_EXTENSION_KIND,
  addressToTypedBech32,
  mrvAddressToBech32,
  mrvBech32ToAddress,
  mrvCodeHashHex,
  mrvV1TransactionExtension,
  validateMrvArtifactMetadata,
  validateMrvCallRequest,
  validateMrvDeployRequest,
} from "../src/index.js";
import type { MrvArtifactMetadata, MrvCallRequest, MrvDeployRequest } from "../src/index.js";

function validMetadata(): MrvArtifactMetadata {
  const code = Uint8Array.from([0x13, 0x00, 0x00, 0x00]);
  return {
    formatVersion: MRV_FORMAT_VERSION,
    profile: MRV_PROFILE_MONO_RV32IM_V1,
    codeHash: mrvCodeHashHex(code),
    codeBytes: 4n,
    debugBytes: 0n,
    abi: {
      symbols: [
        {
          name: "transfer",
          kind: "function",
          inputs: [{ name: "amount", ty: { kind: "u128" } }],
          outputs: [{ name: "ok", ty: { kind: "bool" } }],
        },
      ],
    },
    imports: [
      { module: "mono", name: "storage_read", id: 0x0101 },
      { module: "mono", name: "emit_event", id: 0x0302 },
    ],
    memory: {
      initialPages: 1,
      maxPages: 4,
      stackBytes: 16 * 1024,
    },
    storageNamespace: {
      name: "contract_state",
      version: 1,
    },
    build: {
      toolchain: "mono-riscv-test",
      sourceDigest: "0x0707070707070707070707070707070707070707070707070707070707070707",
      profile: "release-deterministic",
    },
  };
}

describe("MRV/RISC-V SDK helpers", () => {
  it("validates artifact metadata and resolves syscalls", () => {
    const code = Uint8Array.from([0x13, 0x00, 0x00, 0x00]);
    const metadata = validMetadata();
    const validated = validateMrvArtifactMetadata(metadata, code);
    expect(validated.profile).toBe(MRV_PROFILE_MONO_RV32IM_V1);
    expect(validated.codeHash).toBe(metadata.codeHash);
    expect(validated.codeBytes).toBe(4n);
    expect(validated.abiSymbolCount).toBe(1n);
    expect(validated.syscalls).toEqual([
      { id: 0x0101, name: "storage_read" },
      { id: 0x0302, name: "emit_event" },
    ]);

    const wire = JSON.stringify(metadata, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
    expect(wire).toContain("codeBytes");
    expect(wire).toContain("storageNamespace");
    expect(wire).not.toMatch(/\b(gas|gwei|wei)\b/i);
  });

  it("rejects malformed metadata", () => {
    const metadata = validMetadata();
    metadata.codeHash = "0x9999999999999999999999999999999999999999999999999999999999999999";
    expect(() => validateMrvArtifactMetadata(metadata, Uint8Array.from([0x13, 0x00, 0x00, 0x00]))).toThrow(
      /code hash mismatch/,
    );

    const badImport = validMetadata();
    badImport.imports.push({ module: "env", name: "clock_time_get", id: 0x0402 });
    expect(() => validateMrvArtifactMetadata(badImport, Uint8Array.from([0x13, 0x00, 0x00, 0x00]))).toThrow(
      /forbidden host import/,
    );
  });

  it("exports typed bech32m address and MRV transaction extension helpers", () => {
    const contract = mrvAddressToBech32("contract", Uint8Array.from({ length: 20 }, () => 0x22));
    expect(contract.startsWith("monoc1")).toBe(true);
    const decoded = mrvBech32ToAddress(contract, "contract");
    expect(decoded.kind).toBe("contract");
    expect(decoded.hex).toBe("0x2222222222222222222222222222222222222222");

    const ext = mrvV1TransactionExtension();
    expect(ext).toEqual({ kind: MRV_TX_EXTENSION_KIND, bodyHex: "0x01" });
  });

  it("validates deploy and call request wire models without gas names", () => {
    const user = addressToTypedBech32("user", "0x1111111111111111111111111111111111111111");
    const contract = addressToTypedBech32("contract", "0x2222222222222222222222222222222222222222");
    const deploy: MrvDeployRequest = {
      from: user,
      artifactBytes: "0x13000000",
      valueLythoshi: "100000000",
      executionUnitLimit: 1_000_000n,
      maxExecutionFeeLythoshi: "10",
      priorityTipLythoshi: "1",
      nonce: 7n,
    };
    validateMrvDeployRequest(deploy);

    const call: MrvCallRequest = {
      from: user,
      contractAddress: contract,
      input: "0x0102",
      valueLythoshi: "0",
      executionUnitLimit: 50_000n,
    };
    validateMrvCallRequest(call);
    const wire = JSON.stringify(call, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
    expect(wire).toContain("valueLythoshi");
    expect(wire).toContain("executionUnitLimit");
    expect(wire).not.toMatch(/\b(gas|gwei|wei)\b/i);
  });
});
