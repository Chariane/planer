// frontend/src/pages/app/components/tools/hooks/useToolData.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { workspaceService } from '../../../../../services/workspace.service';
import { espaceService } from '../../../../../services/espace.service';
import { listeService } from '../../../../../services/liste.service';
import { plannerToolsService } from '../../../../../services/plannerTools.service';
import { absenceService } from '../../../../../services/absence.service';
import { tacheService } from '../../../../../services/tache.service';
import { getMemberDisplayName, getMemberContactLabel } from '../../../../../utils/memberDisplay';
import { ROLES } from '../../../../../lib/roleHierarchy';
import { useMembers, type ListMemberRecord } from './useMembers';
import { toast } from '../../../../../components/ui/Toast';
import { sanitizeApiErrorMessage } from '../../../../../services/api';
import type { Task, UserAvailabilityOut } from '../../../../../types';

interface UseToolDataProps {
  resourceType: 'liste' | 'espace' | 'workspace';
  workspaceId?: string | null;
  espaceId?: string | null;
  listeId?: string | null;
  currentUserId?: string | null;
  effectiveRole: string | null;
  tasks: Task[];
  initialTool?: 'files' | 'reports' | 'absences';
}

const getErrorMessage = (err: any): string => {
  return sanitizeApiErrorMessage(err, 'Une erreur inattendue est survenue.');
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
};

const getDurationDisplay = (startDate: string, endDate?: string | null) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(startDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  if (diffDays === 1) return '1 jour';
  if (diffDays < 7) return `${diffDays} jours`;
  const weeks = Math.floor(diffDays / 7);
  const remainder = diffDays % 7;
  if (remainder === 0) return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
  return `${weeks} sem. ${remainder} j.`;
};

const rangesOverlap = (startA?: string | null, endA?: string | null, startB?: string | null, endB?: string | null) => {
  if (!startA || !startB) return false;
  const aStart = new Date(startA);
  const aEnd = endA ? new Date(endA) : aStart;
  const bStart = new Date(startB);
  const bEnd = endB ? new Date(endB) : bStart;
  return aStart <= bEnd && bStart <= aEnd;
};

