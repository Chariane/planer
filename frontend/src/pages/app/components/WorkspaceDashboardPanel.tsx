// frontend/src/pages/app/components/WorkspaceDashboardPanel.tsx
import { useEffect, useMemo, useState, useRef } from 'react';
import { Activity, Briefcase, Calendar, FolderTree, ListTodo, Loader2, MessageCircle, ShieldCheck, Trash2, UserPlus, Users, X, Info, CheckCircle2, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { espaceService } from '../../../services/espace.service';
import { listeService } from '../../../services/liste.service';
import { tacheService } from '../../../services/tache.service';
import { absenceService } from '../../../services/absence.service';
import { workspaceService } from '../../../services/workspace.service';
import { sanitizeApiErrorMessage } from '../../../services/api';
import { useWorkspaceRole } from '../../../hooks/useWorkspaceRole';
import { useAuth } from '../../../contexts/AuthContext';
import { getAvatarSrc, getInitials, getMemberContactLabel, getMemberDisplayName, getMemberPhotoBase64 } from '../../../utils/memberDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import type { Member } from '../../../types';
import type { MemberManagementRef } from '../../../components/members/MemberManagement';
import MemberManagement from '../../../components/members/MemberManagement';
import { toast } from '../../../components/ui/Toast';

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
  const [hideGuestMessage, setHideGuestMessage] = useState(false);

  // Pulse & Agenda states
  const [spaceProgress, setSpaceProgress] = useState<{ id: string; nom: string; progression: number }[]>([]);
  const [workspaceAvgProgress, setWorkspaceAvgProgress] = useState(0);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [upcomingAbsences, setUpcomingAbsences] = useState<any[]>([]);
  const [pulseLoading, setPulseLoading] = useState(true);

  const memberManagementRef = useRef<MemberManagementRef>(null);

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

  // Chargement du Pulse et de l'Agenda (basé sur les espaces et listes)
  const loadPulseAndAgenda = async () => {
    setPulseLoading(true);
    try {
      const spaces = await espaceService.getByWorkspace(workspaceId);
      const spaceProgressData = [];
      let totalProgress = 0;
      const allTasks: any[] = [];

      const directLists = await listeService.getByWorkspace(workspaceId);

      for (const space of spaces) {
        const lists = await listeService.getByEspace(space.id);
        let spaceTotal = 0, spaceDone = 0;
        for (const list of lists) {
          const tasks = await tacheService.getByListe(list.id);
          spaceTotal += tasks.length;
          spaceDone += tasks.filter((t: any) => t.statut === 'terminé').length;
          allTasks.push(...tasks);
        }
        const progression = spaceTotal > 0 ? Math.round((spaceDone / spaceTotal) * 100) : 0;
        spaceProgressData.push({ id: space.id, nom: space.nom || 'Espace sans nom', progression });
        totalProgress += progression;
      }

      for (const list of directLists) {
        const tasks = await tacheService.getByListe(list.id);
        const total = tasks.length;
        const done = tasks.filter((t: any) => t.statut === 'terminé').length;
        const progression = total > 0 ? Math.round((done / total) * 100) : 0;
        spaceProgressData.push({
          id: list.id,
          nom: `📋 ${list.nom || 'Liste directe'}`,
          progression
        });
        totalProgress += progression;
        allTasks.push(...tasks);
      }

      setSpaceProgress(spaceProgressData);
      setWorkspaceAvgProgress(spaceProgressData.length > 0 ? Math.round(totalProgress / spaceProgressData.length) : 0);

      const now = new Date();
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      const upcoming = allTasks
        .filter((t: any) => t.date_fin_prevue && new Date(t.date_fin_prevue) >= now && new Date(t.date_fin_prevue) <= in7Days)
        .sort((a: any, b: any) => new Date(a.date_fin_prevue).getTime() - new Date(b.date_fin_prevue).getTime())
        .slice(0, 5)
        .map((t: any) => ({
          ...t,
          dueDate: t.date_fin_prevue,
          liste_nom: t.liste_nom || 'Liste'
        }));
      setUpcomingTasks(upcoming);

      const absences = await absenceService.list({ workspace_id: workspaceId });
      const upcomingAbs = absences
        .filter((a: any) => a.statut === 'approuvee' && a.date_debut && new Date(a.date_debut) <= in7Days)
        .slice(0, 5)
        .map((a: any) => ({
          ...a,
          authorName: a.owner_name || 'Utilisateur'
        }));
      setUpcomingAbsences(upcomingAbs);

    } catch (err) {
      console.warn('Erreur chargement pulse/agenda:', err);
    } finally {
      setPulseLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId && !loading) {
      loadPulseAndAgenda();
    }
  }, [workspaceId, loading]);

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
      <div className="flex flex-col items-stretch gap-5 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <div className="shrink-0 p-4 bg-primary/10 rounded-2xl shadow-xl shadow-primary/5 border border-primary/10 transition-transform hover:scale-105 sm:p-5">
            <Briefcase className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-black text-theme-main tracking-tighter uppercase leading-tight sm:text-4xl sm:leading-none">{workspaceName}</h1>
            <div className="flex items-center gap-2 mt-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
              <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] opacity-60">Dashboard Workspace</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            to={`/messagerie?resource_type=workspace&resource_id=${workspaceId}`}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 text-[11px] font-black uppercase tracking-widest text-primary shadow-theme-sm transition-all hover:border-secondary/30 hover:bg-secondary hover:text-white hover:shadow-xl hover:shadow-secondary/20 sm:w-auto sm:px-8"
          >
            <MessageCircle size={18} className="mr-3" />
            Ouvrir la discussion
          </Link>
          {canInviteMembers && (
            <Button
              onClick={() => memberManagementRef.current?.openInviteModal()}
              className="w-full rounded-2xl px-5 py-6 shadow-xl shadow-secondary/20 font-black uppercase tracking-widest text-[11px] sm:w-auto sm:px-10"
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
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
            <GlassCard className="p-5 sm:p-8 group hover:border-primary/30 transition-all cursor-default border-theme-border-subtle/30 bg-theme-surface/40">
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
          <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl sm:text-2xl font-black text-theme-main tracking-tighter flex items-center gap-3 sm:gap-4 uppercase">
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
          {/* Pulse - Avancement global du workspace */}
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-theme-main tracking-tighter flex items-center gap-4 uppercase px-2">
              <Activity className="h-6 w-6 text-primary" />
              Pulse
            </h3>
            <GlassCard className="p-6 border-theme-border-subtle/30 bg-theme-surface/30">
              {pulseLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-secondary/40" /></div>
              ) : spaceProgress.length === 0 ? (
                <div className="py-8 text-center text-theme-muted/40">
                  <FolderTree className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Aucun projet dans ce workspace</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Avancement global</p>
                      <p className="text-4xl font-black text-theme-main">{workspaceAvgProgress}%</p>
                    </div>
                    <div className="h-20 w-20 rounded-full bg-secondary/10 border-4 border-secondary/20 flex items-center justify-center">
                      <span className="text-2xl font-black text-secondary">{workspaceAvgProgress}%</span>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                    {spaceProgress.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="truncate">{item.nom}</span>
                            <span>{item.progression}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-theme-border-subtle rounded-full overflow-hidden">
                            <div
                              className="h-full bg-secondary rounded-full transition-all duration-500"
                              style={{ width: `${item.progression}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </GlassCard>
          </div>

          {/* Agenda - Échéances & Absences */}
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-theme-main tracking-tighter flex items-center gap-4 uppercase px-2">
              <Calendar className="h-6 w-6 text-primary" />
              Agenda
            </h3>
            <GlassCard className="p-6 border-theme-border-subtle/30 bg-theme-surface/30">
              {pulseLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-secondary/40" /></div>
              ) : upcomingTasks.length === 0 && upcomingAbsences.length === 0 ? (
                <div className="py-8 text-center text-theme-muted/40">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Aucune échéance à venir</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
                  {upcomingTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between border-b border-theme-border-subtle pb-3 last:border-0">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-theme-main truncate">{task.title}</p>
                        <p className="text-[10px] text-theme-muted">{task.liste_nom || 'Liste'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Clock className="h-3 w-3 text-theme-muted/30" />
                        <span className="text-xs font-black text-theme-muted">
                          {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {upcomingAbsences.map((absence: any) => (
                    <div key={absence.id} className="flex items-center justify-between border-b border-theme-border-subtle pb-3 last:border-0">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-theme-main truncate">
                          {absence.is_absence ? 'Absence' : 'Congé'} · {absence.authorName}
                        </p>
                        <p className="text-[10px] text-theme-muted">{absence.motif || 'Motif non précisé'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Clock className="h-3 w-3 text-theme-muted/30" />
                        <span className="text-xs font-black text-theme-muted">
                          {new Date(absence.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
