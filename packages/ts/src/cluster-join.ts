/**
 * CJ-1 cluster-admission submit helpers.
 *
 * The low-level ABI encoders live in `node-registry.ts`. This module adds
 * the wallet-facing guardrails around those calls: ask the node's native
 * operator-onboarding preview surface first, fail before signing if CJ-1 is
 * unavailable or the request state is not admissible, then submit a sealed
 * native transaction by default.
 */

import { blake3 } from "@noble/hashes/blake3.js";
import { addressToTypedBech32 } from "./address.js";
import type { ExecutionUnitPriceResponse } from "./client.js";
import { bytesToHex, expectBytes, hexToBytes, parseBigint } from "./crypto/bytes.js";
import { MempoolClass } from "./crypto/envelope.js";
import type { ClusterSealKeys, ClusterSealKeysSource } from "./crypto/seal.js";
import {
  buildEncryptedSubmission,
  buildPlaintextSubmission,
  submitEncryptedEnvelope,
  submitPlaintextTransaction,
} from "./crypto/submission.js";
import type { NativeEvmTxFields } from "./crypto/tx.js";
import { pqm1MnemonicToMlDsa65Backend } from "./crypto/pqm1.js";
import {
  NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
  NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES,
  type ClusterJoinRequestView,
  encodePublishOperatorSealKeyCalldata,
  encodeRequestClusterJoinCalldata,
  encodeVoteClusterAdmitCalldata,
  nodeRegistryAddressHex,
} from "./node-registry.js";
import {
  EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER,
  MIN_EXECUTION_UNIT_PRICE_LYTHOSHI,
  REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT,
  clampPriorityTip,
} from "./tx-fee.js";

export const DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT =
  REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT;
export const DEFAULT_OPERATOR_SEAL_KEY_EXECUTION_UNIT_LIMIT =
  REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_UINT32 = (1n << 32n) - 1n;

export interface ClusterJoinReadClient {
  call<T>(method: string, params?: unknown): Promise<T>;
}

export interface ClusterJoinSubmitClient extends ClusterJoinReadClient {
  ethChainId(): Promise<bigint>;
  lythGetTransactionCount(address: string): Promise<bigint>;
  lythExecutionUnitPrice(): Promise<ExecutionUnitPriceResponse>;
}

export interface ClusterJoinTxFee {
  maxFeePerGas: bigint | number | string;
  maxPriorityFeePerGas: bigint | number | string;
  gasLimit?: bigint | number | string;
}

export interface ClusterJoinFeeOptions {
  executionUnitLimit?: bigint | number | string;
  priorityTipLythoshi?: bigint | number | string;
  minPriceLythoshi?: bigint | number | string;
  safetyMultiplier?: bigint | number | string;
}

export interface ClusterJoinPrivacyOptions {
  private?: boolean;
  clusterSealKeys?: ClusterSealKeys;
  clusterSealKeysSource?: ClusterSealKeysSource;
}

export interface BuildRequestClusterJoinTxFieldsArgs {
  chainId: bigint | number | string;
  nonce: bigint | number | string;
  fee: ClusterJoinTxFee;
  clusterId: bigint | number | string;
  operatorPubkey: string | Uint8Array | readonly number[];
  bondLythoshi: bigint | number | string;
}

export interface BuildVoteClusterAdmitTxFieldsArgs {
  chainId: bigint | number | string;
  nonce: bigint | number | string;
  fee: ClusterJoinTxFee;
  clusterId: bigint | number | string;
  operatorId: string | Uint8Array | readonly number[];
  voterPubkey: string | Uint8Array | readonly number[];
}

export interface BuildPublishOperatorSealKeyTxFieldsArgs {
  chainId: bigint | number | string;
  nonce: bigint | number | string;
  fee: ClusterJoinTxFee;
  peerId: string | Uint8Array | readonly number[];
  sealEk: string | Uint8Array | readonly number[];
}

export interface SubmitRequestClusterJoinArgs
  extends ClusterJoinFeeOptions, ClusterJoinPrivacyOptions {
  client: ClusterJoinSubmitClient;
  mnemonic: string;
  clusterId: bigint | number | string;
  operatorPubkey: string | Uint8Array | readonly number[];
  bondLythoshi: bigint | number | string;
}

