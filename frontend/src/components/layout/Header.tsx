import { Menu, User, LogOut, Search, Moon, Sun, ChevronsLeft, AlignLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';

interface HeaderProps {
  onMenuClick: () => void;
  onToggleSidebar: () => void;
  isCompact?: boolean;
}

export default function Header({ onMenuClick, onToggleSidebar, isCompact = false }: HeaderProps) {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 shadow-sm dark:bg-slate-950/85 dark:border-slate-800">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-4 flex-1">
          <div className="flex items-center gap-1">
            <button
              onClick={onMenuClick}
              className="rounded-xl p-2 text-gray-600 hover:bg-theme-surface-hover lg:hidden dark:text-slate-300 dark:hover:bg-slate-800 transition-all duration-300 hover:shadow-theme-sm"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex items-center justify-center rounded-xl p-2 text-gray-500 hover:text-primary hover:bg-theme-surface/50 border border-transparent hover:border-theme-border-subtle backdrop-blur-sm transition-all duration-300 -ml-1 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 group shadow-none hover:shadow-theme-sm"
              title={isCompact ? "Agrandir le menu" : "Réduire le menu"}
            >
              <motion.div
                initial={false}
                animate={{ rotate: isCompact ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isCompact ? (
                  <AlignLeft className="h-5 w-5 group-hover:scale-110 transition-transform" />
                ) : (
                  <ChevronsLeft className="h-5 w-5 group-hover:scale-110 transition-transform" />
                )}
              </motion.div>
            </button>
          </div>

          {/* Barre de recherche responsive */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 lg:w-[400px] pl-9 pr-4 py-2 rounded-full border border-gray-200 bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-white transition-all shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
            />
          </div>

          {/* Bouton recherche mobile */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors dark:text-amber-200 dark:hover:bg-slate-800 dark:hover:text-amber-100"
            title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
            aria-label={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {user && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex">
              <NotificationBell />
            </motion.div>
          )}

          {user ? (
            <div className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1 dark:bg-slate-800">
              <User className="h-5 w-5 text-gray-600 hidden sm:block dark:text-slate-300" />
              <Link to="/profile" className="text-sm font-medium hover:text-secondary transition truncate max-w-[100px] dark:text-slate-100">
                {user.username || 'Profil'}
              </Link>
              <button onClick={logout} className="p-1 text-gray-400 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-300">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="px-3 py-2 rounded-lg bg-primary text-white hover:bg-[#1d3a52] transition text-sm whitespace-nowrap">
              Se connecter
            </Link>
          )}
        </div>
      </div>

      {/* Barre de recherche mobile (expandable) */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-3 pt-3 border-t border-gray-200 dark:border-slate-800"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-secondary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
