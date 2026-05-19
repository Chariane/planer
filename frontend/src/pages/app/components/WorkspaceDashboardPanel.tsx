// frontend/src/pages/app/components/WorkspaceDashboardPanel.tsx
import { useEffect, useMemo, useState } from 'react';
import { Activity, Briefcase, Calendar, FolderTree, ListTodo, UserPlus, Users, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import { espaceService } from '../../../services/espace.service';
import { listeService } from '../../../services/liste.service';
import { workspaceService } from '../../../services/workspace.service';
import { useWorkspaceRole } from '../../../hooks/useWorkspaceRole';
import { getMemberDisplayName, getMemberEmail } from '../../../utils/memberDisplay';
import type { Member } from '../../../types';

interface WorkspaceDashboardPanelProps {
  workspaceId: string;
}

const countSpaces = (items: any[] = []): number =>
  items.reduce((total, item) => total + 1 + countSpaces(item.sous_espaces || []), 0);

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

export default function WorkspaceDashboardPanel({ workspaceId }: WorkspaceDashboardPanelProps) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [stats, setStats] = useState({
    spacesCount: 0,
    listsCount: 0,
    membersCount: 0,
  });
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

  // Récupérer le rôle de l'utilisateur dans ce workspace
  const { isGuest, isAdmin, isCreator } = useWorkspaceRole(workspaceId);
  const canInviteMembers = isAdmin || isCreator;
  const availableInvitationRoles = useMemo(
    () => (isCreator ? ['Invité', 'Administrateur'] : ['Invité']),
    [isCreator],
  );

  useEffect(() => {
    if (!availableInvitationRoles.includes(inviteRole)) {
      setInviteRole(availableInvitationRoles[0]);
    }
  }, [availableInvitationRoles, inviteRole]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      let resolvedName = 'Workspace';
      let resolvedDescription = '';

      try {
        const workspace = await workspaceService.getById(workspaceId);
        resolvedName = workspace.nom || resolvedName;
        resolvedDescription = workspace.description || '';
      } catch {
        // Accès contextuel ou endpoint indisponible : les stats chargent ce qui est possible.
      }

      // 🔧 Charger les membres pour tout le monde (y compris les invités)
      let formattedMembers: Member[] = [];
      let membersCount = 0;
      
      try {
        const membersData = await workspaceService.getMembers(workspaceId);
        formattedMembers = membersData.map((m: any) => ({
          id: m.id_utilisateur || m.utilisateur?.id || m.id,
          name: getMemberDisplayName(m),
          email: getMemberEmail(m),
          role: m.role,
        }));
        membersCount = formattedMembers.length;
      } catch (err: any) {
        console.warn('Impossible de charger les membres:', err);
        if (err.status === 403) {
          console.log('Accès refusé pour voir les membres - affichage limité');
          // Si c'est un invité, on peut essayer un endpoint public ou laisser vide
        }
      }
      setMembers(formattedMembers);

      let spacesCount = 0;
      try {
        const tree = await espaceService.getTree(workspaceId);
        spacesCount = countSpaces(Array.isArray(tree) ? tree : []);
      } catch {
        spacesCount = 0;
      }

      let listsCount = 0;
      try {
        const workspaceLists = await listeService.getByWorkspace(workspaceId);
        listsCount = Array.isArray(workspaceLists) ? workspaceLists.length : 0;
      } catch {
        listsCount = 0;
      }

      setWorkspaceName(resolvedName);
      setWorkspaceDescription(resolvedDescription);
      setStats({
        spacesCount,
        listsCount,
        membersCount: membersCount,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await workspaceService.inviteMember(workspaceId, { email: inviteEmail, role: inviteRole });
      showMessage(`Invitation envoyée à ${inviteEmail} avec le rôle ${inviteRole}`, 'success');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      await loadData();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('refuse') || msg.includes('redondant')) {
        showMessage('Cette personne a déjà un rôle parent qui couvre ce workspace', 'error');
      } else {
        showMessage(msg || "Erreur lors de l'invitation", 'error');
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

      {/* Message pour les invités - mais ils peuvent voir les membres */}
      {isGuest && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            👁️ Vous êtes en mode <strong>lecture seule</strong> dans ce workspace.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Vous pouvez consulter les informations et voir les membres, mais vous ne pouvez pas inviter de nouveaux membres.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Briefcase className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{workspaceName}</h1>
              <p className="text-gray-500 mt-1">Tableau de bord du workspace</p>
            </div>
          </div>
          {workspaceDescription && (
            <p className="text-sm text-gray-500 mt-3 max-w-2xl">{workspaceDescription}</p>
          )}
        </div>
        {/* Bouton Inviter - visible uniquement pour Admin et Créateur */}
        {canInviteMembers && (
          <Button onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Inviter un membre
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderTree className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Espaces</p>
              <p className="text-2xl font-bold text-gray-800">{stats.spacesCount}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ListTodo className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Projets directs</p>
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

      {/* Liste des membres - visible pour tout le monde (y compris les invités) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Membres du workspace
        </h3>
        {members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map(member => (
              <GlassCard key={member.id} className="p-3 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="font-medium text-gray-800">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  member.role === 'Administrateur' ? 'bg-orange-100 text-orange-700'
                    : member.role === 'Créateur' ? 'bg-purple-100 text-purple-700'
                      : member.role === 'Invité' ? 'bg-gray-100 text-gray-500'
                        : 'bg-blue-100 text-blue-700'
                }`}>
                  {member.role === 'Invité' ? '👁️ Invité' : member.role === 'Membre' ? '👤 Membre' : member.role === 'Administrateur' ? '🔐 Admin' : '👑 Créateur'}
                </span>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="p-4">
            <div className="text-center text-gray-400 py-4">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Aucun membre pour le moment</p>
              {!isGuest && <p className="text-sm mt-1">Invitez des membres pour commencer à collaborer.</p>}
            </div>
          </GlassCard>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activités récentes
        </h3>
        <GlassCard className="p-4">
          <div className="text-center text-gray-400 py-8">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Fonctionnalité à venir</p>
            <p className="text-sm">Les activités récentes du workspace seront affichées ici</p>
          </div>
        </GlassCard>
      </div>

      {/* Modale d'invitation - visible uniquement pour Admin et Créateur */}
      {canInviteMembers && (
        <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Inviter un membre au workspace" size="md">
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
                {availableInvitationRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                💡 <strong>Invitant</strong> : accès en lecture seule<br />
                💡 <strong>Administrateur</strong> : peut gérer le workspace et ses membres
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
