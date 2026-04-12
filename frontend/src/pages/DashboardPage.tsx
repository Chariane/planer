import Card from '../components/ui/Card';
import { useApp } from '../contexts/AppContext';
import { Link } from 'react-router-dom';
import { FolderKanban, CheckSquare, Users, Calendar } from 'lucide-react';

export default function DashboardPage() {
  const { workspaces } = useApp();
  const totalTasks = 12; // À remplacer par données réelles
  const totalMembers = workspaces.reduce((acc, ws) => acc + ws.members.length, 0);
  const pendingAbsences = 2;

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-gray-500 mt-1">Vue d’ensemble de votre activité</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="flex items-center justify-between p-4 md:p-6">
          <div><p className="text-sm text-gray-500">Workspaces</p><p className="text-2xl md:text-3xl font-bold">{workspaces.length}</p></div>
          <div className="rounded-full bg-blue-50 p-3"><FolderKanban className="h-6 w-6 text-primary" /></div>
        </Card>
        <Card className="flex items-center justify-between p-4 md:p-6">
          <div><p className="text-sm text-gray-500">Tâches totales</p><p className="text-2xl md:text-3xl font-bold">{totalTasks}</p></div>
          <div className="rounded-full bg-orange-50 p-3"><CheckSquare className="h-6 w-6 text-secondary" /></div>
        </Card>
        <Card className="flex items-center justify-between p-4 md:p-6">
          <div><p className="text-sm text-gray-500">Membres</p><p className="text-2xl md:text-3xl font-bold">{totalMembers}</p></div>
          <div className="rounded-full bg-emerald-50 p-3"><Users className="h-6 w-6 text-emerald-600" /></div>
        </Card>
        <Card className="flex items-center justify-between p-4 md:p-6">
          <div><p className="text-sm text-gray-500">Absences en attente</p><p className="text-2xl md:text-3xl font-bold">{pendingAbsences}</p></div>
          <div className="rounded-full bg-purple-50 p-3"><Calendar className="h-6 w-6 text-purple-600" /></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-4 md:p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Activités récentes</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm"><span className="font-medium">Thomas D.</span><span className="text-gray-500">a créé le workspace</span><span className="font-medium">K-Planner Dev</span><span className="text-gray-400 ml-auto">il y a 2 heures</span></div>
              <div className="flex items-center gap-2 text-sm"><span className="font-medium">Alice M.</span><span className="text-gray-500">a ajouté une tâche</span><span className="font-medium">Implémenter le drag & drop</span><span className="text-gray-400 ml-auto">il y a 1 jour</span></div>
              <div className="flex items-center gap-2 text-sm"><span className="font-medium">Bob L.</span><span className="text-gray-500">a terminé</span><span className="font-medium">Concevoir le pie chart</span><span className="text-gray-400 ml-auto">il y a 2 jours</span></div>
            </div>
          </Card>
        </div>
        <div>
          <Card className="p-4 md:p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Workspaces récents</h3>
            <div className="space-y-2">
              {workspaces.slice(0, 3).map(ws => (
                <Link key={ws.id} to={`/workspace/${ws.id}`} className="block p-2 hover:bg-gray-50 rounded">
                  <p className="font-medium">{ws.name}</p>
                  <p className="text-xs text-gray-400">{ws.members.length} membres</p>
                </Link>
              ))}
            </div>
            <Link to="/workspace" className="text-sm text-secondary mt-3 inline-block">Voir tous les workspaces →</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
