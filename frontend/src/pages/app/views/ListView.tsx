// frontend/src/pages/app/views/ListView.tsx
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Loader2, Paperclip, Plus, Trash, Upload, UserPlus, CheckCircle, Circle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { plannerToolsService } from '../../../services/plannerTools.service';
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
  onCreateSubtask?: (parentTask: Task) => void;
  getTaskProgress: (task: Task) => number;
  readOnly?: boolean;
  canEditTask?: (task: Task) => boolean;
  canDeleteTask?: (task: Task) => boolean;
  canAssignTask?: (task: Task) => boolean;
  canAttachTaskFiles?: (task: Task) => boolean;
  canManageTaskFiles?: (task: Task) => boolean;
}

type TaskFile = {
  id: string;
  nom: string;
  url_fichier?: string;
  type_fichier?: string;
  meta_donnees?: Record<string, any>;
};

const getShortFileType = (file: File): string => {
  const extension = file.name.split('.').pop()?.trim().toLowerCase();
  const mimeSubtype = file.type.split('/')[1]?.split(';')[0]?.trim().toLowerCase();
  return (extension || mimeSubtype || 'fichier').slice(0, 20);
};

function TaskFilesSection({
  task,
  canAttach,
  canManage,
}: {
  task: Task;
  canAttach: boolean;
  canManage: boolean;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await plannerToolsService.listFiles({
        target_type: 'tache',
        target_id: task.id,
        limit: 50,
      });
      setFiles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les fichiers de cette tâche.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [task.id]);

  const handleUpload = async (file: File | null) => {
    if (!file || !canAttach) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await plannerToolsService.uploadFile(file);
      await plannerToolsService.createFile({
        nom: uploaded?.filename || file.name,
        url_fichier: uploaded?.url,
        type_fichier: getShortFileType(file),
        meta_donnees: {
          mime_type: uploaded?.content_type || file.type || null,
        },
        target_type: 'tache',
        target_id: task.id,
      });
      await loadFiles();
    } catch (err: any) {
      setError(err?.message || 'Impossible de rattacher ce fichier à la tâche.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (file: TaskFile) => {
    const ownerId = file.meta_donnees?.owner_user_id;
    if (!canManage && ownerId !== user?.id) return;
    if (!confirm('Supprimer ce fichier de la tâche ?')) return;
    setError(null);
    try {
      await plannerToolsService.deleteFile(file.id);
      setFiles(prev => prev.filter(item => item.id !== file.id));
    } catch (err: any) {
      setError(err?.message || 'Impossible de supprimer ce fichier.');
    }
  };

  return (
    <div className="rounded-2xl border border-theme-border-subtle/50 bg-theme-surface/40 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-secondary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Fichiers de la tâche</p>
          </div>
          <p className="mt-1 text-[11px] font-medium text-theme-muted opacity-60">
            Pièces jointes spécifiques à cette tâche.
          </p>
        </div>
        {canAttach && (
          <div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(event) => handleUpload(event.target.files?.[0] || null)}
              disabled={uploading}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Joindre
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-5 text-theme-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-xl border border-dashed border-theme-border-subtle p-4 text-center text-xs font-bold text-theme-muted opacity-50">
          Aucun fichier rattaché à cette tâche.
        </div>
      ) : (
        <div className="grid gap-2">
          {files.map(file => {
            const ownerId = file.meta_donnees?.owner_user_id;
            const canDelete = canManage || ownerId === user?.id;
            return (
              <div key={file.id} className="flex items-center gap-3 rounded-xl border border-theme-border-subtle/40 bg-theme-surface/60 px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  {file.url_fichier ? (
                    <a
                      href={file.url_fichier}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm font-bold text-theme-main hover:text-secondary"
                    >
                      {file.nom}
                    </a>
                  ) : (
                    <p className="truncate text-sm font-bold text-theme-main">{file.nom}</p>
                  )}
                  <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-theme-muted opacity-50">
                    {file.type_fichier || 'fichier'}
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(file)}
                    className="rounded-lg p-2 text-theme-muted transition-all hover:bg-red-500/10 hover:text-red-500"
                    title="Supprimer le fichier"
                  >
                    <Trash size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Composant de détail d'une tâche
function TaskDetailModal({ task, isOpen, onClose, getTaskProgress, canAttachFiles, canManageFiles }: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  getTaskProgress: (task: Task) => number;
  canAttachFiles: boolean;
  canManageFiles: boolean;
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

        <TaskFilesSection
          task={task}
          canAttach={canAttachFiles}
          canManage={canManageFiles}
        />

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
  onCreateSubtask,
  getTaskProgress,
  readOnly = false,
  canEditTask,
  canDeleteTask,
  canAssignTask,
  canAttachTaskFiles,
  canManageTaskFiles,
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

  const tasksByParent = filteredTasks.reduce((acc, task) => {
    const parentId = task.parentTaskId || null;
    if (parentId) {
      acc[parentId] = [...(acc[parentId] || []), task];
    }
    return acc;
  }, {} as Record<string, Task[]>);

  const topLevelTasks = filteredTasks.filter(task => !task.parentTaskId);

  const groupedTasks = Object.keys(statusLabels).reduce((acc, status) => {
    acc[status] = topLevelTasks.filter(t => t.status === status);
    return acc;
  }, {} as Record<string, Task[]>);

  const renderSubtaskTree = (task: Task, depth = 1) => {
    const taskChecklists = task.checklists || [];
    const childTasks = tasksByParent[task.id] || [];
    const isTaskExpanded = !!expandedTasks[task.id];
    const canManageTask = canEditTask ? canEditTask(task) : !readOnly;
    const canDeleteCurrentTask = canDeleteTask ? canDeleteTask(task) : !readOnly;
    const canAssignCurrentTask = canAssignTask ? canAssignTask(task) : !readOnly;
    const canAttachCurrentTaskFiles = canAttachTaskFiles ? canAttachTaskFiles(task) : canManageTask;
    const canManageCurrentTaskFiles = canManageTaskFiles ? canManageTaskFiles(task) : canManageTask;
    const checklistSummary = taskChecklists.length > 0
      ? `${taskChecklists.filter(c => c.is_checked).length}/${taskChecklists.length}`
      : '0';
    const progress = getTaskProgress(task);

    return (
      <div key={task.id} className="space-y-2">
        <GlassCard
          className="group flex flex-wrap items-center gap-3 border-theme-border-subtle/40 bg-theme-surface/50 p-3 transition-all hover:border-secondary/25 hover:bg-theme-surface-hover"
          onClick={() => openTaskDetail(task)}
        >
          <div className="hidden h-8 w-1 rounded-full bg-secondary/40 sm:block" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canManageTask && onUpdateTaskStatus && task.status !== 'terminé') {
                onUpdateTaskStatus(task.id, 'terminé');
              }
            }}
            disabled={!canManageTask || !onUpdateTaskStatus || task.status === 'terminé'}
            className={`h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center transition-all disabled:cursor-not-allowed ${task.status === 'terminé' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-theme-surface-hover text-theme-muted hover:bg-secondary/10 hover:text-secondary disabled:opacity-50'}`}
            title={task.status === 'terminé' ? 'Sous-tâche terminée' : 'Marquer la sous-tâche comme terminée'}
          >
            {task.status === 'terminé' ? <CheckCircle size={18} /> : <Circle size={18} />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTaskOpen(task.id);
            }}
            className="h-9 w-9 flex-shrink-0 rounded-xl border border-theme-border-subtle/40 bg-theme-surface-hover text-theme-muted transition-all hover:bg-theme-surface hover:text-theme-main"
            title={isTaskExpanded ? 'Fermer la sous-tâche' : 'Ouvrir la sous-tâche'}
          >
            {isTaskExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-secondary/15 bg-secondary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-secondary">
                Niveau {depth}
              </span>
              <h4 className={`text-sm font-black tracking-tight ${task.status === 'terminé' ? 'line-through text-theme-muted opacity-60' : 'text-theme-main'}`}>
                {task.title}
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border ${priorityColors[task.priority]}`}>
                {priorityLabels[task.priority]}
              </span>
              <span className="text-[10px] font-black uppercase tracking-tighter text-theme-muted opacity-50">
                Checklists {checklistSummary}
              </span>
              {childTasks.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-tighter text-secondary">
                  {childTasks.length} sous-tâche{childTasks.length > 1 ? 's' : ''}
                </span>
              )}
              <span className="text-[10px] font-black uppercase tracking-tighter text-theme-muted opacity-50">
                {progress}%
              </span>
            </div>
          </div>

          <div className="flex items-center -space-x-2">
            {task.assignees.slice(0, 3).map((a, i) => (
              <div key={i} className="h-7 w-7 rounded-lg border-2 border-theme-border-subtle bg-theme-surface flex items-center justify-center text-[10px] font-black text-secondary shadow-sm" title={a.name}>
                {a.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {canAttachCurrentTaskFiles && (
              <button
                onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: true }))}
                className="rounded-lg p-2 text-theme-muted transition-all hover:bg-secondary/10 hover:text-secondary"
                title="Fichiers de la sous-tâche"
              >
                <Paperclip size={15} />
              </button>
            )}
            {canAssignCurrentTask && (
              <button
                onClick={() => onAssignTask(task)}
                className="rounded-lg p-2 text-theme-muted transition-all hover:bg-secondary/10 hover:text-secondary"
                title="Assigner la sous-tâche"
              >
                <UserPlus size={15} />
              </button>
            )}
            {canDeleteCurrentTask && (
              <button
                onClick={() => onDeleteTask(task.id)}
                className="rounded-lg p-2 text-theme-muted transition-all hover:bg-red-500/10 hover:text-red-500"
                title="Supprimer la sous-tâche"
              >
                <Trash size={15} />
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
              <div className="ml-4 rounded-2xl border border-theme-border-subtle/50 bg-theme-surface/25 p-4 space-y-3 sm:ml-10">
                {(childTasks.length > 0 || (canManageTask && onCreateSubtask)) && (
                  <div className="rounded-2xl border border-theme-border-subtle/50 bg-theme-surface/40 p-4 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Sous-tâches</p>
                        <p className="text-[11px] font-medium text-theme-muted opacity-60">Même structure, mêmes responsabilités, avec un niveau hiérarchique supplémentaire.</p>
                      </div>
                      {canManageTask && onCreateSubtask && (
                        <Button size="sm" variant="outline" onClick={() => onCreateSubtask(task)} className="w-full sm:w-auto">
                          <Plus className="mr-2 h-4 w-4" />
                          Sous-tâche
                        </Button>
                      )}
                    </div>
                    {childTasks.length > 0 ? (
                      <div className="space-y-2">
                        {childTasks.map(childTask => renderSubtaskTree(childTask, depth + 1))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-theme-border-subtle p-4 text-center text-xs font-bold text-theme-muted opacity-50">
                        Aucune sous-tâche pour le moment.
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Checklists de la sous-tâche</p>
                    <p className="text-[11px] font-medium text-theme-muted opacity-60">Points de contrôle propres à cette sous-tâche.</p>
                  </div>
                  <span className="rounded-lg bg-theme-surface-hover px-2 py-1 text-[10px] font-black text-theme-main border border-theme-border-subtle">
                    {checklistSummary}
                  </span>
                </div>

                {taskChecklists.length === 0 && addingChecklistTaskId !== task.id && (
                  <div className="rounded-xl border border-dashed border-theme-border-subtle p-4 text-center text-xs font-bold text-theme-muted opacity-50">
                    Aucune checklist pour cette sous-tâche.
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
                          <Button size="sm" onClick={() => handleAddChecklist(task.id)} disabled={!newChecklistText.trim() || actionLoading === `add-checklist-${task.id}`}>
                            {actionLoading === `add-checklist-${task.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter'}
                          </Button>
                          <button
                            onClick={() => {
                              setAddingChecklistTaskId(null);
                              setNewChecklistText('');
                            }}
                            className="rounded-xl border border-theme-border-subtle px-3 py-2 text-theme-muted transition-all hover:bg-theme-surface-hover hover:text-theme-main"
                            title="Annuler"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startAddingChecklist(task.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-theme-border-subtle px-3 py-2 text-xs font-black uppercase tracking-widest text-theme-muted transition-all hover:border-secondary/40 hover:text-secondary"
                      >
                        <Plus size={14} /> Ajouter une checklist
                      </button>
                    )}
                  </div>
                )}

                <TaskFilesSection
                  task={task}
                  canAttach={canAttachCurrentTaskFiles}
                  canManage={canManageCurrentTaskFiles}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

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
                    const canAttachCurrentTaskFiles = canAttachTaskFiles ? canAttachTaskFiles(task) : canManageTask;
                    const canManageCurrentTaskFiles = canManageTaskFiles ? canManageTaskFiles(task) : canManageTask;
                    const childTasks = tasksByParent[task.id] || [];
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
                              {childTasks.length > 0 && (
                                <span className="text-[10px] font-black text-secondary uppercase tracking-tighter">
                                  {childTasks.length} sous-tâche{childTasks.length > 1 ? 's' : ''}
                                </span>
                              )}
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
                            {canAttachCurrentTaskFiles && (
                              <button
                                onClick={() => {
                                  setExpandedTasks(prev => ({ ...prev, [task.id]: true }));
                                }}
                                className="p-2 rounded-lg text-theme-muted hover:bg-secondary/10 hover:text-secondary transition-all"
                                title="Fichiers de la tâche"
                              >
                                <Paperclip size={16} />
                              </button>
                            )}
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
                                {(childTasks.length > 0 || (canManageTask && onCreateSubtask)) && (
                                  <div className="rounded-2xl border border-theme-border-subtle/50 bg-theme-surface/40 p-4 space-y-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Sous-tâches réelles</p>
                                        <p className="text-[11px] font-medium text-theme-muted opacity-60">
                                          Travail détaillé avec statut, échéance et progression propres.
                                        </p>
                                      </div>
                                      {canManageTask && onCreateSubtask && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => onCreateSubtask(task)}
                                          className="w-full sm:w-auto"
                                        >
                                          <Plus className="mr-2 h-4 w-4" />
                                          Sous-tâche
                                        </Button>
                                      )}
                                    </div>

                                    {childTasks.length === 0 ? (
                                      <div className="rounded-xl border border-dashed border-theme-border-subtle p-4 text-center text-xs font-bold text-theme-muted opacity-50">
                                        Aucune sous-tâche pour le moment.
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {childTasks.map(childTask => renderSubtaskTree(childTask, 1))}
                                      </div>
                                    )}
                                  </div>
                                )}

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

                                <TaskFilesSection
                                  task={task}
                                  canAttach={canAttachCurrentTaskFiles}
                                  canManage={canManageCurrentTaskFiles}
                                />
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
        canAttachFiles={selectedTaskForDetail ? (canAttachTaskFiles ? canAttachTaskFiles(selectedTaskForDetail) : !readOnly) : false}
        canManageFiles={selectedTaskForDetail ? (canManageTaskFiles ? canManageTaskFiles(selectedTaskForDetail) : !readOnly) : false}
      />
    </div>
  );
}
