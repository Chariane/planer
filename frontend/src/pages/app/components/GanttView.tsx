import type { Task } from '../../../contexts/AppContext';
import Card from '../../../components/ui/Card';

interface GanttViewProps {
  tasks: Task[];
}

const priorityLabels = {
  tres_elevee: 'Très élevée',
  elevee: 'Élevée',
  normale: 'Normale',
  faible: 'Faible',
  tres_faible: 'Très faible',
};

export default function GanttView({ tasks }: GanttViewProps) {
  // Trier les tâches par date d'échéance
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  if (tasks.length === 0) {
    return <Card className="p-8 text-center text-gray-500">Aucune tâche à afficher dans le diagramme de Gantt.</Card>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[800px]">
        {/* En-tête des dates (simplifié) */}
        <div className="flex border-b border-gray-200 pb-2 mb-2">
          <div className="w-1/3 font-semibold text-gray-600">Tâche</div>
          <div className="w-1/3 font-semibold text-gray-600">Priorité</div>
          <div className="w-1/3 font-semibold text-gray-600">Date d'échéance</div>
        </div>
        {sortedTasks.map(task => (
          <div key={task.id} className="flex items-center py-2 border-b border-gray-100">
            <div className="w-1/3 text-sm font-medium text-gray-800">{task.title}</div>
            <div className="w-1/3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                task.priority === 'tres_elevee' ? 'bg-red-100 text-red-800' :
                task.priority === 'elevee' ? 'bg-orange-100 text-orange-800' :
                task.priority === 'normale' ? 'bg-blue-100 text-blue-800' :
                task.priority === 'faible' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {priorityLabels[task.priority]}
              </span>
            </div>
            <div className="w-1/3 text-sm text-gray-500">{task.dueDate}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
