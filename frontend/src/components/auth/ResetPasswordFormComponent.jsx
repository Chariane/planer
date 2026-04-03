import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const ResetPasswordFormComponent = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (!token) {
      toast.error('Token de réinitialisation manquant.');
      return;
    }

    setLoading(true);

    try {
      // Simulation de l'appel API - Remplacer par l'appel réel plus tard
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Mot de passe réinitialisé avec succès !');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation du mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div>
        <input
          name="password"
          type="password"
          required
          className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Nouveau mot de passe"
          value={formData.password}
          onChange={handleChange}
        />
      </div>
      <div>
        <input
          name="confirmPassword"
          type="password"
          required
          className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Confirmer le mot de passe"
          value={formData.confirmPassword}
          onChange={handleChange}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={loading || !formData.password || !formData.confirmPassword}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
        </button>
      </div>
    </form>
  );
};

export default ResetPasswordFormComponent;