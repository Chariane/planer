// src/store/api/tacheApi.ts
import { baseApi } from './baseApi';
import type {
  TacheFullResponse,
  TacheCreateRequest,
  TacheUpdateRequest,
  TacheBulkUpdateItem,
  TacheKanbanResponse,
  TaskFilters,
  ListeMemberResponse,
  ApiChecklist,
} from '../../types';

export const tacheApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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
      keepUnusedDataFor: 60,
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
    // QUERIES - VUES
    // ==========================================================================

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
      keepUnusedDataFor: 30,
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

    // Récupérer la vue Tableau d'une liste
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

    // ==========================================================================
    // QUERIES - CHECKLISTS
    // ==========================================================================

    // Récupérer les checklists d'une tâche
    getChecklistsByTache: builder.query<ApiChecklist[], string>({
      query: (tacheId) => ({
        url: `/listes/taches/${tacheId}/checklists`,
      }),
      providesTags: (_result, _error, tacheId) => [
        { type: 'Tache', id: tacheId },
        ...(_result?.map((c) => ({ type: 'Checklist' as const, id: c.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
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
    // MUTATIONS - CHECKLISTS
    // ==========================================================================

    // Créer une checklist dans une tâche
    createChecklistInTache: builder.mutation<
      ApiChecklist,
      { tacheId: string; body: { texte: string; is_checked?: boolean } }
    >({
      query: ({ tacheId, body }) => ({
        url: `/listes/taches/${tacheId}/checklists`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { tacheId }) => [
        { type: 'Tache', id: tacheId },
        ...(_result?.id ? [{ type: 'Checklist' as const, id: _result.id }] : []),
      ],
    }),

    // Mettre à jour une checklist
    updateChecklist: builder.mutation<
      ApiChecklist,
      { checklistId: string; body: { texte?: string; is_checked?: boolean; id_section?: string | null; id_tache?: string | null } }
    >({
      query: ({ checklistId, body }) => ({
        url: `/listes/checklists/${checklistId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { checklistId }) => [
        { type: 'Checklist', id: checklistId },
        ...(_result?.id_tache ? [{ type: 'Tache' as const, id: _result.id_tache }] : []),
        ...(_result?.id_section ? [{ type: 'Section' as const, id: _result.id_section }] : []),
      ],
    }),

    // Supprimer une checklist
    deleteChecklist: builder.mutation<void, string>({
      query: (checklistId) => ({
        url: `/listes/checklists/${checklistId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, checklistId) => [
        { type: 'Checklist', id: checklistId },
      ],
    }),

    // Mettre à jour le statut d'une tâche depuis ses checklists
    updateTaskStatusFromChecklists: builder.mutation<
      { message: string },
      string
    >({
      query: (tacheId) => ({
        url: `/listes/taches/${tacheId}/update-status-from-checklists`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, tacheId) => [
        { type: 'Tache', id: tacheId },
        { type: 'Liste' },
      ],
    }),
  }),
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  // Queries - Tâches
  useGetTachesByListeQuery,
  useGetTacheDetailQuery,
  useGetTacheMembersQuery,

  // Queries - Vues
  useGetKanbanViewQuery,
  useGetGanttViewQuery,
  useGetTableViewQuery,

  // Queries - Checklists
  useGetChecklistsByTacheQuery,

  // Mutations - Tâches
  useCreateTacheMutation,
  useUpdateTacheMutation,
  useDeleteTacheMutation,
  useBulkUpdateTachesMutation,

  // Mutations - Assignations
  useAssignTacheMemberMutation,
  useUnassignTacheMemberMutation,

  // Mutations - Checklists
  useCreateChecklistInTacheMutation,
  useUpdateChecklistMutation,
  useDeleteChecklistMutation,
  useUpdateTaskStatusFromChecklistsMutation,
} = tacheApi;