export const useToolData = ({
  resourceType,
  workspaceId,
  espaceId,
  listeId,
  currentUserId,
  effectiveRole,
  tasks,
  initialTool = 'files',
}: UseToolDataProps) => {
  // ============================================================
  // ÉTATS
  // ============================================================
  
  const [activeTool, setActiveTool] = useState<'files' | 'reports' | 'absences'>(initialTool);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Fichiers
  const [files, setFiles] = useState<any[]>([]);
  const [fileForm, setFileForm] = useState({ nom: '', url_fichier: '', type_fichier: '' });
  
  // Rapports
  const [reports, setReports] = useState<any[]>([]);
  const [reportForm, setReportForm] = useState({
    titre: '',
    realisations: '',
    difficultes_et_solutions: '',
    commentaire: '',
    fichier_joint: '',
    periode_debut: '',
    periode_fin: '',
  });
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [isReportArchiveOpen, setIsReportArchiveOpen] = useState(false);
  const [reportEditForm, setReportEditForm] = useState({
    titre: '',
    realisations: '',
    difficultes_et_solutions: '',
    commentaire: '',
    fichier_joint: '',
    periode_debut: '',
    periode_fin: '',
  });
  const [archivedReportIds, setArchivedReportIds] = useState<string[]>([]);
  
  // Absences
  const [absences, setAbsences] = useState<any[]>([]);
  const [absenceView, setAbsenceView] = useState<'mine' | 'pending' | 'calendar' | 'impact'>('mine');
  const [isAbsentModalOpen, setIsAbsentModalOpen] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({
    is_absence: true,
    is_conge_planifie: false,
    date_debut: '',
    date_fin: '',
    motif: '',
    duree_demandee_en_jours: '',
  });
  const [archivedAbsenceIds, setArchivedAbsenceIds] = useState<string[]>([]);
  const [selectedAbsenceForImpact, setSelectedAbsenceForImpact] = useState<any | null>(null);
  const [absenceImpacts, setAbsenceImpacts] = useState<Record<string, any>>({});
  const [taskReplacementByTaskId, setTaskReplacementByTaskId] = useState<Record<string, string>>({});
  const [adminCandidateUserId, setAdminCandidateUserId] = useState('');
  const [adminInviteIdentifier, setAdminInviteIdentifier] = useState('');
  const [decisionTarget, setDecisionTarget] = useState<any | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [listAvailability, setListAvailability] = useState<UserAvailabilityOut[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(false);
  const [showNoReplacementNotification, setShowNoReplacementNotification] = useState(false);
  const [noReplacementTaskId, setNoReplacementTaskId] = useState<string | null>(null);
  const [isAbsenceArchiveOpen, setIsAbsenceArchiveOpen] = useState(false);

  // ✅ Nouvel état pour le chargement automatique des impacts
  const [isLoadingImpacts, setIsLoadingImpacts] = useState(false);

  // ✅ États pour les rapports (éligibilité des administrateurs directs)
  const [hasCreatedDirectChildInSpace, setHasCreatedDirectChildInSpace] = useState(false);
  const [hasCreatedDirectChildInWorkspace, setHasCreatedDirectChildInWorkspace] = useState(false);

  // Refs pour l'upload de fichiers et le debounce
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const isInitialMountRef = useRef(true);

  // ============================================================
  // HOOKS
  // ============================================================
  
  const {
    members,
    directMembers,
    inheritedMembers,
    membershipMap,
    loading: membersLoading,
    loadMembers,
    directMembersLabel,
    inheritedMembersLabel,
    isDirectMemberRecord,
    isDirectAdmin,
    isDirectResourceAdmin,
    isDirectResourceCreator,
    eligibleInheritedMembers,
  } = useMembers({
    workspaceId,
    espaceId,
    listeId,
    currentUserId,
  });

  // ============================================================
  // PERMISSIONS
  // ============================================================
  
  const isGuestAccess = effectiveRole === ROLES.GUEST || isDirectMemberRecord?.role === ROLES.GUEST;
  const isManager = effectiveRole === ROLES.CREATOR || effectiveRole === ROLES.ADMIN;
  const isInheritedManager = isManager && !isDirectAdmin;
  const isListInheritedOnlyManager = !!listeId && isManager && !isDirectMemberRecord;
  
  const hasReportScope = !!(listeId || espaceId || workspaceId);
  const canViewFiles = !!(listeId || espaceId || workspaceId);
  const canViewListReports = !!listeId && !!isDirectMemberRecord && !isGuestAccess;
  const canViewSpaceOrWorkspaceReports = !listeId && !isGuestAccess && (isDirectResourceCreator || isDirectResourceAdmin);
  const canViewReports = hasReportScope && !isListInheritedOnlyManager && (canViewListReports || canViewSpaceOrWorkspaceReports);
  const canViewAbsences = !isGuestAccess && !isListInheritedOnlyManager && (
    (listeId || espaceId)
      ? !!isDirectMemberRecord
      : !!workspaceId && !!isDirectMemberRecord
  );
  
  const canAddFiles = isManager;
  const fileTargetType = listeId ? 'liste' : espaceId ? 'espace' : 'workspace';
  const fileTargetId = listeId || espaceId || workspaceId || '';
  
  const hasAssignedTask = !!currentUserId && tasks.some(task => task.assignees.some(assignee => assignee.id === currentUserId));
  const isDirectListMember = !!listeId && isDirectMemberRecord?.role === ROLES.MEMBER;
  const listMemberNeedsAssignedTaskForReport = !!listeId && isDirectListMember && !hasAssignedTask;
  
  // Calcul des permissions de rapport
  const canCreateReport = listeId
    ? ((isDirectListMember && hasAssignedTask) || isDirectResourceAdmin)
    : espaceId
      ? isDirectResourceAdmin && hasCreatedDirectChildInSpace
      : isDirectResourceAdmin && hasCreatedDirectChildInWorkspace;
  
  const directAdminNeedsChildForReport = !listeId && isDirectResourceAdmin && (
    espaceId
      ? !hasCreatedDirectChildInSpace
      : !!workspaceId && !hasCreatedDirectChildInWorkspace
  );
  
  const canReceiveReports = listeId
    ? isDirectMemberRecord?.role === ROLES.CREATOR || isDirectMemberRecord?.role === ROLES.ADMIN
    : isDirectMemberRecord?.role === ROLES.CREATOR;
  
  const canShowReportComposer = !isInheritedManager && !isDirectResourceCreator;
  const canShowOwnReportHistory = !isInheritedManager && !isDirectResourceCreator;
  const useFullReportWidth = isInheritedManager || isDirectResourceCreator;
  
  // Absences
  const canCreateAbsence = !!isDirectMemberRecord && (
    (!!listeId || !!espaceId) && isDirectMemberRecord.role !== ROLES.CREATOR && isDirectMemberRecord.role !== ROLES.GUEST
    || (!!workspaceId && !listeId && !espaceId && (isDirectResourceAdmin || isDirectMemberRecord?.role === ROLES.MEMBER))
  );
  const canViewOwnAbsenceRequests = !isDirectResourceCreator;
  
  // Membres contact pour les rapports
  const reportContactMembers = listeId
    ? (() => {
      const admins = directMembers.filter(member => member.role === ROLES.ADMIN);
      if (admins.length > 0) return admins;
      const creator = directMembers.find(member => member.role === ROLES.CREATOR);
      return creator ? [creator] : [];
    })()
    : [];

  // ============================================================
  // CLÉS D'ARCHIVAGE
  // ============================================================
  
  const scope = useMemo(() => ({
    workspace_id: workspaceId || undefined,
    espace_id: espaceId || undefined,
    liste_id: listeId || undefined,
  }), [workspaceId, espaceId, listeId]);
  
  const activeScopeKey = listeId ? `liste:${listeId}` : espaceId ? `espace:${espaceId}` : workspaceId ? `workspace:${workspaceId}` : 'global';
  const reportArchiveKey = `kplanner:archived-reports:${currentUserId || 'anonymous'}:${activeScopeKey}`;
  const absenceArchiveKey = `kplanner:archived-absences:${currentUserId || 'anonymous'}:${activeScopeKey}`;

  // ============================================================
  // MEMOIZED DATA (déclaré AVANT les fonctions qui les utilisent)
  // ============================================================
  
  const flattenedTasks = useMemo(() => {
    const result: Task[] = [];
    const walk = (items: any[]) => {
      items.forEach(item => {
        result.push(item);
        const children = Array.isArray(item.children)
          ? item.children
          : Array.isArray(item.subtasks)
            ? item.subtasks
            : [];
        if (children.length > 0) walk(children);
      });
    };
    walk(tasks as any[]);
    return result;
  }, [tasks]);

  const taskById = useMemo(() => {
    const map = new Map<string, Task>();
    flattenedTasks.forEach(task => map.set(task.id, task));
    return map;
  }, [flattenedTasks]);

  // ============================================================
  // UTILITAIRES (déclarés AVANT les fonctions qui les utilisent)
  // ============================================================
  
  const getAuthorName = useCallback((id_membre: string | null, owner_user_id?: string | null, fallback_name?: string | null) => {
    if (owner_user_id === currentUserId || (id_membre && members.find(m => m.id === id_membre && m.id_utilisateur === currentUserId))) {
      return 'Moi';
    }
    if (owner_user_id) {
      const member = members.find(m => m.id_utilisateur === owner_user_id);
      if (member) return member.name;
    }
    if (id_membre) {
      const member = members.find(m => m.id === id_membre);
      if (member) return member.name;
      const globalMember = membershipMap.get(id_membre);
      if (globalMember) return globalMember.name;
    }
    if (fallback_name && fallback_name !== 'inconnu') return fallback_name;
    return 'inconnu';
  }, [currentUserId, members, membershipMap]);

  const getTasksImpactedByAbsence = useCallback((absence: any) => {
    if (!absence) return [];
    return flattenedTasks.filter(task => {
      const assignedToOwner = task.assignees?.some(assignee => assignee.id === absence.owner_user_id);
      return assignedToOwner && rangesOverlap(absence.date_debut, absence.date_fin, task.startDate || task.dueDate, task.dueDate);
    });
  }, [flattenedTasks]);

  const getTaskReplacementCandidates = useCallback((task: Task, absence: any) => {
    if (!absence) return [];
    
    const eligible = directMembers.filter(member =>
      member.role === ROLES.MEMBER
      && member.id_utilisateur !== absence.owner_user_id
      && !task.assignees?.some(assignee => assignee.id === member.id_utilisateur)
    );
    
    return eligible.map(member => {
      const availability = listAvailability.find(
        a => a.id_utilisateur === member.id_utilisateur
      );
      return {
        ...member,
        isAvailable: availability?.is_available ?? true,
        currentAbsence: availability?.current_absence ?? null,
      };
    });
  }, [directMembers, listAvailability]);

  const getSortedReplacementCandidates = useCallback((task: Task, absence: any) => {
    const candidates = getTaskReplacementCandidates(task, absence);
    return candidates.sort((a, b) => {
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      return 0;
    });
  }, [getTaskReplacementCandidates]);

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================
  
  const loadFiles = useCallback(async () => {
    if (!fileTargetId) return;
    try {
      const data = await plannerToolsService.listFiles({
        target_type: fileTargetType,
        target_id: fileTargetId,
        member_id: selectedMemberId || undefined,
        limit: 50,
      });
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  }, [fileTargetId, fileTargetType, selectedMemberId]);

  const loadReports = useCallback(async () => {
    if (!hasReportScope) return;
    try {
      const data = await plannerToolsService.listReports({
        ...scope,
        member_id: selectedMemberId || undefined,
        limit: 100
      });
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  }, [hasReportScope, scope, selectedMemberId]);

  const loadAbsences = useCallback(async () => {
    if (!listeId && !espaceId && !workspaceId) {
      setAbsences([]);
      return;
    }
    
    try {
      // ✅ Charger TOUTES les absences de la ressource
      const data = await absenceService.list({
        liste_id: listeId || undefined,
        espace_id: espaceId || undefined,
        workspace_id: workspaceId || undefined,
        limit: 100
      });

      // ✅ Enrichir les absences avec owner_user_id
      const enrichedData = (Array.isArray(data) ? data : []).map(absence => ({
        ...absence,
        owner_user_id: absence.owner_user_id 
          || members.find(m => m.id === absence.id_membre)?.id_utilisateur
          || membershipMap.get(absence.id_membre)?.id_utilisateur
          || null
      }));

      setAbsences(enrichedData);
      
      // ✅ Charger la disponibilité des membres
      const userIds = members.map(m => m.id_utilisateur).filter(Boolean);
      const resourceId = listeId || espaceId || workspaceId || '';
      
      if (userIds.length > 0) {
        setAvailabilityLoading(true);
        const availability = await absenceService.getAvailability(resourceId, userIds);
        setListAvailability(Array.isArray(availability) ? availability : []);
        setAvailabilityLoading(false);
      }
    } catch (err) {
      console.error('Failed to load absences:', err);
      setAbsences([]);
      setListAvailability([]);
      setAvailabilityLoading(false);
    }
  }, [listeId, espaceId, workspaceId, members, membershipMap]);

  const refreshCurrentTool = useCallback(async () => {
    setLoading(true);
    try {
      await loadMembers();
      
      // Rafraîchir les indicateurs d'éligibilité des rapports
      await refreshChildCreationStatus();
      
      if (activeTool === 'files' && canViewFiles) {
        await loadFiles();
      } else if (activeTool === 'reports') {
        await loadReports();
      } else if (activeTool === 'absences') {
        await loadAbsences();
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, [activeTool, canViewFiles, loadMembers, loadFiles, loadReports, loadAbsences]);

  // ============================================================
  // RAFRAÎCHISSEMENT DE L'ÉLIGIBILITÉ DES RAPPORTS
  // ============================================================
  
  const refreshChildCreationStatus = useCallback(async () => {
    // Espace
    if (espaceId && !listeId && currentUserId && isDirectResourceAdmin) {
      try {
        const [subSpacesRaw, listesRaw] = await Promise.all([
          espaceService.getSubSpaces(espaceId).catch(() => []),
          listeService.getByEspace(espaceId).catch(() => []),
        ]);
        const subSpaces = Array.isArray(subSpacesRaw) ? subSpacesRaw : [];
        const listes = Array.isArray(listesRaw) ? listesRaw : [];

        let hasChild = false;

        // Vérifier les sous-espaces
        for (const space of subSpaces) {
          const spaceMembers = await espaceService.getMembers(space.id).catch(() => []);
          const isCreator = (Array.isArray(spaceMembers) ? spaceMembers : []).some(
            (member: any) =>
              (member.id_utilisateur || member.utilisateur?.id) === currentUserId &&
              member.role === ROLES.CREATOR
          );
          if (isCreator) {
            hasChild = true;
            break;
          }
        }

        if (!hasChild) {
          for (const liste of listes) {
            const listeMembers = await listeService.getMembers(liste.id).catch(() => []);
            const isCreator = (Array.isArray(listeMembers) ? listeMembers : []).some(
              (member: any) =>
                (member.id_utilisateur || member.utilisateur?.id) === currentUserId &&
                member.role === ROLES.CREATOR
            );
            if (isCreator) {
              hasChild = true;
              break;
            }
          }
        }

        setHasCreatedDirectChildInSpace(hasChild);
      } catch (err) {
        console.warn('Erreur lors du chargement de l\'éligibilité des rapports pour l\'espace', err);
        setHasCreatedDirectChildInSpace(false);
      }
    } else {
      setHasCreatedDirectChildInSpace(false);
    }

    // Workspace
    if (workspaceId && !espaceId && !listeId && currentUserId && isDirectResourceAdmin) {
      try {
        const [spacesRaw, listesRaw] = await Promise.all([
          espaceService.getByWorkspace(workspaceId).catch(() => []),
          listeService.getByWorkspace(workspaceId).catch(() => []),
        ]);
        const spaces = Array.isArray(spacesRaw) ? spacesRaw : [];
        const listes = Array.isArray(listesRaw) ? listesRaw : [];

        let hasChild = false;

        for (const space of spaces) {
          const spaceMembers = await espaceService.getMembers(space.id).catch(() => []);
          const isCreator = (Array.isArray(spaceMembers) ? spaceMembers : []).some(
            (member: any) =>
              (member.id_utilisateur || member.utilisateur?.id) === currentUserId &&
              member.role === ROLES.CREATOR
          );
          if (isCreator) {
            hasChild = true;
            break;
          }
        }

        if (!hasChild) {
          for (const liste of listes) {
            const listeMembers = await listeService.getMembers(liste.id).catch(() => []);
            const isCreator = (Array.isArray(listeMembers) ? listeMembers : []).some(
              (member: any) =>
                (member.id_utilisateur || member.utilisateur?.id) === currentUserId &&
                member.role === ROLES.CREATOR
            );
            if (isCreator) {
              hasChild = true;
              break;
            }
          }
        }

        setHasCreatedDirectChildInWorkspace(hasChild);
      } catch (err) {
        console.warn('Erreur lors du chargement de l\'éligibilité des rapports pour le workspace', err);
        setHasCreatedDirectChildInWorkspace(false);
      }
    } else {
      setHasCreatedDirectChildInWorkspace(false);
    }
  }, [workspaceId, espaceId, listeId, currentUserId, isDirectResourceAdmin]);

  // ============================================================
  // EFFETS - AVEC DEBOUNCE POUR ÉVITER LE CLIGNOTEMENT
  // ============================================================
  
  useEffect(() => {
    // ✅ Éviter le refresh au montage si tout est déjà chargé
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      refreshCurrentTool();
      return;
    }

    // ✅ Debounce le refresh pour éviter les appels multiples
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      refreshCurrentTool();
    }, 300);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [activeTool, listeId, espaceId, workspaceId, selectedMemberId, canViewFiles, refreshCurrentTool]);

  // Rafraîchir l'éligibilité quand le contexte change ou quand l'utilisateur change
  useEffect(() => {
    refreshChildCreationStatus();
  }, [workspaceId, espaceId, listeId, currentUserId, isDirectResourceAdmin, refreshChildCreationStatus]);

  // Archives locales
  useEffect(() => {
    try {
      const archived = JSON.parse(localStorage.getItem(reportArchiveKey) || '[]');
      setArchivedReportIds(Array.isArray(archived) ? archived : []);
    } catch {
      setArchivedReportIds([]);
    }
  }, [reportArchiveKey]);

  useEffect(() => {
    try {
      const archived = JSON.parse(localStorage.getItem(absenceArchiveKey) || '[]');
      setArchivedAbsenceIds(Array.isArray(archived) ? archived : []);
    } catch {
      setArchivedAbsenceIds([]);
    }
  }, [absenceArchiveKey]);

  // ============================================================
  // MEMOIZED DATA (suite - dépend des fonctions définies ci-dessus)
  // ============================================================
  
  const absencesWithAuthors = useMemo(() => {
    const result = (absences || [])
      .filter(Boolean)
      .filter(a => a.statut !== 'annulee')
      .map(a => ({
        ...a,
        owner_user_id: a.owner_user_id
          || members.find(m => m.id === a.id_membre)?.id_utilisateur
          || membershipMap.get(a.id_membre)?.id_utilisateur
          || null,
        authorName: getAuthorName(a.id_membre, a.owner_user_id, a.owner_name),
        author_role: members.find(m => m.id === a.id_membre)?.role || 'Membre'
      }));
    return result;
  }, [absences, members, membershipMap, getAuthorName]);

  // ✅ CORRECTION : Utiliser exclusivement owner_user_id pour identifier les demandes personnelles
  const ownAbsences = useMemo(
    () => absencesWithAuthors.filter(a =>
      a.owner_user_id === currentUserId && !archivedAbsenceIds.includes(a.id)
    ),
    [absencesWithAuthors, archivedAbsenceIds, currentUserId],
  );

  // ✅ CORRECTION : accessibleAbsences = toutes les absences des autres
  const accessibleAbsences = useMemo(
    () => absencesWithAuthors.filter(a => {
      const isOwn = a.owner_user_id === currentUserId;
      return !isOwn && !archivedAbsenceIds.includes(a.id);
    }),
    [absencesWithAuthors, archivedAbsenceIds, currentUserId],
  );

  const archivedAbsences = useMemo(() => {
    return absencesWithAuthors.filter(a => archivedAbsenceIds.includes(a.id));
  }, [absencesWithAuthors, archivedAbsenceIds]);

  const visibleAbsences = useMemo(
    () => [...ownAbsences, ...accessibleAbsences],
    [ownAbsences, accessibleAbsences],
  );

  // ✅ CORRECTION : pendingAbsences = toutes les absences en attente des autres
  const pendingAbsences = useMemo(() => {
    return accessibleAbsences.filter(absence => {
      if (!absence || absence.statut !== 'en_attente') return false;

      // ✅ Vérifier si l'utilisateur a le droit de voir cette demande
      const hasPermission = (() => {
        // --- LISTE ---
        if (listeId) {
          if (isDirectResourceAdmin) {
            return absence.author_role === 'Membre' || absence.author_role === 'Administrateur';
          }
          if (isDirectResourceCreator) {
            if (absence.author_role === 'Administrateur') return true;
            
            if (availabilityLoading || listAvailability.length === 0) {
              return absence.author_role === 'Membre';
            }
            
            const hasAvailableAdmin = directMembers.some(m => 
              m.role === ROLES.ADMIN && 
              listAvailability.some(a => a.id_utilisateur === m.id_utilisateur && a.is_available)
            );
            
            return absence.author_role === 'Membre' && !hasAvailableAdmin;
          }
        }

        // --- ESPACE ---
        if (espaceId) {
          if (isDirectResourceAdmin) {
            return absence.author_role === 'Membre';
          }
          if (isDirectResourceCreator) {
            if (absence.author_role === 'Administrateur') return true;
            if (availabilityLoading || listAvailability.length === 0) {
              return absence.author_role === 'Membre';
            }
            const hasAvailableAdmin = directMembers.some(m => 
              m.role === ROLES.ADMIN && 
              listAvailability.some(a => a.id_utilisateur === m.id_utilisateur && a.is_available)
            );
            return absence.author_role === 'Membre' && !hasAvailableAdmin;
          }
        }

        // --- WORKSPACE ---
        if (workspaceId) {
          if (isDirectResourceCreator) {
            if (absence.author_role === 'Administrateur') return true;
            
            if (absence.author_role === 'Membre') {
              const absenceStart = new Date(absence.date_debut);
              const absenceEnd = absence.date_fin ? new Date(absence.date_fin) : absenceStart;
              
              const hasAvailableAdmin = directMembers.some(m => 
                m.role === ROLES.ADMIN && 
                m.id_utilisateur !== absence.owner_user_id &&
                listAvailability.some(a => 
                  a.id_utilisateur === m.id_utilisateur && 
                  a.is_available &&
                  (!a.current_absence || 
                   new Date(a.current_absence.date_debut) > absenceEnd ||
                   new Date(a.current_absence.date_fin || a.current_absence.date_debut) < absenceStart)
                )
              );
              
              return !hasAvailableAdmin;
            }
            return false;
          }
          
          if (isDirectResourceAdmin) {
            return absence.author_role === 'Membre';
          }
          
          return false;
        }

        return false;
      })();

      return hasPermission;
    });
  }, [accessibleAbsences, isDirectResourceAdmin, isDirectResourceCreator, listAvailability, directMembers, listeId, espaceId, workspaceId, availabilityLoading]);

  const calendarAbsences = useMemo(
    () => [...visibleAbsences]
      .sort((a, b) => new Date(a.date_debut || 0).getTime() - new Date(b.date_debut || 0).getTime()),
    [visibleAbsences],
  );

  const reportsWithAuthors = useMemo(() => {
    return (reports || []).filter(Boolean).map(report => ({
      ...report,
      owner_user_id: report.owner_user_id
        || members.find(member => member.id === report.id_membre)?.id_utilisateur
        || membershipMap.get(report.id_membre)?.id_utilisateur
        || null,
      authorName: getAuthorName(report.id_membre, report.owner_user_id, report.owner_name)
    }));
  }, [reports, members, membershipMap, getAuthorName]);

  const ownReports = useMemo(
    () => reportsWithAuthors.filter(report =>
      report.owner_user_id === currentUserId
      || report.id_membre === isDirectMemberRecord?.id
    ),
    [reportsWithAuthors, currentUserId, isDirectMemberRecord?.id],
  );

  const accessibleReports = useMemo(
    () => reportsWithAuthors.filter(report =>
      report.owner_user_id !== currentUserId
      && report.id_membre !== isDirectMemberRecord?.id
      && !archivedReportIds.includes(report.id)
    ),
    [reportsWithAuthors, archivedReportIds, currentUserId, isDirectMemberRecord?.id],
  );

  const archivedReports = useMemo(
    () => reportsWithAuthors.filter(report => archivedReportIds.includes(report.id)),
    [reportsWithAuthors, archivedReportIds],
  );

  const filesWithAuthors = useMemo(() => {
    return (files || []).filter(Boolean).map(file => ({
      ...file,
      owner_user_id: file.owner_user_id || file.meta_donnees?.owner_user_id || null,
      authorName: getAuthorName(file.id_membre, file.meta_donnees?.owner_user_id, file.owner_name)
    }));
  }, [files, members, membershipMap, getAuthorName]);

  const impactedTasksForAbsences = useMemo(() => {
    const impacted = new Set<string>();
    visibleAbsences
      .filter(absence => ['en_attente', 'approuvee'].includes(absence.statut))
      .forEach(absence => {
        if (!absence) return;
        tasks.forEach(task => {
          const assignedToAbsenceOwner = task.assignees?.some(assignee => assignee.id === absence.owner_user_id);
          if (assignedToAbsenceOwner && rangesOverlap(absence.date_debut, absence.date_fin, task.startDate || task.dueDate, task.dueDate)) {
            impacted.add(task.id);
          }
        });
      });
    return impacted.size;
  }, [tasks, visibleAbsences]);

  const absenceDashboard = useMemo(() => {
    const unavailableToday = listAvailability.filter(item => !item.is_available).length;
    const upcoming = visibleAbsences.filter(absence =>
      absence.statut === 'approuvee' && new Date(absence.date_debut) > new Date()
    ).length;
    
    const impactedProjectsCount = visibleAbsences.reduce((acc, absence) => {
      const impact = absenceImpacts[absence.id];
      if (impact && impact.impacted_projects) {
        return acc + impact.impacted_projects.length;
      }
      return acc;
    }, 0);

    return {
      unavailableToday,
      pending: pendingAbsences.length,
      upcoming,
      impactedTasks: impactedTasksForAbsences,
      impactedProjectsCount,
    };
  }, [impactedTasksForAbsences, listAvailability, pendingAbsences.length, visibleAbsences, absenceImpacts]);

  // ============================================================
  // ✅ EFFET : Charger automatiquement les impacts dans l'onglet Impact
  // (placé ICI après la déclaration de visibleAbsences et absenceDashboard)
  // ============================================================
  useEffect(() => {
    // Ne charger que si l'onglet actif est 'absences' et la vue est 'impact'
    if (activeTool !== 'absences' || absenceView !== 'impact') return;
    if (isLoadingImpacts) return;
    
    // Récupérer les absences approuvées qui n'ont pas encore d'impact
    const approvedAbsences = visibleAbsences.filter(
      a => a.statut === 'approuvee' && !absenceImpacts[a.id]
    );
    if (approvedAbsences.length === 0) return;

    setIsLoadingImpacts(true);
    
    const loadImpacts = async () => {
      try {
        await Promise.all(
          approvedAbsences.map(async (absence) => {
            try {
              const impact = await absenceService.getImpact(absence.id);
              setAbsenceImpacts(prev => ({ ...prev, [absence.id]: impact }));
            } catch (err) {
              console.error(`Erreur lors du chargement de l'impact pour ${absence.id}`, err);
            }
          })
        );
      } finally {
        setIsLoadingImpacts(false);
      }
    };
    
    loadImpacts();
  }, [activeTool, absenceView, visibleAbsences, absenceImpacts, isLoadingImpacts]);

  // ============================================================
  // ACTIONS - FICHIERS
  // ============================================================
  
  const handleUploadFile = useCallback(async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await plannerToolsService.uploadFile(file);
      setFileForm(prev => ({
        ...prev,
        nom: prev.nom || file.name,
        url_fichier: result.url,
        type_fichier: file.name.split('.').pop()?.toLowerCase() || 'fichier'
      }));
      toast.success(`Fichier "${file.name}" prêt à être joint.`);
    } catch (err: any) {
      toast.error(`Échec de l'envoi du fichier : ${getErrorMessage(err)}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleCreateFile = useCallback(async () => {
    if (!canAddFiles) {
      toast.error("Vous n'avez pas le droit d'ajouter un fichier à cette ressource.");
      return;
    }
    if (!fileForm.nom.trim() || !fileForm.url_fichier || !fileTargetId) return;
    setLoading(true);
    try {
      await plannerToolsService.createFile({
        ...fileForm,
        target_type: fileTargetType,
        target_id: fileTargetId,
      });
      setFileForm({ nom: '', url_fichier: '', type_fichier: '' });
      await loadFiles();
      toast.success('Fichier rattaché avec succès.');
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Impossible d'ajouter le fichier.");
    } finally {
      setLoading(false);
    }
  }, [canAddFiles, fileForm, fileTargetId, fileTargetType, loadFiles]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    setLoading(true);
    try {
      await plannerToolsService.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('Fichier supprimé avec succès.');
    } catch (err: any) {
      toast.error(`Erreur lors de la suppression : ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownload = useCallback(async (file: any) => {
    try {
      const fullUrl = file.url_fichier?.startsWith('http') ? file.url_fichier : `${import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004'}${file.url_fichier || ''}`;
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.nom || 'fichier';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      toast.error("Échec du téléchargement.");
    }
  }, []);

  // ============================================================
  // ACTIONS - RAPPORTS
  // ============================================================
  
  const startEditReport = useCallback((report: any) => {
    setEditingReport(report);
    setReportEditForm({
      titre: report.titre || '',
      realisations: report.realisations || '',
      difficultes_et_solutions: report.difficultes_et_solutions || '',
      commentaire: report.commentaire || '',
      fichier_joint: report.fichier_joint || '',
      periode_debut: report.periode_debut ? new Date(report.periode_debut).toISOString().split('T')[0] : '',
      periode_fin: report.periode_fin ? new Date(report.periode_fin).toISOString().split('T')[0] : '',
    });
  }, []);

  const handleCreateReport = useCallback(async () => {
    const currentUserMemberRecord = directMembers.find(m => m.id_utilisateur === currentUserId);

    if (!currentUserMemberRecord || !reportForm.titre.trim() || !reportForm.periode_debut || !reportForm.periode_fin) {
      toast.error('Veuillez renseigner le titre, la date de début et la date de fin du rapport.');
      return;
    }

    if (new Date(reportForm.periode_debut) > new Date(reportForm.periode_fin)) {
      toast.error('La date de début doit être antérieure ou égale à la date de fin.');
      return;
    }

    if (!canCreateReport) {
      toast.error(
        listeId
          ? 'Seuls les administrateurs directs ou les membres directs ayant au moins une tâche assignée peuvent envoyer un rapport.'
          : espaceId
            ? "Seuls les administrateurs directs ayant créé au moins une liste ou un sous-espace direct dans cet espace peuvent envoyer un rapport."
            : "Seuls les administrateurs directs ayant créé au moins une liste ou un espace direct dans ce workspace peuvent envoyer un rapport."
      );
      return;
    }
    setLoading(true);
    try {
      const createdReport = await plannerToolsService.createReport({
        id_membre: currentUserMemberRecord.id,
        titre: reportForm.titre,
        realisations: reportForm.realisations || undefined,
        difficultes_et_solutions: reportForm.difficultes_et_solutions || undefined,
        commentaire: reportForm.commentaire || undefined,
        fichier_joint: reportForm.fichier_joint || undefined,
        periode_debut: new Date(reportForm.periode_debut).toISOString(),
        periode_fin: new Date(reportForm.periode_fin).toISOString(),
      });
      setReportForm({
        titre: '',
        realisations: '',
        difficultes_et_solutions: '',
        commentaire: '',
        fichier_joint: '',
        periode_debut: '',
        periode_fin: '',
      });
      setSelectedMemberId('');
      setReports(prev => [
        {
          ...createdReport,
          owner_user_id: createdReport.owner_user_id || currentUserId,
          owner_name: createdReport.owner_name || 'Moi',
          liste_id: createdReport.liste_id || listeId,
          id_liste: createdReport.id_liste || listeId,
          id_espace: createdReport.id_espace || espaceId,
          id_workspace: createdReport.id_workspace || workspaceId,
        },
        ...prev.filter(report => report.id !== createdReport.id),
      ]);
      setActiveTool('reports');
      toast.success('Rapport envoyé avec succès.');
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Impossible de créer le rapport.');
    } finally {
      setLoading(false);
    }
  }, [reportForm, directMembers, currentUserId, canCreateReport, listeId, espaceId, workspaceId]);

  const handleUpdateReport = useCallback(async () => {
    if (!editingReport || !reportEditForm.titre.trim()) return;
    if (reportEditForm.periode_debut && reportEditForm.periode_fin && new Date(reportEditForm.periode_debut) > new Date(reportEditForm.periode_fin)) {
      toast.error('La date de début doit être antérieure ou égale à la date de fin.');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        titre: reportEditForm.titre,
        realisations: reportEditForm.realisations || undefined,
        difficultes_et_solutions: reportEditForm.difficultes_et_solutions || undefined,
        commentaire: reportEditForm.commentaire || undefined,
        fichier_joint: reportEditForm.fichier_joint || undefined,
      };
      if (reportEditForm.periode_debut) {
        payload.periode_debut = new Date(reportEditForm.periode_debut).toISOString();
      }
      if (reportEditForm.periode_fin) {
        payload.periode_fin = new Date(reportEditForm.periode_fin).toISOString();
      }
      const updated = await plannerToolsService.updateReport(editingReport.id, payload);
      setReports(prev => prev.map(report => report.id === editingReport.id ? { ...report, ...updated } : report));
      setSelectedReport((prev: any) => prev?.id === editingReport.id ? { ...prev, ...updated } : prev);
      setEditingReport(null);
      toast.success('Rapport modifié avec succès.');
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Impossible de modifier le rapport.');
    } finally {
      setLoading(false);
    }
  }, [editingReport, reportEditForm]);

  const handleDeleteReport = useCallback(async (report: any) => {
    setLoading(true);
    try {
      await plannerToolsService.deleteReport(report.id);
      setReports(prev => prev.filter(item => item.id !== report.id));
      setSelectedReport((prev: any | null) => prev?.id === report.id ? null : prev);
      setEditingReport((prev: any | null) => prev?.id === report.id ? null : prev);
      toast.success('Rapport supprimé avec succès.');
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Impossible de supprimer le rapport.');
    } finally {
      setLoading(false);
    }
  }, []);

  const archiveReport = useCallback((reportId: string) => {
    const next = Array.from(new Set([...archivedReportIds, reportId]));
    setArchivedReportIds(next);
    localStorage.setItem(reportArchiveKey, JSON.stringify(next));
    toast.success('Rapport archivé dans votre espace.');
  }, [archivedReportIds, reportArchiveKey]);

  const unarchiveReport = useCallback((reportId: string) => {
    const next = archivedReportIds.filter(id => id !== reportId);
    setArchivedReportIds(next);
    localStorage.setItem(reportArchiveKey, JSON.stringify(next));
    toast.success('Rapport restauré.');
  }, [archivedReportIds, reportArchiveKey]);

  const printReport = useCallback((report: any) => {
    const win = window.open('', '_blank');
    if (!win) return;

    const escapeHtml = (value?: string | null) => {
      if (!value) return '';
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const safeTitle = escapeHtml(report.titre);
    const safeAuthor = escapeHtml(report.authorName || 'Utilisateur');
    const safeRealisations = escapeHtml(report.realisations);
    const safeDifficultes = escapeHtml(report.difficultes_et_solutions);
    const safeCommentaire = escapeHtml(report.commentaire);
    const periodeDebut = report.periode_debut ? formatDate(report.periode_debut) : 'Non renseignée';
    const periodeFin = report.periode_fin ? formatDate(report.periode_fin) : 'Non renseignée';

    win.document.write(`
      <html>
        <head>
          <title>Rapport - ${safeTitle}</title>
          <style>
            body {font-family: Inter, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header {border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
            .title {font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
            .meta {font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
            .section {margin-bottom: 30px; }
            .section-title {font-size: 10px; font-weight: 900; color: #059669; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; }
            .content {font-size: 14px; background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; white-space: pre-wrap; }
            .content.warning {background: #fff1f2; border-left-color: #f43f5e; color: #9f1239; }
            .content.note {background: #eff6ff; border-left-color: #3b82f6; color: #1d4ed8; }
            .period {background: #f0fdf4; border-left-color: #22c55e; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; font-weight: 600; }
            .footer {margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; display: flex; justify-content: space-between; }
            .signature {font-weight: 700; color: #059669; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="meta">Rapport d'activité</div>
              <h1 class="title">${safeTitle}</h1>
            </div>
            <div class="meta">Date d'émission: ${formatDate(report.created_at)}</div>
          </div>

          <div class="period">
            <span>📅 Période du rapport</span>
            <span>Du ${periodeDebut} au ${periodeFin}</span>
          </div>

          <div class="section">
            <div class="section-title">I. Réalisations</div>
            <div class="content">${safeRealisations || 'Aucune réalisation renseignée.'}</div>
          </div>
          ${safeDifficultes ? `
          <div class="section">
            <div class="section-title">II. Difficultés & Solutions</div>
            <div class="content warning">${safeDifficultes}</div>
          </div>` : ''}
          ${safeCommentaire ? `
          <div class="section">
            <div class="section-title">III. Commentaires Additionnels</div>
            <div class="content note">${safeCommentaire}</div>
          </div>` : ''}
          <div class="footer">
            <div>Généré par K-Planer le ${new Date().toLocaleDateString('fr-FR')}</div>
            <div>Signé: <span class="signature">${safeAuthor}</span></div>
          </div>
          <script>window.onload = () => {window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  }, []);

  // ============================================================
  // ACTIONS - ABSENCES
  // ============================================================
  
  const handleCreateAbsence = useCallback(async () => {
    const currentUserMemberRecord = directMembers.find(m => m.id_utilisateur === currentUserId);
    const targetMemberId = currentUserMemberRecord?.id;

    if (!targetMemberId || !absenceForm.date_debut) {
      toast.error('Sélectionnez une date de début.');
      return;
    }

    setLoading(true);
    try {
      const typeLabel = absenceForm.is_absence ? 'Absence' : 'Congé';
      await absenceService.create({
        id_membre: targetMemberId,
        is_absence: absenceForm.is_absence,
        is_conge_planifie: absenceForm.is_conge_planifie,
        date_debut: new Date(absenceForm.date_debut).toISOString(),
        date_fin: absenceForm.date_fin ? new Date(absenceForm.date_fin).toISOString() : undefined,
        motif: absenceForm.motif,
        duree_demandee_en_jours: absenceForm.duree_demandee_en_jours ? Number(absenceForm.duree_demandee_en_jours) : undefined,
      });
      setAbsenceForm({ is_absence: true, is_conge_planifie: false, date_debut: '', date_fin: '', motif: '', duree_demandee_en_jours: '' });
      setIsAbsentModalOpen(false);
      await loadAbsences();
      toast.success(`Demande de ${typeLabel} envoyée pour validation.`);
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Impossible de créer la demande.');
    } finally {
      setLoading(false);
    }
  }, [absenceForm, directMembers, currentUserId, loadAbsences]);

  const handleCancelAbsence = useCallback(async (absence: any) => {
    try {
      await absenceService.cancel(absence.id);
      await loadAbsences();
      toast.success(absence.statut === 'en_attente' ? 'Demande retirée.' : 'Demande annulée.');
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Erreur lors de l'annulation.");
    }
  }, [loadAbsences]);

  const handleAbsenceDecision = useCallback(async () => {
    if (!decisionTarget || !decisionAction) return;
    setLoading(true);
    try {
      if (decisionAction === 'approve') {
        await absenceService.approve(decisionTarget.id, decisionComment);
      } else {
        await absenceService.reject(decisionTarget.id, decisionComment);
      }
      await loadAbsences();
      toast.success(decisionAction === 'approve' ? 'Demande approuvée.' : 'Demande rejetée.');
      setDecisionTarget(null);
      setDecisionAction(null);
      setDecisionComment('');
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Action impossible.');
    } finally {
      setLoading(false);
    }
  }, [decisionTarget, decisionAction, decisionComment, loadAbsences]);

  const archiveAbsence = useCallback((absenceId: string) => {
    const next = Array.from(new Set([...archivedAbsenceIds, absenceId]));
    setArchivedAbsenceIds(next);
    localStorage.setItem(absenceArchiveKey, JSON.stringify(next));
    toast.success('Demande archivée dans votre espace.');
  }, [archivedAbsenceIds, absenceArchiveKey]);

  const unarchiveAbsence = useCallback((absenceId: string) => {
    const next = archivedAbsenceIds.filter(id => id !== absenceId);
    setArchivedAbsenceIds(next);
    localStorage.setItem(absenceArchiveKey, JSON.stringify(next));
    toast.success('Demande restaurée.');
  }, [archivedAbsenceIds, absenceArchiveKey]);

  const handleAssignTaskReplacement = useCallback(async (task: Task, absence: any) => {
    const replacementUserId = taskReplacementByTaskId[task.id];
    
    if (!replacementUserId) {
      const candidates = getSortedReplacementCandidates(task, absence);
      const availableCandidates = candidates.filter(c => c.isAvailable);
      
      if (availableCandidates.length === 0) {
        setNoReplacementTaskId(task.id);
        setShowNoReplacementNotification(true);
        return;
      }
      
      toast.error('Choisissez un membre à ajouter sur cette tâche.');
      return;
    }
    
    setLoading(true);
    try {
      await tacheService.assignMember(task.id, replacementUserId);
      const replacement = directMembers.find(member => member.id_utilisateur === replacementUserId);
      toast.success(`${replacement?.name || 'Le membre'} a été ajouté sur "${task.title}".`);
      setTaskReplacementByTaskId(prev => ({ ...prev, [task.id]: '' }));
      setShowNoReplacementNotification(false);
      setNoReplacementTaskId(null);
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Impossible d'ajouter ce membre sur la tâche.");
    } finally {
      setLoading(false);
    }
  }, [taskReplacementByTaskId, directMembers, getSortedReplacementCandidates]);

  const handleAddBackupAdmin = useCallback(async () => {
    if (!listeId) return;
    if (!adminCandidateUserId && !adminInviteIdentifier.trim()) {
      toast.error('Choisissez un membre hérité ou renseignez un email/username.');
      return;
    }
    setLoading(true);
    try {
      if (adminCandidateUserId) {
        await listeService.assignMember(listeId, adminCandidateUserId, ROLES.ADMIN);
        const admin = inheritedMembers.find(member => member.id_utilisateur === adminCandidateUserId);
        toast.success(`${admin?.name || 'Le membre'} a été ajouté comme administrateur de la liste.`);
      } else {
        await listeService.inviteMember(listeId, adminInviteIdentifier.trim(), ROLES.ADMIN);
        toast.success('Invitation administrateur envoyée.');
      }
      setAdminCandidateUserId('');
      setAdminInviteIdentifier('');
      await loadMembers();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Impossible d'ajouter cet administrateur.");
    } finally {
      setLoading(false);
    }
  }, [listeId, adminCandidateUserId, adminInviteIdentifier, inheritedMembers, loadMembers]);

  const checkImpact = useCallback(async (absence: any) => {
    setSelectedAbsenceForImpact(absence);
    setLoading(true);
    try {
      const impact = await absenceService.getImpact(absence.id);
      setAbsenceImpacts(prev => ({ ...prev, [absence.id]: impact }));
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Impossible de charger l\'impact.');
    } finally {
      setLoading(false);
    }
  }, []);

  const openAbsenceDecision = useCallback((absence: any, action: 'approve' | 'reject') => {
    setDecisionTarget(absence);
    setDecisionAction(action);
    setDecisionComment('');
  }, []);

  const closeAbsenceDecision = useCallback(() => {
    if (loading) return;
    setDecisionTarget(null);
    setDecisionAction(null);
    setDecisionComment('');
  }, [loading]);

  // ============================================================
  // RETOUR
  // ============================================================
  
  return {
    // États
    activeTool,
    setActiveTool,
    members,
    directMembers,
    inheritedMembers,
    membershipMap,
    loading,
    membersLoading,
    files,
    fileForm,
    setFileForm,
    reports,
    reportForm,
    setReportForm,
    selectedReport,
    setSelectedReport,
    editingReport,
    setEditingReport,
    isReportArchiveOpen,
    setIsReportArchiveOpen,
    reportEditForm,
    setReportEditForm,
    archivedReportIds,
    archivedReports,
    absences,
    absenceView,
    setAbsenceView,
    isAbsentModalOpen,
    setIsAbsentModalOpen,
    absenceForm,
    setAbsenceForm,
    archivedAbsenceIds,
    archivedAbsences,
    selectedAbsenceForImpact,
    setSelectedAbsenceForImpact,
    absenceImpacts,
    taskReplacementByTaskId,
    setTaskReplacementByTaskId,
    adminCandidateUserId,
    setAdminCandidateUserId,
    adminInviteIdentifier,
    setAdminInviteIdentifier,
    decisionTarget,
    decisionAction,
    decisionComment,
    setDecisionComment,
    listAvailability,
    availabilityLoading,
    showNoReplacementNotification,
    setShowNoReplacementNotification,
    noReplacementTaskId,
    setNoReplacementTaskId,
    isAbsenceArchiveOpen,
    setIsAbsenceArchiveOpen,
    selectedMemberId,
    setSelectedMemberId,
    isUploading,
    setIsUploading,
    fileInputRef,
    
    // Données mémorisées
    ownAbsences,
    accessibleAbsences,
    pendingAbsences,
    visibleAbsences,
    calendarAbsences,
    ownReports,
    accessibleReports,
    filesWithAuthors,
    reportsWithAuthors,
    absencesWithAuthors,
    absenceDashboard,
    flattenedTasks,
    taskById,
    impactedTasksForAbsences,
    
    // Permissions
    canViewFiles,
    canViewReports,
    canViewAbsences,
    canAddFiles,
    canCreateReport,
    canCreateAbsence,
    canViewOwnAbsenceRequests,
    isManager,
    isDirectMemberRecord,
    isDirectResourceAdmin,
    isDirectResourceCreator,
    canReceiveReports,
    canShowReportComposer,
    canShowOwnReportHistory,
    useFullReportWidth,
    isGuestAccess,
    isInheritedManager,
    isListInheritedOnlyManager,
    hasReportScope,
    directMembersLabel,
    inheritedMembersLabel,
    reportContactMembers,
    listMemberNeedsAssignedTaskForReport,
    directAdminNeedsChildForReport,
    eligibleInheritedMembers,
    fileTargetType,
    fileTargetId,
    scope,
    activeScopeKey,
    reportArchiveKey,
    absenceArchiveKey,
    
    // Actions
    loadMembers,
    loadFiles,
    loadReports,
    loadAbsences,
    refreshCurrentTool,
    refreshChildCreationStatus,
    handleUploadFile,
    handleCreateFile,
    handleDeleteFile,
    handleDownload,
    startEditReport,
    handleCreateReport,
    handleUpdateReport,
    handleDeleteReport,
    archiveReport,
    unarchiveReport,
    printReport,
    handleCreateAbsence,
    handleCancelAbsence,
    handleAbsenceDecision,
    archiveAbsence,
    unarchiveAbsence,
    handleAssignTaskReplacement,
    handleAddBackupAdmin,
    checkImpact,
    openAbsenceDecision,
    closeAbsenceDecision,
    getAuthorName,
    getDurationDisplay,
    formatDate,
    getTasksImpactedByAbsence,
    getTaskReplacementCandidates,
    getSortedReplacementCandidates,
    rangesOverlap,
    isDirectAdmin,

    // ✅ Nouvel état
    isLoadingImpacts,
  };
};