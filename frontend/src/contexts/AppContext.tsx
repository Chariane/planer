// frontend/src/contexts/AppContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { workspaceService } from '../services/workspace.service';
import { espaceService } from '../services/espace.service';
import { listeService } from '../services/liste.service';
import { tacheService } from '../services/tache.service';
import type { Member, Task, ChecklistItem, Period, List, Space, Workspace } from '../types';

export type { Member, Task, ChecklistItem, Period, List, Space, Workspace };

interface AppContextType {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeSpaceId: string | null;
  activeListId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveSpaceId: (id: string | null) => void;
  setActiveListId: (id: string | null) => void;
  loadWorkspaces: () => Promise<void>;
  loadEspaces: (workspaceId: string) => Promise<void>;
  loadListes: (espaceId: string) => Promise<void>;
  loadTaches: (listeId: string) => Promise<void>;
  addWorkspace: (data: { nom: string; description?: string }) => Promise<void>;
  updateWorkspace: (id: string, data: { nom?: string; description?: string }) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  addEspace: (workspaceId: string, data: { nom: string; description?: string }) => Promise<void>;
  updateEspace: (id: string, data: { nom?: string; description?: string }) => Promise<void>;
  deleteEspace: (id: string) => Promise<void>;
  addListe: (espaceId: string, data: { nom: string; description?: string }) => Promise<void>;
  updateListe: (id: string, data: { nom?: string; description?: string }) => Promise<void>;
  deleteListe: (id: string) => Promise<void>;
  addTask: (listId: string, task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (listId: string, taskId: string) => Promise<void>;
  inviteMember: (workspaceId: string, email: string, role: string) => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  // Nouvelles fonctions pour la gestion des membres d'espace
  inviteMemberToEspace: (espaceId: string, email: string, role: string) => Promise<void>;
  getEspaceMembers: (espaceId: string) => Promise<any[]>;
  updateEspaceMemberRole: (espaceId: string, userId: string, role: string) => Promise<void>;
  removeEspaceMember: (espaceId: string, userId: string) => Promise<void>;
  // Fonctions utilitaires
  toggleSubTask: (taskId: string, subTaskId: string) => void;
  toggleChecklistItem: (listId: string, periodId: string, itemId: string) => void;
  addMember: (workspaceId: string, member: Member) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);

  const loadWorkspaces = async () => {
    try {
      const data = await workspaceService.getAll();
      const workspacesWithEspaces = data.map((ws: any) => ({
        ...ws,
        espaces: ws.espaces || [],
        membres: ws.membres || []
      }));
      setWorkspaces(workspacesWithEspaces);
    } catch (error) {
      console.error('Erreur lors du chargement des workspaces', error);
    }
  };

  const loadEspaces = async (workspaceId: string) => {
    try {
      const data = await espaceService.getByWorkspace(workspaceId);
      setWorkspaces(prev => prev.map(ws =>
        ws.id === workspaceId ? { ...ws, espaces: data || [], membres: ws.membres || [] } : ws
      ));
    } catch (error) {
      console.error('Erreur lors du chargement des espaces', error);
    }
  };

  const loadListes = async (espaceId: string) => {
    try {
      const data = await listeService.getByEspace(espaceId);
      setWorkspaces(prev => prev.map(ws => ({
        ...ws,
        espaces: ws.espaces?.map(space =>
          space.id === espaceId ? { ...space, listes: data || [] } : space
        ) || []
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des listes', error);
    }
  };

  const loadTaches = async (listeId: string) => {
    try {
      const data = await tacheService.getByListe(listeId);
      setWorkspaces(prev => prev.map(ws => ({
        ...ws,
        espaces: ws.espaces?.map(space => ({
          ...space,
          listes: space.listes?.map(list =>
            list.id === listeId ? { ...list, taches: data || [] } : list
          ) || []
        })) || []
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des tâches', error);
    }
  };

  const addWorkspace = async (data: { nom: string; description?: string }) => {
    const newWorkspace = await workspaceService.create(data);
    setWorkspaces(prev => [{ ...newWorkspace, espaces: [], membres: [] }, ...prev]);
  };

  const updateWorkspace = async (id: string, data: { nom?: string; description?: string }) => {
    const updated = await workspaceService.update(id, data);
    setWorkspaces(prev => prev.map(ws => ws.id === id ? { ...updated, espaces: ws.espaces || [], membres: ws.membres || [] } : ws));
  };

  const deleteWorkspace = async (id: string) => {
    await workspaceService.delete(id);
    setWorkspaces(prev => prev.filter(ws => ws.id !== id));
    if (activeWorkspaceId === id) setActiveWorkspaceId(null);
  };

  const addEspace = async (workspaceId: string, data: { nom: string; description?: string }) => {
    const newEspace = await espaceService.create({ ...data, id_workspace: workspaceId });
    setWorkspaces(prev => prev.map(ws =>
      ws.id === workspaceId ? { ...ws, espaces: [...(ws.espaces || []), newEspace] } : ws
    ));
  };

  const updateEspace = async (id: string, data: { nom?: string; description?: string }) => {
    const updated = await espaceService.update(id, data);
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      espaces: ws.espaces?.map(space => space.id === id ? updated : space) || []
    })));
  };

  const deleteEspace = async (id: string) => {
    await espaceService.delete(id);
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      espaces: ws.espaces?.filter(space => space.id !== id) || []
    })));
    if (activeSpaceId === id) setActiveSpaceId(null);
  };

