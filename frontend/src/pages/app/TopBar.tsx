// frontend/src/pages/app/TopBar.tsx
import { ArrowLeft, ArrowRight, Menu, ChevronRight } from 'lucide-react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useState, useEffect } from 'react';
import { listeService } from '../../services/liste.service';
import { espaceService } from '../../services/espace.service';

interface BreadcrumbItem {
  name: string;
  path: string;
}

export default function TopBar() {
  const location = useLocation();
  const { workspaceId, spaceId, listId } = useParams();
  const { workspaces } = useApp();
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(true);

  const workspace = workspaces.find(w => w.id === workspaceId);
  const workspaceName = workspace?.nom || '';

  // Routes spéciales sans workspace
  if (location.pathname === '/dashboard') {
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <button className="p-1 rounded hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
          <button className="p-1 rounded hover:bg-gray-100"><ArrowRight className="h-5 w-5 text-gray-600" /></button>
          <div className="ml-2 text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded">Tableau de bord</div>
        </div>
        <button className="p-1 rounded hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
      </div>
    );
  }

  if (location.pathname === '/workspaces') {
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <button className="p-1 rounded hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
          <button className="p-1 rounded hover:bg-gray-100"><ArrowRight className="h-5 w-5 text-gray-600" /></button>
          <div className="ml-2 text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded">Mes workspaces</div>
        </div>
        <button className="p-1 rounded hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
      </div>
    );
  }

  // Pas de workspaceId
  if (!workspaceId) {
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <button className="p-1 rounded hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
          <button className="p-1 rounded hover:bg-gray-100"><ArrowRight className="h-5 w-5 text-gray-600" /></button>
          <div className="ml-2 text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded">K-Planner</div>
        </div>
        <button className="p-1 rounded hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
      </div>
    );
  }

  // Construire le breadcrumb dynamiquement
  useEffect(() => {
    const buildBreadcrumb = async () => {
      setLoading(true);
      try {
        const items: BreadcrumbItem[] = [];
        
        // 1. Workspace
        items.push({ name: workspaceName, path: `/workspace/${workspaceId}` });

        if (listId) {
          // Cas avec liste (peut être dans espace ou workspace)
          const liste = await listeService.getById(listId);
          
          if (liste.id_espace) {
            // La liste est dans un espace
            const espace = await espaceService.getById(liste.id_espace);
            items.push({ name: espace.nom, path: `/workspace/${workspaceId}/${espace.id}` });
          }
          // Ajouter la liste
          const listPath = liste.id_espace 
            ? `/workspace/${workspaceId}/${liste.id_espace}/${liste.id}`
            : `/workspace/${workspaceId}/list/${liste.id}`;
          items.push({ name: liste.nom, path: listPath });
          
        } else if (spaceId) {
          // Cas avec espace seulement
          const espace = await espaceService.getById(spaceId);
          items.push({ name: espace.nom, path: `/workspace/${workspaceId}/${spaceId}` });
        }
        
        setBreadcrumb(items);
      } catch (error) {
        console.error('Erreur chargement breadcrumb', error);
        setBreadcrumb([{ name: workspaceName, path: `/workspace/${workspaceId}` }]);
      } finally {
        setLoading(false);
      }
    };

    buildBreadcrumb();
  }, [workspaceId, spaceId, listId, workspaceName]);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <button className="p-1 rounded hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <button className="p-1 rounded hover:bg-gray-100">
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </button>
        <div className="ml-2 text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded flex items-center gap-1">
          {loading ? (
            <span>Chargement...</span>
          ) : (
            breadcrumb.map((item, idx) => (
              <span key={idx} className="flex items-center">
                {idx > 0 && <ChevronRight className="h-3 w-3 mx-1 text-gray-400" />}
                <Link to={item.path} className="hover:text-secondary transition-colors">
                  {item.name}
                </Link>
              </span>
            ))
          )}
        </div>
      </div>
      <button className="p-1 rounded hover:bg-gray-100">
        <Menu className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}