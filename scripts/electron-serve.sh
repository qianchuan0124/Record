#!/usr/bin/env bash
# 本地开发：渲染进程 dev server + Electron（arm64）。
# 环境要求：Node 18 LTS（arm64）。
set -euo pipefail

cd "$(dirname "$0")/.."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "需要 Node 18+，当前 $(node -v)，请先执行 nvm use" >&2
  exit 1
fi

# 不能在这里设置 NODE_OPTIONS：开发模式会启动 Electron，
# 而 Electron 13 内置的 Node 14 不认 --openssl-legacy-provider，主进程会直接退出。
# 开发模式的打包不需要这个参数；只有 dist:mac 打包才需要。
npx vue-cli-service electron:serve "$@"
