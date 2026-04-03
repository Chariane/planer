import React from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import ProfileCard from '../../components/auth/ProfileCard';
import ProfileDetails from '../../components/auth/ProfileDetails';
import ProfileSidebar from '../../components/auth/ProfileSidebar';
import ProfileNotFound from '../../components/auth/ProfileNotFound';

const ProfilePage = () => {
  const user = useSelector(selectCurrentUser);

  if (!user) {
    return <ProfileNotFound />;
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
          <ProfileCard user={user} roleInfo={roleInfo} />
          <ProfileDetails user={user} />
        </div>

        {/* Sidebar avec actions rapides */}
        <ProfileSidebar user={user} roleInfo={roleInfo} />
      </div>
    </div>
  );
};

export default ProfilePage;