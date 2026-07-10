// frontend/src/services/messagerie.service.ts

import { apiFetch } from './api';

export const MESSAGERIE_BASE_URL = import.meta.env.VITE_MESSAGERIE_URL || 'http://localhost:8000';

export interface MessagePayload {
  message?: string | null;
  type?: string;
  audio?: string | null;
  file?: string | null;
  image?: string | null;
  video?: string | null;
}

export interface MessageItem {
  id: string;
  sender: string;
  id_room: string;
  id_groupe?: string | null;
  type: string;
  seen: boolean;
  message?: string | null;
  audio?: string | null;
  file?: string | null;
  image?: string | null;
  video?: string | null;
  created_at?: string | null;
  time?: string | null;
  sender_username?: string | null;
  sender_photo_base64?: string | null;
}

export interface MessagerieGroup {
  id: string;
  name: string;
  raw_name?: string | null;
  resource_type?: 'workspace' | 'espace' | 'liste' | string | null;
  resource_id?: string | null;
  creator: string;
  member_count: number;
  is_closed?: boolean;
  can_manage?: boolean;
  can_write?: boolean;
  created_at?: string | null;
}

export interface MessagerieMember {
  id: string;
  username?: string | null;
  email?: string | null;
  photo_base64?: string | null;
  role: 'Administrateur' | 'Membre' | string;
}

export interface MessagerieUnreadSummary {
  unread_discussions_count: number;
  unread_group_ids: string[];
  unread_group_counts?: Record<string, number>;
  unread_private_user_ids?: string[];
  unread_private_counts?: Record<string, number>;
  has_private_unread: boolean;
}

export interface PrivateConversation {
  room_id: string;
  user: MessagerieMember;
  other_user?: any;
  last_message?: MessageItem | null;
  updated_at?: string | null;
  is_online?: boolean;
  last_seen?: string | null;
  unread_count?: number;
}

export interface PresenceResponse {
  user_id: string;
  is_online: boolean;
  last_seen?: string | null;
}

const wsBaseUrl = () => MESSAGERIE_BASE_URL.replace(/^http/, 'ws');

export const ensureChatGroup = async (resourceType: string, resourceId: string): Promise<{ success: boolean; group_id: string }> => {
  const baseUrlMap: Record<string, string> = {
    workspace: import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:8003',
    espace: import.meta.env.VITE_ESPACE_URL || 'http://localhost:8001',
    liste: import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004',
  };
  
  const baseUrl = baseUrlMap[resourceType];
  if (!baseUrl) {
    throw new Error(`Type de ressource inconnu: ${resourceType}`);
  }
  
  return apiFetch(baseUrl, `/chat/ensure/${resourceType}/${resourceId}`);
};

