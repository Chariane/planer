// frontend/src/pages/app/components/tools/shared/ReportSection.tsx
import { motion } from 'framer-motion';
import { FileText, Plus, Upload, ShieldAlert, Info, MessageCircle, Archive, Edit, Trash2, Download, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../../../components/ui/Button';
import { GlassCard } from '../../../../../components/ui/GlassCard';
import Modal from '../../../../../components/ui/Modal';
import { ReportList } from './ReportList';
import { toast } from '../../../../../components/ui/Toast';

interface ReportSectionProps {
  // Données
  reports: any[];
  ownReports: any[];
  accessibleReports: any[];
  archivedReports: any[];
  loading: boolean;

  // Permissions
  canCreateReport: boolean;
  canReceiveReports: boolean;
  canShowOwnHistory: boolean;
  useFullWidth: boolean;
  isListScope: boolean;
  reportContactMembers: any[];
  listMemberNeedsAssignedTask: boolean;
  directAdminNeedsChild: boolean;

  // Formulaires
  reportForm: any;
  setReportForm: React.Dispatch<React.SetStateAction<any>>;
  reportEditForm: any;
  setReportEditForm: React.Dispatch<React.SetStateAction<any>>;

  // Actions
  onCreate: () => void;
  onEdit: (report: any) => void;
  onDelete: (report: any) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onPrint: (report: any) => void;
  onUpdate: () => void;

  // États modaux
  selectedReport: any;
  setSelectedReport: (report: any) => void;
  editingReport: any;
  setEditingReport: (report: any) => void;
  isReportArchiveOpen: boolean;
  setIsReportArchiveOpen: (open: boolean) => void;
  onViewReport: (report: any) => void;

  // Labels
  spaceOrWorkspaceLabel?: string;
  formatDate?: (date?: string | null) => string;
  currentUserId?: string | null;
}

const formatDateDefault = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
};

