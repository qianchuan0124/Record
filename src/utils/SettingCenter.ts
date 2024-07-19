import { ipcMain } from "electron";
import { shell } from "electron";
import { app, clipboard } from "electron";
import path from "path";
import log from "electron-log";
import { logInfo } from "./Log";
import { IpcType } from "@/models/IpcResponse";
import { info } from "@/configs/Info";

export function settingListener() {
    ipcMain.on(IpcType.OPEN_DATABASE_DIR, (event, arg) => {
        logInfo('receive user open database dir')
        shell.openPath(app.getAppPath())
        if (process.platform === 'darwin') {
            const userDataPath = app.getPath('userData');
            logInfo('open db path:' + userDataPath)
            shell.openPath(userDataPath)
        } else if (process.platform === 'win32') {
            const dbPath = path.join(app.getPath('userData'), '')
            logInfo('open db path:' + dbPath)
            shell.openPath(dbPath)
        }
    })

    ipcMain.on(IpcType.OPEN_LOG_DIR, (event, arg) => {
        logInfo('receive user open log dir')
        if (process.platform === 'darwin') {
            const logPath = log.transports.file.getFile().path;
            logInfo("open log path:" + logPath)
            shell.openPath(logPath)
        } else if (process.platform === 'win32') {
            const logPath = path.join(app.getPath('userData'), 'logs')
            logInfo("open log path:" + logPath)
            shell.openPath(logPath)
        }
    })

    ipcMain.handle(IpcType.COPY_MAIL_INFO, async (event, arg) => {
        logInfo('receive user copy mail info')
        clipboard.writeText(info.userMail)
        return true
    })

    ipcMain.on(IpcType.OPEN_URL, (event, url) => {
        logInfo('receive user click url:' + url)
        shell.openExternal(url)
    })
}