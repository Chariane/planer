import React, { useState } from 'react';
import toast from 'react-hot-toast';

const PreferencesSettingsTab = ({ isActive }) => {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    language: 'fr',
    theme: 'light'
  });

  const handleChange = (e) => {
    setPreferences({
      ...preferences,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Simulation de l'appel API
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Préférences mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour des préférences');
    } finally {
      setLoading(false);
    }
  };

  if (!isActive) return null;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Préférences générales</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Langue
          </label>
          <select
            name="language"
            value={preferences.language}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thème
          </label>
          <select
            name="theme"
            value={preferences.theme}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
            <option value="auto">Automatique</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Sauvegarde...' : 'Sauvegarder les préférences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSettingsTab;