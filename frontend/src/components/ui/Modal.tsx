import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { sanitizeText } from '../../utils/sanitize';
import { cn } from '../../lib/utils';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn('flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-2xl bg-theme-surface shadow-2xl border border-theme-border-subtle transition-all duration-300', sizes[size])}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-theme-border-subtle px-4 py-3 sm:px-6 sm:py-4">
                <h3 className="text-base sm:text-lg font-bold text-theme-main tracking-tight">{sanitizeText(title)}</h3>
                <button onClick={onClose} className="rounded-full p-1.5 text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main transition-colors"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return modalContent;

  return createPortal(modalContent, document.body);
}
