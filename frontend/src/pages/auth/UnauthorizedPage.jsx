import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Accès non autorisé
          </h2>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          <div className="space-y-3">
            <Link
              to="/workspaces"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Retour à l'accueil
            </Link>
            <Link
              to="/profile"
              className="block text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Voir mon profil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;