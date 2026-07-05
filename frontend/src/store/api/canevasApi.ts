// src/store/api/canevasApi.ts
import { baseApi } from './baseApi';

// ============================================================================
// TYPES - Compatibles avec votre service existant
// ============================================================================

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
  task_path?: string | null;
  task_depth?: number | null;
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

// Types pour les sections (API)
export interface ApiSection {
  id: string;
  titre: string;
  created_at: string;
  updated_at: string | null;
  id_canevas: string;
}

// Types pour les checklists (API)
export interface ApiChecklist {
  id: string;
  texte: string;
  is_checked: boolean;
  created_at: string;
  updated_at: string | null;
  id_section: string | null;
  id_tache: string | null;
  id_createur?: string | null;
}

// ============================================================================
// API RTK Query
// ============================================================================

export const canevasApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================================================
    // QUERIES - CANEVAS
    // ==========================================================================

    // Récupérer le canevas standard d'une liste
    getCanevasByListe: builder.query<Canevas, string>({
      query: (listeId) => ({
        url: `/listes/${listeId}/canevas`,
      }),
      providesTags: (_result, _error, listeId) => [
        { type: 'Liste', id: listeId },
        'UserData', // ✅ AJOUT
        ...(_result?.id ? [{ type: 'Canevas' as const, id: _result.id }] : []),
      ],
      keepUnusedDataFor: 300,
      transformErrorResponse: (response: any) => {
        if (response.status === 404) {
          return { data: null, message: 'Canevas non trouvé' };
        }
        return response;
      },
    }),

    // Récupérer le canevas enrichi (avec checklists des tâches)
    getEnhancedCanevas: builder.query<EnhancedCanevas, string>({
      query: (listeId) => ({
        url: `/listes/${listeId}/canevas/enhanced`,
      }),
      providesTags: (_result, _error, listeId) => [
        { type: 'Liste', id: listeId },
        'UserData', // ✅ AJOUT
        ...(_result?.id ? [{ type: 'Canevas' as const, id: _result.id }] : []),
        ...(_result?.sections?.map((s) => ({ type: 'Section' as const, id: s.id })) ?? []),
        ...(_result?.sections?.flatMap((s) =>
          s.checklists?.map((c) => ({ type: 'Checklist' as const, id: c.id })) ?? []
        ) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // ==========================================================================
    // QUERIES - SECTIONS
    // ==========================================================================

    // Récupérer les sections d'un canevas
    getSectionsByCanevas: builder.query<ApiSection[], string>({
      query: (canevasId) => ({
        url: `/listes/sections/${canevasId}`,
      }),
      providesTags: (_result, _error, canevasId) => [
        { type: 'Canevas', id: canevasId },
        'UserData', // ✅ AJOUT
        ...(_result?.map((s) => ({ type: 'Section' as const, id: s.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // Récupérer les checklists d'une section
    getChecklistsBySection: builder.query<ApiChecklist[], string>({
      query: (sectionId) => ({
        url: `/listes/sections/${sectionId}/checklists`,
      }),
      providesTags: (_result, _error, sectionId) => [
        { type: 'Section', id: sectionId },
        'UserData', // ✅ AJOUT
        ...(_result?.map((c) => ({ type: 'Checklist' as const, id: c.id })) ?? []),
      ],
      keepUnusedDataFor: 120,
    }),

    // ==========================================================================
    // MUTATIONS - CANEVAS
    // ==========================================================================

    // Créer un canevas pour une liste
    createCanevas: builder.mutation<
      Canevas,
      { listeId: string; is_verrouille?: boolean }
    >({
      query: ({ listeId, is_verrouille }) => ({
        url: `/listes/${listeId}/canevas`,
        method: 'POST',
        body: { is_verrouille: is_verrouille || false },
      }),
      invalidatesTags: (_result, _error, { listeId }) => [
        { type: 'Liste', id: listeId },
        'UserData', // ✅ AJOUT
        ...(_result?.id ? [{ type: 'Canevas' as const, id: _result.id }] : []),
      ],
    }),

    // Modifier un canevas
    updateCanevas: builder.mutation<
      Canevas,
      { canevasId: string; is_verrouille?: boolean }
    >({
      query: ({ canevasId, is_verrouille }) => ({
        url: `/listes/canevas/${canevasId}`,
        method: 'PUT',
        body: { is_verrouille },
      }),
      invalidatesTags: (_result, _error, { canevasId }) => [
        { type: 'Canevas', id: canevasId },
        'UserData', // ✅ AJOUT
      ],
    }),

    // Supprimer un canevas
    deleteCanevas: builder.mutation<void, string>({
      query: (canevasId) => ({
        url: `/listes/canevas/${canevasId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, canevasId) => [
        { type: 'Canevas', id: canevasId },
        'UserData', // ✅ AJOUT
      ],
    }),

    // ==========================================================================
    // MUTATIONS - SECTIONS
    // ==========================================================================

    // Créer une section dans un canevas
    createSection: builder.mutation<
      ApiSection,
      { canevasId: string; titre: string }
    >({
      query: ({ canevasId, titre }) => ({
        url: `/listes/sections/${canevasId}`,
        method: 'POST',
        body: { titre },
      }),
      invalidatesTags: (_result, _error, { canevasId }) => [
        { type: 'Canevas', id: canevasId },
        'UserData', // ✅ AJOUT
        ...(_result?.id ? [{ type: 'Section' as const, id: _result.id }] : []),
      ],
    }),

    // Modifier une section
    updateSection: builder.mutation<
      ApiSection,
      { sectionId: string; titre?: string }
    >({
      query: ({ sectionId, titre }) => ({
        url: `/listes/sections/${sectionId}`,
        method: 'PUT',
        body: { titre },
      }),
      invalidatesTags: (_result, _error, { sectionId }) => [
        { type: 'Section', id: sectionId },
        'UserData', // ✅ AJOUT
        ...(_result?.id_canevas ? [{ type: 'Canevas' as const, id: _result.id_canevas }] : []),
      ],
    }),

    // Supprimer une section
    deleteSection: builder.mutation<void, string>({
      query: (sectionId) => ({
        url: `/listes/sections/${sectionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, sectionId) => [
        { type: 'Section', id: sectionId },
        'UserData', // ✅ AJOUT
      ],
    }),

    // ==========================================================================
    // MUTATIONS - CHECKLISTS DANS SECTIONS
    // ==========================================================================

    // Créer une checklist dans une section
    createChecklistInSection: builder.mutation<
      ApiChecklist,
      { sectionId: string; texte: string; is_checked?: boolean }
    >({
      query: ({ sectionId, texte, is_checked }) => ({
        url: `/listes/sections/${sectionId}/checklists`,
        method: 'POST',
        body: { texte, is_checked: is_checked || false },
      }),
      invalidatesTags: (_result, _error, { sectionId }) => [
        { type: 'Section', id: sectionId },
        'UserData', // ✅ AJOUT
        ...(_result?.id ? [{ type: 'Checklist' as const, id: _result.id }] : []),
      ],
    }),
  }),
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  // Queries - Canevas
  useGetCanevasByListeQuery,
  useGetEnhancedCanevasQuery,

  // Queries - Sections
  useGetSectionsByCanevasQuery,
  useGetChecklistsBySectionQuery,

  // Mutations - Canevas
  useCreateCanevasMutation,
  useUpdateCanevasMutation,
  useDeleteCanevasMutation,

  // Mutations - Sections
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,

  // Mutations - Checklists
  useCreateChecklistInSectionMutation,
} = canevasApi;