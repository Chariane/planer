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
import { usePermissions } from '../../hooks/usePermissions';
import { useWorkspaceRole } from '../../hooks/useWorkspaceRole';
import { useResourceRole } from '../../hooks/useResourceRole';
import type { Task, Member } from '../../types';

export default function CenterContent() {
  const { workspaceId, spaceId, listId } = useActiveResource();

  // Récupérer le rôle dans le workspace
  const { role: userWorkspaceRole, isAdmin: isWorkspaceAdmin, isCreator: isWorkspaceCreator, isGuest: isWorkspaceGuest } = useWorkspaceRole(workspaceId);
  
  // Récupérer le rôle dans l'espace (si un espace est sélectionné)
  const { role: userEspaceRole, isAdmin: isEspaceAdmin, isCreator: isEspaceCreator, isGuest: isEspaceGuest } = useResourceRole(spaceId !== 'list' ? spaceId : undefined, 'espace');
  
  // Récupérer le rôle dans la liste (si une liste est sélectionnée)
  const { isAdmin: isListeAdmin, isCreator: isListeCreator } = useResourceRole(listId, 'liste');
  
  // Déterminer le rôle effectif (priorité: liste > espace > workspace)
  const effectiveRole = userEspaceRole || userWorkspaceRole;
  const isAdmin = isEspaceAdmin || isWorkspaceAdmin || isListeAdmin;
  const isCreator = isEspaceCreator || isWorkspaceCreator || isListeCreator;
  const isGuest = isEspaceGuest || isWorkspaceGuest;
  
  // Permissions
  const { canCreateContent, canManageMembers } = usePermissions({
    userRole: effectiveRole,
    resourceType: spaceId ? 'espace' : 'workspace',
  });
  
  // 🔧 CORRECTION PROBLÈME 4: Peut-on assigner des membres à la liste ?
  // Un Admin ou Créateur de liste, ou Admin/Créateur d'espace parent, ou Admin/Créateur de workspace parent
  const canAssignToList = (isListeAdmin || isListeCreator || isEspaceAdmin || isEspaceCreator || isWorkspaceAdmin || isWorkspaceCreator) && !!listId;

  // Définir les onglets disponibles selon le rôle
  const getAvailableTabs = (): ('liste' | 'kanban' | 'gantt' | 'membres')[] => {
    if (isGuest) {
      // Les invités n'ont pas accès à l'onglet membres
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

  // Message pour les invités (lecture seule) - mais ils peuvent voir les vues liste, kanban, gantt
  if (isGuest) {
    return (
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            👁️ Vous êtes en mode <strong>lecture seule</strong> dans cet espace.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Vous pouvez consulter les tâches et utiliser les vues, mais vous ne pouvez pas créer, modifier ou supprimer des éléments.
          </p>
        </div>

        {/* Onglets pour les invités (sans l'onglet membres) */}
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
          {/* 🔧 CORRECTION: Bouton "Assigner membre à la liste" - utilisant la nouvelle variable corrigée */}
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
        spaceId && spaceId !== 'list' ? (
          <MemberManagement 
            espaceId={spaceId} 
            currentUserRole={userEspaceRole || userWorkspaceRole}
          />
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">Aucun espace sélectionné</p>
          </div>
        )
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
            espaceId={spaceId && spaceId !== 'list' ? spaceId : undefined}
            workspaceId={workspaceId || undefined}
            isOpen={isAssignListModalOpen}
            onClose={() => setIsAssignListModalOpen(false)}
            onSuccess={loadTasks}
          />
        </>
      )}
    </div>
  );
}