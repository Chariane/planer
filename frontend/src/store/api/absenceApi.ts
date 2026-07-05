// src/store/api/absenceApi.ts
import { baseApi } from './baseApi';

// ============================================================================
// TYPES - Compatibles avec votre service existant
// ============================================================================

export interface AbsenceEtConge {
  id: string;
  is_absence: boolean;
  date_debut: string;
  date_fin: string;
  statut: string;
  statut_date: string;
  motif?: string;
  is_conge_planifie: boolean;
  created_at: string;
  duree_demandee_en_jours?: number;
  decision_commentaire?: string | null;
  decision_by?: string | null;
  decision_by_name?: string | null;
  decision_at?: string | null;
  id_membre?: string;
  owner_name?: string;
}

export interface AbsenceCalendarOut {
  id: string;
  id_membre: string;
  member_name: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  is_absence: boolean;
}

export interface AbsenceConflictOut {
  id: string;
  id_membre: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  motif?: string;
}

export interface AbsenceImpactOut {
  overlapping_tasks?: any[];
  overdue_tasks?: any[];
  high_priority_tasks?: any[];
  impacted_projects?: Array<{ id: string; nom: string; progression: number; role: string }>;
  sole_admin_projects?: Array<{ id: string; nom: string }>;
  sole_creator_projects?: Array<{ id: string; nom: string }>;
  conflicting_absences: AbsenceConflictOut[];
  risk_level: 'faible' | 'moyen' | 'eleve' | string;
  recommendation?: string | null;
  risk_reasons?: string[];
  approved_absences_last_3_months?: number;
  approved_days_last_3_months?: number;
  sole_admin_resources?: any[];
  sole_creator_resources?: any[];
}

export interface UserAvailabilityOut {
  id_utilisateur: string;
  is_available: boolean;
  current_absence?: AbsenceEtConge | null;
  next_absence_start?: string | null;
}

export interface AbsenceListParams {
  workspace_id?: string | null;
  espace_id?: string | null;
  liste_id?: string | null;
  member_id?: string | null;
  statut?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  limit?: number | null;
}

export interface AbsenceCalendarParams {
  workspace_id?: string | null;
  espace_id?: string | null;
  liste_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  limit?: number | null;
}

export interface AbsenceAvailabilityRequest {
  user_ids: string[];
  reference_date?: string;
}

// ============================================================================
// API RTK Query
// ============================================================================

