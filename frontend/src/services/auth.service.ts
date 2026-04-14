// frontend/src/services/auth.service.ts
import { apiFetch } from './api';

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8002';

export const authService = {
  register: (data: any) => apiFetch(AUTH_BASE_URL, '/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (identifier: string, password: string) => apiFetch(AUTH_BASE_URL, '/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  verifyEmail: (email: string, code: string) => apiFetch(AUTH_BASE_URL, '/auth/verify-email-code', { method: 'POST', body: JSON.stringify({ email, code }) }),
  resendVerificationCode: (email: string) => apiFetch(AUTH_BASE_URL, '/auth/resend-verification-code', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email: string) => apiFetch(AUTH_BASE_URL, '/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, code: string, new_password: string) => apiFetch(AUTH_BASE_URL, '/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, new_password }) }),
  changePassword: (current_password: string, new_password: string) => apiFetch(AUTH_BASE_URL, '/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),
  getMe: () => apiFetch(AUTH_BASE_URL, '/auth/me'),
  updateMe: (data: { nom?: string; prenoms?: string; email?: string; username?: string }) => apiFetch(AUTH_BASE_URL, '/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  logout: () => apiFetch(AUTH_BASE_URL, '/auth/logout', { method: 'POST' }),
  verify2FA: (challenge_token: string, code: string) => apiFetch(AUTH_BASE_URL, '/auth/verify-2fa', { method: 'POST', body: JSON.stringify({ challenge_token, code }) }),
  setup2FA: () => apiFetch(AUTH_BASE_URL, '/auth/2fa/setup'),
  enable2FA: (code: string) => apiFetch(AUTH_BASE_URL, '/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) }),
  disable2FA: (current_password: string) => apiFetch(AUTH_BASE_URL, '/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ current_password }) }),
};