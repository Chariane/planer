import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, ArrowRight, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import {Button} from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import type { Workspace, Member } from '../types';

// Données initiales
const initialWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'K-Planner Dev',
    description: 'Développement de la plateforme',
    members: [
      { id: 'u1', name: 'Thomas D.', email: 'thomas@kplaner.com', role: 'admin' },
      { id: 'u2', name: 'Alice M.', email: 'alice@kplaner.com', role: 'member' },
      { id: 'u3', name: 'Bob L.', email: 'bob@kplaner.com', role: 'member' },
    ],
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'Marketing',
    description: 'Campagnes et contenu',
    members: [
      { id: 'u4', name: 'Sophie L.', email: 'sophie@kplaner.com', role: 'admin' },
    ],
    createdAt: new Date(),
  },
];

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' });

  const openCreateModal = () => {
    setEditingWorkspace(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (ws: Workspace) => {
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
      const newWorkspace: Workspace = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        members: [],
        createdAt: new Date(),
      };
      setWorkspaces([newWorkspace, ...workspaces]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Supprimer ce workspace ?')) {
      setWorkspaces(workspaces.filter(ws => ws.id !== id));
    }
  };

  const openInviteModal = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    setInviteForm({ name: '', email: '' });
    setIsInviteModalOpen(true);
  };

  const handleInvite = () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;
    if (!currentWorkspaceId) return;

    const newMember: Member = {
      id: Date.now().toString(),
      name: inviteForm.name,
      email: inviteForm.email,
      role: 'member',
    };

    setWorkspaces(workspaces.map(ws =>
      ws.id === currentWorkspaceId
        ? { ...ws, members: [...ws.members, newMember] }
        : ws
    ));
    setIsInviteModalOpen(false);
  };

  const removeMember = (workspaceId: string, memberId: string) => {
    if (window.confirm('Retirer ce membre du workspace ?')) {
      setWorkspaces(workspaces.map(ws =>
        ws.id === workspaceId
          ? { ...ws, members: ws.members.filter(m => m.id !== memberId) }
          : ws
      ));
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
                
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>{ws.members.length} membre(s)</span>
                    </div>
                    <button onClick={() => openInviteModal(ws.id)} className="text-secondary text-sm hover:underline flex items-center gap-1">
                      <UserPlus className="h-3 w-3" /> Inviter
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ws.members.map(member => (
                      <div key={member.id} className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 text-xs">
                        <span>{member.name}</span>
                        <button onClick={() => removeMember(ws.id, member.id)} className="text-gray-400 hover:text-red-500">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
                  <span>Créé le {new Date(ws.createdAt).toLocaleDateString()}</span>
                  <Link to={`/workspaces/${ws.id}/spaces`} className="inline-flex items-center text-secondary hover:underline">Espaces <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </div>
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

      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Inviter un membre">
        <div className="space-y-4">
          <input type="text" placeholder="Nom complet" value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
          <input type="email" placeholder="Email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" />
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Annuler</Button><Button onClick={handleInvite}>Envoyer l'invitation</Button></div>
        </div>
      </Modal>
    </div>
  );
}
