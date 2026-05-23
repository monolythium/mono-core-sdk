import { blake3 } from "@noble/hashes/blake3.js";
import { ADDRESS_KIND_HRPS, addressToTypedBech32, typedBech32ToAddress } from "./address.js";
import {
  buildEncryptedSubmission,
  fetchEncryptionKey,
  submitEncryptedEnvelope,
  type EncryptionKey,
} from "./crypto/submission.js";

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
import type { NativeEvmTxFields } from "./crypto/tx.js";

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

export interface MrvDeployNativeTxPlan extends MrvDeployPlan {
  nativeTx: MrvNativeTxFacade;
  tx: NativeEvmTxFields;
}

export interface MrvCallNativeTxPlan extends MrvCallPlan {
  nativeTx: MrvNativeTxFacade;
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

export type MrvCallSubmitOptions = MrvCallNativeTxOptions & {
  encryptionKey?: EncryptionKey;
  class?: MempoolClass;
};

export type MrvDeploySubmission = MrvDeployNativeTxPlan & MrvEncryptedSubmissionResult;
export type MrvCallSubmission = MrvCallNativeTxPlan & MrvEncryptedSubmissionResult;

export const MRV_FORMAT_VERSION = 1 as const;
export const MRV_PROFILE_MONO_RV32IM_V1 = "mono_rv32im_v1" as const;
export const MRV_MEMORY_PAGE_BYTES = 65_536 as const;
export const MRV_MAX_CODE_BYTES = 16 * 1024 * 1024;
export const MRV_MAX_DEBUG_BYTES = 16 * 1024 * 1024;
export const MRV_MAX_MEMORY_PAGES = 1024 as const;
export const MRV_MAX_ABI_SYMBOLS = 1024 as const;
export const MRV_MAX_STORAGE_NAMESPACE_BYTES = 64 as const;
export const LYTH_DECIMALS = 8 as const;
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

export function mrvCodeHashHex(code: MrvBytesLike): string {
  const codeBytes = bytesFrom(code, "code");
  const len = new Uint8Array(8);
  new DataView(len.buffer).setBigUint64(0, BigInt(codeBytes.length), false);
  return bytesToHex(blake3(concatBytes(MRV_CODE_HASH_DOMAIN, len, codeBytes)));
}

export function mrvV1TransactionExtension(): MrvTransactionExtension {
  return { kind: MRV_TX_EXTENSION_KIND, bodyHex: "0x01" };
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

export async function submitMrvDeployNativeTx(
  client: RpcClient,
  backend: MlDsa65Backend,
  artifactBytes: MrvBytesLike,
  options: MrvDeploySubmitOptions,
): Promise<MrvDeploySubmission> {
  const plan = buildMrvDeployNativeTxPlan(artifactBytes, options);
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