export interface SubmitVoteClusterAdmitArgs
  extends ClusterJoinFeeOptions, ClusterJoinPrivacyOptions {
  client: ClusterJoinSubmitClient;
  mnemonic: string;
  clusterId: bigint | number | string;
  operatorId: string | Uint8Array | readonly number[];
  voterPubkey: string | Uint8Array | readonly number[];
}

export interface SubmitPublishOperatorSealKeyArgs extends ClusterJoinFeeOptions {
  client: ClusterJoinSubmitClient;
  mnemonic: string;
  peerId: string | Uint8Array | readonly number[];
  sealEk: string | Uint8Array | readonly number[];
}

export interface ClusterJoinSubmitResult {
  txHash: string;
  clusterId: string;
  operatorIdHex: string;
  innerSighashHex: string;
  signedTxWireBytes: number;
  envelopeWireBytes?: number;
}

export interface OperatorSealKeySubmitResult {
  txHash: string;
  operatorIdHex: string;
  innerSighashHex: string;
  signedTxWireBytes: number;
}

export interface OperatorOnboardingPreview {
  schemaVersion: number;
  capability: string;
  method: string;
  ok: boolean;
  status: "ok" | "rejected" | string;
  reason?: string | null;
  message?: string | null;
  clusterId?: number;
  operatorId?: string;
  details?: Record<string, unknown>;
}

interface NativeClusterJoinRequestEnvelope {
  schemaVersion: number;
  capability: string;
  method: "getClusterJoinRequest";
  clusterId: number;
  operatorId: string;
  request: {
    exists: boolean;
    owner: string | null;
    requestEpoch: string;
    requestNonce?: string;
    snapshotThreshold: number;
    snapshotN: number;
    voteCount: number;
    status: string;
    statusCode: number;
    bondLythoshi: string;
    sealRosterPending: boolean;
  };
}

export function deriveClusterJoinOperatorId(
  operatorPubkey: string | Uint8Array | readonly number[],
): string {
  return bytesToHex(blake3(normalizeConsensusPubkey(operatorPubkey, "operatorPubkey")));
}

export function clusterJoinRequestExists(view: ClusterJoinRequestView): boolean {
  return (
    view.status !== "none" ||
    view.owner.toLowerCase() !== ZERO_ADDRESS ||
    view.bondLythoshi !== 0n
  );
}

export async function readClusterJoinRequest(
  client: ClusterJoinReadClient,
  args: {
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
  },
): Promise<ClusterJoinRequestView> {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  const operatorId = normalizeOperatorId(args.operatorId);
  const envelope = await client.call<NativeClusterJoinRequestEnvelope>("lyth_getClusterJoinRequest", [
    Number(clusterId),
    operatorId,
  ]);
  return adaptNativeClusterJoinRequest(envelope.request);
}

export async function preflightClusterJoinRequest(
  client: ClusterJoinReadClient,
  args: {
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
  },
): Promise<ClusterJoinRequestView> {
  try {
    return await readClusterJoinRequest(client, args);
  } catch (cause) {
    throw new Error(
      `CJ-1 lyth_getClusterJoinRequest is not exposed or failed on the connected chain: ${errorMessage(cause)}`,
    );
  }
}

export async function previewRequestClusterJoin(
  client: ClusterJoinReadClient,
  args: {
    from: string;
    clusterId: bigint | number | string;
    operatorPubkey: string | Uint8Array | readonly number[];
    bondLythoshi: bigint | number | string;
  },
): Promise<OperatorOnboardingPreview> {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  try {
    return await client.call<OperatorOnboardingPreview>("lyth_previewRequestClusterJoin", [{
      from: args.from,
      clusterId: Number(clusterId),
      operatorPubkey: bytesToHex(normalizeConsensusPubkey(args.operatorPubkey, "operatorPubkey")),
      bondLythoshi: parseU256(args.bondLythoshi, "bondLythoshi").toString(10),
    }]);
  } catch (cause) {
    throw new Error(
      `CJ-1 request preview is not exposed or failed on the connected chain: ${errorMessage(cause)}`,
    );
  }
}

