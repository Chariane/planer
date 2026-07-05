// src/store/api/espaceApi.ts
import { baseApi } from './baseApi';
import type {
  EspaceResponse,
  EspaceTreeResponse,
  EspaceCreateRequest,
  EspaceUpdateRequest,
  EspaceMemberResponse,
  EspaceInvitationResponse,
} from '../../types';

export const espaceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ========== QUERIES ==========

    // Récupérer tous les espaces d'un workspace (à plat)
    getEspacesByWorkspace: builder.query<EspaceResponse[], string>({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/list_workspace_espaces`,
      }),
      providesTags: (_result, _error, workspaceId) => [
        { type: 'Workspace', id: workspaceId },
        ...(_result?.map((e) => ({ type: 'Espace' as const, id: e.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // Récupérer l'arborescence complète des espaces d'un workspace
    getEspacesTree: builder.query<EspaceTreeResponse[], string>({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/espaces/tree`,
      }),
      providesTags: (_result, _error, workspaceId) => {
        const tags: Array<{ type: 'Workspace' | 'Espace'; id: string }> = [
          { type: 'Workspace', id: workspaceId },
        ];
        if (_result) {
          // Fonction récursive pour ajouter tous les espaces et sous-espaces
          const addEspaceTags = (espaces: any[]) => {
            for (const e of espaces) {
              tags.push({ type: 'Espace', id: e.id });
              if (e.sous_espaces) {
                addEspaceTags(e.sous_espaces);
              }
            }
          };
          addEspaceTags(_result);
        }
        return tags;
      },
      keepUnusedDataFor: 300, // L'arborescence change peu
    }),

    // Récupérer les espaces racines (niveau 1) d'un workspace
    getWorkspaceRootEspaces: builder.query<EspaceResponse[], string>({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/espaces/roots`,
      }),
      providesTags: (_result, _error, workspaceId) => [
        { type: 'Workspace', id: workspaceId },
        ...(_result?.map((e) => ({ type: 'Espace' as const, id: e.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // Récupérer les sous-espaces d'un espace parent
    getEspaceChildren: builder.query<EspaceResponse[], string>({
      query: (espaceId) => ({
        url: `/espaces/${espaceId}/children`,
      }),
      providesTags: (_result, _error, espaceId) => [
        { type: 'Espace', id: espaceId },
        ...(_result?.map((e) => ({ type: 'Espace' as const, id: e.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // Récupérer les détails d'un espace
    getEspaceDetail: builder.query<EspaceResponse, string>({
      query: (espaceId) => ({
        url: `/espaces/${espaceId}/get_espace`,
      }),
      providesTags: (_result, _error, id) => [
        { type: 'Espace', id },
        ...(_result?.id_workspace ? [{ type: 'Workspace' as const, id: _result.id_workspace }] : []),
      ],
      keepUnusedDataFor: 300,
    }),

    // Récupérer la hiérarchie d'un espace (parents jusqu'à la racine)
    getEspaceHierarchy: builder.query<EspaceResponse[], string>({
      query: (espaceId) => ({
        url: `/espaces/${espaceId}/hierarchy`,
      }),
      providesTags: (_result, _error, espaceId) => [
        { type: 'Espace', id: espaceId },
        ...(_result?.map((e) => ({ type: 'Espace' as const, id: e.id })) ?? []),
      ],
      keepUnusedDataFor: 300,
    }),

    // Récupérer les membres d'un espace
    getEspaceMembers: builder.query<EspaceMemberResponse[], string>({
      query: (espaceId) => ({
        url: `/espaces/${espaceId}/list_members_espace`,
      }),
      providesTags: (_result, _error, espaceId) => [
        { type: 'Espace', id: espaceId },
        ...(_result?.map((m) => ({ type: 'Member' as const, id: m.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // ========== MUTATIONS ==========

    // Créer un espace dans un workspace
    createEspace: builder.mutation<
      EspaceResponse,
      { workspaceId: string; body: EspaceCreateRequest }
    >({
      query: ({ workspaceId, body }) => ({
        url: `/workspaces/${workspaceId}/create_espace`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'Workspace', id: workspaceId },
        'Navigation',
        ...(_result?.id ? [{ type: 'Espace' as const, id: _result.id }] : []),
      ],
    }),

    // Créer un sous-espace dans un espace parent
    createSousEspace: builder.mutation<
      EspaceResponse,
      { espaceId: string; body: EspaceCreateRequest }
    >({
      query: ({ espaceId, body }) => ({
        url: `/espaces/${espaceId}/create_sous_espace`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { espaceId }) => [
        { type: 'Espace', id: espaceId },
        'Navigation',
        ...(_result?.id ? [{ type: 'Espace' as const, id: _result.id }] : []),
        ...(_result?.id_workspace ? [{ type: 'Workspace' as const, id: _result.id_workspace }] : []),
      ],
    }),

    // Mettre à jour un espace
    updateEspace: builder.mutation<
      EspaceResponse,
      { espaceId: string; body: EspaceUpdateRequest }
    >({
      query: ({ espaceId, body }) => ({
        url: `/espaces/${espaceId}/update_espace`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { espaceId, body }) => [
        { type: 'Espace', id: espaceId },
        'Navigation',
        // Si le parent change, invalider l'ancien et le nouveau parent
        ...(_result?.id_espace_parent ? [{ type: 'Espace' as const, id: _result.id_espace_parent }] : []),
        ...(body.id_espace_parent ? [{ type: 'Espace' as const, id: body.id_espace_parent }] : []),
        ...(_result?.id_workspace ? [{ type: 'Workspace' as const, id: _result.id_workspace }] : []),
      ],
    }),

    // Supprimer un espace (et ses sous-espaces)
    deleteEspace: builder.mutation<void, string>({
      query: (espaceId) => ({
        url: `/espaces/${espaceId}/delete_espace`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, espaceId) => [
        { type: 'Espace', id: espaceId },
        'Navigation',
      ],
    }),

    // ========== GESTION DES MEMBRES ==========

    // Inviter un membre dans un espace
    inviteEspaceMember: builder.mutation<
      EspaceInvitationResponse,
      { espaceId: string; identifier: string; role: string }
    >({
      query: ({ espaceId, identifier, role }) => ({
        url: `/espaces/${espaceId}/invite_member_espace`,
        method: 'POST',
        body: { email: identifier, role },
      }),
      invalidatesTags: (_result, _error, { espaceId }) => [
        { type: 'Espace', id: espaceId },
        'Member',
        'Invitation',
      ],
    }),

    // Mettre à jour le rôle d'un membre d'espace
    updateEspaceMemberRole: builder.mutation<
      EspaceMemberResponse,
      { espaceId: string; userId: string; role: string }
    >({
      query: ({ espaceId, userId, role }) => ({
        url: `/espaces/${espaceId}/members/${userId}/update_member_espace`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: (_result, _error, { espaceId, userId }) => [
        { type: 'Espace', id: espaceId },
        { type: 'Member', id: userId },
        'Member',
      ],
    }),

    // Retirer un membre d'un espace
    removeEspaceMember: builder.mutation<void, { espaceId: string; userId: string }>({
      query: ({ espaceId, userId }) => ({
        url: `/espaces/${espaceId}/members/${userId}/remove_member_espace`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { espaceId, userId }) => [
        { type: 'Espace', id: espaceId },
        { type: 'Member', id: userId },
        'Member',
      ],
    }),

    // ========== INVITATIONS ==========

    // Accepter une invitation à un espace
    acceptEspaceInvitation: builder.mutation<EspaceMemberResponse, string>({
      query: (token) => ({
        url: `/espaces/invitations/accept`,
        method: 'POST',
        body: { token },
      }),
      invalidatesTags: ['Espace', 'Member', 'Invitation', 'Navigation'],
    }),
  }),
});

// ========== EXPORTS ==========
export const {
  // Queries
  useGetEspacesByWorkspaceQuery,
  useGetEspacesTreeQuery,
  useGetWorkspaceRootEspacesQuery,
  useGetEspaceChildrenQuery,
  useGetEspaceDetailQuery,
  useGetEspaceHierarchyQuery,
  useGetEspaceMembersQuery,

  // Mutations - Espaces
  useCreateEspaceMutation,
  useCreateSousEspaceMutation,
  useUpdateEspaceMutation,
  useDeleteEspaceMutation,

  // Mutations - Membres
  useInviteEspaceMemberMutation,
  useUpdateEspaceMemberRoleMutation,
  useRemoveEspaceMemberMutation,

  // Mutations - Invitations
  useAcceptEspaceInvitationMutation,
} = espaceApi;