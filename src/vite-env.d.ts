/// <reference types="vite/client" />

interface CompareResult {
  url: string
  status: 'success' | 'error'
  diffPixels?: number
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
  getURLs: () => Promise<string[]>
  getResults: () => Promise<Record<string, { timestamp: string, diffPixels: number }>>
  compareURLs: (urls: string[]) => Promise<CompareResult[]>
  onCompareResult: (callback: (event: any, data: CompareResult[]) => void) => void
  openSnapshotDir: () => Promise<void> // 新增
  openWebsiteSnapShotDir: (url: string) => Promise<void> // 参数类型补充
  deleteWebsite: (url: string) => Promise<{ urlList: string[], comparisonResults: Record<string, { timestamp: string, diffPixels: number }> }> // 结果类型补充
}

interface Window {
  electronAPI: ElectronAPI
  ipcRenderer: IpcRenderer // 将 ipcRenderer 注入到 window 中
}