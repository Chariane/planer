// frontend/src/store/api/searchApi.ts
import { baseApi } from './baseApi';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchTaskResult {
  id: string;
  titre: string;
  description?: string;
  statut: string;
  priorite?: string;
  date_fin_prevue?: string;
  created_at: string;
  id_liste: string;
  progression?: number;
}

export interface SearchListResult {
  id: string;
  nom: string;
  description?: string;
  created_at: string;
  id_workspace?: string;
  id_espace?: string;
}

export interface SearchEspaceResult {
  id: string;
  nom: string;
  description?: string;
  created_at: string;
  id_workspace: string;
  id_espace_parent?: string | null;
}

export interface SearchSectionResult {
  id: string;
  titre: string;
  created_at: string;
  id_canevas: string;
}

export interface SearchChecklistResult {
  id: string;
  texte: string;
  is_checked: boolean;
  created_at: string;
  id_section?: string | null;
  id_tache?: string | null;
}

export interface SearchMemberResult {
  id: string;
  id_utilisateur: string;
  role: string;
  statut: string;
  utilisateur?: {
    id: string;
    username: string;
    email: string;
    nom?: string;
    prenoms?: string;
    photo?: string | null;
  };
}

export interface SearchFileResult {
  id: string;
  nom: string;
  url_fichier?: string;
  type_fichier?: string;
  created_at: string;
  id_membre?: string | null;
  meta_donnees?: Record<string, any>;
}

export interface SearchResultsData {
  tasks: SearchTaskResult[];
  lists: SearchListResult[];
  espaces: SearchEspaceResult[];
  sections: SearchSectionResult[];
  checklists: SearchChecklistResult[];
  members: SearchMemberResult[];
  files: SearchFileResult[];
}

export interface SearchGlobalParams {
  q: string;
  workspace_id?: string | null;
  espace_id?: string | null;
  liste_id?: string | null;
}

export interface SearchTasksParams extends SearchGlobalParams {
  statut?: string | null;
  priorite?: string | null;
  membre_id?: string | null;
  has_files?: boolean | null;
  has_checklists?: boolean | null;
  overdue?: boolean | null;
  limit?: number | null;
}

export interface SearchListsParams extends SearchGlobalParams {
  creator_id?: string | null;
  has_files?: boolean | null;
  limit?: number | null;
}

export interface SearchEspacesParams {
  q: string;
  workspace_id?: string | null;
  parent_espace_id?: string | null;
  limit?: number | null;
}

export interface SearchMembersParams extends SearchGlobalParams {
  tache_id?: string | null;
  role?: string | null;
  statut?: string | null;
  limit?: number | null;
}

// ============================================================================
// API RTK Query
// ============================================================================

export const searchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================================================
    // QUERIES
    // ==========================================================================

    // Recherche globale
    globalSearch: builder.query<SearchResultsData, SearchGlobalParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        return {
          url: `/listes/search/global?${searchParams.toString()}`,
        };
      },
      // ✅ Utiliser des tags existants
      providesTags: (result) => [
        'UserData',
        ...(result?.tasks?.map((t) => ({ type: 'Tache' as const, id: t.id })) ?? []),
        ...(result?.lists?.map((l) => ({ type: 'Liste' as const, id: l.id })) ?? []),
        ...(result?.espaces?.map((e) => ({ type: 'Espace' as const, id: e.id })) ?? []),
        ...(result?.members?.map((m) => ({ type: 'Member' as const, id: m.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Recherche de tâches
    searchTasks: builder.query<SearchTaskResult[], SearchTasksParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        if (params.statut) searchParams.append('statut', params.statut);
        if (params.priorite) searchParams.append('priorite', params.priorite);
        if (params.membre_id) searchParams.append('membre_id', params.membre_id);
        if (params.has_files !== null && params.has_files !== undefined) {
          searchParams.append('has_files', String(params.has_files));
        }
        if (params.has_checklists !== null && params.has_checklists !== undefined) {
          searchParams.append('has_checklists', String(params.has_checklists));
        }
        if (params.overdue !== null && params.overdue !== undefined) {
          searchParams.append('overdue', String(params.overdue));
        }
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/search/tasks?${searchParams.toString()}`,
        };
      },
      providesTags: (result) => [
        'UserData',
        ...(result?.map((t) => ({ type: 'Tache' as const, id: t.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Recherche de listes (projets)
    searchLists: builder.query<SearchListResult[], SearchListsParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.creator_id) searchParams.append('creator_id', params.creator_id);
        if (params.has_files !== null && params.has_files !== undefined) {
          searchParams.append('has_files', String(params.has_files));
        }
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/search/lists?${searchParams.toString()}`,
        };
      },
      providesTags: (result) => [
        'UserData',
        ...(result?.map((l) => ({ type: 'Liste' as const, id: l.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Recherche d'espaces
    searchEspaces: builder.query<SearchEspaceResult[], SearchEspacesParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.parent_espace_id) searchParams.append('parent_espace_id', params.parent_espace_id);
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/search/espaces?${searchParams.toString()}`,
        };
      },
      providesTags: (result) => [
        'UserData',
        ...(result?.map((e) => ({ type: 'Espace' as const, id: e.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Recherche de sections
    searchSections: builder.query<SearchSectionResult[], SearchGlobalParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        return {
          url: `/listes/search/sections?${searchParams.toString()}`,
        };
      },
      providesTags: (result) => [
        'UserData',
        ...(result?.map((s) => ({ type: 'Section' as const, id: s.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Recherche de checklists
    searchChecklists: builder.query<SearchChecklistResult[], SearchGlobalParams & { is_checked?: boolean | null }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        if (params.is_checked !== null && params.is_checked !== undefined) {
          searchParams.append('is_checked', String(params.is_checked));
        }
        return {
          url: `/listes/search/checklists?${searchParams.toString()}`,
        };
      },
      providesTags: (result) => [
        'UserData',
        ...(result?.map((c) => ({ type: 'Checklist' as const, id: c.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Recherche de membres
    searchMembers: builder.query<SearchMemberResult[], SearchMembersParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        if (params.tache_id) searchParams.append('tache_id', params.tache_id);
        if (params.role) searchParams.append('role', params.role);
        if (params.statut) searchParams.append('statut', params.statut);
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/search/members?${searchParams.toString()}`,
        };
      },
      providesTags: (result) => [
        'UserData',
        ...(result?.map((m) => ({ type: 'Member' as const, id: m.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Recherche de fichiers
    searchFiles: builder.query<SearchFileResult[], SearchGlobalParams & { type_fichier?: string | null; limit?: number | null }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        if (params.type_fichier) searchParams.append('type_fichier', params.type_fichier);
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/search/files?${searchParams.toString()}`,
        };
      },
      providesTags: (result) => [
        'UserData',
        ...(result?.map((f) => ({ type: 'File' as const, id: f.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),
  }),
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  // Queries
  useGlobalSearchQuery,
  useSearchTasksQuery,
  useSearchListsQuery,
  useSearchEspacesQuery,
  useSearchSectionsQuery,
  useSearchChecklistsQuery,
  useSearchMembersQuery,
  useSearchFilesQuery,
} = searchApi;