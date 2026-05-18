// frontend/src/components/members/MemberManagement.tsx
import { useState, useEffect } from 'react';
import { UserPlus, Trash2, X, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { workspaceService } from '../../services/workspace.service';
import { espaceService } from '../../services/espace.service';
import { listeService } from '../../services/liste.service';
import { usePermissions } from '../../hooks/usePermissions';
import { getRoleLabel, getAvailableInvitationRoles } from '../../lib/roleHierarchy';
import type { Member } from '../../types';

interface MemberManagementProps {
  workspaceId?: string;
  espaceId?: string;
  listeId?: string;
  onMemberAdded?: () => void;
  currentUserRole?: string | null;
}

// Rôles disponibles pour la gestion (après invitation)
const MANAGABLE_ROLES = ['Invité', 'Membre', 'Administrateur'];
const CREATOR_ROLE = 'Créateur';
const ADMIN_ROLE = 'Administrateur';

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

export default function MemberManagement({ 
  workspaceId, 
  espaceId, 
  listeId,
  onMemberAdded, 
  currentUserRole 
}: MemberManagementProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Invité');
  
  // États pour les notifications toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Permissions
  const resourceType = workspaceId ? 'workspace' : espaceId ? 'espace' : 'liste';
  const { canManageMembers, canInviteMembers, isAdmin, isCreator } = usePermissions({
    userRole: currentUserRole,
    resourceType: resourceType,
  });

  // Rôles disponibles pour l'invitation (selon le rôle de l'inviteur)
  const availableInvitationRoles = getAvailableInvitationRoles(currentUserRole || '');

  const loadMembers = async () => {
    setLoading(true);
    try {
      let data;
      if (workspaceId) {
        data = await workspaceService.getMembers(workspaceId);
      } else if (espaceId) {
        data = await espaceService.getMembers(espaceId);
      } else if (listeId) {
        data = await listeService.getMembers(listeId);
      } else {
        setMembers([]);
        setLoading(false);
        return;
      }
      
      setMembers(data.map((m: any) => ({
        id: m.id_utilisateur || m.utilisateur?.id || m.id,
        name: m.utilisateur?.username || m.utilisateur?.nom || 'Inconnu',
        email: m.utilisateur?.email || '',
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
      if (workspaceId) {
        await workspaceService.inviteMember(workspaceId, { email: inviteEmail, role: inviteRole });
      } else if (espaceId) {
        await espaceService.inviteMember(espaceId, inviteEmail, inviteRole);
      } else if (listeId) {
        // Pour une liste, on utilise inviteMember (envoi d'email) au lieu de assignMember
        await listeService.inviteMember(listeId, inviteEmail, inviteRole);
      }
      await loadMembers();
      onMemberAdded?.();
      setIsInviteModalOpen(false);
      setInviteEmail('');
      showMessage(`Invitation envoyée à ${inviteEmail} avec le rôle ${inviteRole}`, 'success');
    } catch (err: any) {
      console.error('Erreur invitation', err);
      if (err.message?.includes('deja du role') || err.message?.includes('redondant')) {
        showMessage('Cette personne a déjà un rôle parent qui couvre cette ressource', 'error');
      } else if (err.message?.includes('403')) {
        showMessage('Vous n\'avez pas les permissions nécessaires pour inviter des membres.', 'error');
      } else {
        showMessage(err.message || 'Erreur lors de l\'invitation', 'error');
      }
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const targetMember = members.find(m => m.id === userId);
    
    // L'Admin ne peut pas supprimer un autre Admin ou le Créateur
    if (isAdmin && targetMember && ((targetMember.role as string) === ADMIN_ROLE || (targetMember.role as string) === CREATOR_ROLE)) {
      showMessage('Vous ne pouvez pas retirer un autre administrateur ou le créateur', 'error');
      return;
    }
    
    if (!confirm('Retirer ce membre ?')) return;
    try {
      if (workspaceId) {
        await workspaceService.removeMember(workspaceId, userId);
      } else if (espaceId) {
        await espaceService.removeMember(espaceId, userId);
      } else if (listeId) {
        await listeService.unassignMember(listeId, userId);
      }
      await loadMembers();
      showMessage('Membre retiré avec succès', 'success');
    } catch (err) {
      console.error('Erreur suppression', err);
      showMessage('Erreur lors de la suppression', 'error');
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    const targetMember = members.find(m => m.id === userId);
    
    // L'Admin ne peut pas modifier un autre Admin ou le Créateur
    if (isAdmin && targetMember && ((targetMember.role as string) === ADMIN_ROLE || (targetMember.role as string) === CREATOR_ROLE)) {
      showMessage('Vous ne pouvez pas modifier le rôle d\'un autre administrateur ou du créateur', 'error');
      return;
    }
    
    // L'Admin ne peut pas promouvoir quelqu'un au rôle Administrateur
    if (isAdmin && newRole === ADMIN_ROLE) {
      showMessage('Vous ne pouvez pas promouvoir un membre au rôle Administrateur', 'error');
      return;
    }
    
    try {
      if (workspaceId) {
        await workspaceService.updateMemberRole(workspaceId, userId, newRole);
      } else if (espaceId) {
        await espaceService.updateMemberRole(espaceId, userId, newRole);
      } else if (listeId) {
        await listeService.assignMember(listeId, userId, newRole);
      }
      await loadMembers();
      showMessage(`Rôle modifié avec succès`, 'success');
    } catch (err: any) {
      console.error('Erreur modification rôle', err);
      if (err.message?.includes('deja du role') || err.message?.includes('redondant')) {
        showMessage('Ce rôle est déjà couvert par un rôle parent', 'error');
      } else {
        showMessage('Erreur lors de la modification du rôle', 'error');
      }
    }
  };

  const isCreatorMember = (role: string) => role === CREATOR_ROLE;

  // Pour les listes, les rôles disponibles pour l'assignation
  const getAvailableRolesForListe = () => {
    if (isCreator) return ['Membre', 'Administrateur', 'Créateur'];
    if (isAdmin) return ['Membre', 'Invité'];
    return ['Membre'];
  };

  const displayRoles = listeId ? getAvailableRolesForListe() : MANAGABLE_ROLES;

  // 🔧 Déterminer le titre de la modale selon le contexte
  const getModalTitle = () => {
    if (listeId) return "Inviter un membre dans la liste";
    if (workspaceId) return "Inviter un membre dans le workspace";
    if (espaceId) return "Inviter un membre dans l'espace";
    return "Inviter un membre";
  };

  // 🔧 Déterminer le texte du bouton d'invitation
  const getInviteButtonText = () => {
    if (listeId) return "Inviter";
    return "Inviter";
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          {workspaceId && 'Membres du workspace'}
          {espaceId && 'Membres de l\'espace'}
          {listeId && 'Membres de la liste'}
        </h3>
        {canInviteMembers && availableInvitationRoles.length > 0 && (
          <Button size="sm" onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> {getInviteButtonText()}
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>Aucun membre</p>
          <p className="text-sm mt-1">
            {listeId 
              ? 'Invitez des membres pour collaborer sur cette liste'
              : 'Invitez des membres pour commencer'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
                <span className="text-xs text-gray-400 mt-1 inline-block">
                  Rôle : {getRoleLabel(member.role)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isCreatorMember(member.role) && canManageMembers && (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                      disabled={isAdmin && ((member.role as string) === ADMIN_ROLE || (member.role as string) === CREATOR_ROLE)}
                    >
                      {displayRoles.map(r => (
                        <option key={r} value={r}>{getRoleLabel(r)}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      disabled={isAdmin && ((member.role as string) === ADMIN_ROLE || (member.role as string) === CREATOR_ROLE)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                {isCreatorMember(member.role) && (
                  <span className="text-xs text-gray-400 italic">Créateur</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale d'invitation */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title={getModalTitle()} size="md">
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
            {listeId && (
              <p className="text-xs text-gray-400 mt-1">
                💡 Une invitation par email sera envoyée à cette personne.
              </p>
            )}
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
              {availableInvitationRoles.map(role => (
                <option key={role} value={role}>{getRoleLabel(role)}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {isCreator ? (
                <>
                  💡 <strong>Administrateur</strong> : peut gérer la ressource et ses membres<br />
                  💡 <strong>Invitant</strong> : accès en lecture seule
                </>
              ) : isAdmin ? (
                <>
                  💡 En tant qu'administrateur, vous pouvez inviter des <strong>Membres</strong> ou des <strong>Invités</strong>
                </>
              ) : (
                <>
                  💡 Vous pouvez inviter des <strong>Membres</strong> ou des <strong>Invités</strong>
                </>
              )}
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