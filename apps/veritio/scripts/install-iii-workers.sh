#!/bin/bash
# Install the pinned iii registry worker binaries (http, queue, state, cron)
# straight from their GitHub release tarballs.
#
# Why: `iii compose --up` (iii 0.23) calls the worker registry
# (api.workers.iii.dev) to resolve every package:// worker on EVERY start, even
# when the package is already cached, and rolls the whole topology back if one
# resolve fails. A registry outage therefore took production down
# (2026-10-15). Production installs these binaries at image build time and
# start.sh launches them itself, so a running deploy never needs the registry.
#
# The versions must match the `version:` of each container in
# worker-compose.yaml (scripts/iii-standalone-workers.ts checks this). To bump a
# worker: resolve the new version once (`iii compose build` prints the GitHub
# release URL it downloads), then update its build tag and all three digests.
#
# Usage: ./scripts/install-iii-workers.sh [DEST_DIR]   (default: .iii/workers)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST_DIR="${1:-$APP_DIR/.iii/workers}"

OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS-$ARCH" in
  Linux-x86_64) TRIPLE="x86_64-unknown-linux-gnu" ;;
  Linux-aarch64 | Linux-arm64) TRIPLE="aarch64-unknown-linux-gnu" ;;
  Darwin-arm64) TRIPLE="aarch64-apple-darwin" ;;
  *) echo "❌ Unsupported platform for iii workers: $OS $ARCH" >&2; exit 1 ;;
esac

# name version release-build-commit triple sha256(tarball)
PINS="
http  0.21.9  8e6ffc5cf3e6eec265640df3b6dc578ef4c3279a x86_64-unknown-linux-gnu  2c36ba2291587be10cea83168b1526e89e014c94ea89fd1980c9d97edad9fdb2
http  0.21.9  8e6ffc5cf3e6eec265640df3b6dc578ef4c3279a aarch64-unknown-linux-gnu 234005faf711238616f7edf6e97756902d7fe91cbcdf6573add54d23aee8262c
http  0.21.9  8e6ffc5cf3e6eec265640df3b6dc578ef4c3279a aarch64-apple-darwin      8277469cd7b2dd322e65bc0b1cac8d1e61ceada2f403d37a3da2ae1a842b2afb
queue 0.21.12 c25f52d54fe12de5b1baf3324047799c62dacefc x86_64-unknown-linux-gnu  112fb98ba59b3521246cbbbfe173e8fee9d892011ba2886c6344bf6695471749
queue 0.21.12 c25f52d54fe12de5b1baf3324047799c62dacefc aarch64-unknown-linux-gnu 4ff03f60d76c9acd7088f37980675088dd7e2b5978fa725f55634800fcd5adb6
queue 0.21.12 c25f52d54fe12de5b1baf3324047799c62dacefc aarch64-apple-darwin      6119b6c9f140c80f2cbc634073f4c960bea513f78162c0794fa890983f1b9a12
state 0.22.10 954e787e1d4282519470a1ba5a430cc95d1bd41c x86_64-unknown-linux-gnu  a0108fc63979cf3c075e7ec700ee39f31d8761be3c3b3e6ee86dc1d2ce11ca90
state 0.22.10 954e787e1d4282519470a1ba5a430cc95d1bd41c aarch64-unknown-linux-gnu 848235e5346644994d66295d087458c34482d085e90603b3e9232222c65fd461
state 0.22.10 954e787e1d4282519470a1ba5a430cc95d1bd41c aarch64-apple-darwin      8cd270727a5903795e5dd3e7a9b452671c40b609ed95d6c5f318a5f63d2ef6c9
cron  0.21.18 c86b4ddbd414eb43683cc70c6a3245b7e56c0cc3 x86_64-unknown-linux-gnu  b580bbaf14400e36a5cbc9ca86ecc3c0a5faf8f3834bbb15ca3654a67ca9647c
cron  0.21.18 c86b4ddbd414eb43683cc70c6a3245b7e56c0cc3 aarch64-unknown-linux-gnu 943c9991247910b9954df09c72fba0835068694d7586e67cffce4948a14ad271
cron  0.21.18 c86b4ddbd414eb43683cc70c6a3245b7e56c0cc3 aarch64-apple-darwin      c4e9ac54075f4318fc88876ab3f8dc7e5a010290284ce3a29aa83926bab36abf
"

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

mkdir -p "$DEST_DIR"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

INSTALLED=0
while read -r NAME VERSION BUILD PIN_TRIPLE EXPECTED_SHA; do
  [ -z "$NAME" ] || [ "$PIN_TRIPLE" != "$TRIPLE" ] && continue
  MARKER="$DEST_DIR/$NAME.version"
  if [ -x "$DEST_DIR/$NAME" ] && [ -f "$MARKER" ] && \
     [ "$(cat "$MARKER")" = "$VERSION $EXPECTED_SHA" ]; then
    INSTALLED=$((INSTALLED + 1))
    continue
  fi
  ASSET="$NAME-$TRIPLE.tar.gz"
  echo "⬇️  $NAME $VERSION ($ASSET)"
  curl -fsSL --retry 5 --retry-all-errors --retry-delay 3 \
    "https://github.com/iii-hq/workers/releases/download/build-$BUILD/$ASSET" \
    -o "$TMP_DIR/$ASSET"
  if [ "$(sha256_of "$TMP_DIR/$ASSET")" != "$EXPECTED_SHA" ]; then
    echo "❌ Checksum mismatch for $ASSET" >&2
    exit 1
  fi
  mkdir -p "$TMP_DIR/$NAME"
  tar xzf "$TMP_DIR/$ASSET" -C "$TMP_DIR/$NAME"
  install -m 0755 "$TMP_DIR/$NAME/$NAME" "$DEST_DIR/$NAME"
  echo "$VERSION $EXPECTED_SHA" > "$MARKER"
  INSTALLED=$((INSTALLED + 1))
done <<< "$PINS"

if [ "$INSTALLED" -ne 4 ]; then
  echo "❌ Expected 4 iii workers for $TRIPLE, installed $INSTALLED" >&2
  exit 1
fi
echo "✅ iii workers installed in $DEST_DIR"
