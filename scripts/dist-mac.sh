#!/usr/bin/env bash
# 内网分发打包：ad-hoc 签名 + zip + 带安装界面的 dmg。
set -euo pipefail

cd "$(dirname "$0")/.."

# Node 17+ 才支持 --openssl-legacy-provider（OpenSSL 3 下跑 md4 需要）；
# Node 16 及以下没有这个参数，写进 NODE_OPTIONS 会直接报错退出，因此按版本决定是否设置。
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -ge 17 ]; then
  export NODE_OPTIONS="${NODE_OPTIONS:-} --openssl-legacy-provider"
fi
export CSC_IDENTITY_AUTO_DISCOVERY=false
export RECORD_DIST=1

VERSION="$(node -p "require('./package.json').version")"
RELEASE="dist_electron/release"

# 分发包给 Apple Silicon：Node 可能跑在 Rosetta 下（process.arch=x64），
# 这时 uname -m 也会返回 x86_64，用 sysctl 判断硬件才是可靠的，避免打出 x64 包。
BUILD_ARCH_ARG=""
if [ "$(uname -m)" = "arm64" ] || [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = "1" ]; then
  BUILD_ARCH_ARG="--arm64"
fi

pkill -f "记账清单.app/Contents/MacOS/记账清单" 2>/dev/null || true

rm -rf "$RELEASE"
npx vue-cli-service electron:build $BUILD_ARCH_ARG

# 产物目录随架构变化（mac-arm64 / mac-universal / mac），不写死路径
APP=""
for dir in mac-arm64 mac-universal mac; do
  if [ -d "dist_electron/$dir/记账清单.app" ]; then
    APP="dist_electron/$dir/记账清单.app"
    break
  fi
done

if [ -z "$APP" ]; then
  echo "构建失败：dist_electron 下找不到 记账清单.app" >&2
  exit 1
fi

APP_ARCHS="$(lipo -archs "$APP/Contents/MacOS/记账清单" 2>/dev/null || true)"
case "$APP_ARCHS" in
  *arm64*)
    case "$APP_ARCHS" in
      *x86_64*) ARCH_LABEL="universal" ;;
      *) ARCH_LABEL="arm64" ;;
    esac
    ;;
  *x86_64*) ARCH_LABEL="x64" ;;
  *) ARCH_LABEL="unknown" ;;
esac
echo "构建产物：${APP}（${ARCH_LABEL}）"

codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP"
echo "ad-hoc 签名完成"

mkdir -p "$RELEASE"
ditto -c -k --sequesterRsrc --keepParent "$APP" \
  "$RELEASE/记账清单-${VERSION}-${ARCH_LABEL}.zip"

bash packaging/make_dmg.sh "$APP" "$RELEASE/记账清单-${VERSION}-${ARCH_LABEL}.dmg"

sed "s/__VERSION__/${VERSION}/g" packaging/安装说明.txt > "$RELEASE/安装说明.txt"

echo "内网分发包已生成："
ls -lh "$RELEASE"
