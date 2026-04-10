import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Sparkles, Briefcase } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { workspaces } = useApp();

  // Version réduite (icônes seulement)
  if (!isOpen) {
    return (
      <div className="flex h-full flex-col bg-primary px-2 py-6 shadow-xl overflow-y-auto">
        <div className="mb-8 flex justify-center">
          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-white">KP</div>
        </div>
        <nav className="flex flex-col items-center space-y-4">
          <Link to="/dashboard" className="text-white/70 hover:text-white">
            <LayoutDashboard className="h-5 w-5" />
          </Link>
          <Link to="/chat" className="text-white/70 hover:text-white">
            <MessageSquare className="h-5 w-5" />
          </Link>
          <Link to="/talent" className="text-white/70 hover:text-white">
            <Sparkles className="h-5 w-5" />
          </Link>
        </nav>
      </div>
    );
  }

  // Version complète
  return (
    <div className="flex h-full flex-col bg-primary px-4 py-6 shadow-xl overflow-y-auto">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-white">KP</div>
        <span className="text-xl font-bold text-white">K‑Planner</span>
      </div>

      <div className="mb-6 flex items-center gap-3 px-2 py-2 bg-white/10 rounded-lg">
        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold">
          {user?.name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{user?.name || 'Invité'}</p>
          <p className="text-xs text-white/60">{user?.email || 'connecté'}</p>
        </div>
      </div>

      <nav className="space-y-1">
        <Link to="/dashboard">
          <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            location.pathname === '/dashboard' ? 'bg-white/10 text-white shadow-md' : 'text-white/70 hover:bg-white/5 hover:text-white'
          }`}>
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </div>
        </Link>
      </nav>

      <div className="mt-6 pt-4 border-t border-white/20">
        <h3 className="px-2 text-xs font-semibold text-white/50 uppercase tracking-wider">Environnements de travail</h3>
        <div className="mt-2 space-y-1">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              to={`/workspace/${ws.id}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/80 hover:bg-white/5"
            >
              <Briefcase className="h-4 w-4" />
              {ws.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-white/20">
        <Link to="/chat" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5">
          <MessageSquare className="h-5 w-5" />
          K‑Chat
        </Link>
        <Link to="/talent" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5">
          <Sparkles className="h-5 w-5" />
          Kapital‑Talent
        </Link>
      </div>

      <div className="mt-auto pt-4 text-center text-xs text-white/30">v1.0 Planner</div>
    </div>
  );
}
