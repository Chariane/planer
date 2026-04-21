// frontend/src/services/api.ts
export async function apiFetch(baseUrl: string, endpoint: string, options?: RequestInit) {
  const token = localStorage.getItem('access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    let errorDetail = `Erreur HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      console.error('📡 Détail erreur API:', errorData);
      if (errorData.detail) {
        errorDetail = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : JSON.stringify(errorData.detail);
      } else {
        errorDetail = JSON.stringify(errorData);
      }
    } catch (e) {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }
  return response.json();
}