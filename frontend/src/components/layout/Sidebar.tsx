import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CheckSquare, KanbanSquare, Users, Calendar, FileText, Briefcase } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Workspaces', href: '/workspaces', icon: Briefcase },
  { name: 'Tâches', href: '/tasks', icon: CheckSquare },
  { name: 'Kanban', href: '/kanban', icon: KanbanSquare },
  { name: 'Utilisateurs', href: '/users', icon: Users },
  { name: 'Absences', href: '/absences', icon: Calendar },
  { name: 'Rapports', href: '/reports', icon: FileText },
];

export default function Sidebar() {
  const location = useLocation();
  return (
    <div className="flex h-full flex-col bg-[#264A67] px-4 py-6 shadow-xl">
      <div className="mb-10 flex items-center gap-2 px-2">
        <div className="h-8 w-8 rounded-lg bg-[#FF6600] flex items-center justify-center font-bold text-white">KP</div>
        <span className="text-xl font-bold text-white">K‑Planner</span>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link key={item.name} to={item.href}>
            <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              location.pathname === item.href ? 'bg-white/10 text-white shadow-md' : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}>
              <item.icon className="h-5 w-5" />
              {item.name}
            </div>
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/20 pt-4 mt-auto text-center text-xs text-white/50">v1.0 — Soutenance</div>
    </div>
  );
}
