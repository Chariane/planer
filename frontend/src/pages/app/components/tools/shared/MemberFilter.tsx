// frontend/src/pages/app/components/tools/shared/MemberFilter.tsx
import { motion } from 'framer-motion';
import { Users, X, Filter } from 'lucide-react';
import type { ListMemberRecord } from '../hooks/useMembers';

interface MemberFilterProps {
  directMembers: ListMemberRecord[];
  inheritedMembers: ListMemberRecord[];
  selectedMemberId: string;
  setSelectedMemberId: (id: string) => void;
  directLabel: string;
  inheritedLabel: string;
  currentUserId?: string | null;
}

export const MemberFilter = ({
  directMembers,
  inheritedMembers,
  selectedMemberId,
  setSelectedMemberId,
  directLabel,
  inheritedLabel,
  currentUserId,
}: MemberFilterProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="flex items-center gap-3"
    >
      <div className="relative flex-1 group">
        <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted group-focus-within:text-secondary transition-colors" />
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="w-full pl-12 pr-10 py-3 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl text-sm text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none appearance-none cursor-pointer font-bold tracking-tight transition-all"
        >
          <option value="" className="bg-theme-surface">Tous les membres</option>
          {directMembers.length > 0 && (
            <optgroup label={directLabel} className="bg-theme-surface font-black uppercase text-[10px] tracking-widest">
              {directMembers.map(member => (
                <option key={member.id} value={member.id} className="bg-theme-surface">
                  {member.name} {member.id_utilisateur === currentUserId ? '(Moi)' : ''}
                </option>
              ))}
            </optgroup>
          )}
          {inheritedMembers.length > 0 && (
            <optgroup label={inheritedLabel} className="bg-theme-surface font-black uppercase text-[10px] tracking-widest">
              {inheritedMembers.map(member => (
                <option key={member.id} value={member.id} className="bg-theme-surface">
                  {member.name} {member.id_utilisateur === currentUserId ? '(Moi)' : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted pointer-events-none" />
      </div>
      {selectedMemberId && (
        <button
          onClick={() => setSelectedMemberId('')}
          className="p-3 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl text-theme-muted hover:text-red-500 hover:bg-red-500/10 transition-all font-bold group"
          title="Effacer le filtre"
        >
          <X size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      )}
    </motion.div>
  );
};