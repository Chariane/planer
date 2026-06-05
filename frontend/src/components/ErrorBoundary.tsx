import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Erreur inattendue',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur de rendu interface', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-theme-page p-6">
        <div className="max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-theme-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-red-900">Impossible d'afficher cette zone</h2>
          <p className="mt-2 text-sm leading-relaxed text-red-700">
            Une erreur est survenue dans {this.props.label || "l'interface"}. Rechargez la page après correction.
          </p>
          {this.state.message && (
            <p className="mt-4 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700">
              {this.state.message}
            </p>
          )}
        </div>
      </div>
    );
  }
}
