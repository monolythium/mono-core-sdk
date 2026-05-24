import { blake3 } from "@noble/hashes/blake3.js";
import { ADDRESS_KIND_HRPS, addressToTypedBech32, typedBech32ToAddress } from "./address.js";
import {
  buildEncryptedSubmission,
  fetchEncryptionKey,
  submitEncryptedEnvelope,
  type EncryptionKey,
} from "./crypto/submission.js";
import { BincodeWriter } from "./crypto/bincode.js";

export type { MrvAbiManifest } from "./bindings/MrvAbiManifest.js";
export type { MrvAbiParam } from "./bindings/MrvAbiParam.js";
export type { MrvAbiSymbol } from "./bindings/MrvAbiSymbol.js";
export type { MrvAbiSymbolKind } from "./bindings/MrvAbiSymbolKind.js";
export type { MrvAbiType } from "./bindings/MrvAbiType.js";
export type { MrvAddressKind } from "./bindings/MrvAddressKind.js";
export type { MrvArtifactMetadata } from "./bindings/MrvArtifactMetadata.js";
export type { MrvBuildMetadata } from "./bindings/MrvBuildMetadata.js";
export type { MrvCallRequest } from "./bindings/MrvCallRequest.js";
export type { MrvCallResponse } from "./bindings/MrvCallResponse.js";
export type { MrvCallStatus } from "./bindings/MrvCallStatus.js";
export type { MrvDeployPayload } from "./bindings/MrvDeployPayload.js";
export type { MrvDeployRequest } from "./bindings/MrvDeployRequest.js";
export type { MrvDeployResponse } from "./bindings/MrvDeployResponse.js";
export type { MrvEventRecord } from "./bindings/MrvEventRecord.js";
export type { MrvExecutionReceipt } from "./bindings/MrvExecutionReceipt.js";
export type { MrvMemoryLimits } from "./bindings/MrvMemoryLimits.js";
export type { MrvMeterCounters } from "./bindings/MrvMeterCounters.js";
export type { MrvNativeStateDelta } from "./bindings/MrvNativeStateDelta.js";
export type { MrvResolvedSyscall } from "./bindings/MrvResolvedSyscall.js";
export type { MrvRevertPayload } from "./bindings/MrvRevertPayload.js";
export type { MrvRiscvProfile } from "./bindings/MrvRiscvProfile.js";
export type { MrvStorageNamespace } from "./bindings/MrvStorageNamespace.js";
export type { MrvSyscallImport } from "./bindings/MrvSyscallImport.js";
export type { MrvTransactionExtension } from "./bindings/MrvTransactionExtension.js";
export type { MrvTypedAddress } from "./bindings/MrvTypedAddress.js";
export type { MrvValidatedArtifactMetadata } from "./bindings/MrvValidatedArtifactMetadata.js";

import type { AddressKind } from "./address.js";
import type { MrvAbiManifest } from "./bindings/MrvAbiManifest.js";
import type { MrvAbiType } from "./bindings/MrvAbiType.js";
import type { MrvAddressKind } from "./bindings/MrvAddressKind.js";
import type { MrvArtifactMetadata } from "./bindings/MrvArtifactMetadata.js";
import type { MrvCallRequest } from "./bindings/MrvCallRequest.js";
import type { MrvDeployRequest } from "./bindings/MrvDeployRequest.js";
import type { MrvResolvedSyscall } from "./bindings/MrvResolvedSyscall.js";
import type { MrvTransactionExtension } from "./bindings/MrvTransactionExtension.js";
import type { MrvValidatedArtifactMetadata } from "./bindings/MrvValidatedArtifactMetadata.js";
import type { RpcClient } from "./client.js";
import type { MempoolClass } from "./crypto/envelope.js";
import type { MlDsa65Backend } from "./crypto/ml-dsa.js";
import type { NativeEvmTxFields, NativeTxExtensionLike } from "./crypto/tx.js";
import type { NativeReceiptFee } from "./client.js";

export type MrvBytesLike = string | Uint8Array | readonly number[];
export type MrvDecimalLike = string | number | bigint;

export interface MrvRequestBuildOptions {
  from?: string;
  valueLythoshi?: MrvDecimalLike;
  executionUnitLimit?: number | bigint;
  maxExecutionFeeLythoshi?: MrvDecimalLike;
  priorityTipLythoshi?: MrvDecimalLike;
  nonce?: number | bigint;
}

export interface MrvDeployPlanOptions extends MrvRequestBuildOptions {
  artifactHash?: string;
}

export interface MrvDeployPayloadRequestOptions extends MrvRequestBuildOptions {
  constructorInput?: MrvBytesLike | null;
}

export interface MrvDeployPayloadPlanOptions extends MrvDeployPayloadRequestOptions {
  artifactHash?: string;
}

export interface MrvDeployPlan {
  request: MrvDeployRequest;
  extension: MrvTransactionExtension;
  expectedContractAddress?: string;
}

export interface MrvCallPlan {
  request: MrvCallRequest;
  extension: MrvTransactionExtension;
}

export type MrvDeployNativeTxOptions = Omit<
  MrvDeployPlanOptions,
  "executionUnitLimit" | "maxExecutionFeeLythoshi" | "nonce"
> & {
  chainId: number | bigint;
  nonce: number | bigint;
  executionUnitLimit: number | bigint;
  maxExecutionFeeLythoshi: MrvDecimalLike;
};

export type MrvDeployPayloadNativeTxOptions = Omit<
  MrvDeployPayloadPlanOptions,
  "executionUnitLimit" | "maxExecutionFeeLythoshi" | "nonce"
