import React from 'react';

const EmailSentConfirmation = ({ email }) => {
  return (
    <div className="text-center">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Email envoyé !
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Un email de réinitialisation de mot de passe a été envoyé à {email}.
        Vérifiez votre boîte de réception et suivez les instructions.
      </p>
    </div>
  );
};

export default EmailSentConfirmation;