// frontend/src/components/members/MemberManagement.tsx
import { useState, useEffect } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { workspaceService } from '../../services/workspace.service';
import { espaceService } from '../../services/espace.service';
import type { Member } from '../../types';

interface MemberManagementProps {
  workspaceId?: string;
  espaceId?: string;
  onMemberAdded?: () => void;
}

// Rôles disponibles (valeurs backend en français)
const AVAILABLE_ROLES = ['Invité', 'Membre', 'Administrateur'];
// Rôle spécial "Créateur" non modifiable
const CREATOR_ROLE = 'Créateur';

export default function MemberManagement({ workspaceId, espaceId, onMemberAdded }: MemberManagementProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Membre');

  const loadMembers = async () => {
    setLoading(true);
    try {
      if (workspaceId) {
        const data = await workspaceService.getMembers(workspaceId);
        setMembers(data.map((m: any) => ({
          id: m.id,
          name: m.utilisateur?.username || m.utilisateur?.nom || 'Inconnu',
          email: m.utilisateur?.email || '',
          role: m.role,
        })));
      } else if (espaceId) {
        const data = await espaceService.getMembers(espaceId);
        setMembers(data.map((m: any) => ({
          id: m.id,
          name: m.utilisateur?.username || m.utilisateur?.nom || 'Inconnu',
          email: m.utilisateur?.email || '',
          role: m.role,
        })));
      }
    } catch (err) {
      console.error('Erreur chargement membres', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [workspaceId, espaceId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      if (workspaceId) {
        await workspaceService.inviteMember(workspaceId, { email: inviteEmail, role: inviteRole });
      } else if (espaceId) {
        await espaceService.inviteMember(espaceId, inviteEmail, inviteRole);
      }
      await loadMembers();
      onMemberAdded?.();
      setIsInviteModalOpen(false);
      setInviteEmail('');
    } catch (err: any) {
      console.error('Erreur invitation', err);
      alert(err.message || 'Erreur lors de l\'invitation');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Retirer ce membre ?')) return;
    try {
      if (workspaceId) {
        await workspaceService.removeMember(workspaceId, userId);
      } else if (espaceId) {
        await espaceService.removeMember(espaceId, userId);
      }
      await loadMembers();
    } catch (err) {
      console.error('Erreur suppression', err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      if (workspaceId) {
        await workspaceService.updateMemberRole(workspaceId, userId, newRole);
      } else if (espaceId) {
        await espaceService.updateMemberRole(espaceId, userId, newRole);
      }
      await loadMembers();
    } catch (err) {
      console.error('Erreur modification rôle', err);
      alert('Erreur lors de la modification du rôle');
    }
  };

  const isCreator = (role: string) => role === CREATOR_ROLE;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          {workspaceId ? 'Membres du workspace' : 'Membres de l\'espace'}
        </h3>
        <Button size="sm" onClick={() => setIsInviteModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Inviter
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Chargement...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Aucun membre</div>
      ) : (
        <div className="space-y-2">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
                <span className="text-xs text-gray-400 mt-1 inline-block">
                  Rôle : {member.role}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isCreator(member.role) ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      {AVAILABLE_ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400 italic">Créateur</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="Membre">Membre</option>
              <option value="Administrateur">Administrateur</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Annuler</Button>
            <Button onClick={handleInvite}>Inviter</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}