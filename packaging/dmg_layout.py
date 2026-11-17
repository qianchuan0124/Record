"""生成 DMG 根目录的 .DS_Store（安装界面布局）。

背景图需要一条指向卷内 `.background/background.tiff` 的别名（alias），而别名必须
基于真实存在的文件创建。因此这个脚本有两种用法：

1. 传 ``--mount <可写挂载点>``：镜像已挂载时使用，别名指向卷内文件，背景图正常显示；
2. 只传目录：无法挂载时使用，此时退化为纯色背景（布局、图标位置仍然生效）。

窗口尺寸、图标位置与 packaging/dmg_background.py 保持一致。
"""
import argparse
from datetime import datetime
from pathlib import Path

from ds_store import DSStore
from mac_alias import ALIAS_KIND_FILE, Alias, TargetInfo, VolumeInfo
from mac_alias.utils import UTC

VOLUME_NAME = '记账清单'
WINDOW_BOUNDS = '{{200, 100}, {640, 460}}'
APP_POSITION = (170, 150)
LINK_POSITION = (470, 150)
BACKGROUND = '/.background/background.tiff'
FALLBACK_COLOR = (0.95, 0.94, 0.99)


def _synthetic_alias() -> bytes:
    """没有可用挂载点时构造一条卷内相对路径别名（背景可能不显示，仅作兜底）。"""
    created = datetime(2020, 1, 1, tzinfo=UTC())
    volume = VolumeInfo(
        VOLUME_NAME, created, b'H+', 5, 0x100, b'\x00\x00',
        posix_path=f'/Volumes/{VOLUME_NAME}',
    )
    target = TargetInfo(
        ALIAS_KIND_FILE, 'background.tiff', 16, 17, created,
        b'\x00\x00\x00\x00', b'\x00\x00\x00\x00',
        folder_name='.background', cnid_path=(16,), posix_path=BACKGROUND,
    )
    return Alias(volume=volume, target=target).to_bytes()


def write_layout(folder: Path, app_name: str, alias_bytes: bytes = None) -> None:
    background = folder / '.background' / 'background.tiff'
    icvp = {
        'viewOptionsVersion': 1,
        'arrangeBy': 'none',
        'iconSize': 96.0,
        'textSize': 12.0,
        'showIconPreview': False,
        'showItemInfo': False,
        'labelOnBottom': True,
        'gridSpacing': 100.0,
        'gridOffsetX': 0.0,
        'gridOffsetY': 0.0,
        'scrollPositionX': 0.0,
        'scrollPositionY': 0.0,
        'backgroundColorRed': 1.0,
        'backgroundColorGreen': 1.0,
        'backgroundColorBlue': 1.0,
    }
    if alias_bytes:
        icvp['backgroundType'] = 2
        icvp['backgroundImageAlias'] = alias_bytes
    elif background.is_file():
        try:
            icvp['backgroundType'] = 2
            icvp['backgroundImageAlias'] = Alias.for_file(str(background)).to_bytes()
        except Exception:
            icvp['backgroundType'] = 1
            icvp['backgroundColorRed'], icvp['backgroundColorGreen'], icvp['backgroundColorBlue'] = FALLBACK_COLOR
            icvp['backgroundImageAlias'] = _synthetic_alias()
    else:
        icvp['backgroundType'] = 1
        icvp['backgroundColorRed'], icvp['backgroundColorGreen'], icvp['backgroundColorBlue'] = FALLBACK_COLOR
        icvp['backgroundImageAlias'] = _synthetic_alias()

    with DSStore.open(str(folder / '.DS_Store'), 'w+') as store:
        store['.']['bwsp'] = {
            'WindowBounds': WINDOW_BOUNDS,
            'ShowSidebar': False, 'ShowStatusBar': False, 'ShowPathbar': False,
            'ShowTabView': False, 'ContainerShowSidebar': False,
            'PreviewPaneVisibility': False, 'SidebarWidth': 0, 'ShowToolbar': False,
        }
        store['.']['icvp'] = icvp
        store['.']['vSrn'] = (b'long', 1)
        store[app_name]['Iloc'] = APP_POSITION
        store['Applications']['Iloc'] = LINK_POSITION
        store.flush()


def main() -> None:
    parser = argparse.ArgumentParser(description='生成 DMG 安装界面 .DS_Store')
    parser.add_argument('folder')
    parser.add_argument('app_name')
    parser.add_argument('--save-alias', help='只生成背景别名到该文件，不写 .DS_Store')
    parser.add_argument('--alias', help='使用该文件中的背景别名')
    args = parser.parse_args()

    folder = Path(args.folder)
    background = folder / '.background' / 'background.tiff'
    if args.save_alias:
        if not background.is_file():
            raise SystemExit(f'缺少背景图：{background}')
        Path(args.save_alias).write_bytes(Alias.for_file(str(background)).to_bytes())
        print(f'已生成背景别名 {args.save_alias}')
        return
    alias_bytes = Path(args.alias).read_bytes() if args.alias else None
    write_layout(folder, args.app_name, alias_bytes)
    print(f'已写入 {folder}/.DS_Store')


if __name__ == '__main__':
    main()
