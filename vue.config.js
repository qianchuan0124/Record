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
          provider: "generic",
          url: "http://127.0.0.1:8081/updater/",
        },
      },
    },
  },
});
