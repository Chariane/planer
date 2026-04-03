import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/EntrepriseLayout.css';

const EntrepriseLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Données de l'entreprise premium
  const [entreprise, setEntreprise] = useState({
    id: 'ENT001',
    nom: 'Tech Solutions SARL',
    description: 'Solutions innovantes pour entreprises',
    telephone: '+228 90 00 00 00',
    adresse: 'Lomé, Togo',
    numero_ifu: '1234567890123',
    numero_rccm: 'TG-LOM-2024-001',
    logo: 'TS',
    is_premium: true,
    premium_activated_at: '2024-01-01',
    premium_expire_at: '2025-12-31',
    statut_compte: 'Actif',
    site_web: 'www.techsolutions.com',
    responsable: {
      nom: 'Dupont',
      prenoms: 'Jean',
      email: 'jean.dupont@techsolutions.com',
      telephone: '+228 90 00 00 01'
    }
  });

  // Statistiques premium
  const [stats, setStats] = useState({
    membresActifs: 24,
    projetsEnCours: 12,
    tachesTerminees: 156,
    heuresTravaillees: 1248,
    espacesUtilises: 8,
    stockageUtilise: 45,
    stockageMax: 100,
    apiCallsMois: 12450,
    integrationsActives: 3
  });

  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Nouveau membre a rejoint l\'équipe', read: false, time: '5 min', type: 'team' },
    { id: 2, message: 'Projet "Application Mobile" à 80%', read: false, time: '1 heure', type: 'project' },
    { id: 3, message: 'Rapport hebdomadaire disponible', read: true, time: '2 heures', type: 'report' },
    { id: 4, message: 'Mise à jour des fonctionnalités premium', read: true, time: '1 jour', type: 'update' }
  ]);

  // Menu avec fonctionnalités premium
  const menuItems = [
    { path: '/entreprise/dashboard', name: 'Dashboard Premium', icon: '📊', premium: true, description: 'Vue d\'ensemble avancée' },
    { path: '/entreprise/equipe', name: 'Gestion équipe', icon: '👥', premium: true, description: 'Gérer les membres' },
    { path: '/entreprise/projets', name: 'Projets', icon: '📁', premium: true, description: 'Tous les projets' },
    { path: '/entreprise/taches', name: 'Tâches', icon: '✅', premium: true, description: 'Suivi des tâches' },
    { path: '/entreprise/temps', name: 'Temps de travail', icon: '⏰', premium: true, description: 'Suivi du temps' },
    { path: '/entreprise/analytics', name: 'Analytics', icon: '📈', premium: true, description: 'Analyses avancées' },
    { path: '/entreprise/rapports', name: 'Rapports', icon: '📄', premium: true, description: 'Rapports personnalisés' },
    { path: '/entreprise/workspaces', name: 'Workspaces', icon: '🏗️', premium: true, description: 'Espaces de travail' },
    { path: '/entreprise/integrations', name: 'Intégrations', icon: '🔌', premium: true, description: 'API & Webhooks' },
    { path: '/entreprise/automation', name: 'Automation', icon: '🤖', premium: true, description: 'Workflows automatiques' },
    { path: '/entreprise/export', name: 'Export données', icon: '📤', premium: true, description: 'Export massif' },
    { path: '/entreprise/abonnement', name: 'Abonnement', icon: '💳', premium: false, description: 'Gérer abonnement' }
  ];

  // Vérifier si le premium est actif
  const isPremiumActive = () => {
    const expiryDate = new Date(entreprise.premium_expire_at);
    const today = new Date();
    return entreprise.is_premium && expiryDate > today;
  };

  const getDaysRemaining = () => {
    const expiryDate = new Date(entreprise.premium_expire_at);
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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
    localStorage.removeItem('entreprise');
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  const premiumActive = isPremiumActive();
  const daysRemaining = getDaysRemaining();

  return (
    <div className="entreprise-layout">
      {/* Premium Banner */}
      {premiumActive && (
        <div className="premium-banner">
          <div className="premium-banner-content">
            <span className="premium-icon">⭐</span>
            <div className="premium-text">
              <strong>Compte Premium Actif</strong>
              <span>Expire le {new Date(entreprise.premium_expire_at).toLocaleDateString('fr-FR')} ({daysRemaining} jours restants)</span>
            </div>
            <Link to="/entreprise/abonnement" className="premium-renew">Renouveler →</Link>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="entreprise-logo-section">
            <div className="entreprise-logo">
              <div className="logo-icon">{entreprise.logo}</div>
              {isSidebarOpen && (
                <div className="logo-info">
                  <div className="entreprise-name">{entreprise.nom}</div>
                  <div className="premium-status">
                    <span className="premium-dot">⭐</span>
                    <span>Premium</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button 
            className="sidebar-toggle" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Premium Features Highlight */}
        <div className="premium-features-highlight">
          <div className="feature-highlight-item">
            <span className="feature-icon">🚀</span>
            {isSidebarOpen && (
              <div className="feature-info">
                <span className="feature-value">+35%</span>
                <span className="feature-label">Productivité</span>
              </div>
            )}
          </div>
          <div className="feature-highlight-item">
            <span className="feature-icon">📊</span>
            {isSidebarOpen && (
              <div className="feature-info">
                <span className="feature-value">24/7</span>
                <span className="feature-label">Support prioritaire</span>
              </div>
            )}
          </div>
        </div>

        <nav className="nav-menu">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''} ${item.premium && !premiumActive ? 'locked' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {isSidebarOpen && (
                <div className="nav-text">
                  <span>{item.name}</span>
                  <span className="nav-description">{item.description}</span>
                </div>
              )}
              {item.premium && !premiumActive && isSidebarOpen && (
                <span className="premium-lock">🔒</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="storage-info">
            <div className="storage-header">
              <span>📦 Stockage</span>
              <span>{stats.stockageUtilise} GB / {stats.stockageMax} GB</span>
            </div>
            <div className="storage-bar">
              <div className="storage-fill" style={{ width: `${(stats.stockageUtilise / stats.stockageMax) * 100}%` }}></div>
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

          <div className="header-title">
            <h1>{menuItems.find(item => item.path === location.pathname)?.name || 'Dashboard Premium'}</h1>
            <p>{menuItems.find(item => item.path === location.pathname)?.description || 'Espace entreprise'}</p>
          </div>

          <div className="header-actions">
            {/* Quick Actions Premium */}
            <div className="quick-actions">
              <button className="quick-action-btn" title="Export rapide">
                📤
              </button>
              <button className="quick-action-btn" title="Générer rapport">
                📊
              </button>
              <button className="quick-action-btn" title="API Documentation">
                🔌
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
                      <button onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))} 
                        className="mark-all-read">
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
                            {notif.type === 'team' && '👥'}
                            {notif.type === 'project' && '📁'}
                            {notif.type === 'report' && '📄'}
                            {notif.type === 'update' && '🔄'}
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
                    <Link to="/entreprise/notifications">Voir toutes les notifications</Link>
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
                <div className="user-avatar">{entreprise.logo}</div>
                {isSidebarOpen && (
                  <div className="user-info">
                    <div className="user-name">{entreprise.responsable.prenoms} {entreprise.responsable.nom}</div>
                    <div className="user-role">Responsable</div>
                  </div>
                )}
              </div>
              {showUserMenu && (
                <div className="dropdown-menu user-menu">
                  <div className="user-info-header">
                    <div className="user-avatar large">{entreprise.logo}</div>
                    <div>
                      <div className="user-name">{entreprise.nom}</div>
                      <div className="user-email">{entreprise.responsable.email}</div>
                      <div className="premium-badge-small">⭐ Premium</div>
                    </div>
                  </div>
                  <div className="menu-divider"></div>
                  <Link to="/entreprise/profile" className="menu-item">
                    <span>🏢</span> Profil entreprise
                  </Link>
                  <Link to="/entreprise/equipe" className="menu-item">
                    <span>👥</span> Gestion équipe
                  </Link>
                  <Link to="/entreprise/parametres" className="menu-item">
                    <span>⚙️</span> Paramètres
                  </Link>
                  <Link to="/entreprise/integrations" className="menu-item">
                    <span>🔌</span> Intégrations API
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

export default EntrepriseLayout;