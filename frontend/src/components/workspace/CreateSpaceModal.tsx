// frontend/src/components/workspace/CreateSpaceModal.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, FolderPlus } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { GlassCard } from '../ui/GlassCard';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
  parentName?: string;
}

export function CreateSpaceModal({ isOpen, onClose, onCreate, parentName }: CreateSpaceModalProps) {
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-2 left-2 right-2 z-50 sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <GlassCard className="relative max-h-[94dvh] overflow-y-auto overflow-x-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                      <FolderPlus className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-bold text-gray-800 sm:text-xl">
                        Créer un espace
                      </h2>
                      {parentName && (
                        <p className="break-words text-sm text-gray-500">
                          Dans : {parentName}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-4 space-y-4 sm:p-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'espace
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Design, Développement, Marketing..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez brièvement l'objectif de cet espace..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 resize-none"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
                  <AnimatedButton variant="outline" onClick={onClose} className="flex-1">
                    Annuler
                  </AnimatedButton>
                  <AnimatedButton 
                    variant="primary" 
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={!name.trim()}
                    className="flex-1"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Créer l'espace
                  </AnimatedButton>
                </div>
              </div>

              {/* Effet décoratif */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full filter blur-2xl -z-10" />
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
