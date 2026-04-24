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
  loadEspacesTree: (workspaceId: string) => Promise<void>;
  loadListes: (espaceId: string) => Promise<void>;
  loadTaches: (listeId: string) => Promise<void>;
  addWorkspace: (data: { nom: string; description?: string }) => Promise<void>;
  updateWorkspace: (id: string, data: { nom?: string; description?: string }) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  addEspace: (workspaceId: string, data: { nom: string; description?: string; id_espace_parent?: string }) => Promise<void>;
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
  inviteMemberToEspace: (espaceId: string, email: string, role: string) => Promise<void>;
  getEspaceMembers: (espaceId: string) => Promise<any[]>;
  updateEspaceMemberRole: (espaceId: string, userId: string, role: string) => Promise<void>;
  removeEspaceMember: (espaceId: string, userId: string) => Promise<void>;
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

  // Charger les workspaces
  const loadWorkspaces = async () => {
    try {
      const data = await workspaceService.getAll();
      setWorkspaces(data);
    } catch (error) {
      console.error('Erreur chargement workspaces', error);
    }
  };

  // Charger l'arborescence des espaces d'un workspace
  const loadEspacesTree = async (workspaceId: string) => {
    try {
      const tree = await espaceService.getTree(workspaceId);
      setWorkspaces(prev => prev.map(ws =>
        ws.id === workspaceId ? { ...ws, espaces: tree } : ws
      ));
    } catch (error) {
      console.error('Erreur chargement arborescence', error);
    }
  };

  // Charger les listes d'un espace
  const loadListes = async (espaceId: string) => {
    try {
      const listes = await listeService.getByEspace(espaceId);
      setWorkspaces(prev => prev.map(ws => ({
        ...ws,
        espaces: ws.espaces?.map(space =>
          space.id === espaceId ? { ...space, listes } : space
        ) || []
      })));
    } catch (error) {
      console.error('Erreur chargement listes', error);
    }
  };

  // Charger les tâches d'une liste
  const loadTaches = async (listeId: string) => {
    try {
      const taches = await tacheService.getByListe(listeId);
      setWorkspaces(prev => prev.map(ws => ({
        ...ws,
        espaces: ws.espaces?.map(space => ({
          ...space,
          listes: space.listes?.map(list =>
            list.id === listeId ? { ...list, taches } : list
          ) || []
        })) || []
      })));
    } catch (error) {
      console.error('Erreur chargement tâches', error);
    }
  };

  // CRUD Workspace
  const addWorkspace = async (data: { nom: string; description?: string }) => {
    const newWorkspace = await workspaceService.create(data);
    setWorkspaces(prev => [...prev, newWorkspace]);
  };

  const updateWorkspace = async (id: string, data: { nom?: string; description?: string }) => {
    const updated = await workspaceService.update(id, data);
    setWorkspaces(prev => prev.map(ws => ws.id === id ? updated : ws));
  };

  const deleteWorkspace = async (id: string) => {
    await workspaceService.delete(id);
    setWorkspaces(prev => prev.filter(ws => ws.id !== id));
    if (activeWorkspaceId === id) setActiveWorkspaceId(null);
  };

  // CRUD Espace
  const addEspace = async (workspaceId: string, data: { nom: string; description?: string; id_espace_parent?: string }) => {
    await espaceService.create({ ...data, id_workspace: workspaceId });
    await loadEspacesTree(workspaceId);
  };

  const updateEspace = async (id: string, data: { nom?: string; description?: string }) => {
    await espaceService.update(id, data);
    await loadWorkspaces();
  };

  const deleteEspace = async (id: string) => {
    await espaceService.delete(id);
    await loadWorkspaces();
  };

  // CRUD Liste
  const addListe = async (espaceId: string, data: { nom: string; description?: string }) => {
    await listeService.create({ ...data, id_espace: espaceId });
    await loadListes(espaceId);
  };

  const updateListe = async (id: string, data: { nom?: string; description?: string }) => {
    await listeService.update(id, data);
    await loadWorkspaces();
  };

  const deleteListe = async (id: string) => {
    await listeService.delete(id);
    await loadWorkspaces();
  };

  // CRUD Tâche
  const addTask = async (listId: string, task: Omit<Task, 'id' | 'createdAt'>) => {
    await tacheService.create(listId, task);
    await loadTaches(listId);
  };

  const updateTask = async (task: Task) => {
    await tacheService.update(task.id, task);
    await loadTaches(task.listId);
  };

  const deleteTask = async (listId: string, taskId: string) => {
    await tacheService.delete(taskId);
    await loadTaches(listId);
  };

  // Gestion des membres (workspace)
  const inviteMember = async (workspaceId: string, email: string, role: string) => {
    await workspaceService.inviteMember(workspaceId, { email, role });
    await loadWorkspaces();
  };

  const removeMember = async (workspaceId: string, memberId: string) => {
    await workspaceService.removeMember(workspaceId, memberId);
    await loadWorkspaces();
  };

  // Gestion des membres d'espace
  const inviteMemberToEspace = async (espaceId: string, email: string, role: string) => {
    await espaceService.inviteMember(espaceId, email, role);
  };

  const getEspaceMembers = async (espaceId: string) => {
    return await espaceService.getMembers(espaceId);
  };

  const updateEspaceMemberRole = async (espaceId: string, userId: string, role: string) => {
    await espaceService.updateMemberRole(espaceId, userId, role);
  };

  const removeEspaceMember = async (espaceId: string, userId: string) => {
    await espaceService.removeMember(espaceId, userId);
  };

  // Fonctions vides
  const toggleSubTask = (taskId: string, subTaskId: string) => {};
  const toggleChecklistItem = (listId: string, periodId: string, itemId: string) => {};
  const addMember = (workspaceId: string, member: Member) => {};

  // Chargement initial
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
        loadEspacesTree,
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