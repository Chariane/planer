// frontend/src/pages/app/views/GanttView.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { GanttChartSquare, Calendar, ChevronRight, GitBranch, ListChecks, AlertCircle, CheckCircle, Users } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import type { Task } from '../../../types';

const priorityLabels: Record<string, string> = {
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
  critique: 'Critique',
};

const priorityColors: Record<string, string> = {
  basse: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 dark:text-emerald-400',
  moyenne: 'bg-blue-500/10 text-blue-500 border border-blue-500/10 dark:text-blue-400',
  haute: 'bg-orange-500/10 text-orange-500 border border-orange-500/10 dark:text-orange-400',
  critique: 'bg-red-500/10 text-red-500 border border-red-500/10 dark:text-red-400',
};

interface GanttViewProps {
  tasks: Task[];
}

const statusColors: Record<string, string> = {
  'en attente': 'bg-yellow-500',
  'en cours': 'bg-blue-500',
  terminé: 'bg-emerald-500',
  bloqué: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  'en attente': 'En attente',
  'en cours': 'En cours',
  terminé: 'Terminé',
  bloqué: 'Bloqué',
};

function getChecklistProgress(task: Task) {
  const checklists = task.checklists || [];
  if (checklists.length === 0) return null;
  const done = checklists.filter(item => item.is_checked).length;
  return {
    done,
    total: checklists.length,
    percent: Math.round((done / checklists.length) * 100),
  };
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.status === 'terminé') return false;
  const due = new Date(task.dueDate);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

