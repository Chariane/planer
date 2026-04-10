import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';
import { FolderKanban, CheckSquare, Users, Calendar } from 'lucide-react';

export default function GlobalStats() {
  const { workspaces, tasks } = useApp(); // tasks à ajouter dans AppContext
  const { user } = useAuth();

  // Données mockées pour les absences (à remplacer par le vrai contexte plus tard)
  const pendingAbsences = 2;

  const totalTasks = tasks?.length || 0;
  const totalWorkspaces = workspaces.length;
  const totalMembers = workspaces.reduce((acc, ws) => acc + ws.members.length, 0);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="flex items-center justify-between">
        <div><p className="text-sm text-gray-500">Workspaces</p><p className="text-3xl font-bold">{totalWorkspaces}</p></div>
        <div className="rounded-full bg-blue-50 p-3"><FolderKanban className="h-6 w-6 text-primary" /></div>
      </Card>
      <Card className="flex items-center justify-between">
        <div><p className="text-sm text-gray-500">Tâches totales</p><p className="text-3xl font-bold">{totalTasks}</p></div>
        <div className="rounded-full bg-orange-50 p-3"><CheckSquare className="h-6 w-6 text-secondary" /></div>
      </Card>
      <Card className="flex items-center justify-between">
        <div><p className="text-sm text-gray-500">Membres</p><p className="text-3xl font-bold">{totalMembers}</p></div>
        <div className="rounded-full bg-emerald-50 p-3"><Users className="h-6 w-6 text-emerald-600" /></div>
      </Card>
      <Card className="flex items-center justify-between">
        <div><p className="text-sm text-gray-500">Absences en attente</p><p className="text-3xl font-bold">{pendingAbsences}</p></div>
        <div className="rounded-full bg-purple-50 p-3"><Calendar className="h-6 w-6 text-purple-600" /></div>
      </Card>
    </div>
  );
}
