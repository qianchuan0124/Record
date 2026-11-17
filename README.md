# 记账清单桌面版

## 环境要求

- macOS（Apple Silicon，arm64）
- Node.js 18 LTS，且必须是 **arm64 原生版本**（不要用 Rosetta 下的 x64 Node）
- 仓库根目录带 `.nvmrc`，`nvm use` 会自动切到 18

```bash
nvm install 18
```

## 安装依赖

```bash
npm install
```

## 启动服务

```bash
npm run electron:serve
```

## 本地打包

```bash
npm run electron:build
```

## 内网分发（macOS）

```bash
npm run dist:mac
```

产出在 `dist_electron/release/`：ad-hoc 签名的 zip、带安装界面的 dmg、`首次打开.command`
和安装说明。安装界面背景由 `packaging/dmg_background.py` 生成，布局在 `packaging/dmg_layout.py`。
首次运行脚本会自动创建 `packaging/.venv` 并安装打包依赖（Pillow、ds_store、mac_alias）。

## 注意事项

### windows 下安装及打包

windows 下安装依赖基本不会有什么问题，只要注意 sqlite3 版本是 5.1.6 就行，如果是 5.1.7 会和 electron 有冲突，产生一系列的问题，降级就解决了。其他的基本都是一些依赖下载问题，可以尝试切换不同的镜像:

如阿里镜像

```bash
npm config set registry https://registry.npmmirror.com
```

其他诸如华为、腾讯等镜像网上一搜就可以找到。

### mac 下安装以及打包

> Error: error:0308010C:digital envelope routines::unsupported

打包时插件内部的 webpack 4 会用 md4 做哈希，Node 18（OpenSSL 3）下需要开启 legacy provider。
`npm run electron:build` 和 `npm run dist:mac` 会自动设置
`NODE_OPTIONS=--openssl-legacy-provider`；开发模式 `npm run electron:serve` 不需要，
也**不能**设置——Electron 13 内置的 Node 14 不认识这个参数，会让主进程直接退出。
只有直接调用 `npx vue-cli-service electron:build` 时才需要自己 export：

```bash
export NODE_OPTIONS=--openssl-legacy-provider
```

> build 的时候 electron 下载失败

**修复方案:**

```bash
https://www.cnblogs.com/xiaoniuzai/p/12356208.html
```

> Error: Exit code: ENOENT. spawn /usr/bin/python ENOENT

**修复方案:**

1. npm install electron-builder@23.0.2
2. 安装 python 2.7.18
3. 将 python 路径指向安装的位置，如果用的是 pyenv 安装的，则是

export PYTHON_PATH=/Users/{你的用户名}/.pyenv/shims/python

4. 给予权限，sudo chmod 777 /Users/{你的用户名}/.pyenv/shims/python

> pod install 很慢 或者直接卡主

**修复方案:**

目录下创建 .npmrc 文件，写入
electro_mirror=“https://npm.taobao.org/mirrors/electron/”

还是卡主，可以尝试:

rm -rf node_modules

npm cache clean --force

npm config set registry https://mirrors.huaweicloud.com/repository/npm/

如果提示写入、stat 等权限问题:

npm install --unsafe-perm=true --allow-root

> Error: Command failed: codesign --sign

**修复方案:**

```bash
xattr -cr .
```

> 打出来的包不能用，提示 is not a valid win32 application ....

**修复方案:**

删除 node_modules

重新 npm install

> M1 使用 pyenv 安装 python 2.7.18 提示 ImportError: No module named readline

修复方案:

arch -arm64 brew install readline

arch -arm64 brew install openssl

CPPFLAGS="-I$(brew --prefix zlib)/include" arch -arm64 pyenv install -v 2.7.18

> Error: EACCES: permission denied, stat

**修复方案：**

```bash
npm install --unsafe-perm=true --allow-root
```

> electron-log 提示 Module parse failed: Unexpected token (11:10)
>
> You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file.

**修复方案:**

降版本

```bash
npm install electron-log@~4.4.8
```

> Can't resolve 'path' in '/Users/XXXXX/Documents/workspace/XXX/node_modules/electron'
>
> webpack < 5 used to include polyfills for node.js core modules by default.

原因是 electron 等 node api 不能在渲染线程中使用

网上有推荐:

nodeIntegration: true

但是不建议这么做，electron 等 api 应该放在主线程内使用，渲染线程不能直接引入 ipcRender

**修复方案:**

再定义一个 global.d.ts

```javascript
export { };

declare global {
    interface Window {
        electron: {
            ipcRenderer: {
                send: (channel: string, data: any) => void;
                on: (channel: string, func: (...args: any[]) => void) => void;
                once: (channel: string, func: (...args: any[]) => void) => void;
                invoke: (channel: string, ...args: any[]) => Promise<any>;
            };
        };
    }
}
```

