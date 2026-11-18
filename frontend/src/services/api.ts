// src/services/api.ts

import { sanitizeInput, sanitizeUrl } from '../utils/sanitize';

export function sanitizeApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  // 1. Extraire le message brut
  let rawMessage: string;
  if (error instanceof Error) {
    rawMessage = error.message;
  } else if (typeof error === 'string') {
    rawMessage = error;
  } else if (error && typeof error === 'object') {
    const err = error as any;
    // Si l'objet a un champ 'detail'
    if (err.detail !== undefined) {
      const detail = err.detail;
      if (typeof detail === 'string') {
        rawMessage = detail;
      } else if (typeof detail === 'object' && detail !== null) {
        // On cherche un message dans detail
        if (detail.message) {
          rawMessage = detail.message;
        } else if (detail.msg) {
          rawMessage = detail.msg;
        } else {
          // Sinon on transforme en JSON
          rawMessage = JSON.stringify(detail);
        }
      } else {
        rawMessage = JSON.stringify(detail);
      }
    } else if (err.message) {
      rawMessage = err.message;
    } else if (err.msg) {
      rawMessage = err.msg;
    } else {
      rawMessage = JSON.stringify(err);
    }
  } else {
    rawMessage = fallback;
  }

  if (!rawMessage || rawMessage === '[object Object]') return fallback;

  // 2. Nettoyer les URLs locales
  const withoutLocalUrls = rawMessage
    .replace(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?[^\s)]*/gi, 'le serveur')
    .replace(/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi, 'le serveur');

  // 3. Si le message ressemble à un objet JSON, tenter d'extraire le détail
  const trimmed = withoutLocalUrls.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      // Si parsed a un champ detail
      if (parsed.detail !== undefined) {
        if (typeof parsed.detail === 'string') {
          return parsed.detail;
        } else if (typeof parsed.detail === 'object' && parsed.detail !== null) {
          // Extraire le message de detail
          if (parsed.detail.message) {
            return parsed.detail.message;
          } else if (parsed.detail.msg) {
            return parsed.detail.msg;
          } else if (parsed.detail.field) {
            // Si on a un champ mais pas de message, on peut formater
            return `Le champ "${parsed.detail.field}" est invalide.`;
          } else {
            // Sinon on retourne la chaîne JSON sans les accolades extérieures
            return JSON.stringify(parsed.detail);
          }
        }
      }
      if (parsed.message && typeof parsed.message === 'string') {
        return parsed.message;
      }
      if (parsed.msg && typeof parsed.msg === 'string') {
        return parsed.msg;
      }
      // Si on n'a pas trouvé de champ lisible, on retourne la chaîne brute (sans les accolades)
      return trimmed.slice(1, -1);
    } catch (_) {
      // Le parsing a échoué, on continue
    }
  }

  // 4. Traduire les erreurs Pydantic connues
  const pydanticErrorMap: Record<string, string> = {
    'date_from_datetime_parsing': 'La date de naissance est invalide. Veuillez sélectionner une date valide.',
    'Input should be a valid date': 'La date de naissance est invalide.',
    'value is not a valid date': 'La date de naissance est invalide.',
    'input is too short': 'La date de naissance est incomplète.',
    'field required': 'Ce champ est requis.',
    'value_error.missing': 'Ce champ est requis.',
    'type_error.date': 'La date de naissance est invalide.',
    "La modification de l'email est interdite": "La modification de l'adresse email est interdite.",
    "La modification du nom d'utilisateur est interdite": 'La modification du nom d\'utilisateur est interdite.',
    'Mot de passe actuel incorrect': 'Votre mot de passe actuel est incorrect.',
    'Identifiants incorrects': 'Email ou mot de passe incorrect.',
    'Utilisateur inactif': 'Votre compte est désactivé. Veuillez contacter le support.',
    'Email déjà utilisé': 'Cette adresse email est déjà utilisée.',
    "Nom d'utilisateur déjà pris": 'Ce nom d\'utilisateur est déjà pris.',
  };

  for (const [key, value] of Object.entries(pydanticErrorMap)) {
    if (withoutLocalUrls.includes(key)) {
      return value;
    }
  }

  // 5. Erreurs réseau / timeout
  if (/failed to fetch|networkerror|load failed/i.test(withoutLocalUrls)) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.';
  }

  if (/aborted|timeout/i.test(withoutLocalUrls)) {
    return 'La requête a pris trop de temps. Réessayez dans un instant.';
  }

  // 6. Nettoyage final des préfixes inutiles
  const cleanMessage = withoutLocalUrls
    .replace(/^Error: /i, '')
    .replace(/^Erreur: /i, '')
    .replace(/^Validation error: /i, '')
    .trim();

  return cleanMessage || fallback;
}