> & {
  chainId: number | bigint;
  nonce: number | bigint;
  executionUnitLimit: number | bigint;
  maxExecutionFeeLythoshi: MrvDecimalLike;
};

export type MrvCallNativeTxOptions = Omit<
  MrvRequestBuildOptions,
  "executionUnitLimit" | "maxExecutionFeeLythoshi" | "nonce"
> & {
  chainId: number | bigint;
  nonce: number | bigint;
  executionUnitLimit: number | bigint;
  maxExecutionFeeLythoshi: MrvDecimalLike;
};

export interface MrvNativeTxFacade {
  chainId: bigint;
  nonce: bigint;
  valueLythoshi: string;
  executionUnitLimit: bigint;
  maxExecutionFeeLythoshi: string;
  priorityTipLythoshi: string;
}

export interface MrvNativeFeePreview {
  totalLythoshi: string;
  totalLyth: string;
  cyclesUsed: bigint;
  executionUnitLimit: bigint;
  maxExecutionFeeLythoshi: string;
  priorityTipLythoshi: string;
}

export interface MrvDeployNativeTxPlan extends MrvDeployPlan {
  nativeTx: MrvNativeTxFacade;
  feePreview: MrvNativeFeePreview;
  tx: NativeEvmTxFields;
}

export interface MrvCallNativeTxPlan extends MrvCallPlan {
  nativeTx: MrvNativeTxFacade;
  feePreview: MrvNativeFeePreview;
  tx: NativeEvmTxFields;
}

export interface MrvEncryptedSubmissionResult {
  envelopeWireHex: string;
  innerSighashHex: string;
  innerTxHashHex: string;
  innerWireBytes: number;
  txHash: string;
}

export type MrvDeploySubmitOptions = MrvDeployNativeTxOptions & {
  encryptionKey?: EncryptionKey;
  class?: MempoolClass;
};

export type MrvDeployPayloadSubmitOptions = MrvDeployPayloadNativeTxOptions & {
  encryptionKey?: EncryptionKey;
  class?: MempoolClass;
};

export type MrvCallSubmitOptions = MrvCallNativeTxOptions & {
  encryptionKey?: EncryptionKey;
  class?: MempoolClass;
};

export type MrvDeploySubmission = MrvDeployNativeTxPlan & MrvEncryptedSubmissionResult;
export type MrvDeployPayloadSubmission = MrvDeployNativeTxPlan & MrvEncryptedSubmissionResult;
export type MrvCallSubmission = MrvCallNativeTxPlan & MrvEncryptedSubmissionResult;

export const MRV_FORMAT_VERSION = 1 as const;
export const MRV_DEPLOY_PAYLOAD_VERSION = 1 as const;
export const MRV_PROFILE_MONO_RV32IM_V1 = "mono_rv32im_v1" as const;
export const MRV_MEMORY_PAGE_BYTES = 65_536 as const;
export const MRV_MAX_CODE_BYTES = 16 * 1024 * 1024;
export const MRV_MAX_DEBUG_BYTES = 16 * 1024 * 1024;
export const MRV_MAX_MEMORY_PAGES = 1024 as const;
export const MRV_MAX_ABI_SYMBOLS = 1024 as const;
export const MRV_MAX_STORAGE_NAMESPACE_BYTES = 64 as const;
export const LYTH_DECIMALS = 8 as const;
export const NATIVE_LYTH_DECIMALS = LYTH_DECIMALS;
export const LYTHOSHI_PER_LYTH = 100_000_000n;
export const MRV_TX_EXTENSION_KIND = 0x30 as const;
export const MRV_TX_EXTENSION_V1 = 0x01 as const;

const MRV_CODE_HASH_DOMAIN = new TextEncoder().encode("MONO_MRV_CODE_V1");
const MRV_CONTRACT_ADDRESS_DOMAIN = new TextEncoder().encode("mono:riscv:contract-address:v1");
const MONO_SYSCALL_MODULE = "mono";

const SYSCALLS = [
  [0x0101, "storage_read"],
  [0x0102, "storage_write"],
  [0x0103, "storage_delete"],
  [0x0201, "caller"],
  [0x0202, "contract_address"],
  [0x0203, "block_height"],
  [0x0204, "block_hash"],
  [0x0301, "call_contract"],
  [0x0302, "emit_event"],
  [0x0303, "transfer_native"],
  [0x0401, "verify_signature"],
  [0x0402, "hash"],
  [0x0501, "revert"],
] as const;

const SYSCALL_NAME_BY_ID = new Map<number, string>(SYSCALLS);
const SYSCALL_ID_BY_NAME = new Map<string, number>(SYSCALLS.map(([id, name]) => [name, id]));

export class MrvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MrvValidationError";
  }
}

export interface LythFormatOptions {
  includeUnit?: boolean;
}

export const MRV_STRUCTURED_FEE_FIELDS = [
  "total_lythoshi",
  "cycles_used",
  "base_price_per_cycle_lythoshi",
  "state_io_units",
  "state_io_price_per_unit_lythoshi",
  "priority_tip_lythoshi",
] as const;

export interface MrvFeeDisplayConformanceInput {
  expectedTotalLythoshi: MrvDecimalLike;
  defaultFeeText: string;
  detailTexts?: readonly string[];
  structuredFee?: unknown;
  customFeeInputVisible?: boolean;
  speedUpCancelVisible?: boolean;
}

export interface MrvFeeDisplayConformanceReport {
  passed: boolean;
  failures: string[];
  expectedDefaultFeeText: string;
}

export interface MrvStructuredFeeConformanceOptions {
  expectedTotalLythoshi?: MrvDecimalLike;
  label?: string;
}

