// frontend/src/services/espace.service.ts
import { apiFetch } from './api';

const ESPACE_BASE_URL = import.meta.env.VITE_ESPACE_URL || 'http://localhost:8001';

export const espaceService = {
  // Correction : utiliser le bon endpoint avec workspace_id dans l'URL
  getByWorkspace: (workspaceId: string) => 
    apiFetch(ESPACE_BASE_URL, `/workspaces/${workspaceId}/espaces`),
  
  create: (data: { nom: string; description?: string; id_workspace: string; id_espace_parent?: string }) => 
    apiFetch(ESPACE_BASE_URL, `/workspaces/${data.id_workspace}/espaces`, { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: { nom?: string; description?: string; id_espace_parent?: string }) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${id}`, { method: 'DELETE' }),
  
  getMembers: (espaceId: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${espaceId}/members`),
  
  inviteMember: (espaceId: string, email: string, role: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${espaceId}/members`, { method: 'POST', body: JSON.stringify({ email, role }) }),
  
  updateMember: (espaceId: string, userId: string, role: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${espaceId}/members/${userId}`, { method: 'PUT', body: JSON.stringify({ role }) }),
  
  removeMember: (espaceId: string, userId: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${espaceId}/members/${userId}`, { method: 'DELETE' }),
};