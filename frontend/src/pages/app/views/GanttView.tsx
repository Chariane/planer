// frontend/src/pages/app/views/GanttView.tsx
import { motion } from 'framer-motion';
import { GanttChartSquare, Calendar, ChevronRight } from 'lucide-react';
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

export default function GanttView({ tasks }: GanttViewProps) {
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

  // Trier par date d'échéance
  const sortedTasks = [...validTasks].sort((a, b) =>
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  // Calculer la plage de dates pour l'échelle
  const dates = sortedTasks.map(t => t.dueDate);
  const minDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
  const dayDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Limiter à 30 jours pour l'affichage
  const daysToShow = Math.min(dayDiff, 45);
  const days = Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date(minDate);
    d.setDate(minDate.getDate() + i);
    return {
      label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      isWeekend: d.getDay() === 0 || d.getDay() === 6
    };
  });

  const getTaskPosition = (dueDate: string) => {
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${(diff / dayDiff) * 100}%`;
  };

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-theme-border-subtle bg-theme-surface/30 shadow-inner group/gantt">
      <div className="min-w-[1000px] p-6">
        {/* Timeline Header */}
        <div className="flex border-b border-theme-border-subtle/30 pb-6 mb-6">
          <div className="w-80 flex-shrink-0 font-black text-[10px] uppercase tracking-widest text-theme-muted flex items-center gap-3 opacity-60 group-hover/gantt:opacity-100 transition-opacity">
            <div className="h-4 w-4 rounded bg-secondary/20 flex items-center justify-center">
              <ChevronRight size={12} className="text-secondary" />
            </div>
            Chronologie des Missions
          </div>
          <div className="flex-1 flex px-2">
            {days.map((day, idx) => (
              <div key={idx} className={`flex-1 text-center text-[9px] font-black uppercase tracking-tighter border-l border-theme-border-subtle/20 py-1 ${day.isWeekend ? 'text-theme-muted opacity-20' : 'text-theme-muted opacity-60'}`}>
                {day.label}
              </div>
            ))}
          </div>
        </div>

        {/* Task Rows */}
        <div className="space-y-2">
          {sortedTasks.map((task, idx) => {
            const position = getTaskPosition(task.dueDate);
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

                <div className="w-80 flex-shrink-0 pr-6 pl-4">
                  <div className={`text-sm font-black tracking-tight truncate transition-colors group-hover:text-secondary ${task.status === 'terminé' ? 'text-theme-muted line-through opacity-40' : 'text-theme-main'}`}>
                    {task.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${priorityColors[task.priority]}`}>
                      <span className="h-1 w-1 rounded-full bg-current" />
                      {priorityLabels[task.priority]}
                    </span>
                  </div>
                </div>

                <div className="flex-1 relative h-10 flex items-center px-2">
                  {/* Grid overlay */}
                  <div className="absolute inset-0 flex pointer-events-none px-2 opacity-10">
                    {days.map((_, i) => (
                      <div key={i} className="flex-1 border-l border-theme-border-subtle/10" />
                    ))}
                  </div>

                  {/* Task Timeline Bar */}
                  <motion.div
                    initial={{ width: 0, scale: 0.8 }}
                    animate={{ width: 'auto', scale: 1 }}
                    className="absolute h-8 bg-gradient-to-r from-primary/60 to-secondary rounded-xl flex items-center justify-between text-[10px] text-white font-black shadow-lg shadow-secondary/10 px-4 border border-white/10 z-10 hover:shadow-secondary/20 hover:scale-105 transition-all duration-300 cursor-pointer pointer-events-auto"
                    style={{
                      left: position,
                      transform: 'translateX(-50%)',
                      minWidth: '90px',
                    }}
                  >
                    <Calendar size={12} className="opacity-60" />
                    <span>{task.dueDate.split('-').reverse().slice(0, 2).join('/')}</span>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}