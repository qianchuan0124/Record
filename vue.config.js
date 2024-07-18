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
        publish: {
          provider: "github",
          owner: "qianchuan0124",
          repo: "record",
          releaseType: "release",
          publishAutoUpdate: true,
        },
      },
    },
  },
});
