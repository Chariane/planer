import React, { useEffect, useRef } from 'react';
import { 
  Menu, X, ChevronRight, Calendar, CheckSquare, Users, 
  MessageSquare, TrendingUp, Shield, Zap, Globe, Clock,
  Facebook, Twitter, Linkedin, Github, Mail, Phone, MapPin,
  ArrowRight, Play, Star, Award, Briefcase, Target, Eye
} from 'lucide-react';

const Home = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [typedText, setTypedText] = React.useState('');
  const [textIndex, setTextIndex] = React.useState(0);
  const [charIndex, setCharIndex] = React.useState(0);

  const phrases = [
    'Gérez vos projets efficacement',
    'Planifiez vos tâches en équipe',
    'Suivez vos objectifs en temps réel'
  ];

  // Animation d'écriture
  React.useEffect(() => {
    if (charIndex < phrases[textIndex].length) {
      const timeout = setTimeout(() => {
        setTypedText(prev => prev + phrases[textIndex][charIndex]);
        setCharIndex(charIndex + 1);
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setTypedText('');
        setCharIndex(0);
        setTextIndex((textIndex + 1) % phrases.length);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [charIndex, textIndex]);

  return (
    <div className="home-page">
      {/* Header */}
      <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      
      {/* Hero Section avec animation */}
      <HeroSection typedText={typedText} />
      
      {/* Features Section */}
      <FeaturesSection />
      
      {/* Stats Section */}
      <StatsSection />
      
      {/* How It Works */}
      <HowItWorksSection />
      
      {/* Testimonials */}
      <TestimonialsSection />
      
      {/* CTA Section */}
      <CTASection />
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

// Header Component
const Header = ({ isMenuOpen, setIsMenuOpen }) => {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Accueil', href: '#home' },
    { name: 'Fonctionnalités', href: '#features' },
    { name: 'Comment ça marche', href: '#how-it-works' },
    { name: 'Tarifs', href: '#pricing' },
    { name: 'Contact', href: '#contact' }
  ];

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <nav className="container">
        <div className="logo">
          <Briefcase size={28} className="logo-icon" />
          <span>K-PLANER</span>
          <span className="logo-badge">RH</span>
        </div>
        
        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          {navItems.map((item, index) => (
            <a key={index} href={item.href} className="nav-link">
              {item.name}
            </a>
          ))}
          <div className="nav-buttons">
            <button className="btn-login">Se connecter</button>
            <button className="btn-signup">Essayer gratuitement</button>
          </div>
        </div>
        
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>
    </header>
  );
};

// Hero Section
const HeroSection = ({ typedText }) => {
  return (
    <section className="hero-section" id="home">
      <div className="hero-overlay"></div>
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <Zap size={14} />
              <span>Plateforme de gestion RH n°1</span>
            </div>
            <h1 className="hero-title">
              La solution complète pour
              <span className="typed-text">{typedText}</span>
              <span className="cursor">|</span>
            </h1>
            <p className="hero-description">
              K-PLANER centralise la gestion des tâches, le suivi du temps de travail 
              et la collaboration en temps réel pour une efficacité maximale.
            </p>
            <div className="hero-buttons">
              <button className="btn-primary">
                Commencer gratuitement
                <ArrowRight size={18} />
              </button>
              <button className="btn-outline">
                <Play size={18} />
                Voir la démo
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">5000+</div>
                <div className="stat-label">Entreprises clientes</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">100k+</div>
                <div className="stat-label">Utilisateurs actifs</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">98%</div>
                <div className="stat-label">Satisfaction client</div>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span><span></span><span></span>
                </div>
                <span>Tableau de bord</span>
              </div>
              <div className="preview-content">
                <div className="preview-task">
                  <div className="task-checkbox"></div>
                  <span>Validation du rapport mensuel</span>
                  <span className="task-priority high">Urgent</span>
                </div>
                <div className="preview-task">
                  <div className="task-checkbox"></div>
                  <span>Réunion équipe RH</span>
                  <span className="task-priority medium">Aujourd'hui</span>
                </div>
                <div className="preview-task">
                  <div className="task-checkbox"></div>
                  <span>Planning des congés - Juillet</span>
                  <span className="task-priority low">Cette semaine</span>
                </div>
                <div className="preview-progress">
                  <div className="progress-label">
                    <span>Progression mensuelle</span>
                    <span>75%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '75%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Features Section
const FeaturesSection = () => {
  const features = [
    { icon: <Briefcase size={28} />, title: "Workspaces & Espaces", description: "Organisez vos équipes par workspace et sous-espaces pour une structure claire et hiérarchisée.", color: "blue" },
    { icon: <CheckSquare size={28} />, title: "Listes & Tâches", description: "Créez des listes de projets et gérez les tâches avec statut, priorité et date d'échéance.", color: "green" },
    { icon: <MessageSquare size={28} />, title: "Communication temps réel", description: "Intégration avec K-Chat pour discuter instantanément avec votre équipe.", color: "purple" },
    { icon: <Calendar size={28} />, title: "Gestion des congés", description: "Suivez les absences et congés de vos collaborateurs en un clin d'œil.", color: "orange" },
    { icon: <TrendingUp size={28} />, title: "Rapports de travail", description: "Générez des rapports détaillés sur la productivité de vos équipes.", color: "red" },
    { icon: <Shield size={28} />, title: "Sécurité des données", description: "Données sécurisées et conformes aux normes RGPD.", color: "indigo" }
  ];

  return (
    <section className="features-section" id="features">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Fonctionnalités</span>
          <h2 className="section-title">Tout ce dont vous avez besoin pour gérer vos projets</h2>
          <p className="section-description">Une plateforme complète qui s'adapte à votre façon de travailler</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className={`feature-card feature-${feature.color}`}>
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Stats Section
const StatsSection = () => {
  const stats = [
    { value: "+40%", label: "Productivité", icon: <Zap size={32} /> },
    { value: "-35%", label: "Temps de gestion", icon: <Clock size={32} /> },
    { value: "+50%", label: "Collaboration", icon: <Users size={32} /> },
    { value: "24/7", label: "Disponibilité", icon: <Globe size={32} /> }
  ];

  return (
    <section className="stats-section">
      <div className="container">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// How It Works Section
const HowItWorksSection = () => {
  const steps = [
    { step: "01", title: "Créez votre workspace", description: "Inscrivez-vous et créez votre espace de travail personnalisé", icon: <Briefcase size={32} /> },
    { step: "02", title: "Invitez vos collaborateurs", description: "Ajoutez vos équipes et définissez leurs rôles", icon: <Users size={32} /> },
    { step: "03", title: "Organisez vos projets", description: "Créez des listes, des tâches et suivez l'avancement", icon: <CheckSquare size={32} /> },
    { step: "04", title: "Collaborez en temps réel", description: "Communiquez et partagez des fichiers instantanément", icon: <MessageSquare size={32} /> }
  ];

  return (
    <section className="howitworks-section" id="how-it-works">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Comment ça marche</span>
          <h2 className="section-title">Commencez en quelques minutes</h2>
        </div>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-number">{step.step}</div>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Testimonials Section
const TestimonialsSection = () => {
  const testimonials = [
    { quote: "K-PLANER a transformé la gestion de nos projets RH. Plus de 40% de gain de productivité !", author: "Marie Diop", role: "DRH, Groupe Sénégal", avatar: "MD", rating: 5 },
    { quote: "L'intégration avec K-Chat est parfaite. Toute l'équipe communique et avance plus vite.", author: "Amadou Ndiaye", role: "Chef de projet", avatar: "AN", rating: 5 },
    { quote: "Simple, intuitif et puissant. Le suivi des congés et des tâches n'a jamais été aussi facile.", author: "Fatou Sow", role: "Responsable RH", avatar: "FS", rating: 5 }
  ];

  return (
    <section className="testimonials-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Témoignages</span>
          <h2 className="section-title">Ce que nos utilisateurs disent</h2>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-rating">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={16} fill="#FFD700" color="#FFD700" />
                ))}
              </div>
              <p className="testimonial-text">"{testimonial.quote}"</p>
              <div className="testimonial-author">
                <div className="author-avatar">{testimonial.avatar}</div>
                <div className="author-info">
                  <h4>{testimonial.author}</h4>
                  <p>{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// CTA Section
const CTASection = () => {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-content">
          <div className="cta-icon">
            <Target size={48} />
          </div>
          <h2 className="cta-title">Prêt à simplifier la gestion de vos projets ?</h2>
          <p className="cta-description">Rejoignez plus de 5000 entreprises qui utilisent K-PLANER au quotidien</p>
          <button className="btn-cta">
            Commencer maintenant
            <ArrowRight size={18} />
          </button>
          <p className="cta-note">Essai gratuit de 14 jours, sans carte de crédit</p>
        </div>
      </div>
    </section>
  );
};

// Footer Component
const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  const footerLinks = {
    'Produit': ['Fonctionnalités', 'Tarifs', 'Témoignages', 'FAQ'],
    'Support': ['Centre d\'aide', 'Documentation', 'API', 'Statut'],
    'Légal': ['Confidentialité', 'Conditions d\'utilisation', 'Cookies', 'Mentions légales']
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <Briefcase size={32} />
              <span>K-PLANER</span>
            </div>
            <p className="footer-description">
              La plateforme complète de gestion de projets et de suivi du temps de travail.
            </p>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="#" className="social-link" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="social-link" aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
              <a href="#" className="social-link" aria-label="GitHub">
                <Github size={20} />
              </a>
            </div>
          </div>
          
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="footer-links">
              <h4>{category}</h4>
              <ul>
                {links.map((link, index) => (
                  <li key={index}><a href="#">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
          
          <div className="footer-contact">
            <h4>Contact</h4>
            <ul>
              <li><Mail size={16} /> <span>contact@k-planer.com</span></li>
              <li><Phone size={16} /> <span>+221 33 123 45 67</span></li>
              <li><MapPin size={16} /> <span>Dakar, Sénégal</span></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} K-PLANER. Tous droits réservés.</p>
          <div className="footer-bottom-links">
            <a href="#">Confidentialité</a>
            <a href="#">Conditions</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Home;