import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const cli = join(root, "bin", "mono-dev.mjs");
const temp = mkdtempSync(join(tmpdir(), "mono-dev-smoke-"));

run(["templates"]);
run(["new", "Counter", "--template", "counter-example", "--out", temp]);
run(["build", join(temp, "counter")]);
run(["simulate", join(temp, "counter")]);
const deployPlan = JSON.parse(run(["deploy-plan", join(temp, "counter")]));
run(["verify-bundle", join(temp, "counter")]);
const sidecarMessages = run(["sidecar"], {
  input: `${JSON.stringify({
    direction: "host_to_sidecar",
    kind: "host_context",
    protocolVersion: "mono.native-dev.ipc.v1",
    selectedProjectRoot: join(temp, "counter"),
    activeNetwork: { networkId: "local-dev", name: "Local Dev" },
  })}\n${JSON.stringify({
    direction: "host_to_sidecar",
    kind: "devkit_command",
    protocolVersion: "mono.native-dev.ipc.v1",
    requestId: "deploy-plan-smoke",
    command: "deploy_plan",
    networkId: "local-dev",
    authorityAddress: "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4",
  })}\n${JSON.stringify({
    direction: "host_to_sidecar",
    kind: "approval_result",
    protocolVersion: "mono.native-dev.ipc.v1",
    requestId: "preview-smoke",
    approved: true,
  })}\n`,
}).trim().split("\n").map((line) => JSON.parse(line));
assert.equal(sidecarMessages[0].kind, "ready");
assert.equal(sidecarMessages[0].protocolVersion, "mono.native-dev.ipc.v1");
assert.equal(sidecarMessages[1].kind, "project_event");
assert.equal(sidecarMessages[1].event, "opened");
assert.equal(sidecarMessages[2].kind, "project_event");
assert.equal(sidecarMessages[2].event, "build_started");
assert.equal(sidecarMessages[3].kind, "command_result");
assert.equal(sidecarMessages[3].command, "deploy_plan");
assert.equal(sidecarMessages[3].ok, true);
assert.equal(sidecarMessages[3].output.artifactHash, deployPlan.artifactHash);
assert.equal(sidecarMessages[4].kind, "project_event");
assert.equal(sidecarMessages[4].event, "build_finished");
assert.equal(sidecarMessages[5].kind, "approval_request");
assert.equal(sidecarMessages[5].request.kind, "mrv_deploy");
assert.equal(sidecarMessages[5].request.networkId, "local-dev");
assert.equal(sidecarMessages[5].request.payload.artifactHash, deployPlan.artifactHash);
assert.equal(sidecarMessages[5].request.payload.abiHash, deployPlan.abiHash);
assert.equal(sidecarMessages[5].request.payload.expectedContractAddress, deployPlan.expectedContractAddress);
assert.notEqual(sidecarMessages[5].request.payload.artifactHash, "0".repeat(64));
assert.equal(sidecarMessages[6].kind, "project_event");
assert.equal(sidecarMessages[6].event, "simulation_finished");

const readinessMessages = run(["sidecar"], {
  input: `${JSON.stringify({
    direction: "host_to_sidecar",
    kind: "devkit_command",
    protocolVersion: "mono.native-dev.ipc.v1",
    requestId: "readiness-smoke",
    command: "readiness",
  })}\n`,
}).trim().split("\n").map((line) => JSON.parse(line));
assert.equal(readinessMessages[0].kind, "ready");
assert.equal(readinessMessages[2].kind, "command_result");
assert.equal(readinessMessages[2].command, "readiness");
assert.equal(readinessMessages[2].ok, true);

rmSync(temp, { recursive: true, force: true });
console.log("mono-dev smoke passed");

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", ...options });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}