  const addListe = async (espaceId: string, data: { nom: string; description?: string }) => {
    const newListe = await listeService.create({ ...data, id_espace: espaceId });
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      espaces: ws.espaces?.map(space =>
        space.id === espaceId ? { ...space, listes: [...(space.listes || []), newListe] } : space
      ) || []
    })));
  };

  const updateListe = async (id: string, data: { nom?: string; description?: string }) => {
    const updated = await listeService.update(id, data);
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      espaces: ws.espaces?.map(space => ({
        ...space,
        listes: space.listes?.map(list => list.id === id ? updated : list) || []
      })) || []
    })));
  };

  const deleteListe = async (id: string) => {
    await listeService.delete(id);
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      espaces: ws.espaces?.map(space => ({
        ...space,
        listes: space.listes?.filter(list => list.id !== id) || []
      })) || []
    })));
    if (activeListId === id) setActiveListId(null);
  };

  const addTask = async (listId: string, task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask = await tacheService.create(listId, task);
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      espaces: ws.espaces?.map(space => ({
        ...space,
        listes: space.listes?.map(list =>
          list.id === listId ? { ...list, taches: [...(list.taches || []), newTask] } : list
        ) || []
      })) || []
    })));
  };

  const updateTask = async (task: Task) => {
    const updated = await tacheService.update(task.id, task);
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      espaces: ws.espaces?.map(space => ({
        ...space,
        listes: space.listes?.map(list =>
          list.id === task.listId ? { ...list, taches: list.taches?.map(t => t.id === task.id ? updated : t) || [] } : list
        ) || []
      })) || []
    })));
  };

  const deleteTask = async (listId: string, taskId: string) => {
    await tacheService.delete(taskId);
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      espaces: ws.espaces?.map(space => ({
        ...space,
        listes: space.listes?.map(list =>
          list.id === listId ? { ...list, taches: list.taches?.filter(t => t.id !== taskId) || [] } : list
        ) || []
      })) || []
    })));
  };

  // Gestion des membres de workspace (existante)
  const inviteMember = async (workspaceId: string, email: string, role: string) => {
    await workspaceService.inviteMember(workspaceId, email, role);
    await loadWorkspaces();
  };

  const removeMember = async (workspaceId: string, memberId: string) => {
    await workspaceService.removeMember(workspaceId, memberId);
    await loadWorkspaces();
  };

  // Nouvelles fonctions pour la gestion des membres d'espace
  const inviteMemberToEspace = async (espaceId: string, email: string, role: string) => {
    await espaceService.inviteMember(espaceId, email, role);
    // Optionnel : recharger les membres si besoin (mais pas automatique)
  };

  const getEspaceMembers = async (espaceId: string) => {
    return await espaceService.getMembers(espaceId);
  };

  const updateEspaceMemberRole = async (espaceId: string, userId: string, role: string) => {
    await espaceService.updateMember(espaceId, userId, role);
  };

  const removeEspaceMember = async (espaceId: string, userId: string) => {
    await espaceService.removeMember(espaceId, userId);
  };

  // Fonctions vides ou à implémenter
  const toggleSubTask = (taskId: string, subTaskId: string) => {};
  const toggleChecklistItem = (listId: string, periodId: string, itemId: string) => {};
  const addMember = (workspaceId: string, member: Member) => {};

  useEffect(() => {
    loadWorkspaces();
  }, []);

  return (
    <AppContext.Provider
      value={{
        workspaces,
        activeWorkspaceId,
        activeSpaceId,
        activeListId,
        setActiveWorkspaceId,
        setActiveSpaceId,
        setActiveListId,
        loadWorkspaces,
        loadEspaces,
        loadListes,
        loadTaches,
        addWorkspace,
        updateWorkspace,
        deleteWorkspace,
        addEspace,
        updateEspace,
        deleteEspace,
        addListe,
        updateListe,
        deleteListe,
        addTask,
        updateTask,
        deleteTask,
        inviteMember,
        removeMember,
        inviteMemberToEspace,
        getEspaceMembers,
        updateEspaceMemberRole,
        removeEspaceMember,
        toggleSubTask,
        toggleChecklistItem,
        addMember,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};