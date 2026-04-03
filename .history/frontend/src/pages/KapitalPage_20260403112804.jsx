import React from 'react'
import { motion } from 'framer-motion'

const features = [
  {
    title: 'Planification Ultra-Rapide',
    description: "Génère des plans, des tâches et des sprints en quelques clics.",
    color: 'from-rose-500 to-fuchsia-500',
  },
  {
    title: 'Gestion 360° des Équipes',
    description: "Tableaux, membres, rôles et permissions en temps réel.",
    color: 'from-emerald-500 to-cyan-500',
  },
  {
    title: 'Reporting Intelligent',
    description: "Analyse KPI et forecast avec un tableau de bord métier.",
    color: 'from-amber-500 to-orange-500',
  },
]

const KapitalPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white">
      <style>{`@keyframes glowingBg { 0% { filter: saturate(1) brightness(0.95); } 50% { filter: saturate(1.16) brightness(1.08); } 100% { filter: saturate(1) brightness(0.95); }}
      .glow-animation { animation: glowingBg 14s ease-in-out infinite; }
      @keyframes floatText { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); }}
      .float-text { animation: floatText 12s ease-in-out infinite; }
      `}</style>

      <header className="w-full px-6 md:px-12 py-5 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 p-1 rounded-lg shadow-lg">
            <div className="bg-slate-950 p-2 rounded-md font-bold tracking-wider">K-PLANER</div>
          </div>
          <span className="text-sm text-slate-300">Gestion d'entreprise</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-200">
          <a href="#features" className="hover:text-white transition">Fonctionnalités</a>
          <a href="#pricing" className="hover:text-white transition">Tarifs</a>
          <a href="#contact" className="hover:text-white transition">Contact</a>
        </nav>
        <div className="space-x-3">
          <button className="px-4 py-2 rounded-full bg-fuchsia-500 hover:bg-fuchsia-400 duration-200">Connexion</button>
          <button className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 duration-200">Inscription</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="glow-animation">
          <h1 className="float-text text-4xl md:text-6xl font-black leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-rose-400 to-yellow-300">
            La plateforme RH + projet la plus puissante pour votre entreprise
          </h1>
          <p className="mt-6 text-slate-300 max-w-2xl text-lg md:text-xl">
            Inspiré par le design de KapitalHC, K-Planer fait passer votre gouvernance et votre productivité à l’échelle supérieure.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#features" className="px-7 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold shadow-2xl hover:scale-[1.02] transition-transform">Découvrir</a>
            <a href="#pricing" className="px-7 py-3 rounded-full border border-slate-700 hover:border-cyan-400 transition text-slate-100">Tarifs</a>
          </div>
        </motion.section>

        <section id="features" className="mt-16 grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.14 }}
              className={`rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-xl backdrop-blur-sm hover:-translate-y-1 hover:shadow-2xl hover:border-slate-500 transition`}
            >
              <div className={`inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r ${feature.color} text-slate-950 font-semibold text-xs`}>{feature.title}</div>
              <p className="mt-4 text-slate-300">{feature.description}</p>
              <div className="mt-6">
                <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-violet-500 font-semibold hover:from-rose-400 hover:to-violet-400 transition">Voir plus</button>
              </div>
            </motion.article>
          ))}
        </section>

        <section id="pricing" className="mt-20 bg-slate-900/80 border border-slate-700 rounded-3xl p-8">
          <h2 className="text-3xl font-bold text-white">Nos formules clés</h2>
          <p className="mt-2 text-slate-300 max-w-2xl">Adaptées pour freelance, PME et grands groupes.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="p-6 rounded-2xl border border-slate-700 bg-slate-950/80 hover:border-cyan-400 transition">
              <p className="text-sm uppercase tracking-widest text-cyan-300">Starter</p>
              <h3 className="text-4xl font-extrabold text-white">Gratuit</h3>
              <ul className="mt-4 space-y-2 text-slate-300">
                <li>✅ 5 utilisateurs</li>
                <li>✅ Kanban + tâches</li>
                <li>✅ Rapports simplifiés</li>
              </ul>
              <button className="mt-6 w-full rounded-lg py-2 bg-cyan-500 hover:bg-cyan-400 font-bold text-slate-950">Commencer</button>
            </div>
            <div className="p-6 rounded-2xl border border-cyan-500 bg-gradient-to-br from-cyan-600/20 to-blue-700/20 shadow-lg">
              <p className="text-sm uppercase tracking-widest text-emerald-300">Business</p>
              <h3 className="text-4xl font-extrabold text-white">29€/mois</h3>
              <ul className="mt-4 space-y-2 text-slate-100">
                <li>✅ Utilisateurs illimités</li>
                <li>✅ Support prioritaire</li>
                <li>✅ Intégrations API</li>
              </ul>
              <button className="mt-6 w-full rounded-lg py-2 bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950">Choisir</button>
            </div>
            <div className="p-6 rounded-2xl border border-slate-700 bg-slate-950/80 hover:border-amber-300 transition">
              <p className="text-sm uppercase tracking-widest text-amber-300">Entreprise</p>
              <h3 className="text-4xl font-extrabold text-white">Sur devis</h3>
              <ul className="mt-4 space-y-2 text-slate-300">
                <li>✅ Sécurité enterprise</li>
                <li>✅ SSO + gouvernance</li>
                <li>✅ Onboarding premium</li>
              </ul>
              <button className="mt-6 w-full rounded-lg py-2 border border-amber-300 text-amber-300 hover:bg-amber-300/20 font-bold">Contact</button>
            </div>
          </div>
        </section>

        <section id="contact" className="mt-20 p-8 bg-slate-900/70 border border-slate-700 rounded-3xl">
          <h2 className="text-3xl font-bold">Réservez une démo</h2>
          <p className="mt-2 text-slate-300">La plateforme K-Planer en action, en 30 min. </p>
          <form className="mt-6 grid gap-4 md:grid-cols-2">
            <input className="p-3 rounded-lg bg-slate-800 border border-slate-700" placeholder="Nom" />
            <input className="p-3 rounded-lg bg-slate-800 border border-slate-700" placeholder="Email" />
            <input className="p-3 rounded-lg bg-slate-800 border border-slate-700 md:col-span-2" placeholder="Entreprise" />
            <textarea className="p-3 rounded-lg bg-slate-800 border border-slate-700 md:col-span-2" placeholder="Message" rows="4"></textarea>
            <button className="md:col-span-2 p-3 rounded-lg bg-gradient-to-r from-fuchsia-500 to-rose-500 font-bold">Envoyer ma demande</button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default KapitalPage
