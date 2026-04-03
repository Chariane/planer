import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice.js';
import { Plus, Users, Settings } from 'lucide-react';

const WorkspacesList = () => {
  const user = useSelector(selectCurrentUser);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulation de chargement des workspaces - Remplacer par appel API
    const loadWorkspaces = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data
      const mockWorkspaces = [
        {
          id: 1,
          nom: 'Projet Marketing 2024',
          description: 'Workspace pour la campagne marketing annuelle',
          created_at: '2024-01-15',
          owner_id: user?.id,
          members_count: 5,
          role: 'admin'
        },
        {
          id: 2,
          nom: 'Développement Produit',
          description: 'Espace de développement pour le nouveau produit',
          created_at: '2024-02-01',
          owner_id: user?.id,
          members_count: 8,
          role: 'member'
        },
        {
          id: 3,
          nom: 'Support Client',
          description: 'Gestion des tickets et support utilisateur',
          created_at: '2024-03-01',
          owner_id: 3, // Autre propriétaire
          members_count: 12,
          role: 'member'
        }
      ];

      setWorkspaces(mockWorkspaces);
      setLoading(false);
    };

    loadWorkspaces();
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
          <h1 className="text-3xl font-bold text-gray-900">Mes Workspaces</h1>
          <p className="text-gray-600 mt-2">Gérez vos environnements de travail</p>
        </div>
        <Link
          to="/workspaces/create"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <Plus size={20} />
          Nouveau Workspace
        </Link>
      </div>

      {workspaces.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Users size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun workspace</h3>
          <p className="text-gray-600 mb-4">Créez votre premier workspace pour commencer</p>
          <Link
            to="/workspaces/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Créer un workspace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {workspace.nom}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {workspace.description}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  workspace.role === 'admin'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {workspace.role === 'admin' ? 'Admin' : 'Membre'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Créé le {new Date(workspace.created_at).toLocaleDateString('fr-FR')}</span>
                <span className="flex items-center gap-1">
                  <Users size={16} />
                  {workspace.members_count} membres
                </span>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/workspaces/${workspace.id}`}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-center text-sm"
                >
                  Ouvrir
                </Link>
                {workspace.role === 'admin' && (
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Settings size={16} />
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

export default WorkspacesList;