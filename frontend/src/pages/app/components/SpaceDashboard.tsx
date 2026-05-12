// frontend/src/pages/app/components/SpaceDashboard.tsx
import { useState, useEffect } from 'react';
import { Users, ListTodo, UserPlus, FolderTree, Calendar, Activity, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import { espaceService } from '../../../services/espace.service';
import { listeService } from '../../../services/liste.service';
import { useResourceRole } from '../../../hooks/useResourceRole';
import type { Member } from '../../../types';

interface SpaceDashboardProps {
  spaceId: string;
  onMemberInvited?: () => void;
}

// Rôles disponibles pour l'invitation (limités à Invité et Administrateur)
const INVITATION_ROLES = ['Invité', 'Administrateur'];

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

export default function SpaceDashboard({ spaceId, onMemberInvited }: SpaceDashboardProps) {
  const [stats, setStats] = useState({
    subSpacesCount: 0,
    listsCount: 0,
    membersCount: 0,
  });
  const [spaceName, setSpaceName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Invité');
  
  // État pour les notifications toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Récupérer le rôle de l'utilisateur dans cet espace
  const { isGuest, isAdmin, isCreator } = useResourceRole(spaceId, 'espace');
  const canInviteMembers = isAdmin || isCreator;

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Charger les infos de l'espace
      const spaceData = await espaceService.getById(spaceId);
      setSpaceName(spaceData.nom);

      // 2. Charger les membres - IMPORTANT: Les invités peuvent aussi voir les membres
      let formattedMembers: Member[] = [];
      try {
        const membersData = await espaceService.getMembers(spaceId);
        formattedMembers = membersData.map((m: any) => ({
          id: m.id,
          name: m.utilisateur?.nom || m.utilisateur?.username || 'Inconnu',
          email: m.utilisateur?.email || '',
          role: m.role,
        }));
      } catch (err: any) {
        // Si l'API retourne une erreur 403, on affiche un message mais on ne bloque pas l'affichage
        console.warn('Impossible de charger les membres:', err);
        if (err.status === 403) {
          console.log('Accès refusé pour voir les membres - affichage limité');
        }
      }
      setMembers(formattedMembers);

      // 3. Charger les listes (peut échouer si accès partiel)
      let listsCount = 0;
      try {
        const lists = await listeService.getByEspace(spaceId);
        listsCount = lists.length;
      } catch {
        // Accès partiel - l'utilisateur ne peut pas voir les listes
        console.log('Impossible de charger les listes');
      }

      // 4. Charger les sous-espaces (enfants directs)
      let subSpacesCount = 0;
      try {
        const subSpaces = await espaceService.getSubSpaces(spaceId);
        subSpacesCount = subSpaces.length;
      } catch {
        subSpacesCount = 0;
      }

      setStats({
        subSpacesCount,
        listsCount,
        membersCount: formattedMembers.length,
      });
    } catch (err) {
      console.error('Erreur chargement espace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [spaceId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await espaceService.inviteMember(spaceId, inviteEmail, inviteRole);
      showMessage(`Invitation envoyée à ${inviteEmail} avec le rôle ${inviteRole}`, 'success');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      await loadData();
      onMemberInvited?.();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('refuse') || msg.includes('redondant')) {
        showMessage('Cette personne a déjà un rôle parent qui couvre cet espace', 'error');
      } else if (msg.includes('403')) {
        showMessage('Vous n\'avez pas les permissions nécessaires pour inviter des membres dans cet espace.', 'error');
      } else {
        showMessage(msg || 'Erreur lors de l\'invitation', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement du tableau de bord...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Message pour les invités */}
      {isGuest && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            👁️ Vous êtes en mode <strong>lecture seule</strong> dans cet espace.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Vous pouvez consulter les informations mais ne pouvez pas inviter de nouveaux membres.
          </p>
        </div>
      )}

      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{spaceName}</h1>
          <p className="text-gray-500 mt-1">Tableau de bord de l'espace</p>
        </div>
        {/* Bouton Inviter - visible uniquement pour Admin et Créateur */}
        {canInviteMembers && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsInviteModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Inviter un membre
            </Button>
          </div>
        )}
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderTree className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sous-espaces</p>
              <p className="text-2xl font-bold text-gray-800">{stats.subSpacesCount}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ListTodo className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Listes / Projets</p>
              <p className="text-2xl font-bold text-gray-800">{stats.listsCount}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Membres</p>
              <p className="text-2xl font-bold text-gray-800">{stats.membersCount}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Liste des membres - visible pour tous (invités inclus) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Membres de l'espace
        </h3>
        {members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map(member => (
              <GlassCard key={member.id} className="p-3 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="font-medium text-gray-800">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${member.role === 'Administrateur' ? 'bg-orange-100 text-orange-700' :
                    member.role === 'Créateur' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                  }`}>
                  {member.role}
                </span>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="p-4">
            <div className="text-center text-gray-400 py-4">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Impossible de charger la liste des membres</p>
              <p className="text-sm mt-1">Vous n'avez pas les droits nécessaires pour voir les membres de cet espace.</p>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Liste des sous-espaces (optionnel - pour voir la hiérarchie) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          Sous-espaces
        </h3>
        {stats.subSpacesCount > 0 ? (
          <div className="text-sm text-gray-600">
            Cet espace contient {stats.subSpacesCount} sous-espace(s)
          </div>
        ) : (
          <GlassCard className="p-4">
            <div className="text-center text-gray-400 py-4">
              <FolderTree className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Aucun sous-espace</p>
              <p className="text-sm">Créez des sous-espaces pour mieux organiser votre travail</p>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Activités récentes (placeholder) - visible pour tous */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activités récentes
        </h3>
        <GlassCard className="p-4">
          <div className="text-center text-gray-400 py-8">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Fonctionnalité à venir</p>
            <p className="text-sm">Les activités récentes seront affichées ici</p>
          </div>
        </GlassCard>
      </div>

      {/* Modale d'invitation - visible uniquement pour Admin et Créateur */}
      {canInviteMembers && (
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
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              >
                {INVITATION_ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                💡 <strong>Invitant</strong> : accès en lecture seule<br />
                💡 <strong>Administrateur</strong> : peut gérer l'espace et ses membres
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
      )}
    </div>
  );
}