export default function GanttView({ tasks }: GanttViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const validTasks = tasks.filter(t => t.dueDate);

  if (validTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-theme-muted">
        <div className="p-8 rounded-full bg-theme-surface-hover mb-6 border border-theme-border-subtle shadow-inner">
          <GanttChartSquare size={48} className="opacity-10" />
        </div>
        <p className="text-sm font-black text-theme-main uppercase tracking-widest text-center opacity-60">
          Planning Vide
        </p>
        <p className="text-[10px] uppercase font-black tracking-widest mt-2 opacity-30 text-center max-w-[250px] leading-relaxed">
          Attribuez des dates d'échéance pour générer le diagramme de Gantt automatiquement.
        </p>
      </div>
    );
  }

  const tasksById = tasks.reduce((acc, task) => {
    acc[task.id] = task;
    return acc;
  }, {} as Record<string, Task>);

  const tasksByParent = validTasks.reduce((acc, task) => {
    const parentId = task.parentTaskId || null;
    acc[parentId || 'root'] = [...(acc[parentId || 'root'] || []), task];
    return acc;
  }, {} as Record<string, Task[]>);

  const allTasksByParent = tasks.reduce((acc, task) => {
    const parentId = task.parentTaskId || null;
    acc[parentId || 'root'] = [...(acc[parentId || 'root'] || []), task];
    return acc;
  }, {} as Record<string, Task[]>);

  const sortByPlanning = (a: Task, b: Task) => {
    const aDate = new Date(a.startDate || a.dueDate).getTime();
    const bDate = new Date(b.startDate || b.dueDate).getTime();
    return aDate - bDate || a.title.localeCompare(b.title);
  };

  const flattenTasks = (parentId: string | null = null, depth = 0): Array<{ task: Task; depth: number }> => {
    const key = parentId || 'root';
    return (tasksByParent[key] || [])
      .sort(sortByPlanning)
      .flatMap(task => [
        { task, depth },
        ...flattenTasks(task.id, depth + 1),
      ]);
  };

  const sortedTasks = flattenTasks();

  // Calculer la plage de dates pour l'échelle
  const dates = sortedTasks.flatMap(({ task }) => [task.startDate || task.dueDate, task.dueDate]);
  const minDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
  const dayDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Limiter à 30 jours pour l'affichage
  const daysToShow = Math.min(Math.max(dayDiff, 1), 45);
  const days = Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date(minDate);
    d.setDate(minDate.getDate() + i);
    return {
      date: d,
      label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      isWeekend: d.getDay() === 0 || d.getDay() === 6
    };
  });

  const getTaskPosition = (task: Task) => {
    const start = new Date(task.startDate || task.dueDate);
    const end = new Date(task.dueDate);
    const startDiff = Math.max(0, Math.floor((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
    const endDiff = Math.max(startDiff, Math.ceil((end.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
    const left = (startDiff / Math.max(dayDiff, 1)) * 100;
    const width = Math.max(((endDiff - startDiff + 1) / Math.max(dayDiff, 1)) * 100, 4);
    return { left: `${left}%`, width: `${width}%` };
  };

  const today = new Date();
  const todayDiff = Math.floor((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  const todayPosition = todayDiff >= 0 && todayDiff < dayDiff
    ? `${(todayDiff / Math.max(dayDiff, 1)) * 100}%`
    : null;

  const totalChecklists = validTasks.reduce((sum, task) => sum + (task.checklists?.length || 0), 0);
  const doneChecklists = validTasks.reduce((sum, task) => sum + (task.checklists || []).filter(item => item.is_checked).length, 0);
  const overdueCount = validTasks.filter(isOverdue).length;
  const selectedProgress = selectedTask ? getChecklistProgress(selectedTask) : null;
  const selectedChildren = selectedTask ? (allTasksByParent[selectedTask.id] || []).sort(sortByPlanning) : [];

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 shadow-theme-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Éléments planifiés</p>
          <p className="mt-1 text-2xl font-black text-theme-main">{validTasks.length}</p>
        </div>
        <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 shadow-theme-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Checklists terminées</p>
          <p className="mt-1 text-2xl font-black text-theme-main">{doneChecklists}/{totalChecklists}</p>
        </div>
        <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 shadow-theme-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Retards</p>
          <p className={`mt-1 text-2xl font-black ${overdueCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{overdueCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(statusLabels).map(([status, label]) => (
          <span
            key={status}
            className="inline-flex items-center gap-2 rounded-xl border border-theme-border-subtle bg-theme-surface px-3 py-2 text-[10px] font-black uppercase tracking-widest text-theme-muted"
          >
            <span className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
            {label}
          </span>
        ))}
      </div>

    <div className="overflow-x-auto rounded-2xl border border-theme-border-subtle bg-theme-surface/30 shadow-inner group/gantt">
      <div className="min-w-[1000px] p-6">
        {/* Timeline Header */}
        <div className="flex border-b border-theme-border-subtle/30 pb-6 mb-6">
          <div className="w-80 flex-shrink-0 font-black text-[10px] uppercase tracking-widest text-theme-muted flex items-center gap-3 opacity-60 group-hover/gantt:opacity-100 transition-opacity">
            <div className="h-4 w-4 rounded bg-secondary/20 flex items-center justify-center">
              <ChevronRight size={12} className="text-secondary" />
            </div>
            Chronologie des Missions
          </div>
          <div className="flex-1 flex px-2 relative">
            {days.map((day, idx) => (
              <div key={idx} className={`flex-1 text-center text-[9px] font-black uppercase tracking-tighter border-l border-theme-border-subtle/20 py-1 ${day.isWeekend ? 'text-theme-muted opacity-20' : 'text-theme-muted opacity-60'}`}>
                {day.label}
              </div>
            ))}
            {todayPosition && (
              <div
                className="absolute top-0 bottom-0 z-20 w-px bg-secondary shadow-[0_0_10px_rgba(255,102,0,0.55)]"
                style={{ left: todayPosition }}
                title="Aujourd'hui"
              />
            )}
          </div>
        </div>

        {/* Task Rows */}
        <div className="space-y-2">
          {sortedTasks.map(({ task, depth }, idx) => {
            const position = getTaskPosition(task);
            const checklistProgress = getChecklistProgress(task);
            const overdue = isOverdue(task);
            const parentTitle = task.parentTaskId ? tasksById[task.parentTaskId]?.title : null;
            return (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                key={task.id}
                className="flex items-center group relative py-2"
              >
                {/* Hover Background */}
                <div className="absolute inset-x-0 inset-y-0 bg-theme-surface-hover/20 opacity-0 group-hover:opacity-100 rounded-xl transition-all duration-300 -z-10" />

                <div className="w-80 flex-shrink-0 pr-6 pl-4" style={{ paddingLeft: `${16 + depth * 18}px` }}>
                  <button
                    type="button"
                    onClick={() => setSelectedTask(task)}
                    className="flex min-w-0 items-center gap-2 text-left transition-colors hover:text-secondary"
                    title="Voir les détails de cette tâche"
                  >
                    {depth > 0 ? (
                      <GitBranch size={14} className="shrink-0 text-secondary" />
                    ) : (
                      <ChevronRight size={14} className="shrink-0 text-theme-muted opacity-50" />
                    )}
                    <div className={`truncate text-sm font-black tracking-tight transition-colors group-hover:text-secondary ${task.status === 'terminé' ? 'text-theme-muted line-through opacity-40' : 'text-theme-main'}`}>
                      {task.title}
                    </div>
                  </button>
                  {parentTitle && (
                    <p className="mt-1 truncate text-[9px] font-black uppercase tracking-widest text-theme-muted opacity-40">
                      sous {parentTitle}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${priorityColors[task.priority]}`}>
                      <span className="h-1 w-1 rounded-full bg-current" />
                      {priorityLabels[task.priority]}
                    </span>
                    {checklistProgress && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-theme-border-subtle bg-theme-surface-hover px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-theme-muted">
                        <ListChecks size={11} />
                        {checklistProgress.done}/{checklistProgress.total}
                      </span>
                    )}
                    {overdue && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-500">
                        <AlertCircle size={11} />
                        retard
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 relative h-12 flex items-center px-2">
                  {/* Grid overlay */}
                  <div className="absolute inset-0 flex pointer-events-none px-2 opacity-10">
                    {days.map((_, i) => (
                      <div key={i} className="flex-1 border-l border-theme-border-subtle/10" />
                    ))}
                  </div>

                  {/* Task Timeline Bar */}
                  <motion.div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTask(task)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedTask(task);
                      }
                    }}
                    initial={{ width: 0, scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={`absolute h-9 rounded-xl flex items-center justify-between text-[10px] text-white font-black shadow-lg px-3 border border-white/10 z-10 transition-all duration-300 cursor-pointer pointer-events-auto hover:scale-[1.02] hover:ring-2 hover:ring-white/30 focus:outline-none focus:ring-2 focus:ring-secondary/60 ${statusColors[task.status] || 'bg-secondary'}`}
                    style={{
                      left: position.left,
                      width: position.width,
                      minWidth: '96px',
                    }}
                  >
                    <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-xl bg-black/15">
                      {checklistProgress && (
                        <div className="h-full bg-white/70" style={{ width: `${checklistProgress.percent}%` }} />
                      )}
                    </div>
                    <Calendar size={12} className="opacity-70" />
                    <span className="truncate px-2">
                      {task.startDate ? `${task.startDate.split('-').reverse().slice(0, 2).join('/')} - ` : ''}
                      {task.dueDate.split('-').reverse().slice(0, 2).join('/')}
                    </span>
                    {task.status === 'terminé' && <CheckCircle size={12} className="opacity-80" />}
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>

      <Modal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask ? `Planning - ${selectedTask.title}` : 'Planning'}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface-hover/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Tâche sélectionnée</p>
                  <h3 className={`mt-1 text-lg font-black text-theme-main ${selectedTask.status === 'terminé' ? 'line-through opacity-60' : ''}`}>
                    {selectedTask.title}
                  </h3>
                  {selectedTask.description && (
                    <p className="mt-2 text-sm font-medium leading-relaxed text-theme-muted">
                      {selectedTask.description}
                    </p>
                  )}
                </div>
                <span className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white ${statusColors[selectedTask.status] || 'bg-secondary'}`}>
                  {selectedTask.status === 'terminé' && <CheckCircle size={14} />}
                  {statusLabels[selectedTask.status] || selectedTask.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Début</p>
                <p className="mt-1 text-sm font-black text-theme-main">{selectedTask.startDate || 'Non défini'}</p>
              </div>
              <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Échéance</p>
                <p className={`mt-1 text-sm font-black ${isOverdue(selectedTask) ? 'text-red-500' : 'text-theme-main'}`}>
                  {selectedTask.dueDate}
                </p>
              </div>
              <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Priorité</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest ${priorityColors[selectedTask.priority]}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {priorityLabels[selectedTask.priority]}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-theme-muted">
                  <ListChecks size={14} className="text-secondary" />
                  Checklists
                </p>
                <span className="rounded-lg bg-theme-surface-hover px-2 py-1 text-[10px] font-black text-theme-main">
                  {selectedProgress ? `${selectedProgress.done}/${selectedProgress.total}` : '0'}
                </span>
              </div>
              {selectedProgress ? (
                <>
                  <div className="mb-3 h-2 overflow-hidden rounded-full border border-theme-border-subtle bg-theme-surface-hover">
                    <div
                      className={`h-full ${selectedProgress.percent === 100 ? 'bg-emerald-500' : 'bg-secondary'}`}
                      style={{ width: `${selectedProgress.percent}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {(selectedTask.checklists || []).map(checklist => (
                      <div key={checklist.id} className="flex items-center gap-2 rounded-xl border border-theme-border-subtle/50 bg-theme-surface-hover/30 px-3 py-2">
                        {checklist.is_checked ? (
                          <CheckCircle size={15} className="text-emerald-500" />
                        ) : (
                          <span className="h-3.5 w-3.5 rounded-full border border-theme-muted/40" />
                        )}
                        <span className={`text-sm font-semibold ${checklist.is_checked ? 'line-through text-theme-muted opacity-60' : 'text-theme-main'}`}>
                          {checklist.texte}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-theme-border-subtle p-4 text-center text-xs font-bold uppercase tracking-widest text-theme-muted opacity-50">
                  Aucune checklist liée à cette tâche.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-theme-muted">
                  <GitBranch size={14} className="text-secondary" />
                  Sous-tâches
                </p>
                <span className="rounded-lg bg-theme-surface-hover px-2 py-1 text-[10px] font-black text-theme-main">
                  {selectedChildren.length}
                </span>
              </div>
              {selectedChildren.length > 0 ? (
                <div className="space-y-2">
                  {selectedChildren.map(child => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedTask(child)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-theme-border-subtle/50 bg-theme-surface-hover/30 px-3 py-2 text-left transition hover:border-secondary/40 hover:bg-secondary/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-theme-main">{child.title}</p>
                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-theme-muted opacity-50">
                          {child.dueDate || 'Sans échéance'}
                        </p>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-theme-muted" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-theme-border-subtle p-4 text-center text-xs font-bold uppercase tracking-widest text-theme-muted opacity-50">
                  Aucune sous-tâche.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface p-4">
              <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-theme-muted">
                <Users size={14} className="text-secondary" />
                Responsables
              </p>
              {selectedTask.assignees.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedTask.assignees.map(assignee => (
                    <span key={assignee.id} className="inline-flex items-center gap-2 rounded-xl border border-theme-border-subtle bg-theme-surface-hover px-3 py-2 text-xs font-bold text-theme-main">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary/10 text-[10px] font-black text-secondary">
                        {assignee.name.charAt(0).toUpperCase()}
                      </span>
                      {assignee.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-semibold text-theme-muted">Aucun membre assigné.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