export interface MrvStructuredFeeConformanceReport {
  passed: boolean;
  failures: string[];
}

export interface NativeReceiptFeeDisplay {
  defaultFeeText: string;
  detailTexts: string[];
  totalLythoshi: string;
  totalLyth: string;
}

export function formatLyth(lythoshi: MrvDecimalLike, options: LythFormatOptions = {}): string {
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

export function formatLythoshi(lythoshi: MrvDecimalLike, options: LythFormatOptions = {}): string {
  return formatLyth(lythoshi, options);
}

export function parseLythToLythoshi(input: string): bigint {
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
    throw new MrvValidationError("lyth amount supports at most 8 decimal places");
  }
  const whole = BigInt(wholeRaw.replaceAll(",", ""));
  const fraction = fractionRaw === "" ? 0n : BigInt(fractionRaw.padEnd(NATIVE_LYTH_DECIMALS, "0"));
  return whole * LYTHOSHI_PER_LYTH + fraction;
}

export function checkMrvFeeDisplayConformance(
  input: MrvFeeDisplayConformanceInput,
): MrvFeeDisplayConformanceReport {
  const expectedTotalLythoshi = normalizeDecimalLike("expectedTotalLythoshi", input.expectedTotalLythoshi);
  const expectedDefaultFeeText = formatLyth(expectedTotalLythoshi);
  const failures: string[] = [];
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
      failures.push("defaultFeeText fee must be a canonical 8-decimal LYTH amount");
    }
  }

  const defaultForbidden = firstForbiddenDefaultFeeTerm(input.defaultFeeText);
  if (defaultForbidden !== undefined) {
    failures.push(`defaultFeeText exposes detail-only fee term '${defaultForbidden}'`);
  }

  for (const [index, detailText] of (input.detailTexts ?? []).entries()) {
    const detailForbidden = firstForbiddenDetailFeeTerm(detailText);
    if (detailForbidden !== undefined) {
      failures.push(`detailTexts[${index}] exposes inherited fee term '${detailForbidden}'`);
    }
  }

  if (input.structuredFee !== undefined) {
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
    expectedDefaultFeeText,
  };
}

export function checkMrvStructuredFeeConformance(
  value: unknown,
  options: MrvStructuredFeeConformanceOptions = {},
): MrvStructuredFeeConformanceReport {
  const failures: string[] = [];
  const expectedTotalLythoshi =
    options.expectedTotalLythoshi === undefined
      ? undefined
      : normalizeDecimalLike("expectedTotalLythoshi", options.expectedTotalLythoshi);
  checkStructuredFeeObject(
    value,
    expectedTotalLythoshi,
    failures,
    options.label ?? "structuredFee",
  );
  return {
    passed: failures.length === 0,
    failures,
  };
}

export function assertMrvStructuredFeeConformance(
  value: unknown,
  options: MrvStructuredFeeConformanceOptions = {},
): asserts value is NativeReceiptFee {
  const report = checkMrvStructuredFeeConformance(value, options);
  if (!report.passed) {
    throw new MrvValidationError(`structured fee conformance failed: ${report.failures.join("; ")}`);
  }
}

export function assertMrvFeeDisplayConformance(input: MrvFeeDisplayConformanceInput): void {
  const report = checkMrvFeeDisplayConformance(input);
  if (!report.passed) {
    throw new MrvValidationError(`fee display conformance failed: ${report.failures.join("; ")}`);
  }
}

export function formatNativeReceiptFeeDisplay(
  fee: Pick<
    NativeReceiptFee,
    | "total_lythoshi"
    | "cycles_used"
    | "state_io_units"
    | "base_price_per_cycle_lythoshi"
    | "state_io_price_per_unit_lythoshi"
    | "priority_tip_lythoshi"
  >,
): NativeReceiptFeeDisplay {
  const totalLythoshi = normalizeDecimalLike("fee.total_lythoshi", fee.total_lythoshi);
  const totalLyth = formatLyth(totalLythoshi, { includeUnit: false });
  return {
    defaultFeeText: `Network fee: ${totalLyth} LYTH`,
    detailTexts: [
      `cycles ${fee.cycles_used}, state I/O ${fee.state_io_units}, total ${totalLythoshi} lythoshi`,
      `cycle price ${fee.base_price_per_cycle_lythoshi} lythoshi, state I/O price ${fee.state_io_price_per_unit_lythoshi} lythoshi, priority tip ${fee.priority_tip_lythoshi} lythoshi`,
    ],
    totalLythoshi,
    totalLyth,
  };
}

export function mrvCodeHashHex(code: MrvBytesLike): string {
  const codeBytes = bytesFrom(code, "code");
  const len = new Uint8Array(8);
  new DataView(len.buffer).setBigUint64(0, BigInt(codeBytes.length), false);
  return bytesToHex(blake3(concatBytes(MRV_CODE_HASH_DOMAIN, len, codeBytes)));
}

export function mrvV1TransactionExtension(): MrvTransactionExtension {
  return { kind: MRV_TX_EXTENSION_KIND, bodyHex: "0x01" };
}

export function encodeMrvDeployPayload(
  artifactBytes: MrvBytesLike,
  constructorInput?: MrvBytesLike | null,
): string {
  const artifact = bytesFrom(artifactBytes, "artifactBytes");
  const w = new BincodeWriter();
  w.u16(MRV_DEPLOY_PAYLOAD_VERSION);
  w.bytes(artifact);
  if (constructorInput === undefined || constructorInput === null) {
    w.u8(0);
  } else {
    const constructor = bytesFrom(constructorInput, "constructorInput");
    w.u8(1);
    w.bytes(constructor);
  }
  return bytesToHex(w.toBytes());
}

