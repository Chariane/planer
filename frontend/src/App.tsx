// frontend/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
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
import InvitationError from './pages/InvitationError';
import ResourceGuard from './components/guards/ResourceGuard';
import { ActiveResourceProvider } from './contexts/ActiveResourceContext';
import { ToastContainer } from './components/ui/Toast'; // ✅ Import du ToastContainer maison

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ToastContainer /> {/* ✅ Conteneur de toasts maison */}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>
          {/* Route d'acceptation d'invitation (accessible sans authentification) */}
          <Route path="/invitation/accept" element={<InvitationAccept />} />
          <Route path="/invitation/error" element={<InvitationError />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/workspace/:id" element={<ResourceGuard type="workspace"><ActiveResourceProvider><AppView /></ActiveResourceProvider></ResourceGuard>} />
              <Route path="/espace/:id" element={<ResourceGuard type="espace"><ActiveResourceProvider><AppView /></ActiveResourceProvider></ResourceGuard>} />
              <Route path="/liste/:id" element={<ResourceGuard type="liste"><ActiveResourceProvider><AppView /></ActiveResourceProvider></ResourceGuard>} />
              <Route path="/tache/:id" element={<ResourceGuard type="tache"><ActiveResourceProvider><AppView /></ActiveResourceProvider></ResourceGuard>} />

              {/* Fallback support for old links if needed */}
              <Route path="/workspace/:workspaceId/list/:listId" element={<ActiveResourceProvider><AppView /></ActiveResourceProvider>} />
              <Route path="/workspace/:workspaceId/:spaceId?/:listId?" element={<ActiveResourceProvider><AppView /></ActiveResourceProvider>} />

              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/kanban" element={<KanbanPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/absences" element={<AbsencesPage />} />
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

export default App;