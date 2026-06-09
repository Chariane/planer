// frontend/src/components/members/MemberManagement.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Trash2, X, Users, Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { workspaceService } from '../../services/workspace.service';
import { espaceService } from '../../services/espace.service';
import { listeService } from '../../services/liste.service';
import { sanitizeApiErrorMessage } from '../../services/api';
import { usePermissions } from '../../hooks/usePermissions';
import { useResourceRole } from '../../hooks/useResourceRole';
import { getRoleLabel, ROLES } from '../../lib/roleHierarchy';
import { getAvatarSrc, getInitials, getMemberContactLabel, getMemberDisplayName, getMemberPhotoBase64 } from '../../utils/memberDisplay';
import { isValidInviteIdentifier } from '../../utils/inviteIdentifier';
import { motion, AnimatePresence } from 'framer-motion';
import type { Member } from '../../types';

interface MemberManagementProps {
  workspaceId?: string;
  espaceId?: string;
  listeId?: string;
  onMemberAdded?: () => void;
  currentUserRole?: string | null;
  searchQuery?: string;
}

const MANAGABLE_ROLES = ['Invité', 'Membre', 'Administrateur'];
const ADMIN_ROLE = 'Administrateur';

const getRoleBadgeClass = (role: string) => {
  if (role === 'Administrateur') return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
  if (role === 'Créateur') return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
  if (role === 'Invité') return 'bg-gray-500/10 text-gray-500 border border-gray-500/20';
  return 'bg-secondary/10 text-secondary border border-secondary/20';
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
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-theme-lg min-w-[300px] border ${toneClass}`}>
          <div className={`p-1.5 rounded-full ${iconShellClass}`}>
            {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          </div>
          <span className="text-sm font-bold flex-1 tracking-tight">{message}</span>
          <button onClick={onClose} className={`p-1 rounded-xl transition-colors ${closeClass}`}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function MemberManagement({
  workspaceId,
  espaceId,
  listeId,
  onMemberAdded,
  currentUserRole,
  searchQuery = ''
}: MemberManagementProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Invité');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    userId: string;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [roleActionNotice, setRoleActionNotice] = useState<string | null>(null);

  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const resourceType = listeId ? 'liste' : espaceId ? 'espace' : 'workspace';
  const { role: directListRole } = useResourceRole(listeId, 'liste');
  const { canManageMembers, canInviteMembers, isAdmin, isCreator } = usePermissions({
    userRole: currentUserRole,
    resourceType: resourceType,
  });

  const isDirectListAdmin = !!listeId && directListRole === ADMIN_ROLE;
  const canChangeMemberRoles = canManageMembers && !isDirectListAdmin;
  const canRemoveMembers = canManageMembers;

  const loadMembers = async () => {
    setLoading(true);
    setRoleActionNotice(null);
    try {
      let data;
      if (listeId) data = await listeService.getMembers(listeId);
      else if (espaceId) data = await espaceService.getMembers(espaceId);
      else if (workspaceId) data = await workspaceService.getMembers(workspaceId);
      else {
        setMembers([]);
        setLoading(false);
        return;
      }

      setMembers(data.map((m: any) => ({
        id: m.id_utilisateur || m.utilisateur?.id || m.id,
        name: getMemberDisplayName(m),
        email: getMemberContactLabel(m),
        role: m.role,
        photo_base64: getMemberPhotoBase64(m),
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
    if (!isValidInviteIdentifier(inviteEmail)) {
      showMessage("Entrez une adresse email ou un username valide, sans espace.", 'error');
      return;
    }
    try {
      if (listeId) await listeService.inviteMember(listeId, inviteEmail, inviteRole);
      else if (espaceId) await espaceService.inviteMember(espaceId, inviteEmail, inviteRole);
      else if (workspaceId) await workspaceService.inviteMember(workspaceId, inviteEmail, inviteRole);

      await loadMembers();
      onMemberAdded?.();
      setIsInviteModalOpen(false);
      setInviteEmail('');
      showMessage(`Invitation envoyée à ${inviteEmail}`, 'success');
    } catch (err: any) {
      showMessage(err.message || 'Erreur lors de l\'invitation', 'error');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const targetMember = members.find(m => m.id === userId);
    if (isAdmin && targetMember && (targetMember.role === ROLES.ADMIN || targetMember.role === ROLES.CREATOR)) {
      showMessage('Action non autorisée sur un administrateur', 'error');
      return;
    }

    setConfirmData({
      userId,
      title: 'Retirer de cette ressource',
      message: `Voulez-vous retirer ${targetMember?.name || 'ce membre'} de cette ressource ? Si cette personne possède un rôle hérité depuis un parent, elle gardera cet accès hérité.`,
      confirmText: 'Retirer',
      onConfirm: async () => {
        try {
          if (listeId) await listeService.unassignMember(listeId, userId);
          else if (espaceId) await espaceService.removeMember(espaceId, userId);
          else if (workspaceId) await workspaceService.removeMember(workspaceId, userId);
          await loadMembers();
          showMessage('Membre retiré avec succès', 'success');
        } catch (err) {
          showMessage(sanitizeApiErrorMessage(err, 'Erreur lors du retrait du membre'), 'error');
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setUpdatingMemberId(userId);
    setRoleActionNotice(null);
    const targetMember = members.find(m => m.id === userId);
    try {
      if (listeId) await listeService.assignMember(listeId, userId, newRole);
      else if (espaceId) await espaceService.updateMemberRole(espaceId, userId, newRole);
      else if (workspaceId) await workspaceService.updateMemberRole(workspaceId, userId, newRole);
      await loadMembers();
      showMessage(`Rôle mis à jour`, 'success');
    } catch (err: any) {
      const message = sanitizeApiErrorMessage(err, 'Erreur modification rôle');
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('invitation non nécessaire') || lowerMessage.includes('hérité depuis un')) {
        const friendlyMessage = `${targetMember?.name || 'Cette personne'} possède déjà ce rôle via une ressource parent. Pour revenir au rôle hérité, retirez son rôle direct de cette ressource avec le bouton Retirer.`;
        setRoleActionNotice(friendlyMessage);
        showMessage(friendlyMessage, 'info');
      } else {
        showMessage(message, 'error');
      }
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const displayRoles = listeId ? ((isCreator || isAdmin) ? ['Membre', 'Administrateur'] : ['Membre']) : MANAGABLE_ROLES;

  const filteredMembers = members.filter(member =>
    !searchQuery ||
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-secondary/40" />
        <p className="text-theme-muted font-medium animate-pulse text-xs uppercase tracking-widest">Chargement de l'équipe...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex justify-between items-center px-1">
        <h3 className="text-xl font-black text-theme-main tracking-tighter flex items-center gap-3 uppercase">
          <Users className="h-5 w-5 text-secondary" />
          {listeId ? 'Membres de la liste' : espaceId ? 'Membres de l\'espace' : 'Membres du workspace'}
        </h3>
        {!listeId && canInviteMembers && (
          <Button onClick={() => setIsInviteModalOpen(true)} className="rounded-xl px-4 py-2 shadow-theme-md group transition-all">
            <UserPlus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            <span className="font-bold tracking-tight">Inviter</span>
          </Button>
        )}
      </div>

      {roleActionNotice && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-100 text-amber-950 dark:bg-amber-500/15 dark:text-amber-100 dark:border-amber-400/30 px-4 py-3 text-sm flex items-start justify-between gap-3 shadow-theme-sm">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
            <p className="leading-relaxed font-medium">{roleActionNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setRoleActionNotice(null)}
            className="rounded-lg p-1 text-amber-700 hover:bg-amber-200/70 dark:text-amber-200 dark:hover:bg-amber-400/10 transition-colors"
            title="Masquer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {filteredMembers.length === 0 ? (
        <GlassCard className="py-20 border-dashed flex flex-col items-center justify-center opacity-40">
          <div className="p-4 rounded-full bg-theme-surface border border-white/10 mb-4 shadow-inner">
            <Users className="h-10 w-10 text-theme-muted" />
          </div>
          <p className="font-black text-theme-main uppercase tracking-widest text-xs">
            {searchQuery ? 'Aucun membre trouvé' : 'Aucun membre pour le moment'}
          </p>
          {canInviteMembers && !searchQuery && (
            <p className="text-theme-muted text-[10px] mt-2 leading-relaxed max-w-[200px] text-center">
              Commencez à collaborer en invitant des membres à rejoindre votre projet.
            </p>
          )}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredMembers.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="p-4 flex items-center justify-between gap-4 group hover:bg-white/5 transition-all">
                  <Link to={`/users/${member.id}`} className="flex items-center gap-4 min-w-0 hover:opacity-90">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/20 border border-white/10 flex items-center justify-center overflow-hidden font-black text-secondary text-sm group-hover:shadow-[0_0_15px_rgba(var(--secondary-rgb),0.3)] transition-all">
                      {getAvatarSrc(member.photo_base64) ? (
                        <img src={getAvatarSrc(member.photo_base64) || ''} alt={member.name} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(member.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-theme-main truncate tracking-tight">{member.name}</p>
                      <p className="text-[10px] text-theme-muted font-medium truncate uppercase opacity-60 tracking-wider mb-1">{member.email}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider ${getRoleBadgeClass(member.role)}`}>
                        {getRoleLabel(member.role)}
                      </span>
                    </div>
                  </Link>

                  {member.role !== ROLES.CREATOR && (
                    <div className="flex items-center gap-2">
                      {canChangeMemberRoles && (
                        <>
                        {updatingMemberId === member.id && <Loader2 className="h-3 w-3 animate-spin text-secondary" />}
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value)}
                          disabled={updatingMemberId === member.id}
                          className="bg-transparent text-[10px] font-black text-theme-main uppercase tracking-widest border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-secondary transition-all cursor-pointer hover:bg-white/5 disabled:opacity-50"
                        >
                          {displayRoles.map(r => <option key={r} value={r} className="bg-theme-surface text-theme-main">{getRoleLabel(r)}</option>)}
                        </select>
                        </>
                      )}
                      {canRemoveMembers && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-black uppercase tracking-widest text-theme-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                          title="Retirer de cette ressource"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden xl:inline">Retirer</span>
                        </button>
                      )}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Nouvelle Collaboration" size="md">
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Email ou username</label>
            <div className="relative group">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted group-focus-within:text-secondary transition-colors" />
              <input
                type="text"
                placeholder="collaborateur@kplanner.io ou username"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full bg-theme-surface/50 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-theme-main placeholder:text-theme-muted/40 focus:ring-2 focus:ring-secondary/20 focus:border-secondary/50 transition-all outline-none font-medium"
              />
            </div>
            <p className="text-xs text-theme-muted ml-1">Si la personne a déjà un compte, son username suffit.</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Attribution du Rôle</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full bg-theme-surface/50 border border-white/10 rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all font-bold appearance-none cursor-pointer"
            >
              {MANAGABLE_ROLES.map(r => <option key={r} value={r} className="bg-theme-surface text-theme-main">{getRoleLabel(r)}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)} className="flex-1 rounded-2xl py-6 font-bold tracking-tight uppercase">Annuler</Button>
            <Button onClick={handleInvite} className="flex-1 rounded-2xl py-6 font-bold tracking-tight shadow-theme-md uppercase">Inviter</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmData?.onConfirm || (() => Promise.resolve())}
        title={confirmData?.title || 'Retirer le membre'}
        message={confirmData?.message || 'Voulez-vous vraiment retirer ce membre de cette ressource ?'}
        confirmText={confirmData?.confirmText || 'Retirer'}
      />
    </div>
  );
}
