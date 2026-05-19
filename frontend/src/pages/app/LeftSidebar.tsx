// frontend/src/pages/app/LeftSidebar.tsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import {
  ChevronDown, ChevronRight, FolderTree, Hash, MessageSquare,
  FileText, Calendar, Plus, Edit, Trash2, ListTodo, Settings, UserPlus, X
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { listeService } from '../../services/liste.service';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { usePermissions } from '../../hooks/usePermissions';
import { useWorkspaceRole } from '../../hooks/useWorkspaceRole';
import { useResourceRole } from '../../hooks/useResourceRole';
import { getRoleLabel, getRoleRank, ROLES } from '../../lib/roleHierarchy';

// Composant Toast simple
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-white min-w-[200px] ${bgColor}`}>
        <span className="text-sm flex-1">{message}</span>
        <button onClick={onClose} className="hover:opacity-70">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default function LeftSidebar() {
  const { workspaceId, spaceId, listId } = useActiveResource();
  const {
    workspaces, joinedEspaces, loadWorkspaceLocalResources, loadEspacesTree, addEspace, updateEspace, deleteEspace,
    addListe, updateListe, deleteListe, inviteMemberToEspace
  } = useApp();

  // Récupérer le rôle dans le workspace (pour les actions globales)
  const { role: workspaceRole, isAdmin: isWorkspaceAdmin, isCreator: isWorkspaceCreator, isGuest: isWorkspaceGuest } = useWorkspaceRole(workspaceId);
  
  // Récupérer le rôle dans l'espace (si un espace est sélectionné) - POUR LES ACTIONS SUR LES ESPACES
  const { role: espaceRole } = useResourceRole(spaceId !== 'list' ? spaceId : undefined, 'espace');
  
  // Pour les actions sur les espaces, on utilise le rôle de l'espace (ou du workspace en fallback)
  const effectiveRoleForSpace = espaceRole || workspaceRole;
  
  // Permissions pour les actions sur les espaces
  const spacePermissions = usePermissions({
    userRole: effectiveRoleForSpace,
    resourceType: 'espace',
  });
  
  const canManageSpaceListe = spacePermissions.canManageListe || isWorkspaceAdmin || isWorkspaceCreator;

  // États pour les notifications toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // État pour la modale de confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'space' | 'list';
    item: any;
    parentSpaceId?: string | null;
    isWorkspaceList?: boolean;
  }>({
    isOpen: false,
    type: 'space',
    item: null,
    parentSpaceId: null,
    isWorkspaceList: false,
  });

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
  const [inviteRole, setInviteRole] = useState<string>(ROLES.GUEST);

  // États pour les menus contextuels
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    space: any;
    canInvite: boolean;
  }>({ visible: false, x: 0, y: 0, space: null, canInvite: false });

  const [listContextMenu, setListContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    list: any;
    parentSpaceId: string | null;
    isWorkspaceList: boolean;
  }>({ visible: false, x: 0, y: 0, list: null, parentSpaceId: null, isWorkspaceList: false });

  const menuRef = useRef<HTMLDivElement>(null);
  const listMenuRef = useRef<HTMLDivElement>(null);

  // Fermer les menus contextuels quand on clique ailleurs
  useEffect(() => {
    const handleClickOutsideMenus = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
      if (listMenuRef.current && !listMenuRef.current.contains(event.target as Node)) {
        setListContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutsideMenus);
    return () => document.removeEventListener('mousedown', handleClickOutsideMenus);
  }, []);

  const hasWorkspaceAccess = !!workspaceId;

  // Fonction pour récupérer tous les espaces d'un arbre (récursif)
  const getAllSpacesFromTree = (items: any[] | undefined): any[] => {
    if (!items) return [];
    let result: any[] = [];
    for (const item of items) {
      result.push(item);
      if (item.sous_espaces?.length > 0) {
        result = result.concat(getAllSpacesFromTree(item.sous_espaces));
      }
    }
    return result;
  };

  const normalizeName = (value: string) => value.trim().toLowerCase();

  const getSiblingSpaces = (parentId: string | null): any[] => {
    const workspaceData = workspaces.find(w => w.id === workspaceId);
    if (!workspaceData?.espaces) return [];
    if (!parentId) {
      return workspaceData.espaces.filter((space: any) => !space.id_espace_parent);
    }
    const parent = getAllSpacesFromTree(workspaceData.espaces).find((space: any) => space.id === parentId);
    return parent?.sous_espaces || [];
  };

  const hasSiblingName = (items: any[], name: string, excludeId?: string) =>
    items.some(item => item.id !== excludeId && normalizeName(item.nom || '') === normalizeName(name));

  const findSpacePath = (items: any[] | undefined, targetId: string, path: any[] = []): any[] | null => {
    if (!items) return null;
    for (const item of items) {
      const nextPath = [...path, item];
      if (item.id === targetId) return nextPath;
      const childPath = findSpacePath(item.sous_espaces, targetId, nextPath);
      if (childPath) return childPath;
    }
    return null;
  };

  const getDirectSpaceRole = (targetSpaceId: string): string | null => {
    return joinedEspaces.find(espace => espace.id === targetSpaceId)?.role || null;
  };

  const getHighestRole = (roles: Array<string | null | undefined>): string | null => {
    return roles.reduce<string | null>((highest, role) => {
      if (!role) return highest;
      return getRoleRank(role) > getRoleRank(highest) ? role : highest;
    }, null);
  };

  const getEffectiveSpaceRole = (targetSpaceId: string): string | null => {
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    const path = findSpacePath(workspace?.espaces || [], targetSpaceId);
    const inheritedRoles: Array<string | null> = [
      isWorkspaceCreator ? ROLES.CREATOR : null,
      isWorkspaceAdmin ? ROLES.ADMIN : null,
      isWorkspaceGuest ? ROLES.GUEST : null,
      getDirectSpaceRole(targetSpaceId),
    ];

    if (!path) return getHighestRole(inheritedRoles);

    for (let index = path.length - 1; index >= 0; index -= 1) {
      const role = getDirectSpaceRole(path[index].id);
      const isTargetSpace = index === path.length - 1;
      const isInheritedRole = role === ROLES.CREATOR || role === ROLES.ADMIN || role === ROLES.GUEST;
      if (isTargetSpace || isInheritedRole) {
        inheritedRoles.push(role);
      }
    }

    return getHighestRole(inheritedRoles);
  };

  const canManageSpace = (targetSpaceId: string): boolean => {
    const role = getEffectiveSpaceRole(targetSpaceId);
    return role === ROLES.CREATOR || role === ROLES.ADMIN;
  };

  const canDeleteTargetSpace = (targetSpaceId: string): boolean => {
    const role = getEffectiveSpaceRole(targetSpaceId);
    const directRole = getDirectSpaceRole(targetSpaceId);
    if (role === ROLES.CREATOR) return true;
    return role === ROLES.ADMIN && directRole !== ROLES.ADMIN;
  };

  const getAvailableInvitationRolesForSpace = (targetSpaceId: string | null): string[] => {
    if (!targetSpaceId) return [];
    if (isWorkspaceCreator || isWorkspaceAdmin) return [ROLES.ADMIN, ROLES.GUEST];
    const role = getEffectiveSpaceRole(targetSpaceId);
    if (role === ROLES.CREATOR) return [ROLES.ADMIN, ROLES.GUEST];
    if (role === ROLES.ADMIN) {
      const directRole = getDirectSpaceRole(targetSpaceId);
      return directRole === ROLES.ADMIN
        ? [ROLES.MEMBER, ROLES.GUEST]
        : [ROLES.ADMIN, ROLES.MEMBER, ROLES.GUEST];
    }
    return [];
  };

  const canManageListContext = (parentSpaceIdParam: string | null, isWorkspaceListParam: boolean): boolean => {
    if (isWorkspaceListParam) return isWorkspaceCreator || isWorkspaceAdmin;
    return !!parentSpaceIdParam && canManageSpace(parentSpaceIdParam);
  };

  const selectedSpaceEffectiveRole = spaceId && spaceId !== 'list' ? getEffectiveSpaceRole(spaceId) : workspaceRole;
  const isAdminForSpace = selectedSpaceEffectiveRole === ROLES.ADMIN || isWorkspaceAdmin;
  const isCreatorForSpace = selectedSpaceEffectiveRole === ROLES.CREATOR || isWorkspaceCreator;
  const isGuestForSpace = selectedSpaceEffectiveRole === ROLES.GUEST || (!selectedSpaceEffectiveRole && isWorkspaceGuest);

  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceLocalResources(workspaceId);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId && hasWorkspaceAccess) {
      loadEspacesTree(workspaceId).catch(() => {});
    }
  }, [workspaceId, hasWorkspaceAccess, loadEspacesTree]);

  // Charger les listes pour tous les espaces au démarrage
  useEffect(() => {
    if (!hasWorkspaceAccess) return;

    const loadAllLists = async () => {
      const workspaceData = workspaces.find(w => w.id === workspaceId);
      const allSpaces = getAllSpacesFromTree(workspaceData?.espaces || []);
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
  }, [hasWorkspaceAccess, workspaces, workspaceId]);

  const loadWorkspaceLists = async () => {
    if (!workspaceId) return;
    setLoadingWorkspaceLists(true);
    try {
      const lists = await listeService.getByWorkspace(workspaceId);
      setWorkspaceLists(lists);
    } catch {
      setWorkspaceLists([]);
    } finally {
      setLoadingWorkspaceLists(false);
    }
  };

  useEffect(() => {
    if (workspaceId && hasWorkspaceAccess) {
      loadWorkspaceLists();
    }
  }, [workspaceId, hasWorkspaceAccess]);

  useEffect(() => {
    if (!hasWorkspaceAccess || !workspaces.length) return;
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
  }, [hasWorkspaceAccess, openSpaces, workspaces, listsBySpace, loadingLists]);

  const refreshLists = async (espaceId: string) => {
    try {
      const lists = await listeService.getByEspace(espaceId);
      setListsBySpace(prev => ({ ...prev, [espaceId]: lists }));
    } catch (error) {
      console.error(`Erreur rafraîchissement listes espace ${espaceId}`, error);
    }
  };

  const refreshWorkspaceLists = async () => {
    await loadWorkspaceLists();
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
    setContextMenu(prev => ({ ...prev, visible: false }));
    setListContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim() || !workspaceId) return;
    if (hasSiblingName(getSiblingSpaces(parentSpaceId), newSpaceName)) {
      showMessage('Un espace portant ce nom existe déjà dans ce parent.', 'error');
      return;
    }
    try {
      await addEspace(workspaceId, {
        nom: newSpaceName,
        description: newSpaceDesc,
        id_espace_parent: parentSpaceId || undefined,
      });
      await loadEspacesTree(workspaceId);
      setIsCreateSpaceModalOpen(false);
      showMessage(`Espace "${newSpaceName}" créé avec succès`, 'success');
    } catch (error: any) {
      console.error('Erreur création espace', error);
      showMessage(error.message || 'Erreur lors de la création de l\'espace', 'error');
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
    if (hasSiblingName(getSiblingSpaces(editingSpace.id_espace_parent || null), editSpaceName, editingSpace.id)) {
      showMessage('Un espace portant ce nom existe déjà dans ce parent.', 'error');
      return;
    }
    try {
      await updateEspace(editingSpace.id, { nom: editSpaceName, description: editSpaceDesc });
      if (workspaceId) await loadEspacesTree(workspaceId);
      setIsEditSpaceModalOpen(false);
      showMessage(`Espace "${editSpaceName}" modifié avec succès`, 'success');
    } catch (error: any) {
      console.error('Erreur modification espace', error);
      showMessage(error.message || 'Erreur lors de la modification de l\'espace', 'error');
    }
  };

  const handleDeleteSpace = (space: any) => {
    setConfirmModal({
      isOpen: true,
      type: 'space',
      item: space,
    });
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const confirmDeleteSpace = async () => {
    const space = confirmModal.item;
    if (!space) return;
    try {
      await deleteEspace(space.id);
      if (workspaceId) await loadEspacesTree(workspaceId);
      showMessage(`Espace "${space.nom}" supprimé avec succès`, 'success');
    } catch (error) {
      console.error('Erreur suppression espace', error);
      showMessage('Erreur lors de la suppression de l\'espace', 'error');
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false, item: null }));
  };

  const openCreateListModal = (spaceIdParam?: string, workspaceIdParam?: string) => {
    setSelectedSpaceId(spaceIdParam || null);
    setSelectedWorkspaceId(workspaceIdParam || null);
    setNewListName('');
    setNewListDesc('');
    setIsCreateListModalOpen(true);
    setIsCreateMenuOpen(false);
    setContextMenu(prev => ({ ...prev, visible: false }));
    setListContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    const siblingLists = selectedSpaceId ? (listsBySpace[selectedSpaceId] || []) : workspaceLists;
    if (hasSiblingName(siblingLists, newListName)) {
      showMessage('Une liste portant ce nom existe déjà dans ce parent.', 'error');
      return;
    }
    try {
      if (selectedSpaceId) {
        await addListe(selectedSpaceId, { nom: newListName, description: newListDesc });
        await refreshLists(selectedSpaceId);
        setOpenSpaces(prev => ({ ...prev, [selectedSpaceId]: true }));
        showMessage(`Liste "${newListName}" créée dans l'espace`, 'success');
      } else if (selectedWorkspaceId) {
        await listeService.create({ nom: newListName, description: newListDesc, id_workspace: selectedWorkspaceId });
        await refreshWorkspaceLists();
        showMessage(`Liste "${newListName}" créée dans le workspace`, 'success');
      } else {
        throw new Error("Aucun espace ou workspace sélectionné.");
      }
      setIsCreateListModalOpen(false);
    } catch (error: any) {
      console.error('Erreur création liste', error);
      showMessage(error.message || 'Erreur lors de la création de la liste', 'error');
    }
  };

  const openEditListModal = (list: any, parentSpaceIdParam: string | null, isWorkspaceListParam: boolean) => {
    setEditingList({ ...list, parentSpaceId: parentSpaceIdParam, isWorkspaceList: isWorkspaceListParam });
    setEditListName(list.nom);
    setEditListDesc(list.description || '');
    setIsEditListModalOpen(true);
    setListContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleEditList = async () => {
    if (!editListName.trim() || !editingList) return;
    const siblingLists = editingList.isWorkspaceList
      ? workspaceLists
      : (listsBySpace[editingList.parentSpaceId] || []);
    if (hasSiblingName(siblingLists, editListName, editingList.id)) {
      showMessage('Une liste portant ce nom existe déjà dans ce parent.', 'error');
      return;
    }
    try {
      await updateListe(editingList.id, { nom: editListName, description: editListDesc });
      if (editingList.isWorkspaceList) {
        await refreshWorkspaceLists();
      } else if (editingList.parentSpaceId) {
        await refreshLists(editingList.parentSpaceId);
      }
      setIsEditListModalOpen(false);
      showMessage(`Liste "${editListName}" modifiée avec succès`, 'success');
    } catch (error: any) {
      console.error('Erreur modification liste', error);
      showMessage(error.message || 'Erreur lors de la modification de la liste', 'error');
    }
  };

  const handleDeleteList = (list: any, parentSpaceIdParam: string | null, isWorkspaceListParam: boolean) => {
    setConfirmModal({
      isOpen: true,
      type: 'list',
      item: list,
      parentSpaceId: parentSpaceIdParam,
      isWorkspaceList: isWorkspaceListParam,
    });
    setListContextMenu(prev => ({ ...prev, visible: false }));
  };

  const confirmDeleteList = async () => {
    const list = confirmModal.item;
    if (!list) return;
    try {
      await deleteListe(list.id);
      if (confirmModal.isWorkspaceList) {
        await refreshWorkspaceLists();
      } else if (confirmModal.parentSpaceId) {
        await refreshLists(confirmModal.parentSpaceId);
      }
      showMessage(`Liste "${list.nom}" supprimée avec succès`, 'success');
    } catch (error) {
      console.error('Erreur suppression liste', error);
      showMessage('Erreur lors de la suppression de la liste', 'error');
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false, item: null }));
  };

  const openInviteModal = (space: any) => {
    if (!canManageSpace(space.id)) return;
    setSelectedSpaceId(space.id);
    setInviteEmail('');
    setInviteRole(ROLES.GUEST);
    setIsInviteModalOpen(true);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedSpaceId) return;
    try {
      await inviteMemberToEspace(selectedSpaceId, inviteEmail, inviteRole);
      showMessage(`Invitation envoyée à ${inviteEmail} avec le rôle ${inviteRole}`, 'success');
      setIsInviteModalOpen(false);
      setInviteEmail('');
    } catch (error) {
      console.error('Erreur invitation', error);
      showMessage('Erreur lors de l\'invitation', 'error');
    }
  };

  const handleSettings = (space: any) => {
    showMessage(`Paramètres de l'espace "${space.nom}" (à implémenter)`, 'info');
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // handleContextMenu avec calcul du droit d'invitation
  const handleContextMenu = (e: React.MouseEvent, space: any) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canManageSpace(space.id)) return;
    
    // Calculer si l'utilisateur peut inviter dans CET espace
    const canInvite = canManageSpace(space.id);
    
    setListContextMenu(prev => ({ ...prev, visible: false }));
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      space,
      canInvite,
    });
  };

  const handleListContextMenu = (e: React.MouseEvent, list: any, parentSpaceIdParam: string | null, isWorkspaceListParam: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canManageListContext(parentSpaceIdParam, isWorkspaceListParam)) return;
    
    setContextMenu(prev => ({ ...prev, visible: false }));
    setListContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      list,
      parentSpaceId: parentSpaceIdParam,
      isWorkspaceList: isWorkspaceListParam,
    });
  };

  const handleLinkClick = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    setListContextMenu(prev => ({ ...prev, visible: false }));
  };

  const renderTree = (items: any[], depth = 0) => {
    if (!items?.length) return <div className="text-sm text-gray-400 px-2 py-2">Aucun espace</div>;
    return items.map(item => {
      const canManageCurrentSpace = canManageSpace(item.id);
      return (
      <div key={item.id} style={{ marginLeft: depth * 16 }} className="mb-1">
        <div
          className="flex items-center justify-between group"
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          <Link
            to={`/workspace/${workspaceId}/${item.id}`}
            onClick={handleLinkClick}
            className={`flex-1 flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm transition-all ${spaceId === item.id ? 'bg-secondary/10 text-secondary font-medium' : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <FolderTree className="h-4 w-4 text-primary" />
            <span className="truncate">{item.nom}</span>
          </Link>
          <div className="flex items-center gap-1">
            {canManageCurrentSpace && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openCreateListModal(item.id, undefined); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600"
                title="Ajouter une liste"
              >
                <ListTodo className="h-3 w-3" />
              </button>
            )}
            {canManageCurrentSpace && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openCreateSpaceModal(item.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600"
                title="Ajouter un sous-espace"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            {(item.sous_espaces?.length > 0 || (listsBySpace[item.id]?.length ?? 0) > 0) && (
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSpace(item.id); }} className="p-1 text-gray-400">
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
                onContextMenu={(e) => handleListContextMenu(e, list, item.id, false)}
                className="block py-1.5 pl-8 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <Link
                  to={`/workspace/${workspaceId}/${item.id}/${list.id}`}
                  onClick={handleLinkClick}
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
    );
    });
  };

  // Message pour les invités - affichage simplifié sans actions
  if (isGuestForSpace && hasWorkspaceAccess) {
    return (
      <div className="p-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            👁️ Vous êtes en mode <strong>lecture seule</strong> dans cet espace.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Vous pouvez consulter le contenu mais ne pouvez pas créer, modifier ou supprimer des ressources.
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Contactez un administrateur pour obtenir plus de droits.
          </p>
        </div>
        {/* Affichage des espaces en lecture seule */}
        {hasWorkspaceAccess && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Espaces</h3>
            {renderTree(workspaces.find(w => w.id === workspaceId)?.espaces || [])}
          </div>
        )}
        {hasWorkspaceAccess && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Projets (workspace)</h3>
            <div className="space-y-0.5">
              {loadingWorkspaceLists && <div className="text-sm text-gray-400 pl-2">Chargement...</div>}
              {workspaceLists.map(list => (
                <div
                  key={list.id}
                  className="block py-1.5 pl-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <Link
                    to={`/workspace/${workspaceId}/list/${list.id}`}
                    onClick={handleLinkClick}
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
        )}
      </div>
    );
  }

  return (
    <div className="p-3">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Section Espaces et listes hiérarchiques */}
      {hasWorkspaceAccess && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 relative">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Espaces et listes</h3>
            {canManageSpaceListe && (
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
            )}
          </div>
          {renderTree(workspaces.find(w => w.id === workspaceId)?.espaces || [])}
        </div>
      )}

      {/* Section Projets du workspace (listes sans espace) */}
      {hasWorkspaceAccess && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projets (workspace)</h3>
          </div>
          <div className="space-y-0.5">
            {loadingWorkspaceLists && <div className="text-sm text-gray-400 pl-2">Chargement...</div>}
            {workspaceLists.map(list => (
              <div
                key={list.id}
                onContextMenu={(e) => handleListContextMenu(e, list, null, true)}
                className="block py-1.5 pl-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <Link
                  to={`/workspace/${workspaceId}/list/${list.id}`}
                  onClick={handleLinkClick}
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
      )}

      {/* Chat - visible pour tous */}
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

      {/* Gestion - visible pour Admin et Créateur */}
      {(isAdminForSpace || isCreatorForSpace) && (
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
      )}

      {/* Menu contextuel pour Espace */}
      {contextMenu.visible && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => openEditSpaceModal(contextMenu.space)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <Edit className="h-4 w-4" /> Modifier
          </button>
          {contextMenu.space && canDeleteTargetSpace(contextMenu.space.id) && (
            <button onClick={() => handleDeleteSpace(contextMenu.space)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          )}
          {/* Vérification forcée pour Créateur/Admin Workspace */}
          {contextMenu.space && contextMenu.canInvite && getAvailableInvitationRolesForSpace(contextMenu.space.id).length > 0 && (
            <button onClick={() => openInviteModal(contextMenu.space)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
              <UserPlus className="h-4 w-4" /> Inviter
            </button>
          )}
          {contextMenu.space && canManageSpace(contextMenu.space.id) && (
            <button onClick={() => openCreateListModal(contextMenu.space.id, undefined)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
              <ListTodo className="h-4 w-4" /> Créer une liste
            </button>
          )}
          <button onClick={() => handleSettings(contextMenu.space)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <Settings className="h-4 w-4" /> Paramètres
          </button>
        </div>
      )}

      {/* Menu contextuel pour Liste */}
      {listContextMenu.visible && canManageListContext(listContextMenu.parentSpaceId, listContextMenu.isWorkspaceList) && (
        <div
          ref={listMenuRef}
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]"
          style={{ top: listContextMenu.y, left: listContextMenu.x }}
        >
          <button onClick={() => openEditListModal(listContextMenu.list, listContextMenu.parentSpaceId, listContextMenu.isWorkspaceList)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <Edit className="h-4 w-4" /> Modifier la liste
          </button>
          {canManageListContext(listContextMenu.parentSpaceId, listContextMenu.isWorkspaceList) && (
            <button onClick={() => handleDeleteList(listContextMenu.list, listContextMenu.parentSpaceId, listContextMenu.isWorkspaceList)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Supprimer la liste
            </button>
          )}
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
          <textarea placeholder="Description" value={editListDesc} onChange={e => setEditListDesc(e.target.value)} rows={2} className="w-full p-2 border rounded-lg" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditListModalOpen(false)}>Annuler</Button>
            <Button onClick={handleEditList}>Enregistrer</Button>
          </div>
        </div>
      </Modal>

      {/* Modale d'invitation avec choix selon le rôle */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Inviter un membre" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email du membre
            </label>
            <input
              type="email"
              placeholder="exemple@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              {getAvailableInvitationRolesForSpace(selectedSpaceId).map(role => (
                <option key={role} value={role}>{getRoleLabel(role)}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {isCreatorForSpace || isWorkspaceCreator ? (
                <>
                  💡 <strong>Administrateur</strong> : peut gérer l'espace et ses membres<br />
                  💡 <strong>Invitant</strong> : accès en lecture seule
                </>
              ) : isAdminForSpace || isWorkspaceAdmin ? (
                <>
                  💡 En tant qu'administrateur, vous pouvez inviter des <strong>Membres</strong> ou des <strong>Invités</strong>
                </>
              ) : (
                <>
                  💡 Vous pouvez inviter des <strong>Membres</strong> ou des <strong>Invités</strong>
                </>
              )}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Annuler</Button>
            <Button onClick={handleInviteMember}>Inviter</Button>
          </div>
        </div>
      </Modal>

      {/* ConfirmModal pour suppression */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false, item: null }))}
        onConfirm={confirmModal.type === 'space' ? confirmDeleteSpace : confirmDeleteList}
        title={confirmModal.type === 'space' ? 'Supprimer l\'espace' : 'Supprimer la liste'}
        message={confirmModal.type === 'space' 
          ? `Êtes-vous sûr de vouloir supprimer l'espace "${confirmModal.item?.nom || ''}" ? Cette action est irréversible et supprimera également tous les sous-espaces et listes associés.`
          : `Êtes-vous sûr de vouloir supprimer la liste "${confirmModal.item?.nom || ''}" ? Cette action est irréversible.`
        }
        confirmText="Supprimer"
        confirmVariant="danger"
      />
    </div>
  );
}
