import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice.js';
import { Users, Settings, Plus, FolderOpen, UserPlus } from 'lucide-react';

const WorkspaceDashboard = () => {
  const { id } = useParams();
  const user = useSelector(selectCurrentUser);
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulation de chargement des données
    const loadWorkspaceData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data
      const mockWorkspace = {
        id: parseInt(id),
        nom: 'Projet Marketing 2024',
        description: 'Workspace pour la campagne marketing annuelle',
        created_at: '2024-01-15',
        owner_id: user?.id,
        role: 'admin'
      };

      const mockMembers = [
        { id: 1, username: 'john_doe', nom: 'Doe', prenoms: 'John', role: 'admin', email: 'john@example.com' },
        { id: 2, username: 'jane_smith', nom: 'Smith', prenoms: 'Jane', role: 'member', email: 'jane@example.com' },
        { id: 3, username: 'bob_wilson', nom: 'Wilson', prenoms: 'Bob', role: 'member', email: 'bob@example.com' }
      ];

      const mockSpaces = [
        { id: 1, nom: 'Campagne Printemps', description: 'Campagne publicitaire printemps', members_count: 3 },
        { id: 2, nom: 'Réseaux Sociaux', description: 'Gestion des réseaux sociaux', members_count: 2 },
        { id: 3, nom: 'Analyse Performance', description: 'Rapports et analyses', members_count: 4 }
      ];

      setWorkspace(mockWorkspace);
      setMembers(mockMembers);
      setSpaces(mockSpaces);
      setLoading(false);
    };

    loadWorkspaceData();
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Workspace introuvable</h1>
          <Link to="/workspaces" className="text-indigo-600 hover:text-indigo-500">
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{workspace.nom}</h1>
          <p className="text-gray-600 mt-2">{workspace.description}</p>
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
            <span>Créé le {new Date(workspace.created_at).toLocaleDateString('fr-FR')}</span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              workspace.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {workspace.role === 'admin' ? 'Administrateur' : 'Membre'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {workspace.role === 'admin' && (
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              <UserPlus size={16} />
              Inviter
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
            <Settings size={16} />
            Paramètres
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Espaces */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Espaces</h2>
            <Link
              to="/spaces/create"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              <Plus size={16} />
              Nouvel espace
            </Link>
          </div>

          {spaces.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FolderOpen size={48} className="mx-auto text-gray-400 mb-4" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {spaces.map((space) => (
                <div key={space.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 mb-2">{space.nom}</h3>
                  <p className="text-gray-600 text-sm mb-3">{space.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Users size={14} />
                      {space.members_count} membres
                    </span>
                    <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                      Ouvrir →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Membres */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Membres ({members.length})</h2>
            {workspace.role === 'admin' && (
              <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                Gérer
              </button>
            )}
          </div>

          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">
                      {member.prenoms[0]}{member.nom[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.prenoms} {member.nom}
                    </p>
                    <p className="text-xs text-gray-500">@{member.username}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  member.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {member.role === 'admin' ? 'Admin' : 'Membre'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceDashboard;