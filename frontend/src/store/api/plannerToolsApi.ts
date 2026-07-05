// src/store/api/plannerToolsApi.ts
import { baseApi } from './baseApi';

// ============================================================================
// TYPES - Compatibles avec vos services existants
// ============================================================================

export interface ScopeParams {
  workspace_id?: string | null;
  espace_id?: string | null;
  liste_id?: string | null;
}

export interface SearchParams extends ScopeParams {
  q: string;
}

export interface TaskSearchParams extends ScopeParams {
  q?: string;
  statut?: string;
  priorite?: string;
  membre_id?: string;
  overdue?: boolean;
  has_files?: boolean;
  has_checklists?: boolean;
  limit?: number;
}

export interface ListeSearchParams extends ScopeParams {
  q?: string;
  creator_id?: string;
  has_files?: boolean;
  limit?: number;
}

export interface EspaceSearchParams {
  q?: string;
  workspace_id?: string | null;
  parent_espace_id?: string | null;
  limit?: number;
}

export interface SectionSearchParams extends ScopeParams {
  q?: string;
  limit?: number;
}

export interface ChecklistSearchParams extends ScopeParams {
  q?: string;
  tache_id?: string | null;
  is_checked?: boolean;
  limit?: number;
}

export interface MemberSearchParams extends ScopeParams {
  q?: string;
  tache_id?: string | null;
  role?: string;
  statut?: string;
  limit?: number;
}

export interface FileSearchParams {
  q?: string;
  type_fichier?: string;
  target_type?: string;
  target_id?: string;
  member_id?: string;
  limit?: number;
}

export interface FichierResponse {
  id: string;
  nom: string;
  type_fichier: string;
  url: string;
  meta_donnees?: Record<string, any>;
  created_at: string;
  uploaded_by: {
    id: string;
    username: string;
  };
}

export interface FichierCreateRequest {
  nom: string;
  type_fichier: string;
  url: string;
  target_type: 'workspace' | 'espace' | 'liste' | 'tache';
  target_id: string;
  meta_donnees?: Record<string, any>;
}

export interface FichierShareRequest {
  expires_in_hours?: number;
  allow_download?: boolean;
}

export interface FichierShareResponse {
  token: string;
  share_url: string;
  expires_at: string;
  allow_download: boolean;
}

export interface RapportCreateRequest {
  id_membre: string;
  titre: string;
  realisations?: string;
  difficultes_et_solutions?: string;
  commentaire?: string;
  fichier_joint?: string;
  periode_debut: string;
  periode_fin: string;
}

export interface RapportUpdateRequest {
  titre?: string;
  realisations?: string;
  difficultes_et_solutions?: string;
  commentaire?: string;
  fichier_joint?: string;
  periode_debut?: string;
  periode_fin?: string;
}

export interface RapportResponse {
  id: string;
  titre: string;
  realisations?: string;
  difficultes_et_solutions?: string;
  commentaire?: string;
  fichier_joint?: string;
  periode_debut: string;
  periode_fin: string;
  created_at: string;
  updated_at: string;
  id_membre: string;
  membre_nom?: string;
}

export interface RapportListParams extends ScopeParams {
  member_id?: string;
  q?: string;
  limit?: number;
}

// ============================================================================
// API RTK Query
// ============================================================================

