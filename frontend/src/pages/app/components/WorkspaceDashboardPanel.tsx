// frontend/src/pages/app/components/WorkspaceDashboardPanel.tsx
import { useEffect, useMemo, useState } from 'react';
import { Activity, Briefcase, Calendar, FolderTree, ListTodo, Loader2, ShieldCheck, UserPlus, Users, X, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import { espaceService } from '../../../services/espace.service';
import { listeService } from '../../../services/liste.service';
import { workspaceService } from '../../../services/workspace.service';
import { useWorkspaceRole } from '../../../hooks/useWorkspaceRole';
import { getMemberDisplayName, getMemberEmail } from '../../../utils/memberDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import type { Member } from '../../../types';

interface WorkspaceDashboardPanelProps {
  workspaceId: string;
}

const ROLE_MANAGEMENT_OPTIONS = ['Invité', 'Administrateur'];

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

// Composant Toast premium
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
        className="fixed bottom-6 right-6 z-[100]"
      >
        <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl text-theme-main min-w-[320px] backdrop-blur-xl border border-theme-border-subtle/30 ${type === 'success' ? 'bg-emerald-500/90 shadow-emerald-500/20' : type === 'error' ? 'bg-red-500/90 shadow-red-500/20' : 'bg-primary/90 shadow-primary/20'
          }`}>
          <div className="p-2 rounded-xl bg-white/20 border border-white/10">
            {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          </div>
          <span className="text-sm font-black flex-1 tracking-tight uppercase tracking-widest text-[11px]">{message}</span>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/20 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
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
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

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
      } catch { /* Suppress error */ }

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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await workspaceService.inviteMember(workspaceId, { email: inviteEmail, role: inviteRole });
      showMessage(`Invitation envoyée à ${inviteEmail}`, 'success');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      await loadData();
    } catch (err: any) {
      const msg = err?.message || '';
      showMessage(msg.includes('refuse') ? 'Membre déjà présent via parent' : (msg || "Erreur d'invitation"), 'error');
    }
  };

  const handleMemberRoleChange = async (member: Member, nextRole: string) => {
    if (!isCreator || member.role === 'Créateur' || nextRole === member.role) return;
    setUpdatingMemberId(member.id);
    try {
      await workspaceService.updateMemberRole(workspaceId, member.id, nextRole);
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: nextRole } : m));
      showMessage(`Rôle de ${member.name} mis à jour`, 'success');
    } catch (err: any) {
      showMessage(err?.message || "Impossible de modifier le rôle", 'error');
      await loadData();
    } finally {
      setUpdatingMemberId(null);
    }
  };

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

      {isGuest && (
        <div className="glass-card bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-center gap-5 shadow-theme-sm">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Info className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-black text-theme-main tracking-tight uppercase tracking-widest text-[11px]">Accès Invité · Lecture seule</p>
            <p className="text-xs text-theme-muted mt-1 opacity-60">Consultez les informations et les membres. Les modifications sont restreintes.</p>
          </div>
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
        {canInviteMembers && (
          <Button onClick={() => setIsInviteModalOpen(true)} className="rounded-2xl px-10 py-6 shadow-xl shadow-secondary/20 font-black uppercase tracking-widest text-[11px]">
            <UserPlus size={18} className="mr-3" />
            Inviter un collaborateur
          </Button>
        )}
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

          {members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {members.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard className="p-5 flex items-center justify-between gap-4 group hover:bg-theme-surface-hover/30 transition-all border-theme-border-subtle/30">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-theme-border-subtle/20 flex items-center justify-center font-black text-primary text-base group-hover:scale-110 transition-transform shadow-inner">
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-theme-main truncate tracking-tight text-base group-hover:text-primary transition-colors">{member.name}</p>
                        <p className="text-[10px] text-theme-muted font-bold truncate opacity-40 uppercase mt-0.5">{member.email}</p>
                      </div>
                    </div>

                    {isCreator && member.role !== 'Créateur' ? (
                      <div className="flex items-center gap-3">
                        {updatingMemberId === member.id && <Loader2 className="h-4 w-4 animate-spin text-secondary" />}
                        <select
                          value={ROLE_MANAGEMENT_OPTIONS.includes(member.role) ? member.role : 'Invité'}
                          onChange={e => handleMemberRoleChange(member, e.target.value)}
                          disabled={updatingMemberId === member.id}
                          className="bg-theme-surface/50 text-[10px] font-black text-theme-main uppercase tracking-widest border border-theme-border-subtle/30 rounded-xl px-3 py-2 outline-none focus:border-primary transition-all cursor-pointer hover:bg-theme-surface-hover"
                        >
                          {ROLE_MANAGEMENT_OPTIONS.map(r => <option key={r} value={r} className="bg-theme-page text-theme-main">{r}</option>)}
                          <option value="Invité" className="bg-theme-page text-theme-main">Invité</option>
                        </select>
                      </div>
                    ) : (
                      <span className={`text-[9px] px-3 py-1.5 rounded-xl font-black uppercase tracking-widest shadow-sm ${getRoleBadgeClass(member.role)}`}>
                        {getRoleLabel(member.role)}
                      </span>
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
              <p className="font-black uppercase tracking-[0.2em] text-xs text-theme-muted opacity-30">Équipe non listée</p>
            </GlassCard>
          )}
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

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Extension de la Collaboration"
        size="md"
      >
        <div className="space-y-8 py-4">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.3em] ml-2 opacity-60">Email du Contact</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-theme-muted group-focus-within:text-primary transition-colors">
                <Users size={20} />
              </div>
              <input
                type="email"
                placeholder="collaborateur@kplanner.io"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full bg-theme-surface/50 border border-theme-border-subtle/30 rounded-2xl pl-14 pr-6 py-5 text-theme-main placeholder:text-theme-muted/20 focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all outline-none font-bold"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.25em] ml-2 opacity-60">Privilèges au Workspace</label>
            <div className="relative group">
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full bg-theme-surface/50 border border-theme-border-subtle/30 rounded-2xl px-6 py-5 text-theme-main focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black uppercase tracking-widest text-xs appearance-none cursor-pointer"
              >
                {availableInvitationRoles.map(r => <option key={r} value={r} className="bg-theme-page text-theme-main">{r}</option>)}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted opacity-40">
                <Briefcase size={18} />
              </div>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="flex items-start gap-3">
                <Info size={16} className="text-primary mt-0.5" />
                <p className="text-[10px] text-theme-muted font-bold leading-relaxed uppercase tracking-tight">
                  <strong className="text-theme-main">Invité</strong>: Accès aux éléments assignés.<br />
                  <strong className="text-theme-main">Admin</strong>: Contrôle total sur les espaces et membres.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)} className="flex-1 rounded-2xl py-6 font-black uppercase tracking-widest text-[10px] opacity-60 hover:opacity-100">Annuler</Button>
            <Button onClick={handleInvite} className="flex-1 rounded-2xl py-6 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">Envoyer l'Invite</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
