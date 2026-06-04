/**
 * CJ-1 cluster-admission submit helpers.
 *
 * The low-level ABI encoders live in `node-registry.ts`. This module adds
 * the wallet-facing guardrails around those calls: read the request view
 * first, fail before signing if CJ-1 is unavailable or the request state
 * is not admissible, then submit a plaintext native transaction.
 */

import { blake3 } from "@noble/hashes/blake3.js";
import { addressToTypedBech32 } from "./address.js";
import type { ExecutionUnitPriceResponse } from "./client.js";
import { bytesToHex, expectBytes, hexToBytes, parseBigint } from "./crypto/bytes.js";
import { buildPlaintextSubmission, submitPlaintextTransaction } from "./crypto/submission.js";
import type { NativeEvmTxFields } from "./crypto/tx.js";
import { pqm1MnemonicToMlDsa65Backend } from "./crypto/pqm1.js";
import {
  NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
  type ClusterJoinRequestView,
  encodeGetClusterJoinRequestCalldata,
  encodeRequestClusterJoinCalldata,
  encodeVoteClusterAdmitCalldata,
  decodeClusterJoinRequest,
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

export interface SubmitRequestClusterJoinArgs extends ClusterJoinFeeOptions {
  client: ClusterJoinSubmitClient;
  mnemonic: string;
  clusterId: bigint | number | string;
  operatorPubkey: string | Uint8Array | readonly number[];
  bondLythoshi: bigint | number | string;
}

export interface SubmitVoteClusterAdmitArgs extends ClusterJoinFeeOptions {
  client: ClusterJoinSubmitClient;
  mnemonic: string;
  clusterId: bigint | number | string;
  operatorId: string | Uint8Array | readonly number[];
  voterPubkey: string | Uint8Array | readonly number[];
}

export interface ClusterJoinSubmitResult {
  txHash: string;
  clusterId: string;
  operatorIdHex: string;
  innerSighashHex: string;
  signedTxWireBytes: number;
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
  const data = encodeGetClusterJoinRequestCalldata({
    clusterId: args.clusterId,
    operatorId: normalizeOperatorId(args.operatorId),
  });
  const output = await client.call<string>("eth_call", [
    {
      to: nodeRegistryAddressHex(),
      data,
    },
    "latest",
  ]);
  return decodeClusterJoinRequest(output);
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
      `CJ-1 getClusterJoinRequest is not exposed or failed on the connected chain: ${errorMessage(cause)}`,
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

export async function submitRequestClusterJoin(
  args: SubmitRequestClusterJoinArgs,
): Promise<ClusterJoinSubmitResult> {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  const operatorPubkey = normalizeConsensusPubkey(args.operatorPubkey, "operatorPubkey");
  const operatorIdHex = deriveClusterJoinOperatorId(operatorPubkey);
  const existing = await preflightClusterJoinRequest(args.client, {
    clusterId,
    operatorId: operatorIdHex,
  });
  if (existing.status === "open") {
    throw new Error("cluster join request is already open for this operator");
  }
  if (existing.status === "admitted") {
    throw new Error("operator is already admitted for this cluster request");
  }

  const backend = pqm1MnemonicToMlDsa65Backend(args.mnemonic);
  const senderAddress = addressToTypedBech32("user", backend.addressBytes());
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
  return submitClusterJoinTx(args.client, backend, tx, clusterId, operatorIdHex);
}

export async function submitVoteClusterAdmit(
  args: SubmitVoteClusterAdmitArgs,
): Promise<ClusterJoinSubmitResult> {
  const clusterId = parseUint32(args.clusterId, "clusterId");
  const operatorIdHex = normalizeOperatorId(args.operatorId);
  const existing = await preflightClusterJoinRequest(args.client, {
    clusterId,
    operatorId: operatorIdHex,
  });
  if (!clusterJoinRequestExists(existing) || existing.status !== "open") {
    throw new Error("candidate cluster join request is not open for voting");
  }

  const backend = pqm1MnemonicToMlDsa65Backend(args.mnemonic);
  const senderAddress = addressToTypedBech32("user", backend.addressBytes());
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
  return submitClusterJoinTx(args.client, backend, tx, clusterId, operatorIdHex);
}

async function submitClusterJoinTx(
  client: ClusterJoinSubmitClient,
  backend: ReturnType<typeof pqm1MnemonicToMlDsa65Backend>,
  tx: NativeEvmTxFields,
  clusterId: bigint,
  operatorIdHex: string,
): Promise<ClusterJoinSubmitResult> {
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
