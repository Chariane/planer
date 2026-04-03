import React from 'react';
import { CheckCircle } from 'lucide-react';

const EmailVerificationSuccess = ({ onNavigateToLogin }) => {
  return (
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
        onClick={onNavigateToLogin}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium"
      >
        Se connecter
      </button>
    </div>
  );
};

export default EmailVerificationSuccess;