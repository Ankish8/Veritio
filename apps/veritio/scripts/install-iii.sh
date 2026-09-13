#!/bin/bash
# Install the pinned iii engine binaries into apps/veritio/.iii/bin/
#
# Why pinned + local: the iii.dev installer auto-updates and previously drifted
# a dev machine from the repo's supported engine version, breaking config
# compatibility. We pin an exact release and keep binaries repo-local so the
# engine version is reproducible per checkout (never ~/.local/bin).
#
# Usage: ./scripts/install-iii.sh
# Override version: III_VERSION=0.23.0 ./scripts/install-iii.sh
set -euo pipefail

III_VERSION="${III_VERSION:-0.23.0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BIN_DIR="$APP_DIR/.iii/bin"

# Map host platform to release assets and immutable archive digests. The
# upstream v0.23.0 tag has been republished in place, so a version string by
# itself is not a sufficient supply-chain pin.
OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS-$ARCH" in
  Darwin-arm64)
    TRIPLE="aarch64-apple-darwin"
    III_SHA="568f49b781dfe87781fa65d71def741ec0e7225011b941e5fe7f8196afebee50"
    III_WORKER_SHA="557381a6d0ff288ef5814d71f6444e6fc6890ce38151e8018365b3ba0135057f"
    ;;
  Linux-x86_64)
    TRIPLE="x86_64-unknown-linux-gnu"
    III_SHA="213e4bcfd413b50e8d97316fdadb4d78f0919436d3e64e4051d56fc8ff41decb"
    III_WORKER_SHA="b77eab8e65c4a642ab9202456ed55c032c8e98a10b42222c6e7be894782fe8af"
    ;;
  Linux-aarch64)
    TRIPLE="aarch64-unknown-linux-gnu"
    III_SHA="461508b43b9be9df5477a45ca0adce12327c2330eedf887dfe31ce0a80f043eb"
    III_WORKER_SHA="493652be0368017772e47b39389551e72a37cc19f0e9a867060ab769555bb594"
    ;;
  Darwin-x86_64)
    echo "❌ iii $III_VERSION does not publish the required iii-worker binary for Intel macOS" >&2
    exit 1
    ;;
  *) echo "❌ Unsupported platform: $OS $ARCH" >&2; exit 1 ;;
esac

# Idempotent only when the exact verified archives installed the binaries and
# the required Compose command is present.
PIN_MARKER="$BIN_DIR/.iii-${III_VERSION}-${TRIPLE}.sha256"
EXPECTED_MARKER="iii=${III_SHA}\niii-worker=${III_WORKER_SHA}"
if [ -x "$BIN_DIR/iii" ] && [ -x "$BIN_DIR/iii-worker" ] && [ -f "$PIN_MARKER" ]; then
  INSTALLED="$("$BIN_DIR/iii" --version 2>/dev/null || echo none)"
  if [ "$INSTALLED" = "$III_VERSION" ] && \
     [ "$(cat "$PIN_MARKER")" = "$(printf '%b' "$EXPECTED_MARKER")" ] && \
     "$BIN_DIR/iii" compose --help >/dev/null 2>&1; then
    echo "✅ iii $III_VERSION already installed at $BIN_DIR"
    exit 0
  fi
  echo "♻️  Replacing iii $INSTALLED with $III_VERSION..."
fi

mkdir -p "$BIN_DIR"
BASE_URL="https://github.com/iii-hq/iii/releases/download/iii%2Fv${III_VERSION}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# The Compose daemon requires both the engine and companion worker runtime.
for BINARY in iii iii-worker; do
  ASSET="${BINARY}-${TRIPLE}.tar.gz"
  URL="$BASE_URL/$ASSET"
  if [ "$BINARY" = "iii" ]; then
    EXPECTED_SHA="$III_SHA"
  else
    EXPECTED_SHA="$III_WORKER_SHA"
  fi
  echo "⬇️  $ASSET"
  curl -fsSL "$URL" -o "$TMP_DIR/$ASSET"
  ACTUAL_SHA="$(shasum -a 256 "$TMP_DIR/$ASSET" | awk '{print $1}')"
  if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
    echo "❌ Checksum mismatch for $ASSET" >&2
    exit 1
  fi
  tar xzf "$TMP_DIR/$ASSET" -C "$BIN_DIR"
done

chmod +x "$BIN_DIR"/iii* 2>/dev/null || true

INSTALLED="$("$BIN_DIR/iii" --version)"
if [ "$INSTALLED" != "$III_VERSION" ]; then
  echo "❌ Version mismatch after install: got $INSTALLED, expected $III_VERSION" >&2
  exit 1
fi
if ! "$BIN_DIR/iii" compose --help >/dev/null 2>&1; then
  echo "❌ Installed iii binary does not provide the required Compose command" >&2
  exit 1
fi
printf '%b\n' "$EXPECTED_MARKER" > "$PIN_MARKER"
echo "✅ iii $INSTALLED installed: $(ls "$BIN_DIR" | tr '\n' ' ')"
