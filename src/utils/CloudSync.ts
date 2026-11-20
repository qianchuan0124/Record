/**
 * iCloud 云端同步：把数据库一致性快照写进网盘目录，另一端读取快照恢复。
 *
 * 实现思路与移动端/局域网同步解耦：
 * - 不依赖任何云服务 SDK，也不需要应用内登录。系统登录 iCloud 云盘后，
 *   同步目录就是一个普通文件夹，应用只负责读写这个目录。
 * - 正在使用的数据库不会直接放在同步目录里，避免多设备并发写、iCloud
 *   异步上传和占位文件导致数据库损坏。
 * - 每台设备写自己的快照，只保留最近几份；目录里的 latest.json 记录最新
 *   一份快照，供其他设备识别"云端有没有新备份"。
 */
import { app, BrowserWindow, dialog, ipcMain, shell, OpenDialogOptions } from "electron";
import * as fs from "fs";
import * as fsp from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import sqlite3 from "sqlite3";
import { IpcType } from "@/models/IpcResponse";
import {
    closeDatabase,
    customCategoryPath,
    dbPath,
    getDb,
    reopenDatabase,
    userDataPath,
    importMobileBackupData,
} from "@/db/Database";
import { logError, logInfo } from "./Log";

const SYNC_SUBDIR = "记账清单";
const SNAPSHOT_PREFIX = "record_";
const SNAPSHOT_SUFFIX = ".db";
const CATEGORY_SUFFIX = ".categories.json";
const MANIFEST_NAME = "latest.json";
const SNAPSHOT_KEEP_MANUAL = 2;
const SNAPSHOT_KEEP_AUTO = 3;
const LOCAL_BACKUP_KEEP = 5;
// 数据变更后延迟 1 分钟再自动备份，避免频繁写 iCloud；可用环境变量缩短用于测试
const AUTO_BACKUP_DELAY_MS = Number(process.env.RECORD_AUTO_BACKUP_DELAY_MS) || 60 * 1000;
const AUTO_CHECK_INTERVAL_MS = Number(process.env.RECORD_AUTO_CHECK_MS) || 15 * 1000;
const SNAPSHOT_NAME_RE = /^record_(\d{8}_\d{6})_([0-9a-f]{4})(?:_(auto|manual))?(?:_(\d+))?\.db$/;

type SnapshotMode = "manual" | "auto";

export class CloudSyncError extends Error { }

interface CloudSyncSettings {
    dir: string;
    lastSnapshot: string;
    lastState: string;
    lastTime: string;
    lastSyncedTs: number;
    autoBackup: boolean;
    autoSync: boolean;
}

interface DataCounts {
    record: number;
    salary: number;
    bonus: number;
    budget: number;
    deposit: number;
    category: number;
}

interface SnapshotManifest {
    snapshot: string;
    created_at: string;
    created_ts: number;
    device: string;
    app_version: string;
    sha256: string;
    size: number;
    counts: Partial<DataCounts> & { record: number };
    custom_category: boolean;
}

export interface CloudSnapshotItem {
    snapshot: string;
    tag: string;
    mode: SnapshotMode;
    counts: DataCounts | null;
    created_at: string;
    created_ts: number;
    device_label: string;
    is_mine: boolean;
    is_latest: boolean;
    downloaded: boolean;
    size: number;
    record_count: number;
    has_category: boolean;
    app_version: string;
    sha256: string;
}

const defaultSettings: CloudSyncSettings = {
    dir: "",
    lastSnapshot: "",
    lastState: "",
    lastTime: "",
    lastSyncedTs: 0,
    autoBackup: false,
    autoSync: false,
};

let listenersRegistered = false;
// 备份与恢复都会操作数据库/iCloud 目录，串行执行避免互相踩踏
let snapshotQueue: Promise<unknown> = Promise.resolve();

function enqueueSnapshotTask<T>(task: () => Promise<T>): Promise<T> {
    const run = snapshotQueue.then(task, task);
    snapshotQueue = run.then(
        () => undefined,
        () => undefined
    );
    return run;
}

function settingsFile(): string {
    return path.join(userDataPath, "cloud-sync.json");
}

function readSettings(): CloudSyncSettings {
    try {
        const raw = fs.readFileSync(settingsFile(), "utf8");
        const parsed = JSON.parse(raw);
        return {
            dir: typeof parsed.dir === "string" ? parsed.dir : defaultSettings.dir,
            lastSnapshot: typeof parsed.lastSnapshot === "string" ? parsed.lastSnapshot : "",
            lastState: typeof parsed.lastState === "string" ? parsed.lastState : "",
            lastTime: typeof parsed.lastTime === "string" ? parsed.lastTime : "",
            lastSyncedTs: Number(parsed.lastSyncedTs) || parseDateTime(parsed.lastTime),
            autoBackup: parsed.autoBackup === true,
            autoSync: parsed.autoSync === true,
        };
    } catch (error) {
        return { ...defaultSettings };
    }
}

function writeSettings(patch: Partial<CloudSyncSettings>): CloudSyncSettings {
    const next = { ...readSettings(), ...patch };
    try {
        const file = settingsFile();
        const temp = `${file}.part`;
        fs.writeFileSync(temp, JSON.stringify(next, null, 2), "utf8");
        fs.renameSync(temp, file);
    } catch (error) {
        logError("write cloud sync settings failed:" + error);
    }
    return next;
}

