import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, apiFetch } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  nom?: string;
  prenoms?: string;
  is_2fa_enabled?: boolean;
  is_utilisateur_verifie?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ requires2fa: boolean; challengeToken?: string }>;
  verify2FA: (challengeToken: string, code: string) => Promise<void>;
  register: (data: any) => Promise<{ email: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setup2FA: () => Promise<any>;
  enable2FA: (code: string) => Promise<void>;
  disable2FA: (currentPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const userData = await authAPI.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Erreur lors du chargement de l’utilisateur', error);
          localStorage.removeItem('access_token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const register = async (data: any) => {
    const response = await authAPI.register(data);
    // On retourne l'email pour la redirection
    return { email: data.email };
  };

  const verifyEmail = async (email: string, code: string) => {
    await authAPI.verifyEmail(email, code);
    // Après vérification, on peut rediriger vers login
  };

  const resendVerificationCode = async (email: string) => {
    await authAPI.resendVerificationCode(email);
  };

  const login = async (identifier: string, password: string) => {
    const response = await authAPI.login(identifier, password);
    if (response.requires_2fa) {
      return { requires2fa: true, challengeToken: response.challenge_token };
    }
    localStorage.setItem('access_token', response.access_token);
    setToken(response.access_token);
    setUser(response.user);
    return { requires2fa: false };
  };

  const verify2FA = async (challengeToken: string, code: string) => {
    const response = await authAPI.verify2FA(challengeToken, code);
    localStorage.setItem('access_token', response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  };

  const forgotPassword = async (email: string) => {
    await authAPI.forgotPassword(email);
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    await authAPI.resetPassword(email, code, newPassword);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authAPI.changePassword(currentPassword, newPassword);
  };

  const setup2FA = async () => {
    const response = await apiFetch('/auth/2fa/setup');
    return response;
  };

  const enable2FA = async (code: string) => {
    await apiFetch('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) });
    const userData = await authAPI.getMe();
    setUser(userData);
  };

  const disable2FA = async (currentPassword: string) => {
    await apiFetch('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ current_password: currentPassword }) });
    const userData = await authAPI.getMe();
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      verify2FA,
      register,
      verifyEmail,
      resendVerificationCode,
      forgotPassword,
      resetPassword,
      changePassword,
      setup2FA,
      enable2FA,
      disable2FA,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};