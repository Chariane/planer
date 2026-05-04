// frontend/src/services/section.service.ts
import { apiFetch } from './api';

const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';

export interface Section {
  id: string;
  titre: string;
  created_at: string;
  updated_at: string | null;
  id_canevas: string;
}

export const sectionService = {
  // Récupérer toutes les sections d'un canevas
  getByCanevas: (canevasId: string) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/sections/${canevasId}`),
  
  // Créer une section dans un canevas
  create: (canevasId: string, data: { titre: string }) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/sections/${canevasId}`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  // Modifier une section
  update: (sectionId: string, data: { titre?: string }) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/sections/${sectionId}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  
  // Supprimer une section
  delete: (sectionId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/sections/${sectionId}`, { 
      method: 'DELETE' 
    }),
};