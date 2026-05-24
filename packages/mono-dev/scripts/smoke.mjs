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
run(["deploy-plan", join(temp, "counter")]);
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
    kind: "request_preview_approval",
    protocolVersion: "mono.native-dev.ipc.v1",
    networkId: "local-dev",
    authorityAddress: "mono1devkitpreview00000000000000",
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
assert.equal(sidecarMessages[2].kind, "approval_request");
assert.equal(sidecarMessages[2].request.kind, "mrv_deploy");
assert.equal(sidecarMessages[2].request.networkId, "local-dev");
assert.equal(sidecarMessages[3].kind, "project_event");
assert.equal(sidecarMessages[3].event, "simulation_finished");

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
