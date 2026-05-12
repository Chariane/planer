// frontend/src/pages/app/CenterContent.tsx
import { useState, useEffect } from 'react';  // ← AJOUTER useEffect
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import { Plus, UserPlus, LayoutGrid, KanbanSquare, GitBranch, Users, ListTodo } from 'lucide-react';
import { Button } from '../../components/ui/Button';
// CORRECTION: importer depuis les bons chemins
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
import type { Task, Member } from '../../types';

export default function CenterContent() {
  const { workspaceId, spaceId, listId } = useActiveResource();

  // States
  const [activeTab, setActiveTab] = useState<'liste' | 'kanban' | 'gantt' | 'membres'>('liste');
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

  // Charger les membres de l'espace - CORRECTION: utiliser useEffect au lieu de useState
  useEffect(() => {
    if (spaceId && spaceId !== 'list') {
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
  }, [spaceId]);

  const getTaskProgress = (task: Task): number => {
    const taskChecklists = task.checklists || [];
    if (taskChecklists.length === 0) return 0;
    const checked = taskChecklists.filter(c => c.is_checked).length;
    return Math.round((checked / taskChecklists.length) * 100);
  };

  const openCreateTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (formData: any) => {
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

  return (
    <div className="p-6">
      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200 pb-3 mb-5">
        {(['liste', 'kanban', 'gantt', 'membres'] as const).map(tab => (
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

      {/* Boutons d'action */}
      <div className="flex gap-2 mb-6">
        <Button variant="primary" size="sm" onClick={openCreateTask}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle tâche
        </Button>
        {spaceId && spaceId !== 'list' && (
          <Button variant="outline" size="sm" onClick={() => setIsAssignListModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Assigner membre à la liste
          </Button>
        )}
      </div>

      {/* Contenu selon l'onglet */}
      {activeTab === 'liste' && (
        <ListView
          tasks={tasks}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onEditTask={openEditTask}
          onDeleteTask={deleteTask}
          onAssignTask={(task) => { setSelectedTaskForAssignment(task); setIsAssignTaskModalOpen(true); }}
          getTaskProgress={getTaskProgress}
        />
      )}

      {activeTab === 'kanban' && <KanbanView tasks={tasks} onUpdateTask={updateTask} />}
      {activeTab === 'gantt' && <GanttView tasks={tasks} />}

      {activeTab === 'membres' && (
        spaceId && spaceId !== 'list' ? (
          <MemberManagement espaceId={spaceId} />
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">Aucun espace sélectionné</p>
          </div>
        )
      )}

      {/* Modales */}
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
    </div>
  );
}