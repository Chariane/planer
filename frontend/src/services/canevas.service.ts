// frontend/src/services/canevas.service.ts
import { apiFetch } from './api';

const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';

export interface Canevas {
  id: string;
  is_verrouille: boolean;
  created_at: string;
  updated_at: string | null;
  id_liste: string;
}

export interface EnhancedChecklist {
  id: string;
  texte: string;
  is_checked: boolean;
  source: 'manual' | 'task';
  task_id?: string;
  task_title?: string | null;
  due_date?: string | null;
  section_id?: string | null;
}

export interface EnhancedSection {
  id: string;
  titre: string;
  created_at: string | null;
  updated_at: string | null;
  id_canevas: string;
  checklists: EnhancedChecklist[];
  progress: number;
  period_type: 'month' | 'week' | 'day';
}

export interface EnhancedCanevas extends Canevas {
  sections: EnhancedSection[];
  liste_nom?: string;
}

export const canevasService = {
  // Récupérer le canevas standard d'une liste
  getByListe: (listeId: string) => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/canevas`),
  
  // Récupérer le canevas enrichi (avec checklists des tâches)
  getEnhancedByListe: (listeId: string): Promise<EnhancedCanevas> => 
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/canevas/enhanced`),
  
  // Créer un canevas pour une liste
  create: (listeId: string, data: { is_verrouille?: boolean }) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/canevas`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  // Modifier un canevas
  update: (canevasId: string, data: { is_verrouille?: boolean }) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/canevas/${canevasId}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  
  // Supprimer un canevas
  delete: (canevasId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/canevas/${canevasId}`, { 
      method: 'DELETE' 
    }),
};
