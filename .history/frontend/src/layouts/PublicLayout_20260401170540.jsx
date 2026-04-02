import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import logoBlanc from '../assets/khc-logo-blanc.png'
import { logoutSucceeded } from '../features/auth/state/authSlice'
import { selectAuthUser, selectIsAuthenticated } from '../features/auth/state/selectors'
import { fetchFooterData, footerFallback } from '../services/footerService'

export default function PublicLayout() {
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
      <a key={key} href={item.href || '#'} target={item.href?.startsWith('http') ? '_blank' : undefined} rel={item.href?.startsWith('http') ? 'noreferrer' : undefined}>
        {item.label}
      </a>
    )
  }

  return (
    <div className="khc-root">
      <header className="khc-header">
        <div className="khc-container khc-header-inner">
          <Link to="/" className="khc-brand" aria-label="Accueil Kapital Humain et Conseils">
            <img src={logoBlanc} alt="Kapital Humain et Conseils" />
          </Link>

          <nav className="khc-nav" aria-label="Navigation principale">
            <a href="#fonctionnalites">Fonctionnalites</a>
            <a href="#modules">Modules K-Planer</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="khc-header-actions">
            {isAuthenticated ? (
              <>
                <span className="khc-user-pill">{user?.username || user?.email || 'Connecte'}</span>
                <button type="button" className="khc-btn khc-btn-light" onClick={handleLogout}>
                  Deconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="khc-btn khc-btn-light">
                  Connexion
                </Link>
                <Link to="/auth/register" className="khc-btn khc-btn-primary">
                  Ouvrir un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <Outlet />

      <footer className="khc-footer" id="contact">
        <div className="khc-container">
          <div className="khc-footer-grid">
            <section className="khc-footer-brand-block">
              <h3>{footerContent.companyName}</h3>
              <p>{footerContent.description}</p>

              <div className="khc-footer-backend-status">
                <strong>{footerContent.backend.statusLabel}:</strong>{' '}
                <span>
                  {footerSource === 'backend'
                    ? 'Connectee'
                    : footerContent.backend.statusValue}
                </span>
              </div>
              <small>Endpoint prevu: {footerContent.backend.endpointHint}</small>
            </section>

            <section className="khc-footer-column">
              <h4>Navigation</h4>
              <div className="khc-footer-links">
                {footerContent.quickLinks.map((item, idx) => renderFooterLink(item, idx))}
              </div>
            </section>

            <section className="khc-footer-column">
              <h4>Informations legales</h4>
              <div className="khc-footer-links">
                {footerContent.legalLinks.map((item, idx) => renderFooterLink(item, idx))}
              </div>
            </section>
          </div>

          <div className="khc-footer-bottom">
            <p className="khc-copyright-line">
              {footerContent.copyrightLine || 'Copyright © 2026 KHC. Tous droits réservés.'}
            </p>
            <div className="khc-social-list" aria-label="Reseaux sociaux (liens a brancher)">
              <span className="khc-social-icon" title="Facebook">f</span>
              <span className="khc-social-icon" title="LinkedIn">in</span>
              <span className="khc-social-icon" title="Instagram">ig</span>
              <span className="khc-social-icon" title="WhatsApp">wa</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
