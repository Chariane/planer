import React, { useState } from 'react';
import { XCircle, Mail, RefreshCw } from 'lucide-react';

const EmailVerificationError = ({ onResendVerification, onNavigateToRegister, onNavigateToLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await onResendVerification();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <XCircle className="h-6 w-6 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Vérification échouée
      </h2>
      <p className="text-gray-600 mb-6">
        Le lien de vérification est invalide, expiré ou a déjà été utilisé.
      </p>

      <div className="space-y-4">
        <button
          onClick={handleResend}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-md font-medium flex items-center justify-center gap-2"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {loading ? 'Envoi en cours...' : 'Renvoyer l\'email de vérification'}
        </button>

        <button
          onClick={onNavigateToRegister}
          className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-md font-medium"
        >
          Créer un nouveau compte
        </button>
      </div>

      <div className="mt-6">
        <button
          onClick={onNavigateToLogin}
          className="text-indigo-600 hover:text-indigo-500 font-medium"
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  );
};

export default EmailVerificationError;