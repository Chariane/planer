// frontend/src/pages/app/views/KanbanView.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, closestCenter, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Calendar, AlertCircle, CheckCircle, GitBranch, ListChecks, User } from 'lucide-react';
import type { Task } from '../../../types';
import { MemberAvatar } from '../../../components/ui/MemberAvatar';

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
  depth?: number;
  childCount?: number;
  parentTitle?: string | null;
  isOverlay?: boolean;
}

function getTaskProgressInfo(task: Task, childCount = 0) {
  const checklists = task.checklists || [];
  const done = checklists.filter(item => item.is_checked).length;
  const mode = task.contentMode || (checklists.length > 0 ? 'checklist' : childCount > 0 ? 'subtasks' : 'leaf');
  const fallback = task.status === 'terminé' ? 100 : task.status === 'en cours' ? 50 : 0;
  const percent = Math.max(0, Math.min(100, Math.round(task.progression ?? fallback)));

  return {
    done,
    total: checklists.length,
    mode,
    percent,
  };
}

const contentModeLabels: Record<string, string> = {
  leaf: 'Statut',
  checklist: 'Checklists',
  subtasks: 'Sous-tâches',
};

function isOverdue(task: Task) {
  if (!task.dueDate || task.status === 'terminé') return false;
  const due = new Date(task.dueDate);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

// ✅ Fonction pour récupérer le créateur d'une tâche
const getTaskCreator = (task: Task): { name: string; id: string } | null => {
  if (task.createur) {
    const prenoms = task.createur.prenoms?.trim() || '';
    const nom = task.createur.nom?.trim() || '';
    let name = task.createur.username;
    if (prenoms && nom) name = `${prenoms} ${nom}`;
    else if (prenoms) name = prenoms;
    else if (nom) name = nom;
    return { name, id: task.createur.id };
  }
  const creator = task.assignees?.find(a => a.role === 'Créateur');
  if (creator) {
    return { name: creator.name, id: creator.id };
  }
  return null;
};

function KanbanCard({ task, depth = 0, childCount = 0, parentTitle = null, isOverlay = false }: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const progressInfo = getTaskProgressInfo(task, childCount);
  const overdue = isOverdue(task);
  const creator = getTaskCreator(task);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    disabled: isOverlay,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)', borderColor: 'var(--secondary)' }}
      className={`group relative rounded-2xl bg-theme-surface p-3 shadow-theme-sm border border-theme-border-subtle cursor-grab active:cursor-grabbing transition-all duration-300 sm:p-4 ${depth > 0 ? 'sm:ml-4 border-l-4 border-l-secondary/30' : ''
        } ${overdue ? 'border-red-500/30 bg-red-500/[0.03]' : ''} ${isDragging ? 'opacity-40 scale-95' : ''
        } ${isOverlay ? 'shadow-theme-lg ring-2 ring-secondary opacity-100' : ''}`}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
    >
      <div className="flex flex-col gap-4">
        {(parentTitle || depth > 0) && (
          <div className="flex min-w-0 items-center gap-2 text-[9px] font-black uppercase tracking-widest text-theme-muted opacity-60">
            <GitBranch size={12} className="text-secondary" />
            <span className="truncate">
              {parentTitle ? `Sous-tâche de ${parentTitle}` : `Sous-tâche niveau ${depth}`}
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <p className={`break-words text-sm font-bold leading-snug tracking-tight transition-colors group-hover:text-theme-main ${task.status === 'terminé' ? 'text-theme-muted line-through opacity-60' : 'text-theme-main'}`}>
            {task.title}
          </p>
          <GripVertical className="h-4 w-4 text-theme-muted opacity-60 transition-opacity group-hover:opacity-100 sm:opacity-0 shrink-0 mt-1" />
        </div>

        {/* ✅ Affichage du créateur sur la carte Kanban */}
        {creator && (
          <Link 
            to={`/users/${creator.id}`}
            className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-theme-muted opacity-50 hover:text-primary hover:opacity-100 transition-colors"
          >
            <User size={10} className="opacity-50" />
            Créé par {creator.name}
          </Link>
        )}

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

          {childCount > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/15 bg-secondary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-secondary">
              <GitBranch size={12} />
              {childCount} sous-tâche{childCount > 1 ? 's' : ''}
            </div>
          )}

          {progressInfo.mode === 'checklist' && progressInfo.total > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-theme-border-subtle bg-theme-surface-hover px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-theme-muted">
              <ListChecks size={12} />
              {progressInfo.done}/{progressInfo.total}
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 rounded-lg border border-theme-border-subtle bg-theme-surface-hover px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-theme-muted">
            {progressInfo.mode === 'subtasks' ? <GitBranch size={12} /> : <ListChecks size={12} />}
            {contentModeLabels[progressInfo.mode] || 'Statut'}
          </div>

          {overdue && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-500">
              <AlertCircle size={12} />
              En retard
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-theme-muted">
            <span>Avancement</span>
            <span>{progressInfo.percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full border border-theme-border-subtle bg-theme-surface-hover">
            <div
              className={`h-full rounded-full ${progressInfo.percent === 100 ? 'bg-emerald-500' : progressInfo.percent > 0 ? 'bg-secondary' : 'bg-theme-muted/30'}`}
              style={{ width: `${Math.max(progressInfo.percent, 4)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-1 pt-4 border-t border-theme-border-subtle/30">
          <div className="flex items-center -space-x-2">
            {task.assignees.length > 0 ? (
              task.assignees.slice(0, 3).map((a, i) => (
                <MemberAvatar key={i} member={a} size="xs" className="border-2 border-theme-border-subtle shadow-sm" />
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

          {task.status === 'terminé' ? (
            <div className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-500">
              <CheckCircle size={12} />
              Fait
            </div>
          ) : task.status === 'en cours' && (
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
  tasksByParent: Record<string, Task[]>;
  tasksById: Record<string, Task>;
  getDepth: (task: Task) => number;
}

function KanbanColumn({ title, tasks, status, color, tasksByParent, tasksById, getDepth }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const averageProgress = tasks.length
    ? Math.round(tasks.reduce((sum, task) => sum + getTaskProgressInfo(task, (tasksByParent[task.id] || []).length).percent, 0) / tasks.length)
    : 0;
  const childTasksCount = tasks.reduce((sum, task) => sum + (tasksByParent[task.id] || []).length, 0);

  return (
    <div
      ref={setNodeRef}
      className={`w-[min(84vw,20rem)] flex-shrink-0 rounded-2xl border bg-theme-surface/30 p-3 transition-all duration-300 sm:w-80 sm:p-4 ${isOver ? 'border-secondary bg-secondary/5 shadow-theme-md' : 'border-theme-border-subtle/30'}`}
    >
      <div className="flex justify-between items-center mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full shadow-[0_0_10px_currentcolor] shrink-0" style={{ backgroundColor: color, color: color }} />
          <h3 className="font-black text-theme-main tracking-[0.1em] uppercase text-[10px] opacity-70 italic">{title}</h3>
        </div>
        <span className="rounded-lg px-2.5 py-1 text-[10px] font-black bg-theme-surface-hover shadow-theme-sm border border-theme-border-subtle text-theme-main">
          {tasks.length}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-theme-border-subtle/40 bg-theme-surface/60 px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted opacity-60">Avancement</p>
          <p className="text-sm font-black text-theme-main">{averageProgress}%</p>
        </div>
        <div className="rounded-xl border border-theme-border-subtle/40 bg-theme-surface/60 px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted opacity-60">Sous-tâches</p>
          <p className="text-sm font-black text-theme-main">{childTasksCount}</p>
        </div>
      </div>

      <div className="min-h-[55dvh] space-y-3 sm:min-h-[600px] sm:space-y-4">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {tasks.map(task => (
              <KanbanCard
                key={task.id}
                task={task}
                depth={getDepth(task)}
                childCount={(tasksByParent[task.id] || []).length}
                parentTitle={task.parentTaskId ? tasksById[task.parentTaskId]?.title || null : null}
              />
            ))}
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

  const tasksById = tasks.reduce((acc, task) => {
    acc[task.id] = task;
    return acc;
  }, {} as Record<string, Task>);

  const tasksByParent = tasks.reduce((acc, task) => {
    const parentId = task.parentTaskId || null;
    if (parentId) acc[parentId] = [...(acc[parentId] || []), task];
    return acc;
  }, {} as Record<string, Task[]>);

  const getDepth = (task: Task) => {
    let depth = 0;
    let parentId = task.parentTaskId || null;
    const visited = new Set<string>();
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      depth += 1;
      parentId = tasksById[parentId]?.parentTaskId || null;
    }
    return depth;
  };

  const getTasksByStatus = (status: string) =>
    tasks
      .filter(t => t.status === status)
      .sort((a, b) => {
        const depthDiff = getDepth(a) - getDepth(b);
        if (depthDiff !== 0) return depthDiff;
        return (a.dueDate || '').localeCompare(b.dueDate || '') || a.title.localeCompare(b.title);
      });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const task = tasks.find(t => t.id === active.id);
    const overId = over.id as string;
    const columnIds = columns.map(col => col.id);
    const newStatus = (columnIds.includes(overId)
      ? overId
      : tasks.find(t => t.id === overId)?.status) as Task['status'] | undefined;
    if (task && newStatus && task.status !== newStatus) {
      onUpdateTask({ ...task, status: newStatus });
    }
    setActiveId(null);
  };

  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-6 sm:mx-0 sm:gap-6 sm:px-0 sm:pb-8 custom-scrollbar-hidden">
        {columns.map(col => (
          <div key={col.id} id={col.id} className="w-[min(84vw,20rem)] flex-shrink-0 sm:w-80">
            <KanbanColumn
              title={col.title}
              tasks={getTasksByStatus(col.id)}
              status={col.id}
              color={col.color}
              tasksByParent={tasksByParent}
              tasksById={tasksById}
              getDepth={getDepth}
            />
          </div>
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1.05, opacity: 1 }}>
            <KanbanCard
              task={activeTask}
              depth={getDepth(activeTask)}
              childCount={(tasksByParent[activeTask.id] || []).length}
              parentTitle={activeTask.parentTaskId ? tasksById[activeTask.parentTaskId]?.title || null : null}
              isOverlay
            />
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
