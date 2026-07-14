import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronRight, ChevronsLeft, AlignLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import { useApp } from '../../contexts/AppContext';
import { espaceService } from '../../services/espace.service';
import { listeService } from '../../services/liste.service';

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface SpaceTreeItem {
  id: string;
  nom: string;
  sous_espaces?: SpaceTreeItem[];
}

const getTreeSignature = (items: SpaceTreeItem[] | undefined): string => {
  if (!items?.length) return '';
  return items
    .map(item => `${item.id}:${item.nom}:${getTreeSignature(item.sous_espaces)}`)
    .join('|');
};

const findSpacePathInTree = (
  items: SpaceTreeItem[] | undefined,
  targetId: string,
  path: SpaceTreeItem[] = [],
): SpaceTreeItem[] | null => {
  if (!items?.length) return null;

  for (const item of items) {
    const nextPath = [...path, item];
    if (item.id === targetId) return nextPath;

    const childPath = findSpacePathInTree(item.sous_espaces, targetId, nextPath);
    if (childPath) return childPath;
  }

  return null;
};

function TopBarShell({ children, isSidebarOpen, toggleSidebar }: { children: ReactNode; isSidebarOpen?: boolean; toggleSidebar?: () => void }) {
  const navigate = useNavigate();
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

  return (
    <div className="bg-theme-surface border-b border-theme-border-subtle px-2 py-2 sm:px-4 flex min-w-0 items-center justify-between gap-2 shadow-sm transition-colors duration-200">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={!canGoBack}
          className="hidden sm:inline-flex p-1 rounded hover:bg-theme-surface-hover text-theme-muted hover:text-theme-main disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-theme-muted transition-colors"
          title="Retour"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => navigate(1)}
          className="hidden sm:inline-flex p-1 rounded hover:bg-theme-surface-hover text-theme-muted hover:text-theme-main transition-colors"
          title="Suivant"
          aria-label="Suivant"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        {children}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl bg-theme-surface/50 backdrop-blur-sm border border-theme-border-subtle shadow-theme-sm hover:shadow-primary/20 hover:bg-theme-surface-hover hover:border-primary/50 text-theme-muted hover:text-primary transition-all duration-300 group relative overflow-hidden"
          title={isSidebarOpen ? "Fermer la barre latérale" : "Ouvrir la barre latérale"}
          aria-label={isSidebarOpen ? "Fermer la barre latérale" : "Ouvrir la barre latérale"}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.div
            initial={false}
            animate={{ rotate: isSidebarOpen ? 0 : 180 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative z-10"
          >
            {isSidebarOpen ? (
              <ChevronsLeft className="h-5 w-5 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(var(--color-primary),0.5)] transition-all" />
            ) : (
              <AlignLeft className="h-5 w-5 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(var(--color-primary),0.5)] transition-all" />
            )}
          </motion.div>
        </button>
      </div>
    </div>
  );
}

function StaticCrumb({ label }: { label: string }) {
  return (
    <TopBarShell>
      <div className="ml-2 text-sm text-theme-muted font-mono bg-theme-surface-hover px-3 py-1 rounded transition-colors duration-200">
        {label}
      </div>
    </TopBarShell>
  );
}

export default function TopBar({ isSidebarOpen, toggleSidebar }: { isSidebarOpen?: boolean; toggleSidebar?: () => void }) {
  const location = useLocation();
  const { workspaceId, spaceId, listId } = useActiveResource();
  const { workspaces } = useApp();
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  const workspace = workspaces.find(w => w.id === workspaceId);
  const workspaceName = workspace?.nom || 'Workspace';
  const workspaceTreeSignature = useMemo(
    () => getTreeSignature(workspace?.espaces),
    [workspace?.espaces],
  );

  const getSpaceHierarchy = useCallback(
    async (currentSpaceId: string): Promise<SpaceTreeItem[]> => {
      const workspaceSpaces = (workspace?.espaces || []) as SpaceTreeItem[];
      const treePath = findSpacePathInTree(workspaceSpaces, currentSpaceId);
      if (treePath) return treePath;

      try {
        const hierarchy = await espaceService.getHierarchy(currentSpaceId);
        return Array.isArray(hierarchy) ? hierarchy as SpaceTreeItem[] : [];
      } catch (error) {
        console.error('Erreur chargement hiérarchie espace', error);
        return [];
      }
    },
    [workspace?.espaces],
  );

  useEffect(() => {
    let cancelled = false;

    const buildBreadcrumb = async () => {
      if (!workspaceId) {
        setBreadcrumb([]);
        setIsResolving(false);
        return;
      }

      setIsResolving(true);

      try {
        const items: BreadcrumbItem[] = [
          { name: workspaceName, path: `/workspace/${workspaceId}` },
        ];

        if (listId) {
          const liste = await listeService.getById(listId);

          if (liste.id_espace) {
            const spaceHierarchy = await getSpaceHierarchy(liste.id_espace);
            for (const space of spaceHierarchy) {
              items.push({
                name: space.nom,
                path: `/workspace/${workspaceId}/${space.id}`,
              });
            }
          }

          items.push({
            name: liste.nom,
            path: liste.id_espace
              ? `/workspace/${workspaceId}/${liste.id_espace}/${liste.id}`
              : `/workspace/${workspaceId}/list/${liste.id}`,
          });
        } else if (spaceId) {
          const spaceHierarchy = await getSpaceHierarchy(spaceId);
          for (const space of spaceHierarchy) {
            items.push({
              name: space.nom,
              path: `/workspace/${workspaceId}/${space.id}`,
            });
          }
        }

        if (!cancelled) {
          setBreadcrumb(items);
        }
      } catch (error) {
        console.error('Erreur chargement breadcrumb', error);
        if (!cancelled) {
          setBreadcrumb(current =>
            current.length > 0
              ? current
              : [{ name: workspaceName, path: `/workspace/${workspaceId}` }],
          );
        }
      } finally {
        if (!cancelled) {
          setIsResolving(false);
        }
      }
    };

    buildBreadcrumb();

    return () => {
      cancelled = true;
    };
  }, [
    workspaceId,
    spaceId,
    listId,
    workspaceName,
    workspaceTreeSignature,
    getSpaceHierarchy,
  ]);

  if (location.pathname === '/dashboard') {
    return <StaticCrumb label="Tableau de bord" />;
  }

  if (location.pathname === '/workspaces') {
    return <StaticCrumb label="Mes workspaces" />;
  }

  if (!workspaceId) {
    return <StaticCrumb label="K-Planner" />;
  }

  const visibleBreadcrumb = breadcrumb.length > 0
    ? breadcrumb
    : [{ name: workspaceName, path: `/workspace/${workspaceId}` }];

  return (
    <TopBarShell isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar}>
      <div className="ml-1 sm:ml-2 w-full min-w-0 text-xs sm:text-sm text-theme-muted font-mono bg-theme-surface-hover px-2 sm:px-3 py-1 rounded flex items-center gap-1 overflow-x-auto whitespace-nowrap transition-colors duration-200 custom-scrollbar-hidden">
        {visibleBreadcrumb.map((item, idx) => (
          <span key={`${item.path}-${idx}`} className="flex items-center shrink-0">
            {idx > 0 && <ChevronRight className="h-3 w-3 mx-1 opacity-50" />}
            <Link to={item.path} className="hover:text-secondary transition-colors">
              {item.name}
            </Link>
          </span>
        ))}
        {isResolving && breadcrumb.length === 0 && (
          <span className="text-gray-400">...</span>
        )}
      </div>
    </TopBarShell>
  );
}
