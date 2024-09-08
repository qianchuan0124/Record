'use strict'

import { app, protocol, BrowserWindow, screen } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
const isDevelopment = process.env.NODE_ENV !== 'production'
import path from 'path'
import { databaseListen } from "./db/Database";
import { logError, logInfo, logListener } from './utils/Log'
import { autoUpdateApp } from './utils/AutoUpdater'
import { settingListener } from './utils/SettingCenter'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true } }
])

function defaultSize(): { height: number, width: number } {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    const resultWidth = Math.max(1200, Math.min(width * 0.8, 1500))
    const resultHeight = Math.max(700, Math.min(height * 0.8, 1000))

    return { height: resultHeight, width: resultWidth }
}

async function createWindow() {
    // Create the browser window.
    logInfo('APP-INFO:CreateWindow')
    const win = new BrowserWindow({
        width: defaultSize().width,
        height: defaultSize().height,
        minWidth: 1200,
        minHeight: 700,
        icon: path.join(app.getAppPath(), 'public/favicon.ico'),
        webPreferences: {

            // Use pluginOptions.nodeIntegration, leave this alone
            // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
            nodeIntegration: (process.env
                .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
        if (!process.env.IS_TEST) win.webContents.openDevTools()
    } else {
        createProtocol('app')
        // Load the index.html when not in development
        win.loadURL('app://./index.html')
    }
    autoUpdateApp(win)
    settingListener(win)
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    logInfo('APP-INFO:WindowAllClosed')
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
    logInfo('APP-INFO:Ready')
    if (isDevelopment && !process.env.IS_TEST) {
        // Install Vue Devtools
        try {
            await installExtension(VUEJS3_DEVTOOLS)
        } catch (e) {
            logError('Vue Devtools failed to install:' + e)
        }
    }
    createWindow()
    databaseListen()
    logListener()
    appStatusListener()
})

function appStatusListener() {
    // 渲染进程崩溃
    app.on('renderer-process-crashed', (event, webContents, killed) => {
        logError(
            `APP-ERROR:renderer-process-crashed; event: ${JSON.stringify(event)}; webContents:${JSON.stringify(
                webContents
            )}; killed:${JSON.stringify(killed)}`
        )
    })

    // GPU进程崩溃
    app.on('gpu-process-crashed', (event, killed) => {
        logError(`APP-ERROR:gpu-process-crashed; event: ${JSON.stringify(event)}; killed: ${JSON.stringify(killed)}`)
    })

    // 渲染进程结束
    app.on('render-process-gone', async (event, webContents, details) => {
        logError(
            `APP-ERROR:render-process-gone; event: ${JSON.stringify(event)}; webContents:${JSON.stringify(
                webContents
            )}; details:${JSON.stringify(details)}`
        )
    })

    // 子进程结束
    app.on('child-process-gone', async (event, details) => {
        logError(`APP-ERROR:child-process-gone; event: ${JSON.stringify(event)}; details:${JSON.stringify(details)}`)
    })

}

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
    if (process.platform === 'win32') {
        process.on('message', (data) => {
            if (data === 'graceful-exit') {
                app.quit()
            }
        })
    } else {
        process.on('SIGTERM', () => {
            app.quit()
        })
    }
}
