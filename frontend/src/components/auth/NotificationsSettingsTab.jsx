import React, { useState } from 'react';
import toast from 'react-hot-toast';

const NotificationsSettingsTab = ({ isActive }) => {
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    workspace_invites: true,
    task_assignments: true
  });

  const handleChange = (e) => {
    setNotifications({
      ...notifications,
      [e.target.name]: e.target.checked
    });
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Simulation de l'appel API
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Préférences de notifications mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour des préférences');
    } finally {
      setLoading(false);
    }
  };

  if (!isActive) return null;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Préférences de notifications</h2>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Canaux de notification</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Notifications par email</h4>
                <p className="text-sm text-gray-500">Recevoir des notifications par email</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="email"
                  checked={notifications.email}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className={`relative inline-block w-10 h-6 transition duration-200 ease-in-out rounded-full ${
                  notifications.email ? 'bg-indigo-600' : 'bg-gray-300'
                }`}>
                  <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    notifications.email ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Notifications push</h4>
                <p className="text-sm text-gray-500">Recevoir des notifications push dans le navigateur</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="push"
                  checked={notifications.push}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className={`relative inline-block w-10 h-6 transition duration-200 ease-in-out rounded-full ${
                  notifications.push ? 'bg-indigo-600' : 'bg-gray-300'
                }`}>
                  <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    notifications.push ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </label>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Types de notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Invitations aux workspaces</h4>
                <p className="text-sm text-gray-500">Quand quelqu'un vous invite à rejoindre un workspace</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="workspace_invites"
                  checked={notifications.workspace_invites}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className={`relative inline-block w-10 h-6 transition duration-200 ease-in-out rounded-full ${
                  notifications.workspace_invites ? 'bg-indigo-600' : 'bg-gray-300'
                }`}>
                  <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    notifications.workspace_invites ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Assignation de tâches</h4>
                <p className="text-sm text-gray-500">Quand une tâche vous est assignée</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="task_assignments"
                  checked={notifications.task_assignments}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className={`relative inline-block w-10 h-6 transition duration-200 ease-in-out rounded-full ${
                  notifications.task_assignments ? 'bg-indigo-600' : 'bg-gray-300'
                }`}>
                  <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    notifications.task_assignments ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </label>
            </div>
          </div>
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

export default NotificationsSettingsTab;