// electron/main/screenshot.ts

import fs from 'fs'
import path from 'path'
import { app, BrowserWindow, WebContents } from 'electron'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { setTimeout as wait } from 'timers/promises'

// 定义截图结果的接口
export interface ScreenshotResult {
    diffPixels: number
    timestamp: string
    diffPercentage: number
    diffImagePath?: string // 新增字段
}

// URL 转换为合法的文件夹名
export function sanitizeURL(url: string): string {
    return url.replace(/[^a-z0-9]/gi, '_').toLowerCase()
}

// 比较两张图片，并生成差异图像
export function compareImages(imgPath1: string, imgPath2: string, diffPath: string): { numDiffPixels: number, diffPercentage: number } {
    console.log('imgPath1', imgPath1)
    console.log('imgPath2', imgPath2)
    console.log('diffPath', diffPath)
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

    // 计算差异百分比
    const totalPixels = img1.width * img1.height;
    const diffPercentage = (numDiffPixels / totalPixels) * 100;

    fs.writeFileSync(diffPath, PNG.sync.write(diff))
    return { numDiffPixels, diffPercentage } // 返回差异像素和差异百分比
}

// 等待网络空闲的辅助函数
async function waitForNetworkIdle(webContents: WebContents, idleTime: number = 2000, maxInflight: number = 0): Promise<void> {
    return new Promise((resolve, reject) => {
        let inflight = 0;
        let idleTimer: NodeJS.Timeout | null = null;
        let isResolved = false;

        const onBeforeRequest = (details: any, callback: Function) => {
            inflight++;
            if (idleTimer) {
                clearTimeout(idleTimer);
                idleTimer = null;
            }
            callback({});
        };

        const onCompleted = () => {
            inflight = Math.max(inflight - 1, 0);
            checkIdle();
        };

        const onErrorOccurred = () => {
            inflight = Math.max(inflight - 1, 0);
            checkIdle();
        };

        const filter = { urls: ['*://*/*'] };

        const session = webContents.session;

        // 添加监听器
        session.webRequest.onBeforeRequest(filter, onBeforeRequest);
        session.webRequest.onCompleted(filter, onCompleted);
        session.webRequest.onErrorOccurred(filter, onErrorOccurred);

        const checkIdle = () => {
            if (inflight === maxInflight) {
                idleTimer = setTimeout(() => {
                    cleanup();
                    if (!isResolved) {
                        isResolved = true;
                        resolve();
                    }
                }, idleTime);
            }
        };

        const cleanup = () => {
            if (idleTimer) {
                clearTimeout(idleTimer);
                idleTimer = null;
            }
        };

        // 初始检查
        checkIdle();

        // 设置一个最大等待时间，防止无限等待
        const maxWait = idleTime * 5; // 例如，最多等待10秒
        setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                cleanup();
                resolve();
            }
        }, maxWait);
    });
}

