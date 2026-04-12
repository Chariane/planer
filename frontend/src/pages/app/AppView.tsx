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
    if (workspaceId && workspaces.find(w => w.id === workspaceId)) {
      setActiveWorkspaceId(workspaceId);
    } else {
      setActiveWorkspaceId(null);
    }
    setActiveSpaceId(spaceId || null);
    setActiveListId(listId || null);
  }, [workspaceId, spaceId, listId, workspaces]);

  useEffect(() => {
    if (!workspaceId && workspaces.length > 0) {
      navigate(`/workspace/${workspaces[0].id}`, { replace: true });
    }
  }, [workspaceId, workspaces]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TopBar />
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col md:flex-row h-full">
          <LeftSidebar />
          <div className="flex-1 min-w-0">
            <CenterContent />
          </div>
          <RightCanevas />
        </div>
      </div>
    </div>
  );
}
