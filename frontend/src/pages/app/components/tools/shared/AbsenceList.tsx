// frontend/src/pages/app/components/tools/shared/AbsenceList.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, AlertTriangle, XCircle, CheckCircle2, Archive, Users } from 'lucide-react';
import { GlassCard } from '../../../../../components/ui/GlassCard';
import { AvailabilityBadge } from '../../../../../components/ui/AvailabilityBadge';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';

interface AbsenceItem {
  id: string;
  is_absence: boolean;
  date_debut: string;
  date_fin?: string | null;
  statut: string;
  motif?: string;
  authorName?: string;
  owner_user_id?: string | null;
  owner_name?: string;
  decision_commentaire?: string | null;
  decision_by_name?: string | null;
  decision_at?: string | null;
}

interface AbsenceListProps {
  absences: AbsenceItem[];
  type: 'personal' | 'pending' | 'calendar' | 'impact' | 'archive';
  loading?: boolean;
  onApprove?: (absence: AbsenceItem) => void;
  onReject?: (absence: AbsenceItem) => void;
  onCancel?: (absence: AbsenceItem) => void;
  onArchive?: (absenceId: string) => void;
  onUnarchive?: (absenceId: string) => void;
  onViewImpact?: (absence: AbsenceItem) => void;
  formatDate?: (date?: string | null) => string;
  getDurationDisplay?: (startDate: string, endDate?: string | null) => string;
  listAvailability?: any[];
  currentUserId?: string | null;
  isManager?: boolean;
  isDirectResourceAdmin?: boolean;
  isDirectResourceCreator?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  absenceView?: string;
}

const formatDateDefault = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
};

