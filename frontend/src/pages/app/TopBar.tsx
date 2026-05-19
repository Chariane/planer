// frontend/src/pages/app/TopBar.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useActiveResource } from '../../contexts/ActiveResourceContext';
import { useApp } from '../../contexts/AppContext';
import { espaceService } from '../../services/espace.service';
import { listeService } from '../../services/liste.service';

interface BreadcrumbItem {
  name: string;
  path: string;
}

const getTreeSignature = (items: any[] | undefined): string => {
  if (!items?.length) return '';
  return items
    .map(item => `${item.id}:${item.nom}:${getTreeSignature(item.sous_espaces)}`)
    .join('|');
};

const findSpacePathInTree = (items: any[] | undefined, targetId: string, path: any[] = []): any[] | null => {
  if (!items?.length) return null;

  for (const item of items) {
    const nextPath = [...path, item];
    if (item.id === targetId) return nextPath;

    const childPath = findSpacePathInTree(item.sous_espaces, targetId, nextPath);
    if (childPath) return childPath;
  }

  return null;
};

function TopBarShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <button className="p-1 rounded hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <button className="p-1 rounded hover:bg-gray-100">
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </button>
        {children}
      </div>
      <button className="p-1 rounded hover:bg-gray-100">
        <Menu className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}

function StaticCrumb({ label }: { label: string }) {
  return (
    <TopBarShell>
      <div className="ml-2 text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded">
        {label}
      </div>
    </TopBarShell>
  );
}

export default function TopBar() {
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
    async (currentSpaceId: string): Promise<any[]> => {
      const treePath = findSpacePathInTree(workspace?.espaces || [], currentSpaceId);
      if (treePath) return treePath;

      try {
        const hierarchy = await espaceService.getHierarchy(currentSpaceId);
        return Array.isArray(hierarchy) ? hierarchy : [];
      } catch (error) {
        console.error('Erreur chargement hiérarchie espace', error);
        return [];
      }
    },
    [workspaceTreeSignature],
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
    <TopBarShell>
      <div className="ml-2 text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded flex items-center gap-1 min-w-0 overflow-x-auto">
        {visibleBreadcrumb.map((item, idx) => (
          <span key={`${item.path}-${idx}`} className="flex items-center shrink-0">
            {idx > 0 && <ChevronRight className="h-3 w-3 mx-1 text-gray-400" />}
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
