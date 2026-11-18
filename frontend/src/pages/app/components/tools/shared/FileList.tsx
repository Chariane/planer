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
              <div className="relative overflow-hidden p-5 group/item transition-all duration-300 border border-theme-border-subtle/80 bg-gradient-to-br from-white/80 via-white/40 to-white/90 dark:from-slate-900/90 dark:via-slate-800/60 dark:to-slate-950/90 rounded-[2rem] flex items-center justify-between gap-4 shadow-theme-md hover:shadow-theme-xl hover:-translate-y-1 hover:border-primary/50 dark:hover:border-cyan-500/40 backdrop-blur-xl">
                {/* Lueur on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-transparent dark:via-cyan-500/10 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative z-10 flex items-center gap-4 min-w-0">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent dark:from-cyan-500/20 dark:to-blue-600/10 border border-primary/20 dark:border-cyan-500/30 flex items-center justify-center text-primary dark:text-cyan-400 transition-all duration-300 group-hover/item:scale-110 group-hover/item:rotate-6 flex-shrink-0 shadow-inner backdrop-blur-md">
                    <FileText size={24} className="drop-shadow-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-theme-main truncate tracking-tight text-sm mb-0.5" title={file.nom}>
                      {file.nom}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {file.authorName && (
                        <span className="text-[9px] font-black uppercase text-secondary dark:text-orange-400 tracking-widest">
                          Par {file.authorName}
                        </span>
                      )}
                      <span className="text-[9px] font-black text-theme-muted uppercase tracking-widest">
                        {formatDate(file.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity duration-300 bg-white/70 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-white/60 dark:border-white/10 backdrop-blur-md">
                  {onView && (
                    <button
                      onClick={() => onView(file)}
                      className="p-2.5 text-theme-muted hover:text-primary hover:bg-primary/10 rounded-xl transition-all hover:scale-110 active:scale-95"
                      title="Visualiser"
                    >
                      <Eye size={18} />
                    </button>
                  )}
                  {onDownload && (
                    <button
                      onClick={() => onDownload(file)}
                      className="p-2.5 text-theme-muted hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all hover:scale-110 active:scale-95"
                      title="Télécharger"
                    >
                      <Download size={18} />
                    </button>
                  )}
                  {onDelete && canDelete && (
                    <button
                      onClick={() => onDelete(file.id)}
                      className="p-2.5 text-theme-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all hover:scale-110 active:scale-95"
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