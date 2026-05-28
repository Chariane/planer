// frontend/src/pages/app/AppView.tsx
import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import CenterContent from './CenterContent';
import RightCanevas from './RightCanevas';
import { useActiveResource } from '../../contexts/ActiveResourceContext';

export default function AppView() {
  const { listId } = useActiveResource();

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Colonne gauche */}
        <div className="w-[220px] flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <LeftSidebar />
        </div>
        {/* Colonne centrale */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50">
          <CenterContent />
        </div>
        {/* Colonne droite — uniquement visible sur une liste/projet */}
        {listId && (
          <div className="w-[320px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            <RightCanevas />
          </div>
        )}
      </div>
    </div>
  );
}