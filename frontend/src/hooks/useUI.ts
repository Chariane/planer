// src/hooks/useUI.ts - VERSION CORRIGÉE
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector'; // ✅ Correction ici
import {
  toggleSidebar,
  setSidebarOpen,
  toggleMobileSidebar,
  setMobileSidebarOpen,
  setCurrentView,
  openModal,
  closeModal,
  toggleModal,
  closeAllModals,
  addToast,
  removeToast,
  clearToasts,
  setGlobalLoading,
  setLoading,
  toggleTheme,
  setTheme,
} from '../store/slices/uiSlice';
import type { ViewType, ModalName } from '../store/slices/uiSlice';

export const useUI = () => {
  const dispatch = useAppDispatch();
  const ui = useAppSelector((state) => state.ui);

  return {
    // State
    sidebarOpen: ui.sidebarOpen,
    mobileSidebarOpen: ui.mobileSidebarOpen,
    currentView: ui.currentView,
    modals: ui.modals,
    toasts: ui.toasts,
    loading: ui.loading,
    theme: ui.theme,

    // Actions
    toggleSidebar: () => dispatch(toggleSidebar()),
    setSidebarOpen: (open: boolean) => dispatch(setSidebarOpen(open)),
    toggleMobileSidebar: () => dispatch(toggleMobileSidebar()),
    setMobileSidebarOpen: (open: boolean) => dispatch(setMobileSidebarOpen(open)),
    setCurrentView: (view: ViewType) => dispatch(setCurrentView(view)),
    openModal: (modal: ModalName) => dispatch(openModal(modal)),
    closeModal: (modal: ModalName) => dispatch(closeModal(modal)),
    toggleModal: (modal: ModalName) => dispatch(toggleModal(modal)),
    closeAllModals: () => dispatch(closeAllModals()),
    addToast: (toast: Omit<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string; duration?: number }, 'id'>) =>
      dispatch(addToast(toast)),
    removeToast: (id: string) => dispatch(removeToast(id)),
    clearToasts: () => dispatch(clearToasts()),
    setGlobalLoading: (loading: boolean) => dispatch(setGlobalLoading(loading)),
    setLoading: (key: string, value: boolean) => dispatch(setLoading({ key, value })),
    toggleTheme: () => dispatch(toggleTheme()),
    setTheme: (theme: 'light' | 'dark') => dispatch(setTheme(theme)),
  };
};