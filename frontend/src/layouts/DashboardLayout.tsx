// frontend/src/layouts/DashboardLayout.tsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import MobileSidebar from '../components/layout/MobileSidebar';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const isResizing = useRef(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX;
    if (newWidth >= 75 && newWidth <= 500) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <div 
        className="fixed inset-y-0 left-0 z-20 hidden lg:flex"
        style={{ width: sidebarWidth }}
      >
        <div className="flex-1 w-full overflow-hidden">
          <Sidebar isOpen={isSidebarOpen} width={sidebarWidth} />
        </div>
        <div 
          className="w-1.5 cursor-col-resize hover:bg-blue-400 bg-transparent transition-colors z-30"
          onMouseDown={startResizing}
        />
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
        <Header onMenuClick={() => setMobileMenuOpen(true)} onToggleSidebar={toggleSidebar} />
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