export function mrvAddressToBech32(kind: MrvAddressKind, bytes: MrvBytesLike): string {
  return addressToTypedBech32(kind as AddressKind, bytesFrom(bytes, "address"));
}

export function mrvBech32ToAddress(address: string, expectedKind?: MrvAddressKind) {
  return typedBech32ToAddress(address, expectedKind as AddressKind | undefined);
}

export function deriveMrvContractAddress(
  deployerAddress: string,
  deployerNonce: number | bigint,
  artifactHashHex: string,
): string {
  const deployer = typedBech32ToAddress(deployerAddress);
  const artifactHash = hexToBytes(artifactHashHex, "artifactHash");
  if (artifactHash.length !== 32) throw new MrvValidationError("artifactHash must be 32 bytes");
  const nonceValue = normalizeU64(deployerNonce, "deployerNonce");
  const nonce = new Uint8Array(8);
  new DataView(nonce.buffer).setBigUint64(0, nonceValue, false);
  const digest = blake3(
    concatBytes(
      MRV_CONTRACT_ADDRESS_DOMAIN,
      new TextEncoder().encode(ADDRESS_KIND_HRPS[deployer.kind]),
      Uint8Array.of(0),
      hexToBytes(deployer.hex, "deployerAddress"),
      nonce,
      artifactHash,
    ),
  );
  return addressToTypedBech32("contract", digest.slice(0, 20));
}

