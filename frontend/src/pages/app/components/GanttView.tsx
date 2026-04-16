// frontend/src/pages/app/components/GanttView.tsx
import type { Task } from '../../../contexts/AppContext';
import { GlassCard } from '../../../components/ui/GlassCard';

const priorityLabels: Record<string, string> = {
  tres_elevee: 'Très élevée',
  elevee: 'Élevée',
  normale: 'Normale',
  faible: 'Faible',
  tres_faible: 'Très faible',
};

const priorityColors: Record<string, string> = {
  tres_elevee: 'bg-red-100 text-red-800',
  elevee: 'bg-orange-100 text-orange-800',
  normale: 'bg-blue-100 text-blue-800',
  faible: 'bg-green-100 text-green-800',
  tres_faible: 'bg-gray-100 text-gray-800',
};

interface GanttViewProps {
  tasks: Task[];
}

export default function GanttView({ tasks }: GanttViewProps) {
  if (tasks.length === 0) {
    return <GlassCard className="p-8 text-center text-gray-500">Aucune tâche à afficher dans le diagramme de Gantt.</GlassCard>;
  }

  // Trier par date d'échéance
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Calculer la plage de dates pour l'échelle
  const dates = sortedTasks.map(t => t.dueDate).filter(d => d);
  if (dates.length === 0) return <GlassCard className="p-8 text-center text-gray-500">Aucune date définie</GlassCard>;
  const minDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
  const dayDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const days = Array.from({ length: Math.min(dayDiff, 30) }, (_, i) => {
    const d = new Date(minDate);
    d.setDate(minDate.getDate() + i);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  });

  const getTaskWidth = (dueDate: string) => {
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${(diff / dayDiff) * 100}%`;
  };

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[800px]">
        {/* En-tête des dates */}
        <div className="flex border-b border-gray-200 pb-2 mb-2">
          <div className="w-64 flex-shrink-0 font-semibold text-gray-600">Tâche</div>
          <div className="flex-1 flex">
            {days.map((day, idx) => (
              <div key={idx} className="flex-1 text-center text-xs text-gray-500 border-l border-gray-100">
                {day}
              </div>
            ))}
          </div>
        </div>
        {/* Lignes des tâches */}
        {sortedTasks.map(task => {
          const due = task.dueDate ? new Date(task.dueDate) : null;
          const start = minDate;
          const totalDuration = dayDiff;
          const position = due ? Math.ceil((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          const widthPercent = (1 / totalDuration) * 100;
          return (
            <div key={task.id} className="flex items-center py-2 border-b border-gray-100 hover:bg-gray-50">
              <div className="w-64 flex-shrink-0 pr-2">
                <div className="text-sm font-medium text-gray-800 truncate">{task.title}</div>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>
                  {priorityLabels[task.priority]}
                </span>
              </div>
              <div className="flex-1 relative h-8 bg-gray-100 rounded">
                {due && (
                  <div
                    className="absolute h-6 top-1 bg-secondary rounded-l-full rounded-r-full flex items-center justify-center text-xs text-white font-medium shadow-sm"
                    style={{
                      left: `${(position / totalDuration) * 100}%`,
                      width: `${widthPercent * 2}%`,
                      minWidth: '20px',
                    }}
                  >
                    {task.dueDate.slice(5)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}