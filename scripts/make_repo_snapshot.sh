#!/usr/bin/env bash
# Create a safe, lean repo snapshot zip from repo root.
set -euo pipefail

# Ensure we are at repo root (best effort)
if [[ ! -f "pnpm-workspace.yaml" && ! -d ".git" ]]; then
  echo "ERROR: Run this from the repo root (couldn't find .git or pnpm-workspace.yaml)."
  exit 1
fi

DATE="${1:-$(date +%F)}"
OUTDIR="${OUTDIR:-./snapshots}"
ZIP="${OUTDIR}/repo-${DATE}.zip"

mkdir -p "$OUTDIR"
rm -f "$ZIP"

# Build a file list without ever walking excluded dirs (more reliable than zip -x globs)
# Then zip from stdin with -@.
# Note: We include only regular files. Directories are implied by file paths.
find . \
  \( \
    -path "./.git" -o -path "./.git/*" -o \
    -path "./snapshots" -o -path "./snapshots/*" -o \
    -path "./node_modules" -o -path "./node_modules/*" -o \
    -path "*/node_modules" -o -path "*/node_modules/*" -o \
    -path "*/.next" -o -path "*/.next/*" -o \
    -path "*/dist" -o -path "*/dist/*" -o \
    -path "*/build" -o -path "*/build/*" -o \
    -path "*/out" -o -path "*/out/*" -o \
    -path "*/.turbo" -o -path "*/.turbo/*" -o \
    -path "*/.vercel" -o -path "*/.vercel/*" -o \
    -path "*/coverage" -o -path "*/coverage/*" -o \
    -path "*/.pnpm-store" -o -path "*/.pnpm-store/*" -o \
    -path "*/.cache" -o -path "*/.cache/*" -o \
    -path "*/tmp" -o -path "*/tmp/*" -o \
    -path "*/.vscode" -o -path "*/.vscode/*" -o \
    -path "*/.idea" -o -path "*/.idea/*" -o \
    -path "*/.aws" -o -path "*/.aws/*" -o \
    -path "*/.ssh" -o -path "*/.ssh/*" -o \
    -path "*/__MACOSX" -o -path "*/__MACOSX/*" -o \
    -path "*/.AppleDouble" -o -path "*/.AppleDouble/*" \
  \) -prune -o \
  -type f \
  ! -name ".DS_Store" \
  ! -name "*.log" \
  ! -name ".env" \
  ! -name ".env.*" \
  ! -name ".env*.local" \
  ! -name "*.pem" ! -name "*.key" ! -name "*.p12" ! -name "*.pfx" ! -name "*.crt" ! -name "*.cer" ! -name "*.der" \
  ! -name "*.jks" ! -name "*.keystore" \
  ! -name ".npmrc" ! -name ".yarnrc" ! -name ".yarnrc.yml" ! -name ".netrc" \
  ! -name "id_rsa" ! -name "id_ed25519" \
  ! -name "*.sqlite" ! -name "*.db" ! -name "*.dump" ! -name "*.bak*" \
  -print \
| zip -q -@ "$ZIP"

echo "Created: $ZIP"
ls -lh "$ZIP"

# Leak check (fail if these appear) — filename-only listing
if zipinfo -1 "$ZIP" | egrep -q '(^|/)\.DS_Store$|(^|/)node_modules/'; then
  echo "ERROR: Snapshot contains .DS_Store and/or node_modules. Aborting."
  echo "Leaked entries:"
  zipinfo -1 "$ZIP" | egrep '(^|/)\.DS_Store$|(^|/)node_modules/' | head -n 200
  exit 1
fi

echo "✅ Leak check passed (.DS_Store + node_modules excluded)."
