// frontend/src/services/liste.service.ts
import { apiFetch } from './api';

const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';

export const listeService = {
  getByEspace: (espaceId: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/list_projets?espace_id=${espaceId}`),
  getByWorkspace: (workspaceId: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/list_projets?workspace_id=${workspaceId}`),
  getById: (id: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/${id}/get_liste`),
  create: (data: { nom: string; description?: string; id_espace?: string; id_workspace?: string }) => {
    if ((data.id_espace && data.id_workspace) || (!data.id_espace && !data.id_workspace)) {
      throw new Error("Il faut fournir exactement id_espace ou id_workspace, pas les deux, ni aucun.");
    }
    return apiFetch(LISTE_TACHE_BASE_URL, '/listes/create_liste', { method: 'POST', body: JSON.stringify(data) });
  },
  update: (id: string, data: { nom?: string; description?: string; id_espace?: string; id_workspace?: string }) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/${id}/update_liste`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(LISTE_TACHE_BASE_URL, `/listes/${id}/delete_liste`, { method: 'DELETE' }),
};