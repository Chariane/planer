import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import type { Task } from '../../../contexts/AppContext';

export default function KanbanColumn({ title, tasks, status, color }: { title: string; tasks: Task[]; status: string; color: string }) {
  const { setNodeRef } = useDroppable({ id: status });
  return (
    <div className="w-80 flex-shrink-0 rounded-xl bg-gray-100 p-3 shadow-sm">
      <div className="flex justify-between items-center mb-3 px-2">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: color }}>{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className="min-h-[400px] space-y-3">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <KanbanCard key={task.id} task={task} />)}
        </SortableContext>
        {tasks.length === 0 && <div className="py-8 text-center text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">Déposez ici</div>}
      </div>
    </div>
  );
}
