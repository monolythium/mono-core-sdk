/**
 * Native agent-commerce transaction-plan builders.
 *
 * These helpers encode the native Rust router bincode payloads consumed by
 * `AGENT_NATIVE_MOD_V01`. They do not predict record ids, escrow settlement,
 * reputation effects, or execution success.
 */

import { addressToTypedBech32, typedBech32ToAddress, type AddressKind } from "./address.js";
import { BincodeWriter } from "./crypto/bincode.js";
import { bytesToHex, hexToBytes } from "./crypto/bytes.js";

export const NATIVE_AGENT_MODULE_ADDRESS_BYTES = "0x4147454e545f4e41544956455f4d4f445f563031" as const;
export const NATIVE_AGENT_MODULE_ADDRESS = addressToTypedBech32(
  "systemModule",
  NATIVE_AGENT_MODULE_ADDRESS_BYTES,
);

export type NativeAgentAddressKind = AddressKind;
export type NativeAgentAddressInput =
  | string
  | {
      kind?: NativeAgentAddressKind;
      address: string;
    };

export interface NativeAgentModuleContractCall {
  /** Stable typed system-module address (`AGENT_NATIVE_MOD_V01`). */
  to: string;
  /** Native agent router bincode payload. */
  input: string;
  /** Native agent module calls must not carry native value. */
  valueLythoshi: "0";
  /** Maximum cycles delegated to the RISC-V host call. */
  maxCycles: string;
}

export interface NativeAgentModuleCallEnvelope {
  module: "agent";
  call: NativeAgentModuleContractCall;
}

export interface NativeAgentForwarderInput {
  /** Canonical `SyscallRequest::CallContract` bytes for MRV call input. */
  input: string;
  /** Byte length of `input`, useful because the minimal forwarder artifact pins this as an immediate. */
  requestBytes: number;
}

export interface EncodeNativeAgentRegisterIssuerArgs {
  issuer: NativeAgentAddressInput;
  nonce: string | number | bigint;
  metadataHash: string;
}

export interface EncodeNativeAgentIssueAttestationArgs {
  issuerId: string;
  issuer: NativeAgentAddressInput;
  subject: NativeAgentAddressInput;
  nonce: string | number | bigint;
  schemaHash: string;
  payloadHash: string;
}

export interface EncodeNativeAgentRevokeAttestationArgs {
  attestationId: string;
  issuer: NativeAgentAddressInput;
}

export interface EncodeNativeAgentGrantConsentArgs {
  subject: NativeAgentAddressInput;
  grantee: NativeAgentAddressInput;
  nonce: string | number | bigint;
  scopeHash: string;
  expiresAt: string | number | bigint;
}

export interface EncodeNativeAgentRevokeConsentArgs {
  consentId: string;
  subject: NativeAgentAddressInput;
}

export interface EncodeNativeAgentListServiceArgs {
  provider: NativeAgentAddressInput;
  nonce: string | number | bigint;
  categoryHash: string;
  metadataHash: string;
}

export interface EncodeNativeAgentDeactivateServiceArgs {
  serviceId: string;
  provider: NativeAgentAddressInput;
}

export interface EncodeNativeAgentSetAvailabilityArgs {
  provider: NativeAgentAddressInput;
  maxConcurrent: string | number | bigint;
  paused: boolean;
}

export interface EncodeNativeAgentAvailabilitySlotArgs {
  provider: NativeAgentAddressInput;
  consumer: NativeAgentAddressInput;
}

export interface EncodeNativeAgentRegisterArbiterArgs {
  arbiter: NativeAgentAddressInput;
  nonce: string | number | bigint;
  tier: string | number | bigint;
  metadataHash: string;
}

export interface EncodeNativeAgentSetSpendingPolicyArgs {
  owner: NativeAgentAddressInput;
  controller: NativeAgentAddressInput;
  nonce: string | number | bigint;
  assetId: string;
  perActionLimit: string;
  windowLimit: string;
  windowSecs: string | number | bigint;
}

export interface EncodeNativeAgentRecordPolicySpendArgs {
  policyId: string;
  controller: NativeAgentAddressInput;
  window: string | number | bigint;
  amount: string;
}

export interface EncodeNativeAgentCreateEscrowArgs {
  buyer: NativeAgentAddressInput;
  provider: NativeAgentAddressInput;
  arbiter: NativeAgentAddressInput;
  nonce: string | number | bigint;
  assetId: string;
  amount: string;
  termsHash: string;
}

