// frontend/src/components/layout/Sidebar.tsx
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Plus, LogOut, Crown, Users, ChevronDown, ChevronRight, FolderOpen, ListTodo, CheckSquare2, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useNavigationStore } from '../../store/useNavigationStore';
import CreateWorkspaceModal from '../workspace/CreateWorkspaceModal';

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const { workspaceId, id } = useParams();
  const activeWorkspaceId = workspaceId || (location.pathname.startsWith('/workspace/') ? id : undefined);
  const { user, logout } = useAuth();
  const { loadWorkspaces } = useApp();
  const { ownedWorkspaces, joinedWorkspaces, joinedEspaces, joinedListes, joinedTaches } = useNavigationStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ownedOpen, setOwnedOpen] = useState(true);
  const [joinedOpen, setJoinedOpen] = useState(true);
  const [espacesOpen, setEspacesOpen] = useState(true);
  const [listesOpen, setListesOpen] = useState(true);
  const [tachesOpen, setTachesOpen] = useState(false);

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
          <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${location.pathname === '/dashboard'
            ? 'bg-secondary text-white shadow-md'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}>
            <LayoutDashboard className="h-5 w-5" />
            <span>Tableau de bord</span>
          </div>
        </Link>
      </nav>

      {/* Mes Workspaces (owned) */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between px-3 mb-2">
          <button
            onClick={() => setOwnedOpen(!ownedOpen)}
            className="flex items-center gap-1 text-xs font-semibold text-white/50 uppercase tracking-wider hover:text-white/80 transition-colors"
          >
            {ownedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Mes Workspaces
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="p-1 rounded-lg bg-white/10 hover:bg-secondary transition-colors"
            title="Créer un workspace"
          >
            <Plus className="h-3 w-3 text-white" />
          </button>
        </div>
        {ownedOpen && (
          <div className="space-y-0.5 px-2">
            {ownedWorkspaces.length === 0 && (
              <p className="text-xs text-white/40 px-2 py-1">Aucun workspace créé</p>
            )}
            {ownedWorkspaces.map((ws) => (
              <Link
                key={ws.id}
                to={`/workspace/${ws.id}`}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all ${activeWorkspaceId === ws.id
                  ? 'bg-secondary text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <Crown className="h-4 w-4 flex-shrink-0 text-amber-400" />
                <span className="truncate">{ws.nom}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Workspaces rejoints (joined) */}
      {joinedWorkspaces.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between px-3 mb-2">
            <button
              onClick={() => setJoinedOpen(!joinedOpen)}
              className="flex items-center gap-1 text-xs font-semibold text-white/50 uppercase tracking-wider hover:text-white/80 transition-colors"
            >
              {joinedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Rejoints
            </button>
          </div>
          {joinedOpen && (
            <div className="space-y-0.5 px-2">
              {joinedWorkspaces.map((ws) => (
                <Link
                  key={ws.id}
                  to={`/workspace/${ws.id}`}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all ${activeWorkspaceId === ws.id
                    ? 'bg-secondary text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <Users className="h-4 w-4 flex-shrink-0 text-sky-400" />
                  <span className="truncate flex-1">{ws.nom}</span>
                  {ws.current_user_role && (
                    <span className="text-[10px] bg-white/15 text-white/60 px-1.5 py-0.5 rounded-full leading-none">
                      {ws.current_user_role}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Espaces rejoints */}
      {joinedEspaces.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between px-3 mb-2">
            <button
              onClick={() => setEspacesOpen(!espacesOpen)}
              className="flex items-center gap-1 text-xs font-semibold text-white/50 uppercase tracking-wider hover:text-white/80 transition-colors"
            >
              {espacesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Espaces rejoints
            </button>
          </div>
          {espacesOpen && (
            <div className="space-y-1 px-2">
              {joinedEspaces.map((espace) => (
                <div key={`joined-espace-${espace.id}`}>
                  <div className="flex items-center text-[10px] text-white/40 px-2 mt-1 truncate" title="Contexte Parent Restreint">
                    {espace.workspace_nom || 'Workspace'} <Lock className="inline w-3 h-3 ml-1" />
                  </div>
                  <Link
                    to={`/espace/${espace.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <FolderOpen className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <span className="truncate flex-1">{espace.nom}</span>
                    {espace.role && (
                      <span className="text-[10px] bg-white/15 text-white/60 px-1.5 py-0.5 rounded-full leading-none">
                        {espace.role}
                      </span>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Listes rejointes */}
      {joinedListes.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between px-3 mb-2">
            <button
              onClick={() => setListesOpen(!listesOpen)}
              className="flex items-center gap-1 text-xs font-semibold text-white/50 uppercase tracking-wider hover:text-white/80 transition-colors"
            >
              {listesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Listes rejointes
            </button>
          </div>
          {listesOpen && (
            <div className="space-y-1 px-2">
              {joinedListes.map((liste) => (
                <div key={`joined-liste-${liste.id}`}>
                  <div className="flex items-center text-[10px] text-white/40 px-2 mt-1 truncate" title="Contexte Parent Restreint">
                    {liste.espace_nom || liste.workspace_nom || 'Parent inconnu'} <Lock className="inline w-3 h-3 ml-1" />
                  </div>
                  <Link
                    to={`/liste/${liste.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <ListTodo className="h-4 w-4 flex-shrink-0 text-violet-400" />
                    <span className="truncate flex-1">{liste.nom}</span>
                    {liste.role && (
                      <span className="text-[10px] bg-white/15 text-white/60 px-1.5 py-0.5 rounded-full leading-none">
                        {liste.role}
                      </span>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tâches rejointes */}
      {joinedTaches.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between px-3 mb-2">
            <button
              onClick={() => setTachesOpen(!tachesOpen)}
              className="flex items-center gap-1 text-xs font-semibold text-white/50 uppercase tracking-wider hover:text-white/80 transition-colors"
            >
              {tachesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Tâches rejointes
            </button>
          </div>
          {tachesOpen && (
            <div className="space-y-1 px-2">
              {joinedTaches.map((tache) => (
                <div key={`joined-tache-${tache.id}`}>
                  <div className="flex items-center text-[10px] text-white/40 px-2 mt-1 truncate" title="Contexte Parent Restreint">
                    {tache.liste_nom || tache.espace_nom || tache.workspace_nom || 'Parent inconnu'} <Lock className="inline w-3 h-3 ml-1" />
                  </div>
                  <Link
                    to={`/tache/${tache.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <CheckSquare2 className="h-4 w-4 flex-shrink-0 text-orange-400" />
                    <span className="truncate flex-1">{tache.nom}</span>
                    {tache.role && (
                      <span className="text-[10px] bg-white/15 text-white/60 px-1.5 py-0.5 rounded-full leading-none">
                        {tache.role}
                      </span>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 pb-4 border-t border-white/10 px-3">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors"
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
