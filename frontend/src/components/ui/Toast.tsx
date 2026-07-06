// src/components/ui/Toast.tsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// État global (file d'attente)
let toastIdCounter = 0;
const listeners: ((toasts: ToastMessage[]) => void)[] = [];
let toasts: ToastMessage[] = [];

// Fonction interne pour ajouter un toast
const notify = (message: string, type: ToastType = 'success') => {
  const id = String(++toastIdCounter);
  const newToast: ToastMessage = { id, message, type };
  toasts = [...toasts, newToast];
  listeners.forEach((fn) => fn(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((fn) => fn(toasts));
  }, 4000);
};

// API publique
export const toast = {
  success: (msg: string) => notify(msg, 'success'),
  error: (msg: string) => notify(msg, 'error'),
  info: (msg: string) => notify(msg, 'info'),
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

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
      <AnimatePresence>
        {currentToasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border min-w-[280px] ${
              t.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500/30'
                : t.type === 'error'
                ? 'bg-red-600 text-white border-red-500/30'
                : 'bg-amber-500 text-white border-amber-400/30'
            }`}
          >
            <div className="p-1 rounded-full bg-white/20">
              {t.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {t.type === 'error' && <AlertTriangle className="h-4 w-4" />}
              {t.type === 'info' && <Info className="h-4 w-4" />}
            </div>
            <span className="text-sm font-bold flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 hover:bg-white/20 rounded-xl transition-colors"
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