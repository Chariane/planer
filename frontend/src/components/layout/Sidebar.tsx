// frontend/src/components/layout/Sidebar.tsx
import { useState, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Plus, LogOut, Crown, Users, ChevronDown, ChevronRight, FolderOpen, ListTodo, Edit, Trash2, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useNavigationStore } from '../../store/useNavigationStore';
import CreateWorkspaceModal from '../workspace/CreateWorkspaceModal';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import ConfirmModal from '../ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import type { Workspace } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  isCompact?: boolean;
}

export default function Sidebar({ isOpen, isCompact = false }: SidebarProps) {
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

  if (!isOpen) {
    return (
      <div className="flex h-full flex-col bg-primary py-4 shadow-2xl overflow-y-auto items-center w-full border-r border-white/5">
        <div className="mb-10 flex justify-center">
          <motion.div whileHover={{ rotate: 15 }} className="h-9 w-9 rounded-xl bg-gradient-to-br from-secondary to-orange-400 flex items-center justify-center font-black text-white text-xs shadow-lg shadow-secondary/20">KP</motion.div>
        </div>
        <nav className="flex flex-col items-center gap-6">
          <Link to="/dashboard" className={`p-2.5 rounded-xl transition-all ${location.pathname === '/dashboard' ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`} title="Tableau de bord">
            <LayoutDashboard size={20} />
          </Link>
          <Link to="/workspaces" className={`p-2.5 rounded-xl transition-all ${location.pathname === '/workspaces' ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`} title="Workspaces">
            <Briefcase size={20} />
          </Link>
        </nav>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-primary shadow-2xl overflow-y-auto w-full items-center pb-2 border-r border-white/5">
      {/* Logo Section */}
      <div className={`flex ${isCompact ? 'flex-col items-center justify-center gap-1 py-6 px-1' : 'items-center gap-3 px-5 py-6'} w-full border-b border-white/5 transition-all`}>
        <motion.div whileHover={{ rotate: 15 }} className="h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-secondary to-orange-400 flex items-center justify-center font-black text-white text-sm shadow-xl shadow-secondary/20">KP</motion.div>
        {!isCompact && (
          <div className="flex flex-col">
            <span className="text-lg font-black text-white tracking-tight leading-none">K-Planner</span>
          </div>
        )}
      </div>

      {/* Profil Section */}
      <div className={`w-full ${isCompact ? 'px-2 mt-6' : 'px-4 mt-6'}`}>
        <div className={`p-2.5 bg-white/5 rounded-2xl flex ${isCompact ? 'flex-col items-center justify-center' : 'items-center gap-3'} border border-white/5 group hover:bg-white/10 transition-all cursor-pointer`}>
          <div className={`${isCompact ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'} flex-shrink-0 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-white font-black shadow-lg`}>
            {user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!isCompact && (
            <div className="flex-1 min-w-0 flex flex-col">
              <p className="text-sm font-bold text-white truncate group-hover:text-secondary transition-colors">
                {user?.email || 'Invité'}
              </p>
              <p className="text-[10px] font-black text-white/30 truncate uppercase tracking-tight">Espace Personnel</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className={`mt-6 w-full ${isCompact ? 'px-2' : 'px-4'} space-y-2`}>
        <Link to="/dashboard" className="block w-full">
          <motion.div whileHover={{ x: 4 }} className={`flex ${isCompact ? 'flex-col items-center justify-center p-2.5' : 'items-center px-4 py-3'} gap-3 rounded-xl transition-all ${location.pathname === '/dashboard'
            ? 'bg-secondary text-white shadow-xl shadow-secondary/20 font-bold'
            : 'text-white/40 hover:bg-white/5 hover:text-white'
            }`}>
            <LayoutDashboard size={isCompact ? 18 : 20} className="flex-shrink-0" />
            <span className={`${isCompact ? 'text-[8px] font-black uppercase mt-1' : 'text-sm'} truncate`}>
              {isCompact ? 'Dash' : 'Tableau de bord'}
            </span>
          </motion.div>
        </Link>
      </nav>

      {/* Sections Dividers & Labels */}
      <div className="w-full mt-8 px-4 flex items-center gap-3">
        <div className="h-[1px] flex-1 bg-white/5" />
        {!isCompact && <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Organisation</span>}
        <div className="h-[1px] flex-1 bg-white/5" />
      </div>

      {/* Workspaces Scroll Area */}
      <div className="flex-1 w-full overflow-y-auto custom-scrollbar-hidden mt-4 pb-4">
        {/* Owned Workspaces */}
        <div className={`w-full flex flex-col ${isCompact ? 'items-center' : ''}`}>
          <div className={`flex ${isCompact ? 'flex-col items-center justify-center gap-1.5' : 'items-center justify-between px-5'} mb-3 w-full`}>
            <button
              onClick={() => setOwnedOpen(!ownedOpen)}
              className={`flex items-center ${isCompact ? 'text-[9px]' : 'text-[10px]'} font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors`}
            >
              <div className="flex items-center">
                {ownedOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                {!isCompact && "Propriétés"}
              </div>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-secondary text-white/40 hover:text-white transition-all shadow-sm"
              title="Créer un espace"
            >
              <Plus size={14} />
            </button>
          </div>

          <AnimatePresence>
            {ownedOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`space-y-1 w-full ${isCompact ? 'px-2' : 'px-4'}`}>
                {ownedWorkspaces.map((ws) => (
                  <Link
                    key={ws.id}
                    to={`/workspace/${ws.id}`}
                    onContextMenu={(event) => openWorkspaceMenu(event, ws)}
                    className={`flex ${isCompact ? 'flex-col items-center justify-center p-2' : 'items-center px-4 py-2'} gap-3 rounded-xl w-full transition-all group ${activeWorkspaceId === ws.id
                      ? 'bg-white/10 text-white shadow-inner font-bold border border-white/5'
                      : 'text-white/40 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <Crown size={isCompact ? 14 : 16} className={`${activeWorkspaceId === ws.id ? 'text-amber-400' : 'text-amber-400/40 group-hover:text-amber-400 transition-colors'}`} />
                    {!isCompact && <span className="text-sm truncate w-full">{ws.nom}</span>}
                    {isCompact && <span className="text-[8px] font-black truncate text-center">{ws.nom.substring(0, 2).toUpperCase()}</span>}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Joined Workspaces */}
        {joinedWorkspaces.length > 0 && (
          <div className="mt-4 w-full flex flex-col">
            <div className={`flex items-center ${isCompact ? 'justify-center' : 'justify-between px-5'} mb-3 w-full`}>
              <button
                onClick={() => setJoinedOpen(!joinedOpen)}
                className={`flex items-center ${isCompact ? 'text-[9px]' : 'text-[10px]'} font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors`}
              >
                <div className="flex items-center">
                  {joinedOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                  <Users className="h-3 w-3 mr-1" />
                  {!isCompact && "Collaborations"}
                </div>
              </button>
            </div>
            <AnimatePresence>
              {joinedOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`space-y-1 w-full ${isCompact ? 'px-2' : 'px-4'}`}>
                  {joinedWorkspaces.map((ws) => (
                    <Link
                      key={ws.id}
                      to={`/workspace/${ws.id}`}
                      className={`flex ${isCompact ? 'flex-col items-center justify-center p-2' : 'items-center px-4 py-2'} gap-3 rounded-xl w-full transition-all group ${activeWorkspaceId === ws.id
                        ? 'bg-white/10 text-white font-bold border border-white/5'
                        : 'text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                      <Globe size={16} className={`${activeWorkspaceId === ws.id ? 'text-sky-400' : 'text-sky-400/40 group-hover:text-sky-400 transition-colors'}`} />
                      {!isCompact && <span className="text-sm truncate w-full flex-1">{ws.nom}</span>}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Joined Espaces */}
        {joinedEspaces.length > 0 && (
          <div className="mt-4 w-full flex flex-col">
            <div className={`flex items-center ${isCompact ? 'justify-center' : 'justify-between px-5'} mb-3 w-full`}>
              <button
                onClick={() => setEspacesOpen(!espacesOpen)}
                className={`flex items-center ${isCompact ? 'text-[9px]' : 'text-[10px]'} font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors`}
              >
                <div className="flex items-center">
                  {espacesOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                  <FolderOpen className="h-3 w-3 mr-1" />
                  {!isCompact && "Sous-Espaces"}
                </div>
              </button>
            </div>
            <AnimatePresence>
              {espacesOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`space-y-1 w-full ${isCompact ? 'px-2' : 'px-4'}`}>
                  {joinedEspaces.map((espace) => (
                    <Link
                      key={espace.id}
                      to={`/espace/${espace.id}`}
                      className="flex items-center px-4 py-2 gap-3 rounded-xl w-full transition-all group text-white/40 hover:bg-white/5 hover:text-white"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/40 group-hover:bg-emerald-400 transition-colors" />
                      {!isCompact && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{espace.nom}</span>
                          <span className="text-[8px] font-black uppercase text-white/10 group-hover:text-white/20 transition-colors">{espace.workspace_nom}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Joined Listes */}
        {joinedListes.length > 0 && (
          <div className="mt-4 w-full flex flex-col">
            <div className={`flex items-center ${isCompact ? 'justify-center' : 'justify-between px-5'} mb-3 w-full`}>
              <button
                onClick={() => setListesOpen(!listesOpen)}
                className={`flex items-center ${isCompact ? 'text-[9px]' : 'text-[10px]'} font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors`}
              >
                <div className="flex items-center">
                  {listesOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                  <ListTodo className="h-3 w-3 mr-1" />
                  {!isCompact && "Projets"}
                </div>
              </button>
            </div>
            <AnimatePresence>
              {listesOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`space-y-1 w-full ${isCompact ? 'px-2' : 'px-4'}`}>
                  {joinedListes.map((list) => (
                    <Link
                      key={list.id}
                      to={`/liste/${list.id}`}
                      className="flex items-center px-4 py-2 gap-3 rounded-xl w-full transition-all group text-white/40 hover:bg-white/5 hover:text-white"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/40 group-hover:bg-emerald-400 transition-colors" />
                      {!isCompact && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{list.nom}</span>
                          <span className="text-[8px] font-black uppercase text-white/10 group-hover:text-white/20 transition-colors">{list.workspace_nom}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer / Exit */}
      <div className={`mt-auto pt-6 border-t border-white/5 w-full ${isCompact ? 'px-2 flex flex-col items-center pb-6' : 'px-4 pb-6'} space-y-3`}>
        <Link
          to="/"
          className={`group w-full flex ${isCompact ? 'flex-col items-center justify-center p-2.5' : 'items-center gap-3 px-4 py-2'} rounded-xl text-white/10 hover:text-white/60 transition-all font-bold border border-transparent hover:bg-white/5`}
          title="Explorer le site"
        >
          <Globe size={isCompact ? 18 : 16} className="flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
          {!isCompact && <span className="text-[9px] uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100">Visiter le site</span>}
        </Link>

        <button
          onClick={() => logout()}
          className={`group w-full flex ${isCompact ? 'flex-col items-center justify-center p-3' : 'items-center gap-3 px-4 py-3'} rounded-xl text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all font-black border border-transparent hover:border-red-500/20`}
        >
          <LogOut size={isCompact ? 18 : 20} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
          {!isCompact && <span className="text-[10px] uppercase tracking-widest">Se déconnecter</span>}
        </button>
      </div>

      {/* Right Click Menu (Modernized) */}
      <AnimatePresence>
        {contextMenu.visible && contextMenu.workspace && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[100] min-w-[200px] rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-2 shadow-2xl"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onMouseLeave={() => setContextMenu(prev => ({ ...prev, visible: false }))}
          >
            <button onClick={openEditWorkspace} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <Edit size={14} className="text-secondary" />
              Modifier l'Espace
            </button>
            <div className="h-[1px] bg-white/5 my-1 mx-2" />
            <button onClick={handleDeleteWorkspace} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
              <Trash2 size={14} />
              Supprimer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleWorkspaceCreated}
      />

      {/* Edit Workspace Modal (Premium) */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Éditer l'Organisation" size="md">
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Nom de l'espace</label>
            <input
              type="text"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="w-full bg-theme-surface/50 border border-white/10 rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Description</label>
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={4}
              className="w-full bg-theme-surface/50 border border-white/10 rounded-2xl px-5 py-4 text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-medium transition-all resize-none"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px]" onClick={() => setIsEditModalOpen(false)}>Annuler</Button>
            <Button className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-theme-md" onClick={handleEditWorkspace}>Sauvegarder</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmData?.onConfirm || (() => Promise.resolve())}
        title="Confirmation de Suppression"
        message={`Attention, l'espace "${contextMenu.workspace?.nom}" ainsi que tous ses projets et membres seront définitivement supprimés. Cette action est irréversible.`}
        confirmText="Supprimer Définitivement"
        confirmVariant="danger"
      />
    </div>
  );
}
