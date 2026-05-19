// frontend/src/pages/app/CenterContent.tsx
import { useState, useEffect } from 'react';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import { Plus, UserPlus, LayoutGrid, KanbanSquare, GitBranch, Users, ListTodo } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import KanbanView from './views/KanbanView';
import GanttView from './views/GanttView';
import MemberManagement from '../../components/members/MemberManagement';
import SpaceDashboard from './components/SpaceDashboard';
import WorkspaceDashboardPanel from './components/WorkspaceDashboardPanel';
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
import type { Task, Member } from '../../types';

export default function CenterContent() {
  const { workspaceId, spaceId, listId } = useActiveResource();
  
  const [currentListWorkspaceId, setCurrentListWorkspaceId] = useState<string | null>(null);
  const [currentListEspaceId, setCurrentListEspaceId] = useState<string | null>(null);
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
    resourceType: spaceId ? 'espace' : 'workspace',
  });
  
  // Peut-on assigner des membres à la liste ?
  const canAssignToList = (isAdmin || isCreator || isListeAdmin || isListeCreator || isEspaceAdmin || isEspaceCreator || isWorkspaceAdmin || isWorkspaceCreator) && !!listId;

  // Définir les onglets disponibles selon le rôle
  const getAvailableTabs = (): ('liste' | 'kanban' | 'gantt' | 'membres')[] => {
    if (isGuest) {
      return ['liste', 'kanban', 'gantt'];
    }
    return ['liste', 'kanban', 'gantt', 'membres'];
  };

  const availableTabs = getAvailableTabs();
  
  // States
  const [activeTab, setActiveTab] = useState<'liste' | 'kanban' | 'gantt' | 'membres'>(availableTabs[0]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<Task | null>(null);
  const [isAssignTaskModalOpen, setIsAssignTaskModalOpen] = useState(false);
  const [isAssignListModalOpen, setIsAssignListModalOpen] = useState(false);

  // Hooks
  const { tasks, loading, error, loadTasks, addTask, updateTask, deleteTask } = useTasks(listId);
  const { checklists, loading: checklistLoading, addChecklist, toggleChecklist, updateChecklistText, deleteChecklist } = useTaskChecklists(editingTask?.id);

  // Charger les informations de la liste pour le dashboard
  useEffect(() => {
    const loadListInfo = async () => {
      if (listId) {
        try {
          const liste = await listeService.getById(listId);
          setCurrentListWorkspaceId(liste.id_workspace || null);
          setCurrentListEspaceId(liste.id_espace || null);
        } catch (err) {
          console.error('Erreur chargement infos liste:', err);
        }
      }
    };
    loadListInfo();
  }, [listId]);

  useEffect(() => {
    const resolveListInheritedSpaceRole = async () => {
      setListInheritedSpaceRole(null);
      if (!currentListEspaceId) return;

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

  // Charger les membres de l'espace (seulement si l'onglet membres est disponible)
  useEffect(() => {
    if (!isGuest && spaceId && spaceId !== 'list') {
      espaceService.getMembers(spaceId)
        .then(data => {
          setMembers(data.map((m: any) => ({
            id: m.id_utilisateur || m.id,
            name: m.utilisateur?.nom || m.utilisateur?.username || 'Inconnu',
            email: m.utilisateur?.email || '',
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

  const openCreateTask = () => {
    if (!canCreateContent) return;
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    if (!canCreateContent) return;
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (formData: any) => {
    if (!canCreateContent) return;
    if (editingTask) {
      await updateTask({ ...editingTask, ...formData });
    } else {
      await addTask({ ...formData, listId: listId! });
    }
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  // Si aucune liste n'est sélectionnée
  if (!listId) {
    if (spaceId && spaceId !== 'list') {
      return <div className="p-6"><SpaceDashboard spaceId={spaceId} /></div>;
    }
    if (workspaceId) {
      return <div className="p-6"><WorkspaceDashboardPanel workspaceId={workspaceId} /></div>;
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

        {/* Onglets pour les invités (sans l'onglet membres) */}
        <div className="flex gap-2 border-b border-gray-200 pb-3 mb-5">
          {availableTabs.filter(tab => tab !== 'membres').map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                activeTab === tab ? 'bg-secondary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'liste' && <LayoutGrid className="w-4 h-4" />}
              {tab === 'kanban' && <KanbanSquare className="w-4 h-4" />}
              {tab === 'gantt' && <GitBranch className="w-4 h-4" />}
              {tab === 'liste' && 'Vue liste'}
              {tab === 'kanban' && 'Vue Kanban'}
              {tab === 'gantt' && 'Diagramme de Gantt'}
            </button>
          ))}
        </div>

        {/* Contenu selon l'onglet pour les invités */}
        {activeTab === 'liste' && (
          <ListView
            tasks={tasks}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onEditTask={() => {}}
            onDeleteTask={() => {}}
            onAssignTask={() => {}}
            getTaskProgress={getTaskProgress}
            readOnly={true}
          />
        )}

        {activeTab === 'kanban' && <KanbanView tasks={tasks} onUpdateTask={() => {}} />}
        {activeTab === 'gantt' && <GanttView tasks={tasks} />}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200 pb-3 mb-5">
        {availableTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              activeTab === tab ? 'bg-secondary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab === 'liste' && <LayoutGrid className="w-4 h-4" />}
            {tab === 'kanban' && <KanbanSquare className="w-4 h-4" />}
            {tab === 'gantt' && <GitBranch className="w-4 h-4" />}
            {tab === 'membres' && <Users className="w-4 h-4" />}
            {tab === 'liste' && 'Vue liste'}
            {tab === 'kanban' && 'Vue Kanban'}
            {tab === 'gantt' && 'Diagramme de Gantt'}
            {tab === 'membres' && 'Membres'}
          </button>
        ))}
      </div>

      {/* Boutons d'action - visibles uniquement pour Admin et Créateur */}
      {(isAdmin || isCreator) && (
        <div className="flex gap-2 mb-6">
          <Button variant="primary" size="sm" onClick={openCreateTask}>
            <Plus className="h-4 w-4 mr-1" /> Nouvelle tâche
          </Button>
          {canAssignToList && (
            <Button variant="outline" size="sm" onClick={() => setIsAssignListModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Ajouter membre à la liste
            </Button>
          )}
        </div>
      )}

      {/* Contenu selon l'onglet */}
      {activeTab === 'liste' && (
        <ListView
          tasks={tasks}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onEditTask={canCreateContent ? openEditTask : () => {}}
          onDeleteTask={canCreateContent ? deleteTask : () => {}}
          onAssignTask={(task) => { if (canCreateContent) { setSelectedTaskForAssignment(task); setIsAssignTaskModalOpen(true); } }}
          getTaskProgress={getTaskProgress}
          readOnly={!canCreateContent}
        />
      )}

      {activeTab === 'kanban' && <KanbanView tasks={tasks} onUpdateTask={canCreateContent ? updateTask : () => {}} />}
      {activeTab === 'gantt' && <GanttView tasks={tasks} />}

      {activeTab === 'membres' && (
        <MemberManagement 
          listeId={listId}
          espaceId={currentListEspaceId || (spaceId && spaceId !== 'list' ? spaceId : undefined)}
          workspaceId={currentListWorkspaceId || workspaceId || undefined}
          currentUserRole={effectiveRole}
        />
      )}

      {/* Modales - visibles uniquement pour Admin et Créateur */}
      {(isAdmin || isCreator) && (
        <>
          <TaskFormModal
            isOpen={isTaskModalOpen}
            onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
            editingTask={editingTask}
            members={members}
            checklists={checklists}
            checklistLoading={checklistLoading}
            onAddChecklist={addChecklist}
            onToggleChecklist={toggleChecklist}
            onUpdateChecklistText={updateChecklistText}
            onDeleteChecklist={deleteChecklist}
            onSubmit={handleTaskSubmit}
          />

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
    </div>
  );
}