export function detectedDirs(): { label: string; dir: string }[] {
    const found: { label: string; dir: string }[] = [];
    const override = (process.env.RECORD_SYNC_DIR || "").trim();
    if (override) {
        found.push({ label: "自定义目录", dir: path.resolve(override) });
    }

    const home = os.homedir();
    let icloudRoot = "";
    if (process.platform === "darwin") {
        icloudRoot = path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs");
    } else if (process.platform === "win32") {
        for (const name of ["iCloudDrive", "iCloud Drive"]) {
            const candidate = path.join(home, name);
            if (isDirectory(candidate)) {
                icloudRoot = candidate;
                break;
            }
        }
    }
    if (icloudRoot && isDirectory(icloudRoot)) {
        found.push({ label: "iCloud 云盘", dir: icloudRoot });
    }

    for (const [name, label] of [["OneDrive", "OneDrive"], ["Dropbox", "Dropbox"]] as const) {
        const candidate = path.join(home, name);
        if (isDirectory(candidate) && !found.some((item) => item.dir === candidate)) {
            found.push({ label, dir: candidate });
        }
    }
    return found;
}

function isDirectory(target: string): boolean {
    try {
        return fs.statSync(target).isDirectory();
    } catch (error) {
        return false;
    }
}

function isFile(target: string): boolean {
    try {
        return fs.statSync(target).isFile();
    } catch (error) {
        return false;
    }
}

function baseDir(): string {
    const manual = readSettings().dir.trim();
    if (manual) {
        return manual;
    }
    const detected = detectedDirs();
    return detected.length > 0 ? detected[0].dir : "";
}

function syncFolder(create = false): string {
    const root = baseDir();
    if (!root) {
        return "";
    }
    const folder = path.join(root, SYNC_SUBDIR);
    if (create) {
        try {
            fs.mkdirSync(folder, { recursive: true });
        } catch (error) {
            logError("create sync folder failed:" + error);
            return "";
        }
    }
    return folder;
}

function deviceTag(): string {
    const name = os.hostname() || "device";
    return crypto.createHash("sha1").update(name).digest("hex").slice(0, 4);
}

function deviceName(): string {
    return os.hostname() || "未知设备";
}

function nowText(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function stampText(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function queryAll(conn: sqlite3.Database, sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
        conn.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows as any[]);
            }
        });
    });
}

function queryOne(conn: sqlite3.Database, sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        conn.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function openReadonly(file: string): Promise<sqlite3.Database> {
    return new Promise((resolve, reject) => {
        const conn = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(conn);
            }
        });
    });
}

function closeConnection(conn: sqlite3.Database): Promise<void> {
    return new Promise((resolve) => conn.close(() => resolve()));
}

function countCustomCategories(file: string): number {
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
        const customs = parsed && parsed.category && Array.isArray(parsed.category.custom)
            ? parsed.category.custom
            : [];
        let total = 0;
        const walk = (nodes: any[]) => {
            for (const node of nodes) {
                if (!node) {
                    continue;
                }
                total += 1;
                if (Array.isArray(node.children)) {
                    walk(node.children);
                }
            }
        };
        walk(customs);
        return total;
    } catch (error) {
        return 0;
    }
}

async function countsOfDatabase(file: string): Promise<DataCounts> {
    const conn = await openReadonly(file);
    try {
        const tables = await queryAll(conn, "SELECT name FROM sqlite_master WHERE type='table'") as { name: string }[];
        const names = new Set(tables.map((row) => row.name));
        const countTable = async (table: string) => {
            if (!names.has(table)) {
                return 0;
            }
            const row = await queryOne(conn, `SELECT COUNT(*) AS total FROM ${table} WHERE isDeleted = 0`);
            return Number((row && row.total) || 0);
        };
        return {
            record: await countTable("record"),
            salary: await countTable("salary_record"),
            bonus: await countTable("annual_bonus"),
            budget: await countTable("budget_item"),
            deposit: await countTable("deposit_record"),
            category: 0,
        };
    } finally {
        await closeConnection(conn);
    }
}

async function localDataCounts(): Promise<DataCounts> {
    const conn = getDb();
    const count = async (table: string) => {
        try {
            const row = await queryOne(conn, `SELECT COUNT(*) AS total FROM ${table} WHERE isDeleted = 0`);
            return Number((row && row.total) || 0);
        } catch (error) {
            return 0;
        }
    };
    return {
        record: await count("record"),
        salary: await count("salary_record"),
        bonus: await count("annual_bonus"),
        budget: await count("budget_item"),
        deposit: await count("deposit_record"),
        category: countCustomCategories(customCategoryPath),
    };
}

// sqlite3 5.1.6 的类型声明里没有 backup，运行时需要先初始化再逐步 step，这里补上类型
interface SqliteBackup {
    step(pages: number, callback: (err: Error | null, done?: boolean) => void): void;
    finish(callback?: () => void): void;
}

interface BackupCapableDatabase extends sqlite3.Database {
    backup(destination: string, callback: (err: Error | null) => void): SqliteBackup;
}

