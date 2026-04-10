import GlobalStats from '../components/dashboard/GlobalStats';
import RecentActivities from '../components/dashboard/RecentActivities';
import Card from '../components/ui/Card';
import { useApp } from '../contexts/AppContext';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { workspaces } = useApp();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-gray-500 mt-1">Vue d’ensemble de votre activité</p>
      </div>

      <GlobalStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivities />
        </div>
        <div>
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Workspaces récents</h3>
            <div className="space-y-2">
              {workspaces.slice(0, 3).map(ws => (
                <Link key={ws.id} to={`/workspaces/${ws.id}`} className="block p-2 hover:bg-gray-50 rounded">
                  <p className="font-medium">{ws.name}</p>
                  <p className="text-xs text-gray-400">{ws.members.length} membres</p>
                </Link>
              ))}
            </div>
            <Link to="/workspaces" className="text-sm text-secondary mt-3 inline-block">Voir tous les workspaces →</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
