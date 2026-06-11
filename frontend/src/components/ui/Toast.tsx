import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const iconMap = {
        success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        error: <AlertTriangle className="h-5 w-5 text-rose-500" />,
        info: <Info className="h-5 w-5 text-blue-500" />
    };

    const bgMap = {
        success: 'bg-emerald-500/10 border-emerald-500/20',
        error: 'bg-rose-500/10 border-rose-500/20',
        info: 'bg-blue-500/10 border-blue-500/20'
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 px-6 py-4 rounded-2xl border shadow-premium-lg backdrop-blur-xl ${bgMap[type]}`}
            >
                {iconMap[type]}
                <span className="text-sm font-bold text-theme-main tracking-tight">{message}</span>
                <button
                    onClick={onClose}
                    className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <X className="h-4 w-4 text-theme-muted" />
                </button>
            </motion.div>
        </AnimatePresence>
    );
};
