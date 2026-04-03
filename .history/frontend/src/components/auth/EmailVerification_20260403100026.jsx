import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;

    setLoading(true);

    try {
      // Simulation de l'appel API - Remplacer par l'appel réel plus tard
      await new Promise(resolve => setTimeout(resolve, 1000));

      setVerified(true);
      toast.success('Email vérifié avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la vérification de l\'email.');
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!email) {
      toast.error('Adresse email manquante.');
      return;
    }

    setResendLoading(true);

    try {
      // Simulation de l'appel API - Remplacer par l'appel réel plus tard
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Email de vérification renvoyé !');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de l\'email.');
    } finally {
      setResendLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Email vérifié !
            </h2>
            <p className="text-gray-600 mb-6">
              Votre compte a été activé avec succès. Vous pouvez maintenant vous connecter.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (token && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Vérification en cours...
            </h2>
            <p className="text-gray-600">
              Veuillez patienter pendant que nous vérifions votre email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Vérifiez votre email
          </h2>
          <p className="text-gray-600 mb-6">
            Nous avons envoyé un lien de vérification à{' '}
            <strong>{email || 'votre adresse email'}</strong>.
            Cliquez sur le lien pour activer votre compte.
          </p>

          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Vous n'avez pas reçu l'email ?
            </p>
            <button
              onClick={resendVerification}
              disabled={resendLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {resendLoading ? 'Envoi en cours...' : 'Renvoyer l\'email de vérification'}
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
