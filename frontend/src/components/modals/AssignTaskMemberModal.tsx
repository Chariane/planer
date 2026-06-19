// frontend/src/components/modals/AssignTaskMemberModal.tsx
import { useState, useEffect } from 'react';
import { tacheService } from '../../services/tache.service';
import { listeService } from '../../services/liste.service';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { getMemberContactLabel, getMemberDisplayName } from '../../utils/memberDisplay';
import { absenceService } from '../../services/absence.service';
import { AvailabilityBadge } from '../ui/AvailabilityBadge';
import { MemberAvatar } from '../ui/MemberAvatar';
import type { UserAvailabilityOut } from '../../types';

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
  photo_base64?: string | null;
  username?: string;
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
  const [listAvailability, setListAvailability] = useState<UserAvailabilityOut[]>([]);

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
                email: getMemberContactLabel(m),
                role: m.role,
                source,
              });
            });
        };

        const listMembers = await listeService.getMembers(listeId);
        addCandidates(listMembers, 'Liste');

        setMembers(Array.from(byUser.values()));

        // Fetch availability
        const userIds = Array.from(byUser.keys());
        if (userIds.length > 0) {
          const avail = await absenceService.getAvailability(listeId, userIds);
          setListAvailability(avail);
        }
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
          email: getMemberContactLabel(m),
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

  const availableMembers = members.filter(m => m.role !== 'Invité' && !assignedMembers.some(a => a.id === m.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assigner des membres à la tâche" size="md">
      <div className="space-y-4">
        {memberError && (
          <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg font-medium">{memberError}</div>
        )}

        {/* Membres assignés */}
        {assignedMembers.length > 0 && (
          <div>
            <label className="block text-[10px] font-black text-theme-muted uppercase tracking-widest mb-2 opacity-60">
              Membres assignés ({assignedMembers.length})
            </label>
            <div className="space-y-1">
              {assignedMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2.5 bg-theme-surface/50 border border-theme-border-subtle rounded-xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <MemberAvatar member={member} size="xs" />
                    <span className="text-sm font-bold text-theme-main">{member.name}</span>
                    <AvailabilityBadge availability={listAvailability.find(a => a.id_utilisateur === member.id)} showText size="sm" />
                  </div>
                  <div>
                    <span className="text-xs text-secondary font-bold ml-2 uppercase tracking-tighter">({member.role})</span>
                    {member.source && <span className="text-[10px] text-theme-muted ml-2 italic tracking-tight">{member.source}</span>}
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
            <label className="block text-[10px] font-black text-theme-muted uppercase tracking-widest mb-2 opacity-60">
              Ajouter un membre
            </label>
            <div className="flex gap-2">
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="flex-1 p-2 border border-theme-border-subtle bg-theme-surface rounded-lg text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
              >
                <option value="">Sélectionner un membre...</option>
                {availableMembers.map(member => (
                  <option key={member.id} value={member.id} className={!listAvailability.find(a => a.id_utilisateur === member.id)?.is_available ? 'text-rose-500' : ''}>
                    {member.name} ({member.source || member.role}) {!listAvailability.find(a => a.id_utilisateur === member.id)?.is_available ? ' [INDISPONIBLE]' : ''}
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
          <div className="text-center text-theme-muted py-6 font-medium italic opacity-60">
            Aucun membre avec le rôle Membre disponible dans la liste, les espaces parents ou le workspace parent.
          </div>
        )}

        {loading && (
          <div className="text-center text-theme-muted py-4 font-medium italic opacity-60">Chargement...</div>
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
