import Link from 'next/link'
import { ASSET_PREFIX } from '@/lib/asset-prefix'
import {
  footerRoutes,
  isRepositoryPublic,
  OPEN_SOURCE_REPOSITORY_URL,
} from '@veritio/marketing-routes'

export default function Footer() {
  const repositoryPublic = isRepositoryPublic()

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
                {/* eslint-disable-next-line @next/next/no-img-element -- this zone serves
                    its assets through NEXT_PUBLIC_ASSET_PREFIX and uses no next/image
                    anywhere; the optimizer would need an asset-prefix-aware loader */}
                <img src={`${ASSET_PREFIX}/images/logo-white.png`} alt="Veritio" width={522} height={311} className="footer2-logo-img" />
              </Link>
              <p>Veritio is designed to revolutionize how businesses operate.</p>
            </div>

            <div className="footer2-col">
              <h4>Company</h4>
              <ul>
                {footerRoutes('company').map((route) => (
                  <li key={route.path}><Link href={route.path}>{route.footer!.label}</Link></li>
                ))}
                {repositoryPublic && (
                  <li><a href={OPEN_SOURCE_REPOSITORY_URL}>GitHub</a></li>
                )}
                {/* An app route (apps/veritio/src/app/docs/api), not a landing
                    one, so it needs no multi-zone rewrite entry. */}
                <li><a href="/docs/api">API Docs</a></li>
              </ul>
            </div>

            <div className="footer2-col">
              <h4>Legal</h4>
              <ul>
                {footerRoutes('legal').map((route) => (
                  <li key={route.path}><Link href={route.path}>{route.footer!.label}</Link></li>
                ))}
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
