import React, { useState } from 'react';
import toast from 'react-hot-toast';

const SecuritySettingsTab = ({ isActive }) => {
  const [loading, setLoading] = useState(false);
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSecurity({
      ...security,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (security.newPassword !== security.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      // Simulation de l'appel API
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSecurity({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFactorEnabled: security.twoFactorEnabled
      });

      toast.success('Mot de passe changé avec succès');
    } catch (error) {
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  if (!isActive) return null;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Sécurité du compte</h2>

      <div className="space-y-8">
        {/* Changement de mot de passe */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Changer le mot de passe</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe actuel
              </label>
              <input
                type="password"
                name="currentPassword"
                value={security.currentPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                name="newPassword"
                value={security.newPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={security.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Changement...' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>
        </div>

        {/* Authentification à deux facteurs */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Authentification à deux facteurs</h3>
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Activer l'authentification 2FA</h4>
              <p className="text-sm text-gray-500">Ajoutez une couche de sécurité supplémentaire à votre compte</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="twoFactorEnabled"
                checked={security.twoFactorEnabled}
                onChange={handleChange}
                className="sr-only"
              />
              <div className={`relative inline-block w-10 h-6 transition duration-200 ease-in-out rounded-full ${
                security.twoFactorEnabled ? 'bg-indigo-600' : 'bg-gray-300'
              }`}>
                <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                  security.twoFactorEnabled ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsTab;