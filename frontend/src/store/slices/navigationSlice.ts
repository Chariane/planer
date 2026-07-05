// src/store/slices/navigationSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface NavigationState {
  activeWorkspaceId: string | null;
  activeEspaceId: string | null;
  activeListeId: string | null;
  activeTacheId: string | null;
  breadcrumb: Array<{
    label: string;
    path: string;
    type: 'workspace' | 'espace' | 'liste' | 'tache';
  }>;
  selectedResourceId: string | null;
  selectedResourceType: 'workspace' | 'espace' | 'liste' | 'tache' | null;
}

const initialState: NavigationState = {
  activeWorkspaceId: null,
  activeEspaceId: null,
  activeListeId: null,
  activeTacheId: null,
  breadcrumb: [],
  selectedResourceId: null,
  selectedResourceType: null,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setActiveWorkspace: (state, action: PayloadAction<string | null>) => {
      state.activeWorkspaceId = action.payload;
      // Reset des sous-niveaux
      if (action.payload === null) {
        state.activeEspaceId = null;
        state.activeListeId = null;
        state.activeTacheId = null;
        state.breadcrumb = [];
      }
    },
    setActiveEspace: (state, action: PayloadAction<string | null>) => {
      state.activeEspaceId = action.payload;
      if (action.payload === null) {
        state.activeListeId = null;
        state.activeTacheId = null;
      }
    },
    setActiveListe: (state, action: PayloadAction<string | null>) => {
      state.activeListeId = action.payload;
      if (action.payload === null) {
        state.activeTacheId = null;
      }
    },
    setActiveTache: (state, action: PayloadAction<string | null>) => {
      state.activeTacheId = action.payload;
    },
    setBreadcrumb: (state, action: PayloadAction<NavigationState['breadcrumb']>) => {
      state.breadcrumb = action.payload;
    },
    addBreadcrumbItem: (state, action: PayloadAction<NavigationState['breadcrumb'][0]>) => {
      state.breadcrumb.push(action.payload);
    },
    removeLastBreadcrumb: (state) => {
      state.breadcrumb.pop();
    },
    clearBreadcrumb: (state) => {
      state.breadcrumb = [];
    },
    setSelectedResource: (
      state,
      action: PayloadAction<{ id: string; type: 'workspace' | 'espace' | 'liste' | 'tache' } | null>
    ) => {
      state.selectedResourceId = action.payload?.id || null;
      state.selectedResourceType = action.payload?.type || null;
    },
    clearNavigation: (state) => {
      state.activeWorkspaceId = null;
      state.activeEspaceId = null;
      state.activeListeId = null;
      state.activeTacheId = null;
      state.breadcrumb = [];
      state.selectedResourceId = null;
      state.selectedResourceType = null;
    },
    // Navigation directe vers une ressource
    navigateTo: (
      state,
      action: PayloadAction<{
        workspaceId?: string | null;
        espaceId?: string | null;
        listeId?: string | null;
        tacheId?: string | null;
      }>
    ) => {
      const { workspaceId, espaceId, listeId, tacheId } = action.payload;
      
      if (workspaceId !== undefined) {
        state.activeWorkspaceId = workspaceId;
        if (workspaceId === null) {
          state.activeEspaceId = null;
          state.activeListeId = null;
          state.activeTacheId = null;
          state.breadcrumb = [];
        }
      }
      if (espaceId !== undefined) {
        state.activeEspaceId = espaceId;
        if (espaceId === null) {
          state.activeListeId = null;
          state.activeTacheId = null;
        }
      }
      if (listeId !== undefined) {
        state.activeListeId = listeId;
        if (listeId === null) {
          state.activeTacheId = null;
        }
      }
      if (tacheId !== undefined) {
        state.activeTacheId = tacheId;
      }
    },
  },
});

export const {
  setActiveWorkspace,
  setActiveEspace,
  setActiveListe,
  setActiveTache,
  setBreadcrumb,
  addBreadcrumbItem,
  removeLastBreadcrumb,
  clearBreadcrumb,
  setSelectedResource,
  clearNavigation,
  navigateTo,
} = navigationSlice.actions;

export default navigationSlice.reducer;