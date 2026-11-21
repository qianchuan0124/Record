/**
 * 开发态 / 安装包数据目录隔离。
 *
 * 必须在任何模块读取 app.getPath('userData') 之前执行：
 * 在 background.ts 里作为第一条 import，早于 Database、CloudSync 等模块加载。
 *
 * - 安装包（app.isPackaged = true）：继续使用原来的 userData 目录，老用户数据不受影响；
 * - 开发态（npm run electron:serve）：切到 `<userData>-dev`，不会和安装版共用账本；
 * - 首次切到 -dev 时，从旧的共享目录复制一份数据，避免开发态“数据消失”；
 * - 显式传了 --user-data-dir（例如自动化测试）时尊重调用方，不再改写。
 */
import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

const APP_DIR_NAME = "记账清单";
const DEV_SUFFIX = "-dev";
const LEGACY_DIR_NAME = "record";
const DATA_FILES = [
    "records.db",
    "records.db-wal",
    "records.db-shm",
    "category-custom.json",
    "cloud-sync.json",
];

function copyIfExists(from: string, to: string) {
    try {
        if (!fs.existsSync(from)) {
            return;
        }
        fs.copyFileSync(from, to);
    } catch (error) {
        // 迁移失败不阻塞启动，最多是开发态从空数据开始
    }
}

function initUserDataPath() {
    if (app.isPackaged) {
        return;
    }
    if (app.commandLine.hasSwitch("user-data-dir")) {
        return;
    }

    const appData = app.getPath("appData");
    const sharedDir = path.join(appData, APP_DIR_NAME);
    const devDir = path.join(appData, `${APP_DIR_NAME}${DEV_SUFFIX}`);

    app.setPath("userData", devDir);

    // 已经有 -dev 数据就不再迁移，避免覆盖开发态自己的数据
    if (fs.existsSync(path.join(devDir, "records.db"))) {
        return;
    }

    // 老版本开发态可能用过 package.json 的 name（record）作为目录名
    const sourceDir = fs.existsSync(path.join(sharedDir, "records.db"))
        ? sharedDir
        : fs.existsSync(path.join(appData, LEGACY_DIR_NAME, "records.db"))
            ? path.join(appData, LEGACY_DIR_NAME)
            : "";

    if (!sourceDir) {
        return;
    }

    try {
        fs.mkdirSync(devDir, { recursive: true });
        // journal_mode 是 delete，正常情况下复制 records.db 即可；
        // 若退出时残留 -wal/-shm 也一起带上
        for (const file of DATA_FILES) {
            copyIfExists(path.join(sourceDir, file), path.join(devDir, file));
        }
    } catch (error) {
        // 忽略迁移失败
    }
}

initUserDataPath();
