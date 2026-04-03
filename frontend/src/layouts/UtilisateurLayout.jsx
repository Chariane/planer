import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/UtilisateurLayout.css';

const UtilisateurLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Nouvelle tâche assignée', read: false, time: '5 min' },
    { id: 2, message: 'Projet "Mobile App" à 80%', read: false, time: '1 heure' },
    { id: 3, message: 'Réunion dans 30 min', read: true, time: '2 heures' }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState({
    id: 'USR001',
    username: 'jdupont',
    nom: 'Dupont',
    prenoms: 'Jean',
    email: 'jean.dupont@email.com',
    avatar: 'JD',
    role: 'Utilisateur',
    badge: 'Argent',
    type_compte: 'Premium',
    premium_expire_at: '2025-12-31',
    is_active: true,
    genre: 'Homme',
    pays: 'Togo',
    ville: 'Lomé',
    telephone: '+228 90 00 00 00',
    biographie: 'Développeur full-stack passionné par les nouvelles technologies'
  });

  const menuItems = [
    { path: '/utilisateur/dashboard', name: 'Tableau de bord', icon: '📊', permission: 'user' },
    { path: '/utilisateur/projets', name: 'Mes projets', icon: '📁', permission: 'user' },
    { path: '/utilisateur/taches', name: 'Mes tâches', icon: '✅', permission: 'user' },
    { path: '/utilisateur/temps', name: 'Temps de travail', icon: '⏰', permission: 'user' },
    { path: '/utilisateur/calendrier', name: 'Calendrier', icon: '📅', permission: 'user' },
    { path: '/utilisateur/documents', name: 'Mes documents', icon: '📎', permission: 'user' },
    { path: '/utilisateur/rapports', name: 'Mes rapports', icon: '📈', permission: 'user' },
    { path: '/utilisateur/workspaces', name: 'Workspaces', icon: '🏗️', permission: 'user' },
    { path: '/utilisateur/profile', name: 'Mon profil', icon: '👤', permission: 'user' },
    { path: '/utilisateur/parametres', name: 'Paramètres', icon: '⚙️', permission: 'user' },
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
    localStorage.removeItem('user');
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

  return (
    <div className="utilisateur-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="user-info-compact">
            <div className="user-avatar-wrapper">
              <div className="user-avatar">{user.avatar}</div>
              {user.type_compte === 'Premium' && <div className="premium-dot">⭐</div>}
            </div>
            {isSidebarOpen && (
              <div className="user-details">
                <strong>{user.prenoms} {user.nom}</strong>
                <span className="user-badge">{user.badge}</span>
                <span className="user-type">{user.type_compte}</span>
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

        <nav className="nav-menu">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {isSidebarOpen && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="progress-section">
            <div className="progress-label">
              <span>Espace utilisé</span>
              <span>2.4 GB / 10 GB</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '24%' }}></div>
            </div>
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

          <div className="header-search">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Rechercher un projet, une tâche..." />
            <span className="search-shortcut">⌘K</span>
          </div>

          <div className="header-actions">
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
                        Tout marquer comme lu
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
                    <Link to="/utilisateur/notifications">Voir toutes les notifications</Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="user-dropdown">
              <div 
                className="user-profile"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="user-avatar small">{user.avatar}</div>
                {isSidebarOpen && (
                  <div>
                    <div><strong>{user.prenoms}</strong></div>
                    <div className="user-role">{user.role}</div>
                  </div>
                )}
              </div>
              {showUserMenu && (
                <div className="dropdown-menu user-menu">
                  <div className="user-info-header">
                    <div className="user-avatar large">{user.avatar}</div>
                    <div>
                      <div className="user-name">{user.prenoms} {user.nom}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="menu-divider"></div>
                  <Link to="/utilisateur/profile" className="menu-item">
                    <span>👤</span> Mon profil
                  </Link>
                  <Link to="/utilisateur/parametres" className="menu-item">
                    <span>⚙️</span> Paramètres
                  </Link>
                  <Link to="/utilisateur/abonnement" className="menu-item">
                    <span>💳</span> Abonnement
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

export default UtilisateurLayout;