import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setLoading } from '../../features/auth/authSlice.js';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus } from 'lucide-react';

const CreateWorkspace = () => {
  const [formData, setFormData] = useState({
    nom: '',
    description: ''
  });
  const [loading, setLocalLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

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
      toast.success('Workspace créé avec succès !');
      navigate('/workspaces');
    } catch (error) {
      toast.error('Erreur lors de la création du workspace.');
    } finally {
      setLocalLoading(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <button
          onClick={() => navigate('/workspaces')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Retour aux workspaces
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Créer un nouveau workspace</h1>
        <p className="text-gray-600 mt-2">
          Organisez votre travail en créant un environnement dédié
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-2">
              Nom du workspace *
            </label>
            <input
              type="text"
              id="nom"
              name="nom"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: Projet Marketing 2024"
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
              placeholder="Décrivez l'objectif de ce workspace..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-blue-900 mb-2">À propos des workspaces</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Un workspace regroupe plusieurs espaces de travail</li>
              <li>• Vous pouvez inviter des membres avec différents rôles</li>
              <li>• Les admins peuvent gérer les paramètres et les membres</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/workspaces')}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !formData.nom.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Plus size={20} />
                Créer le workspace
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateWorkspace;