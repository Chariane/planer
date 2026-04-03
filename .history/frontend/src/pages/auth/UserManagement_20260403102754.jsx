import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

// Import des composants
import UserStats from '../../components/auth/UserStats';
import UserFilters from '../../components/auth/UserFilters';
import UserList from '../../components/auth/UserList';
import UserModal from '../../components/auth/UserModal';

const UserManagement = () => {
  const currentUser = useSelector(selectCurrentUser);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    // Simulation de chargement des utilisateurs
    const loadUsers = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data
      const mockUsers = [
        {
          id: 1,
          email: 'admin@kplaner.com',
          username: 'admin',
          nom: 'Admin',
          prenoms: 'Principal',
          role: 'super_admin',
          is_active: true,
          created_at: '2024-01-01'
        },
        {
          id: 2,
          email: 'john.doe@example.com',
          username: 'john_doe',
          nom: 'Doe',
          prenoms: 'John',
          role: 'user',
          is_active: true,
          created_at: '2024-01-15'
        },
        {
          id: 3,
          email: 'jane.smith@example.com',
          username: 'jane_smith',
          nom: 'Smith',
          prenoms: 'Jane',
          role: 'entreprise',
          is_active: true,
          created_at: '2024-02-01'
        },
        {
          id: 4,
          email: 'inactive@example.com',
          username: 'inactive_user',
          nom: 'User',
          prenoms: 'Inactive',
          role: 'user',
          is_active: false,
          created_at: '2024-03-01'
        }
      ];

      setUsers(mockUsers);
      setLoading(false);
    };

    loadUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      // Simulation de l'appel API
      await new Promise(resolve => setTimeout(resolve, 500));

      setUsers(users.map(u =>
        u.id === user.id ? { ...u, is_active: !user.is_active } : u
      ));

      toast.success(`Utilisateur ${!user.is_active ? 'activé' : 'désactivé'} avec succès`);
    } catch (error) {
      toast.error('Erreur lors de la modification du statut');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      // Simulation de l'appel API
      await new Promise(resolve => setTimeout(resolve, 500));

      setUsers(users.filter(u => u.id !== user.id));
      toast.success('Utilisateur supprimé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSaveUser = async (userData) => {
    try {
      // Simulation de l'appel API
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (editingUser) {
        // Modification
        setUsers(users.map(u =>
          u.id === editingUser.id ? { ...u, ...userData } : u
        ));
        toast.success('Utilisateur modifié avec succès');
      } else {
        // Création
        const newUser = {
          ...userData,
          id: Math.max(...users.map(u => u.id)) + 1,
          created_at: new Date().toISOString().split('T')[0]
        };
        setUsers([...users, newUser]);
        toast.success('Utilisateur créé avec succès');
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
      throw error;
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowCreateModal(true);
  };

  const handleViewUser = (user) => {
    // Pour l'instant, on ouvre juste le modal d'édition
    handleEditUser(user);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingUser(null);
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600 mt-2">Gérez les comptes utilisateurs et leurs rôles</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <UserPlus size={20} />
          Nouveau utilisateur
        </button>
      </div>

      <UserStats users={users} />

      <UserFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterRole={filterRole}
        onFilterChange={setFilterRole}
      />

      <UserList
        users={users}
        searchTerm={searchTerm}
        filterRole={filterRole}
        currentUser={currentUser}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onToggleStatus={handleToggleStatus}
        onView={handleViewUser}
      />

      <UserModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        user={editingUser}
        onSave={handleSaveUser}
      />
    </div>
  );
};

export default UserManagement;