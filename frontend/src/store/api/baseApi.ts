// src/store/api/baseApi.ts - VERSION CORRIGÉE
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { apiFetch } from '../../services/api';

// Déterminer l'URL de base selon l'endpoint
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

// ✅ BaseQuery qui réutilise VOTRE apiFetch
const baseQuery: BaseQueryFn<{
  url: string;
  method?: string;
  body?: unknown;
  params?: Record<string, unknown>;
}, unknown, unknown> = async ({ url, method, body, params }) => {
  try {
    let fullUrl = url;
    
    // ✅ Construction manuelle des paramètres
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
    
    // ✅ Construction des options pour apiFetch
    const options: RequestInit = {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }

    // ✅ Utilisation de VOTRE apiFetch
    const result = await apiFetch(baseUrl, fullUrl, options);

    return { data: result };
  } catch (error) {
    console.error('[RTK Query] Erreur:', error);
    return { 
      error: { 
        status: 500, 
        data: error,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      } 
    };
  }
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'User',
    'Workspace',
    'Espace',
    'Liste',
    'Tache',
    'Canevas',
    'Section',
    'Checklist',
    'Notification',
    'Member',
    'Invitation',
    'Navigation',
    'Dashboard',
  ],
  endpoints: () => ({}),
});