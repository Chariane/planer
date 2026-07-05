// src/store/slices/uiSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type ViewType = 'kanban' | 'liste' | 'gantt' | 'dashboard';

export type ModalName = 
  | 'createWorkspace'
  | 'createEspace'
  | 'createListe'
  | 'createTache'
  | 'inviteMember'
  | 'inviteEspaceMember'
  | 'assignTask'
  | 'assignList'
  | 'leaveRequest'
  | 'taskForm';

interface ModalState {
  [key: string]: boolean;
  createWorkspace: boolean;
  createEspace: boolean;
  createListe: boolean;
  createTache: boolean;
  inviteMember: boolean;
  inviteEspaceMember: boolean;
  assignTask: boolean;
  assignList: boolean;
  leaveRequest: boolean;
  taskForm: boolean;
}

interface ToastState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  currentView: ViewType;
  modals: ModalState;
  toasts: ToastState[];
  loading: {
    global: boolean;
    [key: string]: boolean;
  };
  theme: 'light' | 'dark';
}

const initialState: UIState = {
  sidebarOpen: true,
  mobileSidebarOpen: false,
  currentView: 'kanban',
  modals: {
    createWorkspace: false,
    createEspace: false,
    createListe: false,
    createTache: false,
    inviteMember: false,
    inviteEspaceMember: false,
    assignTask: false,
    assignList: false,
    leaveRequest: false,
    taskForm: false,
  },
  toasts: [],
  loading: {
    global: false,
  },
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Sidebar
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleMobileSidebar: (state) => {
      state.mobileSidebarOpen = !state.mobileSidebarOpen;
    },
    setMobileSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileSidebarOpen = action.payload;
    },

    // View
    setCurrentView: (state, action: PayloadAction<ViewType>) => {
      state.currentView = action.payload;
    },

    // Modals
    openModal: (state, action: PayloadAction<ModalName>) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<ModalName>) => {
      state.modals[action.payload] = false;
    },
    toggleModal: (state, action: PayloadAction<ModalName>) => {
      state.modals[action.payload] = !state.modals[action.payload];
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key] = false;
      });
    },

    // Toasts
    addToast: (state, action: PayloadAction<Omit<ToastState, 'id'>>) => {
      const id = Date.now().toString();
      state.toasts.push({
        ...action.payload,
        id,
        duration: action.payload.duration || 5000,
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    },

    // Loading
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    setLoading: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value;
    },

    // Theme
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
  },
});

export const {
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
} = uiSlice.actions;

export default uiSlice.reducer;