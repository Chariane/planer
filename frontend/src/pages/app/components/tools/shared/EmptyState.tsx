// frontend/src/pages/app/components/tools/shared/EmptyState.tsx
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  className = '',
  children 
}: EmptyStateProps) => (
  <div className={`py-16 md:py-20 text-center opacity-30 border-2 border-dashed border-theme-border-subtle rounded-3xl bg-theme-surface-hover/20 ${className}`}>
    <Icon className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-theme-muted" />
    <p className="font-black text-[10px] md:text-xs uppercase tracking-[0.3em] text-theme-main">{title}</p>
    {description && (
      <p className="text-[10px] text-theme-muted/50 mt-1 max-w-xs mx-auto">{description}</p>
    )}
    {children && <div className="mt-4">{children}</div>}
  </div>
);