import log from 'electron-log';
import { ipcMain } from 'electron';

// 关闭控制台打印
log.transports.console.level = false
log.transports.file.level = 'debug'
log.transports.file.maxSize = 10024300 // 文件最大不超过 10M
// 输出格式
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}'
// 默认位置为：C:\Users\[user]\AppData\Roaming\[appname]\electron_log\

// 有六个日志级别error, warn, info, verbose, debug, silly。默认是silly
export default {
    info(param: any) {
        log.info(param)
    },
    warn(param: any) {
        log.warn(param)
    },
    error(param: any) {
        log.error(param)
    },
    debug(param: any) {
        log.debug(param)
    },
    verbose(param: any) {
        log.verbose(param)
    },
    silly(param: any) {
        log.silly(param)
    }
}

export function logInfo(content: string) {
    log.info(' [main] ' + content)
}

export function logError(content: string) {
    log.error(' [main] ' + content)
}

export function logListener() {
    ipcMain.handle('logger', (event, level, arg) => {
        if (level === "info") {
            log.info(arg);
        } else if (level === 'warn') {
            log.warn(arg);
        } else if (level === 'error') {
            log.error(arg);
        } else if (level === 'debug') {
            log.debug(arg);
        }
    })
}
