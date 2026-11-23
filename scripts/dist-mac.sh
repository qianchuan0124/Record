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
# 只检查架构不够：binding 被写坏时 Mach-O 头仍在，lipo 会说 arm64 正常，
# 真正 dlopen 才报 __TEXT 段超出文件末尾。这里额外做一次加载校验。
verify_sqlite_binding() {
  node scripts/verify-sqlite-binding.js "$1" >/dev/null 2>&1
}

ensure_sqlite_binding() {
  local binding_root="node_modules/sqlite3/lib/binding"
  local dir="${binding_root}/napi-v6-darwin-unknown-arm64"
  local file="${dir}/node_sqlite3.node"
  if verify_sqlite_binding "$file"; then
    return
  fi

  local version name tmp extracted
  version="$(node -p "require('./node_modules/sqlite3/package.json').version")"
  name="napi-v6-darwin-unknown-arm64.tar.gz"
  tmp="$(mktemp -d)"
  echo "sqlite3 arm64 绑定缺失或损坏，重新下载（v${version}）..."
  if ! curl -fsSL --retry 3 -o "${tmp}/${name}" \
    "https://cdn.npmmirror.com/binaries/sqlite3/v${version}/${name}"; then
    curl -fsSL --retry 3 -o "${tmp}/${name}" \
      "https://github.com/TryGhost/node-sqlite3/releases/download/v${version}/${name}"
  fi

  # 先解压到临时目录校验，确认完整后再替换：避免下载中断时把本地原本可用的文件覆盖成半截
  if ! tar -xzf "${tmp}/${name}" -C "$tmp" 2>/dev/null; then
    rm -rf "$tmp"
    echo "sqlite3 arm64 绑定下载包解压失败：${name}" >&2
    exit 1
  fi
  extracted="${tmp}/napi-v6-darwin-unknown-arm64/node_sqlite3.node"
  if ! verify_sqlite_binding "$extracted"; then
    rm -rf "$tmp"
    echo "sqlite3 arm64 绑定下载后不可用（文件不完整）：${extracted}" >&2
    echo "请检查网络后重试，或手动解压 https://cdn.npmmirror.com/binaries/sqlite3/v${version}/${name} 到 ${binding_root}" >&2
    exit 1
  fi

  mkdir -p "$dir"
  cp "$extracted" "$file"
  chmod +x "$file"
  rm -rf "$tmp"

  if ! verify_sqlite_binding "$file"; then
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

# electron-builder 的 native rebuild 会重写 sqlite3 绑定，以最终打进用户机器的那份为准：
# asarUnpack 后 .node 落在 app.asar.unpacked 里，截断文件在这一步才能被发现
PACKAGED_BINDING="$APP/Contents/Resources/app.asar.unpacked/node_modules/sqlite3/lib/binding/napi-v6-darwin-unknown-arm64/node_sqlite3.node"
if [ ! -f "$PACKAGED_BINDING" ]; then
  echo "打包产物里找不到 sqlite3 绑定：$PACKAGED_BINDING" >&2
  exit 1
fi
if ! node scripts/verify-sqlite-binding.js "$PACKAGED_BINDING"; then
  echo "打包产物里的 sqlite3 绑定不可用，已中止打包：$PACKAGED_BINDING" >&2
  exit 1
fi

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
