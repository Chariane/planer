// frontend/src/pages/app/components/SpaceDashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import { Users, ListTodo, UserPlus, FolderTree, Calendar, Activity, Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import { espaceService } from '../../../services/espace.service';
import { listeService } from '../../../services/liste.service';
import { useResourceRole } from '../../../hooks/useResourceRole';
import { useWorkspaceRole } from '../../../hooks/useWorkspaceRole';
import { useNavigationStore } from '../../../store/useNavigationStore';
import { getRoleRank, ROLES } from '../../../lib/roleHierarchy';
import { getMemberDisplayName, getMemberEmail } from '../../../utils/memberDisplay';
import type { Member } from '../../../types';

interface SpaceDashboardProps {
  spaceId: string;
  onMemberInvited?: () => void;
}

const ROLE_MANAGEMENT_OPTIONS = ['Invité', 'Administrateur'];

const getRoleBadgeClass = (role: string) => {
  if (role === 'Administrateur') return 'bg-orange-100 text-orange-700';
  if (role === 'Créateur') return 'bg-purple-100 text-purple-700';
  if (role === 'Invité') return 'bg-gray-100 text-gray-500';
  return 'bg-blue-100 text-blue-700';
};

const getRoleLabel = (role: string) => {
  if (role === 'Invité') return 'Invité';
  if (role === 'Membre') return 'Membre';
  if (role === 'Administrateur') return 'Admin';
  return 'Créateur';
};

