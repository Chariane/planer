// frontend/src/pages/app/components/tools/shared/FileSection.tsx
import { motion } from 'framer-motion';
import { Upload, Plus, Edit, Paperclip, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';
import { FileList } from './FileList';

interface FileSectionProps {
  files: any[];
  loading: boolean;
  canAddFiles: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreate: () => void;
  onDelete: (fileId: string) => void;
  onDownload: (file: any) => void;
  fileForm: { nom: string; url_fichier: string; type_fichier: string };
  setFileForm: (form: any) => void;
  isUploading: boolean;
  currentUserId?: string | null;
  isCreator: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const FileSection = ({
  files,
  loading,
  canAddFiles,
  onUpload,
  onCreate,
  onDelete,
  onDownload,
  fileForm,
  setFileForm,
  isUploading,
  currentUserId,
  isCreator,
  fileInputRef,
}: FileSectionProps) => {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
      <div className="p-6 border border-theme-border-subtle bg-theme-surface/30 backdrop-blur-xl rounded-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Upload className="h-5 w-5 text-secondary" />
          <h4 className="text-[10px] font-black text-theme-main uppercase tracking-[0.2em]">Joindre un document</h4>
        </div>

        {!canAddFiles ? (
          <div className="flex items-start gap-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 text-[11px] text-theme-muted leading-relaxed font-bold">
            <ShieldAlert className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <span>Lecture seule. Vous pouvez consulter les fichiers de cette ressource, mais seuls les administrateurs ou créateurs, directs ou par héritage, peuvent en joindre de nouveaux.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <input type="file" ref={fileInputRef} onChange={onUpload} className="hidden" disabled={!canAddFiles || isUploading} />
            <div className="md:col-span-4">
              <Button 
                variant="outline" 
                className="w-full h-[56px] rounded-2xl border-theme-border-subtle hover:bg-theme-surface-hover/50 transition-all group flex items-center justify-center p-0" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={!canAddFiles || isUploading}
              >
                <div className="flex items-center gap-3">
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5 group-hover:rotate-12 transition-transform text-secondary" />}
                  <span className="font-black uppercase tracking-widest text-[10px]">{fileForm.url_fichier ? 'Fichier prêt' : 'Choisir'}</span>
                </div>
              </Button>
            </div>
            <div className="md:col-span-5 relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted group-focus-within:text-secondary transition-colors">
                <Edit size={16} />
              </div>
              <input
                value={fileForm.nom}
                onChange={(e) => setFileForm(prev => ({ ...prev, nom: e.target.value }))}
                placeholder="Nom du document..."
                className="w-full h-[56px] bg-theme-surface/50 border border-theme-border-subtle rounded-2xl pl-14 pr-4 text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold placeholder:text-theme-muted/30 transition-all"
                disabled={!canAddFiles || isUploading}
              />
            </div>
            <div className="md:col-span-3">
              <Button 
                onClick={onCreate} 
                disabled={!canAddFiles || loading || isUploading || !fileForm.url_fichier} 
                className="w-full h-[56px] rounded-2xl shadow-theme-md group"
              >
                <Plus className="h-5 w-5 mr-1 group-hover:rotate-90 transition-transform" />
                <span className="font-black uppercase tracking-widest text-[10px]">Lier</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      <FileList
        files={files}
        loading={loading}
        onDownload={onDownload}
        onDelete={onDelete}
        currentUserId={currentUserId}
        isCreator={isCreator}
      />
    </motion.div>
  );
};