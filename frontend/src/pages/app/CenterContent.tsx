import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Filter, Search, ChevronDown, ChevronRight, Clock, AlertCircle, CheckCircle, Ban, Archive, Circle, MoreVertical, Edit, Trash } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useApp } from '../../contexts/AppContext';
import type { Task, Member } from '../../contexts/AppContext';
import { Button } from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import KanbanView from './components/KanbanView';
import GanttView from './components/GanttView';

const statusLabels = {
  en_cours: 'En cours',
  en_attente: 'En attente',
  terminee: 'Terminées',
  bloquee: 'Bloquées',
  archivee: 'Archivées',
};

const statusIcons = {
  en_cours: Clock,
  en_attente: AlertCircle,
  terminee: CheckCircle,
  bloquee: Ban,
  archivee: Archive,
};

const statusColors = {
  en_cours: 'text-blue-600',
  en_attente: 'text-yellow-600',
  terminee: 'text-green-600',
  bloquee: 'text-red-600',
  archivee: 'text-gray-500',
};

const priorityLabels = {
  tres_elevee: 'Très élevée',
  elevee: 'Élevée',
  normale: 'Normale',
  faible: 'Faible',
  tres_faible: 'Très faible',
};

const priorityColors = {
  tres_elevee: 'bg-red-100 text-red-800',
  elevee: 'bg-orange-100 text-orange-800',
  normale: 'bg-blue-100 text-blue-800',
  faible: 'bg-green-100 text-green-800',
  tres_faible: 'bg-gray-100 text-gray-800',
};

