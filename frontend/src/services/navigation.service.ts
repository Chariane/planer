// frontend/src/services/navigation.service.ts
import { apiFetch } from './api';

const WORKSPACE_BASE_URL = import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:8003';

export interface WorkspaceNavigationItem {
  id: string;
  nom: string;
  description: string | null;
  created_at: string;
  id_utilisateur: string;
  member_count: number;
  current_user_role: string;
  current_user_statut: string;
}

export interface JoinedEspaceItem {
  id: string;
  nom: string;
  role: string;
  workspace_id: string | null;
  workspace_nom: string | null;
}

export interface JoinedListeItem {
  id: string;
  nom: string;
  role: string;
  workspace_id: string | null;
  workspace_nom: string | null;
  espace_id: string | null;
}

export interface JoinedTacheItem {
  id: string;
  nom: string;
  role: string;
  workspace_id: string | null;
  workspace_nom: string | null;
  espace_id: string | null;
  liste_id: string | null;
  liste_nom: string | null;
}

export interface WorkspaceNavigationResponse {
  owned_workspaces: WorkspaceNavigationItem[];
  joined_workspaces: WorkspaceNavigationItem[];
  joined_espaces: JoinedEspaceItem[];
  joined_listes: JoinedListeItem[];
  joined_taches: JoinedTacheItem[];
}

export const navigationService = {
  getMyNavigation: (): Promise<WorkspaceNavigationResponse> =>
    apiFetch(WORKSPACE_BASE_URL, '/workspaces/my_navigation'),
};