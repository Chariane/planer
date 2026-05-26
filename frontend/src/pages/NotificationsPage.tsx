import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Bell, CheckCheck, Clock, Filter, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { notificationService, type NotificationItem } from '../services/notification.service';

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Date inconnue';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const notificationStyle = (type: NotificationItem['type']) => {
  switch (type) {
    case 'alerte':
      return 'bg-red-50 text-red-700 border-red-100';
    case 'warning':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'evenement':
      return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    case 'systeme':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'promotion':
      return 'bg-purple-50 text-purple-700 border-purple-100';
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await notificationService.list({
        limit: 100,
        unread_only: filter === 'unread',
      });
      setNotifications(items);
    } catch (err) {
      console.warn('Impossible de charger les notifications', err);
      setNotifications([]);
      setError("Impossible de charger vos notifications pour le moment.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.est_lu).length,
    [notifications],
  );

  const markRead = async (notification: NotificationItem) => {
    if (notification.est_lu) return;
    setActionLoading(notification.id);
    try {
      const updated = await notificationService.markRead(notification.id);
      setNotifications(prev => prev.map(item => item.id === updated.id ? updated : item));
      setError(null);
    } catch (err) {
      console.warn('Impossible de marquer la notification comme lue', err);
      setError("Impossible de marquer cette notification comme lue.");
    } finally {
      setActionLoading(null);
    }
  };

  const markAllRead = async () => {
    setActionLoading('read-all');
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(item => ({ ...item, est_lu: true })));
      setError(null);
    } catch (err) {
      console.warn('Impossible de marquer toutes les notifications comme lues', err);
      setError("Impossible de marquer toutes les notifications comme lues.");
    } finally {
      setActionLoading(null);
    }
  };

  const removeNotification = async (notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await notificationService.delete(notificationId);
      setNotifications(prev => prev.filter(item => item.id !== notificationId));
      setError(null);
    } catch (err) {
      console.warn('Impossible de supprimer la notification', err);
      setError("Impossible de supprimer cette notification.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-sm text-gray-500">
                  Suivez les rapports, demandes, tâches assignées et événements importants.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              onClick={() => setFilter('all')}
            >
              <Filter className="h-4 w-4 mr-2" />
              Toutes
            </Button>
            <Button
              variant={filter === 'unread' ? 'primary' : 'outline'}
              onClick={() => setFilter('unread')}
            >
              Non lues
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-4">
            <p className="text-xs uppercase font-bold text-gray-400">Total affiché</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{notifications.length}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs uppercase font-bold text-gray-400">Non lues</p>
            <p className="text-3xl font-bold text-red-500 mt-1">{unreadCount}</p>
          </GlassCard>
          <GlassCard className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase font-bold text-gray-400">Action rapide</p>
              <p className="text-sm text-gray-500 mt-1">Nettoyer votre centre de suivi.</p>
            </div>
            <Button
              variant="outline"
              onClick={markAllRead}
              disabled={unreadCount === 0 || actionLoading === 'read-all'}
            >
              {actionLoading === 'read-all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            </Button>
          </GlassCard>
        </div>

        <GlassCard className="overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Chargement des notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <Archive className="h-10 w-10 mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">Aucune notification</p>
              <p className="text-sm mt-1">Quand quelque chose demande votre attention, cela apparaîtra ici.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 sm:p-5 flex gap-4 transition ${notification.est_lu ? 'bg-white' : 'bg-blue-50/50'}`}
                >
                  <button
                    onClick={() => markRead(notification)}
                    className="flex-1 text-left flex gap-4"
                  >
                    <div className={`mt-1 h-10 w-10 rounded-xl border flex items-center justify-center ${notificationStyle(notification.type)}`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {!notification.est_lu && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-black ${notificationStyle(notification.type)}`}>
                          {notification.type}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDateTime(notification.date_creation)}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-gray-800 mt-2 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-start gap-1">
                    {!notification.est_lu && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markRead(notification)}
                        disabled={actionLoading === notification.id}
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeNotification(notification.id)}
                      disabled={actionLoading === notification.id}
                      className="text-red-500 hover:bg-red-50"
                    >
                      {actionLoading === notification.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
