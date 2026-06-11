import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Calendar, Check, Download, Edit, Eye, FileText, Loader2, MessageCircle, Paperclip, ShieldAlert, Trash2, Upload, Users, X, CheckCircle2, AlertTriangle, Info, Filter, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import Modal from '../../../components/ui/Modal';
import { LISTE_TACHE_BASE_URL, plannerToolsService } from '../../../services/plannerTools.service';
import { listeService } from '../../../services/liste.service';
import { absenceService } from '../../../services/absence.service';
import { espaceService } from '../../../services/espace.service';
import { workspaceService } from '../../../services/workspace.service';
import { getMemberContactLabel, getMemberDisplayName } from '../../../utils/memberDisplay';
import { ROLES } from '../../../lib/roleHierarchy';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task, UserAvailabilityOut } from '../../../types';
import { AvailabilityBadge } from '../../../components/ui/AvailabilityBadge';
import { Toast } from '../../../components/ui/Toast';

interface PlannerToolsPanelProps {
  workspaceId?: string | null;
  espaceId?: string | null;
  listeId?: string | null;
  currentUserId?: string | null;
  effectiveRole: string | null;
  tasks: Task[];
  initialTool?: 'files' | 'reports';
}

interface ListMemberRecord {
  id: string;
  id_utilisateur: string;
  name: string;
  email: string;
  role: string;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
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
  });
  const [archivedReportIds, setArchivedReportIds] = useState<string[]>([]);
  const [archivedAbsenceIds, setArchivedAbsenceIds] = useState<string[]>([]);

  const [absences, setAbsences] = useState<any[]>([]);
  const [absenceView, setAbsenceView] = useState<'new' | 'mine' | 'pending' | 'calendar' | 'impact'>('mine');
  const [absenceForm, setAbsenceForm] = useState({
    is_absence: true,
    date_debut: '',
    date_fin: '',
    motif: '',
    duree_demandee_en_jours: '',
  });
  const [impactData, setImpactData] = useState<any | null>(null);
  const [isImpactLoading, setIsImpactLoading] = useState(false);
  const [selectedAbsenceForImpact, setSelectedAbsenceForImpact] = useState<any | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<any | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [listAvailability, setListAvailability] = useState<UserAvailabilityOut[]>([]);

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
  const absenceArchiveKey = `kplanner:archived-absences:${currentUserId || 'anonymous'}:${listeId || 'global'}`;

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
  const isGuest = effectiveRole === ROLES.GUEST;
  const isManager = effectiveRole === ROLES.CREATOR || effectiveRole === ROLES.ADMIN;
  const isInheritedManager = isManager && !isDirectAdmin;
  const hasReportScope = !!(listeId || espaceId || workspaceId);
  const canViewFiles = !!(listeId || espaceId || workspaceId);

  const canViewReports = hasReportScope && (
    listeId
      ? !!isDirectMemberRecord || isManager
      : isDirectAdmin
  );
  const hasVisibleTool = canViewFiles || canViewReports || !!listeId;
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

  const canCreateAbsence = !!listeId && !!isDirectMemberRecord && isDirectMemberRecord.role !== ROLES.CREATOR;
  const canViewOwnAbsenceRequests = !isDirectResourceCreator;

  const canAddFiles = isManager;
  const fileTargetType = listeId ? 'liste' : espaceId ? 'espace' : 'workspace';
  const fileTargetId = listeId || espaceId || workspaceId || '';

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (initialTool === 'files' && canViewFiles) {
      setActiveTool(initialTool);
      return;
    }
    if (initialTool === 'reports' && canViewReports) {
      setActiveTool(initialTool);
    }
  }, [initialTool, canViewFiles, canViewReports]);

  useEffect(() => {
    if (activeTool === 'reports' && !canViewReports) {
      if (canViewFiles) {
        setActiveTool('files');
      } else if (listeId) {
        setActiveTool('absences');
      }
      return;
    }
    if (activeTool === 'files' && !canViewFiles) {
      if (canViewReports) {
        setActiveTool('reports');
      } else if (listeId) {
        setActiveTool('absences');
      }
    }
  }, [activeTool, canViewFiles, canViewReports, listeId]);

  useEffect(() => {
    if (!listeId && activeTool === 'absences') {
      setActiveTool(canViewFiles ? 'files' : 'reports');
    }
  }, [listeId, activeTool, canViewFiles]);

  useEffect(() => {
    if (activeTool !== 'absences') return;
    if (absenceView === 'mine' && !canViewOwnAbsenceRequests) {
      setAbsenceView(isManager ? 'pending' : 'calendar');
    }
    if (absenceView === 'new' && !canCreateAbsence) {
      setAbsenceView(canViewOwnAbsenceRequests ? 'mine' : isManager ? 'pending' : 'calendar');
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
    if (!workspaceId && !espaceId && !listeId) return;
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
      const direct = listeId ? listeMembers : espaceId ? espaceMembers : workspaceMembers;
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
      return allMembers;
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
    if (!listeId) return;
    try {
      const data = await absenceService.list({
        liste_id: listeId,
        limit: 100
      });
      setAbsences(Array.isArray(data) ? data : []);

      // Fetch availability for all members of the list
      const currentMembers = customMembers || members;
      const userIds = currentMembers.map(m => m.id_utilisateur).filter(Boolean);

      if (userIds.length > 0) {
        const availability = await absenceService.getAvailability(listeId, userIds);
        setListAvailability(availability);
      }
    } catch (err) {
      console.error('Failed to load absences:', err);
    }
  };

  const refreshCurrentTool = async () => {
    setLoading(true);
    try {
      const loadedMembers = await loadMembers();
      if (activeTool === 'files' && canViewFiles) await loadFiles();
      if (activeTool === 'reports') await loadReports();
      if (activeTool === 'absences') await loadAbsences(loadedMembers);
    } catch (err: any) {
      showMessage('error', err?.message || 'Impossible de charger les données.');
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
      showMessage('success', `Fichier "${file.name}" prêt à être joint.`);
    } catch (err: any) {
      showMessage('error', `Échec de l'envoi du fichier : ${err.message}`);
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
          showMessage('success', 'Fichier supprimé avec succès.');
          closeConfirm();
        } catch (err: any) {
          showMessage('error', `Erreur lors de la suppression : ${err.message}`);
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
      showMessage('error', "Échec du téléchargement.");
    }
  };

  const handleCreateFile = async () => {
    if (!canAddFiles) {
      showMessage('error', "Vous n'avez pas le droit d'ajouter un fichier à cette ressource.");
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
      showMessage('success', 'Fichier rattaché avec succès.');
    } catch (err: any) {
      showMessage('error', err?.message || "Impossible d'ajouter le fichier.");
    } finally {
      setLoading(false);
    }
  };


  const handleCreateReport = async () => {
    const currentUserMemberRecord = directMembers.find(m => m.id_utilisateur === currentUserId);

    if (!currentUserMemberRecord || !reportForm.titre.trim()) {
      showMessage('error', 'Vous devez avoir un rôle direct autorisé sur cette ressource et renseigner un titre pour envoyer un rapport.');
      return;
    }
    if (!canCreateReport) {
      showMessage(
        'error',
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
      const createdReport = await plannerToolsService.createReport({ id_membre: currentUserMemberRecord.id, ...reportForm });
      setReportForm({ titre: '', realisations: '', difficultes_et_solutions: '', commentaire: '', fichier_joint: '' });
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
      showMessage('success', 'Rapport envoyé avec succès.');
    } catch (err: any) {
      showMessage('error', err?.message || 'Impossible de créer le rapport.');
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
    });
  };

  const handleUpdateReport = async () => {
    if (!editingReport || !reportEditForm.titre.trim()) return;
    setLoading(true);
    try {
      const updated = await plannerToolsService.updateReport(editingReport.id, reportEditForm);
      setReports(prev => prev.map(report => report.id === editingReport.id ? { ...report, ...updated } : report));
      setSelectedReport((prev: any) => prev?.id === editingReport.id ? { ...prev, ...updated } : prev);
      setEditingReport(null);
      showMessage('success', 'Rapport modifié avec succès.');
    } catch (err: any) {
      showMessage('error', err?.message || 'Impossible de modifier le rapport.');
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
          showMessage('success', 'Rapport supprimé avec succès.');
        } catch (err: any) {
          showMessage('error', err?.message || 'Impossible de supprimer le rapport.');
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
    showMessage('success', 'Rapport archivé dans votre espace.');
  };

  const unarchiveReport = (reportId: string) => {
    const next = archivedReportIds.filter(id => id !== reportId);
    setArchivedReportIds(next);
    localStorage.setItem(reportArchiveKey, JSON.stringify(next));
    showMessage('success', 'Rapport restauré.');
  };

  const archiveAbsence = (absenceId: string) => {
    const next = Array.from(new Set([...archivedAbsenceIds, absenceId]));
    setArchivedAbsenceIds(next);
    localStorage.setItem(absenceArchiveKey, JSON.stringify(next));
    showMessage('success', 'Demande archivée dans votre espace.');
  };

  const unarchiveAbsence = (absenceId: string) => {
    const next = archivedAbsenceIds.filter(id => id !== absenceId);
    setArchivedAbsenceIds(next);
    localStorage.setItem(absenceArchiveKey, JSON.stringify(next));
    showMessage('success', 'Demande restaurée.');
  };

  const handleCreateAbsence = async () => {
    const currentUserMemberRecord = directMembers.find(m => m.id_utilisateur === currentUserId);
    const targetMemberId = currentUserMemberRecord?.id;

    if (!targetMemberId || !absenceForm.date_debut) {
      showMessage('error', 'Sélectionnez une date de début.');
      return;
    }

    setLoading(true);
    try {
      const typeLabel = absenceForm.is_absence ? 'Absence' : 'Congé';
      await absenceService.create({
        id_membre: targetMemberId,
        is_absence: absenceForm.is_absence,
        date_debut: new Date(absenceForm.date_debut).toISOString(),
        date_fin: absenceForm.date_fin ? new Date(absenceForm.date_fin).toISOString() : undefined,
        motif: absenceForm.motif,
        is_conge_planifie: false,
        duree_demandee_en_jours: absenceForm.duree_demandee_en_jours ? Number(absenceForm.duree_demandee_en_jours) : undefined,
      });
      setAbsenceForm({ is_absence: true, date_debut: '', date_fin: '', motif: '', duree_demandee_en_jours: '' });
      await loadAbsences();
      showMessage('success', `Demande de ${typeLabel} envoyée pour validation.`);
    } catch (err: any) {
      showMessage('error', err?.message || 'Impossible de créer la demande.');
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
      showMessage('success', decisionAction === 'approve' ? 'Demande approuvée.' : 'Demande rejetée.');
      setDecisionTarget(null);
      setDecisionAction(null);
      setDecisionComment('');
    } catch (err: any) {
      showMessage('error', err?.message || 'Action impossible.');
    } finally {
      setLoading(false);
    }
  };

  const checkImpact = async (absence: any) => {
    setSelectedAbsenceForImpact(absence);
    setIsImpactLoading(true);
    try {
      const impact = await absenceService.getImpact(absence.id);
      setImpactData(impact);
    } catch (err: any) {
      showMessage('error', 'Impossible de charger l\'impact.');
    } finally {
      setIsImpactLoading(false);
    }
  };

  const getAuthorName = (id_membre: string | null, owner_user_id?: string | null, fallback_name?: string | null) => {
    // 1. Current user shortcut
    if (owner_user_id === currentUserId || (id_membre && members.find(m => m.id === id_membre && m.id_utilisateur === currentUserId))) {
      return 'Moi';
    }

    // 2. Try resolving by owner_user_id (most reliable for inherited roles)
    if (owner_user_id) {
      const member = members.find(m => m.id_utilisateur === owner_user_id);
      if (member) return member.name;
    }

    // 3. Try resolving by id_membre (membership ID)
    if (id_membre) {
      const member = members.find(m => m.id === id_membre);
      if (member) return member.name;

      // Global map fallback
      const globalMember = (window as any)._membershipMap?.get(id_membre);
      if (globalMember) return globalMember.name;
    }

    // 4. Backend provided fallback name (very important for limited permissions)
    if (fallback_name && fallback_name !== 'inconnu') return fallback_name;

    return 'inconnu';
  };

  const renderAbsenceCard = (absence: any, context: 'list' | 'archive' = 'list') => {
    const isOwn = absence.owner_user_id === currentUserId;
    const canApproveThis = !isOwn && (
      absence.author_role === ROLES.MEMBER
        ? (isDirectResourceAdmin || (!directListHasAdmin && isDirectResourceCreator))
        : (absence.author_role === ROLES.ADMIN ? isDirectResourceCreator : false)
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
        {absence.decision_commentaire && (
          <div className="mb-6 rounded-xl border border-theme-border-subtle bg-theme-surface-hover/30 p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-theme-muted">Commentaire décision</p>
            <p className="mt-1 text-[11px] font-bold text-theme-main line-clamp-2">{absence.decision_commentaire}</p>
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

          {absence.statut === 'en_attente' && isOwn && (
            <button
              onClick={async () => {
                await absenceService.cancel(absence.id);
                await loadAbsences();
                showMessage('success', 'Demande annulée.');
              }}
              className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-black uppercase rounded-lg transition-all border border-rose-500/10"
            >
              Annuler ma demande
            </button>
          )}

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

  const absencesWithAuthors = useMemo(() => {
    return absences.map(a => ({
      ...a,
      owner_user_id: a.owner_user_id
        || members.find(m => m.id === a.id_membre)?.id_utilisateur
        || (window as any)._membershipMap?.get(a.id_membre)?.id_utilisateur
        || null,
      authorName: getAuthorName(a.id_membre, a.owner_user_id, a.owner_name),
      author_role: members.find(m => m.id === a.id_membre)?.role || 'Membre'
    }));
  }, [absences, members, currentUserId]);

  const ownAbsences = useMemo(
    () => absencesWithAuthors.filter(a => a.owner_user_id === currentUserId || a.id_membre === isDirectMemberRecord?.id),
    [absencesWithAuthors, currentUserId, isDirectMemberRecord?.id],
  );

  const accessibleAbsences = useMemo(
    () => absencesWithAuthors.filter(a => a.owner_user_id !== currentUserId && a.id_membre !== isDirectMemberRecord?.id && !archivedAbsenceIds.includes(a.id)),
    [absencesWithAuthors, archivedAbsenceIds, currentUserId, isDirectMemberRecord?.id],
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

  const absencePhaseLabel = (absence: any) => {
    if (absence.statut !== 'approuvee') {
      return absence.statut === 'en_attente' ? 'En attente' : absence.statut.replace('_', ' ');
    }
    const today = new Date();
    if (isDateInRange(today, absence.date_debut, absence.date_fin)) return 'En cours';
    if (new Date(absence.date_debut) > today) return 'À venir';
    return 'Terminée';
  };

  const pendingAbsences = useMemo(
    () => accessibleAbsences.filter(absence => absence.statut === 'en_attente'),
    [accessibleAbsences],
  );

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
        tasks.forEach(task => {
          const assignedToAbsenceOwner = task.assignees.some(assignee => assignee.id === absence.owner_user_id);
          if (assignedToAbsenceOwner && rangesOverlap(absence.date_debut, absence.date_fin, task.startDate || task.dueDate, task.dueDate)) {
            impacted.add(task.id);
          }
        });
      });
    return impacted.size;
  }, [tasks, visibleAbsences]);

  const absenceDashboard = useMemo(() => {
    const unavailableToday = listAvailability.filter(item => !item.is_available).length;
    const upcoming = visibleAbsences.filter(absence =>
      absence.statut === 'approuvee' && new Date(absence.date_debut) > new Date()
    ).length;
    return {
      unavailableToday,
      pending: pendingAbsences.length,
      upcoming,
      impactedTasks: impactedTasksForAbsences,
    };
  }, [impactedTasksForAbsences, listAvailability, pendingAbsences.length, visibleAbsences]);

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

  const reportsWithAuthors = useMemo(() => {
    return reports.map(report => ({
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
    return files.map(file => ({
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
    win.document.write(`
      <html>
        <head>
          <title>Rapport - ${safeTitle}</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
            .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
            .meta { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 10px; font-weight: 900; color: #059669; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; }
            .content { font-size: 14px; background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; white-space: pre-wrap; }
            .content.warning { background: #fff1f2; border-left-color: #f43f5e; color: #9f1239; }
            .content.note { background: #eff6ff; border-left-color: #3b82f6; color: #1d4ed8; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; display: flex; justify-content: space-between; }
            .signature { font-weight: 700; color: #059669; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="meta">Rapport d'activité</div>
              <h1 class="title">${safeTitle}</h1>
            </div>
            <div class="meta">Date: ${formatDate(report.created_at)}</div>
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
            <div>Généré par K-Planner le ${new Date().toLocaleDateString('fr-FR')}</div>
            <div>Signé: <span class="signature">${safeAuthor}</span></div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };



  return (
    <div className="space-y-8 pb-20">
      {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}

      {/* Navigation Premium */}
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

          {listeId && (
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

      {/* Filter Bar */}
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
                        {(file.owner_user_id === currentUserId || isManager) && (
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

                    <Button onClick={handleCreateReport} disabled={loading || !reportForm.titre.trim()} className="w-full py-7 rounded-2xl shadow-theme-lg group relative overflow-hidden">
                      <Upload className="h-5 w-5 mr-2 group-hover:-translate-y-1 transition-transform" />
                      <span className="font-black uppercase tracking-widest text-xs">Transmettre le rapport</span>
                    </Button>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          <div className={`${useFullReportWidth ? 'w-full' : 'lg:col-span-8'} space-y-8`}>
            {/* Mes rapports */}
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

            {/* Rapports reçus selon le circuit métier de la ressource */}
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
                                <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                                  {report.authorName.substring(0, 2).toUpperCase()}
                                </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Indisponibles aujourd'hui", value: absenceDashboard.unavailableToday, tone: 'text-rose-500', icon: Users },
              { label: 'Demandes en attente', value: absenceDashboard.pending, tone: 'text-amber-500', icon: AlertTriangle },
              { label: 'Absences à venir', value: absenceDashboard.upcoming, tone: 'text-primary', icon: Calendar },
              { label: 'Tâches impactées', value: absenceDashboard.impactedTasks, tone: 'text-secondary', icon: FileText },
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

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-theme-border-subtle bg-theme-surface/50 p-1 shadow-theme-sm">
            {[
              ...(canCreateAbsence ? [{ id: 'new', label: 'Nouvelle demande' }] : []),
              ...(canViewOwnAbsenceRequests ? [{ id: 'mine', label: 'Mes demandes' }] : []),
              ...(isManager ? [{ id: 'pending', label: `À traiter (${pendingAbsences.length})` }] : []),
              { id: 'calendar', label: 'Calendrier' },
              { id: 'impact', label: 'Impact' },
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
            {isManager && (
              <button onClick={() => setIsAbsenceArchiveOpen(true)} className="ml-auto flex items-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-widest hover:bg-secondary/10 transition-all">
                <Archive size={14} /> Archives
              </button>
            )}
          </div>

          {absenceView === 'new' && (
            <GlassCard className="p-8 border-primary/10 bg-primary/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none rotate-12">
                <Calendar size={120} className="text-primary" />
              </div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-primary rounded-xl shadow-theme-lg ring-4 ring-primary/10">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <h4 className="text-sm font-black text-theme-main uppercase tracking-widest">Nouvelle demande</h4>
              </div>

              {!canCreateAbsence ? (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex gap-4">
                  <ShieldAlert className="h-6 w-6 text-primary flex-shrink-0" />
                  <p className="text-[11px] text-theme-muted leading-relaxed font-medium">
                    {isDirectResourceCreator
                      ? "En tant que créateur de cette liste, vous n'avez pas besoin de formuler de demande d'absence ici (gestion administrative prévalente)."
                      : "Vous pourrez faire une demande dès que vous serez membre ou administrateur direct de cette liste."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative">
                  <div className="md:col-span-6 lg:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Type</label>
                    <select
                      value={absenceForm.is_absence ? 'absence' : 'conge'}
                      onChange={e => setAbsenceForm(prev => ({ ...prev, is_absence: e.target.value === 'absence' }))}
                      className="w-full h-[52px] bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold transition-all appearance-none cursor-pointer"
                    >
                      <option value="absence" className="bg-theme-surface">Absence</option>
                      <option value="conge" className="bg-theme-surface">Congé</option>
                    </select>
                  </div>
                  <div className="md:col-span-6 lg:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Début</label>
                    <input type="date" value={absenceForm.date_debut} onChange={e => setAbsenceForm(prev => ({ ...prev, date_debut: e.target.value }))} className="w-full h-[52px] bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold transition-all custom-datepicker-dark" />
                  </div>
                  <div className="md:col-span-6 lg:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Fin</label>
                    <input type="date" value={absenceForm.date_fin} onChange={e => setAbsenceForm(prev => ({ ...prev, date_fin: e.target.value }))} className="w-full h-[52px] bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold transition-all custom-datepicker-dark" />
                  </div>
                  <div className="md:col-span-12 lg:col-span-4 space-y-2">
                    <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Motif / Justification</label>
                    <input value={absenceForm.motif} onChange={e => setAbsenceForm(prev => ({ ...prev, motif: e.target.value }))} placeholder={absenceForm.is_absence ? "Ex: maladie, urgence familiale..." : "Ex: congé annuel, rendez-vous personnel..."} className="w-full h-[52px] bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold transition-all placeholder:text-theme-muted/30" />
                  </div>
                  <div className="md:col-span-12 lg:col-span-2">
                    <Button onClick={handleCreateAbsence} disabled={loading || !absenceForm.date_debut} className={`w-full h-[52px] rounded-2xl shadow-premium-lg group ${absenceForm.is_absence ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'shadow-primary/20'}`}>
                      <Check size={20} className="mr-2 group-hover:scale-125 transition-transform" />
                      <span className="font-black uppercase tracking-widest text-[10px]">{absenceForm.is_absence ? 'Signaler' : 'Demander'}</span>
                    </Button>
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          {absenceView === 'mine' && renderAbsenceList(ownAbsences, 'Aucune demande personnelle')}
          {absenceView === 'pending' && renderAbsenceList(pendingAbsences, 'Aucune demande à traiter')}
          {absenceView === 'impact' && renderAbsenceList(visibleAbsences.filter(absence => ['en_attente', 'approuvee'].includes(absence.statut)), 'Aucun impact à surveiller')}
          {absenceView === 'calendar' && (
            <div className="space-y-3">
              {calendarAbsences.length === 0 ? (
                <div className="py-16 text-center opacity-30 border-2 border-dashed border-theme-border-subtle rounded-3xl bg-theme-surface-hover/20">
                  <Calendar className="h-10 w-10 mx-auto mb-3 text-theme-muted" />
                  <p className="font-black text-[10px] uppercase tracking-widest">Calendrier vide</p>
                </div>
              ) : calendarAbsences.map(absence => (
                <GlassCard key={absence.id} className="p-4 border-theme-border-subtle bg-theme-surface/70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${absence.is_absence ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                        {absence.is_absence ? <AlertTriangle className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-theme-main truncate">{absence.authorName}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-theme-muted">{absence.is_absence ? 'Absence' : 'Congé'} · {absencePhaseLabel(absence)}</p>
                      </div>
                    </div>
                    <div className="text-xs font-black text-theme-main">
                      {formatDate(absence.date_debut)} → {formatDate(absence.date_fin)}
                    </div>
                  </div>
                </GlassCard>
              ))}
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
          {archivedAbsences.length === 0 ? (
            <div className="py-20 text-center opacity-30">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-theme-muted" />
              <p className="font-black text-xs uppercase tracking-widest">Aucune archive</p>
            </div>
          ) : (
            archivedAbsences.map(absence => renderAbsenceCard(absence, 'archive'))
          )}
        </div>
      </Modal>

      <Modal isOpen={!!selectedAbsenceForImpact} onClose={() => setSelectedAbsenceForImpact(null)} title="Analyse d'Impact de l'Absence" size="lg">
        {isImpactLoading ? (
          <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-secondary" /></div>
        ) : impactData && (
          <div className="space-y-6">
            <div className={`border rounded-2xl p-4 flex gap-4 ${impactData.risk_level === 'eleve' ? 'bg-red-500/5 border-red-500/10' : impactData.risk_level === 'moyen' ? 'bg-amber-500/5 border-amber-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
              <AlertTriangle className={`h-6 w-6 shrink-0 ${impactData.risk_level === 'eleve' ? 'text-red-500' : impactData.risk_level === 'moyen' ? 'text-amber-500' : 'text-emerald-500'}`} />
              <div>
                <p className="text-xs font-black text-theme-main uppercase tracking-widest mb-1">Risque {impactData.risk_level || 'faible'}</p>
                <p className="text-[11px] text-theme-muted leading-relaxed">
                  Cette absence chevauche {impactData.overlapping_tasks.length} tâches. ({impactData.high_priority_tasks.length} prioritaires, {impactData.overdue_tasks.length} en retard).
                </p>
                {impactData.recommendation && (
                  <p className="mt-2 text-xs font-bold text-theme-main">{impactData.recommendation}</p>
                )}
              </div>
            </div>

            {impactData.overlapping_tasks.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Tâches impactées</p>
                <div className="grid grid-cols-1 gap-2">
                  {impactData.overlapping_tasks.map((t: any) => (
                    <div key={t.id} className="p-3 bg-theme-surface/50 border border-theme-border-subtle rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-theme-main">{t.title || t.titre}</p>
                        <p className="text-[9px] text-theme-muted uppercase font-black">Échéance: {formatDate(t.dueDate || t.date_fin_prevue)}</p>
                      </div>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${t.priority === 'haute' || t.priority === 'critique' || t.priorite === 'haute' || t.priorite === 'critique' ? 'bg-red-500/10 text-red-500' : 'bg-theme-muted/10 text-theme-muted'}`}>
                        {t.priority || t.priorite || 'normal'}
                      </span>
                    </div>
                  ))}
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
        )}
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
