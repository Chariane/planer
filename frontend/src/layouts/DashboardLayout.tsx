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
      <div
        className={`fixed inset-y-0 left-0 z-20 transition-all duration-300 ${
          isSidebarOpen ? 'w-72' : 'w-20'
        } hidden lg:block`}
      >
        <Sidebar isOpen={isSidebarOpen} />
      </div>
      <AnimatePresence>
        {mobileMenuOpen && <MobileSidebar onClose={() => setMobileMenuOpen(false)} />}
      </AnimatePresence>
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-20'}`}>
        <Header onMenuClick={() => setMobileMenuOpen(true)} onToggleSidebar={toggleSidebar} />
        <main className="p-4 md:p-6 lg:p-8 max-w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
