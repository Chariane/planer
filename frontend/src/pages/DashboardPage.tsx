// frontend/src/pages/DashboardPage.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban, CheckSquare, Users,
  ArrowRight, TrendingUp, Zap,
  Star, Briefcase, PlusCircle, Bell, ChevronRight,
  Activity, Clock, LayoutGrid
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import CreateWorkspaceModal from '../components/workspace/CreateWorkspaceModal';

export default function DashboardPage() {
  const { workspaces, joinedEspaces, joinedTaches, loadWorkspaces, loadNavigationData } = useApp();
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    activeMembers: 0,
    recentActivities: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadWorkspaces();
    loadNavigationData();
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Simulation de données dynamiques
      const totalTasks = 42;
      const pendingTasks = 15;
      const completedTasks = 27;
      const activeMembers = workspaces.reduce((acc, ws) => acc + (ws.membres?.length || 0), 0);

      setStats({
        totalTasks,
        pendingTasks,
        completedTasks,
        activeMembers,
        recentActivities: [
          { id: 1, user: "Thomas D.", action: "a créé", target: "Design System", time: "2h", icon: "zap", color: "text-primary" },
          { id: 2, user: "Alice M.", action: "a terminé", target: "API Integration", time: "5h", icon: "check", color: "text-emerald-500" },
          { id: 3, user: "Lucas B.", action: "a rejoint", target: "K-Planner", time: "1j", icon: "user", color: "text-secondary" }
        ]
      });
    } catch (error) {
      console.error("Erreur chargement stats", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceCreated = () => {
    loadWorkspaces();
  };

  const statCards = [
    {
      label: "Workspaces",
      value: workspaces.length,
      icon: <Briefcase size={24} />,
      color: "bg-primary/10 text-primary",
      trend: "+12%",
      link: "/workspaces"
    },
    {
      label: "Espaces",
      value: workspaces.reduce((acc, ws) => acc + (ws.espaces?.length || 0), 0) + joinedEspaces.length,
      icon: <FolderKanban size={24} />,
      color: "bg-secondary/10 text-secondary",
      trend: "+8%",
      link: "#"
    },
    {
      label: "Tâches totales",
      value: stats.totalTasks + joinedTaches.length,
      icon: <CheckSquare size={24} />,
      color: "bg-emerald-500/10 text-emerald-500",
      trend: "+23%",
      link: "#"
    },
    {
      label: "Membres actifs",
      value: stats.activeMembers,
      icon: <Users size={24} />,
      color: "bg-purple-500/10 text-purple-400",
      trend: "+5%",
      link: "#"
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="h-12 w-12 rounded-2xl border-2 border-secondary/20 border-t-secondary animate-spin"></div>
        <p className="text-xs font-black text-theme-muted uppercase tracking-widest opacity-60">Initialisation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/10 shadow-lg shadow-secondary/5 transition-transform hover:scale-105">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-theme-main tracking-tight uppercase leading-none">Tableau de bord</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(255,102,0,0.6)]" />
                <p className="text-xs font-bold text-theme-muted uppercase tracking-widest opacity-60">Vue d'ensemble de vos projets</p>
              </div>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-2xl px-8 py-6 shadow-xl shadow-secondary/20 font-black uppercase tracking-widest text-[11px]"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Nouveau workspace
        </Button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={card.link} className="block group">
              <GlassCard className="p-6 transition-all duration-300 hover:border-secondary/30 hover:bg-theme-surface-hover shadow-theme-sm hover:shadow-theme-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-10 transition-opacity">
                  <div className="scale-[4] rotate-12">{card.icon}</div>
                </div>

                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] mb-3">{card.label}</p>
                    <p className="text-3xl font-black text-theme-main tracking-tighter">{card.value}</p>
                    <div className="flex items-center gap-1.5 mt-4">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tight">{card.trend}</span>
                      <span className="text-[10px] font-bold text-theme-muted opacity-40 uppercase tracking-tighter ml-1">vs mois dernier</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl shadow-inner border border-white/5 transition-transform group-hover:scale-110 ${card.color}`}>
                    {card.icon}
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Grid pour Activités et Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activités récentes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-black text-theme-main tracking-tighter flex items-center gap-3 uppercase">
              <Activity className="h-5 w-5 text-primary" />
              Activités récentes
            </h3>
            <button className="text-[10px] font-black text-secondary hover:underline flex items-center gap-1.5 uppercase tracking-widest opacity-80 hover:opacity-100 transition-all">
              Voir tout <ArrowRight size={14} />
            </button>
          </div>

          <GlassCard className="p-2 border-white/5 bg-theme-surface/30">
            <div className="space-y-1">
              {stats.recentActivities.map((activity, idx) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/[0.03] transition-colors group cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl bg-theme-surface border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${activity.color}`}>
                    {activity.icon === 'zap' && <Zap size={18} />}
                    {activity.icon === 'check' && <CheckSquare size={18} />}
                    {activity.icon === 'user' && <Users size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-theme-main font-medium leading-tight">
                      <span className="font-bold">{activity.user}</span>
                      <span className="text-theme-muted opacity-60"> {activity.action} </span>
                      <span className="font-bold text-primary group-hover:text-secondary transition-colors">{activity.target}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1 px-0.5">
                      <Clock size={10} className="text-theme-muted opacity-30" />
                      <span className="text-[10px] font-black text-theme-muted opacity-30 uppercase tracking-tighter">il y a {activity.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Workspaces récents + Notifications */}
        <div className="space-y-10">
          <div className="space-y-6">
            <h3 className="text-xl font-black text-theme-main tracking-tighter flex items-center gap-3 uppercase px-1">
              <Star className="h-5 w-5 text-yellow-500" />
              Favoris
            </h3>
            <GlassCard className="p-4 border-white/5 space-y-2">
              {workspaces.slice(0, 4).length > 0 ? (
                workspaces.slice(0, 4).map((ws) => (
                  <Link
                    key={ws.id}
                    to={`/workspace/${ws.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-all group border border-transparent hover:border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/20 group-hover:rotate-6 transition-transform">
                        {ws.nom.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-theme-main group-hover:text-secondary transition-colors">{ws.nom}</p>
                        <p className="text-[10px] font-black text-theme-muted opacity-40 uppercase tracking-widest">{ws.membres?.length || 1} membres</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-theme-muted opacity-0 group-hover:opacity-60 group-hover:translate-x-1 transition-all" />
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs font-black text-theme-muted uppercase tracking-widest opacity-20 italic">Aucun favori</p>
                </div>
              )}
              <Link to="/workspaces" className="mt-4 px-3 text-[10px] font-black text-secondary hover:underline inline-flex items-center gap-1.5 uppercase tracking-widest opacity-80 hover:opacity-100 transition-all">
                Voir tout <ArrowRight size={12} />
              </Link>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black text-theme-main tracking-tighter flex items-center gap-3 uppercase px-1">
              <Bell className="h-5 w-5 text-primary" />
              Notifs
            </h3>
            <GlassCard className="p-8 flex flex-col items-center justify-center text-center space-y-4 border-white/5 bg-theme-surface/20 min-h-[180px]">
              <div className="p-4 rounded-full bg-theme-surface/50 border border-white/5 shadow-inner">
                <Bell size={24} className="text-theme-muted opacity-20" />
              </div>
              <div>
                <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest opacity-40 leading-relaxed">
                  Aucun message<br />pour le moment
                </p>
              </div>
            </GlassCard>
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