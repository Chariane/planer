import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import {Button} from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const initialWorkspaces = [
  { id: '1', name: 'K-Planner Dev', description: 'Développement de la plateforme', members: 3, createdAt: new Date() },
  { id: '2', name: 'Marketing', description: 'Campagnes et contenu', members: 2, createdAt: new Date() },
];

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const openCreateModal = () => {
    setEditingWorkspace(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (ws) => {
    setEditingWorkspace(ws);
    setFormData({ name: ws.name, description: ws.description });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    if (editingWorkspace) {
      setWorkspaces(workspaces.map(ws =>
        ws.id === editingWorkspace.id ? { ...ws, name: formData.name, description: formData.description } : ws
      ));
    } else {
      const newWorkspace = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        members: 0,
        createdAt: new Date(),
      };
      setWorkspaces([newWorkspace, ...workspaces]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer ce workspace ?')) {
      setWorkspaces(workspaces.filter(ws => ws.id !== id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-3xl font-bold text-gray-900">Workspaces</h2><p className="text-gray-500 mt-1">Environnements de travail collaboratifs</p></div>
        <Button onClick={openCreateModal}><Plus className="h-4 w-4 mr-2" /> Nouveau workspace</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {workspaces.map((ws, idx) => (
            <motion.div key={ws.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }}>
              <Card className="relative group hover:shadow-lg transition-all">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(ws)} className="p-1 rounded hover:bg-gray-100 text-gray-500"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(ws.id)} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 pr-12">{ws.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{ws.description || 'Aucune description'}</p>
                <div className="flex justify-between items-center mt-4 text-xs text-gray-400">
                  <span>{ws.members} membre(s)</span>
                  <span>Créé le {new Date(ws.createdAt).toLocaleDateString()}</span>
                </div>
                <Link to={`/workspaces/${ws.id}/spaces`} className="mt-3 inline-flex items-center text-sm text-secondary hover:underline">Gérer les espaces <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingWorkspace ? "Modifier le workspace" : "Nouveau workspace"}>
        <div className="space-y-4">
          <input type="text" placeholder="Nom du workspace" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
          <textarea placeholder="Description (optionnelle)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button><Button onClick={handleSubmit}>{editingWorkspace ? "Enregistrer" : "Créer"}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
