// frontend/src/pages/app/views/ListView.tsx
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, FileText, Loader2, Paperclip, Plus, Trash, Upload, UserPlus, CheckCircle, Circle, X, User, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { useAuth } from '../../../contexts/AuthContext';
import { sanitizeApiErrorMessage } from '../../../services/api';
import { MemberAvatar } from '../../../components/ui/MemberAvatar';
import { plannerToolsService } from '../../../services/plannerTools.service';
import { tacheService } from '../../../services/tache.service';
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

const contentModeLabels: Record<string, string> = {
  leaf: 'Libre',
  checklist: 'Mode checklist',
  subtasks: 'Mode sous-tâches',
};

const contentModeClasses: Record<string, string> = {
  leaf: 'bg-theme-surface-hover text-theme-muted border-theme-border-subtle',
  checklist: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  subtasks: 'bg-secondary/10 text-secondary border-secondary/20',
};

interface ListViewProps {
  tasks: Task[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void | Promise<void>;
  onAssignTask: (task: Task) => void;
  onUpdateTaskStatus?: (taskId: string, status: Task['status']) => Promise<void>;
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
  focusTaskId?: string | null;
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

// ✅ Fonction pour récupérer le nom du créateur d'une tâche
const getTaskCreator = (task: Task): { name: string; id: string } | null => {
  if (task.createur) {
    const prenoms = task.createur.prenoms?.trim() || '';
    const nom = task.createur.nom?.trim() || '';
    let name = task.createur.username;
    if (prenoms && nom) name = `${prenoms} ${nom}`;
    else if (prenoms) name = prenoms;
    else if (nom) name = nom;
    return { name, id: task.createur.id };
  }
  const creator = task.assignees?.find(a => a.role === 'Créateur');
  if (creator) {
    return { name: creator.name, id: creator.id };
  }
  return null;
};

// ✅ Fonction pour récupérer le nom du propriétaire d'un fichier
const getOwnerName = (file: TaskFile): string | null => {
  const ownerName = file.meta_donnees?.owner_name;
  const ownerUsername = file.meta_donnees?.owner_username;
  if (ownerName && ownerName.trim()) return ownerName;
  if (ownerUsername) return ownerUsername;
  return null;
};

// ✅ Composant de section de fichiers - SEUL LE PROPRIÉTAIRE PEUT SUPPRIMER
function TaskFilesSection({
  task,
  canAttach,
  showReadOnlyNotice = true,
}: {
  task: Task;
  canAttach: boolean;
  showReadOnlyNotice?: boolean;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<TaskFile | null>(null);

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
          owner_user_id: user?.id,
          owner_username: user?.username,
          owner_name: `${user?.prenoms || ''} ${user?.nom || ''}`.trim() || user?.username,
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

  const canDeleteFile = (file: TaskFile): boolean => {
    const ownerId = file.meta_donnees?.owner_user_id;
    return ownerId === user?.id;
  };

  const handleDelete = async (file: TaskFile) => {
    if (!canDeleteFile(file)) {
      setError("Vous n'êtes pas autorisé à supprimer ce fichier. Seul son propriétaire peut le faire.");
      return;
    }

    setError(null);
    try {
      await plannerToolsService.deleteFile(file.id);
      setFiles(prev => prev.filter(item => item.id !== file.id));
      setFileToDelete(null);
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

      {!canAttach && showReadOnlyNotice && (
        <div className="rounded-xl border border-theme-border-subtle/60 bg-theme-surface-hover/30 px-3 py-2 text-[11px] font-semibold text-theme-muted">
          Lecture seule. Seuls les membres assignés à cette tâche et les gestionnaires de la liste peuvent y joindre des fichiers.
        </div>
      )}

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
            const isOwner = ownerId === user?.id;
            const ownerName = getOwnerName(file);

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
                    {isOwner && (
                      <span className="ml-2 text-[8px] font-black text-primary/60 uppercase tracking-widest">
                        • Vous
                      </span>
                    )}
                    {ownerName && !isOwner && (
                      <span className="ml-2 text-[8px] font-black text-theme-muted/60 uppercase tracking-widest">
                        • Envoyé par {ownerName}
                      </span>
                    )}
                  </p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => setFileToDelete(file)}
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

      <ConfirmModal
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        onConfirm={() => fileToDelete ? handleDelete(fileToDelete) : Promise.resolve()}
        title="Supprimer le fichier"
        message={`Voulez-vous retirer définitivement "${fileToDelete?.nom || 'ce fichier'}" de cette tâche ?`}
        confirmText="Supprimer"
        confirmVariant="danger"
      />
    </div>
  );
}

// Composant de détail d'une tâche
function TaskDetailModal({
  task,
  tasks,
  isOpen,
  onClose,
  onOpenTask,
  onBack,
  canGoBack,
  getTaskProgress,
}: {
  task: Task | null;
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onOpenTask: (task: Task) => void;
  onBack: () => void;
  canGoBack: boolean;
  getTaskProgress: (task: Task) => number;
}) {
  if (!task) return null;

  const progress = getTaskProgress(task);
  const taskChecklists = task.checklists || [];
  const childTasks = tasks.filter(item => item.parentTaskId === task.id);
  const contentMode = task.contentMode || (taskChecklists.length > 0 ? 'checklist' : childTasks.length > 0 ? 'subtasks' : 'leaf');
  const creator = getTaskCreator(task);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Détails de la tâche`} size="lg">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
        {canGoBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-2xl border border-theme-border-subtle bg-theme-surface-hover px-3 py-2 text-xs font-black uppercase tracking-widest text-theme-muted transition-all hover:border-secondary/30 hover:bg-secondary/10 hover:text-secondary"
            title="Revenir à la tâche précédente"
          >
            <ArrowLeft size={15} />
            Retour
          </button>
        )}

        {/* Titre avec créateur */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">Titre de la mission</label>
          <div className="p-4 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${contentModeClasses[contentMode] || contentModeClasses.leaf}`}>
                {contentModeLabels[contentMode] || 'Libre'}
              </span>
              <p className="text-lg font-bold text-theme-main leading-tight">{task.title}</p>
            </div>
            {creator && (
              <Link 
                to={`/users/${creator.id}`}
                className="mt-2 flex items-center gap-2 text-xs text-theme-muted hover:text-primary transition-colors"
              >
                <User size={14} className="opacity-50" />
                <span>Créé par <span className="font-bold hover:underline">{creator.name}</span></span>
              </Link>
            )}
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
                  <MemberAvatar member={assignee} size="xs" />
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

        {/* Sous-tâches */}
        <div className="pt-4 border-t border-theme-border-subtle/30 space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest opacity-60">Sous-tâches</label>
            <span className="text-[10px] font-black text-theme-muted opacity-40">
              {childTasks.length}
            </span>
          </div>

          {childTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-theme-border-subtle p-4 text-center text-xs font-bold text-theme-muted opacity-50">
              Aucune sous-tâche pour cette tâche.
            </div>
          ) : (
            <div className="space-y-2">
              {childTasks.map(childTask => {
                const childProgress = getTaskProgress(childTask);
                const childCreator = getTaskCreator(childTask);
                return (
                  <button
                    key={childTask.id}
                    type="button"
                    onClick={() => onOpenTask(childTask)}
                    className="w-full rounded-2xl border border-theme-border-subtle/40 bg-theme-surface/40 p-3 text-left transition-all hover:border-secondary/30 hover:bg-theme-surface-hover"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${childTask.status === 'terminé'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-secondary/10 text-secondary'
                        }`}>
                        {childTask.status === 'terminé' ? <CheckCircle size={18} /> : <FileText size={17} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-black ${childTask.status === 'terminé'
                            ? 'line-through text-theme-muted opacity-60'
                            : 'text-theme-main'
                          }`}>
                          {childTask.title}
                        </p>
                        {childCreator && (
                          <Link 
                            to={`/users/${childCreator.id}`}
                            className="mt-0.5 flex items-center gap-1 text-[9px] text-theme-muted hover:text-primary transition-colors"
                          >
                            <span className="opacity-50">Créé par</span>
                            <span className="font-bold hover:underline">{childCreator.name}</span>
                          </Link>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${priorityColors[childTask.priority]}`}>
                            {priorityLabels[childTask.priority]}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-tighter text-theme-muted opacity-50">
                            {statusLabels[childTask.status] || childTask.status}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-tighter text-secondary">
                            {childProgress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <TaskFilesSection
          task={task}
          canAttach={false}
          showReadOnlyNotice={false}
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
  onEditTask,
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
  focusTaskId = null,
}: ListViewProps) {
  const { user } = useAuth();
  const [expandedStatus, setExpandedStatus] = useState<Record<string, boolean>>({
    'en attente': true,
    'en cours': true,
    terminé: false,
    bloqué: false,
  });
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [detailTaskHistory, setDetailTaskHistory] = useState<Task[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [addingChecklistTaskId, setAddingChecklistTaskId] = useState<string | null>(null);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmer',
    onConfirm: () => { },
  });

  // === États pour l'édition ===
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    titre: string;
    description: string;
    date_fin_prevue: string;
    priorite: string;
  }>({
    titre: '',
    description: '',
    date_fin_prevue: '',
    priorite: 'moyenne',
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const taskHasChildren = (taskId: string) => tasks.some(task => task.parentTaskId === taskId);
  const getTaskMode = (task: Task) => task.contentMode || ((task.checklists || []).length > 0 ? 'checklist' : taskHasChildren(task.id) ? 'subtasks' : 'leaf');
  const canTaskReceiveChecklist = (task: Task) => task.canAddChecklist ?? getTaskMode(task) !== 'subtasks';
  const canTaskReceiveSubtask = (task: Task) => task.canAddSubtask ?? getTaskMode(task) !== 'checklist';

  const toggleStatus = (status: string) => {
    setExpandedStatus(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const openTaskDetail = (task: Task) => {
    setDetailTaskHistory([]);
    setSelectedTaskForDetail(task);
    setIsDetailModalOpen(true);
  };

  const openNestedTaskDetail = (task: Task) => {
    setDetailTaskHistory(prev => selectedTaskForDetail ? [...prev, selectedTaskForDetail] : prev);
    setSelectedTaskForDetail(task);
    setIsDetailModalOpen(true);
  };

  const goBackInTaskDetail = () => {
    const previousTask = detailTaskHistory[detailTaskHistory.length - 1];
    if (!previousTask) return;
    setSelectedTaskForDetail(previousTask);
    setDetailTaskHistory(prev => prev.slice(0, -1));
  };

  const closeTaskDetail = () => {
    setIsDetailModalOpen(false);
    setDetailTaskHistory([]);
  };

  const toggleTaskOpen = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const startAddingChecklist = (taskId: string) => {
    const targetTask = tasks.find(task => task.id === taskId);
    if (targetTask && !canTaskReceiveChecklist(targetTask)) {
      setActionError("Cette tâche contient déjà des sous-tâches. Vous ne pouvez pas y ajouter de checklist au même niveau.");
      return;
    }
    setExpandedTasks(prev => ({ ...prev, [taskId]: true }));
    setAddingChecklistTaskId(taskId);
    setNewChecklistText('');
    setActionError(null);
  };

  const handleAddChecklist = async (taskId: string) => {
    if (!onAddChecklist || !newChecklistText.trim()) return;
    const targetTask = tasks.find(task => task.id === taskId);
    if (targetTask && !canTaskReceiveChecklist(targetTask)) {
      setActionError("Cette tâche contient déjà des sous-tâches. Vous ne pouvez pas y ajouter de checklist au même niveau.");
      return;
    }
    const normalizedText = newChecklistText.trim().toLowerCase();
    const hasDuplicateChecklist = (targetTask?.checklists || []).some(checklist =>
      checklist.texte.trim().toLowerCase() === normalizedText
    );
    if (hasDuplicateChecklist) {
      setActionError("Cette tâche contient déjà une checklist portant exactement ce nom. Choisissez un autre nom.");
      return;
    }

    setActionLoading(`add-checklist-${taskId}`);
    setActionError(null);
    try {
      await onAddChecklist(taskId, newChecklistText);
      setNewChecklistText('');
      setAddingChecklistTaskId(null);
      setExpandedTasks(prev => ({ ...prev, [taskId]: true }));
    } catch (err: unknown) {
      setActionError(sanitizeApiErrorMessage(err, "Impossible d'ajouter cette checklist."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleChecklist = async (taskId: string, checklistId: string, currentChecked: boolean) => {
    if (!onToggleChecklist) return;
    setActionLoading(`toggle-checklist-${checklistId}`);
    setActionError(null);
    try {
      await onToggleChecklist(taskId, checklistId, currentChecked);
      setExpandedTasks(prev => ({ ...prev, [taskId]: true }));
    } catch (err: unknown) {
      setActionError(sanitizeApiErrorMessage(err, 'Impossible de modifier cette checklist.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    if (!onUpdateTaskStatus || task.status === 'terminé') return;
    setActionLoading(`complete-task-${task.id}`);
    setActionError(null);
    try {
      await onUpdateTaskStatus(task.id, 'terminé');
      setExpandedTasks(prev => ({ ...prev, [task.id]: true }));
    } catch (err: unknown) {
      setActionError(sanitizeApiErrorMessage(
        err,
        task.parentTaskId
          ? 'Impossible de marquer cette sous-tâche comme terminée.'
          : 'Impossible de marquer cette tâche comme terminée.'
      ));
    } finally {
      setActionLoading(null);
    }
  };

  const requestDeleteTask = (task: Task) => {
    const isSubtask = Boolean(task.parentTaskId);
    const childCount = tasks.filter(item => item.parentTaskId === task.id).length;
    const checklistCount = task.checklists?.length || 0;
    const details = [
      childCount > 0 ? `${childCount} sous-tâche${childCount > 1 ? 's' : ''}` : null,
      checklistCount > 0 ? `${checklistCount} checklist${checklistCount > 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' et ');

    setConfirmAction({
      isOpen: true,
      title: isSubtask ? 'Supprimer la sous-tâche' : 'Supprimer la tâche',
      message: details
        ? `Voulez-vous vraiment supprimer « ${task.title} » ? Cette action supprimera aussi ${details}.`
        : `Voulez-vous vraiment supprimer « ${task.title} » ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      onConfirm: async () => {
        setActionLoading(`delete-task-${task.id}`);
        setActionError(null);
        try {
          await onDeleteTask(task.id);
        } catch (err: unknown) {
          setActionError(sanitizeApiErrorMessage(err, isSubtask ? 'Impossible de supprimer cette sous-tâche.' : 'Impossible de supprimer cette tâche.'));
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const requestDeleteChecklist = (taskId: string, checklistId: string, checklistText: string) => {
    if (!onDeleteChecklist) return;
    setConfirmAction({
      isOpen: true,
      title: 'Supprimer la checklist',
      message: `Voulez-vous vraiment supprimer « ${checklistText} » ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      onConfirm: async () => {
        await handleDeleteChecklist(taskId, checklistId);
      },
    });
  };

  const handleDeleteChecklist = async (taskId: string, checklistId: string) => {
    if (!onDeleteChecklist) return;
    setActionLoading(`delete-checklist-${checklistId}`);
    setActionError(null);
    try {
      await onDeleteChecklist(taskId, checklistId);
      setExpandedTasks(prev => ({ ...prev, [taskId]: true }));
    } catch (err: unknown) {
      setActionError(sanitizeApiErrorMessage(err, 'Impossible de supprimer cette checklist.'));
    } finally {
      setActionLoading(null);
    }
  };

  // === Gestion de l'ouverture du modal d'édition ===
  const openEditModal = (task: Task) => {
    if (!canEditTask || !canEditTask(task)) {
      setActionError("Vous n'avez pas les droits pour modifier cette tâche.");
      return;
    }
    setEditingTask(task);
    setEditFormData({
      titre: task.title || '',
      description: task.description || '',
      date_fin_prevue: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
      priorite: task.priority || 'moyenne',
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  // === Soumission du formulaire d'édition ===
  const handleEditSubmit = async () => {
    if (!editingTask) return;
    setEditError(null);
    setEditLoading(true);

    const { titre, date_fin_prevue } = editFormData;
    if (!titre.trim()) {
      setEditError('Le titre est obligatoire.');
      setEditLoading(false);
      return;
    }

    // Vérification d'unicité du titre au même niveau
    const sameLevelTasks = tasks.filter(t =>
      t.id !== editingTask.id &&
      t.parentTaskId === editingTask.parentTaskId &&
      t.listId === editingTask.listId
    );
    if (sameLevelTasks.some(t => t.title.trim().toLowerCase() === titre.trim().toLowerCase())) {
      setEditError('Une tâche du même niveau porte déjà ce nom. Veuillez choisir un autre titre.');
      setEditLoading(false);
      return;
    }

    try {
      const payload: any = {
        titre: titre.trim(),
        description: editFormData.description.trim() || null,
        priorite: editFormData.priorite,
      };
      if (date_fin_prevue) {
        payload.date_fin_prevue = new Date(date_fin_prevue).toISOString();
      } else {
        payload.date_fin_prevue = null;
      }
      const updated = await tacheService.update(editingTask.id, payload);
      onEditTask(updated);
      setIsEditModalOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      const msg = sanitizeApiErrorMessage(err, 'Erreur lors de la modification de la tâche.');
      setEditError(msg);
    } finally {
      setEditLoading(false);
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

  const topLevelTasks = focusTaskId
    ? filteredTasks.filter(task => task.id === focusTaskId)
    : filteredTasks.filter(task => !task.parentTaskId);

  const groupedTasks = Object.keys(statusLabels).reduce((acc, status) => {
    acc[status] = topLevelTasks.filter(t => t.status === status);
    return acc;
  }, {} as Record<string, Task[]>);

  const renderSubtaskTree = (task: Task, depth = 1) => {
    const taskChecklists = task.checklists || [];
    const childTasks = tasksByParent[task.id] || [];
    const isTaskExpanded = !!expandedTasks[task.id];
    const canOperateTask = canEditTask ? canEditTask(task) : !readOnly;
    const canDeleteCurrentTask = canDeleteTask ? canDeleteTask(task) : !readOnly;
    const canAssignCurrentTask = canAssignTask ? canAssignTask(task) : !readOnly;
    const canAttachCurrentTaskFiles = canAttachTaskFiles ? canAttachTaskFiles(task) : canOperateTask;
    const checklistSummary = taskChecklists.length > 0
      ? `${taskChecklists.filter(c => c.is_checked).length}/${taskChecklists.length}`
      : '0';
    const progress = getTaskProgress(task);
    const contentMode = getTaskMode(task);
    const canAddChecklistHere = canOperateTask && !!onAddChecklist && canTaskReceiveChecklist(task);
    const canAddSubtaskHere = canOperateTask && !!onCreateSubtask && canTaskReceiveSubtask(task);
    const isSubtaskMode = contentMode === 'subtasks';
    const isChecklistMode = contentMode === 'checklist';
    const structureSummary = isSubtaskMode
      ? `${childTasks.length} sous-tâche${childTasks.length > 1 ? 's' : ''}`
      : `Checklists ${checklistSummary}`;
    const creator = getTaskCreator(task);

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
              if (canOperateTask) {
                handleCompleteTask(task);
              }
            }}
            disabled={!canOperateTask || !onUpdateTaskStatus || task.status === 'terminé' || actionLoading === `complete-task-${task.id}`}
            className={`h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center transition-all disabled:cursor-not-allowed ${task.status === 'terminé' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-theme-surface-hover text-theme-muted hover:bg-secondary/10 hover:text-secondary disabled:opacity-50'}`}
            title={task.status === 'terminé' ? 'Sous-tâche terminée' : 'Marquer la sous-tâche comme terminée'}
          >
            {actionLoading === `complete-task-${task.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : task.status === 'terminé' ? <CheckCircle size={18} /> : <Circle size={18} />}
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
              <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${contentModeClasses[contentMode] || contentModeClasses.leaf}`}>
                {contentModeLabels[contentMode] || 'Libre'}
              </span>
              <h4 className={`text-sm font-black tracking-tight ${task.status === 'terminé' ? 'line-through text-theme-muted opacity-60' : 'text-theme-main'}`}>
                {task.title}
              </h4>
            </div>
            {creator && (
              <Link 
                to={`/users/${creator.id}`}
                className="mb-1 flex items-center gap-1 text-[9px] text-theme-muted hover:text-primary transition-colors"
              >
                <span className="opacity-50">Créé par</span>
                <span className="font-bold hover:underline">{creator.name}</span>
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border ${priorityColors[task.priority]}`}>
                {priorityLabels[task.priority]}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${isSubtaskMode ? 'text-secondary' : 'text-theme-muted opacity-50'}`}>
                {structureSummary}
              </span>
              <span className="text-[10px] font-black uppercase tracking-tighter text-theme-muted opacity-50">
                {progress}%
              </span>
            </div>
          </div>

          <div className="flex items-center -space-x-2">
            {task.assignees.slice(0, 3).map((a, i) => (
              <MemberAvatar key={i} member={a} size="xs" className="border-2 border-theme-border-subtle shadow-sm" />
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
                onClick={() => requestDeleteTask(task)}
                disabled={actionLoading === `delete-task-${task.id}`}
                className="rounded-lg p-2 text-theme-muted transition-all hover:bg-red-500/10 hover:text-red-500"
                title="Supprimer la sous-tâche"
              >
                {actionLoading === `delete-task-${task.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash size={15} />}
              </button>
            )}
            {canOperateTask && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(task);
                }}
                className="rounded-lg p-2 text-theme-muted transition-all hover:bg-secondary/10 hover:text-secondary"
                title="Modifier la sous-tâche"
              >
                <Edit size={15} />
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
                {isChecklistMode && canOperateTask && onCreateSubtask && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-500">
                    Sous-tâches indisponibles : cette tâche contient déjà des checklists.
                  </div>
                )}

                {!isChecklistMode && (childTasks.length > 0 || canAddSubtaskHere) && (
                  <div className="rounded-2xl border border-theme-border-subtle/50 bg-theme-surface/40 p-4 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Sous-tâches</p>
                        <p className="text-[11px] font-medium text-theme-muted opacity-60">Même structure, mêmes responsabilités, avec un niveau hiérarchique supplémentaire.</p>
                      </div>
                      {canAddSubtaskHere && (
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

                {isSubtaskMode && canOperateTask && onAddChecklist && (
                  <div className="rounded-xl border border-secondary/20 bg-secondary/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-secondary">
                    Checklists indisponibles : cette tâche contient déjà des sous-tâches.
                  </div>
                )}

                {!isSubtaskMode && (
                  <>
                    {(taskChecklists.length > 0 || addingChecklistTaskId === task.id) && (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Checklists de la sous-tâche</p>
                          <p className="text-[11px] font-medium text-theme-muted opacity-60">Points de contrôle propres à cette sous-tâche.</p>
                        </div>
                        <span className="rounded-lg bg-theme-surface-hover px-2 py-1 text-[10px] font-black text-theme-main border border-theme-border-subtle">
                          {checklistSummary}
                        </span>
                      </div>
                    )}

                    {taskChecklists.map((checklist) => (
                      <div key={checklist.id} className="flex items-center gap-3 rounded-xl border border-theme-border-subtle/40 bg-theme-surface/40 px-3 py-2 group/checklist">
                        <button
                          onClick={() => canOperateTask && handleToggleChecklist(task.id, checklist.id, checklist.is_checked)}
                          disabled={!canOperateTask || actionLoading === `toggle-checklist-${checklist.id}`}
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
                        {canDeleteCurrentTask && onDeleteChecklist && (
                          <button
                            onClick={() => requestDeleteChecklist(task.id, checklist.id, checklist.texte)}
                            disabled={actionLoading === `delete-checklist-${checklist.id}`}
                            className="rounded-lg p-1.5 text-theme-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover/checklist:opacity-100 disabled:opacity-50"
                            title="Supprimer la checklist"
                          >
                            {actionLoading === `delete-checklist-${checklist.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash size={14} />}
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {canAddChecklistHere && (
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
      {actionError && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500 shadow-theme-sm">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="rounded-lg p-1 text-red-500/70 transition hover:bg-red-500/10 hover:text-red-500"
            title="Fermer"
          >
            <X size={15} />
          </button>
        </div>
      )}
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
                    const canOperateTask = canEditTask ? canEditTask(task) : !readOnly;
                    const canDeleteCurrentTask = canDeleteTask ? canDeleteTask(task) : !readOnly;
                    const canAssignCurrentTask = canAssignTask ? canAssignTask(task) : !readOnly;
                    const canAttachCurrentTaskFiles = canAttachTaskFiles ? canAttachTaskFiles(task) : canOperateTask;
                    const childTasks = tasksByParent[task.id] || [];
                    const progress = getTaskProgress(task);
                    const checklistSummary = taskChecklists.length > 0
                      ? `${taskChecklists.filter(c => c.is_checked).length}/${taskChecklists.length}`
                      : '0';
                    const contentMode = getTaskMode(task);
                    const canAddChecklistHere = canOperateTask && !!onAddChecklist && canTaskReceiveChecklist(task);
                    const canAddSubtaskHere = canOperateTask && !!onCreateSubtask && canTaskReceiveSubtask(task);
                    const isSubtaskMode = contentMode === 'subtasks';
                    const isChecklistMode = contentMode === 'checklist';
                    const structureSummary = isSubtaskMode
                      ? `${childTasks.length} sous-tâche${childTasks.length > 1 ? 's' : ''}`
                      : `Checklists ${checklistSummary}`;
                    const creator = getTaskCreator(task);

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
                              if (canOperateTask) {
                                handleCompleteTask(task);
                              }
                            }}
                            disabled={!canOperateTask || !onUpdateTaskStatus || task.status === 'terminé' || actionLoading === `complete-task-${task.id}`}
                            className={`h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all disabled:cursor-not-allowed ${task.status === 'terminé' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-theme-surface-hover text-theme-muted group-hover:text-secondary group-hover:bg-secondary/10 hover:bg-secondary/20 disabled:opacity-50'}`}
                            title={task.status === 'terminé' ? 'Tâche terminée' : 'Marquer comme terminée'}
                          >
                            {actionLoading === `complete-task-${task.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : task.status === 'terminé' ? <CheckCircle size={20} /> : <Circle size={20} />}
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
                            {creator && (
                              <Link 
                                to={`/users/${creator.id}`}
                                className="mb-1 flex items-center gap-1 text-[10px] text-theme-muted hover:text-primary transition-colors"
                              >
                                <User size={12} className="opacity-50" />
                                <span className="opacity-50">Créé par</span>
                                <span className="font-bold hover:underline">{creator.name}</span>
                              </Link>
                            )}
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border ${contentModeClasses[contentMode] || contentModeClasses.leaf}`}>
                                {contentModeLabels[contentMode] || 'Libre'}
                              </span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border ${priorityColors[task.priority]}`}>
                                {priorityLabels[task.priority]}
                              </span>
                              <span className={`text-[10px] font-black uppercase tracking-tighter ${isSubtaskMode ? 'text-secondary' : 'text-theme-muted opacity-50'}`}>
                                {structureSummary}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-tighter text-theme-muted opacity-50">
                                {progress}%
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
                              <MemberAvatar key={i} member={a} size="xs" className="border-2 border-theme-border-subtle shadow-sm" />
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
                                onClick={() => requestDeleteTask(task)}
                                disabled={actionLoading === `delete-task-${task.id}`}
                                className="p-2 rounded-lg text-theme-muted hover:bg-red-500/10 hover:text-red-500 transition-all"
                                title="Supprimer"
                              >
                                {actionLoading === `delete-task-${task.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash size={16} />}
                              </button>
                            )}
                            {canOperateTask && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(task);
                                }}
                                className="p-2 rounded-lg text-theme-muted hover:bg-secondary/10 hover:text-secondary transition-all"
                                title="Modifier"
                              >
                                <Edit size={16} />
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
                                {isChecklistMode && canOperateTask && onCreateSubtask && (
                                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-500">
                                    Sous-tâches indisponibles : cette tâche contient déjà des checklists.
                                  </div>
                                )}

                                {!isChecklistMode && (childTasks.length > 0 || canAddSubtaskHere) && (
                                  <div className="rounded-2xl border border-theme-border-subtle/50 bg-theme-surface/40 p-4 space-y-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Sous-tâches réelles</p>
                                        <p className="text-[11px] font-medium text-theme-muted opacity-60">
                                          Travail détaillé avec statut, échéance et progression propres.
                                        </p>
                                      </div>
                                      {canAddSubtaskHere && (
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

                                {isSubtaskMode && canOperateTask && onAddChecklist && (
                                  <div className="rounded-xl border border-secondary/20 bg-secondary/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-secondary">
                                    Checklists indisponibles : cette tâche contient déjà des sous-tâches.
                                  </div>
                                )}

                                {!isSubtaskMode && (
                                  <>
                                    {(taskChecklists.length > 0 || addingChecklistTaskId === task.id) && (
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Checklists de la tâche</p>
                                          <p className="text-[11px] font-medium text-theme-muted opacity-60">Suivez les points terminés. La suppression reste réservée aux gestionnaires.</p>
                                        </div>
                                        <span className="rounded-lg bg-theme-surface-hover px-2 py-1 text-[10px] font-black text-theme-main border border-theme-border-subtle">
                                          {checklistSummary}
                                        </span>
                                      </div>
                                    )}

                                    {taskChecklists.map((checklist) => (
                                      <div key={checklist.id} className="flex items-center gap-3 rounded-xl border border-theme-border-subtle/40 bg-theme-surface/40 px-3 py-2 group/checklist">
                                        <button
                                          onClick={() => canOperateTask && handleToggleChecklist(task.id, checklist.id, checklist.is_checked)}
                                          disabled={!canOperateTask || actionLoading === `toggle-checklist-${checklist.id}`}
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
                                        {canDeleteCurrentTask && onDeleteChecklist && (
                                          <button
                                            onClick={() => requestDeleteChecklist(task.id, checklist.id, checklist.texte)}
                                            disabled={actionLoading === `delete-checklist-${checklist.id}`}
                                            className="rounded-lg p-1.5 text-theme-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover/checklist:opacity-100 disabled:opacity-50"
                                            title="Supprimer la checklist"
                                          >
                                            {actionLoading === `delete-checklist-${checklist.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash size={14} />}
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </>
                                )}

                                {canAddChecklistHere && (
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
        tasks={tasks}
        isOpen={isDetailModalOpen}
        onClose={closeTaskDetail}
        onOpenTask={openNestedTaskDetail}
        onBack={goBackInTaskDetail}
        canGoBack={detailTaskHistory.length > 0}
        getTaskProgress={getTaskProgress}
      />

      <ConfirmModal
        isOpen={confirmAction.isOpen}
        onClose={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmAction.onConfirm}
        title={confirmAction.title}
        message={confirmAction.message}
        confirmText={confirmAction.confirmText}
        cancelText="Annuler"
        confirmVariant="danger"
        isLoading={actionLoading?.startsWith('delete-') || false}
      />

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingTask(null); setEditError(null); }}
        title={`Modifier la tâche`}
        size="md"
      >
        <div className="space-y-4 py-2">
          {editError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-500">
              {editError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted ml-1">Titre *</label>
            <input
              type="text"
              value={editFormData.titre}
              onChange={(e) => setEditFormData(prev => ({ ...prev, titre: e.target.value }))}
              className="w-full rounded-xl border border-theme-border-subtle bg-theme-surface px-3 py-2 text-sm font-medium text-theme-main outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Titre de la tâche"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted ml-1">Description</label>
            <textarea
              value={editFormData.description}
              onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-xl border border-theme-border-subtle bg-theme-surface px-3 py-2 text-sm font-medium text-theme-main outline-none focus:ring-2 focus:ring-secondary/20 resize-none"
              rows={3}
              placeholder="Description détaillée"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted ml-1">Échéance</label>
            <input
              type="datetime-local"
              value={editFormData.date_fin_prevue}
              onChange={(e) => setEditFormData(prev => ({ ...prev, date_fin_prevue: e.target.value }))}
              className="w-full rounded-xl border border-theme-border-subtle bg-theme-surface px-3 py-2 text-sm font-medium text-theme-main outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted ml-1">Priorité</label>
            <select
              value={editFormData.priorite}
              onChange={(e) => setEditFormData(prev => ({ ...prev, priorite: e.target.value }))}
              className="w-full rounded-xl border border-theme-border-subtle bg-theme-surface px-3 py-2 text-sm font-medium text-theme-main outline-none focus:ring-2 focus:ring-secondary/20"
            >
              <option value="basse">Basse</option>
              <option value="moyenne">Moyenne</option>
              <option value="haute">Haute</option>
              <option value="critique">Critique</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => { setIsEditModalOpen(false); setEditingTask(null); setEditError(null); }}
              className="rounded-xl font-bold"
            >
              Annuler
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={editLoading}
              className="rounded-xl font-bold"
            >
              {editLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}