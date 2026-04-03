import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../../../styles/AdminLayout.css';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [stats, setStats] = useState({
    totalUtilisateurs: 1248,
    totalEntreprises: 89,
    totalProjets: 342,
    totalWorkspaces: 156,
    abonnementsActifs: 67,
    revenusMois: 2450000
  });
  
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Nouvel utilisateur inscrit', read: false, time: '5 min', type: 'user' },
    { id: 2, message: 'Nouvelle entreprise enregistrée', read: false, time: '15 min', type: 'entreprise' },
    { id: 3, message: 'Paiement abonnement reçu', read: true, time: '1 heure', type: 'payment' },
    { id: 4, message: 'Rapport mensuel généré', read: true, time: '2 heures', type: 'report' }
  ]);

  const [admin, setAdmin] = useState({
    id: 'ADM001',
    username: 'admin',
    nom: 'Kouassi',
    prenoms: 'Marie',
    email: 'admin@k-planer.com',
    avatar: 'MK',
    role: 'Administrateur',
    is_admin: true,
    is_super_admin: false,
    telephone: '+228 90 00 00 01'
  });

  const menuItems = [
    { path: '/admin/dashboard', name: 'Dashboard', icon: '📊', description: 'Vue d\'ensemble' },
    { path: '/admin/utilisateurs', name: 'Utilisateurs', icon: '👥', description: 'Gérer les utilisateurs' },
    { path: '/admin/entreprises', name: 'Entreprises', icon: '🏢', description: 'Gérer les entreprises' },
    { path: '/admin/projets', name: 'Projets', icon: '📁', description: 'Tous les projets' },
    { path: '/admin/workspaces', name: 'Workspaces', icon: '🏗️', description: 'Espaces de travail' },
    { path: '/admin/abonnements', name: 'Abonnements', icon: '💳', description: 'Gestion des abonnements' },
    { path: '/admin/paiements', name: 'Paiements', icon: '💰', description: 'Historique des paiements' },
    { path: '/admin/statistiques', name: 'Statistiques', icon: '📈', description: 'Analyses détaillées' },
    { path: '/admin/rapports', name: 'Rapports', icon: '📄', description: 'Générer des rapports' },
    { path: '/admin/logs', name: 'Logs système', icon: '📝', description: 'Journal d\'activité' },
    { path: '/admin/parametres', name: 'Paramètres', icon: '⚙️', description: 'Configuration' },
  ];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-icon">👑</div>
            {isSidebarOpen && (
              <div className="logo-text">
                <span className="logo-main">K-PLANER</span>
                <span className="logo-sub">Administration</span>
              </div>
            )}
          </div>
          <button 
            className="sidebar-toggle" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <div className="admin-stats-preview">
          <div className="stat-preview-item">
            <span className="stat-icon">👥</span>
            {isSidebarOpen && (
              <div className="stat-info">
                <span className="stat-value">{stats.totalUtilisateurs}</span>
                <span className="stat-label">Utilisateurs</span>
              </div>
            )}
          </div>
          <div className="stat-preview-item">
            <span className="stat-icon">🏢</span>
            {isSidebarOpen && (
              <div className="stat-info">
                <span className="stat-value">{stats.totalEntreprises}</span>
                <span className="stat-label">Entreprises</span>
              </div>
            )}
          </div>
        </div>

        <nav className="nav-menu">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {isSidebarOpen && (
                <div className="nav-text">
                  <span>{item.name}</span>
                  <span className="nav-description">{item.description}</span>
                </div>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-indicator online"></div>
            {isSidebarOpen && <span>Système opérationnel</span>}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            {isSidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Main Content */}
      <main className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
        <header className="top-header">
          <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
            ☰
          </button>

          <div className="header-title">
            <h1>{menuItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}</h1>
            <p>{menuItems.find(item => item.path === location.pathname)?.description || 'Panel d\'administration'}</p>
          </div>

          <div className="header-actions">
            {/* Quick Actions */}
            <div className="quick-actions">
              <button className="quick-action-btn" title="Exporter les données">
                📥
              </button>
              <button className="quick-action-btn" title="Générer un rapport">
                📊
              </button>
              <button className="quick-action-btn" title="Paramètres rapides">
                ⚡
              </button>
            </div>

            {/* Notifications */}
            <div className="notification-dropdown">
              <button 
                className="notification-badge"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <span>🔔</span>
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="dropdown-menu notifications-menu">
                  <div className="dropdown-header">
                    <h4>Notifications</h4>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="mark-all-read">
                        Tout marquer
                      </button>
                    )}
                  </div>
                  <div className="notifications-list">
                    {notifications.length === 0 ? (
                      <div className="no-notifications">Aucune notification</div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`notification-item ${!notif.read ? 'unread' : ''}`}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <div className={`notification-icon ${notif.type}`}>
                            {notif.type === 'user' && '👤'}
                            {notif.type === 'entreprise' && '🏢'}
                            {notif.type === 'payment' && '💰'}
                            {notif.type === 'report' && '📄'}
                          </div>
                          <div className="notification-content">
                            <p>{notif.message}</p>
                            <span className="notification-time">{notif.time}</span>
                          </div>
                          {!notif.read && <div className="unread-dot"></div>}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="dropdown-footer">
                    <Link to="/admin/notifications">Voir toutes les notifications</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Menu */}
            <div className="user-dropdown">
              <div 
                className="user-profile"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="user-avatar">{admin.avatar}</div>
                {isSidebarOpen && (
                  <div className="user-info">
                    <div className="user-name">{admin.prenoms} {admin.nom}</div>
                    <div className="user-role">{admin.role}</div>
                  </div>
                )}
              </div>
              {showUserMenu && (
                <div className="dropdown-menu user-menu">
                  <div className="user-info-header">
                    <div className="user-avatar large">{admin.avatar}</div>
                    <div>
                      <div className="user-name">{admin.prenoms} {admin.nom}</div>
                      <div className="user-email">{admin.email}</div>
                      <div className="user-role-badge">{admin.role}</div>
                    </div>
                  </div>
                  <div className="menu-divider"></div>
                  <Link to="/admin/profile" className="menu-item">
                    <span>👤</span> Mon profil
                  </Link>
                  <Link to="/admin/parametres" className="menu-item">
                    <span>⚙️</span> Paramètres
                  </Link>
                  <Link to="/admin/securite" className="menu-item">
                    <span>🔒</span> Sécurité
                  </Link>
                  <div className="menu-divider"></div>
                  <button onClick={handleLogout} className="menu-item logout">
                    <span>🚪</span> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;