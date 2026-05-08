// frontend/src/services/workspace.service.ts
import { apiFetch } from './api';
import type {
  Workspace,
  JoinedResource,
  WorkspaceAccessListingResponse,
  WorkspaceLocalResourcesResponse,
  WorkspaceNavigationResponse,
} from '../types';

const WORKSPACE_BASE_URL = import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:8003';

export const workspaceService = {
  getMyNavigation: () =>
    apiFetch(WORKSPACE_BASE_URL, '/workspaces/my_navigation') as Promise<WorkspaceNavigationResponse>,
  getMyAccess: () => apiFetch(WORKSPACE_BASE_URL, '/workspaces/my_access') as Promise<WorkspaceAccessListingResponse>,
  getLocalResources: (workspaceId: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${workspaceId}/local_resources`) as Promise<WorkspaceLocalResourcesResponse>,
  getById: (id: string) => apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/get_workspace_detail`),
  create: (data: { nom: string; description?: string }) => apiFetch(WORKSPACE_BASE_URL, '/workspaces/create_workspace', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { nom?: string; description?: string }) => apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/update_workspace`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/delete_workspace`, { method: 'DELETE' }),
  getMembers: (id: string) => apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/list_workspace_members`),
  inviteMember: (
    id: string,
    data: {
      email?: string;
      username?: string;
      role: string;
      id_liste?: string;
      id_tache?: string;
    },
  ) =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/invite_member_workspace`, { method: 'POST', body: JSON.stringify(data) }),
  updateMemberRole: (workspaceId: string, userId: string, role: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${workspaceId}/members/${userId}/update_workspace_member`, { method: 'PUT', body: JSON.stringify({ role }) }),
  removeMember: (workspaceId: string, memberId: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${workspaceId}/members/${memberId}/remove_workspace_member`, { method: 'DELETE' }),
  acceptInvitation: (token: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/invitations/accept`, { method: 'POST', body: JSON.stringify({ token }) }),
  getPendingInvitations: () =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/invitations/list_pending_invitations`),
  leaveWorkspace: (workspaceId: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${workspaceId}/leave_workspace`, { method: 'POST' }),

};
