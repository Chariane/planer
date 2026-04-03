import React from 'react';
import { Link } from 'react-router-dom';

const ProfileSidebar = ({ user, roleInfo }) => {
  return (
    <div className="space-y-6">
      {/* Actions rapides */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="space-y-3">
          <Link
            to="/settings"
            className="block w-full text-left px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Modifier le profil
          </Link>
          <Link
            to="/settings?tab=security"
            className="block w-full text-left px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Changer le mot de passe
          </Link>
          <Link
            to="/settings?tab=notifications"
            className="block w-full text-left px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Préférences de notifications
          </Link>
        </div>
      </div>

      {/* Statistiques */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Workspaces</span>
            <span className="text-sm font-medium">3</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Espaces</span>
            <span className="text-sm font-medium">12</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Tâches complétées</span>
            <span className="text-sm font-medium">47</span>
          </div>
        </div>
      </div>

      {/* Rôles et permissions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rôles et Permissions</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              user.role === 'super_admin' ? 'bg-red-500' :
              user.role === 'admin' ? 'bg-green-500' :
              user.role === 'entreprise' ? 'bg-blue-500' : 'bg-gray-500'
            }`} />
            <span className="text-sm text-gray-600">{roleInfo.label}</span>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {user.role === 'super_admin' && 'Accès complet à toutes les fonctionnalités administratives'}
            {user.role === 'admin' && 'Gestion des utilisateurs et des workspaces'}
            {user.role === 'entreprise' && 'Accès aux fonctionnalités d\'entreprise'}
            {user.role === 'user' && 'Accès standard aux fonctionnalités de base'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;