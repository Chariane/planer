// frontend/src/layouts/DashboardLayout.tsx
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import MobileSidebar from '../components/layout/MobileSidebar';
import ErrorBoundary from '../components/ErrorBoundary';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarOpen] = useState(true);
  const [isCompact, setIsCompact] = useState(false);

  const sidebarWidth = isCompact ? 75 : 200;

  const toggleSidebar = () => setIsCompact(!isCompact);

  return (
    <div className="min-h-screen bg-theme-page transition-colors duration-200">
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
        className="min-w-0 transition-all duration-300 lg:pl-[var(--sidebar-offset)]"
        style={{ '--sidebar-offset': `${sidebarWidth + 6}px` } as CSSProperties}
      >
        <Header onMenuClick={() => setMobileMenuOpen(true)} onToggleSidebar={toggleSidebar} isCompact={isCompact} />
        <main className="h-[calc(100dvh-64px)] min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
          <ErrorBoundary label="la page active">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
