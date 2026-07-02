// frontend/src/pages/NotificationsPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Bell, CheckCheck, Clock, Loader2, Trash2 } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { notificationService, type NotificationItem, type NotificationRealtimeEvent } from '../services/notification.service';
import { motion, AnimatePresence } from 'framer-motion';

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
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'warning':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'evenement':
      return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
    case 'systeme':
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    case 'promotion':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    default:
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  }
};

const getNotificationLink = (notification: NotificationItem): string | null => {
  if (!notification.target_type || !notification.target_id) return null;
  switch (notification.target_type) {
    case 'workspace': return `/workspace/${notification.target_id}`;
    case 'espace': return `/espace/${notification.target_id}`;
    case 'liste': return `/liste/${notification.target_id}`;
    case 'tache': return `/tache/${notification.target_id}`;
    case 'utilisateur': return `/users/${notification.target_id}`;
    default: return null;
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadNotifications();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        loadNotifications(true);
      }
    };
    const interval = window.setInterval(refreshWhenVisible, 12000);
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return undefined;

    let retryTimeout: number | undefined;
    let closedByEffect = false;
    let socket: WebSocket | null = null;

    const connect = () => {
      socket = new WebSocket(notificationService.socketUrl());
      socket.onmessage = event => {
        try {
          const payload = JSON.parse(event.data) as NotificationRealtimeEvent;
          if (payload.event !== 'notification.created' || !payload.notification) return;
          if (filter === 'unread' && payload.notification.est_lu) return;
          setNotifications(prev => {
            if (prev.some(notification => notification.id === payload.notification?.id)) return prev;
            return [payload.notification as NotificationItem, ...prev].slice(0, 100);
          });
          setError(null);
        } catch {
          loadNotifications(true);
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
  }, [filter, loadNotifications]);

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
    <div className="h-full overflow-y-auto bg-theme-page transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-end sm:gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shadow-lg shadow-secondary/5 border border-secondary/10">
                <Bell className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-theme-main tracking-tight uppercase leading-none">Notifications</h1>
                <p className="text-sm text-theme-muted font-medium mt-2 opacity-60">
                  Suivi en temps réel de votre activité K‑Planer.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center p-1 bg-theme-surface border border-theme-border-subtle rounded-2xl shadow-theme-sm">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'all'
                ? 'bg-secondary text-white shadow-lg shadow-secondary/20'
                : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover'}`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'unread'
                ? 'bg-secondary text-white shadow-lg shadow-secondary/20'
                : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover'}`}
            >
              Non lues
            </button>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-bold text-red-500 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            {error}
          </motion.div>
        )}

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <GlassCard className="p-4 sm:p-6 border-white/5 group hover:border-white/10 transition-all">
            <p className="text-[10px] uppercase font-black text-theme-muted tracking-[0.2em]">Total reçu</p>
            <p className="text-4xl font-black text-theme-main mt-2 group-hover:scale-105 transition-transform origin-left">{notifications.length}</p>
          </GlassCard>
          <GlassCard className="p-4 sm:p-6 border-white/5 group hover:border-white/10 transition-all">
            <p className="text-[10px] uppercase font-black text-theme-muted tracking-[0.2em]">Non lues</p>
            <p className="text-4xl font-black text-secondary mt-2 group-hover:scale-105 transition-transform origin-left">{unreadCount}</p>
          </GlassCard>
          <GlassCard className="p-4 sm:p-6 flex items-center justify-between gap-4 border-white/5 group hover:border-white/10 transition-all">
            <div>
              <p className="text-[10px] uppercase font-black text-theme-muted tracking-[0.2em]">Nettoyage</p>
              <p className="text-xs text-theme-muted mt-2 font-medium">Tout marquer comme lu</p>
            </div>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0 || actionLoading === 'read-all'}
              className="h-12 w-12 rounded-xl bg-theme-surface-hover border border-theme-border-subtle flex items-center justify-center text-theme-main hover:bg-secondary hover:text-white hover:border-secondary transition-all shadow-theme-sm disabled:opacity-30 disabled:cursor-not-allowed group-hover:shadow-theme-md"
            >
              {actionLoading === 'read-all' ? <Loader2 size={20} className="animate-spin" /> : <CheckCheck size={20} />}
            </button>
          </GlassCard>
        </div>

        {/* Notifications List */}
        <GlassCard className="overflow-hidden border-white/5 !p-0">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-theme-muted">
              <Loader2 size={32} className="animate-spin mb-4 text-secondary opacity-50" />
              <p className="text-xs uppercase font-black tracking-widest opacity-60">Chargement des données...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-theme-muted">
              <div className="p-6 rounded-full bg-theme-surface-hover mb-6">
                <Archive size={40} className="opacity-20" />
              </div>
              <p className="font-black text-theme-main uppercase tracking-widest text-sm">Zone de calme</p>
              <p className="text-xs mt-2 opacity-50 max-w-[300px] text-center leading-relaxed">
                Vous n'avez aucune notification pour le moment. Tout est sous contrôle !
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {notifications.map((notification, idx) => {
                  const link = getNotificationLink(notification);
                  const isClickable = !!link;

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-4 sm:p-6 flex gap-3 sm:gap-6 transition-all group ${notification.est_lu ? 'hover:bg-white/[0.02]' : 'bg-secondary/[0.03] hover:bg-secondary/[0.05]'}`}
                    >
                      {isClickable ? (
                        <Link to={link} className="flex-1 text-left flex gap-3 sm:gap-6 transition-all group">
                          <div className={`shrink-0 mt-1 h-12 w-12 rounded-2xl border flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${notificationStyle(notification.type)}`}>
                            <Bell size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              {!notification.est_lu && <span className="h-2 w-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(255,102,0,0.5)]" />}
                              <span className={`text-[9px] px-2.5 py-1 rounded-lg border font-black uppercase tracking-widest ${notificationStyle(notification.type)}`}>
                                {notification.type}
                              </span>
                              <span className="text-[10px] font-black text-theme-muted flex items-center gap-1.5 uppercase tracking-tighter opacity-40">
                                <Clock size={12} />
                                {formatDateTime(notification.date_creation)}
                              </span>
                            </div>
                            <p className={`text-base mt-3 leading-relaxed tracking-tight ${notification.est_lu ? 'text-theme-muted font-medium' : 'text-theme-main font-bold'}`}>
                              {notification.message}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex-1 text-left flex gap-3 sm:gap-6 transition-all group">
                          <div className={`shrink-0 mt-1 h-12 w-12 rounded-2xl border flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${notificationStyle(notification.type)}`}>
                            <Bell size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              {!notification.est_lu && <span className="h-2 w-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(255,102,0,0.5)]" />}
                              <span className={`text-[9px] px-2.5 py-1 rounded-lg border font-black uppercase tracking-widest ${notificationStyle(notification.type)}`}>
                                {notification.type}
                              </span>
                              <span className="text-[10px] font-black text-theme-muted flex items-center gap-1.5 uppercase tracking-tighter opacity-40">
                                <Clock size={12} />
                                {formatDateTime(notification.date_creation)}
                              </span>
                            </div>
                            <p className={`text-base mt-3 leading-relaxed tracking-tight ${notification.est_lu ? 'text-theme-muted font-medium' : 'text-theme-main font-bold'}`}>
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Boutons d'action - toujours en dehors du lien */}
                      <div className="flex items-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.est_lu && (
                          <button
                            onClick={() => markRead(notification)}
                            disabled={actionLoading === notification.id}
                            className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                            title="Marquer comme lu"
                          >
                            <CheckCheck size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => removeNotification(notification.id)}
                          disabled={actionLoading === notification.id}
                          className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title="Supprimer"
                        >
                          {actionLoading === notification.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}