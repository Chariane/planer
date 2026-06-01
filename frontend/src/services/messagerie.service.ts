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
  created_at?: string | null;
}

export interface MessagerieMember {
  id: string;
  username?: string | null;
  email?: string | null;
  role: 'Administrateur' | 'Membre' | string;
}

export interface MessagerieUnreadSummary {
  unread_discussions_count: number;
  unread_group_ids: string[];
  has_private_unread: boolean;
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

  groupSocketUrl: (groupId: string) => {
    const token = localStorage.getItem('access_token') || '';
    const query = new URLSearchParams({ token });
    return `${wsBaseUrl()}/messagerie/ws/groups/${groupId}?${query.toString()}`;
  },
};
