import { motion } from 'framer-motion'
import { CheckCircle2, Crown, Zap, MessageCircle, ArrowRight } from 'lucide-react'
import HomeHero from '../../features/home/components/HomeHero'
import HomeFeatures from '../../features/home/components/HomeFeatures'
import HomeCollaboration from '../../features/home/components/HomeCollaboration'
import Button from '../../components/ui/Button'
import { pageFade, fadeUp, titleStagger, lineReveal } from '../../features/home/components/motionConfig'
import KhcLogo from '../../components/ui/KhcLogo'

const MotionMain = motion.main

const premiumPacks = [
  {
    title: 'Starter',
    badge: 'Essentiel',
    color: 'var(--khc-secondary-blue)',
    price: 'Gratuit',
    points: ["Jusqu'à 10 utilisateurs", 'Espaces projets standard', 'Support email 24/7'],
  },
  {
    title: 'Business',
    badge: 'Le plus choisi',
    color: 'var(--khc-secondary-teal)',
    price: '29€/mois',
    points: ['Utilisateurs illimités', 'Automatisations RH', 'Reporting avancé', 'API personnalisée'],
  },
  {
    title: 'Entreprise',
    badge: 'Sur mesure',
    color: 'var(--khc-secondary-red)',
    price: 'Sur devis',
    points: ['SSO et gouvernance renforcée', 'SLA dédié 99.9%', 'Accompagnement stratégique', 'Déploiement on-premise'],
  },
]

const footerColumns = [
  {
    title: 'Services',
    links: [
      { label: 'Gestion de projets', to: '/#fonctionnalites' },
      { label: 'Espaces de travail', to: '/#fonctionnalites' },
      { label: 'Suivi du temps', to: '/#fonctionnalites' },
      { label: 'K-Chat temps réel', to: '/#collaboration' },
      { label: 'Gestion des absences', to: '/#fonctionnalites' },
    ],
  },
  {
    title: 'Plateformes',
    links: [
      { label: 'K-Planer', to: '/' },
      { label: 'Kapital ACADEMY', to: 'https://www.kapitalhc.com/', external: true },
      { label: 'Kapital TALENT', to: 'https://www.kapitalhc.com/', external: true },
      { label: 'Kapital PAYROLL', to: 'https://www.kapitalhc.com/', external: true },
      { label: 'Kapital SKILL', to: 'https://www.kapitalhc.com/', external: true },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ', to: '/#contact' },
      { label: 'Guide utilisateur', to: '/#contact' },
      { label: 'Blog KHC', to: 'https://www.kapitalhc.com/blog', external: true },
      { label: 'Nous contacter', to: '/#contact' },
      { label: 'Passer Premium', to: '/#premium' },
    ],
  },
  {
    title: 'À propos',
    links: [
      { label: 'Qui sommes-nous ?', to: 'https://www.kapitalhc.com/', external: true },
      { label: 'Termes & Conditions', to: 'https://www.kapitalhc.com/', external: true },
      { label: 'Devenir partenaire', to: '/#contact' },
      { label: 'Offres de formation', to: 'https://www.kapitalhc.com/', external: true },
    ],
  },
]

const socials = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=100089574893937',
    icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/kapital-humain-et-conseils/',
    icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z' />
        <rect x='2' y='9' width='4' height='12' />
        <circle cx='4' cy='4' r='2' />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/kapitalhumainetconseils',
    icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <rect x='2' y='2' width='20' height='20' rx='5' ry='5' />
        <path d='M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' />
        <line x1='17.5' y1='6.5' x2='17.51' y2='6.5' />
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/+22999915050',
    icon: <MessageCircle size={18} />,
  },
]

export default function HomePage() {
  return (
    <MotionMain className='khc-home' variants={pageFade} initial='hidden' animate='visible'>
      <HomeHero />

      <div className='khc-page-body'>
        <HomeFeatures />
        <HomeCollaboration />

        <motion.section
          id='premium'
          className='khc-section khc-container'
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true, amount: 0.1 }}
        >
          <motion.header className='khc-section-head' variants={fadeUp}>
            <p className='khc-overline'>Nos formules</p>
            <motion.h2
              className='khc-section-title'
              variants={titleStagger}
              initial='hidden'
              whileInView='visible'
              viewport={{ once: true }}
            >
              <span className='khc-line-wrap'>
                <motion.span className='khc-line' variants={lineReveal}>
                  Choisissez votre formule <span>K-Planer</span>
                </motion.span>
              </span>
            </motion.h2>
            <motion.p className='khc-section-description' variants={fadeUp}>
              Une base gratuite pour démarrer et des options Premium pour accompagner la croissance
              de vos opérations.
            </motion.p>
          </motion.header>

          <div className='khc-premium-grid'>
            {premiumPacks.map((pack, i) => (
              <motion.article
                key={pack.title}
                className='khc-surface-card khc-premium-card'
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <p className='khc-premium-badge' style={{ background: pack.color }}>
                  <Zap size={13} /> {pack.badge}
                </p>
                <h3>{pack.title}</h3>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--khc-orange)' }}>
                  {pack.price}
                </p>
                <ul>
                  {pack.points.map((point) => (
                    <li key={point}>
                      <CheckCircle2 size={14} />
                      {point}
                    </li>
                  ))}
                </ul>
                <Button variant={pack.badge === 'Le plus choisi' ? 'primary' : 'outline'} className='w-full gap-2'>
                  <Crown size={14} /> Choisir {pack.title} <ArrowRight size={14} />
                </Button>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <footer id='contact' className='khc-footer'>
          <div className='khc-footer-top khc-container'>
            <div className='khc-footer-brand'>
              <div className='khc-brand'>
                <KhcLogo size={44} />
                <span>
                  <p className='khc-brand-title'>Kapital <span>Humain & Conseils</span></p>
                  <p className='khc-brand-subtitle'>K-Planer</p>
                </span>
              </div>
              <p className='khc-footer-desc'>
                Cotonou Bénin · Quartier Gbégamey-Ahito Rue 11.046
                <br />Tél : +229 99 91 50 50 / 66 76 10 13
                <br />Email : <a href='mailto:info@kapitalhc.com' className='khc-footer-mail'>info@kapitalhc.com</a>
              </p>
              <div className='khc-socials'>
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={s.label}
                    className='khc-social-btn'
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {footerColumns.map((col) => (
              <div key={col.title} className='khc-footer-col'>
                <h4 className='khc-footer-col-title'>{col.title}</h4>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a href={link.to} target='_blank' rel='noopener noreferrer' className='khc-footer-link'>
                          {link.label}
                        </a>
                      ) : (
                        <a href={link.to} className='khc-footer-link'>{link.label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className='khc-footer-bar'>
            <div className='khc-container khc-footer-bar-inner'>
              <p>© {new Date().getFullYear()} Kapital Humain et Conseils. Tous droits réservés.</p>
              <p>
                <a href='https://www.kapitalhc.com/' target='_blank' rel='noopener noreferrer' className='khc-footer-link'>
                  kapitalhc.com
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </MotionMain>
  )
}