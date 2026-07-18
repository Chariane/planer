// frontend/src/pages/app/components/ListDashboard.tsx
import { useState, useEffect } from 'react';
import { Users, UserPlus, Calendar, Activity, Target, X, MessageCircle, ShieldCheck, Trash2, Loader2, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { listeService } from '../../../services/liste.service';
import { tacheService } from '../../../services/tache.service';
import { sanitizeApiErrorMessage } from '../../../services/api';
import { useResourceRole } from '../../../hooks/useResourceRole';
import { useWorkspaceRole } from '../../../hooks/useWorkspaceRole';
import { useAuth } from '../../../contexts/AuthContext';
import { getRoleRank, ROLES } from '../../../lib/roleHierarchy';
import { getAvatarSrc, getInitials, getMemberContactLabel, getMemberDisplayName, getMemberPhotoBase64 } from '../../../utils/memberDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import type { Member } from '../../../types';
import MemberManagement from '../../../components/members/MemberManagement';
import { toast } from '../../../components/ui/Toast'; // ✅ Import du toast maison

interface ListDashboardProps {
  listId: string;
  listName: string;
  workspaceId?: string | null;
  espaceId?: string | null;
  onMemberInvited?: () => void;
}

const CREATOR_ROLE_MANAGEMENT_OPTIONS = ['Invité', 'Membre', 'Administrateur'];

const getRoleBadgeClass = (role: string) => {
  if (role === 'Administrateur') return 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.1)]';
  if (role === 'Créateur') return 'bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.1)]';
  if (role === 'Invité') return 'bg-theme-surface-hover text-theme-muted border border-theme-border-subtle opacity-70';
  return 'bg-secondary/10 text-secondary border border-secondary/20 shadow-[0_0_8px_rgba(255,102,0,0.1)]';
};

const getRoleLabel = (role: string) => {
  if (role === 'Invité') return 'Invité';
  if (role === 'Membre') return 'Membre';
  if (role === 'Administrateur') return 'Admin';
  return 'Créateur';
};

