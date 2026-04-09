import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import Card from '../components/ui/Card';
import {Button} from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const mockSpaces = {
  '1': [
    { id: 's1', name: 'Frontend', description: 'Interface utilisateur', createdAt: new Date() },
    { id: 's2', name: 'Backend', description: 'API et services', createdAt: new Date() },
  ],
  '2': [
    { id: 's3', name: 'Campagne print', description: 'Affiches et flyers', createdAt: new Date() },
  ],
};

export default function SpacesPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (workspaceId && mockSpaces[workspaceId]) setSpaces(mockSpaces[workspaceId]);
    else setSpaces([]);
  }, [workspaceId]);

  const openCreateModal = () => { setEditingSpace(null); setFormData({ name: '', description: '' }); setIsModalOpen(true); };
  const openEditModal = (space) => { setEditingSpace(space); setFormData({ name: space.name, description: space.description }); setIsModalOpen(true); };
  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    if (editingSpace) {
      setSpaces(spaces.map(s => s.id === editingSpace.id ? { ...s, name: formData.name, description: formData.description } : s));
    } else {
      setSpaces([...spaces, { id: Date.now().toString(), name: formData.name, description: formData.description, createdAt: new Date() }]);
    }
    setIsModalOpen(false);
  };
  const handleDelete = (id) => { if (window.confirm('Supprimer cet espace ?')) setSpaces(spaces.filter(s => s.id !== id)); };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/workspaces')} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
        <div><h2 className="text-3xl font-bold text-gray-900">Espaces de travail</h2><p className="text-gray-500 mt-1">Organisez vos projets par espaces</p></div>
        <Button onClick={openCreateModal} className="ml-auto"><Plus className="h-4 w-4 mr-2" /> Nouvel espace</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {spaces.map((space, idx) => (
            <motion.div key={space.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }}>
              <Card className="relative group hover:shadow-lg transition-all">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(space)} className="p-1 rounded hover:bg-gray-100 text-gray-500"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(space.id)} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 pr-12">{space.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{space.description || 'Aucune description'}</p>
                <div className="mt-4 text-xs text-gray-400">Créé le {new Date(space.createdAt).toLocaleDateString()}</div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSpace ? "Modifier l'espace" : "Nouvel espace"}>
        <div className="space-y-4">
          <input type="text" placeholder="Nom de l'espace" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
          <textarea placeholder="Description (optionnelle)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button><Button onClick={handleSubmit}>{editingSpace ? "Enregistrer" : "Créer"}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
