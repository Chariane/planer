import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Calendar, Check, Download, Edit, Eye, FileText, ListTodo, Loader2, Paperclip, ShieldAlert, Trash2, Upload, Users, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import Modal from '../../../components/ui/Modal';
import { LISTE_TACHE_BASE_URL, plannerToolsService } from '../../../services/plannerTools.service';
import { listeService } from '../../../services/liste.service';
import { espaceService } from '../../../services/espace.service';
import { workspaceService } from '../../../services/workspace.service';
import { getMemberDisplayName, getMemberEmail } from '../../../utils/memberDisplay';
import { ROLES } from '../../../lib/roleHierarchy';
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
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
  const isDirectSimpleMember = isDirectMemberRecord?.role === ROLES.MEMBER;
  const hasAssignedTask = !!currentUserId && tasks.some(task => task.assignees.some(assignee => assignee.id === currentUserId));
  const isGuest = effectiveRole === ROLES.GUEST;
  const isManager = effectiveRole === ROLES.CREATOR || effectiveRole === ROLES.ADMIN;
  const isInheritedManager = isManager && !isDirectAdmin;

  const canViewReports = !!listeId && (!!isDirectMemberRecord || isManager);
  // Rapport création : Uniquement par les membres DIRECTS Administrateurs OU Membres simples ayant une tâche assignée.
  const canCreateReport = isDirectAdmin || (isDirectSimpleMember && hasAssignedTask);

  // Absence : N'importe quel membre direct de la liste
  const canCreateAbsence = !!isDirectMemberRecord;

  const canAddFiles = !isGuest && (!listeId || !isDirectSimpleMember || hasAssignedTask || isManager);
  const fileTargetType = listeId ? 'liste' : espaceId ? 'espace' : 'workspace';
  const fileTargetId = listeId || espaceId || workspaceId || '';
  const filterMembers = activeTool === 'reports' || activeTool === 'absences'
    ? directMembers
    : members;

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
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
            email: getMemberEmail(m),
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
            email: getMemberEmail(m),
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
        ...scope,
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
        ...scope,
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
        type_fichier: file.type.split('/')[1] || 'file'
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
      onConfirm: async () => {
        setLoading(true);
        try {
          await plannerToolsService.deleteFile(fileId);
          setFiles(prev => prev.filter(f => f.id !== fileId));
          showMessage('success', 'Fichier supprimé avec succès.');
          setIsConfirmOpen(false);
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
    if (!isDirectMemberRecord || !reportForm.titre.trim()) {
      showMessage('error', 'Le titre est obligatoire.');
      return;
    }
    if (!canCreateReport) {
      showMessage('error', 'Vous devez avoir au moins une tâche assignée pour envoyer un rapport.');
      return;
    }
    setLoading(true);
    try {
      const createdReport = await plannerToolsService.createReport({ id_membre: isDirectMemberRecord.id, ...reportForm });
      setReportForm({ titre: '', realisations: '', difficultes_et_solutions: '', commentaire: '', fichier_joint: '' });
      setSelectedMemberId('');
      setReports(prev => [
        {
          ...createdReport,
          owner_user_id: currentUserId,
          owner_name: 'Moi',
          liste_id: listeId,
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
      onConfirm: async () => {
        setLoading(true);
        try {
          await plannerToolsService.deleteReport(report.id);
          setReports(prev => prev.filter(item => item.id !== report.id));
          setSelectedReport(prev => prev?.id === report.id ? null : prev);
          setEditingReport(prev => prev?.id === report.id ? null : prev);
          setIsConfirmOpen(false);
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
    if (!isDirectMemberRecord || !absenceForm.date_debut) return;
    setLoading(true);
    try {
      await plannerToolsService.createAbsence({
        id_membre: isDirectMemberRecord.id,
        is_absence: absenceForm.is_absence,
        date_debut: new Date(absenceForm.date_debut).toISOString(),
        date_fin: absenceForm.date_fin ? new Date(absenceForm.date_fin).toISOString() : undefined,
        motif: absenceForm.motif,
        duree_demandee_en_jours: absenceForm.duree_demandee_en_jours ? Number(absenceForm.duree_demandee_en_jours) : undefined,
      });
      setAbsenceForm({ is_absence: true, date_debut: '', date_fin: '', motif: '', duree_demandee_en_jours: '' });
      await loadAbsences();
      showMessage('success', 'Demande envoyée.');
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
      authorName: getAuthorName(report.id_membre, report.owner_user_id, report.owner_name)
    }));
  }, [reports, members, currentUserId]);

  const ownReports = useMemo(
    () => reportsWithAuthors.filter(report => report.owner_user_id === currentUserId),
    [reportsWithAuthors, currentUserId],
  );

  const accessibleReports = useMemo(
    () => reportsWithAuthors.filter(report => report.owner_user_id !== currentUserId && !archivedReportIds.includes(report.id)),
    [reportsWithAuthors, archivedReportIds, currentUserId],
  );
  const archivedReports = useMemo(
    () => reportsWithAuthors.filter(report => archivedReportIds.includes(report.id)),
    [reportsWithAuthors, archivedReportIds],
  );

  const filesWithAuthors = useMemo(() => {
    return files.map(file => ({
      ...file,
      authorName: getAuthorName(file.id_membre, file.meta_donnees?.owner_user_id, file.owner_name)
    }));
  }, [files, members, currentUserId]);

  const absencesWithAuthors = useMemo(() => {
    return absences.map(absence => ({
      ...absence,
      authorName: getAuthorName(absence.id_membre, absence.owner_user_id, absence.owner_name),
    }));
  }, [absences, members, currentUserId]);
  const ownAbsences = useMemo(
    () => absencesWithAuthors.filter(absence => absence.owner_user_id === currentUserId),
    [absencesWithAuthors, currentUserId],
  );
  const accessibleAbsences = useMemo(
    () => absencesWithAuthors.filter(absence => absence.owner_user_id !== currentUserId && !archivedAbsenceIds.includes(absence.id)),
    [absencesWithAuthors, archivedAbsenceIds, currentUserId],
  );
  const archivedAbsences = useMemo(
    () => absencesWithAuthors.filter(absence => archivedAbsenceIds.includes(absence.id)),
    [absencesWithAuthors, archivedAbsenceIds],
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

  const printReport = (report: any) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Rapport - ${report.titre}</title>
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
              <h1 class="title">${report.titre || ''}</h1>
            </div>
            <div class="meta">Date: ${formatDate(report.created_at)}</div>
          </div>
          <div class="section">
            <div class="section-title">I. Réalisations</div>
            <div class="content">${report.realisations || ''}</div>
          </div>
          ${report.difficultes_et_solutions ? `
          <div class="section">
            <div class="section-title">II. Difficultés & Solutions</div>
            <div class="content warning">${report.difficultes_et_solutions}</div>
          </div>` : ''}
          ${report.commentaire ? `
          <div class="section">
            <div class="section-title">III. Commentaires Additionnels</div>
            <div class="content note">${report.commentaire}</div>
          </div>` : ''}
          <div class="footer">
            <div>Généré par K-Planner le ${new Date().toLocaleDateString('fr-FR')}</div>
            <div>Signé: <span class="signature">${report.authorName || 'Utilisateur'}</span></div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const renderEmptyReports = (label: string) => (
    <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
      <FileText className="h-10 w-10 mx-auto text-gray-200 mb-2" />
      <p className="text-sm text-gray-400 italic">{label}</p>
    </div>
  );

  const renderReportCard = (report: any, mode: 'own' | 'accessible') => (
    <div key={report.id} className="group bg-white rounded-xl shadow-sm border border-gray-100 hover:border-secondary/30 transition-all hover:shadow-md overflow-hidden flex flex-col">
      <button onClick={() => setSelectedReport(report)} className="bg-slate-50 px-5 py-3 border-b flex justify-between items-center text-left">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-white font-bold text-xs shadow-sm">
            DOC
          </div>
          <div>
            <h4 className="font-bold text-gray-900 group-hover:text-secondary transition-colors text-sm">{report.titre}</h4>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              {formatDate(report.created_at)} · {report.authorName}
            </p>
          </div>
        </div>
        <Eye size={16} className="text-secondary" />
      </button>

      <div className="p-5 space-y-4 flex-1">
        <div className="relative pl-4 border-l-2 border-secondary/20">
          <p className="text-[10px] font-black text-secondary/40 uppercase mb-2 tracking-tighter">I. RÉALISATIONS</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-4">{report.realisations || 'Aucune réalisation renseignée.'}</p>
        </div>
        {report.difficultes_et_solutions && (
          <div className="relative pl-4 border-l-2 border-red-200">
            <p className="text-[10px] font-black text-red-300 uppercase mb-2 tracking-tighter">II. DIFFICULTÉS & SOLUTIONS</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-3">{report.difficultes_et_solutions}</p>
          </div>
        )}
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
          Signé: <span className="text-secondary">{report.authorName}</span>
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => printReport(report)} className="p-2 rounded-lg hover:bg-secondary/10 text-secondary" title="Imprimer / PDF">
            <Download size={14} />
          </button>
          {mode === 'own' ? (
            <>
              <button onClick={() => startEditReport(report)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600" title="Modifier">
                <Edit size={14} />
              </button>
              <button onClick={() => handleDeleteReport(report)} className="p-2 rounded-lg hover:bg-red-50 text-red-600" title="Supprimer">
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <button onClick={() => archiveReport(report.id)} className="p-2 rounded-lg hover:bg-amber-50 text-amber-600" title="Archiver dans mon espace">
              <Archive size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderAbsenceCard = (absence: any, mode: 'own' | 'accessible' | 'archive') => (
    <div key={absence.id} className="border rounded-xl p-4 flex items-center justify-between gap-3 bg-white shadow-sm hover:shadow-md transition-all">
      <div className="flex gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-xs ${absence.is_absence ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
          {absence.is_absence ? 'ABS' : 'CONG'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-800">
              {absence.is_absence ? 'Absence' : 'Congé'} <span className="text-[10px] font-normal text-gray-400">— {absence.authorName}</span>
            </p>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${absence.statut === 'Approuvé' || absence.statut === 'Accepté' ? 'bg-green-100 text-green-700' :
              absence.statut === 'Refusé' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
              }`}>
              {absence.statut}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Du <span className="font-semibold">{formatDate(absence.date_debut)}</span> au <span className="font-semibold">{formatDate(absence.date_fin)}</span>
          </p>
          {absence.motif && <p className="text-[10px] text-gray-400 mt-2 italic">"{absence.motif}"</p>}
        </div>
      </div>
      {mode === 'accessible' && (
        <div className="flex gap-2">
          {absence.statut === 'En attente' && (
            <>
              <button onClick={() => decideAbsence(absence.id, 'approve')} className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"><Check className="h-4 w-4" /></button>
              <button onClick={() => decideAbsence(absence.id, 'reject')} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"><X className="h-4 w-4" /></button>
            </>
          )}
          <button onClick={() => archiveAbsence(absence.id)} className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors" title="Archiver">
            <Archive className="h-4 w-4" />
          </button>
        </div>
      )}
      {mode === 'archive' && (
        <Button variant="outline" size="sm" onClick={() => unarchiveAbsence(absence.id)}>Restaurer</Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTool === 'files' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveTool('files')}
          className="flex items-center gap-2"
        >
          <Paperclip className="h-4 w-4" /> Fichiers
        </Button>
        {listeId && (
          <>
            {canViewReports && (
              <Button
                variant={activeTool === 'reports' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTool('reports')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" /> Rapports
              </Button>
            )}
            <Button
              variant={activeTool === 'absences' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTool('absences')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" /> Absences / congés
            </Button>
          </>
        )}
      </div>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Barre de Filtre par Membre */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-gray-50/50">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
            <Users size={16} />
          </div>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
          >
            <option value="">
              {activeTool === 'reports'
                ? 'Tous les rapports accessibles'
                : activeTool === 'absences'
                  ? 'Toutes les demandes accessibles'
                  : 'Tous les membres'}
            </option>
            {(activeTool === 'reports' || activeTool === 'absences') ? (
              filterMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.id_utilisateur === currentUserId ? '(Moi)' : ''}
                </option>
              ))
            ) : directMembers.length > 0 && (
              <optgroup label="Membres directes de la liste">
                {directMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.id_utilisateur === currentUserId ? '(Moi)' : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {activeTool === 'files' && inheritedMembers.length > 0 && (
              <optgroup label="Membres (Héritage Gestion)">
                {inheritedMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.id_utilisateur === currentUserId ? '(Moi)' : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {(selectedMemberId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedMemberId('')}
            className="text-gray-400 hover:text-red-500 p-2"
            title="Effacer le filtre"
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {activeTool === 'files' && (
        <GlassCard className="p-4 space-y-4">
          {!canAddFiles && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <ShieldAlert className="h-4 w-4 mt-0.5" />
              Les invités ne peuvent pas ajouter de fichiers. Un membre de liste doit avoir au moins une tâche assignée pour joindre un fichier à la liste.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" disabled={!canAddFiles || isUploading} />
            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={!canAddFiles || isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Paperclip className="h-4 w-4 mr-2" />}
              {fileForm.url_fichier ? 'Changer' : 'Choisir'}
            </Button>
            <input value={fileForm.nom} onChange={e => setFileForm(prev => ({ ...prev, nom: e.target.value }))} placeholder="Nom du fichier (optionnel)" className="border rounded-lg px-3 py-2 text-sm" disabled={!canAddFiles || isUploading} />
            <Button onClick={handleCreateFile} disabled={!canAddFiles || loading || isUploading || !fileForm.url_fichier}>
              <Upload className="h-4 w-4 mr-1" /> Joindre
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filesWithAuthors.map(file => (
              <div key={file.id} className="border rounded-lg p-3 flex items-center justify-between gap-3 bg-white hover:shadow-sm transition-shadow">
                <div className="overflow-hidden">
                  <p className="font-medium text-gray-800 truncate" title={file.nom}>{file.nom}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">
                    Envoyé par <span className="text-slate-800">{file.authorName}</span> le {formatDate(file.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => window.open(getFileFullUrl(file.url_fichier), '_blank')} className="p-2 rounded-full hover:bg-green-50 text-green-600"><Eye className="h-4 w-4" /></button>
                  <button onClick={() => handleDownload(file)} className="p-2 rounded-full hover:bg-secondary/10 text-secondary"><Download className="h-4 w-4" /></button>
                  {((file.owner_user_id || file.meta_donnees?.owner_user_id) === currentUserId || isManager) && (
                    <button onClick={() => handleDeleteFile(file.id)} className="p-2 rounded-full hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {activeTool === 'reports' && (
        <div className={`grid grid-cols-1 gap-6 ${isInheritedManager ? '' : 'md:grid-cols-3'}`}>
          {!isInheritedManager && (
          <div className="md:col-span-1">
            <GlassCard className="p-5 space-y-4 border-t-4 border-t-secondary">
              <div className="flex items-center gap-2 border-b pb-3">
                <FileText className="h-5 w-5 text-secondary" />
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Nouveau Rapport</h4>
              </div>

              {!canCreateReport ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>Accès restreint</strong><br />
                    Pour envoyer un rapport, vous devez être Administrateur/Créateur ou être un membre ayant au moins une tâche assignée dans cette liste.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Titre du rapport</label>
                    <input
                      value={reportForm.titre}
                      onChange={e => setReportForm(prev => ({ ...prev, titre: e.target.value }))}
                      placeholder="Ex: Rapport hebdomadaire - Semaine 22"
                      className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Réalisations</label>
                    <textarea
                      value={reportForm.realisations}
                      onChange={e => setReportForm(prev => ({ ...prev, realisations: e.target.value }))}
                      placeholder="Qu'est-ce qui a été accompli ?"
                      className="w-full border rounded-lg px-3 py-2.5 text-sm h-32 focus:ring-2 focus:ring-secondary/20 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Difficultés & Solutions (Optionnel)</label>
                    <textarea
                      value={reportForm.difficultes_et_solutions}
                      onChange={e => setReportForm(prev => ({ ...prev, difficultes_et_solutions: e.target.value }))}
                      placeholder="Quels obstacles avez-vous rencontrés ?"
                      className="w-full border rounded-lg px-3 py-2 text-sm h-24 focus:ring-2 focus:ring-secondary/20 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Commentaires Additionnels (Optionnel)</label>
                    <textarea
                      value={reportForm.commentaire}
                      onChange={e => setReportForm(prev => ({ ...prev, commentaire: e.target.value }))}
                      placeholder="Remarques ou propositions..."
                      className="w-full border rounded-lg px-3 py-2 text-sm h-20 focus:ring-2 focus:ring-secondary/20 outline-none transition-all resize-none"
                    />
                  </div>

                  <Button onClick={handleCreateReport} disabled={loading || !reportForm.titre.trim()} className="w-full py-6 shadow-lg shadow-secondary/20">
                    <Upload className="h-4 w-4 mr-2" /> Envoyer le rapport
                  </Button>
                </div>
              )}
            </GlassCard>
          </div>
          )}

          <div className={`${isInheritedManager ? '' : 'md:col-span-2'} space-y-5`}>
            {!isInheritedManager && (
            <GlassCard className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-gray-400" />
                  <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Historique de rapports</h4>
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold">{ownReports.length} rapports</span>
              </div>
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                {ownReports.length === 0
                  ? renderEmptyReports("Aucun rapport dans votre historique.")
                  : ownReports.map(report => renderReportCard(report, 'own'))}
              </div>
            </GlassCard>
            )}

            {isManager && (
              <GlassCard className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-gray-400" />
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Rapports accessibles</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold">{accessibleReports.length} rapports</span>
                    <Button variant="outline" size="sm" onClick={() => setIsReportArchiveOpen(true)}>
                      <Archive className="h-4 w-4 mr-1" /> Archives
                    </Button>
                  </div>
                </div>
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                  {accessibleReports.length === 0
                    ? renderEmptyReports("Aucun rapport reçu pour le moment.")
                    : accessibleReports.map(report => renderReportCard(report, 'accessible'))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {activeTool === 'absences' && (
        <div className="space-y-6">
          {!isInheritedManager && (
          <GlassCard className="p-5 border-t-4 border-t-primary">
            <div className="flex items-center gap-2 border-b pb-3 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Demande d'Absence ou Congé</h4>
            </div>

            {!canCreateAbsence ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-xs text-amber-700">
                <ShieldAlert className="h-5 w-5 flex-shrink-0" />
                Vous devez être membre de cette liste pour pouvoir effectuer une demande.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Type</label>
                  <select
                    value={absenceForm.is_absence ? 'absence' : 'conge'}
                    onChange={e => setAbsenceForm(prev => ({ ...prev, is_absence: e.target.value === 'absence' }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white h-10"
                  >
                    <option value="absence">Absence</option>
                    <option value="conge">Congé</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Début</label>
                  <input
                    type="date"
                    value={absenceForm.date_debut}
                    onChange={e => setAbsenceForm(prev => ({ ...prev, date_debut: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none h-10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Fin</label>
                  <input
                    type="date"
                    value={absenceForm.date_fin}
                    onChange={e => setAbsenceForm(prev => ({ ...prev, date_fin: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none h-10"
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Motif</label>
                  <input
                    value={absenceForm.motif}
                    onChange={e => setAbsenceForm(prev => ({ ...prev, motif: e.target.value }))}
                    placeholder="Pourquoi ?"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none h-10"
                  />
                </div>
                <Button onClick={handleCreateAbsence} disabled={loading || !absenceForm.date_debut} className="h-10">
                  Soumettre
                </Button>
              </div>
            )}
          </GlassCard>
          )}

          <GlassCard className="p-5">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-gray-400" />
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest">
                  {isInheritedManager || isManager ? 'Demandes accessibles' : 'Mes demandes'}
                </h4>
              </div>
              {isManager && (
                <Button variant="outline" size="sm" onClick={() => setIsAbsenceArchiveOpen(true)}>
                  <Archive className="h-4 w-4 mr-1" /> Archives
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(isManager ? accessibleAbsences : ownAbsences).length === 0 ? (
                <div className="md:col-span-2 text-center py-10 text-gray-400 text-sm italic">Aucune demande enregistrée.</div>
              ) : (
                (isManager ? accessibleAbsences : ownAbsences).map(absence => renderAbsenceCard(absence, isManager ? 'accessible' : 'own'))
              )}
            </div>
          </GlassCard>
        </div>
      )}
      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={selectedReport?.titre || 'Rapport'} size="lg">
        {selectedReport && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border p-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Rapport d'activité</p>
                <h3 className="text-xl font-bold text-gray-900">{selectedReport.titre}</h3>
                <p className="text-xs text-gray-500 mt-1">Signé par {selectedReport.authorName} · {formatDate(selectedReport.created_at)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => printReport(selectedReport)}>
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>

            <div className="border-l-4 border-secondary bg-gray-50 rounded-r-xl p-4">
              <p className="text-[10px] font-black text-secondary uppercase mb-2">I. Réalisations</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedReport.realisations || 'Aucune réalisation renseignée.'}</p>
            </div>

            {selectedReport.difficultes_et_solutions && (
              <div className="border-l-4 border-red-300 bg-red-50 rounded-r-xl p-4">
                <p className="text-[10px] font-black text-red-400 uppercase mb-2">II. Difficultés & Solutions</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedReport.difficultes_et_solutions}</p>
              </div>
            )}

            {selectedReport.commentaire && (
              <div className="border-l-4 border-blue-300 bg-blue-50 rounded-r-xl p-4">
                <p className="text-[10px] font-black text-blue-500 uppercase mb-2">III. Commentaires Additionnels</p>
                <p className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">{selectedReport.commentaire}</p>
              </div>
            )}

            {selectedReport.owner_user_id === currentUserId && (
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => startEditReport(selectedReport)}>
                  <Edit className="h-4 w-4 mr-1" /> Modifier
                </Button>
                <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteReport(selectedReport)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!editingReport} onClose={() => setEditingReport(null)} title="Modifier le rapport" size="lg">
        <div className="space-y-4">
          <input
            value={reportEditForm.titre}
            onChange={e => setReportEditForm(prev => ({ ...prev, titre: e.target.value }))}
            placeholder="Titre du rapport"
            className="w-full border rounded-lg px-3 py-2.5 text-sm"
            autoFocus
          />
          <textarea
            value={reportEditForm.realisations}
            onChange={e => setReportEditForm(prev => ({ ...prev, realisations: e.target.value }))}
            placeholder="Réalisations"
            className="w-full border rounded-lg px-3 py-2.5 text-sm h-32 resize-none"
          />
          <textarea
            value={reportEditForm.difficultes_et_solutions}
            onChange={e => setReportEditForm(prev => ({ ...prev, difficultes_et_solutions: e.target.value }))}
            placeholder="Difficultés & Solutions"
            className="w-full border rounded-lg px-3 py-2.5 text-sm h-24 resize-none"
          />
          <textarea
            value={reportEditForm.commentaire}
            onChange={e => setReportEditForm(prev => ({ ...prev, commentaire: e.target.value }))}
            placeholder="Commentaires additionnels"
            className="w-full border rounded-lg px-3 py-2.5 text-sm h-20 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingReport(null)}>Annuler</Button>
            <Button onClick={handleUpdateReport} disabled={loading || !reportEditForm.titre.trim()}>Enregistrer</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isReportArchiveOpen} onClose={() => setIsReportArchiveOpen(false)} title="Archives des rapports" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {archivedReports.length === 0 ? (
            renderEmptyReports('Aucun rapport archivé.')
          ) : (
            archivedReports.map(report => (
              <div key={report.id} className="rounded-xl border bg-white p-4 flex items-center justify-between gap-3">
                <button onClick={() => setSelectedReport(report)} className="text-left min-w-0">
                  <p className="font-bold text-gray-900 truncate">{report.titre}</p>
                  <p className="text-xs text-gray-500">{report.authorName} · {formatDate(report.created_at)}</p>
                </button>
                <Button variant="outline" size="sm" onClick={() => unarchiveReport(report.id)}>Restaurer</Button>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal isOpen={isAbsenceArchiveOpen} onClose={() => setIsAbsenceArchiveOpen(false)} title="Archives des demandes" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {archivedAbsences.length === 0 ? (
            <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <Calendar className="h-10 w-10 mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400 italic">Aucune demande archivée.</p>
            </div>
          ) : (
            archivedAbsences.map(absence => renderAbsenceCard(absence, 'archive'))
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmData?.onConfirm || (() => Promise.resolve())}
        title="Confirmation"
        message="Voulez-vous vraiment continuer ? Cette action est irréversible."
        isLoading={loading}
      />
    </div>
  );
}
