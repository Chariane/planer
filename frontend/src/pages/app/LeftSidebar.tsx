import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, FolderKanban, MessageSquare, Users, FileText, Calendar, MoreHorizontal, Briefcase, Hash, LayoutDashboard } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface SpaceNode {
  id: string;
  name: string;
  description: string;
  spaces?: SpaceNode[];
  lists: { id: string; name: string }[];
}

function renderSpaceTree(
  spaces: SpaceNode[],
  workspaceId: string,
  spaceId: string | undefined,
  listId: string | undefined,
  openSpaces: Record<string, boolean>,
  toggleSpace: (id: string) => void,
  depth: number = 0
) {
  return spaces.map(space => (
    <div key={space.id} className={`ml-${depth * 4}`}>
      <div className="flex items-center justify-between">
        <Link
          to={`/workspace/${workspaceId}/${space.id}`}
          className={`flex-1 flex items-center gap-2 p-2 rounded text-sm ${
            spaceId === space.id ? 'bg-gray-100 text-gray-900 font-medium' : 'hover:bg-gray-50'
          }`}
        >
          <FolderKanban className="h-4 w-4" />
          {space.name}
        </Link>
        {(space.spaces?.length > 0 || space.lists.length > 0) && (
          <button onClick={() => toggleSpace(space.id)} className="p-1 text-gray-400 hover:text-gray-600">
            {openSpaces[space.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        <button className="p-1 text-gray-400 hover:text-gray-600"><MoreHorizontal className="h-4 w-4" /></button>
      </div>
      {openSpaces[space.id] && (
        <div className="ml-6 space-y-0.5">
          {space.spaces && renderSpaceTree(space.spaces, workspaceId, spaceId, listId, openSpaces, toggleSpace, depth + 1)}
          {space.lists.map(list => (
            <Link
              key={list.id}
              to={`/workspace/${workspaceId}/${space.id}/${list.id}`}
              className={`block p-2 pl-8 rounded text-sm ${
                listId === list.id ? 'bg-gray-100 text-gray-900 font-medium' : 'hover:bg-gray-50'
              }`}
            >
              {list.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  ));
}

export default function LeftSidebar() {
  const { workspaceId, spaceId, listId } = useParams();
  const { workspaces } = useApp();
  const [openSpaces, setOpenSpaces] = useState<Record<string, boolean>>({});

  const toggleSpace = (id: string) => {
    setOpenSpaces(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const workspace = workspaces.find(w => w.id === workspaceId);

  return (
    <div className="w-full md:w-80 flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <select
          value={workspaceId || ''}
          onChange={(e) => window.location.href = `/workspace/${e.target.value}`}
          className="w-full p-2 border rounded-lg text-sm focus:ring-secondary focus:border-secondary"
        >
          <option value="">Choisir un environnement</option>
          {workspaces.map(ws => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
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
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Espaces et listes</h3>
          <div className="mt-2 space-y-1 max-h-[40vh] md:max-h-none overflow-y-auto">
            {renderSpaceTree(workspace.spaces, workspaceId!, spaceId, listId, openSpaces, toggleSpace)}
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
    </div>
  );
}
