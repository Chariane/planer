// frontend/src/pages/app/components/PlannerToolsPanel.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Calendar, Check, Download, Edit, Eye, FileText, Loader2, MessageCircle, Paperclip, ShieldAlert, Trash2, Upload, Users, X, CheckCircle2, AlertTriangle, Info, Filter, Plus, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import Modal from '../../../components/ui/Modal';
import { LISTE_TACHE_BASE_URL, plannerToolsService } from '../../../services/plannerTools.service';
import { listeService } from '../../../services/liste.service';
import { tacheService } from '../../../services/tache.service';
import { absenceService } from '../../../services/absence.service';
import { espaceService } from '../../../services/espace.service';
import { workspaceService } from '../../../services/workspace.service';
import { getMemberContactLabel, getMemberDisplayName } from '../../../utils/memberDisplay';
import { ROLES } from '../../../lib/roleHierarchy';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task, UserAvailabilityOut } from '../../../types';
import { AvailabilityBadge } from '../../../components/ui/AvailabilityBadge';
import { toast } from '../../../components/ui/Toast';
import { sanitizeApiErrorMessage } from '../../../services/api';
import { MemberAvatar } from '../../../components/ui/MemberAvatar';

// ============================================================
// UTILITAIRE POUR EXTRAIRE UN MESSAGE D'ERREUR LISIBLE
// ============================================================

const getErrorMessage = (err: any): string => {
  return sanitizeApiErrorMessage(err, 'Une erreur inattendue est survenue.');
};

// ============================================================
// COMPOSANT
// ============================================================
interface PlannerToolsPanelProps {
  workspaceId?: string | null;
  espaceId?: string | null;
  listeId?: string | null;
  currentUserId?: string | null;
  effectiveRole: string | null;
  tasks: Task[];
  initialTool?: 'files' | 'reports' | 'absences';
}

interface ListMemberRecord {
  id: string;
  id_utilisateur: string;
  name: string;
  email: string;
  role: string;
  photo_base64?: string | null;
  username?: string;
  nom?: string;
  prenoms?: string;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
};

// ============================================================
// UTILITAIRE POUR LE CALCUL DE LA DURÉE
// ============================================================
const getDurationDisplay = (startDate: string, endDate?: string | null) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(startDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  if (diffDays === 1) return '1 jour';
  if (diffDays < 7) return `${diffDays} jours`;
  const weeks = Math.floor(diffDays / 7);
  const remainder = diffDays % 7;
  if (remainder === 0) return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
  return `${weeks} sem. ${remainder} j.`;
};

