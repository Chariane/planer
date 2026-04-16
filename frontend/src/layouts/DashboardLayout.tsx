// frontend/src/layouts/DashboardLayout.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import MobileSidebar from '../components/layout/MobileSidebar';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <div className={`fixed inset-y-0 left-0 z-20 transition-all duration-300 ${isSidebarOpen ? 'w-64 md:w-72' : 'w-16 md:w-20'} hidden lg:block`}>
        <Sidebar isOpen={isSidebarOpen} />
      </div>

      {/* Sidebar mobile */}
      <AnimatePresence>
        {mobileMenuOpen && <MobileSidebar onClose={() => setMobileMenuOpen(false)} />}
      </AnimatePresence>

      {/* Contenu principal */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'lg:pl-64 xl:pl-72' : 'lg:pl-16 xl:pl-20'}`}>
        <Header onMenuClick={() => setMobileMenuOpen(true)} onToggleSidebar={toggleSidebar} />
        <main className="h-[calc(100vh-64px)] overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}