export const absenceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================================================
    // QUERIES
    // ==========================================================================

    // Lister les absences avec filtres
    listAbsences: builder.query<AbsenceEtConge[], AbsenceListParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        if (params.member_id) searchParams.append('member_id', params.member_id);
        if (params.statut) searchParams.append('statut', params.statut);
        if (params.date_from) searchParams.append('date_from', params.date_from);
        if (params.date_to) searchParams.append('date_to', params.date_to);
        if (params.limit) searchParams.append('limit', String(params.limit));
        const queryString = searchParams.toString();
        return {
          url: `/listes/absences${queryString ? '?' + queryString : ''}`,
        };
      },
      providesTags: (_result) => [
        'Absence',
        ...(_result?.map((a) => ({ type: 'Absence' as const, id: a.id })) ?? []),
      ],
      keepUnusedDataFor: 60,
    }),

    // Récupérer une absence par son ID
    getAbsence: builder.query<AbsenceEtConge, string>({
      query: (id) => ({
        url: `/listes/absences/${id}`,
      }),
      providesTags: (_result, _error, id) => [
        { type: 'Absence', id },
      ],
      keepUnusedDataFor: 300,
    }),

    // Récupérer le calendrier des absences
    getAbsenceCalendar: builder.query<AbsenceCalendarOut[], AbsenceCalendarParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.workspace_id) searchParams.append('workspace_id', params.workspace_id);
        if (params.espace_id) searchParams.append('espace_id', params.espace_id);
        if (params.liste_id) searchParams.append('liste_id', params.liste_id);
        if (params.date_from) searchParams.append('date_from', params.date_from);
        if (params.date_to) searchParams.append('date_to', params.date_to);
        if (params.limit) searchParams.append('limit', String(params.limit));
        const queryString = searchParams.toString();
        return {
          url: `/listes/absences/calendar${queryString ? '?' + queryString : ''}`,
        };
      },
      providesTags: ['Absence', 'Calendar'],
      keepUnusedDataFor: 120,
    }),

    // Récupérer les conflits d'une absence
    getAbsenceConflicts: builder.query<AbsenceConflictOut[], string>({
      query: (id) => ({
        url: `/listes/absences/${id}/conflicts`,
      }),
      providesTags: (_result, _error, id) => [
        { type: 'Absence', id },
        'Conflict',
      ],
      keepUnusedDataFor: 60,
    }),

    // Récupérer l'impact d'une absence
    getAbsenceImpact: builder.query<AbsenceImpactOut, string>({
      query: (id) => ({
        url: `/listes/absences/${id}/impact`,
      }),
      providesTags: (_result, _error, id) => [
        { type: 'Absence', id },
        'Impact',
      ],
      keepUnusedDataFor: 60,
    }),

    // Récupérer la disponibilité des utilisateurs
    getAvailability: builder.query<
      UserAvailabilityOut[],
      { resourceId: string; body: AbsenceAvailabilityRequest }
    >({
      query: ({ resourceId, body }) => ({
        url: `/listes/absences/availability/resource/${resourceId}`,
        method: 'POST',
        body,
      }),
      providesTags: ['Availability'],
      keepUnusedDataFor: 60,
    }),

    // ==========================================================================
    // MUTATIONS
    // ==========================================================================

    // Créer une absence
    createAbsence: builder.mutation<
      AbsenceEtConge,
      Partial<AbsenceEtConge>
    >({
      query: (data) => ({
        url: '/listes/absences',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Absence', 'Calendar', 'Availability'],
    }),

    // Mettre à jour une absence
    updateAbsence: builder.mutation<
      AbsenceEtConge,
      { id: string; data: Partial<AbsenceEtConge> }
    >({
      query: ({ id, data }) => ({
        url: `/listes/absences/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Absence', id },
        'Calendar',
        'Availability',
      ],
    }),

    // Supprimer une absence
    deleteAbsence: builder.mutation<void, string>({
      query: (id) => ({
        url: `/listes/absences/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Absence', id },
        'Calendar',
        'Availability',
      ],
    }),

    // Approuver une absence
    approveAbsence: builder.mutation<
      AbsenceEtConge,
      { id: string; commentaire?: string }
    >({
      query: ({ id, commentaire }) => ({
        url: `/listes/absences/${id}/approve`,
        method: 'POST',
        body: { commentaire: commentaire || '' },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Absence', id },
        'Calendar',
        'Availability',
      ],
    }),

    // Rejeter une absence
    rejectAbsence: builder.mutation<
      AbsenceEtConge,
      { id: string; motif?: string }
    >({
      query: ({ id, motif }) => ({
        url: `/listes/absences/${id}/reject`,
        method: 'POST',
        body: { motif: motif || '' },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Absence', id },
        'Calendar',
        'Availability',
      ],
    }),

    // Terminer une absence
    finishAbsence: builder.mutation<AbsenceEtConge, string>({
      query: (id) => ({
        url: `/listes/absences/${id}/finish`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Absence', id },
        'Calendar',
        'Availability',
      ],
    }),

    // Annuler une absence
    cancelAbsence: builder.mutation<AbsenceEtConge, string>({
      query: (id) => ({
        url: `/listes/absences/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Absence', id },
        'Calendar',
        'Availability',
      ],
    }),
  }),
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  // Queries
  useListAbsencesQuery,
  useGetAbsenceQuery,
  useGetAbsenceCalendarQuery,
  useGetAbsenceConflictsQuery,
  useGetAbsenceImpactQuery,
  useGetAvailabilityQuery,

  // Mutations
  useCreateAbsenceMutation,
  useUpdateAbsenceMutation,
  useDeleteAbsenceMutation,
  useApproveAbsenceMutation,
  useRejectAbsenceMutation,
  useFinishAbsenceMutation,
  useCancelAbsenceMutation,
} = absenceApi;