import log from 'electron-log';
import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// 兜底写 stderr：GUI 进程可能没有 stderr，写入失败也必须静默
function safeStderr(text: string) {
    try {
        process.stderr.write(text);
    } catch (e) {
        // 连 stderr 都写不了就彻底放弃，绝不能再抛
    }
}

// 与 electron-log 的默认目录保持一致：Windows 是 userData/logs，macOS 是 ~/Library/Logs/<appName>
function resolveLogDir(): string {
    if (process.platform === 'darwin') {
        return path.join(app.getPath('home'), 'Library', 'Logs', app.getName());
    }
    return path.join(app.getPath('userData'), 'logs');
}

// 启动前探测文件日志是否可写（与 electron-log testFileWriting 的行为一致：追加打开 main.log）。
// 不可写时不配置文件 transport，避免它在 sqlite3 等原生回调里抛异常触发 N-API FATAL。
function isFileLogWritable(): boolean {
    try {
        const logDir = resolveLogDir();
        fs.mkdirSync(logDir, { recursive: true });
        fs.appendFileSync(path.join(logDir, 'main.log'), '');
        return true;
    } catch (e) {
        return false;
    }
}

const fileLogging = isFileLogWritable();

// 关闭控制台打印
log.transports.console.level = false;
// 输出格式
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}';
// 文件最大不超过 10M
log.transports.file.maxSize = 10024300;

if (fileLogging) {
    log.transports.file.level = 'debug';
} else {
    log.transports.file.level = false;
    safeStderr('[log] 日志文件不可写，已禁用文件日志（不再尝试写入 ' + resolveLogDir() + '）\n');
}

// 即便启动探测通过，运行中也可能因为文件被占用 / 权限变化而写失败；
// 把 file transport 包一层，任何抛出都降级到 stderr，绝不外泄到原生回调。
type GuardedTransport = ((message: any) => void) & Record<string, any>;

function guardFileTransport() {
    const transports = log.transports as unknown as Record<string, GuardedTransport>;
    const original = transports.file;
    if (!original || (original as { __guarded?: boolean }).__guarded) {
        return;
    }
    const guarded: GuardedTransport = (message: any) => {
        try {
            original(message);
        } catch (e) {
            safeStderr('[log] 文件日志写入失败（已忽略）: ' + String(e) + '\n');
        }
    };
    Object.assign(guarded, original);
    guarded.__guarded = true;
    transports.file = guarded;
}

try {
    guardFileTransport();
} catch (e) {
    safeStderr('[log] 包装文件 transport 失败: ' + String(e) + '\n');
}

// 兜底：electron-log 写文件失败（日志被占用 / 权限 / 磁盘满等）时，绝不让异常逃逸。
// 否则异常会顺着 sqlite3 等原生模块的异步回调触发 N-API FATAL，直接打挂整个进程。
// 文件写失败时降级到 process.stderr，保证关键错误信息不丢失。
function safeLog(level: 'info' | 'warn' | 'error' | 'debug' | 'verbose' | 'silly', ...args: unknown[]) {
    try {
        (log as unknown as Record<string, (...a: unknown[]) => void>)[level](...args)
    } catch (e) {
        try {
            const msg = e && (e as Error).message ? (e as Error).message : String(e)
            process.stderr.write('[log:' + level + ' 写入失败] ' + msg + '\n')
        } catch (err) {
            // 连 stderr 都写不了就彻底放弃，绝不能再抛
        }
    }
}

// 有六个日志级别error, warn, info, verbose, debug, silly。默认是silly
export default {
    info(param: any) {
        safeLog('info', param)
    },
    warn(param: any) {
        safeLog('warn', param)
    },
    error(param: any) {
        safeLog('error', param)
    },
    debug(param: any) {
        safeLog('debug', param)
    },
    verbose(param: any) {
        safeLog('verbose', param)
    },
    silly(param: any) {
        safeLog('silly', param)
    }
}

export function logInfo(content: string) {
    safeLog('info', ' [main] ' + content)
}

export function logError(content: string) {
    safeLog('error', ' [main] ' + content)
}

export function logListener() {
    ipcMain.handle('logger', (event, level, arg) => {
        if (level === "info") {
            safeLog('info', arg)
        } else if (level === 'warn') {
            safeLog('warn', arg)
        } else if (level === 'error') {
            safeLog('error', arg)
        } else if (level === 'debug') {
            safeLog('debug', arg)
        }
    })
}
