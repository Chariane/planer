// frontend/src/components/guards/ResourceGuard.tsx
import type { ReactNode } from 'react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { Link, useParams } from 'react-router-dom';

interface GuardProps {
    type: 'workspace' | 'espace' | 'liste' | 'tache';
    children: ReactNode;
}

export default function ResourceGuard({ type, children }: GuardProps) {
    const params = useParams();

    let id = null;
    switch (type) {
        case 'workspace':
            id = params.workspaceId || params.id;
            break;
        case 'espace':
            id = params.espaceId || params.id;
            break;
        case 'liste':
            id = params.listeId || params.id;
            break;
        case 'tache':
            id = params.tacheId || params.id;
            break;
        default:
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
                    Vous ne disposez pas des permissions nécessaires pour accéder à cette ressource (<strong>{type}</strong>).<br /><br />
                    Contactez l'administrateur pour obtenir les droits d'accès.
                </p>
                <Link to="/dashboard" className="px-6 py-3 bg-primary text-white rounded hover:bg-primary-dark transition font-medium shadow-md">
                    Retour au Tableau de bord
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}