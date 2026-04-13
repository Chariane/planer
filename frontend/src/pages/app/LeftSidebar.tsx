import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, FolderKanban, MessageSquare, Users, FileText, Calendar, MoreHorizontal, Briefcase, Hash, LayoutDashboard, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface SpaceNode {
  id: string;
  nom: string;
  description: string;
  sous_espaces?: SpaceNode[];
  listes: { id: string; nom: string }[];
}

function renderSpaceTree(
  espaces: SpaceNode[],
  workspaceId: string,
  spaceId: string | undefined,
  listId: string | undefined,
  openSpaces: Record<string, boolean>,
  toggleSpace: (id: string) => void,
  depth: number = 0
) {
  return espaces.map(space => (
    <div key={space.id} className={`ml-${depth * 4}`}>
      <div className="flex items-center justify-between">
        <Link
          to={`/workspace/${workspaceId}/${space.id}`}
          className={`flex-1 flex items-center gap-2 p-2 rounded text-sm ${
            spaceId === space.id ? 'bg-gray-100 text-gray-900 font-medium' : 'hover:bg-gray-50'
          }`}
        >
          <FolderKanban className="h-4 w-4" />
          {space.nom}
        </Link>
        {(space.sous_espaces?.length > 0 || space.listes.length > 0) && (
          <button onClick={() => toggleSpace(space.id)} className="p-1 text-gray-400 hover:text-gray-600">
            {openSpaces[space.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        <button className="p-1 text-gray-400 hover:text-gray-600"><MoreHorizontal className="h-4 w-4" /></button>
      </div>
      {openSpaces[space.id] && (
        <div className="ml-6 space-y-0.5">
          {space.sous_espaces && renderSpaceTree(space.sous_espaces, workspaceId, spaceId, listId, openSpaces, toggleSpace, depth + 1)}
          {space.listes.map(list => (
            <Link
              key={list.id}
              to={`/workspace/${workspaceId}/${space.id}/${list.id}`}
              className={`block p-2 pl-8 rounded text-sm ${
                listId === list.id ? 'bg-gray-100 text-gray-900 font-medium' : 'hover:bg-gray-50'
              }`}
            >
              {list.nom}
            </Link>
          ))}
        </div>
      )}
    </div>
  ));
}

export default function LeftSidebar() {
  const { workspaceId, spaceId, listId } = useParams();
  const { workspaces, addEspace, loadEspaces } = useApp();
  const { user } = useAuth();
  const [openSpaces, setOpenSpaces] = useState<Record<string, boolean>>({});
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDesc, setNewSpaceDesc] = useState('');
  const workspace = workspaces.find(w => w.id === workspaceId);

  const toggleSpace = (id: string) => {
    setOpenSpaces(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim() || !workspaceId) return;
    try {
      await addEspace(workspaceId, { nom: newSpaceName, description: newSpaceDesc });
      await loadEspaces(workspaceId); // Recharger les espaces
      setNewSpaceName('');
      setNewSpaceDesc('');
      setIsCreateSpaceModalOpen(false);
    } catch (error) {
      console.error('Erreur lors de la création de l\'espace', error);
    }
  };

  return (
    <div className="w-full md:w-80 flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <select
          value={workspaceId || ''}
          onChange={(e) => window.location.href = `/workspace/${e.target.value}`}
          className="w-full p-2 border rounded-lg text-sm focus:ring-secondary focus:border-secondary"
        >
          <option value="">Choisir un environnement</option>
          {workspaces.map(ws => (
            <option key={ws.id} value={ws.id}>{ws.nom}</option>
          ))}
        </select>
      </div>

      <div className="p-2 space-y-1">
        <Link to="/" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-sm">
          <Briefcase className="h-4 w-4" /> Portail parent
        </Link>
        <Link to="/dashboard" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-sm">
          <LayoutDashboard className="h-4 w-4" /> Tableau de bord
        </Link>
      </div>

      {workspace && (
        <div className="mt-4 px-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Espaces et listes</h3>
            <button
              onClick={() => setIsCreateSpaceModalOpen(true)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 space-y-1 max-h-[40vh] md:max-h-none overflow-y-auto">
            {workspace.espaces && workspace.espaces.length > 0 ? (
              renderSpaceTree(workspace.espaces, workspaceId!, spaceId, listId, openSpaces, toggleSpace)
            ) : (
              <div className="text-sm text-gray-500 px-2">Aucun espace. Cliquez sur + pour en créer.</div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 px-2 border-t pt-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Canaux de discussions</h3>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 p-2 text-sm text-gray-700"><Hash className="h-4 w-4" /> canal général</div>
          <div className="flex items-center gap-2 p-2 text-sm text-gray-700"><Hash className="h-4 w-4" /> canal d'espace</div>
        </div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 px-2">Discussions directes</h3>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 p-2 text-sm text-gray-700"><MessageSquare className="h-4 w-4" /> Thomas D.</div>
        </div>
      </div>

      <div className="mt-6 px-2 border-t pt-4 space-y-1">
        <Link to="/files" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-sm text-gray-700"><FileText className="h-4 w-4" /> Gestion des fichiers</Link>
        <Link to="/reports" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-sm text-gray-700"><FileText className="h-4 w-4" /> Gestion des rapports</Link>
        <Link to="/absences" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-sm text-gray-700"><Calendar className="h-4 w-4" /> Gestion des absences/congés</Link>
      </div>

      {/* Modal de création d'espace */}
      <Modal isOpen={isCreateSpaceModalOpen} onClose={() => setIsCreateSpaceModalOpen(false)} title="Créer un espace" size="md">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nom de l'espace"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-secondary"
          />
          <textarea
            placeholder="Description (optionnelle)"
            value={newSpaceDesc}
            onChange={(e) => setNewSpaceDesc(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg focus:ring-secondary"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCreateSpaceModalOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateSpace}>Créer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
