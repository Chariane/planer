import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';

// A middleware could be added here to globally observe errors and trigger toasts
// if RTK Query or Thunks are used extensively, but authSlice currently handles its own toasts.

const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export default store;
