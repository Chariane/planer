// frontend/src/components/modals/AssignListMemberModal.tsx
import { useState, useEffect } from 'react';
import { listeService } from '../../services/liste.service';
import { espaceService } from '../../services/espace.service';
import { workspaceService } from '../../services/workspace.service';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';

interface AssignListMemberModalProps {
  listeId: string;
  espaceId?: string;
  workspaceId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AssignListMemberModal({
  listeId,
  espaceId,
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
}: AssignListMemberModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Charger les membres disponibles depuis l'espace ou le workspace
  useEffect(() => {
    if (!isOpen) return;

    const loadMembers = async () => {
      setLoading(true);
      setMemberError(null);
      try {
        let spaceMembers: any[] = [];
        
        if (espaceId) {
          spaceMembers = await espaceService.getMembers(espaceId);
        } else if (workspaceId) {
          spaceMembers = await workspaceService.getMembers(workspaceId);
        }

        const formattedMembers: Member[] = spaceMembers.map((m: any) => ({
          id: m.id_utilisateur || m.id,
          name: m.utilisateur?.nom || m.utilisateur?.username || 'Inconnu',
          email: m.utilisateur?.email || '',
          role: m.role,
        }));
        setMembers(formattedMembers);
      } catch (err) {
        console.error('Erreur chargement membres:', err);
        setMemberError('Impossible de charger les membres');
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [isOpen, espaceId, workspaceId]);

  // Charger les membres déjà assignés à la liste
  useEffect(() => {
    if (!isOpen || !listeId) return;

    const loadAssigned = async () => {
      try {
        const listMembers = await listeService.getMembers(listeId);
        const formatted = listMembers.map((m: any) => ({
          id: m.id_utilisateur || m.id,
          name: m.utilisateur?.username || m.utilisateur?.nom || 'Inconnu',
          email: m.utilisateur?.email || '',
          role: m.role || 'Membre',
        }));
        setAssignedMembers(formatted);
      } catch (err) {
        console.error('Erreur chargement membres assignés:', err);
      }
    };

    loadAssigned();
  }, [isOpen, listeId]);

  const handleAssign = async () => {
    if (!selectedMemberId) return;
    setLoading(true);
    try {
      await listeService.assignMember(listeId, selectedMemberId);
      const newMember = members.find(m => m.id === selectedMemberId);
      if (newMember) {
        setAssignedMembers(prev => [...prev, newMember]);
      }
      setSelectedMemberId('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erreur assignation:', err);
      alert('Erreur lors de l\'assignation du membre à la liste');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (memberId: string) => {
    setLoading(true);
    try {
      await listeService.unassignMember(listeId, memberId);
      setAssignedMembers(prev => prev.filter(m => m.id !== memberId));
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erreur désassignation:', err);
      alert('Erreur lors du retrait du membre');
    } finally {
      setLoading(false);
    }
  };

  const availableMembers = members.filter(m => !assignedMembers.some(a => a.id === m.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assigner des membres à la liste" size="md">
      <div className="space-y-4">
        <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
          💡 Les membres assignés à une liste peuvent voir et gérer les tâches de cette liste.
        </div>

        {memberError && (
          <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{memberError}</div>
        )}

        {/* Membres assignés */}
        {assignedMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Membres assignés ({assignedMembers.length})
            </label>
            <div className="space-y-1">
              {assignedMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <span className="text-sm font-medium">{member.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({member.role})</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnassign(member.id)}
                    disabled={loading}
                  >
                    Retirer
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ajouter un membre */}
        {availableMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ajouter un membre
            </label>
            <div className="flex gap-2">
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-secondary"
              >
                <option value="">Sélectionner un membre...</option>
                {availableMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
              <Button onClick={handleAssign} disabled={!selectedMemberId || loading}>
                Assigner
              </Button>
            </div>
          </div>
        )}

        {availableMembers.length === 0 && assignedMembers.length === 0 && !loading && (
          <div className="text-center text-gray-400 py-4">
            Aucun membre disponible. Invitez d'abord des membres dans l'espace.
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-400 py-2">Chargement...</div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}