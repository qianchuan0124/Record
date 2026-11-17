#!/usr/bin/env bash
# 生成带安装界面布局的 DMG（应用图标 + Applications 拖拽入口 + 背景图 + 固定窗口）。
# 用法: packaging/make_dmg.sh [app路径] [输出dmg路径]
set -euo pipefail

cd "$(dirname "$0")/.."

APP="${1:-dist_electron/mac-arm64/记账清单.app}"
VERSION="$(node -p "require('./package.json').version")"
OUT="${2:-dist_electron/release/记账清单-${VERSION}-arm64.dmg}"
VOLNAME="记账清单"
APP_NAME="记账清单.app"
PYTHON="${PYTHON:-packaging/.venv/bin/python}"

if [ ! -d "$APP" ]; then
  echo "找不到应用：$APP" >&2
  exit 1
fi

if [ ! -x "$PYTHON" ]; then
  python3 -m venv packaging/.venv
  packaging/.venv/bin/pip install -q --upgrade pip >/dev/null 2>&1 || true
  packaging/.venv/bin/pip install -q -r packaging/requirements-dmg.txt
fi
PYTHON="packaging/.venv/bin/python"

mkdir -p "$(dirname "$OUT")"
STAGE="$(mktemp -d)"
RAW_DIR="$(mktemp -d)"
MOUNT_POINT=""

cleanup() {
  if [ -n "$MOUNT_POINT" ]; then
    hdiutil detach "$MOUNT_POINT" -quiet -force 2>/dev/null || true
  fi
  rm -rf "$STAGE" "$RAW_DIR"
}
trap cleanup EXIT

detach_volume() {
  # 卸载所有同名卷（含「记账清单 1」等编号变体），避免排版写到错误的卷上。
  hdiutil info | awk -F'\t' '$2 == "Apple_HFS" && $3 ~ v {print $3}' v="$VOLNAME" |     while IFS= read -r mp; do
      hdiutil detach "$mp" -quiet -force 2>/dev/null || true
    done
}

ditto --norsrc --noextattr "$APP" "$STAGE/$APP_NAME"
ln -s /Applications "$STAGE/Applications"
"$PYTHON" packaging/dmg_background.py "$STAGE/.background"

if [ -f build/icons/icon.icns ]; then
  cp build/icons/icon.icns "$STAGE/.VolumeIcon.icns"
fi

build_dmg_with_layout() {
  detach_volume
  hdiutil create -size 1g -fs HFS+ -volname "$VOLNAME" -type SPARSE -ov -quiet \
    -o "$RAW_DIR/layout" || return 1
  hdiutil attach "$RAW_DIR/layout.sparseimage" -readwrite -noverify -noautoopen \
    -quiet || return 1
  MOUNT_POINT="/Volumes/$VOLNAME"
  if [ ! -w "$MOUNT_POINT" ]; then
    echo "错误：挂载点不可写 $MOUNT_POINT" >&2
    return 1
  fi
  ditto "$STAGE/." "$MOUNT_POINT/" || return 1

  if [ -f "$MOUNT_POINT/.VolumeIcon.icns" ] && command -v SetFile >/dev/null 2>&1; then
    SetFile -a C "$MOUNT_POINT" 2>/dev/null || true
  fi

  osascript <<EOF || return 1
tell application "Finder"
  tell disk "$VOLNAME"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set sidebar width of container window to 0
    set the bounds of container window to {200, 100, 840, 560}
    set opts to the icon view options of container window
    set arrangement of opts to not arranged
    set icon size of opts to 96
    set text size of opts to 12
    set background picture of opts to ((POSIX file "$MOUNT_POINT/.background/background.tiff") as alias)
    set the bounds of container window to {200, 100, 840, 560}
    delay 2
    repeat 10 times
      try
        set position of item "Applications" of container window to {470, 150}
        exit repeat
      on error
        delay 1
      end try
    end repeat
    set position of item "$APP_NAME" of container window to {170, 150}
    update without registering applications
    delay 1
    close
  end tell
end tell
EOF

  sync
  if [ ! -f "$MOUNT_POINT/.DS_Store" ]; then
    echo "错误：Finder 布局未写入 .DS_Store" >&2
    hdiutil detach "$MOUNT_POINT" -quiet -force 2>/dev/null || true
    MOUNT_POINT=""
    return 1
  fi
  hdiutil detach "$MOUNT_POINT" -quiet || return 1
  MOUNT_POINT=""
  hdiutil convert "$RAW_DIR/layout.sparseimage" -format UDZO -ov -o "$OUT" -quiet || return 1
}

build_dmg_with_generated_layout() {
  MOUNT_POINT="/Volumes/$VOLNAME"
  detach_volume
  hdiutil makehybrid -quiet -hfs -hfs-volume-name "$VOLNAME" \
    -o "$RAW_DIR/ro" "$STAGE" || return 1
  hdiutil attach "$RAW_DIR/ro.dmg" -readonly -noverify -noautoopen -quiet || return 1
  if ! "$PYTHON" packaging/dmg_layout.py "$MOUNT_POINT" "$APP_NAME" \
      --save-alias "$RAW_DIR/alias.bin"; then
    hdiutil detach "$MOUNT_POINT" -quiet -force 2>/dev/null || true
    MOUNT_POINT=""
    return 1
  fi
  hdiutil detach "$MOUNT_POINT" -quiet -force 2>/dev/null || true
  MOUNT_POINT=""

  hdiutil convert "$RAW_DIR/ro.dmg" -format UDRW -o "$RAW_DIR/rw.dmg" -quiet || return 1
  hdiutil resize -size 1g "$RAW_DIR/rw.dmg" >/dev/null 2>&1 || return 1
  hdiutil attach "$RAW_DIR/rw.dmg" -readwrite -noverify -noautoopen -quiet || return 1
  MOUNT_POINT="/Volumes/$VOLNAME"
  if ! "$PYTHON" packaging/dmg_layout.py "$MOUNT_POINT" "$APP_NAME" \
      --alias "$RAW_DIR/alias.bin"; then
    hdiutil detach "$MOUNT_POINT" -quiet -force 2>/dev/null || true
    MOUNT_POINT=""
    return 1
  fi
  hdiutil detach "$MOUNT_POINT" -quiet -force 2>/dev/null || true
  MOUNT_POINT=""
  hdiutil convert "$RAW_DIR/rw.dmg" -format UDZO -ov -o "$OUT" -quiet || return 1
}

if build_dmg_with_layout; then
  echo "DMG 安装界面布局完成"
else
  echo "提示：Finder 排版不可用，改用预生成布局" >&2
  if [ -n "$MOUNT_POINT" ]; then
    hdiutil detach "$MOUNT_POINT" -quiet -force 2>/dev/null || true
    MOUNT_POINT=""
  fi
  if ! build_dmg_with_generated_layout; then
    echo "警告：背景别名不可用，退回纯色背景布局" >&2
    "$PYTHON" packaging/dmg_layout.py "$STAGE" "$APP_NAME" || true
    hdiutil makehybrid -quiet -hfs -hfs-volume-name "$VOLNAME" \
      -o "$RAW_DIR/fallback" "$STAGE"
    hdiutil convert "$RAW_DIR/fallback.dmg" -format UDZO -ov -o "$OUT" -quiet
  fi
fi

hdiutil verify "$OUT" >/dev/null
echo "DMG 已生成：$OUT"
ls -lh "$OUT"
