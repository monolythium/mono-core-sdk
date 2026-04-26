#!/usr/bin/env bash
# Verify `pnpm pack` produces an installable @monolythium/core-sdk
# tarball whose layout is what npm consumers expect. Used as the
# lightweight publish-readiness gate between Stage 2 and Stage 4.
#
# Usage:
#   bash packages/ts/scripts/pnpm-pack-smoke.sh

set -euo pipefail

pkg_dir=$(cd "$(dirname "$0")/.." && pwd)
cd "$pkg_dir"

echo "[smoke] cleaning prior artifacts"
rm -f monolythium-core-sdk-*.tgz

echo "[smoke] running tsup build"
pnpm run build >/dev/null

echo "[smoke] packing tarball"
tarball=$(pnpm pack | tail -n 1)
if [ -z "$tarball" ] || [ ! -f "$tarball" ]; then
  echo "[smoke] error: pnpm pack did not produce a tarball" >&2
  exit 1
fi

echo "[smoke] tarball: $tarball"
size=$(stat -f%z "$tarball" 2>/dev/null || stat -c%s "$tarball")
echo "[smoke] size: $size bytes"

echo "[smoke] inspecting contents"
contents=$(tar -tzf "$tarball")

# Required entries inside the tarball.
required=(
  "package/package.json"
  "package/dist/index.js"
  "package/dist/index.cjs"
  "package/dist/index.d.ts"
  "package/README.md"
)

missing=0
for entry in "${required[@]}"; do
  if ! grep -qx "$entry" <<<"$contents"; then
    echo "[smoke] missing: $entry" >&2
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  echo "[smoke] failed — tarball is missing required files" >&2
  echo "[smoke] full listing:" >&2
  echo "$contents" >&2
  exit 1
fi

# Make sure no source / test artifacts leaked.
forbidden_patterns=(
  "package/src/"
  "package/tests/"
  "package/scripts/"
  "package/tsconfig.json"
  "package/tsup.config"
)
for pat in "${forbidden_patterns[@]}"; do
  if grep -q "$pat" <<<"$contents"; then
    echo "[smoke] forbidden: $pat leaked into tarball" >&2
    exit 1
  fi
done

echo "[smoke] ok — $tarball ($size bytes)"
