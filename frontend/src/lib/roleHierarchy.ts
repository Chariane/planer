// frontend/src/lib/roleHierarchy.ts

/**
 * Hiérarchie des rôles pour K-Planner
 * Utilisé pour valider les rôles côté CLIENT (le serveur fait la validation définitive)
 */

export const ROLES = {
  CREATOR: 'Créateur',
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
  GUEST: 'Invité',
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

export const ROLE_RANKS: Record<RoleType, number> = {
  [ROLES.GUEST]: 1,
  [ROLES.MEMBER]: 2,
  [ROLES.ADMIN]: 3,
  [ROLES.CREATOR]: 4,
};

/**
 * Rôles qui héritent automatiquement vers les descendants
 * Seul "Membre" est un rôle local (n'hérite pas)
 */
export const INHERITED_ROLES = new Set([
  ROLES.CREATOR,
  ROLES.ADMIN,
  ROLES.GUEST,
]);

/**
 * Tous les rôles disponibles (en ordre hiérarchique inverse pour les select)
 */
export const ALL_ROLES = [
  ROLES.CREATOR,
  ROLES.ADMIN,
  ROLES.MEMBER,
  ROLES.GUEST,
];

/**
 * Rôles gérables par les Administrateurs
 */
export const ADMIN_MANAGEABLE_ROLES = [ROLES.MEMBER, ROLES.GUEST];

/**
 * Obtenir le rang d'un rôle
 * Rang plus élevé = permissions supérieures
 */
export function getRoleRank(role: string | null | undefined): number {
  if (!role) return 0;
  return ROLE_RANKS[role as RoleType] || 0;
}

/**
 * Comparer deux rôles
 * Retourne:
 *  -1 si role1 < role2
 *   0 si role1 === role2
 *   1 si role1 > role2
 */
export function compareRoles(role1: string | null, role2: string | null): number {
  const rank1 = getRoleRank(role1);
  const rank2 = getRoleRank(role2);
  return Math.sign(rank1 - rank2);
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
 * Détermine si un nouveau rôle peut être assigné étant donné un rôle parent hérité.
 *
 * RÈGLE: Un utilisateur ne peut PAS recevoir sur une ressource enfant:
 * - Un rôle identique
 * - Un rôle inférieur
 * si ce rôle est déjà hérité depuis un parent couvrant cette ressource.
 *
 * @param parentRole Rôle hérité depuis un parent (ou null s'il n'y en a pas)
 * @param newRole Nouveau rôle qu'on veut assigner
 * @returns true si l'assignation est autorisée, false sinon
 */
export function canAssignRoleClientSide(
  parentRole: string | null | undefined,
  newRole: string,
): boolean {
  // S'il n'y a pas de rôle parent hérité, on peut assigner n'importe quel rôle
  if (!parentRole || !INHERITED_ROLES.has(parentRole as any)) {
    return true;
  }

  // S'il y a un rôle parent hérité, on ne peut assigner que les rôles SUPÉRIEURS
  return getRoleRank(newRole) > getRoleRank(parentRole);
}

/**
 * Retourne uniquement les rôles qui peuvent être assignés étant donné un rôle parent
 */
export function getAssignableRoles(parentRole: string | null | undefined): RoleType[] {
  if (!parentRole || !INHERITED_ROLES.has(parentRole as any)) {
    return ALL_ROLES;
  }

  const parentRank = getRoleRank(parentRole);
  return ALL_ROLES.filter(role => getRoleRank(role) > parentRank);
}

/**
 * Génère un message d'erreur explicite pour l'utilisateur (côté client)
 */
export function genererMessageErreurClientRoleRedondant(
  inheritedRole: string,
  parentType: string, // 'workspace', 'espace', 'liste'
): string {
  return (
    `⚠️ Rôle non permis\n\n` +
    `L'utilisateur possède déjà un rôle ${inheritedRole} hérité depuis le ${parentType} parent.\n\n` +
    `Selon la hiérarchie de permissions:\n` +
    `• Un rôle parent couvre automatiquement tous les descendants\n` +
    `• Vous pouvez uniquement assigner un rôle supérieur\n` +
    `• Les rôles égaux ou inférieurs sont refusés (redondants)`
  );
}

/**
 * Génère un message d'erreur du serveur pour affichage
 */
export function genererMessageErreurServeurRoleRedondant(
  serverDetail: string,
): string {
  return `❌ ${serverDetail}`;
}

/**
 * Détermine si un rôle est un rôle héritable
 * (i.e., il affecte automatiquement les descendants)
 */
export function isInheritableRole(role: string): boolean {
  return INHERITED_ROLES.has(role as any);
}

/**
 * Détermine si un rôle est un rôle local
 * (i.e., n'affecte que la ressource spécifique)
 */
export function isLocalRole(role: string): boolean {
  return !isInheritableRole(role);
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
 * Retourne la description d'un rôle pour l'aide utilisateur
 */
export function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    [ROLES.CREATOR]:
      'Contrôle total sur la ressource et ses descendants. Hérite automatiquement.',
    [ROLES.ADMIN]:
      'Gestion complète. Hérite automatiquement vers les descendants.',
    [ROLES.MEMBER]:
      'Accès complet (lecture/écriture). Rôle local, n\'hérite pas.',
    [ROLES.GUEST]:
      'Accès en lecture seule. Hérite automatiquement vers les descendants.',
  };
  return descriptions[role] || '';
}

/**
 * Vérifie si l'utilisateur peut gérer les membres d'une ressource
 */
export function canManageMembers(userRole: string): boolean {
  // Seuls Créateur et Admin peuvent gérer
  const managementRoles = [ROLES.CREATOR, ROLES.ADMIN];
  return managementRoles.includes(userRole as any);
}

/**
 * Vérifie si l'utilisateur peut créer du contenu
 */
export function canCreateContent(userRole: string): boolean {
  const contentCreationRoles = [ROLES.CREATOR, ROLES.ADMIN, ROLES.MEMBER];
  return contentCreationRoles.includes(userRole as any);
}

/**
 * Vérifie si l'utilisateur peut modifier du contenu
 */
export function canEditContent(userRole: string, contentOwnerRole: string | null): boolean {
  const canCreate = canCreateContent(userRole);
  if (!canCreate) return false;

  // Un Admin/Créateur peut modifier le contenu d'un Membre/Invité
  if (contentOwnerRole) {
    return getRoleRank(userRole) >= getRoleRank(contentOwnerRole);
  }

  return true;
}

/**
 * Vérifie si l'utilisateur peut supprimer
 */
export function canDelete(userRole: string): boolean {
  return canManageMembers(userRole);
}

/**
 * Permissions complètes pour chaque rôle
 */
export const ROLE_PERMISSIONS: Record<RoleType, Record<string, boolean>> = {
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
    delete: true,
    manage_members: true,
    change_role: true,
    remove_member: true,
    invite_member: true,
  },
  [ROLES.MEMBER]: {
    read: true,
    create: true,
    edit: true,
    delete: true,
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

/**
 * Vérifie si un utilisateur possède une permission
 */
export function hasPermission(role: string, permission: keyof typeof ROLE_PERMISSIONS['Créateur']): boolean {
  const perms = ROLE_PERMISSIONS[role as RoleType];
  return perms ? perms[permission] : false;
}
