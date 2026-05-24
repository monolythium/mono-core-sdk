import { createHash } from "node:crypto";
import { join } from "node:path";

const templates = [
  {
    id: "counter-example",
    name: "Counter Example",
    category: "example",
    expectedSyscalls: ["state.read", "state.write", "event.emit"],
    riskLabels: [{ id: "example", title: "Example contract", severity: "info" }],
  },
  {
    id: "hello-storage",
    name: "Hello Storage",
    category: "example",
    expectedSyscalls: ["state.read", "state.write"],
    riskLabels: [{ id: "example", title: "Example contract", severity: "info" }],
  },
  {
    id: "vesting-lockup",
    name: "Vesting Lockup",
    category: "contract",
    expectedSyscalls: ["state.read", "state.write", "time.now", "asset.transfer"],
    riskLabels: [{ id: "schedule-review", title: "Schedule review", severity: "warning" }],
  },
];

export function listTemplates() {
  return templates.map((template) => ({
    ...template,
    deterministicBuildHash: sha256(template),
  }));
}

export function getTemplate(templateId) {
  const template = listTemplates().find((entry) => entry.id === templateId);
  if (!template) throw new Error(`unknown template: ${templateId}`);
  return template;
}

export function createProject(templateId, name, out) {
  const template = getTemplate(templateId);
  const safeName = safePathName(name);
  const now = new Date().toISOString();
  const root = join(out, safeName);
  const project = {
    id: `mono-project-${sha256({ templateId, name, now }).slice(0, 12)}`,
    name,
    rootPath: root,
    templateId,
    packageManager: "cargo",
    mrvProfile: "debug",
    sdkVersion: "0.1.0",
    monoCoreCommit: "pending-core-pin",
    createdAt: now,
    lastOpenedAt: now,
  };
  return {
    root,
    project: project.id,
    template: template.id,
    files: {
      "mono.project.json": `${JSON.stringify(project, null, 2)}\n`,
      "template.manifest.json": `${JSON.stringify(template, null, 2)}\n`,
      "Cargo.toml": `[package]
name = "${safeName}"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]
`,
      "src/lib.rs": `#![no_std]

pub fn init() -> u64 {
    0
}

pub fn increment(current: u64, amount: u64) -> u64 {
    current.saturating_add(amount)
}

pub fn read(current: u64) -> u64 {
    current
}
`,
      "tests/fixture.json": `${JSON.stringify({ templateId, state: { value: "0" } }, null, 2)}\n`,
    },
  };
}

export function buildArtifact(project, sources) {
  const template = getTemplate(project.templateId);
  const sourceBundleHash = sha256(sources);
  const abiManifest = {
    name: project.name,
    version: "1",
    exports: [
      { name: "init", inputs: [], output: "u64", mutatesState: true },
      { name: "increment", inputs: ["u64"], output: "u64", mutatesState: true },
      { name: "read", inputs: [], output: "u64", mutatesState: false },
    ],
  };
  const codeHash = sha256({ project, sources });
  const artifactHash = sha256({ codeHash, sourceBundleHash, abiManifest });
  return {
    kind: "mrv-artifact-preview",
    artifactHash,
    codeHash,
    sourceBundleHash,
    abiHash: sha256(abiManifest),
    abiManifest,
    syscalls: template.expectedSyscalls,
    memoryLimits: { initialPages: 2, maxPages: 16 },
    storageNamespace: `mrv.${project.id}`,
    buildMetadata: {
      templateId: project.templateId,
      sdkVersion: project.sdkVersion,
      monoCoreCommit: project.monoCoreCommit,
      builtAt: new Date().toISOString(),
    },
  };
}

export function validateArtifact(artifact) {
  const diagnostics = [];
  if (!/^[0-9a-f]{64}$/.test(artifact.artifactHash ?? "")) diagnostics.push("artifact hash is invalid");
  if (!Array.isArray(artifact.syscalls) || artifact.syscalls.length === 0) diagnostics.push("syscall list is missing");
  if (!artifact.abiManifest?.exports?.length) diagnostics.push("ABI manifest exports are missing");
  return { ok: diagnostics.length === 0, diagnostics };
}

export function simulate(artifact, call) {
  const seed = sha256({ artifactHash: artifact.artifactHash, call });
  return {
    status: "ok",
    returnData: `ok:${seed.slice(0, 10)}`,
    cyclesUsed: 75_000 + Number.parseInt(seed.slice(0, 4), 16),
    syscallUnits: artifact.syscalls.length * 120,
    stateIoUnits: 2,
    events: [{ name: `${call}.completed`, data: { result: seed.slice(0, 8) } }],
    stateDiff: [{ key: `${artifact.storageNamespace}.${call}`, before: "0", after: "1" }],
    trace: [
      { step: 1, op: "state.read", units: 80 },
      { step: 2, op: call, units: 24000 },
      { step: 3, op: "event.emit", units: 40 },
    ],
    diagnostics: ["Preview simulation completed. Replace with canonical runner when pinned."],
  };
}

export function createDeployPlan({ networkId, authorityAddress, artifact }) {
  const expectedContractAddress = `monoc1${sha256({ networkId, authorityAddress, artifactHash: artifact.artifactHash }).slice(0, 38)}`;
  return {
    networkId,
    authorityAddress,
    expectedContractAddress,
    artifactHash: artifact.artifactHash,
    abiHash: artifact.abiHash,
    valueLythoshi: "0",
    executionUnitLimit: "1250000",
    maxExecutionFeeLythoshi: "10000000",
    constructorInput: "",
    riskLabels: [{ id: "wallet-approval", title: "Wallet approval required", severity: "info" }],
    walletApprovalRequest: {
      id: `approval-${sha256({ networkId, authorityAddress, artifactHash: artifact.artifactHash }).slice(0, 12)}`,
      kind: "mrv_deploy",
      createdAt: new Date().toISOString(),
      origin: "mono_devkit",
      networkId,
      authorityAddress,
      title: "Review MRV deploy plan",
      summary: "Prepared by Mono DevKit. Wallet approval is required before signing.",
      riskLabels: [{ id: "wallet-approval", title: "Wallet approval required", severity: "info" }],
      payload: { artifactHash: artifact.artifactHash, expectedContractAddress },
    },
  };
}

export function createVerificationBundle(artifact, deployPlan, sources) {
  const files = Object.entries(sources).map(([path, content]) => ({ path, hash: sha256(content) }));
  const contractPassport = {
    address: deployPlan.expectedContractAddress,
    artifactHash: artifact.artifactHash,
    sourceBundleHash: artifact.sourceBundleHash,
    abiHash: artifact.abiHash,
    compilerVersion: "mono-dev-preview",
    sdkVersion: artifact.buildMetadata.sdkVersion,
    templateId: artifact.buildMetadata.templateId,
    verificationStatus: "draft",
    riskLabels: deployPlan.riskLabels,
    issuer: deployPlan.authorityAddress,
  };
  return {
    bundleHash: sha256({ contractPassport, files }),
    contractPassport,
    artifact: {
      artifactHash: artifact.artifactHash,
      sourceBundleHash: artifact.sourceBundleHash,
      abiHash: artifact.abiHash,
    },
    files,
  };
}

function safePathName(value) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "mono-project";
}

function sha256(value) {
  const text = typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(text).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
