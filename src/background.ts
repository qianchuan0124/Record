'use strict'

// 必须放在所有业务 import 之前：先确定 userData 目录，Database/CloudSync 才会读到正确的路径
import './utils/UserDataPath'
import { app, protocol, BrowserWindow, screen, Menu } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
const isDevelopment = process.env.NODE_ENV !== 'production'
import path from 'path'
import { databaseListen } from "./db/Database";
import { logError, logInfo, logListener } from './utils/Log'
import { autoUpdateApp } from './utils/AutoUpdater'
import { settingListener } from './utils/SettingCenter'
import { cloudSyncListeners } from './utils/CloudSync'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

// 单实例锁：重复点击启动时只保留第一个实例，避免打开多个窗口
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  // 第二个实例被启动时，激活已存在的窗口
  app.on('second-instance', () => {
    logInfo('APP-INFO:SecondInstance')
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
}

function defaultSize(): { height: number, width: number } {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  // 默认占工作区 85%，并保证不超过当前屏幕；大屏最多 1500×1000，小屏最低 960×600
  const resultWidth = Math.min(width, Math.min(1500, Math.max(960, Math.round(width * 0.85))))
  const resultHeight = Math.min(height, Math.min(1000, Math.max(600, Math.round(height * 0.85))))

  return { height: resultHeight, width: resultWidth }
}

async function createWindow() {
  // Create the browser window.
  logInfo('APP-INFO:CreateWindow')
  const win = new BrowserWindow({
    width: defaultSize().width,
    height: defaultSize().height,
    minWidth: 960,
    minHeight: 600,
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

  // 云同步的 IPC 需要在页面加载前注册，否则设置页首次调用状态会拿不到 handler
  cloudSyncListeners()

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    // 开发模式默认不自动打开 DevTools，需要时用 F12 / Cmd+Shift+I 手动打开
    if (process.env.RECORD_DEVTOOLS === '1') win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  if (isDevelopment) {
    // 菜单栏移除后，开发模式仍保留刷新和开发者工具快捷键
    win.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return
      const withModifier = process.platform === 'darwin' ? input.meta : input.control
      const key = input.key.toLowerCase()
      if ((withModifier && key === 'r') || input.key === 'F5') {
        win.webContents.reload()
        event.preventDefault()
      } else if ((withModifier && input.shift && key === 'i') || input.key === 'F12') {
        win.webContents.toggleDevTools()
        event.preventDefault()
      }
    })
  }

  // 内网分发包不走 GitHub 更新源，默认关闭检查；需要时用 RECORD_AUTO_UPDATE=1 启动。
  if (process.env.RECORD_AUTO_UPDATE === '1') {
    autoUpdateApp(win)
  }
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
  // 未获取到单实例锁的进程直接退出，不再创建窗口和注册 IPC
  if (!gotTheLock) {
    return
  }
  logInfo('APP-INFO:Ready')
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e) {
      logError('Vue Devtools failed to install:' + e)
    }
  }
  // 屏蔽 Electron 默认的 File/Edit/View 菜单
  if (process.platform === 'darwin') {
    // macOS 菜单栏是全局的无法完全移除，只保留应用菜单和编辑菜单，保证退出、复制粘贴等快捷键可用
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' }
    ]))
  } else {
    // Windows/Linux 直接移除菜单栏，刷新和开发者工具快捷键由 createWindow 中的开发模式处理
    Menu.setApplicationMenu(null)
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
