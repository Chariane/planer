import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ResetPasswordFormComponent from '../../components/auth/ResetPasswordFormComponent';
import InvalidTokenError from '../../components/auth/InvalidTokenError';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const handleSuccess = () => {
    navigate('/login');
  };

  const handleRequestNewLink = () => {
    navigate('/forget-password');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Réinitialiser le mot de passe
          </h2>
          {token && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Entrez votre nouveau mot de passe
            </p>
          )}
        </div>

        {token ? (
          <ResetPasswordFormComponent onSuccess={handleSuccess} />
        ) : (
          <InvalidTokenError onRequestNewLink={handleRequestNewLink} />
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;