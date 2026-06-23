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
  isDirectAdmin?: boolean;  // ✅ NOUVEAU : indique si l'utilisateur est admin direct
}

export function usePermissions({ 
  userRole, 
  resourceType = 'workspace',
  isRootResource = false,
  isDirectAdmin = false,  // ✅ NOUVEAU
}: UsePermissionsProps) {
  const role = userRole as RoleType | undefined;

  const permissions = useMemo(() => {
    const isCreator = role === ROLES.CREATOR;
    const isAdmin = role === ROLES.ADMIN;
    const isMember = role === ROLES.MEMBER;
    const isGuest = role === ROLES.GUEST;

    // ============================================
    // ✅ RÈGLE : Sur une liste, un Admin direct ne peut pas gérer les membres
    // ============================================
    const canManageMembersOnListe = isCreator;  // ✅ Seul le Créateur
    const canInviteMembersOnListe = isCreator;  // ✅ Seul le Créateur

    // Permissions spécifiques aux listes
    if (resourceType === 'liste') {
      return {
        canRead: isCreator || isAdmin || isMember || isGuest,
        canCreateContent: isCreator || isAdmin,
        canManageMembers: canManageMembersOnListe,  // ✅ Changé
        canInviteMembers: canInviteMembersOnListe,  // ✅ Changé
        canDelete: isCreator || (isAdmin && !isRootResource),
        canEdit: isCreator || isAdmin,
        canManageTache: isCreator || isAdmin,
        canManageOwnTache: isMember,
        canShowContextMenu: isCreator || isAdmin,
        canManageListe: isCreator || isAdmin,
        isCreator,
        isAdmin,
        isMember,
        isGuest,
        roleRank: getRoleRank(role),
        roleBadgeColor: (() => {
          if (isCreator) return 'bg-purple-100 text-purple-700';
          if (isAdmin) return 'bg-orange-100 text-orange-700';
          if (isMember) return 'bg-blue-100 text-blue-700';
          return 'bg-gray-100 text-gray-600';
        })(),
      };
    }

    // ============================================
    // ✅ RÈGLE : Sur un espace ou workspace, un Admin direct ne peut pas gérer les membres
    // ============================================
    const canManageMembersOnResource = isCreator;  // ✅ Seul le Créateur
    const canInviteMembersOnResource = isCreator || isAdmin;  // ✅ Les Admins peuvent inviter

    return {
      canRead: !!role,
      canCreateContent: isCreator || isAdmin || isMember,
      canManageMembers: canManageMembersOnResource,  // ✅ Changé
      canInviteMembers: canInviteMembersOnResource,  // ✅ Inchangé
      canDelete: isCreator || (isAdmin && !isRootResource),
      canEdit: isCreator || isAdmin || isMember,
      canShowContextMenu: isCreator || isAdmin,
      canManageListe: (resourceType === 'espace' || resourceType === 'workspace') 
        ? (isCreator || isAdmin)
        : (isCreator || isAdmin),
      canManageTache: isCreator || isAdmin || isMember,
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
      roleRank: getRoleRank(role),
      isInheritable: isInheritableRole(role || ''),
      isCreator,
      isAdmin,
      isMember,
      isGuest,
      roleBadgeColor: (() => {
        if (isCreator) return 'bg-purple-100 text-purple-700';
        if (isAdmin) return 'bg-orange-100 text-orange-700';
        if (isMember) return 'bg-blue-100 text-blue-700';
        return 'bg-gray-100 text-gray-600';
      })(),
    };
  }, [role, isRootResource, resourceType]);

  return permissions;
}

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
    canDelete: isCreator,
    canManageMembers: isCreator,  // ✅ Changé
    canAssignMembers: isCreator,  // ✅ Changé
    infoMessage: isGuest ? "⚠️ Vous êtes en mode lecture seule." : null,
  }), [userRole]);
}