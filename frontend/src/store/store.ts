// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
import uiReducer from './slices/uiSlice';
import navigationReducer from './slices/navigationSlice';
// import authReducer from './slices/authSlice'; // ⏳ Plus tard

export const store = configureStore({
  reducer: {
    // API
    [baseApi.reducerPath]: baseApi.reducer,
    
    // Slices UI
    ui: uiReducer,
    navigation: navigationReducer,
    // auth: authReducer, // ⏳ Plus tard
    
    // ⭐ On garde vos contexts pour l'instant
    // La migration se fera progressivement
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['api/executeQuery/fulfilled', 'api/executeMutation/fulfilled'],
      },
    }).concat(baseApi.middleware),
  devTools: import.meta.env.MODE !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;