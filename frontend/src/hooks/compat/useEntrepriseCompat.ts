// src/hooks/compat/useEntrepriseCompat.ts
import { useCallback } from 'react';
import { entrepriseService } from '../../services/entreprise.service';
import {
  useGetEntrepriseOverviewQuery,
  useGetEntrepriseProfileQuery,
  useGetActiveSubscriptionQuery,
  useCreateEntrepriseProfileMutation,
  useUpdateEntrepriseProfileMutation,
  useStartSubscriptionMutation,
  useConfirmSubscriptionPaymentMutation,
} from '../../store/api/entrepriseApi';
import type {
  EntrepriseProfilePayload,
  SubscriptionStartRequest,
  SubscriptionPaymentConfirmRequest,
} from '../../store/api/entrepriseApi';

export const useEntrepriseCompat = () => {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  const {
    data: overview,
    isLoading: overviewLoading,
    refetch: refetchOverview,
    error: overviewError,
  } = useGetEntrepriseOverviewQuery();

  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useGetEntrepriseProfileQuery();

  const {
    data: activeSubscription,
    isLoading: subscriptionLoading,
    refetch: refetchSubscription,
  } = useGetActiveSubscriptionQuery();

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const [createProfileRTK] = useCreateEntrepriseProfileMutation();
  const [updateProfileRTK] = useUpdateEntrepriseProfileMutation();
  const [startSubscriptionRTK] = useStartSubscriptionMutation();
  const [confirmPaymentRTK] = useConfirmSubscriptionPaymentMutation();

  // ==========================================================================
  // FONCTIONS AVEC FALLBACK
  // ==========================================================================

  const getOverview = useCallback(async () => {
    try {
      const result = await refetchOverview();
      return result.data;
    } catch (error) {
      console.warn('RTK Query fallback -> entrepriseService.getOverview');
      return await entrepriseService.getOverview();
    }
  }, [refetchOverview]);

  const createProfile = useCallback(
    async (data: EntrepriseProfilePayload) => {
      try {
        return await createProfileRTK(data).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> entrepriseService.createProfile');
        return await entrepriseService.createProfile(data);
      }
    },
    [createProfileRTK]
  );

  const updateProfile = useCallback(
    async (data: Partial<EntrepriseProfilePayload>) => {
      try {
        return await updateProfileRTK(data).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> entrepriseService.updateProfile');
        return await entrepriseService.updateProfile(data);
      }
    },
    [updateProfileRTK]
  );

  const startSubscription = useCallback(
    async (data: SubscriptionStartRequest) => {
      try {
        return await startSubscriptionRTK(data).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> entrepriseService.startSubscription');
        return await entrepriseService.startSubscription(data.plan_code, data.auto_renouvellement);
      }
    },
    [startSubscriptionRTK]
  );

  const confirmPayment = useCallback(
    async (abonnementId: string, data: SubscriptionPaymentConfirmRequest) => {
      try {
        return await confirmPaymentRTK({ abonnementId, data }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> entrepriseService.confirmPayment');
        return await entrepriseService.confirmPayment(abonnementId, data);
      }
    },
    [confirmPaymentRTK]
  );

  // ==========================================================================
  // REFETCH
  // ==========================================================================

  const refetchAll = useCallback(() => {
    refetchOverview();
    refetchProfile();
    refetchSubscription();
  }, [refetchOverview, refetchProfile, refetchSubscription]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Données
    overview,
    profile,
    activeSubscription,
    isPremium: profile?.is_premium || false,

    // États de chargement
    isLoading: overviewLoading || profileLoading || subscriptionLoading,

    // Erreurs
    errors: {
      overview: overviewError,
    },

    // Fonctions avec fallback
    getOverview,
    createProfile,
    updateProfile,
    startSubscription,
    confirmPayment,

    // Rafraîchissement
    refetch: refetchAll,
    refetchOverview,
    refetchProfile,
    refetchSubscription,

    // Helpers
    hasActiveSubscription: !!activeSubscription,
    isSubscriptionExpired: activeSubscription
      ? new Date(activeSubscription.date_fin || '') < new Date()
      : true,

    // Service legacy
    legacy: entrepriseService,
  };
};