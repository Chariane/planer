import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, setCredentials } from '../../features/auth/authSlice.js';
import toast from 'react-hot-toast';

const ProfileSettingsTab = ({ isActive }) => {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    nom: '',
    prenoms: '',
    email: '',
    username: '',
    telephone: '',
    delivery_address: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        nom: user.nom || '',
        prenoms: user.prenoms || '',
        email: user.email || '',
        username: user.username || '',
        telephone: user.telephone || '',
        delivery_address: user.delivery_address || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulation de l'appel API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mettre à jour l'utilisateur dans Redux
      const updatedUser = { ...user, ...profileData };
      dispatch(setCredentials({ user: updatedUser, token: localStorage.getItem('kplaner_token') }));

      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  if (!isActive) return null;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Informations du profil</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom
            </label>
            <input
              type="text"
              name="nom"
              value={profileData.nom}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prénoms
            </label>
            <input
              type="text"
              name="prenoms"
              value={profileData.prenoms}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              name="username"
              value={profileData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              name="telephone"
              value={profileData.telephone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse de livraison
            </label>
            <input
              type="text"
              name="delivery_address"
              value={profileData.delivery_address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Mise à jour...' : 'Mettre à jour le profil'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettingsTab;