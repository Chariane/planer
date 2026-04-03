import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('loading'); // loading, success, error
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setVerificationStatus('error');
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      // Simulation de l'appel API
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simuler une vérification réussie (90% de succès)
      if (Math.random() > 0.1) {
        setVerificationStatus('success');
        toast.success('Email vérifié avec succès !');
      } else {
        setVerificationStatus('error');
        toast.error('Lien de vérification invalide ou expiré');
      }
    } catch (error) {
      setVerificationStatus('error');
      toast.error('Erreur lors de la vérification');
    }
  };

  const resendVerification = async () => {
    setLoading(true);
    try {
      // Simulation de l'envoi d'un nouvel email
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Nouvel email de vérification envoyé !');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  if (verificationStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
              <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Vérification en cours...
            </h2>
            <p className="text-gray-600">
              Nous vérifions votre adresse email. Cela peut prendre quelques instants.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Email vérifié !
            </h2>
            <p className="text-gray-600 mb-6">
              Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités de K-Planer.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
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
              onClick={resendVerification}
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
              onClick={() => navigate('/register')}
              className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-md font-medium"
            >
              Créer un nouveau compte
            </button>
          </div>

          <div className="mt-6">
            <button
              onClick={() => navigate('/login')}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;