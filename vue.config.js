const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
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
        publish: {
          provider: "github",
          owner: "qianchuan0124",
          repo: "record",
          releaseType: "release",
          publishAutoUpdate: true,
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
