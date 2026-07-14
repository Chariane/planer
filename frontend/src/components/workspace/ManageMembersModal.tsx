// frontend/src/components/workspace/ManageMembersModal.tsx
import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Crown } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import ConfirmModal from '../ui/ConfirmModal';
import { espaceService } from '../../services/espace.service';
import { useAuth } from '../../contexts/AuthContext';
import { getMemberContactLabel, getMemberDisplayName } from '../../utils/memberDisplay';
import { isValidInviteIdentifier } from '../../utils/inviteIdentifier';

interface Member {
  id: string;
  user_id: string;
  username: string;
  email: string;
  role: string;
  statut: string;
}

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  espaceId: string;
}

export function ManageMembersModal({ isOpen, onClose, espaceId }: ManageMembersModalProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Membre');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ userId: string; onConfirm: () => Promise<void> } | null>(null);

  const canManageMembers = currentUserRole === 'Créateur' || currentUserRole === 'Administrateur';

  const loadMembers = async () => {
    if (!espaceId) return;
    setLoading(true);
    try {
      const data = await espaceService.getMembers(espaceId);
      const normalizedMembers: Member[] = data.map((m: any) => ({
        id: m.id,
        user_id: m.id_utilisateur || m.id,
        username: getMemberDisplayName(m),
        email: getMemberContactLabel(m),
        role: m.role,
        statut: m.statut,
      }));
      setMembers(normalizedMembers);
      const currentMember = normalizedMembers.find(m => m.user_id === user?.id);
      setCurrentUserRole(currentMember?.role || null);
    } catch (error) {
      console.error("Erreur chargement membres", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && espaceId) {
      loadMembers();
    }
  }, [isOpen, espaceId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !canManageMembers) return;
    if (!isValidInviteIdentifier(inviteEmail)) {
      setInviteError("Entrez une adresse email ou un username valide, sans espace.");
      return;
    }
    setInviting(true);
    setInviteError('');
    try {
      await espaceService.inviteMember(espaceId, inviteEmail, inviteRole);
      setInviteEmail('');
      await loadMembers();
    } catch (error) {
      console.error("Erreur invitation", error);
      setInviteError("Impossible d'inviter ce membre.");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!canManageMembers) return;
    try {
      await espaceService.updateMemberRole(espaceId, userId, newRole);
      await loadMembers();
    } catch (error) {
      console.error("Erreur mise à jour rôle", error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!canManageMembers) return;
    setConfirmData({
      userId,
      onConfirm: async () => {
        try {
          await espaceService.removeMember(espaceId, userId);
          await loadMembers();
        } catch (error) {
          console.error("Erreur suppression membre", error);
        }
      }
    });
    setIsConfirmOpen(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestion des membres" size="lg">
      <div className="space-y-6">
        {/* Invitation */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Inviter un membre</h4>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Email ou username"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setInviteError('');
              }}
              className="min-w-0 flex-1 p-2 border rounded-lg"
              disabled={!canManageMembers}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white sm:w-auto"
              disabled={!canManageMembers}
            >
              <option value="Invité">Invité</option>
              <option value="Membre">Membre</option>
              <option value="Administrateur">Administrateur</option>
            </select>
            <Button onClick={handleInvite} loading={inviting} size="sm" disabled={!canManageMembers} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-1" /> Inviter
            </Button>
          </div>
          {!canManageMembers && (
            <p className="text-sm text-gray-500 mt-2">Vous n'avez pas les permissions pour gérer les membres.</p>
          )}
          {inviteError && (
            <p className="text-sm text-red-600 font-medium mt-2">{inviteError}</p>
          )}
        </div>

        {/* Liste des membres */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Membres actuels</h4>
          {loading ? (
            <div className="text-center py-4">Chargement...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Aucun membre</div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex flex-col gap-3 p-3 bg-white border rounded-lg sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{member.username || member.email}</p>
                    <p className="break-all text-xs text-gray-500">{member.email}</p>
                    <p className="text-xs text-gray-400">Statut : {member.statut}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                      className="min-w-0 flex-1 text-sm border rounded px-2 py-1 sm:flex-none"
                      disabled={member.role === 'Créateur' || !canManageMembers}
                    >
                      <option value="Invité">Invité</option>
                      <option value="Membre">Membre</option>
                      <option value="Administrateur">Administrateur</option>
                    </select>
                    {member.role !== 'Créateur' && canManageMembers && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {member.role === 'Créateur' && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmData?.onConfirm || (() => Promise.resolve())}
        title="Retirer le membre"
        message="Voulez-vous vraiment retirer ce membre de l'espace ? Cette action peut être annulée en le ré-invitant plus tard."
        confirmText="Retirer"
      />
    </Modal>
  );
}
