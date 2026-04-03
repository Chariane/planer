import React from 'react';
import { User, Mail, Phone, MapPin, Calendar, Shield } from 'lucide-react';

const ProfileDetails = ({ user }) => {
  return (
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
  );
};

export default ProfileDetails;