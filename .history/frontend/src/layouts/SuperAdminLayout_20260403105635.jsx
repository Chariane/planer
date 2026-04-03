import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, selectCurrentUser } from '../../features/auth/authSlice.js';
import '../../styles/SuperAdminLayout.css';

const SuperAdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Nouveau super admin créé', read: false, time: '2 min', type: 'admin' },
    { id: 2, message: 'Sauvegarde système terminée', read: false, time: '15 min', type: 'system' },
    { id: 3, message: 'Alerte sécurité détectée', read: true, time: '1 heure', type: 'security' },
    { id: 4, message: 'Rapport mensuel généré', read: true, time: '2 heures', type: 'report' }
  ]);

  const [superAdmin, setSuperAdmin] = useState({
    id: 'SUP001',
    username: 'superadmin',
    nom: 'K-Planer',
    prenoms: 'Super Admin',
    email: 'superadmin@k-planer.com',
    avatar: 'SA',
    role: 'Super Administrateur',
    is_super_admin: true,
    telephone: '+228 90 00 00 02',
    permissions: ['all']
  });

  const menuItems = [
    { path: '/super-admin/dashboard', name: 'Dashboard', icon: '📊', description: 'Vue d\'ensemble système' },
    { path: '/super-admin/users', name: 'Utilisateurs', icon: '👥', description: 'Gestion globale utilisateurs' },
    { path: '/super-admin/enterprises', name: 'Entreprises', icon: '🏢', description: 'Toutes les entreprises' },
    { path: '/super-admin/admins', name: 'Administrateurs', icon: '👑', description: 'Gestion des admins' },
    { path: '/super-admin/system', name: 'Système', icon: '⚙️', description: 'Configuration système' },
    { path: '/super-admin/security', name: 'Sécurité', icon: '🔒', description: 'Paramètres de sécurité' },
    { path: '/super-admin/backup', name: 'Sauvegarde', icon: '💾', description: 'Gestion des sauvegardes' },
    { path: '/super-admin/logs', name: 'Logs', icon: '📋', description: 'Journaux système' },
    { path: '/super-admin/reports', name: 'Rapports', icon: '📈', description: 'Rapports avancés' },
    { path: '/super-admin/settings', name: 'Paramètres', icon: '🔧', description: 'Configuration globale' }
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
    dispatch(logout());
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const markNotificationAsRead = (id) => {
    setNotifications(notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="super-admin-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">👑</span>
            <span className={`logo-text ${isSidebarOpen ? 'visible' : 'hidden'}`}>
              Super Admin
            </span>
          </div>
          <button onClick={toggleSidebar} className="sidebar-toggle">
            {isSidebarOpen ? '◁' : '▷'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              title={isSidebarOpen ? '' : item.description}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className={`nav-label ${isSidebarOpen ? 'visible' : 'hidden'}`}>
                {item.name}
              </span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {superAdmin.avatar}
            </div>
            {isSidebarOpen && (
              <div className="user-details">
                <p className="user-name">
                  {superAdmin.prenoms} {superAdmin.nom}
                </p>
                <p className="user-role">Super Admin</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="logout-button">
            🚪
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Header */}
        <header className="main-header">
          <div className="header-left">
            <button
              onClick={toggleMobileMenu}
              className="mobile-menu-toggle"
            >
              ☰
            </button>
            <h1 className="page-title">
              {menuItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="header-right">
            {/* Notifications */}
            <div className="notifications-container">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="notifications-button"
              >
                🔔
                {unreadNotificationsCount > 0 && (
                  <span className="notification-badge">{unreadNotificationsCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <h3>Notifications</h3>
                    <button onClick={() => setShowNotifications(false)}>✕</button>
                  </div>
                  <div className="notifications-list">
                    {notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`notification-item ${!notif.read ? 'unread' : ''}`}
                        onClick={() => markNotificationAsRead(notif.id)}
                      >
                        <div className="notification-content">
                          <p className="notification-message">{notif.message}</p>
                          <span className="notification-time">{notif.time}</span>
                        </div>
                        {!notif.read && <div className="notification-dot"></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="user-menu-container">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="user-menu-button"
              >
                <div className="user-avatar-small">
                  {superAdmin.avatar}
                </div>
                <span className="user-name-small">
                  {superAdmin.prenoms}
                </span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <Link to="/super-admin/profile" className="menu-item">
                    <span>👤</span> Mon profil
                  </Link>
                  <Link to="/super-admin/settings" className="menu-item">
                    <span>⚙️</span> Paramètres
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={toggleMobileMenu}>
          <div className="mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h3>Menu Super Admin</h3>
              <button onClick={toggleMobileMenu}>✕</button>
            </div>
            <nav className="mobile-nav">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
                  className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={toggleMobileMenu}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminLayout;
