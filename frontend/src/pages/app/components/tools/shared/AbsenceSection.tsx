// frontend/src/pages/app/components/tools/shared/AbsenceSection.tsx
import { motion } from 'framer-motion';
import { 
  Calendar, Plus, Check, Archive, AlertTriangle, Users, 
  FileText, XCircle, Loader2, ShieldAlert, Eye
} from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { Button } from '../../../../../components/ui/Button';
import { GlassCard } from '../../../../../components/ui/GlassCard';
import Modal from '../../../../../components/ui/Modal';
import { AbsenceList } from './AbsenceList';
import { toast } from '../../../../../components/ui/Toast';
import { ROLES } from '../../../../../lib/roleHierarchy';
import { CalendarView } from './CalendarView';
import { ImpactedTasksList } from './ImpactedTasksList';

interface AbsenceSectionProps {
  // Données
  absences: any[];
  ownAbsences: any[];
  accessibleAbsences: any[];
  pendingAbsences: any[];
  visibleAbsences: any[];
  calendarAbsences: any[];
  archivedAbsences: any[];
  loading: boolean;
  
  // Permissions
  canCreateAbsence: boolean;
  canViewOwnAbsenceRequests: boolean;
  isManager: boolean;
  isDirectResourceCreator?: boolean;
  isDirectResourceAdmin?: boolean;
  currentUserId?: string | null;
  
