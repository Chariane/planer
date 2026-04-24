// frontend/src/pages/app/components/GanttView.tsx
import type { Task } from '../../../types'; // ← importer depuis types
import { GlassCard } from '../../../components/ui/GlassCard';

const priorityLabels: Record<string, string> = {
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
  critique: 'Critique',
};

const priorityColors: Record<string, string> = {
  basse: 'bg-green-100 text-green-800',
  moyenne: 'bg-blue-100 text-blue-800',
  haute: 'bg-orange-100 text-orange-800',
  critique: 'bg-red-100 text-red-800',
};

interface GanttViewProps {
  tasks: Task[];
}

export default function GanttView({ tasks }: GanttViewProps) {
  const validTasks = tasks.filter(t => t.dueDate);
  
  if (validTasks.length === 0) {
    return <GlassCard className="p-8 text-center text-gray-500">Aucune tâche avec date de fin pour le diagramme de Gantt.</GlassCard>;
  }

  // Trier par date d'échéance
  const sortedTasks = [...validTasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Calculer la plage de dates pour l'échelle
  const dates = sortedTasks.map(t => t.dueDate);
  const minDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
  const dayDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Limiter à 30 jours pour l'affichage
  const daysToShow = Math.min(dayDiff, 30);
  const days = Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date(minDate);
    d.setDate(minDate.getDate() + i);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  });

  const getTaskPosition = (dueDate: string) => {
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
          const position = getTaskPosition(task.dueDate);
          return (
            <div key={task.id} className="flex items-center py-2 border-b border-gray-100 hover:bg-gray-50">
              <div className="w-64 flex-shrink-0 pr-2">
                <div className="text-sm font-medium text-gray-800 truncate">{task.title}</div>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>
                  {priorityLabels[task.priority]}
                </span>
              </div>
              <div className="flex-1 relative h-8 bg-gray-100 rounded">
                <div
                  className="absolute h-6 top-1 bg-secondary rounded-full flex items-center justify-center text-xs text-white font-medium shadow-sm px-2"
                  style={{
                    left: position,
                    transform: 'translateX(-50%)',
                    minWidth: '60px',
                    maxWidth: '120px',
                  }}
                >
                  {task.dueDate.slice(5)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}