// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
import uiReducer from './slices/uiSlice';
import navigationReducer from './slices/navigationSlice';

const authMiddleware = (store: any) => (next: any) => (action: any) => {
  // Si une requête échoue avec 401
  if (action.type === baseApi.reducerPath + '/executeQuery/rejected') {
    const status = action.payload?.status;
    if (status === 401) {
      
      store.dispatch(baseApi.util.invalidateTags(['UserData']));
      // Déclencher l'événement unauthorized
      window.dispatchEvent(new CustomEvent('unauthorized'));
    }
  }
  return next(action);
};


export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    ui: uiReducer,
    navigation: navigationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['api/executeQuery/fulfilled', 'api/executeMutation/fulfilled'],
      },
    })
      .concat(baseApi.middleware)
      .concat(authMiddleware), // 
  devTools: import.meta.env.MODE !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;