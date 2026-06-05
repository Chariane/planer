import { apiFetch } from './api';
import type { SubscriptionPlan } from './plan.service';

const WORKSPACE_BASE_URL = import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:8003';

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

export const entrepriseService = {
  getOverview: () => apiFetch(WORKSPACE_BASE_URL, '/entreprise/me') as Promise<EntrepriseOverview>,
  createProfile: (data: EntrepriseProfilePayload) =>
    apiFetch(WORKSPACE_BASE_URL, '/entreprise/me', { method: 'POST', body: JSON.stringify(data) }) as Promise<EntrepriseProfile>,
  updateProfile: (data: Partial<EntrepriseProfilePayload>) =>
    apiFetch(WORKSPACE_BASE_URL, '/entreprise/me', { method: 'PUT', body: JSON.stringify(data) }) as Promise<EntrepriseProfile>,
  startSubscription: (planCode: SubscriptionPlan['code'], autoRenouvellement = false) =>
    apiFetch(WORKSPACE_BASE_URL, '/entreprise/me/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ plan_code: planCode, auto_renouvellement: autoRenouvellement }),
    }) as Promise<SubscriptionStartResponse>,
  confirmPayment: (abonnementId: string, data: { mode_paiement?: string; reference_transaction?: string }) =>
    apiFetch(WORKSPACE_BASE_URL, `/entreprise/me/subscriptions/${abonnementId}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<SubscriptionStartResponse>,
};
