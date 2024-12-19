import React, { useEffect, useState } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    show: boolean;
    onHide: () => void;
    position?: 'top-center' | 'bottom-left' | 'top-right';
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', show, onHide, position = 'top-center' }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onHide, 300);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onHide]);

    if (!show) return null;

    const bgColorClass = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    }[type];

    const positionClass = {
        'top-center': 'top-4 left-1/2 -translate-x-1/2',
        'bottom-left': 'bottom-4 left-4',
        'top-right': 'top-4 right-4',
    }[position];

    const iconMap = {
        success: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };

    return (
        <div className={`fixed ${positionClass} z-50 ${isVisible ? 'animate-fade-in' : 'animate-fade-out'}`}>
            <div className={`${bgColorClass} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-2`}>
                {iconMap[type]}
                <span>{message}</span>
            </div>
        </div>
    );
};

export default Toast; 