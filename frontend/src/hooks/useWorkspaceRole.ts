// frontend/src/hooks/useWorkspaceRole.ts
import { useNavigationStore } from '../store/useNavigationStore';

export function useWorkspaceRole(workspaceId: string | undefined): {
  role: string | null;
  isLoading: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isGuest: boolean;
} {
  const { ownedWorkspaces, joinedWorkspaces, loading } = useNavigationStore();
  
  const workspace = ownedWorkspaces.find(w => w.id === workspaceId) 
    || joinedWorkspaces.find(w => w.id === workspaceId);
  
  const role = workspace?.current_user_role || null;
  
  return {
    role,
    isLoading: loading,
    isCreator: role === 'Créateur',
    isAdmin: role === 'Administrateur',
    isMember: role === 'Membre',
    isGuest: role === 'Invité',
  };
}