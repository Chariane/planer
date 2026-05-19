// frontend/src/pages/app/views/ListView.tsx
import { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronRight, MoreVertical, Edit, Trash, UserPlus, Eye } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
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

interface TaskChecklist {
  id: string;
  texte: string;
  is_checked: boolean;
}

interface ListViewProps {
  tasks: Task[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAssignTask: (task: Task) => void;
  getTaskProgress: (task: Task) => number;
  readOnly?: boolean;
  canEditTask?: (task: Task) => boolean;
  canDeleteTask?: (task: Task) => boolean;
  canAssignTask?: (task: Task) => boolean;
}

// Composant de détail d'une tâche
function TaskDetailModal({ task, isOpen, onClose, getTaskProgress }: { 
  task: Task | null; 
  isOpen: boolean; 
  onClose: () => void;
  getTaskProgress: (task: Task) => number;
}) {
  if (!task) return null;

  const progress = getTaskProgress(task);
  const taskChecklists = task.checklists || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Détails de la tâche`} size="lg">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto px-1">
        {/* Titre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
          <p className="text-lg font-semibold text-gray-800">{task.title}</p>
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
            <p className="text-gray-600">{task.startDate || 'Non définie'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin prévue</label>
            <p className="text-gray-600">{task.dueDate || 'Non définie'}</p>
          </div>
        </div>

        {/* Statut et Priorité */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              task.status === 'en attente' ? 'bg-yellow-100 text-yellow-800' :
              task.status === 'en cours' ? 'bg-blue-100 text-blue-800' :
              task.status === 'terminé' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {statusLabels[task.status] || task.status}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
              {priorityLabels[task.priority]}
            </span>
          </div>
        </div>

        {/* Membres assignés */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Membres assignés</label>
          <div className="flex flex-wrap gap-2">
            {task.assignees.length > 0 ? (
              task.assignees.map(assignee => (
                <span key={assignee.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm">
                  {assignee.name}
                  <span className="text-xs text-gray-500">({roleLabels[assignee.role] || assignee.role})</span>
                </span>
              ))
            ) : (
              <p className="text-gray-400">Aucun membre assigné</p>
            )}
          </div>
        </div>

        {/* Progression */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Progression</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-secondary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
        </div>

        {/* Checklists */}
        {taskChecklists.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Checklist</label>
              <span className="text-xs text-gray-400">
                {taskChecklists.filter(c => c.is_checked).length}/{taskChecklists.length} complétés
              </span>
            </div>
            <div className="space-y-2">
              {taskChecklists.map((checklist) => (
                <div key={checklist.id} className="flex items-center gap-2">
                  {checklist.is_checked ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300" />
                  )}
                  <span className={`text-sm ${checklist.is_checked ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                    {checklist.texte}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </Modal>
  );
}

// Importer les icônes manquantes
import { CheckCircle, Circle } from 'lucide-react';

export default function ListView({
  tasks,
  searchTerm,
  onSearchChange,
  onEditTask,
  onDeleteTask,
  onAssignTask,
  getTaskProgress,
  readOnly = false,
  canEditTask,
  canDeleteTask,
  canAssignTask,
}: ListViewProps) {
  const [expandedStatus, setExpandedStatus] = useState<Record<string, boolean>>({
    'en attente': true,
    'en cours': true,
    terminé: false,
    bloqué: false,
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const toggleStatus = (status: string) => {
    setExpandedStatus(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTaskForDetail(task);
    setIsDetailModalOpen(true);
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = [];
    acc[task.status].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="space-y-4">
      {/* Modal de détail de tâche */}
      <TaskDetailModal
        task={selectedTaskForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedTaskForDetail(null); }}
        getTaskProgress={getTaskProgress}
      />

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
                          <tr 
                            key={task.id} 
                            className="border-b border-gray-50 hover:bg-gray-50/50 transition cursor-pointer"
                            onClick={() => openTaskDetail(task)}
                          >
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
                            <td className="py-3" onClick={(e) => e.stopPropagation()}>
                              {(() => {
                                const showAssign = canAssignTask ? canAssignTask(task) : !readOnly;
                                const showEdit = canEditTask ? canEditTask(task) : !readOnly;
                                const showDelete = canDeleteTask ? canDeleteTask(task) : !readOnly;
                                const showMenu = showAssign || showEdit || showDelete;

                                if (!showMenu) {
                                  return (
                                    <button
                                      onClick={() => openTaskDetail(task)}
                                      className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                      title="Voir les détails"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  );
                                }

                                return (
                                <div className="relative">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === task.id ? null : task.id); }}
                                    className="p-1 rounded-lg hover:bg-gray-100"
                                  >
                                    <MoreVertical className="h-4 w-4 text-gray-400" />
                                  </button>
                                  {openMenuId === task.id && (
                                    <div className="absolute right-0 top-8 z-10 flex flex-col bg-white shadow-lg rounded-lg w-32 border">
                                      {showAssign && (
                                        <button
                                          onClick={() => { onAssignTask(task); setOpenMenuId(null); }}
                                          className="px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                        >
                                          <UserPlus className="h-3 w-3" /> Assigner
                                        </button>
                                      )}
                                      {showEdit && (
                                        <button
                                          onClick={() => { onEditTask(task); setOpenMenuId(null); }}
                                          className="px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                        >
                                          <Edit className="h-3 w-3" /> Modifier
                                        </button>
                                      )}
                                      {showDelete && (
                                        <button
                                          onClick={() => { onDeleteTask(task.id); setOpenMenuId(null); }}
                                          className="px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                        >
                                          <Trash className="h-3 w-3" /> Supprimer
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                                );
                              })()}
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
  );
}
