import { describe, expect, it } from "vitest";
import {
  MRV_FORMAT_VERSION,
  MRV_PROFILE_MONO_RV32IM_V1,
  MRV_STRUCTURED_FEE_FIELDS,
  MRV_TX_EXTENSION_KIND,
  NATIVE_LYTH_DECIMALS,
  RpcClient,
  addressToTypedBech32,
  assertMrvFeeDisplayConformance,
  buildMrvCallNativeTxPlan,
  buildMrvCallPlan,
  buildMrvCallRequest,
  buildMrvDeployNativeTxPlan,
  buildMrvDeployPlan,
  buildMrvDeployRequest,
  checkMrvFeeDisplayConformance,
  deriveMrvContractAddress,
  formatLyth,
  formatLythoshi,
  mrvAddressToBech32,
  mrvBech32ToAddress,
  mrvCodeHashHex,
  mrvV1TransactionExtension,
  parseLythToLythoshi,
  submitMrvCallNativeTx,
  submitMrvDeployNativeTx,
  validateMrvArtifactMetadata,
  validateMrvCallRequest,
  validateMrvDeployRequest,
} from "../src/index.js";
import {
  ML_DSA_65_SEED_LEN,
  ML_KEM_768_ENCAPSULATION_KEY_LEN,
  MempoolClass,
  MlDsa65Backend,
  bytesToHex,
} from "../src/crypto/index.js";
import type { MrvArtifactMetadata, MrvCallRequest, MrvDeployRequest } from "../src/index.js";

interface CapturedCall {
  method: string;
  params: unknown;
}

