import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Images du carousel
  const backgroundImages = [
    'Afrique-Senegal-Dakar-WEBGRAM-ingenierie-logicielle-systemes-informatiques-gestion-ressources-humaines-evaluation-personnel-planification-des-ressources-humaines.jpg',
    'Comment-optimiser-la-collaboration-entre-les-developpeurs-et-les-UX-Designers.jpg',
    'article-24945-1773130413669.jpg',
    'developpeur-ia.jpg',
    'devenir-developpeur-autodidacte.jpeg',
    'equipe-web-projet-web-developpement-web-chef-de-projet-digital-architecte-web-developpeur-web-developper-full-stack-developpeur-front-end-developpeur-back-end-icone-digital.webp',
  ];

  // Défilement automatique
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  // Suivi de la souris pour parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 20 - 10,
        y: (e.clientY / window.innerHeight) * 20 - 10,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: 'easeOut' } 
    },
  };

  const features = [
    {
      title: 'Centralisation des Projets',
      description: 'Gérez tous vos projets dans un espace unifié avec suivi en temps réel.',
      icon: '📊',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Collaboration Temps Réel',
      description: 'Travaillez ensemble avec chat intégré et notifications instantanées.',
      icon: '💬',
      color: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Gestion des Tâches Kanban/Gantt',
      description: 'Visualisez et organisez vos tâches avec des vues flexibles.',
      icon: '📋',
      color: 'from-cyan-500 to-teal-600',
    },
    {
      title: 'Suivi des Absences',
      description: 'Gérez les congés et absences de votre équipe efficacement.',
      icon: '📅',
      color: 'from-emerald-500 to-green-600',
    },
  ];

  // Feature card component with hover animation
  const FeatureCard = ({ feature, index }) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ 
        y: -20, 
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        scale: 1.03
      }}
      transition={{ duration: 0.3 }}
      className={`p-8 rounded-2xl border border-slate-700 bg-slate-900/70 shadow-xl hover:border-purple-500 cursor-pointer group relative overflow-hidden`}
    >
      {/* Animated gradient background on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-purple-600/0 to-pink-600/0 group-hover:from-purple-600/10 group-hover:to-pink-600/10 transition-all duration-300"
      />
      <div className="relative z-10">
        <div className={`inline-flex px-4 py-2 rounded-full bg-gradient-to-r ${feature.color} text-white font-bold text-2xl mb-4`}>
          {feature.icon}
        </div>
        <motion.h3 
          className="text-xl font-semibold mb-3 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all"
        >
          {feature.title}
        </motion.h3>
        <p className="text-slate-300 group-hover:text-slate-100 transition-colors">{feature.description}</p>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative flex items-center justify-center min-h-screen px-4 overflow-hidden"
      >
        {/* Carousel background images with parallax */}
        <div className="absolute inset-0">
          {backgroundImages.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: index === currentImageIndex ? 1 : 0,
                scale: index === currentImageIndex ? 1.05 : 1
              }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0"
            >
              <img
                src={`/src/assets/${image}`}
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover"
                style={{
                  transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Dark overlay with gradient */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80"
          animate={{ opacity: [0.6, 0.7, 0.6] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 text-center max-w-4xl mx-auto"
        >
          {/* Animated title with glow effect */}
          <motion.div
            variants={itemVariants}
            className="relative"
          >
            <motion.h1
              className="text-6xl md:text-7xl lg:text-8xl font-black mb-6 bg-gradient-to-r from-blue-300 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-2xl"
              animate={{ 
                textShadow: [
                  '0 0 20px rgba(147, 112, 219, 0)',
                  '0 0 40px rgba(147, 112, 219, 0.5)',
                  '0 0 20px rgba(147, 112, 219, 0)',
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              K-PLANER
            </motion.h1>
            <motion.div
              className="absolute inset-0 blur-2xl bg-gradient-to-r from-purple-600/30 to-pink-600/30 -z-10"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </motion.div>

          {/* Description with staggered animation */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-2xl mb-10 text-slate-100 font-light tracking-wide"
          >
            La plateforme ultime pour gérer vos projets, tâches et temps de travail avec une collaboration en temps réel.
          </motion.p>

          {/* CTA Buttons with advanced hover effects */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-6 justify-center"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/register"
                className="relative inline-block px-10 py-4 font-bold text-lg text-white overflow-hidden rounded-full group"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <span className="relative block group-hover:scale-110 transition-transform duration-300">
                  Commencer Gratuitement
                </span>
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/login"
                className="relative inline-block px-10 py-4 font-bold text-lg rounded-full overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 border-2 border-white"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                />
                <motion.div
                  className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"
                />
                <span className="relative block text-white group-hover:text-purple-200 transition-colors duration-300">
                  Se Connecter
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Carousel indicators with interactive effects */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 z-20">
          {backgroundImages.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              whileHover={{ scale: 1.3 }}
              whileTap={{ scale: 0.9 }}
              animate={{
                width: index === currentImageIndex ? 32 : 8,
                backgroundColor: index === currentImageIndex ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full cursor-pointer shadow-lg"
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        className="py-24 px-4 bg-gradient-to-b from-transparent to-slate-900/50"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Fonctionnalités Clés
            </h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              viewport={{ once: true }}
              className="text-xl text-slate-300"
            >
              Tout ce dont vous avez besoin pour réussir vos projets
            </motion.p>
          </motion.div>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
        className="py-24 px-4 relative overflow-hidden"
      >
        {/* Animated background elements */}
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, delay: 0.5 }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent"
          >
            Prêt à Révolutionner Votre Gestion de Projet ?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            viewport={{ once: true }}
            className="text-xl text-slate-300 mb-10"
          >
            Rejoignez des milliers d'équipes qui font confiance à K-PLANER pour leur productivité.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-6 justify-center"
          >
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/register"
                className="inline-block px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-2xl"
              >
                Créer un Compte
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/login"
                className="inline-block px-10 py-4 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-900 font-bold rounded-full transition-all"
              >
                Connexion
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.3 }}>
              <h3 className="text-lg font-bold mb-4 text-white">K-PLANER</h3>
              <p className="text-slate-400 hover:text-slate-300 transition-colors">
                Plateforme de gestion de projets et collaboration en temps réel
              </p>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.3 }}>
              <h4 className="text-lg font-bold mb-4 text-white">Liens</h4>
              <ul className="space-y-2">
                {['Accueil', 'Fonctionnalités', 'Tarifs', 'Contact'].map((link) => (
                  <li key={link}>
                    <motion.span
                      className="text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors"
                      whileHover={{ x: 5 }}
                    >
                      {link}
                    </motion.span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.3 }}>
              <h4 className="text-lg font-bold mb-4 text-white">Support</h4>
              <ul className="space-y-2">
                {['Aide', 'FAQ', 'Conditions', 'Confidentialité'].map((link) => (
                  <li key={link}>
                    <motion.span
                      className="text-slate-400 hover:text-pink-400 cursor-pointer transition-colors"
                      whileHover={{ x: 5 }}
                    >
                      {link}
                    </motion.span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.3 }}>
              <h4 className="text-lg font-bold mb-4 text-white">Contact</h4>
              <p className="text-slate-400">📧 contact@k-planer.com</p>
              <p className="text-slate-400">📞 +33 1 23 45 67 89</p>
              <div className="flex gap-4 mt-4">
                {['📘', '🐦', '💼'].map((icon, i) => (
                  <motion.span
                    key={i}
                    whileHover={{ scale: 1.3, rotate: 10 }}
                    className="cursor-pointer text-xl"
                  >
                    {icon}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent my-8"
            style={{ originX: 0 }}
          />

          <motion.div
            className="text-center text-slate-400"
            whileHover={{ scale: 1.05 }}
          >
            <p>
              © {new Date().getFullYear()} K-PLANER. {' '}
              <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                Tous droits réservés.
              </span>
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