function backupDatabase(destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const fail = (error: unknown) => {
            if (settled) {
                return;
            }
            settled = true;
            reject(error);
        };
        let backup: SqliteBackup;
        try {
            backup = (getDb() as BackupCapableDatabase).backup(destination, (initErr) => {
                if (initErr) {
                    fail(initErr);
                    return;
                }
                const stepAll = () => {
                    backup.step(-1, (stepErr, done) => {
                        if (stepErr) {
                            try {
                                backup.finish();
                            } catch (error) {
                                // 忽略关闭失败
                            }
                            fail(stepErr);
                            return;
                        }
                        if (!done) {
                            stepAll();
                            return;
                        }
                        backup.finish(() => {
                            if (settled) {
                                return;
                            }
                            settled = true;
                            resolve();
                        });
                    });
                };
                stepAll();
            });
        } catch (error) {
            fail(error);
        }
    });
}

async function recordCountOf(file: string): Promise<number> {
    const conn = await openReadonly(file);
    try {
        const row = await queryOne(conn, "SELECT COUNT(*) AS total FROM record WHERE isDeleted = 0");
        return Number((row && row.total) || 0);
    } finally {
        await closeConnection(conn);
    }
}

async function sha256File(file: string): Promise<string> {
    const hash = crypto.createHash("sha256");
    const handle = await fsp.open(file, "r");
    try {
        const buffer = Buffer.alloc(1024 * 1024);
        for (;;) {
            const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
            if (bytesRead <= 0) {
                break;
            }
            hash.update(buffer.subarray(0, bytesRead));
        }
    } finally {
        await handle.close();
    }
    return hash.digest("hex");
}

/**
 * 数据库逻辑内容指纹，用来判断本地是否有未备份的改动。
 * 只统计业务数据（记录表 + 自定义分类），不包含本机专属的同步簿记。
 */
async function contentState(): Promise<string> {
    try {
        const hash = crypto.createHash("sha256");
        const recordRows = await queryAll(
            getDb(),
            "SELECT id, amount, type, date, category, subCategory, remark, isDeleted, syncId, countInBudget FROM record ORDER BY id"
        );
        for (const row of recordRows) {
            hash.update(JSON.stringify(row));
        }
        const payrollTables = [
            "SELECT id, date, baseSalary, overtimePay, oneTimeBonus, socialInsurance, tax, taxRate, netPay, taxManual, syncId FROM salary_record ORDER BY id",
            "SELECT id, date, bonus, tax, taxRate, netPay, syncId FROM annual_bonus ORDER BY id",
            "SELECT id, name, amount, syncId FROM budget_item ORDER BY id",
            "SELECT id, name, icon, syncId FROM deposit_bank ORDER BY id",
            "SELECT id, bankKey, startDate, amount, years, rate, interest, sortOrder, syncId FROM deposit_record ORDER BY id",
        ];
        for (const sql of payrollTables) {
            const rows = await queryAll(getDb(), sql);
            hash.update(sql);
            for (const row of rows) {
                hash.update(JSON.stringify(row));
            }
        }
        try {
            hash.update(await fsp.readFile(customCategoryPath));
        } catch (error) {
            // 没有自定义分类文件时跳过
        }
        return hash.digest("hex").slice(0, 16);
    } catch (error) {
        logError("compute cloud sync state failed:" + error);
        return "";
    }
}

function readManifest(folder: string): SnapshotManifest | null {
    try {
        const raw = fs.readFileSync(path.join(folder, MANIFEST_NAME), "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.snapshot !== "string" || !parsed.snapshot) {
            return null;
        }
        return parsed as SnapshotManifest;
    } catch (error) {
        return null;
    }
}

function writeManifest(folder: string, manifest: SnapshotManifest) {
    const temp = path.join(folder, `.${MANIFEST_NAME}.part`);
    fs.writeFileSync(temp, JSON.stringify(manifest, null, 2), "utf8");
    fs.renameSync(temp, path.join(folder, MANIFEST_NAME));
}

function parseDateTime(value: unknown): number {
    if (typeof value !== "string" || !value) {
        return 0;
    }
    const matched = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
    if (!matched) {
        return 0;
    }
    const date = new Date(
        Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]),
        Number(matched[4]), Number(matched[5]), Number(matched[6])
    );
    return isNaN(date.getTime()) ? 0 : Math.floor(date.getTime() / 1000);
}

function parseSnapshotName(name: string): { tag: string; created: Date; mode: SnapshotMode } | null {
    const matched = SNAPSHOT_NAME_RE.exec(name);
    if (!matched) {
        return null;
    }
    const stamp = matched[1];
    const created = new Date(
        Number(stamp.slice(0, 4)),
        Number(stamp.slice(4, 6)) - 1,
        Number(stamp.slice(6, 8)),
        Number(stamp.slice(9, 11)),
        Number(stamp.slice(11, 13)),
        Number(stamp.slice(13, 15))
    );
    if (isNaN(created.getTime())) {
        return null;
    }
    return { tag: matched[2], created, mode: matched[3] === "auto" ? "auto" : "manual" };
}

function categorySidecar(snapshot: string): string {
    return snapshot.replace(new RegExp(`\\${SNAPSHOT_SUFFIX}$`), CATEGORY_SUFFIX);
}

interface ListedFile {
    name: string;
    file: string;
    downloaded: boolean;
}

