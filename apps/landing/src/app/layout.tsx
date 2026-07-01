import type { Metadata } from 'next'
import { Inter, Host_Grotesk } from 'next/font/google'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import '@/styles/global.css'

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

export const metadata: Metadata = {
  title: 'Veritio: Stop Building on Assumptions',
  description:
    'Validate product decisions in hours, not weeks. Web app tests, prototype tests, surveys, card sorts, tree tests, and first-click studies. One platform your whole team will actually use.',
  icons: {
    icon: [
      { url: '/icon.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.png', media: '(prefers-color-scheme: dark)' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${hostGrotesk.variable}`}>
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  )
}
