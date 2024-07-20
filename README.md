# 记账清单桌面版

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

**修复方案:**

```bash
export NODE_OPTIONS=--openssl-legacy-provider
```

注意这个不能在 serve 的时候开启，只能在 build 的时候开启

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
