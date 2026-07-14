import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const { addWorkspace } = useApp();
  const [formData, setFormData] = useState({ nom: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      setError('Le nom du workspace est requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await addWorkspace({ nom: formData.nom, description: formData.description });
      setFormData({ nom: '', description: '' });
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Erreur lors de la création du workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Créer un nouveau workspace" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom du workspace *</label>
          <input
            type="text"
            value={formData.nom}
            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
            placeholder="Ex: Mon projet"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnelle)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
            placeholder="Décrivez brièvement ce workspace..."
          />
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} type="button" className="w-full sm:w-auto">Annuler</Button>
          <Button type="submit" loading={loading} className="w-full sm:w-auto">Créer</Button>
        </div>
      </form>
    </Modal>
  );
}
