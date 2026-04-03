import React from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

const ProfileCard = ({ user, roleInfo }) => {
  return (
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
  );
};

export default ProfileCard;