// src/main/autoUpdater.js
import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { logInfo, logError } from './Log';
import { ipcMain } from 'electron';
import { IpcType } from '@/models/IpcResponse'

/**
 * 用户确定是否下载更新
 */
export function downloadUpdate() {
    autoUpdater.downloadUpdate();
}

/**
 * 退出并安装更新
 */
export function installUpdate() {
    autoUpdater.quitAndInstall();
}

/**
 * 自动更新的逻辑
 * @param mainWindow
 */
export async function autoUpdateApp(mainWindow: BrowserWindow) {
    // 每次启动自动更新检查更新版本

    await sleep(3000);
    // autoUpdater.checkForUpdates();
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.disableWebInstaller = false;
    // 这个写成 false，写成 true 时，可能会报没权限更新
    autoUpdater.autoDownload = false;
    autoUpdater.on('error', (error) => {
        logError("detect update failed, error:" + error);
    });
    // 当有可用更新的时候触发。 更新将自动下载。
    autoUpdater.on('update-available', (info) => {
        logInfo('received update available, version:' + info.version);
        // 检查到可用更新，交由用户提示是否下载
        mainWindow.webContents.send(IpcType.UPDATE_AVAILABLE, info);
    });
    // 下载更新包的进度，可以用于显示下载进度与前端交互等
    autoUpdater.on('download-progress', async (progress) => {
        // 计算下载百分比
        const downloadPercent = Math.round(progress.percent * 100) / 100;
        // 实时同步下载进度到渲染进程，以便于渲染进程显示下载进度
        mainWindow.webContents.send(IpcType.DOWNLOAD_PROGRESS, downloadPercent);
    });
    // 在更新下载完成的时候触发。
    autoUpdater.on('update-downloaded', (res) => {
        logInfo('update downloaded');
        // 下载完成之后，弹出对话框提示用户是否立即安装更新
        mainWindow.webContents.send(IpcType.UPDATE_DOWNLOADED, res);
    });

    ipcMain.on(IpcType.UPDATE_DOWNLOAD, () => {
        // 用户点击了立即更新
        logInfo('receive user click update download');
        autoUpdater.downloadUpdate();
    })
    ipcMain.on(IpcType.UPDATE_INSTALL, () => {
        // 用户点击了安装更新
        logInfo('receive user click update install');
        autoUpdater.quitAndInstall();
    })
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
