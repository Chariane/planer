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
  isDirectAdmin?: boolean;
  isInheritedAdmin?: boolean;  // ✅ NOUVEAU
}

export function usePermissions({ 
  userRole, 
  resourceType = 'workspace',
  isRootResource = false,
  isDirectAdmin = false,
  isInheritedAdmin = false,  // ✅ NOUVEAU
}: UsePermissionsProps) {
  const role = userRole as RoleType | undefined;

  const permissions = useMemo(() => {
    const isCreator = role === ROLES.CREATOR;
    const isAdmin = role === ROLES.ADMIN;
    const isMember = role === ROLES.MEMBER;
    const isGuest = role === ROLES.GUEST;

    // ============================================
    // ✅ RÈGLE : Sur une liste, un Admin direct ne peut pas gérer les membres
    // ✅ RÈGLE : Admin par héritage peut promouvoir
    // ============================================
    const canManageMembersOnListe = isCreator || (isInheritedAdmin && !isDirectAdmin);
    const canInviteMembersOnListe = isCreator || isInheritedAdmin;

    // ============================================
    // ✅ RÈGLE : Sur un espace, un Admin direct ne peut pas gérer les membres
    // ✅ RÈGLE : Admin par héritage peut promouvoir
    // ============================================
    const canManageMembersOnEspace = isCreator || (isInheritedAdmin && !isDirectAdmin);
    const canInviteMembersOnEspace = isCreator || isInheritedAdmin || (isAdmin && !isDirectAdmin);

    // ============================================
    // ✅ RÈGLE : Sur un workspace, le Créateur peut gérer tous les membres
    // ============================================
    const canManageMembersOnWorkspace = isCreator || isAdmin;
    const canInviteMembersOnWorkspace = isCreator || isAdmin;

    // Permissions spécifiques aux listes
    if (resourceType === 'liste') {
      return {
        canRead: isCreator || isAdmin || isMember || isGuest,
        canCreateContent: isCreator || isAdmin,
        canManageMembers: canManageMembersOnListe,
        canInviteMembers: canInviteMembersOnListe,
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
        isInheritedAdmin,
        roleRank: getRoleRank(role),
        roleBadgeColor: (() => {
          if (isCreator) return 'bg-purple-100 text-purple-700';
          if (isAdmin) return 'bg-orange-100 text-orange-700';
          if (isMember) return 'bg-blue-100 text-blue-700';
          return 'bg-gray-100 text-gray-600';
        })(),
      };
    }

    // ✅ WORKSPACE : Le Créateur peut tout gérer, l'Admin peut gérer les membres
    if (resourceType === 'workspace') {
      return {
        canRead: !!role,
        canCreateContent: isCreator || isAdmin || isMember,
        canManageMembers: canManageMembersOnWorkspace,
        canInviteMembers: canInviteMembersOnWorkspace,
        canDelete: isCreator,
        canEdit: isCreator || isAdmin || isMember,
        canShowContextMenu: isCreator || isAdmin,
        canManageListe: isCreator || isAdmin,
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
        isInheritedAdmin: false,
        roleBadgeColor: (() => {
          if (isCreator) return 'bg-purple-100 text-purple-700';
          if (isAdmin) return 'bg-orange-100 text-orange-700';
          if (isMember) return 'bg-blue-100 text-blue-700';
          return 'bg-gray-100 text-gray-600';
        })(),
      };
    }

    // ============================================
    // ✅ RÈGLE : Sur un espace, un Admin direct ne peut pas gérer les membres
    // ✅ RÈGLE : Admin par héritage peut promouvoir
    // ============================================
    const canManageMembersOnResource = isCreator || (isInheritedAdmin && !isDirectAdmin);
    const canInviteMembersOnResource = isCreator || isInheritedAdmin || (isAdmin && !isDirectAdmin);

    // ✅ RÈGLE : Pour les tâches, le Créateur et l'Admin peuvent gérer
    const canManageMembersOnTache = isCreator || isAdmin || (isInheritedAdmin && !isDirectAdmin);
    const canInviteMembersOnTache = isCreator || isAdmin || isInheritedAdmin;

    // ============================================
    // ✅ RÈGLE : Tâches - gestion des membres
    // ============================================
    if (resourceType === 'tache') {
      return {
        canRead: !!role,
        canCreateContent: isCreator || isAdmin || isMember,
        canManageMembers: canManageMembersOnTache,
        canInviteMembers: canInviteMembersOnTache,
        canDelete: isCreator || (isAdmin && !isRootResource),
        canEdit: isCreator || isAdmin || isMember,
        canShowContextMenu: isCreator || isAdmin,
        canManageListe: isCreator || isAdmin,
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
        isInheritedAdmin,
        roleBadgeColor: (() => {
          if (isCreator) return 'bg-purple-100 text-purple-700';
          if (isAdmin) return 'bg-orange-100 text-orange-700';
          if (isMember) return 'bg-blue-100 text-blue-700';
          return 'bg-gray-100 text-gray-600';
        })(),
      };
    }

    // ✅ ESPACE (fallback)
    return {
      canRead: !!role,
      canCreateContent: isCreator || isAdmin || isMember,
      canManageMembers: canManageMembersOnResource,
      canInviteMembers: canInviteMembersOnResource,
      canDelete: isCreator || (isAdmin && !isRootResource),
      canEdit: isCreator || isAdmin || isMember,
      canShowContextMenu: isCreator || isAdmin,
      canManageListe: isCreator || isAdmin,
      canManageTache: isCreator || isAdmin || isMember,
      canInviteWithRole: (invitedRole: string) => {
        if (isCreator) return true;
        if (isAdmin) {
          if (isDirectAdmin && resourceType === 'espace') {
            return invitedRole === ROLES.MEMBER || invitedRole === ROLES.GUEST;
          }
          return canAdminInviteWithRole(invitedRole);
        }
        return false;
      },
      canManageTargetMember: (targetRole: string) => {
        if (isCreator) return true;
        if (isAdmin) {
          if (isDirectAdmin && resourceType === 'espace') {
            return false;
          }
          return canAdminManageTarget(role || '', targetRole);
        }
        return false;
      },
      roleRank: getRoleRank(role),
      isInheritable: isInheritableRole(role || ''),
      isCreator,
      isAdmin,
      isMember,
      isGuest,
      isInheritedAdmin,
      roleBadgeColor: (() => {
        if (isCreator) return 'bg-purple-100 text-purple-700';
        if (isAdmin) return 'bg-orange-100 text-orange-700';
        if (isMember) return 'bg-blue-100 text-blue-700';
        return 'bg-gray-100 text-gray-600';
      })(),
    };
  }, [role, isRootResource, resourceType, isDirectAdmin, isInheritedAdmin]);

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
    canManageMembers: isCreator || (resourceRole === ROLES.ADMIN && !isAdmin),
    canAssignMembers: isCreator || (resourceRole === ROLES.ADMIN && !isAdmin),
    infoMessage: isGuest ? "⚠️ Vous êtes en mode lecture seule." : null,
  }), [userRole, resourceRole]);
}