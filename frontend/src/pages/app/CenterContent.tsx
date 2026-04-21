// frontend/src/pages/app/CenterContent.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus, Search, Filter, ChevronDown, ChevronRight, MoreVertical,
  Edit, Trash, UserPlus, LayoutGrid, KanbanSquare, GitBranch, Users, ListTodo
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import Modal from '../../components/ui/Modal';
import KanbanView from './components/KanbanView';
import GanttView from './components/GanttView';
import { tacheService } from '../../services/tache.service';
import { espaceService } from '../../services/espace.service';
import type { Task, Member } from '../../types';

// Mapping des statuts (clés = valeurs attendues par le backend)
const statusLabels: Record<string, string> = {
  'en attente': 'Tâches en attente',
  'en cours': 'Tâches en cours',
  terminé: 'Tâches terminées',
  bloqué: 'Tâches bloquées',
};

const priorityLabels: Record<string, string> = {
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
  critique: 'Critique',
};

const priorityColors: Record<string, string> = {
  basse: 'bg-green-100 text-green-800',
  moyenne: 'bg-blue-100 text-blue-800',
  haute: 'bg-orange-100 text-orange-800',
  critique: 'bg-red-100 text-red-800',
};

// Transformer une tâche de l'API vers le format interne
function transformTask(apiTask: any): Task {
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
  };
}

