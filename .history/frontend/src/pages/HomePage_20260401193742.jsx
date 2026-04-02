import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import {
  FaFacebookF,
  FaLinkedinIn,
  FaWhatsapp,
} from 'react-icons/fa'
import {
  FiActivity,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiColumns,
  FiMessageCircle,
  FiMessageSquare,
  FiRadio,
  FiUsers,
  FiZap,
} from 'react-icons/fi'
import logoBlanc from '../assets/khc-logo-blanc.png'
import heroVisual from '../assets/download.jpeg'
import { logoutSucceeded } from '../features/auth/state/authSlice'
import { selectAuthUser, selectIsAuthenticated } from '../features/auth/state/selectors'
import { fetchFooterData, footerFallback } from '../services/footerService'

const MotionMain = motion.main
const MotionHeader = motion.header
const MotionDiv = motion.div
const MotionArticle = motion.article
const MotionFigure = motion.figure
const MotionP = motion.p
const MotionH1 = motion.h1
const MotionLink = motion.a

const OFFSET = 30

const directionOffsets = {
  left: { x: -OFFSET, y: 0 },
  right: { x: OFFSET, y: 0 },
  up: { x: 0, y: OFFSET },
}

const pageFade = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
      when: 'beforeChildren',
      staggerChildren: 0.08,
    },
  },
}

function revealVariant(direction = 'up', duration = 0.75) {
  const offset = directionOffsets[direction] || directionOffsets.up

  return {
    hidden: {
      opacity: 0,
      x: offset.x,
      y: offset.y,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        type: 'spring',
        stiffness: 130,
        damping: 18,
        mass: 0.9,
      },
    },
  }
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.06,
    },
  },
}

const homeFeatures = [
  {
    icon: FiUsers,
    title: 'Workspaces et roles',
    description: 'Structurez vos equipes avec des roles admin, membre et invite.',
  },
  {
    icon: FiColumns,
    title: 'Listes, Kanban et Gantt',
    description: 'Visualisez les taches selon le mode le plus adapte a chaque projet.',
  },
  {
    icon: FiActivity,
    title: 'Checklists et progression',
    description: 'Suivez l avancement des taches avec des checklists detaillees.',
  },
  {
    icon: FiCalendar,
    title: 'Temps de travail et conges',
    description: 'Gerez absences, conges et dates d echeance sans perdre le fil.',
  },
  {
    icon: FiMessageSquare,
    title: 'Collaboration temps reel',
    description: 'Echangez instantanement entre membres avec notifications directes.',
  },
  {
    icon: FiZap,
    title: 'Rapports et fiabilite',
    description: 'Centralisez les rapports de travail avec une interface rapide et stable.',
  },
]

const collaborationPoints = [
  'Notifications en temps reel pour les attributions et deadlines',
  'Presence en ligne des membres pour mieux coordonner les actions',
  'Partage de fichiers dans les workspaces, espaces et listes',
]

function ScrollReveal({
  children,
  className,
  direction = 'up',
  delay = 0,
  duration = 0.72,
}) {
  return (
    <MotionDiv
      className={className}
      variants={revealVariant(direction, duration)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.22 }}
      transition={{ delay }}
    >
      {children}
    </MotionDiv>
  )
}

function renderFooterLink(item, idx) {
  const key = `${item.label}-${idx}`

  if (item.to) {
    return (
      <Link key={key} to={item.to}>
        {item.label}
      </Link>
    )
  }

  return (
    <a
      key={key}
      href={item.href || '#'}
      target={item.href?.startsWith('http') ? '_blank' : undefined}
      rel={item.href?.startsWith('http') ? 'noreferrer' : undefined}
    >
      {item.label}
    </a>
  )
}

