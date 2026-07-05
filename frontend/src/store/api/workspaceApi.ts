// src/store/api/workspaceApi.ts - VERSION CORRIGÉE
import { baseApi } from './baseApi';
export { skipToken } from '@reduxjs/toolkit/query/react';
import type {
  Workspace,
  Member,
  WorkspaceAccessListingResponse,
  WorkspaceLocalResourcesResponse,
  WorkspaceNavigationResponse,
} from '../../types';

export const workspaceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ========== Navigation ==========
    getMyNavigation: builder.query<WorkspaceNavigationResponse, void>({
      query: () => ({ url: '/workspaces/my_navigation' }),
      providesTags: ['Navigation', 'Workspace'],
      keepUnusedDataFor: 300,
    }),

    getMyAccess: builder.query<WorkspaceAccessListingResponse, void>({
      query: () => ({ url: '/workspaces/my_access' }),
      providesTags: ['Workspace'],
      keepUnusedDataFor: 120,
    }),

    getLocalResources: builder.query<WorkspaceLocalResourcesResponse, string>({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/local_resources`,
      }),
      providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
    }),

    // ========== CRUD Workspace ==========
    getWorkspaceById: builder.query<Workspace, string>({
      query: (id) => ({ url: `/workspaces/${id}/get_workspace_detail` }),
      providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
      keepUnusedDataFor: 300,
    }),

    createWorkspace: builder.mutation<Workspace, { nom: string; description?: string }>({
      query: (data) => ({
        url: '/workspaces/create_workspace',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Workspace', 'Navigation'],
    }),

    updateWorkspace: builder.mutation<
      Workspace,
      { id: string; data: { nom?: string; description?: string } }
    >({
      query: ({ id, data }) => ({
        url: `/workspaces/${id}/update_workspace`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Workspace', id }, 'Navigation'],
    }),

    deleteWorkspace: builder.mutation<void, string>({
      query: (id) => ({
        url: `/workspaces/${id}/delete_workspace`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Workspace', 'Navigation'],
    }),

    // ========== Membres ==========
    getWorkspaceMembers: builder.query<Member[], string>({
      query: (id) => ({ url: `/workspaces/${id}/list_workspace_members` }),
      providesTags: (result, _error, id) => [
        { type: 'Workspace', id },
        ...(result?.map((m) => ({ type: 'Member' as const, id: m.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    inviteWorkspaceMember: builder.mutation<
      any,
      { workspaceId: string; identifier: string; role: string }
    >({
      query: ({ workspaceId, identifier, role }) => ({
        url: `/workspaces/${workspaceId}/invite_member_workspace`,
        method: 'POST',
        body: { email: identifier, role },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'Workspace', id: workspaceId },
        'Member',
        'Invitation',
      ],
    }),

    removeWorkspaceMember: builder.mutation<void, { workspaceId: string; userId: string }>({
      query: ({ workspaceId, userId }) => ({
        url: `/workspaces/${workspaceId}/members/${userId}/remove_workspace_member`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { workspaceId, userId }) => [
        { type: 'Workspace', id: workspaceId },
        { type: 'Member', id: userId },
        'Member',
      ],
    }),

    leaveWorkspace: builder.mutation<void, string>({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/leave_workspace`,
        method: 'POST',
      }),
      invalidatesTags: ['Workspace', 'Navigation'],
    }),
  }),
});

export const {
  useGetMyNavigationQuery,
  useGetMyAccessQuery,
  useGetLocalResourcesQuery,
  useGetWorkspaceByIdQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useGetWorkspaceMembersQuery,
  useInviteWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
  useLeaveWorkspaceMutation,
} = workspaceApi;