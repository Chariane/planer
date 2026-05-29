import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AuthLayout() {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className="min-h-screen bg-theme-page flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      {/* Background Decorative Elements */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [0, -90, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none"
      />

      {/* Theme Toggle & Back Button */}
      <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-50">
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-surface/50 border border-theme-border-subtle text-theme-main hover:text-secondary transition-all font-black uppercase tracking-widest text-[10px] backdrop-blur-md"
        >
          <ArrowLeft size={14} /> Retour à l'accueil
        </Link>
        <button
          onClick={toggleDarkMode}
          className="p-3 rounded-xl bg-theme-surface/50 border border-theme-border-subtle text-theme-main hover:text-secondary hover:border-secondary/30 transition-all shadow-theme-lg backdrop-blur-md"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <Outlet />
      </motion.div>

      {/* Subtle bottom text */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.4em] opacity-30">
          Kapitals &bull; K-Planner Pro 2.0
        </p>
      </div>
    </div>
  );
}