export default function HomePage() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectAuthUser)
  const [footerContent, setFooterContent] = useState(footerFallback)
  const [footerSource, setFooterSource] = useState('fallback')

  function handleLogout() {
    localStorage.removeItem('kplaner_token')
    localStorage.removeItem('kplaner_user')
    dispatch(logoutSucceeded())
  }

  useEffect(() => {
    let mounted = true

    async function loadFooter() {
      try {
        const data = await fetchFooterData()
        if (!mounted || !data || typeof data !== 'object') return

        setFooterContent((prev) => ({
          ...prev,
          ...data,
          backend: {
            ...prev.backend,
            ...(data.backend || {}),
          },
          copyright: {
            ...prev.copyright,
            ...(data.copyright || {}),
          },
          quickLinks: data.quickLinks || prev.quickLinks,
          legalLinks: data.legalLinks || prev.legalLinks,
        }))
        setFooterSource('backend')
      } catch {
        setFooterSource('fallback')
      }
    }

    loadFooter()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <MotionMain className="kpl-home" variants={pageFade} initial="hidden" animate="visible">
      <MotionHeader
        className="kpl-navbar"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      >
        <div className="kpl-container kpl-navbar-inner">
          <Link to="/" className="kpl-brand" aria-label="Accueil K-Planer">
            <img src={logoBlanc} alt="K-Planer" />
          </Link>

          <nav className="kpl-nav-links" aria-label="Navigation principale">
            <a href="#fonctionnalites">Fonctionnalites</a>
            <a href="#collaboration">Collaboration</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="kpl-nav-actions">
            {isAuthenticated ? (
              <>
                <span className="kpl-user-pill">{user?.username || user?.email || 'Connecte'}</span>
                <button type="button" className="kpl-btn kpl-btn-secondary" onClick={handleLogout}>
                  Deconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="kpl-btn kpl-btn-ghost">
                  Connexion
                </Link>
                <Link to="/auth/register" className="kpl-btn kpl-btn-primary">
                  Commencer
                </Link>
              </>
            )}
          </div>
        </div>
      </MotionHeader>

      <section className="kpl-hero" id="hero">
        <div className="kpl-container kpl-hero-grid">
          <MotionDiv
            className="kpl-hero-copy"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <MotionP className="kpl-eyebrow" variants={revealVariant('left', 0.7)}>
              Plateforme SaaS K-Planer
            </MotionP>
            <MotionH1 variants={revealVariant('left', 0.8)}>
              Pilotez vos projets, votre temps de travail et votre collaboration depuis un seul espace.
            </MotionH1>
            <MotionP className="kpl-hero-sub" variants={revealVariant('up', 0.7)}>
              Gerez workspaces, espaces, listes, taches et checklists avec une experience fluide
              inspiree des meilleurs outils produit.
            </MotionP>
            <MotionDiv className="kpl-hero-actions" variants={revealVariant('up', 0.65)}>
              <MotionDiv whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Link to="/auth/register" className="kpl-btn kpl-btn-primary">
                  Commencer maintenant <FiArrowRight />
                </Link>
              </MotionDiv>
              <MotionDiv whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <a href="#fonctionnalites" className="kpl-btn kpl-btn-ghost">
                  Voir les fonctionnalites
                </a>
              </MotionDiv>
            </MotionDiv>
          </MotionDiv>

          <ScrollReveal className="kpl-hero-visual-wrap" direction="right" duration={0.85}>
            <MotionFigure
              className="kpl-hero-visual"
              whileHover={{ scale: 1.01, y: -4 }}
              transition={{ duration: 0.55, ease: 'easeInOut' }}
            >
              <img src={heroVisual} alt="Equipe projet utilisant K-Planer" />
              <figcaption>
                Vue unifiee des equipes, deadlines, rapports et communication temps reel.
              </figcaption>
            </MotionFigure>
          </ScrollReveal>
        </div>
      </section>

      <section className="kpl-section" id="fonctionnalites">
        <div className="kpl-container">
          <ScrollReveal className="kpl-section-head" direction="up" duration={0.8}>
            <p>Fonctionnalites principales</p>
            <h2>Une architecture produit claire pour une execution d equipe rapide</h2>
          </ScrollReveal>

          <MotionDiv
            className="kpl-feature-grid"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.16 }}
          >
            {homeFeatures.map((feature, idx) => {
              const Icon = feature.icon
              const direction = idx % 2 === 0 ? 'left' : 'right'

              return (
                <MotionArticle
                  key={feature.title}
                  className="kpl-feature-card"
                  variants={revealVariant(direction, 0.72)}
                  whileHover={{ y: -8, scale: 1.01 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                >
                  <span className="kpl-feature-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </MotionArticle>
              )
            })}
          </MotionDiv>
        </div>
      </section>

      <section className="kpl-section kpl-section-alt" id="collaboration">
        <div className="kpl-container kpl-collab-grid">
          <ScrollReveal className="kpl-collab-copy" direction="left" duration={0.8}>
            <p className="kpl-kicker">Collaboration et temps reel</p>
            <h2>Coordonnez les membres sans friction, meme sur plusieurs projets.</h2>
            <p>
              K-Planer connecte les equipes avec des notifications, une presence en ligne visible et
              une communication instantanee integree.
            </p>
          </ScrollReveal>

          <MotionDiv
            className="kpl-collab-cards"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.22 }}
          >
            {collaborationPoints.map((point, idx) => (
              <MotionArticle
                key={point}
                className="kpl-collab-card"
                variants={revealVariant('right', 0.7)}
              >
                <span className="kpl-collab-card-icon" aria-hidden="true">
                  {idx === 0 && <FiRadio />}
                  {idx === 1 && <FiMessageCircle />}
                  {idx === 2 && <FiCheckCircle />}
                </span>
                <p>{point}</p>
              </MotionArticle>
            ))}
          </MotionDiv>
        </div>
      </section>

      <footer className="kpl-footer" id="contact">
        <div className="kpl-container kpl-footer-grid">
          <section>
            <h3>{footerContent.companyName}</h3>
            <p>{footerContent.description}</p>
            <small>
              {footerContent.backend.statusLabel}: {footerSource === 'backend' ? 'Connectee' : 'En attente'}
            </small>
          </section>

          <section>
            <h4>Navigation</h4>
            <nav className="kpl-footer-links">{footerContent.quickLinks.map(renderFooterLink)}</nav>
          </section>

          <section>
            <h4>Informations legales</h4>
            <nav className="kpl-footer-links">{footerContent.legalLinks.map(renderFooterLink)}</nav>
          </section>
        </div>

        <div className="kpl-footer-bottom">
          <p>{footerContent.copyrightLine || 'Copyright © 2026 KHC. Tous droits reserves.'}</p>
          <div className="kpl-socials" aria-label="Reseaux sociaux">
            <MotionLink
              href="#"
              title="Facebook"
              whileHover={{ scale: 1.12, y: -2 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Facebook"
            >
              <FaFacebookF />
            </MotionLink>
            <MotionLink
              href="#"
              title="LinkedIn"
              whileHover={{ scale: 1.12, y: -2 }}
              whileTap={{ scale: 0.95 }}
              aria-label="LinkedIn"
            >
              <FaLinkedinIn />
            </MotionLink>
            <MotionLink
              href="#"
              title="WhatsApp"
              whileHover={{ scale: 1.12, y: -2 }}
              whileTap={{ scale: 0.95 }}
              aria-label="WhatsApp"
            >
              <FaWhatsapp />
            </MotionLink>
          </div>
        </div>
      </footer>
    </MotionMain>
  )
}

