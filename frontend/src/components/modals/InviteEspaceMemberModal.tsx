// frontend/src/components/modals/InviteEspaceMemberModal.tsx

import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { espaceService } from '../../services/espace.service';
import { sanitizeApiErrorMessage } from '../../services/api';
import { isValidInviteIdentifier } from '../../utils/inviteIdentifier';
import {
  ROLES,
  getRoleLabel,
  getRoleDescription,
} from '../../lib/roleHierarchy';

interface InviteEspaceMemberModalProps {
  espaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (identifier: string, role: string) => void;
  
  // Role actuel de l'utilisateur dans cet espace (pour validation hiérarchique)
  userCurrentRole?: string | null;
  
  // titre/description personnalisés
  title?: string;
}

// Rôles disponibles pour l'invitation (Invité ou Administrateur)
const INVITATION_ROLES = [ROLES.GUEST, ROLES.ADMIN];

export default function InviteEspaceMemberModal({
  espaceId,
  isOpen,
  onClose,
  onSuccess,
  title = 'Inviter un membre',
}: InviteEspaceMemberModalProps) {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>(ROLES.GUEST);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isFormValid = email.trim();

  const resetForm = () => {
    setEmail('');
    setSelectedRole(ROLES.GUEST);
    setError(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email ou username requis');
      return;
    }

    if (!isValidInviteIdentifier(email)) {
      setError("L'email ou le username ne doit pas contenir d'espaces.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await espaceService.inviteMember(espaceId, email, selectedRole);
      
      setSuccessMessage(`Invitation envoyée à ${email} avec le rôle ${getRoleLabel(selectedRole)}`);
      
      if (onSuccess) {
        onSuccess(email, selectedRole);
      }

      setTimeout(() => {
        resetForm();
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('❌ Erreur invitation espace:', err);
      const message = sanitizeApiErrorMessage(err, 'Erreur lors de l\'invitation');

      if (err.status === 409) {
        setError(message);
      } else if (err.status === 400) {
        setError(message || 'Email ou username invalide');
      } else if (err.status === 404) {
        setError('L\'espace n\'existe plus ou accès refusé');
      } else if (err.status === 403) {
        setError('Vous n\'avez pas la permission d\'inviter des membres');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-5">
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email ou username
          </label>
          <input
            type="text"
            placeholder="john.doe@example.com ou username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* Role Selection - Limité à Invité et Administrateur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rôle
          </label>
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setError(null);
            }}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            {INVITATION_ROLES.map((role) => (
              <option key={role} value={role}>
                {getRoleLabel(role)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {getRoleDescription(selectedRole)}
          </p>
        </div>

        {/* Informations sur les rôles */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            ℹ️ <strong>Invitant</strong> : accès en lecture seule<br />
            ℹ️ <strong>Administrateur</strong> : peut gérer l'espace et ses membres<br />
            ⚡ Le rôle <strong>Membre</strong> sera attribué automatiquement lors de l'assignation à une liste ou une tâche.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid || loading}
            loading={loading}
          >
            Inviter
          </Button>
        </div>
      </form>
    </Modal>
  );
}
