import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { 
  FaFacebookF, FaLinkedinIn, FaWhatsapp 
} from 'react-icons/fa';
import { 
  FiArrowRight, FiCheckCircle, FiLayers, 
  FiLayout, FiClock, FiCalendar, 
  FiMessageSquare, FiZap, FiCheck, FiSearch, FiFileText
} from 'react-icons/fi';

import { logoutSucceeded } from '../features/auth/state/authSlice';
import { selectAuthUser, selectIsAuthenticated } from '../features/auth/state/selectors';

// Animations fluides inspirées du besoin de réactivité [cite: 54]
const easing = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 }
  }
};

const itemVariants = (direction = 'up') => ({
  hidden: { 
    opacity: 0, 
    y: direction === 'up' ? 30 : 0,
    x: direction === 'left' ? -30 : direction === 'right' ? 30 : 0
  },
  visible: { 
    opacity: 1, x: 0, y: 0, 
    transition: { duration: 0.7, ease: easing } 
  }
});

export default function HomePage() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectAuthUser);

  const handleLogout = () => {
    localStorage.removeItem('kplaner_token');
    dispatch(logoutSucceeded());
  };

  // Fonctionnalités issues directement du cahier des charges [cite: 26, 36]
  const mainFeatures = [
    { icon: FiLayers, title: 'Workspaces & Espaces', description: 'Structurez votre organisation en environnements et subdivisions logiques.' },
    { icon: FiLayout, title: 'Vues Agiles', description: 'Pilotez vos listes de tâches via Kanban, Gantt ou listes classiques.' },
    { icon: FiCheckCircle, title: 'Canevas de Checklists', description: 'Utilisez des sections de checklists globales ou liées à chaque tâche.' },
    { icon: FiClock, title: 'Temps & Absences', description: 'Gérez les congés, les demandes d\'absence et le suivi du temps.' },
    { icon: FiMessageSquare, title: 'K-Chat Intégré', description: 'Communication instantanée en temps réel pour chaque équipe.' },
    { icon: FiFileText, title: 'Rapports de Travail', description: 'Centralisez les réalisations et solutions de chaque membre.' },
  ];

  return (
    <motion.div initial="hidden" animate="visible" className="kpl-modern-ui">
      
      {/* NAVBAR RÉACTIVE [cite: 52] */}
      <motion.header 
        className="kpl-header"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="kpl-container nav-flex">
          <Link to="/" className="kpl-brand">
            <span className="logo-accent">K</span>-PLANER
          </Link>
          
          <nav className="kpl-nav">
            <a href="#features">Fonctionnalités</a>
            <a href="#logic">Structure</a>
            <a href="#integration">Intégrations</a>
          </nav>

          <div className="kpl-auth-actions">
            {isAuthenticated ? (
              <div className="user-logged">
                <span className="user-name">{user?.username || 'Utilisateur'}</span>
                <button onClick={handleLogout} className="btn-logout">Déconnexion</button>
              </div>
            ) : (
              <div className="auth-btns">
                <Link to="/auth/login" className="btn-ghost">Connexion</Link>
                <Link to="/auth/register" className="btn-primary-glow">Démarrer</Link>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* HERO SECTION : Objectif de centralisation [cite: 4, 5] */}
      <section className="kpl-hero">
        <motion.div className="kpl-container hero-grid" variants={containerVariants}>
          <div className="hero-content">
            <motion.div variants={itemVariants('up')} className="kpl-badge">
              Solution de Gestion 360°
            </motion.div>
            <motion.h1 variants={itemVariants('up')}>
              Centralisez vos projets, <br />
              <span className="text-gradient">votre temps et votre équipe.</span>
            </motion.h1>
            <motion.p variants={itemVariants('up')}>
              De la gestion des <strong>Workspaces</strong> au suivi des <strong>congés</strong>, 
              K-Planer réunit tout ce dont votre organisation a besoin dans une interface unique 
              et intuitive. [cite: 5, 6]
            </motion.p>
            <motion.div variants={itemVariants('up')} className="hero-cta">
              <Link to="/auth/register" className="btn-main">
                Créer mon Workspace <FiArrowRight />
              </Link>
              <div className="currency-info">Devise par défaut : <strong>XOF (Franc CFA)</strong> [cite: 11]</div>
            </motion.div>
          </div>

          <motion.div variants={itemVariants('right')} className="hero-preview">
            <div className="mockup-container">
              {/* Image symbolisant le croquis de l'interface [cite: 73] */}
              <img src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1000&q=80" alt="K-Planer Dashboard" />
              <div className="floating-card chat-notif">
                <FiMessageSquare /> Nouveau message sur K-Chat [cite: 22]
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES : Besoins fonctionnels [cite: 26, 36] */}
      <section id="features" className="kpl-features">
        <div className="kpl-container">
          <motion.div 
            className="section-title"
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={itemVariants('up')}
          >
            <h2>Un périmètre complet pour votre entreprise</h2>
            <p>Une architecture pensée pour la performance et la fiabilité[cite: 51].</p>
          </motion.div>

          <div className="features-grid">
            {mainFeatures.map((f, i) => (
              <motion.div 
                key={i} 
                className="f-card"
                variants={itemVariants('up')}
                whileHover={{ y: -8 }}
              >
                <div className="f-icon"><f.icon /></div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STRUCTURE LOGIQUE : Workspaces/Espaces/Listes  */}
      <section id="logic" className="kpl-logic">
        <div className="kpl-container split-view">
          <motion.div 
            className="logic-text"
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={itemVariants('left')}
          >
            <h2>Hiérarchie Flexible</h2>
            <p>Organisez votre travail selon votre structure réelle :</p>
            <ul className="logic-list">
              <li><strong>Workspaces :</strong> Environnements globaux[cite: 28].</li>
              <li><strong>Espaces :</strong> Subdivisions thématiques[cite: 30].</li>
              <li><strong>Listes & Tâches :</strong> Projets concrets avec checklists imbriquées[cite: 7, 32].</li>
            </ul>
          </motion.div>
          <motion.div 
            className="logic-visual"
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={itemVariants('right')}
          >
            <div className="logic-diagram">
              <div className="diag-box w">Workspace</div>
              <div className="diag-line"></div>
              <div className="diag-box e">Espace</div>
              <div className="diag-line"></div>
              <div className="diag-box l">Liste (Projet)</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER AVEC RÉSEAUX SOCIAUX [cite: 48] */}
      <footer className="kpl-footer">
        <div className="kpl-container">
          <div className="footer-top">
            <div className="footer-info">
              <h3>K-PLANER</h3>
              <p>Solution multilingue avec traduction automatique[cite: 10].</p>
            </div>
            <div className="footer-social">
              <motion.a whileHover={{ scale: 1.2 }} href="#"><FaFacebookF /></motion.a>
              <motion.a whileHover={{ scale: 1.2 }} href="#"><FaLinkedinIn /></motion.a>
              <motion.a whileHover={{ scale: 1.2 }} href="#"><FaWhatsapp /></motion.a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 KHC - Plateforme Haute Disponibilité[cite: 51].</p>
            <div className="footer-tech">Stack: FastAPI + React + PostgreSQL [cite: 69, 70, 71]</div>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}