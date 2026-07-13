// frontend/src/pages/app/components/tools/shared/StatusBadge.tsx

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge = ({ status, size = 'md', className = '' }: StatusBadgeProps) => {
  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    'en_attente': { 
      label: 'En attente', 
      bg: 'bg-theme-muted/10', 
      text: 'text-theme-muted', 
      border: 'border-theme-border-subtle' 
    },
    'approuvee': { 
      label: 'Approuvée', 
      bg: 'bg-emerald-500/10', 
      text: 'text-emerald-500', 
      border: 'border-emerald-500/20' 
    },
    'rejetee': { 
      label: 'Rejetée', 
      bg: 'bg-red-500/10', 
      text: 'text-red-500', 
      border: 'border-red-500/20' 
    },
    'annulee': { 
      label: 'Annulée', 
      bg: 'bg-rose-500/10', 
      text: 'text-rose-500', 
      border: 'border-rose-500/20' 
    },
    'terminee': { 
      label: 'Terminée', 
      bg: 'bg-blue-500/10', 
      text: 'text-blue-500', 
      border: 'border-blue-500/20' 
    },
  };

  const c = config[status] || config['en_attente'];
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[8px]',
    md: 'px-3 py-1 text-[10px]',
    lg: 'px-4 py-1.5 text-[11px]',
  };

  return (
    <span className={`rounded-full font-black uppercase tracking-widest ${c.bg} ${c.text} ${c.border} ${sizeClasses[size]} ${className}`}>
      {c.label}
    </span>
  );
};