import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, UserPlus, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';

export default function WorkspacesPage() {
  const { workspaces, loadWorkspaces, addWorkspace, updateWorkspace, deleteWorkspace, inviteMember, removeMember } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);
  const [formData, setFormData] = useState({ nom: '', description: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'Membre' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const openCreateModal = () => {
    setEditingWorkspace(null);
    setFormData({ nom: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (ws: any) => {
    setEditingWorkspace(ws);
    setFormData({ nom: ws.nom, description: ws.description || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nom.trim()) return;
    setLoading(true);
    try {
      if (editingWorkspace) {
        await updateWorkspace(editingWorkspace.id, { nom: formData.nom, description: formData.description });
      } else {
        await addWorkspace({ nom: formData.nom, description: formData.description });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce workspace ?')) return;
    try {
      await deleteWorkspace(id);
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la suppression');
    }
  };

  const openInviteModal = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    setInviteForm({ email: '', role: 'Membre' });
    setIsInviteModalOpen(true);
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim() || !currentWorkspaceId) return;
    setLoading(true);
    try {
      await inviteMember(currentWorkspaceId, inviteForm.email, inviteForm.role);
      alert(`Invitation envoyée à ${inviteForm.email}`);
      setIsInviteModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (workspaceId: string, memberId: string) => {
    if (!window.confirm('Retirer ce membre ?')) return;
    try {
      await removeMember(workspaceId, memberId);
    } catch (error) {
      console.error(error);
      alert('Erreur lors du retrait');
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
                <h3 className="text-xl font-semibold text-gray-800 pr-12">{ws.nom}</h3>
                <p className="text-gray-500 text-sm mt-1">{ws.description || 'Aucune description'}</p>
                
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>{ws.membres?.length || 0} membre(s)</span>
                    </div>
                    <button onClick={() => openInviteModal(ws.id)} className="text-secondary text-sm hover:underline flex items-center gap-1">
                      <UserPlus className="h-3 w-3" /> Inviter
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ws.membres?.map((member: any) => (
                      <div key={member.id} className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 text-xs">
                        <span>{member.utilisateur?.username || member.id}</span>
                        <button onClick={() => handleRemoveMember(ws.id, member.id)} className="text-gray-400 hover:text-red-500">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
                  <span>Créé le {new Date(ws.createdAt).toLocaleDateString()}</span>
                  <Link to={`/workspace/${ws.id}`} className="inline-flex items-center text-secondary hover:underline">Ouvrir <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal création/édition */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingWorkspace ? "Modifier le workspace" : "Nouveau workspace"}>
        <div className="space-y-4">
          <input type="text" placeholder="Nom du workspace" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          <textarea placeholder="Description (optionnelle)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg" />
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button><Button onClick={handleSubmit} loading={loading}>{editingWorkspace ? "Enregistrer" : "Créer"}</Button></div>
        </div>
      </Modal>

      {/* Modal d'invitation */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Inviter un membre">
        <div className="space-y-4">
          <input type="email" placeholder="Email du membre" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
            <option value="Membre">Membre</option>
            <option value="Administrateur">Administrateur</option>
            <option value="Invité">Invité</option>
          </select>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Annuler</Button><Button onClick={handleInvite} loading={loading}>Envoyer l'invitation</Button></div>
        </div>
      </Modal>
    </div>
  );
}
