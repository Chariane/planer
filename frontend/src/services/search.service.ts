// frontend/src/services/search.service.ts
import { LISTE_TACHE_BASE_URL } from './plannerTools.service';
import { getAccessToken } from './api';

export interface SearchResult {
  tasks: any[];
  lists: any[];
  espaces: any[];
  sections: any[];
  checklists: any[];
  members: any[];
  files: any[];
}

const getHeaders = () => {
  const token = getAccessToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  };
};

export const searchService = {
  async globalSearch(query: string, params?: {
    workspace_id?: string;
    espace_id?: string;
    liste_id?: string;
  }): Promise<SearchResult> {
    const url = new URL(`${LISTE_TACHE_BASE_URL}/listes/search/global`);
    url.searchParams.append('q', query);
    if (params?.workspace_id) url.searchParams.append('workspace_id', params.workspace_id);
    if (params?.espace_id) url.searchParams.append('espace_id', params.espace_id);
    if (params?.liste_id) url.searchParams.append('liste_id', params.liste_id);

    const response = await fetch(url.toString(), {
      headers: getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erreur lors de la recherche');
    }

    return response.json();
  },

  async searchTasks(query: string, params?: {
    workspace_id?: string;
    espace_id?: string;
    liste_id?: string;
    statut?: string;
    priorite?: string;
    membre_id?: string;
  }) {
    const url = new URL(`${LISTE_TACHE_BASE_URL}/listes/search/tasks`);
    url.searchParams.append('q', query);
    if (params?.workspace_id) url.searchParams.append('workspace_id', params.workspace_id);
    if (params?.espace_id) url.searchParams.append('espace_id', params.espace_id);
    if (params?.liste_id) url.searchParams.append('liste_id', params.liste_id);
    if (params?.statut) url.searchParams.append('statut', params.statut);
    if (params?.priorite) url.searchParams.append('priorite', params.priorite);
    if (params?.membre_id) url.searchParams.append('membre_id', params.membre_id);

    const response = await fetch(url.toString(), {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la recherche de tâches');
    }

    return response.json();
  },

  async searchLists(query: string, params?: {
    workspace_id?: string;
    espace_id?: string;
    creator_id?: string;
  }) {
    const url = new URL(`${LISTE_TACHE_BASE_URL}/listes/search/lists`);
    url.searchParams.append('q', query);
    if (params?.workspace_id) url.searchParams.append('workspace_id', params.workspace_id);
    if (params?.espace_id) url.searchParams.append('espace_id', params.espace_id);
    if (params?.creator_id) url.searchParams.append('creator_id', params.creator_id);

    const response = await fetch(url.toString(), {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la recherche de projets');
    }

    return response.json();
  },

  async searchMembers(query: string, params?: {
    workspace_id?: string;
    espace_id?: string;
    liste_id?: string;
    tache_id?: string;
    role?: string;
  }) {
    const url = new URL(`${LISTE_TACHE_BASE_URL}/listes/search/members`);
    url.searchParams.append('q', query);
    if (params?.workspace_id) url.searchParams.append('workspace_id', params.workspace_id);
    if (params?.espace_id) url.searchParams.append('espace_id', params.espace_id);
    if (params?.liste_id) url.searchParams.append('liste_id', params.liste_id);
    if (params?.tache_id) url.searchParams.append('tache_id', params.tache_id);
    if (params?.role) url.searchParams.append('role', params.role);

    const response = await fetch(url.toString(), {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la recherche de membres');
    }

    return response.json();
  },
};
