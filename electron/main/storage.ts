// electron/main/storage.ts

import fs from 'fs'
import path from 'path'
import { app } from 'electron'

// 定义比对结果的接口
export interface CompareResult {
    url: string
    status: 'success' | 'error'
    diffPixels?: number
    message?: string
    timestamp?: string
}

// 获取存储文件的路径
const storagePath = path.join(app.getPath('userData'), 'urls.json')
const resultsPath = path.join(app.getPath('userData'), 'results.json')

// 读取网址列表
export function loadURLList(): string[] {
    try {
        if (fs.existsSync(storagePath)) {
            const data = fs.readFileSync(storagePath, 'utf-8')
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('加载网址列表失败:', error)
    }
    return []
}

// 保存网址列表
export function saveURLList(urlList: string[]): void {
    try {
        fs.writeFileSync(storagePath, JSON.stringify(urlList, null, 2))
    } catch (error) {
        console.error('保存网址列表失败:', error)
    }
}

// 读取比对结果
export function loadComparisonResults(): Record<string, { timestamp: string, diffPixels: number }> {
    try {
        if (fs.existsSync(resultsPath)) {
            const data = fs.readFileSync(resultsPath, 'utf-8')
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('加载比对结果失败:', error)
    }
    return {}
}

// 保存比对结果
export function saveComparisonResults(comparisonResults: Record<string, { timestamp: string, diffPixels: number }>): void {
    try {
        fs.writeFileSync(resultsPath, JSON.stringify(comparisonResults, null, 2))
    } catch (error) {
        console.error('保存比对结果失败:', error)
    }
}