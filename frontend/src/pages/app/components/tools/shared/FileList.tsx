// frontend/src/pages/app/components/tools/shared/FileList.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Download, Trash2, FileText } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface FileItem {
  id: string;
  nom: string;
  url_fichier?: string;
  type_fichier?: string;
  created_at?: string;
  authorName?: string;
  owner_user_id?: string | null;
  meta_donnees?: Record<string, any>;
}

interface FileListProps {
  files: FileItem[];
  loading?: boolean;
  onView?: (file: FileItem) => void;
  onDownload?: (file: FileItem) => void;
  onDelete?: (fileId: string) => void;
  currentUserId?: string | null;
  isCreator?: boolean;
  getFileFullUrl?: (url?: string) => string;
  formatDate?: (date?: string | null) => string;
  emptyTitle?: string;
}

const formatDateDefault = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
};

export const FileList = ({
  files,
  loading = false,
  onView,
  onDownload,
  onDelete,
  currentUserId,
  isCreator = false,
  getFileFullUrl = (url) => url || '',
  formatDate = formatDateDefault,
  emptyTitle = 'Aucun document joint',
}: FileListProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-theme-surface-hover/20 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return <EmptyState icon={FileText} title={emptyTitle} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {files.map((file, idx) => {
          const isOwner = file.owner_user_id === currentUserId;
          const canDelete = isOwner || isCreator;

          return (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="p-4 group/item hover:bg-theme-surface-hover/40 transition-all border border-theme-border-subtle bg-theme-surface rounded-2xl flex items-center justify-between gap-4 shadow-theme-sm">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary group-hover/item:shadow-[0_0_20px_rgba(var(--secondary-rgb),0.3)] transition-all flex-shrink-0">
                    <FileText size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-theme-main truncate tracking-tight text-sm mb-0.5" title={file.nom}>
                      {file.nom}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {file.authorName && (
                        <span className="text-[9px] font-black uppercase text-secondary/60 tracking-widest">
                          Par {file.authorName}
                        </span>
                      )}
                      <span className="text-[9px] font-black text-theme-muted/40 uppercase tracking-widest">
                        {formatDate(file.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {onView && (
                    <button
                      onClick={() => onView(file)}
                      className="p-2 text-theme-muted hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all"
                      title="Visualiser"
                    >
                      <Eye size={18} />
                    </button>
                  )}
                  {onDownload && (
                    <button
                      onClick={() => onDownload(file)}
                      className="p-2 text-theme-muted hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                      title="Télécharger"
                    >
                      <Download size={18} />
                    </button>
                  )}
                  {onDelete && canDelete && (
                    <button
                      onClick={() => onDelete(file.id)}
                      className="p-2 text-theme-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};