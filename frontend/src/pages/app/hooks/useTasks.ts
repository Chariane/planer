// frontend/src/pages/app/hooks/useTasks.ts
import { useState, useEffect, useCallback } from 'react';
import { tacheService } from '../../../services/tache.service';
import type { Task, Member } from '../../../types';

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

  const loadTasks = useCallback(async () => {
    if (!listId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await tacheService.getByListe(listId);
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
              name: m.utilisateur?.username || m.utilisateur?.nom || 'Inconnu',
              email: m.utilisateur?.email || '',
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
  }, [listId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = async (newTask: Omit<Task, 'id' | 'createdAt' | 'checklists' | 'progression'>) => {
    if (!listId) return null;
    
    try {
      const apiTask = {
        titre: newTask.title,
        description: newTask.description,
        statut: newTask.status,
        priorite: newTask.priority,
        date_debut: newTask.startDate ? new Date(newTask.startDate).toISOString() : undefined,
        date_fin_prevue: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined,
      };
      const created = await tacheService.create(listId, apiTask);
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
        date_debut: updatedTask.startDate ? new Date(updatedTask.startDate).toISOString() : undefined,
        date_fin_prevue: updatedTask.dueDate ? new Date(updatedTask.dueDate).toISOString() : undefined,
      };
      await tacheService.update(updatedTask.id, apiTask);
      await loadTasks();
    } catch (err) {
      console.error('Erreur mise à jour tâche:', err);
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

  return { tasks, loading, error, loadTasks, addTask, updateTask, deleteTask };
}