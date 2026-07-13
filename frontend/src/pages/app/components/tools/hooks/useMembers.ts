// frontend/src/pages/app/components/tools/hooks/useMembers.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { workspaceService } from '../../../../../services/workspace.service';
import { espaceService } from '../../../../../services/espace.service';
import { listeService } from '../../../../../services/liste.service';
import { getMemberDisplayName, getMemberContactLabel } from '../../../../../utils/memberDisplay';
import { ROLES } from '../../../../../lib/roleHierarchy';

export interface ListMemberRecord {
  id: string;
  id_utilisateur: string;
  name: string;
  email: string;
  role: string;
  photo_base64?: string | null;
  username?: string;
  nom?: string;
  prenoms?: string;
}

interface UseMembersProps {
  workspaceId?: string | null;
  espaceId?: string | null;
  listeId?: string | null;
  currentUserId?: string | null;
}

export const useMembers = ({ workspaceId, espaceId, listeId, currentUserId }: UseMembersProps) => {
  const [members, setMembers] = useState<ListMemberRecord[]>([]);
  const [directMembers, setDirectMembers] = useState<ListMemberRecord[]>([]);
  const [inheritedMembers, setInheritedMembers] = useState<ListMemberRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [membershipMap, setMembershipMap] = useState<Map<string, ListMemberRecord>>(new Map());
  
  // ✅ Ref pour éviter les appels multiples (type number pour le timeout)
  const isInitialLoadRef = useRef(true);
  const loadTimeoutRef = useRef<number | null>(null);

  const directMembersLabel = listeId ? 'Membres de la liste' : espaceId ? "Membres de l'espace" : 'Membres du workspace';
  const inheritedMembersLabel = listeId ? 'Membres workspace/espace' : 'Membres du workspace parent';

  const loadMembers = useCallback(async (): Promise<ListMemberRecord[]> => {
    if (!workspaceId && !espaceId && !listeId) return [];
    
    // ✅ Vérifier si les membres sont déjà chargés
    if (members.length > 0 && !loading) {
      return members;
    }
    
    setLoading(true);
    try {
      const workspacePromise = workspaceId ? workspaceService.getMembers(workspaceId).catch(() => []) : Promise.resolve([]);
      const espacePromise = espaceId ? espaceService.getMembers(espaceId).catch(() => []) : Promise.resolve([]);
      const listePromise = listeId ? listeService.getMembers(listeId).catch(() => []) : Promise.resolve([]);

      const [workspaceRes, espaceRes, listeRes] = await Promise.all([workspacePromise, espacePromise, listePromise]);

      const processMembers = (raw: any[]) => {
        const map = new Map<string, ListMemberRecord>();
        (Array.isArray(raw) ? raw : []).forEach((m: any) => {
          const userId = m.id_utilisateur || m.utilisateur?.id || (m.utilisateur && typeof m.utilisateur === 'string' ? m.utilisateur : null) || m.id;
          if (!userId) return;
          map.set(userId, {
            id: m.id,
            id_utilisateur: userId,
            name: getMemberDisplayName(m),
            email: getMemberContactLabel(m),
            role: m.role,
            photo_base64: m.photo_base64 || null,
          });
        });
        return Array.from(map.values());
      };

      const workspaceMembers = processMembers(workspaceRes);
      const espaceMembers = processMembers(espaceRes);
      const listeMembers = processMembers(listeRes);
      
      let direct = listeId ? listeMembers : espaceId ? espaceMembers : workspaceMembers;

      // Ajouter le créateur du workspace s'il manque
      if (workspaceId && !listeId && !espaceId) {
        try {
          const workspace = await workspaceService.getById(workspaceId);
          if (workspace?.id_utilisateur) {
            const creatorExists = direct.some(m => m.id_utilisateur === workspace.id_utilisateur);
            if (!creatorExists) {
              direct.push({
                id: `creator-${workspace.id_utilisateur}`,
                id_utilisateur: workspace.id_utilisateur,
                name: workspace.nom || 'Créateur',
                email: '',
                role: ROLES.CREATOR,
              });
            }
          }
        } catch (e) {
          console.warn("Impossible de récupérer le workspace pour ajouter le créateur", e);
        }
      }

      const inheritedNames = new Set(direct.map(m => m.id_utilisateur));
      const inheritedSources = listeId ? [...espaceMembers, ...workspaceMembers] : espaceId ? workspaceMembers : [];
      const inherited = inheritedSources
        .filter(m => !inheritedNames.has(m.id_utilisateur));

      setDirectMembers(direct);
      setInheritedMembers(inherited);

      const all = [...direct, ...inherited];
      setMembers(all);

      // Créer le membershipMap pour les lookups rapides
      const map = new Map<string, ListMemberRecord>();
      [...listeRes, ...espaceRes, ...workspaceRes].forEach((m: any) => {
        const userId = m.id_utilisateur || m.utilisateur?.id || (m.utilisateur && typeof m.utilisateur === 'string' ? m.utilisateur : null) || m.id;
        if (userId && m.id) {
          map.set(m.id, {
            id: m.id,
            id_utilisateur: userId,
            name: getMemberDisplayName(m),
            email: getMemberContactLabel(m),
            role: m.role,
            photo_base64: m.photo_base64 || null,
          });
        }
      });
      setMembershipMap(map);

      return all;
    } catch (err) {
      console.error('Failed to load members:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [workspaceId, espaceId, listeId, members, loading]);

  // Chargement initial - une seule fois
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      loadMembers();
    }
  }, [loadMembers]);

  // ✅ Recharger uniquement quand le contexte change (workspaceId, espaceId, listeId)
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      // Debounce pour éviter les appels multiples
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      loadTimeoutRef.current = window.setTimeout(() => {
        loadMembers();
      }, 200);
    }
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [workspaceId, espaceId, listeId, loadMembers]);

  const isDirectMemberRecord = directMembers.find(member => member.id_utilisateur === currentUserId);
  const isDirectAdmin = isDirectMemberRecord?.role === ROLES.CREATOR || isDirectMemberRecord?.role === ROLES.ADMIN;
  const isDirectResourceAdmin = isDirectMemberRecord?.role === ROLES.ADMIN;
  const isDirectResourceCreator = isDirectMemberRecord?.role === ROLES.CREATOR;

  const eligibleInheritedMembers = inheritedMembers.filter(member => member.role === ROLES.MEMBER);

  return {
    members,
    directMembers,
    inheritedMembers,
    membershipMap,
    loading,
    loadMembers,
    directMembersLabel,
    inheritedMembersLabel,
    isDirectMemberRecord,
    isDirectAdmin,
    isDirectResourceAdmin,
    isDirectResourceCreator,
    eligibleInheritedMembers,
  };
};