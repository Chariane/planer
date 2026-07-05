// src/store/api/workspaceApi.ts - VERSION CORRIGÉE
import { baseApi } from './baseApi';

export const workspaceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Navigation
    getMyNavigation: builder.query<any, void>({
      query: () => ({ url: '/workspaces/my_navigation' }),
      providesTags: ['Navigation', 'Workspace'],
      keepUnusedDataFor: 300,
    }),

    getMyAccess: builder.query<any, void>({
      query: () => ({ url: '/workspaces/my_access' }),
      providesTags: ['Workspace'],
      keepUnusedDataFor: 120,
    }),

    getLocalResources: builder.query<any, string>({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/local_resources`,
      }),
      providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
    }),

    // CRUD Workspace
    getWorkspaceById: builder.query<any, string>({
      query: (id) => ({ url: `/workspaces/${id}/get_workspace_detail` }),
      providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
      keepUnusedDataFor: 300,
    }),

    createWorkspace: builder.mutation<any, { nom: string; description?: string }>({
      query: (data) => ({
        url: '/workspaces/create_workspace',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Workspace', 'Navigation'],
    }),

    updateWorkspace: builder.mutation<
      any,
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

    inviteWorkspaceMember: builder.mutation<
      any,
      { workspaceId: string; identifier: string; role?: string }
    >({
      query: ({ workspaceId, identifier, role }) => ({
        url: `/workspaces/${workspaceId}/invite_member_workspace`,
        method: 'POST',
        body: { identifier, role },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'Workspace', id: workspaceId },
        { type: 'Member', id: 'LIST' },
      ],
    }),

    removeWorkspaceMember: builder.mutation<
      void,
      { workspaceId: string; userId: string }
    >({
      query: ({ workspaceId, userId }) => ({
        url: `/workspaces/${workspaceId}/members/${userId}/remove_workspace_member`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { workspaceId, userId }) => [
        { type: 'Workspace', id: workspaceId },
        { type: 'Member', id: userId },
      ],
    }),

    leaveWorkspace: builder.mutation<void, string>({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/leave_workspace`,
        method: 'POST',
      }),
      invalidatesTags: ['Workspace', 'Navigation'],
    }),

    // Membres
    getWorkspaceMembers: builder.query<any[], string>({
      query: (id) => ({ url: `/workspaces/${id}/list_workspace_members` }),
      providesTags: (result, _error, id) => [
        { type: 'Workspace', id },
        ...(result?.map((m) => ({ type: 'Member' as const, id: m.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
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
  useInviteWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
  useLeaveWorkspaceMutation,
  useGetWorkspaceMembersQuery,
} = workspaceApi;