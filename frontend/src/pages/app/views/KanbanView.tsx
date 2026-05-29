// frontend/src/pages/app/views/KanbanView.tsx
import { useState } from 'react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Calendar, AlertCircle } from 'lucide-react';
import type { Task } from '../../../types';

const priorityLabels: Record<string, string> = {
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
  critique: 'Critique',
};

const priorityColors: Record<string, string> = {
  basse: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 dark:text-emerald-400',
  moyenne: 'bg-blue-500/10 text-blue-500 border border-blue-500/20 dark:text-blue-400',
  haute: 'bg-orange-500/10 text-orange-500 border border-orange-500/20 dark:text-orange-400',
  critique: 'bg-red-500/10 text-red-500 border border-red-500/20 dark:text-red-400',
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)', borderColor: 'var(--secondary)' }}
      className={`group relative rounded-2xl bg-theme-surface p-4 shadow-theme-sm border border-theme-border-subtle cursor-grab active:cursor-grabbing transition-all duration-300 ${isDragging ? 'opacity-40 scale-95' : ''
        } ${isOverlay ? 'shadow-theme-lg ring-2 ring-secondary opacity-100' : ''}`}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm font-bold tracking-tight line-clamp-2 leading-snug transition-colors group-hover:text-theme-main ${task.status === 'terminé' ? 'text-theme-muted line-through opacity-60' : 'text-theme-main'}`}>
            {task.title}
          </p>
          <GripVertical className="h-4 w-4 text-theme-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${priorityColors[task.priority]}`}>
            <span className="h-1 w-1 rounded-full bg-current" />
            {priorityLabels[task.priority]}
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-1.5 text-[9px] text-theme-muted font-black uppercase tracking-tighter bg-theme-surface-hover px-2 py-0.5 rounded-lg border border-theme-border-subtle opacity-60 group-hover:opacity-100 transition-opacity">
              <Calendar size={12} />
              {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-1 pt-4 border-t border-theme-border-subtle/30">
          <div className="flex items-center -space-x-2">
            {task.assignees.length > 0 ? (
              task.assignees.slice(0, 3).map((a, i) => (
                <div key={i} className="h-7 w-7 rounded-lg bg-theme-surface border-2 border-theme-border-subtle flex items-center justify-center text-[10px] font-black text-secondary shadow-sm" title={a.name}>
                  {a.name.charAt(0).toUpperCase()}
                </div>
              ))
            ) : (
              <div className="h-7 w-7 rounded-lg bg-theme-surface-hover border border-dashed border-theme-border-subtle flex items-center justify-center text-theme-muted opacity-30">
                <AlertCircle size={14} />
              </div>
            )}
            {task.assignees.length > 3 && (
              <div className="h-7 w-7 rounded-lg bg-theme-surface-hover border-2 border-theme-border-subtle flex items-center justify-center text-[9px] font-black text-theme-muted">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>

          {task.status === 'en cours' && (
            <div className="h-1.5 w-16 bg-theme-surface-hover rounded-full overflow-hidden border border-theme-border-subtle/30 shadow-inner">
              <motion.div
                animate={{ x: [-30, 70] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="h-full w-10 bg-gradient-to-r from-transparent via-secondary/40 to-transparent"
              />
            </div>
          )}
        </div>
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

function KanbanColumn({ title, tasks, color }: KanbanColumnProps) {
  return (
    <div className="w-80 flex-shrink-0 rounded-2xl bg-theme-surface/30 p-4 border border-theme-border-subtle/30 transition-all duration-300">
      <div className="flex justify-between items-center mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full shadow-[0_0_10px_currentcolor] shrink-0" style={{ backgroundColor: color, color: color }} />
          <h3 className="font-black text-theme-main tracking-[0.1em] uppercase text-[10px] opacity-70 italic">{title}</h3>
        </div>
        <span className="rounded-lg px-2.5 py-1 text-[10px] font-black bg-theme-surface-hover shadow-theme-sm border border-theme-border-subtle text-theme-main">
          {tasks.length}
        </span>
      </div>

      <div className="min-h-[600px] space-y-4">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {tasks.map(task => <KanbanCard key={task.id} task={task} />)}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-32 flex flex-col items-center justify-center text-[10px] font-black text-theme-muted border-2 border-dashed border-theme-border-subtle rounded-2xl bg-theme-surface/20 opacity-30 uppercase tracking-[0.2em] gap-3"
          >
            <div className="p-2 rounded-full bg-theme-surface">
              <AlertCircle size={20} className="opacity-40" />
            </div>
            Zone Vide
          </motion.div>
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
      <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar-hidden">
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
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1.05, opacity: 1 }}>
            <KanbanCard task={activeTask} isOverlay />
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  );
}