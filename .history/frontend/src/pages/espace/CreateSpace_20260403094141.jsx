import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setLoading } from '../../features/auth/authSlice';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, FolderOpen } from 'lucide-react';

const CreateSpace = () => {
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    workspace_id: ''
  });
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLocalLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    // Charger les workspaces disponibles
    const loadWorkspaces = async () => {
      // Mock data - Remplacer par appel API
      const mockWorkspaces = [
        { id: 1, nom: 'Projet Marketing 2024' },
        { id: 2, nom: 'Développement Produit' },
        { id: 3, nom: 'Support Client' }
      ];
      setWorkspaces(mockWorkspaces);
    };

    loadWorkspaces();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    dispatch(setLoading(true));

    try {
      // Simulation de création - Remplacer par appel API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock success
      toast.success('Espace créé avec succès !');
      navigate('/spaces');
    } catch (error) {
      toast.error('Erreur lors de la création de l\'espace.');
    } finally {
      setLocalLoading(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <button
          onClick={() => navigate('/spaces')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Retour aux espaces
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Créer un nouvel espace</h1>
        <p className="text-gray-600 mt-2">
          Organisez vos projets et listes de tâches dans un espace dédié
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="workspace_id" className="block text-sm font-medium text-gray-700 mb-2">
              Workspace parent *
            </label>
            <select
              id="workspace_id"
              name="workspace_id"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.workspace_id}
              onChange={handleChange}
            >
              <option value="">Sélectionner un workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'espace *
            </label>
            <input
              type="text"
              id="nom"
              name="nom"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: Campagne Printemps"
              value={formData.nom}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Décrivez l'objectif de cet espace..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-blue-900 mb-2">À propos des espaces</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Un espace appartient à un workspace</li>
              <li>• Vous pouvez créer des sous-espaces pour une organisation hiérarchique</li>
              <li>• Invitez des membres spécifiques à rejoindre l'espace</li>
              <li>• Organisez vos listes, tâches et projets dans l'espace</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/spaces')}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !formData.nom.trim() || !formData.workspace_id}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Plus size={20} />
                Créer l'espace
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSpace;