// frontend/src/components/ui/GlassCard.tsx
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div className={cn(
      "bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl",
      hover && "transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:bg-white/90",
      className
    )}>
      {children}
    </div>
  );
}