// frontend/src/services/api.ts
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
      response = await fetchWithTimeout();
    } else {
      throw error;
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
        errorDetail = data.detail
          .map((item: unknown) => {
            const detailItem = item as { loc?: unknown; msg?: unknown };
            const field = Array.isArray(detailItem.loc)
              ? detailItem.loc.filter((part: unknown) => part !== 'body').join('.')
              : '';
            const message = typeof detailItem.msg === 'string' ? detailItem.msg : JSON.stringify(detailItem.msg || detailItem);
            return field ? `${field}: ${message}` : message;
          })
          .join('\n');
      } else if (data.detail) {
        errorDetail = typeof data.detail === 'string'
          ? data.detail
          : JSON.stringify(data.detail);
      } else {
        errorDetail = JSON.stringify(data);
      }
      throw new Error(errorDetail);
    }

    return data;
  } catch (parseError) {
    // Si le parsing JSON échoue mais que la réponse est OK, retourner le texte
    if (response.ok) {
      return text;
    }
    throw parseError;
  }
}
