// src/store/api/planApi.ts
import { baseApi } from './baseApi';

// ============================================================================
// TYPES - Compatibles avec vos services existants
// ============================================================================

export interface SubscriptionPlanLimits {
  workspaces?: number | null;
  espaces?: number | null;
  projets?: number | null;
  membres?: number | null;
  stockage_mo?: number | null;
  historique_jours?: number | null;
}

export interface SubscriptionPlanBilling {
  montant: number;
  devise: string;
  duree_jours: number;
}

export interface SubscriptionPlan {
  code: 'ESSENTIEL' | 'PROFESSIONNEL' | 'ENTREPRISE' | string;
  nom: string;
  audience: string;
  description: string;
  price_label: string;
  highlight: boolean;
  billing?: SubscriptionPlanBilling;
  limits: SubscriptionPlanLimits;
  features: string[];
  restrictions: string[];
}

export interface PlanUsageOverview {
  plan: {
    code: string;
    nom: string;
    limits: SubscriptionPlanLimits;
  };
  usage: {
    workspaces: number;
    espaces: number;
    projets: number;
    membres: number;
  };
}

export interface PlanUsageResponse {
  plan: {
    code: string;
    nom: string;
    limits: SubscriptionPlanLimits;
  };
  usage: {
    workspaces: number;
    espaces: number;
    projets: number;
    membres: number;
  };
  limits_exceeded?: {
    workspaces?: boolean;
    espaces?: boolean;
    projets?: boolean;
    membres?: boolean;
  };
  percentage_used?: {
    workspaces?: number;
    espaces?: number;
    projets?: number;
    membres?: number;
  };
}

// ============================================================================
// API RTK Query
// ============================================================================

export const planApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================================================
    // QUERIES
    // ==========================================================================

    // Récupérer le catalogue des plans
    getPlans: builder.query<SubscriptionPlan[], void>({
      query: () => ({
        url: '/plans',
      }),
      providesTags: ['Plan', 'UserData'], // ✅ AJOUT
      keepUnusedDataFor: 3600,
    }),

    // Récupérer un plan par son code
    getPlanByCode: builder.query<SubscriptionPlan, string>({
      query: (code) => ({
        url: `/plans/${code}`,
      }),
      providesTags: (_result, _error, code) => [
        { type: 'Plan', id: code },
        'UserData', // ✅ AJOUT
      ],
      keepUnusedDataFor: 3600,
    }),

    // Récupérer l'utilisation du plan de l'utilisateur
    getMyPlanUsage: builder.query<PlanUsageResponse, void>({
      query: () => ({
        url: '/plans/me/usage',
      }),
      providesTags: ['PlanUsage', 'UserData'], // ✅ AJOUT
      keepUnusedDataFor: 120,
    }),

    // ==========================================================================
    // MUTATIONS (optionnelles - si besoin de changer de plan)
    // ==========================================================================

    // Changer de plan (si endpoint existe)
    changePlan: builder.mutation<
      { message: string; new_plan: SubscriptionPlan },
      { plan_code: string }
    >({
      query: ({ plan_code }) => ({
        url: '/plans/change',
        method: 'POST',
        body: { plan_code },
      }),
      invalidatesTags: ['Plan', 'PlanUsage', 'Subscription', 'UserData'], // ✅ AJOUT
    }),

    // Annuler l'abonnement (si endpoint existe)
    cancelSubscription: builder.mutation<
      { message: string },
      void
    >({
      query: () => ({
        url: '/plans/cancel',
        method: 'POST',
      }),
      invalidatesTags: ['PlanUsage', 'Subscription', 'UserData'], // ✅ AJOUT
    }),
  }),
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  // Queries
  useGetPlansQuery,
  useGetPlanByCodeQuery,
  useGetMyPlanUsageQuery,

  // Mutations
  useChangePlanMutation,
  useCancelSubscriptionMutation,
} = planApi;