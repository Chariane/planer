// frontend/src/components/modals/AssignListMemberModal.tsx
import { useState, useEffect } from 'react';
import { UserPlus, Mail, Users, CheckCircle, Loader2 } from 'lucide-react';
import { listeService } from '../../services/liste.service';
import { espaceService } from '../../services/espace.service';
import { workspaceService } from '../../services/workspace.service';
import { sanitizeApiErrorMessage } from '../../services/api';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { getRoleLabel, getRoleRank, ROLES } from '../../lib/roleHierarchy';
import { getMemberContactLabel, getMemberDisplayName, getMemberEmail, getMemberUsername } from '../../utils/memberDisplay';
import { isValidInviteIdentifier } from '../../utils/inviteIdentifier';
import { useAuth } from '../../contexts/AuthContext';
import { absenceService } from '../../services/absence.service';
import { AvailabilityBadge } from '../ui/AvailabilityBadge';
import { MemberAvatar } from '../ui/MemberAvatar';
import type { UserAvailabilityOut } from '../../types';

interface AssignListMemberModalProps {
  listeId: string;
  espaceId?: string;
  workspaceId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Member {
  id: string;
  name: string;
  email: string;
  rawEmail?: string;
  username?: string;
  role: string;
  id_liste?: string | null;
  id_tache?: string | null;
  photo_base64?: string | null;
}

// Rôles disponibles pour l'ajout à une liste (sans Créateur)
const AVAILABLE_ROLES = ['Invité', 'Membre', 'Administrateur'];
const DIRECT_LIST_ADMIN_EXTERNAL_ROLES = ['Membre', 'Invité'];
const PARENT_MEMBER_AVAILABLE_ROLES = ['Administrateur'];

type TabType = 'parent' | 'external';

const normalizeInviteIdentifier = (value: string) => value.trim().replace(/^@+/, '').toLowerCase();

const memberMatchesIdentifier = (member: Member, identifier: string) => {
  const target = normalizeInviteIdentifier(identifier);
  if (!target) return false;

  const candidates = [
    member.rawEmail,
    member.username,
    member.email,
    member.name,
  ]
    .filter(Boolean)
    .flatMap(value => String(value).split('·'))
    .map(value => normalizeInviteIdentifier(value));

  return candidates.some(candidate => candidate === target);
};

export default function AssignListMemberModal({
  listeId,
  espaceId,
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
}: AssignListMemberModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('parent');
  const [parentMembers, setParentMembers] = useState<Member[]>([]);
  const [listMembers, setListMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('Membre');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('Membre');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [listAvailability, setListAvailability] = useState<UserAvailabilityOut[]>([]);
  const directCurrentMember = listMembers.find(member => member.id === user?.id);
  const directCurrentRole = directCurrentMember?.role || null;
  const isDirectListAdmin = directCurrentRole === ROLES.ADMIN;
  const canUseParentMemberZone = !isDirectListAdmin;
  const availableRoles = isDirectListAdmin ? DIRECT_LIST_ADMIN_EXTERNAL_ROLES : AVAILABLE_ROLES;
  const parentAvailableRoles = PARENT_MEMBER_AVAILABLE_ROLES;

  useEffect(() => {
    if (!parentAvailableRoles.includes(selectedRole)) {
      setSelectedRole(parentAvailableRoles[0]);
    }
    if (!availableRoles.includes(inviteRole)) {
      setInviteRole('Membre');
    }
    if (isDirectListAdmin && activeTab !== 'external') {
      setActiveTab('external');
      setSelectedMemberId('');
    }
  }, [availableRoles, parentAvailableRoles, selectedRole, inviteRole, isDirectListAdmin, activeTab]);

  // Charger les membres du workspace/espace parent disponibles pour la liste.
  useEffect(() => {
    if (!isOpen) return;

    const loadParentMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const byUser = new Map<string, Member & { highestRole: string }>();
        const addMembers = (items: any[]) => {
          items.forEach((m: any) => {
            const id = m.id_utilisateur || m.id;
            const role = m.role || '';
            if (!id || !role) return;

            const current = byUser.get(id);
            const highestRole = !current || getRoleRank(role) > getRoleRank(current.highestRole)
              ? role
              : current.highestRole;

            byUser.set(id, {
              id,
              name: current?.name || getMemberDisplayName(m),
              email: current?.email || getMemberContactLabel(m),
              rawEmail: current?.rawEmail || getMemberEmail(m),
              username: current?.username || getMemberUsername(m),
              role,
              highestRole,
            });
          });
        };

        let resolvedWorkspaceId = workspaceId || '';
        let resolvedEspaceId = espaceId || '';

        if (!resolvedWorkspaceId || !resolvedEspaceId) {
          try {
            const liste = await listeService.getById(listeId);
            resolvedWorkspaceId = resolvedWorkspaceId || liste.id_workspace || '';
            resolvedEspaceId = resolvedEspaceId || liste.id_espace || '';
          } catch {
            // Les props suffisent souvent, on continue avec ce qui est disponible.
          }
        }

        if (resolvedEspaceId) {
          try {
            const hierarchy = await espaceService.getHierarchy(resolvedEspaceId);
            const spaces = Array.isArray(hierarchy) ? hierarchy : [];
            for (const space of spaces) {
              if (!resolvedWorkspaceId && space.id_workspace) {
                resolvedWorkspaceId = space.id_workspace;
              }
              try {
                addMembers(await espaceService.getMembers(space.id));
              } catch {
                // Un parent non listable ne doit pas bloquer les autres candidats.
              }
            }
          } catch {
            try {
              addMembers(await espaceService.getMembers(resolvedEspaceId));
            } catch {
              // On tentera au moins le workspace.
            }
          }
        }

        if (resolvedWorkspaceId) {
          try {
            addMembers(await workspaceService.getMembers(resolvedWorkspaceId));
          } catch {
            // Aucun candidat workspace accessible.
          }
        }

        setParentMembers(
          Array.from(byUser.values())
            .filter(member => member.highestRole === ROLES.MEMBER)
            .map(({ highestRole, ...member }) => member)
        );
      } catch (err) {
        console.warn('Membres parent non accessibles:', err);
        setParentMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadParentMembers();
  }, [isOpen, espaceId, workspaceId]);

  // Charger les membres déjà dans la liste
  useEffect(() => {
    if (!isOpen || !listeId) return;

    const loadListMembers = async () => {
      try {
        const members = await listeService.getMembers(listeId);
        const formatted = members
          .filter((m: any) => m.id_liste === listeId)
          .map((m: any) => ({
            id: m.id_utilisateur || m.id,
            name: getMemberDisplayName(m),
            email: getMemberContactLabel(m),
            rawEmail: getMemberEmail(m),
            username: getMemberUsername(m),
            role: m.role || 'Membre',
            id_liste: m.id_liste || null,
            id_tache: m.id_tache || null,
          }));
        setListMembers(formatted);
      } catch (err) {
        console.error('Erreur chargement membres de la liste:', err);
      }
    };

    loadListMembers();
  }, [isOpen, listeId]);

  useEffect(() => {
    if (listMembers.length > 0 && listeId) {
      const userIds = listMembers.map(m => m.id).filter(Boolean);
      if (userIds.length > 0) {
        absenceService.getAvailability(listeId, userIds)
          .then(data => setListAvailability(data))
          .catch(() => { });
      }
    }
  }, [listMembers, listeId]);

  const isMemberInList = (memberId: string) => {
    return listMembers.some(m => m.id === memberId && m.id_liste === listeId);
  };

  const handleAddInvitedMember = async () => {
    if (!selectedMemberId) {
      setError('Veuillez sélectionner un membre');
      return;
    }

    if (isMemberInList(selectedMemberId)) {
      setError('Ce membre est déjà dans la liste');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const roleToAssign = parentAvailableRoles.includes(selectedRole) ? selectedRole : parentAvailableRoles[0];
      await listeService.assignMember(listeId, selectedMemberId, roleToAssign);

      const newMember = parentMembers.find(m => m.id === selectedMemberId);
      if (newMember) {
        setListMembers(prev => [...prev, { ...newMember, role: roleToAssign, id_liste: listeId, id_tache: null }]);
      }

      setSuccessMessage(`Membre ajouté avec le rôle ${getRoleLabel(roleToAssign)}`);
      setSelectedMemberId('');
      setSelectedRole(parentAvailableRoles[0]);

      setTimeout(() => setSuccessMessage(null), 3000);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erreur ajout membre:', err);
      setError(sanitizeApiErrorMessage(err, 'Erreur lors de l\'ajout du membre'));
    } finally {
      setLoading(false);
    }
  };

  const handleInviteExternal = async () => {
    if (!inviteEmail.trim()) {
      setError('Veuillez entrer une adresse email ou un username');
      return;
    }

    if (!isValidInviteIdentifier(inviteEmail)) {
      setError("L'email ou le username ne doit pas contenir d'espaces.");
      return;
    }

    const alreadyDirectMember = directListMembers.find(member => memberMatchesIdentifier(member, inviteEmail));
    if (alreadyDirectMember) {
      setError(`${alreadyDirectMember.name} est déjà membre direct de cette liste.`);
      return;
    }

    const availableParentMember = canUseParentMemberZone
      ? availableParentMembers.find(member => memberMatchesIdentifier(member, inviteEmail))
      : null;
    if (availableParentMember) {
      setActiveTab('parent');
      setSelectedMemberId(availableParentMember.id);
      setError(
        `${availableParentMember.name} est déjà membre du workspace ou de l'espace parent. Utilisez l'onglet "Membres du workspace/espace" pour l'ajouter à cette liste.`
      );
      return;
    }

    setInviting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const roleToInvite = availableRoles.includes(inviteRole) ? inviteRole : 'Membre';
      await listeService.inviteMember(listeId, inviteEmail, roleToInvite);
      setSuccessMessage(`Invitation envoyée à ${inviteEmail} avec le rôle ${getRoleLabel(roleToInvite)}`);
      setInviteEmail('');
      setInviteRole('Membre');

      setTimeout(() => setSuccessMessage(null), 3000);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erreur invitation:', err);
      if (err.message?.includes('déjà') && !err.message?.includes('rôle')) {
        setError(canUseParentMemberZone
          ? 'Cet utilisateur existe déjà. Utilisez l\'onglet "Membres du workspace/espace" pour l\'ajouter.'
          : 'Cet utilisateur existe déjà. Vous pouvez uniquement l’inviter avec le rôle Invité ou Membre.'
        );
      } else {
        setError(sanitizeApiErrorMessage(err, 'Erreur lors de l\'envoi de l\'invitation'));
      }
    } finally {
      setInviting(false);
    }
  };

  const availableParentMembers = parentMembers.filter(m => !isMemberInList(m.id));
  const directListMembers = listMembers.filter(member => member.id_liste === listeId && member.role !== ROLES.GUEST);

  const handleClose = () => {
    setActiveTab(isDirectListAdmin ? 'external' : 'parent');
    setSelectedMemberId('');
    setSelectedRole(parentAvailableRoles[0]);
    setInviteEmail('');
    setInviteRole('Membre');
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Ajouter des membres à la liste" size="lg">
      <div className="space-y-5">
        <div className="text-sm text-theme-main bg-secondary/5 border border-secondary/20 p-4 rounded-2xl">
          <p className="font-black mb-2 uppercase tracking-widest text-[10px] text-secondary">À propos des rôles</p>
          <ul className="space-y-1.5 text-xs text-theme-muted">
            <li><strong className="text-theme-main">Créateur</strong> : rôle automatique attribué à la personne qui a créé la liste.</li>
            <li><strong className="text-theme-main">Administrateur</strong> : peut gérer la liste et ses membres.</li>
            <li><strong className="text-theme-main">Membre</strong> : peut voir la liste et compléter les tâches qui lui sont assignées.</li>
          </ul>
          <p className="text-xs text-theme-muted mt-3">
            Le rôle <strong className="text-theme-main">Créateur</strong> ne peut pas être attribué manuellement.
          </p>
        </div>

        <div className="flex border-b border-theme-border-subtle">
          {canUseParentMemberZone && (
            <button
              onClick={() => setActiveTab('parent')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${activeTab === 'parent'
                  ? 'border-b-2 border-secondary text-secondary'
                  : 'text-theme-muted hover:text-theme-main'
                }`}
            >
              <Users className="h-4 w-4" />
              Membres du workspace/espace
            </button>
          )}
          <button
            onClick={() => setActiveTab('external')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${activeTab === 'external'
                ? 'border-b-2 border-secondary text-secondary'
                : 'text-theme-muted hover:text-theme-main'
              }`}
          >
            <Mail className="h-4 w-4" />
            Invitation externe
          </button>
        </div>

        {isDirectListAdmin && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs font-semibold text-theme-muted leading-relaxed">
            En tant qu’administrateur direct de cette liste, vous pouvez inviter uniquement des personnes externes avec le rôle Membre ou Invité.
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-500 text-sm font-medium">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-emerald-500 text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {successMessage}
            </p>
          </div>
        )}

        {canUseParentMemberZone && activeTab === 'parent' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 text-secondary animate-spin" />
              </div>
            ) : availableParentMembers.length === 0 ? (
              <div className="text-center py-8 text-theme-muted bg-theme-surface-hover/50 border border-theme-border-subtle rounded-2xl">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-theme-main">Aucun membre parent disponible</p>
                <p className="text-xs mt-1">Vous pouvez ajouter une personne avec l'onglet invitation externe.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-theme-main mb-1">
                    Membres disponibles du workspace/espace parent
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full p-2 border border-theme-border-subtle rounded-xl bg-theme-surface text-theme-main focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none"
                  >
                    <option value="">Sélectionner un membre...</option>
                    {availableParentMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-theme-muted mt-1">
                    Ces personnes ont le rôle "Membre" dans l'espace ou workspace parent.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-theme-main mb-1">
                    Rôle à attribuer
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full p-2 border border-theme-border-subtle rounded-xl bg-theme-surface text-theme-main focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none"
                  >
                    {parentAvailableRoles.map(role => (
                      <option key={role} value={role}>{getRoleLabel(role)}</option>
                    ))}
                  </select>
                  <p className="text-xs text-theme-muted mt-1">
                    Les membres parent sont ajoutés comme administrateurs de liste.
                  </p>
                </div>

                <Button
                  onClick={handleAddInvitedMember}
                  disabled={!selectedMemberId || loading}
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Ajouter à la liste
                </Button>
              </>
            )}
          </div>
        )}

        {activeTab === 'external' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-theme-main mb-1">
                Email ou username
              </label>
              <input
                type="text"
                placeholder="exemple@email.com ou username"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full p-2 border border-theme-border-subtle rounded-xl bg-theme-surface text-theme-main placeholder:text-theme-muted/50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none"
              />
              <p className="text-xs text-theme-muted mt-1">
                Si la personne est déjà sur K-Planner, vous pouvez utiliser son username.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-theme-main mb-1">
                Rôle à attribuer
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full p-2 border border-theme-border-subtle rounded-xl bg-theme-surface text-theme-main focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none"
              >
                {availableRoles.map(role => (
                  <option key={role} value={role}>{getRoleLabel(role)}</option>
                ))}
              </select>
              <p className="text-xs text-theme-muted mt-1">
                {isDirectListAdmin
                  ? 'En tant qu’administrateur direct de cette liste, vous pouvez uniquement attribuer le rôle Membre ou Invité.'
                  : 'Invité consulte seulement la liste. Membre peut contribuer s’il a une tâche assignée.'}
              </p>
            </div>

            <Button
              onClick={handleInviteExternal}
              disabled={!inviteEmail.trim() || inviting}
              className="w-full"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Envoyer l'invitation
            </Button>
          </div>
        )}

        {directListMembers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-theme-border-subtle">
            <label className="block text-sm font-semibold text-theme-main mb-2">
              Membres déjà dans la liste ({directListMembers.length})
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {directListMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2 bg-theme-surface-hover/50 border border-theme-border-subtle rounded-xl">
                  <div className="flex items-center gap-2">
                    <MemberAvatar member={member} size="xs" />
                    <span className="text-sm font-medium text-theme-main">{member.name}</span>
                    <AvailabilityBadge availability={listAvailability.find(a => a.id_utilisateur === member.id)} size="sm" showText />
                    <span className="text-xs text-theme-muted italic">({member.email})</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${member.role === 'Créateur' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                      member.role === 'Administrateur' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        'bg-secondary/10 text-secondary border border-secondary/20'
                    }`}>
                    {getRoleLabel(member.role)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
