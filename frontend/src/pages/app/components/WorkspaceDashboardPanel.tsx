// frontend/src/pages/app/components/WorkspaceDashboardPanel.tsx
import { useEffect, useMemo, useState, useRef } from 'react';
import { Activity, Briefcase, Calendar, FolderTree, ListTodo, Loader2, MessageCircle, ShieldCheck, Trash2, UserPlus, Users, X, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { espaceService } from '../../../services/espace.service';
import { listeService } from '../../../services/liste.service';
import { workspaceService } from '../../../services/workspace.service';
import { sanitizeApiErrorMessage } from '../../../services/api';
import { useWorkspaceRole } from '../../../hooks/useWorkspaceRole';
import { useAuth } from '../../../contexts/AuthContext';
import { getAvatarSrc, getInitials, getMemberContactLabel, getMemberDisplayName, getMemberPhotoBase64 } from '../../../utils/memberDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import type { Member } from '../../../types';
import type { MemberManagementRef } from '../../../components/members/MemberManagement';
import MemberManagement from '../../../components/members/MemberManagement';

interface WorkspaceDashboardPanelProps {
  workspaceId: string;
}

const CREATOR_ROLE_MANAGEMENT_OPTIONS = ['Invité', 'Membre', 'Administrateur'];
const ADMIN_ROLE_MANAGEMENT_OPTIONS: string[] = [];

const getRoleBadgeClass = (role: string) => {
  if (role === 'Administrateur') return 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.1)]';
  if (role === 'Créateur') return 'bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.1)]';
  if (role === 'Invité') return 'bg-theme-surface-hover text-theme-muted border border-theme-border-subtle opacity-70';
  return 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_8px_rgba(0,102,255,0.1)]';
};

const getRoleLabel = (role: string) => {
  if (role === 'Invité') return 'Invité';
  if (role === 'Membre') return 'Membre';
  if (role === 'Administrateur') return 'Admin';
  return 'Créateur';
};

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

