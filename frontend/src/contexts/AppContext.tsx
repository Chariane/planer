import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'en_cours' | 'en_attente' | 'terminee' | 'bloquee' | 'archivee';
  priority: 'tres_elevee' | 'elevee' | 'normale' | 'faible' | 'tres_faible';
  dueDate: string;
  assignees: Member[];
  listId: string;
  createdAt: Date;
  subTasks?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Period {
  id: string;
  name: string;
  progress: number;
  expanded?: boolean;
  children?: Period[];
  items?: ChecklistItem[];
}

export interface List {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  periods?: Period[];
  createdAt: Date;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  spaces?: Space[];
  lists: List[];
  createdAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  members: Member[];
  spaces: Space[];
  createdAt: Date;
}

interface AppContextType {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeSpaceId: string | null;
  activeListId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveSpaceId: (id: string | null) => void;
  setActiveListId: (id: string | null) => void;
  addTask: (listId: string, task: Task) => void;
  updateTask: (task: Task) => void;
  toggleChecklistItem: (listId: string, periodId: string, itemId: string) => void;
  toggleSubTask: (taskId: string, subTaskId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'Kapital Human & Conseil',
    description: 'Environnement principal de gestion des projets RH et conseil',
    members: [
      { id: 'u1', name: 'Thomas D.', email: 'thomas@kplaner.com', role: 'admin' },
      { id: 'u2', name: 'Alice M.', email: 'alice@kplaner.com', role: 'member' },
      { id: 'u3', name: 'Bob L.', email: 'bob@kplaner.com', role: 'member' },
    ],
    spaces: [
      {
        id: 's1',
        name: 'Projets RH',
        description: 'Gestion des ressources humaines',
        spaces: [
          {
            id: 'ss1',
            name: 'Recrutement 2025',
            description: 'Processus de recrutement',
            lists: [
              {
                id: 'l1',
                name: 'Candidatures',
                description: 'Suivi des candidats',
                tasks: [
                  {
                    id: 't1',
                    title: 'Pré-sélection CV',
                    description: 'Filtrer les CV reçus',
                    status: 'en_cours',
                    priority: 'elevee',
                    dueDate: '2025-04-15',
                    assignees: [{ id: 'u2', name: 'Alice M.', email: 'alice@kplaner.com', role: 'member' }],
                    listId: 'l1',
                    createdAt: new Date(),
                    subTasks: [
                      { id: 'st1', text: 'Recevoir les CV', completed: true },
                      { id: 'st2', text: 'Noter chaque CV', completed: false },
                    ],
                  },
                  {
                    id: 't2',
                    title: 'Entretiens',
                    description: 'Planifier et réaliser les entretiens',
                    status: 'en_attente',
                    priority: 'normale',
                    dueDate: '2025-04-20',
                    assignees: [{ id: 'u1', name: 'Thomas D.', email: 'thomas@kplaner.com', role: 'admin' }],
                    listId: 'l1',
                    createdAt: new Date(),
                    subTasks: [],
                  },
                ],
                periods: [
                  {
                    id: 'p1',
                    name: 'Mois de Avril',
                    progress: 45,
                    expanded: true,
                    children: [
                      {
                        id: 'p2',
                        name: 'Semaine du 07/04',
                        progress: 60,
                        expanded: false,
                        children: [
                          {
                            id: 'p3',
                            name: 'Lundi 07/04',
                            progress: 80,
                            items: [
                              { id: 'i1', text: 'Recevoir candidatures', completed: true },
                              { id: 'i2', text: 'Pré-sélection', completed: false },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
                createdAt: new Date(),
              },
            ],
            createdAt: new Date(),
          },
          {
            id: 'ss2',
            name: 'Formation',
            description: 'Plan de formation',
            lists: [],
            createdAt: new Date(),
          },
        ],
        lists: [],
        createdAt: new Date(),
      },
      {
        id: 's2',
        name: 'Projets Conseil',
        description: 'Missions de conseil',
        spaces: [],
        lists: [
          {
            id: 'l2',
            name: 'Étude de marché',
            description: 'Analyse concurrentielle',
            tasks: [
              {
                id: 't3',
                title: 'Collecte données',
                description: 'Rassembler les données du marché',
                status: 'terminee',
                priority: 'elevee',
                dueDate: '2025-04-01',
                assignees: [{ id: 'u3', name: 'Bob L.', email: 'bob@kplaner.com', role: 'member' }],
                listId: 'l2',
                createdAt: new Date(),
                subTasks: [],
              },
            ],
            periods: [],
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
      },
    ],
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'MTN Bénin',
    description: 'Projet MTN Bénin',
    members: [{ id: 'u4', name: 'Sophie L.', email: 'sophie@kplaner.com', role: 'admin' }],
    spaces: [],
    createdAt: new Date(),
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);

  const addTask = (listId: string, task: Task) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      spaces: ws.spaces.map(space => ({
        ...space,
        spaces: space.spaces ? space.spaces.map(sub => ({ ...sub, lists: sub.lists.map(list => list.id === listId ? { ...list, tasks: [...list.tasks, task] } : list) })) : [],
        lists: space.lists.map(list => list.id === listId ? { ...list, tasks: [...list.tasks, task] } : list),
      })),
    })));
  };

  const updateTask = (updatedTask: Task) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      spaces: ws.spaces.map(space => ({
        ...space,
        spaces: space.spaces ? space.spaces.map(sub => ({ ...sub, lists: sub.lists.map(list => list.id === updatedTask.listId ? { ...list, tasks: list.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) } : list) })) : [],
        lists: space.lists.map(list => list.id === updatedTask.listId ? { ...list, tasks: list.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) } : list),
      })),
    })));
  };

  const toggleChecklistItem = (listId: string, periodId: string, itemId: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      spaces: ws.spaces.map(space => ({
        ...space,
        spaces: space.spaces ? space.spaces.map(sub => ({ ...sub, lists: sub.lists.map(list => {
          if (list.id !== listId) return list;
          const toggleInPeriod = (periods: Period[] | undefined): Period[] | undefined => {
            if (!periods) return periods;
            return periods.map(period => {
              if (period.id === periodId && period.items) {
                return { ...period, items: period.items.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item) };
              }
              if (period.children) return { ...period, children: toggleInPeriod(period.children) };
              return period;
            });
          };
          return { ...list, periods: toggleInPeriod(list.periods) };
        }) })) : [],
        lists: space.lists.map(list => {
          if (list.id !== listId) return list;
          const toggleInPeriod = (periods: Period[] | undefined): Period[] | undefined => {
            if (!periods) return periods;
            return periods.map(period => {
              if (period.id === periodId && period.items) {
                return { ...period, items: period.items.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item) };
              }
              if (period.children) return { ...period, children: toggleInPeriod(period.children) };
              return period;
            });
          };
          return { ...list, periods: toggleInPeriod(list.periods) };
        }),
      })),
    })));
  };

  const toggleSubTask = (taskId: string, subTaskId: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      spaces: ws.spaces.map(space => ({
        ...space,
        spaces: space.spaces ? space.spaces.map(sub => ({
          ...sub,
          lists: sub.lists.map(list => ({
            ...list,
            tasks: list.tasks.map(task => {
              if (task.id !== taskId) return task;
              const updatedSubTasks = task.subTasks?.map(st => st.id === subTaskId ? { ...st, completed: !st.completed } : st);
              return { ...task, subTasks: updatedSubTasks };
            }),
          })),
        })) : [],
        lists: space.lists.map(list => ({
          ...list,
          tasks: list.tasks.map(task => {
            if (task.id !== taskId) return task;
            const updatedSubTasks = task.subTasks?.map(st => st.id === subTaskId ? { ...st, completed: !st.completed } : st);
            return { ...task, subTasks: updatedSubTasks };
          }),
        })),
      })),
    })));
  };

  return (
    <AppContext.Provider value={{
      workspaces,
      activeWorkspaceId,
      activeSpaceId,
      activeListId,
      setActiveWorkspaceId,
      setActiveSpaceId,
      setActiveListId,
      addTask,
      updateTask,
      toggleChecklistItem,
      toggleSubTask,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
