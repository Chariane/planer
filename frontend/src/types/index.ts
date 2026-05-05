// frontend/src/types/index.ts

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Créateur' | 'Administrateur' | 'Membre' | 'Invité';
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
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
}

// Type simplifié pour les checklists dans les tâches (UI)
export interface TaskChecklist {
  id: string;
  texte: string;
  is_checked: boolean;
}

// Types pour les sections (API)
export interface ApiSection {
  id: string;
  titre: string;
  created_at: string;
  updated_at: string | null;
  id_canevas: string;
}

// Types pour les sections (UI)
export interface CanevasSection extends ApiSection {
  checklists: ApiChecklist[];
  progress: number;
}

// Types pour le canevas (API)
export interface ApiCanevas {
  id: string;
  is_verrouille: boolean;
  created_at: string;
  updated_at: string | null;
  id_liste: string;
}

// Types pour le canevas (UI)
export interface CanevasData extends ApiCanevas {
  sections: CanevasSection[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'en attente' | 'en cours' | 'terminé' | 'bloqué';
  priority: 'basse' | 'moyenne' | 'haute' | 'critique';
  dueDate: string;
  startDate?: string;
  order?: number;
  assignees: Member[];
  listId: string;
  createdAt: Date;
  subTasks?: ChecklistItem[];
  // Utilisons le type simplifié pour les checklists dans les tâches
  checklists?: TaskChecklist[];
  progression?: number;
}

export interface Period {
  id: string;
  name: string;
  progress: number;
  expanded?: boolean;
  children?: Period[];
  items?: ChecklistItem[];
}

export interface List {
  id: string;
  nom: string;
  description: string;
  taches: Task[];
  periods?: Period[];
  canevas?: CanevasData;
  createdAt: Date;
}

export interface Space {
  id: string;
  nom: string;
  description: string;
  sous_espaces?: Space[];
  listes: List[];
  createdAt: Date;
}

export interface Workspace {
  id: string;
  nom: string;
  description: string | null;
  membres: Member[];
  espaces: Space[];
  createdAt?: Date;
  created_at?: string;
  updated_at?: string | null;
  id_utilisateur?: string | null;
  member_count?: number;
  current_user_role?: string | null;
  current_user_statut?: string | null;
}

export interface JoinedResource {
  id: string;
  nom: string;
  role: string;
  created_at?: string;
  workspace_id?: string | null;
  workspace_nom?: string | null;
  id_workspace?: string | null;
  id_espace?: string | null;
  id_liste?: string | null;
  id_tache?: string | null;      // Ajouté pour les tâches
  espace_nom?: string | null;    // Ajouté pour le nom de l'espace
  liste_nom?: string | null;     // Ajouté pour le nom de la liste
  tache_nom?: string | null;     // Ajouté pour le nom de la tâche
}

export interface WorkspaceAccessListingResponse {
  owned: Workspace[];
  joined: Workspace[];
}

export interface WorkspaceDirectAccessItem {
  id: string;
  nom: string;
  role: string;
  id_espace?: string | null;
  id_liste?: string | null;
  id_tache?: string | null;      // Ajouté pour les tâches
}

export interface WorkspaceLocalResourcesResponse {
  workspace_id: string;
  workspace_nom: string;
  my_workspace_role: string | null;
  direct_access: {
    espaces: WorkspaceDirectAccessItem[];
    listes: WorkspaceDirectAccessItem[];
    taches: WorkspaceDirectAccessItem[];
  };
}

export interface WorkspaceNavigationResponse {
  owned_workspaces: Workspace[];
  joined_workspaces: Workspace[];
  joined_espaces: JoinedResource[];
  joined_listes: JoinedResource[];
  joined_taches: JoinedResource[];
}