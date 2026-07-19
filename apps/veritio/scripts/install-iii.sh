#!/bin/bash
# Install the pinned iii engine binaries into apps/veritio/.iii/bin/
#
# Why pinned + local: the iii.dev installer auto-updates and previously drifted
# a dev machine from the repo's supported engine version, breaking config
# compatibility. We pin an exact release and keep binaries repo-local so the
# engine version is reproducible per checkout (never ~/.local/bin).
#
# Usage: ./scripts/install-iii.sh
# Override version: III_VERSION=0.21.6 ./scripts/install-iii.sh
set -euo pipefail

III_VERSION="${III_VERSION:-0.21.6}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BIN_DIR="$APP_DIR/.iii/bin"

# Map host platform → release asset triple
OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS-$ARCH" in
  Darwin-arm64)  TRIPLE="aarch64-apple-darwin" ;;
  Darwin-x86_64) TRIPLE="x86_64-apple-darwin" ;;
  Linux-x86_64)  TRIPLE="x86_64-unknown-linux-gnu" ;;
  Linux-aarch64) TRIPLE="aarch64-unknown-linux-gnu" ;;
  *) echo "❌ Unsupported platform: $OS $ARCH" >&2; exit 1 ;;
esac

# Idempotent: skip if the pinned version is already installed
if [ -x "$BIN_DIR/iii" ]; then
  INSTALLED="$("$BIN_DIR/iii" --version 2>/dev/null || echo none)"
  if [ "$INSTALLED" = "$III_VERSION" ]; then
    echo "✅ iii $III_VERSION already installed at $BIN_DIR"
    exit 0
  fi
  echo "♻️  Replacing iii $INSTALLED with $III_VERSION..."
fi

mkdir -p "$BIN_DIR"
BASE_URL="https://github.com/iii-hq/iii/releases/download/iii%2Fv${III_VERSION}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# The engine spawns companion worker binaries from its own directory/PATH,
# so install every binary the release ships for this platform.
# iii-init and iii-console are optional (installer/UI); tolerate absence.
for BINARY in iii iii-worker iii-init iii-console; do
  ASSET="${BINARY}-${TRIPLE}.tar.gz"
  URL="$BASE_URL/$ASSET"
  echo "⬇️  $ASSET"
  if curl -fsSL "$URL" -o "$TMP_DIR/$ASSET" 2>/dev/null; then
    tar xzf "$TMP_DIR/$ASSET" -C "$BIN_DIR"
  else
    if [ "$BINARY" = "iii" ] || [ "$BINARY" = "iii-worker" ]; then
      echo "❌ Required asset missing: $URL" >&2
      exit 1
    fi
    echo "   (optional $BINARY not published for $TRIPLE — skipping)"
  fi
done

chmod +x "$BIN_DIR"/iii* 2>/dev/null || true

INSTALLED="$("$BIN_DIR/iii" --version)"
if [ "$INSTALLED" != "$III_VERSION" ]; then
  echo "❌ Version mismatch after install: got $INSTALLED, expected $III_VERSION" >&2
  exit 1
fi
echo "✅ iii $INSTALLED installed: $(ls "$BIN_DIR" | tr '\n' ' ')"