let cachedCsrfToken: string | null = null;
let csrfTokenExpiry: number | null = null;

// ✅ URL de l'API Gateway
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8002';

// ✅ Fonction pour détecter si on appelle le Gateway
function isGatewayRequest(baseUrl: string): boolean {
  return baseUrl === API_GATEWAY_URL;
}

// ✅ MODIFICATION : getCsrfToken ne prend plus de paramètre
async function getCsrfToken(): Promise<string> {
  const now = Date.now();
  if (cachedCsrfToken && csrfTokenExpiry && now < csrfTokenExpiry) {
    return cachedCsrfToken as string;
  }

  try {
    // ✅ TOUJOURS appeler l'API Gateway
    const response = await fetch(`${API_GATEWAY_URL}/csrf-token`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }
    const data = await response.json();
    const token = data.csrf_token;
    cachedCsrfToken = token;
    csrfTokenExpiry = now + 5 * 60 * 1000; 
    return token;
  } catch (error) {
    console.warn('Impossible de récupérer le token CSRF', error);
    return '';
  }
}

const ACCESS_TOKEN_KEY = 'kplanner_access_token';

export function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

const AUTH_ROUTES_WITH_EXPECTED_401 = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email-code',
  '/auth/resend-verification-code',
  '/auth/forgot-password',
  '/auth/reset-password',
];

let hasDispatchedSessionExpired = false;

function shouldRedirectOnUnauthorized(endpoint: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!getAccessToken()) return false;
  return !AUTH_ROUTES_WITH_EXPECTED_401.some((route) => endpoint.startsWith(route));
}

function handleUnauthorizedResponse(endpoint: string) {
  if (!shouldRedirectOnUnauthorized(endpoint) || hasDispatchedSessionExpired) return;

  hasDispatchedSessionExpired = true;
  clearAccessToken();
  window.dispatchEvent(new CustomEvent('sessionExpired'));

  window.setTimeout(() => {
    hasDispatchedSessionExpired = false;
  }, 1500);
}

