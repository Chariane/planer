import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const EmailVerificationComponent = ({ onVerificationSuccess, onResendVerification }) => {
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
        if (onVerificationSuccess) {
          onVerificationSuccess();
        }
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
    try {
      // Simulation de l'envoi d'un nouvel email
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Nouvel email de vérification envoyé !');
      if (onResendVerification) {
        onResendVerification();
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de l\'email');
    }
  };

  return {
    verificationStatus,
    handleResendVerification
  };
};

export default EmailVerificationComponent;