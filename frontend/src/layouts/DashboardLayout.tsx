// frontend/src/layouts/DashboardLayout.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import MobileSidebar from '../components/layout/MobileSidebar';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarOpen] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  
  const sidebarWidth = isCompact ? 75 : 200;

  const toggleSidebar = () => setIsCompact(!isCompact);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <div 
        className="fixed inset-y-0 left-0 z-20 hidden lg:flex transition-all duration-300"
        style={{ width: sidebarWidth }}
      >
        <div className="flex-1 w-full overflow-hidden">
          <Sidebar isOpen={isSidebarOpen} isCompact={isCompact} />
        </div>
      </div>

      {/* Sidebar mobile */}
      <AnimatePresence>
        {mobileMenuOpen && <MobileSidebar onClose={() => setMobileMenuOpen(false)} />}
      </AnimatePresence>

      {/* Contenu principal */}
      <div 
        className="transition-all duration-300"
        style={{ paddingLeft: `calc(${sidebarWidth}px + 0.375rem)` }}
      >
        <Header onMenuClick={() => setMobileMenuOpen(true)} onToggleSidebar={toggleSidebar} isCompact={isCompact} />
        <main className="h-[calc(100vh-64px)] overflow-hidden">
          <Outlet />
        </main>
      </div>
      
      <style>{`
        @media (max-width: 1023px) {
          .transition-all[style*="paddingLeft"] {
            padding-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}