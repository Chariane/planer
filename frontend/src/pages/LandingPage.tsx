import { motion, useInView, easeOut } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, CheckCircle, Calendar, Users, BarChart3, Clock, FileText, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

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

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-white"
            >KP</motion.div>
            <span className="text-xl font-bold text-gray-800">K‑Planner</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-secondary transition">Fonctionnalités</a>
            <a href="#demo" className="text-gray-600 hover:text-secondary transition">Démo</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-secondary transition">Guide</a>
            <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-[#1d3a52] transition">Se connecter</Link>
          </nav>
        </div>
      </header>

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
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-secondary text-white font-medium hover:bg-[#e05a00] transition shadow-lg hover:shadow-xl"
            >
              Essayer gratuitement <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </section>

      <section id="features" ref={featuresRef} className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate={isFeaturesInView ? "visible" : "hidden"}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Une plateforme complète pour piloter vos projets et votre équipe.</p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={isFeaturesInView ? "visible" : "hidden"}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer"
              >
                <motion.div
                  className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4"
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <feature.icon className="h-6 w-6 text-secondary" />
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-500">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="demo" ref={demoRef} className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate={isDemoInView ? "visible" : "hidden"}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Voir K‑Planner en action</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Découvrez comment notre plateforme transforme votre quotidien.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isDemoInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, type: "spring", delay: 0.2 }}
            className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-100"
          >
            <div className="aspect-video bg-gradient-to-br from-primary to-[#1d3a52] flex items-center justify-center relative group cursor-pointer">
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center shadow-lg"
                >
                  <Play className="h-8 w-8 text-white ml-1" />
                </motion.div>
              </div>
              <motion.div
                className="absolute top-4 left-4 w-32 h-20 bg-white/20 rounded-lg backdrop-blur-sm"
                animate={{ y: [0, -10, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute bottom-4 right-4 w-40 h-24 bg-white/20 rounded-lg backdrop-blur-sm"
                animate={{ y: [0, 10, 0], rotate: [0, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 bg-white/30 rounded-xl backdrop-blur-md"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="p-4 text-center text-gray-500 text-sm">Aperçu interactif – Cliquez pour lancer la démo (simulation)</div>
          </motion.div>
          <p className="text-center text-gray-500 mt-4">Une vraie vidéo de démonstration sera bientôt disponible.</p>
        </div>
      </section>

      <section id="how-it-works" ref={stepsRef} className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate={isStepsInView ? "visible" : "hidden"}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Comment ça marche ?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Trois étapes simples pour booster votre productivité.</p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={isStepsInView ? "visible" : "hidden"}
            className="grid grid-cols-1 md:grid-cols-3 gap-12"
          >
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -10, transition: { type: "spring", stiffness: 300 } }}
                className="text-center bg-white p-6 rounded-xl shadow-md"
              >
                <motion.div
                  className="w-16 h-16 mx-auto rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mb-4"
                  whileHover={{ rotate: 360, scale: 1.2 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  {idx + 1}
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
                <p className="text-gray-500">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-primary">
        <div className="container mx-auto px-6 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring" }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Prêt à transformer votre gestion de projet ?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto"
          >
            Rejoignez K‑Planner dès aujourd'hui et gagnez en efficacité.
          </motion.p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-8 py-3 rounded-lg bg-secondary text-white font-medium hover:bg-[#e05a00] transition text-lg shadow-lg hover:shadow-xl"
            >
              Commencer gratuitement <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-6 text-center">
          <p>© 2025 K‑Planner. Tous droits réservés.</p>
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
