// src/store/slices/authSlice.ts (OPTIONNEL - Migration progressive)
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

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
  photo?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;
  challengeToken: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  requires2FA: false,
  challengeToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setRequires2FA: (state, action: PayloadAction<boolean>) => {
      state.requires2FA = action.payload;
    },
    setChallengeToken: (state, action: PayloadAction<string | null>) => {
      state.challengeToken = action.payload;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.requires2FA = false;
      state.challengeToken = null;
      // ✅ Le token est maintenant stocké dans un cookie HttpOnly
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.requires2FA = false;
      state.challengeToken = null;
      // ✅ Le token dans le cookie HttpOnly sera supprimé par le logout endpoint
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const {
  setUser,
  setToken,
  setLoading,
  setRequires2FA,
  setChallengeToken,
  loginSuccess,
  logout,
  updateUser,
} = authSlice.actions;

export default authSlice.reducer;