#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_DIR="$ROOT_DIR/../node-v22.14.0-darwin-arm64/bin"

export PATH="$NODE_DIR:$PATH"

cd "$ROOT_DIR"
exec "./node_modules/.bin/astro" build
