// frontend/src/pages/app/LeftSidebar.tsx
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from '../../components/ui/Toast';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronRight, FolderTree, Hash,
  FileText, Plus, Edit, Trash2, ListTodo, Settings, X, MoreHorizontal,
  CheckCircle2, AlertTriangle, Info, Paperclip, ShieldAlert, Users
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { listeService } from '../../services/liste.service';
import { sanitizeApiErrorMessage } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { usePermissions } from '../../hooks/usePermissions';
import { useWorkspaceRole } from '../../hooks/useWorkspaceRole';
import { useResourceRole } from '../../hooks/useResourceRole';
import { getRoleLabel, getRoleRank, ROLES } from '../../lib/roleHierarchy';
import { sanitizeHtml, sanitizeText } from '../../utils/sanitize';

// Utilise désormais le Toast global importé depuis ui/Toast

export default function LeftSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId, spaceId, listId } = useActiveResource();
  const {
    workspaces, joinedWorkspaces, joinedEspaces, joinedListes, loadEspacesTree, addEspace, updateEspace, deleteEspace,
    updateWorkspace, deleteWorkspace,
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

  // États pour les notifications toast supprimés, on utilise le toast global
  const [showGuestNotice, setShowGuestNotice] = useState(true);

  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'success') {
      toast.success(message, { duration: 3000 });
    } else if (type === 'error') {
      toast.error(message, { duration: 3000 });
    } else {
      toast.info(message, { duration: 3000 });
    }
  };

  const scrollToToolsPanel = () => {
    document.getElementById('resource-files-panel')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const openResourceTool = (tool: 'files' | 'reports' | 'absences') => {
    const nextSearch = new URLSearchParams(location.search);
    nextSearch.set('tool', tool);
    navigate(`${location.pathname}?${nextSearch.toString()}`);
    setTimeout(scrollToToolsPanel, 80);
  };

  // État pour la modale de confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'space' | 'list' | 'workspace';
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
  const [createFormFeedback, setCreateFormFeedback] = useState<{
    type: 'error' | 'info';
    message: string;
  } | null>(null);

  const duplicateSpaceMessage = parentSpaceId
    ? 'Un sous-espace portant ce nom existe déjà dans cet espace.'
    : 'Un espace portant ce nom existe déjà directement dans ce workspace.';

  const duplicateListMessage = (isWorkspaceLevel: boolean) =>
    isWorkspaceLevel
      ? 'Un projet portant ce nom existe déjà directement dans ce workspace.'
      : 'Un projet portant ce nom existe déjà dans cet espace.';

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

  const [isEditWorkspaceModalOpen, setIsEditWorkspaceModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);
  const [editWorkspaceName, setEditWorkspaceName] = useState('');
  const [editWorkspaceDesc, setEditWorkspaceDesc] = useState('');

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

  const [workspaceContextMenu, setWorkspaceContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    workspace: any;
  }>({ visible: false, x: 0, y: 0, workspace: null });

  const [inlineOptionsMenu, setInlineOptionsMenu] = useState<{
    type: 'space' | 'list';
    id: string;
    item: any;
    parentSpaceId?: string | null;
    isWorkspaceList?: boolean;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const listMenuRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);

  // Fermer les menus contextuels quand on clique ailleurs
  useEffect(() => {
    const handleClickOutsideMenus = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
      if (listMenuRef.current && !listMenuRef.current.contains(event.target as Node)) {
        setListContextMenu(prev => ({ ...prev, visible: false }));
      }
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setWorkspaceContextMenu(prev => ({ ...prev, visible: false }));
      }
      setInlineOptionsMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutsideMenus);
    return () => document.removeEventListener('mousedown', handleClickOutsideMenus);
  }, []);

  const hasWorkspaceAccess = !!workspaceId;
  const activeEntryType: 'workspace' | 'space' | 'list' | 'task' | 'unknown' = location.pathname.startsWith('/liste/')
    ? 'list'
    : location.pathname.startsWith('/espace/')
      ? 'space'
      : location.pathname.startsWith('/tache/')
        ? 'task'
        : location.pathname.startsWith('/workspace/')
          ? (listId ? 'list' : spaceId ? 'space' : 'workspace')
          : 'unknown';

  const directJoinedSpace = spaceId ? joinedEspaces.find(espace => espace.id === spaceId || espace.id_espace === spaceId) : null;
  const directJoinedList = listId ? joinedListes.find(list => list.id === listId || list.id_liste === listId) : null;
  const fallbackWorkspaceName = directJoinedSpace?.workspace_nom || directJoinedList?.workspace_nom || joinedWorkspaces.find(w => w.id === workspaceId)?.nom || 'Workspace';
  const currentWorkspace = workspaces.find(w => w.id === workspaceId)
    || joinedWorkspaces.find(w => w.id === workspaceId)
    || (workspaceId ? {
      id: workspaceId,
      nom: fallbackWorkspaceName,
      description: null,
      membres: [],
      espaces: [],
      current_user_role: null,
    } : undefined);
  const canManageCurrentWorkspace = isWorkspaceCreator || currentWorkspace?.current_user_role === ROLES.CREATOR;

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
      workspaceRole,
      getDirectSpaceRole(targetSpaceId),
    ];

    if (!path) return getHighestRole(inheritedRoles);

    for (let index = path.length - 1; index >= 0; index -= 1) {
      const role = getDirectSpaceRole(path[index].id);
      const isTargetSpace = index === path.length - 1;
      const isInheritedRole = role === ROLES.CREATOR || role === ROLES.ADMIN || role === ROLES.MEMBER || role === ROLES.GUEST;
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

  const hasInheritedSpaceManagement = (targetSpaceId: string): boolean => {
    if (isWorkspaceCreator || isWorkspaceAdmin) return true;

    const workspace = workspaces.find(ws => ws.id === workspaceId);
    const path = findSpacePath(workspace?.espaces || [], targetSpaceId);
    if (!path || path.length <= 1) return false;

    return path
      .slice(0, -1)
      .some(space => {
        const role = getDirectSpaceRole(space.id);
        return role === ROLES.CREATOR || role === ROLES.ADMIN;
      });
  };

  const canDeleteTargetSpace = (targetSpaceId: string): boolean => {
    const directRole = getDirectSpaceRole(targetSpaceId);
    if (directRole === ROLES.CREATOR) return true;
    if (directRole === ROLES.ADMIN) return hasInheritedSpaceManagement(targetSpaceId);

    const role = getEffectiveSpaceRole(targetSpaceId);
    return role === ROLES.CREATOR || role === ROLES.ADMIN || isWorkspaceCreator || isWorkspaceAdmin;
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

  const canDeleteListContext = (parentSpaceIdParam: string | null, isWorkspaceListParam: boolean): boolean => {
    if (isWorkspaceListParam) return isWorkspaceCreator || isWorkspaceAdmin;
    return !!parentSpaceIdParam && canManageSpace(parentSpaceIdParam);
  };

  const selectedSpaceEffectiveRole = spaceId && spaceId !== 'list' ? getEffectiveSpaceRole(spaceId) : workspaceRole;
  const isAdminForSpace = selectedSpaceEffectiveRole === ROLES.ADMIN || isWorkspaceAdmin;
  const isCreatorForSpace = selectedSpaceEffectiveRole === ROLES.CREATOR || isWorkspaceCreator;
  const isGuestForSpace = (selectedSpaceEffectiveRole === ROLES.GUEST || (!selectedSpaceEffectiveRole && isWorkspaceGuest))
    && !isAdminForSpace
    && !isCreatorForSpace;

  const workspaceSpaces = workspaces.find(w => w.id === workspaceId)?.espaces || [];
  const selectedSpacePath = spaceId && spaceId !== 'list'
    ? findSpacePath(workspaceSpaces, spaceId)
    : null;
  const selectedSpaceNode = selectedSpacePath?.[selectedSpacePath.length - 1]
    || (directJoinedSpace ? {
      id: directJoinedSpace.id_espace || directJoinedSpace.id,
      nom: directJoinedSpace.nom,
      description: '',
      sous_espaces: [],
      listes: [],
      id_workspace: directJoinedSpace.workspace_id || directJoinedSpace.id_workspace || workspaceId,
      id_espace_parent: null,
    } : null);
  const selectedListFromWorkspace = listId
    ? workspaceLists.find(list => list.id === listId)
    : null;
  const selectedListFromSpaces = listId
    ? Object.values(listsBySpace).flat().find(list => list.id === listId)
    : null;
  const selectedListContext = selectedListFromWorkspace
    || selectedListFromSpaces
    || (directJoinedList ? {
      id: directJoinedList.id_liste || directJoinedList.id,
      nom: directJoinedList.nom,
      description: '',
      id_espace: directJoinedList.id_espace || null,
      id_workspace: directJoinedList.workspace_id || directJoinedList.id_workspace || workspaceId,
    } : null);
  const selectedListSpaceId = selectedListContext?.id_espace || directJoinedList?.id_espace || null;
  const selectedListSpacePath = selectedListSpaceId
    ? findSpacePath(workspaceSpaces, selectedListSpaceId)
    : null;
  const selectedListSpaceNode = selectedListSpacePath?.[selectedListSpacePath.length - 1]
    || (selectedListSpaceId && directJoinedSpace?.id === selectedListSpaceId ? selectedSpaceNode : null);
  const visibleSpaceRoots = activeEntryType === 'space' && selectedSpaceNode
    ? [selectedSpaceNode]
    : activeEntryType === 'list' && selectedListSpaceNode
      ? [selectedListSpaceNode]
      : workspaceSpaces;
  const showWorkspaceLevelLists = activeEntryType === 'workspace'
    || (activeEntryType === 'list' && !selectedListSpaceId);
  const showProjectOnlyFallback = activeEntryType === 'list' && selectedListContext && !selectedListSpaceNode && !showWorkspaceLevelLists;
  const showTreeNavigation = !showProjectOnlyFallback;
  const activeResourceRole = activeEntryType === 'list'
    ? getHighestRole([
      directJoinedList?.role,
      selectedListContext?.role,
      selectedListContext?.current_user_role,
      selectedListSpaceId ? getEffectiveSpaceRole(selectedListSpaceId) : null,
      workspaceRole,
    ])
    : activeEntryType === 'space'
      ? selectedSpaceEffectiveRole
      : workspaceRole || currentWorkspace?.current_user_role || null;
  const activeDirectResourceRole = activeEntryType === 'list'
    ? getHighestRole([
      directJoinedList?.role,
      selectedListContext?.current_user_role,
      selectedListContext?.role,
    ])
    : activeEntryType === 'space'
      ? getHighestRole([
        spaceId && spaceId !== 'list' ? getDirectSpaceRole(spaceId) : null,
        selectedSpaceNode?.current_user_role,
        selectedSpaceNode?.role,
        espaceRole,
      ])
      : workspaceRole || currentWorkspace?.current_user_role || null;
  const canViewResourceFilesShortcut = Boolean(activeResourceRole);
  const isActiveGuestAccess = activeResourceRole === ROLES.GUEST;
  const canViewResourceReportsShortcut = !isActiveGuestAccess && (activeEntryType === 'list'
    ? activeDirectResourceRole === ROLES.CREATOR || activeDirectResourceRole === ROLES.ADMIN || activeDirectResourceRole === ROLES.MEMBER
    : activeDirectResourceRole === ROLES.CREATOR || activeDirectResourceRole === ROLES.ADMIN);
  const canViewResourceAbsencesShortcut = !isActiveGuestAccess
    && (
      activeEntryType === 'list'
        ? Boolean(activeDirectResourceRole) && activeDirectResourceRole !== ROLES.GUEST
        : activeEntryType === 'workspace'
          ? activeDirectResourceRole === ROLES.CREATOR || activeDirectResourceRole === ROLES.ADMIN
          : false
    );
  const showResourceToolsShortcut = hasWorkspaceAccess
    && (activeEntryType === 'workspace' || activeEntryType === 'space' || activeEntryType === 'list')
    && (canViewResourceFilesShortcut || canViewResourceReportsShortcut || canViewResourceAbsencesShortcut);
  const navigationTitle = activeEntryType === 'space'
    ? 'Espace actif'
    : activeEntryType === 'list'
      ? 'Projet actif'
      : 'Espaces et listes';

  const renderResourceToolShortcuts = () => (
    <div className="space-y-1">
      {canViewResourceFilesShortcut && (
        <button
          type="button"
          onClick={() => openResourceTool('files')}
          className="w-full flex items-center justify-between gap-2 rounded-xl border border-theme-border-subtle bg-theme-surface/60 px-3 py-2 text-left text-xs font-bold text-theme-main transition-all hover:border-primary/25 hover:bg-theme-surface-hover hover:shadow-theme-sm"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">Fichiers</span>
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-theme-muted/50" />
        </button>
      )}
      {canViewResourceReportsShortcut && (
        <button
          type="button"
          onClick={() => openResourceTool('reports')}
          className="w-full flex items-center justify-between gap-2 rounded-xl border border-theme-border-subtle bg-theme-surface/60 px-3 py-2 text-left text-xs font-bold text-theme-main transition-all hover:border-secondary/25 hover:bg-theme-surface-hover hover:shadow-theme-sm"
        >
          <span className="flex items-center gap-2 min-w-0">
            <FileText className="h-3.5 w-3.5 shrink-0 text-secondary" />
            <span className="truncate">Rapports</span>
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-theme-muted/50" />
        </button>
      )}
      {canViewResourceAbsencesShortcut && (
        <button
          type="button"
          onClick={() => openResourceTool('absences')}
          className="w-full flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-left text-xs font-bold text-primary transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-theme-sm mt-1"
        >
          <span className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Absences & Congés</span>
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
        </button>
      )}
    </div>
  );

  useEffect(() => {
    if (!workspaces.length) return;

    const idsToOpen = new Set<string>();

    // Chemin de l'espace actif
    if (selectedSpacePath) {
      selectedSpacePath.forEach(space => idsToOpen.add(space.id));
    }

    // Chemin de l'espace parent de la liste active
    if (selectedListSpacePath) {
      selectedListSpacePath.forEach(space => idsToOpen.add(space.id));
    }

    if (idsToOpen.size === 0) return;

    setOpenSpaces(prev => {
      const next = { ...prev };
      let hasChanged = false;
      idsToOpen.forEach(id => {
        if (!next[id]) {
          next[id] = true;
          hasChanged = true;
        }
      });
      return hasChanged ? next : prev;
    });
  }, [spaceId, listId, workspaceId, workspaces, selectedSpacePath, selectedListSpacePath]);

  useEffect(() => {
    if (workspaceId && hasWorkspaceAccess) {
      loadEspacesTree(workspaceId).catch(() => { });
    }
  }, [workspaceId, hasWorkspaceAccess, loadEspacesTree]);

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
    if (workspaceId && hasWorkspaceAccess && showWorkspaceLevelLists) {
      loadWorkspaceLists();
    }
  }, [workspaceId, hasWorkspaceAccess, showWorkspaceLevelLists]);

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
    setCreateFormFeedback(null);
    setIsCreateSpaceModalOpen(true);
    setIsCreateMenuOpen(false);
    setContextMenu(prev => ({ ...prev, visible: false }));
    setListContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(null);
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim() || !workspaceId) return;
    if (hasSiblingName(getSiblingSpaces(parentSpaceId), newSpaceName)) {
      setCreateFormFeedback({ type: 'error', message: duplicateSpaceMessage });
      showMessage(duplicateSpaceMessage, 'error');
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
      setCreateFormFeedback(null);
      showMessage(`Espace "${newSpaceName}" créé avec succès`, 'success');
    } catch (error: any) {
      console.error('Erreur création espace', error);
      const message = sanitizeApiErrorMessage(error, "Impossible de créer cet espace.");
      setCreateFormFeedback({ type: 'error', message });
      showMessage(message, 'error');
    }
  };

  const openEditSpaceModal = (space: any) => {
    setEditingSpace(space);
    setEditSpaceName(space.nom);
    setEditSpaceDesc(space.description || '');
    setIsEditSpaceModalOpen(true);
    setContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(null);
  };

  const handleEditSpace = async () => {
    if (!editSpaceName.trim() || !editingSpace) return;
    if (hasSiblingName(getSiblingSpaces(editingSpace.id_espace_parent || null), editSpaceName, editingSpace.id)) {
      showMessage(
        editingSpace.id_espace_parent
          ? 'Un sous-espace portant ce nom existe déjà dans cet espace.'
          : 'Un espace portant ce nom existe déjà directement dans ce workspace.',
        'error'
      );
      return;
    }
    try {
      await updateEspace(editingSpace.id, { nom: editSpaceName, description: editSpaceDesc });
      if (workspaceId) await loadEspacesTree(workspaceId);
      setIsEditSpaceModalOpen(false);
      showMessage(`Espace "${editSpaceName}" modifié avec succès`, 'success');
    } catch (error: any) {
      console.error('Erreur modification espace', error);
      showMessage(
        sanitizeApiErrorMessage(error, "Impossible de modifier cet espace."),
        'error'
      );
    }
  };

  const handleDeleteSpace = (space: any) => {
    if (!space?.id || !canDeleteTargetSpace(space.id)) {
      showMessage("Vous ne pouvez pas supprimer la ressource racine de votre périmètre. Seuls les créateurs ou gestionnaires par héritage peuvent supprimer un espace descendant.", 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'space',
      item: space,
    });
    setContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(null);
  };

  const confirmDeleteSpace = async () => {
    const space = confirmModal.item;
    if (!space) return;
    try {
      await deleteEspace(space.id);
      if (workspaceId) await loadEspacesTree(workspaceId);
      showMessage(`Espace "${space.nom}" supprimé avec succès`, 'success');
    } catch (error: any) {
      console.error('Erreur suppression espace', error);
      showMessage(
        sanitizeApiErrorMessage(error, "Vous n'avez pas les droits nécessaires pour supprimer cet espace."),
        'error'
      );
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false, item: null }));
  };

  const openCreateListModal = (spaceIdParam?: string, workspaceIdParam?: string) => {
    setSelectedSpaceId(spaceIdParam || null);
    setSelectedWorkspaceId(workspaceIdParam || null);
    setNewListName('');
    setNewListDesc('');
    setCreateFormFeedback(null);
    setIsCreateListModalOpen(true);
    setIsCreateMenuOpen(false);
    setContextMenu(prev => ({ ...prev, visible: false }));
    setListContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(null);
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    const siblingLists = selectedSpaceId ? (listsBySpace[selectedSpaceId] || []) : workspaceLists;
    if (hasSiblingName(siblingLists, newListName)) {
      const message = duplicateListMessage(!selectedSpaceId);
      setCreateFormFeedback({ type: 'error', message });
      showMessage(message, 'error');
      return;
    }
    try {
      if (selectedSpaceId) {
        await addListe(selectedSpaceId, { nom: newListName, description: newListDesc });
        await refreshLists(selectedSpaceId);
        setOpenSpaces(prev => ({ ...prev, [selectedSpaceId]: true }));
        showMessage(`Projet "${newListName}" créé dans l'espace`, 'success');
      } else if (selectedWorkspaceId) {
        await listeService.create({ nom: newListName, description: newListDesc, id_workspace: selectedWorkspaceId });
        await refreshWorkspaceLists();
        showMessage(`Projet "${newListName}" créé dans le workspace`, 'success');
      } else {
        throw new Error("Aucun espace ou workspace sélectionné.");
      }
      setIsCreateListModalOpen(false);
      setCreateFormFeedback(null);
    } catch (error: any) {
      console.error('Erreur création projet', error);
      const message = sanitizeApiErrorMessage(error, "Impossible de créer ce projet.");
      setCreateFormFeedback({ type: 'error', message });
      showMessage(message, 'error');
    }
  };

  const openEditListModal = (list: any, parentSpaceIdParam: string | null, isWorkspaceListParam: boolean) => {
    setEditingList({ ...list, parentSpaceId: parentSpaceIdParam, isWorkspaceList: isWorkspaceListParam });
    setEditListName(list.nom);
    setEditListDesc(list.description || '');
    setIsEditListModalOpen(true);
    setListContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(null);
  };

  const handleEditList = async () => {
    if (!editListName.trim() || !editingList) return;
    const siblingLists = editingList.isWorkspaceList
      ? workspaceLists
      : (listsBySpace[editingList.parentSpaceId] || []);
    if (hasSiblingName(siblingLists, editListName, editingList.id)) {
      showMessage(duplicateListMessage(editingList.isWorkspaceList), 'error');
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
      showMessage(`Projet "${editListName}" modifié avec succès`, 'success');
    } catch (error: any) {
      console.error('Erreur modification projet', error);
      showMessage(
        sanitizeApiErrorMessage(error, "Impossible de modifier ce projet."),
        'error'
      );
    }
  };

  const openEditWorkspaceModal = (workspace: any) => {
    if (!canManageCurrentWorkspace) {
      showMessage('Seul le créateur du workspace peut le modifier.', 'error');
      return;
    }
    setEditingWorkspace(workspace);
    setEditWorkspaceName(workspace.nom || '');
    setEditWorkspaceDesc(workspace.description || '');
    setIsEditWorkspaceModalOpen(true);
    setWorkspaceContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleEditWorkspace = async () => {
    if (!editingWorkspace || !editWorkspaceName.trim()) return;
    if (!canManageCurrentWorkspace) {
      showMessage('Seul le créateur du workspace peut le modifier.', 'error');
      return;
    }
    try {
      await updateWorkspace(editingWorkspace.id, {
        nom: editWorkspaceName,
        description: editWorkspaceDesc,
      });
      setIsEditWorkspaceModalOpen(false);
      showMessage(`Workspace "${editWorkspaceName}" modifié avec succès`, 'success');
    } catch (error: any) {
      console.error('Erreur modification workspace', error);
      showMessage(error.message || 'Erreur lors de la modification du workspace', 'error');
    }
  };

  const handleDeleteWorkspace = async (workspace: any) => {
    if (!canManageCurrentWorkspace) {
      showMessage('Seul le créateur du workspace peut le supprimer.', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'workspace',
      item: workspace,
    });
    setWorkspaceContextMenu(prev => ({ ...prev, visible: false }));
  };

  const confirmDeleteWorkspace = async () => {
    const workspace = confirmModal.item;
    if (!workspace) return;
    if (!canManageCurrentWorkspace) {
      showMessage('Seul le créateur du workspace peut le supprimer.', 'error');
      setConfirmModal(prev => ({ ...prev, isOpen: false, item: null }));
      return;
    }
    try {
      await deleteWorkspace(workspace.id);
      showMessage(`Workspace "${workspace.nom}" supprimé avec succès`, 'success');
    } catch (error: any) {
      console.error('Erreur suppression workspace', error);
      showMessage(error.message || 'Erreur lors de la suppression du workspace', 'error');
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false, item: null }));
  };

  const handleDeleteList = (list: any, parentSpaceIdParam: string | null, isWorkspaceListParam: boolean) => {
    if (!canDeleteListContext(parentSpaceIdParam, isWorkspaceListParam)) {
      showMessage("Vous ne pouvez pas supprimer la ressource racine de votre périmètre. Seuls les créateurs ou gestionnaires par héritage peuvent supprimer un projet descendant.", 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'list',
      item: list,
      parentSpaceId: parentSpaceIdParam,
      isWorkspaceList: isWorkspaceListParam,
    });
    setListContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(null);
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
    } catch (error: any) {
      console.error('Erreur suppression liste', error);
      showMessage(
        sanitizeApiErrorMessage(error, "Vous n'avez pas les droits nécessaires pour supprimer ce projet."),
        'error'
      );
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
    setInlineOptionsMenu(null);
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
      showMessage(sanitizeApiErrorMessage(error, 'Erreur lors de l\'invitation'), 'error');
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
    const canInvite = getAvailableInvitationRolesForSpace(space.id).length > 0;

    setListContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(null);
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      space,
      canInvite,
    });
  };

  const openSpaceOptionsMenu = (e: React.MouseEvent<HTMLButtonElement>, space: any) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canManageSpace(space.id)) return;

    setListContextMenu(prev => ({ ...prev, visible: false }));
    setWorkspaceContextMenu(prev => ({ ...prev, visible: false }));
    setContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(prev => (
      prev?.type === 'space' && prev.id === space.id
        ? null
        : { type: 'space', id: space.id, item: space }
    ));
  };

  const handleListContextMenu = (e: React.MouseEvent, list: any, parentSpaceIdParam: string | null, isWorkspaceListParam: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canManageListContext(parentSpaceIdParam, isWorkspaceListParam)) return;

    setContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(null);
    setListContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      list,
      parentSpaceId: parentSpaceIdParam,
      isWorkspaceList: isWorkspaceListParam,
    });
  };

  const openListOptionsMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    list: any,
    parentSpaceIdParam: string | null,
    isWorkspaceListParam: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canManageListContext(parentSpaceIdParam, isWorkspaceListParam)) return;

    setContextMenu(prev => ({ ...prev, visible: false }));
    setWorkspaceContextMenu(prev => ({ ...prev, visible: false }));
    setListContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(prev => (
      prev?.type === 'list' && prev.id === list.id
        ? null
        : {
          type: 'list',
          id: list.id,
          item: list,
          parentSpaceId: parentSpaceIdParam,
          isWorkspaceList: isWorkspaceListParam,
        }
    ));
  };

  const handleWorkspaceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentWorkspace || !canManageCurrentWorkspace) return;
    setContextMenu(prev => ({ ...prev, visible: false }));
    setListContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(null);
    setWorkspaceContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      workspace: currentWorkspace,
    });
  };

  const handleLinkClick = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    setListContextMenu(prev => ({ ...prev, visible: false }));
    setInlineOptionsMenu(null);
  };

  const renderTree = (items: any[], depth = 0) => {
    if (!items?.length) return (
      <div className="text-[10px] text-theme-muted/40 px-4 py-2 uppercase font-bold tracking-widest italic">
        Vide
      </div>
    );

    return items.map(item => {
      const canManageCurrentSpace = canManageSpace(item.id);
      const isExpanded = openSpaces[item.id];
      const listsHaveBeenLoaded = Object.prototype.hasOwnProperty.call(listsBySpace, item.id);
      const hasChildren = item.sous_espaces?.length > 0 || !listsHaveBeenLoaded || (listsBySpace[item.id]?.length ?? 0) > 0;

      return (
        <div key={item.id} className="mb-0.5">
          <div
            className="flex items-center justify-between group px-1 rounded-xl transition-all duration-300"
            onContextMenu={(e) => handleContextMenu(e, item)}
          >
            <div className="flex-1 flex items-center gap-1 min-w-0">
              {/* Active Indicator */}
              {spaceId === item.id && (
                <motion.div layoutId="space-active-indicator" className="w-1 h-4 bg-primary rounded-full absolute left-0" />
              )}

              <Link
                to={`/workspace/${workspaceId}/${item.id}`}
                onClick={handleLinkClick}
                className={`flex-1 flex items-center gap-2 py-1.5 px-2 rounded-xl text-xs transition-all relative overflow-hidden ${spaceId === item.id
                  ? 'text-primary font-bold shadow-theme-sm'
                  : 'text-theme-main hover:bg-theme-surface-hover'
                  }`}
              >
                <div className={`shrink-0 p-1.5 rounded-xl transition-all duration-300 ${spaceId === item.id ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--color-primary),0.4)]' : 'bg-theme-surface-hover group-hover:bg-theme-surface group-hover:shadow-theme-sm'}`}>
                  <FolderTree className={`h-3.5 w-3.5 ${spaceId === item.id ? 'text-white' : 'text-theme-muted group-hover:text-theme-main'}`} />
                </div>
                <span className={`truncate tracking-tight transition-colors ${spaceId === item.id ? 'text-primary' : 'text-theme-main/80 group-hover:text-theme-main'}`}>{sanitizeText(item.nom)}</span>

                {/* Subtle active glow background */}
                {spaceId === item.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent -z-10" />
                )}
              </Link>
            </div>

            <div className="flex items-center gap-0.5 pr-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              {canManageCurrentSpace && (
                <>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openCreateListModal(item.id, undefined); }}
                    className="p-1 text-theme-muted hover:text-secondary hover:bg-theme-surface rounded-lg transition-all"
                    title="Nouveau projet"
                  >
                    <ListTodo className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => openSpaceOptionsMenu(e, item)}
                    className="p-1 text-theme-muted hover:text-primary hover:bg-theme-surface rounded-lg transition-all"
                    title="Options"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </>
              )}
              {hasChildren && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSpace(item.id); }}
                  className={`p-1 rounded-lg hover:bg-theme-surface transition-all ${isExpanded ? 'text-primary' : 'text-theme-muted'}`}
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              )}
            </div>
          </div>

          {inlineOptionsMenu?.type === 'space' && inlineOptionsMenu.id === item.id && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="ml-8 mr-2 mt-1 rounded-xl border border-theme-border-subtle bg-theme-surface/95 p-1 shadow-theme-lg"
            >
              <button onClick={() => openEditSpaceModal(item)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors">
                <Edit className="h-3.5 w-3.5 text-primary" /> Modifier l'espace
              </button>
              <button onClick={() => openCreateSpaceModal(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors">
                <FolderTree className="h-3.5 w-3.5 text-primary" /> Créer un sous-espace
              </button>
              <button onClick={() => openCreateListModal(item.id, undefined)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors">
                <ListTodo className="h-3.5 w-3.5 text-secondary" /> Créer un projet
              </button>
              {canDeleteTargetSpace(item.id) && (
                <button onClick={() => handleDeleteSpace(item)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer l'espace
                </button>
              )}
            </div>
          )}

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="ml-5 mt-1 border-l border-theme-border-subtle/50 space-y-0.5">
                  {item.sous_espaces?.length > 0 && renderTree(item.sous_espaces, depth + 1)}

                  {loadingLists[item.id] ? (
                    <div className="text-[10px] text-theme-muted/40 animate-pulse py-2 pl-4">Chargement...</div>
                  ) : (
                    listsBySpace[item.id]?.map(list => (
                      <div key={list.id} className="relative group/list">
                        {listId === list.id && (
                          <motion.div layoutId="list-active-indicator" className="w-0.5 h-3 bg-secondary rounded-full absolute left-0 top-1/2 -translate-y-1/2" />
                        )}
                        <Link
                          to={`/workspace/${workspaceId}/${item.id}/${list.id}`}
                          onClick={handleLinkClick}
                          onContextMenu={(e) => handleListContextMenu(e, list, item.id, false)}
                          className={`flex items-center gap-2 py-1.5 pl-4 pr-8 text-[11px] rounded-lg transition-all relative overflow-hidden ${listId === list.id
                            ? 'text-secondary font-bold bg-secondary/5'
                            : 'text-theme-muted/70 hover:text-theme-main hover:bg-theme-surface-hover'
                            }`}
                        >
                          <Hash className={`h-3 w-3 transition-colors ${listId === list.id ? 'text-secondary drop-shadow-[0_0_3px_rgba(var(--secondary-rgb),0.5)]' : 'text-theme-muted'}`} />
                          <span className="truncate">{sanitizeText(list.nom)}</span>
                          {listId === list.id && (
                            <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent -z-10" />
                          )}
                        </Link>
                        {canManageListContext(item.id, false) && (
                          <button
                            onClick={(e) => openListOptionsMenu(e, list, item.id, false)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-secondary hover:bg-theme-surface rounded-lg opacity-100 transition-all sm:opacity-0 sm:group-hover/list:opacity-100"
                            title="Options du projet"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </button>
                        )}
                        {inlineOptionsMenu?.type === 'list' && inlineOptionsMenu.id === list.id && !inlineOptionsMenu.isWorkspaceList && (
                          <div
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-6 mr-2 mt-1 rounded-xl border border-theme-border-subtle bg-theme-surface/95 p-1 shadow-theme-lg"
                          >
                            <button onClick={() => openEditListModal(list, item.id, false)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors">
                              <Edit className="h-3.5 w-3.5 text-primary" /> Modifier le projet
                            </button>
                            {canDeleteListContext(item.id, false) && (
                              <button onClick={() => handleDeleteList(list, item.id, false)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                <Trash2 className="h-3.5 w-3.5" /> Supprimer le projet
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });
  };

  // Message pour les invités - affichage simplifié sans actions
  if (isGuestForSpace && hasWorkspaceAccess) {
    return (
      <div className="p-4">
        {currentWorkspace && (
          <Link
            to={`/workspace/${currentWorkspace.id}`}
            onClick={handleLinkClick}
            onContextMenu={handleWorkspaceContextMenu}
            className="mb-4 block rounded-lg border border-theme-border-subtle bg-theme-surface-hover px-3 py-2 transition-colors hover:border-primary/30 hover:bg-theme-surface"
            title={canManageCurrentWorkspace ? 'Clic droit pour modifier ou supprimer le workspace' : undefined}
          >
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              <span className="truncate text-sm font-semibold text-theme-main">{sanitizeText(currentWorkspace.nom)}</span>
            </div>
          </Link>
        )}
        {showGuestNotice && (
          <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-theme-main">
                  Vous êtes en mode <strong>lecture seule</strong> dans cet espace.
                </p>
                <p className="text-xs text-theme-muted mt-1">
                  Vous pouvez consulter le contenu mais ne pouvez pas créer, modifier ou supprimer des ressources.
                </p>
                <p className="text-xs text-secondary/70 mt-2 font-bold uppercase tracking-widest text-[10px]">
                  Contactez un administrateur pour obtenir plus de droits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuestNotice(false)}
                className="shrink-0 rounded-lg p-1 text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main transition-colors"
                title="Masquer ce message"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
        {showResourceToolsShortcut && (
          <div className="mt-4">
            <h3 className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mb-1.5 pl-1">Ressources</h3>
            {renderResourceToolShortcuts()}
          </div>
        )}
        {/* Affichage des espaces en lecture seule */}
        {hasWorkspaceAccess && showTreeNavigation && (
          <div className="mt-4">
            <h3 className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mb-2 opacity-50">{navigationTitle}</h3>
            {renderTree(visibleSpaceRoots)}
          </div>
        )}
        {hasWorkspaceAccess && showWorkspaceLevelLists && (
          <div className="mt-6">
            <h3 className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mb-2 opacity-50">Projets (workspace)</h3>
            <div className="space-y-0.5">
              {loadingWorkspaceLists && <div className="text-[10px] text-theme-muted/40 animate-pulse pl-2">Chargement...</div>}
              {workspaceLists.map(list => (
                <div
                  key={list.id}
                  className="block py-1.5 pl-2 text-sm rounded-lg text-theme-muted hover:bg-theme-surface-hover transition-colors flex items-center gap-2"
                >
                  <Link
                    to={`/workspace/${workspaceId}/list/${list.id}`}
                    onClick={handleLinkClick}
                    className="flex-1 flex items-center gap-2"
                  >
                    <ListTodo className="h-4 w-4 text-theme-muted" />
                    <span className={listId === list.id ? 'text-secondary font-semibold' : ''}>
                      {list.nom}
                    </span>
                  </Link>
                </div>
              ))}
              {!loadingWorkspaceLists && workspaceLists.length === 0 && (
                <div className="text-[10px] text-theme-muted/30 pl-2 uppercase font-bold tracking-widest">Aucun projet</div>
              )}
            </div>
          </div>
        )}
        {showProjectOnlyFallback && selectedListContext && (
          <div className="mt-6">
            <h3 className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mb-2 opacity-50">Projet actif</h3>
            <Link
              to={`/liste/${selectedListContext.id}`}
              onClick={handleLinkClick}
              className="flex items-center gap-2 rounded-xl border border-secondary/20 bg-secondary/5 px-3 py-2 text-sm font-bold text-secondary"
            >
              <ListTodo className="h-4 w-4" />
              <span className="truncate">{selectedListContext.nom}</span>
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-2">

      {currentWorkspace && (
        <Link
          to={`/workspace/${currentWorkspace.id}`}
          onClick={handleLinkClick}
          onContextMenu={handleWorkspaceContextMenu}
          className="mb-3 block rounded-xl border border-theme-border-strong/10 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-3 py-2 shadow-theme-md transition-all hover:border-primary/30 group relative overflow-hidden"
          title={canManageCurrentWorkspace ? 'Clic droit pour modifier ou supprimer le workspace' : undefined}
        >
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 relative z-10">
            <div className="p-1 rounded-lg bg-primary/20 text-primary shadow-theme-sm group-hover:shadow-[0_0_12px_rgba(var(--color-primary),0.3)] transition-all">
              <Hash className="h-4 w-4" />
            </div>
            <span className="truncate text-xs font-black text-theme-main tracking-tight uppercase">{currentWorkspace.nom}</span>
          </div>
        </Link>
      )}

      {showTreeNavigation && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5 relative">
            <h3 className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] pl-1 opacity-80 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              {navigationTitle}
            </h3>
            {canManageSpaceListe && (
              <div className="relative" ref={createMenuRef}>
                <button
                  onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                  className="p-1 rounded-md hover:bg-theme-surface-hover text-theme-muted hover:text-theme-main transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {isCreateMenuOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-theme-surface rounded-lg shadow-2xl z-10 border border-theme-border-subtle py-1.5 animate-slide-up">
                    <button
                      onClick={() => openCreateSpaceModal()}
                      className="w-full text-left px-4 py-2 text-xs text-theme-main hover:bg-theme-surface-hover flex items-center gap-2.5 transition-colors"
                    >
                      <FolderTree className="h-3.5 w-3.5 text-primary" />
                      <span>Espace</span>
                    </button>
                    <button
                      onClick={() => openCreateListModal(undefined, workspaceId)}
                      className="w-full text-left px-4 py-2 text-xs text-theme-main hover:bg-theme-surface-hover flex items-center gap-2.5 transition-colors"
                    >
                      <ListTodo className="h-3.5 w-3.5 text-secondary" />
                      <span>Liste (projet)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {renderTree(visibleSpaceRoots)}
        </div>
      )}

      {/* Section Projets du workspace (listes sans espace) */}
      {hasWorkspaceAccess && showWorkspaceLevelLists && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[10px] font-bold text-theme-muted uppercase tracking-widest pl-1">Projets (workspace)</h3>
          </div>
          <div className="space-y-0.5">
            {loadingWorkspaceLists && <div className="text-[10px] text-theme-muted/40 animate-pulse pl-2">Chargement...</div>}
            {workspaceLists.map(list => (
              <div
                key={list.id}
                onContextMenu={(e) => handleListContextMenu(e, list, null, true)}
                className="group relative rounded-lg text-theme-muted hover:bg-theme-surface-hover transition-colors"
              >
                <div className="flex items-center gap-1.5 py-1 pl-2 text-xs">
                  <Link
                    to={`/workspace/${workspaceId}/list/${list.id}`}
                    onClick={handleLinkClick}
                    className="flex-1 flex items-center gap-1.5 pr-7"
                  >
                    <ListTodo className="h-3.5 w-3.5 text-theme-muted" />
                    <span className={listId === list.id ? 'text-secondary font-semibold' : ''}>
                      {list.nom}
                    </span>
                  </Link>
                  {canManageListContext(null, true) && (
                    <button
                      onClick={(e) => openListOptionsMenu(e, list, null, true)}
                      className="p-1 text-theme-muted hover:text-secondary hover:bg-theme-surface rounded-lg opacity-100 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                      title="Options du projet"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {inlineOptionsMenu?.type === 'list' && inlineOptionsMenu.id === list.id && inlineOptionsMenu.isWorkspaceList && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="ml-6 mr-2 mb-1 rounded-xl border border-theme-border-subtle bg-theme-surface/95 p-1 shadow-theme-lg"
                  >
                    <button onClick={() => openEditListModal(list, null, true)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors">
                      <Edit className="h-3.5 w-3.5 text-primary" /> Modifier le projet
                    </button>
                    {canDeleteListContext(null, true) && (
                      <button onClick={() => handleDeleteList(list, null, true)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer le projet
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!loadingWorkspaceLists && workspaceLists.length === 0 && (
              <div className="text-[10px] text-theme-muted/30 pl-2 uppercase font-bold tracking-widest">Aucun projet</div>
            )}
          </div>
        </div>
      )}

      {showProjectOnlyFallback && selectedListContext && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[10px] font-bold text-theme-muted uppercase tracking-widest pl-1">Projet actif</h3>
          </div>
          <Link
            to={`/liste/${selectedListContext.id}`}
            onClick={handleLinkClick}
            className="group flex items-center gap-2 rounded-xl border border-secondary/20 bg-secondary/5 px-3 py-2 text-xs font-bold text-secondary transition-colors hover:bg-secondary/10"
          >
            <ListTodo className="h-3.5 w-3.5" />
            <div className="min-w-0 flex-1">
              <p className="truncate">{selectedListContext.nom}</p>
              {selectedListContext.workspace_nom && (
                <p className="truncate text-[9px] uppercase tracking-widest text-secondary/60">{selectedListContext.workspace_nom}</p>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* Ressources rapides */}
      {showResourceToolsShortcut && (
        <div className="mb-4">
          <h3 className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mb-1.5 pl-1">Ressources</h3>
          {renderResourceToolShortcuts()}
        </div>
      )}

      {/* Menus Contextuels avec Style Glass */}
      <AnimatePresence>
        {workspaceContextMenu.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            ref={workspaceMenuRef}
            className="fixed z-50 bg-theme-surface/90 glass rounded-xl shadow-theme-lg border border-theme-border-subtle p-1 min-w-[220px]"
            style={{ top: workspaceContextMenu.y, left: workspaceContextMenu.x }}
          >
            <button onClick={() => openEditWorkspaceModal(workspaceContextMenu.workspace)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors">
              <Edit className="h-4 w-4 text-primary" /> Modifier le workspace
            </button>
            <button onClick={() => handleDeleteWorkspace(workspaceContextMenu.workspace)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
              <Trash2 className="h-4 w-4" /> Supprimer le workspace
            </button>
          </motion.div>
        )}

        {contextMenu.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            ref={menuRef}
            className="fixed z-50 bg-theme-surface/90 glass rounded-xl shadow-theme-lg border border-theme-border-subtle p-1 min-w-[220px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button onClick={() => openEditSpaceModal(contextMenu.space)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors">
              <Edit className="h-4 w-4 text-primary" /> Modifier l'espace
            </button>
            {contextMenu.space && canManageSpace(contextMenu.space.id) && (
              <>
                <button onClick={() => openCreateSpaceModal(contextMenu.space.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors">
                  <FolderTree className="h-4 w-4 text-primary" /> Créer un sous-espace
                </button>
                <button onClick={() => openCreateListModal(contextMenu.space.id, undefined)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors">
                  <ListTodo className="h-4 w-4 text-secondary" /> Créer un projet
                </button>
              </>
            )}
            {contextMenu.canInvite && (
              <button onClick={() => openInviteModal(contextMenu.space)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors">
                <Users className="h-4 w-4 text-primary" /> Membres & Invitations
              </button>
            )}
            {contextMenu.space && canDeleteTargetSpace(contextMenu.space.id) && (
              <button onClick={() => handleDeleteSpace(contextMenu.space)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 className="h-4 w-4" /> Supprimer l'espace
              </button>
            )}
            <button onClick={() => handleSettings(contextMenu.space)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4 text-theme-muted" /> Paramètres
              </div>
              <ChevronRight className="h-3 w-3 opacity-30" />
            </button>
          </motion.div>
        )}

        {listContextMenu.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            ref={listMenuRef}
            className="fixed z-50 bg-theme-surface/90 glass rounded-xl shadow-theme-lg border border-theme-border-subtle p-1 min-w-[220px]"
            style={{ top: listContextMenu.y, left: listContextMenu.x }}
          >
            <button onClick={() => openEditListModal(listContextMenu.list, listContextMenu.parentSpaceId, listContextMenu.isWorkspaceList)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-theme-main hover:bg-theme-surface-hover rounded-lg transition-colors">
              <Edit className="h-4 w-4 text-primary" /> Modifier la liste
            </button>
            {canDeleteListContext(listContextMenu.parentSpaceId, listContextMenu.isWorkspaceList) && (
              <button onClick={() => handleDeleteList(listContextMenu.list, listContextMenu.parentSpaceId, listContextMenu.isWorkspaceList)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 className="h-4 w-4" /> Supprimer la liste
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modales */}
      <Modal isOpen={isCreateSpaceModalOpen} onClose={() => setIsCreateSpaceModalOpen(false)} title={parentSpaceId ? "Créer un sous-espace" : "Créer un espace"} size="md">
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-xs font-semibold leading-relaxed text-theme-muted">
              {parentSpaceId
                ? "Le sous-espace sera ajouté dans l'espace sélectionné."
                : "L'espace sera ajouté à la racine du workspace actif."}
              {' '}Le nom doit rester unique dans ce niveau.
            </p>
          </div>
          {createFormFeedback && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-red-600">Création impossible</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed">{createFormFeedback.message}</p>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-theme-muted">Nom</label>
            <input
              type="text"
              placeholder={parentSpaceId ? "Ex: Développement web" : "Ex: Équipe produit"}
              value={newSpaceName}
              onChange={e => {
                setNewSpaceName(e.target.value);
                if (createFormFeedback) setCreateFormFeedback(null);
              }}
              className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-theme-muted">Description</label>
            <textarea placeholder="Objectif, périmètre ou contexte de cet espace..." value={newSpaceDesc} onChange={e => setNewSpaceDesc(e.target.value)} rows={3} className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" />
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsCreateSpaceModalOpen(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleCreateSpace} className="w-full sm:w-auto">Créer</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditSpaceModalOpen} onClose={() => setIsEditSpaceModalOpen(false)} title="Modifier l'espace" size="md">
        <div className="space-y-4">
          <input type="text" placeholder="Nom" value={editSpaceName} onChange={e => setEditSpaceName(e.target.value)} className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
          <textarea placeholder="Description" value={editSpaceDesc} onChange={e => setEditSpaceDesc(e.target.value)} rows={2} className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsEditSpaceModalOpen(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleEditSpace} className="w-full sm:w-auto">Enregistrer</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isCreateListModalOpen} onClose={() => setIsCreateListModalOpen(false)} title="Créer un projet" size="md">
        <div className="space-y-4">
          <div className="rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3">
            <p className="text-xs font-semibold leading-relaxed text-theme-muted">
              Le projet sera créé {selectedSpaceId ? "dans l'espace sélectionné" : "directement dans le workspace"}. Son nom doit être unique dans ce niveau.
            </p>
          </div>
          {createFormFeedback && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-red-600">Création impossible</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed">{createFormFeedback.message}</p>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-theme-muted">Nom du projet</label>
            <input
              type="text"
              placeholder="Ex: Refonte application mobile"
              value={newListName}
              onChange={e => {
                setNewListName(e.target.value);
                if (createFormFeedback) setCreateFormFeedback(null);
              }}
              className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-theme-muted">Description</label>
            <textarea placeholder="Objectif, livrables ou notes utiles pour ce projet..." value={newListDesc} onChange={e => setNewListDesc(e.target.value)} rows={3} className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" />
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsCreateListModalOpen(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleCreateList} className="w-full sm:w-auto">Créer</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditListModalOpen} onClose={() => setIsEditListModalOpen(false)} title="Modifier la liste" size="md">
        <div className="space-y-4">
          <input type="text" placeholder="Nom" value={editListName} onChange={e => setEditListName(e.target.value)} className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
          <textarea placeholder="Description" value={editListDesc} onChange={e => setEditListDesc(e.target.value)} rows={2} className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsEditListModalOpen(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleEditList} className="w-full sm:w-auto">Enregistrer</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditWorkspaceModalOpen} onClose={() => setIsEditWorkspaceModalOpen(false)} title="Modifier le workspace" size="md">
        <div className="space-y-4">
          <input type="text" placeholder="Nom" value={editWorkspaceName} onChange={e => setEditWorkspaceName(e.target.value)} className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
          <textarea placeholder="Description" value={editWorkspaceDesc} onChange={e => setEditWorkspaceDesc(e.target.value)} rows={3} className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsEditWorkspaceModalOpen(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleEditWorkspace} className="w-full sm:w-auto">Enregistrer</Button>
          </div>
        </div>
      </Modal>

      {/* Modale d'invitation avec choix selon le rôle */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Inviter un membre" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-theme-main mb-1.5">
              Email ou username
            </label>
            <input
              type="text"
              placeholder="exemple@email.com ou username"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-theme-main mb-1.5">
              Rôle
            </label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full p-2.5 bg-theme-surface border border-theme-border rounded-lg text-theme-main focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              {getAvailableInvitationRolesForSpace(selectedSpaceId).map(role => (
                <option key={role} value={role}>{getRoleLabel(role)}</option>
              ))}
            </select>
            <p className="text-[11px] text-theme-muted mt-2 leading-relaxed opacity-80">
              {isCreatorForSpace || isWorkspaceCreator ? (
                <>
                  <strong>Administrateur</strong> : peut gérer l'espace et ses membres<br />
                  <strong>Invité</strong> : accès en lecture seule
                </>
              ) : isAdminForSpace || isWorkspaceAdmin ? (
                <>
                  En tant qu'administrateur, vous pouvez inviter des <strong>Membres</strong> ou des <strong>Invités</strong>.
                </>
              ) : (
                <>
                  Vous pouvez inviter des <strong>Membres</strong> ou des <strong>Invités</strong>.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleInviteMember} className="w-full sm:w-auto">Inviter</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false, item: null }))}
        onConfirm={
          confirmModal.type === 'workspace'
            ? confirmDeleteWorkspace
            : confirmModal.type === 'space'
              ? confirmDeleteSpace
              : confirmDeleteList
        }
        title={
          confirmModal.type === 'workspace'
            ? 'Supprimer le workspace'
            : confirmModal.type === 'space'
              ? 'Supprimer l\'espace'
              : 'Supprimer la liste'
        }
        message={
          confirmModal.type === 'workspace'
            ? `Êtes-vous sûr de vouloir supprimer définitivement le workspace "${sanitizeText(confirmModal.item?.nom || '')}" ? Cette action est irréversible et supprimera tout son contenu.`
            : confirmModal.type === 'space'
              ? `Êtes-vous sûr de vouloir supprimer l'espace "${confirmModal.item?.nom || ''}" ? Cette action est irréversible et supprimera également tous les sous-espaces et listes associés.`
              : `Êtes-vous sûr de vouloir supprimer la liste "${confirmModal.item?.nom || ''}" ? Cette action est irréversible.`
        }
        confirmText="Supprimer"
        confirmVariant="danger"
      />
    </div>
  );
}
