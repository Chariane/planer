// frontend/src/components/ui/ConfirmModal.tsx
import { AlertTriangle } from 'lucide-react';
import { sanitizeText } from '../../utils/sanitize';
import Modal from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  isLoading?: boolean;
  loadingText?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmVariant = 'danger',
  isLoading = false,
  loadingText = 'Traitement...',
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={sanitizeText(title)} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-theme-surface-hover/50 rounded-xl border border-theme-border-subtle">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-theme-main leading-relaxed">{sanitizeText(message)}</p>
        </div>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto">
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant === 'danger' ? 'primary' : 'secondary'}
            onClick={handleConfirm}
            loading={isLoading}
            className={`${confirmVariant === 'danger' ? 'bg-red-500 hover:bg-red-600' : ''} w-full sm:w-auto`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
