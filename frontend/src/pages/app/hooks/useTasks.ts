// frontend/src/pages/app/hooks/useTasks.ts
import { useState, useEffect, useCallback } from 'react';
import { tacheService } from '../../../services/tache.service';
import type { TacheFilters } from '../../../services/tache.service';
import { getMemberDisplayName, getMemberEmail } from '../../../utils/memberDisplay';
import type { Task } from '../../../types';

type NewTaskInput = Omit<Task, 'id' | 'createdAt' | 'progression'>;

function transformTask(apiTask: any): Task {
  return {
    id: apiTask.id,
    title: apiTask.titre,
    description: apiTask.description || '',
    status: apiTask.statut,
    priority: apiTask.priorite,
    startDate: apiTask.date_debut ? apiTask.date_debut.split('T')[0] : '',
    dueDate: apiTask.date_fin_prevue ? apiTask.date_fin_prevue.split('T')[0] : '',
    order: apiTask.ordre_affichage,
    assignees: [],
    listId: apiTask.id_liste,
    parentTaskId: apiTask.id_tache_parent || null,
    createdAt: new Date(apiTask.created_at),
    subTasks: [],
    checklists: (apiTask.checklists || []).map((c: any) => ({
      id: c.id,
      texte: c.texte,
      is_checked: c.is_checked,
    })),
    progression: apiTask.progression || 0,
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

      const transformed = (Array.isArray(data) ? data : []).map(transformTask);

      const tasksWithMembers = await Promise.all(
        transformed.map(async (task) => {
          try {
            const taskMembers = await tacheService.getMembers(task.id);
            const assignees = taskMembers.map((m: any) => ({
              id: m.id_utilisateur || m.id,
              name: getMemberDisplayName(m),
              email: getMemberEmail(m),
              role: m.role || 'Membre',
            }));
            return { ...task, assignees };
          } catch {
            return task;
          }
        })
      );
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

      if (taskChecklists.length > 0) {
        await tacheService.updateTaskStatusFromChecklists(created.id);
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
      if (status === 'terminé') {
        const collectDescendantIds = (parentId: string): string[] => {
          const directChildren = tasks.filter(task => task.parentTaskId === parentId);
          return directChildren.flatMap(child => [child.id, ...collectDescendantIds(child.id)]);
        };

        const taskIdsToComplete = [taskId, ...collectDescendantIds(taskId)];

        for (const currentTaskId of taskIdsToComplete) {
          const checklists = await tacheService.getChecklistsByTache(currentTaskId);
          const checklistItems = Array.isArray(checklists) ? checklists : [];
          await Promise.all(
            checklistItems
              .filter((checklist: any) => !checklist.is_checked)
              .map((checklist: any) => tacheService.updateChecklist(checklist.id, { is_checked: true }))
          );
        }

        for (const currentTaskId of [...taskIdsToComplete].reverse()) {
          await tacheService.update(currentTaskId, { statut: 'terminé' });
        }
      } else {
        await tacheService.update(taskId, { statut: status });
      }
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
      await tacheService.updateTaskStatusFromChecklists(taskId);
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
      await tacheService.updateTaskStatusFromChecklists(taskId);
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
      await tacheService.updateTaskStatusFromChecklists(taskId);
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