export function validateMrvArtifactMetadata(
  metadata: MrvArtifactMetadata,
  code: MrvBytesLike,
): MrvValidatedArtifactMetadata {
  const codeBytes = bytesFrom(code, "code");
  if (metadata.formatVersion !== MRV_FORMAT_VERSION) {
    throw new MrvValidationError(
      `unsupported MRV format version ${metadata.formatVersion}, expected ${MRV_FORMAT_VERSION}`,
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
      `metadata codeBytes ${metadata.codeBytes.toString()} does not match supplied code length ${codeBytes.length}`,
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
    codeBytes: BigInt(codeBytes.length),
  };
}

export function validateMrvDeployRequest(request: MrvDeployRequest): void {
  if (request.from !== undefined) typedBech32ToAddress(request.from, "user");
  hexToBytes(request.artifactBytes, "artifactBytes");
  validateDecimal("valueLythoshi", request.valueLythoshi);
  validateOptionalDecimal("maxExecutionFeeLythoshi", request.maxExecutionFeeLythoshi);
  validateOptionalDecimal("priorityTipLythoshi", request.priorityTipLythoshi);
  validateExecutionUnitLimit("executionUnitLimit", request.executionUnitLimit);
}

export function validateMrvCallRequest(request: MrvCallRequest): void {
  if (request.from !== undefined) typedBech32ToAddress(request.from, "user");
  typedBech32ToAddress(request.contractAddress, "contract");
  hexToBytes(request.input, "input");
  validateDecimal("valueLythoshi", request.valueLythoshi);
  validateOptionalDecimal("maxExecutionFeeLythoshi", request.maxExecutionFeeLythoshi);
  validateOptionalDecimal("priorityTipLythoshi", request.priorityTipLythoshi);
  validateExecutionUnitLimit("executionUnitLimit", request.executionUnitLimit);
}

export function buildMrvDeployRequest(
  artifactBytes: MrvBytesLike,
  options: MrvRequestBuildOptions = {},
): MrvDeployRequest {
  const request: MrvDeployRequest = {
    artifactBytes: normalizeBytesHex(artifactBytes, "artifactBytes"),
    valueLythoshi: normalizeDecimalLike("valueLythoshi", options.valueLythoshi, "0"),
  };
  applyRequestOptions(request, options);
  validateMrvDeployRequest(request);
  return request;
}

export function buildMrvDeployPayloadRequest(
  artifactBytes: MrvBytesLike,
  options: MrvDeployPayloadRequestOptions = {},
): MrvDeployRequest {
  const request = buildMrvDeployRequest(
    encodeMrvDeployPayload(artifactBytes, options.constructorInput),
    options,
  );
  return request;
}

export function buildMrvCallRequest(
  contractAddress: string,
  input: MrvBytesLike = "0x",
  options: MrvRequestBuildOptions = {},
): MrvCallRequest {
  const request: MrvCallRequest = {
    contractAddress,
    input: normalizeBytesHex(input, "input"),
    valueLythoshi: normalizeDecimalLike("valueLythoshi", options.valueLythoshi, "0"),
  };
  applyRequestOptions(request, options);
  validateMrvCallRequest(request);
  return request;
}

export function buildMrvDeployPlan(
  artifactBytes: MrvBytesLike,
  options: MrvDeployPlanOptions = {},
): MrvDeployPlan {
  const request = buildMrvDeployRequest(artifactBytes, options);
  const plan: MrvDeployPlan = {
    request,
    extension: mrvV1TransactionExtension(),
  };
  if (options.artifactHash !== undefined && request.from !== undefined && request.nonce !== undefined) {
    plan.expectedContractAddress = deriveMrvContractAddress(request.from, request.nonce, options.artifactHash);
  } else if (options.artifactHash !== undefined) {
    validateHexLength("artifactHash", options.artifactHash, 32);
  }
  return plan;
}

export function buildMrvDeployPayloadPlan(
  artifactBytes: MrvBytesLike,
  options: MrvDeployPayloadPlanOptions = {},
): MrvDeployPlan {
  const request = buildMrvDeployPayloadRequest(artifactBytes, options);
  const plan: MrvDeployPlan = {
    request,
    extension: mrvV1TransactionExtension(),
  };
  if (options.artifactHash !== undefined && request.from !== undefined && request.nonce !== undefined) {
    plan.expectedContractAddress = deriveMrvContractAddress(request.from, request.nonce, options.artifactHash);
  } else if (options.artifactHash !== undefined) {
    validateHexLength("artifactHash", options.artifactHash, 32);
  }
  return plan;
}

export function buildMrvCallPlan(
  contractAddress: string,
  input: MrvBytesLike = "0x",
  options: MrvRequestBuildOptions = {},
): MrvCallPlan {
  return {
    request: buildMrvCallRequest(contractAddress, input, options),
    extension: mrvV1TransactionExtension(),
  };
}

export function buildMrvDeployNativeTxPlan(
  artifactBytes: MrvBytesLike,
  options: MrvDeployNativeTxOptions,
): MrvDeployNativeTxPlan {
  const chainId = normalizeU64(options.chainId, "chainId");
  const nonce = normalizeU64(options.nonce, "nonce");
  const executionUnitLimit = normalizeU64(options.executionUnitLimit, "executionUnitLimit");
  const maxExecutionFee = normalizeDecimalLike("maxExecutionFeeLythoshi", options.maxExecutionFeeLythoshi);
  const priorityTip =
    options.priorityTipLythoshi === undefined
      ? undefined
      : normalizeDecimalLike("priorityTipLythoshi", options.priorityTipLythoshi);
  const plan = buildMrvDeployPlan(artifactBytes, {
    ...options,
    nonce,
    executionUnitLimit,
    maxExecutionFeeLythoshi: maxExecutionFee,
    priorityTipLythoshi: priorityTip,
  });
  return {
    ...plan,
    nativeTx: {
      chainId,
      nonce,
      valueLythoshi: plan.request.valueLythoshi,
      executionUnitLimit,
      maxExecutionFeeLythoshi: maxExecutionFee,
      priorityTipLythoshi: priorityTip ?? "0",
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
      extensions: [plan.extension],
    },
  };
}

export function buildMrvDeployPayloadNativeTxPlan(
  artifactBytes: MrvBytesLike,
  options: MrvDeployPayloadNativeTxOptions,
): MrvDeployNativeTxPlan {
  const chainId = normalizeU64(options.chainId, "chainId");
  const nonce = normalizeU64(options.nonce, "nonce");
  const executionUnitLimit = normalizeU64(options.executionUnitLimit, "executionUnitLimit");
  const maxExecutionFee = normalizeDecimalLike("maxExecutionFeeLythoshi", options.maxExecutionFeeLythoshi);
  const priorityTip =
    options.priorityTipLythoshi === undefined
      ? undefined
      : normalizeDecimalLike("priorityTipLythoshi", options.priorityTipLythoshi);
  const plan = buildMrvDeployPayloadPlan(artifactBytes, {
    ...options,
    nonce,
    executionUnitLimit,
    maxExecutionFeeLythoshi: maxExecutionFee,
    priorityTipLythoshi: priorityTip,
  });
  return {
    ...plan,
    nativeTx: {
      chainId,
      nonce,
      valueLythoshi: plan.request.valueLythoshi,
      executionUnitLimit,
      maxExecutionFeeLythoshi: maxExecutionFee,
      priorityTipLythoshi: priorityTip ?? "0",
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
      extensions: [plan.extension],
    },
  };
}

export function buildMrvCallNativeTxPlan(
  contractAddress: string,
  input: MrvBytesLike,
  options: MrvCallNativeTxOptions,
): MrvCallNativeTxPlan {
  const chainId = normalizeU64(options.chainId, "chainId");
  const nonce = normalizeU64(options.nonce, "nonce");
  const executionUnitLimit = normalizeU64(options.executionUnitLimit, "executionUnitLimit");
  const maxExecutionFee = normalizeDecimalLike("maxExecutionFeeLythoshi", options.maxExecutionFeeLythoshi);
  const priorityTip =
    options.priorityTipLythoshi === undefined
      ? undefined
      : normalizeDecimalLike("priorityTipLythoshi", options.priorityTipLythoshi);
  const plan = buildMrvCallPlan(contractAddress, input, {
    ...options,
    nonce,
    executionUnitLimit,
    maxExecutionFeeLythoshi: maxExecutionFee,
    priorityTipLythoshi: priorityTip,
  });
  return {
    ...plan,
    nativeTx: {
      chainId,
      nonce,
      valueLythoshi: plan.request.valueLythoshi,
      executionUnitLimit,
      maxExecutionFeeLythoshi: maxExecutionFee,
      priorityTipLythoshi: priorityTip ?? "0",
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
      extensions: [plan.extension],
    },
  };
}

export function assertMrvDeployNativeSubmissionPlan(plan: MrvDeployNativeTxPlan): void {
  assertMrvNativeSubmissionEnvelope(plan);
  if (plan.tx.to !== null) {
    throw new MrvValidationError("MRV deploy submission tx.to must be null");
  }
  const txInput = normalizeBytesHex(plan.tx.input ?? "0x", "tx.input");
  if (txInput !== plan.request.artifactBytes) {
    throw new MrvValidationError("MRV deploy submission tx.input must match artifactBytes");
  }
}

export function assertMrvCallNativeSubmissionPlan(plan: MrvCallNativeTxPlan): void {
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

function buildMrvNativeFeePreview(
  executionUnitLimit: bigint,
  maxExecutionFeeLythoshi: string,
  priorityTipLythoshi: string,
): MrvNativeFeePreview {
  const totalLythoshi = normalizeDecimalLike("maxExecutionFeeLythoshi", maxExecutionFeeLythoshi);
  return {
    totalLythoshi,
    totalLyth: formatLyth(totalLythoshi, { includeUnit: false }),
    cyclesUsed: executionUnitLimit,
    executionUnitLimit,
    maxExecutionFeeLythoshi: totalLythoshi,
    priorityTipLythoshi: normalizeDecimalLike("priorityTipLythoshi", priorityTipLythoshi),
  };
}

export async function submitMrvDeployNativeTx(
  client: RpcClient,
  backend: MlDsa65Backend,
  artifactBytes: MrvBytesLike,
  options: MrvDeploySubmitOptions,
): Promise<MrvDeploySubmission> {
  const plan = buildMrvDeployNativeTxPlan(artifactBytes, options);
  assertMrvDeployNativeSubmissionPlan(plan);
  const submission = await buildEncryptedSubmission({
    backend,
    tx: plan.tx,
    encryptionKey: options.encryptionKey ?? (await fetchEncryptionKey(client)),
    class: options.class,
  });
  return {
    ...plan,
    ...submission,
    txHash: await submitEncryptedEnvelope(client, submission.envelopeWireHex),
  };
}

export async function submitMrvDeployPayloadNativeTx(
  client: RpcClient,
  backend: MlDsa65Backend,
  artifactBytes: MrvBytesLike,
  options: MrvDeployPayloadSubmitOptions,
): Promise<MrvDeployPayloadSubmission> {
  const plan = buildMrvDeployPayloadNativeTxPlan(artifactBytes, options);
  assertMrvDeployNativeSubmissionPlan(plan);
  const submission = await buildEncryptedSubmission({
    backend,
    tx: plan.tx,
    encryptionKey: options.encryptionKey ?? (await fetchEncryptionKey(client)),
    class: options.class,
  });
  return {
    ...plan,
    ...submission,
    txHash: await submitEncryptedEnvelope(client, submission.envelopeWireHex),
  };
}

export async function submitMrvCallNativeTx(
  client: RpcClient,
  backend: MlDsa65Backend,
  contractAddress: string,
  input: MrvBytesLike,
  options: MrvCallSubmitOptions,
): Promise<MrvCallSubmission> {
  const plan = buildMrvCallNativeTxPlan(contractAddress, input, options);
  assertMrvCallNativeSubmissionPlan(plan);
  const submission = await buildEncryptedSubmission({
    backend,
    tx: plan.tx,
    encryptionKey: options.encryptionKey ?? (await fetchEncryptionKey(client)),
    class: options.class,
  });
  return {
    ...plan,
    ...submission,
    txHash: await submitEncryptedEnvelope(client, submission.envelopeWireHex),
  };
}

function assertMrvNativeSubmissionEnvelope(plan: MrvDeployNativeTxPlan | MrvCallNativeTxPlan): void {
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

function assertMrvV1Extension(extension: NativeTxExtensionLike, field: string): void {
  if (extension.kind !== MRV_TX_EXTENSION_KIND) {
    throw new MrvValidationError(`${field}.kind must be MRV v1 extension kind`);
  }
  const bodyHex = normalizeBytesHex("bodyHex" in extension ? extension.bodyHex : extension.body, `${field}.body`);
  if (bodyHex !== "0x01") {
    throw new MrvValidationError(`${field}.body must be MRV v1 extension body`);
  }
}

function assertSameBigint(field: string, actual: bigint | number | string, expected: bigint): void {
  if (normalizeU64Like(actual, field) !== expected) {
    throw new MrvValidationError(`${field} must match nativeTx`);
  }
}

function assertSameDecimal(field: string, actual: MrvDecimalLike, expected: string): void {
  if (normalizeDecimalLike(field, actual) !== expected) {
    throw new MrvValidationError(`${field} must match nativeTx`);
  }
}

function assertU128Lythoshi(field: string, value: MrvDecimalLike): void {
  const normalized = BigInt(normalizeDecimalLike(field, value));
  if (normalized > (1n << 128n) - 1n) {
    throw new MrvValidationError(`${field} must fit in u128 for encrypted submission`);
  }
}

function normalizeNativeTxToHex(value: NativeEvmTxFields["to"], field: string): string | null {
  if (value === null) return null;
  const bytes = bytesFrom(value, field);
  if (bytes.length !== 20) {
    throw new MrvValidationError(`${field} must be a 20-byte address`);
  }
  return bytesToHex(bytes).toLowerCase();
}

function normalizeU64Like(value: bigint | number | string, field: string): bigint {
  if (typeof value === "string") {
    return normalizeU64(BigInt(normalizeDecimalLike(field, value)), field);
  }
  return normalizeU64(value, field);
}

function validateMemory(initialPages: number, maxPages: number, stackBytes: number): void {
  if (initialPages === 0) throw new MrvValidationError("initialPages is zero");
  if (maxPages === 0) throw new MrvValidationError("maxPages is zero");
  if (initialPages > maxPages) throw new MrvValidationError("initialPages exceeds maxPages");
  if (maxPages > MRV_MAX_MEMORY_PAGES) throw new MrvValidationError("maxPages exceeds bound");
  if (stackBytes === 0) throw new MrvValidationError("stackBytes is zero");
  const maxBytes = maxPages * MRV_MEMORY_PAGE_BYTES;
  if (stackBytes > maxBytes) throw new MrvValidationError("stackBytes exceeds max memory");
  if (stackBytes % 16 !== 0) throw new MrvValidationError("stackBytes must be 16-byte aligned");
}

function validateStorageNamespace(name: string, version: number): void {
  if (version === 0) throw new MrvValidationError("storage namespace version must be non-zero");
  if (name.length > MRV_MAX_STORAGE_NAMESPACE_BYTES) throw new MrvValidationError("storage namespace is too long");
  if (!isIdentifier(name)) throw new MrvValidationError("storage namespace is not canonical");
}

function validateAbi(abi: MrvAbiManifest): void {
  if (abi.symbols.length === 0) throw new MrvValidationError("MRV ABI must declare at least one symbol");
  if (abi.symbols.length > MRV_MAX_ABI_SYMBOLS) {
    throw new MrvValidationError(`MRV ABI has ${abi.symbols.length} symbols, max ${MRV_MAX_ABI_SYMBOLS}`);
  }
  const seen = new Set<string>();
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

function validateAbiType(ty: MrvAbiType): void {
  if (ty.kind === "fixedBytes" && ty.len === 0) {
    throw new MrvValidationError("fixed bytes length is zero");
  }
}

function validateImports(imports: MrvArtifactMetadata["imports"]): MrvResolvedSyscall[] {
  const seen = new Set<number>();
  const resolved: MrvResolvedSyscall[] = [];
  for (const imp of imports) {
    if (imp.module !== MONO_SYSCALL_MODULE) {
      throw new MrvValidationError(`forbidden host import ${imp.module}.${imp.name}`);
    }
    const expectedName = SYSCALL_NAME_BY_ID.get(imp.id);
    if (expectedName === undefined) throw new MrvValidationError(`unknown MRV syscall id ${imp.id}`);
    const expectedId = SYSCALL_ID_BY_NAME.get(imp.name);
    if (expectedId === undefined) throw new MrvValidationError(`unknown MRV syscall name '${imp.name}'`);
    if (expectedId !== imp.id) {
      throw new MrvValidationError(`MRV syscall name/id mismatch for ${imp.name}: declared ${imp.id}`);
    }
    if (seen.has(imp.id)) throw new MrvValidationError(`duplicate MRV syscall '${expectedName}'`);
    seen.add(imp.id);
    resolved.push({ id: imp.id, name: expectedName });
  }
  return resolved;
}

function validateOptionalDecimal(field: string, value: string | undefined): void {
  if (value !== undefined) validateDecimal(field, value);
}

function applyRequestOptions(request: MrvDeployRequest | MrvCallRequest, options: MrvRequestBuildOptions): void {
  if (options.from !== undefined) request.from = options.from;
  const executionUnitLimit = normalizeOptionalU64("executionUnitLimit", options.executionUnitLimit);
  if (executionUnitLimit !== undefined) request.executionUnitLimit = executionUnitLimit;
  const maxExecutionFee = normalizeOptionalDecimalLike(
    "maxExecutionFeeLythoshi",
    options.maxExecutionFeeLythoshi,
  );
  if (maxExecutionFee !== undefined) request.maxExecutionFeeLythoshi = maxExecutionFee;
  const priorityTip = normalizeOptionalDecimalLike("priorityTipLythoshi", options.priorityTipLythoshi);
  if (priorityTip !== undefined) request.priorityTipLythoshi = priorityTip;
  const nonce = normalizeOptionalU64("nonce", options.nonce);
  if (nonce !== undefined) request.nonce = nonce;
}

function normalizeBytesHex(value: MrvBytesLike, field: string): string {
  return bytesToHex(bytesFrom(value, field));
}

function normalizeOptionalDecimalLike(field: string, value: MrvDecimalLike | undefined): string | undefined {
  return value === undefined ? undefined : normalizeDecimalLike(field, value);
}

function formatWholeWithCommas(value: bigint): string {
  const digits = value.toString();
  const firstGroupLen = digits.length % 3;
  const groups: string[] = [];
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

function stripLythUnit(input: string): string {
  const trimmed = input.trim();
  const withoutUnit = trimmed.replace(/\s+LYTH$/i, "").trim();
  if (withoutUnit.length === 0) {
    throw new MrvValidationError("lyth amount must be a canonical LYTH decimal");
  }
  return withoutUnit;
}

function isCanonicalWholeLyth(value: string): boolean {
  if (/^(0|[1-9][0-9]*)$/.test(value)) {
    return true;
  }
  return /^[1-9][0-9]{0,2}(,[0-9]{3})+$/.test(value);
}

function extractLythAmountCandidates(text: string): string[] {
  return [...text.matchAll(/(?:^|[^A-Za-z0-9_])([0-9][0-9,]*(?:\.[0-9]+)?)\s+LYTH\b/g)].map(
    (match) => match[1],
  );
}

function firstForbiddenDefaultFeeTerm(text: string): string | undefined {
  const tokens = feeTermTokens(text);
  for (const forbidden of ["gas", "gwei", "wei", "cycle", "cycles", "lythoshi"]) {
    if (tokens.includes(forbidden)) return forbidden;
  }
  if (hasAdjacentTerms(tokens, "state", "io") || hasStateIOTerms(tokens)) return "state I/O";
  return undefined;
}

function firstForbiddenDetailFeeTerm(text: string): string | undefined {
  const tokens = feeTermTokens(text);
  for (const forbidden of ["gas", "gwei", "wei"]) {
    if (tokens.includes(forbidden)) return forbidden;
  }
  return undefined;
}

function feeTermTokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

function hasAdjacentTerms(tokens: readonly string[], first: string, second: string): boolean {
  return tokens.some((token, index) => token === first && tokens[index + 1] === second);
}

function hasStateIOTerms(tokens: readonly string[]): boolean {
  return tokens.some((token, index) => token === "state" && tokens[index + 1] === "i" && tokens[index + 2] === "o");
}

function checkStructuredFeeObject(
  value: unknown,
  expectedTotalLythoshi: string | undefined,
  failures: string[],
  label = "structuredFee",
): void {
  if (!isRecord(value)) {
    failures.push(`${label} must be an object`);
    return;
  }
  const expectedFields = new Set<string>([...MRV_STRUCTURED_FEE_FIELDS, "total_lyth"]);
  const actualFields = Object.keys(value);
  for (const field of MRV_STRUCTURED_FEE_FIELDS) {
    if (!(field in value)) failures.push(`${label} is missing '${field}'`);
  }
  for (const field of actualFields) {
    if (!expectedFields.has(field)) failures.push(`${label} has unexpected field '${field}'`);
  }

  const totalLythoshi = stringField(value, "total_lythoshi", failures, label);
  const expectedTotal = expectedTotalLythoshi ?? totalLythoshi;
  if (
    totalLythoshi !== undefined &&
    expectedTotalLythoshi !== undefined &&
    totalLythoshi !== expectedTotalLythoshi
  ) {
    failures.push(`${label}.total_lythoshi must be ${expectedTotalLythoshi}`);
  }
  const totalLyth =
    "total_lyth" in value ? lythDecimalField(value, "total_lyth", failures, label) : undefined;
  if (totalLyth !== undefined && expectedTotal !== undefined) {
    const expectedTotalLyth = formatLyth(expectedTotal, { includeUnit: false });
    if (totalLyth !== expectedTotalLyth) {
      failures.push(`${label}.total_lyth must be ${expectedTotalLyth}`);
    }
  }
  for (const field of [
    "base_price_per_cycle_lythoshi",
    "state_io_price_per_unit_lythoshi",
    "priority_tip_lythoshi",
  ]) {
    stringField(value, field, failures, label);
  }
  for (const field of ["cycles_used", "state_io_units"]) {
    integerField(value, field, failures, label);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(
  value: Record<string, unknown>,
  field: string,
  failures: string[],
  label: string,
): string | undefined {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string" || !isCanonicalUnsignedDecimalString(fieldValue)) {
    failures.push(`${label}.${field} must be a canonical unsigned decimal string`);
    return undefined;
  }
  return fieldValue;
}

function lythDecimalField(
  value: Record<string, unknown>,
  field: string,
  failures: string[],
  label: string,
): string | undefined {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string") {
    failures.push(`${label}.${field} must be a canonical LYTH decimal string`);
    return undefined;
  }
  try {
    parseLythToLythoshi(`${fieldValue} LYTH`);
  } catch {
    failures.push(`${label}.${field} must be a canonical LYTH decimal string`);
    return undefined;
  }
  return fieldValue;
}

function integerField(
  value: Record<string, unknown>,
  field: string,
  failures: string[],
  label: string,
): void {
  const fieldValue = value[field];
  if (
    typeof fieldValue !== "number" ||
    !Number.isSafeInteger(fieldValue) ||
    fieldValue < 0
  ) {
    failures.push(`${label}.${field} must be a non-negative safe integer`);
  }
}

function isCanonicalUnsignedDecimalString(value: string): boolean {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) return false;
  try {
    BigInt(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeDecimalLike(field: string, value: MrvDecimalLike | undefined, defaultValue?: string): string {
  if (value === undefined) {
    if (defaultValue === undefined) throw new MrvValidationError(`${field} is required`);
    return defaultValue;
  }
  if (typeof value === "string") {
    validateDecimal(field, value);
    return value;
  }
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new MrvValidationError(`${field} must be a safe unsigned integer`);
  }
  const out = BigInt(value);
  if (out < 0n) throw new MrvValidationError(`${field} must be a canonical unsigned decimal string`);
  return out.toString();
}

function normalizeOptionalU64(field: string, value: number | bigint | undefined): bigint | undefined {
  return value === undefined ? undefined : normalizeU64(value, field);
}

function validateDecimal(field: string, value: string): void {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new MrvValidationError(`${field} must be a canonical unsigned decimal string`);
  }
  try {
    BigInt(value);
  } catch {
    throw new MrvValidationError(`${field} must be a canonical unsigned decimal string`);
  }
}

function validateExecutionUnitLimit(field: string, value: number | bigint | undefined): void {
  if (value !== undefined && BigInt(value) === 0n) {
    throw new MrvValidationError(`${field} must be greater than zero`);
  }
}

function normalizeU64(value: number | bigint, field: string): bigint {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new MrvValidationError(`${field} must be a safe unsigned integer`);
  }
  const out = BigInt(value);
  if (out < 0n || out > 0xffff_ffff_ffff_ffffn) {
    throw new MrvValidationError(`${field} must fit in u64`);
  }
  return out;
}

function validateHexLength(field: string, value: string, expected: number): void {
  const bytes = hexToBytes(value, field);
  if (bytes.length !== expected) throw new MrvValidationError(`${field} must be ${expected} bytes`);
}

function bytesFrom(value: MrvBytesLike, field: string): Uint8Array {
  if (typeof value === "string") return hexToBytes(value, field);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function hexToBytes(value: string, field: string): Uint8Array {
  if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) {
    throw new MrvValidationError(`${field} must be 0x-prefixed even-length hex`);
  }
  const out = new Uint8Array((value.length - 2) / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(value.slice(2 + i * 2, 4 + i * 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((sum, item) => sum + item.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function isIdentifier(value: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(value);
}
