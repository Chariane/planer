import { Link } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useNavigationStore } from '../../store/useNavigationStore';
import { Lock, ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
    currentType: 'workspace' | 'espace' | 'liste' | 'tache';
    currentName: string;
    parents: {
        workspace?: { id: string; nom: string };
        espace?: { id: string; nom: string };
        liste?: { id: string; nom: string };
    }
}

export default function SmartBreadcrumb({ currentType, currentName, parents }: BreadcrumbProps) {
    const checkAccess = useNavigationStore(state => state.checkAccess);

    const renderParent = (type: 'workspace' | 'espace' | 'liste', data?: { id: string; nom: string }) => {
        if (!data || !data.id || !data.nom) return null;

        // On ne rend pas le parent si c'est le currentType en fait, 
        // mais structurellement on passe que les parents.
        const hasAccess = checkAccess(type, data.id);

        return (
            <div className="flex items-center space-x-2">
                {hasAccess ? (
                    <Link to={`/${type}s/${data.id}`} className="hover:underline text-gray-600 hover:text-blue-600">
                        {data.nom}
                    </Link>
                ) : (
                    <span className="flex items-center text-gray-400 cursor-not-allowed group relative" title={`Accès direct au ${type} requis`}>
                        {data.nom} <Lock className="w-3 h-3 ml-1" />
                        {/* UX Tooltip CSS native */}
                        <span className="absolute hidden group-hover:block bottom-full mb-1 text-xs bg-gray-800 text-white p-1 rounded whitespace-nowrap z-50">
                            Accès restreint au parent
                        </span>
                    </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
            </div>
        );
    };

    return (
        <nav className="flex items-center text-sm font-medium text-gray-500 mb-6 bg-white p-3 rounded shadow-sm border border-gray-100">
            {renderParent('workspace', parents.workspace)}
            {renderParent('espace', parents.espace)}
            {renderParent('liste', parents.liste)}
            <span className="text-gray-900 font-semibold">{currentName}</span>
        </nav>
    );
}
