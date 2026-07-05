// src/store/api/notificationApi.ts
import { baseApi } from './baseApi';

// ============================================================================
// TYPES - Compatibles avec votre service existant
// ============================================================================

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

export interface UnreadCountResponse {
  count: number;
}

// ============================================================================
// API RTK Query
// ============================================================================

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================================================
    // QUERIES
    // ==========================================================================

    // Récupérer les notifications de l'utilisateur
    getNotifications: builder.query<
      NotificationItem[],
      { unread_only?: boolean; include_global?: boolean; limit?: number }
    >({
      query: (params) => ({
        url: '/notifications',
        params: {
          unread_only: params.unread_only,
          include_global: params.include_global,
          limit: params.limit || 30,
        },
      }),
      // ⚠️ Transformation des données pour correspondre à votre service
      transformResponse: (raw: any[]): NotificationItem[] => {
        return raw.map((item) => {
          // Parser le target depuis le message (comme dans votre service)
          const match = item.message?.match(/^\[\[([a-zA-Z]+):([a-zA-Z0-9_-]+)\]\]\s*/);
          const parsed = match
            ? {
                message: item.message.slice(match[0].length),
                target_type: match[1],
                target_id: match[2],
              }
            : { message: item.message || '' };

          return {
            ...item,
            message: parsed.message,
            target_type: parsed.target_type || null,
            target_id: parsed.target_id || null,
          };
        });
      },
      providesTags: (_result) => [
        'Notification',
        ...(_result?.map((n) => ({ type: 'Notification' as const, id: n.id })) ?? []),
      ],
      keepUnusedDataFor: 30,
    }),

    // Récupérer le nombre de notifications non lues
    getUnreadCount: builder.query<UnreadCountResponse, void>({
      query: () => ({
        url: '/notifications/unread-count',
      }),
      providesTags: ['UnreadCount'],
      keepUnusedDataFor: 15,
    }),

    // ==========================================================================
    // MUTATIONS
    // ==========================================================================

    // Marquer une notification comme lue
    markNotificationRead: builder.mutation<
      NotificationItem,
      string
    >({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: 'PATCH',
      }),
      // ⚠️ Transformation identique à votre service
      transformResponse: (raw: any): NotificationItem => {
        const match = raw.message?.match(/^\[\[([a-zA-Z]+):([a-zA-Z0-9_-]+)\]\]\s*/);
        const parsed = match
          ? {
              message: raw.message.slice(match[0].length),
              target_type: match[1],
              target_id: match[2],
            }
          : { message: raw.message || '' };

        return {
          ...raw,
          message: parsed.message,
          target_type: parsed.target_type || null,
          target_id: parsed.target_id || null,
        };
      },
      invalidatesTags: (_result, _error, notificationId) => [
        { type: 'Notification', id: notificationId },
        'UnreadCount',
      ],
    }),

    // Marquer toutes les notifications comme lues
    markAllNotificationsRead: builder.mutation<
      { updated: number },
      void
    >({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification', 'UnreadCount'],
    }),

    // Créer une notification (admin/superadmin uniquement)
    createNotification: builder.mutation<
      NotificationItem,
      {
        titre: string;
        message: string;
        type?: 'info' | 'alerte' | 'warning' | 'promotion' | 'evenement' | 'systeme';
        est_globale?: boolean;
        id_utilisateur?: string | null;
        target_type?: string | null;
        target_id?: string | null;
      }
    >({
      query: (body) => ({
        url: '/notifications',
        method: 'POST',
        body,
      }),
      // ⚠️ Transformation identique à votre service
      transformResponse: (raw: any): NotificationItem => {
        const match = raw.message?.match(/^\[\[([a-zA-Z]+):([a-zA-Z0-9_-]+)\]\]\s*/);
        const parsed = match
          ? {
              message: raw.message.slice(match[0].length),
              target_type: match[1],
              target_id: match[2],
            }
          : { message: raw.message || '' };

        return {
          ...raw,
          message: parsed.message,
          target_type: parsed.target_type || null,
          target_id: parsed.target_id || null,
        };
      },
      invalidatesTags: ['Notification', 'UnreadCount'],
    }),

    // Supprimer une notification
    deleteNotification: builder.mutation<void, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, notificationId) => [
        { type: 'Notification', id: notificationId },
        'UnreadCount',
      ],
    }),
  }),
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  // Queries
  useGetNotificationsQuery,
  useGetUnreadCountQuery,

  // Mutations
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useCreateNotificationMutation,
  useDeleteNotificationMutation,
} = notificationApi;