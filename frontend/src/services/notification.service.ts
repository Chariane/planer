import { apiFetch, createAuthenticatedWebSocket } from './api';

export const NOTIFICATION_BASE_URL = import.meta.env.VITE_NOTIFICATION_URL || 'http://localhost:8005';

export interface NotificationItem {
  id: string;
  type: 'info' | 'alerte' | 'warning' | 'promotion' | 'evenement' | 'systeme';
  message: string;
  est_lu: boolean;
  est_globale: boolean;
  date_creation?: string | null;
  date_modif?: string | null;
  date_lecture?: string | null;
  id_utilisateur?: string | null;
  target_type?: string | null;
  target_id?: string | null;
}

export interface NotificationRealtimeEvent {
  event: 'connected' | 'notification.created';
  notification?: NotificationItem;
}

const parseTargetFromMessage = (message: string): { message: string; target_type?: string; target_id?: string } => {
  const match = message.match(/^\[\[([a-zA-Z]+):([a-zA-Z0-9_-]+)\]\]\s*/);
  if (match) {
    return {
      message: message.slice(match[0].length),
      target_type: match[1],
      target_id: match[2],
    };
  }
  return { message };
};

const transformNotification = (raw: any): NotificationItem => {
  const parsed = parseTargetFromMessage(raw.message || '');
  return {
    ...raw,
    message: parsed.message,
    target_type: parsed.target_type || null,
    target_id: parsed.target_id || null,
  };
};

const withParams = (path: string, params: Record<string, string | number | boolean | null | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

const wsBaseUrl = () => NOTIFICATION_BASE_URL.replace(/^http/, 'ws');

export const notificationService = {
  list: async (params: { unread_only?: boolean; include_global?: boolean; limit?: number } = {}) => {
    const raw = await apiFetch(NOTIFICATION_BASE_URL, withParams('/notifications', params)) as any[];
    return raw.map(transformNotification);
  },

  unreadCount: () =>
    apiFetch(NOTIFICATION_BASE_URL, '/notifications/unread-count') as Promise<{ count: number }>,

  markRead: async (notificationId: string) => {
    const raw = await apiFetch(NOTIFICATION_BASE_URL, `/notifications/${notificationId}/read`, { method: 'PATCH' });
    return transformNotification(raw);
  },

  markAllRead: () =>
    apiFetch(NOTIFICATION_BASE_URL, '/notifications/read-all', { method: 'PATCH' }) as Promise<{ updated: number }>,

  delete: (notificationId: string) =>
    apiFetch(NOTIFICATION_BASE_URL, `/notifications/${notificationId}`, { method: 'DELETE' }),

  socketUrl: () => {
    return `${wsBaseUrl()}/notifications/ws`;
  },

  connectSocket: () => createAuthenticatedWebSocket(`${wsBaseUrl()}/notifications/ws`),
};
