// frontend/src/lib/roleHierarchy.ts

/**
 * Hiérarchie des rôles pour K-Planner
 * À synchroniser strictement avec le backend
 */

export const ROLES = {
  CREATOR: 'Créateur',
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
  GUEST: 'Invité',
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

// Hiérarchie des rôles (doit correspondre au backend)
export const ROLE_RANKS: Record<RoleType, number> = {
  [ROLES.GUEST]: 1,
  [ROLES.MEMBER]: 2,
  [ROLES.ADMIN]: 3,
  [ROLES.CREATOR]: 4,
};

// Rôles qui héritent automatiquement vers les descendants
export const INHERITED_ROLES = new Set<RoleType>([
  ROLES.CREATOR,
  ROLES.ADMIN,
  ROLES.MEMBER,
  ROLES.GUEST,
]);

// Rôles disponibles pour l'invitation (sans Créateur)
export const INVITABLE_ROLES: RoleType[] = [
  ROLES.GUEST,
  ROLES.MEMBER,
  ROLES.ADMIN,
];

// Rôles qu'un Admin peut gérer (modifier/supprimer)
export const ADMIN_MANAGEABLE_ROLES: RoleType[] = [
  ROLES.MEMBER,
  ROLES.GUEST,
];

// Rôles qu'un Admin peut inviter (Membre et Invité uniquement)
export const ADMIN_INVITABLE_ROLES: RoleType[] = [
  ROLES.MEMBER,
  ROLES.GUEST,
];

// Tous les rôles pour les sélecteurs de gestion
export const ALL_ROLES: RoleType[] = [
  ROLES.CREATOR,
  ROLES.ADMIN,
  ROLES.MEMBER,
  ROLES.GUEST,
];

// Rôles qui permettent la gestion des membres
export const MANAGEMENT_ROLES: RoleType[] = [
  ROLES.CREATOR,
  ROLES.ADMIN,
];

// Rôles qui permettent la création de contenu
export const CONTENT_CREATION_ROLES: RoleType[] = [
  ROLES.CREATOR,
  ROLES.ADMIN,
  ROLES.MEMBER,
];

/**
 * Obtenir le rang d'un rôle
 */
export function getRoleRank(role: string | null | undefined): number {
  if (!role) return 0;
  return ROLE_RANKS[role as RoleType] || 0;
}

/**
 * Vérifie si un rôle est supérieur à un autre
 */
export function isRoleSuperior(role1: string, role2: string): boolean {
  return getRoleRank(role1) > getRoleRank(role2);
}

/**
 * Vérifie si un rôle est inférieur ou égal à un autre
 */
export function isRoleInferiorOrEqual(role1: string, role2: string): boolean {
  return getRoleRank(role1) <= getRoleRank(role2);
}

/**
 * Vérifie si un utilisateur peut gérer les membres
 */
export function canManageMembers(userRole: string): boolean {
  return MANAGEMENT_ROLES.includes(userRole as RoleType);
}

/**
 * Vérifie si un utilisateur peut créer du contenu
 */
export function canCreateContent(userRole: string): boolean {
  return CONTENT_CREATION_ROLES.includes(userRole as RoleType);
}

/**
 * Vérifie si un utilisateur peut inviter des membres
 */
export function canInviteMembers(userRole: string): boolean {
  return MANAGEMENT_ROLES.includes(userRole as RoleType);
}

/**
 * Vérifie si un Admin peut gérer un membre cible
 */
export function canAdminManageTarget(adminRole: string, targetRole: string): boolean {
  if (adminRole !== ROLES.ADMIN) return false;
  return ADMIN_MANAGEABLE_ROLES.includes(targetRole as RoleType);
}

/**
 * Vérifie si un Admin peut inviter avec un rôle spécifique
 */
export function canAdminInviteWithRole(role: string): boolean {
  return ADMIN_INVITABLE_ROLES.includes(role as RoleType);
}

/**
 * Vérifie si l'utilisateur peut supprimer une ressource
 * Seul le Créateur peut supprimer la ressource racine
 */
export function canDeleteResource(role: string, isRootResource: boolean = false): boolean {
  if (role === ROLES.CREATOR) return true;
  if (role === ROLES.ADMIN && !isRootResource) return true;
  return false;
}

/**
 * Retourne le libellé d'un rôle pour l'affichage
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    [ROLES.CREATOR]: '👑 Créateur',
    [ROLES.ADMIN]: '🔐 Administrateur',
    [ROLES.MEMBER]: '👤 Membre',
    [ROLES.GUEST]: '👁️ Invité',
  };
  return labels[role] || role;
}

/**
 * Retourne la description d'un rôle
 */
export function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    [ROLES.CREATOR]: 'Contrôle total. Hérite automatiquement.',
    [ROLES.ADMIN]: 'Gestion complète. Hérite automatiquement.',
    [ROLES.MEMBER]: 'Accès complet local. N\'hérite pas.',
    [ROLES.GUEST]: 'Lecture seule. Hérite automatiquement.',
  };
  return descriptions[role] || '';
}

/**
 * Récupère les rôles disponibles pour l'invitation selon le rôle de l'inviteur
 */
export function getAvailableInvitationRoles(inviterRole: string): RoleType[] {
  if (inviterRole === ROLES.CREATOR) {
    return INVITABLE_ROLES; // Invité et Administrateur
  }
  if (inviterRole === ROLES.ADMIN) {
    return ADMIN_INVITABLE_ROLES; // Membre et Invité uniquement
  }
  return [];
}

/**
 * Génère un message d'erreur pour rôle redondant
 */
export function genererMessageErreurClientRoleRedondant(
  inheritedRole: string,
  parentType: string,
): string {
  return `⚠️ Rôle non permis : L'utilisateur possède déjà le rôle "${inheritedRole}" hérité depuis le ${parentType} parent.`;
}

/**
 * Vérifie si l'utilisateur peut modifier du contenu
 */
export function canEditContent(userRole: string, contentOwnerRole: string | null): boolean {
  const canCreate = canCreateContent(userRole);
  if (!canCreate) return false;

  if (contentOwnerRole) {
    return getRoleRank(userRole) >= getRoleRank(contentOwnerRole);
  }

  return true;
}

/**
 * Vérifie si un rôle est héritable
 */
export function isInheritableRole(role: string): boolean {
  return INHERITED_ROLES.has(role as RoleType);
}

/**
 * Vérifie si un rôle est local
 */
export function isLocalRole(role: string): boolean {
  return !isInheritableRole(role);
}

/**
 * Vérifie si un utilisateur possède une permission
 */
export function hasPermission(role: string, permission: string): boolean {
  const permissions: Record<RoleType, Record<string, boolean>> = {
    [ROLES.CREATOR]: {
      read: true,
      create: true,
      edit: true,
      delete: true,
      manage_members: true,
      change_role: true,
      remove_member: true,
      invite_member: true,
    },
    [ROLES.ADMIN]: {
      read: true,
      create: true,
      edit: true,
      delete: false, // L'Admin ne peut pas supprimer la ressource racine
      manage_members: true,
      change_role: false,
      remove_member: true,
      invite_member: true,
    },
    [ROLES.MEMBER]: {
      read: true,
      create: true,
      edit: true,
      delete: false,
      manage_members: false,
      change_role: false,
      remove_member: false,
      invite_member: false,
    },
    [ROLES.GUEST]: {
      read: true,
      create: false,
      edit: false,
      delete: false,
      manage_members: false,
      change_role: false,
      remove_member: false,
      invite_member: false,
    },
  };
  const perms = permissions[role as RoleType];
  return perms ? perms[permission] : false;
}
