// src/hooks/compat/useNotificationCompat.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { notificationService } from '../../services/notification.service';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} from '../../store/api/notificationApi';
import type { NotificationItem } from '../../store/api/notificationApi';

// ============================================================================
// WEB SOCKET SERVICE (réutilisé depuis votre service existant)
// ============================================================================

class NotificationWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<(data: any) => void> = new Set();
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private getWebSocketUrl(): string {
    return notificationService.socketUrl();
  }

  connect(): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return;

    this.isConnecting = true;

    try {
      const wsUrl = this.getWebSocketUrl();
      console.log('🔌 Connexion WebSocket notifications:', wsUrl);
      this.ws = notificationService.connectSocket();

      this.ws.onopen = () => {
        console.log('🔌 WebSocket notifications connecté');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyListeners({ event: 'connected', status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Erreur de parsing WebSocket:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket notifications déconnecté');
        this.isConnecting = false;
        this.notifyListeners({ event: 'disconnected' });
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Erreur WebSocket notifications:', error);
        this.ws?.close();
      };
    } catch (error) {
      console.error('Erreur de connexion WebSocket:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  private handleMessage(message: any): void {
    console.log('📨 Message WebSocket reçu:', message);

    if (message.event === 'notification.created' && message.notification) {
      // Notification transformée comme dans votre service
      const transformed = this.transformNotification(message.notification);
      this.notifyListeners({
        event: 'notification.created',
        notification: transformed,
      });
    } else if (message.event === 'connected') {
      this.notifyListeners({ event: 'connected' });
    } else if (message.event === 'notification.read') {
      this.notifyListeners({ event: 'notification.read', data: message.data });
    } else if (message.event === 'notification.deleted') {
      this.notifyListeners({ event: 'notification.deleted', data: message.data });
    } else {
      this.notifyListeners(message);
    }
  }

  private transformNotification(raw: any): NotificationItem {
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
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('⚠️ Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  addListener(callback: (data: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(data: any): void {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error('Erreur dans l\'écouteur:', error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let wsService: NotificationWebSocketService | null = null;

const getNotificationWebSocket = (): NotificationWebSocketService => {
  if (!wsService) {
    wsService = new NotificationWebSocketService();
  }
  return wsService;
};

// ============================================================================
// HOOK DE COMPATIBILITÉ
// ============================================================================

export const useNotificationCompat = (options?: {
  unreadOnly?: boolean;
  includeGlobal?: boolean;
  limit?: number;
}) => {
  const { unreadOnly = false, includeGlobal = false, limit = 30 } = options || {};

  // ==========================================================================
  // QUERIES RTK Query
  // ==========================================================================

  const {
    data: notifications,
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery({
    unread_only: unreadOnly,
    include_global: includeGlobal,
    limit,
  });

  const {
    data: unreadCount,
    isLoading: countLoading,
    error: countError,
    refetch: refetchUnreadCount,
  } = useGetUnreadCountQuery();

  // ==========================================================================
  // MUTATIONS RTK Query
  // ==========================================================================

  const [markReadRTK, { isLoading: markingRead }] = useMarkNotificationReadMutation();
  const [markAllReadRTK, { isLoading: markingAllRead }] = useMarkAllNotificationsReadMutation();
  const [deleteNotificationRTK, { isLoading: deleting }] = useDeleteNotificationMutation();

  // ==========================================================================
  // WEBSOCKET - Utilisation du service existant
  // ==========================================================================

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);

  useEffect(() => {
    const service = getNotificationWebSocket();
    setIsConnected(service.isConnected());

    const unsubscribe = service.addListener((data) => {
      setLastEvent(data);

      // Rafraîchir automatiquement sur nouvelle notification
      if (data.event === 'notification.created') {
        refetchNotifications();
        refetchUnreadCount();
      } else if (data.event === 'notification.read' || data.event === 'notification.deleted') {
        refetchUnreadCount();
      }
    });

    const interval = setInterval(() => {
      setIsConnected(service.isConnected());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refetchNotifications, refetchUnreadCount]);

  // ==========================================================================
  // FONCTIONS AVEC FALLBACK
  // ==========================================================================

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        return await markReadRTK(notificationId).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> notificationService.markRead');
        return await notificationService.markRead(notificationId);
      }
    },
    [markReadRTK]
  );

  const markAllAsRead = useCallback(
    async () => {
      try {
        return await markAllReadRTK().unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> notificationService.markAllRead');
        return await notificationService.markAllRead();
      }
    },
    [markAllReadRTK]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await deleteNotificationRTK(notificationId).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> notificationService.delete');
        await notificationService.delete(notificationId);
      }
    },
    [deleteNotificationRTK]
  );

  // ==========================================================================
  // GROUPEMENT PAR DATE
  // ==========================================================================

  const groupedNotifications = useMemo(() => {
    if (!notifications) return {};

    const groups: Record<string, NotificationItem[]> = {};
    const today = new Date().toDateString();

    notifications.forEach((notification) => {
      const date = new Date(notification.date_creation || '');
      const dateKey = date.toDateString() === today ? "Aujourd'hui" : date.toLocaleDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notification);
    });

    return groups;
  }, [notifications]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Données
    notifications: notifications || [],
    groupedNotifications,
    unreadCount: unreadCount?.count || 0,

    // États de connexion
    isConnected,
    lastEvent,

    // États de chargement
    isLoading: notificationsLoading || countLoading,
    isMutating: markingRead || markingAllRead || deleting,

    // Erreurs
    errors: {
      notifications: notificationsError,
      count: countError,
    },

    // Fonctions avec fallback
    markAsRead,
    markAllAsRead,
    deleteNotification,

    // Rafraîchissement
    refetch: () => {
      refetchNotifications();
      refetchUnreadCount();
    },
    refetchNotifications,
    refetchUnreadCount,

    // WebSocket
    reconnectWebSocket: () => {
      const service = getNotificationWebSocket();
      service.disconnect();
      setTimeout(() => service.connect(), 1000);
    },

    // Helpers
    hasUnread: (unreadCount?.count || 0) > 0,
    isUnread: (notification: NotificationItem) => !notification.est_lu,

    // Service legacy
    legacy: notificationService,
  };
};
