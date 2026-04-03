import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, setLoading } from '../../features/auth/authSlice.js';
import toast from 'react-hot-toast';

const RegisterFormComponent = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    nom: '',
    prenoms: '',
    telephone: '',
    is_entreprise: false
  });
  const [loading, setLocalLoading] = useState(false);

  const dispatch = useDispatch();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    setLocalLoading(true);
    dispatch(setLoading(true));

    try {
      // Simulation de l'appel API - Remplacer par l'appel réel plus tard
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data - Adapter selon les exigences backend
      const mockUser = {
        id: 2,
        email: formData.email,
        username: formData.username,
        nom: formData.nom,
        prenoms: formData.prenoms,
        telephone: formData.telephone,
        role: formData.is_entreprise ? 'entreprise' : 'user',
        is_active: true
      };
      const mockToken = 'mock-jwt-token-67890';

      dispatch(setCredentials({ user: mockUser, token: mockToken }));
      toast.success('Inscription réussie !');
      // Navigation sera gérée par la page parente
    } catch (error) {
      toast.error('Erreur lors de l\'inscription.');
    } finally {
      setLocalLoading(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <input
            name="email"
            type="email"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Adresse email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div>
          <input
            name="username"
            type="text"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Nom d'utilisateur"
            value={formData.username}
            onChange={handleChange}
          />
        </div>
        <div>
          <input
            name="nom"
            type="text"
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Nom"
            value={formData.nom}
            onChange={handleChange}
          />
        </div>
        <div>
          <input
            name="prenoms"
            type="text"
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Prénoms"
            value={formData.prenoms}
            onChange={handleChange}
          />
        </div>
        <div>
          <input
            name="telephone"
            type="tel"
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Téléphone"
            value={formData.telephone}
            onChange={handleChange}
          />
        </div>
        <div>
          <input
            name="password"
            type="password"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Mot de passe"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        <div>
          <input
            name="confirmPassword"
            type="password"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Confirmer le mot de passe"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="is_entreprise"
          name="is_entreprise"
          type="checkbox"
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          checked={formData.is_entreprise}
          onChange={handleChange}
        />
        <label htmlFor="is_entreprise" className="ml-2 block text-sm text-gray-900">
          Je suis une entreprise
        </label>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading || !formData.nom.trim()}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Inscription...' : 'S\'inscrire'}
        </button>
      </div>
    </form>
  );
};

export default RegisterFormComponent;