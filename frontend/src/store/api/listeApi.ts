// src/store/api/listeApi.ts
import { baseApi } from './baseApi';
import type {
  ListeResponse,
  ListeCreateRequest,
  ListeUpdateRequest,
  ListeMemberResponse,
  ListeInvitationResponse,
  TacheFullResponse,
  TacheCreateRequest,
  TacheUpdateRequest,
  TacheBulkUpdateItem,
  TacheKanbanResponse,
  TaskFilters,
} from '../../types';

export const listeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================================================
    // QUERIES - LISTES
    // ==========================================================================

    // Récupérer les listes d'un workspace
    getListesByWorkspace: builder.query<ListeResponse[], string>({
      query: (workspaceId) => ({
        url: '/listes/list_projets',
        params: { workspace_id: workspaceId },
      }),
      providesTags: (_result, _error, workspaceId) => [
        { type: 'Workspace', id: workspaceId },
        ...(_result?.map((l) => ({ type: 'Liste' as const, id: l.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // Récupérer les listes d'un espace
    getListesByEspace: builder.query<ListeResponse[], string>({
      query: (espaceId) => ({
        url: '/listes/list_projets',
        params: { espace_id: espaceId },
      }),
      providesTags: (_result, _error, espaceId) => [
        { type: 'Espace', id: espaceId },
        ...(_result?.map((l) => ({ type: 'Liste' as const, id: l.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // Récupérer les détails d'une liste
    getListeDetail: builder.query<ListeResponse, string>({
      query: (listeId) => ({
        url: `/listes/${listeId}/get_liste`,
      }),
      providesTags: (_result, _error, id) => [
        { type: 'Liste', id },
        ...(_result?.id_workspace ? [{ type: 'Workspace' as const, id: _result.id_workspace }] : []),
        ...(_result?.id_espace ? [{ type: 'Espace' as const, id: _result.id_espace }] : []),
      ],
      keepUnusedDataFor: 300,
    }),

    // Récupérer les membres d'une liste
    getListeMembers: builder.query<ListeMemberResponse[], string>({
      query: (listeId) => ({
        url: `/listes/${listeId}/list_members_liste`,
      }),
      providesTags: (_result, _error, listeId) => [
        { type: 'Liste', id: listeId },
        ...(_result?.map((m) => ({ type: 'Member' as const, id: m.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // ==========================================================================
    // QUERIES - TÂCHES
    // ==========================================================================

    // Récupérer les tâches d'une liste (avec filtres)
    getTachesByListe: builder.query<
      TacheFullResponse[],
      { listeId: string; filters?: TaskFilters }
    >({
      query: ({ listeId, filters }) => {
        const params: Record<string, string> = {};
        if (filters?.statut) params.statut = filters.statut;
        if (filters?.priorite) params.priorite = filters.priorite;
        if (filters?.membre_id) params.membre_id = filters.membre_id;
        if (filters?.sort_by) params.sort_by = filters.sort_by;
        if (filters?.order) params.order = filters.order;
        return {
          url: `/listes/${listeId}/list_taches`,
          params,
        };
      },
      providesTags: (_result, _error, { listeId }) => [
        { type: 'Liste', id: listeId },
        ...(_result?.map((t) => ({ type: 'Tache' as const, id: t.id })) ?? []),
      ],
      keepUnusedDataFor: 60, // Données dynamiques
    }),

    // Récupérer la vue Kanban d'une liste
    getKanbanView: builder.query<TacheKanbanResponse, string>({
      query: (listeId) => ({
        url: `/listes/${listeId}/vues/kanban`,
      }),
      providesTags: (_result, _error, listeId) => [
        { type: 'Liste', id: listeId },
        ...(_result?.columns?.flatMap((col) =>
          col.taches?.map((t) => ({ type: 'Tache' as const, id: t.id })) ?? []
        ) ?? []),
      ],
      keepUnusedDataFor: 30, // Très dynamique
    }),

    // Récupérer la vue Gantt d'une liste
    getGanttView: builder.query<TacheFullResponse[], string>({
      query: (listeId) => ({
        url: `/listes/${listeId}/vues/gantt`,
      }),
      providesTags: (_result, _error, listeId) => [
        { type: 'Liste', id: listeId },
        ...(_result?.map((t) => ({ type: 'Tache' as const, id: t.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Récupérer la vue Tableau d'une liste (identique à getTachesByListe)
    getTableView: builder.query<
      TacheFullResponse[],
      { listeId: string; filters?: TaskFilters }
    >({
      query: ({ listeId, filters }) => {
        const params: Record<string, string> = {};
        if (filters?.statut) params.statut = filters.statut;
        if (filters?.priorite) params.priorite = filters.priorite;
        if (filters?.membre_id) params.membre_id = filters.membre_id;
        if (filters?.sort_by) params.sort_by = filters.sort_by;
        if (filters?.order) params.order = filters.order;
        return {
          url: `/listes/${listeId}/vues/tableau`,
          params,
        };
      },
      providesTags: (_result, _error, { listeId }) => [
        { type: 'Liste', id: listeId },
        ...(_result?.map((t) => ({ type: 'Tache' as const, id: t.id })) ?? []),
      ],
      keepUnusedDataFor: 30,
    }),

    // Récupérer le détail d'une tâche
    getTacheDetail: builder.query<TacheFullResponse, string>({
      query: (tacheId) => ({
        url: `/listes/taches/${tacheId}/get_tache`,
      }),
      providesTags: (_result, _error, id) => [
        { type: 'Tache', id },
        ...(_result?.id_liste ? [{ type: 'Liste' as const, id: _result.id_liste }] : []),
      ],
      keepUnusedDataFor: 300,
    }),

    // Récupérer les membres d'une tâche
    getTacheMembers: builder.query<ListeMemberResponse[], string>({
      query: (tacheId) => ({
        url: `/listes/taches/${tacheId}/list_members_tache`,
      }),
      providesTags: (_result, _error, tacheId) => [
        { type: 'Tache', id: tacheId },
        ...(_result?.map((m) => ({ type: 'Member' as const, id: m.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // ==========================================================================
    // MUTATIONS - LISTES
    // ==========================================================================

    // Créer une liste
    createListe: builder.mutation<ListeResponse, ListeCreateRequest>({
      query: (body) => ({
        url: '/listes/create_liste',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, body) => [
        ...(body.id_workspace ? [{ type: 'Workspace' as const, id: body.id_workspace }] : []),
        ...(body.id_espace ? [{ type: 'Espace' as const, id: body.id_espace }] : []),
        'Navigation',
        ...(_result?.id ? [{ type: 'Liste' as const, id: _result.id }] : []),
      ],
    }),

    // Mettre à jour une liste
    updateListe: builder.mutation<
      ListeResponse,
      { listeId: string; body: ListeUpdateRequest }
    >({
      query: ({ listeId, body }) => ({
        url: `/listes/${listeId}/update_liste`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { listeId }) => [
        { type: 'Liste', id: listeId },
        'Navigation',
        ...(_result?.id_workspace ? [{ type: 'Workspace' as const, id: _result.id_workspace }] : []),
        ...(_result?.id_espace ? [{ type: 'Espace' as const, id: _result.id_espace }] : []),
      ],
    }),

    // Supprimer une liste
    deleteListe: builder.mutation<void, string>({
      query: (listeId) => ({
        url: `/listes/${listeId}/delete_liste`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, listeId) => [
        { type: 'Liste', id: listeId },
        'Navigation',
      ],
    }),

    // ==========================================================================
    // MUTATIONS - MEMBRES DE LISTE
    // ==========================================================================

    // Assigner un membre à une liste
    assignListeMember: builder.mutation<
      ListeMemberResponse,
      { listeId: string; userId: string; role?: string }
    >({
      query: ({ listeId, userId, role = 'Membre' }) => ({
        url: `/listes/${listeId}/assign/${userId}/assign_liste`,
        method: 'POST',
        body: { role },
      }),
      invalidatesTags: (_result, _error, { listeId, userId }) => [
        { type: 'Liste', id: listeId },
        { type: 'Member', id: userId },
        'Member',
      ],
    }),

    // Désassigner un membre d'une liste
    unassignListeMember: builder.mutation<
      void,
      { listeId: string; userId: string }
    >({
      query: ({ listeId, userId }) => ({
        url: `/listes/${listeId}/unassign/${userId}/unassign_liste`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { listeId, userId }) => [
        { type: 'Liste', id: listeId },
        { type: 'Member', id: userId },
        'Member',
      ],
    }),

    // Inviter un membre dans une liste
    inviteListeMember: builder.mutation<
      ListeInvitationResponse,
      { listeId: string; identifier: string; role: string }
    >({
      query: ({ listeId, identifier, role }) => ({
        url: `/listes/${listeId}/invite_member_liste`,
        method: 'POST',
        body: { email: identifier, role },
      }),
      invalidatesTags: (_result, _error, { listeId }) => [
        { type: 'Liste', id: listeId },
        'Member',
        'Invitation',
      ],
    }),

    // ==========================================================================
    // MUTATIONS - TÂCHES
    // ==========================================================================

    // Créer une tâche
    createTache: builder.mutation<
      TacheFullResponse,
      { listeId: string; body: TacheCreateRequest }
    >({
      query: ({ listeId, body }) => ({
        url: `/listes/${listeId}/create_tache`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { listeId }) => [
        { type: 'Liste', id: listeId },
        ...(_result?.id ? [{ type: 'Tache' as const, id: _result.id }] : []),
      ],
    }),

    // Mettre à jour une tâche
    updateTache: builder.mutation<
      TacheFullResponse,
      { tacheId: string; body: TacheUpdateRequest }
    >({
      query: ({ tacheId, body }) => ({
        url: `/listes/taches/${tacheId}/update_tache`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { tacheId }) => [
        { type: 'Tache', id: tacheId },
        ...(_result?.id_liste ? [{ type: 'Liste' as const, id: _result.id_liste }] : []),
      ],
    }),

    // Supprimer une tâche
    deleteTache: builder.mutation<void, string>({
      query: (tacheId) => ({
        url: `/listes/taches/${tacheId}/delete_tache`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, tacheId) => [
        { type: 'Tache', id: tacheId },
      ],
    }),

    // Mise à jour groupée des tâches
    bulkUpdateTaches: builder.mutation<
      { message: string },
      { items: TacheBulkUpdateItem[] }
    >({
      query: (body) => ({
        url: '/listes/taches/bulk_update_taches',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { items }) => [
        ...(items?.map((item) => ({ type: 'Tache' as const, id: item.id })) ?? []),
      ],
    }),

    // ==========================================================================
    // MUTATIONS - ASSIGNATIONS DE TÂCHES
    // ==========================================================================

    // Assigner un membre à une tâche
    assignTacheMember: builder.mutation<
      ListeMemberResponse,
      { tacheId: string; userId: string }
    >({
      query: ({ tacheId, userId }) => ({
        url: `/listes/taches/${tacheId}/assign/${userId}/assign_tache`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { tacheId, userId }) => [
        { type: 'Tache', id: tacheId },
        { type: 'Member', id: userId },
        'Member',
      ],
    }),

    // Désassigner un membre d'une tâche
    unassignTacheMember: builder.mutation<
      void,
      { tacheId: string; userId: string }
    >({
      query: ({ tacheId, userId }) => ({
        url: `/listes/taches/${tacheId}/unassign/${userId}/unassign_tache`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tacheId, userId }) => [
        { type: 'Tache', id: tacheId },
        { type: 'Member', id: userId },
        'Member',
      ],
    }),

    // ==========================================================================
    // MUTATIONS - INVITATIONS
    // ==========================================================================

    // Accepter une invitation à une liste
    acceptListeInvitation: builder.mutation<ListeMemberResponse, string>({
      query: (token) => ({
        url: '/listes/invitations/accept',
        method: 'POST',
        body: { token },
      }),
      invalidatesTags: ['Liste', 'Member', 'Invitation', 'Navigation'],
    }),
  }),
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  // Queries - Listes
  useGetListesByWorkspaceQuery,
  useGetListesByEspaceQuery,
  useGetListeDetailQuery,
  useGetListeMembersQuery,

  // Queries - Tâches
  useGetTachesByListeQuery,
  useGetKanbanViewQuery,
  useGetGanttViewQuery,
  useGetTableViewQuery,
  useGetTacheDetailQuery,
  useGetTacheMembersQuery,

  // Mutations - Listes
  useCreateListeMutation,
  useUpdateListeMutation,
  useDeleteListeMutation,

  // Mutations - Membres de liste
  useAssignListeMemberMutation,
  useUnassignListeMemberMutation,
  useInviteListeMemberMutation,

  // Mutations - Tâches
  useCreateTacheMutation,
  useUpdateTacheMutation,
  useDeleteTacheMutation,
  useBulkUpdateTachesMutation,

  // Mutations - Assignations de tâches
  useAssignTacheMemberMutation,
  useUnassignTacheMemberMutation,

  // Mutations - Invitations
  useAcceptListeInvitationMutation,
} = listeApi;