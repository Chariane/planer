// frontend/src/pages/app/components/SpaceDashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import { Users, ListTodo, UserPlus, FolderTree, Calendar, Activity, Loader2, MessageCircle, ShieldCheck, Trash2, X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { espaceService } from '../../../services/espace.service';
import { listeService } from '../../../services/liste.service';
import { sanitizeApiErrorMessage } from '../../../services/api';
import { useResourceRole } from '../../../hooks/useResourceRole';
import { useWorkspaceRole } from '../../../hooks/useWorkspaceRole';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigationStore } from '../../../store/useNavigationStore';
import { getRoleRank, ROLES } from '../../../lib/roleHierarchy';
import { getAvatarSrc, getInitials, getMemberContactLabel, getMemberDisplayName, getMemberPhotoBase64 } from '../../../utils/memberDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import type { Member } from '../../../types';

interface SpaceDashboardProps {
  spaceId: string;
  onMemberInvited?: () => void;
}

// ✅ RÔLES MODIFIABLES PAR LE CRÉATEUR DIRECT : peut tout modifier
const CREATOR_ROLE_MANAGEMENT_OPTIONS = ['Invité', 'Membre', 'Administrateur'];
// ✅ RÔLES MODIFIABLES PAR L'ADMIN PAR HÉRITAGE : seulement promotions (Invité→Membre/Admin, Membre→Admin)
const INHERITED_ADMIN_ROLE_OPTIONS = ['Invité', 'Membre', 'Administrateur'];
// ✅ RÔLES MODIFIABLES PAR L'ADMIN DIRECT : NE PEUT MODIFIER AUCUN RÔLE
const ADMIN_DIRECT_ROLE_OPTIONS: string[] = [];

const getRoleBadgeClass = (role: string) => {
  if (role === 'Administrateur') return 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.1)]';
  if (role === 'Créateur') return 'bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.1)]';
  if (role === 'Invité') return 'bg-theme-surface-hover text-theme-muted border border-theme-border-subtle';
  return 'bg-secondary/10 text-secondary border border-secondary/20 shadow-[0_0_8px_rgba(255,102,0,0.1)]';
};

const getRoleLabel = (role: string) => {
  if (role === 'Invité') return 'Invité';
  if (role === 'Membre') return 'Membre';
  if (role === 'Administrateur') return 'Admin';
  return 'Créateur';
};