/** 遍历同步目录里的快照，同时识别 iCloud 尚未下载的占位文件 */
function listSnapshotFiles(folder: string): ListedFile[] {
    const result: ListedFile[] = [];
    let entries: fs.Dirent[] = [];
    try {
        entries = fs.readdirSync(folder, { withFileTypes: true });
    } catch (error) {
        return result;
    }
    for (const entry of entries) {
        const name = entry.name;
        if (name.startsWith(".") && name.endsWith(`${SNAPSHOT_SUFFIX}.icloud`)) {
            // iCloud 占位文件：.record_xxx.db.icloud
            const realName = name.slice(1, -".icloud".length);
            result.push({ name: realName, file: path.join(folder, name), downloaded: false });
        } else if (name.startsWith(SNAPSHOT_PREFIX) && name.endsWith(SNAPSHOT_SUFFIX) && !name.startsWith(".")) {
            result.push({ name, file: path.join(folder, name), downloaded: true });
        }
    }
    return result;
}

function pruneSnapshots(folder: string) {
    // 清理异常退出留下的临时文件，避免同步目录里堆积 .part
    try {
        for (const entry of fs.readdirSync(folder)) {
            if (!entry.startsWith(".") || !entry.endsWith(".part")) {
                continue;
            }
            const target = path.join(folder, entry);
            const age = Date.now() - fs.statSync(target).mtimeMs;
            if (age > 60 * 60 * 1000) {
                fs.unlinkSync(target);
            }
        }
    } catch (error) {
        // 清理失败不影响备份
    }

    const groups: Record<string, { manual: string[]; auto: string[] }> = {};
    for (const item of listSnapshotFiles(folder)) {
        const info = parseSnapshotName(item.name);
        if (!info) {
            continue;
        }
        if (!groups[info.tag]) {
            groups[info.tag] = { manual: [], auto: [] };
        }
        groups[info.tag][info.mode].push(item.name);
    }
    for (const group of Object.values(groups)) {
        const remove = [
            ...group.manual.sort().reverse().slice(SNAPSHOT_KEEP_MANUAL),
            ...group.auto.sort().reverse().slice(SNAPSHOT_KEEP_AUTO),
        ];
        for (const name of remove) {
            // 只删除已下载到本机的旧快照，iCloud 占位文件不主动删除，避免误删远端数据
            try {
                fs.unlinkSync(path.join(folder, name));
            } catch (error) {
                continue;
            }
            try {
                fs.unlinkSync(path.join(folder, categorySidecar(name)));
            } catch (error) {
                // 没有分类副本时忽略
            }
        }
    }
}

function uniqueSnapshotName(folder: string, mode: SnapshotMode): string {
    const stamp = stampText();
    const tag = deviceTag();
    let name = `${SNAPSHOT_PREFIX}${stamp}_${tag}_${mode}${SNAPSHOT_SUFFIX}`;
    let index = 2;
    while (fs.existsSync(path.join(folder, name)) || fs.existsSync(path.join(folder, `.${name}.icloud`))) {
        name = `${SNAPSHOT_PREFIX}${stamp}_${tag}_${mode}_${index}${SNAPSHOT_SUFFIX}`;
        index += 1;
    }
    return name;
}

function broadcast(payload: any) {
    for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
            win.webContents.send(IpcType.CLOUD_SYNC_EVENT, payload);
        }
    }
}

export interface CloudBackupResult {
    skipped: boolean;
    folder: string;
    snapshot: string;
    created_at: string;
    record_count: number;
    device: string;
}

function backupResult(manifest: SnapshotManifest | null, folder: string, skipped: boolean): CloudBackupResult {
    return {
        skipped,
        folder,
        snapshot: (manifest && manifest.snapshot) || "",
        created_at: (manifest && manifest.created_at) || "",
        record_count: Number((manifest && manifest.counts && manifest.counts.record) || 0),
        device: (manifest && manifest.device) || deviceName(),
    };
}

/**
 * 把当前数据库写成一致性快照。
 * 内容没变且已存在快照时直接跳过，避免频繁往 iCloud 写文件。
 */
export function createSnapshot(force = false, mode: SnapshotMode = "manual"): Promise<CloudBackupResult> {
    return enqueueSnapshotTask(() => createSnapshotInternal(force, mode));
}

async function createSnapshotInternal(force: boolean, mode: SnapshotMode): Promise<CloudBackupResult> {
    const folder = syncFolder(true);
    if (!folder) {
        throw new CloudSyncError("没有可用的同步目录，请先在设置中选择 iCloud 云盘目录");
    }

    const settings = readSettings();
    const state = await contentState();
    const current = readManifest(folder);
    if (
        !force &&
        state &&
        settings.lastState === state &&
        current &&
        isFile(path.join(folder, current.snapshot))
    ) {
        return backupResult(current, folder, true);
    }

    const name = uniqueSnapshotName(folder, mode);
    const finalFile = path.join(folder, name);
    const tempFile = path.join(folder, `.${name}.part`);

    let manifest: SnapshotManifest;
    try {
        await fsp.rm(tempFile, { force: true });
        await backupDatabase(tempFile);
        const counts = await countsOfDatabase(tempFile);
        const size = fs.statSync(tempFile).size;
        fs.renameSync(tempFile, finalFile);

        let hasCategory = false;
        if (isFile(customCategoryPath)) {
            const target = path.join(folder, categorySidecar(name));
            const categoryTemp = path.join(folder, `.${categorySidecar(name)}.part`);
            await fsp.copyFile(customCategoryPath, categoryTemp);
            fs.renameSync(categoryTemp, target);
            hasCategory = true;
        }

        manifest = {
            snapshot: name,
            created_at: nowText(),
            created_ts: Math.floor(Date.now() / 1000),
            device: deviceName(),
            app_version: app.getVersion(),
            sha256: await sha256File(finalFile),
            size,
            counts: { ...counts, category: countCustomCategories(customCategoryPath) },
            custom_category: hasCategory,
        };
        writeManifest(folder, manifest);
        pruneSnapshots(folder);
    } catch (error) {
        try {
            fs.unlinkSync(tempFile);
        } catch (ignored) {
            // 清理失败不影响主流程
        }
        logError("create cloud snapshot failed:" + error);
        throw new CloudSyncError(`写入云端快照失败：${error instanceof Error ? error.message : String(error)}`);
    }

    writeSettings({
        lastSnapshot: name,
        lastState: state,
        lastTime: manifest.created_at,
        lastSyncedTs: manifest.created_ts,
    });
    logInfo(`cloud snapshot created: ${name}, mode: ${mode}, records: ${manifest.counts.record}`);
    broadcast({ type: "backup", status: "success", snapshot: name, created_at: manifest.created_at, mode });
    return backupResult(manifest, folder, false);
}

