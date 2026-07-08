import { useCallback, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { messagerieService } from '../../services/messagerie.service';
import { useAuth } from '../../contexts/AuthContext';

interface MessagingBellProps {
  buttonClassName?: string;
}

export default function MessagingBell({
  buttonClassName = 'relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main transition-all border border-transparent hover:border-theme-border-subtle focus:outline-none duration-300',
}: MessagingBellProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const summary = await messagerieService.getUnreadSummary();
      setUnreadCount(summary.unread_discussions_count || 0);
    } catch (error) {
      console.warn('Impossible de charger le compteur de discussions', error);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadUnreadCount, 0);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        loadUnreadCount();
      }
    };
    const interval = window.setInterval(refreshWhenVisible, 10000);
    window.addEventListener('focus', loadUnreadCount);
    window.addEventListener('online', loadUnreadCount);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(interval);
      window.removeEventListener('focus', loadUnreadCount);
      window.removeEventListener('online', loadUnreadCount);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [loadUnreadCount]);

  return (
    <Link to="/messagerie" className={buttonClassName} title="Messagerie" aria-label="Messagerie">
      <MessageCircle size={20} />
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-secondary text-white text-[9px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(255,102,0,0.4)] border border-white/20"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