// Toast Premium
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const toneClass = type === 'success'
    ? 'bg-emerald-600 text-white border-emerald-500/30 shadow-emerald-500/20'
    : type === 'error'
      ? 'bg-red-600 text-white border-red-500/30 shadow-red-500/20'
      : 'bg-amber-100 text-amber-950 border-amber-400/50 shadow-amber-500/20 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-300/30';
  const iconShellClass = type === 'info'
    ? 'bg-amber-500/15 border border-amber-500/20'
    : 'bg-white/20 border border-white/10';
  const closeClass = type === 'info'
    ? 'hover:bg-amber-200/70 dark:hover:bg-amber-400/10'
    : 'hover:bg-white/20';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
        className="fixed bottom-6 right-6 z-[100]"
      >
        <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl min-w-[320px] backdrop-blur-xl border ${toneClass}`}>
          <div className={`p-2 rounded-xl ${iconShellClass}`}>
            {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          </div>
          <span className="text-sm font-black flex-1 tracking-tight uppercase tracking-widest text-[11px]">{message}</span>
          <button onClick={onClose} className={`p-1.5 rounded-xl transition-colors ${closeClass}`}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function SpaceDashboard({ spaceId, onMemberInvited }: SpaceDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    subSpacesCount: 0,
    listsCount: 0,
    membersCount: 0,
  });
  const [spaceName, setSpaceName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [spaceWorkspaceId, setSpaceWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Invité');
  const [inheritedSpaceRole, setInheritedSpaceRole] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean;
    member: Member | null;
  }>({ isOpen: false, member: null });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const { isGuest: isEspaceGuest, isAdmin: isEspaceAdmin, isCreator: isEspaceCreator } = useResourceRole(spaceId, 'espace');
  const { joinedEspaces } = useNavigationStore();

  const { isAdmin: isWorkspaceAdmin, isCreator: isWorkspaceCreator } = useWorkspaceRole(spaceWorkspaceId || undefined);

  const getDirectSpaceRole = (targetSpaceId: string): string | null => {
    return joinedEspaces.find(espace => espace.id === targetSpaceId)?.role || null;
  };

  const effectiveSpaceRole = inheritedSpaceRole
    || (isEspaceCreator ? ROLES.CREATOR : null)
    || (isEspaceAdmin ? ROLES.ADMIN : null)
    || (isEspaceGuest ? ROLES.GUEST : null);
  
  // ✅ Détection de l'admin par héritage
  const isInheritedSpaceAdmin = !!spaceId
    && (isWorkspaceAdmin || isWorkspaceCreator)
    && !isEspaceAdmin
    && !isEspaceCreator;

  // ✅ Détection de l'admin direct via les membres chargés
  const isDirectEspaceAdmin = !!spaceId && members.some(
    m => m.id === user?.id && m.role === ROLES.ADMIN
  );

  // ✅ Rôles autorisés pour la modale d'INVITATION
  const getAvailableInvitationRoles = () => {
    // ✅ Créateur direct : peut inviter avec tous les rôles
    if (isEspaceCreator || isWorkspaceCreator) {
      return CREATOR_ROLE_MANAGEMENT_OPTIONS;
    }
    // ✅ Admin par héritage : peut inviter avec tous les rôles
    if (isInheritedSpaceAdmin) {
      return CREATOR_ROLE_MANAGEMENT_OPTIONS;
    }
    // ✅ Admin direct : ne peut inviter qu'avec Membre ou Invité (pas Admin)
    if (isDirectEspaceAdmin) {
      return ['Invité', 'Membre'];
    }
    // ✅ Admin d'espace (non direct) : peut inviter avec Invité ou Membre
    if (isEspaceAdmin) {
      return ['Invité', 'Membre'];
    }
    return [];
  };

  // ✅ Rôles autorisés pour le CHANGEMENT DE RÔLE (Membre existant)
  const getManageableRolesForMember = (memberRole: string) => {
    // ✅ Créateur direct : peut tout modifier
    if (isEspaceCreator || isWorkspaceCreator) {
      return CREATOR_ROLE_MANAGEMENT_OPTIONS;
    }
    
    // ✅ Admin direct : NE PEUT MODIFIER AUCUN RÔLE
    if (isDirectEspaceAdmin) {
      return [memberRole];
    }
    
    // ✅ Admin par héritage : peut promouvoir (Invité→Membre/Admin, Membre→Admin)
    if (isInheritedSpaceAdmin) {
      // Ne retourner que les rôles supérieurs ou égaux
      const currentRank = getRoleRank(memberRole);
      return CREATOR_ROLE_MANAGEMENT_OPTIONS.filter(r => getRoleRank(r) >= currentRank);
    }
    
    // ✅ Admin d'espace (non direct) : peut modifier Invité → Membre
    if (isEspaceAdmin) {
      if (memberRole === ROLES.GUEST) return [ROLES.GUEST, ROLES.MEMBER];
      if (memberRole === ROLES.MEMBER) return [ROLES.MEMBER];
      return [memberRole];
    }
    
    return [memberRole];
  };

  // ✅ canEditMemberRole : Détermine si l'utilisateur peut modifier le rôle d'un membre
  const canEditMemberRole = (member: Member) => {
    // ✅ Créateur direct : peut modifier n'importe quel membre (sauf lui-même)
    if (isEspaceCreator || isWorkspaceCreator) {
      return member.role !== ROLES.CREATOR && member.id !== user?.id;
    }
    
    // ✅ Admin direct : NE PEUT MODIFIER AUCUN RÔLE
    if (isDirectEspaceAdmin) {
      return false;
    }
    
    // ✅ Admin par héritage : peut promouvoir (Invité→Membre/Admin, Membre→Admin)
    // Ne peut pas rétrograder et ne peut pas modifier le Créateur
    if (isInheritedSpaceAdmin) {
      // ❌ Ne peut pas modifier un Admin direct (car il ne peut pas le rétrograder)
      if (member.role === ROLES.ADMIN) return false;
      if (member.role === ROLES.CREATOR) return false;
      return true;
    }
    
    // ✅ Admin d'espace (non direct) : peut modifier Invité → Membre
    if (isEspaceAdmin) {
      return member.role === ROLES.GUEST || member.role === ROLES.MEMBER;
    }
    
    return false;
  };

  const canInviteMembers = effectiveSpaceRole === ROLES.ADMIN
    || effectiveSpaceRole === ROLES.CREATOR
    || isWorkspaceAdmin
    || isWorkspaceCreator
    || isInheritedSpaceAdmin;

  // ✅ canRemoveMember : 
  // - Créateur direct : peut retirer n'importe quel membre (sauf lui-même et les autres Créateurs)
  // - Admin par héritage : NE PEUT PAS retirer de membres
  // - Admin direct : NE PEUT PAS retirer de membres
  const canRemoveMember = (member: Member) => {
    // Ne peut pas se retirer lui-même
    if (member.id === user?.id) return false;
    // Ne peut pas retirer un autre créateur
    if (member.role === ROLES.CREATOR) return false;
    
    // ✅ SEUL le Créateur direct peut retirer des membres
    if (isEspaceCreator || isWorkspaceCreator) {
      return true;
    }
    
    // ❌ Admin par héritage : ne peut PAS retirer de membres
    // ❌ Admin direct : ne peut PAS retirer de membres
    return false;
  };

  const availableRoles = useMemo(() => getAvailableInvitationRoles(), [
    isDirectEspaceAdmin, 
    isWorkspaceCreator, 
    isWorkspaceAdmin, 
    isEspaceCreator, 
    isEspaceAdmin,
    isInheritedSpaceAdmin
  ]);

  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.includes(inviteRole)) {
      setInviteRole(availableRoles[0]);
    }
  }, [availableRoles, inviteRole]);

  const loadData = async () => {
    setLoading(true);
    setInheritedSpaceRole(null);
    try {
      const navigationSpace = joinedEspaces.find(espace => espace.id === spaceId);
      const hierarchy = await espaceService.getHierarchy(spaceId).catch(() => []);
      const spaces = Array.isArray(hierarchy) ? hierarchy : [];
      const spaceData = spaces.find((space: any) => space.id === spaceId)
        || navigationSpace
        || { id: spaceId, nom: 'Espace', id_workspace: null };

      setSpaceName(spaceData.nom);
      setSpaceDescription(spaceData.description || '');
      setSpaceWorkspaceId(spaceData.id_workspace || navigationSpace?.workspace_id || null);

      const roleCandidates: Array<string | null> = (spaces.length ? spaces : [spaceData])
        .map((space: any) => {
          const role = getDirectSpaceRole(space.id);
          const isCurrentSpace = space.id === spaceId;
          const isInheritedRole = role === ROLES.CREATOR || role === ROLES.ADMIN || role === ROLES.MEMBER || role === ROLES.GUEST;
          return isCurrentSpace || isInheritedRole ? role : null;
        });

      const resolvedInheritedRole = roleCandidates.reduce<string | null>((highest, role) => {
        if (!role) return highest;
        return getRoleRank(role) > getRoleRank(highest) ? role : highest;
      }, null);
      setInheritedSpaceRole(resolvedInheritedRole);

      let formattedMembers: Member[] = [];
      let membersCount = 0;

      try {
        const membersData = await espaceService.getMembers(spaceId);
        formattedMembers = membersData.map((m: any) => ({
          id: m.id_utilisateur || m.utilisateur?.id || m.id,
          name: getMemberDisplayName(m),
          email: getMemberContactLabel(m),
          role: m.role,
          photo_base64: getMemberPhotoBase64(m),
        }));
        membersCount = formattedMembers.filter(member => member.role !== ROLES.GUEST).length;
      } catch { /* Suppress */ }

      setMembers(formattedMembers);

      let listsCount = 0;
      try {
        const lists = await listeService.getByEspace(spaceId);
        listsCount = lists.length;
      } catch { /* Suppress */ }

      let subSpacesCount = 0;
      try {
        const subSpaces = await espaceService.getSubSpaces(spaceId);
        subSpacesCount = subSpaces.length;
      } catch { /* Suppress */ }

      setStats({ subSpacesCount, listsCount, membersCount });
    } catch (err) {
      console.error('Erreur chargement espace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [spaceId, joinedEspaces]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await espaceService.inviteMember(spaceId, inviteEmail, inviteRole);
      showMessage(`Invitation envoyée à ${inviteEmail}`, 'success');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      await loadData();
      onMemberInvited?.();
    } catch (err: any) {
      showMessage(sanitizeApiErrorMessage(err, "Erreur d'invitation"), 'error');
    }
  };

  const handleMemberRoleChange = async (member: Member, nextRole: string) => {
    if (member.role === ROLES.CREATOR || nextRole === member.role) return;
    if (!canEditMemberRole(member)) {
      showMessage('Vous n\'avez pas les droits pour modifier le rôle de ce membre.', 'error');
      return;
    }
    
    // ✅ Vérification supplémentaire pour l'Admin par héritage : ne peut que promouvoir
    if (isInheritedSpaceAdmin) {
      const currentRank = getRoleRank(member.role);
      const nextRank = getRoleRank(nextRole);
      if (nextRank < currentRank) {
        showMessage('Un administrateur par héritage ne peut que promouvoir un membre, pas le rétrograder.', 'error');
        return;
      }
    }
    
    setUpdatingMemberId(member.id);
    try {
      await espaceService.updateMemberRole(spaceId, member.id, nextRole);
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: nextRole } : m));
      showMessage(`Rôle de ${member.name} mis à jour`, 'success');
    } catch (err: any) {
      const message = sanitizeApiErrorMessage(err, "Impossible de modifier le rôle");
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('invitation non nécessaire') || lowerMessage.includes('hérité depuis un')) {
        showMessage(
          (isWorkspaceCreator || effectiveSpaceRole === ROLES.CREATOR)
            ? `${member.name} possède déjà ce rôle via un parent. Pour revenir au rôle hérité, retirez son rôle direct de cet espace avec le bouton Retirer.`
            : `${member.name} possède déjà ce rôle via un parent. Seul le créateur peut retirer son rôle direct de cet espace.`,
          'info'
        );
      } else {
        showMessage(message, 'error');
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
      showMessage(
        member.id === user?.id
          ? 'Vous ne pouvez pas vous retirer via la gestion des membres.'
          : "Seul le créateur de la ressource peut retirer un membre.",
        'error',
      );
      setConfirmData({ isOpen: false, member: null });
      return;
    }
    try {
      await espaceService.removeMember(spaceId, member.id);
      setConfirmData({ isOpen: false, member: null });
      await loadData();
      showMessage(`${member.name} a été retiré de cet espace`, 'success');
    } catch (err) {
      showMessage(sanitizeApiErrorMessage(err, 'Erreur lors du retrait du membre'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-secondary/60" />
        <p className="text-theme-muted font-black uppercase tracking-widest text-[10px] animate-pulse">Chargement de l'espace...</p>
      </div>
    );
  }

  const activeMembers = members.filter(member => member.role !== ROLES.GUEST);
  const guestMembers = members.filter(member => member.role === ROLES.GUEST);

  // ✅ Déterminer si on affiche un message d'information
  const showAdminMessage = isDirectEspaceAdmin && !isEspaceCreator && !isWorkspaceCreator;
  const showInheritedAdminMessage = isInheritedSpaceAdmin && !isEspaceCreator && !isWorkspaceCreator;
  const showGuestMessage = isEspaceGuest && !canInviteMembers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {showGuestMessage && (
        <div className="glass bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-center gap-5 shadow-theme-sm">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Info className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-black text-theme-main tracking-tight uppercase tracking-widest text-[11px]">Accès Invité · Lecture seule</p>
            <p className="text-xs text-theme-muted mt-1 opacity-60">Vous pouvez consulter les informations, mais les modifications sont restreintes.</p>
          </div>
        </div>
      )}

      {/* ✅ Message pour l'Admin direct : ne peut pas modifier les rôles */}
      {showAdminMessage && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-100 text-amber-950 dark:bg-amber-500/15 dark:text-amber-100 dark:border-amber-400/30 px-5 py-4 text-sm flex items-start gap-4 shadow-theme-sm">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-black uppercase tracking-widest text-[10px]">Gestion des membres restreinte</p>
            <p className="text-xs text-theme-muted mt-1 leading-relaxed">
              En tant qu'administrateur direct de cet espace, vous ne pouvez pas modifier les rôles des membres. Seul le créateur de l'espace peut gérer les rôles des membres.
            </p>
          </div>
        </div>
      )}

      {/* ✅ Message pour l'Admin par héritage : peut promouvoir */}
      {showInheritedAdminMessage && (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-100 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-100 dark:border-emerald-400/30 px-5 py-4 text-sm flex items-start gap-4 shadow-theme-sm">
          <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-black uppercase tracking-widest text-[10px]">Administration par héritage - Promotions uniquement</p>
            <p className="text-xs text-theme-muted mt-1 leading-relaxed">
              En tant qu'administrateur hérité de cet espace, vous pouvez promouvoir les membres directs (Invité → Membre/Admin, Membre → Admin). Vous ne pouvez pas rétrograder ni retirer de membres.
            </p>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-8 pb-4">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-secondary/10 rounded-2xl shadow-xl shadow-secondary/5 border border-secondary/10 transition-transform hover:scale-105">
            <FolderTree className="h-8 w-8 text-secondary" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-theme-main tracking-tighter uppercase leading-none">{spaceName}</h1>
            <div className="flex items-center gap-2 mt-3">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
              <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] opacity-60">Dashboard Espace</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/messagerie?resource_type=espace&resource_id=${spaceId}`}
            className="inline-flex items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 px-8 py-4 text-[11px] font-black uppercase tracking-widest text-secondary shadow-theme-sm transition-all hover:border-secondary/30 hover:bg-secondary hover:text-white hover:shadow-xl hover:shadow-secondary/20"
          >
            <MessageCircle size={18} className="mr-3" />
            Ouvrir la discussion
          </Link>
          {(canInviteMembers) && (
            <Button onClick={() => setIsInviteModalOpen(true)} className="rounded-2xl px-10 py-6 shadow-xl shadow-secondary/20 font-black uppercase tracking-widest text-[11px]">
              <UserPlus size={18} className="mr-3" />
              Inviter un membre
            </Button>
          )}
        </div>
      </div>

      {spaceDescription && (
        <GlassCard className="p-6 border-l-4 border-l-secondary/40 bg-theme-surface/30">
          <p className="text-sm text-theme-main leading-relaxed font-medium italic opacity-80">"{spaceDescription}"</p>
        </GlassCard>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Sous-espaces', value: stats.subSpacesCount, icon: FolderTree, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Listes / Projets', value: stats.listsCount, icon: ListTodo, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Membres', value: stats.membersCount, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' }
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className="p-8 group hover:border-secondary/30 transition-all cursor-default border-theme-border-subtle/30 bg-theme-surface/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.25em] mb-3 opacity-60">{stat.label}</p>
                  <p className="text-4xl font-black text-theme-main tracking-tighter group-hover:scale-105 transition-transform origin-left">{stat.value}</p>
                </div>
                <div className={`p-5 ${stat.bg} rounded-2xl group-hover:rotate-12 transition-all shadow-inner border border-theme-border-subtle/30`}>
                  <stat.icon size={28} className={stat.color} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 pb-16">
        <div className="xl:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black text-theme-main tracking-tighter flex items-center gap-4 uppercase">
              <Users className="h-6 w-6 text-secondary" />
              Équipe de l'espace
            </h3>
            {(isEspaceCreator || isWorkspaceCreator || isInheritedSpaceAdmin) && (
              <div className="flex items-center gap-3 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 shadow-sm shadow-indigo-500/5">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">
                  {isInheritedSpaceAdmin ? 'Admin par héritage' : 'Privilèges complets'}
                </span>
              </div>
            )}
          </div>

          {activeMembers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {activeMembers.map((member, i) => (
                <motion.div key={member.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <GlassCard className="p-5 flex items-center justify-between gap-4 group hover:bg-theme-surface-hover/30 transition-all border-theme-border-subtle/30">
                    <Link to={`/users/${member.id}`} className="flex items-center gap-4 min-w-0 hover:opacity-90">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/20 border border-theme-border-subtle/20 flex items-center justify-center overflow-hidden font-black text-secondary text-base group-hover:rotate-6 transition-transform shadow-inner">
                        {getAvatarSrc(member.photo_base64) ? (
                          <img src={getAvatarSrc(member.photo_base64) || ''} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(member.name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-theme-main truncate tracking-tight text-base group-hover:text-secondary transition-colors">{member.name}</p>
                        <p className="text-[10px] text-theme-muted font-bold truncate uppercase opacity-40 mt-0.5">{member.email}</p>
                      </div>
                    </Link>

                    {/*
                      ✅ AFFICHAGE DU SELECT DE RÔLE
                      - Créateur direct : peut tout modifier
                      - Admin par héritage : peut promouvoir (Invité→Membre/Admin, Membre→Admin)
                      - Admin direct : NE PEUT MODIFIER AUCUN RÔLE
                      - Admin par héritage : NE PEUT PAS modifier les Admins directs
                    */}
                    {canEditMemberRole(member) ? (
                      <div className="flex items-center gap-3">
                        {updatingMemberId === member.id && <Loader2 className="h-4 w-4 animate-spin text-secondary" />}
                        <select
                          value={member.role}
                          onChange={e => handleMemberRoleChange(member, e.target.value)}
                          disabled={updatingMemberId === member.id}
                          className="bg-theme-surface/50 text-[10px] font-black text-theme-main uppercase tracking-widest border border-theme-border-subtle/30 rounded-xl px-3 py-2 outline-none focus:border-secondary transition-all cursor-pointer hover:bg-theme-surface-hover"
                        >
                          {getManageableRolesForMember(member.role).map(r => (
                            <option key={r} value={r} className="bg-theme-page text-theme-main">
                              {getRoleLabel(r)}
                            </option>
                          ))}
                        </select>
                        {/* ✅ SEUL le Créateur peut retirer des membres */}
                        {canRemoveMember(member) && (
                          <button
                            type="button"
                            onClick={() => setConfirmData({ isOpen: true, member })}
                            className="p-2 text-theme-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Retirer de cet espace"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-3 py-1.5 rounded-xl font-black uppercase tracking-widest shadow-sm ${getRoleBadgeClass(member.role)}`}>
                          {getRoleLabel(member.role)}
                        </span>
                        {/* ✅ SEUL le Créateur peut retirer des membres */}
                        {canRemoveMember(member) && (
                          <button
                            type="button"
                            onClick={() => setConfirmData({ isOpen: true, member })}
                            className="p-2 text-theme-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Retirer de cet espace"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          ) : (
            <GlassCard className="py-20 border-dashed border-theme-border-subtle/30 flex flex-col items-center justify-center bg-theme-surface/20">
              <div className="p-6 rounded-full bg-theme-surface-hover mb-6 border border-theme-border-subtle/30">
                <Users size={40} className="opacity-10 text-theme-muted" />
              </div>
              <p className="font-black uppercase tracking-[0.2em] text-xs text-theme-muted opacity-30">Aucun membre actif</p>
            </GlassCard>
          )}

          {guestMembers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-theme-muted">Invités directs</p>
                <span className="rounded-full border border-theme-border-subtle bg-theme-surface px-3 py-1 text-[9px] font-black uppercase tracking-widest text-theme-muted">
                  {guestMembers.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {guestMembers.map(member => (
                  <GlassCard key={member.id} className="p-5 flex items-center justify-between gap-4 border-dashed opacity-85">
                    <Link to={`/users/${member.id}`} className="flex items-center gap-4 min-w-0 hover:opacity-90">
                      <div className="h-12 w-12 rounded-2xl bg-theme-surface-hover border border-theme-border-subtle/30 flex items-center justify-center overflow-hidden font-black text-theme-muted text-base">
                        {getAvatarSrc(member.photo_base64) ? (
                          <img src={getAvatarSrc(member.photo_base64) || ''} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(member.name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-theme-main truncate tracking-tight text-base">{member.name}</p>
                        <p className="text-[10px] text-theme-muted font-bold truncate uppercase opacity-40 mt-0.5">{member.email}</p>
                      </div>
                    </Link>

                    {/*
                      ✅ AFFICHAGE DU SELECT DE RÔLE POUR LES INVITÉS
                      - Créateur direct : peut modifier Invité → Membre → Admin
                      - Admin par héritage : peut modifier Invité → Membre → Admin
                      - Admin direct : NE PEUT MODIFIER AUCUN RÔLE
                    */}
                    {canEditMemberRole(member) ? (
                      <div className="flex items-center gap-3">
                        {updatingMemberId === member.id && <Loader2 className="h-4 w-4 animate-spin text-secondary" />}
                        <select
                          value={member.role}
                          onChange={e => handleMemberRoleChange(member, e.target.value)}
                          disabled={updatingMemberId === member.id}
                          className="bg-theme-surface/50 text-[10px] font-black text-theme-main uppercase tracking-widest border border-theme-border-subtle/30 rounded-xl px-3 py-2 outline-none focus:border-secondary transition-all cursor-pointer hover:bg-theme-surface-hover"
                        >
                          {getManageableRolesForMember(member.role).map(r => (
                            <option key={r} value={r} className="bg-theme-page text-theme-main">
                              {getRoleLabel(r)}
                            </option>
                          ))}
                        </select>
                        {canRemoveMember(member) && (
                          <button
                            type="button"
                            onClick={() => setConfirmData({ isOpen: true, member })}
                            className="p-2 text-theme-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Retirer de cet espace"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-3 py-1.5 rounded-xl font-black uppercase tracking-widest shadow-sm ${getRoleBadgeClass(member.role)}`}>
                          {getRoleLabel(member.role)}
                        </span>
                        {canRemoveMember(member) && (
                          <button
                            type="button"
                            onClick={() => setConfirmData({ isOpen: true, member })}
                            className="p-2 text-theme-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Retirer de cet espace"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-10">
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-theme-main tracking-tighter flex items-center gap-4 uppercase px-2">
              <Activity className="h-6 w-6 text-secondary" />
              Pulse
            </h3>
            <GlassCard className="p-10 flex flex-col items-center justify-center text-center space-y-6 min-h-[300px] border-theme-border-subtle/30 bg-theme-surface/30">
              {stats.subSpacesCount > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="p-5 rounded-3xl bg-blue-500/10 mb-6 border border-blue-500/20 shadow-xl shadow-blue-500/5 transition-transform hover:scale-105">
                    <FolderTree size={36} className="text-blue-500" />
                  </div>
                  <p className="text-4xl font-black text-theme-main tracking-tighter">{stats.subSpacesCount}</p>
                  <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.3em] mt-2 opacity-60">Architectures actives</p>
                </div>
              ) : (
                <>
                  <div className="p-6 rounded-3xl bg-theme-surface border border-white/5 shadow-inner">
                    <FolderTree size={40} className="text-theme-muted opacity-20" />
                  </div>
                  <div className="space-y-3">
                    <p className="font-black text-theme-main uppercase tracking-widest text-xs">Structurer l'Espace</p>
                    <p className="text-theme-muted text-[10px] font-medium leading-relaxed max-w-[180px] mx-auto opacity-40">
                      Utilisez des sous-espaces pour organiser vos workflow plus finement.
                    </p>
                  </div>
                </>
              )}
            </GlassCard>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-black text-theme-main tracking-tighter flex items-center gap-4 uppercase px-2">
              <Calendar className="h-6 w-6 text-secondary" />
              Agenda
            </h3>
            <GlassCard className="p-8 border-theme-border-subtle/30 bg-theme-surface/20">
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-secondary/40 animate-pulse shadow-[0_0_10px_rgba(255,102,0,0.3)]" />
                <p className="text-[10px] text-theme-muted font-black uppercase tracking-widest opacity-30 italic">Analyse des flux en cours...</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Expansion de l'Équipe" size="md">
        <div className="space-y-8 py-4">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.3em] ml-2 opacity-60">Email ou username</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-theme-muted group-focus-within:text-secondary transition-colors">
                <Users size={20} />
              </div>
              <input
                type="text"
                placeholder="collaborateur@kplanner.io ou username"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full bg-theme-surface/50 border border-theme-border-subtle/30 rounded-2xl pl-14 pr-6 py-5 text-theme-main placeholder:text-theme-muted/20 focus:ring-4 focus:ring-secondary/10 focus:border-secondary/50 transition-all outline-none font-bold"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.25em] ml-2 opacity-60">Privilèges Assignés</label>
            <div className="relative group">
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full bg-theme-surface/50 border border-theme-border-subtle/30 rounded-2xl px-6 py-5 text-theme-main focus:ring-4 focus:ring-secondary/10 outline-none transition-all font-black uppercase tracking-widest text-xs appearance-none cursor-pointer"
              >
                {availableRoles.map(r => <option key={r} value={r} className="bg-theme-page text-theme-main">{r}</option>)}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted opacity-40">
                <ShieldCheck size={18} />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)} className="flex-1 rounded-2xl py-6 font-black uppercase tracking-widest text-[10px] opacity-60 hover:opacity-100">Annuler</Button>
            <Button onClick={handleInvite} className="flex-1 rounded-2xl py-6 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-secondary/20">Envoyer l'Invite</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmData.isOpen}
        onClose={() => setConfirmData({ isOpen: false, member: null })}
        onConfirm={handleRemoveMember}
        title="Retirer de l'espace"
        message={`Voulez-vous retirer ${confirmData.member?.name || 'ce membre'} de cet espace ? Si cette personne possède un accès hérité depuis un parent, celui-ci restera actif.`}
        confirmText="Retirer"
      />
    </motion.div>
  );
}