// src/hooks/compat/useCanevasCompat.ts
import { useCallback } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { canevasService } from '../../services/canevas.service';
import {
  useGetCanevasByListeQuery,
  useGetEnhancedCanevasQuery,
  useGetSectionsByCanevasQuery,
  useGetChecklistsBySectionQuery,
  useCreateCanevasMutation,
  useUpdateCanevasMutation,
  useDeleteCanevasMutation,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useCreateChecklistInSectionMutation,
} from '../../store/api/canevasApi';
import type { Canevas, EnhancedCanevas, ApiSection, ApiChecklist } from '../../store/api/canevasApi';

export const useCanevasCompat = (listeId?: string, canevasId?: string, sectionId?: string) => {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  // Canevas standard
  const {
    data: canevas,
    isLoading: canevasLoading,
    refetch: refetchCanevas,
    error: canevasError,
  } = useGetCanevasByListeQuery(listeId ?? skipToken);

  // Canevas enrichi
  const {
    data: enhancedCanevas,
    isLoading: enhancedLoading,
    refetch: refetchEnhanced,
    error: enhancedError,
  } = useGetEnhancedCanevasQuery(listeId ?? skipToken);

  // Sections
  const {
    data: sections,
    isLoading: sectionsLoading,
    refetch: refetchSections,
  } = useGetSectionsByCanevasQuery(canevasId ?? skipToken);

  // Checklists d'une section
  const {
    data: checklists,
    isLoading: checklistsLoading,
    refetch: refetchChecklists,
  } = useGetChecklistsBySectionQuery(sectionId ?? skipToken);

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const [createCanevasRTK] = useCreateCanevasMutation();
  const [updateCanevasRTK] = useUpdateCanevasMutation();
  const [deleteCanevasRTK] = useDeleteCanevasMutation();
  const [createSectionRTK] = useCreateSectionMutation();
  const [updateSectionRTK] = useUpdateSectionMutation();
  const [deleteSectionRTK] = useDeleteSectionMutation();
  const [createChecklistRTK] = useCreateChecklistInSectionMutation();

  // ==========================================================================
  // FONCTIONS AVEC FALLBACK
  // ==========================================================================

  // --- Canevas ---

  const getCanevasByListe = useCallback(
    async (id: string) => {
      try {
        const result = await refetchCanevas();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> canevasService.getByListe');
        return await canevasService.getByListe(id);
      }
    },
    [refetchCanevas]
  );

  const getEnhancedCanevas = useCallback(
    async (id: string) => {
      try {
        const result = await refetchEnhanced();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> canevasService.getEnhancedByListe');
        return await canevasService.getEnhancedByListe(id);
      }
    },
    [refetchEnhanced]
  );

  const createCanevas = useCallback(
    async (id: string, data: { is_verrouille?: boolean }) => {
      try {
        return await createCanevasRTK({ listeId: id, is_verrouille: data.is_verrouille }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> canevasService.create');
        return await canevasService.create(id, data);
      }
    },
    [createCanevasRTK]
  );

  const updateCanevas = useCallback(
    async (id: string, data: { is_verrouille?: boolean }) => {
      try {
        return await updateCanevasRTK({ canevasId: id, is_verrouille: data.is_verrouille }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> canevasService.update');
        return await canevasService.update(id, data);
      }
    },
    [updateCanevasRTK]
  );

  const deleteCanevas = useCallback(
    async (id: string) => {
      try {
        await deleteCanevasRTK(id).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> canevasService.delete');
        await canevasService.delete(id);
      }
    },
    [deleteCanevasRTK]
  );

  // --- Sections ---

  const createSection = useCallback(
    async (canevasId: string, titre: string) => {
      try {
        return await createSectionRTK({ canevasId, titre }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> sectionService.create');
        const { sectionService } = await import('../../services/section.service');
        return await sectionService.create(canevasId, { titre });
      }
    },
    [createSectionRTK]
  );

  const updateSection = useCallback(
    async (sectionId: string, titre: string) => {
      try {
        return await updateSectionRTK({ sectionId, titre }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> sectionService.update');
        const { sectionService } = await import('../../services/section.service');
        return await sectionService.update(sectionId, { titre });
      }
    },
    [updateSectionRTK]
  );

  const deleteSection = useCallback(
    async (sectionId: string) => {
      try {
        await deleteSectionRTK(sectionId).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> sectionService.delete');
        const { sectionService } = await import('../../services/section.service');
        await sectionService.delete(sectionId);
      }
    },
    [deleteSectionRTK]
  );

  // --- Checklists ---

  const createChecklistInSection = useCallback(
    async (sectionId: string, texte: string, is_checked?: boolean) => {
      try {
        return await createChecklistRTK({ sectionId, texte, is_checked }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> checklistService.createInSection');
        const { checklistService } = await import('../../services/checklist.service');
        return await checklistService.createInSection(sectionId, { texte, is_checked });
      }
    },
    [createChecklistRTK]
  );

  // ==========================================================================
  // REFETCH
  // ==========================================================================

  const refetchAll = useCallback(() => {
    refetchCanevas();
    refetchEnhanced();
    if (canevasId) refetchSections();
    if (sectionId) refetchChecklists();
  }, [refetchCanevas, refetchEnhanced, refetchSections, refetchChecklists, canevasId, sectionId]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Données
    canevas,
    enhancedCanevas,
    sections: sections || [],
    checklists: checklists || [],

    // États de chargement
    isLoading: canevasLoading || enhancedLoading || sectionsLoading || checklistsLoading,

    // Erreurs
    errors: {
      canevas: canevasError,
      enhanced: enhancedError,
    },

    // Fonctions avec fallback - Canevas
    getCanevasByListe,
    getEnhancedCanevas,
    createCanevas,
    updateCanevas,
    deleteCanevas,

    // Fonctions avec fallback - Sections
    createSection,
    updateSection,
    deleteSection,

    // Fonctions avec fallback - Checklists
    createChecklistInSection,

    // Rafraîchissement
    refetch: refetchAll,
    refetchCanevas,
    refetchEnhanced,
    refetchSections,
    refetchChecklists,

    // Service legacy
    legacy: canevasService,
  };
};