// electron/main/ipcHandlers.ts

import { ipcMain, BrowserWindow, shell } from 'electron'
import { loadURLList, saveURLList, loadComparisonResults, saveComparisonResults, CompareResult } from './storage'
import { processURL, ScreenshotResult } from './screenshot'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

// 存储网址列表
let urlList: string[] = loadURLList()
// 存储比对结果
let comparisonResults: Record<string, { timestamp: string, diffPixels: number }> = loadComparisonResults()

// 添加网址的 IPC 处理
export function handleAddURL() {
    ipcMain.on('add-url', (_, url: string) => {
        if (url && !urlList.includes(url)) {
            urlList.push(url)
            saveURLList(urlList)
            console.log(`添加网址: ${url}`)
        }
    })
}

// 获取网址列表的 IPC 处理
export function handleGetURLs() {
    ipcMain.handle('get-urls', () => {
        return urlList
    })
}

// 获取比对结果的 IPC 处理
export function handleGetResults() {
    ipcMain.handle('get-results', () => {
        return comparisonResults
    })
}

// 比对网址的 IPC 处理
export function handleCompareURLs(win: BrowserWindow | null) {
    ipcMain.handle('compare-urls', async (_, urls: string[]) => {
        const results: CompareResult[] = [];
        for (const url of urls) {
            try {
                const result: ScreenshotResult = await processURL(url);
                results.push({ url, status: 'success', diffPixels: result.diffPixels, timestamp: result.timestamp });
                comparisonResults[url] = { timestamp: result.timestamp, diffPixels: result.diffPixels };
            } catch (error: any) {
                console.error(`处理 ${url} 时发生错误:`, error); // 添加日志
                results.push({ url, status: 'error', message: error.message, timestamp: new Date().toLocaleString() });
                comparisonResults[url] = { timestamp: new Date().toLocaleString(), diffPixels: -1 };
            }
        }
        saveComparisonResults(comparisonResults);
        win?.webContents.send('compare-result', results);
        return results;
    });
}

// 打开快照目录的 IPC 处理
export function handleOpenSnapshotDir() {
    ipcMain.handle('open-snapshot-dir', () => {
        const snapshotDir = path.join(app.getPath('userData'), 'screenshots')
        shell.openPath(snapshotDir)
    })
}

// 打开特定网站的快照目录
export function handleOpenWebsiteSnapshotDir() {
    ipcMain.handle('open-website-snapshot-dir', async (_, url: string) => {
        console.log('收到打开快照目录请求:', url)
        // 将特殊字符替换为下划线
        const sanitizedUrl = sanitizeUrl(url)
        console.log('sanitizedUrl', sanitizedUrl)
        const websiteDir = path.join(app.getPath('userData'), 'screenshots', sanitizedUrl)
        console.log('快照目录路径:', websiteDir)
        if (fs.existsSync(websiteDir)) {
            console.log('目录存在，尝试打开')
            await shell.openPath(websiteDir)
        } else {
            console.error(`目录不存在: ${websiteDir}`)
        }
    })
}

// 删除网站的对比记录
export function handleDeleteWebsite() {
    ipcMain.handle('delete-website', (_, url: string) => {
        // 从列表中删除
        urlList = urlList.filter(item => item !== url)
        saveURLList(urlList)
        // 删除比对结果
        delete comparisonResults[url]
        saveComparisonResults(comparisonResults)
        return { urlList, comparisonResults }
    })
}

// 初始化所有 IPC 处理
export function initIPCHandlers(win: BrowserWindow | null) {
    handleAddURL()
    handleGetURLs()
    handleGetResults()
    handleCompareURLs(win)
    handleOpenSnapshotDir()
    handleOpenWebsiteSnapshotDir()
    handleDeleteWebsite()
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