  // États
  absenceView: 'mine' | 'pending' | 'calendar' | 'impact';
  setAbsenceView: (view: 'mine' | 'pending' | 'calendar' | 'impact') => void;
  absenceForm: any;
  setAbsenceForm: React.Dispatch<React.SetStateAction<any>>;
  isAbsentModalOpen: boolean;
  setIsAbsentModalOpen: (open: boolean) => void;
  isAbsenceArchiveOpen: boolean;
  setIsAbsenceArchiveOpen: (open: boolean) => void;
  absenceDashboard: any;
  decisionTarget: any;
  decisionAction: 'approve' | 'reject' | null;
  decisionComment: string;
  setDecisionComment: (comment: string) => void;
  selectedAbsenceForImpact: any;
  setSelectedAbsenceForImpact: (absence: any) => void;
  absenceImpacts: Record<string, any>;
  listAvailability: any[];
  availabilityLoading: boolean;
  taskReplacementByTaskId: Record<string, string>;
  setTaskReplacementByTaskId: (data: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  adminCandidateUserId: string;
  setAdminCandidateUserId: (id: string) => void;
  adminInviteIdentifier: string;
  setAdminInviteIdentifier: (id: string) => void;
  eligibleInheritedMembers: any[];
  resourceType: 'liste' | 'espace' | 'workspace';
  directMembers: any[];
  isDirectMemberRecord: any;
  showNoReplacementNotification: boolean;
  setShowNoReplacementNotification: (show: boolean) => void;
  noReplacementTaskId: string | null;
  setNoReplacementTaskId: (id: string | null) => void;

  // ✅ Nouvelle prop
  isLoadingImpacts?: boolean;
  
  // Actions
  onCreate: () => void;
  onApprove: (absence: any) => void;
  onReject: (absence: any) => void;
  onCancel: (absence: any) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDecision: () => void;
  onCloseDecision: () => void;
  onAssignReplacement: (task: any, absence: any) => void;
  onAddBackupAdmin: () => void;
  onViewImpact: (absence: any) => void;
  getTasksImpactedByAbsence: (absence: any) => any[];
  getSortedReplacementCandidates: (task: any, absence: any) => any[];
  formatDate?: (date?: string | null) => string;
  getDurationDisplay?: (start: string, end?: string | null) => string;
}

export const AbsenceSection = ({
  absences,
  ownAbsences,
  accessibleAbsences,
  pendingAbsences,
  visibleAbsences,
  calendarAbsences,
  archivedAbsences,
  loading,
  canCreateAbsence,
  canViewOwnAbsenceRequests,
  isManager,
  isDirectResourceCreator,
  isDirectResourceAdmin,
  currentUserId,
  absenceView,
  setAbsenceView,
  absenceForm,
  setAbsenceForm,
  isAbsentModalOpen,
  setIsAbsentModalOpen,
  isAbsenceArchiveOpen,
  setIsAbsenceArchiveOpen,
  absenceDashboard,
  decisionTarget,
  decisionAction,
  decisionComment,
  setDecisionComment,
  selectedAbsenceForImpact,
  setSelectedAbsenceForImpact,
  absenceImpacts,
  listAvailability,
  availabilityLoading,
  taskReplacementByTaskId,
  setTaskReplacementByTaskId,
  adminCandidateUserId,
  setAdminCandidateUserId,
  adminInviteIdentifier,
  setAdminInviteIdentifier,
  eligibleInheritedMembers,
  resourceType,
  directMembers,
  isDirectMemberRecord,
  showNoReplacementNotification,
  setShowNoReplacementNotification,
  noReplacementTaskId,
  setNoReplacementTaskId,
  isLoadingImpacts = false,
  onCreate,
  onApprove,
  onReject,
  onCancel,
  onArchive,
  onUnarchive,
  onDecision,
  onCloseDecision,
  onAssignReplacement,
  onAddBackupAdmin,
  onViewImpact,
  getTasksImpactedByAbsence,
  getSortedReplacementCandidates,
  formatDate,
  getDurationDisplay,
}: AbsenceSectionProps) => {
  
  // Fonction renderAbsenceList avec type correct
  const renderAbsenceList = (items: any[], emptyLabel: string) => {
    let listType: 'personal' | 'pending' | 'calendar' | 'impact' | 'archive' = 'personal';
    
    if (absenceView === 'pending') {
      listType = 'pending';
    } else if (absenceView === 'calendar') {
      listType = 'calendar';
    } else if (absenceView === 'impact') {
      listType = 'impact';
    } else {
      listType = 'personal';
    }
    
    const isPendingView = absenceView === 'pending';
    
    return (
      <AbsenceList
        absences={items}
        type={listType}
        onApprove={isPendingView ? onApprove : undefined}
        onReject={isPendingView ? onReject : undefined}
        onCancel={onCancel}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onViewImpact={onViewImpact}
        listAvailability={listAvailability}
        currentUserId={currentUserId}
        isManager={isManager}
        isDirectResourceAdmin={isDirectResourceAdmin}
        isDirectResourceCreator={isDirectResourceCreator}
        formatDate={formatDate}
        getDurationDisplay={getDurationDisplay}
        emptyTitle={emptyLabel}
        absenceView={absenceView}
      />
    );
  };

  return (
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

      {/* Tableau de bord */}
      {isManager && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Indisponibles aujourd'hui", value: absenceDashboard.unavailableToday, tone: 'text-rose-500', icon: Users },
            { label: 'Demandes en attente', value: absenceDashboard.pending, tone: 'text-amber-500', icon: AlertTriangle },
            { label: 'Absences à venir', value: absenceDashboard.upcoming, tone: 'text-primary', icon: Calendar },
            { label: resourceType === 'liste' ? 'Tâches impactées' : 'Projets impactés', 
              value: absenceDashboard.impactedTasks || absenceDashboard.impactedProjectsCount, 
              tone: 'text-secondary', 
              icon: FileText },
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

      {/* Onglets */}
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
            className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              absenceView === tab.id 
                ? 'bg-primary/10 text-primary shadow-inner' 
                : 'text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main'
            }`}
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

      {/* Contenu - Mes demandes */}
      {absenceView === 'mine' && renderAbsenceList(ownAbsences, 'Aucune demande personnelle')}

      {/* Contenu - Demandes à traiter */}
      {absenceView === 'pending' && renderAbsenceList(pendingAbsences, 'Aucune demande à traiter')}

      {/* Contenu - Calendrier */}
      {absenceView === 'calendar' && (
        <CalendarView
          absences={calendarAbsences.filter(a => a && a.statut === 'approuvee')}
          listAvailability={listAvailability}
          currentUserId={currentUserId}
          members={directMembers}
          formatDate={formatDate}
          getDurationDisplay={getDurationDisplay}
          onViewAbsence={(absence) => {
            onViewImpact?.(absence);
          }}
        />
      )}

      {/* ✅ Contenu - Impact (amélioré pour espaces/workspaces) */}
      {absenceView === 'impact' && (
        <div className="space-y-6">
          {/* Spinner de chargement des impacts */}
          {isLoadingImpacts && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-secondary/60" />
              <span className="ml-3 text-sm text-theme-muted">Chargement des impacts...</span>
            </div>
          )}

          {!isLoadingImpacts && visibleAbsences.filter(a => a.statut === 'approuvee').length === 0 && (
            <div className="py-16 text-center opacity-30 border-2 border-dashed border-theme-border-subtle rounded-3xl bg-theme-surface-hover/20">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-theme-muted" />
              <p className="font-black text-[10px] uppercase tracking-widest">Aucun impact à surveiller</p>
              <p className="text-[10px] text-theme-muted/50 mt-1">Aucune absence approuvée en cours.</p>
            </div>
          )}

          {!isLoadingImpacts && visibleAbsences.filter(a => a.statut === 'approuvee').length > 0 && (
            visibleAbsences
              .filter(a => a.statut === 'approuvee')
              .map(absence => {
                // Récupération des données d'impact
                const impactData = absenceImpacts[absence.id];
                const impactedTasks = resourceType === 'liste' ? getTasksImpactedByAbsence(absence) : [];
                const impactedProjects = resourceType !== 'liste' && impactData?.impacted_projects ? impactData.impacted_projects : [];
                const showTasks = impactedTasks.length > 0;
                const showProjects = impactedProjects.length > 0;

                return (
                  <GlassCard key={absence.id} className="p-6 border-theme-border-subtle bg-theme-surface/70 hover:border-secondary/20 transition-all">
                    {/* En-tête de l'absence */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                            absence.is_absence ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                          }`}>
                            {absence.is_absence ? 'Absence' : 'Congé'}
                          </span>
                          <span className="rounded-full border border-theme-border-subtle bg-theme-surface-hover/50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-theme-muted">
                            {absence.statut.replace('_', ' ')}
                          </span>
                          {absence.motif && (
                            <span className="text-[10px] text-theme-muted/60 italic truncate max-w-[200px]">
                              "{absence.motif}"
                            </span>
                          )}
                        </div>
                        <p className="text-base font-black text-theme-main flex items-center gap-2">
                          {absence.authorName || absence.owner_name || 'Utilisateur'}
                          <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">
                            · {getDurationDisplay?.(absence.date_debut, absence.date_fin) || ''}
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-theme-muted">
                          {formatDate?.(absence.date_debut)} → {formatDate?.(absence.date_fin)}
                        </p>
                      </div>
                      
                      {/* Indicateur d'impact */}
                      <div className={`rounded-2xl border px-4 py-3 text-right ${
                        (showTasks || showProjects) ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'
                      }`}>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${
                          (showTasks || showProjects) ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {(showTasks || showProjects) ? '⚠️ Action recommandée' : '✅ Impact faible'}
                        </p>
                        <p className="mt-1 text-xs font-bold text-theme-main">
                          {showTasks 
                            ? `${impactedTasks.length} tâche(s) impactée(s)` 
                            : showProjects
                              ? `${impactedProjects.length} projet(s) impacté(s)`
                              : 'Aucun impact'
                          }
                        </p>
                        {(showTasks || showProjects) && (
                          <p className="text-[9px] text-theme-muted/60 mt-0.5">
                            {showTasks 
                              ? impactedTasks.filter(t => t.priority === 'critique' || t.priority === 'haute').length
                              : impactedProjects.filter((p: any) => p.role === 'Administrateur' || p.role === 'Créateur').length
                            } prioritaire(s)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ✅ Liste des tâches impactées (pour les listes uniquement) */}
                    {showTasks && (
                      <div className="mt-4 pt-4 border-t border-theme-border-subtle">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">
                            Tâches impactées par l'absence
                          </p>
                          <span className="ml-auto text-[10px] font-black text-theme-muted/50">
                            {impactedTasks.length} tâche{impactedTasks.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        <ImpactedTasksList
                          tasks={impactedTasks}
                          absence={absence}
                          onAssignReplacement={(task) => {
                            onAssignReplacement?.(task, absence);
                          }}
                          onViewTask={(task) => {
                            window.open(`/tache/${task.id}`, '_blank');
                          }}
                          isLoading={availabilityLoading}
                        />
                      </div>
                    )}

                    {/* ✅ Liste des projets impactés (pour espaces/workspaces) */}
                    {showProjects && (
                      <div className="mt-4 pt-4 border-t border-theme-border-subtle">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">
                            Projets impactés par l'absence
                          </p>
                          <span className="ml-auto text-[10px] font-black text-theme-muted/50">
                            {impactedProjects.length} projet{impactedProjects.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {impactedProjects.map((project: any) => (
                            <div key={project.id} className="p-4 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl hover:bg-theme-surface-hover/40 transition-all group">
                              <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                  <RouterLink 
                                    to={`/liste/${project.id}`}
                                    className="text-sm font-black text-theme-main truncate hover:text-secondary hover:underline flex items-center gap-2"
                                  >
                                    {project.nom}
                                    <Eye size={14} className="shrink-0 opacity-50 group-hover:opacity-100" />
                                  </RouterLink>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mt-1">
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
                  </GlassCard>
                );
              })
          )}
        </div>
      )}

      {/* ✅ MODALE - Création d'absence/congé */}
      <Modal isOpen={isAbsentModalOpen} onClose={() => setIsAbsentModalOpen(false)} title="Signaler une Absence ou Demander un Congé" size="lg">
        <div className="pt-2">
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-primary/5 border border-primary/10 p-3 sm:mb-8 sm:items-center sm:gap-4 sm:p-4">
            <div className="shrink-0 p-3 bg-primary rounded-xl text-white shadow-lg">
              <Calendar size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Formulaire de demande</p>
              <p className="text-xs font-medium text-theme-muted mt-1">Veuillez renseigner vos dates et le motif pour validation.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Nature de la demande</label>
              <div className="flex gap-2 p-1 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl">
                <button
                  onClick={() => setAbsenceForm((prev: any) => ({ ...prev, is_absence: true, is_conge_planifie: false }))}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    absenceForm.is_absence ? 'bg-amber-500 text-white shadow-lg' : 'text-theme-muted hover:text-theme-main'
                  }`}
                >
                  Absence
                </button>
                <button
                  onClick={() => setAbsenceForm((prev: any) => ({ ...prev, is_absence: false, is_conge_planifie: true }))}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    !absenceForm.is_absence ? 'bg-primary text-white shadow-lg' : 'text-theme-muted hover:text-theme-main'
                  }`}
                >
                  Congé
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Motif / Justification</label>
              <input
                value={absenceForm.motif}
                onChange={e => setAbsenceForm((prev: any) => ({ ...prev, motif: e.target.value }))}
                placeholder={absenceForm.is_absence ? "Maladie, urgence..." : "Repos, personnel..."}
                className="w-full h-14 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Date de début</label>
              <input
                type="date"
                value={absenceForm.date_debut}
                onChange={e => setAbsenceForm((prev: any) => ({ ...prev, date_debut: e.target.value }))}
                className="w-full h-14 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Date de fin</label>
              <input
                type="date"
                value={absenceForm.date_fin}
                onChange={e => setAbsenceForm((prev: any) => ({ ...prev, date_fin: e.target.value }))}
                className="w-full h-14 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl px-5 text-sm text-theme-main focus:ring-2 focus:ring-primary/20 outline-none font-bold appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => setIsAbsentModalOpen(false)} className="flex-1 h-14 rounded-2xl border-theme-border-subtle text-theme-muted font-black uppercase tracking-widest text-[10px]">Annuler</Button>
            <Button
              onClick={onCreate}
              disabled={loading || !absenceForm.date_debut}
              className={`flex-1 h-14 rounded-2xl shadow-premium-lg group ${
                absenceForm.is_absence ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'
              }`}
            >
              <Check size={20} className="mr-2 group-hover:scale-125 transition-transform" />
              <span className="font-black uppercase tracking-widest text-[10px]">{absenceForm.is_absence ? 'Signaler l\'absence' : 'Demander le congé'}</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* ✅ MODALE - Décision sur une demande */}
      <Modal
        isOpen={!!decisionTarget}
        onClose={onCloseDecision}
        title={decisionAction === 'approve' ? 'Approuver la demande' : 'Rejeter la demande'}
        size="md"
      >
        {decisionTarget && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Demande concernée</p>
              <p className="mt-2 text-sm font-black text-theme-main">{decisionTarget.authorName} · {decisionTarget.is_absence ? 'Absence' : 'Congé'}</p>
              <p className="mt-1 text-xs font-bold text-theme-muted">{formatDate?.(decisionTarget.date_debut)} → {formatDate?.(decisionTarget.date_fin)}</p>
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
              <Button variant="outline" onClick={onCloseDecision} className="flex-1 rounded-2xl border-theme-border-subtle text-theme-main">Annuler</Button>
              <Button
                onClick={onDecision}
                disabled={loading || (decisionAction === 'reject' && !decisionComment.trim())}
                className={`flex-1 rounded-2xl ${
                  decisionAction === 'reject' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {decisionAction === 'approve' ? 'Approuver' : 'Rejeter'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ✅ MODALE - Archives des demandes */}
      <Modal
        isOpen={isAbsenceArchiveOpen}
        onClose={() => setIsAbsenceArchiveOpen(false)}
        title="Archives des Demandes"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 sm:pr-3 custom-scrollbar pt-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          
          <AbsenceList
            absences={archivedAbsences}
            type="archive"
            onUnarchive={onUnarchive}
            onArchive={onArchive}
            listAvailability={listAvailability}
            currentUserId={currentUserId}
            isManager={isManager}
            formatDate={formatDate}
            getDurationDisplay={getDurationDisplay}
            emptyTitle="Aucune demande archivée"
            emptyDescription="Les demandes traitées que vous archivez seront rangées ici."
          />
        </div>
      </Modal>

      {/* ✅ MODALE - Impact d'une absence (détaillée) */}
      <Modal
        isOpen={!!selectedAbsenceForImpact}
        onClose={() => setSelectedAbsenceForImpact(null)}
        title="Analyse d'Impact de l'Absence"
        size="lg"
      >
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
              <div className={`border rounded-2xl p-4 flex gap-4 ${
                impactData.risk_level === 'eleve' ? 'bg-red-500/5 border-red-500/10' :
                impactData.risk_level === 'moyen' ? 'bg-amber-500/5 border-amber-500/10' :
                'bg-emerald-500/5 border-emerald-500/10'
              }`}>
                <AlertTriangle className={`h-6 w-6 shrink-0 ${
                  impactData.risk_level === 'eleve' ? 'text-red-500' :
                  impactData.risk_level === 'moyen' ? 'text-amber-500' :
                  'text-emerald-500'
                }`} />
                <div>
                  <p className="text-xs font-black text-theme-main uppercase tracking-widest mb-1">
                    Risque {impactData.risk_level || 'faible'}
                  </p>
                  <p className="text-[11px] text-theme-muted leading-relaxed">
                    Cette absence chevauche {impactData.overlapping_tasks?.length || 0} tâches.
                    ({impactData.high_priority_tasks?.length || 0} prioritaires, {impactData.overdue_tasks?.length || 0} en retard).
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

              {/* ✅ Correction du libellé "Ce sous-espace" */}
              {(impactData.sole_admin_resources?.length > 0 || impactData.sole_creator_resources?.length > 0) && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Alerte Gouvernance Critique</p>

                  {impactData.sole_admin_resources?.map((res: any) => (
                    <div key={res.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-theme-main">Admin Unique : {res.nom}</p>
                        <p className="text-[11px] text-theme-muted">
                          {res.type === 'liste' ? 'Cette liste' : res.type === 'espace' ? 'Cet espace' : 'Cette ressource'} n'aura plus d'admin actif durant l'absence.
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
                          {res.type === 'liste' ? 'Cette liste' : res.type === 'espace' ? 'Cet espace' : 'Cette ressource'} n'aura plus de créateur direct actif.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isPendingAdminRequest && needsBackupAdmin && (
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
                          onClick={onAddBackupAdmin}
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

              {selectedAbsenceForImpact.author_role === ROLES.MEMBER && impactData.overlapping_tasks?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Tâches impactées & Réaffectation</p>
                  <div className="space-y-4">
                    {impactData.overlapping_tasks.map((t: any) => {
                      const task = t;
                      const candidates = getSortedReplacementCandidates(task, selectedAbsenceForImpact);

                      return (
                        <div key={task.id} className="p-4 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="min-w-0">
                              <RouterLink to={`/tache/${task.id}`} className="text-sm font-black text-theme-main truncate hover:text-secondary hover:underline flex items-center gap-2">
                                {task.title}
                                <Eye size={12} className="shrink-0" />
                              </RouterLink>
                              <p className="text-[9px] text-theme-muted uppercase font-black mt-1">
                                Échéance: {formatDate?.(task.dueDate)} · {task.priority}
                              </p>
                            </div>
                            <div className="flex -space-x-2">
                              {task.assignees?.map((a: any) => (
                                <div key={a.id} className="h-6 w-6 rounded-lg bg-theme-surface border border-theme-border-subtle flex items-center justify-center text-[8px] font-black" title={a.name}>
                                  {a.name.substring(0, 2).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-[1fr_auto]">
                            {availabilityLoading ? (
                              <div className="flex items-center gap-2 col-span-2 py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                                <span className="text-xs text-theme-muted">Vérification des disponibilités...</span>
                              </div>
                            ) : (
                              <>
                                <select
                                  value={taskReplacementByTaskId[task.id] || ''}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    setTaskReplacementByTaskId((prev: Record<string, string>) => ({ ...prev, [task.id]: newValue }));
                                  }}
                                  className="min-w-0 h-10 rounded-xl border border-theme-border-subtle bg-theme-surface px-4 text-[11px] font-bold text-theme-main outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
                                >
                                  <option value="">Remplaçant / Renfort...</option>
                                  {candidates.map((candidate: any) => (
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
                                  onClick={() => onAssignReplacement(task, selectedAbsenceForImpact)}
                                  disabled={loading || !taskReplacementByTaskId[task.id]}
                                  className="h-10 rounded-xl bg-secondary px-4 text-[9px] font-black uppercase tracking-widest"
                                >
                                  {(() => {
                                    const availableCount = candidates.filter((c: any) => c.isAvailable).length;
                                    if (candidates.length === 0) return 'Aucun membre';
                                    if (availableCount === 0) return 'Tous indisponibles';
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

              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setSelectedAbsenceForImpact(null)} className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase">Fermer</Button>
              </div>
            </div>
          );
        })() : null}
      </Modal>
    </motion.div>
  );
};
