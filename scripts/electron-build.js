#!/usr/bin/env node
/*
 * 跨平台打包入口：`vue-cli-service electron:build` 的包装。
 *
 * 用途：替代已删除的 scripts/electron-build.sh，Windows（cmd / PowerShell）和
 * macOS / Linux 使用同一条命令，不再依赖 bash 或 `set` 语法。
 *
 * 用法：
 *   npm run electron:build              # 打包当前平台
 *   npm run dist:win                    # 等价于 electron:build --win
 *   npm run electron:build -- --dir     # 其他 vue-cli / electron-builder 参数原样透传
 *
 * 环境注入（均可用外部环境变量覆盖）：
 *   1. NODE_OPTIONS 追加 --openssl-legacy-provider（webpack 4 的 md4 哈希在 Node 18+ 需要）。
 *      注意只能给打包进程；开发模式（electron:serve）会启动 Electron 13 自带的 Node 14，
 *      它不认识这个参数，主进程会直接退出。
 *   2. 关闭 electron-builder 的证书自动探测（CSC_IDENTITY_AUTO_DISCOVERY=false），
 *      避免 Windows 上因找不到签名证书而报错。需要签名时先在外部设置该变量即可覆盖。
 *
 * 关于 DSH 工作区里的 Low 完整性标签（Windows 打包最常见的坑）：
 *   DSH 的 workspace-write 会给工作区整棵目录树写入可继承的 Low 完整性标签，
 *   node_modules 里的 app-builder.exe、7za.exe 也会继承，Windows 按 exe 镜像标签
 *   决定进程完整性 —— 这些构建工具于是都成了 Low 进程：
 *     · 写不了 %LOCALAPPDATA% 这类 Medium 目录（把 --dest 挪出工作区会直接 mkdir 失败）；
 *     · electron-builder 生成卸载器时运行的 NSIS 临时安装器直接 exit 2；
 *     · 7z 以 -mx=9 归档时报 "System ERROR: 未指定的错误"。
 *   解法是先把目标标回 Medium 再打包：npm run fix:win-integrity（见 scripts/fix-win-integrity.ps1）。
 *   输出目录保持默认的 dist_electron（挪到工作区外没有意义：Low 的构建工具连目录都建不了）。
 */
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const [nodeMajor] = process.versions.node.split(".").map(Number);
if (!(nodeMajor >= 18)) {
  console.error(`需要 Node 18+，当前 ${process.version}，请先执行 nvm use`);
  process.exit(1);
}

const env = { ...process.env };
env.NODE_OPTIONS = [env.NODE_OPTIONS, "--openssl-legacy-provider"].filter(Boolean).join(" ");
if (env.CSC_IDENTITY_AUTO_DISCOVERY == null) {
  env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
}

const extraArgs = process.argv.slice(2);

const cli = path.join(root, "node_modules", "@vue", "cli-service", "bin", "vue-cli-service.js");

console.log(
  `[electron-build] node ${process.version} · NODE_OPTIONS=${env.NODE_OPTIONS} · ` +
    `CSC_IDENTITY_AUTO_DISCOVERY=${env.CSC_IDENTITY_AUTO_DISCOVERY}`
);
console.log(`[electron-build] vue-cli-service electron:build ${extraArgs.join(" ")}`.trimEnd());

// 打包前校验 sqlite3 原生绑定：只检查架构不够——下载/编译中断写出的半截文件
// 头信息仍显示 arm64，只有真正 dlopen 时才失败，装到用户机器上会表现成
// 主进程加载 Database 失败、所有 IPC 报「No handler registered」。
if (process.platform === "darwin" && process.arch === "arm64") {
  const verify = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "verify-sqlite-binding.js")],
    { cwd: root, encoding: "utf8" }
  );
  if (verify.status !== 0) {
    console.error("[electron-build] sqlite3 arm64 原生绑定不可用，已中止打包：");
    console.error((verify.stderr || verify.stdout || "").trim());
    console.error("[electron-build] 修复：npm install 重装依赖，或运行 npm run dist:mac（会校验并自动补齐绑定）");
    process.exit(1);
  }
}

const child = spawn(process.execPath, [cli, "electron:build", ...extraArgs], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`[electron-build] 启动失败：${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[electron-build] 被信号 ${signal} 终止`);
    process.exit(1);
  }
  process.exit(code == null ? 1 : code);
});
