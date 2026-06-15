import { apiFetch } from './api';

// On pointe désormais vers K-Chat (port 8000 par défaut ou variable d'env)
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
  other_user?: any; // Format K-Chat
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

// Fonction utilitaire pour extraire le user_id localement (Nécessaire pour les URLs K-Chat)
const getCurrentUserId = (): string => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.id) return user.id;
      if (user.user_id) return user.user_id;
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.id || '';
    }
  } catch (e) {
    console.error("Impossible de récupérer l'ID utilisateur");
  }
  return '';
};

const getCurrentUsername = (): string => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.username) return user.username;
      if (user.email) return user.email.split('@')[0];
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.username) return payload.username;
      if (payload.email) return payload.email.split('@')[0];
    }
  } catch (e) {
    console.error("Impossible de récupérer le nom d'utilisateur");
  }
  return 'Utilisateur';
};

const wsBaseUrl = () => MESSAGERIE_BASE_URL.replace(/^http/, 'ws');

export const messagerieService = {
  listGroups: async () => {
    const res = await apiFetch(MESSAGERIE_BASE_URL, `/group/user-groups/${getCurrentUserId()}`);
    return Array.isArray(res) ? { groups: res } : res;
  },

  getUnreadSummary: async () => {
    const res = await apiFetch(MESSAGERIE_BASE_URL, `/chat/unread-summary/${getCurrentUserId()}`) as any;
    return {
      unread_discussions_count: res?.total_unread || 0,
      unread_group_ids: [],
      has_private_unread: (res?.private_unread || 0) > 0,
    } as MessagerieUnreadSummary;
  },

  getGroupMembers: async (groupId: string) => {
    const res = await apiFetch(MESSAGERIE_BASE_URL, `/group/group-members/${groupId}`);
    return Array.isArray(res) ? { members: res } : res;
  },

  getGroupMessages: async (groupId: string) => {
    const res = await apiFetch(MESSAGERIE_BASE_URL, `/group/group-messages/${groupId}`);
    return Array.isArray(res) ? { messages: res } : res;
  },

  updateGroupClosedState: async (groupId: string, isClosed: boolean) => {
    console.warn("Fermeture de groupe non implémentée côté K-Chat");
    return { id: groupId, is_closed: isClosed } as MessagerieGroup;
  },

  sendGroupMessage: async (groupId: string, payload: MessagePayload) => {
    console.warn("L'envoi REST n'est pas géré par K-Chat (utilise le WebSocket)");
    return { id: "temp", ...payload } as unknown as MessageItem;
  },

  getPrivateMessages: async (otherUserId: string) => {
    const res = await apiFetch(MESSAGERIE_BASE_URL, `/chat/messages/${getCurrentUserId()}/${otherUserId}`);
    return Array.isArray(res) ? { messages: res } : res;
  },

  listPrivateConversations: async () => {
    const res = await apiFetch(MESSAGERIE_BASE_URL, `/chat/conversations/${getCurrentUserId()}`) as any;
    if (res && res.conversations) {
      // Mapping K-Chat vers K-Planner
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

  groupSocketUrl: (groupId: string) => {
    const token = localStorage.getItem('access_token') || '';
    const query = new URLSearchParams({ token });
    // URL K-Chat : /group/ws/group/{group_id}/{username}
    return `${wsBaseUrl()}/group/ws/group/${groupId}/${getCurrentUsername()}?${query.toString()}`;
  },

  privateSocketUrl: (receiverId: string) => {
    const token = localStorage.getItem('access_token') || '';
    const query = new URLSearchParams({ token });
    // URL K-Chat : /chat/ws/private/{sender}/{receiver}
    return `${wsBaseUrl()}/chat/ws/private/${getCurrentUserId()}/${receiverId}?${query.toString()}`;
  },
};
