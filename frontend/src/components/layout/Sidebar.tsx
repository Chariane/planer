// frontend/src/components/layout/Sidebar.tsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Plus, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import CreateWorkspaceModal from '../workspace/CreateWorkspaceModal';

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { workspaces, loadWorkspaces } = useApp();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleWorkspaceCreated = () => {
    loadWorkspaces(); // Recharger la liste
  };

  // Version réduite (icônes seulement)
  if (!isOpen) {
    return (
      <div className="flex h-full flex-col bg-primary py-4 shadow-xl overflow-y-auto">
        <div className="mb-8 flex justify-center">
          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-white">KP</div>
        </div>
        <nav className="flex flex-col items-center gap-2">
          <Link to="/dashboard" className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
            <LayoutDashboard className="h-5 w-5" />
          </Link>
          <Link to="/workspaces" className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
            <Briefcase className="h-5 w-5" />
          </Link>
        </nav>
      </div>
    );
  }

  // Version complète
  return (
    <div className="flex h-full flex-col bg-primary shadow-xl overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-white">KP</div>
        <span className="text-lg font-bold text-white">K‑Planner</span>
      </div>

      {/* Profil utilisateur */}
      <div className="mx-3 mt-4 p-3 bg-white/10 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold">
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username || 'Invité'}</p>
            <p className="text-xs text-white/60 truncate">{user?.email || 'connecté'}</p>
          </div>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="mt-4 px-3 space-y-1">
        <Link to="/dashboard">
          <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
            location.pathname === '/dashboard' 
              ? 'bg-secondary text-white shadow-md' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}>
            <LayoutDashboard className="h-5 w-5" />
            <span>Tableau de bord</span>
          </div>
        </Link>
      </nav>

      {/* Workspaces */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between px-3 mb-2">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Workspaces</h3>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="p-1 rounded-lg bg-white/10 hover:bg-secondary transition-colors"
          >
            <Plus className="h-3 w-3 text-white" />
          </button>
        </div>
        <div className="space-y-0.5 px-2">
          {workspaces.map((ws) => (
            <Link 
              key={ws.id} 
              to={`/workspace/${ws.id}`}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all ${
                workspaceId === ws.id 
                  ? 'bg-secondary text-white' 
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Briefcase className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{ws.nom}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 pb-4 border-t border-white/10 px-3">
        <button 
          onClick={() => {/* TODO: déconnexion */}}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Déconnexion</span>
        </button>
        <p className="text-center text-xs text-white/30 mt-3">v1.0 K-Planner</p>
      </div>

      {/* Modale de création */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleWorkspaceCreated}
      />
    </div>
  );
}