export const plannerToolsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================================================
    // QUERIES - RECHERCHE
    // ==========================================================================

    // Recherche globale
    globalSearch: builder.query<any, SearchParams>({
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
      keepUnusedDataFor: 30,
    }),

    // Recherche de tâches
    searchTasks: builder.query<any[], TaskSearchParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.q) searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        if (params.statut) searchParams.append('statut', params.statut);
        if (params.priorite) searchParams.append('priorite', params.priorite);
        if (params.membre_id) searchParams.append('membre_id', params.membre_id);
        if (params.overdue) searchParams.append('overdue', 'true');
        if (params.has_files) searchParams.append('has_files', 'true');
        if (params.has_checklists) searchParams.append('has_checklists', 'true');
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/search/tasks?${searchParams.toString()}`,
        };
      },
      keepUnusedDataFor: 30,
    }),

    // Recherche de listes
    searchLists: builder.query<any[], ListeSearchParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.q) searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        if (params.creator_id) searchParams.append('creator_id', params.creator_id);
        if (params.has_files) searchParams.append('has_files', 'true');
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/search/lists?${searchParams.toString()}`,
        };
      },
      keepUnusedDataFor: 30,
    }),

    // Recherche d'espaces
    searchEspaces: builder.query<any[], EspaceSearchParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.q) searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.parent_espace_id) searchParams.append('parent_espace_id', params.parent_espace_id);
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/search/espaces?${searchParams.toString()}`,
        };
      },
      keepUnusedDataFor: 30,
    }),

    // Recherche de sections
    searchSections: builder.query<any[], SectionSearchParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.q) searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/search/sections?${searchParams.toString()}`,
        };
      },
      keepUnusedDataFor: 30,
    }),

    // Recherche de checklists
    searchChecklists: builder.query<any[], ChecklistSearchParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.q) searchParams.append('q', params.q);
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        if (params.tache_id) searchParams.append('tache_id', params.tache_id);
        if (params.is_checked !== undefined) searchParams.append('is_checked', String(params.is_checked));
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/search/checklists?${searchParams.toString()}`,
        };
      },
      keepUnusedDataFor: 30,
    }),

    // Recherche de membres
    searchMembers: builder.query<any[], MemberSearchParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.q) searchParams.append('q', params.q);
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
      keepUnusedDataFor: 30,
    }),

    // Recherche de fichiers
    searchFiles: builder.query<FichierResponse[], FileSearchParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.q) searchParams.append('q', params.q);
        if (params.type_fichier) searchParams.append('type_fichier', params.type_fichier);
        if (params.target_type) searchParams.append('target_type', params.target_type);
        if (params.target_id) searchParams.append('target_id', params.target_id);
        if (params.member_id) searchParams.append('member_id', params.member_id);
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/search/files?${searchParams.toString()}`,
        };
      },
      keepUnusedDataFor: 30,
    }),

    // ==========================================================================
    // QUERIES - FICHIERS
    // ==========================================================================

    // Lister les fichiers
    listFiles: builder.query<FichierResponse[], FileSearchParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.q) searchParams.append('q', params.q);
        if (params.type_fichier) searchParams.append('type_fichier', params.type_fichier);
        if (params.target_type) searchParams.append('target_type', params.target_type);
        if (params.target_id) searchParams.append('target_id', params.target_id);
        if (params.member_id) searchParams.append('member_id', params.member_id);
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/files?${searchParams.toString()}`,
        };
      },
      providesTags: (_result) => [
        'File',
        ...(_result?.map((f) => ({ type: 'File' as const, id: f.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Récupérer un fichier
    getFile: builder.query<FichierResponse, string>({
      query: (fileId) => ({
        url: `/listes/files/${fileId}`,
      }),
      providesTags: (_result, _error, id) => [
        { type: 'File', id },
      ],
      keepUnusedDataFor: 300,
    }),

    // Résoudre un token de partage de fichier
    resolveFileShare: builder.query<any, string>({
      query: (token) => ({
        url: `/listes/files/share/resolve?token=${token}`,
      }),
      keepUnusedDataFor: 60,
    }),

    // ==========================================================================
    // QUERIES - RAPPORTS
    // ==========================================================================

    // Lister les rapports
    listReports: builder.query<RapportResponse[], RapportListParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        if (params.member_id) searchParams.append('member_id', params.member_id);
        if (params.q) searchParams.append('q', params.q);
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/listes/rapports?${searchParams.toString()}`,
        };
      },
      providesTags: (_result) => [
        'Report',
        ...(_result?.map((r) => ({ type: 'Report' as const, id: r.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Récupérer un rapport
    getReport: builder.query<RapportResponse, string>({
      query: (reportId) => ({
        url: `/listes/rapports/${reportId}`,
      }),
      providesTags: (_result, _error, id) => [
        { type: 'Report', id },
      ],
      keepUnusedDataFor: 300,
    }),

    // ==========================================================================
    // MUTATIONS - FICHIERS
    // ==========================================================================

    // Uploader un fichier (multipart/form-data)
    uploadFile: builder.mutation<
      { filename: string; url: string; content_type: string },
      FormData
    >({
      query: (formData) => ({
        url: '/listes/files/upload',
        method: 'POST',
        body: formData,
        // Ne pas ajouter Content-Type, laisser le navigateur le gérer
      }),
      invalidatesTags: ['File'],
    }),

    // Créer un fichier (attacher à une ressource)
    createFile: builder.mutation<
      FichierResponse,
      FichierCreateRequest
    >({
      query: (data) => ({
        url: '/listes/files',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['File'],
    }),

    // Mettre à jour un fichier
    updateFile: builder.mutation<
      FichierResponse,
      { fileId: string; nom?: string; meta_donnees?: Record<string, any> }
    >({
      query: ({ fileId, ...data }) => ({
        url: `/listes/files/${fileId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { fileId }) => [
        { type: 'File', id: fileId },
      ],
    }),

    // Supprimer un fichier
    deleteFile: builder.mutation<void, string>({
      query: (fileId) => ({
        url: `/listes/files/${fileId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, fileId) => [
        { type: 'File', id: fileId },
      ],
    }),

    // Partager un fichier
    shareFile: builder.mutation<
      FichierShareResponse,
      { fileId: string; data: FichierShareRequest }
    >({
      query: ({ fileId, data }) => ({
        url: `/listes/files/${fileId}/share`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { fileId }) => [
        { type: 'File', id: fileId },
      ],
    }),

    // ==========================================================================
    // MUTATIONS - RAPPORTS
    // ==========================================================================

    // Créer un rapport
    createReport: builder.mutation<
      RapportResponse,
      RapportCreateRequest
    >({
      query: (data) => ({
        url: '/listes/rapports',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Report'],
    }),

    // Mettre à jour un rapport
    updateReport: builder.mutation<
      RapportResponse,
      { reportId: string; data: RapportUpdateRequest }
    >({
      query: ({ reportId, data }) => ({
        url: `/listes/rapports/${reportId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { reportId }) => [
        { type: 'Report', id: reportId },
      ],
    }),

    // Supprimer un rapport
    deleteReport: builder.mutation<void, string>({
      query: (reportId) => ({
        url: `/listes/rapports/${reportId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, reportId) => [
        { type: 'Report', id: reportId },
      ],
    }),
  }),
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  // Queries - Recherche
  useGlobalSearchQuery,
  useSearchTasksQuery,
  useSearchListsQuery,
  useSearchEspacesQuery,
  useSearchSectionsQuery,
  useSearchChecklistsQuery,
  useSearchMembersQuery,
  useSearchFilesQuery,

  // Queries - Fichiers
  useListFilesQuery,
  useGetFileQuery,
  useResolveFileShareQuery,

  // Queries - Rapports
  useListReportsQuery,
  useGetReportQuery,

  // Mutations - Fichiers
  useUploadFileMutation,
  useCreateFileMutation,
  useUpdateFileMutation,
  useDeleteFileMutation,
  useShareFileMutation,

  // Mutations - Rapports
  useCreateReportMutation,
  useUpdateReportMutation,
  useDeleteReportMutation,
} = plannerToolsApi;