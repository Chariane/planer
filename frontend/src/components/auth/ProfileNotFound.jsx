import React from 'react';
import { Link } from 'react-router-dom';

const ProfileNotFound = () => {
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
};

export default ProfileNotFound;