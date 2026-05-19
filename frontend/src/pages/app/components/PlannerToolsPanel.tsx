import { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, FileText, Link, Loader2, Paperclip, Search, ShieldAlert, Upload, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import { plannerToolsService } from '../../../services/plannerTools.service';
import { listeService } from '../../../services/liste.service';
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
  const [activeTool, setActiveTool] = useState<'search' | 'files' | 'reports' | 'absences'>('search');
  const [members, setMembers] = useState<ListMemberRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [taskFilters, setTaskFilters] = useState({ statut: '', priorite: '', membre_id: '', overdue: '' });
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);

  const [files, setFiles] = useState<any[]>([]);
  const [fileForm, setFileForm] = useState({ nom: '', url_fichier: '', type_fichier: '' });
  const [shareToken, setShareToken] = useState<string | null>(null);

  const [reports, setReports] = useState<any[]>([]);
  const [reportForm, setReportForm] = useState({
    titre: '',
    realisations: '',
    difficultes_et_solutions: '',
    commentaire: '',
    fichier_joint: '',
  });

  const [absences, setAbsences] = useState<any[]>([]);
  const [absenceForm, setAbsenceForm] = useState({
    is_absence: true,
    date_debut: '',
    date_fin: '',
    motif: '',
    duree_demandee_en_jours: '',
  });

  const scope = useMemo(() => ({
    workspace_id: workspaceId || undefined,
    espace_id: espaceId || undefined,
    liste_id: listeId || undefined,
  }), [workspaceId, espaceId, listeId]);

  const currentMember = members.find(member => member.id_utilisateur === currentUserId);
  const isGuest = effectiveRole === ROLES.GUEST;
  const isManager = effectiveRole === ROLES.CREATOR || effectiveRole === ROLES.ADMIN;
  const hasAssignedTask = !!currentUserId && tasks.some(task => task.assignees.some(assignee => assignee.id === currentUserId));
  const isDirectListMember = currentMember?.role === ROLES.MEMBER;
  const canCreateMemberScopedData = !!currentMember && !isGuest;
  const canAddFiles = !isGuest && (!listeId || !isDirectListMember || hasAssignedTask || isManager);
  const fileTargetType = listeId ? 'liste' : espaceId ? 'espace' : 'workspace';
  const fileTargetId = listeId || espaceId || workspaceId || '';

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadMembers = async () => {
    if (!listeId) {
      setMembers([]);
      return;
    }
    const data = await listeService.getMembers(listeId);
    setMembers((Array.isArray(data) ? data : []).map((member: any) => ({
      id: member.id,
      id_utilisateur: member.id_utilisateur || member.utilisateur?.id,
      name: getMemberDisplayName(member),
      email: getMemberEmail(member),
      role: member.role,
    })));
  };

  const loadFiles = async () => {
    if (!fileTargetId) return;
    const data = await plannerToolsService.listFiles({
      target_type: fileTargetType,
      target_id: fileTargetId,
      limit: 50,
    });
    setFiles(Array.isArray(data) ? data : []);
  };

  const loadReports = async () => {
    const data = await plannerToolsService.listReports({ ...scope, limit: 100 });
    setReports(Array.isArray(data) ? data : []);
  };

  const loadAbsences = async () => {
    const data = await plannerToolsService.listAbsences({ ...scope, limit: 100 });
    setAbsences(Array.isArray(data) ? data : []);
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
  }, [activeTool, listeId, espaceId, workspaceId]);

  const handleGlobalSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const data = await plannerToolsService.globalSearch(searchQuery.trim(), scope);
      setSearchResults(data);
    } catch (err: any) {
      showMessage('error', err?.message || 'Recherche impossible.');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskFilter = async () => {
    setLoading(true);
    try {
      const data = await plannerToolsService.searchTasks({
        ...scope,
        statut: taskFilters.statut,
        priorite: taskFilters.priorite,
        membre_id: taskFilters.membre_id,
        overdue: taskFilters.overdue === 'true' ? true : undefined,
      });
      setFilteredTasks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showMessage('error', err?.message || 'Filtrage impossible.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFile = async () => {
    if (!canAddFiles) {
      showMessage('error', "Vous n'avez pas le droit d'ajouter un fichier à cette ressource.");
      return;
    }
    if (!fileForm.nom.trim() || !fileTargetId) return;
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

  const handleShareFile = async (fileId: string) => {
    try {
      const data = await plannerToolsService.shareFile(fileId, { expires_in_hours: 24, allow_download: true });
      setShareToken(data.token);
      showMessage('success', 'Lien de partage généré.');
    } catch (err: any) {
      showMessage('error', err?.message || 'Partage impossible.');
    }
  };

  const handleCreateReport = async () => {
    if (!currentMember || !reportForm.titre.trim()) return;
    setLoading(true);
    try {
      await plannerToolsService.createReport({ id_membre: currentMember.id, ...reportForm });
      setReportForm({ titre: '', realisations: '', difficultes_et_solutions: '', commentaire: '', fichier_joint: '' });
      await loadReports();
      showMessage('success', 'Rapport envoyé.');
    } catch (err: any) {
      showMessage('error', err?.message || 'Impossible de créer le rapport.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAbsence = async () => {
    if (!currentMember || !absenceForm.date_debut) return;
    setLoading(true);
    try {
      await plannerToolsService.createAbsence({
        id_membre: currentMember.id,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          ['search', Search, 'Recherche'],
          ['files', Paperclip, 'Fichiers'],
          ['reports', FileText, 'Rapports'],
          ['absences', Calendar, 'Absences / congés'],
        ].map(([id, Icon, label]: any) => (
          <button
            key={id}
            onClick={() => setActiveTool(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${activeTool === id ? 'bg-secondary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {activeTool === 'search' && (
        <GlassCard className="p-4 space-y-4">
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && handleGlobalSearch()}
              placeholder="Rechercher tâches, listes, membres, fichiers..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <Button onClick={handleGlobalSearch} disabled={loading || !searchQuery.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select value={taskFilters.statut} onChange={e => setTaskFilters(prev => ({ ...prev, statut: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm">
              <option value="">Tous statuts</option>
              <option value="en attente">En attente</option>
              <option value="en cours">En cours</option>
              <option value="terminé">Terminé</option>
              <option value="bloqué">Bloqué</option>
            </select>
            <select value={taskFilters.priorite} onChange={e => setTaskFilters(prev => ({ ...prev, priorite: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm">
              <option value="">Toutes priorités</option>
              <option value="basse">Basse</option>
              <option value="moyenne">Moyenne</option>
              <option value="haute">Haute</option>
              <option value="critique">Critique</option>
            </select>
            <select value={taskFilters.membre_id} onChange={e => setTaskFilters(prev => ({ ...prev, membre_id: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm">
              <option value="">Tous membres</option>
              {members.map(member => <option key={member.id_utilisateur} value={member.id_utilisateur}>{member.name}</option>)}
            </select>
            <select value={taskFilters.overdue} onChange={e => setTaskFilters(prev => ({ ...prev, overdue: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm">
              <option value="">Toutes échéances</option>
              <option value="true">En retard</option>
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={handleTaskFilter}>Filtrer les tâches</Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTasks.map(task => (
              <div key={task.id} className="border rounded-lg p-3">
                <p className="font-medium text-gray-800">{task.titre}</p>
                <p className="text-xs text-gray-500">{task.statut} · {task.priorite} · {formatDate(task.date_fin_prevue)}</p>
              </div>
            ))}
          </div>

          {searchResults && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(searchResults).map(([key, value]: any) => (
                <div key={key} className="border rounded-lg p-3">
                  <p className="font-semibold text-sm text-gray-700 mb-2">{key}</p>
                  <p className="text-xs text-gray-500">{Array.isArray(value) ? `${value.length} résultat(s)` : '—'}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {activeTool === 'files' && (
        <GlassCard className="p-4 space-y-4">
          {!canAddFiles && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <ShieldAlert className="h-4 w-4 mt-0.5" />
              Les invités ne peuvent pas ajouter de fichiers. Un membre de liste doit avoir au moins une tâche assignée pour joindre un fichier à la liste.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input value={fileForm.nom} onChange={e => setFileForm(prev => ({ ...prev, nom: e.target.value }))} placeholder="Nom du fichier" className="border rounded-lg px-3 py-2 text-sm" disabled={!canAddFiles} />
            <input value={fileForm.url_fichier} onChange={e => setFileForm(prev => ({ ...prev, url_fichier: e.target.value }))} placeholder="URL ou référence" className="border rounded-lg px-3 py-2 text-sm" disabled={!canAddFiles} />
            <input value={fileForm.type_fichier} onChange={e => setFileForm(prev => ({ ...prev, type_fichier: e.target.value }))} placeholder="pdf, image, vidéo..." className="border rounded-lg px-3 py-2 text-sm" disabled={!canAddFiles} />
            <Button onClick={handleCreateFile} disabled={!canAddFiles || loading || !fileForm.nom.trim()}>
              <Upload className="h-4 w-4 mr-1" /> Joindre
            </Button>
          </div>
          {shareToken && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 break-all">
              Token de partage : {shareToken}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {files.map(file => (
              <div key={file.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-800">{file.nom}</p>
                  <p className="text-xs text-gray-500">{file.type_fichier || 'fichier'} · {formatDate(file.created_at)}</p>
                </div>
                <button onClick={() => handleShareFile(file.id)} className="p-2 rounded hover:bg-gray-100" title="Partager">
                  <Link className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {activeTool === 'reports' && (
        <GlassCard className="p-4 space-y-4">
          {canCreateMemberScopedData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input value={reportForm.titre} onChange={e => setReportForm(prev => ({ ...prev, titre: e.target.value }))} placeholder="Titre du rapport" className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
              <textarea value={reportForm.realisations} onChange={e => setReportForm(prev => ({ ...prev, realisations: e.target.value }))} placeholder="Réalisations" className="border rounded-lg px-3 py-2 text-sm" />
              <textarea value={reportForm.difficultes_et_solutions} onChange={e => setReportForm(prev => ({ ...prev, difficultes_et_solutions: e.target.value }))} placeholder="Difficultés et solutions" className="border rounded-lg px-3 py-2 text-sm" />
              <textarea value={reportForm.commentaire} onChange={e => setReportForm(prev => ({ ...prev, commentaire: e.target.value }))} placeholder="Commentaire" className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
              <Button onClick={handleCreateReport} disabled={loading || !reportForm.titre.trim()}>
                <FileText className="h-4 w-4 mr-1" /> Envoyer le rapport
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {reports.map(report => (
              <div key={report.id} className="border rounded-lg p-3">
                <p className="font-medium text-gray-800">{report.titre}</p>
                <p className="text-sm text-gray-600">{report.realisations || 'Aucune réalisation renseignée'}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(report.created_at)}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {activeTool === 'absences' && (
        <GlassCard className="p-4 space-y-4">
          {canCreateMemberScopedData && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <select value={absenceForm.is_absence ? 'absence' : 'conge'} onChange={e => setAbsenceForm(prev => ({ ...prev, is_absence: e.target.value === 'absence' }))} className="border rounded-lg px-2 py-2 text-sm">
                <option value="absence">Absence</option>
                <option value="conge">Congé</option>
              </select>
              <input type="date" value={absenceForm.date_debut} onChange={e => setAbsenceForm(prev => ({ ...prev, date_debut: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm" />
              <input type="date" value={absenceForm.date_fin} onChange={e => setAbsenceForm(prev => ({ ...prev, date_fin: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm" />
              <input value={absenceForm.motif} onChange={e => setAbsenceForm(prev => ({ ...prev, motif: e.target.value }))} placeholder="Motif" className="border rounded-lg px-2 py-2 text-sm" />
              <Button onClick={handleCreateAbsence} disabled={loading || !absenceForm.date_debut}>Demander</Button>
            </div>
          )}
          <div className="space-y-2">
            {absences.map(absence => (
              <div key={absence.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-800">{absence.is_absence ? 'Absence' : 'Congé'} · {absence.statut}</p>
                  <p className="text-xs text-gray-500">{formatDate(absence.date_debut)} → {formatDate(absence.date_fin)} · {absence.motif || 'Sans motif'}</p>
                </div>
                {isManager && absence.statut === 'En attente' && (
                  <div className="flex gap-1">
                    <button onClick={() => decideAbsence(absence.id, 'approve')} className="p-1 rounded hover:bg-green-50" title="Accepter"><Check className="h-4 w-4 text-green-600" /></button>
                    <button onClick={() => decideAbsence(absence.id, 'reject')} className="p-1 rounded hover:bg-red-50" title="Refuser"><X className="h-4 w-4 text-red-600" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
