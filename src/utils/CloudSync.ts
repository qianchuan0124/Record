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
} from "@/db/Database";
import { logError, logInfo } from "./Log";

const SYNC_SUBDIR = "记账清单";
const SNAPSHOT_PREFIX = "record_";
const SNAPSHOT_SUFFIX = ".db";
const CATEGORY_SUFFIX = ".categories.json";
const MANIFEST_NAME = "latest.json";
const SNAPSHOT_KEEP_PER_DEVICE = 3;
const LOCAL_BACKUP_KEEP = 5;
const SNAPSHOT_NAME_RE = /^record_(\d{8}_\d{6})_([0-9a-f]{4})(?:_(\d+))?\.db$/;

export class CloudSyncError extends Error { }

interface CloudSyncSettings {
    dir: string;
    lastSnapshot: string;
    lastState: string;
    lastTime: string;
}

interface SnapshotManifest {
    snapshot: string;
    created_at: string;
    created_ts: number;
    device: string;
    app_version: string;
    sha256: string;
    size: number;
    counts: { record: number };
    custom_category: boolean;
}

export interface CloudSnapshotItem {
    snapshot: string;
    tag: string;
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
        const rows = await queryAll(
            getDb(),
            "SELECT id, amount, type, date, category, subCategory, remark, isDeleted, syncId FROM record ORDER BY id"
        );
        const hash = crypto.createHash("sha256");
        for (const row of rows) {
            hash.update(JSON.stringify(row));
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

function parseSnapshotName(name: string): { tag: string; created: Date } | null {
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
    return { tag: matched[2], created };
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

    const groups: Record<string, string[]> = {};
    for (const item of listSnapshotFiles(folder)) {
        const info = parseSnapshotName(item.name);
        if (!info) {
            continue;
        }
        if (!groups[info.tag]) {
            groups[info.tag] = [];
        }
        groups[info.tag].push(item.name);
    }
    for (const names of Object.values(groups)) {
        names.sort().reverse();
        for (const name of names.slice(SNAPSHOT_KEEP_PER_DEVICE)) {
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

function uniqueSnapshotName(folder: string): string {
    const stamp = stampText();
    const tag = deviceTag();
    let name = `${SNAPSHOT_PREFIX}${stamp}_${tag}${SNAPSHOT_SUFFIX}`;
    let index = 2;
    while (fs.existsSync(path.join(folder, name)) || fs.existsSync(path.join(folder, `.${name}.icloud`))) {
        name = `${SNAPSHOT_PREFIX}${stamp}_${tag}_${index}${SNAPSHOT_SUFFIX}`;
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
export function createSnapshot(force = false): Promise<CloudBackupResult> {
    return enqueueSnapshotTask(() => createSnapshotInternal(force));
}

async function createSnapshotInternal(force: boolean): Promise<CloudBackupResult> {
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

    const name = uniqueSnapshotName(folder);
    const finalFile = path.join(folder, name);
    const tempFile = path.join(folder, `.${name}.part`);

    let manifest: SnapshotManifest;
    try {
        await fsp.rm(tempFile, { force: true });
        await backupDatabase(tempFile);
        const count = await recordCountOf(tempFile);
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
            counts: { record: count },
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
    });
    logInfo(`cloud snapshot created: ${name}, records: ${manifest.counts.record}`);
    broadcast({ type: "backup", status: "success", snapshot: name, created_at: manifest.created_at });
    return backupResult(manifest, folder, false);
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
        let recordCount = 0;
        if (entry.downloaded) {
            try {
                recordCount = await recordCountOf(entry.file);
            } catch (error) {
                recordCount = 0;
            }
        }
        if (isLatest && manifest) {
            recordCount = Number((manifest && manifest.counts && manifest.counts.record) || recordCount);
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
            record_count: recordCount,
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
    return enqueueSnapshotTask(() => restoreSnapshotInternal(snapshot));
}

async function restoreSnapshotInternal(snapshot: string): Promise<CloudRestoreResult> {
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
    writeSettings({
        lastSnapshot: snapshot,
        lastState: state,
        lastTime: nowText(),
    });
    logInfo(`cloud snapshot restored: ${snapshot}, records: ${recordCount}`);
    broadcast({ type: "restore", status: "success", snapshot });
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
    let recordCount = 0;
    try {
        const row = await queryOne(getDb(), "SELECT COUNT(*) AS total FROM record WHERE isDeleted = 0");
        recordCount = Number((row && row.total) || 0);
    } catch (error) {
        recordCount = 0;
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
        folder,
        detected: !!settings.dir || detectedDirs().length > 0,
        available,
        lastTime: settings.lastTime,
        lastSnapshot: settings.lastSnapshot,
        dirty: !!state && state !== settings.lastState,
        record_count: recordCount,
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

    ipcMain.handle(IpcType.CLOUD_SYNC_RESTORE, async (event, snapshot) => {
        logInfo("receive cloud sync restore request:" + snapshot);
        try {
            return ok(await restoreSnapshot(String(snapshot || "")));
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
}
