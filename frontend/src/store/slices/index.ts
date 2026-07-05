// src/store/slices/index.ts
export { default as uiReducer } from './uiSlice';
export { default as navigationReducer } from './navigationSlice';
// export { default as authReducer } from './authSlice'; // ⏳ Plus tard

// Export des actions
export * from './uiSlice';
export * from './navigationSlice';
// export * from './authSlice'; // ⏳ Plus tard
