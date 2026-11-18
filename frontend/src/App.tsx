// src/App.tsx
import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import AppView from './pages/app/AppView';
import TasksPage from './pages/TasksPage';
import KanbanPage from './pages/KanbanPage';
import UsersPage from './pages/UsersPage';
import AbsencesPage from './pages/AbsencesPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import UserProfilePage from './pages/UserProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import MessageriePage from './pages/MessageriePage';
import EntreprisePage from './pages/EntreprisePage';
import InvitationAccept from './pages/InvitationAccept';
import SearchPage from './pages/app/SearchPage';
import InvitationError from './pages/InvitationError';
import ResourceGuard from './components/guards/ResourceGuard';
import { ActiveResourceProvider } from './contexts/ActiveResourceContext';
import { ToastContainer, toast } from './components/ui/Toast';
import { setupSessionExpiredHandler } from './store/api/baseApi';
import ErrorBoundary from './components/ErrorBoundary';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Configurer le handler d'erreurs 401 (session expirée)
  useEffect(() => {
    setupSessionExpiredHandler(navigate);
  }, [navigate]);

  // ✅ Gérer les différents paramètres de redirection
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    // 🔵 Déconnexion volontaire - Message "À bientôt !"
    if (params.get('logout') === 'true') {
      toast.info('À bientôt ! Vous êtes bien déconnecté.', {
        duration: 3000,
      });
      // Nettoyer l'URL
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
      return;
    }

    // 🔴 Session expirée - Message "Votre session a expiré"
    if (params.get('session_expired') === 'true') {
      toast.error('Votre session a expiré. Veuillez vous reconnecter.', {
        duration: 3000,
      });
      // Nettoyer l'URL
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
      return;
    }

    // 🟢 Invitation acceptée - Message "Invitation acceptée !"
    if (params.get('accepted') === 'true') {
      toast.success('Invitation acceptée ! Bienvenue dans votre nouvel espace.', {
        duration: 3000,
      });
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
      return;
    }
  }, [location, navigate]);

  // ✅ Nettoyer les paramètres URL quand on est sur login
  useEffect(() => {
    if (location.pathname === '/login') {
      const params = new URLSearchParams(location.search);
      if (params.has('logout') || params.has('session_expired') || params.has('accepted')) {
        navigate('/login', { replace: true });
      }
    }
  }, [location, navigate]);

  return (
    <AuthProvider>
      <AppProvider>
        <ToastContainer />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>
          <Route path="/invitation/accept" element={<InvitationAccept />} />
          <Route path="/invitation/error" element={<InvitationError />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/workspace/:id" element={
                <ResourceGuard type="workspace">
                  <ActiveResourceProvider>
                    <AppView />
                  </ActiveResourceProvider>
                </ResourceGuard>
              } />
              <Route path="/espace/:id" element={
                <ResourceGuard type="espace">
                  <ActiveResourceProvider>
                    <AppView />
                  </ActiveResourceProvider>
                </ResourceGuard>
              } />
              <Route path="/liste/:id" element={
                <ResourceGuard type="liste">
                  <ActiveResourceProvider>
                    <AppView />
                  </ActiveResourceProvider>
                </ResourceGuard>
              } />
              <Route path="/tache/:id" element={
                <ResourceGuard type="tache">
                  <ActiveResourceProvider>
                    <AppView />
                  </ActiveResourceProvider>
                </ResourceGuard>
              } />
              <Route path="/workspace/:workspaceId/list/:listId" element={
                <ActiveResourceProvider>
                  <AppView />
                </ActiveResourceProvider>
              } />
              <Route path="/workspace/:workspaceId/:spaceId?/:listId?" element={
                <ActiveResourceProvider>
                  <AppView />
                </ActiveResourceProvider>
              } />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/kanban" element={<KanbanPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/absences" element={<AbsencesPage />} />
              <Route path="/recherche" element={<SearchPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/users/:userId" element={<UserProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/messagerie" element={<MessageriePage />} />
              <Route path="/entreprise" element={<EntreprisePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </AuthProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;