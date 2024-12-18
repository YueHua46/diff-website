// electron/main/screenshot.ts

import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

// 定义截图结果的接口
export interface ScreenshotResult {
    diffPixels: number
    timestamp: string
}

// URL 转换为合法的文件夹名
export function sanitizeURL(url: string): string {
    return url.replace(/[^a-z0-9]/gi, '_').toLowerCase()
}

// 比较两张图片，并生成差异图像
export function compareImages(imgPath1: string, imgPath2: string, diffPath: string): number {
    const img1 = PNG.sync.read(fs.readFileSync(imgPath1))
    const img2 = PNG.sync.read(fs.readFileSync(imgPath2))

    if (img1.width !== img2.width || img1.height !== img2.height) {
        throw new Error('图片尺寸不一致！')
    }

    const diff = new PNG({ width: img1.width, height: img1.height })
    const numDiffPixels = pixelmatch(
        img1.data,
        img2.data,
        diff.data,
        img1.width,
        img1.height,
        { threshold: 0.1 }
    )

    fs.writeFileSync(diffPath, PNG.sync.write(diff))
    return numDiffPixels
}

// 处理单个网址，获取快照并进行比对
export async function processURL(url: string): Promise<ScreenshotResult> {
    const screenshotDir = path.join(app.getPath('userData'), 'screenshots', sanitizeURL(url))
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true })
    }

    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    await page.goto(url, { waitUntil: 'networkidle2' })
    await page.setViewport({ width: 1920, height: 1080 })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const currentScreenshot = path.join(screenshotDir, `${timestamp}.png`)
    await page.screenshot({ path: currentScreenshot })

    let diffPixels = 0
    const screenshotFiles = fs.readdirSync(screenshotDir).filter(file => file.endsWith('.png') && !file.endsWith('.diff.png'))

    if (screenshotFiles.length > 1) {
        const previousScreenshot = path.join(screenshotDir, screenshotFiles[screenshotFiles.length - 2])
        diffPixels = compareImages(currentScreenshot, previousScreenshot, path.join(screenshotDir, `${timestamp}.diff.png`))
    }

    await browser.close()
    return { diffPixels, timestamp: new Date().toLocaleString() }
}