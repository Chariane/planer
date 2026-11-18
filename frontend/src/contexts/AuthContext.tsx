// src/contexts/AuthContext.tsx
import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authService } from '../services/auth.service';
import { baseApi, clearCacheOnLogout } from '../store/api/baseApi';
import { clearAccessToken, getAccessToken } from '../services/api';
import type { ProfileUpdatePayload, RegisterPayload } from '../services/auth.service';

interface User {
  id: string;
  username: string;
  email: string;
  nom?: string;
  prenoms?: string;
  telephone?: string;
  biographie?: string;
  genre?: string;
  date_nais?: string;
  pays?: string;
  ville?: string;
  is_2fa_enabled?: boolean;
  is_utilisateur_verifie?: boolean;
  is_entreprise?: boolean;
}

interface TwoFASetupPayload {
  google_authenticator_secret?: string;
  google_authenticator_otpauth_url?: string;
  [key: string]: unknown;
}

interface ProfilePhotoPayload {
  photoBase64: string;
  mimeType?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<{ requires2fa: boolean; challengeToken?: string }>;
  verify2FA: (challengeToken: string, code: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<{ email: string; emailSent: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (data: ProfileUpdatePayload) => Promise<void>;
  getProfilePhoto: () => Promise<ProfilePhotoPayload | null>;
  updateProfilePhoto: (photoBase64: string | null) => Promise<string | null>;
  setup2FA: () => Promise<TwoFASetupPayload>;
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
  const dispatch = useDispatch();

  const isAuthenticated = !!user;

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Existing sessions only have an HttpOnly cookie scoped to the gateway.
        // Exchange its refresh cookie for the Bearer token used by sibling APIs.
        if (!getAccessToken()) {
          try {
            await authService.refreshToken();
          } catch {
            // No refresh session: getMe below will resolve to signed-out state.
          }
        }
        const userData = await authService.getMe();
        setUser(userData);
        setToken(getAccessToken());
      } catch (error: any) {
        // 401 au démarrage est normal si l'utilisateur n'est pas connecté
        if (error?.status === 401 || (error instanceof Error && error.message.includes('401'))) {
          console.info('Utilisateur non authentifié au démarrage');
        } else {
          console.error('Erreur lors du chargement de l\'utilisateur', error);
        }
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      clearAccessToken();
      setUser(null);
      setToken(null);
    };

    window.addEventListener('sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('sessionExpired', handleSessionExpired);
  }, []);

  const register = async (data: RegisterPayload) => {
    const response = await authService.register(data) as { email_sent?: boolean };
    return { email: data.email, emailSent: response.email_sent === true };
  };

  const verifyEmail = async (email: string, code: string) => {
    await authService.verifyEmail(email, code);
  };

  const resendVerificationCode = async (email: string) => {
    const response = await authService.resendVerificationCode(email) as { email_sent?: boolean };
    return response.email_sent === true;
  };

  const login = async (identifier: string, password: string) => {
    const response = await authService.login(identifier, password);
    if (response.requires_2fa) {
      return { requires2fa: true, challengeToken: response.challenge_token };
    }

    if (!response.user) {
      throw new Error('Réponse de connexion invalide.');
    }
    
    clearCacheOnLogout({ dispatch });
    
    setUser(response.user);
    setToken(getAccessToken());
    return { requires2fa: false };
  };

  const verify2FA = async (challengeToken: string, code: string) => {
    const response = await authService.verify2FA(challengeToken, code);

    if (!response.user) {
      throw new Error('Réponse de vérification 2FA invalide.');
    }
    
    clearCacheOnLogout({ dispatch });
    
    setUser(response.user);
    setToken(getAccessToken());
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

  const updateProfile = async (data: ProfileUpdatePayload) => {
    const updatedUser = await authService.updateMe(data);
    setUser(updatedUser);
  };

  const getProfilePhoto = useCallback(async () => {
    const response = await authService.getMyProfilePhoto();
    return response?.photo_base64
      ? { photoBase64: response.photo_base64, mimeType: response.mime_type || null }
      : null;
  }, []);

  const updateProfilePhoto = useCallback(async (photoBase64: string | null) => {
    const response = await authService.updateMyProfilePhoto(photoBase64);
    return response?.photo_base64 || null;
  }, []);

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
    try {
      await authService.disable2FA(currentPassword);
      const userData = await authService.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Erreur lors de la désactivation 2FA:', error);
      throw error;
    }
  };

  // Déconnexion volontaire - message "À bientôt !"
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
    
    clearCacheOnLogout({ dispatch });
    setToken(null);
    setUser(null);
    
    // Redirection avec paramètre logout pour message personnalisé
    navigate('/login?logout=true');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated,
      login,
      verify2FA,
      register,
      verifyEmail,
      resendVerificationCode,
      forgotPassword,
      resetPassword,
      changePassword,
      updateProfile,
      getProfilePhoto,
      updateProfilePhoto,
      setup2FA,
      enable2FA,
      disable2FA,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
