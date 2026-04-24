// frontend/src/pages/app/LeftSidebar.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  ChevronDown, ChevronRight, FolderTree, Hash, MessageSquare, 
  FileText, Calendar, Plus, Edit, Trash2, UserPlus, ListTodo, Settings 
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { listeService } from '../../services/liste.service';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export default function LeftSidebar() {
  const { workspaceId, spaceId, listId } = useParams();
  const { 
    workspaces, loadEspacesTree, addEspace, updateEspace, deleteEspace, 
    addListe, updateListe, deleteListe, inviteMemberToEspace 
  } = useApp();
  const [openSpaces, setOpenSpaces] = useState<Record<string, boolean>>({});
  const [listsBySpace, setListsBySpace] = useState<Record<string, any[]>>({});
  const [loadingLists, setLoadingLists] = useState<Record<string, boolean>>({});
  
  const [workspaceLists, setWorkspaceLists] = useState<any[]>([]);
  const [loadingWorkspaceLists, setLoadingWorkspaceLists] = useState(false);

  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [parentSpaceId, setParentSpaceId] = useState<string | null>(null);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDesc, setNewSpaceDesc] = useState('');

  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isEditSpaceModalOpen, setIsEditSpaceModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<any>(null);
  const [editSpaceName, setEditSpaceName] = useState('');
  const [editSpaceDesc, setEditSpaceDesc] = useState('');

  const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<any>(null);
  const [editListName, setEditListName] = useState('');
  const [editListDesc, setEditListDesc] = useState('');

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Membre');

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    space: any;
  }>({ visible: false, x: 0, y: 0, space: null });

  const [listContextMenu, setListContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    list: any;
    parentSpaceId: string;
  }>({ visible: false, x: 0, y: 0, list: null, parentSpaceId: '' });

  const menuRef = useRef<HTMLDivElement>(null);
  const listMenuRef = useRef<HTMLDivElement>(null);

  const workspace = workspaces.find(w => w.id === workspaceId);

  // Fonction pour récupérer tous les espaces d'un arbre (récursif)
  const getAllSpacesFromTree = (items: any[]): any[] => {
    let result: any[] = [];
    for (const item of items) {
      result.push(item);
      if (item.sous_espaces?.length > 0) {
        result = result.concat(getAllSpacesFromTree(item.sous_espaces));
      }
    }
    return result;
  };

  useEffect(() => {
    if (workspaceId) {
      loadEspacesTree(workspaceId);
    }
  }, [workspaceId, loadEspacesTree]);

  // Charger les listes pour tous les espaces au démarrage (pour que les chevrons apparaissent)
  useEffect(() => {
    if (!workspace?.espaces) return;
    
    const loadAllLists = async () => {
      const allSpaces = getAllSpacesFromTree(workspace.espaces);
      for (const space of allSpaces) {
        if (!listsBySpace[space.id] && !loadingLists[space.id]) {
          setLoadingLists(prev => ({ ...prev, [space.id]: true }));
          try {
            const lists = await listeService.getByEspace(space.id);
            setListsBySpace(prev => ({ ...prev, [space.id]: lists }));
          } catch (error) {
            console.error(`Erreur chargement listes pour espace ${space.id}`, error);
          } finally {
            setLoadingLists(prev => ({ ...prev, [space.id]: false }));
          }
        }
      }
    };
    
    loadAllLists();
  }, [workspace?.espaces]);

  const loadWorkspaceLists = async () => {
    if (!workspaceId) return;
    setLoadingWorkspaceLists(true);
    try {
      const lists = await listeService.getByWorkspace(workspaceId);
      setWorkspaceLists(lists);
    } catch (error) {
      console.error('Erreur chargement listes du workspace', error);
    } finally {
      setLoadingWorkspaceLists(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceLists();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspace?.espaces) return;
    const fetchListsForOpenSpaces = async () => {
      for (const id of Object.keys(openSpaces)) {
        if (openSpaces[id] && !listsBySpace[id] && !loadingLists[id]) {
          setLoadingLists(prev => ({ ...prev, [id]: true }));
          try {
            const lists = await listeService.getByEspace(id);
            setListsBySpace(prev => ({ ...prev, [id]: lists }));
          } catch (error) {
            console.error(`Erreur chargement listes pour espace ${id}`, error);
          } finally {
            setLoadingLists(prev => ({ ...prev, [id]: false }));
          }
        }
      }
    };
    fetchListsForOpenSpaces();
  }, [openSpaces, workspace?.espaces, listsBySpace, loadingLists]);

  const refreshLists = async (espaceId: string) => {
    try {
      const lists = await listeService.getByEspace(espaceId);
      setListsBySpace(prev => ({ ...prev, [espaceId]: lists }));
    } catch (error) {
      console.error(`Erreur rafraîchissement listes espace ${espaceId}`, error);
    }
  };

  const toggleSpace = (id: string) => {
    setOpenSpaces(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateSpaceModal = (parentId?: string) => {
    setParentSpaceId(parentId || null);
    setNewSpaceName('');
    setNewSpaceDesc('');
    setIsCreateSpaceModalOpen(true);
    setIsCreateMenuOpen(false);
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim() || !workspaceId) return;
    try {
      await addEspace(workspaceId, {
        nom: newSpaceName,
        description: newSpaceDesc,
        id_espace_parent: parentSpaceId || undefined,
      });
      await loadEspacesTree(workspaceId);
      setIsCreateSpaceModalOpen(false);
    } catch (error) {
      console.error('Erreur création espace', error);
      alert('Erreur lors de la création de l\'espace');
    }
  };

  const openEditSpaceModal = (space: any) => {
    setEditingSpace(space);
    setEditSpaceName(space.nom);
    setEditSpaceDesc(space.description || '');
    setIsEditSpaceModalOpen(true);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleEditSpace = async () => {
    if (!editSpaceName.trim() || !editingSpace) return;
    try {
      await updateEspace(editingSpace.id, { nom: editSpaceName, description: editSpaceDesc });
      if (workspaceId) await loadEspacesTree(workspaceId);
      setIsEditSpaceModalOpen(false);
    } catch (error) {
      console.error('Erreur modification espace', error);
      alert('Erreur lors de la modification de l\'espace');
    }
  };

  const handleDeleteSpace = async (space: any) => {
    if (window.confirm(`Supprimer l'espace "${space.nom}" ? Cette action est irréversible.`)) {
      try {
        await deleteEspace(space.id);
        if (workspaceId) await loadEspacesTree(workspaceId);
      } catch (error) {
        console.error('Erreur suppression espace', error);
        alert('Erreur lors de la suppression de l\'espace');
      }
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const openCreateListModal = (spaceId?: string, workspaceId?: string) => {
    setSelectedSpaceId(spaceId || null);
    setSelectedWorkspaceId(workspaceId || null);
    setNewListName('');
    setNewListDesc('');
    setIsCreateListModalOpen(true);
    setIsCreateMenuOpen(false);
    if (contextMenu.visible) setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      if (selectedSpaceId) {
        await addListe(selectedSpaceId, { nom: newListName, description: newListDesc });
        await refreshLists(selectedSpaceId);
        setOpenSpaces(prev => ({ ...prev, [selectedSpaceId]: true }));
      } else if (selectedWorkspaceId) {
        await listeService.create({ nom: newListName, description: newListDesc, id_workspace: selectedWorkspaceId });
        await loadWorkspaceLists();
        alert(`Liste "${newListName}" créée dans le workspace.`);
      } else {
        throw new Error("Aucun espace ou workspace sélectionné.");
      }
      setIsCreateListModalOpen(false);
    } catch (error: any) {
      console.error('Erreur création liste', error);
      alert(error.message || 'Erreur lors de la création de la liste');
    }
  };

  const openEditListModal = (list: any, parentSpaceId: string) => {
    setEditingList({ ...list, parentSpaceId });
    setEditListName(list.nom);
    setEditListDesc(list.description || '');
    setIsEditListModalOpen(true);
    setListContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleEditList = async () => {
    if (!editListName.trim() || !editingList) return;
    try {
      await updateListe(editingList.id, { nom: editListName, description: editListDesc });
      await refreshLists(editingList.parentSpaceId);
      setIsEditListModalOpen(false);
    } catch (error) {
      console.error('Erreur modification liste', error);
      alert('Erreur lors de la modification de la liste');
    }
  };

  const handleDeleteList = async (list: any, parentSpaceId: string) => {
    if (window.confirm(`Supprimer la liste "${list.nom}" ? Cette action est irréversible.`)) {
      try {
        await deleteListe(list.id);
        await refreshLists(parentSpaceId);
      } catch (error) {
        console.error('Erreur suppression liste', error);
        alert('Erreur lors de la suppression de la liste');
      }
    }
    setListContextMenu(prev => ({ ...prev, visible: false }));
  };

  const openInviteModal = (space: any) => {
    setSelectedSpaceId(space.id);
    setInviteEmail('');
    setInviteRole('Membre');
    setIsInviteModalOpen(true);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedSpaceId) return;
    try {
      await inviteMemberToEspace(selectedSpaceId, inviteEmail, inviteRole);
      alert(`Invitation envoyée à ${inviteEmail}`);
      setIsInviteModalOpen(false);
    } catch (error) {
      console.error('Erreur invitation', error);
      alert('Erreur lors de l\'invitation');
    }
  };

  const handleSettings = (space: any) => {
    alert(`Paramètres de l'espace "${space.nom}" (à implémenter)`);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleContextMenu = (e: React.MouseEvent, space: any) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      space,
    });
  };

  const handleListContextMenu = (e: React.MouseEvent, list: any, parentSpaceId: string) => {
    e.preventDefault();
    setListContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      list,
      parentSpaceId,
    });
  };

  const renderTree = (items: any[], depth = 0) => {
    if (!items?.length) return <div className="text-sm text-gray-400 px-2 py-2">Aucun espace</div>;
    return items.map(item => (
      <div key={item.id} style={{ marginLeft: depth * 16 }} className="mb-1">
        <div
          className="flex items-center justify-between group"
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          <Link
            to={`/workspace/${workspaceId}/${item.id}`}
            className={`flex-1 flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm transition-all ${
              spaceId === item.id ? 'bg-secondary/10 text-secondary font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FolderTree className="h-4 w-4 text-primary" />
            <span className="truncate">{item.nom}</span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.preventDefault(); openCreateListModal(item.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600"
              title="Ajouter une liste"
            >
              <ListTodo className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); openCreateSpaceModal(item.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600"
              title="Ajouter un sous-espace"
            >
              <Plus className="h-3 w-3" />
            </button>
            {/* Chevron : s'affiche si l'espace a des sous-espaces OU des listes */}
            {(item.sous_espaces?.length > 0 || (listsBySpace[item.id]?.length ?? 0) > 0) && (
              <button onClick={() => toggleSpace(item.id)} className="p-1 text-gray-400">
                {openSpaces[item.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>
        {openSpaces[item.id] && item.sous_espaces?.length > 0 && (
          <div className="ml-4 mt-1">{renderTree(item.sous_espaces, depth + 1)}</div>
        )}
        {openSpaces[item.id] && (
          <div className="ml-4 mt-1 space-y-0.5">
            {loadingLists[item.id] && (
              <div className="text-sm text-gray-400 pl-6">Chargement...</div>
            )}
            {listsBySpace[item.id]?.map(list => (
              <div
                key={list.id}
                onContextMenu={(e) => handleListContextMenu(e, list, item.id)}
                className="block py-1.5 pl-8 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <Link
                  to={`/workspace/${workspaceId}/${item.id}/${list.id}`}
                  className="flex-1 flex items-center gap-2"
                >
                  <ListTodo className="h-4 w-4 text-gray-500" />
                  <span className={listId === list.id ? 'text-secondary font-medium' : ''}>
                    {list.nom}
                  </span>
                </Link>
              </div>
            ))}
            {!loadingLists[item.id] && listsBySpace[item.id]?.length === 0 && (
              <div className="text-sm text-gray-400 pl-8">Aucune liste</div>
            )}
          </div>
        )}
      </div>
    ));
  };

  if (!workspace) return <div className="p-4 text-center text-gray-500">Sélectionnez un workspace</div>;

  return (
    <div className="p-3">
      {/* Section Espaces et listes hiérarchiques */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 relative">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Espaces et listes</h3>
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <Plus className="h-3.5 w-3.5 text-gray-500" />
            </button>
            {isCreateMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200 py-1">
                <button
                  onClick={() => openCreateSpaceModal()}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <FolderTree className="h-4 w-4" />
                  Espace
                </button>
                <button
                  onClick={() => openCreateListModal(undefined, workspaceId)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <ListTodo className="h-4 w-4" />
                  Liste (projet)
                </button>
              </div>
            )}
          </div>
        </div>
        {renderTree(workspace.espaces || [])}
      </div>

      {/* Section Projets du workspace (listes sans espace) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projets (workspace)</h3>
        </div>
        <div className="space-y-0.5">
          {loadingWorkspaceLists && <div className="text-sm text-gray-400 pl-2">Chargement...</div>}
          {workspaceLists.map(list => (
            <div
              key={list.id}
              className="block py-1.5 pl-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <Link
                to={`/workspace/${workspaceId}/list/${list.id}`}
                className="flex-1 flex items-center gap-2"
              >
                <ListTodo className="h-4 w-4 text-gray-500" />
                <span className={listId === list.id ? 'text-secondary font-medium' : ''}>
                  {list.nom}
                </span>
              </Link>
            </div>
          ))}
          {!loadingWorkspaceLists && workspaceLists.length === 0 && (
            <div className="text-sm text-gray-400 pl-2">Aucun projet</div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Chat</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded p-1.5 cursor-pointer">
            <Hash className="h-4 w-4 text-secondary" /> Canal général d'environnement
          </div>
          <div className="pl-4">
            <div className="text-xs text-gray-400 mb-1">Canaux d'espace</div>
            <div className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded p-1.5 cursor-pointer">
              <Hash className="h-4 w-4 text-gray-400" /> Canal d'espace 1
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded p-1.5 cursor-pointer">
            <MessageSquare className="h-4 w-4 text-primary" /> Discussions directes
          </div>
        </div>
      </div>

      {/* Gestion */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Gestion</h3>
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

      {/* Menus contextuels */}
      {contextMenu.visible && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => openEditSpaceModal(contextMenu.space)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <Edit className="h-4 w-4" /> Modifier
          </button>
          <button onClick={() => handleDeleteSpace(contextMenu.space)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> Supprimer
          </button>
          <button onClick={() => openInviteModal(contextMenu.space)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <UserPlus className="h-4 w-4" /> Inviter
          </button>
          <button onClick={() => openCreateListModal(contextMenu.space.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <ListTodo className="h-4 w-4" /> Créer une liste
          </button>
          <button onClick={() => handleSettings(contextMenu.space)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <Settings className="h-4 w-4" /> Paramètres
          </button>
        </div>
      )}

      {listContextMenu.visible && (
        <div
          ref={listMenuRef}
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]"
          style={{ top: listContextMenu.y, left: listContextMenu.x }}
        >
          <button onClick={() => openEditListModal(listContextMenu.list, listContextMenu.parentSpaceId)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <Edit className="h-4 w-4" /> Modifier la liste
          </button>
          <button onClick={() => handleDeleteList(listContextMenu.list, listContextMenu.parentSpaceId)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> Supprimer la liste
          </button>
        </div>
      )}

      {/* Modales */}
      <Modal isOpen={isCreateSpaceModalOpen} onClose={() => setIsCreateSpaceModalOpen(false)} title={parentSpaceId ? "Créer un sous-espace" : "Créer un espace"} size="md">
        <div className="space-y-4">
          <input type="text" placeholder="Nom" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} className="w-full p-2 border rounded-lg" autoFocus />
          <textarea placeholder="Description" value={newSpaceDesc} onChange={e => setNewSpaceDesc(e.target.value)} rows={2} className="w-full p-2 border rounded-lg" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateSpaceModalOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateSpace}>Créer</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditSpaceModalOpen} onClose={() => setIsEditSpaceModalOpen(false)} title="Modifier l'espace" size="md">
        <div className="space-y-4">
          <input type="text" placeholder="Nom" value={editSpaceName} onChange={e => setEditSpaceName(e.target.value)} className="w-full p-2 border rounded-lg" />
          <textarea placeholder="Description" value={editSpaceDesc} onChange={e => setEditSpaceDesc(e.target.value)} rows={2} className="w-full p-2 border rounded-lg" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditSpaceModalOpen(false)}>Annuler</Button>
            <Button onClick={handleEditSpace}>Enregistrer</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isCreateListModalOpen} onClose={() => setIsCreateListModalOpen(false)} title="Créer une liste" size="md">
        <div className="space-y-4">
          <input type="text" placeholder="Nom de la liste" value={newListName} onChange={e => setNewListName(e.target.value)} className="w-full p-2 border rounded-lg" autoFocus />
          <textarea placeholder="Description" value={newListDesc} onChange={e => setNewListDesc(e.target.value)} rows={2} className="w-full p-2 border rounded-lg" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateListModalOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateList}>Créer</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditListModalOpen} onClose={() => setIsEditListModalOpen(false)} title="Modifier la liste" size="md">
        <div className="space-y-4">
          <input type="text" placeholder="Nom" value={editListName} onChange={e => setEditListName(e.target.value)} className="w-full p-2 border rounded-lg" />
          <textarea placeholder="Description" value={editListDesc} onChange={e => setEditSpaceDesc(e.target.value)} rows={2} className="w-full p-2 border rounded-lg" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditListModalOpen(false)}>Annuler</Button>
            <Button onClick={handleEditList}>Enregistrer</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Inviter un membre" size="md">
        <div className="space-y-4">
          <input type="email" placeholder="Email du membre" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full p-2 border rounded-lg" />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full p-2 border rounded-lg">
            <option value="Membre">Membre</option>
            <option value="Administrateur">Administrateur</option>
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Annuler</Button>
            <Button onClick={handleInviteMember}>Inviter</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}