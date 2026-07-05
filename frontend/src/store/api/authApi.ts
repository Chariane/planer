// src/store/api/authApi.ts
import { baseApi } from './baseApi';

// ============================================================================
// TYPES - Compatibles avec vos services existants
// ============================================================================

export interface User {
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
  photo?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  nom?: string;
  prenoms?: string;
  telephone?: string;
  invitation_token?: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
  workspace?: {
    id: string;
    nom: string;
    description?: string;
  };
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  requires_2fa: boolean;
  challenge_token?: string;
  access_token?: string;
  token_type?: string;
  user?: User;
}

export interface Verify2FARequest {
  challenge_token: string;
  code: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface EmailVerificationRequest {
  email: string;
  code: string;
}

export interface EmailVerificationResendRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ProfileUpdatePayload {
  nom?: string;
  prenoms?: string;
  telephone?: string;
  biographie?: string;
  genre?: string;
  date_nais?: string | null;
  pays?: string;
  ville?: string;
}

export interface ProfilePhotoResponse {
  photo_base64: string | null;
  mime_type?: string | null;
}

export interface ProfilePhotoUpdate {
  photo_base64: string | null;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  email?: string | null;
  nom?: string | null;
  prenoms?: string | null;
  telephone?: string | null;
  biographie?: string | null;
  genre?: string | null;
  pays?: string | null;
  ville?: string | null;
  photo_base64?: string | null;
}

export interface TwoFASetupResponse {
  google_authenticator_secret?: string;
  google_authenticator_otpauth_url?: string;
  message?: string;
}

export interface TwoFAStatusResponse {
  message: string;
  setup_required: boolean;
  is_2fa_enabled: boolean;
  google_auth_configured_at?: string | null;
}

export interface TwoFAEnableRequest {
  code: string;
}

export interface TwoFADisableRequest {
  current_password: string;
}

export interface MessageResponse {
  message: string;
}

// ============================================================================
// API RTK Query
// ============================================================================

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================================================
    // QUERIES - PROFIL
    // ==========================================================================

    // Récupérer l'utilisateur connecté
    getMe: builder.query<User, void>({
      query: () => ({
        url: '/auth/me',
      }),
      providesTags: ['User', 'UserData'], // ✅ AJOUT
      keepUnusedDataFor: 300,
    }),

    // Récupérer la photo de profil de l'utilisateur connecté
    getMyProfilePhoto: builder.query<ProfilePhotoResponse, void>({
      query: () => ({
        url: '/auth/me/photo',
      }),
      providesTags: ['UserPhoto', 'UserData'], // ✅ AJOUT
      keepUnusedDataFor: 300,
    }),

    // Récupérer la photo de profil d'un autre utilisateur
    getUserProfilePhoto: builder.query<ProfilePhotoResponse, string>({
      query: (userId) => ({
        url: `/auth/users/${userId}/photo`,
      }),
      keepUnusedDataFor: 300,
    }),

    // Récupérer le profil public d'un utilisateur
    getUserProfile: builder.query<PublicUserProfile, string>({
      query: (userId) => ({
        url: `/auth/users/${userId}/profile`,
      }),
      keepUnusedDataFor: 300,
    }),

    // Récupérer le statut 2FA
    getTwoFAStatus: builder.query<TwoFAStatusResponse, void>({
      query: () => ({
        url: '/auth/2fa/status',
      }),
      providesTags: ['TwoFA'],
      keepUnusedDataFor: 60,
    }),

    // Récupérer la configuration 2FA (setup)
    getTwoFASetup: builder.query<TwoFASetupResponse, void>({
      query: () => ({
        url: '/auth/2fa/setup',
      }),
      keepUnusedDataFor: 300,
    }),

    // ==========================================================================
    // MUTATIONS - AUTHENTIFICATION
    // ==========================================================================

