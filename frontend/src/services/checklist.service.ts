// frontend/src/services/checklist.service.ts
import { apiFetch } from './api';

const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';
const CHECKLIST_CHANGED_EVENT = 'kplanner:checklist-changed';

const notifyChecklistChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHECKLIST_CHANGED_EVENT));
  }
};

export interface Checklist {
  id: string;
  texte: string;
  is_checked: boolean;
  created_at: string;
  updated_at: string | null;
  id_section: string | null;
  id_tache: string | null;
}

export const checklistService = {
  // Récupérer les checklists d'une section
  getBySection: (sectionId: string) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/sections/${sectionId}/checklists`),
  
  // Récupérer les checklists d'une tâche
  getByTache: (tacheId: string) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/checklists`),
  
  // Créer une checklist dans une section
  createInSection: async (sectionId: string, data: { texte: string; is_checked?: boolean }) => {
    const result = await apiFetch(LISTE_TACHE_BASE_URL, `/listes/sections/${sectionId}/checklists`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
    notifyChecklistChanged();
    return result;
  },
  
  // Créer une checklist dans une tâche
  createInTache: async (tacheId: string, data: { texte: string; is_checked?: boolean }) => {
    const result = await apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/checklists`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
    notifyChecklistChanged();
    return result;
  },
  
  // Modifier une checklist
  update: async (checklistId: string, data: { texte?: string; is_checked?: boolean; id_section?: string | null; id_tache?: string | null }) => {
    const result = await apiFetch(LISTE_TACHE_BASE_URL, `/listes/checklists/${checklistId}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    });
    notifyChecklistChanged();
    return result;
  },
  
  // Supprimer une checklist
  delete: async (checklistId: string) => {
    const result = await apiFetch(LISTE_TACHE_BASE_URL, `/listes/checklists/${checklistId}`, { 
      method: 'DELETE' 
    });
    notifyChecklistChanged();
    return result;
  },
};

export { CHECKLIST_CHANGED_EVENT };
