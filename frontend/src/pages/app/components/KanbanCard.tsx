// frontend/src/pages/app/components/KanbanCard.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Task } from '../../../contexts/AppContext';

const priorityLabels = {
  tres_elevee: 'Très élevée',
  elevee: 'Élevée',
  normale: 'Normale',
  faible: 'Faible',
  tres_faible: 'Très faible',
};

const priorityColors = {
  tres_elevee: 'bg-red-100 text-red-800',
  elevee: 'bg-orange-100 text-orange-800',
  normale: 'bg-blue-100 text-blue-800',
  faible: 'bg-green-100 text-green-800',
  tres_faible: 'bg-gray-100 text-gray-800',
};

export default function KanbanCard({ task, isOverlay = false }: { task: Task; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}
      className={`rounded-lg bg-white p-3 shadow-sm border border-gray-200 ${
        isDragging ? 'opacity-50 rotate-2' : ''
      } ${isOverlay ? 'shadow-xl ring-2 ring-secondary' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{task.title}</p>
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>
            {priorityLabels[task.priority]}
          </span>
        </div>
        <button className="cursor-grab touch-none text-gray-400 hover:text-gray-600" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}