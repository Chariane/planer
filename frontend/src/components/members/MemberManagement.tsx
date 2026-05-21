// frontend/src/components/members/MemberManagement.tsx
import { useState, useEffect } from 'react';
import { UserPlus, Trash2, X, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { workspaceService } from '../../services/workspace.service';
import { espaceService } from '../../services/espace.service';
import { listeService } from '../../services/liste.service';
import { usePermissions } from '../../hooks/usePermissions';
import { useResourceRole } from '../../hooks/useResourceRole';
import { getRoleLabel, getAvailableInvitationRoles } from '../../lib/roleHierarchy';
import { getMemberDisplayName, getMemberEmail } from '../../utils/memberDisplay';
import type { Member } from '../../types';

interface MemberManagementProps {
  workspaceId?: string;
  espaceId?: string;
  listeId?: string;
  onMemberAdded?: () => void;
  currentUserRole?: string | null;
  searchQuery?: string;
}

const MANAGABLE_ROLES = ['Invité', 'Membre', 'Administrateur'];
const CREATOR_ROLE = 'Créateur';
const ADMIN_ROLE = 'Administrateur';

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

export default function MemberManagement({
  workspaceId,
  espaceId,
  listeId,
  onMemberAdded,
  currentUserRole,
  searchQuery = ''
}: MemberManagementProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Invité');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ userId: string; onConfirm: () => Promise<void> } | null>(null);

  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const resourceType = listeId ? 'liste' : espaceId ? 'espace' : 'workspace';
  const { role: directListRole } = useResourceRole(listeId, 'liste');
  const { canManageMembers, canInviteMembers, isAdmin, isCreator } = usePermissions({
    userRole: currentUserRole,
    resourceType: resourceType,
  });
  const isDirectListAdmin = !!listeId && directListRole === ADMIN_ROLE;
  const canChangeMemberRoles = canManageMembers && !isDirectListAdmin;
  const availableInvitationRoles = getAvailableInvitationRoles(currentUserRole || '');

  const loadMembers = async () => {
    setLoading(true);
    try {
      let data;
      if (listeId) {
        data = await listeService.getMembers(listeId);
      } else if (espaceId) {
        data = await espaceService.getMembers(espaceId);
      } else if (workspaceId) {
        data = await workspaceService.getMembers(workspaceId);
      } else {
        setMembers([]);
        setLoading(false);
        return;
      }

      setMembers(data.map((m: any) => ({
        id: m.id_utilisateur || m.utilisateur?.id || m.id,
        name: getMemberDisplayName(m),
        email: getMemberEmail(m),
        role: m.role,
      })));
    } catch (err) {
      console.error('Erreur chargement membres', err);
      showMessage('Erreur lors du chargement des membres', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [workspaceId, espaceId, listeId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      if (listeId) {
        await listeService.inviteMember(listeId, inviteEmail, inviteRole);
      } else if (espaceId) {
        await espaceService.inviteMember(espaceId, inviteEmail, inviteRole);
      } else if (workspaceId) {
        await workspaceService.inviteMember(workspaceId, { email: inviteEmail, role: inviteRole });
      }
      await loadMembers();
      onMemberAdded?.();
      setIsInviteModalOpen(false);
      setInviteEmail('');
      showMessage(`Invitation envoyée à ${inviteEmail}`, 'success');
    } catch (err: any) {
      showMessage(err.message || 'Erreur lors de l\'invitation', 'error');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const targetMember = members.find(m => m.id === userId);
    if (isAdmin && targetMember && ((targetMember.role as string) === ADMIN_ROLE || (targetMember.role as string) === CREATOR_ROLE)) {
      showMessage('Action non autorisée', 'error');
      return;
    }

    setConfirmData({
      userId,
      onConfirm: async () => {
        try {
          if (listeId) {
            await listeService.unassignMember(listeId, userId);
          } else if (espaceId) {
            await espaceService.removeMember(espaceId, userId);
          } else if (workspaceId) {
            await workspaceService.removeMember(workspaceId, userId);
          }
          await loadMembers();
          showMessage('Membre retiré', 'success');
        } catch (err) {
          showMessage('Erreur lors de la suppression', 'error');
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      if (listeId) {
        await listeService.assignMember(listeId, userId, newRole);
      } else if (espaceId) {
        await espaceService.updateMemberRole(espaceId, userId, newRole);
      } else if (workspaceId) {
        await workspaceService.updateMemberRole(workspaceId, userId, newRole);
      }
      await loadMembers();
      showMessage(`Rôle modifié`, 'success');
    } catch (err: any) {
      showMessage(err.message || 'Erreur modification rôle', 'error');
    }
  };

  const isCreatorMember = (role: string) => role === CREATOR_ROLE;
  const getAvailableRolesForListe = () => (isCreator || isAdmin) ? ['Membre', 'Administrateur'] : ['Membre'];
  const displayRoles = listeId ? getAvailableRolesForListe() : MANAGABLE_ROLES;

  const filteredMembers = members.filter(member =>
    !searchQuery ||
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="text-center py-8 text-gray-500">Chargement...</div>;

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          {listeId ? 'Membres de la liste' : espaceId ? 'Membres de l\'espace' : 'Membres du workspace'}
        </h3>
        {!listeId && canInviteMembers && availableInvitationRoles.length > 0 && (
          <Button size="sm" onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Inviter
          </Button>
        )}
      </div>

      {filteredMembers.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>{searchQuery ? 'Aucun membre trouvé' : 'Aucun membre'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
              <div>
                <p className="font-medium text-gray-800">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">
                  {getRoleLabel(member.role)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isCreatorMember(member.role) && canChangeMemberRoles && (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="text-sm border rounded px-1 py-1"
                    >
                      {displayRoles.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                    </select>
                    <button onClick={() => handleRemoveMember(member.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Inviter un membre" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full p-2 border rounded-lg">
              {availableInvitationRoles.map(role => <option key={role} value={role}>{getRoleLabel(role)}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Annuler</Button>
            <Button onClick={handleInvite}>Inviter</Button>
          </div>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmData?.onConfirm || (() => Promise.resolve())}
        title="Retirer le membre"
        message="Voulez-vous vraiment retirer ce membre de cette ressource ? Cette action peut être annulée en ré-invitant le membre plus tard."
        confirmText="Retirer"
      />
    </div>
  );
}
