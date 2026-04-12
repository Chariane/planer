import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
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
  deleteTask: (listId: string, taskId: string) => void;
  toggleSubTask: (taskId: string, subTaskId: string) => void;
  toggleChecklistItem: (listId: string, periodId: string, itemId: string) => void;
  addMember: (workspaceId: string, member: Member) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'Kapital Human & Conseil',
    description: 'Environnement principal',
    members: [
      { id: 'u1', name: 'Thomas D.', email: 'thomas@kplaner.com', role: 'admin' },
      { id: 'u2', name: 'Alice M.', email: 'alice@kplaner.com', role: 'member' },
    ],
    spaces: [
      {
        id: 's1',
        name: 'Espace 1',
        description: '',
        spaces: [],
        lists: [
          {
            id: 'l1',
            name: 'Liste 1 du workspace',
            description: '',
            tasks: [
              {
                id: 't1',
                title: 'Pré-sélection CV',
                description: '',
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
];

// Fonction utilitaire pour mettre à jour les workspaces de manière immuable
function updateWorkspaces(workspaces: Workspace[], updater: (ws: Workspace) => Workspace): Workspace[] {
  return workspaces.map(updater);
}

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
        spaces: space.spaces?.map(sub => ({
          ...sub,
          lists: sub.lists.map(list => list.id === listId ? { ...list, tasks: [...list.tasks, task] } : list)
        })) ?? [],
        lists: space.lists.map(list => list.id === listId ? { ...list, tasks: [...list.tasks, task] } : list)
      }))
    })));
  };

  const updateTask = (updatedTask: Task) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      spaces: ws.spaces.map(space => ({
        ...space,
        spaces: space.spaces?.map(sub => ({
          ...sub,
          lists: sub.lists.map(list => list.id === updatedTask.listId ? {
            ...list,
            tasks: list.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
          } : list)
        })) ?? [],
        lists: space.lists.map(list => list.id === updatedTask.listId ? {
          ...list,
          tasks: list.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
        } : list)
      }))
    })));
  };

  const deleteTask = (listId: string, taskId: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      spaces: ws.spaces.map(space => ({
        ...space,
        spaces: space.spaces?.map(sub => ({
          ...sub,
          lists: sub.lists.map(list => list.id === listId ? {
            ...list,
            tasks: list.tasks.filter(t => t.id !== taskId)
          } : list)
        })) ?? [],
        lists: space.lists.map(list => list.id === listId ? {
          ...list,
          tasks: list.tasks.filter(t => t.id !== taskId)
        } : list)
      }))
    })));
  };

  const toggleSubTask = (taskId: string, subTaskId: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      spaces: ws.spaces.map(space => ({
        ...space,
        spaces: space.spaces?.map(sub => ({
          ...sub,
          lists: sub.lists.map(list => ({
            ...list,
            tasks: list.tasks.map(task => task.id === taskId ? {
              ...task,
              subTasks: task.subTasks?.map(st => st.id === subTaskId ? { ...st, completed: !st.completed } : st)
            } : task)
          }))
        })) ?? [],
        lists: space.lists.map(list => ({
          ...list,
          tasks: list.tasks.map(task => task.id === taskId ? {
            ...task,
            subTasks: task.subTasks?.map(st => st.id === subTaskId ? { ...st, completed: !st.completed } : st)
          } : task)
        }))
      }))
    })));
  };

  const toggleChecklistItem = (listId: string, periodId: string, itemId: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      spaces: ws.spaces.map(space => ({
        ...space,
        spaces: space.spaces?.map(sub => ({
          ...sub,
          lists: sub.lists.map(list => {
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
          })
        })) ?? [],
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
        })
      }))
    })));
  };

  const addMember = (workspaceId: string, member: Member) => {
    setWorkspaces(prev => prev.map(ws => ws.id === workspaceId ? { ...ws, members: [...ws.members, member] } : ws));
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
      deleteTask,
      toggleSubTask,
      toggleChecklistItem,
      addMember,
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
