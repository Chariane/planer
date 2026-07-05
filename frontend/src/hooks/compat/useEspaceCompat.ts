// src/hooks/compat/useEspaceCompat.ts
import { useCallback } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { espaceService } from '../../services/espace.service';
import {
  useGetEspacesTreeQuery,
  useGetEspacesByWorkspaceQuery,
  useGetEspaceDetailQuery,
  useGetEspaceMembersQuery,
  useCreateEspaceMutation,
  useCreateSousEspaceMutation,
  useUpdateEspaceMutation,
  useDeleteEspaceMutation,
  useInviteEspaceMemberMutation,
  useUpdateEspaceMemberRoleMutation,
  useRemoveEspaceMemberMutation,
} from '../../store/api/espaceApi';

export const useEspaceCompat = (workspaceId?: string, espaceId?: string) => {
  // ========== QUERIES ==========

  // Arborescence des espaces du workspace
  const {
    data: espacesTree,
    isLoading: treeLoading,
    refetch: refetchTree,
    error: treeError,
  } = useGetEspacesTreeQuery(workspaceId ?? skipToken);

  // Liste des espaces du workspace (à plat)
  const {
    data: espacesFlat,
    isLoading: flatLoading,
    refetch: refetchFlat,
  } = useGetEspacesByWorkspaceQuery(workspaceId ?? skipToken);

  // Détail d'un espace spécifique
  const {
    data: espaceDetail,
    isLoading: detailLoading,
    refetch: refetchDetail,
  } = useGetEspaceDetailQuery(espaceId ?? skipToken);

  // Membres d'un espace
  const {
    data: members,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useGetEspaceMembersQuery(espaceId ?? skipToken);

  // ========== MUTATIONS ==========

  const [createEspaceRTK] = useCreateEspaceMutation();
  const [createSousEspaceRTK] = useCreateSousEspaceMutation();
  const [updateEspaceRTK] = useUpdateEspaceMutation();
  const [deleteEspaceRTK] = useDeleteEspaceMutation();
  const [inviteMemberRTK] = useInviteEspaceMemberMutation();
  const [updateMemberRoleRTK] = useUpdateEspaceMemberRoleMutation();
  const [removeMemberRTK] = useRemoveEspaceMemberMutation();

  // ========== FONCTIONS AVEC FALLBACK ==========

  const createEspace = useCallback(
    async (workspaceId: string, data: { nom: string; description?: string }) => {
      try {
        return await createEspaceRTK({ workspaceId, body: data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> espaceService.create');
        return await espaceService.create({ ...data, id_workspace: workspaceId });
      }
    },
    [createEspaceRTK]
  );

  const createSousEspace = useCallback(
    async (parentEspaceId: string, data: { nom: string; description?: string }) => {
      try {
        return await createSousEspaceRTK({ espaceId: parentEspaceId, body: data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> espaceService.create');
        return await espaceService.create({ ...data, id_espace_parent: parentEspaceId });
      }
    },
    [createSousEspaceRTK]
  );

  const updateEspace = useCallback(
    async (espaceId: string, data: { nom?: string; description?: string; id_espace_parent?: string }) => {
      try {
        return await updateEspaceRTK({ espaceId, body: data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> espaceService.update');
        return await espaceService.update(espaceId, data);
      }
    },
    [updateEspaceRTK]
  );

  const deleteEspace = useCallback(
    async (espaceId: string) => {
      try {
        await deleteEspaceRTK(espaceId).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> espaceService.delete');
        await espaceService.delete(espaceId);
      }
    },
    [deleteEspaceRTK]
  );

  const inviteMember = useCallback(
    async (espaceId: string, identifier: string, role: string) => {
      try {
        return await inviteMemberRTK({ espaceId, identifier, role }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> espaceService.inviteMember');
        return await espaceService.inviteMember(espaceId, identifier, role);
      }
    },
    [inviteMemberRTK]
  );

  const updateMemberRole = useCallback(
    async (espaceId: string, userId: string, role: string) => {
      try {
        return await updateMemberRoleRTK({ espaceId, userId, role }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> espaceService.updateMemberRole');
        return await espaceService.updateMemberRole(espaceId, userId, role);
      }
    },
    [updateMemberRoleRTK]
  );

  const removeMember = useCallback(
    async (espaceId: string, userId: string) => {
      try {
        await removeMemberRTK({ espaceId, userId }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> espaceService.removeMember');
        await espaceService.removeMember(espaceId, userId);
      }
    },
    [removeMemberRTK]
  );

  // ========== REFETCH ==========

  const refetchAll = useCallback(() => {
    refetchTree();
    refetchFlat();
    if (espaceId) {
      refetchDetail();
      refetchMembers();
    }
  }, [refetchTree, refetchFlat, refetchDetail, refetchMembers, espaceId]);

  // ========== RETURN ==========

  return {
    // Données
    espacesTree,
    espacesFlat,
    espaceDetail,
    members: members || [],

    // États de chargement
    isLoading: treeLoading || flatLoading || detailLoading || membersLoading,

    // Erreurs
    errors: {
      tree: treeError,
    },

    // Fonctions avec fallback
    createEspace,
    createSousEspace,
    updateEspace,
    deleteEspace,
    inviteMember,
    updateMemberRole,
    removeMember,

    // Rafraîchissement
    refetch: refetchAll,

    // Service legacy
    legacy: espaceService,
  };
};