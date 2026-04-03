import React from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Calendar, Settings, Shield } from 'lucide-react';

const ProfilePage = () => {
  const user = useSelector(selectCurrentUser);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Utilisateur non trouvé</h2>
          <Link to="/login" className="text-indigo-600 hover:text-indigo-500">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const getRoleDisplay = (role) => {
    const roles = {
      super_admin: { label: 'Super Administrateur', color: 'bg-red-100 text-red-800' },
      admin: { label: 'Administrateur', color: 'bg-green-100 text-green-800' },
      entreprise: { label: 'Entreprise', color: 'bg-blue-100 text-blue-800' },
      user: { label: 'Utilisateur', color: 'bg-gray-100 text-gray-800' }
    };
    return roles[role] || roles.user;
  };

  const roleInfo = getRoleDisplay(user.role);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
        <p className="text-gray-600 mt-2">Consultez et gérez vos informations personnelles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Carte de profil */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">
                    {user.prenoms?.[0]}{user.nom?.[0]}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.prenoms} {user.nom}
                </h2>
                <p className="text-gray-600">@{user.username}</p>
                <div className="mt-2">
                  <span className={`px-3 py-1 text-sm rounded-full ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <Settings size={16} />
                  Modifier
                </Link>
              </div>
            </div>
          </div>

          {/* Détails du profil */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Nom complet</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user.prenoms} {user.nom}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
              </div>

              {user.telephone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="text-sm font-medium text-gray-900">{user.telephone}</p>
                  </div>
                </div>
              )}

              {user.delivery_address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Adresse de livraison</p>
                    <p className="text-sm font-medium text-gray-900">{user.delivery_address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Membre depuis</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Statut du compte</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user.is_active ? 'Actif' : 'Inactif'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar avec actions rapides */}
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
      </div>
    </div>
  );
};

export default ProfilePage;