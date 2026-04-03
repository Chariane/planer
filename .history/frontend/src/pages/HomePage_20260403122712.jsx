import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Images du carousel
  const backgroundImages = [
    'Afrique-Senegal-Dakar-WEBGRAM-ingenierie-logicielle-systemes-informatiques-gestion-ressources-humaines-evaluation-personnel-planification-des-ressources-humaines.jpg',
    'Comment-optimiser-la-collaboration-entre-les-developpeurs-et-les-UX-Designers.jpg',
    'article-24945-1773130413669.jpg',
    'developpeur-ia.jpg',
    'devenir-developpeur-autodidacte.jpeg',
    'equipe-web-projet-web-developpement-web-chef-de-projet-digital-architecte-web-developpeur-web-developper-full-stack-developpeur-front-end-developpeur-back-end-icone-digital.webp',
  ];

  // Défilement automatique chaque seconde
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 2000); // 2 secondes par image
    return () => clearInterval(interval);
  }, [backgroundImages.length]);

const HomePage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative flex items-center justify-center min-h-screen px-4 overflow-hidden"
      >
        {/* Carousel background images */}
        <div className="absolute inset-0">
          {backgroundImages.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: index === currentImageIndex ? 1 : 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <img
                src={`/src/assets/${image}`}
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}
        </div>

        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 text-center max-w-4xl mx-auto"
        >
          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
          >
            K-PLANER
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl mb-8 text-slate-300"
          >
            La plateforme ultime pour gérer vos projets, tâches et temps de travail avec une collaboration en temps réel.
          </motion.p>
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/register"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Commencer Gratuitement
            </Link>
            <Link
              to="/login"
              className="border-2 border-slate-400 hover:border-purple-400 text-slate-300 hover:text-white font-semibold py-3 px-8 rounded-full transition-all duration-300"
            >
              Se Connecter
            </Link>
          </motion.div>
        </motion.div>

        {/* Carousel indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {backgroundImages.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              animate={{
                width: index === currentImageIndex ? 32 : 8,
                backgroundColor: index === currentImageIndex ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full cursor-pointer"
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
        viewport={{ once: true }}
        className="py-20 px-4"
      >
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
          >
            Fonctionnalités Clés
          </motion.h2>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-purple-500 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center text-2xl mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                <p className="text-slate-300">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="py-20 px-4"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent"
          >
            Prêt à Révolutionner Votre Gestion de Projet ?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-xl text-slate-300 mb-8"
          >
            Rejoignez des milliers d'équipes qui font confiance à K-PLANER pour leur productivité.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/register"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-4 px-10 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Créer un Compte
            </Link>
            <Link
              to="/login"
              className="border-2 border-cyan-400 hover:bg-cyan-400 hover:text-slate-900 text-cyan-400 font-semibold py-4 px-10 rounded-full transition-all duration-300"
            >
              Connexion
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-700">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-400">&copy; 2024 K-PLANER. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
