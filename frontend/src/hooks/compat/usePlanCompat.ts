// src/hooks/compat/usePlanCompat.ts
import { useCallback, useMemo } from 'react';
import { planService } from '../../services/plan.service';
import {
  useGetPlansQuery,
  useGetPlanByCodeQuery,
  useGetMyPlanUsageQuery,
  useChangePlanMutation,
  useCancelSubscriptionMutation,
} from '../../store/api/planApi';
import type { SubscriptionPlan } from '../../store/api/planApi';

export const usePlanCompat = () => {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  const {
    data: plans,
    isLoading: plansLoading,
    refetch: refetchPlans,
    error: plansError,
  } = useGetPlansQuery();

  const {
    data: planUsage,
    isLoading: usageLoading,
    refetch: refetchUsage,
    error: usageError,
  } = useGetMyPlanUsageQuery();

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const [changePlanRTK] = useChangePlanMutation();
  const [cancelSubscriptionRTK] = useCancelSubscriptionMutation();

  // ==========================================================================
  // FONCTIONS AVEC FALLBACK
  // ==========================================================================

  const getPlans = useCallback(async () => {
    try {
      const result = await refetchPlans();
      return result.data;
    } catch (error) {
      console.warn('RTK Query fallback -> planService.getPlans');
      return await planService.getPlans();
    }
  }, [refetchPlans]);

  const getPlanByCode = useCallback(
    async (code: string) => {
      try {
        const result = await refetchPlans();
        return result.data?.find((p) => p.code === code);
      } catch (error) {
        console.warn('RTK Query fallback -> planService.getPlan');
        return await planService.getPlan(code);
      }
    },
    [refetchPlans]
  );

  const getMyUsage = useCallback(async () => {
    try {
      const result = await refetchUsage();
      return result.data;
    } catch (error) {
      console.warn('RTK Query fallback -> planService.getMyUsage');
      return await planService.getMyUsage();
    }
  }, [refetchUsage]);

  const changePlan = useCallback(
    async (planCode: string) => {
      try {
        return await changePlanRTK({ plan_code: planCode }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> planService.changePlan (non disponible)');
        throw new Error('Changement de plan non disponible via fallback');
      }
    },
    [changePlanRTK]
  );

  const cancelSubscription = useCallback(async () => {
    try {
      return await cancelSubscriptionRTK().unwrap();
    } catch (error) {
      console.warn('RTK Query fallback -> planService.cancelSubscription (non disponible)');
      throw new Error('Annulation d\'abonnement non disponible via fallback');
    }
  }, [cancelSubscriptionRTK]);

  // ==========================================================================
  // UTILITAIRES
  // ==========================================================================

  // Trouver un plan par son code
  const findPlanByCode = useCallback(
    (code: string): SubscriptionPlan | undefined => {
      return plans?.find((p) => p.code === code);
    },
    [plans]
  );

  // Vérifier si un plan est disponible
  const isPlanAvailable = useCallback(
    (code: string): boolean => {
      return !!plans?.some((p) => p.code === code);
    },
    [plans]
  );

  // Obtenir le plan actuel de l'utilisateur
  const currentPlan = useMemo(() => {
    if (!planUsage?.plan) return null;
    return planUsage.plan;
  }, [planUsage]);

  // Vérifier si l'utilisateur a dépassé les limites
  const hasExceededLimits = useMemo(() => {
    if (!planUsage?.limits_exceeded) return false;
    return Object.values(planUsage.limits_exceeded).some((v) => v === true);
  }, [planUsage]);

  // Obtenir les pourcentages d'utilisation
  const usagePercentages = useMemo(() => {
    if (!planUsage?.percentage_used) return {};
    return planUsage.percentage_used;
  }, [planUsage]);

  // ==========================================================================
  // REFETCH
  // ==========================================================================

  const refetchAll = useCallback(() => {
    refetchPlans();
    refetchUsage();
  }, [refetchPlans, refetchUsage]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Données
    plans: plans || [],
    planUsage,
    currentPlan,
    usagePercentages,
    hasExceededLimits,

    // États de chargement
    isLoading: plansLoading || usageLoading,

    // Erreurs
    errors: {
      plans: plansError,
      usage: usageError,
    },

    // Fonctions avec fallback
    getPlans,
    getPlanByCode,
    getMyUsage,
    changePlan,
    cancelSubscription,

    // Utilitaires
    findPlanByCode,
    isPlanAvailable,

    // Rafraîchissement
    refetch: refetchAll,
    refetchPlans,
    refetchUsage,

    // Service legacy
    legacy: planService,
  };
};