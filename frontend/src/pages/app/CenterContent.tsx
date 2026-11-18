// frontend/src/pages/app/CenterContent.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserPlus, LayoutGrid, KanbanSquare, GitBranch, Users, ListTodo, Wrench, Search, Calendar, BarChart3, Clock, AlertTriangle, CheckCircle2, MessageCircle, Download, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import KanbanView from './views/KanbanView';
import GanttView from './views/GanttView';
import MemberManagement from '../../components/members/MemberManagement';
import SpaceDashboard from './components/SpaceDashboard';
import WorkspaceDashboardPanel from './components/WorkspaceDashboardPanel';
import PlannerToolsPanel from './components/PlannerToolsPanel';
import AssignTaskMemberModal from '../../components/modals/AssignTaskMemberModal';
import AssignListMemberModal from '../../components/modals/AssignListMemberModal';
import TaskFormModal from './modals/TaskFormModal';
import ListView from './views/ListView';
import { useTasks, transformTask } from './hooks/useTasks';
import { useTaskChecklists } from './hooks/useTaskChecklists';
import { espaceService } from '../../services/espace.service';
import { listeService } from '../../services/liste.service';
import { tacheService } from '../../services/tache.service';
import { useWorkspaceRole } from '../../hooks/useWorkspaceRole';
import { useResourceRole } from '../../hooks/useResourceRole';
import { usePermissions } from '../../hooks/usePermissions';
import { useNavigationStore } from '../../store/useNavigationStore';
import { getRoleRank, ROLES, getRoleLabel } from '../../lib/roleHierarchy';
import { getMemberContactLabel, getMemberDisplayName } from '../../utils/memberDisplay';
import { sanitizeHtml, sanitizeText } from '../../utils/sanitize';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeApiErrorMessage } from '../../services/api';
import { toast } from '../../components/ui/Toast';
import type { Task, Member } from '../../types';

