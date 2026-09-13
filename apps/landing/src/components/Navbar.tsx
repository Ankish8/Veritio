'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ASSET_PREFIX } from '@/lib/asset-prefix'
import {
  OPEN_SOURCE_REPOSITORY_URL,
  visibleNavigationRoutes,
} from '@veritio/marketing-routes'

const NAV_OFFSET = 80

const REPOSITORY_PUBLIC = process.env.NEXT_PUBLIC_OPEN_SOURCE_REPOSITORY_PUBLIC === 'true'
const MARKETING_LINKS = visibleNavigationRoutes(REPOSITORY_PUBLIC)
const GITHUB_LINK = MARKETING_LINKS.find(
  (route) => route.navigation?.href === OPEN_SOURCE_REPOSITORY_URL,
)

const LINKS: { id?: string; href?: string; label: string }[] = [
  { id: 'features', label: 'Features' },
  { id: 'use-cases', label: 'Use cases' },
  ...MARKETING_LINKS
    .filter((route) => route !== GITHUB_LINK)
    .map((route) => ({
      href: route.navigation!.href ?? route.path,
      label: route.navigation!.label,
    })),
  { id: 'faq', label: 'FAQ' },
]

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.23.7-3.91-1.37-3.91-1.37-.53-1.35-1.3-1.7-1.3-1.7-1.05-.73.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.58-.3-5.29-1.29-5.29-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.96 10.96 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.4-2.72 5.38-5.3 5.67.42.36.79 1.06.79 2.14v3.26c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"
      />
    </svg>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const nav = navRef.current
      if (!nav) return
      if (window.scrollY > 20) {
        nav.classList.add('scrolled')
      } else {
        nav.classList.remove('scrolled')
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setOpen(false)
    // From any other page, hand off to the home page with the hash.
    if (window.location.pathname !== '/') {
      window.location.href = `/#${id}`
      return
    }
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <nav className="nav" ref={navRef}>
      {/* Guide lines through nav */}
      <div className="nav-guides">
        <div className="nav-guide-left" />
        <div className="nav-guide-right" />
      </div>
      <div className="nav-inner">
        <div className="nav-left">
          <Link href="/" className="nav-logo" aria-label="Veritio home">
            <img src={`${ASSET_PREFIX}/images/logo-black.png`} alt="Veritio" width={522} height={311} className="nav-logo-img" />
          </Link>

          <div className="nav-links">
            {LINKS.map((l) =>
              l.href ? (
                <Link key={l.label} href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              ) : (
                <a key={l.label} href={`/#${l.id}`} onClick={(e) => goToSection(e, l.id!)}>
                  {l.label}
                </a>
              )
            )}
          </div>
        </div>

        <div className="nav-right">
          {GITHUB_LINK && (
            <a
              href={OPEN_SOURCE_REPOSITORY_URL}
              className="nav-github"
              target="_blank"
              rel="noreferrer"
              aria-label="View Veritio on GitHub"
            >
              <GitHubIcon />
              <span>GitHub</span>
            </a>
          )}
          <a href="/sign-in" className="nav-login">Log in</a>
          <a href="https://veritio.io/sign-up" className="nav-cta">Try For Free</a>
        </div>

        <button className="mobile-toggle" aria-label="Menu" onClick={() => setOpen(!open)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        {LINKS.map((l) =>
          l.href ? (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ) : (
            <a key={l.label} href={`/#${l.id}`} onClick={(e) => goToSection(e, l.id!)}>
              {l.label}
            </a>
          )
        )}
        {GITHUB_LINK && (
          <a
            href={OPEN_SOURCE_REPOSITORY_URL}
            className="mobile-menu-github"
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            <GitHubIcon />
            GitHub
          </a>
        )}
        <a href="/sign-in" onClick={() => setOpen(false)}>Log in</a>
      </div>
    </nav>
  )
}
