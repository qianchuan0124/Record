#!/usr/bin/env bash
# 内网分发打包：ad-hoc 签名 + 带安装界面的 dmg（不生成 zip）。
# 环境要求：Apple Silicon + arm64 原生 Node 18 LTS（见 .nvmrc）。
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

# Node 18 使用 OpenSSL 3，webpack 5 的 md4 需要 legacy provider
export NODE_OPTIONS="${NODE_OPTIONS:-} --openssl-legacy-provider"
export CSC_IDENTITY_AUTO_DISCOVERY=false
export RECORD_DIST=1

VERSION="$(node -p "require('./package.json').version")"
RELEASE="dist_electron/release"
APP="dist_electron/mac-arm64/记账清单.app"

# sqlite3 是 N-API 原生模块，绑定必须和 .app 架构一致，否则启动时报
# "Cannot find module ... napi-v6-darwin-unknown-arm64/node_sqlite3.node"。
# arm64 Node 下 npm install 会自带 arm64 绑定，这里只做兜底（依赖重装/缓存缺失时）。
ensure_sqlite_binding() {
  local binding_root="node_modules/sqlite3/lib/binding"
  local dir="${binding_root}/napi-v6-darwin-unknown-arm64"
  local file="${dir}/node_sqlite3.node"
  if [ -f "$file" ] && lipo -archs "$file" 2>/dev/null | grep -qw arm64; then
    return
  fi

  local version name tmp
  version="$(node -p "require('./node_modules/sqlite3/package.json').version")"
  name="napi-v6-darwin-unknown-arm64.tar.gz"
  tmp="$(mktemp -d)"
  echo "下载 sqlite3 arm64 预编译绑定（v${version}）..."
  if ! curl -fsSL --retry 3 -o "${tmp}/${name}" \
    "https://cdn.npmmirror.com/binaries/sqlite3/v${version}/${name}"; then
    curl -fsSL --retry 3 -o "${tmp}/${name}" \
      "https://github.com/TryGhost/node-sqlite3/releases/download/v${version}/${name}"
  fi
  rm -rf "$dir"
  tar -xzf "${tmp}/${name}" -C "$binding_root"
  rm -rf "$tmp"

  if [ ! -f "$file" ] || ! lipo -archs "$file" 2>/dev/null | grep -qw arm64; then
    echo "sqlite3 arm64 绑定准备失败：$file" >&2
    exit 1
  fi
  echo "已准备 sqlite3 arm64 绑定"
}

ensure_sqlite_binding

pkill -f "记账清单.app/Contents/MacOS/记账清单" 2>/dev/null || true

rm -rf "$RELEASE"
# 清掉历史产物，只保留本次发布包
rm -rf dist_electron/*.dmg dist_electron/*.zip dist_electron/*.blockmap dist_electron/builder-debug.yml
npx vue-cli-service electron:build --arm64

if [ ! -d "$APP" ]; then
  echo "构建失败：找不到 $APP" >&2
  exit 1
fi
if ! lipo -archs "$APP/Contents/MacOS/记账清单" 2>/dev/null | grep -qw arm64; then
  echo "构建产物不是 arm64：$APP" >&2
  exit 1
fi
echo "构建产物：${APP}（arm64）"

codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP"
echo "ad-hoc 签名完成"

mkdir -p "$RELEASE"
bash packaging/make_dmg.sh "$APP" "$RELEASE/Record-${VERSION}-arm64.dmg"
sed "s/__VERSION__/${VERSION}/g" packaging/安装说明.txt > "$RELEASE/Record-安装说明.txt"

# 中间产物（未打包的 .app、webpack 输出）清理掉，只保留发布包
rm -rf dist_electron/bundled dist_electron/mac-arm64 dist_electron/index.js \
  dist_electron/package.json dist_electron/preload.js dist_electron/builder-debug.yml

echo "内网分发包已生成："
ls -lh "$RELEASE"
