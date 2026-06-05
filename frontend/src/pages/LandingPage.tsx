import { motion, useInView, easeOut } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, Calendar, Users, BarChart3, Clock, FileText, Play, Menu, X, ChevronDown, Hash, Briefcase, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import KhcLogo from '../components/ui/KhcLogo';
import { GlassCard } from '../components/ui/GlassCard';
import { planService, type SubscriptionPlan } from '../services/plan.service';

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
  const isFeaturesInView = useInView(featuresRef, { once: true, margin: "-100px" });
  const isDemoInView = useInView(demoRef, { once: true, margin: "-100px" });
  const isStepsInView = useInView(stepsRef, { once: true, margin: "-100px" });

  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(fallbackPlans);

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

  useEffect(() => {
    let isMounted = true;
    planService.getPlans()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setPlans(data);
        }
      })
      .catch(() => {
        if (isMounted) setPlans(fallbackPlans);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  const { isDarkMode, toggleDarkMode } = useTheme();
  const formatLimit = (value?: number | null, label = '') => (
    value === null || value === undefined ? `Illimite${label ? ` ${label}` : ''}` : `${value}${label ? ` ${label}` : ''}`
  );

  return (
    <div className="min-h-screen bg-theme-page text-theme-main overflow-x-hidden selection:bg-secondary/30">
      {/* Background Decorative Gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
      </div>
      {/* Header fixe avec menu responsive */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
        ? 'bg-theme-surface/80 backdrop-blur-xl border-b border-theme-border-subtle shadow-theme-lg'
        : 'bg-transparent border-b border-transparent'
        }`}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <KhcLogo size={32} />
            <span className="text-xl font-black text-theme-main tracking-tighter uppercase">K‑Planner</span>
          </div>

          {/* Menu desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-black uppercase tracking-widest text-theme-muted hover:text-secondary transition-colors">Fonctionnalités</a>
            <a href="#demo" className="text-xs font-black uppercase tracking-widest text-theme-muted hover:text-secondary transition-colors">Démo</a>
            <a href="#how-it-works" className="text-xs font-black uppercase tracking-widest text-theme-muted hover:text-secondary transition-colors">Guide</a>
            <a href="#plans" className="text-xs font-black uppercase tracking-widest text-theme-muted hover:text-secondary transition-colors">Plans</a>

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl bg-theme-surface/50 border border-theme-border-subtle text-theme-muted hover:text-secondary hover:border-secondary/30 transition-all shadow-theme-sm"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-surface/50 border border-theme-border-subtle text-theme-main hover:border-secondary/30 transition-all font-bold text-sm"
                >
                  <span>{user.username || 'Mon compte'}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-theme-surface/90 backdrop-blur-xl rounded-2xl shadow-theme-lg border border-theme-border-subtle p-2 z-20">
                    <button
                      onClick={handleDashboard}
                      className="block w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-theme-main hover:bg-theme-surface-hover hover:text-secondary rounded-xl transition-colors"
                    >
                      Tableau de bord
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="px-5 py-2.5 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
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
                <a href="#plans" onClick={() => setIsMenuOpen(false)} className="text-gray-700 hover:text-secondary">Plans</a>
                {user ? (
                  <>
                    <button onClick={() => { handleDashboard(); setIsMenuOpen(false); }} className="text-left py-2 px-4 rounded-xl hover:bg-theme-surface-hover text-theme-main font-bold">Tableau de bord</button>
                    <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="text-left py-2 px-4 rounded-xl hover:bg-red-500/10 text-red-500 font-bold">Déconnexion</button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 rounded-xl bg-primary text-white text-center font-black uppercase tracking-widest text-xs">Se connecter</Link>
                )}

                <button
                  onClick={toggleDarkMode}
                  className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-theme-surface border border-theme-border-subtle text-theme-main"
                >
                  <span className="font-bold text-sm">Mode Sombre</span>
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </nav>
            </div>
          </>
        )}
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden py-32 md:py-48">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
          className="container mx-auto px-6 text-center relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block px-4 py-1.5 mb-8 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-sm"
          >
            Nouvelle Version 2.0
          </motion.div>
          <h1 className="text-5xl md:text-8xl font-black text-theme-main mb-8 leading-[1.1] tracking-tighter uppercase">
            Gérer l'avenir <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-orange-400">de vos projets</span>
          </h1>
          <p className="text-xl text-theme-muted mb-12 max-w-2xl mx-auto font-medium leading-relaxed opacity-80">
            K‑Planner combine gestion de tâches, suivi du temps, absences et rapports dans une interface futuriste inspirée du néomorphisme.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/dashboard" className="inline-flex items-center px-10 py-5 rounded-2xl bg-secondary text-white font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-2xl shadow-secondary/30 group">
              Commencer l'aventure <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Animated Orbs */}
        <div className="absolute inset-0 -z-10 bg-theme-page opacity-30">
          <motion.div
            className="absolute top-20 right-[10%] w-96 h-96 bg-secondary/20 rounded-full blur-[120px]"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              x: [0, 50, 0]
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 left-[10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px]"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2],
              y: [0, -50, 0]
            }}
            transition={{ duration: 12, repeat: Infinity }}
          />
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
              <motion.div key={idx} variants={fadeInUp} whileHover={{ y: -10 }} className="group bg-theme-surface/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-theme-border-subtle hover:border-secondary/30 hover:bg-theme-surface/60 transition-all duration-500 shadow-theme-sm hover:shadow-theme-lg">
                <motion.div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 flex items-center justify-center mb-8 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-inner" transition={{ type: "spring", stiffness: 400 }}>
                  <feature.icon className="h-8 w-8 text-secondary" />
                </motion.div>
                <h3 className="text-2xl font-black text-theme-main mb-4 uppercase tracking-tight">{feature.title}</h3>
                <p className="text-theme-muted leading-relaxed font-medium opacity-80">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Demo section */}
      <section id="demo" ref={demoRef} className="py-32 bg-theme-surface/20">
        <div className="container mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" animate={isDemoInView ? "visible" : "hidden"} className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-theme-main mb-6 uppercase tracking-tighter">Voir K‑Planner en action</h2>
            <p className="text-xl text-theme-muted max-w-2xl mx-auto font-medium opacity-60">Découvrez comment notre plateforme transforme votre quotidien.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 50 }} animate={isDemoInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, type: "spring", delay: 0.2 }} className="relative max-w-5xl mx-auto rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.3)] border border-theme-border-subtle bg-theme-surface p-4">
            <div className="aspect-video bg-gradient-to-br from-primary to-[#0f172a] rounded-[2.5rem] overflow-hidden flex items-center justify-center relative group cursor-pointer border border-theme-border-subtle/50">
              <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center shadow-2xl shadow-secondary/50 border-4 border-white/20"
                >
                  <Play className="h-10 w-10 text-white ml-1" />
                </motion.div>
              </div>

              {/* Decorative elements in the demo box */}
              <motion.div className="absolute top-10 left-10 w-48 h-32 bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10" animate={{ y: [0, -20, 0], rotate: [0, 2, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
              <motion.div className="absolute bottom-10 right-10 w-64 h-40 bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10" animate={{ y: [0, 20, 0], rotate: [0, -2, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[70%] border border-white/5 rounded-[2rem] pointer-events-none" />
            </div>
            <div className="p-4 text-center text-theme-muted text-xs font-bold uppercase tracking-widest opacity-40">Démo Interactive (Simulation)</div>
          </motion.div>
          <p className="text-center text-theme-muted mt-8 font-medium italic opacity-40">Une vraie vidéo de démonstration sera bientôt disponible.</p>
        </div>
      </section>

      {/* How it works section */}
      <section id="how-it-works" ref={stepsRef} className="py-32 relative">
        <div className="container mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" animate={isStepsInView ? "visible" : "hidden"} className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-theme-main mb-6 uppercase tracking-tighter">Comment ça marche ?</h2>
            <p className="text-xl text-theme-muted max-w-2xl mx-auto font-medium opacity-60">Trois étapes simples pour booster votre productivité.</p>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" animate={isStepsInView ? "visible" : "hidden"} className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {steps.map((step, idx) => (
              <motion.div key={idx} variants={fadeInUp} whileHover={{ y: -10 }} className="text-center group">
                <div className="relative mb-8">
                  <motion.div
                    className="w-24 h-24 mx-auto rounded-[2rem] bg-theme-surface border border-theme-border-subtle text-secondary flex items-center justify-center text-3xl font-black shadow-theme-md group-hover:bg-secondary group-hover:text-white group-hover:rotate-[360deg] transition-all duration-700"
                  >
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

      {/* Pricing section */}
      <section id="plans" ref={pricingRef} className="py-32 bg-theme-surface/20">
        <div className="container mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-theme-main mb-6 uppercase tracking-tighter">Des plans clairs</h2>
            <p className="text-xl text-theme-muted max-w-2xl mx-auto font-medium opacity-60">
              Commencez simplement, puis passez a une organisation plus structuree quand votre equipe grandit.
            </p>
          </motion.div>

          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const isFreePlan = (plan.billing?.montant ?? null) === 0 || plan.price_label === '0 XOF';
              return (
                <motion.div
                  key={plan.code}
                  variants={fadeInUp}
                  className={`relative flex h-full flex-col rounded-[2rem] border p-8 shadow-theme-sm transition-all duration-500 ${
                  plan.highlight
                    ? 'border-secondary/50 bg-secondary/10 shadow-secondary/10'
                    : 'border-theme-border-subtle bg-theme-surface/60'
                  }`}
                >
                {plan.highlight && (
                  <span className="absolute right-6 top-6 rounded-full bg-secondary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                    Recommande
                  </span>
                )}

                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-theme-border-subtle bg-theme-surface-hover text-secondary">
                  {plan.code === 'ENTREPRISE' ? <ShieldCheck className="h-7 w-7" /> : <Briefcase className="h-7 w-7" />}
                </div>

                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-theme-main">{plan.nom}</h3>
                  <p className="mt-3 min-h-[3.5rem] text-sm font-medium leading-relaxed text-theme-muted opacity-80">{plan.audience}</p>
                  <div className="mt-6 flex items-end gap-2">
                    <span className="text-3xl font-black text-theme-main">{plan.price_label}</span>
                    {!isFreePlan && (
                      <span className="pb-1 text-xs font-bold uppercase tracking-widest text-theme-muted">mensuel</span>
                    )}
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
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={user ? '/dashboard' : '/register'}
                  className={`mt-8 inline-flex items-center justify-center rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    plan.highlight
                      ? 'bg-secondary text-white shadow-lg shadow-secondary/20 hover:bg-orange-600'
                      : 'border border-theme-border-subtle text-theme-main hover:border-secondary/40 hover:text-secondary'
                  }`}
                >
                  {plan.code === 'ENTREPRISE' ? 'Preparer mon entreprise' : 'Choisir ce plan'}
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
            {/* Decorative background for CTA */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none" />

            <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tighter uppercase leading-[1.1]">
              Prêt à transformer <br /> votre gestion ?
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.2 }} viewport={{ once: true }} className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto font-medium opacity-80 leading-relaxed">
              Rejoignez plus de 500 entreprises qui utilisent K‑Planner pour piloter leurs projets stratégiques au quotidien.
            </motion.p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/dashboard" className="inline-flex items-center px-12 py-6 rounded-2xl bg-secondary text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-secondary/40 hover:bg-orange-600 transition-all">
                Démarrer gratuitement <ArrowRight className="ml-3 h-5 w-5" />
              </Link>
            </motion.div>
          </GlassCard>
        </div>
      </section>

      {/* Footer enrichi */}
      <footer className="bg-theme-surface border-t border-theme-border-subtle py-24">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <KhcLogo size={32} />
                <span className="text-xl font-black text-theme-main tracking-tighter uppercase">K‑Planner</span>
              </div>
              <p className="text-sm text-theme-muted font-medium leading-relaxed opacity-70">
                La plateforme futuriste tout-en-un pour gérer vos projets, vos équipes, vos tâches et vos absences avec élégance.
              </p>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-theme-main uppercase tracking-[0.3em] mb-8">Navigation</h3>
              <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-theme-muted">
                <li><a href="#features" className="hover:text-secondary transition-colors">Produit</a></li>
                <li><a href="#demo" className="hover:text-secondary transition-colors">Démo Live</a></li>
                <li><a href="#how-it-works" className="hover:text-secondary transition-colors">Documentation</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-theme-main uppercase tracking-[0.3em] mb-8">Soutien</h3>
              <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-theme-muted">
                <li><a href="#" className="hover:text-secondary transition-colors">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">CGU</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-theme-main uppercase tracking-[0.3em] mb-8">Newsletter</h3>
              <div className="flex mb-6 bg-theme-surface-hover border border-theme-border-subtle rounded-2xl overflow-hidden p-1">
                <input
                  type="email"
                  placeholder="votre@email.com"
                  className="flex-1 px-4 py-2.5 text-xs bg-transparent text-theme-main focus:outline-none placeholder:text-theme-muted/50"
                />
                <button className="px-5 py-2.5 bg-secondary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all">
                  OK
                </button>
              </div>
              <div className="flex gap-4">
                {[1, 2, 3, 4].map(i => (
                  <a key={i} href="#" className="h-10 w-10 rounded-xl bg-theme-surface-hover border border-theme-border-subtle flex items-center justify-center text-theme-muted hover:text-secondary hover:border-secondary/30 transition-all">
                    <Hash size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-24 pt-8 border-t border-theme-border-subtle/50 text-center">
            <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.3em] opacity-40">
              &copy; 2025 K‑Planner. Design System Premium par Kapitals.
            </p>
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

const fallbackPlans: SubscriptionPlan[] = [
  {
    code: 'ESSENTIEL',
    nom: 'Essentiel',
    audience: 'Pour un utilisateur ou une petite equipe qui structure son travail.',
    description: 'Le socle gratuit pour demarrer avec K-Planner sans complexite.',
    price_label: '0 XOF',
    highlight: false,
    billing: { montant: 0, devise: 'XOF', duree_jours: 30 },
    limits: {
      workspaces: 1,
      espaces: 5,
      projets: 10,
      membres: 5,
      stockage_mo: 250,
      historique_jours: 30,
    },
    features: [
      'Workspace personnel cree automatiquement',
      'Gestion des espaces, projets, taches et checklists',
      "Canevas de projet et suivi d'avancement",
      'Messagerie de groupe basique',
      'Notifications essentielles',
    ],
    restrictions: [
      'Quotas limites pour les membres et fichiers',
      "Pas de supervision avancee d'organisation",
    ],
  },
  {
    code: 'PROFESSIONNEL',
    nom: 'Professionnel',
    audience: 'Pour une equipe structuree qui gere plusieurs projets actifs.',
    description: 'Plus de capacite, de collaboration et de suivi pour travailler en equipe.',
    price_label: '5 000 XOF',
    highlight: true,
    billing: { montant: 5000, devise: 'XOF', duree_jours: 30 },
    limits: {
      workspaces: 5,
      espaces: null,
      projets: null,
      membres: 50,
      stockage_mo: 5120,
      historique_jours: 365,
    },
    features: [
      'Plusieurs workspaces',
      'Espaces et sous-espaces etendus',
      'Rapports de travail',
      'Fichiers plus volumineux',
      'Notifications avancees',
      'Appels audio et video',
      'Historique plus long',
    ],
    restrictions: ['Facturation et supervision limitees'],
  },
  {
    code: 'ENTREPRISE',
    nom: 'Entreprise',
    audience: 'Pour une organisation qui veut centraliser ses equipes et ses controles.',
    description: 'Le plan complet pour piloter une organisation avec supervision et gouvernance.',
    price_label: '10 000 XOF',
    highlight: false,
    billing: { montant: 10000, devise: 'XOF', duree_jours: 30 },
    limits: {
      workspaces: null,
      espaces: null,
      projets: null,
      membres: null,
      stockage_mo: null,
      historique_jours: null,
    },
    features: [
      'Workspaces, espaces et projets a quotas eleves',
      'Rapports de travail avances',
      'Absences et conges',
      'Facturation centralisee',
      'Supervision des membres',
      'Securite renforcee',
      'Support prioritaire',
      "Branding et logo de l'entreprise",
      'Analyse de performance',
    ],
    restrictions: [],
  },
];
