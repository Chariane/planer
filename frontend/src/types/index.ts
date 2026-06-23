// frontend/src/types/index.ts

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  photo_base64?: string | null;
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
  id_createur?: string | null;
}

// Type simplifié pour les checklists dans les tâches (UI)
export interface TaskChecklist {
  id: string;
  texte: string;
  is_checked: boolean;
  creatorId?: string | null;
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

// frontend/src/types/index.ts

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
  parentTaskId?: string | null;
  creatorId?: string | null;
  createdAt: Date;
  subTasks?: ChecklistItem[];
  checklists?: TaskChecklist[];
  progression?: number;
  contentMode?: 'leaf' | 'checklist' | 'subtasks';
  canAddChecklist?: boolean;
  canAddSubtask?: boolean;
  // ✅ NOUVEAU : créateur complet
  createur?: {
    id: string;
    username: string;
    email: string;
    nom?: string | null;
    prenoms?: string | null;
    photo?: string | null;
  } | null;
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
  created_at?: string;  // Ajouté pour compatibilité API
  id_espace?: string | null;  // Ajouté
  id_workspace?: string | null;  // Ajouté
}

export interface Space {
  id: string;
  nom: string;
  description: string;
  sous_espaces?: Space[];
  listes: List[];
  createdAt: Date;
  created_at?: string;  // Ajouté pour compatibilité API
  id_workspace?: string;  // Ajouté
  id_espace_parent?: string | null;  // Ajouté
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
  id_tache?: string | null;
  espace_nom?: string | null;
  liste_nom?: string | null;
  tache_nom?: string | null;
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
  id_tache?: string | null;
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

// Types pour les filtres de tâches
export interface TaskFilters {
  statut?: string;
  priorite?: string;
  membre_id?: string;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

// Types pour les mises à jour groupées
export interface TacheBulkUpdateItem {
  id: string;
  statut?: string;
  ordre_affichage?: number;
}

// === Absence & Congés (Original Schema) ===
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
  overlapping_tasks: Task[];
  overdue_tasks: Task[];
  high_priority_tasks: Task[];
  conflicting_absences: AbsenceConflictOut[];
  sole_admin_resources?: any[];
  sole_creator_resources?: any[];
  risk_level: 'faible' | 'moyen' | 'eleve' | string;
  recommendation?: string | null;
  risk_reasons?: string[];
}

export interface UserAvailabilityOut {
  id_utilisateur: string;
  is_available: boolean;
  current_absence?: AbsenceEtConge | null;
  next_absence_start?: string | null;
}
