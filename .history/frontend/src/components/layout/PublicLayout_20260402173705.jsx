import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../../styles/PublicLayout.css';

// Composant Hero
export const Hero = ({ title, subtitle, ctaText, ctaLink, backgroundImage }) => {
  return (
    <div className="hero-section" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <h1 className="hero-title">{title}</h1>
        <p className="hero-subtitle">{subtitle}</p>
        <Link to={ctaLink} className="hero-cta">
          {ctaText} →
        </Link>
      </div>
    </div>
  );
};

// Composant Feature Card
export const FeatureCard = ({ icon, title, description, color }) => {
  return (
    <div className="feature-card">
      <div className="feature-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
};

// Composant Pricing Card
export const PricingCard = ({ name, price, period, features, isPopular, buttonText, onSelect }) => {
  return (
    <div className={`pricing-card ${isPopular ? 'popular' : ''}`}>
      {isPopular && <div className="popular-badge">⭐ Populaire</div>}
      <div className="pricing-header">
        <h3 className="plan-name">{name}</h3>
        <div className="plan-price">
          <span className="currency">XOF</span>
          <span className="amount">{price}</span>
          <span className="period">/{period}</span>
        </div>
      </div>
      <ul className="plan-features">
        {features.map((feature, index) => (
          <li key={index}>
            <span className="feature-check">✓</span>
            {feature}
          </li>
        ))}
      </ul>
      <button className={`plan-button ${isPopular ? 'primary' : 'secondary'}`} onClick={onSelect}>
        {buttonText}
      </button>
    </div>
  );
};

// Composant Testimonial Card
export const TestimonialCard = ({ avatar, name, role, content, rating }) => {
  return (
    <div className="testimonial-card">
      <div className="testimonial-rating">
        {'⭐'.repeat(rating)}
      </div>
      <p className="testimonial-content">"{content}"</p>
      <div className="testimonial-author">
        <div className="author-avatar">{avatar}</div>
        <div>
          <div className="author-name">{name}</div>
          <div className="author-role">{role}</div>
        </div>
      </div>
    </div>
  );
};

// Composant Newsletter
export const Newsletter = ({ onSubscribe }) => {
  const [email, setEmail] = React.useState('');
  const [subscribed, setSubscribed] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      onSubscribe(email);
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 3000);
      setEmail('');
    }
  };

  return (
    <div className="newsletter-section">
      <div className="newsletter-content">
        <h2>Restez informé</h2>
        <p>Recevez nos actualités et offres spéciales</p>
        <form onSubmit={handleSubmit} className="newsletter-form">
          <input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">S'abonner</button>
        </form>
        {subscribed && <div className="subscribe-success">✅ Merci pour votre inscription !</div>}
      </div>
    </div>
  );
};

// Composant Stats Counter
export const StatsCounter = ({ stats }) => {
  const [counts, setCounts] = React.useState(stats.map(() => 0));

  React.useEffect(() => {
    const duration = 2000;
    const step = 20;
    const increment = stats.map(stat => stat.value / (duration / step));
    
    let current = stats.map(() => 0);
    const timer = setInterval(() => {
      let allComplete = true;
      const newCounts = stats.map((stat, index) => {
        if (current[index] < stat.value) {
          allComplete = false;
          current[index] = Math.min(current[index] + increment[index], stat.value);
          return Math.floor(current[index]);
        }
        return stat.value;
      });
      setCounts(newCounts);
      if (allComplete) clearInterval(timer);
    }, step);
  }, [stats]);

  return (
    <div className="stats-container">
      {stats.map((stat, index) => (
        <div key={index} className="stat-item">
          <div className="stat-value">{counts[index]}{stat.suffix}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

// Composant Contact Form
export const ContactForm = ({ onSubmit }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = React.useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="contact-section">
      <div className="contact-info">
        <h3>Contactez-nous</h3>
        <div className="info-item">📧 contact@k-planer.com</div>
        <div className="info-item">📞 +228 90 00 00 00</div>
        <div className="info-item">📍 Lomé, Togo</div>
      </div>
      <form onSubmit={handleSubmit} className="contact-form">
        <input
          type="text"
          name="name"
          placeholder="Votre nom"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Votre email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="subject"
          placeholder="Sujet"
          value={formData.subject}
          onChange={handleChange}
          required
        />
        <textarea
          name="message"
          placeholder="Votre message"
          rows="5"
          value={formData.message}
          onChange={handleChange}
          required
        ></textarea>
        <button type="submit">Envoyer le message</button>
        {submitted && <div className="submit-success">✅ Message envoyé avec succès !</div>}
      </form>
    </div>
  );
};