// src/hooks/compat/useWorkspaceCompat.ts
import { useCallback } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { workspaceService } from '../../services/workspace.service';
import {
  useGetMyNavigationQuery,
  useGetMyAccessQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useGetWorkspaceMembersQuery,
  useInviteWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
  useLeaveWorkspaceMutation,
} from '../../store/api/workspaceApi';

export const useWorkspaceCompat = (workspaceId?: string) => {
  // Queries RTK Query
  const {
    data: navigation,
    isLoading: navLoading,
    refetch: refetchNav,
    error: navError,
  } = useGetMyNavigationQuery();

  const {
    data: access,
    isLoading: accessLoading,
    refetch: refetchAccess,
  } = useGetMyAccessQuery();

  const {
    data: members,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useGetWorkspaceMembersQuery(workspaceId ?? skipToken);

  // Mutations RTK Query
  const [createWorkspaceRTK] = useCreateWorkspaceMutation();
  const [updateWorkspaceRTK] = useUpdateWorkspaceMutation();
  const [deleteWorkspaceRTK] = useDeleteWorkspaceMutation();
  const [inviteMemberRTK] = useInviteWorkspaceMemberMutation();
  const [removeMemberRTK] = useRemoveWorkspaceMemberMutation();
  const [leaveWorkspaceRTK] = useLeaveWorkspaceMutation();

  // ⭐ Fonctions avec FALLBACK sur votre service existant
  const createWorkspace = useCallback(
    async (data: { nom: string; description?: string }) => {
      try {
        return await createWorkspaceRTK(data).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> workspaceService.create');
        return await workspaceService.create(data);
      }
    },
    [createWorkspaceRTK]
  );

  const updateWorkspace = useCallback(
    async (id: string, data: { nom?: string; description?: string }) => {
      try {
        return await updateWorkspaceRTK({ id, data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> workspaceService.update');
        return await workspaceService.update(id, data);
      }
    },
    [updateWorkspaceRTK]
  );

  const deleteWorkspace = useCallback(
    async (id: string) => {
      try {
        await deleteWorkspaceRTK(id).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> workspaceService.delete');
        await workspaceService.delete(id);
      }
    },
    [deleteWorkspaceRTK]
  );

  const inviteMember = useCallback(
    async (identifier: string, role: string) => {
      if (!workspaceId) throw new Error('workspaceId requis');
      try {
        return await inviteMemberRTK({ workspaceId, identifier, role }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> workspaceService.inviteMember');
        return await workspaceService.inviteMember(workspaceId, identifier, role);
      }
    },
    [workspaceId, inviteMemberRTK]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!workspaceId) throw new Error('workspaceId requis');
      try {
        await removeMemberRTK({ workspaceId, userId }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> workspaceService.removeMember');
        await workspaceService.removeMember(workspaceId, userId);
      }
    },
    [workspaceId, removeMemberRTK]
  );

  const leaveWorkspace = useCallback(async () => {
    if (!workspaceId) throw new Error('workspaceId requis');
    try {
      await leaveWorkspaceRTK(workspaceId).unwrap();
    } catch (error) {
      console.warn('RTK Query fallback -> workspaceService.leaveWorkspace');
      await workspaceService.leaveWorkspace(workspaceId);
    }
  }, [workspaceId, leaveWorkspaceRTK]);

  return {
    // Données
    navigation,
    access,
    members: members || [],
    isLoading: navLoading || accessLoading || membersLoading,
    errors: {
      navigation: navError,
    },

    // Fonctions avec fallback
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    removeMember,
    leaveWorkspace,

    // Rafraîchissement
    refetch: () => {
      refetchNav();
      refetchAccess();
      if (workspaceId) refetchMembers();
    },

    // Service legacy (si besoin)
    legacy: workspaceService,
  };
};