import { Menu, Bell, User, LogOut, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface HeaderProps {
  onMenuClick: () => void;
  onToggleSidebar: () => void;
}

export default function Header({ onMenuClick, onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 sm:px-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={onToggleSidebar}
            className="hidden lg:block rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-80 pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-secondary"></span>
          </motion.button>
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1">
            <User className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium">{user?.name || 'Invité'}</span>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 transition">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
