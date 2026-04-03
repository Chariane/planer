import React, { useState } from 'react';
import { User, Bell, Shield, Palette } from 'lucide-react';
import ProfileSettingsTab from '../../components/auth/ProfileSettingsTab';
import SecuritySettingsTab from '../../components/auth/SecuritySettingsTab';
import NotificationsSettingsTab from '../../components/auth/NotificationsSettingsTab';
import PreferencesSettingsTab from '../../components/auth/PreferencesSettingsTab';

const SettingsManagement = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Préférences', icon: Palette }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600 mt-2">Gérez votre compte et vos préférences</p>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        {/* Onglets */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <ProfileSettingsTab isActive={activeTab === 'profile'} />
        <SecuritySettingsTab isActive={activeTab === 'security'} />
        <NotificationsSettingsTab isActive={activeTab === 'notifications'} />
        <PreferencesSettingsTab isActive={activeTab === 'preferences'} />
      </div>
    </div>
  );
};

export default SettingsManagement;