// src/hooks/compat/usePlannerToolsCompat.ts
import { useCallback } from 'react';
import { plannerToolsService } from '../../services/plannerTools.service';
import {
  useGlobalSearchQuery,
  useSearchTasksQuery,
  useListFilesQuery,
  useListReportsQuery,
  useUploadFileMutation,
  useCreateFileMutation,
  useDeleteFileMutation,
  useShareFileMutation,
  useCreateReportMutation,
  useUpdateReportMutation,
  useDeleteReportMutation,
} from '../../store/api/plannerToolsApi';
import type {
  SearchParams,
  TaskSearchParams,
  FileSearchParams,
  RapportListParams,
  FichierCreateRequest,
  FichierShareRequest,
  RapportCreateRequest,
  RapportUpdateRequest,
} from '../../store/api/plannerToolsApi';

export const usePlannerToolsCompat = () => {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  // Recherche globale
  const {
    data: searchResults,
    isLoading: searchLoading,
    refetch: refetchSearch,
  } = useGlobalSearchQuery({ q: '' }, { skip: true });

  // Recherche de tâches
  const {
    data: taskResults,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useSearchTasksQuery({}, { skip: true });

  // Fichiers
  const {
    data: files,
    isLoading: filesLoading,
    refetch: refetchFiles,
  } = useListFilesQuery({});

  // Rapports
  const {
    data: reports,
    isLoading: reportsLoading,
    refetch: refetchReports,
  } = useListReportsQuery({});

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const [uploadFileRTK] = useUploadFileMutation();
  const [createFileRTK] = useCreateFileMutation();
  const [deleteFileRTK] = useDeleteFileMutation();
  const [shareFileRTK] = useShareFileMutation();
  const [createReportRTK] = useCreateReportMutation();
  const [updateReportRTK] = useUpdateReportMutation();
  const [deleteReportRTK] = useDeleteReportMutation();

  // ==========================================================================
  // FONCTIONS AVEC FALLBACK
  // ==========================================================================

  const globalSearch = useCallback(
    async (params: SearchParams) => {
      try {
        const result = await refetchSearch();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> plannerToolsService.globalSearch');
        return await plannerToolsService.globalSearch(params.q, params);
      }
    },
    [refetchSearch]
  );

  const searchTasks = useCallback(
    async (params: TaskSearchParams) => {
      try {
        const result = await refetchTasks();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> plannerToolsService.searchTasks');
        return await plannerToolsService.searchTasks(params);
      }
    },
    [refetchTasks]
  );

  const listFiles = useCallback(
    async (params?: FileSearchParams) => {
      try {
        const result = await refetchFiles();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> plannerToolsService.listFiles');
        return await plannerToolsService.listFiles(params || {});
      }
    },
    [refetchFiles]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      try {
        return await uploadFileRTK(formData).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> plannerToolsService.uploadFile');
        return await plannerToolsService.uploadFile(file);
      }
    },
    [uploadFileRTK]
  );

  const createFile = useCallback(
    async (data: FichierCreateRequest & { url_fichier?: string }) => {
      const rtkPayload: FichierCreateRequest = {
        ...data,
        url: data.url || data.url_fichier || '',
      };
      try {
        return await createFileRTK(rtkPayload).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> plannerToolsService.createFile');
        return await plannerToolsService.createFile({
          ...data,
          url_fichier: data.url_fichier || data.url,
        });
      }
    },
    [createFileRTK]
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      try {
        await deleteFileRTK(fileId).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> plannerToolsService.deleteFile');
        await plannerToolsService.deleteFile(fileId);
      }
    },
    [deleteFileRTK]
  );

  const shareFile = useCallback(
    async (fileId: string, data: FichierShareRequest) => {
      try {
        return await shareFileRTK({ fileId, data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> plannerToolsService.shareFile');
        return await plannerToolsService.shareFile(fileId, data);
      }
    },
    [shareFileRTK]
  );

  const listReports = useCallback(
    async (params?: RapportListParams) => {
      try {
        const result = await refetchReports();
        return result.data;
      } catch (error) {
        console.warn('RTK Query fallback -> plannerToolsService.listReports');
        return await plannerToolsService.listReports(params || {});
      }
    },
    [refetchReports]
  );

  const createReport = useCallback(
    async (data: RapportCreateRequest) => {
      try {
        return await createReportRTK(data).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> plannerToolsService.createReport');
        return await plannerToolsService.createReport(data);
      }
    },
    [createReportRTK]
  );

  const updateReport = useCallback(
    async (reportId: string, data: RapportUpdateRequest) => {
      try {
        return await updateReportRTK({ reportId, data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> plannerToolsService.updateReport');
        return await plannerToolsService.updateReport(reportId, data);
      }
    },
    [updateReportRTK]
  );

  const deleteReport = useCallback(
    async (reportId: string) => {
      try {
        await deleteReportRTK(reportId).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> plannerToolsService.deleteReport');
        await plannerToolsService.deleteReport(reportId);
      }
    },
    [deleteReportRTK]
  );

  // ==========================================================================
  // REFETCH
  // ==========================================================================

  const refetchAll = useCallback(() => {
    refetchFiles();
    refetchReports();
  }, [refetchFiles, refetchReports]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Données
    searchResults,
    taskResults: taskResults || [],
    files: files || [],
    reports: reports || [],

    // États de chargement
    isLoading: searchLoading || tasksLoading || filesLoading || reportsLoading,

    // Fonctions avec fallback - Recherche
    globalSearch,
    searchTasks,

    // Fonctions avec fallback - Fichiers
    listFiles,
    uploadFile,
    createFile,
    deleteFile,
    shareFile,

    // Fonctions avec fallback - Rapports
    listReports,
    createReport,
    updateReport,
    deleteReport,

    // Rafraîchissement
    refetch: refetchAll,
    refetchFiles,
    refetchReports,

    // Service legacy
    legacy: plannerToolsService,
  };
};