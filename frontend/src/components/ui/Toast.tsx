// src/components/ui/Toast.tsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sanitizeText } from '../../utils/sanitize';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// État global (file d'attente)
let toastIdCounter = 0;
const listeners: ((toasts: ToastMessage[]) => void)[] = [];
let toasts: ToastMessage[] = [];

// Fonction interne pour ajouter un toast
const notify = (message: string, type: ToastType = 'success', duration: number = 3000) => {
  const id = String(++toastIdCounter);
  const safeMessage = typeof message === 'string' ? sanitizeText(message) : message;
  const newToast: ToastMessage = { id, message: safeMessage, type, duration };
  toasts = [...toasts, newToast];
  listeners.forEach((fn) => fn(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((fn) => fn(toasts));
  }, duration);
};

// API publique
export const toast = {
  success: (msg: string, options?: { duration?: number }) =>
    notify(msg, 'success', options?.duration || 4000),
  error: (msg: string, options?: { duration?: number }) =>
    notify(msg, 'error', options?.duration || 5000),
  warning: (msg: string, options?: { duration?: number }) =>
    notify(msg, 'warning', options?.duration || 4000),
  info: (msg: string, options?: { duration?: number }) =>
    notify(msg, 'info', options?.duration || 4000),
};

// Conteneur à placer dans App.tsx
export const ToastContainer = () => {
  const [currentToasts, setCurrentToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (newToasts: ToastMessage[]) => setCurrentToasts([...newToasts]);
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    };
  }, []);

  const removeToast = (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((fn) => fn(toasts));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 text-white border-emerald-500/30';
      case 'error':
        return 'bg-red-600 text-white border-red-500/30';
      case 'warning':
        return 'bg-amber-500 text-white border-amber-400/30';
      case 'info':
        return 'bg-blue-600 text-white border-blue-500/30';
      default:
        return 'bg-gray-700 text-white border-gray-600/30';
    }
  };

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2 max-w-md w-full">
      <AnimatePresence>
        {currentToasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border min-w-[280px] w-full ${getStyles(t.type)}`}
          >
            <div className="p-1 rounded-full bg-white/20 flex-shrink-0">
              {getIcon(t.type)}
            </div>
            <span className="text-sm font-bold flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 hover:bg-white/20 rounded-xl transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};