export async function apiFetch(baseUrl: string, endpoint: string, options?: RequestInit) {
  // Sanitize l'endpoint
  const sanitizedEndpoint = sanitizeUrl(endpoint);
  if (!sanitizedEndpoint) {
    throw new Error(`Endpoint API invalide : ${endpoint}`);
  }

  const method = (options?.method || 'GET').toUpperCase();
  const isFormData = options?.body instanceof FormData;

  // ✅ MODIFICATION : CSRF UNIQUEMENT pour les requêtes mutatives VERS LE GATEWAY
  const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && isGatewayRequest(baseUrl);
  const csrfToken = needsCsrf ? await getCsrfToken() : '';

  // Sanitize le body si présent
  let sanitizedBody = options?.body;
  if (sanitizedBody && typeof sanitizedBody === 'string') {
    try {
      const parsed = JSON.parse(sanitizedBody);
      const sanitized = sanitizeInput(parsed);
      sanitizedBody = JSON.stringify(sanitized);
      options = { ...options, body: sanitizedBody };
    } catch {
      // Si ce n'est pas du JSON, ne pas sanitizer
    }
  }
  const headers: HeadersInit = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...options?.headers,
    // The access cookie is host-only on the gateway, while APIs run on
    // separate Render subdomains. Send the token returned at login to each API.
    ...(getAccessToken() && !new Headers(options?.headers).has('Authorization')
      ? { Authorization: `Bearer ${getAccessToken()}` }
      : {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
  };

  const fetchWithTimeout = async () => {
    const controller = new AbortController();
    const timeoutMs = isFormData ? 180000 : 15000;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${baseUrl}${sanitizedEndpoint}`, {
        ...options,
        headers,
        signal: options?.signal || controller.signal,
        credentials: 'include', 
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  let response: Response;
  try {
    response = await fetchWithTimeout();
  } catch (error) {
    if (method === 'GET') {
      try {
        response = await fetchWithTimeout();
      } catch (retryError) {
        throw new Error(sanitizeApiErrorMessage(retryError));
      }
    } else {
      throw new Error(sanitizeApiErrorMessage(error));
    }
  }

  if (response.status === 401) {
    handleUnauthorizedResponse(sanitizedEndpoint);
  }

  // Pour les réponses 204 No Content, retourner null sans parser le JSON
  if (response.status === 204) {
    return null;
  }

  // Lire le contenu de la réponse
  const text = await response.text();

  // Si la réponse est vide, retourner null
  if (!text || text.trim() === '') {
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
    }
    return null;
  }

  // Essayer de parser le JSON
  try {
    const data = JSON.parse(text);

    if (!response.ok) {
      let errorDetail = `Erreur HTTP ${response.status}`;
      
      // Log UNIQUEMENT en développement
      if (import.meta.env.DEV) {
        console.error('Détail erreur API:', data);
      }
      
      if (Array.isArray(data.detail)) {
        // Pydantic validation errors - messages clairs
        errorDetail = data.detail
          .map((item: any) => {
            const field = Array.isArray(item.loc)
              ? item.loc.filter((part: string) => part !== 'body').join('.')
              : '';
            
            let message = typeof item.msg === 'string' ? item.msg : (item.message || JSON.stringify(item));
            
            // Mapping des messages Pydantic
            if (message.includes('date_from_datetime_parsing') || message.includes('input is too short')) {
              message = 'La date de naissance est invalide. Veuillez sélectionner une date valide.';
            } else if (message.includes('Input should be a valid date') || message.includes('value is not a valid date')) {
              message = 'La date de naissance est invalide.';
            }
            
            return field ? `${field}: ${message}` : message;
          })
          .join('\n');
      } else if (data.detail) {
        // Gestion du cas où detail est un objet (par exemple { field: "email", message: "..." })
        if (typeof data.detail === 'object' && data.detail !== null && !Array.isArray(data.detail)) {
          if (data.detail.message) {
            errorDetail = data.detail.message;
          } else if (data.detail.msg) {
            errorDetail = data.detail.msg;
          } else if (data.detail.field) {
            errorDetail = `Le champ "${data.detail.field}" est invalide.`;
          } else {
            errorDetail = JSON.stringify(data.detail);
          }
        } else {
          errorDetail = typeof data.detail === 'string'
            ? data.detail
            : (data.detail.message || data.detail.msg || JSON.stringify(data.detail));
        }
      } else if (data.message || data.msg || data.error) {
        errorDetail = data.message || data.msg || data.error;
        if (typeof errorDetail !== 'string') {
          errorDetail = JSON.stringify(errorDetail);
        }
      } else {
        errorDetail = JSON.stringify(data);
      }
      throw new Error(sanitizeApiErrorMessage(errorDetail));
    }

    return data;
  } catch (parseError) {
    // Si le parsing JSON échoue mais que la réponse est OK, retourner le texte
    if (response.ok) {
      return text;
    }
    const fallbackMessage = text && text.trim() && !/^internal server error$/i.test(text.trim())
      ? text
      : `Erreur HTTP ${response.status}: ${response.statusText || 'réponse invalide du serveur'}`;
    throw new Error(sanitizeApiErrorMessage(fallbackMessage));
  }
}
