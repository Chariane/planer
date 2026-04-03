import React from 'react';
import { RefreshCw } from 'lucide-react';

const EmailVerificationLoading = () => {
  return (
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
  );
};

export default EmailVerificationLoading;