export interface MobileBackupItem {
    file: string;
    name: string;
    created_at: string;
    created_ts: number;
    device: string;
    counts: DataCounts;
    size: number;
}

const MOBILE_BACKUP_FILE_RE = /^record-backup-.*\.json$/i;
const MOBILE_BACKUP_DIR_RE = /^Record备份-/;

function mobileBackupRoots(): string[] {
    const roots = new Set<string>();
    const base = baseDir();
    if (base) {
        roots.add(path.resolve(base));
        roots.add(path.resolve(path.dirname(base)));
    }
    const folder = syncFolder(false);
    if (folder) {
        roots.add(path.resolve(folder));
    }
    const desktop = path.join(os.homedir(), "Desktop");
    if (isDirectory(desktop)) {
        roots.add(desktop);
    }
    return Array.from(roots);
}

function latestMobileJson(dir: string): string {
    try {
        const files = fs.readdirSync(dir)
            .filter((name) => MOBILE_BACKUP_FILE_RE.test(name))
            .sort()
            .reverse();
        return files.length > 0 ? path.join(dir, files[0]) : "";
    } catch (error) {
        return "";
    }
}

function mobileBackupFiles(): string[] {
    const found = new Set<string>();
    for (const root of mobileBackupRoots()) {
        if (!isDirectory(root)) {
            continue;
        }
        if (MOBILE_BACKUP_DIR_RE.test(path.basename(root))) {
            const latest = latestMobileJson(root);
            if (latest) {
                found.add(latest);
            }
        }
        try {
            const entries = fs.readdirSync(root, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile() && MOBILE_BACKUP_FILE_RE.test(entry.name)) {
                    found.add(path.join(root, entry.name));
                } else if (entry.isDirectory() && MOBILE_BACKUP_DIR_RE.test(entry.name)) {
                    const latest = latestMobileJson(path.join(root, entry.name));
                    if (latest) {
                        found.add(latest);
                    }
                }
            }
        } catch (error) {
            continue;
        }
    }
    return Array.from(found);
}

function readMobileBackup(file: string): MobileBackupItem | null {
    try {
        const stat = fs.statSync(file);
        const raw = fs.readFileSync(file, "utf8");
        const parsed = JSON.parse(raw);
        const records = Array.isArray(parsed.records) ? parsed.records : [];
        const salaries = Array.isArray(parsed.salaries) ? parsed.salaries : [];
        const bonuses = Array.isArray(parsed.bonuses) ? parsed.bonuses : [];
        const budgets = Array.isArray(parsed.budgets) ? parsed.budgets : [];
        const deposits = Array.isArray(parsed.deposits) ? parsed.deposits : [];
        const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
        const created = parsed.createdAt ? new Date(parsed.createdAt) : stat.mtime;
        const createdDate = isNaN(created.getTime()) ? stat.mtime : created;
        return {
            file,
            name: path.basename(file),
            created_at: formatDateTime(createdDate),
            created_ts: Math.floor(createdDate.getTime() / 1000),
            device: String(parsed.device || "移动端"),
            counts: {
                record: records.length,
                salary: salaries.length,
                bonus: bonuses.length,
                budget: budgets.length,
                deposit: deposits.length,
                category: categories.filter((item: any) => !item || item.isSystem !== true).length,
            },
            size: stat.size,
        };
    } catch (error) {
        return null;
    }
}

export function listMobileBackups(): MobileBackupItem[] {
    const items: MobileBackupItem[] = [];
    for (const file of mobileBackupFiles()) {
        const item = readMobileBackup(file);
        if (item) {
            items.push(item);
        }
    }
    items.sort((left, right) => right.created_ts - left.created_ts);
    return items;
}

export function importMobileBackup(file: string): Promise<any> {
    return enqueueSnapshotTask(async () => {
        const target = path.resolve(String(file || ""));
        const allowed = listMobileBackups().some((item) => path.resolve(item.file) === target);
        if (!allowed) {
            throw new CloudSyncError("移动端备份文件不存在或不在允许的目录中");
        }
        let payload: any;
        try {
            payload = JSON.parse(fs.readFileSync(target, "utf8"));
        } catch (error) {
            throw new CloudSyncError("移动端备份文件读取失败");
        }
        const result = await importMobileBackupData(payload);
        logInfo("mobile backup imported: " + target);
        return result;
    });
}

