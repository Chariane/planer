// frontend/src/pages/app/modals/TaskFormModal.tsx
import { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
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
}

export default function TaskFormModal({
  isOpen,
  onClose,
  editingTask,
  onSubmit,
  limitedOperational = false,
  submitError = null,
  parentTask = null,
}: TaskFormModalProps) {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTask ? "Modifier la tâche" : parentTask ? `Nouvelle sous-tâche de ${parentTask.title}` : "Nouvelle tâche"}
      size="lg"
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto px-1">
        {(submitError || actionError) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {submitError || actionError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Implémenter l'authentification"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={!canEditTaskFields}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            placeholder="Décrivez la tâche en détail..."
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={!canEditTaskFields}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              disabled={!canEditTaskFields}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin prévue</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              max={parentDueDate || undefined}
              disabled={!canEditTaskFields}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
            />
            {parentDueDate && (
              <p className="mt-1 text-xs text-gray-400">
                La sous-tâche doit se terminer au plus tard le {parentDueDate}.
              </p>
            )}
          </div>
        </div>

        {editingTask && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as Task['status'])}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as Task['priority'])}
            disabled={!canEditTaskFields}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
          >
            {priorityOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit}>{editingTask ? "Enregistrer" : "Créer"}</Button>
        </div>
      </div>
    </Modal>
  );
}
