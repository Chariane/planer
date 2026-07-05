// src/hooks/compat/useTacheCompat.ts
import { useCallback } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import {
  useGetTachesByListeQuery,
  useGetTacheDetailQuery,
  useGetTacheMembersQuery,
  useGetKanbanViewQuery,
  useGetGanttViewQuery,
  useGetTableViewQuery,
  useGetChecklistsByTacheQuery,
  useCreateTacheMutation,
  useUpdateTacheMutation,
  useDeleteTacheMutation,
  useBulkUpdateTachesMutation,
  useAssignTacheMemberMutation,
  useUnassignTacheMemberMutation,
  useCreateChecklistInTacheMutation,
  useUpdateChecklistMutation,
  useDeleteChecklistMutation,
  useUpdateTaskStatusFromChecklistsMutation,
} from '../../store/api/tacheApi';
import type { TaskFilters, TacheBulkUpdateItem } from '../../types';

export const useTacheCompat = (listeId?: string, tacheId?: string) => {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  // Tâches de la liste
  const {
    data: taches,
    isLoading: tachesLoading,
    refetch: refetchTaches,
    error: tachesError,
  } = useGetTachesByListeQuery(
    listeId ? { listeId, filters: { sort_by: 'ordre_affichage', order: 'asc' } } : skipToken
  );

  // Détail d'une tâche
  const {
    data: tacheDetail,
    isLoading: detailLoading,
    refetch: refetchDetail,
    error: detailError,
  } = useGetTacheDetailQuery(tacheId ?? skipToken);

  // Membres d'une tâche
  const {
    data: members,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useGetTacheMembersQuery(tacheId ?? skipToken);

  // Checklists d'une tâche
  const {
    data: checklists,
    isLoading: checklistsLoading,
    refetch: refetchChecklists,
  } = useGetChecklistsByTacheQuery(tacheId ?? skipToken);

  // Vues
  const {
    data: kanbanView,
    isLoading: kanbanLoading,
    refetch: refetchKanban,
  } = useGetKanbanViewQuery(listeId ?? skipToken);

  const {
    data: ganttView,
    isLoading: ganttLoading,
    refetch: refetchGantt,
  } = useGetGanttViewQuery(listeId ?? skipToken);

  const {
    data: tableView,
    isLoading: tableLoading,
    refetch: refetchTable,
  } = useGetTableViewQuery(
    listeId ? { listeId, filters: { sort_by: 'ordre_affichage', order: 'asc' } } : skipToken
  );

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const [createTacheRTK] = useCreateTacheMutation();
  const [updateTacheRTK] = useUpdateTacheMutation();
  const [deleteTacheRTK] = useDeleteTacheMutation();
  const [bulkUpdateRTK] = useBulkUpdateTachesMutation();
  const [assignMemberRTK] = useAssignTacheMemberMutation();
  const [unassignMemberRTK] = useUnassignTacheMemberMutation();
  const [createChecklistRTK] = useCreateChecklistInTacheMutation();
  const [updateChecklistRTK] = useUpdateChecklistMutation();
  const [deleteChecklistRTK] = useDeleteChecklistMutation();
  const [updateStatusRTK] = useUpdateTaskStatusFromChecklistsMutation();

  // ==========================================================================
  // FONCTIONS AVEC FALLBACK
  // ==========================================================================

  const getTachesWithFilters = useCallback(
    async (filters?: TaskFilters) => {
      if (!listeId) throw new Error('listeId requis');
      try {
        const result = await refetchTaches();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.getByListe');
        const { tacheService } = await import('../../services/tache.service');
        return await tacheService.getByListe(listeId, filters);
      }
    },
    [listeId, refetchTaches]
  );

  const createTache = useCallback(
    async (data: any) => {
      if (!listeId) throw new Error('listeId requis');
      try {
        return await createTacheRTK({ listeId, body: data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.create');
        const { tacheService } = await import('../../services/tache.service');
        return await tacheService.create(listeId, data);
      }
    },
    [listeId, createTacheRTK]
  );

  const updateTache = useCallback(
    async (id: string, data: any) => {
      try {
        return await updateTacheRTK({ tacheId: id, body: data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.update');
        const { tacheService } = await import('../../services/tache.service');
        return await tacheService.update(id, data);
      }
    },
    [updateTacheRTK]
  );

  const deleteTache = useCallback(
    async (id: string) => {
      try {
        await deleteTacheRTK(id).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.delete');
        const { tacheService } = await import('../../services/tache.service');
        await tacheService.delete(id);
      }
    },
    [deleteTacheRTK]
  );

  const bulkUpdateTaches = useCallback(
    async (items: TacheBulkUpdateItem[]) => {
      try {
        return await bulkUpdateRTK({ items }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.bulkUpdate');
        const { tacheService } = await import('../../services/tache.service');
        return await tacheService.bulkUpdate(items);
      }
    },
    [bulkUpdateRTK]
  );

  const assignMember = useCallback(
    async (userId: string) => {
      if (!tacheId) throw new Error('tacheId requis');
      try {
        return await assignMemberRTK({ tacheId, userId }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.assignMember');
        const { tacheService } = await import('../../services/tache.service');
        return await tacheService.assignMember(tacheId, userId);
      }
    },
    [tacheId, assignMemberRTK]
  );

  const unassignMember = useCallback(
    async (userId: string) => {
      if (!tacheId) throw new Error('tacheId requis');
      try {
        await unassignMemberRTK({ tacheId, userId }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.unassignMember');
        const { tacheService } = await import('../../services/tache.service');
        await tacheService.unassignMember(tacheId, userId);
      }
    },
    [tacheId, unassignMemberRTK]
  );

  const createChecklist = useCallback(
    async (data: { texte: string; is_checked?: boolean }) => {
      if (!tacheId) throw new Error('tacheId requis');
      try {
        return await createChecklistRTK({ tacheId, body: data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.createChecklistInTache');
        const { tacheService } = await import('../../services/tache.service');
        return await tacheService.createChecklistInTache(tacheId, data);
      }
    },
    [tacheId, createChecklistRTK]
  );

  const updateChecklist = useCallback(
    async (checklistId: string, data: { texte?: string; is_checked?: boolean }) => {
      try {
        return await updateChecklistRTK({ checklistId, body: data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.updateChecklist');
        const { tacheService } = await import('../../services/tache.service');
        return await tacheService.updateChecklist(checklistId, data);
      }
    },
    [updateChecklistRTK]
  );

  const deleteChecklist = useCallback(
    async (checklistId: string) => {
      try {
        await deleteChecklistRTK(checklistId).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.deleteChecklist');
        const { tacheService } = await import('../../services/tache.service');
        await tacheService.deleteChecklist(checklistId);
      }
    },
    [deleteChecklistRTK]
  );

  const updateStatusFromChecklists = useCallback(
    async () => {
      if (!tacheId) throw new Error('tacheId requis');
      try {
        return await updateStatusRTK(tacheId).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.updateTaskStatusFromChecklists');
        const { tacheService } = await import('../../services/tache.service');
        return await tacheService.updateTaskStatusFromChecklists(tacheId);
      }
    },
    [tacheId, updateStatusRTK]
  );

  // ==========================================================================
  // REFETCH
  // ==========================================================================

  const refetchAll = useCallback(() => {
    if (listeId) {
      refetchTaches();
      refetchKanban();
      refetchGantt();
      refetchTable();
    }
    if (tacheId) {
      refetchDetail();
      refetchMembers();
      refetchChecklists();
    }
  }, [
    listeId,
    tacheId,
    refetchTaches,
    refetchKanban,
    refetchGantt,
    refetchTable,
    refetchDetail,
    refetchMembers,
    refetchChecklists,
  ]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Données
    taches: taches || [],
    tacheDetail,
    members: members || [],
    checklists: checklists || [],
    kanbanView,
    ganttView: ganttView || [],
    tableView: tableView || [],

    // États de chargement
    isLoading: tachesLoading || detailLoading || membersLoading || checklistsLoading || kanbanLoading || ganttLoading || tableLoading,

    // Erreurs
    errors: {
      taches: tachesError,
      detail: detailError,
    },

    // Fonctions avec fallback
    getTachesWithFilters,
    createTache,
    updateTache,
    deleteTache,
    bulkUpdateTaches,
    assignMember,
    unassignMember,
    createChecklist,
    updateChecklist,
    deleteChecklist,
    updateStatusFromChecklists,

    // Rafraîchissement
    refetch: refetchAll,
    refetchTaches,
    refetchKanban,
    refetchGantt,
    refetchTable,
    refetchDetail,
    refetchMembers,
    refetchChecklists,

    // Service legacy (optionnel)
  };
};