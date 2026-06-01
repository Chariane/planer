// frontend/src/services/absence.service.ts
import { apiFetch } from './api';
import type { AbsenceCalendarOut, AbsenceConflictOut } from '../types';

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
        member_id?: string | null
    }) => {
        const url = new URL(`${LIST_BASE_URL}/absences/`);
        if (params) {
            if (params.workspace_id) url.searchParams.append('workspace_id', params.workspace_id);
            if (params.espace_id) url.searchParams.append('espace_id', params.espace_id);
            if (params.liste_id) url.searchParams.append('liste_id', params.liste_id);
            if (params.member_id) url.searchParams.append('member_id', params.member_id);
        }
        return apiFetch(url.toString());
    },

    get: (id: string) => apiFetch(`${LIST_BASE_URL}/absences/${id}`),

    create: (data: Partial<AbsenceEtConge>) => apiFetch(`${LIST_BASE_URL}/absences/`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    update: (id: string, data: Partial<AbsenceEtConge>) => apiFetch(`${LIST_BASE_URL}/absences/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),

    delete: (id: string) => apiFetch(`${LIST_BASE_URL}/absences/${id}`, {
        method: 'DELETE',
    }),

    approve: (id: string) => apiFetch(`${LIST_BASE_URL}/absences/${id}/approve`, { method: 'POST' }),
    reject: (id: string) => apiFetch(`${LIST_BASE_URL}/absences/${id}/reject`, { method: 'POST' }),

    getCalendar: (params?: { workspace_id?: string | null }) => {
        const url = new URL(`${LIST_BASE_URL}/absences/calendar`);
        if (params?.workspace_id) url.searchParams.append('workspace_id', params.workspace_id);
        return apiFetch(url.toString());
    },

    getConflicts: (id: string): Promise<AbsenceConflictOut[]> => apiFetch(`${LIST_BASE_URL}/absences/${id}/conflicts`),
};
