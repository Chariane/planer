const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

export async function apiFetch(endpoint: string, options?: RequestInit) {
  const token = localStorage.getItem('access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Erreur ${response.status}`);
  }
  return response.json();
}

export const authAPI = {
  register: (data: any) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (identifier: string, password: string) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  verifyEmail: (email: string, code: string) => apiFetch('/auth/verify-email-code', { method: 'POST', body: JSON.stringify({ email, code }) }),
  resendVerificationCode: (email: string) => apiFetch('/auth/resend-verification-code', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email: string) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, code: string, new_password: string) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, new_password }) }),
  changePassword: (current_password: string, new_password: string) => apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),
  getMe: () => apiFetch('/auth/me'),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  verify2FA: (challenge_token: string, code: string) => apiFetch('/auth/verify-2fa', { method: 'POST', body: JSON.stringify({ challenge_token, code }) }),
};
