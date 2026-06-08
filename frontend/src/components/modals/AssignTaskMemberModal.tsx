// frontend/src/components/modals/AssignTaskMemberModal.tsx
import { useState, useEffect } from 'react';
import { tacheService } from '../../services/tache.service';
import { listeService } from '../../services/liste.service';
import { espaceService } from '../../services/espace.service';
import { workspaceService } from '../../services/workspace.service';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { getMemberDisplayName, getMemberEmail } from '../../utils/memberDisplay';

interface AssignTaskMemberModalProps {
  tacheId: string;
  listeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  source?: string;
}

export default function AssignTaskMemberModal({
  tacheId,
  listeId,
  isOpen,
  onClose,
  onSuccess,
}: AssignTaskMemberModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Charger les membres disponibles depuis la liste et ses parents.
  useEffect(() => {
    if (!isOpen || !listeId) return;

    const loadMembers = async () => {
      setLoading(true);
      setMemberError(null);
      try {
        const byUser = new Map<string, Member>();
        const addCandidates = (items: any[], source: string) => {
          items
            .filter((m: any) => m.role === 'Membre')
            .forEach((m: any) => {
              const id = m.id_utilisateur || m.id;
              if (!id || byUser.has(id)) return;
              byUser.set(id, {
                id,
                name: getMemberDisplayName(m),
                email: getMemberEmail(m),
                role: m.role,
                source,
              });
            });
        };

        const listMembers = await listeService.getMembers(listeId);
        addCandidates(listMembers, 'Liste');

        const liste = await listeService.getById(listeId);
        let resolvedWorkspaceId = liste.id_workspace || '';

        if (liste.id_espace) {
          try {
            const hierarchy = await espaceService.getHierarchy(liste.id_espace);
            const spaces = Array.isArray(hierarchy) ? hierarchy : [];
            for (const space of spaces) {
              if (!resolvedWorkspaceId && space.id_workspace) {
                resolvedWorkspaceId = space.id_workspace;
              }
              try {
                const spaceMembers = await espaceService.getMembers(space.id);
                addCandidates(spaceMembers, `Espace: ${space.nom || 'parent'}`);
              } catch {
                // Certains profils n'ont pas le droit de lister tous les parents.
              }
            }
          } catch {
            // La liste reste assignable via ses membres directs.
          }
        }

        if (resolvedWorkspaceId) {
          try {
            const workspaceMembers = await workspaceService.getMembers(resolvedWorkspaceId);
            addCandidates(workspaceMembers, 'Workspace');
          } catch {
            // La liste reste assignable via ses membres directs.
          }
        }

        setMembers(Array.from(byUser.values()));
      } catch (err) {
        console.error('Erreur chargement membres:', err);
        setMemberError('Impossible de charger les membres');
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [isOpen, listeId]);

  // Charger les membres déjà assignés
  useEffect(() => {
    if (!isOpen || !tacheId) return;

    const loadAssigned = async () => {
      try {
        const taskMembers = await tacheService.getMembers(tacheId);
        const formatted = taskMembers.map((m: any) => ({
          id: m.id_utilisateur || m.id,
          name: getMemberDisplayName(m),
          email: getMemberEmail(m),
          role: m.role || 'Membre',
        }));
        setAssignedMembers(formatted);
      } catch (err) {
        console.error('Erreur chargement membres assignés:', err);
      }
    };

    loadAssigned();
  }, [isOpen, tacheId]);

  const handleAssign = async () => {
    if (!selectedMemberId) return;
    setLoading(true);
    try {
      await tacheService.assignMember(tacheId, selectedMemberId);
      const newMember = members.find(m => m.id === selectedMemberId);
      if (newMember) {
        setAssignedMembers(prev => [...prev, newMember]);
      }
      setSelectedMemberId('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erreur assignation:', err);
      alert('Erreur lors de l\'assignation');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (memberId: string) => {
    setLoading(true);
    try {
      await tacheService.unassignMember(tacheId, memberId);
      setAssignedMembers(prev => prev.filter(m => m.id !== memberId));
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erreur désassignation:', err);
      alert('Erreur lors de la désassignation');
    } finally {
      setLoading(false);
    }
  };

  const availableMembers = members.filter(m => !assignedMembers.some(a => a.id === m.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assigner des membres à la tâche" size="md">
      <div className="space-y-4">
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
                    {member.source && <span className="text-xs text-gray-400 ml-2">{member.source}</span>}
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
                    {member.name} ({member.source || member.role})
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
            Aucun membre avec le rôle Membre disponible dans la liste, les espaces parents ou le workspace parent.
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
