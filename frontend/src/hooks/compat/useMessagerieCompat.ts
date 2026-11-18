// src/hooks/compat/useMessagerieCompat.ts
import { useCallback, useEffect, useState } from 'react';
import type { MessageItem } from '../../store/api/messagerieApi';
import { messagerieService } from '../../services/messagerie.service';
import {
  useListGroupsQuery,
  useGetGroupMembersQuery,
  useGetGroupMessagesQuery,
  useGetUnreadSummaryQuery,
  useListPrivateConversationsQuery,
  useGetPrivateMessagesQuery,
  useGetPresenceQuery,
  useEnsureChatGroupMutation,
  useUpdateGroupClosedStateMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
  messagerieWebSocket,
} from '../../store/api/messagerieApi';
import { useAuth } from '../../contexts/AuthContext';

export const useMessagerieCompat = (groupId?: string, privateUserId?: string) => {
  const { user } = useAuth();
  const userId = user?.id || '';
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  const {
    data: groupsData,
    isLoading: groupsLoading,
    refetch: refetchGroups,
    error: groupsError,
  } = useListGroupsQuery();

  const {
    data: groupMembers,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useGetGroupMembersQuery(groupId ?? '', { skip: !groupId });

  const {
    data: groupMessages,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useGetGroupMessagesQuery(groupId ?? '', { skip: !groupId });

  const {
    data: unreadSummary,
    isLoading: unreadLoading,
    refetch: refetchUnread,
  } = useGetUnreadSummaryQuery();

  const {
    data: privateConversations,
    isLoading: privateLoading,
    refetch: refetchPrivate,
  } = useListPrivateConversationsQuery();

  const {
    data: privateMessages,
    isLoading: privateMessagesLoading,
    refetch: refetchPrivateMessages,
  } = useGetPrivateMessagesQuery(privateUserId ?? '', { skip: !privateUserId });

  const {
    data: presence,
    isLoading: presenceLoading,
    refetch: refetchPresence,
  } = useGetPresenceQuery(privateUserId ?? '', { skip: !privateUserId });

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const [ensureChatGroupRTK] = useEnsureChatGroupMutation();
  const [updateGroupClosedStateRTK] = useUpdateGroupClosedStateMutation();
  const [updateMessageRTK] = useUpdateMessageMutation();
  const [deleteMessageRTK] = useDeleteMessageMutation();

  // ==========================================================================
  // WEBSOCKET - État
  // ==========================================================================

  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [wsMessages, setWsMessages] = useState<MessageItem[]>([]);

  // ==========================================================================
  // WEBSOCKET - Gestion
  // ==========================================================================

  const connectGroupWebSocket = useCallback(() => {
    if (!groupId) return;
    if (wsConnection?.readyState === WebSocket.OPEN) return;

    const url = messagerieWebSocket.groupSocketUrl(groupId);
    const ws = messagerieWebSocket.connect(url);

    ws.onopen = () => {
      console.log('🔌 WebSocket groupe connecté:', groupId);
      setIsWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setWsMessages((prev) => [...prev, data.message]);
          // Invalider le cache des messages
          refetchMessages();
        }
      } catch (error) {
        console.error('Erreur WebSocket:', error);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket groupe déconnecté:', groupId);
      setIsWsConnected(false);
      // Tentative de reconnexion après 5s
      setTimeout(() => {
        if (groupId) connectGroupWebSocket();
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
      ws.close();
    };

    setWsConnection(ws);
  }, [groupId, refetchMessages]);

  const disconnectWebSocket = useCallback(() => {
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
      setIsWsConnected(false);
    }
  }, [wsConnection]);

  // Effet pour connecter/déconnecter le WebSocket
  useEffect(() => {
    if (groupId) {
      connectGroupWebSocket();
    }
    return () => {
      disconnectWebSocket();
    };
  }, [groupId, connectGroupWebSocket, disconnectWebSocket]);

  // ==========================================================================
  // FONCTIONS AVEC FALLBACK
  // ==========================================================================

  const listGroups = useCallback(async () => {
    try {
      const result = await refetchGroups();
      return result.data;
    } catch (error) {
      console.warn('RTK Query fallback -> messagerieService.listGroups');
      return await messagerieService.listGroups(userId);
    }
  }, [refetchGroups, userId]);

  const getGroupMembers = useCallback(
    async (groupId: string) => {
      try {
        const result = await refetchMembers();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> messagerieService.getGroupMembers');
        return await messagerieService.getGroupMembers(groupId);
      }
    },
    [refetchMembers]
  );

  const getGroupMessages = useCallback(
    async (groupId: string) => {
      try {
        const result = await refetchMessages();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> messagerieService.getGroupMessages');
        return await messagerieService.getGroupMessages(groupId);
      }
    },
    [refetchMessages]
  );

  const getUnreadSummary = useCallback(async () => {
    try {
      const result = await refetchUnread();
      return result.data;
    } catch (error) {
      console.warn('RTK Query fallback -> messagerieService.getUnreadSummary');
      return await messagerieService.getUnreadSummary(userId);
    }
  }, [refetchUnread, userId]);

  const listPrivateConversations = useCallback(async () => {
    try {
      const result = await refetchPrivate();
      return result.data;
    } catch (error) {
      console.warn('RTK Query fallback -> messagerieService.listPrivateConversations');
      return await messagerieService.listPrivateConversations(userId);
    }
  }, [refetchPrivate, userId]);

  const getPrivateMessages = useCallback(
    async (otherUserId: string) => {
      try {
        const result = await refetchPrivateMessages();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> messagerieService.getPrivateMessages');
        return await messagerieService.getPrivateMessages(otherUserId, userId);
      }
    },
    [refetchPrivateMessages, userId]
  );

  const getPresence = useCallback(
    async (userId: string) => {
      try {
        const result = await refetchPresence();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> messagerieService.getPresence');
        return await messagerieService.getPresence(userId);
      }
    },
    [refetchPresence]
  );

  const ensureChatGroup = useCallback(
    async (resourceType: 'workspace' | 'espace' | 'liste', resourceId: string) => {
      try {
        return await ensureChatGroupRTK({ resourceType, resourceId }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> messagerieService.ensureChatGroup');
        const { ensureChatGroup } = await import('../../services/messagerie.service');
        return await ensureChatGroup(resourceType, resourceId);
      }
    },
    [ensureChatGroupRTK]
  );

  const updateGroupClosedState = useCallback(
    async (groupId: string, isClosed: boolean) => {
      try {
        return await updateGroupClosedStateRTK({ groupId, isClosed }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> messagerieService.updateGroupClosedState');
        return await messagerieService.updateGroupClosedState(groupId, isClosed, userId);
      }
    },
    [updateGroupClosedStateRTK, userId]
  );

  const updateMessage = useCallback(
    async (messageId: string, message: string) => {
      try {
        return await updateMessageRTK({ messageId, message }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> messagerieService.updateMessage');
        return await messagerieService.updateMessage(messageId, message);
      }
    },
    [updateMessageRTK]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await deleteMessageRTK(messageId).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> messagerieService.deleteMessage');
        await messagerieService.deleteMessage(messageId);
      }
    },
    [deleteMessageRTK]
  );

  // ==========================================================================
  // SEND MESSAGE (via WebSocket)
  // ==========================================================================

  const sendMessage = useCallback(
    (message: string, type: string = 'text') => {
      if (wsConnection?.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({ message, type }));
        return true;
      } else {
        console.warn('WebSocket non connecté');
        return false;
      }
    },
    [wsConnection]
  );

  const sendFile = useCallback(
    (file: File, type: string = 'file') => {
      if (wsConnection?.readyState === WebSocket.OPEN) {
        // Pour les fichiers, envoyer en base64 ou via un autre mécanisme
        // Ceci est un exemple, à adapter selon votre backend
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          wsConnection.send(JSON.stringify({ message: base64, type, filename: file.name }));
        };
        reader.readAsDataURL(file);
        return true;
      } else {
        console.warn('WebSocket non connecté');
        return false;
      }
    },
    [wsConnection]
  );

  // ==========================================================================
  // REFETCH
  // ==========================================================================

  const refetchAll = useCallback(() => {
    refetchGroups();
    refetchUnread();
    refetchPrivate();
    if (groupId) {
      refetchMembers();
      refetchMessages();
    }
    if (privateUserId) {
      refetchPrivateMessages();
      refetchPresence();
    }
  }, [
    refetchGroups,
    refetchUnread,
    refetchPrivate,
    refetchMembers,
    refetchMessages,
    refetchPrivateMessages,
    refetchPresence,
    groupId,
    privateUserId,
  ]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Données
    groups: groupsData?.groups || [],
    groupMembers: groupMembers?.members || [],
    groupMessages: groupMessages?.messages || [],
    unreadSummary,
    privateConversations: privateConversations?.conversations || [],
    privateMessages: privateMessages?.messages || [],
    presence,
    wsMessages,

    // États WebSocket
    isWsConnected,
    isWsConnecting: wsConnection?.readyState === WebSocket.CONNECTING,

    // États de chargement
    isLoading: groupsLoading || membersLoading || messagesLoading || unreadLoading || privateLoading || privateMessagesLoading || presenceLoading,

    // Erreurs
    errors: {
      groups: groupsError,
    },

    // Fonctions avec fallback
    listGroups,
    getGroupMembers,
    getGroupMessages,
    getUnreadSummary,
    listPrivateConversations,
    getPrivateMessages,
    getPresence,
    ensureChatGroup,
    updateGroupClosedState,
    updateMessage,
    deleteMessage,

    // WebSocket
    connectWebSocket: connectGroupWebSocket,
    disconnectWebSocket,
    sendMessage,
    sendFile,

    // Rafraîchissement
    refetch: refetchAll,
    refetchGroups,
    refetchUnread,
    refetchPrivate,

    // Service legacy
    legacy: messagerieService,
  };
};
