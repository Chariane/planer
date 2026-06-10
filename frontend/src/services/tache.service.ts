// frontend/src/services/tache.service.ts
import { apiFetch } from './api';
import { CHECKLIST_CHANGED_EVENT } from './checklist.service';

const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';

const notifyChecklistChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHECKLIST_CHANGED_EVENT));
  }
};

export interface TacheBulkUpdateItem {
  id: string;
  statut?: string;
  ordre_affichage?: number;
}

export interface TacheFilters {
  statut?: string;
  priorite?: string;
  membre_id?: string;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

export const tacheService = {
  // ========== CRUD Tâches ==========
  getByListe: (listeId: string, filters?: TacheFilters) => {
    let url = `/listes/${listeId}/list_taches`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.statut) params.append('statut', filters.statut);
      if (filters.priorite) params.append('priorite', filters.priorite);
      if (filters.membre_id) params.append('membre_id', filters.membre_id);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.order) params.append('order', filters.order);
      if (params.toString()) url += `?${params.toString()}`;
    }
    return apiFetch(LISTE_TACHE_BASE_URL, url);
  },

  getById: (tacheId: string) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/get_tache`),

  create: (listeId: string, data: any) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/create_tache`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),

  update: (id: string, data: any) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${id}/update_tache`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),

  delete: (id: string) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${id}/delete_tache`, { 
      method: 'DELETE' 
    }),

  // ========== Vues spécialisées ==========
  getKanbanView: (listeId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/vues/kanban`),

  getGanttView: (listeId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/vues/gantt`),

  getTableView: (listeId: string, filters?: TacheFilters) => {
    let url = `/listes/${listeId}/vues/tableau`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.statut) params.append('statut', filters.statut);
      if (filters.priorite) params.append('priorite', filters.priorite);
      if (filters.membre_id) params.append('membre_id', filters.membre_id);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.order) params.append('order', filters.order);
      if (params.toString()) url += `?${params.toString()}`;
    }
    return apiFetch(LISTE_TACHE_BASE_URL, url);
  },

  // ========== Assignations de membres ==========
  assignMember: (tacheId: string, utilisateurId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/assign/${utilisateurId}/assign_tache`, { 
      method: 'POST' 
    }),

  unassignMember: (tacheId: string, utilisateurId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/unassign/${utilisateurId}/unassign_tache`, { 
      method: 'DELETE' 
    }),

  getMembers: (tacheId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/list_members_tache`),

  // ========== Checklists de tâche ==========
  getChecklistsByTache: (tacheId: string) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/checklists`),

  createChecklistInTache: async (tacheId: string, data: { texte: string; is_checked?: boolean }) => {
    const result = await apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/checklists`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
    notifyChecklistChanged();
    return result;
  },

  updateChecklist: async (checklistId: string, data: { texte?: string; is_checked?: boolean; id_section?: string | null; id_tache?: string | null }) => {
    const result = await apiFetch(LISTE_TACHE_BASE_URL, `/listes/checklists/${checklistId}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    });
    notifyChecklistChanged();
    return result;
  },

  deleteChecklist: async (checklistId: string) => {
    const result = await apiFetch(LISTE_TACHE_BASE_URL, `/listes/checklists/${checklistId}`, { 
      method: 'DELETE' 
    });
    notifyChecklistChanged();
    return result;
  },

  // ========== Opérations spéciales ==========
  bulkUpdate: (items: TacheBulkUpdateItem[]) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/bulk_update_taches`, { 
      method: 'PATCH', 
      body: JSON.stringify({ items }) 
    }),

  updateTaskStatusFromChecklists: (tacheId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/update-status-from-checklists`, { 
      method: 'POST' 
    }),
};
