// frontend/src/components/modals/AssignListMemberModal.tsx
import { useState, useEffect } from 'react';
import { UserPlus, Mail, Users, CheckCircle, Loader2 } from 'lucide-react';
import { listeService } from '../../services/liste.service';
import { espaceService } from '../../services/espace.service';
import { workspaceService } from '../../services/workspace.service';
import { sanitizeApiErrorMessage } from '../../services/api';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { getRoleLabel } from '../../lib/roleHierarchy';
import { getMemberDisplayName, getMemberEmail } from '../../utils/memberDisplay';
import { useResourceRole } from '../../hooks/useResourceRole';

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
  role: string;
  id_liste?: string | null;
  id_tache?: string | null;
}

// Rôles disponibles pour l'ajout à une liste (sans Créateur)
const AVAILABLE_ROLES = ['Invité', 'Membre', 'Administrateur'];
const LIST_ADMIN_AVAILABLE_ROLES = ['Membre'];
const PARENT_MEMBER_AVAILABLE_ROLES = ['Administrateur'];

type TabType = 'parent' | 'external';

export default function AssignListMemberModal({
  listeId,
  espaceId,
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
}: AssignListMemberModalProps) {
  const { role: directListRole } = useResourceRole(listeId, 'liste');
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
  const isDirectListAdmin = directListRole === 'Administrateur';
  const availableRoles = isDirectListAdmin ? LIST_ADMIN_AVAILABLE_ROLES : AVAILABLE_ROLES;
  const parentAvailableRoles = isDirectListAdmin ? LIST_ADMIN_AVAILABLE_ROLES : PARENT_MEMBER_AVAILABLE_ROLES;

  useEffect(() => {
    if (!parentAvailableRoles.includes(selectedRole)) {
      setSelectedRole(parentAvailableRoles[0]);
    }
    if (!availableRoles.includes(inviteRole)) {
      setInviteRole('Membre');
    }
  }, [availableRoles, parentAvailableRoles, selectedRole, inviteRole]);

  // Charger les membres du workspace/espace parent disponibles pour la liste.
  useEffect(() => {
    if (!isOpen) return;

    const loadParentMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const byUser = new Map<string, Member>();
        const addMembers = (items: any[]) => {
          items
            .filter((m: any) => m.role === 'Membre')
            .forEach((m: any) => {
              const id = m.id_utilisateur || m.id;
              if (!id || byUser.has(id)) return;
              byUser.set(id, {
                id,
                name: getMemberDisplayName(m),
                email: getMemberEmail(m),
                role: m.role,
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

        setParentMembers(Array.from(byUser.values()));
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
            email: getMemberEmail(m),
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
      setError('Veuillez entrer une adresse email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError('Veuillez entrer une adresse email valide');
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
        setError('Cet utilisateur existe déjà. Utilisez l\'onglet "Membres du workspace/espace" pour l\'ajouter.');
      } else {
        setError(sanitizeApiErrorMessage(err, 'Erreur lors de l\'envoi de l\'invitation'));
      }
    } finally {
      setInviting(false);
    }
  };

  const availableParentMembers = parentMembers.filter(m => !isMemberInList(m.id));
  const directListMembers = listMembers.filter(member => member.id_liste === listeId);

  const handleClose = () => {
    setActiveTab('parent');
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
        <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
          <p className="font-medium mb-1">💡 À propos des rôles</p>
          <ul className="space-y-1 text-xs">
            <li>👑 <strong>Créateur</strong> : rôle automatique attribué à la personne qui a créé la liste</li>
            <li>🔐 <strong>Administrateur</strong> : peut gérer la liste et ses membres</li>
            <li>👤 <strong>Membre</strong> : peut voir la liste et compléter les tâches qui lui sont assignées</li>
          </ul>
          <p className="text-xs text-gray-400 mt-2">
            ⚡ Le rôle <strong>Créateur</strong> ne peut pas être attribué manuellement.
          </p>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('parent')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'parent'
                ? 'border-b-2 border-secondary text-secondary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4" />
            Membres du workspace/espace
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'external'
                ? 'border-b-2 border-secondary text-secondary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Mail className="h-4 w-4" />
            Invitation externe
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-600 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {successMessage}
            </p>
          </div>
        )}

        {activeTab === 'parent' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 text-secondary animate-spin" />
              </div>
            ) : availableParentMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun membre parent disponible</p>
                <p className="text-xs mt-1">Vous pouvez ajouter une personne avec l'onglet invitation externe</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Membres disponibles du workspace/espace parent
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
                  >
                    <option value="">Sélectionner un membre...</option>
                    {availableParentMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Ces personnes ont le rôle "Membre" dans l'espace ou workspace parent.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle à attribuer
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
                  >
                    {parentAvailableRoles.map(role => (
                      <option key={role} value={role}>{getRoleLabel(role)}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {isDirectListAdmin
                      ? 'En tant qu’administrateur direct de cette liste, vous pouvez uniquement attribuer le rôle Membre.'
                      : 'Les membres parent sont ajoutés comme administrateurs de liste.'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email du membre
              </label>
              <input
                type="email"
                placeholder="exemple@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
              />
              <p className="text-xs text-gray-400 mt-1">
                Une invitation par email sera envoyée à cette personne
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle à attribuer
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
              >
                {availableRoles.map(role => (
                  <option key={role} value={role}>{getRoleLabel(role)}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {isDirectListAdmin
                  ? 'En tant qu’administrateur direct de cette liste, vous pouvez uniquement attribuer le rôle Membre.'
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
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Membres déjà dans la liste ({directListMembers.length})
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {directListMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <span className="text-sm font-medium">{member.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({member.email})</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    member.role === 'Créateur' ? 'bg-purple-100 text-purple-700' :
                    member.role === 'Administrateur' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
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
