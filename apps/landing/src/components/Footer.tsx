import Link from 'next/link'
import { ASSET_PREFIX } from '@/lib/asset-prefix'

export default function Footer() {
  return (
    <>
      {/* Beige gap with guide lines */}
      <div className="footer2-gap">
        <div className="guide-lines-wrap">
          <div className="hero-guide-line hero-guide-left" />
          <div className="hero-guide-line hero-guide-right" />
        </div>
      </div>

      {/* Dark footer */}
      <footer className="footer2">
        <div className="footer2-guides">
          <div className="footer2-guide-left" />
          <div className="footer2-guide-right" />
        </div>
        <div className="footer2-inner">
          <div className="footer2-grid">
            <div className="footer2-brand">
              <Link href="/" className="footer2-logo" aria-label="Veritio home">
                <img src={`${ASSET_PREFIX}/images/logo-white.png`} alt="Veritio" width={522} height={311} className="footer2-logo-img" />
              </Link>
              <p>Veritio is designed to revolutionize how businesses operate.</p>
            </div>

            <div className="footer2-col">
              <h4>Company</h4>
              <ul>
                <li><a href="/about">About Us</a></li>
                <li><a href="/pricing">Pricing</a></li>
                <li><a href="/education">For Education</a></li>
                <li><a href="/mcp-server">MCP Server</a></li>
              </ul>
            </div>

            <div className="footer2-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms &amp; Conditions</a></li>
                <li><a href="/accessibility">Accessibility</a></li>
                <li><a href="/security">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="footer2-bottom">
            <span>&copy; {new Date().getFullYear()} Veritio. All rights reserved</span>
          </div>
          <div className="footer2-endline" />
        </div>
      </footer>
    </>
  )
}
