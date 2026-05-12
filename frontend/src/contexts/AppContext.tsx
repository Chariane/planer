// frontend/src/contexts/AppContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { workspaceService } from '../services/workspace.service';
import { espaceService } from '../services/espace.service';
import { listeService } from '../services/liste.service';
import { tacheService } from '../services/tache.service';
import type {
  JoinedResource,
  Member,
  Task,
  ChecklistItem,
  Period,
  List,
  Space,
  Workspace,
  WorkspaceAccessListingResponse,
  WorkspaceLocalResourcesResponse,
  WorkspaceNavigationResponse,
} from '../types';
import { useNavigationStore } from '../store/useNavigationStore';

export type { Member, Task, ChecklistItem, Period, List, Space, Workspace };
const EMPTY_JOINED_ITEMS: JoinedResource[] = [];

const createEmptyLocalResources = (workspaceId: string): WorkspaceLocalResourcesResponse => ({
  workspace_id: workspaceId,
  workspace_nom: '',
  my_workspace_role: null,
  direct_access: {
    espaces: [],
    listes: [],
    taches: [],
  },
});

interface AppContextType {
  workspaces: Workspace[];
  ownedWorkspaces: Workspace[];
  joinedWorkspaces: Workspace[];
  joinedEspaces: JoinedResource[];
  joinedListes: JoinedResource[];
  joinedTaches: JoinedResource[];
  workspaceLocalResources: Record<string, WorkspaceLocalResourcesResponse>;
  activeWorkspaceId: string | null;
  activeSpaceId: string | null;
  activeListId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveSpaceId: (id: string | null) => void;
  setActiveListId: (id: string | null) => void;
  loadWorkspaces: () => Promise<void>;
  loadNavigationData: () => Promise<void>;
  loadWorkspaceLocalResources: (workspaceId: string) => Promise<void>;
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
  const [ownedWorkspaces, setOwnedWorkspaces] = useState<Workspace[]>([]);
  const [joinedWorkspaces, setJoinedWorkspaces] = useState<Workspace[]>([]);
  const [joinedEspaces, setJoinedEspaces] = useState<JoinedResource[]>(EMPTY_JOINED_ITEMS);
  const [joinedListes, setJoinedListes] = useState<JoinedResource[]>(EMPTY_JOINED_ITEMS);
  const [joinedTaches, setJoinedTaches] = useState<JoinedResource[]>(EMPTY_JOINED_ITEMS);
  const [workspaceLocalResources, setWorkspaceLocalResources] = useState<Record<string, WorkspaceLocalResourcesResponse>>({});
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);

  const applyWorkspaceAccessListing = (data: WorkspaceAccessListingResponse) => {
    const owned = Array.isArray(data.owned) ? data.owned : [];
    const joined = Array.isArray(data.joined) ? data.joined : [];
    setOwnedWorkspaces(owned);
    setJoinedWorkspaces(joined);
    setWorkspaces([...owned, ...joined]);
  };

  const applyNavigationData = async (data: WorkspaceNavigationResponse) => {
    const store = useNavigationStore.getState();
    store.setLoading(true);
    
    try {
      const owned = Array.isArray(data.owned_workspaces) ? data.owned_workspaces : [];
      const joined = Array.isArray(data.joined_workspaces) ? data.joined_workspaces : [];

      // Mettre à jour les states locaux avec les rôles
      setOwnedWorkspaces(owned);
      setJoinedWorkspaces(joined);
      setWorkspaces([...owned, ...joined]);

      // Mettre à jour le store
      store.loadNavigation({
        ownedWorkspaces: owned,
        joinedWorkspaces: joined,
        joinedEspaces: Array.isArray(data.joined_espaces) ? data.joined_espaces : [],
        joinedListes: Array.isArray(data.joined_listes) ? data.joined_listes : [],
        joinedTaches: Array.isArray(data.joined_taches) ? data.joined_taches : []
      });

      // Identifier les workspaces "partiels" (ceux dont on a rejoint une ressource mais pas le workspace entier)
      const allJoined = [
        ...(Array.isArray(data.joined_espaces) ? data.joined_espaces : []),
        ...(Array.isArray(data.joined_listes) ? data.joined_listes : []),
        ...(Array.isArray(data.joined_taches) ? data.joined_taches : [])
      ];

      const existingIds = new Set([...owned, ...joined].map(ws => ws.id));
      const partialWorkspaces: Workspace[] = [];

      allJoined.forEach(res => {
        const wsId = res.workspace_id || (res as any).id_workspace;
        if (wsId && !existingIds.has(wsId)) {
          partialWorkspaces.push({
            id: wsId,
            nom: res.workspace_nom || 'Workspace',
            description: '',
            membres: [],
            created_at: new Date().toISOString(),
            id_utilisateur: '',
            espaces: [],
            current_user_role: null,
          });
          existingIds.add(wsId);
        }
      });

      setOwnedWorkspaces(owned);
      setJoinedWorkspaces(joined);
      setWorkspaces([...owned, ...joined, ...partialWorkspaces]);
      setJoinedEspaces(Array.isArray(data.joined_espaces) ? data.joined_espaces : EMPTY_JOINED_ITEMS);
      setJoinedListes(Array.isArray(data.joined_listes) ? data.joined_listes : EMPTY_JOINED_ITEMS);
      setJoinedTaches(Array.isArray(data.joined_taches) ? data.joined_taches : EMPTY_JOINED_ITEMS);
    } finally {
      store.setLoading(false);
    }
  };

  const loadWorkspaces = async () => {
    try {
      const data = await workspaceService.getMyAccess();
      applyWorkspaceAccessListing(data);
    } catch (error) {
      console.error('Erreur chargement workspaces', error);
      setOwnedWorkspaces([]);
      setJoinedWorkspaces([]);
      setWorkspaces([]);
    }
  };

  const loadNavigationData = async () => {
    try {
      const data = await workspaceService.getMyNavigation();
      await applyNavigationData(data);
    } catch (error) {
      console.error('Erreur chargement navigation utilisateur', error);
      const store = useNavigationStore.getState();
      store.setLoading(false);
      setOwnedWorkspaces([]);
      setJoinedWorkspaces([]);
      setWorkspaces([]);
      setJoinedEspaces(EMPTY_JOINED_ITEMS);
      setJoinedListes(EMPTY_JOINED_ITEMS);
      setJoinedTaches(EMPTY_JOINED_ITEMS);
    }
  };

  const loadWorkspaceLocalResources = async (workspaceId: string) => {
    try {
      const data = await workspaceService.getLocalResources(workspaceId);
      const normalized =
        data && data.workspace_id
          ? data
          : createEmptyLocalResources(workspaceId);

      setWorkspaceLocalResources(prev => ({
        ...prev,
        [workspaceId]: normalized,
      }));
    } catch (error) {
      console.error('Erreur chargement ressources locales', error);
      setWorkspaceLocalResources(prev => ({
        ...prev,
        [workspaceId]: createEmptyLocalResources(workspaceId),
      }));
    }
  };

  const refreshAccessOverview = async () => {
    await loadNavigationData();
  };

  // Charger l'arborescence des espaces d'un workspace
  const loadEspacesTree = async (workspaceId: string) => {
    try {
      const tree = await espaceService.getTree(workspaceId);
      setWorkspaces(prev => {
        const exists = prev.find(ws => ws.id === workspaceId);
        if (exists) {
          return prev.map(ws => ws.id === workspaceId ? { ...ws, espaces: tree } : ws);
        }
        return [...prev, {
          id: workspaceId,
          nom: 'Workspace',
          description: '',
          membres: [],
          created_at: new Date().toISOString(),
          id_utilisateur: '',
          espaces: tree,
          current_user_role: null,
        }];
      });
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
    await workspaceService.create(data);
    await refreshAccessOverview();
  };

  const updateWorkspace = async (id: string, data: { nom?: string; description?: string }) => {
    await workspaceService.update(id, data);
    await refreshAccessOverview();
  };

  const deleteWorkspace = async (id: string) => {
    await workspaceService.delete(id);
    await refreshAccessOverview();
    if (activeWorkspaceId === id) setActiveWorkspaceId(null);
  };

  // CRUD Espace
  const addEspace = async (workspaceId: string, data: { nom: string; description?: string; id_espace_parent?: string }) => {
    await espaceService.create({ ...data, id_workspace: workspaceId });
    await loadEspacesTree(workspaceId);
  };

  const updateEspace = async (id: string, data: { nom?: string; description?: string }) => {
    await espaceService.update(id, data);
    await refreshAccessOverview();
  };

  const deleteEspace = async (id: string) => {
    await espaceService.delete(id);
    await refreshAccessOverview();
  };

  // CRUD Liste
  const addListe = async (espaceId: string, data: { nom: string; description?: string }) => {
    await listeService.create({ ...data, id_espace: espaceId });
    await loadListes(espaceId);
  };

  const updateListe = async (id: string, data: { nom?: string; description?: string }) => {
    await listeService.update(id, data);
    await refreshAccessOverview();
  };

  const deleteListe = async (id: string) => {
    await listeService.delete(id);
    await refreshAccessOverview();
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
    await refreshAccessOverview();
  };

  const removeMember = async (workspaceId: string, memberId: string) => {
    await workspaceService.removeMember(workspaceId, memberId);
    await refreshAccessOverview();
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
  const toggleSubTask = (taskId: string, subTaskId: string) => { };
  const toggleChecklistItem = (listId: string, periodId: string, itemId: string) => { };
  const addMember = (workspaceId: string, member: Member) => { };

  // Chargement initial
  useEffect(() => {
    refreshAccessOverview();
  }, []);

  return (
    <AppContext.Provider
      value={{
        workspaces,
        ownedWorkspaces,
        joinedWorkspaces,
        joinedEspaces,
        joinedListes,
        joinedTaches,
        workspaceLocalResources,
        activeWorkspaceId,
        activeSpaceId,
        activeListId,
        setActiveWorkspaceId,
        setActiveSpaceId,
        setActiveListId,
        loadWorkspaces,
        loadNavigationData,
        loadWorkspaceLocalResources,
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