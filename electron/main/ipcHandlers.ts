// electron/main/ipcHandlers.ts

import { ipcMain, BrowserWindow, shell } from 'electron'
import { loadURLList, saveURLList, loadComparisonResults, saveComparisonResults, CompareResult } from './storage'
import { processURL, processURLWithTimeout, ScreenshotResult } from './screenshot'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

// 存储网址列表
let urlList: string[] = loadURLList()
// 存储比对结果
let comparisonResults: Record<string, { timestamp: string, diffPixels: number, diffPercentage: number, diffImagePath?: string }> = loadComparisonResults()

// 添加网址的 IPC 处理
export function handleAddURL(win: BrowserWindow | null) {
    ipcMain.on('add-url', (_, url: string) => {
        win?.webContents.send('error-occurred', {
            from: 'add-url',
            body: url
        })
        if (url && !urlList.includes(url)) {
            urlList.push(url)
            saveURLList(urlList)
            console.log(`添加网址: ${url}`)
        }
    })
}

// 获取网址列表的 IPC 处理
export function handleGetURLs(win: BrowserWindow | null) {
    ipcMain.handle('get-urls', () => {
        win?.webContents.send('error-occurred', {
            from: 'get-urls',
            body: urlList
        })
        return urlList
    })
}

// 获取比对结果的 IPC 处理
export function handleGetResults(win: BrowserWindow | null) {
    ipcMain.handle('get-results', () => {
        win?.webContents.send('error-occurred', {
            from: 'get-results',
            body: comparisonResults
        })
        return comparisonResults
    })
}

// 新增：处理获取图片数据的 IPC 处理
export function handleGetImageData(win: BrowserWindow | null) {
    ipcMain.handle('get-image-data', async (_, filePath: string) => {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error('文件不存在')
            }
            const data = fs.readFileSync(filePath)
            const ext = path.extname(filePath).toLowerCase()
            let mimeType = 'image/png'
            if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg'
            else if (ext === '.gif') mimeType = 'image/gif'
            // 可根据需要添加更多类型
            return `data:${mimeType};base64,${data.toString('base64')}`
        } catch (error) {
            console.error('读取图片失败:', error)
            return null
        }
    })
}

// 比对网址的 IPC 处理
export function handleCompareURLs(win: BrowserWindow | null) {
    ipcMain.handle('compare-urls', async (_, urls: string[]) => {
        const results: CompareResult[] = [];
        for (const url of urls) {
            try {
                const result: ScreenshotResult = await processURLWithTimeout(url, 30000, win);
                results.push({
                    url,
                    status: 'success',
                    diffPixels: result.diffPixels,
                    timestamp: result.timestamp,
                    diffPercentage: result.diffPercentage,
                    diffImagePath: result.diffImagePath // 添加 diffImagePath
                });
                comparisonResults[url] = {
                    timestamp: result.timestamp,
                    diffPixels: result.diffPixels,
                    diffPercentage: result.diffPercentage,
                    diffImagePath: result.diffImagePath // 存储 diffImagePath
                };
            } catch (error: any) {
                console.error(`处理 ${url} 时发生错误:`, error); // 添加日志
                win?.webContents.send('error-occurred', {
                    from: 'compare-urls',
                    body: {
                        error: error,
                        site: url
                    }
                })
                results.push({
                    url,
                    status: 'error',
                    message: error.message,
                    timestamp: new Date().toLocaleString(),
                    diffPixels: undefined,
                    diffPercentage: undefined,
                    diffImagePath: undefined
                });
                comparisonResults[url] = {
                    timestamp: new Date().toLocaleString(),
                    diffPixels: -1,
                    diffPercentage: 0,
                    diffImagePath: '' // 错误情况下设置为空
                };
            }
        }
        saveComparisonResults(comparisonResults);
        win?.webContents.send('compare-result', results);
        return results;
    });
}

// 打开快照目录的 IPC 处理
export function handleOpenSnapshotDir(win: BrowserWindow | null) {
    ipcMain.handle('open-snapshot-dir', () => {
        const snapshotDir = path.join(app.getPath('userData'), 'screenshots')
        win?.webContents.send('error-occurred', {
            from: 'open-snapshot-dir',
            body: snapshotDir
        })
        shell.openPath(snapshotDir)
    })
}

// 打开特定网站的快照目录
export function handleOpenWebsiteSnapshotDir(win: BrowserWindow | null) {
    ipcMain.handle('open-website-snapshot-dir', async (_, url: string) => {
        console.log('收到打开快照目录请求:', url)
        // 将特殊字符替换为下划线
        const sanitizedUrl = sanitizeUrl(url)
        console.log('sanitizedUrl', sanitizedUrl)
        const websiteDir = path.join(app.getPath('userData'), 'screenshots', sanitizedUrl)
        console.log('快照目录路径:', websiteDir)
        if (fs.existsSync(websiteDir)) {
            console.log('目录存在，尝试打开')
            win?.webContents.send('error-occurred', {
                from: 'open-website-snapshot-dir',
                body: '目录存在，尝试打开'
            })
            await shell.openPath(websiteDir)
        } else {
            win?.webContents.send('error-occurred', {
                from: 'open-website-snapshot-dir',
                body: '目录不存在:' + websiteDir
            })
            console.error(`目录不存在: ${websiteDir}`)
        }
    })
}

// 删除网站的对比记录
export function handleDeleteWebsite(win: BrowserWindow | null) {
    ipcMain.handle('delete-website', (_, url: string) => {
        // 从列表中删除
        urlList = urlList.filter(item => item !== url)
        saveURLList(urlList)
        // 删除比对结果
        delete comparisonResults[url]
        saveComparisonResults(comparisonResults)
        win?.webContents.send('error-occurred', {
            from: 'delete-website',
            body: {
                deleteUrl: url,
                response: { urlList, comparisonResults }
            }
        })
        return { urlList, comparisonResults }
    })
}


// 初始化所有 IPC 处理
export function initIPCHandlers(win: BrowserWindow | null) {
    handleAddURL(win)
    handleGetURLs(win)
    handleGetResults(win)
    handleCompareURLs(win)
    handleOpenSnapshotDir(win)
    handleOpenWebsiteSnapshotDir(win)
    handleDeleteWebsite(win)
    handleGetImageData(win)
}

/**
 * 将 URL 中的特殊字符替换为下划线
 * @param url - 原始 URL 字符串
 * @returns 替换后的字符串
 */
function sanitizeUrl(url: string): string {
    // 使用正则表达式匹配所有非字母数字字符，并替换为下划线
    const sanitized = url.replace(/[^a-zA-Z0-9]/g, '_')

    // 可选：替换多个连续的下划线为单个下划线
    return sanitized
}