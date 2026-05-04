import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useNavigationStore } from '../store/useNavigationStore';

interface ActiveResourceContextProps {
    workspaceId?: string;
    spaceId?: string;
    listId?: string;
    taskId?: string;
}

const ActiveResourceContext = createContext<ActiveResourceContextProps>({});

export const useActiveResource = () => useContext(ActiveResourceContext);

export function ActiveResourceProvider({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    const params = useParams();
    const getResourceContext = useNavigationStore(state => state.getResourceContext);

    let workspaceId, spaceId, listId, taskId;

    // Si on est sur une ancienne route hiérarchique (fallback utile pour certaines redirections)
    if (params.workspaceId) {
        workspaceId = params.workspaceId;
        spaceId = params.spaceId || params.espaceId;
        listId = params.listId || params.listeId;
        taskId = params.tacheId;
    }
    // Si on est sur les nouvelles routes plates
    else if (params.id) {
        if (pathname.startsWith('/workspace/')) {
            workspaceId = params.id;
        } else if (pathname.startsWith('/espace/')) {
            spaceId = params.id;
            const ctx = getResourceContext('espace', params.id);
            workspaceId = ctx?.workspace_id;
        } else if (pathname.startsWith('/liste/')) {
            listId = params.id;
            const ctx = getResourceContext('liste', params.id);
            workspaceId = ctx?.workspace_id;
            spaceId = ctx?.id_espace;
        } else if (pathname.startsWith('/tache/')) {
            taskId = params.id;
            const ctx = getResourceContext('tache', params.id);
            workspaceId = ctx?.workspace_id;
            spaceId = ctx?.id_espace;
            listId = ctx?.id_liste;
        }
    }

    return (
        <ActiveResourceContext.Provider value={{ workspaceId, spaceId, listId, taskId }}>
            {children}
        </ActiveResourceContext.Provider>
    );
}
