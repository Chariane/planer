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
import WorkspaceDashboard from './pages/workspaces/WorkspaceDashboard';


function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/workspace/:workspaceId/:spaceId?/:listId?" element={<AppView />} />
              <Route path="/workspaces" element={<WorkspaceDashboard />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/kanban" element={<KanbanPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/absences" element={<AbsencesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
