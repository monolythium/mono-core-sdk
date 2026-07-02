/**
 * The runtime `version` export must equal the published package version.
 *
 * `src/version.ts` is generated from `package.json` by
 * `scripts/gen-version.mjs` (run on `build`). This spec fails if the
 * committed export ever drifts from `package.json`, so a version bump
 * that forgets to regenerate is caught in CI before publish.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { version } from "../src/index.js";

describe("version export", () => {
  it("matches package.json", () => {
    const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
    expect(version).toBe(pkg.version);
  });
});
