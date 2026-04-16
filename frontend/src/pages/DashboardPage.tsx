// frontend/src/pages/DashboardPage.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderKanban, CheckSquare, Users, Calendar, 
  ArrowRight, TrendingUp, Clock, Zap, 
  Star, Briefcase, PlusCircle, Bell, ChevronRight,
  Activity, Target, Award
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GlassCard } from '../components/ui/GlassCard';
import { workspaceService } from '../services/workspace.service';
import { espaceService } from '../services/espace.service';

export default function DashboardPage() {
  const { workspaces, loadWorkspaces } = useApp();
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    activeMembers: 0,
    recentActivities: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Simulation de données dynamiques (à adapter avec vos vrais endpoints)
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
          { id: 1, user: "Thomas D.", action: "a créé", target: "Design System", time: "2h", icon: "zap" },
          { id: 2, user: "Alice M.", action: "a terminé", target: "API Integration", time: "5h", icon: "check" },
          { id: 3, user: "Lucas B.", action: "a rejoint", target: "K-Planner", time: "1j", icon: "user" }
        ]
      });
    } catch (error) {
      console.error("Erreur chargement stats", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      label: "Workspaces", 
      value: workspaces.length, 
      icon: <Briefcase className="w-6 h-6" />, 
      color: "bg-blue-100 text-primary",
      trend: "+12%",
      link: "/workspaces"
    },
    { 
      label: "Espaces", 
      value: workspaces.reduce((acc, ws) => acc + (ws.espaces?.length || 0), 0), 
      icon: <FolderKanban className="w-6 h-6" />, 
      color: "bg-orange-100 text-secondary",
      trend: "+8%",
      link: "#"
    },
    { 
      label: "Tâches totales", 
      value: stats.totalTasks, 
      icon: <CheckSquare className="w-6 h-6" />, 
      color: "bg-emerald-100 text-emerald-600",
      trend: "+23%",
      link: "#"
    },
    { 
      label: "Membres actifs", 
      value: stats.activeMembers, 
      icon: <Users className="w-6 h-6" />, 
      color: "bg-purple-100 text-purple-600",
      trend: "+5%",
      link: "#"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête avec bienvenue */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Tableau de bord
          </h1>
          <p className="text-gray-500 mt-1">
            Bienvenue ! Voici ce qui se passe aujourd'hui.
          </p>
        </div>
        <Link 
          to="/workspaces/new" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl hover:bg-secondary/90 transition-colors shadow-sm"
        >
          <PlusCircle className="w-5 h-5" />
          Nouveau workspace
        </Link>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, index) => (
          <Link key={index} to={card.link} className="block group">
            <GlassCard className="p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-xs text-emerald-600">{card.trend}</span>
                    <span className="text-xs text-gray-400">vs mois dernier</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  {card.icon}
                </div>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activités récentes */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-gray-900">Activités récentes</h3>
              </div>
              <button className="text-sm text-secondary hover:underline flex items-center gap-1">
                Voir tout <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {stats.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {activity.icon === 'zap' && <Zap className="w-4 h-4 text-primary" />}
                    {activity.icon === 'check' && <CheckSquare className="w-4 h-4 text-emerald-500" />}
                    {activity.icon === 'user' && <Users className="w-4 h-4 text-secondary" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{activity.user}</span>
                      <span className="text-gray-500"> {activity.action} </span>
                      <span className="font-medium text-primary">{activity.target}</span>
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">il y a {activity.time}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Workspaces récents + Actions rapides */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-gray-900">Workspaces récents</h3>
              </div>
            </div>
            <div className="space-y-3">
              {workspaces.slice(0, 3).map((ws) => (
                <Link key={ws.id} to={`/workspace/${ws.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div>
                    <p className="font-medium text-gray-800 group-hover:text-primary transition-colors">{ws.nom}</p>
                    <p className="text-xs text-gray-400">{ws.membres?.length || 1} membres</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-secondary transition-colors" />
                </Link>
              ))}
            </div>
            <Link to="/workspaces" className="mt-4 text-sm text-secondary hover:underline inline-flex items-center gap-1">
              Voir tous les workspaces <ArrowRight className="w-3 h-3" />
            </Link>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-gray-900">Notifications</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 text-center py-4">
                Aucune notification pour le moment
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}