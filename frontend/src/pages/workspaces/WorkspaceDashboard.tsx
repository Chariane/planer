// frontend/src/pages/workspaces/WorkspaceDashboard.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Grid, 
  List, 
  Star, 
  Users, 
  ArrowRight,
  Sparkles,
  FolderGit2
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Container } from '../../components/ui/Container';
import CreateWorkspaceModal from '../../components/workspace/CreateWorkspaceModal';

export default function WorkspaceDashboard() {
  const { workspaces, loadWorkspaces } = useApp();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const filteredWorkspaces = workspaces.filter(ws =>
    ws.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleWorkspaceCreated = () => {
    loadWorkspaces();
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl" />
        
        <Container className="relative py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-8 h-8 text-yellow-300" />
              <span className="text-sm font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                Collaboration Platform
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Vos Workspaces
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl">
              Gérez tous vos projets, équipes et collaborations depuis un seul endroit.
            </p>
            <AnimatedButton 
              variant="secondary" 
              size="lg"
              className="shadow-2xl"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouveau Workspace
            </AnimatedButton>
          </motion.div>
        </Container>
      </div>

      <Container className="py-12">
        {/* Barre de recherche et filtres */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un workspace..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Grille des workspaces */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
          }
        >
          <AnimatePresence>
            {filteredWorkspaces.map((workspace) => (
              <motion.div
                key={workspace.id}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                onHoverStart={() => setHoveredId(workspace.id)}
                onHoverEnd={() => setHoveredId(null)}
              >
                <GlassCard className="group cursor-pointer overflow-hidden">
                  <div className="p-6">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                    
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg">
                        <FolderGit2 className="w-6 h-6" />
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Star className="w-5 h-5 text-gray-400 hover:text-yellow-400" />
                      </button>
                    </div>

                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">
                      {workspace.nom}
                    </h3>
                    
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                      {workspace.description || "Aucune description"}
                    </p>

                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{workspace.membres?.length || 1} membres</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FolderGit2 className="w-4 h-4" />
                        <span>{workspace.espaces?.length || 0} espaces</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                        Actif
                      </span>
                    </div>

                    <AnimatedButton
                      variant="outline"
                      className="w-full group/btn"
                      onClick={() => window.location.href = `/workspace/${workspace.id}`}
                    >
                      <span>Ouvrir l'espace</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </AnimatedButton>
                  </div>

                  {hoveredId === workspace.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      style={{
                        transform: 'skewX(-20deg) translateX(-100%)',
                        animation: 'shimmer 1s ease-in-out'
                      }}
                    />
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredWorkspaces.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <FolderGit2 className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
              Aucun workspace trouvé
            </h3>
            <p className="text-gray-500 mb-6">
              Commencez par créer votre premier workspace
            </p>
            <AnimatedButton variant="primary" size="lg" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Créer un workspace
            </AnimatedButton>
          </motion.div>
        )}
      </Container>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleWorkspaceCreated}
      />
    </div>
  );
}