    // Inscription
    register: builder.mutation<RegisterResponse, RegisterPayload>({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'UserData'], // ✅ AJOUT
    }),

    // Connexion
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: ({ identifier, password }) => ({
        url: '/auth/login',
        method: 'POST',
        body: { identifier, password },
      }),
      invalidatesTags: ['User', 'UserData'], // ✅ AJOUT
    }),

    // Vérification 2FA
    verify2FA: builder.mutation<TokenResponse, Verify2FARequest>({
      query: ({ challenge_token, code }) => ({
        url: '/auth/verify-2fa',
        method: 'POST',
        body: { challenge_token, code },
      }),
      invalidatesTags: ['User', 'TwoFA', 'UserData'], // ✅ AJOUT
    }),

    // Déconnexion
    logout: builder.mutation<MessageResponse, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'UserData'], // ✅ AJOUT
    }),

    // ==========================================================================
    // MUTATIONS - EMAIL
    // ==========================================================================

    // Vérifier le code email
    verifyEmail: builder.mutation<MessageResponse, EmailVerificationRequest>({
      query: ({ email, code }) => ({
        url: '/auth/verify-email-code',
        method: 'POST',
        body: { email, code },
      }),
      invalidatesTags: ['User', 'UserData'], // ✅ AJOUT
    }),

    // Renvoyer le code de vérification
    resendVerificationCode: builder.mutation<MessageResponse, EmailVerificationResendRequest>({
      query: ({ email }) => ({
        url: '/auth/resend-verification-code',
        method: 'POST',
        body: { email },
      }),
    }),

    // ==========================================================================
    // MUTATIONS - MOT DE PASSE
    // ==========================================================================

    // Mot de passe oublié
    forgotPassword: builder.mutation<MessageResponse, ForgotPasswordRequest>({
      query: ({ email }) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),

    // Réinitialiser le mot de passe
    resetPassword: builder.mutation<MessageResponse, ResetPasswordRequest>({
      query: ({ email, code, new_password }) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: { email, code, new_password },
      }),
    }),

    // Changer le mot de passe
    changePassword: builder.mutation<MessageResponse, ChangePasswordRequest>({
      query: ({ current_password, new_password }) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: { current_password, new_password },
      }),
      invalidatesTags: ['User', 'UserData'], // ✅ AJOUT
    }),

    // ==========================================================================
    // MUTATIONS - PROFIL
    // ==========================================================================

    // Mettre à jour le profil
    updateProfile: builder.mutation<User, ProfileUpdatePayload>({
      query: (data) => {
        // Filtrer les champs vides
        const cleanedData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          if (value !== '' && value !== null && value !== undefined) {
            cleanedData[key] = value;
          }
        }
        return {
          url: '/auth/me',
          method: 'PUT',
          body: cleanedData,
        };
      },
      invalidatesTags: ['User', 'UserData'], // ✅ AJOUT
    }),

    // Mettre à jour la photo de profil
    updateProfilePhoto: builder.mutation<ProfilePhotoResponse, ProfilePhotoUpdate>({
      query: ({ photo_base64 }) => ({
        url: '/auth/me/photo',
        method: 'PUT',
        body: { photo_base64 },
      }),
      invalidatesTags: ['User', 'UserPhoto', 'UserData'], // ✅ AJOUT
    }),

    // ==========================================================================
    // MUTATIONS - 2FA
    // ==========================================================================

    // Activer 2FA
    enable2FA: builder.mutation<TwoFAStatusResponse, TwoFAEnableRequest>({
      query: ({ code }) => ({
        url: '/auth/2fa/enable',
        method: 'POST',
        body: { code },
      }),
      invalidatesTags: ['User', 'TwoFA', 'UserData'], // ✅ AJOUT
    }),

    // Désactiver 2FA
    disable2FA: builder.mutation<TwoFAStatusResponse, TwoFADisableRequest>({
      query: ({ current_password }) => ({
        url: '/auth/2fa/disable',
        method: 'POST',
        body: { current_password },
      }),
      invalidatesTags: ['User', 'TwoFA', 'UserData'], // ✅ AJOUT
    }),
  }),
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  // Queries
  useGetMeQuery,
  useGetMyProfilePhotoQuery,
  useGetUserProfilePhotoQuery,
  useGetUserProfileQuery,
  useGetTwoFAStatusQuery,
  useGetTwoFASetupQuery,

  // Mutations - Authentification
  useRegisterMutation,
  useLoginMutation,
  useVerify2FAMutation,
  useLogoutMutation,

  // Mutations - Email
  useVerifyEmailMutation,
  useResendVerificationCodeMutation,

  // Mutations - Mot de passe
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,

  // Mutations - Profil
  useUpdateProfileMutation,
  useUpdateProfilePhotoMutation,

  // Mutations - 2FA
  useEnable2FAMutation,
  useDisable2FAMutation,
} = authApi;