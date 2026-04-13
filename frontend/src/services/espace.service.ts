import { apiFetch } from './api';

const ESPACE_BASE_URL = import.meta.env.VITE_ESPACE_URL || 'http://localhost:8001';

export const espaceService = {
  getByWorkspace: (workspaceId: string) => apiFetch(ESPACE_BASE_URL, `/espaces?workspace_id=${workspaceId}`),
  create: (data: { nom: string; description?: string; id_workspace: string; id_espace_parent?: string }) => apiFetch(ESPACE_BASE_URL, '/espaces', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { nom?: string; description?: string; id_espace_parent?: string }) => apiFetch(ESPACE_BASE_URL, `/espaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(ESPACE_BASE_URL, `/espaces/${id}`, { method: 'DELETE' }),
};