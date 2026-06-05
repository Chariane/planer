// frontend/src/components/guards/ResourceGuard.tsx
import type { ReactNode } from 'react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

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
    const loading = useNavigationStore(state => state.loading);

    if (loading && id) {
        return (
            <div className="flex h-full min-h-[320px] w-full items-center justify-center bg-theme-page p-8">
                <div className="flex items-center gap-3 rounded-2xl border border-theme-border-subtle bg-theme-surface px-5 py-4 text-sm font-semibold text-theme-muted shadow-theme-sm">
                    <Loader2 className="h-5 w-5 animate-spin text-secondary" />
                    Chargement de vos accès...
                </div>
            </div>
        );
    }

    if (!hasAccess && id) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-theme-page rounded-lg border border-dashed border-theme-border-subtle h-full w-full">
                <div className="p-4 bg-theme-surface-hover rounded-full mb-4 shadow-inner flex items-center justify-center">
                    <span className="text-2xl" aria-hidden="true">🔒</span>
                </div>
                <h2 className="text-xl font-bold text-theme-main mb-3">Accès restreint</h2>
                <p className="text-center text-theme-muted max-w-md mb-6 leading-relaxed">
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