// Composant Toast simple
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-white min-w-[200px] ${bgColor}`}>
        <span className="text-sm flex-1">{message}</span>
        <button onClick={onClose} className="hover:opacity-70">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default function SpaceDashboard({ spaceId, onMemberInvited }: SpaceDashboardProps) {
  const [stats, setStats] = useState({
    subSpacesCount: 0,
    listsCount: 0,
    membersCount: 0,
  });
  const [spaceName, setSpaceName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [spaceWorkspaceId, setSpaceWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Invité');
  const [inheritedSpaceRole, setInheritedSpaceRole] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  
  // État pour les notifications toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Récupérer le rôle dans l'espace
  const { isGuest: isEspaceGuest, isAdmin: isEspaceAdmin, isCreator: isEspaceCreator } = useResourceRole(spaceId, 'espace');
  const { joinedEspaces } = useNavigationStore();
  
  // Récupérer le rôle dans le workspace parent
  const { isAdmin: isWorkspaceAdmin, isCreator: isWorkspaceCreator } = useWorkspaceRole(spaceWorkspaceId || undefined);
  
  const getDirectSpaceRole = (targetSpaceId: string): string | null => {
    return joinedEspaces.find(espace => espace.id === targetSpaceId)?.role || null;
  };

  const effectiveSpaceRole = inheritedSpaceRole
    || (isEspaceCreator ? ROLES.CREATOR : null)
    || (isEspaceAdmin ? ROLES.ADMIN : null)
    || (isEspaceGuest ? ROLES.GUEST : null);
  const isDirectSpaceAdmin = isEspaceAdmin || getDirectSpaceRole(spaceId) === ROLES.ADMIN;

  // Un utilisateur peut inviter s'il est Créateur/Admin direct ou hérité de l'espace,
  // ou Créateur/Admin du workspace parent.
  const canInviteMembers = effectiveSpaceRole === ROLES.ADMIN
    || effectiveSpaceRole === ROLES.CREATOR
    || isWorkspaceAdmin
    || isWorkspaceCreator;
  const canManageMemberRoles = isEspaceCreator || isWorkspaceCreator;
  
  // Rôles disponibles pour l'invitation selon le rôle
  const getAvailableRoles = () => {
    if (isWorkspaceCreator || isWorkspaceAdmin || effectiveSpaceRole === ROLES.CREATOR) {
      return ['Invité', 'Administrateur'];
    }
    if (effectiveSpaceRole === ROLES.ADMIN) {
      if (isDirectSpaceAdmin) {
        return ['Invité'];
      }
      return ['Invité', 'Administrateur'];
    }
    return [];
  };

  const availableRoles = useMemo(
    () => getAvailableRoles(),
    [
      isWorkspaceCreator,
      isWorkspaceAdmin,
      effectiveSpaceRole,
      isDirectSpaceAdmin,
    ],
  );

  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.includes(inviteRole)) {
      setInviteRole(availableRoles[0]);
    }
  }, [availableRoles, inviteRole]);

  const loadData = async () => {
    setLoading(true);
    setInheritedSpaceRole(null);
    try {
      // 1. Charger les infos de l'espace via la hiérarchie accessible.
      // Cela évite d'appeler /get_espace sur des parents non accessibles.
      const navigationSpace = joinedEspaces.find(espace => espace.id === spaceId);
      const hierarchy = await espaceService.getHierarchy(spaceId).catch(() => []);
      const spaces = Array.isArray(hierarchy) ? hierarchy : [];
      const spaceData = spaces.find((space: any) => space.id === spaceId)
        || navigationSpace
        || { id: spaceId, nom: 'Espace', id_workspace: null };

      setSpaceName(spaceData.nom);
      setSpaceDescription(spaceData.description || '');
      setSpaceWorkspaceId(spaceData.id_workspace || navigationSpace?.workspace_id || null);

      const roleCandidates: Array<string | null> = (spaces.length ? spaces : [spaceData])
        .map((space: any) => {
          const role = getDirectSpaceRole(space.id);
          const isCurrentSpace = space.id === spaceId;
          const isInheritedRole = role === ROLES.CREATOR || role === ROLES.ADMIN || role === ROLES.GUEST;
          return isCurrentSpace || isInheritedRole ? role : null;
        });

      const resolvedInheritedRole = roleCandidates.reduce<string | null>((highest, role) => {
        if (!role) return highest;
        return getRoleRank(role) > getRoleRank(highest) ? role : highest;
      }, null);
      setInheritedSpaceRole(resolvedInheritedRole);

      // 2. Charger les membres pour tout utilisateur ayant accès en lecture à l'espace.
      let formattedMembers: Member[] = [];
      let membersCount = 0;

      try {
        const membersData = await espaceService.getMembers(spaceId);
        formattedMembers = membersData.map((m: any) => ({
          id: m.id_utilisateur || m.utilisateur?.id || m.id,
          name: getMemberDisplayName(m),
          email: getMemberEmail(m),
          role: m.role,
        }));
        membersCount = formattedMembers.length;
      } catch (err: any) {
        console.warn('Impossible de charger les membres:', err);
        if (err.status === 403) {
          console.log('Accès refusé pour voir les membres - affichage limité');
        }
      }

      setMembers(formattedMembers);

      // 3. Charger les listes
      let listsCount = 0;
      try {
        const lists = await listeService.getByEspace(spaceId);
        listsCount = lists.length;
      } catch {
        console.log('Impossible de charger les listes');
      }

      // 4. Charger les sous-espaces
      let subSpacesCount = 0;
      try {
        const subSpaces = await espaceService.getSubSpaces(spaceId);
        subSpacesCount = subSpaces.length;
      } catch {
        subSpacesCount = 0;
      }

      setStats({
        subSpacesCount,
        listsCount,
        membersCount: membersCount,
      });
    } catch (err) {
      console.error('Erreur chargement espace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [spaceId, joinedEspaces]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await espaceService.inviteMember(spaceId, inviteEmail, inviteRole);
      showMessage(`Invitation envoyée à ${inviteEmail} avec le rôle ${inviteRole}`, 'success');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      await loadData();
      onMemberInvited?.();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('refuse') || msg.includes('redondant')) {
        showMessage('Cette personne a déjà un rôle parent qui couvre cet espace', 'error');
      } else if (msg.includes('403')) {
        showMessage('Vous n\'avez pas les permissions nécessaires pour inviter des membres dans cet espace.', 'error');
      } else {
        showMessage(msg || 'Erreur lors de l\'invitation', 'error');
      }
    }
  };

  const handleMemberRoleChange = async (member: Member, nextRole: string) => {
    if (!canManageMemberRoles || member.role === ROLES.CREATOR || nextRole === member.role) return;

    setUpdatingMemberId(member.id);
    try {
      await espaceService.updateMemberRole(spaceId, member.id, nextRole);
      setMembers(prevMembers =>
        prevMembers.map(item =>
          item.id === member.id ? { ...item, role: nextRole } : item,
        ),
      );
      showMessage(`Rôle de ${member.name} mis à jour`, 'success');
    } catch (err: any) {
      showMessage(err?.message || "Impossible de modifier le rôle de ce membre", 'error');
      await loadData();
    } finally {
      setUpdatingMemberId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement du tableau de bord...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Message pour les invités */}
      {isEspaceGuest && !canInviteMembers && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            👁️ Vous êtes en mode <strong>lecture seule</strong> dans cet espace.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Vous pouvez consulter les informations mais ne pouvez pas inviter de nouveaux membres.
          </p>
        </div>
      )}

      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{spaceName}</h1>
          <p className="text-gray-500 mt-1">Tableau de bord de l'espace</p>
          {spaceDescription && (
            <p className="text-sm text-gray-500 mt-3 max-w-3xl leading-relaxed">{spaceDescription}</p>
          )}
        </div>
        {/* Bouton Inviter - visible pour Créateur/Admin workspace OU Créateur/Admin espace */}
        {canInviteMembers && availableRoles.length > 0 && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsInviteModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Inviter un membre
            </Button>
          </div>
        )}
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderTree className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sous-espaces</p>
              <p className="text-2xl font-bold text-gray-800">{stats.subSpacesCount}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ListTodo className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Listes / Projets</p>
              <p className="text-2xl font-bold text-gray-800">{stats.listsCount}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Membres</p>
              <p className="text-2xl font-bold text-gray-800">{stats.membersCount}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Liste des membres - visible pour tout utilisateur ayant accès en lecture */}
      {members.length > 0 ? (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membres de l'espace
            </h3>
            {canManageMemberRoles && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Gestion des rôles
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {members.map(member => (
              <GlassCard key={member.id} className="p-3 flex flex-wrap items-center justify-between gap-3 hover:shadow-md transition-shadow">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                {canManageMemberRoles && member.role !== ROLES.CREATOR ? (
                  <div className="flex items-center gap-2">
                    {updatingMemberId === member.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                    )}
                    <select
                      value={ROLE_MANAGEMENT_OPTIONS.includes(member.role) ? member.role : ROLES.GUEST}
                      onChange={event => handleMemberRoleChange(member, event.target.value)}
                      disabled={updatingMemberId === member.id}
                      className="min-w-[150px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:cursor-wait disabled:opacity-60"
                    >
                      {ROLE_MANAGEMENT_OPTIONS.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeClass(member.role)}`}>
                    {getRoleLabel(member.role)}
                  </span>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membres de l'espace
          </h3>
          <GlassCard className="p-4">
            <div className="text-center text-gray-400 py-4">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Aucun membre pour le moment</p>
              {canInviteMembers && <p className="text-sm mt-1">Invitez des membres pour collaborer sur cet espace</p>}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Liste des sous-espaces */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          Sous-espaces
        </h3>
        {stats.subSpacesCount > 0 ? (
          <div className="text-sm text-gray-600">
            Cet espace contient {stats.subSpacesCount} sous-espace(s)
          </div>
        ) : (
          <GlassCard className="p-4">
            <div className="text-center text-gray-400 py-4">
              <FolderTree className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Aucun sous-espace</p>
              <p className="text-sm">Créez des sous-espaces pour mieux organiser votre travail</p>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Activités récentes */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activités récentes
        </h3>
        <GlassCard className="p-4">
          <div className="text-center text-gray-400 py-8">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Fonctionnalité à venir</p>
            <p className="text-sm">Les activités récentes seront affichées ici</p>
          </div>
        </GlassCard>
      </div>

      {/* Modale d'invitation */}
      {canInviteMembers && (
        <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Inviter un membre" size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email du membre
              </label>
              <input
                type="email"
                placeholder="exemple@email.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              >
                {availableRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                💡 <strong>Invitant</strong> : accès en lecture seule<br />
                💡 <strong>Administrateur</strong> : peut gérer l'espace et ses membres
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ⚡ Le rôle <strong>Membre</strong> sera attribué automatiquement lors de l'assignation à une liste ou une tâche.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Annuler</Button>
              <Button onClick={handleInvite}>Inviter</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
