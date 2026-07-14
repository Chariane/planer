// frontend/src/pages/app/components/tools/shared/ReportList.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Eye, Download, Trash2, Archive, Edit, User, Calendar, Clock } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { MemberAvatar } from '../../../../../components/ui/MemberAvatar';
import { StatusBadge } from './StatusBadge';

interface ReportItem {
  id: string;
  titre: string;
  realisations?: string;
  difficultes_et_solutions?: string;
  commentaire?: string;
  created_at?: string;
  updated_at?: string;
  authorName?: string;
  owner_user_id?: string | null;
  id_membre?: string | null;
  periode_debut?: string;
  periode_fin?: string;
  status?: string;
  fichier_joint?: string;
}

interface ReportListProps {
  reports: ReportItem[];
  type: 'personal' | 'team' | 'archive';
  loading?: boolean;
  onView?: (report: ReportItem) => void;
  onEdit?: (report: ReportItem) => void;
  onDelete?: (report: ReportItem) => void;
  onArchive?: (reportId: string) => void;
  onUnarchive?: (reportId: string) => void;
  onPrint?: (report: ReportItem) => void;
  getAuthorName?: (report: ReportItem) => string;
  formatDate?: (date?: string | null) => string;
  formatPeriod?: (start?: string | null, end?: string | null) => string;
  members?: any[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  showPeriod?: boolean;
  showStatus?: boolean;
  maxItems?: number;
  gridCols?: 1 | 2 | 3;
}

const formatDateDefault = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatPeriodDefault = (start?: string | null, end?: string | null) => {
  if (!start && !end) return '';
  const startStr = start ? formatDateDefault(start) : 'Début';
  const endStr = end ? formatDateDefault(end) : 'Fin';
  return `${startStr} → ${endStr}`;
};

export const ReportList = ({
  reports,
  type,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  onPrint,
  getAuthorName,
  formatDate = formatDateDefault,
  formatPeriod = formatPeriodDefault,
  members = [],
  emptyTitle,
  emptyDescription,
  className = '',
  showPeriod = true,
  showStatus = false,
  maxItems,
  gridCols = 2,
}: ReportListProps) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-${gridCols} gap-4 ${className}`}>
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-theme-surface-hover/20 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const getDefaultEmptyTitle = () => {
    if (type === 'personal') return 'Aucun historique';
    if (type === 'team') return 'Aucun rapport reçu';
    return 'Archives vides';
  };

  const getDefaultEmptyDescription = () => {
    if (type === 'personal') return 'Vous n\'avez pas encore envoyé de rapport.';
    if (type === 'team') return 'Les rapports des membres apparaîtront ici.';
    return 'Les rapports que vous archivez seront rangés ici.';
  };

  const displayReports = maxItems ? reports.slice(0, maxItems) : reports;

  if (displayReports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={emptyTitle || getDefaultEmptyTitle()}
        description={emptyDescription || getDefaultEmptyDescription()}
        className={className}
      />
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-${gridCols} gap-4 ${className}`}>
      <AnimatePresence mode="popLayout">
        {displayReports.map((report, i) => {
          const authorName = getAuthorName ? getAuthorName(report) : report.authorName || 'Utilisateur';
          const isOwner = type === 'personal';
          const periodStr = showPeriod ? formatPeriod(report.periode_debut, report.periode_fin) : '';

          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                className="p-5 group hover:bg-theme-surface-hover/40 transition-all border border-theme-border-subtle bg-theme-surface rounded-2xl cursor-pointer h-full flex flex-col justify-between shadow-theme-sm hover:shadow-theme-md hover:border-secondary/20"
                onClick={() => onView?.(report)}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-xl ${
                      type === 'personal' 
                        ? 'bg-secondary/10 border border-secondary/20 text-secondary'
                        : 'bg-primary/10 border border-primary/20 text-primary'
                    }`}>
                      <FileText size={18} />
                    </div>
                    <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                      {isOwner && onEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(report); }}
                          className="p-1.5 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all"
                          title="Modifier"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      {isOwner && onDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(report); }}
                          className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {type === 'team' && onArchive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onArchive(report.id); }}
                          className="p-1.5 hover:bg-amber-500/10 text-amber-500 rounded-lg transition-all"
                          title="Archiver"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                      {type === 'archive' && onUnarchive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUnarchive(report.id); }}
                          className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded-lg transition-all"
                          title="Désarchiver"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                      {onPrint && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onPrint(report); }}
                          className="p-1.5 hover:bg-gray-500/10 text-gray-500 rounded-lg transition-all"
                          title="Imprimer / PDF"
                        >
                          <Download size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h5 className="font-black text-theme-main text-sm line-clamp-1 flex-1">
                      {report.titre}
                    </h5>
                    {showStatus && report.status && (
                      <StatusBadge status={report.status} size="sm" />
                    )}
                  </div>

                  <p className="text-[10px] font-black text-theme-muted/40 uppercase tracking-widest mb-3">
                    {formatDate(report.created_at)} · {authorName}
                  </p>

                  {showPeriod && periodStr && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-theme-muted/60 mb-2">
                      <Calendar size={12} className="shrink-0" />
                      <span>{periodStr}</span>
                    </div>
                  )}

                  <p className="text-xs text-theme-muted line-clamp-3 font-medium leading-relaxed mb-4">
                    {report.realisations || 'Aucune réalisation renseignée.'}
                  </p>

                  {report.fichier_joint && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-theme-muted/40 mb-3">
                      <PaperclipIcon size={12} className="shrink-0" />
                      <span className="truncate">{report.fichier_joint}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-theme-border-subtle">
                  <div className="flex items-center gap-2 min-w-0">
                    <MemberAvatar
                      member={{ username: authorName } as any}
                      size="xs"
                      className="shrink-0"
                    />
                    <span className="text-[10px] font-black text-theme-main uppercase tracking-tight truncate">
                      {authorName}
                    </span>
                  </div>
                  {onView && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onView(report); }}
                      className="text-[10px] font-black text-secondary/60 hover:text-secondary uppercase tracking-widest transition-colors"
                    >
                      Voir
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// Composant helper pour Paperclip (si pas déjà importé)
const PaperclipIcon = ({ size, className }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size || 16}
    height={size || 16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

// Composant ReportCard pour une utilisation flexible
export const ReportCard = ({
  report,
  type = 'personal',
  onView,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  onPrint,
  getAuthorName,
  formatDate = formatDateDefault,
  formatPeriod = formatPeriodDefault,
  showPeriod = true,
  showStatus = false,
  className = '',
}: {
  report: ReportItem;
  type?: 'personal' | 'team' | 'archive';
  onView?: (report: ReportItem) => void;
  onEdit?: (report: ReportItem) => void;
  onDelete?: (report: ReportItem) => void;
  onArchive?: (reportId: string) => void;
  onUnarchive?: (reportId: string) => void;
  onPrint?: (report: ReportItem) => void;
  getAuthorName?: (report: ReportItem) => string;
  formatDate?: (date?: string | null) => string;
  formatPeriod?: (start?: string | null, end?: string | null) => string;
  showPeriod?: boolean;
  showStatus?: boolean;
  className?: string;
}) => {
  const authorName = getAuthorName ? getAuthorName(report) : report.authorName || 'Utilisateur';
  const isOwner = type === 'personal';
  const periodStr = showPeriod ? formatPeriod(report.periode_debut, report.periode_fin) : '';

  return (
    <div
      className={`p-5 group hover:bg-theme-surface-hover/40 transition-all border border-theme-border-subtle bg-theme-surface rounded-2xl cursor-pointer h-full flex flex-col justify-between shadow-theme-sm hover:shadow-theme-md hover:border-secondary/20 ${className}`}
      onClick={() => onView?.(report)}
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className={`p-2 rounded-xl ${
            type === 'personal' 
              ? 'bg-secondary/10 border border-secondary/20 text-secondary'
              : 'bg-primary/10 border border-primary/20 text-primary'
          }`}>
            <FileText size={18} />
          </div>
          <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            {isOwner && onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(report); }}
                className="p-1.5 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all"
                title="Modifier"
              >
                <Edit size={14} />
              </button>
            )}
            {isOwner && onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(report); }}
                className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
                title="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            )}
            {type === 'team' && onArchive && (
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(report.id); }}
                className="p-1.5 hover:bg-amber-500/10 text-amber-500 rounded-lg transition-all"
                title="Archiver"
              >
                <Archive size={14} />
              </button>
            )}
            {type === 'archive' && onUnarchive && (
              <button
                onClick={(e) => { e.stopPropagation(); onUnarchive(report.id); }}
                className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded-lg transition-all"
                title="Désarchiver"
              >
                <Archive size={14} />
              </button>
            )}
            {onPrint && (
              <button
                onClick={(e) => { e.stopPropagation(); onPrint(report); }}
                className="p-1.5 hover:bg-gray-500/10 text-gray-500 rounded-lg transition-all"
                title="Imprimer / PDF"
              >
                <Download size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between gap-2 mb-1">
          <h5 className="font-black text-theme-main text-sm line-clamp-1 flex-1">
            {report.titre}
          </h5>
          {showStatus && report.status && (
            <StatusBadge status={report.status} size="sm" />
          )}
        </div>

        <p className="text-[10px] font-black text-theme-muted/40 uppercase tracking-widest mb-3">
          {formatDate(report.created_at)} · {authorName}
        </p>

        {showPeriod && periodStr && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-theme-muted/60 mb-2">
            <Calendar size={12} className="shrink-0" />
            <span>{periodStr}</span>
          </div>
        )}

        <p className="text-xs text-theme-muted line-clamp-3 font-medium leading-relaxed mb-4">
          {report.realisations || 'Aucune réalisation renseignée.'}
        </p>

        {report.fichier_joint && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-theme-muted/40 mb-3">
            <PaperclipIcon size={12} className="shrink-0" />
            <span className="truncate">{report.fichier_joint}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-theme-border-subtle">
        <div className="flex items-center gap-2 min-w-0">
          <MemberAvatar
            member={{ username: authorName } as any}
            size="xs"
            className="shrink-0"
          />
          <span className="text-[10px] font-black text-theme-main uppercase tracking-tight truncate">
            {authorName}
          </span>
        </div>
        {onView && (
          <button
            onClick={(e) => { e.stopPropagation(); onView(report); }}
            className="text-[10px] font-black text-secondary/60 hover:text-secondary uppercase tracking-widest transition-colors"
          >
            Voir
          </button>
        )}
      </div>
    </div>
  );
};
