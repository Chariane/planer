// frontend/src/components/modals/AssignListMemberModal.tsx
import { useState, useEffect } from 'react';
import { UserPlus, Mail, Users, CheckCircle, Loader2 } from 'lucide-react';
import { listeService } from '../../services/liste.service';
import { espaceService } from '../../services/espace.service';
import { workspaceService } from '../../services/workspace.service';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { getRoleLabel } from '../../lib/roleHierarchy';

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
}

// Rôles disponibles pour l'ajout à une liste (sans Créateur)
const AVAILABLE_ROLES = ['Membre', 'Administrateur'];

type TabType = 'invited' | 'external';

export default function AssignListMemberModal({
  listeId,
  espaceId,
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
}: AssignListMemberModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('invited');
  const [invitedMembers, setInvitedMembers] = useState<Member[]>([]);
  const [listMembers, setListMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('Membre');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('Membre');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Charger les membres invités (rôle "Invité") depuis l'espace ou le workspace parent
  useEffect(() => {
    if (!isOpen) return;

    const loadInvitedMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        let spaceMembers: any[] = [];
        
        if (espaceId) {
          spaceMembers = await espaceService.getMembers(espaceId);
        } else if (workspaceId) {
          spaceMembers = await workspaceService.getMembers(workspaceId);
        }

        // Filtrer uniquement les utilisateurs avec le rôle "Invité"
        const filteredMembers = spaceMembers.filter((m: any) => m.role === 'Invité');
        
        const formattedMembers: Member[] = filteredMembers.map((m: any) => ({
          id: m.id_utilisateur || m.id,
          name: m.utilisateur?.nom || m.utilisateur?.username || 'Inconnu',
          email: m.utilisateur?.email || '',
          role: m.role,
        }));
        setInvitedMembers(formattedMembers);
      } catch (err) {
        console.error('Erreur chargement membres invités:', err);
        setError('Impossible de charger les membres invités');
      } finally {
        setLoading(false);
      }
    };

    loadInvitedMembers();
  }, [isOpen, espaceId, workspaceId]);

  // Charger les membres déjà dans la liste
  useEffect(() => {
    if (!isOpen || !listeId) return;

    const loadListMembers = async () => {
      try {
        const members = await listeService.getMembers(listeId);
        const formatted = members.map((m: any) => ({
          id: m.id_utilisateur || m.id,
          name: m.utilisateur?.username || m.utilisateur?.nom || 'Inconnu',
          email: m.utilisateur?.email || '',
          role: m.role || 'Membre',
        }));
        setListMembers(formatted);
      } catch (err) {
        console.error('Erreur chargement membres de la liste:', err);
      }
    };

    loadListMembers();
  }, [isOpen, listeId]);

  const isMemberInList = (memberId: string) => {
    return listMembers.some(m => m.id === memberId);
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
      await listeService.assignMember(listeId, selectedMemberId, selectedRole);
      
      const newMember = invitedMembers.find(m => m.id === selectedMemberId);
      if (newMember) {
        setListMembers(prev => [...prev, { ...newMember, role: selectedRole }]);
      }
      
      setSuccessMessage(`Membre ajouté avec le rôle ${getRoleLabel(selectedRole)}`);
      setSelectedMemberId('');
      setSelectedRole('Membre');
      
      setTimeout(() => setSuccessMessage(null), 3000);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erreur ajout membre:', err);
      if (err.message?.includes('redondant')) {
        setError('Ce membre a déjà un rôle parent qui couvre cette liste');
      } else {
        setError(err.message || 'Erreur lors de l\'ajout du membre');
      }
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
      await listeService.inviteMember(listeId, inviteEmail, inviteRole);
      setSuccessMessage(`Invitation envoyée à ${inviteEmail} avec le rôle ${getRoleLabel(inviteRole)}`);
      setInviteEmail('');
      setInviteRole('Membre');
      
      setTimeout(() => setSuccessMessage(null), 3000);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erreur invitation:', err);
      if (err.message?.includes('déjà')) {
        setError('Cet utilisateur existe déjà. Utilisez l\'onglet "Membres invités" pour l\'ajouter.');
      } else if (err.message?.includes('redondant')) {
        setError('Cette personne a déjà un rôle parent qui couvre cette liste');
      } else {
        setError(err.message || 'Erreur lors de l\'envoi de l\'invitation');
      }
    } finally {
      setInviting(false);
    }
  };

  const availableInvitedMembers = invitedMembers.filter(m => !isMemberInList(m.id));

  const handleClose = () => {
    setActiveTab('invited');
    setSelectedMemberId('');
    setSelectedRole('Membre');
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
            onClick={() => setActiveTab('invited')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'invited'
                ? 'border-b-2 border-secondary text-secondary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4" />
            Membres invités
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

        {activeTab === 'invited' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 text-secondary animate-spin" />
              </div>
            ) : availableInvitedMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun membre invité disponible</p>
                <p className="text-xs mt-1">Invitez d'abord des personnes dans l'espace ou le workspace parent</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Membres invités disponibles
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
                  >
                    <option value="">Sélectionner un membre...</option>
                    {availableInvitedMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Ces personnes ont le rôle "Invité" dans l'espace/workspace parent
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
                    {AVAILABLE_ROLES.map(role => (
                      <option key={role} value={role}>{getRoleLabel(role)}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Le rôle que le membre aura dans cette liste
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
                {AVAILABLE_ROLES.map(role => (
                  <option key={role} value={role}>{getRoleLabel(role)}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Le rôle que la personne aura dans cette liste après acceptation
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

        {listMembers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Membres déjà dans la liste ({listMembers.length})
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {listMembers.map(member => (
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