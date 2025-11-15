
import React, { useEffect, useState } from 'react';
import { ToastMessage } from '../types';

const Toast: React.FC<{ message: ToastMessage; onRemove: (id: number) => void }> = ({ message, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            const removeTimer = setTimeout(() => onRemove(message.id), 300);
            return () => clearTimeout(removeTimer);
        }, 4700); 

        return () => clearTimeout(timer);
    }, [message.id, onRemove]);

    const handleRemove = () => {
        setIsExiting(true);
        setTimeout(() => onRemove(message.id), 300);
    };

    const typeClasses = {
        success: 'bg-emerald-900/80 border-emerald-500/50',
        error: 'bg-red-900/80 border-red-500/50',
        info: 'bg-cyan-900/80 border-cyan-500/50',
    };
    
    const Icon = () => {
        switch (message.type) {
            case 'success':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'error':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'info':
                 return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            default:
                return null;
        }
    };


    return (
        <div className={`toast-message ${isExiting ? 'animate-toast-exit' : 'animate-toast-enter'} ${typeClasses[message.type]} text-white p-4 rounded-lg shadow-2xl flex items-start gap-4 border backdrop-blur-sm`}>
            <div className="flex-shrink-0 pt-0.5"><Icon/></div>
            <p className="text-sm font-medium flex-grow">{message.message}</p>
            <button onClick={handleRemove} className="flex-shrink-0 text-white/70 hover:text-white/100 transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: number) => void }> = ({ toasts, removeToast }) => {
    return (
        <>
        <div className="fixed bottom-5 right-5 z-50 space-y-3 w-80">
            {toasts.map(toast => (
                <Toast key={toast.id} message={toast} onRemove={removeToast} />
            ))}
        </div>
        <style>{`
            @keyframes toast-enter {
                from { opacity: 0; transform: translateX(100%); }
                to { opacity: 1; transform: translateX(0); }
            }
            .animate-toast-enter {
                animation: toast-enter 0.3s ease-out forwards;
            }
            @keyframes toast-exit {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(100%); }
            }
            .animate-toast-exit {
                animation: toast-exit 0.3s ease-in forwards;
            }
        `}</style>
        </>
    );
};