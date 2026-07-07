// frontend/src/components/modals/InviteEspaceMemberModal.tsx
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { espaceService } from '../../services/espace.service';
import { sanitizeApiErrorMessage } from '../../services/api';
import { sanitizeText } from '../../utils/sanitize';
import { isValidInviteIdentifier } from '../../utils/inviteIdentifier';
import {
  ROLES,
  getRoleLabel,
  getRoleDescription,
} from '../../lib/roleHierarchy';
import { toast } from '../ui/Toast'; 

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

  const isFormValid = email.trim();

  const resetForm = () => {
    setEmail('');
    setSelectedRole(ROLES.GUEST);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error(sanitizeText('Email ou username requis'));
      return;
    }

    if (!isValidInviteIdentifier(email)) {
      toast.error(sanitizeText("L'email ou le username ne doit pas contenir d'espaces."));
      return;
    }

    setLoading(true);

    try {
      await espaceService.inviteMember(espaceId, email, selectedRole);
      
      toast.success(sanitizeText(`Invitation envoyée à ${email} avec le rôle ${getRoleLabel(selectedRole)}`));
      
      if (onSuccess) {
        onSuccess(email, selectedRole);
      }

      setTimeout(() => {
        resetForm();
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Erreur invitation espace:', err);
      const message = sanitizeApiErrorMessage(err, 'Erreur lors de l\'invitation');

      if (err.status === 409) {
        toast.error(sanitizeText(message));
      } else if (err.status === 400) {
        toast.error(sanitizeText(message || 'Email ou username invalide'));
      } else if (err.status === 404) {
        toast.error(sanitizeText('L\'espace n\'existe plus ou accès refusé'));
      } else if (err.status === 403) {
        toast.error(sanitizeText('Vous n\'avez pas la permission d\'inviter des membres'));
      } else {
        toast.error(sanitizeText(message));
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
            {sanitizeText('Invitant : accès en lecture seule')}<br />
            {sanitizeText('Administrateur : peut gérer l\'espace et ses membres')}<br />
            {sanitizeText('⚡ Le rôle Membre sera attribué automatiquement lors de l\'assignation à une liste ou une tâche.')}
          </p>
        </div>

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