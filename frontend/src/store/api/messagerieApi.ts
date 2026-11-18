// src/store/api/messagerieApi.ts
import { baseApi } from './baseApi';
import { createAuthenticatedWebSocket } from '../../services/api';

// ============================================================================
// TYPES - Compatibles avec vos services existants
// ============================================================================

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

export interface EnsureChatGroupResponse {
  success: boolean;
  group_id: string;
}

// ============================================================================
// API RTK Query
// ============================================================================

export const messagerieApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================================================
    // QUERIES
    // ==========================================================================

    // Lister les groupes de l'utilisateur
    listGroups: builder.query<{ groups: MessagerieGroup[] }, void>({
      query: () => {
        const userId = getCurrentUserId();
        return {
          url: `/group/user-groups/${userId}`,
        };
      },
      providesTags: ['ChatGroup', 'UserData'], // ✅ AJOUT
      keepUnusedDataFor: 120,
    }),

    // Récupérer les membres d'un groupe
    getGroupMembers: builder.query<{ members: MessagerieMember[] }, string>({
      query: (groupId) => ({
        url: `/group/group-members/${groupId}`,
      }),
      providesTags: (_result, _error, groupId) => [
        { type: 'ChatGroup', id: groupId },
        'UserData', // ✅ AJOUT
        ...(_result?.members?.map((m) => ({ type: 'ChatMember' as const, id: m.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // Récupérer les messages d'un groupe
    getGroupMessages: builder.query<{ messages: MessageItem[] }, string>({
      query: (groupId) => ({
        url: `/group/group-messages/${groupId}`,
      }),
      providesTags: (_result, _error, groupId) => [
        { type: 'ChatGroup', id: groupId },
        'UserData', // ✅ AJOUT
        ...(_result?.messages?.map((m) => ({ type: 'ChatMessage' as const, id: m.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Récupérer le résumé des non-lus
    getUnreadSummary: builder.query<MessagerieUnreadSummary, void>({
      query: () => {
        const userId = getCurrentUserId();
        return {
          url: `/chat/unread-summary/${userId}`,
        };
      },
      providesTags: ['ChatUnread', 'UserData'], // ✅ AJOUT
      keepUnusedDataFor: 30,
    }),

    // Récupérer les conversations privées
    listPrivateConversations: builder.query<{ conversations: PrivateConversation[] }, void>({
      query: () => {
        const userId = getCurrentUserId();
        return {
          url: `/chat/conversations/${userId}`,
        };
      },
      providesTags: ['ChatPrivate', 'UserData'], // ✅ AJOUT
      keepUnusedDataFor: 120,
    }),

    // Récupérer les messages privés avec un utilisateur
    getPrivateMessages: builder.query<{ messages: MessageItem[] }, string>({
      query: (otherUserId) => {
        const userId = getCurrentUserId();
        return {
          url: `/chat/messages/${userId}/${otherUserId}`,
        };
      },
      providesTags: (_result, _error, otherUserId) => [
        { type: 'ChatPrivate', id: otherUserId },
        'UserData', // ✅ AJOUT
        ...(_result?.messages?.map((m) => ({ type: 'ChatMessage' as const, id: m.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Récupérer la présence d'un utilisateur
    getPresence: builder.query<PresenceResponse, string>({
      query: (userId) => ({
        url: `/chat/presence/${userId}`,
      }),
      keepUnusedDataFor: 30,
    }),

    // ==========================================================================
    // MUTATIONS - GROUPES
    // ==========================================================================

    // Garantir qu'un groupe de chat existe pour une ressource
    ensureChatGroup: builder.mutation<
      EnsureChatGroupResponse,
      { resourceType: 'workspace' | 'espace' | 'liste'; resourceId: string }
    >({
      query: ({ resourceType, resourceId }) => {
        const baseUrlMap: Record<string, string> = {
          workspace: import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:8003',
          espace: import.meta.env.VITE_ESPACE_URL || 'http://localhost:8001',
          liste: import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004',
        };
        const baseUrl = baseUrlMap[resourceType];
        return {
          url: `${baseUrl}/chat/ensure/${resourceType}/${resourceId}`,
        };
      },
      invalidatesTags: ['ChatGroup', 'UserData'], // ✅ AJOUT
    }),

    // Mettre à jour l'état fermé d'un groupe
    updateGroupClosedState: builder.mutation<
      MessagerieGroup,
      { groupId: string; isClosed: boolean }
    >({
      query: ({ groupId, isClosed }) => {
        const actor = getCurrentUserId();
        return {
          url: `/group/group/${groupId}/toggle-closed`,
          method: 'PUT',
          body: { is_closed: isClosed, actor },
        };
      },
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'ChatGroup', id: groupId },
        'UserData', // ✅ AJOUT
      ],
    }),

    // ==========================================================================
    // MUTATIONS - MESSAGES
    // ==========================================================================

    // Mettre à jour un message
    updateMessage: builder.mutation<
      MessageItem,
      { messageId: string; message: string }
    >({
      query: ({ messageId, message }) => ({
        url: `/chat/message/${messageId}`,
        method: 'PATCH',
        body: { message },
      }),
      invalidatesTags: (_result, _error, { messageId }) => [
        { type: 'ChatMessage', id: messageId },
        'UserData', // ✅ AJOUT
      ],
    }),

    // Supprimer un message
    deleteMessage: builder.mutation<void, string>({
      query: (messageId) => ({
        url: `/chat/message/${messageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, messageId) => [
        { type: 'ChatMessage', id: messageId },
        'UserData', // ✅ AJOUT
      ],
    }),
  }),
});

// ============================================================================
// UTILITAIRES
// ============================================================================

const getCurrentUserId = (): string => {
  // ✅ ID utilisateur fourni via AuthContext
  // Les cookies HttpOnly gèrent l'authentification
  return '';
};

const getCurrentUsername = (): string => {
  // ✅ Nom d'utilisateur fourni via AuthContext
  // Les cookies HttpOnly gèrent l'authentification
  return 'Utilisateur';
};

const wsBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_MESSAGERIE_URL || 'http://localhost:8000';
  return baseUrl.replace(/^http/, 'ws');
};

// ============================================================================
// WEBSOCKET SERVICES
// ============================================================================

export const messagerieWebSocket = {
  groupSocketUrl: (groupId: string) => {
    // ✅ Cookies HttpOnly inclus automatiquement via credentials: 'include'
    return `${wsBaseUrl()}/group/ws/group/${groupId}/${getCurrentUsername()}`;
  },

  privateSocketUrl: (receiverId: string) => {
    // ✅ Cookies HttpOnly inclus automatiquement via credentials: 'include'
    const userId = getCurrentUserId();
    return `${wsBaseUrl()}/chat/ws/private/${userId}/${receiverId}`;
  },
  connect: (url: string) => createAuthenticatedWebSocket(url),
};

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  // Queries
  useListGroupsQuery,
  useGetGroupMembersQuery,
  useGetGroupMessagesQuery,
  useGetUnreadSummaryQuery,
  useListPrivateConversationsQuery,
  useGetPrivateMessagesQuery,
  useGetPresenceQuery,

  // Mutations
  useEnsureChatGroupMutation,
  useUpdateGroupClosedStateMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
} = messagerieApi;
