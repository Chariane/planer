// frontend/src/types/index.ts

// ============================================================================
// TYPES DE BASE
// ============================================================================

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

// ============================================================================
// CHECKLISTS
// ============================================================================

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

export interface TaskChecklist {
  id: string;
  texte: string;
  is_checked: boolean;
  creatorId?: string | null;
}

// ============================================================================
// SECTIONS
// ============================================================================

export interface ApiSection {
  id: string;
  titre: string;
  created_at: string;
  updated_at: string | null;
  id_canevas: string;
}

export interface CanevasSection extends ApiSection {
  checklists: ApiChecklist[];
  progress: number;
}

// ============================================================================
// CANEVAS
// ============================================================================

export interface ApiCanevas {
  id: string;
  is_verrouille: boolean;
  created_at: string;
  updated_at: string | null;
  id_liste: string;
}

export interface CanevasData extends ApiCanevas {
  sections: CanevasSection[];
}

// ============================================================================
// TÂCHES
// ============================================================================

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
  createur?: {
    id: string;
    username: string;
    email: string;
    nom?: string | null;
    prenoms?: string | null;
    photo?: string | null;
  } | null;
}

// ============================================================================
// LISTES (PROJETS)
// ============================================================================

export interface List {
  id: string;
  nom: string;
  description: string;
  taches: Task[];
  periods?: Period[];
  canevas?: CanevasData;
  createdAt: Date;
  created_at?: string;
  id_espace?: string | null;
  id_workspace?: string | null;
  membre_count?: number;
  role_utilisateur?: 'Créateur' | 'Administrateur' | 'Membre' | 'Invité';
}

// ============================================================================
// ESPACES
// ============================================================================

export interface Space {
  id: string;
  nom: string;
  description: string;
  sous_espaces?: Space[];
  listes: List[];
  createdAt: Date;
  created_at?: string;
  id_workspace?: string;
  id_espace_parent?: string | null;
  membre_count?: number;
  role_utilisateur?: 'Créateur' | 'Administrateur' | 'Membre' | 'Invité';
}

// ============================================================================
// WORKSPACES
// ============================================================================

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

// ============================================================================
// RESSOURCES REJOINTES
// ============================================================================

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

// ============================================================================
// WORKSPACE - RÉPONSES API
// ============================================================================

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

// ============================================================================
// ESPACE - TYPES API
// ============================================================================

export interface EspaceResponse {
  id: string;
  nom: string;
  description?: string;
  id_workspace: string;
  id_espace_parent?: string;
  created_at: string;
  updated_at?: string;
  role_utilisateur: 'Créateur' | 'Administrateur' | 'Membre' | 'Invité';
  membre_count: number;
  sous_espaces?: EspaceResponse[];
}

export interface EspaceTreeResponse extends EspaceResponse {
  sous_espaces?: EspaceTreeResponse[];
}

export interface EspaceCreateRequest {
  nom: string;
  description?: string;
}

export interface EspaceUpdateRequest {
  nom?: string;
  description?: string;
  id_espace_parent?: string | null;
}

export interface EspaceMemberResponse {
  id: string;
  utilisateur: {
    id: string;
    username: string;
    email: string;
    nom: string;
    prenoms: string;
    photo?: string;
  };
  role: 'Créateur' | 'Administrateur' | 'Membre' | 'Invité';
  statut: 'Actif' | 'Inactif' | 'En attente';
  date_invitation?: string;
  date_acceptation?: string;
}

export interface EspaceInvitationResponse {
  status: 'existing_user' | 'guest_invitation';
  message: string;
  email: string;
  token?: string;
  membre?: EspaceMemberResponse;
}

// ============================================================================
// LISTE - TYPES API
// ============================================================================

export interface ListeResponse {
  id: string;
  nom: string;
  description?: string;
  id_workspace?: string;
  id_espace?: string;
  created_at: string;
  updated_at: string;
  role_utilisateur: 'Créateur' | 'Administrateur' | 'Membre' | 'Invité';
  membre_count: number;
}

export interface ListeCreateRequest {
  nom: string;
  description?: string;
  id_workspace?: string;
  id_espace?: string;
}

export interface ListeUpdateRequest {
  nom?: string;
  description?: string;
  id_workspace?: string;
  id_espace?: string;
}

