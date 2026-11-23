#!/usr/bin/env node
/*
 * 校验 sqlite3 的 arm64 原生绑定（node_sqlite3.node）是否真的可用。
 *
 * 为什么不能只 `lipo -archs`：
 * 下载/编译中断时 binding 会被写成半个文件，Mach-O 头里的 __TEXT 段信息仍然存在，
 * `file` / `lipo` 都会说“Mach-O arm64 正常”，只有真正 dlopen 时才报
 *   segment '__TEXT' content (fileOffset: 0x0 -> 0x1B0000) extends beyond end of file
 * 于是主进程加载 \`src/db/Database.ts\` 失败 → databaseListen 没注册 → 所有 IPC 报
 * 「No handler registered」。所以这里除了架构，还会真正 require 一次。
 *
 * 用法：node scripts/verify-sqlite-binding.js [binding 路径]
 * 退出码：0 可用；1 缺失 / 架构不对 / 无法加载
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const DEFAULT_BINDING = path.join(
  "node_modules",
  "sqlite3",
  "lib",
  "binding",
  "napi-v6-darwin-unknown-arm64",
  "node_sqlite3.node"
);

const file = path.resolve(process.argv[2] || DEFAULT_BINDING);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(file)) {
  fail(`sqlite3 绑定不存在：${file}`);
}

const size = fs.statSync(file).size;
if (size < 1024 * 1024) {
  // 完整的 arm64 binding 约 1.9MB；低于 1MB 基本只可能是没写完的半截文件
  fail(`sqlite3 绑定文件过小（${size} 字节），可能没有下载/编译完整：${file}`);
}

if (process.platform === "darwin") {
  let archs = "";
  try {
    archs = execFileSync("/usr/bin/lipo", ["-archs", file], { encoding: "utf8" }).trim();
  } catch (error) {
    fail(`无法读取 sqlite3 绑定架构：${file}\n${error instanceof Error ? error.message : error}`);
  }
  if (!/\barm64\b/.test(archs)) {
    fail(`sqlite3 绑定架构不对：${archs || "(未知)"}，需要 arm64：${file}`);
  }
}

try {
  // 真正的完整性校验：截断文件会在这里抛错
  require(file);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  fail(`sqlite3 绑定无法加载（文件可能不完整）：${file}\n${detail}`);
}

console.log(`sqlite3 绑定可用：${file}`);
