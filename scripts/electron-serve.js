#!/usr/bin/env node
/*
 * 跨平台开发入口：`vue-cli-service electron:serve` 的包装。
 *
 * 用途：替代 scripts/electron-serve.sh，Windows（cmd / PowerShell）和
 * macOS / Linux 使用同一条命令，不再依赖 bash。
 *
 * 用法：
 *   npm run electron:serve
 *   npm run electron:serve -- --port 8080   # 其他 vue-cli 参数原样透传
 *
 * 与 electron-build.js 的关键区别：
 *   开发模式会启动 Electron 13，其内置的 Node 14 不认识 --openssl-legacy-provider，
 *   因此这里【不能】设置 NODE_OPTIONS，否则主进程会直接退出。
 *   仅做 Node 版本校验，其余参数原样透传给 vue-cli-service。
 */
const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const [nodeMajor] = process.versions.node.split(".").map(Number);
if (!(nodeMajor >= 18)) {
  console.error(`需要 Node 18+，当前 ${process.version}，请先执行 nvm use`);
  process.exit(1);
}

const extraArgs = process.argv.slice(2);
const cli = path.join(root, "node_modules", "@vue", "cli-service", "bin", "vue-cli-service.js");

console.log(`[electron-serve] node ${process.version} · vue-cli-service electron:serve ${extraArgs.join(" ")}`.trimEnd());

const child = spawn(process.execPath, [cli, "electron:serve", ...extraArgs], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`[electron-serve] 启动失败：${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[electron-serve] 被信号 ${signal} 终止`);
    process.exit(1);
  }
  process.exit(code == null ? 1 : code);
});
