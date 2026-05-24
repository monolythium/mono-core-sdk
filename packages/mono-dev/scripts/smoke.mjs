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

rmSync(temp, { recursive: true, force: true });
console.log("mono-dev smoke passed");

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}
