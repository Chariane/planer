// frontend/src/services/workspace.service.ts
import { apiFetch } from './api';

const WORKSPACE_BASE_URL = import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:8003';

export const workspaceService = {
  getAll: () => apiFetch(WORKSPACE_BASE_URL, '/workspaces'),
  getById: (id: string) => apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}`),
  create: (data: { nom: string; description?: string }) => apiFetch(WORKSPACE_BASE_URL, '/workspaces', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { nom?: string; description?: string }) => apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}`, { method: 'DELETE' }),
  getMembers: (id: string) => apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/members`),
  inviteMember: (id: string, email: string, role: string) => apiFetch(WORKSPACE_BASE_URL, `/workspaces/${id}/invite`, { method: 'POST', body: JSON.stringify({ email, role }) }),
  removeMember: (workspaceId: string, memberId: string) => apiFetch(WORKSPACE_BASE_URL, `/workspaces/${workspaceId}/members/${memberId}`, { method: 'DELETE' }),
  getUserWorkspaces: () => apiFetch(WORKSPACE_BASE_URL, '/workspaces/user/me'),
};