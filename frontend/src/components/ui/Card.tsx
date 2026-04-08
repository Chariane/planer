import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function Card({ children, className, hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn('rounded-xl bg-white p-6 shadow-sm border border-gray-100 transition-all duration-200', hover && 'hover:shadow-md', className)}
    >
      {children}
    </motion.div>
  );
}