export async function listSnapshots(): Promise<CloudSnapshotItem[]> {
    const folder = syncFolder();
    if (!folder || !isDirectory(folder)) {
        return [];
    }
    const manifest = readManifest(folder);
    const ownTag = deviceTag();
    const items: CloudSnapshotItem[] = [];

    for (const entry of listSnapshotFiles(folder)) {
        const info = parseSnapshotName(entry.name);
        if (!info) {
            continue;
        }
        const isLatest = !!manifest && manifest.snapshot === entry.name;
        let counts: DataCounts | null = null;
        if (entry.downloaded) {
            try {
                counts = await countsOfDatabase(entry.file);
                counts.category = countCustomCategories(path.join(folder, categorySidecar(entry.name)));
            } catch (error) {
                counts = null;
            }
        }
        if (!counts && isLatest && manifest) {
            const manifestCounts = manifest.counts || { record: 0 };
            counts = {
                record: Number(manifestCounts.record || 0),
                salary: Number(manifestCounts.salary || 0),
                bonus: Number(manifestCounts.bonus || 0),
                budget: Number(manifestCounts.budget || 0),
                deposit: Number(manifestCounts.deposit || 0),
                category: Number(manifestCounts.category || 0),
            };
        }
        let size = 0;
        if (entry.downloaded) {
            try {
                size = fs.statSync(entry.file).size;
            } catch (error) {
                size = 0;
            }
        }
        items.push({
            snapshot: entry.name,
            tag: info.tag,
            mode: info.mode,
            counts,
            created_at: isLatest && manifest
                ? manifest.created_at
                : formatDateTime(info.created),
            created_ts: Math.floor(info.created.getTime() / 1000),
            device_label: isLatest && manifest
                ? manifest.device
                : info.tag === ownTag ? "本机" : `其他设备（${info.tag}）`,
            is_mine: info.tag === ownTag,
            is_latest: isLatest,
            downloaded: entry.downloaded,
            size,
            record_count: counts ? counts.record : 0,
            has_category: entry.downloaded && isFile(path.join(folder, categorySidecar(entry.name))),
            app_version: isLatest && manifest ? manifest.app_version : "",
            sha256: isLatest && manifest ? manifest.sha256 : "",
        });
    }
    items.sort((a, b) => b.created_ts - a.created_ts);
    return items;
}

