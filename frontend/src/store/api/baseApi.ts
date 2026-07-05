// src/store/api/baseApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { apiFetch } from '../../services/api';

// ============================================================================
// REFRESH TOKEN - GESTION DE FILE D'ATTENTE
// ============================================================================

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const refreshToken = async (): Promise<string | null> => {
  try {
    // Appel au backend pour rafraîchir le token
    // Le refresh token est automatiquement envoyé via le cookie httpOnly
    const response = await apiFetch(
      import.meta.env.VITE_AUTH_URL || 'http://localhost:8002',
      '/auth/refresh',
      { 
        method: 'POST', 
        credentials: 'include' // ✅ httpOnly cookie
      }
    );
    const newToken = response?.access_token;
    if (newToken) {
      localStorage.setItem('access_token', newToken);
      return newToken;
    }
    return null;
  } catch (error) {
    console.error('[RTK Query] Refresh token failed:', error);
    return null;
  }
};

// ============================================================================
// DÉTERMINATION DE L'URL DE BASE
// ============================================================================

const getBaseUrlFromEndpoint = (url: string): string => {
  if (url.startsWith('/auth')) {
    return import.meta.env.VITE_AUTH_URL || 'http://localhost:8002';
  }
  if (url.startsWith('/workspaces') || url.startsWith('/admin/workspaces')) {
    return import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:8003';
  }
  if (url.startsWith('/espaces') || url.startsWith('/admin/espaces')) {
    return import.meta.env.VITE_ESPACE_URL || 'http://localhost:8001';
  }
  if (url.startsWith('/listes') || url.startsWith('/dashboard') || url.startsWith('/plans')) {
    return import.meta.env.VITE_LISTE_TACHE_URL || 'http://localhost:8004';
  }
  if (url.startsWith('/notifications')) {
    return import.meta.env.VITE_NOTIFICATION_URL || 'http://localhost:8005';
  }
  if (url.startsWith('/entreprise')) {
    return import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:8003';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

// ============================================================================
// BASE QUERY AVEC GESTION DU REFRESH
// ============================================================================

const baseQuery: BaseQueryFn = async ({ url, method, body, params }, api, extraOptions) => {
  const makeRequest = async (token?: string) => {
    let fullUrl = url;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
      }
    }

    const baseUrl = getBaseUrlFromEndpoint(url);
    const options: RequestInit = {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include', // ✅ Pour les cookies httpOnly
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const result = await apiFetch(baseUrl, fullUrl, options);
    return result;
  };

  try {
    // 1. Essayer avec le token actuel
    const token = localStorage.getItem('access_token') || undefined;
    let result = await makeRequest(token);

    // 2. Si 401, tenter le refresh
    if (result?.status === 401) {
      // Si déjà en cours de refresh, mettre la requête en queue
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken: string) => {
            makeRequest(newToken)
              .then((res) => resolve({ data: res }))
              .catch((err) => resolve({ error: { status: 500, data: err } }));
          });
        });
      }

      // Démarrer le refresh
      isRefreshing = true;
      try {
        const newToken = await refreshToken();
        if (newToken) {
          isRefreshing = false;
          onRefreshed(newToken);
          // Réessayer la requête avec le nouveau token
          const retryResult = await makeRequest(newToken);
          return { data: retryResult };
        } else {
          // Refresh échoué -> logout
          isRefreshing = false;
          localStorage.removeItem('access_token');
          window.dispatchEvent(new CustomEvent('unauthorized'));
          return { error: { status: 401, data: 'Session expirée. Veuillez vous reconnecter.' } };
        }
      } catch (refreshError) {
        isRefreshing = false;
        localStorage.removeItem('access_token');
        window.dispatchEvent(new CustomEvent('unauthorized'));
        return { error: { status: 401, data: 'Session expirée. Veuillez vous reconnecter.' } };
      }
    }

    return { data: result };
  } catch (error) {
    console.error('[RTK Query] Erreur:', error);
    return {
      error: {
        status: 500,
        data: error,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      },
    };
  }
};

// ============================================================================
// CRÉATION DE L'API DE BASE
// ============================================================================

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    // Authentification & Utilisateur
    'User',
    'UserPhoto',
    'TwoFA',

    // Workspace
    'Workspace',
    'Navigation',
    'Member',
    'Invitation',

    // Espace
    'Espace',

    // Liste
    'Liste',

    // Tâche
    'Tache',

    // Canevas
    'Canevas',
    'Section',
    'Checklist',

    // Notification
    'Notification',
    'UnreadCount',

    // Absence
    'Absence',
    'Calendar',
    'Availability',
    'Conflict',
    'Impact',

    // Entreprise & Abonnements
    'Entreprise',
    'Subscription',
    'Payment',
    'Plan',
    'PlanUsage',

    // Fichiers & Rapports
    'File',
    'Report',

    // Messagerie (K-Chat)
    'ChatGroup',
    'ChatMember',
    'ChatMessage',
    'ChatPrivate',
    'ChatUnread',

    // Dashboard
    'Dashboard',
  ],
  endpoints: () => ({}),
});