export const messagerieService = {
  listGroups: async (userId: string) => {
    if (!userId) {
      console.warn('⚠️ listGroups: Pas d\'ID utilisateur');
      return { groups: [] };
    }
    const res = await apiFetch(MESSAGERIE_BASE_URL, `/group/user-groups/${userId}`);
    return Array.isArray(res) ? { groups: res } : res;
  },

  getUnreadSummary: async (userId: string) => {
    if (!userId) {
      console.warn('⚠️ getUnreadSummary: Pas d\'ID utilisateur');
      return {
        unread_discussions_count: 0,
        unread_group_ids: [],
        has_private_unread: false,
      } as MessagerieUnreadSummary;
    }
    try {
      const res = await apiFetch(MESSAGERIE_BASE_URL, `/chat/unread-summary/${userId}`) as any;
      return {
        unread_discussions_count: res?.total_unread || 0,
        unread_group_ids: res?.unread_group_ids || [],
        unread_group_counts: res?.unread_group_counts || {},
        unread_private_user_ids: res?.unread_private_user_ids || [],
        unread_private_counts: res?.unread_private_counts || {},
        has_private_unread: (res?.private_unread || 0) > 0,
      } as MessagerieUnreadSummary;
    } catch (e) {
      console.warn('Erreur getUnreadSummary:', e);
      return {
        unread_discussions_count: 0,
        unread_group_ids: [],
        unread_group_counts: {},
        unread_private_user_ids: [],
        unread_private_counts: {},
        has_private_unread: false,
      } as MessagerieUnreadSummary;
    }
  },

  getGroupMembers: async (groupId: string) => {
    const res = await apiFetch(MESSAGERIE_BASE_URL, `/group/group-members/${groupId}`);
    return Array.isArray(res) ? { members: res } : res;
  },

  getGroupMessages: async (groupId: string) => {
    const res = await apiFetch(MESSAGERIE_BASE_URL, `/group/group-messages/${groupId}`);
    return Array.isArray(res) ? { messages: res } : res;
  },

  updateGroupClosedState: async (groupId: string, isClosed: boolean, actorId: string) => {
    if (!actorId) {
      throw new Error('Utilisateur non authentifié');
    }
    return apiFetch(MESSAGERIE_BASE_URL, `/group/group/${groupId}/toggle-closed`, {
      method: 'PUT',
      body: JSON.stringify({ is_closed: isClosed, actor: actorId }),
    }) as Promise<MessagerieGroup>;
  },

  sendGroupMessage: async (groupId: string, payload: MessagePayload) => {
    console.warn("L'envoi REST n'est pas géré par K-Chat (utilise le WebSocket)");
    return { id: "temp", ...payload } as unknown as MessageItem;
  },

  getPrivateMessages: async (otherUserId: string, currentUserId: string) => {
    if (!currentUserId || !otherUserId) {
      console.warn('⚠️ getPrivateMessages: IDs invalides');
      return { messages: [] };
    }
    const res = await apiFetch(MESSAGERIE_BASE_URL, `/chat/messages/${currentUserId}/${otherUserId}`);
    return Array.isArray(res) ? { messages: res } : res;
  },

  listPrivateConversations: async (userId: string) => {
    if (!userId) {
      console.warn('⚠️ listPrivateConversations: Pas d\'ID utilisateur');
      return { conversations: [] };
    }
    const res = await apiFetch(MESSAGERIE_BASE_URL, `/chat/conversations/${userId}`) as any;
    if (res && res.conversations) {
      const mapped = res.conversations.map((conv: any) => ({
        room_id: conv.room_id,
        user: conv.other_user || {},
        last_message: conv.last_message,
        updated_at: conv.updated_at,
        unread_count: conv.unread_count
      }));
      return { conversations: mapped };
    }
    return { conversations: [] };
  },

  sendPrivateMessage: async (receiverId: string, payload: MessagePayload) => {
    console.warn("L'envoi REST n'est pas géré par K-Chat (utilise le WebSocket)");
    return { id: "temp", ...payload } as unknown as MessageItem;
  },

  updateMessage: async (messageId: string, message: string) => {
    return apiFetch(MESSAGERIE_BASE_URL, `/chat/message/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ message }),
    }) as Promise<MessageItem>;
  },

  deleteMessage: async (messageId: string) => {
    await apiFetch(MESSAGERIE_BASE_URL, `/chat/message/${messageId}`, {
      method: 'DELETE',
    });
  },

  getPresence: async (userId: string) => {
    return apiFetch(MESSAGERIE_BASE_URL, `/chat/presence/${userId}`) as Promise<PresenceResponse>;
  },

  groupSocketUrl: (groupId: string, username: string) => {
    if (!groupId || !username) {
      console.error('❌ groupSocketUrl: paramètres invalides:', { groupId, username });
      return null;
    }
    return `${wsBaseUrl()}/group/ws/group/${groupId}/${username}`;
  },

  privateSocketUrl: (senderId: string, receiverId: string) => {
    if (!senderId || !receiverId) {
      console.error('❌ privateSocketUrl: IDs invalides:', { senderId, receiverId });
      return null;
    }
    return `${wsBaseUrl()}/chat/ws/private/${senderId}/${receiverId}`;
  },
};