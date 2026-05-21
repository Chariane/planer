import { apiFetch } from './api';

export const LISTE_TACHE_BASE_URL = import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';

type ScopeParams = {
  workspace_id?: string | null;
  espace_id?: string | null;
  liste_id?: string | null;
};

const withParams = (path: string, params: Record<string, string | number | boolean | null | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const plannerToolsService = {
  globalSearch: (q: string, scope: ScopeParams) =>
    apiFetch(LISTE_TACHE_BASE_URL, withParams('/listes/search/global', { q, ...scope })),

  searchTasks: (scope: ScopeParams & {
    q?: string;
    statut?: string;
    priorite?: string;
    membre_id?: string;
    overdue?: boolean;
  }) =>
    apiFetch(LISTE_TACHE_BASE_URL, withParams('/listes/search/tasks', scope)),

  listFiles: (params: {
    q?: string;
    type_fichier?: string;
    target_type?: string;
    target_id?: string;
    member_id?: string;
    limit?: number;
  }) =>
    apiFetch(LISTE_TACHE_BASE_URL, withParams('/listes/files', params)),

  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch(LISTE_TACHE_BASE_URL, '/listes/files/upload', {
      method: 'POST',
      body: formData,
    });
  },

  createFile: (data: {
    nom: string;
    url_fichier?: string;
    type_fichier?: string;
    meta_donnees?: Record<string, any>;
    target_type: string;
    target_id: string;
  }) =>
    apiFetch(LISTE_TACHE_BASE_URL, '/listes/files', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  shareFile: (fileId: string, data: { expires_in_hours?: number; allow_download?: boolean }) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/files/${fileId}/share`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteFile: (fileId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/files/${fileId}`, { method: 'DELETE' }),

  listReports: (params: ScopeParams & { member_id?: string; q?: string; limit?: number }) =>
    apiFetch(LISTE_TACHE_BASE_URL, withParams('/listes/rapports', params)),

  createReport: (data: {
    id_membre: string;
    titre: string;
    realisations?: string;
    difficultes_et_solutions?: string;
    commentaire?: string;
    fichier_joint?: string;
    periode_debut?: string;
    periode_fin?: string;
  }) =>
    apiFetch(LISTE_TACHE_BASE_URL, '/listes/rapports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateReport: (reportId: string, data: {
    titre?: string;
    realisations?: string;
    difficultes_et_solutions?: string;
    commentaire?: string;
    fichier_joint?: string;
    periode_debut?: string;
    periode_fin?: string;
  }) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/rapports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteReport: (reportId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/rapports/${reportId}`, { method: 'DELETE' }),

  listAbsences: (params: ScopeParams & {
    member_id?: string;
    statut?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }) =>
    apiFetch(LISTE_TACHE_BASE_URL, withParams('/listes/absences', params)),

  createAbsence: (data: {
    id_membre: string;
    is_absence: boolean;
    date_debut?: string;
    date_fin?: string;
    motif?: string;
    is_conge_planifie?: boolean;
    duree_demandee_en_jours?: number;
  }) =>
    apiFetch(LISTE_TACHE_BASE_URL, '/listes/absences', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approveAbsence: (absenceId: string, motif?: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/absences/${absenceId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ motif }),
    }),

  rejectAbsence: (absenceId: string, motif?: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/absences/${absenceId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ motif }),
    }),

  finishAbsence: (absenceId: string) =>
    apiFetch(LISTE_TACHE_BASE_URL, `/listes/absences/${absenceId}/finish`, { method: 'POST' }),
};
