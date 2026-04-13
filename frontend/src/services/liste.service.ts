import { apiFetch } from './api';

const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';

export const listeService = {
  getByEspace: (espaceId: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes?espace_id=${espaceId}`),
  create: (data: { nom: string; description?: string; id_espace: string }) => apiFetch(LISTE_TACHE_BASE_URL, '/listes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { nom?: string; description?: string; id_espace?: string }) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/${id}`, { method: 'DELETE' }),
};