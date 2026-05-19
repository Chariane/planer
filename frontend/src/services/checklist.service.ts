// frontend/src/services/checklist.service.ts
import { apiFetch } from './api';

const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';

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
  createInSection: (sectionId: string, data: { texte: string; is_checked?: boolean }) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/sections/${sectionId}/checklists`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  // Créer une checklist dans une tâche
  createInTache: (tacheId: string, data: { texte: string; is_checked?: boolean }) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/taches/${tacheId}/checklists`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  // Modifier une checklist
  update: (checklistId: string, data: { texte?: string; is_checked?: boolean; id_section?: string | null; id_tache?: string | null }) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/checklists/${checklistId}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  
  // Supprimer une checklist
  delete: (checklistId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/checklists/${checklistId}`, { 
      method: 'DELETE' 
    }),
};
