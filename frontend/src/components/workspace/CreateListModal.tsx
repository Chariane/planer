import { useState } from 'react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}

export function CreateListModal({ isOpen, onClose, onCreate }: CreateListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate(name, description);
      setName('');
      setDescription('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Créer une nouvelle liste" size="md">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Nom de la liste (ex: Développement, Marketing...)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded-lg focus:ring-secondary focus:border-secondary"
          autoFocus
        />
        <textarea
          placeholder="Description (optionnelle)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full p-2 border rounded-lg"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} loading={loading}>Créer</Button>
        </div>
      </div>
    </Modal>
  );
}