// frontend/src/pages/app/CenterContent.tsx
import { useState, useEffect } from 'react';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import {
  Plus, Search, Filter, ChevronDown, ChevronRight, MoreVertical,
  Edit, Trash, UserPlus, LayoutGrid, KanbanSquare, GitBranch, Users, ListTodo,
  CheckCircle, Circle, X, Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import Modal from '../../components/ui/Modal';
import KanbanView from './components/KanbanView';
import GanttView from './components/GanttView';
import MemberManagement from '../../components/members/MemberManagement';
import SpaceDashboard from './components/SpaceDashboard';
import WorkspaceDashboardPanel from './components/WorkspaceDashboardPanel';
import { tacheService } from '../../services/tache.service';
import { espaceService } from '../../services/espace.service';
import type { Task, Member } from '../../types';

// Mapping des statuts
const statusLabels: Record<string, string> = {
  'en attente': 'Tâches en attente',
  'en cours': 'Tâches en cours',
  terminé: 'Tâches terminées',
  bloqué: 'Tâches bloquées',
};

const statusOptions = [
  { value: 'en attente', label: 'En attente' },
  { value: 'en cours', label: 'En cours' },
  { value: 'terminé', label: 'Terminée' },
  { value: 'bloqué', label: 'Bloquée' },
];

const priorityLabels: Record<string, string> = {
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
  critique: 'Critique',
};

const priorityOptions = [
  { value: 'basse', label: 'Basse' },
  { value: 'moyenne', label: 'Moyenne' },
  { value: 'haute', label: 'Haute' },
  { value: 'critique', label: 'Critique' },
];

const priorityColors: Record<string, string> = {
  basse: 'bg-green-100 text-green-800',
  moyenne: 'bg-blue-100 text-blue-800',
  haute: 'bg-orange-100 text-orange-800',
  critique: 'bg-red-100 text-red-800',
};

// Mapping des rôles pour l'affichage
const roleLabels: Record<string, string> = {
  Créateur: 'Créateur',
  Administrateur: 'Administrateur',
  Membre: 'Membre',
  Invité: 'Invité',
};

// Type pour les checklists dans les tâches (UI)
interface TaskChecklist {
  id: string;
  texte: string;
  is_checked: boolean;
}

// Transformer une tâche de l'API vers le format interne
function transformTask(apiTask: any): Task {
  if (!apiTask) return {} as Task;

  return {
    id: apiTask.id,
    title: apiTask.titre,
    description: apiTask.description || '',
    status: apiTask.statut,
    priority: apiTask.priorite,
    startDate: apiTask.date_debut ? apiTask.date_debut.split('T')[0] : '',
    dueDate: apiTask.date_fin_prevue ? apiTask.date_fin_prevue.split('T')[0] : '',
    order: apiTask.ordre_affichage,
    assignees: [],
    listId: apiTask.id_liste,
    createdAt: new Date(apiTask.created_at),
    subTasks: [],
    checklists: (apiTask.checklists || []).map((c: any) => ({
      id: c.id,
      texte: c.texte,
      is_checked: c.is_checked,
    })),
    progression: apiTask.progression || 0,
  };
}

function toApiTask(task: Partial<Task>): any {
  const result: any = {
    titre: task.title,
    description: task.description,
    statut: task.status,
    priorite: task.priority,
  };
  if (task.startDate) {
    result.date_debut = new Date(task.startDate).toISOString();
  }
  if (task.dueDate) {
    result.date_fin_prevue = new Date(task.dueDate).toISOString();
  }
  if (task.order !== undefined) {
    result.ordre_affichage = task.order;
  }
  return result;
}

// Obtenir la date du jour au format YYYY-MM-DD
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export default function CenterContent() {
  const { workspaceId, spaceId, listId } = useActiveResource();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'liste' | 'kanban' | 'gantt' | 'membres'>('liste');
  const [expandedStatus, setExpandedStatus] = useState<Record<string, boolean>>({
    'en attente': true,
    'en cours': true,
    terminé: false,
    bloqué: false,
  });
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Membre');

  // États pour les checklists de la tâche en cours d'édition
  const [taskChecklists, setTaskChecklists] = useState<TaskChecklist[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [checklistLoading, setChecklistLoading] = useState<string | null>(null);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    startDate: getTodayDate(),
    dueDate: '',
    status: 'en attente' as Task['status'],
    priority: 'moyenne' as Task['priority'],
    assignedMemberIds: [] as string[],
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fermer le menu quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) setOpenMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // Charger les membres de l'espace (pour l'assignation des tâches)
  useEffect(() => {
    if (spaceId && spaceId !== 'list') {
      espaceService.getMembers(spaceId)
        .then(data => {
          const formattedMembers: Member[] = data.map((m: any) => ({
            id: m.id_utilisateur || m.id,
            name: m.utilisateur?.nom || m.utilisateur?.username || 'Inconnu',
            email: m.utilisateur?.email || '',
            role: m.role,
          }));
          setMembers(formattedMembers);
        })
        .catch(() => {
          setMembers([]);
        });
    } else {
      setMembers([]);
    }
  }, [spaceId]);

  // Charger les tâches (uniquement si une liste est sélectionnée)
  useEffect(() => {
    if (!listId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const fetchTasks = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await tacheService.getByListe(listId);

        if (!data) {
          setTasks([]);
          return;
        }

        const transformed = (Array.isArray(data) ? data : []).map(transformTask);

        const tasksWithMembers = await Promise.all(
          transformed.map(async (task) => {
            try {
              const taskMembers = await tacheService.getMembers(task.id);
              const assignees = taskMembers.map((m: any) => ({
                id: m.id_utilisateur || m.id,
                name: m.utilisateur?.username || m.utilisateur?.nom || 'Inconnu',
                email: m.utilisateur?.email || '',
                role: m.role || 'Membre',
              }));
              return { ...task, assignees };
            } catch {
              return task;
            }
          })
        );

        setTasks(tasksWithMembers);
      } catch (err) {
        console.error('Erreur chargement tâches:', err);
        setError('Impossible de charger les tâches.');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [listId]);

  // Charger les checklists d'une tâche spécifique
  const loadTaskChecklists = async (tacheId: string): Promise<TaskChecklist[]> => {
    try {
      const checklists = await tacheService.getChecklistsByTache(tacheId);
      return checklists.map((c: any) => ({
        id: c.id,
        texte: c.texte,
        is_checked: c.is_checked,
      }));
    } catch (err) {
      console.error('Erreur chargement checklists:', err);
      return [];
    }
  };

  // Synchronisation des assignations
  const syncAssignments = async (taskId: string, newMemberIds: string[]) => {
    try {
      const currentMembers = await tacheService.getMembers(taskId);
      const currentIds = currentMembers.map((m: any) => m.id_utilisateur || m.id);
      const toAdd = newMemberIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !newMemberIds.includes(id));

      await Promise.all([
        ...toAdd.map(id => tacheService.assignMember(taskId, id)),
        ...toRemove.map(id => tacheService.unassignMember(taskId, id)),
      ]);

      const updatedMembers = await tacheService.getMembers(taskId);
      const formattedMembers = updatedMembers.map((m: any) => ({
        id: m.id_utilisateur || m.id,
        name: m.utilisateur?.username || m.utilisateur?.nom || 'Inconnu',
        email: m.utilisateur?.email || '',
        role: m.role || 'Membre',
      }));

      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, assignees: formattedMembers } : t
      ));
    } catch (err) {
      console.error('Erreur synchronisation assignations', err);
    }
  };

  // CRUD Checklist
  const addChecklistToTask = async (taskId: string, texte: string) => {
    if (!texte.trim()) return;
    setChecklistLoading('add');
    try {
      const newChecklist = await tacheService.createChecklistInTache(taskId, { texte, is_checked: false });
      const newTaskChecklist: TaskChecklist = {
        id: newChecklist.id,
        texte: newChecklist.texte,
        is_checked: newChecklist.is_checked,
      };
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, checklists: [...(t.checklists || []), newTaskChecklist] }
          : t
      ));
      if (editingTask?.id === taskId) {
        setTaskChecklists(prev => [...prev, newTaskChecklist]);
      }
      return newChecklist;
    } catch (err) {
      console.error('Erreur ajout checklist:', err);
      alert('Erreur lors de l\'ajout de l\'élément');
    } finally {
      setChecklistLoading(null);
    }
  };

  const toggleChecklist = async (taskId: string, checklistId: string, currentChecked: boolean) => {
    setChecklistLoading(checklistId);
    try {
      const updated = await tacheService.updateChecklist(checklistId, { is_checked: !currentChecked });
      const updatedTaskChecklist: TaskChecklist = {
        id: updated.id,
        texte: updated.texte,
        is_checked: updated.is_checked,
      };
      
      // Recharger la tâche pour avoir le statut mis à jour
      const updatedTask = await tacheService.getById(taskId);
      
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              checklists: (t.checklists || []).map(c => c.id === checklistId ? updatedTaskChecklist : c),
              status: updatedTask.statut,
              progression: updatedTask.progression
            }
          : t
      ));
      
      if (editingTask?.id === taskId) {
        setTaskChecklists(prev => prev.map(c => c.id === checklistId ? updatedTaskChecklist : c));
      }
    } catch (err) {
      console.error('Erreur mise à jour checklist:', err);
    } finally {
      setChecklistLoading(null);
    }
  };

  const updateChecklistText = async (taskId: string, checklistId: string, newText: string) => {
    if (!newText.trim()) return;
    setChecklistLoading(`edit-${checklistId}`);
    try {
      const updated = await tacheService.updateChecklist(checklistId, { texte: newText });
      const updatedTaskChecklist: TaskChecklist = {
        id: updated.id,
        texte: updated.texte,
        is_checked: updated.is_checked,
      };
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, checklists: (t.checklists || []).map(c => c.id === checklistId ? updatedTaskChecklist : c) }
          : t
      ));
      if (editingTask?.id === taskId) {
        setTaskChecklists(prev => prev.map(c => c.id === checklistId ? updatedTaskChecklist : c));
      }
      setEditingChecklistId(null);
      setEditingChecklistText('');
    } catch (err) {
      console.error('Erreur modification checklist:', err);
      alert('Erreur lors de la modification');
    } finally {
      setChecklistLoading(null);
    }
  };

  const deleteChecklistFromTask = async (taskId: string, checklistId: string) => {
    if (!confirm('Supprimer cet élément de la checklist ?')) return;
    setChecklistLoading(`delete-${checklistId}`);
    try {
      await tacheService.deleteChecklist(checklistId);
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, checklists: (t.checklists || []).filter(c => c.id !== checklistId) }
          : t
      ));
      if (editingTask?.id === taskId) {
        setTaskChecklists(prev => prev.filter(c => c.id !== checklistId));
      }
    } catch (err) {
      console.error('Erreur suppression checklist:', err);
      alert('Erreur lors de la suppression');
    } finally {
      setChecklistLoading(null);
    }
  };

  // CRUD Tâche avec gestion des checklists
  const addTask = async (newTask: Omit<Task, 'id' | 'createdAt' | 'checklists' | 'progression'>) => {
    if (!listId) return;

    try {
      const apiTask = toApiTask({ ...newTask, listId });
      const created = await tacheService.create(listId, apiTask);

      if (!created || !created.id) {
        alert('Erreur: La tâche a été créée mais l\'identifiant est manquant');
        return;
      }

      // Recharger toutes les tâches
      const refreshedTasks = await tacheService.getByListe(listId);
      const transformed = (Array.isArray(refreshedTasks) ? refreshedTasks : []).map(transformTask);

      // Ajouter les checklists si présentes
      if (taskChecklists.length > 0) {
        for (const checklist of taskChecklists) {
          try {
            await tacheService.createChecklistInTache(created.id, {
              texte: checklist.texte,
              is_checked: checklist.is_checked
            });
          } catch (err) {
            console.error('Erreur ajout checklist:', err);
          }
        }
      }

      // Recharger les membres
      const tasksWithMembers = await Promise.all(
        transformed.map(async (task) => {
          try {
            const taskMembers = await tacheService.getMembers(task.id);
            const assignees = taskMembers.map((m: any) => ({
              id: m.id_utilisateur || m.id,
              name: m.utilisateur?.username || m.utilisateur?.nom || 'Inconnu',
              email: m.utilisateur?.email || '',
              role: m.role || 'Membre',
            }));
            return { ...task, assignees };
          } catch {
            return task;
          }
        })
      );

      setTasks(tasksWithMembers);

      // Assigner les membres si nécessaire
      if (newTask.assignees.length > 0) {
        await syncAssignments(created.id, newTask.assignees.map(a => a.id));
      }

      // Vider les checklists pour la prochaine création
      setTaskChecklists([]);
      return created;

    } catch (err: any) {
      console.error('Erreur création tâche:', err);
      alert(`Erreur: ${err.message || 'Impossible de créer la tâche'}`);
    }
  };

  const updateTask = async (updatedTask: Task) => {
    if (!updatedTask.id) {
      alert('Erreur: Impossible de mettre à jour une tâche sans identifiant');
      return;
    }

    try {
      const apiTask = toApiTask(updatedTask);
      await tacheService.update(updatedTask.id, apiTask);

      // Synchroniser les checklists
      const currentChecklists = await tacheService.getChecklistsByTache(updatedTask.id);
      const currentIds = currentChecklists.map((c: any) => c.id);
      const newIds = (updatedTask.checklists || []).map(c => c.id).filter(id => id);

      const toDelete = currentIds.filter(id => !newIds.includes(id));
      for (const id of toDelete) {
        await tacheService.deleteChecklist(id);
      }

      for (const checklist of (updatedTask.checklists || [])) {
        if (checklist.id && currentIds.includes(checklist.id)) {
          await tacheService.updateChecklist(checklist.id, {
            texte: checklist.texte,
            is_checked: checklist.is_checked
          });
        } else if (checklist.texte) {
          await tacheService.createChecklistInTache(updatedTask.id, {
            texte: checklist.texte,
            is_checked: checklist.is_checked
          });
        }
      }

      // Rafraîchir la liste des tâches
      if (listId) {
        const refreshedTasks = await tacheService.getByListe(listId);
        const transformed = (Array.isArray(refreshedTasks) ? refreshedTasks : []).map(transformTask);
        setTasks(transformed);
      }

      const newMemberIds = updatedTask.assignees.map(a => a.id);
      await syncAssignments(updatedTask.id, newMemberIds);

    } catch (err) {
      console.error('Erreur mise à jour tâche:', err);
      alert('Erreur lors de la mise à jour');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!taskId) return;

    try {
      await tacheService.delete(taskId);

      // Rafraîchir la liste
      if (listId) {
        const refreshedTasks = await tacheService.getByListe(listId);
        const transformed = (Array.isArray(refreshedTasks) ? refreshedTasks : []).map(transformTask);
        setTasks(transformed);
      } else {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }

    } catch (err) {
      console.error('Erreur suppression tâche:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !spaceId || spaceId === 'list') return;
    try {
      await espaceService.inviteMember(spaceId, inviteEmail, inviteRole);
      alert(`Invitation envoyée à ${inviteEmail}`);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      const updatedMembers = await espaceService.getMembers(spaceId);
      const formattedMembers: Member[] = updatedMembers.map((m: any) => ({
        id: m.id_utilisateur || m.id,
        name: m.utilisateur?.nom || m.utilisateur?.username || 'Inconnu',
        email: m.utilisateur?.email || '',
        role: m.role,
      }));
      setMembers(formattedMembers);
    } catch (err: any) {
      console.error('Erreur invitation', err);
      alert(err.message || 'Erreur lors de l\'invitation');
    }
  };

  // Regroupement par statut
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = [];
    acc[task.status].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const pieData = Object.entries(groupedTasks).map(([status, tasks]) => ({
    name: statusLabels[status] || status,
    value: tasks.length,
    color:
      status === 'en cours' ? '#3b82f6'
        : status === 'en attente' ? '#eab308'
          : status === 'terminé' ? '#10b981'
            : status === 'bloqué' ? '#ef4444'
              : '#6b7280',
  })).filter(d => d.value > 0);

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      startDate: getTodayDate(),
      dueDate: '',
      status: 'en attente',
      priority: 'moyenne',
      assignedMemberIds: [],
    });
    setTaskChecklists([]);
    setNewChecklistText('');
    setIsAddingChecklist(false);
    setEditingChecklistId(null);
    setIsTaskModalOpen(true);
  };

  const openEditTask = async (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      startDate: task.startDate || getTodayDate(),
      dueDate: task.dueDate || '',
      status: task.status,
      priority: task.priority,
      assignedMemberIds: task.assignees.map(a => a.id),
    });

    // Charger les checklists de la tâche
    const checklists = await loadTaskChecklists(task.id);
    setTaskChecklists(checklists);
    setNewChecklistText('');
    setIsAddingChecklist(false);
    setEditingChecklistId(null);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async () => {
    if (!taskForm.title.trim()) return;

    const assigneeMembers = members.filter(m => taskForm.assignedMemberIds.includes(m.id));

    if (editingTask) {
      await updateTask({
        ...editingTask,
        title: taskForm.title,
        description: taskForm.description,
        startDate: taskForm.startDate,
        dueDate: taskForm.dueDate,
        status: taskForm.status,
        priority: taskForm.priority,
        assignees: assigneeMembers,
        checklists: taskChecklists,
      });
    } else {
      if (!listId) return;
      await addTask({
        title: taskForm.title,
        description: taskForm.description,
        startDate: taskForm.startDate,
        dueDate: taskForm.dueDate,
        status: 'en attente',
        priority: taskForm.priority,
        assignees: assigneeMembers,
        listId,
      });
    }
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Supprimer cette tâche ?')) {
      await deleteTask(taskId);
    }
  };

  const toggleStatus = (status: string) => {
    setExpandedStatus(prev => ({ ...prev, [status]: !prev[status] }));
  };

  // Calculer la progression d'une tâche depuis ses checklists
  const getTaskProgress = (task: Task): number => {
    const checklists = task.checklists || [];
    if (checklists.length === 0) return 0;
    const checked = checklists.filter(c => c.is_checked).length;
    return Math.round((checked / checklists.length) * 100);
  };

  // ========== CONDITIONS D'AFFICHAGE ==========

  // Cas 1: Une liste est sélectionnée → afficher les tâches
  if (listId) {
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
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${activeTab === tab ? 'bg-secondary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
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

        {/* Vue Liste */}
        {activeTab === 'liste' && (
          <>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={openCreateTask}>
                  <Plus className="h-4 w-4 mr-1" /> Nouvelle tâche
                </Button>
                {spaceId && spaceId !== 'list' && (
                  <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-1" /> Inviter un membre
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une tâche..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64"
                  />
                </div>
                <button className="p-2 rounded-lg hover:bg-gray-100"><Filter className="h-5 w-5 text-gray-500" /></button>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(statusLabels).map(([status, label]) => {
                const statusTasks = groupedTasks[status] || [];
                const count = statusTasks.length;
                const filtered = statusTasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
                return (
                  <GlassCard key={status} className="overflow-hidden">
                    <button onClick={() => toggleStatus(status)} className="w-full flex justify-between items-center p-4 bg-white/50 hover:bg-gray-50 transition">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{label}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{count}</span>
                      </div>
                      {expandedStatus[status] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </button>
                    {expandedStatus[status] && (
                      <div className="p-4 border-t border-gray-100">
                        <div className="overflow-x-auto">
                          <table className="min-w-[700px] w-full text-sm">
                            <thead className="text-gray-500 border-b border-gray-100">
                              <tr>
                                <th className="text-left py-3">#</th>
                                <th className="text-left py-3">Titre</th>
                                <th className="text-left py-3">Membres</th>
                                <th className="text-left py-3">Priorité</th>
                                <th className="text-left py-3">Progression</th>
                                <th className="text-left py-3">Date de fin</th>
                                <th className="text-left py-3"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map((task, idx) => {
                                const progress = getTaskProgress(task);
                                return (
                                  <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                                    <td className="py-3 w-12">{idx + 1}</td>
                                    <td className="py-3 font-medium">{task.title}</td>
                                    <td className="py-3">
                                      {task.assignees.map(a => a.name).join(', ') || '—'}
                                      {task.assignees.length > 0 && (
                                        <span className="ml-1 text-xs text-gray-400">
                                          ({task.assignees.map(a => roleLabels[a.role] || a.role).join(', ')})
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                                        {priorityLabels[task.priority]}
                                      </span>
                                    </td>
                                    <td className="py-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                          <div className="bg-secondary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                        <span className="text-xs text-gray-500">{progress}%</span>
                                        {(task.checklists?.length || 0) > 0 && (
                                          <span className="text-xs text-gray-400">
                                            ({task.checklists?.filter(c => c.is_checked).length}/{task.checklists?.length})
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 text-gray-500">{task.dueDate || '—'}</td>
                                    <td className="py-3">
                                      <div className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === task.id ? null : task.id);
                                          }}
                                          className="p-1 rounded-lg hover:bg-gray-100"
                                        >
                                          <MoreVertical className="h-4 w-4 text-gray-400" />
                                        </button>
                                        {openMenuId === task.id && (
                                          <div className="absolute right-0 top-8 z-10 flex flex-col bg-white shadow-lg rounded-lg w-32 border">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openEditTask(task);
                                                setOpenMenuId(null);
                                              }}
                                              className="px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                            >
                                              <Edit className="h-3 w-3" /> Modifier
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTask(task.id);
                                                setOpenMenuId(null);
                                              }}
                                              className="px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                            >
                                              <Trash className="h-3 w-3" /> Supprimer
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              {filtered.length === 0 && (
                                <tr>
                                  <td colSpan={7} className="py-8 text-center text-gray-500">Aucune tâche</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>

            {pieData.length > 0 && (
              <GlassCard className="mt-6 p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Répartition des tâches</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </GlassCard>
            )}
          </>
        )}

        {/* Vue Kanban */}
        {activeTab === 'kanban' && <KanbanView tasks={tasks} onUpdateTask={updateTask} />}

        {/* Vue Gantt */}
        {activeTab === 'gantt' && <GanttView tasks={tasks} />}

        {/* Vue Membres */}
        {activeTab === 'membres' && (
          spaceId && spaceId !== 'list' ? (
            <MemberManagement espaceId={spaceId} />
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Aucun espace sélectionné</p>
              <p className="text-sm text-gray-400">Sélectionnez un espace dans le menu de gauche pour voir ses membres.</p>
            </div>
          )
        )}

        {/* Modale de création/édition de tâche avec Checklist */}
        <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={editingTask ? "Modifier la tâche" : "Nouvelle tâche"} size="lg">
          <div className="space-y-5 max-h-[70vh] overflow-y-auto px-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Implémenter l'authentification"
                value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                placeholder="Décrivez la tâche en détail..."
                rows={3}
                value={taskForm.description}
                onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={taskForm.startDate}
                  onChange={e => setTaskForm({ ...taskForm, startDate: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">Format: AAAA-MM-JJ</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin prévue
                </label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
              </div>
            </div>

            {editingTask && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  value={taskForm.status}
                  onChange={e => setTaskForm({ ...taskForm, status: e.target.value as Task['status'] })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Modifiez le statut pour suivre l'avancement</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priorité
              </label>
              <select
                value={taskForm.priority}
                onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as Task['priority'] })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              >
                {priorityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Membres assignés
              </label>
              <select
                multiple
                value={taskForm.assignedMemberIds}
                onChange={e => {
                  const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                  setTaskForm(prev => ({ ...prev, assignedMemberIds: selected }));
                }}
                className="w-full p-2 border rounded-lg h-32 focus:ring-2 focus:ring-secondary focus:border-transparent"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({roleLabels[m.role] || m.role})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs membres
              </p>
            </div>

            {/* Section Checklist */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Checklist
                </label>
                <span className="text-xs text-gray-400">
                  {taskChecklists.filter(c => c.is_checked).length}/{taskChecklists.length} complétés
                </span>
              </div>

              <div className="space-y-2">
                {taskChecklists.map((checklist) => (
                  <div key={checklist.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => editingTask && toggleChecklist(editingTask.id, checklist.id, checklist.is_checked)}
                      disabled={!editingTask || checklistLoading === checklist.id}
                      className="flex-shrink-0"
                    >
                      {checklistLoading === checklist.id ? (
                        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                      ) : checklist.is_checked ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300 hover:text-gray-400" />
                      )}
                    </button>

                    {editingChecklistId === checklist.id ? (
                      <input
                        type="text"
                        value={editingChecklistText}
                        onChange={(e) => setEditingChecklistText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && editingTask && updateChecklistText(editingTask.id, checklist.id, editingChecklistText)}
                        className="flex-1 text-sm border rounded px-2 py-1 focus:ring-1 focus:ring-secondary"
                        autoFocus
                      />
                    ) : (
                      <span className={`text-sm flex-1 ${checklist.is_checked ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                        {checklist.texte}
                      </span>
                    )}

                    {editingTask && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        {editingChecklistId !== checklist.id && (
                          <button
                            onClick={() => {
                              setEditingChecklistId(checklist.id);
                              setEditingChecklistText(checklist.texte);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                        )}
                        {editingChecklistId === checklist.id && (
                          <button
                            onClick={() => editingTask && updateChecklistText(editingTask.id, checklist.id, editingChecklistText)}
                            disabled={checklistLoading === `edit-${checklist.id}`}
                            className="p-1 text-green-500 hover:text-green-600"
                          >
                            {checklistLoading === `edit-${checklist.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> :
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            }
                          </button>
                        )}
                        <button
                          onClick={() => editingTask && deleteChecklistFromTask(editingTask.id, checklist.id)}
                          disabled={checklistLoading === `delete-${checklist.id}`}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          {checklistLoading === `delete-${checklist.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash className="h-3 w-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {isAddingChecklist ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Circle className="h-4 w-4 text-gray-300" />
                    <input
                      type="text"
                      placeholder="Nouvel élément de checklist..."
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && editingTask && addChecklistToTask(editingTask.id, newChecklistText).then(() => {
                        setNewChecklistText('');
                        setIsAddingChecklist(false);
                      })}
                      className="flex-1 text-sm border-b border-gray-200 focus:border-secondary outline-none py-1"
                      autoFocus
                    />
                    <button
                      onClick={() => editingTask && addChecklistToTask(editingTask.id, newChecklistText).then(() => {
                        setNewChecklistText('');
                        setIsAddingChecklist(false);
                      })}
                      disabled={checklistLoading === 'add'}
                      className="text-secondary text-xs hover:underline"
                    >
                      {checklistLoading === 'add' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ajouter'}
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingChecklist(false);
                        setNewChecklistText('');
                      }}
                      className="text-gray-400 text-xs hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingChecklist(true)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-secondary transition mt-2"
                  >
                    <Plus className="h-3 w-3" /> Ajouter un élément à la checklist
                  </button>
                )}

                <p className="text-xs text-gray-400 mt-2">
                  La progression de la tâche sera automatiquement calculée à partir des éléments cochés.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleTaskSubmit}>
                {editingTask ? "Enregistrer les modifications" : "Créer la tâche"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modale d'invitation */}
        <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Inviter un membre" size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email du membre
              </label>
              <input
                type="email"
                placeholder="exemple@email.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              >
                <option value="Invité">Invité</option>
                <option value="Membre">Membre</option>
                <option value="Administrateur">Administrateur</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Annuler</Button>
              <Button onClick={handleInviteMember}>Inviter</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Cas 2: Un espace est sélectionné (mais pas de liste) → Dashboard de l'espace
  if (spaceId && spaceId !== 'list') {
    return (
      <div className="p-6">
        <SpaceDashboard
          spaceId={spaceId}
        />
      </div>
    );
  }

  // Cas 3: Ni liste ni espace, mais un workspace existe → Dashboard du workspace
  if (workspaceId) {
    return (
      <div className="p-6">
        <WorkspaceDashboardPanel workspaceId={workspaceId} />
      </div>
    );
  }

  // Cas par défaut
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
