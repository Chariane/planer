import { apiFetch } from './api';

export const MESSAGERIE_BASE_URL = import.meta.env.VITE_MESSAGERIE_URL || 'http://localhost:8006';

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
}

export interface MessagerieGroup {
  id: string;
  name: string;
  raw_name?: string | null;
  resource_type?: 'workspace' | 'espace' | 'liste' | string | null;
  resource_id?: string | null;
  creator: string;
  member_count: number;
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
  last_message?: MessageItem | null;
  updated_at?: string | null;
  is_online?: boolean;
  last_seen?: string | null;
}

export interface PresenceResponse {
  user_id: string;
  is_online: boolean;
  last_seen?: string | null;
}

const wsBaseUrl = () => MESSAGERIE_BASE_URL.replace(/^http/, 'ws');

export const messagerieService = {
  listGroups: () =>
    apiFetch(MESSAGERIE_BASE_URL, '/messagerie/groups') as Promise<{ groups: MessagerieGroup[] }>,

  getUnreadSummary: () =>
    apiFetch(MESSAGERIE_BASE_URL, '/messagerie/unread-summary') as Promise<MessagerieUnreadSummary>,

  getGroupMembers: (groupId: string) =>
    apiFetch(MESSAGERIE_BASE_URL, `/messagerie/groups/${groupId}/members`) as Promise<{ members: MessagerieMember[] }>,

  getGroupMessages: (groupId: string) =>
    apiFetch(MESSAGERIE_BASE_URL, `/messagerie/groups/${groupId}/messages`) as Promise<{ messages: MessageItem[] }>,

  sendGroupMessage: (groupId: string, payload: MessagePayload) =>
    apiFetch(MESSAGERIE_BASE_URL, `/messagerie/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<MessageItem>,

  getPrivateMessages: (otherUserId: string) =>
    apiFetch(MESSAGERIE_BASE_URL, `/messagerie/private/${otherUserId}/messages`) as Promise<{ messages: MessageItem[] }>,

  listPrivateConversations: () =>
    apiFetch(MESSAGERIE_BASE_URL, '/messagerie/private/conversations') as Promise<{ conversations: PrivateConversation[] }>,

  sendPrivateMessage: (receiverId: string, payload: MessagePayload) =>
    apiFetch(MESSAGERIE_BASE_URL, `/messagerie/private/${receiverId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<MessageItem>,

  updateMessage: (messageId: string, message: string) =>
    apiFetch(MESSAGERIE_BASE_URL, `/messagerie/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ message }),
    }) as Promise<MessageItem>,

  deleteMessage: (messageId: string) =>
    apiFetch(MESSAGERIE_BASE_URL, `/messagerie/messages/${messageId}`, {
      method: 'DELETE',
    }) as Promise<void>,

  getPresence: (userId: string) =>
    apiFetch(MESSAGERIE_BASE_URL, `/messagerie/presence/${userId}`) as Promise<PresenceResponse>,

  groupSocketUrl: (groupId: string) => {
    const token = localStorage.getItem('access_token') || '';
    const query = new URLSearchParams({ token });
    return `${wsBaseUrl()}/messagerie/ws/groups/${groupId}?${query.toString()}`;
  },

  privateSocketUrl: (receiverId: string) => {
    const token = localStorage.getItem('access_token') || '';
    const query = new URLSearchParams({ token });
    return `${wsBaseUrl()}/messagerie/ws/private/${receiverId}?${query.toString()}`;
  },
};