function toApiTask(task: Partial<Task>): any {
  const result: any = {
    titre: task.title,
    description: task.description,
    statut: task.status,
    priorite: task.priority,
    // statut_date: new Date().toISOString(), // ❌ à supprimer
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

export default function CenterContent() {
  const { workspaceId, spaceId, listId } = useParams<{ workspaceId: string; spaceId: string; listId: string }>();
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
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    status: 'en attente' as Task['status'],
    priority: 'moyenne' as Task['priority'],
    assignedMemberIds: [] as string[],
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Charger les membres de l'espace
  useEffect(() => {
    if (spaceId) {
      espaceService.getMembers(spaceId)
        .then(data => {
          const formattedMembers: Member[] = data.map((m: any) => ({
            id: m.id,
            name: m.utilisateur?.nom || m.utilisateur?.username || 'Inconnu',
            email: m.utilisateur?.email || '',
            role: m.role || 'member',
          }));
          setMembers(formattedMembers);
        })
        .catch(err => console.error('Erreur chargement membres espace', err));
    }
  }, [spaceId]);

  // Charger les tâches
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
        const transformed = (Array.isArray(data) ? data : []).map(transformTask);
        setTasks(transformed);
      } catch (err) {
        console.error('Erreur chargement tâches:', err);
        setError('Impossible de charger les tâches.');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [listId]);

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
    } catch (err) {
      console.error('Erreur synchronisation assignations', err);
    }
  };

  // CRUD
  const addTask = async (newTask: Omit<Task, 'id' | 'createdAt'>) => {
    if (!listId) return;
    try {
      const apiTask = toApiTask({ ...newTask, listId });
      console.log('📤 Données envoyées à l\'API:', apiTask);
      const created = await tacheService.create(listId, apiTask);
      const fullTask = transformTask(created);
      setTasks(prev => [...prev, fullTask]);
      await syncAssignments(fullTask.id, newTask.assignees.map(a => a.id));
      return fullTask;
    } catch (err: any) {
      console.error('❌ Erreur création tâche:', err);
      alert(`Erreur détaillée :\n${err.message}`);
    }
  };

  const updateTask = async (updatedTask: Task) => {
    try {
      const apiTask = toApiTask(updatedTask);
      await tacheService.update(updatedTask.id, apiTask);
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      const newMemberIds = updatedTask.assignees.map(a => a.id);
      await syncAssignments(updatedTask.id, newMemberIds);
    } catch (err) {
      console.error('Erreur mise à jour tâche:', err);
      alert('Erreur lors de la mise à jour');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await tacheService.delete(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Erreur suppression tâche:', err);
      alert('Erreur lors de la suppression');
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
      startDate: '',
      dueDate: '',
      status: 'en attente',
      priority: 'moyenne',
      assignedMemberIds: [],
    });
    setIsTaskModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      startDate: task.startDate || '',
      dueDate: task.dueDate || '',
      status: task.status,
      priority: task.priority,
      assignedMemberIds: task.assignees.map(a => a.id),
    });
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
      });
    } else {
      if (!listId) return;
      await addTask({
        title: taskForm.title,
        description: taskForm.description,
        startDate: taskForm.startDate,
        dueDate: taskForm.dueDate,
        status: taskForm.status,
        priority: taskForm.priority,
        assignees: assigneeMembers,
        listId,
      });
    }
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Supprimer cette tâche ?')) await deleteTask(taskId);
  };

  const handleInviteMember = () => {
    if (!inviteEmail.trim()) return;
    alert(`Invitation envoyée à ${inviteEmail}`);
    setInviteEmail('');
    setIsInviteModalOpen(false);
  };

  const toggleStatus = (status: string) => {
    setExpandedStatus(prev => ({ ...prev, [status]: !prev[status] }));
  };

  if (!listId) {
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

      {/* Vue Liste */}
      {activeTab === 'liste' && (
        <>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={openCreateTask}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter nouvelle tâche
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1" /> Ajouter nouveau membre
              </Button>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
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
                              <th className="text-left py-3">Date fin prévue</th>
                              <th className="text-left py-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((task, idx) => (
                              <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                                <td className="py-3 w-12">{idx + 1}</td>
                                <td className="py-3 font-medium">{task.title}</td>
                                <td className="py-3">{task.assignees.map(a => a.name).join(', ') || '—'}</td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                                    {priorityLabels[task.priority]}
                                  </span>
                                </td>
                                <td className="py-3 text-gray-500">{task.dueDate}</td>
                                <td className="py-3">
                                  <div className="relative group">
                                    <button className="p-1 rounded-lg hover:bg-gray-100"><MoreVertical className="h-4 w-4 text-gray-400" /></button>
                                    <div className="absolute right-0 top-8 z-10 hidden group-hover:flex flex-col bg-white shadow-lg rounded-lg w-32 border">
                                      <button onClick={() => openEditTask(task)} className="px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"><Edit className="h-3 w-3" /> Modifier</button>
                                      <button onClick={() => handleDeleteTask(task.id)} className="px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"><Trash className="h-3 w-3" /> Supprimer</button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filtered.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-500">Aucune tâche</td>
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
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Membres de l'espace</h3>
            <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Inviter un membre
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map(member => (
              <GlassCard key={member.id} className="flex items-center gap-4 p-4 hover:shadow-md transition">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                  <p className="text-xs text-gray-400 mt-1">Rôle : {member.role === 'admin' ? 'Administrateur' : 'Membre'}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Modale tâche */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={editingTask ? "Modifier la tâche" : "Nouvelle tâche"} size="lg">
        <div className="space-y-4">
          <input type="text" placeholder="Titre *" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full p-2 border rounded-lg" autoFocus />
          <textarea placeholder="Description" rows={3} value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} className="w-full p-2 border rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <input type="date" value={taskForm.startDate} onChange={e => setTaskForm({...taskForm, startDate: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Date de début" />
            <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Date de fin prévue" />
          </div>
          <select value={taskForm.status} onChange={e => setTaskForm({...taskForm, status: e.target.value as Task['status']})} className="w-full p-2 border rounded-lg">
            <option value="en attente">En attente</option>
            <option value="en cours">En cours</option>
            <option value="terminé">Terminée</option>
            <option value="bloqué">Bloquée</option>
          </select>
          <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as Task['priority']})} className="w-full p-2 border rounded-lg">
            <option value="basse">Basse</option>
            <option value="moyenne">Moyenne</option>
            <option value="haute">Haute</option>
            <option value="critique">Critique</option>
          </select>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Membres assignés</label>
            <select multiple value={taskForm.assignedMemberIds} onChange={e => {
              const selected = Array.from(e.target.selectedOptions, opt => opt.value);
              setTaskForm(prev => ({ ...prev, assignedMemberIds: selected }));
            }} className="w-full p-2 border rounded-lg h-32">
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs membres.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>Annuler</Button>
            <Button onClick={handleTaskSubmit}>{editingTask ? "Enregistrer" : "Créer"}</Button>
          </div>
        </div>
      </Modal>

      {/* Modale invitation */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Inviter un membre" size="md">
        <div className="space-y-4">
          <input type="email" placeholder="Email du membre" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full p-2 border rounded-lg" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Annuler</Button>
            <Button onClick={handleInviteMember}>Inviter</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}