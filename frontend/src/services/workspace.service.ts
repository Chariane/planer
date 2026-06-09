// frontend/src/services/workspace.service.ts
import { apiFetch } from './api';
import type {
  WorkspaceAccessListingResponse,
  WorkspaceLocalResourcesResponse,
  WorkspaceNavigationResponse,
} from '../types';
import { buildInvitePayload, type InvitePayload } from '../utils/inviteIdentifier';

const WORKSPACE_BASE_URL = import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:8003';

export const workspaceService = {
  // ========== Navigation ==========
  getMyNavigation: () =>
    apiFetch(WORKSPACE_BASE_URL, '/workspaces/my_navigation') as Promise<WorkspaceNavigationResponse>,
  
  getMyAccess: () => 
    apiFetch(WORKSPACE_BASE_URL, '/workspaces/my_access') as Promise<WorkspaceAccessListingResponse>,
  
  getLocalResources: (workspaceId: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${workspaceId}/local_resources`) as Promise<WorkspaceLocalResourcesResponse>,

  // ========== CRUD Workspace ==========
  getById: (id: string) => 
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/get_workspace_detail`),
  
  create: (data: { nom: string; description?: string }) => 
    apiFetch(WORKSPACE_BASE_URL, '/workspaces/create_workspace', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  update: (id: string, data: { nom?: string; description?: string }) => 
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/update_workspace`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  
  delete: (id: string) => 
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/delete_workspace`, { 
      method: 'DELETE' 
    }),

  // ========== Gestion des membres ==========
  getMembers: (id: string) => 
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/list_workspace_members`),
  
  inviteMember: (
    id: string,
    dataOrIdentifier: InvitePayload | string,
    role?: string,
  ) => {
    const data = typeof dataOrIdentifier === 'string'
      ? buildInvitePayload(dataOrIdentifier, role || 'Invité')
      : dataOrIdentifier;

    return apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/invite_member_workspace`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  updateMemberRole: (workspaceId: string, userId: string, role: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${workspaceId}/members/${userId}/update_workspace_member`, { 
      method: 'PUT', 
      body: JSON.stringify({ role }) 
    }),
  
  removeMember: (workspaceId: string, memberId: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${workspaceId}/members/${memberId}/remove_workspace_member`, { 
      method: 'DELETE' 
    }),

  // ========== Invitations ==========
  acceptInvitation: (token: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/invitations/accept`, { 
      method: 'POST', 
      body: JSON.stringify({ token }) 
    }),
  
  getPendingInvitations: () =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/invitations/list_pending_invitations`),

  // ========== Actions utilisateur ==========
  leaveWorkspace: (workspaceId: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/workspaces/${workspaceId}/leave_workspace`, { 
      method: 'POST' 
    }),

  // ========== ADMIN ==========
  getAdminWorkspaces: () =>
    apiFetch(WORKSPACE_BASE_URL, '/admin/workspaces'),

  getAdminWorkspaceMembers: (workspaceId: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/admin/workspaces/${workspaceId}/members`),

  updateAdminWorkspaceMember: (workspaceId: string, userId: string, data: { role?: string; statut?: string }) =>
    apiFetch(WORKSPACE_BASE_URL, `/admin/workspaces/${workspaceId}/members/${userId}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),

  removeAdminWorkspaceMember: (workspaceId: string, userId: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/admin/workspaces/${workspaceId}/members/${userId}`, { 
      method: 'DELETE' 
    }),

  deleteAdminWorkspace: (workspaceId: string) =>
    apiFetch(WORKSPACE_BASE_URL, `/admin/workspaces/${workspaceId}`, { 
      method: 'DELETE' 
    }),
};
