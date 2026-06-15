// frontend/src/pages/app/modals/TaskFormModal.tsx
import { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { CheckCircle, Circle, Plus, Trash, UserPlus, GitBranch, LayoutGrid, Clock, AlertTriangle } from 'lucide-react';
import type { Task, Member } from '../../../types';

const statusOptions = [
  { value: 'en attente', label: 'En attente' },
  { value: 'en cours', label: 'En cours' },
  { value: 'terminé', label: 'Terminée' },
  { value: 'bloqué', label: 'Bloquée' },
];

const priorityOptions = [
  { value: 'basse', label: 'Basse' },
  { value: 'moyenne', label: 'Moyenne' },
  { value: 'haute', label: 'Haute' },
  { value: 'critique', label: 'Critique' },
];

interface TaskChecklist {
  id: string;
  texte: string;
  is_checked: boolean;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTask: Task | null;
  members: Member[];
  checklists: TaskChecklist[];
  checklistLoading: string | null;
  onAddChecklist: (texte: string) => Promise<void>;
  onToggleChecklist: (checklistId: string, currentChecked: boolean) => Promise<void>;
  onUpdateChecklistText: (checklistId: string, newText: string) => Promise<void>;
  onDeleteChecklist: (checklistId: string) => Promise<void>;
  onSubmit: (data: any) => Promise<void>;
  limitedOperational?: boolean;
  submitError?: string | null;
  parentTask?: Task | null;
  onAssignMemberTrigger?: () => void;
  tasks?: Task[]; // Pour les sous-tâches
}

export default function TaskFormModal({
  isOpen,
  onClose,
  editingTask,
  onAddChecklist,
  onToggleChecklist,
  // onUpdateChecklistText,
  onDeleteChecklist,
  onSubmit,
  limitedOperational = false,
  submitError = null,
  parentTask = null,
  onAssignMemberTrigger,
  tasks = [],
}: TaskFormModalProps) {
  const [newChecklistText, setNewChecklistText] = useState('');
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const canEditTaskFields = !limitedOperational;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(getTodayDate());
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<Task['status']>('en attente');
  const [priority, setPriority] = useState<Task['priority']>('moyenne');
  const [actionError, setActionError] = useState<string | null>(null);

  const parentDueDate = parentTask?.dueDate || '';

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setStartDate(editingTask.startDate || getTodayDate());
      setDueDate(editingTask.dueDate || '');
      setStatus(editingTask.status);
      setPriority(editingTask.priority);
    } else {
      setTitle('');
      setDescription('');
      setStartDate(getTodayDate());
      setDueDate('');
      setStatus('en attente');
      setPriority('moyenne');
    }
    setActionError(null);
  }, [editingTask, isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    if (parentDueDate && dueDate && dueDate > parentDueDate) {
      setActionError(`La date de fin d'une sous-tâche ne peut pas dépasser celle de sa tâche parent (${parentDueDate}).`);
      return;
    }
    await onSubmit({
      title,
      description,
      startDate,
      dueDate,
      status,
      priority,
    });
  };

  const handleAddChecklist = async () => {
    if (!newChecklistText.trim()) return;
    await onAddChecklist(newChecklistText.trim());
    setNewChecklistText('');
  };

  const childTasks = tasks.filter(t => t.parentTaskId === editingTask?.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTask ? "Modifier la tâche" : parentTask ? `Nouvelle sous-tâche de ${parentTask.title}` : "Nouvelle tâche"}
      size="lg"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-theme-border-subtle scrollbar-track-transparent">
        {(submitError || actionError) && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">
            {submitError || actionError}
          </div>
        )}

        {/* Section Titre & Mode */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">
              Titre de la mission <span className="text-red-500">*</span>
            </label>
            {editingTask && (
              <div className="flex items-center gap-1.5 bg-theme-surface-hover/50 px-2 py-0.5 rounded-lg border border-theme-border-subtle/30">
                <LayoutGrid className="h-3 w-3 text-secondary" />
                <span className="text-[9px] font-black uppercase tracking-tighter text-theme-muted">ID: {editingTask.id.slice(0, 8)}</span>
              </div>
            )}
          </div>
          <input
            type="text"
            placeholder="Ex: Implémenter l'authentification"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={!canEditTaskFields}
            className="w-full p-3 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl text-base font-bold text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-theme-muted/30"
            autoFocus
          />
        </div>

        {/* Équipe assignée */}
        {editingTask && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest opacity-60">Équipe assignée</label>
              <Button
                variant="outline"
                size="sm"
                onClick={onAssignMemberTrigger}
                className="h-7 border-secondary/30 text-secondary hover:bg-secondary hover:text-white px-3 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all"
              >
                <UserPlus className="h-3 w-3 mr-1.5" />
                Gérer l'équipe
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[42px] p-2 bg-theme-surface/30 border border-dashed border-theme-border-subtle rounded-2xl">
              {editingTask.assignees.length > 0 ? (
                editingTask.assignees.map(assignee => (
                  <div key={assignee.id} className="inline-flex items-center gap-2 px-2.5 py-1 bg-theme-surface border border-theme-border-subtle rounded-xl shadow-sm group">
                    <div className="h-5 w-5 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center text-[9px] font-black">
                      {assignee.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-theme-main">{assignee.name}</span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-theme-muted italic m-auto opacity-50">Aucun membre assigné pour le moment</p>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">Objectifs & Détails</label>
          <textarea
            placeholder="Décrivez la mission en détail pour l'équipe..."
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={!canEditTaskFields}
            className="w-full p-3 bg-theme-surface/30 border border-theme-border-subtle rounded-2xl text-sm leading-relaxed text-theme-muted focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-theme-muted/20 resize-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">Date de début</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted opacity-40 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={!canEditTaskFields}
                className="w-full pl-10 pr-3 py-2.5 bg-theme-surface/50 border border-theme-border-subtle rounded-xl text-sm font-bold text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">Échéance prévue</label>
            <div className="relative">
              <AlertTriangle className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40 pointer-events-none ${dueDate ? 'text-secondary' : 'text-theme-muted'}`} />
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                max={parentDueDate || undefined}
                disabled={!canEditTaskFields}
                className="w-full pl-10 pr-3 py-2.5 bg-theme-surface/50 border border-theme-border-subtle rounded-xl text-sm font-bold text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
              />
            </div>
            {parentDueDate && (
              <p className="mt-1 text-[10px] font-black uppercase text-amber-500 tracking-tighter text-center">
                Au plus tard le {parentDueDate}
              </p>
            )}
          </div>
        </div>

        {/* État et Priorité */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {editingTask && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">État actuel</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Task['status'])}
                className="w-full p-2.5 bg-theme-surface/50 border border-theme-border-subtle rounded-xl text-sm font-bold text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-60">Niveau de Priorité</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as Task['priority'])}
              disabled={!canEditTaskFields}
              className="w-full p-2.5 bg-theme-surface/50 border border-theme-border-subtle rounded-xl text-sm font-bold text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
            >
              {priorityOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Checklists (Individuel View) */}
        {editingTask && (
          <div className="pt-4 border-t border-theme-border-subtle/30 space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest opacity-60">Points de contrôle (Checklist)</label>
              <span className="text-[10px] font-black text-theme-muted opacity-40">
                {(editingTask?.checklists || []).filter(c => c.is_checked).length}/{(editingTask?.checklists || []).length}
              </span>
            </div>

            {/* Liste des items */}
            <div className="space-y-2">
              {(editingTask?.checklists || []).map((checklist) => (
                <div key={checklist.id} className="flex items-center gap-3 p-3 bg-theme-surface/20 rounded-xl border border-theme-border-subtle/30 group hover:border-theme-border-subtle transition-all">
                  <button
                    onClick={() => onToggleChecklist(checklist.id, checklist.is_checked)}
                    className="shrink-0 transition-transform active:scale-95"
                  >
                    {checklist.is_checked ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-theme-border-strong opacity-40 hover:opacity-100" />
                    )}
                  </button>
                  <span className={`text-sm flex-1 tracking-tight ${checklist.is_checked ? 'line-through text-theme-muted opacity-40' : 'text-theme-main font-bold'}`}>
                    {checklist.texte}
                  </span>
                  <button
                    onClick={() => onDeleteChecklist(checklist.id)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 text-theme-muted hover:text-red-500 transition-all"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Ajout d'item */}
            <div className="relative">
              <input
                type="text"
                placeholder="Nouveau point de contrôle..."
                value={newChecklistText}
                onChange={e => setNewChecklistText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddChecklist()}
                className="w-full pl-3 pr-10 py-2.5 bg-theme-surface/40 border border-theme-border-subtle rounded-xl text-sm text-theme-main focus:ring-1 focus:ring-secondary/20 outline-none transition-all placeholder:text-theme-muted/30"
              />
              <button
                onClick={handleAddChecklist}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-all shadow-theme-sm"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Sous-tâches (Aperçu) */}
        {editingTask && childTasks.length > 0 && (
          <div className="pt-4 border-t border-theme-border-subtle/30 space-y-3">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest px-1 opacity-60 flex items-center gap-2">
              <GitBranch className="h-3 w-3" /> Sous-tâches dépendantes ({childTasks.length})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {childTasks.map(child => (
                <div key={child.id} className="flex items-center gap-3 p-2.5 bg-theme-surface/40 border border-theme-border-subtle/30 rounded-xl">
                  <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${child.status === 'terminé' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-theme-surface text-theme-muted'}`}>
                    {child.status === 'terminé' ? <CheckCircle size={14} /> : <Circle size={14} />}
                  </div>
                  <span className={`text-[11px] font-bold truncate ${child.status === 'terminé' ? 'line-through text-theme-muted opacity-40' : 'text-theme-main'}`}>
                    {child.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t border-theme-border-subtle/10">
          <Button variant="outline" className="px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={onClose}>Annuler</Button>
          <Button className="px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-secondary/20 shadow-lg" onClick={handleSubmit}>
            {editingTask ? "Mettre à jour" : "Lancer la mission"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
