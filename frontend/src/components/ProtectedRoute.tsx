// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function ProtectedRoute() {
  const { user, isLoading, token } = useAuth();
  const [sessionValid, setSessionValid] = useState(true);
  const [checkingSession, setCheckingSession] = useState(false);

  // ✅ Vérification périodique de la session
  useEffect(() => {
    if (!token) return;

    const checkSession = async () => {
      if (checkingSession) return;
      setCheckingSession(true);
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_AUTH_URL || 'http://localhost:8002'}/auth/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) {
          setSessionValid(false);
          localStorage.removeItem('access_token');
          window.dispatchEvent(new CustomEvent('unauthorized'));
        }
      } catch (error) {
        console.error('Erreur vérification session:', error);
      } finally {
        setCheckingSession(false);
      }
    };

    // Vérification toutes les 2 minutes
    const interval = setInterval(checkSession, 120000);

    return () => clearInterval(interval);
  }, [token, checkingSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary" />
      </div>
    );
  }

  if (!user || !token || !sessionValid) {
    return <Navigate to="/login?session_expired=true" replace />;
  }

  return <Outlet />;
}