export default function CenterContent() {
  const { workspaceId, spaceId, listId } = useParams();
  const { workspaces, updateTask, addTask, deleteTask, toggleSubTask, addMember } = useApp();
  const [activeTab, setActiveTab] = useState<'liste' | 'kanban' | 'gantt' | 'membres'>('liste');
  const [expandedStatus, setExpandedStatus] = useState<Record<string, boolean>>({
    en_cours: true,
    en_attente: true,
    terminee: true,
    bloquee: true,
    archivee: true,
  });
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'normale' as Task['priority'],
    dueDate: '',
    assigneeId: '',
  });
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    role: 'member' as 'admin' | 'member',
  });

  const findList = (spaces: any[], listId: string): any => {
    for (const space of spaces) {
      const list = space.lists.find((l: any) => l.id === listId);
      if (list) return list;
      if (space.spaces) {
        const found = findList(space.spaces, listId);
        if (found) return found;
      }
    }
    return null;
  };
  const workspace = workspaces.find(w => w.id === workspaceId);
  const list = workspace ? findList(workspace.spaces, listId || '') : null;
  const tasks: Task[] = list?.tasks || [];

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleStatus = (status: string) => {
    setExpandedStatus(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const groupedTasks = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!acc[task.status]) acc[task.status] = [];
    acc[task.status].push(task);
    return acc;
  }, {});

  const pieData = Object.entries(groupedTasks).map(([status, tasks]) => ({
    name: statusLabels[status as keyof typeof statusLabels] || status,
    value: tasks.length,
    color: status === 'en_cours' ? '#3b82f6' : status === 'en_attente' ? '#eab308' : status === 'bloquee' ? '#ef4444' : status === 'terminee' ? '#10b981' : '#6b7280',
  })).filter(d => d.value > 0);

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskForm({ title: '', description: '', priority: 'normale', dueDate: '', assigneeId: '' });
    setIsTaskModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate,
      assigneeId: task.assignees[0]?.id || '',
    });
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = () => {
    if (!taskForm.title.trim() || !listId) return;
    const assignee = workspace?.members.find(m => m.id === taskForm.assigneeId);
    const task: Task = {
      id: editingTask?.id || Date.now().toString(),
      title: taskForm.title,
      description: taskForm.description,
      status: editingTask?.status || 'en_cours',
      priority: taskForm.priority,
      dueDate: taskForm.dueDate,
      assignees: assignee ? [assignee] : [],
      listId: listId,
      createdAt: editingTask?.createdAt || new Date(),
      subTasks: editingTask?.subTasks || [],
    };
    if (editingTask) {
      updateTask(task);
    } else {
      addTask(listId, task);
    }
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Supprimer cette tâche ?')) {
      deleteTask(listId!, taskId);
    }
  };

  const handleAddMember = () => {
    if (!memberForm.name.trim() || !memberForm.email.trim() || !workspaceId) return;
    const newMember: Member = {
      id: Date.now().toString(),
      name: memberForm.name,
      email: memberForm.email,
      role: memberForm.role,
    };
    addMember(workspaceId, newMember);
    setIsMemberModalOpen(false);
    setMemberForm({ name: '', email: '', role: 'member' });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {(['liste', 'kanban', 'gantt', 'membres'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 md:px-4 md:py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === tab ? 'bg-secondary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab === 'liste' && 'Vue liste'}
            {tab === 'kanban' && 'Vue Kanban'}
            {tab === 'gantt' && 'Diagramme de Gantt'}
            {tab === 'membres' && 'Membres'}
          </button>
        ))}
      </div>

      {activeTab === 'liste' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={openCreateTask}><Plus className="h-4 w-4 mr-1" /> Ajouter tâche</Button>
              <Button variant="outline" size="sm" onClick={() => setIsMemberModalOpen(true)}><Plus className="h-4 w-4 mr-1" /> Ajouter membre</Button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Rechercher..." className="w-full sm:w-64 pl-8 pr-2 py-1 border rounded-lg text-sm" />
              </div>
              <button className="p-1 rounded hover:bg-gray-100"><Filter className="h-5 w-5 text-gray-500" /></button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {Object.keys(groupedTasks).length === 0 && <Card className="p-8 text-center text-gray-500">Aucune tâche. Cliquez sur "Ajouter tâche" pour commencer.</Card>}
            {Object.entries(groupedTasks).map(([status, tasks]) => {
              const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;
              const colorClass = statusColors[status as keyof typeof statusColors] || 'text-gray-600';
              return (
                <Card key={status} className="p-4 hover:shadow-md transition">
                  <button onClick={() => toggleStatus(status)} className="w-full flex justify-between items-center">
                    <div className="flex items-center gap-2"><Icon className={`h-5 w-5 ${colorClass}`} /><h3 className="font-semibold text-gray-800">{statusLabels[status as keyof typeof statusLabels] || status}</h3><span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{tasks.length}</span></div>
                    {expandedStatus[status] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {expandedStatus[status] && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-[600px] md:min-w-full text-sm">
                        <thead className="text-gray-500 border-b"><tr><th className="text-left py-2">#</th><th className="text-left py-2">Titre</th><th className="text-left py-2">Membres</th><th className="text-left py-2">Priorité</th><th className="text-left py-2">Date fin</th><th className="text-left py-2">Actions</th></tr></thead>
                        <tbody>
                          {(tasks as Task[]).map(task => (
                            <React.Fragment key={task.id}>
                              <tr className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-2">{task.id}</td>
                                <td className="py-2 font-medium"><button onClick={() => toggleTaskExpand(task.id)} className="flex items-center gap-1 hover:text-secondary">{expandedTasks[task.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}{task.title}</button></td>
                                <td className="py-2"><div className="flex -space-x-2">{task.assignees.map(a => <div key={a.id} className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold border-2 border-white">{a.name.charAt(0)}</div>)}</div></td>
                                <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>{priorityLabels[task.priority]}</span></td>
                                <td className="py-2 text-gray-500">{task.dueDate}</td>
                                <td className="py-2">
                                  <div className="relative group">
                                    <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="h-4 w-4" /></button>
                                    <div className="absolute right-0 top-6 z-10 hidden group-hover:flex flex-col bg-white shadow-lg rounded-lg w-32">
                                      <button onClick={() => openEditTask(task)} className="px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"><Edit className="h-3 w-3" /> Modifier</button>
                                      <button onClick={() => handleDeleteTask(task.id)} className="px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"><Trash className="h-3 w-3" /> Supprimer</button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {expandedTasks[task.id] && task.subTasks && task.subTasks.length > 0 && (
                                <tr className="bg-gray-50"><td colSpan={6} className="py-2 pl-8"><div className="space-y-1">{task.subTasks.map(sub => <div key={sub.id} className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleSubTask(task.id, sub.id)}>{sub.completed ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-gray-300 group-hover:text-gray-400" />}<span className={`text-xs ${sub.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{sub.text}</span></div>)}</div></td></tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {pieData.length > 0 && (
            <Card className="mt-6 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Répartition des tâches</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{pieData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}

      {activeTab === 'kanban' && <KanbanView tasks={tasks} onUpdateTask={updateTask} />}
      {activeTab === 'gantt' && <GanttView tasks={tasks} />}
      {activeTab === 'membres' && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspace?.members.map(m => <Card key={m.id} className="flex items-center gap-3 p-4"><div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center font-bold">{m.name.charAt(0)}</div><div><p className="font-medium">{m.name}</p><p className="text-sm text-gray-500">{m.email}</p><p className="text-xs text-gray-400">Rôle : {m.role}</p></div></Card>)}
        </div>
      )}

      {/* Modale de tâche */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={editingTask ? "Modifier la tâche" : "Ajouter une nouvelle tâche"} size="lg">
        <div className="space-y-4">
          <input type="text" placeholder="Titre" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full p-2 border rounded-lg" />
          <textarea placeholder="Description" value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} rows={3} className="w-full p-2 border rounded-lg" />
          <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as Task['priority']})} className="w-full p-2 border rounded-lg">
            <option value="tres_elevee">Très élevée</option><option value="elevee">Élevée</option><option value="normale">Normale</option><option value="faible">Faible</option><option value="tres_faible">Très faible</option>
          </select>
          <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} className="w-full p-2 border rounded-lg" />
          <select value={taskForm.assigneeId} onChange={e => setTaskForm({...taskForm, assigneeId: e.target.value})} className="w-full p-2 border rounded-lg">
            <option value="">Non assigné</option>
            {workspace?.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>Annuler</Button><Button onClick={handleTaskSubmit}>{editingTask ? "Enregistrer" : "Créer"}</Button></div>
        </div>
      </Modal>

      {/* Modale d'ajout de membre */}
      <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title="Ajouter un membre" size="md">
        <div className="space-y-4">
          <input type="text" placeholder="Nom complet" value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} className="w-full p-2 border rounded-lg" />
          <input type="email" placeholder="Email" value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} className="w-full p-2 border rounded-lg" />
          <select value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value as 'admin' | 'member'})} className="w-full p-2 border rounded-lg">
            <option value="member">Membre</option><option value="admin">Administrateur</option>
          </select>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setIsMemberModalOpen(false)}>Annuler</Button><Button onClick={handleAddMember}>Ajouter</Button></div>
        </div>
      </Modal>
    </div>
  );
}
