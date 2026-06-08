import { useState, useEffect } from 'react';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserPlus, LayoutGrid, KanbanSquare, GitBranch, Users, ListTodo, Wrench, Search, Calendar, BarChart3, Clock, AlertTriangle, CheckCircle2, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { useTasks } from './hooks/useTasks';
import { useTaskChecklists } from './hooks/useTaskChecklists';
import { espaceService } from '../../services/espace.service';
import { listeService } from '../../services/liste.service';
import { useWorkspaceRole } from '../../hooks/useWorkspaceRole';
import { useResourceRole } from '../../hooks/useResourceRole';
import { usePermissions } from '../../hooks/usePermissions';
import { useNavigationStore } from '../../store/useNavigationStore';
import { getRoleRank, ROLES } from '../../lib/roleHierarchy';
import { getMemberDisplayName, getMemberEmail } from '../../utils/memberDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeApiErrorMessage } from '../../services/api';
import type { Task, Member } from '../../types';

export default function CenterContent() {
  const { workspaceId, spaceId, listId } = useActiveResource();
  const { user } = useAuth();

  const [currentListWorkspaceId, setCurrentListWorkspaceId] = useState<string | null>(null);
  const [currentListEspaceId, setCurrentListEspaceId] = useState<string | null>(null);
  const [currentListDescription, setCurrentListDescription] = useState('');
  const [listInheritedSpaceRole, setListInheritedSpaceRole] = useState<string | null>(null);
  const { joinedEspaces } = useNavigationStore();

  // Récupérer le rôle dans le workspace
  const { role: userWorkspaceRole, isAdmin: isWorkspaceAdmin, isCreator: isWorkspaceCreator } = useWorkspaceRole(workspaceId);

  // Récupérer le rôle dans l'espace (si un espace est sélectionné)
  const { role: userEspaceRole, isAdmin: isEspaceAdmin, isCreator: isEspaceCreator } = useResourceRole(spaceId !== 'list' ? spaceId : undefined, 'espace');

  // Récupérer le rôle dans la liste (si une liste est sélectionnée)
  const { isAdmin: isListeAdmin, isCreator: isListeCreator, role: listeRole } = useResourceRole(listId, 'liste');

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

  // Permissions
  const { canCreateContent } = usePermissions({
    userRole: effectiveRole,
    resourceType: listId ? 'liste' : spaceId ? 'espace' : 'workspace',
  });

  // Peut-on assigner des membres à la liste ?
  const canAssignToList = (isAdmin || isCreator || isListeAdmin || isListeCreator || isEspaceAdmin || isEspaceCreator || isWorkspaceAdmin || isWorkspaceCreator) && !!listId;

  // Définir les onglets disponibles selon le rôle
  const getAvailableTabs = (): ('liste' | 'kanban' | 'gantt' | 'membres' | 'outils')[] => {
    if (isGuest) {
      return ['liste', 'kanban', 'gantt', 'outils'];
    }
    return ['liste', 'kanban', 'gantt', 'membres', 'outils'];
  };

  const availableTabs = getAvailableTabs();

  // States
  const [activeTab, setActiveTab] = useState<'liste' | 'kanban' | 'gantt' | 'membres' | 'outils'>(availableTabs[0]);
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
  const [isTaskModalLimited, setIsTaskModalLimited] = useState(false);
  const [taskModalError, setTaskModalError] = useState<string | null>(null);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<Task | null>(null);
  const [isAssignTaskModalOpen, setIsAssignTaskModalOpen] = useState(false);
  const [isAssignListModalOpen, setIsAssignListModalOpen] = useState(false);

  // Hooks
  const { tasks, loading, error, loadTasks, addTask, updateTask, updateTaskStatus, deleteTask, addChecklistToTask, toggleTaskChecklist, deleteTaskChecklist } = useTasks(listId);
  const { checklists, loading: checklistLoading, addChecklist, toggleChecklist, updateChecklistText, deleteChecklist } = useTaskChecklists(
    editingTask?.id,
    () => {
      loadTasks();
    }
  );

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
            email: getMemberEmail(m),
            role: m.role,
          })));
        })
        .catch(() => setMembers([]));
    } else {
      setMembers([]);
    }
  }, [spaceId, isGuest]);

  const getTaskProgress = (task: Task): number => {
    const taskChecklists = task.checklists || [];
    if (taskChecklists.length === 0) return 0;
    const checked = taskChecklists.filter(c => c.is_checked).length;
    return Math.round((checked / taskChecklists.length) * 100);
  };

  const renderListProgressSummary = () => {
    if (!listId || tasks.length === 0) return null;

    const pendingCount = tasks.filter(task => task.status === 'en attente').length;
    const inProgressCount = tasks.filter(task => task.status === 'en cours').length;
    const doneCount = tasks.filter(task => task.status === 'terminé').length;
    const blockedCount = tasks.filter(task => task.status === 'bloqué').length;

    const averageProgress = Math.round(
      tasks.reduce((total, task) => total + getTaskProgress(task), 0) / tasks.length
    );

    return (
      <div className="mb-6 sm:mb-8 grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Main Gauge Widget */}
        <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 rounded-2xl border border-theme-border-subtle bg-theme-surface/50 p-4 sm:p-6 shadow-theme-md hover:shadow-theme-lg transition-all duration-300">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0">
            <svg className="h-full w-full -rotate-90">
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
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-black text-theme-main tracking-tight flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-secondary" />
              Santé de la Liste
            </h3>
            <p className="text-xs text-theme-muted mt-1 leading-relaxed">
              Progression globale basée sur les checklists complétées.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-theme-main">{tasks.length}</span>
                <span className="text-[9px] uppercase text-theme-muted font-bold tracking-widest">Tâches</span>
              </div>
              <div className="w-px bg-theme-border-subtle h-6 mt-1" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-emerald-500">{doneCount}</span>
                <span className="text-[9px] uppercase text-theme-muted font-bold tracking-widest">Succès</span>
              </div>
              <div className="w-px bg-theme-border-subtle h-6 mt-1" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-amber-500">{inProgressCount}</span>
                <span className="text-[9px] uppercase text-theme-muted font-bold tracking-widest">Actif</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="md:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
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
        <p className="text-sm text-theme-muted leading-relaxed">{currentListDescription}</p>
      </div>
    );
  };

  const renderListDiscussionButton = () => {
    if (!listId) return null;

    return (
      <div className="mb-5 flex justify-stretch sm:justify-end">
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

  const openCreateTask = () => {
    if (!canCreateContent) return;
    setEditingTask(null);
    setIsTaskModalLimited(false);
    setTaskModalError(null);
    setIsTaskModalOpen(true);
  };

  const canOperateAssignedTask = (task: Task): boolean => {
    return !!user?.id && task.assignees.some(assignee => assignee.id === user.id);
  };

  const openEditTask = (task: Task) => {
    if (!canCreateContent && !canOperateAssignedTask(task)) return;
    setEditingTask(task);
    setIsTaskModalLimited(!canCreateContent && canOperateAssignedTask(task));
    setTaskModalError(null);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (formData: any) => {
    setTaskModalError(null);
    try {
      if (isTaskModalLimited && editingTask) {
        await updateTaskStatus(editingTask.id, formData.status);
        setIsTaskModalOpen(false);
        setEditingTask(null);
        setIsTaskModalLimited(false);
        return;
      }

      if (!canCreateContent) return;
      if (editingTask) {
        await updateTask({ ...editingTask, ...formData });
      } else {
        await addTask({ ...formData, listId: listId! });
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
      setIsTaskModalLimited(false);
    } catch (err: any) {
      const message = sanitizeApiErrorMessage(err, 'Erreur lors de l’enregistrement de la tâche');
      if (message.toLowerCase().includes('uniquement etre remise en cours ou bloquee')) {
        setTaskModalError('Une tâche terminée ne peut être remise qu’en cours ou bloquée.');
        return;
      }
      setTaskModalError(message);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchTerm || task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatut = !taskFilters.statut || task.status === taskFilters.statut;
    const matchesPriorite = !taskFilters.priorite || task.priority === taskFilters.priorite;
    const matchesMembre = !taskFilters.membre_id || task.assignees.some(a => a.id === taskFilters.membre_id);

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
        <div className="p-4 sm:p-6 space-y-6">
          <SpaceDashboard spaceId={spaceId} />
          <PlannerToolsPanel
            workspaceId={workspaceId}
            espaceId={spaceId}
            currentUserId={user?.id}
            effectiveRole={userEspaceRole || userWorkspaceRole}
            tasks={[]}
          />
        </div>
      );
    }
    if (workspaceId) {
      return (
        <div className="p-4 sm:p-6 space-y-6">
          <WorkspaceDashboardPanel workspaceId={workspaceId} />
          <PlannerToolsPanel
            workspaceId={workspaceId}
            currentUserId={user?.id}
            effectiveRole={userWorkspaceRole}
            tasks={[]}
          />
        </div>
      );
    }
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center h-full">
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

  // Si l'utilisateur est invité ou n'a pas de rôle sur la liste, on affiche le dashboard en lecture seule
  const isListGuest = effectiveRole === ROLES.GUEST;

  if (isListGuest && activeTab === 'membres') {
    // Rediriger vers l'onglet liste si l'invité essaie d'accéder aux membres
    setActiveTab('liste');
  }

  // Vue invité (lecture seule) - mais ils peuvent voir les vues liste, kanban, gantt
  if (isGuest || isListGuest) {
    return (
      <div className="p-4 sm:p-6">
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

        {/* Onglets pour les invités (sans l'onglet membres) */}
        <div className="flex gap-2 border-b border-theme-border-subtle pb-3 mb-5 overflow-x-auto">
          {availableTabs.filter(tab => tab !== 'membres').map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all shrink-0 ${activeTab === tab ? 'bg-secondary text-white shadow-md' : 'text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main'
                }`}
            >
              {tab === 'liste' && <LayoutGrid className="w-4 h-4" />}
              {tab === 'kanban' && <KanbanSquare className="w-4 h-4" />}
              {tab === 'gantt' && <GitBranch className="w-4 h-4" />}
              {tab === 'outils' && <Wrench className="w-4 h-4" />}
              {tab === 'liste' && 'Vue liste'}
              {tab === 'kanban' && 'Vue Kanban'}
              {tab === 'gantt' && 'Diagramme de Gantt'}
              {tab === 'outils' && 'Outils'}
            </button>
          ))}
        </div>

        {/* Contenu selon l'onglet pour les invités */}
        {activeTab === 'liste' && (
          <ListView
            tasks={tasks}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onEditTask={() => { }}
            onDeleteTask={() => { }}
            onAssignTask={() => { }}
            getTaskProgress={getTaskProgress}
            readOnly={true}
          />
        )}

        {activeTab === 'kanban' && <KanbanView tasks={tasks} onUpdateTask={() => { }} />}
        {activeTab === 'gantt' && <GanttView tasks={tasks} />}
        {activeTab === 'outils' && (
          <PlannerToolsPanel
            workspaceId={currentListWorkspaceId || workspaceId}
            espaceId={currentListEspaceId || (spaceId && spaceId !== 'list' ? spaceId : undefined)}
            listeId={listId}
            currentUserId={user?.id}
            effectiveRole={effectiveRole}
            tasks={tasks}
          />
        )}
      </div>
    );
  }

  return (
      <div className="p-4 sm:p-6">
      {renderListDiscussionButton()}
      {renderListProgressSummary()}
      {renderListDescription()}

      {/* Onglets */}
      <div className="flex gap-2 border-b border-theme-border-subtle pb-3 mb-5 overflow-x-auto">
        {availableTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all shrink-0 ${activeTab === tab ? 'bg-secondary text-white shadow-md' : 'text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main'
              }`}
          >
            {tab === 'liste' && <LayoutGrid className="w-4 h-4" />}
            {tab === 'kanban' && <KanbanSquare className="w-4 h-4" />}
            {tab === 'gantt' && <GitBranch className="w-4 h-4" />}
            {tab === 'membres' && <Users className="w-4 h-4" />}
            {tab === 'outils' && <Wrench className="w-4 h-4" />}
            {tab === 'liste' && 'Vue liste'}
            {tab === 'kanban' && 'Vue Kanban'}
            {tab === 'gantt' && 'Diagramme de Gantt'}
            {tab === 'membres' && 'Membres'}
            {tab === 'outils' && 'Outils'}
          </button>
        ))}
      </div>

      {/* Barre de recherche enrichie - Visible pour toutes les vues sauf Membres et Outils */}
      {activeTab !== 'membres' && activeTab !== 'outils' && (
        <div className="mb-6 space-y-4 bg-theme-surface p-4 rounded-xl border border-theme-border-subtle shadow-sm transition-colors duration-200">
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
              {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
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

      {/* Boutons d'action - Visibilité contextuelle */}
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

      {/* Contenu selon l'onglet avec Transitions */}
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
              searchTerm="" // Géré maintenant par CenterContent via filteredTasks
              onSearchChange={() => { }}
              onEditTask={openEditTask}
              onDeleteTask={canCreateContent ? deleteTask : () => { }}
              onAssignTask={(task) => { if (canCreateContent) { setSelectedTaskForAssignment(task); setIsAssignTaskModalOpen(true); } }}
              onUpdateTaskStatus={updateTaskStatus}
              onAddChecklist={addChecklistToTask}
              onToggleChecklist={toggleTaskChecklist}
              onDeleteChecklist={deleteTaskChecklist}
              getTaskProgress={getTaskProgress}
              readOnly={!canCreateContent}
              canEditTask={(task) => canCreateContent || canOperateAssignedTask(task)}
              canDeleteTask={() => canCreateContent}
              canAssignTask={() => canCreateContent}
              canAttachTaskFiles={(task) => canCreateContent || canOperateAssignedTask(task)}
              canManageTaskFiles={() => canCreateContent}
            />
          )}

          {activeTab === 'kanban' && <KanbanView tasks={filteredTasks} onUpdateTask={(canCreateContent || isListGuest) ? updateTask : () => { }} />}
          {activeTab === 'gantt' && <GanttView tasks={filteredTasks} />}
          {activeTab === 'outils' && (
            <PlannerToolsPanel
              workspaceId={currentListWorkspaceId || workspaceId}
              espaceId={currentListEspaceId || (spaceId && spaceId !== 'list' ? spaceId : undefined)}
              listeId={listId}
              currentUserId={user?.id}
              effectiveRole={effectiveRole}
              tasks={tasks}
            />
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

      {/* Modales */}
      {(isAdmin || isCreator || isTaskModalLimited) && (
        <>
          <TaskFormModal
            isOpen={isTaskModalOpen}
            onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); setIsTaskModalLimited(false); setTaskModalError(null); }}
            editingTask={editingTask}
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