function formatDateTime(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function validateSnapshot(file: string): Promise<number> {
    let conn: sqlite3.Database;
    try {
        conn = await openReadonly(file);
    } catch (error) {
        throw new CloudSyncError("无法读取这份备份，可能还在同步中，请稍后再试");
    }
    try {
        const status = await queryOne(conn, "PRAGMA integrity_check");
        const verdict = status ? Object.values(status)[0] : "";
        if (verdict !== "ok") {
            throw new CloudSyncError("备份文件已损坏，无法恢复");
        }
        const tables = await queryAll(conn, "SELECT name FROM sqlite_master WHERE type='table'");
        if (!tables.some((row) => row.name === "record")) {
            throw new CloudSyncError("不是记账清单的备份文件");
        }
        const total = await queryOne(conn, "SELECT COUNT(*) AS total FROM record WHERE isDeleted = 0");
        return Number((total && total.total) || 0);
    } finally {
        await closeConnection(conn);
    }
}

async function backupLocalBeforeRestore(): Promise<string> {
    const folder = path.join(userDataPath, "backups");
    await fsp.mkdir(folder, { recursive: true });
    const stamp = stampText();
    let target = path.join(folder, `records_before_restore_${stamp}.db`);
    let index = 2;
    while (fs.existsSync(target)) {
        target = path.join(folder, `records_before_restore_${stamp}_${index}.db`);
        index += 1;
    }
    await backupDatabase(target);
    // 只保留最近几份本地恢复前备份
    const copied: string[] = [];
    for (const entry of fs.readdirSync(folder)) {
        if (entry.startsWith("records_before_restore_") && entry.endsWith(".db")) {
            copied.push(entry);
        }
    }
    copied.sort().reverse();
    for (const entry of copied.slice(LOCAL_BACKUP_KEEP)) {
        try {
            fs.unlinkSync(path.join(folder, entry));
        } catch (error) {
            // 忽略清理失败
        }
    }
    return target;
}

export interface CloudRestoreResult {
    snapshot: string;
    record_count: number;
    local_backup: string;
    category_restored: boolean;
    created_at: string;
}

/** 用云端快照覆盖本地数据库，覆盖前自动备份本机数据库 */
export function restoreSnapshot(snapshot: string): Promise<CloudRestoreResult> {
    return enqueueSnapshotTask(() => restoreSnapshotInternal(snapshot, false));
}

async function restoreSnapshotInternal(snapshot: string, auto = false): Promise<CloudRestoreResult> {
    const folder = syncFolder();
    if (!folder) {
        throw new CloudSyncError("没有可用的同步目录");
    }
    if (!parseSnapshotName(snapshot)) {
        throw new CloudSyncError("备份文件名不合法");
    }
    const file = path.join(folder, snapshot);
    if (!isFile(file)) {
        if (isFile(path.join(folder, `.${snapshot}.icloud`))) {
            throw new CloudSyncError("这份备份还没有下载到本机，请稍候重试，或先在同步目录中打开一次");
        }
        throw new CloudSyncError("备份文件不存在，可能还在同步中，请稍后再试");
    }

    const recordCount = await validateSnapshot(file);
    const manifest = readManifest(folder);
    if (manifest && manifest.snapshot === snapshot && manifest.sha256) {
        const digest = await sha256File(file);
        if (digest !== manifest.sha256) {
            throw new CloudSyncError("备份文件校验失败，可能还在同步中，请稍后再试");
        }
    }

    const localBackup = await backupLocalBeforeRestore();
    const sidecar = path.join(folder, categorySidecar(snapshot));
    const hasCategory = isFile(sidecar);

    const tempFile = `${dbPath}.restore`;
    try {
        await fsp.copyFile(file, tempFile);
    } catch (error) {
        throw new CloudSyncError("读取备份文件失败，请稍后再试");
    }

    await closeDatabase();
    try {
        fs.renameSync(tempFile, dbPath);
        // 清理可能残留的 WAL 日志，避免旧日志作用到新数据库
        for (const suffix of ["-wal", "-shm", "-journal"]) {
            try {
                fs.unlinkSync(`${dbPath}${suffix}`);
            } catch (error) {
                // 没有残留文件时忽略
            }
        }
    } finally {
        await reopenDatabase();
    }

    let categoryRestored = false;
    if (hasCategory) {
        try {
            const categoryBackup = `${customCategoryPath}.before_restore`;
            if (isFile(customCategoryPath)) {
                await fsp.copyFile(customCategoryPath, categoryBackup);
            }
            await fsp.copyFile(sidecar, customCategoryPath);
            categoryRestored = true;
        } catch (error) {
            logError("restore custom category failed:" + error);
        }
    }

    const state = await contentState();
    const syncedTs = manifest && manifest.snapshot === snapshot
        ? Number(manifest.created_ts) || Math.floor(Date.now() / 1000)
        : Math.floor(Date.now() / 1000);
    writeSettings({
        lastSnapshot: snapshot,
        lastState: state,
        lastTime: nowText(),
        lastSyncedTs: syncedTs,
    });
    logInfo(`cloud snapshot restored: ${snapshot}, records: ${recordCount}, auto: ${auto}`);
    broadcast({ type: "restore", status: "success", snapshot, auto, category_restored: categoryRestored });
    return {
        snapshot,
        record_count: recordCount,
        local_backup: localBackup,
        category_restored: categoryRestored,
        created_at: manifest && manifest.snapshot === snapshot ? manifest.created_at : "",
    };
}

export interface CloudSyncStatus {
    platform: string;
    autoBackup: boolean;
    autoSync: boolean;
    counts: DataCounts;
    folder: string;
    detected: boolean;
    available: boolean;
    lastTime: string;
    lastSnapshot: string;
    dirty: boolean;
    record_count: number;
    local_size: number;
    latest: SnapshotManifest | null;
    latest_downloaded: boolean;
    snapshot_count: number;
}

export async function cloudSyncStatus(): Promise<CloudSyncStatus> {
    const settings = readSettings();
    // 首次使用时把同步子目录建出来，页面上的「同步」按钮才可用
    const folder = syncFolder(true);
    const available = !!folder && isDirectory(folder);
    const manifest = available ? readManifest(folder) : null;
    const state = available ? await contentState() : "";
    let counts: DataCounts = { record: 0, salary: 0, bonus: 0, budget: 0, deposit: 0, category: 0 };
    try {
        counts = await localDataCounts();
    } catch (error) {
        counts = { record: 0, salary: 0, bonus: 0, budget: 0, deposit: 0, category: 0 };
    }
    let localSize = 0;
    try {
        localSize = fs.statSync(dbPath).size;
    } catch (error) {
        localSize = 0;
    }
    let snapshotCount = 0;
    if (available) {
        snapshotCount = listSnapshotFiles(folder).filter((item) => parseSnapshotName(item.name)).length;
    }
    return {
        platform: process.platform,
        autoBackup: settings.autoBackup,
        autoSync: settings.autoSync,
        folder,
        detected: !!settings.dir || detectedDirs().length > 0,
        available,
        lastTime: settings.lastTime,
        lastSnapshot: settings.lastSnapshot,
        dirty: !!state && state !== settings.lastState,
        counts,
        record_count: counts.record,
        local_size: localSize,
        latest: manifest,
        latest_downloaded: !!(manifest && isFile(path.join(folder, manifest.snapshot))),
        snapshot_count: snapshotCount,
    };
}

export async function chooseSyncDir(): Promise<CloudSyncStatus> {
    const options: OpenDialogOptions = {
        title: "选择 iCloud 云盘同步目录",
        properties: ["openDirectory", "createDirectory"],
    };
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const result = win && !win.isDestroyed()
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
        return cloudSyncStatus();
    }
    writeSettings({
        dir: result.filePaths[0],
        lastSnapshot: "",
        lastState: "",
        lastTime: "",
    });
    return cloudSyncStatus();
}

export function openSyncFolder() {
    const folder = syncFolder(true);
    if (!folder) {
        return false;
    }
    shell.openPath(folder);
    return true;
}

function ok(data: any) {
    return { ok: true, data };
}

function fail(error: unknown) {
    logError("cloud sync ipc failed:" + error);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
}

let autoTimer: ReturnType<typeof setInterval> | null = null;
let autoBusy = false;
let pendingBackupAt = 0;
let firstAutoTick = true;
let autoSyncRetryAt = 0;

