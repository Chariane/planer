import { motion, useInView, easeOut, AnimatePresence } from 'framer-motion';
import { sanitizeText, sanitizeHtml } from '../utils/sanitize';
import { useRef, useState, useEffect } from 'react';
import {
  ArrowRight, CheckCircle, Calendar, Users, BarChart3, Clock,
  FileText, Play, Menu, X, ChevronDown, Hash, Briefcase,
  ShieldCheck, Star, Zap, Layers, TrendingUp, Award,
  MessageCircle, Mail
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { planService, type SubscriptionPlan } from '../services/plan.service';

// Animations
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
  const pricingRef = useRef(null);
  const statsRef = useRef(null);
  const testimonialsRef = useRef(null);

  const isFeaturesInView = useInView(featuresRef, { once: true, margin: "-100px" });
  const isDemoInView = useInView(demoRef, { once: true, margin: "-100px" });
  const isStepsInView = useInView(stepsRef, { once: true, margin: "-100px" });
  const isStatsInView = useInView(statsRef, { once: true, margin: "-100px" });
  const isTestimonialsInView = useInView(testimonialsRef, { once: true, margin: "-100px" });

  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(fallbackPlans);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;
    planService.getPlans()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) setPlans(data);
      })
      .catch(() => {
        if (isMounted) setPlans(fallbackPlans);
      });
    return () => { isMounted = false; };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDashboard = () => navigate('/dashboard');

  const { isDarkMode, toggleDarkMode } = useTheme();

  const formatLimit = (value?: number | null, label = '') => (
    value === null || value === undefined ? `Illimité${label ? ` ${label}` : ''}` : `${value}${label ? ` ${label}` : ''}`
  );

  // Statistiques factices
  const stats = [
    { label: 'Utilisateurs actifs', value: 1200, suffix: '+' },
    { label: 'Projets gérés', value: 3400, suffix: '+' },
    { label: 'Heures économisées', value: 45000, suffix: '+' },
    { label: 'Équipes', value: 280, suffix: '+' },
  ];

  // Témoignages
  const testimonials = [
    { name: 'Alice M.', role: 'CTO, TechStart', content: 'Planer a révolutionné notre façon de gérer les projets. Interface intuitive et puissante !', avatar: 'https://i.pravatar.cc/100?img=1' },
    { name: 'Jean D.', role: 'Chef de projet', content: 'Le suivi du temps et les rapports nous ont permis d\'optimiser nos ressources de 30 %.', avatar: 'https://i.pravatar.cc/100?img=2' },
    { name: 'Sophie L.', role: 'CEO, DesignLab', content: 'Une plateforme complète qui rassemble tout ce dont une équipe créative a besoin.', avatar: 'https://i.pravatar.cc/100?img=3' },
  ];

  return (
    <div className="min-h-screen bg-theme-page text-theme-main overflow-x-hidden selection:bg-secondary/30">
      {/* Background orbes */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Header amélioré */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
        ? 'bg-theme-surface/80 backdrop-blur-xl border-b border-theme-border-subtle shadow-theme-lg'
        : 'bg-transparent border-b border-transparent'
        }`}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo avec image et texte "Planer" */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="h-10 w-10 flex-shrink-0 rounded-xl overflow-hidden shadow-lg drop-shadow-lg"
            >
              <img src="/logo.png" alt="Planer" className="h-full w-full object-cover" />
            </motion.div>
            <span className="text-2xl font-black tracking-tighter uppercase bg-gradient-to-r from-secondary to-orange-400 bg-clip-text text-transparent">
              Planer
            </span>
          </Link>

          {/* Menu desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {['features', 'demo', 'how-it-works', 'plans'].map((id) => (
              <a key={id} href={`#${id}`} className="text-xs font-black uppercase tracking-widest text-theme-muted hover:text-secondary transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-secondary after:transition-all hover:after:w-full">
                {id === 'features' ? 'Fonctionnalités' : id === 'demo' ? 'Démo' : id === 'how-it-works' ? 'Guide' : 'Plans'}
              </a>
            ))}

            <button onClick={toggleDarkMode} className="p-2.5 rounded-xl bg-theme-surface/50 border border-theme-border-subtle text-theme-muted hover:text-secondary hover:border-secondary/30 transition-all shadow-theme-sm">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <div className="relative">
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-theme-surface/50 border border-theme-border-subtle text-theme-main hover:border-secondary/30 transition-all font-bold text-sm">
                  <span>{user.username || 'Mon compte'}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDropdownOpen && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute right-0 mt-2 w-56 bg-theme-surface/90 backdrop-blur-xl rounded-2xl shadow-theme-xl border border-theme-border-subtle p-2 z-20">
                    <button onClick={() => { handleDashboard(); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-theme-main hover:bg-theme-surface-hover hover:text-secondary rounded-xl transition-colors">
                      Tableau de bord
                    </button>
                    <button onClick={() => { handleLogout(); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                      Déconnexion
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <Link to="/login" className="px-6 py-3 rounded-xl bg-secondary text-white font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 transition-all shadow-xl shadow-secondary/30 hover:shadow-secondary/50">
                Se connecter
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-theme-surface-hover transition" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6 text-theme-main" /> : <Menu className="h-6 w-6 text-theme-main" />}
          </button>
        </div>

        {/* Menu mobile */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="fixed inset-0 z-40 md:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 top-0 h-full w-72 bg-theme-surface shadow-2xl p-6 flex flex-col">
                <div className="flex justify-end mb-6">
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-lg hover:bg-theme-surface-hover">
                    <X className="h-5 w-5 text-theme-main" />
                  </button>
                </div>
                <nav className="flex flex-col gap-4 text-sm font-bold uppercase tracking-widest">
                  <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-theme-main hover:text-secondary">Fonctionnalités</a>
                  <a href="#demo" onClick={() => setIsMenuOpen(false)} className="text-theme-main hover:text-secondary">Démo</a>
                  <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="text-theme-main hover:text-secondary">Guide</a>
                  <a href="#plans" onClick={() => setIsMenuOpen(false)} className="text-theme-main hover:text-secondary">Plans</a>
                  {user ? (
                    <>
                      <button onClick={() => { handleDashboard(); setIsMenuOpen(false); }} className="text-left py-3 px-4 rounded-xl hover:bg-theme-surface-hover">Tableau de bord</button>
                      <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="text-left py-3 px-4 rounded-xl text-red-500 hover:bg-red-500/10">Déconnexion</button>
                    </>
                  ) : (
                    <Link to="/login" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 rounded-xl bg-secondary text-white text-center">Se connecter</Link>
                  )}
                  <button onClick={toggleDarkMode} className="flex items-center justify-between px-4 py-3 rounded-xl bg-theme-surface-hover border border-theme-border-subtle mt-2">
                    <span>Mode sombre</span>
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden pt-36 pb-32 md:pt-48 md:pb-40">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}>
              {/* Badge supprimé */}
              <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter uppercase mb-6">
                Gérer l'avenir <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-orange-400">de vos projets</span>
              </h1>
              <p className="text-lg text-theme-muted mb-10 max-w-lg font-medium leading-relaxed opacity-80">
                Planer combine gestion de tâches, suivi du temps, absences et rapports dans une interface futuriste.
              </p>
              <div className="flex flex-wrap gap-4">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/dashboard" className="inline-flex items-center px-8 py-4 rounded-2xl bg-secondary text-white font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-2xl shadow-secondary/30 group">
                    Commencer <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
                <a href="#features" className="inline-flex items-center px-8 py-4 rounded-2xl border border-theme-border-subtle text-theme-main font-black uppercase tracking-widest text-xs hover:border-secondary/40 hover:text-secondary transition-all">
                  Explorer
                </a>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, type: 'spring' }} className="relative flex justify-center">
              <div className="relative w-full max-w-md aspect-square rounded-3xl bg-gradient-to-br from-secondary/10 to-orange-400/10 p-6 border border-theme-border-subtle shadow-2xl">
                <div className="absolute inset-0 bg-secondary/5 rounded-3xl blur-2xl" />
                <div className="relative h-full w-full bg-theme-surface/80 rounded-2xl p-4 flex flex-col gap-3 border border-white/10 shadow-inner">
                  {/* Simulacre de dashboard */}
                  <div className="flex items-center gap-3 border-b border-theme-border-subtle pb-3">
                    <div className="h-8 w-8 rounded-xl bg-secondary/20 flex items-center justify-center"><BarChart3 className="h-4 w-4 text-secondary" /></div>
                    <div className="flex-1 h-2 bg-theme-border-subtle rounded-full w-20" />
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <div className="h-2 w-2 rounded-full bg-red-400" />
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="bg-theme-surface-hover rounded-xl p-2 h-16 flex flex-col justify-end">
                        <div className="h-1.5 w-3/4 bg-theme-border-subtle rounded-full" />
                        <div className="h-1 w-1/2 bg-theme-border-subtle rounded-full mt-1" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-theme-border-subtle">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-6 w-6 rounded-full bg-secondary/20 border-2 border-theme-surface" />
                      ))}
                    </div>
                    <div className="flex-1 h-1.5 bg-theme-border-subtle rounded-full" />
                    <div className="h-5 w-5 rounded-full bg-emerald-400/30" />
                  </div>
                </div>
                <div className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full bg-secondary shadow-xl flex items-center justify-center text-white text-xs font-black">+</div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Orbes animées */}
        <div className="absolute inset-0 -z-10 opacity-30">
          <motion.div className="absolute top-20 right-[10%] w-72 h-72 bg-secondary/20 rounded-full blur-[120px]" animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], x: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity }} />
          <motion.div className="absolute bottom-20 left-[5%] w-[400px] h-[400px] bg-primary/20 rounded-full blur-[150px]" animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2], y: [0, -30, 0] }} transition={{ duration: 12, repeat: Infinity }} />
        </div>
      </section>

      {/* Stats section */}
      <section ref={statsRef} className="py-20 border-y border-theme-border-subtle/50 bg-theme-surface/20">
        <div className="container mx-auto px-6">
          <motion.div variants={staggerContainer} initial="hidden" animate={isStatsInView ? "visible" : "hidden"} className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <motion.div key={idx} variants={fadeInUp} className="text-center">
                <div className="text-4xl md:text-5xl font-black text-secondary tracking-tight">
                  {sanitizeText(String(stat.value))}{stat.suffix}
                </div>
                <div className="text-xs font-black uppercase tracking-widest text-theme-muted mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features section */}
      <section id="features" ref={featuresRef} className="py-32 relative">
        <div className="container mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" animate={isFeaturesInView ? "visible" : "hidden"} className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-theme-main mb-6 uppercase tracking-tighter">Tout ce dont vous avez besoin</h2>
            <p className="text-xl text-theme-muted max-w-2xl mx-auto font-medium opacity-60">Une plateforme complète pour piloter vos projets et votre équipe.</p>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" animate={isFeaturesInView ? "visible" : "hidden"} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((feature, idx) => (
              <motion.div key={idx} variants={fadeInUp} whileHover={{ y: -10 }} className="group bg-theme-surface/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-theme-border-subtle hover:border-secondary/30 hover:bg-theme-surface/60 transition-all duration-500 shadow-theme-sm hover:shadow-theme-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <motion.div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 flex items-center justify-center mb-8 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-inner" transition={{ type: "spring", stiffness: 400 }}>
                  <feature.icon className="h-8 w-8 text-secondary" />
                </motion.div>
                <h3 className="text-2xl font-black text-theme-main mb-4 uppercase tracking-tight">{sanitizeText(feature.title)}</h3>
                <p className="text-theme-muted leading-relaxed font-medium opacity-80">{sanitizeText(feature.description)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Demo section */}
      <section id="demo" ref={demoRef} className="py-32 bg-theme-surface/20">
        <div className="container mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" animate={isDemoInView ? "visible" : "hidden"} className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-theme-main mb-6 uppercase tracking-tighter">Voir Planer en action</h2>
            <p className="text-xl text-theme-muted max-w-2xl mx-auto font-medium opacity-60">Découvrez comment notre plateforme transforme votre quotidien.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 50 }} animate={isDemoInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, type: "spring", delay: 0.2 }} className="relative max-w-5xl mx-auto rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.3)] border border-theme-border-subtle bg-theme-surface p-4">
            <div className="aspect-video bg-gradient-to-br from-primary to-[#0f172a] rounded-[2.5rem] overflow-hidden flex items-center justify-center relative group cursor-pointer border border-theme-border-subtle/50">
              <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }} className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center shadow-2xl shadow-secondary/50 border-4 border-white/20">
                  <Play className="h-10 w-10 text-white ml-1" />
                </motion.div>
              </div>
              {/* Éléments décoratifs */}
              <motion.div className="absolute top-10 left-10 w-48 h-32 bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10" animate={{ y: [0, -20, 0], rotate: [0, 2, 0] }} transition={{ duration: 6, repeat: Infinity }} />
              <motion.div className="absolute bottom-10 right-10 w-64 h-40 bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10" animate={{ y: [0, 20, 0], rotate: [0, -2, 0] }} transition={{ duration: 8, repeat: Infinity }} />
            </div>
            <div className="p-4 text-center text-theme-muted text-xs font-bold uppercase tracking-widest opacity-40">Démo Interactive (Simulation)</div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" ref={stepsRef} className="py-32 relative">
        <div className="container mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" animate={isStepsInView ? "visible" : "hidden"} className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-theme-main mb-6 uppercase tracking-tighter">Comment ça marche ?</h2>
            <p className="text-xl text-theme-muted max-w-2xl mx-auto font-medium opacity-60">Trois étapes simples pour booster votre productivité.</p>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" animate={isStepsInView ? "visible" : "hidden"} className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
            {steps.map((step, idx) => (
              <motion.div key={idx} variants={fadeInUp} whileHover={{ y: -10 }} className="text-center group relative">
                <div className="relative mb-8">
                  <motion.div className="w-24 h-24 mx-auto rounded-[2rem] bg-theme-surface border border-theme-border-subtle text-secondary flex items-center justify-center text-3xl font-black shadow-theme-md group-hover:bg-secondary group-hover:text-white group-hover:rotate-[360deg] transition-all duration-700">
                    {idx + 1}
                  </motion.div>
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 left-[calc(50%+4rem)] w-[calc(100%-8rem)] h-px bg-gradient-to-r from-theme-border-subtle to-transparent" />
                  )}
                </div>
                <h3 className="text-2xl font-black text-theme-main mb-4 uppercase tracking-tight">{step.title}</h3>
                <p className="text-theme-muted font-medium opacity-70 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section ref={testimonialsRef} className="py-32 bg-theme-surface/10">
        <div className="container mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" animate={isTestimonialsInView ? "visible" : "hidden"} className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-theme-main mb-6 uppercase tracking-tighter">Ils nous font confiance</h2>
            <p className="text-xl text-theme-muted max-w-2xl mx-auto font-medium opacity-60">Des retours de nos utilisateurs passionnés.</p>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" animate={isTestimonialsInView ? "visible" : "hidden"} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <motion.div key={idx} variants={fadeInUp} className="bg-theme-surface/40 backdrop-blur-md p-8 rounded-3xl border border-theme-border-subtle shadow-theme-sm hover:shadow-theme-lg transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <img src={t.avatar} alt={t.name} className="h-14 w-14 rounded-full border-2 border-secondary/30" />
                  <div>
                    <div className="font-black text-theme-main">{sanitizeText(t.name)}</div>
                    <div className="text-xs font-black uppercase tracking-widest text-theme-muted">{sanitizeText(t.role)}</div>
                  </div>
                </div>
                <p className="text-theme-muted italic leading-relaxed">"{sanitizeText(t.content)}"</p>
                <div className="mt-4 flex text-secondary">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="plans" ref={pricingRef} className="py-32">
        <div className="container mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-theme-main mb-6 uppercase tracking-tighter">Des plans clairs</h2>
            <p className="text-xl text-theme-muted max-w-2xl mx-auto font-medium opacity-60">
              Commencez simplement, puis passez à une organisation plus structurée.
            </p>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const isFree = (plan.billing?.montant ?? 0) === 0;
              return (
                <motion.div key={plan.code} variants={fadeInUp} className={`relative flex h-full flex-col rounded-[2rem] border p-8 shadow-theme-sm transition-all duration-500 ${
                  plan.highlight
                    ? 'border-secondary/50 bg-secondary/10 shadow-secondary/10'
                    : 'border-theme-border-subtle bg-theme-surface/60'
                }`}>
                  {plan.highlight && <span className="absolute right-6 top-6 rounded-full bg-secondary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Populaire</span>}
                  <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-theme-border-subtle bg-theme-surface-hover text-secondary">
                    {plan.code === 'ENTREPRISE' ? <ShieldCheck className="h-7 w-7" /> : <Briefcase className="h-7 w-7" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-theme-main">{sanitizeText(plan.nom)}</h3>
                    <p className="mt-3 min-h-[3.5rem] text-sm font-medium leading-relaxed text-theme-muted opacity-80">{sanitizeText(plan.audience)}</p>
                    <div className="mt-6 flex items-end gap-2">
                      <span className="text-3xl font-black text-theme-main">{plan.price_label}</span>
                      {!isFree && <span className="pb-1 text-xs font-bold uppercase tracking-widest text-theme-muted">/mois</span>}
                    </div>
                  </div>
                  <div className="my-8 h-px bg-theme-border-subtle" />
                  <div className="grid grid-cols-2 gap-3 text-xs font-bold text-theme-muted">
                    <div className="rounded-2xl bg-theme-surface-hover p-3">
                      <span className="block text-theme-main">{formatLimit(plan.limits.workspaces)}</span>
                      workspaces
                    </div>
                    <div className="rounded-2xl bg-theme-surface-hover p-3">
                      <span className="block text-theme-main">{formatLimit(plan.limits.membres)}</span>
                      membres
                    </div>
                    <div className="rounded-2xl bg-theme-surface-hover p-3">
                      <span className="block text-theme-main">{formatLimit(plan.limits.projets)}</span>
                      projets
                    </div>
                    <div className="rounded-2xl bg-theme-surface-hover p-3">
                      <span className="block text-theme-main">{formatLimit(plan.limits.stockage_mo, 'Mo')}</span>
                      stockage
                    </div>
                  </div>
                  <ul className="mt-8 flex-1 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm font-medium leading-relaxed text-theme-muted">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-secondary" />
                        <span>{sanitizeText(feature)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={user ? '/dashboard' : '/register'} className={`mt-8 inline-flex items-center justify-center rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    plan.highlight
                      ? 'bg-secondary text-white shadow-lg shadow-secondary/20 hover:bg-orange-600'
                      : 'border border-theme-border-subtle text-theme-main hover:border-secondary/40 hover:text-secondary'
                  }`}>
                    {plan.code === 'ENTREPRISE' ? 'Préparer mon entreprise' : 'Choisir ce plan'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <GlassCard className="p-16 relative overflow-hidden bg-gradient-to-br from-primary to-[#0f172a] border-none text-center rounded-[3rem]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
            <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tighter uppercase leading-[1.1]">
              Prêt à transformer <br /> votre gestion ?
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.2 }} viewport={{ once: true }} className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto font-medium opacity-80 leading-relaxed">
              Rejoignez plus de 500 entreprises qui utilisent Planer pour piloter leurs projets stratégiques.
            </motion.p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/dashboard" className="inline-flex items-center px-12 py-6 rounded-2xl bg-secondary text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-secondary/40 hover:bg-orange-600 transition-all">
                Démarrer gratuitement <ArrowRight className="ml-3 h-5 w-5" />
              </Link>
            </motion.div>
          </GlassCard>
        </div>
      </section>

      {/* Footer enrichi - avec image logo et texte "Planer" */}
      <footer className="bg-theme-surface border-t border-theme-border-subtle py-24">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 flex-shrink-0 rounded-xl overflow-hidden shadow-lg">
                  <img src="/logo.png" alt="Planer" className="h-full w-full object-cover" />
                </div>
                <span className="text-2xl font-black bg-gradient-to-r from-secondary to-orange-400 bg-clip-text text-transparent uppercase">Planer</span>
              </div>
              <p className="text-sm text-theme-muted font-medium leading-relaxed opacity-70">
                La plateforme futuriste tout-en-un pour gérer vos projets, vos équipes, vos tâches et vos absences avec élégance.
              </p>
            </div>
            <div>
              <h3 className="text-[10px] font-black text-theme-main uppercase tracking-[0.3em] mb-8">Produit</h3>
              <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-theme-muted">
                <li><a href="#features" className="hover:text-secondary transition-colors">Fonctionnalités</a></li>
                <li><a href="#demo" className="hover:text-secondary transition-colors">Démo</a></li>
                <li><a href="#plans" className="hover:text-secondary transition-colors">Tarifs</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[10px] font-black text-theme-main uppercase tracking-[0.3em] mb-8">Support</h3>
              <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-theme-muted">
                <li><a href="#" className="hover:text-secondary transition-colors">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">CGU</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[10px] font-black text-theme-main uppercase tracking-[0.3em] mb-8">Newsletter</h3>
              <div className="flex mb-6 bg-theme-surface-hover border border-theme-border-subtle rounded-2xl overflow-hidden p-1">
                <input type="email" placeholder="votre@email.com" className="flex-1 px-4 py-2.5 text-xs bg-transparent text-theme-main focus:outline-none placeholder:text-theme-muted/50" />
                <button className="px-5 py-2.5 bg-secondary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all">OK</button>
              </div>
            </div>
          </div>
          <div className="mt-24 pt-8 border-t border-theme-border-subtle/50 text-center">
            <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.3em] opacity-40">
              &copy; 2025 Planer. Design System Premium par Kapitals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Données (features, steps, fallbackPlans) inchangées...
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

const fallbackPlans: SubscriptionPlan[] = [
  {
    code: 'ESSENTIEL',
    nom: 'Essentiel',
    audience: 'Pour un utilisateur ou une petite équipe qui structure son travail.',
    description: 'Le socle gratuit pour démarrer avec Planer sans complexité.',
    price_label: '0 XOF',
    highlight: false,
    billing: { montant: 0, devise: 'XOF', duree_jours: 30 },
    limits: { workspaces: 1, espaces: 5, projets: 10, membres: 5, stockage_mo: 250, historique_jours: 30 },
    features: [
      'Workspace personnel créé automatiquement',
      'Gestion des espaces, projets, tâches et checklists',
      "Canevas de projet et suivi d'avancement",
      'Messagerie de groupe basique',
      'Notifications essentielles',
    ],
    restrictions: ['Quotas limités pour les membres et fichiers', "Pas de supervision avancée d'organisation"],
  },
  {
    code: 'PROFESSIONNEL',
    nom: 'Professionnel',
    audience: 'Pour une équipe structurée qui gère plusieurs projets actifs.',
    description: 'Plus de capacité, de collaboration et de suivi pour travailler en équipe.',
    price_label: '5 000 XOF',
    highlight: true,
    billing: { montant: 5000, devise: 'XOF', duree_jours: 30 },
    limits: { workspaces: 5, espaces: null, projets: null, membres: 50, stockage_mo: 5120, historique_jours: 365 },
    features: [
      'Plusieurs workspaces',
      'Espaces et sous-espaces étendus',
      'Rapports de travail',
      'Fichiers plus volumineux',
      'Notifications avancées',
      'Appels audio et vidéo',
      'Historique plus long',
    ],
    restrictions: ['Facturation et supervision limitées'],
  },
  {
    code: 'ENTREPRISE',
    nom: 'Entreprise',
    audience: 'Pour une organisation qui veut centraliser ses équipes et ses contrôles.',
    description: 'Le plan complet pour piloter une organisation avec supervision et gouvernance.',
    price_label: '10 000 XOF',
    highlight: false,
    billing: { montant: 10000, devise: 'XOF', duree_jours: 30 },
    limits: { workspaces: null, espaces: null, projets: null, membres: null, stockage_mo: null, historique_jours: null },
    features: [
      'Workspaces, espaces et projets à quotas élevés',
      'Rapports de travail avancés',
      'Absences et congés',
      'Facturation centralisée',
      'Supervision des membres',
      'Sécurité renforcée',
      'Support prioritaire',
      "Branding et logo de l'entreprise",
      'Analyse de performance',
    ],
    restrictions: [],
  },
];