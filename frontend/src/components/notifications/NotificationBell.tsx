import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService } from '../../services/notification.service';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationBellProps {
  buttonClassName?: string;
}

export default function NotificationBell({
  buttonClassName = 'relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main transition-all border border-transparent hover:border-theme-border-subtle focus:outline-none transition-all duration-300',
}: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      const countData = await notificationService.unreadCount();
      setUnreadCount(countData.count || 0);
    } catch (error) {
      console.warn('Impossible de charger le compteur de notifications', error);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, 30000);
    return () => window.clearInterval(interval);
  }, [loadUnreadCount]);

  return (
    <Link to="/notifications" className={buttonClassName} title="Notifications" aria-label="Notifications">
      <Bell size={20} />
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
