import React from 'react';
import { Link } from 'react-router-dom';
import RegisterFormComponent from '../../components/auth/RegisterFormComponent';

const RegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Créer un compte K-Planer
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Déjà un compte ?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Se connecter
            </Link>
          </p>
        </div>
        <RegisterFormComponent />
      </div>
    </div>
  );
};

export default RegisterPage;
