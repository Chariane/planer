import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ForgetPasswordFormComponent from '../../components/auth/ForgetPasswordFormComponent';
import EmailSentConfirmation from '../../components/auth/EmailSentConfirmation';

const ForgetPasswordPage = () => {
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const handleEmailSent = (email) => {
    setSentEmail(email);
    setEmailSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Mot de passe oublié
          </h2>
          {!emailSent && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          )}
        </div>

        {emailSent ? (
          <EmailSentConfirmation email={sentEmail} />
        ) : (
          <ForgetPasswordFormComponent onEmailSent={handleEmailSent} />
        )}

        <div className="text-center">
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgetPasswordPage;

export default ForgetPasswordPage;