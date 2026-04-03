import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/PublicLayout.css';

const PublicLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentLang, setCurrentLang] = useState('fr');

  const navigation = [
    { path: '/', name: 'Accueil', icon: '🏠', fr: 'Accueil', en: 'Home' },
    { path: '/features', name: 'Fonctionnalités', icon: '⭐', fr: 'Fonctionnalités', en: 'Features' },
    { path: '/pricing', name: 'Tarifs', icon: '💰', fr: 'Tarifs', en: 'Pricing' },
    { path: '/contact', name: 'Contact', icon: '📧', fr: 'Contact', en: 'Contact' },
  ];

  const authLinks = [
    { path: '/login', name: 'Connexion', icon: '🔑', fr: 'Connexion', en: 'Login' },
    { path: '/register', name: 'Inscription', icon: '📝', fr: 'Inscription', en: 'Register' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getText = (frText, enText) => {
    return currentLang === 'fr' ? frText : enText;
  };

  return (
    <div className="public-layout">
      {/* Navbar */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <div className="logo-icon">📊</div>
            <div className="logo-text">
              <span className="logo-main">K-PLANER</span>
              <span className="logo-sub">Gestion de projets</span>
            </div>
          </Link>

          <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{getText(item.fr, item.en)}</span>
              </Link>
            ))}
            
            <div className="nav-divider"></div>
            
            {authLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link auth-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{getText(item.fr, item.en)}</span>
              </Link>
            ))}
          </div>

          <div className="nav-actions">
            <button 
              className="lang-toggle"
              onClick={() => setCurrentLang(currentLang === 'fr' ? 'en' : 'fr')}
            >
              {currentLang === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
            </button>
            <button 
              className="menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              ☰
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-section">
              <h3>K-PLANER</h3>
              <p>{getText('Solution complète de gestion de projets et de temps de travail', 'Complete project and time management solution')}</p>
              <div className="social-links">
                <a href="#" target="_blank" rel="noopener noreferrer">📘</a>
                <a href="#" target="_blank" rel="noopener noreferrer">🐦</a>
                <a href="#" target="_blank" rel="noopener noreferrer">💼</a>
              </div>
            </div>

            <div className="footer-section">
              <h4>{getText('Liens rapides', 'Quick links')}</h4>
              <Link to="/features">{getText('Fonctionnalités', 'Features')}</Link>
              <Link to="/pricing">{getText('Tarifs', 'Pricing')}</Link>
              <Link to="/contact">{getText('Contact', 'Contact')}</Link>
              <Link to="/blog">{getText('Blog', 'Blog')}</Link>
            </div>

            <div className="footer-section">
              <h4>{getText('Support', 'Support')}</h4>
              <Link to="/faq">FAQ</Link>
              <Link to="/help">{getText('Aide', 'Help')}</Link>
              <Link to="/tutorials">{getText('Tutoriels', 'Tutorials')}</Link>
              <Link to="/api">API</Link>
            </div>

            <div className="footer-section">
              <h4>{getText('Légal', 'Legal')}</h4>
              <Link to="/privacy">{getText('Confidentialité', 'Privacy')}</Link>
              <Link to="/terms">{getText('Conditions', 'Terms')}</Link>
              <Link to="/cookies">{getText('Cookies', 'Cookies')}</Link>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2024 K-PLANER. {getText('Tous droits réservés.', 'All rights reserved.')}</p>
            <div className="payment-methods">
              <span>💳 Visa</span>
              <span>💳 Mastercard</span>
              <span>💰 Mobile Money</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Consent */}
      <div className="cookie-consent" id="cookieConsent">
        <p>{getText('Nous utilisons des cookies pour améliorer votre expérience.', 'We use cookies to improve your experience.')}</p>
        <button className="btn-cookie" onClick={() => {
          document.getElementById('cookieConsent').style.display = 'none';
          localStorage.setItem('cookieConsent', 'accepted');
        }}>
          {getText('Accepter', 'Accept')}
        </button>
      </div>
    </div>
  );
};

export default PublicLayout;