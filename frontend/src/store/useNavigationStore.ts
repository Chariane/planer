import { create } from 'zustand';
import type { Workspace, JoinedResource } from '../types';

interface NavigationState {
    ownedWorkspaces: Workspace[];
    joinedWorkspaces: Workspace[];
    joinedEspaces: JoinedResource[];
    joinedListes: JoinedResource[];
    joinedTaches: JoinedResource[];

    loadNavigation: (data: Partial<NavigationState>) => void;
    checkAccess: (type: 'workspace' | 'espace' | 'liste' | 'tache', id: string) => boolean;
    getResourceContext: (type: 'workspace' | 'espace' | 'liste' | 'tache', id: string) => any;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
    ownedWorkspaces: [],
    joinedWorkspaces: [],
    joinedEspaces: [],
    joinedListes: [],
    joinedTaches: [],

    // Charge les données brutes depuis l'API sans fabriquer de hiérarchie.
    loadNavigation: (data) => set({ ...data }),

    // C'est le coeur du système d'autorisation.
    checkAccess: (type, id) => {
        const state = get();
        if (!id) return false;

        switch (type) {
            case 'workspace':
                return state.ownedWorkspaces.some(w => w.id === id) ||
                    state.joinedWorkspaces.some(w => w.id === id);
            case 'espace':
                return state.joinedEspaces.some(e => e.id === id);
            case 'liste':
                return state.joinedListes.some(l => l.id === id);
            case 'tache':
                return state.joinedTaches.some(t => t.id === id);
            default:
                return false;
        }
    },

    getResourceContext: (type, id) => {
        const state = get();
        if (!id) return null;
        switch (type) {
            case 'workspace':
                return state.ownedWorkspaces.find(w => w.id === id) || state.joinedWorkspaces.find(w => w.id === id) || null;
            case 'espace':
                return state.joinedEspaces.find(e => e.id === id) || null;
            case 'liste':
                return state.joinedListes.find(l => l.id === id) || null;
            case 'tache':
                return state.joinedTaches.find(t => t.id === id) || null;
            default:
                return null;
        }
    }
}));
