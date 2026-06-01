import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronRight, ChevronsLeft, AlignLeft, MessageCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import { useApp } from '../../contexts/AppContext';
import { espaceService } from '../../services/espace.service';
import { listeService } from '../../services/liste.service';
import { messagerieService } from '../../services/messagerie.service';

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
  const [unreadDiscussionsCount, setUnreadDiscussionsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadUnreadSummary = async () => {
      try {
        const summary = await messagerieService.getUnreadSummary();
        if (!cancelled) {
          setUnreadDiscussionsCount(summary.unread_discussions_count || 0);
        }
      } catch {
        if (!cancelled) {
          setUnreadDiscussionsCount(0);
        }
      }
    };

    loadUnreadSummary();
    const intervalId = window.setInterval(loadUnreadSummary, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="bg-theme-surface border-b border-theme-border-subtle px-4 py-2 flex items-center justify-between shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <button className="p-1 rounded hover:bg-theme-surface-hover text-theme-muted hover:text-theme-main transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button className="p-1 rounded hover:bg-theme-surface-hover text-theme-muted hover:text-theme-main transition-colors">
          <ArrowRight className="h-5 w-5" />
        </button>
        {children}
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/messagerie"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-theme-border-subtle bg-theme-surface/50 text-theme-muted shadow-theme-sm transition-all hover:border-secondary/40 hover:bg-secondary/10 hover:text-secondary"
          title="Messagerie"
          aria-label="Messagerie"
        >
          <MessageCircle className="h-5 w-5" />
          {unreadDiscussionsCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-black text-white shadow-lg">
              {unreadDiscussionsCount > 9 ? '9+' : unreadDiscussionsCount}
            </span>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl bg-theme-surface/50 backdrop-blur-sm border border-theme-border-subtle shadow-theme-sm hover:shadow-primary/20 hover:bg-theme-surface-hover hover:border-primary/50 text-theme-muted hover:text-primary transition-all duration-300 group relative overflow-hidden"
          title={isSidebarOpen ? "Fermer la barre latérale" : "Ouvrir la barre latérale"}
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
      <div className="ml-2 text-sm text-theme-muted font-mono bg-theme-surface-hover px-3 py-1 rounded flex items-center gap-1 min-w-0 overflow-x-auto transition-colors duration-200">
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
