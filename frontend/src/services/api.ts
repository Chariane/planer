// frontend/src/services/api.ts
export async function apiFetch(baseUrl: string, endpoint: string, options?: RequestInit) {
  const token = localStorage.getItem('access_token');
  const isFormData = options?.body instanceof FormData;
  const headers: HeadersInit = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

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
          .map((item: any) => {
            const field = Array.isArray(item.loc) ? item.loc.filter((part: any) => part !== 'body').join('.') : '';
            return field ? `${field}: ${item.msg}` : item.msg;
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
