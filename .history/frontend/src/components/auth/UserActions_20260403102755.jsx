import React from 'react';
import { Edit, Trash2, Eye, UserCheck, UserX } from 'lucide-react';

const UserActions = ({ user, onEdit, onDelete, onView, onToggleStatus }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onView(user)}
        className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
        title="Voir les détails"
      >
        <Eye size={16} />
      </button>

      <button
        onClick={() => onEdit(user)}
        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
        title="Modifier"
      >
        <Edit size={16} />
      </button>

      <button
        onClick={() => onToggleStatus(user)}
        className={`p-1 rounded ${
          user.is_active
            ? 'text-red-600 hover:text-red-800 hover:bg-red-100'
            : 'text-green-600 hover:text-green-800 hover:bg-green-100'
        }`}
        title={user.is_active ? 'Désactiver' : 'Activer'}
      >
        {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
      </button>

      <button
        onClick={() => onDelete(user)}
        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
        title="Supprimer"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default UserActions;