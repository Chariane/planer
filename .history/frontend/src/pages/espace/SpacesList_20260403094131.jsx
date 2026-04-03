import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { Plus, Users, FolderOpen, UserPlus } from 'lucide-react';

const SpacesList = () => {
  const user = useSelector(selectCurrentUser);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulation de chargement des espaces
    const loadSpaces = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data
      const mockSpaces = [
        {
          id: 1,
          nom: 'Campagne Printemps',
          description: 'Campagne publicitaire printemps',
          workspace_nom: 'Projet Marketing 2024',
          created_at: '2024-01-20',
          owner_id: user?.id,
          members_count: 3,
          role: 'admin'
        },
        {
          id: 2,
          nom: 'Réseaux Sociaux',
          description: 'Gestion des réseaux sociaux',
          workspace_nom: 'Projet Marketing 2024',
          created_at: '2024-02-01',
          owner_id: user?.id,
          members_count: 2,
          role: 'member'
        },
        {
          id: 3,
          nom: 'Analyse Performance',
          description: 'Rapports et analyses',
          workspace_nom: 'Développement Produit',
          created_at: '2024-02-15',
          owner_id: 3,
          members_count: 4,
          role: 'member'
        }
      ];

      setSpaces(mockSpaces);
      setLoading(false);
    };

    loadSpaces();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Espaces</h1>
          <p className="text-gray-600 mt-2">Organisez vos projets et listes de tâches</p>
        </div>
        <Link
          to="/spaces/create"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <Plus size={20} />
          Nouvel espace
        </Link>
      </div>

      {spaces.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <FolderOpen size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun espace</h3>
          <p className="text-gray-600 mb-4">Créez votre premier espace pour organiser vos projets</p>
          <Link
            to="/spaces/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Créer un espace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space) => (
            <div
              key={space.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {space.nom}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {space.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    Workspace: {space.workspace_nom}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  space.role === 'admin'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {space.role === 'admin' ? 'Admin' : 'Membre'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Créé le {new Date(space.created_at).toLocaleDateString('fr-FR')}</span>
                <span className="flex items-center gap-1">
                  <Users size={16} />
                  {space.members_count} membres
                </span>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-center text-sm">
                  Ouvrir
                </button>
                {space.role === 'admin' && (
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <UserPlus size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpacesList;