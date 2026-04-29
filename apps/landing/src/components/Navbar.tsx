'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

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

  return (
    <nav className="nav" ref={navRef}>
      {/* Guide lines through nav */}
      <div className="nav-guides">
        <div className="nav-guide-left" />
        <div className="nav-guide-right" />
      </div>
      <div className="nav-inner">
        <div className="nav-left">
          <Link href="/" className="nav-logo">
            <span className="logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </span>
            Veritio
          </Link>

          <div className="nav-links">
            <div className="nav-dropdown">
              <span>
                Features{' '}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
              <div className="mega-menu">
                <div className="mega-inner">
                  <div className="mega-col">
                    <div className="mega-col-label">Research Methods</div>
                    <Link href="/features/card-sort" className="mega-item">
                      <div className="mi-icon" style={{ background: 'rgba(109,40,217,.08)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                      </div>
                      <div className="mi-text">
                        <h4>Card Sort</h4>
                        <p>Discover how users organize content</p>
                      </div>
                    </Link>
                    <Link href="/features/tree-test" className="mega-item">
                      <div className="mi-icon" style={{ background: 'rgba(34,197,94,.08)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" /><line x1="12" y1="11" x2="6" y2="15" /><line x1="12" y1="11" x2="18" y2="15" /><circle cx="6" cy="17" r="2" /><circle cx="18" cy="17" r="2" /></svg>
                      </div>
                      <div className="mi-text">
                        <h4>Tree Test</h4>
                        <p>Validate your information architecture</p>
                      </div>
                    </Link>
                    <Link href="/features/survey" className="mega-item">
                      <div className="mi-icon" style={{ background: 'rgba(234,179,8,.08)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
                      </div>
                      <div className="mi-text">
                        <h4>Survey</h4>
                        <p>Collect targeted user feedback</p>
                      </div>
                    </Link>
                  </div>

                  <div className="mega-col">
                    <div className="mega-col-label">Usability Testing</div>
                    <Link href="/features/prototype-test" className="mega-item">
                      <div className="mi-icon" style={{ background: 'rgba(232,121,168,.08)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
                      </div>
                      <div className="mi-text">
                        <h4>Prototype Test</h4>
                        <p>Test Figma prototypes with real users</p>
                      </div>
                    </Link>
                    <Link href="/features/first-click" className="mega-item">
                      <div className="mi-icon" style={{ background: 'rgba(239,68,68,.08)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" strokeDasharray="4 3" /></svg>
                      </div>
                      <div className="mi-text">
                        <h4>First-Click Test</h4>
                        <p>Optimize navigation and layout</p>
                      </div>
                    </Link>
                    <Link href="/features/live-website-test" className="mega-item">
                      <div className="mi-icon" style={{ background: 'rgba(109,40,217,.08)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                      </div>
                      <div className="mi-text">
                        <h4>Live Website Test</h4>
                        <p>Test real websites with real users</p>
                      </div>
                    </Link>
                  </div>

                  <div className="mega-col mega-col-highlight">
                    <div className="mega-col-label">Platform</div>
                    <Link href="/features/ai-builder" className="mega-item">
                      <div className="mi-icon mi-icon-ai">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z" /></svg>
                      </div>
                      <div className="mi-text">
                        <h4>AI Assistant</h4>
                        <p>Build studies in seconds with AI</p>
                      </div>
                    </Link>
                    <Link href="/features/live-website-test" className="mega-item">
                      <div className="mi-icon" style={{ background: 'rgba(109,40,217,.08)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="1" /><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5z" /><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5z" /></svg>
                      </div>
                      <div className="mi-text">
                        <h4>Session Recording</h4>
                        <p>Watch real user sessions on your site</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <a href="/company">Company</a>
            <a href="/pricing">Pricing</a>
            <a href="/blog">Blog</a>
          </div>
        </div>

        <a href="/signup" className="nav-cta">Try For Free</a>

        <button className="mobile-toggle" aria-label="Menu" onClick={() => setOpen(!open)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        <Link href="/features/card-sort" onClick={() => setOpen(false)}>Card Sort</Link>
        <Link href="/features/tree-test" onClick={() => setOpen(false)}>Tree Test</Link>
        <Link href="/features/prototype-test" onClick={() => setOpen(false)}>Prototype Test</Link>
        <Link href="/features/survey" onClick={() => setOpen(false)}>Survey</Link>
        <Link href="/features/first-click" onClick={() => setOpen(false)}>First-Click Test</Link>
        <Link href="/features/live-website-test" onClick={() => setOpen(false)}>Live Website Test</Link>
        <Link href="/features/ai-builder" onClick={() => setOpen(false)}>AI Builder</Link>
        <a href="/pricing">Pricing</a>
      </div>
    </nav>
  )
}