const getDurationDisplayDefault = (startDate: string, endDate?: string | null) => {
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

export const AbsenceList = ({
  absences,
  type,
  loading = false,
  onApprove,
  onReject,
  onCancel,
  onArchive,
  onUnarchive,
  onViewImpact,
  formatDate = formatDateDefault,
  getDurationDisplay = getDurationDisplayDefault,
  listAvailability = [],
  currentUserId,
  isManager = false,
  isDirectResourceAdmin = false,
  isDirectResourceCreator = false,
  emptyTitle,
  emptyDescription,
  absenceView,
}: AbsenceListProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-theme-surface-hover/20 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const getDefaultEmptyTitle = () => {
    if (type === 'personal') return 'Aucune demande personnelle';
    if (type === 'pending') return 'Aucune demande à traiter';
    if (type === 'calendar') return 'Calendrier vide';
    if (type === 'archive') return 'Archives vides';
    return 'Aucun impact à surveiller';
  };

  const getDefaultEmptyDescription = () => {
    if (type === 'personal') return 'Vous n\'avez pas encore fait de demande.';
    if (type === 'pending') return 'Toutes les demandes ont été traitées.';
    if (type === 'calendar') return 'Aucune absence approuvée à venir.';
    if (type === 'archive') return 'Les demandes que vous archivez seront rangées ici.';
    return 'Aucune absence approuvée en cours.';
  };

  if (absences.length === 0) {
    return (
      <EmptyState
        icon={type === 'calendar' || type === 'archive' ? Calendar : AlertTriangle}
        title={emptyTitle || getDefaultEmptyTitle()}
        description={emptyDescription || getDefaultEmptyDescription()}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {absences.map((absence) => {
          const isOwn = absence.owner_user_id === currentUserId;
          const statusDisplay = absence.statut || 'en_attente';
          const isArchive = type === 'archive';
          
          const typeCfg = absence.is_absence
            ? { color: 'amber', icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500' }
            : { color: 'primary', icon: Calendar, bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' };

          const isUrgentAbsence = absence.is_absence && statusDisplay === 'en_attente' && 
            new Date(absence.date_debut).toDateString() === new Date().toDateString();

          const durationDisplay = getDurationDisplay(absence.date_debut, absence.date_fin);
          const availability = listAvailability.find(a => a.id_utilisateur === absence.owner_user_id);

          return (
            <motion.div
              key={absence.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard
                className={`p-5 border-theme-border-subtle hover:bg-theme-surface-hover/40 transition-all group/card ${
                  absence.is_absence ? 'hover:border-amber-500/30' : 'hover:border-primary/30'
                }`}
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
                  <StatusBadge status={statusDisplay} />
                </div>

                <div className="mb-4">
                  <p className="font-black text-theme-main text-sm mb-1">
                    {absence.is_absence ? 'Absence' : 'Congé'}
                  </p>
                  <div className="flex items-center gap-2">
                    <AvailabilityBadge availability={availability} />
                    <p className="text-[10px] font-black text-theme-muted/40 uppercase tracking-widest">
                      {absence.authorName || absence.owner_name || 'Utilisateur'}
                    </p>
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

                {absence.motif && (
                  <p className="text-[11px] text-theme-muted italic mb-3 font-medium line-clamp-2">
                    "{absence.motif}"
                  </p>
                )}

                {(absence.decision_commentaire || absence.decision_by_name) && (
                  <div className="mb-6 rounded-xl border border-theme-border-subtle bg-theme-surface-hover/30 p-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-theme-muted">
                      Décision {absence.decision_by_name ? `par ${absence.decision_by_name}` : ''}
                      {absence.decision_at ? ` · ${formatDate(absence.decision_at)}` : ''}
                    </p>
                    {absence.decision_commentaire && (
                      <p className="mt-1 text-[11px] font-bold text-theme-main line-clamp-2">
                        {absence.decision_commentaire}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-4 border-t border-theme-border-subtle">
                  {/* ✅ Bouton Vérifier Impact - pour les demandes en attente */}
                  {statusDisplay === 'en_attente' && type === 'pending' && onViewImpact && (
                    <button
                      onClick={() => onViewImpact(absence)}
                      className="w-full py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary text-[10px] font-black uppercase rounded-lg transition-all border border-secondary/10"
                    >
                      Vérifier Impact
                    </button>
                  )}

                  {/* ✅ Boutons Approuver/Rejeter - pour les demandes en attente */}
                  {statusDisplay === 'en_attente' && type === 'pending' && onApprove && onReject && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onApprove(absence)}
                        className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase rounded-lg transition-all border border-emerald-500/10"
                      >
                        Approuver
                      </button>
                      <button
                        onClick={() => onReject(absence)}
                        className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase rounded-lg transition-all border border-red-500/10"
                      >
                        Rejeter
                      </button>
                    </div>
                  )}

                  {/* ✅ Bouton Annuler/Retirer - pour les demandes personnelles */}
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const start = new Date(absence.date_debut);
                    start.setHours(0, 0, 0, 0);

                    const canCancel = isOwn && (
                      statusDisplay === 'en_attente' ||
                      (statusDisplay === 'approuvee' && today < start)
                    );

                    if (!canCancel) return null;

                    return (
                      <button
                        onClick={() => onCancel?.(absence)}
                        className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-black uppercase rounded-lg transition-all border border-rose-500/10 flex items-center justify-center gap-2"
                      >
                        <XCircle size={14} />
                        {statusDisplay === 'en_attente' ? 'Retirer la demande' : 'Annuler la demande'}
                      </button>
                    );
                  })()}

                  {/* ✅ Bouton Archiver/Désarchiver - pour les demandes traitées ou archivées */}
                  {statusDisplay !== 'en_attente' && onArchive && onUnarchive && (
                    <button
                      onClick={() => {
                        if (isArchive) {
                          onUnarchive(absence.id);
                        } else {
                          onArchive(absence.id);
                        }
                      }}
                      className="w-full py-2 bg-theme-surface-hover/50 hover:bg-theme-surface-hover text-theme-muted text-[10px] font-black uppercase rounded-lg transition-all border border-theme-border-subtle flex items-center justify-center gap-2"
                    >
                      <Archive size={12} />
                      {isArchive ? 'Désarchiver' : 'Archiver'}
                    </button>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};