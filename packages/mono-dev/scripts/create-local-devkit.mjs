#!/usr/bin/env node
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.env.MONO_DEV_VERSION ?? "0.1.0";
const channel = process.env.MONO_DEV_CHANNEL ?? "local";
const outRoot = resolve(process.argv[2] ?? join(root, "dist", "local"));
const releaseRoot = join(outRoot, `mono-devkit-${version}`);
const archiveName = `mono-devkit-${version}.tar`;
const archivePath = join(outRoot, archiveName);

rmSync(releaseRoot, { recursive: true, force: true });
mkdirSync(join(releaseRoot, "bin"), { recursive: true });
mkdirSync(join(releaseRoot, "lib"), { recursive: true });
copyByTar(root, releaseRoot, ["package.json", "bin", "lib", "templates"]);

rmSync(archivePath, { force: true });
const tar = spawnSync("tar", ["-cf", archivePath, "-C", outRoot, `mono-devkit-${version}`], {
  stdio: "inherit",
});
if (tar.status !== 0) process.exit(tar.status ?? 1);

const archiveSha256 = sha256File(archivePath);
const manifest = {
  schema_version: 1,
  devkit_version: version,
  channel,
  minimum_wallet_host_api: "0.1.0",
  maximum_wallet_host_api: "0.1.9",
  mono_core_commit: process.env.MONO_CORE_COMMIT ?? "pending-core-pin",
  mono_core_sdk_commit: process.env.MONO_CORE_SDK_COMMIT ?? "local-source",
  archive: {
    url: archiveName,
    sha256: archiveSha256,
    signature: "",
  },
  sidecar: {
    binary_name: "mono-dev",
    ipc_protocol_version: "mono.native-dev.ipc.v1",
  },
  release_notes_url: "https://github.com/monolythium/mono-core-sdk",
};
signManifest(manifest);
writeFileSync(join(outRoot, "mono-devkit-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(releaseRoot, "mono-devkit-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  releaseRoot,
  archivePath,
  manifestPath: join(outRoot, "mono-devkit-manifest.json"),
  archiveSha256,
}, null, 2));

function copyByTar(from, to, entries) {
  const result = spawnSync("tar", ["-cf", "-", ...entries], { cwd: from, encoding: "buffer" });
  if (result.status !== 0) {
    process.stderr.write(String(result.stderr));
    process.exit(result.status ?? 1);
  }
  const extract = spawnSync("tar", ["-xf", "-", "-C", to], { input: result.stdout, encoding: "buffer" });
  if (extract.status !== 0) {
    process.stderr.write(String(extract.stderr));
    process.exit(extract.status ?? 1);
  }
}

function sha256File(path) {
  const data = spawnSync("sha256sum", [path], { encoding: "utf8" });
  if (data.status === 0) return data.stdout.trim().split(/\s+/)[0];
  const bytes = spawnSync("cat", [path], { encoding: "buffer" });
  if (bytes.status !== 0) process.exit(bytes.status ?? 1);
  return createHash("sha256").update(bytes.stdout).digest("hex");
}

function signManifest(manifest) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicJwk = publicKey.export({ format: "jwk" });
  if (publicJwk.crv !== "Ed25519" || typeof publicJwk.x !== "string") {
    throw new Error("generated DevKit signing key is not Ed25519");
  }
  manifest.archive.signature_scheme = "ed25519";
  manifest.archive.signing_public_key = publicJwk.x;
  manifest.archive.signing_key_id = `local-dev:${createHash("sha256")
    .update(Buffer.from(publicJwk.x, "base64url"))
    .digest("hex")
    .slice(0, 16)}`;
  manifest.archive.trust_root = "local-dev";
  manifest.archive.signature = sign(null, Buffer.from(manifestSignaturePayload(manifest)), privateKey)
    .toString("base64url");
}

function manifestSignaturePayload(manifest) {
  return [
    "mono-devkit-manifest-v1",
    `schema_version=${manifest.schema_version}`,
    `devkit_version=${manifest.devkit_version}`,
    `channel=${manifest.channel}`,
    `minimum_wallet_host_api=${manifest.minimum_wallet_host_api}`,
    `maximum_wallet_host_api=${manifest.maximum_wallet_host_api}`,
    `mono_core_commit=${manifest.mono_core_commit}`,
    `mono_core_sdk_commit=${manifest.mono_core_sdk_commit}`,
    `archive_url=${manifest.archive.url}`,
    `archive_sha256=${manifest.archive.sha256}`,
    `sidecar_binary_name=${manifest.sidecar.binary_name}`,
    `sidecar_ipc_protocol_version=${manifest.sidecar.ipc_protocol_version}`,
    `release_notes_url=${manifest.release_notes_url ?? ""}`,
    "",
  ].join("\n");
}