export interface EncodeNativeAgentCounterEscrowArgs {
  escrowId: string;
  actor: NativeAgentAddressInput;
  termsHash: string;
}

export interface EncodeNativeAgentEscrowActorArgs {
  escrowId: string;
  actor: NativeAgentAddressInput;
}

export interface EncodeNativeAgentStartEscrowArgs {
  escrowId: string;
  provider: NativeAgentAddressInput;
}

export interface EncodeNativeAgentSubmitEscrowArgs {
  escrowId: string;
  provider: NativeAgentAddressInput;
  payloadHash: string;
}

export type NativeAgentEscrowResolution = "release-provider" | "refund-buyer";

export interface EncodeNativeAgentResolveEscrowArgs {
  escrowId: string;
  actor: NativeAgentAddressInput;
  resolution: NativeAgentEscrowResolution;
}

export interface NativeAgentReputationScores {
  speed: string | number | bigint;
  quality: string | number | bigint;
  communication: string | number | bigint;
  accuracy: string | number | bigint;
}

export interface EncodeNativeAgentRecordReputationArgs {
  reviewer: NativeAgentAddressInput;
  subject: NativeAgentAddressInput;
  categoryId: string | number | bigint;
  scores: NativeAgentReputationScores;
  payloadHash: string;
}

export class AgentActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentActionError";
  }
}

