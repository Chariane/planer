// frontend/src/hooks/usePermissions.ts
import { useMemo } from 'react';
import {
  ROLES,
  type RoleType,
  canManageMembers,
  canCreateContent,
  canInviteMembers,
  canAdminManageTarget,
  canAdminInviteWithRole,
  canDeleteResource,
  isInheritableRole,
  getRoleRank,
} from '../lib/roleHierarchy';

interface UsePermissionsProps {
  userRole?: string | null;
  resourceType?: 'workspace' | 'espace' | 'liste' | 'tache';
  isRootResource?: boolean;
}

export function usePermissions({ 
  userRole, 
  resourceType = 'workspace',
  isRootResource = false 
}: UsePermissionsProps) {
  const role = userRole as RoleType | undefined;

  const permissions = useMemo(() => {
    const isCreator = role === ROLES.CREATOR;
    const isAdmin = role === ROLES.ADMIN;
    const isMember = role === ROLES.MEMBER;
    const isGuest = role === ROLES.GUEST;

    return {
      // Permissions de base
      canRead: !!role,
      canCreateContent: isCreator || isAdmin || isMember,
      canManageMembers: isCreator || isAdmin,
      canInviteMembers: isCreator || isAdmin,
      
      // DELETE: seul le Créateur peut supprimer la ressource racine
      canDelete: isCreator || (isAdmin && !isRootResource),
      
      // Modification: Admin, Créateur et Membre peuvent modifier
      canEdit: isCreator || isAdmin || isMember,
      
      // Menu contextuel: Admin et Créateur le voient, Invité non
      canShowContextMenu: isCreator || isAdmin,
      
      // Gestion des listes: Admin et Créateur
      canManageListe: isCreator || isAdmin,
      
      // Gestion des tâches: Admin, Créateur et Membre
      canManageTache: isCreator || isAdmin || isMember,
      
      // Pour l'invitation
      canInviteWithRole: (invitedRole: string) => {
        if (isCreator) return true;
        if (isAdmin) return canAdminInviteWithRole(invitedRole);
        return false;
      },
      
      canManageTargetMember: (targetRole: string) => {
        if (isCreator) return true;
        if (isAdmin) return canAdminManageTarget(role || '', targetRole);
        return false;
      },
      
      // Informations sur le rôle
      roleRank: getRoleRank(role),
      isInheritable: isInheritableRole(role || ''),
      isCreator,
      isAdmin,
      isMember,
      isGuest,
      
      // Style
      roleBadgeColor: (() => {
        if (isCreator) return 'bg-purple-100 text-purple-700';
        if (isAdmin) return 'bg-orange-100 text-orange-700';
        if (isMember) return 'bg-blue-100 text-blue-700';
        return 'bg-gray-100 text-gray-600';
      })(),
    };
  }, [role, isRootResource]);

  return permissions;
}

// Hook pour vérifier l'accès à une ressource spécifique
export function useResourceAccess({
  userRole,
  resourceRole,
  resourceType = 'workspace',
}: {
  userRole?: string | null;
  resourceRole?: string | null;
  resourceType?: 'workspace' | 'espace' | 'liste' | 'tache';
}) {
  const isGuest = userRole === ROLES.GUEST;
  const isMember = userRole === ROLES.MEMBER;
  const isAdmin = userRole === ROLES.ADMIN;
  const isCreator = userRole === ROLES.CREATOR;
  
  return useMemo(() => ({
    canRead: !!userRole,
    canWrite: isCreator || isAdmin || isMember,
    canConfigure: isCreator || isAdmin,
    canShowContextMenu: isCreator || isAdmin,
    canDelete: isCreator, // Seul le créateur peut supprimer
    canManageMembers: isCreator || isAdmin,
    canAssignMembers: isCreator || isAdmin,
    infoMessage: isGuest ? "⚠️ Vous êtes en mode lecture seule." : null,
  }), [userRole]);
}