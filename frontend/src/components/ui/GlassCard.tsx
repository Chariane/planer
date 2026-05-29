// frontend/src/components/ui/GlassCard.tsx
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = true, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-theme-surface/80 backdrop-blur-md rounded-2xl border border-theme-subtle shadow-xl transition-all duration-300",
        hover && "hover:shadow-2xl hover:bg-theme-surface/90 hover:border-theme-strong hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
