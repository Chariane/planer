// frontend/src/components/workspace/ManageMembersModal.tsx
import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Crown } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { espaceService } from '../../services/espace.service';
import { useAuth } from '../../contexts/AuthContext';

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
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const canManageMembers = currentUserRole === 'Créateur' || currentUserRole === 'Administrateur';

  const loadMembers = async () => {
    if (!espaceId) return;
    setLoading(true);
    try {
      const data = await espaceService.getMembers(espaceId);
      const normalizedMembers: Member[] = data.map((m: any) => ({
        id: m.id,
        user_id: m.id_utilisateur || m.id,
        username: m.utilisateur?.username || m.utilisateur?.nom || 'Inconnu',
        email: m.utilisateur?.email || '',
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
    setInviting(true);
    try {
      await espaceService.inviteMember(espaceId, inviteEmail, inviteRole);
      setInviteEmail('');
      await loadMembers();
    } catch (error) {
      console.error("Erreur invitation", error);
      alert("Impossible d'inviter ce membre");
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
    if (!confirm("Retirer ce membre de l'espace ?")) return;
    try {
      await espaceService.removeMember(espaceId, userId);
      await loadMembers();
    } catch (error) {
      console.error("Erreur suppression membre", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestion des membres" size="lg">
      <div className="space-y-6">
        {/* Invitation */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Inviter un membre</h4>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email du membre"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 p-2 border rounded-lg"
              disabled={!canManageMembers}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="p-2 border rounded-lg bg-white"
              disabled={!canManageMembers}
            >
              <option value="Invité">Invité</option>
              <option value="Membre">Membre</option>
              <option value="Administrateur">Administrateur</option>
            </select>
            <Button onClick={handleInvite} loading={inviting} size="sm" disabled={!canManageMembers}>
              <UserPlus className="h-4 w-4 mr-1" /> Inviter
            </Button>
          </div>
          {!canManageMembers && (
            <p className="text-sm text-gray-500 mt-2">Vous n'avez pas les permissions pour gérer les membres.</p>
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
                <div key={member.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div>
                    <p className="font-medium">{member.username || member.email}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                    <p className="text-xs text-gray-400">Statut : {member.statut}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
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
    </Modal>
  );
}