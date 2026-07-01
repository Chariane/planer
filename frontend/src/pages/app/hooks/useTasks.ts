// frontend/src/pages/app/hooks/useTasks.ts
import { useState, useEffect, useCallback } from 'react';
import { tacheService } from '../../../services/tache.service';
import { CHECKLIST_CHANGED_EVENT } from '../../../services/checklist.service';
import type { TacheFilters } from '../../../services/tache.service';
import type { Task } from '../../../types';

type NewTaskInput = Omit<Task, 'id' | 'createdAt' | 'progression'>;

export function transformTask(apiTask: any): Task {
  // Extraire les membres depuis apiTask.membres (si présents)
  const members = (apiTask.membres || []).map((m: any) => {
    const u = m.utilisateur || {};
    return {
      id: m.id_utilisateur || u.id,
      username: u.username || '',
      nom: u.nom || '',
      prenoms: u.prenoms || '',
      photo_base64: u.photo_base64 || null,
      role: m.role || 'Membre',
      name: u.prenoms && u.nom ? `${u.prenoms} ${u.nom}` : (u.username || 'Membre'),
      email: u.email || '',
    };
  });

  return {
    id: apiTask.id,
    title: apiTask.titre,
    description: apiTask.description || '',
    status: apiTask.statut,
    priority: apiTask.priorite,
    startDate: apiTask.date_debut ? apiTask.date_debut.split('T')[0] : '',
    dueDate: apiTask.date_fin_prevue ? apiTask.date_fin_prevue.split('T')[0] : '',
    order: apiTask.ordre_affichage,
    assignees: members,
    listId: apiTask.id_liste,
    parentTaskId: apiTask.id_tache_parent || null,
    creatorId: apiTask.id_createur || null,
    createdAt: new Date(apiTask.created_at),
    subTasks: [],
    checklists: (apiTask.checklists || []).map((c: any) => ({
      id: c.id,
      texte: c.texte,
      is_checked: c.is_checked,
      creatorId: c.id_createur || null,
    })),
    progression: apiTask.progression || 0,
    contentMode: apiTask.content_mode || 'leaf',
    canAddChecklist: apiTask.can_add_checklist ?? true,
    canAddSubtask: apiTask.can_add_subtask ?? true,
  };
}

export function useTasks(listId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TacheFilters>({});

  const loadTasks = useCallback(async () => {
    if (!listId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await tacheService.getByListe(listId, filters);
      if (!data) {
        setTasks([]);
        return;
      }

      const tasksWithMembers = (Array.isArray(data) ? data : []).map(transformTask);
      setTasks(tasksWithMembers);
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
      setError('Impossible de charger les tâches.');
    } finally {
      setLoading(false);
    }
  }, [listId, filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!listId) return;
    const refreshTasksFromChecklistChange = () => {
      loadTasks();
    };
    window.addEventListener(CHECKLIST_CHANGED_EVENT, refreshTasksFromChecklistChange);
    return () => window.removeEventListener(CHECKLIST_CHANGED_EVENT, refreshTasksFromChecklistChange);
  }, [listId, loadTasks]);

  const addTask = async (newTask: NewTaskInput) => {
    if (!listId) return null;

    try {
      const apiTask = {
        titre: newTask.title,
        description: newTask.description,
        statut: newTask.status,
        priorite: newTask.priority,
        date_debut: newTask.startDate ? new Date(newTask.startDate).toISOString() : undefined,
        date_fin_prevue: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined,
        id_tache_parent: newTask.parentTaskId || null,
      };
      const created = await tacheService.create(listId, apiTask);
      const taskChecklists = (newTask.checklists || [])
        .map(checklist => ({
          texte: checklist.texte?.trim(),
          is_checked: !!checklist.is_checked,
        }))
        .filter(checklist => !!checklist.texte);

      for (const checklist of taskChecklists) {
        await tacheService.createChecklistInTache(created.id, checklist);
      }

      await loadTasks();
      return created;
    } catch (err) {
      console.error('Erreur création tâche:', err);
      throw err;
    }
  };

  const updateTask = async (updatedTask: Task) => {
    if (!updatedTask.id) return;

    try {
      const apiTask = {
        titre: updatedTask.title,
        description: updatedTask.description,
        statut: updatedTask.status,
        priorite: updatedTask.priority,
        date_debut: updatedTask.startDate && !isNaN(new Date(updatedTask.startDate).getTime())
          ? new Date(updatedTask.startDate).toISOString()
          : undefined,
        date_fin_prevue: updatedTask.dueDate && !isNaN(new Date(updatedTask.dueDate).getTime())
          ? new Date(updatedTask.dueDate).toISOString()
          : undefined,
        id_tache_parent: updatedTask.parentTaskId || null,
      };
      await tacheService.update(updatedTask.id, apiTask);
      await loadTasks();
    } catch (err) {
      console.error('Erreur mise à jour tâche:', err);
      throw err;
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    if (!taskId) return;

    try {
      await tacheService.update(taskId, { statut: status });
      await loadTasks();
    } catch (err) {
      console.error('Erreur mise à jour du statut de la tâche:', err);
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!taskId) return;
    try {
      await tacheService.delete(taskId);
      await loadTasks();
    } catch (err) {
      console.error('Erreur suppression tâche:', err);
      throw err;
    }
  };

  const addChecklistToTask = async (taskId: string, texte: string) => {
    if (!taskId || !texte.trim()) return;
    try {
      await tacheService.createChecklistInTache(taskId, { texte: texte.trim(), is_checked: false });
      await loadTasks();
    } catch (err) {
      console.error('Erreur ajout checklist tâche:', err);
      throw err;
    }
  };

  const toggleTaskChecklist = async (taskId: string, checklistId: string, currentChecked: boolean) => {
    if (!taskId || !checklistId) return;
    try {
      await tacheService.updateChecklist(checklistId, { is_checked: !currentChecked });
      await loadTasks();
    } catch (err) {
      console.error('Erreur mise à jour checklist tâche:', err);
      throw err;
    }
  };

  const deleteTaskChecklist = async (taskId: string, checklistId: string) => {
    if (!taskId || !checklistId) return;
    try {
      await tacheService.deleteChecklist(checklistId);
      await loadTasks();
    } catch (err) {
      console.error('Erreur suppression checklist tâche:', err);
      throw err;
    }
  };

  const updateFilters = (newFilters: TacheFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return {
    tasks,
    loading,
    error,
    filters,
    loadTasks,
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    addChecklistToTask,
    toggleTaskChecklist,
    deleteTaskChecklist,
    updateFilters,
    clearFilters
  };
}