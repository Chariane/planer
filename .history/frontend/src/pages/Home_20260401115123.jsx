import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Clock, 
  CheckSquare, 
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  Globe
} from 'lucide-react';

const Home = () => {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <HeroSection />
      
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
    </div>
  );
};

// Hero Section
const HeroSection = () => {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <span className="hero-badge">
              🚀 La nouvelle génération de gestion de projets
            </span>
            <h1 className="hero-title">
              Gérez vos projets RH et
              <span className="gradient-text"> simplifiez la collaboration</span>
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
                Voir la démo
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">5000+</span>
                <span className="stat-label">Entreprises clientes</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">100k+</span>
                <span className="stat-label">Utilisateurs actifs</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">98%</span>
                <span className="stat-label">Satisfaction client</span>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span><span></span><span></span>
                </div>
                <span>K-PLANER Dashboard</span>
              </div>
              <div className="preview-content">
                <div className="preview-task">
                  <CheckSquare size={16} />
                  <span>Validation du rapport mensuel</span>
                </div>
                <div className="preview-task">
                  <Users size={16} />
                  <span>Réunion équipe RH</span>
                </div>
                <div className="preview-task">
                  <Calendar size={16} />
                  <span>Planning des congés</span>
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
    {
      icon: <LayoutDashboard size={28} />,
      title: "Workspaces & Espaces",
      description: "Organisez vos équipes par workspace et sous-espaces pour une structure claire et hiérarchisée.",
      color: "blue"
    },
    {
      icon: <CheckSquare size={28} />,
      title: "Listes & Tâches",
      description: "Créez des listes de projets et gérez les tâches avec statut, priorité et date d'échéance.",
      color: "green"
    },
    {
      icon: <MessageSquare size={28} />,
      title: "Communication temps réel",
      description: "Intégration avec K-Chat pour discuter instantanément avec votre équipe.",
      color: "purple"
    },
    {
      icon: <Calendar size={28} />,
      title: "Gestion des congés",
      description: "Suivez les absences et congés de vos collaborateurs en un clin d'œil.",
      color: "orange"
    },
    {
      icon: <TrendingUp size={28} />,
      title: "Rapports de travail",
      description: "Générez des rapports détaillés sur la productivité de vos équipes.",
      color: "red"
    },
    {
      icon: <Shield size={28} />,
      title: "Sécurité des données",
      description: "Données sécurisées et conformes aux normes RGPD.",
      color: "indigo"
    }
  ];

  return (
    <section className="features-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Fonctionnalités</span>
          <h2 className="section-title">
            Tout ce dont vous avez besoin pour gérer vos projets
          </h2>
          <p className="section-description">
            Une plateforme complète qui s'adapte à votre façon de travailler
          </p>
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
    { value: "+40%", label: "Productivité", icon: <Zap size={24} /> },
    { value: "-35%", label: "Temps de gestion", icon: <Clock size={24} /> },
    { value: "+50%", label: "Collaboration", icon: <Users size={24} /> },
    { value: "24/7", label: "Disponibilité", icon: <Globe size={24} /> }
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
    {
      step: "1",
      title: "Créez votre workspace",
      description: "Inscrivez-vous et créez votre espace de travail personnalisé",
      image: "🏢"
    },
    {
      step: "2",
      title: "Invitez vos collaborateurs",
      description: "Ajoutez vos équipes et définissez leurs rôles",
      image: "👥"
    },
    {
      step: "3",
      title: "Organisez vos projets",
      description: "Créez des listes, des tâches et suivez l'avancement",
      image: "📋"
    },
    {
      step: "4",
      title: "Collaborez en temps réel",
      description: "Communiquez et partagez des fichiers instantanément",
      image: "💬"
    }
  ];

  return (
    <section className="howitworks-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Comment ça marche</span>
          <h2 className="section-title">
            Commencez en quelques minutes
          </h2>
        </div>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-number">{step.step}</div>
              <div className="step-emoji">{step.image}</div>
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
    {
      quote: "K-PLANER a transformé la gestion de nos projets RH. Plus de 40% de gain de productivité !",
      author: "Marie Diop",
      role: "DRH, Groupe Sénégal",
      avatar: "MD"
    },
    {
      quote: "L'intégration avec K-Chat est parfaite. Toute l'équipe communique et avance plus vite.",
      author: "Amadou Ndiaye",
      role: "Chef de projet",
      avatar: "AN"
    },
    {
      quote: "Simple, intuitif et puissant. Le suivi des congés et des tâches n'a jamais été aussi facile.",
      author: "Fatou Sow",
      role: "Responsable RH",
      avatar: "FS"
    }
  ];

  return (
    <section className="testimonials-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Témoignages</span>
          <h2 className="section-title">
            Ce que nos utilisateurs disent
          </h2>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-quote">"</div>
              <p className="testimonial-text">{testimonial.quote}</p>
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
          <h2 className="cta-title">
            Prêt à simplifier la gestion de vos projets ?
          </h2>
          <p className="cta-description">
            Rejoignez plus de 5000 entreprises qui utilisent K-PLANER au quotidien
          </p>
          <button className="btn-cta">
            Commencer maintenant
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Home;