import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import CenterContent from './CenterContent';
import RightCanevas from './RightCanevas';

export default function AppView() {
  const { workspaceId, spaceId, listId } = useParams();
  const navigate = useNavigate();
  const { workspaces, setActiveWorkspaceId, setActiveSpaceId, setActiveListId } = useApp();

  useEffect(() => {
    // Synchroniser l'état global avec l'URL
    if (workspaceId && workspaces.find(w => w.id === workspaceId)) {
      setActiveWorkspaceId(workspaceId);
    } else {
      setActiveWorkspaceId(null);
    }
    setActiveSpaceId(spaceId || null);
    setActiveListId(listId || null);
  }, [workspaceId, spaceId, listId, workspaces]);

  // Si aucun workspace n'est sélectionné, rediriger vers le premier
  useEffect(() => {
    if (!workspaceId && workspaces.length > 0) {
      navigate(`/app/${workspaces[0].id}`, { replace: true });
    }
  }, [workspaceId, workspaces]);

  const activeWorkspace = workspaces.find(w => w.id === workspaceId);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <CenterContent />
        <RightCanevas />
      </div>
    </div>
  );
}