export async function previewVoteClusterAdmit(
  client: ClusterJoinReadClient,
  args: {
    from: string;
    clusterId: bigint | number | string;
    operatorId: string | Uint8Array | readonly number[];
    voterPubkey: string | Uint8Array | readonly number[];
  },
): Promise<OperatorOnboardingPreview> {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  try {
    return await client.call<OperatorOnboardingPreview>("lyth_previewVoteClusterAdmit", [{
      from: args.from,
      clusterId: Number(clusterId),
      operatorId: normalizeOperatorId(args.operatorId),
      voterPubkey: bytesToHex(normalizeConsensusPubkey(args.voterPubkey, "voterPubkey")),
    }]);
  } catch (cause) {
    throw new Error(
      `CJ-1 admit-vote preview is not exposed or failed on the connected chain: ${errorMessage(cause)}`,
    );
  }
}

export function resolveClusterJoinExecutionFee(
  quote: ExecutionUnitPriceResponse,
  options: ClusterJoinFeeOptions = {},
): ClusterJoinTxFee {
  const quoted = parseBigint(quote.executionUnitPriceLythoshi, "executionUnitPriceLythoshi");
  const floor = options.minPriceLythoshi === undefined
    ? MIN_EXECUTION_UNIT_PRICE_LYTHOSHI
    : parseBigint(options.minPriceLythoshi, "minPriceLythoshi");
  const multiplier = options.safetyMultiplier === undefined
    ? EXECUTION_UNIT_PRICE_SAFETY_MULTIPLIER
    : parseBigint(options.safetyMultiplier, "safetyMultiplier");
  if (multiplier <= 0n) throw new Error("safetyMultiplier must be greater than zero");
  const base = quoted > floor ? quoted : floor;
  const maxFeePerGas = base * multiplier;
  const tip = options.priorityTipLythoshi === undefined
    ? maxFeePerGas
    : clampPriorityTip(options.priorityTipLythoshi, maxFeePerGas);
  return {
    maxFeePerGas,
    maxPriorityFeePerGas: tip,
    gasLimit: options.executionUnitLimit ?? DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT,
  };
}

