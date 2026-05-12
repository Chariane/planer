// frontend/src/pages/app/views/KanbanView.tsx
import { useState } from 'react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import type { Task } from '../../../types';

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

const columns = [
  { id: 'en attente', title: 'En attente', color: '#eab308' },
  { id: 'en cours', title: 'En cours', color: '#3b82f6' },
  { id: 'terminé', title: 'Terminées', color: '#10b981' },
  { id: 'bloqué', title: 'Bloquées', color: '#ef4444' },
];

interface KanbanCardProps {
  task: Task;
  isOverlay?: boolean;
}

function KanbanCard({ task, isOverlay = false }: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}
      className={`rounded-lg bg-white p-3 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 rotate-2' : ''
      } ${isOverlay ? 'shadow-xl ring-2 ring-secondary' : ''}`}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800 line-clamp-2">{task.title}</p>
          {task.dueDate && (
            <p className="mt-1 text-xs text-gray-400">
              📅 {new Date(task.dueDate).toLocaleDateString('fr-FR')}
            </p>
          )}
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>
            {priorityLabels[task.priority]}
          </span>
        </div>
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
    </motion.div>
  );
}

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  status: string;
  color: string;
}

function KanbanColumn({ title, tasks, status, color }: KanbanColumnProps) {
  return (
    <div className="w-80 flex-shrink-0 rounded-xl bg-gray-100 p-3 shadow-sm">
      <div className="flex justify-between items-center mb-3 px-2">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: color }}>{tasks.length}</span>
      </div>
      <div className="min-h-[400px] space-y-3">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <KanbanCard key={task.id} task={task} />)}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            Déposez ici
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanViewProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
}

export default function KanbanView({ tasks, onUpdateTask }: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const getTasksByStatus = (status: string) => tasks.filter(t => t.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const task = tasks.find(t => t.id === active.id);
    const newStatus = over.id as Task['status'];
    if (task && task.status !== newStatus) {
      onUpdateTask({ ...task, status: newStatus });
    }
    setActiveId(null);
  };

  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <div key={col.id} id={col.id} className="w-80 flex-shrink-0">
            <KanbanColumn
              title={col.title}
              tasks={getTasksByStatus(col.id)}
              status={col.id}
              color={col.color}
            />
          </div>
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <KanbanCard task={activeTask} isOverlay />
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  );
}