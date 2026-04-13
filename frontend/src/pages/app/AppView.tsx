import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import CenterContent from './CenterContent';
import RightCanevas from './RightCanevas';

export default function AppView() {
  const { workspaceId, spaceId, listId } = useParams();
  const navigate = useNavigate();
  const { 
    workspaces, 
    setActiveWorkspaceId, 
    setActiveSpaceId, 
    setActiveListId,
    loadEspaces,
    loadListes,
    loadTaches
  } = useApp();
  const [isLoading, setIsLoading] = useState(true);

  // Charger les espaces quand le workspace change
  useEffect(() => {
    if (workspaceId) {
      console.log('Chargement des espaces pour le workspace:', workspaceId);
      setActiveWorkspaceId(workspaceId);
      loadEspaces(workspaceId).then(() => {
        console.log('Espaces chargés');
        setIsLoading(false);
      }).catch(err => {
        console.error('Erreur lors du chargement des espaces:', err);
        setIsLoading(false);
      });
    } else {
      setActiveWorkspaceId(null);
      setIsLoading(false);
    }
  }, [workspaceId]);

  // Charger les listes quand l'espace change
  useEffect(() => {
    if (spaceId) {
      console.log('Chargement des listes pour l\'espace:', spaceId);
      setActiveSpaceId(spaceId);
      loadListes(spaceId);
    } else {
      setActiveSpaceId(null);
    }
  }, [spaceId]);

  // Charger les tâches quand la liste change
  useEffect(() => {
    if (listId) {
      console.log('Chargement des tâches pour la liste:', listId);
      setActiveListId(listId);
      loadTaches(listId);
    } else {
      setActiveListId(null);
    }
  }, [listId]);

  // Redirection si aucun workspace sélectionné
  useEffect(() => {
    if (!workspaceId && workspaces.length > 0) {
      navigate(`/workspace/${workspaces[0].id}`, { replace: true });
    }
  }, [workspaceId, workspaces]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

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
