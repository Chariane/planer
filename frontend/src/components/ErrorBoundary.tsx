// src/components/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  label?: string;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isAuthError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
    isAuthError: false,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const isAuthError = error?.message?.includes('401') || 
                        error?.message?.includes('Unauthorized') ||
                        error?.message?.includes('Session expirée');
    
    return {
      hasError: true,
      message: error?.message || 'Erreur inattendue',
      isAuthError: isAuthError || false,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur de rendu interface', error, info);
    
    // ✅ Si c'est une erreur d'authentification, déclencher la redirection
    if (this.state.isAuthError) {
      // ✅ Le token est maintenant géré via cookies HttpOnly
      // Le logout endpoint se chargera de le supprimer
      window.dispatchEvent(new CustomEvent('sessionExpired'));
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '', isAuthError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // ✅ Si c'est une erreur d'auth, ne pas afficher le composant d'erreur
    if (this.state.isAuthError) {
      return null; // Laisse le gestionnaire d'événements faire la redirection
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-theme-page p-6">
        <div className="max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-theme-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-red-900">Impossible d'afficher cette zone</h2>
          <p className="mt-2 text-sm leading-relaxed text-red-700">
            Une erreur est survenue dans {this.props.label || "l'interface"}. 
            Rechargez la page après correction.
          </p>
          {this.state.message && (
            <p className="mt-4 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700">
              {this.state.message}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }
}