// src/services/api.ts

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

export async function apiFetch(baseUrl: string, endpoint: string, options?: RequestInit) {
  const token = localStorage.getItem('access_token');
  const method = (options?.method || 'GET').toUpperCase();
  const isFormData = options?.body instanceof FormData;
  const headers: HeadersInit = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };

  const fetchWithTimeout = async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    try {
      return await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: options?.signal || controller.signal,
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
      console.error('📡 Détail erreur API:', data);
      
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