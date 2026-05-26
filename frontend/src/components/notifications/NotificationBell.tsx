import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService } from '../../services/notification.service';

interface NotificationBellProps {
  buttonClassName?: string;
}

export default function NotificationBell({
  buttonClassName = 'relative inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30',
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
      <Bell className="h-5 w-5 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
