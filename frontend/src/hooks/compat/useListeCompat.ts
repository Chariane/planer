// src/hooks/compat/useListeCompat.ts
import { useCallback } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { listeService } from '../../services/liste.service';
import {
  useGetListeDetailQuery,
  useGetListeMembersQuery,
  useGetTachesByListeQuery,
  useGetKanbanViewQuery,
  useGetGanttViewQuery,
  useGetTableViewQuery,
  useCreateListeMutation,
  useUpdateListeMutation,
  useDeleteListeMutation,
  useAssignListeMemberMutation,
  useUnassignListeMemberMutation,
  useInviteListeMemberMutation,
  useCreateTacheMutation,
  useUpdateTacheMutation,
  useDeleteTacheMutation,
  useBulkUpdateTachesMutation,
  useAssignTacheMemberMutation,
  useUnassignTacheMemberMutation,
} from '../../store/api/listeApi';
import type { TaskFilters, TacheBulkUpdateItem } from '../../types';

export const useListeCompat = (listeId?: string) => {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  // Détail de la liste
  const {
    data: listeDetail,
    isLoading: detailLoading,
    refetch: refetchDetail,
    error: detailError,
  } = useGetListeDetailQuery(listeId ?? skipToken);

  // Membres de la liste
  const {
    data: members,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useGetListeMembersQuery(listeId ?? skipToken);

  // Tâches de la liste
  const {
    data: taches,
    isLoading: tachesLoading,
    refetch: refetchTaches,
    error: tachesError,
  } = useGetTachesByListeQuery(
    listeId ? { listeId, filters: { sort_by: 'ordre_affichage', order: 'asc' } } : skipToken
  );

  // Vue Kanban
  const {
    data: kanbanView,
    isLoading: kanbanLoading,
    refetch: refetchKanban,
  } = useGetKanbanViewQuery(listeId ?? skipToken);

  // Vue Gantt
  const {
    data: ganttView,
    isLoading: ganttLoading,
    refetch: refetchGantt,
  } = useGetGanttViewQuery(listeId ?? skipToken);

  // Vue Tableau
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

  const [createListeRTK] = useCreateListeMutation();
  const [updateListeRTK] = useUpdateListeMutation();
  const [deleteListeRTK] = useDeleteListeMutation();
  const [assignMemberRTK] = useAssignListeMemberMutation();
  const [unassignMemberRTK] = useUnassignListeMemberMutation();
  const [inviteMemberRTK] = useInviteListeMemberMutation();
  const [createTacheRTK] = useCreateTacheMutation();
  const [updateTacheRTK] = useUpdateTacheMutation();
  const [deleteTacheRTK] = useDeleteTacheMutation();
  const [bulkUpdateRTK] = useBulkUpdateTachesMutation();
  const [assignTacheMemberRTK] = useAssignTacheMemberMutation();
  const [unassignTacheMemberRTK] = useUnassignTacheMemberMutation();

  // ==========================================================================
  // FONCTIONS AVEC FALLBACK
  // ==========================================================================

  // --- Listes ---

  const createListe = useCallback(
    async (data: { nom: string; description?: string; id_espace?: string; id_workspace?: string }) => {
      try {
        return await createListeRTK(data).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> listeService.create');
        return await listeService.create(data);
      }
    },
    [createListeRTK]
  );

  const updateListe = useCallback(
    async (id: string, data: { nom?: string; description?: string }) => {
      try {
        return await updateListeRTK({ listeId: id, body: data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> listeService.update');
        return await listeService.update(id, data);
      }
    },
    [updateListeRTK]
  );

  const deleteListe = useCallback(
    async (id: string) => {
      try {
        await deleteListeRTK(id).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> listeService.delete');
        await listeService.delete(id);
      }
    },
    [deleteListeRTK]
  );

  // --- Membres ---

  const assignMember = useCallback(
    async (userId: string, role: string = 'Membre') => {
      if (!listeId) throw new Error('listeId requis');
      try {
        return await assignMemberRTK({ listeId, userId, role }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> listeService.assignMember');
        return await listeService.assignMember(listeId, userId, role);
      }
    },
    [listeId, assignMemberRTK]
  );

  const unassignMember = useCallback(
    async (userId: string) => {
      if (!listeId) throw new Error('listeId requis');
      try {
        await unassignMemberRTK({ listeId, userId }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> listeService.unassignMember');
        await listeService.unassignMember(listeId, userId);
      }
    },
    [listeId, unassignMemberRTK]
  );

  const inviteMember = useCallback(
    async (identifier: string, role: string) => {
      if (!listeId) throw new Error('listeId requis');
      try {
        return await inviteMemberRTK({ listeId, identifier, role }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> listeService.inviteMember');
        return await listeService.inviteMember(listeId, identifier, role);
      }
    },
    [listeId, inviteMemberRTK]
  );

  // --- Tâches ---

  const createTache = useCallback(
    async (data: any) => {
      if (!listeId) throw new Error('listeId requis');
      try {
        return await createTacheRTK({ listeId, body: data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.create');
        // Fallback vers tacheService (à importer si nécessaire)
        const { tacheService } = await import('../../services/tache.service');
        return await tacheService.create(listeId, data);
      }
    },
    [listeId, createTacheRTK]
  );

  const updateTache = useCallback(
    async (tacheId: string, data: any) => {
      try {
        return await updateTacheRTK({ tacheId, body: data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.update');
        const { tacheService } = await import('../../services/tache.service');
        return await tacheService.update(tacheId, data);
      }
    },
    [updateTacheRTK]
  );

  const deleteTache = useCallback(
    async (tacheId: string) => {
      try {
        await deleteTacheRTK(tacheId).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.delete');
        const { tacheService } = await import('../../services/tache.service');
        await tacheService.delete(tacheId);
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

  const assignTacheMember = useCallback(
    async (tacheId: string, userId: string) => {
      try {
        return await assignTacheMemberRTK({ tacheId, userId }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.assignMember');
        const { tacheService } = await import('../../services/tache.service');
        return await tacheService.assignMember(tacheId, userId);
      }
    },
    [assignTacheMemberRTK]
  );

  const unassignTacheMember = useCallback(
    async (tacheId: string, userId: string) => {
      try {
        await unassignTacheMemberRTK({ tacheId, userId }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> tacheService.unassignMember');
        const { tacheService } = await import('../../services/tache.service');
        await tacheService.unassignMember(tacheId, userId);
      }
    },
    [unassignTacheMemberRTK]
  );

  // ==========================================================================
  // REFETCH
  // ==========================================================================

  const refetchAll = useCallback(() => {
    if (listeId) {
      refetchDetail();
      refetchMembers();
      refetchTaches();
      refetchKanban();
      refetchGantt();
      refetchTable();
    }
  }, [
    listeId,
    refetchDetail,
    refetchMembers,
    refetchTaches,
    refetchKanban,
    refetchGantt,
    refetchTable,
  ]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Données
    listeDetail,
    members: members || [],
    taches: taches || [],
    kanbanView,
    ganttView: ganttView || [],
    tableView: tableView || [],

    // États de chargement
    isLoading: detailLoading || membersLoading || tachesLoading || kanbanLoading || ganttLoading || tableLoading,

    // Erreurs
    errors: {
      detail: detailError,
      taches: tachesError,
    },

    // Fonctions avec fallback - Listes
    createListe,
    updateListe,
    deleteListe,

    // Fonctions avec fallback - Membres
    assignMember,
    unassignMember,
    inviteMember,

    // Fonctions avec fallback - Tâches
    createTache,
    updateTache,
    deleteTache,
    bulkUpdateTaches,
    assignTacheMember,
    unassignTacheMember,

    // Rafraîchissement
    refetch: refetchAll,

    // Rafraîchissement spécifique
    refetchTaches,
    refetchKanban,
    refetchGantt,
    refetchTable,

    // Service legacy
    legacy: listeService,
  };
};