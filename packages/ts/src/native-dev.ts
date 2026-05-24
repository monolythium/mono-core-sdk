import { typedBech32ToAddress } from "./address.js";
import type { MrvAbiManifest } from "./bindings/MrvAbiManifest.js";

export const NATIVE_DEV_HOST_API_VERSION = "0.1.0" as const;
export const NATIVE_DEV_MANIFEST_SCHEMA_VERSION = 1 as const;
export const NATIVE_DEV_IPC_PROTOCOL_VERSION = "mono.native-dev.ipc.v1" as const;

export type NativeDevkitChannel = "stable" | "testnet" | "local";
export type NativeDevkitSidecarStatus = "missing" | "stopped" | "starting" | "running" | "unhealthy";
export type NativeDevkitCompatibility = "compatible" | "too_old_for_host" | "too_new_for_host" | "invalid_manifest";
export type StudioHostState = "disabled" | "missing_devkit" | "incompatible_devkit" | "ready";
export type NativeDevRiskSeverity = "info" | "warning" | "critical";

export interface NativeDevRiskLabel {
  id: string;
  title: string;
  severity: NativeDevRiskSeverity;
  detail: string;
}

export interface NativeDevkitArchive {
  url: string;
  sha256: string;
  signature: string;
  signatureScheme?: "ed25519";
  signingKeyId?: string;
  trustRoot?: string;
  signingPublicKey?: string;
  sizeBytes?: number;
}

export interface NativeDevkitSidecarManifest {
  binaryName: string;
  ipcProtocolVersion: string;
}

export interface NativeDevkitManifest {
  schemaVersion: typeof NATIVE_DEV_MANIFEST_SCHEMA_VERSION;
  devkitVersion: string;
  channel: NativeDevkitChannel;
  minimumWalletHostApi: string;
  maximumWalletHostApi: string;
  monoCoreCommit: string;
  monoCoreSdkCommit: string;
  archive: NativeDevkitArchive;
  sidecar: NativeDevkitSidecarManifest;
  releaseNotesUrl?: string;
}

export interface NativeDevkitStatus {
  installedVersion?: string;
  channel: NativeDevkitChannel;
  hostApiVersion: string;
  installPath?: string;
  sidecarStatus: NativeDevkitSidecarStatus;
  manifest?: NativeDevkitManifest;
  compatibility: NativeDevkitCompatibility;
  message: string;
}

export interface StudioHostStatus {
  state: StudioHostState;
  developerModeEnabled: boolean;
  hostApiVersion: string;
  devkit: NativeDevkitStatus;
}

export interface NativeDevSidecarReadyMessage {
  direction: "sidecar_to_host";
  kind: "ready";
  protocolVersion: string;
  devkitVersion: string;
  workspaceRoot?: string;
}

export interface NativeDevSidecarProjectEventMessage {
  direction: "sidecar_to_host";
  kind: "project_event";
  projectId: string;
  event: "created" | "opened" | "build_started" | "build_finished" | "test_finished" | "simulation_finished";
  summary: string;
}

export interface NativeDevSidecarApprovalRequestMessage {
  direction: "sidecar_to_host";
  kind: "approval_request";
  request: NativeDevWalletApprovalRequest;
}

export interface NativeDevHostContextMessage {
  direction: "host_to_sidecar";
  kind: "host_context";
  selectedProjectRoot?: string;
  activeNetwork: {
    networkId: string;
    name: string;
  };
  readOnlyWalletAddress?: string;
}

export interface NativeDevHostApprovalResultMessage {
  direction: "host_to_sidecar";
  kind: "approval_result";
  requestId: string;
  approved: boolean;
  reason?: string;
}

export type NativeDevIpcMessage =
  | NativeDevSidecarReadyMessage
  | NativeDevSidecarProjectEventMessage
  | NativeDevSidecarApprovalRequestMessage
  | NativeDevHostContextMessage
  | NativeDevHostApprovalResultMessage;

export type NativeDevApprovalKind =
  | "mrv_deploy"
  | "mrv_call"
  | "mrc_token_create"
  | "verification_publish";

export interface NativeDevWalletApprovalRequest {
  id: string;
  kind: NativeDevApprovalKind;
  createdAt: string;
  origin: "mono_studio_host" | "mono_devkit" | "lyth_dev_mcp";
  networkId: string;
  authorityAddress: string;
  title: string;
  summary: string;
  riskLabels: NativeDevRiskLabel[];
  payload: Record<string, unknown>;
}

