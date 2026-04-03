import React, { useState } from 'react';
import toast from 'react-hot-toast';

const ForgetPasswordFormComponent = ({ onEmailSent }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);

    try {
      // Simulation de l'appel API - Remplacer par l'appel réel plus tard
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock response
      toast.success('Un email de réinitialisation a été envoyé à votre adresse.');
      if (onEmailSent) {
        onEmailSent(email);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de l\'email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div>
        <input
          name="email"
          type="email"
          required
          className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Adresse email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
        </button>
      </div>
    </form>
  );
};

export default ForgetPasswordFormComponent;