export default function ListDashboard({ listId, listName, workspaceId, espaceId, onMemberInvited }: ListDashboardProps) {
  const { user } = useAuth();
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
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean;
    member: Member | null;
  }>({ isOpen: false, member: null });
  const [roleActionNotice, setRoleActionNotice] = useState<string | null>(null);

  // États pour masquer les messages

  const { isGuest: isListeGuest, isAdmin: isListeAdmin, isCreator: isListeCreator } = useResourceRole(listId, 'liste');
  const { isAdmin: isWorkspaceAdmin, isCreator: isWorkspaceCreator } = useWorkspaceRole(workspaceId || undefined);

  const isDirectListAdmin = !!listId && members.some(
    m => m.id === user?.id && m.role === ROLES.ADMIN
  );
  const isDirectListCreator = !!listId && members.some(
    m => m.id === user?.id && m.role === ROLES.CREATOR
  );
  const isInheritedListAdmin = !!listId
    && (isWorkspaceAdmin || isWorkspaceCreator)
    && !isListeAdmin
    && !isListeCreator
    && !isDirectListAdmin
    && !isDirectListCreator;

  // DEBUG (peut être retiré)
  useEffect(() => {
    console.log('🔍 [ListDashboard] Détection des rôles:', {
      listId,
      isWorkspaceAdmin,
      isWorkspaceCreator,
      isListeAdmin,
      isListeCreator,
      isDirectListAdmin,
      isDirectListCreator,
      isInheritedListAdmin,
      membres: members.map(m => ({ id: m.id, role: m.role, name: m.name }))
    });
  }, [isWorkspaceAdmin, isWorkspaceCreator, isListeAdmin, isListeCreator, isDirectListAdmin, isDirectListCreator, isInheritedListAdmin, members]);

  const canEditMemberRole = (member: Member) => {
    if (isDirectListCreator || isWorkspaceCreator) {
      return member.role !== ROLES.CREATOR && member.id !== user?.id;
    }
    if (isDirectListAdmin) return false;
    if (isInheritedListAdmin) {
      if (member.role === ROLES.CREATOR || member.role === ROLES.ADMIN) return false;
      return true;
    }
    return false;
  };

  const canRemoveMember = (member: Member) => {
    if (member.id === user?.id) return false;
    if (member.role === ROLES.CREATOR) return false;
    return isDirectListCreator || isWorkspaceCreator;
  };

  const getManageableRolesForMember = (memberRole: string) => {
    if (isDirectListCreator || isWorkspaceCreator) return CREATOR_ROLE_MANAGEMENT_OPTIONS;
    if (isDirectListAdmin) return [memberRole];
    if (isInheritedListAdmin) {
      if (memberRole === ROLES.ADMIN) return [memberRole];
      return CREATOR_ROLE_MANAGEMENT_OPTIONS;
    }
    return [memberRole];
  };

  const getAvailableInvitationRoles = () => {
    if (isDirectListCreator || isWorkspaceCreator || isInheritedListAdmin) {
      return CREATOR_ROLE_MANAGEMENT_OPTIONS;
    }
    if (isDirectListAdmin || isListeAdmin) {
      return ['Invité', 'Membre'];
    }
    return [];
  };

  const canInviteMembers = isListeAdmin || isListeCreator || isWorkspaceAdmin || isWorkspaceCreator || isInheritedListAdmin || isDirectListCreator;
  const availableRoles = getAvailableInvitationRoles();

  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.includes(inviteRole)) {
      setInviteRole(availableRoles[0]);
    }
  }, [availableRoles, inviteRole]);

  const loadData = async () => {
    setLoading(true);
    setRoleActionNotice(null);
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
          email: getMemberContactLabel(m),
          role: m.role,
          photo_base64: getMemberPhotoBase64(m),
        }));
        console.log('📋 [loadData] Membres chargés:', formattedMembers);
      } catch (err: any) {
        console.warn('Impossible de charger les membres:', err);
      }
      const activeMembers = formattedMembers.filter(member => member.role !== 'Invité');
      setMembers(formattedMembers);

      let tasks: any[] = [];
      try {
        const tasksData = await tacheService.getByListe(listId);
        tasks = Array.isArray(tasksData) ? tasksData : [];
      } catch (err: any) {
        console.warn('Impossible de charger les tâches:', err);
      }

      const rootTasks = tasks.filter(task => !task.id_tache_parent);
      const projectTasks = rootTasks.length > 0 ? rootTasks : tasks;

      const pendingTasksCount = projectTasks.filter(task => task.statut === 'en attente').length;
      const inProgressTasksCount = projectTasks.filter(task => task.statut === 'en cours').length;
      const doneTasksCount = projectTasks.filter(task => task.statut === 'terminé').length;
      const blockedTasksCount = projectTasks.filter(task => task.statut === 'bloqué').length;
      const listProgress = projectTasks.length > 0
        ? Math.round(projectTasks.reduce((total, task) => total + Number(task.progression || 0), 0) / projectTasks.length)
        : 0;

      setStats({
        membersCount: activeMembers.length,
        tasksCount: projectTasks.length,
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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await listeService.inviteMember(listId, inviteEmail, inviteRole);
      toast.success(`Invitation envoyée à ${inviteEmail} avec le rôle ${inviteRole}`);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      await loadData();
      onMemberInvited?.();
    } catch (err: any) {
      const msg = sanitizeApiErrorMessage(err, 'Erreur lors de l\'invitation');
      if (msg.includes('403')) {
        toast.error('Vous n\'avez pas les permissions nécessaires pour inviter des membres dans cette liste.');
      } else {
        toast.error(msg);
      }
    }
  };

  const handleMemberRoleChange = async (member: Member, nextRole: string) => {
    if (member.role === ROLES.CREATOR || nextRole === member.role) return;
    if (!canEditMemberRole(member)) {
      toast.error('Vous n\'avez pas les droits pour modifier le rôle de ce membre.');
      return;
    }
    if (isInheritedListAdmin) {
      const currentRank = getRoleRank(member.role);
      const nextRank = getRoleRank(nextRole);
      if (nextRank < currentRank) {
        toast.error('Un administrateur par héritage ne peut que promouvoir un membre, pas le rétrograder.');
        return;
      }
    }
    setUpdatingMemberId(member.id);
    try {
      await listeService.updateMemberRole(listId, member.id, nextRole);
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: nextRole } : m));
      toast.success(`Rôle de ${member.name} mis à jour`);
    } catch (err: any) {
      const message = sanitizeApiErrorMessage(err, "Impossible de modifier le rôle");
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('invitation non nécessaire') || lowerMessage.includes('hérité depuis un')) {
        toast.info(
          (isDirectListCreator || isWorkspaceCreator)
            ? `${member.name} possède déjà ce rôle via un parent. Pour revenir au rôle hérité, retirez son rôle direct de cette liste avec le bouton Retirer.`
            : `${member.name} possède déjà ce rôle via un parent. Seul le créateur peut retirer son rôle direct de cette liste.`
        );
      } else {
        toast.error(message);
      }
      await loadData();
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async () => {
    const member = confirmData.member;
    if (!member) return;
    if (!canRemoveMember(member)) {
      toast.error(
        member.id === user?.id
          ? 'Vous ne pouvez pas vous retirer via la gestion des membres.'
          : "Seul le créateur de la liste peut retirer un membre."
      );
      setConfirmData({ isOpen: false, member: null });
      return;
    }
    try {
      await listeService.unassignMember(listId, member.id);
      setConfirmData({ isOpen: false, member: null });
      await loadData();
      toast.success(`${member.name} a été retiré de cette liste`);
    } catch (err) {
      toast.error(sanitizeApiErrorMessage(err, 'Erreur lors du retrait du membre'));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-secondary/60" />
        <p className="text-theme-muted font-black uppercase tracking-widest text-[10px] animate-pulse">Chargement du tableau de bord...</p>
      </div>
    );
  }

  const activeMembers = members.filter(member => member.role !== ROLES.GUEST);
  const guestMembers = members.filter(member => member.role === ROLES.GUEST);

  const statusGradient = (() => {
    if (stats.tasksCount === 0) return '#e5e7eb';
    const done = (stats.doneTasksCount / stats.tasksCount) * 100;
    const inProgress = done + (stats.inProgressTasksCount / stats.tasksCount) * 100;
    const blocked = inProgress + (stats.blockedTasksCount / stats.tasksCount) * 100;
    return `conic-gradient(#10b981 0 ${done}%, #3b82f6 ${done}% ${inProgress}%, #ef4444 ${inProgress}% ${blocked}%, #e5e7eb ${blocked}% 100%)`;
  })();

  const effectiveListRole = isDirectListCreator
    ? ROLES.CREATOR
    : isListeCreator
      ? ROLES.CREATOR
      : isListeAdmin
        ? ROLES.ADMIN
        : isListeGuest
          ? ROLES.GUEST
          : null;

  return (
    <div className="space-y-6">
      {isListeGuest && !canInviteMembers && (
        <div className="glass-card bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-4 shadow-theme-sm">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-black text-theme-main tracking-tight uppercase tracking-widest text-[11px]">Accès Invité · Lecture seule</p>
            <p className="text-xs text-theme-muted mt-1 opacity-60">Vous pouvez consulter les informations, mais les modifications sont restreintes.</p>
          </div>
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
              style={{ background: statusGradient }}
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membres de la liste
          </h3>
          {(isDirectListCreator || isWorkspaceCreator || isInheritedListAdmin) && (
            <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 shadow-sm shadow-indigo-500/5">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">
                {isInheritedListAdmin ? 'Admin par héritage' : 'Privilèges complets'}
              </span>
            </div>
          )}
        </div>
        <MemberManagement
          listeId={listId}
          currentUserRole={effectiveListRole}
          isInheritedAdmin={isInheritedListAdmin}
          onMemberAdded={loadData}
        />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Email ou username</label>
              <input
                type="text"
                placeholder="exemple@email.com ou username"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
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
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsInviteModalOpen(false)} className="w-full sm:w-auto">Annuler</Button>
              <Button onClick={handleInvite} className="w-full sm:w-auto">Inviter</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={confirmData.isOpen}
        onClose={() => setConfirmData({ isOpen: false, member: null })}
        onConfirm={handleRemoveMember}
        title="Retirer de la liste"
        message={`Voulez-vous retirer ${confirmData.member?.name || 'ce membre'} de cette liste ? Si cette personne possède un accès hérité depuis un parent, celui-ci restera actif.`}
        confirmText="Retirer"
      />
    </div>
  );
}
