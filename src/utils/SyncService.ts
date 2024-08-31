import * as http from 'http'
import * as os from 'os'
import { getRecordsCount, getRecordsByLimit, insertRecordsIfNeeded } from '@/db/Database'
import { parse } from 'url';
import { BrowserWindow, ipcMain } from "electron";
import { IpcType } from '@/models/IpcResponse'
import L10n from "@/configs/L10n.json";
import { logInfo, logError } from "./Log";

var server: http.Server

export function openServer(win: BrowserWindow): Promise<string> {
    // 防止重复开启
    closeServer()

    // 获取本机的局域网IP和自定义端口
    const SERVER_PORT = 65526
    const SERVER_IP = getServerIp()

    server = http.createServer()
    server.on('request', async (req: any, res: any) => {
        // 防止跨域
        res.writeHead(200, { "Content-Type": "application/json;charset=utf-8", "access-control-allow-origin": "*" })

        if (req.method === 'GET' && req.url === '/sync/records/start') {
            logInfo('receive sync start')
            const context = {
                result: true
            }
            res.end(JSON.stringify(context))
            win.webContents.send(IpcType.SYNC_STATUS, "start");
        } else if (req.method === 'GET' && req.url === '/sync/records/success') {
            logInfo('receive sync success')
            const context = {
                result: true
            }
            res.end(JSON.stringify(context))
            win.webContents.send(IpcType.SYNC_STATUS, "success");
        } else if (req.method === 'GET' && req.url === '/sync/records/failed') {
            logInfo('receive sync failed')
            const context = {
                result: true
            }
            res.end(JSON.stringify(context))
            win.webContents.send(IpcType.SYNC_STATUS, "failed");
        } else if (req.method === 'GET' && req.url.startsWith('/sync/records/result')) {
            logInfo('receive sync get result')
            const parsedUrl = parse(req.url, true)
            const query = parsedUrl.query

            try {
                const page = parseInt(query.page as string) || 1
                const limit = parseInt(query.limit as string) || 10
                const offset = (page - 1) * limit
                let totalRecords = await getRecordsCount()
                let records = await getRecordsByLimit(limit, offset)
                const context = {
                    totalRecords: totalRecords,
                    currentCount: records.length,
                    records: records
                }
                let response = JSON.stringify(context)
                res.end(response)
            } catch (error) {
                if (error instanceof Error) {
                    logError("sync get result failed:" + error)
                    res.end(JSON.stringify({ result: false, err: error.message }))
                } else {
                    logError("sync get result failed:" + error)
                    res.end(JSON.stringify({ result: false, err: L10n.unknown_error }))
                }
                return
            }

        } else if (req.method === 'POST' && req.url === '/sync/records/result') {
            logInfo('receive sync post result')
            let body = '';
            req.on('data', (chunk: Buffer) => {
                body += chunk.toString(); // 转换Buffer到字符串
            });
            req.on('end', async () => {
                const parsedBody = JSON.parse(body);
                const { records } = parsedBody;
                try {
                    await insertRecordsIfNeeded(records)
                    res.end(JSON.stringify({ result: true }))
                } catch (error) {
                    if (error instanceof Error) {
                        logError("sync post result failed:" + error)
                        res.end(JSON.stringify({ result: false, err: error.message }))
                    } else {
                        logError("sync post result failed:" + error)
                        res.end(JSON.stringify({ result: false, err: L10n.unknown_error }))
                    }
                    return
                }
            });
        }
    })

    // 返回端口开启结果
    return new Promise<string>((resolve, reject) => {
        server.listen(SERVER_PORT, SERVER_IP, () => {
            // 服务器正确开启
            resolve(`record-list-for-sync:http://${SERVER_IP}:${SERVER_PORT}`)
        })
        server.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                // 服务器端口已经被使用
                reject(`端口:${SERVER_PORT}被占用,请更换占用端口`)
            }
        })
    })
}

function closeServer() {
    if (server) {
        server.close()
    }
}

function getServerIp() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (const alias of iface || []) {
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal && alias.address.startsWith('192.168')) {
                return alias.address;
            }
        }
    }
    return '0.0.0.0';
}