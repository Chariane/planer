import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Sparkles, Briefcase, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import CreateWorkspaceModal from '../workspace/CreateWorkspaceModal';

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { workspaces, loadWorkspaces } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleWorkspaceCreated = () => {
    loadWorkspaces(); // Recharger la liste des workspaces
  };

  // Version réduite (icônes seulement)
  if (!isOpen) {
    return (
      <div className="flex h-full flex-col bg-primary px-2 py-6 shadow-xl overflow-y-auto">
        <div className="mb-8 flex justify-center">
          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-white">KP</div>
        </div>
        <nav className="flex flex-col items-center space-y-4">
          <Link to="/dashboard" className="text-white/70 hover:text-white"><LayoutDashboard className="h-5 w-5" /></Link>
          <Link to="/chat" className="text-white/70 hover:text-white"><MessageSquare className="h-5 w-5" /></Link>
          <Link to="/talent" className="text-white/70 hover:text-white"><Sparkles className="h-5 w-5" /></Link>
        </nav>
      </div>
    );
  }

  // Version complète
  return (
    <>
      <div className="flex h-full flex-col bg-primary shadow-xl overflow-y-auto w-64 md:w-72">
        <div className="mb-8 flex items-center gap-2 px-4 py-2">
          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-white">KP</div>
          <span className="text-xl font-bold text-white">K‑Planner</span>
        </div>

        <div className="mb-6 flex items-center gap-3 mx-3 p-2 bg-white/10 rounded-lg">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold flex-shrink-0">
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username || 'Invité'}</p>
            <p className="text-xs text-white/60 truncate">{user?.email || 'connecté'}</p>
          </div>
        </div>

        <nav className="space-y-1 px-3">
          <Link to="/dashboard">
            <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              location.pathname === '/dashboard' ? 'bg-white/10 text-white shadow-md' : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}>
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Dashboard</span>
            </div>
          </Link>
        </nav>

        <div className="mt-6 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Environnements de travail</h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="group relative flex items-center justify-center p-1 rounded-lg bg-white/10 hover:bg-secondary transition-all duration-200"
            >
              <Plus className="h-4 w-4 text-white/80 group-hover:text-white" />
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Créer un nouveau workspace
              </span>
            </button>
          </div>
          <div className="space-y-1 px-3">
            {workspaces.map((ws) => (
              <Link key={ws.id} to={`/workspace/${ws.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/80 hover:bg-white/5">
                <Briefcase className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{ws.nom}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-2 border-t border-white/20 px-3 space-y-1">
          <Link to="/chat" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5">
            <MessageSquare className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">K‑Chat</span>
          </Link>
          <Link to="/talent" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5">
            <Sparkles className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">Kapital‑Talent</span>
          </Link>
        </div>

        <div className="mt-auto pt-4 text-center text-xs text-white/30 px-3 pb-4">v1.0 Planner</div>
      </div>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleWorkspaceCreated}
      />
    </>
  );
}