export interface NativeDevMrvDeployPlan {
  networkId: string;
  authorityAddress: string;
  expectedContractAddress: string;
  artifactHash: string;
  abiHash: string;
  valueLythoshi: string;
  executionUnitLimit: string;
  maxExecutionFeeLythoshi: string;
  constructorInput: string;
  riskLabels: NativeDevRiskLabel[];
  abiManifest?: MrvAbiManifest;
  walletApprovalRequest: NativeDevWalletApprovalRequest;
}

export type NativeDevMrcAssetKind =
  | "mrc20_fixed_supply"
  | "mrc20_capped_mint"
  | "mrc721_collection"
  | "mrc1155_collection"
  | "mrc4626_vault";

export interface NativeDevMrcAllocation {
  address: string;
  amount: string;
}

export interface NativeDevMrcTokenPlan {
  assetKind: NativeDevMrcAssetKind;
  name: string;
  symbol: string;
  decimals: number;
  supplyPolicy: "fixed" | "capped" | "collection" | "vault";
  mintPolicy: "none" | "issuer" | "role";
  transferPolicy: "open" | "restricted";
  metadataPolicy: "immutable" | "mutable";
  adminRoles: string[];
  issuerAddress: string;
  initialAllocations: NativeDevMrcAllocation[];
  riskLabels: NativeDevRiskLabel[];
  walletApprovalRequest: NativeDevWalletApprovalRequest;
}

export interface NativeDevVerificationBundle {
  bundleHash: string;
  contractPassport: NativeDevContractPassport;
  artifact: {
    artifactHash: string;
    sourceBundleHash: string;
    abiHash: string;
  };
  files: Array<{
    path: string;
    hash: string;
  }>;
  walletApprovalRequest?: NativeDevWalletApprovalRequest;
}

export interface NativeDevContractPassport {
  address: string;
  artifactHash: string;
  sourceBundleHash: string;
  abiHash: string;
  compilerVersion: string;
  sdkVersion: string;
  templateId?: string;
  verificationStatus: "draft" | "submitted" | "verified" | "rejected";
  riskLabels: NativeDevRiskLabel[];
  deployTx?: string;
  issuer: string;
}

export function compareNativeDevVersions(left: string, right: string): number {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  for (let index = 0; index < 3; index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) return delta > 0 ? 1 : -1;
  }
  return 0;
}

export function checkNativeDevkitCompatibility(
  manifest: NativeDevkitManifest | undefined,
  hostApiVersion: string = NATIVE_DEV_HOST_API_VERSION,
): NativeDevkitCompatibility {
  if (manifest === undefined || manifest.schemaVersion !== NATIVE_DEV_MANIFEST_SCHEMA_VERSION) {
    return "invalid_manifest";
  }
  if (manifest.sidecar.ipcProtocolVersion !== NATIVE_DEV_IPC_PROTOCOL_VERSION) {
    return "invalid_manifest";
  }
  if (compareNativeDevVersions(hostApiVersion, manifest.minimumWalletHostApi) < 0) {
    return "too_new_for_host";
  }
  if (compareNativeDevVersions(hostApiVersion, manifest.maximumWalletHostApi) > 0) {
    return "too_old_for_host";
  }
  return "compatible";
}

export function resolveStudioHostStatus(args: {
  developerModeEnabled: boolean;
  channel: NativeDevkitChannel;
  hostApiVersion?: string;
  installPath?: string;
  manifest?: NativeDevkitManifest;
  sidecarStatus?: NativeDevkitSidecarStatus;
}): StudioHostStatus {
  const hostApiVersion = args.hostApiVersion ?? NATIVE_DEV_HOST_API_VERSION;
  const compatibility = checkNativeDevkitCompatibility(args.manifest, hostApiVersion);
  const installedVersion = args.manifest?.devkitVersion;
  const devkit: NativeDevkitStatus = {
    installedVersion,
    channel: args.channel,
    hostApiVersion,
    installPath: args.installPath,
    sidecarStatus: args.sidecarStatus ?? (args.installPath ? "stopped" : "missing"),
    manifest: args.manifest,
    compatibility,
    message: nativeDevkitStatusMessage(compatibility, args.installPath),
  };

  if (!args.developerModeEnabled) {
    return {
      state: "disabled",
      developerModeEnabled: false,
      hostApiVersion,
      devkit,
    };
  }
  if (!args.installPath || !args.manifest) {
    return {
      state: "missing_devkit",
      developerModeEnabled: true,
      hostApiVersion,
      devkit,
    };
  }
  if (compatibility !== "compatible") {
    return {
      state: "incompatible_devkit",
      developerModeEnabled: true,
      hostApiVersion,
      devkit,
    };
  }
  return {
    state: "ready",
    developerModeEnabled: true,
    hostApiVersion,
    devkit,
  };
}