export default function WorkspaceDashboardPanel({ workspaceId }: WorkspaceDashboardPanelProps) {
  const { user } = useAuth();
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [stats, setStats] = useState({
    spacesCount: 0,
    listsCount: 0,
    membersCount: 0,
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [hideGuestMessage, setHideGuestMessage] = useState(false);

  const memberManagementRef = useRef<MemberManagementRef>(null);

  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const { isGuest, isAdmin, isCreator, role } = useWorkspaceRole(workspaceId);
  const canInviteMembers = isAdmin || isCreator;

  const loadData = async () => {
    setLoading(true);
    try {
      let resolvedName = 'Workspace';
      let resolvedDescription = '';

      try {
        const workspace = await workspaceService.getById(workspaceId);
        resolvedName = workspace.nom || resolvedName;
        resolvedDescription = workspace.description || '';
      } catch { /* Suppress error */ }

      let formattedMembers: Member[] = [];
      let membersCount = 0;

      try {
        const membersData = await workspaceService.getMembers(workspaceId);
        formattedMembers = membersData.map((m: any) => ({
          id: m.id_utilisateur || m.utilisateur?.id || m.id,
          name: getMemberDisplayName(m),
          email: getMemberContactLabel(m),
          role: m.role,
          photo_base64: getMemberPhotoBase64(m),
        }));
        membersCount = formattedMembers.filter(member => member.role !== 'Invité').length;
      } catch (err: any) {
        console.warn('Impossible de charger les membres:', err);
      }
      setMembers(formattedMembers);

      let spacesCount = 0;
      try {
        const tree = await espaceService.getTree(workspaceId);
        const countSpaces = (items: any[] = []): number =>
          items.reduce((total, item) => total + 1 + countSpaces(item.sous_espaces || []), 0);
        spacesCount = countSpaces(Array.isArray(tree) ? tree : []);
      } catch { spacesCount = 0; }

      let listsCount = 0;
      try {
        const workspaceLists = await listeService.getByWorkspace(workspaceId);
        listsCount = Array.isArray(workspaceLists) ? workspaceLists.length : 0;
      } catch { listsCount = 0; }

      setWorkspaceName(resolvedName);
      setWorkspaceDescription(resolvedDescription);
      setStats({ spacesCount, listsCount, membersCount });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-secondary/60" />
        <p className="text-theme-muted font-black uppercase tracking-widest text-[10px] animate-pulse">Analytiques en cours...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-16"
    >
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {!hideGuestMessage && isGuest && (
        <div className="glass-card bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-center gap-5 shadow-theme-sm">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Info className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-theme-main tracking-tight uppercase tracking-widest text-[11px]">Accès Invité · Lecture seule</p>
            <p className="text-xs text-theme-muted mt-1 opacity-60">Consultez les informations et les membres. Les modifications sont restreintes.</p>
          </div>
          <button
            onClick={() => setHideGuestMessage(true)}
            className="p-1 hover:bg-primary-200/70 dark:hover:bg-primary-400/10 rounded-xl transition-colors"
            title="Masquer ce message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-wrap items-end justify-between gap-8 pb-4">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-primary/10 rounded-2xl shadow-xl shadow-primary/5 border border-primary/10 transition-transform hover:scale-105">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-theme-main tracking-tighter uppercase leading-none">{workspaceName}</h1>
            <div className="flex items-center gap-2 mt-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
              <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] opacity-60">Dashboard Workspace</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/messagerie?resource_type=workspace&resource_id=${workspaceId}`}
            className="inline-flex items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 px-8 py-4 text-[11px] font-black uppercase tracking-widest text-primary shadow-theme-sm transition-all hover:border-secondary/30 hover:bg-secondary hover:text-white hover:shadow-xl hover:shadow-secondary/20"
          >
            <MessageCircle size={18} className="mr-3" />
            Ouvrir la discussion
          </Link>
          {canInviteMembers && (
            <Button
              onClick={() => memberManagementRef.current?.openInviteModal()}
              className="rounded-2xl px-10 py-6 shadow-xl shadow-secondary/20 font-black uppercase tracking-widest text-[11px]"
            >
              <UserPlus size={18} className="mr-3" />
              Inviter un collaborateur
            </Button>
          )}
        </div>
      </div>

      {workspaceDescription && (
        <GlassCard className="p-6 border-l-4 border-l-primary/40 bg-theme-surface/30">
          <p className="text-sm text-theme-main leading-relaxed font-medium italic opacity-80">"{workspaceDescription}"</p>
        </GlassCard>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Espaces Actifs', value: stats.spacesCount, icon: FolderTree, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Projets Directs', value: stats.listsCount, icon: ListTodo, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Collaborateurs', value: stats.membersCount, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="p-8 group hover:border-primary/30 transition-all cursor-default border-theme-border-subtle/30 bg-theme-surface/40">
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black text-theme-main tracking-tighter flex items-center gap-4 uppercase">
              <Users className="h-6 w-6 text-primary" />
              Équipe du Workspace
            </h3>
            {isCreator && (
              <div className="flex items-center gap-3 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 shadow-sm shadow-indigo-500/5">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">Gestion des privilèges</span>
              </div>
            )}
          </div>

          <MemberManagement
            ref={memberManagementRef}
            workspaceId={workspaceId}
            currentUserRole={role}
            onMemberAdded={loadData}
          />
        </div>

        <div className="space-y-10">
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-theme-main tracking-tighter flex items-center gap-4 uppercase px-2">
              <Activity className="h-6 w-6 text-primary" />
              Pulse
            </h3>
            <GlassCard className="p-10 flex flex-col items-center justify-center text-center space-y-6 min-h-[300px] border-theme-border-subtle/30 bg-theme-surface/30">
              <div className="p-6 rounded-3xl bg-theme-surface border border-theme-border-subtle/30 shadow-inner">
                <Calendar size={40} className="text-theme-muted opacity-20" />
              </div>
              <div className="space-y-3">
                <p className="font-black text-theme-main uppercase tracking-widest text-xs">Historique à venir</p>
                <p className="text-theme-muted text-[10px] font-medium leading-relaxed max-w-[180px] mx-auto opacity-40">
                  Les flux d'activités et journaux de modifications seront bientôt disponibles.
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </motion.div>
  );
}