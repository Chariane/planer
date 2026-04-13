import { apiFetch } from './api';

const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';

export const tacheService = {
  getByListe: (listeId: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/taches`),
  create: (listeId: string, data: any) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/${listeId}/taches`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(LISTE_TACHE_BASE_URL, `/taches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(LISTE_TACHE_BASE_URL, `/taches/${id}`, { method: 'DELETE' }),
};