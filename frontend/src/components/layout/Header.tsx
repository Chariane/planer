import { Menu, User, LogOut, PanelLeftClose, PanelLeftOpen, Search, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-4 flex-1">
          <div className="flex items-center gap-1">
            <button onClick={onMenuClick} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <button onClick={onToggleSidebar} className="hidden lg:block rounded-lg p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors -ml-1" title={isCompact ? "Agrandir le menu" : "Réduire le menu"}>
              {isCompact ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>

          {/* Barre de recherche responsive */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 lg:w-[400px] pl-9 pr-4 py-2 rounded-full border border-gray-200 bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-white transition-all shadow-sm"
            />
          </div>

          {/* Bouton recherche mobile */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors" title="Passer en mode sombre">
            <Moon className="h-5 w-5" />
          </button>

          {user && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex">
              <NotificationBell />
            </motion.div>
          )}

          {user ? (
            <div className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1">
              <User className="h-5 w-5 text-gray-600 hidden sm:block" />
              <Link to="/profile" className="text-sm font-medium hover:text-secondary transition truncate max-w-[100px]">
                {user.username || 'Profil'}
              </Link>
              <button onClick={logout} className="p-1 text-gray-400 hover:text-red-600">
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
            className="md:hidden mt-3 pt-3 border-t border-gray-200"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
