import { apiFetch } from './api';

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
}

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

export const notificationService = {
  list: (params: { unread_only?: boolean; include_global?: boolean; limit?: number } = {}) =>
    apiFetch(NOTIFICATION_BASE_URL, withParams('/notifications', params)) as Promise<NotificationItem[]>,

  unreadCount: () =>
    apiFetch(NOTIFICATION_BASE_URL, '/notifications/unread-count') as Promise<{ count: number }>,

  markRead: (notificationId: string) =>
    apiFetch(NOTIFICATION_BASE_URL, `/notifications/${notificationId}/read`, { method: 'PATCH' }) as Promise<NotificationItem>,

  markAllRead: () =>
    apiFetch(NOTIFICATION_BASE_URL, '/notifications/read-all', { method: 'PATCH' }) as Promise<{ updated: number }>,

  delete: (notificationId: string) =>
    apiFetch(NOTIFICATION_BASE_URL, `/notifications/${notificationId}`, { method: 'DELETE' }),
};
