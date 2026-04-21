// frontend/src/services/tache.service.ts
import { apiFetch } from './api';

const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';

export const tacheService = {
  // Tâches
  getByListe: (listeId: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/taches`),
  create: (listeId: string, data: any) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/taches`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(LISTE_TACHE_BASE_URL, `/taches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(LISTE_TACHE_BASE_URL, `/taches/${id}`, { method: 'DELETE' }),
  
  // Assignations de membres
  assignMember: (tacheId: string, utilisateurId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/taches/${tacheId}/assign/${utilisateurId}`, { method: 'POST' }),

  unassignMember: (tacheId: string, utilisateurId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/taches/${tacheId}/unassign/${utilisateurId}`, { method: 'DELETE' }),

  getMembers: (tacheId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/taches/${tacheId}/members`),

  // Checklists (sous-tâches)
  getChecklists: (tacheId: string) => apiFetch(LISTE_TACHE_BASE_URL, `/taches/${tacheId}/checklists`),
  createChecklist: (tacheId: string, data: { texte: string; is_checked?: boolean }) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/checklists/${tacheId}`, { method: 'POST', body: JSON.stringify({ ...data, id_tache: tacheId }) }),
  updateChecklist: (checklistId: string, data: { texte?: string; is_checked?: boolean }) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/checklists/${checklistId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChecklist: (checklistId: string) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/checklists/${checklistId}`, { method: 'DELETE' }),
};