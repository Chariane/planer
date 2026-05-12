// frontend/src/hooks/useResourceRole.ts
import { useNavigationStore } from '../store/useNavigationStore';

type ResourceType = 'espace' | 'liste' | 'tache';

export function useResourceRole(
  resourceId: string | undefined,
  resourceType: ResourceType
): {
  role: string | null;
  isLoading: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isGuest: boolean;
  workspaceId: string | null;
  workspaceNom: string | null;
} {
  const { joinedEspaces, joinedListes, joinedTaches, loading } = useNavigationStore();
  
  let resource = null;
  let workspaceId = null;
  let workspaceNom = null;
  
  switch (resourceType) {
    case 'espace':
      resource = joinedEspaces.find(e => e.id === resourceId);
      workspaceId = resource?.workspace_id || null;
      workspaceNom = resource?.workspace_nom || null;
      break;
    case 'liste':
      resource = joinedListes.find(l => l.id === resourceId);
      workspaceId = resource?.workspace_id || null;
      workspaceNom = resource?.workspace_nom || null;
      break;
    case 'tache':
      resource = joinedTaches.find(t => t.id === resourceId);
      workspaceId = resource?.workspace_id || null;
      workspaceNom = resource?.workspace_nom || null;
      break;
  }
  
  const role = resource?.role || null;
  
  return {
    role,
    isLoading: loading,
    isCreator: role === 'Créateur',
    isAdmin: role === 'Administrateur',
    isMember: role === 'Membre',
    isGuest: role === 'Invité',
    workspaceId,
    workspaceNom,
  };
}