// frontend/src/components/workspace/SpaceTreeView.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronDown, 
  FolderTree, 
  FolderOpen,
  Plus,
  MoreVertical,
  Star,
  Lock,
  Archive
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SpaceNode {
  id: string;
  nom: string;
  description: string;
  sous_espaces?: SpaceNode[];
  listes: { id: string; nom: string }[];
  is_favori?: boolean;
  is_archive?: boolean;
  is_private?: boolean;
}

interface SpaceTreeViewProps {
  espaces: SpaceNode[];
  onSpaceClick: (spaceId: string) => void;
  onAddSpace: (parentId?: string) => void;
  className?: string;
}

export function SpaceTreeView({ espaces, onSpaceClick, onAddSpace, className }: SpaceTreeViewProps) {
  const [openSpaces, setOpenSpaces] = useState<Record<string, boolean>>({});
  const [hoveredSpace, setHoveredSpace] = useState<string | null>(null);

  const toggleSpace = (id: string) => {
    setOpenSpaces(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderSpaceNode = (space: SpaceNode, depth: number = 0) => {
    const isOpen = openSpaces[space.id];
    const hasChildren = space.sous_espaces && space.sous_espaces.length > 0;
    const hasLists = space.listes && space.listes.length > 0;

    return (
      <div key={space.id} className="relative">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: depth * 0.05 }}
          className="relative group"
          onMouseEnter={() => setHoveredSpace(space.id)}
          onMouseLeave={() => setHoveredSpace(null)}
        >
          {/* Ligne de connexion */}
          {depth > 0 && (
            <div 
              className="absolute left-[-16px] top-1/2 w-4 h-px bg-gradient-to-r from-gray-200 to-transparent"
              style={{ left: `${-16 - (depth - 1) * 12}px` }}
            />
          )}
          
          <div 
            className={cn(
              "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-200",
              "hover:bg-gradient-to-r hover:from-indigo-50 hover:to-transparent",
              "border border-transparent hover:border-indigo-100"
            )}
            style={{ marginLeft: depth * 20 }}
          >
            <div className="flex items-center gap-2 flex-1" onClick={() => onSpaceClick(space.id)}>
              {/* Icône d'expansion */}
              {(hasChildren || hasLists) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSpace(space.id);
                  }}
                  className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              )}
              
              {/* Badges de statut */}
              <div className="flex items-center gap-1">
                {space.is_favori && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                {space.is_private && <Lock className="w-3 h-3 text-gray-400" />}
                {space.is_archive && <Archive className="w-3 h-3 text-gray-400" />}
              </div>
              
              {/* Icône du dossier avec animation */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="text-indigo-500"
              >
                {isOpen ? (
                  <FolderOpen className="w-5 h-5" />
                ) : (
                  <FolderTree className="w-5 h-5" />
                )}
              </motion.div>
              
              {/* Nom de l'espace */}
              <span className={cn(
                "text-sm font-medium transition-colors",
                hoveredSpace === space.id ? "text-indigo-600" : "text-gray-700"
              )}>
                {space.nom}
              </span>
              
              {/* Description en tooltip */}
              {space.description && hoveredSpace === space.id && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-10"
                >
                  {space.description}
                </motion.div>
              )}
            </div>
            
            {/* Actions au hover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: hoveredSpace === space.id ? 1 : 0, scale: hoveredSpace === space.id ? 1 : 0.8 }}
              className="flex items-center gap-1"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSpace(space.id);
                }}
                className="p-1 hover:bg-indigo-100 rounded-lg transition-colors"
                title="Ajouter un sous-espace"
              >
                <Plus className="w-4 h-4 text-indigo-500" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
            </motion.div>
          </div>

          {/* Sous-espaces */}
          <AnimatePresence>
            {isOpen && hasChildren && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {space.sous_espaces!.map(child => renderSpaceNode(child, depth + 1))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Listes */}
          {isOpen && hasLists && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-10 space-y-1 mt-1"
            >
              {space.listes.map(list => (
                <div
                  key={list.id}
                  className="flex items-center gap-2 p-2 pl-8 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm text-gray-600"
                  onClick={() => onSpaceClick(space.id)}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>{list.nom}</span>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-1", className)}>
      {espaces.map(space => renderSpaceNode(space))}
    </div>
  );
}