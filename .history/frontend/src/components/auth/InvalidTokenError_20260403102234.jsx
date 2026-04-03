import React from 'react';

const InvalidTokenError = ({ onRequestNewLink }) => {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Lien invalide
      </h2>
      <p className="text-gray-600 mb-6">
        Ce lien de réinitialisation n'est pas valide ou a expiré.
      </p>
      <button
        onClick={onRequestNewLink}
        className="text-indigo-600 hover:text-indigo-500 font-medium"
      >
        Demander un nouveau lien
      </button>
    </div>
  );
};

export default InvalidTokenError;