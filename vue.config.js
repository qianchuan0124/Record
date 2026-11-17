const { defineConfig } = require("@vue/cli-service");

// RECORD_DIST=1 时只产出未打包的 .app，由 scripts/dist-mac.sh 完成签名、zip 和 dmg。
const isInternalDist = process.env.RECORD_DIST === "1";

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    client: {
      // 关闭开发模式默认的全屏错误遮罩，改由应用内统一异常提示兜底
      overlay: false,
    },
  },
  chainWebpack: (config) => {
    config.plugin("html").tap((args) => {
      args[0].title = "记账清单";
      return args;
    });
  },
  pluginOptions: {
    electronBuilder: {
      preload: "src/preload.js",
      builderOptions: {
        appId: "org.electron.record",
        mac: {
          icon: "./build/icons/icon.icns",
          target: isInternalDist ? ["dir"] : undefined,
          extendInfo: {
            CFBundleIconFile: "icon.icns",
          },
        },
        win: {
          icon: "./build/icons/icon.ico",
          target: [
            {
              target: "nsis",
            },
          ],
        },
        nsis: {
          oneClick: false, // 一键安装
          perMachine: true, // 为所有用户安装
          allowElevation: true, // 允许权限提升, 设置 false 的话需要重新允许安装程序
          allowToChangeInstallationDirectory: true, // 允许更改安装目录
          installerIcon: "./public/favicon.ico",
          uninstallerIcon: "./public/favicon.ico",
          installerHeaderIcon: "./public/favicon.ico",
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
        },
      },
    },
  },
});
