// src/store/api/entrepriseApi.ts
import { baseApi } from './baseApi';

// ============================================================================
// TYPES - Compatibles avec vos services existants
// ============================================================================

export interface EntrepriseProfilePayload {
  nom: string;
  description?: string | null;
  statut_juridique?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  numero_ifu?: string | null;
  numero_rccm?: string | null;
  nom_responsable_entreprise?: string | null;
  prenoms_responsable_entreprise?: string | null;
  telephone_responsable_entreprise?: string | null;
  site_web?: string | null;
  logo?: string | null;
  date_creation_entreprise?: string | null;
}

export interface EntrepriseProfile extends EntrepriseProfilePayload {
  id: string;
  id_utilisateur: string;
  is_premium: boolean;
  premium_activated_at?: string | null;
  premium_expire_at?: string | null;
  statut_compte: string;
  created_at: string;
  updated_at?: string | null;
}

export interface PlanAbonnement {
  id: string;
  code: string;
  nom: string;
  description?: string | null;
  montant: string | number;
  devise: string;
  duree_jours: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface AbonnementEntreprise {
  id: string;
  id_entreprise: string;
  id_plan_abonnement: string;
  date_debut?: string | null;
  date_fin?: string | null;
  statut: string;
  auto_renouvellement: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface PaiementAbonnement {
  id: string;
  id_abonnement: string;
  id_utilisateur?: string | null;
  montant: string | number;
  devise: string;
  mode_paiement?: string | null;
  reference_transaction?: string | null;
  statut: string;
  paid_at?: string | null;
  created_at: string;
}

export interface EntrepriseOverview {
  entreprise?: EntrepriseProfile | null;
  active_subscription?: AbonnementEntreprise | null;
  pending_subscription?: AbonnementEntreprise | null;
  active_plan?: PlanAbonnement | null;
  pending_plan?: PlanAbonnement | null;
  latest_payment?: PaiementAbonnement | null;
}

export interface SubscriptionStartResponse {
  entreprise: EntrepriseProfile;
  abonnement: AbonnementEntreprise;
  paiement: PaiementAbonnement;
  plan: PlanAbonnement;
}

export interface SubscriptionStartRequest {
  plan_code: string;
  auto_renouvellement?: boolean;
}

export interface SubscriptionPaymentConfirmRequest {
  mode_paiement?: string;
  reference_transaction?: string;
}

// ============================================================================
// API RTK Query
// ============================================================================

export const entrepriseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================================================
    // QUERIES
    // ==========================================================================

    // Récupérer l'aperçu de l'entreprise (profil + abonnements)
    getEntrepriseOverview: builder.query<EntrepriseOverview, void>({
      query: () => ({
        url: '/entreprise/me',
      }),
      providesTags: ['Entreprise', 'Subscription', 'Payment'],
      keepUnusedDataFor: 120,
    }),

    // Récupérer le profil de l'entreprise
    getEntrepriseProfile: builder.query<EntrepriseProfile | null, void>({
      query: () => ({
        url: '/entreprise/me',
        // On extrait seulement la partie entreprise de l'overview
      }),
      providesTags: ['Entreprise'],
      keepUnusedDataFor: 300,
      // Transform pour extraire seulement l'entreprise de l'overview
      transformResponse: (response: EntrepriseOverview) => response.entreprise || null,
    }),

    // Récupérer l'abonnement actif
    getActiveSubscription: builder.query<AbonnementEntreprise | null, void>({
      query: () => ({
        url: '/entreprise/me',
      }),
      providesTags: ['Subscription'],
      keepUnusedDataFor: 120,
      transformResponse: (response: EntrepriseOverview) => response.active_subscription || null,
    }),

    // ==========================================================================
    // MUTATIONS - PROFIL ENTREPRISE
    // ==========================================================================

    // Créer le profil entreprise
    createEntrepriseProfile: builder.mutation<
      EntrepriseProfile,
      EntrepriseProfilePayload
    >({
      query: (data) => ({
        url: '/entreprise/me',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Entreprise'],
    }),

    // Mettre à jour le profil entreprise
    updateEntrepriseProfile: builder.mutation<
      EntrepriseProfile,
      Partial<EntrepriseProfilePayload>
    >({
      query: (data) => ({
        url: '/entreprise/me',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Entreprise'],
    }),

    // ==========================================================================
    // MUTATIONS - ABONNEMENTS
    // ==========================================================================

    // Démarrer un abonnement
    startSubscription: builder.mutation<
      SubscriptionStartResponse,
      SubscriptionStartRequest
    >({
      query: (data) => ({
        url: '/entreprise/me/subscriptions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Subscription', 'Payment', 'Entreprise'],
    }),

    // Confirmer le paiement d'un abonnement
    confirmSubscriptionPayment: builder.mutation<
      SubscriptionStartResponse,
      { abonnementId: string; data: SubscriptionPaymentConfirmRequest }
    >({
      query: ({ abonnementId, data }) => ({
        url: `/entreprise/me/subscriptions/${abonnementId}/confirm-payment`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Subscription', 'Payment', 'Entreprise'],
    }),
  }),
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  // Queries
  useGetEntrepriseOverviewQuery,
  useGetEntrepriseProfileQuery,
  useGetActiveSubscriptionQuery,

  // Mutations - Profil
  useCreateEntrepriseProfileMutation,
  useUpdateEntrepriseProfileMutation,

  // Mutations - Abonnements
  useStartSubscriptionMutation,
  useConfirmSubscriptionPaymentMutation,
} = entrepriseApi;