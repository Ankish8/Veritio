'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ASSET_PREFIX } from '@/lib/asset-prefix'

const NAV_OFFSET = 80

const LINKS: { id?: string; href?: string; label: string }[] = [
  { id: 'features', label: 'Features' },
  { id: 'use-cases', label: 'Use cases' },
  { href: '/pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
]

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

        <a href="https://veritio.io/sign-up" className="nav-cta">Try For Free</a>

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
      </div>
    </nav>
  )
}
