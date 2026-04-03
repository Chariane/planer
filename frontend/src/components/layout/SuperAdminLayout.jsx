import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, selectCurrentUser } from '../../features/auth/authSlice.js';
import '../../../styles/SuperAdminLayout.css';

// Composant pour les statistiques globales du Super Admin
export const SuperAdminStatsCards = ({ stats, onRefresh }) => {
  const statCards = [
    {
      title: 'Utilisateurs totaux',
      value: stats.totalUtilisateurs,
      icon: '👥',
      color: '#4361ee',
      trend: stats.trendUtilisateurs
    },
    {
      title: 'Entreprises actives',
      value: stats.entreprisesActives,
      icon: '🏢',
      color: '#7209b7',
      trend: stats.trendEntreprises
    },
    {
      title: 'Admins système',
      value: stats.adminsSysteme,
      icon: '👑',
      color: '#ef476f',
      trend: stats.trendAdmins
    },
    {
      title: 'Revenus mensuels',
      value: `${stats.revenusMensuels} XOF`,
      icon: '💰',
      color: '#06d6a0',
      trend: stats.trendRevenus
    }
  ];

  return (
    <div className="super-admin-stats-grid">
      {statCards.map((stat, index) => (
        <div key={index} className="super-admin-stat-card">
          <div className="stat-icon" style={{ backgroundColor: stat.color }}>
            {stat.icon}
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{stat.value}</h3>
            <p className="stat-title">{stat.title}</p>
            <span className={`stat-trend ${stat.trend.startsWith('+') ? 'positive' : 'negative'}`}>
              {stat.trend}
            </span>
          </div>
        </div>
      ))}
      <button onClick={onRefresh} className="refresh-button">
        🔄 Actualiser
      </button>
    </div>
  );
};

// Composant pour les actions rapides du Super Admin
export const SuperAdminQuickActions = ({ onAction }) => {
  const actions = [
    { icon: '👤', label: 'Créer Admin', action: 'create_admin' },
    { icon: '🏢', label: 'Gérer Entreprises', action: 'manage_enterprises' },
    { icon: '📊', label: 'Rapports Système', action: 'system_reports' },
    { icon: '⚙️', label: 'Configuration', action: 'system_config' },
    { icon: '🔒', label: 'Sécurité', action: 'security_settings' },
    { icon: '💾', label: 'Sauvegarde', action: 'backup_system' }
  ];

  return (
    <div className="super-admin-quick-actions">
      <h3>Actions Rapides</h3>
      <div className="actions-grid">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => onAction(action.action)}
            className="action-button"
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Composant principal du layout Super Admin
const SuperAdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalUtilisateurs: 1250,
    entreprisesActives: 45,
    adminsSysteme: 8,
    revenusMensuels: 2500000,
    trendUtilisateurs: '+12%',
    trendEntreprises: '+8%',
    trendAdmins: '+2%',
    trendRevenus: '+15%'
  });

  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleRefreshStats = () => {
    // Simulation de rafraîchissement des stats
    setStats(prev => ({
      ...prev,
      totalUtilisateurs: prev.totalUtilisateurs + Math.floor(Math.random() * 10)
    }));
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'create_admin':
        navigate('/super-admin/create-admin');
        break;
      case 'manage_enterprises':
        navigate('/super-admin/enterprises');
        break;
      case 'system_reports':
        navigate('/super-admin/reports');
        break;
      case 'system_config':
        navigate('/super-admin/config');
        break;
      case 'security_settings':
        navigate('/super-admin/security');
        break;
      case 'backup_system':
        navigate('/super-admin/backup');
        break;
      default:
        break;
    }
  };

  const menuItems = [
    { path: '/super-admin/dashboard', icon: '📊', label: 'Tableau de bord' },
    { path: '/super-admin/users', icon: '👥', label: 'Gestion Utilisateurs' },
    { path: '/super-admin/enterprises', icon: '🏢', label: 'Entreprises' },
    { path: '/super-admin/admins', icon: '👑', label: 'Administrateurs' },
    { path: '/super-admin/system', icon: '⚙️', label: 'Système' },
    { path: '/super-admin/reports', icon: '📈', label: 'Rapports' },
    { path: '/super-admin/settings', icon: '🔧', label: 'Paramètres' }
  ];

  return (
    <div className="super-admin-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">👑</span>
            <span className={`logo-text ${sidebarOpen ? 'visible' : 'hidden'}`}>
              Super Admin
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sidebar-toggle"
          >
            {sidebarOpen ? '◁' : '▷'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className="nav-item"
            >
              <span className="nav-icon">{item.icon}</span>
              <span className={`nav-label ${sidebarOpen ? 'visible' : 'hidden'}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {currentUser?.prenoms?.[0]}{currentUser?.nom?.[0]}
            </div>
            {sidebarOpen && (
              <div className="user-details">
                <p className="user-name">
                  {currentUser?.prenoms} {currentUser?.nom}
                </p>
                <p className="user-role">Super Administrateur</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="logout-button">
            🚪
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className="main-header">
          <div className="header-content">
            <h1>Tableau de bord Super Administrateur</h1>
            <div className="header-actions">
              <span className="current-date">
                {new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </header>

        <div className="content-wrapper">
          <SuperAdminStatsCards stats={stats} onRefresh={handleRefreshStats} />
          <SuperAdminQuickActions onAction={handleQuickAction} />

          <div className="main-content-area">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