export interface ListeMemberResponse {
  id: string;
  utilisateur: {
    id: string;
    username: string;
    email: string;
    nom: string;
    prenoms: string;
    photo?: string;
  };
  role: 'Créateur' | 'Administrateur' | 'Membre' | 'Invité';
  statut: 'Actif' | 'Inactif' | 'En attente';
  date_invitation?: string;
  date_acceptation?: string;
}

export interface ListeInvitationResponse {
  status: 'existing_user' | 'guest_invitation';
  message: string;
  email: string;
  token?: string;
  membre?: ListeMemberResponse;
}

// ============================================================================
// TÂCHE - TYPES API
// ============================================================================

export interface TacheResponse {
  id: string;
  titre: string;
  description?: string;
  statut: 'à faire' | 'en cours' | 'bloqué' | 'terminé' | 'annulé';
  priorite: 'basse' | 'moyenne' | 'haute' | 'critique';
  date_debut?: string;
  date_echeance?: string;
  ordre_affichage: number;
  id_liste: string;
  id_tache_parent?: string;
  created_at: string;
  updated_at: string;
}

export interface TacheFullResponse extends TacheResponse {
  assignes: Member[];
  sous_taches: TacheResponse[];
  checklists: ApiChecklist[];
  fichiers: FichierResponse[];
}

export interface TacheCreateRequest {
  titre: string;
  description?: string;
  statut?: string;
  priorite?: string;
  date_debut?: string;
  date_echeance?: string;
  id_tache_parent?: string;
}

export interface TacheUpdateRequest {
  id: string;
  titre?: string;
  description?: string;
  statut?: string;
  priorite?: string;
  date_debut?: string;
  date_echeance?: string;
  ordre_affichage?: number;
}

export interface TacheBulkUpdateRequest {
  items: TacheUpdateRequest[];
}

export interface TacheKanbanResponse {
  columns: {
    statut: string;
    taches: TacheFullResponse[];
  }[];
}

// ============================================================================
// FILTRES ET REQUÊTES
// ============================================================================

export interface TaskFilters {
  statut?: string;
  priorite?: string;
  membre_id?: string;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

export interface TacheBulkUpdateItem {
  id: string;
  statut?: string;
  ordre_affichage?: number;
}

// ============================================================================
// PÉRIODES
// ============================================================================

export interface Period {
  id: string;
  name: string;
  progress: number;
  expanded?: boolean;
  children?: Period[];
  items?: ChecklistItem[];
}

// ============================================================================
// ABSENCES ET CONGÉS
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
  overlapping_tasks?: Task[];
  overdue_tasks?: Task[];
  high_priority_tasks?: Task[];
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

// ============================================================================
// FICHIERS
// ============================================================================

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

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export interface NotificationResponse {
  id: string;
  titre: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'invitation';
  is_read: boolean;
  est_globale: boolean;
  target_type?: 'workspace' | 'espace' | 'liste' | 'tache' | 'user';
  target_id?: string;
  data?: Record<string, any>;
  date_creation: string;
  date_lecture?: string;
  id_utilisateur: string;
  utilisateur?: {
    id: string;
    username: string;
    email: string;
  };
}

export interface NotificationCreateRequest {
  titre: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'invitation';
  est_globale?: boolean;
  id_utilisateur?: string;
  target_type?: 'workspace' | 'espace' | 'liste' | 'tache' | 'user';
  target_id?: string;
  data?: Record<string, any>;
}

export interface UnreadCountResponse {
  count: number;
}

// ============================================================================
// DASHBOARD
// ============================================================================

export interface DashboardStats {
  total_projects: number;
  total_spaces: number;
  active_members: number;
  recent_activities: NotificationResponse[];
}

// ============================================================================
// RAPPORTS
// ============================================================================

export interface RapportResponse {
  id: string;
  titre: string;
  contenu: string;
  type: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// RECHERCHE
// ============================================================================

export interface SearchRequest {
  q: string;
  workspace_id?: string;
  espace_id?: string;
  liste_id?: string;
}

export interface SearchResults {
  tasks: TacheFullResponse[];
  lists: ListeResponse[];
  espaces: EspaceResponse[];
  members: Member[];
  files: FichierResponse[];
}