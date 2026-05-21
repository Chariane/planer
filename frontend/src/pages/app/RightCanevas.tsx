// frontend/src/pages/app/RightCanevas.tsx
import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, CheckCircle, Circle, Edit, X,
  Target, Sparkles, Plus, Trash2, Save, AlertCircle, Loader2
} from 'lucide-react';
import { canevasService, type EnhancedCanevas, type EnhancedChecklist } from '../../services/canevas.service';
import { sectionService } from '../../services/section.service';
import { checklistService } from '../../services/checklist.service';
import { listeService } from '../../services/liste.service';
import { tacheService } from '../../services/tache.service';
import { workspaceService } from '../../services/workspace.service';
import { espaceService } from '../../services/espace.service';
import { getRoleRank, ROLES } from '../../lib/roleHierarchy';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import ConfirmModal from '../../components/ui/ConfirmModal';

type AddChecklistMode = 'manual' | 'task';

interface TaskChecklistOption {
  id: string;
  text: string;
  taskTitle: string;
  isChecked: boolean;
}

export default function RightCanevas() {
  const { pathname } = useLocation();
  const { id: flatRouteId, listId: legacyListId, workspaceId: legacyWorkspaceId } = useParams();
  const { listId: activeListId, workspaceId: activeWorkspaceId } = useActiveResource();
  const listId = activeListId || legacyListId || (pathname.startsWith('/liste/') ? flatRouteId : undefined);
  const routeWorkspaceId = activeWorkspaceId || legacyWorkspaceId;
  const { user } = useAuth();
  const [canevas, setCanevas] = useState<EnhancedCanevas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [canModify, setCanModify] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [userRoleDisplay, setUserRoleDisplay] = useState<string | null>(null);

  // États pour l'édition
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');

  // États pour l'ajout
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [addingChecklistToSection, setAddingChecklistToSection] = useState<string | null>(null);
  const [addChecklistMode, setAddChecklistMode] = useState<AddChecklistMode>('manual');
  const [taskChecklistOptions, setTaskChecklistOptions] = useState<TaskChecklistOption[]>([]);
  const [loadingTaskChecklistOptions, setLoadingTaskChecklistOptions] = useState(false);
  const [selectedTaskChecklistId, setSelectedTaskChecklistId] = useState('');

  // États de chargement pour actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => { },
  });

  // 🔧 Récupérer les permissions avec héritage descendant
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!listId) return;

      try {
        // 1. Récupérer les informations de la liste
        const liste = await listeService.getById(listId);
        const currentUserId = user?.id;

        if (!currentUserId) {
          setCanModify(false);
          setIsReadOnly(true);
          setPermissionChecked(true);
          return;
        }

        // 2. Vérifier si l'utilisateur est membre direct de la liste
        try {
          const membres = await listeService.getMembers(listId);
          const currentMember = membres.find((m: any) => m.id_utilisateur === currentUserId);

          if (currentMember) {
            const role = currentMember.role;
            setUserRoleDisplay(role);
            const hasModifyRole = role === ROLES.CREATOR || role === ROLES.ADMIN;
            if (hasModifyRole) {
              setCanModify(true);
              setIsReadOnly(false);
              setPermissionChecked(true);
              return;
            }
            setCanModify(false);
            setIsReadOnly(true);
            setPermissionChecked(true);
            return;
          }
        } catch (err) {
          console.log('Pas de membre direct trouvé, vérification héritage...');
        }

        // 3. Vérifier l'héritage depuis l'espace parent
        let resolvedWorkspaceId = liste.id_workspace || routeWorkspaceId || null;

        if (liste.id_espace) {
          try {
            const hierarchy = await espaceService.getHierarchy(liste.id_espace);
            const spaces = Array.isArray(hierarchy) ? hierarchy : [];
            const currentSpace = spaces.find((space: any) => space.id === liste.id_espace) || spaces[spaces.length - 1];
            resolvedWorkspaceId = resolvedWorkspaceId || currentSpace?.id_workspace || null;

            let bestEspaceRole: string | null = null;
            let bestEspaceLabel: string | null = null;

            for (const space of spaces) {
              const espaceMembres = await espaceService.getMembers(space.id);
              const currentEspaceMember = espaceMembres.find((m: any) => m.id_utilisateur === currentUserId);

              if (currentEspaceMember) {
                const role = currentEspaceMember.role;
                const isCurrentSpace = space.id === liste.id_espace;
                if (isCurrentSpace || role === ROLES.CREATOR || role === ROLES.ADMIN || role === ROLES.GUEST) {
                  if (getRoleRank(role) > getRoleRank(bestEspaceRole)) {
                    bestEspaceRole = role;
                    bestEspaceLabel = `${role} (hérité ${isCurrentSpace ? "de l'espace" : "d'un espace parent"})`;
                  }
                }
              }
            }

            if (bestEspaceRole) {
              setUserRoleDisplay(bestEspaceLabel);
              const hasModifyRole = bestEspaceRole === ROLES.CREATOR || bestEspaceRole === ROLES.ADMIN;
              if (hasModifyRole) {
                setCanModify(true);
                setIsReadOnly(false);
                setPermissionChecked(true);
                return;
              }
            }
          } catch (err) {
            console.log('Pas de rôle trouvé dans l\'espace');
          }
        }

        // 4. Vérifier l'héritage depuis le workspace parent
        if (resolvedWorkspaceId) {
          try {
            const workspace = await workspaceService.getById(resolvedWorkspaceId);
            // Le créateur du workspace a tous les droits
            if (workspace.id_utilisateur === currentUserId) {
              setUserRoleDisplay('Créateur (hérité du workspace)');
              setCanModify(true);
              setIsReadOnly(false);
              setPermissionChecked(true);
              return;
            }

            // Vérifier si l'utilisateur est admin du workspace
            const workspaceMembres = await workspaceService.getMembers(resolvedWorkspaceId);
            const currentWorkspaceMember = workspaceMembres.find((m: any) => m.id_utilisateur === currentUserId);

            if (currentWorkspaceMember && currentWorkspaceMember.role === ROLES.ADMIN) {
              setUserRoleDisplay('Administrateur (hérité du workspace)');
              setCanModify(true);
              setIsReadOnly(false);
              setPermissionChecked(true);
              return;
            }

            if (currentWorkspaceMember && currentWorkspaceMember.role === ROLES.GUEST) {
              setUserRoleDisplay('Invité (hérité du workspace)');
            }
          } catch (err) {
            console.log('Pas de rôle trouvé dans le workspace');
          }
        }

        // 5. Aucune permission trouvée
        setUserRoleDisplay('Invité');
        setCanModify(false);
        setIsReadOnly(true);

      } catch (err) {
        console.error('Erreur récupération permissions:', err);
        setCanModify(false);
        setIsReadOnly(true);
      } finally {
        setPermissionChecked(true);
      }
    };

    fetchPermissions();
  }, [listId, routeWorkspaceId, user?.id]);

  const loadCanevas = async () => {
    if (!listId) return;

    setLoading(true);
    setError(null);
    try {
      const canevasData = await canevasService.getEnhancedByListe(listId);
      setCanevas(canevasData);
      const expanded: Record<string, boolean> = {};
      canevasData.sections.forEach(section => {
        expanded[section.id] = true;
      });
      setExpandedSections(expanded);
    } catch (err: any) {
      console.error('Erreur chargement canevas:', err);
      setCanevas(null);
      setError('Impossible de charger le canevas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listId && permissionChecked) {
      loadCanevas();
    }
  }, [listId, permissionChecked]);

  const addSection = async () => {
    if (!newSectionTitle.trim() || !canevas || !canModify) return;
    setActionLoading('add-section');
    try {
      await sectionService.create(canevas.id, { titre: newSectionTitle });
      await loadCanevas();
      setNewSectionTitle('');
      setIsAddingSection(false);
    } catch (err) {
      console.error('Erreur ajout section:', err);
      alert('Erreur lors de l\'ajout de la section');
    } finally {
      setActionLoading(null);
    }
  };

  const updateSection = async (sectionId: string) => {
    if (!editingSectionTitle.trim() || !canModify) return;
    setActionLoading(`section-${sectionId}`);
    try {
      await sectionService.update(sectionId, { titre: editingSectionTitle });
      await loadCanevas();
      setEditingSectionId(null);
      setEditingSectionTitle('');
    } catch (err) {
      console.error('Erreur modification section:', err);
      alert('Erreur lors de la modification de la section');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!canModify) return;
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer la section',
      message: 'Voulez-vous vraiment supprimer cette section ? Toutes les checklists seront également supprimées.',
      onConfirm: async () => {
        setActionLoading(`delete-section-${sectionId}`);
        try {
          await sectionService.delete(sectionId);
          await loadCanevas();
        } catch (err) {
          console.error('Erreur suppression section:', err);
          alert('Erreur lors de la suppression de la section');
        } finally {
          setActionLoading(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const addChecklist = async (sectionId: string) => {
    if (!newChecklistText.trim() || !canModify) return;
    setActionLoading(`add-checklist-${sectionId}`);
    try {
      await checklistService.createInSection(sectionId, { texte: newChecklistText, is_checked: false });
      await loadCanevas();
      setNewChecklistText('');
      setAddingChecklistToSection(null);
    } catch (err) {
      console.error('Erreur ajout checklist:', err);
      alert('Erreur lors de l\'ajout de l\'élément');
    } finally {
      setActionLoading(null);
    }
  };

  const loadTaskChecklistOptions = async () => {
    if (!listId) return;
    setLoadingTaskChecklistOptions(true);
    try {
      const tasks = await tacheService.getByListe(listId);
      const normalizedTasks = Array.isArray(tasks) ? tasks : [];
      const options: TaskChecklistOption[] = [];

      for (const task of normalizedTasks) {
        const taskTitle = task.titre || task.title || 'Tâche';
        const checklists = Array.isArray(task.checklists)
          ? task.checklists
          : await checklistService.getByTache(task.id);

        for (const checklist of checklists || []) {
          if (checklist.id_section) continue;
          options.push({
            id: checklist.id,
            text: checklist.texte,
            taskTitle,
            isChecked: Boolean(checklist.is_checked),
          });
        }
      }

      setTaskChecklistOptions(options);
      setSelectedTaskChecklistId(options[0]?.id || '');
    } catch (err) {
      console.error('Erreur chargement des checklists de tâches:', err);
      setTaskChecklistOptions([]);
      setSelectedTaskChecklistId('');
    } finally {
      setLoadingTaskChecklistOptions(false);
    }
  };

  const openAddChecklist = async (sectionId: string) => {
    setAddingChecklistToSection(sectionId);
    setAddChecklistMode('manual');
    setNewChecklistText('');
    setSelectedTaskChecklistId('');
    await loadTaskChecklistOptions();
  };

  const cancelAddChecklist = () => {
    setAddingChecklistToSection(null);
    setAddChecklistMode('manual');
    setNewChecklistText('');
    setSelectedTaskChecklistId('');
  };

  const linkTaskChecklistToSection = async (sectionId: string) => {
    if (!selectedTaskChecklistId || !canModify) return;
    setActionLoading(`link-checklist-${sectionId}`);
    try {
      await checklistService.update(selectedTaskChecklistId, { id_section: sectionId });
      await loadCanevas();
      cancelAddChecklist();
    } catch (err) {
      console.error('Erreur ajout checklist de tâche dans la section:', err);
      alert('Erreur lors de l\'ajout de la checklist de tâche');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleChecklist = async (checklist: EnhancedChecklist) => {
    if (!canModify) return;

    setActionLoading(`toggle-${checklist.id}`);
    try {
      await checklistService.update(checklist.id, { is_checked: !checklist.is_checked });
      await loadCanevas();
    } catch (err) {
      console.error('Erreur mise à jour checklist:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const updateChecklist = async (checklist: EnhancedChecklist) => {
    if (!editingChecklistText.trim() || !canModify) return;
    setActionLoading(`update-${checklist.id}`);
    try {
      await checklistService.update(checklist.id, { texte: editingChecklistText });
      await loadCanevas();
      setEditingChecklistId(null);
      setEditingChecklistText('');
    } catch (err) {
      console.error('Erreur modification checklist:', err);
      alert('Erreur lors de la modification de l\'élément');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteChecklist = async (checklistId: string) => {
    if (!canModify) return;
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer l\'élément',
      message: 'Voulez-vous vraiment supprimer cet élément ?',
      onConfirm: async () => {
        setActionLoading(`delete-${checklistId}`);
        try {
          await checklistService.delete(checklistId);
          await loadCanevas();
        } catch (err) {
          console.error('Erreur suppression checklist:', err);
          alert('Erreur lors de la suppression de l\'élément');
        } finally {
          setActionLoading(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const deleteCanevas = async () => {
    if (!canevas || canevas.sections.length > 0) {
      alert('Supprimez d\'abord toutes les sections');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer le canevas',
      message: 'Voulez-vous vraiment supprimer ce canevas ?',
      onConfirm: async () => {
        setActionLoading('delete-canevas');
        try {
          await canevasService.delete(canevas.id);
          setCanevas(null);
        } catch (err) {
          console.error('Erreur suppression canevas:', err);
          alert('Erreur lors de la suppression du canevas');
        } finally {
          setActionLoading(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-secondary text-white p-2 rounded-l-lg shadow-lg hover:bg-secondary/90 transition z-20"
      >
        <Sparkles className="h-5 w-5" />
      </button>
    );
  }

  if (!permissionChecked) {
    return (
      <div className="h-full bg-white flex flex-col border-l border-gray-200 shadow-lg w-96">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-secondary animate-spin" />
        </div>
      </div>
    );
  }

  // Vue pour les invités (lecture seule)
  if (isReadOnly) {
    return (
      <div className="h-full bg-white flex flex-col border-l border-gray-200 shadow-lg w-96">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            <h2 className="font-semibold text-gray-800">
              {canevas?.liste_nom ? `Canevas de ${canevas.liste_nom}` : "Canevas"}
            </h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              👁️ Vous êtes en mode <strong>lecture seule</strong>.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {userRoleDisplay === 'Invité' && "Vous êtes invité dans cette liste, espace ou workspace."}
              {userRoleDisplay?.includes('hérité') && `Vous avez le rôle "${userRoleDisplay}" mais les permissions d'écriture ne sont pas disponibles.`}
              {!userRoleDisplay && "Vous n'avez pas les droits de modification."}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Seuls les Créateurs et Administrateurs peuvent modifier le canevas.
            </p>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-secondary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 text-sm py-8">{error}</div>
          ) : !canevas ? (
            <div className="text-center text-gray-400 text-sm py-8">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun canevas disponible</p>
            </div>
          ) : (
            canevas.sections.map((section) => (
              <div key={section.id} className="border border-gray-100 rounded-lg mb-4">
                <div className="p-3 bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">{section.titre}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-secondary">{section.progress}%</span>
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${section.progress}%` }} />
                    </div>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {section.checklists.map((checklist) => (
                    <div key={checklist.id} className="flex items-center gap-2">
                      {checklist.source === 'task' && (
                        <span className="text-xs text-blue-400 w-4" title={`Tâche: ${checklist.task_title}`}>📋</span>
                      )}
                      {checklist.source === 'manual' && (
                        <span className="text-xs text-gray-400 w-4" title="Checklist manuelle">✏️</span>
                      )}
                      {checklist.is_checked ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300" />
                      )}
                      <span className={`text-sm ${checklist.is_checked ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                        {checklist.texte}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Vue normale (avec modifications possibles)
  return (
    <div className="h-full bg-white flex flex-col border-l border-gray-200 shadow-lg w-96">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-secondary" />
          <h2 className="font-semibold text-gray-800">
            {canevas?.liste_nom ? `Canevas de ${canevas.liste_nom}` : "Canevas"}
          </h2>
          {canevas && canevas.is_verrouille && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Verrouillé</span>
          )}
          {userRoleDisplay && (
            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full" title="Permission héritée">
              {userRoleDisplay}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canevas && canevas.sections.length === 0 && canModify && (
            <button
              onClick={deleteCanevas}
              disabled={actionLoading === 'delete-canevas'}
              className="p-1 text-gray-400 hover:text-red-500 transition"
              title="Supprimer le canevas"
            >
              {actionLoading === 'delete-canevas' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-secondary animate-spin mb-2" />
            <p className="text-sm text-gray-500">Chargement du canevas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mb-2" />
            <p className="text-sm text-gray-500">{error}</p>
            <button onClick={loadCanevas} className="mt-3 text-sm text-secondary hover:underline">
              Réessayer
            </button>
          </div>
        ) : !canevas ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 mb-3">Aucun canevas disponible</p>
            <button onClick={loadCanevas} className="mt-3 text-sm text-secondary hover:underline">
              Réessayer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {canevas.sections.map((section) => {
              const progress = section.progress;
              const isExpanded = expandedSections[section.id] !== false;

              return (
                <div key={section.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition">
                    <button onClick={() => toggleSection(section.id)} className="flex items-center gap-2 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      {editingSectionId === section.id && canModify ? (
                        <input
                          type="text"
                          value={editingSectionTitle}
                          onChange={(e) => setEditingSectionTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && updateSection(section.id)}
                          className="text-sm font-medium text-gray-700 border rounded px-2 py-0.5 focus:ring-1 focus:ring-secondary"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-700">{section.titre}</span>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-secondary">{progress}%</span>
                      <div className="w-20 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-secondary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>

                      {canModify && !canevas.is_verrouille && (
                        <>
                          {editingSectionId !== section.id && (
                            <button
                              onClick={() => {
                                setEditingSectionId(section.id);
                                setEditingSectionTitle(section.titre);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 transition"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {editingSectionId === section.id && (
                            <button
                              onClick={() => updateSection(section.id)}
                              disabled={actionLoading === `section-${section.id}`}
                              className="p-1 text-green-500 hover:text-green-600 transition"
                            >
                              {actionLoading === `section-${section.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={() => deleteSection(section.id)}
                            disabled={actionLoading?.startsWith('delete-section')}
                            className="p-1 text-gray-400 hover:text-red-500 transition"
                          >
                            {actionLoading === `delete-section-${section.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 space-y-2">
                      {section.checklists.map((checklist) => (
                        <div key={checklist.id} className="flex items-center gap-2 group">
                          {checklist.source === 'task' && (
                            <span className="text-xs text-blue-400 w-4" title={`Tâche: ${checklist.task_title}`}>📋</span>
                          )}
                          {checklist.source === 'manual' && (
                            <span className="text-xs text-gray-400 w-4" title="Checklist manuelle">✏️</span>
                          )}

                          <button
                            onClick={() => toggleChecklist(checklist)}
                            disabled={canevas.is_verrouille || !canModify || actionLoading?.startsWith('toggle')}
                            className="flex-shrink-0"
                          >
                            {actionLoading === `toggle-${checklist.id}` ? (
                              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                            ) : checklist.is_checked ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-300 hover:text-gray-400" />
                            )}
                          </button>

                          {editingChecklistId === checklist.id && canModify ? (
                            <input
                              type="text"
                              value={editingChecklistText}
                              onChange={(e) => setEditingChecklistText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && updateChecklist(checklist)}
                              className="flex-1 text-sm text-gray-600 border rounded px-2 py-0.5 focus:ring-1 focus:ring-secondary"
                              autoFocus
                            />
                          ) : (
                            <span className={`text-sm flex-1 ${checklist.is_checked ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                              {checklist.texte}
                            </span>
                          )}

                          {canModify && !canevas.is_verrouille && checklist.source === 'manual' && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              {editingChecklistId !== checklist.id && (
                                <button
                                  onClick={() => {
                                    setEditingChecklistId(checklist.id);
                                    setEditingChecklistText(checklist.texte);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                              )}
                              {editingChecklistId === checklist.id && (
                                <button
                                  onClick={() => updateChecklist(checklist)}
                                  disabled={actionLoading === `update-${checklist.id}`}
                                  className="p-1 text-green-500 hover:text-green-600"
                                >
                                  {actionLoading === `update-${checklist.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                </button>
                              )}
                              <button
                                onClick={() => deleteChecklist(checklist.id)}
                                disabled={actionLoading === `delete-${checklist.id}`}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                {actionLoading === `delete-${checklist.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {canModify && !canevas.is_verrouille && (
                        <div className="mt-2">
                          {addingChecklistToSection === section.id ? (
                            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setAddChecklistMode('manual')}
                                  className={`px-2 py-1 text-xs rounded-md ${addChecklistMode === 'manual' ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                  Créer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAddChecklistMode('task')}
                                  className={`px-2 py-1 text-xs rounded-md ${addChecklistMode === 'task' ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                  Depuis une tâche
                                </button>
                                <button
                                  onClick={cancelAddChecklist}
                                  className="ml-auto p-1 text-gray-400 hover:text-gray-600"
                                  title="Annuler"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>

                              {addChecklistMode === 'manual' ? (
                                <div className="flex items-center gap-2">
                                  <Circle className="h-4 w-4 text-gray-300" />
                                  <input
                                    type="text"
                                    placeholder="Nouvel élément de checklist..."
                                    value={newChecklistText}
                                    onChange={(e) => setNewChecklistText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addChecklist(section.id)}
                                    className="flex-1 text-sm border-b border-gray-200 bg-transparent focus:border-secondary outline-none py-1"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => addChecklist(section.id)}
                                    disabled={actionLoading === `add-checklist-${section.id}`}
                                    className="text-secondary text-xs hover:underline"
                                  >
                                    {actionLoading === `add-checklist-${section.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ajouter'}
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {loadingTaskChecklistOptions ? (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Chargement des checklists...
                                    </div>
                                  ) : taskChecklistOptions.length === 0 ? (
                                    <p className="text-xs text-gray-400">
                                      Aucune checklist de tâche disponible à rattacher.
                                    </p>
                                  ) : (
                                    <>
                                      <select
                                        value={selectedTaskChecklistId}
                                        onChange={(e) => setSelectedTaskChecklistId(e.target.value)}
                                        className="w-full text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-secondary"
                                      >
                                        {taskChecklistOptions.map(option => (
                                          <option key={option.id} value={option.id}>
                                            {option.taskTitle} / {option.text}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => linkTaskChecklistToSection(section.id)}
                                        disabled={!selectedTaskChecklistId || actionLoading === `link-checklist-${section.id}`}
                                        className="text-secondary text-xs hover:underline disabled:text-gray-300 disabled:no-underline"
                                      >
                                        {actionLoading === `link-checklist-${section.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ajouter à la section'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => openAddChecklist(section.id)}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-secondary transition"
                            >
                              <Plus className="h-3 w-3" /> Ajouter un élément
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {canModify && !canevas.is_verrouille && (
              <div className="mt-4 pt-2 border-t border-gray-100">
                {isAddingSection ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nom de la section (ex: Mois de Décembre, Semaine du 05/12, Lundi 05/12)"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSection()}
                      className="flex-1 text-sm border rounded-lg px-3 py-2 focus:ring-1 focus:ring-secondary"
                      autoFocus
                    />
                    <button
                      onClick={addSection}
                      disabled={actionLoading === 'add-section'}
                      className="px-3 py-2 bg-secondary text-white text-sm rounded-lg hover:bg-secondary/90 transition"
                    >
                      {actionLoading === 'add-section' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter'}
                    </button>
                    <button
                      onClick={() => setIsAddingSection(false)}
                      className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingSection(true)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-secondary transition w-full justify-center py-2 border border-dashed border-gray-200 rounded-lg"
                  >
                    <Plus className="h-4 w-4" /> Ajouter une section
                  </button>
                )}
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Les sections peuvent être des mois, semaines ou jours. Les checklists des tâches dont la date correspond seront automatiquement affichées.
                </p>
              </div>
            )}

            {canevas.sections.length === 0 && canModify && !canevas.is_verrouille && (
              <div className="text-center text-gray-400 text-sm py-8">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Créez votre première section</p>
                <p className="text-xs mt-1">Exemples: "Mois de Décembre", "Semaine du 05/12", "Lundi 05/12"</p>
              </div>
            )}

            {canevas.sections.length === 0 && !canModify && (
              <div className="text-center text-gray-400 text-sm py-8">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucune section disponible</p>
              </div>
            )}
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={actionLoading !== null}
      />
    </div>
  );
}
