// frontend/src/pages/app/SearchPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  FolderTree, 
  Hash, 
  Paperclip, 
  CheckSquare,
  Loader2,
  List,
  AlertCircle,
  User,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { useGlobalSearchQuery } from '../../store/api/searchApi';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../components/ui/Toast';
import type { SearchResultsData } from '../../store/api/searchApi';

// ✅ Fonction de formatage manuelle
const formatRelativeTime = (dateString: string) => {
  if (!dateString) return 'Date inconnue';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return 'à l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
  if (diffHour < 24) return `il y a ${diffHour} heure${diffHour > 1 ? 's' : ''}`;
  if (diffDay < 7) return `il y a ${diffDay} jour${diffDay > 1 ? 's' : ''}`;
  if (diffWeek < 4) return `il y a ${diffWeek} semaine${diffWeek > 1 ? 's' : ''}`;
  if (diffMonth < 12) return `il y a ${diffMonth} mois`;
  return `il y a ${diffYear} an${diffYear > 1 ? 's' : ''}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

type TabType = 'all' | 'tasks' | 'lists' | 'espaces' | 'members' | 'files';

const ResultCard = ({ item, type, onClick }: { item: any; type: string; onClick?: () => void }) => {
  const getIcon = () => {
    switch (type) {
      case 'tasks': return <CheckSquare className="h-4 w-4 text-secondary" />;
      case 'lists': return <List className="h-4 w-4 text-primary" />;
      case 'espaces': return <FolderTree className="h-4 w-4 text-amber-500" />;
      case 'members': return <User className="h-4 w-4 text-blue-500" />;
      case 'files': return <Paperclip className="h-4 w-4 text-purple-500" />;
      default: return <Hash className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'tasks': return item.titre || 'Tâche sans titre';
      case 'lists': return item.nom || 'Liste sans nom';
      case 'espaces': return item.nom || 'Espace sans nom';
      case 'members': return item.utilisateur?.username || item.id_utilisateur || 'Utilisateur';
      case 'files': return item.nom || 'Fichier sans nom';
      default: return 'Élément';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'tasks': {
        if (item.date_fin_prevue) {
          return `Échéance ${formatDate(item.date_fin_prevue)}`;
        }
        return 'Aucune échéance';
      }
      case 'lists': {
        if (item.created_at) {
          return `Créée ${formatRelativeTime(item.created_at)}`;
        }
        return 'Date inconnue';
      }
      case 'espaces': {
        if (item.created_at) {
          return `Créé ${formatRelativeTime(item.created_at)}`;
        }
        return 'Date inconnue';
      }
      case 'members': {
        const user = item.utilisateur;
        if (user?.email) return user.email;
        if (user?.nom) return `${user.nom} ${user.prenoms || ''}`;
        return 'Membre';
      }
      case 'files': {
        if (item.created_at) {
          return `Ajouté ${formatRelativeTime(item.created_at)}`;
        }
        return 'Date inconnue';
      }
      default: return '';
    }
  };

  const getLink = () => {
    switch (type) {
      case 'tasks': return `/tache/${item.id}`;
      case 'lists': return `/liste/${item.id}`;
      case 'espaces': return `/espace/${item.id}`;
      case 'members': return `/profile/${item.id_utilisateur}`;
      case 'files': return `/files/${item.id}`;
      default: return '#';
    }
  };

  return (
    <Link to={getLink()} onClick={onClick} className="block">
      <GlassCard className="p-4 hover:bg-theme-surface-hover/50 transition-all border-theme-border-subtle cursor-pointer group">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-theme-surface/70 border border-theme-border-subtle group-hover:border-secondary/20 transition-all">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-theme-main text-sm truncate group-hover:text-secondary transition-colors">
              {getTitle()}
            </p>
            <p className="text-[10px] font-medium text-theme-muted mt-0.5 flex items-center gap-1">
              <span className="uppercase tracking-widest text-[8px] bg-theme-surface/50 px-1.5 py-0.5 rounded border border-theme-border-subtle">
                {type}
              </span>
              <span className="mx-1">·</span>
              {getSubtitle()}
            </p>
            {item.description && type !== 'members' && (
              <p className="text-xs text-theme-muted mt-1 line-clamp-2 font-medium">
                {item.description}
              </p>
            )}
          </div>
        </div>
      </GlassCard>
    </Link>
  );
};

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  // ✅ Utilisation de l'API RTK
  const { data: results, isLoading, error, isFetching } = useGlobalSearchQuery(
    { q: query },
    { skip: !query.trim() }
  );

  // Gérer les erreurs
  useEffect(() => {
    if (error) {
      toast.error('Erreur lors de la recherche');
    }
  }, [error]);

  const getTabCounts = () => {
    if (!results) return { all: 0, tasks: 0, lists: 0, espaces: 0, members: 0, files: 0 };
    return {
      all: results.tasks.length + results.lists.length + results.espaces.length + 
           results.members.length + results.files.length + results.sections.length + results.checklists.length,
      tasks: results.tasks.length,
      lists: results.lists.length,
      espaces: results.espaces.length,
      members: results.members.length,
      files: results.files.length,
    };
  };

  const tabs = [
    { id: 'all', label: 'Tous', count: getTabCounts().all },
    { id: 'tasks', label: 'Tâches', count: getTabCounts().tasks },
    { id: 'lists', label: 'Projets', count: getTabCounts().lists },
    { id: 'espaces', label: 'Espaces', count: getTabCounts().espaces },
    { id: 'members', label: 'Membres', count: getTabCounts().members },
    { id: 'files', label: 'Fichiers', count: getTabCounts().files },
  ];

  const getFilteredResults = () => {
    if (!results) return [];
    switch (activeTab) {
      case 'tasks': return results.tasks.map(r => ({ ...r, _type: 'tasks' }));
      case 'lists': return results.lists.map(r => ({ ...r, _type: 'lists' }));
      case 'espaces': return results.espaces.map(r => ({ ...r, _type: 'espaces' }));
      case 'members': return results.members.map(r => ({ ...r, _type: 'members' }));
      case 'files': return results.files.map(r => ({ ...r, _type: 'files' }));
      default: {
        const all = [
          ...results.tasks.map(r => ({ ...r, _type: 'tasks' })),
          ...results.lists.map(r => ({ ...r, _type: 'lists' })),
          ...results.espaces.map(r => ({ ...r, _type: 'espaces' })),
          ...results.sections.map(r => ({ ...r, _type: 'sections' })),
          ...results.checklists.map(r => ({ ...r, _type: 'checklists' })),
          ...results.members.map(r => ({ ...r, _type: 'members' })),
          ...results.files.map(r => ({ ...r, _type: 'files' })),
        ];
        return all;
      }
    }
  };

  const filteredResults = getFilteredResults();

  if (!query.trim()) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="p-6 rounded-full bg-theme-surface/50 border border-theme-border-subtle inline-block mb-6">
            <Search className="h-12 w-12 text-theme-muted/30" />
          </div>
          <h2 className="text-2xl font-black text-theme-main">Que recherchez-vous ?</h2>
          <p className="text-theme-muted mt-2 max-w-md mx-auto">
            Saisissez un terme de recherche dans la barre de recherche pour trouver des projets, espaces, tâches, membres ou fichiers.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || isFetching) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
          <p className="text-theme-muted font-medium">Recherche en cours...</p>
        </div>
      </div>
    );
  }

  if (query.trim() && (!results || filteredResults.length === 0)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="p-6 rounded-full bg-theme-surface/50 border border-theme-border-subtle inline-block mb-6">
            <AlertCircle className="h-12 w-12 text-amber-500" />
          </div>
          <h2 className="text-2xl font-black text-theme-main">Aucun résultat trouvé</h2>
          <p className="text-theme-muted mt-2">
            Aucun élément ne correspond à "{query}". Essayez avec d'autres mots-clés.
          </p>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="mt-6 rounded-xl"
          >
            Retourner
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Search className="h-6 w-6 text-secondary" />
          <h1 className="text-2xl font-black text-theme-main">Résultats de recherche</h1>
        </div>
        <p className="text-theme-muted text-sm">
          {filteredResults.length} résultat{filteredResults.length > 1 ? 's' : ''} pour "{query}"
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-theme-surface/50 border border-theme-border-subtle rounded-2xl mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-primary/10 text-primary shadow-inner'
                : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover'
            }`}
          >
            {tab.label}
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-theme-surface/50 text-theme-muted'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Résultats */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {filteredResults.length === 0 && activeTab !== 'all' ? (
            <div className="text-center py-12">
              <p className="text-theme-muted font-medium">Aucun résultat dans cette catégorie</p>
            </div>
          ) : (
            filteredResults.map((item, index) => (
              <ResultCard
                key={`${item._type}-${item.id}-${index}`}
                item={item}
                type={item._type}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}