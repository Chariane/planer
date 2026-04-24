// frontend/src/components/workspace/ManageMembersModal.tsx
import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Crown } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { espaceService } from '../../services/espace.service';

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
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Membre');
  const [inviting, setInviting] = useState(false);

  const loadMembers = async () => {
    if (!espaceId) return;
    setLoading(true);
    try {
      const data = await espaceService.getMembers(espaceId);
      setMembers(data);
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
    if (!inviteEmail.trim()) return;
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
    try {
      await espaceService.updateMemberRole(espaceId, userId, newRole);
      await loadMembers();
    } catch (error) {
      console.error("Erreur mise à jour rôle", error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
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
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="p-2 border rounded-lg bg-white"
            >
              <option value="Membre">Membre</option>
              <option value="Administrateur">Administrateur</option>
            </select>
            <Button onClick={handleInvite} loading={inviting} size="sm">
              <UserPlus className="h-4 w-4 mr-1" /> Inviter
            </Button>
          </div>
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
                      disabled={member.role === 'Créateur'}
                    >
                      <option value="Membre">Membre</option>
                      <option value="Administrateur">Administrateur</option>
                    </select>
                    {member.role !== 'Créateur' && (
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