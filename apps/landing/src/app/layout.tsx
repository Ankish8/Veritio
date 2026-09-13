import type { Metadata } from 'next'
import { Inter, Host_Grotesk } from 'next/font/google'
import { headers } from 'next/headers'
import AnnouncementBar from '@/components/AnnouncementBar'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import MetaPixel from '@/components/MetaPixel'
import PostHogProvider from '@/components/PostHogProvider'
import '@/styles/global.css'
import { withMarketingCanonical } from '@veritio/marketing-routes'

const SHOW_MCP_ANNOUNCEMENT_BAR = true

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const hostGrotesk = Host_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = withMarketingCanonical('/', {
  title: 'Veritio: Stop Building on Assumptions',
  description:
    'Validate product decisions in hours, not weeks. Web app tests, prototype tests, surveys, card sorts, tree tests, and first-click studies. One platform your whole team will actually use.',
  icons: {
    icon: [
      { url: '/icon.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.png', media: '(prefers-color-scheme: dark)' },
    ],
  },
})

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Reading request headers opts the page into request-time rendering, which is
  // required because a CSP nonce must be unique for every response.
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${inter.variable} ${hostGrotesk.variable}${SHOW_MCP_ANNOUNCEMENT_BAR ? '' : ' announcement-bar-dismissed'}`}
    >
      <body>
        {/* Collapse the announcement bar before paint for visitors who dismissed it (no flash). */}
        {SHOW_MCP_ANNOUNCEMENT_BAR && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html:
                "try{if(localStorage.getItem('mcp-announcement-dismissed-v1')==='1'){document.documentElement.classList.add('announcement-bar-dismissed')}}catch(e){}",
            }}
          />
        )}
        <PostHogProvider>
          {SHOW_MCP_ANNOUNCEMENT_BAR && <AnnouncementBar />}
          <Navbar />
          {children}
          <Footer />
          <MetaPixel pixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} nonce={nonce} />
        </PostHogProvider>
      </body>
    </html>
  )
}
