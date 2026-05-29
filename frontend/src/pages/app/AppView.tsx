import { useState } from 'react';
import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import CenterContent from './CenterContent';
import RightCanevas from './RightCanevas';
import { useActiveResource } from '../../contexts/ActiveResourceContext';

export default function AppView() {
  const { listId } = useActiveResource();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-full w-full bg-theme-page transition-colors duration-200">
      <TopBar isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Colonne gauche */}
        <div className={`flex-shrink-0 border-r border-theme-border-subtle bg-theme-surface overflow-y-auto transition-all duration-300 ${isSidebarOpen ? 'w-[220px]' : 'w-0 opacity-0'}`}>
          <LeftSidebar />
        </div>
        {/* Colonne centrale */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-theme-page transition-colors duration-200">
          <CenterContent />
        </div>
        {/* Colonne droite — uniquement visible sur une liste/projet */}
        {listId && (
          <div className="w-[320px] flex-shrink-0 border-l border-theme-border-subtle bg-theme-surface overflow-y-auto transition-colors duration-200">
            <RightCanevas />
          </div>
        )}
      </div>
    </div>
  );
}
