// frontend/src/services/tache.service.ts
import { apiFetch } from './api';

const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';

export const tacheService = {
  // Tâches
  getByListe: (listeId: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/list_taches`),
  getById: (tacheId: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/get_tache`),
  create: (listeId: string, data: any) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/create_tache`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${id}/update_tache`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${id}/delete_tache`, { method: 'DELETE' }),
  
  // Assignations de membres
  assignMember: (tacheId: string, utilisateurId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/assign/${utilisateurId}/assign_tache`, { method: 'POST' }),

  unassignMember: (tacheId: string, utilisateurId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/unassign/${utilisateurId}/unassign_tache`, { method: 'DELETE' }),

  getMembers: (tacheId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/list_members_tache`),

  // Checklists (sous-tâches)
  getChecklists: (tacheId: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/checklists/tache/${tacheId}`),
  createChecklist: (tacheId: string, data: { texte: string; is_checked?: boolean }) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/checklists/${tacheId}`, { method: 'POST', body: JSON.stringify({ ...data, id_tache: tacheId }) }),
  updateChecklist: (checklistId: string, data: { texte?: string; is_checked?: boolean }) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/checklists/${checklistId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChecklist: (checklistId: string) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/checklists/${checklistId}`, { method: 'DELETE' }),
};