然后直接使用

```javascript
window.electron.ipcRenderer.on("xxxxx");
window.electron.ipcRenderer.invoke("xxxxx");
```





## 图标的设置方法



**建议使用electron-icon-builder里面的方法**

````json
electron-icon-builder --input=./public/favicon.png --output=build --flatten
````



### Mac

mac需要生成对应的icns文件

可以在mac电脑下执行以下命令:

````sh
mkdir -p icon.iconset

sips -z 16 16     ./favicon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     ./favicon.png --out icon.iconset/icon_32x32.png
sips -z 128 128   ./favicon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   ./favicon.png --out icon.iconset/icon_256x256.png
cp ./favicon.png icon.iconset/icon_256x256.png

iconutil -c icns icon.iconset
````

favicon.png 是需要准备的icon原图，尺寸为256 * 256

可能会遇见的问题:

>  Mac 下安装时顶部和底部(以及安装后的列表模式下图标)的小图标花了

原因： 没有设置对应的 extendInfo

在 vue.config.js 文件的 pluginOptions 的 electronBuilder 参数下加入以下内容

````bash
mac: {
icon: "./build/icons/icon.icns",
extendInfo: {
  CFBundleIconFile: "icon.icns",
  },
}
````





### Windows

mac需要生成对应的ico文件

可能遇见的问题:

> 左上角的图标显示不出来

左上角的图标在createWindow中设置，检查icon对应的路径是否正确，一般将ico文件放置在根目录下的public文件夹下，对应的路径写法是:

```ts
icon: path.join(app.getAppPath(), 'public/favicon.ico'),
```



## iCloud 云端同步

设置页的数据处理中新增「iCloud 同步」，用于把账本备份到 iCloud 云盘，换设备或重装后可从云端恢复。同步完全手动触发，不会自动上传或覆盖数据。

- 应用不接入任何云服务 SDK，也不需要在应用内登录：系统登录 iCloud 云盘（macOS 上位于 `~/Library/Mobile Documents/com~apple~CloudDocs`，Windows 为 iCloudDrive）后，同步目录就是一个普通文件夹。
- 点击「同步」后会弹出「选择要同步到的版本」：选择「本机当前数据」即把本机备份成一份新的云端版本；选择列表中的任一云端备份即用该版本覆盖本机数据（覆盖前自动备份本机数据库，并可一并恢复自定义分类）。
- 备份写入 `iCloud 云盘/记账清单/`，文件名形如 `record_20261116_173800_ab12.db`，同时附一份自定义分类副本；`latest.json` 记录最新一份备份。
- 正在使用的数据库不会直接放进同步目录，每次都写入一份 SQLite 一致性快照，避免多设备并发写和 iCloud 异步上传导致数据库损坏。
- 每台设备默认保留最近 3 份快照，本机恢复前的数据库备份保留在 `userData/backups/` 中最近 5 份。
- 未检测到 iCloud 云盘时，可点击「更改目录」手动选择 OneDrive、Dropbox 或其他同步目录。

## 更新

### 2026.11.14 - v0.0.4

**启动与稳定性**

1. 重复打开应用只保留一个窗口，并自动切回已打开的窗口
2. 去掉默认的系统菜单栏，界面更干净
3. 连续点击创建不会重复记账，提交失败后可以正常重试
4. 分析页切换、窗口缩放、年度视图切换不再出现空白或报错

**界面与交互**

5. 顶栏、侧边栏和各页面重新排布，间距与对齐更统一
6. 窗口尺寸变化时布局自适应，滚动条样式统一
7. 新建账单输入区更宽敞，创建按钮更醒目
8. 账单列表的列对齐和字号层次更清晰
9. 筛选条件、月份切换和收支总计展示更清楚
10. 分析页详情改为右侧滑出面板，点击记录查看，点空白处收起
11. 设置页的导入导出与分类管理操作更顺手
12. 鼠标点击输入框只保留柔和的紫色外框反馈，键盘操作仍有清晰的焦点提示

**错误处理与提示**

13. 页面出错时不再整页被错误页覆盖，改为右下角统一提示，可一键重新加载
14. 同类错误不会连续弹出，完整错误信息保留在控制台
15. 新建、更新、删除账单成功后统一弹出绿色成功提示

**其它**

16. 更新品牌配色与图标细节

### 2025.8.2 - v0.0.3

1. 修复添加分类之后统计数据不正确的问题
2. 修复时间线显示不出来的问题
3. 年度分析添加一个总览，查看当年的所有分类花费的数目
