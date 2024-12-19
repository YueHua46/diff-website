// src/App.tsx

import React, { useState, useEffect } from 'react'
import Toast from './components/Toast';
import DiffImagePreview from './components/DiffImagePreview/DiffImagePreview';
import * as _ from 'lodash'

interface ScreenshotResult {
  timestamp: string;
  diffPixels: number;
  diffPercentage: number;
  diffImagePath?: string;
}

interface CompareResult {
  url: string;
  status: 'success' | 'error';
  diffPixels?: number;
  diffPercentage?: number;
  message?: string;
  timestamp?: string;
  diffImagePath?: string;
}

function App() {
  const [urlInput, setUrlInput] = useState('')
  const [urlList, setUrlList] = useState<string[]>([])
  const [results, setResults] = useState<Record<string, ScreenshotResult>>({})
  const [isComparing, setIsComparing] = useState(false)
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success' as const
  });

  // 新增状态，用于控制预览窗口
  const [preview, setPreview] = useState<{ filePath: string, position: { x: number, y: number } } | null>(null)

  useEffect(() => {
    // 获取初始网址列表
    window.electronAPI.getURLs().then(setUrlList)
    // 获取初始比对结果
    window.electronAPI.getResults().then((result: any) => {
      setResults(result)
    })

    // 监听比对结果
    window.electronAPI.onCompareResult((event, data: CompareResult[]) => {
      const newResults: Record<string, ScreenshotResult> = { ...results }
      data.forEach(result => {
        if (result.status === 'success') {
          newResults[result.url] = {
            timestamp: result.timestamp || '',
            diffPixels: result.diffPixels || 0,
            diffPercentage: result.diffPercentage || 0,
            diffImagePath: result.diffImagePath || '' // 接收差异图像路径
          }
        } else {
          newResults[result.url] = {
            timestamp: result.timestamp || '',
            diffPixels: -1,
            diffPercentage: result?.diffPercentage || 0,
            diffImagePath: '' // 错误情况下不设置差异图像路径
          }
        }
      })
      setResults(newResults)
      setIsComparing(false)

      // 添加完成提示
      setToast({
        show: true,
        message: '网页比对已完成',
        type: 'success'
      });
    })

    // 监听错误事件
    const handleErrorOccurred = (event: any, data: any) => {
      console.log('event.name', data.from);
      console.log('event.data', data.body);
    };

    window.electronAPI.onErrorOccurred(handleErrorOccurred);

    // 清理函数，组件卸载时移除事件监听器
    return () => {
      window.electronAPI.offErrorOccurred(handleErrorOccurred);
    };
  }, [])

  // 处理添加网址
  const handleAddURL = () => {
    if (urlInput.trim() && isValidURL(urlInput.trim())) {
      window.electronAPI.addURL(urlInput.trim())
      setUrlList([...urlList, urlInput.trim()])
      setUrlInput('')
    } else {
      alert('请输入有效的网址！')
    }
  }

  // 处理开始比对
  const handleCompare = () => {
    if (urlList.length === 0) {
      alert('请先添加至少一个网址！')
      return
    }
    setIsComparing(true)
    window.electronAPI.compareURLs(urlList)
  }

  // 处理打开快照目录
  const handleOpenSnapshotDir = async () => {
    try {
      await window.electronAPI.openSnapshotDir()
    } catch (error) {
      alert('无法打开快照目录')
    }
  }

  // 验证 URL 格式
  const isValidURL = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch (_) {
      return false
    }
  }

  // 根据差异像素点数量返回对应的颜色
  const getStatusColor = (diffPixels: number): string => {
    if (diffPixels === -1) return 'text-red-500'
    if (diffPixels === 0) return 'text-green-500'
    if (diffPixels <= 100) return 'text-yellow-500' // 根据需求整阈值
    return 'text-red-500'
  }

  // 添加新的处理函数
  const handleOpenWebsite = (url: string) => {
    window.open(url, '_blank')
  }

  const handleOpenWebsiteSnapshot = async (url: string) => {
    try {
      await window.electronAPI.openWebsiteSnapShotDir(url)
    } catch (error) {
      console.error('打开快照目录失败:', error)
      alert('无法打开快照目录')
    }
  }

  const handleDeleteWebsite = async (url: string) => {
    if (confirm(`确定要删除 ${url} 的所有记录吗？`)) {
      try {
        const { urlList: newUrlList, comparisonResults: newResults } = await window.electronAPI.deleteWebsite(url)
        setUrlList(newUrlList)
        setResults(newResults)
      } catch (error) {
        alert('删除失败')
      }
    }
  }

  const handleSettings = () => {
    console.log('open settings')
  }

  const handleHideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // 处理鼠标悬停事件，显示预览窗口，并加防抖处理
  const handleImagePreview = _.debounce((e: React.MouseEvent, filePath: string) => {
    console.log('filePath', filePath)
    const { clientX, clientY } = e
    setPreview({ filePath, position: { x: clientX, y: clientY } })
  }, 300)

  // 处理鼠标移出事件，关闭预览窗口
  const handlePreviewOut = () => {
    setPreview(null)
  }

  return (
    <div className="min-h-screen box-border min-w-screen bg-gray-100 p-2 sm:p-4 md:p-6">
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onHide={handleHideToast}
        position="top-center"
      />
      <div className="relative w-full box-border mx-auto bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-8">网址快照对比工具</h1>

        {/* 输入框部分 */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
          <input
            type="text"
            placeholder="请输入网址例如：https://example.com"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-4 py-2 border-[1.5px] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 text-black"
          />
          <button
            onClick={handleAddURL}
            className="w-full md:w-auto px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-sm"
          >
            添加网址
          </button>
        </div>

        {/* 网址列表部分 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">网址列表</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 relative">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">网址</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">最新比对时间</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">差异像素点</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">差异百分比</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">查看差异化（红色代表差异像素点，如无红点则无差异）</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {urlList.map((url, index) => {
                  const result = results[url]
                  const diffPixels = result ? result.diffPixels : null
                  const diffPercentage = result ? result.diffPercentage : null
                  const timestamp = result ? result.timestamp : '未比对'
                  const diffImagePath = result?.diffImagePath || null
                  let status = '未比对'
                  let color = 'text-gray-500'

                  if (diffPixels !== null) {
                    if (diffPixels === -1) {
                      status = '错误'
                      color = 'text-red-600'
                    } else if (diffPixels === 0) {
                      status = `${diffPercentage?.toFixed(2)}% 无差异`
                      color = 'text-green-600'
                    } else if (diffPixels <= 100) {
                      status = `${diffPercentage?.toFixed(2)}% 有差异 (${diffPixels} 像素)`
                      color = 'text-yellow-600'
                    } else {
                      status = `${diffPercentage?.toFixed(2)}% 有显著差异 (${diffPixels} 像素)`
                      color = 'text-red-600'
                    }
                  }

                  return (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 relative"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        <span
                          className="cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => handleOpenWebsite(url)}
                        >
                          {url}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{timestamp}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600 whitespace-nowrap">
                        {diffPixels !== null && diffPixels !== -1 ? diffPixels : '-'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600 whitespace-nowrap">
                        {diffPercentage !== null && diffPercentage !== -1 ? `${diffPercentage.toFixed(2)}%` : '-'}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm whitespace-nowrap ${color}`}>
                        {status}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleOpenWebsiteSnapshot(url)}
                            className="text-white bg-gray-500 hover:bg-gray-600 transition-all px-4 py-2 rounded-lg"
                          >
                            查看快照
                          </button>
                          <button
                            onClick={() => handleDeleteWebsite(url)}
                            className="text-white bg-red-500 hover:bg-red-600 transition-all px-4 py-2 rounded-lg"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                      <td className='px-6 py-4 text-sm whitespace-nowrap text-center'>
                        <button
                          onClick={(e) => diffImagePath && handleImagePreview(e, diffImagePath)}
                          className="text-white bg-green-5 hover:bg-green-6 transition-all px-4 py-2 rounded-lg"
                        >
                          差异化
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 比对按钮和打开目录按钮 */}
        <div className="flex flex-col md:flex-row justify-center gap-4 mb-8">
          <button
            onClick={handleCompare}
            disabled={isComparing}
            className={`px-8 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center
              ${isComparing
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-green-600 transition-colors duration-200'}`}
          >
            {isComparing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                比对中...
              </>
            ) : '开始比对'}
          </button>
          <button
            onClick={handleOpenSnapshotDir}
            className="px-8 py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-600 transition-colors duration-200"
          >
            打开快照目录
          </button>
          <button
            onClick={handleSettings}
            className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-600 transition-colors duration-200"
          >
            设置
          </button>
        </div>

        {/* 比对结果部分 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">比对结果</h2>
          {Object.keys(results).length > 0 ? (
            <div className="space-y-3">
              {urlList.map((url, index) => {
                const result = results[url]
                if (!result) return null
                const { timestamp, diffPixels, diffPercentage, diffImagePath } = result
                let statusText = ''
                let bgColor = ''

                if (diffPixels === -1) {
                  statusText = '错误'
                  bgColor = 'bg-red-50 border-red-200'
                } else if (diffPixels === 0) {
                  statusText = '无差异'
                  bgColor = 'bg-green-50 border-green-200'
                } else if (diffPixels <= 100) {
                  statusText = `有差异 (${diffPixels} 像素)`
                  bgColor = 'bg-yellow-50 border-yellow-200'
                } else {
                  statusText = `有显著差异 (${diffPixels} 像素)`
                  bgColor = 'bg-red-50 border-red-200'
                }

                return (
                  <div key={index}
                    className={`p-4 rounded-lg border ${bgColor} shadow-sm`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <span className="font-medium text-gray-800">{url}</span>
                      <span className="text-sm text-gray-600">
                        {statusText} · {timestamp}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">暂无比对结果</p>
          )}
        </div>
      </div>

      {/* 预览窗口 */}
      {preview && (
        <DiffImagePreview
          filePath={preview.filePath}
          position={preview.position}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}

export default App