// frontend/src/pages/app/components/tools/shared/ImpactedTasksList.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Calendar, Eye, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { GlassCard } from '../../../../../components/ui/GlassCard';
import { StatusBadge } from './StatusBadge';
import type { Task } from '../../../../../types';

interface ImpactedTasksListProps {
  tasks: Task[];
  absence: any;
  onAssignReplacement?: (task: Task) => void;
  onViewTask?: (task: Task) => void;
  isLoading?: boolean;
}

const getPriorityConfig = (priority: string) => {
  const configs = {
    'critique': { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300', label: 'Critique' },
    'haute': { color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-300', label: 'Haute' },
    'moyenne': { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-300', label: 'Moyenne' },
    'basse': { color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-300', label: 'Basse' },
  };
  return configs[priority as keyof typeof configs] || configs['moyenne'];
};

const getStatusConfig = (status: string) => {
  const configs = {
    'en attente': { color: 'text-gray-500', bg: 'bg-gray-50', label: 'En attente' },
    'en cours': { color: 'text-blue-600', bg: 'bg-blue-50', label: 'En cours' },
    'terminé': { color: 'text-green-600', bg: 'bg-green-50', label: 'Terminé' },
    'bloqué': { color: 'text-red-600', bg: 'bg-red-50', label: 'Bloqué' },
  };
  return configs[status as keyof typeof configs] || configs['en attente'];
};

export const ImpactedTasksList = ({
  tasks,
  absence,
  onAssignReplacement,
  onViewTask,
  isLoading = false,
}: ImpactedTasksListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-theme-surface-hover/20 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 opacity-60">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
        <p className="text-sm font-bold text-theme-main">Aucune tâche impactée</p>
        <p className="text-xs text-theme-muted mt-1">
          {absence.authorName || 'Cette personne'} n'est assigné à aucune tâche pendant cette période.
        </p>
      </div>
    );
  }

  // Trier les tâches par priorité et échéance
  const sortedTasks = [...tasks].sort((a, b) => {
    // Priorité d'abord (critique > haute > moyenne > basse)
    const priorityOrder = { 'critique': 0, 'haute': 1, 'moyenne': 2, 'basse': 3 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Ensuite par échéance (la plus proche d'abord)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  // Compter les tâches par statut
  const stats = {
    total: tasks.length,
    enRetard: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'terminé').length,
    critiques: tasks.filter(t => t.priority === 'critique').length,
    enCours: tasks.filter(t => t.status === 'en cours').length,
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isOverdue = (task: Task) => {
    return !!task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'terminé';
  };

  const getDaysUntilDue = (date?: string | null) => {
    if (!date) return null;
    const now = new Date();
    const due = new Date(date);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-theme-surface/50 border border-theme-border-subtle text-center">
          <p className="text-2xl font-black text-theme-main">{stats.total}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Total</p>
        </div>
        {stats.enRetard > 0 && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-2xl font-black text-red-500">{stats.enRetard}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-red-500">En retard</p>
          </div>
        )}
        {stats.critiques > 0 && (
          <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-center">
            <p className="text-2xl font-black text-orange-500">{stats.critiques}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-orange-500">Critiques</p>
          </div>
        )}
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
          <p className="text-2xl font-black text-blue-500">{stats.enCours}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">En cours</p>
        </div>
      </div>

      {/* Liste des tâches */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedTasks.map((task, index) => {
            const priorityConfig = getPriorityConfig(task.priority);
            const statusConfig = getStatusConfig(task.status);
            const overdue = isOverdue(task);
            const daysUntilDue = getDaysUntilDue(task.dueDate);
            const isOnGoing = task.status === 'en cours' || task.status === 'en attente';

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className={`p-4 hover:bg-theme-surface-hover/40 transition-all border ${
                  overdue ? 'border-red-500/30 bg-red-500/5' :
                  task.priority === 'critique' ? 'border-orange-500/20 bg-orange-500/5' :
                  'border-theme-border-subtle'
                }`}>
                  <div className="flex items-start gap-4">
                    {/* Icône de priorité */}
                    <div className={`p-2 rounded-xl ${priorityConfig.bg} border ${priorityConfig.border}`}>
                      {task.priority === 'critique' || task.priority === 'haute' ? (
                        <AlertTriangle className={`h-5 w-5 ${priorityConfig.color}`} />
                      ) : (
                        <Clock className={`h-5 w-5 ${priorityConfig.color}`} />
                      )}
                    </div>

                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/tache/${task.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewTask?.(task);
                          }}
                          className="text-sm font-black text-theme-main hover:text-secondary hover:underline truncate flex items-center gap-2"
                        >
                          {task.title}
                          <Eye size={14} className="shrink-0 opacity-50 hover:opacity-100" />
                        </Link>
                        <StatusBadge status={task.status} size="sm" />
                        {overdue && isOnGoing && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-black uppercase animate-pulse">
                            ⚠️ En retard
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-xs text-theme-muted mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Métadonnées */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-bold text-theme-muted">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {task.assignees?.map(a => a.name).join(', ') || 'Non assigné'}
                        </span>
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 ${overdue ? 'text-red-500' : ''}`}>
                            <Calendar size={12} />
                            Échéance: {formatDate(task.dueDate)}
                            {daysUntilDue !== null && isOnGoing && (
                              <span className={`ml-1 px-2 py-0.5 rounded-full ${
                                daysUntilDue < 0 ? 'bg-red-500 text-white' :
                                daysUntilDue <= 3 ? 'bg-orange-500 text-white' :
                                'bg-theme-surface-hover text-theme-muted'
                              }`}>
                                {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}j de retard` :
                                 daysUntilDue === 0 ? "Aujourd'hui" :
                                 `${daysUntilDue}j restant${daysUntilDue > 1 ? 's' : ''}`}
                              </span>
                            )}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full ${priorityConfig.bg} ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {onAssignReplacement && (
                      <button
                        onClick={() => onAssignReplacement(task)}
                        className="p-2 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-secondary transition-all shrink-0"
                        title="Assigner un remplaçant"
                      >
                        <Users size={18} />
                      </button>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};