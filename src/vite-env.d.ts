/// <reference types="vite/client" />

interface CompareResult {
  url: string
  status: 'success' | 'error'
  diffPixels?: number
  diffPercentage?: number
  message?: string
  timestamp?: string
}

interface IpcRenderer {
  on(channel: string, listener: (...args: any[]) => void): void
  off(channel: string, listener: (...args: any[]) => void): void
  send(channel: string, ...args: any[]): void
  invoke(channel: string, ...args: any[]): Promise<any>
}

interface ElectronAPI {
  addURL: (url: string) => void
  onErrorOccurred: (cb: (event: any, data: { from: string, body: any }) => void) => IpcRenderer
  offErrorOccurred: (cb: any) => void
  getURLs: () => Promise<string[]>
  getResults: () => Promise<Record<string, { timestamp: string, diffPixels: number, diffPercentage: number }>>
  compareURLs: (urls: string[]) => Promise<CompareResult[]>
  onCompareResult: (callback: (event: any, data: CompareResult[]) => void) => void
  openSnapshotDir: () => Promise<void> // 新增
  openWebsiteSnapShotDir: (url: string) => Promise<void> // 参数类型补充
  deleteWebsite: (url: string) => Promise<{ urlList: string[], comparisonResults: Record<string, { timestamp: string, diffPixels: number, diffPercentage: number }> }> // 结果类型补充

  getImageData: (filePath: string) => Promise<string>
}

interface Window {
  electronAPI: ElectronAPI
  ipcRenderer: IpcRenderer // 将 ipcRenderer 注入到 window 中
}