export function buildRequestClusterJoinTxFields(
  args: BuildRequestClusterJoinTxFieldsArgs,
): NativeEvmTxFields {
  return {
    chainId: args.chainId,
    nonce: args.nonce,
    maxFeePerGas: parseBigint(args.fee.maxFeePerGas, "maxFeePerGas"),
    maxPriorityFeePerGas: parseBigint(args.fee.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
    gasLimit: parseBigint(
      args.fee.gasLimit ?? DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT,
      "gasLimit",
    ),
    to: nodeRegistryAddressHex(),
    value: parseU256(args.bondLythoshi, "bondLythoshi"),
    input: encodeRequestClusterJoinCalldata({
      clusterId: args.clusterId,
      operatorPubkey: normalizeConsensusPubkey(args.operatorPubkey, "operatorPubkey"),
    }),
  };
}

export function buildVoteClusterAdmitTxFields(
  args: BuildVoteClusterAdmitTxFieldsArgs,
): NativeEvmTxFields {
  return {
    chainId: args.chainId,
    nonce: args.nonce,
    maxFeePerGas: parseBigint(args.fee.maxFeePerGas, "maxFeePerGas"),
    maxPriorityFeePerGas: parseBigint(args.fee.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
    gasLimit: parseBigint(
      args.fee.gasLimit ?? DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT,
      "gasLimit",
    ),
    to: nodeRegistryAddressHex(),
    value: 0n,
    input: encodeVoteClusterAdmitCalldata({
      clusterId: args.clusterId,
      operatorId: normalizeOperatorId(args.operatorId),
      voterPubkey: normalizeConsensusPubkey(args.voterPubkey, "voterPubkey"),
    }),
  };
}

export function buildPublishOperatorSealKeyTxFields(
  args: BuildPublishOperatorSealKeyTxFieldsArgs,
): NativeEvmTxFields {
  return {
    chainId: args.chainId,
    nonce: args.nonce,
    maxFeePerGas: parseBigint(args.fee.maxFeePerGas, "maxFeePerGas"),
    maxPriorityFeePerGas: parseBigint(args.fee.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
    gasLimit: parseBigint(
      args.fee.gasLimit ?? DEFAULT_OPERATOR_SEAL_KEY_EXECUTION_UNIT_LIMIT,
      "gasLimit",
    ),
    to: nodeRegistryAddressHex(),
    value: 0n,
    input: encodePublishOperatorSealKeyCalldata({
      peerId: normalizeOperatorId(args.peerId),
      sealEk: normalizeOperatorSealEk(args.sealEk),
    }),
  };
}

export async function submitRequestClusterJoin(
  args: SubmitRequestClusterJoinArgs,
): Promise<ClusterJoinSubmitResult> {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  const operatorPubkey = normalizeConsensusPubkey(args.operatorPubkey, "operatorPubkey");
  const operatorIdHex = deriveClusterJoinOperatorId(operatorPubkey);
  const backend = pqm1MnemonicToMlDsa65Backend(args.mnemonic);
  const senderAddress = addressToTypedBech32("user", backend.addressBytes());
  const preview = await previewRequestClusterJoin(args.client, {
    from: senderAddress,
    clusterId,
    operatorPubkey,
    bondLythoshi: args.bondLythoshi,
  });
  assertPreviewOk("requestClusterJoin", preview);

  const [chainId, nonce, quote] = await Promise.all([
    args.client.ethChainId(),
    args.client.lythGetTransactionCount(senderAddress),
    args.client.lythExecutionUnitPrice(),
  ]);
  const tx = buildRequestClusterJoinTxFields({
    chainId,
    nonce,
    fee: resolveClusterJoinExecutionFee(quote, args),
    clusterId,
    operatorPubkey,
    bondLythoshi: args.bondLythoshi,
  });
  return submitClusterJoinTx(args.client, backend, tx, clusterId, operatorIdHex, args);
}

export async function submitVoteClusterAdmit(
  args: SubmitVoteClusterAdmitArgs,
): Promise<ClusterJoinSubmitResult> {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  const operatorIdHex = normalizeOperatorId(args.operatorId);
  const backend = pqm1MnemonicToMlDsa65Backend(args.mnemonic);
  const senderAddress = addressToTypedBech32("user", backend.addressBytes());
  const preview = await previewVoteClusterAdmit(args.client, {
    from: senderAddress,
    clusterId,
    operatorId: operatorIdHex,
    voterPubkey: args.voterPubkey,
  });
  assertPreviewOk("voteClusterAdmit", preview);

  const [chainId, nonce, quote] = await Promise.all([
    args.client.ethChainId(),
    args.client.lythGetTransactionCount(senderAddress),
    args.client.lythExecutionUnitPrice(),
  ]);
  const tx = buildVoteClusterAdmitTxFields({
    chainId,
    nonce,
    fee: resolveClusterJoinExecutionFee(quote, args),
    clusterId,
    operatorId: operatorIdHex,
    voterPubkey: args.voterPubkey,
  });
  return submitClusterJoinTx(args.client, backend, tx, clusterId, operatorIdHex, args);
}

export async function submitPublishOperatorSealKey(
  args: SubmitPublishOperatorSealKeyArgs,
): Promise<OperatorSealKeySubmitResult> {
  const operatorIdHex = normalizeOperatorId(args.peerId);
  const sealEk = normalizeOperatorSealEk(args.sealEk);
  const backend = pqm1MnemonicToMlDsa65Backend(args.mnemonic);
  const senderAddress = addressToTypedBech32("user", backend.addressBytes());
  const [chainId, nonce, quote] = await Promise.all([
    args.client.ethChainId(),
    args.client.lythGetTransactionCount(senderAddress),
    args.client.lythExecutionUnitPrice(),
  ]);
  const tx = buildPublishOperatorSealKeyTxFields({
    chainId,
    nonce,
    fee: resolveClusterJoinExecutionFee(quote, {
      ...args,
      executionUnitLimit: args.executionUnitLimit ?? DEFAULT_OPERATOR_SEAL_KEY_EXECUTION_UNIT_LIMIT,
    }),
    peerId: operatorIdHex,
    sealEk,
  });
  const plaintext = buildPlaintextSubmission({ backend, tx });
  const txHash = await submitPlaintextTransaction(
    args.client,
    plaintext.signedTxWireHex,
    plaintext.innerTxHashHex,
  );
  return {
    txHash,
    operatorIdHex,
    innerSighashHex: plaintext.innerSighashHex,
    signedTxWireBytes: plaintext.innerWireBytes,
  };
}

async function submitClusterJoinTx(
  client: ClusterJoinSubmitClient,
  backend: ReturnType<typeof pqm1MnemonicToMlDsa65Backend>,
  tx: NativeEvmTxFields,
  clusterId: bigint,
  operatorIdHex: string,
  options: ClusterJoinPrivacyOptions,
): Promise<ClusterJoinSubmitResult> {
  if (options.private !== false) {
    const encrypted = await buildEncryptedSubmission({
      client,
      backend,
      tx,
      clusterId: Number(clusterId),
      clusterSealKeys: options.clusterSealKeys,
      clusterSealKeysSource: options.clusterSealKeysSource,
      class: MempoolClass.ContractCall,
    });
    assertRpcHash(await submitEncryptedEnvelope(client, encrypted.envelopeWireHex));
    return {
      txHash: encrypted.innerTxHashHex,
      clusterId: clusterId.toString(10),
      operatorIdHex,
      innerSighashHex: encrypted.innerSighashHex,
      signedTxWireBytes: encrypted.innerWireBytes,
      envelopeWireBytes: hexByteLength(encrypted.envelopeWireHex),
    };
  }
  const plaintext = buildPlaintextSubmission({ backend, tx });
  const txHash = await submitPlaintextTransaction(
    client,
    plaintext.signedTxWireHex,
    plaintext.innerTxHashHex,
  );
  return {
    txHash,
    clusterId: clusterId.toString(10),
    operatorIdHex,
    innerSighashHex: plaintext.innerSighashHex,
    signedTxWireBytes: plaintext.innerWireBytes,
  };
}

function hexByteLength(value: string): number {
  const clean = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  return clean.length / 2;
}

function assertRpcHash(value: string): void {
  const bytes = hexToBytes(value, "lyth_submitEncrypted tx hash");
  if (bytes.length !== 32) {
    throw new Error(`lyth_submitEncrypted tx hash must be 32 bytes, got ${bytes.length}`);
  }
}

function adaptNativeClusterJoinRequest(
  request: NativeClusterJoinRequestEnvelope["request"],
): ClusterJoinRequestView {
  return {
    owner: request.owner ?? ZERO_ADDRESS,
    requestEpoch: parseBigint(request.requestEpoch, "requestEpoch"),
    requestNonce: request.requestNonce === undefined
      ? undefined
      : parseBigint(request.requestNonce, "requestNonce"),
    snapshotThreshold: request.snapshotThreshold,
    snapshotN: request.snapshotN,
    voteCount: request.voteCount,
    statusCode: request.statusCode,
    status: clusterJoinStatus(request.status),
    bondLythoshi: parseBigint(request.bondLythoshi, "bondLythoshi"),
    sealRosterPending: request.sealRosterPending,
  };
}

function clusterJoinStatus(status: string): ClusterJoinRequestView["status"] {
  switch (status) {
    case "none":
    case "open":
    case "admitted":
    case "cancelled":
    case "expired":
      return status;
    default:
      return "unknown";
  }
}

function previewError(action: string, preview: OperatorOnboardingPreview): Error {
  const reason = preview.reason ? `: ${preview.reason}` : "";
  const message = preview.message ? ` (${preview.message})` : "";
  return new Error(`${action} preview rejected${reason}${message}`);
}

function assertPreviewOk(action: string, preview: OperatorOnboardingPreview): void {
  if (!preview.ok) throw previewError(action, preview);
}

function normalizeConsensusPubkey(
  value: string | Uint8Array | readonly number[],
  label: string,
): Uint8Array {
  const bytes = typeof value === "string" ? hexToBytes(value, label) : value;
  return expectBytes(bytes, NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES, label).slice();
}

function normalizeOperatorId(value: string | Uint8Array | readonly number[]): string {
  const bytes = typeof value === "string" ? hexToBytes(value, "operatorId") : value;
  return bytesToHex(expectBytes(bytes, 32, "operatorId"));
}

function normalizeOperatorSealEk(value: string | Uint8Array | readonly number[]): Uint8Array {
  const bytes = typeof value === "string" ? hexToBytes(value, "sealEk") : value;
  return expectBytes(bytes, NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES, "sealEk").slice();
}

function parseUint32(value: bigint | number | string, label: string): bigint {
  const parsed = parseBigint(value, label);
  if (parsed < 0n || parsed > MAX_UINT32) {
    throw new Error(`${label} out of 32-bit range`);
  }
  return parsed;
}

function parseU256(value: bigint | number | string, label: string): bigint {
  const parsed = parseBigint(value, label);
  if (parsed < 0n || parsed >= 1n << 256n) {
    throw new Error(`${label} out of 256-bit range`);
  }
  return parsed;
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
