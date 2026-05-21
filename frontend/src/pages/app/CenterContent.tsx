import { useState, useEffect } from 'react';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import { Plus, UserPlus, LayoutGrid, KanbanSquare, GitBranch, Users, ListTodo, Wrench, Search, Filter, Calendar, Loader2 } from 'lucide-react';
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
import { usePermissions } from '../../hooks/usePermissions';
import { useWorkspaceRole } from '../../hooks/useWorkspaceRole';
import { useResourceRole } from '../../hooks/useResourceRole';
import { useNavigationStore } from '../../store/useNavigationStore';
import { getRoleRank, ROLES } from '../../lib/roleHierarchy';
import { getMemberDisplayName, getMemberEmail } from '../../utils/memberDisplay';
import { useAuth } from '../../contexts/AuthContext';
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
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<Task | null>(null);
  const [isAssignTaskModalOpen, setIsAssignTaskModalOpen] = useState(false);
  const [isAssignListModalOpen, setIsAssignListModalOpen] = useState(false);

  // Hooks
  const { tasks, loading, error, loadTasks, addTask, updateTask, updateTaskStatus, deleteTask } = useTasks(listId);
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
        const isInheritedRole = role === ROLES.CREATOR || role === ROLES.ADMIN || role === ROLES.GUEST;
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
    const done = (doneCount / tasks.length) * 100;
    const inProgress = done + (inProgressCount / tasks.length) * 100;
    const blocked = inProgress + (blockedCount / tasks.length) * 100;
    const statusGradient = `conic-gradient(#10b981 0 ${done}%, #3b82f6 ${done}% ${inProgress}%, #ef4444 ${inProgress}% ${blocked}%, #e5e7eb ${blocked}% 100%)`;

    return (
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div
          className="h-20 w-20 rounded-full flex items-center justify-center"
          style={{ background: statusGradient }}
          title={`Répartition par statut. Avancement moyen : ${averageProgress}%`}
        >
          <div className="h-14 w-14 rounded-full bg-white flex flex-col items-center justify-center leading-tight">
            <span className="text-base font-bold text-gray-800">{tasks.length}</span>
            <span className="text-[10px] text-gray-500">tâches</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Répartition des tâches</p>
          <p className="text-xs text-gray-500 mt-1">Avancement moyen : {averageProgress}%</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{pendingCount} en attente</span>
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">{inProgressCount} en cours</span>
            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{doneCount} terminée{doneCount > 1 ? 's' : ''}</span>
            {blockedCount > 0 && (
              <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">{blockedCount} bloquée{blockedCount > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderListDescription = () => {
    if (!listId || !currentListDescription.trim()) return null;

    return (
      <div className="mb-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600 leading-relaxed">{currentListDescription}</p>
      </div>
    );
  };

  const openCreateTask = () => {
    if (!canCreateContent) return;
    setEditingTask(null);
    setIsTaskModalLimited(false);
    setIsTaskModalOpen(true);
  };

  const canOperateAssignedTask = (task: Task): boolean => {
    return !!user?.id && task.assignees.some(assignee => assignee.id === user.id);
  };

  const openEditTask = (task: Task) => {
    if (!canCreateContent && !canOperateAssignedTask(task)) return;
    setEditingTask(task);
    setIsTaskModalLimited(!canCreateContent && canOperateAssignedTask(task));
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (formData: any) => {
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
      alert(err?.message || 'Erreur lors de l’enregistrement de la tâche');
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
        <div className="p-6 space-y-6">
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
        <div className="p-6 space-y-6">
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
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <ListTodo className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">Aucune liste sélectionnée</p>
          <p className="text-sm">Cliquez sur une liste dans le menu de gauche pour voir ses tâches.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6 flex justify-center">Chargement des tâches...</div>;
  if (error) return <div className="p-6 flex justify-center text-red-500">{error}</div>;

  // Si l'utilisateur est invité ou n'a pas de rôle sur la liste, on affiche le dashboard en lecture seule
  const isListGuest = effectiveRole === ROLES.GUEST;

  if (isListGuest && activeTab === 'membres') {
    // Rediriger vers l'onglet liste si l'invité essaie d'accéder aux membres
    setActiveTab('liste');
  }

  // Vue invité (lecture seule) - mais ils peuvent voir les vues liste, kanban, gantt
  if (isGuest || isListGuest) {
    return (
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            👁️ Vous êtes en mode <strong>lecture seule</strong> {isListGuest ? 'dans cette liste' : 'dans cet espace'}.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Vous pouvez consulter les tâches et utiliser les vues, mais vous ne pouvez pas créer, modifier ou supprimer des éléments.
          </p>
        </div>

        {renderListProgressSummary()}
        {renderListDescription()}

        {/* Onglets pour les invités (sans l'onglet membres) */}
        <div className="flex gap-2 border-b border-gray-200 pb-3 mb-5">
          {availableTabs.filter(tab => tab !== 'membres').map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${activeTab === tab ? 'bg-secondary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
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
    <div className="p-6">
      {renderListProgressSummary()}
      {renderListDescription()}

      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200 pb-3 mb-5">
        {availableTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${activeTab === tab ? 'bg-secondary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
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
        <div className="mb-6 space-y-4 bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une tâche..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-secondary/20 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select value={taskFilters.statut} onChange={e => setTaskFilters(prev => ({ ...prev, statut: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm outline-none">
              <option value="">Tous statuts</option>
              <option value="en attente">En attente</option>
              <option value="en cours">En cours</option>
              <option value="terminé">Terminé</option>
              <option value="bloqué">Bloqué</option>
            </select>
            <select value={taskFilters.priorite} onChange={e => setTaskFilters(prev => ({ ...prev, priorite: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm outline-none">
              <option value="">Toutes priorités</option>
              <option value="basse">Basse</option>
              <option value="moyenne">Moyenne</option>
              <option value="haute">Haute</option>
              <option value="critique">Critique</option>
            </select>
            <select value={taskFilters.membre_id} onChange={e => setTaskFilters(prev => ({ ...prev, membre_id: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm outline-none">
              <option value="">Tous membres</option>
              {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
            <div className="flex items-center gap-2 px-2 border rounded-lg bg-white">
              <input
                type="checkbox"
                id="overdue-filter"
                checked={taskFilters.overdue}
                onChange={e => setTaskFilters(prev => ({ ...prev, overdue: e.target.checked }))}
              />
              <label htmlFor="overdue-filter" className="text-sm text-gray-600 flex items-center gap-1 cursor-pointer">
                <Calendar className="h-3 w-3" /> En retard
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Boutons d'action - Visibilité contextuelle */}
      <div className="flex gap-2 mb-6">
        {(isAdmin || isCreator) && activeTab !== 'membres' && activeTab !== 'outils' && (
          <Button variant="primary" size="sm" onClick={openCreateTask}>
            <Plus className="h-4 w-4 mr-1" /> Nouvelle tâche
          </Button>
        )}
        {(isAdmin || isCreator) && activeTab === 'membres' && (
          <div className="flex-1 flex gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un membre..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none"
              />
            </div>
          </div>
        )}
        {(isAdmin || isCreator) && canAssignToList && activeTab !== 'outils' && (
          <Button variant="outline" size="sm" onClick={() => setIsAssignListModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Ajouter membre à la liste
          </Button>
        )}
      </div>

      {/* Contenu selon l'onglet */}
      {activeTab === 'liste' && (
        <ListView
          tasks={filteredTasks}
          searchTerm="" // Géré maintenant par CenterContent via filteredTasks
          onSearchChange={() => { }}
          onEditTask={openEditTask}
          onDeleteTask={canCreateContent ? deleteTask : () => { }}
          onAssignTask={(task) => { if (canCreateContent) { setSelectedTaskForAssignment(task); setIsAssignTaskModalOpen(true); } }}
          getTaskProgress={getTaskProgress}
          readOnly={!canCreateContent}
          canEditTask={(task) => canCreateContent || canOperateAssignedTask(task)}
          canDeleteTask={() => canCreateContent}
          canAssignTask={() => canCreateContent}
        />
      )}

      {activeTab === 'kanban' && <KanbanView tasks={filteredTasks} onUpdateTask={canCreateContent ? updateTask : () => { }} />}
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

      {/* Modales */}
      {(isAdmin || isCreator || isTaskModalLimited) && (
        <>
          <TaskFormModal
            isOpen={isTaskModalOpen}
            onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); setIsTaskModalLimited(false); }}
            editingTask={editingTask}
            members={members}
            checklists={checklists}
            checklistLoading={checklistLoading}
            onAddChecklist={addChecklist}
            onToggleChecklist={toggleChecklist}
            onUpdateChecklistText={isTaskModalLimited ? async () => { } : updateChecklistText}
            onDeleteChecklist={isTaskModalLimited ? async () => { } : deleteChecklist}
            onSubmit={handleTaskSubmit}
            limitedOperational={isTaskModalLimited}
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