// 处理单个网址，获取快照并进行比对
export async function processURL(url: string, win: BrowserWindow | null): Promise<ScreenshotResult> {
    return new Promise<ScreenshotResult>((resolve, reject) => {
        win?.webContents.send('error-occurred', {
            from: `----------快照比对开始（${url}）----------`,
            body: url
        })

        const screenshotDir = path.join(app.getPath('userData'), 'screenshots', sanitizeURL(url))
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true })
        }

        const child = new BrowserWindow({
            show: false, // 隐藏窗口
            width: 1920,
            height: 1080,
            webPreferences: {
                offscreen: true // 启用离屏渲染
            }
        })

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const currentScreenshot = path.join(screenshotDir, `${timestamp}.png`)
        const diffImagePath = path.join(screenshotDir, `${timestamp}.diff.png`)
        let diffPixels = 0
        let diffPercentage = 0; // 新增差异百分比变量

        win?.webContents.send('error-occurred', {
            from: '开始获取网站快照',
            body: currentScreenshot
        })

        // 监听 'did-finish-load' 事件
        child.webContents.on('did-finish-load', async () => {
            try {
                win?.webContents.send('error-occurred', {
                    from: 'did-finish-load 事件触发',
                    body: currentScreenshot
                })

                // 等待网络空闲
                await waitForNetworkIdle(child.webContents, 2000, 0); // 等待2秒的网络空闲

                // 捕获页面为 PNG 缓冲区
                const screenshot = await child.webContents.capturePage()
                const pngBuffer = screenshot.toPNG()
                console.log('pngBuffer', pngBuffer)
                fs.writeFileSync(currentScreenshot, pngBuffer)

                // 读取所有快照文件，排除差异图像
                const screenshotFiles = fs.readdirSync(screenshotDir).filter(file => file.endsWith('.png') && !file.endsWith('.diff.png'))
                win?.webContents.send('error-occurred', {
                    from: '读取所有快照记录成功',
                    body: screenshotFiles
                })

                if (screenshotFiles.length > 1) {
                    // 按时间戳排序，确保顺序正确
                    screenshotFiles.sort()

                    const previousScreenshot = path.join(screenshotDir, screenshotFiles[screenshotFiles.length - 2])
                    win?.webContents.send('error-occurred', {
                        from: '上一次快照',
                        body: previousScreenshot
                    })
                    win?.webContents.send('error-occurred', {
                        from: '这一次快照',
                        body: currentScreenshot
                    })
                    win?.webContents.send('error-occurred', {
                        from: '开始执行快照比对',
                        body: currentScreenshot
                    })

                    // 执行图像比较
                    const { numDiffPixels, diffPercentage: percentage } = compareImages(currentScreenshot, previousScreenshot, diffImagePath);
                    diffPixels = numDiffPixels;
                    diffPercentage = percentage; // 更新差异百分比

                    win?.webContents.send('error-occurred', {
                        from: '快照比对成功',
                        body: {
                            diffPixels,
                            diffPercentage, // 发送差异百分比
                            diffImagePath // 发送差异图像路径
                        }
                    })
                }

                win?.webContents.send('error-occurred', {
                    from: `----------快照比对结束（${url}）----------`,
                    body: currentScreenshot
                })

                resolve({ diffPixels, timestamp: new Date().toLocaleString(), diffPercentage, diffImagePath });
            } catch (error) {
                win?.webContents.send('error-occurred', {
                    from: '快照比对失败',
                    body: error
                })
                reject(error)
            } finally {
                // 清理：关闭子窗口
                if (child && !child.isDestroyed()) {
                    child.close()
                }
            }
        })

        child.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            win?.webContents.send('error-occurred', {
                from: '页面加载失败',
                body: { errorCode, errorDescription, validatedURL }
            })
            reject(new Error(`Failed to load URL: ${validatedURL}, Error: ${errorDescription} (${errorCode})`))
            if (child && !child.isDestroyed()) {
                child.close()
            }
        })

        child.webContents.on('destroyed', () => { // 使用 'crashed' 事件替代 'destroyed'
            win?.webContents.send('error-occurred', {
                from: '页面崩溃',
                body: url
            })
            reject(new Error('页面崩溃'))
            if (child && !child.isDestroyed()) {
                child.close()
            }
        })

        // 加载 URL
        child.loadURL(url).catch((error) => {
            win?.webContents.send('error-occurred', {
                from: '浏览器启动失败',
                body: error
            })
            reject(error)
            if (child && !child.isDestroyed()) {
                child.close()
            }
        })
    })
}
// 定义超时处理函数
function timeoutHandler(timeout: number): Promise<void> {
    return wait(timeout).then(() => {
        throw new Error(`超时：处理时间超过 ${timeout / 1000} 秒`)
    })
}


// 修改 processURL 函数以支持超时处理
export async function processURLWithTimeout(url: string, timeout: number = 30000, win: BrowserWindow | null): Promise<ScreenshotResult> {
    return Promise.race([
        processURL(url, win),
        timeoutHandler(timeout).then(() => Promise.reject(new Error('超时')))
    ])
}