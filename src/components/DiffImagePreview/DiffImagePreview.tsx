// src/components/DiffImagePreview/DiffImagePreview.tsx

import React, { useEffect, useState } from 'react'

interface DiffImagePreviewProps {
    filePath: string
    position: { x: number, y: number }
    onClose: () => void
}

const DiffImagePreview: React.FC<DiffImagePreviewProps> = ({ filePath, position, onClose }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        window.electronAPI.getImageData(filePath)
            .then(dataUrl => {
                if (isMounted && dataUrl) {
                    setImageSrc(dataUrl)
                }
            })
            .catch(err => {
                console.error('Failed to load image data:', err)
            })
        return () => { isMounted = false }
    }, [filePath])

    // 处理按下 Esc 键关闭预览
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose])

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-slate-600 bg-opacity-50 z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-lg p-4 relative animate-fadeIn"
                onClick={(e) => e.stopPropagation()} // 防止点击内容区域触发关闭
                style={{ maxWidth: '90%', maxHeight: '90%' }}
            >
                <button
                    className="absolute top-2 right-2 text-gray-100 hover:text-gray-200"
                    onClick={onClose}
                >
                    ×
                </button>
                {imageSrc ? (
                    <img src={imageSrc} alt="Diff Preview" className="max-w-full max-h-full" />
                ) : (
                    <div className="w-64 h-64 flex items-center justify-center bg-gray-200">
                        <span>加载中...</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DiffImagePreview