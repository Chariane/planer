// frontend/src/pages/app/components/PlannerToolsPanel.tsx
import { useMemo } from 'react';
import { ListToolsPanel, EspaceToolsPanel, WorkspaceToolsPanel } from './tools';
import type { Task } from '../../../types';

interface PlannerToolsPanelProps {
  workspaceId?: string | null;
  espaceId?: string | null;
  listeId?: string | null;
  currentUserId?: string | null;
  effectiveRole: string | null;
  tasks: Task[];
  initialTool?: 'files' | 'reports' | 'absences';
  onTasksChanged?: () => void;
}

export default function PlannerToolsPanel({
  workspaceId,
  espaceId,
  listeId,
  currentUserId,
  effectiveRole,
  tasks,
  initialTool,
  onTasksChanged,
}: PlannerToolsPanelProps) {
  // ✅ Mémoriser le contexte pour éviter les re-rendus inutiles
  const context = useMemo(() => ({
    workspaceId,
    espaceId,
    listeId,
    currentUserId,
    effectiveRole,
    tasks,
    initialTool,
    onTasksChanged,
  }), [workspaceId, espaceId, listeId, currentUserId, effectiveRole, tasks, initialTool, onTasksChanged]);

  // ✅ Sélection du bon composant selon le contexte avec des clés stables
  if (listeId) {
    return (
      <ListToolsPanel
        key={`liste-${listeId}`}
        workspaceId={context.workspaceId}
        espaceId={context.espaceId}
        listeId={listeId}
        currentUserId={context.currentUserId}
        effectiveRole={context.effectiveRole}
        tasks={context.tasks}
        initialTool={context.initialTool}
        onTasksChanged={context.onTasksChanged}
      />
    );
  }

  if (espaceId) {
    return (
      <EspaceToolsPanel
        key={`espace-${espaceId}`}
        workspaceId={context.workspaceId}
        espaceId={espaceId}
        currentUserId={context.currentUserId}
        effectiveRole={context.effectiveRole}
        tasks={context.tasks}
        initialTool={context.initialTool}
        onTasksChanged={context.onTasksChanged}
      />
    );
  }

  if (workspaceId) {
    return (
      <WorkspaceToolsPanel
        key={`workspace-${workspaceId}`}
        workspaceId={workspaceId}
        currentUserId={context.currentUserId}
        effectiveRole={context.effectiveRole}
        tasks={context.tasks}
        initialTool={context.initialTool}
        onTasksChanged={context.onTasksChanged}
      />
    );
  }

  // ✅ Fallback si aucun contexte
  return (
    <div className="p-8 text-center text-theme-muted">
      <p className="font-black text-xs uppercase tracking-widest">
        Sélectionnez une ressource pour accéder aux outils
      </p>
    </div>
  );
}
