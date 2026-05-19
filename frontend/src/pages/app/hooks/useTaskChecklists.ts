// frontend/src/pages/app/hooks/useTaskChecklists.ts
import { useState, useCallback, useEffect } from 'react';
import { tacheService } from '../../../services/tache.service';

interface TaskChecklist {
  id: string;
  texte: string;
  is_checked: boolean;
}

export function useTaskChecklists(taskId: string | undefined, onStatusChange?: (newStatus: string) => void) {
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const loadChecklists = useCallback(async () => {
    if (!taskId) return;
    try {
      const data = await tacheService.getChecklistsByTache(taskId);
      setChecklists(data.map((c: any) => ({
        id: c.id,
        texte: c.texte,
        is_checked: c.is_checked,
      })));
    } catch (err) {
      console.error('Erreur chargement checklists:', err);
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) {
      setChecklists([]);
      return;
    }
    loadChecklists();
  }, [taskId, loadChecklists]);

  const addChecklist = useCallback(async (texte: string) => {
    if (!taskId || !texte.trim()) return;
    setLoading('add');
    try {
      const newChecklist = await tacheService.createChecklistInTache(taskId, { texte, is_checked: false });
      setChecklists(prev => [...prev, {
        id: newChecklist.id,
        texte: newChecklist.texte,
        is_checked: newChecklist.is_checked,
      }]);
      return newChecklist;
    } finally {
      setLoading(null);
    }
  }, [taskId]);

  const toggleChecklist = useCallback(async (checklistId: string, currentChecked: boolean) => {
    setLoading(checklistId);
    try {
      const updated = await tacheService.updateChecklist(checklistId, { is_checked: !currentChecked });
      setChecklists(prev => prev.map(c => c.id === checklistId ? {
        id: updated.id,
        texte: updated.texte,
        is_checked: updated.is_checked,
      } : c));
      
      // Mettre à jour le statut de la tâche automatiquement
      if (taskId) {
        await tacheService.updateTaskStatusFromChecklists(taskId);
        // Optionnel: recharger la tâche pour avoir le nouveau statut
        const updatedTask = await tacheService.getById(taskId);
        if (onStatusChange && updatedTask) {
          onStatusChange(updatedTask.statut);
        }
      }
      
      return updated;
    } finally {
      setLoading(null);
    }
  }, [taskId, onStatusChange]);

  const updateChecklistText = useCallback(async (checklistId: string, newText: string) => {
    if (!newText.trim()) return;
    setLoading(`edit-${checklistId}`);
    try {
      const updated = await tacheService.updateChecklist(checklistId, { texte: newText });
      setChecklists(prev => prev.map(c => c.id === checklistId ? {
        id: updated.id,
        texte: updated.texte,
        is_checked: updated.is_checked,
      } : c));
    } finally {
      setLoading(null);
    }
  }, []);

  const deleteChecklist = useCallback(async (checklistId: string) => {
    setLoading(`delete-${checklistId}`);
    try {
      await tacheService.deleteChecklist(checklistId);
      setChecklists(prev => prev.filter(c => c.id !== checklistId));
      
      // Mettre à jour le statut de la tâche automatiquement après suppression
      if (taskId) {
        await tacheService.updateTaskStatusFromChecklists(taskId);
        const updatedTask = await tacheService.getById(taskId);
        if (onStatusChange && updatedTask) {
          onStatusChange(updatedTask.statut);
        }
      }
    } finally {
      setLoading(null);
    }
  }, [taskId, onStatusChange]);

  return {
    checklists,
    loading: loading,
    loadChecklists,
    addChecklist,
    toggleChecklist,
    updateChecklistText,
    deleteChecklist,
  };
}
