// frontend/src/pages/app/AppView.tsx
import { useState, useEffect } from 'react';
import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import CenterContent from './CenterContent';
import RightCanevas from './RightCanevas';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import { PanelRightOpen, X } from 'lucide-react';
import ErrorBoundary from '../../components/ErrorBoundary';
import { sanitizeInput } from '../../utils/sanitize'; // ✅ AJOUT

export default function AppView() {
  const { listId } = useActiveResource();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? true : window.innerWidth >= 1024
  ));
  const [isDesktopCanevasOpen, setIsDesktopCanevasOpen] = useState(true);
  const [isMobileCanevasOpen, setIsMobileCanevasOpen] = useState(false);

  // ✅ Sanitize l'ID de la liste pour éviter les injections
  const safeListId = listId ? sanitizeInput(listId) : null;

  // ✅ Effet pour fermer la sidebar sur les petits écrans
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-theme-page transition-colors duration-200">
      <TopBar isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="relative flex flex-1 overflow-hidden">
        {/* Overlay mobile pour fermer la sidebar */}
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Fermer la navigation"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* Colonne gauche - Sidebar */}
        <div 
          className={`fixed left-0 top-[64px] z-30 h-[calc(100dvh-64px)] w-[min(86vw,300px)] flex-shrink-0 border-r border-theme-border-subtle bg-theme-surface overflow-y-auto shadow-2xl transition-all duration-300 lg:static lg:z-auto lg:h-auto lg:shadow-none ${
            isSidebarOpen ? 'translate-x-0 lg:w-[220px]' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0'
          }`}
        >
          <ErrorBoundary label="la navigation des ressources">
            <LeftSidebar />
          </ErrorBoundary>
        </div>

        {/* Colonne centrale */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-theme-page transition-colors duration-200">
          <ErrorBoundary label="le contenu du workspace">
            <CenterContent />
          </ErrorBoundary>
        </div>

        {/* Colonne droite - Canevas (uniquement si une liste est active) */}
        {safeListId && isDesktopCanevasOpen && (
          <div className="hidden xl:block w-[320px] flex-shrink-0 border-l border-theme-border-subtle bg-theme-surface overflow-y-auto transition-colors duration-200">
            <ErrorBoundary label="le canevas">
              <RightCanevas onClose={() => setIsDesktopCanevasOpen(false)} />
            </ErrorBoundary>
          </div>
        )}

        {safeListId && (
          <>
            {/* Bouton flottant pour ouvrir le canevas sur mobile */}
            <button
              type="button"
              onClick={() => setIsMobileCanevasOpen(true)}
              className="fixed bottom-5 right-5 z-20 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-white shadow-xl shadow-secondary/25 xl:hidden"
              aria-label="Ouvrir le canevas"
              title="Ouvrir le canevas"
            >
              <PanelRightOpen className="h-5 w-5" />
            </button>

            {/* Bouton pour rouvrir le canevas si fermé */}
            {!isDesktopCanevasOpen && (
              <button
                type="button"
                onClick={() => setIsDesktopCanevasOpen(true)}
                className="fixed bottom-5 right-5 z-20 hidden h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-white shadow-xl shadow-secondary/25 xl:inline-flex"
                aria-label="Ouvrir le canevas"
                title="Ouvrir le canevas"
              >
                <PanelRightOpen className="h-5 w-5" />
              </button>
            )}

            {/* Overlay mobile du canevas */}
            {isMobileCanevasOpen && (
              <div className="fixed inset-0 z-40 xl:hidden">
                <button
                  type="button"
                  aria-label="Fermer le canevas"
                  onClick={() => setIsMobileCanevasOpen(false)}
                  className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
                />
                <div className="absolute right-0 top-0 h-full w-[min(92vw,390px)] border-l border-theme-border-subtle bg-theme-surface shadow-2xl">
                  <button
                    type="button"
                    onClick={() => setIsMobileCanevasOpen(false)}
                    className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-theme-border-subtle bg-theme-surface-hover text-theme-muted hover:text-theme-main"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <ErrorBoundary label="le canevas">
                    <RightCanevas onClose={() => setIsMobileCanevasOpen(false)} />
                  </ErrorBoundary>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}