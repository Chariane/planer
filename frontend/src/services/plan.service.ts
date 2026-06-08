import { apiFetch } from './api';

const WORKSPACE_BASE_URL = import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:8003';

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

export const planService = {
  getPlans: () => apiFetch(WORKSPACE_BASE_URL, '/plans') as Promise<SubscriptionPlan[]>,
  getPlan: (code: string) => apiFetch(WORKSPACE_BASE_URL, `/plans/${code}`) as Promise<SubscriptionPlan>,
  getMyUsage: () => apiFetch(WORKSPACE_BASE_URL, '/plans/me/usage') as Promise<PlanUsageOverview>,
};