export function encodeNativeAgentRegisterIssuerCall(args: EncodeNativeAgentRegisterIssuerArgs): string {
  const w = agentCallWriter(0, 0); // NativeAgentCall::Issuer / IssuerCall::Register
  monoAddressInto(w, args.issuer, "issuer");
  w.u64(uint64(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex(args.metadataHash, "metadataHash"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentIssuerGetCall(issuerId: string): string {
  const w = agentCallWriter(0, 1); // NativeAgentCall::Issuer / IssuerCall::Get
  w.rawBytes(bytes32FromHex(issuerId, "issuerId"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentIssueAttestationCall(args: EncodeNativeAgentIssueAttestationArgs): string {
  const w = agentCallWriter(1, 0); // NativeAgentCall::Attestation / AttestationCall::Issue
  w.rawBytes(bytes32FromHex(args.issuerId, "issuerId"));
  monoAddressInto(w, args.issuer, "issuer");
  monoAddressInto(w, args.subject, "subject");
  w.u64(uint64(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex(args.schemaHash, "schemaHash"));
  w.rawBytes(bytes32FromHex(args.payloadHash, "payloadHash"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentRevokeAttestationCall(args: EncodeNativeAgentRevokeAttestationArgs): string {
  const w = agentCallWriter(1, 1); // NativeAgentCall::Attestation / AttestationCall::Revoke
  w.rawBytes(bytes32FromHex(args.attestationId, "attestationId"));
  monoAddressInto(w, args.issuer, "issuer");
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentAttestationGetCall(attestationId: string): string {
  const w = agentCallWriter(1, 2); // NativeAgentCall::Attestation / AttestationCall::Get
  w.rawBytes(bytes32FromHex(attestationId, "attestationId"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentGrantConsentCall(args: EncodeNativeAgentGrantConsentArgs): string {
  const w = agentCallWriter(2, 0); // NativeAgentCall::Consent / ConsentCall::Grant
  monoAddressInto(w, args.subject, "subject");
  monoAddressInto(w, args.grantee, "grantee");
  w.u64(uint64(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex(args.scopeHash, "scopeHash"));
  w.u64(uint64(args.expiresAt, "expiresAt"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentRevokeConsentCall(args: EncodeNativeAgentRevokeConsentArgs): string {
  const w = agentCallWriter(2, 1); // NativeAgentCall::Consent / ConsentCall::Revoke
  w.rawBytes(bytes32FromHex(args.consentId, "consentId"));
  monoAddressInto(w, args.subject, "subject");
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentConsentGetCall(consentId: string): string {
  const w = agentCallWriter(2, 2); // NativeAgentCall::Consent / ConsentCall::Get
  w.rawBytes(bytes32FromHex(consentId, "consentId"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentListServiceCall(args: EncodeNativeAgentListServiceArgs): string {
  const w = agentCallWriter(3, 0); // NativeAgentCall::Discovery / DiscoveryCall::List
  monoAddressInto(w, args.provider, "provider");
  w.u64(uint64(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex(args.categoryHash, "categoryHash"));
  w.rawBytes(bytes32FromHex(args.metadataHash, "metadataHash"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentDeactivateServiceCall(args: EncodeNativeAgentDeactivateServiceArgs): string {
  const w = agentCallWriter(3, 1); // NativeAgentCall::Discovery / DiscoveryCall::Deactivate
  w.rawBytes(bytes32FromHex(args.serviceId, "serviceId"));
  monoAddressInto(w, args.provider, "provider");
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentServiceGetCall(serviceId: string): string {
  const w = agentCallWriter(3, 2); // NativeAgentCall::Discovery / DiscoveryCall::Get
  w.rawBytes(bytes32FromHex(serviceId, "serviceId"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentSetAvailabilityCall(args: EncodeNativeAgentSetAvailabilityArgs): string {
  const w = agentCallWriter(4, 0); // NativeAgentCall::Availability / AvailabilityCall::Set
  monoAddressInto(w, args.provider, "provider");
  w.u32(uint32(args.maxConcurrent, "maxConcurrent"));
  w.u8(boolByte(args.paused, "paused"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentOpenAvailabilityCall(args: EncodeNativeAgentAvailabilitySlotArgs): string {
  const w = agentCallWriter(4, 1); // NativeAgentCall::Availability / AvailabilityCall::Open
  monoAddressInto(w, args.provider, "provider");
  monoAddressInto(w, args.consumer, "consumer");
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentCloseAvailabilityCall(args: EncodeNativeAgentAvailabilitySlotArgs): string {
  const w = agentCallWriter(4, 2); // NativeAgentCall::Availability / AvailabilityCall::Close
  monoAddressInto(w, args.provider, "provider");
  monoAddressInto(w, args.consumer, "consumer");
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentAvailabilityGetCall(provider: NativeAgentAddressInput): string {
  const w = agentCallWriter(4, 3); // NativeAgentCall::Availability / AvailabilityCall::Get
  monoAddressInto(w, provider, "provider");
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentRegisterArbiterCall(args: EncodeNativeAgentRegisterArbiterArgs): string {
  const w = agentCallWriter(5, 0); // NativeAgentCall::Arbiter / ArbiterCall::Register
  monoAddressInto(w, args.arbiter, "arbiter");
  w.u64(uint64(args.nonce, "nonce"));
  w.u16(uint16(args.tier, "tier"));
  w.rawBytes(bytes32FromHex(args.metadataHash, "metadataHash"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentArbiterGetCall(arbiterId: string): string {
  const w = agentCallWriter(5, 1); // NativeAgentCall::Arbiter / ArbiterCall::Get
  w.rawBytes(bytes32FromHex(arbiterId, "arbiterId"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentSetSpendingPolicyCall(args: EncodeNativeAgentSetSpendingPolicyArgs): string {
  const w = agentCallWriter(6, 0); // NativeAgentCall::SpendingPolicy / SpendingPolicyCall::Set
  monoAddressInto(w, args.owner, "owner");
  monoAddressInto(w, args.controller, "controller");
  w.u64(uint64(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex(args.assetId, "assetId"));
  w.u128(positiveU128Decimal(args.perActionLimit, "perActionLimit"));
  w.u128(positiveU128Decimal(args.windowLimit, "windowLimit"));
  w.u64(uint64(args.windowSecs, "windowSecs"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentRecordPolicySpendCall(args: EncodeNativeAgentRecordPolicySpendArgs): string {
  const w = agentCallWriter(6, 1); // NativeAgentCall::SpendingPolicy / SpendingPolicyCall::RecordSpend
  w.rawBytes(bytes32FromHex(args.policyId, "policyId"));
  monoAddressInto(w, args.controller, "controller");
  w.u64(uint64(args.window, "window"));
  w.u128(positiveU128Decimal(args.amount, "amount"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentSpendingPolicyGetCall(policyId: string): string {
  const w = agentCallWriter(6, 2); // NativeAgentCall::SpendingPolicy / SpendingPolicyCall::Get
  w.rawBytes(bytes32FromHex(policyId, "policyId"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentCreateEscrowCall(args: EncodeNativeAgentCreateEscrowArgs): string {
  const w = agentCallWriter(7, 0); // NativeAgentCall::Escrow / EscrowCall::Create
  monoAddressInto(w, args.buyer, "buyer");
  monoAddressInto(w, args.provider, "provider");
  monoAddressInto(w, args.arbiter, "arbiter");
  w.u64(uint64(args.nonce, "nonce"));
  w.rawBytes(bytes32FromHex(args.assetId, "assetId"));
  w.u128(positiveU128Decimal(args.amount, "amount"));
  w.rawBytes(bytes32FromHex(args.termsHash, "termsHash"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentCounterEscrowCall(args: EncodeNativeAgentCounterEscrowArgs): string {
  const w = agentCallWriter(7, 1); // NativeAgentCall::Escrow / EscrowCall::Counter
  w.rawBytes(bytes32FromHex(args.escrowId, "escrowId"));
  monoAddressInto(w, args.actor, "actor");
  w.rawBytes(bytes32FromHex(args.termsHash, "termsHash"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentAcceptEscrowCall(args: EncodeNativeAgentEscrowActorArgs): string {
  const w = agentCallWriter(7, 2); // NativeAgentCall::Escrow / EscrowCall::Accept
  escrowActorInto(w, args);
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentStartEscrowCall(args: EncodeNativeAgentStartEscrowArgs): string {
  const w = agentCallWriter(7, 3); // NativeAgentCall::Escrow / EscrowCall::Start
  w.rawBytes(bytes32FromHex(args.escrowId, "escrowId"));
  monoAddressInto(w, args.provider, "provider");
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentSubmitEscrowCall(args: EncodeNativeAgentSubmitEscrowArgs): string {
  const w = agentCallWriter(7, 4); // NativeAgentCall::Escrow / EscrowCall::Submit
  w.rawBytes(bytes32FromHex(args.escrowId, "escrowId"));
  monoAddressInto(w, args.provider, "provider");
  w.rawBytes(bytes32FromHex(args.payloadHash, "payloadHash"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentApproveEscrowCall(args: EncodeNativeAgentEscrowActorArgs): string {
  const w = agentCallWriter(7, 5); // NativeAgentCall::Escrow / EscrowCall::Approve
  escrowActorInto(w, args);
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentDisputeEscrowCall(args: EncodeNativeAgentEscrowActorArgs): string {
  const w = agentCallWriter(7, 6); // NativeAgentCall::Escrow / EscrowCall::Dispute
  escrowActorInto(w, args);
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentCancelEscrowCall(args: EncodeNativeAgentEscrowActorArgs): string {
  const w = agentCallWriter(7, 7); // NativeAgentCall::Escrow / EscrowCall::Cancel
  escrowActorInto(w, args);
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentResolveEscrowCall(args: EncodeNativeAgentResolveEscrowArgs): string {
  const w = agentCallWriter(7, 8); // NativeAgentCall::Escrow / EscrowCall::Resolve
  w.rawBytes(bytes32FromHex(args.escrowId, "escrowId"));
  monoAddressInto(w, args.actor, "actor");
  w.enumVariant(normalizeEscrowResolution(args.resolution));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentEscrowGetCall(escrowId: string): string {
  const w = agentCallWriter(7, 9); // NativeAgentCall::Escrow / EscrowCall::Get
  w.rawBytes(bytes32FromHex(escrowId, "escrowId"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentRecordReputationCall(args: EncodeNativeAgentRecordReputationArgs): string {
  const w = agentCallWriter(8, 0); // NativeAgentCall::Reputation / ReputationCall::Record
  monoAddressInto(w, args.reviewer, "reviewer");
  monoAddressInto(w, args.subject, "subject");
  w.u32(uint32(args.categoryId, "categoryId"));
  reputationScoresInto(w, args.scores);
  w.rawBytes(bytes32FromHex(args.payloadHash, "payloadHash"));
  return bytesToHex(w.toBytes());
}

export function encodeNativeAgentReputationGetCall(
  subject: NativeAgentAddressInput,
  categoryId: string | number | bigint,
): string {
  const w = agentCallWriter(8, 1); // NativeAgentCall::Reputation / ReputationCall::Get
  monoAddressInto(w, subject, "subject");
  w.u32(uint32(categoryId, "categoryId"));
  return bytesToHex(w.toBytes());
}

export function buildNativeAgentModuleCallEnvelope(
  input: string,
  maxCycles: string | number | bigint,
): NativeAgentModuleCallEnvelope {
  return {
    module: "agent",
    call: {
      to: NATIVE_AGENT_MODULE_ADDRESS,
      input: normalizeHexBytes(input, "input"),
      valueLythoshi: "0",
      maxCycles: uint64(maxCycles, "maxCycles").toString(10),
    },
  };
}

export function encodeNativeAgentModuleForwarderInput(
  envelope: NativeAgentModuleCallEnvelope,
): NativeAgentForwarderInput {
  if (envelope.module !== "agent") {
    throw new AgentActionError("native agent forwarder envelope module must be 'agent'");
  }
  if (!isNativeAgentModuleAddress(envelope.call.to)) {
    throw new AgentActionError("native agent forwarder call target must be the agent system module");
  }
  if (envelope.call.valueLythoshi !== "0") {
    throw new AgentActionError("native agent forwarder call valueLythoshi must be 0");
  }
  const payload = hexToBytes(normalizeHexBytes(envelope.call.input, "input"), "input");
  const maxCycles = uint64(envelope.call.maxCycles, "maxCycles");
  const w = new BincodeWriter();
  w.enumVariant(7); // SyscallRequest::CallContract
  w.enumVariant(NATIVE_AGENT_ADDRESS_KIND_VARIANTS.systemModule);
  w.rawBytes(hexToBytes(NATIVE_AGENT_MODULE_ADDRESS_BYTES, "native agent module address"));
  w.bytes(payload);
  w.u128(0n);
  w.u64(maxCycles);
  const input = bytesToHex(w.toBytes());
  return { input, requestBytes: (input.length - 2) / 2 };
}

export function buildNativeAgentSetSpendingPolicyModuleCall(
  args: EncodeNativeAgentSetSpendingPolicyArgs,
  maxCycles: string | number | bigint,
): NativeAgentModuleCallEnvelope {
  return buildNativeAgentModuleCallEnvelope(encodeNativeAgentSetSpendingPolicyCall(args), maxCycles);
}

export function buildNativeAgentSetSpendingPolicyForwarderInput(
  args: EncodeNativeAgentSetSpendingPolicyArgs,
  maxCycles: string | number | bigint,
): NativeAgentForwarderInput {
  return encodeNativeAgentModuleForwarderInput(buildNativeAgentSetSpendingPolicyModuleCall(args, maxCycles));
}

export function buildNativeAgentCreateEscrowModuleCall(
  args: EncodeNativeAgentCreateEscrowArgs,
  maxCycles: string | number | bigint,
): NativeAgentModuleCallEnvelope {
  return buildNativeAgentModuleCallEnvelope(encodeNativeAgentCreateEscrowCall(args), maxCycles);
}

export function buildNativeAgentCreateEscrowForwarderInput(
  args: EncodeNativeAgentCreateEscrowArgs,
  maxCycles: string | number | bigint,
): NativeAgentForwarderInput {
  return encodeNativeAgentModuleForwarderInput(buildNativeAgentCreateEscrowModuleCall(args, maxCycles));
}

export function buildNativeAgentRecordReputationModuleCall(
  args: EncodeNativeAgentRecordReputationArgs,
  maxCycles: string | number | bigint,
): NativeAgentModuleCallEnvelope {
  return buildNativeAgentModuleCallEnvelope(encodeNativeAgentRecordReputationCall(args), maxCycles);
}

export function buildNativeAgentRecordReputationForwarderInput(
  args: EncodeNativeAgentRecordReputationArgs,
  maxCycles: string | number | bigint,
): NativeAgentForwarderInput {
  return encodeNativeAgentModuleForwarderInput(buildNativeAgentRecordReputationModuleCall(args, maxCycles));
}

const NATIVE_AGENT_ADDRESS_KIND_VARIANTS: Record<NativeAgentAddressKind, number> = {
  user: 0,
  smartAccount: 1,
  contract: 2,
  cluster: 3,
  multisig: 4,
  systemModule: 5,
};

function agentCallWriter(surfaceVariant: number, callVariant: number): BincodeWriter {
  const w = new BincodeWriter();
  w.enumVariant(surfaceVariant);
  w.enumVariant(callVariant);
  return w;
}

function escrowActorInto(w: BincodeWriter, args: EncodeNativeAgentEscrowActorArgs): void {
  w.rawBytes(bytes32FromHex(args.escrowId, "escrowId"));
  monoAddressInto(w, args.actor, "actor");
}

function reputationScoresInto(w: BincodeWriter, scores: NativeAgentReputationScores): void {
  w.u8(score(scores.speed, "scores.speed"));
  w.u8(score(scores.quality, "scores.quality"));
  w.u8(score(scores.communication, "scores.communication"));
  w.u8(score(scores.accuracy, "scores.accuracy"));
}

function normalizeEscrowResolution(resolution: NativeAgentEscrowResolution): 0 | 1 {
  if (resolution === "release-provider") return 0;
  if (resolution === "refund-buyer") return 1;
  throw new AgentActionError("resolution must be 'release-provider' or 'refund-buyer'");
}

function normalizeBytes32Hex(value: string, name: string): string {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new AgentActionError(`${name} must be a 32-byte 0x-prefixed hex string`);
  }
  return value.toLowerCase();
}

function bytes32FromHex(value: string, name: string): Uint8Array {
  normalizeBytes32Hex(value, name);
  return hexToBytes(value, name);
}

function positiveDecimal(value: string, name: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new AgentActionError(`${name} must be an integer decimal string`);
  }
  const n = BigInt(value);
  if (n <= 0n) {
    throw new AgentActionError(`${name} must be positive`);
  }
  return n;
}

function uint64(value: string | number | bigint, name: string): bigint {
  let n: bigint;
  if (typeof value === "bigint") {
    n = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new AgentActionError(`${name} must be a safe integer`);
    }
    n = BigInt(value);
  } else if (/^(0|[1-9][0-9]*|0x[0-9a-fA-F]+)$/.test(value)) {
    n = BigInt(value);
  } else {
    throw new AgentActionError(`${name} must be a nonnegative integer`);
  }
  if (n < 0n || n > 0xffff_ffff_ffff_ffffn) {
    throw new AgentActionError(`${name} must fit uint64`);
  }
  return n;
}

function uint32(value: string | number | bigint, name: string): number {
  const n = uint64(value, name);
  if (n > 0xffff_ffffn) {
    throw new AgentActionError(`${name} must fit uint32`);
  }
  return Number(n);
}

function uint16(value: string | number | bigint, name: string): number {
  const n = uint64(value, name);
  if (n > 0xffffn) {
    throw new AgentActionError(`${name} must fit uint16`);
  }
  return Number(n);
}

function score(value: string | number | bigint, name: string): number {
  const n = uint64(value, name);
  if (n < 1n || n > 5n) {
    throw new AgentActionError(`${name} must be between 1 and 5`);
  }
  return Number(n);
}

function boolByte(value: boolean, name: string): 0 | 1 {
  if (value === true) return 1;
  if (value === false) return 0;
  throw new AgentActionError(`${name} must be boolean`);
}

function positiveU128Decimal(value: string, name: string): bigint {
  const n = positiveDecimal(value, name);
  if (n >= (1n << 128n)) {
    throw new AgentActionError(`${name} must fit uint128`);
  }
  return n;
}

function normalizeHexBytes(value: string, name: string): string {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new AgentActionError(`${name} must be 0x-prefixed hex bytes`);
  }
  try {
    hexToBytes(value, name);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new AgentActionError(`${name} must be 0x-prefixed hex bytes${detail}`);
  }
  return value.toLowerCase();
}

function isNativeAgentModuleAddress(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized === NATIVE_AGENT_MODULE_ADDRESS || normalized === NATIVE_AGENT_MODULE_ADDRESS_BYTES;
}

function monoAddressInto(w: BincodeWriter, input: NativeAgentAddressInput, name: string): void {
  const { kind, bytes } = normalizeNativeAgentAddress(input, name);
  w.enumVariant(NATIVE_AGENT_ADDRESS_KIND_VARIANTS[kind]);
  w.rawBytes(bytes);
}

function normalizeNativeAgentAddress(
  input: NativeAgentAddressInput,
  name: string,
): { kind: NativeAgentAddressKind; bytes: Uint8Array } {
  if (typeof input === "string") {
    return normalizeNativeAgentAddressString(input, undefined, name);
  }
  if (typeof input === "object" && input !== null && "address" in input) {
    const kind = input.kind;
    if (kind !== undefined && !(kind in NATIVE_AGENT_ADDRESS_KIND_VARIANTS)) {
      throw new AgentActionError(`${name}.kind is not a supported native address kind`);
    }
    if (typeof input.address !== "string") {
      throw new AgentActionError(`${name}.address must be a typed bech32m address`);
    }
    return normalizeNativeAgentAddressString(input.address, kind, name);
  }
  throw new AgentActionError(`${name} must be a typed bech32m address`);
}

function normalizeNativeAgentAddressString(
  address: string,
  expectedKind: NativeAgentAddressKind | undefined,
  name: string,
): { kind: NativeAgentAddressKind; bytes: Uint8Array } {
  if (address.startsWith("0x") || address.startsWith("0X")) {
    throw new AgentActionError(`${name} raw 0x addresses are retired; use typed bech32m addresses`);
  }
  try {
    const parsed = typedBech32ToAddress(address, expectedKind);
    return { kind: parsed.kind, bytes: parsed.bytes };
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new AgentActionError(`${name} must be a typed bech32m address${detail}`);
  }
}
