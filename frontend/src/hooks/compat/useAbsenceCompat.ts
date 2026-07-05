// src/hooks/compat/useAbsenceCompat.ts
import { useCallback } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { absenceService } from '../../services/absence.service';
import {
  useListAbsencesQuery,
  useGetAbsenceQuery,
  useGetAbsenceCalendarQuery,
  useGetAbsenceConflictsQuery,
  useGetAbsenceImpactQuery,
  useGetAvailabilityQuery,
  useCreateAbsenceMutation,
  useUpdateAbsenceMutation,
  useDeleteAbsenceMutation,
  useApproveAbsenceMutation,
  useRejectAbsenceMutation,
  useFinishAbsenceMutation,
  useCancelAbsenceMutation,
} from '../../store/api/absenceApi';
import type {
  AbsenceListParams,
  AbsenceCalendarParams,
  AbsenceAvailabilityRequest,
} from '../../store/api/absenceApi';

export const useAbsenceCompat = (absenceId?: string, resourceId?: string) => {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  // Liste des absences
  const {
    data: absences,
    isLoading: listLoading,
    refetch: refetchList,
    error: listError,
  } = useListAbsencesQuery({ limit: 100 });

  // Détail d'une absence
  const {
    data: absenceDetail,
    isLoading: detailLoading,
    refetch: refetchDetail,
    error: detailError,
  } = useGetAbsenceQuery(absenceId ?? skipToken);

  // Calendrier
  const {
    data: calendar,
    isLoading: calendarLoading,
    refetch: refetchCalendar,
  } = useGetAbsenceCalendarQuery({});

  // Conflits
  const {
    data: conflicts,
    isLoading: conflictsLoading,
    refetch: refetchConflicts,
  } = useGetAbsenceConflictsQuery(absenceId ?? skipToken);

  // Impact
  const {
    data: impact,
    isLoading: impactLoading,
    refetch: refetchImpact,
  } = useGetAbsenceImpactQuery(absenceId ?? skipToken);

  // Disponibilité
  const {
    data: availability,
    isLoading: availabilityLoading,
    refetch: refetchAvailability,
  } = useGetAvailabilityQuery(
    resourceId
      ? { resourceId, body: { user_ids: [] } }
      : skipToken
  );

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const [createAbsenceRTK] = useCreateAbsenceMutation();
  const [updateAbsenceRTK] = useUpdateAbsenceMutation();
  const [deleteAbsenceRTK] = useDeleteAbsenceMutation();
  const [approveAbsenceRTK] = useApproveAbsenceMutation();
  const [rejectAbsenceRTK] = useRejectAbsenceMutation();
  const [finishAbsenceRTK] = useFinishAbsenceMutation();
  const [cancelAbsenceRTK] = useCancelAbsenceMutation();

  // ==========================================================================
  // FONCTIONS AVEC FALLBACK
  // ==========================================================================

  const listAbsences = useCallback(
    async (params?: AbsenceListParams) => {
      try {
        const result = await refetchList();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.list');
        return await absenceService.list(params);
      }
    },
    [refetchList]
  );

  const getAbsence = useCallback(
    async (id: string) => {
      try {
        const result = await refetchDetail();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.get');
        return await absenceService.get(id);
      }
    },
    [refetchDetail]
  );

  const getCalendar = useCallback(
    async (params?: AbsenceCalendarParams) => {
      try {
        const result = await refetchCalendar();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.getCalendar');
        return await absenceService.getCalendar(params);
      }
    },
    [refetchCalendar]
  );

  const getConflicts = useCallback(
    async (id: string) => {
      try {
        const result = await refetchConflicts();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.getConflicts');
        return await absenceService.getConflicts(id);
      }
    },
    [refetchConflicts]
  );

  const getImpact = useCallback(
    async (id: string) => {
      try {
        const result = await refetchImpact();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.getImpact');
        return await absenceService.getImpact(id);
      }
    },
    [refetchImpact]
  );

  const getAvailability = useCallback(
    async (resourceId: string, userIds: string[], referenceDate?: string) => {
      try {
        const result = await refetchAvailability();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.getAvailability');
        return await absenceService.getAvailability(resourceId, userIds, referenceDate);
      }
    },
    [refetchAvailability]
  );

  const createAbsence = useCallback(
    async (data: any) => {
      try {
        return await createAbsenceRTK(data).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.create');
        return await absenceService.create(data);
      }
    },
    [createAbsenceRTK]
  );

  const updateAbsence = useCallback(
    async (id: string, data: any) => {
      try {
        return await updateAbsenceRTK({ id, data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.update');
        return await absenceService.update(id, data);
      }
    },
    [updateAbsenceRTK]
  );

  const deleteAbsence = useCallback(
    async (id: string) => {
      try {
        await deleteAbsenceRTK(id).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.delete');
        await absenceService.delete(id);
      }
    },
    [deleteAbsenceRTK]
  );

  const approveAbsence = useCallback(
    async (id: string, commentaire?: string) => {
      try {
        return await approveAbsenceRTK({ id, commentaire }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.approve');
        return await absenceService.approve(id, commentaire);
      }
    },
    [approveAbsenceRTK]
  );

  const rejectAbsence = useCallback(
    async (id: string, motif?: string) => {
      try {
        return await rejectAbsenceRTK({ id, motif }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.reject');
        return await absenceService.reject(id, motif);
      }
    },
    [rejectAbsenceRTK]
  );

  const finishAbsence = useCallback(
    async (id: string) => {
      try {
        return await finishAbsenceRTK(id).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.finish');
        return await absenceService.finish(id);
      }
    },
    [finishAbsenceRTK]
  );

  const cancelAbsence = useCallback(
    async (id: string) => {
      try {
        return await cancelAbsenceRTK(id).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> absenceService.cancel');
        return await absenceService.cancel(id);
      }
    },
    [cancelAbsenceRTK]
  );

  // ==========================================================================
  // REFETCH
  // ==========================================================================

  const refetchAll = useCallback(() => {
    refetchList();
    refetchCalendar();
    if (absenceId) {
      refetchDetail();
      refetchConflicts();
      refetchImpact();
    }
    if (resourceId) {
      refetchAvailability();
    }
  }, [
    refetchList,
    refetchCalendar,
    refetchDetail,
    refetchConflicts,
    refetchImpact,
    refetchAvailability,
    absenceId,
    resourceId,
  ]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Données
    absences: absences || [],
    absenceDetail,
    calendar: calendar || [],
    conflicts: conflicts || [],
    impact,
    availability: availability || [],

    // États de chargement
    isLoading: listLoading || detailLoading || calendarLoading || conflictsLoading || impactLoading || availabilityLoading,

    // Erreurs
    errors: {
      list: listError,
      detail: detailError,
    },

    // Fonctions avec fallback
    listAbsences,
    getAbsence,
    getCalendar,
    getConflicts,
    getImpact,
    getAvailability,
    createAbsence,
    updateAbsence,
    deleteAbsence,
    approveAbsence,
    rejectAbsence,
    finishAbsence,
    cancelAbsence,

    // Rafraîchissement
    refetch: refetchAll,
    refetchList,
    refetchCalendar,
    refetchDetail,
    refetchConflicts,
    refetchImpact,
    refetchAvailability,

    // Service legacy
    legacy: absenceService,
  };
};
