// frontend/src/services/liste.service.ts
import { apiFetch } from './api';
import type { List } from '../types';
import { buildInvitePayload } from '../utils/inviteIdentifier';

const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';

export interface ListeCreateData {
  nom: string;
  description?: string;
  id_espace?: string;
  id_workspace?: string;
}

export interface ListeUpdateData {
  nom?: string;
  description?: string;
  id_espace?: string;
  id_workspace?: string;
}

export const listeService = {
  // ========== CRUD Listes ==========
  getByEspace: (espaceId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/list_projets?espace_id=${espaceId}`),

  getByWorkspace: (workspaceId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/list_projets?workspace_id=${workspaceId}`),

  getDashboardStats: () =>
    apiFetch(LISTE_TACHE_BASE_URL, '/dashboard/stats'),

  getById: (id: string): Promise<List> =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${id}/get_liste`),

  create: (data: ListeCreateData) => {
    if ((data.id_espace && data.id_workspace) || (!data.id_espace && !data.id_workspace)) {
      throw new Error("Il faut fournir exactement id_espace ou id_workspace, pas les deux, ni aucun.");
    }
    return apiFetch(LISTE_TACHE_BASE_URL, '/listes/create_liste', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  update: (id: string, data: ListeUpdateData) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${id}/update_liste`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${id}/delete_liste`, {
      method: 'DELETE'
    }),

  // ========== Gestion des membres ==========
  getMembers: (listeId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/list_members_liste`),

  assignMember: (listeId: string, utilisateurId: string, role: string = 'Membre') =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/assign/${utilisateurId}/assign_liste`, {
      method: 'POST',
      body: JSON.stringify({ role })
    }),

  unassignMember: (listeId: string, utilisateurId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/unassign/${utilisateurId}/unassign_liste`, {
      method: 'DELETE'
    }),

  // ========== Invitations ==========
  inviteMember: (listeId: string, identifier: string, role: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/invite_member_liste`, {
      method: 'POST',
      body: JSON.stringify(buildInvitePayload(identifier, role))
    }),

  acceptInvitation: (token: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/invitations/accept`, {
      method: 'POST',
      body: JSON.stringify({ token })
    }),

  // ========== Actions utilisateur ==========
  leaveListe: (listeId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/leave`, {
      method: 'POST'
    }),
};
