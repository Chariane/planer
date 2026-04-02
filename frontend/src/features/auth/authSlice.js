import { createSlice } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

// Load initial state from LocalStorage
const initialState = {
  user: null,
  token: localStorage.getItem('kplaner_token') || null,
  isAuthenticated: !!localStorage.getItem('kplaner_token'),
  loading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Appelée lorsqu'une connexion réussit
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem('kplaner_token', token);
      toast.success('Connexion réussie ! Bienvenue sur K-Planer.');
    },
    // Appelée pour déconnecter l'utilisateur
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('kplaner_token');
      toast.success('Vous avez été déconnecté.');
    },
    // Gestion de l'état de chargement lors d'appels API
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setCredentials, logout, setLoading } = authSlice.actions;

// Sélecteurs
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;

export default authSlice.reducer;
