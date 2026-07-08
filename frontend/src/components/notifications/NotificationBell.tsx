import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService, type NotificationRealtimeEvent } from '../../services/notification.service';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationBellProps {
  buttonClassName?: string;
}

export default function NotificationBell({
  buttonClassName = 'relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main transition-all border border-transparent hover:border-theme-border-subtle focus:outline-none transition-all duration-300',
}: NotificationBellProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!user) {
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

  useEffect(() => {
    if (!user) return undefined;

    let retryTimeout: number | undefined;
    let closedByEffect = false;
    let socket: WebSocket | null = null;

    const connect = () => {
      socket = new WebSocket(notificationService.socketUrl());
      socket.onmessage = event => {
        try {
          const payload = JSON.parse(event.data) as NotificationRealtimeEvent;
          if (payload.event === 'notification.created' && payload.notification && !payload.notification.est_lu) {
            setUnreadCount(current => current + 1);
            loadUnreadCount();
          }
        } catch {
          loadUnreadCount();
        }
      };
      socket.onclose = () => {
        if (!closedByEffect) {
          retryTimeout = window.setTimeout(connect, 3000);
        }
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      closedByEffect = true;
      if (retryTimeout) window.clearTimeout(retryTimeout);
      socket?.close();
    };
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
