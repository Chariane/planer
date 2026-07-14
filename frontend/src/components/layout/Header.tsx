// frontend/src/components/layout/Header.tsx
import { ArrowLeft, ArrowRight, Menu, User, LogOut, Search, ChevronsLeft, Moon, Sun, ChevronRight, Hash, FolderTree, Building2 } from 'lucide-react';
import { sanitizeText } from '../../utils/sanitize';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUI } from '../../hooks/useUI';
import { useNavigation } from '../../hooks/useNavigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';
import MessagingBell from '../messaging/MessagingBell';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import { useApp } from '../../contexts/AppContext';

const Breadcrumbs = () => {
  const { workspaceId, spaceId, listId } = useActiveResource();
  const { workspaces, joinedEspaces, joinedListes } = useApp();

  if (!workspaceId) return null;

  const workspace = workspaces.find((w: any) => w.id === workspaceId);
  const workspaceName = sanitizeText(workspace?.nom || 'Workspace');

  // Résoudre l'espace
  let spaceName = '';
  if (spaceId && spaceId !== 'list') {
    const findSpace = (items: any[]): any => {
      if (!items) return null;
      for (const item of items) {
        if (item.id === spaceId) return item;
        if (item.sous_espaces) {
          const found = findSpace(item.sous_espaces);
          if (found) return found;
        }
      }
      return null;
    };
    const space = findSpace(workspace?.espaces || []);
    spaceName = sanitizeText(space?.nom || joinedEspaces.find((e: any) => e.id === spaceId)?.nom || '');
  }

  // Résoudre la liste
  let listName = '';
  if (listId) {
    const list = joinedListes.find((l: any) => l.id === listId);
    listName = sanitizeText(list?.nom || '');
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium text-theme-muted/60 overflow-hidden">
      <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-default">
        <Building2 className="h-3 w-3" />
        <span className="truncate max-w-[100px]">{workspaceName}</span>
      </div>

      {spaceName && (
        <>
          <ChevronRight className="h-3 w-3 opacity-30 shrink-0" />
          <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-default">
            <FolderTree className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{spaceName}</span>
          </div>
        </>
      )}

      {listName && (
        <>
          <ChevronRight className="h-3 w-3 opacity-30 shrink-0" />
          <div className="flex items-center gap-1 text-theme-main font-bold">
            <Hash className="h-3 w-3 text-secondary" />
            <span className="truncate max-w-[150px]">{listName}</span>
          </div>
        </>
      )}
    </div>
  );
};

interface HeaderProps {
  onMenuClick: () => void;
  onToggleSidebar: () => void;
  isCompact?: boolean;
}

