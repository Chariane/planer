import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Calendar, Check, Download, Edit, Eye, FileText, Loader2, Paperclip, ShieldAlert, Trash2, Upload, Users, X, CheckCircle2, AlertTriangle, Info, Filter, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import Modal from '../../../components/ui/Modal';
import { LISTE_TACHE_BASE_URL, plannerToolsService } from '../../../services/plannerTools.service';
import { listeService } from '../../../services/liste.service';
import { espaceService } from '../../../services/espace.service';
import { workspaceService } from '../../../services/workspace.service';
import { getMemberContactLabel, getMemberDisplayName } from '../../../utils/memberDisplay';
import { ROLES } from '../../../lib/roleHierarchy';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../../../types';

interface PlannerToolsPanelProps {
  workspaceId?: string | null;
  espaceId?: string | null;
  listeId?: string | null;
  currentUserId?: string | null;
  effectiveRole: string | null;
  tasks: Task[];
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
}: PlannerToolsPanelProps) {
  const [activeTool, setActiveTool] = useState<'files' | 'reports' | 'absences'>('files');
  const [members, setMembers] = useState<ListMemberRecord[]>([]);
  const [directMembers, setDirectMembers] = useState<ListMemberRecord[]>([]);
  const [inheritedMembers, setInheritedMembers] = useState<ListMemberRecord[]>([]);
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
  const [absenceForm, setAbsenceForm] = useState({
    is_absence: true,
    date_debut: '',
    date_fin: '',
    motif: '',
    duree_demandee_en_jours: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const scope = useMemo(() => ({
    workspace_id: workspaceId || undefined,
    espace_id: espaceId || undefined,
    liste_id: listeId || undefined,
  }), [workspaceId, espaceId, listeId]);
  const reportArchiveKey = `kplanner:archived-reports:${currentUserId || 'anonymous'}:${listeId || 'global'}`;
  const absenceArchiveKey = `kplanner:archived-absences:${currentUserId || 'anonymous'}:${listeId || 'global'}`;

  const isDirectMemberRecord = directMembers.find(member => member.id_utilisateur === currentUserId);
  const isDirectAdmin = isDirectMemberRecord?.role === ROLES.CREATOR || isDirectMemberRecord?.role === ROLES.ADMIN;
  const hasAssignedTask = !!currentUserId && tasks.some(task => task.assignees.some(assignee => assignee.id === currentUserId));
  const isGuest = effectiveRole === ROLES.GUEST;
  const isManager = effectiveRole === ROLES.CREATOR || effectiveRole === ROLES.ADMIN;
  const isInheritedManager = isManager && !isDirectAdmin;

  const canViewReports = !!listeId && (!!isDirectMemberRecord || isManager);
  // Rapport création : Administrateurs OU toute personne ayant une tâche assignée dans la liste.
  const canCreateReport = isDirectAdmin || hasAssignedTask;

  const canCreateAbsence = !!listeId && !!isDirectMemberRecord && (isDirectAdmin || hasAssignedTask);

  const canAddFiles = !isGuest && isManager;
  const fileTargetType = listeId ? 'liste' : espaceId ? 'espace' : 'workspace';
  const fileTargetId = listeId || espaceId || workspaceId || '';

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!listeId && activeTool !== 'files') {
      setActiveTool('files');
    }
  }, [listeId, activeTool]);

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

  // Toast Premium
  const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
        className="fixed bottom-6 right-6 z-[120]"
      >
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-theme-lg text-white min-w-[300px] glass border border-white/10 ${type === 'success' ? 'bg-emerald-500/90' : type === 'error' ? 'bg-red-500/90' : 'bg-primary/90'
          }`}>
          <div className="p-1.5 rounded-full bg-white/20">
            {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          </div>
          <span className="text-sm font-bold flex-1 tracking-tight">{message}</span>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-white/20 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );

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

      const direct = processMembers(listeRes);
      const inheritedNames = new Set(direct.map(m => m.id_utilisateur));
      const inherited = [...processMembers(espaceRes), ...processMembers(workspaceRes)]
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
    } catch (err) {
      console.error('Failed to load members', err);
    }
  };

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
    if (!listeId) return;
    try {
      const data = await plannerToolsService.listReports({
        ...(listeId ? { liste_id: listeId } : scope),
        member_id: selectedMemberId || undefined,
        limit: 100
      });
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  const loadAbsences = async () => {
    if (!listeId) return;
    try {
      const data = await plannerToolsService.listAbsences({
        ...(listeId ? { liste_id: listeId } : scope),
        member_id: selectedMemberId || undefined,
        limit: 100
      });
      setAbsences(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load absences:', err);
    }
  };

  const refreshCurrentTool = async () => {
    setLoading(true);
    try {
      await loadMembers();
      if (activeTool === 'files') await loadFiles();
      if (activeTool === 'reports') await loadReports();
      if (activeTool === 'absences') await loadAbsences();
    } catch (err: any) {
      showMessage('error', err?.message || 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCurrentTool();
  }, [activeTool, listeId, espaceId, workspaceId, selectedMemberId]);

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
      showMessage('error', 'Vous devez être membre direct de cette liste et renseigner un titre pour envoyer un rapport.');
      return;
    }
    if (!canCreateReport) {
      showMessage('error', 'Vous devez avoir au moins une tâche assignée pour envoyer un rapport.');
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

    if (!canCreateAbsence) {
      showMessage('error', "Vous devez être administrateur/créateur direct de la liste ou membre avec au moins une tâche assignée.");
      return;
    }

    setLoading(true);
    try {
      const typeLabel = absenceForm.is_absence ? 'Absence' : 'Congé';
      await plannerToolsService.createAbsence({
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

  const absencesWithAuthors = useMemo(() => {
    return absences.map(absence => ({
      ...absence,
      owner_user_id: absence.owner_user_id
        || members.find(member => member.id === absence.id_membre)?.id_utilisateur
        || (window as any)._membershipMap?.get(absence.id_membre)?.id_utilisateur
        || null,
      authorName: getAuthorName(absence.id_membre, absence.owner_user_id, absence.owner_name),
    }));
  }, [absences, members, currentUserId]);
  const ownAbsences = useMemo(
    () => absencesWithAuthors.filter(absence =>
      absence.owner_user_id === currentUserId
      || absence.id_membre === isDirectMemberRecord?.id
    ),
    [absencesWithAuthors, currentUserId, isDirectMemberRecord?.id],
  );
  const accessibleAbsences = useMemo(
    () => absencesWithAuthors.filter(absence =>
      absence.owner_user_id !== currentUserId
      && absence.id_membre !== isDirectMemberRecord?.id
      && !archivedAbsenceIds.includes(absence.id)
    ),
    [absencesWithAuthors, archivedAbsenceIds, currentUserId, isDirectMemberRecord?.id],
  );
  const archivedAbsences = useMemo(
    () => absencesWithAuthors.filter(absence => archivedAbsenceIds.includes(absence.id)),
    [absencesWithAuthors, archivedAbsenceIds],
  );
  const visibleAbsences = useMemo(
    () => (isManager ? [...ownAbsences, ...accessibleAbsences] : ownAbsences),
    [isManager, ownAbsences, accessibleAbsences],
  );

  const decideAbsence = async (absenceId: string, action: 'approve' | 'reject' | 'finish') => {
    try {
      if (action === 'approve') await plannerToolsService.approveAbsence(absenceId);
      if (action === 'reject') await plannerToolsService.rejectAbsence(absenceId);
      if (action === 'finish') await plannerToolsService.finishAbsence(absenceId);
      await loadAbsences();
    } catch (err: any) {
      showMessage('error', err?.message || 'Action impossible.');
    }
  };

  const confirmAbsenceDecision = (absence: any, action: 'approve' | 'reject') => {
    const isApprove = action === 'approve';
    setConfirmData({
      id: absence.id,
      title: isApprove ? 'Accepter la demande' : 'Rejeter la demande',
      message: `Voulez-vous vraiment ${isApprove ? 'accepter' : 'rejeter'} la demande de ${absence.authorName} ?`,
      confirmText: isApprove ? 'Accepter' : 'Rejeter',
      confirmVariant: isApprove ? 'primary' : 'danger',
      loadingText: isApprove ? 'Acceptation...' : 'Rejet...',
      onConfirm: async () => {
        await decideAbsence(absence.id, action);
        closeConfirm();
      },
    });
    setIsConfirmOpen(true);
  };

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

  const renderAbsenceCard = (absence: any, mode: 'own' | 'accessible' | 'archive') => (
    <div key={absence.id} className="border border-theme-border-subtle rounded-2xl p-4 flex items-center justify-between gap-3 bg-theme-surface shadow-theme-sm hover:shadow-theme-md transition-all">
      <div className="flex gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest ${absence.is_absence ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
          {absence.is_absence ? 'Abs' : 'Congé'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-theme-main">
              {absence.is_absence ? 'Absence' : 'Congé'} <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 opacity-50">— {absence.authorName}</span>
            </p>
            <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border ${absence.statut === 'Approuvé' || absence.statut === 'Accepté' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
              absence.statut === 'Refusé' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-theme-surface-hover/80 text-theme-muted border-theme-border-subtle'
              }`}>
              {absence.statut}
            </span>
          </div>
          <p className="text-xs text-theme-muted mt-1 font-medium">
            Du <span className="text-theme-main font-bold">{formatDate(absence.date_debut)}</span> au <span className="text-theme-main font-bold">{formatDate(absence.date_fin)}</span>
          </p>
          {absence.motif && <p className="text-[10px] text-theme-muted mt-2 font-medium italic">"{absence.motif}"</p>}
        </div>
      </div>
      {mode === 'accessible' && (() => {
        // Logique Hiérarchique : 
        // 1. Membres simples -> validés par Administrateurs Directs (ou +)
        // 2. Administrateurs Directs -> validés par Gestionnaires Hérités (Espace/Workspace)
        const authorIsAdmin = absence.author_role === ROLES.CREATOR || absence.author_role === ROLES.ADMIN;
        const canApproveThis = authorIsAdmin ? isInheritedManager : (isDirectAdmin || isInheritedManager);

        return (
          <div className="flex gap-2">
            {absence.statut === 'En attente' && canApproveThis && (
              <>
                <button onClick={() => confirmAbsenceDecision(absence, 'approve')} className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-all border border-emerald-500/10" title="Approuver"><Check className="h-4 w-4" /></button>
                <button onClick={() => confirmAbsenceDecision(absence, 'reject')} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all border border-red-500/10" title="Rejeter"><X className="h-4 w-4" /></button>
              </>
            )}
            <button onClick={() => archiveAbsence(absence.id)} className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-all border border-amber-500/10" title="Archiver">
              <Archive className="h-4 w-4" />
            </button>
          </div>
        );
      })()}
      {mode === 'archive' && (
        <Button variant="outline" size="sm" onClick={() => unarchiveAbsence(absence.id)} className="rounded-xl border-theme-border-subtle text-[10px] font-black uppercase tracking-widest">Restaurer</Button>
      )}
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}

      {/* Navigation Premium */}
      <div className="p-1 px-1 flex flex-wrap gap-1 border border-theme-border-subtle shadow-theme-md bg-theme-surface/50 backdrop-blur-xl rounded-2xl">
        <button
          onClick={() => setActiveTool('files')}
          className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl font-black transition-all duration-300 relative group overflow-hidden ${activeTool === 'files' ? 'text-secondary bg-secondary/5 shadow-inner' : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover/50'
            }`}
        >
          <Paperclip className={`h-4 w-4 transition-transform group-hover:scale-110 ${activeTool === 'files' ? 'text-secondary' : ''}`} />
          <span className="text-[10px] uppercase tracking-[0.2em]">Fichiers</span>
          {activeTool === 'files' && <motion.div layoutId="activeTool" className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary mx-4 rounded-full" />}
        </button>

        {listeId && canViewReports && (
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

      {/* Filter Bar */}
      {activeTool !== 'absences' && (
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
                <optgroup label="Membres de la liste" className="bg-theme-surface font-black uppercase text-[10px] tracking-widest">
                  {directMembers.map(member => (
                    <option key={member.id} value={member.id} className="bg-theme-surface">
                      {member.name} {member.id_utilisateur === currentUserId ? '(Moi)' : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {inheritedMembers.length > 0 && (
                <optgroup label="Héritage Gestion" className="bg-theme-surface font-black uppercase text-[10px] tracking-widest">
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

      {activeTool === 'files' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="p-6 border border-theme-border-subtle bg-theme-surface/30 backdrop-blur-xl rounded-3xl">
            <div className="flex items-center gap-2 mb-6">
              <Upload className="h-5 w-5 text-secondary" />
              <h4 className="text-[10px] font-black text-theme-main uppercase tracking-[0.2em]">Joindre un document</h4>
            </div>

            {!canAddFiles ? (
              <div className="flex items-start gap-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 text-[11px] text-theme-muted leading-relaxed font-bold">
                <ShieldAlert className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <span>Accès restreint. Seuls les administrateurs ou créateurs, directs ou par héritage, peuvent joindre des fichiers à cette ressource.</span>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`grid grid-cols-1 gap-8 ${isInheritedManager ? '' : 'lg:grid-cols-12'}`}>
          {!isInheritedManager && (
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
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 flex gap-4 relative">
                    <ShieldAlert className="h-6 w-6 text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-orange-500 mb-2 tracking-widest">Accès restreint</p>
                      <p className="text-[11px] text-theme-muted leading-relaxed font-medium">
                        Seuls les administrateurs ou les membres ayant des tâches assignées peuvent émettre des rapports.
                      </p>
                    </div>
                  </div>
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

          <div className={`${isInheritedManager ? 'w-full' : 'lg:col-span-8'} space-y-8`}>
            {/* Mes rapports */}
            {!isInheritedManager && (
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

            {/* Rapports accessibles */}
            {isManager && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-primary rounded-full" />
                    <h4 className="text-xs font-black text-theme-main uppercase tracking-[0.2em]">Rapports de l'Équipe</h4>
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
          <GlassCard className="p-8 border-primary/10 bg-primary/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none rotate-12">
              <Calendar size={120} className="text-primary" />
            </div>

            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-primary rounded-xl shadow-theme-lg ring-4 ring-primary/10">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h4 className="text-sm font-black text-theme-main uppercase tracking-widest">
                Absences & Congés
              </h4>
            </div>

            {!canCreateAbsence ? (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex gap-4">
                <ShieldAlert className="h-6 w-6 text-primary flex-shrink-0" />
                <p className="text-[11px] text-theme-muted leading-relaxed font-medium">
                  Vous pourrez faire une demande dès que vous serez administrateur/créateur direct de la liste ou membre direct avec au moins une tâche assignée.
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
                  <input
                    type="date"
                    value={absenceForm.date_debut}
                    onChange={e => setAbsenceForm(prev => ({ ...prev, date_debut: e.target.value }))}
                    className="w-full h-[52px] bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold transition-all custom-datepicker-dark"
                  />
                </div>
                <div className="md:col-span-6 lg:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Fin</label>
                  <input
                    type="date"
                    value={absenceForm.date_fin}
                    onChange={e => setAbsenceForm(prev => ({ ...prev, date_fin: e.target.value }))}
                    className="w-full h-[52px] bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold transition-all custom-datepicker-dark"
                  />
                </div>
                <div className="md:col-span-12 lg:col-span-4 space-y-2">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Motif / Justification</label>
                  <input
                    value={absenceForm.motif}
                    onChange={e => setAbsenceForm(prev => ({ ...prev, motif: e.target.value }))}
                    placeholder={absenceForm.is_absence ? "Ex: maladie, urgence familiale..." : "Ex: congé annuel, rendez-vous personnel..."}
                    className="w-full h-[52px] bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold transition-all placeholder:text-theme-muted/30"
                  />
                </div>
                <div className="md:col-span-12 lg:col-span-2">
                  <Button onClick={handleCreateAbsence} disabled={loading || !absenceForm.date_debut} className="w-full h-[52px] rounded-2xl shadow-premium-primary group">
                    <Check size={20} className="mr-2 group-hover:scale-125 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-[10px]">Envoyer</span>
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-secondary rounded-full" />
                <h4 className="text-xs font-black text-theme-main uppercase tracking-[0.2em]">
                  {isManager ? 'Gestion des Demandes' : 'Vos Demandes'}
                </h4>
              </div>
              {isManager && (
                <button onClick={() => setIsAbsenceArchiveOpen(true)} className="flex items-center gap-2 text-[10px] font-black uppercase text-secondary tracking-widest hover:brightness-125 transition-all">
                  <Archive size={14} /> Archives
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {visibleAbsences.length === 0 ? (
                  <div className="md:col-span-2 lg:col-span-3 py-16 text-center opacity-30 border-2 border-dashed border-theme-border-subtle rounded-3xl bg-theme-surface-hover/20">
                    <Calendar className="h-10 w-10 mx-auto mb-3 text-theme-muted" />
                    <p className="font-black text-[10px] uppercase tracking-widest">Aucune donnée</p>
                  </div>
                ) : (
                  visibleAbsences.map((absence, i) => (
                    <motion.div key={absence.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                      <GlassCard className="p-5 border-theme-border-subtle hover:bg-theme-surface-hover/40 transition-all group/card">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`p-2 rounded-xl border ${absence.is_absence ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                            <Calendar size={20} />
                          </div>
                          <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${absence.statut === 'Approuvé' || absence.statut === 'Accepté' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                            absence.statut === 'Refusé' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                              'bg-theme-muted/10 text-theme-muted border border-theme-border-subtle'
                            }`}>
                            {absence.statut}
                          </span>
                        </div>
                        <div className="mb-4">
                          <p className="font-black text-theme-main text-sm mb-1">{absence.is_absence ? 'Absence' : 'Congé'}</p>
                          <p className="text-[10px] font-black text-theme-muted/40 uppercase tracking-widest">{absence.authorName}</p>
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
                        {absence.motif && <p className="text-[11px] text-theme-muted italic mb-6 font-medium">"{absence.motif}"</p>}

                        {isManager && (() => {
                          const authorIsAdmin = absence.author_role === ROLES.CREATOR || absence.author_role === ROLES.ADMIN;
                          const canApproveThis = authorIsAdmin ? isInheritedManager : (isDirectAdmin || isInheritedManager);

                          return (
                            <div className="flex items-center gap-2 pt-4 border-t border-theme-border-subtle">
                              {absence.statut === 'En attente' && canApproveThis ? (
                                <>
                                  <button onClick={() => confirmAbsenceDecision(absence, 'approve')} className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase rounded-lg transition-all border border-emerald-500/10">Approuver</button>
                                  <button onClick={() => confirmAbsenceDecision(absence, 'reject')} className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase rounded-lg transition-all border border-red-500/10">Rejeter</button>
                                </>
                              ) : (
                                <button onClick={() => archiveAbsence(absence.id)} className="w-full py-2 bg-theme-surface-hover/50 hover:bg-theme-surface-hover text-theme-muted text-[10px] font-black uppercase rounded-lg transition-all border border-theme-border-subtle flex items-center justify-center gap-2">
                                  <Archive size={12} /> Archiver
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </GlassCard>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
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
