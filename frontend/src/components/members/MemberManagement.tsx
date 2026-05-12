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

// Rôles disponibles pour la gestion (après invitation)
const MANAGABLE_ROLES = ['Invité', 'Membre', 'Administrateur'];
const CREATOR_ROLE = 'Créateur';

// Rôles disponibles pour l'invitation (limités à Invité et Administrateur)
const INVITATION_ROLES = ['Invité', 'Administrateur'];

export default function MemberManagement({ workspaceId, espaceId, onMemberAdded }: MemberManagementProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Invité');

  const loadMembers = async () => {
    setLoading(true);
    try {
      if (workspaceId) {
        const data = await workspaceService.getMembers(workspaceId);
        setMembers(data.map((m: any) => ({
          id: m.id_utilisateur || m.utilisateur?.id || m.id,
          name: m.utilisateur?.username || m.utilisateur?.nom || 'Inconnu',
          email: m.utilisateur?.email || '',
          role: m.role,
        })));
      } else if (espaceId) {
        const data = await espaceService.getMembers(espaceId);
        setMembers(data.map((m: any) => ({
          id: m.id_utilisateur || m.utilisateur?.id || m.id,
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
      alert(`✅ Invitation envoyée à ${inviteEmail} avec le rôle ${inviteRole}`);
    } catch (err: any) {
      console.error('Erreur invitation', err);
      if (err.message?.includes('deja du role') || err.message?.includes('redondant')) {
        alert('❌ Cette personne a déjà un rôle parent qui couvre cet espace/workspace');
      } else {
        alert(err.message || 'Erreur lors de l\'invitation');
      }
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
    } catch (err: any) {
      console.error('Erreur modification rôle', err);
      if (err.message?.includes('deja du role') || err.message?.includes('redondant')) {
        alert('❌ Ce rôle est déjà couvert par un rôle parent');
      } else {
        alert('Erreur lors de la modification du rôle');
      }
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
                      {MANAGABLE_ROLES.map(r => (
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

      {/* Modale d'invitation avec choix Invité / Administrateur */}
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
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
            >
              {INVITATION_ROLES.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              💡 <strong>Invitant</strong> : accès en lecture seule<br />
              💡 <strong>Administrateur</strong> : peut gérer l'espace/workspace et ses membres
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
    </div>
  );
}