export default function Header({ onMenuClick, onToggleSidebar, isCompact = false }: HeaderProps) {
  const { user, logout, getProfilePhoto } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // NOUVEAU: Utilisation des hooks Redux
  const { toggleSidebar: toggleReduxSidebar, setSidebarOpen } = useUI();
  const { activeWorkspaceId } = useNavigation();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [historyState, setHistoryState] = useState({ index: 0, maxIndex: 0 });

  // Gestion du toggle sidebar avec Redux
  const handleToggleSidebar = () => {
    toggleReduxSidebar(); // Met à jour l'état Redux
    onToggleSidebar(); // Notifie le parent (compatibilité)
  };

  useEffect(() => {
    const loadPhoto = async () => {
      if (user) {
        try {
          const photo = await getProfilePhoto();
          if (photo?.photoBase64) {
            setProfilePhoto(`data:${photo.mimeType || 'image/png'};base64,${photo.photoBase64}`);
          }
        } catch (err) {
          console.error("Erreur chargement photo profil:", err);
        }
      }
    };
    loadPhoto();
  }, [user, getProfilePhoto]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentIndex = Number(window.history.state?.idx ?? 0);
    const storedMaxIndex = Number(window.sessionStorage.getItem('kplanner:max-history-index') || currentIndex);
    const maxIndex = Math.max(storedMaxIndex, currentIndex);
    window.sessionStorage.setItem('kplanner:max-history-index', String(maxIndex));
    setHistoryState({ index: currentIndex, maxIndex });
  }, [location.key]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recherche?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
    }
  };

  const handleBack = () => navigate(-1);
  const handleForward = () => navigate(1);

  return (
    <header className="sticky top-0 z-40 min-w-0 bg-white/80 backdrop-blur-md border-b border-gray-200 px-2 py-2 sm:px-4 sm:py-3 shadow-sm dark:bg-slate-950/85 dark:border-slate-800">
      <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2 md:gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={onMenuClick}
              aria-label="Ouvrir le menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-600 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={handleToggleSidebar}
              aria-label="Basculer la barre latérale"
              className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <ChevronsLeft className={`h-5 w-5 transition-transform duration-300 ${isCompact ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="hidden h-6 w-px bg-gray-200 sm:block dark:bg-slate-800" />

          <div className="flex items-center gap-1">
            <button
              onClick={handleBack}
              disabled={historyState.index <= 0}
              aria-label="Retour"
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 sm:inline-flex dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleForward}
              disabled={historyState.index >= historyState.maxIndex}
              aria-label="Suivant"
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 sm:inline-flex dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden h-6 w-px bg-gray-200 md:block dark:bg-slate-800" />

          {/* Barre de recherche Desktop */}
          <form onSubmit={handleSearch} className="hidden max-w-sm flex-1 md:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm focus:border-secondary/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-secondary/5 transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-secondary/20"
              />
            </div>
          </form>

          {/* Bouton recherche mobile */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label="Rechercher"
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Breadcrumbs Section */}
          <div className="hidden lg:flex items-center gap-2 px-2 border-l border-gray-200 dark:border-slate-800 ml-2 animate-fade-in">
            <Breadcrumbs />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
          <button
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-700" />}
          </button>

          <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-slate-800" />

          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <MessagingBell />
            <NotificationBell />
          </div>

          <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-slate-800" />

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="hidden flex-col items-end sm:flex hover:opacity-80 transition-opacity outline-none"
            >
              <span className="text-xs font-bold text-gray-700 dark:text-slate-200">{sanitizeText(user?.username || user?.nom || 'Utilisateur')}</span>
              <span className="text-[10px] text-theme-muted uppercase tracking-wider font-bold">Connecté</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label="Ouvrir le menu profil"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-all hover:scale-105 active:scale-95 overflow-hidden border-2 border-transparent hover:border-primary/20"
              >
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profil" className="h-full w-full object-cover" />
                ) : (
                  user?.username?.[0]?.toUpperCase() || user?.nom?.[0]?.toUpperCase() || <User className="h-5 w-5" />
                )}
              </button>

              {/* Menu Profil Dropdown */}
              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    {/* Backdrop pour fermer au clic en dehors */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProfileOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 origin-top-right rounded-2xl bg-white p-1.5 shadow-theme-xl ring-1 ring-black/5 dark:bg-slate-900 dark:border dark:border-slate-800 z-[100] overflow-hidden"
                    >
                      <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800 mb-1 sm:hidden">
                        <p className="text-xs font-bold text-theme-main truncate">{sanitizeText(user?.username || '')}</p>
                        <p className="text-[10px] text-theme-muted">Connecté</p>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-theme-main hover:bg-theme-surface-hover rounded-xl transition-colors"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <User className="h-4 w-4" />
                        </div>
                        Mon Profil
                      </Link>

                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          logout();
                        }}
                        className="w-full mt-0.5 flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                          <LogOut className="h-4 w-4" />
                        </div>
                        Déconnexion
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-0 z-50 flex h-16 items-center bg-white px-4 md:hidden dark:bg-slate-950"
          >
            <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="flex-1 bg-transparent text-sm outline-none dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-sm font-medium text-secondary"
              >
                Annuler
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
