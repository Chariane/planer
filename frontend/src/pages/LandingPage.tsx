import { motion, useInView, easeOut } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, Calendar, Users, BarChart3, Clock, FileText, Play, Menu, X, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const fadeInUp = {
  hidden: { opacity: 0, y: 60, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: easeOut } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

export default function LandingPage() {
  const featuresRef = useRef(null);
  const demoRef = useRef(null);
  const stepsRef = useRef(null);
  const isFeaturesInView = useInView(featuresRef, { once: true, margin: "-100px" });
  const isDemoInView = useInView(demoRef, { once: true, margin: "-100px" });
  const isStepsInView = useInView(stepsRef, { once: true, margin: "-100px" });

  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Header fixe avec menu responsive */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white shadow-lg border-b border-gray-200' 
          : 'bg-white/30 backdrop-blur-sm border-b border-gray-100'
      }`}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-white"
            >KP</motion.div>
            <span className="text-xl font-bold text-gray-800">K‑Planner</span>
          </div>

          {/* Menu desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-secondary transition">Fonctionnalités</a>
            <a href="#demo" className="text-gray-600 hover:text-secondary transition">Démo</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-secondary transition">Guide</a>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                >
                  <span>{user.username || 'Mon compte'}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <button
                      onClick={handleDashboard}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Tableau de bord
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-[#1d3a52] transition">
                Se connecter
              </Link>
            )}
          </nav>

          {/* Bouton burger mobile */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6 text-gray-800" /> : <Menu className="h-6 w-6 text-gray-800" />}
          </button>
        </div>

        {/* Menu mobile (overlay latéral) */}
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMenuOpen(false)} />
            <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-xl z-50 md:hidden flex flex-col p-6">
              <div className="flex justify-end mb-6">
                <button onClick={() => setIsMenuOpen(false)} className="p-2">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-4">
                <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-gray-700 hover:text-secondary">Fonctionnalités</a>
                <a href="#demo" onClick={() => setIsMenuOpen(false)} className="text-gray-700 hover:text-secondary">Démo</a>
                <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="text-gray-700 hover:text-secondary">Guide</a>
                {user ? (
                  <>
                    <button onClick={() => { handleDashboard(); setIsMenuOpen(false); }} className="text-left text-gray-700 hover:text-secondary">Tableau de bord</button>
                    <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="text-left text-red-600 hover:text-red-700">Déconnexion</button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="px-4 py-2 rounded-lg bg-primary text-white text-center hover:bg-[#1d3a52]">Se connecter</Link>
                )}
              </nav>
            </div>
          </>
        )}
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-orange-50 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
          className="container mx-auto px-6 text-center"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Gérez vos projets et votre équipe <br />
            <span className="text-secondary inline-block hover:scale-105 transition-transform duration-300">en un seul endroit</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            K‑Planner combine gestion de tâches, suivi du temps, absences et rapports dans une interface moderne et intuitive.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400 }}>
            <Link to="/dashboard" className="inline-flex items-center px-6 py-3 rounded-lg bg-secondary text-white font-medium hover:bg-[#e05a00] transition shadow-lg hover:shadow-xl">
              Essayer gratuitement <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </motion.div>
        <motion.div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" animate={{ scale: [1,1.2,1], rotate:[0,90,0] }} transition={{ duration:20, repeat:Infinity, ease:"linear" }} />
        <motion.div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl" animate={{ scale:[1,1.3,1], rotate:[0,-90,0] }} transition={{ duration:25, repeat:Infinity, ease:"linear" }} />
      </section>

      {/* Features section */}
      <section id="features" ref={featuresRef} className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" animate={isFeaturesInView ? "visible" : "hidden"} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Une plateforme complète pour piloter vos projets et votre équipe.</p>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" animate={isFeaturesInView ? "visible" : "hidden"} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div key={idx} variants={fadeInUp} whileHover={{ y: -5 }} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer">
                <motion.div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4" whileHover={{ rotate:10, scale:1.1 }} transition={{ type:"spring", stiffness:400 }}>
                  <feature.icon className="h-6 w-6 text-secondary" />
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-500">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Demo section */}
      <section id="demo" ref={demoRef} className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" animate={isDemoInView ? "visible" : "hidden"} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Voir K‑Planner en action</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Découvrez comment notre plateforme transforme votre quotidien.</p>
          </motion.div>
          <motion.div initial={{ opacity:0, scale:0.8 }} animate={isDemoInView ? { opacity:1, scale:1 } : {}} transition={{ duration:0.8, type:"spring", delay:0.2 }} className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-100">
            <div className="aspect-video bg-gradient-to-br from-primary to-[#1d3a52] flex items-center justify-center relative group cursor-pointer">
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }} className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center shadow-lg">
                  <Play className="h-8 w-8 text-white ml-1" />
                </motion.div>
              </div>
              <motion.div className="absolute top-4 left-4 w-32 h-20 bg-white/20 rounded-lg backdrop-blur-sm" animate={{ y:[0,-10,0], rotate:[0,2,0] }} transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }} />
              <motion.div className="absolute bottom-4 right-4 w-40 h-24 bg-white/20 rounded-lg backdrop-blur-sm" animate={{ y:[0,10,0], rotate:[0,-2,0] }} transition={{ duration:4, repeat:Infinity, ease:"easeInOut" }} />
              <motion.div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 bg-white/30 rounded-xl backdrop-blur-md" animate={{ scale:[1,1.05,1] }} transition={{ duration:2, repeat:Infinity, ease:"easeInOut" }} />
            </div>
            <div className="p-4 text-center text-gray-500 text-sm">Aperçu interactif – Cliquez pour lancer la démo (simulation)</div>
          </motion.div>
          <p className="text-center text-gray-500 mt-4">Une vraie vidéo de démonstration sera bientôt disponible.</p>
        </div>
      </section>

      {/* How it works section */}
      <section id="how-it-works" ref={stepsRef} className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" animate={isStepsInView ? "visible" : "hidden"} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Comment ça marche ?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Trois étapes simples pour booster votre productivité.</p>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" animate={isStepsInView ? "visible" : "hidden"} className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step, idx) => (
              <motion.div key={idx} variants={fadeInUp} whileHover={{ y: -10 }} className="text-center bg-white p-6 rounded-xl shadow-md">
                <motion.div className="w-16 h-16 mx-auto rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mb-4" whileHover={{ rotate:360, scale:1.2 }} transition={{ duration:0.5, type:"spring" }}>
                  {idx + 1}
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
                <p className="text-gray-500">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-6 text-center">
          <motion.h2 initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }} transition={{ duration:0.6, type:"spring" }} viewport={{ once:true }} className="text-3xl md:text-4xl font-bold text-white mb-4">
            Prêt à transformer votre gestion de projet ?
          </motion.h2>
          <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} transition={{ delay:0.2 }} viewport={{ once:true }} className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Rejoignez K‑Planner dès aujourd'hui et gagnez en efficacité.
          </motion.p>
          <motion.div whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}>
            <Link to="/dashboard" className="inline-flex items-center px-8 py-3 rounded-lg bg-secondary text-white font-medium hover:bg-[#e05a00] transition text-lg shadow-lg hover:shadow-xl">
              Commencer gratuitement <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer enrichi */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Colonne 1 : Logo et description */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-white">KP</div>
                <span className="text-xl font-bold text-white">K‑Planner</span>
              </div>
              <p className="text-sm text-gray-400">
                La plateforme tout-en-un pour gérer vos projets, vos équipes, vos tâches et vos absences.
              </p>
            </div>

            {/* Colonne 2 : Liens rapides */}
            <div>
              <h3 className="text-white font-semibold mb-4">Liens rapides</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-secondary transition">Fonctionnalités</a></li>
                <li><a href="#demo" className="hover:text-secondary transition">Démo</a></li>
                <li><a href="#how-it-works" className="hover:text-secondary transition">Comment ça marche</a></li>
                <li><Link to="/dashboard" className="hover:text-secondary transition">Tableau de bord</Link></li>
              </ul>
            </div>

            {/* Colonne 3 : Ressources */}
            <div>
              <h3 className="text-white font-semibold mb-4">Ressources</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-secondary transition">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-secondary transition">Blog</a></li>
                <li><a href="#" className="hover:text-secondary transition">API</a></li>
                <li><a href="#" className="hover:text-secondary transition">Statut</a></li>
              </ul>
            </div>

            {/* Colonne 4 : Newsletter et réseaux sociaux */}
            <div>
              <h3 className="text-white font-semibold mb-4">Restez informé</h3>
              <div className="flex mb-4">
                <input
                  type="email"
                  placeholder="Votre email"
                  className="flex-1 px-3 py-2 text-sm rounded-l-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-secondary"
                />
                <button className="px-3 py-2 bg-secondary text-white text-sm rounded-r-lg hover:bg-[#e05a00] transition">
                  S'abonner
                </button>
              </div>
              <div className="flex gap-4">
                {/* Icônes des réseaux sociaux (inchangées) */}
                <a href="#" className="text-gray-400 hover:text-secondary transition">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-secondary transition">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0021.256-12.18c0-.21-.005-.42-.015-.63a9.935 9.935 0 002.31-2.4z"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-secondary transition">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.667.072 4.947.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.667-.014 4.947-.072 4.358-.2 6.78-2.618 6.98-6.98.058-1.28.072-1.688.072-4.947 0-3.259-.014-3.667-.072-4.947-.2-4.358-2.618-6.78-6.98-6.98-1.28-.059-1.688-.073-4.947-.073zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-secondary transition">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm">
            <p>&copy; 2025 K‑Planner. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  { icon: CheckCircle, title: "Gestion de tâches", description: "Organisez, priorisez et suivez l'avancement de vos tâches en quelques clics." },
  { icon: Users, title: "Travail en équipe", description: "Collaborez en temps réel, partagez des fichiers et communiquez sans effort." },
  { icon: BarChart3, title: "Tableaux de bord", description: "Visualisez vos indicateurs clés (KPI) et pilotez vos projets à la volée." },
  { icon: Calendar, title: "Absences & congés", description: "Gérez les demandes de congés, planifiez les absences et évitez les chevauchements." },
  { icon: FileText, title: "Rapports détaillés", description: "Générez des rapports d'activité, d'avancement et de temps passé." },
  { icon: Clock, title: "Suivi du temps", description: "Estimez et suivez le temps réel passé sur chaque tâche." }
];

const steps = [
  { title: "Créez votre workspace", description: "Un espace de travail partagé pour votre équipe, avec vos propres règles." },
  { title: "Ajoutez des projets et tâches", description: "Structurez votre travail avec des listes, des checklists et des échéances." },
  { title: "Collaborez et suivez", description: "Attribuez des tâches, discutez, et suivez l'avancement en temps réel." }
];