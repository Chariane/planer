import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmailVerificationLoading from './EmailVerificationLoading';
import EmailVerificationSuccess from './EmailVerificationSuccess';
import EmailVerificationError from './EmailVerificationError';

const EmailVerificationComponent = ({ onNavigateToLogin, onNavigateToRegister }) => {
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState('loading'); // loading, success, error

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

  const handleResendVerification = async () => {
    // Simulation de l'envoi d'un nouvel email
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Nouvel email de vérification envoyé !');
  };

  if (verificationStatus === 'loading') {
    return <EmailVerificationLoading />;
  }

  if (verificationStatus === 'success') {
    return <EmailVerificationSuccess onNavigateToLogin={onNavigateToLogin} />;
  }

  return (
    <EmailVerificationError
      onResendVerification={handleResendVerification}
      onNavigateToRegister={onNavigateToRegister}
      onNavigateToLogin={onNavigateToLogin}
    />
  );
};

export default EmailVerificationComponent;