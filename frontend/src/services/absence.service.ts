// frontend/src/services/absence.service.ts
import { apiFetch } from './api';
import type {
    AbsenceCalendarOut,
    AbsenceConflictOut,
    AbsenceImpactOut,
    UserAvailabilityOut
} from '../types';

const LIST_BASE_URL = import.meta.env.VITE_LIST_URL || 'http://localhost:8004';

// Types pour ce service (utilisant les champs originaux du backend)
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
    id_membre?: string;
    owner_name?: string;
}

export const absenceService = {
    list: (params?: {
        workspace_id?: string | null,
        espace_id?: string | null,
        liste_id?: string | null,
        member_id?: string | null,
        limit?: number | null
    }) => {
        const query = new URLSearchParams();
        if (params) {
            if (params.workspace_id) query.append('workspace_id', params.workspace_id);
            if (params.espace_id) query.append('espace_id', params.espace_id);
            if (params.liste_id) query.append('liste_id', params.liste_id);
            if (params.member_id) query.append('member_id', params.member_id);
            if (params.limit) query.append('limit', params.limit.toString());
        }
        const queryString = query.toString();
        return apiFetch(LIST_BASE_URL, `/listes/absences${queryString ? '?' + queryString : ''}`);
    },

    get: (id: string) => apiFetch(LIST_BASE_URL, `/listes/absences/${id}`),

    create: (data: Partial<AbsenceEtConge>) => apiFetch(LIST_BASE_URL, `/listes/absences`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    update: (id: string, data: Partial<AbsenceEtConge>) => apiFetch(LIST_BASE_URL, `/listes/absences/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),

    delete: (id: string) => apiFetch(LIST_BASE_URL, `/listes/absences/${id}`, {
        method: 'DELETE',
    }),

    approve: (id: string) => apiFetch(LIST_BASE_URL, `/listes/absences/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ motif: '' })
    }),

    reject: (id: string, motif?: string) => apiFetch(LIST_BASE_URL, `/listes/absences/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ motif: motif || '' })
    }),

    finish: (id: string) => apiFetch(LIST_BASE_URL, `/listes/absences/${id}/finish`, { method: 'POST' }),

    cancel: (id: string) => apiFetch(LIST_BASE_URL, `/listes/absences/${id}/cancel`, { method: 'POST' }),

    getCalendar: (params?: { workspace_id?: string | null, liste_id?: string | null }) => {
        const query = new URLSearchParams();
        if (params?.workspace_id) query.append('workspace_id', params.workspace_id);
        if (params?.liste_id) query.append('liste_id', params.liste_id);
        const queryString = query.toString();
        return apiFetch(LIST_BASE_URL, `/listes/absences/calendar${queryString ? '?' + queryString : ''}`);
    },

    getConflicts: (id: string): Promise<AbsenceConflictOut[]> => apiFetch(LIST_BASE_URL, `/listes/absences/${id}/conflicts`),

    getImpact: (id: string): Promise<AbsenceImpactOut> => apiFetch(LIST_BASE_URL, `/listes/absences/${id}/impact`),

    getAvailability: (listeId: string, userIds: string[], referenceDate?: string): Promise<UserAvailabilityOut[]> =>
        apiFetch(LIST_BASE_URL, `/listes/absences/availability/liste/${listeId}`, {
            method: 'POST',
            body: JSON.stringify({ user_ids: userIds, reference_date: referenceDate })
        }),
};
