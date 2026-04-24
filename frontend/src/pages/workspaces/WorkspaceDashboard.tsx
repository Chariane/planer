// frontend/src/pages/workspaces/WorkspaceDashboard.tsx
import { useMemo, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Briefcase,
  FolderOpen,
  ListTodo,
  CheckSquare2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Users
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Container } from '../../components/ui/Container';
import CreateWorkspaceModal from '../../components/workspace/CreateWorkspaceModal';
import { listeService } from '../../services/liste.service';
import type { JoinedResource, Workspace } from '../../types';

interface ResourceCardItem {
  id: string;
  nom: string;
  description?: string | null;
  role?: string | null;
  href?: string;
  icon: ReactNode;
  badge: string;
  meta?: string;
  onClick?: () => void | Promise<void>;
}

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const {
    ownedWorkspaces: ownedWorkspaceAccess,
    joinedWorkspaces: joinedWorkspaceAccess,
    joinedEspaces,
    joinedListes,
    joinedTaches,
    loadNavigationData,
  } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openingTaskId, setOpeningTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadNavigationData();
  }, []);

  const handleWorkspaceCreated = () => {
    loadNavigationData();
    setIsModalOpen(false);
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchesSearch = (value?: string | null) =>
    !normalizedSearch || (value ?? '').toLowerCase().includes(normalizedSearch);

  const createdWorkspaces = useMemo(
    () => ownedWorkspaceAccess.filter((workspace) => matchesSearch(workspace.nom)),
    [ownedWorkspaceAccess, normalizedSearch]
  );

  const joinedWorkspaces = useMemo(
    () => joinedWorkspaceAccess.filter((workspace) => matchesSearch(workspace.nom)),
    [joinedWorkspaceAccess, normalizedSearch]
  );

  const espaces = useMemo(
    () => joinedEspaces.filter((resource) => matchesSearch(resource.nom)),
    [joinedEspaces, normalizedSearch]
  );

  const listes = useMemo(
    () => joinedListes.filter((resource) => matchesSearch(resource.nom)),
    [joinedListes, normalizedSearch]
  );

  const taches = useMemo(
    () => joinedTaches.filter((resource) => matchesSearch(resource.nom)),
    [joinedTaches, normalizedSearch]
  );

  const buildWorkspaceItem = (workspace: Workspace, badge: string): ResourceCardItem => ({
    id: workspace.id,
    nom: workspace.nom,
    description: workspace.description,
    role: workspace.current_user_role,
    href: `/workspace/${workspace.id}`,
    icon: <Briefcase className="w-5 h-5" />,
    badge,
    meta: workspace.current_user_role || 'Accès workspace',
  });

  const buildEspaceItem = (resource: JoinedResource): ResourceCardItem => ({
    id: resource.id,
    nom: resource.nom,
    role: resource.role,
    href: resource.workspace_id ? `/workspace/${resource.workspace_id}/${resource.id}` : undefined,
    icon: <FolderOpen className="w-5 h-5" />,
    badge: 'Espace',
    meta: resource.workspace_nom ? `Dans ${resource.workspace_nom}` : 'Accès espace',
  });

  const buildListeItem = (resource: JoinedResource): ResourceCardItem => ({
    id: resource.id,
    nom: resource.nom,
    role: resource.role,
    href: resource.workspace_id
      ? resource.id_espace
        ? `/workspace/${resource.workspace_id}/${resource.id_espace}/${resource.id}`
        : `/workspace/${resource.workspace_id}/list/${resource.id}`
      : undefined,
    icon: <ListTodo className="w-5 h-5" />,
    badge: 'Liste',
    meta: resource.workspace_nom
      ? resource.id_espace
        ? `Dans ${resource.workspace_nom}`
        : `Projet de ${resource.workspace_nom}`
      : resource.id_espace
        ? 'Liste dans un espace'
        : 'Liste du workspace',
  });

  const buildTaskItem = (resource: JoinedResource): ResourceCardItem => ({
    id: resource.id,
    nom: resource.nom,
    role: resource.role,
    icon: <CheckSquare2 className="w-5 h-5" />,
    badge: 'Tâche',
    meta: resource.workspace_nom ? `Dans ${resource.workspace_nom}` : 'Accès tâche',
    onClick: async () => {
      if (!resource.id_liste) return;
      setOpeningTaskId(resource.id);
      try {
        if (resource.workspace_id) {
          if (resource.id_espace) {
            navigate(`/workspace/${resource.workspace_id}/${resource.id_espace}/${resource.id_liste}`);
            return;
          }
          navigate(`/workspace/${resource.workspace_id}/list/${resource.id_liste}`);
          return;
        }

        const liste = await listeService.getById(resource.id_liste);
        if (liste.id_workspace && liste.id_espace) {
          navigate(`/workspace/${liste.id_workspace}/${liste.id_espace}/${liste.id}`);
          return;
        }
        if (liste.id_workspace) {
          navigate(`/workspace/${liste.id_workspace}/list/${liste.id}`);
        }
      } finally {
        setOpeningTaskId(null);
      }
    },
  });

  const sections = [
    {
      key: 'created-workspaces',
      title: 'Workspaces créés',
      subtitle: "Les workspaces dont vous êtes le créateur.",
      items: createdWorkspaces.map((workspace) => buildWorkspaceItem(workspace, 'Créé')),
      emptyLabel: "Vous n'avez encore créé aucun workspace.",
    },
    {
      key: 'joined-workspaces',
      title: 'Workspaces accessibles',
      subtitle: "Les workspaces où vous êtes membre et que vous pouvez ouvrir.",
      items: joinedWorkspaces.map((workspace) => buildWorkspaceItem(workspace, 'Workspace')),
      emptyLabel: "Aucun workspace rejoint pour le moment.",
    },
    {
      key: 'joined-espaces',
      title: 'Espaces accessibles',
      subtitle: "Les espaces dont vous êtes membre avec accès direct.",
      items: espaces.map(buildEspaceItem),
      emptyLabel: "Aucun espace accessible pour le moment.",
    },
    {
      key: 'joined-listes',
      title: 'Listes accessibles',
      subtitle: "Les listes où vous intervenez directement.",
      items: listes.map(buildListeItem),
      emptyLabel: "Aucune liste accessible pour le moment.",
    },
    {
      key: 'joined-taches',
      title: 'Tâches accessibles',
      subtitle: "Les tâches qui vous concernent et que vous pouvez ouvrir.",
      items: taches.map(buildTaskItem),
      emptyLabel: "Aucune tâche accessible pour le moment.",
    },
  ];

  const hasResults = sections.some((section) => section.items.length > 0);

  const renderCard = (item: ResourceCardItem) => {
    const content = (
      <GlassCard className="group h-full overflow-hidden border border-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
              {item.icon}
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
              {item.badge}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-indigo-600">
            {item.nom}
          </h3>
          <p className="mt-2 min-h-[40px] text-sm text-gray-500">
            {item.description || item.meta || 'Accès direct à la ressource'}
          </p>

          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Users className="w-4 h-4" />
              <span>{item.role || 'Membre'}</span>
            </div>
            <span className="inline-flex items-center gap-1 font-medium text-indigo-600">
              Ouvrir <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </GlassCard>
    );

    if (item.href) {
      return (
        <Link key={item.id} to={item.href} className="block h-full">
          {content}
        </Link>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={item.onClick}
        className="block h-full w-full text-left"
        disabled={!item.onClick || openingTaskId === item.id}
      >
        {content}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl" />

        <Container className="relative py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-8 h-8 text-yellow-300" />
              <span className="text-sm font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                Mes accès
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Mes Ressources
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl">
              Retrouvez chaque workspace, espace, liste et tâche que vous pouvez ouvrir.
            </p>
            <AnimatedButton
              variant="secondary"
              size="lg"
              className="shadow-2xl"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouveau Workspace
            </AnimatedButton>
          </motion.div>
        </Container>
      </div>

      <Container className="py-12">
        {/* Barre de recherche et filtres */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher une ressource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
            {createdWorkspaces.length + joinedWorkspaces.length + espaces.length + listes.length + taches.length} accès trouvés
          </div>
        </motion.div>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.key}>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-gray-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
                  <p className="text-sm text-gray-500">{section.subtitle}</p>
                </div>
              </div>

              {section.items.length === 0 ? (
                <GlassCard className="p-6 text-sm text-gray-500">
                  {section.emptyLabel}
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {section.items.map(renderCard)}
                </div>
              )}
            </section>
          ))}
        </div>

        {!hasResults && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Briefcase className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
              Aucune ressource trouvée
            </h3>
            <p className="text-gray-500 mb-6">
              Ajuste la recherche ou crée ton premier workspace.
            </p>
            <AnimatedButton variant="primary" size="lg" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Créer un workspace
            </AnimatedButton>
          </motion.div>
        )}
      </Container>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleWorkspaceCreated}
      />
    </div>
  );
}
