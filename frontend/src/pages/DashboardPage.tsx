import Card from '../components/ui/Card';
import { FolderKanban, CheckSquare, Users } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div><h2 className="text-3xl font-bold text-gray-900">Tableau de bord</h2><p className="text-gray-500 mt-1">Bienvenue sur K‑Planner</p></div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Workspaces</p><p className="text-3xl font-bold">2</p></div><div className="rounded-full bg-blue-50 p-3"><FolderKanban className="h-6 w-6 text-[#264A67]" /></div></Card>
        <Card className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Tâches</p><p className="text-3xl font-bold">5</p></div><div className="rounded-full bg-orange-50 p-3"><CheckSquare className="h-6 w-6 text-[#FF6600]" /></div></Card>
        <Card className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Membres</p><p className="text-3xl font-bold">3</p></div><div className="rounded-full bg-emerald-50 p-3"><Users className="h-6 w-6 text-emerald-600" /></div></Card>
      </div>
    </div>
  );
}