export const ReportSection = ({
  reports,
  ownReports,
  accessibleReports,
  archivedReports,
  loading,
  canCreateReport,
  canReceiveReports,
  canShowOwnHistory,
  useFullWidth,
  isListScope,
  reportContactMembers,
  listMemberNeedsAssignedTask,
  directAdminNeedsChild,
  reportForm,
  setReportForm,
  reportEditForm,
  setReportEditForm,
  onCreate,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  onPrint,
  onUpdate,
  selectedReport,
  setSelectedReport,
  editingReport,
  setEditingReport,
  isReportArchiveOpen,
  setIsReportArchiveOpen,
  onViewReport,
  spaceOrWorkspaceLabel = 'ressource',
  formatDate = formatDateDefault,
  currentUserId,
}: ReportSectionProps) => {

  const escapeHtml = (value?: string | null) => {
    if (!value) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const handlePrintReport = (report: any) => {
    if (onPrint) {
      onPrint(report);
      return;
    }

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
            <div class="content">${safeRealisations || 'Aucune réalisation renseignée.'}</div>
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`grid grid-cols-1 gap-8 ${useFullWidth ? '' : 'lg:grid-cols-12'}`}>
      {/* Formulaire de création */}
      {canShowOwnHistory && (
        <div className="lg:col-span-4 lg:sticky lg:top-4 self-start">
          <GlassCard className="p-8 border border-secondary/20 bg-gradient-to-br from-secondary/5 via-white/50 to-white/90 dark:from-secondary/10 dark:via-theme-surface/50 dark:to-theme-surface/90 relative overflow-hidden shadow-theme-xl rounded-[2.5rem] backdrop-blur-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none rotate-12 transition-transform duration-700 hover:rotate-45">
              <FileText size={160} className="text-secondary drop-shadow-lg" />
            </div>

            <div className="flex items-center gap-4 mb-10 relative">
              <div className="p-3 bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl shadow-theme-lg ring-4 ring-secondary/20">
                <Plus className="h-6 w-6 text-white drop-shadow-sm" />
              </div>
              <h4 className="text-sm font-black text-theme-main uppercase tracking-widest drop-shadow-sm">Nouveau Rapport</h4>
            </div>

            {!canCreateReport ? (
              listMemberNeedsAssignedTask ? (
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
                              <p className="truncate text-[11px] font-bold text-theme-muted">{member.role === 'Créateur' ? 'Créateur du projet' : 'Administrateur du projet'}</p>
                            </div>
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-white shadow-theme-sm transition-transform group-hover:scale-105">
                              <MessageCircle className="h-4 w-4" />
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-medium leading-relaxed text-theme-muted">
                        Aucun responsable direct n'est disponible dans cette liste pour le moment.
                      </p>
                    )}
                  </div>
                </div>
              ) : directAdminNeedsChild ? (
                <div className="relative space-y-5 rounded-3xl border border-sky-500/20 bg-sky-500/5 p-5">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/20">
                      <Info className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-sky-500">Rapport pas encore disponible</p>
                      <p className="text-sm font-bold leading-relaxed text-theme-main">
                        Vous êtes administrateur direct de cette ressource, mais vous devez d'abord créer au moins un élément direct dans ce périmètre.
                      </p>
                      <p className="mt-2 text-xs font-medium leading-relaxed text-theme-muted">
                        {isListScope
                          ? "Créez une liste ou un sous-espace directement dans cet espace. Vous pourrez ensuite produire un rapport sur ce que vous pilotez réellement ici."
                          : `Créez une liste ou un espace directement dans ce ${spaceOrWorkspaceLabel}. Vous pourrez ensuite produire un rapport sur ce que vous pilotez réellement ici.`}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-theme-muted">Pourquoi cette règle ?</p>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-theme-muted">
                      Le rapport doit être rattaché à une responsabilité concrète. Tant que vous n'avez créé aucun élément direct dans cette ressource, il n'y a pas encore de périmètre de travail à rapporter au créateur.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 flex gap-4 relative">
                  <ShieldAlert className="h-6 w-6 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-orange-500 mb-2 tracking-widest">Accès restreint</p>
                    <p className="text-[11px] text-theme-muted leading-relaxed font-medium">
                      {isListScope
                        ? 'Seuls les administrateurs directs ou les membres directs ayant une tâche assignée peuvent émettre un rapport.'
                        : `Seuls les administrateurs directs ayant créé au moins une liste ou un espace direct dans ce ${spaceOrWorkspaceLabel} peuvent émettre un rapport.`}
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
                    onChange={e => setReportForm((prev: any) => ({ ...prev, titre: e.target.value }))}
                    placeholder="Rapport Hebdomadaire..."
                    className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main placeholder:text-theme-muted/30 focus:ring-2 focus:ring-secondary/20 outline-none transition-all font-bold shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Ce que vous avez réalisé</label>
                  <textarea
                    value={reportForm.realisations}
                    onChange={e => setReportForm((prev: any) => ({ ...prev, realisations: e.target.value }))}
                    placeholder="Quels ont été vos accomplissements ?"
                    className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all font-medium h-40 resize-none shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Difficultés & Solutions</label>
                  <textarea
                    value={reportForm.difficultes_et_solutions}
                    onChange={e => setReportForm((prev: any) => ({ ...prev, difficultes_et_solutions: e.target.value }))}
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
                      onChange={e => setReportForm((prev: any) => ({ ...prev, periode_debut: e.target.value }))}
                      className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-4 py-3 text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Période fin</label>
                    <input
                      type="date"
                      value={reportForm.periode_fin}
                      onChange={e => setReportForm((prev: any) => ({ ...prev, periode_fin: e.target.value }))}
                      className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-4 py-3 text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold"
                      required
                    />
                  </div>
                </div>

                <Button
                  onClick={onCreate}
                  disabled={loading || !reportForm.titre.trim() || !reportForm.periode_debut || !reportForm.periode_fin}
                  className="w-full py-7 rounded-2xl shadow-theme-lg group relative overflow-hidden"
                >
                  <Upload className="h-5 w-5 mr-2 group-hover:-translate-y-1 transition-transform" />
                  <span className="font-black uppercase tracking-widest text-xs">Transmettre le rapport</span>
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Liste des rapports */}
      <div className={`${useFullWidth ? 'w-full' : 'lg:col-span-8'} space-y-8`}>
        {canShowOwnHistory && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-secondary rounded-full" />
                <h4 className="text-xs font-black text-theme-main uppercase tracking-[0.2em]">Votre Historique</h4>
              </div>
              <span className="text-[10px] font-black uppercase text-theme-muted/50 tracking-widest">{ownReports.length} rapports</span>
            </div>

            <ReportList
              reports={ownReports}
              type="personal"
              onView={onViewReport}
              onEdit={onEdit}
              onDelete={onDelete}
              onPrint={handlePrintReport}
              loading={loading}
            />
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
                <button
                  onClick={() => setIsReportArchiveOpen(true)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase text-secondary tracking-widest hover:brightness-125 transition-all"
                >
                  <Archive size={14} /> Archives
                </button>
              </div>
            </div>

            <ReportList
              reports={accessibleReports}
              type="team"
              onView={onViewReport}
              onArchive={onArchive}
              onPrint={handlePrintReport}
              loading={loading}
            />
          </div>
        )}
      </div>

      {/* ✅ MODALE - Détails du Rapport */}
      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title="Détails du Document" size="lg">
        {selectedReport && (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between p-6 rounded-[2rem] bg-gradient-to-r from-secondary/5 via-white/40 to-transparent dark:from-secondary/10 dark:via-theme-surface/40 dark:to-transparent border border-secondary/20 shadow-inner backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 dark:bg-black/10 mix-blend-overlay pointer-events-none" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="p-4 bg-secondary/20 rounded-[1.5rem] text-secondary shadow-[0_0_20px_rgba(var(--secondary-rgb),0.3)] backdrop-blur-md border border-secondary/30">
                  <FileText size={32} className="drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-theme-main tracking-tight line-clamp-1 drop-shadow-sm">{selectedReport.titre}</h3>
                  <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest mt-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> Émis par {selectedReport.authorName} le {formatDate(selectedReport.created_at)}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handlePrintReport(selectedReport)} className="relative z-10 rounded-2xl border-secondary/30 px-5 py-2.5 text-secondary hover:bg-secondary hover:text-white transition-all shadow-theme-sm group flex items-center gap-2 h-auto text-[10px] font-black uppercase tracking-widest">
                <Download className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" /> Tél. PDF
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 relative">
              <div className="p-6 bg-gradient-to-br from-theme-surface-hover/40 to-theme-surface/10 border border-theme-border-subtle rounded-[2rem] relative overflow-hidden group shadow-inner">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-all duration-700 text-secondary">
                  <CheckCircle2 size={80} />
                </div>
                <p className="text-[10px] font-black text-secondary uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(var(--secondary-rgb),0.6)]" /> I. Réalisations
                </p>
                <div className="bg-white/40 dark:bg-theme-surface/30 p-5 rounded-[1.5rem] border border-white/60 dark:border-theme-border-subtle shadow-sm backdrop-blur-sm">
                  <p className="text-[13px] text-theme-main font-medium leading-[1.8] whitespace-pre-wrap">
                    {selectedReport.realisations || 'Aucune réalisation renseignée.'}
                  </p>
                </div>
              </div>

              {selectedReport.difficultes_et_solutions && (
                <div className="p-6 bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-[2rem] relative overflow-hidden group shadow-inner">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-all duration-700 text-red-500">
                    <AlertTriangle size={80} />
                  </div>
                  <p className="text-[10px] font-black text-red-500 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" /> II. Difficultés & Solutions
                  </p>
                  <div className="bg-white/40 dark:bg-theme-surface/30 p-5 rounded-[1.5rem] border border-white/60 dark:border-theme-border-subtle shadow-sm backdrop-blur-sm">
                    <p className="text-[13px] text-theme-muted font-medium leading-[1.8] whitespace-pre-wrap">
                      {selectedReport.difficultes_et_solutions}
                    </p>
                  </div>
                </div>
              )}

              {selectedReport.commentaire && (
                <div className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-[2rem] relative overflow-hidden group shadow-inner">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-all duration-700 text-blue-500">
                    <Info size={80} />
                  </div>
                  <p className="text-[10px] font-black text-blue-500 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" /> III. Commentaires
                  </p>
                  <div className="bg-white/40 dark:bg-theme-surface/30 p-5 rounded-[1.5rem] border border-white/60 dark:border-theme-border-subtle shadow-sm backdrop-blur-sm text-blue-500/80 dark:text-blue-400">
                    <p className="text-[13px] font-medium leading-[1.8] whitespace-pre-wrap italic">
                      {selectedReport.commentaire}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {selectedReport.owner_user_id === currentUserId && (
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => onEdit(selectedReport)} className="flex-1 h-14 rounded-2xl border-theme-border-subtle font-black uppercase tracking-widest text-[10px] hover:bg-theme-surface-hover text-theme-main transition-all">
                  <Edit className="h-4 w-4 mr-2" /> Modifier
                </Button>
                <Button variant="outline" className="flex-1 h-14 rounded-2xl border-red-500/20 text-red-500 hover:bg-red-500/10 font-black uppercase tracking-widest text-[10px] transition-all" onClick={() => onDelete(selectedReport)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ✅ MODALE - Édition du Rapport */}
      <Modal isOpen={!!editingReport} onClose={() => setEditingReport(null)} title="Révision du Rapport" size="lg">
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Titre du rapport</label>
            <input
              value={reportEditForm.titre}
              onChange={e => setReportEditForm((prev: any) => ({ ...prev, titre: e.target.value }))}
              placeholder="Rectifier le titre..."
              className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all placeholder:text-theme-muted/30 shadow-inner"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Contenu des réalisations</label>
            <textarea
              value={reportEditForm.realisations}
              onChange={e => setReportEditForm((prev: any) => ({ ...prev, realisations: e.target.value }))}
              placeholder="Décrivez vos accomplissements..."
              className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-medium h-48 resize-none transition-all custom-scrollbar shadow-inner shadow-black/10"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Difficultés rencontrées</label>
              <textarea
                value={reportEditForm.difficultes_et_solutions}
                onChange={e => setReportEditForm((prev: any) => ({ ...prev, difficultes_et_solutions: e.target.value }))}
                placeholder="Obstacles et solutions..."
                className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-medium h-32 resize-none transition-all shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Commentaires finaux</label>
              <textarea
                value={reportEditForm.commentaire}
                onChange={e => setReportEditForm((prev: any) => ({ ...prev, commentaire: e.target.value }))}
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
                onChange={e => setReportEditForm((prev: any) => ({ ...prev, periode_debut: e.target.value }))}
                className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-4 py-3 text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Période fin</label>
              <input
                type="date"
                value={reportEditForm.periode_fin}
                onChange={e => setReportEditForm((prev: any) => ({ ...prev, periode_fin: e.target.value }))}
                className="w-full bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-4 py-3 text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold"
              />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={() => setEditingReport(null)} className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] border-theme-border-subtle text-theme-muted hover:text-theme-main transition-all">Annuler</Button>
            <Button onClick={onUpdate} disabled={loading || !reportEditForm.titre.trim()} className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-theme-md transition-all">Enregistrer les modifications</Button>
          </div>
        </div>
      </Modal>

      {/* ✅ MODALE - Archives des rapports */}
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
                <button onClick={() => { onViewReport(report); setIsReportArchiveOpen(false); }} className="text-left min-w-0 flex-1">
                  <p className="font-black text-sm text-theme-main truncate mb-1 group-hover/archive:text-secondary transition-colors">{report.titre}</p>
                  <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">{report.authorName} · {formatDate(report.created_at)}</p>
                </button>
                <Button variant="outline" size="sm" onClick={() => onUnarchive(report.id)} className="rounded-xl border-theme-border-subtle font-black uppercase text-[9px] tracking-widest px-4 hover:bg-theme-surface-hover shadow-theme-sm transition-all text-theme-main">
                  Désarchiver
                </Button>
              </GlassCard>
            ))
          )}
        </div>
      </Modal>
    </motion.div>
  );
};
