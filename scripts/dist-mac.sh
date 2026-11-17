#!/usr/bin/env bash
# 内网分发打包：ad-hoc 签名 + zip + 带安装界面的 dmg。
set -euo pipefail

cd "$(dirname "$0")/.."

export NODE_OPTIONS=--openssl-legacy-provider
export CSC_IDENTITY_AUTO_DISCOVERY=false
export RECORD_DIST=1

VERSION="$(node -p "require('./package.json').version")"
APP="dist_electron/mac-arm64/记账清单.app"
RELEASE="dist_electron/release"

pkill -f "记账清单.app/Contents/MacOS/记账清单" 2>/dev/null || true

rm -rf "$RELEASE"
npx vue-cli-service electron:build

if [ ! -d "$APP" ]; then
  echo "构建失败：找不到 $APP" >&2
  exit 1
fi

codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP"
echo "ad-hoc 签名完成"

mkdir -p "$RELEASE"
ditto -c -k --sequesterRsrc --keepParent "$APP" \
  "$RELEASE/记账清单-${VERSION}-arm64.zip"

bash packaging/make_dmg.sh "$APP" "$RELEASE/记账清单-${VERSION}-arm64.dmg"

sed "s/__VERSION__/${VERSION}/g" packaging/安装说明.txt > "$RELEASE/安装说明.txt"

echo "内网分发包已生成："
ls -lh "$RELEASE"
