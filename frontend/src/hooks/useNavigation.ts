// src/hooks/useNavigation.ts
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import {
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
} from '../store/slices/navigationSlice';

export const useNavigation = () => {
  const dispatch = useAppDispatch();
  const navigation = useAppSelector((state) => state.navigation);

  return {
    // State
    activeWorkspaceId: navigation.activeWorkspaceId,
    activeEspaceId: navigation.activeEspaceId,
    activeListeId: navigation.activeListeId,
    activeTacheId: navigation.activeTacheId,
    breadcrumb: navigation.breadcrumb,
    selectedResourceId: navigation.selectedResourceId,
    selectedResourceType: navigation.selectedResourceType,

    // Actions
    setActiveWorkspace: (id: string | null) => dispatch(setActiveWorkspace(id)),
    setActiveEspace: (id: string | null) => dispatch(setActiveEspace(id)),
    setActiveListe: (id: string | null) => dispatch(setActiveListe(id)),
    setActiveTache: (id: string | null) => dispatch(setActiveTache(id)),
    setBreadcrumb: (breadcrumb: typeof navigation.breadcrumb) =>
      dispatch(setBreadcrumb(breadcrumb)),
    addBreadcrumbItem: (item: typeof navigation.breadcrumb[0]) =>
      dispatch(addBreadcrumbItem(item)),
    removeLastBreadcrumb: () => dispatch(removeLastBreadcrumb()),
    clearBreadcrumb: () => dispatch(clearBreadcrumb()),
    setSelectedResource: (id: string | null, type: 'workspace' | 'espace' | 'liste' | 'tache' | null) =>
      dispatch(setSelectedResource(id && type ? { id, type } : null)),
    clearNavigation: () => dispatch(clearNavigation()),
    navigateTo: (params: {
      workspaceId?: string | null;
      espaceId?: string | null;
      listeId?: string | null;
      tacheId?: string | null;
    }) => dispatch(navigateTo(params)),
  };
};