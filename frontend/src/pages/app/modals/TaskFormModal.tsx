// frontend/src/pages/app/modals/TaskFormModal.tsx
import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Edit, Loader2, Plus, Trash, X } from 'lucide-react';
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
}

export default function TaskFormModal({
  isOpen,
  onClose,
  editingTask,
  members,
  checklists,
  checklistLoading,
  onAddChecklist,
  onToggleChecklist,
  onUpdateChecklistText,
  onDeleteChecklist,
  onSubmit,
  limitedOperational = false,
}: TaskFormModalProps) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const canEditTaskFields = !limitedOperational;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(getTodayDate());
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<Task['status']>('en attente');
  const [priority, setPriority] = useState<Task['priority']>('moyenne');
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setStartDate(editingTask.startDate || getTodayDate());
      setDueDate(editingTask.dueDate || '');
      setStatus(editingTask.status);
      setPriority(editingTask.priority);
      setAssignedMemberIds(editingTask.assignees.map(a => a.id));
    } else {
      setTitle('');
      setDescription('');
      setStartDate(getTodayDate());
      setDueDate('');
      setStatus('en attente');
      setPriority('moyenne');
      setAssignedMemberIds([]);
    }
    setNewChecklistText('');
    setIsAddingChecklist(false);
    setEditingChecklistId(null);
  }, [editingTask, isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const assigneeMembers = members.filter(m => assignedMemberIds.includes(m.id));
    await onSubmit({
      title,
      description,
      startDate,
      dueDate,
      status,
      priority,
      assignees: assigneeMembers,
      checklists,
    });
  };

  const handleAddChecklist = async () => {
    if (!newChecklistText.trim()) return;
    try {
      await onAddChecklist(newChecklistText);
      setNewChecklistText('');
      setIsAddingChecklist(false);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l’ajout de la checklist');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTask ? "Modifier la tâche" : "Nouvelle tâche"} size="lg">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto px-1">
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
              disabled={!canEditTaskFields}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
            />
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

        {editingTask && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Membres assignés</label>
            {editingTask.assignees.length > 0 ? (
              <div className="flex flex-wrap gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                {editingTask.assignees.map(member => (
                  <span key={member.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs text-gray-700 shadow-sm">
                    <span className="font-medium">{member.name}</span>
                    {member.email && <span className="text-gray-400">({member.email})</span>}
                  </span>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-sm text-gray-400">
                Aucun membre assigné
              </p>
            )}
          </div>
        )}

        {canEditTaskFields && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modifier les membres assignés</label>
            <select
              multiple
              value={assignedMemberIds}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                setAssignedMemberIds(selected);
              }}
              className="w-full p-2 border rounded-lg h-32 focus:ring-2 focus:ring-secondary"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({roleLabels[m.role] || m.role})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs</p>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Checklist</label>
            <span className="text-xs text-gray-400">
              {checklists.filter(c => c.is_checked).length}/{checklists.length} complétés
            </span>
          </div>

          <div className="space-y-2">
            {checklists.map((checklist) => (
              <div key={checklist.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => onToggleChecklist(checklist.id, checklist.is_checked)}
                  disabled={checklistLoading === checklist.id}
                  className="flex-shrink-0"
                >
                  {checklistLoading === checklist.id ? (
                    <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                  ) : checklist.is_checked ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300 hover:text-gray-400" />
                  )}
                </button>

                {editingChecklistId === checklist.id ? (
                  <input
                    type="text"
                    value={editingChecklistText}
                    onChange={(e) => setEditingChecklistText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onUpdateChecklistText(checklist.id, editingChecklistText).then(() => {
                      setEditingChecklistId(null);
                      setEditingChecklistText('');
                    }).catch((err: any) => alert(err?.message || 'Erreur lors de la modification de la checklist'))}
                    className="flex-1 text-sm border rounded px-2 py-1 focus:ring-1 focus:ring-secondary"
                    autoFocus
                  />
                ) : (
                  <span className={`text-sm flex-1 ${checklist.is_checked ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                    {checklist.texte}
                  </span>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {editingChecklistId !== checklist.id && (
                    <button
                      onClick={() => {
                        setEditingChecklistId(checklist.id);
                        setEditingChecklistText(checklist.texte);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                  )}
                  {editingChecklistId === checklist.id && (
                    <button
                      onClick={() => onUpdateChecklistText(checklist.id, editingChecklistText).then(() => {
                        setEditingChecklistId(null);
                        setEditingChecklistText('');
                      }).catch((err: any) => alert(err?.message || 'Erreur lors de la modification de la checklist'))}
                      disabled={checklistLoading === `edit-${checklist.id}`}
                      className="p-1 text-green-500 hover:text-green-600"
                    >
                      {checklistLoading === `edit-${checklist.id}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteChecklist(checklist.id)}
                    disabled={checklistLoading === `delete-${checklist.id}`}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    {checklistLoading === `delete-${checklist.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {isAddingChecklist ? (
              <div className="flex items-center gap-2 mt-2">
                <Circle className="h-4 w-4 text-gray-300" />
                <input
                  type="text"
                  placeholder="Nouvel élément de checklist..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                  className="flex-1 text-sm border-b border-gray-200 focus:border-secondary outline-none py-1"
                  autoFocus
                />
                <button onClick={handleAddChecklist} disabled={checklistLoading === 'add'} className="text-secondary text-xs hover:underline">
                  {checklistLoading === 'add' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ajouter'}
                </button>
                <button onClick={() => { setIsAddingChecklist(false); setNewChecklistText(''); }} className="text-gray-400 text-xs">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button onClick={() => setIsAddingChecklist(true)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-secondary transition mt-2">
                <Plus className="h-3 w-3" /> Ajouter un élément à la checklist
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit}>{editingTask ? "Enregistrer" : "Créer"}</Button>
        </div>
      </div>
    </Modal>
  );
}
