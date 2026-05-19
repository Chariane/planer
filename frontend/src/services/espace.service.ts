// frontend/src/services/espace.service.ts
import { apiFetch } from './api';

const ESPACE_BASE_URL = import.meta.env.VITE_ESPACE_URL || 'http://localhost:8001';

export const espaceService = {
  // ========== Récupération des espaces ==========
  getByWorkspace: (workspaceId: string) => 
    apiFetch(ESPACE_BASE_URL, `/workspaces/${workspaceId}/list_workspace_espaces`),
  
  getTree: (workspaceId: string) => 
    apiFetch(ESPACE_BASE_URL, `/workspaces/${workspaceId}/espaces/tree`),
  
  getById: (id: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${id}/get_espace`),

  getHierarchy: (id: string) =>
    apiFetch(ESPACE_BASE_URL, `/espaces/${id}/hierarchy`),
  
  getSubSpaces: (espaceId: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${espaceId}/children`),
  
  // ========== CRUD Espace ==========
  create: async (data: { nom: string; description?: string; id_workspace: string; id_espace_parent?: string }) => {
    if (data.id_espace_parent) {
      return apiFetch(ESPACE_BASE_URL, `/espaces/${data.id_espace_parent}/create_sous_espace`, {
        method: 'POST',
        body: JSON.stringify({ nom: data.nom, description: data.description }),
      });
    } else {
      return apiFetch(ESPACE_BASE_URL, `/workspaces/${data.id_workspace}/create_espace`, {
        method: 'POST',
        body: JSON.stringify({ nom: data.nom, description: data.description }),
      });
    }
  },
  
  update: (id: string, data: { nom?: string; description?: string; id_espace_parent?: string }) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${id}/update_espace`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  
  delete: (id: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${id}/delete_espace`, { 
      method: 'DELETE' 
    }),
  
  // ========== Gestion des membres ==========
  getMembers: (espaceId: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${espaceId}/list_members_espace`),
  
  inviteMember: (espaceId: string, email: string, role: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${espaceId}/invite_member_espace`, { 
      method: 'POST', 
      body: JSON.stringify({ email, role }) 
    }),
  
  updateMemberRole: (espaceId: string, userId: string, role: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${espaceId}/members/${userId}/update_member_espace`, { 
      method: 'PUT', 
      body: JSON.stringify({ role }) 
    }),
  
  removeMember: (espaceId: string, userId: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${espaceId}/members/${userId}/remove_member_espace`, { 
      method: 'DELETE' 
    }),
  
  // ========== Invitations ==========
  acceptInvitation: (token: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/invitations/accept`, { 
      method: 'POST', 
      body: JSON.stringify({ token }) 
    }),
  
  // Alias pour compatibilité
  updateMember: (espaceId: string, userId: string, role: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${espaceId}/members/${userId}/update_member_espace`, { 
      method: 'PUT', 
      body: JSON.stringify({ role }) 
    }),
  
  // ========== Actions utilisateur ==========
  getAdminEspaces: () => 
    apiFetch(ESPACE_BASE_URL, `/espaces/admin`),
  
  leaveEspace: (espaceId: string) => 
    apiFetch(ESPACE_BASE_URL, `/espaces/${espaceId}/leave`, { 
      method: 'POST' 
    }),

  // ========== ADMIN ==========
  getAdminEspaceMembers: (espaceId: string) =>
    apiFetch(ESPACE_BASE_URL, `/admin/espaces/${espaceId}/members`),

  updateAdminEspaceMember: (espaceId: string, userId: string, data: { role?: string; statut?: string }) =>
    apiFetch(ESPACE_BASE_URL, `/admin/espaces/${espaceId}/members/${userId}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),

  removeAdminEspaceMember: (espaceId: string, userId: string) =>
    apiFetch(ESPACE_BASE_URL, `/admin/espaces/${espaceId}/members/${userId}`, { 
      method: 'DELETE' 
    }),

  deleteAdminEspace: (espaceId: string) =>
    apiFetch(ESPACE_BASE_URL, `/admin/espaces/${espaceId}`, { 
      method: 'DELETE' 
    }),
};
