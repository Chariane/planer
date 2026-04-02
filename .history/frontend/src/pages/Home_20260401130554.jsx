import React, { useState, useEffect } from 'react';
import { 
  Menu, X, Calendar, CheckSquare, Users, 
  MessageSquare, TrendingUp, Shield, Zap, Globe, Clock,
  Mail, Phone, MapPin, ArrowRight, Play, Star, Briefcase, Target,
  Layers, PieChart, Award
} from 'lucide-react';

const Home = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  const phrases = [
    'Gérez vos projets efficacement',
    'Planifiez vos tâches en équipe',
    'Suivez vos objectifs en temps réel'
  ];

  useEffect(() => {
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
      <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <HeroSection typedText={typedText} />
      <ServicesSection />
      <FeaturesSection />
      <StatsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

// Header Component
const Header = ({ isMenuOpen, setIsMenuOpen }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Accueil', href: '#home' },
    { name: 'Services', href: '#services' },
    { name: 'Fonctionnalités', href: '#features' },
    { name: 'Plateformes', href: '#how-it-works' },
    { name: 'Contact', href: '#contact' }
  ];

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <nav className="container">
        <div className="logo">
          <Briefcase size={28} className="logo-icon" />
          <span>K-PLANER</span>
          <span className="logo-badge">by Kapital HC</span>
        </div>
        
        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          {navItems.map((item, index) => (
            <a key={index} href={item.href} className="nav-link">
              {item.name}
            </a>
          ))}
          <div className="nav-buttons">
            <button className="btn-login">Se connecter</button>
            <button className="btn-signup">Essai gratuit</button>
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
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <Zap size={14} />
              <span>Plateforme de gestion RH & Projets</span>
            </div>
            <h1 className="hero-title">
              La solution complète pour
              <span className="typed-text">{typedText}</span>
              <span className="cursor">|</span>
            </h1>
            <p className="hero-description">
              K-PLANER centralise la gestion des tâches, le suivi du temps de travail 
              et la collaboration en temps réel pour une efficacité maximale de vos équipes.
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
                <span>Tableau de bord K-PLANER</span>
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

// Services Section (inspirée de la page Kapital HC)
const ServicesSection = () => {
  const services = [
    { icon: <Briefcase size={32} />, title: "Gestion de projets", description: "Pilotez vos projets de A à Z avec une vision claire des objectifs et des délais." },
    { icon: <Users size={32} />, title: "Gestion RH centralisée", description: "Suivez les congés, absences et performances de vos collaborateurs." },
    { icon: <MessageSquare size={32} />, title: "Collaboration temps réel", description: "Échangez instantanément avec vos équipes et partenaires." }
  ];

  return (
    <section className="services-section" id="services">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Nos services</span>
          <h2 className="section-title">Des solutions adaptées à vos besoins</h2>
          <p className="section-description">
            Kapital HC vous accompagne avec des outils innovants pour optimiser votre gestion
          </p>
        </div>
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icon">{service.icon}</div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-description">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Features Section
const FeaturesSection = () => {
  const features = [
    { icon: <Layers size={28} />, title: "Workspaces & Espaces", description: "Organisez vos équipes par workspace et sous-espaces.", color: "green" },
    { icon: <CheckSquare size={28} />, title: "Listes & Tâches", description: "Créez des listes et gérez les tâches avec statut et priorité.", color: "green" },
    { icon: <MessageSquare size={28} />, title: "Communication temps réel", description: "Intégration avec K-Chat pour discuter instantanément.", color: "green" },
    { icon: <Calendar size={28} />, title: "Gestion des congés", description: "Suivez les absences et congés de vos collaborateurs.", color: "green" },
    { icon: <TrendingUp size={28} />, title: "Rapports de travail", description: "Générez des rapports détaillés sur la productivité.", color: "green" },
    { icon: <Shield size={28} />, title: "Sécurité des données", description: "Données sécurisées et conformes aux normes RGPD.", color: "green" }
  ];

  return (
    <section className="features-section" id="features">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Fonctionnalités</span>
          <h2 className="section-title">Tout ce dont vous avez besoin</h2>
          <p className="section-description">Une plateforme complète qui s'adapte à votre façon de travailler</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
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
          <span className="section-tag">Nos plateformes</span>
          <h2 className="section-title">Commencez en quelques minutes</h2>
          <p className="section-description">Une mise en route simple et rapide pour toute votre équipe</p>
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
          <h2 className="section-title">Ils nous font confiance</h2>
          <p className="section-description">Des entreprises de toutes tailles utilisent K-PLANER au quotidien</p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-rating">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={16} fill="#1ABC9C" color="#1ABC9C" />
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
          <h2 className="cta-title">Prêt à optimiser la gestion de vos projets ?</h2>
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

// Footer Component - identique au site Kapital HC
const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  const footerLinks = {
    'Solutions': ['Gestion de projets', 'Gestion RH', 'Suivi des tâches', 'Rapports'],
    'Ressources': ['Blog', 'Documentation', 'Support', 'API'],
    'Légal': ['Confidentialité', 'Conditions d\'utilisation', 'Cookies', 'Mentions légales']
  };

  const FacebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );

  const TwitterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
    </svg>
  );

  const LinkedinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  );

  const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      <path d="M15.5 12.5c-.3-.2-1.1-.6-1.3-.7-.2-.1-.4-.1-.6.1-.2.2-.6.7-.7.9-.1.1-.2.2-.4.1-.2-.1-.9-.3-1.7-1-.6-.5-1.1-1.2-1.2-1.4-.1-.2 0-.3.1-.4.1-.1.2-.3.3-.4.1-.1.1-.2.1-.3 0-.1-.2-.5-.3-.7-.1-.2-.2-.3-.4-.3h-.5c-.1 0-.3.1-.5.2-.2.2-.6.6-.6 1.5 0 .9.7 1.8.8 1.9.1.1 1.3 2.1 3.2 2.9.5.2.8.3 1.1.4.5.1.9.1 1.2.1.5 0 1-.1 1.4-.4.2-.1.4-.3.5-.5.1-.2.2-.4.2-.6 0-.1 0-.2-.1-.2z"/>
    </svg>
  );

  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <Briefcase size={32} />
              <span>K-PLANER</span>
              <span className="footer-badge">by Kapital HC</span>
            </div>
            <p className="footer-description">
              La plateforme complète de gestion de projets et de suivi du temps de travail, conçue par Kapital Humain et Conseils.
            </p>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="Facebook">
                <FacebookIcon />
              </a>
              <a href="#" className="social-link" aria-label="Twitter">
                <TwitterIcon />
              </a>
              <a href="#" className="social-link" aria-label="LinkedIn">
                <LinkedinIcon />
              </a>
              <a href="#" className="social-link" aria-label="WhatsApp">
                <WhatsAppIcon />
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
            <h4>Contactez-nous</h4>
            <ul>
              <li><MapPin size={16} /> <span>Sièges Etoile Rouge, Immeuble SONIMEX<br />Cotonou - BENIN</span></li>
              <li><MapPin size={16} /> <span>Tokoin Doumassèssè - IMMEUBLE SAM<br />Rue des balises, Bd de la kara - TOGO</span></li>
              <li><Phone size={16} /> <span>(+229) 99915050</span></li>
              <li><Phone size={16} /> <span>(+228) 92040436</span></li>
              <li><Mail size={16} /> <span>contact@k-planer.com</span></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} Kapital Humain et Conseils. Tous droits réservés.</p>
          <div className="footer-bottom-links">
            <a href="#">Confidentialité</a>
            <a href="#">Conditions d'utilisation</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Home;