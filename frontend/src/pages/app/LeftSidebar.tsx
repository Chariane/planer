// frontend/src/pages/app/LeftSidebar.tsx
import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderTree, Hash, MessageSquare, FileText, Calendar, Plus } from 'lucide-react';

// Données exactes de l'image
const spaces = [
  { id: '1', nom: 'Espace 1', children: [] },
  { id: '2', nom: 'Espace 2', children: [
    { id: '21', nom: 'Sous-espace 1', listes: [
      { id: '211', nom: 'liste 1 du sous-espa...' }
    ]}
  ]}
];

export default function LeftSidebar() {
  const [openSpaces, setOpenSpaces] = useState<Record<string, boolean>>({ '2': true });

  const toggleSpace = (id: string) => setOpenSpaces(prev => ({ ...prev, [id]: !prev[id] }));

  const renderTree = (items: any[], depth = 0) => {
    return items.map(item => (
      <div key={item.id} style={{ marginLeft: depth * 16 }} className="mb-1">
        <div className="flex items-center justify-between group">
          <div className="flex-1 flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
            <FolderTree className="h-4 w-4 text-primary" />
            <span className="truncate">{item.nom}</span>
          </div>
          {item.children && item.children.length > 0 && (
            <button onClick={() => toggleSpace(item.id)} className="p-1 text-gray-400">
              {openSpaces[item.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}
        </div>
        {openSpaces[item.id] && item.children && (
          <div className="ml-4 mt-1">{renderTree(item.children, depth + 1)}</div>
        )}
        {openSpaces[item.id] && item.listes?.map(list => (
          <div key={list.id} className="block py-1.5 pl-8 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">
            {list.nom}
          </div>
        ))}
      </div>
    ));
  };

  return (
    <div className="p-3">
      {/* Sélecteur d'environnement */}
      <div className="mb-4">
        <select className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
          <option>Nom d'environnement...</option>
        </select>
      </div>

      {/* Liens principaux */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-800 py-1">Accueil Kapital-Planer</div>
        <div className="text-sm text-gray-600 py-1 pl-2">Accueil dashboard</div>
      </div>

      {/* Espaces et listes */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Espaces et listes</h3>
          <button className="p-1 rounded hover:bg-gray-100"><Plus className="h-3.5 w-3.5 text-gray-500" /></button>
        </div>
        {renderTree(spaces)}
      </div>

      {/* Chat */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Chat</h3>
        <div className="text-xs text-gray-400 mt-1 mb-1">Canaux de discussions</div>
        <div className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded p-1.5 cursor-pointer">
          <Hash className="h-4 w-4 text-secondary" /> Canal général d'environnement
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded p-1.5 cursor-pointer pl-4">
          <Hash className="h-4 w-4 text-gray-400" /> Canal d'espace 1
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded p-1.5 cursor-pointer">
          <MessageSquare className="h-4 w-4 text-primary" /> Discussions directes
        </div>
      </div>

      {/* Outils de gestion */}
      <div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded p-1.5 cursor-pointer">
            <FileText className="h-4 w-4 text-primary" /> Fichiers
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded p-1.5 cursor-pointer">
            <FileText className="h-4 w-4 text-primary" /> Gestion des rapports
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded p-1.5 cursor-pointer">
            <Calendar className="h-4 w-4 text-primary" /> Gestion des absences/congés
          </div>
        </div>
      </div>
    </div>
  );
}