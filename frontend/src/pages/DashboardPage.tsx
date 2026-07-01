// frontend/src/pages/DashboardPage.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban, CheckSquare, Users,
  ArrowRight, TrendingUp,
  Star, Briefcase, PlusCircle, Bell, ChevronRight,
  Activity, Clock, LayoutGrid, Sparkles, Zap, Calendar, Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import CreateWorkspaceModal from '../components/workspace/CreateWorkspaceModal';

export default function DashboardPage() {
  const {
    workspaces = [],
    joinedWorkspaces = [],
    joinedEspaces = [],
    joinedListes = [],
    loadWorkspaces,
    loadNavigationData,
    dashboardStats,
    loadDashboardStats
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadWorkspaces(),
        loadNavigationData(),
        loadDashboardStats()
      ]);
      setLoading(false);
    };
    init();
  }, []);

  const handleWorkspaceCreated = () => {
    loadWorkspaces();
    loadDashboardStats();
  };

  const statCards = [
    {
      label: "Workspaces",
      value: (workspaces || []).length + (joinedWorkspaces || []).length,
      icon: <Briefcase size={24} />,
      color: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/20",
      trend: "+12%",
      link: "/workspaces"
    },
    {
      label: "Espaces",
      value: dashboardStats?.total_spaces || 0,
      icon: <FolderKanban size={24} />,
      color: "from-orange-500/20 to-orange-600/10 text-orange-400 border-orange-500/20",
      trend: "+8%",
      link: "#"
    },
    {
      label: "Projets",
      value: dashboardStats?.total_projects || 0,
      icon: <CheckSquare size={24} />,
      color: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/20",
      trend: "+23%",
      link: "#"
    },
    {
      label: "Membres actifs",
      value: dashboardStats?.active_members || 0,
      icon: <Users size={24} />,
      color: "from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/20",
      trend: "+5%",
      link: "#"
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
        <div className="h-14 w-14 rounded-2xl border-4 border-secondary/20 border-t-secondary animate-spin shadow-lg shadow-secondary/10"></div>
        <p className="text-xs font-black text-theme-muted uppercase tracking-widest opacity-60 animate-pulse">Initialisation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
        
        {/* Hero Section avec plus d'élégance */}
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-secondary/30 blur-xl rounded-full"></div>
                <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-secondary to-orange-400 flex items-center justify-center shadow-2xl shadow-secondary/30 border border-white/10">
                  <LayoutGrid size={28} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
                  Tableau de bord
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="h-2 w-2 rounded-full bg-secondary shadow-[0_0_12px_rgba(255,102,0,0.7)]"></span>
                  <p className="text-sm font-medium text-white/40 uppercase tracking-widest">
                    Vue d'ensemble de vos projets
                  </p>
                  <Sparkles size={14} className="text-secondary/60" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full md:w-auto flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto rounded-2xl px-8 py-6 bg-gradient-to-r from-secondary to-orange-500 hover:from-secondary hover:to-orange-400 text-white shadow-2xl shadow-secondary/30 font-black uppercase tracking-widest text-xs transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-white/10"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Nouveau workspace
            </Button>
          </div>
          {/* Décorative subtle gradient line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary/20 to-transparent"></div>
        </div>

        {/* Statistiques - Cartes Premium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {statCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, type: 'spring', stiffness: 300 }}
            >
              <Link to={card.link} className="block group h-full">
                <div className={`relative h-full rounded-2xl bg-gradient-to-br ${card.color} backdrop-blur-sm border shadow-lg shadow-slate-900/40 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-secondary/10 hover:-translate-y-1 group`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                  <div className="relative p-5 sm:p-6 flex flex-col justify-between h-full">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">{card.label}</p>
                        <p className="text-4xl font-black text-white tracking-tight">{card.value}</p>
                      </div>
                      <div className={`p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                        <div className="text-white/80">{card.icon}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <TrendingUp size={14} className="text-emerald-400" />
                      <span className="text-xs font-black text-emerald-400 tracking-tight">{card.trend}</span>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter ml-1">vs mois dernier</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Contenu principal : Activités + Sidebar droit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Colonne de gauche : Activités récentes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-xl border border-secondary/10">
                  <Activity size={20} className="text-secondary" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Activités récentes</h3>
              </div>
              <button className="text-xs font-black text-white/40 hover:text-secondary transition-colors flex items-center gap-1 uppercase tracking-widest hover:gap-2 duration-300">
                Voir tout <ArrowRight size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {(dashboardStats?.recent_activities || []).length > 0 ? (
                dashboardStats.recent_activities.map((activity: any, idx: number) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.06, type: 'spring' }}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 hover:border-secondary/20 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-secondary/5"
                  >
                    <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/10 group-hover:scale-110 transition-transform duration-300">
                      <Bell size={18} className="text-secondary/70 group-hover:text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 font-medium leading-relaxed">
                        {activity.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock size={12} className="text-white/20" />
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
                          {new Date(activity.date_creation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/10 group-hover:text-white/30 transition-all" />
                  </motion.div>
                ))
              ) : (
                <div className="py-16 text-center rounded-2xl border border-dashed border-white/5 bg-white/5">
                  <Bell size={40} className="text-white/10 mx-auto mb-4" />
                  <p className="text-sm font-black text-white/20 uppercase tracking-widest">Aucune activité récente</p>
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite : Favoris, Collaborations, Notifs */}
          <div className="space-y-8">
            {/* Favoris */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <Star size={18} className="text-yellow-400/80" />
                <h3 className="text-lg font-black text-white tracking-tight uppercase">Favoris</h3>
              </div>
              <div className="space-y-2">
                {workspaces.filter(ws => ws.current_user_role !== null).slice(0, 4).length > 0 ? (
                  workspaces.filter(ws => ws.current_user_role !== null).slice(0, 4).map((ws) => (
                    <Link
                      key={ws.id}
                      to={`/workspace/${ws.id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 hover:border-secondary/20 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-secondary/20 to-orange-400/20 flex items-center justify-center font-black text-secondary border border-secondary/20 group-hover:rotate-6 transition-transform">
                          {ws.nom.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate group-hover:text-secondary transition-colors">{ws.nom}</p>
                          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{ws.membres?.length || 1} membres</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-white/10 group-hover:text-white/30 transition-all" />
                    </Link>
                  ))
                ) : (
                  <div className="py-10 text-center rounded-xl border border-dashed border-white/5 bg-white/5">
                    <Star size={28} className="text-white/10 mx-auto mb-2" />
                    <p className="text-xs font-black text-white/20 uppercase tracking-widest">Aucun favori</p>
                  </div>
                )}
                <Link to="/workspaces" className="block mt-3 text-[10px] font-black text-white/30 hover:text-secondary transition-colors flex items-center gap-1 uppercase tracking-widest hover:gap-2 duration-300">
                  Voir tout <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            {/* Collaborations */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <Users size={18} className="text-sky-400/80" />
                <h3 className="text-lg font-black text-white tracking-tight uppercase">Collaborations</h3>
              </div>
              <div className="space-y-2">
                {(joinedWorkspaces.length > 0 || joinedEspaces.length > 0 || joinedListes.length > 0) ? (
                  <>
                    {joinedWorkspaces.map(ws => (
                      <Link key={ws.id} to={`/workspace/${ws.id}`} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                        <div className="h-8 w-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-black text-[10px] border border-secondary/20">WS</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-secondary">{ws.nom}</p>
                          <p className="text-[9px] font-black text-white/20 uppercase tracking-tighter">Workspace rejoint</p>
                        </div>
                      </Link>
                    ))}
                    {joinedEspaces.map(es => (
                      <Link key={es.id} to={`/espace/${es.id}`} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-[10px] border border-primary/20">ES</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-secondary">{es.nom}</p>
                          <p className="text-[9px] font-black text-white/20 uppercase tracking-tighter">Espace • {es.workspace_nom}</p>
                        </div>
                      </Link>
                    ))}
                    {joinedListes.map(ls => (
                      <Link key={ls.id} to={`/liste/${ls.id}`} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-[10px] border border-emerald-500/20">LS</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-secondary">{ls.nom}</p>
                          <p className="text-[9px] font-black text-white/20 uppercase tracking-tighter">Liste • {ls.workspace_nom}</p>
                        </div>
                      </Link>
                    ))}
                  </>
                ) : (
                  <div className="py-10 text-center rounded-xl border border-dashed border-white/5 bg-white/5">
                    <Users size={28} className="text-white/10 mx-auto mb-2" />
                    <p className="text-xs font-black text-white/20 uppercase tracking-widest">Aucune collaboration</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notifications - style épuré */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <Bell size={18} className="text-primary/80" />
                <h3 className="text-lg font-black text-white tracking-tight uppercase">Notifications</h3>
              </div>
              <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5 p-6 flex flex-col items-center justify-center text-center min-h-[140px]">
                <div className="p-3 rounded-full bg-white/5 border border-white/5">
                  <Bell size={28} className="text-white/20" />
                </div>
                <p className="mt-4 text-sm font-black text-white/20 uppercase tracking-widest leading-relaxed">
                  Aucun message<br />pour le moment
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modale de création de workspace */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleWorkspaceCreated}
      />
    </div>
  );
}