export function assertNativeDevWalletApprovalRequest(request: NativeDevWalletApprovalRequest): void {
  typedBech32ToAddress(request.authorityAddress, "user");
  if (!request.id.trim()) throw new Error("approval request id is required");
  if (!request.networkId.trim()) throw new Error("approval request network id is required");
  if (!request.title.trim()) throw new Error("approval request title is required");
  if (!request.summary.trim()) throw new Error("approval request summary is required");
}

export function assertNativeDevMrvDeployPlan(plan: NativeDevMrvDeployPlan): void {
  typedBech32ToAddress(plan.authorityAddress, "user");
  typedBech32ToAddress(plan.expectedContractAddress, "contract");
  assertHash("artifactHash", plan.artifactHash);
  assertHash("abiHash", plan.abiHash);
  assertWholeNumber("valueLythoshi", plan.valueLythoshi);
  assertWholeNumber("executionUnitLimit", plan.executionUnitLimit);
  assertWholeNumber("maxExecutionFeeLythoshi", plan.maxExecutionFeeLythoshi);
  assertNativeDevWalletApprovalRequest(plan.walletApprovalRequest);
}

export function assertNativeDevMrcTokenPlan(plan: NativeDevMrcTokenPlan): void {
  typedBech32ToAddress(plan.issuerAddress, "user");
  if (!plan.name.trim()) throw new Error("token name is required");
  if (!/^[A-Z0-9]{2,12}$/.test(plan.symbol)) throw new Error("token symbol must be uppercase");
  if (!Number.isInteger(plan.decimals) || plan.decimals < 0 || plan.decimals > 18) {
    throw new Error("token decimals must be between 0 and 18");
  }
  for (const allocation of plan.initialAllocations) {
    typedBech32ToAddress(allocation.address, "user");
    assertWholeNumber("allocation.amount", allocation.amount);
  }
  assertNativeDevWalletApprovalRequest(plan.walletApprovalRequest);
}

export function nativeDevUiStrings(): readonly string[] {
  return [
    "Mono Studio Host",
    "Developer Mode",
    "DevKit missing",
    "DevKit incompatible",
    "DevKit ready",
    "Wallet approval required",
    "Execution units",
    "Maximum execution fee",
    "Lythoshi value",
    "Artifact hash",
    "ABI manifest",
    "Token passport",
    "Verification bundle",
  ] as const;
}

export function nativeDevSchemaFieldNames(): readonly string[] {
  return [
    "schemaVersion",
    "devkitVersion",
    "channel",
    "minimumWalletHostApi",
    "maximumWalletHostApi",
    "monoCoreCommit",
    "monoCoreSdkCommit",
    "archive",
    "signatureScheme",
    "signingKeyId",
    "trustRoot",
    "signingPublicKey",
    "sidecar",
    "releaseNotesUrl",
    "installedVersion",
    "hostApiVersion",
    "installPath",
    "sidecarStatus",
    "compatibility",
    "developerModeEnabled",
    "selectedProjectRoot",
    "activeNetwork",
    "networkId",
    "readOnlyWalletAddress",
    "requestId",
    "approved",
    "authorityAddress",
    "expectedContractAddress",
    "artifactHash",
    "abiHash",
    "valueLythoshi",
    "executionUnitLimit",
    "maxExecutionFeeLythoshi",
    "constructorInput",
    "walletApprovalRequest",
    "issuerAddress",
    "initialAllocations",
    "bundleHash",
    "contractPassport",
    "sourceBundleHash",
    "compilerVersion",
    "sdkVersion",
    "verificationStatus",
  ] as const;
}

function nativeDevkitStatusMessage(compatibility: NativeDevkitCompatibility, installPath?: string): string {
  if (!installPath) return "DevKit is not installed.";
  if (compatibility === "compatible") return "DevKit is compatible with this wallet host.";
  if (compatibility === "too_old_for_host") return "DevKit is older than this wallet host API.";
  if (compatibility === "too_new_for_host") return "DevKit requires a newer wallet host API.";
  return "DevKit manifest is invalid.";
}

function parseVersionParts(version: string): [number, number, number] {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function assertHash(field: string, value: string): void {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error(`${field} must be a 32 byte lowercase hex hash`);
  }
}

function assertWholeNumber(field: string, value: string): void {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error(`${field} must be a whole number`);
  }
}