/**
 * 自动备份/同步：
 * - 数据变更后延迟 1 分钟自动备份（每台机器保留 2 份手动 + 3 份自动）
 * - 本地干净且云端出现更新的快照时，自动拉取最新一份
 */
export function startCloudAutoSync() {
    if (autoTimer) {
        return;
    }
    autoTimer = setInterval(() => {
        void autoTick();
    }, AUTO_CHECK_INTERVAL_MS);
    setTimeout(() => {
        void autoTick();
    }, 5000);
}

async function autoTick() {
    if (autoBusy) {
        return;
    }
    const settings = readSettings();
    if (!settings.autoBackup && !settings.autoSync) {
        pendingBackupAt = 0;
        return;
    }
    const folder = syncFolder();
    if (!folder || !isDirectory(folder)) {
        return;
    }

    let state = "";
    try {
        state = await contentState();
    } catch (error) {
        return;
    }
    if (!state) {
        return;
    }

    if (state !== settings.lastState) {
        // 有未备份的改动：等待防抖时间后自动上传，本地改动优先
        if (!pendingBackupAt) {
            // 启动后的首次检查若有遗留改动，立即备份
            pendingBackupAt = firstAutoTick ? Date.now() - AUTO_BACKUP_DELAY_MS : Date.now();
        }
        if (Date.now() - pendingBackupAt < AUTO_BACKUP_DELAY_MS) {
            return;
        }
        autoBusy = true;
        try {
            await enqueueSnapshotTask(() => createSnapshotInternal(false, "auto"));
            pendingBackupAt = 0;
        } catch (error) {
            logError("auto backup failed:" + error);
            // 失败后 5 分钟内不再重试，避免反复写盘/报错
            pendingBackupAt = Date.now() + 5 * 60 * 1000;
        } finally {
            autoBusy = false;
            firstAutoTick = false;
        }
        return;
    }

    pendingBackupAt = 0;
    firstAutoTick = false;
    if (!settings.autoSync) {
        return;
    }

    // 本地干净，检查云端是否有更新的快照（以最新时间为准）
    if (Date.now() < autoSyncRetryAt) {
        return;
    }
    const manifest = readManifest(folder);
    if (!manifest || manifest.snapshot === settings.lastSnapshot) {
        return;
    }
    const latestTs = Number(manifest.created_ts) || 0;
    if (latestTs <= (Number(settings.lastSyncedTs) || 0)) {
        return;
    }
    if (!isFile(path.join(folder, manifest.snapshot))) {
        return;
    }

    autoBusy = true;
    try {
        await enqueueSnapshotTask(() => restoreSnapshotInternal(manifest.snapshot, true));
    } catch (error) {
        logError("auto sync failed:" + error);
        autoSyncRetryAt = Date.now() + 5 * 60 * 1000;
    } finally {
        autoBusy = false;
    }
}

export function cloudSyncListeners() {
    if (listenersRegistered) {
        return;
    }
    listenersRegistered = true;

    ipcMain.handle(IpcType.CLOUD_SYNC_STATUS, async () => {
        try {
            return ok(await cloudSyncStatus());
        } catch (error) {
            return fail(error);
        }
    });

    ipcMain.handle(IpcType.CLOUD_SYNC_BACKUP, async (event, force) => {
        logInfo("receive cloud sync backup request");
        try {
            return ok(await createSnapshot(force === true));
        } catch (error) {
            return fail(error);
        }
    });

    ipcMain.handle(IpcType.CLOUD_SYNC_SNAPSHOTS, async () => {
        try {
            return ok(await listSnapshots());
        } catch (error) {
            return fail(error);
        }
    });

    ipcMain.handle(IpcType.CLOUD_SYNC_MOBILE_BACKUPS, async () => {
        try {
            return ok(listMobileBackups());
        } catch (error) {
            return fail(error);
        }
    });

    ipcMain.handle(IpcType.CLOUD_SYNC_IMPORT_MOBILE, async (event, file) => {
        try {
            return ok(await importMobileBackup(String(file || "")));
        } catch (error) {
            return fail(error);
        }
    });

    ipcMain.handle(IpcType.CLOUD_SYNC_RESTORE, async (event, snapshot) => {
        logInfo("receive cloud sync restore request:" + snapshot);
        try {
            return ok(await restoreSnapshot(String(snapshot || "")));
        } catch (error) {
            return fail(error);
        }
    });

    ipcMain.handle(IpcType.CLOUD_SYNC_SETTINGS, async (event, patch) => {
        try {
            const source = patch && typeof patch === "object" ? patch : {};
            const current = readSettings();
            writeSettings({
                autoBackup: "autoBackup" in source ? source.autoBackup === true : current.autoBackup,
                autoSync: "autoSync" in source ? source.autoSync === true : current.autoSync,
            });
            pendingBackupAt = 0;
            void autoTick();
            return ok(await cloudSyncStatus());
        } catch (error) {
            return fail(error);
        }
    });

    ipcMain.handle(IpcType.CLOUD_SYNC_CHOOSE_DIR, async () => {
        try {
            return ok(await chooseSyncDir());
        } catch (error) {
            return fail(error);
        }
    });

    ipcMain.handle(IpcType.CLOUD_SYNC_OPEN_DIR, async () => {
        try {
            return ok(openSyncFolder());
        } catch (error) {
            return fail(error);
        }
    });

    startCloudAutoSync();
}
