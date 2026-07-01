#!/usr/bin/env node
// Regenerates src/version.ts from package.json so the runtime `version`
// export can never drift from the published package version.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
const outPath = fileURLToPath(new URL("../src/version.ts", import.meta.url));

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const contents = `// Generated from package.json by scripts/gen-version.mjs — do not edit by hand.
export const version = ${JSON.stringify(pkg.version)};
`;

writeFileSync(outPath, contents);
