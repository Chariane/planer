// src/hooks/compat/useAuthCompat.ts
import { useCallback } from 'react';
import { authService } from '../../services/auth.service';
import {
  useGetMeQuery,
  useGetMyProfilePhotoQuery,
  useGetTwoFAStatusQuery,
  useGetTwoFASetupQuery,
  useRegisterMutation,
  useLoginMutation,
  useVerify2FAMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useResendVerificationCodeMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useUpdateProfileMutation,
  useUpdateProfilePhotoMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
  useGetUserProfileQuery,
  useGetUserProfilePhotoQuery,
} from '../../store/api/authApi';
import type {
  RegisterPayload,
  LoginRequest,
  Verify2FARequest,
  EmailVerificationRequest,
  EmailVerificationResendRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  ProfileUpdatePayload,
  ProfilePhotoUpdate,
  TwoFAEnableRequest,
  TwoFADisableRequest,
} from '../../store/api/authApi';

export const useAuthCompat = () => {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  const {
    data: user,
    isLoading: userLoading,
    refetch: refetchUser,
    error: userError,
  } = useGetMeQuery();

  const {
    data: profilePhoto,
    isLoading: photoLoading,
    refetch: refetchPhoto,
  } = useGetMyProfilePhotoQuery();

  const {
    data: twoFAStatus,
    isLoading: twoFAStatusLoading,
    refetch: refetchTwoFAStatus,
  } = useGetTwoFAStatusQuery();

  const {
    data: twoFASetup,
    isLoading: twoFASetupLoading,
    refetch: refetchTwoFASetup,
  } = useGetTwoFASetupQuery();

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const [registerRTK] = useRegisterMutation();
  const [loginRTK] = useLoginMutation();
  const [verify2FARTK] = useVerify2FAMutation();
  const [logoutRTK] = useLogoutMutation();
  const [verifyEmailRTK] = useVerifyEmailMutation();
  const [resendVerificationRTK] = useResendVerificationCodeMutation();
  const [forgotPasswordRTK] = useForgotPasswordMutation();
  const [resetPasswordRTK] = useResetPasswordMutation();
  const [changePasswordRTK] = useChangePasswordMutation();
  const [updateProfileRTK] = useUpdateProfileMutation();
  const [updateProfilePhotoRTK] = useUpdateProfilePhotoMutation();
  const [enable2FARTK] = useEnable2FAMutation();
  const [disable2FARTK] = useDisable2FAMutation();

  // ==========================================================================
  // FONCTIONS AVEC FALLBACK
  // ==========================================================================

  const getMe = useCallback(async () => {
    try {
      const result = await refetchUser();
      return result.data;
    } catch (error) {
      console.warn('RTK Query fallback -> authService.getMe');
      return await authService.getMe();
    }
  }, [refetchUser]);

  const getMyProfilePhoto = useCallback(async () => {
    try {
      const result = await refetchPhoto();
      return result.data;
    } catch (error) {
      console.warn('RTK Query fallback -> authService.getMyProfilePhoto');
      return await authService.getMyProfilePhoto();
    }
  }, [refetchPhoto]);

  const getUserProfile = useCallback(
    async (userId: string) => {
      try {
        const result = await refetchUser();
        // Note: getUserProfile est une query séparée, on utilise le hook dédié
        const { useGetUserProfileQuery } = await import('../../store/api/authApi');
        const { data } = useGetUserProfileQuery(userId);
        return data;
      } catch (error) {
        console.warn('RTK Query fallback -> authService.getUserProfile');
        return await authService.getUserProfile(userId);
      }
    },
    [refetchUser]
  );

  const register = useCallback(
    async (data: RegisterPayload) => {
      try {
        return await registerRTK(data).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.register');
        return await authService.register(data as any);
      }
    },
    [registerRTK]
  );

  const login = useCallback(
    async (identifier: string, password: string) => {
      try {
        return await loginRTK({ identifier, password }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.login');
        return await authService.login(identifier, password);
      }
    },
    [loginRTK]
  );

  const verify2FA = useCallback(
    async (challenge_token: string, code: string) => {
      try {
        return await verify2FARTK({ challenge_token, code }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.verify2FA');
        return await authService.verify2FA(challenge_token, code);
      }
    },
    [verify2FARTK]
  );

  const logout = useCallback(async () => {
    try {
      await logoutRTK().unwrap();
    } catch (error) {
      console.warn('RTK Query fallback -> authService.logout');
      await authService.logout();
    }
  }, [logoutRTK]);

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      try {
        return await verifyEmailRTK({ email, code }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.verifyEmail');
        return await authService.verifyEmail(email, code);
      }
    },
    [verifyEmailRTK]
  );

  const resendVerificationCode = useCallback(
    async (email: string) => {
      try {
        return await resendVerificationRTK({ email }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.resendVerificationCode');
        return await authService.resendVerificationCode(email);
      }
    },
    [resendVerificationRTK]
  );

  const forgotPassword = useCallback(
    async (email: string) => {
      try {
        return await forgotPasswordRTK({ email }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.forgotPassword');
        return await authService.forgotPassword(email);
      }
    },
    [forgotPasswordRTK]
  );

  const resetPassword = useCallback(
    async (email: string, code: string, new_password: string) => {
      try {
        return await resetPasswordRTK({ email, code, new_password }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.resetPassword');
        return await authService.resetPassword(email, code, new_password);
      }
    },
    [resetPasswordRTK]
  );

  const changePassword = useCallback(
    async (current_password: string, new_password: string) => {
      try {
        return await changePasswordRTK({ current_password, new_password }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.changePassword');
        return await authService.changePassword(current_password, new_password);
      }
    },
    [changePasswordRTK]
  );

  const updateProfile = useCallback(
    async (data: ProfileUpdatePayload) => {
      try {
        return await updateProfileRTK(data).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.updateMe');
        return await authService.updateMe(data);
      }
    },
    [updateProfileRTK]
  );

  const updateProfilePhoto = useCallback(
    async (photo_base64: string | null) => {
      try {
        return await updateProfilePhotoRTK({ photo_base64 }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.updateMyProfilePhoto');
        return await authService.updateMyProfilePhoto(photo_base64);
      }
    },
    [updateProfilePhotoRTK]
  );

  const setup2FA = useCallback(async () => {
    try {
      const result = await refetchTwoFASetup();
      return result.data;
    } catch (error) {
      console.warn('RTK Query fallback -> authService.setup2FA');
      return await authService.setup2FA();
    }
  }, [refetchTwoFASetup]);

  const enable2FA = useCallback(
    async (code: string) => {
      try {
        return await enable2FARTK({ code }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.enable2FA');
        return await authService.enable2FA(code);
      }
    },
    [enable2FARTK]
  );

  const disable2FA = useCallback(
    async (current_password: string) => {
      try {
        return await disable2FARTK({ current_password }).unwrap();
      } catch (error) {
        console.warn('RTK Query fallback -> authService.disable2FA');
        return await authService.disable2FA(current_password);
      }
    },
    [disable2FARTK]
  );

  // ==========================================================================
  // REFETCH
  // ==========================================================================

  const refetchAll = useCallback(() => {
    refetchUser();
    refetchPhoto();
    refetchTwoFAStatus();
    refetchTwoFASetup();
  }, [refetchUser, refetchPhoto, refetchTwoFAStatus, refetchTwoFASetup]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Données
    user,
    profilePhoto,
    twoFAStatus,
    twoFASetup,

    // États de chargement
    isLoading: userLoading || photoLoading || twoFAStatusLoading || twoFASetupLoading,

    // Erreurs
    errors: {
      user: userError,
    },

    // Fonctions avec fallback
    getMe,
    getMyProfilePhoto,
    getUserProfile,
    register,
    login,
    verify2FA,
    logout,
    verifyEmail,
    resendVerificationCode,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    updateProfilePhoto,
    setup2FA,
    enable2FA,
    disable2FA,

    // Rafraîchissement
    refetch: refetchAll,
    refetchUser,
    refetchPhoto,
    refetchTwoFAStatus,
    refetchTwoFASetup,

    // Helpers
    isAuthenticated: !!user,
    isVerified: user?.is_utilisateur_verifie || false,
    has2FA: user?.is_2fa_enabled || false,

    // Service legacy
    legacy: authService,
  };
};