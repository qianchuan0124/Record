#!/usr/bin/env bash
# 本机打包（electron-builder 默认目标，不生成内网分发用的 zip/dmg）。
# 环境要求：Node 18 LTS（arm64）；OpenSSL 3 下 webpack 5 需要 legacy provider。
set -euo pipefail

cd "$(dirname "$0")/.."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "需要 Node 18+，当前 $(node -v)，请先执行 nvm use" >&2
  exit 1
fi

if [ "$(node -p 'process.arch')" != "arm64" ]; then
  echo "需要 arm64 版 Node（当前 $(node -p 'process.arch')），请使用 Apple Silicon 原生 Node" >&2
  exit 1
fi

export NODE_OPTIONS="${NODE_OPTIONS:-} --openssl-legacy-provider"
export CSC_IDENTITY_AUTO_DISCOVERY=false

npx vue-cli-service electron:build "$@"
