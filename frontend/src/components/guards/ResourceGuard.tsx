import type { ReactNode } from 'react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { Link, useParams } from 'react-router-dom';

interface GuardProps {
    type: 'workspace' | 'espace' | 'liste' | 'tache';
    children: ReactNode;
}

export default function ResourceGuard({ type, children }: GuardProps) {
    // Try to grab common id params from router (workspaceId, espaceId, etc.)
    const params = useParams();

    let id = null;
    switch (type) {
        case 'workspace':
            id = params.workspaceId;
            break;
        case 'espace':
            id = params.espaceId;
            break;
        case 'liste':
            id = params.listeId;
            break;
        case 'tache':
            id = params.tacheId;
            break;
    }

    // Backup : if standard param isn't met, usually 'id' is standard
    if (!id) {
        id = params.id;
    }

    const hasAccess = useNavigationStore(state => state.checkAccess(type, id!));

    if (!hasAccess && id) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border border-dashed border-gray-300 h-full w-full">
                <div className="p-4 bg-gray-100 rounded-full mb-4 shadow-inner flex items-center justify-center">
                    <span className="text-2xl">🔒</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Accès Restreint</h2>
                <p className="text-center text-gray-600 max-w-md mb-6 leading-relaxed">
                    Le backend refuse votre accès. Vous ne disposez pas des permissions directes pour visualiser cette ressource parente (<strong>{type}</strong>).<br /><br />
                    Cependant, vous avez peut-être accès à ses éléments enfants ou contenus internes que vous pouvez retrouver sur votre barre latérale ou tableau de bord.
                </p>
                <Link to="/dashboard" className="px-6 py-3 bg-primary text-white rounded hover:bg-primary-dark transition font-medium shadow-md">
                    Retour au Tableau de bord
                </Link>
            </div>
        );
    }

    // Si on n'a pas l'ID encore (souvent à cause d'un re-render), on laisse passer ou loading... 
    // Ici on laisse les enfants se débrouiller (souvent isLoading). Mais s'il y a un ID et pas d'accès, on bloque.
    return <>{children}</>;
}
