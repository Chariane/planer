import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';

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
  updateProfile: (data: { nom?: string; prenoms?: string; email?: string; username?: string }) => Promise<void>;
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
          const userData = await authService.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Erreur lors du chargement de l’utilisateur', error);
          localStorage.removeItem('access_token');
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const register = async (data: any) => {
    await authService.register(data);
    return { email: data.email };
  };

  const verifyEmail = async (email: string, code: string) => {
    await authService.verifyEmail(email, code);
  };

  const resendVerificationCode = async (email: string) => {
    await authService.resendVerificationCode(email);
  };

  const login = async (identifier: string, password: string) => {
    const response = await authService.login(identifier, password);
    if (response.requires_2fa) {
      return { requires2fa: true, challengeToken: response.challenge_token };
    }
    localStorage.setItem('access_token', response.access_token);
    setToken(response.access_token);
    setUser(response.user);
    return { requires2fa: false };
  };

  const verify2FA = async (challengeToken: string, code: string) => {
    const response = await authService.verify2FA(challengeToken, code);
    localStorage.setItem('access_token', response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  };

  const forgotPassword = async (email: string) => {
    await authService.forgotPassword(email);
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    await authService.resetPassword(email, code, newPassword);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword);
  };

  const updateProfile = async (data: { nom?: string; prenoms?: string; email?: string; username?: string }) => {
    const updatedUser = await authService.updateMe(data);
    setUser(updatedUser);
  };

  const setup2FA = async () => {
    const response = await authService.setup2FA();
    return response;
  };

  const enable2FA = async (code: string) => {
    await authService.enable2FA(code);
    const userData = await authService.getMe();
    setUser(userData);
  };

  const disable2FA = async (currentPassword: string) => {
    console.log('Tentative de désactivation 2FA avec mot de passe:', currentPassword);
    try {
      await authService.disable2FA(currentPassword);
      console.log('Appel API réussi');
      const userData = await authService.getMe();
      console.log('Nouveau user data:', userData);
      setUser(userData);
      console.log('2FA désactivée avec succès');
    } catch (error) {
      console.error('Erreur lors de la désactivation 2FA:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
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
      updateProfile,
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
