import React from 'react';
import { useNavigate } from 'react-router-dom';
import EmailVerificationComponent from '../../components/auth/EmailVerificationComponent';

const EmailVerificationPage = () => {
  const navigate = useNavigate();

  const handleNavigateToLogin = () => {
    navigate('/login');
  };

  const handleNavigateToRegister = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <EmailVerificationComponent
          onNavigateToLogin={handleNavigateToLogin}
          onNavigateToRegister={handleNavigateToRegister}
        />
      </div>
    </div>
  );
};

export default EmailVerificationPage;