export default function CenterContent() {
  const { workspaceId, spaceId, listId, taskId } = useActiveResource();
  const { user } = useAuth();
  const location = useLocation();

  const [currentListWorkspaceId, setCurrentListWorkspaceId] = useState<string | null>(null);
  const [currentListEspaceId, setCurrentListEspaceId] = useState<string | null>(null);
  const [currentListDescription, setCurrentListDescription] = useState('');
  const [listInheritedSpaceRole, setListInheritedSpaceRole] = useState<string | null>(null);
  const [selectedSpaceInheritedRole, setSelectedSpaceInheritedRole] = useState<string | null>(null);
  const { joinedEspaces } = useNavigationStore();

  // Récupérer le rôle dans le workspace
  const { role: userWorkspaceRole, isAdmin: isWorkspaceAdmin, isCreator: isWorkspaceCreator } = useWorkspaceRole(workspaceId);

  // Récupérer le rôle dans l'espace (si un espace est sélectionné)
  const { role: userEspaceRole, isAdmin: isEspaceAdmin, isCreator: isEspaceCreator } = useResourceRole(spaceId !== 'list' ? spaceId : undefined, 'espace');

  // Récupérer le rôle dans la liste (si une liste est sélectionnée) – fallback
  const { isAdmin: isListeAdmin, isCreator: isListeCreator, role: listeRole } = useResourceRole(listId, 'liste');

  // ✅ Détection robuste du créateur direct de la liste via les membres réels
  const [listMembers, setListMembers] = useState<any[]>([]);
  const [isDirectListCreator, setIsDirectListCreator] = useState(false);
  useEffect(() => {
    if (!listId || !user) return;
    listeService.getMembers(listId)
      .then((members: Array<{ role?: string; id_utilisateur?: string }>) => {
        setListMembers(members);
        const creator = members.find((m) => m.role === ROLES.CREATOR);
        setIsDirectListCreator(creator?.id_utilisateur === user.id);
      })
      .catch(() => {
        setListMembers([]);
        setIsDirectListCreator(false);
      });
  }, [listId, user]);

  // Pour le toggle, on combine la détection robuste avec le fallback du store
  const effectiveIsDirectListCreator = isDirectListCreator || (listeRole === ROLES.CREATOR && isListeCreator);

  const getHighestRole = (roles: Array<string | null | undefined>): string | null => {
    return roles.reduce<string | null>((highest, role) => {
      if (!role) return highest;
      return getRoleRank(role) > getRoleRank(highest) ? role : highest;
    }, null);
  };

  const effectiveRole = getHighestRole([
    listeRole,
    listInheritedSpaceRole,
    userEspaceRole,
    userWorkspaceRole,
  ]);
  const isAdmin = effectiveRole === ROLES.ADMIN;
  const isCreator = effectiveRole === ROLES.CREATOR;
  const isGuest = effectiveRole === ROLES.GUEST;
  const selectedSpacePanelRole = getHighestRole([
    selectedSpaceInheritedRole,
    userEspaceRole,
    userWorkspaceRole,
  ]);

  // Permissions
  const { canCreateContent } = usePermissions({
    userRole: effectiveRole,
    resourceType: listId ? 'liste' : spaceId ? 'espace' : 'workspace',
  });

  // Peut-on assigner des membres à la liste ?
  const canAssignToList = (isAdmin || isCreator || isListeAdmin || isListeCreator || isEspaceAdmin || isEspaceCreator || isWorkspaceAdmin || isWorkspaceCreator) && !!listId;

  // Définir les onglets disponibles selon le rôle
  const getAvailableTabs = useCallback((): ('liste' | 'kanban' | 'gantt' | 'membres' | 'outils')[] => {
    if (isGuest) {
      return ['liste', 'kanban', 'gantt', 'membres', 'outils'];
    }
    return ['liste', 'kanban', 'gantt', 'membres', 'outils'];
  }, [isGuest]);

  const availableTabs = getAvailableTabs();

  // States
  const [activeTab, setActiveTab] = useState<'liste' | 'kanban' | 'gantt' | 'membres' | 'outils'>(availableTabs[0]);
  const [requestedTool, setRequestedTool] = useState<'files' | 'reports' | 'absences'>('files');
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [taskFilters, setTaskFilters] = useState({
    statut: '',
    priorite: '',
    membre_id: '',
    overdue: false,
  });
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTaskForCreation, setParentTaskForCreation] = useState<Task | null>(null);
  const [isTaskModalLimited, setIsTaskModalLimited] = useState(false);
  const [taskModalError, setTaskModalError] = useState<string | null>(null);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<Task | null>(null);
  const [isAssignTaskModalOpen, setIsAssignTaskModalOpen] = useState(false);
  const [isAssignListModalOpen, setIsAssignListModalOpen] = useState(false);
  const [, setIsInitialTaskLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportVisible, setExportVisible] = useState<boolean>(() => {
    if (listId) {
      const stored = localStorage.getItem(`export-visible-${listId}`);
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });

  // ✅ AJOUT : État pour contrôler l'affichage des outils
  const [isToolsReady, setIsToolsReady] = useState(false);

  // Hooks
  const { tasks, loading, error, loadTasks, addTask, updateTask, updateTaskStatus, deleteTask, addChecklistToTask, toggleTaskChecklist, deleteTaskChecklist } = useTasks(listId);
  const { checklists, loading: checklistLoading, addChecklist, toggleChecklist, updateChecklistText, deleteChecklist } = useTaskChecklists(
    editingTask?.id,
    () => {
      loadTasks();
    }
  );

  // Sauvegarder la préférence exportVisible dans localStorage quand elle change
  useEffect(() => {
    if (listId) {
      localStorage.setItem(`export-visible-${listId}`, String(exportVisible));
    }
  }, [exportVisible, listId]);

  useEffect(() => {
    const tool = new URLSearchParams(location.search).get('tool');
    if (tool !== 'files' && tool !== 'reports' && tool !== 'absences') return;

    setRequestedTool(tool as any);
    if (listId) {
      setActiveTab('outils');
    }

    window.setTimeout(() => {
      document.getElementById('resource-files-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }, [location.search, listId]);

  // Charger les informations de la liste pour le dashboard
  useEffect(() => {
    const loadListInfo = async () => {
      if (listId) {
        try {
          const liste = await listeService.getById(listId);
          setCurrentListWorkspaceId(liste.id_workspace || null);
          setCurrentListEspaceId(liste.id_espace || null);
          setCurrentListDescription(liste.description || '');
        } catch (err) {
          console.error('Erreur chargement infos liste:', err);
          setCurrentListDescription('');
        }
      } else {
        setCurrentListDescription('');
      }
    };
    loadListInfo();
  }, [listId]);

  // Support du lien direct vers une tâche (/tache/:id)
  useEffect(() => {
    const resolveTaskContext = async () => {
      if (taskId && !listId) {
        setIsInitialTaskLoading(true);
        try {
          const taskData = await tacheService.getById(taskId);
          window.location.href = `/liste/${taskData.id_liste}?taskId=${taskId}`;
        } catch (err) {
          console.error("Erreur résolution contexte tâche:", err);
        } finally {
          setIsInitialTaskLoading(false);
        }
      }
    };
    resolveTaskContext();
  }, [taskId, listId]);

  // Ouvrir automatiquement la modale de tâche si taskId est présent
  useEffect(() => {
    if (taskId && listId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId);
      if (task && !editingTask) {
        openEditTask(task);
      }
    } else if (taskId && listId && tasks.length === 0 && !loading) {
      tacheService.getById(taskId).then(apiTask => {
        const task = transformTask(apiTask);
        setEditingTask(task);
        setIsTaskModalOpen(true);
      }).catch(console.error);
    }
  }, [taskId, listId, tasks, loading]);

  useEffect(() => {
    const resolveListInheritedSpaceRole = async () => {
      setListInheritedSpaceRole(null);
      if (!currentListEspaceId) return;
      if (listeRole) return;

      const hierarchy = await espaceService.getHierarchy(currentListEspaceId).catch(() => []);
      const roleCandidates = (Array.isArray(hierarchy) ? hierarchy : []).map((space: any) => {
        const role = joinedEspaces.find(espace => espace.id === space.id)?.role || null;
        const isCurrentListSpace = space.id === currentListEspaceId;
        const isInheritedRole = role === ROLES.CREATOR || role === ROLES.ADMIN || role === ROLES.MEMBER || role === ROLES.GUEST;
        return isCurrentListSpace || isInheritedRole ? role : null;
      });

      setListInheritedSpaceRole(getHighestRole(roleCandidates));
    };

    resolveListInheritedSpaceRole();
  }, [currentListEspaceId, joinedEspaces]);

  useEffect(() => {
    const resolveSelectedSpaceInheritedRole = async () => {
      setSelectedSpaceInheritedRole(null);
      if (!spaceId || spaceId === 'list') return;

      const hierarchy = await espaceService.getHierarchy(spaceId).catch(() => []);
      const roleCandidates = (Array.isArray(hierarchy) ? hierarchy : []).map((space: any) => {
        const role = joinedEspaces.find(espace => espace.id === space.id)?.role || null;
        const isSelectedSpace = space.id === spaceId;
        const isInheritedRole = role === ROLES.CREATOR || role === ROLES.ADMIN || role === ROLES.MEMBER || role === ROLES.GUEST;
        return isSelectedSpace || isInheritedRole ? role : null;
      });

      setSelectedSpaceInheritedRole(getHighestRole(roleCandidates));
    };

    resolveSelectedSpaceInheritedRole();
  }, [spaceId, joinedEspaces]);

  useEffect(() => {
    if (!canAssignToList && isAssignListModalOpen) {
      setIsAssignListModalOpen(false);
    }
  }, [canAssignToList, isAssignListModalOpen]);

  // Charger les membres de l'espace (seulement si l'onglet membres est disponible)
  useEffect(() => {
    if (!isGuest && spaceId && spaceId !== 'list') {
      espaceService.getMembers(spaceId)
        .then(data => {
          setMembers(data.map((m: any) => ({
            id: m.id_utilisateur || m.id,
            name: getMemberDisplayName(m),
            email: getMemberContactLabel(m),
            role: m.role,
          })));
        })
        .catch(() => setMembers([]));
    } else {
      setMembers([]);
    }
  }, [spaceId, isGuest]);

  // ✅ EFFET : Gérer l'état de préparation des outils
  useEffect(() => {
    if (!loading && tasks !== undefined) {
      // Petit délai pour que les données se stabilisent
      const timer = setTimeout(() => setIsToolsReady(true), 150);
      return () => clearTimeout(timer);
    } else {
      setIsToolsReady(false);
    }
  }, [loading, tasks]);

  const getTaskProgress = (task: Task): number => {
    if (typeof task.progression === 'number') {
      return Math.round(task.progression);
    }
    const taskChecklists = task.checklists || [];
    if (taskChecklists.length === 0) return 0;
    const checked = taskChecklists.filter(c => c.is_checked).length;
    return Math.round((checked / taskChecklists.length) * 100);
  };

  const renderListProgressSummary = () => {
    if (!listId || tasks.length === 0) return null;

    const rootTasks = tasks.filter(task => !task.parentTaskId);
    const projectTasks = rootTasks.length > 0 ? rootTasks : tasks;

    const pendingCount = projectTasks.filter(task => task.status === 'en attente').length;
    const inProgressCount = projectTasks.filter(task => task.status === 'en cours').length;
    const doneCount = projectTasks.filter(task => task.status === 'terminé').length;
    const blockedCount = projectTasks.filter(task => task.status === 'bloqué').length;

    const averageProgress = Math.round(
      projectTasks.reduce((total, task) => total + getTaskProgress(task), 0) / projectTasks.length
    );

    return (
      <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 sm:mb-8 sm:gap-4 xl:grid-cols-4">
        {/* Main Gauge Widget */}
        <div className="flex flex-col gap-4 rounded-2xl border border-theme-border-subtle bg-theme-surface/50 p-4 shadow-theme-md transition-all duration-300 hover:shadow-theme-lg sm:flex-row sm:items-center sm:gap-6 sm:p-6 xl:col-span-2">
          <div className="relative h-20 w-20 shrink-0 self-center sm:h-24 sm:w-24 sm:self-auto">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
              <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-theme-border-subtle" />
              <circle
                cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - averageProgress / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-theme-main">{averageProgress}%</span>
              <span className="text-[10px] text-theme-muted uppercase font-bold">Total</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 text-base font-black tracking-tight text-theme-main sm:text-lg">
              <BarChart3 className="h-4 w-4 text-secondary" />
              Etat du projet
            </h3>
            <p className="text-xs text-theme-muted mt-1 leading-relaxed">
              Progression globale basée sur les tâches/checklists complétées.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-theme-main">{tasks.length}</span>
                <span className="text-[9px] uppercase text-theme-muted font-bold tracking-widest">Tâches</span>
              </div>
              <div className="mt-1 hidden h-6 w-px bg-theme-border-subtle sm:block" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-emerald-500">{doneCount}</span>
                <span className="text-[9px] uppercase text-theme-muted font-bold tracking-widest">Succès</span>
              </div>
              <div className="mt-1 hidden h-6 w-px bg-theme-border-subtle sm:block" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-amber-500">{inProgressCount}</span>
                <span className="text-[9px] uppercase text-theme-muted font-bold tracking-widest">Actif</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:col-span-2">
          <div className="bg-theme-surface p-3 sm:p-4 rounded-2xl border border-theme-border-subtle shadow-theme-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <Clock className="h-4 w-4 text-theme-muted" />
              <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">En attente</span>
            </div>
            <span className="text-2xl font-black text-theme-main mt-1">{pendingCount}</span>
          </div>
          <div className="bg-theme-surface p-3 sm:p-4 rounded-2xl border border-theme-border-subtle shadow-theme-sm flex flex-col justify-between border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">En cours</span>
            </div>
            <span className="text-2xl font-black text-theme-main mt-1">{inProgressCount}</span>
          </div>
          <div className="bg-theme-surface p-3 sm:p-4 rounded-2xl border border-theme-border-subtle shadow-theme-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-start">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">Terminées</span>
            </div>
            <span className="text-2xl font-black text-theme-main mt-1">{doneCount}</span>
          </div>
          <div className="bg-theme-surface p-3 sm:p-4 rounded-2xl border border-theme-border-subtle shadow-theme-sm flex flex-col justify-between border-l-4 border-l-red-500">
            <div className="flex justify-between items-start">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">Bloquées</span>
            </div>
            <span className="text-2xl font-black text-theme-main mt-1">{blockedCount}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderListDescription = () => {
    if (!listId || !currentListDescription.trim()) return null;

    return (
      <div className="mb-5 rounded-xl border border-theme-border-subtle bg-theme-surface p-4 shadow-sm transition-colors duration-200">
        <p className="text-sm text-theme-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentListDescription) }} />
      </div>
    );
  };

  const renderListDiscussionButton = () => {
    if (!listId) return null;

    return (
      <div className="mb-5 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {effectiveIsDirectListCreator && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-theme-border-subtle bg-theme-surface/80 px-3 py-2 shadow-sm sm:justify-start">
            <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Export</span>
            <button
              onClick={() => setExportVisible(!exportVisible)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${exportVisible ? 'bg-secondary' : 'bg-theme-muted/30'
                }`}
              aria-label="Basculer la visibilité de l'export"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${exportVisible ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
              />
            </button>
            <span className="text-[10px] font-black text-theme-muted">
              {exportVisible ? 'Activé' : 'Désactivé'}
            </span>
          </div>
        )}

        {exportVisible && (
          <Button
            onClick={exportProject}
            disabled={exporting}
            className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-50 sm:w-auto"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exporter le projet
          </Button>
        )}

        <Link
          to={`/messagerie?resource_type=liste&resource_id=${listId}`}
          className="inline-flex w-full items-center justify-center rounded-xl border border-secondary/25 bg-secondary/10 px-4 py-2 text-sm font-bold text-secondary shadow-theme-sm transition-all hover:border-secondary hover:bg-secondary hover:text-white sm:w-auto"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Voir la discussion
        </Link>
      </div>
    );
  };

  // Fonction d'export du projet
  const exportProject = async () => {
    if (!listId) return;
    setExporting(true);
    try {
      const [listeData, membersData, tasksData] = await Promise.all([
        listeService.getById(listId),
        listeService.getMembers(listId),
        tacheService.getByListe(listId)
      ]);

      const taskMap = new Map();
      tasksData.forEach((t: any) => {
        const checklists = t.checklists || [];
        taskMap.set(t.id, { ...t, children: [], checklists });
      });
      const rootTasks: any[] = [];
      tasksData.forEach((t: any) => {
        if (t.id_tache_parent && taskMap.has(t.id_tache_parent)) {
          taskMap.get(t.id_tache_parent).children.push(taskMap.get(t.id));
        } else {
          rootTasks.push(taskMap.get(t.id));
        }
      });

      const creator = membersData.find((m: any) => m.role === ROLES.CREATOR);
      const directMembers = membersData.filter((m: any) => m.role !== ROLES.CREATOR);

      const totalTasks = tasksData.length;
      const doneTasks = tasksData.filter((t: any) => t.statut === 'terminé').length;
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      const renderTaskHTML = (task: any, level: number = 0, isLast: boolean = false): string => {
        const statusColors: Record<string, { bg: string, text: string, border: string }> = {
          'en attente': { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
          'en cours': { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
          'terminé': { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
          'bloqué': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }
        };
        const st = statusColors[task.statut] || { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' };

        const priorityColors: Record<string, { bg: string, text: string }> = {
          'basse': { bg: '#f1f5f9', text: '#64748b' },
          'moyenne': { bg: '#e0f2fe', text: '#0284c7' },
          'haute': { bg: '#ffedd5', text: '#c2410c' },
          'critique': { bg: '#fee2e2', text: '#b91c1c' }
        };
        const pt = task.priority ? (priorityColors[task.priority] || priorityColors['moyenne']) : null;

        const assignees = task.assignees?.map((a: any) => a.name).join(', ') || 'Non assigné';
        const taskTitle = sanitizeText(task.titre || 'Sans titre');
        const checklistsHTML = task.checklists && task.checklists.length > 0
          ? `<ul class="checklist">
              ${task.checklists.map((c: any) => `
                <li class="${c.is_checked ? 'checked' : ''}">
                  <span class="icon">${c.is_checked ? '✓' : '○'}</span>
                  ${sanitizeText(c.texte)}
                </li>
              `).join('')}
            </ul>`
          : '';

        const hasChildren = task.children && task.children.length > 0;

        return `
          <div class="task-node" style="margin-left: ${level > 0 ? 32 : 0}px;">
            ${level > 0 ? `<div class="tree-line ${isLast ? 'last' : ''}"></div>` : ''}
            <div class="task-card">
              <div class="task-header">
                <span class="task-title">${taskTitle}</span>
                <div class="task-badges">
                  <span class="badge" style="background: ${st.bg}; color: ${st.text}; border: 1px solid ${st.border};">${task.statut}</span>
                  ${pt ? `<span class="badge" style="background: ${pt.bg}; color: ${pt.text};">${task.priority}</span>` : ''}
                </div>
              </div>
              
              <div class="task-meta">
                <span class="assignees">👤 ${assignees}</span>
                <span class="dates">
                  ${task.date_debut ? `Début: <strong>${new Date(task.date_debut).toLocaleDateString('fr-FR')}</strong>` : ''}
                  ${task.date_debut && task.date_fin_prevue ? ' • ' : ''}
                  ${task.date_fin_prevue ? `Échéance: <strong>${new Date(task.date_fin_prevue).toLocaleDateString('fr-FR')}</strong>` : ''}
                </span>
              </div>
              
              ${task.description ? `<div class="task-desc">${sanitizeText(task.description)}</div>` : ''}
              ${checklistsHTML}
            </div>
            
            ${hasChildren ? `
              <div class="task-children">
                ${task.children.map((child: any, i: number) => renderTaskHTML(child, level + 1, i === task.children.length - 1)).join('')}
              </div>
            ` : ''}
          </div>
        `;
      };

      const tasksHTML = rootTasks.map((task: any) => renderTaskHTML(task, 0)).join('');

      const canevasHTML = '<p style="color: #6b7280; font-style: italic;">Aucun canevas associé à ce projet.</p>';

      const docTitle = `Projet: ${sanitizeText(listeData.nom || 'Projet')}`;
      const exportDate = new Date().toLocaleString('fr-FR');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${docTitle}</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            <style>
              :root {
                --primary: #4f46e5;
                --primary-soft: #eef2ff;
                --text-main: #0f172a;
                --text-muted: #64748b;
                --bg-main: #f8fafc;
                --bg-card: #ffffff;
                --border-color: #e2e8f0;
              }
              body { 
                font-family: 'Inter', sans-serif; 
                padding: 40px; 
                color: var(--text-main); 
                line-height: 1.6; 
                max-width: 1100px; 
                margin: 0 auto; 
                background: white;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              h1, h2, h3, h4, .title-font { font-family: 'Outfit', sans-serif; }
              
              /* Header Styling */
              .header { 
                position: relative;
                padding: 40px; 
                margin-bottom: 40px; 
                border-radius: 24px;
                background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
                border: 1px solid #dcfce7;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
              }
              .header::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0; height: 8px;
                background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%);
                border-radius: 24px 24px 0 0;
              }
              .header-content { display: flex; justify-content: space-between; align-items: flex-end; }
              .meta-label { font-family: 'Outfit'; font-size: 13px; color: #10b981; text-transform: uppercase; font-weight: 800; letter-spacing: 2px; }
              .title { font-size: 38px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0; letter-spacing: -0.5px; line-height: 1.1; }
              .export-date { text-align: right; font-size: 13px; color: var(--text-muted); font-weight: 500; }
              
              .project-desc { font-size: 15px; color: #475569; margin: 24px 0 0 0; background: white; padding: 16px 24px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
              
              .section { margin-bottom: 40px; page-break-inside: auto; }
              .section-title { 
                display: flex; align-items: center; gap: 10px;
                font-family: 'Outfit'; font-size: 18px; font-weight: 800; color: var(--text-main); 
                margin-bottom: 20px; padding-bottom: 12px; 
                border-bottom: 2px solid var(--border-color); 
              }
              
              /* Info Grid */
              .info-grid { 
                display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; 
              }
              .info-item { 
                background: var(--bg-card); padding: 20px; border-radius: 16px; 
                border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
              }
              .info-item .label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
              .info-item .value { font-size: 24px; font-family: 'Outfit'; font-weight: 800; color: var(--primary); }
              
              /* Members */
              .member-list { display: flex; flex-wrap: wrap; gap: 12px; }
              .member-tag { 
                display: inline-flex; align-items: center; gap: 6px;
                background: var(--bg-card); padding: 8px 16px; border-radius: 20px; 
                font-size: 13px; font-weight: 600; color: var(--text-main);
                border: 1px solid var(--border-color);
              }
              .member-tag.creator { background: var(--primary-soft); color: var(--primary); border-color: #c7d2fe; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.1); }
              .member-role { font-size: 11px; opacity: 0.7; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
              
              /* Task Tree */
              .task-tree { margin-top: 20px; }
              .task-node { position: relative; margin-top: 16px; }
              .tree-line { 
                position: absolute; top: -16px; bottom: 20px; left: -16px; 
                width: 1px; background: #cbd5e1; 
              }
              .tree-line::after {
                content: ''; position: absolute; bottom: 0; left: 0; width: 12px; height: 1px; background: #cbd5e1;
              }
              .tree-line.last { bottom: auto; height: 36px; }
              
              .task-card {
                background: var(--bg-card); padding: 16px 20px; border-radius: 16px; 
                border: 1px solid var(--border-color);
                box-shadow: 0 2px 5px rgba(0,0,0,0.02);
              }
              .task-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 8px; }
              .task-title { font-family: 'Outfit'; font-size: 16px; font-weight: 700; color: var(--text-main); line-height: 1.3; }
              .task-badges { display: flex; gap: 8px; flex-wrap: wrap; }
              .badge { 
                font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; 
                padding: 4px 10px; border-radius: 12px; 
              }
              
              .task-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; margin-bottom: 8px; color: var(--text-muted); }
              .task-meta .assignees { display: flex; align-items: center; gap: 4px; font-weight: 500; }
              .task-meta .dates strong { color: var(--text-main); }
              
              .task-desc { font-size: 13px; color: #475569; margin-top: 8px; background: var(--bg-main); padding: 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid #f1f5f9; }
              
              .checklist { margin: 12px 0 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
              .checklist li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-main); }
              .checklist li.checked { color: var(--text-muted); text-decoration: line-through; }
              .checklist .icon { font-weight: bold; font-family: monospace; font-size: 14px; }
              .checklist li.checked .icon { color: #10b981; }
              
              .footer { 
                margin-top: 60px; border-top: 1px solid var(--border-color); padding-top: 24px; 
                font-family: 'Outfit'; font-size: 13px; display: flex; justify-content: space-between; 
                color: var(--text-muted); font-weight: 500; 
              }
              
              @media print {
                body { padding: 0; max-width: none; }
                .header { border: 1px solid var(--border-color); box-shadow: none; }
                .task-card { border: 1px solid #cbd5e1; box-shadow: none; break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-content">
                <div>
                  <div class="meta-label">Rapport de Projet</div>
                  <h1 class="title">${listeData.nom || 'Projet'}</h1>
                </div>
                <div class="export-date">Date d'export<br><strong>${exportDate}</strong></div>
              </div>
              ${listeData.description ? `<div class="project-desc">${sanitizeText(listeData.description)}</div>` : ''}
            </div>

            <div class="section">
              <div class="info-grid">
                <div class="info-item"><span class="label">Avancement Global</span><span class="value">${progress}%</span></div>
                <div class="info-item"><span class="label">Tâches Totales</span><span class="value">${totalTasks}</span></div>
                <div class="info-item"><span class="label">Tâches Terminées</span><span style="color:#10b981;" class="value">${doneTasks}</span></div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">👥 Équipe du Projet</div>
              <div class="member-list">
                ${creator ? `<span class="member-tag creator"><span>👑</span> ${getMemberDisplayName(creator)} <span class="member-role">(${getRoleLabel(creator.role)})</span></span>` : ''}
                ${directMembers.map((m: any) => `
                  <span class="member-tag"><span>👤</span> ${getMemberDisplayName(m)} <span class="member-role">(${getRoleLabel(m.role)})</span></span>
                `).join('')}
              </div>
            </div>

            ${canevasHTML ? `
            <div class="section">
              <div class="section-title">🗺️ Stratégie (Canevas)</div>
              <div>${canevasHTML}</div>
            </div>` : ''}

            <div class="section" style="break-inside: auto;">
              <div class="section-title">📋 Répartition des Tâches</div>
              <div class="task-tree">
                ${tasksHTML || '<p style="color: #64748b; font-style: italic;">Aucune tâche dans ce projet pour le moment.</p>'}
              </div>
            </div>

            <div class="footer">
              <span>Généré par <strong>K-Planner</strong></span>
              <span>Propriété confidentielle</span>
            </div>

            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

      const win = window.open('', '_blank');
      if (win) {
        win.document.write(htmlContent);
        win.document.close();
      } else {
        toast.error('Impossible d\'ouvrir la fenêtre d\'export. Vérifiez que les pop-ups ne sont pas bloqués.');
      }

    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error(sanitizeApiErrorMessage(error, 'Erreur lors de l\'export du projet'));
    } finally {
      setExporting(false);
    }
  };

  const openCreateTask = () => {
    if (!canCreateContent) return;
    setEditingTask(null);
    setParentTaskForCreation(null);
    setIsTaskModalLimited(false);
    setTaskModalError(null);
    setIsTaskModalOpen(true);
  };

  const openCreateSubtask = (parentTask: Task) => {
    if (!canCreateContent && !canOperateAssignedTask(parentTask)) return;
    setEditingTask(null);
    setParentTaskForCreation(parentTask);
    setIsTaskModalLimited(false);
    setTaskModalError(null);
    setIsTaskModalOpen(true);
  };

  const getTaskAssignees = (task?: Task | null) => Array.isArray(task?.assignees) ? task.assignees : [];

  const canOperateAssignedTask = (task: Task): boolean => {
    if (!user?.id) return false;
    if (getTaskAssignees(task).some(assignee => assignee.id === user.id)) return true;

    let parentId = task.parentTaskId || null;
    const visited = new Set<string>();
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parentTask = tasks.find(item => item.id === parentId);
      if (!parentTask) return false;
      if (getTaskAssignees(parentTask).some(assignee => assignee.id === user.id)) return true;
      parentId = parentTask.parentTaskId || null;
    }

    return false;
  };

  const canManageTaskFully = (task: Task): boolean => {
    if (canCreateContent) return true;
    if (!user?.id) return false;

    return getTaskAssignees(task).some(assignee =>
      assignee.id === user.id &&
      assignee.role === 'Créateur'
    );
  };

  const openEditTask = (task: Task) => {
    if (!canCreateContent && !canOperateAssignedTask(task)) return;
    setEditingTask(task);
    setParentTaskForCreation(null);
    setIsTaskModalLimited(!canManageTaskFully(task) && canOperateAssignedTask(task));
    setTaskModalError(null);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (formData: any) => {
    setTaskModalError(null);
    try {
      const normalizedTaskTitle = formData.title?.trim().toLowerCase();
      if (normalizedTaskTitle) {
        const targetParentId = editingTask
          ? editingTask.parentTaskId || null
          : parentTaskForCreation?.id || null;
        const duplicateTask = tasks.find(task =>
          task.id !== editingTask?.id &&
          (task.parentTaskId || null) === targetParentId &&
          task.title.trim().toLowerCase() === normalizedTaskTitle
        );
        if (duplicateTask) {
          setTaskModalError(
            targetParentId
              ? "Cette tâche contient déjà une sous-tâche portant exactement ce nom. Deux sous-tâches au même niveau doivent avoir des noms différents."
              : "Ce projet contient déjà une tâche directe portant exactement ce nom. Deux tâches directes du même projet doivent avoir des noms différents."
          );
          return;
        }
      }

      if (isTaskModalLimited && editingTask) {
        await updateTaskStatus(editingTask.id, formData.status);
        setIsTaskModalOpen(false);
        setEditingTask(null);
        setIsTaskModalLimited(false);
        return;
      }

      const canCreateSubtaskForParent = !!parentTaskForCreation && canOperateAssignedTask(parentTaskForCreation);
      if (!canCreateContent && !canCreateSubtaskForParent) return;
      if (editingTask) {
        await updateTask({ ...editingTask, ...formData });
      } else {
        await addTask({ ...formData, listId: listId!, parentTaskId: parentTaskForCreation?.id || null });
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
      setParentTaskForCreation(null);
      setIsTaskModalLimited(false);
    } catch (err: any) {
      const message = sanitizeApiErrorMessage(err, 'Erreur lors de l’enregistrement de la tâche');
      setTaskModalError(message);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchTerm || task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatut = !taskFilters.statut || task.status === taskFilters.statut;
    const matchesPriorite = !taskFilters.priorite || task.priority === taskFilters.priorite;
    const matchesMembre = !taskFilters.membre_id || getTaskAssignees(task).some(a => a.id === taskFilters.membre_id);

    let matchesOverdue = true;
    if (taskFilters.overdue) {
      const now = new Date();
      matchesOverdue = !!task.dueDate && new Date(task.dueDate) < now && task.status !== 'terminé';
    }

    return matchesSearch && matchesStatut && matchesPriorite && matchesMembre && matchesOverdue;
  });

  // Si aucune liste n'est sélectionnée
  if (!listId) {
    if (spaceId && spaceId !== 'list') {
      return (
        <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden p-3 sm:p-6">
          <SpaceDashboard spaceId={spaceId} />
          <div id="resource-files-panel" className="scroll-mt-6">
            <PlannerToolsPanel
              workspaceId={workspaceId}
              espaceId={spaceId}
              currentUserId={user?.id}
              effectiveRole={selectedSpacePanelRole}
              tasks={[]}
              initialTool={requestedTool}
              onTasksChanged={loadTasks}
            />
          </div>
        </div>
      );
    }
    if (workspaceId) {
      return (
        <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden p-3 sm:p-6">
          <WorkspaceDashboardPanel workspaceId={workspaceId} />
          <div id="resource-files-panel" className="scroll-mt-6">
            <PlannerToolsPanel
              workspaceId={workspaceId}
              currentUserId={user?.id}
              effectiveRole={userWorkspaceRole}
              tasks={[]}
              initialTool={requestedTool}
              onTasksChanged={loadTasks}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full min-w-0 max-w-full items-center justify-center overflow-x-hidden p-3 sm:p-6">
        <div className="text-center text-theme-muted">
          <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium text-theme-main">Aucune liste sélectionnée</p>
          <p className="text-sm">Cliquez sur une liste dans le menu de gauche pour voir ses tâches.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-4 sm:p-6 flex justify-center">Chargement des tâches...</div>;
  if (error) return <div className="p-4 sm:p-6 flex justify-center text-red-500">{error}</div>;

  const isListGuest = effectiveRole === ROLES.GUEST;

  // Vue invité (lecture seule)
  if (isGuest || isListGuest) {
    return (
      <div className="min-w-0 max-w-full overflow-x-hidden p-3 sm:p-6">
        <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4 sm:p-6 mb-6 shadow-theme-sm">
          <p className="text-sm text-theme-main font-bold uppercase tracking-widest text-[11px] flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(255,102,0,0.6)]" />
            Mode <strong>lecture seule</strong> {isListGuest ? 'dans cette liste' : 'dans cet espace'}
          </p>
          <p className="text-[10px] text-theme-muted font-black uppercase tracking-tighter mt-1 opacity-60">
            Consultation active. Création et modification restreintes.
          </p>
        </div>

        {renderListDiscussionButton()}
        {renderListProgressSummary()}
        {renderListDescription()}

        <div className="mb-5 grid grid-cols-2 gap-2 border-b border-theme-border-subtle pb-3 sm:flex sm:overflow-x-auto custom-scrollbar-hidden">
          {availableTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all sm:min-h-0 sm:shrink-0 sm:justify-start sm:px-4 sm:text-sm sm:font-medium ${activeTab === tab ? 'bg-secondary text-white shadow-md' : 'text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main'
                }`}
            >
              {tab === 'liste' && <LayoutGrid className="w-4 h-4" />}
              {tab === 'kanban' && <KanbanSquare className="w-4 h-4" />}
              {tab === 'gantt' && <GitBranch className="w-4 h-4" />}
              {tab === 'membres' && <Users className="w-4 h-4" />}
              {tab === 'outils' && <Wrench className="w-4 h-4" />}
              {tab === 'liste' && (
                <>
                  <span className="sm:hidden">Liste</span>
                  <span className="hidden sm:inline">Vue liste</span>
                </>
              )}
              {tab === 'kanban' && (
                <>
                  <span className="sm:hidden">Kanban</span>
                  <span className="hidden sm:inline">Vue Kanban</span>
                </>
              )}
              {tab === 'gantt' && (
                <>
                  <span className="sm:hidden">Gantt</span>
                  <span className="hidden sm:inline">Diagramme de Gantt</span>
                </>
              )}
              {tab === 'membres' && 'Membres'}
              {tab === 'outils' && 'Outils'}
            </button>
          ))}
        </div>

        {activeTab === 'liste' && (
          <ListView
            tasks={tasks}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onDeleteTask={() => { }}
            onAssignTask={() => { }}
            getTaskProgress={getTaskProgress}
            readOnly={true}
          />
        )}

        {activeTab === 'kanban' && <KanbanView tasks={tasks} onUpdateTask={() => { }} />}
        {activeTab === 'gantt' && <GanttView tasks={tasks} />}
        {activeTab === 'membres' && (
          <MemberManagement
            listeId={listId}
            espaceId={currentListEspaceId || (spaceId && spaceId !== 'list' ? spaceId : undefined)}
            workspaceId={currentListWorkspaceId || workspaceId || undefined}
            currentUserRole={ROLES.GUEST}
            searchQuery={memberSearchTerm}
          />
        )}
        {activeTab === 'outils' && (
          <PlannerToolsPanel
            workspaceId={currentListWorkspaceId || workspaceId}
            espaceId={currentListEspaceId || (spaceId && spaceId !== 'list' ? spaceId : undefined)}
            listeId={listId}
            currentUserId={user?.id}
            effectiveRole={effectiveRole}
            tasks={tasks}
            initialTool={requestedTool}
            onTasksChanged={loadTasks}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden p-3 sm:p-6">
      {renderListDiscussionButton()}
      {renderListProgressSummary()}
      {renderListDescription()}

      <div className="mb-5 grid grid-cols-2 gap-2 border-b border-theme-border-subtle pb-3 sm:flex sm:overflow-x-auto custom-scrollbar-hidden">
        {availableTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all sm:min-h-0 sm:shrink-0 sm:justify-start sm:px-4 sm:text-sm sm:font-medium ${activeTab === tab ? 'bg-secondary text-white shadow-md' : 'text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main'
              }`}
          >
            {tab === 'liste' && <LayoutGrid className="w-4 h-4" />}
            {tab === 'kanban' && <KanbanSquare className="w-4 h-4" />}
            {tab === 'gantt' && <GitBranch className="w-4 h-4" />}
            {tab === 'membres' && <Users className="w-4 h-4" />}
            {tab === 'outils' && <Wrench className="w-4 h-4" />}
            {tab === 'liste' && (
              <>
                <span className="sm:hidden">Liste</span>
                <span className="hidden sm:inline">Vue liste</span>
              </>
            )}
            {tab === 'kanban' && (
              <>
                <span className="sm:hidden">Kanban</span>
                <span className="hidden sm:inline">Vue Kanban</span>
              </>
            )}
            {tab === 'gantt' && (
              <>
                <span className="sm:hidden">Gantt</span>
                <span className="hidden sm:inline">Diagramme de Gantt</span>
              </>
            )}
            {tab === 'membres' && 'Membres'}
            {tab === 'outils' && 'Outils'}
          </button>
        ))}
      </div>

      {activeTab !== 'membres' && activeTab !== 'outils' && (
        <div className="mb-6 space-y-3 rounded-xl border border-theme-border-subtle bg-theme-surface p-3 shadow-sm transition-colors duration-200 sm:space-y-4 sm:p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
              <input
                type="text"
                placeholder="Rechercher une tâche..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-theme-border-subtle bg-theme-surface rounded-lg text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
            <select value={taskFilters.statut} onChange={e => setTaskFilters(prev => ({ ...prev, statut: e.target.value }))} className="border border-theme-border-subtle bg-theme-surface rounded-lg px-2 py-2 text-sm text-theme-main outline-none">
              <option value="">Tous statuts</option>
              <option value="en attente">En attente</option>
              <option value="en cours">En cours</option>
              <option value="terminé">Terminé</option>
              <option value="bloqué">Bloqué</option>
            </select>
            <select value={taskFilters.priorite} onChange={e => setTaskFilters(prev => ({ ...prev, priorite: e.target.value }))} className="border border-theme-border-subtle bg-theme-surface rounded-lg px-2 py-2 text-sm text-theme-main outline-none">
              <option value="">Toutes priorités</option>
              <option value="basse">Basse</option>
              <option value="moyenne">Moyenne</option>
              <option value="haute">Haute</option>
              <option value="critique">Critique</option>
            </select>
            <select value={taskFilters.membre_id} onChange={e => setTaskFilters(prev => ({ ...prev, membre_id: e.target.value }))} className="border border-theme-border-subtle bg-theme-surface rounded-lg px-2 py-2 text-sm text-theme-main outline-none">
              <option value="">Tous membres</option>
              {members
                .filter(member => member.role !== ROLES.GUEST)
                .map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
            <div className="flex items-center gap-2 px-2 border border-theme-border-subtle rounded-lg bg-theme-surface">
              <input
                type="checkbox"
                id="overdue-filter"
                checked={taskFilters.overdue}
                onChange={e => setTaskFilters(prev => ({ ...prev, overdue: e.target.checked }))}
                className="accent-secondary"
              />
              <label htmlFor="overdue-filter" className="text-sm text-theme-muted flex items-center gap-1 cursor-pointer">
                <Calendar className="h-3 w-3" /> En retard
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:flex-wrap">
        {(isAdmin || isCreator) && activeTab !== 'membres' && activeTab !== 'outils' && (
          <Button variant="primary" size="sm" onClick={openCreateTask} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" /> Nouvelle tâche
          </Button>
        )}
        {(isAdmin || isCreator) && activeTab === 'membres' && (
          <div className="flex-1 flex gap-2">
            <div className="relative w-full sm:max-w-sm sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
              <input
                type="text"
                placeholder="Rechercher un membre..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-theme-border-subtle bg-theme-surface rounded-lg text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
              />
            </div>
          </div>
        )}
        {(isAdmin || isCreator) && canAssignToList && activeTab !== 'outils' && (
          <Button variant="outline" size="sm" onClick={() => setIsAssignListModalOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-1" /> Ajouter membre à la liste
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'liste' && (
            <ListView
              tasks={filteredTasks}
              searchTerm=""
              onSearchChange={() => { }}
              onDeleteTask={deleteTask}
              onAssignTask={(task) => { if (canCreateContent) { setSelectedTaskForAssignment(task); setIsAssignTaskModalOpen(true); } }}
              onUpdateTaskStatus={updateTaskStatus as any}
              onAddChecklist={addChecklistToTask}
              onToggleChecklist={toggleTaskChecklist}
              onDeleteChecklist={deleteTaskChecklist}
              onCreateSubtask={openCreateSubtask}
              onTasksChanged={loadTasks}
              getTaskProgress={getTaskProgress}
              readOnly={!canCreateContent}
              canOperateTask={(task) => canCreateContent || canOperateAssignedTask(task)}
              canEditTask={canManageTaskFully}
              canDeleteTask={(task) => canCreateContent}
              canAssignTask={() => canCreateContent}
              canAttachTaskFiles={(task) => canCreateContent || canOperateAssignedTask(task)}
              canManageTaskFiles={() => canCreateContent}
              focusTaskId={taskId}
            />
          )}

          {activeTab === 'kanban' && (
            <KanbanView
              tasks={filteredTasks}
              onUpdateTask={async (updatedTask) => {
                const canOperate = canCreateContent || canOperateAssignedTask(updatedTask);
                if (!canOperate) return;
                try {
                  if (canManageTaskFully(updatedTask) || canCreateContent) {
                    await updateTask(updatedTask);
                  } else {
                    await updateTaskStatus(updatedTask.id, updatedTask.status);
                  }
                } catch (err: any) {
                  toast.error(sanitizeApiErrorMessage(err, "Impossible de modifier le statut de la tâche."));
                }
              }}
            />
          )}
          {activeTab === 'gantt' && <GanttView tasks={filteredTasks} />}

          {activeTab === 'outils' && (
            // ✅ Utilisation de isToolsReady pour éviter le clignotement
            <div className="tools-panel">
              {isToolsReady ? (
                <PlannerToolsPanel
                  workspaceId={currentListWorkspaceId || workspaceId}
                  espaceId={currentListEspaceId || (spaceId && spaceId !== 'list' ? spaceId : undefined)}
                  listeId={listId}
                  currentUserId={user?.id}
                  effectiveRole={effectiveRole}
                  tasks={tasks}
                  initialTool={requestedTool}
                  onTasksChanged={loadTasks}
                />
              ) : (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-secondary/40" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'membres' && (
            <MemberManagement
              listeId={listId}
              espaceId={currentListEspaceId || (spaceId && spaceId !== 'list' ? spaceId : undefined)}
              workspaceId={currentListWorkspaceId || workspaceId || undefined}
              currentUserRole={effectiveRole}
              searchQuery={memberSearchTerm}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {(isAdmin || isCreator || isTaskModalLimited || parentTaskForCreation) && (
        <>
          <TaskFormModal
            isOpen={isTaskModalOpen}
            onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); setParentTaskForCreation(null); setIsTaskModalLimited(false); setTaskModalError(null); }}
            editingTask={editingTask}
            parentTask={parentTaskForCreation}
            members={members}
            checklists={checklists}
            checklistLoading={checklistLoading}
            onAddChecklist={addChecklist}
            onToggleChecklist={toggleChecklist}
            onUpdateChecklistText={updateChecklistText}
            onDeleteChecklist={deleteChecklist}
            onSubmit={handleTaskSubmit}
            limitedOperational={isTaskModalLimited}
            submitError={taskModalError}
            onAssignMemberTrigger={() => { if (editingTask) { setSelectedTaskForAssignment(editingTask); setIsAssignTaskModalOpen(true); } }}
            tasks={tasks}
          />

          {(isAdmin || isCreator) && (
            <>
              <AssignTaskMemberModal
                tacheId={selectedTaskForAssignment?.id || ''}
                listeId={listId}
                isOpen={isAssignTaskModalOpen}
                onClose={() => { setIsAssignTaskModalOpen(false); setSelectedTaskForAssignment(null); }}
                onSuccess={loadTasks}
              />

              <AssignListMemberModal
                listeId={listId}
                espaceId={currentListEspaceId || (spaceId && spaceId !== 'list' ? spaceId : undefined)}
                workspaceId={currentListWorkspaceId || workspaceId || undefined}
                isOpen={isAssignListModalOpen}
                onClose={() => setIsAssignListModalOpen(false)}
                onSuccess={loadTasks}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
