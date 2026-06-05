// frontend/src/pages/app/views/ListView.tsx
import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Plus, Trash, UserPlus, CheckCircle, Circle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import type { Task } from '../../../types';

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
  basse: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 dark:text-emerald-400',
  moyenne: 'bg-blue-500/10 text-blue-500 border border-blue-500/10 dark:text-blue-400',
  haute: 'bg-orange-500/10 text-orange-500 border border-orange-500/10 dark:text-orange-400',
  critique: 'bg-red-500/10 text-red-500 border border-red-500/10 dark:text-red-400',
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
  onUpdateTaskStatus?: (taskId: string, status: string) => Promise<void>;
  onAddChecklist?: (taskId: string, texte: string) => Promise<void>;
  onToggleChecklist?: (taskId: string, checklistId: string, currentChecked: boolean) => Promise<void>;
  onDeleteChecklist?: (taskId: string, checklistId: string) => Promise<void>;
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
      <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
        {/* Titre */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">Titre de la mission</label>
          <div className="p-4 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl">
            <p className="text-lg font-bold text-theme-main leading-tight">{task.title}</p>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="space-y-1">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">Objectifs & Détails</label>
            <div className="p-4 bg-theme-surface/30 border border-theme-border-subtle rounded-2xl text-sm leading-relaxed text-theme-muted whitespace-pre-wrap">
              {task.description}
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">Début</label>
            <div className="p-3 bg-theme-surface/50 border border-theme-border-subtle rounded-xl text-theme-main font-bold text-sm">
              {task.startDate || 'Non définie'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">Échéance</label>
            <div className="p-3 bg-theme-surface/50 border border-theme-border-subtle rounded-xl text-theme-main font-bold text-sm">
              {task.dueDate || 'Non définie'}
            </div>
          </div>
        </div>

        {/* Statut et Priorité */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">État actuel</label>
            <div className={`p-3 rounded-xl font-bold text-sm capitalize ${task.status === 'en attente' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
              task.status === 'en cours' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                task.status === 'terminé' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
              {statusLabels[task.status] || task.status}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">Niveau de Priorité</label>
            <div className={`p-3 rounded-xl font-bold text-sm ${priorityColors[task.priority]}`}>
              {priorityLabels[task.priority]}
            </div>
          </div>
        </div>

        {/* Membres assignés */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">Équipe assignée</label>
          <div className="flex flex-wrap gap-2">
            {task.assignees.length > 0 ? (
              task.assignees.map(assignee => (
                <div key={assignee.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-theme-surface-hover border border-theme-border-subtle rounded-xl shadow-sm">
                  <div className="h-6 w-6 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center text-[10px] font-black">
                    {assignee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-theme-main">{assignee.name}</span>
                    <span className="text-[9px] font-black uppercase text-theme-muted opacity-40">{roleLabels[assignee.role] || assignee.role}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-theme-muted italic ml-1">Aucun membre assigné</p>
            )}
          </div>
        </div>

        {/* Progression */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest opacity-60">Progression globale</label>
            <span className="text-xs font-black text-secondary">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-theme-surface-hover rounded-full overflow-hidden border border-theme-border-subtle">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="bg-secondary h-full rounded-full shadow-[0_0_8px_rgba(255,102,0,0.3)]"
            />
          </div>
        </div>

        {/* Checklists */}
        {taskChecklists.length > 0 && (
          <div className="pt-4 border-t border-theme-border-subtle/30 space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest opacity-60">Points de contrôle</label>
              <span className="text-[10px] font-black text-theme-muted opacity-40">
                {taskChecklists.filter(c => c.is_checked).length}/{taskChecklists.length}
              </span>
            </div>
            <div className="space-y-2">
              {taskChecklists.map((checklist) => (
                <div key={checklist.id} className="flex items-center gap-3 p-3 bg-theme-surface/20 rounded-xl border border-theme-border-subtle/30 group hover:bg-theme-surface/40 transition-colors">
                  {checklist.is_checked ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-theme-border-strong shrink-0" />
                  )}
                  <span className={`text-sm tracking-tight ${checklist.is_checked ? 'line-through text-theme-muted opacity-40' : 'text-theme-main font-medium'}`}>
                    {checklist.texte}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 pb-2">
          <Button variant="outline" className="px-8 rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ListView({
  tasks,
  searchTerm,
  onDeleteTask,
  onAssignTask,
  onUpdateTaskStatus,
  onAddChecklist,
  onToggleChecklist,
  onDeleteChecklist,
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
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [addingChecklistTaskId, setAddingChecklistTaskId] = useState<string | null>(null);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const toggleStatus = (status: string) => {
    setExpandedStatus(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTaskForDetail(task);
    setIsDetailModalOpen(true);
  };

  const toggleTaskOpen = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const startAddingChecklist = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: true }));
    setAddingChecklistTaskId(taskId);
    setNewChecklistText('');
  };

  const handleAddChecklist = async (taskId: string) => {
    if (!onAddChecklist || !newChecklistText.trim()) return;
    setActionLoading(`add-checklist-${taskId}`);
    try {
      await onAddChecklist(taskId, newChecklistText);
      setNewChecklistText('');
      setAddingChecklistTaskId(null);
      setExpandedTasks(prev => ({ ...prev, [taskId]: true }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleChecklist = async (taskId: string, checklistId: string, currentChecked: boolean) => {
    if (!onToggleChecklist) return;
    setActionLoading(`toggle-checklist-${checklistId}`);
    try {
      await onToggleChecklist(taskId, checklistId, currentChecked);
      setExpandedTasks(prev => ({ ...prev, [taskId]: true }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteChecklist = async (taskId: string, checklistId: string) => {
    if (!onDeleteChecklist) return;
    if (!confirm('Supprimer cette checklist ?')) return;
    setActionLoading(`delete-checklist-${checklistId}`);
    try {
      await onDeleteChecklist(taskId, checklistId);
      setExpandedTasks(prev => ({ ...prev, [taskId]: true }));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedTasks = Object.keys(statusLabels).reduce((acc, status) => {
    acc[status] = filteredTasks.filter(t => t.status === status);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedTasks).map(([status, statusTasks]) => (
        <div key={status} className="space-y-3">
          <button
            onClick={() => toggleStatus(status)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-theme-muted hover:text-theme-main transition-colors group px-1"
          >
            <AnimatePresence mode="wait">
              <motion.div key={expandedStatus[status] ? 'open' : 'closed'} initial={{ rotate: -90 }} animate={{ rotate: 0 }}>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedStatus[status] ? '' : '-rotate-90'}`} />
              </motion.div>
            </AnimatePresence>
            {statusLabels[status]}
            <span className="ml-2 px-2 py-0.5 rounded-lg bg-theme-surface-hover text-[10px] font-black border border-theme-border-subtle group-hover:border-secondary transition-colors">
              {statusTasks.length}
            </span>
          </button>

          <AnimatePresence>
            {expandedStatus[status] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {statusTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs font-bold text-theme-muted opacity-30 uppercase tracking-widest border-2 border-dashed border-theme-border-subtle rounded-2xl">
                    Aucune tâche {status}
                  </div>
                ) : (
                  statusTasks.map((task, idx) => {
                    const taskChecklists = task.checklists || [];
                    const isTaskExpanded = !!expandedTasks[task.id];
                    const canManageTask = canEditTask ? canEditTask(task) : !readOnly;
                    const canDeleteCurrentTask = canDeleteTask ? canDeleteTask(task) : !readOnly;
                    const canAssignCurrentTask = canAssignTask ? canAssignTask(task) : !readOnly;
                    const checklistSummary = taskChecklists.length > 0
                      ? `${taskChecklists.filter(c => c.is_checked).length}/${taskChecklists.length}`
                      : '0';

                    return (
                      <motion.div
                        key={task.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="space-y-2"
                      >
                        <GlassCard
                          className="group flex flex-wrap items-center gap-3 p-4 hover:border-secondary/30 hover:bg-theme-surface-hover transition-all cursor-pointer border-theme-border-subtle/50 shadow-theme-sm hover:shadow-theme-md"
                          onClick={() => openTaskDetail(task)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onUpdateTaskStatus && task.status !== 'terminé') {
                                onUpdateTaskStatus(task.id, 'terminé');
                              }
                            }}
                            className={`h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all ${task.status === 'terminé' ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' : 'bg-theme-surface-hover text-theme-muted group-hover:text-secondary group-hover:bg-secondary/10 hover:bg-secondary/20'}`}
                            title={task.status === 'terminé' ? 'Tâche terminée' : 'Marquer comme terminée'}
                          >
                            {task.status === 'terminé' ? <CheckCircle size={20} /> : <Circle size={20} />}
                          </button>


                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskOpen(task.id);
                            }}
                            className="h-10 w-10 flex-shrink-0 rounded-xl bg-theme-surface-hover text-theme-muted hover:bg-theme-surface hover:text-theme-main transition-all flex items-center justify-center border border-theme-border-subtle/40"
                            title={isTaskExpanded ? 'Fermer la tâche' : 'Ouvrir la tâche'}
                          >
                            {isTaskExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold tracking-tight mb-1 group-hover:text-theme-main transition-colors ${task.status === 'terminé' ? 'text-theme-muted line-through opacity-60' : 'text-theme-main'}`}>
                              {task.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border ${priorityColors[task.priority]}`}>
                                {priorityLabels[task.priority]}
                              </span>
                              <span className="text-[10px] font-black text-theme-muted opacity-50 uppercase tracking-tighter">
                                Checklists {checklistSummary}
                              </span>
                              {task.dueDate && (
                                <span className="text-[10px] font-black text-theme-muted opacity-40 uppercase tracking-tighter">
                                  {task.dueDate}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center -space-x-2">
                            {task.assignees.slice(0, 3).map((a, i) => (
                              <div key={i} className="h-7 w-7 rounded-lg bg-theme-surface border-2 border-theme-border-subtle flex items-center justify-center text-[10px] font-black text-secondary shadow-sm" title={a.name}>
                                {a.name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                            {task.assignees.length > 3 && (
                              <div className="h-7 w-7 rounded-lg bg-theme-surface-hover border-2 border-theme-border-subtle flex items-center justify-center text-[8px] font-black text-theme-muted">
                                +{task.assignees.length - 3}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {canAssignCurrentTask && (
                              <button
                                onClick={() => onAssignTask(task)}
                                className="p-2 rounded-lg text-theme-muted hover:bg-secondary/10 hover:text-secondary transition-all"
                                title="Assigner"
                              >
                                <UserPlus size={16} />
                              </button>
                            )}
                            {canDeleteCurrentTask && (
                              <button
                                onClick={() => onDeleteTask(task.id)}
                                className="p-2 rounded-lg text-theme-muted hover:bg-red-500/10 hover:text-red-500 transition-all"
                                title="Supprimer"
                              >
                                <Trash size={16} />
                              </button>
                            )}
                          </div>
                        </GlassCard>

                        <AnimatePresence>
                          {isTaskExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0, y: -6 }}
                              animate={{ height: 'auto', opacity: 1, y: 0 }}
                              exit={{ height: 0, opacity: 0, y: -6 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-0 sm:ml-28 rounded-2xl border border-theme-border-subtle/50 bg-theme-surface/30 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Checklists de la tâche</p>
                                    <p className="text-[11px] font-medium text-theme-muted opacity-60">Cochez les points terminés ou supprimez ceux qui ne sont plus utiles.</p>
                                  </div>
                                  <span className="rounded-lg bg-theme-surface-hover px-2 py-1 text-[10px] font-black text-theme-main border border-theme-border-subtle">
                                    {checklistSummary}
                                  </span>
                                </div>

                                {taskChecklists.length === 0 && addingChecklistTaskId !== task.id && (
                                  <div className="rounded-xl border border-dashed border-theme-border-subtle p-4 text-center text-xs font-bold text-theme-muted opacity-50">
                                    Aucune checklist pour cette tâche.
                                  </div>
                                )}

                                {taskChecklists.map((checklist) => (
                                  <div key={checklist.id} className="flex items-center gap-3 rounded-xl border border-theme-border-subtle/40 bg-theme-surface/40 px-3 py-2 group/checklist">
                                    <button
                                      onClick={() => canManageTask && handleToggleChecklist(task.id, checklist.id, checklist.is_checked)}
                                      disabled={!canManageTask || actionLoading === `toggle-checklist-${checklist.id}`}
                                      className="flex-shrink-0 text-theme-muted hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                                      title={checklist.is_checked ? 'Marquer inachevée' : 'Marquer achevée'}
                                    >
                                      {actionLoading === `toggle-checklist-${checklist.id}` ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : checklist.is_checked ? (
                                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                                      ) : (
                                        <Circle className="h-4 w-4" />
                                      )}
                                    </button>
                                    <span className={`flex-1 text-sm font-medium ${checklist.is_checked ? 'line-through text-theme-muted opacity-50' : 'text-theme-main'}`}>
                                      {checklist.texte}
                                    </span>
                                    {canManageTask && onDeleteChecklist && (
                                      <button
                                        onClick={() => handleDeleteChecklist(task.id, checklist.id)}
                                        disabled={actionLoading === `delete-checklist-${checklist.id}`}
                                        className="rounded-lg p-1.5 text-theme-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover/checklist:opacity-100 disabled:opacity-50"
                                        title="Supprimer la checklist"
                                      >
                                        {actionLoading === `delete-checklist-${checklist.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash size={14} />}
                                      </button>
                                    )}
                                  </div>
                                ))}

                                {canManageTask && onAddChecklist && (
                                  <div className="pt-1">
                                    {addingChecklistTaskId === task.id ? (
                                      <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                          value={newChecklistText}
                                          onChange={(e) => setNewChecklistText(e.target.value)}
                                          onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist(task.id)}
                                          placeholder="Nouvelle checklist..."
                                          className="min-w-0 flex-1 rounded-xl border border-theme-border-subtle bg-theme-surface px-3 py-2 text-sm font-medium text-theme-main outline-none transition-all focus:ring-2 focus:ring-secondary/20"
                                          autoFocus
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => handleAddChecklist(task.id)}
                                            disabled={!newChecklistText.trim() || actionLoading === `add-checklist-${task.id}`}
                                          >
                                            {actionLoading === `add-checklist-${task.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter'}
                                          </Button>
                                          <button
                                            onClick={() => {
                                              setAddingChecklistTaskId(null);
                                              setNewChecklistText('');
                                            }}
                                            className="rounded-xl border border-theme-border-subtle px-3 py-2 text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover transition-all"
                                            title="Annuler"
                                          >
                                            <X size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => startAddingChecklist(task.id)}
                                        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-theme-border-subtle px-3 py-2 text-xs font-black uppercase tracking-widest text-theme-muted hover:border-secondary/40 hover:text-secondary transition-all"
                                      >
                                        <Plus size={14} /> Ajouter une checklist
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      <TaskDetailModal
        task={selectedTaskForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        getTaskProgress={getTaskProgress}
      />
    </div>
  );
}
