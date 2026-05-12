// frontend/src/pages/app/views/ListView.tsx
import { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronRight, MoreVertical, Edit, Trash, UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { Task, Member } from '../../../types';

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

const roleLabels: Record<string, string> = {
  Créateur: 'Créateur',
  Administrateur: 'Administrateur',
  Membre: 'Membre',
  Invité: 'Invité',
};

interface ListViewProps {
  tasks: Task[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAssignTask: (task: Task) => void;
  getTaskProgress: (task: Task) => number;
}

export default function ListView({
  tasks,
  searchTerm,
  onSearchChange,
  onEditTask,
  onDeleteTask,
  onAssignTask,
  getTaskProgress,
}: ListViewProps) {
  const [expandedStatus, setExpandedStatus] = useState<Record<string, boolean>>({
    'en attente': true,
    'en cours': true,
    terminé: false,
    bloqué: false,
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const toggleStatus = (status: string) => {
    setExpandedStatus(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = [];
    acc[task.status].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une tâche..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <button className="p-2 rounded-lg hover:bg-gray-100">
          <Filter className="h-5 w-5 text-gray-500" />
        </button>
      </div>

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
                              </div>
                            </td>
                            <td className="py-3 text-gray-500">{task.dueDate || '—'}</td>
                            <td className="py-3">
                              <div className="relative">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === task.id ? null : task.id); }}
                                  className="p-1 rounded-lg hover:bg-gray-100"
                                >
                                  <MoreVertical className="h-4 w-4 text-gray-400" />
                                </button>
                                {openMenuId === task.id && (
                                  <div className="absolute right-0 top-8 z-10 flex flex-col bg-white shadow-lg rounded-lg w-32 border">
                                    <button onClick={() => { onAssignTask(task); setOpenMenuId(null); }} className="px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                      <UserPlus className="h-3 w-3" /> Assigner
                                    </button>
                                    <button onClick={() => { onEditTask(task); setOpenMenuId(null); }} className="px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                      <Edit className="h-3 w-3" /> Modifier
                                    </button>
                                    <button onClick={() => { onDeleteTask(task.id); setOpenMenuId(null); }} className="px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
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
                        <tr><td colSpan={7} className="py-8 text-center text-gray-500">Aucune tâche</td></tr>
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
  );
}