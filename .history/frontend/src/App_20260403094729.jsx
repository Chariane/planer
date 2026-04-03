import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectCurrentUser } from './features/auth/authSlice';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import UtilisateurLayout from './layouts/UtilisateurLayout';
import EntrepriseLayout from './layouts/EntrepriseLayout';
import AdminLayout from './layouts/AdminLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgetPasswordPage from './pages/auth/ForgetPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import EmailVerification from './pages/auth/EmailVerification';
import ProfilePage from './pages/auth/ProfilePage';
import SettingsManagement from './pages/auth/SettingsManagement';
import UserManagement from './pages/auth/UserManagement';
import WorkspacesList from './pages/workspace/WorkspacesList';
import CreateWorkspace from './pages/workspace/CreateWorkspace';
import WorkspaceDashboard from './pages/workspace/WorkspaceDashboard';
import SpacesList from './pages/espace/SpacesList';
import CreateSpace from './pages/espace/CreateSpace';

// Composant pour routes protégées
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Composant pour choisir le layout selon le rôle
const LayoutWrapper = ({ children }) => {
  const user = useSelector(selectCurrentUser);

  if (!user) return <PublicLayout>{children}</PublicLayout>;

  switch (user.role) {
    case 'super_admin':
      return <SuperAdminLayout>{children}</SuperAdminLayout>;
    case 'admin':
      return <AdminLayout>{children}</AdminLayout>;
    case 'entreprise':
      return <EntrepriseLayout>{children}</EntrepriseLayout>;
    default:
      return <UtilisateurLayout>{children}</UtilisateurLayout>;
  }
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
        <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />

        {/* Routes protégées - Workspaces */}
        <Route
          path="/workspaces"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <WorkspacesList />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces/create"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <CreateWorkspace />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces/:id"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <WorkspaceDashboard />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Routes protégées - Espaces */}
        <Route
          path="/spaces"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <SpacesList />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/spaces/create"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <CreateSpace />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Route par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;