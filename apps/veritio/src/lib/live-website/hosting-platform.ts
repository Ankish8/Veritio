/**
 * Recognises the hosting platform behind a study's website URL.
 *
 * Researchers routinely pick "Web App Test" (snippet mode) for a URL that is a
 * throwaway Lovable/v0/Bolt/Vercel preview — somewhere they cannot realistically
 * paste a script tag. Those studies then launch with an uninstalled snippet and
 * silently degrade to an untracked tab. Detecting the host lets the builder
 * recommend Auto Mode (the reverse proxy) before that happens.
 */

export type HostingPlatformId =
  | 'lovable'
  | 'v0'
  | 'bolt'
  | 'replit'
  | 'vercel'
  | 'netlify'
  | 'cloudflare_pages'
  | 'github_pages'
  | 'render'
  | 'fly'
  | 'railway'
  | 'framer'
  | 'webflow'
  | 'firebase'
  | 'surge'
  | 'glitch'
  | 'notion'

export interface HostingPlatform {
  id: HostingPlatformId
  /** Display name, e.g. "Lovable". */
  name: string
  /**
   * True for AI site builders. Their output is almost never a place a researcher
   * can install a script tag, so the Auto Mode recommendation is worded more
   * strongly for these.
   */
  aiBuilder: boolean
}

/**
 * Suffix -> platform. Every host here serves publicly reachable pages, which is
 * what Auto Mode needs. Hosts that usually sit behind SSO (e.g. internal
 * corporate domains) are deliberately absent — there is no reliable signal for
 * them, and recommending Auto Mode for a login-walled app would be wrong.
 */
const PLATFORM_BY_HOST_SUFFIX: ReadonlyArray<readonly [string, HostingPlatform]> = [
  ['lovable.app', { id: 'lovable', name: 'Lovable', aiBuilder: true }],
  ['lovableproject.com', { id: 'lovable', name: 'Lovable', aiBuilder: true }],
  ['lovable.dev', { id: 'lovable', name: 'Lovable', aiBuilder: true }],
  ['vusercontent.net', { id: 'v0', name: 'v0', aiBuilder: true }],
  ['v0.dev', { id: 'v0', name: 'v0', aiBuilder: true }],
  ['v0.app', { id: 'v0', name: 'v0', aiBuilder: true }],
  ['bolt.new', { id: 'bolt', name: 'Bolt', aiBuilder: true }],
  ['bolt.host', { id: 'bolt', name: 'Bolt', aiBuilder: true }],
  ['stackblitz.io', { id: 'bolt', name: 'StackBlitz', aiBuilder: true }],
  ['webcontainer.io', { id: 'bolt', name: 'StackBlitz', aiBuilder: true }],
  ['replit.app', { id: 'replit', name: 'Replit', aiBuilder: true }],
  ['replit.dev', { id: 'replit', name: 'Replit', aiBuilder: true }],
  ['repl.co', { id: 'replit', name: 'Replit', aiBuilder: true }],
  ['vercel.app', { id: 'vercel', name: 'Vercel', aiBuilder: false }],
  ['netlify.app', { id: 'netlify', name: 'Netlify', aiBuilder: false }],
  ['pages.dev', { id: 'cloudflare_pages', name: 'Cloudflare Pages', aiBuilder: false }],
  ['github.io', { id: 'github_pages', name: 'GitHub Pages', aiBuilder: false }],
  ['onrender.com', { id: 'render', name: 'Render', aiBuilder: false }],
  ['fly.dev', { id: 'fly', name: 'Fly.io', aiBuilder: false }],
  ['up.railway.app', { id: 'railway', name: 'Railway', aiBuilder: false }],
  ['framer.website', { id: 'framer', name: 'Framer', aiBuilder: false }],
  ['framer.app', { id: 'framer', name: 'Framer', aiBuilder: false }],
  ['webflow.io', { id: 'webflow', name: 'Webflow', aiBuilder: false }],
  ['firebaseapp.com', { id: 'firebase', name: 'Firebase Hosting', aiBuilder: false }],
  ['web.app', { id: 'firebase', name: 'Firebase Hosting', aiBuilder: false }],
  ['surge.sh', { id: 'surge', name: 'Surge', aiBuilder: false }],
  ['glitch.me', { id: 'glitch', name: 'Glitch', aiBuilder: false }],
  ['notion.site', { id: 'notion', name: 'Notion', aiBuilder: false }],
]

/**
 * Returns the platform serving `url`, or null when the host is not recognised
 * (a custom domain, which tells us nothing either way).
 */
export function detectHostingPlatform(url: string | null | undefined): HostingPlatform | null {
  if (!url || typeof url !== 'string') return null

  let hostname: string
  try {
    hostname = new URL(url.includes('://') ? url : `https://${url}`).hostname.toLowerCase()
  } catch {
    return null
  }
  if (!hostname) return null

  for (const [suffix, platform] of PLATFORM_BY_HOST_SUFFIX) {
    if (hostname === suffix || hostname.endsWith(`.${suffix}`)) return platform
  }
  return null
}
