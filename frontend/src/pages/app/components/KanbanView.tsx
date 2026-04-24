// frontend/src/pages/app/components/KanbanView.tsx
import { useState } from 'react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task } from '../../../types'; // ← importer depuis types
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { motion } from 'framer-motion';

interface KanbanViewProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
}

// Colonnes avec les nouveaux statuts (valeurs backend)
const columns = [
  { id: 'en attente', title: 'En attente', color: '#eab308' },
  { id: 'en cours', title: 'En cours', color: '#3b82f6' },
  { id: 'terminé', title: 'Terminées', color: '#10b981' },
  { id: 'bloqué', title: 'Bloquées', color: '#ef4444' },
];

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
          <SortableContext
            key={col.id}
            items={getTasksByStatus(col.id).map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              title={col.title}
              tasks={getTasksByStatus(col.id)}
              status={col.id}
              color={col.color}
            />
          </SortableContext>
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