function mockFetchSequence(replies: unknown[]): {
  fetch: typeof fetch;
  calls: CapturedCall[];
} {
  const calls: CapturedCall[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = init?.body;
    if (typeof body !== "string") {
      throw new Error("expected string body");
    }
    const parsed = JSON.parse(body) as { method: string; params: unknown };
    calls.push({ method: parsed.method, params: parsed.params });
    const reply = replies.shift();
    if (reply === undefined) {
      throw new Error("unexpected RPC call");
    }
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: reply }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchImpl, calls };
}

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
  it("formats and parses native LYTH amounts at 8 decimal precision", () => {
    const cases: Array<[bigint, string]> = [
      [0n, "0 LYTH"],
      [1n, "0.00000001 LYTH"],
      [50_000n, "0.0005 LYTH"],
      [12_340_000n, "0.1234 LYTH"],
      [12_345_678n, "0.12345678 LYTH"],
      [500_050_000_000n, "5,000.5 LYTH"],
    ];

    expect(NATIVE_LYTH_DECIMALS).toBe(8);
    for (const [lythoshi, expected] of cases) {
      expect(formatLyth(lythoshi)).toBe(expected);
      expect(formatLythoshi(lythoshi)).toBe(expected);
      expect(parseLythToLythoshi(expected)).toBe(lythoshi);
    }
    expect(formatLyth(500_050_000_000n, { includeUnit: false })).toBe("5,000.5");
    expect(parseLythToLythoshi("1.00000001")).toBe(100_000_001n);
    expect(() => parseLythToLythoshi("1.")).toThrow(/canonical LYTH decimal/);
    expect(() => parseLythToLythoshi("1.000000001")).toThrow(/8 decimal/);
    expect(() => parseLythToLythoshi("12,34 LYTH")).toThrow(/canonical LYTH decimal/);
  });

  it("checks fee display conformance for default and structured fee surfaces", () => {
    const fee = {
      total_lythoshi: "50000",
      total_lyth: "0.0005",
      cycles_used: 42,
      base_price_per_cycle_lythoshi: "1000",
      state_io_units: 8,
      state_io_price_per_unit_lythoshi: "250",
      priority_tip_lythoshi: "0",
    };
    expect(Object.keys(fee)).toEqual([...MRV_STRUCTURED_FEE_FIELDS]);

    const report = checkMrvFeeDisplayConformance({
      expectedTotalLythoshi: "50000",
      defaultFeeText: "Network fee: 0.0005 LYTH",
      detailTexts: ["cycles 42, state I/O 8, total 50000 lythoshi"],
      structuredFee: fee,
      customFeeInputVisible: false,
      speedUpCancelVisible: false,
    });
    expect(report).toEqual({
      passed: true,
      failures: [],
      expectedDefaultFeeText: "0.0005 LYTH",
    });
    expect(() =>
      assertMrvFeeDisplayConformance({
        expectedTotalLythoshi: 50_000n,
        defaultFeeText: "Network fee: 0.0005 LYTH",
        structuredFee: fee,
      }),
    ).not.toThrow();

    const failed = checkMrvFeeDisplayConformance({
      expectedTotalLythoshi: "50000",
      defaultFeeText: "50000 lythoshi / 42 cycles / gas price 0.00050000 LYTH",
      detailTexts: ["gas price 10 gwei"],
      structuredFee: { ...fee, gas_price: "1", total_lyth: "0.00050000" },
      customFeeInputVisible: true,
      speedUpCancelVisible: true,
    });
    expect(failed.passed).toBe(false);
    expect(failed.failures).toEqual(
      expect.arrayContaining([
        "defaultFeeText fee must be 0.0005 LYTH",
        "defaultFeeText exposes detail-only fee term 'gas'",
        "detailTexts[0] exposes inherited fee term 'gas'",
        "structuredFee has unexpected field 'gas_price'",
        "structuredFee.total_lyth must be 0.0005",
        "default surface must not expose custom fee inputs",
        "default surface must not expose speed-up or cancel controls",
      ]),
    );
  });

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

  it("derives deterministic MRV deploy contract addresses", () => {
    const deployer = addressToTypedBech32("user", "0x1111111111111111111111111111111111111111");
    const smartAccount = addressToTypedBech32("smartAccount", "0x1111111111111111111111111111111111111111");
    const artifactHash = "0x598501b99b388ca564905b49040c6d315a55fb13bf34a6f002aa04960a27895d";

    const contract = deriveMrvContractAddress(deployer, 7n, artifactHash);
    const decoded = mrvBech32ToAddress(contract, "contract");

    expect(contract.startsWith("monoc1")).toBe(true);
    expect(decoded.kind).toBe("contract");
    expect(deriveMrvContractAddress(deployer, 7n, artifactHash)).toBe(contract);
    expect(deriveMrvContractAddress(deployer, 8n, artifactHash)).not.toBe(contract);
    expect(deriveMrvContractAddress(smartAccount, 7n, artifactHash)).not.toBe(contract);
    expect(() => deriveMrvContractAddress(deployer, 7n, "0x1234")).toThrow(/artifactHash/);
    expect(() => deriveMrvContractAddress(deployer, -1n, artifactHash)).toThrow(/deployerNonce/);
    expect(() => deriveMrvContractAddress(deployer, 1.5, artifactHash)).toThrow(/deployerNonce/);
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

  it("builds deploy and call request plans without handwritten RPC JSON", () => {
    const user = addressToTypedBech32("user", "0x1111111111111111111111111111111111111111");
    const contract = addressToTypedBech32("contract", "0x2222222222222222222222222222222222222222");
    const artifactHash = "0x598501b99b388ca564905b49040c6d315a55fb13bf34a6f002aa04960a27895d";

    const deploy = buildMrvDeployRequest(Uint8Array.from([0x13, 0x00, 0x00, 0x00]), {
      from: user,
      valueLythoshi: 100_000_000n,
      executionUnitLimit: 1_000_000,
      maxExecutionFeeLythoshi: 25n,
      priorityTipLythoshi: "1",
      nonce: 7n,
    });
    expect(deploy).toEqual({
      from: user,
      artifactBytes: "0x13000000",
      valueLythoshi: "100000000",
      executionUnitLimit: 1_000_000n,
      maxExecutionFeeLythoshi: "25",
      priorityTipLythoshi: "1",
      nonce: 7n,
    });

    const deployPlan = buildMrvDeployPlan("0x13000000", {
      from: user,
      nonce: 7n,
      artifactHash,
    });
    expect(deployPlan.extension).toEqual({ kind: MRV_TX_EXTENSION_KIND, bodyHex: "0x01" });
    expect(deployPlan.expectedContractAddress).toBe(deriveMrvContractAddress(user, 7n, artifactHash));
    expect(deployPlan.request.valueLythoshi).toBe("0");

    const call = buildMrvCallRequest(contract, [0x01, 0x02], { from: user, valueLythoshi: "0" });
    expect(call).toEqual({
      from: user,
      contractAddress: contract,
      input: "0x0102",
      valueLythoshi: "0",
    });

    const callPlan = buildMrvCallPlan(contract, "0x0102");
    expect(callPlan.request).toEqual({ contractAddress: contract, input: "0x0102", valueLythoshi: "0" });
    expect(callPlan.extension.kind).toBe(MRV_TX_EXTENSION_KIND);

    const wire = JSON.stringify(deployPlan, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
    expect(wire).toContain("artifactBytes");
    expect(wire).toContain("valueLythoshi");
    expect(wire).toContain("expectedContractAddress");
    expect(wire).not.toMatch(/\b(gas|gwei|wei)\b/i);
  });

  it("rejects invalid builder options before apps send a request", () => {
    const contract = addressToTypedBech32("contract", "0x2222222222222222222222222222222222222222");
    expect(() => buildMrvDeployRequest([0x13], { valueLythoshi: "01" })).toThrow(/valueLythoshi/);
    expect(() => buildMrvCallRequest(contract, [0x01], { executionUnitLimit: 0n })).toThrow(/executionUnitLimit/);
    expect(() => buildMrvDeployPlan([0x13], { artifactHash: "0x1234" })).toThrow(/artifactHash/);
  });

  it("builds signer-ready MRV deploy and call native transaction plans", () => {
    const user = addressToTypedBech32("user", "0x1111111111111111111111111111111111111111");
    const contract = addressToTypedBech32("contract", "0x2222222222222222222222222222222222222222");
    const artifactHash = "0x598501b99b388ca564905b49040c6d315a55fb13bf34a6f002aa04960a27895d";

    const deploy = buildMrvDeployNativeTxPlan("0x13000000", {
      from: user,
      chainId: 69_420n,
      nonce: 7n,
      executionUnitLimit: 100_000n,
      maxExecutionFeeLythoshi: "25",
      priorityTipLythoshi: 1n,
      artifactHash,
    });
    expect(deploy.expectedContractAddress).toBe(deriveMrvContractAddress(user, 7n, artifactHash));
    expect(deploy.nativeTx).toEqual({
      chainId: 69_420n,
      nonce: 7n,
      valueLythoshi: "0",
      executionUnitLimit: 100_000n,
      maxExecutionFeeLythoshi: "25",
      priorityTipLythoshi: "1",
    });
    expect(deploy.feePreview).toEqual({
      totalLythoshi: "25",
      totalLyth: "0.00000025",
      cyclesUsed: 100_000n,
      executionUnitLimit: 100_000n,
      maxExecutionFeeLythoshi: "25",
      priorityTipLythoshi: "1",
    });
    expect(deploy.tx).toEqual({
      chainId: 69_420n,
      nonce: 7n,
      maxPriorityFeePerGas: "1",
      maxFeePerGas: "25",
      gasLimit: 100_000n,
      to: null,
      value: "0",
      input: "0x13000000",
      extensions: [{ kind: MRV_TX_EXTENSION_KIND, bodyHex: "0x01" }],
    });

    const call = buildMrvCallNativeTxPlan(contract, [0x01, 0x02], {
      from: user,
      chainId: 69_420n,
      nonce: 8n,
      executionUnitLimit: 50_000n,
      maxExecutionFeeLythoshi: 10n,
      valueLythoshi: "3",
    });
    expect(call.nativeTx).toEqual({
      chainId: 69_420n,
      nonce: 8n,
      valueLythoshi: "3",
      executionUnitLimit: 50_000n,
      maxExecutionFeeLythoshi: "10",
      priorityTipLythoshi: "0",
    });
    expect(call.feePreview).toEqual({
      totalLythoshi: "10",
      totalLyth: "0.0000001",
      cyclesUsed: 50_000n,
      executionUnitLimit: 50_000n,
      maxExecutionFeeLythoshi: "10",
      priorityTipLythoshi: "0",
    });
    expect(call.tx).toEqual({
      chainId: 69_420n,
      nonce: 8n,
      maxPriorityFeePerGas: "0",
      maxFeePerGas: "10",
      gasLimit: 50_000n,
      to: "0x2222222222222222222222222222222222222222",
      value: "3",
      input: "0x0102",
      extensions: [{ kind: MRV_TX_EXTENSION_KIND, bodyHex: "0x01" }],
    });
    const { tx: _deploySigningAdapter, ...deployAppFacing } = deploy;
    const { tx: _callSigningAdapter, ...callAppFacing } = call;
    const appWire = JSON.stringify(
      [deployAppFacing, callAppFacing],
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    );
    expect(appWire).not.toMatch(/gas|gwei|wei/i);
  });

  it("submits MRV deploy and call plans through encrypted native envelopes", async () => {
    const backend = MlDsa65Backend.fromSeed(new Uint8Array(ML_DSA_65_SEED_LEN).fill(0x41));
    const user = addressToTypedBech32("user", backend.getAddress());
    const contract = addressToTypedBech32("contract", "0x2222222222222222222222222222222222222222");
    const encryptionKey = {
      algo: "ml-kem-768",
      epoch: 9n,
      encapsulationKey: new Uint8Array(ML_KEM_768_ENCAPSULATION_KEY_LEN).fill(0x33),
    };
    const { fetch, calls } = mockFetchSequence([
      {
        algo: encryptionKey.algo,
        epoch: encryptionKey.epoch.toString(),
        encapsulationKey: bytesToHex(encryptionKey.encapsulationKey),
      },
      `0x${"aa".repeat(32)}`,
      `0x${"bb".repeat(32)}`,
    ]);
    const client = new RpcClient("http://node", { fetch });

    const deploy = await submitMrvDeployNativeTx(client, backend, "0x13000000", {
      from: user,
      chainId: 69_420n,
      nonce: 7n,
      executionUnitLimit: 100_000n,
      maxExecutionFeeLythoshi: "25",
      priorityTipLythoshi: "1",
      class: MempoolClass.ContractCall,
    });
    expect(deploy.txHash).toBe(`0x${"aa".repeat(32)}`);
    expect(deploy.request.artifactBytes).toBe("0x13000000");
    expect(deploy.nativeTx.maxExecutionFeeLythoshi).toBe("25");
    expect(deploy.feePreview.totalLyth).toBe("0.00000025");
    expect(deploy.innerSighashHex).toMatch(/^0x[0-9a-f]{64}$/);
    expect(deploy.innerTxHashHex).toMatch(/^0x[0-9a-f]{64}$/);
    expect(deploy.envelopeWireHex.startsWith("0x")).toBe(true);
    expect(deploy.innerWireBytes).toBeGreaterThan(0);

    const call = await submitMrvCallNativeTx(client, backend, contract, [0x01, 0x02], {
      from: user,
      chainId: 69_420n,
      nonce: 8n,
      executionUnitLimit: 50_000n,
      maxExecutionFeeLythoshi: "10",
      valueLythoshi: "3",
      encryptionKey,
    });
    expect(call.txHash).toBe(`0x${"bb".repeat(32)}`);
    expect(call.request.contractAddress).toBe(contract);
    expect(call.nativeTx.valueLythoshi).toBe("3");
    expect(call.feePreview.totalLythoshi).toBe("10");

    expect(calls.map((c) => c.method)).toEqual([
      "lyth_getEncryptionKey",
      "lyth_submitEncrypted",
      "lyth_submitEncrypted",
    ]);
    expect(calls[0].params).toEqual([]);
    expect(calls[1].params).toEqual([deploy.envelopeWireHex]);
    expect(calls[2].params).toEqual([call.envelopeWireHex]);
    const { tx: _deploySigningAdapter, ...deployAppFacing } = deploy;
    const { tx: _callSigningAdapter, ...callAppFacing } = call;
    const appWire = JSON.stringify(
      [deployAppFacing, callAppFacing],
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    );
    expect(appWire).not.toMatch(/gas|gwei|wei/i);
  });
});
