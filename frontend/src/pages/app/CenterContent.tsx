// frontend/src/pages/app/CenterContent.tsx
import { useState } from 'react';
import { Plus, Search, Filter, ChevronDown, ChevronRight, MoreVertical, Edit, Trash, UserPlus, LayoutGrid, KanbanSquare, GitBranch, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import Modal from '../../components/ui/Modal';
import KanbanView from './components/KanbanView';
import GanttView from './components/GanttView';
import type { Task, Member } from '../../types';

// Helper pour créer un membre avec un rôle strict
const createMember = (id: string, name: string, email: string, role: 'admin' | 'member'): Member => ({ id, name, email, role });

// Données mockées
const initialTasks: Task[] = [
  { id: '1', title: 'Rédaction de cahier de charges', description: '', status: 'en_cours', priority: 'elevee', dueDate: '2025-12-05', assignees: [createMember('u1', 'Thomas D.', '', 'member')], listId: 'l1', createdAt: new Date(), subTasks: [] },
  { id: '2', title: 'Conception de l\'architecture', description: '', status: 'en_cours', priority: 'elevee', dueDate: '2025-12-05', assignees: [createMember('u2', 'Alice M.', '', 'member')], listId: 'l1', createdAt: new Date(), subTasks: [] },
  { id: '3', title: 'Conception Frontend', description: '', status: 'en_cours', priority: 'normale', dueDate: '2025-12-06', assignees: [createMember('u3', 'Lucas B.', '', 'member')], listId: 'l1', createdAt: new Date(), subTasks: [] },
  { id: '4', title: 'Conception Backend', description: '', status: 'en_cours', priority: 'normale', dueDate: '2025-12-06', assignees: [createMember('u4', 'Emma P.', '', 'member')], listId: 'l1', createdAt: new Date(), subTasks: [] },
  { id: '5', title: 'Conception de BD', description: '', status: 'en_cours', priority: 'faible', dueDate: '2025-12-07', assignees: [createMember('u1', 'Thomas D.', '', 'member')], listId: 'l1', createdAt: new Date(), subTasks: [] },
  { id: '6', title: 'Tests unitaires', description: '', status: 'en_attente', priority: 'normale', dueDate: '2025-12-10', assignees: [], listId: 'l1', createdAt: new Date(), subTasks: [] },
  { id: '7', title: 'Déploiement', description: '', status: 'terminee', priority: 'elevee', dueDate: '2025-12-01', assignees: [], listId: 'l1', createdAt: new Date(), subTasks: [] },
];

const statusLabels: Record<string, string> = {
  en_cours: 'Tâches en cours',
  en_attente: 'Tâches en attente',
  terminee: 'Tâches terminées',
  bloquee: 'Tâches bloquées',
  archivee: 'Tâches archivées',
};

const priorityLabels: Record<string, string> = {
  tres_elevee: 'Très élevée',
  elevee: 'Élevée',
  normale: 'Normale',
  faible: 'Faible',
  tres_faible: 'Très faible',
};

const priorityColors: Record<string, string> = {
  tres_elevee: 'bg-red-100 text-red-800',
  elevee: 'bg-orange-100 text-orange-800',
  normale: 'bg-blue-100 text-blue-800',
  faible: 'bg-green-100 text-green-800',
  tres_faible: 'bg-gray-100 text-gray-800',
};

// Données mockées pour les membres
const mockMembers: Member[] = [
  createMember('1', 'Thomas D.', 'thomas@example.com', 'admin'),
  createMember('2', 'Alice M.', 'alice@example.com', 'member'),
  createMember('3', 'Lucas B.', 'lucas@example.com', 'member'),
  createMember('4', 'Emma P.', 'emma@example.com', 'member'),
];

export default function CenterContent() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<'liste' | 'kanban' | 'gantt' | 'membres'>('liste');
  const [expandedStatus, setExpandedStatus] = useState<Record<string, boolean>>({
    en_cours: true,
    en_attente: false,
    terminee: false,
    bloquee: false,
    archivee: false,
  });
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    assigneeName: '',
    priority: 'normale' as Task['priority'],
    dueDate: '',
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fonctions de gestion des tâches
  const updateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date(),
      assignees: task.assignees || [],
      subTasks: [],
    };
    setTasks(prev => [...prev, newTask]);
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
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
      status === 'en_cours' ? '#3b82f6'
      : status === 'en_attente' ? '#eab308'
      : status === 'terminee' ? '#10b981'
      : status === 'bloquee' ? '#ef4444'
      : '#6b7280',
  })).filter(d => d.value > 0);

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskForm({ title: '', assigneeName: '', priority: 'normale', dueDate: '' });
    setIsTaskModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      assigneeName: task.assignees[0]?.name || '',
      priority: task.priority,
      dueDate: task.dueDate,
    });
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = () => {
    if (!taskForm.title.trim()) return;
    const assignee = taskForm.assigneeName ? [createMember(Date.now().toString(), taskForm.assigneeName, '', 'member')] : [];
    if (editingTask) {
      updateTask({
        ...editingTask,
        title: taskForm.title,
        assignees: assignee,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate,
      });
    } else {
      addTask({
        title: taskForm.title,
        description: '',
        status: 'en_cours',
        priority: taskForm.priority,
        dueDate: taskForm.dueDate,
        assignees: assignee,
        listId: 'l1',
      });
    }
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Supprimer cette tâche ?')) deleteTask(taskId);
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

  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

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
            {mockMembers.map(member => (
              <GlassCard key={member.id} className="flex items-center gap-4 p-4 hover:shadow-md transition">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                  {member.name.charAt(0)}
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

      {/* Modales */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={editingTask ? "Modifier la tâche" : "Nouvelle tâche"} size="lg">
        <div className="space-y-4">
          <input type="text" placeholder="Titre" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full p-2 border rounded-lg" />
          <input type="text" placeholder="Membre assigné" value={taskForm.assigneeName} onChange={e => setTaskForm({...taskForm, assigneeName: e.target.value})} className="w-full p-2 border rounded-lg" />
          <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as Task['priority']})} className="w-full p-2 border rounded-lg">
            <option value="tres_elevee">Très élevée</option>
            <option value="elevee">Élevée</option>
            <option value="normale">Normale</option>
            <option value="faible">Faible</option>
            <option value="tres_faible">Très faible</option>
          </select>
          <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} className="w-full p-2 border rounded-lg" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>Annuler</Button>
            <Button onClick={handleTaskSubmit}>{editingTask ? "Enregistrer" : "Créer"}</Button>
          </div>
        </div>
      </Modal>

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