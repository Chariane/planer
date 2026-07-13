// frontend/src/pages/app/components/tools/shared/ToolTabs.tsx
import { motion } from 'framer-motion';
import { Paperclip, FileText, Calendar } from 'lucide-react';

interface ToolTabsProps {
  activeTool: 'files' | 'reports' | 'absences';
  setActiveTool: (tool: 'files' | 'reports' | 'absences') => void;
  canViewFiles: boolean;
  canViewReports: boolean;
  canViewAbsences: boolean;
}

export const ToolTabs = ({
  activeTool,
  setActiveTool,
  canViewFiles,
  canViewReports,
  canViewAbsences,
}: ToolTabsProps) => {
  const tabs = [
    { id: 'files' as const, label: 'Fichiers', icon: Paperclip, visible: canViewFiles },
    { id: 'reports' as const, label: 'Rapports', icon: FileText, visible: canViewReports },
    { id: 'absences' as const, label: 'Absences', icon: Calendar, visible: canViewAbsences },
  ].filter(t => t.visible);

  if (tabs.length === 0) {
    return (
      <div className="p-4 text-center text-theme-muted/50">
        <p className="text-[10px] font-black uppercase tracking-widest">Aucun outil disponible</p>
      </div>
    );
  }

  return (
    <div className="p-1 px-1 flex flex-wrap gap-1 border border-theme-border-subtle shadow-theme-md bg-theme-surface/50 backdrop-blur-xl rounded-2xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTool(tab.id)}
          className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl font-black transition-all duration-300 relative group overflow-hidden ${
            activeTool === tab.id
              ? 'text-secondary bg-secondary/5 shadow-inner'
              : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover/50'
          }`}
        >
          <tab.icon
            className={`h-4 w-4 transition-transform group-hover:scale-110 ${
              activeTool === tab.id ? 'text-secondary' : ''
            }`}
          />
          <span className="text-[10px] uppercase tracking-[0.2em]">{tab.label}</span>
          {activeTool === tab.id && (
            <motion.div
              layoutId="activeTool"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary mx-4 rounded-full"
            />
          )}
        </button>
      ))}
    </div>
  );
};