// frontend/src/pages/app/components/ListDashboard.tsx
import { useState, useEffect } from 'react';
import { Users, UserPlus, Calendar, Activity, Target, X, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import { listeService } from '../../../services/liste.service';
import { tacheService } from '../../../services/tache.service';
import { sanitizeApiErrorMessage } from '../../../services/api';
import { useResourceRole } from '../../../hooks/useResourceRole';
import { useWorkspaceRole } from '../../../hooks/useWorkspaceRole';
import { getAvatarSrc, getInitials, getMemberDisplayName, getMemberEmail, getMemberPhotoBase64 } from '../../../utils/memberDisplay';
import type { Member } from '../../../types';

interface ListDashboardProps {
  listId: string;
  listName: string;
  workspaceId?: string | null;
  espaceId?: string | null;
  onMemberInvited?: () => void;
}

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

export default function ListDashboard({ listId, listName, workspaceId, espaceId, onMemberInvited }: ListDashboardProps) {
  const [listDescription, setListDescription] = useState('');
  const [stats, setStats] = useState({
    membersCount: 0,
    tasksCount: 0,
    pendingTasksCount: 0,
    inProgressTasksCount: 0,
    doneTasksCount: 0,
    blockedTasksCount: 0,
    listProgress: 0,
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Invité');
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const { isGuest: isListeGuest, isAdmin: isListeAdmin, isCreator: isListeCreator } = useResourceRole(listId, 'liste');
  const { isAdmin: isWorkspaceAdmin, isCreator: isWorkspaceCreator } = useWorkspaceRole(workspaceId || undefined);
  
  const canInviteMembers = isListeAdmin || isListeCreator || isWorkspaceAdmin || isWorkspaceCreator;
  
  const getAvailableRoles = () => {
    if (isListeCreator || isWorkspaceCreator || isWorkspaceAdmin) {
      return ['Invité', 'Membre', 'Administrateur'];
    }
    if (isListeAdmin) {
      return ['Membre'];
    }
    return [];
  };

  const loadData = async () => {
    setLoading(true);
    try {
      try {
        const liste = await listeService.getById(listId);
        setListDescription(liste.description || '');
      } catch {
        setListDescription('');
      }

      let formattedMembers: Member[] = [];
      try {
        const membersData = await listeService.getMembers(listId);
        formattedMembers = membersData.map((m: any) => ({
          id: m.id_utilisateur || m.utilisateur?.id || m.id,
          name: getMemberDisplayName(m),
          email: getMemberEmail(m),
          role: m.role,
          photo_base64: getMemberPhotoBase64(m),
        }));
      } catch (err: any) {
        console.warn('Impossible de charger les membres:', err);
      }
      setMembers(formattedMembers);

      let tasks: any[] = [];
      try {
        const tasksData = await tacheService.getByListe(listId);
        tasks = Array.isArray(tasksData) ? tasksData : [];
      } catch (err: any) {
        console.warn('Impossible de charger les tâches:', err);
      }

      const pendingTasksCount = tasks.filter(task => task.statut === 'en attente').length;
      const inProgressTasksCount = tasks.filter(task => task.statut === 'en cours').length;
      const doneTasksCount = tasks.filter(task => task.statut === 'terminé').length;
      const blockedTasksCount = tasks.filter(task => task.statut === 'bloqué').length;
      const listProgress = tasks.length > 0
        ? Math.round(tasks.reduce((total, task) => total + Number(task.progression || 0), 0) / tasks.length)
        : 0;

      setStats({
        membersCount: formattedMembers.length,
        tasksCount: tasks.length,
        pendingTasksCount,
        inProgressTasksCount,
        doneTasksCount,
        blockedTasksCount,
        listProgress,
      });
    } catch (err) {
      console.error('Erreur chargement liste:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [listId]);

  useEffect(() => {
    const roles = getAvailableRoles();
    if (roles.length > 0 && !roles.includes(inviteRole)) {
      setInviteRole(roles[0]);
    }
  }, [isWorkspaceCreator, isWorkspaceAdmin, isListeCreator, isListeAdmin, inviteRole]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await listeService.inviteMember(listId, inviteEmail, inviteRole);
      showMessage(`Invitation envoyée à ${inviteEmail} avec le rôle ${inviteRole}`, 'success');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      await loadData();
      onMemberInvited?.();
    } catch (err: any) {
      const msg = sanitizeApiErrorMessage(err, 'Erreur lors de l\'invitation');
      if (msg.includes('403')) {
        showMessage('Vous n\'avez pas les permissions nécessaires pour inviter des membres dans cette liste.', 'error');
      } else {
        showMessage(msg, 'error');
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

  const availableRoles = getAvailableRoles();
  const statusGradient = (() => {
    if (stats.tasksCount === 0) return '#e5e7eb';
    const done = (stats.doneTasksCount / stats.tasksCount) * 100;
    const inProgress = done + (stats.inProgressTasksCount / stats.tasksCount) * 100;
    const blocked = inProgress + (stats.blockedTasksCount / stats.tasksCount) * 100;
    return `conic-gradient(#10b981 0 ${done}%, #3b82f6 ${done}% ${inProgress}%, #ef4444 ${inProgress}% ${blocked}%, #e5e7eb ${blocked}% 100%)`;
  })();

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {isListeGuest && !canInviteMembers && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            👁️ Vous êtes en mode <strong>lecture seule</strong> dans cette liste.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Vous pouvez consulter les informations mais ne pouvez pas inviter de nouveaux membres.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Target className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{listName}</h1>
              <p className="text-gray-500 mt-1">Tableau de bord de la liste</p>
            </div>
          </div>
          {listDescription && (
            <p className="text-sm text-gray-500 mt-3 max-w-3xl leading-relaxed">{listDescription}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/messagerie?resource_type=liste&resource_id=${listId}`}
            className="inline-flex items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition-all hover:bg-secondary hover:text-white hover:border-secondary"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Voir la discussion
          </Link>
          {canInviteMembers && availableRoles.length > 0 && (
            <Button onClick={() => setIsInviteModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Inviter un membre
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tâches</p>
              <p className="text-2xl font-bold text-gray-800">{stats.tasksCount}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center"
              style={{
                background: statusGradient,
              }}
              title={`Répartition par statut. Avancement moyen : ${stats.listProgress}%`}
            >
              <div className="h-11 w-11 rounded-full bg-white flex flex-col items-center justify-center leading-tight">
                <span className="text-sm font-bold text-gray-800">{stats.tasksCount}</span>
                <span className="text-[9px] text-gray-500">tâches</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Répartition</p>
              <p className="text-xs text-gray-400 mt-1">Avancement moyen : {stats.listProgress}%</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">{stats.pendingTasksCount} en attente</span>
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">{stats.inProgressTasksCount} en cours</span>
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{stats.doneTasksCount} terminées</span>
                {stats.blockedTasksCount > 0 && (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">{stats.blockedTasksCount} bloquée{stats.blockedTasksCount > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Membres de la liste
        </h3>
        {members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map(member => (
              <GlassCard key={member.id} className="p-3 flex items-center justify-between hover:shadow-md transition-shadow">
                <Link to={`/users/${member.id}`} className="flex items-center gap-3 min-w-0 hover:opacity-90">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                    {getAvatarSrc(member.photo_base64) ? (
                      <img src={getAvatarSrc(member.photo_base64) || ''} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(member.name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{member.name}</p>
                    <p className="text-sm text-gray-500 truncate">{member.email}</p>
                  </div>
                </Link>
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
              <p>Aucun membre pour le moment</p>
              <p className="text-sm mt-1">Invitez des membres pour collaborer sur cette liste</p>
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
            <p className="text-sm">Les activités récentes seront affichées ici</p>
          </div>
        </GlassCard>
      </div>

      {canInviteMembers && (
        <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Inviter un membre dans la liste" size="md">
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
                {availableRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                💡 <strong>Invité</strong> : accès en lecture seule<br />
                💡 <strong>Membre</strong> : peut contribuer s'il a une tâche assignée<br />
                💡 <strong>Administrateur</strong> : peut gérer la liste et ses membres
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ⚡ Le rôle <strong>Membre</strong> sera attribué automatiquement lors de l'assignation à une tâche.
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