export default function PlannerToolsPanel({
  workspaceId,
  espaceId,
  listeId,
  currentUserId,
  effectiveRole,
  tasks,
  initialTool,
}: PlannerToolsPanelProps) {
  const [activeTool, setActiveTool] = useState<'files' | 'reports' | 'absences'>('files');
  const [members, setMembers] = useState<ListMemberRecord[]>([]);
  const [directMembers, setDirectMembers] = useState<ListMemberRecord[]>([]);
  const [inheritedMembers, setInheritedMembers] = useState<ListMemberRecord[]>([]);
  const [hasCreatedDirectChildInSpace, setHasCreatedDirectChildInSpace] = useState(false);
  const [hasCreatedDirectChildInWorkspace, setHasCreatedDirectChildInWorkspace] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    id: string;
    title: string;
    message: string;
    confirmText?: string;
    confirmVariant?: 'danger' | 'primary' | 'warning';
    loadingText?: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [fileForm, setFileForm] = useState({ nom: '', url_fichier: '', type_fichier: '' });

  const [reports, setReports] = useState<any[]>([]);
  const [reportForm, setReportForm] = useState({
    titre: '',
    realisations: '',
    difficultes_et_solutions: '',
    commentaire: '',
    fichier_joint: '',
    periode_debut: '',
    periode_fin: '',
  });
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [isReportArchiveOpen, setIsReportArchiveOpen] = useState(false);
  const [isAbsenceArchiveOpen, setIsAbsenceArchiveOpen] = useState(false);
  const [reportEditForm, setReportEditForm] = useState({
    titre: '',
    realisations: '',
    difficultes_et_solutions: '',
    commentaire: '',
    fichier_joint: '',
    periode_debut: '',
    periode_fin: '',
  });
  const [archivedReportIds, setArchivedReportIds] = useState<string[]>([]);
  const [archivedAbsenceIds, setArchivedAbsenceIds] = useState<string[]>([]);

  const [absences, setAbsences] = useState<any[]>([]);
  const [absenceView, setAbsenceView] = useState<'mine' | 'pending' | 'calendar' | 'impact'>('mine');
  const [isAbsentModalOpen, setIsAbsentModalOpen] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({
    is_absence: true,
    is_conge_planifie: false,
    date_debut: '',
    date_fin: '',
    motif: '',
    duree_demandee_en_jours: '',
  });
  const [selectedAbsenceForImpact, setSelectedAbsenceForImpact] = useState<any | null>(null);
  const [absenceImpacts, setAbsenceImpacts] = useState<Record<string, any>>({});
  const [taskReplacementByTaskId, setTaskReplacementByTaskId] = useState<Record<string, string>>({});
  const [adminCandidateUserId, setAdminCandidateUserId] = useState('');
  const [adminInviteIdentifier, setAdminInviteIdentifier] = useState('');
  const [decisionTarget, setDecisionTarget] = useState<any | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [listAvailability, setListAvailability] = useState<UserAvailabilityOut[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(false);

  // ✅ NOUVEAU : États pour la notification "Aucun remplaçant"
  const [showNoReplacementNotification, setShowNoReplacementNotification] = useState(false);
  const [noReplacementTaskId, setNoReplacementTaskId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const scope = useMemo(() => ({
    workspace_id: workspaceId || undefined,
    espace_id: espaceId || undefined,
    liste_id: listeId || undefined,
  }), [workspaceId, espaceId, listeId]);
  const activeScopeKey = listeId ? `liste:${listeId}` : espaceId ? `espace:${espaceId}` : workspaceId ? `workspace:${workspaceId}` : 'global';
  const directMembersLabel = listeId ? 'Membres de la liste' : espaceId ? "Membres de l'espace" : 'Membres du workspace';
  const inheritedMembersLabel = listeId ? 'Membres workspace/espace' : 'Membres du workspace parent';
  const reportArchiveKey = `kplanner:archived-reports:${currentUserId || 'anonymous'}:${activeScopeKey}`;
  const absenceArchiveKey = `kplanner:archived-absences:${currentUserId || 'anonymous'}:${activeScopeKey}`;

  const isDirectMemberRecord = directMembers.find(member => member.id_utilisateur === currentUserId);
  const isDirectAdmin = isDirectMemberRecord?.role === ROLES.CREATOR || isDirectMemberRecord?.role === ROLES.ADMIN;
  const isDirectResourceAdmin = isDirectMemberRecord?.role === ROLES.ADMIN;
  const isDirectResourceCreator = isDirectMemberRecord?.role === ROLES.CREATOR;
  const canReceiveReports = listeId
    ? isDirectMemberRecord?.role === ROLES.CREATOR || isDirectMemberRecord?.role === ROLES.ADMIN
    : isDirectMemberRecord?.role === ROLES.CREATOR;
  const directListHasAdmin = !!listeId && directMembers.some(member => member.role === ROLES.ADMIN);
  const isDirectListMember = !!listeId && isDirectMemberRecord?.role === ROLES.MEMBER;
  const hasAssignedTask = !!currentUserId && tasks.some(task => task.assignees.some(assignee => assignee.id === currentUserId));
  const listMemberNeedsAssignedTaskForReport = !!listeId && isDirectListMember && !hasAssignedTask;
  const reportContactMembers = listeId
    ? (() => {
      const admins = directMembers.filter(member => member.role === ROLES.ADMIN);
      if (admins.length > 0) return admins;
      const creator = directMembers.find(member => member.role === ROLES.CREATOR);
      return creator ? [creator] : [];
    })()
    : [];
  const isGuestAccess = effectiveRole === ROLES.GUEST || isDirectMemberRecord?.role === ROLES.GUEST;
  const isManager = effectiveRole === ROLES.CREATOR || effectiveRole === ROLES.ADMIN;
  const isInheritedManager = isManager && !isDirectAdmin;
  const isListInheritedOnlyManager = !!listeId && isManager && !isDirectMemberRecord;
  const hasReportScope = !!(listeId || espaceId || workspaceId);
  const canViewFiles = !!(listeId || espaceId || workspaceId);
  const canViewListReports = !!listeId && !!isDirectMemberRecord && !isGuestAccess;
  const canViewSpaceOrWorkspaceReports = !listeId && !isGuestAccess && (isDirectResourceCreator || isDirectResourceAdmin);

  const canViewReports = hasReportScope && !isListInheritedOnlyManager && (canViewListReports || canViewSpaceOrWorkspaceReports);
  
  const canViewAbsences = !isGuestAccess && !isListInheritedOnlyManager && (
    (listeId || espaceId)
      ? !!isDirectMemberRecord
      : !!workspaceId && !!isDirectMemberRecord
  );
  
  const hasVisibleTool = canViewFiles || canViewReports || canViewAbsences;
  const canCreateReport = listeId
    ? ((isDirectListMember && hasAssignedTask) || isDirectResourceAdmin)
    : espaceId
      ? isDirectResourceAdmin && hasCreatedDirectChildInSpace
      : isDirectResourceAdmin && hasCreatedDirectChildInWorkspace;
  const directAdminNeedsChildForReport = !listeId && isDirectResourceAdmin && (
    espaceId
      ? !hasCreatedDirectChildInSpace
      : !!workspaceId && !hasCreatedDirectChildInWorkspace
  );
  const canShowReportComposer = !isInheritedManager && !isDirectResourceCreator;
  const canShowOwnReportHistory = !isInheritedManager && !isDirectResourceCreator;
  const useFullReportWidth = isInheritedManager || isDirectResourceCreator;

  const canCreateAbsence = !!isDirectMemberRecord && (
    (!!listeId || !!espaceId) && isDirectMemberRecord.role !== ROLES.CREATOR && isDirectMemberRecord.role !== ROLES.GUEST
    || (!!workspaceId && !listeId && !espaceId && (isDirectResourceAdmin || isDirectMemberRecord?.role === ROLES.MEMBER))
  );
  const canViewOwnAbsenceRequests = !isDirectResourceCreator;

  const canAddFiles = isManager;
  const fileTargetType = listeId ? 'liste' : espaceId ? 'espace' : 'workspace';
  const fileTargetId = listeId || espaceId || workspaceId || '';

  const eligibleInheritedMembers = useMemo(
    () => inheritedMembers.filter(member => member.role === ROLES.MEMBER),
    [inheritedMembers]
  );

  useEffect(() => {
    if (initialTool === 'files' && canViewFiles) {
      setActiveTool(initialTool);
      return;
    }
    if (initialTool === 'reports' && canViewReports) {
      setActiveTool(initialTool);
    }
    if (initialTool === 'absences' && canViewAbsences) {
      setActiveTool(initialTool);
    }
  }, [initialTool, canViewFiles, canViewReports, canViewAbsences]);

  useEffect(() => {
    if (activeTool === 'reports' && !canViewReports) {
      if (canViewFiles) {
        setActiveTool('files');
      } else if (canViewAbsences) {
        setActiveTool('absences');
      }
      return;
    }
    if (activeTool === 'files' && !canViewFiles) {
      if (canViewReports) {
        setActiveTool('reports');
      } else if (canViewAbsences) {
        setActiveTool('absences');
      }
    }
    if (activeTool === 'absences' && !canViewAbsences) {
      setActiveTool(canViewFiles ? 'files' : 'reports');
    }
  }, [activeTool, canViewFiles, canViewReports, canViewAbsences]);

  useEffect(() => {
    if (!canViewAbsences && activeTool === 'absences') {
      setActiveTool(canViewFiles ? 'files' : 'reports');
    }
  }, [canViewAbsences, activeTool, canViewFiles]);

  useEffect(() => {
    if (activeTool !== 'absences') return;
    if (absenceView === 'mine' && !canViewOwnAbsenceRequests) {
      setAbsenceView(isManager ? 'pending' : 'mine');
    }
    if (absenceView === 'calendar' && !isManager) {
      setAbsenceView('mine');
    }
  }, [absenceView, activeTool, canCreateAbsence, canViewOwnAbsenceRequests, isManager]);

  const closeConfirm = () => {
    if (loading) return;
    setIsConfirmOpen(false);
    setConfirmData(null);
  };

  const escapeHtml = (value?: string | null) => (
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  );

  const getShortFileType = (file: File): string => {
    const extension = file.name.split('.').pop()?.trim().toLowerCase();
    const mimeSubtype = file.type.split('/')[1]?.split(';')[0]?.trim().toLowerCase();
    return (extension || mimeSubtype || 'fichier').slice(0, 20);
  };

  const loadMembers = async () => {
    if (!workspaceId && !espaceId && !listeId) return [];
    try {
      const workspacePromise = workspaceId ? workspaceService.getMembers(workspaceId).catch(() => []) : Promise.resolve([]);
      const espacePromise = espaceId ? espaceService.getMembers(espaceId).catch(() => []) : Promise.resolve([]);
      const listePromise = listeId ? listeService.getMembers(listeId).catch(() => []) : Promise.resolve([]);

      const [workspaceRes, espaceRes, listeRes] = await Promise.all([workspacePromise, espacePromise, listePromise]);

      const processMembers = (raw: any[]) => {
        const map = new Map<string, ListMemberRecord>();
        (Array.isArray(raw) ? raw : []).forEach((m: any) => {
          const userId = m.id_utilisateur || m.utilisateur?.id || (m.utilisateur && typeof m.utilisateur === 'string' ? m.utilisateur : null) || m.id;
          if (!userId) return;
          map.set(userId, {
            id: m.id,
            id_utilisateur: userId,
            name: getMemberDisplayName(m),
            email: getMemberContactLabel(m),
            role: m.role,
          });
        });
        return Array.from(map.values());
      };

      const workspaceMembers = processMembers(workspaceRes);
      const espaceMembers = processMembers(espaceRes);
      const listeMembers = processMembers(listeRes);
      let direct = listeId ? listeMembers : espaceId ? espaceMembers : workspaceMembers;

      if (workspaceId && !listeId && !espaceId) {
        try {
          const workspace = await workspaceService.getById(workspaceId);
          if (workspace?.id_utilisateur) {
            const creatorExists = direct.some(m => m.id_utilisateur === workspace.id_utilisateur);
            if (!creatorExists) {
              direct.push({
                id: `creator-${workspace.id_utilisateur}`,
                id_utilisateur: workspace.id_utilisateur,
                name: workspace.nom || 'Créateur',
                email: '',
                role: ROLES.CREATOR,
              });
            }
          }
        } catch (e) {
          console.warn("Impossible de récupérer le workspace pour ajouter le créateur", e);
        }
      }

      const inheritedNames = new Set(direct.map(m => m.id_utilisateur));
      const inheritedSources = listeId ? [...espaceMembers, ...workspaceMembers] : espaceId ? workspaceMembers : [];
      const inherited = inheritedSources
        .filter(m => !inheritedNames.has(m.id_utilisateur));

      setDirectMembers(direct);
      setInheritedMembers(inherited);

      const all = [...direct, ...inherited];
      setMembers(all);

      const membershipIdMap = new Map<string, ListMemberRecord>();
      [...listeRes, ...espaceRes, ...workspaceRes].forEach((m: any) => {
        const userId = m.id_utilisateur || m.utilisateur?.id || (m.utilisateur && typeof m.utilisateur === 'string' ? m.utilisateur : null) || m.id;
        if (userId && m.id) {
          membershipIdMap.set(m.id, {
            id: m.id,
            id_utilisateur: userId,
            name: getMemberDisplayName(m),
            email: getMemberContactLabel(m),
            role: m.role,
          });
        }
      });
      (window as any)._membershipMap = membershipIdMap;
      return all;
    } catch (err) {
      console.error('Failed to load members:', err);
      return [];
    }
  };

  useEffect(() => {
    const loadSpaceReportEligibility = async () => {
      setHasCreatedDirectChildInSpace(false);
      if (!espaceId || listeId || !currentUserId || !isDirectResourceAdmin) return;

      try {
        const [subSpacesRaw, listesRaw] = await Promise.all([
          espaceService.getSubSpaces(espaceId).catch(() => []),
          listeService.getByEspace(espaceId).catch(() => []),
        ]);
        const subSpaces = Array.isArray(subSpacesRaw) ? subSpacesRaw : [];
        const listes = Array.isArray(listesRaw) ? listesRaw : [];

        const ownsDirectSubSpace = await Promise.all(
          subSpaces.map(async (space: any) => {
            const spaceMembers = await espaceService.getMembers(space.id).catch(() => []);
            return (Array.isArray(spaceMembers) ? spaceMembers : []).some((member: any) =>
              (member.id_utilisateur || member.utilisateur?.id) === currentUserId
              && member.role === ROLES.CREATOR
            );
          })
        );
        if (ownsDirectSubSpace.some(Boolean)) {
          setHasCreatedDirectChildInSpace(true);
          return;
        }

        const ownsDirectList = await Promise.all(
          listes.map(async (liste: any) => {
            const listeMembers = await listeService.getMembers(liste.id).catch(() => []);
            return (Array.isArray(listeMembers) ? listeMembers : []).some((member: any) =>
              (member.id_utilisateur || member.utilisateur?.id) === currentUserId
              && member.role === ROLES.CREATOR
            );
          })
        );
        setHasCreatedDirectChildInSpace(ownsDirectList.some(Boolean));
      } catch {
        setHasCreatedDirectChildInSpace(false);
      }
    };

    loadSpaceReportEligibility();
  }, [espaceId, listeId, currentUserId, isDirectResourceAdmin]);

  useEffect(() => {
    const loadWorkspaceReportEligibility = async () => {
      setHasCreatedDirectChildInWorkspace(false);
      if (!workspaceId || espaceId || listeId || !currentUserId || !isDirectResourceAdmin) return;

      try {
        const [spacesRaw, listesRaw] = await Promise.all([
          espaceService.getByWorkspace(workspaceId).catch(() => []),
          listeService.getByWorkspace(workspaceId).catch(() => []),
        ]);
        const spaces = Array.isArray(spacesRaw) ? spacesRaw : [];
        const listes = Array.isArray(listesRaw) ? listesRaw : [];

        const ownsDirectSpace = await Promise.all(
          spaces.map(async (space: any) => {
            const spaceMembers = await espaceService.getMembers(space.id).catch(() => []);
            return (Array.isArray(spaceMembers) ? spaceMembers : []).some((member: any) =>
              (member.id_utilisateur || member.utilisateur?.id) === currentUserId
              && member.role === ROLES.CREATOR
            );
          })
        );
        if (ownsDirectSpace.some(Boolean)) {
          setHasCreatedDirectChildInWorkspace(true);
          return;
        }

        const ownsDirectList = await Promise.all(
          listes.map(async (liste: any) => {
            const listeMembers = await listeService.getMembers(liste.id).catch(() => []);
            return (Array.isArray(listeMembers) ? listeMembers : []).some((member: any) =>
              (member.id_utilisateur || member.utilisateur?.id) === currentUserId
              && member.role === ROLES.CREATOR
            );
          })
        );
        setHasCreatedDirectChildInWorkspace(ownsDirectList.some(Boolean));
      } catch {
        setHasCreatedDirectChildInWorkspace(false);
      }
    };

    loadWorkspaceReportEligibility();
  }, [workspaceId, espaceId, listeId, currentUserId, isDirectResourceAdmin]);

  const loadFiles = async () => {
    if (!fileTargetId) return;
    try {
      const data = await plannerToolsService.listFiles({
        target_type: fileTargetType,
        target_id: fileTargetId,
        member_id: selectedMemberId || undefined,
        limit: 50,
      });
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  };

  const loadReports = async () => {
    if (!hasReportScope) return;
    try {
      const data = await plannerToolsService.listReports({
        ...scope,
        member_id: selectedMemberId || undefined,
        limit: 100
      });
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  const loadAbsences = async (customMembers?: ListMemberRecord[]) => {
    if (!listeId && !espaceId && !workspaceId) return;
    try {
      const currentMembers = customMembers || members;
      
      if (currentMembers.length === 0) {
        return;
      }
      
      const userIds = currentMembers.map(m => m.id_utilisateur).filter(Boolean);
      const resourceId = listeId || espaceId || workspaceId || '';
      
      setAvailabilityLoading(true);
      
      const [data, availability] = await Promise.all([
        absenceService.list({
          liste_id: listeId || undefined,
          espace_id: espaceId || undefined,
          workspace_id: workspaceId || undefined,
          limit: 100
        }),
        userIds.length > 0 
          ? absenceService.getAvailability(resourceId, userIds)
          : Promise.resolve([])
      ]);

      setAbsences(Array.isArray(data) ? data : []);
      setListAvailability(Array.isArray(availability) ? availability : []);
      setAvailabilityLoading(false);
    } catch (err) {
      console.error('Failed to load absences:', err);
      setAbsences([]);
      setListAvailability([]);
      setAvailabilityLoading(false);
    }
  };

  const refreshCurrentTool = async () => {
    setLoading(true);
    try {
      const loadedMembers = await loadMembers();
      
      if (activeTool === 'files' && canViewFiles) {
        await loadFiles();
      } else if (activeTool === 'reports') {
        await loadReports();
      } else if (activeTool === 'absences') {
        await loadAbsences(loadedMembers);
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCurrentTool();
  }, [activeTool, listeId, espaceId, workspaceId, selectedMemberId, canViewFiles]);

  useEffect(() => {
    try {
      const archived = JSON.parse(localStorage.getItem(reportArchiveKey) || '[]');
      setArchivedReportIds(Array.isArray(archived) ? archived : []);
    } catch {
      setArchivedReportIds([]);
    }
  }, [reportArchiveKey]);

  useEffect(() => {
    try {
      const archived = JSON.parse(localStorage.getItem(absenceArchiveKey) || '[]');
      setArchivedAbsenceIds(Array.isArray(archived) ? archived : []);
    } catch {
      setArchivedAbsenceIds([]);
    }
  }, [absenceArchiveKey]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await plannerToolsService.uploadFile(file);
      setFileForm(prev => ({
        ...prev,
        nom: prev.nom || file.name,
        url_fichier: result.url,
        type_fichier: getShortFileType(file)
      }));
      toast.success(`Fichier "${file.name}" prêt à être joint.`);
    } catch (err: any) {
      toast.error(`Échec de l'envoi du fichier : ${getErrorMessage(err)}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = (fileId: string) => {
    setConfirmData({
      id: fileId,
      title: 'Supprimer le fichier',
      message: 'Ce fichier sera retiré définitivement de la ressource et de la base de données.',
      confirmText: 'Supprimer',
      confirmVariant: 'danger',
      loadingText: 'Suppression...',
      onConfirm: async () => {
        setLoading(true);
        try {
          await plannerToolsService.deleteFile(fileId);
          setFiles(prev => prev.filter(f => f.id !== fileId));
          toast.success('Fichier supprimé avec succès.');
          closeConfirm();
        } catch (err: any) {
          toast.error(`Erreur lors de la suppression : ${getErrorMessage(err)}`);
        } finally {
          setLoading(false);
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const getFileFullUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${LISTE_TACHE_BASE_URL}${url}`;
  };

  const handleDownload = async (file: any) => {
    try {
      const fullUrl = getFileFullUrl(file.url_fichier);
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.nom || 'fichier';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      toast.error("Échec du téléchargement.");
    }
  };

  const handleCreateFile = async () => {
    if (!canAddFiles) {
      toast.error("Vous n'avez pas le droit d'ajouter un fichier à cette ressource.");
      return;
    }
    if (!fileForm.nom.trim() || !fileForm.url_fichier || !fileTargetId) return;
    setLoading(true);
    try {
      await plannerToolsService.createFile({
        ...fileForm,
        target_type: fileTargetType,
        target_id: fileTargetId,
      });
      setFileForm({ nom: '', url_fichier: '', type_fichier: '' });
      await loadFiles();
      toast.success('Fichier rattaché avec succès.');
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Impossible d'ajouter le fichier.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    const currentUserMemberRecord = directMembers.find(m => m.id_utilisateur === currentUserId);

    if (!currentUserMemberRecord || !reportForm.titre.trim() || !reportForm.periode_debut || !reportForm.periode_fin) {
      toast.error('Veuillez renseigner le titre, la date de début et la date de fin du rapport.');
      return;
    }

    if (new Date(reportForm.periode_debut) > new Date(reportForm.periode_fin)) {
      toast.error('La date de début doit être antérieure ou égale à la date de fin.');
      return;
    }

    if (!canCreateReport) {
      toast.error(
        listeId
          ? 'Seuls les administrateurs directs ou les membres directs ayant au moins une tâche assignée peuvent envoyer un rapport.'
          : espaceId
            ? "Seuls les administrateurs directs ayant créé au moins une liste ou un sous-espace direct dans cet espace peuvent envoyer un rapport."
            : "Seuls les administrateurs directs ayant créé au moins une liste ou un espace direct dans ce workspace peuvent envoyer un rapport."
      );
      return;
    }
    setLoading(true);
    try {
      const createdReport = await plannerToolsService.createReport({
        id_membre: currentUserMemberRecord.id,
        titre: reportForm.titre,
        realisations: reportForm.realisations || undefined,
        difficultes_et_solutions: reportForm.difficultes_et_solutions || undefined,
        commentaire: reportForm.commentaire || undefined,
        fichier_joint: reportForm.fichier_joint || undefined,
        periode_debut: new Date(reportForm.periode_debut).toISOString(),
        periode_fin: new Date(reportForm.periode_fin).toISOString(),
      });
      setReportForm({
        titre: '',
        realisations: '',
        difficultes_et_solutions: '',
        commentaire: '',
        fichier_joint: '',
        periode_debut: '',
        periode_fin: '',
      });
      setSelectedMemberId('');
      setReports(prev => [
        {
          ...createdReport,
          owner_user_id: createdReport.owner_user_id || currentUserId,
          owner_name: createdReport.owner_name || 'Moi',
          liste_id: createdReport.liste_id || listeId,
          id_liste: createdReport.id_liste || listeId,
          id_espace: createdReport.id_espace || espaceId,
          id_workspace: createdReport.id_workspace || workspaceId,
        },
        ...prev.filter(report => report.id !== createdReport.id),
      ]);
      setActiveTool('reports');
      toast.success('Rapport envoyé avec succès.');
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Impossible de créer le rapport.');
    } finally {
      setLoading(false);
    }
  };

  const startEditReport = (report: any) => {
    setEditingReport(report);
    setReportEditForm({
      titre: report.titre || '',
      realisations: report.realisations || '',
      difficultes_et_solutions: report.difficultes_et_solutions || '',
      commentaire: report.commentaire || '',
      fichier_joint: report.fichier_joint || '',
      periode_debut: report.periode_debut ? new Date(report.periode_debut).toISOString().split('T')[0] : '',
      periode_fin: report.periode_fin ? new Date(report.periode_fin).toISOString().split('T')[0] : '',
    });
  };

  const handleUpdateReport = async () => {
    if (!editingReport || !reportEditForm.titre.trim()) return;
    if (reportEditForm.periode_debut && reportEditForm.periode_fin && new Date(reportEditForm.periode_debut) > new Date(reportEditForm.periode_fin)) {
      toast.error('La date de début doit être antérieure ou égale à la date de fin.');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        titre: reportEditForm.titre,
        realisations: reportEditForm.realisations || undefined,
        difficultes_et_solutions: reportEditForm.difficultes_et_solutions || undefined,
        commentaire: reportEditForm.commentaire || undefined,
        fichier_joint: reportEditForm.fichier_joint || undefined,
      };
      if (reportEditForm.periode_debut) {
        payload.periode_debut = new Date(reportEditForm.periode_debut).toISOString();
      }
      if (reportEditForm.periode_fin) {
        payload.periode_fin = new Date(reportEditForm.periode_fin).toISOString();
      }
      const updated = await plannerToolsService.updateReport(editingReport.id, payload);
      setReports(prev => prev.map(report => report.id === editingReport.id ? { ...report, ...updated } : report));
      setSelectedReport((prev: any) => prev?.id === editingReport.id ? { ...prev, ...updated } : prev);
      setEditingReport(null);
      toast.success('Rapport modifié avec succès.');
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Impossible de modifier le rapport.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = (report: any) => {
    setConfirmData({
      id: report.id,
      title: 'Supprimer le rapport',
      message: `Le rapport "${report.titre || 'sans titre'}" sera supprimé définitivement de votre historique.`,
      confirmText: 'Supprimer',
      confirmVariant: 'danger',
      loadingText: 'Suppression...',
      onConfirm: async () => {
        setLoading(true);
        try {
          await plannerToolsService.deleteReport(report.id);
          setReports(prev => prev.filter(item => item.id !== report.id));
          setSelectedReport((prev: any | null) => prev?.id === report.id ? null : prev);
          setEditingReport((prev: any | null) => prev?.id === report.id ? null : prev);
          closeConfirm();
          toast.success('Rapport supprimé avec succès.');
        } catch (err: any) {
          toast.error(getErrorMessage(err) || 'Impossible de supprimer le rapport.');
        } finally {
          setLoading(false);
        }
      },
    });
    setIsConfirmOpen(true);
  };

  const archiveReport = (reportId: string) => {
    const next = Array.from(new Set([...archivedReportIds, reportId]));
    setArchivedReportIds(next);
    localStorage.setItem(reportArchiveKey, JSON.stringify(next));
    toast.success('Rapport archivé dans votre espace.');
  };

  const unarchiveReport = (reportId: string) => {
    const next = archivedReportIds.filter(id => id !== reportId);
    setArchivedReportIds(next);
    localStorage.setItem(reportArchiveKey, JSON.stringify(next));
    toast.success('Rapport restauré.');
  };

  const archiveAbsence = (absenceId: string) => {
    const next = Array.from(new Set([...archivedAbsenceIds, absenceId]));
    setArchivedAbsenceIds(next);
    localStorage.setItem(absenceArchiveKey, JSON.stringify(next));
    toast.success('Demande archivée dans votre espace.');
  };

  const unarchiveAbsence = (absenceId: string) => {
    const next = archivedAbsenceIds.filter(id => id !== absenceId);
    setArchivedAbsenceIds(next);
    localStorage.setItem(absenceArchiveKey, JSON.stringify(next));
    toast.success('Demande restaurée.');
  };

  const handleCreateAbsence = async () => {
    const currentUserMemberRecord = directMembers.find(m => m.id_utilisateur === currentUserId);
    const targetMemberId = currentUserMemberRecord?.id;

    if (!targetMemberId || !absenceForm.date_debut) {
      toast.error('Sélectionnez une date de début.');
      return;
    }

    setLoading(true);
    try {
      const typeLabel = absenceForm.is_absence ? 'Absence' : 'Congé';
      await absenceService.create({
        id_membre: targetMemberId,
        is_absence: absenceForm.is_absence,
        is_conge_planifie: absenceForm.is_conge_planifie,
        date_debut: new Date(absenceForm.date_debut).toISOString(),
        date_fin: absenceForm.date_fin ? new Date(absenceForm.date_fin).toISOString() : undefined,
        motif: absenceForm.motif,
        duree_demandee_en_jours: absenceForm.duree_demandee_en_jours ? Number(absenceForm.duree_demandee_en_jours) : undefined,
      });
      setAbsenceForm({ is_absence: true, is_conge_planifie: false, date_debut: '', date_fin: '', motif: '', duree_demandee_en_jours: '' });
      setIsAbsentModalOpen(false);
      await loadAbsences();
      toast.success(`Demande de ${typeLabel} envoyée pour validation.`);
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Impossible de créer la demande.');
    } finally {
      setLoading(false);
    }
  };

  const openAbsenceDecision = (absence: any, action: 'approve' | 'reject') => {
    setDecisionTarget(absence);
    setDecisionAction(action);
    setDecisionComment('');
  };

  const closeAbsenceDecision = () => {
    if (loading) return;
    setDecisionTarget(null);
    setDecisionAction(null);
    setDecisionComment('');
  };

  const handleAbsenceDecision = async () => {
    if (!decisionTarget || !decisionAction) return;
    setLoading(true);
    try {
      if (decisionAction === 'approve') {
        await absenceService.approve(decisionTarget.id, decisionComment);
      } else {
        await absenceService.reject(decisionTarget.id, decisionComment);
      }
      await loadAbsences();
      toast.success(decisionAction === 'approve' ? 'Demande approuvée.' : 'Demande rejetée.');
      setDecisionTarget(null);
      setDecisionAction(null);
      setDecisionComment('');
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Action impossible.');
    } finally {
      setLoading(false);
    }
  };

  const checkImpact = async (absence: any) => {
    setSelectedAbsenceForImpact(absence);
    setLoading(true);
    try {
      const impact = await absenceService.getImpact(absence.id);
      setAbsenceImpacts(prev => ({ ...prev, [absence.id]: impact }));
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Impossible de charger l\'impact.');
    } finally {
      setLoading(false);
    }
  };

  const getAuthorName = (id_membre: string | null, owner_user_id?: string | null, fallback_name?: string | null) => {
    if (owner_user_id === currentUserId || (id_membre && members.find(m => m.id === id_membre && m.id_utilisateur === currentUserId))) {
      return 'Moi';
    }
    if (owner_user_id) {
      const member = members.find(m => m.id_utilisateur === owner_user_id);
      if (member) return member.name;
    }
    if (id_membre) {
      const member = members.find(m => m.id === id_membre);
      if (member) return member.name;
      const globalMember = (window as any)._membershipMap?.get(id_membre);
      if (globalMember) return globalMember.name;
    }
    if (fallback_name && fallback_name !== 'inconnu') return fallback_name;
    return 'inconnu';
  };

  const renderAbsenceCard = (absence: any, context: 'list' | 'archive' = 'list') => {
    if (!absence) return null;
    const isOwn = absence.owner_user_id === currentUserId;

    const hasAvailableDirectAdmin = directMembers.some(m => 
      m.role === ROLES.ADMIN && 
      listAvailability.some(a => a.id_utilisateur === m.id_utilisateur && a.is_available)
    );

    const canApproveThis = !isOwn && (
      (absence.author_role === 'Membre' && (
        (listeId && (isDirectResourceAdmin || (isDirectResourceCreator && !hasAvailableDirectAdmin))) ||
        (espaceId && (isDirectResourceAdmin || (isDirectResourceCreator && !hasAvailableDirectAdmin))) ||
        (workspaceId && (isDirectResourceAdmin || (isDirectResourceCreator && !hasAvailableDirectAdmin)))
      )) ||
      (absence.author_role === 'Administrateur' && (
        (listeId && isDirectResourceCreator) ||
        (espaceId && isDirectResourceCreator) ||
        (workspaceId && isDirectResourceCreator)
      ))
    );

    const statusConfig: Record<string, { bg: string, text: string, border: string }> = {
      'en_attente': { bg: 'bg-theme-muted/10', text: 'text-theme-muted', border: 'border-theme-border-subtle' },
      'approuvee': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
      'rejetee': { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
      'annulee': { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20' },
      'terminee': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' }
    };

    const cfg = statusConfig[absence.statut] || statusConfig['en_attente'];

    const typeCfg = absence.is_absence
      ? { color: 'amber', icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500' }
      : { color: 'primary', icon: Calendar, bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' };

    const isUrgentAbsence = absence.is_absence && absence.statut === 'en_attente' && new Date(absence.date_debut).toDateString() === new Date().toDateString();

    return (
      <GlassCard
        key={absence.id}
        className={`p-5 border-theme-border-subtle hover:bg-theme-surface-hover/40 transition-all group/card ${absence.is_absence ? 'hover:border-amber-500/30' : 'hover:border-primary/30'}`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2">
            <div className={`p-2 rounded-xl border ${typeCfg.bg} ${typeCfg.border} ${typeCfg.text}`}>
              <typeCfg.icon size={20} />
            </div>
            {isUrgentAbsence && (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="px-2 py-1 bg-rose-500 text-white text-[8px] font-black uppercase rounded-lg h-fit self-center shadow-lg shadow-rose-500/20"
              >
                Urgent
              </motion.div>
            )}
          </div>
          <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            {absence.statut.replace('_', ' ')}
          </span>
        </div>

        <div className="mb-4">
          <p className="font-black text-theme-main text-sm mb-1">{absence.is_absence ? 'Absence' : 'Congé'}</p>
          <div className="flex items-center gap-2">
            <AvailabilityBadge availability={listAvailability.find(a => a.id_utilisateur === absence.owner_user_id)} />
            <p className="text-[10px] font-black text-theme-muted/40 uppercase tracking-widest">{absence.authorName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-theme-main mb-4 bg-theme-surface-hover/30 p-3 rounded-xl border border-theme-border-subtle">
          <div className="flex-1 text-center">
            <p className="text-[8px] uppercase text-theme-muted mb-1 font-black">Début</p>
            <p>{formatDate(absence.date_debut)}</p>
          </div>
          <div className="h-6 w-[1px] bg-theme-border-subtle" />
          <div className="flex-1 text-center">
            <p className="text-[8px] uppercase text-theme-muted mb-1 font-black">Fin</p>
            <p>{formatDate(absence.date_fin)}</p>
          </div>
        </div>

        {absence.motif && <p className="text-[11px] text-theme-muted italic mb-3 font-medium line-clamp-2">"{absence.motif}"</p>}
        {(absence.decision_commentaire || absence.decision_by_name) && (
          <div className="mb-6 rounded-xl border border-theme-border-subtle bg-theme-surface-hover/30 p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-theme-muted">
              Décision {absence.decision_by_name ? `par ${absence.decision_by_name}` : ''}
              {absence.decision_at ? ` · ${formatDate(absence.decision_at)}` : ''}
            </p>
            {absence.decision_commentaire && (
              <p className="mt-1 text-[11px] font-bold text-theme-main line-clamp-2">{absence.decision_commentaire}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-4 border-t border-theme-border-subtle">
          {absence.statut === 'en_attente' && canApproveThis && (
            <button
              onClick={() => checkImpact(absence)}
              className="w-full py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary text-[10px] font-black uppercase rounded-lg transition-all border border-secondary/10"
            >
              Vérifier Impact
            </button>
          )}

          {absence.statut === 'en_attente' && canApproveThis && (
            <div className="flex gap-2">
              <button
                onClick={() => openAbsenceDecision(absence, 'approve')}
                className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase rounded-lg transition-all border border-emerald-500/10"
              >
                Approuver
              </button>
              <button
                onClick={() => openAbsenceDecision(absence, 'reject')}
                className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase rounded-lg transition-all border border-red-500/10"
              >
                Rejeter
              </button>
            </div>
          )}

          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const start = new Date(absence.date_debut);
            start.setHours(0, 0, 0, 0);

            const canCancel = isOwn && (
              absence.statut === 'en_attente' ||
              (absence.statut === 'approuvee' && today < start)
            );

            if (!canCancel) return null;

            return (
              <button
                onClick={async () => {
                  try {
                    await absenceService.cancel(absence.id);
                    await loadAbsences();
                    toast.success(absence.statut === 'en_attente' ? 'Demande retirée.' : 'Demande annulée.');
                  } catch (err: any) {
                    toast.error(getErrorMessage(err) || "Erreur lors de l'annulation.");
                  }
                }}
                className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-black uppercase rounded-lg transition-all border border-rose-500/10 flex items-center justify-center gap-2"
              >
                <XCircle size={14} />
                {absence.statut === 'en_attente' ? 'Retirer la demande' : 'Annuler la demande'}
              </button>
            );
          })()}

          {absence.statut !== 'en_attente' && (
            <button
              onClick={() => context === 'list' ? archiveAbsence(absence.id) : unarchiveAbsence(absence.id)}
              className="w-full py-2 bg-theme-surface-hover/50 hover:bg-theme-surface-hover text-theme-muted text-[10px] font-black uppercase rounded-lg transition-all border border-theme-border-subtle flex items-center justify-center gap-2"
            >
              {context === 'list' ? <><Archive size={12} /> Archiver</> : 'Désarchiver'}
            </button>
          )}
        </div>
      </GlassCard>
    );
  };

  // ============================================================
  // DÉCLARATIONS useMemo (dans le bon ordre)
  // ============================================================

  const absencesWithAuthors = useMemo(() => {
    const result = (absences || [])
      .filter(Boolean)
      .filter(a => a.statut !== 'annulee')
      .map(a => ({
        ...a,
        owner_user_id: a.owner_user_id
          || members.find(m => m.id === a.id_membre)?.id_utilisateur
          || (window as any)._membershipMap?.get(a.id_membre)?.id_utilisateur
          || null,
        authorName: getAuthorName(a.id_membre, a.owner_user_id, a.owner_name),
        author_role: members.find(m => m.id === a.id_membre)?.role || 'Membre'
      }));
    return result;
  }, [absences, members, currentUserId]);

  const ownAbsences = useMemo(
    () => absencesWithAuthors.filter(a =>
      (a.owner_user_id === currentUserId || a.id_membre === isDirectMemberRecord?.id)
      && !archivedAbsenceIds.includes(a.id)
    ),
    [absencesWithAuthors, archivedAbsenceIds, currentUserId, isDirectMemberRecord?.id],
  );

  // ✅ CORRECTION : accessibleAbsences ne filtre plus par id_membre
  // mais par owner_user_id pour éviter que la demande du Membre disparaisse
  const accessibleAbsences = useMemo(
    () => absencesWithAuthors.filter(a => {
      const isOwn = a.owner_user_id === currentUserId;
      return !isOwn && !archivedAbsenceIds.includes(a.id);
    }),
    [absencesWithAuthors, archivedAbsenceIds, currentUserId],
  );

  const archivedAbsences = useMemo(() => {
    return absencesWithAuthors.filter(a => archivedAbsenceIds.includes(a.id));
  }, [absencesWithAuthors, archivedAbsenceIds]);

  const visibleAbsences = useMemo(
    () => (isManager ? [...ownAbsences, ...accessibleAbsences] : ownAbsences),
    [isManager, ownAbsences, accessibleAbsences],
  );

  const isDateInRange = (date: Date, start?: string | null, end?: string | null) => {
    if (!start) return false;
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : startDate;
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return date >= startDate && date <= endDate;
  };

  const rangesOverlap = (startA?: string | null, endA?: string | null, startB?: string | null, endB?: string | null) => {
    if (!startA || !startB) return false;
    const aStart = new Date(startA);
    const aEnd = endA ? new Date(endA) : aStart;
    const bStart = new Date(startB);
    const bEnd = endB ? new Date(endB) : bStart;
    return aStart <= bEnd && bStart <= aEnd;
  };

  // ============================================================
  // ✅ FILTRE PENDING ABSENCES CORRIGÉ
  // ============================================================
  const pendingAbsences = useMemo(() => {
    const result = accessibleAbsences.filter(absence => {
      if (!absence || absence.statut !== 'en_attente') return false;

      if (listeId) {
        if (isDirectResourceAdmin) {
          return absence.author_role === 'Membre';
        }
        if (isDirectResourceCreator) {
          if (absence.author_role === 'Administrateur') return true;
          
          // ✅ CORRECTION : Utiliser directMembers au lieu de members
          // ✅ Si listAvailability est vide, on garde la demande visible
          if (availabilityLoading || listAvailability.length === 0) {
            return absence.author_role === 'Membre';
          }
          
          const hasAvailableAdmin = directMembers.some(m => 
            m.role === ROLES.ADMIN && 
            listAvailability.some(a => a.id_utilisateur === m.id_utilisateur && a.is_available)
          );
          
          return absence.author_role === 'Membre' && !hasAvailableAdmin;
        }
      }

      if (espaceId) {
        if (isDirectResourceAdmin) {
          return absence.author_role === 'Membre';
        }
        if (isDirectResourceCreator) {
          if (absence.author_role === 'Administrateur') return true;
          if (availabilityLoading || listAvailability.length === 0) {
            return absence.author_role === 'Membre';
          }
          const hasAvailableAdmin = directMembers.some(m => 
            m.role === ROLES.ADMIN && 
            listAvailability.some(a => a.id_utilisateur === m.id_utilisateur && a.is_available)
          );
          return absence.author_role === 'Membre' && !hasAvailableAdmin;
        }
      }

      if (workspaceId) {
        if (isDirectResourceAdmin) {
          return absence.author_role === 'Membre';
        }
        if (isDirectResourceCreator) {
          return absence.author_role === 'Administrateur';
        }
      }

      return false;
    });
    
    return result;
  }, [accessibleAbsences, isDirectResourceAdmin, isDirectResourceCreator, listAvailability, directMembers, listeId, espaceId, workspaceId, availabilityLoading]);

  const calendarAbsences = useMemo(
    () => [...visibleAbsences]
      .sort((a, b) => new Date(a.date_debut || 0).getTime() - new Date(b.date_debut || 0).getTime()),
    [visibleAbsences],
  );

  const impactedTasksForAbsences = useMemo(() => {
    const impacted = new Set<string>();
    visibleAbsences
      .filter(absence => ['en_attente', 'approuvee'].includes(absence.statut))
      .forEach(absence => {
        if (!absence) return;
        tasks.forEach(task => {
          const assignedToAbsenceOwner = task.assignees?.some(assignee => assignee.id === absence.owner_user_id);
          if (assignedToAbsenceOwner && rangesOverlap(absence.date_debut, absence.date_fin, task.startDate || task.dueDate, task.dueDate)) {
            impacted.add(task.id);
          }
        });
      });
    return impacted.size;
  }, [tasks, visibleAbsences]);

  const flattenedTasks = useMemo(() => {
    const result: Task[] = [];
    const walk = (items: any[]) => {
      items.forEach(item => {
        result.push(item);
        const children = Array.isArray(item.children)
          ? item.children
          : Array.isArray(item.subtasks)
            ? item.subtasks
            : [];
        if (children.length > 0) walk(children);
      });
    };
    walk(tasks as any[]);
    return result;
  }, [tasks]);

  const taskById = useMemo(() => {
    const map = new Map<string, Task>();
    flattenedTasks.forEach(task => map.set(task.id, task));
    return map;
  }, [flattenedTasks]);

  const getTasksImpactedByAbsence = (absence: any) => {
    if (!absence) return [];
    return flattenedTasks.filter(task => {
      const assignedToOwner = task.assignees?.some(assignee => assignee.id === absence.owner_user_id);
      return assignedToOwner && rangesOverlap(absence.date_debut, absence.date_fin, task.startDate || task.dueDate, task.dueDate);
    });
  };

  // ✅ NOUVELLE VERSION : getTaskReplacementCandidates avec vérification de disponibilité
  const getTaskReplacementCandidates = (task: Task, absence: any) => {
    if (!absence) return [];
    
    // 1. Filtrer les membres éligibles
    const eligible = directMembers.filter(member =>
      member.role === ROLES.MEMBER
      && member.id_utilisateur !== absence.owner_user_id
      && !task.assignees?.some(assignee => assignee.id === member.id_utilisateur)
    );
    
    // 2. Enrichir avec les données de disponibilité
    return eligible.map(member => {
      const availability = listAvailability.find(
        a => a.id_utilisateur === member.id_utilisateur
      );
      return {
        ...member,
        isAvailable: availability?.is_available ?? true,
        currentAbsence: availability?.current_absence ?? null,
      };
    });
  };

  // ✅ NOUVELLE FONCTION : Trier les candidats par disponibilité
  const getSortedReplacementCandidates = (task: Task, absence: any) => {
    const candidates = getTaskReplacementCandidates(task, absence);
    
    // Trier par disponibilité (disponibles en premier)
    return candidates.sort((a, b) => {
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      return 0;
    });
  };

  // ✅ MODIFIÉ : handleAssignTaskReplacement avec notification "Aucun remplaçant"
  const handleAssignTaskReplacement = async (task: Task, _absence: any) => {
    const replacementUserId = taskReplacementByTaskId[task.id];
    
    // Vérifier si un remplaçant a été sélectionné
    if (!replacementUserId) {
      // Vérifier s'il y a des candidats disponibles
      const candidates = getSortedReplacementCandidates(task, _absence);
      const availableCandidates = candidates.filter(c => c.isAvailable);
      
      // ✅ SI AUCUN CANDIDAT DISPONIBLE → NOTIFICATION
      if (availableCandidates.length === 0) {
        setNoReplacementTaskId(task.id);
        setShowNoReplacementNotification(true);
        return;
      }
      
      toast.error('Choisissez un membre à ajouter sur cette tâche.');
      return;
    }
    
    setLoading(true);
    try {
      await tacheService.assignMember(task.id, replacementUserId);
      const replacement = directMembers.find(member => member.id_utilisateur === replacementUserId);
      toast.success(`${replacement?.name || 'Le membre'} a été ajouté sur "${task.title}".`);
      setTaskReplacementByTaskId(prev => ({ ...prev, [task.id]: '' }));
      
      // ✅ Réinitialiser la notification si elle était affichée
      setShowNoReplacementNotification(false);
      setNoReplacementTaskId(null);
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Impossible d'ajouter ce membre sur la tâche.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBackupAdmin = async () => {
    if (!listeId) return;
    if (!adminCandidateUserId && !adminInviteIdentifier.trim()) {
      toast.error('Choisissez un membre hérité ou renseignez un email/username.');
      return;
    }
    setLoading(true);
    try {
      if (adminCandidateUserId) {
        await listeService.assignMember(listeId, adminCandidateUserId, ROLES.ADMIN);
        const admin = inheritedMembers.find(member => member.id_utilisateur === adminCandidateUserId);
        toast.success(`${admin?.name || 'Le membre'} a été ajouté comme administrateur de la liste.`);
      } else {
        await listeService.inviteMember(listeId, adminInviteIdentifier.trim(), ROLES.ADMIN);
        toast.success('Invitation administrateur envoyée.');
      }
      setAdminCandidateUserId('');
      setAdminInviteIdentifier('');
      await loadMembers();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Impossible d'ajouter cet administrateur.");
    } finally {
      setLoading(false);
    }
  };

  const absenceDashboard = useMemo(() => {
    const unavailableToday = listAvailability.filter(item => !item.is_available).length;
    const upcoming = visibleAbsences.filter(absence =>
      absence.statut === 'approuvee' && new Date(absence.date_debut) > new Date()
    ).length;
    
    const impactedProjectsCount = visibleAbsences.reduce((acc, absence) => {
      const impact = absenceImpacts[absence.id];
      if (impact && impact.impacted_projects) {
        return acc + impact.impacted_projects.length;
      }
      return acc;
    }, 0);

    return {
      unavailableToday,
      pending: pendingAbsences.length,
      upcoming,
      impactedTasks: impactedTasksForAbsences,
      impactedProjectsCount,
    };
  }, [impactedTasksForAbsences, listAvailability, pendingAbsences.length, visibleAbsences, absenceImpacts]);

  const renderAbsenceList = (items: any[], emptyLabel: string) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {items.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 py-16 text-center opacity-30 border-2 border-dashed border-theme-border-subtle rounded-3xl bg-theme-surface-hover/20">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-theme-muted" />
            <p className="font-black text-[10px] uppercase tracking-widest">{emptyLabel}</p>
          </div>
        ) : (
          items.map(absence => renderAbsenceCard(absence))
        )}
      </AnimatePresence>
    </div>
  );

  const renderImpactPanel = () => {
    const impactAbsences = visibleAbsences.filter(absence => absence.statut === 'approuvee');

    if (impactAbsences.length === 0) {
      return (
        <div className="py-16 text-center opacity-30 border-2 border-dashed border-theme-border-subtle rounded-3xl bg-theme-surface-hover/20">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-theme-muted" />
          <p className="font-black text-[10px] uppercase tracking-widest">Aucun impact à surveiller</p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {impactAbsences.map(absence => {
          const absenceImpact = absenceImpacts[absence.id];
          const impactedProjects = absenceImpact?.impacted_projects || [];
          const soleAdminProjects = absenceImpact?.sole_admin_projects || [];
          const soleCreatorProjects = absenceImpact?.sole_creator_projects || [];

          const isOwn = absence.owner_user_id === currentUserId;
          const canManageThisImpact = absence.statut === 'en_attente' && isManager && !isOwn;

          const impactedTasks = listeId ? getTasksImpactedByAbsence(absence) : [];
          const showTasks = listeId && (isDirectResourceAdmin || isDirectResourceCreator) && impactedTasks.length > 0;
          const showProjects = !listeId && impactedProjects.length > 0;
          const hasGovernanceRisk = soleAdminProjects.length > 0 || soleCreatorProjects.length > 0;

          if (!showTasks && !showProjects && !hasGovernanceRisk) return null;

          return (
            <GlassCard key={absence.id} className="p-6 border-theme-border-subtle bg-theme-surface/70">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${absence.is_absence ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                      {absence.is_absence ? 'Absence' : 'Congé'}
                    </span>
                    <span className="rounded-full border border-theme-border-subtle bg-theme-surface-hover/50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-theme-muted">
                      {absence.statut.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-base font-black text-theme-main">{absence.authorName}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-theme-muted">
                    {formatDate(absence.date_debut)} → {formatDate(absence.date_fin)}
                  </p>
                </div>
                <div className={`rounded-2xl border px-4 py-3 text-right ${(showTasks || showProjects || hasGovernanceRisk) ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${(showTasks || showProjects || hasGovernanceRisk) ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {(showTasks || showProjects || hasGovernanceRisk) ? 'Action recommandée' : 'Impact faible'}
                  </p>
                  <p className="mt-1 text-xs font-bold text-theme-main">
                    {showTasks ? `${impactedTasks.length} tâche(s) touchée(s)` :
                     showProjects ? `${impactedProjects.length} projet(s) impacté(s)` :
                     hasGovernanceRisk ? 'Risque de gouvernance' : 'Aucun impact'}
                  </p>
                </div>
              </div>

              {absence.motif && (
                <p className="mt-4 rounded-2xl border border-theme-border-subtle bg-theme-surface-hover/30 p-4 text-xs font-medium italic text-theme-muted">
                  "{absence.motif}"
                </p>
              )}

              {(absence.decision_commentaire || absence.decision_by_name) && (
                <div className="mt-4 rounded-2xl border border-theme-border-subtle bg-theme-surface-hover/30 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted">
                    Décision {absence.decision_by_name ? `par ${absence.decision_by_name}` : ''}
                    {absence.decision_at ? ` · ${formatDate(absence.decision_at)}` : ''}
                  </p>
                  {absence.decision_commentaire && (
                    <p className="mt-2 text-xs font-bold text-theme-main">{absence.decision_commentaire}</p>
                  )}
                </div>
              )}

              {showTasks && (
                <div className="mt-5 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-muted">Tâches impactées</p>
                  {impactedTasks.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs font-bold text-emerald-600">
                      Aucune tâche assignée à cette personne ne chevauche la période demandée.
                    </div>
                  ) : (
                    impactedTasks.map(task => {
                      const candidates = getTaskReplacementCandidates(task, absence);
                      return (
                        <div key={task.id} className="rounded-2xl border border-theme-border-subtle bg-theme-surface-hover/20 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <Link to={`/tache/${task.id}`} className="text-sm font-black text-theme-main truncate hover:text-secondary hover:underline flex items-center gap-2">
                                {task.title}
                                <Eye size={12} className="shrink-0" />
                              </Link>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-theme-muted">
                                Échéance {formatDate(task.dueDate)} · {task.priority}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {task.assignees?.map(assignee => (
                                <span key={assignee.id} className="rounded-full border border-theme-border-subtle bg-theme-surface px-3 py-1 text-[9px] font-black uppercase tracking-widest text-theme-main">
                                  {assignee.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          {canManageThisImpact && (
                            <div className="mt-4 space-y-3">
                              <div className="flex items-center gap-2 px-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Assignation alternative :</span>
                              </div>
                              {/* ✅ SECTION MODIFIÉE : Affichage des candidats avec disponibilité */}
                              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-secondary/20 bg-secondary/5 p-3 md:grid-cols-[1fr_auto]">
                                {availabilityLoading ? (
                                  <div className="flex items-center gap-2 col-span-2 py-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                                    <span className="text-xs text-theme-muted">Vérification des disponibilités...</span>
                                  </div>
                                ) : (
                                  <>
                                    <select
                                      value={taskReplacementByTaskId[task.id] || ''}
                                      onChange={e => setTaskReplacementByTaskId(prev => ({ ...prev, [task.id]: e.target.value }))}
                                      className="h-11 rounded-xl border border-theme-border-subtle bg-theme-surface px-4 text-xs font-bold text-theme-main outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
                                    >
                                      <option value="">Choisir un remplaçant ou renfort</option>
                                      {getSortedReplacementCandidates(task, absence).map(candidate => {
                                        const isAvailable = candidate.isAvailable;
                                        return (
                                          <option 
                                            key={candidate.id_utilisateur} 
                                            value={candidate.id_utilisateur}
                                            disabled={!isAvailable}
                                            className={!isAvailable ? 'text-theme-muted/50' : ''}
                                          >
                                            {candidate.name} 
                                            {isAvailable 
                                              ? ' ✅ Disponible' 
                                              : ` ⚠️ Absent(e)`
                                            }
                                          </option>
                                        );
                                      })}
                                    </select>
                                    <Button
                                      type="button"
                                      onClick={() => handleAssignTaskReplacement(task, absence)}
                                      disabled={loading || !taskReplacementByTaskId[task.id]}
                                      className="h-11 rounded-xl bg-secondary px-6 text-[10px] font-black uppercase tracking-widest hover:bg-secondary/80 shadow-premium-sm active:scale-95 transition-all"
                                    >
                                      {(() => {
                                        const candidates = getSortedReplacementCandidates(task, absence);
                                        const availableCount = candidates.filter(c => c.isAvailable).length;
                                        
                                        if (candidates.length === 0) {
                                          return 'Aucun membre';
                                        }
                                        if (availableCount === 0) {
                                          return 'Tous indisponibles';
                                        }
                                        return 'Assigner';
                                      })()}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {showProjects && (
                <div className="mt-5 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-muted">Projets impactés</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {impactedProjects.map((project: any) => (
                      <div key={project.id} className="rounded-2xl border border-theme-border-subtle bg-theme-surface-hover/20 p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-black text-theme-main">{project.nom}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-theme-muted mt-1">
                              Rôle : {project.role}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-theme-main">{project.progression}%</span>
                            <div className="w-20 h-1.5 bg-theme-border-subtle rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-secondary rounded-full" style={{ width: `${project.progression}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasGovernanceRisk && (
                <div className="mt-5 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-muted">Gouvernance critique</p>
                  {soleAdminProjects.map((p: any) => (
                    <div key={p.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-theme-main">Admin unique : {p.nom}</p>
                        <p className="text-[11px] text-theme-muted">Ce projet n'aura plus d'administrateur actif durant l'absence.</p>
                      </div>
                    </div>
                  ))}
                  {soleCreatorProjects.map((p: any) => (
                    <div key={p.id} className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-theme-main">Créateur unique : {p.nom}</p>
                        <p className="text-[11px] text-theme-muted">Ce projet n'aura plus de créateur direct actif.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const reportsWithAuthors = useMemo(() => {
    return (reports || []).filter(Boolean).map(report => ({
      ...report,
      owner_user_id: report.owner_user_id
        || members.find(member => member.id === report.id_membre)?.id_utilisateur
        || (window as any)._membershipMap?.get(report.id_membre)?.id_utilisateur
        || null,
      authorName: getAuthorName(report.id_membre, report.owner_user_id, report.owner_name)
    }));
  }, [reports, members, currentUserId]);

  const ownReports = useMemo(
    () => reportsWithAuthors.filter(report =>
      report.owner_user_id === currentUserId
      || report.id_membre === isDirectMemberRecord?.id
    ),
    [reportsWithAuthors, currentUserId, isDirectMemberRecord?.id],
  );

  const accessibleReports = useMemo(
    () => reportsWithAuthors.filter(report =>
      report.owner_user_id !== currentUserId
      && report.id_membre !== isDirectMemberRecord?.id
      && !archivedReportIds.includes(report.id)
    ),
    [reportsWithAuthors, archivedReportIds, currentUserId, isDirectMemberRecord?.id],
  );

  const archivedReports = useMemo(
    () => reportsWithAuthors.filter(report => archivedReportIds.includes(report.id)),
    [reportsWithAuthors, archivedReportIds],
  );

  const filesWithAuthors = useMemo(() => {
    return (files || []).filter(Boolean).map(file => ({
      ...file,
      owner_user_id: file.owner_user_id || file.meta_donnees?.owner_user_id || null,
      authorName: getAuthorName(file.id_membre, file.meta_donnees?.owner_user_id, file.owner_name)
    }));
  }, [files, members, currentUserId]);

  const printReport = (report: any) => {
    const win = window.open('', '_blank');
    if (!win) return;

    const safeTitle = escapeHtml(report.titre);
    const safeAuthor = escapeHtml(report.authorName || 'Utilisateur');
    const safeRealisations = escapeHtml(report.realisations);
    const safeDifficultes = escapeHtml(report.difficultes_et_solutions);
    const safeCommentaire = escapeHtml(report.commentaire);
    const periodeDebut = report.periode_debut ? formatDate(report.periode_debut) : 'Non renseignée';
    const periodeFin = report.periode_fin ? formatDate(report.periode_fin) : 'Non renseignée';

    win.document.write(`
      <html>
        <head>
          <title>Rapport - ${safeTitle}</title>
          <style>
            body {font-family: Inter, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header {border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
            .title {font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
            .meta {font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
            .section {margin-bottom: 30px; }
            .section-title {font-size: 10px; font-weight: 900; color: #059669; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; }
            .content {font-size: 14px; background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; white-space: pre-wrap; }
            .content.warning {background: #fff1f2; border-left-color: #f43f5e; color: #9f1239; }
            .content.note {background: #eff6ff; border-left-color: #3b82f6; color: #1d4ed8; }
            .period {background: #f0fdf4; border-left-color: #22c55e; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; font-weight: 600; }
            .footer {margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; display: flex; justify-content: space-between; }
            .signature {font-weight: 700; color: #059669; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="meta">Rapport d'activité</div>
              <h1 class="title">${safeTitle}</h1>
            </div>
            <div class="meta">Date d'émission: ${formatDate(report.created_at)}</div>
          </div>

          <div class="period">
            <span>📅 Période du rapport</span>
            <span>Du ${periodeDebut} au ${periodeFin}</span>
          </div>

          <div class="section">
            <div class="section-title">I. Réalisations</div>
            <div class="content">${safeRealisations}</div>
          </div>
          ${safeDifficultes ? `
          <div class="section">
            <div class="section-title">II. Difficultés & Solutions</div>
            <div class="content warning">${safeDifficultes}</div>
          </div>` : ''}
          ${safeCommentaire ? `
          <div class="section">
            <div class="section-title">III. Commentaires Additionnels</div>
            <div class="content note">${safeCommentaire}</div>
          </div>` : ''}
          <div class="footer">
            <div>Généré par K-Planer le ${new Date().toLocaleDateString('fr-FR')}</div>
            <div>Signé: <span class="signature">${safeAuthor}</span></div>
          </div>
          <script>window.onload = () => {window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-8 pb-20">
      {hasVisibleTool && (
        <div className="p-1 px-1 flex flex-wrap gap-1 border border-theme-border-subtle shadow-theme-md bg-theme-surface/50 backdrop-blur-xl rounded-2xl">
          {canViewFiles && (
            <button
              onClick={() => setActiveTool('files')}
              className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl font-black transition-all duration-300 relative group overflow-hidden ${activeTool === 'files' ? 'text-secondary bg-secondary/5 shadow-inner' : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover/50'
                }`}
            >
              <Paperclip className={`h-4 w-4 transition-transform group-hover:scale-110 ${activeTool === 'files' ? 'text-secondary' : ''}`} />
              <span className="text-[10px] uppercase tracking-[0.2em]">Fichiers</span>
              {activeTool === 'files' && <motion.div layoutId="activeTool" className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary mx-4 rounded-full" />}
            </button>
          )}

          {canViewReports && (
            <button
              onClick={() => setActiveTool('reports')}
              className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl font-black transition-all duration-300 relative group overflow-hidden ${activeTool === 'reports' ? 'text-secondary bg-secondary/5 shadow-inner' : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover/50'
                }`}
            >
              <FileText className={`h-4 w-4 transition-transform group-hover:scale-110 ${activeTool === 'reports' ? 'text-secondary' : ''}`} />
              <span className="text-[10px] uppercase tracking-[0.2em]">Rapports</span>
              {activeTool === 'reports' && <motion.div layoutId="activeTool" className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary mx-4 rounded-full" />}
            </button>
          )}

          {canViewAbsences && (
            <button
              onClick={() => setActiveTool('absences')}
              className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl font-black transition-all duration-300 relative group overflow-hidden ${activeTool === 'absences' ? 'text-secondary bg-secondary/5 shadow-inner' : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover/50'
                }`}
            >
              <Calendar className={`h-4 w-4 transition-transform group-hover:scale-110 ${activeTool === 'absences' ? 'text-secondary' : ''}`} />
              <span className="text-[10px] uppercase tracking-[0.2em]">Absences</span>
              {activeTool === 'absences' && <motion.div layoutId="activeTool" className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary mx-4 rounded-full" />}
            </button>
          )}
        </div>
      )}

      {((activeTool === 'files' && canViewFiles) || (activeTool === 'reports' && canViewReports)) && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="relative flex-1 group">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted group-focus-within:text-secondary transition-colors" />
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none appearance-none cursor-pointer font-bold tracking-tight transition-all"
            >
              <option value="" className="bg-theme-surface">Tous les membres</option>
              {directMembers.length > 0 && (
                <optgroup label={directMembersLabel} className="bg-theme-surface font-black uppercase text-[10px] tracking-widest">
                  {directMembers.map(member => (
                    <option key={member.id} value={member.id} className="bg-theme-surface">
                      {member.name} {member.id_utilisateur === currentUserId ? '(Moi)' : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {inheritedMembers.length > 0 && (
                <optgroup label={inheritedMembersLabel} className="bg-theme-surface font-black uppercase text-[10px] tracking-widest">
                  {inheritedMembers.map(member => (
                    <option key={member.id} value={member.id} className="bg-theme-surface">
                      {member.name} {member.id_utilisateur === currentUserId ? '(Moi)' : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted pointer-events-none" />
          </div>
          {selectedMemberId && (
            <button
              onClick={() => setSelectedMemberId('')}
              className="p-3 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl text-theme-muted hover:text-red-500 hover:bg-red-500/10 transition-all font-bold group"
              title="Effacer le filtre"
            >
              <X size={18} className="group-hover:scale-110 transition-transform" />
            </button>
          )}
        </motion.div>
      )}

      {activeTool === 'files' && canViewFiles && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="p-6 border border-theme-border-subtle bg-theme-surface/30 backdrop-blur-xl rounded-3xl">
            <div className="flex items-center gap-2 mb-6">
              <Upload className="h-5 w-5 text-secondary" />
              <h4 className="text-[10px] font-black text-theme-main uppercase tracking-[0.2em]">Joindre un document</h4>
            </div>

            {!canAddFiles ? (
              <div className="flex items-start gap-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 text-[11px] text-theme-muted leading-relaxed font-bold">
                <ShieldAlert className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <span>Lecture seule. Vous pouvez consulter les fichiers de cette ressource, mais seuls les administrateurs ou créateurs, directs ou par héritage, peuvent en joindre de nouveaux.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" disabled={!canAddFiles || isUploading} />
                <div className="md:col-span-4">
                  <Button variant="outline" className="w-full h-[56px] rounded-2xl border-theme-border-subtle hover:bg-theme-surface-hover/50 transition-all group flex items-center justify-center p-0" onClick={() => fileInputRef.current?.click()} disabled={!canAddFiles || isUploading}>
                    <div className="flex items-center gap-3">
                      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5 group-hover:rotate-12 transition-transform text-secondary" />}
                      <span className="font-black uppercase tracking-widest text-[10px]">{fileForm.url_fichier ? 'Fichier prêt' : 'Choisir'}</span>
                    </div>
                  </Button>
                </div>
                <div className="md:col-span-5 relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted group-focus-within:text-secondary transition-colors"><Edit size={16} /></div>
                  <input
                    value={fileForm.nom}
                    onChange={e => setFileForm(prev => ({ ...prev, nom: e.target.value }))}
                    placeholder="Nom du document..."
                    className="w-full h-[56px] bg-theme-surface/50 border border-theme-border-subtle rounded-2xl pl-14 pr-4 text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold placeholder:text-theme-muted/30 transition-all"
                    disabled={!canAddFiles || isUploading}
                  />
                </div>
                <div className="md:col-span-3">
                  <Button onClick={handleCreateFile} disabled={!canAddFiles || loading || isUploading || !fileForm.url_fichier} className="w-full h-[56px] rounded-2xl shadow-theme-md group">
                    <Plus className="h-5 w-5 mr-1 group-hover:rotate-90 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-[10px]">Lier</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filesWithAuthors.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-3 py-20 text-center opacity-30">
                  <Paperclip className="h-12 w-12 mx-auto mb-4 text-theme-muted" />
                  <p className="font-black text-xs uppercase tracking-[0.3em] text-theme-main">Aucun document joint</p>
                </div>
              ) : (
                filesWithAuthors.map((file, idx) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="p-4 group/item hover:bg-theme-surface-hover/40 transition-all border border-theme-border-subtle bg-theme-surface rounded-2xl flex items-center justify-between gap-4 shadow-theme-sm">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-12 w-12 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary group-hover/item:shadow-[0_0_20px_rgba(var(--secondary-rgb),0.3)] transition-all flex-shrink-0">
                          <FileText size={24} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-theme-main truncate tracking-tight text-sm mb-0.5" title={file.nom}>{file.nom}</p>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black uppercase text-secondary/60 tracking-widest">Par {file.authorName}</span>
                            <span className="text-[9px] font-black text-theme-muted/40 uppercase tracking-widest">{formatDate(file.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => window.open(getFileFullUrl(file.url_fichier), '_blank')} className="p-2 text-theme-muted hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all" title="Visualiser"><Eye size={18} /></button>
                        <button onClick={() => handleDownload(file)} className="p-2 text-theme-muted hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all" title="Télécharger"><Download size={18} /></button>
                        {(file.owner_user_id === currentUserId || isDirectResourceCreator) && (
                          <button onClick={() => handleDeleteFile(file.id)} className="p-2 text-theme-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all" title="Supprimer"><Trash2 size={18} /></button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {activeTool === 'reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`grid grid-cols-1 gap-8 ${useFullReportWidth ? '' : 'lg:grid-cols-12'}`}>
          {canShowReportComposer && (
            <div className="lg:col-span-4 lg:sticky lg:top-4 self-start">
              <GlassCard className="p-6 border-secondary/10 bg-secondary/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none rotate-12">
                  <FileText size={120} className="text-secondary" />
                </div>

                <div className="flex items-center gap-3 mb-8 relative">
                  <div className="p-2 bg-secondary rounded-xl shadow-lg ring-4 ring-secondary/10">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="text-sm font-black text-theme-main uppercase tracking-widest">Nouveau Rapport</h4>
                </div>

                {!canCreateReport ? (
                  listMemberNeedsAssignedTaskForReport ? (
                    <div className="relative space-y-5 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
                      <div className="flex gap-4">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-amber-500">Rapport indisponible</p>
                          <p className="text-sm font-bold leading-relaxed text-theme-main">
                            Vous devez avoir au moins une tâche assignée dans cette liste avant de pouvoir envoyer un rapport.
                          </p>
                          <p className="mt-2 text-xs font-medium leading-relaxed text-theme-muted">
                            Le rapport sert à faire le point sur un travail réellement confié. Vous pouvez contacter un responsable du projet pour demander une assignation.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface/70 p-4">
                        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-theme-muted">
                          <MessageCircle className="h-4 w-4 text-secondary" />
                          Contacter un responsable
                        </div>
                        {reportContactMembers.length > 0 ? (
                          <div className="space-y-2">
                            {reportContactMembers.map(member => (
                              <Link
                                key={member.id_utilisateur}
                                to={`/messagerie?private_user_id=${member.id_utilisateur}`}
                                className="group flex items-center justify-between gap-3 rounded-2xl border border-theme-border-subtle bg-theme-bg/60 px-4 py-3 transition-all hover:border-secondary/30 hover:bg-secondary/10"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-theme-main">{member.name}</p>
                                  <p className="truncate text-[11px] font-bold text-theme-muted">{member.role === ROLES.CREATOR ? 'Créateur du projet' : 'Administrateur du projet'}</p>
                                </div>
                                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-white shadow-theme-sm transition-transform group-hover:scale-105">
                                  <MessageCircle className="h-4 w-4" />
                                </span>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-medium leading-relaxed text-theme-muted">
                            Aucun responsable direct n’est disponible dans cette liste pour le moment.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : directAdminNeedsChildForReport ? (
                    <div className="relative space-y-5 rounded-3xl border border-sky-500/20 bg-sky-500/5 p-5">
                      <div className="flex gap-4">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/20">
                          <Info className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-sky-500">Rapport pas encore disponible</p>
                          <p className="text-sm font-bold leading-relaxed text-theme-main">
                            Vous êtes administrateur direct de cette ressource, mais vous devez d’abord créer au moins un élément direct dans ce périmètre.
                          </p>
                          <p className="mt-2 text-xs font-medium leading-relaxed text-theme-muted">
                            {espaceId
                              ? "Créez une liste ou un sous-espace directement dans cet espace. Vous pourrez ensuite produire un rapport sur ce que vous pilotez réellement ici."
                              : "Créez une liste ou un espace directement dans ce workspace. Vous pourrez ensuite produire un rapport sur ce que vous pilotez réellement ici."}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface/70 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-theme-muted">Pourquoi cette règle ?</p>
                        <p className="mt-2 text-xs font-medium leading-relaxed text-theme-muted">
                          Le rapport doit être rattaché à une responsabilité concrète. Tant que vous n’avez créé aucun élément direct dans cette ressource, il n’y a pas encore de périmètre de travail à rapporter au créateur.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 flex gap-4 relative">
                      <ShieldAlert className="h-6 w-6 text-orange-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-orange-500 mb-2 tracking-widest">Accès restreint</p>
                        <p className="text-[11px] text-theme-muted leading-relaxed font-medium">
                          {listeId
                            ? 'Seuls les administrateurs directs ou les membres directs ayant une tâche assignée peuvent émettre un rapport.'
                            : espaceId
                              ? "Seuls les administrateurs directs ayant créé au moins une liste ou un sous-espace direct dans cet espace peuvent émettre un rapport."
                              : "Seuls les administrateurs directs ayant créé au moins une liste ou un espace direct dans ce workspace peuvent émettre un rapport."}
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-5 relative">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Objet du rapport</label>
                      <input
                        value={reportForm.titre}
                        onChange={e => setReportForm(prev => ({ ...prev, titre: e.target.value }))}
                        placeholder="Rapport Hebdomadaire..."
                        className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main placeholder:text-theme-muted/30 focus:ring-2 focus:ring-secondary/20 outline-none transition-all font-bold shadow-inner"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Ce que vous avez réalisé</label>
                      <textarea
                        value={reportForm.realisations}
                        onChange={e => setReportForm(prev => ({ ...prev, realisations: e.target.value }))}
                        placeholder="Quels ont été vos accomplissements ?"
                        className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all font-medium h-40 resize-none shadow-inner"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Difficultés & Solutions</label>
                      <textarea
                        value={reportForm.difficultes_et_solutions}
                        onChange={e => setReportForm(prev => ({ ...prev, difficultes_et_solutions: e.target.value }))}
                        placeholder="Obstacles rencontrés..."
                        className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all font-medium h-32 resize-none shadow-inner"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Période début</label>
                        <input
                          type="date"
                          value={reportForm.periode_debut}
                          onChange={e => setReportForm(prev => ({ ...prev, periode_debut: e.target.value }))}
                          className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-4 py-3 text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Période fin</label>
                        <input
                          type="date"
                          value={reportForm.periode_fin}
                          onChange={e => setReportForm(prev => ({ ...prev, periode_fin: e.target.value }))}
                          className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-4 py-3 text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold"
                          required
                        />
                      </div>
                    </div>

                    <Button onClick={handleCreateReport} disabled={loading || !reportForm.titre.trim() || !reportForm.periode_debut || !reportForm.periode_fin} className="w-full py-7 rounded-2xl shadow-theme-lg group relative overflow-hidden">
                      <Upload className="h-5 w-5 mr-2 group-hover:-translate-y-1 transition-transform" />
                      <span className="font-black uppercase tracking-widest text-xs">Transmettre le rapport</span>
                    </Button>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          <div className={`${useFullReportWidth ? 'w-full' : 'lg:col-span-8'} space-y-8`}>
            {canShowOwnReportHistory && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-secondary rounded-full" />
                    <h4 className="text-xs font-black text-theme-main uppercase tracking-[0.2em]">Votre Historique</h4>
                  </div>
                  <span className="text-[10px] font-black uppercase text-theme-muted/50 tracking-widest">{ownReports.length} rapports</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {ownReports.length === 0 ? (
                      <div className="md:col-span-2 py-12 text-center opacity-30 border-2 border-dashed border-white/5 rounded-3xl">
                        <FileText className="h-10 w-10 mx-auto mb-3 text-theme-muted" />
                        <p className="font-black text-[10px] uppercase tracking-widest">Aucun historique</p>
                      </div>
                    ) : (
                      ownReports.map((report, i) => (
                        <motion.div key={report.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                          <GlassCard className="p-6 group hover:bg-white/5 transition-all border-white/5 cursor-pointer h-full flex flex-col justify-between" onClick={() => setSelectedReport(report)}>
                            <div>
                              <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-secondary/10 border border-secondary/20 rounded-xl text-secondary">
                                  <FileText size={18} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); startEditReport(report); }} className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all"><Edit size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteReport(report); }} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                                </div>
                              </div>
                              <h5 className="font-black text-theme-main text-sm mb-1 line-clamp-1">{report.titre}</h5>
                              <p className="text-[10px] font-black text-theme-muted/40 uppercase tracking-widest mb-4">{formatDate(report.created_at)}</p>
                              <p className="text-xs text-theme-muted line-clamp-3 font-medium leading-relaxed mb-6">{report.realisations}</p>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-theme-border-subtle">
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-secondary/20 flex items-center justify-center text-[8px] font-black text-secondary">MOI</div>
                              </div>
                              <Download size={14} className="text-theme-muted group-hover:text-secondary transition-colors" />
                            </div>
                          </GlassCard>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {canReceiveReports && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-primary rounded-full" />
                    <h4 className="text-xs font-black text-theme-main uppercase tracking-[0.2em]">Rapports reçus</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase text-theme-muted/50 tracking-widest">{accessibleReports.length} reçus</span>
                    <button onClick={() => setIsReportArchiveOpen(true)} className="flex items-center gap-2 text-[10px] font-black uppercase text-secondary tracking-widest hover:brightness-125 transition-all">
                      <Archive size={14} /> Archives
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {accessibleReports.length === 0 ? (
                      <div className="md:col-span-2 py-12 text-center opacity-30 border-2 border-dashed border-white/5 rounded-3xl">
                        <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-theme-muted" />
                        <p className="font-black text-[10px] uppercase tracking-widest">Aucun rapport reçu</p>
                      </div>
                    ) : (
                      accessibleReports.map((report, i) => (
                        <motion.div key={report.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                          <GlassCard className="p-6 group hover:bg-white/5 transition-all border-white/5 cursor-pointer h-full flex flex-col justify-between" onClick={() => setSelectedReport(report)}>
                            <div>
                              <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                                  <FileText size={18} />
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); archiveReport(report.id); }}
                                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-amber-500/10 text-amber-500 rounded-lg transition-all"
                                  title="Archiver"
                                >
                                  <Archive size={14} />
                                </button>
                              </div>
                              <h5 className="font-black text-theme-main text-sm mb-1 line-clamp-1">{report.titre}</h5>
                              <p className="text-[10px] font-black text-theme-muted/40 uppercase tracking-widest mb-4">{formatDate(report.created_at)} · {report.authorName}</p>
                              <p className="text-xs text-theme-muted line-clamp-3 font-medium leading-relaxed mb-6">{report.realisations}</p>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-theme-border-subtle">
                              <div className="flex items-center gap-2">
                                <MemberAvatar
                                  member={(members.find(m => m.id === report.id_membre) || { username: report.authorName }) as any}
                                  size="xs"
                                />
                                <span className="text-[10px] font-black text-theme-main uppercase tracking-tight">{report.authorName}</span>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); printReport(report); }} className="hover:scale-110 transition-transform">
                                <Download size={16} className="text-theme-muted" />
                              </button>
                            </div>
                          </GlassCard>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTool === 'absences' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-theme-main uppercase tracking-widest">Absences & Congés</h3>
            {canCreateAbsence && (
              <Button
                onClick={() => setIsAbsentModalOpen(true)}
                className="rounded-2xl bg-secondary px-6 py-3 shadow-premium-lg group hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={20} className="mr-2 group-hover:rotate-90 transition-transform" />
                <span className="font-black uppercase tracking-widest text-[10px]">Demander / Signaler</span>
              </Button>
            )}
          </div>

          {isManager && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Indisponibles aujourd'hui", value: absenceDashboard.unavailableToday, tone: 'text-rose-500', icon: Users },
                { label: 'Demandes en attente', value: absenceDashboard.pending, tone: 'text-amber-500', icon: AlertTriangle },
                { label: 'Absences à venir', value: absenceDashboard.upcoming, tone: 'text-primary', icon: Calendar },
                ...(listeId
                  ? [{ label: 'Tâches impactées', value: absenceDashboard.impactedTasks, tone: 'text-secondary', icon: FileText }]
                  : [{ label: 'Projets impactés', value: absenceDashboard.impactedProjectsCount, tone: 'text-secondary', icon: FileText }]
                ),
              ].map(item => (
                <GlassCard key={item.label} className="p-5 border-theme-border-subtle bg-theme-surface/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-theme-muted">{item.label}</p>
                      <p className={`mt-3 text-3xl font-black ${item.tone}`}>{item.value}</p>
                    </div>
                    <div className="h-11 w-11 rounded-2xl bg-theme-surface-hover/70 border border-theme-border-subtle flex items-center justify-center">
                      <item.icon className={`h-5 w-5 ${item.tone}`} />
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-theme-border-subtle bg-theme-surface/50 p-1 shadow-theme-sm">
            {[
              ...(canViewOwnAbsenceRequests ? [{ id: 'mine', label: 'Mes demandes' }] : []),
              ...(isManager && (isDirectResourceCreator || (isDirectResourceAdmin && (listAvailability.find(a => a.id_utilisateur === currentUserId)?.is_available !== false))) ? [{ id: 'pending', label: `À traiter (${pendingAbsences.length})` }] : []),
              ...(isManager ? [{ id: 'calendar', label: 'Calendrier' }] : []),
              ...(isManager ? [{ id: 'impact', label: 'Impact' }] : []),
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAbsenceView(tab.id as typeof absenceView)}
                className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${absenceView === tab.id ? 'bg-primary/10 text-primary shadow-inner' : 'text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main'}`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => setIsAbsenceArchiveOpen(true)}
              className="ml-auto flex items-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-widest hover:bg-secondary/10 transition-all"
            >
              <Archive size={14} /> Archives
            </button>
          </div>

          <Modal isOpen={isAbsentModalOpen} onClose={() => setIsAbsentModalOpen(false)} title="Signaler une Absence ou Demander un Congé" size="lg">
            <div className="pt-2">
              <div className="flex items-center gap-4 mb-8 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="p-3 bg-primary rounded-xl text-white shadow-lg">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Formulaire de demande</p>
                  <p className="text-xs font-medium text-theme-muted mt-1">Veuillez renseigner vos dates et le motif pour validation.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Nature de la demande</label>
                  <div className="flex gap-2 p-1 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl">
                    <button
                      onClick={() => setAbsenceForm(prev => ({ ...prev, is_absence: true, is_conge_planifie: false }))}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${absenceForm.is_absence ? 'bg-amber-500 text-white shadow-lg' : 'text-theme-muted hover:text-theme-main'}`}
                    >
                      Absence
                    </button>
                    <button
                      onClick={() => setAbsenceForm(prev => ({ ...prev, is_absence: false, is_conge_planifie: true }))}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!absenceForm.is_absence ? 'bg-primary text-white shadow-lg' : 'text-theme-muted hover:text-theme-main'}`}
                    >
                      Congé
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Motif / Justification</label>
                  <input
                    value={absenceForm.motif}
                    onChange={e => setAbsenceForm(prev => ({ ...prev, motif: e.target.value }))}
                    placeholder={absenceForm.is_absence ? "Maladie, urgence..." : "Repos, personnel..."}
                    className="w-full h-14 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Date de début</label>
                  <input
                    type="date"
                    value={absenceForm.date_debut}
                    onChange={e => setAbsenceForm(prev => ({ ...prev, date_debut: e.target.value }))}
                    className="w-full h-14 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Date de fin</label>
                  <input
                    type="date"
                    value={absenceForm.date_fin}
                    onChange={e => setAbsenceForm(prev => ({ ...prev, date_fin: e.target.value }))}
                    className="w-full h-14 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <Button variant="outline" onClick={() => setIsAbsentModalOpen(false)} className="flex-1 h-14 rounded-2xl border-theme-border-subtle text-theme-muted font-black uppercase tracking-widest text-[10px]">Annuler</Button>
                <Button
                  onClick={handleCreateAbsence}
                  disabled={loading || !absenceForm.date_debut}
                  className={`flex-1 h-14 rounded-2xl shadow-premium-lg group ${absenceForm.is_absence ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                >
                  <Check size={20} className="mr-2 group-hover:scale-125 transition-transform" />
                  <span className="font-black uppercase tracking-widest text-[10px]">{absenceForm.is_absence ? 'Signaler l\'absence' : 'Demander le congé'}</span>
                </Button>
              </div>
            </div>
          </Modal>

          {absenceView === 'mine' && renderAbsenceList(ownAbsences, 'Aucune demande personnelle')}
          {absenceView === 'pending' && renderAbsenceList(pendingAbsences, 'Aucune demande à traiter')}
          {absenceView === 'impact' && renderImpactPanel()}
          {absenceView === 'calendar' && (
            <div className="space-y-3">
              {calendarAbsences.filter(a => a && a.statut === 'approuvee').length === 0 ? (
                <div className="py-16 text-center opacity-30 border-2 border-dashed border-theme-border-subtle rounded-3xl bg-theme-surface-hover/20">
                  <Calendar className="h-10 w-10 mx-auto mb-3 text-theme-muted" />
                  <p className="font-black text-[10px] uppercase tracking-widest">Calendrier vide</p>
                </div>
              ) : (
                calendarAbsences.filter(a => a && a.statut === 'approuvee').map(absence => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const start = new Date(absence.date_debut);
                  const end = absence.date_fin ? new Date(absence.date_fin) : new Date(absence.date_debut);
                  start.setHours(0, 0, 0, 0);
                  end.setHours(0, 0, 0, 0);
                  const isCurrent = today >= start && today <= end;
                  
                  // ✅ Calcul dynamique du nombre de jours
                  const durationDisplay = getDurationDisplay(absence.date_debut, absence.date_fin);

                  return (
                    <GlassCard key={absence.id} className={`p-4 border-theme-border-subtle bg-theme-surface/70 ${isCurrent ? 'ring-2 ring-emerald-500/30 bg-emerald-500/5' : ''}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${absence.is_absence ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                            {absence.is_absence ? <AlertTriangle className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <AvailabilityBadge availability={listAvailability.find(avail => avail.id_utilisateur === absence.owner_user_id)} />
                              <p className="text-sm font-black text-theme-main truncate">{absence.authorName}</p>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black uppercase tracking-tighter animate-pulse">
                                  En cours
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-theme-muted">
                              {absence.is_absence ? 'Absence' : 'Congé'} · {durationDisplay}
                            </p>
                            {absence.decision_by_name && (
                              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                Approuvé par {absence.decision_by_name}
                              </p>
                            )}
                            {absence.motif && (
                              <p className="mt-1 text-[10px] text-theme-muted/60 italic line-clamp-1">"{absence.motif}"</p>
                            )}
                          </div>
                        </div>
                        <div className="text-xs font-black text-theme-main bg-theme-surface-hover/50 px-3 py-1.5 rounded-xl border border-theme-border-subtle whitespace-nowrap">
                          {formatDate(absence.date_debut)} → {formatDate(absence.date_fin || absence.date_debut)}
                        </div>
                      </div>
                    </GlassCard>
                  );
                })
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Modale de Détails du Rapport */}
      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title="Détails du Document" size="lg">
        {selectedReport && (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between p-6 rounded-3xl bg-theme-surface/50 border border-theme-border-subtle shadow-inner">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/20 rounded-2xl text-secondary shadow-[0_0_20px_rgba(var(--secondary-rgb),0.2)]">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-theme-main tracking-tight line-clamp-1">{selectedReport.titre}</h3>
                  <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest mt-1">Émis par {selectedReport.authorName} le {formatDate(selectedReport.created_at)}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => printReport(selectedReport)} className="rounded-xl border-theme-border-subtle px-4 text-theme-main hover:bg-theme-surface-hover transition-all">
                <Download className="h-4 w-4 mr-2" /> PDF
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="p-6 bg-theme-surface-hover/20 border border-theme-border-subtle rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-all text-secondary"><CheckCircle2 size={60} /></div>
                <p className="text-[10px] font-black text-secondary uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-secondary" /> I. Réalisations
                </p>
                <div className="bg-theme-surface/30 p-5 rounded-2xl border border-theme-border-subtle shadow-inner">
                  <p className="text-sm text-theme-main font-medium leading-relaxed whitespace-pre-wrap">{selectedReport.realisations || 'Aucune réalisation renseignée.'}</p>
                </div>
              </div>

              {selectedReport.difficultes_et_solutions && (
                <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-all text-red-500"><AlertTriangle size={60} /></div>
                  <p className="text-[10px] font-black text-red-500 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" /> II. Difficultés & Solutions
                  </p>
                  <div className="bg-theme-surface/30 p-5 rounded-2xl border border-theme-border-subtle shadow-inner">
                    <p className="text-sm text-theme-muted font-medium leading-relaxed whitespace-pre-wrap">{selectedReport.difficultes_et_solutions}</p>
                  </div>
                </div>
              )}

              {selectedReport.commentaire && (
                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-all text-blue-500"><Info size={60} /></div>
                  <p className="text-[10px] font-black text-blue-500 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> III. Commentaires
                  </p>
                  <div className="bg-theme-surface/30 p-5 rounded-2xl border border-theme-border-subtle shadow-inner text-blue-400">
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap italic">{selectedReport.commentaire}</p>
                  </div>
                </div>
              )}
            </div>

            {selectedReport.owner_user_id === currentUserId && (
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => startEditReport(selectedReport)} className="flex-1 h-14 rounded-2xl border-theme-border-subtle font-black uppercase tracking-widest text-[10px] hover:bg-theme-surface-hover text-theme-main transition-all">
                  <Edit className="h-4 w-4 mr-2" /> Modifier
                </Button>
                <Button variant="outline" className="flex-1 h-14 rounded-2xl border-red-500/20 text-red-500 hover:bg-red-500/10 font-black uppercase tracking-widest text-[10px] transition-all" onClick={() => handleDeleteReport(selectedReport)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modale d'Édition */}
      <Modal isOpen={!!editingReport} onClose={() => setEditingReport(null)} title="Révision du Rapport" size="lg">
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Titre du rapport</label>
            <input
              value={reportEditForm.titre}
              onChange={e => setReportEditForm(prev => ({ ...prev, titre: e.target.value }))}
              placeholder="Rectifier le titre..."
              className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all placeholder:text-theme-muted/30 shadow-inner"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Contenu des réalisations</label>
            <textarea
              value={reportEditForm.realisations}
              onChange={e => setReportEditForm(prev => ({ ...prev, realisations: e.target.value }))}
              placeholder="Décrivez vos accomplissements..."
              className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-medium h-48 resize-none transition-all custom-scrollbar shadow-inner shadow-black/10"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Difficultés rencontrées</label>
              <textarea
                value={reportEditForm.difficultes_et_solutions}
                onChange={e => setReportEditForm(prev => ({ ...prev, difficultes_et_solutions: e.target.value }))}
                placeholder="Obstacles et solutions..."
                className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-medium h-32 resize-none transition-all shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Commentaires finaux</label>
              <textarea
                value={reportEditForm.commentaire}
                onChange={e => setReportEditForm(prev => ({ ...prev, commentaire: e.target.value }))}
                placeholder="Notes additionnelles..."
                className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-medium h-32 resize-none transition-all shadow-inner"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Période début</label>
              <input
                type="date"
                value={reportEditForm.periode_debut}
                onChange={e => setReportEditForm(prev => ({ ...prev, periode_debut: e.target.value }))}
                className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-4 py-3 text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Période fin</label>
              <input
                type="date"
                value={reportEditForm.periode_fin}
                onChange={e => setReportEditForm(prev => ({ ...prev, periode_fin: e.target.value }))}
                className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-4 py-3 text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold"
              />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={() => setEditingReport(null)} className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] border-theme-border-subtle text-theme-muted hover:text-theme-main transition-all">Annuler</Button>
            <Button onClick={handleUpdateReport} disabled={loading || !reportEditForm.titre.trim()} className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-theme-md transition-all">Enregistrer les modifications</Button>
          </div>
        </div>
      </Modal>

      {/* Modales d'Archives */}
      <Modal isOpen={isReportArchiveOpen} onClose={() => setIsReportArchiveOpen(false)} title="Coffre-fort des Rapports" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-3 custom-scrollbar pt-2">
          {archivedReports.length === 0 ? (
            <div className="py-20 text-center opacity-30 border-2 border-dashed border-theme-border-subtle rounded-3xl bg-theme-surface-hover/20">
              <Archive className="h-12 w-12 mx-auto mb-4 text-theme-muted" />
              <p className="font-black text-xs uppercase tracking-widest">Archives vides</p>
            </div>
          ) : (
            archivedReports.map(report => (
              <GlassCard key={report.id} className="p-5 flex items-center justify-between gap-6 border-theme-border-subtle hover:bg-theme-surface-hover/40 transition-all group/archive">
                <button onClick={() => { setSelectedReport(report); setIsReportArchiveOpen(false); }} className="text-left min-w-0 flex-1">
                  <p className="font-black text-sm text-theme-main truncate mb-1 group-hover/archive:text-secondary transition-colors">{report.titre}</p>
                  <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">{report.authorName} · {formatDate(report.created_at)}</p>
                </button>
                <Button variant="outline" size="sm" onClick={() => unarchiveReport(report.id)} className="rounded-xl border-theme-border-subtle font-black uppercase text-[9px] tracking-widest px-4 hover:bg-theme-surface-hover shadow-theme-sm transition-all text-theme-main">
                  Désarchiver
                </Button>
              </GlassCard>
            ))
          )}
        </div>
      </Modal>

      <Modal isOpen={isAbsenceArchiveOpen} onClose={() => setIsAbsenceArchiveOpen(false)} title="Archives des Demandes" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-3 custom-scrollbar pt-2">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Archivées', value: archivedAbsences.length },
              { label: 'Approuvées', value: archivedAbsences.filter(a => a.statut === 'approuvee').length },
              { label: 'Rejetées', value: archivedAbsences.filter(a => a.statut === 'rejetee').length },
            ].map(item => (
              <div key={item.label} className="rounded-2xl border border-theme-border-subtle bg-theme-surface/70 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted">{item.label}</p>
                <p className="mt-2 text-2xl font-black text-theme-main">{item.value}</p>
              </div>
            ))}
          </div>
          {archivedAbsences.length === 0 ? (
            <div className="py-20 text-center opacity-30 border-2 border-dashed border-theme-border-subtle rounded-3xl">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-theme-muted" />
              <p className="font-black text-xs uppercase tracking-widest">Aucune demande archivée</p>
              <p className="mt-2 text-xs font-medium text-theme-muted">Les demandes traitées que vous archivez seront rangées ici.</p>
            </div>
          ) : (
            archivedAbsences.map(absence => renderAbsenceCard(absence, 'archive'))
          )}
        </div>
      </Modal>

      <Modal isOpen={!!selectedAbsenceForImpact} onClose={() => setSelectedAbsenceForImpact(null)} title="Analyse d'Impact de l'Absence" size="lg">
        {loading ? (
          <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-secondary" /></div>
        ) : (selectedAbsenceForImpact && absenceImpacts[selectedAbsenceForImpact.id]) ? (() => {
          const impactData = absenceImpacts[selectedAbsenceForImpact.id];
          const isOwn = selectedAbsenceForImpact.owner_user_id === currentUserId;
          const isPendingAdminRequest = selectedAbsenceForImpact.statut === 'en_attente'
            && selectedAbsenceForImpact.author_role === ROLES.ADMIN
            && isDirectResourceCreator
            && !isOwn;

          const needsBackupAdmin = isPendingAdminRequest &&
            impactData.sole_admin_resources && impactData.sole_admin_resources.length > 0;

          return (
            <div className="space-y-6">
              <div className={`border rounded-2xl p-4 flex gap-4 ${impactData.risk_level === 'eleve' ? 'bg-red-500/5 border-red-500/10' : impactData.risk_level === 'moyen' ? 'bg-amber-500/5 border-amber-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                <AlertTriangle className={`h-6 w-6 shrink-0 ${impactData.risk_level === 'eleve' ? 'text-red-500' : impactData.risk_level === 'moyen' ? 'text-amber-500' : 'text-emerald-500'}`} />
                <div>
                  <p className="text-xs font-black text-theme-main uppercase tracking-widest mb-1">Risque {impactData.risk_level || 'faible'}</p>
                  <p className="text-[11px] text-theme-muted leading-relaxed">
                    Cette absence chevauche {impactData.overlapping_tasks.length} tâches. ({impactData.high_priority_tasks.length} prioritaires, {impactData.overdue_tasks.length} en retard).
                  </p>
                  {(impactData.approved_absences_last_3_months !== undefined || impactData.approved_days_last_3_months !== undefined) && (
                    <p className="mt-2 text-[11px] text-theme-muted font-bold bg-theme-surface-hover/30 p-2 rounded-lg border border-theme-border-subtle/50">
                      Historique récent (90J) : <span className="font-black text-theme-main">{impactData.approved_absences_last_3_months || 0}</span> absence(s) approuvée(s) (<span className="font-black text-theme-main">{impactData.approved_days_last_3_months || 0}</span> jours cumulés).
                    </p>
                  )}
                  {impactData.risk_reasons && impactData.risk_reasons.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[9px] font-black text-theme-muted uppercase tracking-widest">Facteurs de risque :</p>
                      <ul className="list-disc pl-4 text-[10px] text-theme-muted space-y-0.5">
                        {impactData.risk_reasons.map((reason: string, idx: number) => (
                          <li key={idx} className="font-medium">{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {impactData.recommendation && (
                    <p className="mt-3 text-xs font-bold text-theme-main">{impactData.recommendation}</p>
                  )}
                </div>
              </div>

              {(impactData.sole_admin_resources?.length > 0 || impactData.sole_creator_resources?.length > 0) && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Alerte Gouvernance Critique</p>

                  {impactData.sole_admin_resources?.map((res: any) => (
                    <div key={res.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-theme-main">Admin Unique : {res.nom}</p>
                        <p className="text-[11px] text-theme-muted">
                          {res.type === 'liste' ? 'Cette liste' : 'Ce sous-espace'} n'aura plus d'admin actif durant l'absence.
                        </p>
                      </div>
                    </div>
                  ))}

                  {impactData.sole_creator_resources?.map((res: any) => (
                    <div key={res.id} className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-theme-main">Créateur Unique : {res.nom}</p>
                        <p className="text-[11px] text-theme-muted">
                          {res.type === 'liste' ? 'Cette liste' : 'Ce sous-espace'} n'aura plus de créateur direct actif.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isPendingAdminRequest && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Gouvernance Directe</p>
                  </div>

                  {!needsBackupAdmin ? (
                    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                      <div className="flex items-start gap-4">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-black text-theme-main">Continuité assurée</p>
                          <p className="mt-1 text-xs text-theme-muted leading-relaxed">
                            La ressource possède d'autres administrateurs disponibles sur cette période.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
                      <div className="flex items-start gap-4">
                        <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-black text-theme-main">Impact Gouvernance Critique</p>
                          <p className="mt-1 text-xs text-theme-muted leading-relaxed font-medium">
                            Cet administrateur est le seul disponible. Son absence laisserait la ressource sans supervision directe.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {needsBackupAdmin && (
                    <div className="mt-4 rounded-3xl border border-secondary/20 bg-secondary/5 p-5">
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-secondary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-theme-main">Ajouter un admin de secours</p>
                          <div className="mt-4 grid grid-cols-1 gap-3">
                            <select
                              value={adminCandidateUserId}
                              onChange={e => {
                                setAdminCandidateUserId(e.target.value);
                                if (e.target.value) setAdminInviteIdentifier('');
                              }}
                              className="h-10 rounded-xl border border-theme-border-subtle bg-theme-surface px-4 text-xs font-bold text-theme-main outline-none"
                            >
                              <option value="">Membre par héritage</option>
                              {eligibleInheritedMembers.map(member => (
                                <option key={member.id_utilisateur} value={member.id_utilisateur}>
                                  {member.name}
                                </option>
                              ))}
                            </select>
                            <input
                              value={adminInviteIdentifier}
                              onChange={e => {
                                setAdminInviteIdentifier(e.target.value);
                                if (e.target.value.trim()) setAdminCandidateUserId('');
                              }}
                              placeholder="Ou email / username"
                              className="h-10 rounded-xl border border-theme-border-subtle bg-theme-surface px-4 text-xs font-bold text-theme-main outline-none"
                            />
                            <Button
                              onClick={handleAddBackupAdmin}
                              disabled={loading || (!adminCandidateUserId && !adminInviteIdentifier.trim())}
                              className="h-10 rounded-xl bg-secondary text-[10px] font-black uppercase"
                            >
                              Ajouter admin
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedAbsenceForImpact.author_role === ROLES.MEMBER && impactData.overlapping_tasks.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Tâches impactées & Réaffectation</p>
                  <div className="space-y-4">
                    {impactData.overlapping_tasks.map((t: any) => {
                      const task = taskById.get(t.id);
                      if (!task) return null;
                      const candidates = getTaskReplacementCandidates(task, selectedAbsenceForImpact);

                      return (
                        <div key={task.id} className="p-4 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="min-w-0">
                              <Link to={`/tache/${task.id}`} className="text-sm font-black text-theme-main truncate hover:text-secondary hover:underline flex items-center gap-2">
                                {task.title}
                                <Eye size={12} className="shrink-0" />
                              </Link>
                              <p className="text-[9px] text-theme-muted uppercase font-black mt-1">
                                Échéance: {formatDate(task.dueDate)} · {task.priority}
                              </p>
                            </div>
                            <div className="flex -space-x-2">
                              {task.assignees?.map(a => (
                                <div key={a.id} className="h-6 w-6 rounded-lg bg-theme-surface border border-theme-border-subtle flex items-center justify-center text-[8px] font-black" title={a.name}>
                                  {a.name.substring(0, 2).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 pt-2">
                            {availabilityLoading ? (
                              <div className="flex items-center gap-2 col-span-2 py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                                <span className="text-xs text-theme-muted">Vérification des disponibilités...</span>
                              </div>
                            ) : (
                              <>
                                <select
                                  value={taskReplacementByTaskId[task.id] || ''}
                                  onChange={e => setTaskReplacementByTaskId(prev => ({ ...prev, [task.id]: e.target.value }))}
                                  className="h-10 rounded-xl border border-theme-border-subtle bg-theme-surface px-4 text-[11px] font-bold text-theme-main outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
                                >
                                  <option value="">Remplaçant / Renfort...</option>
                                  {getSortedReplacementCandidates(task, selectedAbsenceForImpact).map(candidate => (
                                    <option 
                                      key={candidate.id_utilisateur} 
                                      value={candidate.id_utilisateur}
                                      disabled={!candidate.isAvailable}
                                      className={!candidate.isAvailable ? 'text-theme-muted/50' : ''}
                                    >
                                      {candidate.name} 
                                      {candidate.isAvailable 
                                        ? ' ✅ Disponible' 
                                        : ` ⚠️ Absent(e)`
                                      }
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  onClick={() => handleAssignTaskReplacement(task, selectedAbsenceForImpact)}
                                  disabled={loading || !taskReplacementByTaskId[task.id]}
                                  className="h-10 rounded-xl bg-secondary px-4 text-[9px] font-black uppercase tracking-widest"
                                >
                                  {(() => {
                                    const candidates = getSortedReplacementCandidates(task, selectedAbsenceForImpact);
                                    const availableCount = candidates.filter(c => c.isAvailable).length;
                                    
                                    if (candidates.length === 0) {
                                      return 'Aucun membre';
                                    }
                                    if (availableCount === 0) {
                                      return 'Tous indisponibles';
                                    }
                                    return 'Assigner';
                                  })()}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {impactData.conflicting_absences.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Conflits d'absences (Même période)</p>
                  <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                    {impactData.conflicting_absences.map((a: any) => (
                      <p key={a.id} className="text-xs text-rose-600 font-medium">Déjà une demande {a.statut} du {formatDate(a.date_debut)} au {formatDate(a.date_fin)}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setSelectedAbsenceForImpact(null)} className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase">Fermer</Button>
              </div>
            </div>
          );
        })() : null}
      </Modal>

      {/* ✅ NOUVELLE NOTIFICATION : Aucun remplaçant disponible */}
      <Modal
        isOpen={showNoReplacementNotification}
        onClose={() => {
          setShowNoReplacementNotification(false);
          setNoReplacementTaskId(null);
        }}
        title="👥 Aucun remplaçant disponible"
        size="lg"
      >
        <div className="space-y-6 pt-2">
          {/* Message principal */}
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
                <Users size={24} />
              </div>
              <div>
                <h4 className="text-base font-black text-theme-main">Aucun membre disponible pour remplacer</h4>
                <p className="mt-1 text-sm text-theme-muted leading-relaxed">
                  Tous les membres de votre équipe sont déjà en absence ou en congé sur cette période.
                  Pour assurer la continuité du travail, nous vous recommandons d'ajouter de nouveaux collaborateurs à ce projet.
                </p>
              </div>
            </div>
          </div>

          {/* Actions recommandées */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-muted">Actions recommandées</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Option 1 : Inviter un nouveau membre */}
              <button
                onClick={() => {
                  setShowNoReplacementNotification(false);
                  // ✅ Ouvrir la modale d'invitation de la liste
                  if (listeId) {
                    toast.info('Vous pouvez inviter un nouveau membre via le bouton "Membres" de la liste.');
                  }
                  setNoReplacementTaskId(null);
                }}
                className="p-5 rounded-2xl border border-secondary/20 bg-secondary/5 hover:bg-secondary/10 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                    <Plus size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-theme-main">Inviter un nouveau membre</p>
                    <p className="text-[10px] text-theme-muted font-medium">Ajouter un collaborateur à la liste</p>
                  </div>
                </div>
              </button>

              {/* Option 2 : Voir les membres hérités */}
              {inheritedMembers.length > 0 && (
                <button
                  onClick={() => {
                    setShowNoReplacementNotification(false);
                    toast.info(`Vous avez ${inheritedMembers.length} membre(s) hérité(s) du workspace/espace parent.`);
                    setNoReplacementTaskId(null);
                  }}
                  className="p-5 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-theme-main">Membres hérités disponibles</p>
                      <p className="text-[10px] text-theme-muted font-medium">
                        {inheritedMembers.length} membre(s) du parent
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* Option 3 : Reporter la tâche */}
              <button
                onClick={() => {
                  setShowNoReplacementNotification(false);
                  const task = noReplacementTaskId ? taskById.get(noReplacementTaskId) : null;
                  if (task) {
                    toast.info(`Vous pouvez reporter l'échéance de "${task.title}" ou la déprioriser.`);
                  }
                  setNoReplacementTaskId(null);
                }}
                className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all text-left group md:col-span-2"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-theme-main">Reporter ou déprioriser la tâche</p>
                    <p className="text-[10px] text-theme-muted font-medium">Ajuster l'échéance en fonction de l'absence</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Conseil bonus */}
          <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface/50 p-4">
            <div className="flex items-start gap-3">
              <Info size={16} className="text-theme-muted flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-theme-muted leading-relaxed">
                <span className="font-black text-theme-main">Conseil :</span> Pour éviter ce type de situation, 
                pensez à maintenir une équipe de secours ou à former vos membres sur les compétences critiques.
              </p>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowNoReplacementNotification(false);
                setNoReplacementTaskId(null);
              }}
              className="flex-1 h-12 rounded-2xl border-theme-border-subtle text-theme-main"
            >
              Fermer
            </Button>
            {listeId && (
              <Button
                onClick={() => {
                  setShowNoReplacementNotification(false);
                  // ✅ Ouvrir la page des membres de la liste
                  window.location.href = `/liste/${listeId}/membres`;
                  setNoReplacementTaskId(null);
                }}
                className="flex-1 h-12 rounded-2xl bg-secondary shadow-premium-sm"
              >
                <Users size={18} className="mr-2" />
                Gérer les membres
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!decisionTarget}
        onClose={closeAbsenceDecision}
        title={decisionAction === 'approve' ? 'Approuver la demande' : 'Rejeter la demande'}
        size="md"
      >
        {decisionTarget && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Demande concernée</p>
              <p className="mt-2 text-sm font-black text-theme-main">{decisionTarget.authorName} · {decisionTarget.is_absence ? 'Absence' : 'Congé'}</p>
              <p className="mt-1 text-xs font-bold text-theme-muted">{formatDate(decisionTarget.date_debut)} → {formatDate(decisionTarget.date_fin)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-muted">
                {decisionAction === 'approve' ? 'Commentaire de validation' : 'Motif du rejet'}
              </label>
              <textarea
                value={decisionComment}
                onChange={event => setDecisionComment(event.target.value)}
                placeholder={decisionAction === 'approve' ? 'Ex: validé, continuité assurée...' : 'Expliquez clairement la raison du rejet...'}
                className="h-28 w-full resize-none rounded-2xl border border-theme-border-subtle bg-theme-surface/50 px-4 py-3 text-sm font-medium text-theme-main outline-none transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={closeAbsenceDecision} className="flex-1 rounded-2xl border-theme-border-subtle text-theme-main">Annuler</Button>
              <Button
                onClick={handleAbsenceDecision}
                disabled={loading || (decisionAction === 'reject' && !decisionComment.trim())}
                className={`flex-1 rounded-2xl ${decisionAction === 'reject' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {decisionAction === 'approve' ? 'Approuver' : 'Rejeter'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={closeConfirm}
        onConfirm={confirmData?.onConfirm || (() => Promise.resolve())}
        title={confirmData?.title || 'Confirmation'}
        message={confirmData?.message || 'Voulez-vous vraiment continuer ?'}
        confirmText={confirmData?.confirmText}
        confirmVariant={confirmData?.confirmVariant}
        loadingText={confirmData?.loadingText}
        isLoading={loading}
      />
    </div>
  );
}