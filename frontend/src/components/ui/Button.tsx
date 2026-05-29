import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ className, variant = 'primary', size = 'md', loading, children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-theme-surface disabled:opacity-50';
  const variants = {
    primary: 'bg-secondary text-white shadow-md hover:bg-[#e05a00] hover:shadow-lg focus:ring-secondary active:scale-95',
    secondary: 'bg-primary text-white hover:bg-[#1d3a52] focus:ring-primary active:scale-95',
    outline: 'border border-theme-border bg-theme-surface text-theme-main hover:bg-theme-surface-hover hover:border-theme-border-subtle focus:ring-theme-border',
    ghost: 'text-theme-muted hover:bg-theme-surface-hover hover:text-theme-main focus:ring-theme-border-subtle',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={loading}
      {...props}
    >
      {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : children}
    </motion.button>
  );
}
