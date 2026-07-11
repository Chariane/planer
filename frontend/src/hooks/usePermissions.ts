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
  isInheritedAdmin?: boolean;
  isDirectCreator?: boolean;
  isInheritedCreator?: boolean;
}

export function usePermissions({ 
  userRole, 
  resourceType = 'workspace',
  isRootResource = false,
  isDirectAdmin = false,
  isInheritedAdmin = false,
  isDirectCreator = false,
  isInheritedCreator = false,
}: UsePermissionsProps) {
  const role = userRole as RoleType | undefined;

  const permissions = useMemo(() => {
    const isCreator = role === ROLES.CREATOR;
    const isAdmin = role === ROLES.ADMIN;
    const isMember = role === ROLES.MEMBER;
    const isGuest = role === ROLES.GUEST;

// ============================================
// ✅ RÈGLES POUR LES ESPACES
// ============================================
if (resourceType === 'espace') {
  // Règles spécifiques aux espaces :
  // - Créateur DIRECT : peut tout gérer (ajouter, modifier, retirer)
  // - Admin DIRECT : peut inviter avec Membre/Invité ✅
  // - Admin par héritage (workspace) : peut promouvoir uniquement et inviter avec Admin
  // - Créateur par héritage (workspace) : peut promouvoir uniquement et inviter avec Admin
  const canManageMembersOnEspace = isDirectCreator || (isInheritedCreator && !isDirectAdmin) || (isInheritedAdmin && !isDirectAdmin);
  // ✅ CORRECTION : Admin direct peut inviter
  const canInviteMembersOnEspace = isDirectCreator || isInheritedCreator || isInheritedAdmin || isDirectAdmin;
  const canDeleteMemberOnEspace = isDirectCreator;

  return {
    canRead: !!role,
    canCreateContent: isCreator || isAdmin || isMember,
    canManageMembers: canManageMembersOnEspace,
    // ✅ CORRECTION
    canInviteMembers: canInviteMembersOnEspace,
    canDeleteMember: canDeleteMemberOnEspace,
    canDelete: isDirectCreator || (isAdmin && !isRootResource),
    canEdit: isCreator || isAdmin || isMember,
    canShowContextMenu: isCreator || isAdmin,
    canManageListe: isCreator || isAdmin,
    canManageTache: isCreator || isAdmin || isMember,
    canInviteWithRole: (invitedRole: string) => {
      if (isDirectCreator) return true;
      if (isInheritedCreator) return true;
      if (isDirectAdmin) {
        // ✅ CORRECTION : Admin direct peut inviter avec Membre ou Invité
        return invitedRole === ROLES.MEMBER || invitedRole === ROLES.GUEST;
      }
      if (isInheritedAdmin) {
        return invitedRole === ROLES.MEMBER || invitedRole === ROLES.GUEST || invitedRole === ROLES.ADMIN;
      }
      if (isAdmin) {
        return canAdminInviteWithRole(invitedRole);
      }
      return false;
    },
    canManageTargetMember: (targetRole: string) => {
      if (isDirectCreator) return true;
      if (isInheritedCreator) {
        const targetRank = getRoleRank(targetRole);
        const actorRank = getRoleRank(role);
        return targetRank > actorRank;
      }
      if (isAdmin) {
        if (isDirectAdmin) return false;
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
        isDirectAdmin,
        isInheritedAdmin,
        isDirectCreator,
        isInheritedCreator,
        roleBadgeColor: (() => {
          if (isDirectCreator) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
          if (isCreator) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
          if (isDirectAdmin) return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
          if (isAdmin) return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
          if (isMember) return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
          if (isInheritedAdmin) return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
          if (isInheritedCreator) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
          return 'bg-gray-500/10 text-gray-500 border border-gray-500/20';
        })(),
        roleType: isDirectCreator ? 'direct_creator' 
          : isCreator ? 'creator' 
          : isDirectAdmin ? 'direct_admin' 
          : isAdmin ? 'admin' 
          : isInheritedAdmin ? 'inherited_admin' 
          : isInheritedCreator ? 'inherited_creator' 
          : isMember ? 'member' 
          : isGuest ? 'guest' 
          : 'none',
        canPromoteOnly: isInheritedAdmin || isInheritedCreator,
        canAddMembers: isDirectCreator || isInheritedCreator,
      };
    }

    // ============================================
    // ✅ RÈGLES POUR LES LISTES
    // ============================================
    if (resourceType === 'liste') {
      // Règles spécifiques aux listes :
      // - Créateur DIRECT : peut tout gérer (ajouter, modifier, retirer)
      // - Admin DIRECT : ne peut RIEN gérer
      // - Admin par héritage (workspace/espace) : peut promouvoir uniquement
      // - Créateur par héritage (workspace/espace) : peut promouvoir uniquement
      const canManageMembersOnListe = isDirectCreator || (isInheritedCreator && !isDirectAdmin) || (isInheritedAdmin && !isDirectAdmin);
      const canInviteMembersOnListe = isDirectCreator || isInheritedCreator || (isInheritedAdmin && !isDirectAdmin);
      const canDeleteMemberOnListe = isDirectCreator;

      return {
        canRead: isCreator || isAdmin || isMember || isGuest,
        canCreateContent: isCreator || isAdmin,
        canManageMembers: canManageMembersOnListe,
        canInviteMembers: canInviteMembersOnListe,
        canDeleteMember: canDeleteMemberOnListe,
        canDelete: isDirectCreator || (isAdmin && !isRootResource),
        canEdit: isCreator || isAdmin,
        canManageTache: isCreator || isAdmin,
        canManageOwnTache: isMember,
        canShowContextMenu: isCreator || isAdmin,
        canManageListe: isCreator || isAdmin,
        isCreator,
        isAdmin,
        isMember,
        isGuest,
        isDirectAdmin,
        isInheritedAdmin,
        isDirectCreator,
        isInheritedCreator,
        roleRank: getRoleRank(role),
        roleBadgeColor: (() => {
          if (isDirectCreator) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
          if (isCreator) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
          if (isDirectAdmin) return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
          if (isAdmin) return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
          if (isMember) return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
          if (isInheritedAdmin) return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
          if (isInheritedCreator) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
          return 'bg-gray-500/10 text-gray-500 border border-gray-500/20';
        })(),
        roleType: isDirectCreator ? 'direct_creator' 
          : isCreator ? 'creator' 
          : isDirectAdmin ? 'direct_admin' 
          : isAdmin ? 'admin' 
          : isInheritedAdmin ? 'inherited_admin' 
          : isInheritedCreator ? 'inherited_creator' 
          : isMember ? 'member' 
          : isGuest ? 'guest' 
          : 'none',
        canPromoteOnly: isInheritedAdmin || isInheritedCreator,
        canAddMembers: isDirectCreator || isInheritedCreator,
      };
    }

// ============================================
// ✅ RÈGLES POUR LES WORKSPACES
// ============================================
if (resourceType === 'workspace') {
  // Règles spécifiques aux workspaces :
  // - Créateur : peut tout gérer (ajouter, modifier, retirer)
  // - Admin : peut gérer les membres (modifier, retirer)
  const canManageMembersOnWorkspace = isCreator || isAdmin;
  const canInviteMembersOnWorkspace = isCreator || isAdmin;
  // ✅ AJOUT : Le créateur peut retirer les membres
  const canDeleteMemberOnWorkspace = isCreator;

  return {
    canRead: !!role,
    canCreateContent: isCreator || isAdmin || isMember,
    canManageMembers: canManageMembersOnWorkspace,
    canInviteMembers: canInviteMembersOnWorkspace,
    // ✅ AJOUT
    canDeleteMember: canDeleteMemberOnWorkspace,
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
    isDirectAdmin: false,
    isInheritedAdmin: false,
    isDirectCreator: isCreator,
    isInheritedCreator: false,
    roleBadgeColor: (() => {
      if (isCreator) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
      if (isAdmin) return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
      if (isMember) return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      return 'bg-gray-500/10 text-gray-500 border border-gray-500/20';
    })(),
    roleType: isCreator ? 'creator' : isAdmin ? 'admin' : isMember ? 'member' : 'none',
    canPromoteOnly: false,
    canAddMembers: isCreator || isAdmin,
  };
}

    // ============================================
    // ✅ RÈGLES POUR LES TÂCHES
    // ============================================
    if (resourceType === 'tache') {
      const canManageMembersOnTache = isDirectCreator || isAdmin || (isInheritedAdmin && !isDirectAdmin) || isInheritedCreator;
      const canInviteMembersOnTache = isDirectCreator || isAdmin || isInheritedAdmin || isInheritedCreator;

      return {
        canRead: !!role,
        canCreateContent: isCreator || isAdmin || isMember,
        canManageMembers: canManageMembersOnTache,
        canInviteMembers: canInviteMembersOnTache,
        canDeleteMember: isDirectCreator || isAdmin,
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
        isDirectAdmin,
        isInheritedAdmin,
        isDirectCreator,
        isInheritedCreator,
        roleBadgeColor: (() => {
          if (isDirectCreator) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
          if (isCreator) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
          if (isDirectAdmin) return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
          if (isAdmin) return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
          if (isMember) return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
          if (isInheritedAdmin) return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
          if (isInheritedCreator) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
          return 'bg-gray-500/10 text-gray-500 border border-gray-500/20';
        })(),
        roleType: isDirectCreator ? 'direct_creator' 
          : isCreator ? 'creator' 
          : isDirectAdmin ? 'direct_admin' 
          : isAdmin ? 'admin' 
          : isInheritedAdmin ? 'inherited_admin' 
          : isInheritedCreator ? 'inherited_creator' 
          : isMember ? 'member' 
          : isGuest ? 'guest' 
          : 'none',
        canPromoteOnly: isInheritedAdmin || isInheritedCreator,
        canAddMembers: isDirectCreator || isInheritedCreator,
      };
    }

    // ============================================
    // ✅ FALLBACK (ne devrait pas arriver)
    // ============================================
    return {
      canRead: !!role,
      canCreateContent: isCreator || isAdmin || isMember,
      canManageMembers: isCreator || isAdmin,
      canInviteMembers: isCreator || isAdmin,
      canDeleteMember: isCreator,
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
      isDirectAdmin: false,
      isInheritedAdmin: false,
      isDirectCreator: false,
      isInheritedCreator: false,
      roleBadgeColor: (() => {
        if (isCreator) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
        if (isAdmin) return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
        if (isMember) return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
        return 'bg-gray-500/10 text-gray-500 border border-gray-500/20';
      })(),
      roleType: isCreator ? 'creator' : isAdmin ? 'admin' : isMember ? 'member' : 'none',
      canPromoteOnly: false,
      canAddMembers: isCreator || isAdmin,
    };
  }, [role, isRootResource, resourceType, isDirectAdmin, isInheritedAdmin, isDirectCreator, isInheritedCreator]);

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