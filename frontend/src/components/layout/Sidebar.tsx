// frontend/src/components/layout/Sidebar.tsx
import { useState, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Plus, LogOut, Crown, Users, ChevronDown, ChevronRight, FolderOpen, ListTodo, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useNavigationStore } from '../../store/useNavigationStore';
import CreateWorkspaceModal from '../workspace/CreateWorkspaceModal';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import ConfirmModal from '../ui/ConfirmModal';
import type { Workspace } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  width?: number;
}

export default function Sidebar({ isOpen, width = 250 }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId, id } = useParams();
  const activeWorkspaceId = workspaceId || (location.pathname.startsWith('/workspace/') ? id : undefined);
  const { user, logout } = useAuth();
  const { loadWorkspaces, updateWorkspace, deleteWorkspace } = useApp();
  const { ownedWorkspaces, joinedWorkspaces, joinedEspaces, joinedListes } = useNavigationStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; workspace: Workspace | null }>({
    visible: false,
    x: 0,
    y: 0,
    workspace: null,
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [ownedOpen, setOwnedOpen] = useState(true);
  const [joinedOpen, setJoinedOpen] = useState(true);
  const [espacesOpen, setEspacesOpen] = useState(true);
  const [listesOpen, setListesOpen] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ workspaceId: string; onConfirm: () => Promise<void> } | null>(null);

  const handleWorkspaceCreated = () => {
    loadWorkspaces();
  };

  const openWorkspaceMenu = (event: MouseEvent, workspace: Workspace) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      workspace,
    });
  };

  const openEditWorkspace = () => {
    if (!contextMenu.workspace) return;
    setEditName(contextMenu.workspace.nom || '');
    setEditDescription(contextMenu.workspace.description || '');
    setIsEditModalOpen(true);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleEditWorkspace = async () => {
    if (!contextMenu.workspace || !editName.trim()) return;
    await updateWorkspace(contextMenu.workspace.id, {
      nom: editName,
      description: editDescription,
    });
    setIsEditModalOpen(false);
    await loadWorkspaces();
  };

  const handleDeleteWorkspace = async () => {
    const workspace = contextMenu.workspace;
    if (!workspace) return;
    setContextMenu(prev => ({ ...prev, visible: false }));

    setConfirmData({
      workspaceId: workspace.id,
      onConfirm: async () => {
        await deleteWorkspace(workspace.id);
        await loadWorkspaces();
        if (activeWorkspaceId === workspace.id) {
          navigate('/workspaces');
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const isCompact = width < 120;

  if (!isOpen) {
    return (
      <div className="flex h-full flex-col bg-primary py-4 shadow-xl overflow-y-auto items-center w-full">
        <div className="mb-8 flex justify-center">
          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-white text-xs">KP</div>
        </div>
        <nav className="flex flex-col items-center gap-4">
          <Link to="/dashboard" className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" title="Tableau de bord">
            <LayoutDashboard className="h-5 w-5" />
          </Link>
          <Link to="/workspaces" className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" title="Workspaces">
            <Briefcase className="h-5 w-5" />
          </Link>
        </nav>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-primary shadow-xl overflow-y-auto w-full items-center pb-2">
      {/* Logo */}
      <div className={`flex ${isCompact ? 'flex-col justify-center gap-1 py-4 px-1' : 'items-center gap-2 px-4 py-4'} w-full border-b border-white/10 transition-all`}>
        <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-secondary flex items-center justify-center font-bold text-white text-xs shadow-md">KP</div>
        <span className={`${isCompact ? 'text-[9px] mt-1' : 'text-lg'} font-bold text-white tracking-wide truncate transition-all`}>K-Planner</span>
      </div>

      {/* Profil utilisateur */}
      <div className={`w-full ${isCompact ? 'px-2 mt-3' : 'px-3 mt-4'}`}>
        <div className={`p-2 bg-white/5 rounded-xl flex ${isCompact ? 'flex-col items-center justify-center' : 'items-center gap-3'} border border-white/10`}>
          <div className={`${isCompact ? 'h-7 w-7' : 'h-10 w-10'} flex-shrink-0 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className={`${isCompact ? 'w-full text-center mt-1' : 'flex-1 min-w-0'} flex flex-col`}>
            <p className={`${isCompact ? 'text-[9px]' : 'text-sm'} font-medium text-white/90 truncate w-full`}>
              {user?.username || 'Invité'}
            </p>
            {!isCompact && <p className="text-xs text-white/60 truncate">{user?.email || 'connecté'}</p>}
          </div>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className={`mt-3 w-full ${isCompact ? 'px-2' : 'px-3'} space-y-1`}>
        <Link to="/dashboard" className="block w-full">
          <div className={`flex ${isCompact ? 'flex-col items-center justify-center p-2' : 'items-center px-3 py-2'} gap-2 rounded-lg transition-all ${location.pathname === '/dashboard'
            ? 'bg-secondary text-white shadow-md'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}>
            <LayoutDashboard className={`${isCompact ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
            <span className={`${isCompact ? 'text-[9px] leading-tight text-center' : 'text-sm'} truncate`}>
              {isCompact ? 'Dashboard' : 'Tableau de bord'}
            </span>
          </div>
        </Link>
      </nav>

      {/* Mes Workspaces (owned) */}
      <div className={`mt-3 pt-3 border-t border-white/10 w-full flex flex-col ${isCompact ? 'items-center' : ''}`}>
        <div className={`flex ${isCompact ? 'flex-col items-center justify-center gap-1.5' : 'items-center justify-between px-3'} mb-2 w-full`}>
          <button
            onClick={() => setOwnedOpen(!ownedOpen)}
            className={`flex items-center ${isCompact ? 'text-[9px]' : 'text-xs'} font-semibold text-white/50 uppercase tracking-wider hover:text-white/80 transition-colors`}
            title="Mes Workspaces"
          >
            {ownedOpen ? <ChevronDown className={`h-3 w-3 ${isCompact ? 'mr-0.5' : 'mr-1'}`} /> : <ChevronRight className={`h-3 w-3 ${isCompact ? 'mr-0.5' : 'mr-1'}`} />}
            <span className={`${isCompact ? 'truncate max-w-[50px]' : ''}`}>{isCompact ? 'Works.' : 'Mes Workspaces'}</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className={`p-1.5 rounded-lg bg-white/10 hover:bg-secondary transition-colors ${isCompact ? '' : 'flex-shrink-0'}`}
            title="Créer un workspace"
          >
            <Plus className="h-3 w-3 text-white" />
          </button>
        </div>
        {ownedOpen && (
          <div className={`space-y-1 w-full ${isCompact ? 'px-2 flex flex-col items-center' : 'px-2'}`}>
            {ownedWorkspaces.length === 0 && (
              <p className={`${isCompact ? 'text-[8px] text-center' : 'text-xs px-2'} text-white/40`}>Aucun{isCompact ? '' : ' workspace'}</p>
            )}
            {ownedWorkspaces.map((ws) => (
              <Link
                key={ws.id}
                to={`/workspace/${ws.id}`}
                onContextMenu={(event) => openWorkspaceMenu(event, ws)}
                className={`flex ${isCompact ? 'flex-col items-center justify-center p-1.5' : 'items-center px-2 py-1.5'} gap-2 rounded-lg w-full transition-all ${activeWorkspaceId === ws.id
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                title={ws.nom}
              >
                <Crown className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} flex-shrink-0 text-amber-400`} />
                <span className={`${isCompact ? 'text-[8px] text-center px-0.5' : 'text-sm'} truncate w-full`}>{ws.nom}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Workspaces rejoints (joined) */}
      {joinedWorkspaces.length > 0 && (
        <div className={`mt-2 pt-2 border-t border-white/10 w-full flex flex-col ${isCompact ? 'items-center' : ''}`}>
          <div className={`flex items-center ${isCompact ? 'justify-center' : 'justify-between px-3'} mb-2 w-full`}>
            <button
              onClick={() => setJoinedOpen(!joinedOpen)}
              className={`flex items-center ${isCompact ? 'text-[9px]' : 'text-xs'} font-semibold text-white/50 uppercase tracking-wider hover:text-white/80 transition-colors`}
              title="Workspaces rejoints"
            >
              {joinedOpen ? <ChevronDown className={`h-3 w-3 ${isCompact ? 'mr-0.5' : 'mr-1'}`} /> : <ChevronRight className={`h-3 w-3 ${isCompact ? 'mr-0.5' : 'mr-1'}`} />}
              <span>Rejoints</span>
            </button>
          </div>
          {joinedOpen && (
            <div className={`space-y-1 w-full ${isCompact ? 'px-2 flex flex-col items-center' : 'px-2'}`}>
              {joinedWorkspaces.map((ws) => (
                <Link
                  key={ws.id}
                  to={`/workspace/${ws.id}`}
                  className={`flex ${isCompact ? 'flex-col items-center justify-center p-1.5' : 'items-center px-2 py-1.5'} gap-2 rounded-lg w-full transition-all ${activeWorkspaceId === ws.id
                    ? 'bg-secondary text-white shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  title={ws.nom}
                >
                  <Users className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} flex-shrink-0 text-sky-400`} />
                  <span className={`${isCompact ? 'text-[8px] text-center px-0.5' : 'text-sm'} truncate w-full flex-1`}>{ws.nom}</span>
                  {!isCompact && ws.current_user_role && (
                    <span className="text-[10px] bg-white/15 text-white/60 px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
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
        <div className={`mt-2 pt-2 border-t border-white/10 w-full flex flex-col ${isCompact ? 'items-center' : ''}`}>
          <div className={`flex items-center ${isCompact ? 'justify-center' : 'justify-between px-3'} mb-2 w-full`}>
            <button
              onClick={() => setEspacesOpen(!espacesOpen)}
              className={`flex items-center ${isCompact ? 'text-[9px]' : 'text-xs'} font-semibold text-white/50 uppercase tracking-wider hover:text-white/80 transition-colors`}
              title="Espaces rejoints"
            >
              {espacesOpen ? <ChevronDown className={`h-3 w-3 ${isCompact ? 'mr-0.5' : 'mr-1'}`} /> : <ChevronRight className={`h-3 w-3 ${isCompact ? 'mr-0.5' : 'mr-1'}`} />}
              <span>Espaces</span>
            </button>
          </div>
          {espacesOpen && (
            <div className={`space-y-1 w-full ${isCompact ? 'px-2 flex flex-col items-center' : 'px-2'}`}>
              {joinedEspaces.map((espace) => (
                <div key={`joined-espace-${espace.id}`} className="w-full">
                  {!isCompact && (
                    <div className="flex items-center text-[10px] text-white/40 px-2 mt-1 truncate" title="Contexte Parent Restreint">
                      {espace.workspace_nom || 'Workspace'}
                    </div>
                  )}
                  <Link
                    to={`/espace/${espace.id}`}
                    className={`flex ${isCompact ? 'flex-col items-center justify-center p-1.5' : 'items-center px-2 py-1'} gap-2 rounded-lg w-full transition-all text-white/70 hover:bg-white/10 hover:text-white`}
                    title={`${espace.workspace_nom} > ${espace.nom}`}
                  >
                    <FolderOpen className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} flex-shrink-0 text-emerald-400`} />
                    <span className={`${isCompact ? 'text-[8px] text-center px-0.5' : 'text-sm'} truncate w-full flex-1`}>{espace.nom}</span>
                    {!isCompact && espace.role && (
                      <span className="text-[10px] bg-white/15 text-white/60 px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
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
        <div className={`mt-2 pt-2 border-t border-white/10 w-full flex flex-col ${isCompact ? 'items-center' : ''}`}>
          <div className={`flex items-center ${isCompact ? 'justify-center' : 'justify-between px-3'} mb-2 w-full`}>
            <button
              onClick={() => setListesOpen(!listesOpen)}
              className={`flex items-center ${isCompact ? 'text-[9px]' : 'text-xs'} font-semibold text-white/50 uppercase tracking-wider hover:text-white/80 transition-colors`}
              title="Listes rejointes"
            >
              {listesOpen ? <ChevronDown className={`h-3 w-3 ${isCompact ? 'mr-0.5' : 'mr-1'}`} /> : <ChevronRight className={`h-3 w-3 ${isCompact ? 'mr-0.5' : 'mr-1'}`} />}
              <span>Listes</span>
            </button>
          </div>
          {listesOpen && (
            <div className={`space-y-1 w-full ${isCompact ? 'px-2 flex flex-col items-center' : 'px-2'}`}>
              {joinedListes.map((liste) => (
                <div key={`joined-liste-${liste.id}`} className="w-full">
                  {!isCompact && (
                    <div className="flex items-center text-[10px] text-white/40 px-2 mt-1 truncate" title="Contexte Parent Restreint">
                      {liste.espace_nom || liste.workspace_nom || 'Parent inconnu'}
                    </div>
                  )}
                  <Link
                    to={`/liste/${liste.id}`}
                    className={`flex ${isCompact ? 'flex-col items-center justify-center p-1.5' : 'items-center px-2 py-1'} gap-2 rounded-lg w-full transition-all text-white/70 hover:bg-white/10 hover:text-white`}
                    title={`${liste.espace_nom || liste.workspace_nom} > ${liste.nom}`}
                  >
                    <ListTodo className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} flex-shrink-0 text-violet-400`} />
                    <span className={`${isCompact ? 'text-[8px] text-center px-0.5' : 'text-sm'} truncate w-full flex-1`}>{liste.nom}</span>
                    {!isCompact && liste.role && (
                      <span className="text-[10px] bg-white/15 text-white/60 px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
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

      {/* Footer */}
      <div className={`mt-auto pt-4 border-t border-white/10 w-full ${isCompact ? 'px-2 flex flex-col items-center' : 'px-3 pb-4'}`}>
        <button
          onClick={() => logout()}
          className={`w-full flex ${isCompact ? 'flex-col items-center justify-center p-2' : 'items-center gap-3 px-3 py-2'} rounded-lg text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors`}
          title="Déconnexion"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span className={`${isCompact ? 'text-[8px] font-semibold uppercase mt-1' : 'text-sm'} truncate`}>{isCompact ? 'Quitter' : 'Déconnexion'}</span>
        </button>
        <p className={`text-center ${isCompact ? 'text-[7px] mt-2' : 'text-xs mt-3'} text-white/30 truncate`}>v1.0 {isCompact ? '' : 'K-Planner'}</p>
      </div>

      {/* Modale de création */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleWorkspaceCreated}
      />

      {contextMenu.visible && contextMenu.workspace && (
        <div
          className="fixed z-50 min-w-[190px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        >
          <button onClick={openEditWorkspace} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
            <Edit className="h-4 w-4" />
            Modifier
          </button>
          <button onClick={handleDeleteWorkspace} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        </div>
      )}

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modifier le workspace" size="md">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nom"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            className="w-full rounded-lg border p-2"
            autoFocus
          />
          <textarea
            placeholder="Description"
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            rows={3}
            className="w-full rounded-lg border p-2"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Annuler</Button>
            <Button onClick={handleEditWorkspace}>Enregistrer</Button>
          </div>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmData?.onConfirm || (() => Promise.resolve())}
        title="Supprimer le workspace"
        message={`Voulez-vous vraiment supprimer définitivement "${contextMenu.workspace?.nom}" ?`}
      />
    </div>
  );
}

